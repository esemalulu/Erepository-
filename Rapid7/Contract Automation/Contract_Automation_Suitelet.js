/*
 * @author efagone
 */

function createContract(request, response){

	if (request.getMethod() == 'GET') {
		
		var orderType = request.getParameter('custparam_ordertype');
		var orderId = request.getParameter('custparam_orderid');
		var customerId = request.getParameter('custparam_customer');
		var contractTemplateId = request.getParameter('custparam_ruleid');
		var currentContract = request.getParameter('custparam_currentcontract');
		var view = request.getParameter('custparam_view');
		
		var customerOnly = false;
		if (orderId == null || orderId == '' || orderType == null || orderType == '') {
			if (customerId == null || customerId == null) {
				throw nlapiCreateError('MISSING_PARAM', 'Request is missing a required parameter', true);
			}
			else {
				customerOnly = true;
			}
		}
		
		var form = nlapiCreateForm('Contract Automation', true);
		form.setScript('customscriptr7contractautomationsuit_cs');
		
		form.addFieldGroup('primarygroup', 'Select Contract').setSingleColumn(true);
		form.addFieldGroup('commentgroup', 'Contract Info').setSingleColumn(true);
		form.addFieldGroup('spacergroup', 'Spacer');
		form.addFieldGroup('detailgroup', 'Contract Info').setSingleColumn(true);
		form.addFieldGroup('termgroup', 'Contract Term').setSingleColumn(true);
		form.addFieldGroup('renewalcost', 'Renewal Amounts');
		
		
		
		var fldOrderType = form.addField('custpage_ordertype', 'text').setDisplayType('hidden');
		//var fldOrderId = form.addField('custpage_orderid', 'text').setDisplayType('hidden');
		//var fldCustomerId = form.addField('custpage_customerid', 'text').setDisplayType('hidden');
		var fldCustomerId = form.addField('custpage_customerid', 'select', 'Customer', 'customer', 'primarygroup').setDisplayType('inline');
		var fldOrderId = form.addField('custpage_orderid', 'select', 'Transaction', 'transaction', 'primarygroup').setDisplayType('inline');
		var fldTemplateAppliesTo = form.addField('custpage_templateappliesto', 'text').setDisplayType('hidden');
		var fldCurrentContract = form.addField('custpage_currentcontract', 'text').setDisplayType('hidden');
		var fldEditExistingContract = form.addField('custpage_existingcontracts', 'select', 'Modify Existing Contract', null, 'primarygroup');
		var fldContractTemplate = form.addField('custpage_contracttemplate', 'select', 'New Contract', null, 'primarygroup');
		fldContractTemplate.setDisplaySize(400);
		
		var recOrder = null;
		
		if (customerOnly) {
			fldCustomerId.setDefaultValue(customerId);
			sourceContractFields(fldEditExistingContract, fldContractTemplate, null, customerId);
		}
		else {
			recOrder = nlapiLoadRecord(orderType, orderId);
			fldCustomerId.setDefaultValue(recOrder.getFieldValue('entity'));
			sourceContractFields(fldEditExistingContract, fldContractTemplate, recOrder);
		}
		
		fldCurrentContract.setDefaultValue(currentContract);
		fldEditExistingContract.setDefaultValue(currentContract);
		fldOrderType.setDefaultValue(orderType);
		fldOrderId.setDefaultValue(orderId);
		
		if ((contractTemplateId != null && contractTemplateId != '') || (currentContract != null && currentContract != '')) {
		
			var locked = false;
			if (currentContract != null && currentContract != '') {
				var recCurrentContract = nlapiLoadRecord('customrecordr7contractautomation', currentContract);
				contractTemplateId = recCurrentContract.getFieldValue('custrecordr7carcreatedfromtemplate');
				var contractStatus = recCurrentContract.getFieldValue('custrecordr7contractautostatus');
				var isInactive = recCurrentContract.getFieldValue('isinactive');
				
				if (isInactive == 'T'){
					response.writeLine('Contract is inactive.');
					return;	
				}
				
				if (contractStatus != 1) {
					view = 'T';
					locked = true;
				}
			}
			else {
				fldContractTemplate.setDefaultValue(contractTemplateId);
			}
			
			if (view == 'T' && !locked) {
				form.addButton('custpage_editcontract', 'Edit', 'editContract()');
			}
			
			var cartTemplateLookup = nlapiLookupField('customrecordr7contractautomationtemplate', contractTemplateId, new Array('name', 'custrecordr7cartempappliesto', 'custrecordr7cartempsuiteletparts', 'custrecordr7cartemptype'));
			var templateAppliesTo = cartTemplateLookup['custrecordr7cartempappliesto'];
			fldTemplateAppliesTo.setDefaultValue(templateAppliesTo);
			var suiteletParts = cartTemplateLookup['custrecordr7cartempsuiteletparts'];
			if (suiteletParts != '' && suiteletParts != null) {
				suiteletParts = suiteletParts.split(",");
			}
			var templateType = cartTemplateLookup['custrecordr7cartemptype'];
			
			var fldComments = form.addField('custpage_comments', 'textarea', 'Comments', null, 'commentgroup');
			var fldAmount = form.addField('custpage_amount', 'currency', 'Amount', null, 'detailgroup').setDisplayType('hidden');
			var fldDiscountAmount = form.addField('custpage_discountamount', 'currency', 'Discount Amount', null, 'detailgroup').setDisplayType('hidden');
			var fldPercentage = form.addField('custpage_percent', 'percent', 'Percent', null, 'detailgroup').setDisplayType('hidden');
			var fldSKUs = form.addField('custpage_skus', 'multiselect', 'SKU(s)', '-10', 'detailgroup').setDisplayType('hidden');
			var fldItemFamilies = form.addField('custpage_itemfamilies', 'multiselect', 'Item Families', '433', 'detailgroup').setDisplayType('hidden');
			form.addField('custpage_spacerdetails', 'inlinehtml', '', null, 'detailgroup');
			
			var fldDurationYears = form.addField('custpage_durationyears', 'float', 'Number of Years', null, 'termgroup');
			var fldDurationStart = form.addField('custpage_durationstart', 'date', 'Start Date', null, 'termgroup').setDisplayType('inline');
			var fldDurationEnd = form.addField('custpage_durationend', 'date', 'End Date', null, 'termgroup').setDisplayType('inline');
			
			fldAmount.setDisplaySize(8);
			fldDiscountAmount.setDisplaySize(8);
			fldPercentage.setDisplaySize(5);
			fldSKUs.setDisplaySize(15, 10);
			
			fldDurationYears.setDisplaySize(2);
			fldDurationStart.setDisplaySize(5);
			fldDurationEnd.setDisplaySize(5);
			
			//fldContractTemplate.setMandatory(true);
			fldComments.setMandatory(true);
			fldDurationYears.setMandatory(true);
			
			
			var fldRenewalOrig = form.addField('custpage_renewaltotal_orig', 'currency', 'Total', null, 'renewalcost');
			var fldRenewalNew = form.addField('custpage_renewaltotal_new', 'currency', 'New Total', null, 'renewalcost');
			fldRenewalOrig.setLayoutType('normal', 'startcol');
			
			//creating list objects
			var lineItemList = form.addSubList('custpage_lineitemlist', 'list', 'Line Items');
			lineItemList.addField('custpage_lineitem_itemid', 'text').setDisplayType('hidden');
			lineItemList.addField('custpage_lineitem_lineid', 'text').setDisplayType('hidden');
			lineItemList.addField('custpage_lineitem_existingcontract', 'text').setDisplayType('hidden');
			lineItemList.addField('custpage_lineitem_quantity', 'float', 'Quantity');
			lineItemList.addField('custpage_lineitem_rate', 'currency', 'Rate').setDisplayType('inline');
			fldLineItemNewRate = lineItemList.addField('custpage_lineitem_newrate', 'currency', 'New Rate');
			fldLineItemNewRate.setDisplayType('hidden');
			fldLineItemNewRate.setDisplaySize(10);
			lineItemList.addField('custpage_lineitem_itemtext', 'text', 'Renewal SKU').setDisplayType('inline');
			lineItemList.addField('custpage_lineitem_itemdescription', 'textarea', 'Description');
			lineItemList.addField('custpage_lineitem_actualamount', 'currency', 'Original Amount').setDisplayType('inline');
			var fldLineItemCheckbox = lineItemList.addField('custpage_lineitem_select', 'checkbox', 'Include');
			fldLineItemCheckbox.setDefaultValue('T');
			fldLineItemCheckbox.setDisplayType('hidden');
			var fldLineItemPercent = lineItemList.addField('custpage_lineitem_percent', 'percent', 'Discount Percentage');
			fldLineItemPercent.setDisplayType('hidden');
			fldLineItemPercent.setDisplaySize(4);
			fldLineItemNewAmount = lineItemList.addField('custpage_lineitem_newamount', 'currency', 'New Amount');
			fldLineItemNewAmount.setDisplayType('hidden');
			fldLineItemNewAmount.setDisplaySize(10);
			
			
			var arrItems = getItemsFromOrder(recOrder);
			
			if (currentContract != null && currentContract != '') {
				var renewalTotalOrig = populateItemList(lineItemList, arrItems, recCurrentContract.getFieldValue('custrecordr7carlineitemsjson'), currentContract);
				fldComments.setDefaultValue(recCurrentContract.getFieldValue('custrecordr7carcomments'));
				fldAmount.setDefaultValue(recCurrentContract.getFieldValue('custrecordr7caramount'));
				fldDiscountAmount.setDefaultValue(recCurrentContract.getFieldValue('custrecordr7cardiscountamount'));
				fldPercentage.setDefaultValue(recCurrentContract.getFieldValue('custrecordr7carpercent'));
				fldSKUs.setDefaultValue(recCurrentContract.getFieldValue('custrecordr7caritems'));
				fldItemFamilies.setDefaultValue(recCurrentContract.getFieldValue('custrecordr7caritemfamilies'));
				fldDurationYears.setDefaultValue(recCurrentContract.getFieldValue('custrecordr7cardurationyears'));
				fldDurationStart.setDefaultValue(recCurrentContract.getFieldValue('custrecordr7carstartdate'));
				fldDurationEnd.setDefaultValue(recCurrentContract.getFieldValue('custrecordr7carenddate'));
				fldRenewalOrig.setDefaultValue(renewalTotalOrig);
				//Users: 105869843-Bobby 1543507-Tyler
				if ((view != 'T' && !locked) || (nlapiGetUser() == 2 || nlapiGetUser() == 105869843  || nlapiGetUser() == 1543507 || nlapiGetUser() == 3889342)) {
					form.addButton('custpage_deletecontract', 'Delete Contract', 'deleteContract()');
				}
				var contractStatus = recCurrentContract.getFieldValue('custrecordr7contractautostatus');
				
				if (contractStatus == 1) {
					form.addButton('custpage_approvecontract', 'Approve Contract', 'approveContract()');
				}
				var newRenTotal = recCurrentContract.getFieldValue('custrecordr7carrenewtotalnewest');
				fldRenewalNew.setDefaultValue(newRenTotal);
			}
			else {
				var renewalTotalOrig = populateItemList(lineItemList, arrItems, null, currentContract);
				fldRenewalOrig.setDefaultValue(renewalTotalOrig);
				fldRenewalNew.setDefaultValue(renewalTotalOrig);
			}
			
			
			lineItemList.setDisplayType('hidden');
			fldRenewalNew.setDisplayType('hidden');
			fldRenewalOrig.setDisplayType('hidden');
			
			for (var i = 0; suiteletParts != null && i < suiteletParts.length; i++) {
				if (suiteletParts[i] == 1) {
					fldSKUs.setDisplayType('normal');
					if (view == 'T') {
						fldSKUs.setDisplayType('inline');
						
					}
					continue;
				}
				
				if (suiteletParts[i] == 2) {
					fldItemFamilies.setDisplayType('normal');
					if (view == 'T') {
						fldItemFamilies.setDisplayType('inline');
					}
					continue;
				}
				
				if (suiteletParts[i] == 3) {
					lineItemList.setDisplayType('normal');
					continue;
				}
				if (suiteletParts[i] == 6) {
					fldAmount.setDisplayType('normal');
					if (view == 'T') {
						fldAmount.setDisplayType('inline');
					}
					continue;
				}
				if (suiteletParts[i] == 7) {
					fldPercentage.setDisplayType('normal');
					if (view == 'T') {
						fldPercentage.setDisplayType('inline');
					}
					continue;
				}
				if (suiteletParts[i] == 8) {
					fldDiscountAmount.setDisplayType('normal');
					if (view == 'T') {
						fldDiscountAmount.setDisplayType('inline');
					}
					continue;
				}
				if (suiteletParts[i] == 9) {
					fldRenewalOrig.setDisplayType('normal');
					fldRenewalOrig.setDisplayType('inline');
					continue;
				}
				if (suiteletParts[i] == 10) {
					fldRenewalNew.setDisplayType('normal');
					fldRenewalNew.setDisplayType('inline');
					continue;
				}
			}
			
			if (templateType == 1) { //dollar
				fldLineItemNewRate.setDisplayType('normal');
				fldLineItemNewAmount.setDisplayType('normal');
				fldLineItemNewAmount.setDisabled(true);
				
				if (view == 'T') {
					fldLineItemNewRate.setDisplayType('inline');
					fldLineItemNewAmount.setDisplayType('inline');
				}
			}
			else 
				if (templateType == 2) { //percent
					fldLineItemPercent.setDisplayType('normal');
					fldLineItemNewAmount.setDisplayType('normal');
					fldLineItemNewAmount.setDisabled(true);
					
					if (view == 'T') {
						fldLineItemPercent.setDisplayType('inline');
						fldLineItemNewAmount.setDisplayType('inline');
					}
				}
			
			if (templateAppliesTo != 6) {
				fldLineItemCheckbox.setDisabled(true);
				fldLineItemPercent.setDisplayType('hidden');
				fldLineItemNewAmount.setDisplayType('hidden');
				fldLineItemNewRate.setDisplayType('hidden');
			}
			
			if (view == 'T') {
				fldCustomerId.setDisplayType('inline');
				fldEditExistingContract.setDisplayType('inline');
				fldContractTemplate.setDisplayType('inline');
				fldComments.setDisplayType('inline');
				fldDurationYears.setDisplayType('inline');
			}
			else {
				form.addSubmitButton('Submit');
			}
		}
		
		response.writePage(form);
	}
	
	if (request.getMethod() == 'POST') {
		
		var action = request.getParameter('custparam_action');
		var actionContractId = request.getParameter('custparam_actionconid');
		
		if (action == 'approve') {
			actionApproveContract(actionContractId);
			return;
		}
		else 
			if (action == 'activate') {
				actionActivateContract(actionContractId);
				return;
			}
			
		var contractTemplate = request.getParameter('custpage_contracttemplate');
		var currentContract = request.getParameter('custpage_existingcontracts');
		var appliesTo = request.getParameter('custpage_templateappliesto');
		var orderType = request.getParameter('custpage_ordertype');
		var orderId = request.getParameter('custpage_orderid');
		var customerId = request.getParameter('custpage_customerid');
		var comments = request.getParameter('custpage_comments');
		var headerAmount = request.getParameter('custpage_amount');
		var headerDiscountAmount = request.getParameter('custpage_discountamount');
		var headerPercent = request.getParameter('custpage_percent');
		var skus = request.getParameter('custpage_skus');
		var itemFamilies = request.getParameter('custpage_itemfamilies');
		var durationYears = request.getParameter('custpage_durationyears');
		var renewalPriceNew = request.getParameter('custpage_renewaltotal_new');
		var renewalPriceOriginal = request.getParameter('custpage_renewaltotal_orig');
		
		var strLineItems = '';
		
		var lineItemsWithContract = new Array();
		if (appliesTo == 6) { //line items
			var lineItemCount = request.getLineItemCount('custpage_lineitemlist');
			
			var objItems = new Object;
			objItems.lines = new Array();
			
			for (var i = 1; i <= lineItemCount; i++) {
				var lineItem = new Object;
				
				var itemId = request.getLineItemValue('custpage_lineitemlist', 'custpage_lineitem_itemid', i);
				var lineId = request.getLineItemValue('custpage_lineitemlist', 'custpage_lineitem_lineid', i);
				var existingContract = request.getLineItemValue('custpage_lineitemlist', 'custpage_lineitem_existingcontract', i);
				var rate = request.getLineItemValue('custpage_lineitemlist', 'custpage_lineitem_rate', i);
				var newRate = request.getLineItemValue('custpage_lineitemlist', 'custpage_lineitem_newrate', i);
				var amountOrig = request.getLineItemValue('custpage_lineitemlist', 'custpage_lineitem_actualamount', i);
				var amountNew = request.getLineItemValue('custpage_lineitemlist', 'custpage_lineitem_newamount', i);
				var discountPercent = request.getLineItemValue('custpage_lineitemlist', 'custpage_lineitem_percent', i);
				var quantity = request.getLineItemValue('custpage_lineitemlist', 'custpage_lineitem_quantity', i);
				var displayName = request.getLineItemValue('custpage_lineitemlist', 'custpage_lineitem_itemtext', i);
				
				lineItem.itemId = itemId;
				lineItem.lineId = lineId;
				
				if (appliesTo == 2 && !isEmpty(headerPercent)) { //order
					discountPercent = headerPercent;
				}
				
				lineItem.newRate = newRate;
				lineItem.discountPercent = discountPercent;
				lineItem.amountNew = amountNew;
				lineItem.quantity = quantity;
				
				if (!isEmpty(newRate) || !isEmpty(discountPercent) && (existingContract == null || existingContract == '' || existingContract == currentContract)) {
					objItems.lines[objItems.lines.length] = lineItem;
					nlapiLogExecution('DEBUG', 'adding', lineId);
					nlapiLogExecution('DEBUG', 'values', newRate + '\n' + discountPercent + '\n' + amountNew);
					lineItemsWithContract[lineItemsWithContract.length] = lineId;
				}
			}
			strLineItems = JSON.stringify(objItems);
		}
		
		var submitText;
		var locked = false;
		if (currentContract != null && currentContract != '') { // edit existing
			var recContract = nlapiLoadRecord('customrecordr7contractautomation', currentContract);
			var contractStatus = recContract.getFieldValue('custrecordr7contractautostatus');
			submitText = 'Contract updated successfully.';
			if (contractStatus != 1 && contractStatus != '' && contractStatus != null) {
				locked = true;
				submitText = 'Contract cannot be modified. It is already active.';
			}
			
		}
		else { // create new
			var recContract = nlapiCreateRecord('customrecordr7contractautomation');
			recContract.setFieldValue('altname', nlapiLookupField('customrecordr7contractautomationtemplate', request.getParameter('custpage_contracttemplate'), 'name'));
			recContract.setFieldValue('custrecordr7carcreatedfromtemplate', request.getParameter('custpage_contracttemplate'));
			submitText = 'Contract created successfully.';
		}
		
		if (!locked) {
			recContract.setFieldValue('custrecordr7carcustomer', request.getParameter('custpage_customerid'));
			recContract.setFieldValue('custrecordr7caroriginalsalesorder', request.getParameter('custpage_orderid'));
			recContract.setFieldValue('custrecordr7carcategory', request.getParameter('custpage_templateappliesto'));
			recContract.setFieldValue('custrecordr7carlineitemsjson', strLineItems);
			recContract.setFieldValue('custrecordr7caritems', request.getParameter('custpage_skus'));
			recContract.setFieldValue('custrecordr7caritemfamilies', request.getParameter('custpage_itemfamilies'));
			recContract.setFieldValue('custrecordr7cardurationyears', request.getParameter('custpage_durationyears'));
			recContract.setFieldValue('custrecordr7cardiscountamount', request.getParameter('custpage_discountamount'));
			recContract.setFieldValue('custrecordr7caramount', request.getParameter('custpage_amount'));
			recContract.setFieldValue('custrecordr7carpercent', request.getParameter('custpage_percent'));
			recContract.setFieldValue('custrecordr7carcomments', request.getParameter('custpage_comments'));
			recContract.setFieldValue('custrecordr7carrenewtotalnewest', request.getParameter('custpage_renewaltotal_new'));
			
			var id = nlapiSubmitRecord(recContract, false, true);
			
			if (orderId != null && orderId != '' && orderType != null && orderType != '') {
				var recOrder = nlapiLoadRecord(orderType, orderId);
				var arrExistingContracts = recOrder.getFieldValues('custbodyr7contractautomationrecs');
				
				var arrNewContracts = new Array();
				for (var k = 0; arrExistingContracts != null && k < arrExistingContracts.length; k++) {
					arrNewContracts[arrNewContracts.length] = arrExistingContracts[k];
				}
				
				arrNewContracts[arrNewContracts.length] = id;
				arrNewContracts = unique(arrNewContracts);
				
				recOrder.setFieldValue('custbodyr7contractautomationrecs', arrNewContracts)
				
				if (lineItemsWithContract != null) {
				
					var lineCount = recOrder.getLineItemCount('item');
					
					for (var i = 1; i <= lineCount; i++) {
					
						var match = false;
						var currentLineId = recOrder.getLineItemValue('item', 'id', i);
						for (var j = 0; j < lineItemsWithContract.length; j++) {
						
							var contractLineId = lineItemsWithContract[j];
							if (currentLineId === contractLineId) {
								nlapiLogExecution('DEBUG', 'match', currentLineId);
								match = true;
								break;
							}
							
						}
						
						if (match) {
							nlapiLogExecution('DEBUG', 'match', currentLineId);
							recOrder.setLineItemValue('item', 'custcolr7contractrenewal', i, id);
							recOrder.setLineItemValue('item', 'custcolr7renewedfromlineid', i, currentLineId);
						}
						else 
							if (id == recOrder.getLineItemValue('item', 'custcolr7contractrenewal', i)) {
								recOrder.setLineItemValue('item', 'custcolr7contractrenewal', i, '');
								recOrder.setLineItemValue('item', 'custcolr7renewedfromlineid', i, '');
							}
						
					}
					
				}
				nlapiSubmitRecord(recOrder, true, true);
			}
		}
		response.writeLine(submitText);
	}
	
}

