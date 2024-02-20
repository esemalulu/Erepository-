/**
 * Scheduled script, Map/Reduce, and other task-related functions for Solution Source accounts. 
 * @NApiVersion 2.x
 * @NModuleScope Public
 */
define(['N/task', 'N/search', 'N/record'],
/**
 * @param {task} task
 * @search {search} search
 * @record {record} record
 */
function(task, search, record) {
	
	/**
	 * Schedules a script using the specified parameters.
	 */
	function scheduleScript(scriptId, deployId, params) {
		//Create the scheduled script task.
		var scheduledTask = task.create({taskType: task.TaskType.SCHEDULED_SCRIPT});
		scheduledTask.scriptId = scriptId;
		scheduledTask.params = params;
		
		//If the deployment is set, then use it and deploy the script
		if (deployId != null && deployId.length > 0) {
			scheduledTask.deploymentId = deployId;
			return scheduledTask.submit();
		}
		
		//Otherwise we need to try to deploy the script and maybe create a new deployment we can't find an existing one.
		try	{
			//This will work if we have a pre-existing Auto Deployment that isn't being used.
			//TODO: figure out a better of doing this than a try-catch.
			return scheduledTask.submit();
		}
		catch (err)	{
			//Then we need to create a new deployment for the scheduled task since there are no "idle" deployments available.
			//First do a search for the script record
			var searchResults = search.create({
				type: search.Type.SCHEDULED_SCRIPT,
				filters: [['scriptid', 'is', scriptId]]
			}).run().getRange({
				start: 0,
				end: 1
			});
			
			if (searchResults != null && searchResults.length > 0) {
				//Create the new deployment record
				var newDeployment = record.create({
					type: record.Type.SCRIPT_DEPLOYMENT,
					defaultValues: {script: searchResults[0].id}
				});
				newDeployment.setValue({fieldId: 'isdeployed', value: true });
				newDeployment.setValue({fieldId: 'title', value: 'Auto Deployment' });
				var newDeploymentId = newDeployment.save();
				
				//Set the deployment Id on the task and schedule it
				scheduledTask.deploymentId = search.lookupFields({
					type: search.Type.SCRIPT_DEPLOYMENT,
					id: newDeploymentId,
					columns: 'scriptid'
				})['scriptid'];
				return scheduledTask.submit();
			}
			else {
				throw 'Cannot schedule script with ID "' + scriptId + '" because it cannot be found in a search.';
			}
		}
	}
	
	/**
     * Queues map/reduce script with the specified script id and deployment id with the given parameters.
     * If no deployment id is given, it tries to create a new one.
     */
    function startMapReduceScript(scriptId, deployId, params, priority, concurrencylimit, yieldaftermins) {
        var mrTask = task.create({taskType: task.TaskType.MAP_REDUCE});
        mrTask.scriptId = scriptId;
        mrTask.params = params;
        
        //If the deployment is set, then use it and deploy the script
        if (deployId != null && deployId.length > 0) {
            mrTask.deploymentId = deployId;
            return mrTask.submit();
        }
        
        //Otherwise we need to try to deploy the script and maybe create a new deployment we can't find an existing one.
        try {
            //This will work if we have a pre-existing Auto Deployment that isn't being used.
            //TODO: figure out a better of doing this than a try-catch.
            return mrTask.submit();
        }
        catch (err) {
            //Then we need to create a new deployment for the map/reduce task since there are no "idle" deployments available.
            //First do a search for the script record
            var searchResults = search.create({
                type: search.Type.MAP_REDUCE_SCRIPT,
                filters: [['scriptid', 'is', scriptId]]
            }).run().getRange({
                start: 0,
                end: 1
            });
            
            if (searchResults != null && searchResults.length > 0) {
                //Create the new deployment record
                var newDeployment = record.create({
                    type: record.Type.SCRIPT_DEPLOYMENT,
                    defaultValues: {script: searchResults[0].id}
                });
                newDeployment.setValue({fieldId: 'isdeployed', value: true });
                newDeployment.setValue({fieldId: 'title', value: 'Auto Deployment' });
               
                if (priority != null && priority != '')
                    newDeployment.setValue({fieldId: 'priority', value: priority });
                if (concurrencylimit != null && concurrencylimit != '')
                    newDeployment.setValue({fieldId: 'concurrencylimit', value: concurrencylimit });
                if (yieldaftermins != null && yieldaftermins != '')
                    newDeployment.setValue({fieldId: 'yieldaftermins', value: yieldaftermins });
                
                var newDeploymentId = newDeployment.save();
                
                //Set the deployment Id on the task and schedule it
                mrTask.deploymentId = search.lookupFields({
                    type: search.Type.SCRIPT_DEPLOYMENT,
                    id: newDeploymentId,
                    columns: 'scriptid'
                })['scriptid'];
                return mrTask.submit();
            }
            else {
                throw 'Cannot start map/reduce script with ID "' + scriptId + '" because it cannot be found in a search.';
            }
        }
    }
	
	   
    return {
    	scheduleScript: scheduleScript,
    	startMapReduceScript: startMapReduceScript
    };
    
});
