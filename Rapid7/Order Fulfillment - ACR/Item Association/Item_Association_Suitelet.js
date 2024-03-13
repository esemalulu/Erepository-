/*
 * @author efagone
 */

//NEW ASSOCIATION

var arrLineItemFamilyIds = [];

function reviewAssociations(request, response) {

    this.arrProductTypes = grabAllProductTypes();

    if (request.getMethod() == 'GET') {
        var orderType = request.getParameter('custparam_ordertype');
        var orderId = request.getParameter('custparam_orderid');
        if (orderId == null || orderId == '') {
            throw nlapiCreateError('MISSING PARAM', 'This suitelet requires a valid custparam_orderid parameter', true);
        }

        var recOrder = nlapiLoadRecord(orderType, orderId);
        this.arrItemACRIds = grabLineItemACRIds(recOrder);

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
        var fldCustomerId = form.addField('custpage_customerid', 'select', 'Customer', 'customer').setDisplayType('hidden');
        fldCustomerId.setDefaultValue(customerId);
        var fldOrderId = form.addField('custpage_orderid', 'text').setDisplayType('hidden');
        fldOrderId.setDefaultValue(orderId);
        var fldOrderType = form.addField('custpage_ordertype', 'text').setDisplayType('hidden');
        fldOrderType.setDefaultValue(orderType);
        var fldAddressJSON = form.addField('custpage_addressjson', 'longtext', null, null, 'additionalgroup').setDisplayType('hidden');

        form.addTab('custpage_licensetab', 'Licenses');
        form.addTab('custpage_eventstab', 'Events');
        form.addTab('custpage_mngstab', 'Managed Service');
        form.addTab('custpage_mngswtab', 'Managed Software');
        form.addTab('custpage_hdwtab', 'Hardware');

        var ACLList = form.addSubList('custpage_aclitems', 'list', 'ACL Items', 'custpage_licensetab');
        ACLList.addField('custpage_itemfamily_acl', 'text').setDisplayType('hidden');
        ACLList.addField('custpage_itemid_acl', 'text').setDisplayType('hidden');
        ACLList.addField('custpage_lineid_acl', 'text').setDisplayType('hidden');
        ACLList.addField('custpage_license_aclexisting_orig', 'text').setDisplayType('hidden');
        ACLList.addField('custpage_quantity_acl', 'float', 'Quantity');
        ACLList.addField('custpage_itemtext_acl', 'text', 'Item');
        ACLList.addField('custpage_itemdescription_acl', 'textarea', 'Description');
		ACLList.addField('custpage_parent_sku_line_acl', 'float', 'Parent SKU Line').setDisplayType('hidden');
        var fldACLSelectExisting = ACLList.addField('custpage_license_aclexisting', 'select', 'Existing License');
        fldACLSelectExisting.setDisplaySize(260);
        var fldContact = ACLList.addField('custpage_contact_acl', 'select', 'Contact');
        fldContact.setMandatory(true);
        fldContact.setDisplaySize(260);
        sourceContacts(customerId, fldContact);

        var AddOnList = form.addSubList('custpage_addonitems', 'list', 'Add-On Items', 'custpage_licensetab');
        AddOnList.addField('custpage_itemid', 'text').setDisplayType('hidden');
        AddOnList.addField('custpage_itemfamily', 'text').setDisplayType('hidden');
        AddOnList.addField('custpage_license_acl_orig', 'text').setDisplayType('hidden');
        AddOnList.addField('custpage_lineid', 'text').setDisplayType('hidden');
        AddOnList.addField('custpage_acrid', 'text').setDisplayType('hidden');
        AddOnList.addField('custpage_addoncomponents', 'text').setDisplayType('hidden');
        AddOnList.addField('custpage_is_one_addn', 'checkbox').setDisplayType('hidden');
        AddOnList.addField('custpage_quantity', 'float', 'Quantity');
        AddOnList.addField('custpage_itemtext', 'text', 'Item');
        AddOnList.addField('custpage_itemdescription', 'textarea', 'Description');
        var fldACLSelect = AddOnList.addField('custpage_license_acl', 'select', 'License/ACL');
        fldACLSelect.setDisplaySize(260);
        fldACLSelect.addSelectOption('', '');
        //var fldLicLink = AddOnList.addField('custpage_license_link', 'text', 'License Link');
        //fldLicLink.setDisplayType('inline');
		AddOnList.addField('custpage_parent_sku_line', 'float', 'Parent SKU Line').setDisplayType('hidden');;
        var eventList = form.addSubList('custpage_eventlist', 'list', 'Event Items', 'custpage_eventstab');
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
		AddOnList.addField('custpage_parent_sku_line_event', 'float', 'Parent SKU Line').setDisplayType('hidden');
        sourceContacts(customerId, fldEventContact);
        sourceEventMasters(fldThisSucks);

        var mngList = form.addSubList('custpage_mnglist', 'list', 'Managed Service Items', 'custpage_mngstab');
        mngList.addField('custpage_itemfamily_mng', 'text').setDisplayType('hidden');
        mngList.addField('custpage_itemid_mng', 'text').setDisplayType('hidden');
        mngList.addField('custpage_acrid_mng', 'text').setDisplayType('hidden');
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
		AddOnList.addField('custpage_parent_sku_line_mng', 'float', 'Parent SKU Line').setDisplayType('hidden');
        sourceContacts(customerId, fldMNGContact);
        //managed Software				
        var mngSoftList = form.addSubList('custpage_mngswlist', 'list', 'Managed Software Items', 'custpage_mngswtab');
        mngSoftList.addField('custpage_itemfamily_mngsw', 'text').setDisplayType('hidden');
        mngSoftList.addField('custpage_itemid_mngsw', 'text').setDisplayType('hidden');
        mngSoftList.addField('custpage_acrid_mngsw', 'text').setDisplayType('hidden');
        mngSoftList.addField('custpage_lineid_mngsw', 'text').setDisplayType('hidden');
        mngSoftList.addField('custpage_orig_license_mngswexisting', 'text').setDisplayType('hidden');
        mngSoftList.addField('custpage_quantity_mngsw', 'float', 'Quantity');
        mngSoftList.addField('custpage_itemtext_mngsw', 'text', 'Item');
        mngSoftList.addField('custpage_itemdescription_mngsw', 'textarea', 'Description');
        var fldMNGSWSelectExisting = mngSoftList.addField('custpage_license_mngswexisting', 'select', 'Existing MNG Software Record');
        fldMNGSWSelectExisting.setDisplaySize(260);
        var fldMNGSWContact = mngSoftList.addField('custpage_contact_mngsw', 'select', 'Managed Software Contact');
        fldMNGSWContact.setMandatory(true);
        fldMNGSWContact.setDisplaySize(260);

        sourceContacts(customerId, fldMNGSWContact);


        var mngAddOnList = form.addSubList('custpage_mngaddonlist', 'list', 'Managed Service Add-Ons', 'custpage_mngstab');
        mngAddOnList.addField('custpage_itemfamily_mng_addon', 'text').setDisplayType('hidden');
        mngAddOnList.addField('custpage_itemid_mng_addon', 'text').setDisplayType('hidden');
        mngAddOnList.addField('custpage_acrid_mng_addon', 'text').setDisplayType('hidden');
        mngAddOnList.addField('custpage_lineid_mng_addon', 'text').setDisplayType('hidden');
        mngAddOnList.addField('custpage_mng_addoncomponents', 'text').setDisplayType('hidden');
        mngAddOnList.addField('custpage_license_select_mng_addon_orig', 'text').setDisplayType('hidden');
        mngAddOnList.addField('custpage_quantity_mng_addon', 'float', 'Quantity');
        mngAddOnList.addField('custpage_itemtext_mng_addon', 'text', 'Item');
        mngAddOnList.addField('custpage_itemdescription_mng_addon', 'textarea', 'Description');
        var fldMNGSelect = mngAddOnList.addField('custpage_license_select_mng_addon', 'select', 'MNG Record');
		AddOnList.addField('custpage_parent_sku_line_mng_addon', 'float', 'Parent SKU Line').setDisplayType('hidden');
        fldMNGSelect.setDisplaySize(260);


        //managed software addons
        var mngSFAddOnList = form.addSubList('custpage_mngsfaddonlist', 'list', 'Managed Software Add-Ons', 'custpage_mngswtab');
        mngSFAddOnList.addField('custpage_itemfamily_mngsf_addon', 'text').setDisplayType('hidden');
        mngSFAddOnList.addField('custpage_itemid_mngsf_addon', 'text').setDisplayType('hidden');
        mngSFAddOnList.addField('custpage_acrid_mngsf_addon', 'text').setDisplayType('hidden');
        mngSFAddOnList.addField('custpage_lineid_mngsf_addon', 'text').setDisplayType('hidden');
        mngSFAddOnList.addField('custpage_mngsf_addoncomponents', 'text').setDisplayType('hidden');
        mngSFAddOnList.addField('custpage_license_select_mngsf_addon_orig', 'text').setDisplayType('hidden');
        mngSFAddOnList.addField('custpage_quantity_mngsf_addon', 'float', 'Quantity');
        mngSFAddOnList.addField('custpage_itemtext_mngsf_addon', 'text', 'Item');
        mngSFAddOnList.addField('custpage_itemdescription_mngsf_addon', 'textarea', 'Description');
        var fldMNGSFSelect = mngSFAddOnList.addField('custpage_license_select_mngsf_addon', 'select', 'MNGSF Record');
        fldMNGSFSelect.setDisplaySize(260);


        var hdwList = form.addSubList('custpage_hdwlist', 'list', 'Hardware Items', 'custpage_hdwtab');
        hdwList.addField('custpage_itemid_hdw', 'text').setDisplayType('hidden');
        hdwList.addField('custpage_lineid_hdw', 'text').setDisplayType('hidden');
        hdwList.addField('custpage_license_hdwexisting_orig', 'text').setDisplayType('hidden');
        hdwList.addField('custpage_quantity_hdw', 'float', 'Quantity');
        hdwList.addField('custpage_itemtext_hdw', 'text', 'Item');
        hdwList.addField('custpage_itemdescription_hdw', 'textarea', 'Description');
        var fldHdwShip = hdwList.addField('custpage_hdwship', 'select', 'Shipping Select');
        fldHdwShip.setDisplaySize(260);
        var fldHdwShipText = hdwList.addField('custpage_hdwshiptext', 'textarea', 'Shipping Address');
        fldHdwShipText.setDisplayType('entry');
        fldHdwShipText.setDisabled(true);
        fldHdwShipText.setMandatory(true);
        fldHdwShipText.setDisplaySize(100, 10);
        var fldHDWContact = hdwList.addField('custpage_contact_hdw', 'select', 'Hardware Contact');
        fldHDWContact.setMandatory(true);
        fldHDWContact.setDisplaySize(260);
		AddOnList.addField('custpage_parent_sku_line_hdw', 'float', 'Parent SKU Line').setDisplayType('hidden');
        sourceContacts(customerId, fldHDWContact);


        var orderObject = getOrderObject(recOrder);
        var arrACLItems = orderObject.getAclItemsByAcr('1,2,6,7,8,9');
        var arrAddOnItems = orderObject.getAddonItemsByAcr('1,2,4,5,6,7,8,9');
        var arrMNGAddOnItems = orderObject.getAddonItemsByAcr('3');
        var arrMNGSFAddOnItems = orderObject.getAddonItemsByAcr('10');
        var arrEventItems = orderObject.getEventItems();
        var arrMNGItems = orderObject.getAclItemsByAcr('3');
        var arrMNGSoftItems = orderObject.getAclItemsByAcr('10');
        var arrHDWItems = orderObject.getHDWItems();
        arrLineItemFamilyIds = orderObject.getItemFamilyIds();

        var addressJSON = sourceAddresses(customerId, fldHdwShip, fldHdwShipText);
        fldAddressJSON.setDefaultValue(addressJSON);
        sourceACLSelect(customerId, fldACLSelect, arrACLItems);
        sourceACLSelectExisting(customerId, fldACLSelectExisting);

        sourceMNGSelect(customerId, fldMNGSelect, arrMNGItems);
        sourceMNGSelectExisting(customerId, fldMNGSelectExisting);

        sourceMNGSFSelect(customerId, fldMNGSFSelect, arrMNGSoftItems);
        sourceMNGSwSelectExisting(customerId, fldMNGSWSelectExisting);

        //build sublist of add-ons
        var currentLineCountAddon = 1;
        for (var i = 0; arrAddOnItems != null && i < arrAddOnItems.length; i++) {
            var listItem = arrAddOnItems[i];
            var itemProperties = listItem['itemProperties'];

            if (listItem['isACL'] == 'F' && (listItem['licenseId'] == '' || listItem['licenseId'] == null || listItem['licenseId'] == 'XXX' || listItem['activationKey'] == '' || listItem['activationKey'] == null || listItem['activationKey'].substr(0, 4) == 'PEND')) {

                var description = listItem['description'];
                if (description != null && description.length > 60) {
                    description = description.substr(0, 60);
                }

                AddOnList.setLineItemValue('custpage_itemid', currentLineCountAddon, listItem['itemId']);
                AddOnList.setLineItemValue('custpage_itemfamily', currentLineCountAddon, itemProperties['custitemr7itemfamily']);
                AddOnList.setLineItemValue('custpage_lineid', currentLineCountAddon, listItem['lineId']);
                AddOnList.setLineItemValue('custpage_acrid', currentLineCountAddon, listItem['acrId']);
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

		nlapiLogExecution('DEBUG','Add-On List Created', '');
        //build sublist of ACLs
        var currentLineCountACL = 1;
        for (var i = 0; arrACLItems != null && i < arrACLItems.length; i++) {
            var listItem = arrACLItems[i];
            var itemProperties = listItem['itemProperties'];

            if (listItem['licenseId'] == '' || listItem['licenseId'] == null || listItem['licenseId'] == 'XXX' || listItem['activationKey'] == '' || listItem['activationKey'] == null || listItem['activationKey'].substr(0, 4) == 'PEND') {

                var description = listItem['description'];
                if (description != null && description.length > 60) {
                    description = description.substr(0, 60);
                }

                ACLList.setLineItemValue('custpage_itemid_acl', currentLineCountACL, listItem['itemId']);
                ACLList.setLineItemValue('custpage_itemfamily_acl', currentLineCountACL, itemProperties['custitemr7itemfamily']);
                ACLList.setLineItemValue('custpage_lineid_acl', currentLineCountACL, listItem['lineId']);
                ACLList.setLineItemValue('custpage_quantity_acl', currentLineCountACL, parseFloat(listItem['quantity']));
                ACLList.setLineItemValue('custpage_itemtext_acl', currentLineCountACL, itemProperties['displayname']);
                ACLList.setLineItemValue('custpage_itemdescription_acl', currentLineCountACL, description);
                ACLList.setLineItemValue('custpage_contact_acl', currentLineCountACL, listItem['contact']);
                ACLList.setLineItemValue('custpage_license_aclexisting', currentLineCountACL, listItem['activationKey']);
                ACLList.setLineItemValue('custpage_license_aclexisting_orig', currentLineCountACL, listItem['activationKey']);
				ACLList.setLineItemValue('custpage_parent_sku_line_acl', currentLineCountACL, parseFloat(listItem['parentLineId']));
                currentLineCountACL++;
            }
        }

		nlapiLogExecution('DEBUG','ACL List Created', '');
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

                eventList.setLineItemValue('custpage_itemid_event', currentLineCountEvent, listItem['itemId']);
                eventList.setLineItemValue('custpage_lineid_event', currentLineCountEvent, listItem['lineId']);
                eventList.setLineItemValue('custpage_quantity_event', currentLineCountEvent, parseFloat(listItem['quantity']));
                eventList.setLineItemValue('custpage_itemtext_event', currentLineCountEvent, itemProperties['displayname']);
                eventList.setLineItemValue('custpage_itemdescription_event', currentLineCountEvent, description);
                eventList.setLineItemValue('custpage_thissucks', currentLineCountEvent, defaultEvent);
                eventList.setLineItemValue('custpage_license_eventexisting_orig', currentLineCountEvent, defaultEvent);
                eventList.setLineItemValue('custpage_contact_event', currentLineCountEvent, listItem['contact']);
				eventList.setLineItemValue('custpage_parent_sku_line_event', currentLineCountEvent, parseFloat(listItem['parentLineId']));
                currentLineCountEvent++;
            }
        }
		nlapiLogExecution('DEBUG','EVENT List Created', '');
        //build sublist of MNG Records
        var currentLineCountMNG = 1;
        for (var i = 0; arrMNGItems != null && i < arrMNGItems.length; i++) {
            var listItem = arrMNGItems[i];
            var itemProperties = listItem['itemProperties'];

            if (listItem['licenseId'] == '' || listItem['licenseId'] == null || listItem['licenseId'] == 'XXX' || listItem['activationKey'] == '' || listItem['activationKey'] == null) {

                var description = listItem['description'];
                if (description != null && description.length > 60) {
                    description = description.substr(0, 60);
                }

                mngList.setLineItemValue('custpage_itemid_mng', currentLineCountMNG, listItem['itemId']);
                mngList.setLineItemValue('custpage_acrid_mng', currentLineCountMNG, listItem['acrId']);
                mngList.setLineItemValue('custpage_lineid_mng', currentLineCountMNG, listItem['lineId']);
                mngList.setLineItemValue('custpage_quantity_mng', currentLineCountMNG, parseFloat(listItem['quantity']));
                mngList.setLineItemValue('custpage_itemtext_mng', currentLineCountMNG, itemProperties['displayname']);
                mngList.setLineItemValue('custpage_itemdescription_mng', currentLineCountMNG, description);
                mngList.setLineItemValue('custpage_license_mngexisting', currentLineCountMNG, listItem['activationKey']);
                mngList.setLineItemValue('custpage_orig_license_mngexisting', currentLineCountMNG, listItem['activationKey']);
                mngList.setLineItemValue('custpage_contact_mng', currentLineCountMNG, listItem['contact']);
				mngList.setLineItemValue('custpage_parent_sku_line_mng', currentLineCountMNG, parseFloat(listItem['parentLineId']));
				currentLineCountMNG++;
            }
        }

        //build sublist of MNG Soft Records
        var currentLineCountMNGSoft = 1;
        for (var i = 0; arrMNGSoftItems != null && i < arrMNGSoftItems.length; i++) {
            var listItem = arrMNGSoftItems[i];
            var itemProperties = listItem['itemProperties'];

            if (listItem['licenseId'] == '' || listItem['licenseId'] == null || listItem['licenseId'] == 'XXX' || listItem['activationKey'] == '' || listItem['activationKey'] == null) {

                var description = listItem['description'];
                if (description != null && description.length > 60) {
                    description = description.substr(0, 60);
                }

                mngSoftList.setLineItemValue('custpage_itemid_mngsw', currentLineCountMNGSoft, listItem['itemId']);
                mngSoftList.setLineItemValue('custpage_acrid_mngsw', currentLineCountMNGSoft, listItem['acrId']);
                mngSoftList.setLineItemValue('custpage_lineid_mngsw', currentLineCountMNGSoft, listItem['lineId']);
                mngSoftList.setLineItemValue('custpage_quantity_mngsw', currentLineCountMNGSoft, parseFloat(listItem['quantity']));
                mngSoftList.setLineItemValue('custpage_itemtext_mngsw', currentLineCountMNGSoft, itemProperties['displayname']);
                mngSoftList.setLineItemValue('custpage_itemdescription_mngsw', currentLineCountMNGSoft, description);
                mngSoftList.setLineItemValue('custpage_license_mngswexisting', currentLineCountMNGSoft, listItem['activationKey']);
                mngSoftList.setLineItemValue('custpage_orig_license_mngswexisting', currentLineCountMNGSoft, listItem['activationKey']);
                mngSoftList.setLineItemValue('custpage_contact_mngsw', currentLineCountMNGSoft, listItem['contact']);
                currentLineCountMNGSoft++;
            }
        }




        //build sublist of MNG AddOns
        var currentLineCountMNGAddOns = 1;
        for (var i = 0; arrMNGAddOnItems != null && i < arrMNGAddOnItems.length; i++) {
            var listItem = arrMNGAddOnItems[i];
            var itemProperties = listItem['itemProperties'];

            if (listItem['isACL'] == 'F' && (listItem['licenseId'] == '' || listItem['licenseId'] == null || listItem['licenseId'] == 'XXX' || listItem['activationKey'] == '' || listItem['activationKey'] == null)) {

                var description = listItem['description'];
                if (description != null && description.length > 60) {
                    description = description.substr(0, 60);
                }

                mngAddOnList.setLineItemValue('custpage_itemid_mng_addon', currentLineCountMNGAddOns, listItem['itemId']);
                mngAddOnList.setLineItemValue('custpage_acrid_mng_addon', currentLineCountMNGAddOns, listItem['acrId']);
                mngAddOnList.setLineItemValue('custpage_lineid_mng_addon', currentLineCountMNGAddOns, listItem['lineId']);
                mngAddOnList.setLineItemValue('custpage_quantity_mng_addon', currentLineCountMNGAddOns, parseFloat(listItem['quantity']));
                mngAddOnList.setLineItemValue('custpage_mng_addoncomponents', currentLineCountMNGAddOns, listItem['addOns']);
                mngAddOnList.setLineItemValue('custpage_itemtext_mng_addon', currentLineCountMNGAddOns, itemProperties['displayname']);
                mngAddOnList.setLineItemValue('custpage_itemdescription_mng_addon', currentLineCountMNGAddOns, description);
                mngAddOnList.setLineItemValue('custpage_license_select_mng_addon', currentLineCountMNGAddOns, listItem['activationKey']);
                mngAddOnList.setLineItemValue('custpage_license_select_mng_addon_orig', currentLineCountMNGAddOns, listItem['activationKey']);
                mngAddOnList.setLineItemValue('custpage_contact_mng_addon', currentLineCountMNGAddOns, listItem['contact']);
				mngAddOnList.setLineItemValue('custpage_parent_sku_line_mng_addon', currentLineCountMNGAddOns, parseFloat(listItem['parentLineId']));
                currentLineCountMNGAddOns++;
            }
        }

        //build sublist of MNGSF AddOns
        var currentLineCountMNGSFAddOns = 1;
        for (var i = 0; arrMNGSFAddOnItems != null && i < arrMNGSFAddOnItems.length; i++) {
            var listItem = arrMNGSFAddOnItems[i];
            var itemProperties = listItem['itemProperties'];

            if (listItem['isACL'] == 'F' && (listItem['licenseId'] == '' || listItem['licenseId'] == null || listItem['licenseId'] == 'XXX' || listItem['activationKey'] == '' || listItem['activationKey'] == null)) {

                var description = listItem['description'];
                if (description != null && description.length > 60) {
                    description = description.substr(0, 60);
                }

                mngSFAddOnList.setLineItemValue('custpage_itemid_mngsf_addon', currentLineCountMNGSFAddOns, listItem['itemId']);
                mngSFAddOnList.setLineItemValue('custpage_acrid_mngsf_addon', currentLineCountMNGSFAddOns, listItem['acrId']);
                mngSFAddOnList.setLineItemValue('custpage_lineid_mngsf_addon', currentLineCountMNGSFAddOns, listItem['lineId']);
                mngSFAddOnList.setLineItemValue('custpage_quantity_mngsf_addon', currentLineCountMNGSFAddOns, parseFloat(listItem['quantity']));
                mngSFAddOnList.setLineItemValue('custpage_mngsf_addoncomponents', currentLineCountMNGSFAddOns, listItem['addOns']);
                mngSFAddOnList.setLineItemValue('custpage_itemtext_mngsf_addon', currentLineCountMNGSFAddOns, itemProperties['displayname']);
                mngSFAddOnList.setLineItemValue('custpage_itemdescription_mngsf_addon', currentLineCountMNGSFAddOns, description);
                mngSFAddOnList.setLineItemValue('custpage_license_select_mngsf_addon', currentLineCountMNGSFAddOns, listItem['activationKey']);
                mngSFAddOnList.setLineItemValue('custpage_license_select_mngsf_addon_orig', currentLineCountMNGSFAddOns, listItem['activationKey']);
                mngSFAddOnList.setLineItemValue('custpage_contact_mngsf_addon', currentLineCountMNGSFAddOns, listItem['contact']);
                currentLineCountMNGSFAddOns++;
            }
        }

        //build sublist of HDW
        var currentLineCountHDWs = 1;
        for (var i = 0; arrHDWItems != null && i < arrHDWItems.length; i++) {
            var listItem = arrHDWItems[i];

            if (listItem['licenseId'] == '' || listItem['licenseId'] == null || listItem['licenseId'] == 'XXX' || listItem['shipping'] == '' || listItem['shipping'] == null) {

                var description = listItem['description'];
                if (description != null && description.length > 60) {
                    description = description.substr(0, 400);
                }

                hdwList.setLineItemValue('custpage_itemid_hdw', currentLineCountHDWs, listItem['itemId']);
                hdwList.setLineItemValue('custpage_lineid_hdw', currentLineCountHDWs, listItem['lineId']);
                hdwList.setLineItemValue('custpage_quantity_hdw', currentLineCountHDWs, parseFloat(listItem['quantity']));
                hdwList.setLineItemValue('custpage_itemtext_hdw', currentLineCountHDWs, listItem['itemProperties']['displayname']);
                hdwList.setLineItemValue('custpage_itemdescription_hdw', currentLineCountHDWs, description);
                hdwList.setLineItemValue('custpage_hdwshiptext', currentLineCountHDWs, listItem['shipping']);
                hdwList.setLineItemValue('custpage_hdwship_orig', currentLineCountHDWs, listItem['shipping']);
                hdwList.setLineItemValue('custpage_contact_hdw', currentLineCountHDWs, listItem['contact']);
				hdwList.setLineItemValue('custpage_parent_sku_line_hdw', currentLineCountHDWs, parseFloat(listItem['parentLineId']));
                currentLineCountHDWs++;
            }
        }

		nlapiLogExecution('DEBUG','HDW List Created', '');
        if (arrEventItems == null || arrEventItems.length < 1) {
            eventList.setDisplayType('hidden');
        }
        if (arrACLItems == null || arrACLItems.length < 1) {
            ACLList.setDisplayType('hidden');
        }
        if (arrAddOnItems == null || arrAddOnItems.length < 1) {
            AddOnList.setDisplayType('hidden');
        }
        if (arrMNGItems == null || arrMNGItems.length < 1) {
            mngList.setDisplayType('hidden');
        }
        if (arrMNGSoftItems == null || arrMNGSoftItems.length < 1) {
            mngSoftList.setDisplayType('hidden');
        }
        if (arrMNGAddOnItems == null || arrMNGAddOnItems.length < 1) {
            mngAddOnList.setDisplayType('hidden');
        }
        if (arrMNGSFAddOnItems == null || arrMNGSFAddOnItems.length < 1) {
            mngSFAddOnList.setDisplayType('hidden');
        }



        form.addSubmitButton('Submit');

        response.writePage(form);

    }

    if (request.getMethod() == 'POST') {
        return retry({
            maxTries: 3,
            functionToExecute: postMethod,
            arguments: [],
            retryOnError: 'RCRD_HAS_BEEN_CHANGED'
        });
    }
}

