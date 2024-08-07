/**
 * @NApiVersion 2.x
 * @NScriptType UserEventScript
 * @NModuleScope SameAccount
 * SB
 */
define(['N/search', 'N/record', 'N/runtime', 'N/file'],

    function (search, record, runtime, file) {

        /**
         * Function definition to be triggered before record is loaded.
         *
         * @param {Object} scriptContext
         * @param {Record} scriptContext.newRecord - New record
         * @param {Record} scriptContext.oldRecord - Old record
         * @param {string} scriptContext.type - Trigger type
         * @Since 2015.2
         */

        function beforeSubmit(context) {
            try {
                var newRec = context.newRecord;
                executeFuelCherge(context);
                if (newRec.type != 'salesorder') return
                var createdFromSo = newRec.getValue('createdfrom');
                //log.debug('createdFromSo - beforeSubmit ', createdFromSo);
                var enteredBy = newRec.getValue({ fieldId: "custbody_aps_entered_by" })
                log.debug('enteredBy - beforeSubmit ', enteredBy);
                if (enteredBy == 84216) {
                    newRec.setValue({
                        fieldId: 'custbody_sdb_so_from_sps',
                        value: true,
                    });
                }
                //ADDED Logic: For invoices, if est. gross profit is greater than 0, check Elegible For Commission to true
                if ((Number(newRec.getValue({ fieldId: "estgrossprofit" })) > 0) && (context.type == context.UserEventType.CREATE)) {
                    newRec.setValue({
                        fieldId: 'custbody_acc_elg_commission',
                        value: true,
                        ignoreFieldChange: true
                    });
                }

                if (createdFromSo != 317 && createdFromSo != 300) { //if form != ACME Sales Order Drop Ship Entry && form != ACME Bill and Hold SO  add 5/4/24
                    log.debug('Set  custbody_a1wms_dnloadtowms SO id:' + newRec.id || '', "true");
                    newRec.setValue({
                        fieldId: 'custbody_a1wms_dnloadtowms',
                        value: true,
                        ignoreFieldChange: true
                    });
                }

            } catch (error) {
                log.error({
                    title: 'ERRORbeforeSubmit ',
                    details: error
                })
            }
        }

        function executeFuelCherge(scriptContext) {
            try {

                log.debug({ title: 'data', details: 'In Aftersubmit context--' + scriptContext.type });
                if (scriptContext.type == 'delete') return;
                var newRec = scriptContext.newRecord;
                if (newRec.type == 'returnauthorization') return

                if (newRec.getValue('custbody_sdb_charge_fuel_fee')) { //don't add surcharge if is backordered or this checkbox is checked by user or use function to remove it from the record
                    removeFuelCharge(newRec);
                    return;
                }

                if (newRec.type == 'salesorder') return
                log.debug({ title: 'newRec.type - ID', details: newRec.type + ' - ' + newRec.id });
                var isDropShipInvoice = newRec.getValue('custbody_dropship_order');
                log.debug('isDropShipInvoice', isDropShipInvoice);

                if (scriptContext.type == 'create' /*|| scriptContext.type == 'edit'*/) {
                    var scriptObj = runtime.getCurrentScript();
                    var itemForCherge = scriptObj.getParameter({ name: 'custscript_sdb_item_surcharge' })
                    var paramShipMethod = scriptObj.getParameter({ name: 'custscript_sdb_shipping_method' })
                    var thisForm = newRec.getValue('customform');
                    var createdFromSo = newRec.getValue('createdfrom');
                    var id = newRec.id;
                    var entity = newRec.getValue({ fieldId: 'entity' });
                    var shipMethod = newRec.getValue({ fieldId: 'shipmethod' });

                    // Get customer attr for validation and  for item pricing
                    var thisCustomer = record.load({
                        type: record.Type.CUSTOMER,
                        id: entity,
                        isDynamic: true,
                    })
                    var fuelCharge = thisCustomer.getValue('custentity_fuel_surcharge');
                    var fuelChargeCheck = thisCustomer.getValue('custentity_acc_fuel_charge');

                    //Start Form validation   (ACME Bill and Hold SO)
                    var paramForm = scriptObj.getParameter({ name: 'custscript_sdb_form_validation' });// now is (ACME Bill and Hold SO)                   
                  
                    var formSo;
                    //START ON INVOICE
                    if (newRec.type == 'invoice' && createdFromSo) {
                        var recObj = newRec//record.load({ type: newRec.type, id: id, isDynamic: true });
                        // var qtyNot_0 = containLineWithQty(recObj);
                        var originalSoData = search.lookupFields({
                            type: 'salesorder',
                            id: createdFromSo,
                            columns: ['customform', 'shipmethod', 'custbody_dropship_order', 'shipAddress', 'trandate']
                        });
                        //if(!qtyNot_0) return;
                        formSo = originalSoData.customform && originalSoData.customform[0] ? originalSoData.customform[0].value : '';
                        shipMethod = originalSoData.shipmethod && originalSoData.shipmethod[0] ? originalSoData.shipmethod[0].value : '';
                        var dropShpForm = scriptObj.getParameter({ name: 'custscript_sdb_drop_shipment_form' });//add 9/5
                        log.audit('dropShpForm - formSo', dropShpForm + ' - ' + formSo);
                        if (formSo == dropShpForm) return; //add 9/5
                        var shipAddress = newRec.getValue('shipaddress');//add 12/4
                        var date = recObj.getText({ fieldId: "trandate" });
                        var price;
                        if (formSo == paramForm) return
                        var existsLine = recObj.findSublistLineWithValue({
                            sublistId: "item",
                            fieldId: 'item',
                            value: itemForCherge
                        });
                        price = getItemPrice(thisCustomer, itemForCherge);// Search the customer if it has item pricing for the item
                        log.debug('price', price);
                        if (shipMethod == paramShipMethod && !isDropShipInvoice) {
                            log.debug('price', price);
                            var hasSo = orderCount(entity, id, itemForCherge, shipAddress, 'invoice', originalSoData.trandate);
                            log.debug({ title: 'hasInv ID: ' + id, details: hasSo })
                            if (hasSo > 0) return; //add 12/4
                            if (fuelChargeCheck && (fuelCharge || price) && existsLine == -1) {
                                addLineItemCherge(recObj, itemForCherge, fuelCharge, price);//Add fuel charge in the invoice                            
                            }
                        }

                        var itemForFreight = scriptObj.getParameter({ name: 'custscript_sdb_item_freight' })
                        getItemChargeAmount(recObj, itemForCherge, itemForFreight);
                      
                    }
                    //End ON INVOICE
                }
            }
            catch (e) {
                log.error('Error AfterSubmit: ' + newRec.type + ' - ' + newRec.id, e);
            }
        }

        //Validate that there is no sales order for this customer on the current day to add or not the charge item (Add 9/8)
        function orderCount(customer, id, item, shipAddress, type, date) {
            try {
                // log.debug('customer,soId,item', customer + ' , ' + soId + ' , ' + item); 
                log.debug('shipAddress', shipAddress);
                var filter = [
                    ["item", "anyof", item],
                    "AND",
                    ["datecreated", "on", 'today'],
                    // "AND",
                    // ["internalid", "noneof", id],
                    "AND",
                    ["customer.internalid", "anyof", customer]
                ]
                var salesorderSearchObj = search.create({
                    type: "invoice",
                    filters: filter,
                    columns:
                        [
                            search.createColumn({ name: "shipaddress", label: "Shipping Address" }),
                            search.createColumn({ name: "shipaddress1", label: "Shipping Address 1" }),
                            search.createColumn({ name: "shipaddress2", label: "Shipping Address 2" })
                        ]
                });

                var searchResultCount = salesorderSearchObj.runPaged().count;
                log.debug("invoice result count for id: " + id, searchResultCount);
                var count = 0;
                var soId;
                salesorderSearchObj.run().each(function (result) {
                    var ssAddress = result.getValue('shipaddress');
                    ssAddress = ssAddress.replace(/[^a-zA-Z0-9]/g, '').trim().toUpperCase();
                    shipAddress = shipAddress.replace(/[^a-zA-Z0-9]/g, '').trim().toUpperCase();
                    log.audit("rssAddress", ssAddress)
                    log.audit("shipAddress", shipAddress)
                    log.audit("rssAddress.length", ssAddress.length)
                    log.audit("shipAddress.length", shipAddress.length)
                    log.audit("compare", ssAddress == shipAddress);
                    if (ssAddress == shipAddress) {
                        soId = result.id;
                        count++;
                        log.audit("count>", count);
                        return false;
                    }
                    return true;
                });
                log.audit("count>>>", count);
                return count
            } catch (e) {
                log.error({
                    title: 'addCharge',
                    details: e
                })
            }
        }

        // Add item fuel cherge line
        function addLineItemCherge(recObj, itemForCherge, fuelCharge, price) {
            try {
                var lineNumber = recObj.getLineCount({
                    sublistId: 'item'
                });

                recObj.insertLine({
                    sublistId: 'item',
                    line: lineNumber
                });
                var rate = price ? price : fuelCharge;

                recObj.setSublistValue({
                    sublistId: 'item',
                    fieldId: 'item',
                    line: lineNumber,
                    value: itemForCherge
                });

                recObj.setSublistValue({
                    sublistId: 'item',
                    fieldId: 'taxcode',
                    line: lineNumber,
                    value: -7
                });

                recObj.setSublistValue({
                    sublistId: 'item',
                    fieldId: 'custcol_sdb_hide_pdf',
                    line: lineNumber,
                    value: true
                });

                recObj.setSublistValue({
                    sublistId: 'item',
                    fieldId: 'description',
                    line: lineNumber,
                    value: getDescriptionSearch(itemForCherge) || "",
                });


                recObj.setSublistValue({
                    sublistId: 'item',
                    fieldId: 'price',
                    line: lineNumber,
                    value: -1
                });
                recObj.setSublistValue({
                    sublistId: 'item',
                    fieldId: 'rate',
                    line: lineNumber,
                    value: rate
                });
                recObj.setSublistValue({
                    sublistId: 'item',
                    fieldId: 'amount',
                    line: lineNumber,
                    value: rate
                });

                recObj.setSublistValue({
                    sublistId: 'item',
                    fieldId: 'location',
                    line: lineNumber,
                    value: 104
                });

                recObj.setSublistValue({
                    sublistId: 'item',
                    fieldId: 'location',
                    line: lineNumber,
                    value: 104
                });



            } catch (error) {
                log.error("addLineItemCherge ", error.toString());
            }
        }

        //Get description from item fuel charge
        function getDescriptionSearch(id) {
            try {
                var nameItem = search.lookupFields({
                    type: 'otherchargeitem',
                    id: id,
                    columns: ['salesdescription', 'displayname']
                });
                log.debug('nameItem', nameItem);
                if (Object.hasOwnProperty('salesdescription')) {
                    nameItem = nameItem.salesdescription
                } else {
                    nameItem = nameItem.displayname;
                }

                log.debug('nameItem', nameItem);
                return nameItem;
            } catch (error) {
                log.error('error in descripction search', error);
            }
        }

        // Search the customer if it has item pricing for the item
        function getItemPrice(customer, item) {
            try {
                var itemLine = customer.findSublistLineWithValue({
                    sublistId: 'itempricing',
                    fieldId: 'item',
                    value: item
                });
                var price = '';
                if (itemLine != -1) {
                    var lineSelected = customer.selectLine({
                        sublistId: 'itempricing',
                        line: itemLine
                    })
                    price = customer.getCurrentSublistValue({ sublistId: 'itempricing', fieldId: 'price', line: lineSelected })
                }
                return price;
            } catch (error) {
                log.error("Error in getItemPrice: ", error.toString());
            }
        }


        // Remove item fuel charge line from the order if any
        function removeFuelCharge(salesOrder) {
            var itemfuelCharge = runtime.getCurrentScript().getParameter({ name: 'custscript_sdb_item_surcharge' });
            var lineCount = salesOrder.getLineCount({ sublistId: 'item' });
            var recObj;
            for (var i = 0; i <= lineCount; i++) {
                var item = salesOrder.getSublistValue({
                    sublistId: 'item',
                    fieldId: 'item',
                    line: i
                });
                if (item == itemfuelCharge) {
                    if (!recObj) recObj = record.load({ type: salesOrder.type, id: salesOrder.id, isDynamic: true });

                    recObj.removeLine({ sublistId: 'item', line: i });

                    log.debug('charge line removed', i);
                }
            }
            //if(recObj) recObj.save();
        }

        // Search item charge for amount
        function getItemChargeAmount(soRecord, itemFuel, itemFreight) {
            try {
                var fuel_chargeLine = soRecord.findSublistLineWithValue({
                    sublistId: 'item',
                    fieldId: 'item',
                    value: itemFuel
                });
                var freight_amountLine = soRecord.findSublistLineWithValue({
                    sublistId: 'item',
                    fieldId: 'item',
                    value: itemFreight
                });
                var priceFuel = '';
                var priceFreight = '';
                var freight_value = ''
                if (fuel_chargeLine != -1) {             
                    priceFuel = soRecord.getSublistValue({ sublistId: 'item', fieldId: 'amount', line: fuel_chargeLine })
                }
                if (freight_amountLine != -1) {
                   
                    priceFreight = soRecord.getSublistValue({ sublistId: 'item', fieldId: 'amount', line: freight_amountLine });
                    var costEstimate = soRecord.getSublistValue({ sublistId: 'item', fieldId: 'costestimate', line: freight_amountLine });
                    freight_value = (Number(priceFreight) - Number(costEstimate)).toFixed(2); //Add 18/06

                }

                if (freight_amountLine != -1) soRecord.setValue({ fieldId: "custbody_sdb_freight_amount", value: freight_value })
                if (fuel_chargeLine != -1) soRecord.setValue({ fieldId: "custbody_sdb_fuel_charge_amount", value: priceFuel })

            } catch (error) {
                log.error("Error in getItemChargeAmount: ", error.toString());
            }
        }

        return {
            beforeSubmit: beforeSubmit,
            // afterSubmit: afterSubmit
        };

    });
