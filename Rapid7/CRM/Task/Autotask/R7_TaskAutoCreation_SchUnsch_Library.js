function createTasks(){
	
	//uncomment this to crash script - BAM!	
	
	//Obtaining the sessionIdentifier
	var sessionIdentifier = nlapiGetContext().getSetting("SCRIPT",SESSION_IDENTIFIER_PARAMETER);
	if(sessionIdentifier==null){
		sessionIdentifier = Math.floor(Math.random()*(100000+1))
		nlapiLogExecution("DEBUG",'Session Identifier Generated:'+ sessionIdentifier);
	}
	else{
		nlapiLogExecution("DEBUG",'Session Identifier Passed Over:'+ sessionIdentifier);
	}
	sessionIdentifier = parseInt(sessionIdentifier);
	
	//Obtaining all taskParameter records
	//that do not match the sessionIdentifier
    taskParameterRecords = obtainTaskParameterRecordsToProcess(sessionIdentifier);
	
	
	if(taskParameterRecords!=null){
		nlapiLogExecution('DEBUG','Task Parameter Records returned:', taskParameterRecords.length);
		nlapiLogExecution('DEBUG','Task Parameter Records InternalIds:', taskParameterRecords);
	}
	else{
		nlapiLogExecution('DEBUG','No Task Parameter Records returned:', 'null');
	}
	
    
    for (var i = 0; 
	taskParameterRecords != null && i < taskParameterRecords.length 
	&& unitsLeft(costToProcessTaskParameterRecord); 
	i++)
	{
		nlapiLogExecution('DEBUG','Attempting to process the nth task parameter record:', i+1 );
		
		//try {
			nlapiLogExecution('DEBUG','Attempting to load task parameter record',taskParameterRecords[i]);
			var taskParameterRecord = nlapiLoadRecord('customrecordr7taskparameter',taskParameterRecords[i]); //20
			var taskParameterId = taskParameterRecord.getId();

        var taskParameterURL = "https://663271.app.netsuite.com" + nlapiResolveURL('RECORD', 'customrecordr7taskparameter', taskParameterId);
        var taskTemplateURL = "https://663271.app.netsuite.com" + nlapiResolveURL('RECORD', 'task', taskParameterRecord.getFieldValue('custrecordr7taskautotaskrecordtemplate'));
			var taskRecord = nlapiLoadRecord('task', taskParameterRecord.getFieldValue('custrecordr7taskautotaskrecordtemplate'));
				//var additionalTaskFields = nlapiLookupField('task',taskParameterRecord.getFieldValue('custrecordr7taskautotaskrecordtemplate'),
				//new Array('timedevent','starttime','endtime'));
			var daysTillExpiry = taskParameterRecord.getFieldValue('custrecordr7taskautodaystillexpiry');
			
			//Run the search on the taskParameter record to obtain the results	
			var searchResults = resultsForTaskParameterRecord(taskParameterRecord); //20 
							
				intraDayRecord = readResultsAlreadyProcessedForTaskParameterRecord(taskParameterId); //20 
				//These results were already processed for this particular task parameter record
				
				var intraDayRecordIId = intraDayRecord[0]; //If intraDayRecord is not null, this iid has a value
				var resultsAlreadyProcessed = intraDayRecord[1]; //This contains the results already processed
				var maxDate = intraDayRecord[2]; // This contains the maxDate
				
				nlapiLogExecution('DEBUG', 'IntraDay Record IID', intraDayRecordIId);
				nlapiLogExecution('DEBUG','The maxDate of IntradayRecords',maxDate);
				
				
				var alreadyProcessed = "";
				for (k in resultsAlreadyProcessed) 
					alreadyProcessed += k + "|";
				nlapiLogExecution('DEBUG', 'Results Already Processed For This Task Parameter Record:', alreadyProcessed);
				
				var j = 0;
				
				//This array will hold the new results that
				//will be processed by this execution
				var newResultsProcessedByThisExecution = new Array();
				
				for (j = 0; searchResults != null &&
				j < searchResults.length &&
				unitsLeft(costToProcessASearchResult + costToFinishExecution); j++) {
					
					var searchResult = obtainSearchValues(searchResults[j]);
					
					//nlapiLogExecution('DEBUG', 'Search Result Identifier', searchResult['identifier']);
					
					if (resultsAlreadyProcessed[searchResult['identifier']] == null) {
						
						//nlapiLogExecution('DEBUG', 'Search Result Identifier ' + searchResult['identifier'], 'has NOT been processed before');
						var processed = processRecord(taskParameterRecord, searchResult, taskParameterURL, taskTemplateURL, taskRecord);
						if (processed) {
							resultsAlreadyProcessed[searchResult['identifier']] = 1;
							newResultsProcessedByThisExecution[searchResult['identifier']]=1;
						}
					}
					else {
						//nlapiLogExecution('DEBUG', 'Search Result Identifier ' + searchResult['identifier'], 'HAS been processed before');
					}
				}
				
				if (searchResults == null || j == searchResults.length) {
					//this task was completely processed 
					stampTaskParameterRecordWithIdentifier(taskParameterRecord, sessionIdentifier);
					if (taskParameterRecordIsRunOnce(taskParameterRecord)) {
						nlapiSubmitField('customrecordr7taskparameter', taskParameterRecord.getId(), 'custrecordr7runoncetaskprocessed', 'T');
					}
				}
				
				//Rewriting the results already processed for this taskParamter Record
				rewriteResultsAlreadyProcessedForTaskParameterRecord(
				intraDayRecordIId, 
				taskParameterRecord.getId(), 
				resultsAlreadyProcessed,
				daysTillExpiry,
				maxDate,
				newResultsProcessedByThisExecution);
				
			/*	
	 }catch(e){
	 nlapiLogExecution("ERROR",'Error Processsing TaskParameterRecord',taskParameterRecords[i]);
	 nlapiLogExecution("ERROR",e.name,e.message);
	 }
	 */

    }
	
	if (taskParameterRecords == null || taskParameterRecords.length==0) {
		nlapiLogExecution('DEBUG','All Task Paramter Records completely processed');
	}
	else {
		var params = new Array();
		params[SESSION_IDENTIFIER_PARAMETER] = sessionIdentifier;
		//wasteUnits(nlapiGetContext().getRemainingUsage() - 30);
		if (THIS_IS_SCHEDULED_VS_UNSCHEDULED) {
			nlapiScheduleScript(UNSCHEDULED_SCRIPT_ID, UNSCHEDULED_SCRIPT_DEPLOYMENT_ID, params);
		}
		else {
			nlapiScheduleScript(nlapiGetContext().getScriptId(), nlapiGetContext().getDeploymentId(), params);
		}
		nlapiLogExecution('DEBUG', 'Attempting to chain the next scheduled script');
	}
}

