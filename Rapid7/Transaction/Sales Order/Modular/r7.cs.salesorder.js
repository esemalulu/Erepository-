/**
 * @NApiVersion 2.1
 * @NModuleScope Public
 * @NScriptType ClientScript
 * @module
 * @description
 */
define(['../../Common/r7.transaction.partners'], function(partners) {

    function pageInit(context) {
        partners.tranPageInit(context);
    }

    /**
     * @function saveRecord
     * @description description
     */
     function saveRecord(context) {
        return partners.tranSaveRecord(context);
    }

    function fieldChanged(context) {
        partners.tranFieldChanged(context);
    }

    return {
        pageInit,
        saveRecord,
        fieldChanged
    };
});