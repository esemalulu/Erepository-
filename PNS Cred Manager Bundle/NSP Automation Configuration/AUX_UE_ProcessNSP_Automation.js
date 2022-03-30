/**
 * User Event Deployed to Contact and Customer Records to process NSP Automation
 * 
 * Version    Date            Author           Remarks
 * 1.00       23 Jul 2013     AnJoe
 *
 */
//Company Setting to activate NetSuite to Pardot Update Automation
var nspAutoActive = (nlapiGetContext().getSetting('SCRIPT','custscript_nspauto_active')=='T')?true:false;

//Setting for Creating NEW records in Pardot
var createContact = (nlapiGetContext().getSetting('SCRIPT','custscript_nspauto_newcontact')=='T')?true:false;
var createPersonLead = (nlapiGetContext().getSetting('SCRIPT','custscript_nspauto_newpl')=='T')?true:false;
var createCompanyLead = (nlapiGetContext().getSetting('SCRIPT','custscript_nspauto_newcl')=='T')?true:false;
var createPersonProspect = (nlapiGetContext().getSetting('SCRIPT','custscript_nspauto_newpp')=='T')?true:false;
var createCompanyProspect = (nlapiGetContext().getSetting('SCRIPT','custscript_nspauto_newcp')=='T')?true:false;
var createPersonCustomer = (nlapiGetContext().getSetting('SCRIPT','custscript_nspauto_newpc')=='T')?true:false;
var createCompanyCustomer = (nlapiGetContext().getSetting('SCRIPT','custscript_nspauto_newcc')=='T')?true:false;



//Cred Mgr ID fro pardot
var pardotCredMgrId = nlapiGetContext().getSetting('SCRIPT','custscript_nspa_credmgr_pardot');
log('debug','cm id',pardotCredMgrId);

//JSON Object that contains details of active automation configuration
var nspAutoJson = {
	"context":nlapiGetContext().getExecutionContext(),
	"user":nlapiGetContext().getUser(),
	"haserror":false,
	"errmsg":"",
	"action":"",
	"recordtype":"",
	"recordid":"",
	"pardotid":"",
	"pardot":{
		"credmgrid":pardotCredMgrId,
		"user":"",
		"pass":"",
		"userkey":"",
		"apikey":""
	},
	"config":{
		"hasconfig":false,
		"details":{}
	},
	//only loaded for after submit or before submit
	"submitdata":{
		"execConfigKey":new Array(),
		"recIsPerson":"",
		"recStage":"",
		"recPostFix":""
	}
};

/**
 * 
 */
