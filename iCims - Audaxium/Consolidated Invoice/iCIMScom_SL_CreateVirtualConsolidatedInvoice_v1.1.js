/***************************************************************************************************************************************************
* Copyright (c) 1998-2012 NetSuite, Inc.
* 2955 Campus Drive, Suite 100, San Mateo, CA, USA 94403-2511
* All Rights Reserved.
*
* This software is the confidential and proprietary information of NetSuite, Inc. ("Confidential Information"). You shall not disclose such
* Confidential Information and shall use it only in accordance with the terms of the license agreement you entered into with NetSuite.
*
* Name:	Create Consolidated Invoice
*
* Solution Overview:
* iCIMS requires an automation to consolidate invoices for a customer into a single PDF file. A SuiteScript will execute when a user clicks a
* custom link "Virtual Consolidated Invoice" on menu option (under Transaction subtab). The user will be taken to a screen where he/she can select
* a customer from a list of customers. The script will display the list of invoices on the second screen for the customer selected. The user can
* select the invoices to be included on Virtual Consolidated Invoice PDF. On clicking the submit button on second screen, the script will create a
* custom record called "Virtual Consolidated Invoice" , linking all the selected Invoices together for tracking and printing purposes.
*
* @author: Gerrom Infante
* @version: 1.2
* @history: 1.2 [04/04/2012] - added validation that all contacts selected in the Virtual Consolidated Invoice has an email address
* @history: 1.1 [03/15/2012] - if customer has only one invoice that meets the criteria, display error message in the Select Customer screen
* @history: 1.0 [03/01/2012] - created script based on TRD v1.1 (02/27/2012)
* @history: 1.1 [08/22/2013](mcelosa) - for case # 1721760, modified getLastConsolNum() function to avoid the impact of 1000 records limitation returned by nlapiSearchRecord()
****************************************************************************************************************************************************
*/
//8/26/2015 - Add in Field CONSTANT for Customer field 
//Added by Json@Audaxium
var CONSOLIDATED_INV_CUSTOMER = "custrecord_conso_inv_customer";

var LOG_TYPE = "DEBUG";
var PAGE_BREAK = 0;
var LINE_COUNT = 0;
var PAGE_COUNT = 1;
function suitelet_createConsolidatedInv(request, response) {

	var FUNC_NAME = "suitelet_createConsolidatedInv";

	try	{
		nlapiLogExecution(LOG_TYPE, FUNC_NAME, "==================== STARTED SUITELET ====================");

		var strStage = request.getParameter("custpage_stage");
		nlapiLogExecution(LOG_TYPE, FUNC_NAME, "Stage:= " + strStage);

		switch (strStage) {
			case "search_customer":
				var strCustomerId = request.getParameter("custpage_customer_list");
				var recCustomer = nlapiLoadRecord("customer", strCustomerId);
				var strCustomerText = recCustomer.getFieldValue("entityid");
				nlapiLogExecution(LOG_TYPE, FUNC_NAME, "Selected Customer := " + strCustomerText + " [Internal Id := " + strCustomerId + "]");

				var frmOut = searchCustomer(strCustomerId, strCustomerText);

				break;

			case "select_invoice":
				// collect all the invoices that were selected
				var arrSelectedInv = [];

				var intLineCount =  request.getLineItemCount("custpage_invoice_list");
				nlapiLogExecution(LOG_TYPE, FUNC_NAME, "Collecting selected invoices.");

                var strCustomerId = request.getParameter("custpage_customer_id");
                nlapiLogExecution(LOG_TYPE, FUNC_NAME, "Selected Customer [Internal Id]:= " + strCustomerId);

                for (var intLine = 1; intLine <= intLineCount; intLine++) {
                    if (request.getLineItemValue("custpage_invoice_list","custpage_select", intLine) == "T") {
                        arrSelectedInv.push(request.getLineItemValue("custpage_invoice_list", "custpage_inv_int_id", intLine));
                    }
                }

                // if user selects no invoice or only one invoice, display error message
                if ((isArrayEmpty(arrSelectedInv) === true) || (arrSelectedInv.length == 1)) {
                    var strCustomerText = request.getParameter("custpage_customer_text");

                    var frmOut = searchCustomer(strCustomerId, strCustomerText);
                    var fldError = frmOut.addField("custpage_error", "text", "");

                    fldError.setDefaultValue("Please select more than one invoice to continue.");
                    fldError.setDisplayType("inline");
                    fldError.setLayoutType("endrow");
                }
                else {
                    createConsolidatedInvoice(strCustomerId, arrSelectedInv);
                }

				break;

			default:
				var frmOut = selectCustomer();

				break;
		}

		if (isNullOrUndefined(frmOut) === false) {
			response.writePage(frmOut);
		}

	nlapiLogExecution(LOG_TYPE, FUNC_NAME, "==================== END SUITELET ====================");
	}
	catch (error) {
	  	if (error.getDetails !== undefined) {
        		nlapiLogExecution ("ERROR", FUNC_NAME,  error.getCode() + ": " + error.getDetails());
      	      throw error;
	    	}
		else {
	    		nlapiLogExecution("ERROR", FUNC_NAME, error.toString());
	        	throw nlapiCreateError("99999", error.toString());
		}
	}
}
/**
 * Function that creates the form to select the customer, first form that will be displayed when suitelet is run
 */
function selectCustomer() {
	var FUNC_NAME = "selectCustomer";

	try {
		// create the form that will displayed
		var frmSelectCustomer = nlapiCreateForm("Select Customer", false);

		// set the stage value
		var fldStage = frmSelectCustomer.addField("custpage_stage", "text", "stage");
		fldStage.setDefaultValue("search_customer");
		fldStage.setDisplayType("hidden");

		// add the customer drop down list on the form
		frmSelectCustomer.addField("custpage_customer_list", "select", "Select Customer", "customer");

		// add submit button
		frmSelectCustomer.addSubmitButton("Submit");
		nlapiLogExecution(LOG_TYPE, FUNC_NAME, "Load Select Customer form");

		return frmSelectCustomer;
	}
	catch (error) {
	  	if (error.getDetails !== undefined) {
        		nlapiLogExecution ("ERROR", FUNC_NAME,  error.getCode() + ": " + error.getDetails());
      	      throw error;
	    	}
		else {
	    		nlapiLogExecution("ERROR", FUNC_NAME, error.toString());
	        	throw nlapiCreateError("99999", error.toString());
		}
	}
}
/**
 * Function will search for open invoices of the selected customer.
 * Will return an error message if no invoices found otherwise will display the open invoices in a list
 *
 * @param {Object} customer_id
 */
