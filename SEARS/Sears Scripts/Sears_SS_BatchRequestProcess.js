/**
 * Copyright (c) 1998-2016 NetSuite, Inc.
 * 2955 Campus Drive, Suite 100, San Mateo, CA, USA 94403-2511
 * All Rights Reserved.
 *
 * This software is the confidential and proprietary information of
 * NetSuite, Inc. ("Confidential Information"). You shall not
 * disclose such Confidential Information and shall use it only in
 * accordance with the terms of the license agreement you entered into
 * with NetSuite.
 * Module Description
 *
 */
/**
 * @NApiVersion 2.x
 * @NScriptType ScheduledScript
 * @NModuleScope Public
 */
define(['N/record', 'N/runtime', 'N/search', './NSUtil', 'N/error','N/task'],
		
/**
 * @param {record} record
 * @param {runtime} runtime
 * @param {search} search
 * @param {Object} NSUtil
 * @param {error} error
 */
function(record, runtime, search, nsutil, error, task) {
	var EndPoint = {};
	var runCount = 0;
	var maxRunTime = 10 * 1000 * 60; //5minutes
	var maxUsageThreshold = 500;
	var startTime = (new Date()).getTime();
	
    /**
     * Definition of the Scheduled script trigger point.
     *
     * @param {Object} scriptContext
     * @param {string} scriptContext.type - The context in which the script is executed. It is one of the values from the scriptContext.InvocationType enum.
     * @Since 2015.2
     */
	EndPoint.execute = function()
	{
		var currentScript = runtime.getCurrentScript();
		var logTitle = ['BatchRequestProcess', currentScript.deploymentId, runCount].join(':');
		var deltaTime = (new Date()).getTime() - startTime; 
		log.debug(logTitle, '**START SCRIPT**: ' + JSON.stringify([deltaTime, maxRunTime]) );
		
		try
		{
			var currentBatchId = currentScript.getParameter({name: 'custscript_batchprocess_batchid'});
			var currentForceExit = currentScript.getParameter({name: 'custscript_batchprocess_exitnow'});
			
			if (runCount > 1)
			{
				currentBatchId = null;			
			}
			if (currentForceExit === true)
			{
				return true;
			}
			var currentBatch = getNextBatch(currentBatchId);
			
			log.debug(logTitle, '>> Param: current: ' + JSON.stringify([currentBatch, [currentBatchId, currentForceExit] ]));
			
			if (!nsutil.isEmpty(currentBatch))
			{
				var newBatchStatus = '';
				
				if (currentBatch.status == 'INIT-CREATION' || currentBatch.status == 'QUEUE-CREATION')
				{
					newBatchStatus = 'PENDING-CREATION';
				}
				else
				{
					newBatchStatus = 'PENDING-APIGEE';
				}
				
                record.submitFields({
                    type : 'customrecord_sears_webrequest_batch',
                    id : currentBatch.id,
                    values :
                    {
                        custrecord_batchwebreq_status : newBatchStatus
                    }
                });
			}
			
			deltaTime = (new Date()).getTime() - startTime;
			var remainingUsage = currentScript.getRemainingUsage();
			log.debug(logTitle, '** finished: ' + JSON.stringify( {'time':[deltaTime, maxRunTime], 'usage': [remainingUsage,maxUsageThreshold]}) );
			
			if (deltaTime >= maxRunTime || remainingUsage <= maxUsageThreshold)
			{
				try {
					// self-trigger //
					var schedScriptObj = task.create({taskType : task.TaskType.SCHEDULED_SCRIPT});
					schedScriptObj.scriptId = currentScript.id;  
					
					// submit the task
					var schedScriptId = schedScriptObj.submit();
					var taskStatus = task.checkStatus(schedScriptId);

					log.debug(logTitle, '** QUEUE STATUS : ' + JSON.stringify([schedScriptId, taskStatus, task.TaskStatus.FAILED]));
				}
				catch(err){
					log.debug(logTitle, '** QUEUE ERROR : ' + JSON.stringify(err));			
				}			
			
			}
			else
			{
				// we still have time.. execute again..
				log.debug(logTitle, '...STARTING AGAIN...');
				runCount++;
				EndPoint.execute();
				return true;
			}
		}
		catch (e)
		{
			if (e.message != undefined)
			{
				log.error('ERROR' , e.name + ' ' + e.message);
				throw e.name + ' ' + e.message;
			}
			else
			{
				log.error('ERROR', 'Unexpected Error' , e.toString()); 
				throw error.create({
					name: '99999',
					message: e.toString()
				});
			}
			
		}
		finally
		{
			log.debug(logTitle, '****EXIT SCRIPT**');
		}
		
		return true;
	};
	
	
	function getNextBatch(currentBatchId)
	{
		var filterExpression = [ [ 'isinactive', 'is', 'F' ],'AND',
		                         [	[ 'custrecord_batchwebreq_status', 'is','INIT-CREATION' ],'OR',
								 	[ 'custrecord_batchwebreq_status', 'is','INIT-APIGEE' ],'OR',
		                         	[ 'custrecord_batchwebreq_status', 'is','QUEUE-CREATION' ]
								 ] ];
		if (currentBatchId )
		{
			filterExpression.push('AND');
			filterExpression.push(['internalid', 'anyof', currentBatchId]);
		}
		
		var arrPendingBatches = nsutil.searchAll({
			recordType : 'customrecord_sears_webrequest_batch',
			columns : [search.createColumn({name:'custrecord_batchwebreq_status'}),
			           search.createColumn({name:'internalid'}), 
			           search.createColumn({name:'custrecord_batchwebreq_received', sort: search.Sort.DESC})],
			filterExpression : filterExpression
		});
		
		var returnData = {};
		
		if ( arrPendingBatches.length )
		{
			returnData.id = arrPendingBatches[0].id; 
			returnData.status = arrPendingBatches[0].getValue('custrecord_batchwebreq_status');
		}
		
		return returnData;
	}
    
    return EndPoint;
});
