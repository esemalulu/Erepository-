/**
 * @NApiVersion 2.x
 * @NScriptType ClientScript
 * @NModuleScope Public
 */

define(['N/record', 'N/currentRecord', 'N/search', 'N/runtime', 'N/format'], function (record, currentRecord, search, runtime, format) {

  function fieldChanged(context) {
    try{
    //debugger;
    var rec = context.currentRecord;
    var stSublistName = context.sublistId;
    log.debug("fieldChanged", JSON.stringify(context));

    if (stSublistName == 'timeitem') {
      switch (context.fieldId) {
        case 'casetaskevent':
          debugger;
          var taskId = rec.getCurrentSublistValue({
            sublistId: context.sublistId,
            fieldId: context.fieldId
          });

          var objField = rec.getSublistField({
            sublistId: context.sublistId,
            fieldId: 'cseg_veic_eeu_initi',
            line: context.line
          });
          
          var options = objField.getSelectOptions({
    filter : 'C',
    operator : 'startswith'
});
/*
          objField.insertSelectOption({
    value: 'Option1',
    text: 'alpha'
});
          
          objField.removeSelectOption({value: null});
*/          
          
          break;

        case 'cseg_veic_eeu_initi':
          debugger;
          var rl2 = rec.getCurrentSublistValue({
            sublistId: context.sublistId,
            fieldId: context.fieldId
          });
          break;
      }

    }
    }catch(ex){console.log(ex)};
  return true;
}
    return {
  fieldChanged: fieldChanged
};
});