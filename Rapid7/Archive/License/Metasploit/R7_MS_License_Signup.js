function createCustomerContactLicense(request,response){
	
	//this.response = response2;
	try {
		this.validParameters = new Array("custparamfirstname", "custparamlastname", "custparamtitle", "custparamcompanyname", "custparamuse", "custparamemail", "custparamphone", "custparamcountry", "custparamstate", "custparamcustentityr7annualrevenue", "custparamcustentityr7contacthowdidyouhearaboutus", "h", "deploy", "Submit", "compid", "script");
		
		
		if (request.getMethod() == 'POST') {
		
			var url = request.getURL();
			this.parameters = request.getAllParameters();
			var headers = request.getAllHeaders();
			
			//Sanitizing all input data
			//var firstName = htmlEncode(request.getParameter("custparamfirstname"));
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
			var returnPath = request.getParameter("custparamreturnpath");
			var product = request.getParameter("custparamproduct");
			var nxLicTemplate = request.getParameter("custparamcustentityr7contactnxlicensetemplate");
			this.requestOriginatingFrom = request.getHeader("Referer");
			//requestOriginatingFrom = "https://www.rapid7.com/register/metasploit-trial.jsp";
			
			
	//crash
			
			//Values for headers, parameters
			nlapiLogExecution('DEBUG', 'URL', url);
			for (param in parameters) {
				nlapiLogExecution('DEBUG', 'Parameter: ' + param, parameters[param]);
			}
			for (head in headers) {
				nlapiLogExecution('DEBUG', 'Header: ' + head, headers[head]);
			}
			
			
			//Parameter based checks
			if (parameters['deploy'] != 1) {
				nlapiLogExecution("ERROR", 'Invalid/unrecognized value of parameter deploy', parameters[deploy]);
				redirectToErrorPage(response, "Your request cannot be processed. Please contact Rapid7 Support.");
				return;
			}
			
			if (parameters['h'] != 'f545d011e89bdd812fe1') {
				nlapiLogExecution("ERROR", 'Invalid/unrecognized value of parameter h', parameters[h]);
				redirectToErrorPage(response, "Your request cannot be processed. Please contact Rapid7 Support.");
				return;
			}
			
			/*
	 for (param in parameters) {
	 if (!parameterIsValid(param)) {
	 nlapiLogExecution("ERROR", 'Invalid/unrecognized Parameter', param);
	 redirectToErrorPage(response, "Your request cannot be processed. Please contact Rapid7 Support.");
	 return;
	 }
	 }
	 */
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
			if (!validEmailDomain(workEmail)) {
				nlapiLogExecution("ERROR", "Invalid/free email", workEmail);
				redirectToErrorPage(response, "Please enter a valid work email.");
				return;
			}
			if (freeEmailDomain(workEmail)) {
				nlapiLogExecution("ERROR", "Invalid/free email", workEmail);
				redirectToErrorPage(response, "Please enter a valid work email.");
				return;
			}
			
					
			/*
			//Check LeadSource
			if(!isValidLeadSource(leadSource)){
				leadSource = '256104';				
			}
			*/
			
			
			//Check workPhone
			
			//Check Country - CAN WE IMPLEMENT THIS?
			
			//Check stateOrProvince - CAN WE IMPLEMENT THIS?
			
			//Check annualRevenue 
			if (annualRevenue == null || annualRevenue == '') {
				nlapiLogExecution("ERROR", "Annual revenue not specified", annualRevenue);
				redirectToErrorPage(response, "Please enter a valid annual Revenue.");
				return;
			}
			
			if(returnPath==null || returnPath==''){
				nlapiLogExecution("ERROR", "Return Path not specified.", annualRevenue);
				redirectToErrorPage(response, "Your request cannot be processed presently. Please contact Rapid7 Support.");
				return;
			}
			
			
			//Setting lead record fields
			var customerRecordFields = new Array();
			customerRecordFields['companyname'] = companyName;
			customerRecordFields['custentityr7annualrevenue'] = annualRevenue;
			//customerRecordFields['custentityr7contacthowdidyouhearaboutus'] = heardFrom;
			customerRecordFields['country'] = country;
			customerRecordFields['state'] = stateOrProvince;
			customerRecordFields['email'] = workEmail;
			customerRecordFields['phone'] = workPhone;
			customerRecordFields['leadsource'] = leadSource;
			customerRecordFields['custentityr7territoryassignmentflag'] = 'T';
			
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
			contactRecordFields['custentityr7contactnxlicensetemplate'] = nxLicTemplate;
			
			//Creating new contact record
			var contactIid = createNewContactRecord(contactRecordFields);
			if (contactIid == null) {
				nlapiLogExecution('ERROR', 'Could not create contact record', 'problem')
				redirectToErrorPage(response, "Your request cannot be processed presently. Please contact Rapid7 Support.");
				return;
			}
			else {
				nlapiLogExecution('DEBUG', 'Contact Record Created Successfully with Id', contactIid);
			}
			
			
			//Setting metasploit License Record Fields
			var metasploitLicenseFields = new Array();
			
			if (product=='Metasploit Express') {
				var msTemplateRecord = nlapiLoadRecord('customrecordr7mslicensemarketingtemplate', '4');
				metasploitLicenseFields['custrecordr7mslicensemarketingtemplate'] = '4';
			}else if(product=='Metasploit Pro'){
				var msTemplateRecord = nlapiLoadRecord('customrecordr7mslicensemarketingtemplate', '5');
				metasploitLicenseFields['custrecordr7mslicensemarketingtemplate'] = '5';
			}	
		
			metasploitLicenseFields['iidForTemplate'] = msTemplateRecord.getFieldValue('custrecordr7mslicensetempmsrecord');
			metasploitLicenseFields['quantity'] = 1;
			metasploitLicenseFields['duration'] = msTemplateRecord.getFieldValue('custrecordr7mslicensetempexpirationdays'); //trial license days
			metasploitLicenseFields['salesrep'] = '';
			metasploitLicenseFields['customer'] = customerIid;
			metasploitLicenseFields['salesorder'] = '';
			metasploitLicenseFields['contact'] = contactIid;
			metasploitLicenseFields['opportunity'] = '';
		
			
			var metasploitFields = createNewMetasploitLicense(metasploitLicenseFields);
			if (metasploitFields['custrecordr7msproductkey'] == null) {
				nlapiLogExecution('ERROR', 'Could not create metasploit license record', 'problem')
				redirectToErrorPage(response, "Your request cannot be processed presently. Please contact Rapid7 Support.");
				return;
			}
			else {
				nlapiLogExecution('DEBUG', 'Metasploit License Created Successfully with Product Key', metasploitFields['custrecordr7msproductkey']);
			}
			
			//Send Email
			sendNotificationEmailsMetasploit(metasploitFields['internalid']);			
			response.sendRedirect('EXTERNAL', returnPath);
		}
	}catch(err){
		//var stackTrace = err.getStackTrace();
		//var errCode = err.getCode();
		//var errId = err.getId();
		//var errDetails = err.getDetails();
		nlapiLogExecution('ERROR'," Details: "+err);
		redirectToErrorPage(response,"Your request cannot be processed presently. Please contact Rapid7 Support.");
	}	
}

