

function beforeLoad(type, form){
	var userId = nlapiGetUser();
	var roleId = nlapiGetRole();
	
	if (type == 'view') {
		//renewal button
		if (userId == 55011 || userId == 149990 || userId == 2 || roleId == 1022) {
			if ((nlapiGetFieldValue('status') != 'Pending Approval' && nlapiGetFieldValue('custbodyr7renewaloppcreated') == 'F')) {
				form.setScript('customscriptr7renewalautosuitelet_cs');
				form.addButton('custpage_renew', 'Create Renewal', 'redirectToRenewalSuitelet()');
				if (userId == 149990) {
					form.addButton('custpage_racomplete', 'RA Complete', 'raComplete()');
				}
			}
		}		
	}
}
