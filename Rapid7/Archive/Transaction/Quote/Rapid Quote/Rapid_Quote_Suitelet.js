/*
 * Module Description
 * 
 * Version    Date            Author           Remarks
 * 1.00       24 Sep 2012     efagone
 *
 */

/*
 * @param {nlobjRequest} request Request object
 * @param {nlobjResponse} response Response object
 * @returns {Void} Any output is written via response object
 */

function rapidQuote_suitelet(request, response){
	
	this.arrProdTypes = grabAllProductTypes();
	if (request.getMethod() == 'GET') {
	
		var userId = nlapiGetUser();
		var oppId = request.getParameter('custparam_oppid');
		var refresh = request.getParameter('custparam_refresh');
		
		if (refresh == 'T') {
			nlapiGetContext().setSessionObject('rapidquote_json', '');
		}
		var json = nlapiGetContext().getSessionObject('rapidquote_json');
		
		if (json == null || json == '') {
			json = '{}';
		}
		
		if (oppId == null || oppId == '') {
			throw nlapiCreateError('MISSING_PARAM', 'Request is missing a required parameter', true);
		}
		
		var objSaved = JSON.parse(json);
		
		if (objSaved.oppId != oppId) {
			objSaved = new Object;
		}
		
		var form = nlapiCreateForm('Rapid Quote', false);
		form.addTab('custpage_itemtab', 'Items');
		form.addTab('custpage_selecteditemstab', 'Item Preview');
		form.setScript('customscriptr7rapidquote_suitelet_cs');
		
		form.addFieldGroup('quotegroup', 'Quote Details').setSingleColumn(true);
		var currentItemGroup = form.addFieldGroup('quotegroup2', 'Current Items').setSingleColumn(true);
		currentItemGroup.setShowBorder(false);
		form.addFieldGroup('spacergroup', 'Spacer');
		form.addFieldGroup('itemgroup', 'Add Items').setSingleColumn(true);
		form.addFieldGroup('itemgroupdets', 'Discounts | Additional Years').setSingleColumn(true);
		form.addFieldGroup('spacergroup2', 'Spacer');
		form.addFieldGroup('additionalgroup', 'Additional Information');
		
		var fldStoredItems = form.addField('custpage_storeditems', 'textarea', null, null, null).setDisplayType('hidden');
		var itemsAdded = false;
		if (objSaved.quoteItemsGroups != null && objSaved.quoteItemsGroups != '') {
			fldStoredItems.setDefaultValue(JSON.stringify(objSaved.quoteItemsGroups));
			itemsAdded = true;
			
			if (objSaved.stage != 3) {
				form.addButton('custpage_startover', 'Start Over', 'startOver()');
			}
		}
		
		if (objSaved.stage == 2) {
			var newOrUpsell = objSaved.newOrUpsell;
			objSaved = new Object;
			objSaved.newOrUpsell = newOrUpsell;
		}
		
		if (objSaved.stage != 3) {
			form.addField('custpage_itemtype_label', 'label', 'Item Type?', null, 'itemgroup').setLayoutType('startrow');
			form.addField('custpage_itemtype', 'radio', 'New', 'new', 'itemgroup').setLayoutType('midrow');
			form.addField('custpage_itemtype', 'radio', 'Existing License', 'upsell', 'itemgroup').setLayoutType('endrow');
		}
		
		var fldCustomerId = form.addField('custpage_customerid', 'select', 'Customer', 'customer', 'quotegroup').setDisplayType('inline');
		var fldOpportunity = form.addField('custpage_oppid', 'select', 'Opportunity', 'transaction', 'quotegroup').setDisplayType('inline');
		var fldSalesRep = form.addField('custpage_salesrep', 'select', 'Sales Rep', 'employee', 'quotegroup').setDisplayType('normal');
		var fldDepartment = form.addField('custpage_department', 'select', 'Department', 'department', 'quotegroup').setDisplayType('hidden');
		var fldLocation = form.addField('custpage_location', 'select', 'Location', '-103', 'quotegroup').setDisplayType('hidden');
		var fldPartner = form.addField('custpage_partner', 'select', 'Partner', 'partner', 'quotegroup').setDisplayType('normal');
		var fldNumberOfItems = form.addField('custpage_numberofitems', 'integer', 'Number of items', null, 'quotegroup2').setDisplayType('hidden');
		var fldCurrentItems = form.addField('custpage_currentitems', 'inlinehtml', 'Current items', null, 'custpage_selecteditemstab').setDisplayType('normal');
		fldCurrentItems.setDefaultValue('<html></html>');

		var recOpportunity = nlapiLoadRecord('opportunity', oppId);
		var customerId = recOpportunity.getFieldValue('entity');
		
		fldCustomerId.setDefaultValue(customerId);
		fldOpportunity.setDefaultValue(oppId);
		fldSalesRep.setDefaultValue(recOpportunity.getFieldValue('salesrep'));
		fldDepartment.setDefaultValue(recOpportunity.getFieldValue('department'));
		fldLocation.setDefaultValue(recOpportunity.getFieldValue('location'));
		fldPartner.setDefaultValue(recOpportunity.getFieldValue('partner'));
		
		if ((objSaved.newOrUpsell == null || objSaved.newOrUpsell == '') && objSaved.stage != 3) {
			objSaved.newOrUpsell = 'new';
		}
		
		if (objSaved.newOrUpsell != null && objSaved.newOrUpsell != '' && objSaved.stage != 3) {
			form.getField('custpage_itemtype').setDefaultValue(objSaved.newOrUpsell);
			
			var fldProductSelect = form.addField('custpage_productselect', 'select', 'Select Product', null, 'itemgroup').setDisplayType('hidden');
			var fldItemFamily = form.addField('custpage_itemfamily', 'select', 'Item Family', null, 'itemgroup').setDisplayType('hidden');
			var fldItemSelection = form.addField('custpage_itemselect', 'select', 'Select SKU', null, 'itemgroup').setDisplayType('hidden');
			var fldItemSelectionQty = form.addField('custpage_itemselectqty', 'float', 'Quantity', null, 'itemgroup').setDisplayType('hidden');
			var fldItemSelectionUnit = form.addField('custpage_itemselectunit', 'text', 'Unit', null, 'itemgroup').setDisplayType('hidden');
			var fldItemSelectionText = form.addField('custpage_itemselecttext', 'text', 'Item Selected Text', null, 'itemgroup').setDisplayType('hidden');
			var fldItemSelectionDescriptionText = form.addField('custpage_itemselecttextdescribe', 'text', 'Item Selected Description', null, 'itemgroup').setDisplayType('hidden');
			var fldLicenseSelection = form.addField('custpage_licenseselect', 'select', 'Select License', null, 'itemgroup').setDisplayType('hidden');
			var fldLicenseSelectionText = form.addField('custpage_licenseselecttext', 'text', 'License Text', null, 'itemgroup').setDisplayType('hidden');
			
			var fldItemAddYears = form.addField('custpage_additionalyears', 'integer', 'Additional Years', null, 'itemgroupdets').setDisplayType('hidden');
			fldItemAddYears.setDefaultValue(0);
			fldItemAddYears.setDisplaySize(4);
			var fldDiscountSection = form.addField('custpage_discountsection', 'percent', 'Discount Percentage (item and add-ons)', null, 'itemgroupdets').setDisplayType('hidden');
			fldDiscountSection.setDisplaySize(4);
	
			if (objSaved.newOrUpsell == 'new') {
				//set session data 
				var objSessionData = setSessionData();
				
				sourceItemFamily(fldItemFamily, objSessionData);
				fldItemFamily.setDisplayType('normal');
				fldItemSelectionUnit.setDisplayType('normal');
				fldItemSelectionUnit.setDisplayType('inline');
				fldItemSelectionQty.setDisplayType('normal');
				fldItemSelection.setDisplayType('normal');
				fldItemSelection.setDisplayType('disabled');
				fldItemSelection.setLayoutType('startrow');
				fldItemSelectionQty.setLayoutType('midrow');
				fldItemSelectionUnit.setLayoutType('endrow');
				
				
				fldItemSelectionQty.setDisplaySize(8);
				fldItemSelectionQty.setMandatory(true);

				if (objSaved.itemFamily != null && objSaved.itemFamily != '') {
				
					fldItemFamily.setDefaultValue(objSaved.itemFamily + '');
					fldItemSelection.setDisplayType('normal');
					sourceItemSelection(fldItemSelection, objSaved.itemFamily, objSessionData);
					
				}
			}
			else 
				if (objSaved.newOrUpsell == 'upsell') {
				
					fldProductSelect.setDisplayType('normal');
					sourceProductsACR(fldProductSelect);
					
					if (objSaved.productSelect != null && objSaved.productSelect != '') {
					
						fldProductSelect.setDefaultValue(objSaved.productSelect);
						fldLicenseSelection.setDisplayType('normal');
						sourceLicenses(fldLicenseSelection, customerId, objSaved.productSelect);
						
					}
					
				}
			
			if ((objSaved.itemSelect != null && objSaved.itemSelect != '') || (objSaved.licenseSelect != null && objSaved.licenseSelect != '')) {
				
				fldItemSelection.setDefaultValue(objSaved.itemSelect);
				if (objSaved.itemSelect != null && objSaved.itemSelect != '') {
					var arrColumns = new Array();
					arrColumns[0] = new nlobjSearchColumn('displayname');
					arrColumns[1] = new nlobjSearchColumn('salesdescription');
					arrColumns[2] = new nlobjSearchColumn('custitemr7itemqtytype');
					arrColumns[3] = new nlobjSearchColumn('minimumquantity');
					arrColumns[4] = new nlobjSearchColumn('custitemr7itemlockquantityminimum');
					arrColumns[5] = new nlobjSearchColumn('custitemlockquantity');
					var itemResult = nlapiSearchRecord('item', null, nlobjSearchFilter('internalid', null, 'is', objSaved.itemSelect), arrColumns);
					var itemName = itemResult[0].getValue(arrColumns[0]);
					var itemDescription = itemResult[0].getValue(arrColumns[1]);
					var itemUnitType = itemResult[0].getText(arrColumns[2]);
					var minQty = itemResult[0].getValue(arrColumns[3]) || itemResult[0].getValue(arrColumns[4]);
					var lockQty = itemResult[0].getValue(arrColumns[5]);
					fldItemSelectionText.setDefaultValue(itemName);
					fldItemSelectionDescriptionText.setDefaultValue(itemDescription);
					fldItemSelectionUnit.setDefaultValue(itemUnitType);
					fldItemSelectionQty.setDefaultValue(minQty);
					if (lockQty == 'T'){
						fldItemSelectionQty.setDisplayType('disabled');
					}
				}
				fldLicenseSelection.setDefaultValue(objSaved.licenseSelect);
				fldLicenseSelectionText.setDefaultValue(getActivationId(objSaved.productSelect, objSaved.licenseSelect));
				
				fldDiscountSection.setDisplayType('normal');
				//fldItemAddYears.setDisplayType('normal');
				
				fldItemAddYears.setLayoutType('startrow');
				fldDiscountSection.setLayoutType('midrow');
				
				//creating related item list objects
				var relatedItemList = form.addSubList('custpage_relateditemlist', 'list', 'Additional Related Items', 'custpage_itemtab');
				relatedItemList.addField('custpage_relateditem_itemid', 'text').setDisplayType('hidden');
				relatedItemList.addField('custpage_relateditem_required', 'checkbox').setDisplayType('hidden');
				relatedItemList.addField('custpage_relateditem_minquantity', 'text').setDisplayType('hidden');
				relatedItemList.addField('custpage_relateditem_maxquantity', 'text').setDisplayType('hidden');
				relatedItemList.addField('custpage_relateditem_lockquantity', 'checkbox').setDisplayType('hidden');
				relatedItemList.addField('custpage_relateditem_select', 'checkbox', 'Add Item?');
				var fldLineQuantity = relatedItemList.addField('custpage_relateditem_quantity', 'integer', 'Quantity');
				fldLineQuantity.setDisplaySize(4);
				fldLineQuantity.setDisplayType('entry');
				var fldLineItem = relatedItemList.addField('custpage_relateditem_itemtext', 'textarea', 'SKU');
				fldLineItem.setDisabled(true);
				var fldLineDescription = relatedItemList.addField('custpage_relateditem_itemdescription', 'textarea', 'Description');
				fldLineDescription.setDisabled(true);
				var fldLineBasePrice = relatedItemList.addField('custpage_relateditem_itembaseprice', 'text', 'Base Price');
				var fldLineCorrelation = relatedItemList.addField('custpage_relateditem_itemcorrelation', 'text', 'Correlation');
				var fldLineRequiresItems = relatedItemList.addField('custpage_relateditem_itemsrequired', 'textarea', 'Requires Items').setDisplayType('hidden');
				
				var arrRelatedItems = getAssociatedItems(objSaved.itemSelect, objSaved.productSelect, objSaved.licenseSelect, 'custitemr7relateditems');
				var arrRequiredItems = getAssociatedItems(objSaved.itemSelect, objSaved.productSelect, objSaved.licenseSelect, 'custitemr7skurequiresitems');
				
				var arrAllItems = arrRelatedItems.concat(arrRequiredItems);
				arrAllItems = uniqueItems(arrAllItems);
				arrAllItems.sort(myItemCorrelationSort);
				arrAllItems.sort(myItemBottomSort);
				
				for (var i = 0, j = 1; arrAllItems != null && i < arrAllItems.length; i++, j++) {
					var item = arrAllItems[i];
					var itemId = item['internalid'];
					
					var description = item['description'];
					if (description != null && description.length > 80) {
						description = description.substr(0, 160);
					}
					
					var defaultQuantity = '1';
					if (item['minQuantity'] !== null && item['minQuantity'] !== '') {
						defaultQuantity = item['minQuantity'];
					}
					
					var priceText = '';
					if (item['basePrice'] != null && item['basePrice'] != '') {
						priceText = '$' + addCommas(item['basePrice']);
						
						if (item['marginal'] == 'T') {
							priceText = 'Starting at ' + priceText;
						}
					}
					
					relatedItemList.setLineItemValue('custpage_relateditem_required', j, item['required']);
					relatedItemList.setLineItemValue('custpage_relateditem_select', j, item['required']);
					relatedItemList.setLineItemValue('custpage_relateditem_itemid', j, item['internalid']);
					relatedItemList.setLineItemValue('custpage_relateditem_minquantity', j, defaultQuantity);
					relatedItemList.setLineItemValue('custpage_relateditem_maxquantity', j, item['maxQuantity']);
					relatedItemList.setLineItemValue('custpage_relateditem_lockquantity', j, item['lockQuantity']);
					
					relatedItemList.setLineItemValue('custpage_relateditem_quantity', j, defaultQuantity);
					relatedItemList.setLineItemValue('custpage_relateditem_itemtext', j, item['displayName']);
					relatedItemList.setLineItemValue('custpage_relateditem_itemdescription', j, description);
					relatedItemList.setLineItemValue('custpage_relateditem_itembaseprice', j, priceText);
					relatedItemList.setLineItemValue('custpage_relateditem_itemcorrelation', j, item['correlation']);
					relatedItemList.setLineItemValue('custpage_relateditem_itemsrequired', j, item['requiredItems']);
				}
				
				form.addButton('custpage_additems', 'Add More Items', 'r7addmore()');
				
			}
		}
		else 
			if (objSaved.stage == 3) {
				var fldTerms = form.addField('custpage_terms', 'select', 'Terms', 'term', 'itemgroup');
				fldTerms.setDefaultValue(2);
				fldTerms.setLayoutType('normal', 'startcol');
				var fldQuoteExpires = form.addField('custpage_expiration', 'date', 'Quote Expires', null, 'additionalgroup');
				fldQuoteExpires.setDefaultValue(nlapiDateToString(nlapiAddDays(new Date(), 30)));
				var fldGlobalDiscount = form.addField('custpage_globaldiscount', 'percent', 'Global Discount', null, 'additionalgroup');
				fldGlobalDiscount.setDisplaySize(4);
				var fldMemo = form.addField('custpage_memo', 'textarea', 'Internal Memo', null, 'additionalgroup');
				fldMemo.setPadding(1);
				
				var fldAddressJSON = form.addField('custpage_addressjson', 'longtext', null, null, 'additionalgroup').setDisplayType('hidden');
				
				var fldBillingAddress = form.addField('custpage_billingaddress', 'select', 'Billing Address', null, 'additionalgroup');
				fldBillingAddress.setLayoutType('normal', 'startcol');
				var fldBillingAddressText = form.addField('custpage_billingaddresstext', 'richtext', ' ', null, 'additionalgroup').setDisplayType('inline');
				var fldShippingAddress = form.addField('custpage_shippingaddress', 'select', 'Shipping Address', null, 'additionalgroup');
				fldShippingAddress.setLayoutType('normal', 'startcol');
				var fldShippingAddressText = form.addField('custpage_shippingaddresstext', 'richtext', ' ', null, 'additionalgroup').setDisplayType('inline');
				
				var addressJSON = sourceAddresses(fldBillingAddress, fldShippingAddress, customerId, fldBillingAddressText, fldShippingAddressText);
				fldAddressJSON.setDefaultValue(addressJSON);
				
				form.addButton('custpage_back', 'Back', 'r7prevstep()');
				form.addSubmitButton('Build Quote');
			}
		
		if ((itemsAdded || (objSaved.itemSelect != null && objSaved.itemSelect != '') || (objSaved.licenseSelect != null && objSaved.licenseSelect != '')) && objSaved.stage != 3) {
			form.addButton('custpage_next', 'Done Adding Items', 'r7nextstep()');
		}
		
		response.writePage(form);
	}
	
	if (request.getMethod() == 'POST') {
		
		var submitOpp = false;
		var oppId = request.getParameter('custpage_oppid');
		var storedItems = request.getParameter('custpage_storeditems');
		
		if (oppId == null || oppId == '') {
			throw nlapiCreateError('ERROR', 'MISSING PARAM');
		}
		if (storedItems == null || storedItems == '') {
			throw nlapiCreateError('ERROR', 'NO ITEMS');
		}
		
		var recQuote = nlapiTransformRecord('opportunity', oppId, 'estimate', {
			recordmode: 'dynamic',
			customform: 103
		});
		
		var recOpportunity = nlapiLoadRecord('opportunity', oppId);
		
		recQuote.setFieldValue('memo', request.getParameter('custpage_memo'));
		recQuote.setFieldValue('terms', request.getParameter('custpage_terms'));
		recQuote.setFieldValue('duedate', request.getParameter('custpage_expiration'));
		recQuote.setFieldValue('expectedclosedate', request.getParameter('custpage_expiration'));
		recQuote.setFieldValue('duedate', request.getParameter('custpage_expiration'));
		recQuote.setFieldValue('location', request.getParameter('custpage_location'));
		
		if (recOpportunity.getFieldValue('title') == null || recOpportunity.getFieldValue('title') == '') {
			recQuote.setFieldValue('title', 'Created by Rapid Quote');
		}
		
		if (recOpportunity.getFieldValue('partner') != request.getParameter('custpage_partner')) {
			recQuote.setFieldValue('partner', request.getParameter('custpage_partner'));
			recOpportunity.setFieldValue('partner', request.getParameter('custpage_partner'));
			submitOpp = true;
		}
		if (recOpportunity.getFieldValue('shipaddresslist') != request.getParameter('custpage_shippingaddress')) {
			recQuote.setFieldValue('shipaddresslist', request.getParameter('custpage_shippingaddress'));
			recOpportunity.setFieldValue('shipaddresslist', request.getParameter('custpage_shippingaddress'));
			submitOpp = true;
		}
		if (recOpportunity.getFieldValue('billaddresslist') != request.getParameter('custpage_billingaddress')) {
			recQuote.setFieldValue('billaddresslist', request.getParameter('custpage_billingaddress'));
			recOpportunity.setFieldValue('billaddresslist', request.getParameter('custpage_billingaddress'));
			submitOpp = true;
		}
		
		if (request.getParameter('custpage_globaldiscount') != null && request.getParameter('custpage_globaldiscount') != '' && parseFloat(request.getParameter('custpage_globaldiscount')) > 0) {
			recQuote.setFieldValue('discountitem', 51);
			recQuote.setFieldValue('discountrate', '-' + request.getParameter('custpage_globaldiscount'));
		}
		
		//clear any existing items
		while (recQuote.getLineItemCount('item') > 0) {
			recQuote.removeLineItem('item', 1);
		}
		
		var arrItemGroups = JSON.parse(storedItems);
		
		for (var i = 0; arrItemGroups != null && i < arrItemGroups.length; i++) {
			var group = arrItemGroups[i];
			var addDiscount = false;
			
			if (group.discountPercent != null && group.discountPercent != '' && group.discountPercent != 'undefined' && parseFloat(group.discountPercent) > 0) {
				recQuote.selectNewLineItem('item');
				recQuote.setCurrentLineItemValue('item', 'item', -2); //subtotal
				recQuote.setCurrentLineItemValue('item', 'location', recQuote.getFieldValue('location'));
				recQuote.commitLineItem('item');
				
				addDiscount = true;
			}
			
			for (var j = 0; group.items != null && j < group.items.length; j++) {
				var item = group.items[j];
				recQuote.selectNewLineItem('item');
				recQuote.setCurrentLineItemValue('item', 'item', item.id);
				recQuote.setCurrentLineItemValue('item', 'quantity', item.quantity);
				recQuote.setCurrentLineItemValue('item', 'location', recQuote.getFieldValue('location'));
				recQuote.commitLineItem('item');
			}
			
			if (addDiscount) {
				recQuote.selectNewLineItem('item');
				recQuote.setCurrentLineItemValue('item', 'item', -2); //subtotal
				recQuote.setCurrentLineItemValue('item', 'location', recQuote.getFieldValue('location'));
				recQuote.commitLineItem('item');
				
				recQuote.selectNewLineItem('item');
				recQuote.setCurrentLineItemValue('item', 'item', 51); //discount
				recQuote.setCurrentLineItemValue('item', 'rate', '-' + group.discountPercent);
				recQuote.setCurrentLineItemValue('item', 'location', recQuote.getFieldValue('location'));
				recQuote.commitLineItem('item');
			}
			
		}
		
		if (recQuote.getFieldValue('partner') != '' && recQuote.getFieldValue('partner') != null) {
		
			var partnerDiscountPerc = nlapiLookupField('partner', recQuote.getFieldValue('partner'), 'custentityr7partnerdiscountrenewals');
			
			if (partnerDiscountPerc != '' && partnerDiscountPerc != null) {
				recQuote.selectNewLineItem('item');
				recQuote.setCurrentLineItemValue('item', 'item', -2); //subtotal
				recQuote.setCurrentLineItemValue('item', 'location', recQuote.getFieldValue('location'));
				recQuote.commitLineItem('item');
				
				recQuote.selectNewLineItem('item');
				recQuote.setCurrentLineItemValue('item', 'item', -6); //partner discount
				recQuote.setCurrentLineItemValue('item', 'price', -1); //custom
				recQuote.setCurrentLineItemValue('item', 'rate', '-' + partnerDiscountPerc);
				recQuote.setCurrentLineItemValue('item', 'location', recQuote.getFieldValue('location'));
				recQuote.commitLineItem('item');
			}
		}
		
		recQuote.selectNewLineItem('item');
		recQuote.setCurrentLineItemValue('item', 'item', 1323); //ponotes
		recQuote.setCurrentLineItemValue('item', 'location', recQuote.getFieldValue('location'));
		recQuote.commitLineItem('item');
		
		if (submitOpp) {
			nlapiSubmitRecord(recOpportunity);
		}
		var id = nlapiSubmitRecord(recQuote, true, true);
		
		//clear session object
		nlapiGetContext().setSessionObject('rapidquote_json', '{}');
		
		nlapiSetRedirectURL('RECORD', 'estimate', id);
		
	}
}

