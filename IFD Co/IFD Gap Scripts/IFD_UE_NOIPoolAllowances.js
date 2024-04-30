/**
 * Copyright (c) 1998-2016 NetSuite, Inc.
 * 2955 Campus Drive, Suite 100, San Mateo, CA, USA 94403-2511
 * All Rights Reserved.
 *
 * This software is the confidential and proprietary information of
 * NetSuite, Inc. ("Confidential Information"). You shall not
 * disclose such Confidential Information and shall use it only in
 * accordance with the terms of the license agreement you entered into
 * with NetSuite.
 *
 * Module Description
 * 
 * Version    Date            Author           Remarks
 * 1.00       05 May 2016     cmartinez		   Initial version. Implemented logic for setting discount/rebate lines for line items with commodity type: All, Partial, Alternate.
 * 1.10       10 Jun 2016     cmartinez        Added logic for Fee for Service items.
 * 1.20	      27 Mar 2017     dhoferica        Added logic for creating NOI Transactions on NOI Pool Budget records via 'Update NOI Transactions' scheduled script (script id: customscript_sc_noi_pool_trans_update)'
 * 1.30		  11 Mar 2017	  krgeron		   Fix is closed issue
 */

/** 
 * This script checks each line item and evaluates if it is eligible for NOI Pool Allowances, depending on the item commodity type.
 * 
 * @param type
 */
 function afterSubmit_setAllowanceOnInvoice(type) {
 	try {
 		var stLoggerTitle = 'afterSubmit_setAllowanceOnInvoice';
 		if (type != 'create')
 			return;

 		nlapiLogExecution('debug', stLoggerTitle, '=================== Entry Script ===================');
 		var stRecordType = nlapiGetRecordType(); 
 		var stRecordId = nlapiGetRecordId();
 		nlapiSubmitField(stRecordType, stRecordId, 'custbody_transaction_to_be_processed', 'T');

		var scheduleStatus = nlapiScheduleScript('customscript_ns_ss_noi_pool_allowances', 'customdeploy_ns_ss_noi_pool_allowances_d', null);

		nlapiLogExecution('debug', stRecordType + " : " + stRecordId + " invoked SS with status : " + scheduleStatus);
		nlapiLogExecution('debug', stLoggerTitle, '=================== Exit Script ====================');
	} catch (error) {
		handleError(error);
	}
}
 function handleError(error) {
 	if (error.getDetails != undefined) {
 		nlapiLogExecution('ERROR', 'Process Error', 'process() ' + error.getCode() + ': ' + error.getDetails());
 		throw error;
 	} else {
 		nlapiLogExecution('ERROR', 'Unexpected Error', 'process() ' + error.toString());
 		throw nlapiCreateError('99999', error.toString());
 	}
 }
