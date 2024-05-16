/**
 * @NApiVersion 2.0
 * @NScriptType UserEventScript
 * @NModuleScope SameAccount
 * 
 * Posible Upgrades:
 *  1. Restockit Entity source from script parameter.
 *  2. Restockit 850 Success Status source from script parameter.
 *  3. SPS Employee source from script parameter
 */
define(["N/log", "N/search", "N/runtime", "N/ui/message", "N/record"], function (log, search, runtime, message, record) {
    function beforeSubmit(context) {
        try {
            var recordType = context.newRecord.type;
            if (recordType == 'salesorder') {
                updateItemTax(context.newRecord);
            }
            updateItemSPSFields(context);
            if (recordType == 'invoice') {
                updateSyncStatus(context.newRecord);
            }
            // log.debug("beforeSubmit() Remaining governance units:", runtime.getCurrentScript().getRemainingUsage());
        } catch (error) {
            log.error("ERROR: ", error);
        }
    }

    // ----------------- CONSTANTS ----------------- //
    // * CONSTS FIELD IDs
    // SO columns
    var UOMFIELDID = "units";
    var BPNFIELDID = "custcol_sps_bpn";
    var POLINENUMFIELDID = "custcol_sps_linesequencenumber";
    var NWPRICEFIELDID = "custcol_sps_purchaseprice";
    var UPCFIELDID = "custcol_sps_upc";
    var ITEMPARTFIELDID = "custcol_ava_item";
    var UNITSDISPLAYFIELDID = 'units_display';
    var PREFVENDORFIELDID = "custcol_sdb_pref_vendor_name";
    var MANUFCODEFIELDID = "custcol_sdb_manuf_code";
    // CustomRecord ItemUPCByOUM
    var SAPCODEFIELDID = "custrecord_sdb_acme_sap";
    var UPCCODEFIELDID = "custrecord_sdb_acme_upc";
    var ITEMUPCBYUOMSUBLISTUOMFIELDID = "custrecord_sdb_acme_uom";
    // Item Fields
    var ACMECODEFIELDID = "itemid";
    // Invoice FIelds
    var EDISYNCSTATUSFIELDID = "custbody_edi_sync_status";
    var PODATEFIELDID = "custbody_sps_purchaseorderdate";
    var ENTEREDBYFIELDID = "custbody_aps_entered_by";
    var NETWORKPONUMBERFIELDID = "custbody_sps_ponum_from_salesorder";
    // Customer Fields
    var CUSTOMERNETWORKIDFIELD = "custentity_network_number";
    // * CONSTS ENTITIES
    // Restockit Entity
    var RESTOCKITENTITY = 96580;
    // sps_webservice employee
    var SPSWEBSERVICEEMPLOYEE = 84216;
    // * CONSTS List/Record Values
    var EDISYNC850SUCCESSSTATUS = 3;

    // ----------------- Auxiliar functions ----------------- //
    function updateSyncStatus(newRecord) {
        try {
            var entity = newRecord.getValue('entity');
            if (entity == RESTOCKITENTITY) {
                var ediSyncStatus = newRecord.getValue(EDISYNCSTATUSFIELDID);
                if (!ediSyncStatus || ediSyncStatus == EDISYNC850SUCCESSSTATUS) { //If is was not marked for the integration OR If it came from EDI850
                    newRecord.setValue({
                        fieldId: EDISYNCSTATUSFIELDID,
                        value: 10,
                    });
                }
            }
        } catch (updateSyncStatusError) {
            log.error("updateSyncStatus() ERROR", updateSyncStatusError);
        }
    }
    function updateItemSPSFields(context) {
        try {
            var newRecord = context.newRecord;
            var hasAllFields = true; // IF any has null/undefined this variable will not be true;            
            // * Condition to execute Client must be SPS (Customer.custentity_sps_enable_invoice_workflow == T)
            var customer = newRecord.getValue('entity');
            if (!customer) return;
            var SPSEnableInvoiceWF = search.lookupFields({
                type: search.Type.CUSTOMER,
                id: customer,
                columns: 'custentity_sps_enable_invoice_workflow'
            }).custentity_sps_enable_invoice_workflow;
            if (!SPSEnableInvoiceWF || SPSEnableInvoiceWF == 'F') return;

            //* Body fields
            newRecord.setValue({
                fieldId: 'custbody_sps_routingkey',
                value: 'CHKALLACMEPAPER',
            });
            newRecord.setValue({
                fieldId: 'custbody_sps_vendor',
                value: '0000004600',
            });
            newRecord.setValue({
                fieldId: 'custbody_sps_st_locationcodequalifier',
                value: 92,
            });
            var networkNumber = newRecord.getValue('custbody_sps_st_addresslocationnumber');
            if (!networkNumber) {
                newRecord.setValue({
                    fieldId: 'custbody_sps_st_addresslocationnumber',
                    value: getNetworkNumber(newRecord),
                });
            }
            var poDate = newRecord.getValue(PODATEFIELDID);
            if (!poDate && newRecord.type == 'invoice') {
                var tranDate = newRecord.getValue("trandate");
                newRecord.setValue({
                    fieldId: PODATEFIELDID,
                    value: tranDate,
                });
            }
            var enteredBy = newRecord.getValue(ENTEREDBYFIELDID);
            if (enteredBy != SPSWEBSERVICEEMPLOYEE){
                newRecord.setValue(NETWORKPONUMBERFIELDID,'');
            }

            hasAllFields = hasAllFields && networkNumber;

            //* Line fields
            var lineCount = newRecord.getLineCount({
                sublistId: 'item'
            });
            for (var i = 0; i < lineCount; i++) {
                var item = newRecord.getSublistValue({
                    sublistId: 'item',
                    fieldId: 'item',
                    line: i
                });
                var UoM = newRecord.getSublistValue({
                    sublistId: 'item',
                    fieldId: UOMFIELDID,
                    line: i
                });
                var UoMText = newRecord.getSublistValue({
                    sublistId: 'item',
                    fieldId: UNITSDISPLAYFIELDID,
                    line: i
                });
                var BPN = newRecord.getSublistValue({
                    sublistId: 'item',
                    fieldId: BPNFIELDID,
                    line: i
                });
                var POLineNum = newRecord.getSublistValue({
                    sublistId: 'item',
                    fieldId: POLINENUMFIELDID,
                    line: i
                });
                var NWPrice = newRecord.getSublistValue({
                    sublistId: 'item',
                    fieldId: NWPRICEFIELDID,
                    line: i
                });
                var UPC = newRecord.getSublistValue({
                    sublistId: 'item',
                    fieldId: UPCFIELDID,
                    line: i
                });
                var itemPart = newRecord.getSublistValue({
                    sublistId: 'item',
                    fieldId: ITEMPARTFIELDID,
                    line: i
                });
                var prefVendor = newRecord.getSublistValue({
                    sublistId: 'item',
                    fieldId: PREFVENDORFIELDID,
                    line: i,
                });
                var manufCode = newRecord.getSublistValue({
                    sublistId: 'item',
                    fieldId: MANUFCODEFIELDID,
                    line: i,
                });
                if (!BPN || !POLineNum || !NWPrice || !UPC || !itemPart || !prefVendor || !manufCode) { // IF theres a value missing -> go get it
                    if (!BPN || !UPC || !itemPart || !prefVendor || !manufCode) {
                        var itemAttributes = getItemAttribute(item, UoM, UoMText);
                    }
                    if (!manufCode) {
                        manufCode = itemAttributes[MANUFCODEFIELDID];
                        if (manufCode) {
                            newRecord.setSublistValue({
                                sublistId: 'item',
                                fieldId: MANUFCODEFIELDID,
                                value: manufCode,
                                line: i,
                            });
                        }
                    }
                    if (!prefVendor) {
                        prefVendor = itemAttributes[PREFVENDORFIELDID];
                        if (prefVendor) {

                            newRecord.setSublistValue({
                                sublistId: 'item',
                                fieldId: PREFVENDORFIELDID,
                                value: prefVendor,
                                line: i,
                            });
                        }
                    }
                    if (!itemPart) {
                        itemPart = itemAttributes[ACMECODEFIELDID];
                        if (itemPart) {
                            newRecord.setSublistValue({
                                sublistId: 'item',
                                fieldId: ITEMPARTFIELDID,
                                value: itemPart,
                                line: i,
                            });
                        }
                    }
                    if (!BPN) {
                        BPN = itemAttributes[SAPCODEFIELDID];
                        if (BPN) {
                            newRecord.setSublistValue({
                                sublistId: 'item',
                                fieldId: BPNFIELDID,
                                value: BPN,
                                line: i,
                            });
                        }
                    }
                    if (!POLineNum) {
                        POLineNum = addZeros(i + 1);
                        newRecord.setSublistValue({
                            sublistId: 'item',
                            fieldId: POLINENUMFIELDID,
                            value: POLineNum,
                            line: i,
                        });
                    }
                    if (!NWPrice) {
                        NWPrice = newRecord.getSublistValue({
                            sublistId: 'item',
                            fieldId: 'rate',
                            line: i
                        });
                        newRecord.setSublistValue({
                            sublistId: 'item',
                            fieldId: NWPRICEFIELDID,
                            value: NWPrice,
                            line: i,
                        });
                    }
                    if (!UPC) {
                        UPC = itemAttributes[UPCCODEFIELDID];
                        if (UPC) {
                            newRecord.setSublistValue({
                                sublistId: 'item',
                                fieldId: UPCFIELDID,
                                value: UPC,
                                line: i,
                            });
                        }
                    }
                }
                hasAllFields = hasAllFields && BPN && UPC;
            }
            // if (hasAllFields) {
            //     log.debug("updateItemsSPSFields() This record is complete: ", JSON.stringify({
            //         recordType: newRecord.type,
            //         id: newRecord.id,
            //     }))
            // } else {
            //     log.debug("updateItemSPSFields() Missing some SPS fields", JSON.stringify({
            //         recordType: newRecord.type,
            //         id: newRecord.id,
            //     }));
            // }
        } catch (updateItemSPSFieldsERROR) {
            log.error("updateItemSPSFields() ERROR", updateItemSPSFieldsERROR);
        }
    }

    function getNetworkNumber(newRecord) {
        try {
            var networkNumber = '';
            var subRecord = newRecord.getSubrecord('shippingaddress');
            if (subRecord) {
                networkNumber = subRecord.getValue('custrecord_address_shiplist_no');
                if (!networkNumber) {
                    var customerId = newRecord.getValue('entity');
                    var customerLookUpField = search.lookupFields({
                        type: search.Type.CUSTOMER,
                        id: customerId,
                        columns: CUSTOMERNETWORKIDFIELD,
                    });
                    networkNumber = customerLookUpField[CUSTOMERNETWORKIDFIELD];
                }
            }
            return networkNumber;
        } catch (getNetworkNumberERROR) {
            log.error("getNetworkNumber()  ERROR", getNetworkNumberERROR);
        }
    }

    function addZeros(number) {
        try {
            var res = '' + number;
            while (res.length < 5) {
                res = '0' + res;
            }
            return res;
        } catch (addZerosERROR) {
            log.error("addZeros() ERROR", addZerosERROR);
        }
    }

    function getAttributesByUoMRecord(item, returnObj, UoMText) {
        try {
            var customrecord_sdb_acme_upc_sap_uomSearchObj = search.create({
                type: "customrecord_sdb_acme_upc_sap_uom",
                filters:
                    [
                        ["custrecord_sdb_acme_item", "anyof", item]
                    ],
                columns:
                    [
                        search.createColumn({ name: UPCCODEFIELDID, label: "UPC Code" }),
                        search.createColumn({ name: SAPCODEFIELDID, label: "SAP Code" }),
                        search.createColumn({ name: ITEMUPCBYUOMSUBLISTUOMFIELDID, label: "UOM" }),
                    ]
            });
            var searchResultCount = customrecord_sdb_acme_upc_sap_uomSearchObj.runPaged().count;

            customrecord_sdb_acme_upc_sap_uomSearchObj.run().each(function (result) {
                if (searchResultCount == 1) {
                    returnObj[SAPCODEFIELDID] = result.getValue(SAPCODEFIELDID);
                    returnObj[UPCCODEFIELDID] = result.getValue(UPCCODEFIELDID);
                } else if (searchResultCount > 1) {
                    var currentUoM = result.getValue(ITEMUPCBYUOMSUBLISTUOMFIELDID);
                    if (currentUoM.substring(0, 2).toUpperCase() == UoMText.toUpperCase()) {
                        returnObj[SAPCODEFIELDID] = result.getValue(SAPCODEFIELDID);
                        returnObj[UPCCODEFIELDID] = result.getValue(UPCCODEFIELDID);
                    }
                }
                return true;
            });
        } catch (error) {
            log.error("getAttributesByUoMRecord() ERROR", error);
        }
    }
    function getItemAttribute(item, UoM, UoMText) {
        try {
            var returnObj = {};
            getAttributesByUoMRecord(item, returnObj, UoMText);

            // Get Item fields
            var itemLookupFields = search.lookupFields({
                type: 'item',
                id: item,
                columns: [ACMECODEFIELDID, "recordtype", 'vendorname']
            });
            log.debug("getItemAttribute() itemLookupFields is: ", itemLookupFields);
            returnObj[ACMECODEFIELDID] = itemLookupFields[ACMECODEFIELDID];
            returnObj[MANUFCODEFIELDID] = itemLookupFields['vendorname'];
            // Get Vendor fields
            if (itemLookupFields["recordtype"]) {
                var itemRecord = record.load({
                    type: itemLookupFields['recordtype'],
                    id: item,
                    isDynamic: true,
                });
                var prefVendorLine = itemRecord.findSublistLineWithValue({
                    sublistId: 'itemvendor',
                    fieldId: 'preferredvendor',
                    value: 'T'
                });
                if (prefVendorLine >= 0) {
                    itemRecord.selectLine({
                        sublistId: 'itemvendor',
                        line: prefVendorLine
                    });
                    var prefVendorID = itemRecord.getCurrentSublistValue({
                        sublistId: 'itemvendor',
                        fieldId: 'vendor'
                    });
                    var prefVendorLookUpFields = search.lookupFields({
                        type: 'vendor',
                        id: prefVendorID,
                        columns: 'altname'
                    });
                    returnObj[PREFVENDORFIELDID] = prefVendorLookUpFields['altname'];
                }
            }
            log.debug("getItemAttribute() returnObj is: ", returnObj);
            return returnObj;
        } catch (getItemAttributeERROR) {
            log.error("getItemAttribute() ERROR", getItemAttributeERROR);
        }
    }

    function updateItemTax(newRecord) {
        var userObj = runtime.getCurrentUser();
        if (userObj.id == 75190) return; //2 High Jump id

        var customerId = newRecord.getValue("entity");
        var itemIds = getItemIds(newRecord);

        var itemCount = newRecord.getLineCount("item");
        if (!customerId) return;
        var customerInfo = search.lookupFields({
            type: "customer",
            id: customerId,
            columns: ['custentity_tax_type']
        });
        var customerTaxType = customerInfo['custentity_tax_type'][0] ? customerInfo['custentity_tax_type'][0].value : '';

        var taxInfo = getTaxTypeMappingOfCustomer(newRecord, itemIds, customerTaxType);

        log.debug("CUSTOMER INFO: ", { customerId: customerId, customerTaxType: customerTaxType, taxInfo: taxInfo });
        var taxCode = getTaxCode(newRecord);
        for (var i = 0; i < itemCount; i++) {
            var itemId = newRecord.getSublistValue({ sublistId: 'item', fieldId: 'item', line: i });
            if (!itemId) continue;

            var itemInfo = search.lookupFields({
                type: "item",
                id: itemId,
                columns: ['custitem_tax_type']
            });
            var itemTaxType = itemInfo['custitem_tax_type'][0] ? itemInfo['custitem_tax_type'][0].value : '';
            if (!itemTaxType) continue;

            // var taxItem = taxInfo.find(function (item) {
            //     return item.itemTax == itemTaxType;
            // });
            var taxItem = taxInfo.filter(function (e) {
                return e.itemTax == itemTaxType;
            });
            if (!taxItem.length || !taxItem[0].isTaxable) continue;

             log.audit("ITEM: ", { customer: customerId, itemId: itemId, taxCode: taxCode, taxItem: taxItem[0] });
            if (taxItem[0].isTaxable && taxCode) {
                newRecord.setSublistValue({ sublistId: 'item', fieldId: 'istaxable', value: true, line: i });
                newRecord.setSublistValue({ sublistId: 'item', fieldId: 'taxcode', value: taxCode, line: i });
            }
        }
    }

    function getTaxTypeMappingOfCustomer(newRecord, itemIds, customerTaxType) {
        var arrToReturn = [];
        if (!itemIds.length || !customerTaxType) return arrToReturn;
        var itemTaxSearch = search.create({
            type: "customrecord_cust_item_taxtypemapping",
            filters:
                [
                    ["isinactive", "is", "F"],
                    "AND",
                    ["custrecord_cittm_customer_tax_type", "is", customerTaxType],
                ],
            columns:
                [
                    "custrecord_cittm_customer_tax_type",
                    "custrecord_cittm_item_tax_type",
                    "custrecord_cittm_taxable"
                ]
        });
        itemTaxSearch.run().each(function (result) {
            arrToReturn.push({
                customerTax: result.getValue("custrecord_cittm_customer_tax_type"),
                itemTax: result.getValue("custrecord_cittm_item_tax_type"),
                isTaxable: result.getValue("custrecord_cittm_taxable")
            })
            return true;
        });
        return arrToReturn;
    }

    function getItemIds(newRecord) {
        var arrToReturn = [];
        var itemCount = newRecord.getLineCount("item");
        for (var i = 0; i < itemCount; i++) {
            var itemId = newRecord.getSublistValue({ sublistId: 'item', fieldId: 'item', line: i });
            if (arrToReturn.indexOf(itemId) == -1) arrToReturn.push(itemId);
        }
        return arrToReturn;
    }

    function getTaxCode(newRecord) {
        var scriptObj = runtime.getCurrentScript();
        var avaTax = scriptObj.getParameter("custscript_sdb_tax_code_ava");

        var currentState = newRecord.getValue("shipstate");

        var taxCode = getSaleTax(currentState);
        return taxCode !== -1 ? taxCode : avaTax;
    }

    function beforeLoad(context) {
        // executePageInit(context); COMMENTED 08/05/2024 
    }

    // ------------------------ RECORD HAS BEEN CHANGE ------------------------ //
    function executePageInit(context) {
        try {
            var userObj = runtime.getCurrentUser();
            if (userObj.id == 85394) return;
            if (context.newRecord.type != "salesorder") return;
            var salesOrder = context.newRecord;
            var isDropShipOrder = salesOrder.getValue("custbody_dropship_order");
            if (!salesOrder.id || isDropShipOrder) return;

            var timestamp = salesOrder.getValue('custbody_a1wms_dnloadtimestmp');
            var download = salesOrder.getValue('custbody_a1wms_dnloadtowms');
            var status = salesOrder.getValue('custbody_a1wms_orderstatus');
            var shipcomplete = salesOrder.getValue('shipcomplete');
            var customform = salesOrder.getValue('customform');
            var hasCommitedQty = hetHasCommitedQty(salesOrder.id);
            var networkMissing = getNetworkMissing(salesOrder);

            // log.debug("ALERT INFO: ", { salesOrder: salesOrder.id, timestamp, download, status, shipcomplete, customform, hasCommitedQty, networkMissing });

            if ((timestamp && download && !status && hasCommitedQty && !shipcomplete && customform != 317) || networkMissing) showAlert(context);
        } catch (e) {
            log.error('ERROR: executePageInit', e);
        }
    }

    function getNetworkMissing(salesOrder) {
        var SPS_NETWORK = "84216";
        var DCKAP = "66155";
        var enteredById = salesOrder.getValue("custbody_aps_entered_by");
        if (enteredById != SPS_NETWORK || enteredById != DCKAP) return false;
        var spsFlag = salesOrder.getValue("custbody_sdb_order_sps_replaced");
        if (enteredById == SPS_NETWORK && !spsFlag) return true;
        return false;
    }

    function hetHasCommitedQty(orderId) {
        var totalcommitted = 0;
        var salesorderSearchObj = search.create({
            type: "salesorder",
            filters:
                [
                    ["internalid", "anyof", orderId],
                    "AND",
                    ["mainline", "is", "T"]
                ],
            columns:
                [
                    search.createColumn({ name: "totalcommitted", label: "Total Quantity Committed" })
                ]
        });
        salesorderSearchObj.run().each(function (result) {
            totalcommitted = Number(result.getValue("totalcommitted"));
            return false;
        });

        return totalcommitted && totalcommitted > 0;
    }
    function showAlert(context) {
        try {
            context.form.addPageInitMessage({ type: message.Type.WARNING, message: 'This order is being processed by HIGH JUMP, once this process is finished it can be edited. <a href="">refresh</a>', duration: 1000000 });
            var script = '<script>'
            script += 'setInterval(function(){'
            script += 'var saveBtn = document.querySelectorAll(".pgBntY.pgBntB");'
            script += 'if (saveBtn) saveBtn.forEach(function (el) {'
            script += 'el.style.pointerEvents = "none";'
            script += '});'
            script += 'var editBtn = document.querySelectorAll(".rndbuttoninpt.bntBgT[value="Edit"]");'
            script += 'if (editBtn) editBtn.forEach(function (el) {'
            script += 'if(el) el.parentElement.parentElement.parentElement.parentElement.style.display = "none";'
            script += '});'
            script += '}, 1000)'
            script += '</script>'
            var field = context.form.addField({
                id: "custpage_hide_save_btn",
                label: "Hide Save BTN",
                type: 'inlinehtml'
            });
            field.defaultValue = script;

        } catch (e) {
            log.error('ERROR: showAlert', e);
        }
    }
    // ------------------------ RECORD HAS BEEN CHANGE ------------------------ //

    function getSaleTax(stateShortName) {
        var taxCode = -1;

        search.create({
            type: "customrecord_sdb_sale_tax",
            filters:
                [
                    ["custrecord_sdb_sale_tax_state.shortname", "startswith", stateShortName],
                    "AND",
                    ["isinactive", "is", "F"],
                    "AND",
                    ["custrecord_sdb_sale_tax_tax_code", "noneof", "@NONE@"]
                ],
            columns:
                [
                    search.createColumn({ name: "custrecord_sdb_sale_tax_tax_code", label: "Tax Code" })
                ]
        }).run().each(function (res) {
            taxCode = res.getValue("custrecord_sdb_sale_tax_tax_code");
        });

        return taxCode;
    }

       function afterSubmit(context) {
        try {
            //* Line fields
            return
            if (context.type == context.UserEventType.DELETE) return;
            var newRecord = context.newRecord;
            var enteredBy = newRecord.getValue('custbody_aps_entered_by')
            log.debug("enteredBy: ", enteredBy);
            if (enteredBy != 51363 && newRecord.id != 1821171) return;
            log.debug("newRecord.id:>>> ", newRecord.id);
            var rcd = record.load({
                type: record.Type.SALES_ORDER,
                id: newRecord.id,
                isDynamic: true,
            })

            var lineCount = newRecord.getLineCount({
                sublistId: 'item'
            });

            for (var i = 0; i < lineCount; i++) {
                rcd.selectLine({
                    sublistId: 'item',
                    line: i
                })
                var item = rcd.getCurrentSublistValue({
                    sublistId: 'item',
                    fieldId: 'item',

                });

                var amount = rcd.getCurrentSublistValue({
                    sublistId: 'item',
                    fieldId: 'amount',
                })
                var taxrate = rcd.getCurrentSublistValue({
                    sublistId: 'item',
                    fieldId: 'taxrate1',
                })
                var tax_amount = rcd.getCurrentSublistValue({
                    sublistId: 'item',
                    fieldId: 'custcol_ava_taxamount',
                })

                // rcd.setCurrentSublistValue({
                //     sublistId: 'item',
                //     fieldId: 'taxrate1',
                //     value: taxrate
                // })

                taxrate = taxrate ? parseFloat(taxrate) : false;
                log.debug("taxrate2: ", taxrate);
                if (!taxrate) continue;
                var newTaxAmount = returnTaxAmount(amount, taxrate)

                log.debug("newtaxNount: ", newTaxAmount);
                if (!tax_amount && newTaxAmount) {
                    rcd.setCurrentSublistValue({
                        sublistId: 'item',
                        fieldId: 'custcol_ava_taxamount',
                        value: newTaxAmount
                    })

                    rcd.commitLine({
                        sublistId: 'item'
                    });
             }
            }

            rcd.save({
                ignoreMandatoryFields: true
            })

        } catch (error) {
            log.error("ERROR - afterSubmit ID: " + newRecord.id, error);
        }
    }

    function returnTaxAmount(rate, txrate) {
        try {
            var newVal = (Number(rate) * txrate) / 100;

        } catch (error) {
            log.error('error returnTaxAmount', error)
        }
        return newVal;
    }

    return {
        beforeSubmit: beforeSubmit,
        afterSubmit: afterSubmit
        // beforeLoad: beforeLoad,
    };
});