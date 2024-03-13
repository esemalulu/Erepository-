function memoize(fn) {
    var cache = {}
    return function() {
        var args = Array.prototype.slice.call(arguments)
        if (cache[args] === undefined) {
            cache[args] = fn.apply(this, args)
            nlapiLogExecution('DEBUG', 'lookup with args: ' + args, 'result - ' + JSON.stringify(cache[args]))
        }
        return cache[args]
    }
}

// add memoization caching for optimization
var memoizedLookupField = memoize(nlapiLookupField)

function validateOrder(request, response) {

    this.arrProductTypes = grabAllProductTypes();
    // Set this field to true in line validation section if the order has an appliance
    this.orderHasAppliance = false;
    // Set this field to true if there is class A on the order
    this.orderHasClassA = false;
    // Set this field to true if there is an ACL on the order
    this.orderHasACL = false;

    if (request.getMethod() == 'GET') {
        var arrRoles = new Array();
        // array of finance roles
        arrRoles.push(3, 1070, 1030, 1006, 1019, 1088, 1073, 1087, 1065, 1090, 1077, 1057, 1172, 1173);

        var userId = nlapiGetUser();
        var roleId = nlapiGetRole();
        var userDepartmentId = nlapiGetDepartment();

        nlapiLogExecution('DEBUG','Begin Validation with User/Role/Department: ',userId + ' / ' + roleId + ' / ' + userDepartmentId);

        //var orderId = request.getParameter('custparam_salesorder');
        //var orderId = 200421; //S738344
        var orderId = request.getParameter('custparam_salesorder');
        var actionId = request.getParameter('custparam_action');
        this.orderType = request.getParameter('custparam_ordertype');
        nlapiLogExecution('DEBUG', 'OrderId', orderId);
        nlapiLogExecution('DEBUG', 'OrderType', orderType);
        nlapiLogExecution('DEBUG', 'actionId', actionId);

        if (orderId == '' || orderId == null) {
            throw nlapiCreateError('INVALID PARAM', 'This suitelet requires a valid \'custparam_salesorder\' parameter', true);
        }
        if (orderType == '' || orderType == null) {
            throw nlapiCreateError('INVALID PARAM', 'This suitelet requires a valid \'custparam_ordertype\' parameter', true);
        }

        if (actionId == 'validate') {
            validateTheOrder(orderType, orderId);
            response.writeLine('Validated');
            return;
        }

        if (actionId == 'unvalidate') {
            // MB: 11/25/14 - If order is not Pending Approval, don't unvalidate
            // MB: 5/12/15 - Also need Status = Open for Quotes
            var orderStatus = nlapiLookupField(orderType, orderId, 'status');
            if (orderStatus == 'pendingApproval' || orderStatus == 'open'){
                unValidateTheOrder(orderType, orderId);
                response.writeLine('Un-validated');
                return;
            }
            else{
                response.writeLine('Could not un-validate.  Status is not Pending Approval.');
                return;
            }
        }

        var recOrder = nlapiLoadRecord(orderType, orderId);
        // Log Order Validated value
        nlapiLogExecution('DEBUG', 'OrderValidated?', recOrder.getFieldValue('custbodyr7ordervalidated'));

        try {
            var lineItems = getItemsFromOrder(recOrder);
            // Grab all ACRIds and attach them to lineId
            this.arrItemACRIds = grabLineItemACRIds(lineItems);

            // Alert for required fields
            this.requiredCounter = 0;
            // Alert for option fields
            this.alertCounter = 0;

            // Create Objects for sales order alerts
            this.salesOrder = new Object();
            salesOrder.required = 'Please correct the following (required):\n\n';
            salesOrder.alert = 'Please double-check the following (optional):\n\n';

            // Create Objects for quote alerts
            this.quote = new Object();
            quote.required = 'Please correct the following (required):\n\n';
            quote.alert = 'Please double-check the following (optional) :\n\n';

            //map items by lineID
            var orderLineCount = recOrder.getLineItemCount('item');
            this.itemLineNums = new Array();

            for (var z = 1; z <= orderLineCount; z++) {
                var lineId = recOrder.getLineItemValue('item', 'id', z);
                itemLineNums[lineId] = z;
            }

            // Begin Main Line validations

            // Check PO field filled in on sales order (already mandatory field)
            var poNum = recOrder.getFieldValue('otherrefnum');
            if (poNum == '' || poNum == null) {
                alertOrRequired(null, true, 'PO# is empty.');
            }

            //check Billing Schedule, if not null or 100% billed
            var soBillingSchedule = recOrder.getFieldValue('custbodysfbillingschedule');
            if(!(soBillingSchedule == ''||soBillingSchedule == null || soBillingSchedule == 1)){
                alertOrRequired(null, false, 'Check if Billing Schedule has been created.');
            }

            /*  Check start/end dates are future
             Estimate end date is expiration date (duedate)
             Estimate start date is trandate
             */
            var strStartDate = recOrder.getFieldValue('startdate');
            var strEndDate = recOrder.getFieldValue('enddate');
            var startDate = nlapiStringToDate(strStartDate);
            var endDate = nlapiStringToDate(strEndDate);
            var dateToday = new Date();
            if (dateToday.getDate() + 1 > startDate) {
                alertOrRequired(false, false, 'Start date is before today.');
            }
            if (dateToday.getDate() + 1 > endDate) {
                alertOrRequired(true, true, 'End date is before today.');
            }
            // Check start/end dates not inverted
            if (endDate < startDate) {
                alertOrRequired(true, true, 'End date is before start date.');
            }

            // Check if partner deal, make sure sales registered their opp as such Sales Order & Alert
            var partnerId = recOrder.getFieldValue('partner');
            var partnerDealType = recOrder.getFieldValue('custbodyr7partnerdealtype');
            var opportunityId = recOrder.getFieldValue('opportunity');
            var opRec = opportunityId != null ? nlapiLoadRecord('opportunity', opportunityId) : null;
            if (partnerId != '' && partnerId != null   && opportunityId != '' && opportunityId != null) {
                if (partnerDealType == '' || partnerDealType == null) {
                    alertOrRequired(false, true, 'Partner Deal Type is empty.');
                }
                else {
                    // Check opportunity
                    var opportunityPartnerId = opRec.getFieldValue('partner');
                    if (opportunityPartnerId == null || opportunityPartnerId == '') {
                        alertOrRequired(false, true, 'Opportunity Partner is empty.');
                    }
                    else
                    if (partnerId != opportunityPartnerId) {
                        alertOrRequired(false, true, 'Opportunity Partner does not match.');
                    }
                    var opportunityPartnerDealType = opRec.getFieldValue('custbodyr7partnerdealtype');
                    if (opportunityPartnerDealType == null || opportunityPartnerDealType == '') {
                        alertOrRequired(false, true, 'Opportunity Partner deal type is empty.');
                    }
                    else
                    if (partnerDealType != opportunityPartnerDealType) {
                        alertOrRequired(false, true, 'Opportunity Partner deal type does not match.');
                    }
                }
            }

            // Sales Rep Dept (on Employee Record) doesn't match Deptartment in Header
            var salesRepId = recOrder.getFieldValue('salesrep');
            var salesRepEmpRec = nlapiLoadRecord('employee', salesRepId);
            var department = recOrder.getFieldValue('department');
            var salesRepDepartment = salesRepEmpRec.getFieldValue('department');
            if (salesRepDepartment != department) {
                alertOrRequired(false, false, 'Sales Rep Department and Order Department does not match.');
            }

            // Sales Rep Location (on Employee Record) doesn't match Location in Header
            var location = recOrder.getFieldValue('location');
            var salesRepLocation = salesRepEmpRec.getFieldValue('location');
            if (salesRepLocation != location) {
                alertOrRequired(false, false, 'Sales Rep Location and Order Location does not match.');
            }

            if (orderType == 'salesorder') {
                // Sales Order created from quote, field createdfrom should not be empty (not applicable to finance)
                var createdFrom = recOrder.getFieldValue('createdfrom');
                if (createdFrom == null || createdFrom == '') {
                    if (arrRoles.indexOf(roleId) != -1) {
                        alertOrRequired(null, false, 'Created from is empty.');
                    }
                    else {
                        alertOrRequired(null, true, 'Created from is empty.');
                    }
                }
                // Sales Order total field should equal Quote total field (not applicable to finance)
                var totalSO = recOrder.getFieldValue('total');
                if (createdFrom != null && createdFrom != '') {
                    var estimateRec = nlapiLoadRecord('estimate', createdFrom);
                    var totalQuote = estimateRec.getFieldValue('total');
                    // Check for foreign currency total - fxamount is the search field Id
                    var totalForeignCurrencyQuote = estimateRec.getFieldValue('fxamount');
                    if (totalSO != totalQuote && totalSO != totalForeignCurrencyQuote) {
                        if (arrRoles.indexOf(roleId) != -1) { // Finance roles get a pass
                            alertOrRequired(null, false, 'Order total does not match Quote total.');
                        }
                        else { // change to required while we debug.
                            alertOrRequired(null, false, 'Order total does not match Quote total.');
                        }
                    }
                }
            }

            // https://issues.corp.rapid7.com/browse/APPS-17459 VAT validation
            var INTL_SUBSIDIARY = '10';
            var subsidiary = recOrder.getFieldValue('subsidiary');
            // var billCountry = recOrder.getFieldValue('billcountry');
            var calculatedVat = recOrder.getFieldValue('custbody_r7_calculated_vat'); // '- Empty -' if there is no corresponding VAT record on the billing entity
            if (subsidiary == INTL_SUBSIDIARY && (calculatedVat == '- Empty -' || isEmpty(calculatedVat))) {
                // if (roleId == '3') { // pass for admin
                alertOrRequired(null, false, 'There is no VAT record existing on Partner/Customer record which corresponds to the billing country on this transaction.');
                // } else {
                // 	alertOrRequired(null, true, 'There is no VAT record existing on Partner/Customer record which corresponds to the billing country on this transaction.');
                // }
            }

            // Begin Subtab Validations

            //	Check country fields on ship/bill
            var billCountry = recOrder.getFieldValue('billcountry');
            if (billCountry == '' || billCountry == null) {
                alertOrRequired(null, true, 'Billing Country is empty.');
            }
            var shipCountry = recOrder.getFieldValue('shipcountry');
            if (shipCountry == '' || shipCountry == null) {
                alertOrRequired(null, true, 'Shipping Country is empty.');
            }
            if(shipCountry == 'US' || shipCountry == 'CA'){
                var shipZip = recOrder.getFieldValue('shipzip');
                if (shipZip == '' || shipZip == null) {
                    alertOrRequired(true, true, 'Shipping Zip is empty.');
                }
            }

            //#region override checkbox of the address record validation
            /**
             * 12.02.2020 JIRA ticket - https://issues.corp.rapid7.com/browse/APPS-2244
             * check for - Custom - or Empty addresses
             * if address is not - Custom - or Empty, then check the
             * override checkbox of the address record
             */
            var shipaddressId = recOrder.getFieldValue("shipaddresslist");
            var billaddressId = recOrder.getFieldValue("billaddresslist");
            var shipaddressFound = false;
            var billaddressFound = false;
            var customerId = recOrder.getFieldValue("entity");
            var customerRec = nlapiLoadRecord("customer", customerId);
            var addressLineCount = customerRec.getLineItemCount("addressbook");

            for (var i = 1; i <= addressLineCount; i++) {
                var addressId = customerRec.getLineItemValue("addressbook", "id", i);

                var shipaddressMatch = Number(addressId) === Number(shipaddressId);
                var billaddressMatch = Number(addressId) === Number(billaddressId);

                if (shipaddressMatch || billaddressMatch) {
                    // switch for Found variables
                    shipaddressFound = shipaddressFound || shipaddressMatch;
                    billaddressFound = billaddressFound || billaddressMatch;

                    var addressSubrecord = JSON.parse(
                        JSON.stringify(
                            customerRec.viewLineItemSubrecord("addressbook", "addressbookaddress", i)
                        )
                    );
                    var addressOverride = addressSubrecord["override"];
                    if (addressOverride !== false) {
                        alertOrRequired(null, true, "Please uncheck the override checkbox on one or both addresses.");
                        break;
                    }
                }

                if (shipaddressFound && billaddressFound) {
                    break;
                }
            }
            //#endregion

            // Check there is a file/attachment
            var filesAttached = checkFileAttached(orderId);
            if (!filesAttached) {
                // Get out of jail free if role id in arrRoles (finance roles)
                if (arrRoles.indexOf(roleId) != -1) {
                    alertOrRequired(null, false, 'No file attached.');
                }
                else {
                    alertOrRequired(null, true, 'No file attached.');
                }
            }

            // 	Check bill to completed
            var billAdress = recOrder.getFieldValue('billaddress');
            if (billAdress == '' || billAdress == null) {
                alertOrRequired(false, false, 'Bill to address is empty.');
            }

            //	Check ship to completed
            var shipAdress = recOrder.getFieldValue('shipaddress');
            if (shipAdress == '' || shipAdress == null) {
                alertOrRequired(false, false, 'Ship to address is empty.');
            }

            //  Check delayed start date is ok
            var strDelayedStart = recOrder.getFieldValue('custbodyr7delayedlicensestartdate');
            if (strDelayedStart == '' || strDelayedStart == null) {
                var dateDelayedStart = nlapiStringToDate(strDelayedStart);
                var dateToday = new Date();
                var dateFuture = dateToday.setMonth(dateToday.getMonth() + 6);
                if (dateToday < dateDelayedStart) {
                    alertOrRequired(false, false, 'Delayed start date is before today.');
                    requiredCounter++;
                }
                else
                if (dateDelayedStart >= dateFuture) {
                    alertOrRequired(false, false, 'Delayed start date is greater than 6 months out.');
                }
            }

            // Begin lineItem validations
            // Get array of all Items on order
            var arrAllItemIds = lineItems['allItemIds'];
            // Check for Class A
            orderHasClassA = checkClassA(lineItems);

            /*
             * Check if mismatching end dates for separate ACL items.
            */
            var objAKDates = new Object();
            // Grab all valid ACL keys for the order
            var arrValidActivationKeys = lineItems['arrValidActivationKeys'];
            if (arrValidActivationKeys != null && arrValidActivationKeys != '') {

                for (var t = 0; arrValidActivationKeys != null && t < arrValidActivationKeys.length; t++) {
                    nlapiLogExecution('DEBUG', 'validAK ' + t, arrValidActivationKeys[t]);

                    // Get min and max dates for specific ACL key
                    var aclGroupMinMaxdates = getDatesMinMax(recOrder, arrValidActivationKeys[t]);
                    // Total license period, number of days (max-min)
                    var licensePeriodInDays = findDateDiff(aclGroupMinMaxdates['aclGroupMaxEndDate'], aclGroupMinMaxdates['aclGroupMinStartDate']);
                    nlapiLogExecution('DEBUG', 'minMaxDates: ', aclGroupMinMaxdates['aclGroupMaxEndDate'] + ' / ' + aclGroupMinMaxdates['aclGroupMinStartDate']);
                    nlapiLogExecution('DEBUG', 'license Period in day: ', licensePeriodInDays);
                    objAKDates[arrValidActivationKeys[t]] = licensePeriodInDays;

                }
                var periodValues = new Array();
                var datesAlertText = '';
                for (AK in objAKDates) {
                    periodValues.push(objAKDates[AK]);
                    datesAlertText += 'Activation Key: ' + AK + ' / Total # Days: ' + objAKDates[AK] + '\n';
                    nlapiLogExecution('DEBUG', 'ak dates', AK + ' ' + objAKDates[AK]);
                }
                // APPS-25090 - BF
                if (!allthesame(periodValues) && !isMergeOrder(recOrder)) {
                    alertOrRequired(false, false, 'ACLs have different lengths: \n' + datesAlertText);
                }
            }

            // Check for PO notes:  hardcode itemId 46 (Cust Care id 10 exempt) 46 1323 1324
            // MB: 9/26/13 - Added new PO notes sku checks
            // MB 10/31/14 - Remove PO Notes Notification on Orders
            // Per dzanga: There is a new script that removes PONOTES from Sales Orders as they get created
            if (userDepartmentId != 10) {
                if (arrAllItemIds.indexOf('46') == -1 && arrAllItemIds.indexOf('1323') == -1 && arrAllItemIds.indexOf('1324') == -1) {
                    alertOrRequired(false, null, 'PONotes is missing');
                }
            }

            // Partner Discount Fill out Partner
            if (partnerDiscount) {
                if (partnerId == '' || partnerId == null) {
                    alertOrRequired(true, true, 'Item: Partner Discount is used, please fill out Partner.');
                }
                if (partnerDealType == '' || partnerDealType == null) {
                    alertOrRequired(true, true, 'Item: Partner Discount is used, please fill out Partner deal type.');
                }
            }

            // Check OnePrice Migrations for missing product tokens on licenses
            checkOnePriceMigrations(recOrder);

            // Store export hold field before looping through lines and set check field
            var exportHold = customerRec.getFieldValue('custentityr7exporthold');
            // Changed the field on the customer master from a checkbox to a drop-down list 11/25/15- Sfiorentino
            var exportStatus = customerRec.getFieldValue('custentityr7legalexportstatus');
            /* This field will be set to true if a Metasploit item is on the order with export hold.
             * If it is true then the customer export hold alert is not displayed, as it is redundant.
             */
            var hasMSExport = false;
            for (var i = 0; lineItems != null && i < lineItems.length; i++) {

                var lineItem = lineItems[i];
                var itemProperties = lineItem['itemProperties'];
                var itemCategory = itemProperties['custitemr7itemcategory'];
                var isInactive = itemProperties['isinactive'];
                var activationKey = lineItem['activationKey'];
                var lineContact = lineItem['contact'];
                var eventMaster = lineItem['eventmaster'];
                var lineLocation = lineItem['linelocation'];
                var lineAmount = lineItem['amount'];
                var taxCode = lineItem['taxcode'];
                var currentLineId = lineItem['lineId'];
                var acrId = arrItemACRIds[currentLineId];
                nlapiLogExecution('DEBUG', 'acrId', acrId);
                var srp = lineItem['srptemplate'];
                var job = lineItem['job'];

                // Required check if export hold for Metasploit purchase
                if (acrId == 2 && (exportHold == 'T' || exportStatus == '1')) { // If metasploit item
                    hasMSExport = true;
                    alertOrRequired(true, true, 'Item: ' + itemProperties['displayname'] + ' is Metasploit and Customer has export hold');
                }

                // Check if the order has an ACL, if yes then check associated box
                if (lineItem['isACL'] == 'T' && orderHasACL == false) {
                    orderHasACL = true;
                }

                // Check all ACL have contact name and Sales Order & Required
                if ((lineItem['isACL'] == 'T') && (lineContact == '' || lineContact == null)) {
                    alertOrRequired(null, true, 'Item: ' + itemProperties['displayname'] + ' is ACL missing line contact.');
                }

                // Check to make sure ACL or AddOn has product key
                if ((lineItem['isACL'] == 'T' || lineItem['isAddOn'] == 'T') && (activationKey == '' || activationKey == null)) {
                    alertOrRequired(null, true, 'Item: ' + itemProperties['displayname'] + ' has not been associated.');
                }

                //check to make sure if an item has an SRP template assigned to it, there is also a project(job) already created
                if((srp != '' & srp != null) && (job == '' || job == null))
                {alertOrRequired(null, true, 'Item: ' + itemProperties['displayname'] + ' does not have a job associated to it');}


                var hbrType = lineItem['requireshbr'];
                var lineShip = recOrder.getLineItemValue('item', 'custcolr7lineshipaddress', lineItem['lineNum']);
                if ((hbrType != null && hbrType != '')) {
                    // set global orderHasAppliance to true
                    if(orderHasAppliance != true){
                        orderHasAppliance = true;
                    }
                    // If appliance SKU, make sure that lineshipping is set.
                    if (lineShip == null || lineShip == '') {
                        alertOrRequired(false, true, 'Item: ' + itemProperties['displayname'] + ' is an appliance SKU, please associate line shipping address.');
                        nlapiLogExecution('DEBUG', 'hbrType / lineNum / Shipping', hbrType + ' / ' + lineItem['lineNum'] + ' / ' + lineShip);
                    }
                    // If appliance SKU, make sure has line contact
                    if (lineContact == '' || lineContact == null) {
                        alertOrRequired(false, true, 'Item: ' + itemProperties['displayname'] + ' is an appliance SKU, please associate line contact.');
                    }
                }

                // If Addon Sku Product Key is PEND check if it matches associated ACL Product Key
                if (lineItem['isAddOn'] == 'T' && acrId != null && acrId != '' && activationKey != '' && activationKey != null && activationKey.substr(0, 4) == 'PEND') {
                    // addOnAK is line iD of ACL if PEND
                    var addOnAK = activationKey.substr(5);
                    // Get ActivationKey of associated ACL
                    var associatedLineNum = itemLineNums[addOnAK];
                    nlapiLogExecution('DEBUG', 'associatedLineNum: ', associatedLineNum);
                    nlapiLogExecution('DEBUG', 'lineNum: ', lineItem['lineNum']);
                    // Check if the associated Line Num is not empty.
                    if (associatedLineNum != null && associatedLineNum != '') {
                        var associatedACLAK = recOrder.getLineItemValue('item', arrProductTypes[acrId]['optionid'], associatedLineNum);//lineItem['lineNum']);
                        nlapiLogExecution('DEBUG', 'addonak / associatedACLAK: ', addOnAK + ' / ' + associatedACLAK);
                        // if addonak and acl ak not equal, alert
                        if (addOnAK != associatedACLAK.substr(5)) {
                            alertOrRequired(false, true, 'Item: ' + itemProperties['displayname'] + ' needs to be reassociated to ACL.');
                        }
                    }
                    // If associatedLineNum is empty then the order might need to be reassociated
                    else{
                        alertOrRequired(false, true, 'Item: ' + itemProperties['displayname'] + ' needs to be reassociated to ACL.');
                    }
                }

                if (isInactive == 'T') {
                    alertOrRequired(true, false, 'Item: ' + itemProperties['displayname'] + ' is currently inactive.');
                }

                /*
                 * Check REN ACLs have PK Sales Order & Required
                 * 2 = Renewal - Nexpose
                 * 8 = Renewal - Managed Service
                 * 13 = Renewal - Metasploit
                 */
                if ( (itemCategory == 2 || itemCategory == 13 || itemCategory == 8) && (activationKey == '' || activationKey == null) ) {
                    alertOrRequired(false, true, 'Item: ' + itemProperties['displayname'] + ' renewal missing Product Key.');
                }

                /*
                 * Add Validation for Event Reg SKUs
                 * If Require Event Reg is true, line contact mandatory
                 * If Require Event Reg is true, need event master filled in
                 */
                if (lineItem['requireEvent'] != 'F') {
                    if (lineContact == '' || lineContact == null) {
                        alertOrRequired(false, true, 'Item: ' + itemProperties['displayname'] + ' requires Event Registration and is missing line contact.');
                    }
                    if (eventMaster == '' || eventMaster == null) {
                        alertOrRequired(false, true, 'Item: ' + itemProperties['displayname'] + ' requires Event Registration and is missing Event Master ID.');
                    }
                    /*
                     * MB: 4/2/2014 - Add check for delayed start on Event SKUs
                     * If Require Event Reg is true, cannot have delayed start date on order
                     *
                     */
                    if (strDelayedStart != '' && strDelayedStart != null) {
                        alertOrRequired(false, false, 'Item: ' + itemProperties['displayname'] + ' requires Event Registration.  Cannot delay start date.');
                    }
                }

                // Check to see if any QTY over 5 for year line items probably not accurate if so
                if (lineItem['unitType'] == 3 && lineItem['quantity'] > 5) { // 3 is year
                    alertOrRequired(false, false, 'Item: ' + itemProperties['displayname'] + ' is for over 5 years.');
                }

                // Get the list of addOns
                var arrAddOns = lineItem['addOns'].split(",");
                /*
                 * Check to see if any IP addOn qunatity greater than 10,000, if so alert Class A Discovery
                 * addOn Id 4 = NX: Number of IPs
                 */

                if(arrAddOns != null && arrAddOns.indexOf('4') != -1 && lineItem['unitType'] == 1 && lineItem['quantity'] >= 10000 && orderHasClassA != true){
                    alertOrRequired(false, false, 'Item: ' + itemProperties['displayname'] + ' is for over 10,000 IPs.  Do you need Class A Discovery?  Please contact Sales Operations to add Class A Discovery. ');
                }

                // Item on order also requires other item(s) to be on order
                // Get array of all required skus for line item
                var requiredSkus = itemProperties['custitemr7skurequiresitems'];
                if (requiredSkus != null && requiredSkus != '' && arrAllItemIds != null) {
                    var arrRequiredSkus = requiredSkus.split(",");
                    nlapiLogExecution('DEBUG', 'Require Skus', arrRequiredSkus);
                    // Get array of all Item Ids on order returned from getItemsFromOrder(recOrder);
                    nlapiLogExecution('DEBUG', 'lineItems[allItemIds]', lineItems['allItemIds']);
                    for (var r = 0; arrRequiredSkus != null && r < arrRequiredSkus.length; r++) {
                        // If required sku is not found in array of all Items then alert required sku
                        if (arrAllItemIds.indexOf(arrRequiredSkus[r]) == -1) {
                            /*
                             * Create additional lookup for addons to existing license (i.e. adding PCI to NXENT but license already has web)
                             * TODO make this dynamic
                             */
                            // Exception for PCI requires web
                            // if has pci addon - 1 is the internal ID of PCI Template addon
                            if (arrAddOns != null && arrAddOns.indexOf('1') != -1 && acrId != null && acrId != '' && activationKey != '' && activationKey != null && activationKey.substr(0, 4) != 'PEND') {
                                // check associated license to see if it has web already
                                // lookup field values on license based off AK
                                var fieldsToCheck = new Array("custrecordr7nxwebscan");
                                var objLicenseFeatures = checkLicFeaturesByAK(acrId, activationKey, fieldsToCheck);
                                nlapiLogExecution('DEBUG', 'web field val: ', objLicenseFeatures['custrecordr7nxwebscan']);
                                if (objLicenseFeatures != null && objLicenseFeatures[fieldsToCheck[0]] != 'T') {
                                    nlapiLogExecution('DEBUG', 'WEB NOT ENABLED on AK: ' + activationKey);
                                    alertOrRequired(false, false, 'Item: ' + itemProperties['displayname'] + ' requires ' + nlapiLookupField('item', arrRequiredSkus[r], 'displayname') + '.');
                                }
                            }
                            else {
                                alertOrRequired(false, false, 'Item: ' + itemProperties['displayname'] + ' requires ' + nlapiLookupField('item', arrRequiredSkus[r], 'displayname') + '.');
                            }

                        }
                    }
                }
            }

            // Check if export hold on customer
            if ((exportHold == 'T' || exportStatus == '1') && !hasMSExport){
                alertOrRequired(false, false, 'The customer currently has an export hold.');
            }

            if (orderHasAppliance != false) {
                // If order has appliance, make sure that ship method is set.
                var shipMethod = recOrder.getFieldValue('shipmethod');
                if (shipMethod == null || shipMethod == '') {
                    alertOrRequired(false, true, 'Order has an appliance, please fill out ship method.');
                }
                // If order has appliance, make sure that ship cost is set.
                var shipCost = recOrder.getFieldValue('shippingcost');
                if (shipCost == null || shipCost == '') {
                    alertOrRequired(false, true, 'Order has an appliance, please fill out ship cost.');
                }
            }

            // If order has an ACL, make sure the associated checkbox is checked
            if (orderHasACL != false && recOrder.getFieldValue('custbodyr7orderassociated') != 'T') {
                alertOrRequired(false, true, 'Please associate the order');
            }

            //For OnePrice Orders, check all line items have a reporting object set on the line
            var onePriceCategories = new Array();
            onePriceCategories.push("57", "56", "53", "52", "55", "59", "58", "54", "61");
            nlapiLogExecution("DEBUG", "OnePrice Categories", onePriceCategories);
            var orderCategoriesPurch = recOrder.getFieldValues('custbodyr7categorypurchased');
            nlapiLogExecution("DEBUG", "Category Purchased Fld Vals", orderCategoriesPurch);
            var checkOnePrice = checkArrayPresent(onePriceCategories, orderCategoriesPurch);
            nlapiLogExecution("DEBUG", "Check OnePrice Category Purchased", checkOnePrice);
            var itemsAssociated = recOrder.getFieldValue('custbodyr7orderassociated') === 'T';
            var reportingObjectMissing = false;
            var associationMissing = false;
            if(checkOnePrice){
                for(var j = 1; lineItems != null && j <= lineItems.length; j++){
                    var thisLineRepObj = recOrder.getLineItemValue('item', 'custcolr7_reporting_obj', j);
                    if((!thisLineRepObj || thisLineRepObj == null || thisLineRepObj == '') && !reportingObjectMissing) {
                        alertOrRequired(false, false, 'Reporting Objects are missing for this order');
                        reportingObjectMissing = true;
                    }

                    var sellingMotion = Number(recOrder.getLineItemValue('item', 'custcolr7_one_item_flow', j));
                    //2 === UPSELL
                    if(sellingMotion === 2 && !itemsAssociated && !associationMissing) {
                        alertOrRequired(false, true, 'Upsell Items have yet to be associated for this order');
                        associationMissing = true;
                    }

                    if(reportingObjectMissing && associationMissing) {
                        break;
                    }
                }
            }

            nlapiLogExecution('DEBUG', 'Required Count: ', requiredCounter);
            nlapiLogExecution('DEBUG', 'Alert Count: ', alertCounter);
            nlapiLogExecution('DEBUG', 'Sales Order Required Alerts:', salesOrder.required);
            nlapiLogExecution('DEBUG', 'Sales Order Optional Alerts:', salesOrder.alert);
            nlapiLogExecution('DEBUG', 'Quote Required Alerts:', quote.required);
            nlapiLogExecution('DEBUG', 'Quote Optional Alerts:', quote.alert);

            if (requiredCounter > 0 && alertCounter > 0) {
                if (orderType == 'salesorder') {
                    response.writeLine(salesOrder.required + '\n\n' + salesOrder.alert);
                }
                else {
                    response.writeLine(quote.required + '\n\n' + quote.alert);
                }
            }
            else
            if (requiredCounter > 0 && alertCounter == 0) {
                if (orderType == 'salesorder') {
                    response.writeLine(salesOrder.required);
                }
                else {
                    response.writeLine(quote.required);
                }
            }
            else
            if (alertCounter > 0) {
                if (orderType == 'salesorder') {
                    salesOrder.alert += '\n\n Please confirm.  Clicking OK will mark order as valid';
                    response.writeLine(salesOrder.alert);
                }
                else {
                    quote.alert += '\n\n Please confirm.  Clicking OK will mark order as valid';
                    response.writeLine(quote.alert);
                }
            }
            else {
                validateTheOrder(orderType, orderId);
                response.writeLine('Validated');
                return;
            }
        }
        catch (e) {
            var tranId = recOrder.getFieldValue('tranid');
            var toURL = nlapiRequestURL(nlapiResolveURL('SUITELET','customscriptretrieveurl','customdeployretrieveurl',true)).getBody();
            if (orderType == 'salesorder')
                // salesorder url is salesord
                orderType = 'salesord';
            var adminUser =  nlapiLoadConfiguration('companypreferences').getFieldValue('custscriptr7_system_info_email_sender');
            nlapiSendEmail(adminUser, adminUser, 'ORDER VALIDATION ERROR', 'Error Validating <a href="'+toURL+'/app/accounting/transactions/' + orderType + '.nl?id=' + orderId + '">' + tranId + '</a> \n' + e);
            response.writeLine('Error validating order: \n' + JSON.stringify(e));
        }
    }
}

