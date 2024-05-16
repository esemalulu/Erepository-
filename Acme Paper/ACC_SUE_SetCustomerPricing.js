/**
 * @NApiVersion 2.1
 * @NScriptType UserEventScript
 *
 */
define(['N/record', 'N/runtime', 'N/task', 'N/search', 'N/log', 'N/runtime'],
    function (record, runtime, task, search, log, runtime) {

        function afterSubmit(context) {
            try {
                var userObj = runtime.getCurrentUser()
                log.audit('Record ID', context.newRecord.id)
                if (userObj.id != 75190) { //2 High Jump id
                    let rec = record.load({
                        type: context.newRecord.type,
                        id: context.newRecord.id,
                    })
                    let customer = rec.getValue({ fieldId: 'entity' });
                    let lineItems = getPermanentPricedLines(rec);
                    log.debug('lineItems', lineItems);

                    // ------------- Rebate prices and Margin on user Event --------------------
                    if (rec.getValue('custbody_aps_entered_by') == 66155 || rec.getValue('custbody_aps_entered_by') == 84216) { //If its entered by DCKAP or sps web services (id 66155 and 84216 hardcoded)
                        let lineCount = rec.getLineCount({
                            sublistId: 'item'
                        });
                        let isDropShip = rec.getValue({
                            fieldId: 'custbody_dropship_order'
                        });
                        for (let i = 0; i < lineCount; i++) {
                            let itemId = rec.getSublistValue({
                                sublistId: 'item',
                                fieldId: 'item',
                                line: i
                            });
                            let customerId = rec.getValue({
                                fieldId: 'entity'
                            });
                            if (isDropShip) { //Dropship logic for cost
                                let finalCost;
                                let costType = 'CUSTOM'
                                let rebatePrice = getRebatePrice(itemId, customerId, isDropShip);
                                let vendorPrice = getVendorPrice(itemId, isDropShip);
                                if (rebatePrice.rebateCost != -1 && vendorPrice != -1) {
                                    finalCost = Math.min(rebatePrice.rebateCost, vendorPrice);
                                    if (finalCost == vendorPrice) {
                                        costType = 'PREFVENDORRATE'
                                    }
                                    rec.setSublistValue({
                                        sublistId: 'item',
                                        fieldId: 'costestimatetype',
                                        line: i,
                                        value: costType
                                    })
                                    rec.setSublistValue({
                                        sublistId: 'item',
                                        fieldId: 'custcol_acc_unitcost',
                                        line: i,
                                        value: finalCost
                                    })
                                    rec.setSublistValue({
                                        sublistId: 'item',
                                        fieldId: 'custcol_rebate_parent_id',
                                        line: i,
                                        value: rebatePrice.rebateId
                                    })
                                    rec.setSublistValue({
                                        sublistId: 'item',
                                        fieldId: 'custcol_rebate_cost',
                                        line: i,
                                        value: rebatePrice.rebateCost
                                    })
                                   // if (costType == 'CUSTOM') {
                                        var lineQty = Number(rec.getSublistValue({
                                            sublistId: 'item',
                                            fieldId: 'quantity',
                                            line: i
                                        }))
                                        lineQty = lineQty - Number(rec.getSublistValue({
                                            sublistId: 'item',
                                            fieldId: 'quantitybackordered',
                                            line: i
                                        }))
                                        rec.setSublistValue({
                                            sublistId: 'item',
                                            fieldId: 'costestimate',
                                            line: i,
                                            value: lineQty * Number(finalCost)
                                        })
                                        log.audit('lineQty * Number(finalCost)', lineQty * Number(finalCost))
                                  //  }
                                }
                                else if (rebatePrice != -1 && vendorPrice == -1) {
                                    rec.setSublistValue({
                                        sublistId: 'item',
                                        fieldId: 'costestimatetype',
                                        line: i,
                                        value: costType
                                    })
                                    rec.setSublistValue({
                                        sublistId: 'item',
                                        fieldId: 'custcol_acc_unitcost',
                                        line: i,
                                        value: rebatePrice.rebateCost
                                    })
                                    rec.setSublistValue({
                                        sublistId: 'item',
                                        fieldId: 'custcol_rebate_parent_id',
                                        line: i,
                                        value: rebatePrice.rebateId
                                    })
                                    rec.setSublistValue({
                                        sublistId: 'item',
                                        fieldId: 'custcol_rebate_cost',
                                        line: i,
                                        value: rebatePrice.originalCost
                                    })
                                    var lineQty = Number(rec.getSublistValue({
                                        sublistId: 'item',
                                        fieldId: 'quantity',
                                        line: i
                                    }))
                                    lineQty = lineQty - Number(rec.getSublistValue({
                                        sublistId: 'item',
                                        fieldId: 'quantitybackordered',
                                        line: i
                                    }))
                                    rec.setSublistValue({
                                        sublistId: 'item',
                                        fieldId: 'costestimate',
                                        line: i,
                                        value: lineQty * Number(rebatePrice.rebateCost)
                                    })
                                    log.audit('set costestimate2', lineQty * Number(rebatePrice.rebateCost))
                                }
                                else if (rebatePrice == -1 && vendorPrice != -1) {
                                    rec.setSublistValue({
                                        sublistId: 'item',
                                        fieldId: 'costestimatetype',
                                        line: i,
                                        value: 'PREFVENDORRATE'
                                    })
                                    rec.setSublistValue({
                                        sublistId: 'item',
                                        fieldId: 'custcol_acc_unitcost',
                                        line: i,
                                        value: vendorPrice
                                    })
                                    var lineQty = Number(rec.getSublistValue({
                                        sublistId: 'item',
                                        fieldId: 'quantity',
                                        line: i
                                    }))
                                    lineQty = lineQty - Number(rec.getSublistValue({
                                        sublistId: 'item',
                                        fieldId: 'quantitybackordered',
                                        line: i
                                    }))
                                    rec.setSublistValue({
                                        sublistId: 'item',
                                        fieldId: 'costestimate',
                                        line: i,
                                        value: lineQty * Number(vendorPrice)
                                    })
                                }
                            }
                            else { //Standard order logic for cost
                                let rebateStandard = getRebatePrice(itemId, customerId, isDropShip);
                                if (rebateStandard.rebateCost != -1) {
                                    log.audit('set costestimatetype', rebateStandard)
                                    rec.setSublistValue({
                                        sublistId: 'item',
                                        fieldId: 'costestimatetype',
                                        line: i,
                                        value: 'CUSTOM'
                                    })
                                    rec.setSublistValue({
                                        sublistId: 'item',
                                        fieldId: 'custcol_acc_unitcost',
                                        line: i,
                                        value: rebateStandard.rebateCost
                                    })
                                    rec.setSublistValue({
                                        sublistId: 'item',
                                        fieldId: 'custcol_rebate_parent_id',
                                        line: i,
                                        value: rebateStandard.rebateId
                                    })
                                    rec.setSublistValue({
                                        sublistId: 'item',
                                        fieldId: 'custcol_rebate_cost',
                                        line: i,
                                        value: rebateStandard.originalCost
                                    })
                                    var lineQty = Number(rec.getSublistValue({
                                        sublistId: 'item',
                                        fieldId: 'quantity',
                                        line: i
                                    }))
                                    lineQty = lineQty - Number(rec.getSublistValue({
                                        sublistId: 'item',
                                        fieldId: 'quantitybackordered',
                                        line: i
                                    }))
                                    log.error('quantitybackordered', rec.getSublistValue({
                                        sublistId: 'item',
                                        fieldId: 'quantitybackordered',
                                        line: i
                                    }))
                                    rec.setSublistValue({
                                        sublistId: 'item',
                                        fieldId: 'costestimate',
                                        line: i,
                                        value: lineQty * Number(rebateStandard.rebateCost)
                                    })
                                    log.debug('set costestimate', lineQty * Number(rebateStandard.rebateCost))
                                }
                                else {
                                    let loadedCost = getLoadedCost(itemId)
                                    log.audit('set loadedCost', loadedCost)
                                    rec.setSublistValue({
                                        sublistId: 'item',
                                        fieldId: 'costestimatetype',
                                        line: i,
                                        value: 'ITEMDEFINED'
                                    })
                                    if (loadedCost != -1) {
                                        rec.setSublistValue({
                                            sublistId: 'item',
                                            fieldId: 'custcol_acc_unitcost',
                                            line: i,
                                            value: loadedCost
                                        })
                                        var lineQty = Number(rec.getSublistValue({
                                            sublistId: 'item',
                                            fieldId: 'quantity',
                                            line: i
                                        }))
                                        lineQty = lineQty - Number(rec.getSublistValue({
                                            sublistId: 'item',
                                            fieldId: 'quantitybackordered',
                                            line: i
                                        }))
                                        rec.setSublistValue({
                                            sublistId: 'item',
                                            fieldId: 'costestimate',
                                            line: i,
                                            value: lineQty * Number(loadedCost)
                                        })
                                    }
                                }
                            }
                            let sellPrice = Number(rec.getSublistValue({
                                sublistId: 'item',
                                fieldId: 'rate',
                                line: i
                            }))
                            let cogs = Number(rec.getSublistValue({
                                sublistId: 'item',
                                fieldId: 'custcol_acc_unitcost',
                                line: i
                            }))
                            if (cogs) {
                                let grossMargin = ((sellPrice - cogs) / sellPrice) * 100
                                rec.setSublistValue({
                                    sublistId: 'item',
                                    fieldId: 'custcol_acme_markup_percent',
                                    line: i,
                                    value: grossMargin.toFixed(2)
                                })
                            }
                        }
                    }

                    //--------------------------------------------------------------

                    /* let allLines = getAllLines(rec);
                    log.debug('allLines', allLines)
                    setExxTotal(allLines, rec); */

                    if (isEmpty(lineItems)) {
                        return;
                    }

                    let customerId = updateCustomerSpecificPricing(lineItems, customer, rec);
                    log.debug('customerId', customerId)
                    if (!isEmpty(customerId)) {
                        log.debug('entra', 'entra')
                        updatePricedLines(lineItems, rec);
                    }

                    rec.save()

                }
            }
            catch (error) {
                log.error('Error in beforeSubmit', error.toString());
            }
        }

        function getPermanentPricedLines(rec) {
            try {
                var lineCount = rec.getLineCount({ sublistId: 'item' });
                var itemsArr = [];
                for (var i = 0; i < lineCount; i++) {
                    var permanentPrice = rec.getSublistValue({ sublistId: 'item', fieldId: 'custcol_acme_permanent_price', line: i });
                    var permanentPriceUpdated = rec.getSublistValue({ sublistId: 'item', fieldId: 'custcol_acme_permanent_price_updated', line: i });
                    log.debug('permanentPrice', permanentPrice)
                    log.debug('permanentPriceUpdated', permanentPriceUpdated)
                    if (permanentPrice == true && permanentPriceUpdated == false) {
                        var item = rec.getSublistValue({ sublistId: 'item', fieldId: 'item', line: i });
                        var qty = rec.getSublistValue({ sublistId: 'item', fieldId: 'quantity', line: i });
                        var price = rec.getSublistValue({ sublistId: 'item', fieldId: 'rate', line: i });
                        itemsArr.push({ line: i, item: item, price: price, ex_total: (Number(price) * Number(qty)) });
                    }
                }
                return itemsArr;
            }
            catch (error) {
                log.error('Error in permanentPricedLines', error.toString());
            }
        }

        function getAllLines(rec) {
            try {
                var lineCount = rec.getLineCount({ sublistId: 'item' });
                var itemsArr = [];
                for (var i = 0; i < lineCount; i++) {
                    var item = rec.getSublistValue({ sublistId: 'item', fieldId: 'item', line: i });
                    var qty = rec.getSublistValue({ sublistId: 'item', fieldId: 'quantity', line: i });
                    var price = rec.getSublistValue({ sublistId: 'item', fieldId: 'rate', line: i });
                    itemsArr.push({ line: i, item: item, price: price, ex_total: (Number(price) * Number(qty)) });
                }
                return itemsArr;
            }
            catch (error) {
                log.error('Error in permanentPricedLines', error.toString());
            }
        }

        function setExxTotal(lineItems, rec) {
            try {
                if (!lineItems.length) return;
                for (var i = 0; i < lineItems.length; i++) {
                    var item_line = rec.findSublistLineWithValue({
                        sublistId: 'item',
                        fieldId: 'item',
                        value: lineItems[i].item
                    });
                    rec.setSublistValue({ line: item_line, sublistId: 'item', fieldId: 'amount', value: lineItems[i].ex_total.toFixed(2) });
                }
            } catch (error) {
                log.debug("Error in setExxTotal", error);
            }
        }

        function updateCustomerSpecificPricing(lineItems, customer, rec) {
            try {
                var customerRec = record.load({ type: 'customer', id: customer, isDynamic: true });
                for (var i = 0; i < lineItems.length; i++) {
                    var line = customerRec.findSublistLineWithValue({
                        sublistId: 'itempricing',
                        fieldId: 'item',
                        value: lineItems[i].item
                    });
                    log.debug('debug ', 'Line=' + line);
                    if (line == -1) {
                        customerRec.selectNewLine({ sublistId: 'itempricing' });
                        customerRec.setCurrentSublistValue({ sublistId: 'itempricing', fieldId: 'item', value: lineItems[i].item });
                        customerRec.setCurrentSublistValue({ sublistId: 'itempricing', fieldId: 'level', value: -1 });
                        customerRec.setCurrentSublistValue({ sublistId: 'itempricing', fieldId: 'price', value: lineItems[i].price.toFixed(2) });
                        customerRec.commitLine({ sublistId: 'itempricing' });

                    }
                    else {
                        customerRec.selectLine({ sublistId: 'itempricing', line: line });
                        customerRec.setCurrentSublistValue({ sublistId: 'itempricing', fieldId: 'level', value: -1 });
                        customerRec.setCurrentSublistValue({ sublistId: 'itempricing', fieldId: 'price', value: lineItems[i].price.toFixed(2) });
                        customerRec.commitLine({ sublistId: 'itempricing' });
                    }
                }
                var customerId = customerRec.save();
                return customerId;
            }
            catch (error) {
                log.error('Error in updateCustomerSpecificPricing', error.toString());
            }
        }

        function updatePricedLines(lineItems, rec) {
            try {
                for (var i = 0; i < lineItems.length; i++) {
                    rec.setSublistValue({ sublistId: 'item', fieldId: 'custcol_acme_permanent_price_updated', line: lineItems[i].line, value: true });
                }
            }
            catch (error) {
                log.error('Error in updatePricedLines', error.toString());
            }
        };

        function isEmpty(stValue) {
            if ((stValue == null) || (stValue == '') || (stValue == ' ') || (stValue == undefined)) {
                return true;
            } else {
                return false;
            }
        };

        function getRebatePrice(itemId, customerId, isDropShip) {
            try {
                let rebateObj = {
                    rebateCost: -1,
                    rebateId: -1,
                    originalCost: -1
                }
                var customrecord_rebate_parentSearchObj = search.create({
                    type: "customrecord_rebate_parent",
                    filters:
                        [
                            ["custrecord_rebate_customer_rebate_parent.custrecord_rebate_customer_customer", "anyof", customerId],
                            "AND",
                            ["custrecord_rebate_items_parent.custrecord_rebate_items_item", "anyof", itemId]
                        ],
                    columns:
                        [
                            search.createColumn({
                                name: "custrecord_rebate_items_rebate_cost",
                                join: "CUSTRECORD_REBATE_ITEMS_PARENT",
                                label: "Rebate Cost"
                            }),
                            search.createColumn({ name: "custrecord_rebate_additional_load_cb", label: "Additional Load" }),
                            search.createColumn({ name: "custrecord_rebate_load_value", label: "Load Value (Margin)" })
                        ]
                });
                customrecord_rebate_parentSearchObj.run().each(function (result) {
                    rebateObj.rebateCost = Number(result.getValue({
                        name: "custrecord_rebate_items_rebate_cost",
                        join: "CUSTRECORD_REBATE_ITEMS_PARENT"
                    }))
                    rebateObj.originalCost = rebateObj.rebateCost;
                    rebateObj.rebateId = result.id
                    if (isDropShip === false || isDropShip === 'F') {
                        let additionalLoad = result.getValue('custrecord_rebate_additional_load_cb')
                        if (additionalLoad === true || additionalLoad === 'T') {
                            let loadValue = Number(result.getValue('custrecord_rebate_load_value'));
                            let qtyToAdd = Number((rebateObj.rebateCost * loadValue) / 100)
                            rebateObj.rebateCost = rebateObj.rebateCost + qtyToAdd
                            log.debug('REBATE COST', rebateObj.rebateCost)
                        }
                    }
                    return false;
                });
                return rebateObj;
            } catch (e) {
                log.error('error at getRebatePrice', e)
            }
        };

        function getVendorPrice(itemId) {
            try {
                let vendorCost = -1;
                var itemSearchObj = search.create({
                    type: "item",
                    filters:
                        [
                            ["internalid", "anyof", itemId]
                        ],
                    columns:
                        [
                            search.createColumn({ name: "vendorcost", label: "Vendor Price" })
                        ]
                });
                itemSearchObj.run().each(function (result) {
                    let newVendorCost = result.getValue('vendorcost');
                    if (newVendorCost) {
                        vendorCost = newVendorCost
                    }
                    return false;
                });
                return vendorCost
            } catch (e) {
                log.error('Error at getVendorPrice', e)
            }
        };

        function getLoadedCost(itemId) {
            try {
                let loadedCost = -1;
                var itemSearchObj = search.create({
                    type: "item",
                    filters:
                        [
                            ["internalid", "anyof", itemId]
                        ],
                    columns:
                        [
                            search.createColumn({ name: "costestimate", label: "Item Defined Cost" })
                        ]
                });
                itemSearchObj.run().each(function (result) {
                    let newLoadedCost = result.getValue('costestimate');
                    if (newLoadedCost) {
                        loadedCost = newLoadedCost
                    }
                    return false;
                });
                return loadedCost
            } catch (error) {
                log.error('Error at getLoadedCost', error)
            }
        }

        return {
            afterSubmit: afterSubmit
        };
    });