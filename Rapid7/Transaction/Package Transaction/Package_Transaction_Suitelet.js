/**
 * @NApiVersion 2.x
 * @NScriptType suitelet
 * @NModuleScope sameaccount
 */

define([
    'N/render',
    'N/log',
    'N/email',
    '/SuiteScripts/Transaction/Package Transaction/Package_Transaction_Library.js'
], function (render, log, email, pckInvLib) {
    function onRequest(context) {
        if (context.request.method === 'GET') {
            try {
                var transactionId = Number(context.request.parameters.id);

                var transactionRec = pckInvLib.getPackagedRecord(transactionId);

                if (transactionRec.type === 'invoice') {
                    outputInvoice(transactionRec, context);
                } else if (transactionRec.type === 'estimate'){
                    outputQuote(transactionRec, context);
                } else {
                    outputCreditMemo(transactionRec, context);
                }
            } catch (e) {
                log.debug({
                    title: 'ERROR',
                    details: 'error is: ' + e,
                });
            }
        }
    }

    function outputCreditMemo(creditMemoRec, context) {
        var renderer = render.create();
        var templateId = 110; // hardcode to only possible credit memo template
        renderer.setTemplateById(templateId);
        renderer.addRecord({
            templateName: 'record',
            record: creditMemoRec,
        });
        var str = renderer.renderAsString();
        context.response.renderPdf(str);
    }

    function outputInvoice(invoiceRec, context) {
        var renderer = render.create();
        // renderer.setTemplateByScriptId({ scriptId: "CUSTTMPL_663271_105" });
        // set appropriate template ID (no other way found, since no possibility to go to Form of the record a get the template from there)
        var templateId = invoiceRec.getValue('custbodyr7onepriceinvoice') === true ? 108 : 109;
        renderer.setTemplateById(templateId);
        // renderer.setTemplateById(109);
        renderer.addRecord({
            templateName: 'record',
            record: invoiceRec,
        });

        var str = renderer.renderAsString();
        // var newStr = str.replace(/&/gi, '&amp;');
        // var newNewStr = newStr.replace(/\u00A0/g, '')
        context.response.renderPdf(str);
    }


    //get the quote template
    function outputQuote(quoteRec, context){
        var renderer = pckInvLib.renderQuote(quoteRec);
        var str = renderer.renderAsString();
        context.response.renderPdf(str);
    }

    return {
        onRequest: onRequest,
    };
});
