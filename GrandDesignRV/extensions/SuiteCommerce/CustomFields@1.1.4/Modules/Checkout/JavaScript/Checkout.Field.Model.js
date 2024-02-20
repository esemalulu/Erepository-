/// <amd-module name="SuiteCommerce.CustomFields.Checkout.Field.Model"/>
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
define("SuiteCommerce.CustomFields.Checkout.Field.Model", ["require", "exports", "Backbone", "underscore", "SuiteCommerce.CustomFields.Checkout.Data", "SuiteCommerce.CustomFields.Checkout.Helper"], function (require, exports, Backbone_1, _, Checkout_Data_1, Checkout_Helper_1) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    var FieldModel = /** @class */ (function (_super) {
        __extends(FieldModel, _super);
        function FieldModel() {
            return _super !== null && _super.apply(this, arguments) || this;
        }
        Object.defineProperty(FieldModel.prototype, "fieldId", {
            get: function () {
                return this.get('internalid').trim();
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(FieldModel.prototype, "position", {
            get: function () {
                return Checkout_Helper_1.Helper.mapPositionEnum(this.get('position'));
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(FieldModel.prototype, "module", {
            get: function () {
                return Checkout_Helper_1.Helper.mapModuleEnum(this.get('module'));
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(FieldModel.prototype, "type", {
            get: function () {
                return Checkout_Helper_1.Helper.mapTypeEnum(this.get('type'));
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(FieldModel.prototype, "label", {
            get: function () {
                return this.get('label');
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(FieldModel.prototype, "placeholder", {
            get: function () {
                return this.get('placeholder');
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(FieldModel.prototype, "mandatory", {
            get: function () {
                return !!this.get('mandatory');
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(FieldModel.prototype, "maxlength", {
            get: function () {
                var maxlength = this.get('maxfieldlength');
                if (!maxlength) {
                    return '';
                }
                return maxlength;
            },
            enumerable: true,
            configurable: true
        });
        FieldModel.prototype.isValidLocation = function () {
            var position = this.position;
            var module = this.module;
            return !_.isUndefined(position) && !_.isUndefined(module);
        };
        FieldModel.prototype.isTypeTextInput = function () {
            return this.type === Checkout_Data_1.FieldType.TEXT_INPUT;
        };
        FieldModel.prototype.isTypeTextArea = function () {
            return this.type === Checkout_Data_1.FieldType.TEXT_AREA;
        };
        FieldModel.prototype.isTypeCheckbox = function () {
            return this.type === Checkout_Data_1.FieldType.CHECKBOX;
        };
        FieldModel.prototype.isTypeDate = function () {
            return this.type === Checkout_Data_1.FieldType.DATE;
        };
        FieldModel.prototype.isTypeHeading = function () {
            return this.type === Checkout_Data_1.FieldType.HEADING;
        };
        FieldModel.prototype.isTypeField = function () {
            return this.type && !this.isTypeHeading();
        };
        return FieldModel;
    }(Backbone_1.Model));
    exports.FieldModel = FieldModel;
});
