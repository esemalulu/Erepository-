/**
 * @NApiVersion 2.1
 * @NScriptType UserEventScript
 */
define(['N/record', './GD_Constants.js', '/SuiteScripts/SSLib/2.x/SSLib_Constants.js'],
    /**
 * @param{record} record
 */
    (record, GD_Constants, ssConstants) => {
        /**
         * Defines the function definition that is executed before record is loaded.
         * @param {Object} scriptContext
         * @param {Record} scriptContext.newRecord - New record
         * @param {string} scriptContext.type - Trigger type; use values from the context.UserEventType enum
         * @param {Form} scriptContext.form - Current form
         * @param {ServletRequest} scriptContext.request - HTTP request information sent from the browser for a client action only.
         * @since 2015.2
         */
        const beforeLoad = (scriptContext) => {

        }

        /**
         * Defines the function definition that is executed before record is submitted.
         * @param {Object} scriptContext
         * @param {Record} scriptContext.newRecord - New record
         * @param {Record} scriptContext.oldRecord - Old record
         * @param {string} scriptContext.type - Trigger type; use values from the context.UserEventType enum
         * @since 2015.2
         */
        const beforeSubmit = (scriptContext) => {
            if (scriptContext.type != scriptContext.UserEventType.DELETE) {
                // When a unit order is created, set the Chassis Item in the Header
                let unitOrder = scriptContext.newRecord;
                if (unitOrder.getValue('custbodyrvsordertype') == GD_Constants.GD_ORDERTYPE_UNIT) {
                    let isChassis = false;
                    let chassisItem = '';
                    // Loop through the Unit Order lines
                    var numLines = unitOrder.getLineCount({ sublistId: 'item' });
                    for (var i = 0; i < numLines; i++) {
                        // Check if there's a Chassis Item on the Order
                        isChassis = unitOrder.getSublistValue({
                            sublistId: 'item',
                            fieldId: 'custcolgd_ischassis',
                            line: i
                        }) || false;

                        if (isChassis) {
                            // If there's a Chassis Item, set the header field
                            chassisItem = unitOrder.getSublistValue({
                                sublistId: 'item',
                                fieldId: 'item',
                                line: i
                            });

                            try {
                                unitOrder.setValue('custbodygd_chassisitem', chassisItem);
                                break;
                            }
                            catch (err) {
                                log.error({
                                    title: 'Error when setting Chassis Item',
                                    details: err
                                });
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
            if (scriptContext.type != scriptContext.UserEventType.DELETE) {
                // When a unit order status is set to Closed, clear the Inventory Detail
                // Load the record so you get the correct status, new record was returning the previous status.
                // Load in dynamic mode so we can remove the subrecord.
                let unitOrder = record.load({
                    type: record.Type.SALES_ORDER,
                    id: scriptContext.newRecord.id,
                    isDynamic: true
                });

                let orderStatus = unitOrder.getValue('orderstatus');
                let orderType = unitOrder.getValue('custbodyrvsordertype');
                let unitSerialNumber = unitOrder.getValue('custbodyrvsunitserialnumber');
                let unitId = unitOrder.getValue('custbodyrvsunit');
                let updateUnit = false;

                if (orderStatus == ssConstants.SO_CLOSED && orderType == GD_Constants.GD_ORDERTYPE_UNIT) {
                    try {
                        var numLines = unitOrder.getLineCount({ sublistId: 'item' });
                        for (var i = 0; i < numLines; i++) {
                            // Check if it's a Chassis Item 
                            unitOrder.selectLine({ sublistId: 'item', line: i });
                            let hasSubrecord = unitOrder.hasCurrentSublistSubrecord({ sublistId: 'item', fieldId: 'inventorydetail' });
                            if (hasSubrecord) {
                                updateUnit = true;
                                unitOrder.removeCurrentSublistSubrecord({ sublistId: 'item', fieldId: 'inventorydetail' });
                                unitOrder.commitLine({ sublistId: 'item' });
                            }
                        }
                        
                        unitOrder.save();

                        // If there was a subrecord, update the Unit record as well.
                        if (updateUnit) {
                            record.submitFields({
                                type: 'customrecordrvsunit',
                                id: unitId,
                                values: {
                                    'custrecordgd_unit_chassisinvnum': '',
                                    'name': unitSerialNumber
                                }
                            });
                        }
                    } catch (err) {
                        log.error({
                            title: 'Error when SO was closed: ' + unitOrder,
                            details: err
                        });
                    }
                }
            }
        }

        return {beforeLoad, beforeSubmit, afterSubmit}

    });
