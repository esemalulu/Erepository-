/**
 * Custom Mass Update script specifically to clear out successfully processed LMS Staging Records.
 */

function deleteSuccessfulLmsStagingRecs(rec_type, rec_id) {
	
	try {
		//ONLY Execute if it is LMS Staging record
		if (rec_type=='customrecord_lmsc_stage' || 
			rec_type=='customrecord_lmslic_stage' || 
			rec_type=='customrecord_lmsl_stage' || 
			rec_type=='customrecord_lmsp_stage')
		{
			nlapiDeleteRecord(rec_type, rec_id);
		}
		
	} catch (err) {
		log(
			'error',
			'Error deleting staging record',
			rec_type+' // '+rec_id+' // '+getErrText(err)
		);
	}
	
}