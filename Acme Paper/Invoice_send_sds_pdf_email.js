/**
 *@NApiVersion 2.1
 *@NScriptType UserEventScript
 */
define(['N/search', 'N/record', 'N/file', 'N/email', 'N/https', 'N/xml', 'N/render', 'N/runtime'], function (search, record, file, email, https, xml, render, runtime) {
    function afterSubmit(context) {
        try {
            log.debug("Context: ", { currentContext: runtime.executionContext, mapReduceContext: runtime.ContextType.MAP_REDUCE, invoiceId: context.newRecord.id });
            if (context.type != context.UserEventType.CREATE) return;
            var urlsOfPdfs = [];
            var NewCustomerInvoice = context.newRecord;
            NewCustomerInvoice = record.load({
                type: record.Type.INVOICE,
                id: NewCustomerInvoice.id,
            });
            let customer = NewCustomerInvoice.getValue('entity');
            let Inv = NewCustomerInvoice.getValue('tranid');
            var recCount = NewCustomerInvoice.getLineCount('item');
            var customerRecord = record.load({
                type: record.Type.CUSTOMER,
                id: customer,
            });
            var itemsPurchased = customerRecord.getValue({ fieldId: 'custentity_sdb_items_purchased' });
            if (itemsPurchased && itemsPurchased.indexOf('\u0005') != -1) itemsPurchased.split('\u0005') //add 9/4/24

            for (var x = 0; x < recCount; x++) {
                var item = NewCustomerInvoice.getSublistValue({
                    sublistId: 'item',
                    fieldId: 'item',
                    line: x
                });

                itemsPurchased.push(item);
                continue; // We dont need to add the sds sheets to send email (ABEL) 05/04/2024

                var fieldLookUp = searchLink(item);
                if (fieldLookUp) {
                    https.get({
                        url: fieldLookUp
                    });
                    urlsOfPdfs.push(fieldLookUp);
                }
            }
            try {
                customerRecord.setValue({
                    fieldId: 'custentity_sdb_items_purchased',
                    value: itemsPurchased,
                });
                customerRecord.save({
                    ignoreMandatoryFields: true
                })
            } catch (error) {
                log.error("ERROR SAVING CUSTOMER: ", error);
            }


            var renderer = render.create();
            renderer.setTemplateById(122);
            renderer.addRecord({
                templateName: 'record',
                record: NewCustomerInvoice
            });
            var invoicePdf = renderer.renderAsPdf();
            invoicePdf.folder = 35005;
            invoicePdf.isOnline = true;

            invoicePdf.name = Inv + '_invoice.pdf';
            invoicePdf.type = file.Type.PDF;

            // var invoiceId = invoicePdf.save();
            // urlsOfPdfs.unshift('https://5774630.app.netsuite.com' + file.load({ id: invoiceId }).url);

            // var finalPDF = pdfMerger(urlsOfPdfs);
            // if (!finalPDF) return;
            // finalPDF.name = Inv + '_invoice.pdf';
            // finalPDF.folder = 35005;
            // finalPDF.type = file.Type.PDF;

            // finalPDF.save();

            var emails = getEmailsFromRelationships(customer);
            if (emails != [] && emails.length) {
                log.audit('Send Email: ', { emails, fileName: invoicePdf.name });
                email.send({
                    author: 96988, //"noreply@acme.com"
                    recipients: emails, //84733
                    subject: "Invoice Number: " + Inv,
                    body: 'Attached is: ' + invoicePdf.name,
                    attachments: [invoicePdf]
                });
            } else {
                log.audit('No Contacts Email: ', { emails, fileName: invoicePdf.name });
            }

            // file.delete({ id: invoiceId });
        } catch (error) {
            log.error('error afterSubmit', error);
        }
    }

    function getEmailsFromRelationships(customerId) {
        try {
            var emails = [];

            var customerSearchObj = search.create({
                type: 'customer',
                filters:
                    [
                        ['stage', 'anyof', 'CUSTOMER'],
                        'AND',
                        ['internalid', 'anyof', customerId]
                    ],
                columns:
                    [
                        search.createColumn({
                            name: 'custentity_sdb_type_of_email',
                            join: 'contact',
                            label: 'Type Of Email To Send'
                        }),
                        search.createColumn({
                            name: 'email',
                            join: 'contact',
                            label: 'Email'
                        })
                    ]
            });
            customerSearchObj.run().each(function (result) {
                if (result.getText({ name: 'custentity_sdb_type_of_email', join: 'contact' }).includes('Invoices')) {
                    emails.push(result.getValue({ name: 'email', join: 'contact' }));
                }
                return true;
            });

            return emails;
        } catch (error) {
            log.error('error at contacts relationships', error);
        }
    }

    function pdfMerger(pdfArray) {
        var tpl = ['<?xml version="1.0"?>', '<pdfset>'];

        pdfArray.forEach(function (url) {
            var pdfFileURL = xml.escape({ xmlText: url });
            tpl.push("<pdf src='" + pdfFileURL + "'/>");
        });

        tpl.push('</pdfset>');
        return render.xmlToPdf({
            xmlString: tpl.join('\n')
        });
    }

    function searchLink(itemId) {
        try {
            var res = ''
            var itemSearchObj = search.create({
                type: 'item',
                filters:
                    [
                        ['internalid', 'anyof', itemId]
                    ],
                columns:
                    [
                        search.createColumn({
                            name: 'custrecord_extfile_link',
                            join: 'CUSTRECORD_EXTFILE_INVENTORY_ITEM_PREF',
                            label: 'eXtendFiles - URL'
                        })
                    ]
            });
            itemSearchObj.run().each(function (result) {
                possiblePDF = result.getValue({ name: 'custrecord_extfile_link', join: 'CUSTRECORD_EXTFILE_INVENTORY_ITEM_PREF' })
                if (possiblePDF.toString().slice(-3) == 'pdf') {
                    res = possiblePDF
                }
                return true
            });
            return res;
        } catch (e) {
            log.error('error at searchLink', e)
        }
    }

    function beforeSubmit(context) {
        try {
            var invoice = context.newRecord;
            var salesOrderId = context.newRecord.getValue("createdfrom");

            if (!salesOrderId) salesOrderId = context.newRecord.getValue("custbody_sdb_original_sales_order");
            var itemsFromInvoice = getItemsFromInvoice(invoice);

            if (salesOrderId) {
                var itemsFromSO = getItemsFromSalesOrder(salesOrderId, itemsFromInvoice);
                var lineData = [];
                search.create({
                    type: "transaction",
                    filters:
                        [
                            ["internalid", "anyof", salesOrderId],
                            "AND",
                            ["item", "anyof", itemsFromSO],
                            "AND",
                            ["cogs", "is", "F"],
                            "AND",
                            ["taxline", "is", "F"]
                        ],
                    columns:
                        [
                            search.createColumn({ name: "item", label: "Item" }),
                            search.createColumn({ name: "quantity", label: "Quantity" }),
                            search.createColumn({ name: "amount", label: "Amount" }),
                            search.createColumn({ name: "rate", label: "Item Rate" }),
                            search.createColumn({ name: "unitabbreviation", label: "Units" }),
                            search.createColumn({ name: "custcol_aps_qty_shipped", label: "Quantity Shipped" }),
                            search.createColumn({ name: "costestimate", label: "Est. Extended Cost (Line)" }),
                            search.createColumn({ name: "custcol_sps_bpn", label: "SAP"}),
                            search.createColumn({
                                name: "quantityavailable",
                                join: "item",
                                label: "Available"
                            }),
                            search.createColumn({
                                name: "custitem_acc_dot_harzardous",
                                join: "item",
                                label: "DOT Hazardous"
                            }),
                            search.createColumn({
                                name: "displayname",
                                join: "item",
                                label: "displayname"
                            }),
                            search.createColumn({
                                name: "itemid",
                                join: "item",
                                label: "itemid"
                            })
                        ]
                }).run().each(res => {
                    lineData.push({
                        item: res.getValue("item"),
                        quantity: res.getValue("quantity"),
                        amount: res.getValue("amount"),
                        rate: Number(res.getValue("rate") || 0),
                        unitabbreviation: res.getValue("unitabbreviation"),
                        custcol_aps_qty_shipped: res.getValue("custcol_aps_qty_shipped"),
                        costestimate: res.getValue("costestimate"),
                        sap: res.getValue("custcol_sps_bpn"),
                        quantityavailable: res.getValue({
                            fieldId: "quantityavailable",
                            name: "quantityavailable",
                            join: "item"
                        }),
                        custitem_acc_dot_harzardous: res.getValue({
                            fieldId: "custitem_acc_dot_harzardous",
                            name: "custitem_acc_dot_harzardous",
                            join: "item"
                        }),
                        displayname: res.getValue({
                            fieldId: "displayname",
                            name: "displayname",
                            join: "item"
                        }),
                        itemid: res.getValue({
                            fieldId: "itemid",
                            name: "itemid",
                            join: "item"
                        }),
                    })
                    return true;
                });

                context.newRecord.setValue({
                    fieldId: 'custbody_sdb_backordered_lines',
                    value: '"' + JSON.stringify({ lines: lineData }) + '"'
                });
            }

            // added 15/01/2024 item hazardous description
            if (context.type != context.UserEventType.CREATE) return;
            setDescriptionCustom(invoice, true);

        } catch (error) {
            log.debug('error finding backordered items', error);
        }
    }


    function setDescriptionCustom(invoiceRecord, isBeforeSubmit) {
        var hasChanges = false;
        var lineItemCount = invoiceRecord.getLineCount("item");
        if (lineItemCount < 1) return;

        for (var i = 0; i < lineItemCount; i++) {
            var itemId = invoiceRecord.getSublistValue({
                sublistId: 'item',
                fieldId: 'item',
                line: i
            });

            if (!itemId) continue;

            var itemField = search.lookupFields({
                type: search.Type.ITEM,
                id: itemId,
                columns: ['custitem_haz_id_number', 'custitem_sds_ship_name_1', 'custitem_packing_group', 'custitem_acc_dot_harzardous', 'custitem_hazard_class']
            });

            //set field of hazard items for invoice print change made 4/1/2024
            var hasHarzardous = itemField.custitem_acc_dot_harzardous
            var desc = hasHarzardous ? itemField.custitem_hazard_class + ', ' + itemField.custitem_haz_id_number + ', ' + itemField.custitem_sds_ship_name_1 + ', ' + itemField.custitem_packing_group : "";

            var currentDescription = invoiceRecord.getSublistValue({
                sublistId: 'item',
                fieldId: 'custcol_sdb_haz_description',
                line: i
            });
            // log.debug("Data: ", { itemId, hasHarzardous, desc, currentDescription });

            if (currentDescription == desc) continue;

            if (isBeforeSubmit) {
                invoiceRecord.setSublistValue({
                    sublistId: 'item',
                    fieldId: 'custcol_sdb_haz_description',
                    value: desc,
                    line: i,
                });
            } else {
                invoiceRecord.selectLine({ sublistId: 'item', line: i });

                invoiceRecord.setCurrentSublistValue({
                    sublistId: 'item',
                    fieldId: 'custcol_sdb_haz_description',
                    value: desc,
                    ignoreFieldChange: true
                });
                invoiceRecord.commitLine("item");
            }

            hasChanges = true;
        }
        return hasChanges;
    }

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
            log.error('Error getting sales order items', error);
        }
    }

    function getItemsFromInvoice(invoice) {
        try {
            var invoiceItems = [];
            var lineItemCount = invoice.getLineCount({
                sublistId: 'item'
            });
            if (lineItemCount < 1) return invoiceItems;

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

    return {
        afterSubmit: afterSubmit,
        beforeSubmit: beforeSubmit
    };
});