/**
 * Module Description
 * 
 * Version  1.00    
 * Date     12 Mar 2013       
 * Author  mburstein  
 * 
 * The salesOrderUserEvent module describes all User Event functions deployed to Sales Order Transaction records.
 * 
 * @module salesOrderUserEvent
 * @requires Transaction_Library_Scripts.js
 * @main salesOrderUserEvent
 */

/**
 * salesOrderBeforeLoad is deployed to Sales Orders.  The function provides a number of button utilities based on user permissions.
 * 
 * @class salesOrderBeforeLoad
 * @module salesOrderUserEvent
 * @appliedtorecord salesorder
 * 
 * @uses salesorder
 * @param {String} type Operation types: view
 * @param {nlobjForm} form Current form
 * @returns {Void}
 * @appliedtorecord salesorder
 */
var userId = nlapiGetUser();
var roleId = nlapiGetRole();
var record = nlapiGetNewRecord();

var logFields = new Object();

function salesOrderBeforeLoad(type, form){

	// Create a group for admins userIds
	var adminIds = new Array();
	var adminUser =  nlapiLoadConfiguration('companypreferences').getFieldValue('custscriptr7_system_info_email_sender');
	adminIds.push(adminUser);
	
	
	/**
	 * Create groups for Role Based Access Control (RBAC)
	 *		renewalAutoGroup
	 *		orderValidateGroup
	 *		unValidateGroup
	 *		itemAssociationGroup
	 *		contractsGroup 
	 * @property rbacGroup
	 */ 
	var renewalAutoGroup = new Array();
	renewalAutoGroup[renewalAutoGroup.length] = 1022;	// R7 Customer Care Special Staff
	renewalAutoGroup[renewalAutoGroup.length] = 149990; // Suzannah Cooke
	renewalAutoGroup[renewalAutoGroup.length] = 1057;	//R7 Sales/Rev Ops. Power User

	var orderValidateGroup = new Array();
	orderValidateGroup[orderValidateGroup.length] = 149990; // Suzannah Cooke
	orderValidateGroup[orderValidateGroup.length] = 1022; // R7 Customer Care Special Staff
	orderValidateGroup[orderValidateGroup.length] = 1027; // R7 Customer Care Manager
	orderValidateGroup[orderValidateGroup.length] = 1057; // R7 Sales/Support/Issue ComboALL
	orderValidateGroup[orderValidateGroup.length] = 1036; // R7 Channel Sales
	orderValidateGroup[orderValidateGroup.length] = 1065; // R7 Finance Staff - AR/AP/EmpVie
	
	
	var unValidateGroup = new Array();
	unValidateGroup[unValidateGroup.length] = 149990; // Suzannah Cooke
	unValidateGroup[unValidateGroup.length] = 1057; // R7 Sales/Support/Issue ComboALL
	unValidateGroup[unValidateGroup.length] = 1022; // R7 Customer Care Special Staff
	unValidateGroup[unValidateGroup.length] = 1027; // R7 Customer Care Manager
	
	var itemAssociationGroup = new Array();
	itemAssociationGroup[itemAssociationGroup.length] = 149990; // Suzannah Cooke
	itemAssociationGroup[itemAssociationGroup.length] = 1022; // R7 Customer Care Special Staff
	itemAssociationGroup[itemAssociationGroup.length] = 1027; // R7 Customer Care Manager
	itemAssociationGroup[itemAssociationGroup.length] = 1057; // R7 Sales/Support/Issue ComboALL
	itemAssociationGroup[itemAssociationGroup.length] = 1036; // R7 Channel Sales
	itemAssociationGroup[itemAssociationGroup.length] = 1065; // R7 Finance Staff - AR/AP/EmpVie
	
	var contractsGroup = new Array();
	contractsGroup[contractsGroup.length] = 149990; // Suzannah Cooke
	contractsGroup[contractsGroup.length] = 1022; // R7 Customer Care Special Staff
	contractsGroup[contractsGroup.length] = 1027; // R7 Customer Care Manager
	contractsGroup[contractsGroup.length] = 1057; // R7 Sales/Support/Issue ComboALL
	contractsGroup[contractsGroup.length] = 1036; // R7 Channel Sales
	contractsGroup[contractsGroup.length] = 1065; // R7 Finance Staff - AR/AP/EmpVie
	
	if (type == 'view') {
	
		// Renewal button - from R7_RA_SalesOrder_SS_CreateOpportunity.js
		if (checkAccess(new Array(adminIds,renewalAutoGroup))) {
			if ((nlapiGetFieldValue('status') != 'Pending Approval' && nlapiGetFieldValue('custbodyr7renewaloppcreated') == 'F')
			&& nlapiGetFieldValue('custbodyr7ordervalidated') == 'T' && nlapiGetFieldValue('custbodyr7ordervalidated') == 'T') {
				form.setScript('customscriptr7renewalautosuitelet_cs');
				form.addButton('custpage_renew', 'Create Renewal', 'redirectToRenewalSuitelet()');
				if (userId == 149990) {
					form.addButton('custpage_racomplete', 'RA Complete', 'raComplete()');
				}
			}
		}
		
		// Add Order Validation button if the order is not validated and user is in validation RBAC group
		if (nlapiGetFieldValue('custbodyr7ordervalidated') == 'F' && checkAccess(new Array(adminIds,orderValidateGroup))) {
			form.setScript('customscript_windowopen_cs');
			form.setScript('customscriptr7ordervalidation_cs');
			
			form.addButton('custpage_validateorder', 'Validate Order', 'validateOrder()');
			
		}
		// If the order is validated and still Pending Approval allow for unvalidation
		else 
			if (nlapiGetFieldValue('status') == 'Pending Approval' && checkAccess(new Array(adminIds,unValidateGroup))) {
				form.setScript('customscriptr7ordervalidation_cs');
				form.addButton('custpage_unvalidateorder', 'UN-Validate Order', 'unValidateOrder()');
			}
				
		// Add Item Association button
		if (nlapiGetFieldValue('custbodyr7ordervalidated') == 'F' && checkAccess(new Array(adminIds,itemAssociationGroup))) {
			var suiteletURL = nlapiResolveURL('SUITELET', 'customscriptr7itemassociation_acr', 'customdeployr7itemassociation_acr', false);
			var url = suiteletURL + '&custparam_ordertype=' + nlapiGetRecordType() + '&custparam_orderid=' + nlapiGetRecordId();
			form.addButton('custpage_associateitems_acr', 'Associate Items', 'replaceWindow(\'' + url + '\');');
		}
		
		// Add Contracts button
		if (nlapiGetFieldValue('custbodyr7ordervalidated') == 'F' && checkAccess(new Array(adminIds,contractsGroup))) {
			var contractSuiteletURL = nlapiResolveURL('SUITELET', 'customscriptr7contractautomation_suitele', 'customdeployr7contractautomation_suitele', false);
			contractSuiteletURL = contractSuiteletURL + '&custparam_ordertype=' + nlapiGetRecordType() + '&custparam_orderid=' + nlapiGetRecordId();
			form.addButton('custpage_createcontracts', 'Contracts', 'popUpWindow(\'' + contractSuiteletURL + '\', \'800\',\'800\');');
		}
	}
}
/**
 * salesOrderBeforeSubmit is deployed to Sales Orders.
 * 
 * @class salesOrderBeforeSubmit
 * @module salesOrderUserEvent
 * @uses salesorder
 * @appliedtorecord salesorder
 * 
 * @param {String} type Operation types: create, edit, delete, xedit
 *                      approve, reject, cancel (SO, ER, Time Bill, PO & RMA only)
 *                      pack, ship (IF)
 *                      markcomplete (Call, Task)
 *                      reassign (Case)
 *                      editforecast (Opp, Estimate)
 * @returns {Void}
 */
