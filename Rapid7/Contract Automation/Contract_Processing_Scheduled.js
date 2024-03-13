/*
 * Module Description
 * 
 * Version    Date            Author           Remarks
 * 1.00       07 Nov 2012     efagone
 *
 */

/*
 * @param {String} type Context Types: scheduled, ondemand, userinterface, aborted, skipped
 * @returns {Void}
 */

function process() {

	var timeLimitInMinutes = 10;
	this.timeLimitInMilliseconds = timeLimitInMinutes * 60 * 1000;
	this.startingTime = new Date().getTime();
	this.context = nlapiGetContext();
	this.rescheduleScript = false;
	
	processCustomerContracts();
	processOtherContracts();
	
	if (rescheduleScript) {
		nlapiLogExecution('DEBUG', 'Rescheduling script (script/deploy id)', context.getScriptId());
		var status = nlapiScheduleScript(context.getScriptId());
		nlapiLogExecution('DEBUG', 'Schedule Status', status);
	}
}

function processCustomerContracts(){

	var arrContractsToProcess = nlapiSearchRecord('customrecordr7contractautomation', 12636);
	
	for (var i = 0; arrContractsToProcess != null && i < arrContractsToProcess.length && timeLeft() && unitsLeft(); i++) {
		var contractToProcess = arrContractsToProcess[i];
		var columns = contractToProcess.getAllColumns();
		var customerId = contractToProcess.getValue(columns[0]);
		var recordType = contractToProcess.getValue(columns[1]);
		
		try {
			var recCustomer = nlapiLoadRecord(recordType, customerId);
			processEverything(recCustomer);
		} 
		catch (e) {
			nlapiLogExecution('ERROR', 'Could not process customer contract', customerId);
		}
		if (i == 999) {
			arrSearchResults = nlapiSearchRecord('customrecordr7contractautomation', 12636);
			i = -1;
		}
	}
}

function processOtherContracts(){

	var arrContractsToProcess = nlapiSearchRecord('customrecordr7contractautomation', 12832);
	
	for (var i = 0; arrContractsToProcess != null && i < arrContractsToProcess.length && timeLeft() && unitsLeft(); i++) {
	
		var contractToProcess = arrContractsToProcess[i];
		var columns = contractToProcess.getAllColumns();
		var contractId = contractToProcess.getValue(columns[0]);
		var contractStatus = contractToProcess.getValue(columns[1]);
		var contractYears = contractToProcess.getValue(columns[2]);
		var orderStart = contractToProcess.getValue(columns[3]);
		var contractEndDate = contractToProcess.getValue(columns[4]);
		try {
		
			if (nlapiStringToDate(contractEndDate) >= nlapiStringToDate(nlapiDateToString(new Date()))) { //not expired
				var fields = new Array();
				fields[0] = 'custrecordr7contractautostatus';
								
				var values = new Array();
				values[0] = 2; //active
				
				nlapiSubmitField('customrecordr7contractautomation', contractId, fields, values);
			}
			else {
			
				var fields = new Array();
				fields[0] = 'custrecordr7contractautostatus';
				
				var values = new Array();
				values[0] = 3; //expire
				nlapiSubmitField('customrecordr7contractautomation', contractId, fields, values);
			}
		} 
		catch (e) {
			nlapiLogExecution('ERROR', 'Could not process processOtherContracts', contractId);
		}
	}
}

function processEverything(recCustomer){

	var recordType = recCustomer.getRecordType();
	recordType = recordType.toLowerCase();
	var customerId = recCustomer.getId();

	recCustomer = processCustomerItemPricing(recCustomer);
	
	try {
	
		var id = nlapiSubmitRecord(recCustomer);
		markContractsProcessed(customerId, true);
	} 
	catch (e) {
		nlapiLogExecution('ERROR', 'Could not process contract', 'RecType: ' + recCustomer + '\nCustomerId: ' + customerId + '\n' + e);
		var adminUser =  nlapiLoadConfiguration('companypreferences').getFieldValue('custscriptr7_system_info_email_sender');
		nlapiSendEmail(adminUser, adminUser, 'Could not process contract ' + customerId, 'RecType: ' + recCustomer + '\nCustomerId: ' + customerId + '\n' + e);
		markContractsProcessed(customerId, false, e);
	}
	
}

