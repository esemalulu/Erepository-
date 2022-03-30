/**
 * Module Description
 * 
 * Version    Date            Author           Remarks
 * 1.00       04 Apr 2016     clayr
 *
 */

/**
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
function afterSubmitCopy3pmToVendor(type){

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
				filters[0] = new nlobjSearchFilter('custrecordprospect_parent',null,'anyof',customerId);
		
				// Search for 3PM that have customer = customer internal id 
				var searchRecords = nlapiSearchRecord('customrecord3pm_requests',null,filters,columns);
		
				var j = 0;
				var recId = '';
		
				// Loop through returned 3PM and attach them to the vendor
				for (var i in searchRecords) {
			
					j++;
		
					recId = searchRecords[i].getId();
		
					nlapiSubmitField('customrecord3pm_requests', recId,'custrecordvendor_parent',vendorId);       
		
				}
			
			} else {
				
				customerId = 'na'; j = 0;
			
			}
	
				nlapiLogExecution('DEBUG', '3PM Records', 'type: ' + type + '; customerId: ' + customerId + '; vendorId: ' + vendorId + '; Total 3pm: ' + j);
	      
		}
	
	} catch (err) {
	
		nlapiLogExecution('ERROR', 'Copy 3PM to Vendor', 'type: ' + type + '; customerId: ' + customerId +  
							'; errName: ' + err.name + '; errMsg: ' + err.message);
	    
	}
  
}
