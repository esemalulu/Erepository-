/**
 * @NApiVersion 2.x
 * @NScriptType WorkflowActionScript
 */

define(['N/record', 'N/log'],function(record, log) {
    function onAction(ctx){

        try {
            var isConsolidated = false;

            log.audit({
                title: 'ctx',
                details: JSON.stringify(ctx)
            });

            var policyRec = ctx.newRecord;
            var customerId = policyRec.getValue({
                fieldId: 'entity'
            });

            log.audit({
                title: 'customerId',
                details: customerId
            });

            var customer = record.load({
                type: record.Type.CUSTOMER,
                id: customerId
            });

            isConsolidated = customer.getValue({
                fieldId: 'custentity_ci_include_in_consolidation'
            });
            var pCustomerId = customer.getValue({
                fieldId: 'parent'
            });

            log.audit({
                title: 'isConsolidated',
                details: isConsolidated
            });
            log.audit({
                title: 'pCustomerId',
                details: pCustomerId
            });

            if (!isEmpty(pCustomerId) && !isConsolidated) {
                var pCustomer = record.load({
                    type: record.Type.CUSTOMER,
                    id: pCustomerId
                });

                isConsolidated = pCustomer.getValue({
                    fieldId: 'custentity_ci_include_in_consolidation'
                });

                log.audit({
                    title: 'isConsolidate2',
                    details: isConsolidated
                });

            }

            log.audit({
                title: 'isConsolidate',
                details: isConsolidated
            });
        }
        catch(e){
            log.error({
                title: 'Failed to Send Invoice Email',
                details: JSON.stringify(e)
            });
        }

        //return 'false';
        return isConsolidated;
    }

    function isEmpty(param) {
        if (param === '' || param === null || param === undefined || param.length <= 0 || param ==='null') {
            return true;
        }
        return false;
    }


    return {
        onAction: onAction
    };
})