/*
 * @author efagone
 */

function afterSubmit(type){

	if (type != 'delete') {
	
		if (type == 'xedit') {
			var record = nlapiLoadRecord(nlapiGetRecordType(), nlapiGetRecordId());
		}
		else {
			var record = nlapiGetNewRecord();
		}
		// Get array of EAM records that the EAT is associated to 
		var arrMastersToUpdate = record.getFieldValues('custrecordr7emailassociationtagmasters');
		
		// Queue up governance check and processing, anything not processed gets scheduled
		var mastersLeftToUpdate = queueUpMasterProcessing(arrMastersToUpdate);
		
		// Schedule remaining EAMs to update
		scheduleRemainingMasters(mastersLeftToUpdate);
	}
}


