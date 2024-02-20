/// <amd-module name="SuiteCommerce.CustomFields.Instrumentation.Helper"/>
define("SuiteCommerce.CustomFields.Instrumentation.Helper", ["require", "exports", "SuiteCommerce.CustomFields.Instrumentation"], function (require, exports, Instrumentation_1) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.ComponentArea = 'SC Custom Fields';
    exports.ExtensionVersion = '1.1.4';
    exports.QueueNameSuffix = '-CustomFields';
    var InstrumentationHelper = /** @class */ (function () {
        function InstrumentationHelper() {
        }
        InstrumentationHelper.initializeInstrumentation = function (container) {
            Instrumentation_1.default.initialize({
                environment: container.getComponent('Environment'),
                queueNameSuffix: exports.QueueNameSuffix,
            });
        };
        return InstrumentationHelper;
    }());
    exports.InstrumentationHelper = InstrumentationHelper;
});
