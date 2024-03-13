/*
 * @author efagone
 */
function deleteRecsBySearch() {

	var timeLimitInMinutes = 10;
	this.timeLimitInMilliseconds = timeLimitInMinutes * 60 * 1000;
	this.startingTime = new Date().getTime();
	this.context = nlapiGetContext();
	this.rescheduleScript = false;
	var proceedeToDelete = true;
	var context = nlapiGetContext();

	var arrSearchIds = new Array();
	// arrSearchIds[14044] = 'customrecordr7ccardtransactions';
	//arrSearchIds[14045] = 'customrecordr7licensefeaturemanagement';
	 //arrSearchIds[13433] = 'customrecordr7licreqprocessing';
	//arrSearchIds[22548] = 'customrecordr7licreqprocessing';
	arrSearchIds[41788] = 'customrecord_r7_transaction_partners';

	for ( var searchId in arrSearchIds) {

		var objSearch = nlapiLoadSearch(arrSearchIds[searchId], searchId);
		var resultSet = objSearch.runSearch();

		var rowNum = 0;
		do {
			var resultSlice = resultSet.getResults(rowNum, rowNum + 1000);
			for (var i = 0; resultSlice != null && i < resultSlice.length
					&& timeLeft() && unitsLeft(); i++) {

				proceedeToDelete = true;
				var columns = resultSlice[i].getAllColumns();
				var resultId = resultSlice[i].getValue('internalid');
				//var firstColumn = columns[0].getName();

				//if (firstColumn != 'internalid') {
				//	nlapiSendEmail(
				//			55011,
				//			55011,
				//			'Attempting to delete without properly formatted search',
				//			'1st Column: ' + firstColumn
				//					+ '\nShould be: "internalid"');
				//	break;
				//}

				//if (arrSearchIds[searchId] === 'customrecordr7licreqprocessing') {
				//	proceedeToDelete = addLicenseToArchive(columns,
				//			resultSlice[i], resultId);
				//}
				if (proceedeToDelete) {
					try {
						nlapiDeleteRecord(arrSearchIds[searchId], resultId);
					} catch (e) {
						nlapiLogExecution('ERROR',
								'Could not delete header result', 'Record: '
										+ arrSearchIds[searchId] + '\nResult: '
										+ resultId + '\nError: ' + e);
					}
				}
				rowNum++;
			}
		} while (resultSlice.length >= 1000 && !rescheduleScript);
	}

	if (rescheduleScript) {
		var status = nlapiScheduleScript(context.getScriptId());
	}

}

