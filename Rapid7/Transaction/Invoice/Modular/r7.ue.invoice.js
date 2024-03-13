/**
 * @NApiVersion 2.1
 * @NScriptType UserEventScript
 * @NModuleScope Public
 */
define([
    'N/log',
    'N/runtime',
    '../../Common/r7.ratable.process.dates.only.button',
    './Common/r7.invoice.inline.discount',
    './Common/r7.invoice.ss.js',
    '../../Common/r7.delete.journal.entries.button',
    '../../Common/r7.transaction.common.userevent',
    '../../Common/r7.transaction.taxcode',
    '../../Common/r7.transaction.lead.source.category',
    '../../Common/r7.update.header',
    '../../Common/r7.transaction.arcollectionrep'
], function (log, runtime, ratableProcess, inlineDiscount, common, deleteJournal, transCommon, taxcode, leadSrc, header, arcollectionrep) {

    function beforeLoad(context) {
        setClientScript(context);
        ratableProcess.beforeLoad(context);
        common.beforeLoad(context);
        inlineDiscount.beforeLoad((context));
        deleteJournal.beforeLoad(context);
        taxcode.beforeLoad(context);
    }

    function beforeSubmit(context) {
        common.beforeSubmit(context);
        taxcode.beforeSubmit(context);
        header.beforeSubmit(context);
    }

    function afterSubmit(context) {
        transCommon.afterSubmit(context);
        taxcode.afterSubmit(context);
        leadSrc.beforeSubmit(context);
        arcollectionrep.afterSubmit(context);
    }

    //////////////////////////////////////////////

    function setClientScript(context){
        const { executionContext } = runtime;
        const { USER_INTERFACE } = runtime.ContextType;

        if (executionContext !== USER_INTERFACE) {
            return;
        }

        const scriptId = runtime.getCurrentScript().getParameter({ name: 'custscript_r7_invoice_cs_fileid'});

        if (!scriptId) {
            log.debug({ title: 'No Client Script', details: 'No client script file id set for this script' });
            return;
        }

        context.form.clientScriptFileId = scriptId;
    }

    return {
        beforeLoad,
        beforeSubmit,
        afterSubmit
    };
});