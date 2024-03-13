/*
 * @author efagone
 */

function findNumberOfYears(){

	var recQuote = nlapiGetNewRecord();
	
	var maxLineMonths = getTotalMonths(recQuote);
	nlapiLogExecution('DEBUG', 'maxLineMonths', maxLineMonths);
	
	var headerMonths = datedifferencemonths(recQuote.getFieldValue('startdate'), recQuote.getFieldValue('enddate'));
	nlapiLogExecution('DEBUG', 'headerMonths', headerMonths);
	
	var maxMonths = Math.max(maxLineMonths, headerMonths);
	maxMonths = Math.round(maxMonths * 100) / 100;
	nlapiLogExecution('DEBUG', 'maxMonths', maxMonths);
	
	return maxMonths;
}

function getTotalMonths(recQuote){

	var minStart = '';
	var maxEnd = '';
	
	var lineCount = recQuote.getLineItemCount('item');
	
	for (var i = 1; i <= lineCount; i++) {
	
		var itemId = recQuote.getLineItemValue('item', 'item', i);
		if (itemId == null || itemId == '') {
			continue;
		}
		
		var itemType = recQuote.getLineItemValue('item', 'itemtype', i);
		
		if (itemType != 'Subtotal' && itemType != 'Discount' && itemType != 'Description') {
		
			var startDate = recQuote.getLineItemValue('item', 'custcolr7startdate', i) || recQuote.getLineItemValue('item', 'revrecstartdate', i);
			var endDate = recQuote.getLineItemValue('item', 'custcolr7enddate', i) || recQuote.getLineItemValue('item', 'revrecenddate', i);
			
			if (startDate == null || startDate == '' || endDate == null || endDate == '') {
				continue;
			}
			if (minStart == null || minStart == '' || nlapiStringToDate(startDate) < nlapiStringToDate(minStart)) {
				minStart = startDate;
			}
			if (maxEnd == null || maxEnd == '' || nlapiStringToDate(endDate) > nlapiStringToDate(maxEnd)) {
				maxEnd = endDate;
			}
		}
		
	}
	
	return datedifferencemonths(minStart, maxEnd);
}

function convertToMonths(quantity, unitType){
	// unit = 1
	// month = 2
	// year = 3
	// days = 5
	// 15-day = 6
	
	var unitValue = 0;
	var months = 0;
	
	switch (unitType) {
		case '1':
			unitValue = 0;
			break;
		case '2':
			unitValue = 1;
			break;
		case '3':
			unitValue = 12;
			break;
		case '5':
			unitValue = 12/365;
			break;
		case '6':
			unitValue = .5;
			break;
	}
	
	months = quantity * unitValue;
	return months;
}

function datedifferencemonths(strDate1, strDate2){
	
	if (strDate1 == null || strDate1 == '' || strDate2 == null || strDate2 == ''){
		return 0;
	}
	date1 = nlapiStringToDate(strDate1, 'date');
	date2 = nlapiStringToDate(strDate2, 'date');
	
	var months1 = date1.getMonth() + (date1.getFullYear() * 12);
	var months2 = date2.getMonth() + (date2.getFullYear() * 12);
	
	return Math.abs(months1 - months2);
}