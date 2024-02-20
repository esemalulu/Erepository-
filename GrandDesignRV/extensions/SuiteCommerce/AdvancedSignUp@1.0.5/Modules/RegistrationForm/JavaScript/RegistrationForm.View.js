/// <amd-module name="SuiteCommerce.AdvancedSignUp.RegistrationForm.View"/>
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
define("SuiteCommerce.AdvancedSignUp.RegistrationForm.View", ["require", "exports", "Backbone", "sc_advancedsignup_registrationform.tpl", "SuiteCommerce.AdvancedSignUp.RegistrationForm.Configuration", "SuiteCommerce.AdvancedSignUp.RegistrationForm.Field.Collection", "Backbone.CollectionView", "SuiteCommerce.AdvancedSignUp.RegistrationForm.Model", "SuiteCommerce.AdvancedSignUp.RegistrationForm.Field.View", "underscore", "SuiteCommerce.AdvancedSignUp.Utils", "SuiteCommerce.AdvancedSignUp.Instrumentation"], function (require, exports, Backbone_1, registrationFormTemplate, RegistrationForm_Configuration_1, RegistrationForm_Field_Collection_1, BackboneCollectionView, RegistrationForm_Model_1, RegistrationForm_Field_View_1, _, Utils_1, Instrumentation_1) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    var RegistrationFormView = /** @class */ (function (_super) {
        __extends(RegistrationFormView, _super);
        function RegistrationFormView(options) {
            var _this = _super.call(this, options) || this;
            _this.template = registrationFormTemplate;
            _this.events = {
                'submit form': 'createCustomer',
                'change select[type="country"]': 'updateStates',
            };
            var environment = options.container.getComponent('Environment');
            _this.model = options.model || new RegistrationForm_Model_1.RegistrationFormModel({
                domain: _this.getSCDomain(environment),
                subsidiary: _this.getDefaultSubsdiary(environment)
            });
            _this.title = RegistrationForm_Configuration_1.RegistrationFormConfiguration.formHeader;
            _this.displayForm = true;
            Backbone_1.Validation.bind(_this);
            _this.model.setUpModel();
            _this.logFormLoaded();
            return _this;
        }
        Object.defineProperty(RegistrationFormView.prototype, "childViews", {
            get: function () {
                var formFields = RegistrationForm_Configuration_1.RegistrationFormConfiguration.formFields;
                if (RegistrationForm_Configuration_1.RegistrationFormConfiguration.marketingSubscription) {
                    formFields.push({ fieldtype: 'Checkbox',
                        internalid: 'globalsubscriptionstatus',
                        label: RegistrationForm_Configuration_1.RegistrationFormConfiguration.marketingSubscriptionLabel,
                        placeholder: '',
                        required: false,
                        pattern: '',
                        fielderrormessage: ''
                    });
                }
                return {
                    'RegistrationForm.Fields': {
                        Fields: {
                            childViewIndex: 10,
                            childViewConstructor: function FieldsChildView() {
                                return new BackboneCollectionView({
                                    childView: RegistrationForm_Field_View_1.FieldView,
                                    collection: new RegistrationForm_Field_Collection_1.FieldCollection(formFields),
                                    childViewOptions: { parentModel: this.model },
                                });
                            },
                        },
                    },
                };
            },
            enumerable: true,
            configurable: true
        });
        RegistrationFormView.prototype.createCustomer = function (event) {
            var _this = this;
            event.preventDefault();
            var promise = this.saveForm(event);
            if (!this.model.isValid()) {
                this.scrollToValidationErrors('[data-validation-error="block"]');
                this.enableSubmitButton();
            }
            else if (promise) {
                var formSubmit_1 = Instrumentation_1.default.getLog('formSubmit');
                formSubmit_1.startTimer();
                promise
                    .done(function (response) {
                    if (response.status === 'SUCCESS') {
                        formSubmit_1.endTimer();
                        formSubmit_1.setParameters({
                            activity: 'Time to create the customer',
                            totalTime: formSubmit_1.getElapsedTimeForTimer(),
                        });
                        formSubmit_1.submit();
                        _this.displaySuccessMessage();
                    }
                    else {
                        _this.displayErrorMessage();
                        _this.scrollToValidationErrors('.advancedsignup-registrationform-message-error');
                    }
                });
            }
        };
        RegistrationFormView.prototype.updateStates = function (event) {
            var siteCountries = Utils_1.Utils.getCountries();
            var selectedCountryCode = event.target.value;
            var foundCountry = _.find(siteCountries, function (country) {
                return selectedCountryCode === country.code;
            });
            var formViews = this.getChildViewInstance('RegistrationForm.Fields', 'Fields');
            // @ts-ignore
            formViews.childCells.forEach(function (childView) {
                if (childView.model.fieldtype === 'State') {
                    childView.render();
                }
            });
        };
        RegistrationFormView.prototype.enableSubmitButton = function () {
            this.$('.advancedsignup-registrationform-button').prop('disabled', false);
        };
        RegistrationFormView.prototype.displaySuccessMessage = function () {
            this.displayForm = false;
            this.render();
        };
        RegistrationFormView.prototype.displayErrorMessage = function () {
            var $errorMessage = this.$('[data-error-bin-message]');
            $errorMessage.addClass('advancedsignup-registrationform-message-error');
            $errorMessage.text(RegistrationForm_Configuration_1.RegistrationFormConfiguration.submitError).show();
        };
        RegistrationFormView.prototype.scrollToValidationErrors = function (selector) {
            var offset = jQuery(selector).offset();
            jQuery('html').animate({
                scrollTop: offset ? offset.top : 0,
            }, 600);
        };
        RegistrationFormView.prototype.getDefaultSubsdiary = function (environment) {
            var subsidiaries = environment.getSiteSetting().subsidiaries;
            var defaultSubsidiary = _.find(subsidiaries, function (subsidiary) {
                return subsidiary.isdefault === 'T';
            });
            return defaultSubsidiary.internalid;
        };
        RegistrationFormView.prototype.getSCDomain = function (environment) {
            var homeUrl = environment.getConfig().siteSettings.touchpoints.home;
            var match = homeUrl.match(/:\/\/((?:www[0-9]?\.)?.[^/:]+)/i);
            if (match !== null && match.length === 2 && typeof match[1] === 'string' && match[1].length > 0) {
                return match[1];
            }
            return null;
        };
        RegistrationFormView.prototype.logFormLoaded = function () {
            var logUsage = Instrumentation_1.default.getLog('formLoaded');
            logUsage.setParameters({
                activity: 'Extension form loaded',
                message: JSON.stringify(RegistrationForm_Configuration_1.RegistrationFormConfiguration.formFields)
            });
            logUsage.submit();
        };
        RegistrationFormView.prototype.getContext = function () {
            return {
                formHeader: RegistrationForm_Configuration_1.RegistrationFormConfiguration.formHeader,
                formTitle: RegistrationForm_Configuration_1.RegistrationFormConfiguration.formTitle,
                formSubTitle: RegistrationForm_Configuration_1.RegistrationFormConfiguration.formSubTitle,
                submitButtonLabel: RegistrationForm_Configuration_1.RegistrationFormConfiguration.submitButtonLabel,
                confirmationTitle: RegistrationForm_Configuration_1.RegistrationFormConfiguration.confirmationTitle,
                confirmationMessage: RegistrationForm_Configuration_1.RegistrationFormConfiguration.confirmationMessage,
                displayForm: this.displayForm,
            };
        };
        return RegistrationFormView;
    }(Backbone_1.View));
    exports.RegistrationFormView = RegistrationFormView;
});
