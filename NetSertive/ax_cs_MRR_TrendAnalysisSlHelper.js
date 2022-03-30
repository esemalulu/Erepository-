/**
 * Module Description
 * 
 * Version    Date            Author           Remarks
 * 1.00       19 Mar 2014     AnJoe
 *
 */


/**
 * The recordType (internal id) corresponds to the "Applied To" record in your script deployment. 
 * @appliedtorecord recordType
 * 
 * @param {String} type Sublist internal id
 * @param {String} name Field internal id
 * @param {Number} linenum Optional line item number, starts from 1
 * @returns {Void}
 */
function trendFieldChanged(type, name, linenum){

	if (name=='custpage_mkseg' || name=='custpage_fromdate' || name=='custpage_todate') {
		
		if ((name=='custpage_fromdate' || name=='custpage_todate') && nlapiGetFieldValue(name)) {
			//always set it to first of the month
			var rangeDt = nlapiStringToDate(nlapiGetFieldValue(name));
			rangeDt.setDate(1);
			nlapiSetFieldValue(name, nlapiDateToString(rangeDt), false, false);
		} 
		
		reload();
	}
	
}

function openDataPage() {
	//showdata
	var slUrl = nlapiResolveURL('SUITELET', nlapiGetFieldValue('custpage_slstid'), nlapiGetFieldValue('custpage_sldpid'), 'VIEW');
	if (nlapiGetFieldValue('custpage_slstid')=='customscript_ns_ax_sl_mrr_trend_mktseg') {
		slUrl +='&custpage_mkseg='+nlapiGetFieldValue('custpage_mkseg')+
				'&custpage_fromdate='+nlapiGetFieldValue('custpage_fromdate')+
				'&custpage_todate='+nlapiGetFieldValue('custpage_todate')+
				'&custpage_custid='+nlapiGetFieldValue('custpage_custid')+
				'&showdata=T';
	}
	
	window.open(slUrl, 'DataView','menubar=no, toolbar=no');
}

function reload() {
	
	var slUrl = nlapiResolveURL('SUITELET', nlapiGetFieldValue('custpage_slstid'), nlapiGetFieldValue('custpage_sldpid'), 'VIEW');
	if (nlapiGetFieldValue('custpage_slstid')=='customscript_ns_ax_sl_mrr_trend_mktseg') {
		slUrl +='&custpage_mkseg='+nlapiGetFieldValue('custpage_mkseg')+
				'&custpage_fromdate='+nlapiGetFieldValue('custpage_fromdate')+
				'&custpage_custid='+nlapiGetFieldValue('custpage_custid')+
				'&custpage_todate='+nlapiGetFieldValue('custpage_todate');
	}
	
	window.ischanged = false;
	window.location = slUrl;
	
}