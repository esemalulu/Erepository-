function createCustomerContactLicense(request,response){
	
	//https://forms.netsuite.com/app/site/hosting/scriptlet.nl?script=215&deploy=1&compid=663271&h=ba8e5e0448c983ac6137  
	
	try {
		this.validParameters = new Array("custparamfirstname", "custparamlastname", "custparamtitle", "custparamcompanyname", "custparamuse", "custparamemail", "custparamphone", "custparamcountry", "custparamstate", "custparamcustentityr7annualrevenue", "custparamcustentityr7contacthowdidyouhearaboutus", "h", "deploy", "Submit", "compid", "script");
		
		
		if (request.getMethod() == 'POST') {
		
			var url = request.getURL();
			this.parameters = request.getAllParameters();
			var headers = request.getAllHeaders();
			
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
			var returnPath = request.getParameter("custparamreturnpath");
			var product = request.getParameter("custparamproduct");
			var msLicTemplate = request.getParameter("custparamcustentityr7contactmslicensetemplate");
			this.requestOriginatingFrom = request.getHeader("Referer");
			//requestOriginatingFrom = "https://www.rapid7.com/register/metasploit-trial.jsp";
			
			
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
			/*
			//Check LeadSource
			if(!isValidLeadSource(leadSource)){
				leadSource = '256104';				
			}
			*/
			
			
			//Setting lead record fields
			var customerRecordFields = new Array();
			customerRecordFields['companyname'] = companyName;
			customerRecordFields['custentityr7annualrevenue'] = annualRevenue;
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
			contactRecordFields['custentityr7contactmslicensetemplate'] = msLicTemplate;
			
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
			
			//For Nexpose Community IPR
			var marketingTemplateId = 4;
			
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
				nlapiLogExecution('ERROR', 'Could not create nexpose license record', 'problem')
				redirectToErrorPage(response, "Your request cannot be processed presently. Please contact Rapid7 Support.");
				return;
			}
			else {
				nlapiLogExecution('DEBUG', 'Nexpose License Created Successfully with Product Key', nexposeFields['custrecordr7nxproductkey']);
			}
			
			//Send Email
			sendNotificationEmailNexpose(nexposeFields['internalid'],marketingTemplateId);
			response.sendRedirect('EXTERNAL', "http://www.rapid7.com/nexposecommunitythankyou.jsp");
			
		}
	}catch(err){
		//var stackTrace = err.getStackTrace();
		//var errCode = err.getCode();
		//var errId = err.getId();
		//var errDetails = err.getDetails();
		nlapiLogExecution('ERROR',"Code: "+err);
		redirectToErrorPage(response,"Your request cannot be processed presently. Please contact Rapid7 Support.");
	}	
}

function redirectToErrorPage(response,msg){
	//var parameters = new Array();
	parameters['errormsg'] = msg;
	response.sendRedirect('EXTERNAL',requestOriginatingFrom,null,null,parameters);	
}


function createNewCustomerRecord(fields){
	var record = nlapiCreateRecord('lead');
	for(field in fields){
		record.setFieldValue(field,fields[field]);
	}
	
	noOfCompaniesWithSameName = getNoOfCompaniesWithSameName(fields['companyname']);
	nlapiLogExecution('DEBUG','No Of Companies with same name',noOfCompaniesWithSameName);
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
		fields = nlapiLookupField('customrecordr7nexposelicensing',id,new Array('custrecordr7nxproductkey','internalid'));	
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
				var body = nlapiMergeRecord(emailTemplateId, 'customrecordr7nexposelicensing', internalId);
				nlapiSendEmail(sendEmailFrom, contactEmailAddress, body.getName(), body.getValue(), null, null, records);
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
