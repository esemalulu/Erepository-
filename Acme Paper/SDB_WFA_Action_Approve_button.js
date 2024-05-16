/**
 * @NApiVersion 2.1
 * @NScriptType WorkflowActionScript
 */
define(['N/record', 'N/error', 'N/ui/message', 'N/runtime', 'N/search', 'N/redirect', 'N/format', 'N/config'], function (record, error, message, runtime, search, redirect, format, config) {
    function onAction(context) {

        try {
            var newRecord = context.newRecord;
            var orderStatus = newRecord.getValue('orderstatus');
            var customer = newRecord.getValue('entity');
            var currenteId = runtime.getCurrentUser().id;
            var cstamp = format.parse({ value: new Date(), type: format.Type.DATETIMETZ })
            log.debug("orderStatus: ", orderStatus);
            log.debug("cstamp: ", cstamp);
            var cinfo = config.load({ type: config.Type.COMPANY_INFORMATION });
            record.submitFields({
                type: record.Type.SALES_ORDER,
                id: newRecord.id,
                values: {
                    'orderstatus': 'B',
                   // 'custbody_so_approval_status': 'Approved',
                    'custbody_so_rejereas': '',
                    'custbody_sdb_from_btn_approve': true,
                    'custbody_sdb_approved_by': currenteId,
                    'custbody_sdb_reject_by': '',
                    'custbody_sdb_approved_from_btn': true,
                    'custbody_sdb_reject_from_button': false,
                    'custbody_a1wms_dnloadtowms': true
                    //'custbody_a1wms_dnloadtimestmp': format.format({ value: cstamp, type: format.Type.DATETIMETZ, timezone: cinfo.getValue('timezone') })
                },
                options: {
                    ignoreMandatoryFields: true
                }
            })
            
            log.debug('id: ', newRecord.id)
            redirect.toRecord({
                id: newRecord.id,
                type: record.Type.SALES_ORDER,
            })
        } catch (e) {
            log.error('onAction: ', e)
        }

    }

    return {
        onAction: onAction
    }
});

