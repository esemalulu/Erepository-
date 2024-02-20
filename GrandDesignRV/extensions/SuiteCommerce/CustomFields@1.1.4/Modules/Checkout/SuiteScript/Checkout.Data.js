/// <amd-module name="SuiteCommerce.CustomFields.Checkout.Data"/>
define("SuiteCommerce.CustomFields.Checkout.Data", ["require", "exports"], function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    var Enum = {
        Position: {
            BEFORE: 'BEFORE',
            AFTER: 'AFTER',
        },
        Module: {
            SHIPPING_ADDRESS: 'SHIPPING_ADDRESS',
            SHIPPING_METHOD: 'SHIPPING_METHOD',
            GIFT_CERTIFICATE: 'GIFT_CERTIFICATE',
            PAYMENT_METHOD: 'PAYMENT_METHOD',
            BILLING_ADDRESS: 'BILLING_ADDRESS',
            REVIEW_SHIPPING: 'REVIEW_SHIPPING',
            REVIEW_PAYMENT: 'REVIEW_PAYMENT',
        },
        Type: {
            TEXT_INPUT: 'TEXT_INPUT',
            TEXT_AREA: 'TEXT_AREA',
            CHECKBOX: 'CHECKBOX',
            DATE: 'DATE',
            HEADING: 'HEADING',
        },
    };
    exports.Data = {
        Enum: Enum,
        ConfigMap: {
            Position: {
                Before: Enum.Position.BEFORE,
                After: Enum.Position.AFTER,
            },
            Module: {
                'Shipping Address': Enum.Module.SHIPPING_ADDRESS,
                'Shipping Method': Enum.Module.SHIPPING_METHOD,
                'Gift Certificate': Enum.Module.GIFT_CERTIFICATE,
                'Payment Method': Enum.Module.PAYMENT_METHOD,
                'Billing Address': Enum.Module.BILLING_ADDRESS,
                'Review Shipping': Enum.Module.REVIEW_SHIPPING,
                'Review Payment': Enum.Module.REVIEW_PAYMENT,
            },
            Type: {
                'Free-Form Text': Enum.Type.TEXT_INPUT,
                'Text Area': Enum.Type.TEXT_AREA,
                'Check Box': Enum.Type.CHECKBOX,
                Date: Enum.Type.DATE,
                Header: Enum.Type.HEADING,
            },
        },
        OrderWizardMap: {
            SHIPPING_ADDRESS: {
                step: 'shipping/address',
                module: 'order_wizard_address_module',
            },
            SHIPPING_METHOD: {
                step: 'shipping/address',
                module: 'order_wizard_shipmethod_module',
            },
            GIFT_CERTIFICATE: {
                step: 'billing',
                module: 'order_wizard_paymentmethod_giftcertificates_module',
            },
            PAYMENT_METHOD: {
                step: 'billing',
                module: 'order_wizard_paymentmethod_selector_module',
            },
            BILLING_ADDRESS: {
                step: 'billing',
                module: 'order_wizard_address_module',
            },
            REVIEW_SHIPPING: {
                step: 'review',
                module: 'order_wizard_showshipments_module',
            },
            REVIEW_PAYMENT: {
                step: 'review',
                module: 'order_wizard_showpayments_module',
            },
        },
    };
});
