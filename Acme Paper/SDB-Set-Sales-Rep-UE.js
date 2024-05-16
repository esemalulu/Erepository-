/**
 *@NApiVersion 2.1
 *@NScriptType UserEventScript
 */
define(['N/search', 'N/log'], function (search, log) {

    function beforeSubmit(context) {
        try {
            if (context.type === context.UserEventType.CREATE) {
                var thisRecord = context.newRecord;
                var custId = Number(thisRecord.getValue('custrecord_rebate_customer_customer'))
                log.debug('custId', custId)
                var lookupObj = search.lookupFields({
                    type: search.Type.CUSTOMER,
                    id: Number(thisRecord.getValue('custrecord_rebate_customer_customer')),
                    columns: ['salesrep']
                })
                log.debug('LookupObj', lookupObj)
                var salesRepId = lookupObj?.salesrep[0]?.value
                log.debug('salesRepId', salesRepId)
                thisRecord.setValue({
                    fieldId: 'custrecord_sdb_sales_rep',
                    value: salesRepId
                })
            }
        } catch (error) {
            log.error("Error: ", error);
        }
    }


    return {
        beforeSubmit: beforeSubmit,
    }
});
