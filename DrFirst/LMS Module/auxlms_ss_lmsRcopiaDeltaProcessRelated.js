var recordJson = {
	'contract':'customrecord_lmsc_stage',
	'practice':'customrecord_lmsp_stage',
	'location':'customrecord_lmsl_stage',
	'user':'customrecord_lmslic_stage',
	'license':'customrecord_lmslic_stage'
};

//Grab Error Notification 
var paramPrimaryError = nlapiGetContext().getSetting('SCRIPT','custscript_sb94_errmainempid');
var paramCcErrorEmails = nlapiGetContext().getSetting('SCRIPT','custscript_sb94_errccemails');
if (paramCcErrorEmails && paramCcErrorEmails.length > 0)
{
	paramCcErrorEmails = paramCcErrorEmails.split(',');
}
else
{
	paramCcErrorEmails = null;
}

/**
 * Primary scheduled job that runs on a scheduled basis.
 * 
 */
function loadRcopiaDeltaCsv() 
{
	var processingFileName = '',
		//THIS will change each time it loops
		queueId = '';
	try
	{
		//Grab folder as Script Parameter
		var paramDeltaFolderId = nlapiGetContext().getSetting('SCRIPT','custscript_sb134_deltafolderid');
		var paramProcessedFolderId = nlapiGetContext().getSetting('SCRIPT','custscript_sb134_processedfolder');
		var paramLastProcId = nlapiGetContext().getSetting('SCRIPT','custscript_sb134_lastprocid');
		var paramLastRowIndex = nlapiGetContext().getSetting('SCRIPT','custscript_sb134_lastindex');
		var paramCustomDeltaDate = nlapiGetContext().getSetting('SCRIPT','custscript_sb134_custdeltadate');
		
		//7/13/2016 - LMS Monitor Enhancement
		//This value is passed in from Retry Handler.
		//	When it's used, it will force the loader to ONLY load THIS file.
		var paramRetryFileId = nlapiGetContext().getSetting('SCRIPT','custscript_sb134_retryfileid'),
			paramRetryLmsRec =  nlapiGetContext().getSetting('SCRIPT','custscript_sb134_retrylmsrec');
		
		//Just have it process all the files that gets uploaded
			//Search file object for files containing previous day value.
			//previous day value is formatted as mm-dd-yyyy where month and day values are NOT padded with leading 0
		var custDayObj = null,
			custDayFormatted='',
			isRowProcRescheduled=false,
			isLoaderRescheduled=false;
		//if custom date is passed in, use that date
		if (paramCustomDeltaDate)
		{
			custDayObj = nlapiStringToDate(paramCustomDeltaDate);
			log('debug','custDayObj',custDayObj);
			var paddedMonth = custDayObj.getMonth()+1;
			if (paddedMonth < 10)
			{
				paddedMonth = '0'+paddedMonth;
			}
			
			var paddedDate = custDayObj.getDate();
			if (paddedDate < 10)
			{
				paddedDate = '0'+paddedDate;
			}
			
			custDayFormatted = custDayObj.getFullYear().toString()+
							   paddedMonth.toString()+
							   paddedDate.toString();
		}
		
		log('debug','custDayFormatted // last proc // index', custDayFormatted+' // '+paramLastProcId+' // '+paramLastRowIndex);
		
		folderFlt = [new nlobjSearchFilter('folder', null, 'anyof', paramDeltaFolderId)];
		
		//7/13/2016 - If paramRetryFileId is passed in, ONLY Load this File
		log('debug','paramRetryFileId', paramRetryFileId);
		if (paramRetryFileId)
		{
			folderFlt.push(new nlobjSearchFilter('internalid', null, 'anyof', paramRetryFileId));
		}
		
		//Add In custom date filter
		if (custDayFormatted)
		{
			folderFlt.push(new nlobjSearchFilter('name',null,'contains','delta_'+custDayFormatted));
		}
		
		//If rescheduled return out where it left off
		//ONLY if lastRowIndex value is not passed in.
		if (paramLastProcId && !paramLastRowIndex)
		{
			folderFlt = [new nlobjSearchFilter('internalidnumber', null,'greaterthan',paramLastProcId)];
		}
		
		//
		folderCol = [new nlobjSearchColumn('internalid').setSort(),
		             new nlobjSearchColumn('name')];
		
		//execute search
		folderRs = nlapiSearchRecord('file', null, folderFlt, folderCol);
		
		log('debug','Folder RS Size', 'Result Size: '+(folderRs?folderRs.length:0));
		
		//IMPORTANT:
		//If lastRowIndex value is passed in, 
		//	1. Loop should continue until it gets to last processed file ID
		//	2. Inner loop should continue until it gets to lastRowIndex + 1
		for (var i=0; folderRs && i < folderRs.length; i+=1)
		{
			//Just incase, reset the queue here
			queueId = '';
			
			//fileName WILL have following Patter:
			//mm-dd-yyyy_RecordType_delta.csv 
			//AS OF 10-28-2015: lms_upload_[contract]_delta_[20151027200246]
			//where RecordType can be Contract, Practice, Location or User
			
			var fileId = folderRs[i].getValue('internalid');
			var fileName = folderRs[i].getValue('name');
			
			processingFileName = fileName;
			
			//If lastRowIndex is SET, continue until fileId matches paramLastProcId
			if (paramLastRowIndex && paramLastProcId && fileId != paramLastProcId)
			{
				continue;
			}
			
			//grab record type. Split the name using _ and use second on the array list.
			//Index 1 - if the format is mm-dd-yyyy_RecordType_delta.csv
			//Index 2 - if the format is lms_upload_[contract]_delta_[20151027200246]
			//			
			var recordTypeValue = fileName.split('_')[2],
				deltaDateValue = fileName.split('_')[4];
			
			//date comes in as YYYYMMDD 
			deltaDateValue = new Date(
								deltaDateValue.substring(4,6)+
								'/'+
								deltaDateValue.substring(6,8)+
								'/'+
								deltaDateValue.substring(0,4)
							 );
			log('debug','delta date obj', deltaDateValue);
			
			deltaDateValue = nlapiDateToString(deltaDateValue);
			
			//-----------------------------------------------
			//6/21/2016 - Monitoring Enhancement
			//Search for THIS File ID in the Monitoring queue.
			//	IF it does NOT exist, Add it in
			//	Other wise, leave as is
			var queueFlt = [new nlobjSearchFilter('custrecord_lmsq_fileref', null, 'anyof', fileId)],
				//Grab Oldest value just in case there is duplicate
				queueCol = [new nlobjSearchColumn('internalid').setSort()],
				queuers = nlapiSearchRecord('customrecord_lmsqueue', null, queueFlt, queueCol);
			
			var eastDateTime = new Date();
			//Manuall Convert current date to East Time by adding 3 hours
			eastDateTime = eastDateTime.getTime() + 10800000;
			eastDateTime = new Date(eastDateTime);
			
			if (queuers && queuers.length > 0)
			{
				queueId = queuers[0].getValue('internalid');
				//Update the queue with latest information
				var queueUpdFlds = ['custrecord_lmsq_procstatus',
				                    'custrecord_lmsq_procdetail',
				                    'custrecord_lmsq_procstartdt'],
					queueUpdVals = ['4',
					                'File is being loaded into '+recordTypeValue+' staging record',
					                nlapiDateToString(eastDateTime, 'datetimetz')];
				
				nlapiSubmitField('customrecord_lmsqueue', queueId, queueUpdFlds, queueUpdVals, true);
			}
			else
			{
				//Create One.
				var queueRec = nlapiCreateRecord('customrecord_lmsqueue');
				queueRec.setFieldValue('custrecord_lmsq_fileref', fileId);
				queueRec.setFieldValue('custrecord_lmsq_deltadate', deltaDateValue);
				queueRec.setFieldValue('custrecord_lmsq_lmsrectype', recordTypeValue);
				queueRec.setFieldValue('custrecord_lmsq_procstatus', '4'); //Processing status
				queueRec.setFieldValue('custrecord_lmsq_procdetail', 'File is being loaded into '+recordTypeValue+' staging record');
				queueRec.setFieldValue('custrecord_lmsq_procstartdt', nlapiDateToString(eastDateTime, 'datetimetz'));
				queueId = nlapiSubmitRecord(queueRec, true, true);
			}
			//-----------------------------------------------
			
			if (!recordTypeValue)
			{
				throw nlapiCreateError('ERR-LOADCSV', 'Missing Record Type from CSV file '+fileName, true);
			}
			
			recordTypeValue = recordTypeValue.toLowerCase();
			
			if (!recordJson[recordTypeValue])
			{
				throw nlapiCreateError('ERR-LOADCSV', 'Missing Internal ID of Custom Record for Record Type of '+recordTypeValue, true);
			}
			
			log('debug','fileId // fileName // recordTypeValue', fileId+' // '+fileName+' // '+recordTypeValue);
			
			
			var fileObj = nlapiLoadFile(fileId);
			var fileContent = fileObj.getValue();
			//need to grab header
			var fileDataRows = fileContent.split('\n');
			//build header array by spliting via comma
			//IMPORTANT:
			//When RCOPIA generates and stores these csv files, headers must exactly match the sample template.
			//10/28/2015 - Changed to | from comman delimiter due to limtation on both NS and Rcopia side
			var fileHeaderCols = fileDataRows[0].split('|');
			log('debug','fileHeaderCols', 'size: '+fileHeaderCols.length+' // '+fileHeaderCols);
			
			//Build Mapping Definition
			var mapJson = getMappingDef(recordTypeValue);
			//Once we know what staging record we are working with, update Queue with The Information. 
			
			//------------------------------
			//6/23/2016 - LMS Enhancement
			var qUpdFlds = ['custrecord_lmsq_stagerecid',
			                'custrecord_lmsq_stagerecstatusid',
			                'custrecord_lmsq_stagerecqueueid'],
				qUpdVals = [mapJson.stageRecId, 
				            mapJson.stageStatusField, 
				            mapJson.stageQueueId];
			
			nlapiSubmitField('customrecord_lmsqueue', queueId, qUpdFlds, qUpdVals, false);
			//------------------------------
			
			//Loop through and create new 
			//nlapiCreateRecord = 2
			//nlapiSubmitRecord = 4
			//Total 6 per custom record, 1000 Records 
			//	Start from index 1 since 0 was header
			for (var r=1; r < fileDataRows.length; r+=1)
			{
				try
				{
					//If lastRowIndex is SET, continue until r is paramLastRowIndex+1
					if (paramLastRowIndex && r < (parseInt(paramLastRowIndex)+1) )
					{
						log('debug','row reschedule','Skipping index r value '+r+' paramLastRowIndex value of '+paramLastRowIndex);
						continue;
					}
					
					//10/28/2015 - Changed to | from comman delimiter due to limtation on both NS and Rcopia side
					var arRowValues = fileDataRows[r].split('|');
					
					
					log('debug','r index '+r, arRowValues.length+' // '+arRowValues);
					
					//log('debug','mapJson',JSON.stringify(mapJson));`
					
					var stageRec = nlapiCreateRecord(mapJson.stageRecId, null);
					stageRec.setFieldValue(mapJson.csvFileField, fileId);
					
					//Added 6/22/2016 - Monitor Enhancement
					stageRec.setFieldValue(mapJson.stageQueueId, queueId);
					
					//convert to normal date value
					//prevDayFormatted = strGlobalReplace(prevDayFormatted, '-', '/');
					//prevDayFormatted = nlapiDateToString(new Date(prevDayFormatted));
					stageRec.setFieldValue(mapJson.deltaDateField, deltaDateValue);
					
					//loop through each column in arRowValues and using mapJson.map set appropriate field value
					//mapJson.map elements have two keys: fieldid and type
					//	type of value = setFieldValue
					//	type of text = setFieldText
					
					var hasValue = false;
					
					for (var d=0; d < arRowValues.length; d+=1)
					{
						var rowHasValue = false;
						var formattedRowValue = strGlobalReplace(strTrim(arRowValues[d]),'"','');
						//if value is null, change to empty string
						if (formattedRowValue == 'null')
						{
							formattedRowValue = '';
						}
						
						if (formattedRowValue)
						{
							hasValue = true;
							rowHasValue = true;
						}
						
						//log('audit','formattedRowValue',formattedRowValue+' // rowHasValue flag: '+rowHasValue);
						
						//check to make sure the key exists in mapJson.map
						if (mapJson.map[d]) 
						{
							//log('audit','fieldid // d // arRowValues[d]', mapJson.map[d].fieldid+' // '+mapJson.map[d].fieldtype+' // '+mapJson.map[d].type+' // '+d+' // '+formattedRowValue);
							//check for fieldtype; if checkbox use T or F based on value.
							if (mapJson.map[d].fieldtype=='checkbox')
							{
								if (formattedRowValue.toUpperCase()=='Y')
								{
									stageRec.setFieldValue(mapJson.map[d].fieldid, 'T');
								}
								else
								{
									stageRec.setFieldValue(mapJson.map[d].fieldid, 'F');
								}
							}
							else if ( (mapJson.map[d].fieldtype=='date' || mapJson.map[d].fieldtype=='datetime') && rowHasValue) 
							{
								var dateTimeFormattedValue = nlapiDateToString(nlapiStringToDate(formattedRowValue));
								if (mapJson.map[d].fieldtype=='datetime')
								{
									dateTimeFormattedValue = nlapiDateToString(nlapiStringToDate(formattedRowValue, 'datetimetz'), 'datetimetz');
								}
								//THIS one, we will need to convert to date just in case value has time information.
								log(
									'debug',
									'fieldid // d // arRowValues[d]', 
									mapJson.map[d].fieldid+' // '+mapJson.map[d].fieldtype+' // '+mapJson.map[d].type+' // '+d+' // '+dateTimeFormattedValue
								);
								
								stageRec.setFieldValue(mapJson.map[d].fieldid, dateTimeFormattedValue);
							}
							else if (mapJson.map[d].fieldtype=='multiselect' && formattedRowValue) 
							{
								log('debug','fieldid // d // arRowValues[d]', mapJson.map[d].fieldid+' // '+mapJson.map[d].fieldtype+' // '+mapJson.map[d].type+' // '+d+' // '+formattedRowValue);
								log('debug','testing length on multiselect', formattedRowValue.length);
								//If it is multiselect, value is separated out by Pipe.
								//10/28/2015 - Changing Multi VALUE delimiter to comma
								//11/16/2015 - Due to comma being part of word, changing to ~
								var arrayValues = formattedRowValue.split('~');
								if (mapJson.map[d].type == 'value')
								{
									stageRec.setFieldValues(mapJson.map[d].fieldid, arrayValues);
								}
								else
								{
									stageRec.setFieldTexts(mapJson.map[d].fieldid, arrayValues);
								}
							}
							else
							{
								log('debug','fieldid // d // arRowValues[d]', mapJson.map[d].fieldid+' // '+mapJson.map[d].fieldtype+' // '+mapJson.map[d].type+' // '+d+' // '+formattedRowValue);
								if (mapJson.map[d].type == 'value')
								{
									stageRec.setFieldValue(mapJson.map[d].fieldid, formattedRowValue);
								}
								else
								{
									stageRec.setFieldText(mapJson.map[d].fieldid, formattedRowValue);
								}
							}
						}
					}
					
					if (hasValue)
					{
						//submit the record
						var stageRecId = nlapiSubmitRecord(stageRec, true, true);
						
						log('debug',mapJson.stageRecId+' added','Added rec Id '+stageRecId);
					}
					else 
					{
						log('debug',mapJson.stageRecId+' skipped','Skipped due to no value ');
					}
					
					//TESTING
					
					//Reset each iteration
					isRowProcRescheduled = false;
					
					//r=1; r < fileDataRows
					//----- Reschedule Logic for fileDataRows loop ----------------------
					if ( (r+1) < fileDataRows.length && nlapiGetContext().getRemainingUsage() < 500)
					{
						//reschedule
						log('audit','Getting Rescheduled at row INDEX', r);
						isRowProcRescheduled = true;
						var rparam = new Object();
						rparam['custscript_sb134_lastprocid'] = fileId;
						rparam['custscript_sb134_lastindex'] = r;
						rparam['custscript+sb134_retryfileid'] = paramRetryFileId;
						nlapiScheduleScript(nlapiGetContext().getScriptId(), nlapiGetContext().getDeploymentId(), rparam);
						break;
					}
				}
				catch(rowimporterr)
				{
					//Throw customized error message here to be added to monitor
					throw nlapiCreateError(
						'ROW_IMPORT_ERR', 
						'Error processing Row #'+r+' // Error '+getErrText(rowimporterr), 
						true
					);
				}
				
				
			}//for loop - Each Row Data
			
			//Break out if isRowProcRescheduled 
			if (isRowProcRescheduled)
			{
				log('debug','Rescheduled at Row Index','Break out');
				break;
			}
			else
			{
				//reset this field here so that it can move to next
				paramLastRowIndex = '';
			}
			
			//ONCE it finish process file, move it to paramProcessedFolderId folder
			fileObj = nlapiLoadFile(fileId);
			fileObj.setFolder(paramProcessedFolderId);
			nlapiSubmitFile(fileObj);
			log('debug','file moved','moved');
			
			//6/21/2016 - Monitoring Enhancement
			//	Update the Queue to say that this CSV has been imported to staging record
			nlapiSubmitField(
				'customrecord_lmsqueue', 
				queueId, 
				'custrecord_lmsq_procdetail', 
				'File contents loaded into '+recordTypeValue+' staging record. Pending Processing', 
				true
			);
			
			//Set % completed of script processing
			var pctCompleted = Math.round(((i+1) / folderRs.length) * 100);
			nlapiGetContext().setPercentComplete(pctCompleted);
			
			if ((i+1)==1000 || ((i+1) < folderRs.length && nlapiGetContext().getRemainingUsage() < 500)) 
			{
				//reschedule
				log('audit','Getting Rescheduled at', fileId);
				isLoaderRescheduled = true;
				var rparam = new Object();
				rparam['custscript_sb134_lastprocid'] = fileId;
				nlapiScheduleScript(nlapiGetContext().getScriptId(), nlapiGetContext().getDeploymentId(), rparam);
				break;
			}
			
		}
		
		if (!isRowProcRescheduled && !isLoaderRescheduled)
		{
			//All Loading is done, kick off Scheduler
			
			//7/13/2016 - LMS Enhancement
			//If it's retry, pass in additional retry specific parameters to scheduler
			//queueId
			var rparam = null;
			if (paramRetryFileId)
			{
				rparam = {
					'custscript_sb146_stagerecid':paramRetryLmsRec,
		    		'custscript_sb146_retryqid':queueId
					
				};
			}
			
			var qstatus = nlapiScheduleScript(
						  	'customscript_axlms_deltaprocscheler', 
							'customdeploy_axlms_deltaprocadhoc',
							rparam
						  );
			
			log('audit','Loading '+ processingFileName+' complete','Queue up AX-LMS-SS Delta Proc Scheduler ---> Status: '+qstatus);
			
		}
		
	}
	catch (err)
	{
		log('error','Error Loading Rcopia CSV Delta Files', getErrText(err));
		
		//6/23/2016 - LMS Monitor Enhancement
		//Update the Status Here
		if (queueId)
		{
			//6/21/2016 - Monitoring Enhancement
			//	Update the Queue to say that this CSV has been imported to staging record
			
			var eastDateTime = new Date();
			//Manuall Convert current date to East Time by adding 3 hours
			eastDateTime = eastDateTime.getTime() + 10800000;
			eastDateTime = new Date(eastDateTime);
			
			nlapiSubmitField(
				'customrecord_lmsqueue', 
				queueId, 
				['custrecord_lmsq_procstatus','custrecord_lmsq_procdetail','custrecord_lmsq_pof','custrecord_lmsq_procenddt'], 
				['3', //Set it to Failed
				 'Failed to load File contents into '+recordTypeValue+' staging record. '+getErrText(err),
				 'LOAD',
				 nlapiDateToString(eastDateTime, 'datetimetz')], 
				true
			);
		}
		
		//Generate Custom Email Message
		var loadSbj = 'Critical Rcopia Delta Load Error',
			loadMsg = 'Critical error occured while processing Delta Load File Name '+
					  processingFileName+'. <br/><br/>'+
					  'Delta Loading Process has prematurely terminated.<br/><br/>Error Message<br/>'+
					  getErrText(err);
		
		nlapiSendEmail(-5, paramPrimaryError, loadSbj, loadMsg, paramCcErrorEmails);
		
		//throw error and terminate the script
		throw nlapiCreateError(
			'DELTA-LOAD-ERR', 
			'Error Occured while Loading '+
				processingFileName+
				' // '+
				getErrText(err), 
			true);
		
	}
}

