/**
 * Module Description
 * 
 * Version    Date            Author           Remarks
 * 1.00       07 Jan 2017     billk
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
function copyphonecalltopartner(type){
	
	try {
		
		if (type == 'create' || type == 'edit') {
			
			// Get current vendor record and the customer internal id.
			var recVendor = nlapiGetNewRecord();
			var customerId = recVendor.getFieldValue('custentitycustomer_internal_id');
			var vendorId = nlapiGetRecordId();
			
			if (customerId) {
			
				var columns = new Array();
				var filters = new Array();
				
				// Define column to return and search filter criteria.
				columns[0] = new nlobjSearchColumn('internalid');
				filters[0] = new nlobjSearchFilter('company',null,'is',customerId);
	
				// Search for contacts that have company = customer internal id 
				var searchRecords = nlapiSearchRecord('phonecall',null,filters,columns);
				
				var j = 0;
				var recId = '';
				
				// Loop through returned contacts and attach them to the vendor
				for (var i in searchRecords) {
					
					j++;
						
					recId = searchRecords[i].getId();
						
					nlapiAttachRecord('phonecall', recId, 'vendor', vendorId, {'field': 'company'});       
					
				}
			
			} else {
				
				customerId = 'na'; j = 0;
			
			}
			
			nlapiLogExecution('DEBUG', 'Contact Search Records', 'type: ' + type + '; customerId: ' + customerId + '; vendorId: ' + vendorId + '; Total Contacts: ' + j);
			
		}
		
	} catch (err) {
		
		nlapiLogExecution('ERROR', 'Copy Contacts to Vendor', 'type: ' + type + '; customerId: ' + customerId +  
				'; errName: ' + err.name + '; errMsg: ' + err.message);
		
	}
 
}
