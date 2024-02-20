/// <amd-module name="SuiteCommerce.CustomFields.Utils"/>
define("SuiteCommerce.CustomFields.Utils", ["require", "exports", "underscore"], function (require, exports, _) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    var CustomFieldsUtils = /** @class */ (function () {
        function CustomFieldsUtils() {
        }
        CustomFieldsUtils.compileText = function (textInput, variables) {
            var text = textInput || '';
            _(variables || {}).each(function (value, name) {
                var regex = new RegExp("{{" + name + "}}", 'g');
                text = text.replace(regex, value);
            });
            return text;
        };
        return CustomFieldsUtils;
    }());
    exports.CustomFieldsUtils = CustomFieldsUtils;
});
