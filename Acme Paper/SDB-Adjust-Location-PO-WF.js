/**
 *@NApiVersion 2.1
 *@NScriptType WorkflowActionScript
 */
define(["N/search", "N/log", "N/record", "N/runtime"], function (search, log, record, runtime) {

    function onAction(context) {
        const RICHMOND = 103;
        const SAVAGE = 104;
        const DropshipWarehouse = 129;
        var currentRoleId = runtime.getCurrentUser().id
        if (currentRoleId == 75190) return; //2 High Jump id

        var salesRecord = context.newRecord;
        var lineItemCount = salesRecord.getLineCount("item");
        var recordType = salesRecord.type;
        
        log.debug('CONTEXT INFO: ', { current: context.type, ue: 'create' });
        if (recordType == 'salesorder' && context.type == 'create') populateWarehouse(salesRecord)

        if (recordType === 'salesorder' && salesRecord.getValue("customform") == 300) setDropShipmentLocations(salesRecord, DropshipWarehouse, lineItemCount)
        if (recordType === 'purchaseorder') updateMissingLocation(salesRecord);
        else adjustLocationSPS(context, RICHMOND, SAVAGE);



        var actualLocation = salesRecord.getValue("location");
        salesRecord.setValue('custbody_warehouse_roadnet', actualLocation);
    }

    function populateWarehouse(saleRec) {
        try {
            var address = saleRec.getValue("shipaddresslist");
            var warehouseToSet = getWarehouseSelected(saleRec);

            log.debug('WAREHOUSE TO SET: ', { warehouseToSet, address, orderId: saleRec.id });
            if (warehouseToSet) {
                saleRec.setValue({ fieldId: 'location', value: warehouseToSet });
                saleRec.setValue({ fieldId: 'custbody_warehouse_roadnet', value: warehouseToSet });
            }
        } catch (error) {
            log.error("ERROR: populateWarehouse", error);
        }
    }

    function getWarehouseSelected(SaleRecord) {
        try {
            var warehoseFormAddress = getWarehouse(SaleRecord, 'shipaddresslist');
            if (warehoseFormAddress) return warehoseFormAddress;

            warehoseFormAddress = getWarehouse(SaleRecord, 'entity');
            return warehoseFormAddress;
        } catch (error) {
            log.error("ERROR: getWarehouseSelected", error);
        }
    }

    function getWarehouse(saleOrder, option) {
        try {
            var warehouse = false;
            if (option == 'shipaddresslist') {
                let subRecord = saleOrder.getSubrecord('shippingaddress');
                if (subRecord) warehouse = subRecord.getValue('custrecord_ship_zone');
                return warehouse;
            } else if (option == 'entity') {
                let customer = saleOrder.getValue('entity');
                if (!customer) return null;
                let customerRecord = record.load({
                    type: 'customer',
                    id: customer,
                });
                var customerwarehouse = customerRecord.getValue('custentity_warehouse');
                return customerwarehouse;
            }
        } catch (error) {
            log.error("ERROR: getWarehouse", error);
        }
    }

    function updateMissingLocation(transaction) {
        try {
            var actualLocation = transaction.getValue("location");
            var lineItemCount = transaction.getLineCount("item");
            for (var i = 0; i < lineItemCount; i++) {
                transaction.selectLine({ sublistId: 'item', line: i });
                var currentLocation = transaction.getSublistValue({
                    sublistId: 'item',
                    fieldId: 'location',
                    line: i
                });
                var itemId = transaction.getSublistValue({
                    sublistId: 'item',
                    fieldId: 'item',
                    line: i
                });
                if (!currentLocation) {
                    transaction.setCurrentSublistValue({
                        sublistId: 'item',
                        fieldId: 'location',
                        value: actualLocation,
                        ignoreFieldChange: true
                    });
                    transaction.commitLine("item");
                    log.debug("Missing Location: ", { tranId: transaction.id, itemId, actualLocation });
                }
            }
        } catch (error) {
            log.error("ERROR in updateMissingLocation", error);
        }
    }

    function setDropShipmentLocations(salesRecord, DropshipWarehouse, lineItemCount) {
        try {
            salesRecord.setValue({ fieldId: 'location', value: DropshipWarehouse });
            for (var i = 0; i < lineItemCount; i++) {
                salesRecord.selectLine({ sublistId: 'item', line: i });

                //Set actual item qty
                salesRecord.setCurrentSublistValue({
                    sublistId: 'item',
                    fieldId: 'location',
                    value: DropshipWarehouse
                });

                salesRecord.commitLine("item");
            }
        } catch (e) {
            log.error("error in function setDropShipmentLocations ", e);
        }

    }
    // ---------------------------- ADJUST LOCATION WAREHOUSE SPS ------------------------

    function adjustLocationSPS(context, RICHMOND, SAVAGE) {
        try {
            var salesRecord = context.newRecord;
            var newRec = salesRecord;
            if (!salesRecord) return;
            var actualLocation = salesRecord.getValue("location");
            salesRecord.setValue('custbody_warehouse_roadnet', actualLocation);
            if (!actualLocation) return;

            var lineItemCount = salesRecord.getLineCount("item");
            if (lineItemCount < 1) return;

            var itemsInfoLines = [];
            var itemsArray = [];

            //We are going to iterate over sales items
            for (var i = 0; i < lineItemCount; i++) {
                var obj = {};

                var itemId = salesRecord.getSublistValue({
                    sublistId: 'item',
                    fieldId: 'item',
                    line: i
                });
                if (!itemId) continue;

                var itemQuantity = salesRecord.getSublistValue({
                    sublistId: 'item',
                    fieldId: 'quantity',
                    line: i
                });

                var itemRate = salesRecord.getSublistValue({
                    sublistId: 'item',
                    fieldId: 'rate',
                    line: i
                });

                obj.rate = itemRate;
                obj.itemId = itemId;
                obj.qty = itemQuantity;
                obj.line = i;

                itemsInfoLines.push(obj);
                itemsArray.push(itemId);
            }

            //Bring all line items with available quantity gratear than 0 for each Warehouse
            var itemInfo = getLocationsAvailablePerItem(itemsArray);
            if (!itemInfo) return;

            log.debug("Data: ", { transaction: newRec.id, itemsInfoLines, actualLocation });

            //This step will set location in each line item to the primary location in the sales order only if it has (quantity available - qtyline item) greater than 0
            itemsInfoLines.forEach(function (item) {
                if (actualLocation != SAVAGE && actualLocation != RICHMOND) {// Add 4/4/24
                    salesRecord.selectLine({
                        sublistId: 'item',
                        line: item.line
                    });
                    salesRecord.setCurrentSublistValue({
                        sublistId: 'item',
                        fieldId: 'location',
                        value: actualLocation,
                        ignoreFieldChange: true
                    });
                    salesRecord.commitLine({
                        sublistId: 'item'
                    });
                }
                //If warehouse at header line is SAVAGE
                if (actualLocation == SAVAGE) {
                    //Set location in item line
                    salesRecord.selectLine({ sublistId: 'item', line: item.line });

                    salesRecord.setCurrentSublistValue({
                        sublistId: 'item',
                        fieldId: 'location',
                        value: SAVAGE,
                        ignoreFieldChange: true
                    });

                    var locations = itemInfo[item.itemId]?.locations || [];

                    if (locations.length) {
                        log.debug('SAVAGE locations', locations);
                        var locationFound = locations.find(element => (Number(element.location) == Number(actualLocation)) && (Number(element.quantity) - Number(item.qty) >= 0));
                        if (locationFound) {
                            // Set available quantity at that location
                            salesRecord.setCurrentSublistValue({
                                sublistId: 'item',
                                fieldId: 'quantityavailable',
                                value: locationFound.quantity,
                                ignoreFieldChange: true
                            });
                        }
                        else {
                            // Set available quantity at that location
                            salesRecord.setCurrentSublistValue({
                                sublistId: 'item',
                                fieldId: 'quantityavailable',
                                value: 0,
                                ignoreFieldChange: true
                            });
                        }
                    }

                    salesRecord.commitLine("item");
                }
                //If warehouse at header line is RICHMOND
                else if (actualLocation == RICHMOND) {


                    //This step will set location in each line item to the primary location in the sales order only if it has (quantity available - qtyline item) greater than 0
                    //Get locations for this item
                    var locationToSet;
                    var locations = itemInfo[item.itemId]?.locations || [];
                    // var savageLocation = locations.find(element => (Number(element.location) == Number(SAVAGE)));
                    //If item in richmond has backordered qty then we are going to create a new line and set savage
                    //as location

                    var enteredBySPS = salesRecord.getValue("custbody_aps_entered_by");
                    enteredBySPS = enteredBySPS == 84216;

                    var locationFound = locations.find(element => (Number(element.location) == Number(actualLocation)));
                    var hasRitchmondStock = locations.find(element => (Number(element.location) == Number(RICHMOND)) && (Number(element.quantity) - Number(item.qty) >= 0));
                    // var isRitchmodCustomer = getIsRitchmodCustomer(salesRecord.getValue('entity'), RICHMOND);
                    var isOnlySavageStock = getOnlySavageStock(item.itemId);

                    log.debug("RITCHMOND CASE INFO: ", { item: item.itemId, locationFound, locations, isOnlySavageStock, orderId: salesRecord.id });

                    if (hasRitchmondStock) {//&& (!savageLocation || !locations.length)) {
                        salesRecord.selectLine({ sublistId: 'item', line: item.line });
                        salesRecord.setCurrentSublistValue({
                            sublistId: 'item',
                            fieldId: 'location',
                            value: RICHMOND,
                        });
                        salesRecord.commitLine("item");
                        return;
                    }

                    if (isOnlySavageStock) {
                        salesRecord.selectLine({ sublistId: 'item', line: item.line });
                        salesRecord.setCurrentSublistValue({
                            sublistId: 'item',
                            fieldId: 'location',
                            value: SAVAGE,
                        });
                        salesRecord.commitLine("item");
                        return;
                    }

                    if (locationFound && (Number(item.qty) - Number(locationFound.quantity) > 0)) { // Maggie issue SO10080395 - 500431 (10/07/2024)
                        //Set qty for actual line to max qty available in Richmond
                        salesRecord.selectLine({ sublistId: 'item', line: item.line });
                        salesRecord.setCurrentSublistValue({
                            sublistId: 'item',
                            fieldId: 'location',
                            value: RICHMOND,
                        });
                        //Set actual item qty
                        salesRecord.setCurrentSublistValue({
                            sublistId: 'item',
                            fieldId: 'quantity',
                            value: locationFound.quantity,
                        });

                        salesRecord.commitLine("item");

                        salesRecord.selectNewLine("item");


                        //Set item id
                        salesRecord.setCurrentSublistValue({
                            sublistId: 'item',
                            fieldId: 'item',
                            value: item.itemId,
                        });

                        //Set item qty
                        salesRecord.setCurrentSublistValue({
                            sublistId: 'item',
                            fieldId: 'quantity',
                            value: (Number(item.qty) - Number(locationFound.quantity)),
                        });

                        //Set item rate
                        salesRecord.setCurrentSublistValue({
                            sublistId: 'item',
                            fieldId: 'rate',
                            value: item.rate,
                        });

                        //Set item location to Savage
                        salesRecord.setCurrentSublistValue({
                            sublistId: 'item',
                            fieldId: 'location',
                            value: SAVAGE,
                        });

                        salesRecord.commitLine("item");
                        return;
                    }
                    else {
                        log.debug('STATUS', 'ITEM DOES NOT HAVE BACKORDER');
                        if (!locations.length) {
                            locationToSet = SAVAGE;
                        } else {
                            var locationFound = locations.find(element => (Number(element.location) == Number(RICHMOND)) && (Number(element.quantity) - Number(item.qty) >= 0));
                            var hasSavageStock = locations.find(element => (Number(element.location) == Number(SAVAGE)) && (Number(element.quantity) - Number(item.qty) >= 0));
                            //If location is not equal to location in sales order then we are going to set SAVAGE
                            if (!locationFound && hasSavageStock) { locationToSet = SAVAGE; } else { locationToSet = actualLocation; }//Add 17/4/24

                        }
                        log.debug('final location set', { locationToSet, item });
                        //Set location in item line
                        salesRecord.selectLine({ sublistId: 'item', line: item.line });
                        if (locationToSet) {

                            salesRecord.setCurrentSublistValue({
                                sublistId: 'item',
                                fieldId: 'location',
                                value: Number(locationToSet),
                                ignoreFieldChange: false,
                                forceSyncSourcing: true
                            });
                        }
                        salesRecord.commitLine("item");
                        return;
                    }

                }//End if backorder
            });

        }
        catch (error) {
            log.error('error', error);
        }
    }

    function getOnlySavageStock(itemId) {
        try {
            if (!itemId) return false;
            log.debug('FUNCTION getOnlySavageStock: ', { itemId })
            var itemInfo = search.lookupFields({
                type: search.Type.ITEM,
                id: itemId,
                columns: ['custitem_store_at_savage', 'custitem_store_at_richmond']
            });
            log.debug('itemInfo', itemInfo);
            if (!itemInfo) return false;
            return itemInfo.custitem_store_at_savage && !itemInfo.custitem_store_at_richmond;
        } catch (error) {
            log.error("ERROR getOnlySavageStock: ", error);
        }
    }

    function getIsRitchmodCustomer(customerId, RICHMOND) {
        try {
            var customerInfo = search.lookupFields({
                type: search.Type.CUSTOMER,
                id: customerId,
                columns: ['custentity_warehouse']
            });
            log.debug('customerInfo', customerInfo);
            customerInfo = customerInfo.custentity_warehouse;
            return customerInfo ? customerInfo[0].value == RICHMOND : false;
        } catch (error) {
            log.error("ERROR: ", error);
        }
    }

    function getLocationsAvailablePerItem(itemsArray) {
        var itemsInfo = {};

        var inventoryitemSearchObj = search.create({
            type: "item",
            filters:
                [
                    ["internalid", "anyof", itemsArray]
                ],
            columns:
                [
                    search.createColumn({ name: "locationquantityavailable", label: "Location Available" }),
                    search.createColumn({ name: "inventorylocation", label: "Inventory Location" }),
                    search.createColumn({
                        name: "internalid",
                        sort: search.Sort.ASC,
                        label: "Internal ID"
                    })
                ]
        });
        inventoryitemSearchObj.run().each(function (result) {
            if (!itemsInfo[result.id]) itemsInfo[result.id] = { locations: [] };

            var locationQtySearch = result.getValue("locationquantityavailable");
            if (locationQtySearch == "" || Number(locationQtySearch) <= 0) return true;

            var obj = {};
            obj.location = result.getValue("inventorylocation");
            obj.quantity = locationQtySearch;
            itemsInfo[result.id].locations.push(obj);


            return true;
        });

        return itemsInfo;

    }

    // -----------------------------------------------------------------------------------
    return {
        onAction: onAction
    }
});
