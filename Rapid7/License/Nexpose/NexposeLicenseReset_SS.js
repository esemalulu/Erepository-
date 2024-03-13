/*
 * MB: 10/14/15 - APTCM-129 - NetSuite-Nexpose License Integration Authentication Updates
 * The GES team is updating the authentication mechanism for the Nexpose Licensing Server (uadmin) to adhere to Rapid7's SSO policies.  
 * In order to ensure no interruption to Licensing processes in NetSuite all integration scripts need to be updated to support Basic Authentication and hyperlink fields must be updated to the new Uadmin URLs
 * The server endpoint and auth values have been moved to script parameters.
 */

var ctx = nlapiGetContext();
var uadminAuth = ctx.getSetting('SCRIPT','custscriptr7nx_uadminauth'); // Uadmin auth is same in dev/production
var endPoint = '';

//If sandbox enviornment use the sandbox specific endpoints to link to the Development Nexpose License Server
//--------------------- BEGIN ENVIRONMENT CHECK ---------------------

	if (ctx.getEnvironment() != 'PRODUCTION'){
		endPoint = ctx.getSetting('SCRIPT','custscriptnxendpoint_sandbox');
	}
	else{
		endPoint = ctx.getSetting('SCRIPT','custscriptnxendpoint');
	}
//--------------------- END ENVIRONMENT CHECK ---------------------
	
	endPoint += '/uadmin';  // We're working with the Uadmin services so add to endpoint
	
function afterSubmit(type){
	if (type == 'create' || type == 'edit') {
	
		var unprocessed = nlapiGetFieldValue('custrecordr7nxresetunprocessed');
		
		if (unprocessed == 'T') {
			var licenseId = nlapiGetFieldValue('custrecordr7nxresetnexposelicense');
			var productKey = nlapiLookupField('customrecordr7nexposelicensing', licenseId, 'custrecordr7nxproductkey');
			
			var resetBody = resetActivationCount(productKey);
			
			var fields = new Array();
			fields[0] = 'custrecordr7nxresetunprocessed';
			fields[1] = 'custrecordr7nxresetresponse';
			
			var values = new Array();
			values[0] = 'F';
			values[1] = resetBody;
			
			nlapiSubmitField(nlapiGetRecordType(), nlapiGetRecordId(), fields, values);
			
			//clear data integration fields on license
			var recLicense = nlapiLoadRecord('customrecordr7nexposelicensing', licenseId);
			clearUpdateStatsLicense(recLicense);
			nlapiSubmitRecord(recLicense);
		}
	}
}

function resetActivationCount(productKey){


	var resetURL = endPoint + '/command?op=resetLicense&productKey=' + productKey;

	var authHeaders = [];
	authHeaders['Authorization'] = uadminAuth;
	resetResponse = nlapiRequestURL(resetURL, null, authHeaders);

	var resetBody = resetResponse.getBody();
	
	nlapiLogExecution('DEBUG', 'Product Key/Response on Reset', productKey + ' :: ' + resetBody);
	
	if (resetBody.indexOf("Product key reactivated successfully") == '-1') {
		var adminUser =  nlapiLoadConfiguration('companypreferences').getFieldValue('custscriptr7_system_info_email_sender');
		nlapiSendEmail(adminUser, adminUser, 'ERROR: Nexpose License Reset', productKey + ' could not be reset.\n\n' + resetBody);
	}
	
	return resetBody;	
}

