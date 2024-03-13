/**
 * @NApiVersion 2.0
 * @NScriptType plugintypeimpl
 */
define(['/SuiteScripts/RESTlets/Common Library/r7_common_restlet_library.js', 'N/record', 'N/search'],
        function(common_library, record, search) {
            var email;
            var dunsNumber;

            function varsInit(request) {
                email = common_library.isEmpty(request.email)?null:request.email;
                dunsNumber = common_library.isEmpty(request.dunsNumber)?null:request.dunsNumber;
            }


            function processGetRequest(request) {
                varsInit(request);
                return getSFAllContactData();
            }

            function processDeleteRequest(request) {
                return null;
            }

            function processPutRequest(request) {
                return null;
            }

            function processPostRequest(request) {
                return null;
            }
            /* ------------------------------->
             * SalesForce section
             */
            
            function getSFAllContactData(){
                var result = {
                    size : 0,
                    items : [],
                    error : null
                };
                if (!(common_library.isNullOrEmpty(email) && common_library.isNullOrEmpty(dunsNumber))) {
                    try {
                        var companyIDs = getCustomersForSF();
                        if (companyIDs.length > 0) {
                            buildResponseForSFOnGet(result, companyIDs);
                        } else {
                            result.error = {
                                type : 'WARNING_NO_DATA_FOUND',
                                message : 'No data found. Please check your parameters.',
                                exception : null
                            };
                        }
                    }
                    catch (ex) {
                        log.error({
                            title : 'Exception',
                            details : JSON.stringify(ex)
                        });
                        result.error = {
                            type : 'INTERNAL_ERROR',
                            message : 'An error occurred during processing of your request. Please see exception information.',
                            exception : ex
                        };
                    }
                } else {
                    result.error = {
                        type : 'ERROR_EMPTY_PARAMS',
                        message : 'Email and DunsNumber parameters can not be empty at the same time. Please check.',
                        exception : null
                    };
                }
                
                return result;
            }
            
            function getCustomersForSF(){
                // List of customer's IDs
                var companyIDs = [];
                var lastID =  searchUsingDunsNumber(companyIDs);
                searchUsingEmail(companyIDs,lastID);
                return companyIDs;
            }
            
            // Find Customer by dunsNumber first since dunsNumber is
            // unique for each customer
            function searchUsingDunsNumber(companyIDs){
                var lastID = -1;
                if (!common_library.isNullOrEmpty(dunsNumber)) {
                    var customerSearch = search.create({
                        type : search.Type.CUSTOMER,
                        columns : [ {
                            name : 'internalid'
                        } ],
                        filters : [ {
                            name : 'custentityr7dunsnumber',
                            operator : search.Operator.EQUALTO,
                            values : [ dunsNumber ]
                        }, {
                            name : 'custentityr7copiedtointl',
                            operator : search.Operator.IS,
                            values : [ 'F' ]
                        } ]
                    });
                    customerSearch.run().each(function(result) {
                        lastID = result.getValue({
                            name : 'internalid'
                        });
                        var companyID = {
                            id : lastID
                        }
                        companyIDs.push(companyID);
                    });
                }
                return lastID;
            }
            
            function searchUsingEmail(companyIDs,last){
                if (!common_library.isNullOrEmpty(email)) {
                    var lastID = last;
                    var filters = [];
                    filters.push(search.createFilter({
                        name : 'email',
                        operator : search.Operator.IS,
                        values : email
                    }));
                    var columns = [{
                        name : 'internalid',
                        join : 'company',
                        sort : search.Sort.ASC
                    }];
                    var customerInternalId = 0;

                    var contactsSearch = search.create({
                        type : search.Type.CONTACT,
                        columns : columns,
                        filters : filters
                    });
                    var searchid = 0;
                    var searchResult = contactsSearch.run();
                    do {
                        var resultSlice = searchResult.getRange({
                            start : searchid,
                            end : searchid + 1000
                        });

                        if ((!common_library.isNullOrEmpty(resultSlice)) && resultSlice.length > 0) {
                            for ( var i in resultSlice) {
                                customerInternalId = resultSlice[i].getValue({
                                    name : 'internalid',
                                    join : 'company'
                                });
                                // Make sure we are working with distinct IDs
                                if (lastID !== customerInternalId) {
                                    lastID = customerInternalId;
                                    var companyID = {
                                        id : customerInternalId
                                    }
                                    companyIDs.push(companyID);
                                }
                                searchid++;
                            }
                        }
                    } while (resultSlice.length >= 1000);
                }
            }
            
            function buildResponseForSFOnGet(result, companies){
                for (var i = 0; i < companies.length; i++) {
                    result.items[i] = buildOneItemForSF(companies[i]);
                }
                result.size = result.items.length;
            }
            
            function buildOneItemForSF(companyRec){
                var custRecord = record.load({
                    type : record.Type.CUSTOMER,
                    id : companyRec.id,
                    isDynamic : false
                });
                
                var currency = record.load({
                    type : record.Type.CURRENCY,
                    id : custRecord.getValue({
                        fi​e​l​d​I​d : 'currency'
                    }),
                    isDynamic : false
                });

                var item = createNewCustObject(companyRec.id, custRecord, currency);

                fillInSFSalesTeamMembers(item, custRecord, 'salesrep', 'AccountExecutive');
                fillInSFSalesTeamMembers(item, custRecord, 'custentityr7customerbdr', 'BusinessDevelopment');

                fillInSFContactsForItem(item);
                return item;
            }
            
            function createNewCustObject(id, custRecord, currency){
                return {
                    id : id,
                    accountNumber : custRecord.getText({
                        fi​e​l​d​I​d : 'accountnumber'
                    }),
                    meta : {
                        href : common_library.getSystemEndPoint()+'/app/common/entity/custjob.nl?id=' + id
                    },
                    companyName : custRecord.getText({
                        fi​e​l​d​I​d : 'entityid'
                    }),
                    customerStatus : custRecord.getText({
                    	fieldId : 'stage'
                    }),
                    dunsNumber : custRecord.getValue({
                        fi​e​l​d​I​d : 'custentityr7dunsnumber'
                    }),
                    industry : custRecord.getText({
                        fi​e​l​d​I​d : 'custentityr7citindustry'
                    }),
                    createdDate : common_library.nsDateToISODateString(custRecord.getValue({
                        fi​e​l​d​I​d : 'datecreated'
                    })),
                    lastUpdatedDate : common_library.nsDateToISODateString(custRecord.getValue({
                        fi​e​l​d​I​d : 'lastmodifieddate'
                    })),
                    currencyIsoCode : currency.getValue({
                        fi​e​l​d​I​d : 'symbol'
                    }),
                    address : {
                        street : custRecord.getValue({
                            fi​e​l​d​I​d : 'billaddr1'
                        }) + ' ' + custRecord.getValue({
                            fi​e​l​d​I​d : 'billaddr2'
                        }),
                        city : custRecord.getValue({
                            fi​e​l​d​I​d : 'billcity'
                        }),
                        state : custRecord.getValue({
                            fi​e​l​d​I​d : 'billstate'
                        }),
                        postalCode : custRecord.getValue({
                            fi​e​l​d​I​d : 'billzip'
                        }),
                        country : custRecord.getValue({
                            fi​e​l​d​I​d : 'billcountry'
                        })
                    },
                    salesTeamMembers : [],
                    contacts : []
                };
            }
            
            function fillInSFSalesTeamMembers(item,custRecord,fieldId,role){
            	
            	try{
            		 var employeeId = custRecord.getValue({
                         fi​e​l​d​I​d : fi​e​l​d​I​d
                     });
                     if (!common_library.isNullOrEmpty(employeeId)) {
                         var employee = record.load({
                             type : record.Type.EMPLOYEE,
                             id : employeeId
                         });
                         var teamMember = {
                             role : role,
                             id : employeeId,
                             firstName : employee.getValue({
                                 fieldId : 'firstname'
                             }),
                             lastName : employee.getValue({
                                 fieldId : 'lastname'
                             }),
                             meta : {
                                 href : common_library.getSystemEndPoint()+'/app/common/entity/employee.nl?id=' + employeeId
                             }
                         };
                         item.salesTeamMembers.push(teamMember);
                     }
            		
            	}catch(ex){
            	    log.debug({
            	        title : 'Exception happened for employee id',
            	        details : employeeId
            	        });
            	    log.debug({
            	        title : 'Exception happened for custrecord ',
            	        details : JSON.stringify(custRecord)
            	        });            	    
            	    log.debug({
                         title : 'Exception',
                         details : JSON.stringify(ex)
                         });
            	    var teamMember = {
            	            role : role,
            	            id : "",
                            firstName : "",
                            lastName : "",
                            meta : {
                                href : ""
                            }
                        };
            	item.salesTeamMembers.push(teamMember);
            	}
            }
            
            function fillInSFContactsForItem(item){
                var contactSearch = search.create({
                    type : search.Type.CONTACT,
                    columns : [ {
                        name : 'internalid'
                    }, {
                        name : 'firstname'
                    }, {
                        name : 'lastname'
                    }, {
                        name : 'email'
                    }, {
                        name : 'phone'
                    }, {
                        name : 'salutation'
                    }, {
                        name : 'custentityr7contactjoblevel'
                    }, {
                        name : 'title'
                    }, {
                        name : 'mobilephone'
                    }, {
                        name : 'datecreated'
                    }, {
                        name : 'lastmodifieddate'
                    } ],
                    filters : [ {
                        name : 'company',
                        operator : search.Operator.IS,
                        values : item.id
                    }, {
                        name : 'isinactive',
                        operator : search.Operator.IS,
                        values : [ 'F' ]
                    } ]
                });
                var searchResult = contactSearch.run(); 
                try {
                     var resultSlice = searchResult.getRange({
                            start : 0,
                            end : 100
                        });    
                        if ((!common_library.isNullOrEmpty(resultSlice)) && resultSlice.length > 0) {
                            for ( var i in resultSlice) {
                                var record = resultSlice[i];
                                var contact = buildContactObjectFromSearchResult(record);                                   
                                item.contacts.push(contact);                                
                            }
                        }                   
                }catch(ex){
                    log.error({
                        title : 'Exception',
                        details : JSON.stringify(ex)                                      
                    });
                }
            }            
            function buildContactObjectFromSearchResult(record){
                var contactId = record.getValue({
                    name : 'internalid'
                });
                return {
                        id : contactId,
                        firstName : record.getValue({
                            name : 'firstname'
                        }),
                        lastName : record.getValue({
                            name : 'lastname'
                        }),
                        email : record.getValue({
                            name : 'email'
                        }),
                        phone : record.getValue({
                            name : 'phone'
                        }),
                        salutation : record.getValue({
                            name : 'salutation'
                        }),
                        jobLevel : record.getValue({
                            name : 'custentityr7contactjoblevel'
                        }),
                        title : record.getValue({
                            name : 'title'
                        }),
                        mobilePhone : record.getValue({
                            name : 'mobilephone'
                        }),
                        meta : {
                            href : common_library.getSystemEndPoint()+'/app/common/entity/contact.nl?id=' + contactId
                        },
                        createdDate : common_library.nsDateToISODateString(record.getValue({
                            name : 'datecreated'
                        })),
                        lastUpdatedDate : common_library.nsDateToISODateString(record.getValue({
                            name : 'lastmodifieddate'
                        }))
                    };
            }
            
            /*
             * End of the SalesForce section ------------------------------->
             */
            return{
                get: processGetRequest,
                put: processPutRequest,
                post: processPostRequest,
                delete: processDeleteRequest
            };
        });
