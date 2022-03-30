/**
 * Module created to allow users to load internal IDs of entity records they wish to delete from the system.
 * This process will back up data in JSON format instead of traditional CSV.
 * It will also handle the process different based on lead status.
 * 
 * If Lead is "Lead-01-Out of Business/Acquired"
 * 		Delete ALL unless it has Transaction
 * 
 * If Lead is "Lead-01-Prospecting"
 * 		Delete As Long as it has NO child records.
 * 
 * Process will begin by user upload internal ID of the customer into temp table: "ADX - Lead Deletes Staging" (customrecord_adx_leaddeletestg)
 * Backup will be stored in the designated folder. Subfolders created for each entity being deleted. 
 * 
 * 
 * Version    Date            Author           Remarks
 * 1.00       14 Oct 2015     json@audaxium
 *
 */

/**
 * @param {String} type Context Types: scheduled, ondemand, userinterface, aborted, skipped
 * @returns {Void}
 */

var actTypeJson= {
	'Phone Call':'phonecall',
	'Task':'task',
	'Event':'calendarevent'
};

function entityDeleteAndJsonBackup(type) {

	var paramParentBackupFolderId = nlapiGetContext().getSetting('SCRIPT','custscript_sb129_parentfolderid'),
		//Parameter passed in. When checked it WILL only mark records as DELETE or KEEP and NOT Process them
		paramExecuteInDryMode = nlapiGetContext().getSetting('SCRIPT', 'custscript_sb129_dryrun'),
		paramDeleteAllExceptTrx = '25', //01 - Out of Business /Acquired
		paramDeleteOnlyNoChild = '7'; //01 - Prospecting
	
	var tflt = [new nlobjSearchFilter('isinactive', null, 'is' ,'F'),
	            new nlobjSearchFilter('custrecord_adxdelete_processed', null, 'is', 'F'),
	            new nlobjSearchFilter('custrecord_adxdelete_id', null, 'isnotempty','')];
	
	var tcol = [new nlobjSearchColumn('internalid').setSort(true),
	            new nlobjSearchColumn('custrecord_adxdelete_id')];
	
	var trs = nlapiSearchRecord('customrecord_adx_leaddeletestg', null, tflt, tcol);
	
	//Go through each staged to be deleted internal IDs and process them
	for (var i=0; trs && i < trs.length; i+=1)
	{
		var leadid = trs[i].getValue('custrecord_adxdelete_id'),
			leadrec = null,
			leadjson = '',
			leadstatus = '',
			leadStatusText = '',
			status = '', //success or error
			statusnotes = '',
			relflt = [new nlobjSearchFilter('internalid', null, 'anyof',leadid)];
			
		try
		{
			//1. get lead status and Check to make sure their status IS allowed to be deleted 
			leadrec = nlapiLoadRecord('customer', leadid);
			leadjson = JSON.stringify(leadrec);
			leadstatus = leadrec.getFieldValue('entitystatus');
			leadStatusText = leadrec.getFieldText('entitystatus');
			//log('debug','leadstatus',leadstatus);
			
			if (leadstatus != paramDeleteAllExceptTrx && leadstatus != paramDeleteOnlyNoChild)
			{
				throw nlapiCreateError(
					'ENTITY-DELETE-ERR', 
					'Entity Internal ID '+
						leadid+
						' has entity status value of '+
						leadstatus+
						' ('+leadrec.getFieldText('entitystatus')+') '+
						' which is not one of allowed statuses ('+
						paramDeleteAllExceptTrx+
						','+
						paramDeleteOnlyNoChild+
						')',
					true
				);
			}
			
			//2. Check for transaction and if exist, do not delete
			var trxcol = [new nlobjSearchColumn('internalid', null,'group'),
			              new nlobjSearchColumn('internalid','transaction','count')];
			
			//search to see if this customer has any matching transaction records
			var trxrs = nlapiSearchRecord('customer', null, relflt, trxcol);
			//log('debug','transaction count for '+trxrs[i].getValue('internalid'), trxrs[0].getValue('internalid','transaction','count'));
			
			//if record has trx, mark it and continue to next
			if (parseInt(trxrs[0].getValue('internalid','transaction','count')) > 0) 
			{
				throw nlapiCreateError(
						'ENTITY-DELETE-ERR',
						'Entity Internal ID '+
							leadid+
							' has '+
							trxrs[0].getValue('internalid','transaction','count')+
							' transaction(s) associated with it',
						true
					  );
			}
			
			//--------------------------- From this point on, it depends on the status ------------------------
			
			//3. Check for Activities------Phone Call, Task, Event
			var actflt = [new nlobjSearchFilter('internalid', null, 'anyof',leadid),
			              new nlobjSearchFilter('internalid','activity','noneof','@NONE@')];
			
			var actcol = [new nlobjSearchColumn('internalid','activity'),
			    	      new nlobjSearchColumn('type','activity')];
			
			var actrs = nlapiSearchRecord('customer',null,actflt, actcol);
			
			//4. Check for Contacts
			var ctflt = [new nlobjSearchFilter('internalid', null, 'anyof',leadid),
			             new nlobjSearchFilter('internalid','contact','noneof','@NONE@')];
			var ctcol = [new nlobjSearchColumn('internalid','contact').setSort(true), //0
			             new nlobjSearchColumn('company','contact')];
			var ctrs = nlapiSearchRecord('customer', null, ctflt, ctcol);
			
			//5. Check Messages (Emails)
			var msgflt = [new nlobjSearchFilter('internalid', null, 'anyof',leadid),
			              new nlobjSearchFilter('internalid','messages','noneof','@NONE@')];
			var msgcol = [new nlobjSearchColumn('internalid','messages').setSort(true)];
			var msgrs = nlapiSearchRecord('customer', null, msgflt, msgcol);
			
			//6. Check User Notes
			var noteflt = [new nlobjSearchFilter('internalid', null, 'anyof', leadid),
			               new nlobjSearchFilter('internalid','userNotes','noneof','@NONE@')];
			var notecol = [new nlobjSearchColumn('internalid','userNotes').setSort(true)];
			var noters = nlapiSearchRecord('customer',null,noteflt, notecol);
			
			//7. Check Support Tickets
			var caseflt = [new nlobjSearchFilter('internalid', null, 'anyof',leadid),
			               new nlobjSearchFilter('internalid', 'case', 'noneof','@NONE@')];
			var casecol = [new nlobjSearchColumn('internalid','case')];
			var casers = nlapiSearchRecord('customer',null,caseflt, casecol);
			
			//Build out notification string
			var notifString = (actrs?actrs.length:0)+' Activities, '+
							  (ctrs?ctrs.length:0)+' Contacts, '+
							  (msgrs?msgrs.length:0)+' Email Messages, '+
							  (noters?noters.length:0)+' User Notes, '+
							  (casers?casers.length:0)+' Support Cases';
			
			if (leadstatus == paramDeleteOnlyNoChild)
			{
				/**
				CHANGE - On 10/26/2015
				DELETE IF There are Contacts and Has NO Activities,
					- When Deleting, No Need to back up COntact
				KEEP IF there are contacts and has activities.
				**/
				
				if ( (actrs && actrs.length > 0) ||
					 (msgrs && msgrs.length > 0) ||
					 (casers && casers.length > 0) ||
					 (noters && noters.length > 0) )
				{
					throw nlapiCreateError(
							'ENTITY-DELETE-ERR',
							'Entity Internal ID '+
								leadid+
								' has '+
								notifString,
							true
						  );
				}
				else
				{
					//Dry Run Mode. ONLY record it as DELETE or KEEP.
					if (paramExecuteInDryMode == 'T')
					{
						status = 'Delete';
						statusnotes = 'Mark to be deleted // '+notifString;
					}
					else
					{
						//If it has contacts, delete or detach them.
						//NO NEED TO Back them up as requested by Client
						if ((ctrs && ctrs.length > 0))
						{
							//Go Through Contacts - Detach OR Delete.
							for (var ct=0; ctrs && ct < ctrs.length; ct+=1)
							{
								try
								{
									var action = 'Delete';
									var isAssociatedWithOtherClients = false;
									//Search against contact record with THIS id to see how many company returns, IF so, set this to be true to be Unattached.
									var attachflt = [new nlobjSearchFilter('internalid', null, 'anyof', [ctrs[ct].getValue('internalid','contact')])];
									var attachcol = [new nlobjSearchColumn('internalid','company')];
									var attachrs = nlapiSearchRecord('contact', null, attachflt, attachcol);
									if (attachrs && attachrs.length > 1) {
										isAssociatedWithOtherClients = true;							
									}
									
									//If associated with more than 1 record, detach instead of delete
									if (isAssociatedWithOtherClients)
									{
										action = 'Unattach';
									}
									
									if (action == 'Delete') {
										
										nlapiDeleteRecord(
											'contact', 
											ctrs[ct].getValue('internalid','contact')
										);
										
									} else {
										nlapiDetachRecord(
											'contact', 
											ctrs[ct].getValue('internalid','contact'), 
											'customer', 
											leadid
										);
									}
									
								}
								catch(err)
								{
									throw nlapiCreateError(
											'ENTITY-DELETE-ERR',
											'Entity Internal ID '+
												leadid+
												' error while attempting delete/unattach Contact ID '+
												ctrs[ct].getValue('internalid','contact')+
												' // '+
												getErrText(err),
											true
										  );
								}
							}
						}
						
						//-----------For Prospecting Status - No Activities, No Contacts DELETE------------------------------
						//back up record and delete
						var leadbkfile = nlapiCreateFile('LEAD-'+leadid+'.js', 'JAVASCRIPT', leadjson);
						leadbkfile.setFolder(paramParentBackupFolderId);
						nlapiSubmitFile(leadbkfile);
						
						//DELETE the Lead
						nlapiDeleteRecord('customer', leadid);
						
						status = 'success';
						statusnotes = 'Lead JSON backuped and successfully deleted // '+notifString;
					}
				}
			}
			else
			{
				//Assume this is other use case where we have to back up activities and contacts and attempt to DELETE the record
				
				//ONLY Backup and Delete If it's NOT Dry Run Mode.
				if (paramExecuteInDryMode == 'T')
				{
					status = 'Delete';
					statusnotes = 'Mark to be deleted // '+notifString;
				}
				else
				{
					//Go through Activities
					for (var a=0; actrs && a < actrs.length; a+=1)
					{
						try
						{
							var actFileName = 'LEAD-'+leadid+'-'+
											  'ACTIVITY-'+
											  actrs[a].getValue('internalid','activity')+'.js';
							
							var actRecJson = JSON.stringify(
												nlapiLoadRecord(
													actTypeJson[actrs[a].getValue('type','activity')], 
													actrs[a].getValue('internalid','activity')
												)
											 );
							
							
							var actbkfile = nlapiCreateFile(actFileName, 'JAVASCRIPT', actRecJson);
							actbkfile.setFolder(paramParentBackupFolderId);
							nlapiSubmitFile(actbkfile);
							
							//TODO:DELETE Activity REcord
							nlapiDeleteRecord(
								actTypeJson[actrs[a].getValue('type','activity')], 
								actrs[a].getValue('internalid','activity')
							);
			
						}
						catch (err)
						{
							throw nlapiCreateError(
									'ENTITY-DELETE-ERR',
									'Entity Internal ID '+
										leadid+
										' error while attempting delete Activity ID '+
										actrs[a].getValue('internalid','activity')+
										' // '+
										getErrText(err),
									true
								  );
						}
						
					}
					
					//Go Through list of Email Messages and back them up
					for (var e=0; msgrs && e < msgrs.length; e+=1)
					{
						try
						{
							var msgFileName = 'LEAD-'+leadid+'-'+
											  'EMAIL-'+
											  msgrs[e].getValue('internalid','messages')+'.js';
							
							var msgRecJson = JSON.stringify(
												nlapiLoadRecord(
													'message', 
													msgrs[e].getValue('internalid','messages')
												)
											 );
							
							var msgbkfile = nlapiCreateFile(msgFileName, 'JAVASCRIPT', msgRecJson);
							msgbkfile.setFolder(paramParentBackupFolderId);
							nlapiSubmitFile(msgbkfile);
							
							//NO NEED TO DELETE Email Messages
			
						}
						catch (err)
						{
							throw nlapiCreateError(
									'ENTITY-DELETE-ERR',
									'Entity Internal ID '+
										leadid+
										' error while attempting delete Email Message ID '+
										msgrs[e].getValue('internalid','messages')+
										' // '+
										getErrText(err),
									true
								  );
						}
						
					}
					
					//Go through User Notes
					for (var n=0; noters && n < noters.length; n+=1)
					{
						try
						{
							var noteFileName = 'LEAD-'+leadid+'-'+
											   'USER_NOTE-'+
											   noters[n].getValue('internalid','userNotes')+'.js';
							
							var noteRecJson = JSON.stringify(
												nlapiLoadRecord(
													'note', 
													noters[n].getValue('internalid','userNotes')
												)
											  );
							
							var notebkfile = nlapiCreateFile(noteFileName, 'JAVASCRIPT', noteRecJson);
							notebkfile.setFolder(paramParentBackupFolderId);
							nlapiSubmitFile(notebkfile);
							
							//TODO:DELETE User NOte REcord
							nlapiDeleteRecord(
								'note', 
								noters[n].getValue('internalid','userNotes')
							);
			
						}
						catch (err)
						{
							throw nlapiCreateError(
									'ENTITY-DELETE-ERR',
									'Entity Internal ID '+
										leadid+
										' error while attempting delete User NOte ID '+
										noters[n].getValue('internalid','userNotes')+
										' // '+
										getErrText(err),
									true
								  );
						}
					}
					
					//Go through Support Cases
					for (var s=0; casers && s < casers.length; s+=1)
					{
						try
						{
							var caseFileName = 'LEAD-'+leadid+'-'+
											   'CASE-'+
											   casers[s].getValue('internalid','case')+'.js';
							
							var caseRecJson = JSON.stringify(
												nlapiLoadRecord(
													'supportcase', 
													casers[s].getValue('internalid','case')
												)
											  );
							
							var casebkfile = nlapiCreateFile(caseFileName, 'JAVASCRIPT', caseRecJson);
							casebkfile.setFolder(paramParentBackupFolderId);
							nlapiSubmitFile(casebkfile);
							
							//TODO:DELETE Support Case REcord
							nlapiDeleteRecord(
								'supportcase', 
								casers[s].getValue('internalid','case')
							);
							
						}
						catch (err)
						{
							throw nlapiCreateError(
									'ENTITY-DELETE-ERR',
									'Entity Internal ID '+
										leadid+
										' error while attempting delete Support Case ID '+
										casers[s].getValue('internalid','case')+
										' // '+
										getErrText(err),
									true
								  );
						}
					}
					
					//Go Through Contacts - Detach OR Delete.
					for (var ct=0; ctrs && ct < ctrs.length; ct+=1)
					{
						try
						{
							var action = 'Delete';
							var isAssociatedWithOtherClients = false;
							//Search against contact record with THIS id to see how many company returns, IF so, set this to be true to be Unattached.
							var attachflt = [new nlobjSearchFilter('internalid', null, 'anyof', [ctrs[ct].getValue('internalid','contact')])];
							var attachcol = [new nlobjSearchColumn('internalid','company')];
							var attachrs = nlapiSearchRecord('contact', null, attachflt, attachcol);
							if (attachrs && attachrs.length > 1) {
								isAssociatedWithOtherClients = true;							
							}
							
							//If associated with more than 1 record, detach instead of delete
							if (isAssociatedWithOtherClients)
							{
								action = 'Unattach';
							}
							
							if (action == 'Delete') {
								
								//Back it UP to a file
								var ctFileName = 'LEAD-'+leadid+'-'+
												 'CONTACT-'+
												 ctrs[ct].getValue('internalid','contact')+'.js';
				
								var ctRecJson = JSON.stringify(
													nlapiLoadRecord(
														'contact', 
														ctrs[ct].getValue('internalid','contact')
													)
												);
								
								var ctbkfile = nlapiCreateFile(ctFileName, 'JAVASCRIPT', ctRecJson);
								ctbkfile.setFolder(paramParentBackupFolderId);
								nlapiSubmitFile(ctbkfile);
								
								nlapiDeleteRecord(
									'contact', 
									ctrs[ct].getValue('internalid','contact')
								);
								
							} else {
								nlapiDetachRecord(
									'contact', 
									ctrs[ct].getValue('internalid','contact'), 
									'customer', 
									leadid
								);
							}
							
						}
						catch(err)
						{
							throw nlapiCreateError(
									'ENTITY-DELETE-ERR',
									'Entity Internal ID '+
										leadid+
										' error while attempting delete/unattach Contact ID '+
										ctrs[ct].getValue('internalid','contact')+
										' // '+
										getErrText(err),
									true
								  );
						}
					}
					
					//back up record and delete
					var leadbkfile = nlapiCreateFile('LEAD-'+leadid+'.js', 'JAVASCRIPT', leadjson);
					leadbkfile.setFolder(paramParentBackupFolderId);
					nlapiSubmitFile(leadbkfile);
					
					//DELETE the Lead
					nlapiDeleteRecord('customer', leadid);
					
					status = 'success';
					statusnotes = 'All Children JSON backed up, Lead JSON backuped and successfully deleted //'+notifString;
					
				}//End check for Dry Run
			}
			
		}
		catch (procerr)
		{
			//Dry Run Mode. ONLY record it as DELETE or KEEP.
			if (paramExecuteInDryMode == 'T')
			{
				status = 'Keep';
				statusnotes = 'Mark to be Kept // '+getErrText(procerr);
			}
			else
			{
				status = 'fail';
				statusnotes = getErrText(procerr);
			}
			
			//If it's Record Does Not Exit, set status to NO RECORD
			if (statusnotes.indexOf('RCRD_DSNT_EXIST') > -1)
			{
				status = 'NO RECORD';
			}
		}
		
		//Update the THIS temp. record
		var tupdflds = ['custrecord_adxdelete_processed',
		                'custrecord_adxdelete_status',
		                'custrecord_adxdelete_notes'],
		    tupdvals = ['T',
		                status,
		                statusnotes];
		
		//Update reference points IF it exists.
		if (leadstatus && leadStatusText)
		{
			tupdflds.push('custrecord_adxdelete_recstatus');
			tupdvals.push(leadStatusText);
			
			//ONLY Set the reference if it's KEEP or fail
			// OR IN Dry Run
			if (paramExecuteInDryMode == 'T' || status=='Keep' || status=='fail')
			{
				tupdflds.push('custrecord_adxdelete_recref');
				tupdvals.push(leadid);
			}
		}
		
		nlapiSubmitField(
			'customrecord_adx_leaddeletestg', 
			trs[i].getValue('internalid'), 
			tupdflds, 
			tupdvals, 
			true
		);
		
		log('debug','Each Run Remaining',trs[i].getValue('internalid')+' // '+nlapiGetContext().getRemainingUsage());
		
		
		
		//Set % completed of script processing
		var pctCompleted = Math.round(((i+1) / trs.length) * 100);
		nlapiGetContext().setPercentComplete(pctCompleted);
		
		//------------ Reschedule check -------------------
		if ((i+1)==1000 || ((i+1) < trs.length && nlapiGetContext().getRemainingUsage() < 3000)) {
			//reschedule
			log(
				'audit',
				'Getting Rescheduled at', 
				trs[i].getValue('internalid')
			);
			
			//execute reschedule
			nlapiScheduleScript(
				nlapiGetContext().getScriptId(), 
				nlapiGetContext().getDeploymentId(), 
				null
			);
			break;
		}
	}
}
