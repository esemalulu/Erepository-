/**
 *@NApiVersion 2.1
 *@NScriptType UserEventScript
 */
define(['N/query', 'N/search', "N/cache", "N/record", "N/format"], function (query, search, cache, record, format)
{
    function beforeSubmit(context)
    {
        try
        {
            const invAdjustmentRecord = context.newRecord;
           log.debug('invAdjustmentRecord.type ', invAdjustmentRecord.type);
            if (!invAdjustmentRecord) { setItemsCache(null); return; }

            const itemLines = invAdjustmentRecord.getLineCount("inventory");
            if (itemLines < 1) { setItemsCache(null); return; }

            const itemsInvAdjustment = getAllItemsFromList(invAdjustmentRecord, itemLines, "inventory");
            if (itemsInvAdjustment.length < 1) { setItemsCache(null); return; }

            const itemsBackordered = getItemsBackordered(itemsInvAdjustment);
            if (!itemsBackordered || itemsBackordered?.items?.length < 1) { setItemsCache(null); return; }

            const grupedItems = getDataGrupedItems(itemsBackordered?.items);
            if (Object.entries(grupedItems).length < 1) { setItemsCache(null); return; }

            setItemsCache(grupedItems);
        }
        catch (error)
        {
            log.error("Error before submit", error);
        }

    }

    function afterSubmit(context)
    {
        try
        {
            // Get items that we bring in before submit
            const itemsOrderCache = cache.getCache({
                name: 'itemsOrder',
                scope: cache.Scope.PUBLIC
            });

            const itemsBeforeSubmit = itemsOrderCache.get({
                key: 'itemsBefore',
                ttl: 18000
            });

            if (!itemsBeforeSubmit || itemsBeforeSubmit == 'error') return;

            // Get items after submit
            const invAdjustmentRecord = context.newRecord;
            if (!invAdjustmentRecord) return;

            const itemLines = invAdjustmentRecord.getLineCount("inventory");
            if (itemLines < 1) return;

            const itemsInvAdjustment = getAllItemsFromList(invAdjustmentRecord, itemLines, "inventory");
            if (itemsInvAdjustment.length < 1) return;

            const itemsNoBackorder = getItemsNoLongerBackordered(itemsInvAdjustment);
            if (!itemsNoBackorder || itemsNoBackorder?.items?.length < 1) return;

            const grupedItems = getDataGrupedItems(itemsNoBackorder?.items);
            if (Object.entries(grupedItems).length < 1) return;

            const itemsToCreate = getFinalItemsWithStock(JSON.parse(itemsBeforeSubmit), grupedItems);
            if (!itemsToCreate || itemsToCreate.length < 1) return;

            log.debug("itemsBefore", itemsBeforeSubmit);
            log.debug("itemsAfter", grupedItems);

            createHistoryRecords(itemsToCreate);
        }
        catch (error)
        {
            log.error("Error after submit", error);
        }
    }

    // ----------------------------- AUXILIAR FUNCTIONS --------------------------------------

    function setItemsCache(grupedItems)
    {
        // Create cache
        var itemsOrderCache = cache.getCache({
            name: 'itemsOrder',
            scope: cache.Scope.PUBLIC
        });

        if (grupedItems)
        {
            itemsOrderCache.put({
                key: 'itemsBefore',
                value: JSON.stringify(grupedItems),
                ttl: 300
            });
        }
        else
        {
            itemsOrderCache.put({
                key: 'itemsBefore',
                value: 'error',
                ttl: 300
            });
        }
    }

    function getItemsBackordered(items)
    {
        var resultItems = { date: new Date(), items: [] };

        var salesorderSearchObj = search.create({
            type: "salesorder",
            filters:
                [
                    ["type", "anyof", "SalesOrd"],
                    "AND",
                    ["item", "anyof", items],
                    "AND",
                    ["item.quantitybackordered", "greaterthan", "0"]
                ],
            columns:
                [
                    search.createColumn({ name: "salesorder", label: "Sales Order" }),
                    search.createColumn({
                        name: "quantitybackordered",
                        join: "item",
                        label: "Back Ordered"
                    }),
                    search.createColumn({ name: "item", label: "Item" }),
                    search.createColumn({ name: "internalid", label: "Internal ID" }),
                    search.createColumn({ name: "line", label: "Line ID" }),
                    search.createColumn({ name: "quantity", label: "Quantity" }),
                    search.createColumn({
                        name: "quantityavailable",
                        join: "item",
                        label: "Available"
                    }),
                    search.createColumn({ name: "quantitycommitted", label: "Quantity Committed" }),
                    search.createColumn({ name: "shipdate", label: "Ship Date" })
                ]
        });
        var searchResultCount = salesorderSearchObj.runPaged().count;
        log.debug("salesorderSearchObj result count", searchResultCount);
        salesorderSearchObj.run().each(function (result)
        {
            resultItems.items.push(JSON.parse(JSON.stringify(result)));

            return true;
        });

        return resultItems;
    }

    function getItemsNoLongerBackordered(items)
    {
        var resultItems = { date: new Date(), items: [] };

        var salesorderSearchObj = search.create({
            type: "salesorder",
            filters:
                [
                    ["type", "anyof", "SalesOrd"],
                    "AND",
                    ["item", "anyof", items],
                    "AND",
                    ["item.quantitybackordered", "isempty", ""]
                ],
            columns:
                [
                    search.createColumn({ name: "salesorder", label: "Sales Order" }),
                    search.createColumn({
                        name: "quantitybackordered",
                        join: "item",
                        label: "Back Ordered"
                    }),
                    search.createColumn({ name: "item", label: "Item" }),
                    search.createColumn({ name: "internalid", label: "Internal ID" }),
                    search.createColumn({ name: "line", label: "Line ID" }),
                    search.createColumn({ name: "quantity", label: "Quantity" }),
                    search.createColumn({
                        name: "quantityavailable",
                        join: "item",
                        label: "Available"
                    }),
                    search.createColumn({ name: "quantitycommitted", label: "Quantity Committed" }),
                    search.createColumn({ name: "shipdate", label: "Ship Date" })
                ]
        });
        var searchResultCount = salesorderSearchObj.runPaged().count;
        log.debug("salesorderSearchObj result count", searchResultCount);
        salesorderSearchObj.run().each(function (result)
        {
            resultItems.items.push(JSON.parse(JSON.stringify(result)));

            return true;
        });

        return resultItems;
    }

    function getAllItemsFromList(invAdjRecord, lineCount, sublistName)
    {
        var resultItems = [];

        for (var i = 0; i < lineCount; i++)
        {
            var itemId = invAdjRecord.getSublistValue({
                sublistId: sublistName,
                fieldId: "item",
                line: i
            });

            if (!itemId) continue;

            resultItems.push(itemId);
        }

        return resultItems;
    }

    function getDataGrupedItems(data)
    {
        let groups = {};
        data.forEach(element =>
        {
            let SO = element.values.internalid[0]?.value;
            let item = element.values.item[0]?.value;
            let lineNumber = element.values.line;

            if (!groups[SO])
            {
                groups[SO] = {}
            }
            if (!groups[SO][item])
            {
                groups[SO][item] = {}
            }
            if (!groups[SO][item][lineNumber])
            {
                groups[SO][item][lineNumber] = {}
            }

            groups[SO][item][lineNumber] = element.values;
        })
        return groups;
    }

    // 
    function getFinalItemsWithStock(beforeObj, afterObj)
    {
        var resultItems = [];

        Object.keys(afterObj).forEach(function (order)
        {
            if (!beforeObj.hasOwnProperty(order)) return;

            Object.keys(afterObj[order]).forEach(function (item)
            {
                if (!beforeObj[order].hasOwnProperty(item)) return;

                Object.keys(afterObj[order][item]).forEach(function (line)
                {
                    if (!beforeObj[order][item].hasOwnProperty(line)) return;

                    var backorderQty = beforeObj[order][item][line]['item.quantitybackordered'];

                    resultItems.push({
                        itemLine: line,
                        backorderQty: backorderQty,
                        quantity: afterObj[order][item][line]?.quantity || "",
                        quantityCommited: afterObj[order][item][line]?.quantitycommitted || "",
                        shipDate: afterObj[order][item][line]?.shipdate || "",
                        quantityAvailable: afterObj[order][item][line]['item.quantityavailable'],
                        item: item,
                        salesOrderId: order,
                    });

                });

            });

        });

        return resultItems;
    }

    function createHistoryRecords(items)
    {
        log.debug('items', items);
        log.debug('itemsToCreateLength', items?.length);

        if (!items || items.length < 1) return;

        items.forEach(function (item)
        {
            // Create custom record
            var historyRecord = record.create({
                type: 'customrecord_sdb_backorder_items_sales'
            });
            if (!historyRecord) return;

            var orderDetails = search.lookupFields({
                type: search.Type.SALES_ORDER,
                id: item.salesOrderId,
                columns: ["entity", "shipdate"]
            });

            var customer = orderDetails?.entity[0]?.value || "";
            var shipDate = orderDetails?.shipdate || "";

            historyRecord.setValue({ fieldId: 'custrecord_sdb_sales_order_history', value: item.salesOrderId });
            historyRecord.setValue({ fieldId: 'custrecord_sdb_customer_history', value: customer });
            historyRecord.setValue({ fieldId: 'custrecord_sdb_item_history', value: item.item });
            historyRecord.setValue({ fieldId: 'custrecord_sdb_previous_backorder', value: Number(item.backorderQty) });
            historyRecord.setValue({ fieldId: 'custrecord_sdb_itemline_history', value: Number(item.itemLine) });
            historyRecord.setValue({ fieldId: 'custrecord_sdb_date_history', value: new Date() });
            historyRecord.setValue({ fieldId: 'custrecord_sdb_quantity_history', value: item.quantity });
            historyRecord.setValue({ fieldId: 'custrecord_sdb_quantity_commit_history', value: item.quantityCommited || 0 });
            historyRecord.setValue({ fieldId: 'custrecord_sdb_quantity_avail_history', value: item.quantityAvailable || 0 });
            historyRecord.setValue({ fieldId: 'custrecord_sdb_ship_date_history', value: new Date(shipDate) });


            historyRecord.save();
        });
    }

    return {
        beforeSubmit: beforeSubmit,
        afterSubmit: afterSubmit
    }
});