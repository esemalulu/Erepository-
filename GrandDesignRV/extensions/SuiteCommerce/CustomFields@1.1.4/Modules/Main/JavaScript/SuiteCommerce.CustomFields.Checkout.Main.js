/// <amd-module name="SuiteCommerce.CustomFields.Checkout.Main"/>
define("SuiteCommerce.CustomFields.Checkout.Main", ["require", "exports", "SuiteCommerce.CustomFields.Checkout", "SuiteCommerce.CustomFields.Instrumentation.Helper"], function (require, exports, CustomFieldsCheckout, Instrumentation_Helper_1) {
    "use strict";
    var Module = {
        mountToApp: function (container) {
            Instrumentation_Helper_1.InstrumentationHelper.initializeInstrumentation(container);
            CustomFieldsCheckout.mountToApp(container);
        },
    };
    return Module;
});
