/**
 * @NApiVersion 2.0
 * @NScriptType ScheduledScript
 * @NModuleScope SameAccount
 */
define([
        'N/email', 
        'N/error', 
        'N/record', 
        'N/search',
        'N/runtime',
        'N/task',
        '/SuiteScripts/UTILITY_LIB'],
/**
 * @param {email} email
 * @param {error} error
 * @param {record} record
 * @param {search} search
 */
function(email, error, record, search, runtime, task, custUtil) {
   
    /**
     * Definition of the Scheduled script trigger point.
     *
     * @param {Object} scriptContext
     * @param {string} scriptContext.type - The context in which the script is executed. It is one of the values from the scriptContext.InvocationType enum.
     * @Since 2015.2
     */
    function executeUpdate(context) 
    {
    	var paramSearchId = runtime.getCurrentScript().getParameter('custscript_151_searchid'),
    		paramLastProcessed = runtime.getCurrentScript().getParameter('custscript_151_lastid'),
    		paramNotifier = runtime.getCurrentScript().getParameter('custscript_151_lognotifier');
    	
    	try
    	{
    		var massSearch = search.load({
    			'id':paramSearchId
    		});
    		
    		//if this was rescheduled (last processed ID would have been passed in
    		//	make sure to build the search to return internal ID less than last processed ID
    		log.debug('paramLastProcessed', paramLastProcessed);
    		if (paramLastProcessed)
    		{
    			var massFilter = massSearch.filterExpression;
    			//Add additional filter to this search
    			massFilter.push('AND');
    			massFilter.push(['internalidnumber','lessthan', paramLastProcessed]);
    			
    			//Set the filter back to this search
    			massSearch.filterExpression = massFilter;
    		}
    		
    		var massResultSet = massSearch.run(),
    			massrs = massResultSet.getRange({
    				'start':0,
    				'end':1000
    			}),
    			allCols = massResultSet.columns,
    			//Column Order: Internal ID, Status, Detail
    			logHtmlBody = '';
    		
    		//Loop througgh each result and execute load/save
    		for (var m=0; massrs && m < massrs.length; m+=1)
    		{
    			var lpcId = massrs[m].getValue(allCols[0]);
    			
    			log.debug('lpc id', lpcId+' // Result Size: '+massrs.length);
    			
    			logHtmlBody += '<tr>';
    			try
    			{
    				//Load the record in dynamic mode
    				var lpcRec = record.load({
    					'type':massrs[m].recordType,
    					'id':lpcId,
    					'isDynamic':true
    				});
    				
    				//Simply Save the record
    				lpcRec.save({
    					'enableSourcing':true,
    					'ignoreMandatoryFields':true
    				});
    				
    				//log.debug('Saved LPC', lpcId);
    				
    				logHtmlBody += '<td>'+lpcId+'</td>'+
    						   	   '<td>Success</td>'+
    						   	   '<td>Load/Saved L/P/C Record</td>';
    			}
    			catch(upderr)
    			{
    				logHtmlBody += '<td>'+lpcId+'</td>'+
							   	   '<td>Fail</td>'+
							   	   '<td>'+custUtil.getErrDetail(upderr)+'</td>';
    				
    				log.error('Error Saving '+lpcId, custUtil.getErrDetail(upderr));
    			}
    			
    			logHtmlBody += '</tr>';
    			
    			var pctCompleted = Math.round(((m+1) / massrs.length) * 100);
        		runtime.getCurrentScript().percentComplete = pctCompleted;
    			
    			//Reschedule logic here
    			if ((m+1 == massrs.length) || runtime.getCurrentScript().getRemainingUsage() < 500)
    			//if (m == 50)
    			{
    				var schSctTask = task.create({
    					'taskType':task.TaskType.SCHEDULED_SCRIPT
    				});
    				schSctTask.scriptId = runtime.getCurrentScript().id;
    				schSctTask.deploymentId = runtime.getCurrentScript().deploymentId;
    				schSctTask.params = {
    					'custscript_151_lastid':lpcId
    				};
    				
    				schSctTask.submit();
    				
    				log.audit('Rescheduled at', lpcId);

    				break;
    			}
    		}
    		
    		//Generate Email
    		if (logHtmlBody)
    		{
    			logHtmlBody = '<table border="1">'+
    						  '<tr><td><b>Internal ID</b></td>'+
    						  '<td><b>Status</b></td>'+
    						  '<td><b>Details</b></td></tr>'+
    						  logHtmlBody+
    						  '</table>';
    			email.send({
    				'author':-5,
    				'recipients':paramNotifier,
    				'subject':'Custom Territory Mass Update Log',
    				'body':logHtmlBody
    			});
    			
    		}
    		
    	}
    	catch(procerr)
    	{
    		log.error(
    			'Error Processing Territory Mass Update',
    			custUtil.getErrDetail(procerr)
    		);
    		
    		//Throw Error with Notification ON
    		//Throw Error with Detail message
			throw error.create({
				'name':'TERRITORY_MASS_UPDATE_ERROR',
				'message':'Unexpected Error mass updating territory for L/P/C // '+
						  'NetSuite Error Detail: '+
						   custUtil.getErrDetail(procerr),
						   
						   //TESTING.
				'notifyOff':true
			});
    		
    	}
    }

    return {
        execute: executeUpdate
    };
    
});
