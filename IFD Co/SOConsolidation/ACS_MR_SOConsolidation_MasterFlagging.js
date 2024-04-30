/**
 * @NApiVersion 2.0
 * @NScriptType MapReduceScript
 * @NModuleScope SameAccount
 */
define([
    'N/search',
    'N/record',
    'N/runtime',
    'N/log',
    './lib/ConsolidationProcessScheduler',
    './lib/SOMasterFlagging.Library',
    './lib/MapReduce.LogHelper',
    './thirdparty/underscore'
], function ACSMRSOConsolidationMasterFlagging(
    nSearch,
    nRecord,
    nRuntime,
    nLog,
    ConsolidationProcessScheduler,
    SOMasterFlagging,
    mrHelper,
    _
) {
    return {
        getInputData: function getInputData() {
            return {
                type: 'search',
                id: nRuntime.getCurrentScript().getParameter({ name: 'custscript_acs_soc_mf_otp' })
            };
        },
        /**
            Map receives all SOs that haven't been classified, and groups them by getSOKey
            (recordType + entity + shipdate + ponumber)
            to process all new SO's of that combination together in reduce
         */
        map: function map(mapContext) {
            var value = SOMasterFlagging.normalizeSOData(JSON.parse(mapContext.value));
            var key = SOMasterFlagging.getSOKey(value);
            mapContext.write(key, JSON.stringify(value));
        },
        /**
         * Reduce receives all the SOs to process grouped by same entity+shipdate+ponumber
         * And searches for the master. If it doesn't find them, sets the first as master
         * And flags all orders as processed
         */
        reduce: function reduce(reduceContext) {
            var newSalesOrdersToProcess = _.map(reduceContext.values, JSON.parse);
            log.audit('Processing Orders', JSON.stringify(_.pluck(newSalesOrdersToProcess, 'id')));
            SOMasterFlagging.setMasterForSOs(
                nRuntime.getCurrentScript().getParameter({ name: 'custscript_acs_soc_master_ss' }),
                newSalesOrdersToProcess
            );
        },
        summarize: function summarize(summarizeContext) {
            mrHelper.logSummarize(summarizeContext);
            try {
                ConsolidationProcessScheduler.checkAndSchedule();
            } catch (e) {
                nLog.error('error on scheduler', e);
            }
        }
    };
});