function salesOrderBeforeSubmit(type){

	var context = nlapiGetContext();
	var record = nlapiGetNewRecord();
	// MB: 6/26/13 - Added unAssociate - uncheck 'Order Associated' (custbodyr7orderassociated)
	if (context.getExecutionContext() == 'userinterface') {
		if (type == 'create' || type == 'copy' || type == 'edit') {
			setTotalDiscount(record); //library script
			setLocations();
		}
/**
 * When a user creates/copies an order uncheck the following:
 * 
 * 		Validated (custbodyr7ordervalidated)
 * 		Finance Validated (custbodyr7ordervalidatedfinance)
 * 		Order Associated (custbodyr7orderassociated)
 * 
 * If order is unvalidated, uncheck the following on edit:
 * 
 * 		Order Associated (custbodyr7orderassociated)
 * 
 * @event Uncheck Validations/Associations
 * @for salesOrderBeforeSubmit
 */
		if(type == 'create' || type == 'copy'){
			record.setFieldValue('custbodyr7ordervalidated','F');
			record.setFieldValue('custbodyr7ordervalidatedfinance','F');
			record.setFieldValue('custbodyr7orderassociated','F');
		}
		// If editing an unvalidated order, uncheck order associated
		if (type == 'edit' && nlapiGetFieldValue('custbodyr7ordervalidated') == 'F') {
			record.setFieldValue('custbodyr7orderassociated','F');
		}
	}
	
	if (type == 'create' || type == 'edit' || type == 'xedit') {
		// Stamp Lead Source Category with leadsource campaign record category text
		updateLeadSrc(record);
	}
	
	logFields['custbodyr7ordervalidated'] = record.getFieldValue('custbodyr7ordervalidated');
	logFields['custbodyr7ordervalidatedfinance'] = record.getFieldValue('custbodyr7ordervalidatedfinance');
	logFields['custbodyr7orderassociated'] = record.getFieldValue('custbodyr7orderassociated');
	for (prop in logFields) {
		nlapiLogExecution('DEBUG', prop + ' : ', logFields[prop]);
	}
}
/**
 * salesOrderAfterSubmit is deployed to Sales Orders
 * @class salesOrderAfterSubmit
 * @module salesOrderUserEvent
 * @appliedtorecord salesorder
 * @param {String} type Operation types: create, edit, delete, xedit,
 *                      approve, cancel, reject (SO, ER, Time Bill, PO & RMA only)
 *                      pack, ship (IF only)
 *                      dropship, specialorder, orderitems (PO only) 
 *                      paybills (vendor payments)
 * @returns {Void}
 */
