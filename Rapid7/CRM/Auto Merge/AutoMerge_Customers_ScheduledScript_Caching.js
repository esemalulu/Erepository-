/*
 * Module Description
 * 
 * Version    Date            Author           Remarks
 * 1.00       23 May 2013     efagone
 *
 */

var objMergeData = {};
var auditLog = '';

function doTheAutoMerge(){

	var timeLimitInMinutes = 20;
	this.timeLimitInMilliseconds = timeLimitInMinutes * 60 * 1000;
	this.startingTime = new Date().getTime();
	this.context = nlapiGetContext();
	this.rescheduleScript = false;
	
	var existingDataFileId = context.getSetting('SCRIPT', 'custscriptr7_automergecus_existdatafilid');
	
	if (existingDataFileId != null && existingDataFileId != '') {
		nlapiLogExecution('AUDIT', 'Using existing data', existingDataFileId);
		var objFile = nlapiLoadFile(existingDataFileId);
		objMergeData = JSON.parse(objFile.getValue());
		nlapiDeleteFile(existingDataFileId);
	}
	else {
		objMergeData.objFreeMailDomainMap = grabFreemailDomainMap();
		objMergeData.objFullEmailMasters = grabFullEmailMasters();
		objMergeData.results = grabCustomerSearchResults();
		objMergeData.totalResults = (objMergeData.results) ? objMergeData.results.length : 0
	}
	
	var numProcessed = 0;
	var totalRowsRemaining = (objMergeData.results) ? objMergeData.results.length : 0;
	
	nlapiLogExecution('AUDIT', 'totalRowsRemaining', totalRowsRemaining);
	
	auditLog += 'BEGIN SCRIPT\n\n';
	auditLog += '\n\nTOTAL ROWS:' + totalRowsRemaining + '\n\n';
	
	var arrIdsToMarkNotDupe = [];
	
	while (objMergeData.results && objMergeData.results.length > 0 && unitsLeft(150) && timeLeft()) {
		
		context.setPercentComplete(Math.round(((objMergeData.totalResults - totalRowsRemaining - objMergeData.results.length)/objMergeData.totalResults)*100));
		if (rescheduleScript) {
			break;
		}
		
		var objResult = objMergeData.results[0];
		objMergeData.results.splice(0, 1); // delete it out as processed
		var MASTER_ACCOUNT = objResult.masterAlways || objResult.masterCustomer || objResult.masterProspect;
		var isFreeMail = (objMergeData.objFreeMailDomainMap.hasOwnProperty(objResult.domain)) ? true : false;
		
		var objLeadsToMerge = grabLikeDomainLeads(objResult.domain, MASTER_ACCOUNT, isFreeMail);
		
		if (isFreeMail) {
			MASTER_ACCOUNT = null;
		}
		for (var mergeGroup in objLeadsToMerge) {
		
			if (rescheduleScript) {
				break;
			}
			
			nlapiLogExecution('DEBUG', 'Processing Merge Group', mergeGroup);
			auditLog += '\n' + mergeGroup + ': ';
			var arrLeardsToBeMerged = objLeadsToMerge[mergeGroup];
			if (arrLeardsToBeMerged == null) {
				nlapiLogExecution('AUDIT', 'no merge group results', 'nope!');
				continue;
			}
			
			if (isFreeMail && objMergeData.objFullEmailMasters.hasOwnProperty(mergeGroup)) {
				MASTER_ACCOUNT = objMergeData.objFullEmailMasters[mergeGroup];
			}
			
			nlapiLogExecution('DEBUG', 'arrLeardsToBeMerged.length', arrLeardsToBeMerged.length);
			nlapiLogExecution('DEBUG', 'MASTER_ACCOUNT', MASTER_ACCOUNT);
			nlapiLogExecution('DEBUG', 'isFreeMail', isFreeMail);

			var processed = false;
			while (arrLeardsToBeMerged.length > 1 || (arrLeardsToBeMerged.length > 0 && MASTER_ACCOUNT != null && MASTER_ACCOUNT != '') || (arrLeardsToBeMerged.length == 1 && isFreeMail)) {

				var additionalUnitsNeeded = Math.ceil((arrIdsToMarkNotDupe.length/2)/100)*100;
				
				processed = true;
				
				if (!unitsLeft(150 + additionalUnitsNeeded) || rescheduleScript) {
					auditLog += 'ran out of units';
					break;
				}
						
				var arrNextIdsToMerge = arrLeardsToBeMerged.splice(0, 200); // 200 is the max job size for merging
				// Get a job manager instance.
				var manager = nlapiGetJobManager('DUPLICATERECORDS');
				
				// Create the merge job object.
				var mergeJobRequest = manager.createJobRequest();
				mergeJobRequest.setEntityType(mergeJobRequest.ENTITY_CUSTOMER);
				
				if (arrNextIdsToMerge.length == 1 && isFreeMail) {
					auditLog += 'queuing as not dupe';
					arrIdsToMarkNotDupe.push(arrNextIdsToMerge[0]);
					continue;
				}
				else {
					nlapiLogExecution('DEBUG', 'Merging', 'Group: ' + mergeGroup + '\nCount: ' + arrNextIdsToMerge.length + '\nMaster: ' + MASTER_ACCOUNT);
					
					if (MASTER_ACCOUNT != null && MASTER_ACCOUNT != '') {
						auditLog += 'merging ' + arrNextIdsToMerge.length + ' accounts into ' + MASTER_ACCOUNT + ': ';
						mergeJobRequest.setMasterSelectionMode(mergeJobRequest.MASTERSELECTIONMODE_SELECT_BY_ID);
						mergeJobRequest.setMasterId(MASTER_ACCOUNT);
					}
					else {
						auditLog += 'merging ' + arrNextIdsToMerge.length + ' accounts into created earliest: ';
						mergeJobRequest.setMasterSelectionMode(mergeJobRequest.MASTERSELECTIONMODE_CREATED_EARLIEST);
					}
					mergeJobRequest.setRecords(arrNextIdsToMerge);
					mergeJobRequest.setOperation(mergeJobRequest.OPERATION_MERGE);
				}
				
				try {
					var jobId = manager.submit(mergeJobRequest);
					auditLog += 'SUCCESS';
					// Check the job status
					var future = manager.getFuture(jobId);
					nlapiLogExecution('DEBUG', 'Job Status For: ' + jobId, future.isDone());
				} 
				catch (e) {
					try {
						auditLog += 'FAILED (' + e.getDetails() + ')';
					} 
					catch (err) {
						auditLog += 'FAILED (' + err + ')'; // some reason getDetails sometimes wasnt working
					}
					nlapiLogExecution('ERROR', 'Could not submit batch', e);
				}
			}
			
			if (!processed) {
				auditLog += 'Did not meet merge criteria';
			}
		}
		
		numProcessed++;
	}
	
	//MARK AS NOT DUPES
	markIDsNotDupes(arrIdsToMarkNotDupe);

	auditLog += '\n\nRESULTS PROCESSED:' + numProcessed + '\nRESCHEDULING: ' + rescheduleScript + '\n\n';
	auditLog += '\n\nEND SCRIPT';
	
	nlapiLogExecution('DEBUG', 'Script Audit Log', auditLog);
	//nlapiSendEmail(55011, 55011, 'Automerge Audit Log', auditLog);
	
	//Chain to yourself if there are results left to process.
	if (rescheduleScript) {
	
		var dtNow = new Date();
		var yy = dtNow.getFullYear();
		var mm = dRound(dtNow.getMonth() + 1);
		var dd = dRound(dtNow.getDate());
		var hh = dRound(dtNow.getHours());
		var mi = dRound(dtNow.getMinutes());
		var ss = dRound(dtNow.getSeconds());
		var timestamp = yy + '' + mm + '' + dd + '_' + hh + '' + mi + '' + ss;

		var fileObj = nlapiCreateFile(timestamp + '.txt', 'PLAINTEXT', JSON.stringify(objMergeData));
		fileObj.setFolder(2412471);
		var fileId = nlapiSubmitFile(fileObj)
		
		var params = [];
		params['custscriptr7_automergecus_existdatafilid'] = fileId;
		
		nlapiLogExecution('DEBUG', 'Attempting to Chain to', 'itself');
		nlapiScheduleScript(context.getScriptId(), context.getDeploymentId(), params);
		return;
	} 
	
	nlapiLogExecution('AUDIT', 'FINISHED PROCESSING ALL RESULTS', 'DONE');
}

