/// <amd-module name="SuiteCommerce.AdvancedSignUp.AccessPoints.Header.View"/>
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
define("SuiteCommerce.AdvancedSignUp.AccessPoints.Header.View", ["require", "exports", "Backbone", "sc_advancedsignup_header.tpl", "SuiteCommerce.AdvancedSignUp.AccessPoints.Configuration"], function (require, exports, Backbone_1, header, AccessPoints_Configuration_1) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    var HeaderView = /** @class */ (function (_super) {
        __extends(HeaderView, _super);
        function HeaderView(options) {
            var _this = _super.call(this, options) || this;
            // The template of this view uses the same classes as SuiteCommerce header because we are copying the view, we want to keep their styles if they were modified.
            _this.template = header;
            return _this;
        }
        HeaderView.prototype.getContext = function () {
            return {
                registerLink: AccessPoints_Configuration_1.AccessPointsConfiguration.urlPath,
                registerLinkLabel: AccessPoints_Configuration_1.AccessPointsConfiguration.headerLinkText
            };
        };
        return HeaderView;
    }(Backbone_1.View));
    exports.HeaderView = HeaderView;
});
