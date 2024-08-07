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

                var rec = record.load({
                    type: record.Type.SALES_ORDER,
                    id: soId,
                    isDynamic: true,
                })

                rec.setValue('custbody_sdb_update_for_trigger',true)
                var recId = rec.save({
                    // enableSourcing: true,
                    ignoreMandatoryFields: true
                });
                log.debug('recId', recId)

            } catch (e) {
                log.error('Error Occured ', e);
            }
        }

        return {
            onRequest: onRequest
        };
    });