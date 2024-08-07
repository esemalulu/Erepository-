/**
 * @NApiVersion 2.1
 * @NScriptType ClientScript
 */
define(["N/record","N/url","N/https","N/runtime","N/currentRecord","N/search"], function (record,url,https,runtime,currentRecord,search) {
    var itemLineCount;
    var itemsOnSublist = [];
    var itemsToRemoveOnCustomer = [];
    var itemsRebatesCosts = [];
    function pageInit(ctx) {
        try {
            var currentRecord = ctx.currentRecord
            itemLineCount = ctx.currentRecord.getLineCount('custpage_sublist');
            window.onbeforeunload = function () {
                return
            }
            for (let i = 0; i < itemLineCount; i++) {
                var itemId = currentRecord.getSublistValue({
                    sublistId: 'custpage_sublist',
                    fieldId: 'custpage_col_item',
                    line: i
                })
                itemsOnSublist.push(itemId)
            }
            var saveButton = document.getElementById('custpage_save');
            if (saveButton) saveButton.addEventListener('click', editCustomer);
            var removeButton = document.getElementById('tbl_custpage_sublist_remove');
            if (removeButton) removeButton.addEventListener('click', () => { getRemovedLine(currentRecord) });
            var sortButton = document.getElementById('custpage_sort');
            if (sortButton) sortButton.addEventListener('click', () => { sortSublist(currentRecord) });
            var customerId = Number(sessionStorage.getItem("customerId"));
            itemsRebatesCosts = getRebatedCostForItems(customerId);
        } catch (error) {
            console.log('pageInit ERROR: ' + error)
        }
    }
    function redirectToSuitelet(customerId) {
        try {
            sessionStorage.setItem("customerId", customerId);
            let suiteletURL = url.resolveScript({
                scriptId: 'customscript_sdb_customer_edit_item_pric',
                deploymentId: 'customdeploy_sdb_customer_edit_item_pric',
                returnExternalUrl: false,
                params: {
                    custom_param_customer: customerId
                },
            })
            window.open(suiteletURL, "_self")
        } catch (error) {
            console.log('redirectToSuitelet ERROR' + error)
        }
    }
    var newItemsPricingLines = [];
    function fieldChanged(context) {
        try {
            var myRecord = context.currentRecord;
            var customer = myRecord.getCurrentSublistValue({
                sublistId: 'custpage_sublist',
                fieldId: 'custpage_col_customer',
                line: context.line
            });
            if (!customer) {
                myRecord.selectLine({sublistId: 'custpage_sublist',line: context.line});
                myRecord.setCurrentSublistValue({sublistId: 'custpage_sublist',fieldId: 'custpage_col_customer',  value: sessionStorage.getItem("customerId")});
            }
            var item = myRecord.getCurrentSublistValue({
                sublistId: 'custpage_sublist',
                fieldId: 'custpage_col_item',
                line: context.line
            });
            var priceLevel = myRecord.getCurrentSublistValue({
                sublistId: 'custpage_sublist',
                fieldId: 'custpage_col_price_level',
                line: context.line
            });
            var currentSell = myRecord.getCurrentSublistValue({
                sublistId: 'custpage_sublist',
                fieldId: 'custpage_col_current_sell',
                line: context.line
            });
            var unitCost = myRecord.getCurrentSublistValue({ sublistId: 'custpage_sublist', fieldId: 'custpage_unit_cost', line: context.line });
            if (context.fieldId == 'custpage_current_gp') {
                var newGp = myRecord.getCurrentSublistValue({ sublistId: 'custpage_sublist', fieldId: 'custpage_current_gp', line: context.line });
                currentSell = getNewSellPrice(newGp, unitCost);
                myRecord.setCurrentSublistValue({ sublistId: 'custpage_sublist', fieldId: 'custpage_col_current_sell', value: currentSell, ignoreFieldChange: true });
            }
            else if (context.fieldId == 'custpage_col_current_sell') {
                var newCurrentSell = myRecord.getCurrentSublistValue({ sublistId: 'custpage_sublist', fieldId: 'custpage_col_current_sell', line: context.line });
                var newCurrentGp = getNewCurrentGp(newCurrentSell, unitCost);
                myRecord.setCurrentSublistValue({ sublistId: 'custpage_sublist', fieldId: 'custpage_current_gp', value: newCurrentGp, ignoreFieldChange: true });
            }
            else if (context.fieldId == 'custpage_col_item') {
                var newItem = myRecord.getCurrentSublistValue({ sublistId: 'custpage_sublist', fieldId: 'custpage_col_item', line: context.line });
                var itemObj = getUnitCostItem(newItem);
                var rebateCost = itemsRebatesCosts?.find(item => item?.itemId == newItem);
                var costType = rebateCost ? "Contracted Cost" : "Item Defined Cost";
                var unitCost = rebateCost?.itemRebateCost ? Number(rebateCost.itemRebateCost) + Number((rebateCost.itemRebateCost * 0.03)) : itemObj.unitCost
                myRecord.setCurrentSublistValue({ sublistId: 'custpage_sublist', fieldId: 'custpage_unit_cost', value: parseFloat(unitCost)?.toFixed(2) , ignoreFieldChange: true });
                myRecord.setCurrentSublistValue({ sublistId: 'custpage_sublist', fieldId: 'custpage_col_price_level', value: -1 });
                myRecord.setCurrentSublistValue({ sublistId: 'custpage_sublist', fieldId: 'custpage_commodity', value: itemObj.commodity, ignoreFieldChange: true });
                myRecord.setCurrentSublistValue({ sublistId: 'custpage_sublist', fieldId: 'custpage_current_gp', value: 0, ignoreFieldChange: true });
                myRecord.setCurrentSublistValue({ sublistId: 'custpage_sublist', fieldId: 'custpage_cost_type', value: costType, ignoreFieldChange: true });
            }
            var newItemPriceObj = {
                item: item,
                priceLevel: priceLevel,
                currentsell: currentSell
            }
            if (newItemPriceObj.item && newItemPriceObj.priceLevel) {
                var objExists = newItemsPricingLines.findIndex(obj => obj.item == newItemPriceObj.item);
                if (objExists >= 0) newItemsPricingLines[objExists] = newItemPriceObj;
                if (objExists == -1) {
                    newItemsPricingLines.push(newItemPriceObj)
                    itemsOnSublist.push(newItemPriceObj.item)
                }
            }
        } catch (error) {
            console.log('fieldChanged ERROR' + error)
        }
    }
    function lineInit(context){
        try {
            var currentRecord = context.currentRecord;
            var sublistName = context.sublistId;
            var priceLevel = currentRecord.getCurrentSublistValue({sublistId: sublistName,fieldId: 'custpage_col_price_level'});
            console.log("lineInit price level",priceLevel);
            var currentSellField = currentRecord.getCurrentSublistField({ sublistId: sublistName, fieldId: 'custpage_col_current_sell', line: context.line });
            var currentGpField = currentRecord.getCurrentSublistField({ sublistId: sublistName, fieldId: 'custpage_current_gp', line: context.line });
            if(priceLevel == -1){ //price level -1 = 'custom'
                currentSellField.isDisabled = false;
                currentGpField.isDisabled = false;
            }else{
                currentSellField.isDisabled = true;
                currentGpField.isDisabled = true;
            }
        } catch (error) {
            log.error("lineInit ", error);
        }
    }

    function getNewCurrentGp(newCurrentSell, unitCost) {
        try {
            var grossProfit = newCurrentSell - unitCost;
            var grossProfitPercentage = (grossProfit / newCurrentSell) * 100;
            return grossProfitPercentage.toFixed(2);
        } catch (error) {
            console.log("getNewCurrentGp error " + error)
        }
    }
    function getRemovedLine(currentRecord) {
        try {
            var currIndex = currentRecord.getCurrentSublistIndex({
                sublistId: 'custpage_sublist'
            });
            var removedItem = itemsOnSublist[currIndex]
            itemsOnSublist = itemsOnSublist.filter(item => item != removedItem)
            itemsToRemoveOnCustomer.push(removedItem)
            newItemsPricingLines = newItemsPricingLines.filter(obj => obj?.item != removedItem)
        } catch (error) {
            console.log('getRemovedLine' + error)
        }
    }

    function validateField(context) {
        try {
            var currentRecord = context.currentRecord;
            var sublistName = context.sublistId;
            var sublistFieldName = context.fieldId;
            if (sublistName === 'custpage_sublist') {
                if (sublistFieldName === 'custpage_col_current_sell') {
                    var currentSellField = currentRecord.getCurrentSublistField({ sublistId: sublistName, fieldId: 'custpage_col_current_sell', line: context.line });
                    var currentGpField = currentRecord.getCurrentSublistField({ sublistId: sublistName, fieldId: 'custpage_current_gp', line: context.line });
                    var currentSellValue = currentRecord.getCurrentSublistValue({ sublistId: sublistName, fieldId: 'custpage_col_current_sell', line: context.line });
                    var currentSellValueNumber = Number(currentSellValue)
                    var lineForm = currentRecord.selectLine({
                        sublistId: 'custpage_sublist',
                        line: context.line
                    });
                    if (currentRecord.getCurrentSublistValue({ sublistId: sublistName, fieldId: 'custpage_col_price_level' }) == -1 && (!currentSellValue || currentSellValue < 0 || !currentSellValueNumber)) {
                        alert("For 'Custom' Price Level the current sell must be greater or equal than 0 ");
                        currentRecord.setCurrentSublistValue({ sublistId: sublistName, fieldId: 'custpage_col_current_sell', value: 1 });
                    }
                    if (currentRecord.getCurrentSublistValue({ sublistId: sublistName, fieldId: 'custpage_col_price_level' }) != -1 && currentRecord.getCurrentSublistValue({ sublistId: sublistName, fieldId: sublistFieldName })) {
                        currentSellField.isDisabled = true;
                        currentGpField.isDisabled = true;
                    }
                }
                if (sublistFieldName === 'custpage_col_price_level') {
                    var currentSellField = currentRecord.getCurrentSublistField({ sublistId: sublistName, fieldId: 'custpage_col_current_sell', line: context.line });
                    var currentGpField = currentRecord.getCurrentSublistField({ sublistId: sublistName, fieldId: 'custpage_current_gp', line: context.line });
                    if (currentRecord.getCurrentSublistValue({ sublistId: sublistName, fieldId: 'custpage_col_price_level' }) != -1) {
                        var lineForm = currentRecord.selectLine({ sublistId: 'custpage_sublist', line: context.line });
                        currentRecord.setCurrentSublistValue({ sublistId: sublistName, fieldId: 'custpage_col_current_sell', value: 'N/A' })
                        currentRecord.setCurrentSublistValue({ sublistId: sublistName, fieldId: 'custpage_current_gp', value: 'N/A', ignoreFieldChange: true })
                        currentSellField.isDisabled = true;
                        currentGpField.isDisabled = true;
                    } else {
                        var unitCost = currentRecord.getCurrentSublistValue({ sublistId: sublistName, fieldId: 'custpage_unit_cost' }) || 0
                        currentRecord.setCurrentSublistValue({ sublistId: sublistName, fieldId: 'custpage_col_current_sell', value: unitCost })
                        currentSellField.isDisabled = false;
                        currentGpField.isDisabled = false;
                    }
                }
                if (sublistFieldName === 'custpage_current_gp') {
                    var curentGp = currentRecord.getCurrentSublistValue({ sublistId: sublistName, fieldId: 'custpage_current_gp', line: context.line });
                    var curentGpNumber = Number(curentGp);
                    if (!curentGp || curentGp <= 0 || curentGp >= 100 || !curentGpNumber) {
                        alert('Gross Profit % must be a number bigger than 0 and less than 100')
                        currentRecord.setCurrentSublistValue({ sublistId: sublistName, fieldId: 'custpage_current_gp', value: 1 });
                    }
                }
            }
            return true;
        } catch (error) {
            console.log("error validateField" + error)
        }
    }
    function getNewSellPrice(newGpPercent, unitCost) {
        try {
            var newSellPrice = unitCost / (1 - (newGpPercent / 100));
            return newSellPrice.toFixed(2);
        } catch (error) {
            console.log("updateSellPrice" + error)
        }
    }
    function editCustomer() {
        try {
            if (newItemsPricingLines.length > 0 || itemsToRemoveOnCustomer.length > 0) {
                var customerId = Number(sessionStorage.getItem("customerId"))

                var custom_param_data = {
                    custom_param_item_pricing_to_insert: newItemsPricingLines,
                    custom_param_customer_id: customerId,
                    custom_param_item_pricing_to_remove: itemsToRemoveOnCustomer
                }

                let suitelet = url.resolveScript({
                    scriptId: 'customscript_sdb_customer_edit_item_pric',
                    deploymentId: 'customdeploy_sdb_customer_edit_item_pric',
                    returnExternalUrl: false,
                    params: {
                        custom_param_data: JSON.stringify(custom_param_data)
                    },
                })

                var response = https.post({
                    url: suitelet
                });
            }
            var account = runtime.accountId
            if (account.includes("_")) {
                account = account.replace("_", "-")
            }
            if (!customerId) customerId = Number(sessionStorage.getItem("customerId"))

            var urlCustomer = 'https://' + account + '.app.netsuite.com/app/common/entity/custjob.nl?id=' + customerId

            location.href = urlCustomer;
            window.open(urlCustomer, "_self")

        } catch (error) {
            console.log('editCustomer ERROR' + error)
        }
    }

    function sortSublist(currentRecord) {
        try {
            var selectedSort = currentRecord.getValue('custpage_sort_select')
            var isAscendingSort = currentRecord.getValue('custpage_ascending_sort')
            var customer = sessionStorage.getItem("customerId");
            let suiteletURL = url.resolveScript({
                scriptId: 'customscript_sdb_customer_edit_item_pric',
                deploymentId: 'customdeploy_sdb_customer_edit_item_pric',
                returnExternalUrl: false,
                params: {
                    custom_param_customer: customer,
                    custom_param_sortOption: selectedSort,
                    custom_param_isAscendingSort: isAscendingSort
                },
            })
            window.open(suiteletURL, "_self")
        } catch (error) {
            console.log("sortSublist Error" + error)
        }
    }

    function cancelEdition(customerId) {
        try {
            var account = runtime.accountId

            if (account.includes("_")) {
                account = account.replace("_", "-")
            }

            if (!customerId) customerId = Number(sessionStorage.getItem("customerId"))
            var urlCustomer = 'https://' + account + '.app.netsuite.com/app/common/entity/custjob.nl?id=' + customerId

            location.href = urlCustomer;
            window.open(urlCustomer, "_self")
        } catch (error) {
            console.log('CalcelEdition ERROR' + error)
        }
    }
    function getRebatedCostForItems(customerId) {
        try {
            if(!customerId)return
            var itemsRebatesCosts = [];
            var rebateCostItemSearch = search.create({
                type: "customrecord_rebate_parent",
                filters:
                    [
                        ["isinactive", "is", "F"],
                        "AND",
                        ["custrecord_rebate_start_date", "onorbefore", "today"],
                        "AND",
                        ["custrecord_rebate_end_date", "onorafter", "today"],
                        "AND",
                        ["custrecord_rebate_customer_rebate_parent.custrecord_rebate_customer_customer", "anyof", customerId],
                    ],
                columns:
                    [
                        search.createColumn({ name: "internalid", join: "CUSTRECORD_REBATE_ITEMS_PARENT", label: "Internal ID" }),
                        search.createColumn({ name: "custrecord_rebate_items_item", join: "CUSTRECORD_REBATE_ITEMS_PARENT", label: "Item" }),
                        search.createColumn({ name: "custrecord_rebate_items_rebate_cost", join: "CUSTRECORD_REBATE_ITEMS_PARENT", label: "Rebate Cost" }),
                    ]
            });
            var searchResultCount = rebateCostItemSearch.runPaged().count;
            for (let i = 0; i < searchResultCount; i = i + 1000) {
                var resultSet = rebateCostItemSearch.run();
                var start = i;
                var end = start + 1000;
                var results = resultSet.getRange({ start: start, end: end });
                results.forEach(result => {
                    itemsRebatesCosts.push({
                        itemId: result.getValue({ name: "custrecord_rebate_items_item", join: "CUSTRECORD_REBATE_ITEMS_PARENT" }),
                        itemRebateCost: result.getValue({ name: "custrecord_rebate_items_rebate_cost", join: "CUSTRECORD_REBATE_ITEMS_PARENT" }),
                    })
                });
            }
            return itemsRebatesCosts
        } catch (error) {
            console.log('getRebatedCostForItems ERROR: ' + 'Customer id:' + customerId, error)
        }
    }
    function getUnitCostItem(item) {
        try {
            var itemObj = { unitCost: 0, commodity: ' ' };
            var item_values_search = search.create({
                type: "item",
                filters:
                    [
                        ["internalid", "anyof", item]
                    ],
                columns:
                    [
                        search.createColumn({ name: "internalid", label: "Internal ID" }),
                        search.createColumn({ name: "baseprice", label: "Base Price" }),
                        search.createColumn({ name: "custitem_acc_commodity_code", label: "Commodity Code" }),
                    ]
            });
            item_values_search.run().each(function (result) {
                itemObj.unitCost = result.getValue({ name: 'baseprice' }) || 0
                itemObj.commodity = result.getText({ name: 'custitem_acc_commodity_code' }) || ' '
                return false;
            });
            return itemObj;
        } catch (error) {
            console.log("getUnitCostItem Error" + error)
        }
    }
    //clientScript
    function downloadExcel(context) {
        try {
            var customer = Number(sessionStorage.getItem("customerId"));
            var bodyData = getSublistData();
            if(!bodyData || bodyData.length==0){
                alert("This customer does not has Item pricing lines");
                return;
            }
            var bodyObj = JSON.stringify(bodyData);
            log.debug("bodyObj",bodyObj);

            var suitelet = https.requestSuitelet({
                scriptId: 'customscript_sdb_customer_edit_item_pric',
                deploymentId: 'customdeploy_sdb_customer_edit_item_pric',
                urlParams: {
                    custom_param_customer: customer,
                    download_excel: true
                },
                method: "POST",
                body: bodyObj,
                external: false
            });
            log.debug("suitelet",suitelet);
            log.debug("suitelet.body",suitelet.body)
            var suiteletBody = JSON.parse(suitelet.body);
            log.debug("suiteletBody",suiteletBody)
            var host = url.resolveDomain({
                hostType: url.HostType.APPLICATION
            });
            log.debug("host",host)

            window.open("https://" + host + suiteletBody, "_blank");

        } catch (error) {
            log.error({
                title: 'downloadExcel',
                details: error
            });
        }
    }

    function getSublistData() {
        try {
            var currentRecordObj = currentRecord.get();
            var sublistData = [];
            var itemLineCount = currentRecordObj.getLineCount({sublistId: 'custpage_sublist' });
            for (var i = 0; i < itemLineCount; i++) {
                var lineData = {
                    customer : currentRecordObj.getSublistText({
                        sublistId: 'custpage_sublist',
                        fieldId: 'custpage_col_customer',
                        line: i
                    })?.replaceAll(',',''),
                    item : currentRecordObj.getSublistText({
                        sublistId: 'custpage_sublist',
                        fieldId: 'custpage_col_item',
                        line: i
                    })?.replaceAll(',',''),
                    priceLevel : currentRecordObj.getSublistText({
                        sublistId: 'custpage_sublist',
                        fieldId: 'custpage_col_price_level',
                        line: i
                    })?.replaceAll(',',''),
                    commodity : currentRecordObj.getSublistText({
                        sublistId: 'custpage_sublist',
                        fieldId: 'custpage_commodity',
                        line: i
                    })?.replaceAll(',',''),
                    currentSell : currentRecordObj.getSublistText({
                        sublistId: 'custpage_sublist',
                        fieldId: 'custpage_col_current_sell',
                        line: i
                    })?.replaceAll(',',''),
                    unitCost : currentRecordObj.getSublistText({
                        sublistId: 'custpage_sublist',
                        fieldId: 'custpage_unit_cost',
                        line: i
                    })?.replaceAll(',',''),//---
                    currentGp : currentRecordObj.getSublistText({
                        sublistId: 'custpage_sublist',
                        fieldId: 'custpage_current_gp',
                        line: i
                    })?.replaceAll(',',''),
                    saleDate : currentRecordObj.getSublistText({
                        sublistId: 'custpage_sublist',
                        fieldId: 'custpage_last_sale_date',
                        line: i
                    })?.replaceAll(',',''),
                    lastSell : currentRecordObj.getSublistText({
                        sublistId: 'custpage_sublist',
                        fieldId: 'custpage_last_sell',
                        line: i
                    })?.replaceAll(',',''),
                    lastCost : currentRecordObj.getSublistText({
                        sublistId: 'custpage_sublist',
                        fieldId: 'custpage_last_cost',
                        line: i
                    })?.replaceAll(',',''),
                    lastGp : currentRecordObj.getSublistText({
                        sublistId: 'custpage_sublist',
                        fieldId: 'custpage_last_gp',
                        line: i
                    })?.replaceAll(',',''),
                    lastQuantity : currentRecordObj.getSublistText({
                        sublistId: 'custpage_sublist',
                        fieldId: 'custpage_last_quantity',
                        line: i
                    })?.replaceAll(',',''),
                    whAvail : currentRecordObj.getSublistText({
                        sublistId: 'custpage_sublist',
                        fieldId: 'custpage_wh_avail',
                        line: i
                    })?.replaceAll(',',''),
                    costType : currentRecordObj.getSublistText({
                        sublistId: 'custpage_sublist',
                        fieldId: 'custpage_cost_type',
                        line: i
                    })?.replaceAll(',','')
                };
                sublistData.push(lineData);
            }
            return sublistData;
        } catch (error) {
            log.error("getSublistData error", error)
        }
    }
    return {
        pageInit,
        redirectToSuitelet: redirectToSuitelet,
        fieldChanged: fieldChanged,
        editCustomer: editCustomer,
        cancelEdition: cancelEdition,
        validateField: validateField,
        downloadExcel:downloadExcel,
        lineInit:lineInit
    };
});