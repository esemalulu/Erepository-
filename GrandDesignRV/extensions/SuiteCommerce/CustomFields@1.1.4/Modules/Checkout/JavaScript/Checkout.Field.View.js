/// <amd-module name="SuiteCommerce.CustomFields.Checkout.Field.View"/>
var __extends = (this && this.__extends) || (function () {
    var extendStatics = function (d, b) {
        extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p]; };
        return extendStatics(d, b);
    };
    return function (d, b) {
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
define("SuiteCommerce.CustomFields.Checkout.Field.View", ["require", "exports", "Backbone", "SuiteCommerce.CustomFields.Checkout.Configuration", "suitecommerce_customfields_checkout_field.tpl"], function (require, exports, Backbone_1, Checkout_Configuration_1, checkoutFieldTpl) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    var FieldView = /** @class */ (function (_super) {
        __extends(FieldView, _super);
        function FieldView() {
            var _this = _super !== null && _super.apply(this, arguments) || this;
            _this.template = checkoutFieldTpl;
            return _this;
        }
        FieldView.prototype.getRequiredError = function () {
            var label = this.model.label;
            return Checkout_Configuration_1.Configuration.getRequiredError(label);
        };
        FieldView.prototype.isValid = function () {
            var deferred = jQuery.Deferred();
            var model = this.model;
            if (!model.isTypeHeading() && model.mandatory) {
                if (this.getFieldValue()) {
                    deferred.resolve();
                }
                else {
                    deferred.reject(this.getRequiredError());
                }
            }
            else {
                deferred.resolve();
            }
            return deferred.promise();
        };
        FieldView.prototype.getFieldValue = function () {
            return this.$("[name=\"" + this.model.fieldId + "\"]").val();
        };
        FieldView.prototype.getContext = function () {
            var model = this.model;
            return {
                fieldId: model.fieldId,
                type: model.type,
                label: model.label,
                placeholder: model.placeholder,
                isMandatory: model.mandatory,
                maxLength: model.maxlength,
                // TODO: convert to "inheritance"
                isTextInput: model.isTypeTextInput(),
                isTextArea: model.isTypeTextArea(),
                isCheckbox: model.isTypeCheckbox(),
                isDate: model.isTypeDate(),
                isHeading: model.isTypeHeading(),
            };
        };
        return FieldView;
    }(Backbone_1.View));
    exports.FieldView = FieldView;
});
