/// <amd-module name="SuiteCommerce.CustomFields.Checkout.OrderWizardModule.View"/>
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
define("SuiteCommerce.CustomFields.Checkout.OrderWizardModule.View", ["require", "exports", "jQuery", "suitecommerce_customfields_checkout_order_wizard_module.tpl", "SuiteCommerce.CustomFields.Checkout.Configuration", "SuiteCommerce.CustomFields.Checkout.Helper", "SuiteCommerce.CustomFields.Checkout.Group.View", "SuiteCommerce.CustomFields.Checkout.Group.Model", "Wizard.Module"], function (require, exports, jQuery, checkoutOrderWizardModuleTpl, Checkout_Configuration_1, Checkout_Helper_1, Checkout_Group_View_1, Checkout_Group_Model_1, WizardModule) {
    "use strict";
    // "export = ..." is being used for compatibility with SuiteCommerce, to be consumed by the Checkout Component
    var OrderWizardModuleView = /** @class */ (function (_super) {
        __extends(OrderWizardModuleView, _super);
        function OrderWizardModuleView(options) {
            var _this = _super.call(this, options) || this;
            _this.template = checkoutOrderWizardModuleTpl;
            _this.configuration = options.configuration || {};
            _this.collection = options.collection;
            return _this;
        }
        OrderWizardModuleView.prototype.disableInterface = function () {
            return this.invokeGroup('disableInterface');
        };
        OrderWizardModuleView.prototype.enableInterface = function () {
            return this.invokeGroup('enableInterface');
        };
        OrderWizardModuleView.prototype.refresh = function () {
            return this.invokeGroup('refresh');
        };
        OrderWizardModuleView.prototype.isValid = function () {
            return this.invokeGroup('isValid');
        };
        OrderWizardModuleView.prototype.submit = function () {
            var _this = this;
            var generalErrorMessage = {
                errorMessage: Checkout_Configuration_1.Configuration.get('customFields.checkout.requiredGeneralError'),
            };
            var deferred = jQuery.Deferred();
            this.clearError();
            this.invokeGroup('submit')
                .done(function (result) {
                deferred.resolve(result);
            })
                .fail(function (errorArg) {
                var error = Checkout_Helper_1.Helper.createError(errorArg, true);
                Checkout_Helper_1.Helper.parseJsExceptionError(error);
                _this.manageError(error);
                jQuery('html, body').stop(true, true);
                deferred.reject(generalErrorMessage);
            });
            return deferred.promise();
        };
        OrderWizardModuleView.prototype.invokeGroup = function (method) {
            var groupView = this.getChildViewInstance('CustomFields.OrderWizard', 'Group');
            if (groupView && groupView[method]) {
                return groupView[method]();
            }
            return jQuery
                .Deferred()
                .resolve()
                .promise();
        };
        Object.defineProperty(OrderWizardModuleView.prototype, "childViews", {
            get: function () {
                return {
                    'CustomFields.OrderWizard': {
                        Group: {
                            childViewIndex: 10,
                            childViewConstructor: function () {
                                var model = new Checkout_Group_Model_1.GroupModel({
                                    module: this.configuration.module,
                                    position: this.configuration.position,
                                    fields: this.collection,
                                });
                                return new Checkout_Group_View_1.GroupView({
                                    model: model,
                                });
                            },
                        },
                    },
                };
            },
            enumerable: true,
            configurable: true
        });
        OrderWizardModuleView.prototype.getContext = function () {
            return {
                module: this.configuration.module,
                position: this.configuration.position,
            };
        };
        return OrderWizardModuleView;
    }(WizardModule));
    return OrderWizardModuleView;
});
