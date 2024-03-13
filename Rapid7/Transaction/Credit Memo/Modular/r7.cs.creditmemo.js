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
        let partnerSave = partners.tranSaveRecord(context);
        if (partnerSave) {
            return true;
        } else {
            return false;
        }
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