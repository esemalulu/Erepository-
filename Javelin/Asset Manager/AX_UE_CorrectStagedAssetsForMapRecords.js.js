/**
 * User event fired on after submit for SWX Account To Customer Map and SWX Product To Item Map record.
 * When those records marked with Pending Validation is corrected, script will search staged asset record
 * and take following actions:
 * 1. Mark Asset Record as Unpreocessed and status as blank. This will allow Scheduled Script to pick up the item and process it again.
 */

var ctx = nlapiGetContext();
var paramValidStatusId = ctx.getSetting('SCRIPT','custscript_uevalidstatusid');
var paramPendResearchStatusId = ctx.getSetting('SCRIPT','custscript_uependstatusid');
var paramSendNotificationTo = ctx.getSetting('SCRIPT','custscript_uesendnotifto');


function mappingRecAfterSubmit(type) {

	var actionTypes = ['delete','edit','xedit'];
	if (actionTypes.contains(type)) {
		
		//set up fields based on record type
		var mappedRecFld = '', validationStatusFld='', potentialMatchesFld='', matchNotesFld='', stagedAssetLookupFld='', loadedNameFld='';
		if (nlapiGetRecordType() == 'customrecord_ax_swxpi_map') {
			mappedRecFld = 'custrecord_ax_swxpim_item';
			validationStatusFld = 'custrecord_ax_swxpim_vstatus';
			potentialMatchesFld = 'custrecord_ax_swxpim_potentialmatches';
			matchNotesFld = 'custrecord_ax_swxpim_matchnote';
			loadedNameFld = 'custrecord_ax_swxpim_load_productname';
			//stage asset fld
			stagedAssetLookupFld = 'custrecord_ax_swxa_productname';
			
		} else if (nlapiGetRecordType() == 'customrecord_ax_swxac_map') {
			mappedRecFld = 'custrecord_ax_swxacm_customer';
			validationStatusFld = 'custrecord_ax_swxacm_vstatus';
			potentialMatchesFld = 'custrecord_ax_swxacm_potentialmatches';
			matchNotesFld = 'custrecord_ax_swxacm_matchnotes';
			loadedNameFld = 'custrecord_ax_swxacm_load_acctname';
			//stag asset fld
			stagedAssetLookupFld = 'custrecord_ax_swxa_account';
			
		}
		
		//make script isn't deployed to other record type accidentally
		if (mappedRecFld && validationStatusFld && potentialMatchesFld && matchNotesFld) {
			try {
				var oldrec = nlapiGetOldRecord();
				var newrec = nlapiGetNewRecord();
				if (type == 'xedit') {
					//load entire record for xedit
					newrec = nlapiLoadRecord(nlapiGetRecordType(), nlapiGetRecordId());
				}
				
				//make sure to fire this ONLY when mapped record goes from blank to something or invalid to valid
				if  ( newrec.getFieldValue(mappedRecFld) && 
					  (!oldrec.getFieldValue(mappedRecFld) && newrec.getFieldValue(mappedRecFld)) || 
					  (oldrec.getFieldValue(validationStatusFld) == paramPendResearchStatusId && newrec.getFieldValue(validationStatusFld)==paramValidStatusId)) {
					
					//search for staged asset record marked as Pending Validation and Processed to update 
					//that matches Match record Name
					var stageAssetFlt = [new nlobjSearchFilter('custrecord_ax_swxa_status', null, 'anyof', paramPendResearchStatusId),
					                     new nlobjSearchFilter('custrecord_ax_swxa_processed', null, 'is', 'T'),
					                     new nlobjSearchFilter(stagedAssetLookupFld, null, 'is', newrec.getFieldValue(loadedNameFld))];
					var stageAssetCol = [new nlobjSearchColumn('internalid').setSort(true)];
					var stageAssetRslt = nlapiSearchRecord('customrecord_ax_swxa_stage', null, stageAssetFlt, stageAssetCol);
					
					//loop through and update process and status fields
					var updFlds = ['custrecord_ax_swxa_processed','custrecord_ax_swxa_status'];
					for(var i=0; stageAssetRslt && i < stageAssetRslt.length; i++) {
						nlapiSubmitField('customrecord_ax_swxa_stage', stageAssetRslt[i].getId(), updFlds, ['F','']);
					}
				}
				
			} catch (upderror) {
				log('error','Error while updating Staged Asset',type+': ('+nlapiGetRecordType()+' - '+nlapiGetRecordId()+') Error Message: '+getErrText(upderror));
			}
		}
		
	}
	
}