function markIDsNotDupes(arrCustomerIds){

	while (arrCustomerIds.length > 0) {
	
		if (!unitsLeft(130, true)) {
			break;
		}

		var arrNextIdsToMerge = arrCustomerIds.splice(0, 200); // 200 is the max job size for merging
		auditLog += '\nmarking ' + arrNextIdsToMerge.length + ' as not dupe: ';
		
		// Get a job manager instance.
		var manager = nlapiGetJobManager('DUPLICATERECORDS');
		
		// Create the merge job object.
		var mergeJobRequest = manager.createJobRequest();
		mergeJobRequest.setEntityType(mergeJobRequest.ENTITY_CUSTOMER);
		
		mergeJobRequest.setRecords(arrNextIdsToMerge);
		mergeJobRequest.setOperation(mergeJobRequest.OPERATION_MARK_AS_NOT_DUPES);
		
		try {
			var jobId = manager.submit(mergeJobRequest);
			// Check the job status
			var future = manager.getFuture(jobId);
			nlapiLogExecution('DEBUG', 'Job Status For: ' + jobId, future.isDone());
			auditLog += 'SUCCESS'
		} 
		catch (e) {
			nlapiLogExecution('ERROR', 'Could not submit batch', e);
			try {
				auditLog += 'FAILED (' + e.getDetails() + ')';
			} 
			catch (err) {
				auditLog += 'FAILED (' + err + ')'; // some reason getDetails sometimes wasnt working
			}
		}
	}
}


