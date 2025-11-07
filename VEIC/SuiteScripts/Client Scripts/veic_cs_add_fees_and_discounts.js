/**
 * @NApiVersion 2.x
 * @NScriptType ClientScript
 * @NModuleScope SameAccount
 * 
 * The function that initiates calculating and adding fees to an invoice from an invoice record.
 * Calls a Suitelet endpoint to kick off that actual processing.
 */

/** @typedef {import('veic-types/feesAndDiscounts').FeeResponse} FeeResponse */

// @ts-ignore
define(['N/currentRecord', 'N/https', 'N/url', 'N/ui/message'],
    /**
     * @param {import('N/currentRecord')} currentRecord
     * @param {import('N/https')} https
     * @param {import('N/url')} url
     * @param {import('N/ui/message')} message
     */
    (currentRecord, https, url, message) => {
        const ADD_FEES_SL_SCRIPT_ID = 'customscript_veic_sl_add_fees_and_disc';
        const ADD_FEES_SL_DEPLOYEMENT_ID = 'customdeploy_veic_sl_add_fees_and_disc';
        const RESPONSE_STATUS_SUCCESS = 'success';
        const RESPONSE_STATUS_ERROR = 'error';

        /**
         * Target function for Add Fees button in the invoice form. Calls a Suitelet
         * endpoint to initiate calculating and adding fees to the current invoice.
         */
        function onCalculateFees() {
            const processingMsg = message.create({
                type: message.Type.INFORMATION,
                title: 'Processing Fees',
                message: 'Calculating fees for invoice. The invoice will be reloaded when fees are ready.'
            });
            processingMsg.show();

            const invoice = currentRecord.get();
            const suiteletUrl = url.resolveScript({
                scriptId: ADD_FEES_SL_SCRIPT_ID,
                deploymentId: ADD_FEES_SL_DEPLOYEMENT_ID,
                params: {invoice_id: invoice.id}
            });

            https.get.promise({url: suiteletUrl})
                .then(res => {
                    /** @type {FeeResponse} */
                    const result = JSON.parse(res.body || '{}');
                    if (result.status === RESPONSE_STATUS_SUCCESS) {
                        location.reload();
                    } else {
                        processingMsg.hide();
                        const errorMsg = message.create({
                            type: message.Type.ERROR,
                            title: 'Error',
                            message: `An error occurred while processing fees: ${result.message}`
                        });
                        errorMsg.show();
                    }
                })
                .catch((err) => {
                    processingMsg.hide();
                    const errorMsg = message.create({
                        type: message.Type.ERROR,
                        title: 'Error',
                        message: `Unable to process fees: ${err.message}`
                    });
                    errorMsg.show();
                });
        }

        return {onCalculateFees};
    }
);
