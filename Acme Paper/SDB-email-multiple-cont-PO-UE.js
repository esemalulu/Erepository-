/**
 * @NApiVersion 2.1
 * @NScriptType UserEventScript
 * @NModuleScope Public
 */
define(['N/log'],

    function (log)
    {

        function beforeLoad(context)
        {

            var recordId = context.newRecord.id;
            var recordType = context.newRecord.type;

            var vendorId = context.newRecord.getValue("entity");

            var params = { recordId: recordId, recordType: recordType, vendorId: vendorId};

            context.form.clientScriptModulePath = "SuiteScripts/SDB-email-multiple-cont-PO-CS.js";

            context.form.addButton({
                id: "custpage_email_multiple_contacts",
                label: "Email contacts",
                functionName: "printPDF('" + JSON.stringify(params) + "')"
            });
        }

        return {
            beforeLoad: beforeLoad
        }
    })