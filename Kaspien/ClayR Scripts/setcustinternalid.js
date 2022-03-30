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
function setcustinternalid(type) {
 
	try {
		
		if (type == 'create' || type == 'edit') {
		
			var internalId = nlapiGetRecordId();
					
			nlapiSubmitField('customer',internalId,'custentitycustomer_internal_id',internalId);
			
			nlapiLogExecution('DEBUG', 'Customer Update', 'type: ' + type + '; internalId: ' + internalId);
			
		}
		
	} catch (err) {
		
		nlapiLogExecution('ERROR', 'Update Customer Internal Id', 'type: ' + type + '; internalId: ' + internalId + 
				'; errName: ' + err.name + '; errMsg: ' + err.message);
		
	}
	
}