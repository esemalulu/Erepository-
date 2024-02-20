/// <amd-module name="SuiteCommerce.CustomFields.Checkout.Configuration"/>
define("SuiteCommerce.CustomFields.Checkout.Configuration", ["require", "exports", "underscore", "SuiteCommerce.CustomFields.Utils", "SuiteCommerce.CustomFields.JavaScript.Utils"], function (require, exports, _, Utils_1, Utils_2) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    var environment = null;
    var Configuration = /** @class */ (function () {
        function Configuration() {
        }
        Configuration.setEnvironment = function (environmentComponent) {
            environment = environmentComponent;
        };
        Configuration.getFields = function () {
            // get a copy of the configuration
            var fields = this.get('customFields.checkout.fields', []).slice();
            // remove first occurrences of duplicated internalid, keep last
            fields = fields.reverse();
            fields = _(fields).uniq(function (field) {
                return field.internalid;
            });
            return fields.reverse();
        };
        Configuration.getRequiredError = function (fieldName) {
            var configValue = this.get('customFields.checkout.requiredError', '');
            return Utils_1.CustomFieldsUtils.compileText(configValue, { field: fieldName });
        };
        Configuration.getLoadingMessage = function () {
            var configValue = this.get('customFields.checkout.loadingMessage', '');
            return Utils_2.Utils.translate(configValue);
        };
        Configuration.getLoadingError = function () {
            var configValue = this.get('customFields.checkout.loadingError', '');
            return Utils_2.Utils.translate(configValue);
        };
        Configuration.getSavingError = function () {
            var configValue = this.get('customFields.checkout.savingError', '');
            return Utils_2.Utils.translate(configValue);
        };
        Configuration.get = function (key, defaultValue) {
            if (environment) {
                var configValue = environment.getConfig(key);
                if (_.isUndefined(configValue) && !_.isUndefined(defaultValue)) {
                    return defaultValue;
                }
                return configValue;
            }
            console.error('Please set the Environment Component in the Configuration.');
            return null;
        };
        return Configuration;
    }());
    exports.Configuration = Configuration;
    var FieldConfigurationPosition;
    (function (FieldConfigurationPosition) {
        FieldConfigurationPosition["BEFORE"] = "Before";
        FieldConfigurationPosition["AFTER"] = "After";
    })(FieldConfigurationPosition = exports.FieldConfigurationPosition || (exports.FieldConfigurationPosition = {}));
    var FieldConfigurationModule;
    (function (FieldConfigurationModule) {
        FieldConfigurationModule["SHIPPING_ADDRESS"] = "Shipping Address";
        FieldConfigurationModule["SHIPPING_METHOD"] = "Shipping Method";
        FieldConfigurationModule["GIFT_CERTIFICATE"] = "Gift Certificate";
        FieldConfigurationModule["PAYMENT_METHOD"] = "Payment Method";
        FieldConfigurationModule["BILLING_ADDRESS"] = "Billing Address";
        FieldConfigurationModule["REVIEW_SHIPPING"] = "Review Shipping";
        FieldConfigurationModule["REVIEW_PAYMENT"] = "Review Payment";
    })(FieldConfigurationModule = exports.FieldConfigurationModule || (exports.FieldConfigurationModule = {}));
    var FieldConfigurationType;
    (function (FieldConfigurationType) {
        FieldConfigurationType["HEADING"] = "Header";
        FieldConfigurationType["TEXT_INPUT"] = "Free-Form Text";
        FieldConfigurationType["TEXT_AREA"] = "Text Area";
        FieldConfigurationType["CHECKBOX"] = "Check Box";
        FieldConfigurationType["DATE"] = "Date";
    })(FieldConfigurationType = exports.FieldConfigurationType || (exports.FieldConfigurationType = {}));
});
