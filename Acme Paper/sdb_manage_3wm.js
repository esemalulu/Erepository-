/**
 *@NApiVersion 2.1
 *@NScriptType UserEventScript
 */
define(["N/log", "N/search", "N/record", "N/email", "N/ui/message"], function (log, search, record, email, message) {

    function beforeLoad(context) {
        try {
            var bill = context.newRecord;
            var qtyError = bill.getValue('custbody_sdb_3wm_qty_error');
            var amountError = bill.getValue('custbody_sdb_3wm_cost_error');

            if (qtyError || amountError) errorAlert(context);


            if (context.type !== context.UserEventType.CREATE) return;
            var parameters = context.request.parameters;
            var transform = parameters.transform;
            var id = parameters.id;
            if (transform) context.newRecord.setValue("custbody_sdb_po_id", id);
        } catch (e) {
            log.error("ERROR:", e);
        }
    }

    function errorAlert(context) {
        context.form.addPageInitMessage({ type: message.Type.WARNING, message: 'This bill has a discrepancy with the quantity or cost', duration: 1000000 });
    }

    function beforeSubmit(context) {
        try {
            if (context.type == context.UserEventType.DELETE) return;
            var currentRecord = context.newRecord;
            var errorCost = validateCost(currentRecord, context);
            var errorQty = validateQuantity(currentRecord, context);
            // if (errorCost || errorQty) return updatePO(currentRecord, context);
            var currentStatus = currentRecord.getValue('approvalstatus')
            if (errorCost || errorQty) return currentRecord.setValue('approvalstatus', '1');
            if (currentStatus == '1') return currentRecord.setValue('approvalstatus', '2'); //Approve Bill
        } catch (e) {
            log.error("ERROR:", e);
        }
    }

    function afterSubmit(context) {
        try {
            var currentRecord = context.newRecord;
            var rec = record.load({
                type: record.Type.VENDOR_BILL,
                id: currentRecord.id
            });
            var billNumber = rec.getValue('tranid')
            var isCostIssue = rec.getValue('custbody_sdb_3wm_cost_error')
            var isQuantityIssue = rec.getValue('custbody_sdb_3wm_qty_error')
            if (isCostIssue || isQuantityIssue) {
                var poId = getPoId(context);
                if (poId) sendEmailToBuyer(rec, isCostIssue, poId, billNumber)
            }
            if (context.type == context.UserEventType.DELETE || context.type == context.UserEventType.CREATE) return;
            var hasChanges = setRejectionDate(rec);
            if (hasChanges) rec.save({ enableSourcing: false, ignoreMandatoryFields: true });

        } catch (e) {
            log.error("ERROR:", e);
        }
    }
    // ---------------- validateCost ---------------- //
    function validateCost(newContext, context) {
        var poId = getPoId(context);
        var billId = isNaN(Number(newContext.id)) ? -1 : newContext.id;
        log.debug("Data Entry", { poId, billId });
        if (!poId) return false;
        var totalAmount = getTotalAmount(poId, billId);
        totalAmount = Number(totalAmount) + Number(newContext.getValue("total"));
        totalAmount = Number(totalAmount.toFixed(2));
        var poAmount = getPoAmount(poId);
        var hasMoreCost = totalAmount > poAmount;
        log.debug("Data to Compare", { totalAmount, poAmount, hasMoreCost, billAmount: Number(newContext.getValue("total")) });
        hasMoreCost ? newContext.setValue("custbody_sdb_3wm_cost_error", true) : newContext.setValue("custbody_sdb_3wm_cost_error", false);


        return hasMoreCost;
    }

    function getTotalAmount(poId, billId) {
        if (!poId) return 0;
        var totalAmount = 0;
        var transactionSearchObj = search.create({
            type: "transaction",
            filters:
                [
                    ["internalid", "anyof", String(poId)],
                    "AND",
                    ["billingtransaction", "noneof", "@NONE@", String(billId)],
                    "AND",
                    ["billingtransaction.status", "noneof", "VendBill:C", "VendBill:E"]
                ],
            columns:
                [
                    // search.createColumn({
                    //     name: "total",
                    //     join: "billingTransaction",
                    //     summary: "SUM",
                    //     sort: search.Sort.ASC,
                    //     label: "Amount"
                    // })
                    search.createColumn({
                        name: "amount",
                        summary: "SUM",
                        label: "Amount"
                    }),
                    search.createColumn({
                        name: "amount",
                        join: "billingTransaction",
                        summary: "SUM",
                        label: "Amount"
                    })
                ]
        });
        transactionSearchObj.run().each(function (result) {

            // totalAmount = result.getValue({
            //     name: "amount",
            //     summary: "SUM"
            // });

            totalAmount = Math.abs(Number(result.getValue({
                name: "amount",
                join: "billingTransaction",
                summary: "SUM"
            })));
            return false;
        });
        return Number(totalAmount) ?? 0;
    }

    function getPoAmount(poId) {
        if (!poId) return 0;
        var total = search.lookupFields({
            type: record.Type.PURCHASE_ORDER,
            id: poId,
            columns: ["total"]
        });
        return total && total.total ? Number(total.total) : 0;
    }
    // ---------------- END validateCost ---------------- //

    // ---------------- validateQuantity ---------------- //
    function validateQuantity(newContext, context) {
        var poId = getPoId(context);
        var billId = isNaN(Number(newContext.id)) ? -1 : newContext.id;
        log.debug("Data Entry", { poId, billId });
        if (!poId) return false;
        var billItemsIds = getBillItemsIds(newContext, billId);
        var itemInfoPO = getItemInfoPO(billItemsIds.arrId, poId);
        var hasMoreQty = false;
        var hasLessQty = false;
        billItemsIds.itemInfo.forEach(function (item) {
            var poInfo = itemInfoPO.find(function (poItem) {
                return item.id == poItem.id;
            });
            if (item.qty < poInfo.qty) hasLessQty = true;
            if (!poInfo) return;
            if (item.qty > poInfo.qty) hasMoreQty = true;
        });
        log.debug("Data to Compare", { billItemsIds, itemInfoPO, hasMoreQty });
        hasMoreQty ? newContext.setValue("custbody_sdb_3wm_qty_error", true) : newContext.setValue("custbody_sdb_3wm_qty_error", false);


        return hasMoreQty;
    }

    function getBillItemsIds(context, billId) {
        var count = context.getLineCount('item');
        var arrItems = {
            arrId: [],
            itemInfo: []
        };
        var otherBillItems = getOtherBillItems(context, billId);
        log.debug('otherBillItems', otherBillItems);
        for (var line = 0; line < count; line++) {
            var id = context.getSublistValue({
                sublistId: 'item',
                fieldId: 'item',
                line: line,
            });
            var qty = context.getSublistValue({
                sublistId: 'item',
                fieldId: 'quantity',
                line: line,
            });
            var otherBillQty = otherBillItems[id];
            if (otherBillQty) qty += otherBillQty;

            var itemAlready = arrItems.itemInfo.find(function (item) {
                return item.id == id;
            });

            if (itemAlready) itemAlready.qty += qty; else {
                arrItems.arrId.push(id);
                arrItems.itemInfo.push({ id, qty });
            }
        }
        return arrItems;
    }

    function getOtherBillItems(context, billId) {
        var objToReturn = {};
        var filters = [["type", "anyof", "VendBill"], "AND", ["custbody_sdb_po_id", "is", context.getValue("custbody_sdb_po_id")]];

        if (billId) filters.push("AND", ["internalid", "noneof", billId]);
        var vendorbillSearchObj = search.create({
            type: "vendorbill",
            filters: filters,
            columns:
                [
                    search.createColumn({
                        name: "item",
                        summary: "GROUP",
                        label: "Item"
                    }),
                    search.createColumn({
                        name: "quantity",
                        summary: "SUM",
                        label: "Quantity"
                    })
                ]
        });
        vendorbillSearchObj.run().each(function (result) {
            result = JSON.parse(JSON.stringify(result));
            var itemId = result.values["GROUP(item)"][0].value;
            var itemQty = result.values["SUM(quantity)"];
            if (itemId) objToReturn[itemId] = Math.abs(Number(itemQty));
            return true;
        });
        return objToReturn;
    }

    function getItemInfoPO(billItems, poId) {
        try {
            var itemInfo = [];
            var transactionSearchObj = search.create({
                type: "transaction",
                filters:
                    [
                        ["internalid", "anyof", poId],
                        "AND",
                        ["quantity", "isnotempty", ""],
                        "AND",
                        ["item", "anyof", billItems]
                    ],
                columns:
                    [
                        search.createColumn({ name: "quantity", label: "Quantity" }),
                        search.createColumn({ name: "item", label: "Item" }),
                        search.createColumn({ name: "quantityshiprecv", label: "Quantity Fulfilled/Received" })
                    ]
            });
            transactionSearchObj.run().each(function (result) {
                var qty = Math.abs(Number(result.getValue("quantityshiprecv")));
                if (!qty) qty = Math.abs(Number(result.getValue("quantity")));

                var itemAlready = itemInfo.find(function (item) {
                    return item.id == result.getValue("item");
                });

                if (itemAlready) itemAlready.qty += qty; else {
                    itemInfo.push({
                        id: result.getValue("item"),
                        qty: qty
                    });
                }
                return true;
            });
            return itemInfo;
        } catch (error) {
            log.debug('getItemInfoPO error', error)
        }

    }
    // ---------------- END validateQuantity ---------------- //

    function getPoId(context) {
        var poId = context.newRecord.getValue("custbody_sdb_po_id");
        if (poId) return poId;

        return context.newRecord.getSublistValue({
            sublistId: 'purchaseorders',
            fieldId: 'id',
            line: 0
        });
    }

    function setRejectionDate(context) {
        var currentStatus = context.getValue("status");
        var rejectDate = context.getValue("custbody_sdb_rejection_date");
        log.debug("Data Rejection Date", { currentStatus, rejectDate });
        if (!rejectDate && currentStatus == "Rejected") context.setValue("custbody_sdb_rejection_date", new Date());
        return !rejectDate && currentStatus == "Rejected";
    }

    function getItemsBill(context) {
        var count = context.getLineCount('item');
        var arrItems = [];
        for (var line = 0; line < count; line++) {
            var id = context.getSublistValue({
                sublistId: 'item',
                fieldId: 'item',
                line: line,
            });
            var qty = context.getSublistValue({
                sublistId: 'item',
                fieldId: 'quantity',
                line: line,
            });
            var amount = context.getSublistValue({
                sublistId: 'item',
                fieldId: 'amount',
                line: line,
            });
            arrItems.push({ id, qty, amount });
        }
        return arrItems;
    }

    function updatePO(newContext, context) {
        var poId = getPoId(context);
        if (!poId) return;
        var itemsBill = getItemsBill(newContext);
        log.debug("Data Entry updatePO", { poId, itemsBill });
        var poRecord = record.load({
            type: record.Type.PURCHASE_ORDER,
            id: poId,
            isDynamic: true
        });
        var hasChanges = false;
        itemsBill.forEach(function (billItem) {
            var item_line = poRecord.findSublistLineWithValue({
                sublistId: 'item',
                fieldId: 'item',
                value: billItem.id
            });
            var poAmount = poRecord.getSublistValue({
                sublistId: "item",
                fieldId: "amount",
                line: item_line
            });
            var poQty = poRecord.getSublistValue({
                sublistId: "item",
                fieldId: "quantity",
                line: item_line
            });
            log.debug("Data to Compare updatePO", { poId, billItem, poItem: { poAmount, poQty } });
            if (poAmount != billItem.amount || poQty != billItem.qty) {
                try {
                    poRecord.selectLine({ sublistId: 'item', line: item_line });
                    poRecord.setCurrentSublistValue({
                        sublistId: 'item',
                        fieldId: 'amount',
                        value: billItem.amount,
                        ignoreFieldChange: true
                    });
                    poRecord.setCurrentSublistValue({
                        sublistId: 'item',
                        fieldId: 'quantity',
                        value: billItem.qty,
                        ignoreFieldChange: true
                    });
                    poRecord.commitLine("item");
                    hasChanges = true;
                } catch (error) {
                    log.error("ERROR Setting Lines", error);
                }
            }
        });
        log.debug("Data End updatePO", { poId, hasChanges });
        if (hasChanges) poRecord.save({ enableSourcing: false, ignoreMandatoryFields: true });
    }

    function sendEmailToBuyer(newRecord, isCostIssue, poId, billNumber) {
        try {
            var poLookupField = search.lookupFields({
                type: record.Type.PURCHASE_ORDER,
                id: poId,
                columns: ['tranid', 'custbody_dropship_order']
            })
            var dropShipPo = poLookupField?.custbody_dropship_order;
            if (dropShipPo) return;
            var poNumber = poLookupField?.tranid
            var userId = 96988; // No Reply
            var billNumber = newRecord.getValue("transactionnumber");
            var buyerEmail = newRecord.getValue("custbody_acc_buyer");
            var body = isCostIssue ? "Discrepancy with the cost between Bill: " + billNumber + ' and ' + 'Purchase Order ' + poNumber : "Discrepancy with the quantity between Bill: " + billNumber + ' and ' + 'Purchase Order ' + poNumber
            log.audit("Data Send Email", { userId, buyerEmail, body });
            if (buyerEmail) {
                email.send({
                    author: userId,
                    body: body,
                    recipients: buyerEmail,
                    subject: "Discrepancy in the PO id " + poId
                });
            }
            // newRecord.setValue('custbody_sdb_send_email_3wm', true)
            // newRecord.save({ enableSourcing: false, ignoreMandatoryFields: true });
        } catch (error) {
            log.error("ERROR sending email", error);
        }
    }

    function alreadySendEmail(poId) {
        try {
            if (!poId) return false;
            var purchaseorderSearchObj = search.create({
                type: "purchaseorder",
                filters:
                    [
                        ["type", "anyof", "PurchOrd"],
                        "AND",
                        ["internalid", "anyof", poId],
                        "AND",
                        ["billingtransaction.custbody_sdb_send_email_3wm", "is", "T"]
                    ],
                columns:
                    [
                        search.createColumn({
                            name: "internalid",
                            join: "billingTransaction"
                        })
                    ]
            });
            var searchResultCount = purchaseorderSearchObj.runPaged().count;
            return searchResultCount >= 1;
        } catch (error) {
            log.debug('alreadySendEmail ERROR:', error)
        }
    }

    return {
        beforeSubmit: beforeSubmit,
        beforeLoad: beforeLoad,
        afterSubmit: afterSubmit
    }
});
