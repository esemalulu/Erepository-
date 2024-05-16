/**
 * @NApiVersion 2.1
 * @NScriptType ClientScript
 */

define(["N/search"], function (search) {
  // Put deployment info here
  let START_MODIFIED_DATE = null;
  function pageInit(context) {
    try {
      log.debug("pageInit() Begin","pageInit() Begin");
      const currentRecord = context.currentRecord;
      showAlert(currentRecord);
      
      const currentRecordId = currentRecord.id;
      if (currentRecordId == 418621) {
        //! 418621 IS TESTING SO
        START_MODIFIED_DATE = new Date(
          currentRecord.getValue("lastmodifieddate")
        ).getTime();
      }
    } catch (pageInitError) {
      log.error("pageInit() ERROR", pageInitError);
    }
  }

  function showAlert(thisRecord){
    try {
            var customForm = thisRecord.getValue({fieldId:'customform'})
            console.log("customForm: ", customForm)
            //300 id custom form DROP SHIP ENTRY
            if(customForm=='300'){
                window.CheckStock=function(){
                    return
                }
            }
        } catch (error) {
            log.debug({
                title:'pageInit',
                details:error
            })
        }
  }
  function saveRecord(context) {
      debugger;
    return true;
    try {
      log.debug("saveRecord() Begin","saveRecord() Begin");
      const currentRecord = context.currentRecord;
      const currentRecordId = currentRecord.id;
      if (currentRecordId == 418621) {
        //! 418621 IS TESTING SO
        let lastModifiedDate = new Date(
          search.lookupFields({
            type: currentRecord.type,
            id: currentRecord.id,
            columns: ["lastmodifieddate"],
          })["lastmodifieddate"]
        ).getTime();
        if (
          START_MODIFIED_DATE != null &&
          START_MODIFIED_DATE !== lastModifiedDate
        ) {
          alert(
            "The record being edited has been modified. Please back up or take note of changes and try again."
          );
          return false;
        } else return true;
      }
    } catch (saveRecordError) {
      log.error("saveRecord() ERROR", saveRecordError);
      return false;
    }
  }
  return { pageInit: pageInit, saveRecord: saveRecord };
});
