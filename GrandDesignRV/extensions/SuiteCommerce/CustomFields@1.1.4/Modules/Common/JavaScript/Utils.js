/// <amd-module name="SuiteCommerce.CustomFields.JavaScript.Utils"/>
define("SuiteCommerce.CustomFields.JavaScript.Utils", ["require", "exports", "Utils"], function (require, exports, Utils_1) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    var Utils = /** @class */ (function () {
        function Utils() {
        }
        Utils.formatDate = function (receivedDate, dateFormat) {
            var newDate = dateFormat;
            var monthReplaced = false;
            var date = new Date(receivedDate);
            var replaceMonth = function (monthLength, format) {
                var matched = newDate.match(monthLength);
                if (matched && !monthReplaced) {
                    monthReplaced = true;
                    return newDate.replace(monthLength, date.toLocaleString('en-us', { month: format }));
                }
                return newDate;
            };
            var ua = navigator.userAgent;
            var isOldIe = ua.indexOf('MSIE ') > -1;
            if (isOldIe) {
                return receivedDate;
            }
            newDate = newDate.replace('yyyy', date.toLocaleString('en-us', { year: 'numeric' }));
            newDate = newDate.replace('yy', date.toLocaleString('en-us', { year: '2-digit' }));
            newDate = newDate.replace('dd', date.toLocaleString('en-us', { day: '2-digit' }));
            newDate = newDate.replace('d', date.toLocaleString('en-us', { day: 'numeric' }));
            newDate = replaceMonth('mmmm', 'long');
            newDate = replaceMonth('mmm', 'short');
            newDate = replaceMonth('mm', '2-digit');
            newDate = replaceMonth('m', 'numeric');
            return newDate;
        };
        // @method urlIsAbsolute @param {String} url @returns {Boolean}
        Utils.isUrlAbsolute = function (url) {
            return /^https?:\/\//.test(url);
        };
        // @method getAbsoluteUrl @param {String} file @returns {String}
        Utils.getAbsoluteUrl = function (file, isServices2) {
            return Utils_1.getAbsoluteUrl(file, isServices2);
        };
        Utils.translate = function (text) {
            var params = [];
            for (var _i = 1; _i < arguments.length; _i++) {
                params[_i - 1] = arguments[_i];
            }
            return Utils_1.translate.apply(void 0, [text].concat(params));
        };
        return Utils;
    }());
    exports.Utils = Utils;
});
