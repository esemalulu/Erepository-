/**
 *@NApiVersion 2.1
 *@NScriptType ScheduledScript
 */
define(["N/runtime", "N/record"], function (runtime, record) {

    function execute(context) {
        try {
            try {
                // Get created from parameter
                var salesOrdes = runtime.getCurrentScript().getParameter({
                    name: 'custscript_sdb_sales_orders',
                });
                if (!salesOrdes) return;
                salesOrdes=JSON.parse(salesOrdes)
                log.debug("salesOrdes", salesOrdes.length);
                for (var x = 0; x < salesOrdes.length; x++) {
                    var objRecord = record.load({
                        type: record.Type.SALES_ORDER,
                        id: salesOrdes[x],
                    });
                    var status=objRecord.getValue('orderstatus');
                    log.debug('sales order status', status);
                    var recordId = objRecord.save({
                        ignoreMandatoryFields: true
                    });
                    log.debug('sales order saved', recordId);
                }
            } catch (error) {
                log.error('processSos', error)
            }
        } catch (error) {
            log.error("ERROR", error);
        }
    }

    return {
        execute: execute
    }
});
