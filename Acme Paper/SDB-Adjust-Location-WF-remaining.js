/**
 *@NApiVersion 2.1
 *@NScriptType WorkflowActionScript
 */
define(["N/search", "N/log", "N/record"], function (search, log, record)
{

    function onAction(context)
    {
        const RICHMOND = 103;
        const SAVAGE = 104;
        
        try
        {
            log.debug('STATUS', 'WORKFLOW RUNNING');

            var salesRecord = context.newRecord;
            if (!salesRecord) return;

            //It only runs if primaryt warehouse is Richmond
            var actualLocation = salesRecord.getValue("location");
            if (!actualLocation || (Number(actualLocation) != RICHMOND)) return;
            log.debug('actualLocation', actualLocation);

            if (context.type != "create" && context.type != "edit") return;
            
            var lineItemCount = salesRecord.getLineCount("item");
            log.debug('lineItemCount', lineItemCount);
            if (lineItemCount < 1) return;

            var itemsInfoLines = [];

            //We are going to iterate over sales items
            for (var i = 0; i < lineItemCount; i++)
            {
                log.debug('ITERATION: ', i);

                var obj = {};

                var qtyBackordered = salesRecord.getSublistValue({
                    sublistId: 'item',
                    fieldId: 'quantitybackordered',
                    line: i
                }) || 0;
                log.debug('qtyBackordered', qtyBackordered);
                if(Number(qtyBackordered) <= 0) continue;

                var itemLocation = salesRecord.getSublistValue({
                    sublistId: 'item',
                    fieldId: 'location',
                    line: i
                });
                log.debug('itemLocation', itemLocation);
                if(Number(itemLocation) != RICHMOND) continue;

                var itemId = salesRecord.getSublistValue({
                    sublistId: 'item',
                    fieldId: 'item',
                    line: i
                });
                if (!itemId) continue;

                var itemRate = salesRecord.getSublistValue({
                    sublistId: 'item',
                    fieldId: 'rate',
                    line: i
                });

                var quantityAvailable = salesRecord.getSublistValue({
                    sublistId: 'item',
                    fieldId: 'quantityavailable',
                    line: i
                }) || 0;
                if(Number(quantityAvailable) <= 0) continue;

                obj.qtyAvail = quantityAvailable;
                obj.qtyBackordered = qtyBackordered;
                obj.itemId = itemId;
                obj.line = i;
                obj.rate = itemRate

                itemsInfoLines.push(obj);
            }

            log.debug('itemsInfoLines', itemsInfoLines);
            //We will iterate over each backorder items in order to replicate this line and create a new one with location in Savage and qty from qty Backordered
            itemsInfoLines.forEach(function (item)
            {
                //Set qty for actual line to max qty available in Richmond
                salesRecord.selectLine({
                    sublistId: 'item',
                    line: item.line
                });

                //Set actual item qty
                salesRecord.setCurrentSublistValue({
                    sublistId: 'item',
                    fieldId: 'quantity',
                    value: item.qtyAvail,
                });

                salesRecord.commitLine("item");

                salesRecord.selectNewLine("item");

                //Set item id
                salesRecord.setCurrentSublistValue({
                    sublistId: 'item',
                    fieldId: 'item',
                    value: item.itemId,
                });

                //Set item qty
                salesRecord.setCurrentSublistValue({
                    sublistId: 'item',
                    fieldId: 'quantity',
                    value: item.qtyBackordered,
                });

                //Set item rate
                salesRecord.setCurrentSublistValue({
                    sublistId: 'item',
                    fieldId: 'rate',
                    value: item.rate,
                });

                //Set item location to Savage
                salesRecord.setCurrentSublistValue({
                    sublistId: 'item',
                    fieldId: 'location',
                    value: SAVAGE,
                });

                salesRecord.commitLine("item");
            });

        }
        catch (error)
        {
            log.error('error', error);
        }

    }

    function getLocationsAvailablePerItem(itemsArray)
    {
        var itemsInfo = {};

        var inventoryitemSearchObj = search.create({
            type: "item",
            filters:
                [
                    ["internalid", "anyof", itemsArray]
                ],
            columns:
                [
                    search.createColumn({ name: "locationquantityavailable", label: "Location Available" }),
                    search.createColumn({ name: "inventorylocation", label: "Inventory Location" }),
                    search.createColumn({
                        name: "internalid",
                        sort: search.Sort.ASC,
                        label: "Internal ID"
                    })
                ]
        });
        var searchResultCount = inventoryitemSearchObj.runPaged().count;
        log.debug('searchResultCount', searchResultCount);
        inventoryitemSearchObj.run().each(function (result)
        {
            if (!itemsInfo[result.id]) itemsInfo[result.id] = { locations: [] };

            var locationQtySearch = result.getValue("locationquantityavailable");
            if (locationQtySearch == "" || Number(locationQtySearch) <= 0) return true;

            var obj = {};
            obj.location = result.getValue("inventorylocation");
            obj.quantity = locationQtySearch;
            itemsInfo[result.id].locations.push(obj);


            return true;
        });

        return itemsInfo;

    }//End setLocationAvailable

    return {
        onAction: onAction
    }
});
