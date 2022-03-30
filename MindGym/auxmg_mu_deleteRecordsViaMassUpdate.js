/**
 * Custom Mass Update script specifically to clear out 
 * results from MassUpdate Saved Search
 * 
 */

function deleteRecordsFromMuSearch(rec_type, rec_id) {
	
	try 
	{
		nlapiDeleteRecord(rec_type, rec_id);
		
	} 
	catch (err) 
	{
		log(
			'error',
			'Error deleting staging record',
			rec_type+' // '+rec_id+' // '+getErrText(err)
		);
	}
}