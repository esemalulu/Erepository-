/**
 * @NApiVersion 2.x
 * @NScriptType UserEventScript
 * @NModuleScope SameAccount
 */
define(['N/search', 'N/record', 'N/runtime', 'N/file'],

    function (search, record, runtime, file) {

        function afterSubmit(scriptContext) {
            try {
                var newRec = scriptContext.newRecord;
                var soId = newRec.getValue('custbody_sdb_order_venta_asociada')
                var trandate=newRec.getText('trandate')
                if (soId) {
                    record.submitFields({
                        type: record.Type.SALES_ORDER,
                        id: soId,
                        values: { custbody_sdb_trans_inv_oms: false, memo: "Traslado de inventario se realizado  "+trandate },
                        options: {
                            ignoreMandatoryFields: true
                        }
                    })
                }

            } catch (e) {
                log.error('Error AfterSubmit: ' + newRec.type + ' - ' + newRec.id, e);
            }
        }

        return {
            afterSubmit: afterSubmit
        };

    });
