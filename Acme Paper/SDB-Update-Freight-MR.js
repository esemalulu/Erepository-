/**
 *@NApiVersion 2.1
 *@NScriptType MapReduceScript
 */
define(["N/log", "N/search", "N/record"], function(log, search, record) {

    function getInputData() {
        try {
            var invoiceSearchObj = search.create({
                type: "invoice",
                filters:
                [
                   ["type","anyof","CustInvc"], 
                   "AND", 
                   ["item","anyof","103532"], 
                   "AND", 
                   ["mainline","is","F"], 
                   "AND", 
                   ["costestimate","equalto","1.03"]
                ],
                columns:
                [
                   search.createColumn({
                      name: "formulacurrency",
                      formula: "{quantity}*{custcol_acc_unitcost}",
                      label: "Est Extended Cost"
                   })
                ]
             });

             return invoiceSearchObj
        } catch (error) {
            log.error("Error at getInputData", error)
        }
    }

    function map(context) {
        try {
            var invId = context.key
            log.debug("Invoice ID", invId);
            var contextValues = JSON.parse(context.value).values
            var newExtCost = Number(contextValues.formulacurrency)
            var currentInvoice = record.load({
                type: record.Type.INVOICE,
                id: invId,
                isDynamic: false,
            })
            var freightLine = currentInvoice.findSublistLineWithValue({
                sublistId: 'item',
                fieldId: 'item',
                value: 103532
            });

            currentInvoice.setSublistValue({
                sublistId: 'item',
                fieldId: 'costestimate',
                line: freightLine,
                value: newExtCost
            })
            var invSaved= currentInvoice.save()
            log.debug("invoice saved", invSaved)
            
        } catch (error) {
            log.error("error at map", error)
        }
    }

    function reduce(context) {
        
    }

    function summarize(summary) {
        
    }

    return {
        getInputData: getInputData,
        map: map,
        reduce: reduce,
        summarize: summarize
    }
});
