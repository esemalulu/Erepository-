
/**
 * User Event trigger deployed against ALL 4 LMS module tables.
 * customrecord_lmsc (Contracts), - ONLY Contract External ID
 * customrecord_lmslic (Licenses), - Need Location, Practice, License External ID
 * customrecord_lmsl (Location Info), - Need Practice, Location External ID
 * customrecord_lmsp (Practice Info), - Need Contract, Practice External ID
 * Also contains list of ALL Company level parameters relating to LMS Module
 * @param type
 */

var paramErrorMainEmpId = nlapiGetContext().getSetting('SCRIPT', 'custscript_sb94_errmainempid');
var paramErrorCcEmails = nlapiGetContext().getSetting('SCRIPT', 'custscript_sb94_errccemails');
if (paramErrorCcEmails) {
	paramErrorCcEmails = paramErrorCcEmails.split(',');
}


function lmsLicenseAfterSubmit(type) {
	
	//--------- DO NOT Execute for Scheduled Script ---------
	//This is to make sure it does NOT get resynced when Rcopia updates
	//TODO: Need to figure out another way to handle this because
	//		There could be other scheduled script that we may run 
	
	log('debug','Exeuction Context',nlapiGetContext().getExecutionContext());
	
	if (nlapiGetContext().getExecutionContext() == 'scheduledscript') {
		return;
	}
	
	var recType = nlapiGetRecordType();
	var recId = nlapiGetRecordId();
	var ctxUserInfo = nlapiGetContext().getExecutionContext()+' ('+nlapiGetContext().getName()+')';
	
	var contractExternalId = '', practiceExternalId='', locationExternalId='', licenseExternalId='';
	
	try {
		
		var rec = nlapiGetNewRecord();
		if (type == 'xedit') {
			//load the new record
			rec = nlapiLoadRecord(recType, recId);
		} else if (type == 'delete') {
			rec = nlapiGetOldRecord();
		}
		
		log('debug','recType, recId, type', recType+' // '+recId+' // '+type);
		
		//Based on record type, grab necessary external IDs
		switch (recType) {
		case 'customrecord_lmsc':
			//Contracts record: Contract External ID
			contractExternalId = rec.getFieldValue('custrecord_lmsct_externalid');
			break;

		case 'customrecord_lmsp':
			//Practice: Contract, Practice External IDs
			practiceExternalId = rec.getFieldValue('custrecord_lmsp_externalid');
			contractExternalId = nlapiLookupField('customrecord_lmsc', rec.getFieldValue('custrecord_lmsp_contract'), 'custrecord_lmsct_externalid', false);
			break;
		
		case 'customrecord_lmsl':
			//Location: Location, Practice External IDs
			locationExternalId = rec.getFieldValue('custrecord_lmsl_externalid');
			practiceExternalId = nlapiLookupField('customrecord_lmsp', rec.getFieldValue('custrecord_lmsl_practice'), 'custrecord_lmsp_externalid', false);
			break;
		
		case 'customrecord_lmslic':
			//License: License, Location, Practice External IDs
			licenseExternalId = rec.getFieldValue('custrecord_lmslc_externalid');
			practiceExternalId = nlapiLookupField('customrecord_lmsp', rec.getFieldValue('custrecord_lmslc_practice'), 'custrecord_lmsp_externalid', false);
			locationExternalId = nlapiLookupField('customrecord_lmsl', rec.getFieldValue('custrecord_lmslc_location'), 'custrecord_lmsl_externalid', false);
			break;
			
		default:
			break;
		}
		
		log('debug','externalIds', contractExternalId+' // '+practiceExternalId+' // '+locationExternalId+' // '+licenseExternalId);
		
		
		var qrec = nlapiCreateRecord('customrecord_axlms_pushextsysqueue');
		qrec.setFieldValue('custrecord_lmspush_syncrectype', recType);
		qrec.setFieldValue('custrecord_lmspush_contextuser', ctxUserInfo);
		qrec.setFieldValue('custrecord_lmspush_actiontaken', type);
		qrec.setFieldValue('custrecord_lmspush_syncrecid', recId);
		qrec.setFieldValue('custrecord_lmspush_contracteid', contractExternalId);
		qrec.setFieldValue('custrecord_lmspush_practiceeid', practiceExternalId);
		qrec.setFieldValue('custrecord_lmspush_locationeid', locationExternalId);
		qrec.setFieldValue('custrecord_lmspush_licenseeid', licenseExternalId);
		nlapiSubmitRecord(qrec, true, true);
		
	} catch (queueerr) {
		log('error','Error LMS Mod Queue Process', getErrText(queueerr));
		var esbj = 'Failed to Queue LMS Sync Push';
		var emsg = 'Following Record Failed to get Queued up for LMS Push Syncing:<br/>'+
				   'Record Type: '+recType+'<br/>'+
				   'Record ID: '+recId+'<br/>'+
				   'Context/User Info: '+ctxUserInfo+
				   '<br/><br/><b>Error Message:</b><br/>'+getErrText(queueerr);
		
		nlapiSendEmail(-5, paramErrorMainEmpId, esbj, emsg, paramErrorCcEmails);
	}
	
}