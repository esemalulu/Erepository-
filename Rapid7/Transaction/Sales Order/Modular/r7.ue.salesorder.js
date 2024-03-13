/**
 * @NApiVersion 2.1
 * @NScriptType UserEventScript
 * @NModuleScope Public
 */
define([
    'N/log',
    'N/runtime',
    './Common/r7.salesorder.ss.js',
    '../../Common/r7.transaction.arr.calculations',
    '../../Common/r7.transaction.arr.event',
    '../../Common/r7.ratable.process.dates.only.button',
    './Common/r7.srp.project.assignment.button',
    '../../Common/r7.transaction.common.userevent',
    '../../Common/r7.transaction.taxcode',
    '../../Common/r7.transaction.lead.source.category',
    '../../Common/r7.update.header',
    '../../Common/r7.transaction.crc',
    '../../Common/r7.transaction.partners',
    '../../Common/r7.transaction.arcollectionrep'
], function (log, runtime, serverSide, arrCalcs, arrEvent, ratableProcess, projectAssignment, transCommon, taxcode, leadSrc, header, crc, partners, arcollectionrep) {
    function beforeLoad(context) {
        setClientScript(context);
        arrCalcs.beforeLoad(context);
        serverSide.beforeLoad(context);
        ratableProcess.beforeLoad(context);
        projectAssignment.beforeLoad(context);
        taxcode.beforeLoad(context);
    }

    function beforeSubmit(context) {
        serverSide.beforeSubmit(context);
        arrEvent.beforeSubmit(context);
        taxcode.beforeSubmit(context);
        leadSrc.beforeSubmit(context);
        header.beforeSubmit(context);
        crc.tranBeforeSubmit(context);
    }

    function afterSubmit(context) {
        serverSide.afterSubmit(context);
        arrCalcs.afterSubmit(context);
        arrEvent.afterSubmit(context);
        transCommon.afterSubmit(context);
        taxcode.afterSubmit(context);
        partners.afterSubmit(context);
        arcollectionrep.afterSubmit(context);
    }

    //////////////////////////////////////////////

    function setClientScript(context){
        const scriptId = runtime.getCurrentScript().getParameter({ name: 'custscript_r7_salesorder_cs_fileid'});

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