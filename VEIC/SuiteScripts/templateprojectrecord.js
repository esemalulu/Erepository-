/**
 * @NApiVersion 2.x
 * @NScriptType Suitelet
 */
define(['N/record', 'N/render', 'N/file'], function(record, render, file) {

    function onRequest(context) {
        if (context.request.method === 'GET') {
            var invoiceId = context.request.parameters.invoiceId; // Ensure invoice ID is passed via URL parameter
            
            if (invoiceId) {
                var pdfFile = generatePdf(invoiceId);
                context.response.writeFile(pdfFile, true); // Output the PDF file
            } else {
                context.response.write('Error: No invoice ID provided.');
            }
        }
    }

    function generatePdf(invoiceId) {
        var invoiceRecord = record.load({
            type: record.Type.INVOICE,
            id: invoiceId
        });

        // Retrieve custom field value containing task data
        var tasksData = invoiceRecord.getValue({
            fieldId: 'custbody3'
        });

        var templateFileId = 123; // Replace with your PDF template file ID

        var renderer = render.create();
        renderer.templateContent = getTemplateContent(templateFileId);
        renderer.addCustomDataSource({
            format: render.DataSource.OBJECT,
            data: {
                tasksData: tasksData
            }
        });

        var pdfFile = renderer.renderAsPdf();
        return pdfFile;
    }

    function getTemplateContent(fileId) {
        var fileObj = file.load({
            id: fileId
        });
        return fileObj.getContents();
    }

    return {
        onRequest: onRequest
    };
});