/**
 * 11/23/2015 - Process introduced to enhance delta processing performance.
 */
function deltaProcessScheduler()
{

	//Added 6/23/2016 - Monitor Enhancement
	var queueMonitorId = '';

	try
	{
		//Passed in as scheduled script reschedule itself until it's done processing all 4 stage records.
		//Initially it's blank meaning process contract first
		//paramStageRecId: 1)contract 2)practice 3)location 4)user
		var paramStageRecId = nlapiGetContext().getSetting('SCRIPT', 'custscript_sb146_stagerecid'),
			paramNumDeploys = nlapiGetContext().getSetting('SCRIPT','custscript_sb146_numprocdpl'),
			//7/13/2016 - Add in Queue Parameter specifically for Retry function.
			//			  If Queue Retry Handler passed in queue ID, ONLY schedule up all Elements for THIS Queue
			paramRetryQueueId = nlapiGetContext().getSetting('SCRIPT', 'custscript_sb146_retryqid');
		
		if (!paramNumDeploys)
		{
			throw nlapiCreateError('DELTA_SCH_ERR', 'Number of Processor Deployment missing', false);
		}
		
		if (!paramStageRecId)
		{
			paramStageRecId = 'contract';
		}
		
		log('debug','processing in ',paramStageRecId);
		
		/**
		 * Process:
		 * run total count search, 
		 * - Less than 100, run it as single queue
		 * - More than 100,
		 * 		- Other wise queue up 1000 unique Externa ID Range
		 * 		- Grab search result based on External IDs lowest to highest GROUPED (This returns Unique LIST)
		 * 			- User, Location: Location Stand alone ID
		 * 			- Contract: Contract External ID
		 * 			- Practice: practice External ID
		 * 		- nlapiCreateSearch API Used
		 * 		- Once ALL Unique External IDs are grabbed, scheduler will divind MAX number by parseInt(paramNumDeploys).
		 * 		- There are currently total of parseInt(paramNumDeploys) deployments spread out evenly among 4 queues.
		 * 			Only Two are deployed at queue 1 due to existing running process
		 * 		- Number is used as increment.
		 * 		- It will loop from 1 to parseInt(paramNumDeploys) incrementing by "INCREMENT" starting from MIN Value.
		 * 			and queue it up for processing.
		 * 		- This will reduce the Gap between the ID numbers and allow for smaller chunkcs for each queued script to process
		 * 
		 * Process reschedules ONLY when queueing up process is completed.
		 * This will use nlapiCreateSearch to go through ALL results with minimum data processing so 10,000 gov. will be enough
		 */
		
		//Search for existing PROCESS. IF any of deployment for "Process Delta Script" is Running or In queue, Exist out and Wait
		var osdrflt = [new nlobjSearchFilter('scriptid','script','is','customscript_axlms_ss_processdelta'),
		               new nlobjSearchFilter('status', null, 'noneof',['CANCELED','COMPLETE','FAILED'])];
		
		var osdcol = [new nlobjSearchColumn('status'),
		              new nlobjSearchColumn('datecreated').setSort(true)];

		var osdrrs = nlapiSearchRecord('scheduledscriptinstance', null, osdrflt, osdcol);
		
		if (osdrrs && osdrrs.length > 0)
		{
			log('audit','One in Progress','One in progress at the moment. Wait... ');
			return;
		}
		
		var mapJson = getMappingDef(paramStageRecId); 
		
		var qrocflt = [new nlobjSearchFilter('isinactive', null, 'is', 'F'),
		               new nlobjSearchFilter(mapJson.stageStatusField, null, 'isempty','')];
		
		//7/13/2016 - If Queue ID was passed in, ONLY process THIS Queue Element
		log('debug','Retry Queue ID', paramRetryQueueId);
		if (paramRetryQueueId)
		{
			qrocflt.push(new nlobjSearchFilter(mapJson.stageQueueId, null, 'anyof', paramRetryQueueId));
		}
		
		var qrocfnum = new nlobjSearchColumn('formulanumeric', null,'group');
		var externalFldId = '';
		if (paramStageRecId=='location' || paramStageRecId=='user')
		{
			if (paramStageRecId=='user')
			{
				externalFldId = 'custrecord_lmslics_locationstaid';
			}
			else
			{
				externalFldId = 'custrecord_lmsls_locationid';
			}
		}
		else
		{
			externalFldId = mapJson.stagingExternalId;
		}
		
		qrocfnum.setFormula('TO_NUMBER({'+externalFldId+'})');
		
		//Run the search that returns unique list of external IDs ordered in ASC order
		var qroccol = [qrocfnum.setSort(),
		               //6/23/2016 - Grab Value for Queue Record
		               new nlobjSearchColumn(mapJson.stageQueueId, null,'group')];
		var qrocss = nlapiCreateSearch(mapJson.stageRecId, qrocflt, qroccol);
		var qrocrss = qrocss.runSearch();
		
		//Initial start and end values
		var qrstart = 0,
			qrend = 1000,
			increment= '';
		
		var allrs = [],
			qrocrs = qrocrss.getResults(qrstart, qrend);
			
		if (qrocrs.length > 0)
		{
			var continueProcessing = true;
			//Run while loop to grab ALL results. 
		    while (continueProcessing) 
		    {
		    	
		    	if (qrstart > 0)
		    	{
		    		qrocrs = qrocrss.getResults(qrstart, qrend);
		    	}
		    	
		    	if (qrocrs.length < 1000)
	    		{
	    			continueProcessing = false;
	    			//log('debug','no more process',qrocrs.length+' // no more process set');
	    		}
		    	
		    	for (var r=0; qrocrs && r < qrocrs.length; r+=1)
		    	{
		    		log('debug','qrocrs values','qrocfnum: '+qrocrs[r].getValue(qrocfnum)+' // Queue ID: '+qrocrs[r].getValue(mapJson.stageQueueId, null,'group'));
		    		
		    		//Added 6/23/2016 - LMS Monitor Ehnacement
		    		if (!queueMonitorId && qrocrs[r].getValue(mapJson.stageQueueId, null,'group'))
		    		{
		    			queueMonitorId = qrocrs[r].getValue(mapJson.stageQueueId, null,'group');
		    			
		    			//Update this queue that it is starting staging to record processing
		    			//6/21/2016 - Monitoring Enhancement
		    			//	Update the Queue to say that this CSV has been imported to staging record
		    			nlapiSubmitField(
		    				'customrecord_lmsqueue', 
		    				queueMonitorId, 
		    				'custrecord_lmsq_procdetail', 
		    				'Staging to Actual Sync in Progress', 
		    				true
		    			);
		    			
		    		}
		    		
		    		allrs.push(qrocrs[r].getValue(qrocfnum));
		    	}
		    	
		    	//log('debug','size',qrocrs.length);
		    	
		    	qrstart = qrend;
		    	qrend = qrend + 1000;
		    	
		    	//log('debug','indexes',qrstart+'//'+qrend);
		    }
			
			increment = Math.round(allrs.length / parseInt(paramNumDeploys)); //There are total parameter based deployments
			if (increment <= 0)
			{
				increment = 1;
			}
			//Start dividing up the numbers
			log('debug','allrs size',allrs.length +' // '+increment);
			
			
			var indexstart = 0,
				indexend = indexstart + parseInt(increment);
			
			for (var q=parseInt(paramNumDeploys); q >= 1; q-=1)
			{
				
				//process as long as indexstart is less than the endRange
				//if (parseInt(indexstart) > parseInt(endRange))
				//{
					//log('audit','No Need to schedule index out of range','Start '+indexstart+' // Actual End Range '+endRange);
				//}
				
				var deployId = 'customdeploy_deltaprocq'+q,
					breakout = false;
				
				log('debug','indexend',indexend);
				
				if (parseInt(indexend) >= (allrs.length-1) )
				{
					indexend = allrs.length - 1;
					breakout = true;
				}
				
				
				log('debug','queue up',deployId+' // Index Start '+indexstart+' ('+allrs[indexstart]+') // Index End '+indexend+' ('+allrs[indexend]+')');
				
				//Create Sub Queue Record for THIS Queue
				
		    	var subQueueId = '';
		    	
		    	//Only create sub queue if parent queue is passed in
		    	if (queueMonitorId)
		    	{
		    		var subQueueRec = nlapiCreateRecord('customrecord_lmssubqueue');
		    		subQueueRec.setFieldValue('custrecord_lmssq_parentqueue', queueMonitorId);
		    		subQueueRec.setFieldValue('custrecord_lmssq_status', '4'); //Set it as In Progress
		    		subQueueRec.setFieldValue('custrecord_lmssq_extfldid', paramStageRecId);
		    		subQueueRec.setFieldValue('custrecord_lmssq_minextid', allrs[indexstart]);
		    		subQueueRec.setFieldValue('custrecord_lmssq_maxextid', allrs[indexend]);
		    		
		    		subQueueId = nlapiSubmitRecord(subQueueRec, true, true);
		    	}
		    		
				
				//Queue it up
		    	var rparam = {
		    		'custscript_sb135_stagerecid':paramStageRecId,
		    		'custscript_sb135_minextid':allrs[indexstart],
		    		'custscript_sb135_maxextid':allrs[indexend],
		    		'custscript_sb135_extfldid':externalFldId,
		    		'custscript_sb135_subqueueid':subQueueId,
		    		
		    		//7/14/2016 - Need to pass in Retry Queue ID
		    		'custscript_sb135_retryqid':paramRetryQueueId
		    		
		    	};
		    	
		    	var qstatus = nlapiScheduleScript('customscript_axlms_ss_processdelta', deployId, rparam);
		    	
		    	
		    	log('debug','Record Type // min // max // extfld', 'Status: '+qstatus+' // Remaining: '+nlapiGetContext().getRemainingUsage()+' // '+paramStageRecId+' // '+allrs[indexstart]+' // '+allrs[indexend]+' // '+externalFldId);
		    	
		    	//Must break out of the loop of # of total script deployment if all allrs indexes are covered
		    	log('debug','break out check',breakout);
		    	if (breakout)
				{
		    		log('audit','No Need to schedule any more','Stopping at deployment q '+q+' because indexend is greater than size of allrs '+allrs.length);
					break;
				}
				
		    	//Next Iteration logic
		    	//This is to prevent multiple queue attempting to process against same record
		    	//Start should be end + 1; NEXT Index to start with
				indexstart = parseInt(indexend)+1;
				//End should be Start + Increment
				indexend = parseInt(indexstart) + parseInt(increment);
			}
			
		}
		
		//At this point, we check to see what the NEXT step is
		if (paramStageRecId == 'contract')
		{
			log('audit','Reschedule for Practice','Reschedule for Practice');
			paramStageRecId = 'practice';
		}
		else if (paramStageRecId == 'practice')
		{
			log('audit','Reschedule for location','Reschedule for location');
			paramStageRecId = 'location';
		}
		else if (paramStageRecId == 'location')
		{
			log('audit','Reschedule for User','Reschedule for User');
			paramStageRecId = 'user';
		}
		else if (paramStageRecId == 'user')
		{
			log('audit','NO Need to reschedule','Done process. Returning out after USER');
			
			return;
		}
		
		var rparam = new Object();
		log('debug','passing in ',paramStageRecId);
		rparam['custscript_sb146_stagerecid'] = paramStageRecId;
		nlapiScheduleScript(nlapiGetContext().getScriptId(), nlapiGetContext().getDeploymentId(), rparam);
	}
	catch(schrerr)
	{
		var eastDateTime = new Date();
		//Manuall Convert current date to East Time by adding 3 hours
		eastDateTime = eastDateTime.getTime() + 10800000;
		eastDateTime = new Date(eastDateTime);
		
		//6/21/2016 - Monitoring Enhancement
		//	Update the Queue to say that this CSV has been imported to staging record
		if (queueMonitorId)
		{
			nlapiSubmitField(
				'customrecord_lmsqueue', 
				queueMonitorId, 
				['custrecord_lmsq_procstatus','custrecord_lmsq_procdetail','custrecord_lmsq_pof','custrecord_lmsq_procenddt'], 
				['3', //Set it to Failed
				 'Scheduler Failure. Failed to Queue up Stage to Actual Syncing Processes // '+getErrText(schrerr),
				 'PROCESS',
				 nlapiDateToString(eastDateTime, 'datetimetz')], 
				true
			);
		}
		
		throw nlapiCreateError(
			'STAGE_TO_ACTUAL_SYNC_ERROR',
			'Unexpected error while attempting to queue up Stage to Actual Process Jobs // '+getErrText(schrerr),
			false
		);
	}
	
}

