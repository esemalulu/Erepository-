/// <amd-module name="SuiteCommerce.CustomFields.Instrumentation"/>
define("SuiteCommerce.CustomFields.Instrumentation", ["require", "exports", "underscore", "SuiteCommerce.CustomFields.Instrumentation.Logger", "SuiteCommerce.CustomFields.Instrumentation.Log"], function (require, exports, _, Instrumentation_Logger_1, Instrumentation_Log_1) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    var logs = [];
    exports.default = {
        initialize: function (options) {
            Instrumentation_Logger_1.Logger.options = options;
        },
        getLog: function (logLabel) {
            return this.getLogModelByLabel(logLabel) || this.registerNewLog(logLabel);
        },
        getLogModelByLabel: function (label) {
            return _(logs).findWhere({ label: label });
        },
        registerNewLog: function (label) {
            var log = new Instrumentation_Log_1.Log({ label: label });
            logs.push(log);
            return log;
        },
        setParameterForAllLogs: function (parameter, value) {
            logs.forEach(function (log) {
                log.setParameter(parameter, value);
            });
        },
        setParametersForAllLogs: function (data) {
            logs.forEach(function (log) {
                log.setParameters(data);
            });
        },
        submitLogs: function () {
            logs.forEach(function (log) {
                log.submit();
            });
        },
    };
});
