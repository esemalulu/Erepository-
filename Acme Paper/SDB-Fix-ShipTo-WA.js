/**
 *@NApiVersion 2.1
 *@NScriptType WorkflowActionScript
 */
define(["N/search", "N/record", "N/runtime"], function (search, record, runtime) {
    function onAction(context) {
        try {
            var userObj = runtime.getCurrentUser();
            if (userObj.id == 75190) return;//2 High Jump id

            var recordType = context.newRecord.type
            recordType == record.Type.SALES_ORDER ? salesOrderFunction(context) : invoiceOrderFunction(context)
        } catch (error) {
            log.error("Error at onAction", error);
        }
    }

    return {
        onAction: onAction
    }

    function invoiceOrderFunction(context) {
        try {
            var invoiceOrder = record.load({ type: context.newRecord.type, id: context.newRecord.id });
            var address = invoiceOrder.getValue("shipaddress");
            var customShipTo = invoiceOrder.getValue("shipaddresslist");
            var defaultAddress = -1;
            if (address && (customShipTo == '-2' || !customShipTo)) {
                defaultAddress = getCustomerDefaultAddress(invoiceOrder.getValue("entity"), address);
                log.audit("defaultAddress: ", { defaultAddress, order: context.newRecord.id })
                if (defaultAddress != 0) {
                    invoiceOrder.setValue("shipaddresslist", defaultAddress);
                    invoiceOrder.setValue("custbody_sdb_is_ship_to_select_custom", false);
                } else {
                    invoiceOrder.setValue("custbody_sdb_address_not_match", true);
                }
            };
            var orderId = invoiceOrder.getValue("createdfrom");
            try {
                invoiceOrder.save({ ignoreMandatoryFields: true });
            } catch (e) {
                log.error("Error trying to save invoice", e)
            }
            if (defaultAddress != -1) {

                record.submitFields({
                    type: record.Type.SALES_ORDER,
                    id: orderId,
                    values: {
                        "shipaddresslist": defaultAddress,
                    },
                    options: {
                        ignoreMandatoryFields: true,
                        enablesourcing: true
                    }
                })
            }
        } catch (error) {
            log.error("Error at invoiceOrderFunction", error)
        }
    }

    function salesOrderFunction(context) {
        try {
            var salesOrder = context.newRecord;
            var address = salesOrder.getValue("shipaddress");
            var customShipTo = salesOrder.getValue("shipaddresslist");
            var defaultAddress = -1;
            log.debug("INIT INFO: ", { address, customShipTo, order: context.newRecord.id })
            if (address && (customShipTo == '-2' || !customShipTo)) {
                defaultAddress = getCustomerDefaultAddress(salesOrder.getValue("entity"), address);
                log.audit("defaultAddress: ", { defaultAddress, order: context.newRecord.id })
                if (defaultAddress != 0) {
                    salesOrder.setValue("shipaddresslist", defaultAddress);
                    salesOrder.setValue("custbody_sdb_is_ship_to_select_custom", false);
                } else {
                    salesOrder.setValue("custbody_sdb_address_not_match", true);
                }
            };
        } catch (error) {
            log.error("Error at SalesOrderFunction", error)
        }
    }


    function getCustomerDefaultAddress(customerRecordId, address) {
        try {
            var sublistId = 'addressbook';
            var customerRecord = record.load({ type: "customer", id: customerRecordId });

            var addressReturn = 0;
            var arrayFinal = [];
            var lines = customerRecord.getLineCount("addressbook");
            var array = [];
            for (var i = 0; i < lines; i++) {
                var sub = customerRecord.getSublistSubrecord({
                    sublistId: sublistId,
                    fieldId: 'addressbookaddress',
                    line: i
                });
                //custrecord_address_shiplist_no
                //custrecord_acc_omnitracs_location_id
                /// the ones with the both are the best
                if (sub.getValue("addrtext").replace(/[^a-zA-Z0-9]/g, '').trim().toUpperCase() == address.replace(/[^a-zA-Z0-9]/g, '').trim().toUpperCase()) {
                    addressReturn = customerRecord.getSublistValue({
                        sublistId: sublistId,
                        fieldId: 'addressid',
                        line: i
                    });
                    log.audit("ADDRESS INFO:  ", { index: i, addressReturn });

                    if (sub.getValue("custrecord_address_shiplist_no") && sub.getValue("custrecord_acc_omnitracs_location_id")) {
                        array.push({ sort: 3, address: addressReturn })
                    } else if (!sub.getValue("custrecord_address_shiplist_no") && sub.getValue("custrecord_acc_omnitracs_location_id")) {
                        array.push({ sort: 2, address: addressReturn })
                    } else {
                        array.push({ sort: 1, address: addressReturn })
                    }

                }
            }
            arrayFinal = array.sort(function (a, b) {
                if (a.sort < b.sort) {
                    return -1;
                }
                if (a.sort > b.sort) {
                    return 1;
                }
                return 0;
            })
            if (arrayFinal.length) {
                return arrayFinal[0].address
            } else {
                return 0;
            }
        } catch (e) {
            log.error("getCustomerDefaultAddress Error: ", e);
            return 0;
        }

    }

});
