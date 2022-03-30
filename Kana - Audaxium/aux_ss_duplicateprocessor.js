/**
 * Author: Audaxium (json)
 * Date: 12/14/2012
 * Desc:
 * Scheduled script to validate duplicate customer/prospect/lead records loaded via CSV import into AUX:Duplicate Loads custom record.
 */

var SCT_EXIT_LEVEL = 5000;
var ctx = nlapiGetContext();

//Last processed group id
var lastProcessedGroupId = ctx.getSetting('SCRIPT','custscript_lastproc_groupid');

function processDuplicates() {
	try {
		//get list of all unprocessed groups 
		var gflt = [new nlobjSearchFilter('custrecord_adl_isprocessed',null,'is','F')];
		var gcol = [new nlobjSearchColumn('internalid',null,'max').setSort(true),
		            new nlobjSearchColumn('custrecord_adl_groupid',null,'group')];
		//check to see if script was rescheduled and need to return next set of gorups
		if (lastProcessedGroupId) {
			gflt.push(new nlobjSearchFilter('internalidnumber',null,'lessthan', lastProcessedGroupId));
		}
		
		var grslt = nlapiSearchRecord('customrecord_aux_duplicate_loads', null, gflt, gcol);
		
		var procGroupId = '';
		
		//grslt.length
		for (var g=0; grslt && g < grslt.length; g++) {
			var groupId = grslt[g].getValue('custrecord_adl_groupid',null,'group');
			
			procGroupId = grslt[g].getValue('internalid',null,'max');
			//array of all clients internal ID to process within this group
			var arClientIds = new Array();
			/**
			 * jsonClient = {
			 *   "clientInternalId":{
			 *     "customrecid":[Internal ID of customrec], //used for updating the record after processing
			 *   }
			 * }
			 */
			var jsonClient = {};
			
			/**
			 * jsonGroup = {
			 * 	"groupid":[group id],
			 *  "stages":[arStages],
			 *  "customers":[arCustomers],
			 *  "prospects":[arProspects],
			 *  "leads":[arLeads],
			 *  "all":[all combined array],
			 *  "masterid":[master id of customer/prospect/lead based on logic],
			 *  "log":[custom log],
			 *  "status":[custom status] //status of master ID found among duplicate
			 * }
			 */
			var jsonGroup = {};
			//setup default
			jsonGroup["groupid"] = groupId;
			jsonGroup["stages"] = new Array();
			jsonGroup["customers"] = new Array();
			jsonGroup["prospects"] = new Array();
			jsonGroup["leads"] = new Array();
			jsonGroup["all"] = new Array();
			jsonGroup["masterid"] = '';
			jsonGroup["log"] = '';
			jsonGroup["status"] = '';
			jsonGroup["deletestatus"] = '';
			
			
			var arStages = new Array();
			var arCustomers = new Array();
			var arLeads = new Array();
			var arProspects = new Array();
			
			//1. Load All Internal IDs from this group for processing
			var eflt = [new nlobjSearchFilter('custrecord_adl_groupid', null, 'is', groupId),
			            new nlobjSearchFilter('custrecord_adl_isprocessed',null,'is','F')];
			var ecol = [new nlobjSearchColumn('custrecord_adl_internalid'),
			            new nlobjSearchColumn('custrecord_adl_isgood')];
			var erslt = nlapiSearchRecord('customrecord_aux_duplicate_loads', null, eflt, ecol);
			
			//see if master was already identified
			var masterIdFromLoad = '';
			
			for (var e=0; erslt && e < erslt.length; e++) {
				if (erslt[e].getValue('custrecord_adl_isgood')=='T') {
					masterIdFromLoad = strTrim(erslt[e].getValue('custrecord_adl_internalid'));
				}
				arClientIds.push(strTrim(erslt[e].getValue('custrecord_adl_internalid')));
				jsonClient[erslt[e].getValue('custrecord_adl_internalid')] = {};
				jsonClient[erslt[e].getValue('custrecord_adl_internalid')]['customrecid']=erslt[e].getId();
				jsonClient[erslt[e].getValue('custrecord_adl_internalid')]['groupid']=groupId;
				
			}
			
			//throw error when Internal Id array is empty and terminate the script
			if (arClientIds.length == 0) { 
				throw nlapiCreateError('MISSING_CLIENT_IDS', 'Group ID: '+groupId+' is missing Internal ID of duplciate Client/Prospect/Lead records', true);
			}
			
			//2. Search customer record 
			var cflt = [new nlobjSearchFilter('internalid',null,'anyof',arClientIds)];
			var ccol = [new nlobjSearchColumn('stage'),
			            new nlobjSearchColumn('entitystatus'),
			            new nlobjSearchColumn('hasduplicates'),
			            new nlobjSearchColumn('entitynumber'),
			            new nlobjSearchColumn('lastmodifieddate'),
			            new nlobjSearchColumn('datecreated')];
			var crslt = nlapiSearchRecord('customer', null, cflt, ccol);
			
			//incase record was already deleted since loading of the file we need to check for non existing dup record id 
			if (!crslt) {
				//NONE of loaded dup record ID exists in the system
				crslt = new Array();
			}
			
			
			var processFindMaster = true;
			
			//compare size of loaded dup ID vs what's returned
			if (crslt.length != arClientIds.length) {
				processFindMaster = false;
				jsonGroup.masterid = '';
				jsonGroup.status = 'Error';
				
				var existingIds = new Array();
				for (var ec=0; ec < crslt.length; ec++) {
					existingIds.push(crslt[ec].getId());
				}
				
				var nonExistantIds = '[';
				//loop through arClients and identify what's missing
				for (var dc=0; dc < arClientIds.length; dc++) {
					if (!existingIds.contains(arClientIds[dc])) {
						nonExistantIds += arClientIds[dc]+'|';
						//populate missing jsonClient with default missing values
						jsonClient[arClientIds[dc]]['exists'] = false;
						jsonClient[arClientIds[dc]]['stage'] = '';
						jsonClient[arClientIds[dc]]['statustext'] = '';
						jsonClient[arClientIds[dc]]['statusid'] = '';
						jsonClient[arClientIds[dc]]['hasduplicates'] = '';
						jsonClient[arClientIds[dc]]['entitynumber'] = '';
						jsonClient[arClientIds[dc]]['lastmodifieddate'] = '';
						jsonClient[arClientIds[dc]]['datecreated'] = '';
						jsonClient[arClientIds[dc]]['lasttrxdate'] = '';
						jsonClient[arClientIds[dc]]['lasttrxtype'] = '';
						jsonClient[arClientIds[dc]]['lasttrxid'] = '';
						jsonClient[arClientIds[dc]]['lastactivitydate'] = '';
						jsonClient[arClientIds[dc]]['lastactivitytype'] = '';
						jsonClient[arClientIds[dc]]['lastactivityid'] = '';
						jsonClient[arClientIds[dc]]['latestdate'] = '';
						jsonClient[arClientIds[dc]]['latesttype'] = '';
						jsonClient[arClientIds[dc]]['latestid'] = '';
						jsonClient[arClientIds[dc]]['deletestatus'] = '';
					}
				}
				nonExistantIds +=']';
				jsonGroup.log = nonExistantIds+' Id(s) Does not exist in system. Group Processing Failed. Unable to determain master';
				
			}
			
			//check to see if master is already identified if processFindMaster is still true
			if (processFindMaster && masterIdFromLoad) {
				processFindMaster = false;
				jsonGroup.masterid = masterIdFromLoad;
				jsonGroup.status = 'Found';
				jsonGroup.log = 'Master was identified from the CSV Load';
				
			}
			
			for (var c=0; c < crslt.length; c++) {
				//populate jsonClient with all information
				jsonClient[crslt[c].getId()]['exists'] = true;
				jsonClient[crslt[c].getId()]['stage'] = crslt[c].getText('stage');
				jsonClient[crslt[c].getId()]['statustext'] = crslt[c].getText('entitystatus');
				jsonClient[crslt[c].getId()]['statusid'] = crslt[c].getValue('entitystatus');
				jsonClient[crslt[c].getId()]['hasduplicates'] = crslt[c].getValue('hasduplicates');
				jsonClient[crslt[c].getId()]['entitynumber'] = crslt[c].getValue('entitynumber');
				jsonClient[crslt[c].getId()]['lastmodifieddate'] = new Date(crslt[c].getValue('lastmodifieddate'));
				jsonClient[crslt[c].getId()]['datecreated'] = new Date(crslt[c].getValue('datecreated'));
				jsonClient[crslt[c].getId()]['lasttrxdate'] = '';
				jsonClient[crslt[c].getId()]['lasttrxtype'] = '';
				jsonClient[crslt[c].getId()]['lasttrxid'] = '';
				jsonClient[crslt[c].getId()]['lastactivitydate'] = '';
				jsonClient[crslt[c].getId()]['lastactivitytype'] = '';
				jsonClient[crslt[c].getId()]['lastactivityid'] = '';
				jsonClient[crslt[c].getId()]['latestdate'] = '';
				jsonClient[crslt[c].getId()]['latesttype'] = '';
				jsonClient[crslt[c].getId()]['latestid'] = '';
				jsonClient[crslt[c].getId()]['deletestatus'] = '';
				
				if (!arStages.contains(crslt[c].getText('stage').toLowerCase())) {
					arStages.push(crslt[c].getText('stage').toLowerCase());
				}
				
				if (crslt[c].getText('stage').toLowerCase() == 'customer' && !arCustomers.contains(crslt[c].getId())) {
					arCustomers.push(crslt[c].getId());
				}
				
				if (crslt[c].getText('stage').toLowerCase() == 'prospect' && !arProspects.contains(crslt[c].getId())) {
					arProspects.push(crslt[c].getId());
				}
				
				if (crslt[c].getText('stage').toLowerCase() == 'lead' && !arLeads.contains(crslt[c].getId())) {
					arLeads.push(crslt[c].getId());
				}
			}
			
			//setup group info
			jsonGroup["stages"] = arStages;
			jsonGroup["customers"] = arCustomers;
			jsonGroup["prospects"] = arProspects;
			jsonGroup["leads"] = arLeads;
			//jsonGroup["all"] = arCustomers.concat(arProspects,arLeads);
			jsonGroup["all"] = arClientIds;

			//------------------------------------------------------------------
			//function will update jsonGroup object
			if (processFindMaster) {
				findMaster(jsonGroup, jsonClient, arClientIds);
			}
			
			//------------------------------------------------------------------
			
			//transfer potential child records into Good record.
			transferChildAndDeleteOrInactivate(jsonGroup, jsonClient, arClientIds);
			
			
			//reschedule logic
			if (ctx.getRemainingUsage() <= SCT_EXIT_LEVEL && (g+1) < grslt.length) {
				var param = new Array();
				param['custscript_lastproc_groupid'] = procGroupId;
				
				var schStatus = nlapiScheduleScript(ctx.getScriptId(), ctx.getDeploymentId(), param);
				if (schStatus=='QUEUED') {
					log('debug','Script Rescheduled','Last Processed Group ID: '+procGroupId);
					break;
				}
			}
		}
		
	} catch (procError) {
		log('error','Terminating Error', getErrText(procError));
		nlapiSendEmail('-5', 'support@audaxium.com', 'KANA ('+ctx.getEnvironment()+') Error occured while processing Data Cleansing', 'Scheduled Script Terminated!!!<br/>Failure Msg: '+getErrText(procError));
	}
}

