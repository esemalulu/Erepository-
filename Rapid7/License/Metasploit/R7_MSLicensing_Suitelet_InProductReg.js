function createCustomerContactLicense(request, response){

	//this.response = response2;
	this.requestOriginatingFrom = request.getHeader("Referer");
	try {
		
		if (request.getMethod() == 'POST') {
		
			var url = request.getURL();
			this.parameters = request.getAllParameters();
			var headers = request.getAllHeaders();
			
			var clientIP = headers['NS-Client-IP'];
			var firstName = request.getParameter("custparamfirstname");
			var lastName = request.getParameter("custparamlastname");
			var jobTitle = request.getParameter("custparamtitle");
			var companyName = request.getParameter("custparamcompanyname");
			var typeOfUse = request.getParameter("typeofuse");
			var workEmail = request.getParameter("custparamemail");
			var workPhone = request.getParameter("custparamphone");
			var country = request.getParameter("custparamcountry");
			var stateOrProvince = request.getParameter("custparamstate");
			var annualRevenue = request.getParameter("custparamcustentityr7annualrevenue");
			var leadSource = request.getParameter("custparamleadsource");
			var returnPath = request.getParameter("custparamreturnpath");
			var redirectCode = request.getParameter("custparamredirectcode");
			var accessCode = request.getParameter("custparamproductaxscode");
			
			//Values for headers, parameters
			var logHeaderParams = '\n--------------------\nHEADERS:\n--------------------\n';
			for (head in headers) {
				logHeaderParams += head + ': ' + headers[head] + '\n';
			}
			
			logHeaderParams += '\n--------------------\nPARAMS:\n--------------------\n';
			logHeaderParams += 'FORM: R7_MSLicensing_Suitelet_InProductReg.js\n';
			for (param in parameters) {
				logHeaderParams += param + ': ' + parameters[param] + '\n';
			}
			nlapiLogExecution('AUDIT', 'Parameters/Headers - ' + workEmail, logHeaderParams);
			
			if (accessCode != null && accessCode != '') {
				var templateId = getTemplateIdForAccessCode(accessCode);
				
				if (annualRevenue == '0') {
					annualRevenue = null;
				}
				
				//Check firstName
				if (isEmpty(firstName)) {
					nlapiLogExecution("ERROR", "Null/Invalid First Name", firstName);
					redirectToErrorPage(response, "Please enter a valid first name.");
					return;
				}
				
				//Check lastName
				if (isEmpty(lastName)) {
					nlapiLogExecution("ERROR", "Null/Invalid Last Name", lastName);
					redirectToErrorPage(response, "Please enter a valid last name.");
					return;
				}
								
				//Check CompanyName
				if (isEmpty(companyName)) {
					nlapiLogExecution("ERROR", "Null/Invalid Company Name", companyName);
					redirectToErrorPage(response, "Please enter a valid company name.");
					return;
				}
				
				//Check workEmail 
				if (workEmail == null || workEmail == '' || workEmail.indexOf('@') == -1) {
					nlapiLogExecution("ERROR", "Null/Invalid email", workEmail);
					redirectToErrorPage(response, "Please enter a valid work email.");
					return;
				}
				
				if (!validCampaignId(leadSource)) {
					leadSource = '256104';
					nlapiLogExecution('DEBUG', 'CampaignId set for invalid campaign Id', leadSource);
				}
				
				if (!validTypeOfUseId(typeOfUse)) {
					typeOfUse = '';
					nlapiLogExecution('DEBUG', 'typeOfUse set for invalid typeOfUse Id', typeOfUse);
				}
			
				//submit request
				var recRequest = nlapiCreateRecord('customrecordr7licreqprocessing');
				recRequest.setFieldValue('custrecordr7_licreqproc_clientipaddress', clientIP);
				recRequest.setFieldValue('custrecordr7licreq_leadsource', leadSource);
				recRequest.setFieldValue('custrecordr7licreq_firstname', firstName);
				recRequest.setFieldValue('custrecordr7licreq_lastname', lastName);
				recRequest.setFieldValue('custrecordr7licreq_jobtitle', jobTitle);
				recRequest.setFieldValue('custrecordr7licreq_email', workEmail); 
				recRequest.setFieldValue('custrecordr7licreq_phone', workPhone); 
				recRequest.setFieldValue('custrecordr7licreq_country', country); 
				recRequest.setFieldValue('custrecordr7licreq_state', stateOrProvince); 
				recRequest.setFieldValue('custrecordr7licreq_companyname', companyName); 
				recRequest.setFieldValue('custrecordr7licreq_annualrevenue', annualRevenue);
				recRequest.setFieldValue('custrecord7licreq_typeofuse', typeOfUse);
				recRequest.setFieldValue('custrecordr7licreq_lictempupgraderec', templateId);
				recRequest.setFieldValue('custrecordr7licreq_referer', headers['Referer']);
				recRequest.setFieldValue('custrecordr7licreq_reqlog', logHeaderParams);
				try {
					nlapiSubmitRecord(recRequest, false, true);
				} 
				catch (err) {
				
					if (err.getCode() == 'FWD') {
						nlapiLogExecution('AUDIT', err.getCode(), err.getDetails());
						redirectToErrorPage(response, err.getDetails());
						return;
					}
					else {
						nlapiLogExecution('ERROR', 'Something Went Wrong License Request',  'Email: ' + workEmail + '\nCompany Name: ' + companyName + '\nError: ' + err);
						var adminUser =  nlapiLoadConfiguration('companypreferences').getFieldValue('custscriptr7_system_info_email_sender');
						nlapiSendEmail(adminUser, adminUser, 'Something went wrong license req', 'Email: ' + workEmail + '\nCompany Name: ' + companyName + '\nError: ' + err);
						throw nlapiCreateError('ERROR', err.getDetails(), true);
					}
				}
				
				if (redirectCode != null && redirectCode != '') {
					var redirectURL = grabRedirectURL(redirectCode);
					
					if (redirectURL != null && redirectURL != '') {
						returnPath = redirectURL;
					}
				}
				
				if (returnPath == null || returnPath == '') {
					nlapiLogExecution("ERROR", "Return Path not specified.", returnPath);
					redirectToErrorPage(response, "Your request cannot be processed presently. Please contact Rapid7 Support.");
					return;
				}
				
				response.sendRedirect('EXTERNAL', returnPath);
			}
		}
	} 
	catch (err) {
		//var stackTrace = err.getStackTrace();
		//var errCode = err.getCode();
		//var errId = err.getId();
		//var errDetails = err.getDetails();
		nlapiLogExecution('ERROR', " Details: " + err);
		redirectToErrorPage(response, "Your request cannot be processed presently. Please contact Rapid7 Support.");
	}
}

