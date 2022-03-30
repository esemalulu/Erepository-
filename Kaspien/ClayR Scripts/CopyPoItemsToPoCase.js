/**
 * Module Description
 * 
 * Version    Date            Author           Remarks
 * 1.00       14 Sep 2015     clayr
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
function afterSubmitCopyPoItemsToPoCase(type){
	
	try {
		
		if (type == 'create' || type == 'edit') {
			
			// Get current case record and the PO internal id.
			var caseId = nlapiGetRecordId();
			var poId = nlapiGetFieldValue('custrecordpo');
			var recPo = nlapiLoadRecord('purchaseorder',poId);

			nlapiLogExecution('DEBUG', 'Copy PO Items to Case', 'type: ' + type + '; caseId: ' + caseId + '; poId: ' + poId);
			
			// Loop through the Parent PO Line Items and retrieve the line item values
			for (var i = 1, len = recPo.getLineItemCount('item')+1; i < len; i++) {
				
				var name = recPo.getLineItemText('item','item', i);
				var nameId = recPo.getLineItemValue('item','item', i);
				var quantity = recPo.getLineItemValue('item','quantity', i);
				var rate = recPo.getLineItemValue('item','rate', i);
				var description = recPo.getLineItemValue('item','description', i);
				
				// Create a custom PO Case Line Item record				
				var recCaseItem = nlapiCreateRecord('customrecordetailzpo_case_lines');
				recCaseItem.setFieldValue('custrecordetailzpo',caseId);
				recCaseItem.setFieldValue('custrecordetailzsku',name);
				recCaseItem.setFieldValue('custrecord9',quantity);
				recCaseItem.setFieldValue('custrecord10',rate);
				var caseItemId = nlapiSubmitRecord(recCaseItem,false,true);
			
				nlapiLogExecution('DEBUG', 'Copy PO Items to Case', 'poId: ' + poId + '; Line: ' + i + '; name: ' + name + '; caseItemId: ' + caseItemId);
				
			}
			
		}
		
	} catch (err) {
		
		nlapiLogExecution('ERROR', 'Copy PO Items to Case', 'type: ' + type + '; caseId: ' + caseId +  
				'; errName: ' + err.name + '; errMsg: ' + err.message);
		
	}
	
}
