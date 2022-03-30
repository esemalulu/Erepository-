/**
 * Custom Mass Update script
 * 
 * Author: Joe Son
 * Date: 3/9/2015
 * Record: customrecord_ax_swxa_stage (SWX Asset Monthly Load Stage)
 * Desc:
 */

function deleteValidatedRecord(rec_type, rec_id) {
	
	var lookupFld = ['custrecord_ax_swxa_processed','custrecord_ax_swxa_status'];
	var lookupVal = nlapiLookupField(rec_type, rec_id, lookupFld, false);
	if (lookupVal.custrecord_ax_swxa_processed == 'T' && lookupVal.custrecord_ax_swxa_status == '1') {
		log('debug','Deleting Processed Record', rec_id);
		nlapiDeleteRecord(rec_type, rec_id);
	}
}
