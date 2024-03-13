/*
 * @author efagone
 */

// https://system.netsuite.com/app/site/hosting/scriptlet.nl?script=449&deploy=1&custparam_orderid=114773

function reviewAssociations(request, response){

	if (request.getMethod() == 'GET') {
		var orderType = request.getParameter('custparam_ordertype');
		var orderId = request.getParameter('custparam_orderid');
		if (orderId == null || orderId == '') {
			throw nlapiCreateError('MISSING PARAM', 'This suitelet requires a valid custparam_orderid parameter', true);
		}
		var recOrder = nlapiLoadRecord(orderType, orderId);
		var orderURL = nlapiResolveURL('RECORD', orderType, orderId, 'view');
		var orderNum = recOrder.getFieldValue('tranid');
		var customerId = recOrder.getFieldValue('entity');
		var currentWorkflowId = recOrder.getFieldValue('custbodyr7accountmanagementworkflow');
		
		form = new nlapiCreateForm('Item Associations', true);
		
		form.setScript('customscriptr7itemassociationcspagescrip');

		//some fields zannah wants on here:
		
		var customerFieldsToLookup = ['custentityr7accountmanager', 'contact'];
		var customerFields = nlapiLookupField('customer', customerId, customerFieldsToLookup, 'text');
		var customerFieldsID = nlapiLookupField('customer', customerId, customerFieldsToLookup);
		
		var fldCustomerName = form.addField('custpage_companyname', 'text', 'Customer').setDisplayType('inline');
		fldCustomerName.setDefaultValue(recOrder.getFieldText('entity'));
		fldCustomerName.setLayoutType('normal', 'startcol');
		
		var fldOrderNumber = form.addField('custpage_ordernumber', 'text', 'Sales Order').setDisplayType('inline');
		fldOrderNumber.setDefaultValue('<a href="' + orderURL + '" target="_blank">' + orderNum + '</a>');
		
		var fldOrderAmount = form.addField('custpage_orderamount', 'currency', 'Amount').setDisplayType('inline');
		fldOrderAmount.setDefaultValue(recOrder.getFieldValue('total'));
		
		var fldOrderEndDate = form.addField('custpage_orderenddate', 'date', 'End Date').setDisplayType('inline');
		fldOrderEndDate.setDefaultValue(recOrder.getFieldValue('enddate'));
		
		var fldAccountManager = form.addField('custpage_accountmanager', 'text', 'Account Manager').setDisplayType('inline');
		fldAccountManager.setDefaultValue(customerFields.custentityr7accountmanager);
		
		var fldCustomerPrimContactDef = form.addField('custpage_primcontact_default', 'checkbox').setDisplayType('hidden');
		fldCustomerPrimContactDef.setDefaultValue('F');
		
		var fldCustomerPrimContact = form.addField('custpage_primcontact', 'select', 'Primary Contact');
		fldCustomerPrimContact.addSelectOption('', '');
		sourceContacts(customerId, fldCustomerPrimContact);
		
		if (customerFieldsID.contact != '' && customerFieldsID.contact != null) {
			fldCustomerPrimContact.setDefaultValue(customerFieldsID.contact);
			fldCustomerPrimContact.setDisplayType('inline');
			fldCustomerPrimContactDef.setDefaultValue('T');
		}
		else {
			fldCustomerPrimContact.setMandatory(true);
		}
		//end
		
		var fldOpportunity = form.addField('custpage_opportunity', 'select', 'Opportunity');
		fldOpportunity.setDisplaySize(250);
		fldOpportunity.setLayoutType('normal', 'startcol');
		sourceOpportunities(customerId, fldOpportunity);
		var fldAMWorkflow = form.addField('custpage_workflow', 'select', 'Account Management Workflow');
		fldAMWorkflow.setDisplaySize(250);
		fldAMWorkflow.setMandatory(true);
		
		sourceWorkflows(fldAMWorkflow);
		
		if (currentWorkflowId != '' && currentWorkflowId != null) {
			fldAMWorkflow.setDefaultValue(currentWorkflowId);
		}
		else {
			fldAMWorkflow.setDefaultValue('1');
		}
		
		var fldOrderId = form.addField('custpage_orderid', 'text').setDisplayType('hidden');
		fldOrderId.setDefaultValue(orderId);
		var fldOrderType = form.addField('custpage_ordertype', 'text').setDisplayType('hidden');
		fldOrderType.setDefaultValue(orderType);
		
		AddOnList = form.addSubList('custpage_addonitems', 'list', 'Add-On Items');
		AddOnList.addField('custpage_orderid', 'text').setDisplayType('hidden');
		AddOnList.addField('custpage_itemid', 'text').setDisplayType('hidden');
		AddOnList.addField('custpage_itemfamily', 'text').setDisplayType('hidden');
		AddOnList.addField('custpage_lineid', 'text').setDisplayType('hidden');
		AddOnList.addField('custpage_addoncomponents', 'text').setDisplayType('hidden');
		AddOnList.addField('custpage_quantity', 'float', 'Quantity');
		AddOnList.addField('custpage_itemtext', 'text', 'Item');
		AddOnList.addField('custpage_itemdescription', 'textarea', 'Description');
		var fldACLSelect = AddOnList.addField('custpage_license_acl', 'select', 'License/ACL');
		fldACLSelect.setDisplaySize(260);
		fldACLSelect.addSelectOption('', '');
		fldACLSelect.setMandatory(true);
		
		ACLList = form.addSubList('custpage_aclitems', 'list', 'ACL Items');
		ACLList.addField('custpage_orderid_acl', 'text').setDisplayType('hidden');
		ACLList.addField('custpage_customerid_acl', 'text').setDisplayType('hidden');
		ACLList.addField('custpage_itemid_acl', 'text').setDisplayType('hidden');
		ACLList.addField('custpage_lineid_acl', 'text').setDisplayType('hidden');
		ACLList.addField('custpage_quantity_acl', 'float', 'Quantity');
		ACLList.addField('custpage_itemtext_acl', 'text', 'Item');
		ACLList.addField('custpage_itemdescription_acl', 'textarea', 'Description');
		var fldACLSelectExisting = ACLList.addField('custpage_license_aclexisting', 'select', 'Existing License');
		fldACLSelectExisting.setDisplaySize(260);
		fldACLSelectExisting.addSelectOption('', '');
		fldACLSelectExisting.setMandatory(true);
		
		var fldContact = ACLList.addField('custpage_contact_acl', 'select', 'Contact');
		fldContact.setMandatory(true);
		fldContact.setDisplaySize(260);
		fldContact.addSelectOption('', '');
		sourceContacts(customerId, fldContact);
		
		var arrItems = getItemsFromOrder(recOrder);
		var arrACLItems = getACLItems(arrItems);
		var arrAllAddOnItems = getAddOnItems(arrItems);
		var arrAddOnItems = arrAllAddOnItems[0];
		
		sourceACLSelect(customerId, fldACLSelect, arrACLItems);
		sourceACLSelectExisting(customerId, fldACLSelectExisting);
		
		var selectOptionsNXACL = fldACLSelect.getSelectOptions('NXL', 'startswith');
		var selectOptionsMSACL = fldACLSelect.getSelectOptions('MSL', 'startswith');
		
		var selectOptionsNXACLExisting = fldACLSelectExisting.getSelectOptions('NXL', 'startswith');
		var selectOptionsMSACLExisting = fldACLSelectExisting.getSelectOptions('MSL', 'startswith');
		
		//build sublist of add-ons
		var currentLineCountAddon = 1;
		for (var i = 0; arrAddOnItems != null && i < arrAddOnItems.length; i++) {
			var listItem = arrAddOnItems[i];
			var itemProperties = listItem['itemProperties'];
			var product = itemProperties['issueproduct'];
			
			if (listItem['licenseId'] == '' || listItem['licenseId'] == null || listItem['productKey'] == '' || listItem['productKey'] == null) {
			
				var description = listItem['description'];
				if (description != null && description.length > 60) {
					description = description.substr(0, 60);
				}
				
				if (product == 1) {
					listItem['productline'] = 'nexpose';
				}
				else 
					if (product == 10 || product == 11) {
						listItem['productline'] = 'metasploit';
					}
				
				AddOnList.setLineItemValue('custpage_orderid', currentLineCountAddon, orderId);
				AddOnList.setLineItemValue('custpage_itemid', currentLineCountAddon, listItem['itemId']);
				AddOnList.setLineItemValue('custpage_itemfamily', currentLineCountAddon, itemProperties['custitemr7itemfamily']);
				AddOnList.setLineItemValue('custpage_lineid', currentLineCountAddon, listItem['lineId']);
				AddOnList.setLineItemValue('custpage_addoncomponents', currentLineCountAddon, listItem['addOns']);
				AddOnList.setLineItemValue('custpage_quantity', currentLineCountAddon, parseInt(listItem['quantity']));
				AddOnList.setLineItemValue('custpage_itemtext', currentLineCountAddon, itemProperties['displayname']);
				AddOnList.setLineItemValue('custpage_itemdescription', currentLineCountAddon, description);
				if (listItem['currentParentACL'] != '' && listItem['currentParentACL'] != null) {
					AddOnList.setLineItemValue('custpage_license_acl', currentLineCountAddon, listItem['currentParentACL']);
				}
				else 
					if (listItem['productline'] == 'nexpose' && selectOptionsNXACL != null && selectOptionsNXACL.length == 1) {
						AddOnList.setLineItemValue('custpage_license_acl', currentLineCountAddon, selectOptionsNXACL[0].getId());
					}
					else 
						if (listItem['productline'] == 'metasploit' && selectOptionsNXACL != null && selectOptionsNXACL.length == 1) {
							AddOnList.setLineItemValue('custpage_license_acl', currentLineCountAddon, selectOptionsMSACL[0].getId());
						}
				currentLineCountAddon++;
			}
		}
		
		//build sublist of ACLs
		var currentLineCountACL = 1;
		for (var i = 0; arrACLItems != null && i < arrACLItems.length; i++) {
			var listItem = arrACLItems[i];
			var itemProperties = listItem['itemProperties'];
			var product = itemProperties['issueproduct'];
			
			if (listItem['licenseId'] == '' || listItem['licenseId'] == null || listItem['productKey'] == '' || listItem['productKey'] == null) {
			
				var description = listItem['description'];
				if (description != null && description.length > 60) {
					description = description.substr(0, 60);
				}
				
				if (product == 1) {
					listItem['productline'] = 'nexpose';
				}
				else 
					if (product == 10 || product == 11) {
						listItem['productline'] = 'metasploit';
					}
				
				ACLList.setLineItemValue('custpage_orderid_acl', currentLineCountACL, orderId);
				ACLList.setLineItemValue('custpage_customerid_acl', currentLineCountACL, customerId);
				ACLList.setLineItemValue('custpage_itemid_acl', currentLineCountACL, listItem['itemId']);
				ACLList.setLineItemValue('custpage_lineid_acl', currentLineCountACL, listItem['lineId']);
				ACLList.setLineItemValue('custpage_quantity_acl', currentLineCountACL, parseInt(listItem['quantity']));
				ACLList.setLineItemValue('custpage_itemtext_acl', currentLineCountACL, itemProperties['displayname']);
				ACLList.setLineItemValue('custpage_itemdescription_acl', currentLineCountACL, description);
				
				if (listItem['contact'] != '' && listItem['contact'] != null) {
					ACLList.setLineItemValue('custpage_contact_acl', currentLineCountACL, listItem['contact']);
				}
				else {
					ACLList.setLineItemValue('custpage_contact_acl', currentLineCountACL, nlapiLookupField('customer', customerId, 'contact'));
				}
				
				if (listItem['productKey'] != '' && listItem['productKey'] != null) {
					ACLList.setLineItemValue('custpage_license_aclexisting', currentLineCountACL, listItem['productKey']);
				}
				else 
					if (listItem['productline'] == 'nexpose' && selectOptionsNXACLExisting != null && selectOptionsNXACLExisting.length == 1) {
						ACLList.setLineItemValue('custpage_license_aclexisting', currentLineCountACL, selectOptionsNXACLExisting[0].getId());
					}
					else 
						if (listItem['productline'] == 'metasploit' && selectOptionsMSACLExisting != null && selectOptionsMSACLExisting.length == 1) {
							ACLList.setLineItemValue('custpage_license_aclexisting', currentLineCountACL, selectOptionsMSACLExisting[0].getId());
						}
				currentLineCountACL++;
			}
		}
		
		form.addSubmitButton('Renew Salesorder');
		
		response.writePage(form);
		
	}
	
	if (request.getMethod() == 'POST') {
		this.orderId = request.getParameter('custpage_orderid');
		this.orderType = request.getParameter('custpage_ordertype');
		var opportunityId = request.getParameter('custpage_opportunity');
		var workflowId = request.getParameter('custpage_workflow');
		var recOrder = nlapiLoadRecord(this.orderType, this.orderId);
		var customerId = recOrder.getFieldValue('entity');
		var primaryContact = request.getParameter('custpage_primcontact');
		var primaryContactDefault = request.getParameter('custpage_primcontact_default');
		
		if (primaryContactDefault == 'F') {
			nlapiSubmitField('customer', customerId, 'contact', primaryContact);
		}
		
		if (recOrder.getRecordType() == 'salesorder' && recOrder.getFieldValue('status') != 'Pending Approval') {
			var updateOrderDates = false;
		}
		else {
			var updateOrderDates = true;
		}
		
		var dateToday = new Date();
		var strToday = nlapiDateToString(dateToday);
		
		this.arrParentEndDates = new Array();
		this.arrParentStartDates = new Array();
		this.currentFollowerCount = 1; //used to keep track of newrentech/newrensub dates
		//map items by lineID
		var orderLineCount = recOrder.getLineItemCount('item');
		this.itemLineNums = new Array();
		for (var i = 1; i <= orderLineCount; i++) {
			var lineId = recOrder.getLineItemValue('item', 'id', i);
			itemLineNums[lineId] = i;
		}
		
		//break out items
		var arrItems = getItemsFromOrder(recOrder);
		var arrACLItems = getACLItems(arrItems);
		
		//set contacts and pks
		var ACLLineCount = request.getLineItemCount('custpage_aclitems');
		for (var k = 1; k <= ACLLineCount; k++) {
			var itemId = request.getLineItemValue('custpage_aclitems', 'custpage_itemid_acl', k);
			var lineId = request.getLineItemValue('custpage_aclitems', 'custpage_lineid_acl', k);
			var contactId = request.getLineItemValue('custpage_aclitems', 'custpage_contact_acl', k);
			var existingKey = request.getLineItemValue('custpage_aclitems', 'custpage_license_aclexisting', k);
			var lineNum = itemLineNums[lineId];
			
			if (contactId != '' && contactId != null) {
				recOrder.setLineItemValue('item', 'custcolr7translinecontact', lineNum, contactId);
			}
			if (existingKey != '' && existingKey != null) {
				recOrder.setLineItemValue('item', 'custcolr7itemmsproductkey', lineNum, existingKey);
			}
		}
		
		//process ACL items
		for (var i = 0; arrACLItems != null && i < arrACLItems.length; i++) {
			var aclItem = arrACLItems[i];
			var lineId = aclItem['lineId'];
			var itemId = aclItem['itemId'];
			var licenseId = aclItem['licenseId'];
			var lineNum = itemLineNums[lineId];
			var productKey = recOrder.getLineItemValue('item', 'custcolr7itemmsproductkey', lineNum);
			
			if (licenseId == null || licenseId == '') {
			
				if (productKey == '' || productKey == null || productKey.substr(0, 4) == 'PEND') {
					recOrder.setLineItemValue('item', 'custcolr7itemmsproductkey', lineNum, 'PEND:' + lineId);
				}
				
				if (updateOrderDates) {
					recOrder = processLineItemDates(recOrder, lineNum);
				}
			}
		}
		
		//process AddOn Item Associations
		var addOnLineCount = request.getLineItemCount('custpage_addonitems');
		for (var j = 1; j <= addOnLineCount; j++) {
			var itemId = request.getLineItemValue('custpage_addonitems', 'custpage_itemid', j);
			var lineId = request.getLineItemValue('custpage_addonitems', 'custpage_lineid', j);
			var parentACLId = request.getLineItemValue('custpage_addonitems', 'custpage_license_acl', j);
			var lineNum = itemLineNums[lineId];
			
			if (parentACLId != null && parentACLId != '') {
				if (parentACLId.substr(0, 3) == 'PK:') {
					recOrder.setLineItemValue('item', 'custcolr7itemmsproductkey', lineNum, parentACLId.substr(3));
				}
				else {
					recOrder.setLineItemValue('item', 'custcolr7itemmsproductkey', lineNum, 'PEND:' + parentACLId);
				}
				
				if (updateOrderDates) {
					recOrder = processLineItemDates(recOrder, lineNum);
				}
			}
		}
		recOrder.setFieldValue('custbodyr7accountmanagementworkflow', workflowId);
		
		var salesRepInactive = nlapiLookupField('employee', recOrder.getFieldValue('salesrep'), 'isinactive');
		var salesRepId = recOrder.getFieldValue('salesrep');
		var exitScript = false;
		if (salesRepInactive == 'T') {
		
			try {
				activateEmployee(salesRepId);
				try {
					var updatedOrderId = nlapiSubmitRecord(recOrder);
				} 
				catch (e) {
					inactivateEmployee(salesRepId);
					exitScript = true;
					throw nlapiCreateError('ERROR', e);
				}
				inactivateEmployee(salesRepId);
			} 
			catch (e) {
				nlapiLogExecution('ERROR', 'Error on activating/inactivating employee', e);
				var emailText = 'Error while activating/inactivating  the following employee: ' + recOrder.getFieldText('salesrep') +
				' <a href="https://system.netsuite.com/app/common/entity/entity.nl?id=' +
				salesRepId +
				'"> employee </a>' +
				'\n\n\n<br> Please investigate.\n\nThanks\nNetsuite'
				
				nlapiSendEmail(2, 2, 'Error on activating/inactivating employee', emailText, 'errol_fagone@rapid7.com');
			}
		}
		else {
			var updatedOrderId = nlapiSubmitRecord(recOrder);
		}
		
		if (!exitScript) {
			var createdOppIds = createRenewalOpportunityForSalesOrder(recOrder.getId(), opportunityId);
			if (opportunityId != null && opportunityId != '' && createdOppIds != null) {
				var moveToRenewal = createdOppIds[0];
				moveQuotes(opportunityId, moveToRenewal);
				moveTasks(opportunityId, moveToRenewal);
				
				var originalOppAmount = nlapiLookupField('opportunity', opportunityId, 'projectedtotal');
				var newOppsTotal = 0;
				var newOppCount = 0
				for (var i = 0; i < createdOppIds.length; i++) {
					var newOppAmount = nlapiLookupField('opportunity', createdOppIds[i], 'projectedtotal');
					newOppsTotal = parseFloat(newOppsTotal) + parseFloat(newOppAmount);
					newOppCount++
				}
				
				var oppDifference = parseFloat(originalOppAmount) - parseFloat(newOppsTotal);
				if (Math.abs(oppDifference) < 11) {
					nlapiDeleteRecord('opportunity', opportunityId);
					nlapiSendEmail(55011, 149990, 'Opp automatically deleted', 'Old Opp InternalId: ' + opportunityId + '\nOriginal Opp Amount: ' + originalOppAmount + '\nTotal of ' + newOppCount + ' new opp(s): ' + newOppsTotal, 'errol_fagone@rapid7.com');
					
					var goToURL = "https://system.netsuite.com/app/common/search/searchresults.nl?searchtype=Opprtnty&searchid=10264&CU_Entity_ENTITYIDtype=STARTSWITH&CU_Entity_INTERNALID=" + customerId;
					response.writeLine("<html><body onload='goToRenewal()'><script language='Javascript'>function goToRenewal(){window.location=\"" + goToURL + "\";}</script></body></html>");
				}
				else {
					var goToURL = "https://system.netsuite.com/app/common/search/searchresults.nl?searchtype=Opprtnty&searchid=10264&CU_Entity_ENTITYIDtype=STARTSWITH&CU_Entity_INTERNALID=" + customerId;
					var origRenewalURL = "https://system.netsuite.com/app/accounting/transactions/opprtnty.nl?id=" + opportunityId;
					response.writeLine("<html><body onload='goToRenewal()'><script language='Javascript'>function goToRenewal(){window.open('" + origRenewalURL + "'); window.location=\"" + goToURL + "\";}</script></body></html>");
				}
			}
			else {
				var goToURL = "https://system.netsuite.com/app/common/search/searchresults.nl?searchtype=Opprtnty&searchid=10264&CU_Entity_ENTITYIDtype=STARTSWITH&CU_Entity_INTERNALID=" + customerId;
				response.writeLine("<html><body onload='goToRenewal()'><script language='Javascript'>function goToRenewal(){window.location=\"" + goToURL + "\";}</script></body></html>");
			}
		}
	}
	
}

