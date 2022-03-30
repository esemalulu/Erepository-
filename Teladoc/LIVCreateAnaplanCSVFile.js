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
		var anaplanFolderId = runtime.getCurrentScript().getParameter("custscript_anaplan_folderid");
		var anaplanSavedSearchId = runtime.getCurrentScript().getParameter("custscript_anaplan_searchid");
		var filePrefix = runtime.getCurrentScript().getParameter("custscript_file_prefix");
		
		var formattedDate = getFormattedDate(new Date());
		var filename = filePrefix + "_" + formattedDate+'.csv';
		log.debug({    
            title: ' execute', details: 'filename = ' + filename
        });
		
	      try{
		    var anaplanFile = file.create({
		    	name: filename,
		    	folder: anaplanFolderId, 
		        fileType: 'CSV'
		    });
		    
		    var anaplanCSVFileId = anaplanFile.save();
	        log.debug({    
	            title: ' Anaplan CSV File Created Successfully!!!', 
	            details: 'Anaplan CSV File ID: ' + anaplanCSVFileId
	        });
 
	        var savedSearchTask = task.create({
	            taskType: task.TaskType.SEARCH
	        });
	        savedSearchTask.savedSearchId = anaplanSavedSearchId;
	        savedSearchTask.fileId = anaplanCSVFileId; 
	        var savedSearchTaskId = savedSearchTask.submit();

	        // Retrieve the status of the search task.
	        var savedSearchTaskStatus = task.checkStatus({
	            taskId: savedSearchTaskId
	        });
	    	
	        log.debug({    
                title: 'execute', 
                details: 'savedSearchTaskStatus.status: ' + savedSearchTaskStatus.status
            });	        
	
			/*var authorId = 3;
            var recipientEmail = runtime.getCurrentUser().id;
            email.send({
                author: authorId,
                recipients: recipientEmail,
                subject: 'Created CSV file successfully',
                body: 'Hi,\n'+
                		'NetSuite process to create the CSV is completed successfully.\n'+
                		'Thank you,\n'+
                		'NetSuite Administrator.'
            });*/
		}
		catch(e){          
			log.error ({title: e.name, details: e.stack}); 
			/*var authorId = 3;
            var recipientEmail = 'finapps-support@livongo.com';
            email.send({
                author: authorId,
                recipients: recipientEmail,
                subject: 'Failed to create the CSV file',
                body: 'Hi,\n'+
        				'NetSuite process to create the CSV has filed.\n'+
        				'Please contact NetSuite Adminstrator'+
        				'Thank you.'
            });*/
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