function searchCustomer(customer_id, customer_text) {

	var FUNC_NAME = "searchCustomer";

	try {
		nlapiLogExecution(LOG_TYPE, FUNC_NAME, "Searching for customer's open invoices.");

		// search all the invoices for that customer
		var objFilter = new nlobjSearchFilter("entity", null, "is", customer_id);
		var arrResult = nlapiSearchRecord("transaction", "customsearch_icims_open_invoice", objFilter);

		// check if customer selected has open invoices
		var intRecordCount = numRows(arrResult);
		nlapiLogExecution(LOG_TYPE, FUNC_NAME, "No of invoices found := " + intRecordCount);

		if (intRecordCount === 0) {
			var frmSelectCustomer = nlapiCreateForm("Select Customer", false);
			// set the stage value
			var fldStage = frmSelectCustomer.addField("custpage_stage", "text", "stage");
			fldStage.setDefaultValue("search_customer");
			fldStage.setDisplayType("hidden");

			// add the customer drop down list on the form
			frmSelectCustomer.addField("custpage_customer_list", "select", "Select Customer", "customer");

			// display error message
			var fldError = frmSelectCustomer.addField("custpage_error_message", "text", "No Open Invoices found for Customer " + customer_text);
			fldError.setDisplayType("inline");
			fldError.setLayoutType("endrow");
			fldError.setPadding(5);

			// add submit button
			frmSelectCustomer.addSubmitButton("Submit");
			nlapiLogExecution(LOG_TYPE, FUNC_NAME, "Load Select Customer form");

			return frmSelectCustomer;
		}
		else if (intRecordCount == 1) {
			var frmSelectCustomer = nlapiCreateForm("Select Customer", false);
			// set the stage value
			var fldStage = frmSelectCustomer.addField("custpage_stage", "text", "stage");
			fldStage.setDefaultValue("search_customer");
			fldStage.setDisplayType("hidden");

			// add the customer drop down list on the form
			frmSelectCustomer.addField("custpage_customer_list", "select", "Select Customer", "customer");

			// display error message
			var fldError = frmSelectCustomer.addField("custpage_error_message", "text", "One invoice found for Customer " + customer_text + ". Please select a different customer.");
			fldError.setDisplayType("inline");
			fldError.setLayoutType("endrow");
			fldError.setPadding(5);

			// add submit button
			frmSelectCustomer.addSubmitButton("Submit");
			nlapiLogExecution(LOG_TYPE, FUNC_NAME, "Load Select Customer form");

			return frmSelectCustomer;
		}

		// display the open invoices found for the customer
		var frmSelectInv = nlapiCreateForm("Select Invoices to Process");

		// set the stage value
		var fldStage = frmSelectInv.addField("custpage_stage", "text", "stage");
		fldStage.setDefaultValue("select_invoice");
		fldStage.setDisplayType("hidden");

		var fldCustomer = frmSelectInv.addField("custpage_selected_customer", "text", "Customer: " + customer_text);
		fldCustomer.setDisplayType("inline");

		var fldCustomerId = frmSelectInv.addField("custpage_customer_id", "text", "");
		fldCustomerId.setDefaultValue(customer_id);
		fldCustomerId.setDisplayType("hidden");

		var fldCustomerId = frmSelectInv.addField("custpage_customer_text", "text", "");
		fldCustomerId.setDefaultValue(customer_text);
		fldCustomerId.setDisplayType("hidden");

		var lstInvoices = frmSelectInv.addSubList("custpage_invoice_list", "list", "Select Invoice To Process");
		var fldSelect = lstInvoices.addField("custpage_select", "checkbox", "Pick");
		fldSelect.setDisplayType("normal");

		fldSelect = lstInvoices.addField("custpage_invoices", "text", "Invoice Number");
		fldSelect.setDisplayType("normal");

		fldSelect = lstInvoices.addField("custpage_inv_due_date", "text", "Invoice Due Date");
		fldSelect.setDisplayType("hidden");

		fldSelect = lstInvoices.addField("custpage_inv_int_id", "text", "Invoice Internal Id");
		fldSelect.setDisplayType("hidden");

		var objList = [];
		//populate the sublist
		for (var intRec = 0; intRec < intRecordCount; intRec++) {
			var arrList = [];
			arrList.custpage_select = "F";
			arrList.custpage_invoices = arrResult[intRec].getValue("tranid");
			arrList.custpage_inv_due_date = arrResult[intRec].getValue("duedate");
			arrList.custpage_inv_int_id = arrResult[intRec].getId();

			// add to list
			objList.push(arrList);

			// only a max of 15 invoices will be displayed
			if (arrList.length == 14 ) {
				break;
			}
		}

		if (objList.length > 0) {
			// populate the sublist
			lstInvoices.setLineItemValues(objList);
		}
		lstInvoices.addMarkAllButtons();

		frmSelectInv.addSubmitButton("Submit");

		return frmSelectInv;
	}
	catch (error) {
	  	if (error.getDetails !== undefined) {
        		nlapiLogExecution ("ERROR", FUNC_NAME,  error.getCode() + ": " + error.getDetails());
      	      throw error;
	    	}
		else {
	    		nlapiLogExecution("ERROR", FUNC_NAME, error.toString());
	        	throw nlapiCreateError("99999", error.toString());
		}
	}
}
/**
 * Function that will create the Consolidated Invoice custom record.
 *
 * @param {Object} customer_id
 * @param {Object} inv_list
 */
function createConsolidatedInvoice(customer_id, inv_list) {

	var FUNC_NAME = "createConsolidatedInvoice";

	//variables for the Virtual Consolidated Invoice and Virtual Consolidated Inv List custom records
	var CONSOLIDATED_INV_REC = "customrecord_virtual_consolidated_inv";
	var CONSOLIDATED_INV_LIST = "recmachcustrecord_conso_inv_parent";
	var CONSOLIDATED_INV_LIST_INVOICE = "custrecord_conso_inv_list";
	var CONSOLIDATED_INV_LIST_INV_ID = "custrecord_invoice_int_id";

	// invoice fields
	var INV_PROCESSED = "custbody_inv_processed";
	var INV_CONSOLIDATED_INV = "custbody_conso_inv_number";

	try {
		nlapiLogExecution(LOG_TYPE, FUNC_NAME, "Creating Consolidated Invoice custom record.");

		// create a new Consolidated Invoice custom record
		var recConsolidated = nlapiCreateRecord(CONSOLIDATED_INV_REC, {recordmode: "dynamic"});

		// set the Consolidated Number
		var strConsoNum = getLastConsolNum();
		nlapiLogExecution(LOG_TYPE, FUNC_NAME, "Consolidated Invoice Number:= " + strConsoNum);
		recConsolidated.setFieldValue("name", strConsoNum);
		
		recConsolidated.setFieldValue(CONSOLIDATED_INV_CUSTOMER, customer_id);
		nlapiLogExecution(LOG_TYPE, FUNC_NAME, "Set Customer [Internal Id]:= " + customer_id);

		// populate the line items, this will be the invoices selected via the suitelet
		var intInvCount = numRows(inv_list);
		if (intInvCount == 0) {
			nlapiLogExecution(LOG_TYPE, FUNC_NAME, "No Invoices selected.  Terminating script.")

			var frmSelectCustomer = nlapiCreateForm("No Invoice Selected", false);

			// set the stage value
			var fldStage = frmSelectCustomer.addField("custpage_stage", "text", "stage");
			fldStage.setDefaultValue("");
			fldStage.setDisplayType("hidden");

			var fldError = frmSelectCustomer.addField("custpage_error_message", "text", "Please select at least one Invoice");
			fldError.setDisplayType("inline");
			fldError.setLayoutType("endrow");
			fldError.setPadding(5);

			return frmSelectCustomer;
		}

		for (var intInv = 0; intInv < intInvCount; intInv++) {
			nlapiLogExecution(LOG_TYPE, FUNC_NAME, "Adding selected invoice. [Internal ID:= " + inv_list[intInv] + "].");
			recConsolidated.selectNewLineItem(CONSOLIDATED_INV_LIST);
			recConsolidated.setCurrentLineItemValue(CONSOLIDATED_INV_LIST, CONSOLIDATED_INV_LIST_INVOICE, inv_list[intInv]);
			recConsolidated.setCurrentLineItemValue(CONSOLIDATED_INV_LIST, CONSOLIDATED_INV_LIST_INV_ID, inv_list[intInv]);
			recConsolidated.commitLineItem(CONSOLIDATED_INV_LIST);
		}
		nlapiLogExecution(LOG_TYPE, FUNC_NAME, "Finished adding selected invoices.");

		// save the Consolidated Invoice record
		var strConsoInv = nlapiSubmitRecord(recConsolidated, true, false);
		nlapiLogExecution(LOG_TYPE, FUNC_NAME, "Consolidated Invoice record created successfully. [Internal ID := " + strConsoInv + "].");

		// make selected invoices as Processed and link the Consolidated Invoice
		nlapiLogExecution(LOG_TYPE, FUNC_NAME, "Updating selected invoices.");

		for (intInv = 0; intInv < intInvCount; intInv++) {
			nlapiSubmitField("invoice", inv_list[intInv], [INV_PROCESSED, INV_CONSOLIDATED_INV], ["T", strConsoInv]);
			nlapiLogExecution(LOG_TYPE, FUNC_NAME, "Updated selected invoice. [Internal ID := " + inv_list[intInv] + "].");
		}
		nlapiLogExecution(LOG_TYPE, FUNC_NAME, "Finished updating selected invoices.");

		// redirect user to the created invoice
		nlapiSetRedirectURL('RECORD', CONSOLIDATED_INV_REC, strConsoInv, false);
	}
	catch (error) {
	  	if (error.getDetails !== undefined) {
        		nlapiLogExecution ("ERROR", FUNC_NAME,  error.getCode() + ": " + error.getDetails());
      	      throw error;
	    	}
		else {
	    		nlapiLogExecution("ERROR", FUNC_NAME, error.toString());
	        	throw nlapiCreateError("99999", error.toString());
		}
	}
}
/**
 * Function will create the "Print PDF" and "Email PDF" buttons when viewing the Consolidated Invoice custom record
**/
function beforeLoad_createButton(strType, frmForm) {

	var FUNC_NAME = "beforeLoad_createButton";

	try {
		nlapiLogExecution(LOG_TYPE, FUNC_NAME, "==================== EXIT BEFORE LOAD EVENT ====================");

		if (strType != "view") {
			nlapiLogExecution(LOG_TYPE, FUNC_NAME, "Operation not supported.  Exiting script! Operation:= " + strType);
						nlapiLogExecution(LOG_TYPE, FUNC_NAME, "==================== EXIT BEFORE LOAD EVENT ====================");
			return true;
		}


		frmForm.setScript("customscript_icims_call_gen_pdf");
		frmForm.addButton("custpage_print_pdf", "Print PDF", "afterPrintClick()");
		frmForm.addButton("custpage_email_pdf", "Email PDF", "afterEmailClick()");

		nlapiLogExecution(LOG_TYPE, FUNC_NAME, "==================== EXIT BEFORE LOAD EVENT ====================");
	}
	catch (error) {
	  	if (error.getDetails !== undefined) {
        		nlapiLogExecution ("ERROR", FUNC_NAME,  error.getCode() + ": " + error.getDetails());
      	      throw error;
	    	}
		else {
	    		nlapiLogExecution("ERROR", FUNC_NAME, error.toString());
	        	throw nlapiCreateError("99999", error.toString());
		}
	}
}
/**
 * Function that will call the suitescript that will create the PDF when the Print PDF button is clicked
 **/
