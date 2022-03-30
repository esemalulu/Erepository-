// BEGIN SCRIPT DESCRIPTION BLOCK  =================================================================================
/*
   	Script Name: 		kana_ss_create_opp_from_sales_order_scheduled.js
	Author: 		Vasu Tirunelvelly
	Client:			KANA		
	Company: 		NetSuite, Inc.
	Date: 			17th July 2007
	Type:			Uses - AfterSubmit, BeforeSubmit

	User-Event Server SuiteScript which is triggered on Approval of Sales Order:
=========================================================
Change ID		:CH#DEFAULT_MEMBER
Programmer		:Sagar Shah
Description		: 	Change the default Sales Member from Janu to Stephen Bronte
Date			: 04/08/2011		
=========================================================
Change ID		:CH#MAINTAINCE_END_DATE - END
Programmer		:Sagar Shah
Description		: 	Set the Current maintenance end date. This field value is solely used for printing Quote transactions. Part of Auto-
							Contract generation.
Date			: 07/21/2011			 
=========================================================
Change ID		:CH#SALES_REP_REASSIGNMENT_1
Programmer		:Sagar Shah
Description		: 	Set Sales Rep assignment logic:
							For NA deals assign to Rudy
							For non-NA deals assign to Alanna and Eimear
Date			: 11/16/2011			 
	==================================================================================
Change ID		:CH#CHECK_LEAP_YEAR
Programmer		:Sagar Shah
Description		: Correct the Leap Year calculation
Date			: 12/20/2011	 
==================================================================================
Change ID		:CH#GENERIC_MAINT_ITEM
Programmer		:Sagar Shah
Description		: For generic maintenance item make appropriate changes
Date			: 05/11/2012		 
==================================================================================
Change ID		:CH#AUTO_MR_QUOTE
Programmer		:Sagar Shah
Description		: Copy the Delivery Email value to the new auto opportunity
Date					: 05/21/2012
==================================================================================
Change ID		:CH#EMAIL_NOTIFICATION
Programmer		:Sagar Shah
Description		: Changed the Email notifier for error messages from Vasu to Sagar for temporary period.
Date			: 10/01/2012
==================================================================================
Change ID		:CH#FINE_TUNING_MAR2013
Programmer		:Sagar Shah
Description		: Changed few things like:

Removed vasu's name and replaced sagar's with kana-app-notification@kana.com for email notification
and other things

Date			: 03/29/2013
==================================================================================
Change ID		:CH#TIMEOUT_ERROR
Programmer		:Sagar Shah
Description		: Fix the time out error when number of sales orders to be processed in more in number.
					Changed the script such that it is idempotent.
					Also created a new search to be used by this script: Sales Order to be processed for Auto Maint. Oppty - Do not Delete
Date			: 06/24/2013
==================================================================================
Change ID		:CH#SHIP_TO_ADDR
Programmer		:Sagar Shah
Description		: Fix the tax issue by copying the Ship to address from Sales order to the Opportunity. This would avoid the system from 
					assigning the defualt ship to address from the customer record.
Date			: 08/30/2013
==================================================================================
Change ID		:CH#SUBSIDIARY_UPDATE
Programmer		:Sagar Shah
Description		: Rudy Basa requested to assign opportunity for LAGAN and Ciboodle US subs to him
Date			: 02/11/2014
*/
// END SCRIPT DESCRIPTION BLOCK  ===================================================================================
//CH#GENERIC_MAINT_ITEM - start

/**
 * Audaxium Update: 6/4/2014.
 * 1. Update script so that different notification email addresses are parameterized
 * 2. Process ONLY select few.
 */

//Single Email Address
var paramSendErrorToEmail = nlapiGetContext().getSetting('SCRIPT','custscript_ax6_erremail');

//Comma separated list of email addresses
var paramSendErrorToCcEmail = nlapiGetContext().getSetting('SCRIPT','custscript_ax6_errccemail');
//array version
var paramSendErrorToCcEmailArray = null;

//(subsidiary == '1' || subsidiary == '6' || subsidiary == '23' || subsidiary == '40' )
var paramSpecificSubsidiaryNotifyEmployee = nlapiGetContext().getSetting('SCRIPT','custscript_ax6_specsubsemp');
var paramOtherSubsidiaryNotifyEmployee = nlapiGetContext().getSetting('SCRIPT','custscript_ax6_othersubsemp');
//sNetsuiteEmailId - Send Email From
var paramSendEmailFromEmployee = nlapiGetContext().getSetting('SCRIPT','custscript_ax6_emailfromemp');
//Successful Opp Creation Notification CC
//Comma separated list of email addresses
var paramOpptySuccessCcEmail = nlapiGetContext().getSetting('SCRIPT','custscript_ax6_oppsuc_ccemail');
var paramOpptySuccessCcEmailArray = null;
//Comma separated list of email addresses
var paramOpptySuccessBccEmail = nlapiGetContext().getSetting('SCRIPT','custscript_ax6_oppsuc_bccemail');
var paramOpptySuccessBccEmailArray = null;

//Saved Search IDs
var paramGenericMaintItemSavedSearch = nlapiGetContext().getSetting('SCRIPT','custscript_ax6_genmaintitemss');
var paramToBeProcessedSalesOrderSavedSearch = nlapiGetContext().getSetting('SCRIPT', 'custscript_ax6_procsoss');

//Opportunity Form ID
var paramOppForm = nlapiGetContext().getSetting('SCRIPT','custscript_ax6_oppformid');

var genItemList = new Array();

/**
 * Remove empty spaces before and after a string.
 * NS may return char type behavior when returning text back.
 * ie) When char field is set to 30 and actual string is 20, value returned may still be 30
 * @param {Object} stringToTrim
 */
function auxStrTrim(stringToTrim) {
	if (!stringToTrim) {
		return '';
	}
	return stringToTrim.replace(/^\s+|\s+$/g,"");	
}

function getGenericMaintItemList()
{
		var columns = new Array();
		columns[0] =	new nlobjSearchColumn('internalid');
		columns[1] =	new nlobjSearchColumn('custitem_item_type');
		columns[2] =	new nlobjSearchColumn('custitem_item_type_4_scripting');
		
		//Search Name: Generic Maintenance Item List
		var searchresults = nlapiSearchRecord('item', paramGenericMaintItemSavedSearch, null, columns);
		//var searchresults = nlapiSearchRecord('item', 'customsearch_gen_maint_item_list', null, columns);
	
		for (var i = 0; searchresults != null && i < searchresults.length; i++ )
		{
			genItemList[searchresults[i].getText('custitem_item_type')+'-'+searchresults[i].getText('custitem_item_type_4_scripting')] = searchresults[i].getValue('internalid');
		}
}
//CH#GENERIC_MAINT_ITEM - end

// Begin Global Variables ==========================================================================================
	// User id
	var userId;
	// record object (for record just submitted) & record id for Sales Order
	var soRecord;
	var soId;
	// Loading the Sales order record using internal id
	var record;
	// Customer Id
	var customer;
	//Delivery Email id
	var deliveryEmail; //CH#AUTO_MR_QUOTE
// Start Date
	var soStartDate;
	// End Date
	var soEndDate;
	// Class of Sale
	var classOfSale;
	// variable for total number of items in Item machine
	var itemCount;
	// initialising variable for number of items added to above arrays
	var arrayCount = 0;
	var subsidiary;
	var snewdealOrRenewal;
	var scurrencyname;
	var soTranDate;//CH#FINE_TUNING_MAR2013
	
	//CH#SHIP_TO_ADDR - start
	var soShipAddressList;
	var soShipAddress;
	//CH#SHIP_TO_ADDR - end
	
	// declaring an array for item, category, license group, license type, support level
	// support pecentage, quantity, license units and price
	var soItem = new Array();
	var soItemProductFamily = new Array();
	var soItemMaintType = new Array(); //CH#GENERIC_MAINT_ITEM
	var soItemOldMaintType = new Array(); //CH#GENERIC_MAINT_ITEM
	var soItemProductFamilyText = new Array();  //CH#GENERIC_MAINT_ITEM
	var soItemCat = new Array();
	var soItemQty = new Array();
	var soItemQtyType = new Array();
	var soItemQtyTypePrint = new Array();
	var soItemStartDate = new Array();
	var soItemStartDateRenewal = new Array();
	var soItemEndDate = new Array();
	var soItemEndDateRenewal = new Array();
	var soItemMaintenencePercent = new Array();
	var soDescription = new Array();
	var renewWith = new Array();
	var rateOfItem = new Array();
	var noOfMonths = new Array();
	var discount = new Array();
	var soamount = new Array();
	var soitemclass = new Array();
	var soItemType = new Array();
	var soItemTaxCode = new Array();
	var soItemTaxRate = new Array();
	var soItemTaxAmt = new Array();
	var soPriorSalesOrders='';
	var sfromCharCode = 5;	
	var customform;
	
	var newDiscount;
	// Contract Item record
	var contractItemRecord;
	// Loop Variables
	var j = 0;
	var k = 0 ;

	var soppItem;
	var soppItemProductFamily;
	var soppItemMaintType; //CH#GENERIC_MAINT_ITEM
	var soppItemOldMaintType; //CH#GENERIC_MAINT_ITEM
	var soppItemProductFamilyText; //CH#GENERIC_MAINT_ITEM
	var soppDescription;
	var soppItemCat;
	var soppItemQty;
	var soppItemQtyType;
	var soppItemQtyTypePrint;
	var soppItemStartDate;
	var soppItemEndDate;
	var sopprateOfItem;
	var soppItemMaintenencePercent;
	var soppnoOfMonths;
	var soppdiscount;
	var soppamount=0;
	var soppitemtype;
	var soppitemtaxcode;
	var soppitemtaxrate;
	var soppitemtaxamt;
	var snexus;
	
	var countOfMaintItems=0;
	var originalsalesordernumber;
	var sprojectedtotal=0;
	var exchangerate;
	var expectedclosedate;
	var createOpp; 								// instance of opportunity
	var soppitemclass;
	var currency;

	var salesteamemp = new Array();
	var salesteamrole = new Array();
	var salesteamprimary = new Array();
	var salesteamcontributon = new Array();
	var salesteamcount = 0;

	var endcustomer=0;
	var supportcustomer=0;

	var customername;
	var customerCIR;
	
	var endcustomerCIR;
	var endcustomername;

	var opportunityrecord;
	var itemrecord;
	var opportunitydate;

	var sOppStartDate;
	var sOppEndDate;
	var sRenewalRepIDForEmailNotify;
	
	/** Aux Mod: 6/4/2014
	 * Grab value from Parameter
	 */
	var sNetsuiteEmailId = paramSendEmailFromEmployee;
	//var sNetsuiteEmailId = 16921;
	
	var entitystatus = 23;
	