function uniqueItems(a){
	a.sort(myCustomSort);
	for (var i = 1; i < a.length;) {
		if (a[i - 1]['internalid'] == a[i]['internalid']) {
			if (a[i]['required'] == 'T') {
				a[i - 1]['required'] = 'T';
			}
			a.splice(i, 1);
		}
		else {
			i++;
		}
	}
	return a;
}

function myCustomSort(a, b){
	var valA = a['internalid'];
	var valB = b['internalid'];
	
	if (valA < valB) //sort string ascending
		return -1;
	if (valA > valB) 
		return 1;
	return 0; //default return value (no sorting)
}

function myItemCorrelationSort(a, b){
	var valA = parseFloat(a['correlation']);
	var valB = parseFloat(b['correlation']);
	
	if (valA > valB) 
		return -1;
	if (valA < valB) //sort string ascending
		return 1;
	return 0; //default return value (no sorting)
}

function myItemBottomSort(a, b){
	var valA = a['required'] + a['bottom'];
	var valB = b['required'] + b['bottom'];
	
	if (valA == 'T1') 
		return 1;
	return 0; //default return value (no sorting)
}

function addCommas(nStr){
	nStr += '';
	x = nStr.split('.');
	x1 = x[0];
	x2 = x.length > 1 ? '.' + x[1] : '';
	var rgx = /(\d+)(\d{3})/;
	while (rgx.test(x1)) {
		x1 = x1.replace(rgx, '$1' + ',' + '$2');
	}
	return x1 + x2;
}

