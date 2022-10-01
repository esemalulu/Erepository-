// Coupa Expense Report Integration Project
var errmsg;
var customFields = new Array();
var customFieldsToSet = new Array();
var ExpenseReportID;
// Setting up Use External ID param
var param_useExternalID = nlapiGetContext().getSetting('SCRIPT',
    'custscript_coupa_er_extid');
var expenseLineReimburseMap = {};

var context = nlapiGetContext();
var oidcHeader = getAPIHeader('text/xml');	//NIB# 331 Get OIDC API Header
var headers = new Array();
if(oidcHeader){
	headers = oidcHeader;
}else{
	var param_APIKey = context.getSetting('SCRIPT','custscript_coupa_er_apikey');	//NIB# 331 Use API_KEY header if OIDC parameters are not available
	headers['Accept'] = 'text/xml';
	headers['X-COUPA-API-KEY'] = param_APIKey;
}
function scheduled(type) {
	// Variable Declaration
	var param_url = context.getSetting('SCRIPT', 'custscript_coupa_er_url');
	var iTimeOutCnt = 0;
	var tranid = '';

	var response = '';

	var url = param_url
			+ '/api/expense_reports?status=approved_for_payment&exported=false';
	if (context.getSetting('SCRIPT' , 'custscript_er_filter')) {
		url = url + context.getSetting('SCRIPT' , 'custscript_er_filter');
	}
	
	var thisEnv = context.getEnvironment();
	var url_test_contains = [ "-train", "-dev", "-demo", "-dmo", "-qa", "-sandbox",
			"-sbx", "-stage", "-staging", "-stg", "-support", "-test", "-uat",
			"coupacloud.com", "coupadev.com" ];

	// Ensure test url in a non production environment.
	try {
		if (thisEnv != 'PRODUCTION') {
			var test_url = false;
			for (var i = 0; i < url_test_contains.length; i++) {
				if (param_url.indexOf(url_test_contains[i]) > -1) {
					test_url = true;
				}
			}
			if (!test_url) {
				var errMsg = 'Error - script is running in non prod environment and not using a '
						+ url_test_contains
						+ ' in the coupa URL. If you believe this to be incorrect, please contact Coupa Support';
				throw nlapiCreateError('BadEnv', errMsg, false);
			}
		}
	} catch (error) {
		var errordetails;
		errorcode = error.getCode();
		errordetails = error.getDetails() + ".";

		nlapiLogExecution(
				'ERROR',
				'Processing Error - Unable to do Coupa request api call to export Expense Reports',
				'Error Code = ' + errorcode + ' Error Description = '
						+ errordetails);
		nlapiSendEmail(
				-5,
				nlapiGetContext().getSetting('SCRIPT',
						'custscript_coupa_er_email_addr_notify'),
				nlapiGetContext().getSetting('SCRIPT',
						'custscript_coupa_er_acccountname')
						+ ' Expense Report Integration:Processing Error - Unable to do Coupa request api call to export Expense Reports',
				'Error Code = ' + errorcode + ' Error Description = '
						+ errordetails);
		throw error;
	}
	
	if (context.getSetting('SCRIPT' , 'custscript_exprpts_limit'))
		url = url + '&limit=' + context.getSetting('SCRIPT' , 'custscript_exprpts_limit');
	
	LogMsg('url: ' + url);

	try {
		response = nlapiRequestURL(url, null, headers);
	} catch (error) {
		if (error instanceof nlobjError) {
			var errordetails;
			errorcode = error.getCode();
			switch (errorcode) {
			case "SSS_REQUEST_TIME_EXCEEDED":
				if (iTimeOutCnt > 2) {
					errordetails = "Connection closed because it has exceed the time out period (NetSuite has not received a response after 5 seconds on initial connection or after 45 seconds on the request). tried to establish connection 3 times and still failed. Please contact Technical Support.";
					exit = true;
					break;
				} else {
					errordetails = "Connection closed because it has exceed the time out period (NetSuite has not received a response after 5 seconds on initial connection or after 45 seconds on the request). retrying to establish a connection.";
					iTimeOutCnt = iTimeOutCnt + 1;
					k = 0;
					break;
				}
			case 404:
				LogAudit('No new record to export');
				return;
			default:
				errordetails = error.getDetails() + ".";
				exit = true;
				break;
			}
			LogErr('Processing Error - Unable to set export flag '
					+ 'Expense Report Id = ' + tranid + ' Error code: '
					+ errorcode + 'Error description:' + errordetails);
			nlapiSendEmail(
					-5,
					nlapiGetContext().getSetting('SCRIPT',
							'custscript_coupa_er_email_addr_notify'),
					nlapiGetContext().getSetting('SCRIPT',
							'custscript_coupa_er_acccountname')
							+ ' Expense Report Integration:Processing Error - Unable to do Coupa request api call to export Expense Report',
					'Error Code = ' + errorcode + ' Error Description = '
							+ errordetails);
		}
	} // catch end

	if (response.getCode() == 200) {
		LogMsg('response.getCode() is ' + response.getCode());
		var responseXML = nlapiStringToXML(response.getBody());

		LogMsg('body is ' + response.getBody());

		var expenseHeaderNode = nlapiSelectNode(responseXML, 'expense-reports');
		var expenseHeaderHeaderNode = new Array();
		expenseHeaderHeaderNode = nlapiSelectNodes(expenseHeaderNode,
				'expense-report');

		LogMsg('Expense Report to Process :' + expenseHeaderHeaderNode.length);

		for (var i = 0; i < expenseHeaderHeaderNode.length; i++) {
			yieldScript();
			var usage = getnumber(context.getRemainingUsage());
			LogAudit('current Usage at: ' + usage);
			yieldScript();

			tranid = nlapiSelectValue(expenseHeaderHeaderNode[i], 'id');

			// var expenseLinesNode =
			// nlapiSelectNode(expenseHeaderHeaderNode[i], 'expense-lines');
			// var expenseLinesLineNode = nlapiSelectNode(expenseLinesNode,
			// 'expense-line');
			// var expensedByNode =nlapiSelectNode(expenseLinesLineNode,
			// 'expensed-by');
			// var entityid = nlapiSelectValue(expensedByNode, 'id');

			var expenseExists = 'true';
			var creditCardExpense = 'false';
			expenseExists = findExpenseReport(tranid);
			LogMsg('Coupa Expense ID is ' + expenseExists);

			if (context.getSetting('SCRIPT',
					'custscript_coupa_er_creditcardskip')) {
				if (context.getSetting('SCRIPT',
						'custscript_coupa_er_creditcardskip') == 'T') {

					var expenseLinesNode = nlapiSelectNodes(
							expenseHeaderHeaderNode[i], 'expense-lines');
					var expenseLinesLineNode = nlapiSelectNodes(
							expenseLinesNode[0], 'expense-line');
					var importedNode = nlapiSelectNode(expenseLinesLineNode[0],
							'expense-line-imported-data');
					if (importedNode != null)
						creditCardExpense = 'true';
				}
			}

			if (expenseExists == 'false' && creditCardExpense == 'false') {
				LogMsg('Expense Report ' + tranid
						+ ' is not existing in NetSuite');
				var expensecreatereturn = createExpenseReport(
						expenseHeaderHeaderNode[i], tranid);
				if (!expensecreatereturn)
					LogAudit('Error Creating ER: ' + tranid + ', ' + errmsg);
				else {
					LogAudit('Successfully created NetSuite expensereport: '
							+ ExpenseReportID + ' for Coupa #: ' + tranid);
				}
			} else {
			  var payViaCoupaPay = context.getSetting('SCRIPT',
        'custscript_coupa_er_coupapay');
        if (payViaCoupaPay == 'T'){
          var paymentChannel = nlapiSelectValue(expenseHeaderHeaderNode[i], 'payment-channel');
          if (paymentChannel == 'ERP'){
            LogMsg('Payment Channel is ERP, marking report as approved to allow ERP payment');
            var record = nlapiLoadRecord('expensereport', expenseExists);
            record.setFieldValue('accountingapproval', 'T');
            record.setFieldValue('complete', 'T');
            nlapiSubmitRecord(record, true, true);
            setExportedToTrue(tranid);
continue;
          }
        }
				if (creditCardExpense == 'true') {
					LogMsg('Skipping Expense Report: ' + tranid
							+ ' as it is a Credit Card Transaction');
				} else {
					LogMsg('Editing is not feasible in Coupa. You are trying to Update Expense Report #:'
							+ expenseExists);
				}
			}
		}

	}
}

