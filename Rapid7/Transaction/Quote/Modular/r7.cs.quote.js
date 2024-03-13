/**
 * @NApiVersion 2.1
 * @NScriptType ClientScript
 * @NModuleScope SameAccount
 */
define([
    '../../Common/r7.transaction.partners'
], (partners) => {

    function pageInit(context) {
        partners.tranPageInit(context);
    }
    /**
     * @function saveRecord
     * @description description
     */
    function saveRecord(context) {
       return partners.quoteSaveRecord(context) &&  partners.tranSaveRecord(context);
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