function afterPrintClick() {

	var FUNC_NAME = "afterPrintClick";

	var strSuiteletUrl = nlapiResolveURL("SUITELET", "customscript_icims_create_pdf", "customdeploy_icims_create_pdf");
	var strParamUrl = "&recordid=" + nlapiGetRecordId();
	nlapiLogExecution(LOG_TYPE, FUNC_NAME, "Processing Consolidated Record:= " + nlapiGetRecordId());

	var strTargetUrl = strSuiteletUrl + strParamUrl;
	nlapiLogExecution(LOG_TYPE, FUNC_NAME, "Target URL:= " + strTargetUrl);

	var strUrlPrint = strTargetUrl + "&invoke=print";
	nlapiLogExecution(LOG_TYPE, FUNC_NAME, "Print URL:= " + strUrlPrint);

	window.open(strUrlPrint);
	nlapiLogExecution(LOG_TYPE, FUNC_NAME, "Calling PDF Creation Suitelet");
}
/**
 * Function that will call the suitescript that will create the PDF and email it when the Email PDF button is clicked
 **/
function afterEmailClick() {

	var FUNC_NAME = "afterEmailClick";
	var CONSOLIDATED_INV_CONTACTS = "custrecord_conso_inv_contacts";
	var CONSOLIDATED_INV_EMAIL	= "custrecord_conso_inv_email";
	var blnError = false;

	// get all the selected contacts and check if all of them have an email address, if not show error message
	// load the consolidated record
	var recConso = nlapiLoadRecord(nlapiGetRecordType(), nlapiGetRecordId());
	var arrContacts = recConso.getFieldValues(CONSOLIDATED_INV_CONTACTS);
	var strEmail = recConso.getFieldValue(CONSOLIDATED_INV_EMAIL);

	var intContactCount = numRows(arrContacts);

	if (( intContactCount == 0) && (isEmpty(strEmail) === true)) {
		alert('No email specified, cannot email Consolidated Invoice!');
		return true;
	}

	if (intContactCount > 0) { // there are contacts selected
		if (isArray(arrContacts) === true)
		{
			var intContactCount = numRows(arrContacts);

			if (intContactCount > 1) {
				for (var intContact = 0; intContact < intContactCount; intContact++) {
					var strCC = nlapiLookupField("contact", arrContacts[intContact], "email");
					nlapiLogExecution(LOG_TYPE, FUNC_NAME, "Contact Email Address:= " + strCC);

					if (isEmpty(strCC) === true) {
						blnError = true;
						break;
					}
				}
			}
		}
		else {
			var strCC = nlapiLookupField("contact", arrContacts, "email");
			nlapiLogExecution(LOG_TYPE, FUNC_NAME, "Contact Email Address:= " + strCC);

			if (isEmpty(strCC) === true) {
				blnError = true;
			}
		}
	}

	if (blnError === false) {
		//send the email

		var strSuiteletUrl = nlapiResolveURL("SUITELET", "customscript_icims_create_pdf", "customdeploy_icims_create_pdf");
		var strParamUrl = "&recordid=" + nlapiGetRecordId();
		nlapiLogExecution(LOG_TYPE, FUNC_NAME, "Processing Consolidated Record:= " + nlapiGetRecordId());

		var strTargetUrl = strSuiteletUrl + strParamUrl;
		nlapiLogExecution(LOG_TYPE, FUNC_NAME, "Target URL:= " + strTargetUrl);

		var strUrlEmail = strTargetUrl + "&invoke=email";
		nlapiLogExecution(LOG_TYPE, FUNC_NAME, "Email URL:= " + strUrlEmail);

		window.open(strUrlEmail);
		nlapiLogExecution(LOG_TYPE, FUNC_NAME, "Calling PDF Creation Suitelet");
	}
	else {
		alert('Email address of one of the selected contacts is blank!');
	}
}
/***************************************************************************************************************************************************
* Copyright (c) 1998-2012 NetSuite, Inc.
* 2955 Campus Drive, Suite 100, San Mateo, CA, USA 94403-2511
* All Rights Reserved.
*
* This software is the confidential and proprietary information of NetSuite, Inc. ("Confidential Information"). You shall not disclose such
* Confidential Information and shall use it only in accordance with the terms of the license agreement you entered into with NetSuite.
*
* Name: Create PDF for Virtual Consolidated Invoice
*
* Solution Overview:
* A server-side script will trigger when a user clicks either ìPrint PDFî button or ìEmail PDFî button on the ìVirtual Consolidated Invoiceî
* custom record
*
* @author: Gerrom Infante
* @version: 1.6
* @history: 1.6 [08/15/2012] - Change logic of getting the tax amount.  Script will get the tax amount of the Invoice
*                              regardless if there is a tax item at the line item level
* @history: 1.5 [07/19/2012] - Added Tax Total at the footer of the table
*                            - Added parameter to contain the internal id of the logo to be used in the PDF
*                            - Transaction date of the PDF will now be the transaction date of the first invoice.
*                            - Made changes to the XML template based on customer feedback
* @history: 1.4 [07/17/2012] - Removed Amount column.
*                            - Added Tax column, shows values when there are tax items in the Invoice.
*                            - Due Date now gets the Due Date of the first Invoice.
*                            - Terms is taken from the Terms of the first Invoice
*                            - Added formatting for all amounts: Tax and Total Amount
* @history: 1.3 [07/10/2012] - add checking if amount is null.  This happens when Tax Items are added at the line level.
*                            - display tax subtotal next to the tax item
* @history: 1.2 [05/17/2012] - the dates under the Service Start Date and Service End Date will be taken from the Rev Rec Start Date
*                              and Rev Rec End Date of the Invoice
* @history: 1.1 [03/15/2012] - changed format of the Date & Time Email Sent field
* 					    - Moved Service Start Date and Service End Date from the PDF Header to the PDF Body
* 					    - Move Bank Information from bottom of the page to under iCIMS on the Remittance Slip
* 					    - Removed Service Period and Primary Contact from the PDF header
* 					    - Changed the XML template so that the Remittance Slip is in a separate page
* 					    - Sender of the generated email is now a script parameter instead of the user that initiated the script
* 					    - fixed error when a Contact is added on the custom record
* @history: 1.0 [03/01/2012] - created script based on TRD v1.1 (02/27/2012)
****************************************************************************************************************************************************
*/
function suitelet_createPDF(request, response) {

	var FUNC_NAME = "suitelet_createPDF";

	//variables for the Virtual Consolidated Invoice and Virtual Consolidated Inv List fields
	var CONSOLIDATED_INV_REC 	= "customrecord_virtual_consolidated_inv";
	var CONSOLIDATED_INV_DATETIME = "custrecord_conso_inv_dte_time";
	var CONSOLIDATED_INV_CONTACTS = "custrecord_conso_inv_contacts";
	var CONSOLIDATED_INV_EMAIL	= "custrecord_conso_inv_email";

	var CONSOLIDATED_INV_LIST 		= "recmachcustrecord_conso_inv_parent";
	var CONSOLIDATED_INV_LIST_INV_ID 	= "custrecord_conso_inv_list";

	// custom objects for the Invoice Header and Invoice Line Data
	var objInvoiceHeader = { billto: "",
						date: "",
						invoice_num: "",
						terms: "",
						due_date: "",
						service_start: "",
						service_end: "",
						comp_address: "",
						primary_contact: ""};

	var objInvoiceLine = {	item_description: "",
						tax: "",
						amount: "",
						child_invoice: "",
						service_start: "",
						service_end: ""};

	//8/26/2015 - Json@Audaxium Add in Subtotal value 
	var objInvoiceFooter = {	customer_id: "",
						conso_inv: "",
						amount_due: "",
						subtotal_value: "",
						amount_paid: "",
						check_payable: "",
						cc_info: "",
						bank_info: "",
						tax_total: ""};
	try {
		nlapiLogExecution(LOG_TYPE, FUNC_NAME, "==================== STARTED SUITELET ====================");

		var objContext = nlapiGetContext();

		// get the script parameter values
		var strBankInfo =  objContext.getSetting("SCRIPT", "custscript_icims_bank_information");
		strBankInfo = strBankInfo.replace(/(\r\n|[\r\n])/g, '<br/>');
		objInvoiceFooter.bank_info = strBankInfo;
		nlapiLogExecution(LOG_TYPE, FUNC_NAME, "Bank Information [Parameter]:= " + strBankInfo);

		var strCheckPayable =  objContext.getSetting("SCRIPT", "custscript_icims_checks_payable");
		strCheckPayable = strCheckPayable.replace(/(\r\n|[\r\n])/g, '<br/>');
		objInvoiceFooter.check_payable = strCheckPayable;
		nlapiLogExecution(LOG_TYPE, FUNC_NAME, "Check Payable [Parameter]:= " + strCheckPayable);

		var strCompAddress = objContext.getSetting("SCRIPT", "custscript_icims_comp_address");
		strCompAddress = strCompAddress.replace(/(\r\n|[\r\n])/g, '<br/>');
		objInvoiceHeader.comp_address = strCompAddress;
		nlapiLogExecution(LOG_TYPE, FUNC_NAME, "Company Address [Parameter]:= " + strCompAddress);

		var strPdfTemplate = objContext.getSetting("SCRIPT", "custscript_icims_pdf_xml_template");
		nlapiLogExecution(LOG_TYPE, FUNC_NAME, "PDF Template Internal Id Parameter]:= " + strPdfTemplate);

		//8/26/2015 - Instead of using strSender from parameter, use CURRENT USER
		//Added by Json@Audaxium
		var strSender = '';
		//strSender = objContext.getSetting("SCRIPT", "custscript_icims_pdf_email_sender");
		//nlapiLogExecution(LOG_TYPE, FUNC_NAME, "Email Sender Internal Id [Parameter]:= " + strSender);
		strSender = nlapiGetUser();
		nlapiLogExecution(LOG_TYPE, FUNC_NAME, "Email Sender Internal Id [Current User]:= " + strSender);
		
		// get the record id
		var strRecId = request.getParameter("recordid");
		var strInvoke = request.getParameter("invoke");
		nlapiLogExecution(LOG_TYPE, FUNC_NAME, "Button Pressed:= " + strInvoke);

		// load record
		var recConsoInv = nlapiLoadRecord(CONSOLIDATED_INV_REC, strRecId);
		nlapiLogExecution(LOG_TYPE, FUNC_NAME, "------------------- Processing Consolidated Record.  Internal Id:= " + strRecId + " -------------------");

		// loop thru all the child invoice of the Consolidated Invoice record
		var strRecCount = recConsoInv.getLineItemCount(CONSOLIDATED_INV_LIST);

		if (strRecCount == "0") {
			nlapiLogExecution(LOG_TYPE, FUNC_NAME, "Consolidated record has no child invoices!");
			nlapiLogExecution(LOG_TYPE, FUNC_NAME, "==================== END SUITELET ====================");
			return true;
		}

		var fltTotalAmount = 0.00;
		var fltTaxTotal = 0.00;
		var arrInvoiceLines = [];
		
		//8/26/2015 - By Json@Audaxium Grab PO # on the Invoice (otherrefnum)
		var poJson = {
			'postr':'', //Use to display on the Print out
			'po':{} //Used for tracking unique PO Numbers
		};
		
		//8/26/2015 - By Json@Audaxium grab sub total value
		var fltSubtotalAmount = 0.00;
		
		for (var intRec = 1; intRec <= strRecCount; intRec++) {
			nlapiLogExecution(LOG_TYPE, FUNC_NAME, "******************** Processing invoice " + intRec + " of " + strRecCount + " ********************");
			// load invoice record
			var strInvId = recConsoInv.getLineItemValue(CONSOLIDATED_INV_LIST, CONSOLIDATED_INV_LIST_INV_ID, intRec);
			nlapiLogExecution(LOG_TYPE, FUNC_NAME, "Loading Invoice record. [Interal Id:= " + strInvId + "]");

			var recInvoice = nlapiLoadRecord("invoice", strInvId);
			
			//8/26/2015 - By Json@Audaxium if otherrefnum field value is set, add to poJson.postr and poJson.po
			if (recInvoice.getFieldValue('otherrefnum') && !poJson.po[recInvoice.getFieldValue('otherrefnum')])
			{
				poJson.postr += recInvoice.getFieldValue('otherrefnum')+',';
				poJson.po[recInvoice.getFieldValue('otherrefnum')] = recInvoice.getFieldValue('otherrefnum');
			}
			
			//8/26/2015 - By Json@Audaxium Tally up Subtotal for each invoice
			fltSubtotalAmount = parseFloat(fltSubtotalAmount) + parseFloat(recInvoice.getFieldValue('subtotal'));
			
			// get the header information of the pdf from the 1st invoice
			if (intRec === 1) {
				var strBillAddr = recInvoice.getFieldValue("billaddress");
				if (isEmpty(strBillAddr) === true) {
					strBillAddr = "";
				}
				else {
					strBillAddr = strBillAddr.replace(/(\r\n|[\r\n])/g, '<br/>');
				}
				objInvoiceHeader.billto = strBillAddr;
				nlapiLogExecution(LOG_TYPE, FUNC_NAME, "Consolidated Invoice Bill To:= " + objInvoiceHeader.billto);

				objInvoiceHeader.date = recInvoice.getFieldValue('trandate');
				nlapiLogExecution(LOG_TYPE, FUNC_NAME, "Consolidated Invoice Tran Date:= " + objInvoiceHeader.date);

				objInvoiceHeader.due_date = recInvoice.getFieldValue("duedate");
				nlapiLogExecution(LOG_TYPE, FUNC_NAME, "Consolidated Invoice Due Date:= " + objInvoiceHeader.due_date);

				objInvoiceHeader.invoice_num = recConsoInv.getFieldValue("name");
				nlapiLogExecution(LOG_TYPE, FUNC_NAME, "Consolidated Invoice Number:= " + objInvoiceHeader.invoice_num);

				objInvoiceHeader.terms = recInvoice.getFieldText('terms');
				nlapiLogExecution(LOG_TYPE, FUNC_NAME, "Consolidated Invoice Term:= " + objInvoiceHeader.terms);
			} // end if (intRec === 1)



			// get the info for the line items of the consolidated invoice
			var intLineCount = recInvoice.getLineItemCount("item");

			// loop thru all the line items of the invoice
			strInvId = recInvoice.getFieldValue("tranid");
			nlapiLogExecution(LOG_TYPE, FUNC_NAME, "Invoice ID:= " + strInvId);

			for (var intLine = 1; intLine <= intLineCount; intLine++ ) {
				nlapiLogExecution(LOG_TYPE, FUNC_NAME, "++++++++++++++++++++ Processing line " + intLine + " of " + intLineCount + " ++++++++++++++++++++");

				if (intLine == 1) {
					// get the tax subtotal of the invoice
					var fltTax = recInvoice.getFieldValue('taxtotal');
					if (isNaN(parseFloat(fltTax)) === true) {
						objInvoiceLine.tax = 0.00;
					}
					else {
						objInvoiceLine.tax = fltTax;
					}
					nlapiLogExecution(LOG_TYPE, FUNC_NAME, "Invoice Tax:= " + objInvoiceLine.tax);

					fltTotalAmount = parseFloat(fltTotalAmount) + parseFloat(objInvoiceLine.tax);
					nlapiLogExecution(LOG_TYPE, FUNC_NAME, "Consolidated Invoice Running Total:= " + fltTotalAmount);

					fltTaxTotal = parseFloat(fltTaxTotal) + parseFloat(objInvoiceLine.tax);
					nlapiLogExecution(LOG_TYPE, FUNC_NAME, "Consolidated Invoice Running Tax Total:= " + fltTaxTotal);
				}
				else {
					objInvoiceLine.tax = 0.00;
				}

				var strServiceStart = recInvoice.getLineItemValue('item', 'revrecstartdate', intLine);
				if (isEmpty(strServiceStart) === true) {
					strServiceStart = "";
				}
				nlapiLogExecution(LOG_TYPE, FUNC_NAME, "Invoice Line Service Start Date:= " + strServiceStart);

				var strServiceEnd = recInvoice.getLineItemValue('item', 'revrecenddate', intLine);
				if (isEmpty(strServiceEnd) === true) {
					strServiceEnd = "";
				}
				nlapiLogExecution(LOG_TYPE, FUNC_NAME, "Invoice Line Service End Date:= " +strServiceEnd);

				objInvoiceLine.service_start = strServiceStart;

				objInvoiceLine.service_end = strServiceEnd;

				var strAmount = recInvoice.getLineItemValue("item", "amount", intLine);
				if (isEmpty(strAmount) === true) {
					strAmount = 0.00;
				}
				objInvoiceLine.amount = strAmount;
				nlapiLogExecution(LOG_TYPE, FUNC_NAME, "Invoice Line Item Amount:= " + strAmount);

				objInvoiceLine.child_invoice = strInvId;

				objInvoiceLine.item_description = recInvoice.getLineItemValue("item", "description", intLine);
				nlapiLogExecution(LOG_TYPE, FUNC_NAME, "Line Item Description:= " + objInvoiceLine.item_description);

				fltTotalAmount = parseFloat(fltTotalAmount) + parseFloat(objInvoiceLine.amount);
				nlapiLogExecution(LOG_TYPE, FUNC_NAME, "Consolidated Invoice Running Total:= " + fltTotalAmount);

				arrInvoiceLines.push(objInvoiceLine);

				// reset the object
				objInvoiceLine = {	item_description: "",
								tax: "",
								amount: "",
								child_invoice: "",
								service_end: "",
								service_start: ""};
				nlapiLogExecution(LOG_TYPE, FUNC_NAME, "++++++++++++++++++++ Finished processing line ++++++++++++++++++++");
			} // end of for (var intLine = 1; intLine <= intLineCount; intLine++ )
			nlapiLogExecution(LOG_TYPE, FUNC_NAME, "******************** Finished processing invoice ********************");
		} // end of for (var intRec = 1; intRec <= strRecCount; intRec++)

		//8/26/2015 - By Json@Audaxium set NEW objInvoiceHeader object element called PO #
		if (poJson.postr.length > 0)
		{
			//Remove last "," 
			objInvoiceHeader.ponumber = poJson.postr.substr(0, poJson.postr.lastIndexOf(','));
		}
		else
		{
			objInvoiceHeader.ponumber = '';
		}
		
		// get the footer information
		
		//8/26/2015 - By Json@Audaxium add in fltSubtotalAmount to footer object
		objInvoiceFooter.subtotal_value = (Math.round(100 * fltSubtotalAmount) / 100).toFixed(2);
		
		var strTotalAmount = (Math.round(100 * fltTotalAmount) / 100).toFixed(2);
		objInvoiceFooter.amount_due = strTotalAmount;
		nlapiLogExecution(LOG_TYPE, FUNC_NAME, "Total Amount:= " + objInvoiceFooter.amount_due);

		var strTaxTotal = (Math.round(100 * fltTaxTotal) / 100).toFixed(2);
		objInvoiceFooter.tax_total = strTaxTotal;
		nlapiLogExecution(LOG_TYPE, FUNC_NAME, "Total Tax Amount:= " + objInvoiceFooter.tax_total);

		objInvoiceFooter.customer_id = nlapiEscapeXML(recConsoInv.getFieldText(CONSOLIDATED_INV_CUSTOMER));
		nlapiLogExecution(LOG_TYPE, FUNC_NAME, "Customer Id:= " + objInvoiceFooter.customer_id);

		// replace & in data
		objInvoiceHeader = replaceCharacter(objInvoiceHeader, '&', '&#38;');
//		objInvoiceFooter = replaceCharacter(objInvoiceFooter, '&', '&#38;');
		//arrInvoiceLines = replaceCharacter(arrInvoiceLines, '&', '&#38;');

		if (strInvoke == "print") { // display pdf in new window
			nlapiLogExecution(LOG_TYPE, FUNC_NAME, "Printing PDF");
			//generate the PDF
			generatePDF(strPdfTemplate, objInvoiceHeader, arrInvoiceLines, objInvoiceFooter, strInvoke);
		}
		else { // email pdf to contacts
			nlapiLogExecution(LOG_TYPE, FUNC_NAME, "Collecting Contacts for email.");
			// check if any contacts were selected in the Consolidated Invoice Record
			var arrContacts = recConsoInv.getFieldValues(CONSOLIDATED_INV_CONTACTS);
			nlapiLogExecution(LOG_TYPE, FUNC_NAME, "Selected Contacts:= " + arrContacts);

			//8/26/2015 - Instead of using strRecipient, use customer ID
			//Using Customer ID, Email will get attached to the customer record
			//Added by Json@Audaxium
			var strRecipient = '';
			//strRecipient = recConsoInv.getFieldValue(CONSOLIDATED_INV_EMAIL);
			//nlapiLogExecution(LOG_TYPE, FUNC_NAME, "Email Address:= " + strRecipient);
			strRecipient = recConsoInv.getFieldValue(CONSOLIDATED_INV_CUSTOMER);
			nlapiLogExecution(LOG_TYPE, FUNC_NAME, "Customer ID:= " + strRecipient);
			
            nlapiLogExecution(LOG_TYPE, FUNC_NAME, "Emailing PDF");
               
			generatePDF(strPdfTemplate, objInvoiceHeader, arrInvoiceLines, objInvoiceFooter, strInvoke, arrContacts, strRecId, strSender, strRecipient);

			// update the Date & Time Email Sent field
			var dteSent = new Date();


			// convert date to Eastern Time
			var timezone = jstz.determine_timezone();
			nlapiLogExecution(LOG_TYPE, FUNC_NAME, 'Timezone Name:= ' + timezone.name() +
											'<br/>Timezone Offset:= ' + timezone.offset() +
											'<br/>Daylight Savings Time:= ' + timezone.dst());

			if (timezone.dst() == true) {
				nlapiLogExecution(LOG_TYPE, FUNC_NAME, 'Timezone Offset Used:= -4');
				//dteSent = timeShift(-100);
				dteSent = calcTime('-4')
			}
			else {
				nlapiLogExecution(LOG_TYPE, FUNC_NAME, 'Timezone Offset Used:= -5');
				//dteSent = timeShift(-500);
				dteSent = calcTime('-5');
			}


			var strDate = nlapiDateToString(dteSent, "date");
               var strTime = nlapiDateToString(dteSent, "timeofday");
               var strSent = strDate + " " + strTime;

			recConsoInv.setFieldValue(CONSOLIDATED_INV_DATETIME, strSent);
			nlapiLogExecution(LOG_TYPE, FUNC_NAME, "Date & Time Email Sent:= " + strSent);
			nlapiSubmitRecord(recConsoInv);

			// display email sending successful
			var frmEmailSent = nlapiCreateForm("Email Sent", false);

			// set the stage value
			var fldError = frmEmailSent.addField("custpage_error_message", "text", "Email containing PDF sent.");
			fldError.setDisplayType("inline");
			fldError.setLayoutType("endrow");
			fldError.setPadding(5);

			response.writePage(frmEmailSent);
		}

		nlapiLogExecution(LOG_TYPE, FUNC_NAME, "==================== END SUITELET ====================");
	}
	catch (error) {
	  	if (error.getDetails !== undefined) {
        		nlapiLogExecution ("ERROR", FUNC_NAME,  error.getCode() + ": " + error.getDetails());
      	      throw error;
	    	}
		else {
	    		nlapiLogExecution("ERROR", FUNC_NAME, error.toString());
	        	throw nlapiCreateError("99999", error.toString());
		}
	}
}
/**
 * Function will generate the PDF
 **/
