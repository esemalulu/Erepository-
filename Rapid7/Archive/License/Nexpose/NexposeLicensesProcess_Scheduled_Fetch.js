/* This script updates the license record with field-level details
 * 
 * 1. Search customrecordr7nexposelicensing for custrecordr7licensetobeupdated box checked off
 * 2. For each license make a request to licutils endpoint for all the details
 * 3. update the license record with the details (use nlapiSubmitField)
 * 4. Keep chaining till all license records are updated.
 */

/*NOTE TO SELF
 * Just need to write the makeRequest, and parseXML function, 
 * after fields are created.
 */

function getUpdates(){
	var ctx = nlapiGetContext();
	var licensesToBeUpdated = getAllLicencesToBeUpdated();
	for(var i=0;licensesToBeUpdated!=null && i<licensesToBeUpdated.length;i++){
		var licenseInternalId = licensesToBeUpdated[i]['internalid'];
		var licenseSerialNo = licensesToBeUpdated[i]['serialno'];
		var xml = makeRequest(licenseSerialNo);
		var licenseInfo = parseLicenseInfo(xml);
		updateLicense(licenseInternalId,licenseInfo);
	}
	
	licensesToBeUpdated  = getAllLicensesToBeUpdated();
	
	if(licensesToBeUpdated!=null && licensesToBeUpdated.length>=1){
		nlapiScheduleScript(ctx.getScriptId().ctx.getDeploymentId());
	}
	
}

/* This function returns all licenses to be updated in in NetSuite. 
 */
function getAllLicensesToBeUpdated(){
	var searchFilters = new Array(
	new nlobjSearchFilter('custrecordr7licensetobeupdated',null,'is','T')
	);
	var searchColumns = new Array(
	new nlobjSearchColumn('internalid'),
	new nlobjSearchColumn('custrecordr7nxproductserialnumber')
	);
	var searchResults = nlapiSearchRecord('customrecordr7nexposelicensing',null,searchFilters,searchColumns);
	var results = new Array();
	for(i=0;searchResults!=null && i<searchResults.length;i++){
		var entry = new Array();
		entry['internalid']=searchResults[i].getValue('internalid');
		entry['serialno']=searchResults[i].getValue('custrecordr7nxproductserialnumber');
		results[results.length]=entry;
	}
	return results;
}


/* This function fetches the xml response by passing in the licenseSerialNo. 
 */
function makeRequest(licenseSerialNo){
	 headers['Authorization'] = 'Basic cjdsaWNlbnNlOnAxM1xDRTBmI20xTmQk';
     response = nlapiRequestURL('https://someurl', formParams,headers);
	return xml;
}

/* This function parses the xml and returns the field level information in a license record
 */
function parseLicenseInfo(xml){
	licenseInfo = new Array();
	return licenseInfo;
}


/* This function updates the 'customrecordr7nexposelicensing' records. 
 */
function updateLicense(licenseInternalId,licenseInfo){
	nlapiSubmitField('customrecordr7nexposelicensing',licenseInternalId,
	new Array(),
	new Array()
	);	
}