function sourceNewOrUpsell(fld){
	
	fld.addSelectOption('', '');
	fld.addSelectOption('new', 'New');
	fld.addSelectOption('upsell', 'Upsell');
		
}

function sourceAddresses(fldBillingAddress, fldShippingAddress, customerId, fldBillingAddressText, fldShippingAddressText){
	
	fldBillingAddress.addSelectOption('new', '- New -', true);
	fldShippingAddress.addSelectOption('new', '- New -', true);
	
	var objAddys = new Object;
	objAddys.address = new Array();
	if (customerId != null && customerId != '') {
	
		var arrFilters = new Array();
		arrFilters[0] = new nlobjSearchFilter('internalid', null, 'is', customerId);
		
		var arrColumns = new Array();
		arrColumns[0] = new nlobjSearchColumn('addressinternalid');
		arrColumns[1] = new nlobjSearchColumn('address').setSort(true);
		arrColumns[2] = new nlobjSearchColumn('isdefaultbilling');
		arrColumns[3] = new nlobjSearchColumn('isdefaultshipping');
		arrColumns[4] = new nlobjSearchColumn('addresslabel');
		
		var arrResults = nlapiSearchRecord('customer', null, arrFilters, arrColumns);
		
		for (var i = 0; arrResults != null && i < arrResults.length; i++) {
		
			var id = arrResults[i].getValue(arrColumns[0]);
			var label = arrResults[i].getValue(arrColumns[4]);
			var isDefaultBill = arrResults[i].getValue(arrColumns[2]);
			var isDefaultShip = arrResults[i].getValue(arrColumns[3]);
			var addressText = arrResults[i].getValue(arrColumns[1]);
			addressText = addressText.replace(new RegExp("\r\n", 'g'),"<br>");
			addressText = addressText.replace(new RegExp("\n", 'g'),"<br>");
			addressText = addressText.replace(new RegExp("\r", 'g'),"<br>");

			var billSelected = false;
			var shipSelected = false;
			if (isDefaultBill == 'T' && isDefaultShip == 'F') {
				billSelected = true;
				label += ' (Default Billing)';
				fldBillingAddressText.setDefaultValue(addressText);
			}
			if (isDefaultShip == 'T' && isDefaultBill == 'F') {
				shipSelected = true;
				label += ' (Default Shipping)';
				fldShippingAddressText.setDefaultValue(addressText);
			}
			if (isDefaultShip == 'T' && isDefaultBill == 'T') {
				shipSelected = true;
				billSelected = true;
				label += ' (Default Billing + Shipping)';
				fldBillingAddressText.setDefaultValue(addressText);
				fldShippingAddressText.setDefaultValue(addressText);
			}
			
			fldBillingAddress.addSelectOption(id, label, billSelected);
			fldShippingAddress.addSelectOption(id, label, shipSelected);
			
			var address = new Object;
			address.id = id;
			address.address = addressText;
			objAddys.address[objAddys.address.length] = address;
		}
	}
	return JSON.stringify(objAddys);
}

