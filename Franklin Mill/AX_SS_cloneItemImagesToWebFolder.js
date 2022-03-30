/**
 * Module Description
 * 
 * Version    Date            Author           Remarks
 * 1.00       04 Jun 2014     AnJoe
 *
 */

/**
 * @param {String} type Context Types: scheduled, ondemand, userinterface, aborted, skipped
 * @returns {Void}
 */


var paramLastProcId = nlapiGetContext().getSetting('SCRIPT', 'custscript_ax79_lastprocitemid');
var paramExportFileId = nlapiGetContext().getSetting('SCRIPT','custscript_ax79_csvfileid');
var paramWebFolderId = nlapiGetContext().getSetting('SCRIPT', 'custscript_ax79_webfolderid');
var paramSavedSearchId = nlapiGetContext().getSetting('SCRIPT','custscript_ax79_itemssid');
var paramCsvOutputFolderId = nlapiGetContext().getSetting('SCRIPT','custscript_ax79_csvfolderid');
var paramUrlPrefix = nlapiGetContext().getSetting('SCRIPT','custscript_ax79_urlprefix');
var paramCsvFilename = nlapiGetContext().getSetting('SCRIPT','custscript_ax79_csvfilename');
var paramSendCsvToEmails = nlapiGetContext().getSetting('SCRIPT', 'custscript_ax79_sendcsvto');

function syncItemImagesToWebFolderAndGrabUrl(type) {

	try {
		var isRescheduled = false;
		var expFileRec = null;
		//if exportFileId is passed in, this means it needs to continue appending data since it was rescheduled.
		if (paramExportFileId) {
			expFileRec = nlapiLoadFile(paramExportFileId);
		}
		
		var folderName = nlapiLoadRecord('folder',paramWebFolderId).getFieldValue('name');
		
		//Saved Search MUST be ordered by Internal ID in DESC order		
		var sflt = null;
		if (paramLastProcId) {
			sflt = new Array();
			sflt.push(new nlobjSearchFilter('internalidnumber', null, 'lessthan',paramLastProcId));
		}
		
		//Columns
		//Assumes Saved Search Returns BELOW fields Ordered by Internal ID in DESC order
		//Mod 6/17/2014 - Dynamically create CSV based on Saved Searches Column Definition.
		//		- IMPORTANT NOTE:
		//			Script ASSUMES Last 3 columns are ALWAYS a pointer to IMAGE
		
		var srs = nlapiSearchRecord(null, paramSavedSearchId, sflt, null);
		
		var csvHeader = '';
		var csvBody = '';

		var coljson = {};
		if (srs && srs.length > 0) {
			//grab all columns from first result returned.
			var scols = srs[0].getAllColumns();
			//identify first image column index starting point
			//Assumes Last 3 columns contain reference to image file
			var firstImageColIndex = scols.length - 3;
			//loop through and build CSV Header as well as coljson
			for (var c=0; c < scols.length; c++) {	
				
				//build out csvHeader text for each column.
				//If Label is null, use column ID
				var headerText = (scols[c].getLabel()?scols[c].getLabel():scols[c].getName());
				csvHeader += '"'+headerText+'",';
				
				coljson[c]={
					'colobj':scols[c],
					'isimage':((c >= firstImageColIndex)?true:false)
				};
			}
		}
		
		csvHeader = csvHeader.substring(0, csvHeader.length-1)+'\n';
		
		//if we have expFileRec, set csvBody to value of loaded expFileRec and continue appending
		if (expFileRec) {
			csvBody = expFileRec.getValue();
		}
		
		//Loop through each result returned from search
		for (var i=0; srs && i < srs.length;	 i++) {
			var lineCsvBody = '';
			//Loop through each coljson object and build csvBody per result
			for (var cj in coljson) {
				
				if (!coljson[cj].isimage) {
					lineCsvBody += '"'+srs[i].getValue(coljson[cj].colobj)+'",';
				} else {
					//Prepare Image URL if applicable
					var thumbImageFileId = srs[i].getValue(coljson[cj].colobj);
					var thumbImageUrl = '';
					
					//clone the image to webhosting folder and generate URL ONLY if file id is there
					if (thumbImageFileId) {
						try {
							var itemfile = nlapiLoadFile(thumbImageFileId);
							var clone = nlapiCreateFile(itemfile.getName(), itemfile.getType(), itemfile.getValue());
							clone.setFolder(paramWebFolderId);
							clone.setIsOnline(true);
							nlapiSubmitFile(clone);
							thumbImageUrl = paramUrlPrefix+folderName+'/'+itemfile.getName();
						} catch (cloneerr) {
							thumbImageUrl = 'ERROR GENERATING URL:'+getErrText(cloneerr);
							log('error','Error Generating URL', getErrText(cloneerr));
						}						
					}
					lineCsvBody += '"'+thumbImageUrl+'",';
				}				
			}
			lineCsvBody = lineCsvBody.substring(0, lineCsvBody.length-1)+'\n';
			
			csvBody += lineCsvBody;
			
			if ( (srs.length == 1000 && (i+1)==1000) || (nlapiGetContext().getRemainingUsage() <= 100 && (i+1) < srs.length) ) {
				
				var newFileId = '';
				var newFileRec = null;
				//At this point, Save the file 
				if (expFileRec) {
					//if export file was saved before, set value to csvBody only
					newFileRec = nlapiCreateFile(expFileRec.getName(), 'CSV', csvBody);
				} else {
					//if export file doesn't exist. set body as csvHeader + csvBody
					newFileRec = nlapiCreateFile(paramCsvFilename, 'CSV', csvHeader+csvBody);
				}
				newFileRec.setFolder(paramCsvOutputFolderId);
				newFileId = nlapiSubmitFile(newFileRec);
				
				log('debug', 'new File ID', newFileId);
				
				isRescheduled = true;
				
				var params = new Object();
				params['custscript_ax79_lastprocitemid'] = srs[i].getId();
				params['custscript_ax79_csvfileid'] = newFileId;
				
				var schStatus = nlapiScheduleScript(nlapiGetContext().getScriptId(), nlapiGetContext().getDeploymentId(), params);
				if (schStatus=='QUEUED') {
					break;
				}
			}
		}
		
		//if NOT rescheduled create the file and send it via email
		if (!isRescheduled) {
			log('debug','Generating Final CSV Export file','Generating final export file');
			var newFileRec = null;
			//At this point, Save the file 
			if (expFileRec) {
				//if export file was saved before, set value to csvBody only
				newFileRec = nlapiCreateFile(expFileRec.getName(), 'CSV', csvBody);
			} else {
				//if export file doesn't exist. set body as csvHeader + csvBody
				newFileRec = nlapiCreateFile(paramCsvFilename, 'CSV', csvHeader+csvBody);
			}
			
			//send it out to Email specified in the Param. (paramSendCsvToEmails)
			nlapiSendEmail(-5, paramSendCsvToEmails, 'External Web Item CSV File Generated', paramCsvFilename+' generated and stored in '+folderName+' folder', null, null, null, newFileRec);
			
			//save it
			newFileRec.setFolder(paramCsvOutputFolderId);
			nlapiSubmitFile(newFileRec);
			
		}
		
	} catch (syncerr) {
		throw nlapiCreateError('CLONEERR', getErrText(syncerr), false);
	}
	
}
