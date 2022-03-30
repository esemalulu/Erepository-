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
function afterSubmitCopySubListsToPartner(type){
	
	try {
		
		if (type == 'create') {
			
			// Get current vendor record and the customer internal id.
			var customerId = nlapiGetFieldValue('custentitycustomer_internal_id');
			var vendorId = nlapiGetRecordId();
			
			if (customerId) {
				
				var columns = new Array();
				var filters = new Array();
				
				// Define column to return.
				columns[0] = new nlobjSearchColumn('internalid');
				
				//---------------Purchasing Review----------------------
				// Define search filter criteria.
				filters[0] = new nlobjSearchFilter('custrecordcustomer_review_fba_c',null,'anyof',customerId);
	
				// Search for Purch Reviews that have customer = customer internal id 
				var searchRecords = nlapiSearchRecord('customrecordpurchasing_review_record_c',null,filters,columns);
				
				var j = 0;
				var recId = '';
				
				// Loop through returned Purch Reviews and attach them to the vendor
				for (var i in searchRecords) {
					
					j++;
						
					recId = searchRecords[i].getId();
						
					nlapiSubmitField('customrecordpurchasing_review_record_c', recId,'custrecordetailz_purch_review_vendor',vendorId);       
					
				}
				
				var total_pr = j;
              //---------------trade shows----------------------
				// Define search filter criteria.
				filters[0] = new nlobjSearchFilter('customrecordtradeshows',null,'anyof',customerId);
	
				// Search for tradeshows that have customer = customer internal id 
				var searchRecords = nlapiSearchRecord('custrecordts_cust',null,filters,columns);
				
				var j = 0;
				var recId = '';
				
				// Loop through returned trade shows and attach them to the vendor
				for (var i in searchRecords) {
					
					j++;
						
					recId = searchRecords[i].getId();
						
					nlapiSubmitField('customrecordtradeshows', recId,'custrecordven_parent',vendorId);       
					
				}
				
				var total_pr = j;
				
				//-------------------------FPA--------------------------
				// Define search filter criteria.
				filters[0] = new nlobjSearchFilter('custrecordfpa_customer_c',null,'anyof',customerId);
	
				// Search for FPA records that have customer = customer internal id 
				var searchRecords = nlapiSearchRecord('customrecordfpa',null,filters,columns);
				
				var j = 0;
				var recId = '';
				
				// Loop through returned FPA records and attach them to the vendor
				for (var i in searchRecords) {
					
					j++;
						
					recId = searchRecords[i].getId();
						
					nlapiSubmitField('customrecordfpa', recId,'custrecordfpa_partner_c',vendorId);       
					
				}
				
				var total_fpa = j;
			
			} else {
				
				customerId = 'na'; total_pr = 0; total_fpa = 0;
			
			}
			
			nlapiLogExecution('DEBUG', 'Copy Sub Lists to Partner', 'type: ' + type + '; customerId: ' + customerId + '; vendorId: ' + vendorId + 
					'; PR records: ' + total_pr + '; FPA records: ' + total_fpa);
			
		}
		
	} catch (err) {
		
		nlapiLogExecution('ERROR', 'Copy Sub Lists to Partner', 'type: ' + type + '; customerId: ' + customerId +  
				'; errName: ' + err.name + '; errMsg: ' + err.message);
		
	}
 
}
