/**
 *@NApiVersion 2.1
 *@NScriptType ClientScript
 */
define(['N/currentRecord', 'N/record'], function (currentRecord, record) {

    function pageInit(context) {
        return;
    }

    function markAllCustomer() {
        try {
            var rec = currentRecord.get();
            var lineCount = rec.getLineCount({
                sublistId: 'recmachcustrecord_rebate_customer_rebate_parent'
            });
            for (let i = 0; i < lineCount; i++) {
                rec.selectLine({
                    sublistId: 'recmachcustrecord_rebate_customer_rebate_parent',
                    line: i
                });
                rec.setCurrentSublistValue({
                    sublistId: 'recmachcustrecord_rebate_customer_rebate_parent',
                    fieldId: 'custrecord_sdb_selected_2',
                    value: true,
                })
                rec.commitLine({
                    sublistId: 'recmachcustrecord_rebate_customer_rebate_parent',
                })
            }
        } catch (e) {
            console.log('error marAllCustomer', e)
        }
    }
    function unmarkAllCustomer() {
        try {
            var rec = currentRecord.get();
            var lineCount = rec.getLineCount({
                sublistId: 'recmachcustrecord_rebate_customer_rebate_parent'
            });
            for (let i = 0; i < lineCount; i++) {
                rec.selectLine({
                    sublistId: 'recmachcustrecord_rebate_customer_rebate_parent',
                    line: i
                });
                rec.setCurrentSublistValue({
                    sublistId: 'recmachcustrecord_rebate_customer_rebate_parent',
                    fieldId: 'custrecord_sdb_selected_2',
                    value: false,
                })
                rec.commitLine({
                    sublistId: 'recmachcustrecord_rebate_customer_rebate_parent',
                })
            }
        } catch (e) {
            console.log('error unmarkAllCustomer', e)
        }
    }
    function removeCustomer() {
        try {
            var rec = currentRecord.get();
            var lineCount = rec.getLineCount({
                sublistId: 'recmachcustrecord_rebate_customer_rebate_parent'
            });
            for (let i = 0; i < lineCount; i++) {
                rec.selectLine({
                    sublistId: 'recmachcustrecord_rebate_customer_rebate_parent',
                    line: i
                });
                var isSelected = rec.getCurrentSublistValue({
                    sublistId: 'recmachcustrecord_rebate_customer_rebate_parent',
                    fieldId: 'custrecord_sdb_selected_2'
                })
                if (isSelected) {
                    var rebateCustomerId = rec.getCurrentSublistValue({
                        sublistId: 'recmachcustrecord_rebate_customer_rebate_parent',
                        fieldId: 'id'
                    })
                    record.submitFields({
                        type: 'customrecord_rebate_customer',
                        id: rebateCustomerId,
                        values: {
                            'custrecord_rebate_customer_rebate_parent': '',
                        }
                    })
                }
            }
            location.reload()
        } catch (e) {
            console.log('error removeCustomer', e)
        }
    }
    function markAllItem() {
        try {
            var rec = currentRecord.get();
            var lineCount = rec.getLineCount({
                sublistId: 'recmachcustrecord_rebate_items_parent'
            });
            for (let i = 0; i < lineCount; i++) {
                rec.selectLine({
                    sublistId: 'recmachcustrecord_rebate_items_parent',
                    line: i
                });
                rec.setCurrentSublistValue({
                    sublistId: 'recmachcustrecord_rebate_items_parent',
                    fieldId: 'custrecord_sdb_selected',
                    value: true,
                })
                rec.commitLine({
                    sublistId: 'recmachcustrecord_rebate_items_parent',
                })
            }
        } catch (e) {
            console.log('error markAllItem', e)
        }
    }
    function unmarkAllItem() {
        try {
            var rec = currentRecord.get();
            var lineCount = rec.getLineCount({
                sublistId: 'recmachcustrecord_rebate_items_parent'
            });
            for (let i = 0; i < lineCount; i++) {
                rec.selectLine({
                    sublistId: 'recmachcustrecord_rebate_items_parent',
                    line: i
                });
                rec.setCurrentSublistValue({
                    sublistId: 'recmachcustrecord_rebate_items_parent',
                    fieldId: 'custrecord_sdb_selected',
                    value: false,
                })
                rec.commitLine({
                    sublistId: 'recmachcustrecord_rebate_items_parent',
                })
            }
        } catch (e) {
            console.log('error unmarkAllItem', e)
        }
    }
    function removeItem() {
        try {
            var rec = currentRecord.get();
            var lineCount = rec.getLineCount({
                sublistId: 'recmachcustrecord_rebate_items_parent'
            });
            for (let i = 0; i < lineCount; i++) {
                rec.selectLine({
                    sublistId: 'recmachcustrecord_rebate_items_parent',
                    line: i
                });
                var isSelected = rec.getCurrentSublistValue({
                    sublistId: 'recmachcustrecord_rebate_items_parent',
                    fieldId: 'custrecord_sdb_selected'
                })
                if (isSelected) {
                    var rebateItemId = rec.getCurrentSublistValue({
                        sublistId: 'recmachcustrecord_rebate_items_parent',
                        fieldId: 'id'
                    })
                    record.submitFields({
                        type: 'customrecord_rebate_item_details',
                        id: rebateItemId,
                        values: {
                            'custrecord_rebate_items_parent': '',
                        }
                    })
                }
            }
            location.reload()
        } catch (e) {
            console.log('error removeItem', e)
        }
    }

    function markAllCPCLine() {
        try {
            var rec = currentRecord.get();
            var lineCount = rec.getLineCount({
                sublistId: 'recmachcustrecord_acme_cpc_item_header'
            });
            for (let i = 0; i < lineCount; i++) {
                rec.selectLine({
                    sublistId: 'recmachcustrecord_acme_cpc_item_header',
                    line: i
                });
                rec.setCurrentSublistValue({
                    sublistId: 'recmachcustrecord_acme_cpc_item_header',
                    fieldId: 'custrecord_sdb_selected_cpc_line',
                    value: true,
                })
                rec.commitLine({
                    sublistId: 'recmachcustrecord_acme_cpc_item_header',
                })
            }
        } catch (e) {
            console.log('error markAllCPCLine', e)
        }
    }

    function unmarkAllCPCLine() {
        try {
            var rec = currentRecord.get();
            var lineCount = rec.getLineCount({
                sublistId: 'recmachcustrecord_acme_cpc_item_header'
            });
            for (let i = 0; i < lineCount; i++) {
                rec.selectLine({
                    sublistId: 'recmachcustrecord_acme_cpc_item_header',
                    line: i
                });
                rec.setCurrentSublistValue({
                    sublistId: 'recmachcustrecord_acme_cpc_item_header',
                    fieldId: 'custrecord_sdb_selected_cpc_line',
                    value: false,
                })
                rec.commitLine({
                    sublistId: 'recmachcustrecord_acme_cpc_item_header',
                })
            }
        } catch (e) {
            console.log('error unmarkAllCPCLine', e)
        }
    }

    function removeCPCLine() {
        try {
            var rec = currentRecord.get();
            var lineCount = rec.getLineCount({
                sublistId: 'recmachcustrecord_acme_cpc_item_header'
            });
            for (let i = 0; i < lineCount; i++) {
                rec.selectLine({
                    sublistId: 'recmachcustrecord_acme_cpc_item_header',
                    line: i
                });
                var isSelected = rec.getCurrentSublistValue({
                    sublistId: 'recmachcustrecord_acme_cpc_item_header',
                    fieldId: 'custrecord_sdb_selected_cpc_line'
                })
                if (isSelected) {
                    var rebateCustomerId = rec.getCurrentSublistValue({
                        sublistId: 'recmachcustrecord_acme_cpc_item_header',
                        fieldId: 'id'
                    })
                    record.submitFields({
                        type: 'customrecord_acme_cust_price_contract_ln',
                        id: rebateCustomerId,
                        values: {
                            'custrecord_acme_cpc_item_header': '',
                        }
                    })
                }
            }
            location.reload()
        } catch (e) {
            console.log('error removeCustomer', e)
        }
    }

    function markAllCPCCust() {
        try {
            var rec = currentRecord.get();
            var lineCount = rec.getLineCount({
                sublistId: 'recmachcustrecord_acme_cpc_cust_header'
            });
            for (let i = 0; i < lineCount; i++) {
                rec.selectLine({
                    sublistId: 'recmachcustrecord_acme_cpc_cust_header',
                    line: i
                });
                rec.setCurrentSublistValue({
                    sublistId: 'recmachcustrecord_acme_cpc_cust_header',
                    fieldId: 'custrecord_sdb_selected_cpc_customer',
                    value: true,
                })
                rec.commitLine({
                    sublistId: 'recmachcustrecord_acme_cpc_cust_header',
                })
            }
        } catch (e) {
            console.log('error markAllCPCLine', e)
        }
    }

    function unmarkAllCPCCust() {
        try {
            var rec = currentRecord.get();
            var lineCount = rec.getLineCount({
                sublistId: 'recmachcustrecord_acme_cpc_cust_header'
            });
            for (let i = 0; i < lineCount; i++) {
                rec.selectLine({
                    sublistId: 'recmachcustrecord_acme_cpc_cust_header',
                    line: i
                });
                rec.setCurrentSublistValue({
                    sublistId: 'recmachcustrecord_acme_cpc_cust_header',
                    fieldId: 'custrecord_sdb_selected_cpc_customer',
                    value: false,
                })
                rec.commitLine({
                    sublistId: 'recmachcustrecord_acme_cpc_cust_header',
                })
            }
        } catch (e) {
            console.log('error unmarkAllCPCLine', e)
        }
    }

    function removeCPCCust() {
        try {
            var rec = currentRecord.get();
            var lineCount = rec.getLineCount({
                sublistId: 'recmachcustrecord_acme_cpc_cust_header'
            });
            for (let i = 0; i < lineCount; i++) {
                rec.selectLine({
                    sublistId: 'recmachcustrecord_acme_cpc_cust_header',
                    line: i
                });
                var isSelected = rec.getCurrentSublistValue({
                    sublistId: 'recmachcustrecord_acme_cpc_cust_header',
                    fieldId: 'custrecord_sdb_selected_cpc_customer'
                })
                if (isSelected) {
                    var rebateCustomerId = rec.getCurrentSublistValue({
                        sublistId: 'recmachcustrecord_acme_cpc_cust_header',
                        fieldId: 'id'
                    })
                    record.submitFields({
                        type: 'customrecord_acme_cpc_customer',
                        id: rebateCustomerId,
                        values: {
                            'custrecord_acme_cpc_cust_header': '',
                        }
                    })
                }
            }
            location.reload()
        } catch (e) {
            console.log('error removeCustomer', e)
        }
    }

    function generateExcel() {
        try {
            debugger
            var parentRecordId = currentRecord.get().id;
            if (!parentRecordId) return;
            var searchId = 6587;
            var baseURL = "/app/common/search/searchresults.nl?rectype=590&searchtype=Custom&searchid=" + searchId + "&CUSTRECORD_ACME_CPC_ITEM_HEADER=" + parentRecordId;
            var downloadURL = "&style=NORMAL&BDP_Entity_ENTITYIDtype=STARTSWITH&report=&grid=&dle=F&sortcol=Custom_SCRIPTID_raw&sortdir=ASC&csv=Export&OfficeXML=T&pdf=&size=1000&twbx=F&_csrf=SZ2droI3WogzdL6fSHDWkQXn3gynVFjEQAIwGso8Kh5D4FSIyoj76hjn2wjrj5Pi1eKiP_ZHBPpBZ0FfZsedsolom5juLp9M0efRdHgBWdzpRAwFfYTLq0bR-ANS8A2ESYN29yA2Yy1XNY3PSoOfCR98R32s2qo3wVPvRuGTPBM%3D";
            jQuery.get(baseURL + downloadURL).done(function (res) {
                var fileContent = res;
                function extractRowsContainingPattern(xmlString, pattern) {
                    var results = [];
                    var parser = new DOMParser();
                    var xmlDoc = parser.parseFromString(xmlString, 'text/xml');

                    // Get all cells (assuming cells are represented by <Cell> elements)
                    var cells = xmlDoc.getElementsByTagName('Cell');

                    // Iterate over all cells to find those containing the pattern
                    for (var i = 0; i < cells.length; i++) {
                        var cell = cells[i];
                        var data = cell.getElementsByTagName('Data')[0];

                        if (data && data.textContent.indexOf(pattern) !== -1) {
                            results.push(cell.outerHTML);
                        }
                    }

                    return results;
                }
                function getCustomer(id) {
                    var customrecord_acme_cpc_customerSearch = nlapiSearchRecord("customrecord_acme_cpc_customer", null,
                        [["custrecord_acme_cpc_cust_header", "anyof", id]], [new nlobjSearchColumn("internalid",
                            "CUSTRECORD_ACME_CPC_LINE_CUSTOMER", null)]);
                    if (!customrecord_acme_cpc_customerSearch.length) return false;
                    return customrecord_acme_cpc_customerSearch[0].valuesByKey.custrecord_acme_cpc_line_customer_internalid.value;
                }
                function removeCellsContainingPattern(xmlString, pattern) {
                    var parser = new DOMParser();
                    var serializer = new XMLSerializer();
                    var xmlDoc = parser.parseFromString(xmlString, 'text/xml');

                    // Get all cells
                    var cells = xmlDoc.getElementsByTagName('Cell');

                    // Iterate over all cells to find and remove those containing the pattern
                    for (var i = cells.length - 1; i >= 0; i--) {
                        var cell = cells[i];
                        var data = cell.getElementsByTagName('Data')[0];

                        if (data && data.textContent.indexOf(pattern) !== -1) {
                            cell.parentNode.removeChild(cell);
                        }
                    }

                    // Serialize the XML document back to a string
                    return serializer.serializeToString(xmlDoc);
                }
                function downloadFile(fileContent, id) {
                    var parser = new DOMParser();
                    var xmlDoc = parser.parseFromString(fileContent, 'text/xml');

                    // Extract rows
                    var rows = xmlDoc.getElementsByTagName('Row');
                    var csvRows = [];

                    // Extract headers from the first row
                    if (rows.length > 0) {
                        var headers = Array.from(rows[0].children).map(cell => cell.nodeName);
                        csvRows.push(headers.join(','));

                        // Extract data for each row
                        for (var row of rows) {
                            var data = Array.from(row.children).map(cell => `"${cell.textContent.replace(/"/g, '""')}"`);
                            csvRows.push(data.join(','));
                        }
                    }

                    // Convert array to CSV string
                    var csvString = csvRows.join('\n');

                    // Create a Blob from the CSV string
                    var blob = new Blob([csvString], { type: 'text/csv' });
                    var url = URL.createObjectURL(blob);

                    // Create a link element and click it to download the file
                    var a = document.createElement('a');
                    a.href = url;
                    a.download = 'CustomerPriceContract'+id+'.csv';
                    document.body.appendChild(a);
                    a.click();
                    document.body.removeChild(a);
                    // Clean up
                    URL.revokeObjectURL(url);
                }
                var customer = getCustomer(parentRecordId);
                var rows = extractRowsContainingPattern(res, '{item:');
                var itemIds = [];
                rows.forEach(function (row) {
                    if (!row) return;
                    var item = row.replaceAll('<Cell xmlns="urn:schemas-microsoft-com:office:spreadsheet" xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet" ss:StyleID="s__text"><Data ss:Type="String">{item:', '');
                    item = item.replaceAll('}</Data></Cell>', '')
                    if (item) itemIds.push(item)
                });
                var request = {
                    itemsArr: itemIds,
                    customerId: customer,
                    downloadAction: true
                }
                jQuery.ajax({
                    type: "POST",
                    url: '/app/site/hosting/scriptlet.nl?script=customscript_sdb_cpc_add_cost_column_sl&deploy=customdeploy_sdb_cpc_add_cost_column_sl',
                    data: JSON.stringify(request),
                    success: function (res) {
                        if (!res) return;
                        res = JSON.parse(res);
                        res.forEach(function (resItem) {
                            var strToReplace = '<Cell ss:StyleID="s__text"><Data ss:Type="String">{item:' + Number(resItem.itemInternalId) + '}</Data></Cell>';
                            var strReplaced = '<Cell ss:StyleID="s__text"><Data ss:Type="String">' + resItem.rebateCost + '</Data></Cell>';
                            fileContent = fileContent.replaceAll(strToReplace, strReplaced);
                        });
                        fileContent = removeCellsContainingPattern(fileContent, "{item:");
                        downloadFile(fileContent, parentRecordId);
                    }
                });
            });
        } catch (e) {
            console.log('error removeCustomer', e)
        }
    }

    return {
        pageInit: pageInit,
        markAllCustomer: markAllCustomer,
        unmarkAllCustomer: unmarkAllCustomer,
        removeCustomer: removeCustomer,
        markAllItem: markAllItem,
        unmarkAllItem: unmarkAllItem,
        removeItem: removeItem,
        markAllCPCLine: markAllCPCLine,
        unmarkAllCPCLine: unmarkAllCPCLine,
        removeCPCLine: removeCPCLine,
        markAllCPCCust: markAllCPCCust,
        unmarkAllCPCCust: unmarkAllCPCCust,
        removeCPCCust: removeCPCCust,
        generateExcel: generateExcel
    }
});
