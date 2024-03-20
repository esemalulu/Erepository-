/**
 * @NApiVersion 2.0
 * @NScriptType SuiteLet
 */
define([
    'N/search',
    'N/log',
    './lib/ConsolidationProcessScheduler',
    './lib/Utils',
    './lib/SOMasterFlagging.Library',
    './lib/SOConsolidation.Library',
    './lib/Search.Helper'
], function ACSSLSOConsolidationOnDemand(
    nSearch,
    nLog,
    ConsolidationProcessScheduler,
    Utils,
    SOMasterFlagging,
    SOConsolidation,
    SearchHelper
) {
    function getSOToProcess(consolidationKey) {
        var salesOrders;
        var search = nSearch.load({
            id: 'customsearch_acs_soc_orders_pending_clas'
        });
        SearchHelper.prependFilters(search, SearchHelper.getConsolidationKeyFilters(consolidationKey));
        salesOrders = SearchHelper.getAll(search, function eachRow(r) {
            return SOMasterFlagging.normalizeSOData(r.toJSON());
        });
        return salesOrders;
    }

    return {
        onRequest: function onRequest(requestContext) {
            var po = requestContext.request.parameters.po || '';
            var customer = requestContext.request.parameters.customer;
            var shipdate = requestContext.request.parameters.shipdate;
            var mode = requestContext.request.parameters.mode;
            var consolidationKey = {
                entity: customer,
                shipdate: shipdate,
                otherrefnum: Utils.normalizeOtherRefNum(po)
            };
            var result;
            var salesOrdersToProcess;
            if (mode === 'BOTH' || mode === 'MASTER') {
                salesOrdersToProcess = getSOToProcess(consolidationKey);
                if (salesOrdersToProcess.length > 0) {
                    SOMasterFlagging.setMasterForSOs('customsearch_acs_soc_master_search_filt', salesOrdersToProcess);
                }
            }
            if (mode === 'BOTH' || mode === 'CONSOLIDATE') {
                result = SOConsolidation.consolidate('customsearch_acs_soc_lines_to_consolidat', consolidationKey);
                nLog.debug('RESULT', JSON.stringify(result));
            }
            if (mode === 'CHECKSCHEDULER') {
                ConsolidationProcessScheduler.checkAndSchedule();
            }
        }
    };
});
