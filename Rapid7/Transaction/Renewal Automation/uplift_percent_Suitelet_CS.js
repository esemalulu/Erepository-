

function fieldChanged(list, field, linenum){
	
	var roleId = nlapiGetRole();
	
	if (field == 'custpage_upliftpercent'){
		
		var excludedRoles = [];
		excludedRoles.push('1057'); //Rev Opps Power User
		excludedRoles.push('3'); //Admin
		
		if (excludedRoles.indexOf(roleId) < 0){
			var uplift = nlapiGetFieldValue('custpage_upliftpercent');
			if (uplift != null && uplift != ''){
				if (parseFloat(uplift) > 100 || parseFloat(uplift) < 0){
					alert('Uplift percentage must be between 0 and 100.');
				}
			}
		}
	}
}

function markAll(){

	var lineItemCount = nlapiGetLineItemCount('custpage_lineitemlist');
	
	for (var i = 1; i <= lineItemCount; i++) {
		nlapiSetLineItemValue('custpage_lineitemlist', 'custpage_lineitem_select', i, 'T');
	}
}

function unmarkAll(){

	var lineItemCount = nlapiGetLineItemCount('custpage_lineitemlist');
	
	for (var i = 1; i <= lineItemCount; i++) {
		nlapiSetLineItemValue('custpage_lineitemlist', 'custpage_lineitem_select', i, 'F');
	}
}