// End Global Variables ============================================================================================

// Begin Debug Variables ===========================================================================================
	// debugging variables for ordering execution logs and e-mail alerts
	var padToLen = 3;
	var n = 1;	
	// Flags
	var debugLog            = true;
	var debugStr            = null;
	var errorText           = null;
	var emailText		= null;
// End Debug Variables ==============================================================================================

//scheduled event variables start
	var soSearchResults;
	var soCount=0;

	//CH#TIMEOUT_ERROR - start
	//Search Name: Sales Order to be processed for Auto Maint. Oppty - Do not Delete
	var SEARCH_SO_TO_BE_PROCESSED = paramToBeProcessedSalesOrderSavedSearch;
	//var SEARCH_SO_TO_BE_PROCESSED = 'customsearch_so_for_auto_maint_oppty';	
	
	
	//Old Search Name: Yesterdays Sales Order Approvals
	//var SEARCH_SO_APPROVED_YESTERDAY = 'customsearch_yesterday_so_approvals';	//check this value in production
	//var SEARCH_SO_APPROVED_YESTERDAY = 'customsearch_so_approval_particular';	//check this value in production
	//CH#TIMEOUT_ERROR - end

	var soInternalId=0;
        var oldsoInternalId=-1;
        
//scheduled event variables end

//process_approved_sales_orders();		//use this only for debugging. otherwise scheduled event calls this directly

function initialize()
{
	sprojectedtotal=0;
	sAmount=0;
	arrayCount = 0;
	soItem = new Array();
	soItemProductFamily = new Array();
	soItemMaintType = new Array(); //CH#GENERIC_MAINT_ITEM
	soItemOldMaintType = new Array(); //CH#GENERIC_MAINT_ITEM
	soItemProductFamilyText = new Array(); //CH#GENERIC_MAINT_ITEM
	soItemCat = new Array();
	soItemQty = new Array();
	soItemQtyType = new Array();
	soItemQtyTypePrint = new Array();
	soItemStartDate = new Array();
	soItemStartDateRenewal = new Array();
	soItemEndDate = new Array();
	soItemEndDateRenewal = new Array();
	soItemMaintenencePercent = new Array();
	soDescription = new Array();
	renewWith = new Array();
	rateOfItem = new Array();
	noOfMonths = new Array();
	discount = new Array();
	soamount = new Array();
	soitemclass = new Array();
	soItemType = new Array();
	soItemTaxCode = new Array();
	soItemTaxRate = new Array();
	soItemTaxAmt = new Array();
	soPriorSalesOrders = '';
	
	salesteamemp = new Array();
	salesteamrole = new Array();
	salesteamprimary = new Array();
	salesteamcontributon = new Array();
	
	//CH#SHIP_TO_ADDR - start
	soShipAddressList=null;
	soShipAddress=null;
	//CH#SHIP_TO_ADDR - end
	
}

function process_approved_sales_orders()
{

	/**
	 * AUX: 6/4/2014
	 * Convert CC email addresses into an array
	 */
	if (auxStrTrim(paramSendErrorToCcEmail)) {
		paramSendErrorToCcEmailArray = paramSendErrorToCcEmail.split(',');
	}

	if (auxStrTrim(paramOpptySuccessCcEmail)) {
		paramOpptySuccessCcEmailArray = paramOpptySuccessCcEmail.split(',');
	}
	
	if (auxStrTrim(paramOpptySuccessBccEmail)) {
		paramOpptySuccessBccEmailArray = paramOpptySuccessBccEmail.split(',');
	}
	
	
	getGenericMaintItemList(); //CH#GENERIC_MAINT_ITEM

	var functionName = 'process_approved_sales_orders';
	
	if(debugLog) {
		nlapiLogExecution ('DEBUG', nsc_AutoNum(n++, 'Entering Function : ', padToLen), functionName );
	}

	try {
		custSearchResults = nlapiSearchRecord('salesorder', SEARCH_SO_TO_BE_PROCESSED, null, null);

		if(null != custSearchResults && custSearchResults.length > 0) {
			if(debugLog){
				nlapiLogExecution ('DEBUG', nsc_AutoNum(n++, 'custSearchResults.length : ', padToLen),custSearchResults.length);
			}
			
			//50 at a time.
			//custSearchResults.length
			for(var soCount = 0; soCount < custSearchResults.length; soCount++){
                soInternalId = custSearchResults[soCount].getId();

				if(debugLog){
					nlapiLogExecution ('DEBUG', nsc_AutoNum(n++, 'Sales Order Internal ID : ', padToLen), soInternalId);
				}
				
				if(oldsoInternalId != soInternalId){
					initialize();
					processSalesOrder(custSearchResults[soCount].getRecordType(), soInternalId);						
				}
				
				oldsoInternalId = soInternalId;
			}
		}
	} catch(exception){
		if (exception instanceof nlobjError) {
			errorText = 'UNEXPECTED ERROR: ATTEMPTING TO CREATE Opportunity in Submit' + '\n\n' +
						'Script Name : kana_ss_create_opp_from_sales_order_scheduled.js' + '\n' +
						'Original sales order number : ' + originalsalesordernumber + '\n' +
						'Event Called : ' + exception.getUserEvent() + '\n' +
						'Error Code: ' + exception.getCode() + '\n' +
						'Error Details: ' + exception.getDetails() + '\n\n' +
						'Stack Trace: ' + exception.getStackTrace();
			nlapiLogExecution('ERROR', nsc_AutoNum(n++, 'Unexpected Error ', padToLen), errorText);
			nlapiSendEmail(sNetsuiteEmailId,paramSendErrorToEmail, 'Error Message', errorText,paramSendErrorToCcEmailArray, null);
			//nlapiSendEmail(sNetsuiteEmailId,'kana-app-notification@kana.com', 'Error Message', errorText,null, null);
			return;
		} else { 
			// catch error if any other exception occurs
			errorText = 'UNEXPECTED ERROR: ATTEMPTING TO CREATE Opportunity in Submit' + '\n\n' +
						'Original sales order number : ' + originalsalesordernumber + '\n' +
						'Script Name: kana_ss_create_opp_from_sales_order_scheduled.js' + '\n' +
						'Error Details: ' + exception.toString();
           	nlapiLogExecution('ERROR', nsc_AutoNum(n++, 'Unexpected Error ', padToLen), errorText);
           	nlapiSendEmail(sNetsuiteEmailId,paramSendErrorToEmail, 'Error Message', errorText,paramSendErrorToCcEmailArray, null);
			//nlapiSendEmail(sNetsuiteEmailId,'kana-app-notification@kana.com', 'Error Message', errorText,null, null);
           	return;
		}
	}

	if(debugLog) {
		nlapiLogExecution ('DEBUG', nsc_AutoNum(n++, 'Leaving Function : ', padToLen), functionName );
	}
	
	
}


