/**
 * Module Description
 * 
 * Version    Date            Author           Remarks
 * 1.00       23 Jul 2013     AnJoe
 *
 */

var inactiveFields = ['custrecord_nspc_stop_sync','custrecord_nspc_unsubscribe'];
var emailFields = ['custrecord_nspc_dup_ui_warn','custrecord_nspc_dup_as_error'];
var allTrackFldFields = ['custrecord_nspc_stop_sync','custrecord_nspc_unsubscribe','custrecord_nspc_dup_ui_warn'];

function nspConfigPageInit(type) {
	if (type == 'edit') {
		//Disable fields based on Track Field selected
		var arDisableFlds = new Array();
		//when edit, based on selected fields, disable fields
		if (nlapiGetFieldText('custrecord_nspc_track_fld') == 'Inactive') {
			//disable inactive related fields
			arDisableFlds = emailFields;
		} else if (nlapiGetFieldText('custrecord_nspc_track_fld') == 'Email') {
			arDisableFlds = inactiveFields;
		}
		
		//loop through and disable fields
		for (var d=0; d < arDisableFlds.length; d++) {
			nlapiSetFieldValue(arDisableFlds[d],'F');
			nlapiDisableField(arDisableFlds[d], true);
		}
		
		//if record is contact, disable Is Person and Is Company fields
		if (nlapiGetFieldText('custrecord_nspc_rec_type')=='Contact Records') {
			nlapiSetFieldValue('custrecord_nspc_isperson','F');
			nlapiSetFieldValue('custrecord_nspc_is_company','F');
			nlapiDisableField('custrecord_nspc_isperson', true);
			nlapiDisableField('custrecord_nspc_is_company',true);
		} else {
			nlapiDisableField('custrecord_nspc_isperson', false);
			nlapiDisableField('custrecord_nspc_is_company',false);
		}
	}
}

function nspConfigOnSave() {
	
	if (nlapiGetContext().getExecutionContext()=='userinterface') {
	
		//make sure company/person fields are set for customer types
		if (nlapiGetFieldText('custrecord_nspc_rec_type')!='Contact Records') {
			if (nlapiGetFieldValue('custrecord_nspc_isperson') !='T' && nlapiGetFieldValue('custrecord_nspc_is_company')!='T') {
				alert('You must select Is Person and/or Is Company for this record type. Selecting both will fire for both');
				return false;
			}
		}
		
		
		if (nlapiGetFieldValue('custrecord_nspc_auto_upd_pardot')!='T' && nlapiGetFieldValue('custrecord_nspc_queue_for_review')!='T') {
			alert('Please select automation action: Auto Update Pardot Or Queue for Review');
			return false;
		}
			
		//make sure this config is Unique:
		//Unique Config is Record Type + Field Tracked + Is Person + Is Company
		//reference nspc 
		if (nspc[nlapiGetFieldText('custrecord_nspc_rec_type')]) {
		
			var rfld = nlapiGetFieldText('custrecord_nspc_track_fld');
			var rind = (nlapiGetFieldValue('custrecord_nspc_isperson')=='T')?'T':'F';
			var rcomp = (nlapiGetFieldValue('custrecord_nspc_is_company')=='T')?'T':'F';
			
			if (nlapiGetFieldText('custrecord_nspc_track_fld')=='Contact Records') {
				for (var key in nspc[nlapiGetFieldText('custrecord_nspc_rec_type')]) {
					if (key != nlapiGetRecordId()) {
						var cfgel = nspc[nlapiGetFieldText('custrecord_nspc_rec_type')][key];
						if (rfld == cfgel.trackfld) {
							alert('This configuration for '+nlapiGetFieldText('custrecord_nspc_rec_type')+' Already Exists. Existing Record ID is '+key);
							return false;
							break;
						}
					}					
				}
			} else {
				
				var hasBoth = false;
				var bothLineMsg = '';
				
				var hasInd = false;
				var indLineMsg = '';
				
				var hasComp = false;
				var compLineMsg = '';
				
				for (var ckey in nspc[nlapiGetFieldText('custrecord_nspc_rec_type')]) {
					if (ckey != nlapiGetRecordId()) {
						var ccfgel = nspc[nlapiGetFieldText('custrecord_nspc_rec_type')][ckey];
						
						if (rfld == ccfgel.trackfld) {
						
							if (ccfgel.isperson=='T' && ccfgel.iscompany=='T') {
								hasBoth = true;
								bothLineMsg = 'Configuration ID '+ckey+' for '+nlapiGetFieldText('custrecord_nspc_rec_type')+' applies to both Is Person and Is Company Types';
							} else if (ccfgel.isperson=='T') {
								hasInd = true;
								indLineMsg = 'Configuration ID '+ckey+' for '+nlapiGetFieldText('custrecord_nspc_rec_type')+' apply to Is Person Type';
							} else if (ccfgel.iscompany=='T') {
								hasComp = true;
								compLineMsg = 'Configuration ID '+ckey+' for '+nlapiGetFieldText('custrecord_nspc_rec_type')+' apply to Is Company Type';
							}
							
						}
					}					
				}
				
				if (hasBoth && (rind=='T' || rcomp=='T')) {
					alert(bothLineMsg);
					return false;
				} else if (hasInd && rind=='T') {
					alert(indLineMsg);
					return false;
					
				} else if (hasComp && rcomp=='T') {
					alert(compLineMsg);
					return false;
				}
				
			}
		}
	}

	return true;
}

