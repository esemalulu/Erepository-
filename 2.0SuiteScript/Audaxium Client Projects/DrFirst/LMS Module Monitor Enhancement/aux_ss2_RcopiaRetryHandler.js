/**
 * @NApiVersion 2.x
 * @NScriptType ScheduledScript
 * @NModuleScope SameAccount
 */
define(['N/error', 
        'N/record', 
        'N/runtime', 
        'N/search',
        'N/format',
        'N/task',
        'N/file',
        '/SuiteScripts/AX LMS Module/UTILITY_LIB'],
/**
 * @param {error} error
 * @param {record} record
 * @param {runtime} runtime
 * @param {search} search
 */
function(error, record, runtime, search, format, task, file, custUtil) 
{
   
	/**
     * Retry process handler when user or rcopia manually triggers retry
     * 
     * When submited, Process will mark the queue as Retry, update detail and other fields to blank 
     * 
    * IF Action is RETRY:
     * 
     *	 IF Fail, and POF is Load,
     *	 	- 1) Process will be queued up to delete any Staged records for this queue
     *	 	- 2) It will move the file to TO BE PRocessed folder
     *	 	- 3) Queue up loading again
     * 
     *	 IF Fail, and POF is Process,
     * 		- 1) Process will be queued up to delete ALL Sub Queues for this queue.
     * 	 - 2) Go through and reset Status of ALL staged records for THIS Queue to Empty 
     * 		- 3) It will then queue up the Same File for reprocessing from Stage to Proc Sync
     *
     * 7/14/2016 - Add in Mark as Success
     * If Action is SUCCESS
     * 	- This action is taken when Admin knows Rcopia will be sending brand new file for processing.
     * 		OR
     *    The failures aren't really failures and can be ignored.
     *    
     *  1) Update Monitor Queue as Success with Default override Detail Message
     *  2) Go through ALL Staged Records and mark them as Success
     *  3) Load the file and question and move it PROCESSED folder
     *
     * @param {Object} scriptContext
     * @param {string} scriptContext.type - The context in which the script is executed. It is one of the values from the scriptContext.InvocationType enum.
     * @Since 2015.2
     */
    function queueUpRetry(scriptContext) 
    {
    	//Grab Error Notification 
    	var paramRetryQueueId = runtime.getCurrentScript().getParameter('custscript_sb175_retryid'),
    		//This value indicates what action to Take: RETRY or SUCCESS
    		paramQueueAction = runtime.getCurrentScript().getParameter('custscript_sb175_action'),
    		//This flag indicates if the script was rescheduled during prepping process
    		paramIsPrepStage = runtime.getCurrentScript().getParameter('custscript_sb175_isprepstage');
    	
    	//When it errors out in any stage, just have it terminate and let it throw native NS error
    	
    	log.debug('Retry Queue', paramRetryQueueId);
    	log.debug('Action', paramQueueAction);
    	
    	if (!paramRetryQueueId)
    	{
    		throw error.create({
    			'name':'RETRY_NO_QUEUE_ID_ERR',
    			'message':'Stap 0. No Queue ID provided. This is a required field',
    			'notifyOff':false
    		});
    	}
    	
    	if (!paramQueueAction)
    	{
    		throw error.create({
    			'name':'RETRY_NO_ACTION_ERR',
    			'message':'Stap 0. No Action to take provided. This is a required field',
    			'notifyOff':false
    		});
    	}
    	
    	//if paramQueueAction is NOT SUCCESS or RETRY throw error
    	if (paramQueueAction != 'SUCCESS' && paramQueueAction != 'RETRY')
    	{
    		throw error.create({
    			'name':'RETRY_UNKONWN_ACTION_ERR',
    			'message':'Stap 0. Unkonwn Action. Value must be SUCCESS or RETRY',
    			'notifyOff':false
    		});
    	}
    	
    	//1. Grab necessary data from the Queue to start the Prep Stage
    	var qinfoJson = {
    		'id':paramRetryQueueId,
    		'fileid':'',
    		'lmsrec':'',
    		'pof':'',
    		'stagerec':'',
    		'stagestatusfld':'',
    		'stagequeuefld':''
    	};
    	
    	try
    	{
    		var queueInfo = search.lookupFields({
        		'type':'customrecord_lmsqueue',
        		'id':paramRetryQueueId,
        		'columns':[
        		           	'custrecord_lmsq_fileref',
        		           	'custrecord_lmsq_lmsrectype',
        		           	'custrecord_lmsq_pof',
        		           	'custrecord_lmsq_stagerecid',
        		           	'custrecord_lmsq_stagerecstatusid',
        		           	'custrecord_lmsq_stagerecqueueid'
        		          ]
        	});
    		
    		//Populate qinfoJson
    		qinfoJson.fileid = queueInfo.custrecord_lmsq_fileref[0].value;
    		qinfoJson.lmsrec = queueInfo.custrecord_lmsq_lmsrectype;
    		qinfoJson.pof = queueInfo.custrecord_lmsq_pof;
    		qinfoJson.stagerec = queueInfo.custrecord_lmsq_stagerecid;
    		qinfoJson.stagestatusfld = queueInfo.custrecord_lmsq_stagerecstatusid;
    		qinfoJson.stagequeuefld = queueInfo.custrecord_lmsq_stagerecqueueid;
    		
    	}
    	catch(lookuperr)
    	{
    		throw error.create({
    			'name':'RETRY_QUEUE_LOOKUP_ERR',
    			'message':'Step 1. Unable to lookup Queue Info from Queue ID '+paramRetryQueueId+'. '+
    					  custUtil.getErrDetail(lookuperr),
    			'notifyOff':true
    		});
    	}
    	
    	//7/14/2016 - action based processing
    	//------------------------------ Begin SUCCESS Processing --------------------------
    	//		This is mark all staged record as success and set queue as success.
    	//		This is an override action taken by NS Admin
    	if (paramQueueAction == 'SUCCESS')
    	{
    		if (!paramIsPrepStage)
        	{
        		try
            	{
            		record.submitFields({
            			'type':'customrecord_lmsqueue',
            			'id':paramRetryQueueId,
            			'values':{
            				'custrecord_lmsq_procstatus':'2', //Set the status to SUCCESS (2)
            				'custrecord_lmsq_procdetail':'NS Admin override to mark this queue as success. '+
            											 'All Staged Records will be marked as success as well. '+
            											 'This action is done when new version of the file is about to be loaded '+
            											 'and the Admin wants to clear this queue off.'
            			},
            			'options':{
            				'enablesourcing':true,
            				'ignoreMandatoryFields':true
            			}
            		});
            	}
            	catch(updqrecsucerr)
            	{
            		throw error.create({
            			'name':'RETRY_UPD_QUEUE_TO_SUCCESS_ERROR',
            			'message':'Step 0. Unable to update Queue ID '+paramRetryQueueId+' to SUCCESS.'+
            					  custUtil.getErrDetail(updqrecsucerr),
            			'notifyOff':true
            		});
            	}
        	}
        	
        	log.debug('qinfoJson', JSON.stringify(qinfoJson));
        	
    		
    		//We need to first go through and update
        	//	ALL staged records for THIS Queue to SUCCESS
    		var sstgSearch = search.create({
				'type':qinfoJson.stagerec,
				'filters':[
				           	[qinfoJson.stagequeuefld, search.Operator.ANYOF, paramRetryQueueId],
				           	'AND',
				           	[qinfoJson.stagestatusfld, search.Operator.ISNOT, 'success']
				          ],
				'columns':['internalid']
			}),
			allSstgCols = sstgSearch.columns;
			//There could be more than 1000. Grab what we can here
			//	If it gets Rescheduled, it will ONLY return those records that NEEDS to be reset
			sstgrs = sstgSearch.run().getRange({
				'start':0,
				'end':1000
			});
		
			//Loop through each and Reset that status to success
			for (var sstg=0; sstgrs && sstg < sstgrs.length; sstg+=1)
			{
				try
				{
					var resetValJson = {};
					resetValJson[qinfoJson.stagestatusfld] = 'success';
					
					record.submitFields({
						'type':qinfoJson.stagerec,
						'id':sstgrs[sstg].getValue(allSstgCols[0]),
						'values':resetValJson,
						'options':{
							'enablesourcing':true,
							'ignoreMandatoryFields':true
						}
					});
				}
				catch(sstgerr)
				{
					//If this fails, throw error and terminate the script
					throw error.create({
						'name':'RETRY_PREP_RESET_STAGE_REC_STATUS_TO_SUCCESS_ERR',
						'message':'Unable to reset Staged Record ('+qinfoJson.stagerec+') '+
								   sstgrs[sstg].getValue(allSstgCols[0])+' to Success. '+
								   custUtil.getErrDetail(sstgerr),
						'notifyOff':false
					});
				}
				
				//Add in Reschedule logic here
	    		//Set Percentage Complete fro Main loop
				var pctCompleted = Math.round(((sstg+1) / sstgrs.length) * 100);
	    		runtime.getCurrentScript().percentComplete = pctCompleted;
				
				//When we see that script usage is running low, we reschedule it here
				if ( (sstg+1) == 1000 || runtime.getCurrentScript().getRemainingUsage() < 1000)
				{
					var schSctTask = task.create({
						'taskType':task.TaskType.SCHEDULED_SCRIPT
					});
					schSctTask.scriptId = runtime.getCurrentScript().id;
					schSctTask.deploymentId = runtime.getCurrentScript().deploymentId;
					schSctTask.params = {
		    			'custscript_sb175_retryid':paramRetryQueueId,
		    			'custscript_sb175_action':paramQueueAction,
		    			'custscript_sb175_isprepstage':true
		    		};
					schSctTask.submit();
					
					log.audit(
						'Queue ID '+paramRetryQueueId+'/Set to Success Rescheduled. ',
						'Point Of Failure: '+qinfoJson.pof+' Prep Rescheduled at '+sstgrs[sstg].getValue(allSstgCols[0])
					);
					
					return;
				}
				
			}//End Loop for rstgrs status reset
			
			//2) We need to move the file INTO Processed Folder
			var toBeProcFolderId = '5111312',
				deltaFileObj = file.load({
					'id':qinfoJson.fileid
				});
			
			deltaFileObj.folder = toBeProcFolderId;
			deltaFileObj.save();
			
			log.debug('File Saved','File Saved');
    	}
    	
    	//---------------------- BEGIN Processing RETRY Action -----------------------------
    	else
    	{
    		//2. Update the Queue Record status to Retry and clear out the process start date/time field
        	if (!paramIsPrepStage)
        	{
        		try
            	{
            		record.submitFields({
            			'type':'customrecord_lmsqueue',
            			'id':paramRetryQueueId,
            			'values':{
            				'custrecord_lmsq_procstatus':'5', //Set the status to Retry
            				'custrecord_lmsq_procdetail':'Queue is being prepared for Retry Action',
            				'custrecord_lmsq_procstartdt':'',
            				'custrecord_lmsq_procenddt':'',
            				'custrecord_lmsq_numtotalstagedrecs':'',
            				'custrecord_lmsq_numsuccess':'',
            				'custrecord_lmsq_numfailed':'',
            				'custrecord_lmsq_numunprocessed':''
            			},
            			'options':{
            				'enablesourcing':true,
            				'ignoreMandatoryFields':true
            			}
            		});
            	}
            	catch(updqrecerr)
            	{
            		throw error.create({
            			'name':'RETRY_UPD_QUEUE_ERROR',
            			'message':'Step 2. Unable to update Queue ID '+paramRetryQueueId+'. '+
            					  custUtil.getErrDetail(updqrecerr),
            			'notifyOff':true
            		});
            	}
        	}
        	
        	log.debug('qinfoJson', JSON.stringify(qinfoJson));
        	
        	//3. based on POF, we need to prep the data
        	//	if pof is value is none of LOAD or PROCESS, throw error
        	if (qinfoJson.pof != 'LOAD' && qinfoJson.pof != 'PROCESS')
        	{
        		throw error.create({
        			'name':'RETRY_PREP_QUEUE_ERROR',
        			'message':'Step 3A. Unable to start Prep Queue ID '+paramRetryQueueId+
        					  ' because POF is Not LOAD or PROCESS. '+
        					  ' Value on the queue record is "'+qinfoJson.pof+'". ',
        			'notifyOff':true
        		});
        	}
        	
        	try
        	{
        		log.debug('pof', qinfoJson.pof);
        		
        		if (qinfoJson.pof == 'PROCESS')
        		{
        			log.debug('process','running process logic');
        			//PROCESS
        			//	- 1) Process will be queued up to delete ALL Sub Queues for this queue.
        		    //  - 2) Go through and reset Status of ALL staged records for THIS Queue to Empty
        			
        			//Begin Process 1 - Grab all Sub Queues for THIS Queue
        			var dsqSearch = search.create({
    	    				'type':'customrecord_lmssubqueue',
    	    				'filters':[
    	    				           	['custrecord_lmssq_parentqueue', search.Operator.ANYOF, paramRetryQueueId]
    	    				          ],
    	    				'columns':['internalid']
    	    			}),
    	    			allDsqCols = dsqSearch.columns,
    	    			//Assume we only have less than 1000. 
    	    			//	As of current version, there can be max 63 since there are 63 total Process deployments
    	    			dsqrs = dsqSearch.run().getRange({
    	    				'start':0,
    	    				'end':1000
    	    			});
        			
        			//Loop thorugh each and delete them
        			for (var dsq=0; dsqrs && dsq < dsqrs.length; dsq+=1)
        			{
        				try
        				{
        					record.delete({
        						'type':'customrecord_lmssubqueue',
        						'id':dsqrs[dsq].getValue(allDsqCols[0])
        					});
        				}
        				catch(dsqerr)
        				{
        					//If this fails, throw error and terminate the script
        					throw error.create({
        						'name':'RETRY_PREP_DEL_SUB_QUEUE_ERR',
        						'message':'Unable to delete Sub Queue ID '+dsqrs[dsq].getValue(allDsqCols[0])+'. '+
        								  custUtil.getErrDetail(dsqerr),
        						'notifyOff':true
        					});
        				}
        			}
        			
        			//Begin Process 2 - Grab all Staged Records for THIS queue that HAS a value for status
        			//7/16/2016 - Oki requested that we ONLY retry the ones that ERRORED OUT
        			var rstgSearch = search.create({
    	    				'type':qinfoJson.stagerec,
    	    				'filters':[
    	    				           	[qinfoJson.stagequeuefld, search.Operator.ANYOF, paramRetryQueueId],
    	    				           	'AND',
    	    				           	[qinfoJson.stagestatusfld, search.Operator.IS, 'error']
    	    				          ],
    	    				'columns':['internalid']
    	    			}),
    	    			allRstgCols = rstgSearch.columns;
    	    			//There could be more than 1000. Grab what we can here
        				//	If it gets Rescheduled, it will ONLY return those records that NEEDS to be reset
        				rstgrs = rstgSearch.run().getRange({
        					'start':0,
        					'end':1000
        				});
        			
        			//Loop through each and Reset that status to Empty
        			for (var rstg=0; rstgrs && rstg < rstgrs.length; rstg+=1)
        			{
        				try
        				{
        					var resetValJson = {};
        					resetValJson[qinfoJson.stagestatusfld] = '';
        					
        					record.submitFields({
        						'type':qinfoJson.stagerec,
        						'id':rstgrs[rstg].getValue(allRstgCols[0]),
        						'values':resetValJson,
        						'options':{
        							'enablesourcing':true,
        							'ignoreMandatoryFields':true
        						}
        					});
        				}
        				catch(rstgerr)
        				{
        					//If this fails, throw error and terminate the script
        					throw error.create({
        						'name':'RETRY_PREP_RESET_STAGE_REC_STATUS_ERR',
        						'message':'Unable to reset Staged Record ('+qinfoJson.stagerec+') '+rstgrs[rstg].getValue(allRstgCols[0])+'. '+
        								  custUtil.getErrDetail(rstgerr),
        						'notifyOff':true
        					});
        				}
        				
        				//Add in Reschedule logic here
        	    		//Set Percentage Complete fro Main loop
        				var pctCompleted = Math.round(((rstg+1) / rstgrs.length) * 100);
        	    		runtime.getCurrentScript().percentComplete = pctCompleted;
        				
        				//When we see that script usage is running low, we reschedule it here
        				if ( (rstg+1) == 1000 || runtime.getCurrentScript().getRemainingUsage() < 1000)
        				{
        					var schSctTask = task.create({
        						'taskType':task.TaskType.SCHEDULED_SCRIPT
        					});
        					schSctTask.scriptId = runtime.getCurrentScript().id;
        					schSctTask.deploymentId = runtime.getCurrentScript().deploymentId;
        					schSctTask.params = {
        		    			'custscript_sb175_retryid':paramRetryQueueId,
        		    			'custscript_sb175_action':paramQueueAction,
        		    			'custscript_sb175_isprepstage':true
        		    		};
        					schSctTask.submit();
        					
        					log.audit(
        						'Queue ID '+paramRetryQueueId+' Rescheduled. ',
        						'Point Of Failure: '+qinfoJson.pof+' Prep Rescheduled at '+rstgrs[rstg].getValue(allRstgCols[0])
        					);
        					
        					return;
        				}
        				
        			}//End Loop for rstgrs status reset
        			
        			//we need to now update the queue with new information
        			record.submitFields({
            			'type':'customrecord_lmsqueue',
            			'id':paramRetryQueueId,
            			'values':{
            				'custrecord_lmsq_procstatus':'4', //Set the status to Processing
            				'custrecord_lmsq_procdetail':'Queue is Retry Prep Completed. Begin re-processing the queue',
            				'custrecord_lmsq_procstartdt':format.format({
            											  	'value':new Date(),
            											  	'type':format.Type.DATETIMETZ
            											  })
            			},
            			'options':{
            				'enablesourcing':true,
            				'ignoreMandatoryFields':true
            			}
            		});
        			
        			//We Queue Up Scheduler for THIS Queue ONLY.
        			var reSchSctTask = task.create({
    					'taskType':task.TaskType.SCHEDULED_SCRIPT
    				});
        			reSchSctTask.scriptId = 'customscript_axlms_deltaprocscheler';
        			reSchSctTask.deploymentId = 'customdeploy_axlms_deltaprocadhoc';
        			reSchSctTask.params = {
    	    			'custscript_sb146_stagerecid':qinfoJson.lmsrec,
    	    			'custscript_sb146_retryqid':paramRetryQueueId
    	    		};
        			reSchSctTask.submit();
    				
    				log.audit(
    					'Queue ID '+paramRetryQueueId+' for LMS Rec '+qinfoJson.lmsrec,
    					'Scheduler Queued up'
    				);
        			
        		}
        		else
        		//-------------------------------------- LOAD Retry Handling ---------------------------------------------
        		{
        			//Assume it's LOAD
        			/**
        			 * - 1) Process will be queued up to delete any Staged records for this queue
        			 * - 2) It will move the file to TO BE PRocessed folder
        			 */
        			log.debug('process','running LOAD logic');
        			//Begin Process 2 - Grab all Staged Records for THIS queue to delete
        			var dstgSearch = search.create({
    	    				'type':qinfoJson.stagerec,
    	    				'filters':[
    	    				           	[qinfoJson.stagequeuefld, search.Operator.ANYOF, paramRetryQueueId]
    	    				          ],
    	    				'columns':['internalid']
    	    			}),
    	    			allDstgCols = dstgSearch.columns;
    	    			//There could be more than 1000. Grab what we can here
        				//	If it gets Rescheduled, it will ONLY return those records that NEEDS to be reset
        				dstgrs = dstgSearch.run().getRange({
        					'start':0,
        					'end':1000
        				});
        			
        			//Loop through each and Delete loaded stage record
        			for (var dstg=0; dstgrs && dstg < dstgrs.length; dstg+=1)
        			{
        				try
        				{
        					
        					record.delete({
        						'type':qinfoJson.stagerec,
        						'id':dstgrs[dstg].getValue(allDstgCols[0])
        					});
        				}
        				catch(rstgerr)
        				{
        					//If this fails, throw error and terminate the script
        					throw error.create({
        						'name':'RETRY_PREP_DELETE_STAGE_REC_ERR',
        						'message':'Unable to Delete Staged Record ('+qinfoJson.stagerec+') '+dstgrs[dstg].getValue(allDstgCols[0])+'. '+
        								  custUtil.getErrDetail(rstgerr),
        						'notifyOff':true
        					});
        				}
        				
        				//Add in Reschedule logic here
        	    		//Set Percentage Complete fro Main loop
        				var pctCompleted = Math.round(((dstg+1) / dstgrs.length) * 100);
        	    		runtime.getCurrentScript().percentComplete = pctCompleted;
        				
        				//When we see that script usage is running low, we reschedule it here
        				if ( (dstgrs+1) == 1000 || runtime.getCurrentScript().getRemainingUsage() < 1000)
        				{
        					var schSctTask = task.create({
        						'taskType':task.TaskType.SCHEDULED_SCRIPT
        					});
        					schSctTask.scriptId = runtime.getCurrentScript().id;
        					schSctTask.deploymentId = runtime.getCurrentScript().deploymentId;
        					schSctTask.params = {
        		    			'custscript_sb175_retryid':paramRetryQueueId,
        		    			'custscript_sb175_action':paramQueueAction,
        		    			'custscript_sb175_isprepstage':true
        		    		};
        					schSctTask.submit();
        					
        					log.audit(
        						'Queue ID '+paramRetryQueueId+' Rescheduled. ',
        						'Point Of Failure: '+qinfoJson.pof+' Prep Rescheduled at '+dstgrs[dstg].getValue(allDstgCols[0])
        					);
        					
        					return;
        				}
        				
        			}//End Loop for rstgrs status reset
        			
        			//2) We need to move the file OUT into TO BE Processed File
        			var toBeProcFolderId = '5111310',
        				deltaFileObj = file.load({
        					'id':qinfoJson.fileid
        				});
        			
        			deltaFileObj.folder = toBeProcFolderId;
        			deltaFileObj.save();
        			
        			log.debug('File Saved','File Saved');
        			
        			//We Queue Up Loader for THIS Queue ONLY.
        			var reSchSctTask = task.create({
    					'taskType':task.TaskType.SCHEDULED_SCRIPT
    				});
        			reSchSctTask.scriptId = 'customscript_axlms_ss_loadcsvdelta';
        			reSchSctTask.deploymentId = 'customdeploy_axlms_ss_loadcsvdeltaretry';
        			reSchSctTask.params = {
    	    			'custscript_sb134_retryfileid':qinfoJson.fileid,
    	    			'custscript_sb134_retrylmsrec':qinfoJson.lmsrec
    	    		};
        			reSchSctTask.submit();
    				
    				log.audit(
    					'Queue ID '+paramRetryQueueId+' for LMS Rec '+qinfoJson.lmsrec,
    					'Scheduler Queued up'
    				);
        			
        		}
        	}
        	catch(preperr)
        	{
        		throw error.create({
        			'name':'RETRY_PREP_QUEUE_ERROR',
        			'message':'Step 3B. Unable to Prep Queue ID '+paramRetryQueueId+'". '+
        					  custUtil.getErrDetail(preperr),
        			'notifyOff':false
        		});
        	}
    	}
    	
    }

    return {
        execute: queueUpRetry
    };
    
});
