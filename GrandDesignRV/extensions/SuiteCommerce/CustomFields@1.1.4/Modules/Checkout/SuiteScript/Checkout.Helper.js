/// <amd-module name="SuiteCommerce.CustomFields.Checkout.Helper"/>
define("SuiteCommerce.CustomFields.Checkout.Helper", ["require", "exports", "underscore", "SuiteCommerce.CustomFields.Checkout.Data", "Configuration"], function (require, exports, _, Checkout_Data_1, Configuration) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.Helper = {
        getFields: function (fieldIds) {
            var _this = this;
            var fieldsConfig = Configuration.get('customFields.checkout.fields', []);
            var fields = [];
            fieldsConfig.forEach(function (fieldConfig) {
                var field = _this.parseFieldConfig(fieldConfig);
                if (!fieldIds ||
                    (fieldIds.length > 0 && fieldIds.indexOf(field.internalid) >= 0)) {
                    field.internalid = field.internalid.trim();
                    fields.push(field);
                }
            });
            return fields;
        },
        parseFieldConfig: function (field) {
            return _.extend({}, field, {
                position: this.mapPositionEnum(field.position),
                module: this.mapModuleEnum(field.module),
                type: this.mapTypeEnum(field.type),
            });
        },
        // Data
        mapPositionEnum: function (configValue) {
            return this.mapConfigEnum('Position', configValue);
        },
        mapModuleEnum: function (configValue) {
            return this.mapConfigEnum('Module', configValue);
        },
        mapTypeEnum: function (configValue) {
            return this.mapConfigEnum('Type', configValue);
        },
        mapConfigEnum: function (configMapKey, configValue) {
            var configMap;
            if (configMapKey in Checkout_Data_1.Data.ConfigMap) {
                configMap = Checkout_Data_1.Data.ConfigMap[configMapKey];
                if (configValue && configValue in configMap) {
                    return configMap[configValue];
                }
            }
            return null;
        },
        // Type Helpers
        isFieldTypeWritable: function (type) {
            return type && !this.isTypeHeading(type);
        },
        isTypeText: function (type) {
            return this.isTypeTextInput(type) || this.isTypeTextArea(type);
        },
        isTypeTextInput: function (type) {
            return type === Checkout_Data_1.Data.Enum.Type.TEXT_INPUT;
        },
        isTypeTextArea: function (type) {
            return type === Checkout_Data_1.Data.Enum.Type.TEXT_AREA;
        },
        isTypeCheckbox: function (type) {
            return type === Checkout_Data_1.Data.Enum.Type.CHECKBOX;
        },
        isTypeDate: function (type) {
            return type === Checkout_Data_1.Data.Enum.Type.DATE;
        },
        isTypeHeading: function (type) {
            return type === Checkout_Data_1.Data.Enum.Type.HEADING;
        },
    };
});
