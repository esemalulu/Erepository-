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
 * Module Description
 *
 */

/**
 * Module Description
 *
 * Version    Date            Author           Remarks
 * 1.00       09 Sep 2016     cmargallo
 *
 */

/**
 * @param {nlobjRequest} request Request object
 * @param {nlobjResponse} response Response object
 * @returns {Void} Any output is written via response object
 */
function suitelet_setValueAddedServices(request, response)
{
	var stMethodName = 'suitelet_setValueAddedServices';
	try {
		nlapiLogExecution('DEBUG', stMethodName, '- Entry -');
		// Hold the return object
		var objForm = null;
		var stAction = request.getParameter('custpage_action');
		// Check the action
		switch (stAction) {
			case 'submit':
				objForm = submitVASItem(request, response);
				break;
			default :
				objForm = createVASForm(request, response);
				break;
		}
		response.writePage(objForm);
	} catch (error) {
		nlapiLogExecution('DEBUG', stMethodName, '- Catch -');
		if (error.getDetails != undefined) {
			nlapiLogExecution('ERROR', 'Process Error', error.getCode() + ': ' + error.getDetails());
			throw error;
		} else {
			nlapiLogExecution('ERROR', 'Unexpected Error', error.toString());
			throw nlapiCreateError('99999', error.toString());
		}
	} finally {
		nlapiLogExecution('DEBUG', stMethodName, '- Exit -');
	}
}

/**
 * 
 */
function createVASForm(request, response) {
	var stMethodName = 'createVASForm';
	nlapiLogExecution('DEBUG', stMethodName, '- Entry -');
	// Hold the VAS item data
	var objVASItemData = null;
	// Hold the VAS item data list
	var arrVASItemDataList = [];
	// Hold the VAS item
	var stVASItem = null;
	// Get the item 
	var stItem = request.getParameter('itemid');
	nlapiLogExecution('DEBUG', stMethodName, 'Item : ' + stItem);
	// Get the item data
	var objItemData = nlapiLookupField('item', stItem, ['itemid', 'displayname', 'custitem_vas_item_related']);
	nlapiLogExecution('DEBUG', stMethodName, 'Item Data: ' + JSON.stringify(objItemData));
	// Create VAS item list form
	var objForm = nlapiCreateForm('Choose Item',true);
	// Add item number
	objForm.addField('custpage_itemnumber', 'select', 'Item Number', 'item').setDisplayType('inline').setDefaultValue(stItem);
	// Add item name
	objForm.addField('custpage_itemname', 'text', 'Item Name').setDisplayType('inline').setDefaultValue(objItemData.displayname);
	// Add VAS item list sublist
	var objItemList = objForm.addSubList('custpage_vasitemlistsub', 'list', 'Item List');
	// Add select box
	objItemList.addField('custpage_select', 'checkbox', 'Select');
	// Add VAS item
	objItemList.addField('custpage_vasitem', 'select', 'Value Added Services (VAS) Item', 'item').setDisplayType('inline');
	// Add save button
	objForm.addSubmitButton('Save');
	// TODO Add cancel button
	objForm.addButton('custpage_cancelbtn', 'Cancel', 'window.close()');
	
	// Hidden fields
	objForm.addField('custpage_vasunqiuekey', 'text', 'VAS Unique Key').setDisplayType('hidden').setDefaultValue(request.getParameter('vasuniquekey'));
	objForm.addField('custpage_item', 'text', 'Item').setDisplayType('hidden').setDefaultValue(stItem);
	objForm.addField('custpage_sublistindex', 'text', 'Item').setDisplayType('hidden').setDefaultValue(request.getParameter('sublistindex'));
	objForm.addField('custpage_action', 'text', 'Action').setDisplayType('hidden').setDefaultValue('submit');
	
	// Prepare the sublist value
	var arrVASItemList = (objItemData.custitem_vas_item_related).split(',');
	nlapiLogExecution('DEBUG', stMethodName, 'Available VAS : ' + JSON.stringify(arrVASItemList));
	// Get the subscribe VAS
	var arrSubscribeVAS =  JSON.parse(request.getParameter('subscribevas'));
	nlapiLogExecution('DEBUG', stMethodName, 'Subscribe VAS : ' + JSON.stringify(arrSubscribeVAS));
	// Iterate the VAS item list
	for (var intIndex = 0; intIndex < arrVASItemList.length; intIndex++) {
		// Initialize VAS data
		objVASItemData = new Object();
		// Get the VAS item
		stVASItem = arrVASItemList[intIndex];
		// Set the item
		objVASItemData.custpage_vasitem = stVASItem;
		// Check if already selected
		if (NSUtil.inArray(stVASItem, arrSubscribeVAS)) {
			// Set selected
			objVASItemData.custpage_select = 'T';
		}
		// Store the data
		arrVASItemDataList.push(objVASItemData);
	}
	// Set all the values
	objItemList.setLineItemValues(arrVASItemDataList);
	nlapiLogExecution('DEBUG', stMethodName, '- Exit -');
	return objForm;
}

