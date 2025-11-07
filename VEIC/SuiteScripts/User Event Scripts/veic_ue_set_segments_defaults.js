/**
 * @NApiVersion 2.1
 * @NScriptType UserEventScript
 */
define(['N/search', 'N/record','SuiteScripts/Lib/veic_master_lib.js'],
    /**
 * @param{search} search
 */
    (search, record,lib) => {
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
            log.debug("beforeSubmit", "Script started: " + scriptContext.type);
            try {
                const newRec = scriptContext.newRecord;
                const oldRec = scriptContext.oldRecord;

                // Get the posting period id and start date
                let oldPostingPeriodId = 0;
                if (oldRec) oldPostingPeriodId = oldRec.getValue({ fieldId: 'postingperiod' });
                const postingPeriodId = newRec.getValue({ fieldId: 'postingperiod' });

                log.debug("Old postingPeriodId", oldPostingPeriodId);
                log.debug("Current postingPeriodId", postingPeriodId);

                if (!postingPeriodId) return;

                var postingPeriodFields = lib.lookupFields({
                    type: search.Type.ACCOUNTING_PERIOD,
                    id: postingPeriodId,
                    columns: ['startdate', 'enddate']
                });

                // Determine the Corporate FY
                const postingPeriodStartDate = new Date(postingPeriodFields.startdate);
                const postingPeriodYear = "" + postingPeriodStartDate.getFullYear();
                log.debug("Current Posting Period Start Date", postingPeriodStartDate);

                // Determine the DCSEU FY
                postingPeriodStartDate.setMonth(postingPeriodStartDate.getMonth() + 3); // Adjust the fiscal year by adding 3 months.
                const postingPeriodYearDCSEU = "" + postingPeriodStartDate.getFullYear();
                log.debug("Adjusted Posting Period Start Date for DCSEU", postingPeriodStartDate);
                log.debug(newRec.type + " " + newRec.id, "posting period year is " + postingPeriodYear + " for DCSEU is " + postingPeriodYearDCSEU);

                // Get the internal id for the allocation year value to use.
                let allocationYearId = 0;
                search.create({
                    type: "customrecord_cseg_alloc_year",
                    filters: [["name", "is", postingPeriodYear]]
                }).run().each(function (result) {
                    allocationYearId = result.id
                });
                log.debug("Allocation Year Id", allocationYearId);

                // Get the internal id for the EEU fiscal year value.
                let eeuFiscalYearIds = [];
                eeuFiscalYearIds[postingPeriodYear] = 0;
                eeuFiscalYearIds[postingPeriodYearDCSEU] = 0;
                search.create({
                    type: "customrecord_cseg_veic_eeu_fiscy",
                    filters:
                        [
                            ["name", "is", postingPeriodYear],
                            "OR",
                            ["name", "is", postingPeriodYearDCSEU]
                        ],
                    columns: ['name']
                }).run().each(function (result) {
                    eeuFiscalYearIds[result.getValue({ name: "name" })] = result.id;
                    return true;
                });
                log.debug("EEU Fiscal Year Ids", "Corp FY " + postingPeriodYear + " = " + eeuFiscalYearIds[postingPeriodYear]
                    + ", DCSEU FY " + postingPeriodYearDCSEU + " = " + eeuFiscalYearIds[postingPeriodYearDCSEU]);


                // Iterate through the lists on the record and update the allocation year and EEU fiscal year fields if they are blank.
                // Since this script is deployed for different types of transactions, it checks all possible types of sublists.
                ['item', 'expense', 'line', 'timeitem'].forEach((listId, index) => {
                    try {
                        const lineCount = newRec.getLineCount({ sublistId: listId });
                        log.debug("list Id: " + listId, "line count " + lineCount);
                        for (let lineNum = 0; lineNum < lineCount; lineNum++) {
                            try {
                                // Update the Allocation Year field if it needs to be updated.
                                const currentAllocationYearId = newRec.getSublistValue({
                                    sublistId: listId,
                                    fieldId: 'cseg_alloc_year',
                                    line: lineNum
                                });

                                // If the Allocation Year is not set or if the posting period has changed, update it.
                                if ((!currentAllocationYearId || oldPostingPeriodId != postingPeriodId) && allocationYearId > 0) {
                                    log.debug("Setting Allocation Year for line " + lineNum, allocationYearId);
                                    newRec.setSublistValue({
                                        sublistId: listId,
                                        fieldId: 'cseg_alloc_year',
                                        line: lineNum,
                                        value: allocationYearId
                                    });
                                }

                                // Determine which EEU Fiscal Year to use.
                                let eeuFiscalYearId = eeuFiscalYearIds[postingPeriodYear];
                                let bub = "";
                                try {
                                    const bubId = newRec.getSublistValue({
                                        sublistId: listId,
                                        fieldId: 'class',
                                        line: lineNum
                                    });
                                    var bubFields = lib.lookupFields({
                                        type: search.Type.CLASSIFICATION,
                                        id: bubId,
                                        columns: ['name']
                                    });
                                    bub = bubFields["name"];
                                } catch (ex) {
                                    log.audit("Couldn't retrieve BUB name on line " + lineNum, ex.message);
                                    bub = "";
                                }
                                log.debug("BUB", bub);
                                if (bub && bub.startsWith('DCSEU')) {
                                    eeuFiscalYearId = eeuFiscalYearIds[postingPeriodYearDCSEU];
                                }

                                // Update the EEU Fiscal Year field if it needs to be updated.
                                const currentEeuFiscalYearId = newRec.getSublistValue({
                                    sublistId: listId,
                                    fieldId: 'cseg_veic_eeu_fiscy',
                                    line: lineNum
                                });

                                // If the EEU Fiscal Year is not set or if the posting period has changed, update it.
                                if ((!currentEeuFiscalYearId || oldPostingPeriodId != postingPeriodId) && eeuFiscalYearId > 0) {
                                    log.debug("Setting EEU FY for line " + lineNum, eeuFiscalYearId);
                                    newRec.setSublistValue({
                                        sublistId: listId,
                                        fieldId: 'cseg_veic_eeu_fiscy',
                                        line: lineNum,
                                        value: eeuFiscalYearId
                                    });
                                }
                            } catch (e) {
                                log.error("Error processing list " + listId + " line no. " + lineNum, e.message);
                            }
                        }
                    } catch (e) {
                        log.error("Error processing list " + listId, e.message);
                    }
                });

            } catch (ex) {
                log.error("Unexpected error in " + scriptContext.newRecord.type + " (" + scriptContext.newRecord.id + ")", ex.message);
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
            log.debug("afterSubmit", "Script started: " + scriptContext.type);
            //const newRec = scriptContext.newRecord;
            //const oldRec = scriptContext.oldRecord;

            // Get the posting period id and start date
            //let oldPostingPeriodId = 0;
            //if(oldRec) oldPostingPeriodId = oldRec.getValue({ fieldId: 'postingperiod' });
            //const postingPeriodId = newRec.getValue({ fieldId: 'postingperiod' });

            //log.debug("Old postingPeriodId", oldPostingPeriodId);
            //log.debug("Current postingPeriodId", postingPeriodId);

            try {
                const newRec = scriptContext.newRecord;
                const oldRec = scriptContext.oldRecord;

                // Get the posting period id and start date
                let oldPostingPeriodId = 0;
                if (oldRec) oldPostingPeriodId = oldRec.getValue({ fieldId: 'postingperiod' });
                const postingPeriodId = newRec.getValue({ fieldId: 'postingperiod' });

                log.debug("Old postingPeriodId", oldPostingPeriodId);
                log.debug("Current postingPeriodId", postingPeriodId);

                if (!postingPeriodId) return;

                var postingPeriodFields = lib.lookupFields({
                    type: search.Type.ACCOUNTING_PERIOD,
                    id: postingPeriodId,
                    columns: ['startdate', 'enddate']
                });

                // Determine the Corporate FY
                const postingPeriodStartDate = new Date(postingPeriodFields.startdate);
                const postingPeriodYear = "" + postingPeriodStartDate.getFullYear();
                log.debug("Current Posting Period Start Date", postingPeriodStartDate);

                // Determine the DCSEU FY
                postingPeriodStartDate.setMonth(postingPeriodStartDate.getMonth() + 3); // Adjust the fiscal year by adding 3 months.
                const postingPeriodYearDCSEU = "" + postingPeriodStartDate.getFullYear();
                log.debug("Adjusted Posting Period Start Date for DCSEU", postingPeriodStartDate);
                log.debug(newRec.type + " " + newRec.id, "posting period year is " + postingPeriodYear + " for DCSEU is " + postingPeriodYearDCSEU);

                // Get the internal id for the allocation year value to use.
                let allocationYearId = 0;
                search.create({
                    type: "customrecord_cseg_alloc_year",
                    filters: [["name", "is", postingPeriodYear]]
                }).run().each(function (result) {
                    allocationYearId = result.id
                });
                log.debug("Allocation Year Id", allocationYearId);

                // Get the internal id for the EEU fiscal year value.
                let eeuFiscalYearIds = [];
                eeuFiscalYearIds[postingPeriodYear] = 0;
                eeuFiscalYearIds[postingPeriodYearDCSEU] = 0;
                search.create({
                    type: "customrecord_cseg_veic_eeu_fiscy",
                    filters:
                        [
                            ["name", "is", postingPeriodYear],
                            "OR",
                            ["name", "is", postingPeriodYearDCSEU]
                        ],
                    columns: ['name']
                }).run().each(function (result) {
                    eeuFiscalYearIds[result.getValue({ name: "name" })] = result.id;
                    return true;
                });
                log.debug("EEU Fiscal Year Ids", "Corp FY " + postingPeriodYear + " = " + eeuFiscalYearIds[postingPeriodYear]
                    + ", DCSEU FY " + postingPeriodYearDCSEU + " = " + eeuFiscalYearIds[postingPeriodYearDCSEU]);

                const rec = record.load({ type: newRec.type, id: newRec.id });
                // Iterate through the lists on the record and update the allocation year and EEU fiscal year fields if they are blank.
                // Since this script is deployed for different types of transactions, it checks all possible types of sublists.
                ['item', 'expense', 'line', 'timeitem'].forEach((listId, index) => {
                    try {
                        const lineCount = newRec.getLineCount({ sublistId: listId });
                        log.debug("list Id: " + listId, "line count " + lineCount);
                        for (let lineNum = 0; lineNum < lineCount; lineNum++) {
                            try {
                                // Update the Allocation Year field if it needs to be updated.
                                const currentAllocationYearId = newRec.getSublistValue({
                                    sublistId: listId,
                                    fieldId: 'cseg_alloc_year',
                                    line: lineNum
                                });

                                // If the Allocation Year is not set or if the posting period has changed, update it.
                                if ((!currentAllocationYearId || oldPostingPeriodId != postingPeriodId) && allocationYearId > 0) {
                                    log.debug("Setting Allocation Year for line " + lineNum, allocationYearId);
                                    rec.setSublistValue({
                                        sublistId: listId,
                                        fieldId: 'cseg_alloc_year',
                                        line: lineNum,
                                        value: allocationYearId
                                    });
                                }

                                // Determine which EEU Fiscal Year to use.
                                let eeuFiscalYearId = eeuFiscalYearIds[postingPeriodYear];
                                let bub = "";
                                try {
                                    const bubId = newRec.getSublistValue({
                                        sublistId: listId,
                                        fieldId: 'class',
                                        line: lineNum
                                    });
                                    var bubFields = lib.lookupFields({
                                        type: search.Type.CLASSIFICATION,
                                        id: bubId,
                                        columns: ['name']
                                    });
                                    bub = bubFields["name"];
                                } catch (ex) {
                                    log.audit("Couldn't retrieve BUB name on line " + lineNum, ex.message);
                                    bub = "";
                                }
                                log.debug("BUB", bub);
                                if (bub && bub.startsWith('DCSEU')) {
                                    eeuFiscalYearId = eeuFiscalYearIds[postingPeriodYearDCSEU];
                                }

                                // Update the EEU Fiscal Year field if it needs to be updated.
                                const currentEeuFiscalYearId = newRec.getSublistValue({
                                    sublistId: listId,
                                    fieldId: 'cseg_veic_eeu_fiscy',
                                    line: lineNum
                                });

                                // If the EEU Fiscal Year is not set or if the posting period has changed, update it.
                                if ((!currentEeuFiscalYearId || oldPostingPeriodId != postingPeriodId) && eeuFiscalYearId > 0) {
                                    log.debug("Setting EEU FY for line " + lineNum, eeuFiscalYearId);
                                    rec.setSublistValue({
                                        sublistId: listId,
                                        fieldId: 'cseg_veic_eeu_fiscy',
                                        line: lineNum,
                                        value: eeuFiscalYearId
                                    });
                                }
                            } catch (e) {
                                log.error("Error processing list " + listId + " line no. " + lineNum, e.message);
                            }
                        }
                    } catch (e) {
                        log.error("Error processing list " + listId, e.message);
                    }
                });
                const id = rec.save();
                log.audit("Successfully updated", newRec.type + " (" + newRec.id + ")")
            } catch (ex) {
                log.error("Unexpected error in " + scriptContext.newRecord.type + " (" + scriptContext.newRecord.id + ")", ex.message);
            }

        }

        return { /* beforeLoad,  beforeSubmit  ,*/ afterSubmit }

    });
