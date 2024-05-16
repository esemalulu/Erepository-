/**
 *@NApiVersion 2.1
 *@NScriptType Restlet
 */
define(['N/search', 'N/log'], function (search, log) {

    function _get(context) {
        var aReturn = {};
        var aReturnArr = [];

        if (!context.customer_id) {
            return JSON.stringify({ error: 'Empty customer_id parameter.' });
        }

        var searchObj = search.create({
            type: "customrecord_acme_cust_price_contracts",
            filters:
                [
                    ["custrecord_acme_cpc_cust_header.custrecord_acme_cpc_line_customer", "anyof", context.customer_id]
                ],
            columns:
                [
                    search.createColumn({
                        name: "name",
                        sort: search.Sort.ASC
                    }),
                    "custrecord_acme_cpc_start_date",
                    "custrecord_acme_cpc_end_date",
                    "custrecord_acme_cpc_contract_ref_no",
                    search.createColumn({
                        name: "custrecord_acme_cpc_line_customer",
                        join: "CUSTRECORD_ACME_CPC_CUST_HEADER"
                    }),
                    search.createColumn({
                        name: "custrecord_acme_cpc_cust_header",
                        join: "CUSTRECORD_ACME_CPC_CUST_HEADER"
                    }),
                    search.createColumn({
                        name: "custrecord_acme_cpc_line_description",
                        join: "CUSTRECORD_ACME_CPC_ITEM_HEADER"
                    }),
                    search.createColumn({
                        name: "custrecord_acme_cpc_item_header",
                        join: "CUSTRECORD_ACME_CPC_ITEM_HEADER"
                    }),
                    search.createColumn({
                        name: "custrecord_acme_cpc_line_item",
                        join: "CUSTRECORD_ACME_CPC_ITEM_HEADER"
                    }),
                    search.createColumn({
                        name: "custrecord_acme_cpc_line_cost",
                        join: "CUSTRECORD_ACME_CPC_ITEM_HEADER"
                    }),
                    search.createColumn({
                        name: "custrecord_acme_cpc_line_price",
                        join: "CUSTRECORD_ACME_CPC_ITEM_HEADER"
                    }),
                    search.createColumn({
                        name: "custrecord_acc_cpcl_sale_unit",
                        join: "CUSTRECORD_ACME_CPC_ITEM_HEADER"
                    })
                ]
        });
        var searchResultCount = searchObj.runPaged().count;
        log.debug("result count", searchResultCount);

        for (let i = 0; i < searchResultCount; i += 1000) {
            var results = searchObj.run().getRange({
                start: i,
                end: i + 1000
            });
            for (let j = 0; j < results.length; j++) {

                if (!aReturn[results[j].id]) {
                    aReturn[results[j].id] = {
                        internal_id: results[j].id,
                        name: results[j].getValue('name'),
                        customer_id: results[j].getValue({ name: 'custrecord_acme_cpc_line_customer', join: 'CUSTRECORD_ACME_CPC_CUST_HEADER' }),
                        customer: results[j].getText({ name: 'custrecord_acme_cpc_line_customer', join: 'CUSTRECORD_ACME_CPC_CUST_HEADER' }),
                        start_date: results[j].getValue('custrecord_acme_cpc_start_date'),
                        end_date: results[j].getValue('custrecord_acme_cpc_end_date'),
                        contract_reference_no: results[j].getValue('custrecord_acme_cpc_contract_ref_no'),
                        line: []
                    };
                }

                aReturn[results[j].id].line.push({
                    item_id: results[j].getValue({ name: 'custrecord_acme_cpc_line_item', join: 'CUSTRECORD_ACME_CPC_ITEM_HEADER' }),
                    item: results[j].getText({ name: 'custrecord_acme_cpc_line_item', join: 'CUSTRECORD_ACME_CPC_ITEM_HEADER' }),
                    description: results[j].getValue({ name: 'custrecord_acme_cpc_line_description', join: 'CUSTRECORD_ACME_CPC_ITEM_HEADER' }),
                    loaded_cost: results[j].getValue({ name: 'custrecord_acme_cpc_line_cost', join: 'CUSTRECORD_ACME_CPC_ITEM_HEADER' }),
                    price: results[j].getValue({ name: 'custrecord_acme_cpc_line_price', join: 'CUSTRECORD_ACME_CPC_ITEM_HEADER' }),
                    sale_unit_id: results[j].getValue({ name: 'custrecord_acc_cpcl_sale_unit', join: 'CUSTRECORD_ACME_CPC_ITEM_HEADER' }),
                    sale_unit: results[j].getText({ name: 'custrecord_acc_cpcl_sale_unit', join: 'CUSTRECORD_ACME_CPC_ITEM_HEADER' })
                });

            }
        }

        for (var key in aReturn) {
            if (aReturn.hasOwnProperty(key)) {
                aReturnArr.push(aReturn[key]);
            }
        }

        return JSON.stringify(aReturnArr);

    }

    return {
        get: _get,
    }
});
