/**
 * Record Type: Purchase Order
 *
 * If ACKNOWLEDGMENT ITEM STATUS is Item rejected, close PO line and remove related drop ship Sales Order line.
 * Copy Sales Order line to be fulfilled from internal inventory.
 *
 * Author: Kyra Schaefer
 *
 * @NApiVersion 2.1
 * @NScriptType UserEventScript
 */
define(['N/record', 'N/search'],
    /**
     * @param{record} record
     * @param{search} search
     */
    (record, search) => {

        var ARR_REJECT_TYPES = ['3', '4']; // Reject with Detail; Reject, No Detail
        var ITEM_FIELDS = ['item', 'quantity', 'price', 'rate'];
        var DUMMY_ITEM = 5809;

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
            var newRec = scriptContext.newRecord;
            var dropShipLine = 0;
            var poLinesToClose = [];
            var soLinesToClose = [];
            var dropShipSet = false;
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
            function updateSO(createdFromSO, poID, soLinesToClose) {

                // Update SO to remove lines and create copies to fulfill internally
                var logTitle = 'updateSO';
                log.debug(logTitle, 'PO lines to close: ' + JSON.stringify(soLinesToClose));
                while (true) {
                    try {
                        var soRec = record.load({
                            type: record.Type.SALES_ORDER,
                            id: createdFromSO
                        });
                        const entity = soRec.getValue('entity');
                        // Get the entity type
                        const lookup = search.lookupFields({
                            type: search.Type.CUSTOMER,
                            id: entity,
                            columns: ['custentityrvsdealertype']
                        });
                        const dealerType = Number(lookup.custentityrvsdealertype[0].value);
                        log.debug('DEALER TYPE', 'Dealer Type: ' + dealerType);
                        var itemCount = soRec.getLineCount('item');
                        var nextLine = itemCount;
                        var dropShipLine = 0;
                        var soLinesToRemove = [];

                        for (var i = 0; i < itemCount; i++) {
                            // for each item line
                            var linePO = soRec.getSublistValue({
                                sublistId: 'item',
                                fieldId: 'createdpo',
                                line: i
                            });
                            if (linePO == poID) {
                                // if line is from Drop Ship PO
                                log.debug(logTitle, 'Drop Ship SO Line: ' + i);
                                log.debug(logTitle, 'Drop Ship PO Line: ' + dropShipLine);
                                // if line should be closed
                                if (soLinesToClose.indexOf(dropShipLine) >= 0) {
                                    // copy drop ship line
                                    for (var j in ITEM_FIELDS) {
                                        var fieldValue = soRec.getSublistValue({
                                            sublistId: 'item',
                                            fieldId: ITEM_FIELDS[j],
                                            line: i
                                        });
                                        soRec.setSublistValue({
                                            sublistId: 'item',
                                            fieldId: ITEM_FIELDS[j],
                                            line: nextLine,
                                            value: fieldValue
                                        });
                                    }
                                    // do not create po for new line
                                    soRec.setSublistValue({
                                        sublistId: 'item',
                                        fieldId: 'createpo',
                                        line: nextLine,
                                        value: null
                                    });
                                    // set dummy item on drop ship line, so line can be removed
                                    soRec.setSublistValue({
                                        sublistId: 'item',
                                        fieldId: 'item',
                                        line: i,
                                        value: DUMMY_ITEM
                                    });
                                    log.debug(logTitle, 'New SO Line: ' + nextLine);
                                    soLinesToRemove.push(i);
                                    nextLine++;
                                }
                                dropShipLine++;
                            }  // end drop ship line
                        } // end for each item

                        // save SO
                        soRec.save();

                        // reload SO to remove drop ship lines
                        log.debug(logTitle, 'New SO Line: ' + nextLine);
                        var soRec = record.load({
                            type: record.Type.SALES_ORDER,
                            id: createdFromSO
                        });
                        var itemCount = soRec.getLineCount('item');
                        
                        // Set the retail drop-ship on this PO.
                        if (shouldDropShip(dealerType) && !dropShipSet) {
                            record.submitFields({
                                type: record.Type.PURCHASE_ORDER,
                                id: poID,
                                values: {
                                    'custbodygd_retaildropship': true
                                },
                                options: {
                                    enableSourcing: false,
                                    ignoreMandatoryFields: true
                                }
                            });
                            record.submitFields({
                                type: record.Type.SALES_ORDER,
                                id: createdFromSO,
                                values: {
                                    'custbodygd_retaildropship': true
                                },
                                options: {
                                    enableSourcing: false,
                                    ignoreMandatoryFields: true
                                }
                            });
                            dropShipSet = true;
                        }

                        for (var i = itemCount - 1; i >= 0; i--) {

                            if (soLinesToRemove.indexOf(i) >= 0) {
                                soRec.removeLine({
                                    sublistId: 'item',
                                    line: i
                                });
                            }
                        }

                        // save SO
                        soRec.save();
                        log.audit(logTitle, 'Updated SO ID: ' + createdFromSO);

                        break;
                    } catch (e) {
                        if (e.name == 'RCRD_DSNT_EXIST') {
                            break;
                        } else if (e.name != 'RCRD_HAS_BEEN_CHANGED') {
                            log.error(logTitle, e);
                            break;
                        }
                    }
                }

            }

            if (newRec.id) {
                // loop through lines
                var lineCount = newRec.getLineCount('item');
                for (var line = 0; line < lineCount; line++) {
                    var acknowledgmentItemStatus = newRec.getSublistValue({
                        sublistId: 'item',
                        fieldId: 'custcol_sps_itemstatus',
                        line: line
                    });
                    var isDropShipLine = newRec.getSublistValue({
                        sublistId: 'item',
                        fieldId: 'isdropshiporderline',
                        line: line
                    });
                    var isClosed = newRec.getSublistValue({
                        sublistId: 'item',
                        fieldId: 'isclosed',
                        line: line
                    });
                    log.debug(logTitle, 'Acknowledgment Item Status: ' + acknowledgmentItemStatus +
                        ' | isDropShipLine: ' + isDropShipLine + ' | isClosed: ' + isClosed);

                    // is drop ship line
                    if (isDropShipLine) {
                        // If ACKNOWLEDGMENT ITEM STATUS is Item rejected and line is not closed
                        if (acknowledgmentItemStatus == 6 && !isClosed) {
                            // close PO line and related drop ship Sales Order line
                            poLinesToClose.push(line);
                            soLinesToClose.push(dropShipLine);
                        }
                        dropShipLine++;
                    }
                }

                if (poLinesToClose.length > 0) {
                    // Close PO lines
                    var createdFromSO = newRec.getValue('createdfrom');
                    closePO(newRec.id, poLinesToClose, createdFromSO);
                    // Update SO to close lines and create copies to fulfill internally
                    if (createdFromSO) updateSO(createdFromSO, newRec.id, soLinesToClose);
                }
            }

        }

        function closePO(recId, poLinesToClose, createdFromSO) {

            // Close Purchase Order lines
            var logTitle = 'closePO';
            while (true) {
                try {
                    var poRec = record.load({
                        type: record.Type.PURCHASE_ORDER,
                        id: recId
                    });
                    var poLineCount = poRec.getLineCount('item');
                    for (var i = 0; i < poLineCount; i++) {
                        if (poLinesToClose.indexOf(i) >= 0) {
                            poRec.setSublistValue({
                                sublistId: 'item',
                                fieldId: 'isclosed',
                                value: true,
                                line: i
                            });
                        }
                    }
                    poRec.setValue({
                        fieldId: 'custbody_gd_sales_order_orig',
                        value: createdFromSO
                    });
                    poRec.save();
                    log.audit(logTitle, 'Closed lines ' + JSON.stringify(poLinesToClose) +
                        ' on PO ID: ' + recId);
                    break;
                } catch (e) {
                    if (e.name == 'RCRD_DSNT_EXIST') {
                        break;
                    } else if (e.name != 'RCRD_HAS_BEEN_CHANGED') {
                        log.error(logTitle, e);
                        break;
                    }
                }
            }

        }

        return {afterSubmit}

    });
