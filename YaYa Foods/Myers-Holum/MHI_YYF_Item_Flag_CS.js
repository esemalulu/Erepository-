/**
 *@NApiVersion 2.x
 *@NScriptType ClientScript
 */
define([
  'N/currentRecord',
  'N/search',
  'N/url',
  'N/ui/message',
  'N/ui/dialog',
  'N/format'
], function(currentRecord, search, url, message, dialog, format) {
  function pageInit(context) {
    debugger;
    console.log('test')
    var currentRec = context.currentRecord;

    var isBos = currentRec.getValue('custitem_mhi_yyf_is_bos');
    var isBop = currentRec.getValue('custitem_mhi_yyf_is_bop');

    var bosField = currentRec.getField('custitem_mhi_yyf_is_bos');
    var bopField = currentRec.getField('custitem_mhi_yyf_is_bop');

    if (isBos) {
      bosField.isDisabled = false;
      bopField.isDisabled = true;
    } else if (isBop) {
      bopField.isDisabled = false;
      bosField.isDisabled = true;
    }
  }

  function fieldChanged(context) {
    var currentRec = context.currentRecord;
    var fieldId = context.fieldId;
    var isBos = currentRec.getValue('custitem_mhi_yyf_is_bos');
    var isBop = currentRec.getValue('custitem_mhi_yyf_is_bop');
    var bosField = currentRec.getField('custitem_mhi_yyf_is_bos');
    var bopField = currentRec.getField('custitem_mhi_yyf_is_bop');
    if (fieldId == 'custitem_mhi_yyf_is_bos') {
      if (isBos) {
        bopField.isDisabled = true;
      } else {
        bopField.isDisabled = false;
      }
    }

    if (fieldId == 'custitem_mhi_yyf_is_bop') {
      if (isBop) {
        bosField.isDisabled = true;
      } else {
        bosField.isDisabled = false;
      }
    }
  }

  return {
    pageInit: pageInit,
    fieldChanged: fieldChanged
  };
});