// Setting Expense Report to true
function setExportedToTrue(id) {


	// getting transaction list
	var url = nlapiGetContext().getSetting('SCRIPT', 'custscript_coupa_er_url')
			+ '/api/expense_reports/' + id + '?exported=true';
	var postData = "<?xml version='1.0' encoding='UTF-8'?><expense-report><exported type='boolean'>true</exported></expense-report>";
	var response = '';
	var iTimeOutCnt = 0;

	// loop start
	for (var k = 0; k < 1; k++) {
		yieldScript();
		// try start
		try {
			response = nlapiRequestURL(url, postData, headers, 'PUT');
		} catch (error) {
			if (error instanceof nlobjError) {
				var errordetails;
				errorcode = error.getCode();
				switch (errorcode) {
				case "INVALID_REF_KEY":
					errordetails = "Reference Key Invalid.";
					return;

				case "SSS_REQUEST_TIME_EXCEEDED":
					if (iTimeOutCnt > 2) {
						errordetails = "Connection closed because it has exceed the time out period (NetSuite has not received a response after 5 seconds on initial connection or after 45 seconds on the request). tried to establish connection 3 times and still failed. Please contact Technical Support.";
						exit = true;
						break;
					} else {
						errordetails = "Connection closed because it has exceed the time out period (NetSuite has not received a response after 5 seconds on initial connection or after 45 seconds on the request). retrying to establish a connection.";
						iTimeOutCnt = iTimeOutCnt + 1;
						k = 0;
						break;
					}

				default:
					errordetails = error.getDetails() + ".";
					exit = true;
					break;
				}

				LogErr(' Error code:' + errorcode + 'Error description:'
						+ errordetails);
				nlapiSendEmail(
						-5,
						nlapiGetContext().getSetting('SCRIPT',
								'custscript_coupa_er_email_addr_notify'),
						nlapiGetContext().getSetting('SCRIPT',
								'custscript_coupa_er_acccountname')
								+ ' Expense Report Integration:Processing Error - Unable to do Coupa request api call to export Expense Report',
						'Error Code = ' + errorcode + ' Error Description = '
								+ errordetails);
			}

		} // catch end

	}// loop end

	if (response.getCode() != '200') {
		LogErr('Coupa Expense Report Id = ' + id + ' response failed:'
				+ response.getDetails());
	}

}

// Creating Expense Report when the ER is not yet exported to NetSuite