function processCustomerItemPricing(recCustomer){

	recCustomer = freshenUpCustomer(recCustomer);
	
	var recordType = recCustomer.getRecordType();
	recordType = recordType.toLowerCase();
	var customerId = recCustomer.getId();
	
	var arrSearchFilters = new Array();
	arrSearchFilters[arrSearchFilters.length] = new nlobjSearchFilter('custrecordr7carcustomer', null, 'is', customerId);
	arrSearchFilters[arrSearchFilters.length] = new nlobjSearchFilter('custrecordr7carcreatedfromtemplate', null, 'anyof', 3);
	arrSearchFilters[arrSearchFilters.length] = new nlobjSearchFilter('custrecordr7carstartdate', null, 'onorbefore', 'today');
	arrSearchFilters[arrSearchFilters.length] = new nlobjSearchFilter('custrecordr7carenddate', null, 'onorafter', 'today');
	arrSearchFilters[arrSearchFilters.length] = new nlobjSearchFilter('custrecordr7contractautostatus', null, 'noneof', 3); //expired
	var arrSearchColumns = new Array();
	arrSearchColumns[0] = new nlobjSearchColumn('internalid', null, 'group');
	arrSearchColumns[1] = new nlobjSearchColumn('custrecordr7caramount', null, 'min').setSort(true);
	arrSearchColumns[2] = new nlobjSearchColumn('formulatext', null, 'max');
	arrSearchColumns[2].setFormula('{custrecordr7caritems.id}');
	
	//all current active contracts for customer
	var arrSearchResults = nlapiSearchRecord('customrecordr7contractautomation', null, arrSearchFilters, arrSearchColumns);
	
	var arrItemsIdsProcessed = new Object();
	var lineNumber = 1;
	for (var i = 0; arrSearchResults != null && i < arrSearchResults.length; i++) {
	
		var searchResult = arrSearchResults[i];
		var strItemIds = searchResult.getValue(arrSearchColumns[2]);
		var amount = searchResult.getValue(arrSearchColumns[1]);
		
		var arrItemIds = new Array();
		if (strItemIds != null && strItemIds != '') {
			arrItemIds = strItemIds.split(",");
		}
		
		for (var k = 0; arrItemIds != null && k < arrItemIds.length; k++) {
			var itemId = arrItemIds[k];
			if (!arrItemsIdsProcessed.hasOwnProperty(itemId)) {
				recCustomer.setLineItemValue('itempricing', 'item', lineNumber, itemId);
				recCustomer.setLineItemValue('itempricing', 'currency', lineNumber, recCustomer.getFieldValue('currency'));
				recCustomer.setLineItemValue('itempricing', 'level', lineNumber, -1);
				recCustomer.setLineItemValue('itempricing', 'price', lineNumber, amount);
				arrItemsIdsProcessed[itemId] = true; // can only do each item once
				lineNumber++;
			}
		}
	}
	
	return recCustomer;
}

function freshenUpCustomer(recCustomer){
	
	while (recCustomer.getLineItemCount('itempricing') > 0) {
		recCustomer.removeLineItem('itempricing', 1);
	}
	nlapiLogExecution('DEBUG', 'so fresh', 'and so clean');
	return recCustomer;
}


