/**
 *@NApiVersion 2.1
 *@NScriptType Suitelet
 */
define(['N/log', 'N/search'], function (log, search) {

    function onRequest(context) {
        try {
            if (context.request.method == 'POST') {
                var requestBody = JSON.parse(context.request.body);
                var itemNamesArr = requestBody.itemsArr;
                var customerId = requestBody.customerId;
                var downloadAction = requestBody.downloadAction;
                var costsArr = searchRebateCosts(itemNamesArr, customerId, downloadAction);
                log.debug('costArr', costsArr)
                context.response.write({
                    output: JSON.stringify(costsArr)
                })
            }
        } catch (error) {
            log.error('Error onRequest', error)
        }
    }

    function getItemIds(itemsArr) {
        var itemIds = [];
        itemsArr.forEach(function (item) {
            log.debug('item', item);

            var itemSearch = search.create({
                type: "item",
                filters:
                    [
                        ["name", "is", String(item)],
                    ],
                columns:
                    []
            });
            itemSearch.run().each(function (result) {
                log.debug('result', result);
                itemIds.push(result.id)
                return true;
            });
        });
        return itemIds;
    }

    function searchRebateCosts(itemsArr, customerId, downloadAction) {
        try {
            if (!downloadAction) itemsArr = getItemIds(itemsArr)
            var res = [];
            var itemsFilter = ["custrecord_rebate_items_parent.custrecord_rebate_items_item", "anyof"]
            itemsFilter = itemsFilter.concat(itemsArr)
            log.debug('itemsFilter', itemsFilter)
            log.debug('customerId Filter', customerId)
            var customrecord_rebate_parentSearchObj = search.create({
                type: "customrecord_rebate_parent",
                filters:
                    [
                        ["isinactive", "is", "F"],
                        "AND",
                        ["custrecord_rebate_start_date", "onorbefore", "today"],
                        "AND",
                        ["custrecord_rebate_end_date", "onorafter", "today"],
                        "AND",
                        ["custrecord_rebate_customer_rebate_parent.custrecord_rebate_customer_customer", "anyof", customerId],
                        "AND",
                        itemsFilter
                    ],
                columns:
                    [
                        search.createColumn({
                            name: "custrecord_rebate_items_item",
                            join: "CUSTRECORD_REBATE_ITEMS_PARENT",
                            label: "Item"
                        }),
                        search.createColumn({
                            name: "custrecord_rebate_item_defined_cost",
                            join: "CUSTRECORD_REBATE_ITEMS_PARENT",
                            label: "Item Defined Cost"
                        }),
                        search.createColumn({
                            name: "custrecord_rebate_items_rebate_cost",
                            join: "CUSTRECORD_REBATE_ITEMS_PARENT",
                            label: "Rebate Cost"
                        })
                    ]
            });
            customrecord_rebate_parentSearchObj.run().each(function (result) {
                var itemInternalId = result.getValue({ name: "custrecord_rebate_items_item", join: "CUSTRECORD_REBATE_ITEMS_PARENT" })
                var itemId = result.getText({ name: "custrecord_rebate_items_item", join: "CUSTRECORD_REBATE_ITEMS_PARENT" })
                var itemDefinedCost = result.getValue({ name: "custrecord_rebate_item_defined_cost", join: "CUSTRECORD_REBATE_ITEMS_PARENT" })
                var rebateCost = result.getValue({ name: "custrecord_rebate_items_rebate_cost", join: "CUSTRECORD_REBATE_ITEMS_PARENT" })
                var itemObj = {
                    itemId: itemId,
                    itemDefinedCost: Number(itemDefinedCost),
                    rebateCost: Number(rebateCost),
                    itemInternalId: itemInternalId
                }
                res.push(itemObj)
                return true;
            });
            return res;
        } catch (error) {
            log.error('Error in searchRebateCosts', error)
        }
    }

    return {
        onRequest: onRequest
    }
});
