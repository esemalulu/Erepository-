/*
 * @author efagone
 */
this.context = nlapiGetContext();

function processMaster(record){

	//find the tags
	var htmlContent = record.getFieldValue('custrecordr7emailassocmaster_content');
	var matches = findMatches(htmlContent);
	
	//replace matched tags
	htmlContent = replaceTagsWithContent(matches, htmlContent);
	
	//update tag parents
	var arrCurrentAssociatedTags = findCurrentAssociatedTags(record);
	createTagAssociations(record, matches, arrCurrentAssociatedTags);
	
	//update the file
	updateCampaignFile(record, htmlContent);
	
	nlapiSubmitField(record.getRecordType(), record.getId(), 'custrecordr7emailassocmasterpreview', htmlContent);
	
}

function createTagAssociations(record, matches, arrCurrentAssociatedTags){

	for (var i = 0; matches != null && i < matches.length; i++) {
		var match = matches[i];
		var eatId = match.substr(9, match.length - 10);
		var currentEatMasters = nlapiLookupField('customrecordr7emailassociationtags', eatId, 'custrecordr7emailassociationtagmasters');
		
		if (currentEatMasters != '' && currentEatMasters != null) {
		
			currentEatMasters = currentEatMasters.split(",");
			var foundMaster = false;
			
			for (var j = 0; currentEatMasters != null && j < currentEatMasters.length; j++) {
				var currentMaster = currentEatMasters[j];
				
				if (currentMaster == record.getId()) {
					foundMaster = true;
					break;
				}
			}
			
			if (!foundMaster) {
				currentEatMasters[currentEatMasters.length] = record.getId();
				nlapiSubmitField('customrecordr7emailassociationtags', eatId, 'custrecordr7emailassociationtagmasters', currentEatMasters);
			}
		}
		else {
			nlapiSubmitField('customrecordr7emailassociationtags', eatId, 'custrecordr7emailassociationtagmasters', record.getId());
		}
				
		//now remove from currentTags so we know which no longer apply
		for (var j = 0; arrCurrentAssociatedTags != null && j < arrCurrentAssociatedTags.length; j++) {
		
			var currentTag = arrCurrentAssociatedTags[j];
			
			if (currentTag == eatId) {
				arrCurrentAssociatedTags.splice(j, 1);
				break;
			}
			
		}
	}
	//now remove tags that are no longer associated
	removeOldTagAssociations(record, arrCurrentAssociatedTags);
	
}

function removeOldTagAssociations(record, arrCurrentAssociatedTags){

	for (var i = 0; arrCurrentAssociatedTags != null && i < arrCurrentAssociatedTags.length; i++) {
	
		var eatId = arrCurrentAssociatedTags[i];
		var currentEatMasters = nlapiLookupField('customrecordr7emailassociationtags', eatId, 'custrecordr7emailassociationtagmasters');
		
		if (currentEatMasters != '') {
			currentEatMasters = currentEatMasters.split(",");
		}
		
		for (var j = 0; currentEatMasters != null && j < currentEatMasters.length; j++) {
		
			var currentTag = currentEatMasters[j];
			
			if (currentTag == record.getId()) {
				nlapiLogExecution('DEBUG', 'Removing', currentTag);
				currentEatMasters.splice(j, 1);
			}
			
		}
		
		nlapiSubmitField('customrecordr7emailassociationtags', eatId, 'custrecordr7emailassociationtagmasters', currentEatMasters);
	}
		
}

function findCurrentAssociatedTags(record){

	var arrCurrentAssociatedTags = new Array();
	
	var arrSearchFilters = new Array();
	arrSearchFilters[0] = new nlobjSearchFilter('custrecordr7emailassociationtagmasters', null, 'anyof', record.getId());
	
	var arrSearchResults = nlapiSearchRecord('customrecordr7emailassociationtags', null, arrSearchFilters);
	
	for (var i=0; arrSearchResults != null && i < arrSearchResults.length; i++){
		
		var searchResult = arrSearchResults[i];
		var eatId = searchResult.getId();
		
		arrCurrentAssociatedTags[arrCurrentAssociatedTags.length] = eatId;
	}
	
	return arrCurrentAssociatedTags;
	
}

