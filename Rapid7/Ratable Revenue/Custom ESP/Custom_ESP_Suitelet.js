/*
 * @author efagone
 */

var arrProductTypes = grabAllProductTypes();
var objItemProps = new Object();

function custom_esp_suitelet(request, response){

	if (request.getMethod() == 'GET') {
	
		var tranId = request.getParameter('custparam_transaction');
		var tranType = getRecTypeId(request.getParameter('custparam_trantype'));
		
		if (tranId == null || tranId == '' || tranType == null || tranType == '') {
			throw nlapiCreateError('MISSING_PARAM', 'Request is missing a required parameter', true);
		}
		
		var recTran = nlapiLoadRecord(tranType, tranId);
		
		var form = nlapiCreateForm('Apply Custom ESP', true);
		form.setScript('customscript_r7custom_esp_suitelet_cs');
		form.addField('custpage_trantype', 'text').setDisplayType('hidden');
		form.getField('custpage_trantype').setDefaultValue(tranType);
		form.addField('custpage_transaction', 'select', 'Transaction', 'transaction').setDisplayType('inline');
		form.getField('custpage_transaction').setDefaultValue(tranId);
		
		//creating list objects
		var lineItemList = form.addSubList('custpage_lineitemlist', 'list', 'Custom ESP Lines');
		lineItemList.addField('custpage_lineitem_itemid', 'text').setDisplayType('hidden');
		lineItemList.addField('custpage_lineitem_lineid', 'text').setDisplayType('hidden');
		lineItemList.addField('custpage_lineitem_customesp', 'checkbox').setDisplayType('hidden');
		lineItemList.addField('custpage_lineitem_customespprorated', 'checkbox').setDisplayType('hidden');
		lineItemList.addField('custpage_lineitem_quantity', 'float').setDisplayType('hidden');
		lineItemList.addField('custpage_lineitem_itemtext', 'text', 'Item');
		lineItemList.addField('custpage_lineitem_linenumber', 'text', 'Line Number');
		lineItemList.addField('custpage_lineitem_description', 'textarea', 'Description');
		lineItemList.addField('custpage_lineitem_amountprorated', 'currency', 'Prorated Amount (Line)');
		lineItemList.addField('custpage_lineitem_amount', 'currency', 'Amount (Line)');
		lineItemList.addField('custpage_lineitem_bundletotal', 'currency', 'Bundle Total');
		lineItemList.addField('custpage_lineitem_customesppercent', 'percent', 'Percentage').setDisplayType('entry');
		lineItemList.addField('custpage_lineitem_customespamt', 'currency', 'Custom ESP').setDisplayType('entry');
		lineItemList.getField('custpage_lineitem_customespamt').setMandatory(true);
		
		var arrItems = getItemsFromOrder(recTran);
		var objGroupTotals = getGroupTotals(tranId);
		var objItemAmounts = getItemAmounts(tranId);
		
		var lineNum = 1;
		var hasLineLines = false;
		for (var i = 0, j = 1; arrItems != null && i < arrItems.length; i++, j++) {
			var listItem = arrItems[i];
			
			if (listItem['customESP'] != 'T'){
				continue;
			}
			hasLineLines = true;
			var description = listItem['description'];
			if (description != null && description.length > 60) {
				description = description.substr(0, 65000);
			}
			
			var groupTotalAmount = (objGroupTotals.hasOwnProperty(listItem['group'])) ? objGroupTotals[listItem['group']] : 0;
			var proratedAmount = (objItemAmounts.hasOwnProperty(listItem['line'])) ? objItemAmounts[listItem['line']] : 0;
			
			lineItemList.setLineItemValue('custpage_lineitem_itemid', lineNum, listItem['itemId']);
			lineItemList.setLineItemValue('custpage_lineitem_lineid', lineNum, listItem['lineId']);
			lineItemList.setLineItemValue('custpage_lineitem_linenumber', lineNum, listItem['lineNum']);
			lineItemList.setLineItemValue('custpage_lineitem_customesp', lineNum, listItem['customESP']);
			lineItemList.setLineItemValue('custpage_lineitem_itemtext', lineNum, listItem['itemText']);
			lineItemList.setLineItemValue('custpage_lineitem_description', lineNum, description);
			lineItemList.setLineItemValue('custpage_lineitem_amountprorated', lineNum, proratedAmount);
			lineItemList.setLineItemValue('custpage_lineitem_amount', lineNum, listItem['amount']);
			lineItemList.setLineItemValue('custpage_lineitem_quantity', lineNum, listItem['quantity']);
			lineItemList.setLineItemValue('custpage_lineitem_bundletotal', lineNum, groupTotalAmount);
			lineItemList.setLineItemValue('custpage_lineitem_customesppercent', lineNum, listItem['customDefaultPercent']);
			lineItemList.setLineItemValue('custpage_lineitem_customespprorated', lineNum, listItem['customESPProratedList']);
			lineItemList.setLineItemValue('custpage_lineitem_customespamt', lineNum, listItem['customESPAmount']);
			
			lineNum++;
		}
		
		if (!hasLineLines) {
			//response.writeLine("<html><body>Processing order. This could take a minute. Please hold...</body></html>");
			//return;
		}
		form.addSubmitButton('Submit');
		response.writePage(form);
	}
	
	if (request.getMethod() == 'POST') {
		var lineItemCount = request.getLineItemCount('custpage_lineitemlist');
		var tranId = request.getParameter('custpage_transaction');
		var tranType = request.getParameter('custpage_trantype');
		
		if (tranId != null && tranId != '' && tranType != null && tranType != '') {
			var objCustomESPs = new Object;
			
			var objCustomESPItems = new Object();
			for (var i = 1; i <= lineItemCount; i++) {
				var itemId = request.getLineItemValue('custpage_lineitemlist', 'custpage_lineitem_itemid', i);
				var isCustomESP = request.getLineItemValue('custpage_lineitemlist', 'custpage_lineitem_customesp', i);
				
				if (isCustomESP == 'T') {
					objCustomESPItems[itemId] = isCustomESP;
				}
			}
			
			for (var i = 1; i <= lineItemCount; i++) {
			
				var lineId = request.getLineItemValue('custpage_lineitemlist', 'custpage_lineitem_lineid', i);
				var customESP = request.getLineItemValue('custpage_lineitemlist', 'custpage_lineitem_customespamt', i);
				
				if (customESP != null && customESP != '') {
					objCustomESPs[lineId] = customESP;
				}
				
			}

			var success = makeChanges(tranType, tranId, objCustomESPs, objCustomESPItems);
			
			if (success == true) {
				response.writeLine("<html><body onload='win_close()'><script language='Javascript'>function win_close(){ window.opener.location.reload(); window.opener = top; window.close(); }</script></body></html>");
				return;
			} else {
				response.writeLine(success);
				return;
			}
			
		}
	}
	
	response.writeLine('Something went wrong. Please contact your Administrator.');
	return;
}

