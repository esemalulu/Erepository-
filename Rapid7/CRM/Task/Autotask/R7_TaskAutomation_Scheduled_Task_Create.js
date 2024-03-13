var COST_NLAPICOPYRECORD = 20;
var COST_NLAPISUBMITRECORD = 20;
var COST_NLAPISUBMITRECORD = 20;
var COST_NLAPILOOKUPFIELD = 10;
var COST_NLAPICREATERECORD = 20;
var COST_NLAPISCHEDULESCRIPT = 30;
var COST_NLAPISEARCHRECORD = 20;

var costToProcessASearchResult = 3 * COST_NLAPILOOKUPFIELD +
			1 * COST_NLAPICOPYRECORD +
			1 * COST_NLAPISUBMITRECORD;
			
var costToFinishExecution = COST_NLAPICREATERECORD + COST_NLAPISUBMITRECORD + COST_NLAPISCHEDULESCRIPT;

var costToLookupResultsForTaskParameterRecord = 1 * COST_NLAPISEARCHRECORD;

var costToLookupAlreadyProcessed = 1 * COST_NLAPISEARCHRECORD;

var costToProcessTaskParameterRecord =  costToLookupResultsForTaskParameterRecord +
costToLookupAlreadyProcessed + 	
costToFinishExecution;
		

function createTasks(){

	var sessionIdentifier = nlapiGetContext().getSetting("SCRIPT",'custparam_session_identifier');
	if(sessionIdentifier==null){sessionIdentifier = Math.floor(Math.random()*(10000+1))}
	nlapiLogExecution("DEBUG",'Testing Session Identifier. Session Identifier:'+ sessionIdentifier);
	
    taskParameterRecords = obtainTaskParameterRecordsToProcess(sessionIdentifier);
	if(taskParameterRecords!=null){
		nlapiLogExecution('DEBUG','Task Parameter Records returned:', taskParameterRecords.length);
		nlapiLogExecution('DEBUG','Task Parameter Records contents:', taskParameterRecords);
	}
	else{
		nlapiLogExecution('DEBUG','No Task Parameter Records returned:', 'null');
	}
	
    
    for (var i = 0; 
	taskParameterRecords != null && i < taskParameterRecords.length 
	&& unitsLeft(costToProcessTaskParameterRecord); 
	i++) 
	{
		nlapiLogExecution('DEBUG','Attempting to process the nth task parameter record:', i );
		
		try {
			nlapiLogExecution('DEBUG','Attempting to load task parameter record',taskParameterRecords[i]);
			var taskParameterRecord = nlapiLoadRecord('customrecordr7taskauto',taskParameterRecords[i]); //20
			var taskParameterId = taskRecord.getId();
			
			var searchResults = resultsForTaskParameterRecord(taskParameterId); //20 
			if(searchResults!=null){
				nlapiLogExecution('DEBUG',
				'Search Results Length Obtained For this Task Parameter Record',
				searchResults.length);
				nlapiLogExecution('DEBUG',
				'Contents of searchResults',
				searchResults);
			}else{
				nlapiLogExecution('DEBUG',
				'Search Results Length Obtained For this Task Parameter Record is empty',
				'null');
			}
			
			
			intraDayRecord = resultsAlreadyProcessedForTaskParameterRecord(taskParameterId); //20
			var intraDayRecordIId = intraDayRecord[0];
			var resultsAlreadyProcessed = intraDayRecord[1];
			nlapiLogExecution('DEBUG','IntraDay Record IID', intraDayRecordIId);
			var alreadyProcessed = "";
			for(k in resultsAlreadyProcessed) alreadyProcessed += k+"|";
			nlapiLogExecution('DEBUG','Results Already Processed For This Task Parameter Record:',alreadyProcessed);
			
			var j = 0;
			
			for (j = 0; searchResults != null && 
			j < searchResults.length && unitsLeft(costToProcessASearchResult+costToFinishExecution); 
			j++) 
			{
				var searchResult = obtainSearchValues(searchResults[j]);
				nlapiLogExecution('DEBUG','Search Result Identifier',searchResult['identifier']);
				
				if (resultsAlreadyProcessed[searchResult[identifier]] == null) {
						nlapiLogExecution('DEBUG','Search Result Identifier ' + searchResult['identifier'], 'has NOT been processed before');
						var processed = processRecord(taskParameterRecord, searchResult);
						if (processed) {
						resultsAlreadyProcessed[searchResult['identifier']] = 1;
						}
				}
				else{
					nlapiLogExecution('DEBUG',
					'Search Result Identifier ' + searchResult['identifier'], 
					'HAS been processed before');
				}
			}
			
			if (searchResults != null || j == searchResults.length) {
				//this task was completely processed 
				stampTaskParameterRecordWithIdentifier(taskParameterRecord, sessionIdentifier);
				rewriteResultsAlreadyProcessedForTaskParameterRecord(
				intraDayRecordIId,
				taskParameterRecord.getId(),
				resultsAlreadyProcessed);
			}
			
		}catch(e){
			nlapiLogExecution("ERROR",'Error Processsing TaskParameterRecord',taskParameterRecord[i]);
			nlapiLogExecution("ERROR",e.name,e.message);
		}
    }
	
	var params = new Array();
	params['custparam_session_identifier'] = sessionIdentifier;
	wasteUnits(nlapiGetContext().getRemainingUsage()-30);
	nlapiScheduleScript(nlapiGetContext().getScriptId(),nlapiGetContext().getDeploymentId(),params);
}

