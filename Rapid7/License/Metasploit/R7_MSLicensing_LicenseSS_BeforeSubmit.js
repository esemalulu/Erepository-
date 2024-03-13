var defaultFailMessage = "Failed to create/update license.  Please contact Rapid7 Support";


function afterSubmit(type){



}


function beforeSubmit(type){
	/**
	 * APPS-21121 cmcaneney -
	 * check if license is OnePrice, if not, process via legacy sync
	 * to Metasploit Licensing Server, if it is OnePrice, update the
	 * Sync Up With IPIMS field only.
	 */
	var isOnePrice = nlapiGetFieldValue('custrecordr7mslicenseitemfamily') == 50 ? true : false; //50 - One-MetasploitPro
	var salesOrder = nlapiGetFieldValue('custrecordr7mslicensesalesorder');
	var isFulfilAtScale = nlapiGetFieldValue('custrecord_ms_req_fulfil_at_scale') == 'T' ? true : false;
	nlapiLogExecution('DEBUG', 'isOnePrice / salesOrder', JSON.stringify({
		isOnePrice: isOnePrice,
		salesOrder: salesOrder,
		isFulfilAtScale: isFulfilAtScale
	}));
	// --------------------- BEGIN ENVIRONMENT CHECK ---------------------

	nlapiLogExecution('DEBUG', "Env: " + nlapiGetContext().getEnvironment(), ['PRODUCTION'].indexOf(nlapiGetContext().getEnvironment()));
	if ((['PRODUCTION'].indexOf(nlapiGetContext().getEnvironment()) == -1) || isOnePrice) {
		if (type == 'create' || type == 'copy') {
			nlapiLogExecution('DEBUG', 'Creating placeholder PK');
			var chars = 'BCDEFGHJKLMNPQRSTVWXYZ0123456789';
			var randomKey = '0000-0000-';
			for (var i = 0; i < 8; i++) {
				var rnum = Math.floor(Math.random() * chars.length);
				randomKey += chars.substring(rnum, rnum + 1);

				if (i == 3) {
					randomKey += '-';
				}
			}

			nlapiSetFieldValue('custrecordr7mslicenseserialnumber', '10101010101010101010101010');
			nlapiSetFieldValue('custrecordr7msproductkey', randomKey);
			nlapiSetFieldValue('custrecordr7mslicensesync', 'F');

		}

		return;
	}

	// --------------------- END ENVIRONMENT CHECK ---------------------

	//it's okay if it's create, edit, or xedit
	if(type!='create' && type!='edit' && type!='xedit'){

		nlapiLogExecution('ERROR',"Invalid Event Type",type);

		throw nlapiCreateError('ERROR',
			'License record can only be created or edited. '+type+ ' event is not valid.',
			true);
	}
	var userId = nlapiGetUser();

	//Setting the first accessed date field
	//We're assuming the lastContact field will only be modified
	//by a nlapiSubmitField in the ScheduledScript Metasploit Netsuite Integration
	if (type == 'xedit') {
		var record = nlapiGetNewRecord();
		this.type = type;
		this.oldRecord = nlapiGetOldRecord();
		this.updatedFields = nlapiGetNewRecord().getAllFields();

		var currentFirstAccessed = getNewFieldValue('custrecordr7msfirstaccessed');
		var firstActivationDateTime = getNewFieldValue('custrecordr7msfirstactivationdatetime');

		if (firstActivationDateTime != null && firstActivationDateTime != '') {
			//Set first Accessed to firstActivationDateTime
			nlapiSetFieldValue('custrecordr7msfirstaccessed', nlapiDateToString(new Date(firstActivationDateTime)));
		}

	}

	if (type == 'create' || type == 'edit') {

		nlapiSetFieldValue('custrecordr7mslicisblacklisted', 'F');

		var contactId = nlapiGetFieldValue('custrecordr7mslicensecontact');
		var isBlackListed = checkBlacklisted(contactId);
		var isRestricted = checkRestricted(contactId);

		if (isBlackListed || isRestricted){
			nlapiSetFieldValue('custrecordr7mslicisblacklisted', 'T');
		}

		if (isBlackListed) {
			nlapiLogExecution('AUDIT', 'isBlackListed', isBlackListed);
			nlapiSetFieldValue('custrecordr7mslicenseexpirationdate', nlapiDateToString(nlapiAddDays(new Date(), -1)));
		}

		if (isRestricted) {
			nlapiLogExecution('AUDIT', 'isRestricted', isRestricted);
			nlapiSetFieldValue('custrecordr7mslicenseexpirationdate', nlapiDateToString(nlapiAddDays(new Date(), -1)));
			if (type == 'create') {
				throw nlapiCreateError('ERROR', 'Failed to create license.  Please contact Rapid7 Support', true);
			}
		}

	}

	if ((type == 'create' || type == 'edit') && !isOnePrice && !isFulfilAtScale) {

		var httpAuthorization = nlapiGetContext().getSetting("SCRIPT", 'custscriptauthorization');
		//nlapiLogExecution('DEBUG', 'HTTP Authorization', httpAuthorization);

		if (httpAuthorization == null || httpAuthorization.length < 3) {

			nlapiLogExecution('EMERGENCY', "Invalid HTTP Authorization Header", "Check Admin Settings");

			throw nlapiCreateError('ERROR', defaultFailMessage, true);
		}

		//nlapiLogExecution('DEBUG', 'HTTP Authorization', httpAuthorization);
		nlapiLogExecution('DEBUG','Type',type);

		//httpAuthorization = "bGljZW5zZTpVbXM3UjdDRWsmazVSUnBU";

		var record = nlapiGetNewRecord();

		var formParams = new Array();

		var orderType = getValidFieldValue(record, 'custrecordr7msordertype');
		var expirationDate = getValidFieldValue(record, 'custrecordr7mslicenseexpirationdate');
		var customerName = record.getFieldText('custrecordr7mslicensecustomer');
		var contactNameAndEmail = getContactNameAndEmail(getValidFieldValue(record, 'custrecordr7mslicensecontact'));
		var contactName = contactNameAndEmail['entityid'];
		var contactEmail = contactNameAndEmail['email'];
		var productKey = getValidFieldValue(record, 'custrecordr7msproductkey');
		var userCount = getValidFieldValue(record, 'custrecordr7msprousercount');
		var hardwareLicense = getValidFieldValue(record,'custrecordr7mslicensehardware');
		var internal = getValidFieldValue(record,'custrecordr7msinternal');
		var perpetual = getValidFieldValue(record,'custrecordr7mslicense_perpetuallicense');

		orderType = parseInt(orderType);
		switch (orderType) {
			case 1:
				formParams['orderType'] = 'EXPRESS';
				break;
			case 2:
			case 5:
				formParams['orderType'] = 'PRO';
				break;
			case 3:
				formParams['orderType'] = 'COMMUNITY';
				break;
			case 4:
				formParams['orderType'] = 'NX_ULTIMATE';
				break;
			default:
				formParams['orderType'] = 'NOT VALID';
		}

		// Validate expiration Date
		if (expirationDate == '' || expirationDate.length < 2)
			throw nlapiCreateError('REQUEST_FAILED', 'Invalid Expiration Date', true);

		//Validate OrderType	
		if (formParams['orderType'] != 'EXPRESS' && formParams['orderType']!='PRO' && formParams['orderType']!='COMMUNITY' && formParams['orderType']!='NX_ULTIMATE')
			throw nlapiCreateError('REQUEST_FAILED', 'Invalid Order Type', true);

		//Validate Contact Email
		if (contactEmail == null || contactEmail == '' || contactEmail.length < 2)
			throw nlapiCreateError('REQUEST_FAILED', 'Invalid Contact Email', true);

		//Validate ContactName
		if (contactEmail == null || contactName == '' || contactName.length <= 1)
			throw nlapiCreateError('REQUEST_FAILED', 'No Contact Name', true);

		if(hardwareLicense=='T' && (userCount=='' || userCount==null)){
			throw nlapiCreateError('REQUEST_FAILED','Hardware license with invalid user count',true);
		}


		//Set parameters on the request

		if (productKey == '' || productKey.length <= 1) {
			//formParams['orderType'] is already set
			formParams['expirationDate'] = formatISO8601(expirationDate);
			formParams['customerName'] = customerName;
			formParams['contactName'] = contactName;
			formParams['contactEmail'] = contactEmail;
			formParams['hardwareLicense'] = hardwareLicense;
			formParams['perpetual'] = perpetual;
			formParams['internal'] = internal;
			if (userCount >= 1) {
				formParams['userCount'] = userCount;
			}
		}
		else
		if (productKey != '' && productKey.length >= 1) {
			//formParams['orderType'] is already set
			formParams['expirationDate'] = formatISO8601(expirationDate);
			formParams['customerName'] = customerName;
			formParams['contactName'] = contactName;
			formParams['contactEmail'] = contactEmail;
			formParams['productKey'] = productKey;
			formParams['hardwareLicense'] = hardwareLicense;
			formParams['internal'] = internal;
			formParams['perpetual'] = perpetual;
			if (userCount >= 1) {
				formParams['userCount'] = userCount;
			}
		}

		var headers = new Array();
		headers['Authorization'] = "Basic " + httpAuthorization;

		//response = nlapiRequestURL('https://updates.metasploit.com/license/generate', formParams, headers);

		var requestStart = new Date();
		try {
			nlapiLogExecution('DEBUG', 'formParams: orderType', formParams['orderType']);
			var response = nlapiRequestURL('https://updates.metasploit.com/license/generate', formParams, headers);
			var requestEnd = new Date();
		}
		catch (err) {
			var requestEnd = new Date();
			var logParams = '\n--------------------\nPARAMS:\n--------------------\n';
			for (param in formParams) {
				logParams += param + ': ' + formParams[param] + '\n';
			}
			logParams += '\nrequestStart: ' + requestStart;
			logParams += '\nrequestEnd: ' + requestEnd;

			nlapiLogExecution("EMERGENCY", 'Could not obtain response from Metasploit Licensing Server', err + '\n\n' + logParams);

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
			var adminUser =  nlapiLoadConfiguration('companypreferences').getFieldValue('custscriptr7_system_info_email_sender');
			nlapiSendEmail(adminUser,adminUser, 'Msg', msg);
			throw nlapiCreateError('REQUEST_FAILED', defaultFailMessage, false);
		}

		var error = response.getError();
		if (error != null) {

			nlapiLogExecution('EMERGENCY', 'An error occurred while attempting to submit a license', error);

			throw nlapiCreateError('REQUEST_FAILED', defaultFailMessage, true);
		}


		// All should be OK, so parse the XML doc the server should have
		// supplied us.

		//nlapiSendEmail(2,2,'XML Response HD',response.getBody());

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

		nlapiLogExecution('DEBUG','Information interchanged w/ Metasploit servers','done');
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
		record.setFieldValue('custrecordr7mslicensesync', 'F');


		var value = '';
		for (param in formParams) {
			value += param + ":" + formParams[param] + "<br>";
		}
		var transcript = "Type:" + type +
			"<br>Request:" +
			value +
			"<br>Response:" +
			response.getBody();
	}
	else if ((type == 'create' || type == 'edit') && (isOnePrice || isFulfilAtScale)) {
		if (type == 'create' && isOnePrice && salesOrder && isFulfilAtScale) {
			nlapiLogExecution('DEBUG', 'new 1price license, need to sync');
			nlapiSetFieldValue('custrecordr7mslicensesyncupwithipims', 1);
		}
		if (type == 'edit' && salesOrder && (isOnePrice || isFulfilAtScale)) {
			if (nlapiGetFieldValue('custrecordr7mslicensesyncupwithipims') == '3') {
				nlapiLogExecution('DEBUG', 'something change on the license, need to re-sync');
				nlapiSetFieldValue('custrecordr7mslicensesyncupwithipims', 1);
			}
		}
	}

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

function getNewFieldValue(fieldId){
	// if the record is direct list edited or mass updated, run the script
	if (type == 'xedit') {
		// loop through the returned fields
		for (var i = 0; i < updatedFields.length; i++) {
			//nlapiLogExecution('DEBUG', 'field', updatedFields[i]);
			if (updatedFields[i] === fieldId) {
				return nlapiGetFieldValue(fieldId);
			}
		}
		return oldRecord.getFieldValue(fieldId);
	}
	else {
		return nlapiGetFieldValue(fieldId);
	}
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
