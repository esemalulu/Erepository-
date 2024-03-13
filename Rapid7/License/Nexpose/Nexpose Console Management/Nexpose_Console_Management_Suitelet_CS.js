/*
 * @author efagone
 */

function r7_pageInit(){
	//window.onbeforeunload = function() {};
	
	nlapiSelectLineItem('custpage_licenselist', 1);
	//nlapiSetFieldValue('custpage_totalips', getTotalLineIPs());
	//nlapiSetFieldValue('custpage_totalhips', getTotalLineHIPs());

}

function r7_saveRecord(){

	if (nlapiGetLineItemCount('custpage_licenselist') > 3) {
		//alert('Number of console are limited to 3.');
		//return false;
	}
	
	if (getTotalLineIPs() != parseInt(nlapiGetFieldValue('custpage_totalips'))) {
		alert('Total IP count from lines must equal purchased IP count of ' + nlapiGetFieldValue('custpage_totalips') + '. You currently only have ' + getTotalLineIPs() + ' IPs allocated.');
		return false;
	}
	
	if (getTotalLineHIPs() != parseInt(nlapiGetFieldValue('custpage_totalhips'))) {
		alert('Total Hosted IP count from lines must equal purchased Hosted IP count of ' + nlapiGetFieldValue('custpage_totalhips') + '. You currently only have ' + getTotalLineHIPs() + ' IPs allocated.');
		return false;
	}
	
	if (!confirm('Submitting this will make changes to consoles immediately. This process can take some time. Do not close the browser window or use your back/forward buttons.')) {
		return false;
	}
	
	return true;
}

function r7_fieldChanged(type, name, linenum){

	if (name == 'custpageliclst_numberips') {
		var originalVal = nlapiGetCurrentLineItemValue('custpage_licenselist', 'custpageliclst_numberips_orig') || 0;
		var newVal = nlapiGetCurrentLineItemValue('custpage_licenselist', 'custpageliclst_numberips') || 0;
		
		nlapiSetCurrentLineItemValue('custpage_licenselist', 'custpageliclst_numberips_delta', parseInt(newVal) - parseInt(originalVal), false);
	}
	
	if (name == 'custpageliclst_numberhips') {
		var originalVal = nlapiGetCurrentLineItemValue('custpage_licenselist', 'custpageliclst_numberhips_orig') || 0;
		var newVal = nlapiGetCurrentLineItemValue('custpage_licenselist', 'custpageliclst_numberhips') || 0;
		
		nlapiSetCurrentLineItemValue('custpage_licenselist', 'custpageliclst_numberhips_delta', parseInt(newVal) - parseInt(originalVal), false);
	}
}

function r7_validateField(type, name, linenum){

	if (name == 'custpageliclst_numberips') {
		var newVal = nlapiGetCurrentLineItemValue('custpage_licenselist', 'custpageliclst_numberips') || 0;
		if (parseInt(newVal) < 0) {
			alert('IPs cannot be negative.');
			return false;
		}
	}
	
	if (name == 'custpageliclst_numberhips') {
		var newVal = nlapiGetCurrentLineItemValue('custpage_licenselist', 'custpageliclst_numberhips') || 0;
		if (parseInt(newVal) < 0) {
			alert('IPs cannot be negative.');
			return false;
		}
	}
	return true;
}

function r7_lineInit(type){

	nlapiDisableLineItemField('custpage_licenselist', 'custpageliclst_numberips', false);
	nlapiDisableLineItemField('custpage_licenselist', 'custpageliclst_numberhips', false);
	nlapiDisableLineItemField('custpage_licenselist', 'custpageliclst_contact', false);
	
	var currentId = nlapiGetCurrentLineItemValue('custpage_licenselist', 'custpageliclst_license');
	
	if (currentId == null || currentId == '') {
		var totalIPs_other = getTotalLineIPs(nlapiGetCurrentLineItemIndex('custpage_licenselist'));
		if ((nlapiGetCurrentLineItemIndex('custpage_licenselist') <= 3 || nlapiGetUser() == 239662971) && parseInt(nlapiGetFieldValue('custpage_totalips')) - totalIPs_other > 0) {
			nlapiSetCurrentLineItemValue('custpage_licenselist', 'custpageliclst_license_txt', 'To be created...', false);
            nlapiSetCurrentLineItemValue('custpage_licenselist', 'custpageliclst_licensekey', 'To be created...', false);
            nlapiSetCurrentLineItemValue('custpage_licenselist', 'custpageliclst_renewwithparent', 'T', false);
			
			// DEFAULT LINE TO REMAINING IPs
			nlapiSetCurrentLineItemValue('custpage_licenselist', 'custpageliclst_numberips', parseInt(nlapiGetFieldValue('custpage_totalips')) - totalIPs_other, true);
			
			var totalHIPs_other = getTotalLineHIPs(nlapiGetCurrentLineItemIndex('custpage_licenselist'));
			nlapiSetCurrentLineItemValue('custpage_licenselist', 'custpageliclst_numberhips', parseInt(nlapiGetFieldValue('custpage_totalhips')) - totalHIPs_other, true);
			
			nlapiSetCurrentLineItemValue('custpage_licenselist', 'custpageliclst_contact', nlapiGetFieldValue('custpage_masterliccontact'), true);
		}
		else {
			nlapiDisableLineItemField('custpage_licenselist', 'custpageliclst_numberips', true);
			nlapiDisableLineItemField('custpage_licenselist', 'custpageliclst_numberhips', true);
			nlapiDisableLineItemField('custpage_licenselist', 'custpageliclst_contact', true);
		}
		
	}
}


