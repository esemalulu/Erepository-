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
 * 1.00       06 Sep 2016     cmargallo
 *
 */

var NSUtil = (typeof NSUtil === 'undefined') ? {} : NSUtil;

// Hold the flag if the item pas thru validate line
var blnIsValidateLine = false;
// Hold the flag if the recalc is ongoing
var blnIsRecalcOnGoing = false;
// Hold the flag if deletion is ongoing
var blnIsDeletionOnGoing = false;
// Hold the VAS item
var objVASItem = null;

function lineInit_accessAddEditVAS(type) {
	// Get the unique key
	var stUniqueKey = nlapiGetCurrentLineItemValue(type, 'custcol_line_reference_vas_item');
	// Get the record type
	var stItemType = nlapiGetCurrentLineItemValue('item', 'itemtype');
	if (type == 'item' && !NSUtil.isEmpty(stUniqueKey) && stItemType == 'InvtPart' && 
		nlapiGetCurrentLineItemValue('item', 'custcol_bigticket') == 'T') {
		nlapiDisableLineItemField('item', 'custcol_va020_modify_big_vas', false, nlapiGetCurrentLineItemIndex(type));
	} else {
		nlapiDisableLineItemField('item', 'custcol_va020_modify_big_vas', true, nlapiGetCurrentLineItemIndex(type));
	}
}

/**
 * Check the Add/Edit VAS field change. 
 * @appliedtorecord salesorder
 *   
 * @param {String} type Sublist internal id
 * @param {String} name Field internal id
 * @param {Number} linenum Optional line item number, starts from 1
 * @returns {Boolean} True to continue changing field value, false to abort value change
 */
function validateField_showSuitelet(type, name, linenum) {
	// Hold the unique key
	var stUniqueKey = null;
	// Check if Add/Edit vas is updated
	if (type == 'item' && name == 'custcol_va020_modify_big_vas') {
		// Check if checked/ticked
		if (nlapiGetCurrentLineItemValue(type, name) == 'T' && 
			nlapiGetCurrentLineItemValue(type, 'itemtype') == 'InvtPart' &&
			nlapiGetCurrentLineItemValue(type, 'custcol_bigticket') == 'T') {
			// Get the unique key
			stUniqueKey = nlapiGetCurrentLineItemValue(type, 'custcol_line_reference_vas_item');
			// Check if the unique key is empty
			if (!NSUtil.isEmpty(stUniqueKey)) {
				// process big item
				processBigItemVAS(stUniqueKey);
			} else {
				nlapiDisableLineItemField('item', 'custcol_va020_modify_big_vas', true);
			}
		} else {
			nlapiDisableLineItemField('item', 'custcol_va020_modify_big_vas', true);
		}
		return false;
	}
    return true;
}

/**
 * Check existence of the value added service subscribe by the user. 
 * @appliedtorecord salesorder
 *   
 * @param {String} type Sublist internal id
 * @returns {Boolean} True to save line item, false to abort save
 */
function validateLine_checkSubsVASExistence(type) {
	// Hold the item type
	var stItemType = null;
	// Hold the big item flag
	var blnBigItem = null;
	// Hold the return flag
	var blnAllVASExistAndAdded = true;
	// Hold the subscribe VAS data
	var objVASData = null;
	// Check if item
	if (!blnIsRecalcOnGoing && type == 'item') {
		// Get the current item type
		stItemType = nlapiGetCurrentLineItemValue('item', 'itemtype');
		// Check if inventory item
		if (stItemType == 'InvtPart') {
			// Set the flag
			blnIsValidateLine = true;
			// Get the big item flag
			blnBigItem = nlapiGetCurrentLineItemValue('item', 'custcol_bigticket'); 
			// Check if big item
			if (blnBigItem == 'F') {
				// Get subscribe and un-subscribe value added services (VAS)
				objVASData = getSubsAndUnsubsVAS();
				// Get the value added service (VAS)
				objVASItem = getVASItem();
				// Check if all subscribe VAS exist
				blnAllVASExistAndAdded = isAllVASExist(objVASItem, objVASData.subscribe);
			}
		}
	}
	// Return the result
    return blnAllVASExistAndAdded;
}

/**
 *	Set the value added services set by the user for the every inventory item. 
 *	@appliedtorecord salesorder
 *   
 *	@param {String} type Sublist internal id
 *	@returns {Void}
 */