function createExpenseReport(expenseHeaderHeaderNode, tranid) {
	// VARIABLE DECLARATIONS HERE
	// var expenseReportLines = new Array();
	// var expenseExpenseLine = new Array();
	// var coupaEmployee;
	// var coupaERNumber;
	// var tranid;
	var coupaERCustomBody;
	// var totalamount = 0;
	// var expenseDate;
	// var expenseLine_amount;
	// var expenseCategoryNode;
	// var expenseCurrencyCode;
	var expenseCategoryNode;
	var expenseCategoryLine;
	// var accountNode;
	// var verifyRecord;
	var convertedcurr;
	var coupaExchangeRate;
	var coupaDept = null;
	var coupaClass = null;
	var coupaLocation = null;
	var sendTaxCode = null;
	var foreignexpenseLineAmount;
	var nonReimbursable;
	var enableReimbursableFieldSupport = context.getSetting('SCRIPT', 'custscript_coupa_er_enable_reimbursable') == "T" ? true : false;
    	sendTaxCode = context.getSetting('SCRIPT',
        	'custscript_coupa_er_send_taxcode');

	// variable declarations
	try {

		var record = nlapiCreateRecord('expensereport');
		// var x = 0;
		var testparam_url = context.getSetting('SCRIPT',
				'custscript_coupa_er_url');
		var testparam_APIKey = context.getSetting('SCRIPT',
				'custscript_coupa_er_apikey');
		// Get Custom Body Parameter value
		var coupaERCustomBody = context.getSetting('SCRIPT',
				'custscript_coupa_er_body');
		// var arrCustBodyList = new Array();
		// var arrTempList = new Array();

		if (coupaERCustomBody) {
			getCustomFields(coupaERCustomBody, expenseHeaderHeaderNode);
		} else {
			LogMsg('No custom Fields');
		}

		// these are global arrays
		var customFieldsLen = customFields.length;
		var customFieldsToSetLen = customFieldsToSet.length;

		if (!customFieldsLen) {
			LogMsg('debug', 'no custom fields to set');
		}

		var expenseLinesNode = new Array();
		expenseLinesNode = nlapiSelectNodes(expenseHeaderHeaderNode,
				'expense-lines');

		var expenseLinesLineNode = new Array();
		var expensedByNode = new Array();

		// Expense Nodes
		for (var xx = 0; xx < expenseLinesNode.length; xx++) {
			yieldScript();
			expenseLinesLineNode = nlapiSelectNodes(expenseLinesNode[xx],
					'expense-line');

			expensedByNode = nlapiSelectNode(expenseHeaderHeaderNode,
					'expensed-by');
			var coupaEmployee = nlapiSelectValue(expensedByNode,
					'employee-number');
			LogMsg('entered for coupaEmployee ' + coupaEmployee);

			// Get custom columns
			var coupaPOCustomCols = context.getSetting('SCRIPT',
					'custscript_coupa_er_column');

			for (var yy = 0; yy < expenseLinesLineNode.length; yy++) {
				yieldScript();
			  if (coupaPOCustomCols) {
	        getCustomColumn(coupaPOCustomCols, expenseLinesLineNode[yy]);
	      }
	      var customColumnsLen = customColumns.length;
	      var customColumnsToSetLen = customColumnsToSet.length;


				// Executing Expense Sublist
				// Internal Revision
				/*
				 * if (nlapiSelectValue(expenseLinesLineNode[yy],
				 * 'external-src-name')) { var coupaRevisionNumber =
				 * nlapiSelectValue( expenseLinesLineNode[yy],
				 * 'external-src-name');
				 * record.setFieldValue('custbody_coupa_er_internalrevision',
				 * coupaRevisionNumber); } else { errmsg = 'No value for
				 * coupaRevisionNumber for ER#: ' + tranid; coupaRevisionNumber =
				 * null; LogMsg(errmsg); }
				 */
				record.setFieldValue('custbody_coupa_er_internalrevision', 1);

				// Coupa ER ID
				if (nlapiSelectValue(expenseLinesLineNode[yy],
						'expense-report-id')) {
					var coupaERNumber = nlapiSelectValue(
							expenseLinesLineNode[yy], 'expense-report-id');
					record.setFieldValue('custbody_coupa_er_number',
							coupaERNumber);
				} else {
					errmsg = 'No value for coupaERNumber for ER#: ' + tranid;
					coupaERNumber = null;
					LogMsg(errmsg);
				}

				// Title for Memo
				if (nlapiSelectValue(expenseHeaderHeaderNode, 'title')) {
					var coupaTitle = nlapiSelectValue(expenseHeaderHeaderNode,
							'title');
					record.setFieldValue('memo', coupaTitle);
				} else {
					errmsg = 'No value for coupaTitle for ER#: ' + tranid;
					coupaTitle = "";
					LogMsg(errmsg);
				}

				if (yy == 0) {

					var verifiedEmployee;
					if (coupaEmployee) {
						verifiedEmployee = verifyEmployee(coupaEmployee);
					} else {
						errmsg = 'No Employee Number in Coupa.' + tranid;
						LogErr(errmsg);
						return false;
					}

					// Check employee in NetSuite
					if (verifiedEmployee) {
						record.setFieldValue('entity', verifiedEmployee);
					} else {
						errmsg = 'Employee internal ID not found in NetSuite from Expense Report:'
								+ tranid;
						LogErr(errmsg);
						continue;
					}

					// Checking for Expense Link
					if (context.getSetting('SCRIPT',
							'custscript_coupa_er_link_field')) {
						record.setFieldValue(context.getSetting('SCRIPT',
								'custscript_coupa_er_link_field'),
								context.getSetting('SCRIPT',
										'custscript_coupa_er_url')
										+ '/expense_reports/'
										+ nlapiSelectValue(
												expenseHeaderHeaderNode, 'id'));
					}

					// Setting posting period
					var eventHeader = nlapiSelectNode(expenseHeaderHeaderNode,
							'events');
					var events = new Array();
					events = nlapiSelectNodes(eventHeader, 'event');
					var approved_date = nlapiSelectValue(expenseHeaderHeaderNode, 'submitted-at');
					nlapiLogExecution('AUDIT', 'Expense Report Submitted at: ', approved_date);
					for (var w = 0; w < events.length; w++) {
						yieldScript();
						if (nlapiSelectValue(events[w], 'status') == 'accounting_review') {
							approved_date = nlapiSelectValue(events[w],
									'created-at');
							nlapiLogExecution('AUDIT', 'Using accounting_review date for searching Posting Period: ', approved_date);
						}
					}
					var useApprovedForPaymentDate = context.getSetting('SCRIPT', 'custscript_coupa_er_use_approved_at_date');				//NIB-486
					if (useApprovedForPaymentDate && useApprovedForPaymentDate == 'T') {
						for (var event = 0; event < events.length; event++) {
							yieldScript();
							if (nlapiSelectValue(events[event], 'status') == 'approved_for_payment') {
								approved_date = nlapiSelectValue(events[event], 'updated-at');
								nlapiLogExecution('AUDIT', 'Using approved_for_payment date for searching Posting Period: ', approved_date);
							}
						}
					}
					var formattedDate = ConvertCoupaDateToNetSuiteDate(approved_date);
					var postingPeriodId = calculatePostingPeriod(formattedDate);
					nlapiLogExecution('DEBUG', 'Date for Posting Period is ',
							postingPeriodId);

					record.setFieldValue('postingperiod', postingPeriodId);

					// Setting approvals
					var expenseApproval = context.getSetting('SCRIPT',
							'custscript_coupa_er_approval');
					
					if (context.getSetting('SCRIPT',
							'custscript_coupa_er_approval')) {

						if (expenseApproval == 'true') {
							expenseApproval = 'T';
						}

						if (expenseApproval == 'false') {
							expenseApproval = 'F';
						}

						if (expenseApproval != null && expenseApproval != "") {
							record.setFieldValue('accountingapproval',
									expenseApproval);
						} else {
							LogMsg('No Expense Approval Setup.');
						}
					}

					var payViaCoupaPay = context.getSetting('SCRIPT', 'custscript_coupa_er_coupapay');
					if (payViaCoupaPay == 'T'){
					  var paymentChannel = nlapiSelectValue(expenseHeaderHeaderNode, 'payment-channel');
					  LogMsg('Payment Channel is ' + paymentChannel);
					  if (paymentChannel == 'CoupaPay'){
					    LogMsg('Payment Channel is CoupaPay, marking report as not approved to prevent payment');
					    record.setFieldValue('accountingapproval', 'F');
              record.setFieldValue('complete', 'F');
					  }
					}

					// set multicurrency
					record.setFieldValue('usemulticurrency', 'T');
					LogMsg(' Multiple currency is enabled. Amount might not be the exact conversion.');

					// Set Field Values From Coupa Expense record
					record.setFieldValue('trandate', formattedDate);
					record.setFieldValue('externalid', 'Coupa-expensereport'
							+ tranid);
					//set custom form id 
					var customFormId = context.getSetting('SCRIPT', 'custscript_coupa_er_customform_id');
					nlapiLogExecution('DEBUG', 'Custom Form ID value is  ',
								customFormId);
					if(customFormId != null && customFormId != ''){
						record.setFieldValue('customform', customFormId);
						nlapiLogExecution('DEBUG', 'Custom Form ID value is set to  ',
								customFormId);
					} else {
						record.setFieldValue('customform', 46);
					}
			
					// Set Custom Field Values
					if (customFieldsLen != null && customFieldsToSetLen != null) {
						for (var y = 0; y < parseInt(customFieldsLen); y++) {
							yieldScript();
							record.setFieldValue(customFieldsToSet[y],
									customFields[y]);
						}
					}

				} // End of yy == 0

				//corporate credit card 
				var corporateCard = context.getSetting('SCRIPT','custscript_coupa_er_corporate_card')
				LogMsg('Corporate Card Checkbox is set to ' + corporateCard);
				if (corporateCard != null && corporateCard == 'T'){
					corporateCard = true;
					var externalSrcName = nlapiSelectValue(expenseLinesLineNode[yy],'external-src-name');
					LogMsg('externalSrcName ' + externalSrcName);
					if (externalSrcName.indexOf('corporate_credit') > -1){
						externalSrcName = 'T';
						LogMsg('external-src-name is corporate credit card ' + externalSrcName);
					}
					else{
						externalSrcName = false;
					}
				} else {
					corporateCard = false;
				}
				//get reimbursable employee boolean value 
				nonReimbursable = nlapiSelectValue(expenseLinesLineNode[yy], 'employee-reimbursable');
				if(enableReimbursableFieldSupport) {
					expenseLineReimburseMap[nlapiSelectValue(expenseLinesLineNode[yy], 'id')] = nonReimbursable;
					if (nlapiSelectValue(expenseLinesLineNode[yy], 'type') == "ItemizedExpenseLine") {
						nlapiLogExecution('DEBUG', 'Parent Expense Line: ' + nlapiSelectValue(expenseLinesLineNode[yy], 'parent-expense-line-id'), JSON.stringify(expenseLineReimburseMap));
						nonReimbursable = expenseLineReimburseMap[nlapiSelectValue(expenseLinesLineNode[yy], 'parent-expense-line-id')] == 'true' ? 'true' : 'false';
						nlapiLogExecution('DEBUG', 'ItemizedExpenseLine found  ', 'Searching Reimburse Value from Parent Expense Line: ' + nonReimbursable);
					}
				}
				nlapiLogExecution('DEBUG','Reimburse to employee  ', nonReimbursable);
				if(nonReimbursable == 'true'){
					nonReimbursable = 'F'
				}
				else {
					nonReimbursable = 'T'
				}
				LogMsg('value for employee Reimbursable ' + nonReimbursable);
				// LogMsg('debug','entered for expenseCategoryLine ' + nonReimbursable);
				nlapiLogExecution('DEBUG','nonReimbursable ', nonReimbursable);
				
				expenseCategoryNode = nlapiSelectNode(expenseLinesLineNode[yy],
						'expense-category');
				expenseCategoryLine = nlapiSelectValue(expenseCategoryNode,
						'name');
				LogMsg('entered for expenseCategoryLine ' + expenseCategoryLine);

				var expenseReason = "";
				if (nlapiSelectValue(expenseLinesLineNode[yy], 'reason')) {
					expenseReason = nlapiSelectValue(expenseLinesLineNode[yy],
							'reason');
					LogMsg('expenseReason: ' + expenseReason);
				} else {
					errmsg = 'No expense reason in Coupa.';
					expenseReason = "";
					LogMsg(errmsg);
				}
				var lineID = nlapiSelectValue(expenseLinesLineNode[yy], 'id');
				var coupaExpDescription = nlapiSelectValue(
						expenseLinesLineNode[yy], 'description');

				// getting line currency

				//Code by Madiha Aamir 3/5/2020
				convertedcurr = getCoupaCurrencyForeign(expenseLinesLineNode[yy]);
				coupaExchangeRate=getCoupaExchangeRate(expenseLinesLineNode[yy]);
				//convertedcurr = getCoupaCurrency(expenseLinesLineNode[yy]);
				//End Code by Madiha Aamir 3/5/2020

				LogMsg('entered for convertedcurr ' + convertedcurr);

				// split accounting check
				var splitaccounting = 'FALSE';
				// var actalloc = nlapiSelectNode(expenseLinesLineNode[yy],
				// 'account-allocations');
				var actalloc = nlapiSelectNode(expenseLinesLineNode[yy],
						'account-allocations');
				var accountallocations = new Array();
				accountallocations = nlapiSelectNodes(actalloc,
						'account-allocation');
				if (accountallocations.length >= 1) {
					splitaccounting = 'TRUE';

				}
				LogMsg('Split accounting = ' + splitaccounting);

				if (splitaccounting == 'TRUE') {
					for (var i = 0; i < accountallocations.length; i++) {
						yieldScript();
						var splitLineAmount = parseFloat(nlapiSelectValue(
								accountallocations[i], 'amount'));
						var acctAllocNode = new Array();
						var accountType;
						var splitConvertedCurr;
						acctAllocNode = nlapiSelectNode(accountallocations[i],
								'account');

						var splitCoupaDept = getCoupaDept(acctAllocNode);
						var splitCoupaClass = getCoupaClass(acctAllocNode);
						var splitCoupaLocation = getCoupaLocation(acctAllocNode);
						var acctAllocPct = parseFloat(nlapiSelectValue(
							accountallocations[i], 'pct'));

						if (acctAllocNode.length) {
							accountType = nlapiSelectNode(acctAllocNode,
									'account-type');
							splitConvertedCurr = getCoupaCurrency(accountType);
							LogMsg('entered for splitConvertedCurr '
									+ splitConvertedCurr);
						}

						record.selectNewLineItem('expense');
						record
								.setCurrentLineItemValue(
										'expense',
										'expensedate',
										ConvertCoupaDateToNetSuiteDate(nlapiSelectValue(
												expenseLinesLineNode[yy],
												'expense-date')));

						if (splitLineAmount) {
							// record.setCurrentLineItemValue('expense','amount',splitLineAmount);
							record.setCurrentLineItemValue('expense',
									'foreignamount', splitLineAmount);
							record.setCurrentLineItemValue('expense', 'amount',
									splitLineAmount*coupaExchangeRate);

						} else {
							LogMsg('No Amount in Coupa.');
						}

						if (enableReimbursableFieldSupport && nonReimbursable) {
							record.setCurrentLineItemValue('expense', 'isnonreimbursable', nonReimbursable);
						} else {
							LogMsg('No Category in Coupa.');
						}
						//check if paid by corp credit card
						if(corporateCard){
							if(externalSrcName){
								record.setCurrentLineItemValue('expense',
										'corporatecreditcard', externalSrcName);
							}else {
								LogMsg('No corporatecreditcard in Coupa.');
							}
						}
						if (expenseCategoryLine) {
							record.setCurrentLineItemText('expense',
									'category', expenseCategoryLine);
						} else {
							LogMsg('No Category in Coupa.');
						}

						// if(splitConvertedCurr){
						if (convertedcurr) {
							// record.setCurrentLineItemValue('expense','currency',splitConvertedCurr);
							record.setCurrentLineItemValue('expense',
									'currency', convertedcurr);
						} else {
							LogMsg('No Currency in Coupa.');
						}

						if (lineID) {
							record.setCurrentLineItemValue('expense',
									'custcol_coupa_er_lineid', lineID);
						} else {
							LogMsg('No Line ID in Coupa.');
						}

						if (coupaExpDescription) {
							record.setCurrentLineItemValue('expense',
									'custcol_coupa_er_desc',
									coupaExpDescription);
						} else {
							LogMsg('No Expense Description in Coupa.');
						}
						if (expenseReason) {
							record.setCurrentLineItemValue('expense',
									'custcol_coupa_er_reason', expenseReason);
							record.setCurrentLineItemValue('expense', 'memo',
									expenseReason);
						} else {
							LogMsg('No Reject Reason in Coupa.');
						}

						// dept
						if (nlapiGetContext().getSetting('SCRIPT',
								'custscript_coupa_er_deptseg')) {
							if (splitCoupaDept != null && splitCoupaDept != "") {
								record.setCurrentLineItemValue('expense',
										'department', splitCoupaDept);
							} else {
								LogMsg('Coupa Department not found.');
							}
						}

						// class
						if (splitCoupaClass) {
							if (splitCoupaClass != null && splitCoupaClass != "") {
								record.setCurrentLineItemValue('expense',
										'class', splitCoupaClass);
							} else {
								LogMsg('Coupa class not Found.');
							}
						}

						// location
						if (context.getSetting('SCRIPT',
								'custscript_coupa_er_locseg')) {
							if (splitCoupaLocation != null && splitCoupaLocation != "") {
								record.setCurrentLineItemValue('expense',
										'location', splitCoupaLocation);
							} else {
								LogMsg('Coupa Location not found.');
							}
						}

						// Set Custom Column
						LogMsg('customColumnsLen ' + customColumnsLen
								+ ' customColumnsToSetLen '
								+ customColumnsToSetLen);

						if (customColumnsLen != null
								&& customColumnsToSetLen != null) {

							for (var y = 0; y < parseInt(customColumnsLen); y = y + 1) {
								yieldScript();
								// var currentLine =
								// nlapiGetCurrentLineItemIndex('expense');
								var valuecustfield = "";
								LogMsg('current field num ' + y);
								//LogMsg('currentLine Value'
								//		+ customColumns[currentLine]);

								// for(var y=0; y<parseInt(currentLine); y++){

								if (customColumns[y] == 'true') {
									valuecustfield = 'T';
								} else if (customColumns[y] == 'false') {
									valuecustfield = 'F';
								} else if (customColumns[y] == null
										|| customColumns[y] == "") {
									valuecustfield = "";
								} else {
									valuecustfield = customColumns[y];
								}
								LogMsg('customColumnsToSet[y] '
										+ customColumnsToSet[y]
										+ ' valuecustfield ' + valuecustfield);
								record.setCurrentLineItemValue('expense',
										customColumnsToSet[y], valuecustfield);

							} // end of FOR that goes through each custom
							// columns
						} // end of IF that goes through each custom columns

						// Checking for Receipt field
						if (context.getSetting('SCRIPT',
								'custscript_coupa_er_recpt_check') == 'T') {
							var artifactHeader = nlapiSelectNode(
									expenseLinesLineNode[yy],
									'expense-artifacts');
							var artifact = nlapiSelectNodes(artifactHeader,
									'expense-artifact/id');
							var valueToSet = "T";
							if (artifact == null || artifact == "") {
								valueToSet = "F";
							}
							record.setCurrentLineItemValue('expense', 'receipt',
									valueToSet);
						}
                        if (sendTaxCode != null && sendTaxCode == 'T') {
                            var expenseLineTaxes = new Array();
                            expenseLineTaxes = nlapiSelectNodes(expenseLinesLineNode[yy], 'expense-line-taxes');
                            var expenseLineTaxesNodes = new Array();


                            for (var tx = 0; tx < expenseLineTaxes.length; tx++) {
                            	yieldScript();

                                expenseLineTaxesNodes = nlapiSelectNode(expenseLineTaxes[tx], 'expense-line-tax');

                                //for (var ty = 0; ty < expenseLineTaxesNodes.length; ty++) {
                                if (expenseLineTaxesNodes != null) {
                                    if (nlapiSelectValue(expenseLineTaxesNodes, 'tax-code/code') != null) {
                                        var coupaTaxcode = nlapiSelectValue(expenseLineTaxesNodes, 'tax-code/code').split(':');

                                        if (coupaTaxcode.length > 0 && coupaTaxcode[1] != null) {

                                            record.setCurrentLineItemValue('expense', 'taxcode', coupaTaxcode[1]);
                                        }
                                    } else {
                                        errmsg = 'No value for taxcode for ER#: ' + tranid;
                                        coupaTaxcode = null;
                                        LogMsg(errmsg);
                                    }
                                }
                            }
                        }
                        //For Non-US split account expense report, if send tax code parameter is false or not there, we need to add tax amount to the 'amount' in account allocation
                		else {
                			var expenseLineTaxes = new Array();
                            expenseLineTaxes = nlapiSelectNodes(expenseLinesLineNode[yy], 'expense-line-taxes');
                            var expenseLineTaxesNodes = new Array();
                            for (var tx = 0; tx < expenseLineTaxes.length; tx++) {
                            	yieldScript();
                                expenseLineTaxesNodes = nlapiSelectNode(expenseLineTaxes[tx], 'expense-line-tax');
                                if (expenseLineTaxesNodes != null) {
                                    var coupaEstimatedTax = parseFloat(nlapiSelectValue(expenseLineTaxesNodes, 'amount'));
                                    if (coupaEstimatedTax) {
                                    	var nonusAccountAllocationTaxAmount =  (acctAllocPct * coupaEstimatedTax) / 100;
                                        var nonusAccountAllocationTotal = parseFloat(splitLineAmount) + parseFloat(nonusAccountAllocationTaxAmount);
                                        record.setCurrentLineItemValue('expense', 'foreignamount', nonusAccountAllocationTotal);
                                        record.setCurrentLineItemValue('expense', 'amount',
											nonusAccountAllocationTotal);
                                    }
                                }
                            }
 						}
						record.commitLineItem('expense');
					}
				}

				else {
					var accountNode = nlapiSelectNode(expenseLinesLineNode[yy],
						'account');

					if (accountNode) {
						coupaDept = getCoupaDept(accountNode);
						coupaClass = getCoupaClass(accountNode);
						coupaLocation = getCoupaLocation(accountNode);
					} else {
						LogMsg('Record has No Account');
					}
					expenseLineAmount = nlapiSelectValue(
							expenseLinesLineNode[yy], 'amount');
					foreignexpenseLineAmount = nlapiSelectValue(
								expenseLinesLineNode[yy], 'foreign-currency-amount');
					LogMsg('entered for expenseLineAmount ' + expenseLineAmount);

					// if(convertedcurr){
					// var lineID =
					// nlapiSelectValue(expenseLinesLineNode[yy],'parent-expense-line-id');

					record.selectNewLineItem('expense');
					record.setCurrentLineItemValue('expense', 'expensedate',
							ConvertCoupaDateToNetSuiteDate(nlapiSelectValue(
									expenseLinesLineNode[yy], 'expense-date')));
					//check box update 
					if (enableReimbursableFieldSupport && nonReimbursable) {
						record.setCurrentLineItemValue('expense', 'isnonreimbursable', nonReimbursable);
					} else {
						LogMsg('No isnonreimbursable in Coupa.');
					}		
					//check if paid by corp credit card
					if(corporateCard){
						if(externalSrcName){
							record.setCurrentLineItemValue('expense',
									'corporatecreditcard', externalSrcName);
						}else {
							LogMsg('No corporatecreditcard in Coupa.');
						}
					}						
				
					if (expenseCategoryLine) {
						record.setCurrentLineItemText('expense', 'category',
								expenseCategoryLine);
					} else {
						LogMsg('No Category in Coupa.');
					}
					if (convertedcurr) {
						record.setCurrentLineItemValue('expense', 'currency',
								convertedcurr);
					} else {
						LogMsg('No Currency in Coupa.');
					}

					if (lineID) {
						record.setCurrentLineItemValue('expense',
								'custcol_coupa_er_lineid', lineID);
					} else {
						LogMsg('No Line ID in Coupa.');
					}

					if (coupaExpDescription) {
						record.setCurrentLineItemValue('expense',
								'custcol_coupa_er_desc', coupaExpDescription);
					} else {
						LogMsg('No Expense Description in Coupa.');
					}
					if (expenseReason) {
						record.setCurrentLineItemValue('expense',
								'custcol_coupa_er_reason', expenseReason);
						record.setCurrentLineItemValue('expense', 'memo',
								expenseReason);
					} else {
						LogMsg('No Reject Reason in Coupa.');
					}

					// dept
					if (context.getSetting('SCRIPT',
							'custscript_coupa_er_deptseg')) {
						if (coupaDept != null && coupaDept != "") {
							record.setCurrentLineItemValue('expense',
									'department', coupaDept);
						} else {
							LogMsg('Coupa Department not found.');
						}
					}

					// class
					if (coupaClass) {
						if (coupaClass != null && coupaClass != "") {
							record.setCurrentLineItemValue('expense', 'class',
									coupaClass);
						} else {
							LogMsg('Coupa class not Found.');
						}
					}

					// location

					if (context.getSetting('SCRIPT',
							'custscript_coupa_er_locseg')) {
						if (coupaLocation != null && coupaLocation != "") {
							record.setCurrentLineItemValue('expense',
									'location', coupaLocation);
						} else {
							LogMsg('Coupa Location not found.');
						}
					}

					// Set Custom Column
					LogMsg('customColumnsLen ' + customColumnsLen
							+ ' customColumnsToSetLen ' + customColumnsToSetLen);
					// var valuecustfield = "";

					if (customColumnsLen != null
							&& customColumnsToSetLen != null) {
						// var currentLine =
						// nlapiGetCurrentLineItemIndex('expense');
						for (var y = 0; y < parseInt(customColumnsLen); y = y + 1) {
							yieldScript();
							LogMsg('current filed number ' + y);
							LogMsg('currentLine Value ' + customColumns[y]);
							var valuecustfield = "";
							// for(var y=0; y<parseInt(currentLine); y++){

							// for(var y=0; y<parseInt(customColumnsLen); y++){

							if (customColumns[y] == 'true') {
								valuecustfield = 'T';
							} else if (customColumns[y] == 'false') {
								valuecustfield = 'F';
							} else if (customColumns[y] == null
									|| customColumns[y] == "") {
								valuecustfield = "";
							} else {
								valuecustfield = customColumns[y];
							}
							LogMsg('customColumnsToSet[y] '
									+ customColumnsToSet[y]
									+ ' valuecustfield ' + valuecustfield);
							record.setCurrentLineItemValue('expense',
									customColumnsToSet[y], valuecustfield);

						} // end of FOR that goes through each custom columns
					} // end of IF that goes through each custom columns

					// Checking for Receipt field
					if (context.getSetting('SCRIPT',
							'custscript_coupa_er_recpt_check') == 'T') {
						var artifactHeader = nlapiSelectNode(
								expenseLinesLineNode[yy], 'expense-artifacts');
						var artifact = nlapiSelectNodes(artifactHeader,
								'expense-artifact/id');
						var valueToSet = 'T';
						if (artifact == null || artifact == "") {
							valueToSet = 'F';
						}
						record.setCurrentLineItemValue('expense', 'receipt',
								valueToSet);
					}
                    //NS Enhancement: Coupa tax-code line level
                    if (sendTaxCode != null && sendTaxCode == 'T') {
                        var expenseLineTaxes = new Array();
                        expenseLineTaxes = nlapiSelectNodes(expenseLinesLineNode[yy], 'expense-line-taxes');
                        var expenseLineTaxesNodes = new Array();


                        for (var tx = 0; tx < expenseLineTaxes.length; tx++) {
                        	yieldScript();

                            expenseLineTaxesNodes = nlapiSelectNode(expenseLineTaxes[tx], 'expense-line-tax');

                            //for (var ty = 0; ty < expenseLineTaxesNodes.length; ty++) {
                            if (expenseLineTaxesNodes != null)// if it is null then it is US subsidiary hence no tax code and amount
                            {

                                if (nlapiSelectValue(expenseLineTaxesNodes, 'tax-code/code') != null) {
                                    var coupaTaxcode = nlapiSelectValue(expenseLineTaxesNodes, 'tax-code/code').split(':');

                                    if (coupaTaxcode.length > 0 && coupaTaxcode[1] != null) {

                                        record.setCurrentLineItemValue('expense', 'taxcode', coupaTaxcode[1]);
                                    }
                                } else {
                                    errmsg = 'No value for taxcode for ER#: ' + tranid;
                                    coupaTaxcode = null;
                                    LogMsg(errmsg);
                                }

                                // For Non Split Bill lines - In Coupa, the total of the expense line INCLUDES the tax amount.
                                // In NetSuite, the total of the expense-line DOES NOT INCLUDE the tax amount.
                                // This means that we must subtract the Coupa Tax Amount from the Coupa Expense line before sending the amount to NetSuite
                                if (expenseLineAmount) {
                                    record.setCurrentLineItemValue('expense',
                                        'foreignamount', foreignexpenseLineAmount);

                                    if (nlapiSelectValue(expenseLineTaxesNodes, 'amount') != null) {
                                        var lineTaxAmount = nlapiSelectValue(expenseLineTaxesNodes, 'amount');
                                        var expenseLineNontaxAmt = parseFloat(expenseLineAmount) - parseFloat(lineTaxAmount);
                                        record.setCurrentLineItemValue('expense',
                                          'foreignamount', expenseLineNontaxAmt);
                                        record.setCurrentLineItemValue('expense', 'amount',
                                            expenseLineNontaxAmt);
                                    }
                                } else {
                                    LogMsg('No Amount in Coupa.');
                                }
                            }
                            else// if US subsidiary
                            {
                                if (expenseLineAmount) {
                                    record.setCurrentLineItemValue('expense',
                                        'foreignamount', foreignexpenseLineAmount);
                                    record.setCurrentLineItemValue('expense', 'amount',
                                        expenseLineAmount);
                                } else {
                                    LogMsg('No Amount in Coupa.');
                                }
                            }
                        }
                    }
                    else {
                        if (expenseLineAmount) {
                            record.setCurrentLineItemValue('expense',
                                'foreignamount', foreignexpenseLineAmount);
                            record.setCurrentLineItemValue('expense', 'amount',
                                expenseLineAmount);
                        } else {
                            LogMsg('No Amount in Coupa.');
                        }
                    }
					record.commitLineItem('expense');
				}
				customColumns = new Array();
		    customColumnsToSet = new Array();
			}
		}
		try {
			ExpenseReportID = nlapiSubmitRecord(record, true, true);
		} catch (error) {
			var expenseExists = findExpenseReport(tranid);
			if (expenseExists != 'false') {
				LogMsg('NetSuite Expense Report Created: ' + tranid
						+ ' and updating export flag');
				setExportedToTrue(tranid);
				return true;
			} else {
				errmsg = getErrorDetails(error);
				return false;
			}
		} // catch
		
		customFields = new Array();
		customFieldsToSet = new Array();

		setExportedToTrue(tranid);
		return true;
	} catch (error) {

		errmsg = getErrorDetails(error);
		return false;
	}
}

