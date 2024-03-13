/*
 * @author efagone
 */

function beforeLoad(type, form){

	var context = nlapiGetContext();
	var userId = nlapiGetUser();
	
	//Execute the logic only when editing the record in the browser UI
	if ((type == 'edit' || type == 'create') && context.getExecutionContext() == 'userinterface') {
		
		form.getField('custrecordr7partnerservrefpartner').setDisplayType('hidden');
		var fldTempPartner = form.addField('custpage_partnertemp', 'select', 'Partner');
		form.insertField(fldTempPartner, 'custrecordr7partnerservrefpartner');
		
		sourcePartners(fldTempPartner, type);
	}
}

function beforeSubmit(type){
	
	if (type != 'delete'){
		
		var tempPartner = nlapiGetFieldValue('custpage_partnertemp');
		var currentPartner = nlapiGetFieldValue('custrecordr7partnerservrefpartner');
		
		if (tempPartner != null && tempPartner != '' && tempPartner != currentPartner){
			
			nlapiSetFieldValue('custrecordr7partnerservrefpartner', tempPartner);
		}
	}
}

function sourcePartners(fld, type){
	
	fld.addSelectOption('', '');
	var arrSearchFilters = new Array();
	arrSearchFilters[0] = new nlobjSearchFilter('isinactive', null, 'is', 'F');
	arrSearchFilters[1] = new nlobjSearchFilter('custentityr7partnerallowservicereferrals', null, 'is', 'T');
	
	var arrSearchColumns = new Array();
	arrSearchColumns[0] = new nlobjSearchColumn('companyname').setSort();
	
	var arrSearchResults = nlapiSearchRecord('partner', null, arrSearchFilters, arrSearchColumns);
	
	var arrAllOptions = new Array();
	
	if (type != 'create') {
		arrAllOptions[arrAllOptions.length] = new Array(nlapiGetFieldValue('custrecordr7partnerservrefpartner'), nlapiLookupField('partner', nlapiGetFieldValue('custrecordr7partnerservrefpartner'), 'companyname'));
	}
	for (var i = 0; arrSearchResults != null && i < arrSearchResults.length; i++) {
	
		var searchResult = arrSearchResults[i];
		var partnerId = searchResult.getId();
		var partnerName = searchResult.getValue(arrSearchColumns[0]);
		
		arrAllOptions[arrAllOptions.length] = new Array(partnerId, partnerName);
	}
	
	arrAllOptions = arrAllOptions.sort(myCustomSort);
	
	for (var i = 0; arrAllOptions != null && i < arrAllOptions.length; i++) {

		fld.addSelectOption(arrAllOptions[i][0], arrAllOptions[i][1]);
	}
	
	fld.setDefaultValue(nlapiGetFieldValue('custrecordr7partnerservrefpartner'));
}

function myCustomSort(a, b){
	var valA = a[1].toUpperCase();
	var valB = b[1].toUpperCase();
	
	if (valA < valB) //sort string ascending
		return -1
	if (valA > valB) 
		return 1
	return 0 //default return value (no sorting)
}
