/*
 * @author efagone
 */

function pageInit(){
	
	window.onbeforeunload = function() {};
		
}

function fieldChanged(type, name, linenum){
	var userId = nlapiGetUser();
	
	if (name == 'custpage_customer') {
	
		var eventSuiteletURL = nlapiResolveURL('SUITELET', 'customscriptr7livemeetinglanding_suitele', 'customdeployr7livemeetinglanding_suitele', false);
		eventSuiteletURL = eventSuiteletURL + '&custparam_customer=' + nlapiGetFieldValue(name) + '&custparam_date=' + nlapiGetFieldValue('custpage_date') + '&custparam_time=' + nlapiGetFieldValue('custpage_time') + '&custparam_endtime=' + nlapiGetFieldValue('custpage_endtime') + '&custparam_employeelist=' + nlapiGetFieldValue('custpage_employeelist');
		
		window.location = eventSuiteletURL;
		
	}
	
	var isPartner = nlapiGetFieldValue('custpage_ispartner');
	
	if (name == 'custpage_eventtype' && isPartner == 'F') {
	
		var eventType = nlapiGetFieldValue('custpage_eventtype');
		if (eventType == 2853803) { //internal meeting
			nlapiSetFieldMandatory('custpage_opportunity', false);
		}
		else {
			nlapiSetFieldMandatory('custpage_opportunity', true);
		}
	}
}