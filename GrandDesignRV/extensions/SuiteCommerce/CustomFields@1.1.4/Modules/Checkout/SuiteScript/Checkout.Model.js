/// <amd-module name="SuiteCommerce.CustomFields.Checkout.Model"/>
define("SuiteCommerce.CustomFields.Checkout.Model", ["require", "exports", "underscore", "SC.Models.Init", "SuiteCommerce.CustomFields.Checkout.Helper"], function (require, exports, _, ModelsInit, Checkout_Helper_1) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    var Model = /** @class */ (function () {
        function Model() {
        }
        Model.get = function (data) {
            var _this = this;
            var result = {};
            var customFields = ModelsInit.order.getCustomFieldValues() || {};
            var fields = data.fields;
            fields.forEach(function (field) {
                if (Checkout_Helper_1.Helper.isFieldTypeWritable(field.type)) {
                    result[field.internalid] = _this.getFieldValueForLoad(customFields, field);
                }
            });
            return result;
        };
        Model.update = function (data) {
            var _this = this;
            var fields = data.fields;
            var customFields = {};
            fields.forEach(function (field) {
                if (Checkout_Helper_1.Helper.isFieldTypeWritable(field.type)) {
                    customFields[field.internalid] = _this.getFieldValueForSave(data, field);
                }
            });
            if (_(customFields).size() > 0) {
                ModelsInit.order.setCustomFieldValues(customFields);
            }
            return this.get(data);
        };
        // Utils
        Model.getFieldValueForSave = function (data, field) {
            var value = data[field.internalid];
            return this.formatValueForSave(field, value);
        };
        Model.formatValueForSave = function (field, value) {
            var type = field.type;
            if (Checkout_Helper_1.Helper.isTypeDate(type)) {
                return this.formatDateValueForSave(value);
            }
            if (Checkout_Helper_1.Helper.isTypeCheckbox(type)) {
                return this.formatCheckboxValueForSave(value);
            }
            if (Checkout_Helper_1.Helper.isTypeText(type)) {
                return this.formatTextValueForSave(value);
            }
            return value;
        };
        Model.formatDateValueForSave = function (value) {
            var date;
            if (value) {
                date = value.split('-');
                return nlapiDateToString(new Date(date[0], date[1] - 1, date[2]));
            }
            return '';
        };
        Model.formatCheckboxValueForSave = function (value) {
            return !value || value === 'off' ? 'F' : 'T';
        };
        Model.formatTextValueForSave = function (value) {
            return value || '';
        };
        Model.getFieldValueForLoad = function (customFields, field) {
            var customField = _(customFields).findWhere({ name: field.internalid });
            var value = customField ? customField.value : null;
            return this.formatValueForLoad(field, value);
        };
        Model.formatValueForLoad = function (field, value) {
            var type = field.type;
            if (Checkout_Helper_1.Helper.isTypeDate(type)) {
                return this.formatDateValueForLoad(value);
            }
            if (Checkout_Helper_1.Helper.isTypeCheckbox(type)) {
                return this.formatCheckboxValueForLoad(value);
            }
            if (Checkout_Helper_1.Helper.isTypeText(type)) {
                return this.formatTextValueForLoad(value);
            }
            return value;
        };
        Model.formatDateValueForLoad = function (value) {
            var date;
            if (value) {
                if (value.indexOf('-') !== -1) {
                    var values = value.split('-');
                    value = nlapiDateToString(new Date(values[0], values[1] - 1, values[2]));
                }
                date = nlapiStringToDate(value);
                return date.toISOString().slice(0, 10);
            }
            return '';
        };
        Model.formatCheckboxValueForLoad = function (value) {
            return value === 'T';
        };
        Model.formatTextValueForLoad = function (value) {
            return value || '';
        };
        return Model;
    }());
    exports.Model = Model;
});