function isEmpty(value){
	
	if (value == null || value == '' || value == 'null'){
		return true;
	}
	return false;
}

function sourceContractFields(fldEditExistingContract, fldContractTemplate, recOrder, customerId){
	
	fldEditExistingContract.addSelectOption('', '');
	fldContractTemplate.addSelectOption('', '');
	
	var customerOnly = false;
	
	if (recOrder == null || recOrder == ''){
		customerOnly = true;
	}
	
	var arrCurrentContracts = grabCurrentContracts(recOrder, customerId);	
	var arrContractTemplates = grabContractTemplates(arrCurrentContracts, customerOnly);
	
	for (var i = 0; arrCurrentContracts != null && i < arrCurrentContracts.length; i++) {
		
		var currentContract = arrCurrentContracts[i];
		var id = currentContract.id;
		var name = currentContract.name;
					
		fldEditExistingContract.addSelectOption(id, name);
	}
	
	for (var i = 0; arrContractTemplates != null && i < arrContractTemplates.length; i++) {
		
		var currentTemplate = arrContractTemplates[i];
		var id = currentTemplate.id;
		var name = currentTemplate.name;
		fldContractTemplate.addSelectOption(id, name);
	}
	
}

function grabContractTemplates(arrCurrentContracts, customerOnly){

	var arrSearchFilters = new Array();
	arrSearchFilters[arrSearchFilters.length] = new nlobjSearchFilter('isinactive', null, 'is', 'F');
	if (customerOnly) {
		arrSearchFilters[arrSearchFilters.length] = new nlobjSearchFilter('custrecordr7cartempappliesto', null, 'anyof', new Array(1, 3));
	}
	
	var arrSearchColumns = new Array();
	arrSearchColumns[0] = new nlobjSearchColumn('name').setSort(false);
	arrSearchColumns[1] = new nlobjSearchColumn('custrecordr7cartempconflicts');
	
	var arrSearchResults = nlapiSearchRecord('customrecordr7contractautomationtemplate', null, arrSearchFilters, arrSearchColumns);
	
	var arrContractTemplates = new Array();
	
	for (var i = 0; arrSearchResults != null && i < arrSearchResults.length; i++) {
	
		var contractTemplate = new Object;
		var include = true;
		var searchResult = arrSearchResults[i];
		var tempId = searchResult.getId();
		var tempName = searchResult.getValue(arrSearchColumns[0]);
		var conflictingTemplates = searchResult.getValue(arrSearchColumns[1]);
		
		if (conflictingTemplates != null && conflictingTemplates != '') {
			var arrConflictingTemplates = conflictingTemplates.split(',');
			for (var k = 0; arrCurrentContracts != null && k < arrCurrentContracts.length & include; k++) {
			
				var contract = arrCurrentContracts[k];
				var createdFromTemplate = contract.template;
				
				for (var j = 0; arrConflictingTemplates != null && j < arrConflictingTemplates.length && include; j++) {
				
					var conflictId = arrConflictingTemplates[j];
					
					if (conflictId == createdFromTemplate) {
						include = false;
					}
				}
			}
		}
		
		if (include) {
			contractTemplate.id = tempId;
			contractTemplate.name = tempName;
			contractTemplate.conflicts = conflictingTemplates;
			
			arrContractTemplates[arrContractTemplates.length] = contractTemplate;
		}
	}
	
	return arrContractTemplates;
}

