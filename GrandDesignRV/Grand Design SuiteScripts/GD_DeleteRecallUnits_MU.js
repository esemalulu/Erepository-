/**
 * Module Description
 * 
 * Version    Date            Author           Remarks
 * 1.00       05 May 2017     Jacob Shetler
 *
 */

/**
 * @param {String} recType Record type internal id
 * @param {Number} recId Record internal id
 * @returns {Void}
 */
function GD_DeleteRecallUnits_MU(recType, recId)
{
	try{
		nlapiDeleteRecord(recType, recId);
	}
	catch(err) {
		nlapiLogExecution('debug', 'Error for ' + recId, err);
	}
}
