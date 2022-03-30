/**
 * Module Description
 * 
 * Version    Date            Author           Remarks
 * 1.00       27 Jan 2016     rehanlakhani
 *
 */

/**
 * The recordType (internal id) corresponds to the "Applied To" record in your script deployment. 
 * @appliedtorecord recordType
 * 
 * @param {String} type Operation types: create, edit, delete, xedit,
 *                      approve, cancel, reject (SO, ER, Time Bill, PO & RMA only)
 *                      pack, ship (IF only)
 *                      dropship, specialorder, orderitems (PO only) 
 *                      paybills (vendor payments)
 * @returns {Void}
 */
function updateOpportunityNotes(type){
	var recID = nlapiGetFieldValue('custrecord_lnk_opp');
	
	var filter = new Array();
		filter[0] = new nlobjSearchFilter('internalidnumber', null, 'equalto', recID);
	
	var columns = new Array();
		columns[0] = new nlobjSearchColumn('lastmodified', 'custrecord_lnk_opp', null)
		columns[0].setSort(true);
		columns[1] = new nlobjSearchColumn('custrecord_justification_notes', 'custrecord_lnk_opp', null)
		columns[1].setSort(true);
		columns[1].setLabel('Justification Notes');
		
	
	var rs = nlapiSearchRecord('opportunity', null, filter, columns)
	for(var i = 0; i < 1; i+=1)
	{
		var rec = nlapiLoadRecord('opportunity', recID);
			rec.setFieldValue('custbody_justification_notes', rs[0].getValue(columns[1]));
		nlapiSubmitRecord(rec);
	}		
}