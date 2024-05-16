/**
 *@NApiVersion 2.1
 *@NScriptType UserEventScript
 */
define(["N/log", "N/record", "N/search"], function (log, record, search) {
    function afterSubmit(context) {

        try {
            var newRec = context.newRecord;
            var oldRecord = context.oldRecord;
            if (newRec.type == 'salesorder' && context.type !== context.UserEventType.DELETE) {
                recObj = record.load({ type: record.Type.SALES_ORDER, id: newRec.id, isDynamic: true });

                var flag = recObj.getValue('custbody_sdb_approved_from_btn');
                var flag_1 = recObj.getValue('custbody_sdb_reject_from_button');
                var status = oldRecord.getText('status');
                log.debug('status: ', status);
                log.debug('flag SO', flag);
                log.debug('flag_1 SO', flag_1);
                
                if ((flag || flag == 'T') && status == "Pending Approval") {
                    recObj.setValue({
                        fieldId: 'orderstatus',
                        value: 'B',
                        ignoreFieldChange: true
                    })
                    recObj.setValue({
                        fieldId: 'custbody_so_approval_status',
                        value: 'Approved',
                        ignoreFieldChange: true
                    })
                    recObj.setValue({
                        fieldId: 'custbody_sdb_from_btn_approve',
                        value: true,
                        ignoreFieldChange: true
                    })

                    recObj.save({
                        enableSourcing: true,
                        ignoreMandatoryFields: true
                    })
                } else if (flag_1 || flag_1 == 'T') {
                    recObj.setValue({
                        fieldId: 'custbody_so_approval_status',
                        value: 'Rejected',
                        ignoreFieldChange: true
                    })

                    recObj.save({
                        enableSourcing: true,
                        ignoreMandatoryFields: true
                    })
                }

            }
        } catch (e) {
            log.error('afterSubmit: ', e);
        }
    }

    return {
        afterSubmit: afterSubmit
    }

});
