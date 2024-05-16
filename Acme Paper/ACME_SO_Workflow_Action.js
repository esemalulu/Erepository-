/**
 * @NApiVersion 2.x
 * @NScriptType workflowactionscript
 */
define(['N/record', 'N/search'],
    function(record, search) {
        function onAction(scriptContext) {
          log.debug('returning','returning');
          return true;
            var newRecord = scriptContext.newRecord;
            var customerId = newRecord.getValue({
                fieldId: 'entity'
            });
            var aItems = [];
            var oItemsSearchResult = {};
            var oItemsRestriction = {};

            log.debug('customerId', customerId);
            var restrictedItemFlag = parseInt(0);
            var itemLineCount = newRecord.getLineCount({
                sublistId: 'item'
            });
            log.debug('Item Count', itemLineCount);
            for (var i = 0; i < itemLineCount; i++) {
                var itemId = newRecord.getSublistValue({
                    sublistId: 'item',
                    fieldId: 'item',
                    line: i
                });
                var restrictedItemCheck = newRecord.getSublistValue({
                    sublistId: 'item',
                    fieldId: 'custcol_acme_restricted_item',
                    line: i
                });
                log.debug('itemId : RestrictedItemCheck', itemId + ':' + restrictedItemCheck);
                
                aItems.push(itemId);
                oItemsRestriction[itemId] = restrictedItemCheck;
                oItemsSearchResult[itemId] = false;
            }

            //Check if restricted item is attached to the customer
            var customrecord_acme_restricted_itemsSearchObj = search.create({
                type: "customrecord_acme_restricted_items",
                columns: [
                    'custrecord_acme_ri_item'
                ],
                filters: [
                    ["custrecord_acme_ri_customer", "anyof", customerId],
                    "AND",
                    ["custrecord_acme_ri_item", "anyof", aItems],
                    "AND",
                    ["isinactive", "is", "F"]
                ]
            });
            
            var aPagedData = customrecord_acme_restricted_itemsSearchObj.runPaged({pageSize : 1000});
            for(var i=0; i < aPagedData.pageRanges.length; i++ ) {
                var aCurrentPage = aPagedData.fetch(i);
                aCurrentPage.data.forEach( function(oItem) {
                    oItemsSearchResult[oItem.getValue('custrecord_acme_ri_item')] = true;
                });
            }
            
            aItems.forEach(function(idItem){
                if(oItemsRestriction[idItem] && oItemsSearchResult[idItem] == false) {
                   restrictedItemFlag = parseInt(1); //Send to Approval
                }
            });
            
            log.debug('Return value', restrictedItemFlag);
            return restrictedItemFlag;
        }
        return {
            onAction: onAction
        };
    });