/**
 *@NApiVersion 2.1
 *@NScriptType ClientScript
 */
define(["N/runtime", "N/search", "N/ui/dialog"], function (runtime, search, dialog) {

    function saveRecord(context) {
        try {
            var currRecord = context.currentRecord;

            /* LOGIC THAT PREVENTS DUPLICATED CPC LINES */
            if (currRecord.type == "customrecord_acme_cust_price_contract_ln") {
                var parentRecordId = currRecord.getValue({
                    fieldId: 'custrecord_acme_cpc_item_header'
                })

                
                var duplicateExist = false;
                var item = currRecord.getValue({
                    fieldId: 'custrecord_acme_cpc_line_item'
                });
                var customrecord_acme_cust_price_contract_lnSearchObj = search.create({
                    type: "customrecord_acme_cust_price_contract_ln",
                    filters:
                        [
                            ["custrecord_acme_cpc_line_item", "anyof", item],
                            "AND",
                            ["custrecord_acme_cpc_item_header", "anyof", parentRecordId]
                        ]
                });
                var searchResultCount = customrecord_acme_cust_price_contract_lnSearchObj.runPaged().count;
             
                if (searchResultCount > 0) {
                    customrecord_acme_cust_price_contract_lnSearchObj.run().each(function (result) {
                        if (result.id != currRecord.id) {
                            duplicateExist = true;
                        }
                        return true;
                    });
                }

                if (duplicateExist) {
                    dialog.alert({
                        title: 'Duplicate Record Exists',
                        message: 'There is another CPC Line for this item and CPC Header.'
                    })
                    return false
                }
               return true;
                
            }
            /* END LOGIC THAT PREVENTS DUPLICATED CPC LINES */
        } catch (error) {
            console.log('Error in saveRecord', error)
        }
    }

    return {
        saveRecord: saveRecord,
    }
});