function makeChanges(tranType, tranId, objCustomESPs, objCustomESPItems){

	try {
	
		var recTran = nlapiLoadRecord(tranType, tranId);
		
		lineItemCount = recTran.getLineItemCount('item');
		
		for (var i = 1; i <= lineItemCount; i++) {
			var itemType = strLowerCase(recTran.getLineItemValue('item', 'itemtype', i));
			
			if (itemType != 'subtotal' && itemType != 'description' && itemType != 'group' && itemType != 'endgroup') {
				recTran.setLineItemValue('item', 'custcol_custom_esp', i, '');
			}
		}
		
		var allCustomESPSet = true;
		for (var i = 1; i <= lineItemCount; i++) {
		
			var lineId = recTran.getLineItemValue('item', 'id', i);
			
			if (objCustomESPs.hasOwnProperty(lineId)) {
			
				if (objCustomESPs[lineId] != null && objCustomESPs[lineId] != '') {
					recTran.setLineItemValue('item', 'custcol_custom_esp', i, objCustomESPs[lineId]);
				}
				else {
					allCustomESPSet = false;
				}
			}
		}
		
		if (allCustomESPSet) {
		
			//run e81
			recTran = setLocations(recTran);
			recTran = processE81(recTran);
			var success = checkPriceListVersionOK(recTran, objCustomESPItems);
			if (success != true) {
				return success;
			}
			nlapiSubmitRecord(recTran, false, true);

			//time for FFT	
			var recTranFFT = nlapiLoadRecord(tranType, tranId);
			recTranFFT = setLocations(recTranFFT);
			recTranFFT = processFFT(recTranFFT);
			nlapiSubmitRecord(recTranFFT, false, true);
		}
		else {
			nlapiSubmitRecord(recTran, false, true);
		}
		
		return true;
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
				}
				else { // in case we ever do get an array...
					for (var n = 0; n < st.length; n++) {
						if (st[n] !== 'undefined') {
							msg += '\n' + st[n];
						}
					}
				}
			}
		}
		else {
			msg = e.toString();
		}
		var adminUser =  nlapiLoadConfiguration('companypreferences').getFieldValue('custscriptr7_system_info_email_sender');
		nlapiSendEmail(adminUser, adminUser, 'Error on setting custom ESP', 'Transaction ID: ' + tranId + '\n\nError: ' + msg);
		nlapiLogExecution('ERROR', 'Error on setting custom ESP', 'Transaction ID: ' + tranId + '\n\nError: ' + msg);
		return msg;
	}
	
}

