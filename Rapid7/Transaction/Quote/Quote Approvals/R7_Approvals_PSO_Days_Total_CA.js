/*
 * @author efagone
 * 
 * MB: 1/21/15 - Removed search filter logic as it was causing the rule not to kick off when approvers/notifiers were set on the item record.  
 * Removal requested by Revenue Operations Team and VP of Services per Incident #2798
 */
function findPSODays(){

	var context = nlapiGetContext();
	
	if (context.getExecutionContext() == 'workflow') {
	
		var recQuote = nlapiGetNewRecord();
		var numberOfItems = recQuote.getLineItemCount('item');
		var allItemIds = [];
		
		for (var i = 1; numberOfItems != null && i <= numberOfItems; i++) {
		
			var itemId = recQuote.getLineItemValue('item', 'item', i);
			allItemIds[allItemIds.length] = itemId;
			
		}
		
		if (allItemIds == null || allItemIds.length < 1) {
			return 0;
		}
		
		var arrFilters = [];
		if (allItemIds.length == 1) {
			arrFilters[0] = new nlobjSearchFilter('internalid', null, 'anyof', allItemIds[0]);
		}
		else {
			arrFilters[0] = new nlobjSearchFilter('internalid', null, 'anyof', allItemIds);
		}
		arrFilters[1] = new nlobjSearchFilter('custitemr7categorybookingsfinancedept', null, 'is', '4');
		
		/* MB: 1/21/15 - Removed this logic as it was causing the rule not to kick off when approvers/notifiers were set on the item record.  
		 * Removal requested by Revenue Operations Team and VP of Services per Incident #2798
		 * 
		arrFilters[2] = new nlobjSearchFilter('formulanumeric', null, 'equalto', 1);
		arrFilters[2].setFormula('CASE WHEN ({custitemr7itemapprover} is null AND {custitemr7itemnotifiee} is null) THEN 1 ELSE 0 END');
		*/
		
		var arrColumns = [];
		arrColumns[0] = new nlobjSearchColumn('formulanumeric', null, 'sum');
		arrColumns[0].setFormula('FLOOR({custitemr7psototalduration})');
		
		var arrResults = nlapiSearchRecord('item', null, arrFilters, arrColumns);
		
		var totalQuoteDuration = arrResults[0].getValue(arrColumns[0]);
		var totalCost = totalQuoteDuration * 2000;
		
		return totalCost;
		
	}
}