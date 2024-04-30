/**
 * Module Description
 *
 * Version    Date            Author           Remarks
 * 1.00       27 Mar 2017     dhoferica	       Scheduled script that creates NOI Transactions on NOI Pool
 * 1.10       02 Oct 2018     dlapp            Added audit log to confirm NOI Transaction is being created successfully
 * 1.50	      10 May 2019     jostap    	   Added support for credit memos
 * 1.60		  03 Oct 2019     jostap           Improved error handling to not throw errors in try/catch
 * 1.70       24 Jan 2020	  cmargallo		   TI 286 - New Field on NOI Transaction Records      
 */

/**
 * @param {String} type Context Types: scheduled, ondemand, userinterface, aborted, skipped
 * @returns {Void}
 */
function scheduled_UpdateNOIPoolTransactions(type) {

    var stLoggerTitle = 'scheduled_UpdateNOIPoolTransactions;'
    nlapiLogExecution('debug', stLoggerTitle, '=================== Entry Script ===================');


	nlapiLogExecution('debug', stLoggerTitle, nlapiGetContext().getSetting('SCRIPT', 'custscript_ifd_data_to_update'));

	stDataToUpdate = nlapiGetContext().getSetting('SCRIPT', 'custscript_ifd_data_to_update');
	//Throw error if a script parameter is empty
	if (NSUtil.isEmpty(stDataToUpdate))
	    throw nlapiCreateError('99999', 'Missing script parameter: Data to Update');

	if (!NSUtil.isEmpty(stDataToUpdate)) {
	    var arrRawData = stDataToUpdate.split('|');
	    if (!NSUtil.isEmpty(arrRawData)) {
		for (var x = 0; x < arrRawData.length; x++) {
		    var arrIdAndData = arrRawData[x].split('@');
		    if (!NSUtil.isEmpty(arrIdAndData)) {
			var stInvoiceId = arrIdAndData[0];
			var stItemId = arrIdAndData[1];
			var stData = arrIdAndData[2];
			// ADDED CMARGALLO TI 286 ADDED START
			var flItemQty = arrIdAndData[3];
			// ADDED CMARGALLO TI 286 ADDED END

			nlapiLogExecution('debug', stLoggerTitle, 'Inv ID: ' + stInvoiceId);
			nlapiLogExecution('debug', stLoggerTitle, 'Item ID: ' + stItemId);
			nlapiLogExecution('debug', stLoggerTitle, 'Data: ' + stData);

			var arrUpdatePool = stData.split(',');
			for (var y = 0; y < arrUpdatePool.length; y++) {
			    var arrNoiIdAndAmountRaw = arrUpdatePool[y].split('/');
			    var arrNoiIdAndAmount = arrNoiIdAndAmountRaw[0].split('-');
			    var stNoiId = arrNoiIdAndAmount[0];
			    var stAmount = arrNoiIdAndAmount[1];

			    //Added by rollback script to indicate a negative value v1.50
			    stAmount = stAmount.split('()');
			    if(stAmount.length > 1){
			    	stAmount = stAmount[0] * -1;
				}else{
			    	stAmount = stAmount[0];
				}

			    nlapiLogExecution('debug', stLoggerTitle, 'NOI ID: ' + stNoiId);
			    nlapiLogExecution('debug', stLoggerTitle, 'Amount: ' + stAmount);

			    //v1.6
			    try{
					var recNoiTransaction = nlapiCreateRecord('customrecord_noi_transaction');
					recNoiTransaction.setFieldValue('custrecord_invoice_num', stInvoiceId);
					recNoiTransaction.setFieldValue('custrecord_noi_bedget', stNoiId);
					recNoiTransaction.setFieldValue('custrecord_item_inv', stItemId);
					recNoiTransaction.setFieldValue('custrecord_pool_amount_used', stAmount);
					// ADDED CMARGALLO TI 286 ADDED START
					recNoiTransaction.setFieldValue('custrecord_noi_trans_item_qty', flItemQty);
					// ADDED CMARGALLO TI 286 ADDED END
					var stNoiTransactionId = nlapiSubmitRecord(recNoiTransaction); // v1.10
					nlapiLogExecution('audit', stLoggerTitle, 'New NOI Transaction Created: ' + stNoiTransactionId); // v1.10
				}catch(error){
			    	errorHandling(error);
				}
			}
		    }
		}
	    }
	}

}

//v1.6
function errorHandling(error){
	if (error.getDetails != undefined) {
		nlapiLogExecution('ERROR', 'Process Error', error.getCode() + ': ' + error.getDetails());
	} else {
		nlapiLogExecution('ERROR', 'Unexpected Error', error.toString());
	}
}

var NSUtil = {

    /**
     *
     * Version 1:
     *
     * @author memeremilla Details: Initial version
     *
     * Version 2:
     * @author bfeliciano Details: Revised shorthand version.
     *
     * @param {String}
     *            stValue - string or object to evaluate
     * @returns {Boolean} - true if empty/null/undefined, false if not
     *
     */
    isEmpty : function(stValue) {
	return ((stValue === '' || stValue == null || stValue == undefined) || (stValue.constructor === Array && stValue.length == 0) || (stValue.constructor === Object && (function(v) {
	    for ( var k in v)
		return false;
	    return true;
	})(stValue)));
    }
}