function processSalesOrder(srecordtype, soId)
{
	// Local Variables
	// Function Name
	var functionName;
	var statusFlag = true;//CH#TIMEOUT_ERROR
	functionName = "retrieveSalesOrder";		
	// End Local Variables
	
	try {
		
		if (debugLog) {
			nlapiLogExecution ('DEBUG', nsc_AutoNum(n++, 'Enter Function ', padToLen), functionName);
		}
		
		// Loading record submitted into an object
		record = nlapiLoadRecord(srecordtype, soId);

		originalsalesordernumber = record.getFieldValue("tranid");

		if(debugLog) {
			debugStr = 'userId : ' + ''+ '\n' +
				   'soRecord : ' + record + '\n' +
				   'soId : ' + soId + '\n' +
				   'originalsalesordernumber : ' + originalsalesordernumber + '\n' +
				   'record : ' + record;
			nlapiLogExecution ('DEBUG', nsc_AutoNum(n++, 'debugStr : ', padToLen), debugStr);
			debugStr = '';
		}

		customer = record.getFieldValue('entity');

		//Audaixum Update: 7/16/2014 - There were two Customers identified as Inactive and Rudy provided replacement.
		//		Replacement customers have different Subsidiary and potentially different nexus values 
		if (customer == '26738') {
			//7081 City of Boston is inactive
			//Replacement: 	7875 City of Boston  
			customer = '30190';
		} 
		
		/**
		if (customer == '46376') {
			//8838 ING Postbank is inactive
			//Replacement: ?
			//customer = '';
		}
		*/
		
		deliveryEmail = record.getFieldValue('custbody_delivery_email'); //CH#AUTO_MR_QUOTE

		//get the customer name
		customerCIR = nlapiLoadRecord('customer', customer);
		customername = customerCIR.getFieldValue('companyname');
		
		//get susidiary
		subsidiary = customerCIR.getFieldValue('subsidiary');

		
		soTranDate = record.getFieldValue('trandate');//CH#FINE_TUNING_MAR2013
		
		// Get the Start Date of SO
		soStartDate = record.getFieldValue('startdate');

		// Get the End Date of SO
		soEndDate = record.getFieldValue('enddate');
		// Get the Class of Sale

		classOfSale = record.getFieldValue('custbody_class_of_sale');
		
		//do not process Managed Services transactions
		//7/11/2014 - Based on Client Request, REMOVE this Hard code of option put in previously.
		if((classOfSale == 'Managed Services') || (classOfSale == '6')){
			//return;
		}

		//CH#SHIP_TO_ADDR - start		
		soShipAddressList = record.getFieldValue('shipaddresslist');
		soShipAddress = record.getFieldValue('shipaddress');
		//CH#SHIP_TO_ADDR - end
		
		
		snewdealOrRenewal = "";

		if(classOfSale == "1"){			 //license and initial maintenance
			snewdealOrRenewal = "New Deal Renewal";
		}else{
			snewdealOrRenewal = "Maintenance Renewal";
		}
		
		//get currency name
		scurrencyname = record.getFieldValue('currencyname');

		//get the custom form
		customform = record.getFieldValue('customform');

		//currency
		currency = record.getFieldValue('currencyname');

		//exchangerate
		exchangerate = record.getFieldValue('exchangerate');

		//end customer
		endcustomer = record.getFieldValue('custbody_end_customer');

		endcustomername = '';
		//get the end customer name
		if((endcustomer != null) && (endcustomer != 0)){
			endcustomerCIR = nlapiLoadRecord('customer', endcustomer);
			endcustomername = endcustomerCIR.getFieldValue('companyname');
		}

		//support customer
		supportcustomer = record.getFieldValue('custbody_service_support');
		
		//nexus
		snexus = record.getFieldValue('nexus');
		//snexus = '37';
		
		//get prior sales orders
		soPriorSalesOrders = record.getFieldValue('custbody_prior_sales_orders');
		if(soPriorSalesOrders.length < 1){
			soPriorSalesOrders = soInternalId;
		}else{
			soPriorSalesOrders = soPriorSalesOrders + String.fromCharCode(5) + soInternalId;
		}
		
		// getting the number of items in the SO record
		itemCount = record.getLineItemCount('item');
		if(debugLog) {
			debugStr = 'customer : ' + customer + '\n' +
				   'soStartDate : ' + soStartDate + '\n' +
				   'soEndDate : ' + soEndDate + '\n' +
				   'classOfSale : ' + classOfSale + '\n' +
				   'custom form : ' + customform + '\n' +
				   'currency : ' + currency + '\n' +
				   'exchange rate : ' + exchangerate + '\n' +
				   'end customer : ' + endcustomer + '\n' +
				   'customer name : ' + customername + '\n' + 
				   'support customer : ' + supportcustomer + '\n' +
				   'nexus : ' + snexus + '\n' +
				   'soPriorSalesOrders : ' + soPriorSalesOrders + '\n' + 
				   'itemCount : ' + itemCount;
			nlapiLogExecution ('DEBUG', nsc_AutoNum(n++, 'debugStr : ', padToLen), debugStr);
			debugStr = '';
		}
		for (var i = 1; i <= itemCount ; i++) {
			// Item Id
			soItem[arrayCount] = record.getLineItemValue('item', 'item', i);

			// Item Type
			soItemType[arrayCount] = record.getLineItemValue('item','itemtype',i);
			
			soItemTaxCode[arrayCount] = 0;
			soItemTaxRate[arrayCount] = '';
			soItemTaxAmt[arrayCount] = 0;
			
			//CH#SHIP_TO_ADDR - start
			//if((subsidiary != 1) && (subsidiary != 23)){
				//Tax code
			soItemTaxCode[arrayCount] = record.getLineItemValue('item','taxcode', i);
			soItemTaxRate[arrayCount] = record.getLineItemValue('item','taxrate', i);
			soItemTaxAmt[arrayCount] = record.getLineItemValue('item','tax1amt', i);
			//}
			//CH#SHIP_TO_ADDR - end
			
			
			//Maint. Type
			soItemMaintType[arrayCount] = record.getLineItemValue('item', 'custcol_gen_maint_type', i);   //CH#GENERIC_MAINT_ITEM
			soItemOldMaintType[arrayCount] = record.getLineItemValue('item', 'custcol_maintenance_type', i);   //CH#GENERIC_MAINT_ITEM

			soItemProductFamilyText[arrayCount] = record.getLineItemText('item', 'custcol_item_type', i);   //CH#GENERIC_MAINT_ITEM

			// Product Family
			soItemProductFamily[arrayCount] = record.getLineItemValue('item', 'custcol_item_type', i);

			// Item Description
			soDescription[arrayCount] = record.getLineItemValue('item', 'description', i);

			// Item Category
			soItemCat[arrayCount] = record.getLineItemValue('item', 'custcol_item_type_4_scripting', i);

			// Contract Item Status --  mandatory on Contract Item Record -- No Mapping on SO Items

			// Quantity
			soItemQty[arrayCount] = record.getLineItemValue('item', 'quantity', i);

			// Quantity Type
			soItemQtyType[arrayCount] = record.getLineItemValue('item', 'custcol_qty_type', i);

			//Quantity Type for printing
			soItemQtyTypePrint[arrayCount] = record.getLineItemValue('item','custcol_quantity_type_for_printing', i);

			// RR Start Date
			soItemStartDate[arrayCount] = record.getLineItemValue('item', 'revrecstartdate', i);
			soItemStartDateRenewal[arrayCount] = record.getLineItemValue('item', 'custcol_renewal_st_date', i);

			// RR End Date
			soItemEndDate[arrayCount] = record.getLineItemValue('item', 'revrecenddate', i);
			soItemEndDateRenewal[arrayCount] = record.getLineItemValue('item', 'custcol_renewal_end_dt', i);

			// Renew  With -- is the id of maintenace 
			renewWith[arrayCount] = record.getLineItemValue('item', 'custcol_renew_with', i);

			// Renewal Processed On -- date on which quotes are generated

			// Original Sales Order -- so id

			// Original Item Price -- Rate of the item
			rateOfItem[arrayCount] = record.getLineItemValue('item', 'rate', i);

			//soItemPrice[arrayCount] = record.getLineItemValue('item', 'price', i);

			// Renewal Price -- ?

			// Maintenance Level -- sourced value on contract item record

			// Maintenance Percentage
			soItemMaintenencePercent[arrayCount] = 
					    record.getLineItemValue('item', 'custcol_maintenance_percentage', i);

			// End Of Life -- date sourced from item

			// End of Maintenance -- date sourced from item

			// Number Of Months
			noOfMonths[arrayCount] =  record.getLineItemValue('item', 'custcol_number_of_months', i);

			// Discount
			discount[arrayCount] = record.getLineItemValue('item', 'custcol_discount', i);

			//Amount
			soamount[arrayCount] = record.getLineItemValue('item', 'amount', i);

			//class
			soitemclass[arrayCount] = record.getLineItemValue('item','class',i);


			if (debugLog) {
				debugStr = ' soItem[arrayCount] : ' + soItem[arrayCount] + '\n' +
					   ' soItemProductFamily[arrayCount] : ' + soItemProductFamily[arrayCount] + '\n' +
					   ' soItemMaintType[arrayCount] : ' + soItemMaintType[arrayCount] + '\n' +//CH#GENERIC_MAINT_ITEM
					   ' soItemCat[arrayCount] : ' + soItemCat[arrayCount] + '\n' +
					   ' soItemType[arrayCount] : ' + soItemType[arrayCount] + '\n' +
					   ' soItemTaxCode[arrayCount] : ' + soItemTaxCode[arrayCount] + '\n' +
					   ' soItemTaxRate[arrayCount] : ' + soItemTaxRate[arrayCount] + '\n' +
					   ' soItemTaxAmt[arrayCount] : ' + soItemTaxAmt[arrayCount] + '\n' +
					   ' soItemQty[arrayCount] : ' + soItemQty[arrayCount] + '\n' +
					   ' soItemQtyType[arrayCount] : ' + soItemQtyType[arrayCount] + '\n' +
					   ' soItemQtyTypePrint[arrayCount] : ' + soItemQtyTypePrint[arrayCount] + '\n' +
					   ' soDescription[arrayCount] : ' + soDescription[arrayCount] + '\n' +
					   //' soItemProductFamily[arrayCount] : ' + soItemProductFamily[arrayCount] + '\n' +
					   ' soItemStartDate[arrayCount] : ' + soItemStartDate[arrayCount] + '\n' +
					   ' soItemEndDate[arrayCount] : ' + soItemEndDate[arrayCount] + '\n' +
					   ' soItemStartDateRenewal[arrayCount] : ' + soItemStartDateRenewal[arrayCount] + '\n' +
					   ' soItemEndDateRenewal[arrayCount] : ' + soItemEndDateRenewal[arrayCount] + '\n' +
					   //' soItemMaintenencePercent[arrayCount] : ' + soItemMaintenencePercent[arrayCount] + '\n' +
					   //' renewWith[arrayCount] : ' + renewWith[arrayCount] + '\n' +
					   ' rateOfItem[arrayCount] : ' + rateOfItem[arrayCount] + '\n' +
					   ' noOfMonths[arrayCount] : ' + noOfMonths[arrayCount] + '\n' +
					   //' discount[arrayCount] : ' + discount[arrayCount] + '\n' +
					   ' soamount[arrayCount] : ' + soamount[arrayCount] + '\n' +
					   ' soitemclass[arrayCount] : ' + soitemclass[arrayCount]+ '\n' +
					   ' arrayCount : ' + arrayCount;
				nlapiLogExecution ('DEBUG', nsc_AutoNum(n++, 'DebugStr : ', padToLen), debugStr);
				emailText += debugStr;
				debugStr = '';
			}
			arrayCount += 1;

			}

			salesteamcount = record.getLineItemCount('salesteam');

			var isalesteamcount=0;

			for (var ii = 1; ii <= salesteamcount ; ii++) {
				salesteamemp[isalesteamcount] = record.getLineItemValue('salesteam', 'employee', ii);
				salesteamrole[isalesteamcount] = record.getLineItemValue('salesteam', 'salesrole', ii);
				salesteamprimary[isalesteamcount] = record.getLineItemValue('salesteam', 'isprimary', ii);
				salesteamcontributon[isalesteamcount] = record.getLineItemValue('salesteam', 'contribution', ii);


				if (debugLog) {
					debugStr = ' salesteamemp[isalesteamcount] : ' + salesteamemp[isalesteamcount] + '\n' +
						   ' salesteamrole[isalesteamcount] : ' + salesteamrole[isalesteamcount] + '\n' +
						   ' salesteamprimary[isalesteamcount] : ' + salesteamprimary[isalesteamcount] + '\n' +
						   ' salesteamcontributon[isalesteamcount] : ' + salesteamcontributon[isalesteamcount] + '\n' +
						   ' isalesteamcount : ' + isalesteamcount;
					nlapiLogExecution ('DEBUG', nsc_AutoNum(n++, 'DebugStr : ', padToLen), debugStr);
				}
				isalesteamcount = isalesteamcount + 1;
			}			

			//CH#TIMEOUT_ERROR - start
			statusFlag = createOpportunity();
			if(statusFlag) {
				//update the sales order flag 'Is Processed for Auto Maint. Oppty?' to true	
				nlapiSubmitField(srecordtype, soId, 'custbody_isprocessed_4_automaint_oppty', 'T');
			}
			//CH#TIMEOUT_ERROR - end

		if (debugLog) {
			nlapiLogExecution ('DEBUG', nsc_AutoNum(n++, 'Exit Function ', padToLen), functionName);
		}
	} catch(exception){
		if (exception instanceof nlobjError) {
			errorText = 'UNEXPECTED ERROR: ATTEMPTING TO CREATE Opportunity in Submit' + '\n\n' +
						'Script Name : kana_ss_create_opp_from_sales_order_scheduled.js' + '\n' +
						'Original sales order number : ' + originalsalesordernumber + '\n' +
						'Event Called : ' + exception.getUserEvent() + '\n' +
						'Error Code: ' + exception.getCode() + '\n' +
						'Error Details: ' + exception.getDetails() + '\n\n' +
						'Stack Trace: ' + exception.getStackTrace();
			nlapiLogExecution('ERROR', nsc_AutoNum(n++, 'Unexpected Error ', padToLen), errorText);
			nlapiSendEmail(sNetsuiteEmailId,paramSendErrorToEmail, 'Error Message', errorText,paramSendErrorToCcEmailArray, null);
			//nlapiSendEmail(sNetsuiteEmailId,'kana-app-notification@kana.com', 'Error Message', errorText,null, null);
			return ;
		} else { 
			// catch error if any other exception occurs
			errorText = 'UNEXPECTED ERROR: ATTEMPTING TO CREATE Opportunity in Submit' + '\n\n' +
						'Original sales order number : ' + originalsalesordernumber + '\n' +
						'Script Name: kana_ss_create_opp_from_sales_order_scheduled.js' + '\n' +
						'Error Details: ' + exception.toString();
           	nlapiLogExecution('ERROR', nsc_AutoNum(n++, 'Unexpected Error ', padToLen), errorText);
           	nlapiSendEmail(sNetsuiteEmailId,paramSendErrorToEmail, 'Error Message', errorText,paramSendErrorToCcEmailArray, null);
			//nlapiSendEmail(sNetsuiteEmailId,'kana-app-notification@kana.com', 'Error Message', errorText);
			return ;
		}
	}	
}

