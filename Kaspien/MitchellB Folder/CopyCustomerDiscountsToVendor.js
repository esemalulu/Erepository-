/**
 * Module Description
 * 
 * Version    Date            Author           Remarks
 * 1.00       18 Mar 2016     mitchellb
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
function afterSubmitCopyDiscountsToVendor(type){
	
	try {
		
		if (type == 'create' || type == 'edit') {
			
			// Get current vendor record and the customer internal id.
			var recVendor = nlapiGetNewRecord();
			var customerId = recVendor.getFieldValue('custentitycustomer_internal_id');
			var vendorId = nlapiGetRecordId();
			
			var columns = new Array();
			var filters = new Array();
			
			// Define column to return and search filter criteria.
			columns[0] = new nlobjSearchColumn('internalid');
			filters[0] = new nlobjSearchFilter('company',null,'is',customerId);

			// Search for discount records that have company = customer internal id 
			var searchRecords = nlapiSearchRecord('customrecorddiscounts',null,filters,columns);
			
			var j = 0;
			var recId = '';
			
			// Loop through returned discount records and attach them to the vendor
			for (var i in searchRecords) {
				
				j++;
					
				recId = searchRecords[i].getId();
					
				nlapiAttachRecord('customrecorddiscounts', recId, 'vendor', vendorId, {'field': 'company'});     
				
			}
			
			nlapiLogExecution('DEBUG', 'Discount Records', 'type: ' + type + '; customerId: ' + customerId + '; vendorId: ' + vendorId + '; Discount Records: ' + j);
			
		}
		
	} catch (err) {
		
		nlapiLogExecution('ERROR', 'Copy Discounts to Vendor', 'type: ' + type + '; customerId: ' + customerId +  
				'; errName: ' + err.name + '; errMsg: ' + err.message);
		
	}
 
}