/**
 * if master record is found, attempt to merge potential child records into master
 * and delete them. If delete fails, inactivate it.
 * jsonGroup = {
 * 	"groupid":[group id],
 *  "stages":[arStages],
 *  "customers":[arCustomers],
 *  "prospects":[arProspects],
 *  "all":[all internal ids of duplicate records in this group],
 *  "leads":[arLeads],
 *  "masterid":[master id of customer/prospect/lead based on logic],
 *  "log":[custom log],
 *  "status":[custom status],
 *  
 * }
 * @param jsonGroup
 * 
 * jsonClient[crslt[c].getId()]['stage'] = crslt[c].getText('stage');
 * jsonClient[crslt[c].getId()]['statustext'] = crslt[c].getText('entitystatus');
 * jsonClient[crslt[c].getId()]['statusid'] = crslt[c].getValue('entitystatus');
 * jsonClient[crslt[c].getId()]['hasduplicates'] = crslt[c].getValue('hasduplicates');
 * jsonClient[crslt[c].getId()]['entitynumber'] = crslt[c].getValue('entitynumber');
 * jsonClient[crslt[c].getId()]['lastmodifieddate'] = crslt[c].getValue('lastmodifieddate');
 * jsonClient[crslt[c].getId()]['datecreated'] = crslt[c].getValue('datecreated');
 * jsonClient[crslt[c].getId()]['lasttrxdate'] = '';
 * jsonClient[crslt[c].getId()]['lasttrxtype'] = '';
 * jsonClient[crslt[c].getId()]['lasttrxid'] = '';
 * jsonClient[crslt[c].getId()]['lastactivitydate'] = '';
 * jsonClient[crslt[c].getId()]['lastactivitytype'] = '';
 * jsonClient[crslt[c].getId()]['lastactivityid'] = '';
 * jsonClient[crslt[c].getId()]['latestdate'] = '';
 * jsonClient[crslt[c].getId()]['latesttype'] = '';
 * jsonClient[crslt[c].getId()]['latestid'] = '';
 * jsonClient[crslt[c].getId()]['deletestatus'] = '';

 * @param jsonClient
 * 
 * @param arClientIds
 */

