/// <amd-module name="SuiteCommerce.AdvancedSignUp.RegistrationForm.Configuration"/>
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
define("SuiteCommerce.AdvancedSignUp.RegistrationForm.Configuration", ["require", "exports", "SuiteCommerce.AdvancedSignUp.Common.Configuration"], function (require, exports, Configuration_1) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    var RegistrationFormConfiguration = /** @class */ (function (_super) {
        __extends(RegistrationFormConfiguration, _super);
        function RegistrationFormConfiguration() {
            return _super !== null && _super.apply(this, arguments) || this;
        }
        Object.defineProperty(RegistrationFormConfiguration, "urlPath", {
            get: function () {
                return this.get('advancedsignup.general.urlpath');
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(RegistrationFormConfiguration, "formFields", {
            get: function () {
                var fields = this.get('advancedsignup.form.fields');
                fields = fields ? fields : [];
                if (fields.length > 0) {
                    fields = fields.map(function (field) {
                        field.internalid = field.internalid.trim();
                        return field;
                    });
                }
                return fields;
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(RegistrationFormConfiguration, "formHeader", {
            get: function () {
                return this.get('advancedsignup.message.formheader');
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(RegistrationFormConfiguration, "formTitle", {
            get: function () {
                return this.get('advancedsignup.message.formtitle');
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(RegistrationFormConfiguration, "formSubTitle", {
            get: function () {
                return this.get('advancedsignup.message.formsubtitle');
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(RegistrationFormConfiguration, "submitButtonLabel", {
            get: function () {
                return this.get('advancedsignup.message.submitbuttonlabel');
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(RegistrationFormConfiguration, "confirmationTitle", {
            get: function () {
                return this.get('advancedsignup.message.confirmationtitle');
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(RegistrationFormConfiguration, "confirmationMessage", {
            get: function () {
                return this.get('advancedsignup.message.confirmationmessage');
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(RegistrationFormConfiguration, "requiredFieldWarning", {
            get: function () {
                return this.get('advancedsignup.message.requiredfieldwarning');
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(RegistrationFormConfiguration, "submitError", {
            get: function () {
                return this.get('advancedsignup.message.submiterror');
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(RegistrationFormConfiguration, "fileTooLarge", {
            get: function () {
                return this.get('advancedsignup.message.filetoolarge');
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(RegistrationFormConfiguration, "country", {
            get: function () {
                return this.get('advancedsignup.form.country');
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(RegistrationFormConfiguration, "marketingSubscription", {
            get: function () {
                return this.get('advancedsignup.form.marketingsubscription');
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(RegistrationFormConfiguration, "marketingSubscriptionLabel", {
            get: function () {
                return this.get('advancedsignup.form.marketingsubscriptionlabel') || 'Yes, Please sign me up for exclusive offers and promotions';
            },
            enumerable: true,
            configurable: true
        });
        return RegistrationFormConfiguration;
    }(Configuration_1.Configuration));
    exports.RegistrationFormConfiguration = RegistrationFormConfiguration;
});