function loadNspAutoConfig(_type, _event) {
	//attempt to load active nsp configurations
	nspAutoJson.action = _type.toUpperCase();
	nspAutoJson.recordtype = nlapiGetRecordType();
	nspAutoJson.recordid = (nlapiGetRecordId())?nlapiGetRecordId():'';
	
	if (!pardotCredMgrId) {
		nspAutoJson.haserror = true;
		nspAutoJson.errmsg = 'Invalid or Missing Cred. Manager Record for Pardot';
		return false;
	}
	
	//check for pardot id
	var pardotUrl = nlapiGetFieldValue('custentitypi_url');
	//if it has been synced, it will have pardot URL of with read?id= value
	//or http://pi.pardot.com/prospect/read/id/85657280
	if (pardotUrl) {
		if (pardotUrl.indexOf('read?id=') >= 0) {
			nspAutoJson.pardotid = pardotUrl.split('=')[1];
		} else if (pardotUrl.indexOf('read/id/') >= 0) {
			//select out read/id/xxxxx portionc
			nspAutoJson.pardotid = pardotUrl.substring(pardotUrl.indexOf('read/id/')).split('/')[2];
		}
	} 
	
	//lookup info
	try {
		var fld = ['custrecord_aux_escm_login','custrecord_aux_escm_password','custrecord_aux_escm_access_api_key'];
		var credVals = nlapiLookupField('customrecord_aux_ext_serv_cred_mgr',pardotCredMgrId, fld);
		//check to make sure all values necessary values are returned
		pardotEmail = credVals.custrecord_aux_escm_login;
		pardotPassword = credVals.custrecord_aux_escm_password;
		pardotUserKey = credVals.custrecord_aux_escm_access_api_key;
		
		//for Pardot, All Three credential elements are required
		if (!pardotEmail || !pardotPassword || !pardotUserKey) {
			nspAutoJson.haserror = true;
			nspAutoJson.errmsg = 'Required Pardot Credentials are Missing.';
			return false;
		}
	} catch (crederr) {
		nspAutoJson.haserror = true;
		nspAutoJson.errmsg = 'Looking up Pardot Cred Failed for Cred ID '+pardotCredMgrId+': '+getErrText(crederr);
		return false;
	}
	
	
	//set pardot cred values
	nspAutoJson.pardot.user = pardotEmail;
	nspAutoJson.pardot.pass = pardotPassword;
	nspAutoJson.pardot.userkey = pardotUserKey;
	
	log('debug','rec type',nspAutoJson.recordtype);
	
	//search and load active configuration rules for automation that applies to THIS record.
	var confflt = [new nlobjSearchFilter('custrecord_nspfsc_rec_internalid','custrecord_nspc_rec_type','is',nspAutoJson.recordtype),
	               new nlobjSearchFilter('isinactive',null,'is','F')];
	
	var confcol = [new nlobjSearchColumn('internalid'),
	               new nlobjSearchColumn('custrecord_nspfsc_config_fld_interid','CUSTRECORD_NSPC_TRACK_FLD'), //tracked field internal ID
	               new nlobjSearchColumn('custrecord_nspfsc_entity_stage','CUSTRECORD_NSPC_REC_TYPE'), //tracked records' entity stage value 
	               new nlobjSearchColumn('CUSTRECORD_NSPC_TRACK_FLD'), 
	               new nlobjSearchColumn('custrecord_nspc_isperson'),
	               new nlobjSearchColumn('custrecord_nspc_is_company'),
	               new nlobjSearchColumn('custrecord_nspc_auto_upd_pardot'),
	               new nlobjSearchColumn('custrecord_nspc_dup_ui_warn'),
	               new nlobjSearchColumn('custrecord_nspc_dup_as_error'),
	               new nlobjSearchColumn('custrecord_nspc_stop_sync'),
	               new nlobjSearchColumn('custrecord_nspc_unsubscribe'),
	               new nlobjSearchColumn('custrecord_nspc_queue_for_review')];

	try {
	
		var confrslt = nlapiSearchRecord('customrecord_aux_nsp_config', null, confflt, confcol);
		if (!confrslt || (confrslt && confrslt.length <=0)) {
			nspAutoJson.config.hasconfig = false;
		} else {
			nspAutoJson.config.hasconfig = true;
			//loop through and add in fields to track
			for (var c=0; c < confrslt.length; c++) {
				
				var fldIntId = confrslt[c].getValue('custrecord_nspfsc_config_fld_interid','CUSTRECORD_NSPC_TRACK_FLD');
				var fldPostFix = (confrslt[c].getValue('custrecord_nspc_isperson')=='T')?'T':'F';
				//if applied to customer type is both company and person, mark it as A
				if (fldPostFix == 'T' && confrslt[c].getValue('custrecord_nspc_is_company')=='T') {
					fldPostFix = 'A';
				}
				
				if (!nspAutoJson.config.details[fldIntId+'-'+fldPostFix]) {
					nspAutoJson.config.details[fldIntId+'-'+fldPostFix]={};
				}
				
				
				nspAutoJson.config.details[fldIntId+'-'+fldPostFix] = {
					"fldintid":fldIntId,
					"configid":confrslt[c].getValue('internalid'),
					"trackfldid":confrslt[c].getValue('CUSTRECORD_NSPC_TRACK_FLD'),
					"isperson":(confrslt[c].getValue('custrecord_nspc_isperson')=='T')?'T':'',
					"iscompany":(confrslt[c].getValue('custrecord_nspc_is_company')=='T')?'T':'',
					"stage":(confrslt[c].getText('custrecord_nspfsc_entity_stage','CUSTRECORD_NSPC_REC_TYPE'))?confrslt[c].getText('custrecord_nspfsc_entity_stage','CUSTRECORD_NSPC_REC_TYPE').toLowerCase():'',
					"queuereview":(confrslt[c].getValue('custrecord_nspc_queue_for_review')=='T')?true:false,
					"autoupdatepardot":(confrslt[c].getValue('custrecord_nspc_auto_upd_pardot')=='T')?true:false,
					"dupuiwarn":(confrslt[c].getValue('custrecord_nspc_dup_ui_warn')=='T')?true:false,
					"dupaserr":(confrslt[c].getValue('custrecord_nspc_dup_as_error')=='T')?true:false,
					"stopsync":(confrslt[c].getValue('custrecord_nspc_stop_sync')=='T')?true:false,
					"unsubs":(confrslt[c].getValue('custrecord_nspc_unsubscribe')=='T')?true:false
				};
			}
			
			//set createnewinpardot flag
			//run ONLY if before or after
			if (_type != 'create' && (_event =='before' || _event == 'after')) {
				var recIsPerson = '';
				var recStage = '';
				var recPostFix = '';
				var oldrec = nlapiGetOldRecord();
				var newrec = nlapiGetNewRecord();
				
				if (nlapiGetRecordType() == 'customer' || nlapiGetRecordType() == 'prospect' || nlapiGetRecordType() == 'lead') {
					recIsPerson = (nlapiGetFieldValue('isperson')=='T')?'T':'';
					recStage = nlapiGetFieldValue('stage').toLowerCase();
					recPostFix = (nlapiGetFieldValue('isperson')=='T')?'T':'F';
					
					if (type == 'xedit') {
						var fldVals = ['isperson','stage'];
						var custvals = nlapiLookupField('customer', nlapiGetRecordId(), fldVals, false);
						recIsPerson = (custvals['isperson']=='T')?'T':'';
						recPostFix = (custvals['isperson']=='T')?'T':'F';
						recStage = custvals['stage'].toLowerCase();
					}
				}
				
				//log('debug','isperson//stage',recIsPerson.toString()+' // '+recStage);
				
				//stores Config JSON keys to execute
				var execConfigKey = new Array();
				for (var fld in nspAutoJson.config.details) {
					//remove postFix from field name key
					var fldName = fld.split('-')[0];
					var configPostFix = fld.split('-')[1];
					log('debug','load config - fld', 'ConfigPostFix/RecPostFix: '+configPostFix+' // '+recPostFix+' // Rec/Config Stage: '+recStage+' // '+nspAutoJson.config.details[fld].stage);
					//make sure stage and isPerson/isCompany type matches
					if ( recStage == nspAutoJson.config.details[fld].stage && ((configPostFix == recPostFix) || (configPostFix == 'A')) ) {
						if (newrec.getField(fldName) && (oldrec.getFieldValue(fldName) != newrec.getFieldValue(fldName))) {
							if (fldName == 'isinactive') {
								//make sure to check for record inactivation
								if (oldrec.getFieldValue(fldName) != 'T' && newrec.getFieldValue(fldName)=='T') {
									execConfigKey.push(fld);
								}
							} else {
								execConfigKey.push(fld); 
							}						
						}
					}
				}

				//populate submitdata json
				nspAutoJson.submitdata['execConfigKey'] = execConfigKey;
				nspAutoJson.submitdata['recIsPerson'] = recIsPerson;
				nspAutoJson.submitdata['recStage'] = recStage;
				nspAutoJson.submitdata['recPostFix'] = recPostFix;
				
			}
		}
		
		log('debug','Config',JSON.stringify(nspAutoJson));
		
		return true;
		
	} catch (conferr) {
		nspAutoJson.haserror = true;
		nspAutoJson.errmsg = 'Error Getting Automation Config for '+nspAutoJson.recordtype+': '+getErrText(conferr);
		log('error','Error Loading Configuration', nspAutoJson.errmsg);
		return false;
	}	
}