function calculatePostingPeriod(expenseReportDate) {
	var postingPeriodId = null;

	var filters = [];
	var columns = [];

	filters.push(new nlobjSearchFilter('enddate', null, 'onorafter', expenseReportDate));
	filters.push(new nlobjSearchFilter('aplocked', null, 'is', 'F'));
	filters.push(new nlobjSearchFilter('closed', null, 'is', 'F'));
	filters.push(new nlobjSearchFilter('isquarter', null, 'is', 'F'));
	filters.push(new nlobjSearchFilter('isyear', null, 'is', 'F'));

	columns.push(new nlobjSearchColumn('startdate').setSort());

	var search = nlapiCreateSearch('accountingperiod', filters, columns);
	var result = search.runSearch().getResults(0, 1); // returns only the
	// first result of the
	// search which is the
	// first available
	// unlocked period

	if (result != null && result.length > 0)
		postingPeriodId = result[0].getId();

	if (!postingPeriodId) {
		var filters1 = [];
		var columns1 = [];

		filters1.push(new nlobjSearchFilter('startdate', null, 'onorbefore', expenseReportDate));
		filters1.push(new nlobjSearchFilter('aplocked', null, 'is', 'F'));
		filters1.push(new nlobjSearchFilter('closed', null, 'is', 'F'));
		filters1.push(new nlobjSearchFilter('isquarter', null, 'is', 'F'));
		filters1.push(new nlobjSearchFilter('isyear', null, 'is', 'F'));

		columns1.push(new nlobjSearchColumn('enddate').setSort(true));

		var search1 = nlapiCreateSearch('accountingperiod', filters1, columns1);
		var result1 = search1.runSearch().getResults(0, 1); // returns only the
		// first result of
		// the search which
		// is the first
		// available
		// unlocked period

		if (result1 != null && result1.length > 0)
			postingPeriodId = result1[0].getId();
	}

	return postingPeriodId;
}