function updateCampaignFile(record, htmlContent){
	
	var masterFile = record.getFieldValue('custrecordr7emailassocmaste_file');
	
	if (masterFile != null && masterFile != '') {
			var objFile = nlapiLoadFile(masterFile);
			
			var newCampaignFile = nlapiCreateFile(objFile.getName(), 'HTMLDOC', htmlContent);
			newCampaignFile.setFolder(-5);
			newCampaignFile.setEncoding('UTF-8');
			nlapiSubmitFile(newCampaignFile);
			
			//also store copy in template folder
			var newTemplateFile = nlapiCreateFile(objFile.getName(), 'HTMLDOC', htmlContent);
			newTemplateFile.setFolder(-6);
			newTemplateFile.setEncoding('UTF-8');
			nlapiSubmitFile(newTemplateFile);
		}
		else {
			var newCampaignFile = nlapiCreateFile(record.getFieldValue('name') + '_' + record.getId() + '.html', 'HTMLDOC', htmlContent);
			newCampaignFile.setFolder(-5);
			newCampaignFile.setEncoding('UTF-8');
			var id = nlapiSubmitFile(newCampaignFile);
			nlapiSubmitField(record.getRecordType(), record.getId(), 'custrecordr7emailassocmaste_file', id);
			
			//also store copy in template folder
			var newTemplateFile = nlapiCreateFile(record.getFieldValue('name') + '_' + record.getId() + '.html', 'HTMLDOC', htmlContent);
			newTemplateFile.setFolder(-6);
			newTemplateFile.setEncoding('UTF-8');
			var id = nlapiSubmitFile(newTemplateFile);
		}	
}

function replaceTagsWithContent(matches, htmlContent){

	for (var i = 0; matches != null && i < matches.length; i++) {
		var match = matches[i];
		var eatId = match.substr(9, match.length - 10);
		
		var eatContent = nlapiLookupField('customrecordr7emailassociationtags', eatId, 'custrecordr7eathtmlcontent');
		var replaceRegex = new RegExp(match, 'g');
		
		htmlContent = htmlContent.replace(replaceRegex, eatContent);
	}
	
	return htmlContent;
	
}

function findMatches(htmlContent){

	var regex = /\{NLCUSEAT\d+\}/g;
	var matches = [];
	var match;
	
	while (match = regex.exec(htmlContent)) {
		matches.push(match[0]);
	}
	
	matches = unique(matches);
	
	return matches
}

function unique(a){
	a.sort();
	for (var i = 1; i < a.length;) {
		if (a[i - 1] == a[i]) {
			a.splice(i, 1);
		}
		else {
			i++;
		}
	}
	return a;
}

function queueUpMasterProcessing(arrMastersToUpdate){
	
	// Initialize an array to hold left over Master Record IDs after governance limit reached
	var mastersLeftToUpdate = new Array();
		
	for (var i = 0; arrMastersToUpdate != null && i < arrMastersToUpdate.length; i++) {
		
		// Each EAT process takes 92 units
		// If units left is greater than 100 then process
		if (eatUnitsLeft(100)){
			var masterId = arrMastersToUpdate[i];
			var recMaster = nlapiLoadRecord('customrecordr7emailassociationmaster', masterId);
			processMaster(recMaster);
		}
		// else put leftovers in array to schedule the rest
		else{
			
			mastersLeftToUpdate[mastersLeftToUpdate.length] = arrMastersToUpdate[i];
		}
	}
	return mastersLeftToUpdate;
}

// If mastersLeftToUpdate not empty then pass to Email_Association_Scheduled.js as param[custscriptr7emailassociationmastertemp] for processing
function scheduleRemainingMasters(mastersLeftToUpdate){
	if (mastersLeftToUpdate != null && mastersLeftToUpdate != '') {
		nlapiLogExecution('DEBUG', 'Ran out of units', 'yup');
		var params = new Array();
		params['custscriptr7emailassociationmastertemp'] = mastersLeftToUpdate.toString();
		nlapiLogExecution('DEBUG', 'mastersLeftToUpdate', params['custscriptr7emailassociationmastertemp']);
		
		var schedStatus = nlapiScheduleScript('customscriptr7emailassociationtagssched', 'customdeployr7emailassociationtagssched', params);
		if (schedStatus == 'QUEUED') {
			nlapiLogExecution('DEBUG', 'Additional Processing Scheduled?', 'Yup: '+schedStatus);
		}
		else {
			// If the script scheduling fails, send error email to alert
			nlapiLogExecution('DEBUG', 'Additional Processing Scheduled?', 'FAILED: ' + schedStatus);
			var subject = 'SCHEDULED PROCESS EATs RETURNED WITH STATUS: ' + schedStatus;
			var body = 'Remaining EAMs to Process: ' + params['custscriptr7emailassociationmastertemp'];
			nlapiSendEmail(340932, 340932, subject, body);//netsuite_admin@rapid7.com
		}
	}
}

function eatUnitsLeft(number){
	var unitsLeft = context.getRemainingUsage();
	if (unitsLeft <= number) {
		return false;
	}
	return true;
}