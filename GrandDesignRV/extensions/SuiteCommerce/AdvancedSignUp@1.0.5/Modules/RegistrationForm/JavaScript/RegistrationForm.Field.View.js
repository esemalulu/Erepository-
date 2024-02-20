/// <amd-module name="SuiteCommerce.AdvancedSignUp.RegistrationForm.Field.View"/>
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
define("SuiteCommerce.AdvancedSignUp.RegistrationForm.Field.View", ["require", "exports", "Backbone", "SuiteCommerce.AdvancedSignUp.RegistrationForm.Configuration", "sc_advancedsignup_registrationform_field.tpl", "SuiteCommerce.AdvancedSignUp.RegistrationForm.Model", "SuiteCommerce.AdvancedSignUp.Utils", "underscore"], function (require, exports, Backbone_1, RegistrationForm_Configuration_1, fieldTemplate, RegistrationForm_Model_1, Utils_1, _) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    var FileTypes = [
        'image/png',
        'image/jpeg',
        'application/pdf'
    ];
    var FieldView = /** @class */ (function (_super) {
        __extends(FieldView, _super);
        function FieldView(options) {
            var _this = _super.call(this, options) || this;
            _this.template = fieldTemplate;
            _this.events = {
                'blur input': 'blurEvent',
                'change input[type="file"]': 'manageFile',
                'click *[id^=\'advancedsignup-registrationform-field-clear-\']': 'emptyFile',
            };
            _this.model = options.model;
            _this.parentModel = options.parentModel;
            return _this;
        }
        FieldView.prototype.blurEvent = function (event) {
            var field = this.model.internalid;
            if (this.model.fieldtype !== RegistrationForm_Model_1.FieldTypes.File) {
                this.parentModel.set(field, event.target.value);
                this.parentModel.isValid(field);
            }
        };
        FieldView.prototype.manageFile = function (event) {
            var _this = this;
            if (event.target && event.target.files && event.target.files[0]) {
                this.deleteError(event.target.name);
                var reader_1 = new FileReader();
                reader_1.readAsDataURL(event.target.files[0]);
                reader_1.onload = function () {
                    var acceptedExtension = _this.isExtensionAccepted(event.target.files[0].type);
                    if (acceptedExtension && event.target.files[0].size < 10 * 1000 * 1000) {
                        _this.parentModel.set(event.target.name, reader_1.result);
                        _this.parentModel.isValid(event.target.name);
                    }
                    else if (!acceptedExtension) {
                        _this.emptyFile(event);
                        _this.displayError(event.target.name, 'There was a problem with your file.');
                    }
                    else {
                        _this.emptyFile(event);
                        _this.displayError(event.target.name, RegistrationForm_Configuration_1.RegistrationFormConfiguration.fileTooLarge);
                    }
                };
            }
            else {
                this.emptyFile(event);
            }
        };
        FieldView.prototype.emptyFile = function (event) {
            if (event.target && event.target.name) {
                this.parentModel.set(event.target.name, '');
            }
            else if (event.currentTarget && event.currentTarget.name) {
                this.parentModel.set(event.currentTarget.name, '');
                $("#advancedsignup-registrationform-field-" + event.currentTarget.name).val('');
            }
        };
        FieldView.prototype.displayError = function (field, message) {
            $("[data-input='" + field + "']").append("<p class=\"advancedsignup-registrationform-message-error\">" + message + "</p>");
        };
        FieldView.prototype.deleteError = function (field) {
            $("[data-input='" + field + "'] p.advancedsignup-registrationform-message-error").remove();
        };
        FieldView.prototype.isExtensionAccepted = function (format) {
            return FileTypes.indexOf(format) !== -1;
        };
        FieldView.prototype.setCountriesOptions = function () {
            var siteCountries = Utils_1.Utils.getCountries();
            var formCountries = RegistrationForm_Configuration_1.RegistrationFormConfiguration.country;
            var countryOptions = '';
            if (formCountries.length > 0) {
                formCountries.forEach(function (formCountry) {
                    var foundCountry = _.find(siteCountries, function (country) {
                        return formCountry === country.name;
                    });
                    if (foundCountry) {
                        countryOptions += "<option value=\"" + foundCountry.code + "\">" + foundCountry.name + "</option>";
                    }
                });
            }
            this.model.set('countryOptions', countryOptions);
        };
        FieldView.prototype.setStatesOptions = function () {
            var siteCountries = Utils_1.Utils.getCountries();
            var selectedCountry = $('select[type="country"]').val() || RegistrationForm_Configuration_1.RegistrationFormConfiguration.country[0];
            var stateOptions = '';
            var foundCountry = _.find(siteCountries, function (country) {
                return selectedCountry === country.code || selectedCountry === country.name;
            });
            if (foundCountry && foundCountry.states && foundCountry.states.length > 0) {
                foundCountry.states.forEach(function (state) {
                    stateOptions += "<option value=\"" + state.code + "\">" + state.name + "</option>";
                });
            }
            this.model.set('stateOptions', stateOptions);
        };
        FieldView.prototype.getContext = function () {
            this.model.setTypeEvaluation();
            if (this.model.fieldtype === RegistrationForm_Model_1.FieldTypes.Country) {
                this.setCountriesOptions();
            }
            if (this.model.fieldtype === RegistrationForm_Model_1.FieldTypes.State) {
                this.setStatesOptions();
            }
            return this.model;
        };
        return FieldView;
    }(Backbone_1.View));
    exports.FieldView = FieldView;
});
