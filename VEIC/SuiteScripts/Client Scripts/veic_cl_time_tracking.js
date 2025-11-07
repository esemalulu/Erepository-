/**
 *@NApiVersion 2.x
 *@NScriptType ClientScript
 */

 define(['N/currentRecord', 'SuiteScripts/Lib/veic_master_lib.js'], function (currentRecord, lib) {

  function pageInit(context) {
    var currentRecordObj = currentRecord.get(); // Get the current record
    // Check if the record is in edit mode
    if (currentRecordObj.id && currentRecordObj.type === 'timebill') {
        var mode = context.mode;
        
        // If it's edit mode
        if (mode === 'edit') {
          console.log(lib.isValidJSON(currentRecordObj.getValue({ fieldId: 'memo' })));
          if(lib.isValidJSON(currentRecordObj.getValue({ fieldId: 'memo' }))){
            var memo = JSON.parse(currentRecordObj.getValue({
                fieldId: 'memo'
            }));
          
            if(lib.isNotEmpty(memo[0].description)){
                log.debug('Inside', 'Inside condition');
                var memoText = memo[0].description;
                log.debug('Inside: memoText', memoText);
                currentRecordObj.setValue({
                    fieldId: 'memo',
                    value: memoText
                });
            }
          }
        }alert('Test');
    }
}

  return {
    pageInit: pageInit
  }
});