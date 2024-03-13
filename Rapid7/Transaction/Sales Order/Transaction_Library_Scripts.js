/**
 * Module Description
 * 
 * Version    Date            Author           Remarks
 * 1.00       01 May 2013     mburstein
 * 
 * This Library script houses generic functions that might be used across transaction types
 *
 */

/**
 * Check if an orderstatus is approved.  Return true if any of orderstatus is one of the following:
 *  Pending Fulfillment
 *  Partially Fulfilled
 *  Pending Billing
 *  Billed
 *  
 * @param {Object} record
 * @return {Boolean} approved
 */
function isApproved(record){
	var approved = false;
	var approvedOrderTypes = new Array('Billed', 'Partially Fulfilled', 'Pending Fulfillment', 'Pending Billing');
	var orderStatus = record.getFieldText('orderstatus');
	if (approvedOrderTypes.indexOf(orderStatus) != -1) {
		approved = true; 
	}
	return approved;
}

// <--------------------Begin SalesOrderOppQuoteInvoice_SS_UpdateLeadSrc.js-------------->
/*
 * Deployed to the following Records
 * Invoice
 * Opportunity
 * Quote
 * Sales Order
 */
/**
 * Stamp the SalesOrder Lead Source Category with the Lead Source's Campaign record Category
 * 
 * @method updateLeadSrc
 * @for salesOrderBeforeSubmit
 * @param {Object} record
 * @return {Void}
 */
// TODO DO WE NEED THIS???
function updateLeadSrc(record){
	try {
		// Get the Lead Source
		var leadSource = record.getFieldValue('leadsource');
		
		if (leadSource != null && leadSource != '') {
			var leadSourceCategory = nlapiLookupField('campaign', leadSource, 'category', 'text');
			
			if (leadSourceCategory != null && leadSourceCategory != '') {
				nlapiLogExecution('DEBUG', 'leadSourceCategory', leadSourceCategory);
				record.setFieldText('custbodyr7transleadsourcecategory', leadSourceCategory);
			}	
		}
	} 
	catch (e) {
		nlapiLogExecution('ERROR', 'Issue with setting the leadSourceCategory', e);
	}
}
/**
 * This function sets line item locations to the Sales Order header location.
 * The function comes from SalesOrderOppQuoteInvoice_SS_UpdateLeadSrc.js
 * 
 * @method setLocations
 * @for salesOrderBeforeSubmit
 * @return {Void}
 */
function setLocations(){

	var headerLocation = nlapiGetFieldValue('location');
	if (headerLocation == null || headerLocation == '') {
		return;
	}
	
	for (var i = 1; i <= nlapiGetLineItemCount('item'); i++) {
	
		var lineLocation = nlapiGetLineItemValue('item', 'location', i);
		if (lineLocation == null || lineLocation == '') {
			nlapiSetLineItemValue('item', 'location', i, headerLocation);
		}
	}
	
}

// <--------------------END SalesOrderOppQuoteInvoice_SS_UpdateLeadSrc.js-------------->

// <---------------------Begin R7_Transaction_Library_Functions.js------------->
/**
 * Stamp order with the total discount rate (custbodyr7transactiondiscounttotal).  It is calculated as follows:
 * 	discountRate = (discountTotal / transactionTotal) * -100 rounded to nearest tenth
 * where:
 * 	lineDiscountTotal = sum of discounts on line items
 * 	discountTotal = lineDiscountTotal + headerDiscount
 * 
 * @method setTotalDiscount
 * @for salesOrderBeforeSubmit
 * @param {Object} record
 * @return {Void}
 */
function setTotalDiscount(record){

	var recordId = record.getId();
	
	if (recordId != '' && recordId != null) {
		var dateCreated = nlapiStringToDate(record.getFieldValue('createddate'));
	}
	else {
		dateCreated = new Date();
	}
	
	var dateLegacy = nlapiStringToDate('7/1/2011'); //was told to not find total discount for anything before this date
	
	if (dateCreated > dateLegacy) {
		var lineDiscountTotal = 0;
		var transactionTotal = 0;
		var numberOfItems = record.getLineItemCount('item');
		
		if (numberOfItems != null) {
			for (var i = 1; i <= numberOfItems; i++) {
			
				var itemId = record.getLineItemValue('item', 'item', i);
				var itemType = record.getLineItemValue('item', 'itemtype', i);
				nlapiLogExecution('DEBUG', 'itemtype', itemType);
				
				var createdFromRA = record.getLineItemValue('item', 'custcolr7createdfromra', i);
				var lineAmount = formatNumber(record.getLineItemValue('item', 'amount', i));
				nlapiLogExecution('DEBUG', 'lineAmount', lineAmount);
				
				if (lineAmount != null && !isNaN(lineAmount) && itemType != 'Subtotal') {
				
					if (lineAmount < 0 && (createdFromRA == null || createdFromRA == '')) {
						lineDiscountTotal = lineDiscountTotal + lineAmount;
					}		
					else {
						transactionTotal = transactionTotal + lineAmount;
					}
				}
			}
		}
		var headerDiscount = formatNumber(record.getFieldValue('discounttotal'));
		var discountTotal = lineDiscountTotal + headerDiscount;
		
		if (transactionTotal == 0) {
			if (discountTotal > 0) {
				var discountRate = 100;
			}
			else {
				var discountRate = 0;
			}
		}
		else {
			var discountRate = (discountTotal / transactionTotal) * -100;
		}
		discountRate = Math.round(discountRate * 10) / 10;
		
		record.setFieldValue('custbodyr7transactiondiscounttotal', discountRate);
	}
	else {
		record.setFieldValue('custbodyr7transactiondiscounttotal', 0);
	}
}