function transferChildAndDeleteOrInactivate(jsonGroup, jsonClient, arClientIds) {
	var delstatus = '';
	var dellog = '';
	//loop through each client in jsonClient and delete them
	var updFld = ['custrecord_adl_overall_status','custrecord_adl_isprocessed','custrecord_adl_recstage','custrecord_adl_isgood','custrecord_adl_status','custrecord_adl_log',
	              'custrecord_adl_lasttrx_date','custrecord_adl_lasttrx_type','custrecord_adl_lasttrx_id',
	              'custrecord_adl_lastact_date','custrecord_adl_lastact_type','custrecord_adl_lastact_id',
	              'custrecord_adl_date_used','custrecord_adl_type_used','custrecord_adl_id_used','custrecord_adl_datecreated',
	              'custrecord_adl_recstatus','custrecord_adl_deletestatus','custrecord_adl_deletelog'];
	var updVals = null;
	
	var master = jsonGroup.masterid;
	log('debug','transfer and delete','Master ID: '+master);
	var overallStatus = '';
	var allarray = jsonGroup["all"];
	for (var u=0; u < allarray.length; u++) {
		delstatus = '';
		dellog = '';
		overallStatus = 'Success';
		
		if (!master) {
			delstatus = 'Skipped-No Master';
			dellog = 'No Master Found, Skipped deletion';
			overallStatus = 'Failed';
		} else {
			
			if (master == allarray[u]) {
				delstatus = 'Skipped-Master';
				dellog = 'Not deleting because this is identified as Master Record';
			} else {
				//try deleting first
				try {
					nlapiDeleteRecord('customer',allarray[u]);
					//if it got to this point, delete was success
					delstatus = 'Deleted';
					dellog = 'Successfully deleted duplicate Internal ID: '+allarray[u];
					
				} catch (ex) {
					//delete failed
					delstatus = 'Failed';
					dellog = 'Failed to delete duplicate Internal ID: '+allarray[u] + ' // '+ex.toString();
					overallStatus = 'Failed';
					
					var mlog = '';
					
					if (ex.toString().indexOf('CANT_DELETE_RCRD') > -1) {
						//Move Potential child records to Master
						
						//move transactions
						var mtflt = [new nlobjSearchFilter('entity', null, 'anyof', allarray[u]),
						             new nlobjSearchFilter('mainline', null, 'is', 'T')];
						var mtcol = [new nlobjSearchColumn('internalid')];
						var mtrslt = nlapiSearchRecord('transaction', null, mtflt, mtcol);
						for (var mt=0; mtrslt && mt < mtrslt.length; mt++) {
							//update all transactions to master
							try {
								var trxMov = nlapiLoadRecord(mtrslt[mt].getRecordType(), mtrslt[mt].getId());
								trxMov.setFieldValue('entity', master);
								nlapiSubmitRecord(trxMov, false, true);
								//nlapiSubmitField(mtrslt[mt].getRecordType(), mtrslt[mt].getId(), 'entity',master);
								mlog += 'Trx('+mtrslt[mt].getRecordType()+'::'+mtrslt[mt].getId()+') Moved // ';
							} catch (mtex) {
								log('error','Trx Move Error: Cust/Lead/Pros InternalID: '+allarray[u],getErrText(mtex));
								mlog += 'Trx('+mtrslt[mt].getRecordType()+'::'+mtrslt[mt].getId()+') Errored ['+getErrText(mtex)+'] // ';
							}
						}
						
						//move activites
						var macflt = [new nlobjSearchFilter('company', null, 'anyof', allarray[u])];
						var maccol = [new nlobjSearchColumn('internalid')];
						var macrslt = nlapiSearchRecord('activity', null, macflt, maccol);
						for (var mac=0; macrslt && mac < macrslt.length; mac++) {

							try {
								var actMov = nlapiLoadRecord(macrslt[mac].getRecordType(), macrslt[mac].getId());
								actMov.setFieldValue('company',master);
								nlapiSubmitRecord(actMov, false, true);
								//nlapiSubmitField(macrslt[mac].getRecordType(), macrslt[mac].getId(), 'company',master);
								mlog += 'Activity('+macrslt[mac].getRecordType()+'::'+macrslt[mac].getId()+') Moved // ';
							} catch (macex) {
								log('error','Activity Move Error: Cust/Lead/Pros InternalID: '+allarray[u],getErrText(macex));
								mlog += 'TrxID('+macrslt[mac].getRecordType()+'::'+macrslt[mac].getId()+') Errored ['+getErrText(macex)+'] // ';
							}
						}
						
						//move contacts
						var contactFilter = [new nlobjSearchFilter('company', null, 'anyof', allarray[u])];
						var contactColumn = [new nlobjSearchColumn('internalid')];
						var contactRslt = nlapiSearchRecord('contact', null, contactFilter, contactColumn);
						
						for (var c=0; contactRslt && c < contactRslt.length; c++) {
							try {
								//load this contact and change entity name
								var dupContact = nlapiLoadRecord('contact',contactRslt[c].getId());
								var curEntityId = dupContact.getFieldValue('entityid');
								dupContact.setFieldValue('entityid', curEntityId+' From Dup ID: '+allarray[u]);
								dupContact.setFieldValue('company',master);
								nlapiSubmitRecord(dupContact);
								
								mlog += 'Contact('+contactRslt[c].getRecordType()+'::'+contactRslt[c].getId()+') Moved // ';
							} catch (contactRemapError) {
								log('error','Contact Move Error: Cust/Lead/Pros InternalID: '+allarray[u], getErrText(contactRemapError));
								mlog += 'Contact('+contactRslt[c].getRecordType()+'::'+contactRslt[c].getId()+') Errored ['+getErrText(contactRemapError)+'] // ';
							}
						}
						
						//Detach to be deleted customer type record from the contact record if any exists
						//This could happen when contact is attached to multiple customers.
						var scflt = [new nlobjSearchFilter('internalid','customer','anyof', allarray[u])];
						var sccol = [new nlobjSearchColumn('internalid'),
						             new nlobjSearchColumn('owner')];
						var scrslt = nlapiSearchRecord('contact', null, scflt, sccol);
						
						var detachContactIds = new Array();
						
						for (var sc=0; scrslt && sc < scrslt.length; sc++) {
							log('debug','contact ID',scrslt[sc].getId());
							
							detachContactIds.push(scrslt[sc].getId());
							
							try {
								nlapiDetachRecord('contact', scrslt[sc].getId(), 'customer', allarray[u]);
								//potential defect work around. once detached, load contact and save it.
								var detachRec = nlapiLoadRecord('contact',scrslt[sc].getId());
								//check to see if the owner is lead to be deleted. If so, mark it in the contact to be updated via mass update contact management
								if (scrslt[sc].getValue('owner') == allarray[u]) {
									var oComment = detachRec.getFieldValue('comments');
									detachRec.setFieldValue('comments', oComment+' [Original Owner='+allarray[u]+']');
								}
								
								nlapiSubmitRecord(detachRec, false, true);
								
								mlog+='Detach Success: Duplicate cust/lead/prospect InternalID: '+allarray[u]+' detached from contact internalID: '+scrslt[sc].getId();
							} catch (detachDupFromContact) {
								log('error','Customer Type Detach from Contact Error: ','Detach Failed: Duplicate cust/lead/prospect InternalID: '+allarray[u]+' failed to detach from contact internalID: '+scrslt[sc].getId() + 
																					  ' // '+getErrText(detachDupFromContact));
								mlog += 'Customer Detatch from Contact (contact ID: '+scrslt[sc].getId()+') Errored ['+getErrText(detachDupFromContact)+'] // ';
							}
							
							
						}
						
						//Try Deleting Customer Record Again
						try {
							nlapiDeleteRecord('customer',allarray[u]);
							//if it got to this point, delete was success
							delstatus = 'Deleted';
							dellog = '2nd try: Successfully deleted duplicate Internal ID: '+allarray[u]+' == '+mlog;
							overallStatus = 'Success';
						} catch (finalex) {
							//delete failed
							dellog = '2nd try: FAIL After Move to Master - Failed to delete duplicate Internal ID: '+allarray[u] + ' // '+getErrText(finalex.toString())+' == '+mlog;
							overallStatus = 'Failed';
						}						
					}
				}
			}
			
		}//No Master
		
		dellog = strGlobalReplace(dellog, "\r", " || ");
		dellog = strGlobalReplace(dellog,"\n", " || ");
		dellog = 'If Delete Failed, Try Removing Customer/Prospect/Lead from Contact Records // '+dellog;
				
		updVals = ['Processed',
		           'T',
		           jsonClient[allarray[u]]['stage'],
		           ((allarray[u]==jsonGroup['masterid'])?'T':'F'),
		           jsonGroup['status'],
		           jsonGroup['log'],
		           jsonClient[allarray[u]]['lasttrxdate'],
		           jsonClient[allarray[u]]['lasttrxtype'],
		           jsonClient[allarray[u]]['lasttrxid'],
		           jsonClient[allarray[u]]['lastactivitydate'],
		           jsonClient[allarray[u]]['lastactivitytype'],
		           jsonClient[allarray[u]]['lastactivityid'],
		           jsonClient[allarray[u]]['latestdate'],
		           jsonClient[allarray[u]]['latesttype'],
		           jsonClient[allarray[u]]['latestid'],
		           jsonClient[allarray[u]]['datecreated'],
		           jsonClient[allarray[u]]['statustext'],
		           delstatus,
		           dellog];
	
		nlapiSubmitField('customrecord_aux_duplicate_loads',jsonClient[allarray[u]]['customrecid'], updFld, updVals);
	} //end for
}

