var defaultFailMessage = "Failed to create/update license.  Please contact Rapid7 Support";

function beforeSubmit(type){

	if(type!='create' && type!='edit'){
		
		nlapiLogExecution('ERROR',"Invalid Event Type",type)
		
		throw nlapiCreateError('ERROR',
		'License record can only be created or edited. '+type+ ' event is not valid.',
		true);
	}
	
	var httpAuthorization = nlapiGetContext().getSetting("SCRIPT",'custscriptauthorization');
	nlapiLogExecution('DEBUG','HTTP Authorization',httpAuthorization);
	
	if(httpAuthorization==null || httpAuthorization.length < 3){
		
		nlapiLogExecution('EMERGENCY',"Invalid HTTP Authorization Header","Check Admin Settings");
		
		throw nlapiCreateError('ERROR',
		defaultFailMessage,
		true);
	}
	
	nlapiLogExecution('DEBUG','HTTP Authorization',httpAuthorization);
	
	//httpAuthorization = "bGljZW5zZTpVbXM3UjdDRWsmazVSUnBU";
	
    var record = nlapiGetNewRecord();
    
    var formParams = new Array();
	
	var orderType = getValidFieldValue(record,'custrecordr7msordertype');
	var expirationDate = getValidFieldValue(record,'custrecordr7mslicenseexpirationdate');
	var customerName = record.getFieldText('custrecordr7mslicensecustomer');
	var contactNameAndEmail = getContactNameAndEmail(getValidFieldValue(record,'custrecordr7mslicensecontact'));
	var contactName = contactNameAndEmail['entityid'];
	var contactEmail = contactNameAndEmail['email'];
	var productKey = getValidFieldValue(record,'custrecordr7msproductkey');
	
	orderType = parseInt(orderType);
	switch(orderType){
			case 1:
				formParams['orderType'] = 'EXPRESS';
				break;
			default:
				formParams['orderType'] = 'NOT VALID';
	}
		
	// Validate expiration Date
	if(expirationDate=='' || expirationDate.length < 2)
		throw nlapiCreateError('REQUEST_FAILED','Invalid Expiration Date',true);
	
	//Validate OrderType	
	if(formParams['orderType']!='EXPRESS')
		throw nlapiCreateError('REQUEST_FAILED','Invalid Order Type',true);	
	
	//Validate Contact Email
	if(contactEmail==null || contactEmail=='' || contactEmail.length < 2)
		throw nlapiCreateError('REQUEST_FAILED','Invalid Contact Email',true);
	
	//Validate ContactName
	if(contactEmail==null || contactName=='' || contactName.length <= 1)
		throw nlapiCreateError('REQUEST_FAILED','No Contact Name',true);
	
	//Set parameters on the request
	
	if (productKey == '' || productKey.length<=1) {
		//formParams['orderType'] is already set
		formParams['expirationDate'] = formatISO8601(expirationDate);
		formParams['customerName'] = customerName;
		formParams['contactName'] = contactName;
		formParams['contactEmail'] = contactEmail;
	}
	else if(productKey !='' && productKey.length>=1){
		//formParams['orderType'] is already set	
		formParams['expirationDate'] = formatISO8601(expirationDate);
		formParams['customerName'] = customerName;
		formParams['contactName'] = contactName;
		formParams['contactEmail'] = contactEmail;
		formParams['productKey'] = productKey;
	}
	
    var headers = new Array();
    headers['Authorization'] = "Basic " + httpAuthorization;
    
    try {
        response = nlapiRequestURL('https://updates.metasploit.com/license/generate', formParams, headers);
    } 
    catch (err) {
    
        nlapiLogExecution("EMERGENCY", 'Could not obtain response from Metasploit Licensing Server', err);
        
        throw nlapiCreateError('REQUEST_FAILED', defaultFailMessage, true);
    }
    
    
    // Make sure the license server didn't throw an error back to
    // us.  If it did, yell at the user.
    if (response == null || response.getCode() != 200) {
        var msg;
        if (response == null) 
            msg = "The response is null";
        else 
            msg = response.getBody();
        
        nlapiLogExecution('ERROR', 'The license server is responding with non-200', msg);
        nlapiSendEmail(2,2,'Msg',msg);
        throw nlapiCreateError('REQUEST_FAILED', defaultFailMessage, false);
    }
    
    var error = response.getError();
    if (error != null) {
    
        nlapiLogExecution('EMERGENCY', 'An error occurred while attempting to submit a license', error);
        
        throw nlapiCreateError('REQUEST_FAILED', defaultFailMessage, true);
    }
    
    
    // All should be OK, so parse the XML doc the server should have
    // supplied us.
    var xml = null;
    try {
        xml = nlapiStringToXML(response.getBody());
    } 
    catch (e) {
        nlapiLogExecution('EMERGENCY', 'An error occurred while attempting to parse the response', e);
        
        throw nlapiCreateError('REQUEST_FAILED', defaultFailMessage, true);
    }
    
    if (xml == null) 
        throw nlapiCreateError('REQUEST_FAILED', 'Could not understand license response', false);
    
    // Detect any errors returned
    var errorMsg = nlapiSelectValue(xml, '//message');
    if (errorMsg != null) {
        nlapiLogExecution('DEBUG', 'An error occurred while attempting to generate a license', nlapiSelectValue(xml, '//stacktrace'));
        
        throw nlapiCreateError('REQUEST_FAILED', errorMsg, true);
    }
    
    // Retrieve the product key, license serial number and product
    // serial number...
    var pkey = nlapiSelectValue(xml, '//productKey');
    var licenseID = nlapiSelectValue(xml, '//licenseID');
	
    // Verify the product key.
    if (pkey == null || pkey.length < 1) 
        throw nlapiCreateError('REQUEST_FAILED', 'Product key generated is invalid.', false);
    
    // Verify the license serial number.
    if (licenseID == null || licenseID.length < 1) 
        throw nlapiCreateError('REQUEST_FAILED', 'License serial number is invalid.', false);
    
    // They seem OK, so let's set them on the record...
    record.setFieldValue('custrecordr7msproductkey', pkey);
    record.setFieldValue('custrecordr7mslicenseserialnumber', licenseID);

	    
    var value = '';
    for (param in formParams) {
        value += param + ":" + formParams[param] + "<br>";
    }
    var transcript = "Type:" + type +
    "<br>Request:" +
    value +
    "<br>Response:" +
    response.getBody();
		
    //nlapiSendEmail(2,2, 'Metasploit Data Communication', transcript+"boom");
}