function checkPriceListVersionOK(recTran, objCustomESPItems){

	var arrItems = new Array();
	var objItemNames = new Object();
	
	var lineItemCount = recTran.getLineItemCount('item');
	
	for (var i = 1; i <= lineItemCount; i++) {
		var itemId = recTran.getLineItemValue('item', 'item', i);
		var itemName = recTran.getLineItemText('item', 'item', i);
		var itemType = strLowerCase(recTran.getLineItemValue('item', 'itemtype', i));

		objItemNames[itemId] = itemName;
		if (itemType != 'subtotal' && itemType != 'discount' && itemType != 'description' && itemType != 'group' && itemType != 'endgroup') {
			arrItems[arrItems.length] = itemId;
		}
	}
	
	if (arrItems == null || arrItems.length == 0) {
		return true;
	}
	
	var priceLineVersionId = recTran.getFieldValue('custbody_besp_price_list_v');
	if (priceLineVersionId == null || priceLineVersionId == '') {
		return 'ERROR: Could not determine price list version.';
	}
	
	var objLineMap = new Object();
	
	var arrFilters = new Array();
	arrFilters[arrFilters.length] = new nlobjSearchFilter('isinactive', null, 'is', 'F');
	arrFilters[arrFilters.length] = new nlobjSearchFilter('custrecord_e81_fld_3_besp_price_list_v', null, 'anyof', priceLineVersionId);
	arrFilters[arrFilters.length] = new nlobjSearchFilter('custrecord_e81_vsoe_esp_item', null, 'anyof', arrItems);
	
	var arrColumns = new Array();
	arrColumns[0] = new nlobjSearchColumn('internalid');
	arrColumns[1] = new nlobjSearchColumn('custrecord_e81_vsoe_esp_item');
	arrColumns[2] = new nlobjSearchColumn('custrecord_e81_vsoe_esp_price');
	
	var savedsearch = nlapiCreateSearch('customrecord_e81_vsoe_esp_prices', arrFilters, arrColumns);
	var resultSet = savedsearch.runSearch();
	
	resultSet.forEachResult(function(searchResult){
		objLineMap[searchResult.getValue(arrColumns[1])] = true;
		return true; // return true to keep iterating
	});
	
	var arrMissingIds = new Array();
	
	for (var i = 0; arrItems != null && i < arrItems.length; i++) {
		if (!objLineMap.hasOwnProperty(arrItems[i])) { //missing MAP
			if (!objCustomESPItems.hasOwnProperty(arrItems[i])) { //is Non-CustomESP line
				arrMissingIds[arrMissingIds.length] = arrItems[i];
			}
		}
	}
	
	if (arrMissingIds != null && arrMissingIds.length > 0) {
		var msg = '';
		msg += 'Could not calculate allocation amounts. The following items are missing a Multiple Allocation Price Map.';
		msg += '\n\n';
		msg += 'Price Book: ' + recTran.getFieldText('custbody_besp_price_list_v');
		msg += '\n\n';
		for (var i = 0; arrMissingIds != null && i < arrMissingIds.length; i++) {
			msg += objItemNames[arrMissingIds[i]] + '\n';
		}
		return msg;
	}
	return true;
}

