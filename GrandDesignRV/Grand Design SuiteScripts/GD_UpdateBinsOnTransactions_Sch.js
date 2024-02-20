/**
 * Scheduled script that sets the GD Bin column to the Parts and Service Preferred Bin.
 * 
 * Version    Date            Author           Remarks
 * 1.00       12 Dec 2017     Jacob Shetler
 *
 */

/**
 * Script entry point
 * 
 * @param {String} type Context Types: scheduled, ondemand, userinterface, aborted, skipped
 * @returns {Void}
 */
function GD_SetBinOnTransactions_Sch(type)
{
	//Get all of the transactions to update.
	var tranCols = [new nlobjSearchColumn('type'), 
	                new nlobjSearchColumn('item'),
	                new nlobjSearchColumn('trandate').setSort(true),
	                new nlobjSearchColumn('custitemgd_pspreferredbin','item')];
	var tranFilters = '';
	tranFilters = [
			   ['type','anyof','ItemRcpt','PurchOrd','SalesOrd','TrnfrOrd','Estimate'], 
			   'AND', 
			   ['status','noneof','PurchOrd:H','PurchOrd:G','PurchOrd:C','SalesOrd:G','SalesOrd:C','SalesOrd:H','TrnfrOrd:H','TrnfrOrd:G','TrnfrOrd:C','Estimate:C','Estimate:X','Estimate:B','Estimate:V'], 
			   'AND', 
			   ['custcolgd_partsbin','anyof','@NONE@'], 
			   'AND', 
			   ['item.custitemgd_pspreferredbin','noneof','@NONE@'],
			   'AND', 
			   ['accountingperiod.closed','is','F'], 
			   'AND', 
			   ['location','anyof', nlapiGetContext().getSetting('SCRIPT', 'custscriptpartsandwarrantylocation')]
			];
	var transactionsToUpdate = nlapiSearchRecord('transaction', null, tranFilters, tranCols);
	while(transactionsToUpdate != null)
	{
		//Set each bin on the transaction and save it.
		for(var i = 0; i < transactionsToUpdate.length; i++)
		{
			var curResult = transactionsToUpdate[i];
			try {
				var tranRec = nlapiLoadRecord(curResult.getRecordType(), curResult.getId());
				for(var j = 1; j <= tranRec.getLineItemCount('item'); j++)
				{
					if(tranRec.getLineItemValue('item', 'item', j) == curResult.getValue('item'))
					{
						tranRec.setLineItemValue('item', 'custcolgd_partsbin', j, curResult.getValue('custitemgd_pspreferredbin','item'));
					}
				}
				nlapiSubmitRecord(tranRec, false, true);
			}
			catch(err) {
				nlapiLogExecution('debug', err, JSON.stringify(curResult));
			}
			
			//Set % complete, yield if necessary
			nlapiGetContext().setPercentComplete(((i+1)/transactionsToUpdate.length)*100);
			if(nlapiGetContext().getRemainingUsage() < 100) nlapiYieldScript();
		}
		
		transactionsToUpdate = nlapiSearchRecord('transaction', null, tranFilters, tranCols);
	}
}
