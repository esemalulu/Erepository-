function validateParameters(request){
    //All parameters in parameters associative array 
    
    var loginCode = parameters["custparamcustentityr7logincode"];
    if (loginCode == null || loginCode == '') {
        nlapiLogExecution("ERROR", "No login Code", loginCode);
        return false;
    }
    
    //Check if email is provided
    var workEmail = parameters["custparamemail"];
    //Check workEmail 
    if (workEmail == null || workEmail == '' || workEmail.indexOf('@') == -1) {
        nlapiLogExecution("ERROR", "Null/Invalid email", workEmail);
        return false;
    }
    
    //Check if the parent company exists
    var parentCoId = parameters["custparamcoid"];
    if (parentCoId != null && parentCoId != '') {
        var count = nlapiSearchRecord('customer', null, new nlobjSearchFilter('internalid', null, 'is', parentCoId));
        if (count != null) {
            nlapiLogExecution('DEBUG', 'Count of Parent CoIId', count.length);
        }
        if (count == null || count.length < 1) 
            return false;
        this.parentCustomerRecord = nlapiLoadRecord('customer', parentCoId);
    }
    else {
        return false;
    }
    
    //Setting custparamaccess
    if (parameters["custparamaccess"] == null || parameters["custparamaccess"] == '') {
        parameters["custparamaccess"] = 'F';
    }
    
    return true;
}

function authenticateUsingLoginCode(){
    var coId = parameters["custparamcoid"];
    var loginCode = parameters["custparamcustentityr7logincode"];
    
    var lookedUpField = parentCustomerRecord.getFieldValue("custentityr7logincode");
    nlapiLogExecution('DEBUG', 'Login Code provided', loginCode);
    nlapiLogExecution('DEBUG', 'Looked up login code for coId:' + coId, loginCode);
    
    if (lookedUpField == loginCode) 
        return true;
    return false;
}

function createSubcustomerAndGiveAccess(){

    //Parse parameters
    var fields = new Array();
    fields['companyname'] = parentCustomerRecord.getFieldValue('companyname') + " - " + parameters["custparamlast"] + ", " + parameters["custparamfirst"];
    fields['parent'] = parameters["custparamcoid"];
    fields['email'] = parameters["custparamemail"];
    fields['phone'] = parameters["custparamphone"];
    //fields['entitystatus'] = 8;
    fields['leadsource'] = 349933;
    fields['salesrep'] = parentCustomerRecord.getFieldValue('salesrep');
    fields['custentityr7accountmanager'] = parentCustomerRecord.getFieldValue('custentityr7accountmanager');
	fields['category'] = parentCustomerRecord.getFieldValue('category');
	fields['custentityr7dunsnumber'] = parentCustomerRecord.getFieldValue('custentityr7dunsnumber');
	fields['partner'] = parentCustomerRecord.getFieldValue('partner');
	
   
    fields['taxable'] = parentCustomerRecord.getFieldValue('taxable');
    fields['custentityr7excludefromautojunkscrub'] = 'T';
    fields['terms'] = null;
    
    //Set Additional fields for access
    if (parameters["custparamaccess"] == 'T') {
        var generatedPassword = generateRandomString();
        this.newGeneratedPassword = generatedPassword;
        nlapiLogExecution('DEBUG', "Password Generated", newGeneratedPassword);
        fields["giveaccess"] = 'T';
        fields["acccessrole"] = 1079;
        fields["password"] = generatedPassword;
        fields["password2"] = generatedPassword;
    }
    
    //Create customer record and set fields                                                                                                                                                          
    var record = nlapiCreateRecord('customer');
    for (field in fields) {
        record.setFieldValue(field, fields[field]);
    }
    
    record = copyItemsSublist(record);
    
    //If no of companies with same name 
    noOfCompaniesWithSameName = getNoOfCompaniesWithSameName(fields['companyname']);
    nlapiLogExecution('DEBUG', 'No Of Companies with same name', noOfCompaniesWithSameName);
    if (noOfCompaniesWithSameName != 0) {
        var randomNo = Math.floor(Math.random() * 1001);
        var newName = fields['companyname'] + "." + parseInt(noOfCompaniesWithSameName + 1) + "." + randomNo;
        record.setFieldValue('entityid', newName);
        nlapiLogExecution('DEBUG', 'Set entityid to', newName);
    }
    
    var id = null;
    id = nlapiSubmitRecord(record, null, true);
    return id;
}


function copyItemsSublist(record){
    var fields = ["item", "level", "price"];
    for (var i = 1; i <= parentCustomerRecord.getLineItemCount('itempricing'); i++) {
        record.selectNewLineItem('itempricing');
        for (var j = 0; j < fields.length; j++) {
            record.setCurrentLineItemValue('itempricing', fields[j], parentCustomerRecord.getLineItemValue('itempricing', fields[j], i));
            //nlapiLogExecution('DEBUG', "(I,J):" + i + "," + j + ' Setting field value of ' + fields[j], parentCustomerRecord.getLineItemValue('itempricing', fields[j], i));
        }
        record.commitLineItem('itempricing');
    }
    return record;
}

