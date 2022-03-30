/**
 * Pardot/NetSuite (PNS) Campaign Activity Updater on Contact record.
 * 
 * Author: joe.son@audaxium.com
 * Date: 6/16/2012
 * Record: Contact
 * Desc:
 * Script is fired against Contact record when ever fields defined in PNS configuration is changed.
 * TODO: add additional comment
 */

var ctx = nlapiGetContext();
var pnsConfig = {};
var pnsDefaultConfig={};
var fireType = ['create','edit','xedit'];

var hasConfig = false;

/**
 * Javascript prototype extension to simulate List.contains method
 * @param {Object} arg
 * Usage:
 * arrayObject.contains(value to search in arrayObject)
 */
Array.prototype.contains = function(arg) {
	for (i in this) {
		if (this[i]==arg) return true;
	}
	return false;
};

/**
 * Array comparison.
 * @param x
 * @param y
 * @returns {Boolean}
 */
function compareArray(x, y) {
	   var objectsAreSame = true;
	   
	   if (x.length != y.length) {
		   log('debug','array no match',x.length +' is not same as '+y.length);
		   return false;
	   }
	   
	   for(var i=0; i < x.length; i++) {
	      if(!y.contains(x[i])) {
	    	  log('debug','value does NOT exists in Y',x[i]+' does NOT exists in y array: '+y);
	    	 //if at any point in the loop, y does NOT have what x has, it's not equal
	         objectsAreSame = false;
	         break;
	      }
	   }
	   return objectsAreSame;
	}

function catchZipcodeIssue(type) {
	try {
		//
	} catch (err) {
		log('error','Before Submit Error',getErrText(err));
		if (getErrText(err).indexOf('Without a Zip/Postal code it will not be') > -1) {
			log('error','Let go of the error',getErrText(err));
			return true;
		}
	}
}

/**
 * Loads the PNS Configurations. Checks to see if any of action fields have changed and create campaign response records
 * type: create, edit, delete, xedit, approve, cancel, reject, pack, ship, dropship, specialorder, orderitems, paybills
 */
function afterSubmit(type) {
	
	loadConfigration();
	
	//log('debug','type',type);
	//log('debug','user // camp',pnsDefaultConfig['pardotuser'] +' '+ pnsDefaultConfig['defaultcamp']);
	
	//only fire for edit,create,xedit and user is pardot user and has configuration to run
	if (hasConfig && ctx.getUser() == pnsDefaultConfig['pardotuser'] && pnsDefaultConfig['defaultcamp'] && fireType.contains(type)) {
		
		//printConfigObject();
		
		var oldrec = nlapiGetOldRecord();
		var newrec = nlapiGetNewRecord();
				
		for (var key in pnsConfig) {
			processCampResponse(oldrec, newrec, key);
		}
		
	}
	
}

/**
 * Identify if Campaign Response needs to be created based on trigger action.
 *  *  - Update Parent Logic:
 *  	If Default is to create but isn't checked at config, = Don't create against parent
 *  	If Default is NOT to create but IS checked at config, = DO Create against parent
 *  	Neither is set, = Don't create
 * @param _or
 * @param _nr
 * @param _field
 */
