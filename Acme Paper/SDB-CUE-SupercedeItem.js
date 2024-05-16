/**
 * @NApiVersion 2.1
 * @NScriptType clientScript
 * @NModuleScope Public
 * PROD
 */
define(["N/search", 'N/runtime', 'N/record', 'N/https', 'N/ui/dialog'], function (search, runtime, record, https, dialog) {
    const RICHMOND = 103;
    const SAVAGE = 104;
    var thisMode;

    // ------------------------ RECORD HAS BEEN CHANGE ------------------------ //
    function executePageInit(context) {
        try {
            if (context.currentRecord.type != "salesorder") return;
            let salesOrder = context.currentRecord;
            var isDropShipOrder = salesOrder.getValue("custbody_dropship_order");
            if (!salesOrder.id || isDropShipOrder) return;

            var timestamp = salesOrder.getValue('custbody_a1wms_dnloadtimestmp');
            var download = salesOrder.getValue('custbody_a1wms_dnloadtowms');
            var status = salesOrder.getValue('custbody_a1wms_orderstatus');
            if (timestamp && download && !status) showAlert(salesOrder);
        } catch (e) {
            log.error('ERROR: executePageInit', e);
        }
    }
    function showAlert() {
        try {
            var header = document.querySelector(".uir-page-title-firstline");
            var span = document.createElement('span');
            span.style.backgroundColor = '#f44336';
            span.style.padding = '5px';
            span.style.opacity = '1';
            span.style.color = 'white';
            span.style.fontWeight = '900';

            span.innerHTML = 'ERROR: This order is being processed by HIGH JUMP, once this process is finished it can be edited. <a href="">refresh</a>';
            if (header) header.append(span);

            var saveBtn = document.querySelectorAll(".pgBntY.pgBntB");
            if (saveBtn) saveBtn.forEach(function (el) {
                el.style.pointerEvents = "none";
            });

        } catch (e) {
            log.error('ERROR: showAlert', e);
        }
    }
    // ------------------------ RECORD HAS BEEN CHANGE ------------------------ //

    function intitReturnAuthorization(currentRecord) {
        currentRecord.setValue("custbody_a1wms_orderlocked", false);
        currentRecord.setValue("custbody_a1wms_dnloadtowms", true);
    }

    function pageInit(context) {
        try {
          debugger;
            // executePageInit(context);
            sessionStorage.clear();

            let myCurrentRecord = context.currentRecord;
            var thisForm = myCurrentRecord.getValue('customform');
            let recordType = myCurrentRecord.type;
            var entity = myCurrentRecord.getValue('entity');
            var actualForm = myCurrentRecord.getValue('customform');
            var scriptObj = runtime.getCurrentScript();

            var currentLocation = myCurrentRecord.getValue('location');
            var currentWarehouse = myCurrentRecord.getValue('custbody_warehouse_roadnet');

            var Customerwarehouse = getWarehouseFromAddress(myCurrentRecord, 'entity')?.warehouse;
            if (Customerwarehouse && (!currentLocation || !currentWarehouse)) {
                myCurrentRecord.setValue('location', Customerwarehouse);
                myCurrentRecord.setValue('custbody_warehouse_roadnet', Customerwarehouse);
            }
            thisMode = context.mode;

            if (entity && (thisMode == 'copy' || thisMode == 'create')) {
                PopulateAdressFunction(context, false);
            }
            if (myCurrentRecord.type == 'invoice' && thisForm != 308) {
                myCurrentRecord.setValue({ fieldId: "customform", value: 308 });
            }

            if (recordType == 'salesorder') {

                RemoveStockAlertDropshipOrders(myCurrentRecord);
                //This runs only on Sales Orders
                disableUOMFieldsByRole(context);

                var customForm = myCurrentRecord.getValue({
                    fieldId: 'customform'
                })
                if (customForm == 300) { //hardcoded ACME Sales Order Entry custom form
                    myCurrentRecord.setValue({
                        fieldId: 'custbody_dropship_order',
                        value: true,
                        ignoreFieldChange: true,
                    })
                }
                //* Because of BUG alert on SO we commented this part 7/11/2023
                // triggerLockRecord(context.currentRecord.id);
                // deleteCustomLockRecord(myCurrentRecordId);

            }//Add 25/7 END

            var currentRoleId = runtime.getCurrentUser().id
            var currentrecord = context.currentRecord;

            var styles = `
      td #tbl_secondary_cancel { 
        display:none
      }
      #tbl_secondarycustpage_ava_validatebillto {display:none}
      #tdbody_secondarycustpage_ava_validateshipto {display:none}
      #tdbody_secondarycustpage_ava_calculatetax {display:none}
      
  `

            var styleSheet = document.createElement("style");
            styleSheet.innerText = styles;
            document.head.appendChild(styleSheet);
            if (actualForm == 317) {
                currentrecord.setValue({
                    fieldId: 'custbody_a1wms_dnloadtowms',
                    value: false,
                    ignoreFieldChange: true
                })
            }

            if (context.mode == 'create') {
                currentrecord.setValue({
                    fieldId: 'custbody_aps_entered_by',
                    value: currentRoleId,
                    ignoreFieldChange: true
                });
            }

            var scriptObj = runtime.getCurrentScript();
            //drop ship form
            var paramForm = scriptObj.getParameter({ name: 'custscript_sdb_form_drop_ship' });
            //actual form
            var actualForm = currentrecord.getValue('customform');
            if (actualForm == paramForm && currentrecord.type == 'salesorder') {
                currentrecord.setValue({
                    fieldId: 'custbody_dropship_order',
                    value: true,
                    ignoreFieldChange: true
                })
            } else {
                var currentValue = currentrecord.getValue('custbody_dropship_order');
                if (!currentValue) currentrecord.setValue({
                    fieldId: 'custbody_dropship_order',
                    value: false,
                    ignoreFieldChange: true
                })
            }

            if (context.currentRecord.type == "returnauthorization") intitReturnAuthorization(context.currentRecord);

        } catch (e) {
            log.error('error', e)
        }

        if (context.mode != "copy") return;
        if (context.currentRecord.type == "returnauthorization") return;
        setAllLinesLocation(context);
    }

    function RemoveStockAlertDropshipOrders(context) {
        try {
            var customForm = context.getValue({ fieldId: 'customform' })
            //300 id custom form DROP SHIP ENTRY
            if (customForm == '300') {
                window.CheckStock = function () {
                    return
                }
            }

        } catch (error) {
            log.error({
                title: 'RemoveStockAlertDropshipOrders',
                details: error
            })
        }
    }
    function postSourcing(context) {//101889 MISSION BBQ DEPTFORD NJ
        try {
            var rec = context.currentRecord;
            var sublistId = context.sublistId;
            var fieldId = context.fieldId;

            if (context.sublistId == 'item' && context.fieldId == 'item') {
                var itemId = rec.getCurrentSublistValue({
                    sublistId: "item",
                    fieldId: "item",
                });
                if (!isNaN(itemId)) {
                    populateWarehouseFunctionality(context);
                }

            }

            if (context.currentRecord.type == "invoice" || context.currentRecord.type == "estimate" || context.currentRecord.type == 'returnauthorization') return true;

            var savage_available_qty = 0;
            var location = rec.getValue({ fieldId: "location" });

            if (sublistId == "item" && fieldId == "item") {
                var itemText = rec.getCurrentSublistText({
                    sublistId: "item",
                    fieldId: "item",
                });
                var item = rec.getCurrentSublistValue({
                    sublistId: "item",
                    fieldId: "item",
                });
                var supercedeItemText = rec.getCurrentSublistText({
                    sublistId: "item",
                    fieldId: "custcol_acc_supercede_item",
                });
                var supercedeItem = rec.getCurrentSublistValue({
                    sublistId: "item",
                    fieldId: "custcol_acc_supercede_item",
                });

                if (!isEmpty(supercedeItem)) {
                    var fieldLookUp = search.lookupFields({
                        type: search.Type.ITEM,
                        id: supercedeItem,
                        columns: ['itemid']
                    });

                    supercedeItemText = fieldLookUp.itemid;
                }

                //***Code is added for validation that is inventory to validate qty available and not service or charge 5/10
               if(!item) return true;
                var itemType = search.lookupFields({
                    type: search.Type.ITEM,
                    id: item,
                    columns: ['type']
                }).type

                var isInventoryItem;

                if (itemType.length) isInventoryItem = itemType[0].value == "InvtPart";
                var totalquantityAvailable = 0;
                totalquantityAvailable = rec.getCurrentSublistValue({
                    sublistId: "item",
                    fieldId: "quantityavailable",
                });

                var isDropShip = rec.getValue({ fieldId: "custbody_dropship_order" });
                if (!isEmpty(itemText) && totalquantityAvailable <= 0 && (location == RICHMOND || location == SAVAGE) && !isDropShip && isInventoryItem) {
                    alert("Item: " + itemText + " does not have availability in Richmond nor Savage location.");

                    /* window.alert(
                         "Item " +
                         itemText +
                         " has no inventory available across all locations"
                     );*/
                } else if (!isEmpty(itemText) && location == SAVAGE && !isDropShip && isInventoryItem) {
                    // For savage location we must only check savage
                    // no need to check for richmond
                    //  window.alert( " savage_available_qty"+ savage_available_qty );
                    var inventoryitemSearchObj = search.create({
                        type: "inventoryitem",
                        filters:
                            [
                                ["type", "anyof", "InvtPart"],
                                "AND",
                                ["locationquantityavailable", "greaterthan", "0"],
                                "AND",
                                ["inventorylocation.name", "is", "Savage"],
                                "AND",
                                ["internalidnumber", "equalto", item]
                            ],
                        columns:
                            [
                                search.createColumn({
                                    name: "itemid",
                                    sort: search.Sort.ASC,
                                    label: "Name"
                                }),
                                search.createColumn({
                                    name: "name",
                                    join: "inventoryLocation",
                                    label: "Name"
                                }),
                                search.createColumn({ name: "locationquantityavailable", label: "Warehouse Available" })
                            ]
                    });
                    inventoryitemSearchObj.run().each(function (result) {
                        // .run().each has a limit of 4,000 results
                        savage_available_qty = result.getValue('locationquantityavailable');
                        return true;
                    });
                    if (savage_available_qty == 0) {
                        rec.setCurrentSublistValue({
                            sublistId: 'item',
                            fieldId: 'quantityavailable',
                            value: 0,
                            ignoreFieldChange: true
                        });

                        window.alert(
                            "Item " +
                            itemText +
                            " has no inventory available at Savage Location"
                        );
                    }
                }

                if (item && supercedeItem ) {
                   // debugger;
                    // var alreadyReplacedItem = supercedeItemLogic({ rec }, "get");
                    // if (!alreadyReplacedItem) supercedeItemLogic({ item, rec, supercedeItem, supercedeItemText, itemText }, "set");
                    supercedeItemLogic({ item, rec, supercedeItem, supercedeItemText, itemText }, "set");
                }


            }
        } catch (error) {
            console.log("Error in postSourcing", error.toString());
            log.error('error postSourcing', error)
        }
    }

    function validateLine(context) {
        try {
            if (context.currentRecord.type == "invoice" || context.currentRecord.type == "estimate" || context.currentRecord.type == 'returnauthorization') return true;
            var rec = context.currentRecord;
            var sublistId = context.sublistId;
            var fieldId = context.fieldId;
            var scriptObj = runtime.getCurrentScript();
           // debugger;
            if (sublistId == "item") {
                var itemText = rec.getCurrentSublistText({
                    sublistId: "item",
                    fieldId: "item",
                });
                var item = rec.getCurrentSublistValue({
                    sublistId: "item",
                    fieldId: "item",
                });
                var supercedeItemText = rec.getCurrentSublistText({
                    sublistId: "item",
                    fieldId: "custcol_acc_supercede_item",
                });
                var supercedeItem = rec.getCurrentSublistValue({
                    sublistId: "item",
                    fieldId: "custcol_acc_supercede_item",
                });

                var alreadySuperceded = rec.getCurrentSublistValue({
                    sublistId: "item",
                    fieldId: "custcol_sdb_item_already_superceded",
                });
                if (alreadySuperceded) return true;

                if (!isEmpty(supercedeItem)) {
                    var fieldLookUp = search.lookupFields({
                        type: search.Type.ITEM,
                        id: supercedeItem,
                        columns: ['itemid']
                    });
                    supercedeItemText = fieldLookUp.itemid;
                }

                var quantity = rec.getCurrentSublistValue({
                    sublistId: "item",
                    fieldId: "quantity",
                });

                var quantityAvailable = getItemAvailability(item);


                var scriptObj = runtime.getCurrentScript();
                //drop ship form
                var paramForm = scriptObj.getParameter({ name: 'custscript_sdb_form_drop_ship' });
                //actual form
                var actualForm = rec.getValue('customform');
                if (!isEmpty(supercedeItemText) && (quantity > quantityAvailable) && (actualForm != paramForm)) {
                    window.alert(
                        "Item " +
                        itemText +
                        " is superceded by " +
                        supercedeItemText +
                        ". Please replace the item."
                    );
                    return false;
                } else {
                    return true;
                }
            }
            else {
                return true;
            }
        } catch (error) {
            log.error("Error in validateLine", error.toString());
        }
    }

    function fieldChanged(context) {
        try {
            var field = context.fieldId;
          
            PopulateAdressFunction(context, true, context.currentRecord.type);
            // if (context.currentRecord.type != 'returnauthorization') PopulateAdressFunction(context, true);
            var currentRecord = context.currentRecord;
            if (field == "otherrefnum" && currentRecord.getValue("otherrefnum") != "") checkDuplicatePO(context);
            // ------------------------ Good Standing Functionality ------------------------ //
            if (field == "entity" && context.currentRecord.type == "salesorder") {
                try {
                    var goodStanding = hasGoodStanding(context.currentRecord);
                    if (!goodStanding) alert("This customer dont have permission to save order because it is not in good standing!");
                } catch (error) {
                    log.error("ERROR hasGoodStanding", error);
                }
            }

            // ------------------------ Good Standing Functionality ------------------------ //
        } catch (error) {
            log.error("ERROR fieldChanged: ", error)
        }
    }

    //added 25/01/2024

    function PopulateAdressFunction(context, isFieldChange, recordType) {
        if ((context.sublistId == null && (context.fieldId == 'shipaddress' || context.fieldId == 'entity' || context.fieldId == 'shipaddresslist' || context.fieldId == 'custrecord_ship_zone')) || !isFieldChange) AdressLogic(context, recordType);
    }

    function AdressLogic(context, recordType) {
        try {

            let currentRecord = context.currentRecord;
            var shippingMethod, warehouse;
            var warehoseFormAddress = getWarehouseFromAddress(currentRecord, 'shipaddresslist');
            if (warehoseFormAddress) {
                warehouse = warehoseFormAddress.warehouse;
                shippingMethod = warehoseFormAddress.shippingMethod;
            }
            // ShipMethod
            var currentShipMethod = currentRecord.getValue('shipmethod');
            if (shippingMethod && !currentShipMethod && recordType != "returnauthorization") currentRecord.setValue({ fieldId: 'shipmethod', value: Number(shippingMethod) });
            currentShipMethod = currentRecord.getValue('shipmethod');

            if (!warehouse) {

                var ObjectHouse = getWarehouseFromAddress(currentRecord, 'entity');
                var WarehouseCustomer = ObjectHouse.warehouse;
                var ShipMethodCustomer = ObjectHouse.shippingMethod;

                // Warehouse
                if (WarehouseCustomer) {
                   
                    currentRecord.setValue('location', WarehouseCustomer);
                    currentRecord.setValue('custbody_warehouse_roadnet', WarehouseCustomer);
                }

                // ShipMethod
                if (!currentShipMethod && recordType != "returnauthorization" && ShipMethodCustomer) currentRecord.setValue({ fieldId: 'shipmethod', value: Number(ShipMethodCustomer) });
            } else {

                // Warehouse
                currentRecord.setValue('location', warehouse);
                currentRecord.setValue('custbody_warehouse_roadnet', warehouse);
            }
        } catch (error) {
            log.error("ERROR AdressLogic", error);
        }
    }

    // ------------------------------------------------- AUXILIAR FUNCTIONS ------------------------------------------
    // Fuction tu Upload Fie to Suitelet Price CSV

    function getWarehouseFromAddress(currentRec, option) {
        try {
            var warehouse = false;
            var objectReturn;
            let customer = currentRec.getValue('entity');
            if (option == 'shipaddresslist') {
                let subRecord = currentRec.getSubrecord('shippingaddress');
                warehouse = subRecord.getValue('custrecord_ship_zone');
                var shippingMethod = subRecord.getValue('custrecord_sdb_shipping_method')
                if (!shippingMethod && customer) {
                    var fieldLookUp = search.lookupFields({
                        type: 'customer',
                        id: customer,
                        columns: ["shippingitem"]
                    });
                    if (fieldLookUp.shippingitem.length > 0) shippingMethod = fieldLookUp.shippingitem[0].value;
                }
                objectReturn = {
                    warehouse: warehouse,
                    shippingMethod: shippingMethod
                }

            } else if (option == 'entity') {
                if (customer) {
                    var customerSearchObj = search.create({
                        type: "customer",
                        filters:
                            [
                                ["internalid", "anyof", customer],
                                "AND",
                                ["isdefaultshipping", "is", "T"]
                            ],
                        columns:
                            [
                                search.createColumn({
                                    name: "custrecord_ship_zone",
                                    join: "shippingAddress",
                                    label: "Ship Zone"
                                }),
                                search.createColumn({ name: "custentity_warehouse", label: "Warehouse" })
                            ]
                    });
                    var shippingWarehouse;
                    var customerWarehouse;
                    customerSearchObj.run().each(function (result) {
                        shippingWarehouse = result.getValue({ name: "custrecord_ship_zone", join: "shippingAddress" })
                        customerWarehouse = result.getValue("custentity_warehouse")
                        return false;
                    });
                    objectReturn = {
                        warehouse: shippingWarehouse ?? customerWarehouse,
                        shippingMethod: shippingMethod
                    }
                }
            }
            return objectReturn;
        } catch (error) {
            log.error("getWarehouseFromAddress  ERROR", error);
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

    function isOrderAlreadyLocked(salesOrderId) {

        try {
            if (!salesOrderId) return false;
            log.audit('salesOrderId', salesOrderId);
            var customrecord_sdb_require_lockSearchObj = search.create({
                type: "customrecord_sdb_require_lock",
                filters:
                    [
                        ["custrecord_sdb_sales_order_locked", "anyof", salesOrderId]
                    ],
                columns:
                    [
                        search.createColumn({
                            name: "scriptid",
                            sort: search.Sort.ASC,
                            label: "Script ID"
                        })
                    ]
            });
            var searchResultCount = customrecord_sdb_require_lockSearchObj.runPaged().count;

            if (searchResultCount > 0) return true;
        } catch (e) {
            log.error('isOrderAlreadyLocked', e);
        }
        return false;
    }

    // Duplicate PO Number
    function checkDuplicatePO(context) {
        var currentRecord = context.currentRecord;
        var entity = currentRecord.getValue("entity");
        if (!entity) return;
        var requirePo = nlapiLookupField("customer", currentRecord.getValue("entity"), "custentity_po_flag", true);
        if (context.currentRecord.type == "invoice") {
            salesOrders = nlapiSearchRecord("invoice", null, [["entity", "is", entity], "AND", ["otherrefnum", "equalto", currentRecord.getValue("otherrefnum")]], null);
        } else {
            salesOrders = nlapiSearchRecord("salesorder", null, [["entity", "is", entity], "AND", ["otherrefnum", "equalto", currentRecord.getValue("otherrefnum")]], null);
        }

        if ((requirePo == "REQUIRED PO WITH DUPLICATE ALLOWED" || requirePo == "REQUIRED PO WITH NO DUPLICATE ALLOWED") && (salesOrders && salesOrders.length > 0)) {
            var confirm = window.confirm("This PO# Number is already in use, do you want to use anyway?");
            if (!confirm) {
                currentRecord.setValue("otherrefnum", "");
            }
        }
    }

    function supercedeItemLogic(itemInformation, type) {
        if (type == "get") {
            var { rec } = itemInformation;

            var itemId = rec.getCurrentSublistValue({
                sublistId: "item",
                fieldId: "item",
            });

            if (sessionStorage.getItem(itemId) != null) {
                var obj = JSON.parse(sessionStorage.getItem(itemId));

                if (obj.rule == 'Margin Markup') {
                    var margin = Number(obj.margin).toFixed(2);

                    var unitCost = Number(rec.getCurrentSublistValue({
                        sublistId: 'item',
                        fieldId: 'custcol_acc_unitcost',
                    }));

                    rec.setCurrentSublistValue({
                        sublistId: 'item',
                        fieldId: 'quantity',
                        value: obj.qty,
                        ignoreFieldChange: true
                    });

                    rec.setCurrentSublistValue({
                        sublistId: 'item',
                        fieldId: 'rate',
                        value: ((-100) * unitCost) / (margin - 100),
                        ignoreFieldChange: false
                    });

                    rec.setCurrentSublistValue({
                        sublistId: 'item',
                        fieldId: 'custcol_acme_markup_percent',
                        value: margin,
                        ignoreFieldChange: true
                    });

                    rec.setCurrentSublistValue({
                        sublistId: 'item',
                        fieldId: 'amount',
                        value: Number(obj.qty) * (((-100) * unitCost) / (margin - 100)),
                        ignoreFieldChange: false
                    });
                }
                else if (obj.rule == 'Fixed Price') {
                    rec.setCurrentSublistValue({
                        sublistId: 'item',
                        fieldId: 'quantity',
                        value: obj.qty,
                        ignoreFieldChange: true
                    });

                    rec.setCurrentSublistValue({
                        sublistId: 'item',
                        fieldId: 'rate',
                        value: obj.rate,
                        ignoreFieldChange: false
                    });

                    rec.setCurrentSublistValue({
                        sublistId: 'item',
                        fieldId: 'amount',
                        value: Number(obj.qty) * Number(obj.rate),
                        ignoreFieldChange: false
                    });

                    var unitCost = Number(rec.getCurrentSublistValue({
                        sublistId: 'item',
                        fieldId: 'custcol_acc_unitcost',
                    }));

                    rec.setCurrentSublistValue({
                        sublistId: 'item',
                        fieldId: 'custcol_acme_markup_percent',
                        value: (((Number(obj.rate) - unitCost) / Number(obj.rate)) * 100).toFixed(2),
                        ignoreFieldChange: false
                    });
                }

                rec.setCurrentSublistValue({
                    sublistId: 'item',
                    fieldId: 'custcol_sdb_item_already_superceded',
                    value: true,
                    ignoreFieldChange: false
                });

                sessionStorage.removeItem(itemId);

                return true;
            }

            return false;
        }//End get

        if (type == "set") {
            var { item, supercedeItemText, itemText, rec, supercedeItem } = itemInformation;

            //var quantityAvailable = getItemAvailability(item);

            //  if (isEmpty(supercedeItemText) || quantityAvailable != 0) return;

            var scriptObj = runtime.getCurrentScript();
            //drop ship form
            var paramForm = scriptObj.getParameter({ name: 'custscript_sdb_form_drop_ship' });
            //actual form
            var actualForm = rec.getValue('customform');
            if (actualForm != paramForm) {
                window.alert(`Item ${itemText} is superceded by ${supercedeItemText}. The item will update Automatically`);
                /*rec.setCurrentSublistText({
                    sublistId: "item",
                    fieldId: "item",
                    text:supercedeItemText,
                    ignoreFieldChange: true,
                    enableSourcing:true
                })*/
                var currentLine = rec.getCurrentSublistIndex({
                    sublistId: 'item',
                })
                 debugger;
                var actualWarehouse = rec.getValue('location');

                rec.setCurrentSublistValue({
                    sublistId: 'item',
                    fieldId: 'item',
                    value: supercedeItem,
                    ignoreFieldChange: false,
                    enableSourcing:true
                });

                rec.setCurrentSublistValue({
                    sublistId: 'item',
                    fieldId: 'quantity',
                    value: 1,
                    ignoreFieldChange: false,
                    enableSourcing:true
                });

                rec.setCurrentSublistValue({
                    sublistId: 'item',
                    fieldId: 'custcol_sdb_item_already_superceded',
                    value: false,
                    ignoreFieldChange: false,
                    enableSourcing:true
                });
                rec.commitLine({
                     sublistId: 'item'
                });
                
                rec.selectLine({
                    sublistId: 'item',
                    line: currentLine
                })

                return true;
            }

            // aca
            var pricingLookup = search.lookupFields({
                type: search.Type.ITEM,
                id: item,
                columns: ['custitem_acc_supercede']
            });

            var pricingRule = pricingLookup.custitem_acc_supercede[0]?.text;
            if (!pricingRule) pricingRule = "No Change";

            var qty = Number(rec.getCurrentSublistText({
                sublistId: "item",
                fieldId: "quantity",
            }));

            if (pricingRule == "Margin Markup") {

                var margin = Number(rec.getCurrentSublistText({
                    sublistId: "item",
                    fieldId: "custcol_acme_markup_percent",
                }));

                sessionStorage.setItem(supercedeItem, `{"margin": ${margin}, "qty": ${qty}, "rule": "Margin Markup", "replacedFrom": ${item}}`);
            }
            else if (pricingRule == "Fixed Price") {
                var rate = Number(rec.getCurrentSublistText({
                    sublistId: "item",
                    fieldId: "rate",
                }));

                sessionStorage.setItem(supercedeItem, `{"rate": ${rate}, "qty": ${qty}, "rule": "Fixed Price", "replacedFrom": ${item}}`);
            }
            else {
                sessionStorage.setItem(supercedeItem, `{"rule": "No Change"}`);
            }


        }//End set

    }//End supercede logic

    //Populate Warehouse Functionality SDB
    function populateWarehouseFunctionality(context) {
        try {

            var salesRecord = context.currentRecord;
            if (!salesRecord) return;

            var actualLocation = salesRecord.getValue("location");
            if (!actualLocation) return;

            var itemId = salesRecord.getCurrentSublistValue({
                sublistId: 'item',
                fieldId: 'item'
            })

            var itemName = salesRecord.getCurrentSublistValue({
                sublistId: 'item',
                fieldId: 'item_display'
            });

            if (!itemId) return;
            if(actualLocation != SAVAGE && actualLocation != RICHMOND){// Add 4/4/24
                salesRecord.setCurrentSublistValue({
                    sublistId: 'item',
                    fieldId: 'location',
                    value: actualLocation,
                    ignoreFieldChange: false,
                    enableSourcing: true
                });
            }
            //Bring all line items with available quantity gratear than 0 for each Warehouse
            var itemInfo = getLocationsAvailablePerItem(itemId);
            if (!itemInfo) return;

            //If warehouse at header line is SAVAGE
            if (actualLocation == SAVAGE) {
                //Set location in item line
                salesRecord.selectLine({ sublistId: 'item', line: context.line });

                salesRecord.setCurrentSublistValue({
                    sublistId: 'item',
                    fieldId: 'location',
                    value: SAVAGE,
                    ignoreFieldChange: false,
                    enableSourcing: true
                });

                // var locations = itemInfo[itemId]?.locations || [];

                // if (!locations.length) {
                //     var locationFound = locations.find(element => (Number(element.location) == Number(actualLocation)) && (Number(element.quantity) - Number(1) >= 0));
                //     if (!locationFound) {
                //         // Set available quantity at that location
                //         salesRecord.setCurrentSublistValue({
                //             sublistId: 'item',
                //             fieldId: 'custcol_sdb_qty_available',
                //             value: locationFound.quantity,
                //             ignoreFieldChange: true
                //         });
                //     }
                //     else {
                //         // Set available quantity at that location
                //         salesRecord.setCurrentSublistValue({
                //             sublistId: 'item',
                //             fieldId: 'custcol_sdb_qty_available',
                //             value: 0,
                //             ignoreFieldChange: true
                //         });
                //     }
                // }

                // salesRecord.commitLine("item");
            }
            //If warehouse at header line is RICHMOND
            else if (actualLocation == RICHMOND) {
                //This step will set location in each line item to the primary location in the sales order only if it has (quantity available - qtyline item) greater than 0

                //Get locations for this item
                var locationToSet;
                var locations = itemInfo[itemId]?.locations || [];
                if (!locations.length) {
                    locationToSet = SAVAGE;
                }
                else {
                    var locationFound = locations.find(element => (Number(element.location) == Number(actualLocation)) && (Number(element.quantity) - Number(1) >= 0));

                    //If location is not equal to location in sales order then we are going to look for another location
                    if (!locationFound || locationFound == -1) {
                        //If we dont have location available at the primary location we are going to look for richmond
                        var savageLocation = locations.find(element => (Number(element.location) == SAVAGE) && (Number(element.quantity) - Number(1) >= 0));
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

                //Set location in item line
                salesRecord.selectLine({ sublistId: 'item', line: context.line });

                salesRecord.setCurrentSublistValue({
                    sublistId: 'item',
                    fieldId: 'location',
                    value: locationToSet,
                    ignoreFieldChange: false,
                    enableSourcing: true
                });
            }

        }
        catch (error) {
            log.error('error', error);
        }
    }

    function setAllLinesLocation(context) {
        try {

            var salesRecord = context.currentRecord;
            if (!salesRecord) return;

            var customerId = salesRecord.getValue("entity");
            if (!customerId) return;

            var locationCustomer = search.lookupFields({
                type: search.Type.CUSTOMER,
                id: customerId,
                columns: "custentity_warehouse"
            })?.custentity_warehouse[0]?.value;

            var actualLocation = locationCustomer;

            //  if (!actualLocation || Number(actualLocation) != RICHMOND && Number(actualLocation) != SAVAGE) return;

            var lineItemCount = salesRecord.getLineCount("item");
            if (lineItemCount < 1) return;

            for (var i = 0; i < lineItemCount; i++) { // Add 4/4/24
                var itemId = salesRecord.getSublistValue({
                    sublistId: 'item',
                    fieldId: 'item',
                    line: i
                });
                if (!itemId) continue;

                //Bring all line items with available quantity gratear than 0 for each Warehouse
                if(actualLocation != SAVAGE && actualLocation != RICHMOND){
                    salesRecord.setCurrentSublistValue({
                        sublistId: 'item',
                        fieldId: 'location',
                        value: actualLocation,
                        ignoreFieldChange: true
                    });
                }
                var itemInfo = getLocationsAvailablePerItem(itemId);
                if (!itemInfo) continue;

                //If warehouse at header line is SAVAGE
                if (actualLocation == SAVAGE) {
                    //Set location in item line
                    salesRecord.selectLine({ sublistId: 'item', line: i });

                    salesRecord.setCurrentSublistValue({
                        sublistId: 'item',
                        fieldId: 'location',
                        value: SAVAGE,
                        ignoreFieldChange: false,
                        enableSourcing: true
                    });

                    var locations = itemInfo[itemId]?.locations || [];

                    if (locations.length) {
                        var locationFound = locations.find(element => (Number(element.location) == Number(actualLocation)) && (Number(element.quantity) - Number(1) >= 0));
                        if (locationFound) {
                            // Set available quantity at that location
                            salesRecord.setCurrentSublistValue({
                                sublistId: 'item',
                                fieldId: 'quantityavailable',
                                value: locationFound.quantity,
                                ignoreFieldChange: false,
                                enableSourcing: true
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
                    var locations = itemInfo[itemId]?.locations || [];
                    if (!locations.length) {
                        locationToSet = SAVAGE;
                    }
                    else {
                        var locationFound = locations.find(element => (Number(element.location) == Number(actualLocation)) && (Number(element.quantity) - Number(1) >= 0));

                        //If location is not equal to location in sales order then we are going to look for another location
                        if (!locationFound || locationFound == -1) {
                            //If we dont have location available at the primary location we are going to look for richmond
                            var savageLocation = locations.find(element => (Number(element.location) == SAVAGE) && (Number(element.quantity) - Number(1) >= 0));
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

                    //Set location in item line
                    salesRecord.selectLine({ sublistId: 'item', line: i });

                    salesRecord.setCurrentSublistValue({
                        sublistId: 'item',
                        fieldId: 'location',
                        value: Number(locationToSet),
                        ignoreFieldChange: false,
                        enableSourcing: true
                    });

                    salesRecord.commitLine("item");
                }
            }//End for
        }
        catch (error) {
            log.error('error', error);
        }

    }//End setAllLinesLocation

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

    }//End setLocationAvailable

    function isEmpty(stValue) {
        if (stValue == "" || stValue == null || stValue == undefined) {
            return true;
        } else {
            if (stValue instanceof String) {
                if (stValue == "") {
                    return true;
                }
            } else if (stValue instanceof Array) {
                if (stValue.length == 0) {
                    return true;
                }
            }
            return false;
        }
    }

    function getItemAvailability(itemId) {
        var available_qty = 0
        var inventoryitemSearchObj = search.create({
            type: "inventoryitem",
            filters:
                [

                    ["locationquantityavailable", "notlessthan", "1"],
                    "AND",
                    //   ["internalid","anyof",itemId]
                    ["internalidnumber", "equalto", itemId]
                ],
            columns:
                [
                    search.createColumn({ name: "internalid", label: "Internal ID" }),
                    search.createColumn({ name: "itemid", label: "Name" }),
                    search.createColumn({ name: "displayname", label: "Display Name" }),
                    search.createColumn({
                        name: "locationquantityavailable",
                        sort: search.Sort.DESC,
                        label: "Warehouse Available"
                    }),
                    search.createColumn({ name: "inventorylocation", label: "Inventory Warehouse" })
                ]
        });
        inventoryitemSearchObj.run().each(function (result) {
            // .run().each has a limit of 4,000 results
            available_qty = result.getValue('locationquantityavailable')
            return false;
        });

        return available_qty;

    }

    function disableUOMFieldsByRole(context) {
        if (context.currentRecord.type != "salesorder") return true;

        var salesRecord = context.currentRecord;
        if (!salesRecord) return true;

        // var itemCount = salesRecord.getLineCount("item");
        // if (itemCount < 1) return true;

        var itemSublist = salesRecord.getSublist("item");
        if (!itemSublist) return true;

        // if (!arrayRolesList.length) return true;

        // Filter section

        var currentRoleId = runtime.getCurrentUser().role;
        var roleLabel = search.lookupFields({
            type: search.Type.ROLE,
            id: currentRoleId,
            columns: 'name'
        })?.name;

        // if (!arrayRolesList.includes(roleLabel)) return true;


        if (roleLabel == 'Administrator') return true;
        // End Filter section

        var unitsColumn = itemSublist.getColumn("units");
        if (!unitsColumn) return true;

        unitsColumn.isDisabled = true;
    }

    // lock record
    function triggerLockRecord(salesOrderId) {
        // if order is not already to be locked
        if (!isOrderAlreadyLocked(salesOrderId)) {
            var lockCustomRecord = record.create({
                type: 'customrecord_sdb_require_lock',
                isDynamic: false,
            });

            lockCustomRecord.setValue('custrecord_sdb_sales_order_locked', salesOrderId);
            var lockCustomRecordId = lockCustomRecord.save();
        }
    }

    function deleteCustomLockRecord(myCurrentRecordId) {
        //Shows an alert for users when they are expending too much time inside an order
        setTimeout(function () {
            alert('WARNING!. You will lose any changes that were not saved.you will lose any changes that were not saved.')
        }, 1800000);

        window.onbeforeunload = function () {
            https.get.promise({ url: `https://5774630.extforms.netsuite.com/app/site/hosting/scriptlet.nl?script=customscript_sdb_del_lock_custom_record&deploy=customdeploy_sdb_del_lock_custom_record&compid=5774630&h=706670a560b2a1404e0c&salesOrderId=${myCurrentRecordId}` });
            wait(2000);
            return null;
        }
    }

    // ------------------------ Good Standing Functionality ------------------------ //
    function saveRecord(context) {
        try {
            var currentRecord = context.currentRecord;
            if (!currentRecord) return true;
            var goodStanding = hasGoodStanding(currentRecord);
            if (!goodStanding) {
                alert("This customer dont have permission to save order because it is not in good standing!");
                return false;
            }
            return true;
        } catch (error) {
            log.error("ERROR saveRecord", error);
        }
    }

    function hasGoodStanding(currentRecord) {
        try {
            if (currentRecord.type != "salesorder") return true;
            var customer = currentRecord.getValue("entity");
            if (!customer) return true;
            var customerFields = search.lookupFields({
                type: "customer",
                id: customer,
                columns: ['custentity_credit_codech']
            });
           // console.log("hasGoodStanding", { customer, customerFields });
            return customerFields.custentity_credit_codech == false ? false : true;
        } catch (error) {
            return true;
        }

    }
    // ------------------------ Good Standing Functionality ------------------------ //

    return {
        pageInit: pageInit,
        validateLine: validateLine,
        postSourcing: postSourcing,
        fieldChanged: fieldChanged,
        saveRecord: saveRecord
    };
});