function addSalesTeam()
{
	var isalesteamcount=0;
	sRenewalRepIDForEmailNotify = 0;

	
	try
	{
		var functionName = "addSalesTeam()";
		if(debugLog) {
			nlapiLogExecution ('DEBUG', nsc_AutoNum(n++, 'Enter Function : ', padToLen), functionName);
		}

		var salesrepcount  = createOpp.getLineItemCount('salesteam');
		if(debugLog) {
			nlapiLogExecution ('DEBUG', nsc_AutoNum(n++, 'Before Add Sales Team Total SalesTeam Members : ', padToLen), salesrepcount);
		}
	
		//remove the existing members of the sales team
		for(var iii=salesrepcount; iii >0; iii--)
		{
			createOpp.removeLineItem('salesteam', iii);
		}		

		salesrepcount  = createOpp.getLineItemCount('salesteam');
		if(debugLog) {
			nlapiLogExecution ('DEBUG', nsc_AutoNum(n++, 'After Add Sales Team Total SalesTeam Members : ', padToLen), salesrepcount);
		}
		
		//CH#SALES_REP_REASSIGNMENT_1  -  start
		/*
		//check if renewal rep is part of the sales team
		for(var i=0; i<salesteamemp.length ; i++)
		{
			//if(salesteamrole[i] == '5'){
			//if((salesteamemp[i] == '69') || (salesteamemp[i] == '68')) //Removing Ruby emp no. '68'
			if(salesteamemp[i] == '69')
			{
				sRenewalRepIDForEmailNotify = salesteamemp[i];
				isalesteamcount=isalesteamcount+1;
				createOpp.insertLineItem('salesteam', isalesteamcount);
				createOpp.setLineItemValue('salesteam', 'employee', isalesteamcount,salesteamemp[i] );
				//we have inactive sales role assgined to sales orders
				//createOpp.setLineItemValue('salesteam', 'salesrole', isalesteamcount,salesteamrole[i] );
				createOpp.setLineItemValue('salesteam', 'salesrole', isalesteamcount, '5');
				createOpp.setLineItemValue('salesteam', 'isprimary', isalesteamcount,'T' );
				createOpp.setLineItemValue('salesteam', 'contribution', isalesteamcount,'100%' );
				break;
			}
		}
		*/
		// if subsidiary is 1 or 6 (KANA Software Inc or Kana Software Canada) should go to 69 (Rudy Basa)
		// else should go to 26122 (Alanna Johnston) and 28476 (Eimear McArdle)

		var additionalSalesRep = null;
		//CH#SUBSIDIARY_UPDATE - adding two more subs LAGAN US and Ciboodle US
		if(subsidiary == '1' || subsidiary == '6' || subsidiary == '23' || subsidiary == '40' ){ 
			sRenewalRepIDForEmailNotify = paramSpecificSubsidiaryNotifyEmployee;
			//sRenewalRepIDForEmailNotify = '69'; 
		}else{
			sRenewalRepIDForEmailNotify = paramOtherSubsidiaryNotifyEmployee;
			//sRenewalRepIDForEmailNotify = '26122'; 
			//additionalSalesRep = '28476'; //Eimear McArdle has left kana
		}
		if(sRenewalRepIDForEmailNotify != null)
		{
			var isRenewalRepInActive = nlapiLookupField('employee', sRenewalRepIDForEmailNotify, 'isinactive'); 	//CH#FINE_TUNING_MAR2013
			if(isRenewalRepInActive=='F')
			{
				isalesteamcount=isalesteamcount+1;
				createOpp.insertLineItem('salesteam', isalesteamcount);
				createOpp.setLineItemValue('salesteam', 'employee',isalesteamcount, sRenewalRepIDForEmailNotify );
				createOpp.setLineItemValue('salesteam', 'salesrole', isalesteamcount, '5' );
				createOpp.setLineItemValue('salesteam', 'isprimary', isalesteamcount,'T' );
				createOpp.setLineItemValue('salesteam', 'contribution', isalesteamcount,'100%' );
			}
		}

		
		if(additionalSalesRep != null)
		{			
			var isAdditionalSalesRepInActive = nlapiLookupField('employee', additionalSalesRep, 'isinactive'); 	//CH#FINE_TUNING_MAR2013
			if(isAdditionalSalesRepInActive=='F')
			{
				isalesteamcount=isalesteamcount+1;
				createOpp.insertLineItem('salesteam', isalesteamcount);
				createOpp.setLineItemValue('salesteam', 'employee',isalesteamcount, additionalSalesRep );
				createOpp.setLineItemValue('salesteam', 'salesrole', isalesteamcount, '5' );
				createOpp.setLineItemValue('salesteam', 'isprimary', isalesteamcount,'F' );
				createOpp.setLineItemValue('salesteam', 'contribution', isalesteamcount,'0%' );
			}
		}
		//CH#SALES_REP_REASSIGNMENT_1  -  end


	} catch (exception) {
		if (exception instanceof nlobjError) {
			errorText = 'UNEXPECTED ERROR: ATTEMPTING TO add sales teams' + '\n\n' +
						'Script Name : kana_ss_create_opp_from_sales_order_scheduled.js' + '\n' +
						'Original sales order number : ' + originalsalesordernumber + '\n' +
						'Event Called : ' + exception.getUserEvent() + '\n' +
						'Error Code: ' + exception.getCode() + '\n' +
						'Error Details: ' + exception.getDetails() + '\n\n' +
						'Stack Trace: ' + exception.getStackTrace();
			nlapiLogExecution('ERROR', nsc_AutoNum(n++, 'Unexpected Error', padToLen), errorText);
			nlapiSendEmail(sNetsuiteEmailId,paramSendErrorToEmail, 'Error Message', errorText,paramSendErrorToCcEmailArray, null);
			//nlapiSendEmail(sNetsuiteEmailId,'kana-app-notification@kana.com', 'Error Message', errorText);
			return;
		} else { 
			// catch error if any other exception occurs
			errorText = 'UNEXPECTED ERROR: ATTEMPTING TO add sales items' + '\n\n' +
						'Original sales order number : ' + originalsalesordernumber + '\n' +
						'Script Name: kana_ss_create_opp_from_sales_order_scheduled.js' + '\n' +
						'Error Details: ' + exception.toString();
	       	nlapiLogExecution('ERROR', nsc_AutoNum(n++, 'Unexpected Error', padToLen), errorText);
	       	nlapiSendEmail(sNetsuiteEmailId,paramSendErrorToEmail, 'Error Message', errorText,paramSendErrorToCcEmailArray, null);
			//nlapiSendEmail(sNetsuiteEmailId,'kana-app-notification@kana.com', 'Error Message', errorText);
		return;
		}
	}
	if(debugLog) {
		nlapiLogExecution ('DEBUG', nsc_AutoNum(n++, 'Leaving Function : ', padToLen), functionName);
	}
	
}