function salesOrderAfterSubmit(type){
	var userId = nlapiGetUser();
	var roleId = nlapiGetRole();
	var orderId = nlapiGetRecordId();
	
	if (type == 'create' || type == 'edit' || type == 'copy') {
		/**
		 * This property holds event trigger variables, if any are true then schedule approiate script
		 * 
		 * @property objSchedulingEvents
		 * @type Object
		 * @param acr {Boolean} If acr = true schedule ACR Process Entire Order for license fulfillment etc
		 * @param eCommerce {Boolean} If eCommerce = true, schedule eCommerce Scrub for VSOE/Fraud and create Opportunity
		 */
		var objSchedulingEvents = new Object();
		objSchedulingEvents.acr = false;
		objSchedulingEvents.eCommerce = false;
		
		var record = nlapiLoadRecord(nlapiGetRecordType(), nlapiGetRecordId());
		/**
		 * If this property is true then potential fraud, DON'T trip scheduled scripts
		 * 
		 * @property suspendACL
		 * @type Boolean
		 */
		var suspendACL = record.getFieldValue('custbodyr7salesorderautocreatel'); //Suspend Autocreate Licesnse
		
		// If the order is new and source is Web then it's eCommerce
		if (type == 'create') {
			var source = record.getFieldValue('source');
			if (source != null && source != '') {
				objSchedulingEvents.eCommerce = true;
			}
		}
		

		
		// If order is approved then schedule ACR
		var approved = isApproved(record);
		if (approved) {
			objSchedulingEvents.acr = true;
		}
		
		scheduleScripts(objSchedulingEvents,suspendACL);
		
		// From SalesOrder_Invoice_SS
		this.arrActivatedEmployees = new Array();
		var vsoeAssigned = record.getFieldValue('custbodyr7vsoeassignedto');
		
		if (vsoeAssigned == null || vsoeAssigned == '') {
			record = stampHistoricalManager(record);
			try {
				nlapiSubmitRecord(record, true, true);
			} 
			catch (e) {
				var adminUser =  nlapiLoadConfiguration('companypreferences').getFieldValue('custscriptr7_system_info_email_sender');
				nlapiSendEmail(adminUser, adminUser, 'Problem with SalesOrder_Invoice Script', 'Error: ' + e);
			}	
			inactivateEmployees();
		}
		
		/*
		 * REMOVE AFTER DEBUG
		 */
		logFields['objSchedulingEvents.eCommerce'] = objSchedulingEvents.eCommerce;
		logFields['objSchedulingEvents.acr'] = objSchedulingEvents.acr;
		logFields['suspendACL'] = suspendACL;
		for (prop in logFields) {
			nlapiLogExecution('DEBUG', prop + ' : ', logFields[prop]);
		}
	}
	nlapiLogExecution('DEBUG', '<--END SALES ORDER AFTER SUBMIT-->', 'Order: ' + orderId + ' / User: ' + userId + ' / Role: ' + roleId);
}
/**
 * This function schedules the necessary script for all true event triggers of objSchedulingEvents
 * @method scheduleScripts
 * @for salesOrderAfterSubmit
 * @param {Object} objSchedulingEvents This object holds all event triggers.  See object's sub-properties of   obj 
 * @return {Void}
 */
function scheduleScripts(objSchedulingEvents,suspendACL){
		
	if (!suspendACL) {
		if (objSchedulingEvents.acr == true) {
			nlapiScheduleScript(559); // ACR Process Entire Order 
		}
		if (objSchedulingEvents.eCommerce == true) {
			nlapiScheduleScript(744); // eCommerce Order Scrub 
		}
	}
}
/**
 * Check if the given array of roles/users have access to the feature
 * @method checkAccess
 * @for salesOrderBeforeLoad
 * @param {Array} groupArray Array of roles/users for role based access checks
 * @return {Boolean} hasAccess True if the user is allowed access to the feature
 */
function checkAccess(groupArray){
	var hasAccess = false;
	
	for (var i = 0; groupArray != null && i < groupArray.length; i++) {
		var group = groupArray[i];
		if (group.indexOf(userId) != -1) {
			hasAccess = true;
		}
		if (group.indexOf(roleId) != -1) {
			hasAccess = true;
		}
	}	
	return hasAccess;
}