function processRecord(taskParameterRecord,searchResult,taskParameterURL,taskTemplateURL,taskRecord){
	//wasteUnits(60);
	//return true;
	var success = false;
	
	try {
		var taskTemplate = taskParameterRecord.getFieldValue('custrecordr7taskautotaskrecordtemplate');
		var assignToEmployee = taskParameterRecord.getFieldValue('custrecordr7taskautoassigntoemployee');
		var assignToRole = taskParameterRecord.getFieldValue('custrecordr7taskautoassignto');
		var dueDateDays = taskParameterRecord.getFieldValue('custrecordr7taskautoduedate');
		var taskId = taskParameterRecord.getId();
		
		nlapiLogExecution('DEBUG','Assign to Employee',assignToEmployee);
				
		//1 Company Sales Rep, 
		//2 Company Acct Manager
		//3 Opportunity/Transaction SalesRep
		//4 Support Case assigned
		//5 See Below
		var empId = null;
		assignToRole = parseInt(assignToRole);
		nlapiLogExecution('DEBUG','Assign To Role',assignToRole);
		if (assignToRole == 5) {
				empId = assignToEmployee;
		}
		else if (assignToRole == 1){
			if (searchResult['company'] != null && searchResult['company'] !='') {
				var customerFields = nlapiLookupField('customer', searchResult['company'], new Array('salesrep', 'custentityr7accountmanager'));
			}
			empId = customerFields['salesrep'];
		} else if (assignToRole == 2) {
			if (searchResult['company'] != null && searchResult['company'] !='') {
				var customerFields = nlapiLookupField('customer', searchResult['company'], new Array('salesrep', 'custentityr7accountmanager'));
			}
			empId = customerFields['custentityr7accountmanager'];
		}else if (assignToRole == 3) {
				if (searchResult['transaction'] != null) {
					var transactionAssigned = nlapiLookupField('transaction', searchResult['transaction'], 'salesrep');
				}
				empId = transactionAssigned;
		}else if (assignToRole == 4) {
					if (searchResult['case'] != null) {
						var caseAssigned = nlapiLookupField('case', searchResult['case'], 'assigned');
					}
					empId = caseAssigned;
		}
		if (empId == null || empId=='') {
			empId = taskParameterRecord.getFieldValue('owner');
		}
		nlapiLogExecution('DEBUG','Assign to Employee',empId);
		
		var dueDateDays = parseInt(getBusinessDaysEquivalent(dueDateDays));
		var dateToSet = nlapiDateToString(nlapiAddDays(new Date(), dueDateDays));
		
		
		
		var newRecord = nlapiCopyRecord('task', taskTemplate);
		newRecord.setFieldValue('custeventr7taskautocreated',taskParameterRecord.getId());
	
		//Setting the date to set as specified
		newRecord.setFieldValue('duedate',dateToSet);
		newRecord.setFieldValue('assigned', empId);
		newRecord.setFieldValue('custeventr7taskautotemplate', 'F');

		if(taskRecord.getFieldValue('timedevent')=='T'){
			newRecord.setFieldValue('timedevent',taskRecord.getFieldValue('timedevent'));
			newRecord.setFieldValue('starttime',taskRecord.getFieldValue('starttime'));
			newRecord.setFieldValue('endtime',taskRecord.getFieldValue('endtime'));
		}
		newRecord.setFieldValue('remindertype',taskRecord.getFieldValue('remindertype'));
		newRecord.setFieldValue('reminderminutes',taskRecord.getFieldValue('reminderminutes'));
		newRecord.setFieldText('status',taskParameterRecord.getFieldText('custrecordr7taskautostatus'));
				
		var commentText='';
		
		if(searchResult['company']!=null
		&& searchResult['company']!=''
		){
			var coIId = parseInt(searchResult['company']);
			newRecord.setFieldValue('company',coIId);
		}
		if(searchResult['contact']!=null
		&& searchResult['contact']!=''
		){
			newRecord.setFieldValue('contact',searchResult['contact']);
			var contactPhones = lookupContactPhones(searchResult['contact']);
			var contactTitle = lookupContactTitle(searchResult['contact']);
			var contactTimeZone = lookupContactTimeZone(searchResult['contact']);
			
			var addContactDetails ="";
			(contactTitle!=null && contactTitle!='')? addContactDetails +="\n Contact Title:" + contactTitle: addContactDetails = addContactDetails;
			(contactPhones!=null && contactPhones!='')? addContactDetails +="\n Contact Phone:" + contactPhones: addContactDetails = addContactDetails;
			(contactTimeZone!=null && contactTimeZone!='')? addContactDetails +="\n Contact Title:" + contactTimeZone: addContactDetails = addContactDetails;
		
		}
		if(searchResult['supportcase']!=null &&
		searchResult['supportcase']!=''
		){
			newRecord.setFieldValue('supportcase',searchResult['supportcase']);
		}
		if(searchResult['transaction']!=null &&
		searchResult['transaction']!=''
		){
			newRecord.setFieldValue('transaction',searchResult['transaction']);
		}
		if (searchResult['onboardingrecord'] != null &&
		searchResult['onboardingrecord'] != ''
		) {
			newRecord.setFieldValue('custeventonboardingrecord',searchResult['onboardingrecord']);
		}
		if(searchResult['commentsText']!=null){
			commentText=searchResult['commentsText'];
		}
		if(searchResult['taskTitle']!=null && 
		searchResult['taskTitle']!=''){
			nlapiLogExecution("DEBUG",'Task Title',searchResult['taskTitle']);
			newRecord.setFieldValue('title',searchResult['taskTitle']);
		}
		if(searchResult['dueDate']!=null &&
		searchResult['dueDate']!=''){
			newRecord.setFieldValue('duedate',searchResult['dueDate']);
		}
		if(searchResult['assignedTo']!=null && searchResult['assignedTo']!=''){
			newRecord.setFieldValue('assigned',searchResult['assignedTo']);
		}
		// Set CampaignId
		if(searchResult['taskleadsource']!=null && searchResult['taskleadsource']!=''){
			newRecord.setFieldText('custeventr7taskleadsource',searchResult['taskleadsource']);
		}
		// Set New Contact
		if(searchResult['tasknewcontact']!=null && searchResult['tasknewcontact']!=''){
			newRecord.setFieldValue('custeventr7tasknewcontact',searchResult['tasknewcontact']);
		}
		// Set PSO Engagement
		if(searchResult['psoEngagement']!=null && searchResult['psoEngagement']!=''){
			newRecord.setFieldValue('custeventr7taskpsoengagement',searchResult['psoEngagement']);
		}
				
		var pref = newRecord.getFieldValue('message');
		if(pref==null || pref=='null'){pref='';}
		newRecord.setFieldValue('message',pref+" "+commentText);
		
		if(addContactDetails!=null && addContactDetails!=''){
			//var details = newRecord.getFieldValue('message');
			//details +="\n" + addContactDetails; 
			//newRecord.setFieldValue('message',details);
		}
		
	}catch(err){
		nlapiLogExecution('ERROR','Issue here',err);
	}
		
		try{
		newRecord.setFieldValue('sendemail', 'F'); //always setting to false as the script will do the sending of the email.
		nlapiLogExecution('DEBUG', 'sendemail', newRecord.getFieldValue('sendemail'));
		var id = nlapiSubmitRecord(newRecord);
		if (id != null) {
			success = true;
			if(taskParameterRecord.getFieldValue('custrecordr7taskautosendemail')=='T'){
			var emailText = " "+
			//"\n<BR>The following task has been assigned to you by " + taskParameterRecord.getFieldText('owner') + 
			"\n<BR>"+
			"\n<BR>Information regarding the task has been posted below."+
			'\n<BR> To view the task record, log into NetSuite then navigate to  <a href="https://663271.app.netsuite.com/app/crm/calendar/task.nl?id='+id+'"> here </a>'+
			"\n<BR>"+
			"\n<BR>Task: "+ newRecord.getFieldValue('title')+ 
			"\n<BR>Priority: "+ newRecord.getFieldText('priority')+ 
			"\n<BR>Status: " + newRecord.getFieldText('status') + 
			"\n<BR>Start Date: " + newRecord.getFieldValue('startdate') +
			"\n<BR>Due Date: " + newRecord.getFieldValue('duedate') + 
			"\n<BR>Comments: " + newRecord.getFieldValue('message') +
			"\n<BR>Associated company:" + newRecord.getFieldText('company') + 
			"\n<BR>Associated contact:" + newRecord.getFieldText('contact')+
			"\n<BR>Contact  Title:" + contactTitle+
			"\n<BR>Contact  Phones:" + contactPhones+
			"\n<BR>Contact  TimeZone:" + contactTimeZone+
			"\n<BR>\n<BR>";	
					
			//nlapiSendEmail(taskParameterRecord.getFieldValue('custrecordr7taskautosendemailfrom'),newRecord.getFieldValue('assigned'),
			//newRecord.getFieldValue('title'),
			//emailText,'derek_zanga@rapid7.com');
			
			nlapiSendEmail(taskParameterRecord.getFieldValue('custrecordr7taskautosendemailfrom'),
			newRecord.getFieldValue('assigned'),
			newRecord.getFieldValue('title'),
			emailText);
			
			}
		}
		
		} 
		catch (e) {
		nlapiLogExecution('ERROR',"Error Name:"+e.name,"Error Message"+e.message);
		nlapiLogExecution('ERROR','CompanyId:',searchResult['company']);
		nlapiLogExecution('ERROR','ContactId:',searchResult['contact']);
		var ownerName = taskParameterRecord.getFieldText('owner');
		var ownerId = taskParameterRecord.getFieldValue('owner');
		var ownerEmail = nlapiLookupField('employee',ownerId,'email');
		var errorDetail = "Error Name: "+ e.name + " Error Message: "+e.message;
		var errorText = 
		"Hi "+ownerName+",\n<br>"+
		"\n<br> This is an automated message.Please contact Administration if you have any questions regarding this message."+
		"\n<br>\n<br> Your automated task WAS NOT created for the following reason:"+
		"\n<br> "+errorDetail+ "\n<br>"+
		"\n<br> Details of your Search Result:"+
		"\n<br> ------------------------------"+
		"\n<br> Company(IID): "+searchResult['company']+
		"\n<br> Contact(IID): "+searchResult['contact']+
		"\n<br> Support Case(IID): "+searchResult['supportcase']+
		"\n<br> Transaction(IID): "+searchResult['transaction']+
		"\n<br> Comments: " + searchResult['commentsText']+
		"\n<br>"+
		"\n<br> Company : "+searchResult['companyText']+
		"\n<br> Contact: "+searchResult['contactText']+
		"\n<br> Support Case: "+searchResult['supportcaseText']+
		"\n<br> Transaction: "+searchResult['transactionText']+
		"\n<br>"+
		"\n<br> Details of your Task Parameter Record:"+
		"\n<br> ---------------------------------------"+
		"\n<br> Saved Search Used: "+ taskParameterRecord.getFieldText('custrecordr7taskautosearchid')+
		"\n<br> Saved Search Type: "+ taskParameterRecord.getFieldText('custrecordr7taskautosearchtype')+
		"\n<br> Your Task Parameter Record: "+ "<a>"+taskParameterURL+"</a>"+
		"\n<br> Your Task Template Record: "+ "<a>"+taskTemplateURL+"</a>"+
		"\n<br>"+
		"\n<br> Please revisit your taskParameter record and/or your templateTask to avoid a recurrence of this incident." +
		"\n<br> You will not be notified again for this company-contact pair." +
		"\n<br> "+
		"\n<br> "+
		"\n<br> Netsuite.";

		nlapiSendEmail(3889342,
		new Array(ownerEmail,'caitlin_swofford@rapid7.com','jackie_joly@rapid7.com')
		,'Error on AutoTask Create',errorText);
		success = true; 
		}
	//}
	//catch(e){
	//nlapiLogExecution('ERROR','Error Processing Task(other than Submit) ' +e.name,e.message); 
	//}
	return success;
	//return true;
}