function sourceLicenses(fld, customerId, acrId){
	
	fld.addSelectOption('', '');
	
	if (acrId != null && acrId != '') {
				
		var arrFilters = new Array();
		arrFilters[0] = new nlobjSearchFilter('isinactive', null, 'is', 'F');
		arrFilters[1] = new nlobjSearchFilter(arrProdTypes[acrId]['customer'], null, 'is', customerId);
		arrFilters[2] = new nlobjSearchFilter(arrProdTypes[acrId]['expiration'], null, 'onorafter', 'daysago60');  
		
		var arrColumns = new Array();
		arrColumns[0] = new nlobjSearchColumn('internalid').setSort(true);
		arrColumns[1] = new nlobjSearchColumn(arrProdTypes[acrId]['licenseid']).setSort(false);
		arrColumns[2] = new nlobjSearchColumn(arrProdTypes[acrId]['activationid']).setSort(false);
		arrColumns[3] = new nlobjSearchColumn(arrProdTypes[acrId]['itemfamily']).setSort(false);
		arrColumns[4] = new nlobjSearchColumn('formulatext');
		arrColumns[4].setFormula('to_char({' + arrProdTypes[acrId]['expiration'] + '},\'MON YYYY\')');
		
		var arrResults = nlapiSearchRecord(arrProdTypes[acrId]['recordid'], null, arrFilters, arrColumns);
		
		for (var i = 0; arrResults != null && i < arrResults.length; i++) {
		
			var licId = arrResults[i].getId();
			var licName = arrResults[i].getValue(arrColumns[1]);
			var licPK = arrResults[i].getValue(arrColumns[2]);
			var licFam = arrResults[i].getText(arrColumns[3]);
			var licExp = arrResults[i].getValue(arrColumns[4]);
			
			fld.addSelectOption(licId, licPK.substr(0,9) + '... (' + licFam + ' ' + licExp + ')');
		}
	}

}

