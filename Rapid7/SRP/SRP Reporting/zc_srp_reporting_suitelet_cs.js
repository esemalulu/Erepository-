/*
 * Module Description
 * 
 * Version    Date            Author           Remarks
 * 1.00       17 Jun 2016     efagone
 *
 */

function zc_pageInit(type){
	setTimeout(function(){
		jQuery('.zc_table_container').show();
	}, 600);
	
	jQuery('.zc_uir_filters_header').on('click', function(){
		switchCollapsed($(this).parent(), 'collapsed');
	});
}

function zc_saveRecord(type){

	return true;
}

function zc_reset(){
	var suiteletURL = nlapiResolveURL('SUITELET', 'customscriptzc_srp_reporting_suitelet', 'customdeployzc_srp_reporting_suitelet', false);
	window.onbeforeunload = null;
	window.location = suiteletURL;
}

function zc_refresh(){
	var suiteletURL = nlapiResolveURL('SUITELET', 'customscriptzc_srp_reporting_suitelet', 'customdeployzc_srp_reporting_suitelet', false);
	if (nlapiGetFieldValue('custpage_flter_revreporttype')) {
		suiteletURL += '&custparam_reportingtype=' + nlapiGetFieldValue('custpage_flter_revreporttype');
	}
	if (nlapiGetFieldValue('custpage_flter_date_from')) {
		suiteletURL += '&custparam_dfrom=' + nlapiGetFieldValue('custpage_flter_date_from');
	}
	if (nlapiGetFieldValue('custpage_flter_date_to')) {
		suiteletURL += '&custparam_dto=' + nlapiGetFieldValue('custpage_flter_date_to');
	}
	if (nlapiGetFieldValue('custpage_flter_jobcontains')) {
		suiteletURL += '&custparam_jobcontains=' + nlapiGetFieldValue('custpage_flter_jobcontains');
	}
	if (nlapiGetFieldValue('custpage_flter_customercontains')) {
		suiteletURL += '&custparam_customercontains=' + nlapiGetFieldValue('custpage_flter_customercontains');
	}
	window.onbeforeunload = null;
	window.location = suiteletURL;
}

function zc_fieldChanged(type, name, linenum){
	
}

function switchCollapsed(container, className){
	if ($(container).hasClass(className)) {
		$(container).removeClass(className);
	}
	else {
		$(container).addClass(className);
	}
}