function markContractsProcessed(customerId, success, error){
	
	if (success) {
		// expire enddate prior to today
		var arrSearchFilters = new Array();
		arrSearchFilters[0] = new nlobjSearchFilter('custrecordr7carcustomer', null, 'is', customerId);
		arrSearchFilters[1] = new nlobjSearchFilter('custrecordr7carenddate', null, 'before', 'today');
		arrSearchFilters[2] = new nlobjSearchFilter('custrecordr7contractautostatus', null, 'noneof', 3); //expired
		
		var arrSearchResults = nlapiSearchRecord('customrecordr7contractautomation', null, arrSearchFilters);
		
		for (var i = 0; arrSearchResults != null && i < arrSearchResults.length; i++) {
			var searchResult = arrSearchResults[i];
			nlapiSubmitField('customrecordr7contractautomation', searchResult.getId(), 'custrecordr7contractautostatus', 3);
		}
		
		// mark active anything within dates 
		var arrSearchFilters = new Array();
		arrSearchFilters[0] = new nlobjSearchFilter('custrecordr7carcustomer', null, 'is', customerId);
		arrSearchFilters[1] = new nlobjSearchFilter('custrecordr7carstartdate', null, 'onorbefore', 'today');
		arrSearchFilters[2] = new nlobjSearchFilter('custrecordr7carenddate', null, 'onorafter', 'today');
		arrSearchFilters[3] = new nlobjSearchFilter('custrecordr7contractautostatus', null, 'noneof', 3); //expired
		
		var arrSearchResults = nlapiSearchRecord('customrecordr7contractautomation', null, arrSearchFilters);
		
		for (var i = 0; arrSearchResults != null && i < arrSearchResults.length; i++) {
			var searchResult = arrSearchResults[i];
			
			var fields = new Array();
			fields[0] = 'custrecordr7contractautostatus';
			fields[1] = 'custrecordr7car_errortext';
			
			var values = new Array();
			values[0] = 2;
			values[1] = '';
			
			nlapiSubmitField('customrecordr7contractautomation', searchResult.getId(), fields, values);
			
		}
	}
	else {
		var arrSearchFilters = new Array();
		arrSearchFilters[0] = new nlobjSearchFilter('custrecordr7carcustomer', null, 'is', customerId);
		arrSearchFilters[1] = new nlobjSearchFilter('custrecordr7carstartdate', null, 'before', 'today');
		arrSearchFilters[2] = new nlobjSearchFilter('custrecordr7contractautostatus', null, 'noneof', 3);
		
		var arrSearchResults = nlapiSearchRecord('customrecordr7contractautomation', null, arrSearchFilters);
		
		for (var i = 0; arrSearchResults != null && i < arrSearchResults.length; i++) {
			var searchResult = arrSearchResults[i];
			nlapiSubmitField('customrecordr7contractautomation', searchResult.getId(), 'custrecordr7contractautostatus', 4);
		}
		
		var arrSearchFilters = new Array();
		arrSearchFilters[0] = new nlobjSearchFilter('custrecordr7carcustomer', null, 'is', customerId);
		arrSearchFilters[1] = new nlobjSearchFilter('custrecordr7carstartdate', null, 'onorbefore', 'today');
		arrSearchFilters[2] = new nlobjSearchFilter('custrecordr7carenddate', null, 'onorafter', 'today');
		arrSearchFilters[3] = new nlobjSearchFilter('custrecordr7contractautostatus', null, 'noneof', new Array(2, 3));
		
		var arrSearchResults = nlapiSearchRecord('customrecordr7contractautomation', null, arrSearchFilters);
		
		var errorText = 'Code: ' + error.name + '<br>Details: ' + error.message;
		
		for (var i = 0; arrSearchResults != null && i < arrSearchResults.length; i++) {
			var searchResult = arrSearchResults[i];
			
			var fields = new Array();
			fields[0] = 'custrecordr7contractautostatus';
			fields[1] = 'custrecordr7car_errortext';
			
			var values = new Array();
			values[0] = 4;
			values[1] = errorText;
			
			nlapiSubmitField('customrecordr7contractautomation', searchResult.getId(), fields, values);
		}
	}
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
	if (unitsLeft <= 300) {
		nlapiLogExecution('DEBUG', 'Ran out of units', 'yup');
		rescheduleScript = true;
		return false;
	}
	return true;
}