function generatePDF(template_id, invoice_head, invoice_lines, invoice_footer, button, contact, record_id, email_sender, email_recipient) {

	var FUNC_NAME = "generatePDF";

	try {
		nlapiLogExecution(LOG_TYPE, FUNC_NAME, "==================== GENERATING PDF START ====================");

		var strXmlTmplt = nlapiLoadFile(template_id);
		var ciXMLTPL = strXmlTmplt.getValue();

		// Get Company Logo
		var strCompLogo = nlapiGetContext().getSetting('SCRIPT', 'custscript_pdf_logo');
		nlapiLogExecution(LOG_TYPE, FUNC_NAME, "Form Logo: " + strCompLogo);

		var IMAGE_SRC 	= constructImageURL(strCompLogo);
		nlapiLogExecution(LOG_TYPE, FUNC_NAME, "Image URL: " + IMAGE_SRC);

		// Get Company Address
		//var strCompAddress = objPref.getFieldValue("addresstext");
		var strCompAddress = invoice_head.comp_address;
		nlapiLogExecution(LOG_TYPE, FUNC_NAME, "Company Address: " + strCompAddress);

		// populate the PDF header information
		nlapiLogExecution(LOG_TYPE, FUNC_NAME, "Populating PDF Header information");
		ciXMLTPL = ciXMLTPL.replace("{NLMAINLOGO}", IMAGE_SRC);
		ciXMLTPL = ciXMLTPL.replace("{NLMAINADDRESS}", invoice_head.comp_address);
		ciXMLTPL = ciXMLTPL.replace("{INVOICEDATE}", nlapiEscapeXML(invoice_head.date));
		ciXMLTPL = ciXMLTPL.replace("{INVOICENUMBER}", nlapiEscapeXML(invoice_head.invoice_num));
		ciXMLTPL = ciXMLTPL.replace("{INVOICETERMS}", nlapiEscapeXML(invoice_head.terms));
		ciXMLTPL = ciXMLTPL.replace("{INVOICEDUEDATE}", nlapiEscapeXML(invoice_head.due_date));
		ciXMLTPL = ciXMLTPL.replace("{BILLTOADDRESS}", invoice_head.billto);

		//8/26/2015 - By Json@Audaxium Swap out {INVOICEPONUM} with invoice_head.ponumber
		//ciXMLTPL = ciXMLTPL.replace("{INVOICEPONUM}", '');
		ciXMLTPL = ciXMLTPL.replace("{INVOICEPONUM}", invoice_head.ponumber);
			
		// generating the pdf body
		nlapiLogExecution(LOG_TYPE, FUNC_NAME, "Populating PDF Body information");
		var arrLineItemRow = [];
		arrLineItemRow.push(createTableHeader());

		PAGE_BREAK = (PAGE_COUNT == 1) ? 25 :37;
		// create the table lines
		nlapiLogExecution(LOG_TYPE, FUNC_NAME, 'Total number of PDF lines:= ' + invoice_lines.length);
		for (var intLines = 0; intLines < invoice_lines.length; intLines++){
			LINE_COUNT++;
			nlapiLogExecution(LOG_TYPE, FUNC_NAME, 'Line Count [Index: ' + intLines + ']:= ' + LINE_COUNT);
			arrLineItemRow.push(['<tr>'].join(''));
			arrLineItemRow.push(createLineItemRow(invoice_lines[intLines]));
			arrLineItemRow.push(['</tr>'].join(''));
			if (LINE_COUNT == PAGE_BREAK) {
				LINE_COUNT = 0; // reset line count
				PAGE_COUNT++;
				// close the table and insert a page break and open a new table
				arrLineItemRow.push(['</tbody>'].join(''));
				arrLineItemRow.push(['</table>'].join(''));
				arrLineItemRow.push(['<pbr/>'].join(''));
				arrLineItemRow.push(createTableHeader());
			}
		}
		arrLineItemRow.push(['</tbody>'].join(''));
		arrLineItemRow.push(['</table>'].join(''));


		// total table
		arrLineItemRow.push(['<table class="no-border" table-layout="fixed" width="100%" margin-bottom="2px">'].join(''));
		arrLineItemRow.push(['<tbody>'].join(''));
		arrLineItemRow.push(['<tr><td width="15%">&#160;</td><td width="65%">&#160;</td><td width="10%">&#160;</td><td width="10%">&#160;</td></tr>'].join(''));
		
		//8/26/2015 - By Json@Audaxium add in subtotal_value from footer object as Subtotal just above tax
		arrLineItemRow.push(['<tr><td width="15%">&#160;</td><td width="65%">&#160;</td><td align="right" class="header" width="10%">Subtotal</td><td align="right" width="10%">', nlapiEscapeXML(formatAmounts(invoice_footer.subtotal_value, true)),'</td></tr>'].join(''));
		arrLineItemRow.push(['<tr><td width="15%">&#160;</td><td width="65%">&#160;</td><td align="right" class="header" width="10%">Tax Total</td><td align="right" width="10%">', nlapiEscapeXML(formatAmounts(invoice_footer.tax_total, true)),'</td></tr>'].join(''));
		arrLineItemRow.push(['<tr><td width="15%">&#160;</td><td width="65%">&#160;</td><td align="right" class="header" width="10%">Total</td><td align="right" width="10%">', nlapiEscapeXML(formatAmounts(invoice_footer.amount_due, true)),'</td></tr>'].join(''));

		LINE_COUNT = LINE_COUNT + 3;
		if (PAGE_COUNT == 1) {
			// add empty rows
			addEmptyRows(LINE_COUNT, arrLineItemRow, 10);
		}
		else {
			// add empty rows
			addEmptyRows(LINE_COUNT, arrLineItemRow, 20);
		}


		arrLineItemRow.push(['</tbody>'].join(''));
		arrLineItemRow.push(['</table>'].join(''));
		//nlapiLogExecution(LOG_TYPE, FUNC_NAME, "PDF Data:<br/>" + arrLineItemRow.join(''));
		ciXMLTPL = ciXMLTPL.replace("{NLDETAILLINE}", arrLineItemRow.join(''));


		// generating PDF Footer
		nlapiLogExecution(LOG_TYPE, FUNC_NAME, "Populating PDF Footer information");

		ciXMLTPL = ciXMLTPL.replace("{CUSTOMERID}", invoice_footer.customer_id);
		ciXMLTPL = ciXMLTPL.replace("{INVOICENUM}", nlapiEscapeXML(invoice_head.invoice_num));
		ciXMLTPL = ciXMLTPL.replace("{TOTALAMOUNT}", nlapiEscapeXML(formatAmounts(invoice_footer.amount_due, false)));
		ciXMLTPL = ciXMLTPL.replace("{CHECKSPAYABLE}", invoice_footer.check_payable);
		ciXMLTPL = ciXMLTPL.replace("{BANKINFORMATION}", invoice_footer.bank_info);

		// Generate PDF Document
		var pdfFile = nlapiXMLToPDF(ciXMLTPL);

		if (pdfFile) {
			// show pdf if Print PDF button was clicked
			if (button == "print") {
				response.setContentType('PDF', 'print.pdf', 'inline');
				response.write(pdfFile.getValue());
			}
			else { //email pdf
				nlapiLogExecution(LOG_TYPE, FUNC_NAME, "Emailing PDF");

				// get the email subject, body and disclaimer from the script parameters
				var objContext = nlapiGetContext();

				var strEmailSubject = objContext.getSetting('SCRIPT', 'custscript_email_subject');
				// put in the Consolidated Invoice number
				var strInvoiceNum = invoice_head.invoice_num;
				strEmailSubject = strEmailSubject + strInvoiceNum;
				nlapiLogExecution(LOG_TYPE, FUNC_NAME, 'Email Subject:= ' + strEmailSubject);

				var strEmailBody = objContext.getSetting('SCRIPT', 'custscript_email_body');
				strEmailBody = strEmailBody.replace(/(\r\n|[\r\n])/g, "<br/>");
				//strEmailBody.replace('<br/>', '\r\n');
				nlapiLogExecution(LOG_TYPE, FUNC_NAME, 'Email Body:= ' + strEmailBody);

				var strEmailDisclaimer = objContext.getSetting('SCRIPT', 'custscript_email_diclaimer');
				//strEmailDisclaimer.replace(/(\r\n|[\r\n])/g, '<br/>');
				nlapiLogExecution(LOG_TYPE, FUNC_NAME, 'Email Disclaimer:= ' + strEmailDisclaimer);
				
				// join email body and email disclaimer
				strEmailBody = strEmailBody + '<br/><br/><br/>' + strEmailDisclaimer;

				var arrRecord = [];
				arrRecord["customrecord_virtual_consolidated_inv"] = record_id;

				// get the email address of the selected contacts
				var intContactCount = numRows(contact);
				//send the email
				if (intContactCount > 0) {
					var arrCC = [];
					for (var intContact = 0; intContact < intContactCount; intContact++) {
					    var strCC = nlapiLookupField("contact", contact[intContact], "email");
					    nlapiLogExecution(LOG_TYPE, FUNC_NAME, "Contact Email Address:= " + strCC);
					    arrCC.push(strCC);
					}
					
					//8/26/2015 - Use Reply-To Option to send the reply to billing@icims.com.
					//This is new feature added for 2014 release
					//Added by Json@Audaxium
					//nlapiSendEmail(email_sender, email_recipient, strEmailSubject, strEmailBody, arrCC, null, arrRecord, pdfFile, null, null, null);
					nlapiSendEmail(email_sender, email_recipient, strEmailSubject, strEmailBody, arrCC, null, arrRecord, pdfFile, null, null, 'billing@icims.com');
					
				}
				else 
				{
					//8/26/2015 - Use Reply-To Option to send the reply to billing@icims.com.
					//This is new feature added for 2014 release
					//Added by Json@Audaxium
					//nlapiSendEmail(email_sender, email_recipient, strEmailSubject, strEmailBody, null, null, arrRecord, pdfFile, null, null, null);
					nlapiSendEmail(email_sender, email_recipient, strEmailSubject, strEmailBody, null, null, arrRecord, pdfFile, null, null, 'billing@icims.com');
					
				}

				nlapiLogExecution(LOG_TYPE, FUNC_NAME, "Email Sent");
			}
		}
		else {
			nlapiLogExecution(LOG_TYPE, FUNC_NAME, 'Unable to create PDF File.');
		}

		nlapiLogExecution(LOG_TYPE, FUNC_NAME, "==================== GENERATING PDF END ====================");
	}
	catch (error) {
	  	if (error.getDetails !== undefined) {
        		nlapiLogExecution ("ERROR", FUNC_NAME,  error.getCode() + ": " + error.getDetails());
      	      throw error;
	    	}
		else {
	    		nlapiLogExecution("ERROR", FUNC_NAME, error.toString());
	        	throw nlapiCreateError("99999", error.toString());
		}
	}
}
function createTableHeader(arrTable){

	return    [ '<table class="main-border" table-layout="fixed" width="100%" margin-bottom="2px">',
	            '<thead>',
	            '<tr>',
	            '<td class="sub-header" width="15%">Child Invoice #</td>',
	            '<td class="sub-header" width="15%">Service Start Date</td>',
	            '<td class="sub-header" width="15%">Service End Date</td>',
	            '<td class="sub-header" width="45%">Description</td>',
	            '<td class="sub-header" width="10%">Tax</td>',
	            //'<td class="sub-header" width="10%">Amount</td>',
	            '</tr>',
	            '</thead>',
	            '<tbody>'].join('');

}
function createLineItemRow(arrInvoiceField){

	return [	'<td class="body" align="left">', nlapiEscapeXML(arrInvoiceField.child_invoice), '</td>',
		     '<td class="body" align="left">', nlapiEscapeXML(arrInvoiceField.service_start), '</td>',
			'<td class="body" align="left">', nlapiEscapeXML(arrInvoiceField.service_end), '</td>',
			'<td class="body" align="left">', nlapiEscapeXML(arrInvoiceField.item_description), '</td>',
			'<td class="body" align="right">', nlapiEscapeXML(formatAmounts(arrInvoiceField.tax, false)), '</td>'].join('');
			//'<td class="body" align="right">', nlapiEscapeXML(arrInvoiceField.amount), '</td>'].join('');
}
function addEmptyRows(line_count, output_array, max_rows) {

	//var MAX_ROWS = 30;

	// get the difference between max rows and the outputed lines to determine how many empty rows to be generated
	var intDiff = max_rows - line_count

	if (intDiff > 0) {
		for (var x = 1; x <= intDiff; x ++) {
			//output_array.push(['<tr><td class="no-border" colspan="6">&#160;</td></tr>'].join(''));
			output_array.push(['<tr><td class="no-border" colspan="5">&#160;</td></tr>'].join(''));
		}
	}
}
function formatAmounts(amount, dollar_sign) {

	var FUNC_NAME = 'formatAmounts';


//	if (isNumber(amount) === false) {
//		return amount;
//	}


	var num = new NumberFormat();
	num.setInputDecimal('.');
	num.setNumber(amount); // obj.value is '1000000.123456'
	num.setPlaces('2', false);

	if (dollar_sign === true) {
		num.setCurrencyValue('$');
		num.setCurrency(true);
		num.setCurrencyPosition(num.LEFT_OUTSIDE);
	}

	num.setNegativeFormat(num.LEFT_DASH);
	num.setNegativeRed(false);
	num.setSeparators(true, ',', ',');

	if (num.toFormatted() == 0.00) {
		return '';
	}
	else {
		return num.toFormatted();
	}

}
function replaceCharacter(object, look_char, replace_char) {

	var FUNC_NAME = 'replaceCharacter';

	for(var key in object) {
		var value = object[key];
//			nlapiLogExecution('DEBUG', FUNC_NAME, 'Old Value:= ' + value);

		var value2 = value.replace(look_char, replace_char);
//			nlapiLogExecution('DEBUG', FUNC_NAME, 'New Value:= ' + value2);

		object[key] = value2;
	}

	return object;
}