/**
 * Process Staged Rcopia Delta Chanages in Series: Contract > Practice > Location > User
 */
function processStagedRcopiaDeltaChanges()
{
	//Passed in as scheduled script reschedule itself until it's done processing all 4 stage records.
	//Initially it's blank meaning process contract first
	//paramStageRecId: 1)contract 2)practice 3)location 4)user
	var paramStageRecId = nlapiGetContext().getSetting('SCRIPT', 'custscript_sb135_stagerecid');
	
	//Modification of Existing Delta Process to ONLY run for MIN and MAX External IDs passed in
	var paramMinExternalID = nlapiGetContext().getSetting('SCRIPT','custscript_sb135_minextid');
	var paramMaxExternalID = nlapiGetContext().getSetting('SCRIPT','custscript_sb135_maxextid');
	var paramExternalFldId = nlapiGetContext().getSetting('SCRIPT','custscript_sb135_extfldid');
	
	//6/23/2016 - LMS Monitor Enhancement
	//This parameter value is passed in from Queue Scheduler for THIS specific record type
	//	Each Queued up scheduled script will get it's own Sub Queue ID to track progress of 
	//	its iteration
	var paramMonitorSubQueueId = nlapiGetContext().getSetting('SCRIPT','custscript_sb135_subqueueid');
	
	//7/13/2016 - LMS Monitor Enhancement
	//This parameter value is passed in from Queue Scheduler specific for Retry 
	//	When Retry queue ID is passed in from Scheduler, it will process min/max range records FOR this queue.
	//	It will also force the script to NOT queue up next record processing
	var paramRetryQueueId = nlapiGetContext().getSetting('SCRIPT', 'custscript_sb135_retryqid');
	
	log('audit',nlapiGetContext().getDeploymentId(),paramMinExternalID+' // '+paramMaxExternalID);
	
	try
	{
		//Throw ERROR if above three parameter values are empty
		if (!paramMinExternalID || !paramMaxExternalID || !paramExternalFldId)
		{
			throw nlapiCreateError('LMS_DELTA_ERR', 'Missing required Min and Max External ID values and External Field ID', true);
		}
		
		log('debug','Min/Max',paramMinExternalID+' // '+paramMaxExternalID+' // '+paramExternalFldId);
		
		var paramLastProcId = nlapiGetContext().getSetting('SCRIPT', 'custscript_sb135_lastprocid');
		
		var isRescheduled = false;
		
		if (!paramStageRecId)
		{
			paramStageRecId = 'contract';
		}
		
		var mapJson = getMappingDef(paramStageRecId); 
		
		
		/**
		var procflt = [new nlobjSearchFilter('isinactive', null, 'is', 'F'),
		               new nlobjSearchFilter(mapJson.stageStatusField, null, 'isempty','')];
		*/
		
		var betweenFltObj = new nlobjSearchFilter('formulanumeric', null, 'between', paramMinExternalID, paramMaxExternalID);
		
		betweenFltObj.setFormula('TO_NUMBER({'+paramExternalFldId+'})');
		
		var procflt = [new nlobjSearchFilter('isinactive', null, 'is', 'F'),
		               new nlobjSearchFilter(mapJson.stageStatusField, null, 'isempty',''),
		               betweenFltObj];
		
		//7/13/2016 - If Retry is triggered ONLY process for this queue
		if (paramRetryQueueId)
		{
			procflt.push(new nlobjSearchFilter(mapJson.stageQueueId, null, 'anyof', paramRetryQueueId));
		}
		
		
		if (paramLastProcId)
		{
			procflt.push(new nlobjSearchFilter('internalidnumber', null,'greaterthan',paramLastProcId));
		}
		
		var proccol = [new nlobjSearchColumn('internalid').setSort()];
		
		var procrs = nlapiSearchRecord(mapJson.stageRecId,null, procflt, proccol);
		
		if (procrs && procrs.length > 0)
		{
			log('audit','rs size',procrs.length);
			for (var i=0; i < procrs.length; i++)
			{
				
				//log('debug','Current ID/Min/Max',procrs[i].getValue('internalid')+' // '+paramMinExternalID+' // '+paramMaxExternalID);
				
				//log('debug','Processing Stage',mapJson.stageRecId+' // '+procrs[i].getValue('internalid'));
				
				var stageRecObj = nlapiLoadRecord(mapJson.stageRecId, procrs[i].getValue('internalid')),
					origRecObj = null,
					origRecId = '',
					stageProcessLog = '';
				
				if (stageRecObj.getFieldValue(mapJson.originalRefField))
				{
					//If Netsuite ID value is available, load it.
					origRecObj = nlapiLoadRecord(mapJson.originalRecId, stageRecObj.getFieldValue(mapJson.originalRefField));
					origRecId = stageRecObj.getFieldValue(mapJson.originalRefField);
					stageProcessLog += '<li>Loaded Original Record: '+
									   mapJson.originalRecId+' ('+
									   stageRecObj.getFieldValue(mapJson.originalRefField)+
									   ')</li>';
				}
				else
				{
					//At this point, we need to do a quick search to see if external ID exist
					//originalExternalId
					
					//log('debug',mapJson.stagingExternalId,stageRecObj.getFieldValue(mapJson.stagingExternalId)+' // '+mapJson.originalExternalId);
					
					var origRecFlt = [
					                  	['isinactive','is','F'],
					                  	'AND',
					                  	[
					                  	 ['externalid','anyof',stageRecObj.getFieldValue(mapJson.stagingExternalId)],
					                  	 'OR',
					                  	 [mapJson.originalExternalId,'is',stageRecObj.getFieldValue(mapJson.stagingExternalId)]
					                  	]
					                 ];
					
					var origRecCol = [new nlobjSearchColumn('internalid')];
					var origRecRs = nlapiSearchRecord(mapJson.originalRecId, null, origRecFlt, origRecCol);
					if (!origRecRs)
					{
						origRecObj = nlapiCreateRecord(mapJson.originalRecId);
						stageProcessLog += '<li>Create NEW Original Record</li>';
					}
					else if (origRecRs && origRecRs.length == 1)
					{
						origRecObj = nlapiLoadRecord(mapJson.originalRecId, origRecRs[0].getValue('internalid'));
						origRecId = origRecRs[0].getValue('internalid');
						stageProcessLog += '<li>Loaded Original Record by External ID: '+
						   				   mapJson.originalRecId+' ('+
						   				   origRecId+
										   ') External ID: '+stageRecObj.getFieldValue(mapJson.stagingExternalId)+
										   '</li>';						
					} 
					else
					{
						//THIS is an error
						log('error',
							'External ID '+stageRecObj.getFieldValue(mapJson.stagingExternalId)+
							' Error',
							'More than One Original with same external ID Found');
						
						mapJson.stageStatusField = 'custrecord_lmscts_status';
				    	mapJson.stageLogField = 'custrecord_lmscts_log';
						
				    	stageProcessLog += '<li><span style="color:red">ERROR Original Record by External ID: '+
						   				   mapJson.originalRecId+' ('+
						   				   origRecId+
										   ') External ID: '+stageRecObj.getFieldValue(mapJson.stagingExternalId)+
										   'Found '+origRecRs.length+' with same External ID</span></li>';
				    	
						stageRecObj.setFieldValue(mapJson.stageStatusField,'error');
						stageRecObj.setFieldValue(mapJson.stageLogField,stageProcessLog);
					}
					
				}
				
				if (origRecObj)
				{
					//Let's set up native external ID
					origRecObj.setFieldValue('externalid',stageRecObj.getFieldValue(mapJson.stagingExternalId));
					
					origRecObj.setFieldValue(mapJson.originalExternalId, stageRecObj.getFieldValue(mapJson.stagingExternalId));
					
					//Loop through all filds and build to be checked field values
					var lastUpdateFlds = [];
					for (var fld in mapJson.map)
					{
						if (mapJson.map[fld].tofieldid != 'internalid')
						{
							lastUpdateFlds.push(mapJson.map[fld].tofieldid.toUpperCase());
						}
						
					}
										
					//Loop through each mapped fields and set it accordingly
					
					for (var fld in mapJson.map)
					{
						var stageFieldId = mapJson.map[fld].fieldid,
							stageFieldType = mapJson.map[fld].fieldtype,
							stageFieldValue = stageRecObj.getFieldValue(stageFieldId),
							stageDeltaDateObj = nlapiStringToDate(stageRecObj.getFieldValue(mapJson.deltaDateField));
							originalFieldId = mapJson.map[fld].tofieldid,
							originalFieldType = mapJson.map[fld].tofieldtype,
							originalFieldValue = origRecObj.getFieldValue(originalFieldId),
							updateThisField = false;
						
						//Skip Internal ID 
						if (originalFieldId == 'internalid')
						{
							continue;
						}
						
						//log('debug','value compare','Stage: '+stageFieldValue+' // Original: '+originalFieldValue);
						//1. Compare the value between stage and original record
						if (stageFieldValue != originalFieldValue)
						{						
							//At this point, we check to see field has last updated date.
							if (mapJson.map[fld].master == 'Rcopia' || mapJson.map[fld].master == 'Both') 
								//|| 
								//!lastUpdatedJson[originalFieldId] || 
								//(lastUpdatedJson[originalFieldId] && lastUpdatedJson[originalFieldId] < stageDeltaDateObj) )
							{
								/**
								log('debug','Field Different and Delta date greater', 'Master: '+
									mapJson.map[fld].master+' // NS Field Updated: '+lastUpdatedJson[originalFieldId] +
									' // Stage Delta Date: '+ stageDeltaDateObj);
								*/
								updateThisField = true;
							}
						}
						
						//log('debug',updateThisField,'--------------------------------');
						
						var fldLevelLog = '';
						if (updateThisField)
						{
							var setStageValue = '';
							//log('debug','oft // sft',originalFieldType+' // '+stageFieldType);
							//if originalFieldType is select and stage is text, use setFieldText
							if (originalFieldType == 'select' && stageFieldType == 'text')
							{
								var origValueToSet = stageRecObj.getFieldValue(stageFieldId);
								//Special case State abbr handling
								
								//log('debug','origValueToSet // originalFieldId',origValueToSet+' // '+originalFieldId);
								
								if (origValueToSet && (originalFieldId=='custrecord_lmslc_userstatedd' || originalFieldId=='custrecord_lmsl_state' || originalFieldId=='custrecord_lmsp_state') )
								{
									
									//TODO: Until we find out XX-XXXXXX is the format, we will test it
									if (origValueToSet.indexOf('-') > -1)
									{
										origValueToSet = origValueToSet.split('-')[1];
									}
									else
									{
										//Loop through usStateList and find match
										for (var usst in usStateList)
										{
											if (usStateList[usst] == origValueToSet)
											{
												origValueToSet = usst;
												break;
											}
										}
									}
									
									//log('debug','state text', origValueToSet);
								}
								
								
								origRecObj.setFieldText(originalFieldId, origValueToSet);
								setStageValue = stageRecObj.getFieldValue(stageFieldId);
								
							}
							else if (originalFieldType == 'multiselect')
							{
								origRecObj.setFieldValues(originalFieldId, stageRecObj.getFieldValues(stageFieldId));
								setStageValue = stageRecObj.getFieldValues(stageFieldId);
							}
							else
							{
								origRecObj.setFieldValue(originalFieldId, stageRecObj.getFieldValue(stageFieldId));
								setStageValue = stageRecObj.getFieldValue(stageFieldId);
							}
							
							fldLevelLog = 'Set '+originalFieldId+ 'with Value From Stage: '+setStageValue;
						}
						else
						{
							fldLevelLog = 'Skip '+originalFieldId;
						}
						stageProcessLog += '<li>'+fldLevelLog+'<br/>'+
										   'Stage Value: '+stageFieldValue+' // Original Value: '+originalFieldValue+'<br/>'+
										   'Master: '+mapJson.map[fld].master+'<br/>'+
										   //'NS Field Updated: '+lastUpdatedJson[originalFieldId] +
										   ' // Stage Delta Date: '+ stageDeltaDateObj+'</li>';
										   
					}
					
					//Final Step: For practice, location and user records, we need to make sure to get NS Internal IDs and fill it in.
					//			  Using External IDs provided, search against NetSuite Original Record.
					
					//THIS Flag is to make sure we have all the data properly linked up before saving
					var saveOrigRecord = true;
					if (paramStageRecId=='practice' || paramStageRecId=='location' || paramStageRecId=='user')
					{
						if (paramStageRecId=='practice')
						{
							//for practice, we need to find parent Contract (customrecord_lmsc) using
							//custrecord_lmsps_contractexternalid on STAGE to set custrecord_lmsp_contract on ORIGINAL
							var pracContrFlt = [new nlobjSearchFilter('custrecord_lmsct_externalid', null, 'is', stageRecObj.getFieldValue('custrecord_lmsps_contractexternalid')),
							                    new nlobjSearchFilter('isinactive', null, 'is','F')];
							var pracContrCol = [new nlobjSearchColumn('internalid')];
							var pracContrRs = nlapiSearchRecord('customrecord_lmsc', null, pracContrFlt, pracContrCol);
							//Assume there is only ONE
							if (pracContrRs && pracContrRs.length > 0)
							{
								origRecObj.setFieldValue('custrecord_lmsp_contract', pracContrRs[0].getValue('internalid'));
								stageProcessLog += '<li>Found Linked Contract: '+pracContrRs[0].getValue('internalid')+
												   ' using Practice Contract External ID: '+
												   stageRecObj.getFieldValue('custrecord_lmsps_contractexternalid')+'</li>';
							}
							else
							{
								saveOrigRecord = false;
								stageProcessLog += '<li><span style="color:red">Unable to find Linked Contract using Practice Contract External ID: '+
												   stageRecObj.getFieldValue('custrecord_lmsps_contractexternalid')+'</span></li>';
							}
							
						}
						else if (paramStageRecId=='location')
						{
							//for location, we need to find parent Practice (customrecord_lmsp) using
							//custrecord_lmsls_practiceexternalid on STAGE to set custrecord_lmsl_practice on ORIGINAL
							var locPracFlt = [new nlobjSearchFilter('custrecord_lmsp_externalid', null, 'is', stageRecObj.getFieldValue('custrecord_lmsls_practiceexternalid')),
							                  new nlobjSearchFilter('isinactive', null, 'is','F')];
							var locPracCol = [new nlobjSearchColumn('internalid')];
							var locPracRs = nlapiSearchRecord('customrecord_lmsp', null, locPracFlt, locPracCol);
							//Assume there is only ONE
							if (locPracRs && locPracRs.length > 0)
							{
								origRecObj.setFieldValue('custrecord_lmsl_practice', locPracRs[0].getValue('internalid'));
								stageProcessLog += '<li>Found Linked Practice: '+locPracRs[0].getValue('internalid')+
												   ' using Location Practice External ID: '+
												   stageRecObj.getFieldValue('custrecord_lmsls_practiceexternalid')+'</li>';
							}
							else
							{
								saveOrigRecord = false;
								stageProcessLog += '<li><span style="color:red">Unable to find Linked Practice using Location Practice External ID: '+
												   stageRecObj.getFieldValue('custrecord_lmsls_practiceexternalid')+'</span></li>';
							}
						}
						else if (paramStageRecId == 'user')
						{
							
							//Added Nov 30 2015 - referenced contract Id from practice
							var pracRefContractId = '';
							
							//set the name to match user records external ID
							//Using alternate value/pair for Name section of record. 
							//NS only have 30 characters
							
							origRecObj.setFieldValue(
									'altname',
									stageRecObj.getFieldValue('custrecord_lmslics_username')+
									'-'+
									stageRecObj.getFieldValue('custrecord_lmslics_userid')
							);
							
							var locComboKey = stageRecObj.getFieldValue('custrecord_lmslics_locationexternalid');
							
							//log('debug','locComboKey', locComboKey);
							
							var userLocFlt = [new nlobjSearchFilter('custrecord_lmsl_externalid', null, 'is', locComboKey),
							                  new nlobjSearchFilter('isinactive', null, 'is','F')];
							var userLocCol = [new nlobjSearchColumn('internalid')];
							//Search Location Record
							
							var userLocRs = nlapiSearchRecord('customrecord_lmsl', null, userLocFlt, userLocCol);
							
							if (userLocRs && userLocRs.length > 0)
							{
								//set the location internal ID value
								origRecObj.setFieldValue('custrecord_lmslc_location', userLocRs[0].getValue('internalid'));
								
								stageProcessLog += '<li>Found Linked Location ID: '+userLocRs[0].getValue('internalid')+
												   ' using User Location Combo Key: '+locComboKey+'</li>';
								
								//At this point, run search for Matching Practice
								if (stageRecObj.getFieldValue('custrecord_lmslics_practiceexternalid'))
								{
									var userPracFlt = [new nlobjSearchFilter('custrecord_lmsp_externalid', null, 'is', stageRecObj.getFieldValue('custrecord_lmslics_practiceexternalid')),
									                   new nlobjSearchFilter('isinactive', null, 'is', 'F')];
									var userPracCol = [new nlobjSearchColumn('internalid'),
									                   //Nov 30 2015 - Grab contract reference as well incase user is missing contract ID
									                   new nlobjSearchColumn('internalid','custrecord_lmsp_contract')];
									
									var userPracRs = nlapiSearchRecord('customrecord_lmsp', null, userPracFlt, userPracCol);
									
									//Set linked Practice on License (User) Record
									if (userPracRs && userPracRs.length > 0)
									{
										
										//Add Nov 30 2015 - Add in reference to contract Internal ID from search
										pracRefContractId = userPracRs[0].getValue('internalid','custrecord_lmsp_contract');
										
										//set the practice Internal ID value
										origRecObj.setFieldValue('custrecord_lmslc_practice', userPracRs[0].getValue('internalid'));
										
										stageProcessLog += '<li>Found Linked Practice ID: '+userPracRs[0].getValue('internalid')+
														   ' using User Practice External ID: '+
														   stageRecObj.getFieldValue('custrecord_lmslics_practiceexternalid')+'</li>';
									
										//ERROR NEED Validate this.
										//DrFirst team STILL attempting to validate missing contract rcopia ID on license as of 10/29/2015
										
										//Need to run search using Contract External ID to set it properly
										if (stageRecObj.getFieldValue('custrecord_lmslics_contractexternalid'))
										{
											var userCtFlt = [new nlobjSearchFilter('custrecord_lmsct_externalid', null, 'is', stageRecObj.getFieldValue('custrecord_lmslics_contractexternalid')),
											                 new nlobjSearchFilter('isinactive', null, 'is', 'F')];
											var userCtCol = [new nlobjSearchColumn('internalid')];
											
											var userCtRs = nlapiSearchRecord('customrecord_lmsc', null, userCtFlt, userCtCol);
											
											if (userCtRs && userCtRs.length > 0)
											{
												//Set Contract ID
												origRecObj.setFieldValue('custrecord_lmslc_contract', userCtRs[0].getValue('internalid'));
												
												stageProcessLog += '<li>Found Linked Contract ID: '+userCtRs[0].getValue('internalid')+
																   ' using User Contract External ID: '+
																   stageRecObj.getFieldValue('custrecord_lmslics_contractexternalid')+'</li>';
											}
											else
											{
												saveOrigRecord = false;
												stageProcessLog += '<li><span style="color:red">Unable to find Linked Contract using User Contract External ID: '+
																   stageRecObj.getFieldValue('custrecord_lmslics_contractexternalid')+'</span></li>';
											}
										}
										else
										{
											if (pracRefContractId)
											{
												//Set Contract ID
												origRecObj.setFieldValue('custrecord_lmslc_contract', pracRefContractId);
												
												stageProcessLog += '<li>Found Linked Contract ID: '+pracRefContractId+
																   ' as reference from Practice record</li>';
											}
											else
											{
												saveOrigRecord = false;
												stageProcessLog += '<li><span style="color:red">Unable to find Linked Contract because NO Rcopia Contract ID is '+
																   'passed in and no reference from practice was found</span></li>';
											}
										}
										
									}
									else
									{
										saveOrigRecord = false;
										stageProcessLog += '<li><span style="color:red">Unable to find Linked Practice using User Practice External ID: '+
														   stageRecObj.getFieldValue('custrecord_lmslics_practiceexternalid')+'</span></li>';
										
									}//end check for userCtRs
								}
								else
								{
									saveOrigRecord = false;
									stageProcessLog += '<li><span style="color:red">Unable to find Linked Practice because NO Rcopia Practice ID is passed in</span></li>';
								}
								
							}
							else
							{
								saveOrigRecord = false;
								stageProcessLog += '<li><span style="color:red">Unable to find Linked Location using Location Combo Key: '+locComboKey+'</span></li>';
							}//end check for userLocRs
						}
					}
					//All is Well: Save the origRecObj
					if (saveOrigRecord)
					{
						try 
						{
							//Turn it OFF to indicate that this was updated by Delta Process
							origRecObj.setFieldValue(mapJson.uiUpdatedField, 'F');
							
							var origId = nlapiSubmitRecord(origRecObj, true, true);
							
							stageRecObj.setFieldValue(mapJson.stageStatusField,'success');					
							stageProcessLog = '<li>Created/Updated Original Record ID: '+origId+'</li>'+
											  stageProcessLog;
							
						}
						catch (origerr)
						{
							stageRecObj.setFieldValue(mapJson.stageStatusField,'error');
							stageProcessLog = '<li><span style="color:red">ERROR saving Original Record: '+getErrText(origerr)+'</span></li>'+
											  stageProcessLog;
							
							log('error','Stage Record '+stageRecObj.getId(),'ERROR saving Original Record: '+getErrText(origerr));
						}
					} 
					else
					{
						stageRecObj.setFieldValue(mapJson.stageStatusField,'error');
					}
					
					stageRecObj.setFieldValue(mapJson.stageLogField,'<ol>'+stageProcessLog+'</ol>');
				}
				
				//Save staging record
				var updflds = [mapJson.stageStatusField,
				               mapJson.stageLogField],
					updvals = [stageRecObj.getFieldValue(mapJson.stageStatusField),
					           stageProcessLog];
				
				nlapiSubmitField(mapJson.stageRecId, procrs[i].getValue('internalid'), updflds, updvals);
				
				//stageRecObj = nlapiLoadRecord(mapJson.stageRecId, procrs[i].getValue('internalid')),
				//Set % completed of script processing
				var pctCompleted = Math.round(((i+1) / procrs.length) * 100);
				nlapiGetContext().setPercentComplete(pctCompleted);
				
				//Reschedule Logic here in case it runs out of governance for THIS Stage
				//set isRescheduled here to indicate that there are still records to process for THIS Stage
				if ((i+1)==1000 || ((i+1) < procrs.length && nlapiGetContext().getRemainingUsage() < 1000)) 
				{
					//Internal reschedule
					log('audit','Getting Rescheduled at', procrs[i].getValue('internalid')+' with '+paramStageRecId+' // Usage: '+nlapiGetContext().getRemainingUsage());
					var rparam = new Object();
					rparam['custscript_sb135_stagerecid'] = paramStageRecId;
					rparam['custscript_sb135_lastprocid'] = procrs[i].getValue('internalid');
					rparam['custscript_sb135_minextid']=paramMinExternalID;
					rparam['custscript_sb135_maxextid']=paramMaxExternalID;
					rparam['custscript_sb135_extfldid']=paramExternalFldId;
					rparam['custscript_sb135_subqueueid'] = paramMonitorSubQueueId;
					
					//7/13/2016 - Also pass in Retry Queue ID 
					rparam['custscript_sb135_retryqid'] = paramRetryQueueId;
					
					nlapiScheduleScript(nlapiGetContext().getScriptId(), nlapiGetContext().getDeploymentId(), rparam);
					
					isRescheduled = true;
					
					break;
				}
			}
		}
		
		//NEED REshcedule logic to start NEXT Record Processing
		if (!isRescheduled)
		{
			//6/23/2016 - LMS Enhancement Update for THIS Sub Queue
			if (paramMonitorSubQueueId)
			{
				var eastDateTime = new Date();
				//Manuall Convert current date to East Time by adding 3 hours
				eastDateTime = eastDateTime.getTime() + 10800000;
				eastDateTime = new Date(eastDateTime);
				
				//Update the Sub Queue with this update
				nlapiSubmitField(
					'customrecord_lmssubqueue', 
					paramMonitorSubQueueId, 
					['custrecord_lmssq_status','custrecord_lmssq_detail','custrecord_lmssq_subqueue_compdatetime'], 
					['2', //Set it to Success
					 'Completed Stage to Actual Syncing for This Sub Queue',
					 nlapiDateToString(eastDateTime, 'datetimetz')], 
					true
				);
			}
			
			//At this point, we check to see what the NEXT step is
			if (paramStageRecId == 'contract')
			{
				log('audit','Reschedule for Practice','Reschedule for Practice');
				paramStageRecId = 'practice';
			}
			else if (paramStageRecId == 'practice')
			{
				log('audit','Reschedule for location','Reschedule for location');
				paramStageRecId = 'location';
			}
			else if (paramStageRecId == 'location')
			{
				log('audit','Reschedule for User','Reschedule for User');
				paramStageRecId = 'user';
			}
			else if (paramStageRecId == 'user')
			{
				//ALL Processing is DONE. Kick off Make User Location Primary 
				return;
			}
			
			//7/13/2016 - ONLY do this if Retry Queue ID is NOT passed in
			if (!paramRetryQueueId)
			{
				//Manually queue up adhoc scheduler with next step instead of waiting
				var rrparam = new Object();
				rrparam['custscript_sb146_stagerecid'] = paramStageRecId;
				nlapiScheduleScript('customscript_axlms_deltaprocscheler', 'customdeploy_axlms_deltaprocadhoc', rrparam);
			}
		}
	}
	catch (procerr)
	{
		log('error','Error Proc Delta',getErrText(procerr));
		
		var rparam = {
	    	'custscript_sb135_stagerecid':paramStageRecId,
	    	'custscript_sb135_minextid':paramMinExternalID,
	    	'custscript_sb135_maxextid':paramMaxExternalID,
	    	'custscript_sb135_extfldid':paramExternalFldId,
	    	'custscript_sb135_subqueueid':paramMonitorSubQueueId,
	    	//7/13/2016 - Also pass in Retry Queue ID 
			'custscript_sb135_retryqid':paramRetryQueueId
	    };
		
		if (getErrText(procerr).indexOf('SSS_TIME_LIMIT_EXCEEDED') > -1)
		{
			//Error occured due to Time Out issue. Reschedule to process
			//Queue it up
	    	
	    	nlapiSendEmail(-5, 'drfirst@audaxium.com', 'Delta Process Script Time Limit Exceeded', 'Script is reshceduled due to time out with below parameters: <br/>'+JSON.stringify(rparam));
	    	
	    	nlapiScheduleScript(nlapiGetContext().getScriptId(), null, rparam);
		}
		else
		{
			//6/23/2016 - LMS Enhancement Update for THIS Sub Queue
			if (paramMonitorSubQueueId)
			{
				var eastDateTime = new Date();
				//Manuall Convert current date to East Time by adding 3 hours
				eastDateTime = eastDateTime.getTime() + 10800000;
				eastDateTime = new Date(eastDateTime);
				
				//Update the Sub Queue with this update
				nlapiSubmitField(
					'customrecord_lmssubqueue', 
					paramMonitorSubQueueId, 
					['custrecord_lmssq_status','custrecord_lmssq_detail','custrecord_lmssq_subqueue_compdatetime'], 
					['3', //Set it to Failed
					 'Failed to complete Stage to Actual Syncing Processes // '+getErrText(procerr),
					 nlapiDateToString(eastDateTime,'datetimetz')], 
					true
				);
			}
			
			throw nlapiCreateError('DELTA_PROC_ERR', 'Unexpected Error occured: '+JSON.stringify(rparam)+' // Error: '+getErrText(procerr), false);
		}
	}
	
}