function addLineItems()
{
	var sUnitPrice;
	var sAmount=0;
	var noofdays=365;
	var dtFullYear;
	var noofdayscurrent=0;
	var priceperday=0;
	var soppdatediff=0;
	
	try
	{
		var functionName = "addLineItems()";
		if(debugLog) {
			nlapiLogExecution ('DEBUG', nsc_AutoNum(n++, 'Enter Function : ', padToLen), functionName);
		}
		
		//CH#FINE_TUNING_MAR2013 - start
		//if the start date is null or/and end date is null calculate the start date from Sales Order date and default the end date as 1 yr from the start date.
		if( (soppItemStartDate==null || soppItemEndDate==null) && soTranDate!=null )
		{
			soppItemStartDate = nlapiStringToDate(soTranDate);
			if(soppItemQty > 0)
				soppItemEndDate = nlapiAddMonths(soppItemStartDate, soppItemQty);
			else
				soppItemEndDate = nlapiAddMonths(soppItemStartDate, 12);
		
			soppItemStartDate = nlapiDateToString(soppItemStartDate,'mm/dd/yyyy');
			soppItemEndDate = nlapiDateToString(soppItemEndDate,'mm/dd/yyyy');
			
		}
		//CH#FINE_TUNING_MAR2013 - end

		soppdatediff = dateDiff(soppItemEndDate, soppItemStartDate);
		sOppStartDate = new Date(soppItemEndDate);
		sOppStartDate = nlapiAddDays(sOppStartDate, 1);
		if(debugLog) {
			nlapiLogExecution ('DEBUG', nsc_AutoNum(n++, 'Add 1 Opp Start Date : ', padToLen), sOppStartDate);
		}
		
		
		sOppEndDate = new Date(sOppStartDate);
		sOppEndDate = nlapiAddDays(sOppEndDate, 364);
		
		//CH#CHECK_LEAP_YEAR -- start
		var leapYearFlag = isLeapYear_kana(nlapiDateToString(sOppStartDate,'mm/dd/yyyy'),nlapiDateToString(sOppEndDate,'mm/dd/yyyy'));
		if(leapYearFlag == true) {
			sOppEndDate = nlapiAddDays(sOppEndDate, 1);		//change end date to +1 for leap year
			noofdays = 366;						//calculate price for 366 days
		}
        /*
		//Is the end date in a leap year?
		dtFullYear = sOppEndDate.getFullYear();
		if((dtFullYear % 4 == 0) && (sOppEndDate.getMonth() > 2 )){
			sOppEndDate = nlapiAddDays(sOppEndDate, 1);		//change end date to +1 for leap year
			noofdays = 366;						//calculate price for 366 days
		}
		*/
		//CH#CHECK_LEAP_YEAR -- end


		if(debugLog) {
			nlapiLogExecution ('DEBUG', nsc_AutoNum(n++, 'Add 2 Opp End Date : ', padToLen), sOppEndDate);
		}

		if(debugLog) {
			nlapiLogExecution ('DEBUG', nsc_AutoNum(n++, 'Add 2-1 noofdays : ', padToLen), noofdays );
		}

		//calculate price per day from existing line item
		noofdayscurrent = dateDiff(soppItemEndDate, soppItemStartDate);
		if(debugLog) {
			nlapiLogExecution ('DEBUG', nsc_AutoNum(n++, 'Add 2-1-1 noofdayscurrent : ', padToLen), noofdayscurrent );
		}

		noofdayscurrent +=1;
		
		//CH#FINE_TUNING_MAR2013 - start
		if(noofdayscurrent<=0)
			priceperday = 0;
		else
			priceperday = soppamount/noofdayscurrent;
		//CH#FINE_TUNING_MAR2013 - end
		
		if(debugLog) {
			nlapiLogExecution ('DEBUG', nsc_AutoNum(n++, 'Add 2-2 priceperday : ', padToLen), priceperday );
		}

		//ok quantity type is Years(s)
		if(soppItemQtyType == 10)
		{
			if(soppItemQtyTypePrint == 'Year(s)')
			{
				soppItemQty = soppItemQty * 12;
			}
		}
		
		if(debugLog) {
			nlapiLogExecution ('DEBUG', nsc_AutoNum(n++, 'Add 2 - 1 Modified Qty Type: ', padToLen), soppItemQtyType);
		}
		
		//force the quantity to 12 going forward
		soppItemQty = 12;
		
		//calculate the unit price based on the quantity and the amount in the transaction
		//sUnitPrice = soppamount / soppItemQty; [vasu 05/02/09]
		//sAmount = roundNumber((sUnitPrice * 12),2); [vasu 05/02/09]

		if((soppdatediff == 364) || (soppdatediff == 365) || (soppdatediff == 366)){
			sAmount = soppamount;
		}else{
			sAmount = roundNumber((noofdays * priceperday), 2);
		}
		
		sUnitPrice = roundNumber((sAmount / soppItemQty),2);
								
		//force the quantity type to Months(s)
		soppItemQtyType = 11;
		
		//round the unit price after the calculation of the amount
		//sUnitPrice = roundNumber((soppamount / soppItemQty),2);	[vasu 05/02/09]

		if(debugLog) {
			nlapiLogExecution ('DEBUG', nsc_AutoNum(n++, 'Add 3 Unit Price : ', padToLen), sUnitPrice);
		}
		if(debugLog) {
			nlapiLogExecution ('DEBUG', nsc_AutoNum(n++, 'Add 4 Amount : ', padToLen), sAmount);
		}
		
		sprojectedtotal = parseFloat(sprojectedtotal) + parseFloat(sAmount);
		if(debugLog) {
			nlapiLogExecution ('DEBUG', nsc_AutoNum(n++, 'Add 5 Projected Total : ', padToLen), sprojectedtotal);
		}

		if(debugLog) {
			nlapiLogExecution ('DEBUG', nsc_AutoNum(n++, 'Add 6 Line Item #: ', padToLen), countOfMaintItems);
		}
		
		//CH#GENERIC_MAINT_ITEM  - start
			var genericItem = genItemList[soppItemProductFamilyText+'-'+soppItemCat];
			
			//if no generic item is defined skip it or If already a generic item skip it
			if(genericItem!=null && genericItem!='' && genericItem != soppItem)
			{
				soppItem = genericItem;
				soppItemMaintType = soppItemOldMaintType;
			}				
		//CH#GENERIC_MAINT_ITEM  - end


		createOpp.insertLineItem('item', countOfMaintItems);
		createOpp.setLineItemValue('item', 'quantity', countOfMaintItems, '12');
		createOpp.setLineItemValue('item', 'item', countOfMaintItems, soppItem);
		createOpp.setLineItemValue('item', 'custcol_item_type', countOfMaintItems, soppItemProductFamily);
		createOpp.setLineItemValue('item', 'custcol_gen_maint_type', countOfMaintItems, soppItemMaintType); //CH#GENERIC_MAINT_ITEM
		createOpp.setLineItemValue('item', 'description', countOfMaintItems, soppDescription);
		createOpp.setLineItemValue('item', 'custcol_item_type_4_scripting', countOfMaintItems, soppItemCat);
		createOpp.setLineItemValue('item', 'custcol_qty_type', countOfMaintItems, soppItemQtyType);
		createOpp.setLineItemValue('item', 'custcol_renewal_st_date', countOfMaintItems,nlapiDateToString(sOppStartDate))
		createOpp.setLineItemValue('item', 'custcol_renewal_end_dt', countOfMaintItems,nlapiDateToString(sOppEndDate));
		//createOpp.setLineItemValue('item', 'revrecstartdate', countOfMaintItems,nlapiDateToString(sOppStartDate))
		//createOpp.setLineItemValue('item', 'revrecenddate', countOfMaintItems,nlapiDateToString(sOppEndDate));
		createOpp.setLineItemValue('item', 'rate', countOfMaintItems, sUnitPrice);
		createOpp.setLineItemValue('item', 'amount', countOfMaintItems,sAmount);
		createOpp.setLineItemValue('item', 'custcol_term_item',countOfMaintItems,2);
		createOpp.setLineItemValue('item', 'class',countOfMaintItems,soppitemclass);
		createOpp.setLineItemValue('item', 'custcol_renewal_annualprice',countOfMaintItems, sAmount);

		//CH#SHIP_TO_ADDR - start
		//tax code should be pass along from the Sales order to opportunity irrespective of the subsidiary
		
		//Audaxium Mod: 7/16/2014 - Subsidiary should NOT be ignored when adding in the tax. Some taxcode may not be available to certain subs.
		//Audaxium Mod: 9/17/2014 - Based on Sales Team Response, Tax setting will be ignored.
		//if(!kana_IsNull(soppitemtaxcode))
		//{
			/*if(soppitemtaxcode == null)
			{
				soppitemtaxcode = '733';
				soppitemtaxrate = 0;
				soppitemtaxamt = 0;
			}*/
			/**
			try {
				createOpp.setLineItemValue('item', 'taxcode', countOfMaintItems, soppitemtaxcode);
				createOpp.setLineItemValue('item', 'taxrate', countOfMaintItems, soppitemtaxrate);
				createOpp.setLineItemValue('item', 'taxamt1', countOfMaintItems, soppitemtaxamt);
			} catch (lineitemtaxerr) {
				nlapiLogExecution('ERROR', 'Error adding tax code', lineitemtaxerr.toString());
				nlapiSendEmail(sNetsuiteEmailId,paramSendErrorToEmail, 'Error Applying Tax Code to Oppty Line Item', lineitemtaxerr.toString(),paramSendErrorToCcEmailArray, null);
				
				createOpp.setLineItemValue('item', 'taxcode', countOfMaintItems, '');
				createOpp.setLineItemValue('item', 'taxrate', countOfMaintItems, '');
				createOpp.setLineItemValue('item', 'taxamt1', countOfMaintItems, '');
			}
			*/
		//}
		//CH#SHIP_TO_ADDR - end
		
		if (debugLog) {
			debugStr = ' Customer : ' + customer + '\n' +
				   ' Quantity : ' + soppItemQty + '\n' +
				   ' Item : ' + soppItem + '\n' +
				   ' Product Family : ' + soppItemProductFamily + '\n' +
				   ' Maint Type : ' + soppItemMaintType + '\n' +//CH#GENERIC_MAINT_ITEM
				   ' Description : ' + soppDescription + '\n' +
				   ' Item Category : ' + soppItemCat + '\n' +
				   ' Quantity Type : ' + soppItemQtyType + '\n' +
				   ' Maint Start Date : ' + sOppStartDate + '\n' +
				   ' Maint End Date : ' + sOppEndDate + '\n' +
				   ' Unit Price : ' + sUnitPrice + '\n' +
				   ' Class : ' + soppitemclass + '\n' +
				   ' Amount : ' + sAmount ;
			nlapiLogExecution ('DEBUG', nsc_AutoNum(n++, 'Add 7 DebugStr : ', padToLen), debugStr);
			debugStr = '';
		}
	} catch (exception) {
		if (exception instanceof nlobjError) {
			errorText = 'UNEXPECTED ERROR: ATTEMPTING TO add line items' + '\n\n' +
						'Script Name : kana_ss_create_opp_from_sales_order_scheduled.js' + '\n' +
						'Original sales order number : ' + originalsalesordernumber + '\n' +
						'Event Called : ' + exception.getUserEvent() + '\n' +
						'Error Code: ' + exception.getCode() + '\n' +
						'Error Details: ' + exception.getDetails() + '\n\n' +
						'Stack Trace: ' + exception.getStackTrace();
			nlapiLogExecution('ERROR', nsc_AutoNum(n++, 'Unexpected Error', padToLen), errorText);
			nlapiSendEmail(sNetsuiteEmailId,paramSendErrorToEmail, 'Error Message', errorText,paramSendErrorToCcEmailArray, null);
			//nlapiSendEmail(sNetsuiteEmailId,'kana-app-notification@kana.com', 'Error Message', errorText);
			return;
		} else { 
			// catch error if any other exception occurs
			errorText = 'UNEXPECTED ERROR: ATTEMPTING TO add line items' + '\n\n' +
						'Script Name: kana_ss_create_opp_from_sales_order_scheduled.js' + '\n' +
						'Original sales order number : ' + originalsalesordernumber + '\n' +
						'Error Details: ' + exception.toString();
	       	nlapiLogExecution('ERROR', nsc_AutoNum(n++, 'Unexpected Error', padToLen), errorText);
	       	nlapiSendEmail(sNetsuiteEmailId,paramSendErrorToEmail, 'Error Message', errorText,paramSendErrorToCcEmailArray, null);
			//nlapiSendEmail(sNetsuiteEmailId,'kana-app-notification@kana.com', 'Error Message', errorText);
		return;
		}
	}
	if(debugLog) {
		nlapiLogExecution ('DEBUG', nsc_AutoNum(n++, 'Leaving Function : ', padToLen), functionName);
	}
	
}