function redirectToErrorPage(response,msg){
	parameters['errormsg'] = msg;
	parameters['h']= null;
	parameters['deploy']= null;
	parameters['compid']= null;
	parameters['script']= null;
	response.sendRedirect('EXTERNAL',requestOriginatingFrom,null,null,parameters);	
}


function createNewCustomerRecord(fields){
	var record = nlapiCreateRecord('lead');
	for(field in fields){
		record.setFieldValue(field,fields[field]);
	}
	
	noOfCompaniesWithSameName = getNoOfCompaniesWithSameName(fields['companyname']);
	if (noOfCompaniesWithSameName != 0) {
		record.setFieldValue('entityid', fields['companyname'] + noOfCompaniesWithSameName)
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
		nlapiLogExecution('ERROR'," Details: "+err);
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
		//var errId = err.getId();
		id = err.getInternalId(); //If error was thrown in afterSubmit script
		//var errDetails = err.getDetails();
		nlapiLogExecution('ERROR'," Details: "+err);
	}
	
	//Return id if contact was created (even with errors)
	return id;
}


 function createNewMetasploitLicense(fields){
	
	//Creating new metasploit License record from Template
	var newRecord = nlapiCopyRecord('customrecordr7metasploitlicensing',fields['iidForTemplate']);
	
	//Null out ProductKey, Nexpose License Serial No, Product Serial No
	newRecord.setFieldValue('custrecordr7msproductkey','');
	newRecord.setFieldValue('custrecordr7nxlicenseserialnumber','');
	newRecord.setFieldValue('custrecordr7msproductserialno','');
	
	//Setting Start Date 
	//newRecord.setFieldValue('custrecordr7nxlicenseoemstartdate',nlapiDateToString(new Date())); //No start date for metasploit
	
	//Computing endDate = today + quantityPurchased*duration
	var daysToBeAdded = parseInt(fields['duration']);
	var computedExpirationDate = nlapiAddDays(new Date(),daysToBeAdded);
	var endDate = nlapiDateToString(computedExpirationDate);
	
	//Setting End Date
	newRecord.setFieldValue('custrecordr7mslicenseexpirationdate',endDate);
	
	//Setting other miscellaneous fields on the license record
	//newRecord.setFieldValue('custrecordr7mslicensesalesrep',fields['salesrep']);
	newRecord.setFieldValue('custrecordr7mslicensecustomer',fields['customer']);
	newRecord.setFieldValue('custrecordr7mslicensesalesorder',fields['salesorder']);
	newRecord.setFieldValue('custrecordr7mslicensecontact',fields['contact']);
	newRecord.setFieldValue('custrecordr7mslicenseopportunity',fields['opportunity']);
	newRecord.setFieldValue('custrecordr7mslicensemarketingtemplate',fields['custrecordr7mslicensemarketingtemplate']);
	newRecord.setFieldValue('iidForTemplate','');
	
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
		nlapiLogExecution('ERROR'," Details: "+err);
	}
	
	if(id!=null){
		fields = nlapiLookupField('customrecordr7metasploitlicensing',id,new Array('name','custrecordr7msproductkey','internalid'));
		fields['internalid'] = id;	
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

function sendNotificationEmailsMetasploit(internalId){
			
	var minimumCost = 150;
	
	if (nlapiGetContext().getRemainingUsage() > minimumCost) {
			
	nlapiLogExecution('DEBUG','InternalId License Record',internalId);
			
	/* Gathering details from the license record for the email*/
	var licenseRecord = nlapiLoadRecord('customrecordr7metasploitlicensing', internalId);
	
	//To prevent the scheduled script from sending duplicate license key
	nlapiSubmitField('customrecordr7metasploitlicensing',internalId,'custrecordr7mslicensemarketingtemplate','');
	
	var templateId = licenseRecord.getFieldValue('custrecordr7mslicensemarketingtemplate');	
	var templateId2 = licenseRecord.getFieldText('custrecordr7mslicensemarketingtemplate')
	
	nlapiLogExecution('DEBUG','Template Id Value',templateId);
	nlapiLogExecution('DEBUG','Template Id Text',templateId2);
	
	var contactId = licenseRecord.getFieldValue('custrecordr7mslicensecontact');
	var noIP = licenseRecord.getFieldValue('custrecordr7mslicensenumberips');
	var mspltLicense = "MSL"+internalId;
	
	nlapiLogExecution('DEBUG', 'ContactId', contactId);
				
	/* Gathering details for the download email From the contact record*/
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
	/* Gathering details for the download email From the contact record*/			
				
	/*From the template record*/
	var templateRecord = nlapiLoadRecord('customrecordr7mslicensemarketingtemplate', templateId);
	var emailTemplateId = templateRecord.getFieldValue('custrecordr7mslicensetempemailactivation');
	var days = templateRecord.getFieldValue('custrecordr7mslicensetempexpirationdays');
	var sendEmailFrom = templateRecord.getFieldValue('custrecordr7mslicensetempsendemailfrom');
	var notificationList = templateRecord.getFieldValues('custrecordr7mslicensetempnotification');
	var notifySalesRep = templateRecord.getFieldValue('custrecordr7mslicensetempnotifysalesrep');
	var description = templateRecord.getFieldValue('altname');
	var owner = templateRecord.getFieldValue('owner');
	var fieldsFromTemplateRecord = "EmailTemplate:" + emailTemplateId + " SendEmailFrom:" + sendEmailFrom +
				" NotifySalesRep:" +
				notifySalesRep;
	nlapiLogExecution('DEBUG', 'FieldsFromTemplateRecord', fieldsFromTemplateRecord);
				

	/* Notifying the contact with his license information */
	if(sendEmailFrom==null || sendEmailFrom==null){
		sendEmailFrom = salesRepEmail; 
	}
	if(sendEmailFrom==null || sendEmailFrom==null){
		sendEmailFrom = owner;
	}
	
				
	var records = new Array();
	records['recordtype'] = 'customrecordr7metasploitlicensing';
	records['record'] = internalId;
	var body = nlapiMergeRecord(emailTemplateId, 'customrecordr7metasploitlicensing', internalId);
	try {
		nlapiSendEmail(sendEmailFrom, contactEmailAddress, body.getName(), body.getValue(), null, null, records);
	}catch(err){
		nlapiSendEmail(2, contactEmailAddress, body.getName(), body.getValue(), null, null, records);
	}
	/* Notifying the contact with his license information */
				
				
	/* Notifying the salesRep and the notificationList */
	var notificationText = contactName + " from " + companyName + " has been automatically given" +
	" a " + noIP + " Metasploit License " + mspltLicense + 
	" expiring on " +
	nlapiDateToString(nlapiAddDays(new Date(), days)) +
	". This was created from the '" +
	description +
	"' template.";
				
	if (notificationList != null) {
		for (var j = 0; j < notificationList.length; j++) {
		nlapiSendEmail(owner, notificationList[j], 'Metasploit License Download', notificationText);
		nlapiLogExecution('DEBUG','Notification List',notificationList[j]);
		}
	}
	
	try {
		if (notifySalesRep == 'T') {
			nlapiSendEmail(2, salesRepEmail, 'Metasploit License Download', notificationText);
		}
	}catch(err){}
	/* Notifying the salesRep and the notificationList */
	nlapiLogExecution('DEBUG', 'All Done', '--------------------------------');
	}
}