function moveQuotes(opportunityId, moveToRenewal){
	
	var arrSearchFilters = new Array();
	arrSearchFilters[0] = new nlobjSearchFilter('mainline', null, 'is', 'T');
	arrSearchFilters[1] = new nlobjSearchFilter('opportunity', null, 'is', opportunityId);
	
	var arrSearchResults = nlapiSearchRecord('estimate', null, arrSearchFilters);
	
	for (var i=0; arrSearchResults != null && i < arrSearchResults.length; i++){
		
		var searchResult = arrSearchResults[i];
		var quoteId = searchResult.getId();
		nlapiSubmitField('estimate', quoteId, 'opportunity', moveToRenewal)
	}
	
}

function moveTasks(opportunityId, moveToRenewal){
	
	var arrSearchFilters = new Array();
	arrSearchFilters[0] = new nlobjSearchFilter('formulatext', null, 'is', opportunityId);
	arrSearchFilters[0].setFormula('{opportunity.internalid}');
	
	var arrSearchResults = nlapiSearchRecord('task', null, arrSearchFilters);
	
	for (var i=0; arrSearchResults != null && i < arrSearchResults.length; i++){
		
		var searchResult = arrSearchResults[i];
		var taskId = searchResult.getId();
		nlapiSubmitField('task', taskId, 'transaction', moveToRenewal)
	}
	
}

