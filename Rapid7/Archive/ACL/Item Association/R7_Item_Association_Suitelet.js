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
		reAssociateItems(recOrder);
		var orderURL = nlapiResolveURL('RECORD', orderType, orderId, 'view');
		var orderNum = recOrder.getFieldValue('tranid');
		var customerId = recOrder.getFieldValue('entity');
		
		form = new nlapiCreateForm('Item Associations', false);
		form.setScript('customscriptr7itemassociationcspagescrip');
		var fldOrderNumber = form.addField('custpage_ordernumber', 'text');
		fldOrderNumber.setDefaultValue('Order: ' + '<a href="' + orderURL + '" target="_blank">' + orderNum + '</a>');
		fldOrderNumber.setDisplayType('inline');
		fldOrderNumber.setLayoutType('startrow', 'startrow');
		var fldOrderId = form.addField('custpage_orderid', 'text').setDisplayType('hidden');
		fldOrderId.setDefaultValue(orderId);
		var fldOrderType = form.addField('custpage_ordertype', 'text').setDisplayType('hidden');
		fldOrderType.setDefaultValue(orderType);
		
		form.addTab('custpage_licensetab', 'Licenses');
		form.addTab('custpage_eventstab', 'Events');
		form.addTab('custpage_mngstab', 'Managed Service');
				
		var ACLList = form.addSubList('custpage_aclitems', 'list', 'ACL Items', 'custpage_licensetab');
		ACLList.addField('custpage_orderid_acl', 'text').setDisplayType('hidden');
		ACLList.addField('custpage_customerid_acl', 'text').setDisplayType('hidden');
		ACLList.addField('custpage_itemfamily_acl', 'text').setDisplayType('hidden');
		ACLList.addField('custpage_itemid_acl', 'text').setDisplayType('hidden');
		ACLList.addField('custpage_lineid_acl', 'text').setDisplayType('hidden');
		ACLList.addField('custpage_license_aclexisting_orig', 'text').setDisplayType('hidden');
		ACLList.addField('custpage_quantity_acl', 'float', 'Quantity');
		ACLList.addField('custpage_itemtext_acl', 'text', 'Item');
		ACLList.addField('custpage_itemdescription_acl', 'textarea', 'Description');
		var fldACLSelectExisting = ACLList.addField('custpage_license_aclexisting', 'select', 'Existing License');
		fldACLSelectExisting.setDisplaySize(260);
		var fldContact = ACLList.addField('custpage_contact_acl', 'select', 'Contact');
		fldContact.setMandatory(true);
		fldContact.setDisplaySize(260);
		sourceContacts(customerId, fldContact);
		
		var AddOnList = form.addSubList('custpage_addonitems', 'list', 'Add-On Items', 'custpage_licensetab');
		AddOnList.addField('custpage_orderid', 'text').setDisplayType('hidden');
		AddOnList.addField('custpage_itemid', 'text').setDisplayType('hidden');
		AddOnList.addField('custpage_itemfamily', 'text').setDisplayType('hidden');
		AddOnList.addField('custpage_license_acl_orig', 'text').setDisplayType('hidden');
		AddOnList.addField('custpage_lineid', 'text').setDisplayType('hidden');
		AddOnList.addField('custpage_addoncomponents', 'text').setDisplayType('hidden');
		AddOnList.addField('custpage_quantity', 'float', 'Quantity');
		AddOnList.addField('custpage_itemtext', 'text', 'Item');
		AddOnList.addField('custpage_itemdescription', 'textarea', 'Description');
		var fldACLSelect = AddOnList.addField('custpage_license_acl', 'select', 'License/ACL');
		fldACLSelect.setDisplaySize(260);
		fldACLSelect.addSelectOption('', '');
		//var fldLicLink = AddOnList.addField('custpage_license_link', 'text', 'License Link');
		//fldLicLink.setDisplayType('inline');
		
		var eventList = form.addSubList('custpage_eventlist', 'list', 'Event Items', 'custpage_eventstab');
		eventList.addField('custpage_orderid_event', 'text').setDisplayType('hidden');
		eventList.addField('custpage_customerid_event', 'text').setDisplayType('hidden');
		eventList.addField('custpage_itemfamily_event', 'text').setDisplayType('hidden');
		eventList.addField('custpage_itemid_event', 'text').setDisplayType('hidden');
		eventList.addField('custpage_lineid_event', 'text').setDisplayType('hidden');
		eventList.addField('custpage_license_eventexisting_orig', 'text').setDisplayType('hidden');
		eventList.addField('custpage_quantity_event', 'float', 'Quantity');
		eventList.addField('custpage_itemtext_event', 'text', 'Item');
		eventList.addField('custpage_itemdescription_event', 'textarea', 'Description');
		var fldThisSucks = eventList.addField('custpage_thissucks', 'select', 'Existing Event');
		fldThisSucks.setDisplaySize(260);
		fldThisSucks.setMandatory(true);
		var fldEventContact = eventList.addField('custpage_contact_event', 'select', 'Event Contact');
		fldEventContact.setMandatory(true);
		fldEventContact.setDisplaySize(260);
		sourceContacts(customerId, fldEventContact);
		sourceEventMasters(fldThisSucks);
		
		var mngList = form.addSubList('custpage_mnglist', 'list', 'Managed Service Items', 'custpage_mngstab');
		mngList.addField('custpage_orderid_mng', 'text').setDisplayType('hidden');
		mngList.addField('custpage_customerid_mng', 'text').setDisplayType('hidden');
		mngList.addField('custpage_itemfamily_mng', 'text').setDisplayType('hidden');
		mngList.addField('custpage_itemid_mng', 'text').setDisplayType('hidden');
		mngList.addField('custpage_lineid_mng', 'text').setDisplayType('hidden');
		mngList.addField('custpage_orig_license_mngexisting', 'text').setDisplayType('hidden');
		mngList.addField('custpage_quantity_mng', 'float', 'Quantity');
		mngList.addField('custpage_itemtext_mng', 'text', 'Item');
		mngList.addField('custpage_itemdescription_mng', 'textarea', 'Description');
		var fldMNGSelectExisting = mngList.addField('custpage_license_mngexisting', 'select', 'Existing MNG Record');
		fldMNGSelectExisting.setDisplaySize(260);
		var fldMNGContact = mngList.addField('custpage_contact_mng', 'select', 'Managed Service Contact');
		fldMNGContact.setMandatory(true);
		fldMNGContact.setDisplaySize(260);
		
		sourceContacts(customerId, fldMNGContact);
		
		var mngAddOnList = form.addSubList('custpage_mngaddonlist', 'list', 'Managed Service Add-Ons', 'custpage_mngstab');
		mngAddOnList.addField('custpage_orderid_mng_addon', 'text').setDisplayType('hidden');
		mngAddOnList.addField('custpage_customerid_mng_addon', 'text').setDisplayType('hidden');
		mngAddOnList.addField('custpage_itemfamily_mng_addon', 'text').setDisplayType('hidden');
		mngAddOnList.addField('custpage_itemid_mng_addon', 'text').setDisplayType('hidden');
		mngAddOnList.addField('custpage_lineid_mng_addon', 'text').setDisplayType('hidden');
		mngAddOnList.addField('custpage_mng_addoncomponents', 'text').setDisplayType('hidden');
		mngAddOnList.addField('custpage_license_select_mng_addon_orig', 'text').setDisplayType('hidden');
		mngAddOnList.addField('custpage_quantity_mng_addon', 'float', 'Quantity');
		mngAddOnList.addField('custpage_itemtext_mng_addon', 'text', 'Item');
		mngAddOnList.addField('custpage_itemdescription_mng_addon', 'textarea', 'Description');
		var fldMNGSelect = mngAddOnList.addField('custpage_license_select_mng_addon', 'select', 'MNG Record');
		fldMNGSelect.setDisplaySize(260);

		var arrItems = getItemsFromOrder(recOrder);
		var arrACLItems = getACRItems(arrItems, '1,2');
		var arrAllAddOnItems = getAddOnItems(arrItems);
		var arrAddOnItems = arrAllAddOnItems[0];
		var arrMNGAddOnItems = arrAllAddOnItems[1];
		var arrEventItems = getEventItems(arrItems);
		var arrMNGItems = getACRItems(arrItems, '3');
		
		sourceACLSelect(customerId, fldACLSelect, arrACLItems);
		sourceACLSelectExisting(customerId, fldACLSelectExisting);
		sourceMNGSelect(customerId, fldMNGSelect, arrMNGItems);
		sourceMNGSelectExisting(customerId, fldMNGSelectExisting);
			
		//build sublist of add-ons
		var currentLineCountAddon = 1;
		for (var i = 0; arrAddOnItems != null && i < arrAddOnItems.length; i++) {
			var listItem = arrAddOnItems[i];
			var itemProperties = listItem['itemProperties'];
			
			if (listItem['licenseId'] == '' || listItem['licenseId'] == null || listItem['licenseId'] == 'XXX' || listItem['productKey'] == '' || listItem['productKey'] == null || listItem['productKey'].substr(0, 4) == 'PEND') {
			
				var description = listItem['description'];
				if (description != null && description.length > 60) {
					description = description.substr(0, 60);
				}
				
				AddOnList.setLineItemValue('custpage_orderid', currentLineCountAddon, orderId);
				AddOnList.setLineItemValue('custpage_itemid', currentLineCountAddon, listItem['itemId']);
				AddOnList.setLineItemValue('custpage_itemfamily', currentLineCountAddon, itemProperties['custitemr7itemfamily']);
				AddOnList.setLineItemValue('custpage_lineid', currentLineCountAddon, listItem['lineId']);
				AddOnList.setLineItemValue('custpage_addoncomponents', currentLineCountAddon, listItem['addOns']);
				AddOnList.setLineItemValue('custpage_quantity', currentLineCountAddon, parseFloat(listItem['quantity']));
				AddOnList.setLineItemValue('custpage_itemtext', currentLineCountAddon, itemProperties['displayname']);
				AddOnList.setLineItemValue('custpage_itemdescription', currentLineCountAddon, description);
				if (listItem['currentParentACL'] != '' && listItem['currentParentACL'] != null) {
					AddOnList.setLineItemValue('custpage_license_acl', currentLineCountAddon, listItem['currentParentACL']);
					AddOnList.setLineItemValue('custpage_license_acl_orig', currentLineCountAddon, listItem['currentParentACL']);
				}
				else {
					AddOnList.setLineItemValue('custpage_license_acl', currentLineCountAddon, listItem['suggestedParentACL']);
					AddOnList.setLineItemValue('custpage_license_acl_orig', currentLineCountAddon, listItem['suggestedParentACL']);
				}
				currentLineCountAddon++;
			}
		}
		
		//build sublist of ACLs
		var currentLineCountACL = 1;
		for (var i = 0; arrACLItems != null && i < arrACLItems.length; i++) {
			var listItem = arrACLItems[i];
			var itemProperties = listItem['itemProperties'];
			
			if (listItem['licenseId'] == '' || listItem['licenseId'] == null || listItem['licenseId'] == 'XXX'  || listItem['productKey'] == '' || listItem['productKey'] == null || listItem['productKey'].substr(0, 4) == 'PEND') {
			
				var description = listItem['description'];
				if (description != null && description.length > 60) {
					description = description.substr(0, 60);
				}
				
				ACLList.setLineItemValue('custpage_orderid_acl', currentLineCountACL, orderId);
				ACLList.setLineItemValue('custpage_customerid_acl', currentLineCountACL, customerId);
				ACLList.setLineItemValue('custpage_itemid_acl', currentLineCountACL, listItem['itemId']);
				ACLList.setLineItemValue('custpage_itemfamily_acl', currentLineCountACL, itemProperties['custitemr7itemfamily']);
				ACLList.setLineItemValue('custpage_lineid_acl', currentLineCountACL, listItem['lineId']);
				ACLList.setLineItemValue('custpage_quantity_acl', currentLineCountACL, parseFloat(listItem['quantity']));
				ACLList.setLineItemValue('custpage_itemtext_acl', currentLineCountACL, itemProperties['displayname']);
				ACLList.setLineItemValue('custpage_itemdescription_acl', currentLineCountACL, description);
				ACLList.setLineItemValue('custpage_contact_acl', currentLineCountACL, listItem['contact']);
				ACLList.setLineItemValue('custpage_license_aclexisting', currentLineCountACL, listItem['productKey']);
				ACLList.setLineItemValue('custpage_license_aclexisting_orig', currentLineCountACL, listItem['productKey']);
				currentLineCountACL++;
			}
		}
		
		//build sublist of Events
		var currentLineCountEvent = 1;
		for (var i = 0; arrEventItems != null && i < arrEventItems.length; i++) {
			var listItem = arrEventItems[i];
			var itemProperties = listItem['itemProperties'];
			
			if (listItem['licenseId'] == '' || listItem['licenseId'] == null || listItem['licenseId'] == 'XXX' || listItem['eventMaster'] == '' || listItem['eventMaster'] == null) {
			
				var description = listItem['description'];
				if (description != null && description.length > 60) {
					description = description.substr(0, 60);
				}
				
				var existingEvent = listItem['eventMaster'];
				var defaultEvent = listItem['defaultEvent'];
				
				if (existingEvent != null && existingEvent != '') {
					defaultEvent = existingEvent;
				}
				
				eventList.setLineItemValue('custpage_orderid_event', currentLineCountEvent, orderId);
				eventList.setLineItemValue('custpage_customerid_event', currentLineCountEvent, customerId);
				eventList.setLineItemValue('custpage_itemid_event', currentLineCountEvent, listItem['itemId']);
				eventList.setLineItemValue('custpage_lineid_event', currentLineCountEvent, listItem['lineId']);
				eventList.setLineItemValue('custpage_quantity_event', currentLineCountEvent, parseFloat(listItem['quantity']));
				eventList.setLineItemValue('custpage_itemtext_event', currentLineCountEvent, itemProperties['displayname']);
				eventList.setLineItemValue('custpage_itemdescription_event', currentLineCountEvent, description);
				eventList.setLineItemValue('custpage_thissucks', currentLineCountEvent, defaultEvent);
				eventList.setLineItemValue('custpage_license_eventexisting_orig', currentLineCountEvent, defaultEvent);
				eventList.setLineItemValue('custpage_contact_event', currentLineCountEvent, listItem['contact']);
				currentLineCountEvent++;
			}
		}
		
		//build sublist of MNG Records
		var currentLineCountMNG = 1;
		for (var i = 0; arrMNGItems != null && i < arrMNGItems.length; i++) {
			var listItem = arrMNGItems[i];
			var itemProperties = listItem['itemProperties'];
			
			if (listItem['licenseId'] == '' || listItem['licenseId'] == null || listItem['licenseId'] == 'XXX' || listItem['mngId'] == '' || listItem['mngId'] == null) {
			
				var description = listItem['description'];
				if (description != null && description.length > 60) {
					description = description.substr(0, 60);
				}
				
				mngList.setLineItemValue('custpage_orderid_mng', currentLineCountMNG, orderId);
				mngList.setLineItemValue('custpage_customerid_mng', currentLineCountMNG, customerId);
				mngList.setLineItemValue('custpage_itemid_mng', currentLineCountMNG, listItem['itemId']);
				mngList.setLineItemValue('custpage_lineid_mng', currentLineCountMNG, listItem['lineId']);
				mngList.setLineItemValue('custpage_quantity_mng', currentLineCountMNG, parseFloat(listItem['quantity']));
				mngList.setLineItemValue('custpage_itemtext_mng', currentLineCountMNG, itemProperties['displayname']);
				mngList.setLineItemValue('custpage_itemdescription_mng', currentLineCountMNG, description);
				mngList.setLineItemValue('custpage_license_mngexisting', currentLineCountMNG, listItem['mngId']);
				mngList.setLineItemValue('custpage_orig_license_mngexisting', currentLineCountMNG, listItem['mngId']);
				mngList.setLineItemValue('custpage_contact_mng', currentLineCountMNG, listItem['contact']);
				currentLineCountMNG++;
			}
		}
		
		//build sublist of MNG AddOns
		var currentLineCountMNGAddOns = 1;
		for (var i = 0; arrMNGAddOnItems != null && i < arrMNGAddOnItems.length; i++) {
			var listItem = arrMNGAddOnItems[i];
			var itemProperties = listItem['itemProperties'];
			
			if (listItem['licenseId'] == '' || listItem['licenseId'] == null || listItem['licenseId'] == 'XXX' || listItem['mngId'] == '' || listItem['mngId'] == null) {
			
				var description = listItem['description'];
				if (description != null && description.length > 60) {
					description = description.substr(0, 60);
				}
				
				mngAddOnList.setLineItemValue('custpage_orderid_mng_addon', currentLineCountMNGAddOns, orderId);
				mngAddOnList.setLineItemValue('custpage_customerid_mng_addon', currentLineCountMNGAddOns, customerId);
				mngAddOnList.setLineItemValue('custpage_itemid_mng_addon', currentLineCountMNGAddOns, listItem['itemId']);
				mngAddOnList.setLineItemValue('custpage_lineid_mng_addon', currentLineCountMNGAddOns, listItem['lineId']);
				mngAddOnList.setLineItemValue('custpage_quantity_mng_addon', currentLineCountMNGAddOns, parseFloat(listItem['quantity']));
				mngAddOnList.setLineItemValue('custpage_mng_addoncomponents', currentLineCountMNGAddOns, listItem['addOns']);
				mngAddOnList.setLineItemValue('custpage_itemtext_mng_addon', currentLineCountMNGAddOns, itemProperties['displayname']);
				mngAddOnList.setLineItemValue('custpage_itemdescription_mng_addon', currentLineCountMNGAddOns, description);
				mngAddOnList.setLineItemValue('custpage_license_select_mng_addon', currentLineCountMNGAddOns, listItem['mngId']);
				mngAddOnList.setLineItemValue('custpage_license_select_mng_addon_orig', currentLineCountMNGAddOns, listItem['mngId']);
				mngAddOnList.setLineItemValue('custpage_contact_mng_addon', currentLineCountMNGAddOns, listItem['contact']);
				currentLineCountMNGAddOns++;
			}
		}
		
		if (arrEventItems == null || arrEventItems.length < 1){
			eventList.setDisplayType('hidden');
		}
		if (arrACLItems == null || arrACLItems.length < 1){
			ACLList.setDisplayType('hidden');
		}
		if (arrAddOnItems == null || arrAddOnItems.length < 1){
			AddOnList.setDisplayType('hidden');
		}
		if (arrMNGItems == null || arrMNGItems.length < 1){
			mngList.setDisplayType('hidden');
		}
		if (arrMNGItems == null || arrMNGItems.length < 1){
			mngList.setDisplayType('hidden');
		}
		if (arrMNGAddOnItems == null || arrMNGAddOnItems.length < 1){
			mngAddOnList.setDisplayType('hidden');
		}
		
		form.addSubmitButton('Submit');
		
		response.writePage(form);
		
	}
	
	if (request.getMethod() == 'POST') {
		this.orderId = request.getParameter('custpage_orderid');
		this.orderType = request.getParameter('custpage_ordertype');
		var recOrder = nlapiLoadRecord(this.orderType, this.orderId);
		var orderObject = getOrderObject(recOrder);
		
		reAssociateItems(recOrder);
		
		var updateOrderDates = true;
		if (recOrder.getRecordType() == 'salesorder' && recOrder.getFieldValue('status') != 'Pending Approval') {
			updateOrderDates = false;
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
		var arrACLItems = getACRItems(arrItems, '1,2');
		var arrEventItems = getEventItems(arrItems);
		var arrAllAddOnItems = getAddOnItems(arrItems);
		var arrAddOnItems = arrAllAddOnItems[0];
		var arrMNGAddOnItems = arrAllAddOnItems[1];
		var arrMNGItems = getACRItems(arrItems, '3');

		nlapiLogExecution('AUDIT', 'orderObject.isNXPMigration', orderObject);
		
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
			
			recOrder.setLineItemValue('item', 'custcolr7itemmsproductkey', lineNum, existingKey);
		}
		
		//process ACL items
		for (var i = 0; arrACLItems != null && i < arrACLItems.length; i++) {
			var aclItem = arrACLItems[i];
			var lineId = aclItem['lineId'];
			var itemId = aclItem['itemId'];
			var licenseId = aclItem['licenseId'];
			var lineNum = itemLineNums[lineId];
			aclItem['lineNum'] = lineNum;
			var productKey = recOrder.getLineItemValue('item', 'custcolr7itemmsproductkey', lineNum);
			
			if (licenseId == null || licenseId == '' || licenseId == 'XXX' || productKey == '' || productKey == null || productKey.substr(0, 4) == 'PEND') {
			
				if (productKey == '' || productKey == null || productKey.substr(0, 4) == 'PEND') {
					recOrder.setLineItemValue('item', 'custcolr7itemmsproductkey', lineNum, 'PEND:' + lineId);
				}
				
				if (updateOrderDates) {
					recOrder = processLineItemDates(recOrder, aclItem, null, orderObject);
				}
			}
		}
		
		//process AddOn Item Associations
		var addOnLineCount = request.getLineItemCount('custpage_addonitems');
		for (var j = 1; j <= addOnLineCount; j++) {
			var itemId = request.getLineItemValue('custpage_addonitems', 'custpage_itemid', j);
			var lineId = request.getLineItemValue('custpage_addonitems', 'custpage_lineid', j);
			var addOns = request.getLineItemValue('custpage_addonitems', 'custpage_addoncomponents', j);
			var parentACLId = request.getLineItemValue('custpage_addonitems', 'custpage_license_acl', j);
			var lineNum = itemLineNums[lineId];
			
			var lineItem = new Array();
			lineItem['addOns'] = addOns;
			lineItem['lineNum'] = lineNum;
			
			if (parentACLId != null && parentACLId != '') {
				if (parentACLId.substr(0, 3) == 'PK:') {
					recOrder.setLineItemValue('item', 'custcolr7itemmsproductkey', lineNum, parentACLId.substr(3));
				}
				else {
					recOrder.setLineItemValue('item', 'custcolr7itemmsproductkey', lineNum, 'PEND:' + parentACLId);
				}
				
				if (updateOrderDates) {
					recOrder = processLineItemDates(recOrder, lineItem, null, orderObject);
				}
			}
			else {
				recOrder.setLineItemValue('item', 'custcolr7itemmsproductkey', lineNum, '');
			}
		}
		
		//set contacts and pks
		var eventLineCount = request.getLineItemCount('custpage_eventlist');
		for (var k = 1; k <= eventLineCount; k++) {
			var itemId = request.getLineItemValue('custpage_eventlist', 'custpage_itemid_event', k);
			var lineId = request.getLineItemValue('custpage_eventlist', 'custpage_lineid_event', k);
			var contactId = request.getLineItemValue('custpage_eventlist', 'custpage_contact_event', k);
			var existingEvent = request.getLineItemValue('custpage_eventlist', 'custpage_thissucks', k);
			var lineNum = itemLineNums[lineId];
			
			recOrder.setLineItemValue('item', 'custcolr7translinecontact', lineNum, contactId);
			recOrder.setLineItemValue('item', 'custcolr7eventmaster', lineNum, existingEvent);
		}
		
		//set contacts and pks
		var MNGLineCount = request.getLineItemCount('custpage_mnglist');
		for (var k = 1; k <= MNGLineCount; k++) {
			var itemId = request.getLineItemValue('custpage_mnglist', 'custpage_itemid_mng', k);
			var lineId = request.getLineItemValue('custpage_mnglist', 'custpage_lineid_mng', k);
			var contactId = request.getLineItemValue('custpage_mnglist', 'custpage_contact_mng', k);
			var existingId = request.getLineItemValue('custpage_mnglist', 'custpage_license_mngexisting', k);
			var lineNum = itemLineNums[lineId];
			
			if (contactId != '' && contactId != null) {
				recOrder.setLineItemValue('item', 'custcolr7translinecontact', lineNum, contactId);
			}
			
			recOrder.setLineItemValue('item', 'custcolr7managedserviceid', lineNum, existingId);
		}
		
		//process MNG items
		for (var i = 0; arrMNGItems != null && i < arrMNGItems.length; i++) {
			var mngItem = arrMNGItems[i];
			var lineId = mngItem['lineId'];
			var itemId = mngItem['itemId'];
			var licenseId = mngItem['licenseId'];
			var lineNum = itemLineNums[lineId];
			mngItem['lineNum'] = lineNum;
			var msId = recOrder.getLineItemValue('item', 'custcolr7managedserviceid', lineNum);
			
			if (licenseId == null || licenseId == '' || licenseId == 'XXX' || msId == '' || msId == null || msId.substr(0, 4) == 'PEND') {
			
				if (msId == '' || msId == null || msId.substr(0, 4) == 'PEND') {
					recOrder.setLineItemValue('item', 'custcolr7managedserviceid', lineNum, 'PEND:' + lineId);
				}
				
				if (updateOrderDates) {
					recOrder = processLineItemDates(recOrder, mngItem, null, orderObject);
				}
			}
		}
		
		//process MNG AddOn Item Associations
		var mngAddOnLineCount = request.getLineItemCount('custpage_mngaddonlist');
		for (var j = 1; j <= mngAddOnLineCount; j++) {
			var itemId = request.getLineItemValue('custpage_mngaddonlist', 'custpage_itemid_mng_addon', j);
			var lineId = request.getLineItemValue('custpage_mngaddonlist', 'custpage_lineid_mng_addon', j);
			var addOns = request.getLineItemValue('custpage_mngaddonlist', 'custpage_mng_addoncomponents', j);
			var parentACLId = request.getLineItemValue('custpage_mngaddonlist', 'custpage_license_select_mng_addon', j);
			var lineNum = itemLineNums[lineId];
			
			var lineItem = new Array();
			lineItem['addOns'] = addOns;
			lineItem['lineNum'] = lineNum;
			nlapiSendEmail(55011, 55011, 'parentACLId', 'parentACLId: ' + parentACLId + '\addOns: ' + addOns + '\itemId: ' + itemId);
			if (parentACLId != null && parentACLId != '') {
				if (parentACLId.substr(0, 3) == 'PK:') {
					recOrder.setLineItemValue('item', 'custcolr7managedserviceid', lineNum, parentACLId.substr(3));
				}
				else {
					recOrder.setLineItemValue('item', 'custcolr7managedserviceid', lineNum, 'PEND:' + parentACLId);
				}
				
				if (updateOrderDates) {
					recOrder = processLineItemDates(recOrder, lineItem, null, orderObject);
				}
			}
			else {
				recOrder.setLineItemValue('item', 'custcolr7managedserviceid', lineNum, '');
			}
		}
		
		if (updateOrderDates) {
			determineOrderStartEndDates(recOrder, null, orderObject);
		}
		
		var updatedOrderId = nlapiSubmitRecord(recOrder, true, true);
		nlapiSetRedirectURL('RECORD', this.orderType, this.orderId, 'view');
		//response.writeLine("<html><body onload='win_close()'><script language='Javascript'>function win_close(){ window.opener = top; window.close(); }</script></body></html>");
	}
	
}

