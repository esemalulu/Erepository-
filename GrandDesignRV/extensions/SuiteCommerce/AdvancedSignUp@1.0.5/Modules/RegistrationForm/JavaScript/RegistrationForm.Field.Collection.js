/// <amd-module name="SuiteCommerce.AdvancedSignUp.RegistrationForm.Field.Collection"/>
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
define("SuiteCommerce.AdvancedSignUp.RegistrationForm.Field.Collection", ["require", "exports", "SuiteCommerce.AdvancedSignUp.RegistrationForm.Field.Model", "Backbone"], function (require, exports, RegistrationForm_Field_Model_1, Backbone_1) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    var FieldCollection = /** @class */ (function (_super) {
        __extends(FieldCollection, _super);
        function FieldCollection() {
            return _super !== null && _super.apply(this, arguments) || this;
        }
        Object.defineProperty(FieldCollection.prototype, "model", {
            get: function () {
                return RegistrationForm_Field_Model_1.FieldModel;
            },
            enumerable: true,
            configurable: true
        });
        return FieldCollection;
    }(Backbone_1.Collection));
    exports.FieldCollection = FieldCollection;
});
