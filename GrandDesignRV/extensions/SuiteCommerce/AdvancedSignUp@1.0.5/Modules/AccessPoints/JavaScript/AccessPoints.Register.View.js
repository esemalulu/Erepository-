/// <amd-module name="SuiteCommerce.AdvancedSignUp.AccessPoints.Register.View"/>
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
define("SuiteCommerce.AdvancedSignUp.AccessPoints.Register.View", ["require", "exports", "Backbone", "sc_advancedsignup_register.tpl", "SuiteCommerce.AdvancedSignUp.AccessPoints.Configuration"], function (require, exports, Backbone_1, register, AccessPoints_Configuration_1) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    var RegisterView = /** @class */ (function (_super) {
        __extends(RegisterView, _super);
        function RegisterView(options) {
            var _this = _super.call(this, options) || this;
            _this.template = register;
            return _this;
        }
        RegisterView.prototype.generateTextAndLink = function () {
            var textAndLink = AccessPoints_Configuration_1.AccessPointsConfiguration.loginFormText;
            textAndLink = textAndLink.replace('[[link]]', "<a class=\"advancedsignup-register-link\" data-touchpoint=\"home\" data-hashtag=\"" + AccessPoints_Configuration_1.AccessPointsConfiguration.urlPath + "\" href=\"#\"> " + AccessPoints_Configuration_1.AccessPointsConfiguration.loginFormLink + " </a>");
            return textAndLink;
        };
        RegisterView.prototype.getContext = function () {
            return {
                registrationTextAndLink: this.generateTextAndLink()
            };
        };
        return RegisterView;
    }(Backbone_1.View));
    exports.RegisterView = RegisterView;
});