function sourceACLSelectExisting(customerId, fld){
	
	fld.addSelectOption('', '--- NEW LICENSE ---');
	
	//all current NX licenses
	var arrNXSearchFilters = new Array();
	arrNXSearchFilters[0] = new nlobjSearchFilter('custrecordr7nxlicensecustomer', null, 'is', customerId);
	arrNXSearchFilters[1] = new nlobjSearchFilter('custrecordr7nxordertype', null, 'is', 1);  
	arrNXSearchFilters[2] = new nlobjSearchFilter('custrecordr7nxlicenseexpirationdate', null, 'onorafter', 'daysago60');  
		
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
		
		fld.addSelectOption(productKey, optionText);
	}
	
	//all current MS licenses
	var arrMSSearchFilters = new Array();
	arrMSSearchFilters[0] = new nlobjSearchFilter('custrecordr7mslicensecustomer', null, 'is', customerId);
	arrMSSearchFilters[1] = new nlobjSearchFilter('custrecordr7msordertype', null, 'anyof', new Array(1,2));  
	arrMSSearchFilters[2] = new nlobjSearchFilter('custrecordr7mslicenseexpirationdate', null, 'onorafter', 'daysago60');  
		
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
		
		fld.addSelectOption(productKey, optionText);
	}
	
}