function grabCurrentContracts(recOrder, customerId){
	
	var arrCurrentContracts;
	
	if (recOrder != null) {
		arrCurrentContracts = recOrder.getFieldValues('custbodyr7contractautomationrecs');
		customerId = recOrder.getFieldValue('entity');
	}	
	
	if (customerId != null && customerId != '') {
		var arrSearchFilters = new Array();
		arrSearchFilters[arrSearchFilters.length] = new nlobjSearchFilter('isinactive', null, 'is', 'F');
		arrSearchFilters[arrSearchFilters.length] = new nlobjSearchFilter('custrecordr7carcustomer', null, 'is', customerId);
		arrSearchFilters[arrSearchFilters.length] = new nlobjSearchFilter('custrecordr7contractautostatus', null, 'is', '1');
		
		if (arrCurrentContracts != null && arrCurrentContracts.length > 0) {
			arrSearchFilters[arrSearchFilters.length - 1].setLeftParens(1);
			arrSearchFilters[arrSearchFilters.length - 1].setOr(true);
			arrSearchFilters[arrSearchFilters.length] = new nlobjSearchFilter('internalid', null, 'anyof', arrCurrentContracts);
			arrSearchFilters[arrSearchFilters.length - 1].setRightParens(1);
		}
		
		var arrSearchColumns = new Array();
		arrSearchColumns[0] = new nlobjSearchColumn('internalid');
		arrSearchColumns[1] = new nlobjSearchColumn('altname').setSort(false);
		arrSearchColumns[2] = new nlobjSearchColumn('custrecordr7carcreatedfromtemplate');
		
		var arrSearchResults = nlapiSearchRecord('customrecordr7contractautomation', null, arrSearchFilters, arrSearchColumns);
		
		var arrCurrentContracts = new Array();
		
		for (var i = 0; arrSearchResults != null && i < arrSearchResults.length; i++) {
		
			var currentContract = new Object;
			
			var searchResult = arrSearchResults[i];
			var carId = searchResult.getId();
			var carName = searchResult.getValue(arrSearchColumns[1]);
			var createdFromTemplate = searchResult.getValue(arrSearchColumns[2]);
			
			currentContract.id = carId;
			currentContract.name = carName;
			currentContract.template = createdFromTemplate;
			
			arrCurrentContracts[arrCurrentContracts.length] = currentContract;
		}
		
		return arrCurrentContracts;
	}
	
	return null;
}