function getActivationId(acrId, licId){

	var activationId = '';
	if (acrId != null && acrId != '' && arrProdTypes[acrId]['recordid'] != null && arrProdTypes[acrId]['recordid'] != '' && arrProdTypes[acrId]['activationid'] != null && arrProdTypes[acrId]['activationid'] != '') {
	
		activationId = nlapiLookupField(arrProdTypes[acrId]['recordid'], licId, arrProdTypes[acrId]['activationid']);
		
	}
	
	return activationId;
	
}

function sourceProductsACR(fld){
	
	fld.addSelectOption('', '');
	
	var arrFilters = new Array();
	arrFilters[0] = new nlobjSearchFilter('isinactive', null, 'is', 'F');
	
	var arrColumns = new Array();
	arrColumns[0] = new nlobjSearchColumn('internalid');
	arrColumns[1] = new nlobjSearchColumn('name').setSort(false);
	
	var arrResults = nlapiSearchRecord('customrecordr7acrproducttype', null, arrFilters, arrColumns);
	
	for (var i = 0; arrResults != null && i < arrResults.length; i++) {
	
		var acrId = arrResults[i].getId();
		var acrName = arrResults[i].getValue(arrColumns[1]);
		
		fld.addSelectOption(acrId, acrName);
	}
}

function sourceItemFamily(fld, objSessionData){
	
	var objItemFamilies = objSessionData.itemFamilies;
	
	fld.addSelectOption('', '');
	
	for (var key in objItemFamilies){
		
		var objFamily = objItemFamilies[key];
		fld.addSelectOption(objFamily.id, objFamily.name);
	}
}
	
