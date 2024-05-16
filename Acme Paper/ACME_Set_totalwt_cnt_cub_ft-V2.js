/**
 * @NApiVersion 2.1
 * @NScriptType UserEventScript
 * @NModuleScope SameAccount
 */
define(['N/record', 'N/search', 'N/runtime', 'N/url', 'N/runtime', './SDB_customer_pricing_lib.js', "N/log"],
    function (record, search, runtime, url, runtime, lib_customer_pricing, log) {

        function beforeLoad(scriptContext) {
            try {

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

                }
            }
            catch (beforeLoadError) {
                log.error("BeforeLoad() ERROR", beforeLoadError);
            }

        }

        function afterSubmit(scriptContext) {
            if (scriptContext.type != scriptContext.UserEventType.DELETE) {
                var userObj = runtime.getCurrentUser();
                if (userObj.id == 75190) return //2 High Jump id

                //SET CUSTOMER PRICING SCRIPT LOGIC ON SALES ORDER
                var rec = record.load({
                    type: scriptContext.newRecord.type,
                    id: scriptContext.newRecord.id,
                    isDynamic: true,
                });

                try {
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
                        rec.selectLine({
                            sublistId: 'item',
                            line: i
                        })
                        var itemID = rec.getCurrentSublistValue('item', 'item');
                        item_weight = rec.getCurrentSublistValue('item', 'custcol_item_weight') || 0;
                        item_qty = rec.getCurrentSublistValue('item', 'quantity');
                        item_cube_ft = rec.getCurrentSublistValue('item', 'custcol_item_cube_ft') || 0;
                        item_type = rec.getCurrentSublistValue('item', 'itemtype');
                        item_rate = rec.getCurrentSublistValue('item', 'rate');

                        (salesType == 'invoice') ? item_qty_backordered = rec.getCurrentSublistValue('item', 'quantityremaining') || 0 : item_qty_backordered = rec.getCurrentSublistValue('item', 'quantitybackordered') || 0;

                        if (salesType == 'invoice' && item_qty_backordered > 0) item_qty = rec.getCurrentSublistValue('item', 'quantityordered') || 0
                        item_qty = Number(item_qty) - Number(item_qty_backordered);
                        if (item_qty < 0) item_qty = 0;

                        if (salesType == 'invoice' && item_qty_backordered > 0) {
                            rec.setCurrentSublistValue({
                                sublistId: 'item',
                                fieldId: 'quantity',
                                value: Number(item_qty)
                            })
                        }

                        //SET EXTENDED TOTAL TAKING BACKORDER INTO ACCOUNT
                        /* rec.setCurrentSublistValue({
                             sublistId: 'item',
                             fieldId: 'amount',
                             line: i,
                             value: Number(item_rate) * Number(item_qty)
                         })*/


                        if (Number(item_qty) <= 0 || item_type != 'InvtPart') continue;

                        //Save total items qty
                        total_qty = total_qty + parseInt(item_qty);

                        //Save total cube items
                        if (Number(item_cube_ft) > 0) total_cube_ft = total_cube_ft + (parseFloat(item_cube_ft) * parseFloat(item_qty));

                        //Save total qty weight items
                        if (Number(item_weight) > 0) total_wt = total_wt + (parseFloat(item_weight) * parseFloat(item_qty));
                        rec.commitLine({
                            sublistId: 'item'
                        });
                    }//End for

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
                    //rec.save()
                } catch (error) {
                    log.error('error at  afterSubmit', error);
                }

                try {
                    if (rec.type == record.Type.SALES_ORDER) {
                        let customer = rec.getValue({ fieldId: 'entity' });
                        let lineItems = lib_customer_pricing.getPermanentPricedLines(rec);
                        // ------------- Margin on user Event --------------------
                        let lineCount = rec.getLineCount({
                            sublistId: 'item'
                        });
                        let isDropShip = rec.getValue({
                            fieldId: 'custbody_dropship_order'
                        });
                        log.debug('DATA: ', { lineCount, isDropShip, userObj, orderId: scriptContext.newRecord.id });

                        for (let i = 0; i < lineCount; i++) {
                            rec.selectLine({
                                sublistId: 'item',
                                line: i
                            })

                            var sellPrice = Number(rec.getCurrentSublistValue({
                                sublistId: 'item',
                                fieldId: 'rate',
                            }))

                            //If it has Rebate Cost then set it on the unit cost, unless the cost was manually changed
                            var manuallyChangedCost = rec.getCurrentSublistValue({
                                sublistId: 'item',
                                fieldId: 'custcol_sdb_manually_modified_cost'
                            })
                            if (!manuallyChangedCost) {//add 9/5 for task https://app.clickup.com/t/86b027xgm change costestimatetype *START*

                                log.debug('ENTER in !manuallyChangedCost: ', { orderId: scriptContext.newRecord.id });
                                var itemid = rec.getCurrentSublistValue({
                                    sublistId: 'item',
                                    fieldId: 'item',
                                })
                                var rebateCost = Number(rec.getCurrentSublistValue({
                                    sublistId: 'item',
                                    fieldId: 'custcol_rebate_cost',

                                }))
                                var qty = rec.getCurrentSublistValue({
                                    sublistId: 'item',
                                    fieldId: 'quantity',
                                })
                                var costestimatetype = rec.getCurrentSublistValue({
                                    sublistId: 'item',
                                    fieldId: 'costestimatetype',
                                })
                                var costestimatetype = rec.getCurrentSublistValue({
                                    sublistId: 'item',
                                    fieldId: 'costestimatetype',
                                })
                                var unitCost_1 = rec.getCurrentSublistValue({
                                    sublistId: 'item',
                                    fieldId: 'custcol_acc_unitcost'
                                })
                                var rebateId = rec.getCurrentSublistValue({
                                    sublistId: 'item',
                                    fieldId: 'custcol_rebate_parent_id'
                                })

                                var columnNames = { 'ITEMDEFINED': 'costestimate', 'AVGCOST': 'averagecost', 'LASTPURCHPRICE': 'lastpurchaseprice', 'PURCHPRICE': 'cost' };
                                var columns = [columnNames[costestimatetype]];
                                var newUnitCost = '';
                                if (columns.length && columns[0]) {
                                    var lookupItemfield = search.lookupFields({
                                        type: search.Type.INVENTORY_ITEM,
                                        id: itemid,
                                        columns: columns
                                    });
                                    newUnitCost = lookupItemfield[columns[0].toLowerCase()];
                                }
                                if (unitCost_1 && !isNaN(Number(unitCost_1))) newUnitCost = unitCost_1;
                                log.debug('rebateCost', rebateCost)
                                if (rebateCost || (rebateCost == 0 && rebateId)) newUnitCost = rebateCost; //add 9/5 for task https://app.clickup.com/t/86b027xgm change costestimatetype *END*

                                if (!isDropShip) {
                                    qty = Number(qty) - Number(rec.getCurrentSublistValue({
                                        sublistId: 'item',
                                        fieldId: 'quantitybackordered',

                                    }))
                                }

                                rec.setCurrentSublistValue({
                                    sublistId: 'item',
                                    fieldId: 'custcol_acc_unitcost',
                                    value: newUnitCost,
                                })
                                rec.setCurrentSublistValue({
                                    sublistId: 'item',
                                    fieldId: 'costestimate',
                                    value: Number(newUnitCost) * Number(qty),
                                })

                            }

                            var unitCost = Number(rec.getCurrentSublistValue({
                                sublistId: 'item',
                                fieldId: 'custcol_acc_unitcost',

                            }))
                            var lineQty = Number(rec.getCurrentSublistValue({
                                sublistId: 'item',
                                fieldId: 'quantity',

                            }))
                            var currentCostEstimate = rec.getCurrentSublistValue({
                                sublistId: 'item',
                                fieldId: 'costestimate',
                            });

                            if (!isDropShip) {
                                lineQty = lineQty - Number(rec.getCurrentSublistValue({
                                    sublistId: 'item',
                                    fieldId: 'quantitybackordered',

                                }))
                            }
                            log.debug('LINE DATA: ', { i, lineQty, unitCost, currentCostEstimate, sellPrice });
                            // if (!currentCostEstimate || currentCostEstimate == '0') 
                            rec.setCurrentSublistValue({
                                sublistId: 'item',
                                fieldId: 'costestimate',
                                value: lineQty * Number(unitCost)
                            })

                            if ((unitCost || (unitCost == 0 && sellPrice > 0)) && customer != 96580) { //Do not do this if its restockit
                                let grossMargin = ((sellPrice - unitCost) / sellPrice) * 100;
                                if (grossMargin.toFixed(2) == Number.POSITIVE_INFINITY || grossMargin.toFixed(2) == Number.NEGATIVE_INFINITY) grossMargin = 99999999;
                                rec.setCurrentSublistValue({
                                    sublistId: 'item',
                                    fieldId: 'custcol_acme_markup_percent',
                                    value: grossMargin.toFixed(2)
                                })
                            }

                            rec.commitLine({
                                sublistId: 'item'
                            });
                        }
                        //--------------------------------------------------------------

                        if (!lib_customer_pricing.isEmpty(lineItems)) {
                            let customerId = lib_customer_pricing.updateCustomerSpecificPricing(lineItems, customer, rec);
                            if (!lib_customer_pricing.isEmpty(customerId)) {
                                lib_customer_pricing.updatePricedLines(lineItems, rec);
                            }
                        }
                    } else if (rec.type == record.Type.INVOICE) {
                        let lineCount = rec.getLineCount({
                            sublistId: 'item'
                        });
                        for (let i = 0; i < lineCount; i++) {
                            rec.selectLine({
                                sublistId: 'item',
                                line: i
                            })
                            var unitCost = Number(rec.getCurrentSublistValue({
                                sublistId: 'item',
                                fieldId: 'custcol_acc_unitcost',

                            }))
                            var lineQty = Number(rec.getCurrentSublistValue({
                                sublistId: 'item',
                                fieldId: 'quantity',

                            }))
                            var currentCostEstimate = rec.getCurrentSublistValue({
                                sublistId: 'item',
                                fieldId: 'costestimate',
                            });
                            var newValue = lineQty * Number(unitCost)
                            log.debug('LINE DATA INVOICE: ', { i, lineQty, unitCost, currentCostEstimate, newValue });
                            rec.setCurrentSublistValue({
                                sublistId: 'item',
                                fieldId: 'costestimate',
                                value: newValue
                            })
                            rec.commitLine({
                                sublistId: 'item'
                            });
                        }
                        //--------------------------------------------------------------
                    }
                }
                catch (error) {
                    log.error('Error at SetCustmerPricing in afterSubmit', error.toString());
                }

                var id = rec.save({
                    ignoreMandatoryFields: true
                })
                log.audit('Order Saved: ', id)
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


        return {
            beforeLoad: beforeLoad,
            afterSubmit: afterSubmit
        };

    });