function postMethod(){
    this.orderId = request.getParameter('custpage_orderid');
    this.orderType = request.getParameter('custpage_ordertype');
    var recOrder = nlapiLoadRecord(this.orderType, this.orderId);
    this.arrItemACRIds = grabLineItemACRIds(recOrder);
    nlapiLogExecution('DEBUG', 'POST', request);


    reAssociateItems(recOrder);

    var updateOrderDates = true;
    if (recOrder.getRecordType() == 'salesorder' && recOrder.getFieldValue('status') != 'Pending Approval') {
        updateOrderDates = false;
    }


    var dateToday = new Date();
    var strToday = nlapiDateToString(dateToday);

    this.arrParentEndDates = new Array();
    this.arrParentStartDates = new Array();
    this.prevLineStartDate = null;
    this.prevLineEndDate = null;
    this.currentFollowerCount = 1; //used to keep track of newrentech/newrensub dates
    //map items by lineID
    var orderLineCount = recOrder.getLineItemCount('item');
    this.itemLineNums = new Array();
    for (var i = 1; i <= orderLineCount; i++) {
        var lineId = recOrder.getLineItemValue('item', 'id', i);
        itemLineNums[lineId] = i;
    }

    //break out items
    var orderObject = getOrderObject(recOrder);
    var arrACLItems = orderObject.getAclItemsByAcr('1,2,6,7,8,9');
    var arrAddOnItems = orderObject.getAddonItemsByAcr('1,2,4,5,6,7,8,9');
    var arrMNGAddOnItems = orderObject.getAddonItemsByAcr('3');
    var arrMNGSFAddOnItems = orderObject.getAddonItemsByAcr('10');
    var arrEventItems = orderObject.getEventItems();
    var arrMNGItems = orderObject.getAclItemsByAcr('3');
    var arrMNGSWItems = orderObject.getAclItemsByAcr('10');
    var arrHDWItems = orderObject.getHDWItems();

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
        var activationKey = recOrder.getLineItemValue('item', 'custcolr7itemmsproductkey', lineNum);

        if (licenseId == null || licenseId == '' || licenseId == 'XXX' || activationKey == '' || activationKey == null || activationKey.substr(0, 4) == 'PEND') {

            if (activationKey == '' || activationKey == null || activationKey.substr(0, 4) == 'PEND') {
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
        var acrId = request.getLineItemValue('custpage_addonitems', 'custpage_acrid', j);
        var addOns = request.getLineItemValue('custpage_addonitems', 'custpage_addoncomponents', j);
        var parentACLId = request.getLineItemValue('custpage_addonitems', 'custpage_license_acl', j);
        var lineNum = itemLineNums[lineId];

        nlapiLogExecution('DEBUG', 'process AddOn Item Associations ', JSON.stringify({
            itemId: itemId,
            lineId: lineId,
            acrId: acrId,
            addOns: addOns,
            parentACLId: parentACLId,
            lineNum: lineNum
        }));

        var lineItem = orderObject.getItemByLineIndex(lineNum);
        lineItem['addOns'] = addOns;
        lineItem['lineNum'] = lineNum;
        lineItem['acrId'] = acrId;

        if (parentACLId != null && parentACLId != '') {
            if (parentACLId.substr(0, 3) == 'PK:') {
                recOrder.setLineItemValue('item', 'custcolr7itemmsproductkey', lineNum, parentACLId.substr(3));
                //for 1price upsell, populate license id
                if (recOrder.getLineItemValue('item', 'custcolr7_one_item_flow', lineNum) == 2) {
                    //var nxfilters = [];
                    //nxfilters[0] = new nlobjSearchFilter('custrecordr7nxproductkey', null, 'is', parentACLId.substr(3));
                    //var nxcolumns = [];
                    //nxcolumns[0] = new nlobjSearchColumn('internalid');
                    //nxcolumns[1] = new nlobjSearchColumn('custrecordr7nxproductkey');
                    //nxcolumns[2] = new nlobjSearchColumn('name');
                    //var nxresults = nlapiSearchRecord('customrecordr7nexposelicensing', null, nxfilters, nxcolumns);
                    //for (var n = 0; nxresults != null && n < nxresults.length; n++) {
                    //    var name = nxresults[n].getValue('name');
                    //    recOrder.setLineItemValue('item', 'custcolr7translicenseid', lineNum, name);
                    //}
                    updateOrderDates = true;
                }
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

    //set contacts and pks
    nlapiLogExecution('DEBUG', 'MNGSoftLineCount', request.getLineItemCount('custpage_mngswlist'))
    var MNGSoftLineCount = request.getLineItemCount('custpage_mngswlist');
    for (var k = 1; k <= MNGSoftLineCount; k++) {
        nlapiLogExecution('DEBUG', 'itemId ', itemId);
        nlapiLogExecution('DEBUG', 'lineId ', lineId);
        nlapiLogExecution('DEBUG', 'contactId ', contactId);
        var itemId = request.getLineItemValue('custpage_mngswlist', 'custpage_itemid_mngsw', k);
        var lineId = request.getLineItemValue('custpage_mngswlist', 'custpage_lineid_mngsw', k);
        var contactId = request.getLineItemValue('custpage_mngswlist', 'custpage_contact_mngsw', k);
        var existingId = request.getLineItemValue('custpage_mngswlist', 'custpage_license_mngswexisting', k);
        var lineNum = itemLineNums[lineId];

        if (contactId != '' && contactId != null) {
            recOrder.setLineItemValue('item', 'custcolr7translinecontact', lineNum, contactId);
        }

        recOrder.setLineItemValue('item', 'custcolr7managedsoftwareid', lineNum, existingId);
    }

    //process MNGSF items
    for (var i = 0; arrMNGSWItems != null && i < arrMNGSWItems.length; i++) {
        var mngSwItem = arrMNGSWItems[i];
        var lineId = mngSwItem['lineId'];
        var itemId = mngSwItem['itemId'];
        var licenseId = mngSwItem['licenseId'];
        var lineNum = itemLineNums[lineId];
        mngSwItem['lineNum'] = lineNum;
        var msId = recOrder.getLineItemValue('item', 'custcolr7managedsoftwareid', lineNum);

        if (licenseId == null || licenseId == '' || licenseId == 'XXX' || msId == '' || msId == null || msId.substr(0, 4) == 'PEND') {

            if (msId == '' || msId == null || msId.substr(0, 4) == 'PEND') {
                recOrder.setLineItemValue('item', 'custcolr7managedsoftwareid', lineNum, 'PEND:' + lineId);
            }

            if (updateOrderDates) {
                recOrder = processLineItemDates(recOrder, mngSwItem, null, orderObject);
            }
        }
    }

    //process MNG AddOn Item Associations
    var mngAddOnLineCount = request.getLineItemCount('custpage_mngaddonlist');
    for (var j = 1; j <= mngAddOnLineCount; j++) {
        var itemId = request.getLineItemValue('custpage_mngaddonlist', 'custpage_itemid_mng_addon', j);
        var acrId = request.getLineItemValue('custpage_mngaddonlist', 'custpage_acrid_mng_addon', j);
        var lineId = request.getLineItemValue('custpage_mngaddonlist', 'custpage_lineid_mng_addon', j);
        var addOns = request.getLineItemValue('custpage_mngaddonlist', 'custpage_mng_addoncomponents', j);
        var parentACLId = request.getLineItemValue('custpage_mngaddonlist', 'custpage_license_select_mng_addon', j);
        var lineNum = itemLineNums[lineId];

        var lineItem = orderObject.getItemByLineIndex(lineNum);
        lineItem['addOns'] = addOns;
        lineItem['lineNum'] = lineNum;
        lineItem['acrId'] = acrId;

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

    //process MNGSF AddOn Item Associations
    var mngsfAddOnLineCount = request.getLineItemCount('custpage_mngsfaddonlist');
    for (var j = 1; j <= mngsfAddOnLineCount; j++) {
        var itemId = request.getLineItemValue('custpage_mngsfaddonlist', 'custpage_itemid_mngsf_addon', j);
        var acrId = request.getLineItemValue('custpage_mngsfaddonlist', 'custpage_acrid_mngsf_addon', j);
        var lineId = request.getLineItemValue('custpage_mngsfaddonlist', 'custpage_lineid_mngsf_addon', j);
        var addOns = request.getLineItemValue('custpage_mngsfaddonlist', 'custpage_mngsf_addoncomponents', j);
        var parentACLId = request.getLineItemValue('custpage_mngsfaddonlist', 'custpage_license_select_mngsf_addon', j);
        var lineNum = itemLineNums[lineId];

        var lineItem = orderObject.getItemByLineIndex(lineNum);
        lineItem['addOns'] = addOns;
        lineItem['lineNum'] = lineNum;
        lineItem['acrId'] = acrId;

        if (parentACLId != null && parentACLId != '') {
            if (parentACLId.substr(0, 3) == 'PK:') {
                recOrder.setLineItemValue('item', 'custcolr7managedsoftwareid', lineNum, parentACLId.substr(3));
            }
            else {
                recOrder.setLineItemValue('item', 'custcolr7managedsoftwareid', lineNum, 'PEND:' + parentACLId);
            }

            if (updateOrderDates) {
                recOrder = processLineItemDates(recOrder, lineItem, null, orderObject);
            }
        }
        else {
            recOrder.setLineItemValue('item', 'custcolr7managedsoftwareid', lineNum, '');
        }
    }

    //process sublist of HDW
    var currentLineCountHDWs = request.getLineItemCount('custpage_hdwlist');
    for (var i = 1; i <= currentLineCountHDWs; i++) {
        var itemId = request.getLineItemValue('custpage_hdwlist', 'custpage_itemid_hdw', i);
        var lineId = request.getLineItemValue('custpage_hdwlist', 'custpage_lineid_hdw', i);
        var shipping = request.getLineItemValue('custpage_hdwlist', 'custpage_hdwshiptext', i);
        var contactId = request.getLineItemValue('custpage_hdwlist', 'custpage_contact_hdw', i);
        var lineNum = itemLineNums[lineId];

        if (shipping != null && shipping != '') {
            recOrder.setLineItemValue('item', 'custcolr7lineshipaddress', lineNum, shipping);
        }
        else {
            recOrder.setLineItemValue('item', 'custcolr7lineshipaddress', lineNum, '');
        }

        if (contactId != '' && contactId != null) {
            recOrder.setLineItemValue('item', 'custcolr7translinecontact', lineNum, contactId);
        }

    }


    if (updateOrderDates) {
        determineOrderStartEndDates(recOrder, null, orderObject);
    }
    updateChildLinesFromParent(recOrder,  orderObject);
    recOrder.setFieldValue('custbodyr7orderassociated', 'T');
    var updatedOrderId = nlapiSubmitRecord(recOrder, true, true);
    nlapiLogExecution('DEBUG', 'updatedOrderId', updatedOrderId);
    nlapiSetRedirectURL('RECORD', this.orderType, this.orderId, 'view');
    //response.writeLine("<html><body onload='win_close()'><script language='Javascript'>function win_close(){ window.opener = top; window.close(); }</script></body></html>");

}
//for lines with a parent line hash populated
//populate values on child lines from parent line
function updateChildLinesFromParent(recOrder, orderObject) {
    nlapiLogExecution('DEBUG', 'updateChildLinesFromParent started');
    var isNXPIVMMigration = orderObject && orderObject.isNXPIVMMigration;
    var orderLineCount = recOrder.getLineItemCount('item');
    for (var i = 1; i <= orderLineCount; i++) {
        var parentLineHash = recOrder.getLineItemValue('item', 'custcolr7_parentlinehash', i);
        var isEarlyRenewal = recOrder.getLineItemValue('item', 'custcol_r7_early_renewal', i);
        if (parentLineHash != null && parentLineHash != '') {
            nlapiLogExecution('DEBUG', 'parentLineHash found', parentLineHash);
            for (var j = 1; j <= orderLineCount; j++) {
                var lineHash = recOrder.getLineItemValue('item', 'custcolr7_linehash', j);
                if (parentLineHash == lineHash) {
                    var currentItemType = recOrder.getLineItemValue('item', 'itemtype', i);
                    if (currentItemType != 'Discount' && !isNXPIVMMigration && isEarlyRenewal != 'T') {
                        recOrder.setLineItemValue('item', 'custcolr7startdate', i, recOrder.getLineItemValue('item', 'custcolr7startdate', j));
                        recOrder.setLineItemValue('item', 'custcolr7enddate', i, recOrder.getLineItemValue('item', 'custcolr7enddate', j));
                    }
                    recOrder.setLineItemValue('item', 'location', i, recOrder.getLineItemValue('item', 'location', j));
                }
            }
        }
    }
    nlapiLogExecution('DEBUG', 'updateChildLinesFromParent finished');
}

function getOrderACRIdObject(arrItemACRIds) {

    var objOrderACRs = {};

    for (var lineId in arrItemACRIds) {
        if (arrItemACRIds[lineId]) {
            objOrderACRs[arrItemACRIds[lineId]] = true;
        }
    }
    return objOrderACRs;
}

function sourceAddresses(customerId, fldHdwShip, fldHdwShipText) {

    fldHdwShip.addSelectOption('', '', true);
    fldHdwShip.addSelectOption('new', '- New -');

    var objAddys = new Object;
    objAddys.address = new Array();
    if (customerId != null && customerId != '') {

        var arrSearchFilters = new Array();
        arrSearchFilters[0] = new nlobjSearchFilter('internalid', null, 'is', customerId);

        var arrSearchColumns = new Array();
        arrSearchColumns[0] = new nlobjSearchColumn('addressinternalid');
        arrSearchColumns[1] = new nlobjSearchColumn('address').setSort(true);
        arrSearchColumns[2] = new nlobjSearchColumn('isdefaultbilling');
        arrSearchColumns[3] = new nlobjSearchColumn('isdefaultshipping');
        arrSearchColumns[4] = new nlobjSearchColumn('addresslabel');

        var arrSearchResults = nlapiSearchRecord('customer', null, arrSearchFilters, arrSearchColumns);

        for (var i = 0; arrSearchResults != null && i < arrSearchResults.length; i++) {

            var id = arrSearchResults[i].getValue(arrSearchColumns[0]);
            var label = arrSearchResults[i].getValue(arrSearchColumns[4]);
            var isDefaultBill = arrSearchResults[i].getValue(arrSearchColumns[2]);
            var isDefaultShip = arrSearchResults[i].getValue(arrSearchColumns[3]);
            var addressText = arrSearchResults[i].getValue(arrSearchColumns[1]);
            addressText = addressText.replace(new RegExp("\r\n", 'g'), "\n");
            addressText = addressText.replace(new RegExp("\n", 'g'), "\n");
            addressText = addressText.replace(new RegExp("\r", 'g'), "\n");

            if (isDefaultBill == 'T' && isDefaultShip == 'F') {
                label += ' (Default Billing)';
            }
            else
                if (isDefaultShip == 'T' && isDefaultBill == 'F') {
                    label += ' (Default Shipping)';
                }
                else
                    if (isDefaultShip == 'T' && isDefaultBill == 'T') {
                        label += ' (Default Billing + Shipping)';
                    }

            fldHdwShip.addSelectOption(id, label);

            var address = new Object;
            address.id = id;
            address.address = addressText;
            objAddys.address[objAddys.address.length] = address;
        }
    }
    return JSON.stringify(objAddys);
}

function sourceACLSelectExisting(customerId, fld) {

    var objOrderACRs = getOrderACRIdObject(arrItemACRIds);

    fld.addSelectOption('', '--- NEW LICENSE ---');

    if (objOrderACRs.hasOwnProperty('1')) {
        //all current NX licenses
        var arrFilters = new Array();
        arrFilters[0] = new nlobjSearchFilter('custrecordr7nxlicensecustomer', null, 'is', customerId);
        arrFilters[1] = new nlobjSearchFilter('custrecordr7nxordertype', null, 'is', 1);
        arrFilters[2] = new nlobjSearchFilter('custrecordr7nxlicenseexpirationdate', null, 'onorafter', 'daysago365');
        arrFilters[3] = new nlobjSearchFilter('custrecordcustrecordr7nxlicenseitemfamil', null, 'anyof', arrLineItemFamilyIds);

        var arrColumns = new Array();
        arrColumns[0] = new nlobjSearchColumn('custrecordr7nxproductkey');
        arrColumns[1] = new nlobjSearchColumn('formulatext');
        arrColumns[1].setFormula('to_char({custrecordr7nxlicenseexpirationdate},\'MON YYYY\')');
        arrColumns[2] = new nlobjSearchColumn('internalid').setSort(true);
        arrColumns[3] = new nlobjSearchColumn('custrecordcustrecordr7nxlicenseitemfamil');
        arrColumns[4] = new nlobjSearchColumn("custrecordr7nxlicense_parentlicense");

        var arrResults = nlapiSearchRecord('customrecordr7nexposelicensing', null, arrFilters, arrColumns);

        for (var i = 0; arrResults != null && i < arrResults.length; i++) {

            var nxLicenseId = arrResults[i].getId();
            var activationKey = arrResults[i].getValue(arrColumns[0]);
            var dateExpired = arrResults[i].getValue(arrColumns[1]);
            var itemFamily = arrResults[i].getText(arrColumns[3]);
            if (itemFamily != null && itemFamily != '') {
                itemFamily = itemFamily + ': ';
            }
            var parentLicenseId = arrResults[i].getText(arrColumns[4]);

            var optionText = 'NXL: ' + activationKey.substr(0, 9) + ' (' + itemFamily + dateExpired + ')';

            if (parentLicenseId) {
                optionText += ' [CHILD]'
            }
            else {
                optionText += ' [PARENT]'
            }

            fld.addSelectOption(activationKey, optionText);
        }
    }

    if (objOrderACRs.hasOwnProperty('2')) {
        //all current MS licenses
        var arrFilters = new Array();
        arrFilters[0] = new nlobjSearchFilter('custrecordr7mslicensecustomer', null, 'is', customerId);
        arrFilters[1] = new nlobjSearchFilter('custrecordr7msordertype', null, 'anyof', new Array(1, 2, 4));
        arrFilters[2] = new nlobjSearchFilter('custrecordr7mslicenseexpirationdate', null, 'onorafter', 'daysago365');
        arrFilters[3] = new nlobjSearchFilter('custrecordr7mslicenseitemfamily', null, 'anyof', arrLineItemFamilyIds);

        var arrColumns = new Array();
        arrColumns[0] = new nlobjSearchColumn('custrecordr7msproductkey');
        arrColumns[1] = new nlobjSearchColumn('formulatext');
        arrColumns[1].setFormula('to_char({custrecordr7mslicenseexpirationdate},\'MON YYYY\')');
        arrColumns[2] = new nlobjSearchColumn('internalid').setSort(true);
        arrColumns[3] = new nlobjSearchColumn('custrecordr7mslicenseitemfamily');

        var arrResults = nlapiSearchRecord('customrecordr7metasploitlicensing', null, arrFilters, arrColumns);

        for (var i = 0; arrResults != null && i < arrResults.length; i++) {

            var msLicenseId = arrResults[i].getId();
            var activationKey = arrResults[i].getValue(arrColumns[0]);
            var dateExpired = arrResults[i].getValue(arrColumns[1]);
            var itemFamily = arrResults[i].getText(arrColumns[3]);
            if (itemFamily != null && itemFamily != '') {
                itemFamily = itemFamily + ': ';
            }

            var optionText = 'MSL: ' + activationKey.substr(0, 9) + ' (' + itemFamily + dateExpired + ')';

            fld.addSelectOption(activationKey, optionText);
        }
    }

    if (objOrderACRs.hasOwnProperty('6')) {
        //all current MB licenses
        var arrFilters = new Array();
        arrFilters[0] = new nlobjSearchFilter('custrecordr7mblicensecustomer', null, 'is', customerId);
        arrFilters[1] = new nlobjSearchFilter('custrecordr7mblicense_period_end', null, 'onorafter', 'daysago365');
        arrFilters[2] = new nlobjSearchFilter('custrecordr7mblicenseitemfamily', null, 'anyof', arrLineItemFamilyIds);

        var arrColumns = new Array();
        arrColumns[0] = new nlobjSearchColumn('custrecordr7mblicenseproductkey');
        arrColumns[1] = new nlobjSearchColumn('formulatext');
        arrColumns[1].setFormula('to_char({custrecordr7mblicense_period_end},\'MON YYYY\')');
        arrColumns[2] = new nlobjSearchColumn('internalid').setSort(true);
        arrColumns[3] = new nlobjSearchColumn('custrecordr7mblicenseitemfamily');

        var arrResults = nlapiSearchRecord('customrecordr7mobilisafelicense', null, arrFilters, arrColumns);

        for (var i = 0; arrResults != null && i < arrResults.length; i++) {

            var msLicenseId = arrResults[i].getId();
            var activationKey = arrResults[i].getValue(arrColumns[0]);
            var dateExpired = arrResults[i].getValue(arrColumns[1]);
            var itemFamily = arrResults[i].getText(arrColumns[3]);
            if (itemFamily != null && itemFamily != '') {
                itemFamily = itemFamily + ': ';
            }

            var optionText = 'MBL: ' + activationKey.substr(0, 9) + ' (' + itemFamily + dateExpired + ')';

            fld.addSelectOption(activationKey, optionText);
        }
    }

    if (objOrderACRs.hasOwnProperty('7')) {
        //all current UI licenses
        var arrFilters = new Array();
        arrFilters[0] = new nlobjSearchFilter('custrecordr7uilicensecustomer', null, 'is', customerId);
        arrFilters[1] = new nlobjSearchFilter('custrecordr7uilicenseexpirationdate', null, 'onorafter', 'daysago365');
        arrFilters[2] = new nlobjSearchFilter('custrecordr7uilicenseitemfamily', null, 'anyof', arrLineItemFamilyIds);

        var arrColumns = new Array();
        arrColumns[0] = new nlobjSearchColumn('custrecordr7uilicenseproductkey');
        arrColumns[1] = new nlobjSearchColumn('formulatext');
        arrColumns[1].setFormula('to_char({custrecordr7uilicenseexpirationdate},\'MON YYYY\')');
        arrColumns[2] = new nlobjSearchColumn('internalid').setSort(true);
        arrColumns[3] = new nlobjSearchColumn('custrecordr7uilicenseitemfamily');

        var arrResults = nlapiSearchRecord('customrecordr7userinsightlicense', null, arrFilters, arrColumns);

        for (var i = 0; arrResults != null && i < arrResults.length; i++) {

            var nxLicenseId = arrResults[i].getId();
            var activationKey = arrResults[i].getValue(arrColumns[0]);
            var dateExpired = arrResults[i].getValue(arrColumns[1]);
            var itemFamily = arrResults[i].getText(arrColumns[3]);
            if (itemFamily != null && itemFamily != '') {
                itemFamily = itemFamily + ': ';
            }
            var optionText = 'UIL: ' + activationKey.substr(0, 9) + ' (' + itemFamily + dateExpired + ')';

            fld.addSelectOption(activationKey, optionText);
        }
    }

    if (objOrderACRs.hasOwnProperty('8')) {
        //all current AS licenses
        var arrFilters = new Array();
        arrFilters[0] = new nlobjSearchFilter('custrecordr7asplicensecustomer', null, 'is', customerId);
        arrFilters[1] = new nlobjSearchFilter('custrecordr7asplicenseexpirationdate', null, 'onorafter', 'daysago365');
        arrFilters[2] = new nlobjSearchFilter('custrecordr7asplicenseitemfamily', null, 'anyof', arrLineItemFamilyIds);

        var arrColumns = new Array();
        arrColumns[0] = new nlobjSearchColumn('custrecordr7asplicenseproductkey');
        arrColumns[1] = new nlobjSearchColumn('formulatext');
        arrColumns[1].setFormula('to_char({custrecordr7asplicenseexpirationdate},\'MON YYYY\')');
        arrColumns[2] = new nlobjSearchColumn('internalid').setSort(true);
        arrColumns[3] = new nlobjSearchColumn('custrecordr7asplicenseitemfamily');

        var arrResults = nlapiSearchRecord('customrecordr7appspiderlicensing', null, arrFilters, arrColumns);

        for (var i = 0; arrResults != null && i < arrResults.length; i++) {

            var licenseId = arrResults[i].getId();
            var activationKey = arrResults[i].getValue(arrColumns[0]);
            var dateExpired = arrResults[i].getValue(arrColumns[1]);
            var itemFamily = arrResults[i].getText(arrColumns[3]);
            if (itemFamily != null && itemFamily != '') {
                itemFamily = itemFamily + ': ';
            }
            var optionText = 'ASP: ' + activationKey.substr(0, 9) + ' (' + itemFamily + dateExpired + ')';

            fld.addSelectOption(activationKey, optionText);
        }
    }

    if (objOrderACRs.hasOwnProperty('9')) { //INSIGHT PLATFORM
        //all current INP licenses
        var arrFilters = new Array();
        arrFilters[0] = new nlobjSearchFilter('custrecordr7inplicensecustomer', null, 'is', customerId);
        arrFilters[1] = new nlobjSearchFilter('custrecordr7inplicenseexpirationdate', null, 'onorafter', 'daysago365');
        arrFilters[2] = new nlobjSearchFilter('custrecordr7inplicenseitemfamily', null, 'anyof', arrLineItemFamilyIds);

        var arrColumns = new Array();
        arrColumns[0] = new nlobjSearchColumn('custrecordr7inplicenseprodcutkey');
        arrColumns[1] = new nlobjSearchColumn('formulatext');
        arrColumns[1].setFormula('to_char({custrecordr7inplicenseexpirationdate},\'MON YYYY\')');
        arrColumns[2] = new nlobjSearchColumn('internalid').setSort(true);
        arrColumns[3] = new nlobjSearchColumn('custrecordr7inplicenseitemfamily');

        var arrResults = nlapiSearchRecord('customrecordr7insightplatform', null, arrFilters, arrColumns);

        for (var i = 0; arrResults != null && i < arrResults.length; i++) {

            var licenseId = arrResults[i].getId();
            var activationKey = arrResults[i].getValue(arrColumns[0]);
            var dateExpired = arrResults[i].getValue(arrColumns[1]);
            var itemFamily = arrResults[i].getText(arrColumns[3]);
            if (itemFamily != null && itemFamily != '') {
                itemFamily = itemFamily + ': ';
            }
            var optionText = 'INP: ' + activationKey.substr(0, 9) + ' (' + itemFamily + dateExpired + ')';

            fld.addSelectOption(activationKey, optionText);
        }
    }
}

function sourceMNGSelect(customerId, fld, arrMNGItems) {
    fld.addSelectOption('', '');
    //current ACL's on the order
    for (var i = 0; arrMNGItems != null && i < arrMNGItems.length; i++) {

        var item = arrMNGItems[i];
        var itemProperties = item['itemProperties'];
        var lineId = item['lineId'];
        var itemText = itemProperties['displayname'];
        var itemAmount = item['amount'];
        var licenseId = item['licenseId'];
        var activationKey = item['activationKey'];

        if ((licenseId == '' || licenseId == null) && (activationKey == null || activationKey == '' || activationKey.substr(0, 4) == 'PEND')) {
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
    arrSearchColumns[3] = new nlobjSearchColumn('custrecordr7managedserviceid');

    var arrSearchResults = nlapiSearchRecord('customrecordr7managedservices', null, arrSearchFilters, arrSearchColumns);

    for (var i = 0; arrSearchResults != null && i < arrSearchResults.length; i++) {

        var searchResult = arrSearchResults[i];
        var name = searchResult.getValue(arrSearchColumns[1]);
        var dateExpired = searchResult.getValue(arrSearchColumns[2]);
        var activationKey = searchResult.getValue(arrSearchColumns[3]);

        var optionText = name + ' (' + dateExpired + ')';

        fld.addSelectOption('PK:' + activationKey, optionText);
    }

}

function sourceMNGSFSelect(customerId, fld, arrMNGSFItems) {
    fld.addSelectOption('', '');
    //current ACL's on the order
    for (var i = 0; arrMNGSFItems != null && i < arrMNGSFItems.length; i++) {

        var item = arrMNGSFItems[i];
        var itemProperties = item['itemProperties'];
        var lineId = item['lineId'];
        var itemText = itemProperties['displayname'];
        var itemAmount = item['amount'];
        var licenseId = item['licenseId'];
        var activationKey = item['activationKey'];

        if ((licenseId == '' || licenseId == null) && (activationKey == null || activationKey == '' || activationKey.substr(0, 4) == 'PEND')) {
            var optionText = 'ACM: ' + itemText + ' ($' + addCommas(itemAmount) + ')';
            fld.addSelectOption(lineId, optionText);
        }
    }

    var arrSearchFilters = new Array();
    arrSearchFilters[arrSearchFilters.length] = new nlobjSearchFilter('isinactive', null, 'is', 'F');
    arrSearchFilters[arrSearchFilters.length] = new nlobjSearchFilter('custrecordr7managedsoftwarecustomer', null, 'is', customerId);

    var arrSearchColumns = new Array();
    arrSearchColumns[0] = new nlobjSearchColumn('internalid');
    arrSearchColumns[1] = new nlobjSearchColumn('name');
    arrSearchColumns[2] = new nlobjSearchColumn('custrecordr7managedsoftwareenddate');
    arrSearchColumns[3] = new nlobjSearchColumn('custrecordr7managedsoftwareid');

    var arrSearchResults = nlapiSearchRecord('customrecordr7managedsoftware', null, arrSearchFilters, arrSearchColumns);

    for (var i = 0; arrSearchResults != null && i < arrSearchResults.length; i++) {

        var searchResult = arrSearchResults[i];
        var name = searchResult.getValue(arrSearchColumns[1]);
        var dateExpired = searchResult.getValue(arrSearchColumns[2]);
        var activationKey = searchResult.getValue(arrSearchColumns[3]);

        var optionText = name + ' (' + dateExpired + ')';

        fld.addSelectOption('PK:' + activationKey, optionText);
    }

}

function sourceACLSelect(customerId, fldACLSelect, arrACLItems) {

    var objOrderACRs = getOrderACRIdObject(arrItemACRIds);

    //current ACL's on the order
    for (var i = 0; arrACLItems != null && i < arrACLItems.length; i++) {

        var item = arrACLItems[i];
        var itemProperties = item['itemProperties'];
        var lineId = item['lineId'];
        var itemText = itemProperties['displayname'];
        var itemAmount = item['amount'];
        var licenseId = item['licenseId'];
        var activationKey = item['activationKey'];

        if ((licenseId == '' || licenseId == null) && (activationKey == null || activationKey == '' || activationKey.substr(0, 4) == 'PEND')) {
            var optionText = 'ACL: ' + itemText + ' ($' + addCommas(itemAmount) + ')';
            fldACLSelect.addSelectOption(lineId, optionText);
        }
    }

    if (objOrderACRs.hasOwnProperty('1')) {
        //all current NX licenses
        var arrFilters = new Array();
        arrFilters[0] = new nlobjSearchFilter('custrecordr7nxlicensecustomer', null, 'is', customerId);
        arrFilters[1] = new nlobjSearchFilter('custrecordr7nxordertype', null, 'is', 1);
        arrFilters[2] = new nlobjSearchFilter('custrecordr7nxlicenseexpirationdate', null, 'onorafter', 'daysago365');
        arrFilters[3] = new nlobjSearchFilter('custrecordcustrecordr7nxlicenseitemfamil', null, 'anyof', arrLineItemFamilyIds);

        var arrColumns = new Array();
        arrColumns[0] = new nlobjSearchColumn('custrecordr7nxproductkey');
        arrColumns[1] = new nlobjSearchColumn('formulatext');
        arrColumns[1].setFormula('to_char({custrecordr7nxlicenseexpirationdate},\'MON YYYY\')');
        arrColumns[2] = new nlobjSearchColumn('internalid').setSort(true);
        arrColumns[3] = new nlobjSearchColumn('custrecordcustrecordr7nxlicenseitemfamil');
        arrColumns[4] = new nlobjSearchColumn("custrecordr7nxlicense_parentlicense");

        var arrResults = nlapiSearchRecord('customrecordr7nexposelicensing', null, arrFilters, arrColumns);

        for (var i = 0; arrResults != null && i < arrResults.length; i++) {

            var nxLicenseId = arrResults[i].getId();
            var activationKey = arrResults[i].getValue(arrColumns[0]);
            var dateExpired = arrResults[i].getValue(arrColumns[1]);
            var itemFamily = arrResults[i].getText(arrColumns[3]);
            if (itemFamily != null && itemFamily != '') {
                itemFamily = itemFamily + ': ';
            }
            var parentLicenseId = arrResults[i].getText(arrColumns[4]);

            var optionText = 'NXL: ' + activationKey.substr(0, 9) + ' (' + itemFamily + dateExpired + ')';

            if (parentLicenseId) {
                optionText += ' [CHILD]'
            }
            else {
                optionText += ' [PARENT]'
            }

            fldACLSelect.addSelectOption('PK:' + activationKey, optionText);
        }
    }

    if (objOrderACRs.hasOwnProperty('2')) {
        //all current MS licenses
        var arrFilters = new Array();
        arrFilters[0] = new nlobjSearchFilter('custrecordr7mslicensecustomer', null, 'is', customerId);
        arrFilters[1] = new nlobjSearchFilter('custrecordr7msordertype', null, 'anyof', new Array(1, 2, 4));
        arrFilters[2] = new nlobjSearchFilter('custrecordr7mslicenseexpirationdate', null, 'onorafter', 'daysago365');
        arrFilters[3] = new nlobjSearchFilter('custrecordr7mslicenseitemfamily', null, 'anyof', arrLineItemFamilyIds);

        var arrColumns = new Array();
        arrColumns[0] = new nlobjSearchColumn('custrecordr7msproductkey');
        arrColumns[1] = new nlobjSearchColumn('formulatext');
        arrColumns[1].setFormula('to_char({custrecordr7mslicenseexpirationdate},\'MON YYYY\')');
        arrColumns[2] = new nlobjSearchColumn('internalid').setSort(true);
        arrColumns[3] = new nlobjSearchColumn('custrecordr7mslicenseitemfamily');

        var arrResults = nlapiSearchRecord('customrecordr7metasploitlicensing', null, arrFilters, arrColumns);

        for (var i = 0; arrResults != null && i < arrResults.length; i++) {

            var msLicenseId = arrResults[i].getId();
            var activationKey = arrResults[i].getValue(arrColumns[0]);
            var dateExpired = arrResults[i].getValue(arrColumns[1]);
            var itemFamily = arrResults[i].getText(arrColumns[3]);
            if (itemFamily != null && itemFamily != '') {
                itemFamily = itemFamily + ': ';
            }
            var optionText = 'MSL: ' + activationKey.substr(0, 9) + ' (' + itemFamily + dateExpired + ')';

            fldACLSelect.addSelectOption('PK:' + activationKey, optionText);
        }
    }

    if (objOrderACRs.hasOwnProperty('6')) {
        //all current MB licenses
        var arrFilters = new Array();
        arrFilters[0] = new nlobjSearchFilter('custrecordr7mblicensecustomer', null, 'is', customerId);
        arrFilters[1] = new nlobjSearchFilter('custrecordr7mblicense_period_end', null, 'onorafter', 'daysago365');
        arrFilters[2] = new nlobjSearchFilter('custrecordr7mblicenseitemfamily', null, 'anyof', arrLineItemFamilyIds);

        var arrColumns = new Array();
        arrColumns[0] = new nlobjSearchColumn('custrecordr7mblicenseproductkey');
        arrColumns[1] = new nlobjSearchColumn('formulatext');
        arrColumns[1].setFormula('to_char({custrecordr7mblicense_period_end},\'MON YYYY\')');
        arrColumns[2] = new nlobjSearchColumn('internalid').setSort(true);
        arrColumns[3] = new nlobjSearchColumn('custrecordr7mblicenseitemfamily');

        var arrResults = nlapiSearchRecord('customrecordr7mobilisafelicense', null, arrFilters, arrColumns);

        for (var i = 0; arrResults != null && i < arrResults.length; i++) {

            var msLicenseId = arrResults[i].getId();
            var activationKey = arrResults[i].getValue(arrColumns[0]);
            var dateExpired = arrResults[i].getValue(arrColumns[1]);
            var itemFamily = arrResults[i].getText(arrColumns[3]);
            if (itemFamily != null && itemFamily != '') {
                itemFamily = itemFamily + ': ';
            }

            var optionText = 'MBL: ' + activationKey.substr(0, 9) + ' (' + itemFamily + dateExpired + ')';

            fldACLSelect.addSelectOption('PK:' + activationKey, optionText);
        }
    }

    if (objOrderACRs.hasOwnProperty('7')) {
        //all current UI licenses
        var arrFilters = new Array();
        arrFilters[0] = new nlobjSearchFilter('custrecordr7uilicensecustomer', null, 'is', customerId);
        arrFilters[1] = new nlobjSearchFilter('custrecordr7uilicenseexpirationdate', null, 'onorafter', 'daysago365');
        arrFilters[2] = new nlobjSearchFilter('custrecordr7uilicenseitemfamily', null, 'anyof', arrLineItemFamilyIds);

        var arrColumns = new Array();
        arrColumns[0] = new nlobjSearchColumn('custrecordr7uilicenseproductkey');
        arrColumns[1] = new nlobjSearchColumn('formulatext');
        arrColumns[1].setFormula('to_char({custrecordr7uilicenseexpirationdate},\'MON YYYY\')');
        arrColumns[2] = new nlobjSearchColumn('internalid').setSort(true);
        arrColumns[3] = new nlobjSearchColumn('custrecordr7uilicenseitemfamily');

        var arrResults = nlapiSearchRecord('customrecordr7userinsightlicense', null, arrFilters, arrColumns);

        for (var i = 0; arrResults != null && i < arrResults.length; i++) {

            var nxLicenseId = arrResults[i].getId();
            var activationKey = arrResults[i].getValue(arrColumns[0]);
            var dateExpired = arrResults[i].getValue(arrColumns[1]);
            var itemFamily = arrResults[i].getText(arrColumns[3]);
            if (itemFamily != null && itemFamily != '') {
                itemFamily = itemFamily + ': ';
            }
            var optionText = 'UIL: ' + activationKey.substr(0, 9) + ' (' + itemFamily + dateExpired + ')';

            fldACLSelect.addSelectOption('PK:' + activationKey, optionText);
        }
    }

    if (objOrderACRs.hasOwnProperty('8')) {
        //all current AS licenses
        var arrFilters = new Array();
        arrFilters[0] = new nlobjSearchFilter('custrecordr7asplicensecustomer', null, 'is', customerId);
        arrFilters[1] = new nlobjSearchFilter('custrecordr7asplicenseexpirationdate', null, 'onorafter', 'daysago365');
        arrFilters[2] = new nlobjSearchFilter('custrecordr7asplicenseitemfamily', null, 'anyof', arrLineItemFamilyIds);

        var arrColumns = new Array();
        arrColumns[0] = new nlobjSearchColumn('custrecordr7asplicenseproductkey');
        arrColumns[1] = new nlobjSearchColumn('formulatext');
        arrColumns[1].setFormula('to_char({custrecordr7asplicenseexpirationdate},\'MON YYYY\')');
        arrColumns[2] = new nlobjSearchColumn('internalid').setSort(true);
        arrColumns[3] = new nlobjSearchColumn('custrecordr7asplicenseitemfamily');

        var arrResults = nlapiSearchRecord('customrecordr7appspiderlicensing', null, arrFilters, arrColumns);

        for (var i = 0; arrResults != null && i < arrResults.length; i++) {

            var licenseId = arrResults[i].getId();
            var activationKey = arrResults[i].getValue(arrColumns[0]);
            var dateExpired = arrResults[i].getValue(arrColumns[1]);
            var itemFamily = arrResults[i].getText(arrColumns[3]);
            if (itemFamily != null && itemFamily != '') {
                itemFamily = itemFamily + ': ';
            }
            var optionText = 'ASP: ' + activationKey.substr(0, 9) + ' (' + itemFamily + dateExpired + ')';

            fldACLSelect.addSelectOption('PK:' + activationKey, optionText);
        }
    }

    if (objOrderACRs.hasOwnProperty('9')) { //INSIGHT PLATFORM
        //all current INP licenses
        var arrFilters = new Array();
        arrFilters[0] = new nlobjSearchFilter('custrecordr7inplicensecustomer', null, 'is', customerId);
        arrFilters[1] = new nlobjSearchFilter('custrecordr7inplicenseexpirationdate', null, 'onorafter', 'daysago365');
        arrFilters[2] = new nlobjSearchFilter('custrecordr7inplicenseitemfamily', null, 'anyof', arrLineItemFamilyIds);

        var arrColumns = new Array();
        arrColumns[0] = new nlobjSearchColumn('custrecordr7inplicenseprodcutkey');
        arrColumns[1] = new nlobjSearchColumn('formulatext');
        arrColumns[1].setFormula('to_char({custrecordr7inplicenseexpirationdate},\'MON YYYY\')');
        arrColumns[2] = new nlobjSearchColumn('internalid').setSort(true);
        arrColumns[3] = new nlobjSearchColumn('custrecordr7inplicenseitemfamily');

        var arrResults = nlapiSearchRecord('customrecordr7insightplatform', null, arrFilters, arrColumns);

        for (var i = 0; arrResults != null && i < arrResults.length; i++) {

            var licenseId = arrResults[i].getId();
            var activationKey = arrResults[i].getValue(arrColumns[0]);
            var dateExpired = arrResults[i].getValue(arrColumns[1]);
            var itemFamily = arrResults[i].getText(arrColumns[3]);
            if (itemFamily != null && itemFamily != '') {
                itemFamily = itemFamily + ': ';
            }
            var optionText = 'INP: ' + activationKey.substr(0, 9) + ' (' + itemFamily + dateExpired + ')';

            fldACLSelect.addSelectOption('PK:' + activationKey, optionText);
        }
    }
}

function sourceContacts(customerId, fld) {

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

function sourceEventMasters(fld) {

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

function sourceMNGSelectExisting(customerId, fld) {

    fld.addSelectOption('', '--- NEW MANAGED SERVICE ---');

    var arrSearchFilters = new Array();
    arrSearchFilters[arrSearchFilters.length] = new nlobjSearchFilter('isinactive', null, 'is', 'F');
    arrSearchFilters[arrSearchFilters.length] = new nlobjSearchFilter('custrecordr7managedservicecustomer', null, 'is', customerId);

    var arrSearchColumns = new Array();
    arrSearchColumns[0] = new nlobjSearchColumn('internalid');
    arrSearchColumns[1] = new nlobjSearchColumn('name');
    arrSearchColumns[2] = new nlobjSearchColumn('custrecordr7managedserviceid');

    var arrSearchResults = nlapiSearchRecord('customrecordr7managedservices', null, arrSearchFilters, arrSearchColumns);

    for (var i = 0; arrSearchResults != null && i < arrSearchResults.length; i++) {

        var searchResult = arrSearchResults[i];
        var mngName = searchResult.getValue(arrSearchColumns[1]);
        var activationKey = searchResult.getValue(arrSearchColumns[2]);

        fld.addSelectOption(activationKey, mngName);

    }
}

function sourceMNGSwSelectExisting(customerId, fld) {

    fld.addSelectOption('', '--- NEW MANAGED SOFTWARE ---');

    var arrSearchFilters = new Array();
    arrSearchFilters[arrSearchFilters.length] = new nlobjSearchFilter('isinactive', null, 'is', 'F');
    arrSearchFilters[arrSearchFilters.length] = new nlobjSearchFilter('custrecordr7managedsoftwarecustomer', null, 'is', customerId);

    var arrSearchColumns = new Array();
    arrSearchColumns[0] = new nlobjSearchColumn('internalid');
    arrSearchColumns[1] = new nlobjSearchColumn('name');
    arrSearchColumns[2] = new nlobjSearchColumn('custrecordr7managedsoftwareid');

    var arrSearchResults = nlapiSearchRecord('customrecordr7managedsoftware', null, arrSearchFilters, arrSearchColumns);

    for (var i = 0; arrSearchResults != null && i < arrSearchResults.length; i++) {

        var searchResult = arrSearchResults[i];
        var mngName = searchResult.getValue(arrSearchColumns[1]);
        var activationKey = searchResult.getValue(arrSearchColumns[2]);

        fld.addSelectOption(activationKey, mngName);

    }
}

function getAddOnItems_itemAssociation(arrItems) {

    var arrAddOnItems = new Array();
    var arrMNGAddOnItems = new Array();
    var arrMNGSFAddOnItems = new Array();

    for (var i = 0; arrItems != null && i < arrItems.length; i++) {
        var lineItem = arrItems[i];
        var lineItemPropertites = lineItem['itemProperties'];
        var strItemAddOns = lineItemPropertites['custitemr7acladdons'];
        var ACL = lineItem['isACL'];
        var acrId = lineItem['acrId'];

        if (ACL != 'T' && strItemAddOns != null && strItemAddOns != '') {
            lineItem['addOns'] = strItemAddOns;

            if (acrId == 3) { //man service
                arrMNGAddOnItems[arrMNGAddOnItems.length] = lineItem;
            }
            else if (acrId == 10) { //man software
                arrMNGSFAddOnItems[arrMNGSFAddOnItems.length] = lineItem;
            }
            else {
                arrAddOnItems[arrAddOnItems.length] = lineItem;
            }
        }
    }
    var arrAllAddOns = new Array(arrAddOnItems, arrMNGAddOnItems, arrMNGSFAddOnItems);
    return arrAllAddOns;
}

function addCommas(nStr) {

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


function grabLineItemItemFamilyIds(recOrder) {

    var arrOrderItemFamilies = [];
    var orderLineCount = recOrder.getLineItemCount('item');

    for (var i = 1; i <= orderLineCount; i++) {
        var itemId = recOrder.getLineItemValue('item', 'item', i);
        var lineId = recOrder.getLineItemValue('item', 'id', i);

        var strLineItemFamilies = getItemProperties(itemId, 'custitemr7itemfamily');
        if (strLineItemFamilies) {
            arrOrderItemFamilies = arrOrderItemFamilies.concat(strLineItemFamilies.split(','));
        }
    }

    return unique(arrOrderItemFamilies);
}

function unique(a) {
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