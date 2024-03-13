/*
 * Module Description
 * 
 * Version    Date            Author           Remarks
 * 1.00       23 May 2013     efagone
 *
 */

function doTheAutoMerge(){

	var timeLimitInMinutes = 20;
	this.timeLimitInMilliseconds = timeLimitInMinutes * 60 * 1000;
	this.startingTime = new Date().getTime();
	this.context = nlapiGetContext();
	this.rescheduleScript = false;
	
	this.objFreeMailDomainMap = grabFreemailDomainMap();
	this.objFullEmailMasters = grabFullEmailMasters();

	var auditLog = 'BEGIN SCRIPT\n\n';
	
	var objSearch = nlapiLoadSearch('customer', 14014);
	var resultSet = objSearch.runSearch();
	
	var rowNum = parseInt(context.getSetting('SCRIPT', 'custscriptr7_automergecus_startrow') || 0);
	nlapiLogExecution('AUDIT', 'STARTING ROW', rowNum);
	auditLog += '\nSTARTING ROW:' + rowNum + '\n\n';
	do {
		var resultSlice = resultSet.getResults(rowNum, rowNum + 1000);
		for (var rs in resultSlice) {
		
			if (!unitsLeft(150) || !timeLeft() || rescheduleScript) {
				break;
			}
			
			var columns = resultSlice[rs].getAllColumns();
			var domain = resultSlice[rs].getValue(columns[0]);
			var masterProspect = resultSlice[rs].getValue(columns[3]);
			var masterCustomer = resultSlice[rs].getValue(columns[4]);
			var masterAlways = resultSlice[rs].getValue(columns[5]);
			
			var MASTER_ACCOUNT = masterAlways || masterCustomer || masterProspect;
			var isFreeMail = (objFreeMailDomainMap.hasOwnProperty(domain)) ? true : false;
			
			var objLeadsToMerge = grabLikeDomainLeads(domain, MASTER_ACCOUNT, isFreeMail);
			
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
				
				if (isFreeMail && objFullEmailMasters.hasOwnProperty(mergeGroup)) {
					MASTER_ACCOUNT = objFullEmailMasters[mergeGroup];
				}
				
				nlapiLogExecution('DEBUG', 'arrLeardsToBeMerged.length', arrLeardsToBeMerged.length);
				nlapiLogExecution('DEBUG', 'MASTER_ACCOUNT', MASTER_ACCOUNT);
				nlapiLogExecution('DEBUG', 'isFreeMail', isFreeMail);
				
				var arrNextIdsToMerge = null;
				var processed = false;
				while (arrLeardsToBeMerged.length > 1 || (arrLeardsToBeMerged.length > 0 && MASTER_ACCOUNT != null && MASTER_ACCOUNT != '') || (arrLeardsToBeMerged.length == 1 && isFreeMail)) {
					
					if (!unitsLeft(130) || rescheduleScript) {
						break;
					}
					
					processed = true;
					arrNextIdsToMerge = arrLeardsToBeMerged.splice(0, 200); // 200 is the max job size for merging
					// Get a job manager instance.
					var manager = nlapiGetJobManager('DUPLICATERECORDS');
					
					// Create the merge job object.
					var mergeJobRequest = manager.createJobRequest();
					mergeJobRequest.setEntityType(mergeJobRequest.ENTITY_CUSTOMER);
					
					if (arrNextIdsToMerge.length == 1 && isFreeMail) {
						nlapiLogExecution('DEBUG', 'Marking not dupe', 'Group: ' + mergeGroup + '\nCount: ' + arrNextIdsToMerge.length);
						auditLog += 'marking not as dupe: ';
						mergeJobRequest.setRecords(arrNextIdsToMerge);
						mergeJobRequest.setOperation(mergeJobRequest.OPERATION_MARK_AS_NOT_DUPES);
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
				
				if (!processed){
					auditLog += 'Did not meet merge criteria';
				}
			}
			
			rowNum++;
		}
	}
	while (resultSlice.length >= 1000 && !rescheduleScript);
	
	auditLog += '\ENDING ROW:' + rowNum + '\n\n';
	auditLog += '\n\nEND SCRIPT';

	nlapiLogExecution('AUDIT', 'ENDING ROW', rowNum);
	nlapiLogExecution('AUDIT', 'Script Audit Log', auditLog);
	var adminUser =  nlapiLoadConfiguration('companypreferences').getFieldValue('custscriptr7_system_info_email_sender');
	nlapiSendEmail(adminUser, adminUser, 'Automerge Audit Log', auditLog);
	
	//Chain to yourself if there are results left to process.
	if (rescheduleScript) {
		var params = [];
		params['custscriptr7_automergecus_startrow'] = rowNum;

		nlapiLogExecution('DEBUG', 'Attempting to Chain to', 'itself');
		nlapiScheduleScript(context.getScriptId(), context.getDeploymentId(), params);
	}
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
		
		var savedsearch = nlapiLoadSearch('customer', 14014);
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
	
	var objFullEmailMasters = {};
	
	var objSearch = nlapiLoadSearch('customer', 15920);
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
			
			objFullEmailMasters[email] = MASTER_ACCOUNT; // add to map
			rowNum++;
		}
	}
	while (resultSlice.length >= 1000);
	
	nlapiLogExecution('AUDIT', 'Time (in seconds) To Run grabFullEmailMasters()', (new Date().getTime() - processbeginTime.getTime()) / 1000);
	
	return objFullEmailMasters;
	
}

function grabFreemailDomainMap(){
	
	var processbeginTime = new Date();
	nlapiLogExecution('DEBUG', 'Running grabFreemailDomainMap()', processbeginTime);
		
	var objFreeMailDomainMap = {};
	
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
			objFreeMailDomainMap[domain] = true; // add to map
			rowNum++;
		}
	}
	while (resultSlice.length >= 1000);
	
	nlapiLogExecution('AUDIT', 'Time (in seconds) To Run grabFreemailDomainMap()', (new Date().getTime() - processbeginTime.getTime()) / 1000);
	
	return objFreeMailDomainMap;
}

function timeLeft(){
	
	if (rescheduleScript){
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

function unitsLeft(num){
	
	if (rescheduleScript){
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
