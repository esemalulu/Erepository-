/**
 * @NApiVersion 2.0
 * @NScriptType ScheduledScript
 * @NModuleScope SameAccount
 */
define(['N/runtime', 
        'N/record', 
        'N/search',
        'N/error',
        'N/task',
        'N/format',
        '/SuiteScripts/AX LMS Module/UTILITY_LIB'],
/**
 * @param {file} file
 * @param {record} record
 * @param {search} search
 */
function(runtime, record, search, error, task, format, custUtil) 
{
   
    /**
     * This script runs every 15 min. to monitor LMS Queue Monitor Record to see
     * if the process has completed.
     * Because sync processor spawns multiple instance of PROCESS Scheduled Scripts to more efficiently process the data,
     * 	This script is needed to check of the certain queue is completed or not.
     * 
     * Each File has One Queue Association.
     * 	- Each Queue can have one or MORE Sub Queue Association (Depending on how many it spawned)
     * 
     * Script will look at any NONE completed Statuses (Pending (1) and Processing (4)) and check to see if it needs to be marked as Success (2) or Failed (3)
     * 
     * Parent Queue Success Condition:
     * If ALL Sub Queue Elements are marked as Success 
     * AND
     * None of the Staged Records has value of "error"
     * AND
     * None of the staged Records are unprocessed (status of empty)
     * 
     * Parent Queue Failed Condition:
     * If One or More of Sub Queue Elements have Failed Status
     * OR
     * One or More of Staged Records has value of "error"
     * OR
     * One or More of Staged Records are unprocessed (status of empty)
     * 
     * At the time of this script execution, if parent queue is Failed and Point of Failure is empty, point of failure will be PROCESS 
     *
     * @param {Object} scriptContext
     * @param {string} scriptContext.type - The context in which the script is executed. It is one of the values from the scriptContext.InvocationType enum.
     * @Since 2015.2
     */
    function monitorProcQueueForCompletion(context) 
    {
    	//Grab Error Notification 
    	var paramLastProcQueueId = runtime.getCurrentScript().getParameter('custscript_sb167_lasprocid');
    	
    	//1. Search for list of ALL In Progress or Pending Queue Monitor Records.
    	var qflt = [
    	            	//Grab all queue with status of Pending, Processing
    	            	['custrecord_lmsq_procstatus',search.Operator.ANYOF, ['1','4']],
    	            	'AND',
    	            	['isinactive', search.Operator.IS, false]
    	           ],
    		qcol = [
    		        	search.createColumn({
    		        		'name':'internalid',
    		        		'sort':search.Sort.ASC
    		        	}),
    		        	'custrecord_lmsq_pof',
    		        	'custrecord_lmsq_stagerecid',
    		        	'custrecord_lmsq_stagerecstatusid',
    		        	'custrecord_lmsq_stagerecqueueid'
    		       ];
    	
    	if (paramLastProcQueueId)
    	{
    		qflt.push('AND');
    		qflt.push(['internalidnumber', search.Operator.GREATERTHAN, paramLastProcQueueId]);
    	}
    	
    	var qSearch = search.create({
    			'type':'customrecord_lmsqueue',
    			'filters':qflt,
    			'columns':qcol
    		}),
    		qrs = qSearch.run().getRange({
    			'start':0,
    			'end':100
    		});
    	
    	log.debug('size',qrs.length);
    	
    	//2. Loop through each record and reveiw results and see what's going on
    	for (var i=0; i < qrs.length; i+=1)
    	{
    		//4. Go through each sub queue result and identify data points.
    		var procJson = {
    			'total':0,
    			'success':0,
    			'error':0,
    			'pending':0,
    			'recid':qrs[i].getValue({'name':'custrecord_lmsq_stagerecid'}),
    			'recstatusfld':qrs[i].getValue({'name':'custrecord_lmsq_stagerecstatusid'}),
    			'recqueuefld':qrs[i].getValue({'name':'custrecord_lmsq_stagerecqueueid'}),
    			'pof':qrs[i].getValue({'name':'custrecord_lmsq_pof'}),
    			'queuestatus':'',
    			'queuedetail':'',
    			'datetimeval':null,
    			'sqjson':{
    				'1':0,
    				'2':0,
    				'3':0,
    				'4':0
    			}
    		};
    		
    		var qId = qrs[i].getValue({'name':'internalid'});
    		//3. Grab list of ALL Sub Queue status summarized
    		var sqflt = [
    		             	['custrecord_lmssq_parentqueue', search.Operator.ANYOF, [qId]],
    		             	'AND',
    		             	['isinactive', search.Operator.IS, false]
    		            ],
    			sqcol = [
    			         	search.createColumn({
    			         		'name':'internalid',
    			         		'summary':search.Summary.COUNT
    			         	}),
    			         	search.createColumn({
    			         		'name':'custrecord_lmssq_status',
    			         		'summary':search.Summary.GROUP
    			         	}),
    			         	search.createColumn({
    			         		'name':'custrecord_lmssq_subqueue_compdatetime',
    			         		'summary':search.Summary.MAX
    			         	})
    			        ],
    			sqSearch = search.create({
    				'type':'customrecord_lmssubqueue',
    				'filters':sqflt,
    				'columns':sqcol
    			}),
	    		sqrs = sqSearch.run().getRange({
    				'start':0,
    				'end':100
    			});
    		
    		log.debug('testing','ran');
    		
    		//4. Move forward ONLY if there are sub queue records.
    		//		If NO sub queue records are in place, it means it's still in process
    		if (sqrs.length > 0)
    		{
    			//1=Pending, 2=Success, 3=Failed, 4=Processing
        		for (var j=0; j < sqrs.length; j+=1)
        		{
        			var sqStatus = sqrs[j].getValue({
	        				'name':'custrecord_lmssq_status',
	        				'summary':search.Summary.GROUP
	        			}),
	        			sqCount = sqrs[j].getValue({
	        				'name':'internalid',
	        				'summary':search.Summary.COUNT
	        			}),
	        			sqCompDatetime = sqrs[j].getValue({
	        				'name':'custrecord_lmssq_subqueue_compdatetime',
	        				'summary':search.Summary.MAX
	        			});
        			
        			//If Empty, assume it is pending
        			if (!sqStatus)
        			{
        				sqStatus = 1;
        			}
        			
        			procJson.sqjson[sqStatus] = parseInt(procJson.sqjson[sqStatus]) + 
        										parseInt(sqCount);
        			
        		}
        		
        		//Check for stage rec summary
        		//	ONLY run this if we know what staging record to check for 
        		if (procJson.recid && procJson.recstatusfld && procJson.recqueuefld)
        		{
        			var sflt = [
        			            	[procJson.recqueuefld, search.Operator.ANYOF, qId],
        			            	'AND',
        			            	['isinactive', search.Operator.IS, false]
        			           ],
        				scol = [
        				        	search.createColumn({
        				        		'name':'internalid',
        				        		'summary':search.Summary.COUNT
        				        	}),
        				        	//This can be blank, success or error
        				        	search.createColumn({
        				        		'name':procJson.recstatusfld,
        				        		'summary':search.Summary.GROUP
        				        	})
        				       ],
        				sSearch = search.create({
        					'type':procJson.recid,
        					'filters':sflt,
        					'columns':scol
        				}),
        				srs = sSearch.run().getRange({
        					'start':0,
        					'end':10
        				});
        			
        			for (var k=0; k < srs.length; k+=1)
        			{
        				var sStatus = srs[k].getValue({
	        					'name':procJson.recstatusfld,
	        					'summary':search.Summary.GROUP
	        				}),
	        				sCount = srs[k].getValue({
	        					'name':'internalid',
	        					'summary':search.Summary.COUNT
	        				});
        				
        				if (sStatus == '- None -')
        				{
        					sStatus = 'pending';
        				}
        				
        				procJson[sStatus] = parseInt(sCount);
        				procJson['total'] = parseInt(procJson['total']) +
        									parseInt(sCount);
        				
        			}
        			
        		}
        		
        		if (procJson.sqjson['4'] == 0 && procJson.sqjson['1'] == 0)
        		{
        			//This is Complete
        			//Default the message to success
        			procJson.queuestatus = '2';
        			procJson.queuedetail = 'Completed Processing Sync';
        			procJson.datetimeval = sqCompDatetime;
        		
        			//If we have any pending or error on stage rec
        			//	OR we have 3 count for sub queue record it as fail
        			if (procJson.pending > 0 || procJson.error > 0 || procJson.sqjson['3'] > 0)
        			{
        				procJson.queuestatus = '3';
        				procJson.queuedetail = 'Completed with Issues. One or more of stage record failed OR queue failed during processing';
        				//This is a failure during process.
        				procJson.pof = 'PROCESS';
        				
        			}
        		}
        		else
        		{
        			procJson.queuestatus = '4';
        			procJson.queuedetail = 'Staging to Actual Sync in Progress';
        		}
        		
        		log.debug('procJSON', JSON.stringify(procJson));
        		
        		//Update the main queue record
        		try
        		{
        			record.submitFields({
        				'type':'customrecord_lmsqueue',
        				'id':qId,
        				'values':{
        					'custrecord_lmsq_procstatus':procJson.queuestatus,
        					'custrecord_lmsq_procdetail':procJson.queuedetail,
        					'custrecord_lmsq_pof':procJson.pof,
        					'custrecord_lmsq_procenddt':procJson.datetimeval,
        					'custrecord_lmsq_numtotalstagedrecs':procJson.total,
        					'custrecord_lmsq_numsuccess':procJson.success,
        					'custrecord_lmsq_numunprocessed':procJson.pending,
        					'custrecord_lmsq_numfailed':procJson.error,
        				},
        				'options':{
        					'enableSourcing':true,
        					'ignoreMandatoryFields':true
        				}
        			});
        		}
        		catch(upderr)
        		{
        			log.error('First attempt failed',custUtil.getErrDetail(upderr));
        			//Try again just in-case another record tried to update it at the same time
        			try
        			{
        				record.submitFields({
            				'type':'customrecord_lmsqueue',
            				'id':qId,
            				'values':{
            					'custrecord_lmsq_procstatus':procJson.queuestatus,
            					'custrecord_lmsq_procdetail':procJson.queuedetail,
            					'custrecord_lmsq_pof':procJson.pof,
            					'custrecord_lmsq_procenddt':procJson.datetimeval,
            					'custrecord_lmsq_numtotalstagedrecs':procJson.total,
            					'custrecord_lmsq_numsuccess':procJson.success,
            					'custrecord_lmsq_numunprocessed':procJson.pending,
            					'custrecord_lmsq_numfailed':procJson.error,
            				},
            				'options':{
            					'enableSourcing':true,
            					'ignoreMandatoryFields':true
            				}
            			});
        			}
        			catch(upderr2)
        			{
        				//Throw Error at this point
        				throw error.create({
        					'name':'QUEUE_UPD_FAILED',
        					'message':'2nd Attempt Failed with Error: '+custUtil.getErrDetail(upderr2),
        					'notifyOff':false
        				});
        			}
        		}
        		
        		
    		}
    		
    		log.debug('json',JSON.stringify(procJson));
    		
    		//Add in Reschedule logic here
    		//Set Percentage Complete fro Main loop
			var pctCompleted = Math.round(((i+1) / qrs.length) * 100);
    		runtime.getCurrentScript().percentComplete = pctCompleted;
			
			//At this point, Reschedule if we are running low on governance point.
			if (runtime.getCurrentScript().getRemainingUsage() < 1000)
			{
				var schSctTaskMain = task.create({
					'taskType':task.TaskType.SCHEDULED_SCRIPT
				});
				schSctTaskMain.scriptId = runtime.getCurrentScript().id;
				schSctTaskMain.deploymentId = runtime.getCurrentScript().deploymentId;
				schSctTask.params = {
	    			'custscript_sb167_lasprocid':qId
	    		};
				//Don't pass in any dynamic parameter so that It will process next Pending job
				schSctTaskMain.submit();
				
				log.audit('Main Search Rescheduled','Main Search Rescheduled at '+qId);
				
				break;
			}
    		
    		
    	}
    	
    }

    return {
        execute: monitorProcQueueForCompletion
    };
    
});