function sourceMNGSelect(customerId, fld, arrMNGItems){
	fld.addSelectOption('', '');
	//current ACL's on the order
	for (var i = 0; arrMNGItems != null && i < arrMNGItems.length; i++) {
		
		var MNGItem = arrMNGItems[i];
		var itemProperties = MNGItem['itemProperties'];
		var lineId = MNGItem['lineId'];
		var itemText = itemProperties['displayname'];
		var itemAmount = MNGItem['amount'];
		var licenseId = MNGItem['licenseId'];
		var mngOptionId = MNGItem['mngId'];
		
		if ((licenseId == '' || licenseId == null) && (mngOptionId == null || mngOptionId == '' || mngOptionId.substr(0,4) == 'PEND')) {
			var optionText = 'ACM: ' + itemText + ' ($' + addCommas(itemAmount) + ')';
			fld.addSelectOption(lineId, optionText);
		}
	}
		
	var arrSearchFilters = new Array();
	arrSearchFilters[arrSearchFilters.length] = new nlobjSearchFilter('isinactive', null, 'is', 'F');
	arrSearchFilters[arrSearchFilters.length] = new nlobjSearchFilter('custrecordr7managedservicecustomer', null, 'is', customerId);
	
	var arrSearchColumns = new Array();
	arrSearchColumns[0] = new nlobjSearchColumn('internalid');
	arrSearchColumns[1] = new nlobjSearchColumn('name');
	arrSearchColumns[2] = new nlobjSearchColumn('custrecordr7managedservicesenddate');
	
	var arrSearchResults = nlapiSearchRecord('customrecordr7managedservices', null, arrSearchFilters, arrSearchColumns);
		
	for (var i = 0; arrSearchResults != null && i < arrSearchResults.length; i++) {
		
		var searchResult = arrSearchResults[i];
		var mngId = searchResult.getId();
		var name = searchResult.getValue(arrSearchColumns[1]);
		var dateExpired = searchResult.getValue(arrSearchColumns[2]);

		var optionText = name + ' (' + dateExpired + ')';
		
		fld.addSelectOption('PK:' + name, optionText);
	}
	
}

