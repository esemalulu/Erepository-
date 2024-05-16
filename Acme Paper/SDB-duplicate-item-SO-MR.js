/**
 *@NApiVersion 2.1
 *@NScriptType MapReduceScript
 */
define(["N/log", "N/search", "N/file", "N/record"], function (log, search, file, record)
{

    var arrayItems = {};

    function getInputData()
    {
        try
        {
            var salesorderSearchObj = search.create({
                type: "salesorder",
                filters:
                    [
                        ["type", "anyof", "SalesOrd"],
                        "AND",
                        ["item", "noneof", "@NONE@"],
                        "AND",
                        ["item.type", "anyof", "InvtPart"]
                    ],
                columns:
                    [
                        search.createColumn({ name: "internalid", label: "Internal ID" }),
                        search.createColumn({
                            name: "internalid",
                            join: "item",
                            label: "Internal ID"
                        }),
                        search.createColumn({ name: "item", label: "Item" }),
                        search.createColumn({ name: "number", label: "Sales Order Name" }),
                        search.createColumn({name: "line", label: "Line ID"})
                    ]
            });

            return salesorderSearchObj;
        }
        catch (error)
        {
            log.error('error GET INPUT DATA', error);
        }

    }

    function map(context)
    {
        try
        {
            var values = JSON.parse(context.value);

            var salesId = values.id;
            var salesName = values.values.number;
            var itemId = values.values["internalid.item"].value;
            var itemName = values.values.item.text;
            var lineItem = Number(values.values.line) - 1;

            var salesRecord = record.load({
                type: 'salesorder',
                id: salesId,
            });

            var qtyBackordered = salesRecord.getSublistValue({
                sublistId: 'item',
                fieldId: 'quantitybackordered',
                line: lineItem
            });


            if (qtyBackordered == "") qtyBackordered = 0;

            if (Number(qtyBackordered) > 0)
            {
                //Create sales order index
                var arraySalesOrders = {};
                arraySalesOrders[String(salesId)] = { salesOrderId: salesId, salesName: salesName, itemName: itemName };

                context.write({ key: itemId, value: arraySalesOrders[String(salesId)] });
            }
        }
        catch (error)
        {
            log.error('error MAP', error);
        }

    }

    function reduce(context)
    {
        try
        {
            var array = [];
            var finalArray = [];
            var itemId = context.key;

            context.values.forEach(saleOrder =>
            {
                var saleOrder = JSON.parse(saleOrder);
                var obj = {};
                obj.salesOrderId = saleOrder.salesOrderId;
                obj.salesName = saleOrder.salesName;
                obj.itemName = saleOrder.itemName;
                obj.itemId = itemId;

                array.push(obj);
            });

            if (array.length > 1)
            {
                array.forEach(objSales =>
                {
                    var count = getOccurrence(array, objSales.salesOrderId);
                    if (count <= 1) return;

                    var finded = finalArray.find(x => x.salesOrderId == objSales.salesOrderId);

                    if (finded == -1 || finded == "" || finded == null || finded == undefined)
                    {
                        var obj = {};
                        obj.salesOrderId = objSales.salesOrderId;
                        obj.itemName = objSales.itemName;
                        obj.salesName = objSales.salesName;
                        obj.itemId = objSales.itemId;
                        obj.count = count;

                        finalArray.push(obj);
                    }
                });
            }

            context.write({ key: itemId, value: finalArray })
        }
        catch (error)
        {
            log.error('error REDUCE', error);
        }
    }

    function summarize(context)
    {
        try
        {
            var itemsInfoFinal = [];

            context.output.iterator().each(function (key, value)
            {
                var obj = {};
                obj.key = key;
                obj.values = JSON.parse(value);

                if (obj.values.length > 0)
                {
                    itemsInfoFinal.push(obj);
                }

                return true;
            });

            //Save items info into file cabinet
            var fileJson = file.create({
                name: 'duplicate_items_sales_order_backordered.json',
                fileType: file.Type.JSON,
                contents: JSON.stringify(itemsInfoFinal),
                folder: 25605
            });

            fileJson.save();

            log.debug('itemsInfoFinal', itemsInfoFinal);

            log.debug('STATUS', 'FINISHED SUMMARIZE');
        }
        catch (error)
        {
            log.error('error SUMMARIZE', error);
        }
    }

    return {
        getInputData: getInputData,
        map: map,
        reduce: reduce,
        summarize: summarize
    }

    function setArrayItems(arrayItems, salesId, idItem, qtyBackordered)
    {
        //If item position does not exists then we are going to create item index
        if (!arrayItems[String(idItem)])
        {
            var arraySalesOrders = {};

            arraySalesOrders[String(salesId)] = { salesOrderId: salesId, itemName: idItem, backorder: qtyBackordered, count: 1 };

            arrayItems[String(idItem)] = {};
            arrayItems[String(idItem)].salesOrders = [];
            arrayItems[String(idItem)].salesOrders.push(arraySalesOrders[String(salesId)]);
        }
        else
        {
            //Check if sales order index does not exist inside item index
            if (!arrayItems[String(idItem)].salesOrders[String(salesId)])
            {
                //Create sales order index
                var arraySalesOrders = {};
                arraySalesOrders[String(salesId)] = { salesOrderId: salesId, itemName: idItem, count: 1 };
                arrayItems[String(idItem)].salesOrders.push(arraySalesOrders[String(salesId)]);
            }
            //If item exist and salesorder exist so that means that item is again in the same order so we are going to increase count
            else
            {
                arrayItems[String(idItem)].salesOrders[String(salesId)].count++;
            }
        }

    }//End function

    function getOccurrence(array, value)
    {
        const count = array.reduce((acc, cur) => String(cur.salesOrderId) == String(value) ? ++acc : acc, 0);
        return count;
    }

});
