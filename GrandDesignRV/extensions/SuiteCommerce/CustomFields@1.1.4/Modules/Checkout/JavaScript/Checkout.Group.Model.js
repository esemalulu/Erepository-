/// <amd-module name="SuiteCommerce.CustomFields.Checkout.Group.Model"/>
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
define("SuiteCommerce.CustomFields.Checkout.Group.Model", ["require", "exports", "Backbone", "SuiteCommerce.CustomFields.Checkout.Configuration", "SuiteCommerce.CustomFields.Checkout.Helper"], function (require, exports, Backbone_1, Checkout_Configuration_1, Checkout_Helper_1) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    var GroupModel = /** @class */ (function (_super) {
        __extends(GroupModel, _super);
        function GroupModel() {
            var _this = _super !== null && _super.apply(this, arguments) || this;
            _this.url = Checkout_Helper_1.Helper.getServiceUrl();
            return _this;
            /*
            initialize() {
              this.setupValidation();
            }
          
            setupValidation() {
              this.validation = {};
              this.fields.each((field: FieldModel) => {
                if (field.mandatory) {
                  this.setupValidationRequired(field);
                }
              });
            }
          
            setupValidationRequired(field: FieldModel) {
              const fieldId = field.fieldId;
              const label = field.label;
              this.validation[fieldId] = {
                required: true,
                msg: Configuration.getRequiredError(label),
              };
            }*/
        }
        Object.defineProperty(GroupModel.prototype, "module", {
            get: function () {
                return this.get('module');
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(GroupModel.prototype, "position", {
            get: function () {
                return this.get('position');
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(GroupModel.prototype, "fields", {
            get: function () {
                return this.get('fields');
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(GroupModel.prototype, "validation", {
            get: function () {
                var validation = {};
                this.fields.each(function (field) {
                    if (field.mandatory) {
                        var fieldId = field.fieldId;
                        var label = field.label;
                        validation[fieldId] = {
                            required: true,
                            msg: Checkout_Configuration_1.Configuration.getRequiredError(label),
                        };
                    }
                });
                return validation;
            },
            enumerable: true,
            configurable: true
        });
        return GroupModel;
    }(Backbone_1.Model));
    exports.GroupModel = GroupModel;
});
