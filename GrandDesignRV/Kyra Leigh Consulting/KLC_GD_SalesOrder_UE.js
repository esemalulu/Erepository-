/**
 * Record Type: Sales Order
 *
 * If Exclude From NTP = false and Status = Pending Fulfillment, check if any items have NTP vendor.
 * If yes, create drop ship PO.
 *
 * Author: Kyra Schaefer
 *
 * @NApiVersion 2.1
 * @NScriptType UserEventScript
 */
define(['N/record', 'N/search', 'N/runtime'],
    /**
     * @param{record} record
     * @param{search} search
     */
    (record, search, runtime) => {

        var VENDOR_NTP = '3291210'; // NTP-Stag

        /**
         * Defines the function definition that is executed before record is submitted.
         * @param {Object} scriptContext
         * @param {Record} scriptContext.newRecord - New record
         * @param {Record} scriptContext.oldRecord - Old record
         * @param {string} scriptContext.type - Trigger type; use values from the context.UserEventType enum
         * @since 2015.2
         */
        const beforeSubmit = (scriptContext) => {
            var DealerTypes = {
                WARRANTY: 2,
                OTHER: 6,
                RETAIL_CUSTOMER: 8,
                CREDIT_ONLY: 9,
                RVS_DEALER: 10,
                NON_RVS_DEALER: 11
            }
            function shouldDropShip(dealerType) {
                if(dealerType === DealerTypes.RETAIL_CUSTOMER || dealerType === DealerTypes.NON_RVS_DEALER)
                    return true;
                if(dealerType === DealerTypes.RVS_DEALER || dealerType === DealerTypes.WARRANTY)
                    return false;
                return false;
            }
            var logTitle = 'beforeSubmit';
            var type = scriptContext.type;
            var newRec = scriptContext.newRecord;
            var status = newRec.getValue('orderstatus');

            if (status == 'B' || type == scriptContext.UserEventType.APPROVE) {
                // If status is Pending Fulfillment
                // check if any items have NTP vendor
                log.debug(logTitle, 'status: ' + status);
                var itemCount = newRec.getLineCount('item');
                for (var line = 0; line < itemCount; line++) {
                    // for each line
                    var excludeFromNTP = newRec.getSublistValue({
                        sublistId: 'item',
                        fieldId: 'custcol_gd_exclude_ntp',
                        line: line
                    });
                    // if exclude from NTP, skip line
                    if (excludeFromNTP) continue;
                    var po = newRec.getSublistValue({
                        sublistId: 'item',
                        fieldId: 'createpo',
                        line: line
                    });
                    var isClosed = newRec.getSublistValue({
                        sublistId: 'item',
                        fieldId: 'isclosed',
                        line: line
                    });
                    var pickedQty = newRec.getSublistValue({
                        sublistId: 'item',
                        fieldId: 'quantitypickpackship',
                        line: line
                    });
                    var item = newRec.getSublistValue({
                        sublistId: 'item',
                        fieldId: 'item',
                        line: line
                    });
                    log.debug(logTitle, 'item: ' + item);
                    if (!isClosed && item && !po && !(pickedQty > 0)) {
                        var isNTP = searchItemNTP(item);
                        if (isNTP) {
                            log.debug(logTitle, 'Is NTP? : ' + isNTP);
                            //newRec.setValue('custbodygd_retaildropship', true);
                            newRec.setSublistValue({
                                sublistId: 'item',
                                fieldId: 'povendor',
                                value: VENDOR_NTP,
                                line: line
                            });
                            newRec.setSublistValue({
                                sublistId: 'item',
                                fieldId: 'createpo',
                                value: 'DropShip',
                                line: line
                            });
                            const lookup = search.lookupFields({
                                type: search.Type.CUSTOMER,
                                id: newRec.getValue('entity'),
                                columns: ['custentityrvsdealertype']
                            });
                            const dealerType = Number(lookup.custentityrvsdealertype[0].value);
                            log.debug('dealerType', dealerType);
                            if (shouldDropShip(dealerType)) {
                                newRec.setValue('custbodygd_retaildropship', true);
                            }
                        }
                    }
                }
            }

        }

        /**
         * Defines the function definition that is executed after record is submitted.
         * @param {Object} scriptContext
         * @param {Record} scriptContext.newRecord - New record
         * @param {Record} scriptContext.oldRecord - Old record
         * @param {string} scriptContext.type - Trigger type; use values from the context.UserEventType enum
         * @since 2015.2
         */
        const afterSubmit = (scriptContext) => {

            var logTitle = 'afterSubmit';
            var type = scriptContext.type;
            var newRec = scriptContext.newRecord;
            var soId = newRec.id;
            var status = newRec.getValue('orderstatus');
            var excludeFromNTP = newRec.getValue('custbody_gd_exclude_ntp');
            log.debug(logTitle, 'SO ID: ' + soId);

            if ((status == 'B' || type == scriptContext.UserEventType.APPROVE) && soId && !excludeFromNTP) {
                // If status is Pending Fulfillment and Exclude From NTP = false,
                // check if any items have NTP vendor
                log.debug(logTitle, 'status: ' + status);
                var createPO = searchOrderItemsNTP(soId);
                log.debug(logTitle, 'create PO? ' + createPO);

                if (createPO) {
                    // If any items have NTP vendor, create drop ship PO.
                    var entityId = newRec.getValue('entity');
                    var poId = createDropShipPO(soId, entityId);
                    log.audit(logTitle, 'New Drop Ship PO ID: ' + poId);
                }
            }

        }

        /**
         * Check if item has NTP vendor
         * @param {itemId} itemId - Internal ID of Item
         */
        function searchItemNTP(itemId) {

            var itemSearchObj = search.create({
                type: "item",
                filters:
                    [
                        ["internalid", "anyof", itemId],
                        "AND",
                        ["othervendor", "anyof", VENDOR_NTP]
                    ],
                columns:
                    [
                        "internalid"
                    ]
            });
            var searchResultCount = itemSearchObj.runPaged().count;

            if (searchResultCount > 0) {
                return true;
            } else {
                return false;
            }

        }

        /**
         * Check if items on SO have NTP vendor
         * @param {soId} soId - Internal ID of Sales Order
         */
        function searchOrderItemsNTP(soId) {

            var salesorderSearchObj = search.create({
                type: "salesorder",
                filters:
                    [
                        ["type", "anyof", "SalesOrd"],
                        "AND",
                        ["internalid", "anyof", soId],
                        "AND",
                        ["item.othervendor", "anyof", VENDOR_NTP],
                        "AND",
                        ["closed", "is", "F"],
                        "AND",
                        ["quantitypicked", "notgreaterthan", "0"],
                        "AND",
                        ["purchaseorder", "anyof", "@NONE@"]
                    ],
                columns:
                    [
                        "trandate",
                        "tranid",
                        "internalid",
                        "item",
                        "line"
                    ]
            });
            var searchResultCount = salesorderSearchObj.runPaged().count;

            if (searchResultCount > 0) {
                return true;
            } else {
                return false;
            }

        }

        /**
         * Create Drop Ship Purchase Order
         * @param {soId} soId - Internal ID of Sales Order
         */
        function createDropShipPO(soId, entityId) {

            var purchaseOrder = record.create({
                type: record.Type.PURCHASE_ORDER,
                isDynamic: true,
                defaultValues: {
                    'recordmode': 'dynamic',
                    'soid': soId,
                    'dropship': 'T',
                    'custid': entityId,
                    'entity': VENDOR_NTP,
                    'poentity': VENDOR_NTP
                }
            });
            // Set Integration status to Ready
            purchaseOrder.setValue({
                fieldId: 'custbodyintegrationstatus',
                value: 1
            });

            // Set Purchasing Agent = current user
            var user = runtime.getCurrentUser().name;
            purchaseOrder.setValue({
                fieldId: 'custbodyrvspurchasingagent',
                value: user
            });

            var poId = purchaseOrder.save();
            return poId;

        }

        return {beforeSubmit}

    })
;
