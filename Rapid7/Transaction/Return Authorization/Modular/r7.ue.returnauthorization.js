/**
 * @NApiVersion 2.1
 * @NScriptType UserEventScript
 * @NModuleScope Public
 */
define([
    'N/log',
    '../../Common/r7.transaction.arr.calculations',
    '../../Common/r7.transaction.arr.event',
    '../../Common/r7.transaction.taxcode',
    './Common/r7.validate.applied.to.order'
], function (log, arrCalcs, arrEvent, taxcode, appliedTo) {

    function beforeLoad(context) {
        arrCalcs.beforeLoad(context);
        taxcode.beforeLoad(context);
        appliedTo.beforeLoad(context);
    }

    function beforeSubmit(context) {
        arrEvent.beforeSubmit(context);
        taxcode.beforeSubmit(context);
        appliedTo.beforeSubmit(context);
    }

    function afterSubmit(context) {
        arrCalcs.afterSubmit(context);
        arrEvent.afterSubmit(context);
        taxcode.afterSubmit(context);
    }

    return {
        beforeLoad,
        beforeSubmit,
        afterSubmit
    };
});