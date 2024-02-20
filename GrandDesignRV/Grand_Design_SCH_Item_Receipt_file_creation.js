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
		var id = searchTask.savedSearchId = 5101;
		log.debug('id:==',id);

		var path = 'Item Receipts WGO/Item_receipt_file.csv';
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