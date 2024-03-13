/*
 * @author efagone
 */

var arrProductTypes = grabAllProductTypes();

function getAdditionInfo(request, response){

	if (request.getMethod() == 'GET') {
	
		//grab all parameters supplied
		var salesOrderId = request.getParameter('custparam_salesorder');
		var opportunityId = request.getParameter('custparam_opportunity');
		var redirectTo = request.getParameter('custparam_redirectto');
		
		if (redirectTo != null && redirectTo != '') {
			var arrIds = redirectTo.split(',');
			var oppSearch = nlapiLoadSearch(null, 10264);
			oppSearch.addFilter(new nlobjSearchFilter('internalid', null, 'anyof', arrIds));
			oppSearch.setRedirectURLToSearchResults();
			return;
		}
		
		if ((salesOrderId == '' || salesOrderId == null) && (opportunityId == null || opportunityId == '')) {
			throw nlapiCreateError('INVALID PARAM', 'This suitelet requires a valid parameter', true);
		}
		
		//build form
		var form = nlapiCreateForm('Renewal Automation', false);
		form.setScript('customscriptr7renewalautosuitelet_cs');
		var primaryGroup = form.addFieldGroup('primarygroup', 'Primary Information').setSingleColumn(true);
		var transactionDetailsGroup = form.addFieldGroup('transactiondetailsgroup', 'Transaction Details').setSingleColumn(true);
		var renewalInformationGroup = form.addFieldGroup('renewalinformationgroup', 'Renewal Information');
		
		//hidden fields	
		var fldCreateAlert = form.addField('custpage_createalert', 'checkbox').setDisplayType('hidden');
		var fldReason = form.addField('custpage_reason', 'text').setDisplayType('hidden');
		var fldCustomerId = form.addField('custpage_customerid', 'text').setDisplayType('hidden');
		var fldSalesOrderId = form.addField('custpage_salesorder', 'text').setDisplayType('hidden');
		var fldOpportunityId = form.addField('custpage_opportunity', 'text').setDisplayType('hidden');
		
		//main fields
		var fldCustomer = form.addField('custpage_customer', 'text', 'Customer', null, 'primarygroup').setDisplayType('inline');
		var fldOrderLink = form.addField('custpage_orderlink', 'text', 'Order #', null, 'primarygroup').setDisplayType('inline');
		var fldOpportunityLink = form.addField('custpage_opportunitylink', 'text', 'Order #', null, 'primarygroup').setDisplayType('hidden');
		var fldSalesRep = form.addField('custpage_salesrep', 'text', 'Sales Rep', null, 'primarygroup').setDisplayType('inline');
		var fldStartDate = form.addField('custpage_startdate', 'date', 'Start Date', null, 'primarygroup');
		fldStartDate.setDisplayType('inline');
		var fldEndDate = form.addField('custpage_enddate', 'date', 'End Date', null, 'primarygroup');
		fldEndDate.setDisplayType('inline');
		var fldExpectedClose = form.addField('custpage_expectedclose', 'date', 'Expected Close', null, 'primarygroup');
		fldExpectedClose.setDisplayType('inline');
		var fldAmount = form.addField('custpage_amount', 'currency', 'Total Amount', null, 'transactiondetailsgroup').setDisplayType('inline');
		fldStartDate.setLayoutType('normal', 'startcol');
		var fldTotalDiscount = form.addField('custpage_totaldiscount', 'percent', 'Total Discount', null, 'transactiondetailsgroup').setDisplayType('inline');
		var fldCategoriesPurchased = form.addField('custpage_categoriespurchased', 'multiselect', 'Categories Purchased', 'customrecord302', 'transactiondetailsgroup').setDisplayType('inline');
		
		var fldRenewalUplift = form.addField('custpage_upliftpercent', 'percent', 'Renewal Uplift', null, 'renewalinformationgroup');
		fldRenewalUplift.setLayoutType('startrow', 'startcol');
		var fldAMWorkflow = form.addField('custpage_workflow', 'select', 'Account Management Workflow', null, 'renewalinformationgroup');
		var fldCoTermWith = form.addField('custpage_cotermwithopp', 'select', 'Co-Term Into Opportunity', null, 'renewalinformationgroup');
		//fldCoTermWith.setDisplayType('inline');
		fldCoTermWith.setLayoutType('normal', 'startcol');
		var fldCoTermDate = form.addField('custpage_cotermwdate', 'date', 'Target Expiration', null, 'renewalinformationgroup');
		if (nlapiGetUser() != 55011 && nlapiGetUser() != 2) {
			fldCoTermDate.setDisplayType('hidden');
		}
		
		var itemList = form.addSubList('custpage_item_items', 'list', 'Items');
		itemList.setDisplayType('hidden');
		//itemList.addButton('custpage_btn_markall', 'Mark All', 'markAllSplit()');
		itemList.addButton('custpage_btn_unmarkall', 'Unmark All', 'unMarkAllSplit()');
		itemList.addField('custpage_item_memberids', 'textarea').setDisplayType('hidden');
		itemList.addField('custpage_item_split', 'checkbox', 'Move to separate Opp?');
		itemList.addField('custpage_item_itemfamily', 'text', 'Item').setDisplayType('inline');
		itemList.addField('custpage_item_key', 'text', 'Product Key');
		itemList.addField('custpage_item_minstart', 'date', 'Start Date');
		itemList.addField('custpage_item_maxend', 'date', 'End Date');
		itemList.addField('custpage_item_totalamount', 'currency', 'Total');
		
		//now populate the fields
		
		var recTransaction = null;
		
		if (salesOrderId != null && salesOrderId != '') {
			recTransaction = nlapiLoadRecord('salesorder', salesOrderId);
			
			fldExpectedClose.setDisplayType('hidden');
			
			fldOrderLink.setDefaultValue('<a href="' + '/app/accounting/transactions/salesord.nl?id=' + salesOrderId + '" target="_blank">' + recTransaction.getFieldValue('tranid') + '</a>');
			fldAmount.setDefaultValue(recTransaction.getFieldValue('total'));
			
			var renewalUpliftCap = checkForUpliftCap(recTransaction);
			
			if (renewalUpliftCap != null && renewalUpliftCap != '') {
				fldRenewalUplift.setDefaultValue(renewalUpliftCap);
				fldRenewalUplift.setDisplayType('inline');
			}
			else {
				fldRenewalUplift.setDefaultValue(5);
			}
			if (nlapiGetUser() == 1230735) {
				fldRenewalUplift.setDefaultValue(0);
			}
		}
		else 
			if (opportunityId != null && opportunityId != '') {
				recTransaction = nlapiLoadRecord('opportunity', opportunityId);
				
				fldStartDate.setDisplayType('hidden');
				fldEndDate.setDisplayType('hidden');
				fldRenewalUplift.setDisplayType('hidden');
				fldAMWorkflow.setDisplayType('hidden');
				
				fldOrderLink.setDefaultValue('<a href="' + '/app/accounting/transactions/opprtnty.nl?id=' + opportunityId + '" target="_blank">' + recTransaction.getFieldValue('tranid') + '</a>');
				fldAmount.setDefaultValue(recTransaction.getFieldValue('projectedtotal'));
				
				fldRenewalUplift.setDefaultValue(0);
				
				itemList.setDisplayType('normal');
			}
		
		fldSalesOrderId.setDefaultValue(salesOrderId);
		fldOpportunityId.setDefaultValue(opportunityId);
		fldCustomer.setDefaultValue(recTransaction.getFieldText('entity'));
		fldCustomerId.setDefaultValue(recTransaction.getFieldValue('entity'));
		fldSalesRep.setDefaultValue(recTransaction.getFieldText('salesrep'));
		fldStartDate.setDefaultValue(recTransaction.getFieldValue('startdate'));
		fldEndDate.setDefaultValue(recTransaction.getFieldValue('enddate'));
		fldExpectedClose.setDefaultValue(recTransaction.getFieldValue('expectedclosedate'));
		fldTotalDiscount.setDefaultValue(recTransaction.getFieldValue('custbodyr7transactiondiscounttotal'));
		fldCategoriesPurchased.setDefaultValue(recTransaction.getFieldValue('custbodyr7categorypurchased'));
		fldAMWorkflow.setDefaultValue(recTransaction.getFieldValue('custbodyr7accountmanagementworkflow'));
		
		fldSalesOrderId.setMandatory(true);
		fldCustomer.setMandatory(true);
		fldRenewalUplift.setMandatory(true);
		fldAMWorkflow.setMandatory(true);
		
		fldCustomer.setDisplaySize(250);
		fldAMWorkflow.setDisplaySize(200);
		fldRenewalUplift.setDisplaySize(10);
		
		sourceWorkflows(fldAMWorkflow);
		sourceOpportunities(fldCoTermWith, recTransaction);
		
		fldCustomer.setLayoutType('normal', 'startcol');
		
		var addAssociationButton = false;
		
		var arrDetails = getItemsFromOrder(recTransaction);
		var arrItems = arrDetails[0];
		var objGroups = arrDetails[1];
		objGroups = addTotalsToGroup(objGroups, opportunityId);
		var arrACLItems = getACLItems(arrItems);
		var arrAddOnItems = getAddOnItems(arrItems);
		
		for (var i = 0; arrACLItems != null && i < arrACLItems.length; i++) {
			var listItem = arrACLItems[i];
			var itemProperties = listItem['itemProperties'];
			var isInactive = itemProperties['isinactive'];
			var productKey = listItem['activationKey'];
			
			if (productKey == '' || productKey == null) {
				//fldCreateAlert.setDefaultValue('T');
				//fldReason.setDefaultValue('There are still unprocessed (or unassociated) items on this order.');
				//addAssociationButton = true;
			}
			
			if (isInactive == 'T') {
				fldCreateAlert.setDefaultValue('T');
				fldReason.setDefaultValue('There is an inactive item on the order you are processing.');
			}
		}
		
		for (var i = 0; arrAddOnItems != null && i < arrAddOnItems.length; i++) {
			var listItem = arrAddOnItems[i];
			var itemProperties = listItem['itemProperties'];
			var isInactive = itemProperties['isinactive'];
			var productKey = listItem['activationKey'];
			
			if (productKey == '' || productKey == null) {
				fldCreateAlert.setDefaultValue('T');
				fldReason.setDefaultValue('There are still unprocessed (or unassociated) items on this order.');
				addAssociationButton = true;
			}
			
			if (isInactive == 'T') {
				fldCreateAlert.setDefaultValue('T');
				fldReason.setDefaultValue('There is an inactive item on the order you are processing.');
			}
		}
		
		var lineNum = 1;
		for (var key in objGroups) {

			var group = objGroups[key];
			var licenseInfo = findLicenseFamily(group.key, group.acrId);
			itemList.setLineItemValue('custpage_item_memberids', lineNum, group.members.join());
			itemList.setLineItemValue('custpage_item_itemfamily', lineNum, licenseInfo[3]);
			itemList.setLineItemValue('custpage_item_key', lineNum, group.key);
			itemList.setLineItemValue('custpage_item_minstart', lineNum, group.start);
			itemList.setLineItemValue('custpage_item_maxend', lineNum, group.end);
			itemList.setLineItemValue('custpage_item_totalamount', lineNum, group.total);
			
			lineNum++;
		}
		
		if (addAssociationButton) {
			form.addButton('custpage_associateitems', 'Associate Items', 'associateItems');
		}
		else {
			var theButton = form.addButton('custpage_renew', 'Create Renewal', 'createOpportunitiesFromSuitelet');
			
			if (opportunityId != null && opportunityId != '') {
				theButton.setLabel('Process');
			}
		}
		
		response.writePage(form);
		
		
	}
	
}

