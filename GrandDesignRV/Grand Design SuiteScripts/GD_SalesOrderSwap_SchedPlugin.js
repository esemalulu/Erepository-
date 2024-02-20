/**
 * Default implementation of the scheduled script of the SO Swap suitelet.
 * 
 * Version    Date            Author           Remarks
 * 1.00       19 Dec 2016     Jacob Shetler
 *
 */

/**
 * @param {String} type Context Types: scheduled, ondemand, userinterface, aborted, skipped
 * @returns {Void}
 */
function runScheduled(type) {
	//Get the things to swap and the orders to update.
	var context = nlapiGetContext();
	var optsArr = JSON.parse(context.getSetting('SCRIPT', 'custscriptrvs_soswap_opts'));
	var soArr = JSON.parse(context.getSetting('SCRIPT', 'custscriptrvs_soswap_sos'));
	
	for(var i = 0; i < soArr.length; i++) {
		if (context.getRemainingUsage() < 50) nlapiYieldScript();
		
		//Update the order
		var soRec = nlapiLoadRecord('salesorder', soArr[i]);
		var priceLevel = soRec.getFieldValue('custbodyrvsmsrppricelevel');
		for(var j = 0; j < optsArr.length; j++) {
			var curOpt = optsArr[j];
			
			//Update the body field if it is a decor
			if (curOpt.type == 'decor') {
				curOpt.oldItem = soRec.getFieldValue('custbodyrvsdecor');
				soRec.setFieldValue('custbodyrvsdecor', curOpt.newItem);
				soRec.setFieldValue('custbodyrvspreviousdecorid', curOpt.newItem);
			}
			
			//Update the line if the old item exists
			var optIdx = soRec.findLineItemValue('item', 'item', curOpt.oldItem);
			if (optIdx > 0) {
				if (curOpt.newItem.length > 0 && curOpt.newItem != '-1') {
					//Do a swap if the new item exists.
					soRec.selectLineItem('item', optIdx);
					soRec.setCurrentLineItemValue('item', 'item', curOpt.newItem);
					soRec.setCurrentLineItemValue('item', 'custcolrvsmsrpamount', GetItemAmountForPriceLevel(curOpt.newItem, priceLevel));
					soRec.commitLineItem('item');
				}
				else {
					//Else remove that option
					soRec.removeLineItem('item', optIdx);
				}
			}
			else if ((curOpt.oldItem.length == 0 || curOpt.oldItem == '-1' || optIdx < 1) && (curOpt.newItem.length > 0 && curOpt.newItem != '-1')) {
				//If we can't find the old option or the old option wasn't set AND the new item is set, then add the item to the end of the Sales Order.
				soRec.selectNewLineItem('item');
				soRec.setCurrentLineItemValue('item', 'quantity', 1);
				soRec.setCurrentLineItemValue('item', 'item', curOpt.newItem);
				soRec.setCurrentLineItemValue('item', 'custcolrvsmsrpamount', GetItemAmountForPriceLevel(curOpt.newItem, priceLevel));
				soRec.commitLineItem('item');
			}
		}
		
		nlapiSubmitRecord(soRec, false, true);
		context.setPercentComplete((((i+1)/soArr.length) * 100).toFixed(2));
	}
}
