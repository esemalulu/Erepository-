/**
 * @NApiVersion 2.1
 * @NScriptType Suitelet
 * @NModuleScope SameAccount
 */

define(["N/runtime", "N/record"],
    function (runtime, record) {
        function onRequest(context) {
            try {
                var soId = context.request.parameters.recordid;
                if (!soId) return;
                var userId = runtime.getCurrentUser().id
                var recId = record.submitFields({
                    type: record.Type.SALES_ORDER,
                    id: soId,
                    values: {
                        'orderstatus': 'B',
                        // 'custbody_so_approval_status': 'Approved',
                        'custbody_so_rejereas': '',
                        'custbody_sdb_from_btn_approve': true,
                        'custbody_sdb_approved_by': userId,
                        'custbody_sdb_reject_by': '',
                        'custbody_sdb_approved_from_btn': true,
                        'custbody_sdb_reject_from_button': false,
                        'custbody_a1wms_dnloadtowms': true
                        //'custbody_a1wms_dnloadtimestmp': format.format({ value: cstamp, type: format.Type.DATETIMETZ, timezone: cinfo.getValue('timezone') })
                    },
                    options: {
                        ignoreMandatoryFields: true
                    }
                });

                log.debug('recId', recId)
                if (recId) context.response.write(JSON.stringify({ status: true }));
            } catch (e) {
                log.error('Error Occured ', e);
                context.response.write(JSON.stringify({ status: false }));
            }
        }

        return {
            onRequest: onRequest
        };
    });