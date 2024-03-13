/*
 * @author efagone
 */

var objItemMap = getItemMap();
var objCategoryPurchasedMap = grabCategoryPurchasedDetailMap();

function r7_category_purch_migration_scheduled(){

	//just touching them
	var timeLimitInMinutes = 20;
	this.timeLimitInMilliseconds = timeLimitInMinutes * 60 * 1000;
	this.startingTime = new Date().getTime();
	this.context = nlapiGetContext();
	this.rescheduleScript = false;
	
	var searchId = context.getSetting('SCRIPT', 'custscriptr7catpurchcleanupsrchid');
	var strPrevFails = context.getSetting('SCRIPT', 'custscriptr7catpurchprevfails');
	
	nlapiLogExecution('DEBUG', 'strPrevFails', strPrevFails);
	
	var arrPrevFails = [];
	if (strPrevFails != null && strPrevFails != '') {
		arrPrevFails = strPrevFails.split(',');
	}
	
	var arrResults = nlapiSearchRecord('transaction', searchId);
	
	for (var i = 0; arrResults != null && i < arrResults.length && timeLeft() && unitsLeft(); i++) {
	
		var columns = arrResults[i].getAllColumns();
		var tranType = getRecTypeId(arrResults[i].getValue(columns[0]));
		var tranId = arrResults[i].getValue(columns[1]);
		var firstColumn = columns[0].getName();
		var secondColumn = columns[1].getName();
		
		if (firstColumn != 'type' || secondColumn != 'internalid') {
			nlapiSendEmail(55011, 55011, 'Attempting to update category purchased without properly formatted search', '1st Column: ' + firstColumn + '\nShould be: "type"' + '\n2nd Column: ' + secondColumn + '\nShould be: "internalid"');
			break;
		}
		
		try {
		
			if (arrPrevFails.indexOf(tranId) >= 0) {
				continue;
			}
			
			nlapiLogExecution('AUDIT', 'Processing Transaction', tranId);
			
			var recTransaction = nlapiLoadRecord(tranType, tranId);
var beforeVSOE = getVSOE(recTransaction);
nlapiLogExecution('Debug', 'getVSOE', 'Before Update = ' + beforeVSOE);
			recTransaction = setLocations(recTransaction);
			recTransaction.setFieldValue('custbodyr7tempcatpurchv2procflag', 'T');
var afterVSOE = getVSOE(recTransaction);
nlapiLogExecution('Debug', 'getVSOE', 'After Update = ' + afterVSOE);
			nlapiSubmitRecord(recTransaction, true, true);
			
		} 
		catch (e) {
			arrPrevFails.push(tranId);
			nlapiLogExecution('ERROR', 'Could not update tran id: ' + tranId, e);
			continue;
		}
	}
	
	if (rescheduleScript) {
		nlapiLogExecution('DEBUG', 'Rescheduling script (script/deploy id)', context.getScriptId());
		var params = [];
		params['custscriptr7catpurchprevfails'] = arrPrevFails.join(',');
		var status = nlapiScheduleScript(context.getScriptId(), context.getDeploymentId(), params);
		nlapiLogExecution('DEBUG', 'Schedule Status', status);
	}
	
}

function setLocations(record){

	var headerLocation = record.getFieldValue('location');
	
	if (headerLocation != null && headerLocation != '') {
		for (var i = 1; i <= record.getLineItemCount('item'); i++) {
			
			var lineLocation = record.getLineItemValue('item', 'location', i);
			
			if (lineLocation != null && lineLocation != ''){
				continue;
			}
			
			var itemType = strLowerCase(record.getLineItemValue('item', 'itemtype', i));
			
			if (itemType == 'group' || itemType == 'endgroup') {
				continue;
			}

			record.setLineItemValue('item', 'location', i, headerLocation);
		}
	}
	
	return record;
}

function getRecTypeId(recType){

	switch (recType) {
		case 'Opprtnty':
			recType = 'opportunity';
			break;
		case 'Opportunity':
			recType = 'opportunity';
			break;
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

function getItemMap(){

	var item_map = {};

	var arrColumns = [];
	arrColumns[0] = new nlobjSearchColumn('internalid');
	arrColumns[1] = new nlobjSearchColumn('custitemr7categorypurchaseditem');

	var newSearch = nlapiCreateSearch('item');
	newSearch.setColumns(arrColumns);
	var resultSet = newSearch.runSearch();

	var rowNum = 0;
	do {
		var resultSlice = resultSet.getResults(rowNum, rowNum + 1000);
		for (var rs in resultSlice) {
			item_map[resultSlice[rs].getValue('internalid')] = {
				id: resultSlice[rs].getValue('internalid'),
				custitemr7categorypurchaseditem: resultSlice[rs].getValue('custitemr7categorypurchaseditem'),
			};
			rowNum++;
		}
	}
	while (resultSlice.length >= 1000);
	
	return item_map;
	
}

function grabCategoryPurchasedDetailMap(){
	
	var cat_map = {};
	
	var arrColumns = [];
	arrColumns.push(new nlobjSearchColumn('internalid'));
	arrColumns.push(new nlobjSearchColumn('custrecordr7catpurch_custstatusmap'));
	arrColumns.push(new nlobjSearchColumn('custrecordr7catpurch_expirationfield'));
	arrColumns.push(new nlobjSearchColumn('custrecordr7catpurch_daystillexpire'));
	arrColumns.push(new nlobjSearchColumn('custrecordr7catpurch_daystoremaininactiv'));
	
	var arrResults = nlapiSearchRecord('customrecordr7categorypurchased', null, null, arrColumns);

	for (var i = 0; arrResults != null && i < arrResults.length; i++) {
		
		var objCategory = {};
		
		objCategory.internalid = arrResults[i].getValue('internalid');
		objCategory.custrecordr7catpurch_custstatusmap = arrResults[i].getValue('custrecordr7catpurch_custstatusmap');
		objCategory.custrecordr7catpurch_expirationfield = arrResults[i].getValue('custrecordr7catpurch_expirationfield');
		objCategory.custrecordr7catpurch_daystillexpire = parseInt(arrResults[i].getValue('custrecordr7catpurch_daystillexpire') || 0);
		objCategory.custrecordr7catpurch_daystoremaininactiv = parseInt(arrResults[i].getValue('custrecordr7catpurch_daystoremaininactiv') || 0);
		
		cat_map[objCategory.internalid] = objCategory;
	}
	
	return cat_map;
}

function getPSTDate(){
	var now = new Date();
	now.setHours(now.getHours() + 3);
	return now;
}

function unique(a){
	a.sort();
	for (var i = 1; i < a.length;) {
		if (a[i - 1] == a[i]) {
			a.splice(i, 1);
		}
		else {
			i++;
		}
	}
	return a;
}

function strLowerCase(str){
	return (str != null && str != '') ? str.toLowerCase() : '';
}

function isBlank(val){
	return (val == null || val === '') ? true : false;
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
	if (unitsLeft <= 50) {
		nlapiLogExecution('DEBUG', 'Ran out of units', 'yup');
		rescheduleScript = true;
		return false;
	}
	return true;
}

function getVSOE(recTransaction){
var lineCount = recTransaction.getLineItemCount('item')
var totalVSOE = ''
for (var y = 1; y <= lineCount; y++){
var lineVSOE =  recTransaction.getLineItemValue('item', 'vsoeallocation', y);
if (totalVSOE == ''){totalVSOE = lineVSOE;}
else
{totalVSOE += lineVSOE;}
}
return totalVSOE;

}
