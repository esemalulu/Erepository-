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
 */

/**
 * Module Description
 * 
 * Version    Date            Author           Remarks
 * 1.00       30 Jun 2016     cmargallo
 *
 */

/**
 * This function disabled a specific fields. 
 * @appliedtorecord salesorder 
 * 
 * @param {String} type Access mode: create, copy, edit
 * @returns {Void}
 */
function pageInit_disabledFields(type){
	// Check the type
//	if (type == 'create' || type == 'edit') {
		// Get the exception role
		var stExceptionRole = nlapiGetContext().getSetting('SCRIPT', 'custscript_exception_role');
		var arrExceptionRole = stExceptionRole.split(',');
		if (arrExceptionRole.indexOf(nlapiGetRole()) == -1) {
			// Disabled price level
			nlapiDisableLineItemField('item', 'price', true);
			// Disabled the amount
			nlapiDisableLineItemField('item', 'amount', true);
		}
//	}
}
