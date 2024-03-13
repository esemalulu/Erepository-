/**
 * @NApiVersion 2.1
 * @NModuleScope Public
 * @NScriptType ClientScript
 * @module
 * @description
 */
define([
    '../../Common/r7.transaction.partners',
    './Common/r7.validate.applied.to.order'
], function (partners, appliedTo) {

    function pageInit(context) {
        partners.tranPageInit(context);
    }

    function saveRecord(context) {
        let partnerSave = partners.tranSaveRecord(context);
        if (partnerSave) {
            return appliedTo.saveRecord(context);;
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