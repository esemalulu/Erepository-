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

// Hold the access type
var stAccessType = null;

/**
 * Module Description
 * 
 * Version    Date            Author           Remarks
 * 1.00       30 Jun 2016     cmargallo
 *
 */

/**
 * This function set the item set on the script parameter upon setting the customer. 
 * @appliedtorecord salesorder
 * 
 * @param {String} type Sublist internal id
 * @param {String} name Field internal id
 * @param {Number} linenum Optional line item number, starts from 1
 * @returns {Void}
 */
function fieldChanged_setItemLineLevel(type, name, linenum) {
	// Check customer is changed 
	if (name == 'entity' && stAccessType == 'create') {
		setLineItem();
	}
}

/**
 * This function set the item set on the script parameter upon setting the customer. 
 * @appliedtorecord salesorder 
 * 
 * @param {String} type Access mode: create, copy, edit
 * @returns {Void}
 */
function pageInit_setItemLineLevel(type) {
	// UPDATE 10/20 START
	// Set the access type
	stAccessType = type;
	// Check if the entity is not empty
	// var stEntity = nlapiGetFieldValue('entity');
	// if (!Helper.isEmpty(stEntity) && type == 'create') {
	// 	setLineItem();
	// }
	// UPDATE 10/20 END
}

/**
 * 
 */
function setLineItem() {
	// Hold the flag if the item already exist
	var blnIsItemExist = false;
	// Hold the flag if service item inserted
	var blnIsInserted = false;
	// Get the line item count
	var intLineItemCount = nlapiGetLineItemCount('item');
	// Get the service item to be set on the script parameter
	var stServiceItem = nlapiGetContext().getSetting('SCRIPT', 'custscript_service_item');
	// Get the standard item
	var stStandardItem = nlapiGetContext().getSetting('SCRIPT', 'custscript_standard_item');
	// Iterate the line item
	for (var intLinenum = 1; intLinenum <= intLineItemCount; intLinenum++) {
		// Compare the item
		if (stServiceItem == nlapiGetLineItemValue('item', 'item', intLinenum)) {
			// Set the flag to true
			blnIsItemExist = true;
			break;
		}
	}
	// Check if the item does not exist
	if (!blnIsItemExist) {
		// Check the item count
		if (intLineItemCount  == 0) {
			// Set an item
			nlapiSelectNewLineItem('item');
		} else {
			// Set the item on the top
			nlapiInsertLineItem('item', 1);
			nlapiSelectLineItem('item', 1);
			// Set the flag
			blnIsInserted = true;
		}
		nlapiSetCurrentLineItemValue('item', 'item', stServiceItem, true, true);
		nlapiSetCurrentLineItemValue('item', 'quantity', 1, true, true);
		nlapiCommitLineItem('item');
	}
	// Check if the next item is not subtotal
	if (stStandardItem != nlapiGetLineItemValue('item', 'item', 2)) {
		// Check the flag
		if (blnIsInserted) {
			// Set the item next to the service item
			nlapiInsertLineItem('item', 2);
			nlapiSelectLineItem('item', 2);
		} else {
			nlapiSelectNewLineItem('item');	
		}
		nlapiSetCurrentLineItemValue('item', 'item', stStandardItem, true, true);
		nlapiCommitLineItem('item');
	}
}

var Helper =
{
	/**
     * Shorthand version of isEmpty
     *
     * @param {String} stValue - string or object to evaluate
     * @returns {Boolean} - true if empty/null/undefined, false if not
     * @author bfeliciano
     */
    isEmpty : function(stValue)
    {
	    return ((stValue === '' || stValue == null || stValue == undefined) || (stValue.constructor === Array && stValue.length == 0) || (stValue.constructor === Object && (function(v)
	    {
		    for ( var k in v)
			    return false;
		    return true;
	    })(stValue)));
    }
};