function taskParameterRecordIsRunOnce(taskParameterRecord){
	verdict = false;
	fieldValues = taskParameterRecord.getFieldTexts('custrecordr7taskautoschedule');
	for(var i=0;fieldValues!=null && i<fieldValues.length;i++){
		if(fieldValues[i]=='Run Once'){
			verdict = true;
			break;
		}
	}
	return verdict;
}



function stampTaskParameterRecordWithIdentifier(taskParameterRecord,sessionIdentifier){
	nlapiLogExecution('DEBUG','Session Identifier',sessionIdentifier);
	nlapiSubmitField('customrecordr7taskparameter',
		taskParameterRecord.getId(),
		'custrecordr7sessionidentifier',
		sessionIdentifier);
}


/* Reads the intraday records for the task parameter record
 * Return a list of resultsAlreadyProcessed
 */
function readResultsAlreadyProcessedForTaskParameterRecord(taskParameterId){
	
	var columns = new Array(new nlobjSearchColumn('custrecordr7taskautointradayidentifier'), 
	new nlobjSearchColumn('created')
	);
	
	var filters = new Array(new nlobjSearchFilter('custrecordr7taskautointradaytemplate', 
	null, 'is', taskParameterId));
	
	//filters[filters.length] = new nlobjSearchFilter('created', null, 'onorbefore', nlapiDateToString(new Date()));
	
	var results = nlapiSearchRecord('customrecordr7taskautointradayrecords', 
	null, filters, 
	columns);
	
	var resultsProcessed = new Array();
	var iidRecord = null;
	var maxDate = null;
	for (var i = 0; results != null && i < results.length; i++) {
		
		
		iidRecord = results[i].getId();
		var rec = results[i].getValue(columns[0]);
		var recArray = rec.split('|');
		for (var j = 0; recArray != null && j < recArray.length; j++) {
			resultsProcessed[recArray[j]] = 1;
		}
		
		//Obtaining the maxDate for intraday records, for this taskParameterId 
		var dateOnIntradayRecordString = results[i].getValue(columns[1]);
		//nlapiLogExecution('DEBUG','Date on intraday record string',dateOnIntradayRecordString);
		
		if (dateOnIntradayRecordString != null && dateOnIntradayRecordString != '') {
			dateOnIntradayRecord = nlapiStringToDate(dateOnIntradayRecordString);
			if (maxDate == null) {
				maxDate = dateOnIntradayRecord;
			}
			if (dateOnIntradayRecord > maxDate) {
				maxDate = dateOnIntradayRecord;
			}
		}
		//Done obtaining the maxDate
	}
	return new Array(iidRecord, resultsProcessed, maxDate);
}