function validateTheOrder(orderType, orderId){
    nlapiSubmitField(orderType, orderId, 'custbodyr7ordervalidated','T');
    nlapiLogExecution('DEBUG', 'Validated', 'Yup');
}

function unValidateTheOrder(orderType, orderId){
    nlapiSubmitField(orderType, orderId, new Array('custbodyr7ordervalidated', 'custbodyr7orderassociated'), new Array('F','F'));
    nlapiLogExecution('DEBUG', 'Un-validated', 'Yup');
}

/*
* Identifies if an order is a merge order.
* BF 20/10/21 - A new flag expected on the inbound event will tell us if merge order
* this can then be replaced to return that flag
**/
function isMergeOrder(recOrder) {
    return recOrder.getFieldValue('custbody_r7_is_merge_contract') == 'T';
}

function getItemsFromOrder(recOrder){

    var lineItems = new Array();

    // Array of valid acrId/Products for tracking date mismatch
    //var arrValidACR = ['1','2','3','6']; // NX, MS, ManService, MB
    // Create array to hold all activation keys to test dates
    var arrValidActivationKeys = new Array();

    // Initialize array to hold all itemIds
    var arrAllItemIds = new Array();

    lineItemCount = recOrder.getLineItemCount('item');

    for (var i = 1; i <= lineItemCount; i++) {
        var lineItem = {};
        var itemId = recOrder.getLineItemValue('item', 'item', i);
        var itemType = recOrder.getLineItemValue('item', 'itemtype', i);
        var lineId = recOrder.getLineItemValue('item', 'id', i);

        if (itemId == -6) {
            this.partnerDiscount = true;
        }
        else {
            this.partnerDiscount = false;
        }
        arrAllItemIds.push(itemId);
        if (itemType != 'Subtotal' && itemType != 'Discount' && itemType != 'Description' && itemType != 'Group' && itemType != 'EndGroup') {

            var itemProperties = getItemProperties(itemId);
            var ACL = itemProperties['custitemr7itemautocreatelicense'];
            var acrId = itemProperties['custitemr7itemacrproducttype'];
            var srpTemplate = itemProperties['custitemr7defaultsrptemplates'];
            nlapiLogExecution('DEBUG', 'ACRID', acrId);
            var activationKey = '';
            if (acrId != null && acrId != '') {
                activationKey = recOrder.getLineItemValue('item', arrProductTypes[acrId]['optionid'], i);
                var lineOneItemFlow = recOrder.getLineItemValue('item', 'custcolr7_one_item_flow', i);
                if(lineOneItemFlow&&lineOneItemFlow==2){
                    nlapiLogExecution('DEBUG','lineOneItemFlow&&lineOneItemFlow==2', ACL)
                    ACL = false;
                    nlapiLogExecution('DEBUG','lineOneItemFlow&&lineOneItemFlow==2', ACL)
                }

                // For each valid acrId push activation key to array if not already there
                if(ACL == 'T' && arrValidActivationKeys.indexOf(activationKey) == -1){
                    if (activationKey != null && activationKey != '') {
                        arrValidActivationKeys.push(activationKey);
                    }
                }
            }

            var strItemAddOns = itemProperties['custitemr7acladdons'];
            var requireEvent = itemProperties['custitemr7itemrequireeventregistration'];

            if (strItemAddOns != null && strItemAddOns != '') {
                lineItem['isAddOn'] = 'T';
            }
            else {
                lineItem['isAddOn'] = 'F';
            }

            lineItem['itemId'] = itemId;
            lineItem['itemType'] = itemType;
            lineItem['itemProperties'] = itemProperties;
            lineItem['isACL'] = ACL;
            lineItem['addOns'] = strItemAddOns;
            lineItem['srptemplate'] = srpTemplate;
            lineItem['job'] = recOrder.getLineItemValue('item', 'job', i);
            lineItem['requireEvent'] = requireEvent;
            lineItem['lineId'] = lineId;
            lineItem['quantity'] = parseInt(recOrder.getLineItemValue('item', 'quantity', i));
            lineItem['unitType'] = recOrder.getLineItemValue('item', 'custcolr7itemqtyunit', i);
            lineItem['amount'] = parseInt(recOrder.getLineItemValue('item', 'amount', i));
            lineItem['contact'] = recOrder.getLineItemValue('item', 'custcolr7translinecontact', i); //Line item contact
            lineItem['acrId'] = acrId; // product Type id
            lineItem['activationKey'] = activationKey;
            lineItem['eventmaster'] = recOrder.getLineItemValue('item', 'custcolr7eventmaster', i);
            lineItem['linelocation'] = recOrder.getLineItemValue('item', 'location', i);
            lineItem['amount'] = recOrder.getLineItemValue('item', 'amount', i);
            lineItem['taxcode'] = recOrder.getLineItemValue('item', 'taxcode', i);
            lineItem['lineNum'] = i;
            lineItem['revrecenddate'] = recOrder.getLineItemValue('item', 'revrecenddate', lineItem['lineNum']);
            lineItem['revrecstartdate'] = recOrder.getLineItemValue('item', 'revrecstartdate', lineItem['lineNum']);
            lineItems['arrValidActivationKeys'] = arrValidActivationKeys;
            lineItems['allItemIds'] = arrAllItemIds;
            /*
             * Get field for requires HBR
             */
            lineItem['requireshbr'] = itemProperties['custitemr7requireshbr'];
            lineItems[lineItems.length] = lineItem;
        }
    }
    return lineItems;
}