function ConvertCoupaDateToNetSuiteDate(CoupaDate)// OK_Loy
{
	var dateformat = nlapiLoadConfiguration('companypreferences').getFieldValue('dateformat');

	var nDate = CoupaDate.split('T');

	var datesplit = nDate[0].split('-');

	var Nyear = datesplit[0];

	var Nday = datesplit[2];

	var Nmonth = datesplit[1];

	var netDate = Nmonth + '/' + Nday + '/' + Nyear;

	if (dateformat == 'DD/MM/YYYY') {
        netDate = Nday + '/' + Nmonth + '/' + Nyear;
    }

	return netDate;
}

// finding if Expense Report is existing will return the ID if found, will
// return false if not found
function findExpenseReport(tranid) {
	var filters = new Array();

	filters[0] = new nlobjSearchFilter('custbody_coupa_er_number', null, 'is',
			tranid);

	var searchresults = nlapiSearchRecord('expensereport', null, filters);

	if (searchresults && searchresults.length > 0) {

		return searchresults[0].getId();
	} else
		return 'false';

}

function verifyEmployee(verifiedEmployee) {
	var customField = context.getSetting('SCRIPT',
			'custscript_coupa_er_employee_num');
	var column = "";
	if (customField == null || customField == '') {
		column = 'internalid';
		LogMsg("Using standard comparison for employee; internalid");
	} else {
		column = customField;
		LogMsg("Custom employee field used: " + column);
	}
	var filters = new Array();
	filters.push(new nlobjSearchFilter(column, null, 'is', verifiedEmployee));
	filters.push(new nlobjSearchFilter('isinactive', null, 'is', 'F'));

	var searchresults = nlapiSearchRecord('employee', null, filters);
	if (!searchresults) {
		return null;
	}
	return searchresults[0].getId();

}

