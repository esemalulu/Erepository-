/**
 *@NApiVersion 2.1
 *@NScriptType MapReduceScript
 */
define(["N/log", "N/record", "N/search"], function (log, record, search) {

    function getInputData() {
        try {
            return search.load({ type: "invoice", id: 5304 });
        } catch (error) {
            log.error("Error at getInputData", error)
        }
    }

    function map(context) {
        try {
            const result = JSON.parse(context.value);

            context.write({
                key: context.key,
                value: result.values["line"]
            });
        } catch (error) {
            log.error("Error at Map", error)
        }
    }

    function reduce(context) {
        try {
            var invoiceId = context.key;
            var arrayOfLines = context.values;
            log.debug('DATA: ', { invoiceId, arrayOfLines });
            // return
            var invRecord = record.load({
                type: record.Type.INVOICE,
                id: invoiceId,
                isDynamic: true,
            })

            arrayOfLines.forEach(line => {
                var lineNumber = invRecord.findSublistLineWithValue({
                    sublistId: 'item',
                    fieldId: 'line',
                    value: line
                });

                invRecord.selectLine({
                    sublistId: "item",
                    line: lineNumber
                })
                var backOrder = Number(invRecord.getCurrentSublistValue({
                    sublistId: "item",
                    fieldId: "quantityremaining"
                }))
                var quantity = Number(invRecord.getCurrentSublistValue({
                    sublistId: "item",
                    fieldId: "quantity"
                }))
                var unitCost = Number(invRecord.getCurrentSublistValue({
                    sublistId: "item",
                    fieldId: "custcol_acc_unitcost"
                }))
                invRecord.setCurrentSublistValue({
                    sublistId: "item",
                    fieldId: "costestimate",
                    value: unitCost * quantity
                })
                invRecord.commitLine({
                    sublistId: "item",
                })
            });
            var savedInv = invRecord.save({
                ignoreMandatoryFields: true
            })
            log.audit("SAVED", savedInv)
        } catch (error) {
            log.error("Error at Reduce", error)
        }
    }

    return {
        getInputData: getInputData,
        map: map,
        reduce: reduce,
    }
});
