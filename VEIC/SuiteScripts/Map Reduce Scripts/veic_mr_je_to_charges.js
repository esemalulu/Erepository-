/**
 * @NApiVersion 2.1
 * @NScriptType MapReduceScript
 */
define(['N/format', 'N/record', 'N/search'],
    /**
 * @param{format} format
 * @param{record} record
 * @param{search} search
 */
    (format, record, search) => {

        // Constants
        const SAVED_SEARCH_JES_TO_CHARGES = 'customsearch_veic_je_to_charges';
        const CHARGE_TYPE_FIXED_DATE = -10; // Fixed Date charge type internal ID
        const CHARGE_STATUS_READY_FOR_BILLING = 'READY_FOR_BILLING'; // Charge Status value for Ready for Billing
        const JE_BILLING_STATUS_BILLABLE_CHARGE_CREATED = 3; // Billable - Charge Created

        /**
         * Defines the function that is executed at the beginning of the map/reduce process and generates the input data.
         * @param {Object} inputContext
         * @param {boolean} inputContext.isRestarted - Indicates whether the current invocation of this function is the first
         *     invocation (if true, the current invocation is not the first invocation and this function has been restarted)
         * @param {Object} inputContext.ObjectRef - Object that references the input data
         * @typedef {Object} ObjectRef
         * @property {string|number} ObjectRef.id - Internal ID of the record instance that contains the input data
         * @property {string} ObjectRef.type - Type of the record instance that contains the input data
         * @returns {Array|Object|Search|ObjectRef|File|Query} The input data to use in the map/reduce process
         * @since 2015.2
         */

        const getInputData = (inputContext) => {
            return search.load({ id: SAVED_SEARCH_JES_TO_CHARGES });
        }

        /**
         * Defines the function that is executed when the map entry point is triggered. This entry point is triggered automatically
         * when the associated getInputData stage is complete. This function is applied to each key-value pair in the provided
         * context.
         * @param {Object} mapContext - Data collection containing the key-value pairs to process in the map stage. This parameter
         *     is provided automatically based on the results of the getInputData stage.
         * @param {Iterator} mapContext.errors - Serialized errors that were thrown during previous attempts to execute the map
         *     function on the current key-value pair
         * @param {number} mapContext.executionNo - Number of times the map function has been executed on the current key-value
         *     pair
         * @param {boolean} mapContext.isRestarted - Indicates whether the current invocation of this function is the first
         *     invocation (if true, the current invocation is not the first invocation and this function has been restarted)
         * @param {string} mapContext.key - Key to be processed during the map stage
         * @param {string} mapContext.value - Value to be processed during the map stage
         * @since 2015.2
         */

        const map = (mapContext) => {
            try {
                const searchResult = JSON.parse(mapContext.value);
                log.debug('Search Result', searchResult);
                const jeId = searchResult.id;
                log.debug('JE ID', jeId);
                const jeLine = searchResult.values.line;
                log.debug('JE Line', jeLine);
                const jeDate = searchResult.values.trandate;
                log.debug('JE Date', jeDate);
                const projectId = searchResult.values.entity.value;
                log.debug('Entity', projectId);
                const memo = searchResult.values.memo;
                log.debug('Memo', memo);
                const mainMemo = searchResult.values.memomain;
                log.debug('Main Memo', mainMemo);

                // Not currently used
                const rl1 = searchResult.values["line.cseg_veic_mmprog"] ? searchResult.values["line.cseg_veic_mmprog"].value : null;
                log.debug('RL1', rl1);
                const rl2 = searchResult.values["line.cseg_veic_eeu_initi"] ? searchResult.values["line.cseg_veic_eeu_initi"].value : null;
                log.debug('RL2', rl2);
                const allocationCategory = searchResult.values["line.cseg_veic_ac"] ? searchResult.values["line.cseg_veic_ac"].value : null;
                log.debug('Allocation Category', allocationCategory);
                const allocationYear = searchResult.values["line.cseg_alloc_year"] ? searchResult.values["line.cseg_alloc_year"].value : null;
                log.debug('Allocation Year', allocationYear);
                const eeuFiscalYear = searchResult.values["line.cseg_veic_eeu_fiscy"] ? searchResult.values["line.cseg_veic_eeu_fiscy"].value : null;
                log.debug('EEU Fiscal Year', eeuFiscalYear);

                // If Project Task is set on JE line, use that
                const projectTaskId = searchResult.values.custcol_cp_projecttask ? searchResult.values.custcol_cp_projecttask.value : null;
                log.debug('projectTaskId', projectTaskId);
                const accountId = searchResult.values.account.value;
                log.debug('Account', accountId);
                const amount = searchResult.values.amount;
                log.debug('Amount', amount);
                const chargeFromId = searchResult.values.department ? searchResult.values.department.value : null;
                log.debug('Charge From', chargeFromId);
                const bubId = searchResult.values.class ? searchResult.values.class.value : null;
                log.debug('BUB', bubId);

                // Find a Service Item linked to the Account on the JE line
                let serviceitemId = null;
                if (accountId) {
                    let serviceItemIds = [];
                    search.create({
                        type: "serviceitem",
                        filters:
                            [
                                ["account", "anyof", accountId],
                                "AND",
                                ["isinactive", "is", "F"],
                                "AND",
                                ["type", "anyof", "Service"]
                            ]
                    }).run().each(function (result) {
                        serviceItemIds.push(result.id);
                        return true;
                    });
                    log.debug('Matching Service Item IDs with Account ID ' + accountId, serviceItemIds);
                    if (serviceItemIds.length > 0) {
                        // Pick the first one if multiple
                        serviceitemId = serviceItemIds[0];
                    }
                    if (serviceItemIds.length > 1) {
                        log.audit('Multiple Service Items found for Account', 'Account ID ' + accountId + ' has ' + serviceItemIds + ' active Service Items. Using the first one found with internal ID ' + serviceitemId);
                    }
                }
                log.debug('Selected Service Item ID', serviceitemId);
                if(!serviceitemId){
                    log.error('No Service Item found', 'JE ID ' + jeId + ' Line ' + jeLine + ' - no active Service Item found for Account ID ' + accountId + '. Skipping.');
                    return;
                }

                // Create Charge record
                const chargeRecord = record.create({ type: record.Type.CHARGE, isDynamic: true });
                chargeRecord.setValue({ fieldId: "billto", value: projectId, ignoreFieldChange: false });
                chargeRecord.setValue({ fieldId: "stage", value: CHARGE_STATUS_READY_FOR_BILLING, ignoreFieldChange: false });
                chargeRecord.setValue({ fieldId: "chargedate", value: new Date(jeDate), ignoreFieldChange: false });
                chargeRecord.setValue({ fieldId: "chargetype", value: CHARGE_TYPE_FIXED_DATE, ignoreFieldChange: false });
                chargeRecord.setValue({ fieldId: "description", value: memo, ignoreFieldChange: false });
                chargeRecord.setValue({ fieldId: "memo", value: mainMemo, ignoreFieldChange: false });
                chargeRecord.setValue({ fieldId: "billingitem", value: serviceitemId, ignoreFieldChange: false });
                chargeRecord.setValue({ fieldId: "rate", value: amount, ignoreFieldChange: false });
                chargeRecord.setValue({ fieldId: "quantity", value: 1, ignoreFieldChange: false });
                chargeRecord.setValue({ fieldId: "amount", value: amount, ignoreFieldChange: false });
                // Classifications
                chargeRecord.setValue({ fieldId: "class", value: bubId, ignoreFieldChange: false }); // BUB
                chargeRecord.setValue({ fieldId: "department", value: chargeFromId, ignoreFieldChange: false }); // Charge From
                // If Project Task not set on JE line, skip setting it on Charge record
                if (projectTaskId)
                    chargeRecord.setValue({ fieldId: "custrecord_cp_project_task_billing", value: projectTaskId, ignoreFieldChange: false });

                // Link to the JE and JE Line
                chargeRecord.setValue({ fieldId: "custrecord_veic_chrg_je", value: jeId, ignoreFieldChange: false });
                chargeRecord.setValue({ fieldId: "custrecord_veic_chrg_je_line", value: jeLine, ignoreFieldChange: false });
                log.debug('Charge Record', chargeRecord);
                
                const chargeId = chargeRecord.save();
                log.audit("Charge created successfully", "JE " + jeId + " line " + jeLine + " created charge ", chargeId);
                if (chargeId) {
                    // Pass the charge IDs to the reduce stage to update JE Billing Status on the JE line there
                    mapContext.write({ key: jeId, value: { chargeId: chargeId, jeLine: jeLine } });
                }

            } catch (e) {
                log.error('Error processing JE line', mapContext.value);
                log.error('Error in map function', e);
            }

        }

        /**
         * Defines the function that is executed when the reduce entry point is triggered. This entry point is triggered
         * automatically when the associated map stage is complete. This function is applied to each group in the provided context.
         * @param {Object} reduceContext - Data collection containing the groups to process in the reduce stage. This parameter is
         *     provided automatically based on the results of the map stage.
         * @param {Iterator} reduceContext.errors - Serialized errors that were thrown during previous attempts to execute the
         *     reduce function on the current group
         * @param {number} reduceContext.executionNo - Number of times the reduce function has been executed on the current group
         * @param {boolean} reduceContext.isRestarted - Indicates whether the current invocation of this function is the first
         *     invocation (if true, the current invocation is not the first invocation and this function has been restarted)
         * @param {string} reduceContext.key - Key to be processed during the reduce stage
         * @param {List<String>} reduceContext.values - All values associated with a unique key that was passed to the reduce stage
         *     for processing
         * @since 2015.2
         */
        const reduce = (reduceContext) => {
            try {
                // Get the JE ID from the key
                const jeId = reduceContext.key;
                log.debug('JE ID', jeId);
                // Get the lines to be updated and their corresponding Charge IDs
                const lines = reduceContext.values.map(val => JSON.parse(val));
                log.debug('Parsed Lines', lines);

                // Load the JE record
                const jeRecord = record.load({ type: record.Type.JOURNAL_ENTRY, id: jeId, isDynamic: false });
                // For each value in lines, find the matching JE line and update the Billing Status and Charge Link        
                for (let i = 0; i < lines.length; i++) {
                    try {
                        const jeLine = lines[i].jeLine;
                        const chargeId = lines[i].chargeId;

                        jeRecord.setSublistValue({
                            sublistId: 'line',
                            line: jeLine,
                            fieldId: 'custcol_veic_je_billing_status',
                            value: JE_BILLING_STATUS_BILLABLE_CHARGE_CREATED
                        });
                        jeRecord.setSublistValue({
                            sublistId: 'line',
                            line: jeLine,
                            fieldId: 'custcol_veic_je_charge',
                            value: chargeId
                        });

                        log.debug('JE ' + jeId + ' Line ' + jeLine, 'JE Billing Status set and Charge set to ' + chargeId);
                    } catch (lineErr) {
                        log.error('Error updating JE line', 'JE ' + jeId + ' line ' + jeLine + ' - ' + lineErr);
                        // continue to next line without failing the whole reduce for this JE
                        continue;
                    }
                }

                try {
                    const id = jeRecord.save();
                    log.audit('JE ' + id + ' Updated Sucessfully', lines.length + ' lines updated to Billable - Charge Created');
                } catch (saveErr) {
                    log.error('Failed to save JE after updates', 'JE ID ' + jeId + ' - ' + saveErr);
                }
            } catch (e) {
                log.error('Error processing JE in reduce', reduceContext);
                log.error('Error in reduce function', e);
            }
        }


        /**
         * Defines the function that is executed when the summarize entry point is triggered. This entry point is triggered
         * automatically when the associated reduce stage is complete. This function is applied to the entire result set.
         * @param {Object} summaryContext - Statistics about the execution of a map/reduce script
         * @param {number} summaryContext.concurrency - Maximum concurrency number when executing parallel tasks for the map/reduce
         *     script
         * @param {Date} summaryContext.dateCreated - The date and time when the map/reduce script began running
         * @param {boolean} summaryContext.isRestarted - Indicates whether the current invocation of this function is the first
         *     invocation (if true, the current invocation is not the first invocation and this function has been restarted)
         * @param {Iterator} summaryContext.output - Serialized keys and values that were saved as output during the reduce stage
         * @param {number} summaryContext.seconds - Total seconds elapsed when running the map/reduce script
         * @param {number} summaryContext.usage - Total number of governance usage units consumed when running the map/reduce
         *     script
         * @param {number} summaryContext.yields - Total number of yields when running the map/reduce script
         * @param {Object} summaryContext.inputSummary - Statistics about the input stage
         * @param {Object} summaryContext.mapSummary - Statistics about the map stage
         * @param {Object} summaryContext.reduceSummary - Statistics about the reduce stage
         * @since 2015.2
         */
        const summarize = (summaryContext) => {

        }

        return { getInputData, map, reduce/*, summarize*/ }

    });
