/*
 * @author efagone
 */

function transferTo(request, response){

	if (request.getMethod() == 'GET') {
	
		//grab all parameters supplied
		var currentOppId = request.getParameter('custparam_currentopp');
		
		if (currentOppId == null || currentOppId == '') {
			throw nlapiCreateError('MISSING PARAM', 'This suitelet requires a valid custparam_currentopp parameter', true);
		}
		
		var form = nlapiCreateForm('Transfer Records', true);
		
		var fldCurrentOpp = form.addField('custpage_currentopp', 'select', 'Current Opp (transfer to)', 'opportunity').setDisplayType('hidden');
		fldCurrentOpp.setDefaultValue(currentOppId);
		var fldOldOpp = form.addField('custpage_oldopp', 'select', 'Old Opportunity (transfer from)');
				
		fldOldOpp.setDisplaySize(300);
		fldOldOpp.setMandatory(true);
		
		sourceOpportunities(fldOldOpp, currentOppId);
		
		form.addSubmitButton('Submit');
		response.writePage(form);
		
	}
	
	if (request.getMethod() == 'POST') {
	
		var currentOppId = request.getParameter('custpage_currentopp');
		var oldOppId = request.getParameter('custpage_oldopp');
		
		moveTasks(oldOppId, currentOppId);
		moveQuotes(oldOppId, currentOppId);
		
		response.writeLine("<html><body onload='win_close()'><script language='Javascript'>function win_close(){ window.opener = top; window.close(); }</script></body></html>");
	}
	
	
}

function sourceOpportunities(fldOldOpp, currentOppId){
	
	fldOldOpp.addSelectOption('', '');
	
	var customerId = nlapiLookupField('opportunity', currentOppId, 'entity');
	var salesRep = nlapiLookupField('opportunity', currentOppId, 'salesrep');
	
	var arrSearchFilters = new Array();
	arrSearchFilters[0] = new nlobjSearchFilter('entity', null, 'is', customerId);
	arrSearchFilters[1] = new nlobjSearchFilter('internalid', null, 'noneof', currentOppId);
	arrSearchFilters[2] = new nlobjSearchFilter('salesrep', null, 'is', salesRep);
	
		
	var arrSearchColumns = new Array();
	arrSearchColumns[0] = new nlobjSearchColumn('tranid').setSort(true);
	arrSearchColumns[1] = new nlobjSearchColumn('title');
	arrSearchColumns[2] = new nlobjSearchColumn('entitystatus');
	arrSearchColumns[3] = new nlobjSearchColumn('expectedclosedate');
	arrSearchColumns[4] = new nlobjSearchColumn('projectedtotal');
	
	var arrSearchResults = nlapiSearchRecord('opportunity', null, arrSearchFilters, arrSearchColumns);
	
	for (var i = 0; arrSearchResults != null && i < arrSearchResults.length; i++) {
		
		var searchResult = arrSearchResults[i];
		var oppId = searchResult.getId();
		var tranId = searchResult.getValue(arrSearchColumns[0]);
		var title = searchResult.getValue(arrSearchColumns[1]);
		var expClose = searchResult.getValue(arrSearchColumns[3]);
		var amount = searchResult.getValue(arrSearchColumns[4]);
		amount = addCommas(amount);
		
		var optionText = tranId + ': ' + title + ' (' + expClose + ') -  $' + amount;
		
		fldOldOpp.addSelectOption(oppId, optionText);
	}
	
}

function addCommas(nStr){
	nStr += '';
	x = nStr.split('.');
	x1 = x[0];
	x2 = x.length > 1 ? '.' + x[1] : '';
	var rgx = /(\d+)(\d{3})/;
	while (rgx.test(x1)) {
		x1 = x1.replace(rgx, '$1' + ',' + '$2');
	}
	return x1 + x2;
}

function moveQuotes(opportunityId, moveToRenewal){
	
	var arrSearchFilters = new Array();
	arrSearchFilters[0] = new nlobjSearchFilter('mainline', null, 'is', 'T');
	arrSearchFilters[1] = new nlobjSearchFilter('opportunity', null, 'is', opportunityId);
	
	var arrSearchResults = nlapiSearchRecord('estimate', null, arrSearchFilters);
	
	for (var i=0; arrSearchResults != null && i < arrSearchResults.length; i++){
		
		var searchResult = arrSearchResults[i];
		var quoteId = searchResult.getId();
		nlapiSubmitField('estimate', quoteId, 'opportunity', moveToRenewal)
	}
	
}

function moveTasks(opportunityId, moveToRenewal){
	
	var arrSearchFilters = new Array();
	arrSearchFilters[0] = new nlobjSearchFilter('formulatext', null, 'is', opportunityId);
	arrSearchFilters[0].setFormula('{opportunity.internalid}');
	
	var arrSearchResults = nlapiSearchRecord('task', null, arrSearchFilters);
	
	for (var i=0; arrSearchResults != null && i < arrSearchResults.length; i++){
		
		var searchResult = arrSearchResults[i];
		var taskId = searchResult.getId();
		nlapiSubmitField('task', taskId, 'transaction', moveToRenewal)
	}
	
}