/// <amd-module name="SuiteCommerce.AdvancedSignUp.AccessPoints.Register"/>
define("SuiteCommerce.AdvancedSignUp.AccessPoints.Register", ["require", "exports", "SuiteCommerce.AdvancedSignUp.AccessPoints.Register.View"], function (require, exports, AccessPoints_Register_View_1) {
    "use strict";
    return {
        mountToApp: function (container) {
            var loginRegisterComponent = container.getComponent('LoginRegisterPage');
            loginRegisterComponent.addChildViews(loginRegisterComponent.LRP_VIEW, {
                'Register': {
                    'AdvancedSingUpAccessPoint': {
                        childViewIndex: 1,
                        childViewConstructor: function () { return new AccessPoints_Register_View_1.RegisterView(loginRegisterComponent); }
                    }
                }
            });
        },
    };
});
