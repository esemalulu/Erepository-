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

        function afterSubmit(scriptContext) {
            try {

                log.debug({ title: 'data', details: 'In Aftersubmit context--' + scriptContext.type });
                if (scriptContext.type == 'delete') return;
                var newRec = scriptContext.newRecord;
                if (newRec.type == 'returnauthorization') return
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
                    var paramForm = scriptObj.getParameter({ name: 'custscript_sdb_form_validation' });// now is (ACME Bill and Hold SO)                    log.audit({ title: 'FORMS', details: thisForm + "-" + paramForm });
                    //  if (thisForm == paramForm) return;
                    var formSo;
                    //START ON INVOICE
                    if (newRec.type == 'invoice' && createdFromSo) {
                        var recObj = record.load({ type: newRec.type, id: id, isDynamic: true });
                        // var qtyNot_0 = containLineWithQty(recObj);
                        var originalSoData = search.lookupFields({
                            type: 'salesorder',
                            id: createdFromSo,
                            columns: ['customform', 'shipmethod', 'custbody_dropship_order', 'shipAddress', 'trandate']
                        });
                        //if(!qtyNot_0) return;
                        formSo = originalSoData.customform && originalSoData.customform[0] ? originalSoData.customform[0].value : '';
                        shipMethod = originalSoData.shipmethod && originalSoData.shipmethod[0] ? originalSoData.shipmethod[0].value : '';
                        var custbody_dropship_order = originalSoData ? originalSoData.custbody_dropship_order : false; 
                        var dropShpForm = scriptObj.getParameter({ name: 'custscript_sdb_drop_shipment_form' });//add 9/5
                        log.audit('dropShpForm - formSo', dropShpForm +' - '+formSo);
                        if (formSo == dropShpForm) return; //add 9/5
                        //var shipAddress = originalSoData.shipAddress ? originalSoData.shipAddress : '';
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
                            var hasSo = orderCount(entity, id, itemForCherge, shipAddress, 'invoice', originalSoData.trandate);
                            log.debug({ title: 'hasInv ID: '+id, details: hasSo })
                            if (hasSo > 0) return; //add 12/4
                            if (fuelChargeCheck && (fuelCharge || price) && existsLine == -1) {
                                addLineItemCherge(recObj, itemForCherge, fuelCharge, price);//Add fuel charge in the invoice                            
                            }
                        }

                        var itemForFreight = scriptObj.getParameter({ name: 'custscript_sdb_item_freight' })
                        getItemChargeAmount(recObj, itemForCherge, itemForFreight);
                        var invID = recObj.save({
                            enableSourcing: true,
                            ignoreMandatoryFields: true
                        })
                        log.debug('invID', invID);
                    }
                    //End ON INVOICE

                    //START ON SALES ORDER
                    if (shipMethod == paramShipMethod && newRec.type == 'salesorder' && !newRec.getValue('custbody_dropship_order')) {
                        if (thisForm == paramForm) return;
                        var recObj = record.load({ type: newRec.type, id: id, isDynamic: true });
                        log.debug('paramShipMethod - shipMethod', paramShipMethod + ' - ' + shipMethod);
                        var shipAddress = recObj.getValue('shipaddress');
                        log.debug('shipAddress SO', shipAddress);

                        var add_Charge = addCharge(entity, newRec.id, itemForCherge, shipAddress, 'salesorder', null);//Validate that there is no sales order for this customer on the current day to add or not the charge item (Add 9/8)
                        log.debug('itemForCherge', itemForCherge);
                        log.debug('add_Charge', add_Charge);
                        var notFullBO = true // containAvailableLine(recObj); // THIS WAS COMMENTED SO IT WILL ALWAYS ADD THE FUEL CHARGE
                        log.debug('notFullBO', notFullBO);
                        var line = setNotTaxableItemCharge(recObj);
                        var existsLine = recObj.findSublistLineWithValue({
                            sublistId: "item",
                            fieldId: 'item',
                            value: itemForCherge
                        });

                        if (fuelChargeCheck && fuelCharge && add_Charge == 0) {
                            //Add item non-inventory for fuel charge
                            var charge = fuelCharge;
                            recObj.setValue({ fieldId: 'custbody_fuel_surcharge', value: charge });
                            //   var flag = validateItemSet(recObj, itemForCherge, charge, false)
                            log.debug('itemForCherge SO', itemForCherge);
                            log.debug('line SO-2', line);
                            if (charge && itemForCherge && existsLine == -1) {

                                if (notFullBO) addLineItemCherge(recObj, itemForCherge, fuelCharge);
                            }
                            var so_id = recObj.save({
                                enableSourcing: true,
                                ignoreMandatoryFields: true
                            })
                            log.debug('so_id', so_id)
                        }

                    }
                    //END ON SALES ORDER
                }
            }
            catch (e) {
                 log.error('Error AfterSubmit: '+newRec.type + ' - ' + newRec.id, e);
            }
        }

        //Return Item with stock
        function containAvailableLine(rec) {
            try {
                var lineCount = rec.getLineCount({ sublistId: "item" });
                for (var i = 0; i < lineCount; i++) {

                    var qtyAvailable = rec.getSublistValue({
                        sublistId: "item",
                        fieldId: "quantityavailable",
                        line: i,
                    });

                    if (qtyAvailable && qtyAvailable > 0) return true
                }

                return false;
            } catch (error) {
                log.error("Error in getSalesOrderLines", error.toString());
            }
        }

        function containLineWithQty(rec) {
            try {
                var lineCount = rec.getLineCount({ sublistId: "item" });
                for (var i = 0; i < lineCount; i++) {

                    var qty = rec.getSublistValue({
                        sublistId: "item",
                        fieldId: "quantity",
                        line: i,
                    });

                    if (qty && qty > 0) return true
                }

                return false;
            } catch (error) {
                log.error("Error in containLineWithQty", error.toString());
            }
        }

        //Validate that there is no sales order for this customer on the current day to add or not the charge item (Add 9/8)
        function orderCount(customer, id, item, shipAddress, type, date) {
            try {
                // log.debug('customer,soId,item', customer + ' , ' + soId + ' , ' + item); log.debug('customer,soId,item', customer + ' , ' + soId + ' , ' + item);

                var filter = [
                    ["item", "anyof", item],
                    "AND",
                    ["trandate", "on", 'today'],
                    "AND",
                    ["internalid", "noneof", id],
                    "AND",
                    ["customer.internalid", "anyof", customer]
                ]
                var salesorderSearchObj = search.create({
                    type: "invoice",
                    filters: filter,
                    columns:
                        [
                            search.createColumn({ name: "shipaddress", label: "Shipping Address" })
                        ]
                });

                var searchResultCount = salesorderSearchObj.runPaged().count;
                log.debug("salesorderSearchObj result count", searchResultCount);
                var count = 0;
                var soId;
                salesorderSearchObj.run().each(function (result) {
                    log.debug("result.getValue('shipaddress')", result.getValue('shipaddress'))
                    log.debug("shipAddress", shipAddress)
                    if (result.getValue('shipaddress') && result.getValue('shipaddress').toUpperCase().trim() == shipAddress.toUpperCase().trim()) {
                        soId = result.id;
                        count++;
                        return false;
                    }
                    return true;
                });
                return count
            } catch (e) {
                log.error({
                    title: 'addCharge',
                    details: e
                })
            }
        }

        // Function to set not-taxable charge item
        function setNotTaxableItemCharge(recObj) {
            //function Author bernabee
            /**
            * This code searches for lines in a sublist based on SAP or UPC codes
            * and sets certain values on those lines if found.
            */
            try {
                // Constants to avoid magic numbers
                var TAX_CODE_CUSTOM_VALUE = -7;
                var sublistId = "item";

                // Descriptive variable names
                var sapCode = 'SAP0998100';
                var upcCode = '55000009981003';

                // Reference variables for sublists and fields
                var taxCodeFieldId = 'taxcode';
                var hidePdfFieldId = 'custcol_sdb_hide_pdf';

                // Search for lines in the sublist
                var lineUpc = recObj.findSublistLineWithValue({
                    sublistId: "item",
                    fieldId: 'custcol_sps_upc',
                    value: upcCode
                });
                var lineSap = recObj.findSublistLineWithValue({
                    sublistId: "item",
                    fieldId: 'custcol_sps_bpn',
                    value: sapCode
                });
                log.debug('lineUpc', lineUpc);
                log.debug('lineSap', lineSap);

                // Select the appropriate line and set values if found
                if (lineUpc > -1 || lineSap > -1) {
                    var line = (lineUpc > -1) ? lineUpc : lineSap;
                    if (recObj.getSublistValue({
                        sublistId: 'item',
                        fieldId: 'taxCodeFieldId',
                        line: line
                    }) == -7) {
                        return;
                    }

                    // Select the line in the sublist
                    recObj.selectLine({
                        sublistId: sublistId,
                        line: line
                    });

                    // Set values on the selected line
                    recObj.setCurrentSublistValue({
                        sublistId: sublistId,
                        fieldId: taxCodeFieldId,
                        value: TAX_CODE_CUSTOM_VALUE
                    });
                    recObj.setCurrentSublistValue({
                        sublistId: sublistId,
                        fieldId: hidePdfFieldId,
                        value: true
                    });

                    // Commit the line and save the record
                    recObj.commitLine({
                        sublistId: sublistId
                    });

                    recObj.save({
                        enableSourcing: true,
                        ignoreMandatoryFields: true
                    });

                }
                return line;
            } catch (error) {
                // Handle the error in some way, for example, throw an exception or log it
                log.error("Error saving the record: ", error.toString());
            }
        }

        // Add item fuel cherge line
        function addLineItemCherge(recObj, itemForCherge, fuelCharge, price) {
            try {
                recObj.selectNewLine({
                    sublistId: 'item'
                });
                var rate = price ? price : fuelCharge;
                recObj.setCurrentSublistValue({
                    sublistId: 'item',
                    fieldId: 'item',
                    value: itemForCherge,
                    ignoreFieldChange: true,
                    forceSyncSourcing: true
                });
                recObj.setCurrentSublistValue({
                    sublistId: 'item',
                    fieldId: 'taxcode',
                    value: -7,
                });

                recObj.setCurrentSublistValue({
                    sublistId: 'item',
                    fieldId: 'custcol_sdb_hide_pdf',
                    value: true,
                });
                recObj.setCurrentSublistValue({
                    sublistId: 'item',
                    fieldId: 'description',
                    value: getDescriptionSearch(itemForCherge) || "",
                    ignoreFieldChange: true,
                    forceSyncSourcing: true
                });

                recObj.setCurrentSublistValue({
                    sublistId: 'item',
                    fieldId: 'price',
                    value: -1,
                    ignoreFieldChange: true,
                    forceSyncSourcing: true
                });
                recObj.setCurrentSublistValue({
                    sublistId: 'item',
                    fieldId: 'rate',
                    value: rate,
                    ignoreFieldChange: true,
                    forceSyncSourcing: true
                });
                recObj.setCurrentSublistValue({
                    sublistId: 'item',
                    fieldId: 'amount',
                    value: rate,
                    ignoreFieldChange: true,
                    forceSyncSourcing: true
                });
                recObj.setCurrentSublistValue({
                    sublistId: 'item',
                    fieldId: 'taxcode',
                    value: -7,
                    ignoreFieldChange: true,
                    forceSyncSourcing: true
                });
                recObj.setCurrentSublistValue({
                    sublistId: 'item',
                    fieldId: 'location',
                    value: 104,
                    ignoreFieldChange: true,
                    forceSyncSourcing: true
                });
                recObj.setCurrentSublistValue({
                    sublistId: 'item',
                    fieldId: 'custcol_sdb_hide_pdf',
                    value: true,
                    ignoreFieldChange: true,
                    forceSyncSourcing: true
                });
                recObj.commitLine({
                    sublistId: 'item'
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
                if (fuel_chargeLine != -1) {
                    soRecord.selectLine({
                        sublistId: 'item',
                        line: fuel_chargeLine
                    })
                    priceFuel = soRecord.getCurrentSublistValue({ sublistId: 'item', fieldId: 'amount', line: fuel_chargeLine })
                }
                if (freight_amountLine != -1) {
                    soRecord.selectLine({
                        sublistId: 'item',
                        line: freight_amountLine
                    })
                    priceFreight = soRecord.getCurrentSublistValue({ sublistId: 'item', fieldId: 'amount', line: freight_amountLine })
                }
                
                if (freight_amountLine != -1) soRecord.setValue({ fieldId: "custbody_sdb_freight_amount", value: priceFreight })
                if (fuel_chargeLine != -1) soRecord.setValue({ fieldId: "custbody_sdb_fuel_charge_amount", value: priceFuel })

            } catch (error) {
                log.error("Error in getItemChargeAmount: ", error.toString());
            }
        }

        return {
            beforeSubmit: beforeSubmit,
            afterSubmit: afterSubmit
        };

    });
