/**
 * Module Description
 * 
 * Version    Date            Author           Remarks
 * 1.00       06 Oct 2017     Jacob Shetler
 *
 */

/**
 * @param {String} recType Record type internal id
 * @param {Number} recId Record internal id
 * @returns {Void}
 */
function GD_UpdateClaimRecallsSRV_MU(recType, recId)
{
	nlapiSubmitRecord(nlapiLoadRecord('customrecordrvsclaim', nlapiLookupField(recType, recId, 'custrecordsrv_swo_claim')), true, true);
}
