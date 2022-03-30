/**
 * Module Description
 * 
 * Version    Date            Author           Remarks
 * 1.00       17 Jul 2015     clayr
 *
 */

/**
 * @param {String} recType Record type internal id
 * @param {Number} recId Record internal id
 * @returns {Void}
 */
function massUpdateItemExternalId(recType, recId) {
	
	try {
		
		if (recType == 'inventoryitem') {
			
			var recItem = nlapiLoadRecord(recType, recId);
			var etailzSku = recItem.getFieldValue('itemid');
			
			nlapiSubmitField(recType,recId,'externalid',etailzSku);
			
		}
		
	} catch (err) {
		
		nlapiLogExecution('ERROR', 'mass update values', 'recType: ' + recType+ '; internalId: ' + recId + '; etailzSku: ' + etailzSku + 
				'; errCode: ' + err.name + '; err: ' + err.message);
			
	}
}
