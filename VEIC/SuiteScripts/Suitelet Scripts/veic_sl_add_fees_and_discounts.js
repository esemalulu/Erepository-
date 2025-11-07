/**
 * @NApiVersion 2.1
 * @NScriptType Suitelet
 * 
 * Handles request from a user to initiate calculating and adding fees to an invoice. The processing
 * is handled in veic_lib_fees_and_discounts. Typically this will be called via a button added to the
 * invoice record.
 * 
 * See also:
 * - veic_cs_add_fees_and_discounts: Client Script that calls this Suitelet
 * - veic_ue_add_calculate_fees_button: User Event script that adds the button to the invoice form
 * - veic_lib_fees_and_discounts: library where the functionality for this feature lives.
 */

/** @typedef {import('N/types').EntryPoints.Suitelet.onRequestContext} onRequestContext */
/** @typedef {import('veic-types/feesAndDiscounts').FeesAndDiscounts} FeesAndDiscounts */
/** @typedef {import('veic-types/feesAndDiscounts').Invoice} Invoice */
/** @typedef {import('veic-types/feesAndDiscounts').Fee} Fee */
/** @typedef {import('veic-types/feesAndDiscounts').FeeResponse} FeeResponse */

// @ts-ignore
define(['N/log', 'SuiteScripts/Lib/veic_lib_fees_and_discounts'],
    /**
     * @param {import('N/log')} log
     * @param {FeesAndDiscounts} feesAndDiscounts
     */
    (log, feesAndDiscounts) => {
        const STATUS_SUCCESS = 'success';
        const STATUS_ERROR = 'error';

        /**
         * Handle requests to calcualte and add fees to an invoice
         * 
         * @param {onRequestContext} context
         */
        const onRequest = (context) => {
            /** @type {FeeResponse} */
            let response = {status: STATUS_ERROR, message: 'not processed'};
            const invoiceId = context.request.parameters['invoice_id'];
            try {
                feesAndDiscounts.processInvoiceFees(invoiceId);
                response.status = STATUS_SUCCESS;
                response.message = `Fees added successfully for invoice: ${invoiceId}`;
            } catch (e) {
                log.error({title: 'Fee Processing Error', details: e.message});
                response.status = STATUS_ERROR;
                response.message = `An error occurred while processing fees for invoice: ${invoiceId}.
                    Error: ${e.message}`;
            }

            context.response.setHeader({
                name: 'Content-Type',
                value: 'application/json'
            });
            context.response.write(JSON.stringify(response));
        }

        return {onRequest};
    }
);