/**
 * run logic and find master record among records in passed in group object
 * jsonGroup = {
 * 	"groupid":[group id],
 *  "stages":[arStages],
 *  "customers":[arCustomers],
 *  "prospects":[arProspects],
 *  "leads":[arLeads],
 *  "masterid":[master id of customer/prospect/lead based on logic],
 *  "log":[custom log],
 *  "status":[custom status]
 * }
 * @param jsonGroup
 * 
 * jsonClient[crslt[c].getId()]['stage'] = crslt[c].getText('stage');
 * jsonClient[crslt[c].getId()]['statustext'] = crslt[c].getText('entitystatus');
 * jsonClient[crslt[c].getId()]['statusid'] = crslt[c].getValue('entitystatus');
 * jsonClient[crslt[c].getId()]['hasduplicates'] = crslt[c].getValue('hasduplicates');
 * jsonClient[crslt[c].getId()]['entitynumber'] = crslt[c].getValue('entitynumber');
 * jsonClient[crslt[c].getId()]['lastmodifieddate'] = crslt[c].getValue('lastmodifieddate');
 * jsonClient[crslt[c].getId()]['datecreated'] = crslt[c].getValue('datecreated');
 * jsonClient[crslt[c].getId()]['lasttrxdate'] = '';
 * jsonClient[crslt[c].getId()]['lasttrxtype'] = '';
 * jsonClient[crslt[c].getId()]['lasttrxid'] = '';
 * jsonClient[crslt[c].getId()]['lastactivitydate'] = '';
 * jsonClient[crslt[c].getId()]['lastactivitytype'] = '';
 * jsonClient[crslt[c].getId()]['lastactivityid'] = '';
 * jsonClient[crslt[c].getId()]['latestdate'] = '';
 * jsonClient[crslt[c].getId()]['latesttype'] = '';
 * jsonClient[crslt[c].getId()]['latestid'] = '';

 * @param jsonClient
 * 
 * @param arClientIds
 */
