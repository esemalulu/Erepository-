function afterSubmitRecord(type) {
	if(type != 'edit' && type != 'xedit' && type != 'create') return false;
	
	try {
		var vendorBill = nlapiLoadRecord(nlapiGetRecordType(), nlapiGetRecordId());
		updatePOReference(vendorBill);
		var expense = JSON.parse(JSON.stringify(vendorBill)).expense;
		nlapiLogExecution('DEBUG', "Start of the Mapping Process for the Billing Id...", "Bill Id::" + nlapiGetRecordId());
		
		if(!expense || expense.length <= 0) return;
		var memoPOs = {}, nonMemoPOs = {};
		expense.forEach(function(item, index){
			if(item.account.name !== '5249 Direct COGS : Freight') return;
			
			nlapiLogExecution('DEBUG', "Matched the case '5249 Direct COGS : Freight' for the Expense Item", JSON.stringify(item));
			if(!item.hasOwnProperty('custcol_po_line')) return;
			if(item.hasOwnProperty('memo')) {
				if(memoPOs[item.custcol_po_line.internalid] !== undefined) 
					memoPOs[item.custcol_po_line.internalid] = parseFloat(memoPOs[item.custcol_po_line.internalid]) + parseFloat(item.amount);
				else memoPOs[item.custcol_po_line.internalid] = item.amount;
			} else {
				if(nonMemoPOs[item.custcol_po_line.internalid] !== undefined) 
					nonMemoPOs[item.custcol_po_line.internalid] = parseFloat(nonMemoPOs[item.custcol_po_line.internalid]) + parseFloat(item.amount);
				else nonMemoPOs[item.custcol_po_line.internalid] = item.amount;
			}
		});
		nlapiLogExecution('DEBUG', "nonMemoPOs", JSON.stringify(nonMemoPOs));
		nlapiLogExecution('DEBUG', "memoPOs", JSON.stringify(memoPOs));
		if(Object.keys(memoPOs).length)	executeMemoPOs(memoPOs);
		if(Object.keys(nonMemoPOs).length) executeNonMemoPOs(nonMemoPOs);

		nlapiLogExecution('DEBUG', "End of the Mapping Process for the Billing Id...", "Bill Id::" + nlapiGetRecordId());
	} catch(ex) {
		nlapiLogExecution('DEBUG', "ERROR::", ex.message);
	}
}

function executeNonMemoPOs(nonMemoPOs){
	for (var poid in nonMemoPOs) {
		var poRecord = nlapiLoadRecord('purchaseorder', poid);
		poRecord.setFieldValue('custbody_invoiced_shipping_cost', nonMemoPOs[poid]);
		nlapiSubmitRecord(poRecord, false, true);
	}
}

function executeMemoPOs(memoPOs){
	for (var poid in memoPOs) {
		var poRecord = nlapiLoadRecord('purchaseorder', poid);
		poRecord.setFieldValue('custbody_supplier_fee', memoPOs[poid]);
		poRecord.setFieldValue('custbody_invoiced_shipping_cost', "");
		nlapiSubmitRecord(poRecord, false, true);
	}
}

function updatePOReference(vendorBill) {
	try {
		var relatedRecordsCount = vendorBill.getLineItemCount('purchaseorders');
		nlapiLogExecution('DEBUG', "relatedRecordsCount", relatedRecordsCount);
		if(relatedRecordsCount <= 0) return;
		var poId = [];
		for(i=1; i <= relatedRecordsCount; i++) {
			nlapiLogExecution('DEBUG', "purchaseorder number", vendorBill.getLineItemValue('purchaseorders','poid',i));
			poId.push(vendorBill.getLineItemValue('purchaseorders','poid',i));
		}
		nlapiLogExecution('DEBUG', "PO Id...", "PO Id::" + poId.join(" "));
		if(!poId) return;
		vendorBill.setFieldValue('custbody_po_reference', poId.join(" "));
		nlapiSubmitRecord(vendorBill, false, true);
	} catch(ex) {
		nlapiLogExecution('DEBUG', "ERROR::", ex.message);
	}
}