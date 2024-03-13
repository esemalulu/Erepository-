/*
 * Module Description
 * 
 * Version    Date            Author           Remarks
 * 1.00       19 Feb 2014     efagone
 *
 */

/*
 * @returns boolean of success
 */

function delete_record_by_id_action(){

	var context = nlapiGetContext();
	
	var recordTypeId = context.getSetting('SCRIPT', 'custscriptr7deleterectype');
	var recordId = context.getSetting('SCRIPT', 'custscriptr7deleterecid');
	
	if (recordTypeId != null && recordTypeId != '' && recordId != null && recordId != '') {
	
		try {
			nlapiDeleteRecord(recordTypeId, recordId);
		} 
		catch (e) {
			return 'F';
		}
		
		return 'T';
	}
	
	return 'F';
}


