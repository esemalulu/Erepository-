/**
 * Module Description
 * 
 * Version    Date            Author           Remarks
 * 1.00       20 July 2017     clayr
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
function afterSubmitUpdatePoAmzStatusDates(type){

	try {
		
		if (type == 'edit') {
			
			var internalId = nlapiGetRecordId();
			var recType = nlapiGetRecordType();
			var poRecord = nlapiLoadRecord(recType, internalId);
			
			var poLocation = poRecord.getFieldText('location');
			var poNumber = poRecord.getFieldValue('tranid');
			var amzStatus = poRecord.getFieldValue('custbodyetailz_po_amz_status');
			
			if (poLocation != 'US' && amzStatus) {
				var currDate = dateFormat();
				
				if (!poRecord.getFieldValue('custbodyshipment_checked_in_c') && (amzStatus >= 6 && amzStatus <=8)) {
					nlapiSubmitField(recType, internalId, 'custbodyshipment_checked_in_c', currDate);
				}
				
				if (!poRecord.getFieldValue('custbodyshipment_receiving_c') && (amzStatus >= 7 && amzStatus <= 8)) {
					nlapiSubmitField(recType, internalId, 'custbodyshipment_receiving_c', currDate);
				}
				
				if (!poRecord.getFieldValue('custbodydate_closed_on_amz_c') && (amzStatus == 8)) {
					nlapiSubmitField(recType, internalId, 'custbodydate_closed_on_amz_c', currDate);
				}
			}
			
			nlapiLogExecution('DEBUG', 'Update Amazon Status Dates 2', 'type: ' + type + '; poNumber: ' + poNumber + '; internalId: ' + internalId + '; recType: ' + recType);
			
		}
		
	} catch (err) {
		
		nlapiLogExecution('ERROR', 'Update Amazon Status Dates', 'type: ' + type + '; poNumber: ' + poNumber + '; internalId: ' + internalId + 
				'; errName: ' + err.name + '; errMsg: ' + err.message);
		
	}
	
}

/**
 * Format date string for NetSuite
 * 
 * @returns {String}
 */
function dateFormat () {
	var today = new Date();
	var dd = today.getDate();
	var mm = today.getMonth()+1; //January is 0!

	var yyyy = today.getFullYear();
	if(dd<10){
	    dd='0'+dd;
	} 
	if(mm<10){
	    mm='0'+mm;
	} 
	var today = mm+'/'+dd+'/'+yyyy;
	
	return today;
}