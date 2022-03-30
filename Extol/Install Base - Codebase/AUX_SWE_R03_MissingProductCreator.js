/**
 * Module Description
 * 
 * Version    Date            Author           Remarks
 * 1.00       06 Jul 2014     AnJoe
 *
 */

/**
 * @param {String} type Context Types: scheduled, ondemand, userinterface, aborted, skipped
 * @returns {Void}
 */
function processMissingProductRecords(type) {

	//search for errored Check Log and see if Product can be created.
	var pflt = [new nlobjSearchFilter('custrecord_check_log_status', null, 'anyof','3'), // in error state
	            new nlobjSearchFilter('custcol_item_category','custrecord_transaction', null, 'anyof','1'), //item category of product line
	            new nlobjSearchFilter('isinactive', null, 'is','F')];
	var pcol = [];
	
}
