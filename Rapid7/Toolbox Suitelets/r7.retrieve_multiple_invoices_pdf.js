/**
 *  @NAPIVersion 2.1
 *  @NModuleScope Public
 *  @NScriptType Suitelet
 */
define([
    'N/log',
    'N/ui/serverWidget',
    'N/render'
], function (log, ui, render) {
    function onRequest(context) {

        if(context.request.parameters['custparam_invoice_id'] && context.request.parameters['custparam_print'] === 'T'){
            const invoice_id = context.request.parameters['custparam_invoice_id'];
            const transactionFile = generatePDF(invoice_id);
            log.debug('transactionFile', transactionFile);
            context.response.writeFile(transactionFile, true);
            return;
        }

        if(context.request.parameters['custparam_invoice_id'] && context.request.parameters['custparam_print']=== 'F'){
            const invoice_id = context.request.parameters['custparam_invoice_id'];
            const transactionFile = generatePDF(invoice_id);
            log.debug('transactionFile', transactionFile);
            return context.response.writeFile(transactionFile);
        }

        if (context.request.method === 'GET') {
            let form = buildForm();
            let invoice_list_field = form.getField({id: 'custpage_invoices_to_print'})
            invoice_list_field.isMandatory = true;
            form.addSubmitButton({ label: 'Submit' });
            return context.response.writePage(form);
        }

        if (context.request.method === 'POST') {
            let invoices_to_print= context.request.parameters['custpage_invoices_to_print'];
            log.debug('invoices_to_print', invoices_to_print);
            const delimiter = /\u0005/;
            invoices_to_print = invoices_to_print.split(delimiter);
            log.debug('invoices_to_print', invoices_to_print);

            let form = buildForm();
            let invoice_list_field = form.getField({id: 'custpage_invoices_to_print'});
            invoice_list_field.defaultValue = invoices_to_print;
            invoice_list_field.label = "Selected Invoices"
            invoice_list_field.updateDisplayType({
                displayType : ui.FieldDisplayType.INLINE
            });

            form.clientScriptModulePath = 'SuiteScripts/Toolbox Suitelets/r7.invoicepdf.helper.js';

            form.addButton({
                id: 'custpage_print_pdf',
                label: 'Print PDF',
                functionName: 'openInvoicePrint(\'' + invoices_to_print + '\')'
            });
            form.addButton({
                id: 'custpage_download_pdf',
                label: 'Download PDF',
                functionName: 'downloadInvoicePrint(\'' + invoices_to_print + '\')'
            });
            form.addButton({
                id: 'custpage_reset',
                label: 'Reset',
                functionName: 'reset'
            });

            return context.response.writePage(form);
        }
    }

    function buildForm(){
        const form = ui.createForm({ title: 'Print/Download Invoices PDF' });
        form.addField({
            id: 'custpage_invoices_to_print',
            label: 'Select Invoices',
            source: 'invoice',
            type: ui.FieldType.MULTISELECT
        });
        return form;
    }

    function generatePDF(invoice_id){
        const transactionFile = render.transaction({
            entityId: parseInt(invoice_id),
            printMode: render.PrintMode.PDF,
            inCustLocale: true
        });
        log.debug('transactionFile', transactionFile);
        return transactionFile;
    }

    return {
        onRequest
    };
});