/* Writes/updates intraday records to reflect the search results the taskParameter record has already processed
 * Maximum usage units: 1* COST_NLAPICREATENEWRECORD + 1* NLAPISUBMITRECORD
 */
function rewriteResultsAlreadyProcessedForTaskParameterRecord(
iidOfIntradayRecord, 
taskParameterId, 
resultsAlreadyProcessed, 
daysTillExpiry,
maxDate,
newResultsProcessedByThisExecution
){
	var today = nlapiDateToString(new Date()); //Today's Date
	if (maxDate != null) {
		maxDate = nlapiDateToString(maxDate);
	//Max Date of Intraday records for this task
	}
	
	nlapiLogExecution('DEBUG','Persisting to intraday record: MAXDATE, TODAY',maxDate+" "+today);
	
	var contents = '';
	for (k in resultsAlreadyProcessed) {
		contents += k+"|";
	}
	
	var newContents = '';
	for (k in newResultsProcessedByThisExecution) {
		newContents += k+"|";
	}
	
	//Persist to existing intraday record if it exists
	if (iidOfIntradayRecord != null && (maxDate==today) ) { 
		nlapiLogExecution('DEBUG','Rewriting existing intraday record','yup');
		
		//Rewrite to existing intraday record only if it was created today,
		//else create a new intraday record.
		var currentIdentifier = '';
		try {
			currentIdentifier = nlapiLookupField('customrecordr7taskautointradayrecords', iidOfIntradayRecord, 'custrecordr7taskautointradayidentifier');
		} catch (e){
			currentIdentifier = '';
		}
		if (currentIdentifier == null){
			currentIdentifier = '';
		}
		var newIdentifier = currentIdentifier + '' + newContents;
		nlapiSubmitField('customrecordr7taskautointradayrecords', iidOfIntradayRecord, 'custrecordr7taskautointradayidentifier', newIdentifier);
	}
	else { //Else create a new intraday record
		nlapiLogExecution('DEBUG','Creating a new intraday record','yup');
		var newUsageRecord = nlapiCreateRecord('customrecordr7taskautointradayrecords');
		newUsageRecord.setFieldValue('custrecordr7taskautointradaytemplate', taskParameterId);
		newUsageRecord.setFieldValue('custrecordr7taskautointradayidentifier', newContents); //Just what was created during this execution
		newUsageRecord.setFieldValue('custrecordr7taskautointradaystillexpr',daysTillExpiry);
		nlapiSubmitRecord(newUsageRecord);
	}
}

