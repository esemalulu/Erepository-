/// <amd-module name="SuiteCommerce.AdvancedSignUp.RegistrationForm.Field.Model"/>
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
define("SuiteCommerce.AdvancedSignUp.RegistrationForm.Field.Model", ["require", "exports", "Backbone"], function (require, exports, Backbone_1) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    var FieldModel = /** @class */ (function (_super) {
        __extends(FieldModel, _super);
        function FieldModel() {
            return _super !== null && _super.apply(this, arguments) || this;
        }
        Object.defineProperty(FieldModel.prototype, "internalid", {
            get: function () {
                return this.get('internalid').trim();
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(FieldModel.prototype, "label", {
            get: function () {
                return this.get('label').trim();
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(FieldModel.prototype, "fieldtype", {
            get: function () {
                return this.get('fieldtype').trim();
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(FieldModel.prototype, "placeholder", {
            get: function () {
                return this.get('placeholder').trim();
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(FieldModel.prototype, "required", {
            get: function () {
                return this.get('required');
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(FieldModel.prototype, "pattern", {
            get: function () {
                return this.get('pattern').trim();
            },
            enumerable: true,
            configurable: true
        });
        FieldModel.prototype.setTypeEvaluation = function () {
            var fieldType = this.fieldtype.replace(' ', '');
            this.set('is' + fieldType, true);
        };
        return FieldModel;
    }(Backbone_1.Model));
    exports.FieldModel = FieldModel;
});
