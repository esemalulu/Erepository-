/**
 * Module Description
 * 
 * Version    Date            Author           Remarks
 * 1.00       03 Mar 2016     Elim
 *
 */

/**
 * @param {nlobjRequest} request Request object
 * @param {nlobjResponse} response Response object
 * @returns {Void} Any output is written via response object
 */
function suitelet(request, response){
	var items = [91033, 84837];
	var record = nlapiCreateRecord('cashsale',{"recordmode":"dynamic"});
	record.setFieldValue('entity', 8);
	record.selectNewLineItem('item');
	for (var i = 0; i < items.length; i += 1) {
		response.writeLine('Test Item ' + items[i]);
		try {
			record.setCurrentLineItemValue('item', 'item', items[i]);
			response.writeLine('Test Item Success');
		} catch (e) {
			response.writeLine(e.name + '\n' + e.message);
			nlapiLogExecution('DEBUG', 'Error Item', items[i]);
		}
	}
	response.writeLine('finish');
}
