/**
 * @NApiVersion 2.1
 * @NScriptType UserEventScript
 * @NModuleScope SameAccount
 */
define(["N/log"], (log) =>
{
    return {
        beforeLoad: (ctx) =>
        {
            try
            {
                if (ctx.type == ctx.UserEventType.CREATE) return;
                log.debug(ctx.type)
                var record = ctx.newRecord;

                //params
                const form = ctx.form;
                form.clientScriptModulePath = "./SDB-print-vrma-cs.js";

                var button = form.addButton({
                    id: "custpageprintcustom",
                    label: "Print",
                    functionName: "printCustomPDF()"
                });
                var button2 = form.addButton({
                    id: "custpageprint2custom",
                    label: "Email",
                    functionName: "sendEmail()",
                });
              
            } catch (e)
            {
                log.error("error", e);
            }
        }
    };
});
