/* This script fetches new neXpose updates and Descriptions
 * 
 * 1. Search customrecordr7nexposeupdates for max(custrecordr7updateid)
 * 2. Make a request with the max(custrecordr7updateid)
 * 3. obtain list of updates
 * 4. create the customrecordr7nexposeupdates records
 * 
 */

/* Note to self need to write
 * maxIdInAutoUpdater();
 * parseXML();
 * makeRequest(); code
 */
function getUpdates(){
	var ctx = nlapiGetContext();
	var maxUpdateIdInNetsuite = getMaxIdInNetsuite();
	var xml = makeRequest(maxUpdateId,limit);
	var listUpdates = parseXmlForUpdates(xml);
	for(var i=0;i<listUpdates.length;i++){
		createRecord[listUpdates[i]];
		if(ctx.getRemainingUsage<=70){
			break;
		}
	}
		
	maxUpdateIdInNetsuite = parseInt(getMaxIdInNetsuite());
	maxUpdateInAutoUpdater = parseInt(getMaxIdInAutoUpdater());
	
	if(maxUpdateIdInNetsuite < maxUpdateInAutoUpdater){
		nlapiScheduleScript(y); //unScheduledScript1 - same one unscheduled
	}
	else if(maxUpdateIdInNetsuite = maxUpdateInAutoUpdater){
		nlapiScheduleScript(x); //unScheduledScript 2
	}
}

/* This function fetches the maximum update_id present in NetSuite. 
 */
function getMaxIdInNetsuite(){
	var searchFilters = new Array(
	new nlobjSearchFilter('custrecordr7nxupdateid',null,'isnotempty')
	);
	var searchColumns = new Array(
	new nlobjSearchColumn('custrecordr7nxupdateid',null,'max')
	);
	var searchResults = nlapiSearchRecord('customrecordr7nexposeupdates',null,searchFilters,searchColumns);
	var maxId = 0;
	if(searchResults!=null){
		maxId = searchResults[0].getValue(searchColumns[0]);
	}
	return maxId;
}


/* This function fetches the xml response by passing in the maxUpdateId. 
 */
function makeRequest(maxUpdateId,limit){
	 headers['Authorization'] = 'Basic cjdsaWNlbnNlOnAxM1xDRTBmI20xTmQk';
     response = nlapiRequestURL('https://someurl', formParams,headers);
	return xml;
}

/* This function parses the xml and returns an array containing the list of updates, and their details. 
 */
function parseXml(xml){
	return listUpdates;
}


/* This function parses the xml and returns an array containing the list of updates, and their details. 
 */
function createRecord(record){
	var doesNotExist = checkNonExistence(record['upd_id']);
	if (doesNotExist) {
		var record = nlapiCreateRecord('customrecordr7nexposeupdates');
		record.setFieldValue('custrecordr7nxupdateid', record['upd_id']);
		record.setFieldValue('custrecordr7nxupdatetmstmp', record['upd_tstamp']);
		record.setFieldValue('custrecordr7nxupdatedescrip', record['upd_desc']);
		record.setFieldValue('custrecordr7nxispublic', record['is_public']);
		nlapiSubmitRecord(record);
	}
}


/* This function checks if an updateid already exists in Netsuite. 
 */
function checkNonExistence(updateId){
	var searchFilters = new Array(
	new nlobjSearchFilter('custrecordr7nxupdateid',null,'is','updateId')
	);
	var searchColumns = new Array(
	new nlobjSearchColumn('internalid')
	);
	var searchResults = nlapiSearchRecord('customrecordr7nexposeupdates',null,searchFilters,searchColumns);
	if(searchResults!=null){
		return false;
	}
	else{
		return true;	
	}
}

/* This function fetches the maximum update_id present in autoUpdater. 
 */
function getMaxIdInAutoUpdater(){
	maxId = -1;
	headers['Authorization'] = 'cjdsaWNlbnNlOnAxM1xDRTBmI20xTmQk';
    response = nlapiRequestURL('https://someurl', formParams,headers);
	return maxId;
}
