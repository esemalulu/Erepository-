/**
 *@NApiVersion 2.1
 *@NScriptType MapReduceScript
 */
define(["N/log", "N/search", "N/record"], function (log, search, record) {

    function getInputData() {
        try {
            var salesorderSearchObj = search.create({
                type: "salesorder",
                filters:
                [
                   ["type","anyof","SalesOrd"], 
                   "AND", 
                   ["mainline","any",""], 
                   "AND", 
                   ["status","anyof","SalesOrd:D","SalesOrd:E","SalesOrd:F"], 
                   "AND", 
                   ["custbody_dropship_order","is","F"], 
                   "AND", 
                   ["quantitybilled","greaterthan","0"], 
                   "AND", 
                   ["formulanumeric: {quantity}-nvl({quantitycommitted},0)-nvl({quantityshiprecv},0) ","greaterthan","0"]
                ],
                columns:
                [
                   search.createColumn({
                      name: "type",
                      sort: search.Sort.ASC,
                      label: "Type"
                   }),
                   search.createColumn({name: "trandate", label: "Date"}),
                   search.createColumn({
                      name: "tranid",
                      sort: search.Sort.ASC,
                      label: "Document Number"
                   }),
                   search.createColumn({name: "mainname", label: "Customer"}),
                   search.createColumn({name: "memomain", label: "Memo"}),
                   search.createColumn({name: "statusref", label: "Status"}),
                   search.createColumn({name: "source", label: "Source"}),
                   search.createColumn({name: "location", label: "Warehouse"}),
                   search.createColumn({name: "custbody_dropship_order", label: "Dropship Order"}),
                   search.createColumn({name: "custbody_a1wms_dnloadtimestmp", label: "Warehouse Edge Download Time Stamp"}),
                   search.createColumn({name: "startdate", label: "Start Date"}),
                   search.createColumn({
                      name: "formulanumeric",
                      formula: "	{quantity}-nvl({quantitycommitted},0)-nvl({quantityshiprecv},0)",
                      label: "Formula (Numeric)"
                   }),
                   search.createColumn({name: "internalid", label: "Internal ID"})
                ]
             });
            return salesorderSearchObj;
        } catch (error) {
            log.error("error at getInputData", error)
        }
    }

    function map(context) {
        try {
            log.debug("Context key", context.key);

            var objItems = getSalesOrderLines(context.key);
            if (isEmpty(objItems)) return;

            copySalesOrder(context.key, objItems);

        } catch (error) {
            log.error("error at map", error)
        }
    }

    function copySalesOrder(salesOrderId, objItems) {
        try {
            var soRec = record.load({
                id: salesOrderId,
                type: record.Type.SALES_ORDER,
            });
            var documentNumber = soRec.getValue({ fieldId: "tranid" });
            var rec = record.copy({
                type: record.Type.SALES_ORDER,
                id: salesOrderId,
                isDynamic: false,
            });
            var nextNumber = getNextSONumber(documentNumber);
            rec.setValue({ fieldId: "tranid", value: nextNumber });
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
            //    value: "",
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
            log.debug('Id Back Order Sales Order: ', recId)
            closeOrder(soRec);
            return recId;
        } catch (error) {
            log.error("Error in copySalesOrder", error.toString());
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
            log.error("Error in getNextSONumber", error.toString());
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
            rec.save({ enableSourcing: true, ignoreMandatoryFields: true });
        } catch (error) {
            log.error("Error in closeOrder", error.toString());
        }
    }

    function getSalesOrderLines(internalId) {
        try {
            var rec = record.load({
                id: internalId,
                type: record.Type.SALES_ORDER,
                isDynamic: true,
            });
            var lineCount = rec.getLineCount({ sublistId: "item" });
            var objItems = {};
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
                if (itemType != "InvtPart") continue;
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
                log.debug("Item Info: ", { internalId, item, itemType, quantityRemaining });
                if (quantityRemaining > 0) {
                    objItems[lineKey] = quantityRemaining;
                }
            }
            return objItems;
        } catch (error) {
            log.error("Error in getSalesOrderLines", error.toString());
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
        getInputData: getInputData,
        map: map,
    }
});
