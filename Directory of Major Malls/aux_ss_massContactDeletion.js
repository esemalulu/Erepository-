/**
 * Part of duplicate deletion process.
 * This script is triggered based manually per each Saved searches that contains list of
 * records to be deleted.
 * 
 * Each Deleting records will gets its' own folder under 
 * AUX-Contact Deletion Backup > JSON Folder(116991)
 * 
 * CSV log file is generated each time script reschedules itself or completes execution without reschedule.
 * AUX-Contact Deletion Backup > Process Logs (116992)
 * 

 * JSON file format: [InternalId]_[recordtype].js
 * 

 * Version    Date            Author           Remarks
 * 1.00       06 May 2016     rehan@audaxium.com
 *
 */

/**
 * @param {String} type Context Types: scheduled, ondemand, userinterface, aborted, skipped
 * @returns {Void}
 */
function dupeDeleteProcess(type) 
{
	var isRescheduled=false;
	var paramSsId = nlapiGetContext().getSetting('SCRIPT', 'custscript_422_ssid');
	var paramSsTitle = nlapiGetContext().getSetting('SCRIPT', 'custscript_422_sstitle');
	var paramLogNotifier = nlapiGetContext().getSetting('SCRIPT', 'custscript_422_lognotifemp');
	var paramLastProcId = nlapiGetContext().getSetting('SCRIPT', 'custscript_422_lastprocid');
	var paramFolderId = '116991';
	var paramProcessLogFolderId = '116992';
	var backupComplete = false;
	var delLogCsvHeader = '"Search ID","InternalID","Name","Delete Status","Delete Log"\n';
	var delLogCsvBody = '';
	var prevId = '';
	var rIndex = 0;
	var rMax = 1000;
	
	
	
	top:do {
		//Run search that customer has created
		var contactSearch = nlapiSearchRecord('contact', paramSsId, null, null);
		
		// get all the columns
		var cols          = contactSearch[0].getAllColumns();
		
		//loop through search results
		for(var i = 0; i < contactSearch.length; i+=1)
		{
			//create folder name
			var folderName = contactSearch[i].getValue(cols[0]) + '-' + contactSearch[i].getValue(cols[1]);
			
			// check to see if the folder exists
			var folderFilter = [
			                    	new nlobjSearchFilter('name', null, 'is', folderName),
			                    	new nlobjSearchFilter('parent', null, 'anyof', paramFolderId)
			                   ];
			var folderColumn  = [new nlobjSearchColumn('internalid')];
			
			var folderSearch = nlapiSearchRecord('folder', null, folderFilter, folderColumn);
			if(folderSearch && folderSearch.length > 0)
			{
				var recFolderId = folderSearch[0].getValue('internalid');
				log('DEBUG', 'FOLDER ID', recFolderId);
			}
			else
			{
				//if folder doesn't exist create folder.l
				try
				{
					var folderRec = nlapiCreateRecord('folder');
						folderRec.setFieldValue('parent',paramFolderId);
						folderRec.setFieldValue('name', folderName);
					recFolderId = nlapiSubmitRecord(folderRec, true, true);
				}
				catch (foldercreateerr)
				{
					log('ERROR', contactSearch[i].getValue(cols[0])+'-'+ contactSearch[i].getValue(cols[1]), getErrText(foldercreateerr));
					//throw nlapiCreateError('FOLDER_CREATE_FAIL',  'Unable to create folder for ' + contactSearch[i].getValue(cols[0]) + '-' + contactSearch[i].getValue(cols[1]) + ' // Original Error Message: ' + getErrText(foldercreateerr), true);
				}
			}
				
				// get contact record id
				var contactId = contactSearch[i].getValue(cols[0]);
				
				// load contact record and generate backup file
				var contactRec        = nlapiLoadRecord('contact', contactId);
				var contactJSFilename = contactId + '_contact.js';
				var contactFile       = nlapiCreateFile(contactJSFilename, 'JAVASCRIPT', JSON.stringify(contactRec));
					contactFile.setFolder(recFolderId);
					nlapiSubmitFile(contactFile);
					backupComplete = true;
					
				// if backup is complete attempt to delete contact record.
				if(backupComplete == true)
				{
					try
					{
						nlapiDeleteRecord('contact', contactId);
						delLogCsvBody += '"'+paramSsId+'",'+
										 '"'+contactSearch[i].getValue(cols[0])+'",'+
										 '"'+contactSearch[i].getText(cols[1])+'",'+ 
						 '"SUCCESS",'+
						 '"Backup and Deleted"\n';
						// checks script usage limits, will reschedule if usage limits is close.
						if(nlapiGetContext().getRemainingUsage() <= 50)
						{
							//reschedule
							isRescheduled = true;
							
							log('AUDIT', 'Reschedule','ID: '+prevId);
							
							var rparam = 
							{
								'custscript_422_lastprocid':prevId	
							};
							nlapiScheduleScript(
								nlapiGetContext().getScriptId(), 
								nlapiGetContext().getDeploymentId(), 
								rparam
							);
							log('AUDIT','Breaking out from Msg Loop','Rescheduled here');
								break top;
						}
						var pctCompleted = Math.round(((i+1) / contactSearch.length) * 100);
						nlapiGetContext().setPercentComplete(pctCompleted);
					}
					//if deletion fails log error in csv and proceed with remaining records.
					catch (contactDeleteErr)
					{
						//throw nlapiCreateError('CONTACT_DELETE_ERR', getErrText(contactDeleteErr), true );
						log('ERROR', 'CONTACT_DELETE_ERR', getErrText(contactDeleteErr));
						delLogCsvBody += '"'+paramSsId+'",'+
										 '"'+contactSearch[i].getValue(cols[0])+'",'+
										 '"'+contactSearch[i].getText(cols[1])+'",'+ 
										 '"ERROR",'+
										 '"'+getErrText(contactDeleteErr)+'"\n';
					}
				}
				backupComplete = false;
			
			
			
		}
		rIndex = rIndex + rMax;
	} while (contactSearch.length >= 1000)
	
	//Generate LogFile out side the main try/catch to ensure it gets generated
	if (delLogCsvBody)
	{
		//Generate Log CSV file and save it
		var fileName = 'SearchID_'+paramSsId+
					   '_'+(new Date().getTime())+
					   '.csv',
			logSbj = 'Process Log - Search Title '+paramSsTitle+' ('+paramSsId+')',
			logMsg = 'Attached is Process log for Saved Search "'+paramSsTitle+'", ID '+paramSsId+
					 '<br/>'+
					 'This file can also be found under '+
					 'Documents > Files > File Cabinet > '+
					 'AUX-Contact Deletion Backup > Process Logs Folder',
			logCsvFile = nlapiCreateFile(fileName, 'CSV', delLogCsvHeader+delLogCsvBody);
			
		logCsvFile.setFolder(paramProcessLogFolderId);
		nlapiSubmitFile(logCsvFile);
		
		nlapiSendEmail(-5, paramLogNotifier, logSbj, logMsg, null, null, null, logCsvFile, true);
		
	}
	
	//If Not Rescheduled, send out notification to queue up next job
	if (!isRescheduled)
	{
		var nextSbj = 'QUEUE UP NEXT Search - Search Title '+paramSsTitle+' ('+paramSsId+') COMPLETED',
			nextMsg = 'Search Title '+paramSsTitle+' ('+paramSsId+') completed processing<br>'+
					  'Please check the result of the search to make sure records are deleted'+
					  '<br/><br/>'+
					  'Manually set up NEXT Delete Search!!!';
		
		nlapiSendEmail(-5, paramLogNotifier, nextSbj, nextMsg, null, null, null, null, true);
	}
	
}
