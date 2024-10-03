/**
 * @NApiVersion 2.1
 * @NScriptType Suitelet
 */
define(['N/file', 'N/record', 'N/https', 'N/query', 'N/runtime', 'N/search'],
    /**
 * @param{file} file
 * @param{record} record
 * @param{https} https
 * @param{query} query
 */
    (file, record, https, query, runtime, search) => {
        const onRequest = (scriptContext) => {
            try {
                var scriptObj = runtime.getCurrentScript();
                var folderId = scriptObj.getParameter({ name: 'custscript_sdb_folder_id' });

                var params = JSON.parse(scriptContext.request.body);
                var csvContent = generateCsvContent(params);
                var csvContentSplitted = csvContent.split('\n');

                const maxFileSize = 9 * 1024 * 1024;
                var employeeId = runtime.getCurrentUser().id;

                var partNumber = 1;
                var contentHeaders = csvContentSplitted[0] + '\n';

                var fileObj = file.create({
                    name: `Dead_Inventory_Report_Part_${partNumber}_${employeeId}.csv`,
                    fileType: file.Type.CSV,
                    contents: contentHeaders,
                    encoding: file.Encoding.UTF_8,
                    isOnline: true
                });
                var filesCreatedIds = [];
                for (var i = 1; i < csvContentSplitted.length; i++) {
                    var line = csvContentSplitted[i];
                    try {
                        fileObj.appendLine({ value: line });
                    } catch (error) {
                        log.error("Error trying to appendline with value: " + line)
                    }
                    if (fileObj.size > maxFileSize) {
                        fileObj.folder = folderId;
                        var id = fileObj.save();
                        filesCreatedIds.push(id);

                        partNumber++;

                        fileObj = file.create({
                            name: `Dead_Inventory_Report_Part_${partNumber}_${employeeId}.csv`,
                            fileType: file.Type.CSV,
                            contents: contentHeaders,
                            encoding: file.Encoding.UTF_8
                        });
                    }
                }
                if (fileObj.size > 0) {
                    fileObj.folder = folderId;
                    var id = fileObj.save();
                    filesCreatedIds.push(id);
                }

                scriptContext.response.write({ output: JSON.stringify(filesCreatedIds) });
                return;
            } catch (e) {
                log.error('ERROR in onRequest', e);
            }
        }



        const generateCsvContent = (params) => {
            try {
                let csv = "Item ID,Item,Description,Item Sales Rep,DNR Activity Code,Item Vendor,Last Date Sold,Total Inventory on Hand, Preferred Vendor,Last Date Purchased, Buyer Name,Preferred Vendor Price,Extended Cost \n"

                let today = new Date();
                let startMonth = new Date(`${today.getMonth() + 1}/1/${today.getFullYear()}`);
                //let salesDateParamFrom = params?.salesDateFrom || getDateString(startMonth);
                //let salesDateParamTo = params.salesDateTo || getDateString(today);
                log.debug("params", params)
                const results = getDeadItems(
                    // salesDateParamFrom,
                    //salesDateParamTo,
                    params?.transactionType,
                    //params?.lastSoldFrom,
                    params?.lastSoldTo,
                    //params?.lastPurchasedFrom,
                    params?.lastPurchasedTo,
                    params?.buyer,
                    params?.preferredVendor,
                    params?.warehouse
                );

                results.forEach(result => {
                    var quanityOnHand = result.values[7] || 0
                    var vendorPrice = result.values[11] || 0
                    var extendedCost = vendorPrice * quanityOnHand;
                    csv += `${result.values[0] || 0},`;   //Item ID
                    csv += `${result.values[1]?.replaceAll(",", " ") || 'N/A'},`;//Item Name
                    csv += `${result.values[2]?.replaceAll(",", " ") || 'N/A'},`;// Item desc
                    csv += `${result.values[3]?.replaceAll(",", " ") || 'N/A'},`;// Item sales rep
                    csv += `${result.values[4]?.replaceAll(",", " ") || 'N/A'},`;//Item vendor name
                    csv += `${result.values[5]?.replaceAll(",", " ") || 'N/A'},`;//Item DNR
                    csv += `${result.values[6]?.replaceAll(",", " ") || 'N/A'},`;//Item last sold
                    csv += `${result.values[7] || 0},`;   //Item QTY on hand
                    csv += `${result.values[8]?.replaceAll(",", " ") || 'N/A'},`;//Preferred vendor
                    csv += `${result.values[9]?.replaceAll(",", " ") || 'N/A'},`;//purchase date
                    csv += `${result.values[10]?.replaceAll(",", " ") || 'N/A'},`;//buyer name
                    csv += `${result.values[11] || 'N/A'},`;//PreferredVendor price
                    csv += `${extendedCost.toFixed(2) || 0}\n`;  //Extended cost
                });
                return csv;
            } catch (error) {
                log.error("generateCsvContent error", error);
            }
        };

        function getDeadItems(type, lastSoldTo, lastPurchasedTo, buyer, preferredVendor, warehouseParam) {
            try {
                log.debug("type", type)
                const notInSO = `(
                    SELECT DISTINCT item.id
                    FROM item 
                        LEFT JOIN transactionLine as line on line.item = item.id
                        LEFT JOIN transaction as tran on line.transaction = tran.id
                    WHERE tran.type = 'SalesOrd'
                        AND tran.trandate > TO_DATE('${lastSoldTo}', 'MM-DD-YYYY')
                )`;
                 const notInPO = `(
                     SELECT DISTINCT item.id
                     FROM item 
                         LEFT JOIN transactionLine as line on line.item = item.id
                         LEFT JOIN transaction as tran on line.transaction = tran.id
                     WHERE tran.type = 'ItemRcpt'
                         AND tran.trandate > TO_DATE('${lastPurchasedTo}', 'MM-DD-YYYY')
                         AND (SELECT poCreatedFrom.type FROM transaction as poCreatedFrom WHERE poCreatedFrom.id = line.createdFrom) = 'PurchOrd'
                 )`;
                 let completeQuery;
                 if (type === 'so') {
                     completeQuery = `item.id NOT IN ` + notInSO;
                 } else if (type === 'po') {
                     completeQuery = `item.id NOT IN  ` + notInPO;
                 } else {
                    //  completeQuery = `item.id NOT IN ` + notInPO + ' AND item.id NOT IN ' + notInSO;
                    completeQuery = `NOT EXISTS (
                        SELECT 1
                        FROM transactionLine as line 
                        LEFT JOIN transaction as tran ON line.transaction = tran.id
                        WHERE line.item = item.id 
                        AND (
                            (tran.type = 'SalesOrd' AND tran.trandate > TO_DATE('${lastSoldTo}', 'MM-DD-YYYY'))
                            OR 
                            (tran.type = 'ItemRcpt' AND tran.trandate > TO_DATE('${lastPurchasedTo}', 'MM-DD-YYYY') 
                            AND EXISTS ( SELECT 1 FROM transaction as poCreatedFrom  WHERE poCreatedFrom.id = line.createdFrom  AND poCreatedFrom.type = 'PurchOrd'))
                        )
                    )`;
                 }

                if (buyer) {
                    completeQuery += ` AND item.custitem_buyer = ${buyer}`;
                }

                if (preferredVendor) {
                    completeQuery += ` AND EXISTS (
                        SELECT 1
                        FROM itemVendor 
                        WHERE itemVendor.item = item.id 
                        AND itemVendor.vendor = ${preferredVendor}
                        AND itemVendor.preferredvendor = 'T'
                    )`;
                }

                log.debug("warehouseParam", warehouseParam)
                var dateWarehouseFilter = warehouseParam ? `AND line.location = ${Number(warehouseParam)}` : '';
                var inventoryWarehouseFilter = warehouseParam ? `AND InventoryBalance.location = ${Number(warehouseParam)}` : '';
                const sqlStr = `
                        SELECT   item.id,
                                 item.itemid as id,
                                 item.displayname as displayname,
                                 salesrep.entityid as salesrep,
                                 dnrListTest.name as dnrValue,
                                 item.vendorname as vendorname,
                                (SELECT MAX(tran.trandate)
                                     FROM transactionLine as line
                                     LEFT JOIN transaction as tran ON line.transaction = tran.id
                                     WHERE line.item = item.id 
                                     AND tran.type = 'SalesOrd' ${dateWarehouseFilter}) as last_date_sold,
                                (SELECT SUM(inventorybalance.quantityavailable)
                                 FROM inventorybalance
                                 WHERE inventorybalance.item = item.id ${inventoryWarehouseFilter}) as total_inventory_on_hand,
                                (SELECT vendor.legalname
                                 FROM itemVendor
                                 LEFT JOIN vendor ON itemVendor.vendor = vendor.id
                                 WHERE itemVendor.item = item.id AND itemVendor.preferredvendor = 'T'
                                 FETCH FIRST 1 ROWS ONLY) as preferred_vendor,
                                     (SELECT MAX(tran.trandate)
                                     FROM transactionLine as line
                                     LEFT JOIN transaction as tran ON line.transaction = tran.id
                                     WHERE line.item = item.id
                                     AND tran.type = 'ItemRcpt' ${dateWarehouseFilter}) as last_purchase_date,
                                 buyer.entityid as buyer_name,
                                  (SELECT itemVendor.purchasePrice
                                  FROM itemVendor
                                  WHERE itemVendor.preferredVendor = 'T' AND itemVendor.item = item.id
                                  FETCH FIRST 1 ROWS ONLY) as preferred_vendor_price
                          FROM item
                          LEFT JOIN employee  AS buyer ON item.custitem_buyer = buyer.id
                          LEFT JOIN employee  AS salesrep ON item.custitem_acc_sales_rep = salesrep.id
                          LEFT JOIN CUSTOMLIST_DNR_LIST AS dnrListTest ON item.custitem_dnr = dnrListTest.id 
                          WHERE item.isinactive='F'
                              AND item.custitem4 = 'F'
                              AND item.custitem_non_returnable = 'F'
                              AND (SELECT SUM(inventorybalance.quantityavailable)
                              FROM inventorybalance
                              WHERE inventorybalance.item = item.id)  >  (SELECT SUM(inventorybalance.committedQtyPerLocation)
                                                                                                FROM inventorybalance
                                                                                                WHERE inventorybalance.item = item.id)
                              AND ${completeQuery}`;
                const range = 1000;
                const allResults = [];
                query.runSuiteQLPaged({ query: sqlStr, pageSize: range })
                    .iterator().each((page) => {
                        allResults.push(...page.value?.data.results);
                        return true;
                    });
                return allResults;
            } catch (e) {
                log.error('ERROR IN GETDEADITEMS', e);
                return { allResults: [], totalResultsCount: 0 };
            }
        }


        function getDateString(currentDate) {
            try {
                const year = currentDate.getFullYear();
                const month = (currentDate.getMonth() + 1).toString().padStart(2, '0');
                const day = currentDate.getDate().toString().padStart(2, '0');
                const formattedDate = `${month}-${day}-${year}`;
                return formattedDate;
            } catch (e) {
                log.error('ERROR IN getDateString', e);
            }
        }

        return { onRequest }

    });