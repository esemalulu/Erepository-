/**
 * Custom Mass Update script
 * Deletes ALL engagements incase it needs to be executed against ALL eligible contacts again with new logic
 */

function deleteAllEngagements(rec_type, rec_id) {
	//Make sure the record type is customrecord_aux_engagment_record (Engagement record)
	if (rec_type != 'customrecord_aux_engagment_record')
	{
		throw nlapiCreateError('MASS_DELETE_ENGAGEMENT_RECORD',rec_type+' is NOT customrecord_aux_engagment_record',false);
	}
	nlapiDeleteRecord(rec_type, rec_id);
	 
}
