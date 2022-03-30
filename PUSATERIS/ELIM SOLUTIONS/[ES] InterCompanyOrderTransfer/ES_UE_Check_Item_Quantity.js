/**
 * Module Description
 * 
 * Version    Date            Author           Remarks
 * 1.00       26 Feb 2016     Fan
 *
 */

/**
 * 
 * The recordType (purchaseorder) corresponds to the "Purchase Order" record in your script deployment. 
 * @appliedtorecord purchaseorder
 * 
 * @param {String} type Operation types: create, edit, delete, xedit
 *                      approve, reject, cancel (SO, ER, Time Bill, PO & RMA only)
 *                      pack, ship (IF)
 *                      markcomplete (Call, Task)
 *                      reassign (Case)
 *                      editforecast (Opp, Estimate)
 * @returns {Void}
 */
function userEventBeforeSubmit(type){
	if (type == 'create' || type == 'edit') {
		var FIELDS = ['custcol_es_bayview','custcol_es_yorkville','custcol_es_sherway', 'custcol_es_commissary'];
		var count = nlapiGetLineItemCount('item');
		var messages = [];
		for (var l = 1; l <= count; l += 1) {
			var quantity = parseFloat(nlapiGetLineItemValue('item', 'quantity', l) || 0);
			var sum = 0;
			for (var i = 0; i < FIELDS.length; i += 1) {
				sum += parseFloat(nlapiGetLineItemValue('item', FIELDS[i], l) || 0);
			}
			if (quantity < sum) {
				messages.push('The quantity in line ' + l + ' is ' + quantity + ' and is less than ' + sum + '.');
			}
		}
		if (messages.length > 0) {
			throw nlapiCreateError('DATA_ERROR', messages.join('\n'));
		}
	}
 
}
