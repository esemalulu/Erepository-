/**
 * Author: js@audaxium.com
 * Date: 5/2/2013
 * Record: Transaction
 * Desc:
 * Fired on After Submit for type of create and edit to update ASA column on all lines to Amount.
 * 
 */


var ALTERNATESALES = 'altsalesamt';
var ITEMAMOUNT = 'amount';

function updItemAsAOnTrxOnAfterSubmit(type) {
	//only execute on edit or create
	try {
		log('debug','execution by', nlapiGetContext().getExecutionContext());
		var updateTrx = false;
		if (type == 'edit' || type == 'create') {
			var trxType = nlapiGetRecordType();
			var trxId = nlapiGetRecordId();
			if (type == 'create') {
				trxId = nlapiGetNewRecord().getId();
			}
			
			//load newly created or edited transaction to see if altsalesamt column exists
			var trxRec = nlapiLoadRecord(trxType, trxId);
			
			var itemColumns = trxRec.getAllLineItemFields('item');
			//test to see if altsalesamt exists on this record
			if (itemColumns.contains('altsalesamt')) {
				var itemcnt = trxRec.getLineItemCount('item');
				//loop through each item
				for (var i=1; i <= itemcnt; i++) {
					log('debug','item type', trxRec.getLineItemValue('item','itemtype',i));
					
					var ignoreItemTypes = ['Description','Subtotal','Discount','Markup'];
					
					if (trxRec.getLineItemValue('item','altsalesamt',i) != trxRec.getLineItemValue('item','amount', i) && !ignoreItemTypes.contains(trxRec.getLineItemValue('item','itemtype',i))) {
						//flag it to update
						if (!updateTrx) {
							updateTrx = true;
						}
						
						trxRec.selectLineItem('item', i);
						trxRec.setCurrentLineItemValue('item', 'altsalesamt', nlapiGetLineItemValue('item','amount', i));
						trxRec.commitLineItem('item');
					}
				}
			}
			
			//if we need to update the record do it
			if (updateTrx) {
				try {
					nlapiSubmitRecord(trxRec, false, true);
				} catch (resubmitErr) {
					log('error','Error updating alt sales amount ('+trxType+'::'+trxId+')', getErrText(resubmitErr));
				}
			}
		}
	} catch (aftersubmitErr) {
		log('error','Error on ASA setter aftersubmit ('+type+'::'+nlapiGetRecordType()+'::'+nlapiGetNewRecord().getId()+')', getErrText(aftersubmitErr));
	}
}
