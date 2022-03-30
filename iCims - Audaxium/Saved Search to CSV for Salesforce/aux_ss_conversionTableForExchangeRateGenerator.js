
var paramFileId = nlapiGetContext().getSetting('SCRIPT', 'custscript_sf_fileid');
var paramSavedSearchId = nlapiGetContext().getSetting('SCRIPT','custscript_sf_ssid');

function genCsvFromSavedSearch() {
	
	try {

		//make sure file id is passed in
		if (!paramFileId) {
			throw nlapiCreateError('SFCSVERR', 'ID of File in Files for Sales Force MUST be provided', false);
		}
		
		//make sure saved search id is passed in
		if (!paramSavedSearchId) {
			throw nlapiCreateError('SFCSVERR', 'Saved Search must be selected', false);
		}
		
		
		//load the file to replace out the content and save back
		var csvFileRec = nlapiLoadFile(paramFileId);
		
		//execute saved search 
		var rs = nlapiSearchRecord(null, paramSavedSearchId);
		if (!rs) {
			throw nlapiCreateError('SFCSVERR', 'Saved Search returned no results. CSV file is not updated', false);
		}
		
		//Assume columns being returned is all the same.
		var csvHeader = 'Internal ID,Base Currency,Transaction Currency,Exchange Rate,Effective Date\n';
		var csvBody = '';
		
		for (var i=0; i < rs.length; i++) {
			//internalid
			//basecurrency
			//transactioncurrency
			//exchangerate
			//effectivedate
			csvBody += '"'+rs[i].getId()+'",'+
					   '"'+rs[i].getValue('basecurrency')+'",'+
					   '"'+rs[i].getValue('transactioncurrency')+'",'+
					   '"'+rs[i].getValue('exchangerate')+'",'+
					   '"'+rs[i].getValue('effectivedate')+'"\n';
		}
		
		log('debug','file name',csvFileRec.getName());
		log('debug','folder', csvFileRec.getFolder());
		
		var replacementFile = nlapiCreateFile(csvFileRec.getName(), 'CSV', csvHeader+csvBody);
		replacementFile.setFolder(csvFileRec.getFolder());
		replacementFile.setIsOnline(true);
		nlapiSubmitFile(replacementFile);
		
	} catch (sfcsverr) {
		
		log('error','SalesForce CSV Gen Error', getErrText(sfcsverr));
		throw nlapiCreateError('SFCSVERR','Error Generating Exchange Rate CSV. File was NOT updated: '+getErrText(sfcsverr), false);
	}
	
}