function createOpportunity()
{
	var sOppTitle;
	//var soppTitle;
	var strandate;
	var sMemo;
	var sNewOppItemCat;
	
	// Line Item fields
	// Item Id
	var functionName;
	
	functionName = "Create Opportunity";
	
	try {
		if(debugLog) {
			nlapiLogExecution ('DEBUG', nsc_AutoNum(n++, 'Entering Function : ', padToLen), functionName );
		}

		//createOpp = nlapiCreateRecord('opportunity',{recordmode:'dynamic'});
		createOpp = nlapiCreateRecord('opportunity');

		//Renewal opportunity is 128
		createOpp.setFieldValue('customform',paramOppForm);
		//createOpp.setFieldValue('customform', 128);
		
		if(debugLog) {
			nlapiLogExecution ('DEBUG', nsc_AutoNum(n++, ' 1 Custom Form : ', padToLen), paramOppForm);
			//nlapiLogExecution ('DEBUG', nsc_AutoNum(n++, ' 1 Custom Form : ', padToLen), 128);
		}

		//CH#AUTO_MR_QUOTE - start
		//set delivery emal
		createOpp.setFieldValue('custbody_delivery_email', deliveryEmail);	
		//CH#AUTO_MR_QUOTE - end

		//set customer record
		createOpp.setFieldValue('entity', customer);		//vasu
		if(debugLog) {
			nlapiLogExecution ('DEBUG', nsc_AutoNum(n++, '2 Customer: ', padToLen), customer);
		}

		//set subsidiary
		createOpp.setFieldValue('subsidiary', subsidiary);		//vasu
		if(debugLog) {
			nlapiLogExecution ('DEBUG', nsc_AutoNum(n++, '2-1 Subsidiary: ', padToLen), subsidiary);
		}
		
		//set nexus
		createOpp.setFieldValue('nexus', snexus);		//vasu
		if(debugLog) {
			nlapiLogExecution ('DEBUG', nsc_AutoNum(n++, '2-1-1 nexus: ', padToLen), snexus);
		}
		
		//probability
		createOpp.setFieldValue('probability', '30%');
		if(debugLog) {
			nlapiLogExecution ('DEBUG', nsc_AutoNum(n++, '3 Probability: ', padToLen), '30%');
		}

		//set opportunity status
		/**
		 * Opportunity Status List
		 * Lost Prospect == 14
		 * 1 Suspect == 8
		 * 2 Qualified == 9
		 * 3 Competing == 10
		 * 4 Selected == 11 -- Default Status
		 * 5 Committed == 12
		 */

		//createOpp.setFieldValue('status', 8);
		createOpp.setFieldValue('entitystatus', entitystatus);		//change in production to 8
		if(debugLog) {
			nlapiLogExecution ('DEBUG', nsc_AutoNum(n++, '4 Entity Status: ', padToLen), 8);
		}
		
		//forcast type = pipeline
		createOpp.setFieldValue('forecasttype', '3'); //vasu
		if(debugLog) {
			nlapiLogExecution ('DEBUG', nsc_AutoNum(n++, '5 Forecast Type: ', padToLen), 'pipeline');
		}

		//revenue forecast group ( set to Maintenance Renewals )
		createOpp.setFieldValue('custbody_revenue_forecast_group','9');
		if(debugLog) {
			nlapiLogExecution ('DEBUG', nsc_AutoNum(n++, '6 Revenue Group: ', padToLen), 9);
		}

		//class of sale ( set to Maintenance Renewals )
		createOpp.setFieldValue('custbody_class_of_sale','2');
		if(debugLog) {
			nlapiLogExecution ('DEBUG', nsc_AutoNum(n++, '7 Class of Sale: ', padToLen), 2);
		}

		//CH#SHIP_TO_ADDR - start	
		if(!kana_IsNull(soShipAddressList) && !kana_IsNull(soShipAddress)) {
			createOpp.setFieldValue('shipaddresslist',soShipAddressList);
			createOpp.setFieldValue('shipaddress',soShipAddress);
		} else { //else set to null instead of letting the system pull default values from customer record.
			createOpp.setFieldValue('shipaddresslist','');
			createOpp.setFieldValue('shipaddress','');
		} 
		//CH#SHIP_TO_ADDR - end
		
		//opportunity type ( set to renewal )
		createOpp.setFieldValue('custbody_opportunity_type','13');
		if(debugLog) {
			nlapiLogExecution ('DEBUG', nsc_AutoNum(n++, '8 Opportunity Type: ', padToLen), 9);
		}

		//opportunity title
		sOppTitle = 'Auto Maintenance Renewals - Sales Order # ' + originalsalesordernumber;
		createOpp.setFieldValue('title',sOppTitle);
		if(debugLog) {
			nlapiLogExecution ('DEBUG', nsc_AutoNum(n++, '9 Opp Title : ', padToLen), sOppTitle);
		}


		//sales order reference number
		sMemo = 'Sales Order Reference Number # ' + originalsalesordernumber
		createOpp.setFieldValue('memo', sMemo);
		if(debugLog) {
			nlapiLogExecution ('DEBUG', nsc_AutoNum(n++, '10 Memo : ', padToLen), sMemo);
		}
		
		countOfMaintItems=0;
		itemCount = soItem.length;

		for (var i = 0; i < itemCount ; i++) {
			soppItem = soItem[i];
			soppItemProductFamily = soItemProductFamily[i];
			soppItemProductFamilyText = soItemProductFamilyText[i]; //CH#GENERIC_MAINT_ITEM
			soppItemMaintType = soItemMaintType[i];  //CH#GENERIC_MAINT_ITEM
			soppItemOldMaintType = soItemOldMaintType[i];  //CH#GENERIC_MAINT_ITEM
			soppDescription = soDescription[i];
			soppItemCat = soItemCat[i];
			soppItemQty = soItemQty[i];
			soppItemQtyType = soItemQtyType[i];
			soppItemQtyTypePrint = soItemQtyTypePrint[i];
			soppitemtype = soItemType[i];
			soppitemtaxcode = soItemTaxCode[i];
			soppitemtaxrate = soItemTaxRate[i];
			soppitemtaxamt = soItemTaxAmt[i];
			
			
			// we do not get the item category always. so we need to retrieve that from the item definition
			if(debugLog) {
				nlapiLogExecution ('DEBUG', nsc_AutoNum(n++, '10-1-Item Type ? : ', padToLen), soppitemtype);
			}

			
			if(soppitemtype == 'NonInvtPart'){
				itemrecord = nlapiLoadRecord('noninventoryitem',soppItem);
				sNewOppItemCat = itemrecord.getFieldValue('custitem_item_type_4_scripting');
				if(debugLog) {
					nlapiLogExecution ('DEBUG', nsc_AutoNum(n++, '10-1 New Opp Item Category : ', padToLen), sNewOppItemCat);
				}
			} else {
				sNewOppItemCat=-1;
			}		
			
			soppItemStartDate = soItemStartDate[i];
			if((soppItemStartDate == '') || (soppItemStartDate == null)){
				soppItemStartDate = soItemStartDateRenewal[i];
			}
			
			soppItemEndDate = soItemEndDate[i];
			if((soppItemEndDate == '') || (soppItemEndDate == null)){
				soppItemEndDate = soItemEndDateRenewal[i];
			}
			
			sopprateOfItem = rateOfItem[i];
			soppItemMaintenencePercent = soItemMaintenencePercent[i];
			soppitemclass = soitemclass[i];
			soppnoOfMonths = 12;
			soppdiscount = discount[i];
			soppamount = soamount[i] ;
			
			if (debugLog) {
				debugStr = '11 soppItem : ' + soppItem + '\n' +
					   ' 11 soppItemProductFamily : ' + soppItemProductFamily + '\n' +
					   ' 11 soppItemMaintType : ' + soppItemMaintType + '\n' +//CH#GENERIC_MAINT_ITEM
					   ' 11 soppDescription : ' + soppDescription + '\n' +
					   ' 11 soppItemCat : ' + soppItemCat + '\n' +
					   ' 11 sNewOppItemCat : ' + sNewOppItemCat + '\n' +
					   ' 11 soppItemQty : ' + soppItemQty + '\n' +
					   ' 11 soppItemQtyType : ' + soppItemQtyType + '\n' +
					   ' 11 soppItemQtyTypePrint : ' + soppItemQtyTypePrint + '\n' +
					   ' 11 soppItemStartDate : ' + soppItemStartDate + '\n' +
					   ' 11 soppItemEndDate : ' + soppItemEndDate + '\n' +
					   ' 11 sopprateOfItem : ' + sopprateOfItem + '\n' +
					   ' 11 soppItemMaintenencePercent : ' + soppItemMaintenencePercent + '\n' +
					   ' 11 soppamount : ' + soppamount + '\n' +
					   ' 11 sMemo : ' + sMemo + '\n' +
					   ' 11 soppitemclass : ' + soppitemclass + '\n' +
					   ' 11 soppitemtaxcode : ' + soppitemtaxcode + '\n' + 
					   ' 11 soppitemtaxrate : ' + soppitemtaxrate + '\n' + 
					   ' 11 soppitemtaxamt : ' + soppitemtaxamt + '\n' + 
					   ' 11 soppdiscount : ' + soppdiscount ;
				nlapiLogExecution ('DEBUG', nsc_AutoNum(n++, '12 DebugStr : ', padToLen), debugStr);
				debugStr = '';
			}

			
			if(soppItemCat == 'Maintenance'  || sNewOppItemCat == 2) {
				countOfMaintItems = countOfMaintItems + 1;

				addLineItems();			

				//if there are multiple maintenance lines with different maint dates then
				//assign the opp dates to the earliest date of the maintenance line items
				if((opportunitydate == '') || (opportunitydate == null)){
					opportunitydate = sOppStartDate;
				}else{
					if(sOppStartDate < opportunitydate){
						opportunitydate = sOppStartDate;
					}
				}

				//transaction date should be earliest maintenance end date - 90 days
				strandate = new Date(opportunitydate);
				strandate = nlapiAddDays(strandate, -90);
				strandate = nlapiDateToString(strandate);
				createOpp.setFieldValue('trandate', strandate);
				if(debugLog) {
					nlapiLogExecution ('DEBUG', nsc_AutoNum(n++, '13 Tran Date : ', padToLen), strandate);
				}
				
				//expected close date
				expectedclosedate = new Date(opportunitydate);
				createOpp.setFieldValue('expectedclosedate',nlapiDateToString(expectedclosedate));
				if(debugLog) {
					nlapiLogExecution ('DEBUG', nsc_AutoNum(n++, '14 Expected Close Date : ', padToLen), expectedclosedate);
				}
				
				//exchange rate
				createOpp.setFieldValue('exchangerate',exchangerate);	//vasu
				if(debugLog) {
					nlapiLogExecution ('DEBUG', nsc_AutoNum(n++, '15 Exchange Rate: ', padToLen), exchangerate);
				}
				
				//currency
				/* set currency values
					* USD = 1
					* GBP = 2
					* CAD = 3
					* EUR = 4
					* JPY = 5
					* AUD = 6
					* INR = 7
					* HKD = 8
					* NOK = 9
					* SEK = 10
					* DKK = 11
					* CHF = 12
				*/
				//createOpp.setFieldValue('currency',currency);	//vasu
				if(debugLog) {
					nlapiLogExecution ('DEBUG', nsc_AutoNum(n++, '15-1 Currency: ', padToLen), currency);
				}

				if(debugLog) {
					nlapiLogExecution ('DEBUG', nsc_AutoNum(n++, '16-0 Before Projected Total : ', padToLen), sprojectedtotal);
				}

				sprojectedtotal = roundNumber(sprojectedtotal,2);
				createOpp.setFieldValue('projectedtotal',sprojectedtotal);
				
				/*
				if(((scurrencyname != 'EUR') && (scurrencyname != 'USD')) && (subsidiary != 1)){
					createOpp.setFieldValue('total',sprojectedtotal);
				}
				*/
				
				if(debugLog) {
					nlapiLogExecution ('DEBUG', nsc_AutoNum(n++, '16 Projected Total : ', padToLen), sprojectedtotal);
				}

				if(debugLog) {
					nlapiLogExecution ('DEBUG', nsc_AutoNum(n++, '16-1 Total : ', padToLen), sprojectedtotal);
				}
				
			}
		}
	
		//CH#MAINTAINCE_END_DATE - START
		//current maintenance end date
		if(expectedclosedate!=null && expectedclosedate!='')
		{
			var curMaintEndDate = new Date(expectedclosedate);
			curMaintEndDate =  nlapiAddDays(curMaintEndDate, -1);
			createOpp.setFieldValue('custbody_online_cur_maint_end_dt',nlapiDateToString(curMaintEndDate));
		}
		//CH#MAINTAINCE_END_DATE - END
		
		nlapiLogExecution ('DEBUG', nsc_AutoNum(n++, 'DebugStr : ', padToLen), " 17 About to sumit record");
		
		if(endcustomer != 0){
			createOpp.setFieldValue('custbody_end_customer',endcustomer);
			if(debugLog) {
				nlapiLogExecution ('DEBUG', nsc_AutoNum(n++, '20 End Customer : ', padToLen), endcustomer);
			}
		}

		if(supportcustomer != 0){
			createOpp.setFieldValue('custbody_service_support',supportcustomer);
			if(debugLog) {
				nlapiLogExecution ('DEBUG', nsc_AutoNum(n++, '21 Support Customer : ', padToLen), supportcustomer);
			}
		}

		createOpp.setFieldValue('custbody_prior_sales_orders', soPriorSalesOrders);
		
		var sOppIdInternalId=0;		
		var sOppId=0;
		
		if(countOfMaintItems > 0){
			addSalesTeam();
		
			var salesrepcount  = createOpp.getLineItemCount('salesteam');
			if(debugLog) {
				nlapiLogExecution ('DEBUG', nsc_AutoNum(n++, '22 Total SalesTeam Members : ', padToLen), salesrepcount);
			}

			sOppIdInternalId  = nlapiSubmitRecord(createOpp, true, true);
			
			if(sOppIdInternalId != 0){
				opportunityrecord = nlapiLoadRecord('opportunity', sOppIdInternalId);	
				sOppId = opportunityrecord.getFieldValue('tranid');
			}
			
			if(debugLog) {
				nlapiLogExecution ('DEBUG', nsc_AutoNum(n++, 'OppId : ', padToLen), sOppId);
			}
		}
		
		var sEmailText='';
		
		if(countOfMaintItems > 0){
			sEmailText += 'No Maint Items Found: '+countOfMaintItems+' // Opportunity was NOT Saved \n';
		}
		
		sEmailText +=	' Opportunity Id : ' + sOppId + '\n' +
						' Title : ' + sOppTitle + '\n' +
						' Customer : ' + customername + '\n' + 
						' End Customer : ' + endcustomername + '\n' + 
						' Opportunity Date : ' + strandate + '\n' +
						' Expected Close Date : ' + expectedclosedate + '\n' + 
						' New Deal or Renewal : ' + snewdealOrRenewal + '\n' +
						' Projected Total (' + scurrencyname + ') :' + sprojectedtotal + '\n';
	
		if(sOppIdInternalId != 0){
			//CH#DEFAULT_MEMBER
			
			nlapiSendEmail(sNetsuiteEmailId,sRenewalRepIDForEmailNotify, 'Auto renewal opportunity created', sEmailText,paramOpptySuccessCcEmailArray, paramOpptySuccessBccEmailArray);
			
			//nlapiSendEmail(sNetsuiteEmailId, sRenewalRepIDForEmailNotify, 'Auto renewal opportunity created', sEmailText, 'sbronte@kana.com','kana-app-notification@kana.com');
		} else {
			//Send out different message when Opporotunity Is NOT created.
			
			nlapiSendEmail(sNetsuiteEmailId,sRenewalRepIDForEmailNotify, 'Auto renewal opportunity NOT CREATED', sEmailText,paramOpptySuccessCcEmailArray, paramOpptySuccessBccEmailArray);
		}
	
	} catch (exception) {
		if (exception instanceof nlobjError) {
			errorText = 'UNEXPECTED ERROR: ATTEMPTING TO CREATE AN Opportunity' + '\n\n' +
						'Script Name : kana_ss_create_opp_from_sales_order_scheduled.js' + '\n' +
						'Original sales order number : ' + originalsalesordernumber + '\n' +
						'Event Called : ' + exception.getUserEvent() + '\n' +
						'Error Code: ' + exception.getCode() + '\n' +
						'Error Details: ' + exception.getDetails() + '\n\n' +
						'Stack Trace: ' + exception.getStackTrace();
			nlapiLogExecution('ERROR', nsc_AutoNum(n++, 'NlobjError Error', padToLen), errorText);	
			nlapiSendEmail(sNetsuiteEmailId,paramSendErrorToEmail, 'NlObjError Error Message', errorText,paramSendErrorToCcEmailArray, null);
			//nlapiSendEmail(sNetsuiteEmailId, 'kana-app-notification@kana.com', 'NlObjError Error Message', errorText);
			
			return false; //CH#TIMEOUT_ERROR
		} else { 
			// catch error if any other exception occurs
			errorText = 'UNEXPECTED ERROR: ATTEMPTING TO Create AN Opportunity' + '\n\n' +
						'Script Name: kana_ss_create_opp_from_sales_order_scheduled.js' + '\n' +
						'Event Called : ' + exception.getUserEvent() + '\n' +
						'Original sales order number : ' + originalsalesordernumber + '\n' +
						'Error Code: ' + exception.getCode() + '\n' +
						'Error Details: ' + exception.getDetails() + '\n\n' +
						'Stack Trace: ' + exception.getStackTrace();
						'Error Details: ' + exception.toString();
	       	nlapiLogExecution('ERROR', nsc_AutoNum(n++, 'Unexpected Error', padToLen), errorText);
	       	
	       	nlapiSendEmail(sNetsuiteEmailId,paramSendErrorToEmail, 'Unknown Error Message', errorText,paramSendErrorToCcEmailArray, null);
			//nlapiSendEmail(sNetsuiteEmailId, 'kana-app-notification@kana.com', 'Unknown Error Message', errorText);
			return false; //CH#TIMEOUT_ERROR
		}
	}
	if(debugLog) {
		nlapiLogExecution ('DEBUG', nsc_AutoNum(n++, 'Leaving Function : ', padToLen), functionName );
	}
	return true; //CH#TIMEOUT_ERROR
}

