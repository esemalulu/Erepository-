/**
 * @NApiVersion 2.1
 * @NScriptType MapReduceScript
 */
define(["N/log", "N/record", "N/search", "N/runtime", 'N/encode', 'N/file'], function (log, record, search, runtime, encode, file) {

    function getInputData(context) {
        try {
            createCsvFile();
            var invoiceSearchObj = search.create({
                type: "transaction",
                filters:
                    [
                        //    ["type","anyof","CustInvc"], 
                        ["type", "anyof", "CustCred", "CustInvc"],
                        "AND",
                        ["customermain.custentity_sps_enable_invoice_workflow", "is", "T"],
                        "AND",
                        ["source", "noneof", "CSV"],
                        "AND",
                        ["trandate", "onorafter", "03/01/2024"],
                        "AND",
                        ["mainline", "is", "F"],
                        "AND",
                        ["cogs", "is", "F"],
                        "AND",
                        ["taxline", "is", "F"],
                        "AND",
                        ["datecreated", "on", "yesterday"],
                        "AND",
                        ["shipping", "is", "F"],
                    ],
                columns:
                    [
                        search.createColumn({ name: "internalid", label: "Internal ID", summary: 'GROUP' }),
                    ]
            });
            var resultsReturn = [];
            var pagedData = invoiceSearchObj.runPaged({ pageSize: 100 });
            var pagesCount = pagedData.pageRanges.length;
            var start = 0;
            var end = 100;
            for (let i = 0; i < pagesCount; i++) {
                var resultSet = invoiceSearchObj.run();
                var results = resultSet.getRange({ start: start, end: end });
                var orderIds = [];
                results.forEach(element => { orderIds.push(element.getValue({ name: 'internalid', summary: 'GROUP' })) });
                resultsReturn[i] = orderIds;
                start = end;
                end = end + 100;
            }
            return resultsReturn;
        } catch (error) {
            log.error('getInputData ERRRO', error);
        }
    }


    function map(context) {
        try {
            var recordValue = JSON.parse(context.value);
            var orderIds = recordValue;
            var ordersData = [];
            var itemsWithCodes = getItemsUPCandSAPCodes(orderIds)
            orderIds.forEach(element => { ordersData.push({ orderId: element, orderDistributorId: null, orderNetworkShipTo: null, orderAccountLocation: null, orderInvoiceNumber: null, orderPoNumber: null, orderDateCreated: null, orderIntegrationStatus: null, orderItemsList: [] }) });

            var invoiceSearchObj = search.create({
                type: "transaction",
                filters:
                    [
                        ["type", "anyof", "CustCred", "CustInvc"],
                        "AND",
                        ["internalid", "anyof", orderIds],
                        //    ['internalid','anyof','2099341'],
                        "AND",
                        ["customermain.custentity_sps_enable_invoice_workflow", "is", "T"],
                        "AND",
                        ["source", "noneof", "CSV"],
                        "AND",
                        ["trandate", "onorafter", "03/01/2024"],
                        "AND",
                        ["mainline", "is", "F"],
                        "AND",
                        ["cogs", "is", "F"],
                        "AND",
                        ["taxline", "is", "F"],
                        "AND",
                        ["datecreated", "on", "yesterday"],
                        "AND",
                        ["shipping", "is", "F"],
                    ],
                columns:
                    [
                        search.createColumn({ name: "internalid", label: "Internal ID" }),
                        search.createColumn({ name: "custbody_sps_vendor", label: "Distributor ID" }),
                        search.createColumn({ name: "custbody_sps_st_addresslocationnumber", label: "Network Ship To#" }),
                        search.createColumn({ name: "formulatext", formula: "{entity}", label: "Account Location" }),
                        search.createColumn({ name: "formulatext_2", formula: "{tranid}", label: "Invoice #" }),
                        search.createColumn({ name: "otherrefnum", label: "PO#" }),
                        search.createColumn({ name: "datecreated", label: "Date Created" }),
                        search.createColumn({ name: "internalid", join: "item", label: "Item ID" }),
                        search.createColumn({ name: "item", label: "Item" }),
                        search.createColumn({ name: "salesdescription", join: "item", label: "Description" }),
                        search.createColumn({ name: "custcol_sdb_pref_vendor_name", label: "Manufacturer name" }),
                        search.createColumn({ name: "quantity", label: "Quantity" }),
                        search.createColumn({ name: "unit", label: "Unit of Measure" }),
                        search.createColumn({ name: "amount", label: "Gross Sales" }),
                        search.createColumn({ name: "custcol_ava_taxamount", label: "Tax Amount" }),
                        search.createColumn({ name: "custbodyintegrationstatus", label: "Edi Status(Acme)" })
                    ]
            });

            var searchResultCount = invoiceSearchObj.runPaged().count;
            for (let i = 0; i < searchResultCount; i = i + 1000) {
                var resultSet = invoiceSearchObj.run();
                var start = i;
                var end = start + 1000;
                var results = resultSet.getRange({ start: start, end: end });

                results.forEach(result => {
                    var orderObj = ordersData.find(order => order.orderId == result.id);
                    if (!orderObj.orderDistributorId) orderObj.orderDistributorId = result.getValue({ name: 'custbody_sps_vendor' });
                    if (!orderObj.orderNetworkShipTo) orderObj.orderNetworkShipTo = result.getValue({ name: 'custbody_sps_st_addresslocationnumber' });
                    if (!orderObj.orderAccountLocation) orderObj.orderAccountLocation = result.getValue({ name: 'formulatext', formula: "{entity}", label: "Account Location" });
                    if (!orderObj.orderInvoiceNumber) orderObj.orderInvoiceNumber = result.getValue({ name: 'formulatext_2', formula: "{tranid}", label: "Invoice #" });
                    if (!orderObj.orderPoNumber) orderObj.orderPoNumber = result.getValue({ name: 'otherrefnum' })
                    if (!orderObj.orderDateCreated) orderObj.orderDateCreated = result.getValue({ name: 'datecreated' });
                    if (!orderObj.orderIntegrationStatus) orderObj.orderIntegrationStatus = result.getValue({ name: 'custbodyintegrationstatus' });
                    var itemId = result.getValue({ name: 'item' });
                    var itemText = result.getText({ name: 'item' });
                    var itemDescription = result.getValue({ name: 'salesdescription', join: 'item' });
                    var itemManufacterName = result.getValue({ name: 'custcol_sdb_pref_vendor_name' });
                    var itemQuantity = result.getValue({ name: 'quantity' });
                    var itemUnit = result.getValue({ name: 'unit' });
                    var itemAmount = result.getValue({ name: 'amount' });
                    var itemTaxAmount = result.getValue({ name: 'custcol_ava_taxamount' });
                    var itemUPC = null;
                    var itemSAP = null;
                    var itemWithCode = itemsWithCodes.find(item => item.itemId == itemId);
                    if (itemWithCode) {
                        itemUPC = itemWithCode.itemUpcCode;
                        itemSAP = itemWithCode.itemSapCode;
                    }
                    orderObj.orderItemsList.push({ itemId: itemId, itemText: itemText, itemDescription: itemDescription, itemManufacterName: itemManufacterName, itemQuantity: itemQuantity, itemUnit: itemUnit, itemAmount: itemAmount, itemTaxAmount: itemTaxAmount, itemUPC: itemUPC, itemSAP: itemSAP });
                    return true;
                });
            }
            context.write({
                key: context.key,
                value: ordersData
            });
        } catch (error) {
            log.debug('map', error);
        }

    }
    function reduce(context) {
        try {
            var values = context.values;
            var ordersValues = JSON.parse(values);
            var ordersLinesToCSV = [];
            ordersValues.forEach(orderValues => {
                var orderItemLines = orderValues.orderItemsList;
                orderItemLines.forEach(itemLine => {
                    var itemDescription = itemLine.itemDescription ? itemLine.itemDescription?.replace(/[,$]/g, '') : '';
                    var itemManufacterName = itemLine.itemManufacterName ? itemLine.itemManufacterName?.replace(/[,$]/g, '') : '';
                    var orderAccountLocation = orderValues.orderAccountLocation ? orderValues.orderAccountLocation?.replace(/[,$]/g, '') : '';
                    var orderItemText = itemLine.itemText ? itemLine.itemText?.replace(/[,$]/g, '')  : '';
                    var orderPoNumber = orderValues.orderPoNumber ? orderValues.orderPoNumber?.replace(/[,$]/g, '')  : '';
                    var orderValuesObj = {
                        orderId: orderValues.orderId,
                        orderDistributorId: orderValues.orderDistributorId,
                        orderNetworkShipTo: orderValues.orderNetworkShipTo,
                        orderAccountLocation: orderAccountLocation,
                        orderInvoiceNumber: orderValues.orderInvoiceNumber,
                        orderPoNumber: orderPoNumber,
                        orderDateCreated: orderValues.orderDateCreated,
                        orderIntegrationStatus: orderValues.orderIntegrationStatus,
                        orderItemId: itemLine.itemId,
                        orderItemText: orderItemText,
                        orderItemDescription: itemDescription,
                        orderItemManufacterName: itemManufacterName,
                        orderItemQuantity: itemLine.itemQuantity,
                        orderItemUnit: itemLine.itemUnit,
                        orderItemAmount: itemLine.itemAmount,
                        orderItemTaxAmount: itemLine.itemTaxAmount,
                        orderItemUPC: itemLine.itemUPC,
                        orderItemSAP: itemLine.itemSAP
                    }
                    ordersLinesToCSV.push(orderValuesObj);
                });
            });
            // log.debug('ordersLinesToCSV',ordersLinesToCSV)
            var csvFile = searchFileByName();
            createCsvString(csvFile, ordersLinesToCSV)
        } catch (e) {
            log.error('Reduce Error', e)
        }
    }

    function getItemsUPCandSAPCodes(orderIds) {
        try {
            var itemIds = getInternalIdOfItemsOnInvoices(orderIds);
            var itemsResults = [];
            var itemSearchObj = search.create({
                type: "item",
                filters:
                    [
                        ["internalid", "anyof", itemIds]
                    ],
                columns:
                    [
                        search.createColumn({ name: "internalid", label: "Internal ID" }),
                        search.createColumn({ name: "custrecord_sdb_acme_upc", join: "CUSTRECORD_SDB_ACME_ITEM", label: "UPC Code" }),
                        search.createColumn({ name: "custrecord_sdb_acme_sap", join: "CUSTRECORD_SDB_ACME_ITEM", label: "SAP Code" })
                    ]
            });
            itemSearchObj.run().each(function (result) {
                var itemId = result.getValue({ name: 'internalid' });
                var itemUpcCode = result.getValue({ name: 'custrecord_sdb_acme_upc', join: 'CUSTRECORD_SDB_ACME_ITEM' });
                var itemSapCode = result.getValue({ name: 'custrecord_sdb_acme_sap', join: 'CUSTRECORD_SDB_ACME_ITEM' });
                itemsResults.push({ itemId: itemId, itemUpcCode: itemUpcCode, itemSapCode: itemSapCode })
                return true;
            });
            return itemsResults;
        } catch (error) {
            log.error('getItemsUPCandSAPCodes error', error);
        }
    }
    function getInternalIdOfItemsOnInvoices(orderIds) {
        try {
            var itemsIds = [];
            var invoiceSearchObj = search.create({
                type: "transaction",
                filters:
                    [
                        ["type", "anyof", "CustCred", "CustInvc"],
                        "AND",
                        ["internalid", "anyof", orderIds],
                        "AND",
                        ["customermain.custentity_sps_enable_invoice_workflow", "is", "T"],
                        "AND",
                        ["source", "noneof", "CSV"],
                        "AND",
                        ["trandate", "onorafter", "03/01/2024"],
                        "AND",
                        ["mainline", "is", "F"],
                        "AND",
                        ["cogs", "is", "F"],
                        "AND",
                        ["taxline", "is", "F"],
                        "AND",
                        ["datecreated", "on", "yesterday"],
                        "AND",
                        ["shipping", "is", "F"]
                    ],
                columns:
                    [
                        search.createColumn({ name: "item", summary: "GROUP", label: "Item" })
                    ]
            });
            invoiceSearchObj.run().each(function (result) {
                itemsIds.push(result.getValue({ name: 'item', summary: 'GROUP' }));
                return true;
            });
            return itemsIds;
        } catch (error) {
            log.error('getInternalIdOfItemsOnInvoices', error);
        }
    }
    function createCsvFile() {
        try {
            var alreadyExistsFile = searchFileByName();
            if (alreadyExistsFile) { //If the file is already in file cabinet this funcion will reset the file
                log.audit('file reset');
                var fileObj = getCurrentFile(alreadyExistsFile);
                var currentLine = 0;
                var headerRow = '';
                fileObj.lines.iterator().each(function (line) {
                    currentLine++;
                    if (currentLine === 1) {
                        headerRow = line.value + '\n';
                    }
                    return true;
                });
                var newFile = file.create({ name: fileObj.name, fileType: file.Type.CSV, folder: fileObj.folder, contents: headerRow });
                newFile.save();
            } else {//If the file not exists the file will be created
                let fileName = 'Credit-Memo-Invoices-Network-Report.csv'
                var csvString = 'Internal ID,Distributor ID ,Network Ship To,Account Location,Credit Memo# - Invoice#,Po#,Invoice Date,Item ID,MFG Item,Item Description,Item UPC,Item SAP,Manufacturer Name,Quantity,Unit of Measure,Gross Sales $USD,Tax Amount,EDI Status(ACME)';
                let objXlsFile = file.create({ name: fileName, fileType: file.Type.CSV, contents: csvString });
                objXlsFile.folder = -15;
                var newFileId = objXlsFile.save();
                return newFileId;
            }
        } catch (error) {
            log.error('createCsvFile error', error)
        }
    }
    function searchFileByName() {
        try {
            let idFolder;
            let fileSearchObj = search.create({
            type: "file",
            filters:
                [
                    ["folder", "anyof", "-15"],
                    "AND",
                    ["name", "contains", "Credit-Memo-Invoices-Network-Report"]
                ],
            columns:
                [
                    search.createColumn({
                        name: "name",
                        sort: search.Sort.ASC,
                        label: "Name"
                    }),
                    search.createColumn({ name: "internalid", label: "Internal ID" })
                ]
        });
        fileSearchObj.run().each(function (result) {
            idFolder = result.getValue('internalid');
            return false;
        });
        return idFolder;
        } catch (error) {
            log.error("searchFileByName " , error);
        }
    }
    function createCsvString(csvFile, ordersLinesToCSV) {
        try {
            var fileLoaded = getCurrentFile(csvFile);
            var newContent = '\n';
            ordersLinesToCSV.forEach(invObj => {
                newContent +=
                    invObj.orderId + ',' +
                    invObj.orderDistributorId + ',' +
                    invObj.orderNetworkShipTo + ',' +
                    invObj.orderAccountLocation + ',' +
                    invObj.orderInvoiceNumber + ',' +
                    invObj.orderPoNumber + ',' +
                    invObj.orderDateCreated + ',' +
                    invObj.orderItemId + ',' +
                    invObj.orderItemText + ',' +
                    invObj.orderItemDescription + ',' +
                    invObj.orderItemUPC + ',' +
                    invObj.orderItemSAP + ',' +
                    invObj.orderItemManufacterName + ',' +
                    invObj.orderItemQuantity + ',' +
                    invObj.orderItemUnit + ',' +
                    invObj.orderItemAmount + ',' +
                    invObj.orderItemTaxAmount + ',' +
                    invObj.orderIntegrationStatus + '\n'
            });
            fileLoaded.appendLine({
                value: newContent
            })
            fileLoaded.save()
        } catch (error) {
            log.error('createCsvString error', error)
        }
    }
    function getCurrentFile(id) {
        try {
            let fileLoaded = file.load({
                id: id
            });
            return fileLoaded;
        } catch (error) {
            log.error("getCurrentFile error", error)
        }
    }


    return {
        getInputData: getInputData,
        map: map,
        reduce: reduce
    };
});



