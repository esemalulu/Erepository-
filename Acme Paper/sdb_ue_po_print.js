/**
 * @NApiVersion 2.1
 * @NScriptType UserEventScript
 * @NModuleScope SameAccount
 */
define(["N/ui/serverWidget", "N/runtime", "N/log", 'N/format', 'N/config', 'N/record'], (uiserverwidget, runtime, log, format, config, record) => {
    return {
        beforeLoad: (ctx) => {
            try {
                if (ctx.type == ctx.UserEventType.CREATE) return;
                var form = ctx.form;
                form.clientScriptModulePath = "./sdb_cs_po_print.js";
                form.addButton({
                    id: "custpageprintcustom",
                    label: "Print",
                    functionName: "printCustomPDF",
                });
                form.addButton({
                    id: "custpageprint2custom",
                    label: "Email",
                    functionName: "sendPOemail",
                });
            } catch (e) {
                log.error("ERROR beforeLoad: ", e);
            }
        },
        afterSubmit: (context) => {
            try {
                if (context.type != context.UserEventType.CREATE) return;

                var contextRecord = context.newRecord;
                var id = contextRecord.getValue('id');
                var currentRecord = record.load({
                    type: record.Type.PURCHASE_ORDER,
                    id: id,
                    isDynamic: true
                })
                currentRecord.setValue({
                    fieldId: 'custbody_a1wms_dnloadtimestmp',
                    value: new Date()
                });
                currentRecord.save();
            } catch (ex) {
                log.error('ERROR afterSubmit: ', ex);
            }
        }

    };
});
