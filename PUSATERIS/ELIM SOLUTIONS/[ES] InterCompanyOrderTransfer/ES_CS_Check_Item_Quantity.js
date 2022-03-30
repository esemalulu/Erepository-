/**
 * Module Description
 * 
 * Version    Date            Author           Remarks
 * 1.00       26 Feb 2016     Fan
 *
 */

/**
 * The recordType (internal id) corresponds to the "Applied To" record in your script deployment. 
 * @appliedtorecord recordType
 *   
 * @param {String} type Sublist internal id
 * @returns {Boolean} True to save line item, false to abort save
 */
function es_cs_CIQ_ValidateLine(type){
	if (type == 'item') {
		var FIELDS = ['custcol_es_bayview','custcol_es_yorkville','custcol_es_sherway', 'custcol_es_commissary'];
		var quantity = parseFloat(nlapiGetCurrentLineItemValue('item', 'quantity') || 0);
		var sum = 0;
		for (var i = 0; i < FIELDS.length; i += 1) {
			sum += parseFloat(nlapiGetCurrentLineItemValue('item', FIELDS[i]) || 0);
		}
		if (quantity < sum) {
			alert('The quantity ' + quantity + ' is less than ' + sum + '.');
			return false;
		}
	    return true;
	}
}