function addLicenseToArchive(columns, resultSlice, resultId) {
	var result = true;
	var reviewedByLegal = resultSlice.getValue(columns[11]);
	var graylisted = resultSlice.getValue(columns[12]);
	var unprocessable = resultSlice.getValue(columns[2]);
	var licenseType = resultSlice.getText(columns[8]);
	if ((reviewedByLegal === 'F' && graylisted === 'F' && unprocessable === 'F')
			|| (reviewedByLegal === 'Y' && graylisted === 'F' && unprocessable === 'F')
			|| (reviewedByLegal === 'Y' && graylisted === 'Y' && unprocessable === 'Y')
			|| (reviewedByLegal === 'F' && graylisted === 'F' && unprocessable === 'Y')
			|| (licenseType === 'LICTEMP56' || licenseType === 'LICTEMP14')) {
		var fields = getAllFields();
		var sourceValues = nlapiLookupField('customrecordr7licreqprocessing',
				resultId, fields);
		return createArchiveRecord(sourceValues);
	}
	return result;
}
function createArchiveRecord(sourceValues) {
	var res = true;
	var objRecord = nlapiCreateRecord('customrecordr7licreqprocessing_arch');
	objRecord = setAllFields(objRecord, sourceValues);
	try {
		nlapiSubmitRecord(objRecord, false, true);
	} catch (e) {
		nlapiLogExecution('DEBUG', 'Creation record Error ', e);
		res = false;
	}
	return res;
}
function setAllFields(objRecord, sourceValues) {
	var objRecord = objRecord;
	objRecord.setFieldValue('custrecordr7licreq_leadsource_arch',
			sourceValues.custrecordr7licreq_leadsource);
	objRecord.setFieldValue('custrecordr7licreq_processed_arch',
			sourceValues.custrecordr7licreq_processed);
	objRecord.setFieldValue('custrecordr7licreq_unprocessable_arch',
			sourceValues.custrecordr7licreq_unprocessable);
	objRecord.setFieldValue('custrecordr7_licreqproc_graylisted_arch',
			sourceValues.custrecordr7_licreqproc_graylisted);
	objRecord.setFieldValue('custrecordr7_licreqproc_blacklisted_arch',
			sourceValues.custrecordr7_licreqproc_blacklisted);
	objRecord.setFieldValue('custrecordr7_licreqproc_ipaddress_arch',
			sourceValues.custrecordr7_licreqproc_clientipaddress);
	objRecord.setFieldValue('custrecordr7licreqproc_pendingupdate_arc',
			sourceValues.custrecordr7licreqproc_pendingupdatescon);
	objRecord.setFieldValue('custrecordr7licreq_contactlink_arch',
			sourceValues.custrecordr7licreq_contactlink);
	objRecord.setFieldValue('custrecordr7licreq_firstname_arch',
			sourceValues.custrecordr7licreq_firstname);
	objRecord.setFieldValue('custrecordr7licreq_lastname_arch',
			sourceValues.custrecordr7licreq_lastname);
	objRecord.setFieldValue('custrecordr7licreq_jobtitle_arch',
			sourceValues.custrecordr7licreq_jobtitle);
	objRecord.setFieldValue('custrecordr7licreq_email_arch',
			sourceValues.custrecordr7licreq_email);
	objRecord.setFieldValue('custrecordr7licreq_phone_arch',
			sourceValues.custrecordr7licreq_phone);
	objRecord.setFieldValue('custrecordr7licreqproc_language_arch',
			sourceValues.custrecordr7licreqproc_language);
	objRecord.setFieldValue('custrecordr7licreq_country_arch',
			sourceValues.custrecordr7licreq_country);
	objRecord.setFieldValue('custrecordr7licreq_state_arch',
			sourceValues.custrecordr7licreq_state);
	objRecord.setFieldValue('custrecordr7licreq_streetaddress_arch',
			sourceValues.custrecordr7licreq_streetaddress);
	objRecord.setFieldValue('custrecordr7licreq_city_arch',
			sourceValues.custrecordr7licreq_city);
	objRecord.setFieldValue('custrecordr7licreq_zip_arch',
			sourceValues.custrecordr7licreq_zip);
	objRecord.setFieldValue('custrecordr7licreqproc_pendingupdscus_ar',
			sourceValues.custrecordr7licreqproc_pendingupdatescus);
	objRecord.setFieldValue('custrecordr7licreq_companylink_arch',
			sourceValues.custrecordr7licreq_companylink);
	objRecord.setFieldValue('custrecordr7licreq_companyname_arch',
			sourceValues.custrecordr7licreq_companyname);
	objRecord.setFieldValue('custrecordr7licreq_annualrevenue_arch',
			sourceValues.custrecordr7licreq_annualrevenue);
	objRecord.setFieldValue('custrecordr7licreq_licenseid_arch',
			sourceValues.custrecordr7licreq_licenseid);
	objRecord.setFieldValue('custrecordr7licreq_trackingdblink_arch',
			sourceValues.custrecordr7licreq_trackingdblink);
	objRecord.setFieldValue('custrecordr7licreq_lictempupgraderec_arc',
			sourceValues.custrecordr7licreq_lictempupgraderec);
	objRecord.setFieldValue('custrecordr7licreq_referer_arch',
			sourceValues.custrecordr7licreq_referer);
	objRecord.setFieldValue('custrecordr7licreq_reqlog_arch',
			sourceValues.custrecordr7licreq_reqlog);
	objRecord.setFieldValue('custrecordr7licreq_errortext_arch',
			sourceValues.custrecordr7licreq_errortext);
	objRecord.setFieldValue('custrecordr7licreqproc_processingtime_ar',
			sourceValues.custrecordr7licreqproc_processingtimesec);
	objRecord.setFieldValue('custrecordr7licreq_daterequested_arch',
			sourceValues.custrecordr7licreq_daterequested);
	objRecord.setFieldValue('custrecordr7licreq_daterecieved_arch',
			sourceValues.custrecordr7licreq_daterecieved);
	objRecord.setFieldValue('custrecordr7licreq_recaptcha_challenge_a',
			sourceValues.custrecordr7licreq_recaptcha_challenge);
	objRecord.setFieldValue('custrecordr7licreq_recaptcha_response_ar',
			sourceValues.custrecordr7licreq_recaptcha_response);
	objRecord.setFieldValue('custrecordr7licreq_recaptcha_remoteip_ar',
			sourceValues.custrecordr7licreq_recaptcha_remoteip);
	objRecord.setFieldValue('custrecordr7licreq_lrpsid_arch',
			sourceValues.custrecordr7licreq_lrpsid);
	objRecord.setFieldValue('custrecord7licreq_typeofuse_arch',
			sourceValues.custrecord7licreq_typeofuse);
	objRecord.setFieldValue('custrecordr7licreq_legalreviewed_arch',
			sourceValues.custrecordr7licreq_legalreviewed);
	objRecord.setFieldValue('custrecordr7licreq_ipcity_arch',
			sourceValues.custrecordr7licreq_ipcity);
	objRecord.setFieldValue('custrecordr7licreq_ipcountry_arch',
			sourceValues.custrecordr7licreq_ipcountry);
	objRecord.setFieldValue('custrecordr7licreq_ipcountrycode_arch',
			sourceValues.custrecordr7licreq_ipcountrycode);
	objRecord.setFieldValue('custrecordr7licreq_iporgname_arch',
			sourceValues.custrecordr7licreq_iporgname);
	objRecord.setFieldValue('custrecordr7licreq_ipusertype_arch',
			sourceValues.custrecordr7licreq_ipusertype);
	objRecord.setFieldValue('custrecordr7licreq_addrvalidstatus_arch',
			sourceValues.custrecordr7licreq_addrvalidstatus);
	objRecord.setFieldValue('custrecordr7licreq_exportclassification_',
			sourceValues.custrecordr7licreq_exportclassification);
	return objRecord;
}
function getAllFields() {
	var fields = [];
	fields.push('custrecordr7licreq_leadsource');
	fields.push('custrecordr7licreq_processed');
	fields.push('custrecordr7licreq_unprocessable');
	fields.push('custrecordr7_licreqproc_graylisted');
	fields.push('custrecordr7_licreqproc_blacklisted');
	fields.push('custrecordr7_licreqproc_clientipaddress');
	fields.push('custrecordr7licreqproc_pendingupdatescon');
	fields.push('custrecordr7licreq_contactlink');
	fields.push('custrecordr7licreq_firstname');
	fields.push('custrecordr7licreq_lastname');
	fields.push('custrecordr7licreq_jobtitle');
	fields.push('custrecordr7licreq_email');
	fields.push('custrecordr7licreq_phone');
	fields.push('custrecordr7licreqproc_language');
	fields.push('custrecordr7licreq_country');
	fields.push('custrecordr7licreq_state');
	fields.push('custrecordr7licreq_streetaddress');
	fields.push('custrecordr7licreq_city');
	fields.push('custrecordr7licreq_zip');
	fields.push('custrecordr7licreqproc_pendingupdatescus');
	fields.push('custrecordr7licreq_companylink');
	fields.push('custrecordr7licreq_companyname');
	fields.push('custrecordr7licreq_annualrevenue');
	fields.push('custrecordr7licreq_licenseid');
	fields.push('custrecordr7licreq_trackingdblink');
	fields.push('custrecordr7licreq_lictempupgraderec');
	fields.push('custrecordr7licreq_referer');
	fields.push('custrecordr7licreq_reqlog');
	fields.push('custrecordr7licreq_errortext');
	fields.push('custrecordr7licreqproc_processingtimesec');
	fields.push('custrecordr7licreq_daterequested');
	fields.push('custrecordr7licreq_daterecieved');
	fields.push('custrecordr7licreq_recaptcha_challenge');
	fields.push('custrecordr7licreq_recaptcha_response');
	fields.push('custrecordr7licreq_recaptcha_remoteip');
	fields.push('custrecordr7licreq_lrpsid');
	fields.push('custrecord7licreq_typeofuse');
	fields.push('custrecordr7licreq_legalreviewed');
	fields.push('custrecordr7licreq_ipcity');
	fields.push('custrecordr7licreq_ipcountry');
	fields.push('custrecordr7licreq_ipcountrycode');
	fields.push('custrecordr7licreq_iporgname');
	fields.push('custrecordr7licreq_ipusertype');
	fields.push('custrecordr7licreq_addrvalidstatus');
	fields.push('custrecordr7licreq_exportclassification');
	return fields;
}

function timeLeft() {
	var presentTime = new Date().getTime();
	if (presentTime - startingTime > timeLimitInMilliseconds) {
		rescheduleScript = true;
		return false;
	}
	return true;
}

function unitsLeft() {
	var unitsLeft = context.getRemainingUsage();
	if (unitsLeft <= 100) {
		rescheduleScript = true;
		return false;
	}
	return true;
}