function findMaster(jsonGroup, jsonClient, arClientIds) {
	var arstages = jsonGroup.stages;
	var arcustomers = jsonGroup.customers;
	var arprospects = jsonGroup.prospects;
	var arleads = jsonGroup.leads;
	var u = 0;
	
	//check 0
	//if there are more than one customer records in the group, this is an error
	if (arstages.length > 1 && arcustomers.length > 1) {
		jsonGroup.masterid = '';
		jsonGroup.log = 'Chk0 Error: More than ONE customer records in the group. Unable to determin Master ID';
		jsonGroup.status = 'Error';
		return;
	}
	
	//check 1
	//only customers in the group - skip
	if (arstages.length == 1 && arstages[0] == 'customer') {
		jsonGroup.masterid = '';
		jsonGroup.log = 'Chk1: All records are Customers. Skip Processing';
		jsonGroup.status = 'Skipped';
		return;
	}
	
	//check 2
	//Mixed bag of stages with one customer
	if (arstages.length > 1 && arcustomers.length == 1) {
		jsonGroup.masterid = arcustomers[0];
		jsonGroup.log = 'Chk2: Group contains ONE customer record. Customer Record is set to Master';
		jsonGroup.status = 'Found';
		return;
	}
	
	//check 3
	//Mixed bag of stages with no customer and ONE Prospect
	if (arstages.length > 1 && arprospects.length == 1) {
		jsonGroup.masterid = arprospects[0];
		jsonGroup.log = 'Chk3: Group contains ONE prospect record. Prospect Record is set to Master';
		jsonGroup.status = 'Found';
		return;
	}
	
	//check 4, 5, 6 - check prospects
	// when check 4 fails, additional search is executed that can be used on future validation steps
	// when check 6 fails to find master, returns error
	if (arprospects.length > 1 || arleads.length > 1) {
		
		//if both prospects and leads exists, we ONLY need to check prospects to find master ID
		var arpl = arleads;
		var artext = 'leads';
		if (arprospects.length > 1) {
			arpl = arprospects;
			artext = 'prospects';
		}
		
		//check 4
		//check against prospects  status numbering to determine master
		//assumed that status delimiter is - and second element contains numbering system
		//Loop through all records and validate each status has number. If one out of all has no number, exist out and move to next test
		//jsonClient[crslt[c].getId()]['statustext'];
		if (artext == 'prospects') {
			var curNumber = 999999999; //start off by some very high number
			var curStatus = '';
			var potentialMasterId = '';
			//error to track if one of prospect is missing numbering system
			var hasNumberError = false;
			//error to track if two or more has duplicate status message. In this case, it should move to next validation
			var hasDuplicateStatusError = false;
			//begin loop
			log('debug','chk4id', chk4id);
			for (var chk4id in jsonClient) {
				var prospectNumber = strTrim(jsonClient[chk4id]['statustext'].split('-')[1]);
				//check for number Error
				log('debug','prospectNumber', 'String Value: '+prospectNumber+' // Integer Value: '+parseInt(prospectNumber));
				
				if (isNaN(parseInt(prospectNumber))) {
					//testing
					log('debug','prospectNumber',prospectNumber);
					log('debug','Prospect ID: '+chk4id, 'Status: '+jsonClient[chk4id]['statustext']+' is missing numbering system');
					
					//WORK-AROUND: NetSuite is throwing NaN error for 08 and only for this. 
					if (prospectNumber.length > 1 && prospectNumber.charAt(0)=='0') {
						//try removing leading 0 
						prospectNumber = prospectNumber.substr(1);
						log('debug','Trying to remove leading 0','Try again: '+isNaN(parseInt(prospectNumber)));
						if (isNaN(parseInt(prospectNumber))) {
							log('debug','Failed secondary parseInt test', 'Modified prospectNumber: '+prospectNumber);
							hasNumberError = true;
							break;
						}
					} else {
						hasNumberError = true;
						break;
					}
				}
				
				//check for duplicate status Error
				if (jsonClient[chk4id]['statustext'] == curStatus) {
					log('debug','Prospect ID: '+chk4id, 'Status: '+jsonClient[chk4id]['statustext']+' is repeated in this group');
					hasDuplicateStatusError = true;
					break;
				}
				
				if (parseInt(prospectNumber) < curNumber) {
					potentialMasterId = chk4id;
				}
				curNumber = parseInt(prospectNumber);
				curStatus = jsonClient[chk4id]['statustext'];
			}
			
			//if no errors are return during loop, we can decide on the master at this point
			if (!hasNumberError && !hasDuplicateStatusError) {
				//decide on master and return
				jsonGroup.masterid = potentialMasterId;
				jsonGroup.log = 'Chk4: Group contains all or two or more prospect records. Lowest Prospect Number used to determin Master ID';
				jsonGroup.status = 'Found';
				return;
			}
		}
		
		
		//-------------------- Must get Last trx date and activity date to determin Master Id -------------------------------------------
		getLatestTrxAndActivityDate(jsonClient, arClientIds);
		
		//check 5
		//Use latest date to find master
		//loop through each lead/prospect to find masterRecord based on latestdate
		var dateToBeat = null;
		var chk5masterid = '';
		for (u=0; u < arpl.length; u++) {
			if (jsonClient[arpl[u]]['latestdate']) {
				if (!dateToBeat || (jsonClient[arpl[u]]['latestdate'].getTime() > dateToBeat.getTime())) {
					dateToBeat = jsonClient[arpl[u]]['latestdate'];
					chk5masterid = arpl[u];
				} else if (dateToBeat && (jsonClient[arpl[u]]['latestdate'].getTime() == dateToBeat.getTime())) {
					//when previous date and current date is exactly the same, reset dateToBeat and master rec
					dateToBeat = null;
					chk5masterid = '';
				}
			}
		}
		//if chk5masterid is found, return it otherwise move to datecreated check
		if (chk5masterid) {
			jsonGroup.masterid = chk5masterid;
			jsonGroup.log = 'Chk5: Group contains all or two or more '+artext+' records. latest activity/trx date used to determin Master ID';
			jsonGroup.status = 'Found';
			return;
		}
		
		//check 6
		//either there were no activity/trx date on all prospects/leads or dates were equal. 
		//use datecreated to determin Master ID. Earliest created date becomes Master
		var date2ToBeat = null;
		var chk6masterid = '';
		for (u=0; u < arpl.length; u++) {
			if (!date2ToBeat || (jsonClient[arpl[u]]['datecreated'].getTime() < date2ToBeat.getTime())) {
				date2ToBeat = jsonClient[arpl[u]]['datecreated'];
				chk6masterid = arpl[u];
			} else if (date2ToBeat && (jsonClient[arpl[u]]['datecreated'].getTime() == date2ToBeat.getTime())) {
				//when previous date and current date is exactly the same, reset date2ToBeat and master rec
				date2ToBeat = null;
				chk6masterid = '';
			}
		}
		//if chk6masterid is found, return it otherwise return error
		if (chk6masterid) {
			jsonGroup.masterid = chk6masterid;
			jsonGroup.log = 'Chk6: Group contains all or two or more '+artext+' records. earliest datecreated date used to determin Master ID';
			jsonGroup.status = 'Found';
			return;
		}
		
		//At this point, it's an error
		jsonGroup.masterid = '';
		jsonGroup.log = 'Prospect/lead ('+artext+')Check Error: Unable to determin Master ID from '+artext;
		jsonGroup.status = 'Error';
		return;
	}
	
	//When it reaches this point, it's an error
	//TRUE ERROR
	jsonGroup.masterid = '';
	jsonGroup.log = 'Master Find Error: Unable to determin Master ID from customer/prospect/or leads';
	jsonGroup.status = 'Error';
	return;
}