/**
 * The recordType (internal id) corresponds to the "Applied To" record in your script deployment. 
 * @appliedtorecord recordType
 * 
 * @param {String} type Sublist internal id
 * @param {String} name Field internal id
 * @param {Number} linenum Optional line item number, starts from 1
 * @returns {Void}
 */
function nspConfigFieldChanged(type, name, linenum){

	//Track Field Changed
	if (name == 'custrecord_nspc_track_fld') {
		var arDisableFlds = new Array();
		var arEnableFlds = new Array();
		if (nlapiGetFieldText(name) == 'Inactive') {
			//disable inactive related fields
			arDisableFlds = emailFields;
			arEnableFlds = inactiveFields;
		} else if (nlapiGetFieldText(name) == 'Email') {
			arDisableFlds = inactiveFields;
			arEnableFlds = emailFields;
		} else {
			arDisableFlds = allTrackFldFields;
		}
		
		//loop through and disable fields
		for (var d=0; d < arDisableFlds.length; d++) {
			nlapiSetFieldValue(arDisableFlds[d],'F');
			nlapiDisableField(arDisableFlds[d], true);
		}
		
		//loop through and enable fields
		for (var e=0; e < arEnableFlds.length; e++) {
			nlapiDisableField(arEnableFlds[e], false);
		}
	}
	
	//Record Field Change
	if (name == 'custrecord_nspc_rec_type') {
		//if record is contact, disable Is Person field
		if (nlapiGetFieldText(name)=='Contact Records') {
			nlapiSetFieldValue('custrecord_nspc_isperson','F');
			nlapiSetFieldValue('custrecord_nspc_is_company','F');
			nlapiDisableField('custrecord_nspc_isperson', true);
			nlapiDisableField('custrecord_nspc_is_company',true);
		} else {
			nlapiDisableField('custrecord_nspc_isperson', false);
			nlapiDisableField('custrecord_nspc_is_company',false);
		}
	}
	
	//Only allow either or for Auto Vs Queue
	if (name == 'custrecord_nspc_auto_upd_pardot' && nlapiGetFieldValue(name)=='T') {
		nlapiSetFieldValue('custrecord_nspc_queue_for_review','F');
	}
		
	if (name == 'custrecord_nspc_queue_for_review' && nlapiGetFieldValue(name)=='T') {
		nlapiSetFieldValue('custrecord_nspc_auto_upd_pardot','F');
	}
}


