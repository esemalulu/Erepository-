/*
 * @author efagone
 */

function scrapeLicense(){

	var context = nlapiGetContext();
	nlapiLogExecution('DEBUG', 'context', context);
	
	nlapiLogExecution('DEBUG', 'context.getExecutionContext()', context.getExecutionContext());
	var recLicense = nlapiGetNewRecord();
	var licenseType = recLicense.getRecordType();
	licenseType = licenseType.toLowerCase();
	var licenseId = recLicense.getId();
	var isGrace = context.getSetting('SCRIPT', 'custscriptr7lfm_isgrace');
	nlapiLogExecution('DEBUG', 'licenseType', licenseType);
	nlapiLogExecution('DEBUG', 'licenseId', licenseId);
	nlapiLogExecution('DEBUG', 'isGrace', isGrace);
	
	var arrProductTypes = grabAllProductTypes(true);
	
	var isScraped = nlapiLookupField(licenseType, licenseId, arrProductTypes[licenseType]['fmrcreatedid']);
	
	if (isScraped == 'F') {
		try {
			var recLicense = nlapiLoadRecord(licenseType, licenseId);
			scrapeLicenseRecord(recLicense, isGrace);
			var recLicense = nlapiLoadRecord(licenseType, licenseId);
			recLicense.setFieldValue(arrProductTypes[licenseType]['fmrcreatedid'], 'T');
			nlapiSubmitRecord(recLicense);
		} 
		catch (e) {
			var adminUser =  nlapiLoadConfiguration('companypreferences').getFieldValue('custscriptr7_system_info_email_sender');
			nlapiSendEmail(adminUser, adminUser, 'Error Scraping License', 'License Type: ' + licenseType + '\nId: ' + licenseId + '\nError: ' + e + '\nExecution Context: ' + context.getExecutionContext() + '\nContext Script Id: ' + context.getScriptId());			
		}
	}
	
}
