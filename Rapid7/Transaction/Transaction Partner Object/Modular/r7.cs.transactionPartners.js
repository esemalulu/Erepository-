/**
 * @NApiVersion 2.1
 * @NModuleScope SameAccount
 * @NAMDConfig 
 * @NScriptType ClientScript
 * Rapid 7
 * src/FileCabinet/SuiteScripts/Transaction/Transaction Partner Object /Modular/r7.cs.transactionPartners.js
 * @module r7.cs.transactionPartners
 * @description 
 */
define(['N/runtime', '../../Common/r7.transaction.partners'], (runtime, partners) => {

  function pageInit(context) {
    const user = runtime.getCurrentUser();
    // Allowd role list is here; https://issues.corp.rapid7.com/browse/APPS-44426?focusedCommentId=2049707&page=com.atlassian.jira.plugin.system.issuetabpanels%3Acomment-tabpanel#comment-2049707
    const allowedRoles = [3,1151,1070,1135,1181,1157,1006,1113,1036,1310,1166,1173,1172,1174,1175,1176, 1057];
    if(allowedRoles.indexOf(Number(user.role)) == -1) {
     (context.currentRecord.getField("custrecord_partner")).isDisabled = true;
     (context.currentRecord.getField("custrecord_partner_type")).isDisabled = true;
      alert("You do not have access to create Partner relationships from this object. \n\n <b>Please add/update partners by editing the tranasction.</b>")
      window.history.back();
    }
  }


 /**
  * @function saveRecord
  * @description description
  *
  * @public
  * @param  {Object} context description
  * @return {Boolean} description
  */
 function saveRecord(context) {
    const validPartnerCombo = partners.validatePartnerCombinationsForPartnerTranObject(context);

    if (validPartnerCombo.status) {
        return true;
    } else {
        let message = 'Validation failed.';
        if (!validPartnerCombo.status) {
            message = message + validPartnerCombo.message;
        }
        alert(message);
        return false;
    }
 }


  return /** @alias module: r7.cs.transactionPartners */ {
    pageInit,
    saveRecord
  };
});