/* Parses a searchResult in the searchResults returned for taskParameter record.
 * Maximum usage units: 0
 */
function obtainSearchValues(searchResult){
	
	
	var formattedSearchResult = new Array();
	
	formattedSearchResult['company']='';
	formattedSearchResult['companyText']='';
	formattedSearchResult['contact']='';
	formattedSearchResult['contactText']='';
	formattedSearchResult['commentsText']='';
	formattedSearchResult['transaction']='';
	formattedSearchResult['transactionText']='';
	formattedSearchResult['supportcase']='';
	formattedSearchResult['supportcaseText']='';
	formattedSearchResult['onboardingrecord']='';
	formattedSearchResult['onboardingrecordText']='';
	formattedSearchResult['taskTitle']='';
	formattedSearchResult['dueDate']='';
	formattedSearchResult['assignedTo']='';
	formattedSearchResult['specialIdentifier']='';
	formattedSearchResult['taskleadsource']='';
	formattedSearchResult['tasknewcontact']='';
	formattedSearchResult['psoEngagement']='';
	
	var columns2 = searchResult.getAllColumns();
	
	if(columns2[0]!=null ){
		formattedSearchResult['company']=searchResult.getValue(columns2[0]);
	}
	if(columns2[1]!=null){
		formattedSearchResult['contact']=searchResult.getValue(columns2[1]);
	}
	if(columns2[2]!=null){
		var value=searchResult.getValue(columns2[2]);
		if (value != '0') {
			formattedSearchResult['transaction'] = value;
		}
	}
	if(columns2[3]!=null){
		var value = searchResult.getValue(columns2[3]);
		if (value != '0') {
			formattedSearchResult['supportcase'] = value;
		}
	}
	if(columns2[4]!=null){
		var value = searchResult.getValue(columns2[4]);
		if (value != '0') {
			formattedSearchResult['onboardingrecord'] = value;
		}
	}
	if(columns2[5]!=null){
		formattedSearchResult['commentsText']=searchResult.getValue(columns2[5]);
	}
	if(columns2[6]!=null){
		formattedSearchResult['companyText']=searchResult.getText(columns2[6]);
	}
	if(columns2[7]!=null){
		formattedSearchResult['contactText']=searchResult.getText(columns2[7]);
	}
	if(columns2[8]!=null){
		formattedSearchResult['transactionText']=searchResult.getText(columns2[8]);
	}
	if(columns2[9]!=null){
		formattedSearchResult['supportcaseText']=searchResult.getText(columns2[9]);
	}
	if(columns2[10]!=null){
		formattedSearchResult['onboardingrecordText']=searchResult.getText(columns2[10]);
	}
	if(columns2[11]!=null){
		formattedSearchResult['taskTitle']=searchResult.getValue(columns2[11]);
	}
	if(columns2[12]!=null){
		formattedSearchResult['dueDate']=searchResult.getValue(columns2[12]);
	}
	if(columns2[13]!=null){
		formattedSearchResult['assignedTo']=searchResult.getValue(columns2[13]);
	}
	if(columns2[14]!=null){
		formattedSearchResult['specialIdentifier']=searchResult.getValue(columns2[14]);
	}
	if(columns2[15]!=null){
		formattedSearchResult['taskleadsource']=searchResult.getValue(columns2[15]);
	}
	if(columns2[16]!=null){
		formattedSearchResult['tasknewcontact']=searchResult.getValue(columns2[16]);
	}
	if(columns2[17]!=null){
		formattedSearchResult['psoEngagement']=searchResult.getValue(columns2[17]);
	}
	//formattedSearchResult['commentsText'] += " boom";
	
	for (key in formattedSearchResult){
		//nlapiLogExecution('DEBUG',key,formattedSearchResult[key]);
	}
	
	var specialIdentifier = formattedSearchResult['specialIdentifier'];
	
	if (specialIdentifier!=null && specialIdentifier!=''){
		specialIdentifier = specialIdentifier + '-';
	}
	
	nlapiLogExecution('DEBUG', 'specialIdentifier', specialIdentifier);
		
	formattedSearchResult['identifier']=
	searchResult.getValue(columns2[0])+'-'+
	searchResult.getValue(columns2[1])+'-'+
	specialIdentifier +
	serializeString(searchResult.getValue(columns2[11])); //Serialized version of taskTitle
	return formattedSearchResult;
}


