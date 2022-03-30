/**
 * @NApiVersion 2.x
 * @NScriptType ScheduledScript
 * @NModuleScope SameAccount
 */

define(['N/sftp', 'N/file', 'N/record','N/search','N/runtime', 'N/email'],
function (sftp, file, record, search, runtime, email){
	function execute(scriptContext) {
		log.debug({title: 'execute', details: '*****START*****'});
		//Read Script Parameters
		var livSFTPRecId = runtime.getCurrentScript().getParameter("custscript_liv_sftp_rec");
		var outboundDirectory = runtime.getCurrentScript().getParameter("custscript_outbound_directory");
		var anaplanProcessedFolderId = runtime.getCurrentScript().getParameter("custscript_anaplan_processed_folderid");
		log.debug({title: 'execute', details: 'livSFTPRecId: '+ livSFTPRecId});
		log.debug({title: 'execute', details: 'outboundDirectory: '+ outboundDirectory});
		log.debug({title: 'execute', details: 'anaplanProcessedFolderId: '+ anaplanProcessedFolderId});
		
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
			var filename = 'Anaplan'+ "_" + formattedDate+'.csv';
			
			var results = search.global({
			    keywords: filename
			});
			
			log.debug({title: 'execute', details: 'results length = '+results.length});
			
			var anaplanCSVFileId = results[0].id;
			var recordType = results[0].recordType; 
		
			log.debug({title: 'execute', details: 'anaplanCSVFileId = '+anaplanCSVFileId});
			log.debug({title: 'execute', details: 'recordType = '+recordType});
			
			var fileToUpload = file.load(anaplanCSVFileId); 
        	
        	//Create Connection with SFTP
        	var connection = sftp.createConnection({
        		username: username,
		        passwordGuid: passwordGuid,
		        url: url,
		        port: parseInt(port),
		        directory: '/',
		        hostKey: hostKey
			});
        	
       		//Uploading the file to the external SFTP server.
	        connection.upload({
	        	directory: outboundDirectory,
		        file: fileToUpload,
		        replaceExisting: true
	        });
      
	        log.debug({title: 'execute', details: 'File Uploaded to SFTP Successfully!!!'}); 
	        fileToUpload.folder = parseInt(anaplanProcessedFolderId);
	        fileToUpload.save();
	        log.debug({title: 'execute', details: 'File moved to Proessed folder Successfully!!!'}); 
	        
	        /*var authorId = 3;
            var recipientEmail = runtime.getCurrentUser().id;
            email.send({
                author: authorId,
                recipients: recipientEmail,
                subject: 'Uploaded CSV file to SFTP successfully',
                body: 'Hi,\n'+
                		'NetSuite process to upload the CSV file to SFTP is completed successfully.\n'+
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
                subject: 'Failed to upload the CSV file to SFTP',
                body: 'Hi,\n'+
        				'NetSuite process to upload the CSV to SFTP has filed.\n'+
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