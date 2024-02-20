/**
 * Client-side scripts for Purchase Orders.
 * 
 * Version    Date            Author           Remarks
 * 1.00       24 Apr 2017     Jacob Shetler
 *
 */

//variables to use for purchase limit validation
var showAlert = true;
var originalTotal;
var limit;

/**
 * Disable fields
 * 
 * @param {String} type Access mode: create, copy, edit
 */
function GD_PO_PageInit(type) {
	//Get rid of the -1 option on the Ship To Select dropdown when it is clicked/highlighted
	document.getElementsByName('inpt_shipaddresslist')[0].addEventListener('focus', HideNewDiv);
	
	//hide the new and edit address buttons
	var newAddressBtn = document.getElementById('shipaddresslist_popup_new');
	if (newAddressBtn != null) {
		newAddressBtn.parentNode.removeChild(newAddressBtn);
	}
	var popupAddressBtn = document.getElementById('shipaddresslist_popup_link');
	if (popupAddressBtn != null) {
		popupAddressBtn.parentNode.removeChild(popupAddressBtn);
	}
	
	// get these values to use for puchase limit validation in recalc and save record.
	originalTotal = nlapiGetFieldValue('total');
	limit = LookupSuitelet_LookupField('employee',nlapiGetUser(),'purchaseorderlimit');
}

/**
 * Removes the first div found that completely contains the text "-New-"
 */
function HideNewDiv() {
	var divs = document.getElementsByTagName('div');
	for (var i = 0; i < divs.length; i++) {
		if (divs[i].innerHTML == '- New -') {
			divs[i].style.display = 'none';
			break;
		}
	}
}

/**
 * @param {String} type: sublist type
 */
function GD_PurchaseOrder_ValidateLine(type) {
	return true;
}

/**
 * When a user adds a line that pushes the total over the purchasing limit, let them know.
 * 
 * @param {String} type: sublist type
 */
function GD_PurchaseOrder_Recalc(type) {
	
	if(type == 'item') {
		
		//if the user's purchase limit (set in page init) is blank, don't continue.
		if(limit || limit == 0) {
			
			limit = ConvertNSFieldToFloat(limit);
			var total = ConvertNSFieldToFloat(nlapiGetFieldValue('total'));
			
			// If the total is over their limit, show the alert, and set 'supervisor approval' to false.
			if(total > limit) {
				if(showAlert) {
					nlapiSetFieldValue('supervisorapproval','F');
					alert('This purchase order is over your purchase limit and will require approval.');
					showAlert = false;
				}
			}
			else {
				nlapiSetFieldValue('supervisorapproval','T');
				showAlert = true;
			}
		}
	}
}

/**
 * When the item is changed, the vendor code is searched on the item if the vendor has a match under the vendor sublist of the item.
 * @param type
 * @param name
 * @param linenum
 */
function GD_PurchaseOrder_FieldChanged(type, name, linenum) {
	if (type == 'item' && name == 'item') {
		var vendorId = nlapiGetFieldValue('entity') || '';
		if (vendorId != '') {
			var itemInternalId = nlapiGetCurrentLineItemValue(type, name) || '';
			if (itemInternalId != '') {
				var vendorCodeSearchResult = nlapiSearchRecord(
															'item', 
															null, 
															[
																 ["othervendor","anyof", nlapiGetFieldValue('entity')], 
																 'AND', 
																 ["vendorcode","isnotempty",""], 
																 'AND', 
																 ['internalid', 'is', itemInternalId]
															], 
															new nlobjSearchColumn('vendorcode')) || [];
				
				if (vendorCodeSearchResult.length > 0) {
					nlapiSetCurrentLineItemValue(type, 'custcolgd_vendorcode', vendorCodeSearchResult[0].getValue('vendorcode'));
				}
			}
		}
	} else if (name == 'entity') {
		// There is code that sets the vendor field automaticaly if the user sets an item first on the PO line so this will take care of this scenario
		var vendorId = nlapiGetFieldValue(name) || '';
		if (vendorId != '') {
			var itemArray = new Array();
			for (var i = 1; i <= nlapiGetLineItemCount('item'); i++) {
				itemArray.push(nlapiGetLineItemValue('item', 'item', i));
			}
			var currentLineItemId = nlapiGetCurrentLineItemValue('item', 'item') || ''; 
			
			var vendorCodeSearchResult = [];
			if (currentLineItemId != '') {
				vendorCodeSearchResult = nlapiSearchRecord(
						'item', 
						null, 
						[
							 ["othervendor","anyof", nlapiGetFieldValue('entity')], 
							 'AND', 
							 ["vendorcode","isnotempty",""], 
							 'AND', 
							 ['internalid', 'is', currentLineItemId]
						], 
						new nlobjSearchColumn('vendorcode')) || [];
			}
			
			//Set the vendor code on the current line and then set the code on lines the already exist in case they are not there already.
			if (vendorCodeSearchResult.length > 0) {
				nlapiSetCurrentLineItemValue('item', 'custcolgd_vendorcode', vendorCodeSearchResult[0].getValue('vendorcode'));
			}

			if (itemArray.length > 0) {
				// set the vendor code on all items already set on the line.
				var vendorCodeSearchResult = nlapiSearchRecord(
						'item', 
						null, 
						[
							 ["othervendor","anyof", nlapiGetFieldValue('entity')], 
							 'AND', 
							 ["vendorcode","isnotempty",""], 
							 'AND', 
							 ['internalid', 'anyof', itemArray]
						], 
						new nlobjSearchColumn('vendorcode')) || [];
				
				var vendorCodeSingleResult = new Array();
				for (var i = 1; i <= nlapiGetLineItemCount('item'); i++) {
					vendorCodeSingleResult = vendorCodeSearchResult.filter(function(data){return data.getId() == nlapiGetLineItemValue('item', 'item', i)}) || [];
					if (vendorCodeSingleResult.length != 0) {
						nlapiSetLineItemValue('item', 'custcolgd_vendorcode', i, vendorCodeSingleResult[0].getValue('vendorcode'));
					}
				}
			}
		}
	}
}

/**
 * When a user adds a line that pushes the total over the purchasing limit, let them know.
 */
function GD_PurchaseOrder_SaveRecord() {
	
	//if the user's purchase limit (set in page init) is blank, don't continue.
	if(limit || limit == 0) {
		
		limit = ConvertNSFieldToFloat(limit);
		var total = ConvertNSFieldToFloat(nlapiGetFieldValue('total'));
		
		// If the total changed, and it's now over their purchase limit, this PO will require approval.
		if(total > limit && originalTotal != total) {
			nlapiSetFieldValue('supervisorapproval','F');
			if(showAlert) {
				alert('This purchase order is over your purchase limit and will require approval.');
			}
		}
	}
	return true;
}