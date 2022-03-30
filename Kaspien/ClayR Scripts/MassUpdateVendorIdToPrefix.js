/**
 * Module Description
 * 
 * Version    Date            Author           Remarks
 * 1.00       27 Jul 2015     clayr
 *
 */

/**
 * @param {String} recType Record type internal id
 * @param {Number} recId Record internal id
 * @returns {Void}
 */
function massUpdateVendorIdToPrefix(recType, recId) {
	
	try {
		
		if (recType == 'vendor') {
			
			var recVendor = nlapiLoadRecord(recType, recId);
			
			var nameId = recVendor.getFieldValue('entityid');
			
			nlapiSubmitField(recType,recId,'custentityprefix',nameId);
			
		}
		
	} catch (err) {
		
		nlapiLogExecution('ERROR', 'mass update values', 'recType: ' + recType+ '; internalId: ' + recId + '; nameId: ' + nameId +  
				'; errCode: ' + err.name + '; err: ' + err.message);
				
	}

}