function sourceACLSelectExisting(customerId, fldACLSelect){
		
	//all current NX licenses
	var arrNXSearchFilters = new Array();
	arrNXSearchFilters[0] = new nlobjSearchFilter('custrecordr7nxlicensecustomer', null, 'is', customerId);
	arrNXSearchFilters[1] = new nlobjSearchFilter('custrecordr7nxordertype', null, 'is', 1);  
	//arrNXSearchFilters[2] = new nlobjSearchFilter('custrecordr7nxlicenseexpirationdate', null, 'onorafter', 'monthsago01');  
		
	var arrNXSearchColumns = new Array();
	arrNXSearchColumns[0] = new nlobjSearchColumn('custrecordr7nxproductkey');
	arrNXSearchColumns[1] = new nlobjSearchColumn('formulatext');
	arrNXSearchColumns[1].setFormula('to_char({custrecordr7nxlicenseexpirationdate},\'MON YYYY\')');
	arrNXSearchColumns[2] = new nlobjSearchColumn('internalid').setSort(true);
	arrNXSearchColumns[3] = new nlobjSearchColumn('custrecordcustrecordr7nxlicenseitemfamil');
	
	var arrNXSearchResults = nlapiSearchRecord('customrecordr7nexposelicensing', null, arrNXSearchFilters, arrNXSearchColumns);
	
	for (var i = 0; arrNXSearchResults != null && i < arrNXSearchResults.length; i++) {
		
		var searchResult = arrNXSearchResults[i];
		var nxLicenseId = searchResult.getId();
		var productKey = searchResult.getValue(arrNXSearchColumns[0]);
		var dateExpired = searchResult.getValue(arrNXSearchColumns[1]);
		var itemFamily = searchResult.getText(arrNXSearchColumns[3]);
		if (itemFamily != null && itemFamily != ''){
			itemFamily = itemFamily + ': ';
		}
		var optionText = 'NXL: ' + productKey.substr(0,9) + ' (' + itemFamily + dateExpired + ')';
		
		fldACLSelect.addSelectOption(productKey, optionText);
	}
	
	//all current MS licenses
	var arrMSSearchFilters = new Array();
	arrMSSearchFilters[0] = new nlobjSearchFilter('custrecordr7mslicensecustomer', null, 'is', customerId);
	arrMSSearchFilters[1] = new nlobjSearchFilter('custrecordr7msordertype', null, 'anyof', new Array(1,2));  
	//arrMSSearchFilters[2] = new nlobjSearchFilter('custrecordr7mslicenseexpirationdate', null, 'onorafter', 'monthsago01');  
		
	var arrMSSearchColumns = new Array();
	arrMSSearchColumns[0] = new nlobjSearchColumn('custrecordr7msproductkey');
	arrMSSearchColumns[1] = new nlobjSearchColumn('formulatext');
	arrMSSearchColumns[1].setFormula('to_char({custrecordr7mslicenseexpirationdate},\'MON YYYY\')');
	arrMSSearchColumns[2] = new nlobjSearchColumn('internalid').setSort(true);
	arrMSSearchColumns[3] = new nlobjSearchColumn('custrecordr7mslicenseitemfamily');
	
	var arrMSSearchResults = nlapiSearchRecord('customrecordr7metasploitlicensing', null, arrMSSearchFilters, arrMSSearchColumns);
		
	for (var i = 0; arrMSSearchResults != null && i < arrMSSearchResults.length; i++) {
		
		var searchResult = arrMSSearchResults[i];
		var msLicenseId = searchResult.getId();
		var productKey = searchResult.getValue(arrMSSearchColumns[0]);
		var dateExpired = searchResult.getValue(arrMSSearchColumns[1]);
		var itemFamily = searchResult.getText(arrMSSearchColumns[3]);
		if (itemFamily != null && itemFamily != ''){
			itemFamily = itemFamily + ': ';
		}
		
		var optionText = 'MSL: ' + productKey.substr(0,9) + ' (' + itemFamily + dateExpired + ')';
		
		fldACLSelect.addSelectOption(productKey, optionText);
	}
	
}