/**
 * Retrieves a valid filed value whose name is {@code fieldName} from
 * the record {@code record}.
 *
 * @param record The record which contains the value.
 * @param fieldName The name of the field containing the value.
 *
 * @return The value of the field, never {@code null}.
 */
function getValidFieldValue(record, fieldName){
   var tmp = record.getFieldValue(fieldName);
   if (tmp == null)
      tmp = "";
   return tmp;
}

/**
 * Retrieves the contact name and email from the contact record.
 *
 * @param recID The contact record ID.
 *
 * @return Array(name,email) {@code null}.
 */
function getContactNameAndEmail(recID){
   if (recID == null || recID == '') 
      return '';
   var rec = nlapiLookupField('contact', recID,new Array('entityid','email'));
   return rec;
}


/**
 * Returns an ISO 8601 format date string for a provided date object.
 *
 * @param date The date.
 */
function formatISO8601(dt){
	dt = nlapiStringToDate(dt);
    var yr = formatNumber(dt.getUTCFullYear(), 4);
    var mo = formatNumber(dt.getUTCMonth() + 1, 2);
    var dt = formatNumber(dt.getUTCDate(), 2);
    
    return yr + mo + dt + 'T000000000';
}


/**
 * Formats the provided number to the specified precision.
 *
 * @param n The number to format.
 * @param precision The precision.
 *
 * @return The formatted number string.
 */
function formatNumber(n, precision){
    var s = '' + n;
    for (var i = s.length; i < precision; i++) {
        s = '0' + s;
    }
    return s;
}
