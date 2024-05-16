/**
 *@NApiVersion 2.1
 *@NScriptType MapReduceScript
 */
define(["N/log", "N/search", "N/record"], function (log, search, record) {

    function getInputData() {
        try {
            var invoiceSearchObj = search.create({
                type: "invoice",
                filters:
                    [
                        ["type", "anyof", "CustInvc"],
                        "AND", 
                        ["custbody_acc_elg_commission","is","F"], 
                        "AND",
                        ["tranestgrossprofit", "greaterthan", "0.00"],
                        "AND",
                        ["mainline", "is", "T"]
                    ],
                columns:
                    [
                        search.createColumn({ name: "tranid", label: "Document Number" }),
                        search.createColumn({ name: "tranestgrossprofit", label: "Est. Gross Profit (Transaction)" })
                    ]
            });
            return invoiceSearchObj

        } catch (error) {
            log.error("Error at getInputData", error)
        }
    }

    function reduce(context) {
        try {
            var invoiceId = context.key
            var contextValues = JSON.parse(context.values)
            var estProfit = Number(contextValues.values["tranestgrossprofit"])
            log.debug("invoiceId", invoiceId)
            if (estProfit > 0) {
                record.submitFields({
                    type: record.Type.INVOICE,
                    id: invoiceId,
                    values: {
                        "custbody_acc_elg_commission": true
                    },
                })
            }
        } catch (error) {
            log.error("Error at reduce", error)
        }
    }


    return {
        getInputData: getInputData,
        reduce: reduce,
    }
});