function clearUpdateStatsLicense(recLicense){
	
	if (recLicense == null){
		return null;
	}
	
	var arrFieldsToEmpty = new Array();
	arrFieldsToEmpty.push('custrecordr7nxliccontentupdateid');
	arrFieldsToEmpty.push('custrecordr7nxlicautoupdateenabled');
	arrFieldsToEmpty.push('custrecordr7nxliclastscantime');
	arrFieldsToEmpty.push('custrecordr7nxliclastuserlogintime');
	arrFieldsToEmpty.push('custrecordr7nxlicdbmajorversion');
	arrFieldsToEmpty.push('custrecordr7nxlicdbschemaversion');
	arrFieldsToEmpty.push('custrecordr7nxlicnexposedbsize');
	arrFieldsToEmpty.push('custrecordr7nxlichostedipsused');
	arrFieldsToEmpty.push('custrecordr7nxlicscanenginesused');
	arrFieldsToEmpty.push('custrecordr7nxlictotalipsused');
	arrFieldsToEmpty.push('custrecordr7nxlictotalipsrange');
	arrFieldsToEmpty.push('custrecordr7nxliccustompoliciescount');
	arrFieldsToEmpty.push('custrecordr7nxliccustomreporttemplates');
	arrFieldsToEmpty.push('custrecordr7nxliccustomscantemplates');
	arrFieldsToEmpty.push('custrecordr7nxlicriskmodel');
	arrFieldsToEmpty.push('custrecordr7nxlicenginesusedscans');
	arrFieldsToEmpty.push('custrecordr7nxlicnumscannedaddresses');
	arrFieldsToEmpty.push('custrecordr7nxlicnumberofscansrun');
	arrFieldsToEmpty.push('custrecordr7nxlicnumwebscansrun');
	arrFieldsToEmpty.push('custrecordr7nxlicnexposeversion');
	arrFieldsToEmpty.push('custrecordr7nxlicproductupdateid');
	arrFieldsToEmpty.push('custrecordr7nxlicfeaturesenabled');
	arrFieldsToEmpty.push('custrecordr7nxlicstaticassetgroups');
	arrFieldsToEmpty.push('custrecordr7nxlicdynamicassetgroups');
	arrFieldsToEmpty.push('custrecordr7nxlicassetswpolicyorvulnresu');
	arrFieldsToEmpty.push('custrecordr7nxlicassetswpolicyresults');
	arrFieldsToEmpty.push('custrecordr7nxlicassetswvulnresults');
	arrFieldsToEmpty.push('custrecordr7nxlicreportspertemplate');
	arrFieldsToEmpty.push('custrecordr7nxlicsitesperscantemplate');
	arrFieldsToEmpty.push('custrecordr7nxlicusersperrole');
	arrFieldsToEmpty.push('custrecordr7nxlicnumberofsites');
	arrFieldsToEmpty.push('custrecordr7nxlicnumberofusersused');
	arrFieldsToEmpty.push('custrecordr7nxlicnumberofreportsused');
	arrFieldsToEmpty.push('custrecordr7nxlicsharedcredentials');
	arrFieldsToEmpty.push('custrecordr7nxlicenseactivated');
	arrFieldsToEmpty.push('custrecordr7nxlicense_activationdate');
	arrFieldsToEmpty.push('custrecordr7nxlicense_lastupdatedate');
	arrFieldsToEmpty.push('custrecordr7nxlastaccessed');
	arrFieldsToEmpty.push('custrecordr7nxos');
	arrFieldsToEmpty.push('custrecordr7nxcpucores');
	arrFieldsToEmpty.push('custrecordr7nxcpumhz');
	arrFieldsToEmpty.push('custrecordr7nxfreeram');
	arrFieldsToEmpty.push('custrecordr7nxtotalram');
	arrFieldsToEmpty.push('custrecordr7nxdiskstats');
	arrFieldsToEmpty.push('custrecordr7nxjre');
	arrFieldsToEmpty.push('custrecordr7nxlicense_lastupdateverid');
	arrFieldsToEmpty.push('custrecordr7nxlicense_lastupdateverdesc');
	arrFieldsToEmpty.push('custrecordr7nxuptime');
	arrFieldsToEmpty.push('custrecordr7nxdbms');
	arrFieldsToEmpty.push('custrecordr7dbmsv');
	arrFieldsToEmpty.push('custrecordr7nxassociatedips');
	
	for (var i = 0; arrFieldsToEmpty != null && i < arrFieldsToEmpty.length; i++) {
		recLicense.setFieldValue(arrFieldsToEmpty[i], '');
	}
	
	return recLicense;
}
