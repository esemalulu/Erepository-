/**
 * 
 */

var SCT_EXIT_LEVEL = 5000;
var ctx = nlapiGetContext();
var LAST_PROC_CUSTOMER_PARAM = 'custscript_last_proc_staged_leads';
var lastProcessedCustomerId = '';

var ctx = nlapiGetContext();

var counter = 1;
var rsltSet = null;

var csvBackupFileNamePrefix = 'SANDBOX-LeadsToBeRemoved-FailedWithChild-';
var csvBackupFileFolderId = '172820'; //Audaixum Folder
var strFileHeader = 'Entity ID, Company Name, InternalID,Good Lead internal ID,Status,Primary Sales Rep,Email,Phone,Process Status,Log\n';
var strFileBody = '';

function massRemoveBadLeadsP1() {
	
	//get any script parameter
	lastProcessedCustomerId = ctx.getSetting('SCRIPT',LAST_PROC_CUSTOMER_PARAM);
	
	//define search
	var flt = [new nlobjSearchFilter('custrecord_rec_proc_status', null, 'isempty')];
	
	//check to see if last processed id is present.
	if (lastProcessedCustomerId) {
		//this insures that if and when script is rescheduled, it ONLY returns unprocessed contact IDs
		flt.push(new nlobjSearchFilter('internalidnumber', null, 'lessthan',lastProcessedCustomerId));
	}

	var col = [new nlobjSearchColumn('internalid').setSort(true),
	           new nlobjSearchColumn('custrecord_rec_internalid'),
	           new nlobjSearchColumn('custrecord_rec_good_internalid')];
	
	var rslt = nlapiSearchRecord('customrecord_stage_custrecs_todelete','',flt,col);
	//rslt.length
	for (var i=0; rslt && i < rslt.length; i++) {
		try {
			//load lead
			try {
				var customerRec = nlapiLoadRecord('customer',rslt[i].getValue('custrecord_rec_internalid'));
				//var strFileHeader = 'Entity ID,Company Name, InternalID, Good Lead ID,Status,Primary Sales Rep,Email,Phone,Process Status,Log\n';
				var leadObj = new Object();
				leadObj.entityid = customerRec.getFieldValue('entityid');
				leadObj.companyname = customerRec.getFieldValue('companyname');
				leadObj.internalid = customerRec.getId();
				leadObj.goodlead = rslt[i].getValue('custrecord_rec_good_internalid');
				leadObj.status = customerRec.getFieldText('entitystatus');
				leadObj.stage = customerRec.getFieldValue('stage');
				leadObj.primesalesrep = customerRec.getFieldValue('salesrep');
				leadObj.email = customerRec.getFieldValue('email');
				leadObj.phone = customerRec.getFieldValue('phone');
				leadObj.procstatus = '';
				leadObj.log='';
				
				//check for status of Prospect or client. if so, mark as error and skip
				//CUSTOMER or PROSPECT
				if (leadObj.stage != 'LEAD') {
					leadObj.procstatus = 'Failed';
					leadObj.log = 'This is a '+leadObj.stage+' and can not be deleted by this process';
				} else {
					try {
						nlapiDeleteRecord('customer',customerRec.getId());
						//if it got to this point, delete was success
						leadObj.procstatus = 'Success';
						leadObj.log = 'Successfully deleted Lead Internal ID: '+leadObj.internalid;
						
					} catch (ex) {
						//delete failed
						leadObj.procstatus = 'Failed';
						leadObj.log = 'Failed to delete lead Internal ID: '+leadObj.internalid+' // '+ex.toString();
						
						//nlapiLogExecution('debug', 'Error is NS nlobjError', ex.toString());
							
						if (ex.toString().indexOf('CANT_DELETE_RCRD') > -1) {
								
							//MOD - Request by client to attempt to remove Leads with Child Records.
							//MOD - 11/1/2012 - Instead of deleting, remap child records to Good Leads if any
							//					If good lead ID is missing or lead doesn't exists, exit out as Error
							if (!leadObj.goodlead) {
								leadObj.procstatus = 'Failed';
								leadObj.log += ' // Good Lead Record (Internal ID: '+leadObj.goodlead+' from upload) to Map child records to is missing';
							} else {
								//0. try loading good lead record and make sure it exists in the system
								//0A. make sure it doesn't have any child lead/prospect/customer records
								//1. Remap Event associated with this lead
								//2. Remap Phone Calls associated with this lead
								//3. Remap Contact associated with this lead
								//4. Remap Opportunities associated with this Prospect
								
								//0. try loading good lead record and make sure it exists in the system
								try {
									var goodLead = nlapiLoadRecord('customer', leadObj.goodlead);
									
									//0A. search for child customer/lead/prospect records
									var custFilter = [new nlobjSearchFilter('parent', null, 'anyof', leadObj.internalid),
									                  new nlobjSearchFilter('internalid', null, 'noneof', leadObj.internalid)]; //exclude self hierarchy ones
									var custColumn = [new nlobjSearchColumn('entitystatus'),
									                  new nlobjSearchColumn('entityid')];
									var custRslt = nlapiSearchRecord('customer', null, custFilter, custColumn);
									if (custRslt && custRslt.length > 0) {
										//Fail out at this point.
										var childRecords = '';
										for (var ch=0; ch < custRslt.length; ch++) {
											childRecords += '('+custRslt[ch].getText('entitystatus')+'::'+custRslt[ch].getValue('entityid')+'::'+custRslt[ch].getId()+')';
										}
										
										leadObj.procstatus = 'Failed';
										leadObj.log += ' // This lead has Child Records: ['+childRecords+']';
										
									} else {
										//1. search for related Events 
										var taskFilter = [new nlobjSearchFilter('company', null, 'anyof', leadObj.internalid)];
										var taskColumn = [new nlobjSearchColumn('internalid')];
										var taskRslt = nlapiSearchRecord('task', null, taskFilter, taskColumn);
												
										for (var t=0; taskRslt && t < taskRslt.length; t++) {
											//try remapping all tasks
											try {
												nlapiLogExecution('debug', 'Remap Task to Good Lead ('+leadObj.goodlead+') FROM Customer/Prospect/Lead ID of: '+leadObj.internalid, 'Task Internal ID: '+taskRslt[t].getId());

												nlapiSubmitField('task', taskRslt[t].getId(), 'company', leadObj.goodlead);
														
											} catch (taskRemapError) {
												nlapiLogExecution('error', 'Remap Task Error', 'Error Remapping Task // '+taskRemapError.toString());
												leadObj.log += ' // Failed to remap child task ID: '+taskRslt[t].getId()+' // '+taskRemapError.toString();
												break;
											}
										}
												
										//2. search for related phone calls
										var phoneFilter = [new nlobjSearchFilter('company', null, 'anyof', leadObj.internalid)];
										var phoneColumn = [new nlobjSearchColumn('internalid')];
										var phoneRslt = nlapiSearchRecord('phonecall', null, phoneFilter, phoneColumn);
												
										for (var p=0; phoneRslt && p < phoneRslt.length; p++) {
												
											try {
												nlapiLogExecution('debug', 'Remap Phone Call to Good Lead ('+leadObj.goodlead+') FROM Customer/Prospect/Lead ID of: '+leadObj.internalid, 'Phone Call Internal ID: '+phoneRslt[p].getId());
												
												nlapiSubmitField('phonecall', phoneRslt[p].getId(), 'company', leadObj.goodlead);
												
											} catch (phoneRemapError) {
												nlapiLogExecution('error', 'Remap PhoneCall Error', 'Error Remapping PhoneCall // '+phoneRemapError.toString());
												leadObj.log += ' // Failed to remap child phonecall ID: '+phoneRslt[p].getId()+' // '+phoneRemapError.toString();
												break;
											}
										}
												
										//3. search for contacts
										var contactFilter = [new nlobjSearchFilter('company', null, 'anyof', leadObj.internalid)];
										var contactColumn = [new nlobjSearchColumn('internalid')];
										var contactRslt = nlapiSearchRecord('contact', null, contactFilter, contactColumn);
										
										for (var c=0; contactRslt && c < contactRslt.length; c++) {
											try {
												nlapiLogExecution('debug', 'Remap Contact to Good Lead ('+leadObj.goodlead+') FROM Customer/Prospect/Lead ID of: '+leadObj.internalid, 'Contact Internal ID: '+contactRslt[c].getId());
												
												nlapiSubmitField('contact', contactRslt[c].getId(),'company',leadObj.goodlead);

											} catch (contactRemapError) {
												nlapiLogExecution('error', 'Remap Contact Error', 'Error Remapping Contact // '+contactRemapError.toString());
												leadObj.log += ' // Failed to remap child contact ID: '+contactRslt[c].getId()+' // '+contactRemapError.toString();
												break;
											}
										}
												
										//Try Deleting Customer Record Again
										try {
											nlapiDeleteRecord('customer',customerRec.getId());
											//if it got to this point, delete was success
											leadObj.procstatus = 'Success';
											leadObj.log = 'Successfully deleted Lead ('+leadObj.internalid+'). All Tasks, Phone Calls, Contacts Remapped to Good Lead ('+leadObj.goodlead+')';
											nlapiLogExecution('debug','Child Record Remapped', 'Successfully remapped after child record deletion');
										} catch (finalex) {
											//delete failed
											leadObj.procstatus = 'Failed';
											leadObj.log += ' // Failed to delete lead Internal ID: '+leadObj.internalid+' after task, phone call, contact remapping // '+finalex.toString();
											nlapiLogExecution('error','Second try failed', 'Second attempt failed: '+finalex.toString());
										}
									}
								} catch (goodLeadLoadError) {
									leadObj.procstatus = 'Failed';
									leadObj.log += ' // Failed to properly load Good Lead ('+leadObj.goodlead+') // '+goodLeadLoadError.toString();
								}
							}
						}
					}
				}
				
				leadObj.log = strGlobalReplace(leadObj.log, "\r", " || ");
				leadObj.log = strGlobalReplace(leadObj.log,"\n", " || ");
				
				//nlapiLogExecution('debug',leadObj.procstatus,leadObj.log);
				//mark THIS staged record.
				var updFld = ['custrecord_rec_proc_status','custrecord_rec_log'];
				var updVal = [leadObj.procstatus, leadObj.log];
				nlapiSubmitField('customrecord_stage_custrecs_todelete',rslt[i].getId(), updFld, updVal);
				
				strFileBody +='"'+leadObj.entityid+'",'+
				  			  '"'+leadObj.companyname+'",'+
				  			  '"'+leadObj.internalid+'",'+
				  			  '"'+leadObj.goodlead+'",'+
				  			  '"'+leadObj.status+'",'+
				  			  '"'+leadObj.primesalesrep+'",'+
				  			  '"'+(leadObj.email?leadObj.email:'')+'",'+
				  			  '"'+(leadObj.phone?leadObj.phone:'')+'",'+
				  			  '"'+leadObj.procstatus+'",'+
				  			  '"'+leadObj.log+'"\n';
			} catch (exc) {
				nlapiLogExecution('error','Failed','Failed to delete lead Internal ID: '+rslt[i].getValue('custrecord_rec_internalid')+' // '+exc.toString());
				
				var errorMsg = exc.toString();
				errorMsg = strGlobalReplace(errorMsg, "\r", " || ");
				errorMsg = strGlobalReplace(errorMsg,"\n", " || ");
				
				var updFld = ['custrecord_rec_proc_status','custrecord_rec_log'];
				var updVal = ['Failed', 'Failed to delete lead Internal ID: '+rslt[i].getValue('custrecord_rec_internalid')+' // '+errorMsg];
				nlapiSubmitField('customrecord_stage_custrecs_todelete',rslt[i].getId(), updFld, updVal);
				
				//had issues loading of customer record or other things went wrong. Log it
				strFileBody +='Unknown,'+
				  			  'Unknown,'+
				  			  '"'+rslt[i].getValue('custrecord_rec_internalid')+'",'+
				  			  'Unknown,'+
				  			  'Unknown,'+
				  			  'Unknown,'+
				  			  'Unknown,'+
				  			  'Failed,'+
				  			  'Failed to delete lead Internal ID: '+rslt[i].getValue('custrecord_rec_internalid')+' // '+errorMsg+'\n';
			}
			
			
			//check to make sure we have enough processing governance points If not, create CSV File
			if (ctx.getRemainingUsage() <=SCT_EXIT_LEVEL && (i+1) < rslt.length) {
				nlapiLogExecution('debug','Rescheduling Index: '+i+' // Customer Internal ID: '+rslt[i].getValue('internalid'));
				var param = new Array();
				param[LAST_PROC_CUSTOMER_PARAM] = rslt[i].getValue('internalid');
				
				var schStatus = nlapiScheduleScript(ctx.getScriptId(), ctx.getDeploymentId(), param);
				if (schStatus=='QUEUED') {
					break;
				}
			}
		} catch (e) {
			nlapiLogExecution('error','error occured while executing Phase 4 update','Errored Internal Id of customer: '+rslt[i].getValue('internalid')+' // '+e.toString());
			break;
		}
	}
	
	//at this point, create CSV of processed records
	var rightNow = new Date();
	var milsecTime = rightNow.getTime(); // for uniqueness
	var fileName = csvBackupFileNamePrefix + milsecTime + '.csv';
	var csvFileObj = nlapiCreateFile(fileName, 'CSV', strFileHeader + strFileBody);
	csvFileObj.setFolder(csvBackupFileFolderId);
	nlapiSubmitFile(csvFileObj);
	
}


/**
 * Helper function to GLOBALLY search and replace char or word with provided char or word
 * @param _fullString - Original String Value
 * @param _searchChar - Char or Word to search for
 * @param _replaceChar - Char or Word to replace with.
 * @returns
 */
function strGlobalReplace(_fullString, _searchChar, _replaceChar) {
	if (!_fullString) {
		return '';
	}
	var jsrs = new RegExp(_searchChar, "g");
	var newString=_fullString.replace(jsrs,_replaceChar);
	return newString;
}
