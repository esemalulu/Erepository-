/// <amd-module name="SuiteCommerce.AdvancedSignUp.Instrumentation.Log"/>
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
define("SuiteCommerce.AdvancedSignUp.Instrumentation.Log", ["require", "exports", "SuiteCommerce.AdvancedSignUp.Instrumentation.Logger"], function (require, exports, Instrumentation_Logger_1) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    var LogSeverity;
    (function (LogSeverity) {
        LogSeverity["INFO"] = "info";
        LogSeverity["ERROR"] = "error";
    })(LogSeverity = exports.LogSeverity || (exports.LogSeverity = {}));
    var Log = /** @class */ (function () {
        function Log(attributes) {
            if (attributes === void 0) { attributes = { label: '' }; }
            this.setInitialAttributes(attributes);
        }
        Log.prototype.setInitialAttributes = function (attributes) {
            var defaultAttributes = {
                label: null,
                timer: {},
                severity: LogSeverity.INFO,
            };
            var _a = __assign(__assign({}, defaultAttributes), attributes), label = _a.label, parametersToSubmit = _a.parametersToSubmit, timer = _a.timer, severity = _a.severity;
            this.label = label;
            this.parametersToSubmit = parametersToSubmit;
            this.timer = timer;
            this.severity = severity;
        };
        Log.prototype.startTimer = function () {
            this.timer.startTime = this.getTimestamp();
        };
        Log.prototype.endTimer = function () {
            this.timer.endTime = this.getTimestamp();
        };
        Log.prototype.getTimestamp = function () {
            if (!this.isOldInternetExplorer()) {
                return performance.now() || Date.now();
            }
            return Date.now();
        };
        Log.prototype.getElapsedTimeForTimer = function () {
            var timer = this.timer;
            if (timer.startTime && timer.endTime) {
                if (timer.startTime > timer.endTime) {
                    console.warn('Start time should be minor that end time in timer');
                    return null;
                }
                return timer.endTime - timer.startTime;
            }
            if (!timer.startTime)
                console.warn('The Start time is not defined');
            if (!timer.endTime)
                console.warn('The End time is not defined');
            return null;
        };
        Log.prototype.setParameters = function (data) {
            var _this = this;
            Object.keys(data).forEach(function (parameter) {
                _this.setParameter(parameter, data[parameter]);
            });
        };
        Log.prototype.setParameter = function (parameter, value) {
            var logData = this.parametersToSubmit;
            logData[parameter] = value;
            this.parametersToSubmit = logData;
        };
        Log.prototype.submit = function () {
            if (!this.isOldInternetExplorer()) {
                switch (this.severity) {
                    case LogSeverity.ERROR:
                        this.submitAsError();
                        break;
                    case LogSeverity.INFO:
                    default:
                        this.submitAsInfo();
                }
            }
        };
        Log.prototype.isOldInternetExplorer = function () {
            return !!navigator.userAgent.match(/Trident/g) || !!navigator.userAgent.match(/MSIE/g);
        };
        Log.prototype.submitAsError = function () {
            Instrumentation_Logger_1.Logger.getLogger().error(this.parametersToSubmit);
        };
        Log.prototype.submitAsInfo = function () {
            Instrumentation_Logger_1.Logger.getLogger().info(this.parametersToSubmit);
        };
        return Log;
    }());
    exports.Log = Log;
});