function recalc_setValueAddedServices(type) {
	// Hold the item type
	var stItemType = null;
	// Hold the big item flag
	var blnBigItem = null;
	// Hold the unique key
	var stVASUniqueKey = null;
	// Check if item
	if (type == 'item' && blnIsValidateLine && !blnIsRecalcOnGoing) {
		// Set the flag
		blnIsRecalcOnGoing = true;
		// Get the current item type
		stItemType = nlapiGetCurrentLineItemValue('item', 'itemtype');
		// Check if inventory item
		if (stItemType == 'InvtPart') {
			// Get the VAS unique key
			stVASUniqueKey = nlapiGetCurrentLineItemValue('item', 'custcol_line_reference_vas_item');
			// Get the big item flag
			blnBigItem = nlapiGetCurrentLineItemValue('item', 'custcol_bigticket');
			// Check if big item
			if (blnBigItem == 'T') {
				// Check if VAS is check
				if (NSUtil.isEmpty(stVASUniqueKey)) {
					// Process big item
					processBigItemVAS(stVASUniqueKey);
				}
			} else {
				// Process regular item
				processRegularItemVAS(stVASUniqueKey);
			}
		}
	}
	// Set the flag
	blnIsValidateLine = false;
	// Set the flag
	blnIsRecalcOnGoing = false;
}

/**
 * The recordType (internal id) corresponds to the "Applied To" record in your script deployment. 
 * @appliedtorecord recordType
 *   
 * @param {String} type Sublist internal id
 * @returns {Boolean} True to continue line item delete, false to abort delete
 */
function validateDelete_removeVASItem(type) {
	// Hold the line count
	var intLineCount = 0;
	// Get the item type
	var stItemType = nlapiGetCurrentLineItemValue('item', 'itemtype');
	// Get the VAS unique key
	var stVASUniqueKey = nlapiGetCurrentLineItemValue('item', 'custcol_line_reference_vas_item');
	// Check if inventory item and has unique key
	if (stItemType == 'InvtPart' && !NSUtil.isEmpty(stVASUniqueKey) && !blnIsDeletionOnGoing) {
		blnIsDeletionOnGoing = true;
		// Get the line count
		intLineCount = nlapiGetLineItemCount('item');
		// Remove all the related VAS item
		removeSubscribeVASItem(stVASUniqueKey, intLineCount);
		// Set the flag
		blnIsDeletionOnGoing = false;
	}
    return true;
}


/**
 *	Process the value added services (VAS) for big item ticket.
 * 
 * 	@param {String} stVASUniqueKey - Hold the unique key
 */
function processBigItemVAS(stVASUniqueKey) {
	// Get the item
	var stItem = nlapiGetCurrentLineItemValue('item', 'item');
	// Hold the subscribe VAS line
	var arrSubscribeVAS = [];
	// Get the current sublist index
	var intSublistIndex = nlapiGetCurrentLineItemIndex('item');
	// Get the line count
	var intLinecount = nlapiGetLineItemCount('item');
	// Check the VAS unique key
	if (NSUtil.isEmpty(stVASUniqueKey)) {
		// Generate VAS unique key
		stVASUniqueKey = new Date().getTime();
	} else {
		// Get the related VAS item
		for (var intLinenum = 1; intLinenum <= intLinecount; intLinenum++) {
			// Compare the unique VAS number and type is service
			if (nlapiGetLineItemValue('item', 'custcol_line_reference_vas_item', intLinenum) == stVASUniqueKey &&
				nlapiGetLineItemValue('item', 'itemtype', intLinenum) == 'Service') {
				// Get the VAS item
				arrSubscribeVAS.push(nlapiGetLineItemValue('item', 'item', intLinenum));
			}
		}
	}
	// Get the URL of the suitelet
	var stVASURL = nlapiResolveURL('SUITELET', 'customscript_sl_value_added_services', 
			'customdeploy_sl_value_added_services');
	// Append the item
	stVASURL += '&itemid=' + stItem;
	// Append the subscribe VAS
	stVASURL += '&subscribevas=' + JSON.stringify(arrSubscribeVAS);
	// Append the vas unique key
	stVASURL += '&vasuniquekey=' + stVASUniqueKey;
	// Append the vas sublist index
	stVASURL += '&sublistindex=' + intSublistIndex;
	// Open the VAS suitelet in another window
	windowOpener(stVASURL, 1200, 600);
}

/**
 *	Process the value added services (VAS) for regular item or non-big item.
 * 
 *	@returns {Void}
 */