function unique(a){
	a.sort();
	for (var i = 1; i < a.length;) {
		if (a[i - 1] == a[i]) {
			a.splice(i, 1);
		}
		else {
			i++;
		}
	}
	return a;
}

function getItemsFromOrder(recOrder){
	
	if (recOrder != null) {
		var lineItems = new Array();
		
		var lineItemCount = recOrder.getLineItemCount('item');
		
		for (var i = 1; i <= lineItemCount; i++) {
			var lineItem = new Array();
			var item = recOrder.getLineItemValue('item', 'item', i);
			var itemType = recOrder.getLineItemValue('item', 'itemtype', i);
			
			if (itemType != 'Subtotal' && itemType != 'Discount' && itemType != 'Description' && itemType != 'group' && itemType != 'EndGroup') {
				var renewalProperties = getItemProperties(item);
				var renewalSKU = renewalProperties['custitemr7itemrenewalsku'];
				var renewalCode = renewalProperties['custitemr7itemrenewalcode'];
				
				if (renewalSKU != null && renewalSKU != '') {
					var renewalSKUDisplayName = nlapiLookupField('item', renewalSKU, 'displayname');
					var quantity = parseFloat(recOrder.getLineItemValue('item', 'quantity', i));
					var unitType = recOrder.getLineItemValue('item', 'custcolr7itemqtyunit', i);
					//should not renew things for longer than 1 year
					if (unitType == '2' && quantity > 12) {
						quantity = 12;
						renewalProperties['custitemr7itemrarequiresmanualreview'] = 'T';
					}
					if (unitType == '3' && quantity != 1) {
						quantity = 1;
						renewalProperties['custitemr7itemrarequiresmanualreview'] = 'T';
					}
					if (unitType == '5' && quantity > 365) {
						quantity = 365;
						renewalProperties['custitemr7itemrarequiresmanualreview'] = 'T';
					}
					
					//renewal pricing
					var rate = recOrder.getLineItemValue('item', 'rate', i);
					
					if (rate != '' && rate != null) {
						rate = determineRenewalPricing(rate, renewalCode);
					}
					
					lineItem['item'] = renewalSKU;
					lineItem['renewalProperties'] = renewalProperties;
					lineItem['originalItemIid'] = item;
					lineItem['quantity'] = quantity;
					lineItem['priceLevel'] = recOrder.getLineItemValue('item', 'price', i);
					lineItem['rate'] = rate;
					lineItem['lineId'] = recOrder.getLineItemValue('item', 'id', i);
					lineItem['displayname'] = renewalSKUDisplayName;
					lineItem['orderId'] = recOrder.getId();
					lineItem['description'] = recOrder.getLineItemValue('item', 'description', i);
					lineItem['contractId'] = recOrder.getLineItemValue('item', 'custcolr7contractrenewal', i);
					lineItem['renewedFromLineId'] = recOrder.getLineItemValue('item', 'custcolr7renewedfromlineid', i);
					lineItem['orderStartDate'] = recOrder.getFieldValue('startdate');
					lineItem['orderEndDate'] = recOrder.getFieldValue('enddate');
					lineItems[lineItems.length] = lineItem;
				}
			}
		}
		return lineItems;
	}
	return null;
}

