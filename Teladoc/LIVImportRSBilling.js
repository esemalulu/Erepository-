/**
 * @NApiVersion 2.x
 * @NScriptType ScheduledScript
 * @NModuleScope SameAccount
 */
define(['N/file', 'N/task', 'N/runtime', 'N/search', 'N/email'],
/**
 * @param {file} file
 * @param {task} task
 */
function(file, task, runtime, search, email) {
    function execute(scriptContext) {
    	try{
	    	log.debug({title: 'execute', details: '*****START*****'});
	    	var rsBillingImportMappingId = runtime.getCurrentScript().getParameter("custscript_rs_billing_import_mapping_id");
	    	log.debug({title: 'execute', details: 'rsBillingImportMappingId = '+rsBillingImportMappingId});
	    	var csvFolderPath = runtime.getCurrentScript().getParameter("custscript_csv_folder_path");
	    	log.debug({title: 'execute', details: 'csvFolderPath = '+csvFolderPath});
	    	var rsBillingProcessedFolderId = runtime.getCurrentScript().getParameter("custscript_rs_billing_processed_folder_id");
	    	log.debug({title: 'execute', details: 'rsBillingProcessedFolderId = '+rsBillingProcessedFolderId});
	    	
	    	//Create filename dynamically
	    	var formattedDate = getFormattedDate(new Date());
			log.debug({title: 'execute', details: 'formattedDate: '+ formattedDate});
			var rsBillingFilename = 'Billing_Snapshot'+ "_" + formattedDate+'.csv'; // eg. Billing_2020_08_01
			log.debug({title: 'execute', details: 'rsBillingFilename: '+ rsBillingFilename});
	    	
			//Search for rsBillingFile id
			/*var results = search.global({
			    keywords: rsBillingFilename
			});
			log.debug({title: 'execute', details: 'results length = '+results.length});
			var rsBillingFileId = results[0].id;
			var rsBillingFileType = results[0].recordType;
			log.debug({title: 'execute', details: 'rsBillingFileId = '+rsBillingFileId});
			log.debug({title: 'execute', details: 'rsBillingFileType = '+rsBillingFileType});*/
			
			//Craete CSV Import Task
	    	var csvImportTask = task.create({taskType: task.TaskType.CSV_IMPORT});
	    	csvImportTask.mappingId = rsBillingImportMappingId; 
	    	//var rsBillingCSVFile = file.load(rsBillingFileId);
	    	//var rsBillingCSVFile = file.load('SuiteScripts/custjoblist.csv')
	    	var rsBillingCSVFile = file.load(csvFolderPath+rsBillingFilename);
	    	log.debug({title: 'execute', details: 'Loaded File Id = '+rsBillingCSVFile.id});
	    	csvImportTask.importFile = rsBillingCSVFile;
	    	var csvImportTaskId = csvImportTask.submit();
	    	log.debug({title: 'execute', details: 'CSV Import Task Submitted. csvImportTaskId = '+csvImportTaskId});
	    	
	    	/*rsBillingCSVFile.folder = parseInt(rsBillingProcessedFolderId);
	    	rsBillingCSVFile.save();
	        log.debug({title: 'execute', details: 'File moved to Proessed folder Successfully!!!'}); */
	    	
	    	/*var authorId = 3;
            var recipientEmail = runtime.getCurrentUser().id;
            email.send({
                author: authorId,
                recipients: recipientEmail,
                subject: 'RS Billing CSV Import submitted successfully',
                body: 'Hi,\n'+
                		'NetSuite process to import RS Billing CSV file is submitted successfully.\n'+
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
                subject: 'Failed to submit the CSV File Import',
                body: 'Hi,\n'+
        				'NetSuite process to submit the CSV File Import.\n'+
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
		//return year + '_' + month + '_' + '01';
      	return year + '_' + month + '_' + day;
	}
    return {
        execute: execute
    };
    
});
