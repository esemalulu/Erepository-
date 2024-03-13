/**
 * @NApiVersion 2.0
 * @NScriptType plugintypeimpl
 */
define([ '/SuiteScripts/RESTlets/Common Library/r7_common_restlet_library.js', 'N/error', 'N/record', 'N/search' ],
        function(common_library, error, record, search) {

    function processGetRequest(request) {
        var result;
        if (!common_library.isNullOrEmpty(request.accountId)) {
            result = getCustomersOppurtunities(request.accountId);
        } else {
            throw error.create({
                name : 'INVALID_REQUEST_PARAM',
                message : 'accountId is required.'
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

    /**
     * Build up the response for this RESTLet
     * 
     * @param customerId - customer's internal ID
     * @returns object containing required information
     */
    function getCustomersOppurtunities(customerId) {
        var result = {
                size : 0,
                items : []
        };
        var customer = getCustomer(customerId);
        if(!common_library.isNullOrEmpty(customer)){
            var opportunities = findOpportunities(customerId);
            result.size = opportunities.length;
            for (var i = 0; i < opportunities.length; i++) {
                result.items[i] = getOpportunityInfo(opportunities[i].internalId,customer);
            }
        }else{
            throw error.create({
                name : 'INVALID_REQUEST_PARAM',
                message : 'Customer with specified ID does not exists or not active. Please check.'
            });
        }
        return result;
    }

    /**
     * Get the Customer record and check if it is active.
     * 
     * @param customerId
     * @returns Customer record if found and the Customer is Active, otherwise returns NULL
     */
    function getCustomer(customerId){
        var customer = record.load({type: record.Type.CUSTOMER, id: customerId, isDynamic: true});
        var exists = !common_library.isNullOrEmpty(customer); 
        var active = false;
        if(exists){
            active = !customer.getValue({fieldId:'isinactive'});
        }
        return exists && active ? customer : null;
    }

    /**
     * Build up one Opportunity Info record based on
     * 
     * @param opportunityId - Opportunity internal; ID
     * @param customer - Customer record
     * @returns
     */
    function getOpportunityInfo(opportunityId, customer) {
        var SUBLIST_ITEMS = 'item';
        var opportunity = record.load({
            type:record.Type.OPPORTUNITY,
            id:opportunityId,
            isDynamic:true
        });

        var currency = record.load({
            type : record.Type.CURRENCY,
            id : opportunity.getValue({
                fi​e​l​d​I​d : 'currency'
            }),
            isDynamic : false
        });
        var opportunityInfo = null;

        if(!common_library.isNullOrEmpty(opportunity)){

            opportunityInfo =  {
                    id : opportunity.getValue({
                        fieldId:'tranid'
                    }),
                    meta : {
                        href: 'https://663271.app.netsuite.com/app/accounting/transactions/opprtnty.nl?id='+opportunityId
                    },
                    total : opportunity.getValue({fieldId:'projectedtotal'}),
                    currencyIsoCode :currency.getValue({fi​e​l​d​I​d : 'symbol'}),
                    forecastType : opportunity.getText({fieldId:'forecasttype'}),
                    industry : customer.getValue({
                        fi​e​l​d​I​d : 'custentityr7citindustry'
                    }),
                    createdDate : common_library.nsDateToISODateString(opportunity.getValue({
                        fi​e​l​d​I​d : 'createddate'
                    })),
                    lastUpdatedDate : common_library.nsDateToISODateString(opportunity.getValue({
                        fi​e​l​d​I​d : 'lastmodifieddate'
                    })),
                    probability : opportunity.getValue({
                        fieldId:'probability'
                    }),
                    salesrep : opportunity.getText({
                        fieldId:'salesrep'
                    }),
                    status : opportunity.getText({
                        fieldId:'Opprtnty_ENTITYSTATUSlabel'
                    }),
                    address : {
                        street : customer.getValue({
                            fi​e​l​d​I​d : 'billaddr1'
                        }) + ' ' + customer.getValue({
                            fi​e​l​d​I​d : 'billaddr2'
                        }),
                        city : customer.getValue({
                            fi​e​l​d​I​d : 'billcity'
                        }),
                        state : customer.getValue({
                            fi​e​l​d​I​d : 'billstate'
                        }),
                        postalCode : customer.getValue({
                            fi​e​l​d​I​d : 'billzip'
                        }),
                        country : customer.getValue({
                            fi​e​l​d​I​d : 'billcountry'
                        })
                    },
                    lineItems : [ ]
            };

            var lineCount = opportunity.getLineCount({
                sublistId: SUBLIST_ITEMS
            });
            for(var i = 0; i< lineCount;i++){ 
                opportunityInfo.lineItems.push({ 
                    lineNumber: opportunity.getSublistValue({
                        sublistId: SUBLIST_ITEMS, 
                        fieldId: 'linenumber', 
                        line: i 
                    }), 
                    item : opportunity.getSublistText({
                        sublistId: SUBLIST_ITEMS, 
                        fieldId: 'item', 
                        line: i 
                    }), 
                    quantity : opportunity.getSublistValue({ 
                        sublistId: SUBLIST_ITEMS, 
                        fieldId: 'quantity', 
                        line: i 
                    }), 
                    amount : opportunity.getSublistValue({
                        sublistId: SUBLIST_ITEMS, 
                        fieldId: 'amount', 
                        line: i 
                    }) 
                }); 
            }

        }
        return opportunityInfo;
    }

    /**
     * Gets the list of opportunity IDs for specified customer's ID
     * 
     * @param customerId
     * @returns list of found Opportunity IDs
     */
    function findOpportunities(customerId) {
        var searchResults = [];
        var filters = [];
        filters.push(search.createFilter({
            name: 'entity', 
            operator: search.Operator.ANYOF, 
            values: customerId
        }));
//        filters.push(search.createFilter({
//            name: 'entitystatus', 
//            operator: search.Operator.ANYOF, 
//            values: ['35','36','37','38','39','41','78','80','81','82','83','85','86','87','88','95']
//        }));

        var mySearch = search.create({type: search.Type.OPPORTUNITY, columns: [search.createColumn({name: 'internalid'})], filters: filters});
        var searchid = 0;
        var searchResult = mySearch.run();
        do {
            var resultSlice = searchResult.getRange({start: searchid, end: searchid + 1000});           
            if (!common_library.isNullOrEmpty(resultSlice) && resultSlice.length > 0)
            {
                for (var i = 0;i<resultSlice.length;i++) {
                    searchResults.push({
                        internalId: resultSlice[i].getValue({name: 'internalid'})
                    });
                    searchid++;
                }
            }
            else
            {
                break;
            }
        } while (resultSlice.length >= 1000);
        return searchResults;
    }

    return {
        get : processGetRequest,
        put : processPutRequest,
        post : processPostRequest,
        delete : processDeleteRequest
    }
});
