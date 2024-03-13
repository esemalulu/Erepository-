/*
 * @author efagone
 */

function procssFulfillmentsSalesOrder(orderId){

	try {
		process_ItemFulfillments(orderId);
	} 
	catch (e) {
		var adminUser =  nlapiLoadConfiguration('companypreferences').getFieldValue('custscriptr7_system_info_email_sender');
		nlapiSendEmail(adminUser, adminUser, 'ERROR PROCESS ACL FULFILLMENTS', 'Order ID: ' + orderId + '\nError: ' + e.name + ' : ' + e.message);
		if (e.getCode() == 'RCRD_HAS_BEEN_CHANGED ') {

		}
	}
}

function getLinesToFulFill(orderId){

	var objKitItemInventoryMap = getKitPackageTypes();
	var objAllLines = new Object();
	
	if (orderId == null || orderId == '') {
		return objAllLines;
	}
	
	var arrFilters = new Array();
	arrFilters[arrFilters.length] = new nlobjSearchFilter('internalid', null, 'is', orderId);
	arrFilters[arrFilters.length] = new nlobjSearchFilter('shiprecvstatusline', null, 'is', 'F');
	arrFilters[arrFilters.length] = new nlobjSearchFilter('custcolr7translicenseid', null, 'isnotempty'); // removed on 2/11/15 as this was causing to not fulfil PSO and events. R7 wants to fulfil everything excpet hardware.
	arrFilters[arrFilters.length - 1].setLeftParens(2);
	arrFilters[arrFilters.length] = new nlobjSearchFilter('custcolr7translicenseid', null, 'isnot', 'XXX');
	arrFilters[arrFilters.length - 1].setRightParens(1);
	arrFilters[arrFilters.length - 1].setOr(true);
	arrFilters[arrFilters.length] = new nlobjSearchFilter('custcolr7eventmaster', null, 'noneof', '@NONE@');
	arrFilters[arrFilters.length - 1].setOr(true);
	arrFilters[arrFilters.length] = new nlobjSearchFilter('custcolr7psoengagement', null, 'noneof', '@NONE@');
	arrFilters[arrFilters.length - 1].setRightParens(1);
	arrFilters[arrFilters.length] = new nlobjSearchFilter('isfulfillable', 'item', 'is', 'T');
	arrFilters[arrFilters.length] = new nlobjSearchFilter('type', 'item', 'noneof', 'InvtPart');  //added on 11/4 per Jon C 
	//arrFilters[arrFilters.length] = new nlobjSearchFilter('vsoedelivered', 'item', 'is', 'T');  //Removed on 8/29/14 per DZ due to ratable changing what gets marked delivered
	
	var arrColumns = new Array();
	arrColumns[0] = new nlobjSearchColumn('internalid');
	arrColumns[1] = new nlobjSearchColumn('line');
	arrColumns[2] = new nlobjSearchColumn('custcolr7translicenseid');
	arrColumns[3] = new nlobjSearchColumn('type', 'item');
	arrColumns[4] = new nlobjSearchColumn('internalid', 'item');
	
	var savedsearch = nlapiCreateSearch('transaction', arrFilters, arrColumns);
	var resultSet = savedsearch.runSearch();
	
	resultSet.forEachResult(function(searchResult){
		var objLine = new Object();
		objLine.id = searchResult.getValue(arrColumns[1]);
		objLine.licenseId = searchResult.getValue(arrColumns[2]);
		objLine.itemtype = searchResult.getValue(arrColumns[3]);
		objLine.itemid = searchResult.getValue(arrColumns[4]);
		
		if (objLine.itemtype == 'Kit' && (!objKitItemInventoryMap.hasOwnProperty(objLine.itemid) || objKitItemInventoryMap[objLine.itemid])) {
			//Kit has Inventory component, move on
			return true;
		}
		
		objAllLines[objLine.id] = objLine; // process the search result
		return true; // return true to keep iterating
	});
	
	return objAllLines;
}

function getKitPackageTypes(){

	var objKitMap = {};
	
	var arrFilters = new Array();
	arrFilters[arrFilters.length] = new nlobjSearchFilter('type', null, 'anyof', 'Kit');
	
	var arrColumns = new Array();
	arrColumns[0] = new nlobjSearchColumn('internalid', null, 'group');
	arrColumns[1] = new nlobjSearchColumn('formulanumeric', null, 'max');
	arrColumns[1].setFormula("DECODE({memberitem.type.id}, 'InvtPart', 1, 0)");
	
	var savedsearch = nlapiCreateSearch('item', arrFilters, arrColumns);
	var resultSet = savedsearch.runSearch();
	
	resultSet.forEachResult(function(searchResult){
		//true if kit has a component that is of type InvtPart
		objKitMap[searchResult.getValue(arrColumns[0])] = (searchResult.getValue(arrColumns[1]) == 1 || searchResult.getValue(arrColumns[1]) == '1') ? true : false;
		return true; // return true to keep iterating
	});
	
	return objKitMap;
	
}

function process_ItemFulfillments(orderId){

	var objLinesToFulfill = getLinesToFulFill(orderId);
	
	if (Object.keys(objLinesToFulfill).length <= 0) {
		return;
	}

	// Transform to Fulfillment record using objItemFF vals
	var recItemFulfillment = nlapiTransformRecord('salesorder', orderId, 'itemfulfillment', {'nsi' : 174});
	recItemFulfillment.setFieldValue('shipcarrier', 'nonups'); //More
	recItemFulfillment.setFieldValue('shipmethod', 174); //download
	recItemFulfillment.setFieldValue('memo', 'Fulfilled By System');
	recItemFulfillment.setFieldValue('generateintegratedshipperlabel', 'F');
	 
	
	var lineCount = recItemFulfillment.getLineItemCount('item');
	
	for (var i = 1; lineCount > 0 && i <= lineCount; i++) {
	
		var orderLine = recItemFulfillment.getLineItemValue('item', 'orderline', i);
		
		if (objLinesToFulfill.hasOwnProperty(orderLine)) {
			recItemFulfillment.setLineItemValue('item', 'itemreceive', i, 'T');
		}
		else {
			recItemFulfillment.setLineItemValue('item', 'itemreceive', i, 'F');
		}
	}
	
	nlapiSubmitRecord(recItemFulfillment);
	
	return;
}
