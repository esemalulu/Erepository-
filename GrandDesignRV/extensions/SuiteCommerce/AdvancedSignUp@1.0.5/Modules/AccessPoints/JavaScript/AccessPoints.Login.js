/// <amd-module name="SuiteCommerce.AdvancedSignUp.AccessPoints.Login"/>
define("SuiteCommerce.AdvancedSignUp.AccessPoints.Login", ["require", "exports", "SuiteCommerce.AdvancedSignUp.AccessPoints.Login.View"], function (require, exports, AccessPoints_Login_View_1) {
    "use strict";
    return {
        mountToApp: function (container) {
            var loginRegisterComponent = container.getComponent('LoginRegisterPage');
            loginRegisterComponent.addChildView('Login', function () { return new AccessPoints_Login_View_1.LoginView(loginRegisterComponent); });
        },
    };
});
