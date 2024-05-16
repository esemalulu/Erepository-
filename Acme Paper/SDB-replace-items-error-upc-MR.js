/**
 *@NApiVersion 2.1
 *@NScriptType MapReduceScript
 */
define(["N/search", "N/record", "N/log", "N/runtime", "N/format", 'N/config'], function (search, record, log, runtime, format, config) {

    function getInputData() {
        try {
            return search.load({
                type: "customrecord_sdb_sps_orders_to_replace",
                id: 3504
            })
        } catch (e) {
            // record.delete({ type: "customrecord_sdb_require_lock", id: myId })
            log.error('Error at getInputData', e)
        }
    }

    function map(context) {
        try {
            const result = JSON.parse(context.value);

            context.write({
                key: result,
                value: result
            });
        } catch (e) {
            log.error('error at map', e)
        }
    }

    function reduce(context) {
        try {

            const json = JSON.parse(context.values)
            var recordId = json.values["custrecord_sdb_transaction_id_replace"];
            const SPS_NETWORK = "84216";
            const DCKAP = "66155";
            const ERROR_ITEM_ID = "119976";
            //---- Change items Error by UPC code Item ------ Functionality by Felipe
            log.debug('ID loaded: ', recordId);
            var salesRecord = record.load({
                type: 'salesorder',
                id: recordId,
                isDynamic: true
            });
            var enteredById = salesRecord.getValue("custbody_aps_entered_by");
            var copyOrder = salesRecord.getValue("custbody_sdb_original_sales_order");
            if (copyOrder) {
                log.audit('copy order', copyOrder);
                return;
            }
            if (String(enteredById) == SPS_NETWORK) convert_item_sps_Error(salesRecord);
            //----- Set Price By Customer ---- Function by Diego
            //set_Customer_Pricing(salesRecord);
            salesRecord.setValue({ fieldId: 'custbody_sdb_order_sps_replaced', value: true });
            // set_Customer_Pricing(salesRecord);
            // var hasSpsErrorItems = getSpsErrorItems(salesRecord, ERROR_ITEM_ID);
            // salesRecord.setValue({ fieldId: 'shipaddresslist', value: 740566 });
            if (String(enteredById) == SPS_NETWORK) {
                setShipTo(salesRecord, salesRecord.getValue('entity'));
                // if shipping date field is empty, orders over the weekend for sps
                if (!salesRecord.getValue('startdate')) {
                    var today = new Date();
                    var shipaDate = new Date();
                    if (today.getDay() == 5) {
                        shipaDate.setDate(2);
                    } else if (today.getDay() == 6) {
                        shipaDate.setDate(1);
                    }
                    var cinfo = config.load({ type: config.Type.COMPANY_INFORMATION });
                    salesRecord.setValue("startdate", format.parse({
                        type: format.Type.DATETIMETZ,
                        value: format.format({ value: shipaDate, type: format.Type.DATETIMETZ, timezone: cinfo.getValue('timezone') }),
                        timezone: cinfo.getValue('timezone')
                    }))
                }
                setDnrItems(salesRecord);
            }
            if (String(enteredById) == DCKAP) populateAdress(salesRecord);
            var id = salesRecord.save({
                ignoreMandatoryFields: true,
                enableSourcing: true
            })
            log.debug("ID saved:", id)
            // if (!hasSpsErrorItems) {
            record.submitFields({
                type: 'customrecord_sdb_sps_orders_to_replace',
                id: json.id,
                values: {
                    'custrecord_sdb_processed_order': true
                }
            });
            // }

        } catch (e) {
            var otherId = record.submitFields({
                type: 'customrecord_sdb_sps_orders_to_replace',
                id: json.id,
                values: {
                    'custrecord_sdb_processed_order': false
                }
            });
            log.error('reduce', e)
        }

    }
    return {
        getInputData: getInputData,
        map: map,
        reduce: reduce
    }

    function setDnrItems(salesRecord) {
        try {
            var itemIds = getItemIds(salesRecord);
            var scriptObj = runtime.getCurrentScript();
            //var itemForReplace = scriptObj.getParameter({ name: 'custscript_sdb_item_for_not_supercede' })// Add 4/4/24
            if (!itemIds.length) return;
            var dnrItems = getDnrItems(itemIds);
            if (!dnrItems.length) return;
            // Update DNR Items
            var itemCount = salesRecord.getLineCount("item");
            for (var i = 0; i < itemCount; i++) {

                salesRecord.selectLine({
                    sublistId: 'item',
                    line: i
                })
                var itemId = salesRecord.getCurrentSublistValue({ sublistId: 'item', fieldId: 'item', line: i });
                var dnrInfo = dnrItems.find(function (item) {
                    return item.item == itemId;
                });
                if (!dnrInfo) continue;
                if (!dnrInfo.supercedItem) continue;
                var qty = salesRecord.getCurrentSublistValue({ sublistId: 'item', fieldId: 'quantity', line: i });
                var rate = salesRecord.getCurrentSublistValue({ sublistId: 'item', fieldId: 'rate', line: i });
                var amount = salesRecord.getCurrentSublistValue({ sublistId: 'item', fieldId: 'amount', line: i });
                log.debug("UPDATE ITEM: ", { salesOrder: salesRecord.id, dnrInfo });
                salesRecord.setCurrentSublistValue({ sublistId: 'item', fieldId: 'item', value: dnrInfo.supercedItem });// Add 4/4/24
                salesRecord.setCurrentSublistValue({ sublistId: 'item', fieldId: 'quantity', value: qty });// Add 4/4/24
                //salesRecord.setCurrentSublistValue({ sublistId: 'item', fieldId: 'rate', value: rate });
                salesRecord.commitLine({
                    sublistId: "item",
                })
            }
        } catch (error) {
            log.error('setDnrItems', error)
        }
    }

    function getDnrItems(itemIds) {
        var arrToReturn = [];
        var itemSearchObj = search.create({
            type: "item",
            filters:
                [
                    ["custitem_dnr", "anyof", "3"], // Y Non Stock Discontinued
                    "AND",
                    ["internalid", "anyof", itemIds],
                    // "AND",
                    // ["custitem_acc_supercede_item", "noneof", "@NONE@"],
                    "AND",
                    ["custitem_acc_supercede_item.isinactive", "is", "F"]
                ],
            columns:
                [
                    "internalid",
                    "custitem_acc_supercede_item"
                ]
        });
        itemSearchObj.run().each(function (result) {
            arrToReturn.push({
                item: result.getValue("internalid"),
                supercedItem: result.getValue("custitem_acc_supercede_item")
            });
            return true;
        });
        return arrToReturn;
    }

    function getItemIds(newRecord) {
        var arrToReturn = [];
        var itemCount = newRecord.getLineCount("item");
        for (var i = 0; i < itemCount; i++) {
            var itemId = newRecord.getSublistValue({ sublistId: 'item', fieldId: 'item', line: i });
            if (!arrToReturn.includes(itemId)) arrToReturn.push(itemId);
        }
        return arrToReturn;
    }

    function setNextBusinessDate() {

    }

    // ------------------------------------ AUXILIAR FUNCTIONS --------------------------------------------------
    function getSpsErrorItems(salesRecord, errorItemid) {
        var hasError = salesRecord.findSublistLineWithValue({
            sublistId: 'item',
            fieldId: 'item',
            value: errorItemid,
        });
        return Number(hasError) >= 0;

    }

    function convert_item_sps_Error(salesRec) {
        try {
            if (!salesRec) return;
            var salesRecord = salesRec;
            var locationSet = populateAdress(salesRec);

            //Get all error items in sales order or if the item is not an item error set location
            let { itemsArray, itemsInfoLines, itemsError } = getItemsErrors(salesRecord);

            // Only if there are items that are not error items
            if (itemsArray && itemsArray?.length > 0) {
                //Bring all line items with available quantity gratear than 0 for each Warehouse
                const itemInfoLocations = getLocationsAvailablePerItem(itemsArray);
                if (!itemInfoLocations) return;

                itemsInfoLines.forEach((item) => {
                    setLocationWarehouse(salesRecord, itemInfoLocations, item, locationSet);
                });
            }

            const itemsErrorFiltered = replaceItemErrors(salesRecord, itemsError, locationSet);
            if (!itemsErrorFiltered || itemsErrorFiltered.length < 1) return;
            //Delete error linesc
            /*for (var i = itemsErrorFiltered.length - 1; i >= 0; i--) {
                try {
                    if (!itemsErrorFiltered[i].hasOwnProperty("errorIndex")) continue;
                    //Deleting error item
                    salesRecord.removeLine({
                        sublistId: 'item',
                        line: itemsErrorFiltered[i].errorIndex,
                        ignoreRecalc: false,
                    });
                }
                catch (error) {
                }
            }*/
        }

        catch (error) {
            log.error("Error in script", error);
        }
    }

    function populateAdress(saleRec) {
        var customerId = saleRec.getValue("entity");
        var WarehouseToSet = setCustomerShipTo(saleRec, customerId);
        if (!WarehouseToSet) WarehouseToSet = AdressLogic(saleRec);
        if (WarehouseToSet) {
            //---------------------------------- Populate Warehouse from customer record ----------------------------------------------------
            saleRec.setValue({ fieldId: 'location', value: WarehouseToSet });
            //---------------------------------- Populate Warehouse for roadnet ----------------------------------------------------
            saleRec.setValue({ fieldId: 'custbody_warehouse_roadnet', value: WarehouseToSet });

            return WarehouseToSet
        }
        return null;
    }

    function updateItemPrices(salesRecord, lineParam) {
        try {
            // Add or remove params
            const idCols = ['custcol_sps_purchaseprice', 'custcol_sps_bpn', 'custcol_sps_linesequencenumber', 'custcol_sps_ean', 'custcol_sps_upc', 'rate', 'quantity', 'custcol_sps_mpn_partnumber', 'custcol_sps_purchasepricebasis', 'custcol_sps_outerpack', 'custcol_sps_productcharacteristiccode', 'custcol_sps_orderqtyuom', 'custcol_sps_orderqty', 'custcol_sps_date_002'];
            // Convert array en obj empty
            var idColsObject = {};
            idCols.forEach(key => {
                idColsObject[key] = null;
            });
            for (let j = 0; j < idCols.length; j++) {
                const fieldId = idCols[j];
                salesRecord.selectLine({
                    sublistId: 'item',
                    line: lineParam
                })
                if (fieldId == 'custcol_sps_purchaseprice') {
                    var valueTPPrice = salesRecord.getCurrentSublistValue({
                        sublistId: 'item',
                        fieldId: fieldId,
                    });
                    if (valueTPPrice && !isNaN(parseFloat(valueTPPrice))) {
                        idColsObject[fieldId] = parseFloat(valueTPPrice).toFixed(2);
                    }

                } else {
                    idColsObject[fieldId] = salesRecord.getCurrentSublistValue({
                        sublistId: 'item',
                        fieldId: fieldId,
                    });
                }
                // idColsObject[fieldId] = salesRecord.getCurrentSublistValue({
                //     sublistId: 'item',
                //     fieldId: fieldId,
                // });
            }
            return idColsObject
        }
        catch (error) {
            log.error('error in updateItemPrices', error);
        }
    }

    function setCustomerShipTo(salesRecord, customerId) {
        try {
            if (!customerId) return;
            const customerRecord = record.load({
                type: 'customer',
                id: customerId
            });
            var ObjectFromAdress
            var locationIdAddress = salesRecord.getValue("custbody_sps_st_addresslocationnumber");
            if (customerRecord) ObjectFromAdress = getCustomerDefaultAddress(customerRecord, locationIdAddress);
            return ObjectFromAdress.Warehouse
        } catch (error) {
            log.error("ERROR setCustomerShipTo", { error, salesRecord, customerId })
        }
    }

    function setShipTo(salesRecord, customerId) {
        try {
            // Set shipTo field with default ship address in sales order
            if (!customerId) return;
            const customerRecord = record.load({
                type: 'customer',
                id: customerId
            });
            var ObjectFromAdress
            var locationIdAddress = salesRecord.getValue("custbody_sps_st_addresslocationnumber");
            if (customerRecord) ObjectFromAdress = getCustomerDefaultAddress(customerRecord, locationIdAddress);
            log.audit("ObjectFromAdress: ", ObjectFromAdress)
            if (ObjectFromAdress.Adress) salesRecord.setValue({ fieldId: 'shipaddresslist', value: Number(ObjectFromAdress.Adress) });
        } catch (error) {
            log.error("ERROR setShipTo", { error, salesRecord: salesRecord.id, customerId })
        }
    }

    function getOrCreateNewUOM(itemInfo) {
        if (!itemInfo.multipleUom) {
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

    function setNewItemByUPC(salesRecord, itemInfo, newUomId, actualLocation, dataCols) {
        const line = itemInfo.index;
        var isDnrY = getDnrItems(itemInfo.itemId); // has DNR -Y return; add 5/4/24
        if (isDnrY.length) return;
        // Create new item line with item info
        salesRecord.selectLine({
            sublistId: 'item',
            line: line
        });

        // Set the values for the new line
        const itemFields = {
            item: itemInfo.itemId,
            custcol_sps_upc: itemInfo.upcCode,
            custcol_sps_bpn: itemInfo.sapCode,
            units: newUomId,
            custcol_sdb_item_replaced_check_error: true
        };

        try {
            if (dataCols['rate']) itemFields.costestimatetype = 'CUSTOM';

            for (const field in dataCols) {
                itemFields[field] = dataCols[field];
            }
        }
        catch (error) {
            log.error('error in for:setNewItemByUPC', error);
        }

        for (const field in itemFields) {
            salesRecord.selectLine({
                sublistId: 'item',
                line: line
            });
            salesRecord.setCurrentSublistValue({
                sublistId: 'item',
                fieldId: field,
                value: itemFields[field],
                ignoreFieldChange: false
            });
        }
        salesRecord.commitLine({
            sublistId: 'item'
        });

        itemInfo.line = line;
        //   itemInfo.qty = 1;

        const itemInfoLocation = getLocationsAvailablePerItem(itemInfo.itemId);

        setLocationWarehouse(salesRecord, itemInfoLocation, itemInfo, actualLocation);
    }

    function getSapUpcFromItems(itemsError) {
        let resultArrays = { sapCodes: [], upcCodes: [] };

        if (!itemsError || itemsError.length < 1) return resultArrays;
        itemsError.forEach((item) => {
            var sapAux = String(item.itemSapCode.replace("SAP", ""));
            if (item.itemUpcCode) resultArrays.upcCodes.push(`'${item.itemUpcCode}'`);
            if (item.itemSapCode) resultArrays.sapCodes.push(`'${item.itemSapCode}'`);
            if (sapAux) resultArrays.sapCodes.push(`'${sapAux}'`);
        });

        return resultArrays;
    }

    function getItemsUpcCodeInformation(itemsError) {
        let resultItemsArray = [];

        let { upcCodes, sapCodes } = getSapUpcFromItems(itemsError);

        if (upcCodes.length < 1) upcCodes = "''";
        if (sapCodes.length < 1) sapCodes = "''";
        var customrecord_sdb_acme_upc_sap_uomSearchObj = search.create({
            type: "customrecord_sdb_acme_upc_sap_uom",
            filters:
                [
                    ["formulatext: CASE WHEN {custrecord_sdb_acme_upc} IN(" + upcCodes + ") OR {custrecord_sdb_acme_sap} IN(" + sapCodes + ") THEN 1 ELSE 0 END", "startswith", "1"],
                    "AND",
                    ["custrecord_sdb_acme_item.isinactive", "is", 'F'],
                    "AND",
                    ["custrecord_sdb_acme_item", "noneof", "@NONE@"]
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
                    search.createColumn({ name: "custrecord_sdb_units_type_upc_item", label: "Unit Type" }),
                    search.createColumn({
                        name: "custitem_acc_supercede_item",
                        join: "CUSTRECORD_SDB_ACME_ITEM",
                        label: "custitem_acc_supercede_item"
                    }),
                    search.createColumn({
                        name: "custitem_acc_supercede",
                        join: "CUSTRECORD_SDB_ACME_ITEM",
                        label: "custitem_acc_supercede"
                    })
                ]
        });
        customrecord_sdb_acme_upc_sap_uomSearchObj.run().each(function (result) {
            let itemInfo = {};
            itemInfo.id = result.id;
            itemInfo.itemType = result.getValue({
                name: 'type',
                join: 'CUSTRECORD_SDB_ACME_ITEM',
            });
            itemInfo.superCede = result.getValue({
                name: 'custitem_acc_supercede_item',
                join: 'CUSTRECORD_SDB_ACME_ITEM',
            });
            itemInfo.superCedePrice = result.getValue({
                name: 'custitem_acc_supercede',
                join: 'CUSTRECORD_SDB_ACME_ITEM',
            });
            // Y Non Stock Discontinued value.
            /*if(itemInfo.dnr == 2){
                itemInfo.itemId = itemInfo.superCede
            }else{
                itemInfo.itemId = result.getValue({
                    name: 'internalid',
                    join: 'CUSTRECORD_SDB_ACME_ITEM',
                });
            }*/
            itemInfo.itemId = result.getValue({
                name: 'internalid',
                join: 'CUSTRECORD_SDB_ACME_ITEM',
            });
            itemInfo.uom = result.getValue("custrecord_sdb_acme_uom");
            itemInfo.upcCode = result.getValue("custrecord_sdb_acme_upc");
            itemInfo.sapCode = result.getValue("custrecord_sdb_acme_sap");
            itemInfo.sapCodeAux = "SAP" + result.getValue("custrecord_sdb_acme_sap");
            itemInfo.multipleUom = result.getValue("custrecord_sdb_multiple_uom_upc_item");
            itemInfo.convRate = result.getValue("custrecord_sdb_acme_conversion_rate_uom");
            itemInfo.unitType = result.getValue("custrecord_sdb_units_type_upc_item");
            itemInfo.errorIndex = itemsError.find((item) => { return item.itemUpcCode && item.itemUpcCode == itemInfo.upcCode || item.itemSapCode && item.itemSapCode == itemInfo.sapCode || item.itemSapCode && item.itemSapCode == itemInfo.sapCodeAux })?.index;

            resultItemsArray.push(itemInfo);
            return true;
        });

        return resultItemsArray;
    }

    function getUOMFromMultipleUpc(itemInfo) {
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

        unitstypeSearchObj.run().each(function (result) {
            recordUnitId = result.getValue("internalid");

            return false;
        });

        //If multipleUOM exists then we are going to look for it
        if (recordUnitId && recordUnitId != "") {

            return searchExistingUOM(recordUnitId, null, itemInfo);
        }
        //If multipleUOM does not exists then we are going to create it
        else {

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

            for (var fieldId in uomFields) {
                unitRecord.setCurrentSublistValue({
                    sublistId: 'uom',
                    fieldId: fieldId,
                    value: uomFields[fieldId],
                });
            }

            unitRecord.commitLine({ sublistId: 'uom' });

            var newLineCount = unitRecord.getLineCount('uom');

            if (newLineCount < 1 || newLineCount === oldLineCount) {
                // UOM line was not added successfully
                unitRecord.cancelLine({ sublistId: 'uom' }); // Cancel the line
                return -1;
            }

            unitRecord.save({ ignoreMandatoryFields: true });

            return searchExistingUOM(itemInfo.unitType, unitRecord, itemInfo);
        }
    }

    function wait(milliseconds) {
        var start = new Date().getTime();
        for (var i = 0; i < 1e7; i++) {
            if ((new Date().getTime() - start) > milliseconds) {
                break;
            }
        }
    }

    function searchExistingUOM(recordUnitId, unitRecord, itemInfo) {
        if (!unitRecord) {
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

    //added 29/01/24  adress logic for sps

    function AdressLogic(SaleRecord) {
        var warehoseFormAddress = getWarehouse(SaleRecord, 'shipaddresslist');
        // 5/10/2023 Warehouse default logic no longer working
        if (!warehoseFormAddress) {
            var warehoseFormCustomer = getWarehouse(SaleRecord, 'entity');
            return warehoseFormCustomer;
        } else {
            return warehoseFormAddress
        }
    }

    function getWarehouse(SaleRec, option) {
        try {
            var warehouse = false;
            var shippingMethod
            if (option == 'shipaddresslist') {
                let subRecord = SaleRec.getSubrecord('shippingaddress');
                if (subRecord) warehouse = subRecord.getValue('custrecord_ship_zone');

                return warehouse;

            } else if (option == 'entity') {

                let customer = SaleRec.getValue('entity');
                if (customer) {
                    let customerRecord = record.load({
                        type: 'customer',
                        id: customer,
                    });
                    let line = customerRecord.findSublistLineWithValue({
                        sublistId: "addressbook",
                        fieldId: "defaultshipping",
                        value: 'T'
                    });
                    let subRecord = customerRecord.getSublistSubrecord({
                        sublistId: "addressbook",
                        fieldId: "addressbookaddress",
                        line: line
                    });
                    var Customerwarehouse = '';
                    if (subRecord) {// add 22/4
                        Customerwarehouse = subRecord.getValue('custrecord_ship_zone');
                        shippingMethod = subRecord.getValue('custrecord_sdb_shipping_method');
                    }
                    if (!Customerwarehouse) {
                        Customerwarehouse = customerRecord.getValue({
                            fieldId: 'custentity_warehouse'
                        });
                    }
                    return Customerwarehouse;
                }
            }
            return null;
        } catch (error) {
            log.error("getWarehouseFromAddress  ERROR", error);
        }
    }

    function getCustomerDefaultAddress(customerRecord, sps_network_address) {
        const sublistId = 'addressbook';

        var lines = customerRecord.getLineCount("addressbook");

        for (var i = 0; i < lines; i++) {
            var sub = customerRecord.getSublistSubrecord({
                sublistId: sublistId,
                fieldId: 'addressbookaddress',
                line: i
            });
            var fieldValue = sub.getValue("custrecord_address_shiplist_no")
            if ((sps_network_address == fieldValue) && (sps_network_address || fieldValue)) {
                var Adress = customerRecord.getSublistValue({
                    sublistId: sublistId,
                    fieldId: 'addressid',
                    line: i
                });
                var WarehouseFromAdress = customerRecord.getSublistValue({
                    sublistId: sublistId,
                    fieldId: 'custrecord_ship_zone',
                    line: i
                });
                return ObjReturn = { Warehouse: WarehouseFromAdress, Adress: Adress }
            }
        }

        return {};
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

    function setLocationWarehouse(salesRecord, itemInfo, item, actualLocation) {
        const RICHMOND = 103;
        const SAVAGE = 104;
        try {
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
            } else if (actualLocation == SAVAGE) {
                salesRecord.selectLine({
                    sublistId: 'item',
                    line: item.line
                });
                salesRecord.setCurrentSublistValue({
                    sublistId: 'item',
                    fieldId: 'location',
                    value: SAVAGE,
                    ignoreFieldChange: false
                });
                var locations = itemInfo[item.itemId]?.locations || [];

                if (locations.length) {
                    var locationFound = locations.find(element => (Number(element.location) == Number(actualLocation)) && (Number(element.quantity) - Number(item.qty) >= 0));
                    if (locationFound) {
                        salesRecord.selectLine({
                            sublistId: 'item',
                            line: item.line
                        });
                        salesRecord.setCurrentSublistValue({
                            sublistId: 'item',
                            fieldId: 'quantityavailable',
                            value: locationFound.quantity,
                            ignoreFieldChange: false
                        });
                    }
                    else {
                        salesRecord.selectLine({
                            sublistId: 'item',
                            line: item.line
                        });
                        salesRecord.setCurrentSublistValue({
                            sublistId: 'item',
                            fieldId: 'quantityavailable',
                            value: 0,
                            ignoreFieldChange: false
                        });
                    }
                }
                salesRecord.commitLine({
                    sublistId: 'item'
                });
            } else if (actualLocation == RICHMOND) {
                //This step will set location in each line item to the primary location in the sales order only if it has (quantity available - qtyline item) greater than 0

                //Get locations for this item
                var locationToSet;
                var locations = itemInfo[item.itemId]?.locations || [];

                //If item in richmond has backordered qty then we are going to create a new line and set savage
                //as location
                var locationFound = locations.find(element => (Number(element.location) == Number(actualLocation)));
                var savageLocation = locations.find(element => (Number(element.location) == Number(SAVAGE)));

                var isRitchmodCustomer = getIsRitchmodCustomer(salesRecord.getValue('entity'), RICHMOND);
                log.debug("RITCHMOND CASE INFO: ", { isRitchmodCustomer, locationFound, locations });
                if (isRitchmodCustomer && (!savageLocation || !locations.length)) {
                    salesRecord.selectLine({ sublistId: 'item', line: item.line });
                    salesRecord.setCurrentSublistValue({
                        sublistId: 'item',
                        fieldId: 'location',
                        value: RICHMOND,
                    });
                    salesRecord.commitLine("item");
                    return;
                }

                if (!isRitchmodCustomer && locationFound && (Number(item.qty) - (locationFound.quantity) > 0)) {
                    salesRecord.selectLine({
                        sublistId: 'item',
                        line: item.line
                    });
                    salesRecord.setCurrentSublistValue({
                        sublistId: 'item',
                        fieldId: 'quantity',
                        value: locationFound.quantity,
                        ignoreFieldChange: false
                    });

                    var lastLine = salesRecord.getLineCount("item");

                    // --------------- CREATING NEW LINE ----------------------
                    salesRecord.insertLine({
                        sublistId: 'item',
                        line: lastLine
                    });
                    salesRecord.selectLine({
                        sublistId: 'item',
                        line: lastLine
                    });
                    salesRecord.setCurrentSublistValue({
                        sublistId: 'item',
                        fieldId: 'item',
                        value: item.itemId,
                        ignoreFieldChange: false
                    });
                    salesRecord.setCurrentSublistValue({
                        sublistId: 'item',
                        fieldId: 'quantity',
                        value: (Number(item.qty) - (locationFound.quantity)),
                        ignoreFieldChange: false
                    });
                    salesRecord.setCurrentSublistValue({
                        sublistId: 'item',
                        fieldId: 'rate',
                        value: item.rate,
                        ignoreFieldChange: false
                    });
                    salesRecord.setCurrentSublistValue({
                        sublistId: 'item',
                        fieldId: 'location',
                        value: SAVAGE,
                        ignoreFieldChange: false
                    });

                    // ----------------------------------------------------------
                }
                else {
                    if (!locations.length) {
                        locationToSet = SAVAGE;
                    } else {
                        var locationFound = locations.find(element => (Number(element.location) == Number(RICHMOND)) && (Number(element.quantity) - Number(item.qty) >= 0));
                        log.debug('locationFound', locationFound);
                        //If location is not equal to location in sales order then we are going to set SAVAGE
                        if (!locationFound || locationFound == -1) { locationToSet = SAVAGE; } else { locationToSet = actualLocation; }//Add 17/4/24
                    }
                    salesRecord.selectLine({
                        sublistId: 'item',
                        line: item.line
                    });
                    salesRecord.setCurrentSublistValue({
                        sublistId: 'item',
                        fieldId: 'location',
                        value: Number(locationToSet),
                        ignoreFieldChange: false
                    });

                }
                salesRecord.commitLine({
                    sublistId: 'item'
                });
            }//End if backorder
        } catch (error) {
            log.error('setLocationWarehouse', error)
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

    function findObjectByCode(codes, itemsUpcFound) {
        const { sapCode, upcCode } = codes;

        return itemsUpcFound.find(function (item) {
            return item.upcCode === upcCode || item.sapCode === sapCode || item.sapCodeAux === sapCode;
        });
    }

    function getItemsErrors(salesRecord) {
        const ITEM_ERROR_ID = "119976";

        let resultArrays = { itemsError: [], itemsArray: [], itemsInfoLines: [] };

        const lineItemCount = salesRecord.getLineCount("item");
        if (lineItemCount < 0) return resultArrays;

        for (let i = 0; i < lineItemCount; i++) {
            salesRecord.selectLine({
                sublistId: 'item',
                line: i
            })
            const itemId = salesRecord.getCurrentSublistValue({
                sublistId: 'item',
                fieldId: 'item',
            });
            if (!itemId) continue;

            let obj = {};

            // If the item is NOT an error item
            if (itemId != ITEM_ERROR_ID) {
                const itemQuantity = salesRecord.getCurrentSublistValue({
                    sublistId: 'item',
                    fieldId: 'quantity',
                });

                const itemRate = salesRecord.getCurrentSublistValue({
                    sublistId: 'item',
                    fieldId: 'rate',
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
            const itemUPCCode = salesRecord.getCurrentSublistValue({
                sublistId: 'item',
                fieldId: 'custcol_sps_upc',
            });

            const itemSapCode = salesRecord.getCurrentSublistValue({
                sublistId: 'item',
                fieldId: 'custcol_sps_bpn',
            });

            obj.itemUpcCode = itemUPCCode;
            obj.itemSapCode = itemSapCode;
            obj.index = i;
            obj.found = false;
            resultArrays.itemsError.push(obj);
        }

        return resultArrays;
    }

    function replaceItemErrors(salesRecord, itemsError, actualLocation) {

        const itemsErrorFiltered = getItemsUpcCodeInformation(itemsError);
        if (!itemsErrorFiltered || itemsErrorFiltered.length < 1) return;


        // Function to find the object in array2 based on UPC or SAP code
        itemsError.forEach(function (item) {
            const findUpcItem = findObjectByCode({ sapCode: item.itemSapCode, upcCode: item.itemUpcCode }, itemsErrorFiltered);
            if (!findUpcItem || findUpcItem == -1) return;

            Object.assign(item, findUpcItem);

            var itemConverseData = updateItemPrices(salesRecord, item.index);

            var newUomId = getOrCreateNewUOM(item);
            if (!newUomId || newUomId == -1) return;

            setNewItemByUPC(salesRecord, item, newUomId, actualLocation, itemConverseData);
        });

        return itemsError;
    }

    function getSalesOrderToReplace() {
        let resultOrders = [];

        var customrecord_sdb_sps_orders_to_replaceSearchObj = search.create({
            type: "customrecord_sdb_sps_orders_to_replace",
            filters:
                [
                ],
            columns:
                [
                    search.createColumn({ name: "custrecord_sdb_transaction_id_replace", label: "Transaction Id" })
                ]
        });
        var searchResultCount = customrecord_sdb_sps_orders_to_replaceSearchObj.runPaged().count;
        customrecord_sdb_sps_orders_to_replaceSearchObj.run().each(function (result) {
            resultOrders.push(result);
            return true;
        });

        return resultOrders;
    }

    //Function set Pricing
    function set_Customer_Pricing(rec) {
        if (!rec) return
        // const rec = record.load({
        //     type: record.Type.SALES_ORDER,
        //     id: record_id,
        //     isDynamic: false,
        // })
        try {
            let customer = rec.getValue({ fieldId: 'entity' });
            let lineItems = getPermanentPricedLines(rec);

            // ------------- Rebate prices and Margin on user Event --------------------
            let lineCount = rec.getLineCount({
                sublistId: 'item'
            });
            let isDropShip = rec.getValue({
                fieldId: 'custbody_dropship_order'
            });

            for (let i = 0; i < lineCount; i++) {
                rec.selectLine({
                    sublistId: 'item',
                    line: i
                })
                let itemId = rec.getCurrentSublistValue({
                    sublistId: 'item',
                    fieldId: 'item',
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
                        rec.setCurrentSublistValue({
                            sublistId: 'item',
                            fieldId: 'costestimatetype',
                            value: costType
                        })
                        rec.setCurrentSublistValue({
                            sublistId: 'item',
                            fieldId: 'custcol_acc_unitcost',
                            value: finalCost
                        })
                        rec.setCurrentSublistValue({
                            sublistId: 'item',
                            fieldId: 'custcol_rebate_parent_id',
                            value: rebatePrice.rebateId
                        })
                        rec.setCurrentSublistValue({
                            sublistId: 'item',
                            fieldId: 'custcol_rebate_cost',
                            value: rebatePrice.rebateCost
                        })
                        // if (costType == 'CUSTOM') {
                        var lineQty = Number(rec.getCurrentSublistValue({
                            sublistId: 'item',
                            fieldId: 'quantity',
                        }))
                        lineQty = lineQty - Number(rec.getCurrentSublistValue({
                            sublistId: 'item',
                            fieldId: 'quantitybackordered',
                        }))
                        rec.setCurrentSublistValue({
                            sublistId: 'item',
                            fieldId: 'costestimate',
                            value: lineQty * Number(finalCost)
                        })
                        //  }
                    }
                    else if (rebatePrice != -1 && vendorPrice == -1) {
                        rec.setCurrentSublistValue({
                            sublistId: 'item',
                            fieldId: 'costestimatetype',
                            value: costType
                        })
                        rec.setCurrentSublistValue({
                            sublistId: 'item',
                            fieldId: 'custcol_acc_unitcost',
                            value: rebatePrice.rebateCost
                        })
                        rec.setCurrentSublistValue({
                            sublistId: 'item',
                            fieldId: 'custcol_rebate_parent_id',
                            value: rebatePrice.rebateId
                        })
                        rec.setCurrentSublistValue({
                            sublistId: 'item',
                            fieldId: 'custcol_rebate_cost',
                            value: rebatePrice.originalCost
                        })
                        var lineQty = Number(rec.getCurrentSublistValue({
                            sublistId: 'item',
                            fieldId: 'quantity',
                        }))
                        lineQty = lineQty - Number(rec.getCurrentSublistValue({
                            sublistId: 'item',
                            fieldId: 'quantitybackordered',
                        }))
                        rec.setCurrentSublistValue({
                            sublistId: 'item',
                            fieldId: 'costestimate',
                            value: lineQty * Number(rebatePrice.rebateCost)
                        })
                    }
                    else if (rebatePrice == -1 && vendorPrice != -1) {
                        rec.setCurrentSublistValue({
                            sublistId: 'item',
                            fieldId: 'costestimatetype',
                            value: 'CUSTOM'
                        })
                        rec.setCurrentSublistValue({
                            sublistId: 'item',
                            fieldId: 'custcol_acc_unitcost',
                            value: vendorPrice
                        })
                        var lineQty = Number(rec.getCurrentSublistValue({
                            sublistId: 'item',
                        }))
                        lineQty = lineQty - Number(rec.getCurrentSublistValue({
                            sublistId: 'item',
                            fieldId: 'quantitybackordered',
                        }))
                        rec.setCurrentSublistValue({
                            sublistId: 'item',
                            fieldId: 'costestimate',
                            value: lineQty * Number(vendorPrice)
                        })
                    }
                }
                else { //Standard order logic for cost
                    let rebateStandard = getRebatePrice(itemId, customerId, isDropShip);
                    if (rebateStandard.rebateCost != -1) {

                        rec.setCurrentSublistValue({
                            sublistId: 'item',
                            fieldId: 'costestimatetype',
                            value: 'CUSTOM'
                        })
                        rec.setCurrentSublistValue({
                            sublistId: 'item',
                            fieldId: 'custcol_acc_unitcost',
                            value: rebateStandard.rebateCost
                        })
                        rec.setCurrentSublistValue({
                            sublistId: 'item',
                            fieldId: 'custcol_rebate_parent_id',
                            value: rebateStandard.rebateId
                        })
                        rec.setCurrentSublistValue({
                            sublistId: 'item',
                            fieldId: "custcol_rebate_cost",
                            value: rebateStandard.originalCost
                        })
                        var lineQty = Number(rec.getCurrentSublistValue({
                            sublistId: 'item',
                            fieldId: 'quantity',
                        }))
                        lineQty = lineQty - Number(rec.getCurrentSublistValue({
                            sublistId: 'item',
                            fieldId: 'quantitybackordered',
                        }))
                        rec.setCurrentSublistValue({
                            sublistId: 'item',
                            fieldId: 'costestimate',
                            value: lineQty * Number(rebateStandard.rebateCost)
                        })
                    }
                    else {
                        let loadedCost = getLoadedCost(itemId)
                        rec.setCurrentSublistValue({
                            sublistId: 'item',
                            fieldId: 'costestimatetype',
                            value: 'CUSTOM'
                        })

                        if (loadedCost != -1) {
                            rec.setCurrentSublistValue({
                                sublistId: 'item',
                                fieldId: 'custcol_acc_unitcost',
                                value: loadedCost
                            })
                            var lineQty = Number(rec.getCurrentSublistValue({
                                sublistId: 'item',
                                fieldId: 'quantity',
                            }))
                            lineQty = lineQty - Number(rec.getCurrentSublistValue({
                                sublistId: 'item',
                                fieldId: 'quantitybackordered',
                            }))
                            rec.setCurrentSublistValue({
                                sublistId: 'item',
                                fieldId: 'costestimate',
                                value: lineQty * Number(loadedCost)
                            })
                        }
                    }
                }
                let sellPrice = Number(rec.getCurrentSublistValue({
                    sublistId: 'item',
                    fieldId: 'rate',
                }))
                let cogs = Number(rec.getCurrentSublistValue({
                    sublistId: 'item',
                    fieldId: 'custcol_acc_unitcost',
                }))
                if (cogs) {
                    let grossMargin = ((sellPrice - cogs) / sellPrice) * 100
                    rec.setCurrentSublistValue({
                        sublistId: 'item',
                        fieldId: 'custcol_acme_markup_percent',
                        value: grossMargin.toFixed(2)
                    })
                }
                rec.commitLine({
                    sublistId: 'item'
                });
            }// end for

            //--------------------------------------------------------------
            /* let allLines = getAllLines(rec);
            setExxTotal(allLines, rec); */

            if (!isEmpty(lineItems)) {
                let customerId = updateCustomerSpecificPricing(lineItems, customer, rec);
                if (!isEmpty(customerId)) {
                    updatePricedLines(lineItems, rec);
                }
            }
            rec.setValue({ fieldId: 'custbody_sdb_order_sps_replaced', value: true });
            // rec.save({
            //     ignoreMandatoryFields: true
            // })
        }
        catch (error) {
            log.error('Error at SetCustmerPricing', error);
        }
    }
    // -------------------------Functions of Script Extension set Pricing ---------------------------
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
        var printButton = scriptContext.form.addButton({ id: 'custpage_print', label: 'Print', functionName: stringScript });
    }

    function getPermanentPricedLines(rec) {
        try {
            var lineCount = rec.getLineCount({ sublistId: 'item' });
            var itemsArr = [];
            for (var i = 0; i < lineCount; i++) {
                rec.selectLine({ sublistId: 'item', line: i })
                var permanentPrice = rec.getCurrentSublistValue({ sublistId: 'item', fieldId: 'custcol_acme_permanent_price', line: i });
                var permanentPriceUpdated = rec.getCurrentSublistValue({ sublistId: 'item', fieldId: 'custcol_acme_permanent_price_updated', line: i });
                if (permanentPrice == true && permanentPriceUpdated == false) {
                    var item = rec.getCurrentSublistValue({ sublistId: 'item', fieldId: 'item', line: i });
                    var qty = rec.getCurrentSublistValue({ sublistId: 'item', fieldId: 'quantity', line: i });
                    var price = rec.getCurrentSublistValue({ sublistId: 'item', fieldId: 'rate', line: i });
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
            log.error("Error in setExxTotal", error);
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
            var customerId = customerRec.save({ ignoreMandatoryFields: true });
            return customerId;
        }
        catch (error) {
            log.error('Error in updateCustomerSpecificPricing', error.toString());
        }
    }

    function updatePricedLines(lineItems, rec) {
        try {
            for (var i = 0; i < lineItems.length; i++) {
                rec.selectLine({ sublistId: 'item', line: lineItems[i].line })
                rec.setCurrentSublistValue({ sublistId: 'item', fieldId: 'custcol_acme_permanent_price_updated', value: true });
                rec.commitLine({ sublistId: 'item' })
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

});