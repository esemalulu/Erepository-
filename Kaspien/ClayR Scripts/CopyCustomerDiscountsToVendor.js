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
function afterSubmitCopyDiscountsToVendor(type){
	
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
				filters[0] = new nlobjSearchFilter('custrecordcustomer_discount_c',null,'anyof',customerId);
	
				// Search for Discounts that have customer = customer internal id 
				var searchRecords = nlapiSearchRecord('customrecorddiscounts',null,filters,columns);
				
				var j = 0;
				var recId = '';
				var recDiscount = null;
				var idDiscount = 0;
				
				// Loop through returned Discounts and attach them to the vendor
				for (var i in searchRecords) {
					
					j++;
						
					recId = searchRecords[i].getId();
					
					nlapiSubmitField('customrecorddiscounts', recId,'custrecordvendor_discount_c',vendorId);
					
				}
			
			} else {
				
				customerId = 'na'; j = 0;
				
			}
			
			nlapiLogExecution('DEBUG', 'Discount Records', 'type: ' + type + '; customerId: ' + customerId + '; vendorId: ' + vendorId + '; Total Discounts: ' + j);
			
		}
		
	} catch (err) {
		
		nlapiLogExecution('ERROR', 'Copy Discounts to Vendor', 'type: ' + type + '; customerId: ' + customerId +  
				'; errName: ' + err.name + '; errMsg: ' + err.message);
		
	}
 
}
