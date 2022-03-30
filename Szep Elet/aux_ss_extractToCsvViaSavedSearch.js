

function extractDataToCsv() {

	var paramHeaderSavedSearch = nlapiGetContext().getSetting('SCRIPT','custscript_29_headerssid');
	var paramLineSavedSearch = nlapiGetContext().getSetting('SCRIPT','custscript_29_linessid');
	var paramLastProcId = nlapiGetContext().getSetting('SCRIPT', 'custscript_29_lastid');
	var paramFolderId = nlapiGetContext().getSetting('SCRIPT', 'custscript_29_folderid');
	
	if (!paramHeaderSavedSearch || !paramLineSavedSearch) {
		throw nlapiCreateError('EXT-ERR', 'Requires both Header and Line level Saved Search that orders results in Internal ID DESC', false);
	}
	
	//Using load search
	var headerflt = null;
	if (paramLastProcId) {
		headerflt = [];
		headerflt.push(new nlobjSearchFilter('internalidnumber', null, 'lessthan', paramLastProcId));
	}
	
	//Loop through each header level search result. 
	var ssrs = nlapiSearchRecord(null, paramHeaderSavedSearch, headerflt, null);
	
	var csvHeader = '';
	var csvBody = '';
	
	var LastProcId = '';
	
	for (var i=0; ssrs && i < ssrs.length; i += 1) 
	{
		var procTrxId = ssrs[i].getValue('internalid');
		
		//Execute Line Saved Search for THIS record ONLY
		var lineflt = [new nlobjSearchFilter('internalid', null, 'anyof', procTrxId)];
		var liners = nlapiSearchRecord(null, paramLineSavedSearch, lineflt, null);
		var allcols = null;
		//Check to make sure we have result before processing next step
		if (liners && liners.length > 0) 
		{
			//set all column objects
			allcols = liners[0].getAllColumns();
			
			//Build out the csvHeader values
			if (!csvHeader) {
				for (var c=0; c < allcols.length; c+=1) 
				{
					csvHeader += '"'+allcols[c].getLabel()+'",';
				}
				//Once it's done, remove last comman and replace it with \n 
				csvHeader = csvHeader.substring(0, (csvHeader.length -1));
				csvHeader += '\n';				
			}
						
			//Run the Loop to build out the results for each Line for THIS transaction
			for (var l=0; l < liners.length; l += 1) 
			{
				//Loop through ALL columns and add to csvBody
				for (var lc=0; lc < allcols.length; lc+=1)
				{
					var rsValue = liners[l].getText(allcols[lc]);
					if (!rsValue) {
						rsValue = liners[l].getValue(allcols[lc]);
					}
					
					csvBody += '"'+rsValue+'",';
				}
				csvBody = csvBody.substring(0, (csvBody.length -1));
				csvBody += '\n'; 
			}
		}
		
		//---- Reschedule checked ---
		//Set % completed of script processing
		var pctCompleted = Math.round(((i+1) / ssrs.length) * 100);
		nlapiGetContext().setPercentComplete(pctCompleted);
	
		LastProcId = procTrxId;
		
		if ((i+1)==1000 || (i+1) < ssrs.length && nlapiGetContext().getRemainingUsage() < 500) 
		{
			
			//reschedule
			log('debug','Getting Rescheduled at', procTrxId);
			var rparam = new Object();
			rparam['custscript_29_lastid'] = procTrxId;
			nlapiScheduleScript(nlapiGetContext().getScriptId(), nlapiGetContext().getDeploymentId(), rparam);
			break;
		}
	}
	
	log('debug','Out of Loop. Last Proc ID',LastProcId);
	
	//Save the file
	if (csvBody) 
	{
		var currDateTime = (new Date()).getTime();
		var fileName = 'CashSaleLineExport-'+currDateTime+'.csv';
		
		var csvFile = nlapiCreateFile(fileName, 'CSV', csvHeader+csvBody);
		csvFile.setFolder(paramFolderId);
		
		var fileId = nlapiSubmitFile(csvFile);
		
		log('debug','File Created and Saved', 'file id: '+fileId);
	}
}