function resultsForTaskParameterRecord(taskParameterRecord){
	var searchType = taskParameterRecord.getFieldText('custrecordr7taskautosearchtype');
	var searchId = taskParameterRecord.getFieldValue('custrecordr7taskautosearchid');
	var searchResults = null;
	var totalSearchResults = new Array();
	
	var lastInternalId = 0;
	do{
		searchResults =null;
		
		var searchFilters = new Array();
		if(lastInternalId!=0 && lastInternalId!=null){
			lastInternalId = lastInternalId;
			nlapiLogExecution('DEBUG','Last InternalId ',lastInternalId);
			searchFilters[0]= new nlobjSearchFilter('formulanumeric',null,'greaterthan',lastInternalId);
			searchFilters[0].setFormula('{internalid}');
		}
		
		try {
			searchResults = nlapiSearchRecord(
			searchType, 
			searchId,
			searchFilters
			);
			if (searchResults != null) {
				nlapiLogExecution('DEBUG', 'Search Results length',searchResults.length);
			}
		}catch(e){
			nlapiLogExecution('ERROR',"Error name:"+e.name, "Error message:" + e.message);
		}
		for(var i=0;searchResults!=null && i<searchResults.length;i++){
			totalSearchResults[totalSearchResults.length]=searchResults[i];
		}
		if(searchResults!=null)	lastInternalId = searchResults[searchResults.length-1].getId();
		
		nlapiLogExecution('DEBUG','Last InternalId',lastInternalId);
		if(totalSearchResults!=null)nlapiLogExecution('DEBUG','Total Search Results',totalSearchResults.length);
	
	}while(searchResults!=null && searchResults.length==1000);
	
	return totalSearchResults;
}

