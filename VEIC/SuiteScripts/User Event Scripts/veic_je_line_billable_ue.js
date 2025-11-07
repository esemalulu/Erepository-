/**
 * @NApiVersion 2.1
 * @NScriptType UserEventScript
 */
define(['N/record', 'N/search', 'SuiteScripts/Lib/veic_master_lib.js'],
    /**
 * @param{record} record
 * @param{search} search
 */
    (record, search, lib) => {
        var cache = [];

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
            const JE_NON_BILLABLE = 1;
            const JE_BILLABLE_NOT_BILLED = 2;
          
            var nonBillableAccountIds = null;

            const rec = scriptContext.newRecord;

            const lineCount = rec.getLineCount({ sublistId: 'line' });
            log.audit({ title: "JE " + rec.id + " line count", details: lineCount });

            for (var i = 0; i < lineCount; i++) {
                const accountId = rec.getSublistValue({ sublistId: 'line', fieldId: 'account', line: i });
                const accountType = rec.getSublistValue({ sublistId: 'line', fieldId: 'accounttype', line: i });
                const projectId = rec.getSublistValue({ sublistId: 'line', fieldId: 'entity', line: i });
                const jeBillingStatus = rec.getSublistValue({ sublistId: 'line', fieldId: 'custcol_veic_je_billing_status', line: i });

                //if (accountId && accountType == 'Expense' && projectId) {

                    if(projectId) nonBillableAccountIds = getNonBillableAccountIds(projectId);

                    // If the curent account is not listed in the non-billable account on the project, then it's billable.
              if(nonBillableAccountIds){
                    var billable = !(nonBillableAccountIds.includes(accountId));
                    
                    log.audit({ title: 'Line ' + i + ' billable?', details: billable });

                    rec.setSublistValue({ sublistId: 'line', fieldId: 'custcol_cp_je_line_billable', value: billable, line: i });
                    // If billable and it was already set, then do not override.
                    // If non-billable, then override to non-billable.        
                    if(billable && (jeBillingStatus > JE_NON_BILLABLE)){
                        // Do not override.
                        log.debug({ title: 'Line ' + i + ' billing status not overridden', details: jeBillingStatus });
                    } else {            
                        // Set the billing status based on billable or non-billable.        
                        rec.setSublistValue({ sublistId: 'line', fieldId: 'custcol_veic_je_billing_status', value: billable? JE_BILLABLE_NOT_BILLED : JE_NON_BILLABLE, line: i });
                    }
              }
                //}
            }
        }

        const getNonBillableAccountIds = (projectId) => {
            if(!projectId) return null;
          
            if (cache[projectId]) {
                log.debug("Cache Hit", projectId);
                return cache[projectId];
            }

            // Look up the non-billable accounts from the project
            if(lib.isNotEmpty(projectId)){
                var projectNonBillableAccounts = lib.lookupFields({
                    type: search.Type.JOB,
                    id: projectId,
                    columns: 'custentity_veic_nonbillable_accounts'
                });

                // Get list of non-billable accounts.
                const nonBillableAccounts = projectNonBillableAccounts['custentity_veic_nonbillable_accounts'];
                if (nonBillableAccounts) {
                    // Get the account Ids only.
                    const nonBillableAccountIds = nonBillableAccounts.map(item => item.value);
                    cache[projectId] = nonBillableAccountIds;
                    log.debug("Cache Miss", projectId);
                    return nonBillableAccountIds;
                }
            }

            return null;

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

        }

        return { /*beforeLoad,*/ beforeSubmit, /*afterSubmit*/ }

    });
