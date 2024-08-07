/**
 * @NApiVersion 2.1
 * @NScriptType WorkflowActionScript
 */
define(['N/log', 'N/record', 'N/search'],
    /**
 * @param{log} log
 * @param{record} record
 * @param{search} search
 */
    (log, record, search) => {
        const onAction = (context) => {
            try {
                log.debug("context", context);
                var newRecord = context.newRecord;
                log.debug("context type", context.type);
                log.debug("newRecord", newRecord);
                if (context.type == "edit" || context.type == "create" || context.type == "dropship" || context.type == "specialorder") {
                    setShipPointAndBuyerByFirstItem(newRecord);
                }
            } catch (error) {
                log.error('ERROR onAction', error);
            }
        }

        /**
         * Set in the ship point field the ship point value of the FIRST ITEM of the order item list
         * @param {object} newRecord
         */
        function setShipPointAndBuyerByFirstItem(newRecord) {
            try {
                var lineCount = newRecord.getLineCount("item");
                if (lineCount > 0) {
                    var itemId = newRecord.getSublistValue({
                        sublistId: "item",
                        fieldId: 'item',
                        line: 0,
                    });
                    if (itemId) {
                        var itemShipPoint = getShipPointAndBuyerByItem(itemId);
                        if (itemShipPoint || itemShipPoint != "") {
                            newRecord.setValue({
                                fieldId: "custbody_sdb_ac_ship_point",
                                value: itemShipPoint.shipTo,
                            });

                            var currentBuyer = newRecord.getValue('custbody_acc_buyer');
                            if (itemShipPoint.buyer && (!currentBuyer || currentBuyer == -4)) {
                                newRecord.setValue({
                                    fieldId: "custbody_acc_buyer",
                                    value: itemShipPoint.buyer,
                                });
                                log.debug("custbody_sdb_ac_ship_point recently setted", newRecord.getValue("custbody_sdb_ac_ship_point"));
                            }
                        }
                    }
                }
            } catch (e) {
                log.error("Error in setShipPointAndBuyerByFirstItem", e);
            }
        }

        function getShipPointAndBuyerByItem(itemId) {
            try {
                let itemDataToReturn = {};
                var itemLookUp = search.lookupFields({
                    type: "item",
                    id: itemId,
                    columns: ['custitem_ship_point', 'custitem_buyer']
                });
                itemDataToReturn.shipTo = itemLookUp.custitem_ship_point[0]?.value || "";
                itemDataToReturn.buyer = itemLookUp.custitem_buyer[0]?.value || "";
                log.debug("itemDataToReturn", itemDataToReturn);
                return itemDataToReturn;
            } catch (e) {
                log.error("error in getShipPointValueByItem", e);
            }
        }

        return { onAction };
    });