function obtainTaskParameterRecordsToProcess(sessionIdentifier){
    var hours = new Date().getHours();
    var records = new Array();
	nlapiLogExecution('DEBUG','Records to fetch',RUNONCE_DAILY_HOURLY);
	if (RUNONCE_DAILY_HOURLY=='DAILY') {
		records = obtainAllTaskParameterRecordsDaily(sessionIdentifier);
	}else if (RUNONCE_DAILY_HOURLY=='HOURLY'){
		records = obtainAllTaskParameterRecordsHalfHour(sessionIdentifier);	
	}
	else if(RUNONCE_DAILY_HOURLY=='RUNONCE'){
		records = obtainAllTaskParameterRecordsRunOnce(sessionIdentifier);
	}
   	 return records;
}


function obtainAllTaskParameterRecordsDaily(sessionIdentifier){
	
    //Return all non-expired daily task Parameter records
    var filters = new Array(
	new nlobjSearchFilter('custrecordr7sessionidentifier',null,'notequalto',sessionIdentifier),
	//	new nlobjSearchFilter('custrecordr7sessionidentifier',null,'isempty'),
	// new nlobjSearchFilter('custrecordr7taskautoschedule',null,'noneof', new Array('1')),
	new nlobjSearchFilter('isinactive',null,'is','F'),
	new nlobjSearchFilter('custrecordr7taskautoexpirationdate', null, 'onorafter', nlapiDateToString(new Date())), 
	new nlobjSearchFilter('custrecordr7taskautoschedule', null, 'anyof', new Array('3', getDayInString())));
  
  	var results1 = new Array();
	results1 = nlapiSearchRecord('customrecordr7taskparameter', null, filters);
    
    var day = new Date().getDate();
    var filters2 = new Array(
	new nlobjSearchFilter('custrecordr7sessionidentifier',null,'notequalto',sessionIdentifier),
	//new nlobjSearchFilter('custrecordr7taskautoscheduledays',null,'noneof', new Array('1')),
	//new nlobjSearchFilter('inactive',null,'is','F'),
	new nlobjSearchFilter('custrecordr7taskautoexpirationdate', null, 'onorafter', nlapiDateToString(new Date())),
	new nlobjSearchFilter('custrecordr7taskautoscheduledays', null, 'equalto', day)
	);
	var results2 = new Array();
	results2 = nlapiSearchRecord('customrecordr7taskparameter', null, filters2);
    
	    
    var finalResults = new Array(); var alreadyIn = new Array();
    for (var i = 0; results1 != null && i < results1.length; i++) {
		if (alreadyIn[results1[i].getId()] == null) {
			finalResults[finalResults.length] = results1[i].getId();
			alreadyIn[results1[i].getId()]=1;
		}
    }
	for (var i = 0; results2 != null && i < results2.length; i++) {
		if (alreadyIn[results2[i].getId()] == null) {
			finalResults[finalResults.length] = results2[i].getId();
			alreadyIn[results2[i].getId()]=1;
		}
    }
    return finalResults;
}