function processCampResponse(_or, _nr, _field) {
	
	var oldval = '', newval = '';
	var fieldToCheck = _field.split('-')[0];
	if (pnsConfig[_field].fieldtype == 'List/Record' || pnsConfig[_field].fieldtype == 'Multiple Select') {
		
		if (pnsConfig[_field].fieldtype == 'Multiple Select') {
			var arOldval = (_or)?_or.getFieldTexts(fieldToCheck):new Array();
			var arNewval = _nr.getFieldTexts(fieldToCheck);
			
			//stringify array of objects
			for (var ov=0; arOldval && ov < arOldval.length; ov++) {
				oldval += arOldval[ov];
				if ((ov+1) != arOldval.length) {
					oldval +=',';
				}
			}
			
			for (var nv=0; arNewval && nv < arNewval.length; nv++) {
				newval += arNewval[nv];
				if ((nv+1) != arNewval.length) {
					newval +=',';
				}
			}
			
		} else {
			oldval = (_or)?_or.getFieldText(fieldToCheck):'';
			newval = _nr.getFieldText(fieldToCheck);
		}
		
	} else {
		oldval = (_or)?_or.getFieldValue(fieldToCheck):'';
		newval = _nr.getFieldValue(fieldToCheck);
	}
		
	
	var updParent = false;
	if ( (pnsDefaultConfig['defaultupdparent']=='T' && pnsConfig[_field].updparentoverride=='T') || 
		 (pnsDefaultConfig['defaultupdparent']=='F' && pnsConfig[_field].updparentoverride=='T')) {
		updParent = true;
	}
	var parentEntity = '';
	if (nlapiGetFieldValue('company')) {
		parentEntity = nlapiGetFieldValue('company');
	}
	
	var createCampRes = false;
	
	log('debug','Testing Config Field: '+_field);
	
	switch(pnsConfig[_field].triggerid) {
		case '1':
			//All Changes: As long as old and new values are different, this will create campaign response record
			log('debug','All Changes','All Change trigger check');
			log('debug','All Change:oldval/newval',oldval+ ' // ' + newval);
			if (oldval != newval) {
				log('debug','All Change:oldval/newval','oldval != newval Matched');
				
				log('debug','MultiSelect Field Value old/new',oldval+' // '+newval);
				
				createCampRes = true;
			}
			break;
		case '2':
			//First Value: ONLY when Old value is Empty and New Value is Set. 
			log('debug','First Value','First Value check');
			log('debug','First Value:oldval/newval',oldval+ ' // ' + newval);
			if (!oldval && newval) {
				log('debug','First Value:oldval/newval','!oldval && newval Matched');
				createCampRes = true;
			}
			
			break;
		case '3':
			//Specific First Value: Only when Old value is Empty and New value matches trigger value
			log('debug','Specific First Value','Specific First Value Check');
			log('debug','Specific First Value:oldval/newval/triggerval',oldval+ ' // ' + newval + ' // ' +pnsConfig[_field].triggervalue);
			if (!oldval && newval && compareEquality(newval,pnsConfig[_field].triggervalue,pnsConfig[_field].fieldtype)) {
				log('debug','Specific First Value:oldval/newval/triggerval','!oldval && newval && newval == pnsConfig[_field].triggervalue Matched');
				createCampRes = true;
			}
			
			break;
		case '4':
			//Specific Value At Any Time: Only When Old and New values are different 
			log('debug','Specific Value At Any Time','Specific Value At Any Time Check');
			
			log('debug','Specific Value At Any Time',oldval+ ' // ' + newval + ' // ' +pnsConfig[_field].triggervalue);
			if (oldval != newval && compareEquality(newval,pnsConfig[_field].triggervalue,pnsConfig[_field].fieldtype)) {
				log('debug','Specific Value At Any Time','oldval != newval && newval == pnsConfig[_field].triggervalue Matched');
				createCampRes = true;
			}
			
			break;
	}
	
	if (createCampRes) {
		createCampResponse(_field, nlapiGetRecordId());
		if (updParent && parentEntity) {
			createCampResponse(_field, parentEntity);
		}
	}
}

function compareEquality(newval, triggerval, fieldtype) {
	
	if (fieldtype == 'Multiple Select') {
		//when multi select, it must compare array objects
		var arNewVal = newval.split(',');
		var arTriggerVal = triggerval.split(',');
		return compareArray(arNewVal, arTriggerVal);
	} else {
		return newval == triggerval;
	}
}

/**
 * Creates Campaign Response against THIS record. 
 *  - If Campaign isn't specified at the config leve, = take default config
 * @param _fld
 */
function createCampResponse(_fld, _entity) {
	//record id campaignresponse
	var camp = pnsDefaultConfig['defaultcamp'];
	if (pnsConfig[_fld].campaignoverride) {
		camp = pnsConfig[_fld].campaignoverride;
	}
	
	var campResType = 'Responded';
	if (pnsConfig[_fld].camprestype) {
		campResType = pnsConfig[_fld].camprestype;
	}
	
	var campResNote = '';
	if (pnsConfig[_fld].campresnote.note) {
		campResNote = pnsConfig[_fld].campresnote.note;
	}
	log('debug','note',campResNote);
	log('debug','entity // leadsource // response // note', _entity+' // '+camp+' // '+campResType+' // '+campResNote);
	
	try {
		var campres = nlapiCreateRecord('campaignresponse',{recordmode: 'dynamic'});
		campres.setFieldValue('entity',_entity);
		campres.setFieldValue('leadsource', camp);
		campres.setFieldText('response', campResType);
		campres.setFieldValue('note', campResNote);
		campres.setFieldText('campaignevent','[Default Event]');
		
		nlapiSubmitRecord(campres, false, true);
	} catch (createerror) {
		log('error','entity // leadsource // response // note', _entity+' // '+camp+' // '+campResType+' // '+campResNote);
		log('error','First time save Failed for ENTITY ID '+_entity,getErrText(createerror));
		//incase this error occured due to first time zipcode only on 2014v2, try creating again.
		//if (getErrText(createerror).indexOf('Without a Zip/Postal code it will not be') > -1) {
			try {
				
				log('error','Trying to Save second time due to zip error','About to save second time');
				var campres = nlapiCreateRecord('campaignresponse',{recordmode: 'dynamic'});
				campres.setFieldValue('entity',_entity);
				campres.setFieldValue('leadsource', camp);
				campres.setFieldText('response', campResType);
				campres.setFieldValue('note', campResNote);
				campres.setFieldText('campaignevent','[Default Event]');
				
				nlapiSubmitRecord(campres, false, true);
				
				log('debug','Success creating camp response. (2nd try)','2nd try success for entity ID; '+_entity);
				
			} catch (screateerror) {
				
				log('error','Second time save Failed for ENTITY ID',_entity);

				throw nlapiCreateError('PNSCAMPERROR', getErrText(screateerror), true);
			}
		//}
	}
	
}