function grabRedirectURL(redirectCode){
	
	var arrSearchFilters = new Array();
	arrSearchFilters[arrSearchFilters.length] = new nlobjSearchFilter('custrecordr7marketingurlcode', null, 'is', redirectCode);
	
	var arrSearchColumns = new Array();
	arrSearchColumns[0] = new nlobjSearchColumn('custrecordr7marketingurlendpoint');
	
	var arrSearchResults = nlapiSearchRecord('customrecordr7marketingurlredirect', null, arrSearchFilters, arrSearchColumns);
	
	if (arrSearchResults != null) {
		return arrSearchResults[0].getValue(arrSearchColumns[0]);
	}
	
	return null;
}

function isEmpty(str){

	if (str != null && str != '') {
		str = str.replace(/\s/g, '');
	}
	
	if (str == null || str == '' || str.length < 1){
		return true
	}
	
	return false;
}

function validCampaignId(campaignId){
    nlapiLogExecution('DEBUG', "CampaignId to test", campaignId);
    if (campaignId == null || campaignId == '') 
        return false;
    var results = nlapiSearchRecord('campaign', null, new nlobjSearchFilter('internalid', null, 'is', campaignId));
    if (results != null && results.length >= 1) {
        return true;
        nlapiLogExecution('DEBUG', "CampaignId: " + campaignId, "is valid");
    }
    nlapiLogExecution('DEBUG', "CampaignId: " + campaignId, "is not valid");
    return false;
}

function validTypeOfUseId(typeOfUse){

	try {
		if (typeOfUse == null || typeOfUse == '') {
			return false;
		}
		
		var arrResults = nlapiSearchRecord('customlistr7licreq_typeofuse', null, new nlobjSearchFilter('isinactive', null, 'is', 'F'));
		
		for (var i = 0; arrResults != null && i < arrResults.length; i++) {
			if (typeOfUse.toString() == arrResults[i].getId().toString()) {
				return true;
			}
		}
	} 
	catch (e) {
		nlapiLogExecution('ERROR', 'ERROR on validTypeOfUseId', typeOfUse);
	}
	
	return false;
}

function redirectToErrorPage(response, msg){
	parameters['errormsg'] = msg;
	parameters['h'] = null;
	parameters['deploy'] = null;
	parameters['compid'] = null;
	parameters['script'] = null;
	
	nlapiLogExecution('ERROR', 'Details:', 'requestOriginatingFrom: ' + requestOriginatingFrom + '\nmsg: ' + msg);
	response.sendRedirect('EXTERNAL', requestOriginatingFrom, null, null, parameters);
}

function getTemplateIdForAccessCode(accessCode){

	var arrSearchFilters = new Array();
	arrSearchFilters[arrSearchFilters.length] = new nlobjSearchFilter('custrecordr7lictemp_accesscode', null, 'is', accessCode);
	
	var arrSearchResults = nlapiSearchRecord('customrecordr7lictemplatesupgrades', null, arrSearchFilters);
	
	if (arrSearchResults != null) {
		return arrSearchResults[0].getId();
	}
	
	return null;
}