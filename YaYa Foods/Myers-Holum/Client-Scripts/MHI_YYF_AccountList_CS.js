/**
 * @NApiVersion 2.X
 * @NScriptType ClientScript
 * @NModuleScope SameAccount
 * @NAmdConfig /SuiteScripts/Myers-Holum/Libraries/MHI_YYF_Configurations.json
 */
define(['mapping', 'N/record', 'N/search', 'N/url', 'N/currentRecord'], function (mapping, record, search, url, current) {
  var exports = {};
  var POPUP;
  var TRAN = mapping.TRAN;

  /**
     * Function to be executed after page is initialized.
     *
     * @governance XXX
     *
     * @param context
     *        {Object}
     * @param context.currentRecord
     *        {Record} Current form record
     * @param context.mode
     *        {String} The mode in which the record is being accessed (create,
     *        copy, or edit)
     *
     * @return {void}
     *
     * @since 2015.2
     *
     * @static
     * @function pageInit
     */
  function pageInit(context) {
    var RECOBJ = context.currentRecord;
    var SUB_EXP = RECOBJ.getSublist({
      sublistId: 'expense'
    });
    if (SUB_EXP) SUB_EXP.getColumn({ fieldId: 'account' }).isDisabled = true;
  }

  /**
     * Function to be executed when field is changed.
     *
     * @governance XXX
     *
     * @param context
     *        {Object}
     * @param context.currentRecord
     *        {Record} Current form record
     * @param context.sublistId
     *        {String} Sublist name
     * @param context.fieldId
     *        {String} Field name
     * @param [context.lineNum]
     *        {Number} Line number. Will be undefined if not a sublist or matrix
     *        field
     * @param [context.columnNum]
     *        {Number} Matrix column number. Will be undefined if not a matrix
     *        field
     *
     * @return {void}
     *
     * @since 2015.2
     *
     * @static
     * @function fieldChanged
     */
  function fieldChanged(context) {
    var RECOBJ = context.currentRecord;
    var FIELD = context.fieldId;
    var SUB = context.sublistId;

    if (SUB == 'expense' && FIELD == TRAN.SELECT_ACCOUNT) {
      var SELECTED = RECOBJ.getCurrentSublistValue({
        sublistId: SUB,
        fieldId: FIELD
      });

      if (SELECTED) {
        var PO_TYPE = RECOBJ.getValue({
          fieldId: TRAN.PO_TYPE
        });

        if (!PO_TYPE) {
          alert('Please select a PO Type first.');
        } else {
          var PARAMS = {
            potype: PO_TYPE
          };
          loadSuitelet(PARAMS, '_blank', 'top=200,left=500,width=400,height=400');
        }

        RECOBJ.setCurrentSublistValue({
          sublistId: 'expense',
          fieldId: TRAN.SELECT_ACCOUNT,
          value: false
        });
      }
    }
  }

  /**
     * Function to be executed when field is slaved.
     *
     * @governance XXX
     *
     * @param context
     *        {Object}
     * @param context.currentRecord
     *        {Record} Current form record
     * @param context.sublistId
     *        {String} Sublist name
     * @param context.fieldId
     *        {String} Field name
     *
     * @return {void}
     *
     * @since 2015.2
     *
     * @static
     * @function postSourcing
     */
  function postSourcing(context) {
    var RECOBJ = context.currentRecord;
    var SUB_EXP = RECOBJ.getSublist({
      sublistId: 'expense'
    });
    if (SUB_EXP) SUB_EXP.getColumn({ fieldId: 'account' }).isDisabled = true;
  }

  /**
     * Function to be executed after line is selected.
     *
     * @governance XXX
     *
     * @param context
     *        {Object}
     * @param context.currentRecord
     *        {Record} Current form record
     * @param context.sublistId
     *        {String} Sublist name
     *
     * @return {void}
     *
     * @since 2015.2
     *
     * @static
     * @function lineInit
     */
  function lineInit(context) {
    if (context.sublistId == 'item') {
      var RECOBJ = context.currentRecord;
      var SUB_EXP = RECOBJ.getSublist({
        sublistId: 'expense'
      });
      if (SUB_EXP) SUB_EXP.getColumn({ fieldId: 'account' }).isDisabled = true;
    }
  }

  function loadSuitelet(PARAMS, DISPLAY, SIZE) {
    if (POPUP) POPUP.close();
    var PARAMETERS = PARAMS;
    var SCRIPT_URL = url.resolveScript({
      scriptId: 'customscript_mhi_yyf_accountlist_sl',
      deploymentId: 'customdeploy_mhi_yyf_accountlist_sl',
      params: PARAMETERS
    });
    window.onbeforeunload = null;
    POPUP = window.open(SCRIPT_URL, DISPLAY, SIZE);
  }

  function submitAccount() {
    var RECOBJ = current.get();
    var ACCT_ID = RECOBJ.getValue({
      fieldId: 'custpage_account'
    });

    if (ACCT_ID) {
      window.opener.require(['N/currentRecord'], function(currRecord) {
        var PARENT_REC = currRecord.get();
        PARENT_REC.setCurrentSublistValue({
          sublistId: 'expense',
          fieldId: 'account',
          value: ACCT_ID
        });
      });
      window.onbeforeunload = null;
      window.close();
    }
  }

  exports.pageInit = pageInit;
  exports.fieldChanged = fieldChanged;
  exports.postSourcing = postSourcing;
  exports.lineInit = lineInit;
  exports.submitAccount = submitAccount;
  return exports;
});