function processRegularItemVAS(stVASUniqueKey) {
	// Hold the un-subscribe VAS item
	var arrUnsubscribeVASItem = [];
	// Hold the subscribe VAS item
	var arrSubscribeVASItem = [];
	// Get the line count
	var intLineCount =  nlapiGetLineItemCount('item');
	// Get the current sublist index
	var intSublistIndex = nlapiGetCurrentLineItemIndex('item');  
	// Get the value added service (VAS)
	objVASItem = getVASItem();
	// Get subscribe and un-subscribe value added services (VAS)
	var objVASData = getSubsAndUnsubsVAS();
	// Check the VAS unique key
	if (NSUtil.isEmpty(stVASUniqueKey)) {
		// Generate VAS unique key
		stVASUniqueKey = new Date().getTime();
	} else {
		// Iterate the un-subscribe VAS column id
		for (var intIndex = 0; intIndex < (objVASData.unsubscribe).length; intIndex++) {
			// Get the corresponding VAS item
			arrUnsubscribeVASItem.push(objVASItem[(objVASData.unsubscribe)[intIndex]]);
		}
		// Remove the un-subscribe value added services (VAS)
		removeSubscribeVASItem(stVASUniqueKey, intLineCount, arrUnsubscribeVASItem);
	}
	// Iterate the subscribe VAS column id
	for (var intIndex = 0; intIndex < (objVASData.subscribe).length; intIndex++) {
		// Get the corresponding VAS item
		arrSubscribeVASItem.push(objVASItem[(objVASData.subscribe)[intIndex]]);
	}
	// Add the subscribe value added services (VAS)
	addSubscribeVASItem(arrSubscribeVASItem, stVASUniqueKey, intLineCount, intSublistIndex);
}

/**
 *	Add the subscribe value added services (VAS) for regular item or non-big item.
 *  
 *	@param {Object} objVASItem - Hold the list of value added services (VAS)
 *	@param {Array} arrSubscribeVAS - Hold the list of value added services (VAS) subscribe buy the user
 *	@param {String} stVASUniqueKey - Hold the unique key of the line level
 *	@param {Integer} intLineCount - Hold the line count of the item line level
 *	@param {Integer} intSublistIndex - Hold the current index of the item
 *  @returns {Void} 
 */
function addSubscribeVASItem(arrSubscribeVAS, stVASUniqueKey, intLineCount, intSublistIndex) {
	// Hold the flag for item existence
	var stVASItemExist = false;
	// Hold the value added service item
	var stVASItem = null;
	// Get the current quantity
	var intQuantity = nlapiGetLineItemValue('item', 'quantity', intSublistIndex);
	// Set the vas unique key
	nlapiSetLineItemValue('item', 'custcol_line_reference_vas_item', intSublistIndex, stVASUniqueKey);
	// Iterate the subscribe value added service item
	for (var intIndex = 0; intIndex < arrSubscribeVAS.length; intIndex++) {
		// Get the VAS item
		stVASItem = arrSubscribeVAS[intIndex];
		// Check if the VAS item already exist
		stVASItemExist = isItemExist(stVASItem, stVASUniqueKey, intLineCount);
		// Check if the item already exist
		if (!stVASItemExist) {
			nlapiSelectNewLineItem('item');
			// Check if new line
//			if (intLineCount == intSublistIndex) {
//				nlapiSelectNewLineItem('item');
//			} else {
//				// Insert a line item
//			    nlapiInsertLineItem('item', intSublistIndex + 1);
//				// Select the new line item
//				nlapiSelectLineItem('item', intSublistIndex + 1);
//			}
			nlapiSetCurrentLineItemValue('item', 'item', stVASItem, true, true);
			nlapiSetCurrentLineItemValue('item', 'quantity', intQuantity, true, true);
			// TODO Temporary
//			nlapiSetCurrentLineItemValue('item', 'rate', 2, true, true);
			nlapiSetCurrentLineItemValue('item', 'custcol_line_reference_vas_item', stVASUniqueKey, false, true);
			nlapiCommitLineItem('item');
//			intLineCount++;
		}
	}
}

/**
 *	Remove the un-subscribe value added services (VAS) for regular item or non-big item.
 *  
 *	@param {String} stVASUniqueKey - Hold the unique key of the line level
 *	@param {Integer} intLineCount - Hold the line count of the item line level
 *	@param {Array} arrSubscribeVAS - Hold the list of value added services (VAS) subscribe buy the user
 *  @returns {Void} 
 */
