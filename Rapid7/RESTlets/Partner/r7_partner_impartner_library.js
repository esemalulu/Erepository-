/**
 * @NApiVersion 2.0
 * @NScriptType plugintypeimpl
 */
define(['/SuiteScripts/RESTlets/Common Library/r7_common_restlet_library.js','N/error', 'N/record', 'N/search', 'N/format'],
        function(common_library, error, record, search, format) {
            var recordType = 'partner';
            var SUCCESSFUL_UPDATE_RESPONSE_TEXT = 'Record was successfully updated';

            function processGetRequest(request) {
                return null;
            }

            function processPutRequest(request) {
                validateImpartnerRequest(request.partner);
                var partnerId = createOrUpdateRecord(request.partner, true);
                return buildResponse(partnerId, SUCCESSFUL_UPDATE_RESPONSE_TEXT);
            }

            function processPostRequest(request) {
                validateImpartnerRequest(request.partner);
                var partnerId = createOrUpdateRecord(request.partner, false);
                return buildResponse(partnerId);
            }

            function processDeleteRequest(request) {
                return null;
            }
            
            function getValueIdByCode(paramName, code) {
                var results = new Array();
                var codes = (code.toUpperCase()).split(';');
                for (var key in codes) {
                    var filter = search.createFilter({name: 'custrecordr7restletlookupcode', operator: search.Operator.IS, values: codes[key]});
                    var searchResult = search.create({
                        type: 'customrecordr7restletlookup', 
                        filters: filter, 
                        columns: ['custrecordr7restletlookupvalueid']}).run().getRange({start: 0, end: 100});
                    if (searchResult.length > 0) {
                        for (var i = 0; i < searchResult.length; i++) {
                            results.push(parseInt(searchResult[i].getValue({name: 'custrecordr7restletlookupvalueid'})));
                        }
                    }
                }
               
                if (results.length < 1) {
                    throw error.create({
                        name: 'INVALID_VALUE',
                        message: paramName + ' contains invalid value.'+  code + ' could not be found'
                    });
                }
                return results;
            }


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
                                                // check if the address was
                                                // changed? if yes then delete
                                                // and create new setAddress();
                                            var addressesLines = recordObj.getLineCount({sublistId: 'addressbook'});
                                           /* for (var i = 0; addressesLines && addressesLines > 0 && i < addressesLines; i++) {
                                                recordObj.removeLine({sublistId: 'addressbook', line: i});
                                            }*/
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
                                        
                                        
                                        
                                        // Set Subsidiary
                                        var addressSubrecord = recordObj.getCurrentSublistSubrecord({
                                            sublistId: 'addressbook',
                                            fieldId: 'addressbookaddress',
                                        });
                                        
                                        var country = addressSubrecord.getValue({fieldId: 'country'});
                                        log.debug({
                                            title: 'country',
                                            details: country
                                        });     
                                        // Set subsidiary value
                                        var subsidiary = setSubsidiary(request);
                                        recordObj.setValue({
                                                        fieldId: 'subsidiary', 
                                                        value: subsidiary});  
                                        // Get Subsidiary
                                        log.debug({
                                            title: 'subsidiary',
                                            details: recordObj.getValue({fieldId: 'subsidiary'})
                                        });
                                    } catch (e) {
                                        log.audit({
                                            title: 'Address error',
                                            details: 'Error:' + e
                                        });
                                    }
                                }
                                break;
                            }
                        case "custentityr7subregion":
                            {
                                setFieldValue(key, getValueIdByCode(key, request[key]), recordObj);
                                break;
                            }
                        case "custentityr7partnerlevel":
                            {
                                setFieldValue(key, getValueIdByCode(key, request[key]), recordObj);
                                break;
                            }

                        case "custentityr7partnerregion":
                            {
                                setFieldValue(key, getValueIdByCode(key, request[key]), recordObj);
                                break;
                            }
                        case "custentityr7partnerstatus":
                            {
                                setFieldValue(key, getValueIdByCode(key, request[key]), recordObj);
                                break;
                            }
                        case "custentityr7partnerterritory":
                            {
                                setFieldValue(key, getValueIdByCode(key, request[key]), recordObj);
                                break;
                            }
                        case "custentityr7partnerpaymentterms":
                            {
                                 if (!common_library.isNullOrEmpty(request[key])) {
                                         setFieldValue(key, getValueIdByCode(key, request[key]), recordObj);
                                 }
                                break;
                            }
                        case "custentityr7partnerareasofinterest":
                            {
                                setFieldValue(key, getValueIdByCode(key, request[key]), recordObj);
                                break;
                            }
                        case "custentityr7partnernumberofemployees":
                            {
                                setFieldValue(key, getValueIdByCode(key, request[key]), recordObj);
                                break;
                            }
                        case "custentityr7partnertargetcustomersize":
                            {
                                        
                                setFieldValue(key, getValueIdByCode(key, request[key]), recordObj);
                                break;
                            }
                        case "custentityr7impartnerannualrevenuecat":
                            {
                                if (!common_library.isNullOrEmpty(request[key])) {
                                    setFieldValue(key, getValueIdByCode(key, request[key]), recordObj);
                                }

                                break;
                            }
                        case "custentityr7othervendorssold":
                            {
                                if (!common_library.isNullOrEmpty(request[key])) {
                                    setFieldValue(key, getValueIdByCode(key, request[key]), recordObj);
                                }
                                break;
                            }
                            /*
                             * case "custentityr7contactlanguage": { if
                             * (common_library.isNullOrEmpty(request.custentityr7contactlanguage)) {
                             * setFieldValue(key, 'US_ENGLISH', recordObj); }
                             * else { setFieldValue(key, getValueIdByCode(key,
                             * request[key]), recordObj); } break; }
                             */
                        case "custentityr7partnertargetmarkets":
                            {
                                setFieldValue(key, getValueIdByCode(key, request[key]), recordObj);
                                break;
                            }
                        case "custentityr7partnerdatesigned":
                            {
                                var date_signed = formatDate(request[key]);
                                recordObj.setValue({
                                        fieldId: key, 
                                        value: date_signed});
                                break;
                            }
                            
                        case "custentityr7partneraccountmanager":
                                { 
                                var employee_id = getEmployeeId(request[key]);
                                recordObj.setValue({
                                        fieldId: key, 
                                        value: employee_id});
                                break;
                                      
                                }
                        default:
                            {
                                recordObj.setValue({fieldId: key, value: request[key]});
                            }
                    }
                }
               
               
                recordId = recordObj.save();
                log.debug({
                    title: 'New ' + recordType + ' record ID',
                    details: 'ID = ' + recordId
                });
                return recordId;
            }
            
            /**
             * @param: Date in ISO format yyyy-mm-dd’T’hh:mi:ssZ’ e.g. 2017-03-21T11:38:51-04:00
             * @return: Date in mm/dd/yyyy format
             * 
             */ 
            function formatDate(dateSigned){
                var dateTime = dateSigned.split('T'); // split date from time
                var dateComponent = dateTime[0].split('-'); // break date into year, month day
                var year = dateComponent[0];
                var month = dateComponent[1];
                var date = dateComponent[2];

                var date_signed =  month +'/'+date+'/'+year;
                return format.parse({
                    value: date_signed,
                    type: format.Type.DATE
                    });         
            }
            
            /**
             * @param: country
             * @return: subsidiary (Default value is Rapid7 LLC)
             * 
             */ 
            function setSubsidiary(request) {
                var subsidiary = 1;// Rapid7 LLC
                if (request.addresses) {
                          for (var key in request.addresses) {
                                  for(var i in request.addresses[key]){
                                       if (i == 'country' && request.addresses[key][i] != 'US') {
                                           subsidiary = 10;
                                         }  
                                  }
                                  
                          }
                }
                  log.debug({
                      title: 'setsubsidiary function',
                      details: subsidiary
                  });               
                return subsidiary;
            }
                

            function buildResponse(recordId, succesMessage) {
                var result = new Object();
                if (succesMessage != 'undefined' && succesMessage != null) {
                    result.message = succesMessage;
                }
                else
                {
                    result.partner = new Object();
                    result.partner.partnerId = recordId;
                }
                return result;
            }

            function setFieldValue(fieldId, fieldValue, recordObj) {
                try {
                    if (fieldValue.length == 1) {
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
            /*
             * input: get EMPLOYEE ID (entityid) output: return employee
             * internal id
             */ 
            function getEmployeeId(name){
            
                var employee_lookup = search.create({
                    type: search.Type.EMPLOYEE,
                    filters: ['entityid','is', name],
                    columns: ['internalid']
                }).run();
                
                var employee_resultset = employee_lookup.getRange({
                    start: 0,
                    end: 1
                });
                
                if(employee_resultset.length > 0){
                        for (var i = 0; i < employee_resultset.length; i++) {
                          var employeeId = employee_resultset[i].getValue({
                           name: 'internalid'
                          });
                        }
                }else{
                        throw error.create({
                        name: 'INVALID_VALUE',
                        message: 'Employee name'+ name +'could not be found'
                    });
                }
                
                 log.debug({
                     title: 'EmployeeId',
                     details: employeeId
                 });
                return employeeId;      
            }

            function validateImpartnerRequest(request) {
                if (common_library.isEmpty(request.custentityr7subregion)) {
                    log.debug({
                        title: 'Validations',
                        details: 'Partner Account Sub Region (' + request.custentityr7subregion + ') is not valid'
                    });
                    throw error.create({
                        name: 'INVALID_PARTNER_ACCOUNT_SUB_REGION',
                        message: 'Partner Account Sub Region is required'
                    });
                }
             
                if (common_library.isEmpty(request.custentityr7impartnermemberid)) {
                    log.debug({
                        title: 'Validations',
                        details: 'Impartner Account ID (' + request.custentityr7impartnermemberid + ') is not valid'
                    });
                    throw error.create({
                        name: 'INVALID_IMPARTNER_ACCOUNT_ID',
                        message: 'Impartner Account ID is required'
                    });
                }
      
                if (typeof request.custentityr7dedicatedsecurityteam != 'boolean') {
                    log.debug({
                        title: 'Validations',
                        details: 'Dedicated Security Team (' + request.custentityr7dedicatedsecurityteam + ') is not valid'
                    });
                    throw error.create({
                        name: 'INVALID_DEDICATED_SECURITY_TEAM',
                        message: 'Dedicated Security Team is required'
                    });
                }
                if (common_library.isEmpty(request.custentityr7partnerlevel)) {
                    log.debug({
                        title: 'Validations',
                        details: 'Partner Level (' + request.custentityr7partnerlevel + ') is not valid'
                    });
                    throw error.create({
                        name: 'INVALID_PARTNER_LEVEL',
                        message: 'Partner Level is required'
                    });
                }
                if (common_library.isEmpty(request.custentityr7partnerregion)) {
                    log.debug({
                        title: 'Validations',
                        details: 'Partner Account Region (' + request.custentityr7partnerregion + ') is not valid'
                    });
                    throw error.create({
                        name: 'INVALID_PARTNER_ACCOUNT_REGION',
                        message: 'Partner Account Region is required'
                    });
                }
                if (common_library.isEmpty(request.custentityr7partnerstatus)) {
                    log.debug({
                        title: 'Validations',
                        details: 'Partner Status (' + request.custentityr7partnerstatus + ') is not valid'
                    });
                    throw error.create({
                        name: 'INVALID_PARTNER_STATUS',
                        message: 'Partner Status is required'
                    });
                }
                if (common_library.isEmpty(request.custentityr7partnerdatesigned)) {
                    log.debug({
                        title: 'Validations',
                        details: 'Agreement Start Date (' + request.custentityr7partnerdatesigned + ') is not valid'
                    });
                    throw error.create({
                        name: 'INVALID_AGREEMENT_START_DATE',
                        message: 'Agreement Start Date is required'
                    });
                }
                if (common_library.isEmpty(request.custentityr7partneraccountmanager)) {
                    log.debug({
                        title: 'Validations',
                        details: 'Partner Account Manager (' + request.custentityr7partneraccountmanager + ') is not valid'
                    });
                    throw error.create({
                        name: 'INVALID_PARTNER_ACCOUNT_MANAGER',
                        message: 'Partner Account Manager is required'
                    });
                }
                if (common_library.isEmpty(request.custentityr7partnerterritory)) {
                    log.debug({
                        title: 'Validations',
                        details: 'Authorized Sales Territory (' + request.custentityr7partnerterritory + ') is not valid'
                    });
                    throw error.create({
                        name: 'INVALID_AUTHORIZED_SALES_TERRITORY',
                        message: 'Authorized Sales Territory are required'
                    });
                }
              
                if (common_library.isEmpty(request.addresses)) {
                    log.debug({
                        title: 'Validations',
                        details: 'Addresses (' + request.addresses + ') is not valid'
                    });
                    throw error.create({
                        name: 'INVALID_ADDRESSES',
                        message: 'Addresses are required'
                    });
                }
                if (common_library.isEmpty(request.companyname)) {
                    log.debug({
                        title: 'Validations',
                        details: 'Company Name (' + request.companyname + ') is not valid'
                    });
                    throw error.create({
                        name: 'INVALID_COMPANY_NAME',
                        message: 'Company Name is required'
                    });
                }
                if (common_library.isEmpty(request.phone)) {
                    log.debug({
                        title: 'Validations',
                        details: 'Phone (' + request.phone + ') is not valid'
                    });
                    throw error.create({
                        name: 'INVALID_PHONE',
                        message: 'Phone is required'
                    });
                }
                if (common_library.isEmpty(request.url)) {
                    log.debug({
                        title: 'Validations',
                        details: 'Web Address (' + request.url + ') is not valid'
                    });
                    throw error.create({
                        name: 'INVALID_WEB_ADDRESS',
                        message: 'Web Address is required'
                    });
                }
                if (common_library.isEmpty(request.custentityr7partnerareasofinterest)) {
                    log.debug({
                        title: 'Validations',
                        details: 'Areas of Interest (' + request.custentityr7partnerareasofinterest + ') is not valid'
                    });
                    throw error.create({
                        name: 'INVALID_AREAS_OF_INTEREST',
                        message: 'Areas of Interest are required'
                    });
                }
                if (common_library.isEmpty(request.custentityr7partnernumberofemployees)) {
                    log.debug({
                        title: 'Validations',
                        details: 'Number of Employees (' + request.custentityr7partnernumberofemployees + ') is not valid'
                    });
                    throw error.create({
                        name: 'INVALID_NUMBER_OF_EMPLOYEES',
                        message: 'Number of Employees are required'
                    });
                }
                if (common_library.isEmpty(request.custentityr7partnertargetmarkets)) {
                    log.debug({
                        title: 'Validations',
                        details: 'Focus Customer Verticals (' + request.custentityr7partnertargetmarkets + ') is not valid'
                    });
                    throw error.create({
                        name: 'INVALID_FOCUS_CUSTOMER_VERTICALS',
                        message: 'Focus Customer Verticals are required'
                    });
                }
                if (common_library.isEmpty(request.custentityr7partnertargetcustomersize)) {
                    log.debug({
                        title: 'Validations',
                        details: 'Average Customer Employee Size (' + request.custentityr7partnertargetcustomersize + ') is not valid'
                    });
                    throw error.create({
                        name: 'INVALID_AVERAGE_CUSTOMER_EMPLOYEE_SIZE',
                        message: 'Average Customer Employee Size is required'
                    });
                }
            }

            return{
                get: processGetRequest,
                put: processPutRequest,
                post: processPostRequest,
                delete: processDeleteRequest
            };
        });