function addCommas(nStr){
	nStr += '';
	x = nStr.split('.');
	x1 = x[0];
	x2 = x.length > 1 ? '.' + x[1] : '';
	var rgx = /(\d+)(\d{3})/;
	while (rgx.test(x1)) {
		x1 = x1.replace(rgx, '$1' + ',' + '$2');
	}
	return x1 + x2;
}

function getItemsFromOrder(recTran){

	if (recTran != null) {
		var lineItems = new Array();
		
		var objCustomESPItemMap = grabCustomESPItemMap();
		var lineItemCount = recTran.getLineItemCount('item');
		
		for (var i = 1; i <= lineItemCount; i++) {
			var lineItem = new Array();
			var itemId = recTran.getLineItemValue('item', 'item', i);
			var itemType = strLowerCase(recTran.getLineItemValue('item', 'itemtype', i));
			
			if (itemType != 'subtotal' && itemType != 'discount' && itemType != 'description' && itemType != 'group' && itemType != 'endgroup') {
			
				var acrId = getItemProperties(itemId, 'custitemr7itemacrproducttype');
				
				lineItem['lineNum'] = i;
				lineItem['itemId'] = recTran.getLineItemValue('item', 'item', i);
				lineItem['itemText'] = recTran.getLineItemText('item', 'item', i);
				lineItem['quantity'] = recTran.getLineItemValue('item', 'quantity', i);
				lineItem['customESP'] = (objCustomESPItemMap.hasOwnProperty(itemId)) ? 'T' : 'F';
				lineItem['customDefaultPercent'] = getItemProperties(itemId, 'custitemr7customespdefaultperc');
				lineItem['customESPProratedList'] = getItemProperties(itemId, 'custitemr7customespproratedlist');
				lineItem['amount'] = Math.round(recTran.getLineItemValue('item', 'amount', i) * recTran.getFieldValue('exchangerate') * 100) / 100;
				lineItem['customESPAmount'] = recTran.getLineItemValue('item', 'custcol_custom_esp', i);
				lineItem['lineId'] = recTran.getLineItemValue('item', 'id', i);
				lineItem['line'] = recTran.getLineItemValue('item', 'line', i);

				var grouping = recTran.getLineItemValue('item', 'line', i);
				if (acrId != null && acrId != '') {
					grouping = recTran.getLineItemValue('item', arrProductTypes[acrId]['optionid'], i) || recTran.getLineItemValue('item', 'line', i);
				}

				lineItem['group'] = grouping;
				lineItem['description'] = recTran.getLineItemValue('item', 'description', i);
				lineItems[lineItems.length] = lineItem;
			}
		}
		
		return lineItems;
	}
	return null;
}

