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
function afterSubmitCopyProposalsToVendor(type){

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
				filters[0] = new nlobjSearchFilter('custrecordprospect_c',null,'anyof',customerId);
		
				// Search for Proposals that have customer = customer internal id 
				var searchRecords = nlapiSearchRecord('customrecordproposals_c',null,filters,columns);
		
				var j = 0;
				var recId = '';
		
				// Loop through returned Proposals and attach them to the vendor
				for (var i in searchRecords) {
			
					j++;
		
					recId = searchRecords[i].getId();
		
					nlapiSubmitField('customrecordproposals_c', recId,'custrecordpartner_c',vendorId);       
		
				}
			
			} else {
				
				customerId = 'na'; j = 0;
			
			}
	
				nlapiLogExecution('DEBUG', 'Proposal records', 'type: ' + type + '; customerId: ' + customerId + '; vendorId: ' + vendorId + '; Total Proposals: ' + j);
	      
		}
	
	} catch (err) {
	
		nlapiLogExecution('ERROR', 'Copy Proposals to Vendor', 'type: ' + type + '; customerId: ' + customerId +  
							'; errName: ' + err.name + '; errMsg: ' + err.message);
	    
	}
  
}
