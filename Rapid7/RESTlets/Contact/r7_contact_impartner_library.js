/**
 * @NApiVersion 2.0
 * @NScriptType plugintypeimpl
 */
define(['/SuiteScripts/RESTlets/Common Library/r7_common_restlet_library.js', 'N/error', 'N/record', 'N/search'],
        function(common_library, error, record, search) {
            var recordType = 'contact';
            var SUCCESSFUL_UPDATE_RESPONSE_TEXT = 'Record was successfully updated';

            function processGetRequest(request) {
                return null;
            }

            function processDeleteRequest(request) {
                return null;
            }

            function processPutRequest(request) {
                validateImpartnerRequest(request.contact);
                var newContactId = createOrUpdateRecord(request.contact, true);
                return buildResponse(newContactId, SUCCESSFUL_UPDATE_RESPONSE_TEXT);
            }

            function processPostRequest(request) {
                validateImpartnerRequest(request.contact);
                var contactId = createOrUpdateRecord(request.contact, false);
                return buildResponse(contactId);
            }
            
            /*
             * This section is for the Impartner
             * <-------------------------------
             */
            function createOrUpdateRecord(request, updateFlag) {
                var recordObj = null;
                var recordId;
                if (updateFlag) {
                    recordId = request.internalid;
                    recordObj = record.load({type: recordType, id: recordId, isDynamic: true});
                }
                else {
                    recordObj = record.create({type: recordType, isDynamic: true});
                }
                for (var key in request) {
                    switch (key) {
                        case "addresses":
                            {
                                if (request[key] && Array.isArray(request[key])) {
                                    try {
                                        if (updateFlag) {
                                            var addressesLines = recordObj.getLineCount({sublistId: 'addressbook'});
                                            // remove all lines moving from the last one to first
                                            while(addressesLines>0){
                                                // Since number of lines in lists is zero based we need to decrease it first 
                                                addressesLines--;
                                                // always remove "last line" from the list
                                                recordObj.removeLine({sublistId: 'addressbook', line: addressesLines});
                                            }
                                        }
                                        for (var str = 0; str < request[key].length; str++) {
                                            setAddress(request[key][str], recordObj);
                                        }
                                    } catch (e) {
                                        log.audit({
                                            title: 'Address error',
                                            details: 'Error:' + e
                                        });
                                    }
                                }
                                break;
                            }
                        case "custentityr7partnercontactpersona":
                            {
                                setFieldValue(key, getValueIdByCode(key, request[key]), recordObj);
                                break;
                            }
                        case "custentityr7contactlanguage":
                            {
                               // US_ENGLISH (1) is the default language.
                                    setFieldValue(key, 1, recordObj);
                                break;
                            }
                        case "custentityr7contactpartnercontactrole":
                            {
                                 if (!common_library.isNullOrEmpty(request[key])) {
                                        setFieldValue(key, getValueIdByCode(key, request[key]), recordObj);
                                break;
                                 }
                            }
                        default:
                            {
                                recordObj.setValue({fieldId: key, value: request[key]});
                            }
                    }
                }
                setSubsidiary(recordObj, request);
                recordId = recordObj.save();
                log.debug({
                    title: 'New ' + recordType + ' record ID',
                    details: 'ID = ' + recordId
                });
                return recordId;
            }

            function setSubsidiary(recordObj, request) {
                if (request.addresses) {
                    for (var key in request.addresses) {
                        if (key === 'country' && request.addresses[key] !== 'US') {
                            recordObj.setValue({fieldId: 'subsidiary', value: 10});
                        }
                        else if (key === 'country' && request.addresses[key] === 'US') {
                            recordObj.setValue({fieldId: 'subsidiary', value: 1});
                        }
                    }
                }
                else
                {
                    // 1 is default value. It is Rapid7 LLC
                    recordObj.setValue({fieldId: 'subsidiary', value: 1});
                }
            }

            function buildResponse(recordId, succesMessage) {
                var result = new Object();
                if (succesMessage != 'undefined' && succesMessage != null && succesMessage != '') {
                    result.message = succesMessage;
                }
                else
                {
                    result.contact = new Object();
                    result.contact.contactId = recordId;
                }
                return result;
            }

            function setFieldValue(fieldId, fieldValue, recordObj) {
                try {
                    if (fieldValue.length === 1) {
                        fieldValue = fieldValue[0];
                        recordObj.setValue({fieldId: fieldId, value: fieldValue[0]});
                    }
                    recordObj.setValue({fieldId: fieldId, value: fieldValue});
                } catch (e) {
                    log.error({
                        title: 'setFieldValue. Failed to set field value.',
                        details: 'Field = ' + fieldId + '; Field value =  ' + fieldValue + ' Error:' + e
                    });
                }
            }

            function setAddress(address, recordObj) {
                recordObj.selectNewLine({sublistId: 'addressbook'});
                var addressSubrecord = recordObj.getCurrentSublistSubrecord({sublistId: 'addressbook', fieldId: 'addressbookaddress'});
                addressSubrecord.setValue({fieldId: 'country', value: address.country});
                addressSubrecord.setValue({fieldId: 'addr1', value: address.addr1});
                addressSubrecord.setValue({fieldId: 'addr2', value: address.addr2});
                addressSubrecord.setValue({fieldId: 'city', value: address.city});
                addressSubrecord.setValue({fieldId: 'zip', value: address.zip});
                addressSubrecord.setValue({fieldId: 'state', value: address.state});
                recordObj.commitLine({sublistId: 'addressbook'});
            }
            
            function validateImpartnerRequest(request) {
                if (common_library.isEmpty(request.custentityr7impartnermemberid)) {
                    log.debug({
                        title: 'Validations',
                        details: 'Impartner Member ID  (' + request.custentityr7impartnermemberid + ') is not valid'
                    });
                    throw error.create({
                        name: 'INVALID_IMPARTNER_MEMBER_ID',
                        message: 'Impartner Member ID is required'
                    });
                }
                if (common_library.isEmpty(request.custentityr7isprimarymember)) {
                    log.debug({
                        title: 'Validations',
                        details: 'Is Primary Member (' + request.custentityr7isprimarymember + ') is required'
                    });
                    throw error.create({
                        name: 'INVALID_IS_PRIMARY_MEMBER',
                        message: 'Is Primary Member is required'
                    });
                }
                if (common_library.isEmpty(request.custentityr7prefix)) {
                    log.debug({
                        title: 'Validations',
                        details: 'Prefix (' + request.custentityr7prefix + ') is required'
                    });
                    throw error.create({
                        name: 'INVALID_PREFIX',
                        message: 'Prefix is required'
                    });
                }
                 if (common_library.isEmpty(request.custentityr7partnercontactpersona)) {
                    log.debug({
                        title: 'Validations',
                        details: 'Contact Persona (' + request.custentityr7partnercontactpersona + ') is required'
                    });
                    throw error.create({
                        name: 'INVALID_CONTACT_PERSONA',
                        message: 'Contact Persona is required'
                    });
                }
                if (common_library.isEmpty(request.email)) {
                    log.debug({
                        title: 'Validations',
                        details: 'Email (' + request.email + ') is required'
                    });
                    throw error.create({
                        name: 'INVALID_EMAIL',
                        message: 'Email is required'
                    });
                }
                if (common_library.isEmpty(request.firstname)) {
                    log.debug({
                        title: 'Validations',
                        details: 'First name (' + request.firstname + ') is required'
                    });
                    throw error.create({
                        name: 'INVALID_FIRSTNAME',
                        message: 'First name is required'
                    });
                }
                if (common_library.isEmpty(request.lastname)) {
                    log.debug({
                        title: 'Validations',
                        details: 'Last name (' + request.lastname + ') is required'
                    });
                    throw error.create({
                        name: 'INVALID_LASTNAME',
                        message: 'Last name is required'
                    });
                }
                if (common_library.isEmpty(request.phone)) {
                    log.debug({
                        title: 'Validations',
                        details: 'Phone (' + request.phone + ') is required'
                    });
                    throw error.create({
                        name: 'INVALID_PHONE',
                        message: 'Phone is required'
                    });
                }
                if (common_library.isEmpty(request.title)) {
                    log.debug({
                        title: 'Validations',
                        details: 'Job title (' + request.title + ') is required'
                    });
                    throw error.create({
                        name: 'INVALID_TITLE',
                        message: 'Job title is required'
                    });
                }
                if (common_library.isEmpty(request.addresses)) {
                    log.debug({
                        title: 'Validations',
                        details: 'Addresses (' + request.addresses + ') is required'
                    });
                    throw error.create({
                        name: 'INVALID_ADDRESSES',
                        message: 'Addresses are required'
                    });
                }
                var addressesArray = request.addresses;
                if (addressesArray && Array.isArray(addressesArray)) {
                    for (var str = 0; str < addressesArray.length; str++) {
                        if (common_library.isEmpty(addressesArray[str].country)) {
                            log.debug({
                                title: 'Validations',
                                details: 'Country (' + addressesArray[str].country + ') is required'
                            });
                            throw error.create({
                                name: 'INVALID_COUNTRY',
                                message: 'Country is required'
                            });
                        }
                        if (common_library.isEmpty(addressesArray[str].city)) {
                            log.debug({
                                title: 'Validations',
                                details: 'City (' + addressesArray[str].city + ') is not valid'
                            });
                            throw error.create({
                                name: 'INVALID_CITY',
                                message: 'City is required'
                            });
                        }
                        if (common_library.isEmpty(addressesArray[str].state)) {
                            log.debug({
                                title: 'Validations',
                                details: 'State (' + addressesArray[str].state + ') is not valid'
                            });
                            throw error.create({
                                name: 'INVALID_STATE',
                                message: 'State is required'
                            });
                        }
                        if (common_library.isEmpty(addressesArray[str].zip)) {
                            log.debug({
                                title: 'Validations',
                                details: 'Postal Code (' + addressesArray[str].zip + ') is not valid'
                            });
                            throw error.create({
                                name: 'INVALID_POSTAL_CODE',
                                message: 'Postal Code is required'
                            });
                        }
                        if (common_library.isEmpty(addressesArray[str].addr1)) {
                            log.debug({
                                title: 'Validations',
                                details: 'Address Line 1 (' + addressesArray[str].addr1 + ') is not valid'
                            });
                            throw error.create({
                                name: 'INVALID_ADDRESS_LINE_1',
                                message: 'Address Line 1 is required'
                            });
                        }
                    }
                }
            }

            function getValueIdByCode(paramName, code) {
                var results = new Array();
                var codes = (code.toUpperCase()).split(';');
                for (var key in codes) {
                    var filter = search.createFilter({name: 'custrecordr7restletlookupcode', operator: search.Operator.IS, values: codes[key]});
                    var columns = [];
                    columns.push(search.createColumn({name: 'custrecordr7restletlookupvalueid'}));
                    var searchResult = search.create({type: 'customrecordr7restletlookup', filters: filter, columns: columns}).run().getRange({start: 0, end: 100});
                    if (searchResult.length > 0) {
                        for (var i = 0; i < searchResult.length; i++) {
                            results.push(parseInt(searchResult[i].getValue({name: 'custrecordr7restletlookupvalueid'})));
                        }
                    }
                }
                if (!common_library.isNullOrEmpty(results) && results.length < 1) {
                    throw error.create({
                        name: 'INVALID_VALUE',
                        message: paramName + ' contains invalid value. There is no any id for ' + code + ' in Netsuite'
                    });
                }
                return results;
            }
            /*
             * End of the impartner section
             * ------------------------------->
             */
            
            return{
                get: processGetRequest,
                put: processPutRequest,
                post: processPostRequest,
                delete: processDeleteRequest
            };
        });