function getGroupTotals(tranId){

	var objGroupTotals = new Object();
	
	var arrFilters = new Array();
	arrFilters[0] = new nlobjSearchFilter('internalid', null, 'is', tranId);
	arrFilters[1] = new nlobjSearchFilter('mainline', null, 'is', 'F');
	arrFilters[2] = new nlobjSearchFilter('custitemr7itemrenewalsku', 'item', 'noneof', '@NONE@');
	arrFilters[2].setLeftParens(2);
	arrFilters[3] = new nlobjSearchFilter('custitem_item_category', 'item', 'anyof', [1, 2, 3, 4]);
	arrFilters[3].setRightParens(1);
	arrFilters[3].setOr(true);
	arrFilters[4] = new nlobjSearchFilter('custitem_item_category', 'item', 'anyof', [5, 6, 7, 8, 9, 10, 11]);
	arrFilters[4].setRightParens(1);
	
	var arrColumns = new Array();
	arrColumns[0] = new nlobjSearchColumn('internalid', null, 'max');
	arrColumns[1] = new nlobjSearchColumn('formulatext', null, 'group');
	arrColumns[1].setFormula("NVL(DECODE({custcolr7psoengagement}, null, COALESCE({custcolr7itemmsproductkey}, {custcolr7managedserviceid}, {custcolr7registrationid}), {custcolr7psoengagement.id}), {line})");
	arrColumns[2] = new nlobjSearchColumn('grossamount', null, 'sum');
	
	var objSearch = nlapiCreateSearch('transaction');
	objSearch.setFilters(arrFilters);
	objSearch.setColumns(arrColumns);
	var resultSet = objSearch.runSearch();
	
	var rowNum = 0;
	do {
		var resultSlice = resultSet.getResults(rowNum, rowNum + 1000);
		for (var rs in resultSlice) {
		
			var currentGroup = resultSlice[rs].getValue(arrColumns[1]);
			var currentAmount = resultSlice[rs].getValue(arrColumns[2]);
			
			objGroupTotals[currentGroup] = currentAmount;

			rowNum++;
		}
	}
	while (resultSlice.length >= 1000);
	
	return objGroupTotals;
}

function getItemAmounts(tranId){

	var objItemAmounts = new Object();
	
	var arrFilters = new Array();
	arrFilters[0] = new nlobjSearchFilter('internalid', null, 'is', tranId);
	arrFilters[1] = new nlobjSearchFilter('mainline', null, 'is', 'F');
	
	var arrColumns = new Array();
	arrColumns[0] = new nlobjSearchColumn('internalid');
	arrColumns[1] = new nlobjSearchColumn('line');
	arrColumns[2] = new nlobjSearchColumn('amount');
	
	var objSearch = nlapiCreateSearch('transaction');
	objSearch.setFilters(arrFilters);
	objSearch.setColumns(arrColumns);
	var resultSet = objSearch.runSearch();
	
	var rowNum = 0;
	do {
		var resultSlice = resultSet.getResults(rowNum, rowNum + 1000);
		for (var rs in resultSlice) {
		
			var currentLine = resultSlice[rs].getValue(arrColumns[1]);
			var currentAmount = resultSlice[rs].getValue(arrColumns[2]);
			
			objItemAmounts[currentLine] = currentAmount;

			rowNum++;
		}
	}
	while (resultSlice.length >= 1000);
	
	return objItemAmounts;
}

function grabCustomESPItemMap(){

	var objCustomESPItemMap = new Object();
	
	var arrFilters = new Array();
	arrFilters[0] = new nlobjSearchFilter('custitem_custom_esp', null, 'is', 'T');

	var arrColumns = new Array();
	arrColumns[0] = new nlobjSearchColumn('internalid').setSort(true);
	
	var objSearch = nlapiCreateSearch('item');
	objSearch.setFilters(arrFilters);
	objSearch.setColumns(arrColumns);
	var resultSet = objSearch.runSearch();
	
	var rowNum = 0;
	do {
		var resultSlice = resultSet.getResults(rowNum, rowNum + 1000);
		for (var rs in resultSlice) {
			var itemId = resultSlice[rs].getValue(arrColumns[0]);
			if (itemId == null || itemId == ''){
				continue;
			}
			objCustomESPItemMap[itemId] = true; // add to map
			rowNum++;
		}
	}
	while (resultSlice.length >= 1000);
	
	return objCustomESPItemMap;
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
