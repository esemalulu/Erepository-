/*
 * Module Description
 * 
 * Version    Date            Author           Remarks
 * 1.00       24 Feb 2014     efagone
 *
 */

function pageInit(){

	window.onbeforeunload = null;
	
	var lineCount = nlapiGetLineItemCount('custpage_lineitemlist');
	var needsManualReview = false;
	for (var i = 1; i <= lineCount; i++) {
		
		var quantity = nlapiGetLineItemValue('custpage_lineitemlist', 'custpage_lineitem_quantity', i);
		var amount = nlapiGetLineItemValue('custpage_lineitemlist', 'custpage_lineitem_amount', i);
		var proratedAmount = nlapiGetLineItemValue('custpage_lineitemlist', 'custpage_lineitem_amountprorated', i);
		var bundleTotal = nlapiGetLineItemValue('custpage_lineitemlist', 'custpage_lineitem_bundletotal', i);
		var customESPAmount = nlapiGetLineItemValue('custpage_lineitemlist', 'custpage_lineitem_customespamt', i);
		var defaultCustomESPPercent = nlapiGetLineItemValue('custpage_lineitemlist', 'custpage_lineitem_customesppercent', i);
		var isCustomESPList = nlapiGetLineItemValue('custpage_lineitemlist', 'custpage_lineitem_customespprorated', i);
		
		if (isCustomESPList == 'T') {
			customESPAmount = 0;
			if (proratedAmount != null && proratedAmount != '') {
				customESPAmount = Math.round((parseFloat(proratedAmount) / quantity) * 100) / 100;
			}
			nlapiSetLineItemValue('custpage_lineitemlist', 'custpage_lineitem_customespamt', i, Math.abs(customESPAmount));
			nlapiSetLineItemDisabled('custpage_lineitemlist', 'custpage_lineitem_customesppercent', true, i);
			nlapiSetLineItemDisabled('custpage_lineitemlist', 'custpage_lineitem_customespamt', true, i);
		}
		else 
			if (defaultCustomESPPercent != null && defaultCustomESPPercent != '') {
				customESPAmount = Math.round((parseFloat(bundleTotal) * (parseFloat(defaultCustomESPPercent) / 100)) * 100) / 100;
				nlapiSetLineItemValue('custpage_lineitemlist', 'custpage_lineitem_customespamt', i, customESPAmount.toFixed(2), false);
				nlapiSetLineItemDisabled('custpage_lineitemlist', 'custpage_lineitem_customesppercent', true, i);
				nlapiSetLineItemDisabled('custpage_lineitemlist', 'custpage_lineitem_customespamt', true, i);
			}
			else {
				needsManualReview = true;
				if (customESPAmount == null || customESPAmount == '') {
					nlapiSetLineItemValue('custpage_lineitemlist', 'custpage_lineitem_customespamt', i, '', false);
					nlapiSetLineItemValue('custpage_lineitemlist', 'custpage_lineitem_customesppercent', i, '', false);
				}
				else {
					nlapiSetLineItemValue('custpage_lineitemlist', 'custpage_lineitem_customesppercent', i, '', true);
					if (bundleTotal != null && bundleTotal != '' && bundleTotal != 0){
						var percent = Math.round(parseFloat(customESPAmount) / (parseFloat(bundleTotal)) * 10000) / 100;
						nlapiSetLineItemValue('custpage_lineitemlist', 'custpage_lineitem_customesppercent', i, percent.toFixed(Math.max(1, (percent.toString().split('.')[1] || []).length)) + '%', true);
					}
				}
			}
	}
	
	if (!needsManualReview) {
		//document.forms["main_form"].submit();
	}
	return;
}

function fieldChanged(type, name, linenum){

	if (type == 'custpage_lineitemlist') {
		var bundleTotal = nlapiGetLineItemValue('custpage_lineitemlist', 'custpage_lineitem_bundletotal', linenum);
		
		if (name == 'custpage_lineitem_customesppercent') {
		
			var percent = nlapiGetLineItemValue('custpage_lineitemlist', 'custpage_lineitem_customesppercent', linenum);
			if (percent == null || percent == '') {
				nlapiSetLineItemValue('custpage_lineitemlist', 'custpage_lineitem_customespamt', linenum, '', false);
				nlapiSetLineItemValue('custpage_lineitemlist', 'custpage_lineitem_customesppercent', linenum, '', false);
				return;
			}
			else {
				var customESPAmount = Math.round((parseFloat(bundleTotal) * (parseFloat(percent) / 100)) * 100) / 100;
				nlapiSetLineItemValue('custpage_lineitemlist', 'custpage_lineitem_customespamt', linenum, customESPAmount.toFixed(2), false);
			}
		}
		
		if (name == 'custpage_lineitem_customespamt') {
		
			var customESPAmount = nlapiGetLineItemValue('custpage_lineitemlist', 'custpage_lineitem_customespamt', linenum);
			if (customESPAmount == null || customESPAmount == '') {
				nlapiSetLineItemValue('custpage_lineitemlist', 'custpage_lineitem_customespamt', linenum, '', false);
				nlapiSetLineItemValue('custpage_lineitemlist', 'custpage_lineitem_customesppercent', linenum, '', false);
				return;
			}
			else {
				nlapiSetLineItemValue('custpage_lineitemlist', 'custpage_lineitem_customesppercent', linenum, '', true);
				if (bundleTotal != null && bundleTotal != '' && bundleTotal != 0){
					var percent = Math.round(parseFloat(customESPAmount) / (parseFloat(bundleTotal)) * 10000) / 100;
					nlapiSetLineItemValue('custpage_lineitemlist', 'custpage_lineitem_customesppercent', linenum, percent.toFixed(Math.max(1, (percent.toString().split('.')[1] || []).length)) + '%', true);
				}
			}
		}
	}
}