function sourceACLSelect(customerId, fldACLSelect, arrACLItems){
	//current ACL's on the order
	for (var i = 0; arrACLItems != null && i < arrACLItems.length; i++) {
		
		var ACLItem = arrACLItems[i];
		var itemProperties = ACLItem['itemProperties'];
		var lineId = ACLItem['lineId'];
		var itemText = itemProperties['displayname'];
		var itemAmount = ACLItem['amount'];
		var licenseId = ACLItem['licenseId'];
		var productKey = ACLItem['productKey'];
		
		if ((licenseId == '' || licenseId == null) && (productKey == null || productKey == '' || productKey.substr(0,4) == 'PEND')) {
			var optionText = 'ACL: ' + itemText + ' ($' + addCommas(itemAmount) + ')';
			fldACLSelect.addSelectOption(lineId, optionText);
		}
	}
	
	//all current NX licenses
	var arrNXSearchFilters = new Array();
	arrNXSearchFilters[0] = new nlobjSearchFilter('custrecordr7nxlicensecustomer', null, 'is', customerId);
	arrNXSearchFilters[1] = new nlobjSearchFilter('custrecordr7nxordertype', null, 'is', 1);  
	arrNXSearchFilters[2] = new nlobjSearchFilter('custrecordr7nxlicenseexpirationdate', null, 'onorafter', 'daysago60');  
		
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
	arrMSSearchFilters[2] = new nlobjSearchFilter('custrecordr7mslicenseexpirationdate', null, 'onorafter', 'daysago60');  
		
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

function sourceContacts(customerId, fld){
	
	fld.addSelectOption('', '');
	
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
	
		fld.addSelectOption(contactId, contactName);
	
	}
	
}

