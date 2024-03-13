/**
 * @NApiVersion 2.0
 * @NScriptType plugintypeimpl
 */
define(
    ['/SuiteScripts/RESTlets/Common Library/r7_common_restlet_library.js', 'N/error', 'N/search'],
    function (common_library, error, search) {
        var lastmodifieddate;

        function varsInit(request) {
            lastmodifieddate = common_library.isEmpty(request.lastmodifieddate) ? null : request.lastmodifieddate;
        }

        function processGetRequest(request) {
            var result;
            varsInit(request);
            if (lastmodifieddate != null) {
                result = getROInnovationAllContactData();
            } else {
                throw error.create({
                    name: 'INVALID_REQUEST_PARAM',
                    message: 'Last modified date is required.'
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
        /*
         * This section is for the ROI <-------------------------------
         */

        function getContactPopulationToSearch() {

            var contactResults = [];

            var contactSearch = search.create({
                type: search.Type.CONTACT,
                columns: ['internalid'],
                filters: [{
                    name: 'custentityr7referencetypeofref',
                    operator: search.Operator.ANYOF,
                    values: JSON.parse(JSON.stringify([9, 11]))
                }]
            });

            var searchPages = contactSearch.runPaged({
                pageSize: 1000
            });

            searchPages.pageRanges.forEach(function (pageRange) {
                var currentSearchPage = searchPages.fetch({ index: pageRange.index });
                currentSearchPage.data.forEach(function (result) {
                    contactResults.push(result.getValue({
                        name: 'internalid'
                    }));
                });
            });

            return contactResults;
        }

        function getROInnovationAllContactData() {
            try {

                var contactsToSearch = getContactPopulationToSearch();

                var filters = [];
                filters.push(search.createFilter({
                    name: 'internalid',
                    operator: search.Operator.ANYOF,
                    values: contactsToSearch
                }));
                filters.push(search.createFilter({
                    name: 'isinactive',
                    operator: search.Operator.IS,
                    values: ['F']
                }));
                filters.push(search.createFilter({
                    name: 'custentityr7categoryactive',
                    join: 'company',
                    operator: search.Operator.ISNOTEMPTY
                }));
                filters.push(search.createFilter({
                    name: 'custentityr7copiedtointl',
                    join: 'company',
                    operator: search.Operator.IS,
                    values: ['F']
                }));
                filters.push(search.createFilter({
                    name: 'isdefaultshipping',
                    join: 'company',
                    operator: search.Operator.IS,
                    values: ['T']
                }));
                filters.push(search.createFilter({
                    name: 'custentityr7referencetypeofref',
                    operator: search.Operator.ANYOF,
                    values: JSON.parse(JSON.stringify([9, 11]))
                })) // Reference Program, Mentorship Program
                filters.push(search.createFilter({
                    name: 'lastmodifieddate',
                    operator: search.Operator.ONORAFTER,
                    values: common_library.stringToDate(lastmodifieddate)
                }));

                var columns = [];
                columns.push(search.createColumn({
                    name: 'internalid'
                }));// Contact internal id
                columns.push(search.createColumn({
                    name: 'entityid'
                }));// Contact Name
                columns.push(search.createColumn({
                    name: 'jobtitle'
                }));// JobTitle
                columns.push(search.createColumn({
                    name: 'email'
                }));// email
                columns.push(search.createColumn({
                    name: 'phone'
                }));// phone number
                columns.push(search.createColumn({
                    name: 'custentityr7referencetypeofref'
                }));// typeOfReference
                columns.push(search.createColumn({
                    name: 'company'
                }));// customerInternalId
                columns.push(search.createColumn({
                    name: 'address',
                    join: 'company'
                }));// Reference Contact
                columns.push(search.createColumn({
                    name: 'isinactive'
                }));// Inactive
                var mySearch = search.create({
                    type: search.Type.CONTACT,
                    columns: columns,
                    filters: filters
                });

                var results = [];

                var searchPages = mySearch.runPaged({
                    pageSize: 1000
                });
                searchPages.pageRanges.forEach(function (pageRange) {
                    var currentSearchPage = searchPages.fetch({ index: pageRange.index });
                    currentSearchPage.data.forEach(function (result) {

                        results.push({
                            internalId: result.getValue({
                                name: 'internalid'
                            }),
                            fields: {
                                name: result.getValue({
                                    name: 'entityid'
                                }),
                                jobTitle: result.getValue({
                                    name: 'jobtitle'
                                }),
                                email: result.getValue({
                                    name: 'email'
                                }),
                                phone: result.getValue({
                                    name: 'phone'
                                }),
                                typeOfReference: result.getText({
                                    name: 'custentityr7referencetypeofref'
                                }),
                                customerAddress: result.getValue({
                                    name: 'address',
                                    join: 'company'
                                }),
                                customerInternalId: result.getValue({
                                    name: 'company'
                                }),
                                inactive: result.getValue('isinactive')
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
        /*
         * -------------------------------> End of the ROI section
         */

        return {
            get: processGetRequest,
            put: processPutRequest,
            post: processPostRequest,
            delete: processDeleteRequest
        };
    });