function getDatesMinMax(recOrder, activationKey){
    // Initialize arrays for minStartDate and maxEndDate
    var dates = new Array();
    dates['aclGroupMinStartDate'] = '';
    dates['aclGroupMaxEndDate'] = '';

    var lineItemCount = recOrder.getLineItemCount('item');

    for (var i = 1; i <= lineItemCount; i++) {
        var lineId = recOrder.getLineItemValue('item', 'id', i);
        var acrId = arrItemACRIds[lineId];

        if (acrId == null || acrId == '' || acrId == 'undefined') {
            // do nothing
            continue;
        }
        else {
            var optionId = arrProductTypes[acrId]['optionid'];
            var currentActivationKey = recOrder.getLineItemValue('item', optionId, i);
            var currentLineId = recOrder.getLineItemValue('item', 'id', i);

            if (currentActivationKey == activationKey || (activationKey.substr(0, 4) == 'PEND' && activationKey.substr(5) == currentLineId)) {
                //var ACL = recOrder.getLineItemValue('item', 'custcolr7transautocreatelicense', i);
                // Get start and end dates
                var strRevRecStartDate = recOrder.getLineItemValue('item', 'revrecstartdate', i);
                var strRevRecEndDate = recOrder.getLineItemValue('item', 'revrecenddate', i);
                nlapiLogExecution('DEBUG', 'strRevRecStartDate' + i, strRevRecStartDate);
                nlapiLogExecution('DEBUG', 'strRevRecEndDate' + i, strRevRecEndDate);

                // If start date is empty or less than startdate for current AK, then set to date of current line item = Minimum Start Date of ACL
                if (dates['aclGroupMinStartDate'] == '' || dates['aclGroupMinStartDate'] == null || (strRevRecStartDate != null && strRevRecStartDate != '' && nlapiStringToDate(strRevRecStartDate) < nlapiStringToDate(dates['aclGroupMinStartDate']))) {
                    dates['aclGroupMinStartDate'] = strRevRecStartDate;
                }
                // If endDate is empty or greater than endDate for current AK, then set to date of current line item = Maximum End Date of ACL
                if (dates['aclGroupMaxEndDate'] == '' || dates['aclGroupMaxEndDate'] == null || (strRevRecEndDate != null && strRevRecEndDate != '' && nlapiStringToDate(strRevRecEndDate) > nlapiStringToDate(dates['aclGroupMaxEndDate']))) {
                    dates['aclGroupMaxEndDate'] = strRevRecEndDate;
                }
            }
        }
    }
    return dates;
}

