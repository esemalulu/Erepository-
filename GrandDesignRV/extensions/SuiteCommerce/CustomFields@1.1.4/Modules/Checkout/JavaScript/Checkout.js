/// <amd-module name="SuiteCommerce.CustomFields.Checkout"/>
define("SuiteCommerce.CustomFields.Checkout", ["require", "exports", "jQuery", "SuiteCommerce.CustomFields.Checkout.Configuration", "SuiteCommerce.CustomFields.Checkout.Setup", "SuiteCommerce.CustomFields.Checkout.Setup.Validation", "SuiteCommerce.CustomFields.Checkout.OrderWizardModule.View"], function (require, exports, jQuery, Checkout_Configuration_1, Checkout_Setup_1, Checkout_Setup_Validation_1, OrderWizardModuleView) {
    "use strict";
    // NOTE: Used for side effects
    // https://github.com/Microsoft/TypeScript/wiki/FAQ#why-are-imports-being-elided-in-my-emit
    // import './Checkout.OrderWizardModule.View'; doesn't work either because the module needs to do "export = ..." to be
    // consumed properly by SuiteCommerce
    OrderWizardModuleView;
    return {
        mountToApp: function (container) {
            Checkout_Configuration_1.Configuration.setEnvironment(container.getComponent('Environment'));
            this.setupFieldValidation(container);
            this.addCustomFieldsToCheckout(container);
        },
        setupFieldValidation: function (container) {
            var cart = container.getComponent('Cart');
            cart.on('beforeSubmit', function () {
                return Checkout_Setup_Validation_1.ValidationModel.validateAllFields();
            });
        },
        addCustomFieldsToCheckout: function (container) {
            this.getCheckoutSetupOptions(container).done(function (options) {
                Checkout_Setup_1.Setup.addCustomFieldsToCheckout(options);
            });
        },
        getCheckoutSetupOptions: function (container) {
            var checkout = container.getComponent('Checkout');
            var deferred = jQuery.Deferred();
            jQuery
                .when(checkout.getCheckoutFlow(), checkout.getStepsInfo())
                .done(function (checkoutFlow, stepsInfo) {
                var setupOptions = {
                    checkout: checkout,
                    stepsInfo: stepsInfo,
                    checkoutFlow: checkoutFlow,
                };
                deferred.resolve(setupOptions);
            });
            return deferred.promise();
        },
    };
});