function setSessionData(){
	
	var objSessionData = {};
	
	//item families
	var objItemFamilies = {};
	
	var arrFilters = new Array();
	arrFilters[0] = new nlobjSearchFilter('isinactive', null, 'is', 'F');
	arrFilters[1] = new nlobjSearchFilter('custitemr7includeinrapidquote', null, 'is', 'T');
	
	arrFilters[2] = new nlobjSearchFilter('custitemr7itemautocreatelicense', null, 'is', 'T');
	arrFilters[2].setLeftParens(1);
	arrFilters[2].setOr(true);
	arrFilters[3] = new nlobjSearchFilter('custitemr7itemrequireeventregistration', null, 'is', 'T');
	arrFilters[3].setOr(true);
	arrFilters[4] = new nlobjSearchFilter('custitemr7createpsoengagement', null, 'is', 'T');
	arrFilters[4].setOr(true);
	arrFilters[5] = new nlobjSearchFilter('type', null, 'anyof', 'Group');
	arrFilters[5].setOr(true);
	arrFilters[5].setRightParens(1);
	
	var arrColumns = new Array();
	arrColumns[0] = new nlobjSearchColumn('internalid');
	arrColumns[1] = new nlobjSearchColumn('custitemr7itemfamily').setSort(false);
	arrColumns[2] = new nlobjSearchColumn('displayname').setSort(false);
	arrColumns[3] = new nlobjSearchColumn('description');
	
	var arrResults = nlapiSearchRecord('item', null, arrFilters, arrColumns);
	
	for (var i = 0; arrResults != null && i < arrResults.length; i++) {
	
		var itemId = arrResults[i].getId();
		var itemName = arrResults[i].getValue(arrColumns[2]);
		var description = arrResults[i].getValue(arrColumns[3]);
		var itemFamily = arrResults[i].getValue(arrColumns[1]);
		var itemFamilyText = arrResults[i].getText(arrColumns[1]);
		
		if (itemFamily == null || itemFamily == ''){
			continue;
		}
		
		if (description != null && description.length > 60) {
			description = description.substr(0, 60);
		}
		
		var objItem = {
			id: itemId,
			name: itemName + ' - ' + description
		};
		
		var objFamily = {
			id: itemFamily,
			name: itemFamilyText,
			items: []
		};
		
		if (objItemFamilies.hasOwnProperty(itemFamily)) {
			objFamily = objItemFamilies[itemFamily];
		}
		
		objFamily.items.push(objItem);
		objItemFamilies[itemFamily] = objFamily;
	}
	
	objSessionData.itemFamilies = objItemFamilies;
	// done item families
	
	nlapiGetContext().setSessionObject('json_itemfamilies', JSON.stringify(objItemFamilies));
	
	return objSessionData;
}

