/**
 * Part of duplicate deletion process.
 * This script is triggered based manually per each Saved searches that contains list of
 * records to be deleted.
 * 
 * Each Deleting records will gets its' own folder under 
 * AXD-Duplicate Deletion Backup > JSON Folder(228598)
 * 
 * CSV log file is generated each time script reschedules itself or completes execution without reschedule.
 * AXD-Duplicate Deletion Backup > Process Logs (228599)
 * 
 * Each L/P/C record being deleted will get it's own Folder with name format: [InternalID]_[Entity ID]
 * Under each sub folder, one or more JSON files will be stored related to the L/P/C Record being deleted.
 * JSON file format: [InternalId]_[recordtype].js
 * 
 * All Saved Searches should be sorted in Internal ID DESC order
 * 0 = First column of each search is always Internal ID of customer
 * 1 = Second column of each search is always entity id
 * 2 = Third column of each search is always entity status 
 * 3 = Fourth column of each search is always Sync to Marketo 
 * Version    Date            Author           Remarks
 * 1.00       06 May 2016     json@audaxium
 *
 */

/**
 * @param {String} type Context Types: scheduled, ondemand, userinterface, aborted, skipped
 * @returns {Void}
 */
function dupeDeleteProcess(type) 
{
	var isRescheduled=false;
	var paramSsId = nlapiGetContext().getSetting('SCRIPT', 'custscript_422_ssid');
	var paramSsTitle = nlapiGetContext().getSetting('SCRIPT', 'custscript_422_sstitle');
	var paramLogNotifier = nlapiGetContext().getSetting('SCRIPT', 'custscript_422_lognotifemp');
	var paramLastProcId = nlapiGetContext().getSetting('SCRIPT', 'custscript_422_lastprocid');
	var paramFolderId = '228598';
	var paramProcessLogFolderId = '228599';
	var delLogCsvHeader = '"Search ID","InternalID","Stage/Status",'+
						  '"Name","Delete Status","Delete Log"\n';
	var delLogCsvBody = '';
	var prevId = '';
	
	try
	{
		
		var sflt = null,
			srs = null;
		if (paramLastProcId)
		{
			sflt = [new nlobjSearchFilter('internalidnumber', null, 'lessthan', paramLastProcId)];
		}
		
		srs = nlapiSearchRecord(null, paramSsId, sflt, null);
		
		//Go through each record 
		if (srs && srs.length > 0)
		{
			var allCols = srs[0].getAllColumns();
			
			srsloop:
			for (var s=0; srs && s < srs.length; s+=1)
			{
				
				if (!prevId)
				{
					prevId = srs[s].getValue(allCols[0]);
				}
				
				try
				{
					//Filter used for all child record search
					var relflt = [new nlobjSearchFilter(
									'internalid', 
									null, 
									'anyof',
									srs[s].getValue(allCols[0])
								  )];
					
					//**** 00. Check for Transaction FIRST. If Transaction Exists, DO NOT Delete and Continue
					var trxcol = [new nlobjSearchColumn('internalid', null,'group'),
					              new nlobjSearchColumn('internalid','transaction','count')];
					//search to see if this customer has any matching transaction records
					var trxrs = nlapiSearchRecord('customer', null, relflt, trxcol);
					log
					(
						'debug',
						'transaction count for '+srs[s].getValue(allCols[0]), 
						trxrs[0].getValue('internalid','transaction','count')
					);
					
					//IF there are any transaction, DO NOT Process
					if (parseInt(trxrs[0].getValue('internalid','transaction','count')) > 0)
					{
						delLogCsvBody += '"'+paramSsId+'",'+
										 '"'+srs[s].getValue(allCols[0])+'",'+
										 '"'+srs[s].getText(allCols[2])+'",'+
										 '"'+srs[s].getValue(allCols[1])+'",'+
										 '"ERROR",'+
										 '"Process found '+trxrs[0].getValue('internalid','transaction','count')+
										 	' transaction(s) associated with it"\n';
		
						log('ERROR',
							'Error Deleting '+srs[s].getValue(allCols[0]), 
							'Found Transaction associated with it'
						);
					}
					//Proceed with deletion
					else
					{
						//************************* 1. Look up or Create Folder for THIS
						var recFolderId = '',
							recordFolderName = srs[s].getValue(allCols[0]) +
											   '-'+
											   srs[s].getValue(allCols[1]),
							fldrFlt = [new nlobjSearchFilter('name', null, 'is', recordFolderName),
							           new nlobjSearchFilter('parent', null, 'anyof', paramFolderId)],
							fldrCol = [new nlobjSearchColumn('internalid')],
							fldrRs = nlapiSearchRecord('folder', null, fldrFlt, fldrCol);
							
						//Assume there are only one result
						if (fldrRs && fldrRs.length > 0)
						{
							recFolderId = fldrRs[0].getValue('internalid');
						}
						else
						{
							try
							{
								//Create the folder - attempt 1
								var folderRec = nlapiCreateRecord('folder');
								folderRec.setFieldValue('parent',paramFolderId);
								folderRec.setFieldValue('name',recordFolderName);
								recFolderId = nlapiSubmitRecord(folderRec, true, true);
							}
							catch(foldercreateerr)
							{
								log('ERROR',
									srs[s].getValue(allCols[0])+'-'+srs[s].getValue(allCols[1]),
									getErrText(foldercreateerr)
								);
								
								//Second Try with modified recordFolderName
								if (srs[s].getValue(allCols[1]).indexOf(':') > -1)
								{
									var companyNameOnly = srs[s].getValue(allCols[1]).split(' : ');
									companyNameOnly = companyNameOnly[companyNameOnly.length-1];
									
									recordFolderName = srs[s].getValue(allCols[0]) +
									   				   '-'+
									   				companyNameOnly;
									
									//Create the folder - attempt 2
									var folderRec = nlapiCreateRecord('folder');
									folderRec.setFieldValue('parent',paramFolderId);
									folderRec.setFieldValue('name',recordFolderName);
									recFolderId = nlapiSubmitRecord(folderRec, true, true);
									
								}
								else
								{
									//At this point, throw the error entirely 
									throw nlapiCreateError(
										'FOLDER_CREATE_FAIL', 
										'Unable to create folder for '+srs[s].getValue(allCols[0])+'-'+
											srs[s].getValue(allCols[1])+' // Original Error Message: '+getErrText(foldercreateerr), 
										true
									);
								}
							}
							
						}
						
						log('DEBUG', srs[s].getValue(allCols[0])+'-Folder ID / Name', recFolderId+' // '+recordFolderName);
						
						//************************* 2. Email Message backup and delete
						var msgcol = [new nlobjSearchColumn('internalid','messages').setSort(true)], //index 0
							msgrs = nlapiSearchRecord('customer',null,relflt, msgcol);
						
						msgloop:
						for (var m=0; msgrs && m < msgrs.length; m++) 
						{
							//build JSON backup for Email
							if (msgrs[m].getValue('internalid','messages')) 
							{
								try 
								{
									var msgRec = nlapiLoadRecord('message', msgrs[m].getValue('internalid','messages')),
										msgJsFileName = msgrs[m].getValue('internalid','messages')+
														'_'+
														'message.js',
										msgFile = nlapiCreateFile(msgJsFileName, 'JAVASCRIPT', JSON.stringify(msgRec));
									
									//Create and store it on the recFolder
									msgFile.setFolder(recFolderId);
									nlapiSubmitFile(msgFile);
									
									//Delete Message
									nlapiDeleteRecord('message', msgrs[m].getValue('internalid','messages'));
									
								} 
								catch (emaildelerr) 
								{
									throw nlapiCreateError('MESSAGE_DEL_ERR', getErrText(emaildelerr), true);
								}
							}
							//Reschedule logic per each component
							if (nlapiGetContext().getRemainingUsage() < 500) 
							{
								//reschedule
								isRescheduled = true;
								
								log('AUDIT', 'Reschedule','ID: '+prevId);
								
								var rparam = 
								{
									'custscript_422_lastprocid':prevId	
								};
								nlapiScheduleScript(
									nlapiGetContext().getScriptId(), 
									nlapiGetContext().getDeploymentId(), 
									rparam
								);
								log('AUDIT','Breaking out from Msg Loop','Rescheduled here');
								break srsloop;
							}
							
						}
						log('DEBUG',srs[s].getValue(allCols[0])+'-Email Message Backup and Delete', 'Completed');
						
						
						//************************* 3.  Activities backup and delete backup and delete
						var actcol = [new nlobjSearchColumn('internalid','activity').setSort(true),
						              new nlobjSearchColumn('type','activity')],
							actrs = nlapiSearchRecord('customer',null,relflt, actcol);
						
						actloop:
						for (var a=0; actrs && a < actrs.length; a++) 
						{
							//build JSON backup for Activities
							if (actrs[a].getValue('internalid','activity')) 
							{
								var actrectype = 'activity';
								//log.debug('activity type',actrs[a].getValue('type','activity'));
								try 
								{
									if (actrs[a].getValue('type','activity')=='Phone Call') 
									{
										actrectype = 'phonecall';
									} 
									else if (actrs[a].getValue('type','activity')=='Task') 
									{
										actrectype = 'task';
									} 
									else if (actrs[a].getValue('type','activity')=='Event') 
									{
										actrectype = 'calendarevent';
									}
									
									var actRec = nlapiLoadRecord(actrectype, actrs[a].getValue('internalid','activity')),
									actJsFileName = actrs[a].getValue('internalid','activity')+
													'_'+
													actrectype+
													'.js',
									actFile = nlapiCreateFile(actJsFileName, 'JAVASCRIPT', JSON.stringify(actRec));
								
									//Create and store it on the recFolder
									actFile.setFolder(recFolderId);
									nlapiSubmitFile(actFile);
									
									//DELETE Activity
									nlapiDeleteRecord(actrectype, actrs[a].getValue('internalid','activity'));
								} 
								catch (actdelerr) 
								{
									throw nlapiCreateError('ACTIVITY_DEL_ERR', getErrText(actdelerr), true);
								}
							}

							//Reschedule logic per each component
							if (nlapiGetContext().getRemainingUsage() < 500) 
							{
								//reschedule
								isRescheduled = true;
								
								log('AUDIT', 'Reschedule','ID: '+prevId);
								
								var rparam = 
								{
									'custscript_422_lastprocid':prevId	
								};
								nlapiScheduleScript(
									nlapiGetContext().getScriptId(), 
									nlapiGetContext().getDeploymentId(), 
									rparam
								);
								log('AUDIT','Breaking out from Activity Loop','Rescheduled here');
								break srsloop;
							}
							
						}
						log('DEBUG', srs[s].getValue(allCols[0])+'-Activity Backup and Delete', 'Completed');
						
						
						//*************************4. User Note backup and delete
						var notecol = [new nlobjSearchColumn('internalid','userNotes').setSort(true)],
							noters = nlapiSearchRecord('customer',null,relflt, notecol);
						
						noteloop:
						for (var un=0; noters && un < noters.length; un++) 
						{
							//build JSON backup for Note
							if (noters[un].getValue('internalid','userNotes')) 
							{
								try 
								{
									var unRec = nlapiLoadRecord('note', noters[un].getValue('internalid','userNotes')),
										unJsFileName = noters[un].getValue('internalid','userNotes')+
													   '_'+
													   'note.js',
										unFile = nlapiCreateFile(unJsFileName, 'JAVASCRIPT', JSON.stringify(unRec));
										
									//Create and store it on the recFolder
									unFile.setFolder(recFolderId);
									nlapiSubmitFile(unFile);
										
									//Delete UserNote
									nlapiDeleteRecord('note', noters[un].getValue('internalid','userNotes'));	
										
								} 
								catch (notedelerr) 
								{
									throw nlapiCreateError('NOTE_DEL_ERR', getErrText(notedelerr), true);
								}
							}
							//Reschedule logic per each component
							if (nlapiGetContext().getRemainingUsage() < 500) 
							{
								//reschedule
								isRescheduled = true;
								
								//log('AUDIT','Reschedule','ID: '+prevId);
								
								var rparam = 
								{
									'custscript_422_lastprocid':prevId	
								};
								nlapiScheduleScript(
									nlapiGetContext().getScriptId(), 
									nlapiGetContext().getDeploymentId(), 
									rparam
								);
								log('AUDIT','Breaking out from User Note Loop','Rescheduled here');
								break srsloop;
							}
							
						}
						log('DEBUG', srs[s].getValue(allCols[0])+'-User Note Backup and Delete', 'Completed');
						
						//*************************5. Ticket backup and delete
						var supcol = [new nlobjSearchColumn('internalid','case').setSort(true)],
							suprs = nlapiSearchRecord('customer',null,relflt, supcol);
						
						suploop:
						for (var cse=0; suprs && cse < suprs.length; cse++) 
						{
							//build JSON backup for Ticket
							if (suprs[cse].getValue('internalid','case')) 
							{
								
								try 
								{
									var caseRec = nlapiLoadRecord('supportcase', suprs[cse].getValue('internalid','case')),
										caseJsFileName = suprs[cse].getValue('internalid','case')+
												     	 '_'+
												     	 'supportcase.js',
									caseFile = nlapiCreateFile(caseJsFileName, 'JAVASCRIPT', JSON.stringify(caseRec));
									
									//Create and store it on the recFolder
									caseFile.setFolder(recFolderId);
									nlapiSubmitFile(caseFile);
								
									//Delete supportcase
									nlapiDeleteRecord('supportcase', suprs[cse].getValue('internalid','case'));
									
								} 
								catch (casedelerr) 
								{
									throw nlapiCreateError('CASE_DEL_ERR', getErrText(casedelerr), true);
								}
							}
							//Reschedule logic per each component
							if (nlapiGetContext().getRemainingUsage() < 500) 
							{
								//reschedule
								isRescheduled = true;
								
								//log('AUDIT','Reschedule','ID: '+prevId);
								
								var rparam = 
								{
									'custscript_422_lastprocid':prevId	
								};
								nlapiScheduleScript(
									nlapiGetContext().getScriptId(), 
									nlapiGetContext().getDeploymentId(), 
									rparam
								);
								log('AUDIT','Breaking out from Support Case Loop','Rescheduled here');
								break srsloop;
							}
							
						}
						log('DEBUG', srs[s].getValue(allCols[0])+'-Support Case Backup and Delete', 'Completed');
						
						
						//*************************6A. Campaign Response Backup and Delete
						var campcol = [new nlobjSearchColumn('responsecode','campaignResponse').setSort(true)];
						var  camprs = nlapiSearchRecord('customer',null,relflt, campcol);
						
						camploop:
						for (var cre=0; camprs && cre < camprs.length; cre++) 
						{
							//build JSON backup for Ticket
							if (camprs[cre].getValue('responsecode','campaignResponse')) 
							{
								
								try 
								{
									var campResRec = nlapiLoadRecord('campaignresponse', camprs[cre].getValue('responsecode','campaignResponse')),
										campResJsFileName = camprs[cre].getValue('responsecode','campaignResponse')+
												     	 	'_'+
												     	 	'campaignresponse.js',
									campResFile = nlapiCreateFile(campResJsFileName, 'JAVASCRIPT', JSON.stringify(campResRec));
									
									//Create and store it on the recFolder
									campResFile.setFolder(recFolderId);
									nlapiSubmitFile(campResFile);
								
									//Delete supportcase
									nlapiDeleteRecord('campaignresponse', camprs[cre].getValue('responsecode','campaignResponse'));
									
								} 
								catch (campresdelerr) 
								{
									//HERE
									
									//For campaign response, don't throw error.
									// Instead log it
									//throw nlapiCreateError('CAMPRES_DEL_ERR', getErrText(campresdelerr), true);
									var recID = srs[s].getValue(allCols[0]);
									log('ERROR','CAMPRES_DEL_WARNING','Campaign Response ID '+camprs[cre].getValue('responsecode','campaignResponse')+' // '+ getErrText(campresdelerr));
									var f = automatedCampaignResponseError(relflt, recID, recFolderId);

								}
							}
							
							//Reschedule logic per each component
							if (nlapiGetContext().getRemainingUsage() < 500) 
							{
								//reschedule
								isRescheduled = true;
								
								//log('AUDIT','Reschedule','ID: '+prevId);
								
								var rparam = 
								{
									'custscript_422_lastprocid':prevId	
								};
								nlapiScheduleScript(
									nlapiGetContext().getScriptId(), 
									nlapiGetContext().getDeploymentId(), 
									rparam
								);
								//log('AUDIT','Breaking out from Campaign Response Loop','Rescheduled here');
								break srsloop;
							}
							
						}
						log('DEBUG', srs[s].getValue(allCols[0])+'-Campaign Response Backup and Delete', 'Completed');
						
						
						
						//*************************6. Delete or Unattach contact record linked
						//								to THIS L/P/C record.
						var ctcol = [new nlobjSearchColumn('internalid','contact').setSort(true),
						             new nlobjSearchColumn('company','contact')],
							ctrs = nlapiSearchRecord('customer', null, relflt, ctcol);
						
						contactloop:
						for (var ct=0; ctrs && ct < ctrs.length; ct++) 
						{
							//build JSON backup for Note
							if (ctrs[ct].getValue('internalid','contact')) 
							{
								
								var action = 'Delete';
								if (srs[s].getValue(allCols[0]) != ctrs[ct].getValue('company','contact')) 
								{
									action = 'Unattach';
								}
								
								//Backup the file first
								try
								{
									var ctRec = nlapiLoadRecord('contact', ctrs[ct].getValue('internalid','contact')),
										ctJsFileName = ctrs[ct].getValue('internalid','contact')+
											     	   '_'+
											     	   'contact.js',
									ctFile = nlapiCreateFile(ctJsFileName, 'JAVASCRIPT', JSON.stringify(ctRec));
									
									//Create and store it on the recFolder
									ctFile.setFolder(recFolderId);
									nlapiSubmitFile(ctFile);
								}
								catch(loadcterr)
								{
									throw nlapiCreateError('CONTACT_LOAD_ERR', getErrText(loadcterr), true);
								}
								
								//Try delete or detach
								if (action == 'Delete') 
								{
									try 
									{
										//Delete Contact Record
										nlapiDeleteRecord('contact', ctrs[ct].getValue('internalid','contact'));
										
									} 
									catch (contactderr) 
									{
										//If Contact delete fails. detach it.
										try 
										{
											//Detach Contact Record
											nlapiDetachRecord(
												'contact', 
												ctrs[ct].getValue('internalid','contact'), 
												'customer', 
												srs[s].getValue(allCols[0])
											);
											
										} 
										catch (contactderr) 
										{
											throw nlapiCreateError(
												'CONTACT_DETACH_ERR', 
												getErrText(contactderr), 
												true
											);
										}
									}
								} 
								else 
								{
									try 
									{
										//TODO: Detach Contact Record
										nlapiDetachRecord(
											'contact', 
											ctrs[ct].getValue('internalid','contact'), 
											'customer', 
											srs[s].getValue(allCols[0])
										);
										
									} 
									catch (contactderr) 
									{
										throw nlapiCreateError(
											'CONTACT_DETACH_ERR', 
											getErrText(contactderr), 
											true
										);
									}
								}
							}
							//Reschedule logic per each component
							if (nlapiGetContext().getRemainingUsage() < 500) 
							{
								//reschedule
								isRescheduled = true;
								
								//log('AUDIT','Reschedule','ID: '+prevId);
								
								var rparam = 
								{
									'custscript_422_lastprocid':prevId	
								};
								nlapiScheduleScript(
									nlapiGetContext().getScriptId(), 
									nlapiGetContext().getDeploymentId(), 
									rparam
								);
								log('AUDIT','Breaking out from Contact Loop','Rescheduled here');
								break srsloop;
							}
							
						}
						
						log('DEBUG',srs[s].getValue(allCols[0])+'-Contact Backup and Delete', 'Completed');
						
						
						//At this point all linked child records been backed up 
						//	and deleted or detached.
						//	Try Deleting the L/P/C Record
						try 
						{
							//srs[s].getValue(allCols[0])
							var lpcRec = nlapiLoadRecord('customer', srs[s].getValue(allCols[0])),
								lpcJsFileName = srs[s].getValue(allCols[0])+
											   	'_'+
											   	'customer.js',
							lpcFile = nlapiCreateFile(lpcJsFileName, 'JAVASCRIPT', JSON.stringify(lpcRec));
							
							//Create and store it on the recFolder
							lpcFile.setFolder(recFolderId);
							nlapiSubmitFile(lpcFile);
							
							//Delete customer
							nlapiDeleteRecord('customer', srs[s].getValue(allCols[0]));
							
						} 
						catch (custdelerr) 
						{
							throw nlapiCreateError(
								'CUSTOMER_DEL_ERR', 
								getErrText(custdelerr), 
								true
							);
						}
						log('DEBUG', srs[s].getValue(allCols[0])+'-L/P/C Backup and Delete', 'Completed');
						
						
						//At this point delete was success. Add to Log
						delLogCsvBody += '"'+paramSsId+'",'+
										 '"'+srs[s].getValue(allCols[0])+'",'+
										 '"'+srs[s].getText(allCols[2])+'",'+
										 '"'+srs[s].getValue(allCols[1])+'",'+
										 '"SUCCESS",'+
										 '"Backup and Deleted"\n';
					}
				}
				catch(procerr)
				{
					delLogCsvBody += '"'+paramSsId+'",'+
									 '"'+srs[s].getValue(allCols[0])+'",'+
									 '"'+srs[s].getText(allCols[2])+'",'+
									 '"'+srs[s].getValue(allCols[1])+'",'+
									 '"ERROR",'+
									 '"'+getErrText(procerr)+'"\n';
					
					log('DEBUG', 'Error Deleting '+srs[s].getValue(allCols[0]), getErrText(procerr));
				}
				
				prevId = srs[s].getValue(allCols[0]);
				
				//*************** Reschedule logic ********
				//Set % completed of script processing
				var pctCompleted = Math.round(((s+1) / srs.length) * 100);
				nlapiGetContext().setPercentComplete(pctCompleted);
				
				if (s+1 == 1000 || (nlapiGetContext().getRemainingUsage() < 500)) 
				{
					//reschedule
					isRescheduled = true;
					
					log('AUDIT','Reschedule','ID: '+srs[s].getValue(allCols[0]));
					
					var rparam = 
					{
						'custscript_422_lastprocid':srs[s].getValue(allCols[0])	
					};
					nlapiScheduleScript(
						nlapiGetContext().getScriptId(), 
						nlapiGetContext().getDeploymentId(), 
						rparam
					);
					
					break;
				}
			}
		}
	}
	catch(delerr)
	{
		log('ERROR',
			'Dupe Delete Error',
			'Search ID: '+paramSsId+' // '+
				getErrText(delerr)
		);
	}
	
	//Generate LogFile out side the main try/catch to ensure it gets generated
	if (delLogCsvBody)
	{
		//Generate Log CSV file and save it
		var fileName = 'SearchID_'+paramSsId+
					   '_'+(new Date().getTime())+
					   '.csv',
			logSbj = 'Process Log - Search Title '+paramSsTitle+' ('+paramSsId+')',
			logMsg = 'Attached is Process log for Saved Search "'+paramSsTitle+'", ID '+paramSsId+
					 '<br/>'+
					 'This file can also be found under '+
					 'Documents > Files > File Cabinet > '+
					 'AXD-Duplicate Deletion Backup > Process Logs Folder',
			logCsvFile = nlapiCreateFile(fileName, 'CSV', delLogCsvHeader+delLogCsvBody);
			
		logCsvFile.setFolder(paramProcessLogFolderId);
		nlapiSubmitFile(logCsvFile);
		
		nlapiSendEmail(-5, paramLogNotifier, logSbj, logMsg, null, null, null, logCsvFile, true);
		
	}
	
	//If Not Rescheduled, send out notification to queue up next job
	if (!isRescheduled)
	{
		log('DEBUG', 'SEARCH INDEX', s+1);
		log('DEBUG', 'SEARCH LENGTH', srs.length);
		log('DEBUG', 'REMAINING USAGE LIMITS', nlapiGetContext().getRemainingUsage());
		log('DEBUG', 'SCRIPT COMPLETION PERCENTAGE', nlapiGetContext().getPercentComplete());
		
		var nextSbj = 'QUEUE UP NEXT Search - Search Title '+paramSsTitle+' ('+paramSsId+') COMPLETED',
			nextMsg = 'Search Title '+paramSsTitle+' ('+paramSsId+') completed processing<br>'+
					  'Please check the result of the search to make sure records are deleted'+
					  '<br/><br/>'+
					  'Manually set up NEXT Delete Search!!!';
		
		nlapiSendEmail(-5, paramLogNotifier, nextSbj, nextMsg, null, null, null, null, true);
	}
	
}

