var __extends = (this && this.__extends) || (function () {
    var extendStatics = function (d, b) {
        extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p]; };
        return extendStatics(d, b);
    };
    return function (d, b) {
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
define("SuiteCommerce.CustomFields.Checkout.Group.View", ["require", "exports", "underscore", "jQuery", "SuiteCommerce.CustomFields.Checkout.Helper", "suitecommerce_customfields_checkout_group.tpl", "Backbone", "Backbone.FormView", "Backbone.CollectionView", "SuiteCommerce.CustomFields.Checkout.Field.View", "SuiteCommerce.CustomFields.Instrumentation", "SuiteCommerce.CustomFields.Checkout.Configuration"], function (require, exports, _, jQuery, Checkout_Helper_1, checkoutGroupTpl, Backbone_1, BackboneFormView, BackboneCollectionView, Checkout_Field_View_1, Instrumentation_1, Checkout_Configuration_1) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    var GroupView = /** @class */ (function (_super) {
        __extends(GroupView, _super);
        function GroupView() {
            var _this = _super !== null && _super.apply(this, arguments) || this;
            _this.template = checkoutGroupTpl;
            _this.events = {
                // workaround for date-picker not triggering "change" so Form.View doesn't update model
                'focus [data-field-type="date"]': 'dateFieldTypeFocus',
                'blur [data-field-type="date"]': 'dateFieldTypeBlur',
            };
            return _this;
        }
        GroupView.prototype.initialize = function () {
            this.setupBindings();
            this.fetchModel();
            BackboneFormView.add(this, {
                noCloneModel: true,
            });
        };
        GroupView.prototype.setupBindings = function () {
            var bindings = {};
            this.model.fields.each(function (field) {
                var fieldId = field.fieldId;
                if (fieldId && field.isTypeField()) {
                    bindings["[name=\"" + fieldId + "\"]"] = fieldId;
                }
            });
            this.bindings = bindings;
        };
        GroupView.prototype.fetchModel = function () {
            var _this = this;
            var fieldIds = this.model.fields
                .map(function (field) {
                return field.fieldId;
            })
                .join(',');
            var fetchCustomField = Instrumentation_1.default.getLog('fetchCustomField');
            fetchCustomField.startTimer();
            this.setIsLoading(true);
            this.setIsLoadingError(false);
            this.model
                .fetch({
                data: {
                    fields: fieldIds,
                },
            })
                .fail(function () {
                _this.setIsLoadingError(true);
            })
                .always(function () {
                fetchCustomField.endTimer();
                fetchCustomField.setParameters({
                    activity: 'Checkout Custom Field Loaded',
                    totalTime: fetchCustomField.getElapsedTimeForTimer(),
                });
                fetchCustomField.submit();
                _this.setIsLoading(false);
                _this.refresh();
            });
        };
        GroupView.prototype.setIsLoading = function (isLoading) {
            if (isLoading) {
                this.disableInterface();
            }
            else {
                this.enableInterface();
            }
            this.isLoadingFlag = isLoading;
        };
        GroupView.prototype.isLoading = function () {
            return !!this.isLoadingFlag;
        };
        GroupView.prototype.setIsLoadingError = function (isLoadingError) {
            this.isLoadingErrorFlag = isLoadingError;
        };
        GroupView.prototype.isLoadingError = function () {
            return !!this.isLoadingErrorFlag;
        };
        // START WORKAROUND: for date-picker not triggering "change" so Form.View doesn't update model
        GroupView.prototype.getDateFieldTimeout = function (fieldId) {
            this.dateFieldsTimeouts = this.dateFieldsTimeouts || {};
            return this.dateFieldsTimeouts[fieldId];
        };
        GroupView.prototype.clearDateFieldTimeout = function (fieldId) {
            var timeout = this.getDateFieldTimeout(fieldId);
            if (timeout) {
                clearTimeout(timeout);
                this.dateFieldsTimeouts[fieldId] = null;
            }
        };
        GroupView.prototype.setDateFieldTimeout = function (fieldId, timeout) {
            this.dateFieldsTimeouts = this.dateFieldsTimeouts || {};
            this.dateFieldsTimeouts[fieldId] = timeout;
        };
        GroupView.prototype.dateFieldTypeFocus = function (e) {
            var fieldId = jQuery(e.currentTarget).attr('name');
            this.clearDateFieldTimeout(fieldId);
        };
        GroupView.prototype.dateFieldTypeBlur = function (e) {
            var _this = this;
            var $field = jQuery(e.currentTarget);
            var fieldId = $field.attr('name');
            this.clearDateFieldTimeout(fieldId);
            var timeout = setTimeout(function () {
                _this.model.set(fieldId, $field.val());
                _this.model.validate();
            }, 200);
            this.setDateFieldTimeout(fieldId, timeout);
        };
        // END WORKAROUND
        GroupView.prototype.disableInterface = function () {
            this.$(':input').prop('disabled', true);
        };
        GroupView.prototype.enableInterface = function () {
            this.$(':input').prop('disabled', false);
        };
        GroupView.prototype.refresh = function () {
            this._render();
        };
        GroupView.prototype.render = function () {
            var result = this._render();
            this.disableInterface();
            return result;
        };
        GroupView.prototype.isValid = function () {
            var deferred = jQuery.Deferred();
            var validationId = Math.random();
            this.model.validationId = validationId;
            this.model.once('validated', function (isValid, model, invalidAttrs) {
                if (model.validationId === validationId) {
                    if (isValid) {
                        deferred.resolve();
                    }
                    else {
                        var error = Checkout_Helper_1.Helper.createError(_(invalidAttrs)
                            .values()
                            .join('\n'), true);
                        deferred.reject(error);
                    }
                }
            });
            this.model.validate();
            return deferred.promise();
        };
        GroupView.prototype.submit = function () {
            var _this = this;
            var deferred = jQuery.Deferred();
            this.isValid()
                .done(function () {
                _this.submitForm()
                    .done(function (result) {
                    deferred.resolve(result);
                })
                    .fail(function (error) {
                    deferred.reject(Checkout_Helper_1.Helper.createError(error, true));
                });
            })
                .fail(function (error) {
                deferred.reject(Checkout_Helper_1.Helper.createError(error, true));
            });
            return deferred.promise();
        };
        GroupView.prototype.getForm = function () {
            return this.$('form').get(0);
        };
        GroupView.prototype.submitForm = function () {
            var promise = this.saveForm({
                target: this.getForm(),
                preventDefault: function preventDefault() { },
            });
            if (promise) {
                return promise;
            }
            return jQuery
                .Deferred()
                .reject()
                .promise();
        };
        Object.defineProperty(GroupView.prototype, "childViews", {
            get: function () {
                return {
                    'CustomFields.Group': {
                        Fields: {
                            childViewIndex: 10,
                            childViewConstructor: function CustomFieldsGroupFieldsChildView() {
                                var model = this.model;
                                return new BackboneCollectionView({
                                    childView: Checkout_Field_View_1.FieldView,
                                    collection: model.fields,
                                });
                            },
                        },
                    },
                };
            },
            enumerable: true,
            configurable: true
        });
        GroupView.prototype.getContext = function () {
            var model = this.model;
            return {
                position: model.position,
                module: model.module,
                isLoading: this.isLoading(),
                isLoadingError: this.isLoadingError(),
                loadingMessage: Checkout_Configuration_1.Configuration.getLoadingMessage(),
                loadingError: Checkout_Configuration_1.Configuration.getLoadingError(),
            };
        };
        return GroupView;
    }(Backbone_1.View));
    exports.GroupView = GroupView;
});
