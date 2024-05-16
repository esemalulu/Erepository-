/**
 * @NApiVersion 2.1
 * @NScriptType UserEventScript
*/
define(['N/record', 'N/search'], function (record, search) {
    function beforeSubmit(context) {
        try {
            log.debug('context', context);
            var invoice = context.newRecord;
            log.debug('invoice', invoice);
            var salesOrderId = context.newRecord.getValue({ fieldId: 'createdfrom' });
            if (!salesOrderId) salesOrderId = context.newRecord.getValue({ fieldId: 'custbody_sdb_original_sales_order' });
            log.debug('sales order', salesOrderId);

            var itemsFromInvoice = getItemsFromInvoice(invoice);
            log.debug('items in invoice:', itemsFromInvoice);
            var itemsFromSO = getItemsFromSalesOrder(salesOrderId, itemsFromInvoice);
            log.debug('items in sales order:', itemsFromSO);

            //context.newRecord.setValue({
                //fieldId: 'custbody_sdb_not_backordered_items',
                //value: itemsFromSO,
            //});

          //  setItemsLine(itemsFromSO, record.load({ type: record.Type.SALES_ORDER, id: salesOrderId, }), context.newRecord);
        } catch (error) {
            log.debug('error finding backordered items', error);
        }
    }

    //-----------------Auxiliar functions-----------------//
    function getItemsFromSalesOrder(salesOrderId, itemsFromInvoice) {
        try {
            var salesOrderItems = [];
            var salesorderSearchObj = search.create({
                type: "salesorder",
                filters:
                    [
                        ["type", "anyof", "SalesOrd"],
                        "AND",
                        ["internalid", "anyof", salesOrderId],
                        "AND",
                        ["item", "noneof", itemsFromInvoice],
                        "AND",
                        ["formulanumeric: {quantity}-nvl({quantitycommitted},0)-nvl({quantityshiprecv},0)", "greaterthan", "0"],
                        "AND",
                        ["mainline", "is", "F"]
                    ],
                columns:
                    [
                        search.createColumn({ name: "item", label: "Item" }),
                    ]
            });
            var searchResultCount = salesorderSearchObj.runPaged().count;
            if (searchResultCount < 1) return salesOrderItems;

            salesorderSearchObj.run().each(function (result) {
                var itemId = result.getValue({ name: "item" });
                if (itemId < 0) return true;
                salesOrderItems.push(itemId);
                return true;
            });

            return salesOrderItems;
        } catch (error) {
            log.debug('Error getting sales order items', error);
        }
    }

    function getItemsFromInvoice(invoice) {
        try {
            var invoiceItems = [];

            // var invoiceSearchObj = search.create({
            //     type: "invoice",
            //     filters:
            //         [
            //             ["type", "anyof", "CustInvc"],
            //             "AND",
            //             ["internalid", "anyof", invoiceId],
            //             "AND",
            //             ["item", "noneof", "@NONE@"],
            //             "AND",
            //             ["mainline", "is", "F"]
            //         ],
            //     columns:
            //         [
            //             search.createColumn({ name: "item", label: "Item" })
            //         ]
            // });
            // var searchResultCount = invoiceSearchObj.runPaged().count;
            // if (searchResultCount < 1) return salesOrderItems;

            // invoiceSearchObj.run().each(function (result) {
            //     var itemId = result.getValue({ name: "item" });
            //     if (itemId < 0) return true;
            //     invoiceItems.push(itemId);
            //     return true;
            // });

            var lineItemCount = invoice.getLineCount({
                sublistId: 'item'
            });
            if (lineItemCount < 1) return salesOrderItems;

            for (var i = 0; i < lineItemCount; i++) {
                var itemId = invoice.getSublistValue({
                    sublistId: 'item',
                    fieldId: 'item',
                    line: i
                });
                if (itemId < 0) continue;
                invoiceItems.push(itemId);
            }
            return invoiceItems;
        } catch (error) {
            log.debug('Error getting invoice items', error);
        }
    }

    function setItemsLine(items, salesorder, invoice) {
        try {
            items.forEach(backorderedItem => {
                var line = salesorder.findSublistLineWithValue({
                    sublistId: 'item',
                    fieldId: 'item',
                    value: backorderedItem
                });
                if (line < 0) return;

                var item = salesorder.getSublistValue({
                    sublistId: 'item',
                    fieldId: 'item',
                    line: line
                });

                var lineCount = invoice.getLineCount({
                    sublistId: 'item'
                });
                invoice.setSublistValue({
                    sublistId: 'item',
                    fieldId: 'item',
                    line: lineCount,
                    value: item
                });

                var backordered = salesorder.getSublistValue({
                    sublistId: 'item',
                    fieldId: 'backordered',
                    line: line
                }) || 0;
                log.debug('backordered', backordered);
                invoice.setSublistValue({
                    sublistId: 'item',
                    fieldId: 'backordered',
                    line: lineCount,
                    value: backordered
                });

                var commited = salesorder.getSublistValue({
                    sublistId: 'item',
                    fieldId: 'quantitycommitted',
                    line: line
                }) || 0;
                log.debug('commited', commited);
                invoice.setSublistValue({
                    sublistId: 'item',
                    fieldId: 'quantityordered',
                    line: lineCount,
                    value: commited
                });

                var quantity = salesorder.getSublistValue({
                    sublistId: 'item',
                    fieldId: 'quantity',
                    line: line
                }) || 0;
                log.debug('quantity', quantity);
                invoice.setSublistValue({
                    sublistId: 'item',
                    fieldId: 'quantity',
                    line: lineCount,
                    value: quantity
                });
            });
        } catch (error) {
            log.debug('error setting item line', error);
        }
    }

    return {
        beforeSubmit: beforeSubmit,
    }
})