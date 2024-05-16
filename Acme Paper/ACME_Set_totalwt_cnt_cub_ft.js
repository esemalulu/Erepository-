/**
 * @NApiVersion 2.1
 * @NScriptType UserEventScript
 * @NModuleScope SameAccount
 */
define(['N/record', 'N/search', 'N/runtime', 'N/url', 'N/runtime'],
    function (record, search, runtime, url, runtime) {

        function beforeLoad(scriptContext) {
            try {
               // log.audit('beforeLoad', scriptContext);
                if (scriptContext.type === scriptContext.UserEventType.VIEW && runtime.executionContext == 'USERINTERFACE') {
                    var currentrecord = scriptContext.newRecord;
                    var recordid = currentrecord.id;
                    var recordType = currentrecord.type;
                    try {
                        createButton(scriptContext, recordid, recordType);
                    }
                    catch (e) {
                        log.error('Error Details', e.toString());
                    }

                } /* else if ((scriptContext.type === scriptContext.UserEventType.CREATE) && runtime.executionContext == 'USERINTERFACE')
                {
                    //Added functionality to set the current user
                    try
                    {
                        var currentRoleId = runtime.getCurrentUser().id
                      //  log.debug('currentRoleId', currentRoleId);
                        var currentrecord = scriptContext.newRecord;
                        currentrecord.setValue({
                            fieldId: 'custbody_aps_entered_by',
                            value: currentRoleId,
                            ignoreFieldChange: true
                        })
                    } catch (e)
                    {
                        log.error('Error setting Entered By', e.toString());
                    }
                } */
            }
            catch (beforeLoadError) {
                log.error("BeforeLoad() ERROR", beforeLoadError);
            }

        }
        function beforeSubmit(scriptContext) {
            //log.audit('beforeSubmit: ', scriptContext);
        }

        function afterSubmit(scriptContext) {
            log.audit('afterSubmit afterSubmit', scriptContext);
            if (scriptContext.type === scriptContext.UserEventType.CREATE) {

                //Added functionality to set the current user
                try {
                    var currentRoleId = runtime.getCurrentUser().id
                    //  log.debug('currentRoleId', currentRoleId);
                    var currentrecord = scriptContext.newRecord;
                    /* currentrecord.setValue({
                         fieldId: 'custbody_aps_entered_by',
                         value: currentRoleId,
                         ignoreFieldChange: true
                     })*/
                } catch (e) {
                    log.error('Error setting Entered By', e.toString());
                }
            }
            if (scriptContext.type != scriptContext.UserEventType.DELETE) {
                var userObj = runtime.getCurrentUser();
                if (userObj.id != 75190) { //2 High Jump id
                    try {

                        log.audit('entra con', userObj.name)
                        var rec = record.load({
                            type: scriptContext.newRecord.type,
                            id: scriptContext.newRecord.id,
                        });
                        var salesType = scriptContext.newRecord.type;
                        var count = rec.getLineCount('item');
                        var rebateStandard = "";
                        var item_weight = 0;
                        var item_qty = 0;
                        var item_qty_backordered = 0;
                        var item_cube_ft = 0;
                        var item_type;

                        var total_wt = 0;
                        var total_qty = 0;
                        var total_cube_ft = 0;

                        //Iterate items line
                        for (var i = 0; i < count; i++) {
                            var itemID = rec.getSublistValue('item', 'item', i);
                            item_weight = rec.getSublistValue('item', 'custcol_item_weight', i) || 0;
                            item_qty = rec.getSublistValue('item', 'quantity', i);
                            //    log.debug('first item_qty', item_qty)
                            item_cube_ft = rec.getSublistValue('item', 'custcol_item_cube_ft', i) || 0;
                            item_type = rec.getSublistValue('item', 'itemtype', i);
                            item_rate = rec.getSublistValue('item', 'rate', i);

                            (salesType == 'invoice') ? item_qty_backordered = rec.getSublistValue('item', 'quantityremaining', i) || 0 : item_qty_backordered = rec.getSublistValue('item', 'quantitybackordered', i) || 0;
                            if (salesType == 'invoice' && item_qty_backordered > 0) {
                                item_qty = rec.getSublistValue('item', 'quantityordered', i) || 0
                            }
                            item_qty = Number(item_qty) - Number(item_qty_backordered);

                            log.debug('qty backordered', item_qty_backordered)
                            log.debug('qty', item_qty)
                            if (item_qty < 0) {
                                item_qty = 0;
                            }

                            if (salesType == 'invoice' && item_qty_backordered > 0) {
                                rec.setSublistValue({
                                    sublistId: 'item',
                                    fieldId: 'quantity',
                                    line: i,
                                    value: Number(item_qty)
                                })
                            }

                            //SET EXTENDED TOTAL TAKING BACKORDER INTO ACCOUNT
                            /* rec.setSublistValue({
                                 sublistId: 'item',
                                 fieldId: 'amount',
                                 line: i,
                                 value: Number(item_rate) * Number(item_qty)
                             })*/

                            log.debug('item_qty', item_qty);
                            log.debug('item cube ft', item_cube_ft);
                            log.debug('item_weight= ', item_weight);
                            log.debug('item type = ', item_type);

                            if (Number(item_qty) <= 0 || item_type != 'InvtPart') continue;

                            //Save total items qty
                            total_qty = total_qty + parseInt(item_qty);

                            //Save total cube items
                            if (Number(item_cube_ft) > 0) total_cube_ft = total_cube_ft + (parseFloat(item_cube_ft) * parseFloat(item_qty));
                            log.debug('current cube ft', total_cube_ft)

                            //Save total qty weight items
                            if (Number(item_weight) > 0) total_wt = total_wt + (parseFloat(item_weight) * parseFloat(item_qty));

                        }//End for

                        log.debug('totalweight', total_wt);
                        log.debug('totali', total_qty);
                        log.debug('totalcube', total_cube_ft);


                        if (Number(total_wt) >= 0) {
                            rec.setValue({
                                fieldId: 'custbody_total_weight',
                                value: total_wt.toFixed(2),
                                ignoreFieldChange: true
                            });

                        }

                        if (Number(total_qty) >= 0) {
                            rec.setValue({
                                fieldId: 'custbody_total_count',
                                value: Number(total_qty),
                                ignoreFieldChange: true
                            });
                        }

                        if (Number(total_cube_ft) >= 0) {
                            rec.setValue({
                                fieldId: 'custbody_total_cube_ft',
                                value: total_cube_ft.toFixed(2),
                                ignoreFieldChange: true
                            });

                        }

                    } catch (error) {
                        log.error('error at ', error);
                    }




                    //SET CUSTOMER PRICING SCRIPT LOGIC
                    try {
                        if (rec.type == record.Type.SALES_ORDER) {
                            let customer = rec.getValue({ fieldId: 'entity' });
                            let lineItems = getPermanentPricedLines(rec);
                            log.debug('lineItems', lineItems);
                            var HEATHER_ID = '71790';
                            // ------------- Rebate prices and Margin on user Event --------------------
                            if (rec.getValue({ fieldId: 'custbody_aps_entered_by' }) == HEATHER_ID || rec.getValue({ fieldId: 'custbody_aps_entered_by' }) == '84216' || rec.getValue({ fieldId: 'custbody_aps_entered_by' }) == '66155' || rec.getValue({ fieldId: 'custbody_sdb_original_sales_order' })) {
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
                                         log.audit('rebatePrice: ', rebatePrice);
                                        let vendorPrice = getVendorPrice(itemId, isDropShip);
                                        if (rebatePrice.rebateCost != -1 && vendorPrice != -1 && rebatePrice.rebateCost != 0) {
                                            finalCost = Math.min(rebatePrice.rebateCost, vendorPrice);
                                            if (rebatePrice.dollarPerCase) finalCost = finalCost - rebatePrice.dollarPerCase
                                            log.debug('unitcost', "final" + finalCost + "rebate" + rebatePrice.rebateCost + "vendor" + vendorPrice)
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
                                            log.debug("finalcost", finalCost)
                                            rec.setSublistValue({
                                                sublistId: 'item',
                                                fieldId: 'custcol_rebate_parent_id',
                                                line: i,
                                                value: rebatePrice.rebateId
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
                                            if (rebatePrice.dollarPerCase) {
                                                rec.setSublistValue({
                                                    sublistId: 'item',
                                                    fieldId: 'custcol_rebate_dollar_per_case',
                                                    line: i,
                                                    value: rebatePrice.dollarPerCase
                                                })
                                                rec.setSublistValue({
                                                    sublistId: 'item',
                                                    fieldId: 'custcol_rebate_dollar_per_case_amt',
                                                    line: i,
                                                    value: rebatePrice.dollarPerCase * lineQty
                                                })
                                            }
                                          log.audit('rebatePrice.rebateCost', rebatePrice.rebateCost)
                                            rec.setSublistValue({
                                                sublistId: 'item',
                                                fieldId: 'custcol_rebate_cost',
                                                line: i,
                                                value: rebatePrice.rebateCost
                                            })

                                            rec.setSublistValue({
                                                sublistId: 'item',
                                                fieldId: 'costestimate',
                                                line: i,
                                                value: lineQty * Number(finalCost)
                                            })
                                            log.audit('lineQty * Number(finalCost)', lineQty * Number(finalCost))
                                            //  }
                                        }
                                        else if (rebatePrice != -1 && vendorPrice == -1 && rebateStandard.rebateCost != 0) {
                                            rec.setSublistValue({
                                                sublistId: 'item',
                                                fieldId: 'costestimatetype',
                                                line: i,
                                                value: costType
                                            })
                                            var rebateToSet = rebatePrice.rebateCost
                                            if (rebatePrice.dollarPerCase) rebateToSet = rebatePrice.rebateCost - rebatePrice.dollarPerCase
                                            rec.setSublistValue({
                                                sublistId: 'item',
                                                fieldId: 'custcol_acc_unitcost',
                                                line: i,
                                                value: rebateToSet
                                            })

                                            log.debug(" rebatePrice.rebateCost", rebateToSet)
                                            rec.setSublistValue({
                                                sublistId: 'item',
                                                fieldId: 'custcol_rebate_parent_id',
                                                line: i,
                                                value: rebatePrice.rebateId
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
                                            if (rebatePrice.dollarPerCase) {
                                                rec.setSublistValue({
                                                    sublistId: 'item',
                                                    fieldId: 'custcol_rebate_dollar_per_case',
                                                    line: i,
                                                    value: rebatePrice.dollarPerCase
                                                })
                                                rec.setSublistValue({
                                                    sublistId: 'item',
                                                    fieldId: 'custcol_rebate_dollar_per_case_amt',
                                                    line: i,
                                                    value: rebatePrice.dollarPerCase * lineQty
                                                })
                                            }
                                           log.audit('set rebatePrice.originalCost', rebatePrice.originalCost)
                                            rec.setSublistValue({
                                                sublistId: 'item',
                                                fieldId: 'custcol_rebate_cost',
                                                line: i,
                                                value: rebatePrice.originalCost
                                            })

                                            rec.setSublistValue({
                                                sublistId: 'item',
                                                fieldId: 'costestimate',
                                                line: i,
                                                value: lineQty * Number(rebatePrice.rebateCost)
                                            })
                                            log.audit('set costestimate2', lineQty * Number(rebatePrice.rebateCost))
                                        }
                                        else if ((rebatePrice == -1 && vendorPrice != -1) || (rebateStandard.rebateCost != 0 && vendorPrice != -1)) {
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
                                                value: vendorPrice
                                            })
                                            log.debug("vendorPrice", vendorPrice)
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
                                        rebateStandard = getRebatePrice(itemId, customerId, isDropShip);
                                        if (rebateStandard.rebateCost != -1 && rebateStandard.rebateCost != 0) {
                                            log.audit('set costestimatetype', rebateStandard)
                                            rec.setSublistValue({
                                                sublistId: 'item',
                                                fieldId: 'costestimatetype',
                                                line: i,
                                                value: 'CUSTOM'
                                            })
                                            var rebateToSet = rebateStandard.rebateCost;
                                            if (rebateStandard.dollarPerCase) {
                                                rebateStandard.dollarPerCase = rebateStandard.dollarPerCase + ((3 * Number(rebateStandard.dollarPerCase)) / 100);
                                                rebateToSet = rebateToSet - rebateStandard.dollarPerCase;
                                            }
                                            rec.setSublistValue({
                                                sublistId: 'item',
                                                fieldId: 'custcol_acc_unitcost',
                                                line: i,
                                                value: rebateToSet
                                            })

                                            log.debug("rebateStandard.rebateCost", rebateToSet)
                                            rec.setSublistValue({
                                                sublistId: 'item',
                                                fieldId: 'custcol_rebate_parent_id',
                                                line: i,
                                                value: rebateStandard.rebateId
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
                                            if (rebateStandard.dollarPerCase) {
                                                rec.setSublistValue({
                                                    sublistId: 'item',
                                                    fieldId: 'custcol_rebate_dollar_per_case',
                                                    line: i,
                                                    value: rebateStandard.dollarPerCase
                                                })
                                                rec.setSublistValue({
                                                    sublistId: 'item',
                                                    fieldId: 'custcol_rebate_dollar_per_case_amt',
                                                    line: i,
                                                    value: rebateStandard.dollarPerCase * lineQty
                                                })
                                            }
                                            rec.setSublistValue({
                                                sublistId: 'item',
                                                fieldId: 'custcol_rebate_cost',
                                                line: i,
                                                value: rebateStandard.originalCost
                                            })

                                            log.error('quantitybackordered', rec.getSublistValue({
                                                sublistId: 'item',
                                                fieldId: 'quantitybackordered',
                                                line: i
                                            }))
                                            rec.setSublistValue({
                                                sublistId: 'item',
                                                fieldId: 'costestimate',
                                                line: i,
                                                value: lineQty * Number(rebateToSet)
                                            })
                                            log.debug('set costestimate', lineQty * Number(rebateToSet))
                                        }
                                        else {
                                            let loadedCost = Number(getLoadedCost(itemId))
                                            log.audit('set loadedCost', loadedCost)
                                            var lineQty = Number(rec.getSublistValue({
                                                sublistId: 'item',
                                                fieldId: 'quantity',
                                                line: i
                                            }))
                                            rec.setSublistValue({
                                                sublistId: 'item',
                                                fieldId: 'costestimatetype',
                                                line: i,
                                                value: 'CUSTOM'
                                            })
                                            if (loadedCost != -1) {
                                                loadedCost = loadedCost
                                                if (rebateStandard.dollarPerCase) {
                                                    rec.setSublistValue({
                                                        sublistId: 'item',
                                                        fieldId: 'custcol_rebate_dollar_per_case',
                                                        line: i,
                                                        value: rebateStandard.dollarPerCase
                                                    })
                                                    rec.setSublistValue({
                                                        sublistId: 'item',
                                                        fieldId: 'custcol_rebate_dollar_per_case_amt',
                                                        line: i,
                                                        value: rebateStandard.dollarPerCase * lineQty
                                                    })
                                                    var newDollarPerCase = rebateStandard.dollarPerCase + ((3 * Number(rebateStandard.dollarPerCase)) / 100)
                                                    log.debug("newDOllarPerCase", newDollarPerCase)
                                                    log.debug("loadedCost", loadedCost)
                                                    loadedCost = Number(loadedCost) - Number(newDollarPerCase)
                                                }

                                                rec.setSublistValue({
                                                    sublistId: 'item',
                                                    fieldId: 'custcol_acc_unitcost',
                                                    line: i,
                                                    value: loadedCost
                                                })


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
                                        if (grossMargin.toFixed(2) == Number.POSITIVE_INFINITY
                                            || grossMargin.toFixed(2) == Number.NEGATIVE_INFINITY) grossMargin = 99999999;
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
                            else {
                                let lineCount = rec.getLineCount({
                                    sublistId: 'item'
                                });
                                let isDropShip = rec.getValue({
                                    fieldId: 'custbody_dropship_order'
                                });
                                for (let i = 0; i < lineCount; i++) {
                                    var sellPrice = Number(rec.getSublistValue({
                                        sublistId: 'item',
                                        fieldId: 'rate',
                                        line: i
                                    }))
                                    var unitCost = Number(rec.getSublistValue({
                                        sublistId: 'item',
                                        fieldId: 'custcol_acc_unitcost',
                                        line: i
                                    }))
                                    log.audit("unit cost", unitCost)
                                    var lineQty = Number(rec.getSublistValue({
                                        sublistId: 'item',
                                        fieldId: 'quantity',
                                        line: i
                                    }))
                                    if (!isDropShip) {
                                        lineQty = lineQty - Number(rec.getSublistValue({
                                            sublistId: 'item',
                                            fieldId: 'quantitybackordered',
                                            line: i
                                        }))
                                    }
                                    rec.setSublistValue({
                                        sublistId: 'item',
                                        fieldId: 'costestimate',
                                        line: i,
                                        value: lineQty * Number(unitCost)
                                    })
                                    log.audit("cost estimate", lineQty * Number(unitCost))

                                    if (unitCost) {
                                        let grossMargin = ((sellPrice - unitCost) / sellPrice) * 100;
                                        if (grossMargin.toFixed(2) == Number.POSITIVE_INFINITY
                                            || grossMargin.toFixed(2) == Number.NEGATIVE_INFINITY) grossMargin = 99999999;
                                        log.audit("custcol_acme_markup_percent: ", grossMargin.toFixed(2));
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

                            if (!isEmpty(lineItems)) {
                                let customerId = updateCustomerSpecificPricing(lineItems, customer, rec);
                                log.debug('customerId', customerId)
                                if (!isEmpty(customerId)) {
                                    log.debug('entra', 'entra')
                                    updatePricedLines(lineItems, rec);
                                }
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

        // Function to create button.
        function createButton(scriptContext, recordid, rcdtype) {

            // Getting the URL to open the suitelet.
            var outputUrl = url.resolveScript({ scriptId: 'customscript_acc_st_so_print', deploymentId: 'customdeploy_acc_st_so_print', returnExternalUrl: false });
            // Adding parameters to pass in the suitelet.
            outputUrl += '&action=printso';
            outputUrl += '&recordid=' + recordid;
            outputUrl += '&recordtype=' + rcdtype;
            // Creating function to redirect to the suitelet.

            var stringScript = "window.open('" + outputUrl + "','_blank','toolbar=yes, location=yes, status=yes, menubar=yes, scrollbars=yes')";

            // Creating a button on form.
            if (scriptContext.newRecord.type != "estimate") var printButton = scriptContext.form.addButton({ id: 'custpage_print', label: 'Print', functionName: stringScript });
        }
        function getPermanentPricedLines(rec) {
            try {
                var lineCount = rec.getLineCount({ sublistId: 'item' });
                var itemsArr = [];
                for (var i = 0; i < lineCount; i++) {
                    var permanentPrice = rec.getSublistValue({ sublistId: 'item', fieldId: 'custcol_acme_permanent_price', line: i });
                    var permanentPriceUpdated = rec.getSublistValue({ sublistId: 'item', fieldId: 'custcol_acme_permanent_price_updated', line: i });
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
             // return;
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
                            ["custrecord_rebate_items_parent.custrecord_rebate_items_item", "anyof", itemId],
                            "AND",
                            ["isinactive", "is", "F"]
                        ],
                    columns:
                        [
                            search.createColumn({
                                name: "custrecord_rebate_items_rebate_cost",
                                join: "CUSTRECORD_REBATE_ITEMS_PARENT",
                                label: "Rebate Cost"
                            }),
                            search.createColumn({
                                name: "custrecord_acme_rebate_item_doll_pcase",
                                join: "CUSTRECORD_REBATE_ITEMS_PARENT",
                                label: "Rebate Cost"
                            }),
                            search.createColumn({ name: "custrecord_rebate_additional_load_cb", label: "Additional Load" }),
                            search.createColumn({ name: "custrecord_rebate_load_value", label: "Load Value (Margin)" })
                        ]
                });
                customrecord_rebate_parentSearchObj.run().each(function (result) {
                    rebateObj.dollarPerCase = Number(result.getValue({
                        name: "custrecord_acme_rebate_item_doll_pcase",
                        join: "CUSTRECORD_REBATE_ITEMS_PARENT"
                    }))
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
                        }
                    }
                    return false;
                });
                log.audit("RebateObj", rebateObj)
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
            beforeLoad: beforeLoad,
            beforeSubmit: beforeSubmit,
            afterSubmit: afterSubmit
        };

    });   