function populateItemList(lineItemList, arrItems, strCurrentContractItemsJSON, currentContract){

	var renewalTotalOrig = 0;
	
	var objCurrentItems = new Object;

	if (strCurrentContractItemsJSON != null && strCurrentContractItemsJSON != '') {
		objCurrentItems = JSON.parse(strCurrentContractItemsJSON);
	}
	
	for (var i = 0, j = 1; arrItems != null && i < arrItems.length; i++, j++) {
		var listItem = arrItems[i];
		var itemProperties = listItem['itemProperties'];
		
		var description = listItem['description'];
		if (description != null && description.length > 60) {
			description = description.substr(0, 60);
		}
		
		if (currentContract == listItem['contractId'] || listItem['contractId'] == null || listItem['contractId'] == '') {
			var amount = parseFloat(listItem['rate']) * parseFloat(listItem['quantity']);
			lineItemList.setLineItemValue('custpage_lineitem_itemid', j, listItem['item']);
			lineItemList.setLineItemValue('custpage_lineitem_lineid', j, listItem['lineId']);
			lineItemList.setLineItemValue('custpage_lineitem_existingcontract', j, listItem['contractId']);
			lineItemList.setLineItemValue('custpage_lineitem_rate', j, listItem['rate']);
			lineItemList.setLineItemValue('custpage_lineitem_actualamount', j, amount);
			lineItemList.setLineItemValue('custpage_lineitem_newamount', j, amount.toFixed(2));
			lineItemList.setLineItemValue('custpage_lineitem_quantity', j, parseFloat(listItem['quantity']));
			lineItemList.setLineItemValue('custpage_lineitem_itemtext', j, listItem['displayname']);
			lineItemList.setLineItemValue('custpage_lineitem_itemdescription', j, description);
			renewalTotalOrig = renewalTotalOrig + amount;
			
			for (var k = 0; objCurrentItems.lines != null && k < objCurrentItems.lines.length; k++) {
				var currentItem = objCurrentItems.lines[k];
				
				if (listItem['lineId'] == currentItem.lineId || listItem['renewedFromLineId'] == currentItem.lineId) {
					lineItemList.setLineItemValue('custpage_lineitem_percent', j, currentItem.discountPercent);
					lineItemList.setLineItemValue('custpage_lineitem_newrate', j, currentItem.newRate);
					lineItemList.setLineItemValue('custpage_lineitem_newamount', j, currentItem.amountNew);
					break;
				}
			}
		}
		else {
			j--;
		}
	}
	
	return renewalTotalOrig;
}

