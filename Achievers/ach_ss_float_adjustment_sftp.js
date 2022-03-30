/**
 *@NApiVersion 2.0
 *@NScriptType ScheduledScript
 * @NModuleScope SameAccount
 */
define(['N/error','N/search', 'N/record', 'N/email', 'N/runtime', 'N/sftp', 'N/file', 'N/crypto','N/task' ],

/**
 * @param {error} error
 * @param {search} search
 * @param {record} record
 * @param {email} email
 * @param {runtime} runtime
 * @param {sftp} sftp
 * @param {file} file
 */


function(error, search, record, email, runtime, sftp, file, crypto, task) {

        function execute(context)
        {

							var searchId = runtime.getCurrentScript().getParameter('custscript_searchid');
/*
							var myPwdGuid = '20d9fdab10fd47a8a027023a9d4fd96c';
							var myHostKey = 'AAAAB3NzaC1yc2EAAAABIwAAAQEAvKfu3RTbBUKAhTr8DLL1TC8l5hyLEqkgK7k8+daZ397NB1Z5MFVz7hoeiiR6gu0v4Bb/a/A+PKMwvzp0iXE4k+LD2FRYJNntpv534Nw3bTEQ47qgj5nTJqfb2rp3qffy5LhcNxowvjVqxeVEB6JNUEzkE99jHHzGBQW4P2r/UJlhXw8Ny4CZQfXBZ7YhHuPc1JMT5QPbomkqJABXdxXIVZp15bTvtrQwYJ6r/wsNUioD9+tGmpLtUV+Js5LL0DKGr2Lrd+X4kJ4gt/fE9QKM8y6L/7izY7ypGwsI5NNrPOAooSuDi16D+s+Llr5K7zr3/Sgp6Dp/GnCfS8/aekLpVw==';
*/

          					var myPwdGuid = 'af29e846a01540f3a94214daa3d7cd62';
							var myHostKey = 'ly21bo4vdt0v9dmF58jMEwjMc1Pox36F87rM74Yq21w=';

							var csvHeader = 'Internal ID, Date, Status, Document Number, Item, Account, Currency, Amount, Foregein Currency Amount, Created From\n';
							var csvBody = '';

		                	var searchResults = search.load({id: searchId}).run().getRange({
                                                start: 0,
                                                end: 1000
                                                });

           					for (var i = 0; i < searchResults.length; i++) 
                            {
								csvBody += '"'+searchResults[i].getValue({'name' : 'internalid'})+'",'+

								'"'+searchResults[i].getValue({'name' : 'trandate'})+'",'+
								'"'+searchResults[i].getValue({'name' : 'statusref'})+'",'+
								'"'+searchResults[i].getValue({'name' : 'tranid'})+'",'+
								'"'+searchResults[i].getValue({'name' : 'item'})+'",'+
								'"'+searchResults[i].getValue({'name' : 'account'})+'",'+
								'"'+searchResults[i].getValue({'name' : 'currency'})+'",'+
								'"'+searchResults[i].getValue({'name' : 'amount'})+'",'+
								'"'+searchResults[i].getValue({'name' : 'fxamount'})+'",'+
								'"'+searchResults[i].getValue({'name' : 'tranid', join: "createdFrom",})+'"\n';
           					}

                            var adjusmentFile = file.create({
                                name: 'floatAdjustments.csv',
                                fileType: file.Type.CSV,
                                contents: csvHeader + csvBody,
                                folder: 4086,
                                isOnline: false
                            });

						var fileId = adjusmentFile.save();

		                 // establish connection to remote FTP server
						var FLAG = true;

						log.debug({title: 'Start', details: 'Connecting'});
          
                        var connection = sftp.createConnection({
                          username: 'ELI',
                          passwordGuid: myPwdGuid,
                          url: '192.168.0.99',
                          directory: '/',
                          hostKey: myHostKey,
                          port: 22

                        	});

                        try
                        {


                             // upload the file to the remote server
                             connection.upload({
                                file: fileId,
                                filename: 'floatAdjustments.csv',
                                directory: 'Users/user1/Desktop',
                                replaceExisting: false
                             	});

                        }
                        catch (err)
                        {
                                log.debug({title: 'Failed', details: 'Error: ' + err});

                                if (err.name == "NO_ROUTE_TO_HOST_FOUND")
                                {
                                    FLAG = false;
                                }

                        }


                        if(FLAG)
                        {
                              log.debug({title: 'Success',details: 'Successfully Connected'});

                        }
                        else
                        {
                                log.debug({title: 'Failed',details: 'Rescheduling...'});

                                var scriptTask = task.create({'taskType': task.TaskType.SCHEDULED_SCRIPT});

                                scriptTask.scriptId = runtime.getCurrentScript().id;
                                scriptTask.deploymentId = runtime.getCurrentScript().deploymentId;

                                var scriptTaskId = scriptTask.submit();

                                log.debug({title: 'Failed', details: 'Rescheduled ID: ' + scriptTaskId});
                        }


        }


        return  {
            		execute: execute
        		};

    });