function getItemProperties(itemId){

    var arrFieldId = new Array();
    arrFieldId[arrFieldId.length] = 'custitemr7itemacrproducttype';
    arrFieldId[arrFieldId.length] = 'custitemr7itemautocreatelicense';
    arrFieldId[arrFieldId.length] = 'custitemr7itemdedicatedhosted';
    arrFieldId[arrFieldId.length] = 'custitemr7acladdons';
    arrFieldId[arrFieldId.length] = 'isinactive';
    arrFieldId[arrFieldId.length] = 'displayname';
    arrFieldId[arrFieldId.length] = 'custitemr7itemmslicensetype1';
    arrFieldId[arrFieldId.length] = 'custitemr7itemnxlicensetype';
    arrFieldId[arrFieldId.length] = 'issueproduct';
    arrFieldId[arrFieldId.length] = 'custitemr7itemactivationemailtemplate';
    arrFieldId[arrFieldId.length] = 'custitemr7itemfamily';
    arrFieldId[arrFieldId.length] = 'custitemr7itemdefaultterm';
    arrFieldId[arrFieldId.length] = 'custitemr7itemcategory';
    arrFieldId[arrFieldId.length] = 'custitemr7itemdefaulteventmaster';
    arrFieldId[arrFieldId.length] = 'custitemr7itemrequireeventregistration';
    // Lookup required Items
    arrFieldId[arrFieldId.length] = 'custitemr7skurequiresitems';
    //Item Fulfillment
    arrFieldId[arrFieldId.length] = 'isfulfillable';
    arrFieldId[arrFieldId.length] = 'vsoedelivered';
    // HBR Fulfillment
    arrFieldId[arrFieldId.length] = 'custitemr7requireshbr';
    arrFieldId[arrFieldId.length] = 'custitemr7defaultsrptemplates';

    for (acrId in arrProductTypes) {
        var templateFieldId = arrProductTypes[acrId]['templateid'];

        if (templateFieldId != null && templateFieldId != '' && templateFieldId != 'undefined') {
            arrFieldId[arrFieldId.length] = templateFieldId;
        }
    }

    var lookedUpProperties = memoizedLookupField('item', itemId, arrFieldId);
    return lookedUpProperties;
}

