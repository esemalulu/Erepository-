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
                              createButton(scriptContext, recordid, recordType);
                        }
                  }
                  catch (beforeLoadError) {
                        log.error("ERROR: beforeLoad", beforeLoadError);
                  }
            }

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

            function afterSubmit(scriptContext) {
                  try {
                        if (scriptContext.type == scriptContext.UserEventType.DELETE) return;

                        var userObj = runtime.getCurrentUser();
                        // if (userObj.id == 75190) return //2 High Jump id

                        var rec = record.load({
                              type: scriptContext.newRecord.type,
                              id: scriptContext.newRecord.id,
                              isDynamic: true,
                        });

                        setCubeAndWeight(scriptContext, rec);

                        if (userObj.id == 75190) {
                              var id = rec.save({
                                    ignoreMandatoryFields: true
                              })
                              log.audit('ORDER SAVED: ', id)
                              return;
                        }



                        if (rec.type == record.Type.SALES_ORDER) {
                          log.audit('type: ',rec.type);
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
                                    log.audit('sellPrice', sellPrice)

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
                                          var manuallyChangedRate = rec.getCurrentSublistValue({
                                                sublistId: 'item',
                                                fieldId: 'custcol_sdb_rate_manually_modified'
                                          })
                                          if (customer == 96580 && !manuallyChangedRate) { //If its restockit
                                                rec.setCurrentSublistValue({
                                                      sublistId: 'item',
                                                      fieldId: 'costestimatetype',
                                                      value: 'CUSTOM',
                                                })
                                                rec.setCurrentSublistValue({ //Set Restockit as the price level
                                                      sublistId: 'item',
                                                      fieldId: 'price',
                                                      value: 28,
                                                })

                                                if (isDropShip) {
                                                      var baseCost = getBaseCost(itemid)
                                                      rec.setCurrentSublistValue({
                                                            sublistId: 'item',
                                                            fieldId: 'custcol_acc_unitcost',
                                                            value: baseCost,
                                                      })
                                                      rec.setCurrentSublistValue({
                                                            sublistId: 'item',
                                                            fieldId: 'custcol_acme_markup_percent',
                                                            value: 9.18
                                                      })
                                                      var restockitRate = (-baseCost) / ((9.18 / 100) - 1)
                                                      rec.setCurrentSublistValue({
                                                            sublistId: 'item',
                                                            fieldId: 'rate',
                                                            value: restockitRate.toFixed(2)
                                                      })
                                                }
                                                else {
                                                      var loadedCost = getLoadedCost(itemid)
                                                      rec.setCurrentSublistValue({
                                                            sublistId: 'item',
                                                            fieldId: 'custcol_acc_unitcost',
                                                            value: loadedCost,
                                                      })
                                                      rec.setCurrentSublistValue({
                                                            sublistId: 'item',
                                                            fieldId: 'custcol_acme_markup_percent',
                                                            value: 6
                                                      })
                                                      var restockitRate = (-loadedCost) / ((6 / 100) - 1)
                                                      rec.setCurrentSublistValue({
                                                            sublistId: 'item',
                                                            fieldId: 'rate',
                                                            value: restockitRate.toFixed(2)
                                                      })
                                                }
                                          }

                                          var costestimatetype = rec.getCurrentSublistValue({
                                                sublistId: 'item',
                                                fieldId: 'costestimatetype',
                                          })
                                          var rebateId = rec.getCurrentSublistValue({
                                                sublistId: 'item',
                                                fieldId: 'custcol_rebate_parent_id'
                                          })

                                          var columnNames = { 'ITEMDEFINED': 'costestimate', 'AVGCOST': 'averagecost', 'LASTPURCHPRICE': 'lastpurchaseprice', 'PURCHPRICE': 'cost' };
                                          var columns = [columnNames[costestimatetype]];
                                          var newUnitCost = rec.getCurrentSublistValue({
                                                sublistId: 'item',
                                                fieldId: 'custcol_acc_unitcost'
                                          });
                                          if (columns.length && columns[0]) {
                                                var lookupItemfield = search.lookupFields({
                                                      type: search.Type.INVENTORY_ITEM,
                                                      id: itemid,
                                                      columns: columns
                                                });
                                                if (lookupItemfield[columns[0].toLowerCase()]) newUnitCost = lookupItemfield[columns[0].toLowerCase()];
                                          }

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

                                    if (!isDropShip) {
                                          lineQty = lineQty - Number(rec.getCurrentSublistValue({
                                                sublistId: 'item',
                                                fieldId: 'quantitybackordered',

                                          }))
                                    }
                                    log.debug('LINE DATA: ', { i, lineQty, unitCost, sellPrice });
                                    rec.setCurrentSublistValue({
                                          sublistId: 'item',
                                          fieldId: 'costestimate',
                                          value: lineQty * Number(unitCost)
                                    })

                                    if (unitCost || (unitCost == 0 && sellPrice > 0)) {
                                          let grossMargin = ((sellPrice - unitCost) / sellPrice) * 100;
                                          if (grossMargin.toFixed(2) == Number.POSITIVE_INFINITY || grossMargin.toFixed(2) == Number.NEGATIVE_INFINITY) grossMargin = 99999999;
                                          if (customer != 96580) {//RESTOCKIT
                                                rec.setCurrentSublistValue({
                                                      sublistId: 'item',
                                                      fieldId: 'custcol_acme_markup_percent',
                                                      value: grossMargin.toFixed(2)
                                                })
                                          }
                                    }

                                    rec.commitLine({
                                          sublistId: 'item'
                                    });
                              }
                              if (!lib_customer_pricing.isEmpty(lineItems)) {
                                    let customerId = lib_customer_pricing.updateCustomerSpecificPricing(lineItems, customer, rec);
                                    if (!lib_customer_pricing.isEmpty(customerId)) lib_customer_pricing.updatePricedLines(lineItems, rec);
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
                                    var newValue = lineQty * Number(unitCost)
                                    log.debug('LINE DATA INVOICE: ', { i, lineQty, unitCost, newValue });
                                    rec.setCurrentSublistValue({
                                          sublistId: 'item',
                                          fieldId: 'costestimate',
                                          value: newValue
                                    })

                                    var sellPrice = Number(rec.getCurrentSublistValue({
                                          sublistId: 'item',
                                          fieldId: 'rate',
                                    }))

                                    if (unitCost || (unitCost == 0 && sellPrice > 0)) {
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
                        }

                        var id = rec.save({
                              ignoreMandatoryFields: true
                        })
                        log.audit('ORDER SAVED: ', id)

                  } catch (error) {
                        log.error('ERROR: afterSubmit', error);
                  }
            }

            function setCubeAndWeight(scriptContext, rec) {
                  try {
                        var salesType = scriptContext.newRecord.type;
                        var count = rec.getLineCount('item');
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
                              item_weight = rec.getCurrentSublistValue('item', 'custcol_item_weight') || 0;
                              item_qty = rec.getCurrentSublistValue('item', 'quantity');
                              item_cube_ft = rec.getCurrentSublistValue('item', 'custcol_item_cube_ft') || 0;
                              item_type = rec.getCurrentSublistValue('item', 'itemtype');
                              item_rate = rec.getCurrentSublistValue('item', 'rate');

                              (salesType == 'invoice') ? item_qty_backordered = rec.getCurrentSublistValue('item', 'quantityremaining') || 0 : item_qty_backordered = rec.getCurrentSublistValue('item', 'quantitybackordered') || 0;

                              if (salesType == 'invoice' && item_qty_backordered > 0) item_qty = rec.getCurrentSublistValue('item', 'quantityordered') || 0
                              item_qty = Number(item_qty) - Number(item_qty_backordered);
                              if (item_qty < 0) item_qty = 0;

                              if (salesType == 'invoice' && item_qty_backordered > 0) rec.setCurrentSublistValue({
                                    sublistId: 'item',
                                    fieldId: 'quantity',
                                    value: Number(item_qty)
                              })

                              if (Number(item_qty) <= 0 || item_type != 'InvtPart') continue;
                              total_qty = total_qty + parseInt(item_qty);
                              if (Number(item_cube_ft) > 0) total_cube_ft = total_cube_ft + (parseFloat(item_cube_ft) * parseFloat(item_qty));
                              if (Number(item_weight) > 0) total_wt = total_wt + (parseFloat(item_weight) * parseFloat(item_qty));
                              rec.commitLine({
                                    sublistId: 'item'
                              });
                        }//End for

                        if (Number(total_wt) >= 0) rec.setValue({
                              fieldId: 'custbody_total_weight',
                              value: total_wt.toFixed(2),
                              ignoreFieldChange: true
                        });

                        if (Number(total_qty) >= 0) rec.setValue({
                              fieldId: 'custbody_total_count',
                              value: Number(total_qty),
                              ignoreFieldChange: true
                        });

                        if (Number(total_cube_ft) >= 0) rec.setValue({
                              fieldId: 'custbody_total_cube_ft',
                              value: total_cube_ft.toFixed(2),
                              ignoreFieldChange: true
                        });
                        //rec.save()
                  } catch (error) {
                        log.error('ERROR: setCubeAndWeight', error);
                  }
            }

            function getBaseCost(item) {
                  try {
                        //debugger;
                        var baseCost = -1;
                        if (!item) return vendorCost;
                        var itemSearchObj = search.create({
                              type: "item",
                              filters:
                                    [
                                          ["internalid", "anyof", item]
                                    ],
                              columns:
                                    [
                                          search.createColumn({ name: "custitem_acc_base_cost", label: "Base Cost" })
                                    ]
                        });
                        itemSearchObj.run().each(function (result) {
                              baseCost = Number(result.getValue('custitem_acc_base_cost'))
                              return false;
                        });
                        return baseCost
                  } catch (error) {
                        console.log(error)
                        log.error('Error in getBaseCost', error.toString())
                  }
            }

            function getLoadedCost(item) {
                  try {
                        //debugger;
                        var loadedCost = -1;
                        if (!item) return vendorCost;
                        var itemSearchObj = search.create({
                              type: "item",
                              filters:
                                    [
                                          ["internalid", "anyof", item]
                                    ],
                              columns:
                                    [
                                          search.createColumn({ name: "costestimate", label: "Loaded Cost" })
                                    ]
                        });
                        itemSearchObj.run().each(function (result) {
                              loadedCost = Number(result.getValue('costestimate'))
                              return false;
                        });
                        return loadedCost
                  } catch (error) {
                        console.log(error)
                        log.error('Error in getloadedCost', error.toString())
                  }
            }

            return {
                  beforeLoad: beforeLoad,
                  afterSubmit: afterSubmit
            };

      });