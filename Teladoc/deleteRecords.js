function deleteRecords(rec_type, rec_id) {
	
	try {
		
		nlapiDeleteRecord(rec_type, rec_id);
		
	} catch (err) {
		log('error','Error deleting '+rec_type+' id '+rec_id);
	}
	
}