function grabCustomerSearchResults(){

	var processbeginTime = new Date();
	nlapiLogExecution('DEBUG', 'Running grabCustomerSearchResults()', processbeginTime);

	var arrCusResults = [];
	
	var objSearch = nlapiLoadSearch('customer', 22261);
	var resultSet = objSearch.runSearch();
	
	var rowNum = 0;
	
	do {
		var resultSlice = resultSet.getResults(rowNum, rowNum + 1000);
		for (var rs in resultSlice) {
		
			if (!unitsLeft(50)) {
				break;
			}
			
			var columns = resultSlice[rs].getAllColumns();
			
			arrCusResults.push({
				domain: resultSlice[rs].getValue(columns[0]),
				masterProspect: resultSlice[rs].getValue(columns[3]),
				masterCustomer: resultSlice[rs].getValue(columns[4]),
				masterAlways: resultSlice[rs].getValue(columns[5])
			});
			
			rowNum++;
		}
	}
	while (resultSlice.length >= 1000 && !rescheduleScript);
	
	nlapiLogExecution('AUDIT', 'Time (in seconds) To Run grabCustomerSearchResults()', (new Date().getTime() - processbeginTime.getTime()) / 1000);
	
	return arrCusResults;
}

function grabLikeDomainLeads(domain, MASTER_ACCOUNT, isFreeMail){
	
	var processbeginTime = new Date();
	nlapiLogExecution('DEBUG', 'Running grabLikeDomainLeads()', domain);
	
	var objLeadsGroups = {};
	
	if (domain != null && domain != '') {
	
		var arrFilters = [];
		arrFilters[0] = new nlobjSearchFilter('formulatext', null, 'is', domain);
		arrFilters[0].setFormula("SUBSTR({email}, INSTR({email}, '@'))");
		arrFilters[1] = new nlobjSearchFilter('stage', null, 'is', 'LEAD');
		
		var arrColumns = [];
		arrColumns[0] = new nlobjSearchColumn('email').setSort(true);
		arrColumns[1] = new nlobjSearchColumn('formulatext');
		arrColumns[1].setFormula("LOWER(SUBSTR({email}, INSTR({email}, '@')))");
		
		var savedsearch = nlapiLoadSearch('customer', 22261);
		var existingFilters = savedsearch.getFilters();
		for (var i = 0; existingFilters != null && i < existingFilters.length; i++) {
			if (existingFilters[i].getSummaryType() != null) {
				continue;
			}
			arrFilters.push(existingFilters[i]);
		}
		
		var newSearch = nlapiCreateSearch('customer');
		newSearch.setFilters(arrFilters);
		newSearch.setColumns(arrColumns);
		var resultSet = newSearch.runSearch();
		
		var rowNum = 0;
		do {
			var resultSlice = resultSet.getResults(rowNum, rowNum + 1000);
			for (var rs in resultSlice) {
				var currentEmail = resultSlice[rs].getValue(arrColumns[0]);
				var currentDomain = resultSlice[rs].getValue(arrColumns[1]);
				var id = resultSlice[rs].getId();
				if (MASTER_ACCOUNT == id) {
					//continue on.. we are not merging the master
					continue;
				}
				
				var grouping = currentDomain;
				if (isFreeMail) {
					grouping = currentEmail;
				}
				
				if (!objLeadsGroups.hasOwnProperty(grouping)) {
					objLeadsGroups[grouping] = [];
				}
				
				objLeadsGroups[grouping].push(id);
				rowNum++;
			}
		}
		while (resultSlice.length >= 1000 && rowNum < 6000);
	}
	
	nlapiLogExecution('DEBUG', 'Time (in seconds) To Run grabLikeDomainLeads()', (new Date().getTime() - processbeginTime.getTime()) / 1000);
	
	return objLeadsGroups;
	
}