function alertOrRequired(requiredQuote,requiredSalesOrder,msg){ // first required is quote, second required is SO
    if (orderType == 'salesorder') {
        if (requiredSalesOrder == true) {
            requiredCounter++;
            salesOrder.required += requiredCounter + ') '+msg+'\n';
        }
        else if(requiredSalesOrder == false){
            alertCounter++;
            salesOrder.alert += alertCounter + ') '+msg+'\n';
        }
        // MB: 10/31/14 -  Added else for null
        else {
            //nlapiLogExecution('DEBUG','Null on order');
            return;
        }
    }
    else if(orderType == 'estimate'){
        if (requiredQuote == true) {
            requiredCounter++;
            quote.required += requiredCounter + ') '+msg+'\n';
        }
        else if(requiredQuote == false){
            alertCounter++;
            quote.alert += alertCounter + ') '+msg+'\n';
        }
        else {
            //nlapiLogExecution('DEBUG','Null on quote');
            return;
        }
    }
}

// Check if license features enabled by AK and product type (acrId)
function checkLicFeaturesByAK(acrId,AK,fields){
    if (acrId != null && acrId != '' && AK != null && AK != '' && fields != null) {
        var licType = arrProductTypes[acrId]['recordid'];
        var activationId = arrProductTypes[acrId]['activationid'];
        // Search for license with specific AK
        var licFilters = new Array();
        licFilters[0] = new nlobjSearchFilter(activationId, null, 'is', AK);

        // build dynamic result columns based off input fields array
        var licColumns = new Array();
        for (var c = 0; c < fields.length; c++) {
            licColumns[c] = new nlobjSearchColumn(fields[c]);
        }
        var licResults = nlapiSearchRecord(licType, null, licFilters, licColumns);

        // build features object, key is field internal Id (from fields param), value is field value
        var objFeatures = new Object();
        for (var r = 0; licResults != null && r < licResults.length; r++) {
            var columnValue = licResults[r].getValue(licColumns[r]);
            objFeatures[fields[r]] = columnValue;
            //nlapiLogExecution('DEBUG',r,objFeatures[fields[r]] + ' / ' +fields[r] + ' / ' + columnValue);
        }
        return objFeatures;
    }
    else return null;
}

