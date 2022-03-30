function FieldChanged(type, name) {
	// Execute this code when all the fields from item are sourced on the sales order.
	if(type !== 'recmachcustrecord_comp_compliance') return false;
	if(name === 'custrecord_comp_sku_location') {
		try {
			var inventoryitem = nlapiLoadRecord('inventoryitem', nlapiGetCurrentLineItemValue('recmachcustrecord_comp_compliance','custrecord_comp_sku'));
			var avgCost = 0;
			for(index=1; index<= inventoryitem.getLineItemCount('locations'); index ++) {
				if(inventoryitem.getLineItemValue('locations', 'location', index) == nlapiGetCurrentLineItemValue('recmachcustrecord_comp_compliance','custrecord_comp_sku_location')) {
					avgCost = inventoryitem.getLineItemValue('locations', 'averagecostmli', index);
					break;
				}
			}
			avgCost = (!avgCost ? 0 : parseFloat(avgCost).toFixed(2));
			nlapiSetCurrentLineItemValue('recmachcustrecord_comp_compliance', 'custrecordcomp_sku_average_cost', avgCost);
		} catch(ex) {
			nlapiLogExecution('DEBUG', "ERROR::", ex.message);
		}	
	}
	else if(name === 'custrecord_comp_sku_quantity') {
		try {
			var quantity = nlapiGetCurrentLineItemValue('recmachcustrecord_comp_compliance','custrecord_comp_sku_quantity');
			var avgCost = nlapiGetCurrentLineItemValue('recmachcustrecord_comp_compliance','custrecordcomp_sku_average_cost');
			quantity = (!quantity ? 0 : quantity);
			avgCost = (!avgCost ? 0 : parseFloat(avgCost).toFixed(2));
			nlapiSetCurrentLineItemValue('recmachcustrecord_comp_compliance', 'custrecordcomp_sku_total_value', parseFloat((!quantity ? 0 : quantity) * avgCost).toFixed(2));
		} catch(ex) {
			nlapiLogExecution('DEBUG', "ERROR::", ex.message);
		}
	}
}