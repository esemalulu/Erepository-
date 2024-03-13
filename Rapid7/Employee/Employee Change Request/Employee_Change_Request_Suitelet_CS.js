/*
 * @author efagone
 */

function pageInit(){
	window.onbeforeunload = function() {};
		
	if (nlapiGetFieldValue('custpage_issalesrep') == 'F'){
		nlapiDisableField('custpage_newpracticemanager', true);
	}
}

function fieldChanged(type, name, linenum){
	var userId = nlapiGetUser();
	
	if (name == 'custpage_employee'){
		
		var suiteletURL = nlapiResolveURL('SUITELET', 'customscriptr7employeechangerequest_suit', 'customdeployr7employeechangerequest_suit', false);
		var url = suiteletURL + '&custparam_employee=' + nlapiGetFieldValue(name);
		window.location = url;
		
	}
	
	
}

function validateField(type, name, linenum){

	if (name == 'custpage_effectivedate') {
		var userId = nlapiGetUser();
		var effectiveDate = nlapiGetFieldValue(name);
		
		if (effectiveDate != null && effectiveDate != '') {
		
			var dtEffectiveDate = nlapiStringToDate(effectiveDate);
			var today = nlapiStringToDate(nlapiDateToString(new Date()));
			
			if (today > dtEffectiveDate) {
				if (isSpecUser(userId)) { // Change #479 - Rapid7 Manager Portal "unexpected error" fix.  Swapping to Custom script permissions.
					alert('Effective date is in the past.');
					return true;
				}
				else {
					alert('Effective date cannot be in the past.');
					nlapiSetFieldValue(name, nlapiDateToString(today));
					return false;
				}
			}
			
		}
	}
	
	return true;
	
}

function isSpecUser(userId){
	
	var arrSpecUsers = new Array();
	arrSpecUsers[arrSpecUsers.length] = 2; //Derek Zanga
	arrSpecUsers[arrSpecUsers.length] = 55011; //Errol Fagone
	arrSpecUsers[arrSpecUsers.length] = 1296334; //Scott Fortier
	arrSpecUsers[arrSpecUsers.length] = 64284980; //Victoria Franco
	arrSpecUsers[arrSpecUsers.length] = 3889342; //Caitlin Swofford
	arrSpecUsers[arrSpecUsers.length] = 12496050; //Donabedian, Beth N
	arrSpecUsers[arrSpecUsers.length] = 68304016; //Robichaud, Melissa - samanage #7448
	arrSpecUsers[arrSpecUsers.length] = 70111348; //Herrara, Liliana - samanage #7926


	for (var i = 0; i < arrSpecUsers.length; i++) {
	
		var specUserId = arrSpecUsers[i];
		if (userId == specUserId) {
			return true;
		}
	}
	
	return false;
}
