/**
 * Undeployed client script used by axlsys_sl_salesActivityReport Suitelet
 * 
 * Version    Date            Author           Remarks
 * 1.00       05 Feb 2014     JSon
 *
 */

var datejson = getDateDefaults();

/**
 * The recordType (internal id) corresponds to the "Applied To" record in your script deployment. 
 * @appliedtorecord recordType
 * 
 * @param {String} type Sublist internal id
 * @param {String} name Field internal id
 * @param {Number} linenum Optional line item number, starts from 1
 * @returns {Void}
 */
function salesActSlFieldChanged(type, name, linenum){
	if (name == 'custpage_defdatedd' && nlapiGetFieldValue(name)) {
		var startval = datejson[nlapiGetFieldValue(name)].start;
		var endval = datejson[nlapiGetFieldValue(name)].end;
		
		nlapiSetFieldValue('custpage_startdate', startval);
		nlapiSetFieldValue('custpage_enddate', endval);
	}
}

function backtoSummary() {
	var genSalesMetricUrl = nlapiResolveURL('SUITELET', 'customscript_ax_sl_salesactivitygen', 'customdeploy_ax_sl_salesactivitygendp');
	window.ischanged = false;
	window.location = genSalesMetricUrl + 
					  '&datedef='+nlapiGetFieldValue('custpage_defdatedd')+
					  '&start='+nlapiGetFieldValue('custpage_startdate')+
					  '&end='+nlapiGetFieldValue('custpage_enddate')+
					  '&rep='+nlapiGetFieldValue('custpage_rep')+
					  '&action=general';
}

function reloadReport() {
	//custpage_defdatedd = datedef
	//custpage_startdate = start
	//custpage_enddate = end
	//custpage_rep = rep
	//action
	//rectype
	if (!nlapiGetFieldValue('custpage_startdate') || !nlapiGetFieldValue('custpage_enddate')) {
		alert('Date ranges must be specified');
		return false;
	}
	
	var salesMetricUrl = nlapiResolveURL('SUITELET', 'customscript_ax_sl_salesactivitygen', 'customdeploy_ax_sl_salesactivitygendp');
	window.ischanged = false;
	window.location = salesMetricUrl + 
					  '&datedef='+nlapiGetFieldValue('custpage_defdatedd')+
					  '&start='+nlapiGetFieldValue('custpage_startdate')+
					  '&end='+nlapiGetFieldValue('custpage_enddate')+
					  '&rep='+nlapiGetFieldValue('custpage_rep');
	
}

function emailCsvExport() {
	if (!nlapiGetFieldValue('custpage_startdate') || !nlapiGetFieldValue('custpage_enddate')) {
		alert('Date ranges must be specified');
		return false;
	}
	
	var salesMetricEmailUrl = nlapiResolveURL('SUITELET', 'customscript_ax_sl_salesactivitygen', 'customdeploy_ax_sl_salesactivitygendp');
	window.ischanged = false;
	window.location = salesMetricEmailUrl + 
					  '&action=email&rep=all'+
					  '&datedef='+nlapiGetFieldValue('custpage_defdatedd')+
					  '&start='+nlapiGetFieldValue('custpage_startdate')+
					  '&end='+nlapiGetFieldValue('custpage_enddate')+
					  '&rep='+nlapiGetFieldValue('custpage_rep');
}