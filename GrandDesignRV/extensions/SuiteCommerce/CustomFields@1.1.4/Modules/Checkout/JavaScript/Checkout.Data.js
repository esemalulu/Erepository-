/// <amd-module name="SuiteCommerce.CustomFields.Checkout.Data"/>
define("SuiteCommerce.CustomFields.Checkout.Data", ["require", "exports", "SuiteCommerce.CustomFields.Checkout.Configuration"], function (require, exports, Checkout_Configuration_1) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m;
    var FieldPosition;
    (function (FieldPosition) {
        FieldPosition["BEFORE"] = "BEFORE";
        FieldPosition["AFTER"] = "AFTER";
    })(FieldPosition = exports.FieldPosition || (exports.FieldPosition = {}));
    var FieldModule;
    (function (FieldModule) {
        FieldModule["SHIPPING_ADDRESS"] = "SHIPPING_ADDRESS";
        FieldModule["SHIPPING_METHOD"] = "SHIPPING_METHOD";
        FieldModule["GIFT_CERTIFICATE"] = "GIFT_CERTIFICATE";
        FieldModule["PAYMENT_METHOD"] = "PAYMENT_METHOD";
        FieldModule["BILLING_ADDRESS"] = "BILLING_ADDRESS";
        FieldModule["REVIEW_SHIPPING"] = "REVIEW_SHIPPING";
        FieldModule["REVIEW_PAYMENT"] = "REVIEW_PAYMENT";
    })(FieldModule = exports.FieldModule || (exports.FieldModule = {}));
    var FieldType;
    (function (FieldType) {
        FieldType["HEADING"] = "HEADING";
        FieldType["TEXT_INPUT"] = "TEXT_INPUT";
        FieldType["TEXT_AREA"] = "TEXT_AREA";
        FieldType["CHECKBOX"] = "CHECKBOX";
        FieldType["DATE"] = "DATE";
    })(FieldType = exports.FieldType || (exports.FieldType = {}));
    var Flow;
    (function (Flow) {
        Flow["STANDARD"] = "STANDARD";
        Flow["OPC"] = "OPC";
        Flow["BILLING_FIRST"] = "BILLING_FIRST";
    })(Flow = exports.Flow || (exports.Flow = {}));
    var ConfigMap;
    (function (ConfigMap) {
        ConfigMap["POSITION"] = "POSITION";
        ConfigMap["MODULE"] = "MODULE";
        ConfigMap["TYPE"] = "TYPE";
        ConfigMap["CHECKOUT_FLOW"] = "CHECKOUT_FLOW";
    })(ConfigMap = exports.ConfigMap || (exports.ConfigMap = {}));
    exports.Data = {
        ConfigMap: (_a = {},
            _a[ConfigMap.POSITION] = (_b = {},
                _b[Checkout_Configuration_1.FieldConfigurationPosition.BEFORE] = FieldPosition.BEFORE,
                _b[Checkout_Configuration_1.FieldConfigurationPosition.AFTER] = FieldPosition.AFTER,
                _b),
            _a[ConfigMap.MODULE] = (_c = {},
                _c[Checkout_Configuration_1.FieldConfigurationModule.SHIPPING_ADDRESS] = FieldModule.SHIPPING_ADDRESS,
                _c[Checkout_Configuration_1.FieldConfigurationModule.SHIPPING_METHOD] = FieldModule.SHIPPING_METHOD,
                _c[Checkout_Configuration_1.FieldConfigurationModule.GIFT_CERTIFICATE] = FieldModule.GIFT_CERTIFICATE,
                _c[Checkout_Configuration_1.FieldConfigurationModule.PAYMENT_METHOD] = FieldModule.PAYMENT_METHOD,
                _c[Checkout_Configuration_1.FieldConfigurationModule.BILLING_ADDRESS] = FieldModule.BILLING_ADDRESS,
                _c[Checkout_Configuration_1.FieldConfigurationModule.REVIEW_SHIPPING] = FieldModule.REVIEW_SHIPPING,
                _c[Checkout_Configuration_1.FieldConfigurationModule.REVIEW_PAYMENT] = FieldModule.REVIEW_PAYMENT,
                _c),
            _a[ConfigMap.TYPE] = (_d = {},
                _d[Checkout_Configuration_1.FieldConfigurationType.TEXT_INPUT] = FieldType.TEXT_INPUT,
                _d[Checkout_Configuration_1.FieldConfigurationType.TEXT_AREA] = FieldType.TEXT_AREA,
                _d[Checkout_Configuration_1.FieldConfigurationType.CHECKBOX] = FieldType.CHECKBOX,
                _d[Checkout_Configuration_1.FieldConfigurationType.DATE] = FieldType.DATE,
                _d[Checkout_Configuration_1.FieldConfigurationType.HEADING] = FieldType.HEADING,
                _d),
            _a[ConfigMap.CHECKOUT_FLOW] = {
                Standard: Flow.STANDARD,
                'One Page': Flow.OPC,
                'Billing First': Flow.BILLING_FIRST,
            },
            _a),
        OrderWizardMap: (_e = {},
            _e[FieldModule.SHIPPING_ADDRESS] = {
                step: (_f = {},
                    _f[Flow.STANDARD] = 'shipping/address',
                    _f[Flow.OPC] = 'opc',
                    _f[Flow.BILLING_FIRST] = 'shipping/address',
                    _f),
                module: 'order_wizard_address_module',
                indexIfRepeatedModule: 0,
            },
            _e[FieldModule.SHIPPING_METHOD] = {
                step: (_g = {},
                    _g[Flow.STANDARD] = 'shipping/address',
                    _g[Flow.OPC] = 'opc',
                    _g[Flow.BILLING_FIRST] = 'shipping/address',
                    _g),
                module: 'order_wizard_shipmethod_module',
                indexIfRepeatedModule: 0,
            },
            _e[FieldModule.GIFT_CERTIFICATE] = {
                step: (_h = {},
                    _h[Flow.STANDARD] = 'billing',
                    _h[Flow.OPC] = 'opc',
                    _h[Flow.BILLING_FIRST] = 'billing',
                    _h),
                module: 'order_wizard_paymentmethod_giftcertificates_module',
                indexIfRepeatedModule: 0,
            },
            _e[FieldModule.PAYMENT_METHOD] = {
                step: (_j = {},
                    _j[Flow.STANDARD] = 'billing',
                    _j[Flow.OPC] = 'opc',
                    _j[Flow.BILLING_FIRST] = 'billing',
                    _j),
                module: 'order_wizard_paymentmethod_selector_module',
                indexIfRepeatedModule: 0,
            },
            _e[FieldModule.BILLING_ADDRESS] = {
                step: (_k = {},
                    _k[Flow.STANDARD] = 'billing',
                    _k[Flow.OPC] = 'opc',
                    _k[Flow.BILLING_FIRST] = 'billing/address',
                    _k),
                module: 'order_wizard_address_module',
                indexIfRepeatedModule: 1,
            },
            _e[FieldModule.REVIEW_SHIPPING] = {
                step: (_l = {},
                    _l[Flow.STANDARD] = 'review',
                    _l[Flow.OPC] = 'review',
                    _l[Flow.BILLING_FIRST] = 'review',
                    _l),
                module: 'order_wizard_showshipments_module',
                indexIfRepeatedModule: 0,
            },
            _e[FieldModule.REVIEW_PAYMENT] = {
                step: (_m = {},
                    _m[Flow.STANDARD] = 'review',
                    _m[Flow.OPC] = 'review',
                    _m[Flow.BILLING_FIRST] = 'review',
                    _m),
                module: 'order_wizard_showpayments_module',
                indexIfRepeatedModule: 0,
            },
            _e),
    };
});
