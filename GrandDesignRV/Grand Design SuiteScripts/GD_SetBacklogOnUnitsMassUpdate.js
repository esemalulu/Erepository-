/**
 * Module Description
 * 
 * Version    Date            Author           Remarks
 * 1.00       29 Aug 2013     nathanah
 *
 */

/**
 * @param {String} recType Record type internal id
 * @param {Number} recId Record internal id
 * @returns {Void}
 */
function GD_SetBacklogOnUnitsMassUpdate(recType, recId) 
{
	// load the unit
	var unitRecord = nlapiLoadRecord(recType, recId);
	
	// get the production run backlog record
	var productionRunBacklogId = unitRecord.getFieldValue('custrecordunit_productionrunbacklog');
	
	// get the backlog from the production run backlog record
	var backlogId = nlapiLookupField('customrecordrvsproductionrunworkorder', productionRunBacklogId, 'custrecordproductionrunwo_workorder', false);
	
	// set the backlog on the unit
	unitRecord.setFieldValue('custrecordunit_backlog', backlogId);
	
	nlapiSubmitRecord(unitRecord, false, false);
}