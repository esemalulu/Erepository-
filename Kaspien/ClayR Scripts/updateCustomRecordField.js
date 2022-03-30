/**
 * Module Description
 * 
 * Version    Date            Author           Remarks
 * 1.00       15 Jul 2015     clayr
 *
 */

/**
 * The recordType (internal id) corresponds to the "Applied To" record in your script deployment. 
 * @appliedtorecord recordType
 * 
 * @param {String} type Operation types: create, edit, delete, xedit
 *                      approve, reject, cancel (SO, ER, Time Bill, PO & RMA only)
 *                      pack, ship (IF)
 *                      markcomplete (Call, Task)
 *                      reassign (Case)
 *                      editforecast (Opp, Estimate)
 * @returns {Void}
 */
function afterSubmitCustomRecordField(type){
 
	if (type == 'create' || type == 'edit') {
	
		var newRecord = nlapiGetNewRecord();
		var partType = newRecord.getFieldValue('custrecordtype_of_partnership_c');
		var partStatus = newRecord.getFieldValue('custrecordpartnership_status_c');
		var venParent = newRecord.getFieldValue('custrecordprt_vendor');
      //  var dateUpdate = newRecord1.getFieldValue('completedate');
       // var messageUpdate = newRecord1.getFieldValue('comment');
      	//var venParent1 = newRecord1.GetFieldValue('company');
		
		nlapiSubmitField('vendor',venParent,'custentityetailzpartner_type_body',partType);
        nlapiSubmitField('vendor',venParent,'custentityetailzpartner_status_body',partStatus);
      
        //nlapiSubmitField('vendor',venParent1,'custentityslctupdatemessage',messageUpdate);
      
       // nlapiSubmitField('vendor',venParent1,'custentityslct_weekly_update',dateUpdate);
		
		nlapiLogExecution('DEBUG', 'type argument', 'type: ' + type + '; partType: ' + partType + '; Vendor: ' + 
							venParent + "; partStatus: " + partStatus);
	
	}
}
