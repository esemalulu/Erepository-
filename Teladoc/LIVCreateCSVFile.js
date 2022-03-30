/**
 * @NApiVersion 2.x
 * @NScriptType ScheduledScript
 * @NModuleScope SameAccount
 */

define(['N/file', 'N/task','N/search','N/runtime', 'N/email'],
function (file, task, search, runtime, email){
	function execute(scriptContext) {
		log.debug({title: 'execute', details: '*****START*****'});
		//Read Script Parameters
		var nsFolderId = runtime.getCurrentScript().getParameter("custscript_ns_folderid");
		var savedSearchId = runtime.getCurrentScript().getParameter("custscript_saved_searchid");
		var csvFileName = runtime.getCurrentScript().getParameter("custscript_file_name");
		
		var formattedDate = getFormattedDate(new Date());
		var filename = csvFileName +'.csv';
		log.debug({    
            title: ' execute', details: 'filename = ' + filename
        });
		
	      try{
		    var csvFile = file.create({
		    	name: filename,
		    	folder: nsFolderId, 
		        fileType: 'CSV'
		    });
		    
		    var csvFileId = csvFile.save();
 
	        var savedSearchTask = task.create({
	            taskType: task.TaskType.SEARCH
	        });
	        savedSearchTask.savedSearchId = savedSearchId;
	        savedSearchTask.fileId = csvFileId; 
	        var savedSearchTaskId = savedSearchTask.submit();

	        // Retrieve the status of the search task.
	        var savedSearchTaskStatus = task.checkStatus({
	            taskId: savedSearchTaskId
	        });
	    	
	        log.debug({    
                title: 'execute', 
                details: 'savedSearchTaskStatus.status: ' + savedSearchTaskStatus.status
            });	        
		}
		catch(e){          
			log.error ({title: e.name, details: e.stack}); 
		}
		log.debug({title: 'execute', details: '*****END*****'}); 
	}
	function getFormattedDate(date) {
		var year = date.getFullYear();
		var month = (1 + date.getMonth()).toString();
		month = month.length > 1 ? month : '0' + month;
		var day = date.getDate().toString();
		day = day.length > 1 ? day : '0' + day;
		return month + '_' + day + '_' + year;
	}
	return {
		execute: execute
	};
 });