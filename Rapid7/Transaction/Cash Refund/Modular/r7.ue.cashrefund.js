/**
 * @NApiVersion 2.1
 * @NScriptType UserEventScript
 * @NModuleScope Public
 */
define([
    'N/log',
    './Common/r7.cashrefund.ss.js',
    '../../Common/r7.transaction.arr.calculations',
    '../../Common/r7.transaction.arr.event',
    '../../Common/r7.transaction.parent.salesorder',
    '../../Common/r7.update.header'
], function (log, serverSide, arrCalcs, arrEvent, originatingSo, header) {

    function beforeLoad(context) {
        arrCalcs.beforeLoad(context);
        serverSide.beforeLoad(context);
    }

    function beforeSubmit(context) {
        serverSide.beforeSubmit(context);
        arrEvent.beforeSubmit(context);
        originatingSo.beforeSubmit(context);
        header.beforeSubmit(context);
    }

    function afterSubmit(context) {
        serverSide.afterSubmit(context);
        arrCalcs.afterSubmit(context);
        arrEvent.afterSubmit(context);
        originatingSo.afterSubmit(context);
    }

    return {
        beforeLoad,
        beforeSubmit,
        afterSubmit
    };
});