function getCustomFields(coupaERCustomBody, expenseHeaderHeaderNode) {
	var custbody_val = new Array();
	var arrCustBodyList = new Array();
	// var arrTempList = new Array();

	if (coupaERCustomBody != null || coupaERCustomBody != "") {
		custbody_val = coupaERCustomBody.split(";");
		var ctr = 0;
		for (var y = 0; y < custbody_val.length; y++) {
			yieldScript();
			arrCustBodyList = custbody_val[y].split("==");
			for (var x = 0; x < arrCustBodyList.length; x++) {
				yieldScript();

				// set array values only if x=0
				if (x == 0) {
					// customFields.push(arrCustBodyList[0]);
					var valueSet = nlapiSelectValue(expenseHeaderHeaderNode,
							arrCustBodyList[0]);
					if (valueSet == null) {
					  LogAudit('Missing XML tag when trying to retrieve ' + arrCustBodyList[0]);
					  var expenseCategoryRegex = /^expense-category-/;
					  if (expenseCategoryRegex.test(arrCustBodyList[0]) == true) {
					    LogAudit('This is an expense-category-* field, so continuing execution');
					    continue;
					  } else {
					    var error = 'Bad custom field mapping: \'' + custcol_val[y] + '\', Coupa XML tag not found';
					    LogErr(error);
					    throw nlapiCreateError('BadMapping', error, false);
					  }
					}
					if (valueSet.indexOf("\n") > -1) {
						valueSet = nlapiSelectValue(expenseHeaderHeaderNode,
								arrCustBodyList[0] + '/external-ref-num');
					}
					if (valueSet != null && valueSet != ""){
  					customFields[ctr] = valueSet;
  					customFieldsToSet[ctr] = arrCustBodyList[1];
  					ctr++;
  				}
				}
			}
		}
	}

}