function nsc_AutoNum(n, suffix, padToLen)
{
	/*
		Return the integer n and suffix as a string of the following format:
	
	 		[0...0n] suffix
	 
		with (padToLen - n.length) leading zeros.  For example:
		 
			[0013] Debug Alert: Array initialization
	*/
	
	
	//
	// Initialize parameters
	//
	
	// if n is null, return an error
	if (n == null) return '[error] ';
	
	// convert n to a string
	n = n.toString();
	
	// make certain suffix is handled
	if (suffix == null) suffix = '';
	
	// make certain padToLen is a number
	if ( padToLen == null || isNaN(padToLen) )
	{
		padToLen = 5;
	};
	
	
	
	// 
	// LOCAL VARIABLES
	// 
	var zeros	 = '';
	var string = '';
	var i;
	
	
	
	// 
	// CODE BODY
	// 
	
	// determine number of leading zeros required
	numZeros = padToLen - n.length;
	
	// construct zeros string
	for (i=0; i<numZeros; i++)
	{
		zeros = zeros + '0';
	};
	
	// construct return string
	string = '[' + zeros + n + '] ' + suffix.toString();
	
	/* return autoNumString */
	return string;
	
}
// END AUTONUM =====================================================================================================

function roundNumber(num, dec) {
	var result = Math.round(num*Math.pow(10,dec))/Math.pow(10,dec);
	return result;
}

