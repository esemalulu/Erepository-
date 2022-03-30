/**
 * In NetSuite Debugger
 * 	require(['N/record']
 * 
 * In Normal Execution
 * 	define(['N/record']
 * 
 * This sample script is related specifically for N/record module. Includes reference to all ENUM related to this function.
 * _record represents module required/defined and passed in as object by NetSuite
 */
require(['N/record'],

function(_record) {
   
	/**
	 * N/record includes following objects:
	 * 		Column
	 * 		Field
	 * 		Record
	 * 		Sublist
	 */
	
	/**
	 * --- RELATEd ENUM ---
	 * Important NOTE: You can still use SSC1.0 text value to create/load/edit records.
	 * _record.Type
	 * 		ACCOUNT							ACCOUNTING_BOOK					ACCOUNTING_PERIOD			AMORTIZATION_SCHEDULE			AMORTIZATION_TEMPLATE		ASSEMBLY_BUIL
	 * 		ASSEMBLY_ITEM					ASSEMBLY_UNBUILD				BILLING_ACCOUNT				BILLING_CLASS					BILLING_SCHEDULE			BIN
	 * 		BIN_TRANSFER					BIN_WORKSHEET					BLANKET_PURCHASE_ORDER		BUNDLE_INSTALLATION_SCRIPT		CALENDAR_EVENT				CAMPAIGN
	 * 		CAMPAIGN_TEMPLATE				CASH_REFUND						CASH_SALE					CHARGE							CHECK						CLASSIFICATION
	 * 		CLIENT_SCRIPT					COMPETITOR						CONTACT						COUPON_CODE						CREDIT_CARD_CHARGE			CREDIT_CARD_REFUND
	 * 		CREDIT_MEMO						CURRENCY						CUSTOMER					CUSTOMER_CATEGORY				CUSTOMER_DEPOSIT			CUSTOMER_PAYMENT	
	 * 		CUSTOMER_REFUND					CUSTOM_TRANSACTION				DEPARTMENT					DEPOSIT							DEPOSIT_APPLICATION			DESCRIPTION_ITEM
	 * 		DISCOUNT_ITEM					DOWNLOAD_ITEM					DRIVERS_LICENSE				EMAIL_TEMPLATE					EMPLOYEE					ENTITY_ACCOUNT_MAPPING
	 * 		ESTIMATE						EXPENSE_CATEGORY				EXPENSE_REPORT				FAIR_VALUE_PRICE				FOLDER						GENERIC_RESOURCE
	 * 		GIFT_CERTIFICATE				GIFT_CERTIFICATE_ITEM			GLOBAL_ACCOUNT_MAPPING		GOVERNMENT_ISSUED_ID_TYPE		HCM_JOB						INTER_COMPANY_JOURNAL_ENTRY
	 * 		INTER_COMPANY_TRANSFER_ORDER	INVENTORY_ADJUSTMENT			INVENTORY_COST_REVALUATION	INVENTORY_COUNT					INVENTORY_DETAIL			INVENTORY_ITEM
	 * 		INVENTORY_NUMBER				INVENTORY_TRANSFER				INVOICE						ISSUE							ITEM_ACCOUNT_MAPPING		ITEM_DEMAND_PLAN
	 * 		ITEM_FULFILLMENT				ITEM_GROUP						ITEM_RECEIPT				ITEM_REVISION					ITEM_SUPPLY_PLAN			JOB
	 * 		JOB_REQUISITION					JOURNAL_ENTRY					KIT_ITEM					KUDOS							LEAD						LOCATION
	 * 		LOT_NUMBERED_ASSEMBLY_ITEM		LOT_NUMBERED_INVENTORY_ITEM		MANUFACTURING_COST_TEMPLATE	MANUFACTURING_OPERATION_TASK	MANUFACTURING_ROUTING		MAP_REDUCE_SCRIPT
	 * 		MARKUP_ITEM						MASSUPDATE_SCRIPT				MESSAGE						MFG_PLANNED_TIME				NEXUS						NON_INVENTORY_ITEM
	 * 		NOTE							OPPORTUNITY						ORDER_SCHEDULE				ORGANIZATION_VALUE				OTHER_CHARGE_ITEM			OTHER_GOVERNMENT_ISSUED_ID
	 * 		OTHER_NAME						PARTNER							PASSPORT					PAYCHECK_JOURNAL				PAYMENT_ITEM				PAYROLL_ITEM
	 * 		PHONE_CALL						PORTLET							POSITION					PRICE_LEVEL						PROJECT_EXPENSE_TYPE		PROJECT_TASK
	 * 		PROJECT_TEMPLATE				PROMOTION_CODE					PROSPECT					PURCHASE_CONTRACT				PURCHASE_ORDER				PURCHASE_REQUISITION
	 * 		RATE_PLAN						REALLOCATE_ITEM					RESOURCE_ALLOCATION			RESTLET							RETURN_AUTHORIZATION		REVENUE_ARRANGEMENT	
	 * 		REVENUE_COMMITMENT				REVENUE_COMMITMENT_REVERSAL		REVENUE_PLAN				REV_REC_SCHEDULE				REV_REC_TEMPLATE			SALES_ORDER	
	 * 		SALES_TAX_ITEM					SCHEDULED_SCRIPT				SCHEDULED_SCRIPT_INSTANCE	SCRIPT_DEPLOYMENT				SERIALIZED_ASSEMBLY_ITEM	SERIALIZED_INVENTORY_ITEM
	 * 		SERVICE_ITEM					SHIP_ITEM						SOLUTION					STATISTICAL_JOURNAL_ENTRY		SUBSCRIPTION				SUBSCRIPTION_CHANGE_ORDER
	 * 		SUBSCRIPTION_LINE				SUBSCRIPTION_PLAN				SUBSIDIARY					SUBTOTAL_ITEM					SUITELET					SUPPORT_CASE
	 * 		TASK							TAX_ACCT						TAX_GROUP					TAX_PERIOD						TAX_TYPE					TERM
	 * 		TERMINATION_REASON				TIME_BILL						TIME_OFF_CHANGE				TIME_OFF_PLAN					TIME_OFF_REQUEST			TIME_OFF_RULE
	 * 		TIME_OFF_TYPE					TOPIC							TRANSFER_ORDER				UNITS_TYPE						USEREVENT_SCRIPT			VENDOR	
	 * 		VENDOR_BILL						VENDOR_CATEGORY					VENDOR_CREDIT				VENDOR_PAYMENT					VENDOR_RETURN_AUTHORIZATION	WEBSITE
	 * 		WORKFLOW_ACTION_SCRIPT			WORK_ORDER						WORK_ORDER_CLOSE			WORK_ORDER_COMPLETION
	 * 
	 * Sample: _record.Type.CUSTOMER
	*/
	
	/**
	 * _record.load and _record.create options
	 * 		type, id (load), isDynamic, defaultValue (JSON pay loads)
	 */
	
	//1. Create New Customer Record
	//		Customer record is used as sample. Other records can be created.
	/**
	 * 
	var newCustomerRec = _record.create({
		'type':_record.Type.CUSTOMER,
		'isDynamic':true,
		'defaultValue':{
			'customform':6
		}
	});
	
	//2. Lets set some field values
	//	 - This seems to be defect where isperson is a checkbox.
	//	   should be accepting boolean but that throws an error
	newCustomerRec.setValue({
		'fieldId':'isperson',
		'value':'F',
		'ignoreFieldChange':false
	});
	
	newCustomerRec.setValue({
		'fieldId':'isinactive',
		'value':false,
		'ignoreFieldChange':false
	});
	
	
	newCustomerRec.setValue({
		'fieldId':'companyname',
		'value':'JoeSSC2-1-1 Corp',
		'ignoreFieldChange':false
	});
	
	//3. Let's Save the new Record
	var newCustomerId = newCustomerRec.save({
		'enableSourcing':true,
		'ignoreMandatoryFields':true
	});
	
	log.debug('New Created Customer', newCustomerId);
	
	*/
	
	//3. lets load the record wew JUST created.
	var loadCustomerRec = _record.load({
		'type':_record.Type.CUSTOMER,
		'id':'6665',
		'isDynamic':true
	});
		
	//4. Lets print out some field values
	log.debug(
		'Loaded First Name:',
		loadCustomerRec.getValue({
			'fieldId':'firstname'
		})
	);
	
	//5. Let's add a new line 
	//   Selecting new line this way returns reference to new record.
	//	 You can use new reference returned to continue add and saving the record
	//		OR
	//	 You don't HAVE to use the new reference.
	loadCustomerRec.selectNewLine({
		'sublistId':'addressbook'
	});
	
	loadCustomerRec.setCurrentSublistValue({
		'sublistId':'addressbook',
		'fieldId':'label',
		'value':'Testing - NOT using Reference',
		'ignoreFieldChange':false
	});
	
	loadCustomerRec.commitLine({
		'sublistId':'addressbook'
	});
	
	//6. Let's get total line of addressbook
	var lineCount = loadCustomerRec.getLineCount({
		'sublistId':'addressbook'
	});
	
	log.debug('line count', lineCount);
	
	loadCustomerRec.save({
		'enableSourcing':true,
		'ignoreMandatoryFields':true
	});
	
	//5. Let's DELETE the record we just created, loaded
	//	This kind of ERROR will show due to reserved words
	/**
	_record.delete({
		'type':_record.Type.CUSTOMER,
		'id':newCustomerId
	});
	
	log.debug('Deleted Record','Deleted Record ID '+newCustomerId);
	*/
	
	//Depending on what script you are building,
	//	below section will return specific entry functions	
    return {
        
    };
    
});
