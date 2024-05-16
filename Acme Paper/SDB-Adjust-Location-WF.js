/**
 *@NApiVersion 2.1
 *@NScriptType WorkflowActionScript
 */
define(["N/search", "N/log", "N/record"], function (search, log, record) {

    function onAction(context) {
        const RICHMOND = 103;
        const SAVAGE = 104;
        const DropshipWarehouse = 129;

        let allLinesDone = false;
        let iterator = 0;
        var salesRecord = context.newRecord;
        var lineItemCount = salesRecord.getLineCount("item");
        try {
            if (salesRecord.getValue("customform") == 300) {
                log.audit("lineItemCount: ", lineItemCount)
                log.audit("in dropshipment form: ", "DropshipWarehouse")
                //  setDropShipmentLocations(salesRecord,DropshipWarehouse, lineItemCount);
                return;
            }

            while (!allLinesDone || iterator < 2) {
                iterator++;

                log.debug('STATUS', 'WORKFLOW RUNNING');


                if (!salesRecord) return;

                //Check if entered by field is only sps webservices
                var enteredById = salesRecord.getValue("custbody_aps_entered_by");
                if (!enteredById) return;

                if (String(enteredById) != "84216") return;

                var customerId = salesRecord.getValue("entity");

                var actualLocation = search.lookupFields({
                    type: search.Type.CUSTOMER,
                    id: customerId,
                    columns: "custentity_warehouse"
                })?.custentity_warehouse[0]?.value;

                log.debug("locationFromCustomer", actualLocation);

                if (!actualLocation) return;

                //---------------------------------- Populate Warehouse from customer record ----------------------------------------------------
                salesRecord.setValue({ fieldId: 'location', value: actualLocation });
                try {
                    salesRecord.setValue({ fieldId: 'custbody_warehouse_roadnet', value: actualLocation });
                } catch (error) {
                    log.error("ERROR in custbody_warehouse_roadnet", error);
                }
                // ---------------------------------------------------------------------------------------------------------------------

                //----------------------------------   Workflow populate warehouse in line functionality   ------------------------------

                log.debug('lineItemCount', lineItemCount);
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
                    log.debug('itemId', itemId);
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
                log.debug('itemInfo', itemInfo);
                if (!itemInfo) return;


                //This step will set location in each line item to the primary location in the sales order only if it has (quantity available - qtyline item) greater than 0
                log.debug('itemsInfoLines', itemsInfoLines);
                itemsInfoLines.forEach(function (item) {
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
                            var locationFound = locations.find(element => (Number(element.location) == Number(actualLocation)) && (Number(element.quantity) - Number(item.qty) > 0));
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

                        log.debug('locations Richmond', locations);

                        //If item in richmond has backordered qty then we are going to create a new line and set savage
                        //as location
                        var locationFound = locations.find(element => (Number(element.location) == Number(actualLocation)));

                        if (locationFound && (Number(item.qty) - (locationFound.quantity) > 0)) {
                            log.debug('item.qty', item.qty);
                            log.debug('locationFoundQty', locationFound.quantity);
                            log.debug('STATUS', 'CREATING NEW LINE FOR RICHMOND');

                            //Set qty for actual line to max qty available in Richmond
                            salesRecord.selectLine({ sublistId: 'item', line: item.line });

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
                                value: (Number(item.qty) - (locationFound.quantity)),
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
                        }
                        else {
                            log.debug('STATUS', 'ITEM DOES NOT HAVE BACKORDER');

                            if (!locations.length) {
                                locationToSet = SAVAGE;
                            }
                            else {
                                var locationFound = locations.find(element => (Number(element.location) == Number(actualLocation)) && (Number(element.quantity) - Number(item.qty) > 0));

                                log.debug('locationFound', locationFound);

                                //If location is not equal to location in sales order then we are going to look for another location
                                if (!locationFound || locationFound == -1) {
                                    //If we dont have location available at the primary location we are going to look for savage
                                    var savageLocation = locations.find(element => (Number(element.location) == SAVAGE) && (Number(element.quantity) - Number(item.qty) > 0));
                                    if (savageLocation && savageLocation != -1) {
                                        locationToSet = savageLocation.location;
                                    }
                                    else
                                    //If we dont have location in richmond we are going to look for any location that has qty greater than 0
                                    {
                                        locationToSet = SAVAGE;
                                    }
                                }
                                //If location is equal to location in sales order then we are going to set this one
                                else {
                                    locationToSet = locationFound.location;
                                }
                            }

                            log.debug('final location set', locationToSet);

                            //Set location in item line
                            salesRecord.selectLine({ sublistId: 'item', line: item.line });

                            salesRecord.setCurrentSublistValue({
                                sublistId: 'item',
                                fieldId: 'location',
                                value: Number(locationToSet),
                                ignoreFieldChange: true
                            });

                            salesRecord.commitLine("item");
                        }

                    }//End if backorder
                });

                allLinesDone = true;

                // Check if all lines location have been setted
                itemsInfoLines.forEach(function (item) {
                    var location = salesRecord.getSublistValue({
                        sublistId: 'item',
                        fieldId: 'location',
                        line: item.line
                    });
                    if (!location) allLinesDone = false;
                });

                log.debug("allLinesDone?", allLinesDone);
            }

        }
        catch (error) {
            log.error('error', error);
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
        var searchResultCount = inventoryitemSearchObj.runPaged().count;
        log.debug('searchResultCount', searchResultCount);
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

    }//End setLocationAvailable

    return {
        onAction: onAction
    }
});
