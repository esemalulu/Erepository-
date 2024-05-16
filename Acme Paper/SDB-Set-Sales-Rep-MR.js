/**
 *@NApiVersion 2.1
 *@NScriptType MapReduceScript
 */
define(['N/record', 'N/search', 'N/log'], function (record, search, log) {

    function getInputData() {
        var customrecord_rebate_customerSearchObj = search.create({
            type: "customrecord_rebate_customer",
            filters:[],
            columns:
                [
                    search.createColumn({ name: "custrecord_rebate_customer_customer", label: "Customer" })
                ]
        });
        return customrecord_rebate_customerSearchObj
    }

    function map(context) {
        try {
            var contextValues = JSON.parse(context.value);
            var recType = contextValues.recordType
            var recId = contextValues.id
            log.debug('recId', recId)
            var arr = contextValues.values.custrecord_rebate_customer_customer?.value
            if (!arr){
                arr = contextValues.values.custrecord_rebate_customer_customer
                var arrSalesRep = []
                if (arr){
                    arr.forEach(custId => {
                        var lookupObj = search.lookupFields({
                            type: search.Type.CUSTOMER,
                            id: custId,
                            columns: ['salesrep']
                        })
                        var salesRepId = lookupObj.salesrep[0].value
                        if (!arrSalesRep.includes(salesRepId)) {
                            arrSalesRep.push(salesRepId)
                        }
                    });
                    record.submitFields({
                        type: recType,
                        id: recId,
                        values: {
                            'custrecord_sdb_sales_rep': arrSalesRep
                        }
                    })
                }
            }
            else if (arr) {
                var lookupObj = search.lookupFields({
                    type: search.Type.CUSTOMER,
                    id: arr,
                    columns: ['salesrep']
                })
                var salesRepId = lookupObj.salesrep[0].value
                record.submitFields({
                    type: recType,
                    id: recId,
                    values: {
                        'custrecord_sdb_sales_rep': salesRepId
                    }
                })
            }
        } catch (e) {
            log.error('error at map', e)
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
