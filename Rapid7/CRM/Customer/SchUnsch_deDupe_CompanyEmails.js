function deDupe(){
	
	var timeLimitInMinutes = 15;
	this.timeLimitInMilliseconds = timeLimitInMinutes * 60 * 1000;
	this.startingTime = new Date().getTime();
	this.context = nlapiGetContext();
	this.rescheduleScript = false;
	//Obtain company records where the checkFreeEmail checkbox is checked off
	var results = getCompanyRecordsToCheck();
	
	if (results == null || results.length == 0) {
		nlapiLogExecution('DEBUG', 'No results returned.', 'yup');
	}
	else {
		nlapiLogExecution('DEBUG', 'Results returned', results.length);
	}
	
	for (var i = 0; results != null && i < results.length && unitsLeft(300) && timeLeft(); i++) {
	
		nlapiLogExecution('DEBUG', 'Processing Results #', i);
		
		var email = results[i].getValue('email');
		var id = results[i].getId();
		var UNKNOWN_LEAD_SOURCE = 16855;
		var leadSource = nlapiLookupField('customer', id, 'leadsource');
		if(!leadSource){
			nlapiSubmitField('customer', id, 'leadsource', UNKNOWN_LEAD_SOURCE);
		}
		var notFreeMail = validateEmailDomainFree(email);
		if (!notFreeMail) { // It is  a free Mail Domain
			nlapiLogExecution('DEBUG', email + "", 'is a free mail domain');
			
			//Obtaining companies who have the same email address
			var companiesWithExactEmail = getCompaniesWithExactEmail(id, email);
			
			if (companiesWithExactEmail == null || companiesWithExactEmail.length == 0) {
				//There are no other companies with this email address	
				//populate autoScrub email
				//checkOffCheckFreemail box
				
				nlapiLogExecution('DEBUG', "There are 0 other companies with this email", email);
				
				var fields = new Array();
				fields[0] = 'custentityr7customerautoscrubfreemaildup';
				fields[1] = 'custentityr7autoscrubcheckfreemail';
				fields[2] = 'email';
				
				var fieldValues = new Array();
				fieldValues[0] = results[i].getValue('email');
				fieldValues[1] = 'F';
				fieldValues[2] = '';
				
				//We set email to '' so it drops off the dupe list in Netsuite
				//which finds dupes by domain name
				
				try {
					nlapiSubmitField('customer', results[i].getId(), fields, fieldValues);
				} 
				catch (e) {
					nlapiLogExecution('ERROR', e.name, 'customerId: ' + results[i].getId() + '\nError: ' + e.message);
				}
				
				nlapiLogExecution('DEBUG', "Successfuly set custentityr7customerautoscrubfreemaildup to email", email);
				nlapiLogExecution('DEBUG', "Successfuly checked off custentityr7autoscrubcheckfreemail", 'to F');
				
			}
			else 
				if (companiesWithExactEmail != null && companiesWithExactEmail.length >= 1) {
					//There are one or more companies with this email address	
					//set the email to the email value of the company
					//set their dedup email to null
					//checkOffCheckFreemail box
					
					nlapiLogExecution('DEBUG', 'Other Companies With Email' + email, companiesWithExactEmail.length);
					
					var usageUnitsRequired = (companiesWithExactEmail.length + 1) * 10;
					if (unitsLeft(usageUnitsRequired)) {
					
						//First setting the source company's fields appropriately.
						var fields = new Array();
						
						var fieldValues = new Array();
						var fields = new Array();
						fields[0] = 'custentityr7customerautoscrubfreemaildup';
						fields[1] = 'custentityr7autoscrubcheckfreemail';
						
						var fieldValues = new Array();
						fieldValues[0] = '';
						fieldValues[1] = 'T';
						
						try {
							nlapiSubmitField('customer', id, fields, fieldValues);
						} 
						catch (e) {
					 		nlapiLogExecution('ERROR', e.name, 'customerId: ' + id + '\nError: ' + e.message);
						}
						
						//Then set the fields on the customer records that have the same email 
						
						for (var j = 0; j < companiesWithExactEmail.length; j++) {
							nlapiLogExecution('DEBUG', 'J=', j);
							
							if (companiesWithExactEmail[j].getValue('email') != null && companiesWithExactEmail[j].getValue('email') != '') {
							
								var fields = new Array();
								fields[0] = 'custentityr7customerautoscrubfreemaildup';
								fields[1] = 'custentityr7autoscrubcheckfreemail';
								
								var fieldValues = new Array();
								fieldValues[0] = '';
								fieldValues[1] = 'F';
								
							}
							else {
							
								var fields = new Array();
								fields[0] = 'email';
								fields[1] = 'custentityr7customerautoscrubfreemaildup';
								fields[2] = 'custentityr7autoscrubcheckfreemail';
								
								var fieldValues = new Array();
								fieldValues[0] = results[i].getValue('email');
								fieldValues[1] = '';
								fieldValues[2] = 'T';
							}
							
							try {
								nlapiSubmitField('customer', companiesWithExactEmail[j].getId(), fields, fieldValues);
							} 
							catch (e) {
								nlapiLogExecution('ERROR', e.name, 'customerId: ' + companiesWithExactEmail[j].getId() + '\nError: ' + e.message);
							}
							
							nlapiLogExecution('DEBUG', 'Successfully set custentityr7autoscrubcheckfreemail', 'to F');
							nlapiLogExecution('DEBUG', 'Successfully set email to', 'to ' + email);
						}
						
					}
				}
			
		}
		else { //Not a free mail domain
			nlapiLogExecution('DEBUG', email + "", 'is not a free email domain');
			try {
				nlapiSubmitField('customer', results[i].getId(), 'custentityr7autoscrubcheckfreemail', 'F');
			} 
			catch (e) {
				nlapiLogExecution('ERROR', e.name, 'customerId: ' + results[i].getId() + '\nError: ' + e.message);
			}
			nlapiLogExecution('DEBUG', 'Successfully set custentityr7autoscrubcheckfreemail', 'to F');
		}
	}
	
	//deDupe companies with 2 char extensions
	deDupe2CharExtensions();
	
	if ((results != null && i < results.length) || rescheduleScript) {
	
		nlapiScheduleScript(context.getScriptId());
		return;
	}
	
	nlapiScheduleScript(741);
}


