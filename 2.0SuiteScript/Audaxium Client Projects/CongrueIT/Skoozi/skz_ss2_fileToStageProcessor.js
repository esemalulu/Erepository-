/**
 * @NApiVersion 2.0
 * @NScriptType ScheduledScript
 * @NModuleScope SameAccount
 */
define(['N/error',
        'N/file', 
        'N/record', 
        'N/runtime', 
        'N/search', 
        'N/task',
        'N/format',
        'N/email',
        '/SuiteScripts/CongrueIT Customizations/UTILITY_LIB',
        '/SuiteScripts/CongrueIT Customizations/CUST_DATE_LIB',
        '/SuiteScripts/CongrueIT Customizations/Skoozi Transaction Integration/Skoozi_Sync_Helper'],
/**
 * @param {error} error
 * @param {file} file
 * @param {record} record
 * @param {runtime} runtime
 * @param {search} search
 * @param {transaction} transaction
 */
function(error, file, record, runtime, search, task, format, email,custUtil, custDate, skooziUtil) 
{
   
    /**
     * This is an unscheduled scheduled script that will get kicked off by Email Capture
     * once the file is successfully. This script will convert file content into individual 
     * database row into custom record. 
     * 
     * This script also contains ALL Company Level Preferences used by Skoozi integration customization
     *
     * @param {Object} scriptContext
     * @param {string} scriptContext.type - The context in which the script is executed. It is one of the values from the scriptContext.InvocationType enum.
     * @Since 2015.2
     */
	
	function executeScript(context) {
    	
    	var STATUS_PENDING = '1',
			STATUS_SUCCESS = '2',
			STATUS_PROC_ERROR = '3',
			STATUS_VAL_ERROR = '4',
			stageMap = {};
    	
    	try
    	{
    		//Grab list of script parameters
    			//Company Level Preferences
    			//param notification is single reference to employee id
    		var PARAM_NOTIFICATION = runtime.getCurrentScript().getParameter({
	    			'name':'custscript_sb59_senderrornotifto'
	    		}),
	    		PARAM_SYNC_FILE_FOLDER = runtime.getCurrentScript().getParameter({
	    			'name':'custscript_sb59_filefolderinternalid'
	    		}),
	    		//Script Level Preferences
    			fileToProcess = runtime.getCurrentScript().getParameter({
        			'name':'custscript_sb59_filetoprocess'
        		}),
        		
        		lastProcRow = runtime.getCurrentScript().getParameter({
        			'name':'custscript_sb59_lastprocrownum'
        		});
    		
    		//Error validatioin to make sure there is a file ID provided
        	if (!fileToProcess)
        	{
        		throw error.create({
        			'name':'MISSING_FILE_ID',
        			'message':'Missing Skoozi File ID to Process into Custom Record',
        			'notifyOff':true
        		});
        	}
        	
        	//1. Load the Pipe delimited file
        	var trxFile = file.load({
        		'id':fileToProcess
        	});
        	
        	//We need to find out what the Staging Custom Record will be with proper column mapping
        	var trxFileType = 'revenue',
        		trxFileName = trxFile.name;
        	
        	if (trxFile.name.indexOf('vendor') > -1)
        	{
        		trxFileType = 'vendor';
        	}

        	//get matching stageMap JSON object
        	stageMap = skooziUtil.getMapping(trxFileType);
        	
        	//2. We need to check and see if this file was prevoiusly processed before.
        	//	 ONLY do this when we know it is NOT a reschedule.
        	//	 If process got rescheduled, it will have a value for lastProcRow.
        	if (!lastProcRow)
        	{
        		var checkSearch = search.create({
	        		'type':stageMap.recid,
	        		'filters':[
	        		           	['isinactive','is',false],
	        		           	'and',
	        		           	[stageMap.syncfilefld, 'anyof', fileToProcess]
	        		          ],
	        		'columns':['internalid']
	        	}),
	        	checkrs = checkSearch.run().getRange({
	        		'start':0,
	        		'end':1
	        	});
        	
	        	//throw an error if we find matching file in the staging record
	        	if (checkrs.length > 0)
	        	{
	        		throw error.create({
	        			'name':'FILE_ALREADY_PROCESSED',
	        			'message':trxFile.name+' has already been processed into '+
	        					  trxFileType+' staging custom record. ',
	        			'notifyOff':true
	        		});
	        	}
        	}//End check for existing file being processed
        	
        	
        	//3 ------------- BUILD OUT JSON Look up values from list of Reference Tables -----------
        	//log.debug('Initial File Check Complete','Grab list of lookup Reference values');
	        	/**
	        	 * pmtTypeJson, trxTypeJson, serTypeJson talTypeJson
	    		 * [skoozi value]:{
	    		 * 	'id':'internalid',
	    		 *  'name':'netsuite name'
	    		 * }
	    		 */
        	var pmtTypeJson = skooziUtil.getPaymentTypeJson(),
        		trxTypeJson = skooziUtil.getCustomerTrxTypeJson(),
        		serTypeJson = skooziUtil.getServiceTypeJson(),
        		talTypeJson = skooziUtil.getTalentTypeJson();
        	
        	log.debug('pmtTypeJson', JSON.stringify(pmtTypeJson));
        	log.debug('trxTypeJson', JSON.stringify(trxTypeJson));
        	log.debug('serTypeJson', JSON.stringify(serTypeJson));
        	log.debug('talTypeJson', JSON.stringify(talTypeJson));
        	
        	//3. Build the header and row data array
        	var arContents = [];
        	
        	//Check to see what we character is used for returns
        	//log.debug('content',trxFile.getContents());
        	if (trxFile.getContents())
        	{
        		if (trxFile.getContents().indexOf('\r\n') > -1)
        		{
        			arContents = trxFile.getContents().split('\r\n');
        		}
        		else
        		{
        			//log.debug('splitting ','with n not rn');
        			arContents = trxFile.getContents().split('\n');
        		}
        	}
        	
        	//Check to make sure we have a value to process
        	if (arContents.length <=1)
        	{
        		throw error.create({
        			'name':'EMPTY_CONTENT',
        			'message':trxFile.name+' sync file is missing transaction data to process',
        			'notifyOff':true
        		});
        	}
        	
        	/*************** Lets go through and add in All records ***************/
        	//Start line will always be one since index 0 is the header information.
        	var startLine = 1,
        		isRescheduled = false;
        		
        	if (lastProcRow)
        	{
        		startLine = lastProcRow + 1;
        	}
        	
        	//Go through each row of Data file and add to appropriate staging record
        	//	We are simply going to add them all to the staging record.
        	//	The Processor will go through and do validation and mark it as failed
        	//	if data is missing.
        	for (var l=startLine; l < arContents.length; l+=1)
        	{
        		if (custUtil.strTrim(arContents[l]))
        		{
	        		var arRowData = arContents[l].split('|'),
	        			stageRec = record.create({
	        				'type':stageMap.recid,
	        				'isDynamic':true
	        			});
	        		
	        		//Set the load date
	        		stageRec.setValue({
	        			'fieldId':stageMap.statusfld,
	        			'value':STATUS_PENDING
	        		});
	        		
	        		//Set Original Raw Row Data.
	        		stageRec.setValue({
	        			'fieldId':stageMap.origfld,
	        			'value':arContents[l]
	        		});
	        		
	        		//Set the file being processed
	        		stageRec.setValue({
	        			'fieldId':stageMap.syncfilefld,
	        			'value':fileToProcess
	        		});
	        		
	        		//go through the mappedflds elements and set stageRec field values
	        		for (var col in stageMap.mappedflds)
	        		{
	        			var valueToSet = custUtil.strTrim(arRowData[col]),
	        				mappedFldId = stageMap.mappedflds[col].fldid;
	        			
	        			//log.debug('value // fld id',valueToSet+' // '+mappedFldId);
	        				
	        			//We are ONLY going to set the record field if the value exist.
	        			//	IF the value does exist, we are also going to make sure
	        			//	Data types match based on the field being set.
	            		if (valueToSet)
	            		{
	            			if (mappedFldId == 'custrecord_skzr_amount' || 
		            			mappedFldId == 'custrecord_skzr_discamt' ||
		            			mappedFldId == 'custrecord_skzv_amount')
	            			{
	            				//log.debug('Currency Value Float Convert', 'Field: '+mappedFldId+' // Original: '+valueToSet+' // Float: '+parseFloat(valueToSet));
	            				
	            				valueToSet = parseFloat(valueToSet);
	            				
	            			}
	            			else if (mappedFldId == 'custrecord_skzv_trxdate' ||
	            					 mappedFldId == 'custrecord_skzr_trxdate')
	            			{
	            				valueToSet = format.parse({
	            					'value':valueToSet,
	            					'type':format.Type.DATE
	            				});
	            			}
	            			
	            			//This section we check to see if we need to get Internal ID of
	            			//	Reference table values such as Customer Transaction Type,
	            			//	Payment Type, Service Type or Vendor Type. 
	            			//
	            			else if (mappedFldId == 'custrecord_skzr_custtrxtype' ||
	            					mappedFldId == 'custrecord_skzr_pmttype' ||
	            					mappedFldId == 'custrecord_skzr_servtype' ||
	            					mappedFldId == 'custrecord_skzv_servtype' ||
	            					mappedFldId == 'custrecord_skzv_vendortype')
	            			{
	            				//Check against Service Type Json object 
	            				//	to get the Internal ID of the value
	            				if (mappedFldId == 'custrecord_skzr_servtype' ||
	            					mappedFldId == 'custrecord_skzv_servtype')
	            				{
	            					//Check for invalid key
	            					if (serTypeJson[valueToSet])
	            					{
	            						valueToSet = serTypeJson[valueToSet].id;
	            					}
	            					else
	            					{
	            						valueToSet = '';
	            					}
	            					
	            				}
	            				
	            				//Check against Customer Transaction Type Json Object
	            				//	to get the Internal ID of the value
	            				if (mappedFldId == 'custrecord_skzr_custtrxtype')
	            				{
	            					if (trxTypeJson[valueToSet])
	            					{
	            						valueToSet = trxTypeJson[valueToSet].id;
	            					}
	            					else
	            					{
	            						valueToSet = '';
	            					}
	            				}
	            				
	            				//Check against Payment Transaction Type Json Object
	            				//	to get the Internal ID of the value
	            				if (mappedFldId == 'custrecord_skzr_pmttype')
	            				{
	            					if (pmtTypeJson[valueToSet])
	            					{
	            						valueToSet = pmtTypeJson[valueToSet].id;
	            					}
	            					else
	            					{
	            						valueToSet = '';
	            					}
	            				}
	            				
	            				//Check against Talent Type Json Object
	            				//	to get the Internal ID of the value
	            				if (mappedFldId == 'custrecord_skzv_vendortype')
	            				{
	            					if (talTypeJson[valueToSet])
	            					{
	            						valueToSet = talTypeJson[valueToSet].id;
	            					}
	            					else
	            					{
	            						valueToSet = '';
	            					}
	            				}
	            			}
	            			
	            			//log.debug('valueToSet','After check: '+valueToSet);
	            			
	            			//After each check, as long as valueToSet has a value
	            			//	we set it on the record.
	            			
	            			if (mappedFldId == 'custrecord_skzv_amount' && valueToSet == 0)
	            			{
	            				valueToSet = 0.0;
	            				log.debug('amount to be set', valueToSet);
	            			}
	            			
	            			if (valueToSet)
	            			{
	            				stageRec.setValue({
			        				'fieldId':mappedFldId,
			        				'value':valueToSet
			        			});
	            			}
	            			
	            		}
	        		}//End Column mapping loop
	        		
	        		//Save the record
	        		var stageRecId = stageRec.save({
	        			'enableSourcing':true,
	        			'ignoreMandatoryFields':true
	        		});
	        		
	        		//log.debug('added stage rec', 'stage rec id '+stageRecId+' added for '+trxFileType);
	        		
	        		//Need to update the progress % value here
	        		var pctCompleted = Math.round(((l+1) / arContents.length) * 100);
	        		runtime.getCurrentScript().percentComplete = pctCompleted;
	    			
	        		//Check for Governance points
	        		if (l < arContents.length && runtime.getCurrentScript().getRemainingUsage() < 1000)
	        		{
	        			//Reschedule here
	        			isRescheduled = true;
	        			var schSctTask = task.create({
	        				'taskType':task.TaskType.SCHEDULED_SCRIPT
	        			});
	        			schSctTask.scriptId = runtime.getCurrentScript().id;
	        			schSctTask.deploymentId = runtime.getCurrentScript().deploymentId;
	        			schSctTask.params = {
	        				'custscript_sb59_lastprocrownum':l,
	        				'custscript_sb59_filetoprocess':fileToProcess
	        			};
	        			
	        			//Submit the Reschedule task
	        			schSctTask.submit();
	        			
	        			break;
	        		}
        		}//End check for empty string
        		
        	}//End Forloop
        	
        	//We check to see if the process was rescheduled.
        	//	if NOT, we queue up next script
        	if (!isRescheduled)
        	{
        		log.audit('Queue up next stage', 'Queue up next stage');
        		//Queue up Next Job: Validation Process
        		//SKZ-SS2 Staged Validation Processor
        		var nxtSchSctTask = task.create({
    				'taskType':task.TaskType.SCHEDULED_SCRIPT
    			});
        		nxtSchSctTask.scriptId = 'customscript_skz_ss_stagedvalidation';
        		nxtSchSctTask.deploymentId = null;
        		nxtSchSctTask.params = {
    				'custscript_sb61_filetrxtype':trxFileType,
    				'custscript_sb61_filetoprocess':fileToProcess,
    				'custscript_sb61_filename':trxFileName
    			};
    			
    			//Submit the Reschedule task
        		nxtSchSctTask.submit();
        	}
        	
    	}
    	catch (err)
    	{
    		log.error(
    			'Error Process File to Stage',
    			custUtil.getErrDetail(err)
    		);
    		
    		//Generate Email Notification on failure
    		email.send({
    			'author':-5,
    			'recipients':PARAM_NOTIFICATION,
    			'subject':'Error occured while attempting to import Skoozi Sync File',
    			'body':'Following Error occured while importing Skoozi Sync file:<br/><br/>'+
    				   custUtil.getErrDetailUi(err)
    		});
    		
    	}
    	
    }

    return {
        execute: executeScript
    };
    
});
