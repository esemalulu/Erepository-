/**
 *@NApiVersion 2.1
 *@NScriptType Suitelet
 */
define(["N/log", "N/search", "N/ui/serverWidget", 'N/format', 'N/query','N/runtime'], function (log, search, serverWidget, format, query,runtime) {

    function onRequest(context) {
        try {
            var scriptObj = runtime.getCurrentScript();
            var BASE_URL = scriptObj.getParameter({ name: 'custscript_sdb_file_base_url' });
            let form = serverWidget.createForm({ title: 'Dead Inventory Report', hideNavBar: true });
            form.clientScriptModulePath = 'SuiteScripts/SDB-dead-inventory-report-CS.js';
            form.addButton({
                id: 'custpage_export_excel',
                label: 'Download Excel',
                functionName: "exportToExcel('" + BASE_URL+ "');"
            });
            let today = new Date();
            let startMonth = new Date(`${today.getMonth() + 1}/1/${today.getFullYear()}`);
            const pageNum = context.request?.parameters?.page || 0;

            //--------------------------Parameters for query------------------
            let salesDateParamFrom = context.request?.parameters?.salesDateFrom || getDateString(startMonth);;
            let salesDateParamTo = context.request?.parameters?.salesDateTo || getDateString(today);
            let lastSoldTo = context.request?.parameters?.lastSoldTo || false;
            let lastPurchasedTo = context.request?.parameters?.lastPurchasedTo || false
            let buyerParam = context.request?.parameters?.buyer || '';
            let preferredVendorParam = context.request?.parameters?.preferredVendor || '';
            let transactionType = context.request?.parameters?.transactionType || "both";
            let warehouseParam = context.request?.parameters?.warehouse || "";
            const pageSize = context.request?.parameters?.pageSize || 500;

            const startIndex = pageNum * pageSize;
            const endIndex = startIndex + pageSize;

            let searchHeaderFields = [
                { id: 'custpage_gotopage_select', type: serverWidget.FieldType.SELECT, label: 'Select Pages', value: context.request?.parameters?.page || 1 },
                { id: 'custpage_transaction_type', type: serverWidget.FieldType.SELECT, label: 'Search in Transaction', value: transactionType },
                { id: 'custpage_sales_date_from', type: serverWidget.FieldType.DATE, label: 'From Date', value: '' },
                { id: 'custpage_sales_date_to', type: serverWidget.FieldType.DATE, label: 'To Date', value: '' },
                { id: 'custpage_last_sold_to', type: serverWidget.FieldType.DATE, label: 'Last Sold To', value: formatDatePreference(lastSoldTo) },
                { id: 'custpage_last_purchased_to', type: serverWidget.FieldType.DATE, label: 'Last Purchased To', value: formatDatePreference(lastPurchasedTo) },
                { id: 'custpage_buyer', type: serverWidget.FieldType.SELECT, label: 'Buyer', value: buyerParam },
                { id: 'custpage_preferred_vendor', type: serverWidget.FieldType.SELECT, label: 'Preferred Vendor', value: preferredVendorParam },
                { id: 'custpage_warehouse', type: serverWidget.FieldType.SELECT, label: 'Warehouse', value: warehouseParam }
            ];

            form = addFieldsToForm(form, searchHeaderFields);
            // Populate Buyer and Preferred Vendor dropdowns
            populateBuyerVendorAndWarehouseSelectFields(form, buyerParam, preferredVendorParam, warehouseParam);

            let transactionSelect = form.getField('custpage_transaction_type');
            transactionSelect.addSelectOption({ value: 'both', text: 'Purchase and Sales Order' });
            transactionSelect.addSelectOption({ value: 'po', text: 'Purchase Order' });
            transactionSelect.addSelectOption({ value: 'so', text: 'Sales Order' });
            transactionSelect.defaultValue = transactionType;

            let columnHeaders = ["Item ID", "Item", "Description", "Item Sales Rep", "DNR Activity Code", "Item Vendor", "Last Date Sold", "Total Inventory on Hand", "Preferred Vendor", "Last Date Purchased", "Buyer Name", "Preferred Vendor Price", "Extended Cost"];

            let salesDateObj = {
                saleDateFrom: salesDateParamFrom != "none" ? formatDatePreference(salesDateParamFrom) : salesDateParamFrom,
                saleDateTo: formatDatePreference(salesDateParamTo) || '',
            };

            // const dateSalesFrom = form.getField('custpage_sales_date_from');
            // const dateSalesTo = form.getField('custpage_sales_date_to');
            // if (salesDateParamFrom != "none") dateSalesFrom.defaultValue = salesDateObj.saleDateFrom;
            // if (salesDateParamTo) dateSalesTo.defaultValue = salesDateObj.saleDateTo;

            const sublistData = {
                form,
                columnHeaders,
                pageNum,
                startIndex,
                endIndex,
                salesDateObj,
                transactionType,
                lastSoldTo,
                lastPurchasedTo,
                buyerParam,
                preferredVendorParam,
                warehouseParam
            };

            form = createSublist(sublistData);
            context.response.writePage(form);
        } catch (e) {
            log.error('ERROR in onRequest', e);
        }
    }
    function createSublist(sublistData) {
        try {
            const sublist = sublistData.form.addSublist({
                id: "custpage_items_dead" + (sublistData.transactionType ? "_" : ""),
                label: "Dead items" + (sublistData.transactionType == 'po' ? " in Purchase Orders" : sublistData.transactionType == 'so' ? " in Sales Orders" : " in Purchase and Sales Orders"),
                type: serverWidget.SublistType.LIST
            });

            let columnHeaders = ["Item ID", "Item", "Description", "Item Sales Rep", "DNR Activity Code", "Item Vendor", "Last Date Sold", "Total Inventory on Hand", "Preferred Vendor", "Last Date Purchased", "Buyer Name", "Preferred Vendor Price", "Extended Cost"];

            columnHeaders.forEach(column => {
                sublist.addField({
                    id: "custpage_" + sublistData.transactionType + column?.toLowerCase().replace(/\s/g, '_'),
                    label: column,
                    type: serverWidget.FieldType.TEXT,
                });
            });

            const totalResults = sublistData.form.addField({
                id: 'custpage_total_results',
                type: serverWidget.FieldType.TEXT,
                label: 'Total Results'
            }).updateDisplayType({
                displayType: serverWidget.FieldDisplayType.INLINE
            });

            const deadItems = getDeadItems(
                // sublistData.salesDateObj.saleDateFrom,
                // sublistData.salesDateObj.saleDateTo,
                sublistData.transactionType,
                sublistData.lastSoldTo,
                sublistData.lastPurchasedTo,
                sublistData.buyerParam,
                sublistData.preferredVendorParam,
                sublistData.pageNum,
                sublistData.warehouseParam
            );
            totalResults.defaultValue = `Total results: ${deadItems.totalResultsCount}`;
            const totalPages = Math.ceil(deadItems.totalResultsCount / 500);

            const goToPageSelect = sublistData.form.getField('custpage_gotopage_select');
            for (let i = 0; i < totalPages; i++) {
                goToPageSelect.addSelectOption({
                    value: i,
                    text: `Page ${i + 1}`
                });
            }
            goToPageSelect.defaultValue = sublistData.pageNum;
            const searchResults = deadItems.allResults;
            setSublistValues(sublist, 'custpage_' + sublistData.transactionType, searchResults);
            if(deadItems.noResultsMessage)addNoResultsMessage(sublistData.form)
            return sublistData.form;
        } catch (e) {
            log.error('ERROR in createSublist', e);
        }
    }

    function addNoResultsMessage(form){
        try {
            var script = `<script>
                            alert("There is not results for the selected filters")
                        </script>`;
        var alertField = form.addField({
            id: "custpage_no_results_alert",
            label: "No Results Alert",
            type: 'inlinehtml'
        });
        alertField.defaultValue = script;
        } catch (error) {
            log.error("addNoResultsMessage",error);
        }
    }
    function setSublistValues(sublist, prefix, results) {
        try {
            let columns = ["Item ID", "Item", "Description", "Item Sales Rep", "DNR Activity Code", "Item Vendor", "Last Date Sold", "Total Inventory on Hand", "Preferred Vendor", "Last Date Purchased", "Buyer Name", "Preferred Vendor Price", "Extended Cost"];
            results.forEach((result, i) => {
                var itemQuantity = result.values[7] || 0;
                var preferredVendorPrice = result.values[11] || 0;
                var extendedCost = (preferredVendorPrice * itemQuantity).toFixed(2);
                result.values.push(extendedCost)
                result.values.forEach((value, j) => {
                    const thisColumn = columns[j]?.toLowerCase().replace(/\s/g, '_');
                    if (!thisColumn) return;

                    sublist.setSublistValue({
                        id: prefix + thisColumn,
                        line: i,
                        value: value || "N/A"
                    });
                });
            });

        } catch (e) {
            log.error('ERROR in setSublistValues', e);
        }
    }

    function getDeadItems(type, lastSoldTo, lastPurchasedTo, buyer, preferredVendor, pageNum, warehouseParam) {
        try {
            log.debug("getDeadItems Params:", "type: " + type + " - lastSoldTo: " + lastSoldTo + " - lastPurchasedTo: " + lastPurchasedTo + " - buyer: " + buyer + " - PreferredVendor: " + preferredVendor + " - pageNum: " + pageNum + " - warehouse: " + warehouseParam)
            if((type == "so" && !lastSoldTo) || (type == "po" && !lastPurchasedTo) || (type == "both" && (!lastSoldTo || !lastPurchasedTo))) return { allResults: [], totalResultsCount: 0, noResultsMessage : false };  
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
                // completeQuery = `item.id NOT IN ` + notInPO + ' AND item.id NOT IN ' + notInSO;
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

            const range = 500;
            const pagedResults = query.runSuiteQLPaged({ query: sqlStr, pageSize: range });
            const totalResultsCount = pagedResults.count;

            if (totalResultsCount == 0) return { allResults: [], totalResultsCount: 0, noResultsMessage : true }; 
            const currentPage = pagedResults.fetch({ index: pageNum });
            const allResults = currentPage.data.results;
            log.debug("totalResultsCount: " , totalResultsCount);
            return { allResults, totalResultsCount, noResultsMessage : false };

        } catch (e) {
            log.error('ERROR IN GETDEADITEMS', e);
            return { allResults: [], totalResultsCount: 0, noResultsMessage : false }; 
        }
    }



    function formatDatePreference(date) {
        try {
            if (!date) return;
            const newDate = new Date(date);
            const formattedDateString = format.parse({
                value: newDate,
                type: format.Type.DATE
            });

            const formattedDate = format.format({
                value: formattedDateString,
                type: format.Type.DATE
            });

            return formattedDate;
        } catch (err) {
            log.error('error en: formatDatePreference', err);
        }
    }

    function addFieldsToForm(form, fields) {
        try {
            fields.forEach(field => {
                const fieldForm = form.addField({
                    id: field.id,
                    type: field.type,
                    label: field.label
                });

                if (field?.value) fieldForm.defaultValue = field.value;

                if (field.type === serverWidget.FieldType.DATE &&
                    field.id !== 'custpage_last_sold_to' &&
                    field.id !== 'custpage_last_purchased_to') {

                    fieldForm.updateDisplayType({
                        displayType: serverWidget.FieldDisplayType.HIDDEN
                    });
                }
            });

            return form;
        } catch (e) {
            log.error('ERROR in addFieldsToForm', e);
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

    function populateBuyerVendorAndWarehouseSelectFields(form, selectedBuyer, selectedVendor, selectedWarehouse) {
        try {
            // Populate Buyer dropdown
            let buyerField = form.getField('custpage_buyer');
            // Add empty option at the top (meaning "All" when selected)
            buyerField.addSelectOption({
                value: '',
                text: 'All Buyers',
                isSelected: selectedBuyer === ''
            });

            let buyerSearch = search.create({
                type: search.Type.EMPLOYEE,
                filters: [],
                columns: ['internalid', 'entityid']
            });

            let buyerSearchPagedData = buyerSearch.runPaged({
                pageSize: 1000
            });

            buyerSearchPagedData.pageRanges.forEach(function (pageRange) {
                let page = buyerSearchPagedData.fetch({ index: pageRange.index });
                page.data.forEach(function (result) {
                    buyerField.addSelectOption({
                        value: result.getValue('internalid'),
                        text: result.getValue('entityid'),
                        isSelected: result.getValue('internalid') === selectedBuyer
                    });
                });
            });

            // Populate Preferred Vendor dropdown
            let vendorField = form.getField('custpage_preferred_vendor');
            // Add empty option at the top (meaning "All" when selected)
            vendorField.addSelectOption({
                value: '',
                text: 'All Vendors',
                isSelected: selectedVendor === ''
            });

            let vendorSearch = search.create({
                type: search.Type.VENDOR,
                filters: [["category", "anyof", "7"]],
                columns: ['legalname', 'internalid']
            });

            let vendorSearchPagedData = vendorSearch.runPaged({
                pageSize: 1000
            });

            vendorSearchPagedData.pageRanges.forEach(function (pageRange) {
                let page = vendorSearchPagedData.fetch({ index: pageRange.index });
                page.data.forEach(function (result) {
                    vendorField.addSelectOption({
                        value: result.getValue('internalid'),
                        text: result.getValue('legalname'),
                        isSelected: result.getValue('internalid') === selectedVendor
                    });
                });
            });


            //Populate warehouse dropdown
            let warehouseField = form.getField('custpage_warehouse');
            warehouseField.addSelectOption({
                value: '',
                text: 'Any Warehouse',
                isSelected: selectedWarehouse === ''
            });

            var locationSearchObj = search.create({
                type: "location",
                filters: [],
                columns:
                    [
                        search.createColumn({ name: "name", label: "Name" }),
                        search.createColumn({ name: "namenohierarchy", label: "Name (no hierarchy)" }),
                        search.createColumn({ name: "internalid", label: "Internal ID" })
                    ]
            });
            var searchResultCount = locationSearchObj.runPaged().count;
            locationSearchObj.run().each(function (result) {
                warehouseField.addSelectOption({
                    value: result.getValue({ name: 'internalid' }),
                    text: result.getValue({ name: 'name' }),
                    isSelected: result.getValue({ name: 'internalid' }) === selectedWarehouse
                });
                return true;
            });

        } catch (e) {
            log.error('ERROR in populateBuyerVendorAndWarehouseSelectFields', e);
        }
    }


    return {
        onRequest: onRequest
    }
});