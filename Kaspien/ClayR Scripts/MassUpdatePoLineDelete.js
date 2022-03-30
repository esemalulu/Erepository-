/**
 * Module Description
 * 
 * Version    Date            Author           Remarks
 * 1.00       28 Sep 2015     clayr
 *
 */

/**
 * @param {String} recType Record type internal id
 * @param {Number} recId Record internal id
 * @returns {Void}
 */
function massUpdatePoItemDelete(recType, recId) {

	try {
			if (recType == 'purchaseorder') {
				
				// Get current case record and the PO internal id.
				var recPo = nlapiLoadRecord(recType, recId);
		
				nlapiLogExecution('DEBUG', 'Delete PO Items with kill', 'type: ' + type + '; poId: ' + recId);
				
				//nlapiDeleteRecord(recType,recId);
				
				// Loop through the Parent PO Line Items and retrieve the line item values
				for (var i = 1, len = recPo.getLineItemCount('item')+1; i < len; i++) {
					
					var flag = recPo.getLineItemValue('item','custcoletailz_po_killer', i);
					var sku = recPo.getLineItemText('item','item', i);

					if (flag == 'test') {
						
						//recPo.DeleteRecord('item',i);
						nlapiLogExecution('DEBUG', 'Found PO Items with Kill', 'poId: ' + recId + '; Line: ' + i + '; sku: ' + sku + '; flag: ' + flag);
						
					}
				
					nlapiLogExecution('DEBUG', 'Delete PO Items with Kill', 'poId: ' + recId + '; Line: ' + i + '; sku: ' + sku + '; flag: ' + flag);
					
				}
				
			}
			
	} catch (err) {
		
		nlapiLogExecution('ERROR', 'mass remove POs', 'recType: ' + recType+ '; internalId: ' + recId + 
				'; errCode: ' + err.name + '; err: ' + err.message);
			
	}
	
}
