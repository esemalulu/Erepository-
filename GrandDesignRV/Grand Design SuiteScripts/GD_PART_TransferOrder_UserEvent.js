/**
 * Module Description
 * 
 * Version    Date            Author           Remarks
 * 1.00       15 Dec 2016     brians
 *
 */

/**
 * The recordType (internal id) corresponds to the "Applied To" record in your script deployment. 
 * @appliedtorecord recordType
 *   
 * @param {String} type Operation types: create, edit, view, copy, print, email
 * @param {nlobjForm} form Current form
 * @param {nlobjRequest} request Request object
 * @returns {Void}
 */
function GDTransferOrder_BeforeLoad(type, form, request){
	if(type == 'view')
	{
		var itemId = '';
		var lineIndex = 0;
		//If this TO was created from the Plant Pull Suitelet
		if(nlapiGetFieldValue('custbodygd_part_isplantpull') == 'T')
		{
			for(var i = 0; i < nlapiGetLineItemCount('item'); i++)
			{
				lineIndex = i + 1;
				itemId = nlapiGetLineItemValue('item', 'item', lineIndex);
				nlapiSetLineItemValue('item', 'custcolgd_part_requiredbyorderslink', lineIndex, '<a href="/app/common/search/searchresults.nl?searchid=customsearchgd_salesordersrequiringparts&Transaction_ITEM=' + itemId + '" target="_blank">View Open Sales Orders</a>');
			}
		}
	}
}

function GDTransferOrder_BeforeSubmit(type, form, request){
	
}
