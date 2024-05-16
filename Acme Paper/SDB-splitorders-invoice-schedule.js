/**
 *@NApiVersion 2.1
 *@NScriptType ScheduledScript
 */
 define(["N/runtime", "N/record"], function (runtime, record) {

    function execute(context) {
        try {
            // Get created from parameter
            var createdFrom = runtime.getCurrentScript().getParameter({
                name: 'custscript_sdb_created_from_sales_order',
            });
            if (!createdFrom) return;

            var objItems = getSalesOrderLines(createdFrom);
            log.debug('Item to Set: ', { salesOrder: createdFrom, objItems });
            if (isEmpty(objItems) || !objItems) return;

            copySalesOrder(createdFrom, objItems);
        } catch (error) {
            log.error("ERROR", error);
        }
    }

    function copySalesOrder(salesOrderId, objItems) {
        try {
            var soRec = record.load({
                id: salesOrderId,
                type: record.Type.SALES_ORDER,
            });
            var hasCopy = soRec.getValue({fieldId:'custbody_sdb_has_copy'});// add 15/3
            if(hasCopy) return;
            var documentNumber = soRec.getValue({ fieldId: "tranid" });
            var rec = record.copy({
                type: record.Type.SALES_ORDER,
                id: salesOrderId,
                isDynamic: false,
            });
            var nextNumber = getNextSONumber(documentNumber);
            rec.setValue({ fieldId: "tranid", value: nextNumber });
            rec.setValue({ fieldId: "custbody_sdb_order_sps_replaced", value: false }); //Add 03/05 
            var lineCount = rec.getLineCount({ sublistId: "item" });
            for (var i = lineCount; i >= 0; i--) {
                var lineKey = rec.getSublistValue({
                    sublistId: "item",
                    fieldId: "lineuniquekey",
                    line: i,
                });
                if (!objItems.hasOwnProperty(lineKey)) {
                    rec.removeLine({
                        sublistId: "item",
                        line: i,
                    });
                } else {
                    rec.setSublistValue({
                        sublistId: "item",
                        fieldId: "quantity",
                        line: i,
                        value: objItems[lineKey],
                    });
                }
            }
            rec.setValue({
                fieldId: 'custbody_sdb_original_sales_order',
                value: salesOrderId,
                ignoreFieldChange: true
            })
            //rec.setValue({
            //    fieldId: 'custbody_a1wms_dnloadtimestmp',
            //    value: new Date(),
            //    ignoreFieldChange: true
            //})
            rec.setValue({
                fieldId: 'custbody_a1wms_orderstatus',
                value: "",
                ignoreFieldChange: true
            })
            rec.setValue({
                fieldId: 'custbody_acc_odoi_route_no',
                value: "",
                ignoreFieldChange: true
            })
            rec.setValue({
                fieldId: 'custbody_aps_stop',
                value: "",
                ignoreFieldChange: true
            })
            rec.setValue({
                fieldId: 'custbody_a1wms_orderlocked',
                value: false,
                ignoreFieldChange: true
            })
            rec.setValue({
                fieldId: 'custbody_a1wms_dnloadtowms',
                value: true,
                ignoreFieldChange: true
            })



            //Add field custbody_sdb_validation_item_charge
            rec.setValue({
                fieldId: 'custbody_sdb_validation_item_charge',
                value: true,
                ignoreFieldChange: true
            })
            var recId = rec.save({
                enableSourcing: true,
                ignoreMandatoryFields: true,
            });
            log.audit('Id Back Order Sales Order: ', { salesOrderId, recId });
            closeOrder(soRec);
            return recId;
        } catch (error) {
            log.error("ERROR copySalesOrder", error.toString());
        }
    }

    function getNextSONumber(soNumber) {
        try {
            var splitSONumber = soNumber.split("-");
            if (splitSONumber.length > 1) {
                var nextNumber = parseInt(splitSONumber[1]) + 1;
                return splitSONumber[0] + "-" + nextNumber;
            } else {
                return soNumber + "-1";
            }
        } catch (error) {
            log.error("ERROR getNextSONumber", error.toString());
        }
    }

    function closeOrder(rec) {
        try {
            var lineCount = rec.getLineCount({ sublistId: "item" });
            for (var i = 0; i < lineCount; i++) {
                var quantityInvoiced =
                    rec.getSublistValue({
                        sublistId: "item",
                        fieldId: "quantitybilled",
                        line: i,
                    }) || 0;
                var quantityOrdered =
                    rec.getSublistValue({
                        sublistId: "item",
                        fieldId: "quantity",
                        line: i,
                    }) || 0;
                var quantityRemaining = quantityOrdered - quantityInvoiced;
                if (quantityRemaining > 0) {
                    rec.setSublistValue({
                        sublistId: "item",
                        fieldId: "isclosed",
                        value: true,
                        line: i,
                    });
                }
            }
             rec.setValue({// add 15/3
                fieldId:'custbody_sdb_has_copy',
                value: true
             })
            var idClosed = rec.save({ enableSourcing: true, ignoreMandatoryFields: true });
            log.debug("Close Order: ", idClosed);
        } catch (error) {
            log.error("Error in closeOrder", error.toString());
        }
    }

    function getSalesOrderLines(internalId) {
        try {
            log.debug('internalId', internalId)
            var rec = record.load({
                id: internalId,
                type: record.Type.SALES_ORDER,
                isDynamic: true,
            });
            var itemfuelCherge = "101912";
            var itemError = "119976";
            var lineCount = rec.getLineCount({ sublistId: "item" });
            var objItems = {};
            var hasItems = false;
            for (var i = 0; i < lineCount; i++) {
                var item = rec.getSublistValue({
                    sublistId: "item",
                    fieldId: "item",
                    line: i,
                });

                var itemType = rec.getSublistValue({
                    sublistId: "item",
                    fieldId: "itemtype",
                    line: i,
                });
              // log.debug("itemType: ", itemType);
              
              //if (item == itemfuelCherge || item == itemError) continue;
               if(itemType !=  "InvtPart" || item == itemError) continue; //add 15/3
                var quantityInvoiced = rec.getSublistValue({
                    sublistId: "item",
                    fieldId: "quantityfulfilled",
                    line: i,
                });
                var quantityOrdered =
                    rec.getSublistValue({
                        sublistId: "item",
                        fieldId: "quantity",
                        line: i,
                    }) || 0;
                var lineKey = rec.getSublistValue({
                    sublistId: "item",
                    fieldId: "lineuniquekey",
                    line: i,
                });
                var quantityRemaining = quantityOrdered - quantityInvoiced;
                // log.debug("Item Info: ", { internalId, item, itemType, quantityRemaining });
                if (quantityRemaining > 0) {
                    objItems[lineKey] = quantityRemaining;
                    hasItems = true;
                }
            }
            return hasItems ? objItems : false;
        } catch (error) {
            log.error("ERROR getSalesOrderLines", error.toString());
        }
    }

    function isEmpty(stValue) {
        if (
            stValue == null ||
            stValue == "" ||
            stValue == " " ||
            stValue == undefined
        ) {
            return true;
        } else {
            return false;
        }
    }

    return {
        execute: execute
    }
});
