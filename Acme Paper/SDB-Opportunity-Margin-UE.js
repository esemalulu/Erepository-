/**
 * @NApiVersion 2.1
 * @NScriptType UserEventScript
 * @NModuleScope SameAccount
 */
define(['N/record', 'N/search', 'N/runtime', 'N/url', 'N/runtime'],
    function (record, search, runtime, url, runtime) {

        function afterSubmit(scriptContext) {
            if (scriptContext.type != scriptContext.UserEventType.DELETE) {
                var userObj = runtime.getCurrentUser();
                if (userObj.id != 75190) { //2 High Jump id

                    //SET CUSTOMER PRICING SCRIPT LOGIC
                    try {
                        var rec = record.load({
                            type: scriptContext.newRecord.type,
                            id: scriptContext.newRecord.id,
                        });

                        // ------------- Rebate prices and Margin on user Event --------------------
                        let lineCount = rec.getLineCount({
                            sublistId: 'item'
                        });
                        for (let i = 0; i < lineCount; i++) {

                            let sellPrice = Number(rec.getSublistValue({
                                sublistId: 'item',
                                fieldId: 'amount',
                                line: i
                            }))
                            log.audit("SellPrice", sellPrice)
                            let cogs = Number(rec.getSublistValue({
                                sublistId: 'item',
                                fieldId: 'costestimate',
                                line: i
                            }))
                            log.audit("cogs", cogs)
                            if (cogs) {
                                let grossMargin = ((sellPrice - cogs) / sellPrice) * 100
                                log.audit("grossMargin", grossMargin)
                                if (grossMargin.toFixed(2) == Number.POSITIVE_INFINITY || grossMargin.toFixed(2) == Number.NEGATIVE_INFINITY) grossMargin = 99999999;
                                rec.setSublistValue({
                                    sublistId: 'item',
                                    fieldId: 'custcol_acme_markup_percent',
                                    line: i,
                                    value: grossMargin.toFixed(2)
                                })

                                log.debug('margin', grossMargin.toFixed(2));
                            }
                        }
                    }
                    catch (error) {
                        log.error('Error at SetCustmerPricing', error.toString());
                    }
                    rec.save()
                }
            }
        }//End


        function getPermanentPricedLines(rec) {
            try {
                var lineCount = rec.getLineCount({ sublistId: 'item' });
                var itemsArr = [];
                for (var i = 0; i < lineCount; i++) {
                    var permanentPrice = rec.getSublistValue({ sublistId: 'item', fieldId: 'custcol_acme_permanent_price', line: i });
                    var permanentPriceUpdated = rec.getSublistValue({ sublistId: 'item', fieldId: 'custcol_acme_permanent_price_updated', line: i });
                    //   log.debug('permanentPrice', permanentPrice)
                    // log.debug('permanentPriceUpdated', permanentPriceUpdated)
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
                            //    log.debug('REBATE COST', rebateObj.rebateCost)
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