/**
 * Module Description
 * 
 * Version    Date            Author           Remarks
 * 1.00       08 Jul 2015     mburstein
 *
 * Run through search and validate address info for each License Request Processing record.
 * 		Search: SCRIPT - LRP Validate Address Scheduled
 * 		Sets fields:
 * 			Address Validation Status
 * 			Reviewed by Legal
 */

/**
 * @param {String} type Context Types: scheduled, ondemand, userinterface, aborted, skipped
 * @returns {Void}
 */
function lrp_validateAddress(type) {
	
	this.context = nlapiGetContext();
	this.startingTime = new Date().getTime();
	
	// Run Search and get address fields from result columns
	var arrSearchResults = nlapiSearchRecord('customrecordr7licreqprocessing', 'customsearchr7lrp_validateaddr_sched'); //SCRIPT - LRP Validate Address Scheduled - 20369
	for (var k = 0; arrSearchResults != null && k < arrSearchResults.length && unitsLeft(100) && timeLeft(7); k++) {
	
		var searchResult = arrSearchResults[k];
		var columns = searchResult.getAllColumns();
		var recId = searchResult.getValue(columns[0]);
		var countryCode = searchResult.getValue(columns[1]);
		var city = searchResult.getValue(columns[2]);
		var state = searchResult.getValue(columns[3]);
		var streetAddress = searchResult.getValue(columns[4]);
		var postalCode = searchResult.getValue(columns[5]);
			
		try {
			// Validate using Google GeoCoding API - Street, city, country always required or return not valid
			var addressValidationStatus = googleGeocodeAPI_ValidateAddress(streetAddress,city,state,postalCode,countryCode);
			if (addressValidationStatus){
				try{
					// If reached query limit then break loop and exit script 
					if(addressValidationStatus == 'overlimit'){
						break;
					}
					var rec = nlapiLoadRecord('customrecordr7licreqprocessing',recId);
					rec.setFieldValue('custrecordr7licreq_addrvalidstatus', addressValidationStatus);
					// If the address is not valid also set the reviewed by legal flag
					if(addressValidationStatus == 3){
						rec.setFieldValue('custrecordr7licreq_legalreviewed', 'T');
					}
					nlapiSubmitRecord(rec);
				}
				catch (e) {
					// Set Address Validation Status as (4) Failed if error
					nlapiLogExecution('ERROR', 'Error on LRP Address Validate Scheduled.  Could not Submit LRP Record update',e);
					var adminUser =  nlapiLoadConfiguration('companypreferences').getFieldValue('custscriptr7_system_info_email_sender');
					nlapiSendEmail(adminUser, adminUser, 'Error on LRP Address Validate Scheduled.  Could not Submit LRP Record update', 'Error: ' + e);
					nlapiSubmitField('customrecordr7licreqprocessing',recId,'custrecordr7licreq_addrvalidstatus',4); 
				}
			}
			// Return (4) Failed if error
			else{
				nlapiSubmitField('customrecordr7licreqprocessing',recId,'custrecordr7licreq_addrvalidstatus',4); 
			}

		}
		catch (e) {
			// Set Address Validation Status as (4) Failed if error
			nlapiLogExecution('ERROR', 'Error on LRP Address Validate Scheduled',e);
			var adminUser =  nlapiLoadConfiguration('companypreferences').getFieldValue('custscriptr7_system_info_email_sender');
			nlapiSendEmail(adminUser, adminUser, 'Error on LRP Address Validate Scheduled', 'Error: ' + e);
			nlapiSubmitField('customrecordr7licreqprocessing',recId,'custrecordr7licreq_addrvalidstatus',4); 
		}
	}
}

function timeLeft(timeLimitInMinutes){

	if (timeLimitInMinutes == null || timeLimitInMinutes == '') {
		timeLimitInMinutes = 11;
	}
	var timeLimitInMilliseconds = timeLimitInMinutes * 60 * 1000;
	
	var presentTime = new Date().getTime();
	if (presentTime - startingTime > timeLimitInMilliseconds) {
		nlapiLogExecution('DEBUG', 'Ran out of time', 'yup');
		rescheduleScript = true;
		return false;
	}
	return true;
}

function unitsLeft(number){
	var unitsLeft = context.getRemainingUsage();
	if (unitsLeft <= number) {
		nlapiLogExecution('DEBUG', 'Ran out of units', 'yup');
		rescheduleScript = true;
		return false;
	}
	return true;
}