/// <amd-module name="SuiteCommerce.AdvancedSignUp.Instrumentation"/>
define("SuiteCommerce.AdvancedSignUp.Instrumentation", ["require", "exports", "underscore", "SuiteCommerce.AdvancedSignUp.Instrumentation.Logger", "SuiteCommerce.AdvancedSignUp.Instrumentation.Log"], function (require, exports, _, Instrumentation_Logger_1, Instrumentation_Log_1) {
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
            var defaultParameters = _.clone(Instrumentation_Logger_1.Logger.options.defaultParameters);
            var log = new Instrumentation_Log_1.Log({ label: label, parametersToSubmit: defaultParameters });
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
