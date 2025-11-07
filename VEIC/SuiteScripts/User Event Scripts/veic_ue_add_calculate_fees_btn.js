/**
 * @NApiVersion 2.1
 * @NScriptType UserEventScript
 * 
 * Add an 'Add Fees' button to the invoice form. This button calls the onAddFees() function
 * in veic_cs_add_fees_and_discounts.
 */

/** @typedef {import('N/types').EntryPoints.UserEvent.beforeLoadContext} beforeLoadContext */

// @ts-ignore
define(['N/record'],
    /**
     * @param {import('N/record')} record
     */
    (record) => {
        const ADD_FEES_SCRIPT_PATH = 'SuiteScripts/Client Scripts/veic_cs_add_fees_and_discounts.js';
        const ADD_FEES_BTN_ID = 'custpage_add_fees_btn';

        /**
         * Add a 'Calculate Fees' button to an invoice record
         * 
         * @param {beforeLoadContext} context
         */
        const beforeLoad = (context) => {
            if (context.type !== context.UserEventType.EDIT) {
                return;
            }

            if (context.newRecord.type !== record.Type.INVOICE) {
                return;
            }

            // TODO: check that project has fee rules setup before adding btn

            const form = context.form;
            form.clientScriptModulePath = ADD_FEES_SCRIPT_PATH;
            form.addButton({
                id: ADD_FEES_BTN_ID,
                label: 'Calculate Fees',
                functionName: 'onCalculateFees'
            });
        }

        return {beforeLoad};
    }
);
