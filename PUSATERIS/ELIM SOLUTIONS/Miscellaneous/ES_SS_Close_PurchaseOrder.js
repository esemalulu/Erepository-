/**
 * Module Description
 * 
 * Version    Date            Author           Remarks
 * 1.00       24 Feb 2016     Elim
 *
 */
var ELIM = ELIM || {};
(function($){
	$.yield = function(threshHold, func){
		var lthreshHold = threshHold || 500;
		if (nlapiGetContext().getRemainingUsage()  < lthreshHold ) {
			if (func) func();
			if (nlapiYieldScript) {
				var oReturn = nlapiYieldScript();
				if (oReturn.status == 'FAILURE'){
					nlapiLogExecution("ERROR","Failed to backup script, exiting: Reason = " + oReturn.reason + " / Size = " + oReturn.size);
					throw "Failed to yield script";
				} else if (oReturn.status == 'RESUME') {
					nlapiLogExecution("AUDIT", "Resuming script because of " + oReturn.reason+".  Size = "+ oReturn.size);
				}
			}
		}
	};
	$.searchRecord = function(recType, searchId, searchFilters, searchColumns, callback) {
		var oResults = nlapiSearchRecord(recType, searchId, searchFilters, searchColumns);
		while(oResults) {
			for (var oResult in oResults) {
				this.yield(1000);
				if (oResults.hasOwnProperty(oResult)) {
					callback(oResults[oResult]);
				}
			}
			if (oResults.length >= 1000) {
				oResults = nlapiSearchRecord(recType, searchId, searchFilters, searchColumns);
			} else {
				oResults = null;
			} 
		}
	};
})(ELIM);
/**
 * @param {String} type Context Types: scheduled, ondemand, userinterface, aborted, skipped
 * @returns {Void}
 */
function scheduled(type) {
	var search = nlapiGetContext().getSetting('SCRIPT', 'custscript_es_closed_transaction_search');
	if (!search) return;
	ELIM.searchRecord('transaction',
			search,
			null, null, function(result){
		try{
			var record = nlapiLoadRecord(result.getRecordType(), result.getId());
			var count = record.getLineItemCount('item');
			for (var l = 1; l <= count; l += 1) {
				record.setLineItemValue('item', 'isclosed', l, 'T');
			}
			nlapiSubmitRecord(record);
			nlapiLogExecution('AUDIT', 'Record ' + result.getRecordType()  + ' ' + result.getId() + ' is closed.', '');
		} catch (e) {
			nlapiLogExecution('ERROR', 'Record ' + result.getRecordType()  + ' ' + result.getId() + ' cannot be closed', e.name + '\n' + e.message);
		}

	});
}
