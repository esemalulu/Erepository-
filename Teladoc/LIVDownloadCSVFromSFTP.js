/**
 * @NApiVersion 2.x
 * @NScriptType ScheduledScript
 * @NModuleScope SameAccount
 */

define(['N/sftp', 'N/file', 'N/record','N/search','N/runtime', 'N/email', 'N/task'],
function (sftp, file, record, search, runtime, email, task){
	function execute(scriptContext) {
		log.debug({title: 'execute', details: '*****START*****'});
		//Read Script Parameters
		var livSFTPRecId = runtime.getCurrentScript().getParameter("custscript_liv_sftp_recid");
		var inboundDirectory = runtime.getCurrentScript().getParameter("custscript_inbound_directory");
		var downloadFileFolderId = runtime.getCurrentScript().getParameter("custscript_downloadfile_folderid");
		var triggerRSBillingImport = runtime.getCurrentScript().getParameter("custscript_trigger_rs_billing_import");
		var scriptInternalId = runtime.getCurrentScript().getParameter("custscript_script_internal_id");;
		var scriptDeploymentId = runtime.getCurrentScript().getParameter("custscript_script_deployment_id");;
		
		log.debug({title: 'execute', details: 'livSFTPRecId: '+ livSFTPRecId});
		log.debug({title: 'execute', details: 'inboundDirectory: '+ inboundDirectory});
		log.debug({title: 'execute', details: 'downloadFileFolderId: '+ downloadFileFolderId});
		log.debug({title: 'execute', details: 'triggerRSBillingImport: '+ triggerRSBillingImport});
		log.debug({title: 'execute', details: 'scriptInternalId: '+ scriptInternalId});
		log.debug({title: 'execute', details: 'scriptDeploymentId: '+ scriptDeploymentId});
		
		var livSFTPRec = record.load({
		    type: 'customrecord_liv_sftp_credentials',
		    id: livSFTPRecId,
		    isDynamic: true
		});
		
		var username = livSFTPRec.getValue({fieldId: 'custrecord_username'});
		var passwordGuid = livSFTPRec.getValue({fieldId: 'custrecord_password_guid'});
		var port = livSFTPRec.getValue({fieldId: 'custrecord_port'});
		var hostKey = livSFTPRec.getValue({fieldId: 'custrecord_host_key'});
		//var directory = livSFTPRec.getValue({fieldId: 'custrecord_directory'});
		var url = livSFTPRec.getValue({fieldId: 'custrecord_url'});
		
		log.debug({title: 'execute', details: 'username: '+ username});
		log.debug({title: 'execute', details: 'passwordGuid: '+ passwordGuid});
		log.debug({title: 'execute', details: 'port: '+ port});
		log.debug({title: 'execute', details: 'hostKey: '+ hostKey});
		//log.debug({title: 'execute', details: 'directory: '+ directory});
		log.debug({title: 'execute', details: 'url: '+ url});
		
		try{
			var formattedDate = getFormattedDate(new Date());
			log.debug({title: 'execute', details: 'formattedDate: '+ formattedDate});
			var filename = 'Billing_Snapshot'+ "_" + formattedDate+'.csv'; // eg. Billing_Snapshot_2020_08_01
			log.debug({title: 'execute', details: 'filename: '+ filename});
        	
        	//Create Connection with SFTP
        	var connection = sftp.createConnection({
        		username: username,
		        passwordGuid: passwordGuid,
		        url: url,
		        port: parseInt(port),
		        directory: '/',
		        hostKey: hostKey
			});
        	
       		//Downloading the file to the external SFTP server.
        	var downloadedFile = connection.download({
        	      directory: inboundDirectory,
        	      filename: filename
        	   });
        	log.debug({title: 'execute', details: 'File Downloaded to NetSuite Successfully!!!'}); 
        	downloadedFile.folder = downloadFileFolderId;
        	downloadedFile.save();
	        log.debug({title: 'execute', details: 'File saved to File Cabinet Successfully!!!'}); 
	        
	        if(triggerRSBillingImport){
	        	log.debug({title: 'execute', details: 'Triggering RS Billing CSV Import Script'}); 
	        	var scriptTask = task.create({taskType: task.TaskType.SCHEDULED_SCRIPT});
            	scriptTask.scriptId = scriptInternalId;
            	scriptTask.deploymentId = scriptDeploymentId;
            	var scriptTaskId = scriptTask.submit();
            	var taskStatus = task.checkStatus(scriptTaskId);
            	
            	log.debug({title: 'execute', details: 'Triggered RS Billing CSV Import Script'}); 
            	log.debug({
                	title: 'execute',
                    details: 'RS Billing CSV Import Script Staus:' + taskStatus.status
                });
	        }
	        
	        /*var authorId = 3;
            var recipientEmail = runtime.getCurrentUser().id;
            email.send({
                author: authorId,
                recipients: recipientEmail,
                subject: 'Downloaded CSV file from SFTP successfully',
                body: 'Hi,\n'+
                		'NetSuite process to download the CSV file to SFTP is completed successfully.\n'+
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
                subject: 'Failed to download the CSV file from SFTP',
                body: 'Hi,\n'+
        				'NetSuite process to download the CSV from SFTP has filed.\n'+
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