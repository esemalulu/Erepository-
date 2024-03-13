/**
 * Module Description
 * 
 * Version    Date            Author           Remarks
 * 1.00       17 May 2013     mburstein
 *
 */

/**
 * 
 * This ensures that new HBRs are created with Approval Status = F, even if they are copied.
 * 
 * The recordType (internal id) corresponds to the "Applied To" record in your script deployment. 
 * @appliedtorecord customrecordr7appliancebuildrequest
 * 
 * @param {String} type Operation types: create, edit, delete, xedit
 *                      approve, reject, cancel (SO, ER, Time Bill, PO & RMA only)
 *                      pack, ship (IF)
 *                      markcomplete (Call, Task)
 *                      reassign (Case)
 *                      editforecast (Opp, Estimate)
 * @returns {Void}
 */
function beforeSubmit(type){
	if(type == 'create' || type == 'copy'){
		nlapiSetFieldValue('custrecordr7appbuildapprovalstatus','F');
	}
}
