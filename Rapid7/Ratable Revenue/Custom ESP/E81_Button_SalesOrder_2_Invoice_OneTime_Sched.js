/*
 * @author efagone
 */

function r7_ratable_sotoinv_sched(){

	var timeLimitInMinutes = 20;
	this.timeLimitInMilliseconds = timeLimitInMinutes * 60 * 1000;
	this.startingTime = new Date().getTime();
	this.context = nlapiGetContext();
	this.rescheduleScript = false;
	
	nlapiGetContext().setSessionObject('r7noavatax', 'T');
	
	var searchRecord = 'transaction';
	var objPrevFails = grabPrevFails();
	
	var searchId = 17548;
	
	if (searchId == null || searchId == ''){
		return;
	}
	nlapiLogExecution('DEBUG', 'running full script against search', searchId);
	
	var arrSearchResults = nlapiSearchRecord(searchRecord, searchId);
	
	for (var i = 0; arrSearchResults != null && i < arrSearchResults.length && unitsLeft() && timeLeft(); i++) {
	
		var columns = arrSearchResults[i].getAllColumns();
		var invoiceId = arrSearchResults[i].getValue(columns[0]);
		var salesOrderId = arrSearchResults[i].getValue(columns[1]);
		var recType = getRecTypeId(arrSearchResults[i].getValue(columns[6]));
		
		try {
			if (objPrevFails.hasOwnProperty(salesOrderId)) {
				nlapiLogExecution('DEBUG', 'skipping, previous error found in customrecordr7ratabletransactionerrorlog', salesOrderId);
				continue;
			}
			pushDataFromOrderToInvoice(salesOrderId, invoiceId, recType);
		} 
		catch (e) {
			var msg = '';

			if (e instanceof nlobjError) {
				msg = 'Code: ' + e.getCode() + ' \nDetails: ' + e.getDetails() + '\nStackTrace: \n';
				var st = e.getStackTrace();
				// nlobjError.getStackTrace() is documented as returning an array, but actually (sometimes?) returns a single string...
				if ((typeof st !== 'undefined') && (st !== null)) {
					if (typeof st === 'string') {
						msg += '\n' + st;
					} else { // in case we ever do get an array...
						for (var n = 0; n < st.length; n++) {
							if (st[n] !== 'undefined') {
								msg += '\n' + st[n];
							}
						}
					}
				}
			} else {
				msg = e.toString();
			}
			
			nlapiLogExecution('ERROR', 'Could not update transaction id: ' + salesOrderId, msg);
			var recError = null;
			if (objPrevFails.hasOwnProperty(salesOrderId)) {
				recError = nlapiLoadRecord('customrecordr7ratabletransactionerrorlog', objPrevFails[salesOrderId]);
			}
			else {
				recError = nlapiCreateRecord('customrecordr7ratabletransactionerrorlog');
			}
			recError.setFieldValue('custrecordr7ratabletranerrortran', salesOrderId);
			recError.setFieldValue('custrecordr7ratabletranerrorerror', msg);
			nlapiSubmitRecord(recError);
			continue;
		}
	}
	
	if (i >= 999) {
		rescheduleScript = true;
	}
	
	if (rescheduleScript) {
		nlapiLogExecution('DEBUG', 'Rescheduling script (script/deploy id)', context.getScriptId() + ' : ' + context.getDeploymentId());
		var status = nlapiScheduleScript(context.getScriptId(), context.getDeploymentId());
		nlapiLogExecution('DEBUG', 'Schedule Status', status);
	}
	
}


