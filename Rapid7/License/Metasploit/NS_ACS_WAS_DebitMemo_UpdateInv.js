/**
 *@NApiVersion 2.x
 *@NScriptType WorkflowActionScript
 */
define(['N/record'], function(record) {

    function ApproveDebitMemo(scriptContext) {
    
        var rec = scriptContext.newRecord
        var debitmemo_id = rec.id

        var paymentId = rec.getValue({
            fieldId: 'custbodydebit_memo_payment'
        })

        if(paymentId != null && paymentId != ""){
          var paymentrec = record.load({
            type: record.Type.CUSTOMER_PAYMENT,
            id: paymentId,
            isDynamic: false
        });
		log.debug(paymentrec)
        var count = paymentrec.getLineCount({
            sublistId: 'apply'
        })
        log.debug(count)

        for (var i = 0; i < count; i++) {
            var id = paymentrec.getSublistValue({
                sublistId: 'apply',
                fieldId: 'internalid',
                line: i
            })
            log.debug(id)
            if (id == debitmemo_id) {
                paymentrec.setSublistValue({
                    sublistId: 'apply',
                    fieldId: 'apply',
                    line: i,
                    value: true
                })
            }
            else{
                paymentrec.setSublistValue({
                    sublistId: 'apply',
                    fieldId: 'apply',
                    line: i,
                    value: false
                })
            }
        }

        paymentrec.save();
        }
    }

    return {
        onAction: ApproveDebitMemo
    }
});
