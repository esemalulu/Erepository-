/// <amd-module name="SuiteCommerce.AdvancedSignUp.Utils"/>
define("SuiteCommerce.AdvancedSignUp.Utils", ["require", "exports", "Utils"], function (require, exports, UtilSC) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    var Utils = /** @class */ (function () {
        function Utils() {
        }
        Utils.isSingleDomain = function () {
            return UtilSC.isSingleDomain();
        };
        Utils.getCountries = function () {
            return SC.ENVIRONMENT.siteSettings.countries;
        };
        return Utils;
    }());
    exports.Utils = Utils;
});