//Return companies with email=email specified
function getCompaniesWithExactEmail(id, email){


	var searchFilters = new Array();
	searchFilters[searchFilters.length] = new nlobjSearchFilter('custentityr7customerautoscrubfreemaildup', null, 'isnotempty');
	searchFilters[searchFilters.length] = new nlobjSearchFilter('custentityr7customerautoscrubfreemaildup', null, 'is', email);
	searchFilters[searchFilters.length] = new nlobjSearchFilter('internalid', null, 'noneof', new Array(id));
	
	var searchColumns = new Array();
	searchColumns[0] = new nlobjSearchColumn('email');
	
	var results2 = nlapiSearchRecord('customer', null, searchFilters, searchColumns);
	
	if (results2 != null) { //If we find a match in the deDupeField
		return results2; // we don't worry about matches in the email field
	}
	else {
		var searchFilters = new Array();
		searchFilters[searchFilters.length] = new nlobjSearchFilter('email', null, 'is', email);
		searchFilters[searchFilters.length] = new nlobjSearchFilter('internalid', null, 'noneof', new Array(id));
		
		var searchColumns = new Array();
		searchColumns[0] = new nlobjSearchColumn('email');
		
		var results = nlapiSearchRecord('customer', null, searchFilters, searchColumns);
		return results;
	}
	
	/*
	 //ToDO concatenate results2
	 if (results != null && results2 != null) {
	 var results = results.concatenate(results2);
	 }else if(results==null){
	 return results2;
	 }
	 */
	//return results2;
}