function getItemProperties(itemId){

    var properties = new Array('isinactive', 'displayname', 'custitemr7itemfamily', 'custitemr7itemrenewalsku', 'custitemr7itemrenewalcode');
    var lookedUpProperties = nlapiLookupField('item', itemId, properties);
    return lookedUpProperties;
}

function determineRenewalPricing(rate, renewalCode){
	/*
	100L	 	1	 
	35L	 	2	 
	DNR	 	3	 
	35C	 	4	 
	100C	 	5	 
	SPC	 	6
	105L
	*/
	var result;

	rate = parseFloat(rate);
	
	switch (renewalCode) {
		case '1':
			result = rate;
			break;
		case '2':
			result = Math.round((rate * .35) * 10000) / 10000;
			break;
		case '3':
			result = rate;
			break;
		case '4':
			result = Math.round((rate * .35) * 10000) / 10000;
			break;
		case '5':
			result = rate;
			break;
		case '6':
			result = rate;
			break;
		case '7':
			result = rate;
			break;
		case '8':
			result = Math.round((rate * .20) * 10000) / 10000;
			break;
		default:
			result = rate;
	}
	
	return result;
	
}

function actionApproveContract(contractId){

	nlapiSubmitField('customrecordr7contractautomation', contractId, 'custrecordr7carprocesscontract', 'T');
	nlapiScheduleScript(595); //contracts
}

function actionActivateContract(contractId){

	nlapiSubmitField('customrecordr7contractautomation', contractId, 'custrecordr7contractautostatus', 2);
}
