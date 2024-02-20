/**
 * @NApiVersion 2.x
 * @NScriptType Suitelet
 * @NModuleScope SameAccount
 */
define(['N/record', 'N/redirect', './GD_PDR_HelperChecks.js'],

function(record, redirect, checksHelper) {
   
    /**
     * Definition of the Suitelet script trigger point.
     *
     * @param {Object} context
     * @param {ServerRequest} context.request - Encapsulation of the incoming request
     * @param {ServerResponse} context.response - Encapsulation of the Suitelet response
     * @Since 2015.2
     */
    function onRequest(context) {
        try {
            var pdfFile = checksHelper.getSingleCheckPdf(context.request.parameters['custparam_refundid']);
            pdfFile.name = 'Refund Check ' + context.request.parameters['custparam_tranid'] + '.pdf';
            context.response.writeFile(pdfFile);
        } catch (err) {
            log.error('Error generating Single Check PDF', err);
            redirect.toRecord({
                type: record.Type.CUSTOMER_REFUND,
                id: context.request.parameters['custparam_refundid']
            });
        }
    }

    return {
        onRequest: onRequest
    };
    
});