function automatedCampaignResponseError(relflt, recId, recFolderId)
{
	// Check for activities associated to the customer.
	
	var sc = [
	          	new nlobjSearchColumn('company'),
	          	new nlobjSearchColumn('type')
	         ];
	
	var actRS = nlapiSearchRecord('activity', null, relflt, sc);
	if(actRS != null)
	{
		return actRS.length;
	}
	else if(actRS == null)
	{
		sc = [
		      	new nlobjSearchColumn('internalid')
		     ];
		
		var conRS = nlapiSearchRecord('contact', null, relflt, sc);
		if(conRS != null)
		{
			for(var i = 0; i < conRS.length; i+=1)
			{
				var contactRec = nlapiLoadRecord('contact', sc[i].getValue(sc[0]));
				var contactFileName = sc[i].getValue(sc[0]) + '-contact.js';
				
				var file = nlapiCreateFile(contactFileName, 'JAVASCRIPT', JSON.stringify(contactRec));
				file.setFolder(recFolderID);
				nlapiSubmitFile(file);
				
				nlapiDeleteRecord('contact', sc[i].getValue(sc[0]));
			}
			
		}
		else
		{
			var lpcRec = nlapiLoadRecord('customer', recId),
			lpcJsFileName = recId+
						   	'_'+
						   	'customer.js',
		lpcFile = nlapiCreateFile(lpcJsFileName, 'JAVASCRIPT', JSON.stringify(lpcRec));
		
		//Create and store it on the recFolder
		lpcFile.setFolder(recFolderId);
		nlapiSubmitFile(lpcFile);
		
		//Delete customer
		nlapiDeleteRecord('customer', recId);
		}
	}

	
	
}