/**
 * The recordType (internal id) corresponds to the "Applied To" record in your script deployment. 
 * @appliedtorecord recordType
 *   
 * @param {String} type Operation types: create, edit, view, copy, print, email
 * @param {nlobjForm} form Current form
 * @param {nlobjRequest} request Request object
 * @returns {Void}
 */
function nspAutoBeforeLoad(type, form, request){

	if (nspAutoActive && nlapiGetContext().getExecutionContext()=='userinterface') {
		//load automation configuration
		loadNspAutoConfig(type,'');
		//add InlineHTML Field that contains nspAutoJson
		var inlineFld = form.addField('custpage_nspautojson', 'inlinehtml', '', null, null);
		inlineFld.setDefaultValue('<script language="JavaScript">'+
								  'var nspc = '+JSON.stringify(nspAutoJson)+';'+
								  '</script>');
		log('debug','JSON val',JSON.stringify(nspAutoJson));
		
	}
}

function nspAutoAfterSubmit(type) {
	if (nspAutoActive && type == 'create') {
		try {
		
			loadNspAutoConfig(type,'after');

			log('debug','after sub',nspAutoJson.createinpardot);
			
			var createNewInPardot = false;
			if (nlapiGetRecordType() == 'contact') {
				createNewInPardot = createContact;
			} else {
				//compare stage
				var cpStage = nlapiGetFieldValue('stage').toLowerCase();
				if (cpStage == 'customer') {
					if (nlapiGetFieldValue('isperson')=='T') {
						createNewInPardot = createPersonCustomer;
					} else {
						createNewInPardot = createCompanyCustomer;
					}
				} else if (cpStage == 'prospect') {
					if (nlapiGetFieldValue('isperson')=='T') {
						createNewInPardot = createPersonProspect;
					} else {
						createNewInPardot = createCompanyProspect;
					}
				} else if (cpStage == 'lead') {
					if (nlapiGetFieldValue('isperson')=='T') {
						createNewInPardot = createPersonLead;
					} else {
						createNewInPardot = createCompanyLead;
					}
				}
			}
			
			if (createNewInPardot) {
				var nspuobj = getNewNspUrObject();
				nspuobj.status = '5';
				nspuobj.msg = 'Queued to create in Pardot';
				if (nlapiGetRecordType() == 'contact') {
					nspuobj.contrecid = nlapiGetNewRecord().getId();
				} else {
					nspuobj.custrecid = nlapiGetNewRecord().getId();
				}

				var nspur1 = nlapiCreateRecord('customrecord_aux_nsp_sync_review');
				nspur1.setFieldValue('custrecord_nspur_status',nspuobj.status);
				nspur1.setFieldValue('custrecord_nspur_status_msg',nspuobj.msg);
				nspur1.setFieldValue('custrecord_nspur_exec_user', nspuobj.user);
				nspur1.setFieldValue('custrecord_nspur_action_type',nspuobj.type);
				nspur1.setFieldValue('custrecord_nspur_exec_context', nspuobj.ctx);
				nspur1.setFieldValue('custrecord_nspur_exec_cust_rec', nspuobj.custrecid);
				nspur1.setFieldValue('custrecord_nspur_exec_contact_rec', nspuobj.contrecid);
				nspur1.setFieldValue('custrecord_nspur_nsp_config', nspuobj.configid);
				nspur1.setFieldValue('custrecord_nspur_fld_modified', nspuobj.fldmod);
				nspur1.setFieldValue('custrecord_nspur_oldval', nspuobj.oldval);
				nspur1.setFieldValue('custrecord_nspur_newval', nspuobj.newval);
				nlapiSubmitRecord(nspur1, true, true);
			}
			
		} catch (nspautoprocerr) {
			//add to User Review
			var nspur = nlapiCreateRecord('customrecord_aux_nsp_sync_review');
			//Error status is 2
			nspur.setFieldValue('custrecord_nspur_status',2);
			nspur.setFieldValue('custrecord_nspur_status_msg',getErrText(nspautoprocerr));
			nspur.setFieldValue('custrecord_nspur_exec_user', nlapiGetContext().getUser());
			nspur.setFieldValue('custrecord_nspur_action_type',type);
			nspur.setFieldValue('custrecord_nspur_exec_context', nlapiGetContext().getExecutionContext());
			if (nlapiGetRecordType() == 'contact') {
				nspur.contrecid = nlapiGetNewRecord().getId();
			} else {
				nspur.custrecid = nlapiGetNewRecord().getId();
			}
			nlapiSubmitRecord(nspur, true, true);
		}
	}
}

