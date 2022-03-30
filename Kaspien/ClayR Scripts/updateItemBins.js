/**
 * Module Description
 * 
 * Version    Date            Author           Remarks
 * 1.00       31 Aug 2015     clayr
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
function beforeSubmitUpdateItemBins(type){
	
	try {
		
		if (type == 'create' || type == 'edit') {
			
			var recItem = nlapiGetNewRecord();
			
			var recItemId = recItem.getFieldValue('itemid');
						
			if (recItemId.substr(0,3).toUpperCase() !== 'KIT') {
			
				var internalId = recItem.getFieldValue('id');
				
				recItem.setFieldValue('usebins','T');
				
				var columns = new Array();
				var filters = new Array();
				
				// Define columns to return and search filter criteria.
				columns[0] = new nlobjSearchColumn('internalid');
				columns[1] = new nlobjSearchColumn('binnumber');
				columns[2] = new nlobjSearchColumn('inactive');
				columns[3] = new nlobjSearchColumn('location');
				filters[0] = new nlobjSearchFilter('inactive',null,'is','F');
				filters[1] = new nlobjSearchFilter('binnumber',null,'doesnotstartwith','9');
	
				// Search for Bin records and return just the desired columns
				var searchRecords = nlapiSearchRecord('bin',null,filters,columns);
				
				var j = 0;
				
				// Loop through returned records and add each bin to the Item subList.
				for (var i in searchRecords) {
					
					j++;
						
					binInternalId = searchRecords[i].getValue('internalid');
					binLocationId = searchRecords[i].getValue('location');

					recItem.selectNewLineItem('binnumber');
					recItem.setCurrentLineItemValue('binnumber','binnumber', binInternalId);	// internalid
					recItem.setCurrentLineItemValue('binnumber','location', binLocationId);	    // locationid
					
					// Make preferred: AMAZON,Canada,Germany,UK; Prod: 3,272,273,266; SndBx: 1,8,9,10;
					if (binInternalId == '3' || binInternalId == '272' || binInternalId == '273' || binInternalId == '266') {
						recItem.setCurrentLineItemValue('binnumber','preferredbin', 'T');		// preferred bin
					}
					
					recItem.commitLineItem('binnumber');
									
				}
				
				nlapiLogExecution('DEBUG', 'Update Item Bins', 'type: ' + type + '; internalId: ' + internalId + '; Total Bins: ' + j);
				
			}
		}
		
	} catch (err) {
		
		nlapiLogExecution('ERROR', 'Update Item Bins', 'type: ' + type + '; internalId: ' + internalId + 
				'; errName: ' + err.name + '; errMsg: ' + err.message);
		
	}
}
