/**
 * @NApiVersion 2.1
 * @NScriptType UserEventScript
 */
define(["N/log", "N/format", "N/record", "N/search", "N/runtime"], function (log, format, record, search, runtime) {
    function beforeSubmit(context) {
        try {
            let poRecord = context.newRecord;
            var oldRecord = context.oldRecord;
            var createdfrom = poRecord.getValue('createdfrom');
          var soStatus = false;
          if(createdfrom){
           soStatus =checkPendingFulfillmentStatus(createdfrom)
            
          }
            var oldDuedate = oldRecord.getValue('duedate');
            var duedate = poRecord.getValue('duedate');
            if (context.type == context.UserEventType.CREATE && createdfrom && duedate && soStatus) record.submitFields({ type: record.Type.SALES_ORDER, id: createdfrom, values: { custbody_sdb_due_date_drop_ship: duedate }, options: { ignoreMandatoryFields: true } });//add 11/07/2024
            if (oldRecord && oldDuedate != duedate && createdfrom && soStatus) record.submitFields({ type: record.Type.SALES_ORDER, id: createdfrom, values: { custbody_sdb_due_date_drop_ship: duedate }, options: { ignoreMandatoryFields: true } });//add 11/07/2024
            log.debug("schedule date: ", { id: poRecord.id, old: oldRecord ? oldRecord.getValue("custbody_acc_sch_date_time") : '', new: poRecord.getValue("custbody_acc_sch_date_time") });
            if (oldRecord && String(oldRecord.getValue("custbody_acc_sch_date_time")) != String(poRecord.getValue("custbody_acc_sch_date_time"))) setExpectedReceipt(poRecord);
        } catch (error) {
            log.error("ERROR: ", error);
        }
    }
   function checkPendingFulfillmentStatus(soId) {
        try {
            var statusLookUp = search.lookupFields({
                type: 'salesorder',
                id: soId,
                columns: ['status']
            });
var statusText = statusLookUp.status[0].text.toUpperCase(); // Obtener el texto del estado en mayúsculas
            log.debug('Current Sales Order Status Text', statusText);

            if (statusText && statusText.includes('PENDING')) {
                log.debug('IS PENDING////', 'Pending Fulfillment');
                // Realiza la acción específica si el estado incluye "PENDING"
              return true;
            }
        } catch (error) {
            log.error("checkPendingFulfillmentStatus ERROR: ", error);
        }
    }


    function setExpectedReceipt(poRecord) {
        var scheduleDate = poRecord.getValue("custbody_acc_sch_date_time");
        if (!scheduleDate) return false;
        scheduleDate = getFormatDate(new Date(scheduleDate));
        log.debug("Execute setExpectedReceipt: ", { POid: poRecord.id, scheduleDate });
        var itemLines = poRecord.getLineCount('item');
        for (let i = 0; i < itemLines; i++) {
            try {
                poRecord.setSublistValue({
                    sublistId: 'item',
                    fieldId: 'expectedreceiptdate',
                    value: format.parse({ value: scheduleDate, type: format.Type.DATE }),
                    line: i,
                });
            } catch (e) {
                log.error("ERROR updating line: ", e);
            }
        }
    }

    function getFormatDate(date) {
        let parsedDate = format.parse({
            value: date,
            type: format.Type.DATE
        });
        return format.format({
            value: new Date(parsedDate),
            type: format.Type.DATE
        });
    }

    function afterSubmit(context) {
        try {
            var currentRecord = context.newRecord;
            var rec = record.load({
                type: record.Type.PURCHASE_ORDER,
                id: currentRecord.id
            });
            if (context.type == context.UserEventType.EDIT) setCostItemReceipt(rec);
            if (context.type == context.UserEventType.CREATE || context.type == context.UserEventType.DROPSHIP) rebateCostOnDropshipPO(context);
            // Download Re-Open orders
            downloadReOpenOrders(context);
        } catch (e) {
            log.error("ERROR:", e);
        }
    }
    // Rebate costs on dropships aux functions
    function rebateCostOnDropshipPO(context) {
        try {
            var newRecord = context.newRecord;
            var isDropship = newRecord.getValue("custbody_dropship_order");
            var vendor = newRecord.getValue("entity");
            var rebateCostOnDropshipPOs = search.lookupFields({
                type: 'vendor',
                id: vendor,
                columns: 'custentity_sdb_rebate_cost_drop_pos'
            }).custentity_sdb_rebate_cost_drop_pos;
            if (isDropship && rebateCostOnDropshipPOs) {
                var createdFromSO = newRecord.getValue("createdfrom");
                var itemsWithRebateCost = getItemsWithRebateCost(createdFromSO);
                if(itemsWithRebateCost && itemsWithRebateCost.length>0){
                    setItemCosts(newRecord, itemsWithRebateCost);
                };
            }
        } catch (rebateError) {
            log.error("rebateCostOnDropshipPO() ERROR", rebateError);
        }
    }
    function setItemCosts(newRecord, itemsWithRebateCost) {
        try {
            log.debug("setItemCosts() itemsWithRebateCost is: ", itemsWithRebateCost);
            var recordId = newRecord.id;
            var loadedRecord = record.load({
                type: 'purchaseorder',
                id: recordId,
                isDynamic: true,
            });
            for (var j = 0; j < itemsWithRebateCost.length; j++) {
                var object = itemsWithRebateCost[j];
                for(var key in object){
                    var itemLine = loadedRecord.findSublistLineWithValue({
                        sublistId: "item",
                        fieldId: "item",
                        value: key
                    });
                    if(itemLine != -1){
                        loadedRecord.selectLine({
                            sublistId: "item",
                            line: itemLine
                        });
                        loadedRecord.setCurrentSublistValue({
                            sublistId: "item",
                            fieldId: "rate",
                            value: object[key]
                        });
                        loadedRecord.commitLine({
                            sublistId: "item",
                        });
                    }
                }
            }
            loadedRecord.save();
        } catch (error) {
            log.error("setItemCosts() ERROR", error);
        }
    }
    function getItemsWithRebateCost(createdFromSO) {
        try {
            var searchSOLines = search.create({
                type: "salesorder",
                filters:
                    [
                        ["type", "anyof", "SalesOrd"],
                        "AND",
                        ["mainline", "is", "F"],
                        "AND",
                        ["custcol_rebate_cost", "greaterthan", "0.00"],
                        "AND",
                        ["custcol_rebate_cost", "isnotempty", ""],
                        "AND",
                        ["internalid", "anyof", createdFromSO]
                    ],
                columns:
                    [
                        search.createColumn({ name: "item", label: "Item" }),
                        search.createColumn({ name: "custcol_rebate_cost", label: "Rebate Cost" })
                    ]
            });
            var results = [];
            searchSOLines.run().each(function (result) {
                var item = result.getValue('item');
                var rebateCost = result.getValue('custcol_rebate_cost');
                var resultObj = {};
                resultObj[item] = rebateCost;
                results.push(resultObj);
                return true;
            });
            log.debug("getItemsWithRebateCost() results.length is: ", results.length);
            return results;
        } catch (getItemsWithRebateCostError) {
            log.error("getItemsWithRebateCost() ERROR", getItemsWithRebateCostError);
        }
    }

    // downloadreOpenOrders(afterSubmitContext);
    function downloadReOpenOrders(afterSubmitContext) {
        try {
            if (afterSubmitContext.type == 'delete' || afterSubmitContext.type == 'create') return;
            var newRecord = afterSubmitContext.newRecord;
            var oldRecord = afterSubmitContext.oldRecord;

            var oldStatus = oldRecord.getValue('status');
            var dropship = newRecord.getValue('custbody_dropship_order');
            var statusLookUp = search.lookupFields({
                type: 'purchaseorder',
                id: newRecord.id,
                columns: ['status']
            });
            var statusSearched = statusLookUp['status'][0].text;
            if (statusSearched == 'Pending Billing/Partially Received' && oldStatus == 'Pending Bill' && !dropship) {
                record.submitFields({
                    type: 'purchaseorder',
                    id: newRecord.id,
                    values: {
                        'custbody_a1wms_dnloadtowms': true
                    },
                });
            }
        } catch (error) {
            log.error("downloadReOpenOrders() ERROR", error);
        }
    }
    // ---------------- setCostItemReceipt ---------------- //
    function setCostItemReceipt(context) {
        try {
            var count = context.getLineCount('item');
            var itemsToUpdate = [];
            for (var line = 0; line < count; line++) {
                var quantityreceived = context.getSublistValue({
                    sublistId: 'item',
                    fieldId: 'quantityreceived',
                    line: line,
                });
                var item = context.getSublistValue({
                    sublistId: 'item',
                    fieldId: 'item',
                    line: line,
                });
                var cost = context.getSublistValue({
                    sublistId: 'item',
                    fieldId: 'rate',
                    line: line,
                });
                if (quantityreceived >= 1) {
                    itemsToUpdate.push({ item, cost });
                }
            }
            if (!itemsToUpdate.length) return;
            var itemReceiptRelated = getItemReceiptRelated(context.id);
            itemReceiptRelated.forEach(function (id) {
                var itemReceipt = record.load({
                    type: record.Type.ITEM_RECEIPT,
                    id: id
                });
                var itemCount = itemReceipt.getLineCount('item');
                var needToUpdate = false;
                for (var line = 0; line < itemCount; line++) {
                    var item = itemReceipt.getSublistValue({
                        sublistId: 'item',
                        fieldId: 'item',
                        line: line,
                    });
                    var cost = itemReceipt.getSublistValue({
                        sublistId: 'item',
                        fieldId: 'rate',
                        line: line,
                    });
                    var hasItem = itemsToUpdate.find(function (poItem) {
                        return poItem.item == item && poItem.cost != cost;
                    });
                    if (!hasItem) continue;

                    log.debug("ITEM TO UPDATE: ", { poId: context.id, hasItem, itemReceipt: { id, item, cost } })
                    needToUpdate = true;
                    itemReceipt.setSublistValue({
                        sublistId: 'item',
                        fieldId: 'rate',
                        value: Number(hasItem.cost),
                        line: line,
                    });
                }
                log.audit("RECEIPT INFO: ", { id, needToUpdate });
                if (needToUpdate) itemReceipt.save({ enableSourcing: false, ignoreMandatoryFields: true });
            });
        } catch (e) {
            log.error("ERROR setCostItemReceipt:", e);
        }
    }

    function getItemReceiptRelated(poId) {
        try {
            var arrToReturn = [];
            var itemreceiptSearchObj = search.create({
                type: "itemreceipt",
                filters:
                    [
                        ["mainline", "is", "T"],
                        "AND",
                        ["createdfrom", "anyof", poId],
                        "AND",
                        ["type", "anyof", "ItemRcpt"]
                    ],
                columns: []
            });
            itemreceiptSearchObj.run().each(function (result) {
                arrToReturn.push(result.id)
                return true;
            });
            return arrToReturn;
        } catch (e) {
            log.error("ERROR getItemReceiptRelated:", e);
        }
    }
    // ---------------- setCostItemReceipt ---------------- //

    return {
        beforeSubmit: beforeSubmit,
        afterSubmit: afterSubmit
    };
});
