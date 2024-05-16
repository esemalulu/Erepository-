/**
 * Module Description
 * 
 * Version    Date            Author           Remarks
 * 1.00       15 Jul 2021     Michael
 *
 */


function RebateCatchSchScript(status, queueid) {
	
	
	
	var searchResults = nlapiSearchRecord(null, '2102');
	if(searchResults){
		
		for (var k = 0; searchResults != null && k < searchResults.length; k++) {
			
		/*	if(k == 1){
				throw new Error("Stop!");
			}*/
			var result = searchResults[k];
			var columnResults = result.getAllColumns();
			var internalId = result.getValue(columnResults[0]);
			var salesOrderRec = nlapiLoadRecord('invoice',internalId);
			
			
			for(var n=0; n < salesOrderRec.getLineItemCount('item'); n++){
				
				var lineNum = parseInt(n) + parseInt(1);
				var rebateParentRecId = salesOrderRec.getLineItemValue('item','custcol_rebate_parent_id',lineNum);
				if(rebateParentRecId){
					var rebateParentRec = nlapiLoadRecord('customrecord_rebate_parent',rebateParentRecId);
					var vendorId = rebateParentRec.getFieldValue('custrecord_rebate_parent_vendor');
					
					if(vendorId){
						salesOrderRec.setLineItemValue('item','custcol_rebate_vendor',lineNum,vendorId);
					}
					
					
				}
				
				
				
				
			}
			
			
			nlapiSubmitRecord(salesOrderRec);
		}
		
	}
	
	
}




