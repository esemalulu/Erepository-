/// <amd-module name="SuiteCommerce.CustomFields.PDP.Configuration"/>
define("SuiteCommerce.CustomFields.PDP.Configuration", ["require", "exports", "underscore"], function (require, exports, _) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    var environment = null;
    var DataMarkupTypes;
    (function (DataMarkupTypes) {
        DataMarkupTypes["JsonLd"] = "JSON-LD";
    })(DataMarkupTypes = exports.DataMarkupTypes || (exports.DataMarkupTypes = {}));
    var Configuration = /** @class */ (function () {
        function Configuration() {
        }
        Configuration.setEnvironment = function (environmentComponent) {
            environment = environmentComponent;
        };
        Configuration.getFieldsFromConfiguration = function () {
            var _this = this;
            var fieldsArray = [];
            var fieldsArrayUnparsed = Configuration.get('customFields.pdp.fields', []);
            fieldsArrayUnparsed.forEach(function (unparsedField) {
                fieldsArray.push({
                    nameInConfiguration: unparsedField.fieldid,
                    fieldText: unparsedField.fieldid,
                    fieldsToParse: [],
                    schema: unparsedField.schema,
                    show: unparsedField.show,
                    hideFromQuickView: unparsedField.hideFromQuickView,
                    parsedText: '',
                    visible: false,
                });
            });
            fieldsArray.forEach(function (fieldObject) {
                var fieldsToParse = _this.parseField(fieldObject.fieldText);
                fieldObject.fieldsToParse = fieldsToParse;
            });
            return fieldsArray;
        };
        Configuration.get = function (key, defaultValue) {
            if (environment) {
                var configValue = environment.getConfig(key);
                if (_.isUndefined(configValue) && !_.isUndefined(defaultValue)) {
                    return defaultValue;
                }
                return configValue;
            }
            console.error('Please set the Environment Component in the Configuration.');
            return null;
        };
        Configuration.parseField = function (fieldText) {
            var regexForParse = /\[\[(.+?)\]\]/g;
            var matches = fieldText.match(regexForParse);
            matches = matches ? matches : [];
            matches = matches.map(function (field) {
                return field.replace(']]', '').replace('[[', '');
            });
            return matches;
        };
        Object.defineProperty(Configuration, "structuredDataMarkupType", {
            get: function () {
                return this.get('structureddatamarkup.type');
            },
            enumerable: true,
            configurable: true
        });
        return Configuration;
    }());
    exports.Configuration = Configuration;
});
