/**
* @NApiVersion 2.1
* @NScriptType WorkflowActionScript
*/
define(["N/record", "N/runtime", "N/https", "N/log", "N/search", 'N/error', "N/runtime"], function (record, runtime, https, log, search, error, runtime) {
    function ngAction(context) {
        var rec = context.newRecord;
        if (rec.type == "itemreceipt") {
            try {
                var po = null;
                var id = rec.getValue("createdfrom"), lineCount = 0;
                var poItemCost = {};
                search.create({
                    type: "transaction",
                    filters: ["internalid", "is", id]
                }).run().each(function (res) {
                    po = record.load({ type: res.recordType, id: res.id })
                    return false;
                })
                if (!po) return;
                lineCount = po.getLineCount({ sublistId: 'item' });
                for (var i = 0; i < lineCount; i++) {
                    //Item Cost Functionality
                    var itemId = po.getSublistValue({
                        sublistId: 'item',
                        fieldId: 'item',
                        line: i
                    });
                    var itemCost = po.getSublistValue({
                        sublistId: 'item',
                        fieldId: 'rate',
                        line: i
                    });
                    poItemCost[itemId] = itemCost;

                    //PO Qty Functionality
                    var orderQty = 0, receivedQty = 0;
                    orderQty = po.getSublistValue({
                        sublistId: 'item',
                        fieldId: 'quantity',
                        line: i
                    });
                    receivedQty = po.getSublistValue({
                        sublistId: 'item',
                        fieldId: 'quantityreceived',
                        line: i
                    });
                    var openQTY;
                    if (orderQty != undefined && receivedQty != undefined) {
                        openQTY = Number(orderQty) - Number(receivedQty);
                        po.setSublistValue({ sublistId: 'item', fieldId: 'custcol_sdb_open_qty_difference', value: openQTY, line: i });
                    }
                    log.debug("Data: ", { id, orderQty, receivedQty, openQTY });
                }
                po.save({
                    ignoreMandatoryFields: true
                });

                // log.debug("COST DATA: ", { poItemCost, context: context.type });
                // if (context.type != 'create') return;
                // if (!poItemCost) return;
                // var countItems = rec.getLineCount("item");
                // log.debug("countItems", countItems);
                // for (var x = 0; x < countItems; x++) {
                //     var item = rec.getSublistValue({
                //         sublistId: 'item',
                //         fieldId: 'item',
                //         line: x
                //     });
                //     var POItemCost = poItemCost[item]
                //     if (POItemCost) {
                //         rec.selectLine({
                //             sublistId: 'item',
                //             line: x
                //         });
                //         rec.setCurrentSublistValue({
                //             sublistId: "item",
                //             fieldId: "rate",
                //             value: parseFloat(POItemCost)
                //         });
                //         rec.commitLine("item");
                //     }
                // }
            } catch (e) {
                log.error({
                    title: e.name,
                    details: e.message
                });
            }
        }
    }
    return {
        onAction: ngAction
    }

});
