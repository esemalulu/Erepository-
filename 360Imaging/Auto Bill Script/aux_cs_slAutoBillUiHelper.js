function autobillSlPageInit(type){
   
	var invcnt = nlapiGetLineItemCount('custpage_invlist');
	for (var i=1; i <= invcnt; i++) {
		if (nlapiGetLineItemValue('custpage_invlist', 'invsl_disablesel', i)=='true') {
			nlapiSetLineItemDisabled('custpage_invlist', 'invsl_sel', true, i);
			//hide checkbox
			//document.getElementById('invsl_sel'+i+'_fs').style.display = 'none';
		}
	}
	
}

function autobillSlSaveRecord(){

	var invids = '';
	var count = 0;
	var invcnt = nlapiGetLineItemCount('custpage_invlist');
	for (var i=1; i <= invcnt; i++) {
		if (nlapiGetLineItemValue('custpage_invlist', 'invsl_sel', i)=='T') {
			
			count++;
			invids += nlapiGetLineItemValue('custpage_invlist', 'invsl_id', i)+',';
		}
	}

	if (!invids) {
		alert('Please select one or more sales order(s) to process');
		return false;
	}
	
	if (count > 20) {
		alert('You may only process 20 sales orders at a time');
		return false;
	}
	
	invids = invids.substr(0,(invids.length - 1));
	
	nlapiSetFieldValue('custpage_invids', invids);
	
    return true;
}

function autobillSlFieldChanged(type, name, linenum){
	 
}

/*
 * 1/17/2014 Mod: Reloads Suitelet and passes in date values
 */
function refreshResults() {
	
	//date validation.
	var startdt = nlapiGetFieldValue('custpage_invdate');
	var enddt = nlapiGetFieldValue('custpage_sodateend');
	
	if (!startdt && !enddt) {
		alert('You must provide SO Created Date or SO Created Date Range to search for');
		return false;
	}
	
	if (!startdt && enddt) {
		alert('You must provide SO Created Date to run range search between the two dates');
		return false;
	}
	
	if (startdt && enddt && new Date(startdt).getTime() > new Date(enddt).getTime()) {
		alert('Start date must be before end date');
		return false;
	}
	
	//reload suitelet with date values
	var refreshUrl = nlapiResolveURL('SUITELET','customscript_ax_sl_autobill_ui','customdeploy_ax_sl_autobill_ui_dpl');
	
	window.ischanged = false;
	window.location = refreshUrl + '&custpage_invdate='+startdt+'&custpage_sodateend='+enddt+'&custpage_onlyshowbilling='+nlapiGetFieldValue('custpage_onlyshowbilling');
	
}