function r7_validateLine(type){

	if (nlapiGetLineItemCount('custpage_licenselist') > 3 || nlapiGetCurrentLineItemIndex('custpage_licenselist') == 4) {
		//alert('Number of console are limited to 3.');
		//return false;
	}
	
	var totalIPs_other = getTotalLineIPs(nlapiGetCurrentLineItemIndex('custpage_licenselist'));
	if (parseInt(nlapiGetFieldValue('custpage_totalips')) - totalIPs_other < 0){
		alert('0 IPs remaining to be moved. Please take some from another console.');
		return false;
	}
	
	var totalIPs_other = getTotalLineIPs(nlapiGetCurrentLineItemIndex('custpage_licenselist'));
	if (parseInt(nlapiGetCurrentLineItemValue('custpage_licenselist', 'custpageliclst_numberips')) + totalIPs_other > parseInt(nlapiGetFieldValue('custpage_totalips'))) {
		alert('Too many IPs. Setting value to remaining IPs');
		nlapiSetCurrentLineItemValue('custpage_licenselist', 'custpageliclst_numberips', parseInt(nlapiGetFieldValue('custpage_totalips')) - totalIPs_other, true);
		return false;
	}
	
	var totalHIPs_other = getTotalLineHIPs(nlapiGetCurrentLineItemIndex('custpage_licenselist'));
	if (parseInt(nlapiGetCurrentLineItemValue('custpage_licenselist', 'custpageliclst_numberhips')) + totalHIPs_other > parseInt(nlapiGetFieldValue('custpage_totalhips'))) {
		alert('Too many IPs. Setting value to remaining Hosted IPs');
		nlapiSetCurrentLineItemValue('custpage_licenselist', 'custpageliclst_numberhips', parseInt(nlapiGetFieldValue('custpage_totalhips')) - totalHIPs_other, true);
		return false;
	}
	
	if (parseInt(nlapiGetCurrentLineItemValue('custpage_licenselist', 'custpageliclst_numberhips')) > parseInt(nlapiGetCurrentLineItemValue('custpage_licenselist', 'custpageliclst_numberips'))) {
		alert('Hosted IPs cannot be greater than Number of IPs.');
		return false;
	}
	
	return true;
}

function r7_validateDelete(type){

	var currentId = nlapiGetCurrentLineItemValue('custpage_licenselist', 'custpageliclst_license');
	
	if (currentId != null && currentId != '') {
		alert('You cannot remove an existing license. Instead set the number of IPs to 0.');
		return false;
	}
	return true;
}

function r7_validateInsert(type){

	if (nlapiGetLineItemCount('custpage_licenselist') >= 3 && nlapiGetUser() != 239662971) {
		alert('Number of console are limited to 3.');
		return false;
	}
	return true;
}

function getTotalLineIPs(ignoreLineNum){

	var lineItemCount = nlapiGetLineItemCount('custpage_licenselist');
	var runningTotal = 0;
	
	for (var i = 1; i <= lineItemCount; i++) {
		
		if (ignoreLineNum == i){
			continue;
		}
		var numberOfIPs = parseInt(nlapiGetLineItemValue('custpage_licenselist', 'custpageliclst_numberips', i));
		runningTotal += numberOfIPs;
	}
	
	return runningTotal;
}

function getTotalLineHIPs(ignoreLineNum){

	var lineItemCount = nlapiGetLineItemCount('custpage_licenselist');
	var runningTotal = 0;
	
	for (var i = 1; i <= lineItemCount; i++) {
		
		if (ignoreLineNum == i){
			continue;
		}
		var numberOfIPs = parseInt(nlapiGetLineItemValue('custpage_licenselist', 'custpageliclst_numberhips', i));
		runningTotal += numberOfIPs;
	}
	
	return runningTotal;
}