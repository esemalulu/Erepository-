/**
 * @NApiVersion 2.1
 * @NScriptType WorkflowActionScript
 */

/** WF MUST BE INACTIVE */
define(['N/record', 'N/error', 'N/ui/message', 'N/runtime', 'N/search','N/redirect','N/url'], function (record, error, message, runtime, search,redirect,url) {
    function onAction(context) {
        try {
            rebateCostOnDropshipPO(context);
        } catch (e) {
            log.debug('onAction() ERROR ', e);
        }
    }

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
            log.audit('rebateCostOnDropshipPOs', rebateCostOnDropshipPOs)
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

    return {
        onAction: onAction
    }
});

