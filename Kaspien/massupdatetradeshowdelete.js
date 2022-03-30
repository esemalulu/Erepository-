/**
 * Module Description
 * 
 * Version    Date            Author           Remarks
 * 1.00       30 Oct 2015     clayr
 *
 */

/**
 * @param {String} recType Record type internal id
 * @param {Number} recId Record internal id
 * @returns {Void}
 */
function 	massupdatetradeshowdelete(recType, recId) {
  
  try {
    if (recType == 'customrecordtradeshows') {
      
      // Get current case record and the record internal id.
      var recxx = nlapiLoadRecord(recType, recId);
  
     var recFlag = recxx.getFieldValue('custrecordkillcheckbox');

      if (recFlag == 'T'){

      nlapiDeleteRecord('customrecordtradeshows', recxx);
            
    }
    
  } 

}
}
