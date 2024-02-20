/**
 * @NApiVersion 2.1
 */
define([],

    () => {
        return {
            /**
             * Export script for exporting vendor payments
             */
            EXPORT_MR_SCRIPT_VENDOR: {
                scriptId: 'customscript_gd_mr_export_payment',
                deploymentId: 'customdeploy_gd_mr_export_payment',
                returnExternalUrl: false
            },
            /**
             * Export script for exporting dealer refunds
             */
            EXPORT_MR_SCRIPT_DEALER: {
                scriptId: 'customscript_gd_mr_export_payment',
                deploymentId: 'customdeploy_gd_mr_export_payment_refund',
                returnExternalUrl: false
            },
            searchIds: Object.freeze({
                VENDOR_PAYMENT: 'customsearch_payment_export',
                DEALER_REFUND: 'customsearch_dealer_refund_export'
            })
        }
    });