function checkFileAttached(orderId){
    var fileFilters = new Array();
    fileFilters[0] = new nlobjSearchFilter('mainline',null,'is','T');
    fileFilters[1] = new nlobjSearchFilter('internalid',null,'is',orderId);
    fileFilters[2] = new nlobjSearchFilter('internalid','file','noneof','@NONE@');

    //var fileColumns = new Array();
    //fileColumns[0] = new nlobjSearchColumn('internalid','file');
    //fileColumns[1] = new nlobjSearchColumn('name','file');

    var fileResults = nlapiSearchRecord('salesorder', null, fileFilters, null);
    if (fileResults != null){
        return true;
    }
    else{
        return false;
    }
}

function findDateDiff(date1,date2) {
    //nlapiLogExecution('DEBUG', 'date1 / date2: ', date1 + ' / ' + date2);
    date1 = new Date(date1);
    date2 = new Date(date2);
    var oneDay=1000*60*60*24;
    var dateDiff = Math.ceil((date1.getTime()-date2.getTime())/oneDay);
    //nlapiLogExecution('DEBUG', 'dateDiff: ', dateDiff);
    //nlapiLogExecution('DEBUG','date difference: ', dateDiff);
    return dateDiff;
}

// Check if all values in array are the same
function allthesame(arr){
    var L= arr.length-1;
    while(L){
        if(arr[L--]!==arr[L]) {
            return false;
        }
    }
    return true;
}