function sourceItemSelection(fld, itemFamily, objSessionData){

	if (itemFamily != null && itemFamily != '') {
		var objItemFamilies = objSessionData.itemFamilies;
		
		if (objItemFamilies.hasOwnProperty(itemFamily)) {
			var objFamily = objItemFamilies[itemFamily];
			var arrItems = objFamily.items;
			fld.addSelectOption('', '');
			
			for (var i = 0; arrItems != null && i < arrItems.length; i++) {
			
				var objItem = arrItems[i];
				fld.addSelectOption(arrItems[i].id, arrItems[i].name);
			}
		}
	}
	
}

function getAssociatedItems(itemId, acrId, licId, lookupField){

	var arrItems = new Array();
	
	if (itemId != null && itemId != '') {
		var itemResult = nlapiSearchRecord('item', null, nlobjSearchFilter('internalid', null, 'is', itemId), null);
		var itemType = itemResult[0].getRecordType();
		var strItems = nlapiLookupField(itemType, itemId, lookupField);
		
		if (strItems != null && strItems != '') {
			arrItems = strItems.split(',');
		}
	}
	else 
		if (acrId != null && acrId != '') {
			var itemFamily = '';
			
			if (lookupField == 'custitemr7skurequiresitems') {//only pull related for license selections as we dont know the exact SKU it came from
				arrItems = null;
			}
			else {
				if (arrProdTypes[acrId]['itemfamily'] != null && arrProdTypes[acrId]['itemfamily'] != '') {
					itemFamily = nlapiLookupField(arrProdTypes[acrId]['recordid'], licId, arrProdTypes[acrId]['itemfamily']);
				}
				arrItems = findItemsBasedOnITemFamily(itemFamily, acrId, lookupField);
			}
		}
	
	
	var arrItemDetails = new Array();
	
	if (arrItems != null && arrItems != '') {
		var arrFilters = new Array();
		arrFilters[0] = new nlobjSearchFilter('isinactive', null, 'is', 'F');
		arrFilters[1] = new nlobjSearchFilter('internalid', null, 'anyof', arrItems);
		
		var arrColumns = new Array();
		arrColumns[0] = new nlobjSearchColumn('internalid', null, 'group');
		arrColumns[1] = new nlobjSearchColumn('displayname', null, 'max').setSort(false);
		arrColumns[2] = new nlobjSearchColumn('minimumquantity', null, 'max');
		arrColumns[3] = new nlobjSearchColumn('custitemr7itemlockquantitymaximum', null, 'max');
		arrColumns[4] = new nlobjSearchColumn('custitemlockquantity', null, 'max');
		arrColumns[5] = new nlobjSearchColumn('salesdescription', null, 'max');
		arrColumns[6] = new nlobjSearchColumn('custitemr7skurequiresitems', null, 'max');
		arrColumns[7] = new nlobjSearchColumn('baseprice', null, 'min');
		arrColumns[8] = new nlobjSearchColumn('usemarginalrates', null, 'max');
		arrColumns[9] = new nlobjSearchColumn('formulanumeric', null, 'max');
		arrColumns[9].setFormula("CASE WHEN {custitemr7acladdons.custrecordr7acladdon_fieldid} = 'id' OR {custitemr7acladdons.custrecordr7acladdon_fieldtype} = 'date' THEN 1 ELSE 0 END"); //to put date skus on bottom
		
		var arrResults = nlapiSearchRecord('item', null, arrFilters, arrColumns);
		
		for (var i = 0; arrResults != null && i < arrResults.length; i++) {
			var item = new Array();
			var searchResult = arrResults[i];
			
			item['internalid'] = searchResult.getValue(arrColumns[0]);
			item['displayName'] = searchResult.getValue(arrColumns[1]);
			item['minQuantity'] = searchResult.getValue(arrColumns[2]);
			item['maxQuantity'] = searchResult.getValue(arrColumns[3]);
			item['lockQuantity'] = searchResult.getValue(arrColumns[4]);
			item['description'] = searchResult.getValue(arrColumns[5]);
			item['correlation'] = getItemCorrelation(itemId, item['internalid']);
			item['requiredItems'] = searchResult.getValue(arrColumns[6]);
			item['basePrice'] = searchResult.getValue(arrColumns[7]);
			item['marginal'] = searchResult.getValue(arrColumns[8]);
			item['bottom'] = searchResult.getValue(arrColumns[9]);
			
			if (lookupField == 'custitemr7skurequiresitems') {
				item['required'] = 'T';
			}
			else {
				item['required'] = 'F';
			}
			
			arrItemDetails[arrItemDetails.length] = item;
		}
	}
	
	return arrItemDetails;
}

