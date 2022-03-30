

function extractDataToCsv() {

	var paramSavedSearch = nlapiGetContext().getSetting('SCRIPT','custscript_71_ssid');
	var paramLastProcId = nlapiGetContext().getSetting('SCRIPT', 'custscript_71_lastid');
	var paramFolderId = nlapiGetContext().getSetting('SCRIPT', 'custscript_71_folderid');
	var paramFileName = nlapiGetContext().getSetting('SCRIPT', 'custscript_71_filename');
	
	//Using load search
	var msgflt = null;
	if (paramLastProcId) {
		msgflt = [];
		msgflt.push(new nlobjSearchFilter('internalidnumber', null, 'lessthan', paramLastProcId));
	}
	
	//Loop through each header level search result. 
	var ssrs = nlapiSearchRecord(null, paramSavedSearch, msgflt, null);
	
	var csvHeader = '';
	var csvBody = '';
	
	if (ssrs && ssrs.length > 0)
	{
		var allcols = ssrs[0].getAllColumns();
		
		//Build out the csvHeader values
		for (var c=0; c < allcols.length; c+=1) 
		{
			csvHeader += '"'+allcols[c].getLabel()+'",';
		}
		//Once it's done, remove last comman and replace it with \n 
		csvHeader = csvHeader.substring(0, (csvHeader.length -1));
		csvHeader += '\n';	
		
		//Run the Loop to build out the results for each Line for THIS transaction
		for (var l=0; l < ssrs.length; l += 1) 
		{
			//Loop through ALL columns and add to csvBody
			for (var lc=0; lc < allcols.length; lc+=1)
			{
				var rsValue = ssrs[l].getText(allcols[lc]);
				if (!rsValue) {
					rsValue = ssrs[l].getValue(allcols[lc]);
				}
				//log('debug','column',allcols[lc].label);
				if (allcols[lc].getLabel() == 'Message')
				{
					//var xmlVersion = nlapiStringToXML(rsValue);
					//rsValue = nlapiXMLToString(xmlVersion);
					//take the returns OUT
					//log('debug','test xml conversion',rsValue);
					
					rsValue = strGlobalReplace(rsValue, "\r", "<br>");
					rsValue = strGlobalReplace(rsValue,"\n", "<br>");
					rsValue = strGlobalReplace(rsValue,"\"", "[DQ]");
					rsValue = strGlobalReplace(rsValue,",","[CM]");
				}
				
				csvBody += '"'+rsValue+'",';
			}
			csvBody = csvBody.substring(0, (csvBody.length -1));
			csvBody += '\n'; 
			
			//---- Reschedule checked ---
			//Set % completed of script processing
			var pctCompleted = Math.round(((l+1) / ssrs.length) * 100);
			nlapiGetContext().setPercentComplete(pctCompleted);
			
			if ((l+1)==500 || (l+1) < ssrs.length && nlapiGetContext().getRemainingUsage() < 50) 
			{
				log('audit','Getting Rescheduled at', ssrs[l].getId());
				//reschedule
				var rparam = new Object();
				rparam['custscript_71_lastid'] = ssrs[l].getId();
				//nlapiScheduleScript(nlapiGetContext().getScriptId(), nlapiGetContext().getDeploymentId(), rparam);
				break;
			}
		}
	} //OUt of check to see if ssrs is empty
	
	//Save the file
	if (csvBody) 
	{
		var currDateTime = (new Date()).getTime();
		var fileName = currDateTime+'_'+paramFileName;
		
		var csvFile = nlapiCreateFile(fileName, 'CSV', csvHeader+csvBody);
		csvFile.setFolder(paramFolderId);
		
		var fileId = nlapiSubmitFile(csvFile);
		
		log('debug','File Created and Saved', 'file id: '+fileId);
	}
}