function sourceEventMasters(fld){
	
	fld.addSelectOption('', '');
	
	var arrSearchFilters = new Array();
	arrSearchFilters[0] = new nlobjSearchFilter('custrecordr7eventregenddate', null, 'onorafter', 'today');
	arrSearchFilters[0].setOr(true);
	arrSearchFilters[1] = new nlobjSearchFilter('custrecordr7eventregenddate', null, 'isempty');
	
	var arrSearchColumns = new Array();
	arrSearchColumns[0] = new nlobjSearchColumn('internalid');
	arrSearchColumns[1] = new nlobjSearchColumn('altname');
	
	var arrSearchResults = nlapiSearchRecord('customrecordr7eventregmaster', null, arrSearchFilters, arrSearchColumns);
	
	for (var i = 0; arrSearchResults != null && i < arrSearchResults.length; i++) {
		
		var searchResult = arrSearchResults[i];
		var eventId = searchResult.getId();
		var eventTitle = searchResult.getValue(arrSearchColumns[1]);
		fld.addSelectOption(eventId, eventTitle);
	
	}
	
}

function sourceMNGSelectExisting(customerId, fld){

	fld.addSelectOption('', '--- NEW MANAGED SERVICE ---');
	
	var arrSearchFilters = new Array();
	arrSearchFilters[arrSearchFilters.length] = new nlobjSearchFilter('isinactive', null, 'is', 'F');
	arrSearchFilters[arrSearchFilters.length] = new nlobjSearchFilter('custrecordr7managedservicecustomer', null, 'is', customerId);
	
	var arrSearchColumns = new Array();
	arrSearchColumns[0] = new nlobjSearchColumn('internalid');
	arrSearchColumns[1] = new nlobjSearchColumn('name');
	
	var arrSearchResults = nlapiSearchRecord('customrecordr7managedservices', null, arrSearchFilters, arrSearchColumns);
	
	for (var i = 0; arrSearchResults != null && i < arrSearchResults.length; i++) {
	
		var searchResult = arrSearchResults[i];
		var mngId = searchResult.getId();
		var mngName = searchResult.getValue(arrSearchColumns[1]);
		
		fld.addSelectOption(mngId, mngName);
		
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
