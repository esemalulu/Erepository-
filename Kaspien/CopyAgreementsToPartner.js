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
function CopyAgreementsToPartner(type){

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
				filters[0] = new nlobjSearchFilter('custrecordagreements_customer_c',null,'anyof',customerId);
		
				// Search for Agreements that have customer = customer internal id 
				var searchRecords = nlapiSearchRecord('customrecordcustomrecordetailz_agreement',null,filters,columns);
		
				var j = 0;
				var recId = '';
		
				// Loop through returned Agreements and attach them to the vendor
				for (var i in searchRecords) {
			
					j++;
		
					recId = searchRecords[i].getId();
		
					nlapiSubmitField('customrecordcustomrecordetailz_agreement', recId,'custrecordagreement_partner',vendorId);       
		
				}
			
			} else {
				
			
			
			}
	
				nlapiLogExecution('DEBUG', '3PM Records', 'type: ' + type + '; customerId: ' + customerId + '; vendorId: ' + vendorId + '; Total 3pm: ' + j + 'recid: ' + recId);
	      
		}
	
	} catch (err) {
	
		nlapiLogExecution('ERROR', 'Copy 3PM to Vendor', 'type: ' + type + '; customerId: ' + customerId +  
							'; errName: ' + err.name + '; errMsg: ' + err.message);
	    
	}
  
}
