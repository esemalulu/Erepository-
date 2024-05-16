/**
 * @NApiVersion 2.1
 * @NScriptType WorkflowActionScript
 */
define(['N/record', 'N/error', 'N/ui/message', 'N/runtime', 'N/search', 'N/task'], function (record, error, message, runtime, search, task) {
    function onAction(context) {

        try {
            var newRecord = context.newRecord;
            log.debug('newRecord.type ', newRecord.type);
            var numLines = 0;
          var sublistId="item";
            if (newRecord.type == "itemreceipt") numLines = newRecord.getLineCount({ sublistId: 'item' });
            if (newRecord.type == "inventoryadjustment"){
            numLines = newRecord.getLineCount({ sublistId: 'inventory' });
              sublistId="inventory";
            }
          
            log.debug('numLines', numLines);
            var arrItems = [];
            for (var x = 0; x < numLines; x++) {
                var item = newRecord.getSublistValue({
                    sublistId: sublistId,
                    fieldId: 'item',
                    line: x,
                })
                arrItems.push(item);
            }
            var soIds = []
            log.debug("arrItems", arrItems);
            if (arrItems.length) soIds = getSalesOrders(arrItems);
            var scriptObj = runtime.getCurrentScript();
            log.debug('Remaining governance units: ' + scriptObj.getRemainingUsage());
        } catch (e) {
            log.error('onAction: ', e)
        }
    }

    function getSalesOrders(arrIds) {
        try {
            var salesorderSearchObj = search.create({
                type: "salesorder",
                filters:
                    [
                        ["type", "anyof", "SalesOrd"],
                        "AND",
                        ["item", "anyof", arrIds],
                        "AND",
                        ["status", "anyof", "SalesOrd:B"],
                        //"AND",
                        // ["mainline", "is", "T"]
                    ],
                columns:
                    []
            });
            var searchResultCount = salesorderSearchObj.runPaged().count;
            log.debug("salesorderSearchObj result count", searchResultCount);
            var arrSoIds = [];
            salesorderSearchObj.run().each(function (result) {
                arrSoIds.push(result.id)
                return true;
            });
            var uniqueSos = arrSoIds.filter(onlyUnique);
            log.debug("arrSOs length", uniqueSos.length);
            if (uniqueSos.length) uniqueSos.length <= 30 ? processSos(uniqueSos) : executeScheduled(uniqueSos);
            //if (uniqueSos.length) uniqueSos.length <= 25 ? processSos(uniqueSos) : return
            //if (uniqueSos.length && uniqueSos.length <= 25) processSos(uniqueSos);
        } catch (error) {
            log.error("Error getSalesOrders: ", error)
        }
    }

    function processSos(arrSo) {
        try {
            log.debug("arrSo", arrSo);
            for (var x = 0; x < arrSo.length; x++) {
                var objRecord = record.load({
                    type: record.Type.SALES_ORDER,
                    id: arrSo[x],
                });
                var recordId = objRecord.save({
                    ignoreMandatoryFields: true
                });
                log.debug('sales order saved', recordId);
            }
        } catch (error) {
            log.error('processSos', error)
        }
    }

    function executeScheduled(arr) {
        try {
            var scriptTask = task.create({ taskType: task.TaskType.SCHEDULED_SCRIPT });
            scriptTask.scriptId = 'customscript_sdb_process_so_receipt_sch';
            scriptTask.deploymentId = null;
            scriptTask.params = { custscript_sdb_sales_orders: JSON.stringify(arr) };
            var scriptTaskId = scriptTask.submit();
            log.debug('scriptTaskId', scriptTaskId)
        } catch (error) {
            log.error('executeScheduled', error)
        }
    }

    function onlyUnique(value, index, array) {
        return array.indexOf(value) === index;
    }

    return {
        onAction: onAction
    }
});

