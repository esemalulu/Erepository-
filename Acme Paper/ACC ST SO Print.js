/**
 * @NApiVersion 2.x
 * @NScriptType Suitelet
 * @NModuleScope SameAccount
 */

define(['N/record', 'N/xml', 'N/render', 'N/search', 'N/file', 'N/runtime'],
    function (record, xml, render, search, file, runtime) {
        function onRequest(context) {
            try {
                if (context.request.method != 'GET') return;

                var recordid = context.request.parameters.recordid;
                var recordtype = context.request.parameters.recordtype;
                var prefixUrl = runtime.envType == "PRODUCTION" ? "https://5774630.app.netsuite.com" : "https://5774630-sb1.app.netsuite.com";

                recordtype == "salesorder" ? salesOrderFunction(recordid, context) : invoiceOrderFunction(recordid, prefixUrl, context);
            }
            catch (e) {
                log.error('Error Occured ', e);
            }
        }

        function salesOrderFunction(recordid, context) {
            var renderer = render.create();
            renderer.addRecord('record', record.load({
                type: record.Type.SALES_ORDER,
                id: recordid
            }));
            renderer.setTemplateByScriptId("CUSTTMPL_137_5774630_668");// <-- Pdf template that hides the fuel chrage line
            context.response.writeFile(renderer.renderAsPdf(), true);
        }

        function invoiceOrderFunction(recordid, prefixUrl, context) {
            /*var renderer = render.create();
            renderer.addRecord('record', record.load({
                type: record.Type.INVOICE,
                id: recordid
            }));

            setBackorderLines(renderer, recordid);

            renderer.setTemplateByScriptId("CUSTTMPL_122_5774630_580");
            var pdfWithSdsSheeets = attachSDSSheets(recordid, renderer, prefixUrl);*/
            var transactionFile = render.transaction({
                entityId: Number(recordid),
                printMode: render.PrintMode.PDF,
                inCustLocale: true
            });
            context.response.writeFile(transactionFile, true);
        }

        function setBackorderLines(renderer, recordid) {
            if (!recordid) return;
            var hasBackOrder = getBackorderLines(recordid);
            log.debug("hasBackOrder", hasBackOrder);
            if (!hasBackOrder) return;
            //custbody_sdb_not_backordered_items
            var rs = search.create({
                type: "transaction",
                filters:
                    [
                        ["internalid", "anyof", hasBackOrder.createdfrom],
                        "AND",
                        ["item", "anyof", hasBackOrder.invoiceItems],
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
                        search.createColumn({name: "costestimate", label: "Est. Extended Cost (Line)"}),
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
            }).run();
            var results = rs.getRange(0, 1000);
            renderer.addSearchResults({
                templateName: 'backorderLines',
                searchResult: results
            });

        }

        function getBackorderLines(invoiceId) {
            var fieldLookUp = search.lookupFields({
                type: search.Type.INVOICE,
                id: invoiceId,
                columns: ["createdfrom", "custbody_sdb_not_backordered_items"]
            });
            var invoiceItems = [];
            fieldLookUp.custbody_sdb_not_backordered_items.forEach(function (item) {
                invoiceItems.push(item.value);
            });
            return fieldLookUp.createdfrom && invoiceItems.length ? { createdfrom: fieldLookUp.createdfrom[0].value, invoiceItems: invoiceItems } : false;
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

        function attachSDSSheets(recordid, renderer, prefixUrl) {
            var sdsSheets = getSdsSheets(recordid);
            if (sdsSheets) {
                var invoicePdf = renderer.renderAsPdf();
                invoicePdf.folder = 35005; //3179
                invoicePdf.isOnline = true;
                var invoiceId = invoicePdf.save();
                sdsSheets.unshift(
                    prefixUrl
                    + file.load({ id: invoiceId }).url
                );
                var finalPDF = pdfMerger(sdsSheets);
                file.delete({ id: invoiceId });
                return finalPDF;
            }
        }

        function getSdsSheets(invoiceId) {
            var invoiceSearchObj = search.create({
                type: "invoice",
                filters:
                    [
                        ["type", "anyof", "CustInvc"],
                        "AND",
                        ["internalid", "anyof", invoiceId]
                    ],
                columns:
                    [
                        search.createColumn({
                            name: "custitem_sds_fileid",
                            join: "item",
                            summary: "GROUP",
                            sort: search.Sort.ASC,
                            label: "SDS FILE ID"
                        })
                    ]
            });
            var urls = [];
            invoiceSearchObj.run().each(function (result) {
                var sheets = result.getValue({ name: 'custitem_sds_fileid', join: 'item', summary: search.Summary.GROUP });
                if (sheets == '- None -' || sheets == '' || sheets == null) return true;
                if (sheets.indexOf(',') !== -1) {
                    sheets = sheets.split(',');
                    for (var i = 0; i < sheets.length; i++) {
                        urls.push(sheets[i]);
                    }
                } else {
                    urls.push(sheets);
                }
                return true;
            });
            return urls;
        }

        return {
            onRequest: onRequest
        };
    });