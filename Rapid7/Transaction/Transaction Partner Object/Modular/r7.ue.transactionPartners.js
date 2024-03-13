/**
 * @NApiVersion 2.1
 * @NScriptType UserEventScript
 * @NModuleScope Public
 * Rapid 7
 * src/FileCabinet/SuiteScripts/Transaction/Transaction Partner Object /Modular/r7.ue.transactionPartners.js
 * @module 
 * @description 
 */
define(['../../Common/r7.transaction.partners'], function(partners) {

  /**
   * @function afterSubmit
   * @description description
   *
   * @public
   * @param  {type} scriptContext description
   * @return {type} - description
   */
  function afterSubmit(scriptContext) {
    partners.syncPartnersToLinkedTransaction(Number(scriptContext.newRecord.getValue('custrecord_transaction_link')), Number(scriptContext.newRecord.getValue('custrecord_opportunity_link')));
  }

  return /** @alias module: r7.ue.transactionPartners */ {
    afterSubmit: afterSubmit
  };
});