function dateDiff(endDt,startDt) {
	date1 = new Date();
	date2 = new Date();
	diff  = new Date();
	
	//CH#FINE_TUNING_MAR2013 - start
	if(endDt==null || startDt==null)
		return -1;
	//CH#FINE_TUNING_MAR2013 - end
	
	date1temp = nlapiStringToDate(endDt);
	date1.setTime(date1temp.getTime());

    //alert('date1 '+date1);

	date2temp = nlapiStringToDate(startDt);
	date2.setTime(date2temp.getTime());

    //alert('date2 '+date2);

	var tempDiff = date1.getTime() - date2.getTime();
	if(tempDiff < 0)
	{
		return -1;
	}
	// sets difference date to difference of first date and second date

	diff.setTime(Math.abs(date1.getTime() - date2.getTime()));

	timediff = diff.getTime();

	days = Math.round(timediff / (1000 * 60 * 60 * 24));

	return days;
}

function ascii_value (c)
{
	// restrict input to a single character
	c = c . charAt (0);

	// loop through all possible ASCII values
	var i;
	for (i = 0; i < 256; ++ i)
	{
		// convert i into a 2-digit hex string
		var h = i . toString (16);
		if (h . length == 1)
			h = "0" + h;

		// insert a % character into the string
		h = "%" + h;

		// determine the character represented by the escape code
		h = unescape (h);

		// if the characters match, we've found the ASCII value
		if (h == c)
			break;
	}
	return i;
}