// function grabLineItemACRIds(recOrder){
function grabLineItemACRIds(lineItems){
    var itemACRIds = {};

    for (var i = 0; i < lineItems.length; i++) {
        var lineId = lineItems[i]['lineId']
        var acrId = lineItems[i]['acrId']
        itemACRIds[lineId] = acrId;
    }

    return itemACRIds;
}

// Check the order to see if it already has Class A discovery
// function checkClassA(arrAllItemIds){
function checkClassA(lineItems){
    var hasClassA = false;
    for (var i = 0; lineItems != null && i < lineItems.length; i++) {
        // Lookup the items addons
        var addOns = lineItems[i]['itemProperties']['custitemr7acladdons']
        if (addOns != null && addOns != '') {
            addOns = addOns.split(",");
            // Check for addOn Component 37 NX: Number of Discovery IPs (Class A)
            if (addOns.indexOf('37') != -1) {
                // If class A is found in the addons array then the order has class A
                hasClassA = true;
                break;
            }
        }
    }
    return hasClassA;
}

//checks if any oneprice renewal lines have licenses that are missing product tokens
function checkOnePriceMigrations(recOrder) {

    function checkLicenseHasProductToken(acrProductType, productKey) {

        nlapiLogExecution('DEBUG', 'checkLicense', JSON.stringify({
            acrProductType: acrProductType,
            productKey: productKey
        }));

        var licFilters = [];
        var licColumns = [];
        var licType = null;

        switch (acrProductType) {
            case '1':
                licFilters[0] = new nlobjSearchFilter('custrecordr7nxproductkey', null, 'is', productKey);
                licColumns[0] = new nlobjSearchColumn('custrecordr7nxproducttoken');
                licType = 'customrecordr7nexposelicensing';
                break;
            case '2':
                licFilters[0] = new nlobjSearchFilter('custrecordr7msproductkey', null, 'is', productKey);
                licColumns[0] = new nlobjSearchColumn('custrecordr7msproducttoken');
                licType = 'customrecordr7metasploitlicensing';
                break;
            case '9':
                licFilters[0] = new nlobjSearchFilter('custrecordr7inplicenseprodcutkey', null, 'is', productKey);
                licColumns[0] = new nlobjSearchColumn('custrecordr7inpproducttoken');
                licType = 'customrecordr7insightplatform';
                break;
        }

        if (licType != null) {
            var licResults = nlapiSearchRecord(licType, null, licFilters, licColumns);
            for (var r = 0; licResults != null && r < licResults.length; r++) {
                var licRecProdToken = licResults[r].getValue(licColumns[0]);
                nlapiLogExecution('DEBUG', 'licRecProdToken', licRecProdToken);
                if (licRecProdToken == '') {
                    return false;
                }
                else {
                    return true;
                }
            }
        }
    }

    for (var z = 1; z <= recOrder.getLineItemCount('item'); z++) {
        var currentItem = recOrder.getLineItemValue('item', 'item', z);
        var oneItemFlow = recOrder.getLineItemValue('item', 'custcolr7_one_item_flow', z);
        var isACL = recOrder.getLineItemValue('item', 'custcolr7transautocreatelicense', z);
        var productToken = recOrder.getLineItemValue('item', 'custcolr7producttoken', z);
        var licenseIdText = recOrder.getLineItemValue('item', 'custcolr7translicenseid', z);
        var licenseLink = recOrder.getLineItemValue('item', 'custcolr7translicenselink', z);
        var productKey = recOrder.getLineItemValue('item', 'custcolr7itemmsproductkey', z);

        nlapiLogExecution('DEBUG', 'checkOnePriceMigrations ' + z, JSON.stringify({
            currentItem: currentItem,
            oneItemFlow: oneItemFlow,
            isACL: isACL,
            productToken: productToken,
            licenseIdText: licenseIdText,
            licenseLink: licenseLink,
            productKey: productKey
        }));

        if (oneItemFlow == 3 && isACL == 'T') {

            var acrProductType = nlapiLookupField('item', currentItem, 'custitemr7itemacrproducttype');
            nlapiLogExecution('DEBUG', 'acrProductType', acrProductType);

            if (productToken == null) {
                alertOrRequired(null, true, 'OnePrice renewal item is missing a product token on the sales order line.');
            }
            else {
                //check license records
                if (productKey && acrProductType == 1) {
                    var licHasToken = checkLicenseHasProductToken(acrProductType, productKey);
                    nlapiLogExecution('DEBUG', 'licHasToken', licHasToken);
                    if (!licHasToken) {
                        alertOrRequired(null, true, 'Nexpose license record missing product token. Click Migrate To OnePrice button.');
                    }
                }
                else if (productKey && acrProductType == 9) {
                    var licHasToken = checkLicenseHasProductToken(acrProductType, productKey);
                    nlapiLogExecution('DEBUG', 'licHasToken', licHasToken);
                    if (!licHasToken) {
                        alertOrRequired(null, true, 'Insight Platform license record missing product token. Click Migrate To OnePrice button.');
                    }
                }
                else if (productKey && acrProductType == 2) {
                    var licHasToken = checkLicenseHasProductToken(acrProductType, productKey);
                    nlapiLogExecution('DEBUG', 'licHasToken', licHasToken);
                    if (!licHasToken) {
                        alertOrRequired(null, true, 'Metasploit license record missing product token. Click Migrate To OnePrice button.');
                    }
                }
                else {
                    alertOrRequired(null, true, 'OnePrice renewal/migration license type is not supported yet.');
                }
            }
        }
    }
}

