/* This script fetches new updates per neXpose License
 * 
 * 1. Search customrecordr7nxlicenseupdates for max(id)
 * 2. Make a request with the associated timestamp value - custrecordr7nxtimestamp
 * 3. obtain list of license-updates that have occurred since timestamp
 * 4. create the customrecordr7nxlicenseupdates records
 */


function getUpdates(){
	var ctx = nlapiGetContext();
	
	var maxTimestampInNetsuite = getMaxTimestampInNetsuite();
	var reducedTimestamp = getReducedTimestamp(maxTimestampInNetsuite);
		
	var xml = makeRequest(reducedTimestamp,50);
	var licUpdatesList = parseXmlForLicUpdates(xml);
	for(var i=0;i<licUpdatesList.length;i++){
		
		var mappedRecord = createMappedRecord(licUpdatesList[i]);
		createRecord(mappedRecord);
		
		if(ctx.getRemainingUsage<80){
			break;
		}
	}
	
	maxTimestampInNetsuite = getMaxTimestampInNetsuite();
	maxTimestampInAutoUpdater = getMaxTimestampInAutoUpdater();
	
	if (maxTimestampInNetsuite!=maxTimestampInAutoUpdater) {
		nlapiScheduleScript(ctx.getScriptId().ctx.getDeploymentId());
	}
	else{
		nlapiScheduleScript(z); //nlapiScheduledScript3
	}
}

/* This function fetches the maximum timestamp present in NetSuite. 
 */
function getMaxTimestampInNetsuite(){
	return maxTimestamp;
}

/* This function fetches the maximum timestamp present in autoUpdater. 
 */
function getMaxTimestampInAutoUpdater(){
	return maxTimestamp;
}


/* This function fetches the xml response by passing in the maxTimestamp. 
 */
function makeRequest(maxTimestamp){
	 headers['Authorization'] = 'Basic cjdsaWNlbnNlOnAxM1xDRTBmI20xTmQk';
     response = nlapiRequestURL('https://someurl', formParams,headers);
	return xml;
}

/* This function parses the xml and returns an array containing the list of <licenseId,updateId,timestamp>
 */
function makeRequest(xml){
	return licenseUpdatesList;
}


/* This function creates the 'customrecordr7nxlicenseupdates' records. 
 */
function createRecord(record){
	doesNotExist = checkNonExistence(record['upd_id'],record['lic_id']);
	if (doesNotExist) {
		var record = nlapiCreateRecord('customrecordr7nxlicenseupdates');
		record.setFieldValue('custrecordr7nxupdate', record['upd_id']);
		record.setFieldValue('custrecordr7nxlicense', record['lic_id']);
		record.setFieldValue('custrecordr7nxtimestamp', record['tmpstmp']);
		nlapiSubmitRecord(record);
	}
}

/* This function creates the 'reduced timestamp' ie timestamp - 1s. 
 */
function getReducedTimestamp(maxTimestamp){
	return reducedTimestamp;
}

/* This function checks the existence of a (update,license) pair
 */
function checkNonExistence(updateId,licId){
	var searchFilters = new Array(
	new nlobjSearchFilter('custrecordr7nxupdate',null,'is',updateId),
	new nlobjSearchFilter('custrecordr7nxlicense',null,'is',licId)
	);
	var searchColumns = new Array(
	new nlobjSearchColumn('internalid')
	);
	var searchResults = nlapiSearchRecord('customrecordr7nxlicenseupdates',null,searchFilters,searchColumns);
	if(searchResults!=null){
		return false;
	}
	else{
		return true;	
	}
}

/* This function returns the internalId of a license in Netsuite
 */
function getInternalIdOfLicense(licenseSerialNo){
	var searchFilters = new Array(
	new nlobjSearchFilter('custrecordr7nxproductserialnumber',null,'is',licenseSerialNo)
	);
	var searchColumns = new Array(
	new nlobjSearchColumn('internalid')
	);
	var searchResults = nlapiSearchRecord('customrecordr7nexposelicensing',null,searchFilters,searchColumns);
	if(searchResults!=null){
		var internalId = searchResults[0].getValue('internalid'); 
		return internalId;
	}
	else{
		return null;
	}
}

/* This function returns the internalId of an Update in Netsuite
 */
function getInternalIdOfUpdate(updateId){
	var searchFilters = new Array(
	new nlobjSearchFilter('custrecordr7nxupdateid',null,'is',updateId)
	);
	var searchColumns = new Array(
	new nlobjSearchColumn('internalid')
	);
	var searchResults = nlapiSearchRecord('customrecordr7nexposeupdates',null,searchFilters,searchColumns);
	if(searchResults!=null){
		var internalId = searchResults[0].getValue('internalid'); 
		return internalId;
	}
	else{
		return null;
	}
}

/* This function maps a record to the internalid of updates/licenses
 */
function createMappedRecord(record){
	var newRecord = new Array();
	newRecord['licenseiid'] = getInternalIdOfLicense(record['']);
	newRecord['updateiid'] = getInternalIdOfUpdate(record['']);
	newRecord['timestamp'] = record[''];
	return newRecord;
}
