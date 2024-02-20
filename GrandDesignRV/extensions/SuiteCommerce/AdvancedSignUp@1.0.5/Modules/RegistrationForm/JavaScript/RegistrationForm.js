/// <amd-module name="SuiteCommerce.AdvancedSignUp.RegistrationForm"/>
define("SuiteCommerce.AdvancedSignUp.RegistrationForm", ["require", "exports", "SuiteCommerce.AdvancedSignUp.RegistrationForm.View", "SuiteCommerce.AdvancedSignUp.RegistrationForm.Configuration"], function (require, exports, RegistrationForm_View_1, RegistrationForm_Configuration_1) {
    "use strict";
    return {
        mountToApp: function (container) {
            var pageTypeComponent = container.getComponent('PageType');
            this.registerPageType(pageTypeComponent);
        },
        registerPageType: function (pageTypeComponent) {
            pageTypeComponent.registerPageType({
                name: 'ext-advsu-page',
                routes: [RegistrationForm_Configuration_1.RegistrationFormConfiguration.urlPath],
                view: RegistrationForm_View_1.RegistrationFormView,
                defaultTemplate: {
                    name: 'suitecommerce_advancedsignup.tpl',
                    displayName: 'Advanced Sign Up',
                    thumbnail: ''
                }
            });
        }
    };
});