function sourceWorkflows(fld){
	fld.addSelectOption('', '');
	var arrSearchFilters = new Array();
	arrSearchFilters[0] = new nlobjSearchFilter('isinactive', null, 'is', 'F');
	
	var arrSearchColumns = new Array();
	arrSearchColumns[0] = new nlobjSearchColumn('name');
	
	var arrSearchResults = nlapiSearchRecord('customrecordr7acctmanageworkflow', null, arrSearchFilters, arrSearchColumns);
	
	for (var i = 0; arrSearchResults != null && i < arrSearchResults.length; i++) {
	
		var searchResult = arrSearchResults[i];
		var workflowId = searchResult.getId();
		var workflowName = searchResult.getValue(arrSearchColumns[0]);
		
		fld.addSelectOption(workflowId, workflowName);
	}
	
}

function sourceOpportunities(fld, recTransaction){
	
	fld.addSelectOption('', '');
	
	var customerId = recTransaction.getFieldValue('entity');
	var salesRep = recTransaction.getFieldValue('salesrep');
	
	var arrSearchFilters = new Array();
	arrSearchFilters[arrSearchFilters.length] = new nlobjSearchFilter('entity', null, 'is', customerId);
	arrSearchFilters[arrSearchFilters.length] = new nlobjSearchFilter('department', null, 'is', 10);
	//arrSearchFilters[arrSearchFilters.length] = new nlobjSearchFilter('custbodyr7opprenewalautomationcreated', null, 'is', 'T');
	arrSearchFilters[arrSearchFilters.length] = new nlobjSearchFilter('probability', null, 'greaterthan', 0);
	arrSearchFilters[arrSearchFilters.length] = new nlobjSearchFilter('probability', null, 'lessthan', 100);
	arrSearchFilters[arrSearchFilters.length] = new nlobjSearchFilter('currency', null, 'is', recTransaction.getFieldValue('currency'));
	arrSearchFilters[arrSearchFilters.length] = new nlobjSearchFilter('internalid', null, 'noneof', recTransaction.getId());
	
	if (recTransaction.getRecordType().toLowerCase() == 'opportunity') {
		//arrSearchFilters[arrSearchFilters.length] = new nlobjSearchFilter('internalid', 'estimate', 'isempty');
		arrSearchFilters[arrSearchFilters.length] = new nlobjSearchFilter('expectedclosedate', null, 'onorbefore', recTransaction.getFieldValue('expectedclosedate'));
		arrSearchFilters[arrSearchFilters.length] = new nlobjSearchFilter('expectedclosedate', null, 'onorafter', 'lastmonth');
	}
	
	var arrSearchColumns = new Array();
	arrSearchColumns[0] = new nlobjSearchColumn('tranid').setSort(true);
	arrSearchColumns[1] = new nlobjSearchColumn('title');
	arrSearchColumns[2] = new nlobjSearchColumn('entitystatus');
	arrSearchColumns[3] = new nlobjSearchColumn('expectedclosedate');
	arrSearchColumns[4] = new nlobjSearchColumn('projectedtotal');
	
	var arrSearchResults = nlapiSearchRecord('opportunity', null, arrSearchFilters, arrSearchColumns);
	
	for (var i = 0; arrSearchResults != null && i < arrSearchResults.length; i++) {
		
		var searchResult = arrSearchResults[i];
		var oppId = searchResult.getId();
		var tranId = searchResult.getValue(arrSearchColumns[0]);
		var title = searchResult.getValue(arrSearchColumns[1]);
		var expClose = searchResult.getValue(arrSearchColumns[3]);
		var amount = searchResult.getValue(arrSearchColumns[4]);
		amount = addCommas(amount);
		
		var optionText = tranId + ': ' + title + ' (' + expClose + ') -  $' + amount;
		
		fld.addSelectOption(oppId, optionText);
	}
}


