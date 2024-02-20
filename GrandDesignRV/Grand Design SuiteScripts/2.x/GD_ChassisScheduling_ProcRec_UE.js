/**
 * @NApiVersion 2.1
 * @NScriptType UserEventScript
 */
define(['N/record', './GD_Constants.js', '/SuiteScripts/SSLib/2.x/SSLib_Task.js'],
    
    (record, GD_Constants, ssTask) => {
        /**
         * Defines the function definition that is executed before record is loaded.
         * @param {Object} scriptContext
         * @param {Record} scriptContext.newRecord - New record
         * @param {string} scriptContext.type - Trigger type; use values from the context.UserEventType enum
         * @param {Form} scriptContext.form - Current form
         * @param {ServletRequest} scriptContext.request - HTTP request information sent from the browser for a client action only.
         * @since 2015.2
         */
        const beforeLoad = (context) => {

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
            if(scriptContext.type != scriptContext.UserEventType.DELETE){
                let procRecord = scriptContext.newRecord;
                let submitValues = {};

                // Check that the Status is Open
                let status = procRecord.getValue('custrecordgd_chassissched_status');
                let updateStatus = 'Complete';
                if (status == GD_Constants.GD_CHASSISSCHEDULINGSTATUS_OPEN) {
                    let unitData = procRecord.getValue('custrecordgd_chassissched_unitjson');
                    
                    // Trigger Map Reduce to update data on Unit records
                    let unitsUpdated = procRecord.getValue('custrecordgd_chassissched_unitmrcomplete');
                    if (!unitsUpdated && unitData != '[]') {
                        updateStatus = 'Processing';
                        ssTask.startMapReduceScript('customscriptgd_chassissched_updateunits', null, {
                            custscriptgd_updateunits_data: unitData,
                            custscriptgd_updateunits_procid: procRecord.id,
                        });
                    }
                    else {
                        // The MR wasn't trigger since there's no data, update the checkbox.
                        submitValues['custrecordgd_chassissched_unitmrcomplete'] = true;
                    }

                    // Trigger Map Reduce to update data on Sales Orders
                    let salesOrderUpdated = procRecord.getValue('custrecordgd_chassissched_somrcomplete');
                    if (!salesOrderUpdated && unitData != '[]') {
                        updateStatus = 'Processing';
                        ssTask.startMapReduceScript('customscriptgd_chassissched_updatesaleso', null, {
                            custscriptgd_updatesalesord_data: unitData,
                            custscriptgd_updatesalesord_procid: procRecord.id,
                        });
                    }
                    else {
                        // The MR wasn't trigger since there's no data, update the checkbox.
                        submitValues['custrecordgd_chassissched_somrcomplete'] = true;
                    }

                    // Update the status to Processing if any of the MapReduces were triggered, if not, set the status to Complete.
                    if (updateStatus == 'Processing')
                        submitValues['custrecordgd_chassissched_status'] = GD_Constants.GD_CHASSISSCHEDULINGSTATUS_PROCESSING;
                    else if (updateStatus == 'Complete')
                        submitValues['custrecordgd_chassissched_status'] = GD_Constants.GD_CHASSISSCHEDULINGSTATUS_COMPLETE;

                    record.submitFields({
                        type: 'customrecordgd_chassissched_procrec',
                        id: procRecord.id,
                        values: submitValues
                    });
                }
            }
        }

        return {beforeLoad, beforeSubmit, afterSubmit}

    });
