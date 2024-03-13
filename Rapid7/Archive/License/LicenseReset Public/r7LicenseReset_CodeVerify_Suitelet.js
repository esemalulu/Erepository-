/**
 * Module Description
 * 
 * Version    Date            Author           Remarks
 * 1.00       31 Dec 2013     mburstein
 * 
 * This suitelet verifies the validation code from public license reset requests from the Rapid7 License Reset hosted Web Application.  A proper request includes:
 * 		code - 5 digit verification code
 * 		verificationid - The record ID of the License Reset Validation record
 *  
 *  On POST, this suitelet will search to verify that the code is valid for the specifid validation record.
 *  	If deemed valid a License Reset will be created.
 *  	Else, an error message will be passed back to the referrer.
 */

/**
 * @param {nlobjRequest} request Request object
 * @param {nlobjResponse} response Response object
 * @returns {Void} Any output is written via response object
 */
function verifyResetCode(request, response){
	this.requestOriginatingFrom = request.getHeader("Referer");
	try {
		if (request.getMethod() == 'POST') {
		        var toURL = nlapiRequestURL(nlapiResolveURL('SUITELET','customscriptretrieveurl','customdeployretrieveurl',true)).getBody();
			// If the POST request doesn't come from the Netsuite Hosted App then return error.
			if(requestOriginatingFrom != toURL+'/c.663271/r7LicenseReset%2520Public/r7LicenseReset.html'){
			 response.write('The originating page is invalid.');
			 return;
			 }
			/**
			 * The codeRequest Object holds the request parameters for validating the submitted verification code
			 * @property codeRequest
			 * @param code The 5 digit code entered
			 * @param validationid The record ID of the License Validation Record passed back to the Application after verifying the license
			 */
			var codeRequest = {
				code: request.getParameter('code'),
				validationid: request.getParameter('validationid'),			
			};
			for (param in codeRequest) {
				nlapiLogExecution('DEBUG', param, codeRequest[param]);
			}
			nlapiLogExecution('DEBUG', 'referer', requestOriginatingFrom);
			
			// Validate the code
			var recId = checkCode(codeRequest);
			if (!recId){
				response.write('You have entered an invalid code.');
				return;
			}
			else{
				// Update the validation record to valid and submit a license reset
				var objLicenseReset = updateValidationRec(recId);
				if(!objLicenseReset){
					response.write('There was a problem resetting your license.  Please contact support@rapid7.com');
					return;
				}
				else{
					var reset = createResetRecord(objLicenseReset);
					if(!reset){
						response.write('There was a problem resetting your license.  Please contact support@rapid7.com');
						return;
					}
					else{
						response.write('SUCCESS');
						return;
					}
				}
			}
		}
	} 
	catch (e) {
		nlapiLogExecution('ERROR', 'ERROR', e);
	}
}


function checkCode(codeRequest){
	var arrSearchFilters = new Array();
	arrSearchFilters[arrSearchFilters.length] = new nlobjSearchFilter('custrecordr7licresetvalidationpubid', null, 'is', codeRequest.validationid);
	
	var arrSearchColumns = new Array();
	arrSearchColumns[0] = new nlobjSearchColumn('custrecordr7licresetvalidationcode');
	
	var arrSearchResults = nlapiSearchRecord('customrecordr7licresetvalidation', null, arrSearchFilters, arrSearchColumns);
	
	if (arrSearchResults != null) {
		var searchResult = arrSearchResults[0];
		var recId = searchResult.getId();
		var resultCode = searchResult.getValue(arrSearchColumns[0]);
		
		// If the code matches then return the recId	
		if (resultCode == codeRequest.code) {
			return recId;
		}
	}
	else{
		return false;
	}
}

function updateValidationRec(recId){
	var rec = nlapiLoadRecord('customrecordr7licresetvalidation',recId);
	var objLicenseReset = {
		licenseTypeId : rec.getFieldValue('custrecordr7licresetvalidationtypeid'),
		licenseId : rec.getFieldValue('custrecordr7licresetvalidationlicid'),
		submittedLicense : rec.getFieldValue('custrecordr7licresetvalidationsublic'),
		email : rec.getFieldValue('custrecordr7licresetvalidationemail'),
		phone : rec.getFieldValue('custrecordr7licresetvalidationphone')	
	};
	// set code validated to true
	rec.setFieldValue('custrecordr7licresetvalidationcodevalid','T');
	try {
		var id = nlapiSubmitRecord(rec);
		return objLicenseReset;
	}
	catch(e){
		nlapiLogExecution('ERROR','COULD NOT SUBMIT VALIDATION REC',e);
		return false;
	}
}

function createResetRecord(license){
	nlapiLogExecution('DEBUG','license.licenseTypeId',license.licenseTypeId);
	var arrProductTypes = grabAllProductTypes(license.licenseTypeId);	
	var comments = 'Public license reset request - Submitted License: '+license.submittedLicense+'\n Email: '+license.email+'\n Phone: '+license.phone;
	var newResetRecord = nlapiCreateRecord(arrProductTypes[license.licenseTypeId]['resetrecid']);
	newResetRecord.setFieldValue(arrProductTypes[license.licenseTypeId]['resetlicenseid'], license.licenseId);
	newResetRecord.setFieldValue(arrProductTypes[license.licenseTypeId]['resetactivation'], 'T');
	newResetRecord.setFieldValue(arrProductTypes[license.licenseTypeId]['resetcomments'], comments);

	try {
		var id = nlapiSubmitRecord(newResetRecord, true);
		return true;
	} 
	catch (e) {
		nlapiSendEmail(340932, 340932, 'Could not create '+arrProductTypes[license.licenseTypeId]['resetrecid']+' license reset record', 'licenseId: ' + license.licenseId + '\nError: ' + e);
		return false;
	}	
}