/**
 * 
 */
function submitVASItem(request, response) {
	var stMethodName = 'submitVASItem';
	// Hold the subs and unsubs VAS
	var objVASData = new Object();	
	// Hold the subscribe value added services (VAS)
	var arrSubsVAS = [];
	// Hold the un-subscribe value added services (VAS)
	var arrUnsubsVAS = [];
	// Get the VAS item line count
    var intLineItemCount = request.getLineItemCount('custpage_vasitemlistsub');
	// Iterate the VAS item list
	for (var intLinenum = 1; intLinenum <= intLineItemCount; intLinenum++) {
		// Check if selected
		if (request.getLineItemValue('custpage_vasitemlistsub', 'custpage_select', intLinenum) == 'T') {
			// Store subscribe VAS item
			arrSubsVAS.push(request.getLineItemValue('custpage_vasitemlistsub', 'custpage_vasitem', intLinenum));
		} else {
			// Store un-subscribe VAS item
			arrUnsubsVAS.push(request.getLineItemValue('custpage_vasitemlistsub', 'custpage_vasitem', intLinenum));
		}
	}
	// Set the subscribe and un-subscribe VAS item
	objVASData.subscribe = arrSubsVAS;
	objVASData.unsubscribe = arrUnsubsVAS;
	// Set the unique key
	objVASData.vasuniquekey = request.getParameter('custpage_vasunqiuekey');
	// Set the sublist index
	objVASData.sublistindex = request.getParameter('custpage_sublistindex');
	nlapiLogExecution('DEBUG', stMethodName, 'Submit Data : ' + JSON.stringify(objVASData));
	// Create a HTML response
	var stHTML = createHTMLResponse(objVASData);
	response.setContentType('HTMLDOC');
    response.write(stHTML);
}

/**
 * 
 */
function createHTMLResponse(objVASData) {
	var stMethodName = 'createHTMLResponse';
	nlapiLogExecution('DEBUG', stMethodName, ' - Entry - ');
    var stHTML = '<stHTML>';
    stHTML += '<head>';
    stHTML += '<script language="JavaScript">';
    stHTML += 'if (window.opener)';
    stHTML += '{';
    stHTML += 'window.opener.setVASItem(\''+ JSON.stringify(objVASData) +'\');';
	stHTML += '}';
	stHTML += 'window.close();';
	stHTML += '';
	stHTML += '';
	stHTML += '</script>';
	stHTML += '</head>';
	stHTML += '<body>';
	stHTML += '</body>';
	stHTML += '</stHTML>';
	nlapiLogExecution('DEBUG',stMethodName,'HTML Data : ' + stHTML);
	nlapiLogExecution('DEBUG', stMethodName, ' - Exit - ');
	return stHTML;
}

var NSUtil =
{
	/**
	 * Evaluate if the given string is an element of the array
	 * @param {String} stValue - String value to find in the array
	 * @param {Array} arrValue - Array to be check for String value
	 * @returns {Boolean} - true if string is an element of the array, false if not
	 */
	inArray : function(stValue, arrValue)
	{
		var bIsValueFound = false;
		
		for (var i = 0; i < arrValue.length; i ++)
		{
			if (stValue == arrValue[i])
			{
				bIsValueFound = true;
				break;
			}
		}
	
		return bIsValueFound;
	},
};