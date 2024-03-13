/*
 * @author efagone
 */

function pageInit(){
	
	window.onbeforeunload = function(){};
	
	if (nlapiGetFieldValue('custpage_noemail') == 'F') {
		nlapiDisableField('custpage_sendemailother', true);
	}
	else {
		nlapiDisableField('custpage_sendemailother', false);
	}
}

function fieldChanged(type, name, linenum){

	if (name == 'custpage_noemail') {
	
		if (nlapiGetFieldValue('custpage_noemail') == 'T') {
			nlapiDisableField('custpage_sendemailother', false);
		}
		else {
			nlapiDisableField('custpage_sendemailother', true);
			nlapiSetFieldValue('custpage_sendemailother', '', false);
		}
	}
	
	if (name == 'custpage_contact' && nlapiGetFieldValue('custpage_contact') != null && nlapiGetFieldValue('custpage_contact') != '') {
	
		var suiteletURL = nlapiResolveURL('SUITELET', 'customscriptr7createlicensefromtemplate', 'customdeployr7createlicensefromtemplate', false);
		suiteletURL += '&custparam_customer=' + nlapiGetFieldValue('custpage_customer');
		suiteletURL += '&custparam_opportunity=' + nlapiGetFieldValue('custpage_opportunity');
		suiteletURL += '&custparam_contact=' + nlapiGetFieldValue('custpage_contact');
		suiteletURL += '&custparam_contacteditable=' + 'T';

		var salesOrderId = nlapiGetFieldValue('custpage_sales_order');
		if (salesOrderId) {
			suiteletURL += '&custparam_sales_order=' + salesOrderId;
		}

		window.location = suiteletURL;
	}
}
