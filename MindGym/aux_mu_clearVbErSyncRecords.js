/**
 * Custom Mass Update script
 * 
 * Author: Joe Son
 * Date: 14/2/2014
 * Record: AX:VB/ER Cost Sync to SO Queue
 * Desc:
 */

function deleteProcessedRecord(rec_type, rec_id) {
	
	var isProcessed = nlapiLookupField(rec_type, rec_id, 'custrecord_vberq_processed', false);
	if (isProcessed == 'T') {
		log('debug','Deleting Processed Record', rec_id);
		nlapiDeleteRecord(rec_type, rec_id);
	}
}