function sourceACLSelect(customerId, fldACLSelect, arrACLItems){
	
	//all current NX licenses
	var arrNXSearchFilters = new Array();
	arrNXSearchFilters[0] = new nlobjSearchFilter('custrecordr7nxlicensecustomer', null, 'is', customerId);
	arrNXSearchFilters[1] = new nlobjSearchFilter('custrecordr7nxordertype', null, 'is', 1);  
	//arrNXSearchFilters[2] = new nlobjSearchFilter('custrecordr7nxlicenseexpirationdate', null, 'onorafter', 'monthsago01');  
		
	var arrNXSearchColumns = new Array();
	arrNXSearchColumns[0] = new nlobjSearchColumn('custrecordr7nxproductkey');
	arrNXSearchColumns[1] = new nlobjSearchColumn('formulatext');
	arrNXSearchColumns[1].setFormula('to_char({custrecordr7nxlicenseexpirationdate},\'MON YYYY\')');
	arrNXSearchColumns[2] = new nlobjSearchColumn('internalid').setSort(true);
	arrNXSearchColumns[3] = new nlobjSearchColumn('custrecordcustrecordr7nxlicenseitemfamil');
	
	var arrNXSearchResults = nlapiSearchRecord('customrecordr7nexposelicensing', null, arrNXSearchFilters, arrNXSearchColumns);
	
	for (var i = 0; arrNXSearchResults != null && i < arrNXSearchResults.length; i++) {
		
		var searchResult = arrNXSearchResults[i];
		var nxLicenseId = searchResult.getId();
		var productKey = searchResult.getValue(arrNXSearchColumns[0]);
		var dateExpired = searchResult.getValue(arrNXSearchColumns[1]);
		var itemFamily = searchResult.getText(arrNXSearchColumns[3]);
		if (itemFamily != null && itemFamily != ''){
			itemFamily = itemFamily + ': ';
		}
		var optionText = 'NXL: ' + productKey.substr(0,9) + ' (' + itemFamily + dateExpired + ')';
		
		fldACLSelect.addSelectOption('PK:' + productKey, optionText);
	}
	
	//all current MS licenses
	var arrMSSearchFilters = new Array();
	arrMSSearchFilters[0] = new nlobjSearchFilter('custrecordr7mslicensecustomer', null, 'is', customerId);
	arrMSSearchFilters[1] = new nlobjSearchFilter('custrecordr7msordertype', null, 'anyof', new Array(1,2));  
	//arrMSSearchFilters[2] = new nlobjSearchFilter('custrecordr7mslicenseexpirationdate', null, 'onorafter', 'monthsago01');  
		
	var arrMSSearchColumns = new Array();
	arrMSSearchColumns[0] = new nlobjSearchColumn('custrecordr7msproductkey');
	arrMSSearchColumns[1] = new nlobjSearchColumn('formulatext');
	arrMSSearchColumns[1].setFormula('to_char({custrecordr7mslicenseexpirationdate},\'MON YYYY\')');
	arrMSSearchColumns[2] = new nlobjSearchColumn('internalid').setSort(true);
	arrMSSearchColumns[3] = new nlobjSearchColumn('custrecordr7mslicenseitemfamily');
	
	var arrMSSearchResults = nlapiSearchRecord('customrecordr7metasploitlicensing', null, arrMSSearchFilters, arrMSSearchColumns);
		
	for (var i = 0; arrMSSearchResults != null && i < arrMSSearchResults.length; i++) {
		
		var searchResult = arrMSSearchResults[i];
		var msLicenseId = searchResult.getId();
		var productKey = searchResult.getValue(arrMSSearchColumns[0]);
		var dateExpired = searchResult.getValue(arrMSSearchColumns[1]);
		var itemFamily = searchResult.getText(arrMSSearchColumns[3]);
		if (itemFamily != null && itemFamily != ''){
			itemFamily = itemFamily + ': ';
		}
		var optionText = 'MSL: ' + productKey.substr(0,9) + ' (' + itemFamily + dateExpired + ')';
		
		fldACLSelect.addSelectOption('PK:' + productKey, optionText);
	}
	
}

