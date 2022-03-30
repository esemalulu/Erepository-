/**
 *@NApiVersion 2.x
 *@NScriptType ScheduledScript
 */
define(['N/search', 'N/record', 'N/email', 'N/runtime', 'N/sftp', 'N/file'],
		
function(search, record, email, runtime, sftp, file) 
{
		
        function execute(context) 
        {
        	
		            //if (context.type !== context.InvocationType.ON_DEMAND)
		            //return;
		            
		            //var searchId = runtime.getCurrentScript().getParameter("custscript_searchid");
		            
		            try 
		            {
		            	
		            	 var myPwdGuid = "B34672495064525E5D65032D63B52301";
		                 var myHostKey = "AAA1234567890Q=";

		                 // establish connection to remote FTP server
		          
		                 var connection = sftp.createConnection({
		                     username: 'myuser',
		                     passwordGuid: myPwdGuid, // references var myPwdGuid
		                     url: 'host.somewhere.com',
		                     directory: 'myuser/wheres/my/file',
		                     hostKey: myHostKey // references var myHostKey
		                 });

		                 // specify the file to upload using the N/file module
		          
		                 var myFileToUpload = file.create({
		                     name: 'originalname.js',
		                     fileType: file.Type.PLAINTEXT,
		                     contents: 'I am a test file. Hear me roar.'
		                 });

		                 // upload the file to the remote server
		          
		                 connection.upload({
		                     directory: 'relative/path/to/remote/dir',
		                     filename: 'newFileNameOnServer.js',
		                     file: myFileToUpload,
		                     replaceExisting: true
		                 });

		            	
/*            	
		            		            	
		                	search.load({id: searchId}).run().each(function(result) 
		                	{				                	            	
				                	
				                	log.debug({details: 'transforming so :' + result.id + ' to item fulfillment'});
				                				                
				                    var fulfillmentRecord = record.transform({
				                        fromType: record.Type.SALES_ORDER,
				                        fromId: result.id,
				                        toType: record.Type.ITEM_FULFILLMENT,
				                        isDynamic: false
				                    	});
				                    
				                    var lineCount = fulfillmentRecord.getLineCount('item');
				                    
				                    for (var i = 0; i < lineCount; i++) 
				                    {
				                        fulfillmentRecord.setSublistValue('item', 'location', i, 1);
				                    }
				                    
				                    var fulfillmentId = fulfillmentRecord.save();
				                    
				                    var so = record.load({
				                        type: record.Type.SALES_ORDER,
				                        id: result.id
				                    	});
				                    
				                    so.setValue('memo', fulfillmentId);
				                    so.save();
				                    return true;	                   	                    
		                    
		                	});
		                	
*/		                	
		                	
		                	                	
		                	
		            } 
		            catch (e) 
		            {
		                	var authorId = -5;	
			                var recipientEmail = 'elijah.semalulu@achievers.com';
			                var subject = 'ERROR!';
			                
			                email.send({
			                    		author: authorId,
			                    		recipients: recipientEmail,
			                    		subject: subject,
			                    		body: 'Fatal error occurred in script: ' + runtime.getCurrentScript().id + '\n\n' + JSON.stringify(e)
			                			});
		            }
        }
        return 
        {
            execute: execute
        };
        
        
    });