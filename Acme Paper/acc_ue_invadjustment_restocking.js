/**
 * @NApiVersion 2.x
 * @NScriptType UserEventScript
 * @NModuleScope SameAccount
 */
define(['N/record', 'N/search'],

    function (record, search) {
        var defaultAdjustmentAcc = 640; // Bill and Hold Expenses
        var soForm = 317;
        /**
         * Function definition to be triggered before record is loaded.
         *
         * @param {Object} scriptContext
         * @param {Record} scriptContext.newRecord - New record
         * @param {string} scriptContext.type - Trigger type
         * @param {Form} scriptContext.form - Current form
         * @Since 2015.2
         */
        function beforeLoad(scriptContext) {

        }

        /**
         * Function definition to be triggered before record is loaded.
         *
         * @param {Object} scriptContext
         * @param {Record} scriptContext.newRecord - New record
         * @param {Record} scriptContext.oldRecord - Old record
         * @param {string} scriptContext.type - Trigger type
         * @Since 2015.2
         */
        function beforeSubmit(scriptContext) {

        }

        /**
         * Function definition to be triggered before record is loaded.
         *
         * @param {Object} scriptContext
         * @param {Record} scriptContext.newRecord - New record
         * @param {Record} scriptContext.oldRecord - Old record
         * @param {string} scriptContext.type - Trigger type
         * @Since 2015.2
         */
        function afterSubmit(scriptContext) {
            var recObj = scriptContext.newRecord;
            var invoiceId = recObj.id;
            var soId = recObj.getValue({
                fieldId: 'createdfrom'
            });
            var soform = 0;
            if (soId != null && soId != '') {
                var soObj = search.lookupFields({
                    type: search.Type.SALES_ORDER,
                    id: soId,
                    columns: ['customform', 'tranid']
                });
                soform = soObj['customform'][0].value;
            }
            if (soForm != soform) return;

            var invoiceObj = record.load({
                type: record.Type.INVOICE,
                id: invoiceId
            });
            var customer = invoiceObj.getValue({
                fieldId: 'entity'
            });
            var sub = invoiceObj.getValue({
                fieldId: 'subsidiary'
            });
            var mainLocation = invoiceObj.getValue({
                fieldId: 'location'
            });
            var lineCount = invoiceObj.getLineCount({
                sublistId: 'item'
            });
            if (lineCount > 0) {
                try {
                    var adjustmentRec = record.create({
                        type: record.Type.INVENTORY_ADJUSTMENT,
                        isDynamic: false
                    });
                    adjustmentRec.setValue({
                        fieldId: 'subsidiary',
                        value: sub
                    });
                    adjustmentRec.setValue({
                        fieldId: 'customer',
                        value: customer
                    });
                    adjustmentRec.setValue({
                        fieldId: 'account',
                        value: defaultAdjustmentAcc
                    });
                    adjustmentRec.setValue({
                        fieldId: 'custbody_a1wms_dnloadtowms',
                        value: false
                    });
                    adjustmentRec.setValue({
                        fieldId: 'memo',
                        value: 'To Adjust Bill & Hold Fulfillment For the Order: ' + soObj.tranid
                    });
                    for (var i = 0; i < lineCount; i++) {
                        // Get invoice line details
                        var item = invoiceObj.getSublistValue({
                            sublistId: 'item',
                            fieldId: 'item',
                            line: i
                        });
                        var itemName = invoiceObj.getSublistText({
                            sublistId: 'item',
                            fieldId: 'item',
                            line: i
                        });
                        var location = invoiceObj.getSublistValue({
                            sublistId: 'item',
                            fieldId: 'location',
                            line: i
                        });
                        if (!location) location = mainLocation;
                        var quantity = invoiceObj.getSublistValue({
                            sublistId: 'item',
                            fieldId: 'quantity',
                            line: i
                        });
                        if (itemName && itemName.indexOf("error") == -1) {
                            // set adjustment lines
                            adjustmentRec.setSublistValue({
                                sublistId: 'inventory',
                                fieldId: 'item',
                                line: i,
                                value: item
                            });
                            adjustmentRec.setSublistValue({
                                sublistId: 'inventory',
                                fieldId: 'location',
                                line: i,
                                value: location
                            });
                            adjustmentRec.setSublistValue({
                                sublistId: 'inventory',
                                fieldId: 'adjustqtyby',
                                line: i,
                                value: quantity
                            });
                            adjustmentRec.setSublistValue({
                                sublistId: 'inventory',
                                fieldId: 'unitcost',
                                line: i,
                                value: 0
                            });
                            adjustmentRec.setSublistValue({
                                sublistId: 'inventory',
                                fieldId: 'currentvalue',
                                line: i,
                                value: 0
                            });
                        }

                    }
                    var adjusmentId = adjustmentRec.save({
                        enableSourcing: false,
                        ignoreMandatoryFields: true
                    });
                    log.debug('adjusmentId', adjusmentId);
                    if (adjusmentId != null && adjusmentId != '' && soId != null && soId != '') {
                        var id = record.submitFields({
                            type: record.Type.SALES_ORDER,
                            id: soId,
                            values: {
                                custbody_acc_inv_adj: adjusmentId
                            },
                            options: {
                                enableSourcing: false,
                                ignoreMandatoryFields: true
                            }
                        });
                    }
                } catch (error) {
                    log.error('error while creating inventory adjustment', error);
                }
            }
        }

        return {
            beforeLoad: beforeLoad,
            beforeSubmit: beforeSubmit,
            afterSubmit: afterSubmit
        };
    });