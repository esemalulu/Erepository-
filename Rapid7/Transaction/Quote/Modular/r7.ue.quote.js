/**
 * @NApiVersion 2.1
 * @NScriptType UserEventScript
 * @NModuleScope Public
 */
define([
    'N/log',
    'N/runtime',
    './Common/r7.quote.ss.js',
    '../../Common/r7.transaction.arr.calculations',
    '../../Common/r7.transaction.arr.event',
    '../../Common/r7.transaction.taxcode',
    '../../Common/r7.transaction.lead.source.category',
    '../../Common/r7.update.header',
    '../../Common/r7.transaction.validations',
    '../../../Toolbox/r7.timer',
    '../../Common/r7.transaction.crc',
    '../../Common/r7.transaction.arcollectionrep'
], function (log, runtime, quote, arrCalcs, arrEvent, taxcode, leadSrc, header, validations, Timer, crc, arcollectionrep) {
    function beforeLoad(context) {
        setClientScript(context);
        arrCalcs.beforeLoad(context);
        quote.beforeLoad(context);
        validations.sharedHostedEnginesRenewalValidation(context);
        taxcode.beforeLoad(context);
    }

    function beforeSubmit(context) {
        arrEvent.beforeSubmit(context);
        quote.beforeSubmit(context);
        taxcode.beforeSubmit(context);
        leadSrc.beforeSubmit(context);
        header.beforeSubmit(context);
        crc.tranBeforeSubmit(context);
    }

    function afterSubmit(context) {
        arrCalcs.afterSubmit(context);
        arrEvent.afterSubmit(context);
        quote.afterSubmit(context);
        taxcode.afterSubmit(context);
        arcollectionrep.afterSubmit(context);
    }

    //////////////////////////////////////////////

    function setClientScript(context) {
        const scriptId = runtime.getCurrentScript().getParameter({ name: 'custscript_r7_quote_client_script_fileid'});

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