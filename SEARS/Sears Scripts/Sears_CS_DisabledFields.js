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


		if (arrExceptionRole.indexOf(nlapiGetRole()) == -1 ) {
			// Disabled price level
			nlapiDisableLineItemField('item', 'price', true);
			// Disabled the amount
			nlapiDisableLineItemField('item', 'amount', true);
            }
//	}
}

// //added by nikhil on Aug10, 2016, to include enabling of lines for transaction sales order and item is discount item
function validateline_enablefields(type){

var stTransactionType = nlapiGetRecordType(); 

var stItem = nlapiGetCurrentLineItemValue('item','itemtype');

var stLine = nlapiGetCurrentLineItemIndex('item');

if (stTransactionType == 'salesorder' && stItem =='Discount')
{
nlapiSelectLineItem('item', stLine);
nlapiDisableLineItemField('item', 'price', false);
nlapiDisableLineItemField('item', 'amount', false);
}

else if( stTransactionType != 'salesorder' && stItem !='Discount')
{
    nlapiDisableLineItemField('item', 'price', true);
    nlapiDisableLineItemField('item', 'amount', true);
}

return true;
}


function lineinit_enablefields(type){

var stTransactionType = nlapiGetRecordType(); 

var stItem = nlapiGetCurrentLineItemValue('item','itemtype');
var stSentToApigee = nlapiGetCurrentLineItemValue('item','custcol_sent_to_apigee');
var stEmailSent = nlapiGetCurrentLineItemValue('item','custcol_itemcancelemailsent');

var stLine = nlapiGetCurrentLineItemIndex('item');

if (stTransactionType == 'salesorder' && stItem =='Discount')
{
// nlapiSelectLineItem('item', stLine);

nlapiDisableLineItemField('item', 'price', false);
nlapiDisableLineItemField('item', 'amount', false);
}

else if( stTransactionType == 'salesorder' && stItem !='Discount')
{
    nlapiDisableLineItemField('item', 'price', true);
    nlapiDisableLineItemField('item', 'amount', true);
    nlapiDisableLineItemField('item', 'custcol_sent_to_apigee', true);
    if (stSentToApigee == 'T') {
        nlapiLogExecution('DEBUG', "IS CLOSED", "DISABLED CLOSED FIELD");
        nlapiDisableLineItemField('item', 'isclosed', true);
    }
    else if (stEmailSent == 'T') {
        nlapiLogExecution('DEBUG', "IS CLOSED", "DISABLED CLOSED FIELD");
        nlapiDisableLineItemField('item', 'isclosed', true);
    }
    else {
        nlapiLogExecution('DEBUG', "IS CLOSED", "NOT DISABLING CLOSED FIELD");
    }
}

}