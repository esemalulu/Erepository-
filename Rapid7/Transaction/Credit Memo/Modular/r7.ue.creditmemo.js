/**
 * @NApiVersion 2.1
 * @NScriptType UserEventScript
 * @NModuleScope Public
 */
define([
    'N/log',
    'N/runtime',
    './Common/r7.creditmemo.ss.js',
    '../../Common/r7.transaction.arr.calculations',
    '../../Common/r7.transaction.arr.event',
    '../../Common/r7.ratable.process.dates.only.button',
    '../../Common/r7.delete.journal.entries.button',
    '../../Common/r7.transaction.parent.salesorder',
    '../../Common/r7.transaction.taxcode',
    '../../Common/r7.update.header',
    '../../Common/r7.transaction.arcollectionrep'
], function (log, runtime, serverSide, arrCalcs, arrEvent, ratableProcess, deleteJournal, parentSo, taxcode, header, arcollectionrep) {
    function beforeLoad(context) {
        setClientScript(context);
        arrCalcs.beforeLoad(context);
        serverSide.beforeLoad(context);
        ratableProcess.beforeLoad(context);
        deleteJournal.beforeLoad(context);
        taxcode.beforeLoad(context);
    }

    function beforeSubmit(context) {
        serverSide.beforeSubmit(context);
        arrEvent.beforeSubmit(context);
        taxcode.beforeSubmit(context);
        parentSo.beforeSubmit(context);
        header.beforeSubmit(context);
    }

    function afterSubmit(context) {
        serverSide.afterSubmit(context);
        arrCalcs.afterSubmit(context);
        arrEvent.afterSubmit(context);
        taxcode.afterSubmit(context);
        parentSo.afterSubmit(context);
        arcollectionrep.afterSubmit(context);
    }

    //////////////////////////////////////////////

    function setClientScript(context){
        const scriptId = runtime.getCurrentScript().getParameter({ name: 'custscript_r7_creditmemo_cs_fileid'});

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