/// <amd-module name="SuiteCommerce.CustomFields.PDP.Main"/>
define("SuiteCommerce.CustomFields.PDP.Main", ["require", "exports", "SuiteCommerce.CustomFields.PDP", "SuiteCommerce.CustomFields.Instrumentation.Helper"], function (require, exports, PDPFields, Instrumentation_Helper_1) {
    "use strict";
    var Module = {
        mountToApp: function (container) {
            Instrumentation_Helper_1.InstrumentationHelper.initializeInstrumentation(container);
            PDPFields.mountToApp(container);
        },
    };
    return Module;
});
