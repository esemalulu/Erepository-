/**
 *@NApiVersion 2.1
 *@NScriptType ScheduledScript
 */
define(["N/record", "N/search", "N/runtime", "N/log"], function (record, search, runtime, log)
{

    function execute(context)
    {
        try
        {
            const recordId = runtime.getCurrentScript().getParameter({name: 'custscript_sdb_transaction_id_replace'});
            if (!recordId) return;
            log.debug("🚀 ~ recordId:", recordId)

            var salesRecord = record.load({
                type: 'salesorder',
                id: recordId,
            });
            if (!salesRecord) return;

            var customerId = salesRecord.getValue("entity");
            if (!customerId) return;

            var actualLocation = search.lookupFields({
                type: search.Type.CUSTOMER,
                id: customerId,
                columns: "custentity_warehouse"
            })?.custentity_warehouse[0]?.value;
            if (!actualLocation) return;

            //---------------------------------- Populate Warehouse from customer record ----------------------------------------------------
            salesRecord.setValue({ fieldId: 'location', value: actualLocation });
            // ---------------------------------------------------------------------------------------------------------------------

            //---------------------------------- Populate Warehouse for roadnet ----------------------------------------------------
            salesRecord.setValue({ fieldId: 'custbody_warehouse_roadnet', value: actualLocation });
            // ---------------------------------------------------------------------------------------------------------------------

            setCustomerShipTo(salesRecord, customerId);

            //Get all error items in sales order or if the item is not an item error set location
            let { itemsArray, itemsInfoLines, itemsError } = getItemsErrors(salesRecord);

            // Only if there are items that are not error items
            if (itemsArray && itemsArray?.length > 0)
            {
                //Bring all line items with available quantity gratear than 0 for each Warehouse
                const itemInfoLocations = getLocationsAvailablePerItem(itemsArray);
                if (!itemInfoLocations) return;

                itemsInfoLines.forEach((item) =>
                {
                    setLocationWarehouse(salesRecord, itemInfoLocations, item, actualLocation);
                });
            }

            const itemsErrorFiltered = replaceItemErrors(salesRecord, itemsError, actualLocation);
            if (!itemsErrorFiltered || itemsErrorFiltered.length < 1) return;

            //Delete error lines
            for (var i = itemsErrorFiltered.length - 1; i >= 0; i--)
            {
                //Deleting error item
                salesRecord.removeLine({
                    sublistId: 'item',
                    line: itemsErrorFiltered[i].index,
                    ignoreRecalc: true,
                });
            }

            salesRecord.save({ ignoreMandatoryFields: true });

        } 
        catch (error)
        {
            log.error("Error in script", error);
        }

    }

    return {
        execute: execute
    }

    // ------------------------------------ AUXILIAR FUNCTIONS --------------------------------------------------


    function updateItemPrices(salesRecord, lineParam)
    {
        try
        {
            // Add or remove params
            const idCols = ['custcol_sps_purchaseprice', 'custcol_sps_bpn', 'custcol_sps_linesequencenumber', 'custcol_sps_ean', 'custcol_sps_upc', 'rate'];
            // Convert array en obj empty
            var idColsObject = {};
            idCols.forEach(key =>
            {
                idColsObject[key] = null;
            });
            for (let j = 0; j < idCols.length; j++)
            {
                const fieldId = idCols[j];
                idColsObject[fieldId] = salesRecord.getSublistValue({
                    sublistId: 'item',
                    fieldId: fieldId,
                    line: lineParam
                });
            }
            return idColsObject
        }
        catch (error)
        {
            log.error('error in updateItemPrices', error);
        }
    }

    function setCustomerShipTo(salesRecord, customerId)
    {
        // Set shipTo field with default ship address in sales order
        if (!customerId) return;

        const customerRecord = record.load({
            type: 'customer',
            id: customerId
        });

        var customerdDefaultAddress;
        if (customerRecord) customerdDefaultAddress = getCustomerDefaultAddress(customerRecord);

        // Set customer default address into ship-to select field
        if (customerdDefaultAddress) salesRecord.setValue({ fieldId: 'shipaddresslist', value: customerdDefaultAddress });

    }

    function getOrCreateNewUOM(itemInfo)
    {
        if (!itemInfo.multipleUom)
        {
            if (itemInfo.itemType !== "InvtPart" && itemInfo.itemType !== "OthCharge") return -1;

            const itemType = itemInfo.itemType === "InvtPart" ? 'inventoryitem' : 'otherchargeitem';

            const itemRecord = record.load({
                type: itemType,
                id: itemInfo.itemId,
            });
            if (!itemRecord) return -1;

            const baseUom = itemRecord.getValue("baseunit");
            if (!baseUom) return -1;

            return baseUom;
        }

        return getUOMFromMultipleUpc(itemInfo);
    }

    function setNewItemByUPC(salesRecord, itemInfo, newUomId, actualLocation, dataCols)
    {
        log.debug('CREATING NEW ITEM');

        const lastLineNum = salesRecord.getLineCount("item");

        // Create new item line with item info
        salesRecord.insertLine({
            sublistId: "item",
            line: lastLineNum
        });

        // Set the values for the new line
        const itemFields = {
            item: itemInfo.itemId,
            custcol_sps_upc: itemInfo.upcCode,
            custcol_sps_bpn: itemInfo.sapCode,
            units: newUomId,
            custcol_sdb_item_replaced_check_error: true
        };

        try
        {
            if (dataCols['rate'])
            {
                itemFields.costestimatetype = 'CUSTOM';
            }

            for (const field in dataCols)
            {
                itemFields[field] = dataCols[field];
            }
        }
        catch (error)
        {
            log.error('error in for:setNewItemByUPC', error);
        }

        for (const field in itemFields)
        {
            salesRecord.setSublistValue({
                sublistId: 'item',
                fieldId: field,
                line: lastLineNum,
                value: itemFields[field]
            });
        }

        itemInfo.line = lastLineNum;
        itemInfo.qty = 1;

        const itemInfoLocation = getLocationsAvailablePerItem(itemInfo.itemId);

        setLocationWarehouse(salesRecord, itemInfoLocation, itemInfo, actualLocation);
    }

    function getSapUpcFromItems(itemsError)
    {
        let resultArrays = { sapCodes: [], upcCodes: [] };

        if (!itemsError || itemsError.length < 1) return resultArrays;

        itemsError.forEach((item) =>
        {
            if (item.itemUpcCode) resultArrays.upcCodes.push(`'${item.itemUpcCode}'`);
            if (item.itemSapCode) resultArrays.sapCodes.push(`'${item.itemSapCode}'`);
        });

        return resultArrays;
    }

    function getItemsUpcCodeInformation(itemsError)
    {
        let resultItemsArray = [];

        let { upcCodes, sapCodes } = getSapUpcFromItems(itemsError);

        if (upcCodes.length < 1) upcCodes = "''";
        if (sapCodes.length < 1) sapCodes = "''";

        var customrecord_sdb_acme_upc_sap_uomSearchObj = search.create({
            type: "customrecord_sdb_acme_upc_sap_uom",
            filters:
                [
                    ["formulatext: CASE WHEN {custrecord_sdb_acme_upc} IN(" + upcCodes + ") OR {custrecord_sdb_acme_sap} IN(" + sapCodes + ") THEN 1 ELSE 0 END", "startswith", "1"]
                ],
            columns:
                [
                    search.createColumn({
                        name: "internalid",
                        join: "CUSTRECORD_SDB_ACME_ITEM",
                        label: "Internal ID"
                    }),
                    search.createColumn({
                        name: "type",
                        join: "CUSTRECORD_SDB_ACME_ITEM",
                        label: "Type"
                    }),
                    search.createColumn({ name: "custrecord_sdb_acme_uom", label: "UOM" }),
                    search.createColumn({ name: "custrecord_sdb_acme_upc", label: "UPC Code" }),
                    search.createColumn({ name: "custrecord_sdb_acme_sap", label: "SAP Code" }),
                    search.createColumn({ name: "custrecord_sdb_multiple_uom_upc_item", label: "Multiple UOM" }),
                    search.createColumn({ name: "custrecord_sdb_acme_conversion_rate_uom", label: "Conversion Rate" }),
                    search.createColumn({ name: "custrecord_sdb_units_type_upc_item", label: "Unit Type" })
                ]
        });
        var searchResultCount = customrecord_sdb_acme_upc_sap_uomSearchObj.runPaged().count;
        log.debug("customrecord_sdb_acme_upc_sap_uomSearchObj result count", searchResultCount);
        customrecord_sdb_acme_upc_sap_uomSearchObj.run().each(function (result)
        {
            let itemInfo = {};

            itemInfo.id = result.id;

            itemInfo.itemId = result.getValue({
                name: 'internalid',
                join: 'CUSTRECORD_SDB_ACME_ITEM',
            });

            itemInfo.itemType = result.getValue({
                name: 'type',
                join: 'CUSTRECORD_SDB_ACME_ITEM',
            });

            itemInfo.uom = result.getValue("custrecord_sdb_acme_uom");
            itemInfo.upcCode = result.getValue("custrecord_sdb_acme_upc");
            itemInfo.sapCode = result.getValue("custrecord_sdb_acme_sap");
            itemInfo.multipleUom = result.getValue("custrecord_sdb_multiple_uom_upc_item");
            itemInfo.convRate = result.getValue("custrecord_sdb_acme_conversion_rate_uom");
            itemInfo.unitType = result.getValue("custrecord_sdb_units_type_upc_item");
            itemInfo.errorIndex = itemsError.find((item) => { return item.itemUpcCode && item.itemUpcCode == itemInfo.upcCode || item.itemSapCode && item.itemSapCode == itemInfo.sapCode })?.index || "";

            resultItemsArray.push(itemInfo);

            return true;
        });

        return resultItemsArray;
    }

    function getUOMFromMultipleUpc(itemInfo)
    {
        var recordUnitId = "";

        var unitstypeSearchObj = search.create({
            type: "unitstype",
            filters:
                [
                    ["abbreviation", "is", "" + itemInfo.multipleUom + ""]
                ],
            columns:
                [
                    search.createColumn({ name: "internalid", label: "Internal ID" }),
                    search.createColumn({ name: "abbreviation", label: "Abbreviation Name" })
                ]
        });
        var searchResultCount = unitstypeSearchObj.runPaged().count;

        unitstypeSearchObj.run().each(function (result)
        {
            recordUnitId = result.getValue("internalid");

            return false;
        });

        //If multipleUOM exists then we are going to look for it
        if (recordUnitId && recordUnitId != "")
        {
            log.debug('SEARCH EXISTING UOM');
            log.debug('record unit Id', recordUnitId);

            return searchExistingUOM(recordUnitId, null, itemInfo);
        }
        //If multipleUOM does not exists then we are going to create it
        else
        {
            log.debug('CREATING NEW UOM');

            var unitRecord = record.load({
                type: 'unitstype',
                id: itemInfo.unitType,
                isDynamic: true,
            });

            if (!unitRecord) return -1;

            var oldLineCount = unitRecord.getLineCount('uom');

            unitRecord.selectNewLine({ sublistId: 'uom' });

            var uomFields = {
                unitname: 'singularName',
                pluralname: 'pluralName',
                abbreviation: itemInfo.multipleUom,
                pluralabbreviation: itemInfo.multipleUom,
                conversionrate: itemInfo.convRate,
            };

            for (var fieldId in uomFields)
            {
                unitRecord.setCurrentSublistValue({
                    sublistId: 'uom',
                    fieldId: fieldId,
                    value: uomFields[fieldId],
                });
            }

            unitRecord.commitLine({ sublistId: 'uom' });

            var newLineCount = unitRecord.getLineCount('uom');

            if (newLineCount < 1 || newLineCount === oldLineCount)
            {
                // UOM line was not added successfully
                unitRecord.cancelLine({ sublistId: 'uom' }); // Cancel the line
                return -1;
            }

            unitRecord.save({ ignoreMandatoryFields: true });

            return searchExistingUOM(itemInfo.unitType, unitRecord, itemInfo);
        }
    }

    function searchExistingUOM(recordUnitId, unitRecord, itemInfo)
    {
        if (!unitRecord)
        {
            unitRecord = record.load({
                type: 'unitstype',
                id: recordUnitId,
            });

            if (!unitRecord) return -1;
        }

        const uomLine = unitRecord.findSublistLineWithValue({
            sublistId: 'uom',
            fieldId: 'abbreviation',
            value: itemInfo.multipleUom,
        });

        if (!uomLine) return;

        return unitRecord.getSublistValue({
            sublistId: 'uom',
            fieldId: 'internalid',
            line: uomLine
        });
    }

    function getCustomerDefaultAddress(customerRecord)
    {
        const sublistId = 'addressbook';
        const addressesObject = customerRecord.getSublist({
            sublistId: sublistId
        });
        if (!addressesObject) return null;

        const defaultAddressLine = customerRecord.findSublistLineWithValue({
            sublistId: sublistId,
            fieldId: 'defaultshipping',
            value: true
        });

        if (!defaultAddressLine) return null;

        const fieldIdsToCheck = ['id', 'internalid', 'addressid'];

        for (const fieldId of fieldIdsToCheck)
        {
            const fieldValue = customerRecord.getSublistValue({
                sublistId: sublistId,
                fieldId: fieldId,
                line: defaultAddressLine
            });

            if (fieldValue) return fieldValue;
        }

        return null;
    }

    function setLocationWarehouse(salesRecord, itemInfo, item, actualLocation)
    {
        const RICHMOND = 103;
        const SAVAGE = 104;

        //If warehouse at header line is SAVAGE
        if (actualLocation == SAVAGE)
        {
            salesRecord.setSublistValue({
                sublistId: 'item',
                fieldId: 'location',
                line: item.line,
                value: SAVAGE
            });

            var locations = itemInfo[item.itemId]?.locations || [];

            if (locations.length)
            {
                var locationFound = locations.find(element => (Number(element.location) == Number(actualLocation)) && (Number(element.quantity) - Number(item.qty) >= 0));
                if (locationFound)
                {
                    salesRecord.setSublistValue({
                        sublistId: 'item',
                        fieldId: 'quantityavailable',
                        line: item.line,
                        value: locationFound.quantity
                    });
                }
                else
                {
                    salesRecord.setSublistValue({
                        sublistId: 'item',
                        fieldId: 'quantityavailable',
                        line: item.line,
                        value: 0
                    });
                }
            }
        }
        //If warehouse at header line is RICHMOND
        else if (actualLocation == RICHMOND)
        {
            //This step will set location in each line item to the primary location in the sales order only if it has (quantity available - qtyline item) greater than 0

            //Get locations for this item
            var locationToSet;
            var locations = itemInfo[item.itemId]?.locations || [];

            //If item in richmond has backordered qty then we are going to create a new line and set savage
            //as location
            var locationFound = locations.find(element => (Number(element.location) == Number(actualLocation)));

            if (locationFound && (Number(item.qty) - (locationFound.quantity) > 0))
            {
                salesRecord.setSublistValue({
                    sublistId: 'item',
                    fieldId: 'quantity',
                    line: item.line,
                    value: locationFound.quantity
                });

                var lastLine = salesRecord.getLineCount("item");

                // --------------- CREATING NEW LINE ----------------------
                salesRecord.insertLine({
                    sublistId: 'item',
                    line: lastLine
                });

                //Set item id
                salesRecord.setSublistValue({
                    sublistId: 'item',
                    fieldId: 'item',
                    line: lastLine,
                    value: item.itemId
                });

                salesRecord.setSublistValue({
                    sublistId: 'item',
                    fieldId: 'quantity',
                    line: lastLine,
                    value: (Number(item.qty) - (locationFound.quantity))
                });

                //Set item rate
                salesRecord.setSublistValue({
                    sublistId: 'item',
                    fieldId: 'rate',
                    line: lastLine,
                    value: item.rate
                });


                //Set item location to Savage
                salesRecord.setSublistValue({
                    sublistId: 'item',
                    fieldId: 'location',
                    line: lastLine,
                    value: SAVAGE
                });

                // ----------------------------------------------------------
            }
            else
            {
                if (!locations.length)
                {
                    locationToSet = SAVAGE;
                }
                else
                {
                    var locationFound = locations.find(element => (Number(element.location) == Number(actualLocation)) && (Number(element.quantity) - Number(item.qty) >= 0));

                    //If location is not equal to location in sales order then we are going to look for another location
                    if (!locationFound || locationFound == -1)
                    {
                        //If we dont have location available at the primary location we are going to look for savage
                        var savageLocation = locations.find(element => (Number(element.location) == SAVAGE) && (Number(element.quantity) - Number(item.qty) >= 0));
                        if (savageLocation && savageLocation != -1)
                        {
                            locationToSet = savageLocation.location;
                        }
                        else
                        //If we dont have location in richmond we are going to look for any location that has qty greater than 0
                        {
                            locationToSet = SAVAGE;
                        }
                    }
                    //If location is equal to location in sales order then we are going to set this one
                    else
                    {
                        locationToSet = locationFound.location;
                    }
                }

                //Set location in item line
                salesRecord.setSublistValue({
                    sublistId: 'item',
                    fieldId: 'location',
                    line: item.line,
                    value: Number(locationToSet)
                });
            }

        }//End if backorder
    }

    function getLocationsAvailablePerItem(itemsArray)
    {
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

        inventoryitemSearchObj.run().each(function (result)
        {
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

    function findObjectByCode(code, itemsUpcFound)
    {
        return itemsUpcFound.find(function (item)
        {
            return item.upcCode === code || item.sapCode === code;
        });
    }

    function getItemsErrors(salesRecord)
    {
        const ITEM_ERROR_ID = "119976";

        let resultArrays = { itemsError: [], itemsArray: [], itemsInfoLines: [] };

        const lineItemCount = salesRecord.getLineCount("item");
        if (lineItemCount < 0) return resultArrays;

        for (let i = 0; i < lineItemCount; i++)
        {
            const itemId = salesRecord.getSublistValue({
                sublistId: 'item',
                fieldId: 'item',
                line: i
            });
            if (!itemId) continue;

            let obj = {};

            // If the item is NOT an error item
            if (itemId != ITEM_ERROR_ID)
            {
                const itemQuantity = salesRecord.getSublistValue({
                    sublistId: 'item',
                    fieldId: 'quantity',
                    line: i
                });

                const itemRate = salesRecord.getSublistValue({
                    sublistId: 'item',
                    fieldId: 'rate',
                    line: i
                });

                obj.rate = itemRate;
                obj.itemId = itemId;
                obj.qty = itemQuantity;
                obj.line = i;

                resultArrays.itemsInfoLines.push(obj);
                resultArrays.itemsArray.push(itemId);

                continue;
            }

            // If the item is an ERROR ITEM
            const itemUPCCode = salesRecord.getSublistValue({
                sublistId: 'item',
                fieldId: 'custcol_sps_upc',
                line: i
            });

            const itemSapCode = salesRecord.getSublistValue({
                sublistId: 'item',
                fieldId: 'custcol_sps_bpn',
                line: i
            });

            obj.itemUpcCode = itemUPCCode;
            obj.itemSapCode = itemSapCode;
            obj.index = i;
            obj.found = false;

            resultArrays.itemsError.push(obj);
        }

        return resultArrays;
    }

    function replaceItemErrors(salesRecord, itemsError, actualLocation)
    {

        const itemsErrorFiltered = getItemsUpcCodeInformation(itemsError);
        if (!itemsErrorFiltered || itemsErrorFiltered.length < 1) return;
        log.debug("🚀 ~ itemsErrorFiltered:", itemsErrorFiltered);

        log.debug("itemsError before", itemsError);

        // Function to find the object in array2 based on UPC or SAP code
        itemsError.forEach(function (item)
        {
            var codeToSearch = item.itemUpcCode || item.itemSapCode;
            if (!codeToSearch) return;

            const findUpcItem = findObjectByCode(codeToSearch, itemsErrorFiltered);
            if (!findUpcItem) return;

            Object.assign(item, findUpcItem);

            var itemConverseData = updateItemPrices(salesRecord, item.index);

            var newUomId = getOrCreateNewUOM(item);
            if (!newUomId || newUomId == -1) return;
            log.debug("🚀 ~ newUomId:", newUomId)

            setNewItemByUPC(salesRecord, item, newUomId, actualLocation, itemConverseData);
        });

        return itemsError;
    }
});
