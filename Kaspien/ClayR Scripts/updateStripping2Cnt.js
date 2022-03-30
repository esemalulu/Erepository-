/**
 * Module Description
 * 
 * Version    Date            Author           Remarks
 * 1.00       06 Aug 2015     clayr
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
function afterSubmitUpdateStripping2Cnt(type){
	
	try {
	
		if (type == 'create' || type == 'edit' || type == 'delete') {
	
			// Get parent vendor id of current record
			var venParent = nlapiGetFieldValue('custrecordvendor_stripping2_c');
			
			var columns = new Array();
			var filters = new Array();
			
			// Define column to return and search filter criteria.
			columns[0] = new nlobjSearchColumn('internalid');
			columns[1] = new nlobjSearchColumn('custrecordetailzskus_added');
			filters[0] = new nlobjSearchFilter('custrecordvendor_stripping2_c',null,'is',venParent);

			// Search for Stripping 2.0 records that have vendor = parent 
			var searchRecords = nlapiSearchRecord('customrecordetailz_stripping_2',null,filters,columns);
			
			var j = 0;
			var skuTotal = 0;
			
			// Loop through returned records and total the Sku count.
			for (var i in searchRecords) {
				
				j++;
					
				skuCount = searchRecords[i].getValue('custrecordetailzskus_added');
				
				if (skuCount == "") skuCount = 0;
				
				skuTotal += parseInt(skuCount);
				
			}
			
			nlapiSubmitField('vendor',venParent,'custentityetailzstrip2point0historical',skuTotal);
			
			nlapiLogExecution('DEBUG', 'Update Historical Sku Count', 'type: ' + type + '; Vendor: ' + venParent + 
					'; skuTotal: ' + skuTotal + '; Total Records: ' + j);
		   
		}
	
	} catch (err) {
		
		nlapiLogExecution('ERROR', 'Update Historical Sku Count', 'type: ' + type + '; Vendor: ' + venParent +  
				'; errName: ' + err.name + '; errMsg: ' + err.message);
		
	}
	
}