function removeSubscribeVASItem(stVASUniqueKey, intLineCount, arrUnsubscribeVAS) {
	// Hold the VAS item
	var stVASItem = null;
	// Check the un-subscribe VAS
	if (arrUnsubscribeVAS != undefined) {
		// Iterate the un-subscribe VAS
		for (var intIndex = 0; intIndex < arrUnsubscribeVAS.length; intIndex++) {
			// Get the VAS item
			stVASItem = arrUnsubscribeVAS[intIndex];
			// Iterate the line item and search for the VAS item
			for (var intLinenum = 1; intLinenum <= intLineCount; intLinenum++) {
				// Compare item and unique key
				if (nlapiGetLineItemValue('item', 'item', intLinenum) == stVASItem &&
					nlapiGetLineItemValue('item', 'custcol_line_reference_vas_item', intLinenum) == stVASUniqueKey) {
					// Remove the item
					nlapiRemoveLineItem('item', intLinenum);
					// Update the new line count
					intLineCount = nlapiGetLineItemCount('item');
					break;
				}
			}
		} 
	} else {
		// Iterate the line item and search for the VAS item
		for (var intLinenum = 1; intLinenum <= intLineCount; intLinenum++) {
			// Compare item and unique key
			if (nlapiGetLineItemValue('item', 'custcol_line_reference_vas_item', intLinenum) == stVASUniqueKey) {
				// Remove the item
				nlapiRemoveLineItem('item', intLinenum);
				// Update the new line count
				intLineCount = nlapiGetLineItemCount('item');
				// Decrement the line number
				intLinenum--;
			}
		}
	}
}

/**
 *	Get all the value added services (VAS)
 *
 *	@param {Object} objVASItem - Hold the list of value added services (VAS)
 */
function getVASItem() {
	// Check if the VAS item is empty
	if (NSUtil.isEmpty(objVASItem)) {
		// Hold the VAS item
		objVASItem = new Object();
		// Set the filters
		var filterExpression = [['custrecord_valueadded_linecolumn', 'is', 'custcol_va002_gift_wrap' ],
		                         'or',
		                        ['custrecord_valueadded_linecolumn', 'is', 'custcol_va001_gift_box' ],
		                         'or',
		                        ['custrecord_valueadded_linecolumn', 'is', 'custcol_va004_monogrmming' ]];
		// Hold the columns
		var arrColumns = [];
		// Set the columns
		arrColumns.push(new nlobjSearchColumn('custrecord_valueadded_svcitem'));
		arrColumns.push(new nlobjSearchColumn('custrecord_valueadded_linecolumn'));
		// Search the record
		var objResults = nlapiSearchRecord('customrecord_sears_vas_svcitems', null, filterExpression, arrColumns);
		// Iterate the results
		for (var intIndex = 0; intIndex < objResults.length; intIndex++) {
			// Store the column id as index and VAS item as value
			objVASItem[objResults[intIndex].getValue('custrecord_valueadded_linecolumn')] = objResults[intIndex].getValue('custrecord_valueadded_svcitem');
		}
	}
	return objVASItem;
}

/**
 *	Get the subscribe and un-subscribe value added services (VAS) of the user
 *
 *	@returns {Object} objVASData - Hold the subscribe and un-subscribe value added services (VAS) of the user
 */
function getSubsAndUnsubsVAS() {
	// Hold the subs and unsubs VAS
	var objVASData = new Object();	
	// Hold the subscribe value added services (VAS)
	var arrSubsVAS = [];
	// Hold the un-subscribe value added services (VAS)
	var arrUnsubsVAS = [];
	// Get the gift wrap flag
	var blnGiftWrapFlag = nlapiGetCurrentLineItemValue('item', 'custcol_va002_gift_wrap'); 
	// Check if selected
	if (blnGiftWrapFlag == 'T') {
		// Store the vas id
		arrSubsVAS.push('custcol_va002_gift_wrap');
	} else {
		// Store the vas id
		arrUnsubsVAS.push('custcol_va002_gift_wrap');
	}
	// Get the gift box flag
	var blnGiftBoxFlag = nlapiGetCurrentLineItemValue('item', 'custcol_va001_gift_box');  
	// Check if selected
	if (blnGiftBoxFlag == 'T') {
		// Store the vas id
		arrSubsVAS.push('custcol_va001_gift_box');
	} else {
		// Store the vas id
		arrUnsubsVAS.push('custcol_va001_gift_box');
	}
	// Get the monogramming flag
	var blnMonongrammingFlag = nlapiGetCurrentLineItemValue('item', 'custcol_va004_monogrmming'); 
	// Check if selected
	if (blnMonongrammingFlag == 'T') {
		// Store the vas id
		arrSubsVAS.push('custcol_va004_monogrmming');
	} else {
		// Store the vas id
		arrUnsubsVAS.push('custcol_va004_monogrmming');
	}
	// Set the subscribe VAS
	objVASData.subscribe = arrSubsVAS;
	// Set the un-subscribe VAS
	objVASData.unsubscribe = arrUnsubsVAS;
	return objVASData;
}

