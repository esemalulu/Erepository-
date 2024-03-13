var validateCodes = new Array();
validateCodes['ips'] = 'dc'; //ip
validateCodes['eme'] = 'dc'; //email extension
validateCodes['emdf'] = 'dc'; //email domain free
validateCodes['emd'] = 'dc'; //email domain exists
validateCodes['ph'] = 'dc'; //phone number
validateCodes['c'] = 'dc'; //country
validateCodes['fn'] = 'dc'; //first name
validateCodes['ln'] = 'dc'; //last name
validateCodes['jt'] = 'dc'; //job title

function validate(request, response){
	
    if (request.getMethod() == 'GET' || request.getMethod() == 'POST') {
    	
		//Obtaining request parameters
        var email = request.getParameter('em');
        var phone = request.getParameter('ph');
        var country = request.getParameter('c');
        var firstName = request.getParameter('fn');
        var lastName = request.getParameter('ln');
        var jobTitle = request.getParameter('jt');
        var validate = request.getParameter('vd');
		var ip = request.getParameter('ips');
		
		nlapiLogExecution('DEBUG',"IPS",ip);
		nlapiLogExecution('DEBUG',"email",email);
        
		//validate should contain a string like em ph c fn etc to indicate
		//the parameters client side would like us to validate
		// we set those codes in validateCodes to 1
		if (validate != null && validate.length >= 26) {
			validate = validate.substring(0, 26);
		}
		if (validate != null) {
			var toValidate = validate.split(" ");
		}else{
			var toValidate = null;
		}
        
		if (toValidate != null && toValidate.length >= 1) {
			//Toggle status from donotcheck to check
			for (var i = 0; toValidate != null && i < toValidate.length; i++) {
				if (validateCodes[toValidate[i]] == 'dc') {
					validateCodes[toValidate[i]] = 'c';
				}
			}
		}
		
		var resp = '';
		for (code in validateCodes) {
			if (validateCodes[code] == 'c') {
				switch (code) {
					case 'emdf':
						validateCodes[code] = validateEmailDomainFree(email);
						break;
					case 'eme':
						validateCodes[code] = validateEmailDomainExtension(email);
						break;
					case 'emd':
						validateCodes[code] = validateEmailDomain(email);
						break;
					case 'ips':
						validateCodes[code] = validateIP(ip);
						break;	
					default:
						break;
				}
				if (validateCodes[code] == true || validateCodes[code] == false) {
					resp += code + ":" + validateCodes[code] + ",";
				}
			}
		}
		if (resp.length >= 1) {
			resp = "validateFields(new Array ({" + resp.substring(0, resp.length - 1) + "}));";
		}
		else {
			var resp = "validateFields(new Array());";
		}
		nlapiLogExecution('DEBUG', 'final resp', resp);
        response.write(resp);
    }
}



function validateEmailDomainFree(email){
	if(email==null) return false;
	if(email.indexOf('@')==-1) return false;
	if(validateEmailDomain(email)==false) return false;

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

function validateEmailDomain(email){

	try {
		//var requestURL = 'https://updates.metasploit.com/services/validate_email?contactEmail=' + email;
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

function validateIP(ip){
	try {
		var requestURL = 'https://updates.metasploit.com/services/validate_ip?ip=' + ip;
		var response = nlapiRequestURL(requestURL);
		if (response.getBody() == null) 
			return false;
		var resp = response.getBody();
		//nlapiSendEmail(2,2, 'Response', resp);
		var xml = nlapiStringToXML(resp);
		var result = nlapiSelectNode(xml, '//result');
		var valid = nlapiSelectValue(result, '@valid');
		var reason = nlapiSelectValue(result, '@reason');
		if(valid=='false'){
			return false;
		}else{
			return true;
		}		
	}catch(err){
		nlapiLogExecution("ERROR",'Bad Response for HD Webservice','Yup');
		return true;
	}
}


function validateEmailDomainExtension(email){
	if(email==null) return false;
	if(email.indexOf('@')==-1) return false;
	
	var domainExtension = email.substr(email.lastIndexOf('.'));
    nlapiLogExecution('DEBUG', 'Domain Extension Found', domainExtension);
    
    var searchFilters = new Array(new nlobjSearchFilter('name', null, 'is', domainExtension), 
	new nlobjSearchFilter('custrecordr7domainextensioncategory', null, 'is', 2));
    
    var searchResults = nlapiSearchRecord('customrecordr7domainextensions', null, searchFilters);
    if (searchResults != null && searchResults.length >= 1) {
        return false;
    }
    else {
        return true;
    }
    return true;
}

function validatePhone(phone){
	return false;
}
