/**
 *@NApiVersion 2.1
 *@NScriptType UserEventScript
 */
define(['N/log', 'N/render', 'N/runtime', 'N/search', 'N/record'], function (log, render, runtime, search, record) {


    function beforeSubmit(context) {
        try {
            if (context.type == context.UserEventType.CREATE) return

            var newRec = context.newRecord;
            log.debug('context.type: beforeSubmit', context.type);
            if (context.type == context.UserEventType.DELETE && newRec.id) {
                deleteInvAdjustement(newRec.id);
                return;
            }
            var status = newRec.getValue('status');
            log.debug('status before', status);
            if (status == "Voided") deleteInvAdjustement(newRec.id);
        } catch (error) {
            log.error('beforeSubmit', error);
        }

    }

    function afterSubmit(context) {
        try {

            if (context.type != context.UserEventType.CREATE) return;
            var thisRecord = context.newRecord;
            var lineCount = thisRecord.getLineCount({
                sublistId: 'item'
            });
            var createdfrom = thisRecord.getValue('createdfrom');
            var validateCreatedFrom = false;
            if (createdfrom) validateCreatedFrom = getCreatedFrom(createdfrom);
            log.debug('validateCreatedFrom: ', validateCreatedFrom);
            if (createdfrom && validateCreatedFrom) return;
            var customer = thisRecord.getValue('entity');
            var location = thisRecord.getValue('location');
            var subsidiary = thisRecord.getValue('subsidiary');
            log.debug('TOTAL ITEMS: ', lineCount);
            var arrItems = [];
            for (let i = 0; i < lineCount; i++) {
                var itemId = thisRecord.getSublistValue({
                    sublistId: 'item',
                    fieldId: 'item',
                    line: i
                })
                var qty = thisRecord.getSublistValue({
                    sublistId: 'item',
                    fieldId: 'quantity',
                    line: i
                })
                var warehouse = thisRecord.getSublistValue({
                    sublistId: 'item',
                    fieldId: 'location',
                    line: i
                })

                var cost = thisRecord.getSublistValue({
                    sublistId: 'item',
                    fieldId: 'costestimaterate',
                    line: i
                })
                var itemtype = thisRecord.getSublistValue({
                    sublistId: 'item',
                    fieldId: 'itemtype',
                    line: i
                })
                if (itemtype == 'InvtPart') {
                    arrItems.push({
                        item: itemId,
                        qty: qty,
                        warehouse: warehouse,
                        cost: cost
                    })
                }
            }
            log.debug('arrItems: ', arrItems);

            if (arrItems.length > 0) {
                createInventoryAdjustment(arrItems, thisRecord.id, customer, location, subsidiary)
            }
        } catch (error) {
            log.error('Error at afterSubmit', error)
        }
    }

    function createInventoryAdjustment(adjustmentsArray, cm, customer, location, subsidiary) {
        try {
            var scriptObj = runtime.getCurrentScript();

            var account = scriptObj.getParameter({
                name: "custscript_sdb_account",
            });
            var invAdjRec = record.create({
                type: record.Type.INVENTORY_ADJUSTMENT,
                isDynamic: true
            });


            invAdjRec.setValue({
                fieldId: 'subsidiary',
                value: subsidiary || 2
            });
            invAdjRec.setValue({
                fieldId: 'entity',
                value: customer
            });
            invAdjRec.setValue({
                fieldId: 'adjlocation',
                value: location
            });
            invAdjRec.setValue({
                fieldId: 'account',
                value: account
            });
            invAdjRec.setValue({
                fieldId: 'custbody_sdb_cm_associated',
                value: cm
            });
            adjustmentsArray.forEach(function (adjustment) {
                invAdjRec.selectNewLine({ sublistId: 'inventory' });

                invAdjRec.setCurrentSublistValue({
                    sublistId: 'inventory',
                    fieldId: 'item',
                    value: adjustment.item
                });

                invAdjRec.setCurrentSublistValue({
                    sublistId: 'inventory',
                    fieldId: 'location',
                    value: adjustment.warehouse
                });

                var qty = Number(adjustment.qty) * -1;
                invAdjRec.setCurrentSublistValue({
                    sublistId: 'inventory',
                    fieldId: 'adjustqtyby',
                    value: qty
                });

                // invAdjRec.setCurrentSublistValue({
                //     sublistId: 'inventory',
                //     fieldId: 'avgunitcost',
                //     value: 0.00
                // });
                invAdjRec.setCurrentSublistValue({
                    sublistId: 'inventory',
                    fieldId: 'unitcost',
                    value: 0.00
                });

                invAdjRec.commitLine({ sublistId: 'inventory' });
            });

            var invAdjId = invAdjRec.save({
                enableSourcing: true,
                ignoreMandatoryFields: true
            });
            log.debug('Inventory Adjustment Created', 'ID: ' + invAdjId);

            return invAdjId;

        } catch (e) {
            log.error('Error creating inventory adjustment', e);
        }
    }

    function deleteInvAdjustement(id) {
        try {
            var inventoryadjustmentSearchObj = search.create({
                type: "inventoryadjustment",
                filters:
                    [
                        ["type", "anyof", "InvAdjst"],
                        "AND",
                        ["custbody_sdb_cm_associated", "anyof", id],
                        "AND",
                        ["mainline", "is", "T"]
                    ],
                columns: []

            });
            var searchResultCount = inventoryadjustmentSearchObj.runPaged().count;
            log.debug("inventoryadjustmentSearchObj result count", searchResultCount);
            inventoryadjustmentSearchObj.run().each(function (result) {
                var rcdid = record.delete({
                    type: 'inventoryadjustment',
                    id: result.id,
                });
                log.debug('deleted rcdid', rcdid)
                return true;
            });

        } catch (error) {
            log.error('ErrordeleteInvAdjustementt', error)
        }
    }


    function getCreatedFrom(id) {
        try {
            var transactionSearchObj = search.create({
                type: "transaction",
                filters:
                    [
                        ["internalid", "anyof", id],
                        "AND",
                        ["mainline", "is", "T"]
                    ],
                columns:
                    [
                        search.createColumn({ name: "type", label: "Type" })
                    ]
            });
            var searchResultCount = transactionSearchObj.runPaged().count;
            log.debug("transactionSearchObj result count", searchResultCount);
            var flag = false;
            transactionSearchObj.run().each(function (result) {
                var type = result.getValue('type');
                log.debug("type", type);
                if (type == 'RtnAuth') flag = true;
                if (type == 'CustInvc' && getInvWRMA(result.id)) flag = true;
                return true;
            });


        } catch (error) {
            log.error('getCreatedFrom', error)
        }
        return flag
    }

    function getInvWRMA(id) {
        try {
            log.debug("enter", id);
            var returnauthorizationSearchObj = search.create({
                type: "returnauthorization",
                filters:
                    [
                        ["mainline", "is", "T"],
                        "AND",
                        ["type", "anyof", "RtnAuth"],
                        "AND",
                        ["createdfrom", "anyof", id]
                    ],
                columns:
                    [
                        search.createColumn({ name: "type", label: "Type" })
                    ]
            });
            var searchResultCount = returnauthorizationSearchObj.runPaged().count;
            log.debug("returnauthorizationSearchObj result count 2", searchResultCount);
            if (searchResultCount > 0) return true
        } catch (error) {
            log.error('getInvWRMA', error)
        }
        return false
    }
    return {
        beforeSubmit: beforeSubmit,
        afterSubmit: afterSubmit
    }
});