/**
 * Returns Columns to Staging record field mapping.
 * This assumes CSV file added by Rcopia will always be the same and 
 * it follows Sample Provided to Rcopia team.
 * @param fileHeaderCols
 * @param recordTypeValue
 */
function getMappingDef(recordTypeValue)
{
	var mapJson = {
		"map":{},
		"error":false,
		"stageRecId":"",
		"deltaDateField":"",
		"csvFileField":""
	};
	switch(recordTypeValue) {
    case 'contract':
        //CONTRACT Contract Name, 0
    	//CONTRACT Contract Type, 1
    	//CONTRACT Contract Manager, 2
    	//CONTRACT Contract Username, 3
    	//CONTRACT Rcopia Contract Id 4
    	//Contract Access Region 5
    	//Contract Start Date 6
    	//Contract End Date 7
    	//Contract Available Regions 8	
    	//Contract Active Status 9
    	//NetSuite ID 10
    	//Firstname 11
    	//Lastname 12
    	//Email 13
    	//IsTest 14
    	//RcopiaCreatedDate 15 [Not Used]
    	
    	//type of value will use setFieldValue
    	//type of text will use setFieldText
    	mapJson.map[0] = {
    		'fieldid':'name',
    		'type':'value',
    		'fieldtype':'text',
    		'master':'Both',
    		'tofieldid':'name',
    		'tofieldtype':'text'
    	};
    	
    	mapJson.map[1] = {
    		'fieldid':'custrecord_lmscts_type',
    		'type':'text',
    		'fieldtype':'select',
    		'master':'Both',
    		'tofieldid':'custrecord_lmsct_type',
    		'tofieldtype':'select'
    	};
    	
    	mapJson.map[2] = {
    		'fieldid':'custrecord_lmscts_ctmanager',
    		'type':'value',
    		'fieldtype':'text',
    		'master':'Both',
    		'tofieldid':'custrecord_lmsct_ctmanager',
    		'tofieldtype':'text'
    	};
    	
    	mapJson.map[3] = {
    		'fieldid':'custrecord_lmscts_username',
    		'type':'value',
    		'fieldtype':'text',
    		'master':'Both',
    		'tofieldid':'custrecord_lmsct_username',
    		'tofieldtype':'text'
    	};
    	
    	mapJson.map[4] = {
    		'fieldid':'custrecord_lmscts_externalid',
    		'type':'value',
    		'fieldtype':'text',
    		'master':'Rcopia',
    		'tofieldid':'custrecord_lmsct_externalid',
    		'tofieldtype':'text'
    	};
    	
    	mapJson.map[5] = {
    		'fieldid':'custrecord_lmscts_accessregion',
    		'type':'text',
    		'fieldtype':'select',
    		'master':'Rcopia',
    		'tofieldid':'custrecord_lmsct_accessregion',
    		'tofieldtype':'select'
    	};
    	
    	mapJson.map[6] = {
    		'fieldid':'custrecord_lmscts_startdate',
    		'type':'value',
    		'fieldtype':'datetime',
    		'master':'Both',
    		'tofieldid':'custrecord_lmsct_startdate',
    		'tofieldtype':'datetime'
    	};
    	
    	mapJson.map[7] = {
    		'fieldid':'custrecord_lmscts_endate',
    		'type':'value',
    		'fieldtype':'datetime',
    		'master':'Both',
    		'tofieldid':'custrecord_lmsct_endate',
    		'tofieldtype':'datetime'
    	};
    	
    	mapJson.map[8] = {
        		'fieldid':'custrecord_lmscts_availregions',
        		'type':'text',
        		'fieldtype':'multiselect',
        		'master':'Both',
        		'tofieldid':'custrecord_lmsct_availregions',
        		'tofieldtype':'multiselect'
        	};
    	
    	mapJson.map[9] = {
        		'fieldid':'custrecord_lmscts_activestatus',
        		'type':'text',
        		'fieldtype':'select',
        		'master':'Both',
        		'tofieldid':'custrecord_lmsct_activestatus',
        		'tofieldtype':'select'
        	};
    	
    	mapJson.map[10] = {
        		'fieldid':'custrecord_lmscts_orginternalid',
        		'type':'value',
        		'fieldtype':'select',
        		'master':'Both',
        		'tofieldid':'internalid',
        		'tofieldtype':'select'
        	};
    	
    	mapJson.map[11] = {
        		'fieldid':'custrecord_lmscts_firstname',
        		'type':'value',
        		'fieldtype':'text',
        		'master':'Both',
        		'tofieldid':'custrecord_lmsct_contactfname',
        		'tofieldtype':'text'
        	};
    	
    	mapJson.map[12] = {
        		'fieldid':'custrecord_lmscts_lastname',
        		'type':'value',
        		'fieldtype':'text',
        		'master':'Both',
        		'tofieldid':'custrecord_lmsct_contactlname',
        		'tofieldtype':'text'
        	};
    	
    	mapJson.map[13] = {
        		'fieldid':'custrecord_lmscts_email',
        		'type':'value',
        		'fieldtype':'text',
        		'master':'Both',
        		'tofieldid':'custrecord_lmsct_contactemail',
        		'tofieldtype':'email'
        	};
    	
    	mapJson.map[14] = {
        		'fieldid':'custrecord_lmscts_istest',
        		'type':'value',
        		'fieldtype':'checkbox',
        		'master':'Both',
        		'tofieldid':'custrecord_lmsct_istest',
        		'tofieldtype':'checkbox'
        	};
    	
    	//Set dynamic field values
    	mapJson.stageRecId = 'customrecord_lmsc_stage';
    	mapJson.originalRefField = 'custrecord_lmscts_orginternalid';
    	mapJson.originalRecId = 'customrecord_lmsc';
    	mapJson.originalExternalId = 'custrecord_lmsct_externalid';
    	mapJson.stagingExternalId = 'custrecord_lmscts_externalid';
    	mapJson.deltaDateField = 'custrecord_lmscts_deltadate';
    	mapJson.csvFileField = 'custrecord_lmscts_csvfile';
    	mapJson.stageStatusField = 'custrecord_lmscts_status';
    	mapJson.stageLogField = 'custrecord_lmscts_log';
    	//Added 6/22/2016 - Monitor Enhancement
    	mapJson.stageQueueId = 'custrecord_lmscts_queue';
    	
    	mapJson.uiUpdatedField = 'custrecord_lmsct_uiupdateddt';
    	
    	mapJson.error=false;
        break;
    
    case 'practice':
    	//PRACTICE Practice Name 0
    	//PRACTICE Practice Username 1	
    	//PRACTICE Rcopia Practice Id 2 (Practice External ID)
    	//Practice Rcopia Contract Id 3 (Contract External ID) 
    	//PRACTICE Address1 4	
    	//PRACTICE Address2	5
    	//PRACTICE City	6
    	//PRACTICE Statecode 7
    	//PRACTICE Zip 8	
    	//PRACTICE Region 9	
    	//PRACTICE Phonenumber1 10	
    	//PRACTICE Faxnumber 11	
    	//PRACTICE Active 12 
    	//Netsuite ID 13
    	//IsTest 14
    	//RcopiaCreatedDate 15 [NOT USED]

    	//type of value will use setFieldValue
    	//type of text will use setFieldText
    	mapJson.map[0] = {
    		'fieldid':'name',
    		'type':'value',
    		'fieldtype':'text',
    		'master':'Rcopia',
    		'tofieldid':'name',
    		'tofieldtype':'text'
    	};
    	
    	mapJson.map[1] = {
    		'fieldid':'custrecord_lmsps_username',
    		'type':'value',
    		'fieldtype':'text',
    		'master':'Rcopia',
    		'tofieldid':'custrecord_lmsp_username',
    		'tofieldtype':'text'
    	};
    	
    	mapJson.map[2] = {
    		'fieldid':'custrecord_lmsps_externalid',
    		'type':'value',
    		'fieldtype':'text',
    		'master':'Rcopia',
    		'tofieldid':'custrecord_lmsp_externalid',
    		'tofieldtype':'text'
    	};
    	
    	mapJson.map[3] = {
        		'fieldid':'custrecord_lmsps_contractexternalid',
        		'type':'value',
        		'fieldtype':'text',
        		'master':'Rcopia',  //Both means which ever has later last modified date WINS IF values are different
        		'tofieldid':'internalid', //mark it to internalid so that it's skipped for Processing
        		'tofieldtype':'text'
        	};
    	
    	mapJson.map[4] = {
    		'fieldid':'custrecord_lmsps_addr1',
    		'type':'value',
    		'fieldtype':'text',
    		'master':'Rcopia',  //Both means which ever has later last modified date WINS IF values are different
    		'tofieldid':'custrecord_lmsp_addr1',
    		'tofieldtype':'text'
    	};
    	
    	mapJson.map[5] = {
    		'fieldid':'custrecord_lmsps_addr2',
    		'type':'value',
    		'fieldtype':'text',
    		'master':'Rcopia',
    		'tofieldid':'custrecord_lmsp_addr2',
    		'tofieldtype':'text'
    	};
    	
    	mapJson.map[6] = {
    		'fieldid':'custrecord_lmsps_city',
    		'type':'value',
    		'fieldtype':'text',
    		'master':'Rcopia',
    		'tofieldid':'custrecord_lmsp_city',
    		'tofieldtype':'text'
    	};
    	
    	mapJson.map[7] = {
    		'fieldid':'custrecord_lmsps_state',
    		'type':'value',
    		'fieldtype':'text',
    		'master':'Rcopia',
    		'tofieldid':'custrecord_lmsp_state',
    		'tofieldtype':'select'
    	};
    	mapJson.map[8] = {
        	'fieldid':'custrecord_lmsps_zip',
        	'type':'value',
    		'fieldtype':'text',
    		'master':'Rcopia',
    		'tofieldid':'custrecord_lmsp_zip',
    		'tofieldtype':'text'
        };
        	
        mapJson.map[9] = {
        	'fieldid':'custrecord_lmsps_accessregion',
        	'type':'text',
    		'fieldtype':'select',
    		'master':'Rcopia',
    		'tofieldid':'custrecord_lmsp_accessregion',
    		'tofieldtype':'select'
        };
        	
        mapJson.map[10] = {
        	'fieldid':'custrecord_lmsps_phone',
        	'type':'value',
    		'fieldtype':'text',
    		'master':'Rcopia',
    		'tofieldid':'custrecord_lmsp_phone',
    		'tofieldtype':'text'
        };
        	
        mapJson.map[11] = {
        	'fieldid':'custrecord_lmsps_fax',
        	'type':'text',
    		'fieldtype':'text',
    		'master':'Rcopia',
    		'tofieldid':'custrecord_lmsp_fax',
    		'tofieldtype':'text'
        };
        
        mapJson.map[12] = {
            	'fieldid':'custrecord_lmsps_activestatus',
            	'type':'text',
        		'fieldtype':'select',
        		'master':'Rcopia',
        		'tofieldid':'custrecord_lmsp_activestatus',
        		'tofieldtype':'select'
            };
        
        mapJson.map[13] = {
        		'fieldid':'custrecord_lmsps_internalid',
        		'type':'value',
        		'fieldtype':'select',
        		'master':'Both',
        		'tofieldid':'internalid',
        		'tofieldtype':'select'
        	};
        
        mapJson.map[14] = {
        		'fieldid':'custrecord_lmsps_istest',
        		'type':'value',
        		'fieldtype':'checkbox',
        		'master':'Both',
        		'tofieldid':'custrecord_lmsp_istest',
        		'tofieldtype':'checkbox'
        	};
        
    	//Set dynamic field values
    	mapJson.stageRecId = 'customrecord_lmsp_stage';
    	mapJson.originalRefField = 'custrecord_lmsps_internalid';
    	mapJson.originalRecId = 'customrecord_lmsp';
    	mapJson.originalExternalId = 'custrecord_lmsp_externalid';
    	mapJson.deltaDateField = 'custrecord_lmsps_deltadate';
    	mapJson.csvFileField = 'custrecord_lmsps_csvfile';
    	mapJson.stageStatusField = 'custrecord_lmsps_status';
    	mapJson.stagingExternalId = 'custrecord_lmsps_externalid';
    	mapJson.stageLogField = 'custrecord_lmsps_log';
    	//Added 6/22/2016 - Monitor Enhancement
    	mapJson.stageQueueId = 'custrecord_lmsps_queue';
    	
    	mapJson.uiUpdatedField = 'custrecord_lmsp_uiupdateddt';
    	
    	mapJson.error=false;
        break;
    
    case 'location':
    	//Location Access Region 0
    	//LOCATION Address1 1	
    	//LOCATION Address2	2
    	//LOCATION City 3
    	//LOCATION Statecode 4	
    	//LOCATION Zip 5
    	//LOCATION Faxnumber 6
    	//LOCATION Location Name 7
    	//LOCATION Phonenumber1 8 
    	//LOCATION ID 9
    	//LOCATION Practice Rcopia ID 10
    	//LOCATION Rcopia ID (Combo) 11
    	//Netsuite ID 12
    	//IsTest 13
    	//IsDeleted 14
    	//RcopiaCreatedDate 15 [NOT USED]

    	//type of value will use setFieldValue
    	//type of text will use setFieldText
    	mapJson.map[0] = {
    		'fieldid':'custrecord_lmsls_accessregion',
    		'type':'text',
    		'fieldtype':'select',
    		'master':'Rcopia',
    		'tofieldid':'custrecord_lmsl_accessregion',
    		'tofieldtype':'select'
    	};
    	
    	mapJson.map[1] = {
    		'fieldid':'custrecord_lmsls_addr1',
    		'type':'value',
    		'fieldtype':'text',
    		'master':'Rcopia',
    		'tofieldid':'custrecord_lmsl_addr1',
    		'tofieldtype':'text'
    	};
    	
    	mapJson.map[2] = {
    		'fieldid':'custrecord_lmsls_addr2',
    		'type':'value',
    		'fieldtype':'text',
    		'master':'Rcopia',
    		'tofieldid':'custrecord_lmsl_addr2',
    		'tofieldtype':'text'
    	};
    	
    	mapJson.map[3] = {
    		'fieldid':'custrecord_lmsls_city',
    		'type':'value',
    		'fieldtype':'text',
    		'master':'Rcopia',
    		'tofieldid':'custrecord_lmsl_city',
    		'tofieldtype':'text'
    	};
    	
    	mapJson.map[4] = {
    		'fieldid':'custrecord_lmsls_stat',
    		'type':'value',
    		'fieldtype':'text',
    		'master':'Rcopia',
    		'tofieldid':'custrecord_lmsl_state',
    		'tofieldtype':'select'
    	};
    	
    	mapJson.map[5] = {
    		'fieldid':'custrecord_lmsls_zip',
    		'type':'value',
    		'fieldtype':'text',
    		'master':'Rcopia',
    		'tofieldid':'custrecord_lmsl_zip',
    		'tofieldtype':'text'
    	};
    	
    	mapJson.map[6] = {
    		'fieldid':'custrecord_lmsls_fax',
    		'type':'value',
    		'fieldtype':'text',
    		'master':'Rcopia',
    		'tofieldid':'custrecord_lmsl_fax',
    		'tofieldtype':'text'
    	};
    	
    	mapJson.map[7] = {
    		'fieldid':'name',
    		'type':'value',
    		'fieldtype':'text',
    		'master':'Rcopia',
    		'tofieldid':'name',
    		'tofieldtype':'text'
    	};
    	
    	mapJson.map[8] = {
        	'fieldid':'custrecord_lmsls_phone',
        	'type':'value',
    		'fieldtype':'text',
    		'master':'Rcopia',
    		'tofieldid':'custrecord_lmsl_phone',
    		'tofieldtype':'text'
        };
        	
        mapJson.map[9] = {
        	'fieldid':'custrecord_lmsls_locationid',
        	'type':'value',
    		'fieldtype':'text',
    		'master':'Rcopia',
    		'tofieldid':'custrecord_lmsl_locationid',
    		'tofieldtype':'text'
        };
        	
        mapJson.map[10] = {
        	'fieldid':'custrecord_lmsls_practiceexternalid',
        	'type':'value',
    		'fieldtype':'text',
    		'master':'Rcopia',
    		'tofieldid':'internalid', //Marked as internal ID so that it will skip processing. Still need it for load mapping
    		'tofieldtype':'select'
        };
        
        mapJson.map[11] = {
        		'fieldid':'custrecord_lmsls_externalid', //Combo practiceEXT-locationID
        		'type':'value',
        		'fieldtype':'text',
        		'master':'Rcopia',
        		'tofieldid':'internalid', //Marked as internal ID so that it will skip processing. Still need it for load mapping
        		'tofieldtype':'select'
        	};
        
        
        mapJson.map[12] = {
        		'fieldid':'custrecord_lmsls_internalid',
        		'type':'value',
        		'fieldtype':'select',
        		'master':'Both',
        		'tofieldid':'internalid', //Marked as internal ID so that it will skip processing. Still need it for load mapping
        		'tofieldtype':'select'
        	};
        
        mapJson.map[13] = {
        		'fieldid':'custrecord_lmsls_istest',
        		'type':'value',
        		'fieldtype':'checkbox',
        		'master':'Both',
        		'tofieldid':'custrecord_lmsl_istest', 
        		'tofieldtype':'checkbox'
        	};
        
        mapJson.map[14] = {
        		'fieldid':'custrecord_lmsls_isdeleted',
        		'type':'value',
        		'fieldtype':'checkbox',
        		'master':'Both',
        		'tofieldid':'custrecord_lmsl_isdeleted', 
        		'tofieldtype':'checkbox'
        	};
        
    	//Set dynamic field values
    	mapJson.stageRecId = 'customrecord_lmsl_stage';
    	mapJson.originalRefField = 'custrecord_lmsls_internalid';
    	mapJson.originalRecId = 'customrecord_lmsl';
    	mapJson.originalExternalId = 'custrecord_lmsl_externalid';
    	mapJson.deltaDateField = 'custrecord_lmsls_deltadate';
    	mapJson.csvFileField = 'custrecord_lmsls_csvfile';
    	mapJson.stageStatusField = 'custrecord_lmsls_status';
    	mapJson.stagingExternalId = 'custrecord_lmsls_externalid';
    	mapJson.stageLogField = 'custrecord_lmsls_log';
    	//Added 6/22/2016 - Monitor Enhancement
    	mapJson.stageQueueId = 'custrecord_lmsls_queue';
    	
    	mapJson.uiUpdatedField = 'custrecord_lmsl_uiupdateddt';
    	
    	mapJson.error=false;
        break;
        
    case 'user':
    case 'license':
    	//Rcopia Combo Location ID 0
    	//Rcopia Location Id 1
    	//Rcopia Practice Id 2
    	//USER User Id 3 (Numeric)	
    	//USER Username 4	
    	//User Rcopia ID (Name/ExternalID) 5
    	//USER First Name 6	
    	//USER Last Name 7	
    	//USER Suffix 8
    	//USER Prefix 9	
    	//USER Active Status 10
    	//USER Account Type 11	
    	//USER Enabled Date 12	
    	//USER Address1 13	
    	//USER Address2 14	
    	//USER City 15	
    	//USER Statecode 16 
    	//USER Zip 17	
    	//USER Phonenumber1 18
    	//USER Faxnumber 19	
    	//USER Email Address 20
    	//USER DEA 21	
    	//USER NPI 22
    	//USER Med License Num 23
    	//USER Region 24	
    	//USER Specialty 25	
    	//USER Last Login Date 26
    	//USER Mu User 27
    	//USER Contract Start Date 28
    	//USER Contract End Date 29
    	//USER First RX Date 30
    	//USER Last Rx Date 31
    	//User Promo Code 32
    	//Netsuite ID 33
    	//Contract External ID 34
    	//Enabled Reason 35
    	//Lost Reason	36
    	//Rcopia Created Date 37
    	//IsTest 38
    	//IsDeleted 39
    	
    	//type of value will use setFieldValue
    	//type of text will use setFieldText
    	
    	mapJson.map[0] = {
    		'fieldid':'custrecord_lmslics_locationexternalid', //THIS SHOULD BE COMBO
    		'type':'value',
    		'fieldtype':'text',
    		'master':'Rcopia',
    		'tofieldid':'internalid', //Marked as internal ID so it is skipped by processor
    		'tofieldtype':'select'
    	};
    	
    	//10/22/2015 - Add Location Stand alone ID back in
    	//custrecord_lmslics_locationstaid
    	mapJson.map[1] = {
        	'fieldid':'custrecord_lmslics_locationstaid', 
        	'type':'value',
        	'fieldtype':'text',
        	'master':'Rcopia',
       		'tofieldid':'custrecord_lmslc_locationstaid', 
       		'tofieldtype':'text'
        };
    	
    	mapJson.map[2] = {
    		'fieldid':'custrecord_lmslics_practiceexternalid',
    		'type':'value',
    		'fieldtype':'text',
    		'master':'Rcopia',
    		'tofieldid':'internalid', //Marked as internal ID so it is skipped by processor
    		'tofieldtype':'select'
    	};
    	
    	mapJson.map[3] = {
    		'fieldid':'custrecord_lmslics_userid',
    		'type':'value',
    		'fieldtype':'text',
    		'master':'Rcopia',
    		'tofieldid':'custrecord_lmslc_userid',
    		'tofieldtype':'text'
    	};
    	
    	mapJson.map[4] = {
    		'fieldid':'custrecord_lmslics_username',
    		'type':'value',
    		'fieldtype':'text',
    		'master':'Rcopia',
    		'tofieldid':'custrecord_lmslc_username',
    		'tofieldtype':'text'
    	};
    	
    	//Processor will automatically set the value of name to match this external ID (This is Combo Key)
    	mapJson.map[5] = {
    		'fieldid':'custrecord_lmslics_externalid',
    		'type':'value',
    		'fieldtype':'text',
    		'master':'Rcopia',
    		'tofieldid':'custrecord_lmslc_externalid',
    		'tofieldtype':'text'
    	};
    	
    	mapJson.map[6] = {
    		'fieldid':'custrecord_lmslics_firstname',
    		'type':'value',
    		'fieldtype':'text',
    		'master':'Rcopia',
    		'tofieldid':'custrecord_lmslc_firstname',
    		'tofieldtype':'text'
    	};
    	
    	mapJson.map[7] = {
    		'fieldid':'custrecord_lmslics_lastname',
    		'type':'value',
    		'fieldtype':'text',
    		'master':'Rcopia',
    		'tofieldid':'custrecord_lmslc_lastname',
    		'tofieldtype':'text'
    	};
    	
    	mapJson.map[8] = {
    		'fieldid':'custrecord_lmslics_usersuffix',
    		'type':'value',
    		'fieldtype':'text',
    		'master':'Rcopia',
    		'tofieldid':'custrecord_lmslc_usersuffix',
    		'tofieldtype':'text'
    	};
    	mapJson.map[9] = {
        	'fieldid':'custrecord_lmslics_userprefix',
        	'type':'value',
    		'fieldtype':'text',
    		'master':'Rcopia',
    		'tofieldid':'custrecord_lmslc_userprefix',
    		'tofieldtype':'text'
        };
        	
        mapJson.map[10] = {
        	'fieldid':'custrecord_lmslics_acctstatus',
        	'type':'text',
    		'fieldtype':'select',
    		'master':'Both',
    		'tofieldid':'custrecord_lmslc_status',
    		'tofieldtype':'select'
        };
        	
        mapJson.map[11] = {
        	'fieldid':'custrecord_lmslics_licensetype',
        	'type':'text',
    		'fieldtype':'select',
    		'master':'Rcopia',
    		'tofieldid':'custrecord_lmslc_licensetype',
    		'tofieldtype':'select'
        };
        
        mapJson.map[12] = {
            'fieldid':'custrecord_lmslics_enableddate',
            'type':'value',
    		'fieldtype':'datetime',
    		'master':'Rcopia',
    		'tofieldid':'custrecord_lmslc_userenableddate',
    		'tofieldtype':'datetime'
        };

        mapJson.map[13] = {
                'fieldid':'custrecord_lmslics_addr1',
                'type':'value',
        		'fieldtype':'text',
        		'master':'Rcopia',
        		'tofieldid':'custrecord_lmslc_useraddr1',
        		'tofieldtype':'text'
            };

        mapJson.map[14] = {
                'fieldid':'custrecord_lmslics_addr2',
                'type':'value',
        		'fieldtype':'text',
        		'master':'Rcopia',
        		'tofieldid':'custrecord_lmslc_useraddr2',
        		'tofieldtype':'text'
            };
        
        mapJson.map[15] = {
                'fieldid':'custrecord_lmslics_city',
                'type':'value',
        		'fieldtype':'text',
        		'master':'Rcopia',
        		'tofieldid':'custrecord_lmslc_usercity',
        		'tofieldtype':'text'
            };
        
        mapJson.map[16] = {
                'fieldid':'custrecord_lmslics_state',
                'type':'value',
        		'fieldtype':'text',
        		'master':'Rcopia',
        		'tofieldid':'custrecord_lmslc_userstatedd',
        		'tofieldtype':'select'
            };
        
        mapJson.map[17] = {
                'fieldid':'custrecord_lmslics_zip',
                'type':'value',
        		'fieldtype':'text',
        		'master':'Rcopia',
        		'tofieldid':'custrecord_lmslc_userzip',
        		'tofieldtype':'text'
            };
        
        mapJson.map[18] = {
                'fieldid':'custrecord_lmslics_phone',
                'type':'value',
        		'fieldtype':'text',
        		'master':'Rcopia',
        		'tofieldid':'custrecord_lmslc_userphone',
        		'tofieldtype':'text'
            };
        
        mapJson.map[19] = {
                'fieldid':'custrecord_lmslics_fax',
                'type':'value',
        		'fieldtype':'text',
        		'master':'Rcopia',
        		'tofieldid':'custrecord_lmslc_userfax',
        		'tofieldtype':'text'
            };
        
        mapJson.map[20] = {
                'fieldid':'custrecord_lmslics_email',
                'type':'value',
        		'fieldtype':'text',
        		'master':'Rcopia',
        		'tofieldid':'custrecord_lmslc_email',
        		'tofieldtype':'text'
            };
        
        mapJson.map[21] = {
                'fieldid':'custrecord_lmslics_dea',
                'type':'value',
        		'fieldtype':'text',
        		'master':'Rcopia',
        		'tofieldid':'custrecord_lmslc_dea',
        		'tofieldtype':'text'
            };
        
        mapJson.map[22] = {
                'fieldid':'custrecord_lmslics_npi',
                'type':'value',
        		'fieldtype':'text',
        		'master':'Rcopia',
        		'tofieldid':'custrecord_lmslc_npi',
        		'tofieldtype':'text'
            };
        
        mapJson.map[23] = {
                'fieldid':'custrecord_lmslics_medlicnum',
                'type':'value',
        		'fieldtype':'text',
        		'master':'Rcopia',
        		'tofieldid':'custrecord_lmslc_medlicnum',
        		'tofieldtype':'text'
            };
        
        mapJson.map[24] = {
                'fieldid':'custrecord_lmslics_accessregion',
                'type':'text',
        		'fieldtype':'select',
        		'master':'Rcopia',
        		'tofieldid':'custrecord_lmslc_accessregion',
        		'tofieldtype':'select'
            };
        
        mapJson.map[25] = {
                'fieldid':'custrecord_lmslics_specialty',
                'type':'text',
        		'fieldtype':'multiselect',
        		'master':'Rcopia',
        		'tofieldid':'custrecord_lmslc_specialty',
        		'tofieldtype':'multiselect'
            };
        
        mapJson.map[26] = {
                'fieldid':'custrecord_lmslics_lastlogindt',
                'type':'value',
        		'fieldtype':'datetime',
        		'master':'Rcopia',
        		'tofieldid':'custrecord_lmslc_userlastlogindate',
        		'tofieldtype':'datetime'
            };
                
        mapJson.map[27] = {
                'fieldid':'custrecord_lmslics_muuser',
                'type':'value',
                'fieldtype':'text',
        		'master':'Rcopia',
        		'tofieldid':'custrecord_lmslc_muuser',
        		'tofieldtype':'text'
            };
        
        mapJson.map[28] = {
                'fieldid':'custrecord_lmslics_startdt',
                'type':'value',
        		'fieldtype':'datetime',
        		'master':'Both',
        		'tofieldid':'custrecord_lmslc_startdt',
        		'tofieldtype':'datetime'
            };
        
        mapJson.map[29] = {
                'fieldid':'custrecord_lmslics_enddt',
                'type':'value',
        		'fieldtype':'datetime',
        		'master':'Both',
        		'tofieldid':'custrecord_lmslc_enddt',
        		'tofieldtype':'datetime'
            };
        
        mapJson.map[30] = {
                'fieldid':'custrecord_lmslics_rx1date',
                'type':'value',
        		'fieldtype':'datetime',
        		'master':'Rcopia',
        		'tofieldid':'custrecord_lmslc_rx1date',
        		'tofieldtype':'datetime'
            };
        
        mapJson.map[31] = {
                'fieldid':'custrecord_lmslics_lastrxdate',
                'type':'value',
        		'fieldtype':'datetime',
        		'master':'Rcopia',
        		'tofieldid':'custrecord_lmslc_userastrxdate',
        		'tofieldtype':'datetime'
            };
        
        mapJson.map[32] = {
                'fieldid':'custrecord_lmslics_userpromocode',
                'type':'text',
        		'fieldtype':'select',
        		'master':'Rcopia',
        		'tofieldid':'custrecord_lmslc_promocode',
        		'tofieldtype':'select'
            };
        
        mapJson.map[33] = {
        		'fieldid':'custrecord_lmslics_internalid',
        		'type':'value',
        		'fieldtype':'select',
        		'master':'Both',
        		'tofieldid':'internalid',
        		'tofieldtype':'select'
        	};
        
    	mapJson.map[34] = {
        		'fieldid':'custrecord_lmslics_contractexternalid',
        		'type':'value',
        		'fieldtype':'text',
        		'master':'Rcopia',
        		'tofieldid':'custrecord_lmslc_contract',
        		'tofieldtype':'select'
        	};
        
    	mapJson.map[35] = {
        		'fieldid':'custrecord_lmslics_enablereason',
        		'type':'text',
        		'fieldtype':'select',
        		'master':'Both',
        		'tofieldid':'custrecord_lmslc_enablereason',
        		'tofieldtype':'select'
        	};
        
    	mapJson.map[36] = {
        		'fieldid':'custrecord_lmslics_lossreason',
        		'type':'text',
        		'fieldtype':'select',
        		'master':'Both',
        		'tofieldid':'custrecord_lmslc_lossreason',
        		'tofieldtype':'select'
        	};
        
        mapJson.map[37] = {
        		'fieldid':'custrecord_lmslics_rcopiacreateddate',
        		'type':'value',
        		'fieldtype':'datetime',
        		'master':'Both',
        		'tofieldid':'custrecord_lmslc_rcopiacreateddate',
        		'tofieldtype':'datetime'
        	};
        
        mapJson.map[38] = {
        		'fieldid':'custrecord_lmslics_istest',
        		'type':'value',
        		'fieldtype':'checkbox',
        		'master':'Both',
        		'tofieldid':'custrecord_lmslc_istest',
        		'tofieldtype':'checkbox'
        	};
        
        mapJson.map[39] = {
        		'fieldid':'custrecord_lmslics_isdeleted',
        		'type':'value',
        		'fieldtype':'checkbox',
        		'master':'Both',
        		'tofieldid':'custrecord_lmslc_isdeleted',
        		'tofieldtype':'checkbox'
        	};
        
    	//Set dynamic field values
    	mapJson.stageRecId = 'customrecord_lmslic_stage';
    	mapJson.originalRefField = 'custrecord_lmslics_internalid';
    	mapJson.originalRecId = 'customrecord_lmslic';
    	mapJson.originalExternalId = 'custrecord_lmslc_externalid';
    	mapJson.deltaDateField = 'custrecord_lmslics_deltadate';
    	mapJson.csvFileField = 'custrecord_lmslics_csvfile';
    	mapJson.stageStatusField = 'custrecord_lmslics_status';
    	
    	mapJson.stagingExternalId = 'custrecord_lmslics_externalid';
    	mapJson.stageLogField = 'custrecord_lmslics_log';
    	//Added 6/22/2016 - Monitor Enhancement
    	mapJson.stageQueueId = 'custrecord_lmslics_queue';
    	
    	mapJson.uiUpdatedField = 'custrecord_lmslc_uiupdatedt';
    	
    	mapJson.error=false;
        break;
    default:
        mapJson.error = true;
	}
	
	return mapJson;
}