function pushDataFromOrderToInvoice(salesOrderId, invoiceId, recType){

	if (isBlank(salesOrderId)) {
		return;
	}
	
	var arrLineFieldsToPush = new Array();
	arrLineFieldsToPush.push('revrecstartdate');
	arrLineFieldsToPush.push('revrecenddate');
	arrLineFieldsToPush.push('vsoeallocation');
	
	arrLineFieldsToPush.push('revrecschedule');
	arrLineFieldsToPush.push('vsoesopgroup');
	arrLineFieldsToPush.push('vsoeisestimate');
	arrLineFieldsToPush.push('vsoedelivered');
	arrLineFieldsToPush.push('vsoeprice');
	
	var arrFieldsToPush = new Array();
	arrFieldsToPush.push('custbody_besp_price_list_v');
	arrFieldsToPush.push('tranisvsoebundle');
	arrFieldsToPush.push('custbodyr7ratablerevenuerestatementsta');
	arrFieldsToPush.push('custbodyr7ratabledateprocessed');
	
	var recSalesOrder = null;
	var recInvoice = null;
		
	if (recType == 'creditmemo') {
		recSalesOrder = nlapiLoadRecord('invoice', salesOrderId);
		recInvoice = nlapiLoadRecord('creditmemo', invoiceId);
	}
	else {
		recSalesOrder = nlapiLoadRecord('salesorder', salesOrderId);
		recInvoice = nlapiLoadRecord('invoice', invoiceId);
	}

	recSalesOrder = setLocations(recSalesOrder);
	var orderLineCount = recSalesOrder.getLineItemCount('item');
	
	var invLineCount = recSalesOrder.getLineItemCount('item');
	for (var i = 1; i <= orderLineCount; i++) {
		var c_line = recSalesOrder.getLineItemValue('item', 'line', i);
		
		for (var k = 1; k <= invLineCount; k++) {
		
			var orderDoc = recInvoice.getLineItemValue('item', 'orderdoc', k);
			var orderLine = recInvoice.getLineItemValue('item', 'orderline', k);
			
			if (orderDoc != salesOrderId || isBlank(orderLine)) {
				continue;
			}
			
			if (orderLine == c_line) {
			
				for (var j = 0; arrLineFieldsToPush != null && j < arrLineFieldsToPush.length; j++) {
					recInvoice.setLineItemValue('item', arrLineFieldsToPush[j], k, recSalesOrder.getLineItemValue('item', arrLineFieldsToPush[j], i));
				}
				break;
			}
		}
	}
	
	for (var j = 0; arrFieldsToPush != null && j < arrFieldsToPush.length; j++) {
		recInvoice.setFieldValue(arrLineFieldsToPush[j], recSalesOrder.getFieldValue(arrLineFieldsToPush[j]));
	}
	
	recInvoice.setFieldValue('custbodyr7sotoinv', 'T');
	recInvoice = setLocations(recInvoice);
	nlapiSubmitRecord(recInvoice, true, true);
	return;
}

function getRecTypeId(recType){

	switch (recType) {
		case 'CustInvc':
			recType = 'invoice';
			break;
		case 'Invoice':
			recType = 'invoice';
			break;
		case 'CashSale':
			recType = 'cashsale';
			break;
		case 'Cash Sale':
			recType = 'cashsale';
			break;
		case 'SalesOrd':
			recType = 'salesorder';
			break;
		case 'Sales Order':
			recType = 'salesorder';
			break;
		case 'CustCred':
			recType = 'creditmemo';
			break;
		case 'Credit Memo':
			recType = 'creditmemo';
			break;
		case 'CashRfnd':
			recType = 'cashrefund';
			break;
		case 'Cash Refund':
			recType = 'cashrefund';
			break;
	}
	
	return recType;
}

function grabPrevFails(){

	var objPrevFails = new Object();
	
	var arrFilters = new Array();
	arrFilters[0] = new nlobjSearchFilter('isinactive', null, 'is', 'F');
	
	var arrColumns = new Array();
	arrColumns[0] = new nlobjSearchColumn('internalid');
	arrColumns[1] = new nlobjSearchColumn('custrecordr7ratabletranerrortran');
	
	var newSearch = nlapiCreateSearch('customrecordr7ratabletransactionerrorlog');
	newSearch.setFilters(arrFilters);
	newSearch.setColumns(arrColumns);
	var resultSet = newSearch.runSearch();
	
	var rowNum = 0;
	do {
		var resultSlice = resultSet.getResults(rowNum, rowNum + 1000);
		for (var rs in resultSlice) {
			var errorId = resultSlice[rs].getValue(arrColumns[0]);
			var tranId = resultSlice[rs].getValue(arrColumns[1]);
			objPrevFails[tranId] = errorId; // add to map
			rowNum++;
		}
	}
	while (resultSlice.length >= 1000);
	
	return objPrevFails;
}

function setLocations(record){

	var headerLocation = record.getFieldValue('location');
	
	if (headerLocation != null && headerLocation != '') {
	
		for (var i = 1; i <= record.getLineItemCount('item'); i++) {
			record.setLineItemValue('item', 'location', i, headerLocation);
		}
	}
	
	return record;
}

function isBlank(val){
	return (val == null || val == '') ? true : false;
}

function timeLeft(){
	var presentTime = new Date().getTime();
	if (presentTime - startingTime > timeLimitInMilliseconds) {
		nlapiLogExecution('DEBUG', 'Ran out of time', 'yup');
		rescheduleScript = true;
		return false;
	}
	return true;
}

function unitsLeft(){
	var unitsLeft = context.getRemainingUsage();
	if (unitsLeft <= 250) {
		nlapiLogExecution('DEBUG', 'Ran out of units', 'yup');
		rescheduleScript = true;
		return false;
	}
	return true;
}