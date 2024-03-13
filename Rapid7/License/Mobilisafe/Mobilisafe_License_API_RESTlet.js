/*
 * Module Description
 * 
 * Version    Date            Author           Remarks
 * 1.00       24 Sep 2012     efagone
 *
 */

/*
 * @param {Object} dataIn Parameter object
 * @returns {Object} Output object
 */
function getLicense_RESTlet(dataIn){

	try {
		var licenseId = '';
		var productKey = '';
		if (dataIn.hasOwnProperty('licenseid')) {
			licenseId = dataIn.licenseid;
		}
		if (dataIn.hasOwnProperty('productKey')) {
			productKey = dataIn.productKey;
		}
		
		//Check licenseId
		if (licenseId == null || licenseId == '' || licenseId.length < 1) {
			licenseId = findLicenceByPK(productKey);
			if (licenseId == null || licenseId == '' || licenseId.length < 1) {
				nlapiLogExecution("ERROR", "Null/Invalid License ID", licenseId);
				return createErrorObj("Please enter a valid license id.");
			}
		}
		
		return buildSuccessResponseObj(licenseId);
	} 
	catch (err) {
		nlapiLogExecution('ERROR', 'Details', err);
		return createErrorObj(err);
		return createErrorObj("Your request cannot be processed presently. Please contact Rapid7 Support.");
	}
	
}

/*
 * @param {Object} dataIn Parameter object
 * @returns {Object} Output object
 */
function postLicense_RESTlet(dataIn){

	try {
		var licenseId = '';
		var productKey = '';
		if (dataIn.hasOwnProperty('licenseid')) {
			licenseId = dataIn.licenseid;
		}
		if (dataIn.hasOwnProperty('productKey')) {
			productKey = dataIn.productKey;
		}
		
		//Check licenseId
		if (licenseId == null || licenseId == '' || licenseId.length < 1) {
			licenseId = findLicenceByPK(productKey);
			if (licenseId == null || licenseId == '' || licenseId.length < 1) {
				nlapiLogExecution("ERROR", "Null/Invalid License ID", licenseId);
				return createErrorObj("Please enter a valid license id.");
			}
		}
		
		var recLicense = nlapiLoadRecord('customrecordr7mobilisafelicense', licenseId);
		if (dataIn.hasOwnProperty('planid')) 
			recLicense.setFieldValue('custrecordr7mblicense_plan', dataIn.planid);
		if (dataIn.hasOwnProperty('emailserver')) 
			recLicense.setFieldValue('custrecordr7mblicense_emailserver', dataIn.emailserver);
		if (dataIn.hasOwnProperty('numberofusers')) 
			recLicense.setFieldValue('custrecordr7mblicenselicensedusers', dataIn.numberofusers);
		if (dataIn.hasOwnProperty('status')) 
			recLicense.setFieldValue('custrecordr7mblicense_status', dataIn.status);
		if (dataIn.hasOwnProperty('assessmentdatetime')) {
		
			var strAssessmentDate = dataIn.assessmentdatetime;
			var dtAssessmentDate = '';
			
			if (strAssessmentDate != null && strAssessmentDate != '') {
				try {
					var year = strAssessmentDate.substr(0, 4);
					var month = parseInt(strAssessmentDate.substr(5, 2)) - 1;
					var day = strAssessmentDate.substr(8, 2);
					var hours = strAssessmentDate.substr(11, 2);
					var minutes = strAssessmentDate.substr(14, 2);
					var seconds = strAssessmentDate.substr(17, 2);
					
					recLicense.setFieldValue('custrecordr7mblicense_lastassesdate', nlapiDateToString(new Date(year, month, day, hours, minutes, seconds), 'datetimetz'));
				} 
				catch (e) {
					var adminUser =  nlapiLoadConfiguration('companypreferences').getFieldValue('custscriptr7_system_info_email_sender');
					nlapiSendEmail(adminUser, adminUser, 'Could not convert Mobilisafe date', 'strAssessmentDate = ' + strAssessmentDate + '\nError: ' + e);
				}
			}
			
			
		}
		var id = nlapiSubmitRecord(recLicense, true, true);
		
		return buildSuccessResponseObj(licenseId);
	} 
	catch (err) {
		nlapiLogExecution('ERROR', 'Details', err);
		return createErrorObj(err);
		return createErrorObj("Your request cannot be processed presently. Please contact Rapid7 Support.");
	}
	
}