/**
 * Loads the record from PNS Config Record and company level preference
 * customrecord_pns_camp_act_config
 */
function loadConfigration() {
	//load Default Configuration from Company Setup
	pnsDefaultConfig['defaultcamp'] = ctx.getSetting('SCRIPT','custscript_default_campaign');
	pnsDefaultConfig['pardotuser'] = ctx.getSetting('SCRIPT','custscript_pardot_user');
	pnsDefaultConfig['defaultupdparent'] = ctx.getSetting('SCRIPT','custscript_default_upd_parent');
	
	//load Variable/Override Configuration from PNS Config record
	//make sure it returns based on matching record type
	var configFlt = [new nlobjSearchFilter('isinactive', null, 'is','F')];
	var configCol = [new nlobjSearchColumn('internalid'),
	                 new nlobjSearchColumn('custrecord_pns_action_fieldname'), //action field name
	                 new nlobjSearchColumn('custrecord_pns_fieldtype'), //action field type
	                 new nlobjSearchColumn('custrecord_pns_action_field_internalid'), //action field internal id
	                 new nlobjSearchColumn('custrecord_pns_action_trigger'), //action trigger
	                 new nlobjSearchColumn('custrecord_pns_act_on_value'), //action value to compare
	                 new nlobjSearchColumn('custrecord_pns_set_to_campaign'), //set to campaign override
	                 new nlobjSearchColumn('custrecord_pns_camp_res_type'), //camp. response type
	                 new nlobjSearchColumn('custrecord_pns_camp_res_note'), //camp response note
	                 new nlobjSearchColumn('custrecord_pns_upd_parent_override'), //create camp res rec for parent override
	                 ];
	
	var configRslt = nlapiSearchRecord('customrecord_pns_camp_act_config', null, configFlt, configCol);
	if (configRslt && configRslt.length > 0) {
		hasConfig = true;
		
		//build easy to access configJSON obj
		for (var i=0; i < configRslt.length; i++) {
			//Object note is created due to potential multi-line that messes with JSON value
			var txtNoteObj = new Object();
			txtNoteObj.note = configRslt[i].getValue('custrecord_pns_camp_res_note');
			
			//make sure config key is unique by attaching trigger value to trigger field
			var configKey = configRslt[i].getValue('custrecord_pns_action_field_internalid').toLowerCase()+'-'+
							configRslt[i].getValue('custrecord_pns_act_on_value').toLowerCase();
			
			pnsConfig[configKey] = {
				"internalid":configRslt[i].getValue('internalid'),
				"fieldname":configRslt[i].getText('custrecord_pns_action_fieldname'),
				"fieldtype":configRslt[i].getText('custrecord_pns_fieldtype'),
				"fieldid":configRslt[i].getValue('custrecord_pns_action_field_internalid').toLowerCase(),
				"triggertxt":configRslt[i].getText('custrecord_pns_action_trigger'),
				"triggerid":configRslt[i].getValue('custrecord_pns_action_trigger'),
				"triggervalue":configRslt[i].getValue('custrecord_pns_act_on_value'),
				"campaignoverride":configRslt[i].getValue('custrecord_pns_set_to_campaign'),
				"updparentoverride":configRslt[i].getValue('custrecord_pns_upd_parent_override'),
				"camprestype":configRslt[i].getText('custrecord_pns_camp_res_type'),
				"campresnote":txtNoteObj
			};
		}
	}
}

function printConfigObject() {
	
	for (var dkey in pnsDefaultConfig) {
		log('debug',dkey,pnsDefaultConfig[dkey]);
	}
	
	for (var key in pnsConfig) {
		log('debug',key,key);
		for (var subkey in pnsConfig[key]) {
			log('debug',key+'::'+subkey,pnsConfig[key][subkey]);
		}
	}
}

function log(_type, _title, _msg) {
	nlapiLogExecution(_type, _title, _msg);
}

function getErrText(_e) {
	var txt='';
	if (_e instanceof nlobjError) {
		//this is netsuite specific error
		txt = 'NLAPI Error: '+_e.getCode()+' :: '+_e.getDetails();
	} else {
		//this is generic javascript error
		txt = 'JavaScript/Other Error: '+_e.toString();
	}
	return txt;
}