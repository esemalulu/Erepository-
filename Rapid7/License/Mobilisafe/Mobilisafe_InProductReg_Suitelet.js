/*
 * Module Description
 * 
 * Version    Date            Author           Remarks
 * 1.00       17 Sep 2012     efagone
 *
 */

/*
 * @param {nlobjRequest} request Request object
 * @param {nlobjResponse} response Response object
 * @returns {Void} Any output is written via response object
 */
function mobilisafe_ipr(request, response){
	response.writeLine('');
	if (request.getParameter("custparamauthcode") != '4cLJ5RyDHb8hVhmVCxCm6raT9DXtEVd2bBsLvRoRjUMwEpyL2vpRj5v6VNV3yb') {
		return response.write(createErrorJSON("INSUFFICIENT PERMISSIONS."));
	}
	
	try {
	
		if (request.getMethod() == 'POST') {
			nlapiLogExecution('DEBUG', 'Received request from RESTlet', new Date());
			response.setContentType('JSON');
			
			var sourceIP = request.getHeader("NS-CLIENT-IP");
			nlapiLogExecution('AUDIT', 'Source IP Address ' + new Date(), sourceIP);
			
			//Sanitizing all input data
			var firstName = request.getParameter("custparamfirstname");
			var lastName = request.getParameter("custparamlastname");
			var jobTitle = request.getParameter("custparamtitle");
			var companyName = request.getParameter("custparamcompanyname");
			var typeOfUse = request.getParameter("custparamuse");
			var workEmail = request.getParameter("custparamemail");
			var workPhone = request.getParameter("custparamphone");
			var country = request.getParameter("custparamcountry");
			var stateOrProvince = request.getParameter("custparamstate");
			var annualRevenue = request.getParameter("custparamcustentityr7annualrevenue");
			var leadSource = request.getParameter("custparamleadsource");
			var emailServer = request.getParameter('custparamemailserver');
			var accessCode = request.getParameter('custparamproductaxscode');
			
			//Check accessCode
			if (accessCode == null || accessCode == '' || accessCode.length < 1) {
				nlapiLogExecution("ERROR", "Null/Invalid access code", accessCode);
				return response.write(createErrorJSON("Please enter a valid first name."));
			}
			
			var product = getMBTemplateIdForAXSCode(accessCode);
			
			if (annualRevenue == '0') {
				annualRevenue = null;
			}
			
			if (lastName != null && lastName.length > 32) {
				lastName = lastName.substring(0, 32);
			}
			
			//Check firstName
			if (firstName == null || firstName == '' || firstName.length < 1) {
				nlapiLogExecution("ERROR", "Null/Invalid First Name", firstName);
				firstName = 'Not Provided';
				return response.write(createErrorJSON("Please enter a valid first name."));
			}
			
			//Check lastName
			if (lastName == null || lastName == '' || lastName.length < 1) {
				nlapiLogExecution("ERROR", "Null/Invalid Last Name", lastName);
				lastName = '(MBL Testing)';
				return response.write(createErrorJSON("Please enter a valid last name."));
			}
			
			//Check CompanyName
			if (companyName == null || companyName == '' || companyName.length < 1) {
				nlapiLogExecution("ERROR", "Null/Invalid Company Name", companyName);
				return response.write(createErrorJSON("Please enter a valid company name."));
			}
			
			//Check workEmail 
			if (workEmail == null || workEmail == '' || workEmail.indexOf('@') == -1) {
				nlapiLogExecution("ERROR", "Null/Invalid email", workEmail);
				return response.write(createErrorJSON("Please enter a valid work email."));
			}
			
			/*
			if (!validEmailDomain(workEmail)) {
				nlapiLogExecution("ERROR", "Invalid email", workEmail);
				//return response.write(createErrorJSON("Please enter a valid email."));
			}
			
			if (freeEmailDomain(workEmail)) {
				nlapiLogExecution("ERROR", "Invalid/free email", workEmail);
				//return response.write(createErrorJSON("Please enter a valid work email."));
			}
			*/
			
			//Check LeadSource
			if (!validCampaignId(leadSource)) {
				leadSource = '1425875';
				nlapiLogExecution('DEBUG', 'CampaignId set for invalid campaign Id', leadSource);
			}
			
			//Setting lead record fields
			var customerRecordFields = new Array();
			customerRecordFields['companyname'] = companyName;
			customerRecordFields['custentityr7annualrevenue'] = annualRevenue;
			customerRecordFields['country'] = country;
			customerRecordFields['state'] = stateOrProvince;
			customerRecordFields['email'] = workEmail;
			customerRecordFields['phone'] = (workPhone != null && workPhone != '' && workPhone.length >= 7) ? workPhone : '';
			customerRecordFields['leadsource'] = leadSource;
			customerRecordFields['custentityr7territoryassignmentflag'] = 'F';
			
			//Creating new lead record
			var customerIid = createNewCustomerRecord(customerRecordFields);
			if (customerIid == null) {
				nlapiLogExecution('ERROR', 'Could not create customer record', 'problem');
				return response.write(createErrorJSON("Your request cannot be processed presently. Please contact Rapid7 Support."));
			}
			else {
				nlapiLogExecution('DEBUG', 'Customer Record Created Successfully with Id', customerIid);
			}
			
			//Setting contact record fields
			var contactRecordFields = new Array();
			contactRecordFields['firstname'] = firstName;
			contactRecordFields['lastname'] = lastName;
			contactRecordFields['title'] = jobTitle;
			contactRecordFields['email'] = workEmail;
			contactRecordFields['phone'] = (workPhone != null && workPhone != '' && workPhone.length >= 7) ? workPhone : '';
			contactRecordFields['company'] = customerIid;
			contactRecordFields['custentityr7leadsourcecontact'] = leadSource;
			
			//Creating new contact record
			var contactIid = createNewContactRecord(contactRecordFields);
			if (contactIid == null) {
				nlapiLogExecution('ERROR', 'Could not create contact record', 'problem');
				return response.write(createErrorJSON("Your request cannot be processed presently. Please contact Rapid7 Support."));
			}
			else {
				nlapiLogExecution('DEBUG', 'Contact Record Created Successfully with Id', contactIid);
			}
			
			
			//Setting mobilisafe License Record Fields
			var mobilisafeLicenseFields = new Array();
			
			try {
				var mbTemplateRecord = nlapiLoadRecord('customrecordr7mblicensemarketingtemplate', product);
				mobilisafeLicenseFields['custrecordr7mblicensemarketingtemplate'] = product;
			} 
			catch (err) {
				nlapiLogExecution('ERROR', 'Invalid productId specified', 'problem');
				return response.write(createErrorJSON("Your request cannot be processed presently. Please contact Rapid7 Support."));
			}
			
			mobilisafeLicenseFields['iidForTemplate'] = mbTemplateRecord.getFieldValue('custrecordr7mblicensetemprecord');
			mobilisafeLicenseFields['duration'] = mbTemplateRecord.getFieldValue('custrecordr7mblicensetempexpirationdays'); //trial license days
			mobilisafeLicenseFields['customer'] = customerIid;
			mobilisafeLicenseFields['contact'] = contactIid;
			mobilisafeLicenseFields['emailserver'] = emailServer;
			
			var mobilisafeFields = createNewMobilisafeLicense(mobilisafeLicenseFields);
			if (mobilisafeFields['custrecordr7mblicenseproductkey'] == null) {
				nlapiLogExecution('ERROR', 'Could not create mobilisafe license record', 'problem');
				return response.write(createErrorJSON("Could not create mobilisafe license record."));
			}
			else {
				nlapiLogExecution('DEBUG', 'Mobilisafe License Created Successfully with Product Key', mobilisafeFields['custrecordr7mblicenseproductkey']);
			}
			
			nlapiLogExecution('DEBUG', 'Returning to RESTlet', new Date());
			return response.write(buildSuccessResponseJSON(mobilisafeFields['internalid']));
		}
	} 
	catch (err) {
		nlapiLogExecution('ERROR', 'Details', err);
		return response.write(createErrorJSON('Your request cannot be processed presently. Please contact Rapid7 Support.'));
	}
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



function buildSuccessResponseJSON(licenseId){

	if (licenseId != null && licenseId != '') {
	
		var objResponse = new Object;
		
		objResponse.success = true;
		objResponse.message = '';
		objResponse.internalId = licenseId;
		
		var responseJSON = JSON.stringify(objResponse);
		nlapiLogExecution('DEBUG', 'Returning', responseJSON);
		return responseJSON;
		
	}
	else {
		nlapiLogExecution('ERROR', 'Returning', 'License ID is null');
		return createErrorJSON('Your request cannot be processed presently. Please contact Rapid7 Support.');
	}
	
}

function createNewCustomerRecord(fields){
	nlapiLogExecution('DEBUG', 'Creating Customer', new Date());
	nlapiLogExecution('DEBUG', '---running createRecord command', new Date());
	var record = nlapiCreateRecord('lead');
	nlapiLogExecution('DEBUG', '---finished running createRecord command', new Date());
	for (field in fields) {
		record.setFieldValue(field, fields[field]);
	}
	
	noOfCompaniesWithSameName = getNoOfCompaniesWithSameName(fields['companyname']);
	if (noOfCompaniesWithSameName != 0) {
		var randomNo = Math.floor(Math.random() * 1001);
		record.setFieldValue('entityid', fields['companyname'] + ".dup" + parseInt(noOfCompaniesWithSameName + 1) + "." + randomNo);
	}
	try {
		var id = null;
		id = nlapiSubmitRecord(record, null, true);
	} 
	catch (err) {
		id = err.getInternalId(); //If error was thrown in afterSubmit script
		nlapiLogExecution('ERROR', 'Details', err);
	}
	nlapiLogExecution('DEBUG', 'Finished Creating Customer', new Date());
	return id;
}

function getNoOfCompaniesWithSameName(companyName){
	nlapiLogExecution('DEBUG', '---Getting companies with same name', new Date());
	var searchFilters = new Array(new nlobjSearchFilter('companyname', null, 'is', companyName));
	var searchResults = nlapiSearchRecord('customer', null, searchFilters);
	nlapiLogExecution('DEBUG', '---Finished getting companies with same name', new Date());
	if (searchResults != null) {
		return searchResults.length;
	}
	else {
		return 0;
	}
}


function createNewContactRecord(fields){
	nlapiLogExecution('DEBUG', 'Creating Contact', new Date());
	//Creating contact record
	var record = nlapiCreateRecord('contact');
	
	//Setting field values
	for (field in fields) {
		record.setFieldValue(field, fields[field]);
	}
	
	try {
		var id = nlapiSubmitRecord(record);
	} 
	catch (err) {
	
		id = err.getInternalId(); //If error was thrown in afterSubmit script
		nlapiLogExecution('ERROR', 'Details', err);
	}
	
	nlapiLogExecution('DEBUG', 'Finished Creating Contact', new Date());
	//Return id if contact was created (even with errors)
	return id;
}


function createNewMobilisafeLicense(fields){
	
	nlapiLogExecution('DEBUG', 'Creating License', new Date());
	//Creating new metasploit License record from Template
	var newRecord = nlapiCopyRecord('customrecordr7mobilisafelicense', fields['iidForTemplate']);
	
	//Null out ProductKey, Nexpose License Serial No, Product Serial No
	newRecord.setFieldValue('custrecordr7mblicenseproductkey', '');
	newRecord.setFieldValue('custrecordr7mblicense_id', '');
	newRecord.setFieldValue('custrecordr7mblicense_customer_id', '');
	newRecord.setFieldValue('custrecordr7mblicense_period_end', '');
	newRecord.setFieldValue('custrecordr7mblicense_version', '');
	
	//Computing endDate = today + quantityPurchased*duration
	var daysToBeAdded = parseInt(fields['duration']);
	var computedExpirationDate = nlapiAddDays(new Date(), daysToBeAdded);
	var endDate = nlapiDateToString(computedExpirationDate);
	
	//Setting End Date
	newRecord.setFieldValue('custrecordr7mblicense_period_end', endDate);
	
	//Setting other miscellaneous fields on the license record
	newRecord.setFieldValue('custrecordr7mblicensecustomer', fields['customer']);
	newRecord.setFieldValue('custrecordr7mblicensecontact', fields['contact']);
	newRecord.setFieldValue('custrecordr7mblicensemarketingtemplate', fields['custrecordr7mblicensemarketingtemplate']);
	newRecord.setFieldValue('custrecordr7mblicense_emailserver', fields['emailserver']);
		
	var newFields = new Array();
	var id = null;
	try {
		id = nlapiSubmitRecord(newRecord);
	} 
	catch (err) {
		id = err.getInternalId(); //If error was thrown in afterSubmit script
		nlapiLogExecution('ERROR', 'Details', err);
	}
	
	var newProductKey = null;
	if (id != null) {
		newProductKey = nlapiLookupField('customrecordr7mobilisafelicense', id, 'custrecordr7mblicenseproductkey');
	}
	
	fields['custrecordr7mblicenseproductkey'] = newProductKey;
	fields['internalid'] = id;
	
	nlapiLogExecution('DEBUG', 'Finished Creating License', new Date());
	return fields;
	
}

function sendErrorEmail(fields, text){
	
	nlapiLogExecution("ERROR", 'Error on', text);
	var fieldListing = "";
	for (field in fields) {
		fieldListing += field + ": " + fields[field] + "<br>";
	}
	var adminUser =  nlapiLoadConfiguration('companypreferences').getFieldValue('custscriptr7_system_info_email_sender');
	nlapiSendEmail(adminUser, adminUser, 'Error on Mobilisafe IPR', text + "<br>" + fieldListing);
}

function htmlEncode(value) {
     encodedHtml = escape(value);
     encodedHtml = encodedHtml.replace(/\//g,"%2F");
     encodedHtml = encodedHtml.replace(/\?/g,"%3F");
     encodedHtml = encodedHtml.replace(/=/g,"%3D");
     encodedHtml = encodedHtml.replace(/&/g,"%26");
	 encodedHtml = encodedHtml.replace(/%20/g," ");
     return encodedHtml;
} 

function validEmailDomain(email){
	try {
		var requestURL = 'https://updates.metasploit.com/services/validate_email?contactEmail=' + email;
		var response = nlapiRequestURL(requestURL);
		
		var resp = response.getBody();
		
		if (resp == null) {
			nlapiLogExecution("ERROR", 'NULL Response for HD Webservice', 'Yup');
			var adminUser =  nlapiLoadConfiguration('companypreferences').getFieldValue('custscriptr7_system_info_email_sender');
			nlapiSendEmail(adminUser, adminUser, 'NULL response from HD validEmailDomain server', 'Look into this.. maybe defaut to true in this case');
			return false;
		}
		
		var xml = nlapiStringToXML(resp);
		var result = nlapiSelectNode(xml, '//result');
		var valid = nlapiSelectValue(result, '@valid');
		var reason = nlapiSelectValue(result, '@reason');
		
		if (valid == 'false' && reason != 'Invalid response') { //treating invalid response as valid per HD: "We may need to treat "Invalid response" as valid as  a workaround" 3/28/2012
			return false;
		}
		else {
			return true;
		}
	} 
	catch (err) {
		nlapiLogExecution("ERROR", 'Bad Response for HD Webservice', 'Yup');
		return true;
	}
}


function freeEmailDomain(email){
	if(email==null) return false;
	if(email.indexOf('@')==-1) return false;
    var domain = email.substr(email.indexOf('@', 0) + 1);
    nlapiLogExecution('DEBUG', 'Domain Parsed', domain);
    var searchFilters = new Array(new nlobjSearchFilter('name', null, 'is', domain), new nlobjSearchFilter('name', null, 'is', domain));
    var searchResults = nlapiSearchRecord('customrecordr7domainnames', null, searchFilters);
    if (searchResults != null && searchResults.length >= 1) {
        return true;
    }
    else {
        return false;
    }
    return false;
}

function getNXTemplateIdForAXSCode(accessCode){
	//ms12345sdfsdqeqw
	var axcsCodeField = 'custrecordr7nxlicenseaxcscode';
	var searchRecord = 'customrecordr7nxlicensemarketingtemplate';
	var searchFilters = new Array(
	new nlobjSearchFilter(axcsCodeField,null,'is',accessCode)
	);
	var searchResults = nlapiSearchRecord(searchRecord,
	null,
	searchFilters);
	if(searchResults!=null){
		return searchResults[0].getId();
	}
	return null;
}

function getMSTemplateIdForAXSCode(accessCode){
	var axcsCodeField = 'custrecordr7mslicenseaxcscode';
	var searchRecord = 'customrecordr7mslicensemarketingtemplate';
	var searchFilters = new Array(
	new nlobjSearchFilter(axcsCodeField,null,'is',accessCode)
	);
	var searchResults = nlapiSearchRecord(searchRecord,
	null,
	searchFilters);
	if(searchResults!=null){
		return searchResults[0].getId();
	}
	return null;	
}

function getMBTemplateIdForAXSCode(accessCode){
	var axcsCodeField = 'custrecordr7mblicenseaxcscode';
	var searchRecord = 'customrecordr7mblicensemarketingtemplate';
	var searchFilters = new Array(
	new nlobjSearchFilter(axcsCodeField,null,'is',accessCode)
	);
	var searchResults = nlapiSearchRecord(searchRecord,
	null,
	searchFilters);
	if(searchResults!=null){
		return searchResults[0].getId();
	}
	return null;	
}