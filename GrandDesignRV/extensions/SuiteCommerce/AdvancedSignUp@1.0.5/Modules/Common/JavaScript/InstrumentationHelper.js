/// <amd-module name="SuiteCommerce.AdvancedSignUp.Common.InstrumentationHelper"/>
define("SuiteCommerce.AdvancedSignUp.Common.InstrumentationHelper", ["require", "exports", "SuiteCommerce.AdvancedSignUp.Instrumentation"], function (require, exports, Instrumentation_1) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    var QueueNameSuffix = '-AdvancedSignUp';
    var ExtensionVersion = '1.0.5';
    var ComponentArea = 'SC Advanced Sign Up';
    var InstrumentationHelper = /** @class */ (function () {
        function InstrumentationHelper() {
        }
        InstrumentationHelper.initializeInstrumentation = function (environment) {
            Instrumentation_1.default.initialize({
                environment: environment,
                queueNameSuffix: QueueNameSuffix,
                defaultParameters: {
                    componentArea: ComponentArea,
                    extensionVersion: ExtensionVersion,
                }
            });
        };
        return InstrumentationHelper;
    }());
    exports.InstrumentationHelper = InstrumentationHelper;
});
