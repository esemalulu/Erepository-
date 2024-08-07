/**
 *@NApiVersion 2.1
 *@NScriptType UserEventScript
 */
 define(['N/search', 'N/log','N/record'], function (search, log,record) {

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
            log.error("beforeSubmit Error: ", error);
        }
    }

    function afterSubmit(scriptContext) {
        try {
            var scriptContextType = scriptContext.type;
            if( scriptContextType == 'delete')return;
            var rebateCustomerRecord = scriptContext.newRecord;
            var rebateCustomerValues = search.lookupFields({
                type: 'customrecord_rebate_customer',
                id: rebateCustomerRecord.id,
                columns: 'custrecord_rebate_customer_customer'
            })?.custrecord_rebate_customer_customer
            var newSearchFieldValue = '';
            for (var i = 0; i < rebateCustomerValues.length; i++) {
                var customer = rebateCustomerValues[i]?.text;
                var customerNumber = customer.split(" ")[0];
                newSearchFieldValue += customerNumber + ',';
            }
            record.submitFields({
                type: 'customrecord_rebate_customer',
                id: rebateCustomerRecord.id,
                values: {'custrecord_sdb_rebate_customer_search':newSearchFieldValue},
            })
            
        } catch (error) {
            log.error("afterSubmit error ",error);
        }
    }

    return {
        beforeSubmit: beforeSubmit,
        afterSubmit:afterSubmit
    }
});
