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
function massUpdateGenderalDelete(recType, recId) {
	
	try {
	
			nlapiLogExecution('DEBUG', 'Mass Remove Records', 'type: ' + type + '; internalId: ' + recId);
			
			nlapiDeleteRecord(recType,recId);
		
	} catch (err) {
		
		nlapiLogExecution('ERROR', 'Mass Remove Records', 'recType: ' + recType+ '; internalId: ' + recId + 
				'; errCode: ' + err.name + '; err: ' + err.message);
			
	}


}
