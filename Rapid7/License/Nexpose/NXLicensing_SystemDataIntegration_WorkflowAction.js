/*
 * Module Description
 * 
 * Version    Date            Author           Remarks
 * 1.00       23 May 2013     efagone
 *
 */
// MB: 10/16/15 - Remove Environment Check as part of APTCM-129 - NetSuite-Nexpose License Integration Authentication Updates

function doTheIntegration(){
	
	var context = nlapiGetContext();
	nlapiLogExecution('DEBUG', 'context', context.getExecutionContext());
	
	var productKey = context.getSetting('SCRIPT', 'custscript_r7_nxdata_prodkey');
	
	if (productKey != null && productKey != '') {
		var objLicense = grabLicenseDetails('getLicense', productKey);
		
		if (objLicense != null) {
			updateLicense(objLicense, true); //library script
		}
	}
	
	return;
}
