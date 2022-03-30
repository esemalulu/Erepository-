/**
 * Module Description
 * 
 * Version    Date            Author           Remarks
 * 1.00       30 Jul 2015     clayr
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
function afterSubmitCopyMpmToVendor(type){
	
	try {
		
		if (type == 'create' || type == 'edit') {
			
			// Get current vendor record and the customer internal id.
			var customerId = nlapiGetFieldValue('custentitycustomer_internal_id');
			var vendorId = nlapiGetRecordId();
			
			if (customerId) {
			
				var columns = new Array();
				var filters = new Array();
				
				// Define column to return and search filter criteria.
				columns[0] = new nlobjSearchColumn('internalid');
				filters[0] = new nlobjSearchFilter('custrecordmpm_customer_c',null,'anyof',customerId);
	
				// Search for MPMs that have customer = customer internal id 
				var searchRecords = nlapiSearchRecord('customrecordmarketplace_marketing',null,filters,columns);
				
				var j = 0;
				var recId = '';
				
				// Loop through returned MPMs and attach them to the vendor
				for (var i in searchRecords) {
					
					j++;
						
					recId = searchRecords[i].getId();
						
					nlapiSubmitField('customrecordmarketplace_marketing', recId,'custrecordmmm_vendor',vendorId);       
					
				}
			
			} else {
				
				customerId = 'na'; j = 0;
				
			}
			
			nlapiLogExecution('DEBUG', 'MPM Records', 'type: ' + type + '; customerId: ' + customerId + '; vendorId: ' + vendorId + '; Total MPM: ' + j);
			
		}
		
	} catch (err) {
		
		nlapiLogExecution('ERROR', 'Copy MPM to Vendor', 'type: ' + type + '; customerId: ' + customerId +  
				'; errName: ' + err.name + '; errMsg: ' + err.message);
		
	}
 
}
