/**
 * @NApiVersion 2.0
 * @NScriptType plugintypeimpl
 */
define(['/SuiteScripts/RESTlets/Common Library/r7_common_restlet_library.js', 'N/error', 'N/record', 'N/search'],
    function (common_library, error, record, search) {

        function processGetRequest(request) {
            var lastmodifieddate = request.lastmodifieddate;
            var customerIds = request.customerIds;
            var result;
            switch (true) {
                case (!common_library.isNullOrEmpty(lastmodifieddate) && common_library.isNullOrEmpty(customerIds)):
                    result = getROInnovationAllCustomerData(lastmodifieddate);
                    break;

                case (common_library.isNullOrEmpty(lastmodifieddate) && !common_library.isNullOrEmpty(customerIds)):
                    customerIds = customerIds.split(',');
                    result = getCustomersById(customerIds);
                    break;

                case (!common_library.isNullOrEmpty(lastmodifieddate) && !common_library.isNullOrEmpty(customerIds)):
                    customerIds = customerIds.split(',');
                    result = getROIBydateAndID(lastmodifieddate, customerIds);
                    break;
                default:
                    throw error.create({
                        name: 'INVALID_REQUEST_PARAM',
                        message: 'Last modified date or customer id is required.'
                    });
            }
            return result;
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

        function getROInnovationAllCustomerData(lastmodifieddate) {
            try {
                var filters = getFilters(null);
                filters.push(search.createFilter({ name: 'lastmodifieddate', operator: search.Operator.ON, values: common_library.stringToDate(lastmodifieddate) }));
                var mySearch = search.create({ type: search.Type.CUSTOMER, columns: getColumns(), filters: filters });
                var results = [];
                var searchPages = mySearch.runPaged({
                    pageSize: 1000
                });
                searchPages.pageRanges.forEach(function (pageRange) {
                    var currentSearchPage = searchPages.fetch({ index: pageRange.index });
                    currentSearchPage.data.forEach(function (result) {
                        results.push({
                            internalId: result.getValue({ name: 'internalid' }),
                            fields: {
                                name: result.getValue({ name: 'entityid' }),
                                salesRep: result.getText({ name: 'salesrep' }),
                                customerSuccessManager: result.getText({ name: 'custentityr7accountmanager' }),
                                shippingCity: result.getValue({ name: 'shipcity' }),
                                shippingState: result.getText({ name: 'shipstate' }),
                                shippingCountry: result.getValue({ name: 'shipcountry' }),
                                segment: result.getText({ name: 'custentityr7customersegment' }),
                                rapid7Industry: result.getValue({ name: 'custentityr7rapid7industry' }),
                                rapid7SubIndustry: result.getValue({ name: 'custentityr7rapid7subindustry' }),
                                categoryActive: result.getValue({ name: 'custentityr7categoryactive' }),
                                customerPublicityRights: result.getValue({ name: 'custentityr7custpublicityrights' })
                            }
                        });
                    });
                });
            }
            catch (e) {
                results = {
                    error: 'ERROR',
                    details: "Search error. Details: " + e
                };
            }
            return results;
        }

        function getCustomersById(customerIds) {
            var result = null;
            if (customerIds.length > 0) {
                result = new Array();
                var searchResult = search.create({ type: search.Type.CUSTOMER, filters: getFilters(customerIds), columns: getColumns() }).run().getRange({ start: 0, end: 1000 });
                if (searchResult && searchResult.length > 0) {
                    for (var i = 0; i < searchResult.length; i++) {
                        result.push({
                            internalId: searchResult[i].getValue({ name: 'internalid' }),
                            fields: {
                                name: searchResult[i].getValue({ name: 'entityid' }),
                                salesRep: searchResult[i].getText({ name: 'salesrep' }),
                                customerSuccessManager: searchResult[i].getText({ name: 'custentityr7accountmanager' }),
                                shippingCity: searchResult[i].getValue({ name: 'shipcity' }),
                                shippingState: searchResult[i].getText({ name: 'shipstate' }),
                                shippingCountry: searchResult[i].getValue({ name: 'shipcountry' }),
                                segment: searchResult[i].getText({ name: 'custentityr7customersegment' }),
                                rapid7Industry: searchResult[i].getText({ name: 'custentityr7rapid7industry' }),
                                rapid7SubIndustry: searchResult[i].getText({ name: 'custentityr7rapid7subindustry' }),
                                categoryActive: searchResult[i].getText({ name: 'custentityr7categoryactive' }),
                                customerPublicityRights: searchResult[i].getText({ name: 'custentityr7custpublicityrights' })
                            }
                        });
                    }
                }
                else {
                    result = []
                }
            }
            return result;
        }

        function getROIBydateAndID(lastmodifieddate, customerIds) {
            var result = null;
            try {
                var filters = getFilters(customerIds);
                filters.push(search.createFilter({ name: 'lastmodifieddate', operator: search.Operator.ON, values: common_library.stringToDate(lastmodifieddate) }));
                var mySearch = search.create({ type: search.Type.CUSTOMER, columns: getColumns(), filters: filters });
                var searchid = 0;
                var searchResult = mySearch.run();
                result = new Array();
                do {
                    var resultSlice = searchResult.getRange({ start: searchid, end: searchid + 1000 });
                    if (resultSlice && resultSlice.length > 0) {
                        for (var i in resultSlice) {
                            result.push({
                                internalId: resultSlice[i].getValue({ name: 'internalid' }),
                                fields: {
                                    name: resultSlice[i].getValue({ name: 'entityid' }),
                                    salesRep: resultSlice[i].getText({ name: 'salesrep' }),
                                    customerSuccessManager: resultSlice[i].getText({ name: 'custentityr7accountmanager' }),
                                    shippingCity: resultSlice[i].getValue({ name: 'shipcity' }),
                                    shippingState: resultSlice[i].getText({ name: 'shipstate' }),
                                    shippingCountry: resultSlice[i].getValue({ name: 'shipcountry' }),
                                    segment: resultSlice[i].getText({ name: 'custentityr7customersegment' }),
                                    rapid7Industry: resultSlice[i].getValue({ name: 'custentityr7rapid7industry' }),
                                    rapid7SubIndustry: resultSlice[i].getValue({ name: 'custentityr7rapid7subindustry' }),
                                    categoryActive: resultSlice[i].getValue({ name: 'custentityr7categoryactive' }),
                                    customerPublicityRights: resultSlice[i].getValue({ name: 'custentityr7custpublicityrights' })
                                }
                            });
                            searchid++;
                        }
                    }
                    else {
                        result = []
                        break;
                    }
                } while (resultSlice.length >= 1000);
            }
            catch (e) {
                result = {
                    error: 'ERROR',
                    details: "Search error. Details: " + e
                };
            }
            return result;
        }

        /*
         * @param (Array) customersId - simple array with customer's ids.
         * ["111","222"] @returns (Array) filters - array of Netsuite's
         * filter objects.
         */
        function getFilters(customersId) {
            var filters = [];
            if (!common_library.isNullOrEmpty(customersId)) {
                filters.push(search.createFilter({ name: 'internalid', operator: search.Operator.ANYOF, values: customersId }));
            }
            filters.push(search.createFilter({ name: 'custentityr7categoryactive', operator: search.Operator.ISNOTEMPTY }));
            filters.push(search.createFilter({ name: 'isdefaultshipping', operator: search.Operator.IS, values: ['T'] }));
            // Works only in sb5 and production
            // filters.push(search.createFilter({name:
            // 'custentityr7copiedtointl', operator: search.Operator.IS,
            // values: ['F']}));
            return filters;
        }

        /*
         * @param @returns (Array) columns - array of Netsuite's columns
         * objects.
         */
        function getColumns() {
            var columns = [];
            columns.push(search.createColumn({ name: 'internalid' }));// Company id
            columns.push(search.createColumn({ name: 'entityid' }));// Company Name
            columns.push(search.createColumn({ name: 'salesrep' }));// Sales Rep
            columns.push(search.createColumn({ name: 'custentityr7accountmanager' }));// Customer Success Manager
            columns.push(search.createColumn({ name: 'shipcity' }));// Shipping city
            columns.push(search.createColumn({ name: 'shipstate' }));// Shipping state
            columns.push(search.createColumn({ name: 'shipcountry' }));// Shipping Country
            columns.push(search.createColumn({ name: 'custentityr7rapid7industry' }));// Industry
            columns.push(search.createColumn({ name: 'custentityr7rapid7subindustry' }));// Sub-Industry
            columns.push(search.createColumn({ name: 'custentityr7categoryactive' }));// Active Products Services
            columns.push(search.createColumn({ name: 'custentityr7custpublicityrights' }));// Customer public rights
            return columns;
        }

        return {
            get: processGetRequest,
            put: processPutRequest,
            post: processPostRequest,
            delete: processDeleteRequest
        }
    });