/**
 * Runs additional search against acitity and transaction records to find latestdate/latesttype/latestid to use
 * @param jsonClient
 * @param arClientIds
 */
function getLatestTrxAndActivityDate(jsonClient, arClientIds) {
	//3. Search for Latest Transaction Date of any kind for all client
	//order the search in trandate Latest.
	//array to keep track of already used client id
	var arTrx = new Array();
	var tflt = [new nlobjSearchFilter('entity', null, 'anyof', arClientIds),
	            new nlobjSearchFilter('mainline', null, 'is', 'T')];
	var tcol = [new nlobjSearchColumn('trandate').setSort(true),
	            new nlobjSearchColumn('entity'),
	            new nlobjSearchColumn('internalid'),
	            new nlobjSearchColumn('type')];
	var trslt = nlapiSearchRecord('transaction', null, tflt, tcol);
	for (var t=0; trslt && t < trslt.length; t++) {
		if (!arTrx.contains(trslt[t].getValue('entity'))) {
			arTrx.push(trslt[t].getValue('entity'));
			jsonClient[trslt[t].getValue('entity')]['lasttrxdate'] = new Date(trslt[t].getValue('trandate'));
			jsonClient[trslt[t].getValue('entity')]['lasttrxtype'] = trslt[t].getText('type');
			jsonClient[trslt[t].getValue('entity')]['lasttrxid'] = trslt[t].getValue('internalid');
		}
	}
	
	//4. Search for Latest Activities Events, Phone calls, Tasks
	var arAct = new Array();
	var acflt = [new nlobjSearchFilter('company', null, 'anyof', arClientIds)];
	var accol = [new nlobjSearchColumn('startdate').setSort(true),
	             new nlobjSearchColumn('type'),
	             new nlobjSearchColumn('internalid','company')];
	var acrslt = nlapiSearchRecord('activity', null, acflt, accol);
	for (var ac=0; acrslt && ac < acrslt.length; ac++) {
		log('debug','activity company',acrslt[ac].getValue('internalid','company'));
		if (!arAct.contains(acrslt[ac].getValue('internalid','company'))) {
			arAct.push(acrslt[ac].getValue('internalid','company'));
			jsonClient[acrslt[ac].getValue('internalid','company')]['lastactivitydate'] = new Date(acrslt[ac].getValue('startdate'));
			jsonClient[acrslt[ac].getValue('internalid','company')]['lastactivitytype'] = acrslt[ac].getText('type');
			jsonClient[acrslt[ac].getValue('internalid','company')]['lastactivityid'] = acrslt[ac].getId();
		}
	}
	
	log('debug','set latestdate','');
	
	//5. Loop through customer element and set latest date to use
	//jsonClient[crslt[c].getId()]['latestdate'] = '';
	//jsonClient[crslt[c].getId()]['latesttype'] = '';
	//jsonClient[crslt[c].getId()]['latestid'] = '';
	for (var jc in jsonClient) {
		if (jsonClient[jc].lasttrxdate && jsonClient[jc].lastactivitydate) {
			//compare both to see which one to use
			if (jsonClient[jc].lasttrxdate.getTime() > jsonClient[jc].lastactivitydate.getTime()) {
				jsonClient[jc]['latestdate'] = jsonClient[jc].lasttrxdate;
				jsonClient[jc]['latesttype'] = jsonClient[jc].lasttrxtype;
				jsonClient[jc]['latestid'] = jsonClient[jc].lasttrxid;
			} else if (jsonClient[jc].lasttrxdate.getTime() < jsonClient[jc].lastactivitydate.getTime()) {
				jsonClient[jc]['latestdate'] = jsonClient[jc].lastactivitydate;
				jsonClient[jc]['latesttype'] = jsonClient[jc].lastactivitytype;
				jsonClient[jc]['latestid'] = jsonClient[jc].lastactivityid;
			}
		} else if ((!jsonClient[jc].lasttrxdate && jsonClient[jc].lastactivitydate) || (jsonClient[jc].lasttrxdate && !jsonClient[jc].lastactivitydate)) {
			jsonClient[jc]['latestdate'] = (jsonClient[jc].lasttrxdate)?jsonClient[jc].lasttrxdate:jsonClient[jc].lastactivitydate;
			jsonClient[jc]['latesttype'] = (jsonClient[jc].lasttrxdate)?jsonClient[jc].lasttrxtype:jsonClient[jc].lastactivitytype;
			jsonClient[jc]['latestid'] = (jsonClient[jc].lasttrxdate)?jsonClient[jc].lasttrxid:jsonClient[jc].lastactivityid;
		}
	}
	
	log('debug','Run logic','');
}

