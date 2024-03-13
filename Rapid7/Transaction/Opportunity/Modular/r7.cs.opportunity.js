/**
 * @NApiVersion 2.1
 * @NScriptType ClientScript
 * @NModuleScope SameAccount
 */
define([
    '../../Common/r7.transaction.partners'
], (partners) => {

    /**
     * @function saveRecord
     * @description description
     */
     function saveRecord(context) {
        let partnerSave = partners.oppSaveRecord(context);
        if (partnerSave) {
            return true;
        } else {
            return false;
        }
    }

    /**
     * @function fieldChanged
     * @description use validate line function to validate that only
     *              one row can be set as primary at one time. 
     */
    function fieldChanged(context) {
        partners.oppFieldChanged(context);
    }

    return {
        fieldChanged,
        saveRecord
    };
});