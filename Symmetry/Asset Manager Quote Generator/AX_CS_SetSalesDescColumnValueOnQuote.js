/**
 * Module Description
 * 
 * Version    Date            Author           Remarks
 * 1.00       28 May 2014     AnJoe
 *
 */

/**
 * The recordType (internal id) corresponds to the "Applied To" record in your script deployment. 
 * @appliedtorecord recordType 
 * 
 * @param {String} type Access mode: create, copy, edit
 * @returns {Void}
 */
function quotePageInit(type){
	for (var i=1; i <= nlapiGetLineItemCount('item'); i++) {
		if (!nlapiGetLineItemValue('item', 'custcol_ax_item_salesdesc', i)) {
			nlapiSetLineItemValue('item', 'custcol_ax_item_salesdesc', i, nlapiGetLineItemValue('item','custcol_ax_item_salesdescsourced',i));
		}
	}
}

function quotePostSource(type, name) {
	if (type == 'item' && name=='item') {
		nlapiSetCurrentLineItemValue('item', 'custcol_ax_item_salesdesc', nlapiGetCurrentLineItemValue('item', 'custcol_ax_item_salesdescsourced'), false, true);
	}
	
}