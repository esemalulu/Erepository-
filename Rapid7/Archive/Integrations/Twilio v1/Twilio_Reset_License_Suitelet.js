/*
 * Module Description
 * 
 * Version    Date            Author           Remarks
 * 1.00       10 Sep 2012     mburstein
 *
 */

/*
 * @param {nlobjRequest} request Request object
 * @param {nlobjResponse} response Response object
 * @returns {Void} Any output is written via response object
 */
function resetLicense(request, response){
	
	this.arrProductTypes = grabAllProductTypes();
	var license = new Object();
	//license.licenseType = request.getParameter('custparam_licensetype');
	license.phone = request.getParameter('custparam_phone');
	nlapiLogExecution('DEBUG','phone',license.phone);
	license.email = request.getParameter('custparam_email');
	nlapiLogExecution('DEBUG','email',license.email);
	license.code = request.getParameter('custparam_code');
	license.activationKey = request.getParameter('custparam_activationkey');
	license.sid = request.getParameter('custparam_sid');
	license.acrId = request.getParameter('custparam_productid');
	license.resetComments = 'Public Form Reset.'
	
	//checkLicenseIsValid(license);
	/*if(checkLicenseIsValid(license)){
		var code = randomCode();
	}*/
	//var code = randomCode();
	//response.code = randomCode();
	response.writePage(license.code);
	// if license not valid, return to referer
	
	// Create reset record
	//createResetRecord(license)
}

// Return random 5 digit access code	
function randomCode(){
	var numDigits = 5;
	var mod = Math.pow(10,numDigits);
	var code = Math.floor(Math.random()*mod+1);
	return code;
}

function checkLicenseIsValid(license){
	if(!hasProductKey(license)){
		// Field Id for Serial Number
		var fieldId = arrProductTypes[license.acrId]['serialid'];
	}
	else{
		// Field Id for Product Key
		var fieldId = arrProductTypes[license.acrId]['activationid'];
	}
	// check license not expired
	
	// check license contact email is correct
}

function hasProductKey(license){
	// If activation key is  16 or 19 (with dashes) char then hasProductKey is true, else if 40 char then it's false (hasSerialNumber)
	if (license.activationKey.length == 16 || license.activationKey.length == 19){
		return true;
	}
	else if(license.activationKey.length == 40){
		return false;
	}
}