// Get custom column list
var customColumns = new Array();
var customColumnsToSet = new Array();

function getCustomColumn(coupaERCustomCols, expenseLinesLineNode) {
	var custcol_val = new Array();
	var arrCustColsList = new Array();

	if (coupaERCustomCols != null || coupaERCustomCols != "") {
		custcol_val = coupaERCustomCols.split(";");
		var ctr = 0;
		var valueSet;
		for (var y = 0; y < custcol_val.length; y++) {
			yieldScript();
			arrCustColsList = custcol_val[y].split("==");
			for (var x = 0; x < arrCustColsList.length; x++) {
				yieldScript();
				// Format is valueInCoupa==Netsuiteid;valueInCoupa2==NetSuiteID
				// etc
				// set array values only if x=0
				if (x == 0) {
						valueSet = nlapiSelectValue(expenseLinesLineNode,
								arrCustColsList[0]);
						if (valueSet == null) {
						  LogAudit('Missing XML tag when trying to retrieve ' + arrCustColsList[0]);
						  var expenseCategoryRegex = /^expense-category-/;
						  if (expenseCategoryRegex.test(arrCustColsList[0]) == true) {
						    LogAudit('This is an expense-category-* field, so continuing execution');
						    continue;
						  } else {
						    var error = 'Bad custom field mapping: \'' + custcol_val[y] + '\', Coupa XML tag not found';
						    LogErr(error);
						    throw nlapiCreateError('BadMapping', error, false);
						  }
						}
						if (valueSet.indexOf("\n") > -1) {
							valueSet = nlapiSelectValue(
									expenseLinesLineNode,
									arrCustColsList[0] + '/external-ref-num');
						}
						if (valueSet != null && valueSet != "") {
						  customColumns[ctr] = valueSet;
						  customColumnsToSet[ctr] = arrCustColsList[1];
						  ctr++;
						}

				}
			}
		}
	}

}

function getCoupaDept(accountNode) {
	var deptsegment = nlapiGetContext().getSetting('SCRIPT',
			'custscript_coupa_er_deptseg');
	if (deptsegment) {
		var split_dept = nlapiSelectValue(accountNode, deptsegment);

		var dept = split_dept.split(':');
		if (dept.length == 1) {
			LogMsg('getCoupaDept return: ' + dept);
            if (param_useExternalID!=null && param_useExternalID == 'T')
            {
                var objInternalID = getInternalIDByExternalId(dept,'department');
                nlapiLogExecution('DEBUG','department internal ID  == ', objInternalID);
                return objInternalID;
            }
            else
			{
				return dept;
			}
		}
		LogMsg('getCoupaDept return: ' + dept[1]);
        if (param_useExternalID!=null && param_useExternalID == 'T')
        {
            var objInternalID = getInternalIDByExternalId(dept[1],'department');
            nlapiLogExecution('DEBUG','department internal ID  == ', objInternalID);
            return objInternalID;
        }
        else
		{
			return dept[1];
		}
	}

}

function getCoupaClass(accountNode) {
    var classsegment = nlapiGetContext().getSetting('SCRIPT',
        'custscript_coupa_er_classseg');
    if (classsegment) {
        var split_class = nlapiSelectValue(accountNode, classsegment);
        var classs = split_class.split(':');
        if (classs.length == 1) {
            LogMsg('getCoupaClass return:' + classs);
            if (param_useExternalID!=null && param_useExternalID == 'T')
            {
                var objInternalID = getInternalIDByExternalId(classs,'classification');
                nlapiLogExecution('DEBUG','class internal ID  == ', objInternalID);
                return objInternalID;
            }
            else
            {
            return classs;}
        }
        LogMsg('getCoupaClass return:' + classs[1]);
        if (param_useExternalID!=null && param_useExternalID == 'T')
        {
            var objInternalID = getInternalIDByExternalId(classs[1],'classification');
            nlapiLogExecution('DEBUG','class internal ID  == ', objInternalID);
            return objInternalID;
        }
        else
        {
        return classs[1];}
    }
}

function getCoupaLocation(accountNode) {
	var locsegment = nlapiGetContext().getSetting('SCRIPT',
			'custscript_coupa_er_locseg');
	if (locsegment) {
		var split_loc = nlapiSelectValue(accountNode, locsegment);
		var location = split_loc.split(':');
		if (location.length == 1) {
			LogMsg('getCoupaLocation return:' + location);
            if (param_useExternalID!=null && param_useExternalID == 'T')
            {
                var objInternalID = getInternalIDByExternalId(location,'location');
                nlapiLogExecution('DEBUG','location internal ID  == ', objInternalID);
                return objInternalID;
            }
            else
            {
			return location;}
		}
		LogMsg('getCoupaLocation return:' + location[1]);
        if (param_useExternalID!=null && param_useExternalID == 'T')
        {
            var objInternalID = getInternalIDByExternalId(location[1],'location');
            nlapiLogExecution('DEBUG','location internal ID  == ', objInternalID);
            return objInternalID;
        }
        else
        {
		return location[1];}
	}
}

