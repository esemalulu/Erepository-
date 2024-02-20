/// <amd-module name="SuiteCommerce.AdvancedSignUp.RegistrationForm.Model"/>
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
define("SuiteCommerce.AdvancedSignUp.RegistrationForm.Model", ["require", "exports", "Backbone", "SuiteCommerce.AdvancedSignUp.RegistrationForm.Configuration"], function (require, exports, Backbone_1, RegistrationForm_Configuration_1) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    var FieldTypes;
    (function (FieldTypes) {
        FieldTypes["Heading"] = "Heading";
        FieldTypes["Checkbox"] = "Checkbox";
        FieldTypes["Date"] = "Date";
        FieldTypes["TextInput"] = "Text Input";
        FieldTypes["Country"] = "Country";
        FieldTypes["State"] = "State";
        FieldTypes["Email"] = "Email Address";
        FieldTypes["Telephone"] = "Telephone";
        FieldTypes["ZIP"] = "ZIP";
        FieldTypes["TextArea"] = "Text Area";
        FieldTypes["Number"] = "Number";
        FieldTypes["File"] = "File Upload";
    })(FieldTypes = exports.FieldTypes || (exports.FieldTypes = {}));
    var RegistrationFormModel = /** @class */ (function (_super) {
        __extends(RegistrationFormModel, _super);
        function RegistrationFormModel() {
            var _this = _super !== null && _super.apply(this, arguments) || this;
            _this.url = '/app/site/hosting/scriptlet.nl?script=customscript_ns_sc_ext_sl_advancedsignup&deploy=customdeploy_ns_sc_ext_sl_advancedsignup';
            _this.validations = {};
            return _this;
        }
        RegistrationFormModel.prototype.setUpModel = function () {
            var _this = this;
            RegistrationForm_Configuration_1.RegistrationFormConfiguration.formFields.forEach(function (field) {
                if (field.internalid) {
                    _this.set(field.internalid, '');
                    _this.setUpValidations(field);
                }
            });
        };
        RegistrationFormModel.prototype.setUpValidations = function (field) {
            this.validations[field.internalid] = [{
                    required: field.required,
                    msg: RegistrationForm_Configuration_1.RegistrationFormConfiguration.requiredFieldWarning.replace('[[field]]', field.label)
                }];
            if (field.pattern) {
                this.validations[field.internalid].push({
                    pattern: field.pattern,
                    msg: field.fielderrormessage
                });
            }
            else if (field.fieldtype === FieldTypes.Email) {
                this.validations[field.internalid].push({
                    pattern: 'email',
                    msg: field.fielderrormessage
                });
            }
            else if (field.fieldtype === FieldTypes.Telephone) {
                this.validations[field.internalid].push({
                    minLength: 7,
                    msg: field.fielderrormessage
                });
            }
        };
        Object.defineProperty(RegistrationFormModel.prototype, "domain", {
            set: function (domain) {
                this.set('domain', domain);
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(RegistrationFormModel.prototype, "subsidiary", {
            set: function (subsidiary) {
                this.set('subsidiary', subsidiary);
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(RegistrationFormModel.prototype, "validation", {
            get: function () {
                return this.validations;
            },
            enumerable: true,
            configurable: true
        });
        return RegistrationFormModel;
    }(Backbone_1.Model));
    exports.RegistrationFormModel = RegistrationFormModel;
});