function serializeString(stringValue){
	var value = 0;
	if(stringValue!=null){
		stringValue = stringValue.toLowerCase();
		//alert(stringValue);
		stringValue = stringValue.replace(/[^a-z0-9]/gi,'')
		//alert(stringValue);
		for(var i=0;i<stringValue.length;i++){
			value += 10*value + parseInt(stringValue.charCodeAt(i));
			//alert(value);	
		}
	var TwentyDigitPrime = 5915587277;
	value = value % TwentyDigitPrime;	
	}
	//alert(value);
	return value;
}


function obtainAllTaskParameterRecordsHalfHour(sessionIdentifier){
    //Return all non-expired task Parameter records
    var filters = new Array(
	new nlobjSearchFilter('isinactive',null,'is','F'),
	new nlobjSearchFilter('custrecordr7sessionidentifier',null,'notequalto',sessionIdentifier),
	new nlobjSearchFilter('custrecordr7taskautoexpirationdate', null, 'onorafter', nlapiDateToString(new Date())), 
	new nlobjSearchFilter('custrecordr7taskautoschedule', null, 'anyof', new Array('2'))
	);
  
  	var results1 = new Array();
	results1 = nlapiSearchRecord('customrecordr7taskparameter', null, filters);
    
    var finalResults = new Array(); var alreadyIn = new Array();
    for (var i = 0; results1 != null && i < results1.length; i++) {
		if (alreadyIn[results1[i].getId()] == null) {
			finalResults[finalResults.length] = results1[i].getId();
			alreadyIn[results1[i].getId()]=1;
		}
    }
	return finalResults;
}

function obtainAllTaskParameterRecordsRunOnce(sessionIdentifier){
	nlapiLogExecution('DEBUG','Retrieving Run Once records','runOnce');
	
    //Return all non-expired task Parameter records
    var filters = new Array(
	new nlobjSearchFilter('isinactive',null,'is','F'),
	new nlobjSearchFilter('custrecordr7sessionidentifier',null,'notequalto',sessionIdentifier),
	new nlobjSearchFilter('custrecordr7taskautoexpirationdate', null, 'onorafter', nlapiDateToString(new Date())), 
	new nlobjSearchFilter('custrecordr7taskautoschedule', null, 'anyof', new Array('1')),
	new nlobjSearchFilter('custrecordr7runoncetaskprocessed', null, 'is','F')
	);
  
  	var results1 = new Array();
	results1 = nlapiSearchRecord('customrecordr7taskparameter', null, filters);
    
    var finalResults = new Array(); var alreadyIn = new Array();
    for (var i = 0; results1 != null && i < results1.length; i++) {
		if (alreadyIn[results1[i].getId()] == null) {
			finalResults[finalResults.length] = results1[i].getId();
			alreadyIn[results1[i].getId()]=1;
		}
    }
	return finalResults;
}


function getDayInString(){
	//Lookup https://663271.app.netsuite.com/app/common/custom/custlist.nl?id=254&e=T&ord=T
    var weekday = new Array(7);
    weekday[0] = "4"; //Sunday 
    weekday[1] = "5";
    weekday[2] = "6";
    weekday[3] = "7";
    weekday[4] = "8";
    weekday[5] = "9";
    weekday[6] = "10";
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

//To DO
function getBusinessDaysEquivalent(dueDateDays){
	var dueDateDaysInt = parseInt(dueDateDays);
	var date = new Date();
	var newDate = new Date();
	var initialDays =0;
	for(var i=0;i<dueDateDaysInt && initialDays < 20;i++){
		newDate = nlapiAddDays(newDate,1);
		if(newDate.getDay()==6||newDate.getDay()==0){
			dueDateDaysInt=dueDateDaysInt+1;
			initialDays +=1;
		}
		nlapiLogExecution('DEBUG','Due Date Now',dueDateDaysInt);
		nlapiLogExecution('DEBUG','Initial Days',initialDays);
	}
	nlapiLogExecution('DEBUG','Due Date Now',dueDateDaysInt);
	return dueDateDaysInt;
}

function lookupContactTitle(contactId){
	return nlapiLookupField('contact',contactId,'title');
}

function lookupContactPhones(contactId){
	/*
	var phoneFields=new Array('phone');
	var phoneText ="";
	var phoneValues = nlapiLookupField('contact',contactId,'phone');
	for(var v in phoneValues){
		if(v!=null && v!=''){
			phoneText = v +"|";
		}
	}
	return phoneText;
	*/
	return nlapiLookupField('contact',contactId,'phone');
}

function lookupContactTimeZone(contactId){
	return nlapiLookupField('contact',contactId,'custentityr7addresstimezone',true);
}