function getCoupaSubsidiary(accountNode) {
	// if subsidiary needed test account has no subsidiary
	var subsegment = nlapiGetContext().getSetting('SCRIPT',
			'custscript_coupa_er_subsseg');
	if (subsegment) {
		var split_sub = nlapiSelectValue(accountNode, subsegment);
		var subsidiary = split_sub.split(':');
		if (subsidiary.length == 1) {
			LogMsg('getCoupaSubsidiary return: ' + subsidiary);
            if (param_useExternalID!=null && param_useExternalID == 'T')
            {
                var objInternalID = getInternalIDByExternalId(subsidiary,'subsidiary');
                nlapiLogExecution('DEBUG','subsidiary internal ID  == ', objInternalID);
                return objInternalID;
            }
            else
            {
			return subsidiary;}
		}
		LogMsg('getCoupaSubsidiary return: ' + subsidiary[1]);
        if (param_useExternalID!=null && param_useExternalID == 'T')
        {
            var objInternalID = getInternalIDByExternalId(subsidiary[1],'subsidiary');
            nlapiLogExecution('DEBUG','subsidiary internal ID  == ', objInternalID);
            return objInternalID;
        }
        else
        {
		return subsidiary[1];}
	}
}

//Code by Madiha Aamir 3/5/2020
function getCoupaCurrencyForeign(expenseLinesLineNode) {
	var currencyNode;
	var currency_now;
	var converted_currency;
	currencyNode = nlapiSelectNode(expenseLinesLineNode, 'foreign-currency');
	currency_now = nlapiSelectValue(currencyNode, 'code');
	converted_currency = getNetsuiteCurrency('currency', currency_now);

	return converted_currency;
}

function getCoupaExchangeRate(expenseLinesLineNode) {
	var exchangeRate=1;
	var exchangeRateNode;
	
	exchangeRateNode = nlapiSelectNode(expenseLinesLineNode, 'suggested-exchange-rate');
	
	if(exchangeRateNode)
	{
		exchangeRate = nlapiSelectValue(exchangeRateNode, 'rate')?nlapiSelectValue(exchangeRateNode, 'rate'):exchangeRate;
	}
	return exchangeRate;
}

// End of Code by madiha Aamir 3/5/2020

function getCoupaCurrency(expenseLinesLineNode) {
	var currencyNode;
	var currency_now;
	var converted_currency;
	currencyNode = nlapiSelectNode(expenseLinesLineNode, 'currency');
	currency_now = nlapiSelectValue(currencyNode, 'code');
	converted_currency = getNetsuiteCurrency('currency', currency_now);

	return converted_currency;
}

function getNetsuiteCurrency(objectinternalid, objectname) {
	// nlapiLogExecution('DEBUG', 'Before getting id via search',
	// 'internalobjectid = ' + objectinternalid + ' objectname = ' +
	// objectname);
	var searchresults;
	var filters = new Array();
	filters.push(new nlobjSearchFilter('symbol', null, 'is', objectname));
	filters.push(new nlobjSearchFilter('isinactive', null, 'is', 'F'));
	try {
		searchresults = nlapiSearchRecord(objectinternalid, null, filters);
	} catch (e) {
		var error = e.getDetails();
		if (error
				.indexOf("The feature 'Multiple Currencies' required to access this page is not enabled in this account") > -1) {
			nlapiLogExecution('DEBUG', "multiple currencys not enabled",
					'Defaulting currency ID to 1');
			return 1;
		}
	}
	// nlapiLogExecution('DEBUG', 'in getNetsuitetermid after calling Search
	// record', coupaTerm);

	// if (searchresults.length !=1)
	if (!searchresults) {
		nlapiLogExecution('Error', 'Error getting ID for',
				'internalobjectid = ' + objectinternalid + ' objectname =  '
						+ objectname);
		return 'INVALID_NAME';
	}
	// nlapiLogExecution('DEBUG', 'in getNetsuitetermid after calling Search
	// record', searchresults[0].getId());

	return searchresults[0].getId();
}

function getErrorDetails(error) {
	if (error instanceof nlobjError) {
		var errordetails;
		errorcode = error.getCode();
		switch (errorcode) {
		case "INVALID_REF_KEY":
			errordetails = "Reference Key Invalid.";
			return errordetails;

		case "SSS_REQUEST_TIME_EXCEEDED":
			if (iTimeOutCnt > 2) {
				errordetails = "Connection closed because it has exceed the time out period (NetSuite has not received a response after 5 seconds on initial connection or after 45 seconds on the request). tried to establish connection 3 times and still failed. Please contact Technical Support.";
				exit = true;
				break;
			} else {
				errordetails = "Connection closed because it has exceed the time out period (NetSuite has not received a response after 5 seconds on initial connection or after 45 seconds on the request). retrying to establish a connection.";
				iTimeOutCnt = iTimeOutCnt + 1;
				k = 0;
				break;
			}

		default:
			errordetails = error.getDetails() + ".";
			exit = true;
			break;
		}

		LogErr('Error code: ' + errorcode + ', Error description: '
				+ errordetails + ', Error String: ' + error.toString());
		nlapiSendEmail(
				-5,
				nlapiGetContext().getSetting('SCRIPT',
						'custscript_coupa_er_email_addr_notify'),
				nlapiGetContext().getSetting('SCRIPT',
						'custscript_coupa_er_acccountname')
						+ ' Expense Report Integration:Processing Error - Unable to do Coupa request api call to export Expense Report',
				'Error Code = ' + errorcode + ' Error Description = '
						+ errordetails);
		return errordetails;
	}

}
var fx = 'Expense Report ';
var fxctr = 100;
var context = nlapiGetContext();

function LogMsg(text) {
	fxctr++;
	nlapiLogExecution('DEBUG', fx + fxctr, text);
}
function LogErr(text) {
	fxctr++;
	nlapiLogExecution('ERROR', fx + fxctr, text);
}
function LogAudit(text) {
	fxctr++;
	nlapiLogExecution('AUDIT', fx + fxctr, text);
}

function getnumber(id) {
	var ret;
	ret = parseFloat(id);
	if (isNaN(ret)) {
		ret = 0;
	}
	return ret;
}// getnumber

/*
 Function to get the internal based on externnalID for Subsidiaries, location, class, department
 */
function getInternalIDByExternalId(externalId,recordType)
{
    idFilter = new nlobjSearchFilter('externalid', null, 'is', externalId);
    var columns = new Array();
    columns[0] = new nlobjSearchColumn('internalid');
    var savedSearch = '';
    if (recordType == 'subsidiary')
        savedSearch ='customsearch_coupa_accs_subsearch';
    else if (recordType == 'department')
        savedSearch ='customsearch_coupa_accs_deptsearch';
    else if (recordType == 'location')
        savedSearch = 'customsearch_coupa_accs_locsearch';
    else if (recordType == 'classification')
        savedSearch = 'customsearch_coupa_accs_classsearch';

    var searchResults = nlapiSearchRecord(recordType,savedSearch, idFilter, columns);
    var internalId = searchResults[0].getValue('internalid');
    return internalId;
}
