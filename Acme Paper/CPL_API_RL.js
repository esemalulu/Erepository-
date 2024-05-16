/**
 * @NApiVersion 2.x
 * @NScriptType Restlet
 * @NModuleScope SameAccount
 */
define(['N/search'], function(search) {
    /**
     * Function called upon sending a GET request to the RESTlet.
     *
     * @param {Object} param - Parameters from HTTP request URL; parameters will be passed into function as an Object (for all supported content types)
     * @returns {string | Object} HTTP response body; return string when request Content-Type is 'text/plain'; return Object when request Content-Type is 'application/json'
     * @since 2015.1
     */
    function doGet(param) {
        var oSearch;
        var oTemp;
        var aReturn = [];
        var aFilter = [];
        
        if(!param.customer_id) {
            return JSON.stringify({error: 'Empty customer_id parameter.'});    
        }
        
        aFilter.push({
            name: 'customer',
            operator: 'is',
            values: param.customer_id
        });
        
        if(param.price_level) {
            aFilter.push({
                name: 'formulatext',
                formula: '{pricelevel}',
                operator: 'is',
                values: param.price_level
            });
        }
        
        oSearch = search.create({
            type: 'pricing',
            columns: [
                 search.createColumn({
                     name: 'item',
                     sort: search.Sort.ASC,
                     summary: search.Summary.GROUP
                 }),
                 search.createColumn({
                     name: 'customer',
                     summary: search.Summary.GROUP
                 }),
                 search.createColumn({
                     name: 'pricelevel',
                     summary: search.Summary.GROUP
                 }),
                 search.createColumn({
                     name: 'quantityrange',
                     summary: search.Summary.GROUP
                 }),
                 search.createColumn({
                     name: 'minimumquantity',
                     summary: search.Summary.GROUP
                 }),
                 search.createColumn({
                     name: 'maximumquantity',
                     summary: search.Summary.GROUP
                 }),
                 search.createColumn({
                     name: 'saleunit',
                     summary: search.Summary.GROUP
                 }),
                 search.createColumn({
                     name: 'unitprice',
                     summary: search.Summary.AVG
                 })
            ],
            filters: aFilter
        });
        
        var aPagedData = oSearch.runPaged({pageSize : 1000});
        for(var i=0; i < aPagedData.pageRanges.length; i++ ) {
            var aCurrentPage = aPagedData.fetch(i);
            aCurrentPage.data.forEach( function(oItem) {
                
                oTemp = {
                    customer_id: oItem.getValue({
                         name: 'customer',
                         summary: search.Summary.GROUP
                     }), 
                    customer: oItem.getText({
                         name: 'customer',
                         summary: search.Summary.GROUP
                     }), 
                    item_id: oItem.getValue({
                         name: 'item',
                         summary: search.Summary.GROUP
                     }), 
                    item: oItem.getText({
                         name: 'item',
                         summary: search.Summary.GROUP
                     }), 
                    price_level_id: oItem.getValue({
                         name: 'pricelevel',
                         summary: search.Summary.GROUP
                     }), 
                    price_level: oItem.getText({
                         name: 'pricelevel',
                         summary: search.Summary.GROUP
                     }), 
                    quantity_range: oItem.getValue({
                         name: 'quantityrange',
                         summary: search.Summary.GROUP
                     }), 
                    minimum_quantity: oItem.getValue({
                         name: 'minimumquantity',
                         summary: search.Summary.GROUP
                     }), 
                    maximum_quantity: oItem.getValue({
                        name: 'maximumquantity',
                        summary: search.Summary.GROUP
                    }), 
                    sale_unit: oItem.getValue({
                         name: 'saleunit',
                         summary: search.Summary.GROUP
                     }), 
                    unit_price: oItem.getValue({
                        name: 'unitprice',
                        summary: search.Summary.AVG
                    }), 
                }; 

                aReturn.push(oTemp);
            });

        }
        
        return JSON.stringify(aReturn);
    }

    return {
        'get': doGet,
    };
});