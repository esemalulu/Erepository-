/// <amd-module name="SuiteCommerce.AdvancedSignUp.AccessPoints.Configuration"/>
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
define("SuiteCommerce.AdvancedSignUp.AccessPoints.Configuration", ["require", "exports", "SuiteCommerce.AdvancedSignUp.Common.Configuration"], function (require, exports, Configuration_1) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    var AccessPointsConfiguration = /** @class */ (function (_super) {
        __extends(AccessPointsConfiguration, _super);
        function AccessPointsConfiguration() {
            return _super !== null && _super.apply(this, arguments) || this;
        }
        Object.defineProperty(AccessPointsConfiguration, "urlPath", {
            get: function () {
                return this.get('advancedsignup.general.urlpath');
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(AccessPointsConfiguration, "headerLinkText", {
            get: function () {
                return this.get('advancedsignup.general.headerlinktext');
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(AccessPointsConfiguration, "loginFormText", {
            get: function () {
                return this.get('advancedsignup.general.loginformtext');
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(AccessPointsConfiguration, "loginFormLink", {
            get: function () {
                return this.get('advancedsignup.general.loginformlink');
            },
            enumerable: true,
            configurable: true
        });
        return AccessPointsConfiguration;
    }(Configuration_1.Configuration));
    exports.AccessPointsConfiguration = AccessPointsConfiguration;
});
