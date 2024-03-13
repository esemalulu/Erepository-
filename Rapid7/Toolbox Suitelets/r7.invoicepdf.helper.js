/**
 * @NApiVersion 2.1
 * @NModuleScope Public
 */
define([
    'N/ui/dialog',
    'N/url'
], function(dialog, url) {
        function openInvoicePrint(invoices_to_print) {
            invoices_to_print = invoices_to_print.split(",");
            for(let i=0; i< invoices_to_print.length;i++){
                const invoice_id = invoices_to_print[i];
                console.log('invoice_id = '+ invoice_id);

                const suitelet_url = url.resolveScript({
                    scriptId: 'customscript_r7_retrieve_multiple_invoic',
                    deploymentId: 'customdeploy_r7_retrieve_multiple_invoic',
                    params: {
                        custparam_invoice_id: invoice_id,
                        custparam_print: 'T'
                    },
                    returnExternalUrl: false
                });
                console.log('suitelet_url = '+ suitelet_url);
                window.open(suitelet_url, "_blank");
            }
        }

        function downloadInvoicePrint(invoices_to_print) {
            invoices_to_print = invoices_to_print.split(",");
            for(let i=0; i< invoices_to_print.length;i++){
                const invoice_id = invoices_to_print[i];
                console.log('invoice_id = '+ invoice_id);

                const suitelet_url = url.resolveScript({
                    scriptId: 'customscript_r7_retrieve_multiple_invoic',
                    deploymentId: 'customdeploy_r7_retrieve_multiple_invoic',
                    params: {
                        custparam_invoice_id: invoice_id,
                        custparam_print: 'F'
                    },
                    returnExternalUrl: false
                });
                console.log('suitelet_url = '+ suitelet_url);
                window.open(suitelet_url, "_blank");
            }
        }

        function reset(){
            const suitelet_url = url.resolveScript({
                scriptId: 'customscript_r7_retrieve_multiple_invoic',
                deploymentId: 'customdeploy_r7_retrieve_multiple_invoic',
                returnExternalUrl: false
            });
            console.log('suitelet_url = '+ suitelet_url);
            window.open(suitelet_url, "_self");
        }

        return {
            openInvoicePrint: openInvoicePrint,
            downloadInvoicePrint: downloadInvoicePrint,
            reset: reset
        };

    });
