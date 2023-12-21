/**
 * @NApiVersion 2.X
 * @NScriptType ClientScript
 * @NModuleScope SameAccount
 */
define(['N/record', 'N/search'], function (record, search) {
  var exports = {};

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
    var SUB = RECOBJ.getSublist({
      sublistId: 'inventoryassignment'
    });
    var COL = SUB.getColumn({ fieldId: 'expirationdate' });
    log.debug('COL', COL);
    COL.isDisabled = false;
    COL.isMandatory = true;
  }

  exports.pageInit = pageInit;
  return exports;
});
