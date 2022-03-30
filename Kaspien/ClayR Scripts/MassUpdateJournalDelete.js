/**
 * Module Description
 * 
 * Version    Date            Author           Remarks
 * 1.00       30 Oct 2015     clayr
 *
 */

/**
 * @param {String} recType Record type internal id
 * @param {Number} recId Record internal id
 * @returns {Void}
 */
function CustomTradeshowsMassUpdate(recType, recId) {
	
	try {
		if (recType == 'customrecordtradeshows') {
			
			// Get current case record and the PO internal id.
			var recJE = nlapiLoadRecord(recType, recId);
	
			nlapiLogExecution('DEBUG', 'Delete Journal Entries with Kill JE', 'type: ' + type + '; JE Id: ' + recId);
			
			nlapiDeleteRecord(recType,recId);
						
		}
		
	} catch (err) {
		
		nlapiLogExecution('ERROR', 'Mass Remove JEs', 'recType: ' + recType+ '; internalId: ' + recId + 
				'; errCode: ' + err.name + '; err: ' + err.message);
			
	}


}