function grabFullEmailMasters(){
	
	var processbeginTime = new Date();
	nlapiLogExecution('DEBUG', 'Running grabFullEmailMasters()', processbeginTime);
	
	var objDetails = {};
	
	var objSearch = nlapiLoadSearch('customer', 22260);
	var resultSet = objSearch.runSearch();
	
	var rowNum = 0;
	do {
		var resultSlice = resultSet.getResults(rowNum, rowNum + 1000);
		for (var rs in resultSlice) {
			var columns = resultSlice[rs].getAllColumns();
			var email = resultSlice[rs].getValue(columns[0]);
			var masterProspect = resultSlice[rs].getValue(columns[3]);
			var masterCustomer = resultSlice[rs].getValue(columns[4]);
			var masterAlways = resultSlice[rs].getValue(columns[5]);
			
			var MASTER_ACCOUNT = masterAlways || masterCustomer || masterProspect;
			
			objDetails[email] = MASTER_ACCOUNT; // add to map
			rowNum++;
		}
	}
	while (resultSlice.length >= 1000);
	
	nlapiLogExecution('AUDIT', 'Time (in seconds) To Run grabFullEmailMasters()', (new Date().getTime() - processbeginTime.getTime()) / 1000);
	
	return objDetails;
	
}

function grabFreemailDomainMap(){
	
	var processbeginTime = new Date();
	nlapiLogExecution('DEBUG', 'Running grabFreemailDomainMap()', processbeginTime);
		
	var objDetails = {};
	
	var arrFilters = [];
	arrFilters[0] = new nlobjSearchFilter('isinactive', null, 'is', 'F');
	
	var arrColumns = [];
	arrColumns[0] = new nlobjSearchColumn('name').setSort(true);
	
	var newSearch = nlapiCreateSearch('customrecordr7domainnames');
	newSearch.setFilters(arrFilters);
	newSearch.setColumns(arrColumns);
	var resultSet = newSearch.runSearch();
	
	var rowNum = 0;
	do {
		var resultSlice = resultSet.getResults(rowNum, rowNum + 1000);
		for (var rs in resultSlice) {
			var domain = resultSlice[rs].getValue(arrColumns[0]);
			if (domain == null || domain == ''){
				continue;
			}
			domain = '@' + domain.toLowerCase();
			objDetails[domain] = true; // add to map
			rowNum++;
		}
	}
	while (resultSlice.length >= 1000);
	
	nlapiLogExecution('AUDIT', 'Time (in seconds) To Run grabFreemailDomainMap()', (new Date().getTime() - processbeginTime.getTime()) / 1000);
	
	return objDetails;
}

function timeLeft(ignoreRescheduleCheck){
	
	if (!ignoreRescheduleCheck && rescheduleScript){
		return false;
	}
	
	var presentTime = new Date().getTime();
	if (presentTime - startingTime > timeLimitInMilliseconds) {
		nlapiLogExecution('AUDIT', 'Ran out of time', 'yup');
		rescheduleScript = true;
		return false;
	}
	return true;
}

function unitsLeft(num, ignoreRescheduleCheck){
	
	if (!ignoreRescheduleCheck && rescheduleScript){
		return false;
	}
	
	if (!num){
		num = 100;
	}
	var unitsLeft = context.getRemainingUsage();
	if (unitsLeft <= num) {
		nlapiLogExecution('AUDIT', 'Ran out of units', 'yup');
		rescheduleScript = true;
		return false;
	}
	return true;
}

function dRound(value){
	value = value + '';
	if (value.length == 1) {
		value = '0' + value;
	}
	return value;
}
