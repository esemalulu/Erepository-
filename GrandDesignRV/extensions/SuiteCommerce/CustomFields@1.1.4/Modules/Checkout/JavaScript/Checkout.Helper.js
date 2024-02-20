/// <amd-module name="SuiteCommerce.CustomFields.Checkout.Helper"/>
define("SuiteCommerce.CustomFields.Checkout.Helper", ["require", "exports", "underscore", "SuiteCommerce.CustomFields.JavaScript.Utils", "SuiteCommerce.CustomFields.Checkout.Data", "SuiteCommerce.CustomFields.Checkout.Configuration", "SuiteCommerce.CustomFields.Checkout.Field.Collection"], function (require, exports, _, Utils_1, Checkout_Data_1, Checkout_Configuration_1, Checkout_Field_Collection_1) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    var Helper = /** @class */ (function () {
        function Helper() {
        }
        Helper.getServiceUrl = function () {
            return Utils_1.Utils.getAbsoluteUrl(getExtensionAssetsPath('services/Checkout.Service.ss'));
        };
        Helper.getFieldsCollection = function () {
            var fields = Checkout_Configuration_1.Configuration.getFields();
            return new Checkout_Field_Collection_1.FieldCollection(fields);
        };
        Helper.mapPositionEnum = function (configValue) {
            return Checkout_Data_1.Data.ConfigMap[Checkout_Data_1.ConfigMap.POSITION][configValue];
        };
        Helper.mapModuleEnum = function (configValue) {
            return Checkout_Data_1.Data.ConfigMap[Checkout_Data_1.ConfigMap.MODULE][configValue];
        };
        Helper.mapTypeEnum = function (configValue) {
            return Checkout_Data_1.Data.ConfigMap[Checkout_Data_1.ConfigMap.TYPE][configValue];
        };
        Helper.mapCheckoutFlowEnum = function (configValue) {
            return Checkout_Data_1.Data.ConfigMap[Checkout_Data_1.ConfigMap.CHECKOUT_FLOW][configValue];
        };
        Helper.getOrderWizardModule = function (checkoutFlow, module) {
            var moduleConfig = this.getOrderWizardModuleConfig(module);
            var flow = this.mapCheckoutFlowEnum(checkoutFlow);
            if (moduleConfig && !_.isUndefined(flow)) {
                return {
                    step: moduleConfig.step[flow],
                    module: moduleConfig.module,
                    indexIfRepeatedModule: moduleConfig.indexIfRepeatedModule || 0,
                };
            }
            return null;
        };
        Helper.getOrderWizardModuleConfig = function (module) {
            if (module && module in Checkout_Data_1.Data.OrderWizardMap) {
                return Checkout_Data_1.Data.OrderWizardMap[module];
            }
            return null;
        };
        Helper.parseJsExceptionError = function (errorAny, isSaving) {
            if (isSaving === void 0) { isSaving = false; }
            var error = Helper.createError(errorAny, true);
            if (error &&
                ((error.errorStatusCode && error.errorStatusCode === 500) ||
                    (error.errorCode && error.errorCode === 'JS_EXCEPTION'))) {
                error.errorMessage = isSaving
                    ? Checkout_Configuration_1.Configuration.getSavingError()
                    : Checkout_Configuration_1.Configuration.getLoadingError();
                return true;
            }
            return false;
        };
        Helper.createError = function (error, isSaving) {
            var errorMessage = isSaving
                ? Checkout_Configuration_1.Configuration.getSavingError()
                : Checkout_Configuration_1.Configuration.getLoadingError();
            if (_.isFunction(error)) {
                return { errorMessage: errorMessage };
            }
            if (_.isArray(error)) {
                return { errorMessage: JSON.stringify(error) };
            }
            if (_.isObject(error)) {
                // it's already a well-formed error
                if ('errorMessage' in error) {
                    return error;
                }
                // it's a resolved XHR promise with valid JSON response error
                if (error.responseJSON && error.responseJSON.errorMessage) {
                    return error.responseJSON;
                }
                // it's a resolved XHR promise with a response string
                if (error.responseText) {
                    return { errorMessage: error.responseText };
                }
                // unrecognised object or empty promise
                return { errorMessage: errorMessage };
            }
            return { errorMessage: error };
        };
        return Helper;
    }());
    exports.Helper = Helper;
});