/**
 * Function creates the link to the company logo
 **/
function constructImageURL(strLogo){
	// Get Netsuite URL
	var NETSUITE_URL = getNetsuiteURL();

	// Get Logo URL
	var IMAGE 	= nlapiLoadFile(strLogo);
	var IMAGE_URL 	= nlapiEscapeXML(IMAGE.getURL());

	var IMAGE_SRC 	= "<img src=\"  {stMainLogoURL}  \"/>";
	IMAGE_SRC = IMAGE_SRC.replace('{stMainLogoURL}', NETSUITE_URL+IMAGE_URL);

	return IMAGE_SRC;
}
function getNetsuiteURL(){
	var linkUrl;
	switch (nlapiGetContext().getEnvironment())
	{
		case "PRODUCTION":
			linkUrl = 'https://system.netsuite.com';
			break;

		case "SANDBOX":
			linkUrl = 'https://system.sandbox.netsuite.com';
			break;

		case "BETA":
			linkUrl = 'https://system.beta.netsuite.com';
			break;
	}

	return linkUrl;
}
/**
 * Get Object/Array Length
 * @version 1.0
 * @author William F. Bermudo
 */
function numRows(obj) {
    var ctr = 0;
    for (var k in obj) {
        if (obj.hasOwnProperty(k)) {
            ctr++;
        }
    }
    return ctr;
}
/**
 * Determines if a variable is either set to null or is undefined.
 *
 * @param (object) value The object value to test
 * @return true if the variable is null or undefined, false if otherwise.
 * @type boolean
 * @author Nestor M. Lim
 * @version 1.0
 */