function sourceContacts(customerId, fldContact){
		
	var arrSearchFilters = new Array();
	arrSearchFilters[0] = new nlobjSearchFilter('company', null, 'is', customerId);
	arrSearchFilters[1] = new nlobjSearchFilter('email', null, 'isnotempty');
	arrSearchFilters[2] = new nlobjSearchFilter('isinactive', null, 'is', 'F');
	
	var arrSearchColumns = new Array();
	arrSearchColumns[0] = new nlobjSearchColumn('entityid');
	arrSearchColumns[1] = new nlobjSearchColumn('email');
	
	var arrSearchResults = nlapiSearchRecord('contact', null, arrSearchFilters, arrSearchColumns);
	
	for (var i = 0; arrSearchResults != null && i < arrSearchResults.length; i++) {
		
		var searchResult = arrSearchResults[i];
		var contactId = searchResult.getId();
		var contactName = searchResult.getValue(arrSearchColumns[0]);
	
		fldContact.addSelectOption(contactId, contactName);
	
	}
	
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

function sourceOpportunities(customerId, fldOpportunity){
	
	fldOpportunity.addSelectOption('', '');
	
	var arrSearchFilters = new Array();
	arrSearchFilters[0] = new nlobjSearchFilter('entity', null, 'is', customerId);
		
	var arrSearchColumns = new Array();
	arrSearchColumns[0] = new nlobjSearchColumn('tranid').setSort(true);
	arrSearchColumns[1] = new nlobjSearchColumn('title');
	arrSearchColumns[2] = new nlobjSearchColumn('entitystatus');
	arrSearchColumns[3] = new nlobjSearchColumn('expectedclosedate');
	
	var arrSearchResults = nlapiSearchRecord('opportunity', null, arrSearchFilters, arrSearchColumns);
	
	for (var i = 0; arrSearchResults != null && i < arrSearchResults.length; i++) {
		
		var searchResult = arrSearchResults[i];
		var oppId = searchResult.getId();
		var tranId = searchResult.getValue(arrSearchColumns[0]);
		var title = searchResult.getValue(arrSearchColumns[1]);
		
		var optionText = tranId + ': ' + title;
		
		fldOpportunity.addSelectOption(oppId, optionText);
	}
	
}

/*
 * @author efagone
 */


function createRenewalOpportunityForSalesOrder(salesOrderId, opportunityId){

		this.arrCreatedOppIds = new Array();
		
		var salesOrder = nlapiLoadRecord('salesorder', salesOrderId);
		
		this.licenseEndDates = new Array();
		
		var lineItems = getLineItemsFromSalesOrder(salesOrder);
		
		var individualTypeItems = getTypeItems(lineItems, 3);
		var primaryTypeItems = getTypeItems(lineItems, 1);
		var upsellTypeItems = getTypeItems(lineItems, 2);
		
		var primaryItemGroups = getPrimaryTypeGroups(primaryTypeItems);
		
		//Looking up associated properties to set on the opportunity record
		
		var customerIid = salesOrder.getFieldValue('entity');
		
		var userProperties = new Array('location', 'department', 'custentityr7acctmanagerupsellcode');
		var associatedProperties = new Array('custentityr7accountmanager', 'custentityr7accountmanager.department', 'custentityr7accountmanager.location', 'custentityr7accountmanager.custentityr7acctmanagerupsellcode', 'salesrep', 'salesrep.department', 'salesrep.location', 'salesrep.custentityr7acctmanagerupsellcode');
		
		var lookedUpUserProperties = nlapiLookupField('employee', nlapiGetContext().getUser(), userProperties);
		var lookedUpAssociatedProperties = nlapiLookupField('customer', customerIid, associatedProperties);
		
		if (lookedUpAssociatedProperties['custentityr7accountmanager'] == null || lookedUpAssociatedProperties['custentityr7accountmanager'] == '') {
			lookedUpAssociatedProperties['custentityr7accountmanager'] = nlapiGetContext().getUser();
			lookedUpAssociatedProperties['custentityr7accountmanager.department'] = lookedUpUserProperties['department'];
			lookedUpAssociatedProperties['custentityr7accountmanager.location'] = lookedUpUserProperties['location'];
		}
		if (lookedUpAssociatedProperties['salesrep'] == null || lookedUpAssociatedProperties['salesrep'] == '') {
			lookedUpAssociatedProperties['salesrep'] = nlapiGetContext().getUser();
			lookedUpAssociatedProperties['salesrep.department'] = lookedUpUserProperties['department'];
			lookedUpAssociatedProperties['salesrep.location'] = lookedUpUserProperties['location'];
			lookedUpAssociatedProperties['salesrep.custentityr7acctmanagerupsellcode'] = lookedUpUserProperties['custentityr7acctmanagerupsellcode'];
			
			if (lookedUpAssociatedProperties['salesrep.custentityr7acctmanagerupsellcode'] == null || lookedUpAssociatedProperties['salesrep.custentityr7acctmanagerupsellcode'] == '') {
				lookedUpAssociatedProperties['salesrep.custentityr7acctmanagerupsellcode'] = 144312;
			}
		}
		
		var endDateOnSalesOrder = salesOrder.getFieldValue('enddate');
		var startYearOnOpp = '';
		if (endDateOnSalesOrder != null && endDateOnSalesOrder != '') {
			nlapiLogExecution('DEBUG', 'EndDateOnSalesOrder', endDateOnSalesOrder);
			endDateOnSalesOrderDate = nlapiStringToDate(endDateOnSalesOrder);
			startYearOnOpp = endDateOnSalesOrderDate.getFullYear();
		}
		
		nlapiLogExecution('DEBUG', 'Done looking up associated properties', 'yup');
		
		//Create Opportunities for individual types
		for (var i = 0; individualTypeItems != null && i < individualTypeItems.length; i++) {
		
			nlapiLogExecution('DEBUG', 'Creating individual Type Opportunity', i);
			var oppAssociatedProperties = new Array();
			
			var individualItems = new Array();
			individualItems[individualItems.length] = individualTypeItems[i];
			
			var dates = getDates(individualItems);
			if (dates['minStartDate'] != '' && dates['minStartDate'] != null) {
				var individualStartYear = nlapiStringToDate(dates['minStartDate']).getFullYear();
			}
			else {
				var individualStartYear = startYearOnOpp;
			}
			
			oppAssociatedProperties['entity'] = salesOrder.getFieldValue('entity');
			oppAssociatedProperties['salesrep'] = lookedUpAssociatedProperties['custentityr7accountmanager'];
			oppAssociatedProperties['department'] = lookedUpAssociatedProperties['custentityr7accountmanager.department'];
			oppAssociatedProperties['location'] = lookedUpAssociatedProperties['custentityr7accountmanager.location'];
			oppAssociatedProperties['partner'] = salesOrder.getFieldValue('partner');
			oppAssociatedProperties['custbodyr7partnerdealtype'] = salesOrder.getFieldValue('custbodyr7partnerdealtype');
			oppAssociatedProperties['custbodyr7billingresponsibleparty'] = salesOrder.getFieldValue('custbodyr7billingresponsibleparty');
			oppAssociatedProperties['title'] = "Renewal - " + individualStartYear;
			oppAssociatedProperties['status'] = 35;
			oppAssociatedProperties['leadsource'] = '67457';
			oppAssociatedProperties['expectedclosedate'] = dates['minStartDate'];
			
			createRenewalOpportunity(salesOrder, individualItems, 'Individual', oppAssociatedProperties, opportunityId);
		}
		
		//Create Renewal Opportunity for primaryTypeLineItems
		for (itemGroup in primaryItemGroups) {
			var primaryItems = primaryItemGroups[itemGroup];
			
			if (primaryItems != null && primaryItems.length > 0) {
			
				nlapiLogExecution('DEBUG', 'Creating Primary Type Opportunity', 'yup');
				var dates = getDates(primaryItems);
				
				if (dates['minStartDate'] != '' && dates['minStartDate'] != null) {
					var renewalStartYear = nlapiStringToDate(dates['minStartDate']).getFullYear();
				}
				else {
					var renewalStartYear = startYearOnOpp;
				}
				
				var oppAssociatedProperties = new Array();
				oppAssociatedProperties['entity'] = salesOrder.getFieldValue('entity');
				oppAssociatedProperties['salesrep'] = lookedUpAssociatedProperties['custentityr7accountmanager'];
				oppAssociatedProperties['department'] = lookedUpAssociatedProperties['custentityr7accountmanager.department'];
				oppAssociatedProperties['location'] = lookedUpAssociatedProperties['custentityr7accountmanager.location'];
				oppAssociatedProperties['partner'] = salesOrder.getFieldValue('partner');
				oppAssociatedProperties['custbodyr7partnerdealtype'] = salesOrder.getFieldValue('custbodyr7partnerdealtype');
				oppAssociatedProperties['custbodyr7billingresponsibleparty'] = salesOrder.getFieldValue('custbodyr7billingresponsibleparty');
				oppAssociatedProperties['title'] = "Renewal - " + renewalStartYear;
				oppAssociatedProperties['status'] = 35;
				oppAssociatedProperties['expectedclosedate'] = dates['expireDate'];
				oppAssociatedProperties['leadsource'] = 67457;
				
				var newOppId = createRenewalOpportunity(salesOrder, primaryItems, 'Primary', oppAssociatedProperties, opportunityId);
				//transformOpportunity(newOppId, dates);
			
			}
		}
		//Create Renewal Opportunity for upsellTypeLineItems
		if (upsellTypeItems != null && upsellTypeItems.length > 0) {
			nlapiLogExecution('DEBUG', 'Creating Upsell Type Opportunity', 'yup');
			
			var dates = getDates(upsellTypeItems);
			
			if (dates['minStartDate'] != '' && dates['minStartDate'] != null) {
				var upsellStartYear = nlapiStringToDate(dates['minStartDate']).getFullYear();
			}
			else {
				var upsellStartYear = startYearOnOpp;
			}
			
			var oppAssociatedProperties = new Array();
			oppAssociatedProperties['entity'] = salesOrder.getFieldValue('entity');
			oppAssociatedProperties['salesrep'] = lookedUpAssociatedProperties['salesrep'];
			oppAssociatedProperties['department'] = lookedUpAssociatedProperties['salesrep.department'];
			oppAssociatedProperties['location'] = lookedUpAssociatedProperties['salesrep.location'];
			oppAssociatedProperties['partner'] = salesOrder.getFieldValue('partner');
			oppAssociatedProperties['custbodyr7partnerdealtype'] = salesOrder.getFieldValue('custbodyr7partnerdealtype');
			oppAssociatedProperties['custbodyr7billingresponsibleparty'] = salesOrder.getFieldValue('custbodyr7billingresponsibleparty');
			oppAssociatedProperties['title'] = "Upsell - " + upsellStartYear;
			oppAssociatedProperties['status'] = 80;
			oppAssociatedProperties['expectedclosedate'] = dates['expireDate'];
			oppAssociatedProperties['leadsource'] = salesOrder.getFieldValue('leadsource');
			;
			
			createRenewalOpportunity(salesOrder, upsellTypeItems, 'Upsell', oppAssociatedProperties, opportunityId);
		}
		
		nlapiSubmitField('salesOrder', salesOrderId, 'custbodyr7renewaloppcreated', 'T');
		return arrCreatedOppIds;
		
	
}

/* @param lineItems to parse for individual type lineItems
 * 
 */
function getTypeItems(lineItems, type){

	var typeItems = new Array();
	
	for (var i = 0; lineItems != null && i < lineItems.length; i++) {
		var lineItem = lineItems[i];
		var lineItemRenewalProperties = lineItem['renewalProperties'];
		
		if (lineItemRenewalProperties['custitemr7itemrenewalgroup'] == type) {
			typeItems[typeItems.length] = lineItem;
		}
	}
	return typeItems;
}

function getPrimaryTypeGroups(primaryTypeItems){

	var primaryItemGroups = new Array();
	
	for (var i = 0; primaryTypeItems != null && i < primaryTypeItems.length; i++) {
	
		var currentItem = primaryTypeItems[i];
		var itemProductKey = currentItem['custcolr7itemmsproductkey'];
		var itemStartDate = currentItem['startDate'];
		
		if (itemStartDate != null && itemStartDate != '') {
			var dtItemStartDate = nlapiStringToDate(itemStartDate);
			var startYear = dtItemStartDate.getFullYear();
			var startMonth = dtItemStartDate.getMonth();
			var startYearMonth = startYear + '' + startMonth
		}
		else {
			var startYearMonth = '';
		}
		
		var currentGroup = 'GR' + startYearMonth;
		
		if (primaryItemGroups[currentGroup] != null && primaryItemGroups[currentGroup].length > 0) {
			var itemGroup = primaryItemGroups[currentGroup];
			itemGroup[itemGroup.length] = currentItem;
			primaryItemGroups[currentGroup] = itemGroup;
		}
		else {
			var itemGroup = new Array();
			itemGroup[itemGroup.length] = currentItem;
			primaryItemGroups[currentGroup] = itemGroup;
		}
	}
	
	return primaryItemGroups;
}

function getDates(lineItems){
	var minStartDate = '';
	var maxEndDate = '';
	var expectedClose = '';
	
	var dates = new Array();
	
	for (var i = 0; lineItems != null && i < lineItems.length; i++) {
		var lineItem = lineItems[i];

		if (lineItem['startDate'] != '' && lineItem['startDate'] != null) {
			var itemStartDate = nlapiStringToDate(lineItem['startDate']);
		}
		else {
			var itemStartDate = nlapiAddDays(nlapiStringToDate(lineItem['salesOrderEndDate']), 1);
		}
		
		if (lineItem['endDate'] != '' && lineItem['endDate'] != null) {
			var itemEndDate = nlapiStringToDate(lineItem['endDate']);
		}
		else {
			var itemEndDate = nlapiAddDays(nlapiAddMonths(nlapiStringToDate(lineItem['salesOrderEndDate']), 12), -1);
		}
		
		if (minStartDate == null || minStartDate == '' || itemStartDate < minStartDate) {
			minStartDate = itemStartDate;
		}
		if (maxEndDate == null || maxEndDate == '' || itemEndDate > maxEndDate) {
			maxEndDate = itemEndDate;
		}
		
	}
	
	if (minStartDate != null && minStartDate != '' && maxEndDate != null && maxEndDate != '') {
		var minStartDateString = nlapiDateToString(minStartDate);
		var maxEndDateString = nlapiDateToString(maxEndDate);
		var expireDate = nlapiAddDays(minStartDate, -1);
		var expireDateString = nlapiDateToString(expireDate);
	}
	dates['minStartDate'] = minStartDateString;
	dates['maxEndDate'] = maxEndDateString;
	dates['expireDate'] = expireDateString;
	
	return dates;
}


function getLineItemsFromSalesOrder(salesOrder){

	var lineItems = new Array();
	lineItemCount = salesOrder.getLineItemCount('item');
	
	for (var i = 1; i <= lineItemCount; i++) {
		var lineItem = new Array();
		var item = salesOrder.getLineItemValue('item', 'item', i);
		var itemType = salesOrder.getLineItemValue('item', 'itemtype', i);
		
		if (itemType != 'Subtotal' && itemType != 'Discount' && itemType != 'Description') {
			var renewalProperties = getRenewalPropertiesForItem(item);
			var renewalSKU = renewalProperties['custitemr7itemrenewalsku'];
			
			if (renewalSKU != null && renewalSKU != ''){
				var defaultTerm = nlapiLookupField('item', renewalSKU, 'custitemr7itemdefaultterm');
			}
			else {
				var defaultTerm = null;
			}
			
			var renewalCode = renewalProperties['custitemr7itemrenewalcode'];
			
			var startDate = salesOrder.getLineItemValue('item', 'revrecstartdate', i);
			var endDate = salesOrder.getLineItemValue('item', 'revrecenddate', i);
										
			var productKey = salesOrder.getLineItemValue('item', 'custcolr7itemmsproductkey', i);
			var licenseEndDate = licenseEndDates[productKey];
			
			if ((licenseEndDate == '' || licenseEndDate == null || licenseEndDate == 'undefined') && productKey != null && productKey != '' && productKey.substr(0, 4) != 'PEND') {
				var licenseInfo = findLicenceInfo(productKey, null, item);
				if (licenseInfo != null) {
					licenseEndDate = nlapiStringToDate(licenseInfo[0]);
					licenseEndDates[productKey] = licenseEndDate;
				}
			}
			
			if ((endDate != '' && endDate != null) && (licenseEndDate == '' || licenseEndDate == null || licenseEndDate == 'undefined')){
				licenseEndDate = nlapiStringToDate(endDate);
			}
			
			if (licenseEndDate == '' || licenseEndDate == null || licenseEndDate == 'undefined'){
				licenseEndDate = new Date();
			}
			
			var quantity = parseFloat(salesOrder.getLineItemValue('item', 'quantity', i));
			var unitType = salesOrder.getLineItemValue('item', 'custcolr7itemqtyunit', i);
			//should not renew things for longer than 1 year
			if (unitType == '2' && quantity > 12){
				quantity = 12;
				renewalProperties['custitemr7itemrarequiresmanualreview'] = 'T';
			}
			if (unitType == '3' && quantity != 1){
				quantity = 1;
				renewalProperties['custitemr7itemrarequiresmanualreview'] = 'T';
			}
			if (unitType == '5' && quantity > 365){
				quantity = 365;
				renewalProperties['custitemr7itemrarequiresmanualreview'] = 'T';
			}
			
			var newStartDate = '';
			var newEndDate = '';
			
			//start/end date calculations
			if (startDate != '' && startDate != null && endDate != '' && endDate != null) {
				newStartDate = nlapiDateToString(nlapiAddDays(licenseEndDate, 1));
				
				var newEndDate = convertEndDate(newStartDate, quantity, unitType, defaultTerm);	
			}
			
			//renewal pricing
			var rate = salesOrder.getLineItemValue('item', 'rate', i);
			if (rate != '' && rate != null) {
				rate = determineRenewalPricing(rate, renewalCode);
			}
			
			
			//price level
			var priceLevel = salesOrder.getLineItemValue('item', 'price', i);
			if (priceLevel != 2 && priceLevel != 5) { //USD-I International and Online Price
				priceLevel = -1;
			}

			lineItem['renewalProperties'] = renewalProperties;
			lineItem['originalItemIid'] = item;
			lineItem['quantity'] = quantity;
			lineItem['price'] = priceLevel;
			lineItem['rate'] = rate;
			lineItem['custcolr7itemmsproductkey'] = productKey;
			lineItem['custcolr7translicenseid'] = salesOrder.getLineItemValue('item', 'custcolr7translicenseid', i);
			lineItem['startDate'] = newStartDate;
			lineItem['endDate'] = newEndDate;
			lineItem['salesOrderId'] = salesOrder.getId();
			lineItem['salesOrderStartDate'] = salesOrder.getFieldValue('startdate');
			lineItem['salesOrderEndDate'] = salesOrder.getFieldValue('enddate');
			lineItem['contact'] = salesOrder.getLineItemValue('item', 'custcolr7translinecontact', i); //Line item contact
			lineItems[lineItems.length] = lineItem;
		}
	}
	return lineItems;
}


/* @param itemIid the internalId of item 
 * Returns the renewal properties of the item iid
 */
function getRenewalPropertiesForItem(itemIid){

	var properties = new Array('custitemr7itemrenewalsku', 'custitemr7itemrenewalgroup', 'custitemr7itemrarequiresmanualreview', 'custitemr7itemrenewalcode');
	var lookedUpProperties = nlapiLookupField('item', itemIid, properties);
	return lookedUpProperties;
}


function createRenewalOpportunity(salesOrder, lineItems, type, oppAssociatedProperties, opportunityId){

	if (opportunityId == null || opportunityId == '') {
		var oppRecord = nlapiCreateRecord('opportunity', {
			recordmode: 'dynamic',
			customform: 142
		});
	}
	else {
		var oppRecord = nlapiCopyRecord('opportunity', opportunityId);
		oppRecord.setFieldValue('projectedtotal', 0);
		var lineItemCount = oppRecord.getLineItemCount('item');
		for (var i = 0; i < lineItemCount; i++) {
			oppRecord.removeLineItem('item', 1);
		}
	}
	
	oppRecord.setFieldValue('templatestored', 'T');
	oppRecord.setFieldValue('custbodyr7transactionrenewalopp', 'T');
	
	//Set all associated properties
	oppRecord.setFieldValue('entity', oppAssociatedProperties['entity']);
	oppRecord.setFieldValue('salesrep', oppAssociatedProperties['salesrep']);
	oppRecord.setFieldValue('department', oppAssociatedProperties['department']);
	oppRecord.setFieldValue('location', oppAssociatedProperties['location']);
	oppRecord.setFieldValue('title', oppAssociatedProperties['title']);
	oppRecord.setFieldValue('entitystatus', oppAssociatedProperties['status']);
	oppRecord.setFieldValue('expectedclosedate', oppAssociatedProperties['expectedclosedate']);
	oppRecord.setFieldValue('leadsource', oppAssociatedProperties['leadsource']);
	oppRecord.setFieldValue('partner', oppAssociatedProperties['partner']);
	oppRecord.setFieldValue('custbodyr7partnerdealtype', oppAssociatedProperties['custbodyr7partnerdealtype']);
	oppRecord.setFieldValue('custbodyr7billingresponsibleparty', oppAssociatedProperties['custbodyr7billingresponsibleparty']);
	oppRecord.setFieldValue('custbodyr7opprenewalautomationcreated', 'T');
	oppRecord.setFieldValue('custbodyr7accountmanagementworkflow', salesOrder.getFieldValue('custbodyr7accountmanagementworkflow'));
	
	//Create line items	
	for (var i = 0; i < lineItems.length; i++) {
	
		var renewalProperties = lineItems[i]['renewalProperties'];
		if (renewalProperties['custitemr7itemrarequiresmanualreview'] == 'T') {
			oppRecord.setFieldValue('custbodyr7opprarequiresmanualreview', 'T');
		}
		
		oppRecord.selectNewLineItem('item');
		oppRecord.setCurrentLineItemValue('item', 'item', renewalProperties['custitemr7itemrenewalsku']);
		oppRecord.setCurrentLineItemValue('item', 'quantity', lineItems[i]['quantity']);
		if (renewalProperties['custitemr7itemrenewalsku'] != 210) {
			oppRecord.setCurrentLineItemValue('item', 'price', lineItems[i]['price']);
		}
		oppRecord.setCurrentLineItemValue('item', 'rate', lineItems[i]['rate']);
		oppRecord.setCurrentLineItemValue('item', 'location', salesOrder.getFieldValue('location'));
		oppRecord.setCurrentLineItemValue('item', 'custcolr7startdate', lineItems[i]['startDate']);
		oppRecord.setCurrentLineItemValue('item', 'custcolr7enddate', lineItems[i]['endDate']);
		oppRecord.setCurrentLineItemValue('item', 'custcolr7createdfromra', lineItems[i]['salesOrderId']);
		oppRecord.setCurrentLineItemValue('item', 'custcolr7itemmsproductkey', lineItems[i]['custcolr7itemmsproductkey']);
		
		
		if (lineItems[i]['contact'] != null && lineItems[i]['contact'] != '') {
			oppRecord.setCurrentLineItemValue('item', 'custcolr7translinecontact', lineItems[i]['contact']);
		}
		
		oppRecord.commitLineItem('item');
	}
	
	if (oppAssociatedProperties['partner'] != '' && oppAssociatedProperties['partner'] != null){
		
		var partnerDiscountPerc = nlapiLookupField('partner', oppAssociatedProperties['partner'], 'custentityr7partnerdiscountrenewals');

		if (partnerDiscountPerc != '' && partnerDiscountPerc != null) {
			oppRecord.selectNewLineItem('item');
			oppRecord.setCurrentLineItemValue('item', 'item', -2);
			oppRecord.commitLineItem('item');
			
			oppRecord.selectNewLineItem('item');
			oppRecord.setCurrentLineItemValue('item', 'item', -6);
			oppRecord.setCurrentLineItemValue('item', 'rate', '-' + partnerDiscountPerc);
			oppRecord.commitLineItem('item');
		}
	}
	
	if (type == 'Primary') {
		oppRecord.selectNewLineItem('item');
		oppRecord.setCurrentLineItemValue('item', 'item', 107);
		oppRecord.commitLineItem('item');
	}

	var id = nlapiSubmitRecord(oppRecord);
	arrCreatedOppIds[arrCreatedOppIds.length] = id;
	return id;
}

function transformOpportunity(newOppId, dates){

	var newQuoteRec = nlapiTransformRecord('opportunity', newOppId, 'estimate');
	newQuoteRec.setFieldValue('startdate', dates['minStartDate']);
	newQuoteRec.setFieldValue('enddate', dates['maxEndDate']);
	newQuoteRec.setFieldValue('duedate', dates['expireDate']);
	newQuoteRec.setFieldValue('custbodyr7includeinrenewalforecast', 'T');
	
	nlapiSubmitRecord(newQuoteRec);
	
}

function determineRenewalPricing(rate, renewalCode){
	/*
	100L	 	1	 
	35L	 	2	 
	DNR	 	3	 
	35C	 	4	 
	100C	 	5	 
	SPC	 	6
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
			result = Math.round((rate * 1.05) * 10000) / 10000;
			break;
		default:
			result = rate;
	}
	
	return result;
	
}

function getCompareHTML(){
	var oppOrigFile = nlapiPrintRecord('transaction', opportunityId, 'html');
	var oppOrigHTML = oppOrigFile.getValue();
	
	var contentHTML = '';
	contentHTML += '\n<html>';
	contentHTML += '<head>';
	contentHTML += '<style type="text/css">';
	contentHTML += 'p.pos_fixed{';
	contentHTML += 'position:fixed;';
	contentHTML += 'top:30px;';
	contentHTML += 'left:5px;}';
	contentHTML += '</style>';
	contentHTML += '</head><body>';
	contentHTML += '<p class="pos_fixed">';
	contentHTML += oppOrigHTML;
	contentHTML += '</p>';
	contentHTML += '</body></html>'
	
}

function stringify(arr){

	var result = '';
	
	for (var i = 0; arr != null && i < arr.length; i++) {
	
		if (i != arr.length - 1) {
			result += arr[i] + ', ';
		}
		else {
			result += arr[i];
		}
	}
	return result;
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

function sourceContacts(customerId, fldContact){
	
	var arrSearchFilters = new Array();
	arrSearchFilters[0] = new nlobjSearchFilter('company', null, 'is', customerId);
	arrSearchFilters[1] = new nlobjSearchFilter('email', null, 'isnotempty');
	
	var arrSearchColumns = new Array();
	arrSearchColumns[0] = new nlobjSearchColumn('entityid');
	arrSearchColumns[1] = new nlobjSearchColumn('email');
	
	var arrSearchResults = nlapiSearchRecord('contact', null, arrSearchFilters, arrSearchColumns);
	
	for (var i = 0; arrSearchResults != null && i < arrSearchResults.length; i++) {
		
		var searchResult = arrSearchResults[i];
		var contactId = searchResult.getId();
		var contactName = searchResult.getValue(arrSearchColumns[0]);
	
		fldContact.addSelectOption(contactId, contactName);
	
	}
	
}

function activateEmployee(employeeInternalId){
	nlapiSubmitField('employee', employeeInternalId, 'isinactive', 'F');
}

function inactivateEmployee(employeeInternalId){
	nlapiSubmitField('employee', employeeInternalId, 'isinactive', 'T');
}