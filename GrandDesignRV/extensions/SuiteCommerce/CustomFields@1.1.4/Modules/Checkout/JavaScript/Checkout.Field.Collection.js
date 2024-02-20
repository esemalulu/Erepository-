/// <amd-module name="SuiteCommerce.CustomFields.Checkout.Field.Collection"/>
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
define("SuiteCommerce.CustomFields.Checkout.Field.Collection", ["require", "exports", "SuiteCommerce.CustomFields.Checkout.Field.Model", "Backbone"], function (require, exports, Checkout_Field_Model_1, Backbone_1) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    var FieldCollection = /** @class */ (function (_super) {
        __extends(FieldCollection, _super);
        function FieldCollection() {
            return _super !== null && _super.apply(this, arguments) || this;
        }
        Object.defineProperty(FieldCollection.prototype, "model", {
            get: function () {
                return Checkout_Field_Model_1.FieldModel;
            },
            enumerable: true,
            configurable: true
        });
        FieldCollection.prototype.getGroupedFields = function () {
            var groups = {};
            this.models.sort(this.sortingFunction);
            this.each(function (fieldModel) {
                var module = fieldModel.module;
                var position = fieldModel.position;
                if (fieldModel.isValidLocation()) {
                    if (!(module in groups)) {
                        groups[module] = {};
                    }
                    if (!(position in groups[module])) {
                        groups[module][position] = new FieldCollection();
                    }
                    groups[module][position].add(fieldModel);
                }
            });
            return groups;
        };
        FieldCollection.prototype.sortingFunction = function (val1, val2) {
            var pos1 = val1.attributes.position;
            var pos2 = val2.attributes.position;
            if (pos1 === pos2) {
                return 0;
            }
            return pos1 > pos2 ? 1 : -1;
        };
        return FieldCollection;
    }(Backbone_1.Collection));
    exports.FieldCollection = FieldCollection;
});
