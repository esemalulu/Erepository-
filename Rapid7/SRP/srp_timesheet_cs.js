/**
 * Module Description
 * 
 * Version    Date            Author           Remarks
 * 1.00       08 Apr 2016     mburstein
 *
 */

/**
 * The recordType (internal id) corresponds to the "Applied To" record in your script deployment. 
 * @appliedtorecord recordType
 *   
 * @returns {Boolean} True to continue save, false to abort save
 */
function timesheet_clientSaveRecord(){

	var intNumberLines = rec.getLineItemCount('timegrid');

	for(x=1; x <= intNumberLines; x++){
		var line = nlapiViewLineItemSubrecord('timegrid', 'monday', x);
	}
	
    return true;
}