function deDupe2CharExtensions(){

	var arrSearchResults = nlapiSearchRecord('customer', 12071);
	
	for (var i = 0; arrSearchResults != null && i < arrSearchResults.length && unitsLeft(100) && timeLeft(); i++) {
	
		var searchResult = arrSearchResults[i];
		var columns = searchResult.getAllColumns();
		var recCount = parseInt(searchResult.getValue(columns[0]));
		var domain = searchResult.getValue(columns[1]);
		var needsProcessing = searchResult.getValue(columns[2]);
		var is2CharExt = searchResult.getValue(columns[3]);
		var strIDsToProcess = searchResult.getValue(columns[4]);
		var newEmail = searchResult.getValue(columns[5]);
		
		var arrIDsToProcess = new Array();
		
		if (strIDsToProcess != null && strIDsToProcess != '') {
			arrIDsToProcess = strIDsToProcess.split(",");
		}
		
		if (recCount > 100 || strIDsToProcess == null || strIDsToProcess == '') {
			arrIDsToProcess = grabLikeDomainAccounts(domain);
		}
		
		if (newEmail == null || newEmail == '') {
			newEmail = 'info' + domain;
		}
		
		for (var j = 0; arrIDsToProcess != null && j < arrIDsToProcess.length; j++) {
		
			var fields = new Array();
			fields[0] = 'custentityr7processdomainextdup';
			
			var values = new Array();
			values[0] = 'F';
			
			if (recCount > 1 && is2CharExt == '1') {
			
				fields[1] = 'email';
				values[1] = newEmail;
				
			}
			var UNKNOWN_LEAD_SOURCE = 16855;
			var leadSource = nlapiLookupField('customer', arrIDsToProcess[j], 'leadsource');
			if (!leadSource) {
				fields.push('leadsource');
				values.push(UNKNOWN_LEAD_SOURCE);
			}
			
			nlapiLogExecution('DEBUG', 'submitting company', arrIDsToProcess[j]);
			try {
				nlapiSubmitField('customer', arrIDsToProcess[j], fields, values);
			} 
			catch (e) {
				nlapiLogExecution('ERROR', e.name, 'customerId: ' + arrIDsToProcess[j] + '\nError: ' + e.message);
			}
		}
		
	}
	
}

function getCompanyRecordsToCheck(){
	var filters = new Array(
	new nlobjSearchFilter('custentityr7autoscrubcheckfreemail',null,'is','T'),
	new nlobjSearchFilter('custentityr7duplicatemergeautomationstat',null,'anyof', '@NONE@'),
	new nlobjSearchFilter('email',null,'isnotempty')
	);
	var columns = new Array(
	new nlobjSearchColumn('email')
	);
	var results = nlapiSearchRecord('customer',null,filters,columns);
	return results;
}


function validateEmailDomainFree(email){
	if(email==null) return false;
	if(email.indexOf('@')==-1) return false;
	//if(validateEmailDomain(email)==false) return false;

    var domain = email.substr(email.indexOf('@', 0) + 1);
    nlapiLogExecution('DEBUG', 'Domain Parsed', domain);
    var searchFilters = new Array(new nlobjSearchFilter('name', null, 'is', domain), new nlobjSearchFilter('name', null, 'is', domain));
    var searchResults = nlapiSearchRecord('customrecordr7domainnames', null, searchFilters);
    if (searchResults != null && searchResults.length >= 1) {
        return false;
    }
    else {
        return true;
    }
    return true;
}

function grabLikeDomainAccounts(domain){
	
	var arrAccountIds = new Array();
	
	if (domain != null && domain != '') {

		var arrSearchFilters = new Array();
		arrSearchFilters[0] = new nlobjSearchFilter('formulatext', null, 'is', domain);
		arrSearchFilters[0].setFormula("SUBSTR({email}, INSTR({email}, '@'))");
		arrSearchFilters[1] = new nlobjSearchFilter('isinactive', null, 'is', 'F');
		arrSearchFilters[2] = new nlobjSearchFilter('custentityr7processdomainextdup', null, 'is', 'T');
		
		var arrSearchResults = nlapiSearchRecord('customer', null, arrSearchFilters);
		
		for (var i = 0; arrSearchResults != null && i < arrSearchResults.length; i++){
			
			arrAccountIds[arrAccountIds.length] = arrSearchResults[i].getId();
			
		}
		
	}
	
	return arrAccountIds;

}

function availableUnits(){
	return nlapiGetContext().getRemainingUsage();
}


function unitsLeft(number){
    var unitsLeft = nlapiGetContext().getRemainingUsage();
    if (unitsLeft >= number) {
        return true;
    }
    return false;
}

function timeLeft(){
	var presentTime = new Date().getTime();
	if (presentTime - startingTime > timeLimitInMilliseconds) {
		nlapiLogExecution('DEBUG', 'Ran out of time', 'yup');
		rescheduleScript = true;
		return false;
	}
	return true;
}