function processRecord(taskParameterRecord,searchResult){
	wasteUnits(60);
	return true;
	/*
	var success = false;
	try{
	var taskTemplate = taskParameterRecord.getFieldValue('custrecordr7taskautotaskrecordtemplate');
	var dueDate = taskParameterRecord.getFieldValue('custrecordr7taskautoduedate');
	
	if (searchResult['company'] != null) {
		var customerFields = nlapiLookupField('customer', searchResult['company'],
		new Array('salesrep','custentityr7accountmanager'));
	}
	if (searchResult['transaction'] != null) {
		var transactionAssigned = nlapiLookupField('customer', searchResult['transaction'],
		'somefieldname');
	}
	if (searchResult['case'] != null) {
		var caseAssigned = nlapiLookupField('case', searchResult['case'],
		'assigned');
	}
	var newRecord = nlapiCopyRecord('task',taskTemplate);
	newRecord.setFieldValue()
	var id = nlapiSubmitRecord(newRecord);
	if(id!=null)success=true;
	
	}catch(e){}
	return success;
	*/
}


function stampTaskParameterRecordWithIdentifier(taskParameterRecord,sessionIdentifier){
	nlapiSubmitField('customrecordr7taskauto',
		taskParameterRecord.getId(),
		'custrecordr7sessionidentifier',
		sessionIdentifier);
}


/* Writes/updates intraday records to reflect the search results the taskParameter record has already processed
 * Maximum usage units: 1* COST_NLAPICREATENEWRECORD + 1* NLAPISUBMITRECORD
 */
function rewriteResultsAlreadyProcessedForTaskParameterRecord(iidOfIntradayRecord, taskParameterId, resultsAlreadyProcessed){
	var contents = '';
	for (k in resultsAlreadyProcessed) {
		contents += k;
	}
	if (iidOfIntradayRecord != null) {
		nlapiSubmitField('customrecordr7taskautointradayrecords', iidOfIntradayRecord, 'custrecordr7taskautointradayidentifier', resultsAlreadyProcessed);
	}
	else {
		var newUsageRecord = nlapiCreateRecord('customrecordr7taskautointradayrecords');
		record.setFieldValue('custrecordr7taskautointradaytemplate', taskParameterId);
		record.setFieldValue('custrecordr7taskautointradayidentifier', contents);
		nlapiSubmitRecord(newUsageRecord);
	}
}

/* Parses a searchResult in the searchResults returned for taskParameter record.
 * Maximum usage units: 0
 */
function obtainSearchValues(searchResult){
	var columns = searchResult.getAllColumns();
	var searchResult = new Array();
	if(columns[0]!=null){searchResult['company']=searchResult.getValue(columns[0]);}
	if(columns[1]!=null){searchResult['contact']=searchResult.getValue(columns[1]);}
	if(columns[2]!=null){searchResult['transaction']=searchResult.getValue(columns[2]);}
	if(columns[3]!=null){searchResult['supportcase']=searchResult.getValue(columns[3]);}
	if(columns[4]!=null){searchResult['onboardingrecord']=searchResult.getValue(columns[4]);}
	searchResult['identifier']=searchResult.getValue(columns[0])+'-'+searchResult.getValue(columns[1]);
	return searchResult;
}

function readResultsAlreadyProcessedForTaskParameterRecord(taskParameterId){
	var columns = new Array(
	new nlobjSearchColumn('custrecordr7taskautointradayidentifier')
	);
	var results = nlapiSearchRecord(
	'customrecordr7taskautointradayrecords',
	null,
	filters,
	columns);
	var resultsProcessed  = new Array();
	var iidRecord =null;
	for(var i=0;results!=null && i<results.length;i++){
		iidRecord = results[i].getId();
		var rec = results[i].getValue(columns[0]);
		var recArray = rec.split('|');
		for(var j=0;recArray!=null && j<recArray.length;j++){
			resultsProcessed[recArray[j]]=1;	
		}
	}
	return new Array(iid,resultsProcessed);
}