function getItemCorrelation(itemSelected, itemToCorrelate){
	
	var correlation = '0';
	
	if (itemSelected != null && itemSelected != '') {
		var arrFilters = new Array();
		arrFilters[0] = new nlobjSearchFilter('internalid', null, 'anyof', itemSelected);
		arrFilters[1] = new nlobjSearchFilter('correlateditem', null, 'anyof', itemToCorrelate);
		
		var arrColumns = new Array();
		arrColumns[0] = new nlobjSearchColumn('internalid');
		arrColumns[1] = new nlobjSearchColumn('correlateditemcorrelation');
		
		var arrResults = nlapiSearchRecord('item', null, arrFilters, arrColumns);
		
		if (arrResults != null) {
			correlation = Math.round(parseFloat(arrResults[0].getValue(arrColumns[1]))) + '%';
		}
	} else {
		correlation = 'N/A';
	}
	
	return correlation;
}

function getCurrentItemHTML(arrItems){


	var currentItems = '';
	currentItems += '<style media="screen" type="text/css">';
	currentItems += '.datagrid table { border-collapse: collapse; text-align: left; width: 100%; } .datagrid {font: normal 12px/150% Arial, Helvetica, sans-serif; background: #fff; overflow: hidden; border: 1px solid #006699; -webkit-border-radius: 3px; -moz-border-radius: 3px; border-radius: 3px; }.datagrid table td, .datagrid table th { padding: 3px 5px; }.datagrid table thead th {background:-webkit-gradient( linear, left top, left bottom, color-stop(0.05, #006699), color-stop(1, #00557F) );background:-moz-linear-gradient( center top, #006699 5%, #00557F 100% );filter:progid:DXImageTransform.Microsoft.gradient(startColorstr="#006699", endColorstr="#00557F");background-color:#006699; color:#FFFFFF; font-size: 12px; font-weight: bold; border-left: 1px solid #0070A8; } .datagrid table thead th:first-child { border: none; }.datagrid table tbody td { color: #00496B; border-left: 1px solid #E1EEF4;font-size: 12px;font-weight: normal; }.datagrid table tbody .alt td { background: #E1EEF4; color: #00496B; }.datagrid table tbody td:first-child { border-left: none; }.datagrid table tbody tr:last-child td { border-bottom: none; }';
	currentItems += '</style>';
	
	currentItems += '<div class="datagrid"><table>';
	currentItems += '<thead><tr><th>Qty</th><th>Item</th></tr></thead>';
	currentItems += '<tbody>';
	
	for (var i = 0, j = 1; arrItems != null && i < arrItems.length; i++, j++) {
		var item = arrItems.list[i];
		
		if (isEven(i)) {
			currentItems += '<tr><td>' + item.quantity + '</td><td>' + item.displayname + '</td></tr>';
		}
		else {
			currentItems += '<tr class="alt"><td>' + item.quantity + '</td><td>' + item.displayname + '</td></tr>';
		}
	}
	
	currentItems += '</tbody></table></div>';
	return currentItems;
}

function isEven(someNumber){
	return (someNumber % 2 == 0) ? true : false;
}

function findItemsBasedOnITemFamily(itemFamily, acrProductType, lookupField){

	var arrItems = new Array();
	
	var arrFilters = new Array();
	arrFilters[arrFilters.length] = new nlobjSearchFilter('isinactive', null, 'is', 'F');
	if (itemFamily != null && itemFamily != '') {
		arrFilters[arrFilters.length] = new nlobjSearchFilter('custitemr7itemfamily', null, 'anyof', itemFamily);
	}
	if (acrProductType != null && acrProductType != '') {
		arrFilters[arrFilters.length] = new nlobjSearchFilter('custitemr7itemacrproducttype', null, 'anyof', acrProductType);
	}
	arrFilters[arrFilters.length] = new nlobjSearchFilter('custitemr7itemautocreatelicense', null, 'is', 'T');
	arrFilters[arrFilters.length - 1].setLeftParens(1);
	arrFilters[arrFilters.length - 1].setOr(true);
	arrFilters[arrFilters.length] = new nlobjSearchFilter('custitemr7itemrequireeventregistration', null, 'is', 'T');
	arrFilters[arrFilters.length - 1].setOr(true);
	arrFilters[arrFilters.length] = new nlobjSearchFilter('custitemr7createpsoengagement', null, 'is', 'T');
	arrFilters[arrFilters.length - 1].setOr(true);
	arrFilters[arrFilters.length - 1].setRightParens(1);
	
	var arrColumns = new Array();
	arrColumns[0] = new nlobjSearchColumn('internalid', lookupField, 'group').setSort(true);
	
	var arrResults = nlapiSearchRecord('item', null, arrFilters, arrColumns);
	
	for (var i = 0; arrResults != null && i < arrResults.length; i++) {
	
		arrItems[arrItems.length] = arrResults[i].getValue(arrColumns[0]);
	}
	
	return arrItems;
}

