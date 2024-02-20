/**
 * Workflow Action to delete a Recall Unit.
 * 
 * Version    Date            Author           Remarks
 * 1.00       26 Mar 2018     Jacob Shetler
 *
 */

/**
 * Deletes the Recall Unit.
 * 
 * @returns {Void} Any or no return value
 */
function GD_RecallUnit_Delete_WA()
{
	//Delete the record and navigate back to the Flat Rate Code
	nlapiDeleteRecord(nlapiGetRecordType(), nlapiGetRecordId());
	nlapiSetRedirectURL('record', 'customrecordrvsflatratecodes', nlapiGetFieldValue('custrecordrecallunit_recallcode'));
}