function checkForUpliftCap(salesOrder){

	var arrSearchFilters = new Array();
	var arrSearchColumns = new Array();
	var arrSearchResults;
	
	arrSearchFilters[arrSearchFilters.length] = new nlobjSearchFilter('internalid', null, 'is', salesOrder.getId());
	arrSearchFilters[arrSearchFilters.length] = new nlobjSearchFilter('custrecordr7carcreatedfromtemplate', 'custbodyr7contractautomationrecs', 'anyof', 6); //order
	arrSearchColumns[0] = new nlobjSearchColumn('custrecordr7carpercent', 'custbodyr7contractautomationrecs', 'MIN').setSort(true);
	
	arrSearchResults = nlapiSearchRecord('transaction', null, arrSearchFilters, arrSearchColumns);
	
	var upliftCap;
	
	if (arrSearchResults != null) {
		upliftCap = arrSearchResults[0].getValue(arrSearchColumns[0]);
	}
	
	return upliftCap;
}

function addTotalsToGroup(objGroups, opportunityId){

	var arrFilters = new Array();
	arrFilters[arrFilters.length] = new nlobjSearchFilter('internalid', null, 'is', opportunityId);
	
	var arrSearchResults = nlapiSearchRecord('transaction', 14966, arrFilters);
	
	for (var i = 0; arrSearchResults != null && i < arrSearchResults.length; i++) {
		var columns = arrSearchResults[i].getAllColumns();
		var currentKey = arrSearchResults[i].getValue(columns[1]);
		if (currentKey != null && currentKey != '') {
			if (objGroups.hasOwnProperty(currentKey)) {
				objGroups[currentKey]['total'] = arrSearchResults[i].getValue(columns[2]);
			}
		}
	}
	
	return objGroups;
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

function r7_group(){

	this.start = '';
	this.end = '';
	this.total = 0;
	this.key = '';
	this.acrId = '';
	this.members = new Array();
}


function findLicenseFamily(activationKey, acrId){
	
	if (acrId == null || acrId == ''){
		return null;
	}
	var acrProductTypeFields = arrProductTypes[acrId];
	
	if (acrProductTypeFields != null && acrProductTypeFields != '' && acrProductTypeFields != 'undefined') {
		var activationKeyField = acrProductTypeFields['activationid'];
		var recordId = acrProductTypeFields['recordid'];
		var expirationField = acrProductTypeFields['expiration'];
		var licenseIdField = acrProductTypeFields['licenseid'];
		var familyField = acrProductTypeFields['itemfamily'];
		
		var arrSearchFilters = new Array();
		arrSearchFilters[arrSearchFilters.length] = new nlobjSearchFilter(activationKeyField, null, 'is', activationKey);
		
		var arrSearchColumns = new Array();
		arrSearchColumns[0] = new nlobjSearchColumn(expirationField);
		arrSearchColumns[1] = new nlobjSearchColumn('internalid');
		arrSearchColumns[2] = new nlobjSearchColumn(licenseIdField);
		arrSearchColumns[3] = new nlobjSearchColumn(familyField);

		var arrSearchResults = nlapiSearchRecord(recordId, null, arrSearchFilters, arrSearchColumns);
		
		if (arrSearchResults != null && arrSearchResults.length >= 1) {
			var expDate = arrSearchResults[0].getValue(arrSearchColumns[0]);
			var licenseId = arrSearchResults[0].getValue(arrSearchColumns[1]);
			var name = arrSearchResults[0].getValue(arrSearchColumns[2]);
			var family = arrSearchResults[0].getText(arrSearchColumns[3]);
			
			return new Array(expDate, licenseId, name, family);
		}
		
	}
	return null;
}

function getItemsFromOrder(recOrder){

	var objGroups = new Object();
	var prevLine = null;
	var lineItems = new Array();
	
	lineItemCount = recOrder.getLineItemCount('item');
	
	for (var i = 1; i <= lineItemCount; i++) {
	
		var lineItem = new Array();
		var itemId = recOrder.getLineItemValue('item', 'item', i);
		var activationKey = '';
		var itemType = recOrder.getLineItemValue('item', 'itemtype', i);
		var amount = formatAmount(recOrder.getLineItemValue('item', 'amount', i));
		
		var itemProperties = getItemProperties(itemId);
		var itemOptionId = '';
		var prodItemFamily = '';
		var acrId = '';
		if (itemProperties != null) {
			acrId = itemProperties['custitemr7itemacrproducttype'];

			if (acrId != null && acrId != '') {
				itemOptionId = arrProductTypes[acrId]['optionid'];
				prodItemFamily = arrProductTypes[acrId]['itemfamily'];
				activationKey = recOrder.getLineItemValue('item', itemOptionId, i);
			}

			var itemFamilies = itemProperties['custitemr7itemfamily'];
			if (itemFamilies != '') {
				itemFamilies = itemFamilies.split(",");
			}
		}
		
		lineItem['acrId'] = acrId;
		lineItem['itemType'] = itemType;
		lineItem['itemProperties'] = itemProperties;
		lineItem['itemfamily'] = prodItemFamily;
		lineItem['activationKey'] = activationKey;
		lineItem['itemId'] = itemId;
		lineItem['lineId'] = recOrder.getLineItemValue('item', 'id', i);
		lineItem['quantity'] = recOrder.getLineItemValue('item', 'quantity', i);
		lineItem['rate'] = recOrder.getLineItemValue('item', 'rate', i);
		lineItem['amount'] = amount;
		lineItem['startdate'] = recOrder.getLineItemValue('item', 'custcolr7startdate', i);
		lineItem['enddate'] = recOrder.getLineItemValue('item', 'custcolr7enddate', i);
		lineItems[lineItems.length] = lineItem;
		
		if ((itemType == 'Subtotal' || itemType == 'Description' || itemType == 'Discount') && prevLine != null) {
			if (itemType == 'Subtotal' || itemType == 'Description') {
				lineItem['amount'] = 0;
			}
			var prevGroupKey = '';
			for (var k = lineItems.length - 1; k >= 0; k--) {
				var currentKey = lineItems[k]['activationKey'];
				if (currentKey != null && currentKey != '') {
					prevGroupKey = currentKey;
					break;
				}
				
			}
			activationKey = prevGroupKey;
			lineItem['activationKey'] = activationKey;
			lineItems[lineItems.length-1] = lineItem;
			if (itemType == 'Subtotal' || (itemType == 'Discount' && prevLine['itemType'] == 'Subtotal')) {
				var objIncludedKeys = new Object();
				objIncludedKeys['grouptotal'] = 0;
				var startPoint = (itemType == 'Discount') ? lineItems.length - 3 : lineItems.length - 2;
				for (var k = startPoint; k >= 0; k--) {
					var currentType = lineItems[k]['itemType'];
					if (currentType == 'Subtotal') {
						break;
					}
					var currentAmount = lineItems[k]['amount'];
					if (objIncludedKeys.hasOwnProperty(lineItems[k]['activationKey'])) {
						objIncludedKeys[lineItems[k]['activationKey']] += currentAmount;
					}
					else {
						objIncludedKeys[lineItems[k]['activationKey']] = currentAmount;
					}
					objIncludedKeys['grouptotal'] += currentAmount;
				}
				
				for (var currentKey in objIncludedKeys) {
					if (currentKey == 'grouptotal') {
						continue;
					}
					
					if (itemType == 'Subtotal' || (lineItem['rate']!=null && (" "+lineItem['rate']).indexOf('%') != -1)) {//percent discount
						objGroups = addToGroup(objGroups, currentKey, lineItem);
					}
					else 
						if (objGroups.hasOwnProperty(currentKey)) { //dollar discount.... needs proration
							var currentRatio = objIncludedKeys[currentKey] / objIncludedKeys['grouptotal'];
							var proratedAmount = Math.round(currentRatio * amount * 100) / 100;
							
							objGroups = addToGroup(objGroups, currentKey, lineItem, proratedAmount);
						}
				}
			} else {
				objGroups = addToGroup(objGroups, activationKey, lineItem);
			} 
		}
		else {
			objGroups = addToGroup(objGroups, activationKey, lineItem);
		}

		prevLine = lineItem;
	}
	return new Array(lineItems, objGroups);
}

function addToGroup(objGroups, activationKey, lineItem, memberAmount){

	if (activationKey != null && activationKey != '') {
		var group = new r7_group();
		
		var startDate = lineItem['startdate'];
		var endDate = lineItem['enddate'];
		var amount = lineItem['amount'];
		var lineId = lineItem['lineId'];
		var acrId = lineItem['acrId'];
		var memberId = lineId;

		if (objGroups.hasOwnProperty(activationKey)) {
			group = objGroups[activationKey];
		}
		
		if ((startDate != null && startDate != '') && (group.start == '' || nlapiStringToDate(startDate) < nlapiStringToDate(group.start))) {
			group.start = startDate;
		}
		if ((endDate != null && endDate != '') && (group.end == '' || nlapiStringToDate(endDate) > nlapiStringToDate(group.end))) {
			group.end = endDate;
		}
		
		if (lineItem['rate']!=null && lineItem['itemType'] == 'Discount' && ((" "+lineItem['rate']).indexOf('%') != -1)) {//percent discount
			amount = group.total * (parseFloat(lineItem['rate'])/100);
		}
		
		if (memberAmount != null && memberAmount != ''){
			memberId += ':' + memberAmount;
			amount = memberAmount;
		}
		if (amount != null && amount != '') {
			group.total += amount;
		}
		
		if (group.acrId == null || group.acrId == ''){
			group.acrId = acrId;
		}
		group.key = activationKey;
		group.members[group.members.length] = memberId;
		objGroups[activationKey] = group;
	}
	
	return objGroups;
}

function formatAmount(amount){

	if (amount != null && amount != '') {
		return Math.round(parseFloat(amount) * 100) / 100;	
	}
	
	return 0;
}

function getACLItems(arrItems){

    var arrACLItems = new Array();
    if (arrItems != null) {
		for (var i = 0; i < arrItems.length; i++) {
			if (arrItems[i]['itemProperties'] == null){
				continue;
			}
			if (arrItems[i]['itemProperties']['custitemr7itemautocreatelicense'] == 'T') {
				arrACLItems[arrACLItems.length] = arrItems[i];
			}
		}
	}
    return arrACLItems;
}

function getAddOnItems(arrItems){

	var arrAddOnItems = new Array();
	
	for (var i = 0; arrItems != null && i < arrItems.length; i++) {
		if (arrItems[i]['itemProperties'] == null) {
			continue;
		}
		
		var strItemAddOns = arrItems[i]['itemProperties']['custitemr7acladdons'];
		if (strItemAddOns != null && strItemAddOns != '') {
			arrItems[i]['addOns'] = strItemAddOns;
			arrAddOnItems[arrAddOnItems.length] = arrItems[i];
		}
	}
	return arrAddOnItems;
}

function getItemProperties(itemId){

	var properties = new Array();
	properties[properties.length] = 'custitemr7itemautocreatelicense';
	properties[properties.length] = 'custitemr7itemdedicatedhosted';
	properties[properties.length] = 'custitemr7acladdons';
	properties[properties.length] = 'isinactive';
	properties[properties.length] = 'displayname';
	properties[properties.length] = 'custitemr7itemmslicensetype1';
	properties[properties.length] = 'custitemr7itemnxlicensetype';
	properties[properties.length] = 'issueproduct';
	properties[properties.length] = 'custitemr7itemactivationemailtemplate';
	properties[properties.length] = 'custitemr7itemfamily';
	properties[properties.length] = 'custitemr7itemdefaultterm';
	properties[properties.length] = 'custitemr7itemrequireeventregistration';
	properties[properties.length] = 'custitemr7itemcategory';
	properties[properties.length] = 'custitemr7itemdefaulteventmaster';
	properties[properties.length] = 'custitemr7itemacrproducttype';
	
	return nlapiLookupField('item', itemId, properties);
	
}