function createCustomerContactLicense(request,response){
	
	//https://forms.netsuite.com/app/site/hosting/scriptlet.nl?script=215&deploy=1&compid=663271&h=ba8e5e0448c983ac6137  
	
	try {
		this.validParameters = new Array("custparamfirstname", "custparamlastname", "custparamtitle", "custparamcompanyname", "typeofuse", "custparamemail", "custparamphone", "custparamcountry", "custparamstate", "custparamcustentityr7annualrevenue", "custparamcustentityr7contacthowdidyouhearaboutus", "h", "deploy", "Submit", "compid", "script");
		
		this.requestOriginatingFrom = "";	
		
		if (request.getMethod() == 'POST') {
		
			var url = request.getURL();
			this.parameters = request.getAllParameters();
			var headers = request.getAllHeaders();
			requestOriginatingFrom = request.getHeader("Referer");
			
			//Sanitizing all input data
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
			//overidden returnPath (has always been like this, just cleaning up for new parameter (redirectCode)
			returnPath = "http://www.rapid7.com/nexposecommunitythankyou.jsp";
			var redirectCode = request.getParameter("custparamredirectcode");
		
			var product = request.getParameter("custparamproduct");
			var msLicTemplate = request.getParameter("custparamcustentityr7contactmslicensetemplate");
			
			//Pass accessCode and trialAccessCode in lieu of product and msLicTemplate
			var accessCode = request.getParameter("custparamproductaxscode");
			var trialAccessCode = request.getParameter("custparamtrialaxscode");
			
			//Values for headers, parameters
			var logHeaderParams = '\n--------------------\nHEADERS:\n--------------------\n';
			for (head in headers) {
				logHeaderParams += head + ': ' + headers[head] + '\n';
			}
			
			logHeaderParams += '\n--------------------\nPARAMS:\n--------------------\n';
			logHeaderParams += 'FORM: R7_NXLicensing_Suitelet_InProductReg.js\n';
			for (param in parameters) {
				logHeaderParams += param + ': ' + parameters[param] + '\n';
			}
			nlapiLogExecution('AUDIT', 'Parameters/Headers - ' + workEmail, logHeaderParams);
			
			if (annualRevenue == '0') {
					annualRevenue = null;
			}
			 
			// BEGIN NEW SHIT
			if (accessCode == 'nxfgkwwDLL' || accessCode == 'n30vlejc88dg!5' || accessCode == 'tdjc9el$vd$f' || accessCode == 'tdj4ks&4g4#$f' || accessCode == 'nxpyhq2vuG' || accessCode == 'DP44n1aQZF') {
				nlapiLogExecution('AUDIT', 'USING NEW CODE', workEmail);
				var templateId = getTemplateIdForAccessCode(accessCode);

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
						nlapiSendEmail(55011, 55011, 'Something went wrong license req', 'Email: ' + workEmail + '\nCompany Name: ' + companyName + '\nError: ' + err);
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
				return;
			}
			// END NEW SHIT
			nlapiLogExecution('AUDIT', 'USING OLD CODE', workEmail);
			nlapiLogExecution('DEBUG','Access Code',accessCode);
			nlapiLogExecution('DEBUG','Trial Access Code',trialAccessCode);
		
			//var msTemplateIdForAXSCode = getMSTemplateIdForAXSCode(trialAccessCode);
			//var nxTemplateIdForAXSCode = getNXTemplateIdForAXSCode(accessCode);
			
			if((msLicTemplate==null||msLicTemplate=='')&&(trialAccessCode!=null && trialAccessCode!='')){
				//msLicTemplate = getMSTemplateIdForAXSCode(trialAccessCode);
			}
						
			//requestOriginatingFrom = "https://www.rapid7.com/register/metasploit-trial.jsp";				
						
			//Parameter based checks
			if (parameters['deploy'] != 1) {
				nlapiLogExecution("ERROR", 'Invalid/unrecognized value of parameter deploy', parameters[deploy]);
				redirectToErrorPage(response, "Your request cannot be processed. Please contact Rapid7 Support.");
				return;
			}
			
			
			if (parameters['h'] != 'ba8e5e0448c983ac6137') {
				nlapiLogExecution("ERROR", 'Invalid/unrecognized value of parameter h', parameters[h]);
				redirectToErrorPage(response, "Your request cannot be processed. Please contact Rapid7 Support.");
				return;
			}
			
			//Header based checks go here
			//All checks redirect to error JSP
	
			//Check firstName
			if (firstName == null || firstName == '' || firstName.length < 1) {
				nlapiLogExecution("ERROR", "Null/Invalid First Name", firstName);
				redirectToErrorPage(response, "Please enter a valid first name.");
				return;
			}
			
			//Check lastName
			if (lastName == null || lastName == '' || lastName.length < 1) {
				nlapiLogExecution("ERROR", "Null/Invalid Last Name", lastName);
				redirectToErrorPage(response, "Please enter a valid last name.");
				return;
			}
			
			//Check jobTitle
			
			
			//Check CompanyName
			if (companyName == null || companyName == '' || companyName.length < 1) {
				nlapiLogExecution("ERROR", "Null/Invalid Company Name", companyName);
				redirectToErrorPage(response, "Please enter a valid company name.");
				return;
			}
			
			//Check typeOfUse 
			if (typeOfUse != null && typeOfUse != '' && typeOfUse != 'Business' && typeOfUse != 'Personal' && typeOfUse != "Student") {
				nlapiLogExecution("ERROR", "Null/Invalid use type", typeOfUse);
				redirectToErrorPage(response, "Please enter Business/Personal/Student for use.");
				return;
			}
			
			//Check workEmail 
			if (workEmail == null || workEmail == '' || workEmail.indexOf('@') == -1) {
				nlapiLogExecution("ERROR", "Null/Invalid email", workEmail);
				redirectToErrorPage(response, "Please enter a valid work email.");
				return;
			}
	
			//Check workPhone
			if (workPhone == null || workPhone == '') {
				nlapiLogExecution("ERROR", "Null/Invalid work phone", workEmail);
				redirectToErrorPage(response, "Please enter a valid work phone.");
				return;
			}
			
			//Leadsource
			if(leadSource ==null || leadSource==''){
				nlapiLogExecution("ERROR", "Invalid lead Source", product);
				redirectToErrorPage(response, "Invalid Request. Please contact Rapid7 Support.");
				return;
			}
			
			
			//Check Country - CAN WE IMPLEMENT THIS?
			//Check stateOrProvince - CAN WE IMPLEMENT THIS?
			
			if(!validCampaignId(leadSource)){
				leadSource='256105';
				nlapiLogExecution('DEBUG','CampaignId set for invalid campaign Id',leadSource);
			}else{
				nlapiLogExecution('DEBUG','CampaignId is valid','yup');
			}
			
			//nlapiLogExecution('DEBUG','CampaignId tests working','yup');
			
			
			//Setting lead record fields
			var customerRecordFields = new Array();
			customerRecordFields['companyname'] = companyName;
			customerRecordFields['custentityr7annualrevenue'] = annualRevenue;
			customerRecordFields['country'] = country;
			customerRecordFields['state'] = stateOrProvince;
			customerRecordFields['email'] = workEmail;
			customerRecordFields['phone'] = workPhone;
			customerRecordFields['leadsource'] = leadSource;
			
			customerRecordFields['custentityr7territoryassignmentflag'] = 'F';
			
			//Creating new lead record
			var customerIid = createNewCustomerRecord(customerRecordFields);
			if (customerIid == null) {
				nlapiLogExecution('ERROR', 'Could not create customer record', 'problem')
				redirectToErrorPage(response, "Your request cannot be processed presently. Please contact Rapid7 Support.");
				return;
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
			contactRecordFields['phone'] = workPhone;
			contactRecordFields['company'] = customerIid;
			//Using msLicTemplate
			contactRecordFields['custentityr7leadsourcecontact'] = leadSource;
			contactRecordFields['custentityr7contactmslicensetemplate'] = msLicTemplate;
			
			//Creating new contact record
			var contactIid = createNewContactRecord(contactRecordFields);
			if (contactIid == null) {
				nlapiLogExecution('ERROR', 'Could not create contact record', 'problem');
				redirectToErrorPage(response, "Your request cannot be processed presently. Please contact Rapid7 Support.");
				return;
			}
			else {
				nlapiLogExecution('DEBUG', 'Contact Record Created Successfully with Id', contactIid);
			}
			
			//For Nexpose Community IPR
			//Right now we use only 1 hardcoded field which is 4
			//this is used instead of product
			var marketingTemplateId = 4;
			
			if(accessCode != null && accessCode != ''){
				marketingTemplateId = getNXTemplateIdForAXSCode(accessCode);
			}
			
			//Setting nexpose License Record Fields
			var nexposeLicenseFields = new Array();
			
			var nxTemplateRecord = nlapiLoadRecord('customrecordr7nxlicensemarketingtemplate', marketingTemplateId);
			
			nexposeLicenseFields['iidForTemplate'] = nxTemplateRecord.getFieldValue('custrecordr7nxlicensetempnxrecord');
			nexposeLicenseFields['quantity'] = 1;
			nexposeLicenseFields['duration'] = nxTemplateRecord.getFieldValue('custrecordr7nxlicensetempexpirationdays'); //trial license days
			nexposeLicenseFields['customer'] = customerIid;
			nexposeLicenseFields['contact'] = contactIid;
			nexposeLicenseFields['salesorder'] = '';
			nexposeLicenseFields['opportunity'] = '';
			nexposeLicenseFields['salesrep'] = '';
			
			var nexposeFields = createNewNexposeLicense(nexposeLicenseFields);
			if (nexposeFields['custrecordr7nxproductkey'] == null) {
				nlapiLogExecution('ERROR', 'Could not create nexpose license record', 'problem');
				redirectToErrorPage(response, "Your request cannot be processed presently. Please contact Rapid7 Support.");
				return;
			}
			else {
				nlapiLogExecution('DEBUG', 'Nexpose License Created Successfully with Product Key', nexposeFields['custrecordr7nxproductkey']);
			}
			
			//Send Email
			if (nexposeFields['custrecordr7nxproductkey'] != null && nexposeFields['custrecordr7nxproductkey'] != '') {
				
				sendNotificationEmailNexpose(nexposeFields['internalid'], marketingTemplateId);
			
			}
			
			if (redirectCode != null && redirectCode != '') {
				var redirectURL = grabRedirectURL(redirectCode);
				
				if (redirectURL != null && redirectURL != '') {
					returnPath = redirectURL;
				}
			}
			
			response.sendRedirect('EXTERNAL', returnPath);
			
		}
	}catch(err){
		//var stackTrace = err.getStackTrace();
		//var errCode = err.getCode();
		//var errId = err.getId();
		//var errDetails = err.getDetails();
		nlapiLogExecution('ERROR',"Code: "+err,err);
		redirectToErrorPage(response,"Your request cannot be processed presently. Please contact Rapid7 Support.");
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

/*
function redirectToErrorPage(response,msg){
	//var parameters = new Array();
	parameters['errormsg'] = msg;
	if (requestOriginatingFrom != null && requestOriginatingFrom != '') {
		response.sendRedirect('EXTERNAL', requestOriginatingFrom, null, null, parameters);
	}	
}
*/

function createNewCustomerRecord(fields){
	var record = nlapiCreateRecord('lead');
	for(field in fields){
		record.setFieldValue(field,fields[field]);
	}
	
	noOfCompaniesWithSameName = getNoOfCompaniesWithSameName(fields['companyname']);
	
	nlapiLogExecution('DEBUG','No Of Companies with same name',noOfCompaniesWithSameName);
	if (noOfCompaniesWithSameName != 0) {
		var randomNo = Math.floor(Math.random()*1001);
		var newName = fields['companyname'] + ".dup" + parseInt(noOfCompaniesWithSameName + 1) + "." + randomNo ;
		record.setFieldValue('entityid', newName);
		nlapiLogExecution('DEBUG','Set entityid to',newName);
	}
	try {
		var id = null;
		id = nlapiSubmitRecord(record,null,true);
	}catch(err){
		//var stackTrace = err.getStackTrace();
		//var errCode = err.getCode();
		//var errId = err.getId();
		id = err.getInternalId(); //If error was thrown in afterSubmit script
		//var errDetails = err.getDetails();
		if(id!=null){nlapiLogExecution('ERROR','Error Id',id);}
		nlapiLogExecution('ERROR'," Details: ",""+err);
	}
	return id;
}

function getNoOfCompaniesWithSameName(companyName){
	var searchFilters = new Array(new nlobjSearchFilter('companyname',null,'is',companyName));
	var searchResults = nlapiSearchRecord('customer',null,searchFilters);
	if (searchResults != null) {
		return searchResults.length;
	}else{
		return 0;
	}
}


function createNewContactRecord(fields){
	//Creating contact record
	var record = nlapiCreateRecord('contact');
	
	//Setting field values
	for(field in fields){
		record.setFieldValue(field,fields[field]);
	}
	
	try {
		var id = nlapiSubmitRecord(record);
	}catch(err){
		//var stackTrace = err.getStackTrace();
		//var errCode = err.getCode();
		//	var errId = err.getId();
		id = err.getInternalId(); //If error was thrown in afterSubmit script
		//var errDetails = err.getDetails();
		nlapiLogExecution('ERROR',"Code: "+err);
	}
	
	//Return id if contact was created (even with errors)
	return id;
}


 function createNewNexposeLicense(fields){
	
	//Creating new metasploit License record from Template
	var newRecord = nlapiCopyRecord('customrecordr7nexposelicensing',fields['iidForTemplate']);
	
	//Null out ProductKey, Nexpose License Serial No, Product Serial No
	newRecord.setFieldValue('custrecordr7nxproductkey','');
	newRecord.setFieldValue('custrecordr7nxlicenseserialnumber','');
	newRecord.setFieldValue('custrecordr7nxproductserialnumber','');
	
	//Setting Start Date 
	//newRecord.setFieldValue('custrecordr7nxlicenseoemstartdate',nlapiDateToString(new Date())); //No start date for metasploit
	
	//Computing endDate = today + quantityPurchased*duration
	var daysToBeAdded = parseInt(fields['duration']);
	var computedExpirationDate = nlapiAddDays(new Date(),daysToBeAdded);
	var endDate = nlapiDateToString(computedExpirationDate);
	
	//Setting other miscellaneous fields on the license record
	//newRecord.setFieldValue('custrecordr7nxlicensesalesrep',fields['salesrep']);
	newRecord.setFieldValue('custrecordr7nxlicenseoemstartdate',nlapiDateToString(new Date()));
	newRecord.setFieldValue('custrecordr7nxlicensecustomer',fields['customer']);
	newRecord.setFieldValue('custrecordr7nxlicensesalesorder',fields['salesorder']);
	newRecord.setFieldValue('custrecordr7nxlicensecontact',fields['contact']);
	newRecord.setFieldValue('custrecordr7nxlicenseopportunity',fields['opportunity']);
		
	//Setting End Date
	newRecord.setFieldValue('custrecordr7nxlicenseexpirationdate',endDate);
	
	
	var fields = new Array();
	var id = null;
	try {
		id = nlapiSubmitRecord(newRecord);
	} 
	catch (err) {
		//var stackTrace = err.getStackTrace();
		//var errCode = err.getCode();
		//var errId = err.getId();
		id = err.getInternalId(); //If error was thrown in afterSubmit script
		//var errDetails = err.getDetails();
		nlapiLogExecution('ERROR',"Code: "+err);
	}
	
	if(id!=null){
		fields = nlapiLookupField('customrecordr7nexposelicensing',id,
		new Array('custrecordr7nxproductkey','internalid'));	
	}
	return fields;
	
	/*
	}catch(e){
		sendErrorEmail(fields,"Could not submit new license record "+e); 
		return ("XXX",nlapiDateToString(new Date()),nlapiDateToString(nlapiAddDays(new Date(),fields['duration'])),false);
	}
	*/
}

function sendErrorEmail(fields,text){
	nlapiLogExecution("ERROR",'Error on',text);
	var fieldListing ="";
	for(field in fields){
		fieldListing += field + ": " + fields[field] + "<br>";
	}	
	nlapiSendEmail(2,2,
	'Error on R7_MSLicensing_Unscheduled_SalesOrderProcessed',
	text + "<br>" + fieldListing);
}

function parameterIsValid(param){
	for(var i=0;i<validParameters.length;i++){
		if(param==validParameters[i]){
			return true;
		}
	}
	return false;
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
			nlapiSendEmail(55011, 55011, 'NULL response from HD validEmailDomain server', 'Look into this.. maybe defaut to true in this case');
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

function isEmpty(str){

	if (str != null && str != '') {
		str = str.replace(/\s/g, '');
	}
	
	if (str == null || str == '' || str.length < 1){
		return true;
	}
	
	return false;
}


function sendNotificationEmailNexpose(internalId,templateId){
	
				nlapiLogExecution('DEBUG','InteralId License Record',internalId);
			
				/*From the license record*/
				var licenseRecord = nlapiLoadRecord('customrecordr7nexposelicensing', internalId);
				
				
				var contactId = licenseRecord.getFieldValue('custrecordr7nxlicensecontact');
				var noIP = licenseRecord.getFieldValue('custrecordr7nxlicensenumberips');
				var nxposeLicense = "NXL"+internalId;

				nlapiLogExecution('DEBUG', 'ContactId', contactId);
				
				/*From the contact record*/
				try {
					var contactRecord = nlapiLoadRecord('contact', contactId);
				}
				catch(err){
					nlapiLogExecution("DEBUG",'Error Loading contact record '+err.name,err.message);
					return;
				}
				
				var contactEmailAddress = contactRecord.getFieldValue('email');
				var contactName = contactRecord.getFieldValue('entityid');
				var companyId = contactRecord.getFieldValue('company');
				var companyName = contactRecord.getFieldText('company');
				
				var fieldsFromContactRecord = "CompanyId:" + companyId + " CompanyName:" + companyName + " ContactName:" + contactName + " ContactEmailAddress:" + contactEmailAddress;
				nlapiLogExecution('DEBUG', 'FieldsFromContactRecord', fieldsFromContactRecord);
				
				var salesRepEmail = nlapiLookupField('customer', companyId, 'salesrep');
				
				
				/*From the template record*/
				var templateRecord = nlapiLoadRecord('customrecordr7nxlicensemarketingtemplate', templateId);
				var emailTemplateId = templateRecord.getFieldValue('custrecordr7nxlicensetempemailactivation');
				var days = templateRecord.getFieldValue('custrecordr7nxlicensetempexpirationdays');
				var sendEmailFrom = templateRecord.getFieldValue('custrecordr7nxlicensetempsendemailfrom');
				var notificationList = templateRecord.getFieldValues('custrecordr7nxlicensetempnotification');
				var notifySalesRep = templateRecord.getFieldValue('custrecordr7nxlicensetempnotifysalesrep');
				var description = templateRecord.getFieldValue('altname');
				var owner = templateRecord.getFieldValue('owner');
				
				var fieldsFromTemplateRecord = "EmailTemplate:" + emailTemplateId + " SendEmailFrom:" + sendEmailFrom +
				" NotifySalesRep:" +
				notifySalesRep;
				nlapiLogExecution('DEBUG', 'FieldsFromTemplateRecord', fieldsFromTemplateRecord);
				

				/* Notifying the contact with his license information */
				if(sendEmailFrom==null || sendEmailFrom==null){sendEmailFrom = salesRepEmail; }
				if(sendEmailFrom==null || sendEmailFrom==null){sendEmailFrom = owner;}
				
				var records = new Array();
				//records['contact'] = contactId;
				records['recordtype'] = 'customrecordr7nexposelicensing';
				records['record'] = internalId;

				var subject, body;
				var templateVersion = nlapiLoadRecord('emailtemplate', emailTemplateId).getFieldValue('templateversion');

				if (templateVersion != 'FREEMARKER') { // CRMSDK Note: this is being deprecated.
					var merge = nlapiMergeRecord(emailTemplateId, 'customrecordr7nexposelicensing', internalId);
					subject = merge.getName();
					body = merge.getValue();
				}
				else { // the new FREEMARKER
					var emailMerger = nlapiCreateEmailMerger(emailTemplateId);
					emailMerger.setCustomRecord('customrecordr7nexposelicensing', internalId);
					
					var mergeResult = emailMerger.merge();
					subject = mergeResult.getSubject();
					body = mergeResult.getBody();
				}
				
				nlapiSendEmail(sendEmailFrom, contactEmailAddress, subject, body, null, null, records);
				/* Notifying the contact with his license information */
				
				
				/* Notifying the salesRep and the notificationList */
				var notificationText = contactName + " from " + companyName + " has been automatically given" +
				" a " + noIP + " IP NeXpose License " + nxposeLicense + 
				" expiring on " +
				nlapiDateToString(nlapiAddDays(new Date(), days)) +
				". This was created from the '" +
				description +
				"' template.";
				
				if (notificationList != null) {
					for (var j = 0; j < notificationList.length; j++) {
						nlapiSendEmail(owner, notificationList[j], 'NeXpose License Download', notificationText);
						nlapiLogExecution('DEBUG','Notification List',notificationList[j]);
					}
				}
				
				if (notifySalesRep == 'T') {
					nlapiSendEmail(owner, salesRepEmail, 'NeXpose License Download', notificationText);
				}
				/* Notifying the salesRep and the notificationList */
				
				nlapiLogExecution('DEBUG', 'All Done', '--------------------------------');
	
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