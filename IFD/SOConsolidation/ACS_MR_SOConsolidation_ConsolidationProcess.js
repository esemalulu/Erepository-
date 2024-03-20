/**
 * @NApiVersion 2.0
 * @NScriptType MapReduceScript
 * @NModuleScope SameAccount
 */
define([
    'N/runtime',
    'N/log',
    'N/search',
    './lib/ConsolidationProcessScheduler',
    './lib/SOConsolidation.Library',
    './lib/MapReduce.LogHelper',
    './lib/Utils',
    './thirdparty/underscore'
], function ACSMRSOConsolidationProcess(
    nRuntime,
    nLog,
    nSearch,
    ConsolidationScheduler,
    Library,
    mrHelper,
    Utils,
    _
) {
    'use strict';

    function flagConsolidation(status) {
        var scheduledInstance = nRuntime.getCurrentScript().getParameter({ name: 'custscript_acs_soc_scid' });
        log.debug('Consolidation Flag', scheduledInstance);
        try {
            if (scheduledInstance) {
                ConsolidationScheduler.flag(scheduledInstance, status);
            }
        } catch (e) {
            nLog.error('error flaging consolidation run', e);
        }
    }
    return {
        getInputData: function getInputData() {
            var search;
            var newFilters;
            var dateFilter = Utils.getRangeFilter();
            log.audit('BEGIN Consolidation process', new Date().toString());
            flagConsolidation('IN_PROGRESS');
            search = nSearch.load({
                type: nSearch.Type.TRANSACTION,
                id: nRuntime.getCurrentScript().getParameter({ name: 'custscript_acs_soc_consolidations' })
            });
            newFilters = search.filterExpression.concat(['AND', dateFilter]);
            search.filterExpression = newFilters;
            log.debug('Filters to search:', JSON.stringify(newFilters));
            return search;
        },
        reduce: function reduce(reduceContext) {
            var values = _.map(reduceContext.values, JSON.parse);
            var value = values[0]; // shouldn't be ever more than 1 value since it's the result of search;
            var consolidationKeys = {
                entity: value.values['GROUP(entity)'].value,
                shipdate: value.values['GROUP(shipdate)'],
                otherrefnum: Utils.normalizeOtherRefNum(value.values['GROUP(formulatext)'])
            };
            log.debug('Consolidation to process', JSON.stringify(consolidationKeys));

            Library.consolidate(
                nRuntime.getCurrentScript().getParameter({ name: 'custscript_acs_soc_lines_ss' }),
                consolidationKeys
            );
        },
        summarize: function summarize(summarizeContext) {
            log.audit('END Consolidation process', new Date().toString());
            flagConsolidation('FINISHED');
            mrHelper.logSummarize(summarizeContext);
        }
    };
});