function isNullOrUndefined(value)
{
    if (value === null)
    {
        return true;
    }

    if (value === undefined)
    {
        return true;
    }

    return false;
}
/**
 * Determines if a string variable is empty or not.  An empty string variable
 * is one which is null or undefined or has a length of zero.
 *
 * @param (string) stValue The string value to test for emptiness.
 * @return true if the variable is empty, false if otherwise.
 * @type boolean
 * @throws nlobjError isEmpty should be passed a string value.  The data type passed is {x} whose class name is {y}
 * @author Nestor M. Lim
 * @see isNullOrUndefined
 * @version 1.5
 */
function isEmpty(stValue)
{
    if (isNullOrUndefined(stValue))
    {
        return true;
    }

    if (typeof stValue != 'string' && getObjectName(stValue) != 'String')
    {
        throw nlapiCreateError('10000', 'isEmpty should be passed a string value.  The data type passed is ' + typeof stValue + ' whose class name is ' + getObjectName(stValue));
    }

    if (stValue.length == 0)
    {
        return true;
    }

    return false;
}
/**
 * Returns the object / class name of a given instance
 *
 * @param (object) a variable representing an instance of an object
 * @return the class name of the object
 * @type string
 * @author Nestor M. Lim
 * @version 1.0
 */
function getObjectName(object)
{
    if (isNullOrUndefined(object))
    {
        return object;
    }

    return /(\w+)\(/.exec(object.constructor.toString())[1];
}
/**
 * Returns true if the array passed is empty, otherwise returns false.
 *
 * @param (Array) array the array being tested for emptiness
 * @return true if the array is empty or null or undefined, false if otherwise.
 * @type boolean
 * @throws nlobjError Only objects of type Array can be passed to this function. Type of object is {object type}
 * @author Nestor M. Lim
 * @version 1.0
 */
function isArrayEmpty(array)
{
    if (isNullOrUndefined(array))
    {
        return true;
    }

    if (getObjectName(array) == 'Array Stack')
    {
        throw nlapiCreateError('10007', 'Only objects of type Array can be passed to this function. Type of object is ' + getObjectName(array));
    }

    if (array.length <= 0)
    {
        return true;
    }

    return false;
}
function getLastConsolNum() {

	var FUNC_NAME = "getLastConsolNum";
	//var arrColumns = [	new nlobjSearchColumn("created").setSort()
	var arrColumns = [	new nlobjSearchColumn("created").setSort(true), //set to true to arrange the results in descending order
					    new nlobjSearchColumn("name")];

	var arrResults = nlapiSearchRecord("customrecord_virtual_consolidated_inv", null, null, arrColumns);

	var intResults = numRows(arrResults);
	nlapiLogExecution('DEBUG', 'Total records found', 'The total number of records found is: ' + arrResults.length);
	/*	if (intResults !== 0) {
		if ((isEmpty(arrResults[intResults-1].getValue("name")) === false) || (arrResults[intResults-1].getValue("name") == "0")) { */
	if (intResults !== 0) {
		if ((isEmpty(arrResults[0].getValue("name")) === false) || (arrResults[0].getValue("name") == "0")) { //set the index to 0 to get the first result
			var strNumber = arrResults[0].getValue("name"); 
            var intNum = parseInt(strNumber.slice(1), 10) + 1;
			nlapiLogExecution('DEBUG', 'Script', 'Last Consolidated Invoice is: ' + strNumber + '  ||| New Consolidated Invoice no. is: C00000' + intNum); 
			return "C00000" + intNum;
		}
		else {
			nlapiLogExecution('DEBUG', 'Else');
			return "C000001";
		}
	}
	return "C000001";
}
function timeShift(sOffset) {

	var oLocalDate = new Date();
	var nLocalOffset = oLocalDate.getTimezoneOffset();
	var nSiteTZ = (sOffset/100 * -1) * 60;
	var nDiff = (nLocalOffset - nSiteTZ) * 60000;
	nlapiLogExecution(LOG_TYPE, 'timeShift', 'Time Difference:= ' + nDiff);

	var nShiftedTime = (sOffset < 360) ? oLocalDate.getTime() + nDiff : oLocalDate.getTime() - nDiff;
	var oShifted = new Date(nShiftedTime);

	return oShifted;

}
var jstz=function(){var b=function(a){a=-a.getTimezoneOffset();return a!==null?a:0},d=function(){return b(new Date(2010,0,1,0,0,0,0))},e=function(){return b(new Date(2010,5,1,0,0,0,0))},c=function(){var a=d(),b=e(),f=d()-e();if(f<0)return a+",1";else if(f>0)return b+",1,s";return a+",0"};return{determine_timezone:function(){var a=c();return new jstz.TimeZone(jstz.olson.timezones[a])},date_is_dst:function(a){var c=a.getMonth()>5?e():d(),a=b(a);return c-a!==0}}}();
jstz.TimeZone=function(){var b=null,d=null,e=null,c=function(a){e=a[0];b=a[1];d=a[2];if(typeof jstz.olson.ambiguity_list[b]!=="undefined")for(var a=jstz.olson.ambiguity_list[b],c=a.length,f=0,g=a[0];f<c;f+=1)if(g=a[f],jstz.date_is_dst(jstz.olson.dst_start_dates[g])){b=g;break}};c.prototype={constructor:jstz.TimeZone,name:function(){return b},dst:function(){return d},offset:function(){return e}};return c}();jstz.olson={};
jstz.olson.timezones=function(){return{"-720,0":["-12:00","Etc/GMT+12",!1],"-660,0":["-11:00","Pacific/Pago_Pago",!1],"-600,1":["-11:00","America/Adak",!0],"-660,1,s":["-11:00","Pacific/Apia",!0],"-600,0":["-10:00","Pacific/Honolulu",!1],"-570,0":["-09:30","Pacific/Marquesas",!1],"-540,0":["-09:00","Pacific/Gambier",!1],"-540,1":["-09:00","America/Anchorage",!0],"-480,1":["-08:00","America/Los_Angeles",!0],"-480,0":["-08:00","Pacific/Pitcairn",!1],"-420,0":["-07:00","America/Phoenix",!1],"-420,1":["-07:00",
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       "America/Denver",!0],"-360,0":["-06:00","America/Guatemala",!1],"-360,1":["-06:00","America/Chicago",!0],"-360,1,s":["-06:00","Pacific/Easter",!0],"-300,0":["-05:00","America/Bogota",!1],"-300,1":["-05:00","America/New_York",!0],"-270,0":["-04:30","America/Caracas",!1],"-240,1":["-04:00","America/Halifax",!0],"-240,0":["-04:00","America/Santo_Domingo",!1],"-240,1,s":["-04:00","America/Asuncion",!0],"-210,1":["-03:30","America/St_Johns",!0],"-180,1":["-03:00","America/Godthab",!0],"-180,0":["-03:00",
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      "America/Argentina/Buenos_Aires",!1],"-180,1,s":["-03:00","America/Montevideo",!0],"-120,0":["-02:00","America/Noronha",!1],"-120,1":["-02:00","Etc/GMT+2",!0],"-60,1":["-01:00","Atlantic/Azores",!0],"-60,0":["-01:00","Atlantic/Cape_Verde",!1],"0,0":["00:00","Etc/UTC",!1],"0,1":["00:00","Europe/London",!0],"60,1":["+01:00","Europe/Berlin",!0],"60,0":["+01:00","Africa/Lagos",!1],"60,1,s":["+01:00","Africa/Windhoek",!0],"120,1":["+02:00","Asia/Beirut",!0],"120,0":["+02:00","Africa/Johannesburg",!1],
	"180,1":["+03:00","Europe/Moscow",!0],"180,0":["+03:00","Asia/Baghdad",!1],"210,1":["+03:30","Asia/Tehran",!0],"240,0":["+04:00","Asia/Dubai",!1],"240,1":["+04:00","Asia/Yerevan",!0],"270,0":["+04:30","Asia/Kabul",!1],"300,1":["+05:00","Asia/Yekaterinburg",!0],"300,0":["+05:00","Asia/Karachi",!1],"330,0":["+05:30","Asia/Kolkata",!1],"345,0":["+05:45","Asia/Kathmandu",!1],"360,0":["+06:00","Asia/Dhaka",!1],"360,1":["+06:00","Asia/Omsk",!0],"390,0":["+06:30","Asia/Rangoon",!1],"420,1":["+07:00","Asia/Krasnoyarsk",
	                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         !0],"420,0":["+07:00","Asia/Jakarta",!1],"480,0":["+08:00","Asia/Shanghai",!1],"480,1":["+08:00","Asia/Irkutsk",!0],"525,0":["+08:45","Australia/Eucla",!0],"525,1,s":["+08:45","Australia/Eucla",!0],"540,1":["+09:00","Asia/Yakutsk",!0],"540,0":["+09:00","Asia/Tokyo",!1],"570,0":["+09:30","Australia/Darwin",!1],"570,1,s":["+09:30","Australia/Adelaide",!0],"600,0":["+10:00","Australia/Brisbane",!1],"600,1":["+10:00","Asia/Vladivostok",!0],"600,1,s":["+10:00","Australia/Sydney",!0],"630,1,s":["+10:30",
	                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       "Australia/Lord_Howe",!0],"660,1":["+11:00","Asia/Kamchatka",!0],"660,0":["+11:00","Pacific/Noumea",!1],"690,0":["+11:30","Pacific/Norfolk",!1],"720,1,s":["+12:00","Pacific/Auckland",!0],"720,0":["+12:00","Pacific/Tarawa",!1],"765,1,s":["+12:45","Pacific/Chatham",!0],"780,0":["+13:00","Pacific/Tongatapu",!1],"840,0":["+14:00","Pacific/Kiritimati",!1]}}();
jstz.olson.dst_start_dates=function(){return{"America/Denver":new Date(2011,2,13,3,0,0,0),"America/Mazatlan":new Date(2011,3,3,3,0,0,0),"America/Chicago":new Date(2011,2,13,3,0,0,0),"America/Mexico_City":new Date(2011,3,3,3,0,0,0),"Atlantic/Stanley":new Date(2011,8,4,7,0,0,0),"America/Asuncion":new Date(2011,9,2,3,0,0,0),"America/Santiago":new Date(2011,9,9,3,0,0,0),"America/Campo_Grande":new Date(2011,9,16,5,0,0,0),"America/Montevideo":new Date(2011,9,2,3,0,0,0),"America/Sao_Paulo":new Date(2011,
	9,16,5,0,0,0),"America/Los_Angeles":new Date(2011,2,13,8,0,0,0),"America/Santa_Isabel":new Date(2011,3,5,8,0,0,0),"America/Havana":new Date(2011,2,13,2,0,0,0),"America/New_York":new Date(2011,2,13,7,0,0,0),"Asia/Gaza":new Date(2011,2,26,23,0,0,0),"Asia/Beirut":new Date(2011,2,27,1,0,0,0),"Europe/Minsk":new Date(2011,2,27,2,0,0,0),"Europe/Helsinki":new Date(2011,2,27,4,0,0,0),"Europe/Istanbul":new Date(2011,2,28,5,0,0,0),"Asia/Damascus":new Date(2011,3,1,2,0,0,0),"Asia/Jerusalem":new Date(2011,3,1,
	6,0,0,0),"Africa/Cairo":new Date(2010,3,30,4,0,0,0),"Asia/Yerevan":new Date(2011,2,27,4,0,0,0),"Asia/Baku":new Date(2011,2,27,8,0,0,0),"Pacific/Auckland":new Date(2011,8,26,7,0,0,0),"Pacific/Fiji":new Date(2010,11,29,23,0,0,0),"America/Halifax":new Date(2011,2,13,6,0,0,0),"America/Goose_Bay":new Date(2011,2,13,2,1,0,0),"America/Miquelon":new Date(2011,2,13,5,0,0,0),"America/Godthab":new Date(2011,2,27,1,0,0,0)}}();
jstz.olson.ambiguity_list={"America/Denver":["America/Denver","America/Mazatlan"],"America/Chicago":["America/Chicago","America/Mexico_City"],"America/Asuncion":["Atlantic/Stanley","America/Asuncion","America/Santiago","America/Campo_Grande"],"America/Montevideo":["America/Montevideo","America/Sao_Paulo"],"Asia/Beirut":"Asia/Gaza,Asia/Beirut,Europe/Minsk,Europe/Helsinki,Europe/Istanbul,Asia/Damascus,Asia/Jerusalem,Africa/Cairo".split(","),"Asia/Yerevan":["Asia/Yerevan","Asia/Baku"],"Pacific/Auckland":["Pacific/Auckland",
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           "Pacific/Fiji"],"America/Los_Angeles":["America/Los_Angeles","America/Santa_Isabel"],"America/New_York":["America/Havana","America/New_York"],"America/Halifax":["America/Goose_Bay","America/Halifax"],"America/Godthab":["America/Miquelon","America/Godthab"]};
function calcTime(offset) {

	// create Date object for current location
	d = new Date();

	// convert to msec
	// add local time zone offset
	// get UTC time in msec
	utc = d.getTime() + (d.getTimezoneOffset() * 60000);

	// create new Date object for different city
	// using supplied offset
	nd = new Date(utc + (3600000*offset));

	// return time as a string
	return nd;

}
/**
 * Function is to pre-populate the Company field with the same value as the Company field in the Virtual Consolidated Custom record
 * **/
function beforeLoad_populateCustomer(type, form, request) {

	var FUNC_NAME = 'beforeLoad_populateCustomer';

	var TARGET_PARAM_VALUE = 'main:custrecord_conso_inv_contacts';
	var CUSTOMER_PARAM = 'custrecord_conso_inv_customer';

	try {

             var objContext = nlapiGetContext();
             if (objContext.getExecutionContext() != 'userinterface')
                {
                                 
                    return;
                }

		// check first if the form was loaded from the custom record using the value of the Target parameter
		var strTarget = request.getParameter('target');
		nlapiLogExecution(LOG_TYPE, FUNC_NAME, 'Target Parameter:= ' + strTarget);

		if (isNullOrUndefined(strTarget) === true) {
			nlapiLogExecution(LOG_TYPE, FUNC_NAME, 'Target parameter is null! Terminating script!');
			return true;
		}

		if (strTarget != TARGET_PARAM_VALUE) {
			nlapiLogExecution(LOG_TYPE, FUNC_NAME, 'Target parameter value is not equal to ' + TARGET_PARAM_VALUE);
			return true;
		}

		// set the company field to the custrecord_conso_inv_customer parameter value
		var strCompany = request.getParameter(CUSTOMER_PARAM);
		nlapiSetFieldValue('company', strCompany);

	}
	catch (error) {
		if (error.getDetails !== undefined) {
			nlapiLogExecution ("ERROR", FUNC_NAME,  error.getCode() + ": " + error.getDetails());
			throw error;
		}
		else {
			nlapiLogExecution("ERROR", FUNC_NAME, error.toString());
			throw nlapiCreateError("99999", error.toString());
		}
	}
}
function isArray(o) {
	if ("Array" == classOf(o)) return true;
	return false;
}


function classOf(o) {
	if (undefined === o) return "Undefined";
	if (null === o) return "Null";
	return {}.toString.call(o).slice(8, -1);
}
