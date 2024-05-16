/**
 *@NApiVersion 2.1
 *@NScriptType Suitelet
 */
define(["N/log", "N/record", "N/search", "N/ui/serverWidget"], function (log, record, search, serverWidget) {

    function onRequest(context) {
        var form = serverWidget.createForm({ title: 'CSR Report: Back orders (ready to) release report', hideNavBar: true });
        form.clientScriptModulePath = 'SuiteScripts/SDB-dead-inventory-report-CS.js';

        let pageNum = context.request?.parameters?.page || 1;
        let pageSize = context.request?.parameters?.pageSize || 500; // Default page size
        let qtyBackordered = context.request?.parameters?.qtyback || "";

        // Calculate start and end indexes for sublist data retrieval
        var startIndex = (pageNum - 1) * pageSize;
        var endIndex = startIndex + pageSize - 1;

        var totalResults = form.addField({
            id: 'custpage_total_results',
            type: serverWidget.FieldType.INLINEHTML,
            label: 'Total Results'
        });

        var goToPageSelect = form.addField({
            id: 'custpage_gotopage_select',
            type: serverWidget.FieldType.INLINEHTML,
            label: 'Select Pages'
        });

        var qtyBackorderedField = form.addField({
            id: 'custpage_qty_backordered',
            type: serverWidget.FieldType.INTEGER,
            label: 'Qty Backordered'
        });
        qtyBackorderedField.defaultValue = qtyBackordered;

        var columnHeaders = ["Document Number", "Customer", "Line ID", "Item", "Description", "Quantity", "Qty Available", "Qty Commited", "Qty Backordered", "Ship Date"];

        form = createSublist(form, columnHeaders, pageNum, startIndex, endIndex, goToPageSelect, totalResults, qtyBackordered);

        context.response.writePage(form);
    }

    function createSublist(form, columns, pageNum, startIndex, endIndex, goToPageSelect, totalResults, qtyBackordered) {
        const sublist = form.addSublist({
            id: 'custpage_items_list',
            label: 'Items',
            type: serverWidget.SublistType.LIST
        });

        // Adding columns to form
        columns.forEach(column => {
            sublist.addField({
                id: "custpage_" + column?.replaceAll(" ", "_")?.toLowerCase(),
                label: column,
                type: serverWidget.FieldType.TEXT,
            });
        });

        const itemsBackordered = getBackorderItems(qtyBackordered);

        const searchCount = itemsBackordered.runPaged().count;
        log.debug("searchCount", searchCount);

        totalResults.defaultValue = `<p style="font-size: 17px; font-weight: 600;">Total results: ${searchCount}</p>`;

        var totalPages = Math.ceil(searchCount / 500);

        // Setting pages into select
        // ----------------------------------------------------------------
        var selectPages = `<select id="goToPageSelect">`;
        for (var i = 0; i < totalPages; i++) {
            selectPages += `<option value='${i + 1}'>Page ${i + 1}</option>`;
        }
        selectPages += `</select>`
        goToPageSelect.defaultValue = selectPages;
        // -----------------------------------------------------------------

        var searchResults = itemsBackordered.run().getRange({
            start: startIndex,
            end: endIndex
        });

        searchResults.forEach(function (result, i) {
            log.debug("Initializing for each");

            var documentNumber = result.getValue({ name: "tranid" }) || "N/A";
            var customer = result.getValue({ name: "companyname", join: "customer" }) || "N/A";
            var lineId = result.getValue({ name: "line" }) || "N/A";
            var item = result.getValue({ name: "item" }) || "N/A";
            var description = result.getValue({ name: "salesdescription", join: "item" }) || "N/A";
            var itemQty = result.getValue({ name: "quantity" }) || "N/A";
            var itemCommited = result.getValue({ name: "quantitycommitted" }) || "N/A";
            var qtyBackordered = result.getValue({ name: "formulatext" }) || "N/A";
            var shipDate = result.getValue({ name: "startdate" }) || "N/A";
            var qtyAvailable = result.getValue({ name: "quantityavailable", join: "item" }) || "N/A";

            sublist.setSublistValue({
                id: 'custpage_' + columns[0]?.replaceAll(" ", "_")?.toLowerCase(),
                line: i,
                value: documentNumber
            });

            sublist.setSublistValue({
                id: 'custpage_' + columns[1]?.replaceAll(" ", "_")?.toLowerCase(),
                line: i,
                value: customer
            });

            sublist.setSublistValue({
                id: 'custpage_' + columns[2]?.replaceAll(" ", "_")?.toLowerCase(),
                line: i,
                value: lineId
            });

            sublist.setSublistValue({
                id: 'custpage_' + columns[3]?.replaceAll(" ", "_")?.toLowerCase(),
                line: i,
                value: item
            });

            sublist.setSublistValue({
                id: 'custpage_' + columns[4]?.replaceAll(" ", "_")?.toLowerCase(),
                line: i,
                value: description
            });

            sublist.setSublistValue({
                id: 'custpage_' + columns[5]?.replaceAll(" ", "_")?.toLowerCase(),
                line: i,
                value: itemQty
            });

            sublist.setSublistValue({
                id: 'custpage_' + columns[6]?.replaceAll(" ", "_")?.toLowerCase(),
                line: i,
                value: qtyAvailable
            });

            sublist.setSublistValue({
                id: 'custpage_' + columns[7]?.replaceAll(" ", "_")?.toLowerCase(),
                line: i,
                value: itemCommited
            });

            sublist.setSublistValue({
                id: 'custpage_' + columns[8]?.replaceAll(" ", "_")?.toLowerCase(),
                line: i,
                value: qtyBackordered
            });

            sublist.setSublistValue({
                id: 'custpage_' + columns[9]?.replaceAll(" ", "_")?.toLowerCase(),
                line: i,
                value: shipDate
            });

        });

        return form;
    }

    // Get all items that are dead inventory
    function getBackorderItems(backorderQty) {

        var filtersSearch;

        if (backorderQty) {
            filtersSearch = [
                ["type", "anyof", "SalesOrd"],
                "AND",
                ["item", "noneof", "@NONE@"],
                "AND",
                ["customer.companyname", "isnotempty", ""],
                "AND",
                ["formulatext: {quantity}-nvl({quantitycommitted},0)-nvl({quantityshiprecv},0)", "is", backorderQty]
            ]
        }
        else {
            filtersSearch = [
                ["type", "anyof", "SalesOrd"],
                "AND",
                ["item", "noneof", "@NONE@"],
                "AND",
                ["customer.companyname", "isnotempty", ""]
            ]
        }


        var salesorderSearchObj = search.create({
            type: "salesorder",
            filters: filtersSearch,
            columns:
                [
                    search.createColumn({ name: "tranid", label: "Document Number" }),
                    search.createColumn({
                        name: "companyname",
                        join: "customer",
                        label: "Company Name"
                    }),
                    search.createColumn({ name: "line", label: "Line ID" }),
                    search.createColumn({ name: "item", label: "Item" }),
                    search.createColumn({
                        name: "salesdescription",
                        join: "item",
                        label: "Description"
                    }),
                    search.createColumn({ name: "quantity", label: "Quantity" }),
                    search.createColumn({ name: "quantitycommitted", label: "Quantity Committed" }),
                    search.createColumn({
                        name: "formulatext",
                        formula: "TO_CHAR({quantity}-nvl({quantitycommitted},0)-nvl({quantityshiprecv},0))",
                        label: "Qty Backordered"
                    }),
                    search.createColumn({ name: "startdate", label: "Ship Date", sort: search.Sort.ASC }),
                    search.createColumn({ name: "quantityavailable", join: "item", label: "Quantity availabe" })
                ]
        });

        return salesorderSearchObj;
    }

    return {
        onRequest: onRequest
    }
});