/**
 * The recordType (internal id) corresponds to the "Applied To" record in your script deployment. 
 * @appliedtorecord recordType
 * 
 * @param {String} type Operation types: create, edit, delete, xedit
 *                      approve, reject, cancel (SO, ER, Time Bill, PO & RMA only)
 *                      pack, ship (IF)
 *                      markcomplete (Call, Task)
 *                      reassign (Case)
 *                      editforecast (Opp, Estimate)
 * @returns {Void}
 */
function nspAutoBeforeSubmit(type){
	if (nspAutoActive && type != 'delete' && type != 'create') {
		try {
		
			loadNspAutoConfig(type,'before');
			
			log('debug','Before Submit pardot id',nspAutoJson.pardotid);
			
			//process ONLY if it has NSP config and it was previously synced with Pardot before
			
			if (nspAutoJson.config.hasconfig && nspAutoJson.pardotid) {
				log('debug','Before Submit JSON val',JSON.stringify(nspAutoJson));
				
				var execConfigKey = nspAutoJson.submitdata.execConfigKey;
				
				var arAddNspu = new Array();
				var nspuobj = null;
				var oldrec = nlapiGetOldRecord();
				var newrec = nlapiGetNewRecord();
				
				//loop through keys and find what needs to be done
				for (var ck=0; ck < execConfigKey.length; ck++) {
					
					nspuobj = getNewNspUrObject();
					if (nlapiGetRecordType() == 'contact') {
						nspuobj.contrecid = nlapiGetRecordId();
					} else {
						nspuobj.custrecid = nlapiGetRecordId();
					}
					
					var ecjson = nspAutoJson.config.details[execConfigKey[ck]];
							
					//check for duplicate email
					if (ecjson.fldintid == 'email') {
						var lookupres = pardotDuplicateEmail(nspAutoJson, nlapiGetFieldValue('email'));
						if (lookupres.err || lookupres.hasdup) {
							
							//store
							nspuobj.status = '2';
							nspuobj.msg = lookupres.msg;
							nspuobj.configid = ecjson.configid;
							nspuobj.fldmod = ecjson.trackfldid;
							nspuobj.oldval = oldrec.getFieldValue(ecjson.fldintid);
							nspuobj.newval = newrec.getFieldValue(ecjson.fldintid);
							
							//if dup email is treated as error, throw Error here
							if (ecjson.dupaserr) {
								var errMsgVal = 'NSP Config Dup Email Error for '+nlapiGetRecordType()+' ('+nlapiGetRecordId()+') Old Emal: '+nspuobj.oldval+' // New Email: '+nspuobj.newval;
								log('debug','dup error throw',errMsgVal);
								throw nlapiCreateError('NSP_Automation_Duplicate_Email_Error', errMsgVal, false);
								return false;
							}
							
							arAddNspu.push(nspuobj);
							continue;
						}
					
						//Auto update Pardot
						if (ecjson.autoupdatepardot) {
							//attempt to update pardot
							//update using Pardot ID: nspAutoJson.pardotid
							var eures = pardotUpdateEmailWithId(nspAutoJson, nlapiGetFieldValue('email'));
							if (eures.err) {
								//store
								nspuobj.status = '2';
								nspuobj.msg = eures.msg;
								nspuobj.configid = ecjson.configid;
								nspuobj.fldmod = ecjson.trackfldid;
								nspuobj.oldval = oldrec.getFieldValue(ecjson.fldintid);
								nspuobj.newval = newrec.getFieldValue(ecjson.fldintid);
								arAddNspu.push(nspuobj);
							}
							
							
						} else {
							//store
							nspuobj.status = '1';
							nspuobj.msg = 'Staged for Review';
							nspuobj.configid = ecjson.configid;
							nspuobj.fldmod = ecjson.trackfldid;
							nspuobj.oldval = oldrec.getFieldValue(ecjson.fldintid);
							nspuobj.newval = newrec.getFieldValue(ecjson.fldintid);
							arAddNspu.push(nspuobj);
						}
					}
					
					//loop through and add NSP User Review Records
					for (var ns=0; ns < arAddNspu.length; ns++) {
						var nspur1 = nlapiCreateRecord('customrecord_aux_nsp_sync_review');
						nspur1.setFieldValue('custrecord_nspur_status',arAddNspu[ns].status);
						nspur1.setFieldValue('custrecord_nspur_status_msg',arAddNspu[ns].msg);
						nspur1.setFieldValue('custrecord_nspur_exec_user', arAddNspu[ns].user);
						nspur1.setFieldValue('custrecord_nspur_action_type',arAddNspu[ns].type);
						nspur1.setFieldValue('custrecord_nspur_exec_context', arAddNspu[ns].ctx);
						nspur1.setFieldValue('custrecord_nspur_exec_cust_rec', arAddNspu[ns].custrecid);
						nspur1.setFieldValue('custrecord_nspur_exec_contact_rec', arAddNspu[ns].contrecid);
						nspur1.setFieldValue('custrecord_nspur_nsp_config', arAddNspu[ns].configid);
						nspur1.setFieldValue('custrecord_nspur_fld_modified', arAddNspu[ns].fldmod);
						nspur1.setFieldValue('custrecord_nspur_oldval', arAddNspu[ns].oldval);
						nspur1.setFieldValue('custrecord_nspur_newval', arAddNspu[ns].newval);
						
						nlapiSubmitRecord(nspur1, true, true);
					}					
				}
			}			
			
		} catch (nspautoprocerr) {
			log('error','error processing NSP Automation',getErrText(nspautoprocerr));
			
			//make sure to throw error completely to NOT save the record
			if (getErrText(nspautoprocerr).indexOf('NSP_Automation_Duplicate_Email_Error') >= 0) {
				throw nlapiCreateError('FAILED_SAVE', 'Unable to Save Record: '+getErrText(nspautoprocerr), true);
				return false;
			}
			
			//add to User Review
			var nspur = nlapiCreateRecord('customrecord_aux_nsp_sync_review');
			//Error status is 2
			nspur.setFieldValue('custrecord_nspur_status',2);
			nspur.setFieldValue('custrecord_nspur_status_msg',getErrText(nspautoprocerr));
			nspur.setFieldValue('custrecord_nspur_exec_user', nlapiGetContext().getUser());
			nspur.setFieldValue('custrecord_nspur_action_type',type);
			nspur.setFieldValue('custrecord_nspur_exec_context', nlapiGetContext().getExecutionContext());
			if (nlapiGetRecordType() == 'customer' || nlapiGetRecordType() == 'prospect' || nlapiGetRecordType() == 'lead') {
				nspur.setFieldValue('custrecord_nspur_exec_cust_rec', nlapiGetRecordId());
			} else if (nlapiGetRecordType() == 'contact') {
				nspur.setFieldValue('custrecord_nspur_exec_contact_rec', nlapiGetRecordId());
			}
			
			nlapiSubmitRecord(nspur, true, true);
		}
		
	}
}

function getNewNspUrObject () {
	var nspuobj1= new Object();
	nspuobj1.user = nspAutoJson.user;
	nspuobj1.type = nspAutoJson.action;
	nspuobj1.ctx = nspAutoJson.context;
	nspuobj1.custrecid = '';
	nspuobj1.contrecid = '';
	nspuobj1.configid = '';
	nspuobj1.fldmod = '';
	nspuobj1.oldval = '';
	nspuobj1.newval = '';
	nspuobj1.status = '';
	nspuobj1.msg = '';
	return nspuobj1;
}



