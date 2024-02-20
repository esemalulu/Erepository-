/**
 * @NApiVersion 2.x
 * @NScriptType ScheduledScript
 * @NModuleScope SameAccount
 */
define(['N/file','N/query','N/task','N/runtime'],

function(file,query,task,runtime) {
   
    /**
     * Definition of the Scheduled script trigger point.
     *
     * @param {Object} scriptContext
     * @param {string} scriptContext.type - The context in which the script is executed. It is one of the values from the scriptContext.InvocationType enum.
     * @Since 2015.2
     */
    function execute(scriptContext) {
    	try
    	{
    		var scriptObj = runtime.getCurrentScript();
    		log.debug('Script parameter of custscript1: ' + scriptObj.getParameter({name: 'custscript_data_set_id'}));
    		
    		var tempDate=new Date();
    		var fileObj = file.create({
    		    name:tempDate+' workbook data export.csv',
    		    fileType: file.Type.CSV,
    		    contents: '',
    		    folder: 49246072
    		});
    		
    		var fileId=fileObj.save();
    		
    		var myLoadedQuery = query.load({
    		    id: scriptObj.getParameter({name: 'custscript_data_set_id'})
    		});
    		
    		
    		var mrTask = task.create({
    		    taskType: task.TaskType.QUERY,
    		    fileId: fileId,
    		    query:myLoadedQuery
    		});
    		
    		var taskId=mrTask.submit();
    		log.debug('Task Id',taskId);
    		
    	}catch(e)
    	{
    		log.error('Exception',e);
    	}
    }

    return {
        execute: execute
    };
    
});
