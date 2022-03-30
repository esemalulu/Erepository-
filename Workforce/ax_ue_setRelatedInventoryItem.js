
function sourceRelInvItemBeforeSubmit(type) {
	
	//only execute on EDIT and CREATE
	if (type=='edit' || type=='create') {
		try {
			
			//1. build list of items on the Transaction to search for related inventory value
			var trxitems = new Array();
			
			var lineItemCount = nlapiGetLineItemCount('item');
			log('debug','line item count', lineItemCount);
			for (var i=1; i<=lineItemCount; i++) {
				//add to trxitems array
				var itemid = nlapiGetLineItemValue('item', 'item', i);
				if (!trxitems.contains(itemid)) {
					trxitems.push(itemid);
				}
			}
			
			//2 ONLY search and grab related inventory 
			if (trxitems.length > 0) {
				var iflt = [new nlobjSearchFilter('internalid', null, 'anyof', trxitems),
				            new nlobjSearchFilter('custitem_related_inventory_item', null, 'noneof','@NONE@')];
				var icol = [new nlobjSearchColumn('internalid'),
				            new nlobjSearchColumn('custitem_related_inventory_item')];
				var irs = nlapiSearchRecord('item', null, iflt, icol);
				
				//3 Loop through and set the value on the matching line
				for (var j=0; irs && j < irs.length; j++) {
					var lineNumber = nlapiFindLineItemValue('item', 'item', irs[j].getValue('internalid'));
					nlapiSetLineItemValue('item', 'custcol_ax_rel_inv_item', lineNumber, irs[j].getValue('custitem_related_inventory_item'));
				}
			}
			
			
		} catch (seterr) {
			log('error','Error setting Related Inventory', nlapiGetRecordType()+' // '+nlapiGetRecordId()+' // '+getErrText(seterr));
		}
	}
}