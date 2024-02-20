/**
 * @NApiVersion 2.x
 * @NScriptType ScheduledScript
 * @NModuleScope SameAccount
 */
define(['N/record','N/task'],

function(record, task)
{

function execute(scriptContext)
{
   try
   {
	  	var searchTask = task.create({taskType: task.TaskType.SEARCH});
		searchTask.savedSearchId = 5844;

		var path = 'Item Master Files/Item_master_file.txt';
		searchTask.filePath = path;

		var searchTaskId = searchTask.submit();	
		log.debug('searchTaskId:==',searchTaskId);
	}
	catch(e)
	{
		log.debug({ title: 'Debug', details: 'Exception:=='+ e }); 
	}
					
}//end of execute

    return {
        execute: execute
    };
    
});