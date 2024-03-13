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

    return {
        pageInit
    };
});