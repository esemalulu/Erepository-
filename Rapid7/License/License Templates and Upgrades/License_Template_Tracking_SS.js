/*
 * Module Description
 * 
 * Version    Date            Author           Remarks
 * 1.00       05 Dec 2012     efagone
 *
 */

/*
 * The recordType (internal id) corresponds to the "Applied To" record in your script deployment. 
 * @appliedtorecord recordType
 * 
 * @param {String} type Operation types: create, edit, delete, xedit,
 *                      approve, cancel, reject (SO, ER, Time Bill, PO & RMA only)
 *                      pack, ship (IF only)
 *                      dropship, specialorder, orderitems (PO only) 
 *                      paybills (vendor payments)
 * @returns {Void}
 */

function beforeSubmit(type){

	
}

function afterSubmit(type){

	if (type != 'delete' && type != 'xedit') {
	
		var status = nlapiGetFieldValue('custrecordr7lictemptracking_status');
		
		if (status == 3) { //verified
			nlapiLogExecution('DEBUG', 'Scheduling script to process this record');
			var schedStatus = nlapiScheduleScript(660);
			nlapiLogExecution('DEBUG', 'Schedule Status', schedStatus);
		}
		else 
			if (status == 5) { //process right away
				processTrackingDBRec(nlapiGetRecordId());
			}
	}
	
}
