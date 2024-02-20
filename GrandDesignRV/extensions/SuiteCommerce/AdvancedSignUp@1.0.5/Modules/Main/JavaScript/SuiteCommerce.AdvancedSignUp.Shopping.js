/// <amd-module name="SuiteCommerce.AdvancedSignUp.Shopping"/>
define("SuiteCommerce.AdvancedSignUp.Shopping", ["require", "exports", "SuiteCommerce.AdvancedSignUp.RegistrationForm", "SuiteCommerce.AdvancedSignUp.AccessPoints.Header", "SuiteCommerce.AdvancedSignUp.Common.Configuration", "SuiteCommerce.AdvancedSignUp.Utils", "SuiteCommerce.AdvancedSignUp.Common.InstrumentationHelper", "underscore"], function (require, exports, RegistrationForm, Header, Configuration_1, Utils_1, InstrumentationHelper_1, _) {
    "use strict";
    return {
        mountToApp: function (container) {
            var environment = container.getComponent('Environment');
            var registrationSettings = environment.getSiteSetting('registration');
            if (registrationSettings.registrationmandatory === 'F' && Utils_1.Utils.isSingleDomain()) {
                Configuration_1.Configuration.environment = environment;
                // Existing customers only
                if (registrationSettings.registrationallowed === 'F') {
                    var layout_1 = container.getComponent('Layout');
                    var userProfile_1 = container.getComponent('UserProfile');
                    _.defer(function () {
                        userProfile_1.getUserProfile().then(function (profile) {
                            if (layout_1 && !profile.isloggedin) {
                                layout_1.removeChildView('Header.Profile');
                                Header.mountToApp(container);
                            }
                        });
                    });
                }
                InstrumentationHelper_1.InstrumentationHelper.initializeInstrumentation(environment);
                RegistrationForm.mountToApp(container);
            }
        }
    };
});