function createContactAndAttachToSubcustomer(subcustomerId){
    //Setting contact record fields
    var contactRecordFields = new Array();
    contactRecordFields['firstname'] = parameters["custparamfirst"];
    contactRecordFields['lastname'] = parameters["custparamlast"];
    contactRecordFields['title'] = parameters["custparamtitle"];
    contactRecordFields['email'] = parameters["custparamemail"];
    contactRecordFields['phone'] = parameters["custparamphone"];
    contactRecordFields['globalsubscriptionstatus'] = 1;
    contactRecordFields['custentity_enableimasync'] = 'T';
    contactRecordFields['custentityr7excludefromautojunkscrub'] = 'T';
    contactRecordFields['company'] = subcustomerId;
    contactRecordFields['entityid'] = parameters["custparamfirst"] + " " + parameters["custparamlast"] + Math.floor(Math.random() * 1000000);
    
    //Creating new contact record
    var record = nlapiCreateRecord('contact');
    
    //Setting field values
    for (field in contactRecordFields) {
        record.setFieldValue(field, contactRecordFields[field]);
    }
    
    var contactIid = null;
    contactIid = nlapiSubmitRecord(record);
    return contactIid;
}

function sendContactCreatedInfoEmailToAdmin(){

    var salesRep = parentCustomerRecord.getFieldValue('salesrep');
    var adminText = nlapiLookupField('contact', 
	parentCustomerRecord.getFieldValue('custentityr7loginadministrator'), 
	'email');
	if(adminText=='' || adminText==null){adminText = parentCustomerRecord.getFieldValue('custentityr7loginadministrator');}
    
	nlapiLogExecution('DEBUG','AdminEmail',adminText);
	
    if (parameters["custparamaccess"] == 'T') {
        var accessGranted = true;
    }
    
    var granted = "was not";
    granted = (accessGranted) ? "was" : "was not";
    
    var emailText = "A Contact record for " + parameters["custparamfirst"] + " " +
    parameters["custparamlast"] +
    " was successfully created for your Rapid7 account." +
    "This Contact " +
    granted +
    " given login access to your Customer account.";
    
    nlapiSendEmail(salesRep, adminText, "Contact Created", emailText);
}


function redirectToErrorPage(response, msg){
    //var parameters = new Array();
    this.parameters['errormsg'] = msg;
    response.sendRedirect('EXTERNAL', url, null, null, parameters);
}

function generateRandomString(){
    var chars = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXTZabcdefghiklmnopqrstuvwxyz";
    var string_length = 7;
    var randomstring = '';
    for (var i = 0; i < string_length; i++) {
        var rnum = Math.floor(Math.random() * chars.length);
        randomstring += chars.substring(rnum, rnum + 1);
    }
    return randomstring;
}

function sendErrorEmail(fields, text){
    nlapiLogExecution("ERROR", 'Error on', text);
    var fieldListing = "";
    for (field in fields) {
        fieldListing += field + ": " + fields[field] + "<br>";
    }
    var adminUser =  nlapiLoadConfiguration('companypreferences').getFieldValue('custscriptr7_system_info_email_sender');
    nlapiSendEmail(adminUser,adminUser, 'Error on SelfService License Creation', text + "<br>" + fieldListing);
}

function parameterIsValid(param){
    for (var i = 0; i < validParameters.length; i++) {
        if (param == validParameters[i]) {
            return true;
        }
    }
    return false;
}

function htmlEncode(value){
    encodedHtml = escape(value);
    encodedHtml = encodedHtml.replace(/\//g, "%2F");
    encodedHtml = encodedHtml.replace(/\?/g, "%3F");
    encodedHtml = encodedHtml.replace(/=/g, "%3D");
    encodedHtml = encodedHtml.replace(/&/g, "%26");
    encodedHtml = encodedHtml.replace(/%20/g, " ");
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

function sendContactPasswordEmail(){

    var salesRep = parentCustomerRecord.getFieldValue('salesrep');
    var adminText = nlapiLookupField('contact', parentCustomerRecord.getFieldValue('custentityr7loginadministrator'), 'email');
    if(adminText=='' || adminText==null){adminText = parentCustomerRecord.getFieldValue('custentityr7loginadministrator');}
	
	var adminNameFields = nlapiLookupField('contact',
	parentCustomerRecord.getFieldValue('custentityr7loginadministrator'),
	new Array("firstname","lastname")
	);
	
	nlapiLogExecution('DEBUG','AdminEmail',adminText);
	
    if (parameters["custparamaccess"] == 'T') {
        var accessGranted = true;
    }
    
    var emailMessage = "You have been given login access to your company's account with Rapid7." +
    "\n\n  Your initial password has been set to " +
    this.newGeneratedPassword +
    ".\n\n You may change this password at any time. " +
    "Please contact your company's administrator " +
    adminNameFields["firstname"] + " " + adminNameFields["lastname"] +
    " if you have any questions. " +
    "\n\n Thank you!";
 
    nlapiSendEmail(salesRep, parameters["custparamemail"], 'Access granted', emailMessage);
    
}


function freeEmailDomain(email){
    if (email == null) 
        return false;
    if (email.indexOf('@') == -1) 
        return false;
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

function getNoOfCompaniesWithSameName(companyName){
    var searchFilters = new Array(new nlobjSearchFilter('companyname', null, 'is', companyName));
    var searchResults = nlapiSearchRecord('customer', null, searchFilters);
    if (searchResults != null) {
        return searchResults.length;
    }
    else {
        return 0;
    }
}
