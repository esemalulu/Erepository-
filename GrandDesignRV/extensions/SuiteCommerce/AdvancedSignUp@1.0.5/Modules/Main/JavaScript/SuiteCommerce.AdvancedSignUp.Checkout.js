/// <amd-module name="SuiteCommerce.AdvancedSignUp.Checkout"/>
define("SuiteCommerce.AdvancedSignUp.Checkout", ["require", "exports", "SuiteCommerce.AdvancedSignUp.Common.Configuration", "SuiteCommerce.AdvancedSignUp.Utils", "SuiteCommerce.AdvancedSignUp.AccessPoints.Header", "SuiteCommerce.AdvancedSignUp.AccessPoints.Login", "SuiteCommerce.AdvancedSignUp.AccessPoints.Register"], function (require, exports, Configuration_1, Utils_1, Header, Login, Register) {
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
                    var userProfile = container.getComponent('UserProfile');
                    userProfile.getUserProfile().then(function (profile) {
                        if (layout_1 && !profile.isloggedin) {
                            layout_1.removeChildView('Header.Profile');
                            Header.mountToApp(container);
                            Login.mountToApp(container);
                        }
                    });
                }
                else {
                    Register.mountToApp(container);
                }
            }
        },
    };
});