function isEmpty(str) {
    if (str != null && str != "") {
        str = str.replace(/\s/g, "");
    }
    if (str == null || str == "" || str.length < 1 || str == undefined) {
        return true;
    }
    return false;
}

function checkArrayPresent(onePriceCategories, orderCategoriesPurch){
    var isOnePrice = false;
    var isArray = orderCategoriesPurch instanceof Array;
    if(isArray){
        for(var i=0; i < orderCategoriesPurch.length; i++){
            var thisOnePCat = orderCategoriesPurch[i];
            nlapiLogExecution("DEBUG", "thisOnePCat", thisOnePCat);
            if(onePriceCategories.indexOf(thisOnePCat) !== -1){
                nlapiLogExecution("DEBUG", "Does thisOnePCat match?", onePriceCategories.indexOf(thisOnePCat));
                isOnePrice = true;
                break;
            }
        }
    }
    else {
        nlapiLogExecution("DEBUG", "Not Array. Does thisOnePCat match?", onePriceCategories.indexOf(orderCategoriesPurch));
        if(onePriceCategories.indexOf(orderCategoriesPurch) !== -1){
            nlapiLogExecution("DEBUG", "Does thisOnePCat match?", onePriceCategories.indexOf(thisOnePCat));
            isOnePrice = true;
        }
    }

    return isOnePrice;
}