/**
 *@NApiVersion 2.x
 *@NScriptType ClientScript
 */

 define(['N/currentRecord', 'N/runtime', 'SuiteScripts/Lib/veic_master_lib.js'], function (currentRecord, runtime, lib) {

  function pageInit(context) {
    var currentRecordObj = currentRecord.get();
    //alert('Test', 'test');
  }

  function fieldChanged(context) {
      var defaultItem = runtime.getCurrentScript().getParameter('custscript_veic_ts_default_item');

      if (context.sublistId === 'timeitem' && context.fieldId === 'item') {
          var rec = currentRecord.get();

          // Example: setting the item only if it's currently empty
          var itemVal = rec.getCurrentSublistValue({
              sublistId: 'timeitem',
              fieldId: 'item'
          });

          if (!itemVal) {
              rec.setCurrentSublistValue({
                  sublistId: 'timeitem',
                  fieldId: 'item',
                  value: defaultItem // Replace with your default Item ID
              });
          }
      }
  }


  return {
    pageInit: pageInit,
    fieldChanged: fieldChanged
  }
});