function formatNumber(field){

	if (field == '' || field == null) {
		field = 0;
	}
	else {
		field = parseFloat(field);
	}
	
	if (isNaN(field)) {
		field = 0;
	}
	
	return field;
}

// <---------------------END R7_Transaction_Library_Functions.js------------->

// <---------------------BEGIN SalesOrderInvoice_SS functions--------------->
/*
 * Deployed to the following Records
 * Invoice
 * Sales Order
 */
/**
 * Stamp order with the following:
 *   Sales Rep Manager Historical (custbodyr7salesrepmanagerhistorical)
 *   Sales Rep Territory Historical (custbodyr7salesrepterritoryhistorical)
 * If the employee is inactive, the functions activateEmployee and inactivateEmployees will be used to temporarily activate the employee
 * 
 * @method stampHistoricalManager
 * @for salesOrderAfterSubmit
 * @param {Object} record
 * @return {Void}
 */
function stampHistoricalManager(record){	

	var salesRep = record.getFieldValue('salesrep');
	var salesRepOld = record.getFieldValue('custbodyr7salesrepold');
	var dateCreated = record.getFieldValue('created');
	
	//If salesRepOld is unpopulated populate it
	if ((salesRepOld == null || salesRepOld == '') || (salesRep != salesRepOld)) {
		record.setFieldValue('custbodyr7salesrepold', salesRep);
		
		var employeeInactive = nlapiLookupField('employee', salesRep, 'isinactive');
		if (employeeInactive == 'T') {
			activateEmployee(salesRep);
		}
	}
	
	var salesRepManagerHistorical = record.getFieldValue('custbodyr7salesrepmanagerhistorical');
	
	var dateCreatedLine = nlapiStringToDate("12/01/2010");
	var dateCreatedDate = nlapiStringToDate(dateCreated);
	
	//when the salesrep changes
	//we want to change the territoryHistorical and manager 
	
	if((salesRep!='' && salesRep!=null)&& ((salesRep!=salesRepOld && dateCreatedDate > dateCreatedLine) || ((salesRepManagerHistorical==null || salesRepManagerHistorical=='')))){
		var fields = nlapiLookupField('employee',salesRep,new Array('custentityr7practicegroupmanager','custentityr7employeeterritory', 'custentityr7practicegroupmanager.isinactive'));
		
		if (fields['custentityr7practicegroupmanager'] != null && fields['custentityr7practicegroupmanager'] != '') {
			var practiveMgrInactive = fields['custentityr7practicegroupmanager.isinactive'] 
			if (practiveMgrInactive == 'T') {
				activateEmployee(fields['custentityr7practicegroupmanager']);
			}
		}
		
		record.setFieldValue('custbodyr7salesrepmanagerhistorical',fields['custentityr7practicegroupmanager']);
		record.setFieldValue('custbodyr7salesrepterritoryhistorical',fields['custentityr7employeeterritory']);
	}
	
	return record;
}

function activateEmployee(employeeInternalId){
	
	arrActivatedEmployees[arrActivatedEmployees.length] = employeeInternalId;
	//nlapiSendEmail(55011, 55011, 'Activating', 'Invoice Script\n\nEmployee: ' + employeeInternalId);
	nlapiLogExecution('DEBUG', 'activating employee', employeeInternalId);	
	nlapiSubmitField('employee', employeeInternalId, 'isinactive', 'F');
}

function inactivateEmployees(){

	for (var i = 0; arrActivatedEmployees != null && i < arrActivatedEmployees.length; i++) {
		
		var employeeInternalId = arrActivatedEmployees[i];
		//nlapiSendEmail(55011, 55011, 'De-activating', 'Invoice Script\n\nEmployee: ' + employeeInternalId);
		nlapiLogExecution('DEBUG', 'deactivating employee', employeeInternalId);
		nlapiSubmitField('employee', employeeInternalId, 'isinactive', 'T');
	}
}

// <---------------------END SalesOrderInvoice_SS functions--------------->
