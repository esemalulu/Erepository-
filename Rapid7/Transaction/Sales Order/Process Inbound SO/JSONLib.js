/**
 * @NApiVersion 2.x
 */
define(['N/error', 'N/search', 'N/email', 'N/url', 'N/https', 'N/record', 'N/runtime', './lodash.min', 'N/format'],
    function (error, search, email, url, https, record, runtime,_, format) {

        var memoizedSearchLookup = memoizeFunctionWithObjectArguments(
            search.lookupFields
        );
        var memoizedItemIsGroupCheck = memoizeFunctionWithObjectArguments(
            itemIsGroupCheck
        );
        var memoizedGetValueByFieldNameAndSearchValues = memoizeFunctionWithObjectArguments(
            getValueByFieldNameAndSearchValues
        );

        // APPS-21519 - initialize employeeId array
        var employeeIdsObj = {};

        function processJSON(requestBody, inboundEventId) {
            var requestObj = null;
            try {
                requestObj = JSON.parse(requestBody, parseSetValue);
            } catch (ex) {
                log.error({title: "JSON is not valid", detaisl: ex});
                return;
            }
            // search for employees netsuite id by external employee id
            updateNetsuiteIdbyExternalId(employeeIdsObj, requestObj.OMReviewer_employeeID);

            checkScriptUsage();
            var validationResult = validateRequiredFields(requestObj);
            if (!validationResult.valid) {
                throwError('JSON_DATA_ERROR', 'required JSON field is null, empty or invalid: ' + validationResult.fieldInfo[1]);
            } else {
                requestObj.lineItems = requestObj.lineItems.sort(compareLineSequenceNumber);
                log.debug({title: 'requestObjis ', details: requestObj});
            }
            checkScriptUsage();
            try {
                var mappedObject = {
                    Header: {},
                    lineItems: [],
                    billingAddressInformation: {},
                    shippingAddressInformation: {}
                };

                objAttrToHeader(requestObj, 'billingHeader');
                objAttrToHeader(requestObj, 'shippingHeader');
                objAttrToHeader(requestObj, 'HeaderAttributes');
                mappedObject.Header = processMapping(mapJSON, requestObj, mappedObject.Header, [
                    'billingAddressInformation', 'shippingAddressInformation', 'lineItems', 'billingHeader',
                    'shippingHeader', 'partner', 'distributor', 'HeaderAttributes']);
                checkScriptUsage();
                mappedObject.billingAddressInformation = mapLKeys(mapJSON, requestObj.billingAddressInformation,
                    mappedObject.billingAddressInformation);
                checkScriptUsage();
                mappedObject.shippingAddressInformation = mapLKeys(mapJSON, requestObj.shippingAddressInformation,
                    mappedObject.shippingAddressInformation);
                checkScriptUsage();
                
                for (var i = 0; i < requestObj.lineItems.length; i++) {
                    mappedObject.lineItems[i] = {};
                    mappedObject.lineItems[i] = processMapping(mapJSON, requestObj.lineItems[i], mappedObject.lineItems[i]);
                    checkScriptUsage();
                }
                mappedObject = checkLocationAndDepartment(mappedObject);
                checkScriptUsage();
                //add partner & distributor back to mappedObject
                mappedObject.partner = requestObj.partner;
                mappedObject.distributor = requestObj.distributor;

                return mappedObject;
            } catch (ex) {
                log.debug({
                    title: 'error in JSON mapping',
                    details: ex
                });

                if (ex.name === 'SSS_USAGE_LIMIT_EXCEEDED' || ex.message === 'Script Execution Usage Limit Exceeded') {
                    throw ex;
                }
            }
        }

        function updateNetsuiteIdbyExternalId(employeeIdsObj, OMReviewerID) {
            var filter = ['externalid', 'anyof']
            for (externalId in employeeIdsObj) {
                filter.push(externalId)
            }
            if(OMReviewerID){
                filter.push(OMReviewerID);
            }
            var employeeSearchObj = search.create({
                type: 'employee',
                filters: [filter],
                columns: ['internalid', 'externalid']
            });
            employeeSearchObj.run().each(function (result) {
                employeeIdsObj[result.getValue({ name: 'externalid' })] = result.getValue({ name: 'internalid' })
                return true;
            });
        }

        function checkScriptUsage() {
            var remainingUsage = runtime.getCurrentScript().getRemainingUsage();

            log.debug({
                title: 'remainingUsage',
                details: remainingUsage
            });

            if (remainingUsage < 200) {
                throwError('SSS_USAGE_LIMIT_EXCEEDED', 'Script Execution Usage Limit Exceeded');
            }
        }

        function validateRequiredFields(requestObj) {
            var result = null;
            try {
                var listOfFieldToValidate =
                    [
                        [requestObj.customer.netsuiteId, 'customer.netsuiteId'],
                        // [requestObj.salesRep.netsuiteId, 'salesRep.netsuiteId'],
                        [requestObj.startDate, 'startDate'],
                        [requestObj.endDate, 'endDate'],
                        [requestObj.purchaseOrderNumber, 'purchaseOrderNumber']
                    ];
                for (var i = 0; i < listOfFieldToValidate.length; i++) {
                    if (!validateIfNotNull(listOfFieldToValidate[i][0])) {
                        result = {valid: false, fieldInfo: listOfFieldToValidate[i]};
                        break;
                    }
                }
                if (result === null) {
                    log.debug('validateRequiredFields, validateCustomerContact');
                    if (requestObj.allContactRoles) {
                        //logic to validate of all contacts from all contact roles
                        validateCustomerContact(requestObj);
                    }
                    validateLineLicenseContacts(requestObj);
                    result = {valid: true};
                }
            } catch (ex) {
                result = {valid: false};
            }
            return result;
        }

        function validateCustomerContact(requestObj) {
            var arrRoles = [
                "License Contact - AppSec",
                "License Contact - ICN",
                "License Contact - IDR/MDR",
                "License Contact - IT Search",
                "License Contact - Offensive Security",
                "License Contact - VM",
                // replaced with new values by https://issues.corp.rapid7.com/browse/APPS-17965
                "Product Admin - AppSec",
                "Product Admin - ICN",
                "Product Admin - IDR/MDR",
                "Product Admin - IT Search",
                "Product Admin - Offensive Security",
                "Product Admin - VM",
                "Managed Service Contact"
            ];
            try {
                var SFContacts = requestObj.allContactRoles;
                var customerId = requestObj.customer.netsuiteId;
                log.debug('validateCustomerContact customerId', customerId);
                var customerSubsid = search.lookupFields({
                    type: search.Type.ENTITY,
                    id: customerId,
                    columns: 'subsidiary'
                }).subsidiary[0].value;
                log.debug('validateCustomerContact customerSubsid', customerSubsid);
                SFContacts.forEach(function (SFContact) {
                    var memoizedContactSearch = memoizeSearchContact(
                        searchContact
                    );
                    var contactFoundByEmail = memoizedContactSearch(
                        customerId,
                        SFContact
                    );
                    log.debug('contact is found by email', contactFoundByEmail.success);
                    if (!contactFoundByEmail.success) {
                        if (arrRoles.indexOf(SFContact.role) !== -1) {
                            var newContact = record.create({
                                type: record.Type.CONTACT,
                                isDynamic: true
                            });
                            newContact.setValue({
                                fieldId: 'subsidiary',
                                value: customerSubsid
                            });
                            newContact.setValue({
                                fieldId: 'company',
                                value: customerId
                            });
                            newContact.setValue({
                                fieldId: 'firstname',
                                value: SFContact.firstName
                            });
                            newContact.setValue({
                                fieldId: 'lastname',
                                value: SFContact.lastName
                            });
                            newContact.setValue({
                                fieldId: 'email',
                                value: SFContact.email
                            });
                            var contactId = newContact.save({
                                ignoreMandatoryFields: true
                            });
                            log.debug('created New Contact with id', contactId);
                        }
                    }
                });
            } catch (ex) {
                log.error('ERROR_DIRING_CONTACT_CREATION', ex);
            }
        }

        function validateLineLicenseContacts(requestObj) {
            try {
                var lineItems = requestObj.lineItems;
                var customerId = requestObj.customer.netsuiteId;
                log.debug('validateLineLicenseContacts customerId', customerId);
                var customerSubsid = search.lookupFields({
                    type: search.Type.ENTITY,
                    id: customerId,
                    columns: 'subsidiary'
                }).subsidiary[0].value;
                log.debug('validateLineLicenseContacts customerSubsid', customerSubsid);
                lineItems.forEach(function (lineItem) {
                    var SFContact = lineItem.lineContact;
                    var memoizedContactSearch = memoizeSearchContact(
                        searchContact
                    );
                    var contactFoundByEmail = memoizedContactSearch(
                        customerId,
                        SFContact
                    );
                    log.debug('validateLineLicenseContacts contact is found by email', contactFoundByEmail.success);
                    if (!contactFoundByEmail.success) {
                        var newContact = record.create({
                            type: record.Type.CONTACT,
                            isDynamic: true
                        });
                        newContact.setValue({
                            fieldId: 'subsidiary',
                            value: customerSubsid
                        });
                        newContact.setValue({
                            fieldId: 'company',
                            value: customerId
                        });
                        newContact.setValue({
                            fieldId: 'firstname',
                            value: SFContact.firstName
                        });
                        newContact.setValue({
                            fieldId: 'lastname',
                            value: SFContact.lastName
                        });
                        newContact.setValue({
                            fieldId: 'email',
                            value: SFContact.email
                        });
                        var contactId = newContact.save({
                            ignoreMandatoryFields: true
                        });
                        log.debug('validateLineLicenseContacts created New Contact with id', contactId);
                        SFContact.netsuiteId = contactId;
                        log.debug('validateLineLicenseContacts updated line contact with new ID', JSON.stringify(SFContact));
                    }
                    else {
                        SFContact.netsuiteId = contactFoundByEmail.internalid;
                        log.debug('validateLineLicenseContacts updated line contact with existing ID', JSON.stringify(SFContact));
                    }
                });
            } catch (ex) {
                log.error('ERROR_DIRING_CONTACT_CREATION', ex);
            }
        }

        function searchContact(customerId, contact) {
            var contactFound = new Object();
            contactFound.success = false;
            log.debug('NS id is null, check if there is contact for ' + customerId + ' and ' + contact.email);
            var filters = [
                ['company', search.Operator.ANYOF, [customerId]], 'and',
                [
                    ['email', search.Operator.IS, contact.email], 'or',
                    [
                        ['firstname', search.Operator.IS, contact.firstName], 'and',
                        ['lastName', search.Operator.IS, contact.lastName]
                    ]
                ]
            ];
            var contactSearch = search.create({
                type: search.Type.CONTACT,
                filters: filters,
            });
            log.debug('created contact search', contactSearch);
            var contactSearchResult = contactSearch.run();
            contactSearchResult.each(function (result) {
                contactFound.success = true;
                contactFound.internalid = result.id;
                log.debug('there is a contact for the customer ' + customerId + ' with email ' + contact.email);
                return false;
            });
            return contactFound;
        }

        // non-universal! specific for searchContact function
        function memoizeSearchContact(searchContactFunc) {
            var cache = {};
            return function () {
                var args = Array.prototype.slice.call(arguments);
                var customerId = args[0];
                var contactObj = args[1];
                var key =
                    customerId +
                    "_" +
                    contactObj.firstname +
                    "_" +
                    contactObj.lastName +
                    "_" +
                    contactObj.email;
                if (cache[key] === undefined) {
                    log.debug("caching contact search", JSON.stringify(contactObj));
                    cache[key] = searchContactFunc.apply(this, args);
                }
                return cache[key];
            };
        }

        function validateIfNotNull(FieldToValidate) {
            return !isNullOrEmpty(FieldToValidate);
        }

        function processMapping(mapJSON, objLevel, mapLevel, skipFields) {
            mapLKeys(mapJSON, objLevel, mapLevel, skipFields);
            mapIds(mapJSON, objLevel, mapLevel, skipFields);
            return mapLevel;
        }

        function checkLocationAndDepartment(mappedObject) {
            try {
                var salesRepRecord = record.load({
                    type: record.Type.EMPLOYEE,
                    id: mappedObject.Header.salesrep,
                });
            } catch (ex) {
                throw error.create({
                    name: 'INVALID_SALESREP',
                    message: 'SalesRep ' + mappedObject.Header.salesrep + ' could not be found as an employee in NetSuite' + ex
                });
            }
            
            try {
                var billingCountry = mappedObject.billingAddressInformation.country;
                mappedObject.Header.subsidiary = billingCountry === 'US' ? 1 : 10;
                var customerSubsidiary = mappedObject.Header.subsidiary;
                var location = customerSubsidiary === 1 ? 1 : 29;
                if (isNullOrEmpty(mappedObject.Header.location) || isNullOrEmpty(mappedObject.Header.department)) {
                    mappedObject.Header.location = location;
                    mappedObject.Header.department = salesRepRecord.getValue({fieldId: 'department'});
                }
                for (var i = 0; i < mappedObject.lineItems.length; i++) {
                    if (isNullOrEmpty(mappedObject.lineItems[i].location)) {
                        mappedObject.lineItems[i].location = location;
                    }
                }
            } catch (ex) {
                log.debug('error in checkLocationAndDepartment', ex);
            }
            return mappedObject;
        }

        function mapLKeys(mapJSON, objLevel, mapLevel, skipFields) {
            try {
                if (isNullOrEmpty(skipFields)) {
                    skipFields = [];
                }
                for (var key in objLevel) {
                    if (isInArray(key, skipFields)) {
                        continue;
                    }
                    var mapped = false;
                    for (var mapKey in mapJSON) {
                        if (key.toUpperCase() === mapKey.toUpperCase()) {
                            mapLevel[mapJSON[mapKey]] = objLevel[key];
                            key = mapJSON[mapKey];
                            mapped = true;
                        }
                    }
                    if ((!mapped)) {
                        mapLevel[key] = objLevel[key];
                    }
                }
                return mapLevel;
            } catch (ex) {
                log.error('mapLKeys', ex);
            }
        }

        function mapIds(mapJSON, objLevel, mapLevel, skipFields) {
            try {
                if (isNullOrEmpty(skipFields)) {
                    skipFields = [];
                }
                for (var key in mapLevel) {
                    var sckipSearch = false;
                    if (isInArray(key, skipFields)) {
                        continue;
                    }
                    if (mapLevel[key] instanceof Object) {
                        try {
                            var netsuiteId = mapLevel[key].netsuiteId;
                            var employeeId = mapLevel[key].employeeId;
                            var projectId = mapLevel[key].projectId;
                            /* ---------------------- modified 30.08.2019 (APPS-3071)------------ */
                            if (!netsuiteId && key === 'custbody_tt_billing_contact_new') {
                                var emailVal = mapLevel[key].email;
                                var contactId = " ";
                                if (emailVal) {
                                    contactId = emailVal;
                                }
                                log.debug(mapLevel[key], contactId);
                                mapLevel[key] = contactId;
                                sckipSearch = true;
                                // APPS-21519 - Utilize Employee ID
                            } else if (!isNullOrEmpty(employeeId)) {
                                sckipSearch = true;
                                log.debug('setting netsuite id by externalId!', employeeId + ' - ' + employeeIdsObj[employeeId])
                                mapLevel[key] = employeeIdsObj[employeeId];
                            } else if(key === 'custcol_r7_ff_project_id'){
                                sckipSearch = true;
                                mapLevel[key] = projectId;
                            } else if(key === 'ffProjectIds'){
                                sckipSearch = true;
                            } else {
                                sckipSearch = true;
                                if(key.toUpperCase() === 'ENTITY'){
                                    mapLevel['custbody_r7_sf_account'] = mapLevel[key].salesforceId;
                                }
                                mapLevel[key] = netsuiteId;
                            }
                        } catch (ex) {
                            log.debug({
                                title: 'error processMapping for objects',
                                details: ex
                            });
                        }
                    }
                    if (key === 'orderstatus') {
                        for (var statusKey in transactionStatuses) {
                            if (mapLevel[key].toUpperCase() === statusKey.toUpperCase()) {
                                mapLevel[key] = transactionStatuses[statusKey];
                            }
                        }
                    }
                    if (key === 'custbodyr7_sf_reviewer_id') {
                        var reviewerEmpId = mapLevel[key];
                        mapLevel[key] = employeeIdsObj[reviewerEmpId];
                    }
                    for (var i = 0; i < listOfFields.length; i++) {
                        if (key === listOfFields[i].recordName) {
                            if (key === 'price' && mapLevel[key] === 'Custom') {
                                mapLevel[key] = -1;
                            } else if (key === 'item' && (mapLevel[key] === 'Subtotal' || mapLevel[key] === 'Partner Discount' || mapLevel[key] === 'Description')) {
                                mapLevel[key] = mapLevel[key] === 'Subtotal' ? -2 : mapLevel[key];
                                mapLevel[key] = mapLevel[key] === 'Partner Discount' ? -6 : mapLevel[key];
                                mapLevel[key] = mapLevel[key] === 'Description' ? -3 : mapLevel[key];
                            } else if (!sckipSearch) {
                                mapLevel[key] = getFieldsIDs(key, mapLevel[key], i);
                            }
                        }

                    }
                    if (isInArray(key, listOfDates)) {
                        if (!isNullOrEmpty(mapLevel[key])) {
                            if (key === 'trandate' || key === 'custbodyr7dateinternalreporting' || key === 'saleseffectivedate') {
                                mapLevel[key] = new Date(Date.now());
                            } else {
                                mapLevel[key] = parseDate(mapLevel[key]);
                            }
                        } else {
                            mapLevel[key] = '';
                        }
                    }
                }
                return mapLevel;

            } catch (ex) {
                log.error('mapLKeys', ex);
            }
        }

        function getFieldsIDs(key, value, listObjNum) {
            value = memoizedGetValueByFieldNameAndSearchValues(
                listOfFields[listObjNum].recordType,
                listOfFields[listObjNum].fieldsToLookAt,
                [value],
                listOfFields[listObjNum].fieldToReturn
            );
            return value;
        }

        function isInArray(value, array) {
            return array.indexOf(value) > -1;
        }

        function getValueByFieldNameAndSearchValues(recordType, fieldsToLookAt, values, fieldToReturn) {
            var result = null;

            // P&P do not set item to null in case of packages (if related postfix/suffix exists)
            if (recordType == 'item') {
                // example: var packageLevels = [{name: 'Advanced', levelSuffix: '-ADV-', levelCode: 'ADV'}, {name: 'Ultimate', levelSuffix: '-ULT-', levelCode: 'ULT'}];
                var packageLevels = getAllPackageLevels();
                log.debug('packageLevels', JSON.stringify(packageLevels));

                //check if item is a Package Level record:

                var isPackageLevelRecord = _.find(packageLevels, function (pl){
                    if(pl.name === values[0]){
                        return true;
                    }
                })

                //return the item if it's a package level record:
                if(isPackageLevelRecord){
                    result = values[0];
                    log.audit('packageLevels item is a package level record', values[0]);
                    return result;
                }

                log.debug('packageLevels item is NOT a package level record', values[0]);
            }

            if (isNullOrEmpty(fieldsToLookAt)) {
                throw error.create({
                    name: 'INVALID_PARAMETER',
                    message: 'Empty list of Fields to look at have being passed. Please check.'
                });
            }
            if (isNullOrEmpty(values)) {
                throw error.create({
                    name: 'INVALID_PARAMETER',
                    message: 'Empty list of Values to look at have being passed. Please check.'
                });
            }

            var lsearch = search.create({
                type: recordType,
                filters: [{
                    name: fieldsToLookAt,
                    operator: 'is',
                    values: values
                }],
                columns: [{
                    name: fieldToReturn
                }]
            });
            var results = lsearch.run();
            if (!isNullOrEmpty(results)) {
                try {
                    results.each(function (res) {
                        result = res.getValue({
                            name: fieldToReturn
                        });
                        return false;
                    });
                } catch (ex) {
                    result = null;
                }
            }
            return result;
        }

        function objAttrToHeader(requestObj, objAttrt) {
            for (var key in requestObj[objAttrt]) {
                requestObj[key] = requestObj[objAttrt][key];
            }
            delete requestObj[objAttrt];
            return requestObj;
        }

        function sendErrorEmail(error, inboundEventId) {
            var senderId = 106223954;
            var recipientEmail = ['sgensler@rapid7.com', 'netsuite_admin@rapid7.com'];
            //var timeStamp = new Date().getUTCMilliseconds();
            var toURL = https.get((url.resolveScript({
                scriptId: 'customscriptretrieveurl',
                deploymentId: 'customdeployretrieveurl',
                returnExternalUrl: true
            }))).body;

            email.send({
                author: senderId,
                recipients: recipientEmail,
                subject: 'Inbound Event Error',
                body: 'Inbound event error happened for the inbound event object with the id = ' + inboundEventId + ' . You can find it by the following link:\n ' + toURL + '/app/common/custom/custrecordentry.nl?id=' + inboundEventId + '&rectype=1315&whence=\nerror message is\n' + JSON.stringify(error)
            });
        }

        var mapJSON = {
            "Customer": "entity",
            "Subsidiary": "subsidiary",
            "leadSource": "leadsource",
            "partner": "partner",
            "distributor": "custbodyr7oppdistributor",
            "location": "location",
            "department": "department",
            "status": "orderstatus",
            "salesOrderCurrency": "currency",
            "salesRep": "salesrep",
            "purchaseOrderNumber": "otherrefnum",
            "memo": "memo",
            "date": "trandate",
            "startDate": "startdate",
            "endDate": "enddate",
            "createdFrom": "createdfrom",
            "salesEffectiveDate": "saleseffectivedate",
            "internalReportingDate": "custbodyr7dateinternalreporting",
            "delayedLicenseStartDate": "custbodyr7delayedlicensestartdate",
            "bespPriceListVersion": "custbody_besp_price_list_v",
            "ratableRevenueRestatementStatus": "custbodyr7ratablerevenuerestatementsta",
            "billingContact": "custbody_tt_billing_contact_new",
            "salesRepManager": "custbodyr7salesrepmanagerhistorical",
            "idrRep": "custbodyr7idrrep",
            "salesTerritory": "custbodyr7salesterritoryhistoricalcust",
            "billingResponsibleParty": "custbodyr7billingresponsibleparty",
            "quinvoiceTerms": "custbodyr7_quinvoice_terms",
            "billingAddress": "billingaddress_text",
            "shipTo": "shipaddress",
            "shippingAddressCountry": "shipcountry",
            "shipDate": "shipdate",
            "shippingAddressResidential": "shipisresidential",
            "shippingAddress": "shippingaddress_text",
            "shippingAddressState": "shipstate", /// TODO: Clarify this
            "shippingAddressZipCode": "shipzip", /// TODO: Clarify this
            "terms": "terms",
            "oemTransaction": "custbodyr7oemtransaction",
            "transactionIsE81Bundle": "custbody_eitf81_ise81bundle",
            "fromImportNeedsProcessing": "custbody_eitf81_mu_needs_processing",
            "salesRepTeam": "custbodyr7salesrepterritoryhistorical",
            "revenueTerritory": "custbodyr7revenueterritory",
            "employeeInvolvement": "custbodyr7nonrevenuesalesreps",
            "partnerDealType": "custbodyr7partnerdealtype",
            "categoryPurchased": "custbodyr7categorypurchased",
            "opportunity": "opportunity",
            "shippingMethod": "shipmethod",
            "discount": "discountitem",
            "rate": "rate",
            "primaryQuote": "custbodyr7includeinsalesforecast",
            "shippingCost": "shippingcost",
            "calculateACV": "custbodyr7_calculate_acv",
            "isSellerImporterOfRecord": "custbody_ava_is_sellerimporter",
            "shippingTaxCode": "shippingtaxcode", /// TODO: Clarify this
            "billToEntityUseCode": "custbody_ava_billtousecode",
            "shipToEntityUseCode": "custbody_ava_shiptousecode",
            "shippingCode": "custbody_avashippingcode",
            "vsoeReviewed": "custbodyr7vsoereviewed",
            "promotion": "promocode",
            "refreshItemsFromProject": "projitemsel",
            "amount": "amount",
            "incomeAccount": "custcol_ava_incomeaccount",
            "item": "item",
            "pickUp": "custcol_ava_pickup",
            "taxCodeMapping": "custcol_ava_taxcodemapping",
            "itemCategory": "custcol_item_category",
            "categoryPurchasedExpiration": "custcolr7_category_purchased_expire",
            "renewalACVAmount": "custcolr7acvamount",
            "description": "description",
            "priceLevel": "price",
            "printItems": "printitems",
            "quantity": "quantity",
            "revenueReceivedEndDate": "revrecenddate",
            "revenueReceivedScheduled": "revrecschedule",
            "revenueReceivedStartDate": "revrecstartdate",
            "taxCode": "taxcode",
            "taxRate": "taxrate1",
            "RatableDateProcessed": "custbodyr7ratabledateprocessed",
            "CrossExchangeRate": "custbodyr7crossexchangerate",
            "contractAutomationRecords": "custbodyr7contractautomationrecs",
            "salesforceId": "custbodyr7salesforceorderid",
            "EULA": "custbody_r7_sfdc_eula",
            "MSA": "custbody_r7_sfdc_msa",
            "ToS": "custbody_r7_sfdc_tos",
            "OtherLegalAgreement": "custbody_r7_sfdc_other",
            "OtherAgreements": "custbody_r7_sfdc_other_text",
            "shippingAddressResidential": "isresidential",
            "shippingAddressCountry": "country",
            "shippingAddressee": "addressee",
            "shippingAttn": "attention",
            "shippingAddress1": "addr1",
            "shippingAddress2": "addr2",
            "shippingAddress3": "addr3",
            "shippingAddressCity": "city",
            "shippingAddressState": "state", /// TODO: Clarify this
            "shippingAddressZipCode": "zip", /// TODO: Clarify this
            "billingAddressResidential": "isresidential",
            "billingAddressCountry": "country",
            "billingAddressee": "addressee",
            "billingAttn": "attention",
            "billingAddress1": "addr1",
            "billingAddress2": "addr2",
            "billingAddress3": "addr3",
            "billingAddressCity": "city",
            "billingAddressState": "state",
            "billingAddressZipCode": "zip",
            "billingNotes": "custbodysfbillingschedulenotes",
            "billingSchedule": "custbodysfbillingschedule",
            "shippingTaxCode": "shippingtax1rate", /// TODO: Clarify this
            "lineContact": "custcolr7translinecontact",
            "unitOfMeasure": "custcolr7itemqtyunit",
            "quoteNumber": "custbodyr7_sf_quotenumber",
            "opportunityNumber": "custbodyr7_sf_oppnumber",
            "licenseContactRoles": "custbodyr7_sf_licensecontact",
            "hardwareContactRoles": "custbodyr7_sf_hardwarecontact",
            "trainingContactRoles": "custbodyr7_sf_trainingcontact",
            "invoicingContactRoles": "custbodyr7_sf_invoicingcontact",
            "internalNotes": "custbodyr7_sf_internalnotes",
            "upsoldLicenseKey": "custbodyr7_sf_upsoldlicensekey",
            "dataRetentionLength": "custcolr7dataretentionlengthdays",
            "dataCenterLocation": "custcolr7datacenterlocation",
            "OMReviewer": "custbodyr7_sf_reviewer",
            "OMReviewer_employeeID": "custbodyr7_sf_reviewer_id",
            "monthlyDataLimitGB": "custcolr7_monthlydatalimit_gb",
            "productKey": "custcolr7itemmsproductkey",
            "productToken": "custcolr7producttoken",
            "lineSequenceId": "custcolr7_linehash",
            "SubscriptionTerm": "custcolr7onepriceterm",
            "SubscriptionTermInDays": "custcolr7onepriceterm_in_days",
            "transactionType": "custcolr7_one_item_flow",
            "lineStartDate": "custcolr7startdate",
            "lineEndDate": "custcolr7enddate",
            "totalOwnershipCount": "custcolr7totalownership",
            "promotionTerm": "custcol_r7_promo_term",
            "packageCode": "custcol_r7_pck_package_code",
            "preApprovedExpenses": "custbody_r7_pre_approved_expenses",
            "useOfSubcontractors": "custbody_r7_use_of_subcontractors",
            "contractNumber": "custbody_r7_sf_contract_number",
            "contractUrl": "custbody_r7_sf_contract_url",
            "autoRenewalOptOut": "custbody_r7_auto_renewal_opt_out",
            "thirdPartyScanning": "custbody_r7_3rd_party_scanning",
            "IsContractMerged": "custbody_r7_is_merge_contract",
            "incumbentProductPurchaseType": "custcolr7_incumbent_purchase_type",
            "psaProjectDetails":"custcol_r7_ff_project_id",
            "sellingMotion" : "custcolr7_oneprice_selling_motion",
            "referenceToIncumbents" : "referenceToIncumbents",
            "deploymentType" : "custcol_r7_deployment_type",
            "SF_Customer": "custbody_r7_sf_account",
            "ffProjectIds": "ffProjectIds",
            "earlyRenewal" : "custcol_r7_early_renewal",
            "isELAOrder" : "custbody_r7_ela_invoice",
            "ELAServicesIncludes" : "custbody_r7_ela_summary",
            "ELAProfServicesincludes" : "custbody_r7_ela_ps_summary"
        };

        var listOfFields = [{
            recordName: 'leadsource',
            recordType: search.Type.CAMPAIGN,
            fieldsToLookAt: 'title',
            fieldToReturn: 'internalid'
        }, {
            recordName: 'location',
            recordType: search.Type.LOCATION,
            fieldsToLookAt: 'name',
            fieldToReturn: 'internalid'
        }, {
            recordName: 'department',
            recordType: search.Type.DEPARTMENT,
            fieldsToLookAt: 'name',
            fieldToReturn: 'internalid'
        }, {
            recordName: 'custbody_besp_price_list_v',
            recordType: 'customlistbesp_price_list_version',
            fieldsToLookAt: 'name',
            fieldToReturn: 'internalid'
        }, {
            recordName: 'custbodyr7ratablerevenuerestatementsta',
            recordType: 'customlistr7ratrevrestatementstatus',
            fieldsToLookAt: 'name',
            fieldToReturn: 'internalid'
        }, {
            recordName: 'custbodyr7salesrepmanagerhistorical',
            recordType: search.Type.EMPLOYEE,
            fieldsToLookAt: 'entityid',
            fieldToReturn: 'internalid'
        }, {
            recordName: 'custbodyr7salesterritoryhistoricalcust',
            recordType: 'customrecordr7salesterritorygroups',
            fieldsToLookAt: 'name',
            fieldToReturn: 'internalid'
        }, {
            recordName: 'custbodyr7billingresponsibleparty',
            recordType: 'customlistr7billingresponsibleparty',
            fieldsToLookAt: 'name',
            fieldToReturn: 'internalid'
        }, {
            recordName: 'terms',
            recordType: search.Type.TERM,
            fieldsToLookAt: 'name',
            fieldToReturn: 'internalid'
        }, {
            recordName: 'custbodyr7salesrepterritoryhistorical',
            recordType: 'customrecordr7salesterritorygroups',
            fieldsToLookAt: 'name',
            fieldToReturn: 'internalid'
        }, {
            recordName: 'custbodyr7revenueterritory',
            recordType: 'customlist393',
            fieldsToLookAt: 'name',
            fieldToReturn: 'internalid'
        }, {
            recordName: 'custbodyr7nonrevenuesalesreps',
            recordType: search.Type.EMPLOYEE,
            fieldsToLookAt: 'entityid',
            fieldToReturn: 'internalid'
        }, {
            recordName: 'custbodyr7partnerdealtype',
            recordType: 'customlistr7partnerdealtype',
            fieldsToLookAt: 'name',
            fieldToReturn: 'internalid'
        }, {
            recordName: 'custbodyr7categorypurchased',
            recordType: 'customrecordr7categorypurchased',
            fieldsToLookAt: 'name',
            fieldToReturn: 'internalid'
        }, {
            recordName: 'opportunity',
            recordType: search.Type.OPPORTUNITY,
            fieldsToLookAt: 'tranid',
            fieldToReturn: 'internalid'
        }, {
            recordName: 'discountitem',
            recordType: search.Type.DISCOUNT_ITEM,
            fieldsToLookAt: 'itemid',
            fieldToReturn: 'internalid'
        }, {
            recordName: 'price',
            recordType: search.Type.PRICE_LEVEL,
            fieldsToLookAt: 'name',
            fieldToReturn: 'internalid'
        }, {
            recordName: 'custbody_ava_shiptousecode',
            recordType: 'customrecord_avaentityusecodes',
            fieldsToLookAt: 'name',
            fieldToReturn: 'internalid'
        }, {
            recordName: 'item',
            recordType: search.Type.ITEM,
            fieldsToLookAt: 'itemid',
            fieldToReturn: 'internalid'
        }, {
            recordName: 'custbody_ava_billtousecode',
            recordType: 'customrecord_avaentityusecodes',
            fieldsToLookAt: 'name',
            fieldToReturn: 'internalid'
        }, {
            recordName: 'taxcode',
            recordType: search.Type.SALES_TAX_ITEM,
            fieldsToLookAt: 'itemid',
            fieldToReturn: 'internalid'
        }, {
            recordName: 'shipmethod',
            recordType: search.Type.SHIP_ITEM,
            fieldsToLookAt: 'itemid',
            fieldToReturn: 'internalid'
        }, {
            recordName: 'shippingtax1rate',
            recordType: search.Type.SALES_TAX_ITEM,
            fieldsToLookAt: 'itemid',
            fieldToReturn: 'internalid'
        }, {
            recordName: 'custbody_avashippingcode',
            recordType: 'customrecord_avashippingcodes',
            fieldsToLookAt: 'name',
            fieldToReturn: 'internalid'
        }, {
            recordName: 'custcolr7itemqtyunit',
            recordType: 'customlist275',
            fieldsToLookAt: 'name',
            fieldToReturn: 'internalid'
        }, {
            recordName: 'currency',
            recordType: search.Type.CURRENCY,
            fieldsToLookAt: 'symbol',
            fieldToReturn: 'internalid'
        },
            {
                recordName: 'custbodysfbillingschedule',
                recordType: 'customlistsfbillingschedulelist',
                fieldsToLookAt: 'name',
                fieldToReturn: 'internalid'
            },
            {
                recordName: 'custcolr7datacenterlocation',
                recordType: 'customlist1337',
                fieldsToLookAt: 'name',
                fieldToReturn: 'internalid'
            },
            {
                recordName: 'custcolr7_one_item_flow',
                recordType: 'customlistr7_one_item_flow',
                fieldsToLookAt: 'name',
                fieldToReturn: 'internalid'
            },
            {
                recordName: 'custcol_r7_pck_package_code',
                recordType: 'customrecord_r7_pck_package_code',
                fieldsToLookAt: 'name',
                fieldToReturn: 'internalid'
            },
            {
                recordName: 'custcolr7_oneprice_selling_motion',
                recordType: 'customlistr7_oneprice_selling_motion',
                fieldsToLookAt: 'name',
                fieldToReturn: 'internalid'
            },
            {
                recordName: 'custcol_r7_deployment_type',
                recordType: 'customlist_r7_deployment_type',
                fieldsToLookAt: 'name',
                fieldToReturn: 'internalid'
            }
        ];
        var listSetText = ['otherrefnum', 'memo', 'custbodyr7oemtransaction', 'custbody_eitf81_ise81bundle',
            'custbody_eitf81_mu_needs_processing', 'custbodyr7includeinsalesforecast',
            'custbodyr7_calculate_acv', 'custbody_ava_is_sellerimporter', 'custbodyr7vsoereviewed',
            'custcolr7dataretentionlengthdays', 'custcolr7_monthlydatalimit_gb','custcol_r7_ff_project_id', 'referenceToIncumbents'];
        var listOfDates = ['trandate', 'startdate', 'enddate', 'saleseffectivedate',
            'custbodyr7dateinternalreporting', 'custbodyr7delayedlicensestartdate',
            'custcolr7_category_purchased_expire', 'shipdate', 'custcolr7startdate', 'custcolr7enddate', 'custbodyr7sfdcdelayedlicensestartdate'];

        var transactionStatuses = {
            'Pending Approval': 'A',
            'Pending Fulfillment': 'B',
            'Cancelled': 'C',
            'Partially Fulfilled': 'D',
            'Pending Billing/Partially Fulfilled': 'E',
            'Pending Billing': 'F',
            'Billed': 'G',
            'Closed': 'H'
        };

        function isNullOrEmpty(value) {
            return (value === undefined || value === null || value === '');
        }

        function parseSetValue(key, value) {
            // APPS-21519 - Utilize Employee ID
            // here we get all of the passed employeeIds for further searching
            if (key === 'employeeId') {
                employeeIdsObj[value] = null;
            }
            return value;
        }

        function throwError(name, message) {
            var errorObj = error.create({
                name: name,
                message: message
            });
            throw (errorObj);
        }

        function compareLineSequenceNumber(a, b) {
            if (a.lineSequenceNumber < b.lineSequenceNumber)
                return -1;
            if (a.lineSequenceNumber > b.lineSequenceNumber)
                return 1;
            return 0;
        }

        function parseDate(input) {
            var parts = input.split('-');
            // new Date(year, month [, day [, hours[, minutes[, seconds[, ms]]]]])
            return new Date(parts[0], parts[1] - 1, parts[2]); // Note: months are 0-based
        }

        function createSOHeader(requestBody, salesOrder, firstSetHeaderFields) {
            log.debug({title: 'parsed object for setValue only is ', details: requestBody});
            salesOrder.setValue({
                fieldId: 'customform',
                value: 68
            });
            if (!isNullOrEmpty(firstSetHeaderFields)) {
                for (var i = 0; i < firstSetHeaderFields.length; i++) {
                    var field = firstSetHeaderFields[i];
                    salesOrder.setValue({
                        fieldId: field,
                        value: requestBody.Header[field]
                    });
                }
            }
            for (var key in requestBody.Header) {
                if (
                    isNullOrEmpty(requestBody.Header[key]) ||
                    isInArray(key, firstSetHeaderFields)
                ) {
                    continue;
                }
                var theValue = requestBody.Header[key];
                var isBooleanValue = false;
                var initialValue = theValue;
                if (theValue === true || theValue === false) {
                    theValue = theValue ? 'T' : 'F';
                    isBooleanValue = true;
                }
                if(theValue === 'true' || theValue === 'false') {
                    theValue = theValue === 'true';
                }
                if (!isInArray(key, listSetText)) {
                    try {
                        salesOrder.setValue({
                            fieldId: key,
                            value: theValue
                        });
                    }catch(ex){
                        if(isBooleanValue){
                            salesOrder.setValue({
                                fieldId: key,
                                value: initialValue
                            });
                        }
                    }
                } else {
                    salesOrder.setText({
                        fieldId: key,
                        text: theValue
                    });
                }
            }
            /********************** Modified 09.09.2019 (APPS-3662) *********************** */
            // https://issues.corp.rapid7.com/browse/APPS-10182
            salesOrder.setValue({
                fieldId: 'custbodyr7sfdcdelayedlicensestartdate',
                value: salesOrder.getValue('custbodyr7delayedlicensestartdate')
            });
            salesOrder.setValue({
                fieldId: 'custbodyr7_salesforcesourl',
                value: 'https://r7.lightning.force.com/one/one.app#/sObject/' + requestBody.Header.custbodyr7salesforceorderid + '/view'
            });
        }

        function createSOLines(requestBody, salesOrder, inboundEventId) {
            log.debug({
                title: 'createSOLines() requestBody',
                details: requestBody
            });
            var isNXPIVMMigrationData = checkNXPIVMMigration(requestBody.lineItems);

            for (var i = 0; i < requestBody.lineItems.length; i++) {
                log.debug('requestBody.lineItems ' + i, JSON.stringify(requestBody.lineItems[i]));

                // check for Package and go different direction:
                var currentItem = requestBody.lineItems[i].item;
                //APPS-39181 - if line attribute IDRUpgradeNeeded == true & current item = IDR-ULT-SUB
                //flip from Renewal to New/Upgrade to allow ICN to provision.
                if(requestBody.lineItems[i].LineAttributes){
                    var LineAttributes = JSON.parse(requestBody.lineItems[i].LineAttributes);
                    log.audit("currentItem", currentItem);
                    log.audit("LineAttributes", LineAttributes);
                    if(currentItem == "IDR-ULT-SUB" && LineAttributes.IDRUpgradeNeeded){
                        log.audit("Forcing Upgrade from IDR-SUB to ULT", "currentItem: "+currentItem+". Upgrade Needed?: "+LineAttributes.IDRUpgradeNeeded);
                        requestBody.lineItems[i].custcolr7_one_item_flow = 1;
                        requestBody.lineItems[i].custcolr7_oneprice_selling_motion = 1;
                    }
                }

                // check for LineAttributes and set the values on the lineItem
                checkIfAmendExtend(requestBody.lineItems[i], currentItem);

                //If the amendExtend sku is a package, break into it's components.
                amendExtendCreditsPackageComponents(requestBody.lineItems, currentItem, i, inboundEventId);

                // check for LineAttributes and set the values on the lineItem
                amendExtendCreditsSetAcl(requestBody.lineItems[i], currentItem);

                var packageObj = getPackageItemTemplate(currentItem);
                if (packageObj) {
                    processPackage(requestBody.lineItems, salesOrder, packageObj, inboundEventId, i);
                } else {
                    addItemToSalesOrder(salesOrder, requestBody.lineItems[i], requestBody.Header.subsidiary, isNXPIVMMigrationData, null, packageObj);
                }
            }
        }

        // check for LineAttribute.amendExtend, set custcol_r7_early_renewal to it's value.
        function checkIfAmendExtend(lineItem, currentItem) {
            //exit if LineAttributes is undefined or null
            if(!hasLineAttributes(lineItem)) return;
            var LineAttributes = JSON.parse(lineItem.LineAttributes);

            //exit if amendExtend is undefined
            if(!hasAmendExtend(LineAttributes)) return;

            //if null or false, set to "false", if true, set to "true"
            lineItem['custcol_r7_early_renewal'] = LineAttributes.amendExtend === true ? "true" : "false";
        }

        // check for LineAttribute.amendExtend, set custcol_r7_early_renewal to it's value.
        function amendExtendCreditsSetAcl(lineItem, currentItem) {
            //exit if LineAttributes is undefined or null
            if(!hasLineAttributes(lineItem)) return;
            var LineAttributes = JSON.parse(lineItem.LineAttributes);

            //exit if amendExtend is undefined
            if(!hasAmendExtendCredits(LineAttributes)) return;

            LineAttributes.amendExtendCredits.forEach(function(extCredit){
                const isAcl = getAcl(extCredit.sku);
                extCredit['isAcl'] = isAcl;
                extCredit['credited'] = false;
            });
            lineItem.LineAttributes = JSON.stringify(LineAttributes);
        }

        // check for LineAttribute.amendExtend, set custcol_r7_early_renewal to it's value.
        function amendExtendCreditsPackageComponents(lineItems, currentItem, index, inboundEventId) {
            const lineItem = lineItems[index];
            //exit if LineAttributes is undefined or null
            if(!hasLineAttributes(lineItem)) return;
            var LineAttributes = JSON.parse(lineItem.LineAttributes);

            //exit if amendExtend is undefined
            if(!hasAmendExtendCredits(LineAttributes)) return;
            var amendExtendProrateComponents = [];
            LineAttributes.amendExtendCredits.forEach(function(extCredit, index, object){
                const itemId = getItemId(extCredit.sku);
                if(!isPackage(itemId)) return;
                checkScriptUsage();
                var packageObj = getPackageItemTemplate(extCredit.sku)
                // create package license and assing to packageObj
                packageObj.packageLicense = createOrFindPackageLicense(packageObj, inboundEventId, lineItem);
                checkScriptUsage();
                const packageLicenseDetails = {
                    custcolr7itemmsproductkey:extCredit.productKey,
                    custcolr7producttoken: extCredit.productToken
                }
                packageObj.componentLicenses = getAllComponentLicenses(lineItems, packageLicenseDetails, true);
                packageObj.componentFamilyLicenses = {};
                for(var i = 0; i < Object.keys(packageObj.componentLicenses).length; i++){
                    var pkgItemId = Object.keys(packageObj.componentLicenses)[i];
                    var pkgItemFamilies = getItemFamily(pkgItemId.split('item')[1])
                    pkgItemFamilies.forEach(function(pkgItemFamily){
                        packageObj.componentFamilyLicenses[pkgItemFamily] = packageObj.componentLicenses[pkgItemId];
                    });
                }
                var packageComponents = getPackageComponents(packageObj);
                
                object.splice(index, 1);
                packageComponents.forEach(function (packageComponent) {
                    const componentItemFamily = getItemFamily(packageComponent.itemId)[0];
                    const amendExtendProrateComponent = {
                      sku: packageComponent.itemName,
                      credit: extCredit.credit * packageComponent.upsellProratePercent / 100,
                      productKey: packageObj.componentFamilyLicenses[componentItemFamily].productKey,
                      productToken: packageObj.componentFamilyLicenses[componentItemFamily].productToken
                    };
                    amendExtendProrateComponents.push(amendExtendProrateComponent);
                  });             
            });
            amendExtendProrateComponents.forEach(function(prorateComponent){
                LineAttributes.amendExtendCredits.push(prorateComponent);
            });
            lineItem.LineAttributes = JSON.stringify(LineAttributes);
        }

        function hasLineAttributes(lineItem){
            return (Object.keys(lineItem).indexOf('LineAttributes') != -1 && lineItem.LineAttributes);
        }

        function hasAmendExtend(LineAttributes){
            return (Object.keys(LineAttributes).indexOf('amendExtend') != -1); 
        }

        function hasAmendExtendCredits(LineAttributes){
            return (Object.keys(LineAttributes).indexOf('amendExtendCredits') != -1 && LineAttributes.amendExtendCredits.length > 0 && LineAttributes.amendExtend); 
        }

        function isPackage(itemId){
            return !itemId;
        }

        function checkNXPIVMMigration(lineItems) {
            var NXPUpgradeUpsell = false;
            var IVMNewUpgrade = false;
            var IVMStartDate = null;
            var calcProrateAmounts = {
                IVMTotal: 0,
                IVMESSTotal: 0
            };

            for (var i = 0; i < lineItems.length; i++) {
                var lineItem = lineItems[i];
                if(lineItem.item && !isNaN(lineItem.item) && Number(lineItem.item) > 0) {
                    try {
                        var itemLookupFlds = search.lookupFields({
                            type: search.Type.ITEM,
                            id: lineItem.item,
                            columns: 'itemid'
                        });
                    } catch(e) {
                        log.error('Item is not a item', e);
                        continue;
                    }

                    var oneItemFlow = Number(lineItem.custcolr7_one_item_flow); //use list ID for values 1 = New, 2 = Upsell, 3 = Renewal
                    var incumbentProductPurchaseType =  lineItem.custcolr7_incumbent_purchase_type;
                    var onePriceSellingMotion = Number(lineItem.custcolr7_oneprice_selling_motion); //use list ids 1 = Upgrade, 2 = downgrade, 3 = crosssell, 4 = Upsell

                    log.audit('checkNXPIVMMigration', JSON.stringify({
                        itemID: itemLookupFlds.itemid,
                        oneItemFlow: oneItemFlow,
                        incumbentProductPurchaseType: incumbentProductPurchaseType,
                        onePriceSellingMotion: onePriceSellingMotion
                    }));
                    
                    if(itemLookupFlds.itemid === 'NXP-SUB' && oneItemFlow == 2 && incumbentProductPurchaseType == 'Upgrade') {
                        NXPUpgradeUpsell = true;
                    } else if (itemLookupFlds.itemid === 'IVM-SUB' && oneItemFlow == 1 && onePriceSellingMotion == 1) {
                        IVMNewUpgrade = true;
                        IVMStartDate = lineItem.custcolr7startdate;
                        calcProrateAmounts.IVMTotal = (lineItem.amount - lineItem.partnerMarginDiscount - lineItem.creditAmount - lineItem.promotionAmount - lineItem.additionalDiscount) * -1;
                    } else if(itemLookupFlds.itemid === 'IVMESS-SUB') {
                        calcProrateAmounts.IVMESSTotal = (lineItem.amount - lineItem.partnerMarginDiscount - lineItem.creditAmount - lineItem.promotionAmount - lineItem.additionalDiscount) * -1;
                    }

                    log.audit('checkNXPIVMMigration NXPUpgradeUpsell, IVMNewUpgrade', NXPUpgradeUpsell + ', ' + IVMNewUpgrade);
                    log.audit('checkNXPIVMMigration calcProrateAmounts', JSON.stringify(calcProrateAmounts));
                }
            }

            return { 
                isNXPIVMMigration: NXPUpgradeUpsell && IVMNewUpgrade,
                IVMStartDate: IVMStartDate,
                calcProrateAmounts: calcProrateAmounts
            }
        }

        function calculateNXPGracePeriod(IVMStartDate) {
            var startDateObject = new Date(IVMStartDate)
            
            const scriptRef = runtime.getCurrentScript();
            var gracePeriodDays = scriptRef.getParameter("custscript_nxp_grace_period") || 90;
            
            startDateObject.setDate(startDateObject.getDate() + gracePeriodDays);
            return startDateObject;
        }

        function addItemToSalesOrder(salesOrder, lineItem, subsidiary, isNXPIVMMigrationData, packageUpgradeAtRenewal, packageObj) {
            log.debug({
                title: 'lineItem',
                details: JSON.stringify(lineItem)
            });
            var lineItemSKU = lineItem.item;
            var isIncumbent = lineItem.custcolr7_incumbent_purchase_type;

            var isNXPIVMMigration = isNXPIVMMigrationData ? isNXPIVMMigrationData.isNXPIVMMigration : false;
            var IVMStartDate = isNXPIVMMigrationData ? isNXPIVMMigrationData.IVMStartDate : null;
            var calcProrateAmounts = isNXPIVMMigrationData ? isNXPIVMMigrationData.calcProrateAmounts: 0;
            var isPackageUpgradeAtRenewal = packageUpgradeAtRenewal ? packageUpgradeAtRenewal : false;

            if(isIncumbent){
                //get PRORATE SKU
                var incumbentSKU = lineItem.item;
                var itemLookupFlds = search.lookupFields({
                    type: search.Type.ITEM,
                    id: incumbentSKU,
                    columns: 'itemid'
                });

                if(itemLookupFlds.itemid !== 'NXP-SUB') {
                    var lineItemProrateSKU = getProrateName(itemLookupFlds.itemid);
                    
                    var itemSearchObj = search.create({
                        type: "item",
                        filters:
                            [
                                ["name","is",lineItemProrateSKU]
                            ],
                        columns:
                            [
                                search.createColumn({name: "internalid", label: "Internal ID"})
                            ]
                    });
                    var searchResultCount = itemSearchObj.runPaged().count;
                    log.debug("itemSearchObj result count",searchResultCount);
                    var lineItemSKU = "";
                    itemSearchObj.run().each(function(result){
                        lineItemSKU = result.getValue("internalid");
                        lineItem.quantity = 1;
                        return true;
                    });
                }
            } 
            
            salesOrder.selectNewLine({
                sublistId: 'item'
            });
            /**
             * check if item is item group, log line number, after item group is
             * submitted, *apply price for item with ARM Upgrade Pricing Line
             * checkbox
             */
            var lineNumStart = salesOrder.getCurrentSublistIndex({
                sublistId: 'item'
            });
            var itemIsGroup = false;
            var currentItem = lineItem.item;
            if (
                currentItem !== 'DISC' ||
                currentItem !== 'Subtotal' ||
                currentItem !== 'Partner Discount'
            ) {
                itemIsGroup = memoizedItemIsGroupCheck(
                    lineItem.item
                );
            }
            salesOrder.setCurrentSublistValue({
                sublistId: 'item',
                fieldId: 'item',
                value: lineItemSKU
            });
            if (!isNullOrEmpty(lineItem.price)) {
                salesOrder.setCurrentSublistValue({
                    sublistId: 'item',
                    fieldId: 'price',
                    value: lineItem.price
                });
            }

            for (var lineKey in lineItem) {
                if (!isNullOrEmpty(lineItem[lineKey]) && lineKey !== 'item' && lineKey !== 'price' && lineKey !== 'custcol_r7_early_renewal') {
                    salesOrder.setCurrentSublistValue({
                        sublistId: 'item',
                        fieldId: lineKey,
                        value: lineItem[lineKey]
                    });
                }
            }

            if(!isNullOrEmpty(lineItem.custcol_r7_early_renewal)) {
                var isTrueSet = (lineItem.custcol_r7_early_renewal === 'true');
                salesOrder.setCurrentSublistValue({
                    sublistId: 'item',
                    fieldId: 'custcol_r7_early_renewal',
                    value: isTrueSet
                });
                if(isTrueSet){
                    salesOrder.setCurrentSublistValue({
                        sublistId: 'item',
                        fieldId: 'custcol_r7_early_renewal_credit',
                        value: lineItem.amendExtendTotalCredit === undefined ? lineItem.creditAmount: lineItem.amendExtendTotalCredit
                    });
                }
            }

            if (isNullOrEmpty(lineItem['custcol_r7_pck_package_level'])) {
                //get the Avatax tax code on the item
                var itemLookup = search.lookupFields({
                    type: 'item',
                    id: lineItem.item,
                    columns: ['custitem_ava_taxcode']
                });
                salesOrder.setCurrentSublistValue({
                    sublistId: 'item',
                    fieldId: 'custcol_ava_taxcodemapping',
                    value: itemLookup.custitem_ava_taxcode
                });
                log.debug('addItemToSalesOrder', 'taxcode mapping set:  ' + itemLookup.custitem_ava_taxcode);

                //APPS-45644 if upgrade into not a package, and theres multiple productkeys, set only 1
                if(lineItem.custcolr7_oneprice_selling_motion == 1){
                    var productToken = lineItem.custcolr7producttoken ? lineItem.custcolr7producttoken.split(',') : null;
                    var productKey = lineItem.custcolr7itemmsproductkey ? lineItem.custcolr7itemmsproductkey.split(',') : null;
                    if(productKey && productKey.length > 1){
                        salesOrder.setCurrentSublistValue({
                            sublistId: 'item',
                            fieldId: 'custcolr7producttoken',
                            value: productToken[0]
                        });
                        salesOrder.setCurrentSublistValue({
                            sublistId: 'item',
                            fieldId: 'custcolr7itemmsproductkey',
                            value: productKey[0]
                        });
                    }
                }
            }

            var currentSkuText = salesOrder.getCurrentSublistText({
                sublistId: 'item',
                fieldId: 'item'
            });

            //1price additional discount (display inline)
            var additionalDiscount = lineItem.additionalDiscount;
            if (additionalDiscount) {
                salesOrder.setCurrentSublistValue({
                    sublistId: 'item',
                    fieldId: 'custcolr7inlinediscount',
                    value: (additionalDiscount * -1)
                });
            }

            // https://issues.corp.rapid7.com/browse/APPS-13355
            // 1price partner margin discount (display inline) added
            var partnerMarginDiscount = lineItem.partnerMarginDiscount;
            if (partnerMarginDiscount) {
                salesOrder.setCurrentSublistValue({
                    sublistId: 'item',
                    fieldId: 'custcolr7inlinepartnerdiscount',
                    value: (partnerMarginDiscount * -1)
                });
            }

            var creditAmount = lineItem.creditAmount;
            if(isIncumbent){
                if(isNXPIVMMigration && currentSkuText == "NXP-SUB") {
                    salesOrder.setCurrentSublistValue({
                        sublistId: 'item',
                        fieldId: 'amount',
                        value: 0
                    });
                    salesOrder.setCurrentSublistValue({
                        sublistId: 'item',
                        fieldId: 'rate',
                        value: 0
                    });
                    salesOrder.setCurrentSublistValue({
                        sublistId: 'item',
                        fieldId: 'quantity',
                        value: 0
                    });
                    salesOrder.setCurrentSublistValue({
                        sublistId: 'item',
                        fieldId: 'custcolr7startdate',
                        value: lineItem.custcolr7startdate
                    });
                    salesOrder.setCurrentSublistValue({
                        sublistId: 'item',
                        fieldId: 'custcolr7enddate',
                        value: calculateNXPGracePeriod(IVMStartDate)
                    });
                    
                } else if(creditAmount) {
                    salesOrder.setCurrentSublistValue({
                        sublistId: 'item',
                        fieldId: 'amount',
                        value: (creditAmount * -1)
                    });
                    salesOrder.setCurrentSublistValue({
                        sublistId: 'item',
                        fieldId: 'rate',
                        value: (creditAmount * -1)
                    });
                    salesOrder.setCurrentSublistValue({
                        sublistId: 'item',
                        fieldId: 'custcol_r7_pck_package_license',
                        value: null
                    });
                    salesOrder.setCurrentSublistValue({
                        sublistId: 'item',
                        fieldId: 'custcol_r7_pck_package_level',
                        value: null
                    });
                    salesOrder.setCurrentSublistValue({
                        sublistId: 'item',
                        fieldId: 'custcolr7onepriceterm',
                        value: null
                    });
                    salesOrder.setCurrentSublistValue({
                        sublistId: 'item',
                        fieldId: 'custcolr7onepriceterm_in_days',
                        value: null
                    });
                    salesOrder.setCurrentSublistValue({
                        sublistId: 'item',
                        fieldId: 'custcolr7itemmsproductkey',
                        value: null
                    });

                    if(isNXPIVMMigration && currentSkuText == "NXP-SUB-PRORATE") {
                        creditAmount = creditAmount * -1;
                        if(calcProrateAmounts.IVMESSTotal > creditAmount) {
                            creditAmount = calcProrateAmounts.IVMESSTotal;
                        }
                        salesOrder.setCurrentSublistValue({
                            sublistId: 'item',
                            fieldId: 'amount',
                            value: creditAmount
                        });
                        salesOrder.setCurrentSublistValue({
                            sublistId: 'item',
                            fieldId: 'rate',
                            value: creditAmount
                        });
                        // salesOrder.setCurrentSublistValue({
                        //     sublistId: 'item',
                        //     fieldId: 'custcolr7startdate',
                        //     value: lineItem.custcolr7startdate
                        // });
                        // salesOrder.setCurrentSublistValue({
                        //     sublistId: 'item',
                        //     fieldId: 'custcolr7enddate',
                        //     value: calculateNXPGracePeriod(IVMStartDate)
                        // });                      
                    }
                }
            }

            // https://issues.corp.rapid7.com/browse/APPS-21992
            // if item is ICN-PRO-SUB && is upsell, qty = 1
            // else if item is ICN-PRO-SUB && new sale or renewal, qty = 99,999
            if(currentSkuText == "ICN-PRO-SUB"){
                var oneItemFlow = lineItem.custcolr7_one_item_flow;
                log.debug("Item is ICN-PRO", "OneItemFlow is: "+oneItemFlow);
                if(oneItemFlow == "2"){
                    salesOrder.setCurrentSublistValue({
                        sublistId: 'item',
                        fieldId: 'quantity',
                        value: "1"
                    });
                    salesOrder.setCurrentSublistValue({
                        sublistId: 'item',
                        fieldId: 'rate',
                        value: lineItem.amount
                    });
                } else {
                    salesOrder.setCurrentSublistValue({
                        sublistId: 'item',
                        fieldId: 'quantity',
                        value: "99999"
                    });
                    var newRate = Number(lineItem.rate)/99999;
                    salesOrder.setCurrentSublistValue({
                        sublistId: 'item',
                        fieldId: 'rate',
                        value: newRate
                    });
                }
            }

            // https://issues.corp.rapid7.com/browse/APPS-24116
            // 1price IVM Displacement Promotional Amount
            var promotionAmount = lineItem.promotionAmount;
            if(promotionAmount) {
                salesOrder.setCurrentSublistValue({
                    sublistId: 'item',
                    fieldId: 'custcolr7_promo_amount',
                    value: (promotionAmount * -1)
                });
            }

            //APPS-34978
            //Grab financial force project id from array
            //Apply it to the matching PS SKU.
            //Always remove the fake item field ffProjectIds.
            if(lineItem.ffProjectIds){
                var projectIds = lineItem.ffProjectIds;
                projectIds.forEach(function (component) {
                    if(component.productName == currentSkuText){
                        salesOrder.setCurrentSublistValue({
                            sublistId: 'item',
                            fieldId: 'custcol_r7_ff_project_id',
                            value: component.projectId
                        });
                    }
                });
            }
            delete lineItem.ffProjectIds;

            //For Renewal Notification Required;
            //set to true if renewal or renewal upgrade or renewal downgrade. Renewal upsells are not marked
            //any differently to a standard renewal.
            //if (oneItemFlow = Renewal) OR (oneItemFlow = New AND Selling Motion anyOf (Upgrade, Downgrade) AND creditAmount = null)
            if((lineItem.custcolr7_one_item_flow == 3) || 
            (lineItem.custcolr7_one_item_flow == 1 && ["1","2"].indexOf(lineItem.custcolr7_oneprice_selling_motion) != -1 && isPackageUpgradeAtRenewal)){
                salesOrder.setValue({
                    fieldId: 'custbody_renewal_notification_req',
                    value: true
                });
                if(lineItem.custcolr7itemmsproductkey){
                    salesOrder.setCurrentSublistValue({
                        sublistId: 'item',
                        fieldId: 'custcol_renewal_notification_req',
                        value: true
                    });
                }
            }

            try {
                salesOrder.commitLine({
                    sublistId: 'item'
                });
            } catch(e) {
                // https://issues.corp.rapid7.com/browse/APPS-20524
                // Tax code is not being set when Netherlands is the ship to - forcing a value to allow saves
                // Inside a try-catch, so we only add tax code to lines that need it.
                if(e.message.indexOf('Tax Code') !== -1) {
                    var noTaxCode = !lineItem.taxCode;
                    var subIsInternational = subsidiary == 10;
                    if (noTaxCode && subIsInternational) {
                        salesOrder.setCurrentSublistValue({
                            sublistId: 'item',
                            fieldId: mapJSON.taxCode,
                            value: 2051
                        });
                    }
                    salesOrder.commitLine({
                        sublistId: 'item'
                    });
                }
            }

            var lineNumEnd = salesOrder.getCurrentSublistIndex({
                sublistId: 'item'
            });
            if (itemIsGroup) {
                addPricingForItemGroup(salesOrder, lineNumStart, lineNumEnd, lineItem);
            }

            //1price additional discount (add discount line)
            if (additionalDiscount) {
                salesOrder.selectNewLine({
                    sublistId: 'item'
                });
                salesOrder.setCurrentSublistValue({
                    sublistId: 'item',
                    fieldId: 'item',
                    value: 51
                });
                salesOrder.setCurrentSublistValue({
                    sublistId: 'item',
                    fieldId: 'price',
                    value: -1
                });
                salesOrder.setCurrentSublistValue({
                    sublistId: 'item',
                    fieldId: 'rate',
                    value: (additionalDiscount * -1)
                });
                salesOrder.setCurrentSublistValue({
                    sublistId: 'item',
                    fieldId: 'custcolr7_parentlinehash',
                    value: lineItem.custcolr7_linehash
                });
                salesOrder.setCurrentSublistValue({
                    sublistId: 'item',
                    fieldId: 'location',
                    value: lineItem.location
                });
                salesOrder.commitLine({
                    sublistId: 'item'
                });
            }

            //1price partner margin discount
            //var partnerMarginDiscount = lineItem.partnerMarginDiscount;
            if (partnerMarginDiscount) {
                salesOrder.selectNewLine({
                    sublistId: 'item'
                });
                salesOrder.setCurrentSublistValue({
                    sublistId: 'item',
                    fieldId: 'item',
                    value: -6
                });
                salesOrder.setCurrentSublistValue({
                    sublistId: 'item',
                    fieldId: 'price',
                    value: -1
                });
                salesOrder.setCurrentSublistValue({
                    sublistId: 'item',
                    fieldId: 'rate',
                    value: (partnerMarginDiscount * -1)
                });
                salesOrder.setCurrentSublistValue({
                    sublistId: 'item',
                    fieldId: 'custcolr7_parentlinehash',
                    value: lineItem.custcolr7_linehash
                });
                salesOrder.setCurrentSublistValue({
                    sublistId: 'item',
                    fieldId: 'location',
                    value: lineItem.location
                });
                salesOrder.commitLine({
                    sublistId: 'item'
                });
            }

            //1Price IVM Displacement
            //Create DISCPROMO line
            if (promotionAmount) {
                salesOrder.selectNewLine({
                    sublistId: 'item'
                });
                salesOrder.setCurrentSublistValue({
                    sublistId: 'item',
                    fieldId: 'item',
                    value: 48
                });
                salesOrder.setCurrentSublistValue({
                    sublistId: 'item',
                    fieldId: 'price',
                    value: -1
                });
                salesOrder.setCurrentSublistValue({
                    sublistId: 'item',
                    fieldId: 'rate',
                    value: (promotionAmount * -1)
                });
                salesOrder.setCurrentSublistValue({
                    sublistId: 'item',
                    fieldId: 'custcolr7_parentlinehash',
                    value: lineItem.custcolr7_linehash
                });
                salesOrder.setCurrentSublistValue({
                    sublistId: 'item',
                    fieldId: 'location',
                    value: lineItem.location
                });
                salesOrder.commitLine({
                    sublistId: 'item'
                });
            }

            //1price CREDIT
            creditAmount = lineItem.creditAmount;
          	var amendExtendCreds = null;
            if(hasLineAttributes(lineItem)){
              var lineAttr = JSON.parse(lineItem.LineAttributes);
              amendExtendCreds = hasAmendExtendCredits(lineAttr) ? lineAttr.amendExtendCredits : null;
            }
            if (creditAmount && 
                    (isIncumbent != "Upgrade" || (isNXPIVMMigration && currentSkuText === "NXP-SUB")) && !amendExtendCreds
                ) {
                createProrateLine(lineItem, salesOrder, packageObj, currentSkuText, calcProrateAmounts, creditAmount, isNXPIVMMigration);
            }
            else if (creditAmount && 
                (isIncumbent != "Upgrade" || (isNXPIVMMigration && currentSkuText === "NXP-SUB")) && amendExtendCreds
            ){
                amendExtendCreds.forEach(function(extCredit){
                    //if the line has multiple prod tokens then check for credit on each
                    var lineProdTokens = lineItem.custcolr7producttoken.split(",");
                    var i = 0;
                    do {
                        if(extCredit.productToken == lineItem.custcolr7producttoken && lineItem.amendExtendTotalCredit > 0 && extCredit.credit > 0){
                            currentSkuText = extCredit.sku;
                            creditAmount = extCredit.credit;
                            createProrateLine(lineItem, salesOrder, packageObj, currentSkuText, calcProrateAmounts, creditAmount, isNXPIVMMigration);
                        }
                        else if(extCredit.productToken == lineProdTokens[i] && isNullOrEmpty(lineItem.custcol_r7_pck_package_item) && extCredit.credit > 0){
                            currentSkuText = extCredit.sku;
                            creditAmount = extCredit.credit;
                            createProrateLine(lineItem, salesOrder, packageObj, currentSkuText, calcProrateAmounts, creditAmount, isNXPIVMMigration);
                            i = lineProdTokens.length;
                        }
                        i++;
                    } while(i < lineProdTokens.length);
                });
            }
        }

        function createProrateLine(lineItem, salesOrder, packageObj, currentSkuText, calcProrateAmounts, creditAmount, isNXPIVMMigration){
            var prorateItem = getProrateName(currentSkuText);

            var amendExtendCreds = null;
            if(hasLineAttributes(lineItem)){
                var lineAttr = JSON.parse(lineItem.LineAttributes);
                amendExtendCreds = hasAmendExtendCredits(lineAttr) ? lineAttr.amendExtendCredits : null;
            }
            if(lineItem.custcol_r7_early_renewal == 'true' && lineItem.custcolr7_oneprice_selling_motion == '1' && packageObj && !amendExtendCreds){
                var lineItemFamilies = getItemFamily(lineItem.item);
                Object.keys(packageObj.componentLicenses).forEach(function(componentItem){
                    var itemId = componentItem.split('item')[1];
                    var componentItemFamilies = getItemFamily(itemId);

                    componentItemFamilies.forEach(function(compItemFam){
                        if(lineItemFamilies.indexOf(compItemFam) != -1){
                            prorateItem = getItemName(itemId) + '-PRORATE';
                        }
                    });
                });
            }

            //handle early renewal NXP > IVM upgrade
            if(lineItem.custcol_r7_early_renewal == 'true' && lineItem.custcolr7_oneprice_selling_motion == '1' && currentSkuText == "IVM-SUB" && isNXPIVMMigration){
                prorateItem = "NXP-SUB-PRORATE";
            }
            salesOrder.selectNewLine({
                sublistId: 'item'
            });
            salesOrder.setCurrentSublistText({
                sublistId: 'item',
                fieldId: 'item',
                text: prorateItem
            });
            salesOrder.setCurrentSublistValue({
                sublistId: 'item',
                fieldId: 'rate',
                value: (creditAmount * -1)
            });
            salesOrder.setCurrentSublistValue({
                sublistId: 'item',
                fieldId: 'custcolr7_parentlinehash',
                value: lineItem.custcolr7_linehash
            });
            salesOrder.setCurrentSublistValue({
                sublistId: 'item',
                fieldId: 'location',
                value: lineItem.location
            });
            // assing package item to PRORATE if its a package item
            if (lineItem.custcol_r7_pck_package_item !== undefined) {
                //if an early renewal upgrade, dont bundle the prorate into the packages prorate
                if(lineItem.custcol_r7_early_renewal != 'true' && lineItem.custcolr7_oneprice_selling_motion != '1')
                    salesOrder.setCurrentSublistValue({
                        sublistId: 'item',
                        fieldId: 'custcol_r7_pck_package_item',
                        value: lineItem.custcol_r7_pck_package_item
                    });
            }
            // assing package item to PRORATE if its a package item
            if (lineItem.custcol_r7_deployment_type !== undefined) {
              salesOrder.setCurrentSublistValue({
                sublistId: 'item',
                fieldId: 'custcol_r7_deployment_type',
                value: lineItem.custcol_r7_deployment_type
              });
            }

            if(isNXPIVMMigration && currentSkuText == "NXP-SUB") {  
                if(calcProrateAmounts.IVMTotal > (creditAmount * -1)) {
                    salesOrder.setCurrentSublistValue({
                        sublistId: 'item',
                        fieldId: 'rate',
                        value: calcProrateAmounts.IVMTotal
                    });
                }                   
                
                salesOrder.setCurrentSublistValue({
                    sublistId: 'item',
                    fieldId: 'custcolr7startdate',
                    value: lineItem.custcolr7startdate
                });
                salesOrder.setCurrentSublistValue({
                    sublistId: 'item',
                    fieldId: 'custcolr7enddate',
                    value: lineItem.custcolr7enddate
                });     
            }

            if(lineItem.custcol_r7_early_renewal === 'true'){
                salesOrder.setCurrentSublistValue({
                    sublistId: 'item',
                    fieldId: 'custcolr7startdate',
                    value: lineItem.custcolr7startdate
                });
                if(lineItem.previousTermEndDate){
                    salesOrder.setCurrentSublistValue({
                        sublistId: 'item',
                        fieldId: 'custcolr7enddate',
                        value: parseDate(lineItem.previousTermEndDate)//calculateEarlyRenewalEndDate(lineItem.item, lineItem.custcolr7itemmsproductkey, lineItem.custcol_r7_pck_package_license)
                    });
                }
                var isTrueSet = (lineItem.custcol_r7_early_renewal === 'true');
                salesOrder.setCurrentSublistValue({
                    sublistId: 'item',
                    fieldId: 'custcol_r7_early_renewal',
                    value: isTrueSet
                });
            }

            salesOrder.commitLine({
                sublistId: 'item'
            });
        }

        function createBillingAndShippingObjects(requestBody, salesOrder) {
            var billingSubrec = salesOrder.getSubrecord({
                fieldId: 'billingaddress'
            });
            var shippingSubrec = salesOrder.getSubrecord({
                fieldId: 'shippingaddress'
            });
            salesOrder.setValue({
                fieldId: 'shipaddresslist',
                value: null
            });
            salesOrder.setValue({
                fieldId: 'billaddresslist',
                value: null
            });
            billingSubrec = salesOrder.getSubrecord({
                fieldId: 'billingaddress'
            });
            shippingSubrec = salesOrder.getSubrecord({
                fieldId: 'shippingaddress'
            });
            billingSubrec.setValue({
                fieldId: 'country',
                value: requestBody.billingAddressInformation.country
            });
            shippingSubrec.setValue({
                fieldId: 'country',
                value: requestBody.shippingAddressInformation.country
            });
            shippingSubrec.setValue({
                fieldId: 'addressee',
                value: requestBody.shippingAddressInformation.addressee
            });
            billingSubrec.setValue({
                fieldId: 'addressee',
                value: requestBody.billingAddressInformation.addressee
            });
            for (var billingKey in requestBody.billingAddressInformation) {
                if (billingKey !== 'country' && billingKey !== 'isresidential' && !isNullOrEmpty(requestBody.billingAddressInformation[billingKey])) {
                    billingSubrec.setValue({
                        fieldId: billingKey,
                        value: requestBody.billingAddressInformation[billingKey]
                    });
                }
            }
            for (var shippingKey in requestBody.shippingAddressInformation) {
                if (shippingKey !== 'country' && shippingKey !== 'isresidential' && !isNullOrEmpty(requestBody.shippingAddressInformation[shippingKey])) {
                    shippingSubrec.setValue({
                        fieldId: shippingKey,
                        value: requestBody.shippingAddressInformation[shippingKey]
                    });
                }
            }
            shippingSubrec.setValue({
                fieldId: 'isresidential',
                text: 1
            });
            shippingSubrec.setValue({
                fieldId: 'isresidential',
                text: 1
            });
        }

        function itemIsGroupCheck(itemId) {
            try {
                var itemRec = record.load({
                    type: record.Type.ITEM_GROUP,
                    id: itemId
                });
                return itemRec !== null;
            } catch (ex) {
                return false;
            }
        }

        function addPricingForItemGroup(salesOrder, lineNumStart, lineNumEnd, lineItems) {
            for (var lineLoop = lineNumStart + 1; lineLoop < lineNumEnd - 1; lineLoop++) {
                var result = false;
                var itemGroupItemid = salesOrder.getSublistValue({
                    sublistId: 'item',
                    fieldId: 'item',
                    line: lineLoop
                });
                var itemArmPricingLine = memoizedSearchLookup({
                    type: search.Type.ITEM,
                    id: itemGroupItemid,
                    columns: 'custitem_arm_upgrade_pricing_line',
                }).custitem_arm_upgrade_pricing_line;

                if (
                    itemArmPricingLine === true &&
                    !isNullOrEmpty(lineItems.quantity) &&
                    !isNullOrEmpty(lineItems.rate)
                ) {
                    salesOrder.selectLine({
                        sublistId: 'item',
                        line: lineLoop,
                    });
                    salesOrder.setCurrentSublistValue({
                        sublistId: 'item',
                        fieldId: 'price',
                        value: '-1', //Custom Price
                    });
                    salesOrder.setCurrentSublistValue({
                        sublistId: 'item',
                        fieldId: 'rate',
                        value: lineItems.rate,
                    });
                    salesOrder.setCurrentSublistValue({
                        sublistId: 'item',
                        fieldId: 'amount',
                        value: lineItems.rate * lineItems.quantity,
                    });
                    salesOrder.commitLine({
                        sublistId: 'item',
                    });
                }
            }
            salesOrder.selectNewLine({
                sublistId: 'item',
            });
        }

        function getProrateName(currentSkuText){
            var prorateItem = "";
            switch (currentSkuText) {
                case "IDRDATATB-SUB":
                    prorateItem = "IDR-SUB-PRORATE";
                    break;
                case "IDRDATA-SUB":
                    prorateItem = "IDR-SUB-PRORATE";
                    break;
                case "IVMESS-SUB":
                    prorateItem = "IVM-SUB-PRORATE";
                    break;
                case "IVMHCONS-SUB":
                    prorateItem = "IVMH-SUB-PRORATE";
                    break;
                case "NXPESS-SUB":
                    prorateItem = "NXP-SUB-PRORATE";
                    break;
                case "ICN-PRO-SUB":
                    prorateItem = "ICN-SUB-PRORATE";
                    break;
                default:
                    prorateItem = currentSkuText + '-PRORATE';
            }
            return prorateItem;
        }

        /**
         *
         * @param {Object} lineItem
         * @param {Object} salesOrder
         * @param {{id: String, name: String, level: String, version: String, itemId: String, collectionId: String, packageLicense: String}} packageObj
         * @param {String} inboundEventId
         */
        function processPackage(lineItems, salesOrder, packageObj, inboundEventId, index) {

            checkScriptUsage();
            // create package license and assing to packageObj
            var lineItem = lineItems[index];
            packageObj.packageLicense = createOrFindPackageLicense(packageObj, inboundEventId, lineItem)
            checkScriptUsage();
            if (lineItem.custcolr7_one_item_flow == '2' || lineItem.custcolr7_one_item_flow == '3' || 
            (lineItem.custcolr7_one_item_flow == '1' && lineItem.custcolr7_oneprice_selling_motion == '1' && lineItem.custcol_r7_early_renewal == 'true')) { 
            // onePrice item flow is upsell or renewal OR
            // one item flow is new, selling motion is upgrade and is early renewal
                checkScriptUsage();
                packageObj.componentLicenses = getAllComponentLicenses(lineItems, lineItem);
                packageObj.componentLicensesItemFamilies = getAllComponentLicensesItemFamilies(packageObj.componentLicenses);
                packageObj.packagedLicensesArray = getAllPackagedLicenses(packageObj.packageLicense);
            } else if (lineItem.custcolr7_one_item_flow == '1' && lineItem.custcolr7_oneprice_selling_motion == '1') {
                packageObj.componentLicenses = getAllComponentLicenses(lineItems, lineItem);
                packageObj.componentLicensesItemFamilies = getAllComponentLicensesItemFamilies(packageObj.componentLicenses);
                //need to set flag for upgrade at renewal for renewal notification logic
                var upgradeAtRenewal = checkUpgradeAtRenewal(lineItems);
            }
            log.debug('packageObj', JSON.stringify(packageObj))
            var packageComponents = getPackageComponents(packageObj)

            checkScriptUsage();
            packageComponents.forEach(function (component) {
                // compose itemObj from the component to add it to the sales order (take prorate into considiration)
                var newItemObj = itemFromComponent(component, lineItem, packageObj); // this includes logic for upsell/renewal productToken/productKey assignment

                addItemToSalesOrder(salesOrder, newItemObj, null, null, upgradeAtRenewal, packageObj);
            });
        }

        function getAllComponentLicensesItemFamilies(componentLicenses){
            const componentLicenseItemFamilies = {};
            Object.keys(componentLicenses).forEach(function(component){
                var itemFamilies = getItemFamily(component.split('item')[1]);
                itemFamilies.forEach(function(itemFamily){
                    componentLicenseItemFamilies['family'+ itemFamily] = {
                        productKey: componentLicenses[component].productKey,
                        productToken: componentLicenses[component].productToken
                    }
                });
            });
            return componentLicenseItemFamilies;
        }

        function getAllComponentLicenses(lineItems, packageLineItem) {
            const componentLicenseDetails = {};
            try {
                if(packageLineItem.referenceToIncumbents && packageLineItem.referenceToIncumbents != '') { //this '' check might be redundant
                    findSKUByProductKeys(packageLineItem.custcolr7itemmsproductkey, packageLineItem.custcolr7producttoken, componentLicenseDetails);
                }
                lineItems.forEach(function (lineItem) {
                    if(lineItem.custcolr7_one_item_flow == '2' && lineItem.custcolr7_incumbent_purchase_type == 'Upgrade' && !componentLicenseDetails['item' + lineItem.item]) {  //onePrice item flow = upsell & incumbent purchasetype = Upgrade
                        if(lineItem.packageId) {
                            //getPackageComponentsProductKeys(lineItem.packageId, componentLicenseDetails);
                        } else {
                            const productKey = lineItem.custcolr7itemmsproductkey;
                            const productToken = lineItem.custcolr7producttoken;
    
                            componentLicenseDetails['item' + lineItem.item] = {
                                productKey: productKey,
                                productToken: productToken
                            };
                        }
                    }
                     else if(lineItem.custcolr7_one_item_flow == '1' && lineItem.custcolr7_oneprice_selling_motion == '1' && !componentLicenseDetails['item' + lineItem.item]) {
                         findSKUByProductKeys(lineItem.custcolr7itemmsproductkey, lineItem.custcolr7producttoken, componentLicenseDetails);
                     } 
                });
                log.audit('componentLicenseDetails end', JSON.stringify(componentLicenseDetails));
            } catch(e) {
                log.debug('error in getAllComponentLicenses function: ', e);
            }
            return componentLicenseDetails;
        }

        function findSKUByProductKeys(incumbentProductKeysInput, incumbentProductTokensInput, componentSKUs) {
            var incumbentProductKeys = incumbentProductKeysInput.split(',');
            var pkFilterForumula;
            incumbentProductKeys.forEach(function (productkey, index) {
                if(index == 0) {
                    pkFilterForumula = "formulanumeric: CASE ";
                }

                pkFilterForumula += "WHEN {custcolr7itemmsproductkey} = '" + productkey + "' THEN 1 ";

                if(index == incumbentProductKeys.length-1) { //last iteration - close out case statement
                    pkFilterForumula += 'ELSE 0 END';
                }
            });

            if(pkFilterForumula) {
                var incumbentProductTokens = incumbentProductTokensInput.split(',');
                //flag to safeguard against out of bound error incase PK list is bigger than PT. Blocks use of PT sourcing if the lists don't match in length
                var incumbentListMatches = incumbentProductTokens.length == incumbentProductKeys.length;
                var packageLicenses = [];
                //run transaction search
                var salesorderSearchObj = search.create({
                    type: "salesorder",
                    filters:
                    [
                       [pkFilterForumula,"equalto","1"], 
                      "AND", 
      ["mainline","is","F"],  
                      "AND", 
      ["type","anyof","SalesOrd"], 
      "AND", 
      [["custcolr7onepricefulfillmentstatus","anyof","2"],"OR",["custcolr7_one_item_flow","anyof","@NONE@"],"AND",["item.custitemr7itemautocreatelicense","is","T"]]
                    ],
                    columns:
                    [
                       search.createColumn({
                          name: "item",
                          summary: "GROUP"
                       }),
                       search.createColumn({
                          name: "custcolr7itemmsproductkey",
                          summary: "GROUP"
                       }),
                       search.createColumn({
                        name: "internalid",
                        join: "CUSTCOL_R7_PCK_PACKAGE_LICENSE",
                        summary: "MAX"
                     })
                    ]
                 });
                 salesorderSearchObj.run().each(function(result){
                    var itemId = result.getValue({
                        name: "item",
                        summary: "GROUP"
                    });
                    var productKey = result.getValue({
                        name: "custcolr7itemmsproductkey",
                        summary: "GROUP"
                    });
                    var packagedLicense = result.getValue({
                        name: "internalid",
                        join: "CUSTCOL_R7_PCK_PACKAGE_LICENSE",
                        summary: "MAX"
                     });

                    var productKeyIndex = incumbentProductKeys.indexOf(productKey);
                    componentSKUs['item'+itemId] = {
                        productKey: productKey,
                        productToken: productKeyIndex > -1 && incumbentListMatches ? incumbentProductTokens[productKeyIndex]: null
                    };

                    if(packagedLicense) {
                        packageLicenses.push(Number(packagedLicense.replace('PL', '')));
                    }
                    return true;
                 });
                 log.audit('componentSKUs prePackage', JSON.stringify(componentSKUs));
                 log.audit('packageLicenses', JSON.stringify(packageLicenses));
                 //check if any were related to packages, if so pull in related components keys also
                 if(packageLicenses.length > 0) {
                    try{ 
                        getPackageLicenseProductKeys(packageLicenses, componentSKUs);
                    } catch(e) {
                        log.debug('error in getPackageLicenseProductKeys: ', e);
                    }
                 }
                 log.audit('componentSKUs postPackage', JSON.stringify(componentSKUs));
            }
        }

        function getPackageLicenseProductKeys(packageLicenses, componentSKUs) {
            var salesorderSearchObj = search.create({
                type: "salesorder",
                filters:
                [
                   ["custcol_r7_pck_package_license","anyof", packageLicenses], 
                   "AND", 
                   ["mainline","is","F"], 
                   "AND", 
                   ["type","anyof","SalesOrd"],
                   "AND", 
                    [["custcolr7onepricefulfillmentstatus","anyof","2"],"OR",["custcolr7_one_item_flow","anyof","@NONE@"],"AND",["item.custitemr7itemautocreatelicense","is","T"]]
                ],
                columns:
                [
                   search.createColumn({
                      name: "item",
                      summary: "GROUP"
                   }),
                   search.createColumn({
                      name: "custcolr7itemmsproductkey",
                      summary: "MAX"
                   }),
                   search.createColumn({
                      name: "custcolr7producttoken",
                      summary: "MAX"
                   }),
                   search.createColumn({
                    name: "custcolr7translicenseid",
                    summary: "GROUP"
                   })
                ]
             });
             salesorderSearchObj.run().each(function(result){
                var itemId = result.getValue({
                    name: "item",
                    summary: "GROUP"
                });
                var productKey = result.getValue({
                    name: "custcolr7itemmsproductkey",
                    summary: "MAX"
                });
                var productToken= result.getValue({
                    name: "custcolr7producttoken",
                    summary: "MAX"
                });
                if(!productToken){
                    var licenseIdText = result.getValue({
                        name: "custcolr7translicenseid",
                        summary: "GROUP"
                    });
                    var licenseType = licenseIdText.substring(0,3);
                    var licenseIntId = licenseIdText.substring(3);
                    var licenseRecIntId = "";
                    var ptFieldId = "";
                    switch (licenseType) {
                        case "NXL":
                            licenseRecIntId = "customrecordr7nexposelicensing";
                            ptFieldId = "custrecordr7nxproducttoken";
                            break;
                        case "INP":
                            licenseRecIntId = "customrecordr7insightplatform";
                            ptFieldId = "custrecordr7inpproducttoken";
                            break;
                        case "MSL":
                            licenseRecIntId = "customrecordr7metasploitlicensing";
                            ptFieldId = "custrecordr7msproducttoken";
                            break;
                    }

                    var licenseRecord = record.load({
                        type: licenseRecIntId,
                        id: licenseIntId
                    });

                    var licenseProductToken = licenseRecord.getValue({
                        fieldId: ptFieldId
                    });

                    if(productToken !== licenseProductToken) {
                        productToken = licenseProductToken;
                    }
                }
                componentSKUs['item'+itemId] = {
                    productKey: productKey,
                    productToken: productToken
                };
                return true;
             });
        }

        /**
         *
         * @param {{id: String, name: String, level: String, version: String, itemId: String, collectionId: String, packageLicense: String}} packageObj
         * @returns {Array.<{itemId: String, itemName: String, revenuePercent: Number, upsellProratePercent: Number, upgradeProratePercent: Number, discountPercent: Number, partnerDiscountPercent: Number, packageItemId: String, configuration: Array, lineProperties: {quantity: String, monthlyDataLimit: String, dataRetentionLength: String, dataCenterLocation: String}}>} components array sorted by Order property
         */
        function getPackageComponents(packageObj) {
            var packageComponents = [];
            var componentSearch = search.create({
                type: 'customrecord_r7_pck_component',
                filters: [['custrecord_r7_pcom_collection', 'anyof', packageObj.collectionId]],
                columns: [
                    'custrecord_r7_pcom_sku',
                    'custrecord_r7_pcom_revenue_percent',
                    'custrecord_r7_pcom_ups_prorate_percent',
                    'custrecord_r7_pcom_upg_prorate_percent',
                    'custrecord_r7_pcom_disc_percent',
                    'custrecord_r7_pcom_partner_disc_percent',
                    'custrecord_r7_pcom_promo_amt_percent',
                    'custrecord_r7_pcom_quantity',
                    'custrecord_r7_pcom_mdl',
                    'custrecord_r7_pcom_drl',
                    'custrecord_r7_pcom_dcl',
                    'custrecord_r7_pcom_configurations',
                    'custrecord_r7_pcom_taxcode',
                    'custrecord_r7_pcom_deploytype',
                    search.createColumn({
                        name: 'custrecord_r7_pcom_order',
                        sort: search.Sort.ASC,
                    }),
                ],
            });
            componentSearch.run().each(function (result) {
                var component = {
                    packageLicense: packageObj.packageLicense,
                    packageItemId: packageObj.itemId,
                    packageLevel: packageObj.level,
                    itemId: result.getValue({
                        name: 'custrecord_r7_pcom_sku',
                    }),
                    itemName: result.getText({
                        name: 'custrecord_r7_pcom_sku',
                    }),
                    order: Number(
                        result.getValue({
                            name: 'custrecord_r7_pcom_order',
                        })
                    ),
                    revenuePercent: Number(
                        result
                            .getValue({
                                name: 'custrecord_r7_pcom_revenue_percent',
                            })
                            .slice(0, -1)
                    ),
                    upsellProratePercent: Number(
                        result
                            .getValue({
                                name: 'custrecord_r7_pcom_ups_prorate_percent',
                            })
                            .slice(0, -1)
                    ),
                    upgradeProratePercent: Number(
                        result
                            .getValue({
                                name: 'custrecord_r7_pcom_upg_prorate_percent',
                            })
                            .slice(0, -1)
                    ),
                    discountPercent: Number(
                        result
                            .getValue({
                                name: 'custrecord_r7_pcom_disc_percent',
                            })
                            .slice(0, -1)
                    ),
                    partnerDiscountPercent: Number(
                        result
                            .getValue({
                                name: 'custrecord_r7_pcom_partner_disc_percent',
                            })
                            .slice(0, -1)
                    ),
                    promoAmountPercent: Number(
                        result
                            .getValue({
                                name: 'custrecord_r7_pcom_promo_amt_percent',
                            })
                            .slice(0, -1)
                    ),
                    configuration: result.getValue({
                        name: 'custrecord_r7_pcom_configurations',
                    }),
                    lineProperties: {
                        quantity: result.getValue({
                            name: 'custrecord_r7_pcom_quantity',
                        }),
                        monthlyDataLimit: result.getValue({
                            name: 'custrecord_r7_pcom_mdl',
                        }),
                        dataRetentionLength: result.getValue({
                            name: 'custrecord_r7_pcom_drl',
                        }),
                        dataCenterLocation: result.getValue({
                            name: 'custrecord_r7_pcom_dcl',
                        }),
                        taxCode: result.getValue({
                            name: 'custrecord_r7_pcom_taxcode'
                        }),
                        deploymentType: result.getValue({
                            name: 'custrecord_r7_pcom_deploytype'
                        })
                    }
                };
                packageComponents.push(component);
                // .run().each has a limit of 4,000 results
                return true;
            });

            return packageComponents;
        }

        /**
         *
         * @param {{itemId: String, itemName: String, revenuePercent: Number, upsellProratePercent: Number, upgradeProratePercent: Number, discountPercent: Number, partnerDiscountPercent: Number, packageItemId: String, configuration: Array, lineProperties: {quantity: String, monthlyDataLimit: String, dataRetentionLength: String, dataCenterLocation: String}}} component
         * @param {*} lineItem
         */
        function itemFromComponent(component, lineItem, packageObj) {
            var itemObj = {};

            var LINE_ITEM_PACKAGE_PROPERTY_MAP = {
                packageLicense: 'custcol_r7_pck_package_license',
                packageItemId: 'custcol_r7_pck_package_item',
                packageLevel: 'custcol_r7_pck_package_level',
                itemId: 'item'
            }

            // upsell/renewal recognition and lineItem values mapping from package license happen here
            // find existing licenses in case of upsell/renewal and set pToken/pKey
            if ((lineItem.custcolr7_one_item_flow == '2' || lineItem.custcolr7_one_item_flow == '3' || 
            (lineItem.custcolr7_oneprice_selling_motion == '1' && lineItem.custcol_r7_early_renewal == 'true')) &&
             packageObj.packagedLicensesArray && packageObj.packagedLicensesArray.length > 0) {
                // upsell | renewal is happening
                var packagedLicensesArray = packageObj.packagedLicensesArray
                log.debug("packagedLicensesArray", packagedLicensesArray);
                var componentItemFamilies = getItemFamily(component['itemId']);
                packagedLicensesArray.forEach(function(licenseObj) {
                    if (componentItemFamilies.indexOf(licenseObj.itemFamily) != -1) {
                        // we found the license related to this upsell/renewal component
                        // updating component and mapping to set new pK and pT values
                        component['productKey'] = licenseObj.productKey;
                        component['productToken'] = licenseObj.productToken;

                        LINE_ITEM_PACKAGE_PROPERTY_MAP['productKey'] = 'custcolr7itemmsproductkey';
                        LINE_ITEM_PACKAGE_PROPERTY_MAP['productToken'] = 'custcolr7producttoken';
                    }
                });
                if(!component['productKey'] && lineItem.custcolr7_oneprice_selling_motion == '1' && lineItem.custcol_r7_early_renewal == 'true'){
                    var componentLicenseDetail = packageObj.componentLicenses['item' + component.itemId];
                    var itemFamilies = getItemFamily(component.itemId);
                    if(componentLicenseDetail) {
                        component['productKey'] = componentLicenseDetail.productKey;
                        component['productToken'] = componentLicenseDetail.productToken;
                    }
                    else if(itemFamilies) {
                        var itemFamMatch = false;
                        itemFamilies.forEach(function(itemFamily){
                            var componentLicenseFamilyDetail = packageObj.componentLicensesItemFamilies['family' + itemFamily];
                            if(componentLicenseFamilyDetail){
                                itemFamMatch = true;
                                component['productKey'] = componentLicenseFamilyDetail.productKey;
                                component['productToken'] = componentLicenseFamilyDetail.productToken;
                            }
                        });
                        if(!itemFamMatch){
                            component['productKey'] = null;
                            component['productToken'] = null;
                        }
                    } else {
                        //setting to null to avoid them being set with package attributes i.e the raw multiple productkeys string
                        component['productKey'] = null;
                        component['productToken'] = null;
                    }
                    LINE_ITEM_PACKAGE_PROPERTY_MAP['productKey'] = 'custcolr7itemmsproductkey';
                    LINE_ITEM_PACKAGE_PROPERTY_MAP['productToken'] = 'custcolr7producttoken';
                }
            } else if (packageObj.componentLicenses && lineItem.custcolr7_one_item_flow == '1' && lineItem.custcolr7_oneprice_selling_motion == '1') {
                //populate components existing SKU from  packageObj.componentLicenses;
                var componentLicenseDetail = packageObj.componentLicenses['item' + component.itemId];
                var itemFamilies = getItemFamily(component.itemId);
                if(componentLicenseDetail) {
                    component['productKey'] = componentLicenseDetail.productKey;
                    component['productToken'] = componentLicenseDetail.productToken;
                }
                else if(itemFamilies) {
                    var itemFamMatch = false;
                    itemFamilies.forEach(function(itemFamily){
                        var componentLicenseFamilyDetail = packageObj.componentLicensesItemFamilies['family' + itemFamily];
                        if(componentLicenseFamilyDetail){
                            itemFamMatch = true;
                            component['productKey'] = componentLicenseFamilyDetail.productKey;
                            component['productToken'] = componentLicenseFamilyDetail.productToken;
                        }
                    });
                    if(!itemFamMatch){
                        component['productKey'] = null;
                        component['productToken'] = null;
                    }
                } else {
                    //setting to null to avoid them being set with package attributes i.e the raw multiple productkeys string
                    component['productKey'] = null;
                    component['productToken'] = null;
                }
                LINE_ITEM_PACKAGE_PROPERTY_MAP['productKey'] = 'custcolr7itemmsproductkey';
                LINE_ITEM_PACKAGE_PROPERTY_MAP['productToken'] = 'custcolr7producttoken';
            }

            var LINE_ITEM_CALCULATED_PROPERTY_MAP = {
                quantity: 'quantity',
                monthlyDataLimit: 'custcolr7_monthlydatalimit_gb',
                dataCenterLocation: 'custcolr7datacenterlocation',
                dataRetentionLength: 'custcolr7dataretentionlengthdays',
                taxCode: 'custcol_ava_taxcodemapping',
                deploymentType: 'custcol_r7_deployment_type'
            }

            var LINE_ITEM_PERCENT_PROPERTY_MAP = {
                upsellProratePercent: 'creditAmount',
                // upgradeProratePercent: 'creditAmount', // values for these two will have a switch depending on if its an upsell or an upgrade. (condition tbd with SFDC)
                discountPercent: 'additionalDiscount',
                partnerDiscountPercent: 'partnerMarginDiscount',
                promoAmountPercent: 'promotionAmount'
            };

            // for each LINE_ITEM_PACKAGE_PROPERTY_MAP set related property
            Object.getOwnPropertyNames(LINE_ITEM_PACKAGE_PROPERTY_MAP).forEach(function(prop) {
                itemObj[LINE_ITEM_PACKAGE_PROPERTY_MAP[prop]] = component[prop]
            })

            // for each LINE_ITEM_CALCULATED_PROPERTY_MAP calculate and set
            Object.getOwnPropertyNames(LINE_ITEM_CALCULATED_PROPERTY_MAP).forEach(function(prop) {
                var calculationObj = {
                    lineItemValue: lineItem[LINE_ITEM_CALCULATED_PROPERTY_MAP[prop]],
                    componentFormula: component.lineProperties[prop]
                }
                itemObj[LINE_ITEM_CALCULATED_PROPERTY_MAP[prop]] = calculateNewValueByFormula(calculationObj, lineItem)
            })

            // for each LINE_ITEM_PERCENT_PROPERTY_MAP calculate and set
            Object.getOwnPropertyNames(LINE_ITEM_PERCENT_PROPERTY_MAP).forEach(function(prop) {
                var calculationObj = {
                    lineItemValue: lineItem[LINE_ITEM_PERCENT_PROPERTY_MAP[prop]],
                    propertyValuePercent: component[prop]
                }
                if(prop == 'upsellProratePercent'){
                    //if is upgrade & early renewal, set full credit amount on incumbent SKU line only
                    if(lineItem.custcolr7_oneprice_selling_motion == '1' && lineItem.custcol_r7_early_renewal == 'true'){
                        log.debug("inside early renewal upgrade percent property map");
                        //find a SKU with product token, set credit on it.
                        if(itemObj.custcolr7producttoken) {
                            const lineAttributes = JSON.parse(lineItem.LineAttributes);
                            if(lineAttributes.amendExtendCredits){
                                itemObj['amendExtendTotalCredit'] = 0;
                                lineAttributes.amendExtendCredits.forEach(function(extCredit){
                                    if(extCredit.productToken == itemObj.custcolr7producttoken && extCredit.isAcl && getAclById(itemObj.item) && !extCredit.credited){
                                        itemObj[LINE_ITEM_PERCENT_PROPERTY_MAP[prop]] = extCredit.credit;
                                        itemObj['amendExtendTotalCredit'] += extCredit.credit;
                                        extCredit.credited = true;
                                    }
                                    else if (extCredit.productToken == itemObj.custcolr7producttoken && !extCredit.isAcl && !extCredit.credited){
                                        itemObj['amendExtendTotalCredit'] += extCredit.credit;
                                        extCredit.credited = true;
                                    }
                                });
                                lineItem.LineAttributes = JSON.stringify(lineAttributes);
                            }
                        } else {
                            itemObj[LINE_ITEM_PERCENT_PROPERTY_MAP[prop]] = 0; 
                        }
                    } //else calculate credit amount as normal.
                    else {
                        itemObj[LINE_ITEM_PERCENT_PROPERTY_MAP[prop]] = calculateNewValueFromPercent(calculationObj)
                    }
                } else {
                    itemObj[LINE_ITEM_PERCENT_PROPERTY_MAP[prop]] = calculateNewValueFromPercent(calculationObj)
                }
                
            })

            // individually calculate rate/amount for the item according to calculated quantity and revenuePercent
            applyRevenueInfo(itemObj, lineItem, component)

            // for each lineItem property SET if not exists yet and the calculation did not output NULL i.e. property is undefined
            Object.getOwnPropertyNames(lineItem).forEach(function(prop) {
                if (itemObj[prop] === undefined) {
                    itemObj[prop] = lineItem[prop]
                }
            })

            // for each configuration of the item update/override existing value
            // TODO TBD

            // return
            log.debug('itemObj', JSON.stringify(itemObj));
            return itemObj;
        }

        function getItemFamily(itemId) {
            var itemFamilyLookup = search.lookupFields({
                type: record.Type.SERVICE_ITEM,
                id: itemId,
                columns: ['custitemr7itemfamily'],
            });
            var itemFamilies = itemFamilyLookup.custitemr7itemfamily.map(function (selectValue) {
                return selectValue.value;
            });
            log.debug('itemFamilies', JSON.stringify(itemFamilies));
            return itemFamilies;
        }

        function getItemName(itemId) {
            var itemNameLookup = search.lookupFields({
                type: record.Type.SERVICE_ITEM,
                id: itemId,
                columns: ['name'],
            });
            log.debug('itemName', JSON.stringify(itemNameLookup.name));
            return itemNameLookup.name;
        }

        function getItemId(itemName){
            var itemId = null;
            var getItemId = search.create({
                type: "item",
                filters: [["name","is",itemName]],
                columns:["internalid"]
             });
             getItemId.run().each(function(result){
                itemId = result.id;
                return true;
             });
             return itemId;
        }

        function getAcl(itemName){
            var isAcl = false;
            var getAcl = search.create({
                type: "item",
                filters: [["name","is",itemName]],
                columns:["custitemr7itemautocreatelicense"]
             });
             getAcl.run().each(function(result){
                isAcl = result.getValue('custitemr7itemautocreatelicense');
                return true;
             });
             return isAcl;
        }

        function getAclById(itemId){
            var isAcl = false;
            var getAcl = search.create({
                type: "item",
                filters: [["internalId","is",itemId]],
                columns:["custitemr7itemautocreatelicense"]
             });
             getAcl.run().each(function(result){
                isAcl = result.getValue('custitemr7itemautocreatelicense');
                return true;
             });
             return isAcl;
        }

        function getAllPackagedLicenses(packageLicenseId) {
            // get existing packaged licenses info hardcoded to INP or NXL for now, todo: make it work with ACR types
            // (type, internalId, productKey, productToken, itemFamily(always single))
            var packagedLicensesArray = [];

            // NXL
            var nexposeLicenseSearch = search.create({
                type: 'customrecordr7nexposelicensing',
                filters: [['custrecordr7nxlicensepackagelicense', 'anyof', packageLicenseId]],
                columns: [
                    'internalid',
                    'custrecordr7nxproductkey',
                    'custrecordr7nxproducttoken',
                    'custrecordcustrecordr7nxlicenseitemfamil',
                ],
            });
            nexposeLicenseSearch.run().each(function (result) {
                packagedLicensesArray.push({
                    type: 'customrecordr7nexposelicensing',
                    internalId: result.getValue('internalid'),
                    productKey: result.getValue('custrecordr7nxproductkey'),
                    productToken: result.getValue('custrecordr7nxproducttoken'),
                    itemFamily: result.getValue('custrecordcustrecordr7nxlicenseitemfamil'),
                });
                return true;
            });

            // INP
            var insightLicenseSearch = search.create({
                type: 'customrecordr7insightplatform',
                filters: [['custrecordr7inplicensepackagelicense', 'anyof', packageLicenseId]],
                columns: [
                    'internalid',
                    'custrecordr7inplicenseprodcutkey',
                    'custrecordr7inpproducttoken',
                    'custrecordr7inplicenseitemfamily',
                ],
            });
            insightLicenseSearch.run().each(function (result) {
                packagedLicensesArray.push({
                    type: 'customrecordr7insightplatform',
                    internalId: result.getValue('internalid'),
                    productKey: result.getValue('custrecordr7inplicenseprodcutkey'),
                    productToken: result.getValue('custrecordr7inpproducttoken'),
                    itemFamily: result.getValue('custrecordr7inplicenseitemfamily'),
                });
                return true;
            });

            log.debug('packagedLicensesArray', JSON.stringify(packagedLicensesArray));

            return packagedLicensesArray;
        }

        /**
         *
         * @param {string} currentItem - item ID or item Name if it is a package
         * @return {({id: String, name: String, level: String, version: String, itemId: String, collectionId: String}|null)} packageObj or Null
         */
        function getPackageItemTemplate(currentItem) {

            log.debug('getPackageItemTemplate', currentItem);
            log.debug('parseInt(currentItem)', '' + parseInt(currentItem));
            // comparsion to NaN does not work => comparing strings
            if ('' + parseInt(currentItem) === 'NaN') {
                // this expected to be package with a '-level-' suffix if JSON mapping didnt assing the ID of the package and left the itemName in item prop field
                var packageObj = null;

                var itemNameParts = currentItem.split('-');
                log.debug('itemNameParts', itemNameParts)
                // get package level from Package name (TODO execute getAllPackageLevels only once for both occurances)
                var packageLevels = getAllPackageLevels();
                var packageLevel = null;

                for(var i = 0; i < packageLevels.length; i++){
                    var levelObj = packageLevels[i];
                    //added prefix because different items couldnt share the same 'code'
                    //e.g. idr-adv-sub and thrt-adv-sub, only idr-adv was getting selected
                    //because it only checked the middle levelcode
                    var levelPrefix = levelObj.name.split('-')[0];
                    if(levelObj.name.split('-').length > 2 && levelObj.levelCode == 'ISP'){
                        var levelSuffix = levelObj.name.split('-')[2];
                        
                        if (itemNameParts[0] == levelPrefix && 
                                itemNameParts[1] == levelObj.levelCode &&
                                itemNameParts[2] == levelSuffix){

                            packageLevel = levelObj.id;
                            itemNameParts[2] = 'PACKAGE';
                            break;
                        }
                    }
                    else if (itemNameParts[0] == levelPrefix && itemNameParts[1] == levelObj.levelCode) {
                        // convert example: IDR-ADV-SUB => IDR-PACKAGE-SUB
                        packageLevel = levelObj.id;
                        itemNameParts[1] = 'PACKAGE';
                        break;
                    }
                };

                var packageName = itemNameParts.join('-');

                var packageVersion = '1.0'; // default for now, calculation TB identified

                var packageSearch = search.create({
                    type: 'customrecord_r7_pck_item_template',
                    filters: [
                        ['name', 'is', packageName],
                    ],
                    columns: ['internalid', 'custrecord_r7_pit_item'],
                });
                packageSearch.run().each(function (result) {
                    packageObj = {
                        id: result.getValue({
                            name: 'internalid',
                        }),
                        name: packageName,
                        level: packageLevel,
                        version: packageVersion,
                        itemId: result.getValue({
                            name: 'custrecord_r7_pit_item',
                        }),
                        itemName: result.getText({
                            name: 'custrecord_r7_pit_item',
                        })
                    };
                    return false;
                });

                packageObj.collectionId = getPackageCollection(packageObj);

                log.debug('package', JSON.stringify(packageObj));
                return packageObj;
            } else {
                log.debug('package', 'not a package');
                return null;
            }
        }

        /**
         *
         * @param {{id: String, name: String, level: String, version: String, itemId: String}} packageObj
         * @returns {String} collectionId
         */
        function getPackageCollection(packageObj) {
            var collectionId = null;
            var collectionSearch = search.create({
                type: 'customrecord_r7_pck_collection',
                filters: [
                    ['custrecord_r7_pcol_item_template', 'anyof', packageObj.id],
                    'AND',
                    ['custrecord_r7_pcol_level', 'anyof', packageObj.level],
                    'AND',
                    ['formulatext: {custrecord_r7_pcol_version}', 'is', packageObj.version],
                ],
                columns: ['internalid'],
            });
            collectionSearch.run().each(function (result) {
                collectionId = result.getValue({
                    name: 'internalid'
                })
                // expecting single result
                return false;
            });
            return collectionId;
        }

        function createOrFindPackageLicense(packageObj, inboundEventId, lineItem) {
            var packageLicenseId = null;
            checkScriptUsage()
            if (!isNullOrEmpty(lineItem.packageId)) { // package license exists => find it
                log.debug('looking for existing package license')
                // find
                packageLicenseId = getPackageLicenseByIdentifier(lineItem.packageId)

                if (isNullOrEmpty(packageLicenseId)) {
                    throwError('PACKAGE_ERROR', 'PACKAGE ID not found: ' + lineItem.packageId);
                }

                // update
                updatePackageLicenseInboundEvents(packageLicenseId, inboundEventId)

            } else { // does not exist => create one
                log.debug('creating new package license')

                var packageLicenseRec = record.create({
                    type: 'customrecord_r7_pck_license'
                });

                var packageIdentifier = generatePackageIdentifier();

                packageLicenseRec.setValue({
                    fieldId: 'custrecord_r7_pl_package_id',
                    value: packageIdentifier,
                });
                packageLicenseRec.setValue({
                    fieldId: 'custrecord_r7_pl_package_template',
                    value: packageObj.id
                });
                packageLicenseRec.setValue({
                    fieldId: 'custrecord_r7_pl_item',
                    value: packageObj.itemId
                });
                // TODO add value to multiselect instead of setting a select value upon update of the field when renewal/upgrade/upsell
                packageLicenseRec.setValue({
                    fieldId: 'custrecord_r7_pl_inbound_events',
                    value: inboundEventId
                });
                packageLicenseRec.setValue({
                    fieldId: 'custrecord_r7_pl_current_collection',
                    value: packageObj.collectionId
                });
                packageLicenseRec.setValue({
                    fieldId: 'custrecord_r7_pl_current_level',
                    value: packageObj.level
                });

                packageLicenseId = packageLicenseRec.save();
            }
            return packageLicenseId
        }

        function updatePackageLicenseInboundEvents(packageLicenseId, inboundEventId) {
            var inboundEventsLookup = search.lookupFields({
                type: 'customrecord_r7_pck_license',
                id: packageLicenseId,
                columns: ['custrecord_r7_pl_inbound_events']
            })
            var currentInboundEventsStr = inboundEventsLookup.custrecord_r7_pl_inbound_events.map(function(selectValue) {
                return selectValue.value;
            }).join(',');
            record.submitFields({
                type: 'customrecord_r7_pck_license',
                id: packageLicenseId,
                values: {
                    'custrecord_r7_pl_inbound_events': currentInboundEventsStr + ',' + inboundEventId
                }
            });
        }

        function calculateNewValueByFormula(calculationObj, lineItem) {
            var newValue = null;
            if (calculationObj.componentFormula === 'null') {
                newValue = null;
            } else if (calculationObj.componentFormula === '=') {
                newValue = calculationObj.lineItemValue;
            } else if (calculationObj.componentFormula.slice(-1) === '%') {
                newValue = (Number(calculationObj.lineItemValue) / 100) * Number(calculationObj.componentFormula.slice(0, -1));
            } else if (calculationObj.componentFormula.indexOf('formula') !== -1) {
                newValue = resolveFormula(calculationObj.componentFormula, lineItem);
            } else {
                newValue = calculationObj.componentFormula; // specific value
            }
            // formula parcing and calculation TBD
            return newValue;
        }

        function calculateNewValueFromPercent(calculationObj) {
            var newValue = null;
            if (calculationObj.lineItemValue === null) {
                newValue = null;
            } else {
                newValue = (Number(calculationObj.lineItemValue) / 100) * Number(calculationObj.propertyValuePercent);
            }
            return newValue;
        }

        function applyRevenueInfo(itemObj, lineItem, component) {
            // var totalPackageAmount = lineItem.quantity * lineItem.rate;
            var totalPackageAmount = lineItem.amount;
            var componentAmount = totalPackageAmount / 100 * Number(component.revenuePercent);
            var componentRate = componentAmount / itemObj.quantity;
            itemObj.rate = componentRate;
            itemObj.amount = componentAmount;
        }

        function generatePackageIdentifier() {
            var newPackageIdentifier = '';
            while (newPackageIdentifier == '' || getPackageLicenseByIdentifier(newPackageIdentifier) !== null) {
                var chars = 'BCDEFGHJKLMNPQRSTVWXYZ0123456789';
                var randomKey = 'SUPK-';
                for (var i = 0; i < 16; i++) {
                    var rnum = Math.floor(Math.random() * chars.length);
                    randomKey += chars.substring(rnum, rnum + 1);
                    if (i == 3 || i == 7 || i == 11) {
                        randomKey += '-';
                    }
                }
                newPackageIdentifier = randomKey;
            }
            return newPackageIdentifier;
        }

        function getPackageLicenseByIdentifier(packageIdentifier) {
            if (packageIdentifier != null && packageIdentifier != '') {
                var packageInternalId = null;
                packageIdentifier = packageIdentifier.split(',')[0];
                var filters = [search.createFilter({ name: 'custrecord_r7_pl_package_id', operator: search.Operator.IS, values: packageIdentifier })];
                var columns = [search.createColumn({ name: 'internalid' })]
                var packageLicenseSearch = search.create({
                    type: 'customrecord_r7_pck_license',
                    filters: filters,
                    columns: columns,
                })
                packageLicenseSearch.run().each(function (result) {
                    packageInternalId = result.getValue({
                        name: 'internalid'
                    })
                    // expecting single result
                    return false;
                });
                return packageInternalId;
            } else {
                return null
            }
        }

        function getAllPackageLevels() {
            var packageLevels = [];
            var packageLevelSearch = search.create({
                type: 'customrecord_r7_pck_level',
                filters: [],
                columns: ['internalid', 'name', 'custrecord_r7_pl_code'],
            });
            packageLevelSearch.run().each(function (result) {
                var packageLevel = {
                    id: result.getValue({ name: 'internalid' }),
                    name: result.getValue({ name: 'name' }),
                    levelSuffix: '-' + result.getValue({ name: 'custrecord_r7_pl_code' }) + '-',
                    levelCode: result.getValue({ name: 'custrecord_r7_pl_code' }),
                };
                packageLevels.push(packageLevel);
                return true;
            });
            return packageLevels;
        }

        function getLookupValue(fieldName, getText) {
            if (this[fieldName]) {
                return util.isArray(this[fieldName]) ? this[fieldName][0][getText ? 'text' : 'value'] : this[fieldName];
            }
        }

        // use this as a reference documentation: https://eloquentjavascript.net/12_language.html
        function resolveFormula(formula, lineItem) {

            log.debug('resolving formula: ', formula)

            var topScope = Object.create(null);
            topScope.true = true;
            topScope.false = false;
            topScope.null = null;
            topScope.result = null;
            ['+', '-', '*', '/', '==', '<', '>'].forEach(function(op) {
                topScope[op] = Function('a, b', 'return a ' + op + ' b;');
            })
            // add lineItem to scope
            Object.getOwnPropertyNames(lineItem).forEach(function(prop) {
                topScope[prop] = lineItem[prop]
            })

            function parseExpression(program) {
                program = skipSpace(program);
                var match;
                var expr;
                if ((match = /^"([^"]*)"/.exec(program))) {
                    expr = { type: 'value', value: match[1] };
                } else if ((match = /^\d+\b/.exec(program))) {
                    expr = { type: 'value', value: Number(match[0]) };
                } else if ((match = /^[^\s(),#"]+/.exec(program))) {
                    expr = { type: 'word', name: match[0] };
                } else {
                    throw new SyntaxError('Unexpected syntax: ' + program);
                }

                return parseApply(expr, program.slice(match[0].length));
            }

            function skipSpace(string) {
                string = string.replace(/.+?(?=formula\()/g, '');
                var first = string.search(/\S/);
                if (first == -1) return '';
                return string.slice(first);
            }

            function parseApply(expr, program) {
                program = skipSpace(program);
                if (program[0] != '(') {
                    return { expr: expr, rest: program };
                }

                program = skipSpace(program.slice(1));
                expr = { type: 'apply', operator: expr, args: [] };
                while (program[0] != ')') {
                    var arg = parseExpression(program);
                    expr.args.push(arg.expr);
                    program = skipSpace(arg.rest);
                    if (program[0] == ',') {
                        program = skipSpace(program.slice(1));
                    } else if (program[0] != ')') {
                        throw new SyntaxError("Expected ',' or ')'");
                    }
                }
                return parseApply(expr, program.slice(1));
            }

            function parse(program) {
                var parsedObj = parseExpression(program);
                var expr = parsedObj.expr;
                var rest = parsedObj.rest;
                if (skipSpace(rest).length > 0) {
                    throw new SyntaxError('Unexpected text after program');
                }
                return expr;
            }

            var specialForms = Object.create(null);

            specialForms.if = function(args, scope) {
                if (args.length != 3) {
                    throw new SyntaxError('Wrong number of args to if');
                } else if (evaluate(args[0], scope) !== false) {
                    return evaluate(args[1], scope);
                } else {
                    return evaluate(args[2], scope);
                }
            };

            specialForms.while = function(args, scope) {
                if (args.length != 2) {
                    throw new SyntaxError('Wrong number of args to while');
                }
                while (evaluate(args[0], scope) !== false) {
                    evaluate(args[1], scope);
                }
                return false;
            };

            specialForms.formula = function(args, scope) {
                var value = false;
                args.forEach(function(arg) {
                    value = evaluate(arg, scope);
                })
                return value;
            };

            specialForms.define = function(args, scope) {
                if (args.length != 2 || args[0].type != 'word') {
                    throw new SyntaxError('Incorrect use of define');
                }
                var value = evaluate(args[1], scope);
                scope[args[0].name] = value;
                return value;
            };

            function evaluate(expr, scope) {
                if (expr.type == 'value') {
                    return expr.value;
                } else if (expr.type == 'word') {
                    if (expr.name in scope) {
                        return scope[expr.name];
                    } else {
                        throw new ReferenceError('Undefined binding: ' + expr.name);
                    }
                } else if (expr.type == 'apply') {
                    var operator = expr.operator
                    var args = expr.args
                    if (operator.type == 'word' && operator.name in specialForms) {
                        return specialForms[operator.name](expr.args, scope);
                    } else {
                        var op = evaluate(operator, scope);
                        if (typeof op == 'function') {
                            return op.apply(this, args.map(function(arg) {return evaluate(arg, scope)}));
                        } else {
                            throw new TypeError('Applying a non-function.');
                        }
                    }
                }
            }

            function run(program) {
                return evaluate(parse(program), Object.create(topScope));
            }

            var result = run(formula);

            log.debug('formula result: ', result)
            return result;
        }

        function memoizeFunctionWithObjectArguments(fn) {
            var cache = {};
            return function () {
                var args = Array.prototype.slice.call(arguments);
                var key = JSON.stringify(args);
                if (cache[key] === undefined) {
                    /*  */
                    cache[key] = fn.apply(this, args);
                }
                return cache[key];
            };
        }

        function createPartnerObjects(requestBody, salesOrder) {
            var partner = requestBody.partner;
            var distributor = requestBody.distributor;
            log.debug("partner requestBody", requestBody);
            log.debug("partner sublists", salesOrder.getSublists());
            log.debug("partner", partner);
            log.debug("distributor", distributor);
            try{
                if(partner && partner.netsuiteId) {
                    var partnerRole = getPartnerTypeInternalId(partner.partnerRole);
                    salesOrder.selectNewLine({
                        sublistId: 'recmachcustrecord_transaction_link'
                    });
                    salesOrder.setCurrentSublistValue({
                        sublistId: 'recmachcustrecord_transaction_link',
                        fieldId: 'custrecord_partner',
                        value: partner.netsuiteId,
                        forceSyncSourcing: true
                    });
                    try{
                        salesOrder.setCurrentSublistValue({
                            sublistId: 'recmachcustrecord_transaction_link',
                            fieldId: 'custrecord_partner_type',
                            value: partnerRole
                        });
                    } catch(e) {
                        log.audit("Partner does not have Partner Type set.", "Please update partner record with partner type.");
                    }
                    salesOrder.setCurrentSublistValue({
                        sublistId: 'recmachcustrecord_transaction_link',
                        fieldId: 'custrecord_is_primary',
                        value: true
                    });
                    salesOrder.commitLine({
                        sublistId: 'recmachcustrecord_transaction_link'
                    });
                    //also set header level partner field for billing info
                    salesOrder.setValue({
                        fieldId: 'partner',
                        value: partner.netsuiteId
                    });
                }

                if(distributor && distributor.netsuiteId) {
                    var distributorRole = getPartnerTypeInternalId(distributor.partnerRole);
                    salesOrder.selectNewLine({
                        sublistId: 'recmachcustrecord_transaction_link'
                    });
                    salesOrder.setCurrentSublistValue({
                        sublistId: 'recmachcustrecord_transaction_link',
                        fieldId: 'custrecord_partner',
                        value: distributor.netsuiteId,
                        forceSyncSourcing: true
                    });
                    try{
                        salesOrder.setCurrentSublistValue({
                            sublistId: 'recmachcustrecord_transaction_link',
                            fieldId: 'custrecord_partner_type',
                            value: distributorRole
                        });
                    } catch(e) {
                        log.audit("Distributor does not have Partner Type set.", "Please update partner record with partner type.");
                    }
                    salesOrder.setCurrentSublistValue({
                        sublistId: 'recmachcustrecord_transaction_link',
                        fieldId: 'custrecord_is_primary',
                        value: false
                    });
                    salesOrder.commitLine({
                        sublistId: 'recmachcustrecord_transaction_link'
                    });
                }
            }
            catch(e){
                log.error(e.name, e.message);
            }
        }

        function getPartnerTypeInternalId(partnerType) {
            log.debug("Get Partner Type ID for", partnerType);
            if (partnerType) {
                var partnerTypeId = '';
                var partnerTypeSearch = search.create({
                    type: "customrecord_r7_partner_type",
                    filters: [
                        ["name", "is", partnerType]
                    ],
                    columns: [
                        search.createColumn({
                            name: "internalid",
                            label: "Internal ID"
                        }),
                        search.createColumn({
                            name: "name",
                            label: "Name"
                        })
                    ]
                });
                var searchResultCount = partnerTypeSearch.runPaged().count;
                log.debug("partnerTypeSearch result count", searchResultCount);
                partnerTypeSearch.run().each(function (result) {
                    // .run().each has a limit of 4,000 results
                    partnerTypeId = result.id;
                    return true;
                });
                return partnerTypeId;
            } else {
                return "";
            }   
        }

        function calculateEarlyRenewalEndDate(itemId, activationKey, packageLicenseId) {
            var newExpDate = null;
            var acrId = search.lookupFields({
                type: 'item',
                id: itemId,
                columns: 'custitemr7itemacrproducttype'
            });
            log.debug("This Item "+itemId+" ACR Type", acrId.custitemr7itemacrproducttype);
            var licenseType = search.lookupFields({
                type: 'item',
                id: itemId,
                columns: 'custitemr7skulicensetype'
            });
            
            switch(acrId.custitemr7itemacrproducttype[0].value){
                //insight platform
                case '9':
                    log.debug("Setting INP values");
                    var activationKeyField = 'custrecordr7inplicenseprodcutkey';
                    var recordId = 'customrecordr7insightplatform';
                    var expirationField = 'custrecordr7inplicenseexpirationdate';
                    var licenseIdField = 'name';
                    break;
                //nexpose
                case '1':
                    log.debug("Setting NXP values");
                    var activationKeyField = 'custrecordr7nxproductkey';
                    var recordId = 'customrecordr7nexposelicensing';
                    var expirationField = 'custrecordr7nxlicenseexpirationdate';
                    var licenseIdField = 'name';
                    break;
                //metasploit
                case '2':
                    log.debug("Setting MSP values");
                    var activationKeyField = 'custrecordr7msproductkey';
                    var recordId = 'customrecordr7metasploitlicensing';
                    var expirationField = 'custrecordr7mslicenseexpirationdate';
                    var licenseIdField = 'name';
                    break;
            }
            log.debug("PK", activationKey);
            log.debug("Pkg ID", packageLicenseId);
            var filters = [];
            if(activationKey) {
                filters = [["custrecordr7licfmproductkey","is",activationKey]];
            } else if (packageLicenseId) {
                filters = [[["custrecordr7licfmuserinsightplatlicrec.custrecordr7inplicensepackagelicense","anyof",packageLicenseId || ""],"OR",["custrecordr7licfmnexposelicense.custrecordr7nxlicensepackagelicense","anyof",packageLicenseId || ""]]];
            }
            filters = filters.concat(["AND",
                    ["custrecordr7licfmgrace","is","F"],
                    "AND",
                    ["custrecordr7licfmfeaturefieldtype","is","date"],
                    "AND",
                    ["custrecordr7licfmrecordtypeid","is",recordId],
                    "AND",
                    ["custrecordr7licfmfeildid","is",expirationField]]);
            search.create({
                type: "customrecordr7licensefeaturemanagement",
                filters: filters,
                columns:
                [
                   search.createColumn({
                      name: "custrecordr7licfmenddate",
                      summary: "MAX"
                   }),
                   search.createColumn({
                      name: "custrecordr7licfmproductkey",
                      summary: "GROUP"
                   })
                ]
             }).run().each(function(result){
                var expDate = result.getValue({name:"custrecordr7licfmenddate", summary: "MAX"});
                if(expDate) {
                    newExpDate = format.parse({
                        value: expDate,
                        type: format.Type.DATE
                    });
                }
            });
            log.debug("Retuning existing end date for early renewal prorate", newExpDate);
            return newExpDate;
        }

        function checkUpgradeAtRenewal(lineItems){
            var isUpgradeAtRenewal = false;
            var countUpsellLines = 0;
            lineItems.forEach(function(lineItem){
                //check to see if any lines are upsells
                var thisTranType = lineItem.custcolr7_one_item_flow;
                if(thisTranType == 2){
                    log.debug("Checking Upgrade at Renewal", "Found Upsell Line with One Item Flow = "+thisTranType);
                    countUpsellLines++;
                }
            });
            if(countUpsellLines > 0){
                log.debug("Found "+countUpsellLines+" upsell lines in transaction.", "Returning false for upgradeAtRenewal");
                isUpgradeAtRenewal = false;
            } else {
                log.debug("Found no upsell lines.", "Returning true for upgradeAtRenewal");
                isUpgradeAtRenewal = true;
            }
            return isUpgradeAtRenewal;
        }

        return {
            processJSON: processJSON,
            isNullOrEmpty: isNullOrEmpty,
            listSetText: listSetText,
            isInArray: isInArray,
            sendErrorEmail: sendErrorEmail,
            createSOHeader: createSOHeader,
            createSOLines: createSOLines,
            createBillingAndShippingObjects: createBillingAndShippingObjects,
            createPartnerObjects: createPartnerObjects
        };
    });