/**
 *	Check if the item has already VAS item exist in the sublist
 *
 * 	@returns {Boolean} blnIsItemExist - TRUE (Item already exist)
 * 										FALSE
 */								        
function isItemExist(stVASItem, stVASUniqueKey, intLineCount) {
	// Hold the flag of existence
	var blnIsItemExist = false;
	// Iterate the line item and search for the VAS item
	for (var intLinenum = 1; intLinenum <= intLineCount; intLinenum++) {
		// Compare item and unique key
		if (nlapiGetLineItemValue('item', 'item', intLinenum) == stVASItem &&
			nlapiGetLineItemValue('item', 'custcol_line_reference_vas_item', intLinenum) == stVASUniqueKey) {
			// Set the flag
			blnIsItemExist = true;
			break;
		}
	}
	return blnIsItemExist;
}

/**
 *	Check if all the subscribe VAS exist
 * 
 *	@returns {Boolean} blnAllExist - TRUE (All VAS exist)
 *					   				 FALSE
 */
function isAllVASExist(objVASItem, arrSubscribeVAS) {
	// Hold the check flag
	var blnAllExist = true;
	// Hold the vas item
	var stVASItem = null;
	// Hold the vas column id
	var stVASColumnID = null;
	// Iterate the subscribe VAS
	for (var intIndex = 0; intIndex < arrSubscribeVAS.length; intIndex++) {
		// Get the vas column id
		stVASColumnID = arrSubscribeVAS[intIndex];
		// Get the value added service item
		stVASItem = objVASItem[stVASColumnID];
		// Check if empty
		if (NSUtil.isEmpty(stVASItem)) {
			alert('Item for ' + stVASColumnID + ' does not exist.');
			// Set the flag to false
			blnAllExist = false;
			break;
		}
	}
	return blnAllExist;
}

/**
 *	Set and unset the VAS that the user choose in the suitelet.
 *
 *	@param {Object} objVASData - Hold the VAS data
 *	@returns {Void}
 */
function setVASItem(objVASData) {
	// Get and parse the data
	objVASData = JSON.parse(objVASData);
	// Get the unique vas key
	var stVASUniqueKey = objVASData.vasuniquekey;
	// Get the sublist index
	var intSublistIndex = objVASData.sublistindex;
	// Get the line count
	var intLineCount =  nlapiGetLineItemCount('item');
	// Add the subscribe VAS item
	addSubscribeVASItem(objVASData.subscribe, stVASUniqueKey, intLineCount, intSublistIndex);
	// Remove the un-subscribe VAS item
	removeSubscribeVASItem(stVASUniqueKey, intLineCount, objVASData.unsubscribe);
}

/**
 *	This function open URL in the new window.
 *
 *	@returns {Void}
 */
function windowOpener(stURL, intWidth, intHeight) {
    // Fixes dual-screen position                         Most browsers      Firefox
    var stDualScreenLeft = window.screenLeft != undefined ? window.screenLeft : screen.intLeft;
    var stDualScreenTop = window.screenTop != undefined ? window.screenTop : screen.top;

    var intScreenWidth = window.innerWidth ? window.innerWidth : document.documentElement.clientWidth ? document.documentElement.clientWidth : screen.intScreenWidth;
    var intScreenHeight = window.innerHeight ? window.innerHeight : document.documentElement.clientHeight ? document.documentElement.clientHeight : screen.height;

    var intLeft = ((intScreenWidth / 2) - (intWidth / 2)) + stDualScreenLeft;
    var intTop = ((intScreenHeight / 2) - (intHeight / 2)) + stDualScreenTop;
    var newWindow = window.open(stURL, "VASWindow", 'scrollbars=yes, width=' + intWidth + ', height=' + intHeight + ', top=' + intTop + ', Left=' + intLeft);

    // Puts focus on the newWindow
    if (window.focus) {
        newWindow.focus();
    }
}

/**
 * 
 * Version 1:
 * @author memeremilla
 * Details: Initial version
 * 
 * Version 2: 
 * @author bfeliciano
 * Details: Revised shorthand version.
 *
 * @param {String} stValue - string or object to evaluate
 * @returns {Boolean} - true if empty/null/undefined, false if not
 * 
 */
NSUtil.isEmpty = function(stValue)
{
	return ((stValue === '' || stValue == null || stValue == undefined) || (stValue.constructor === Array && stValue.length == 0) || (stValue.constructor === Object && (function(v)
	{
		for ( var k in v)
			return false;
		return true;
	})(stValue)));
};