function resultsForTaskParameterRecord(taskParameterId){
	
}


function processTaskParameterRecord(taskRecord){
	
}

/*
function findCostToProcessTaskParameterRecord(taskRecord){
    var searchId = taskRecord.getFieldValue('custrecordr7taskautosearchid');
    var searchType = taskRecord.getFieldValue('custrecordr7taskautosearchtype');
	var results = new Array();
	try{
		results = nlapiSearchRecord(searchType,searchId);
	}catch(e){
		nlapiLogExecution('ERROR','SearchType and SearchId Mismatch','Do not match up');
	}
	var resultsCost = results.length *  (COST_NLAPICOPYRECORD + COST_NLAPISUBMITRECORD);
	return resultsCost;
}
*/

function obtainTaskParameterRecordsToProcess(sessionIdentifier){
    var hours = new Date().getHours();
    var records = new Array();
    records = obtainAllTaskParameterRecordsDaily(sessionIdentifier);
    //records = obtainAllTaskParameterRecordsHalfHour();
   	 return records;
}


function obtainAllTaskParameterRecordsDaily(sessionIdentifier){
	var sessionFilter = new Array(
	new nlobjSearchFilter('custrecordr7sessionidentifier',null,'isnot',sessionIdentifier)
	);
	
    //Return all non-expired task Parameter records
    var filters = new Array(new nlobjFilter('custrecordr7taskautoexpirationdate', null, 'onorbefore', nlapiDateToString(new Date())), new nlobjFilter('custrecordr7taskautoschedule', null, 'anyof', new Array('Once per Day', getDayInString())));
    if(sessionIdentifier!=null) filters = filter.concat(sessionFilter);
	var results1 = nlapiSearchRecord('customrecord252', null, filters);
    
    var day = new Date().getDate();
    var filters2 = new Array(new nlobjFilter('custrecordr7taskautoexpirationdate', null, 'onorbefore', nlapiDateToString(new Date())),
	 new nlobjFilter('custrecordr7taskautoscheduledays', null, 'is', day));
    if(sessionIdentifier!=null) filters2 = filter2.concat(sessionFilter);
	var results2 = nlapiSearchRecord('customrecord252', null, filters2);
    
    var results = results1.concat(results2);
    
    var finalResults = new Array();
    for (var i = 0; results != null && i < results.length; i++) {
        finalResults[finalResults.length] = results[i].getInternalId();
    }
    return finalResults;
}

function obtainAllTaskParameterRecordsHalfHour(sessionIdentifier){
	var sessionFilter = new Array(
	new nlobjSearchFilter('custrecordr7sessionidentifier',null,'isnot',sessionIdentifier)
	);
	
    var filters = new Array(new nlobjFilter('custrecordr7taskautoexpirationdate', null, 'onorbefore', nlapiDateToString(new Date())), 
	new nlobjFilter('custrecordr7taskautoschedule', null, 'anyof', new Array('Every 30 Minutes'))
	);
    if(sessionIdentifier!=null) filters = filter.concat(sessionFilter);
	var results = nlapiSearchRecord('customrecord252', null, filters);
    
    var finalResults = new Array();
    for (var i = 0; results != null && i < results.length; i++) {
        finalResults[finalResults.length] = results[i].getInternalId();
    }
    return finalResults;
}


function getDayInString(){
    var weekday = new Array(7);
    weekday[0] = "Sunday";
    weekday[1] = "Monday";
    weekday[2] = "Tuesday";
    weekday[3] = "Wednesday";
    weekday[4] = "Thursday";
    weekday[5] = "Friday";
    weekday[6] = "Saturday";
    return weekday[new Date().getUTCDay()];
}

function unitsLeft(number){
    var unitsLeft = nlapiGetContext().getRemainingUsage();
    if (unitsLeft >= number) {
        return true;
    }
    return false;
}

function wasteUnits(number){
	var beginningUsage = nlapiGetContext().getRemainingUsage();
	var remainingUsage = nlapiGetContext().getRemainingUsage();
	while (remainingUsage >= beginningUsage - number) {
		var someWastefulActivity = nlapiLookupField('customer', 130910, 'isinactive');
		remainingUsage = nlapiGetContext().getRemainingUsage();
	}
}

