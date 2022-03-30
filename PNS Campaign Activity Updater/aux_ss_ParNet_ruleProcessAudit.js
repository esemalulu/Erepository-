/**
 * Replica of Pardot to NetSuite processor based on configuration.
 * Purpose of this script is to identify those contacts missing campaign responses that had any matching interaction.
 * Aug. 2014, NetSuite introduced a defect where Web Service integration user was throwing creation or processing of campaign response process.
 * This was same time when they introduced address sublist changes. It was throwing Zip code is required error.
 * 
 * Using this script we can identify which contacts were affected by 2014 NS bug and any potential misses in the future misses.
 * @param type
 */

var ctx = nlapiGetContext();
var pnsConfig = {};
var pnsDefaultConfig={};
var fireType = ['create','edit','xedit'];

var hasConfig = false;

//Primary entry function
//6/6/2015. Continue developing under Scala.

function ruleProcessAudit(type)
{
	loadConfiguration();
	
	for (var key in pnsConfig) {
		processCampResponse(oldrec, newrec, key);
	}
}

function loadConfigration() {
	
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