/// <amd-module name="SuiteCommerce.AdvancedSignUp.AccessPoints.Login.View"/>
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
define("SuiteCommerce.AdvancedSignUp.AccessPoints.Login.View", ["require", "exports", "Backbone", "sc_advancedsignup_login.tpl", "SuiteCommerce.AdvancedSignUp.AccessPoints.Configuration"], function (require, exports, Backbone_1, login, AccessPoints_Configuration_1) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    var LoginView = /** @class */ (function (_super) {
        __extends(LoginView, _super);
        function LoginView(options) {
            var _this = _super.call(this, options) || this;
            _this.template = login;
            return _this;
        }
        LoginView.prototype.generateTextAndLink = function () {
            var textAndLink = AccessPoints_Configuration_1.AccessPointsConfiguration.loginFormText;
            textAndLink = textAndLink.replace('[[link]]', "<a class=\"advancedsignup-login-link\" data-touchpoint=\"home\" data-hashtag=\"" + AccessPoints_Configuration_1.AccessPointsConfiguration.urlPath + "\" href=\"#\"> " + AccessPoints_Configuration_1.AccessPointsConfiguration.loginFormLink + " </a>");
            return textAndLink;
        };
        LoginView.prototype.getContext = function () {
            return {
                registrationTextAndLink: this.generateTextAndLink()
            };
        };
        return LoginView;
    }(Backbone_1.View));
    exports.LoginView = LoginView;
});
