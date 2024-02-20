/// <amd-module name="SuiteCommerce.AdvancedSignUp.Common.Configuration"/>
define("SuiteCommerce.AdvancedSignUp.Common.Configuration", ["require", "exports"], function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    var environment = null;
    var Configuration = /** @class */ (function () {
        function Configuration() {
        }
        Object.defineProperty(Configuration, "environment", {
            set: function (environmentComponent) {
                environment = environmentComponent;
            },
            enumerable: true,
            configurable: true
        });
        Configuration.get = function (key) {
            if (environment) {
                return environment.getConfig(key);
            }
            console.error('Please set the Environment Component in the Configuration.');
            return null;
        };
        return Configuration;
    }());
    exports.Configuration = Configuration;
});
