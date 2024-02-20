/// <amd-module name="SuiteCommerce.CustomFields.Checkout.Setup.Validation"/>
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
define("SuiteCommerce.CustomFields.Checkout.Setup.Validation", ["require", "exports", "jQuery", "Backbone", "SuiteCommerce.CustomFields.Checkout.Helper", "SuiteCommerce.CustomFields.Checkout.Configuration"], function (require, exports, jQuery, Backbone_1, Checkout_Helper_1, Checkout_Configuration_1) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    var ValidationModel = /** @class */ (function (_super) {
        __extends(ValidationModel, _super);
        function ValidationModel() {
            var _this = _super !== null && _super.apply(this, arguments) || this;
            _this.url = Checkout_Helper_1.Helper.getServiceUrl();
            return _this;
        }
        ValidationModel.validateAllFields = function () {
            return this.validateAllRequiredFields();
        };
        ValidationModel.validateAllRequiredFields = function () {
            var _this = this;
            var model = new ValidationModel();
            return model
                .fetchAllFieldValues()
                .then(function (fetchResult) {
                var allFields = fetchResult.allFields, fetchedFields = fetchResult.fetchedFields;
                var errors = [];
                var deferred = jQuery.Deferred();
                allFields.each(function (field) {
                    if (!field.isTypeCheckbox() &&
                        field.mandatory &&
                        !fetchedFields[field.fieldId]) {
                        errors.push(Checkout_Configuration_1.Configuration.getRequiredError(field.label));
                    }
                });
                if (errors && errors.length) {
                    var errorReduced = errors.join(',');
                    _this.scrollToValidationErrors();
                    deferred.reject(errorReduced);
                }
                else {
                    deferred.resolve();
                }
                return deferred.promise();
            });
        };
        ValidationModel.scrollToValidationErrors = function () {
            var offset = jQuery('.order-wizard-step-title').offset();
            jQuery('html').animate({
                scrollTop: offset ? offset.top : 0,
            }, 600);
        };
        ValidationModel.prototype.fetchAllFieldValues = function () {
            var allFields = Checkout_Helper_1.Helper.getFieldsCollection();
            var fieldIds = allFields.map(function (field) { return field.fieldId; }).join(',');
            var deferred = jQuery.Deferred();
            this.fetch({
                data: {
                    fields: fieldIds,
                },
            })
                .done(function (fetchedFields) {
                deferred.resolve({ allFields: allFields, fetchedFields: fetchedFields });
            })
                .fail(function () {
                deferred.reject();
            });
            return deferred.promise();
        };
        return ValidationModel;
    }(Backbone_1.Model));
    exports.ValidationModel = ValidationModel;
});
