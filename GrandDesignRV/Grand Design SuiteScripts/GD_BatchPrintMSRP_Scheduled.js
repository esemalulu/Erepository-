/**
 * Module Description
 *
 * Version    Date            Author           Remarks
 * 1.00       30 Jan 2019     SidH
 *
 */

/**
 * @param {String} type Context Types: scheduled, ondemand, userinterface, aborted, skipped
 * @returns {Void}
 */
function GetBatchMSRPHTML() {
    var salesOrderIdsText = nlapiGetContext().getSetting('SCRIPT', 'custscriptsalesorderids');
    var filename = nlapiGetContext().getSetting('SCRIPT', 'custscriptfilename');

    var salesOrderIds = JSON.parse(salesOrderIdsText);

    var failedMSRPs = [];

    var pdfHTML = '<pdf>';
    for (var i = 0; i < salesOrderIds.length; i++)
    {
    	try {
	    	if(nlapiGetContext().getRemainingUsage() < 100)
	    		nlapiYieldScript();

    		pdfHTML += GetMSRPHTML(salesOrderIds[i]);
    	} catch (error){
    		failedMSRPs.push(salesOrderIds[i])
    	}
    }

    pdfHTML += '</pdf>';

    try {
	    var xml = "<?xml version=\"1.0\"?>\n<!DOCTYPE pdf PUBLIC \"-//big.faceless.org//report\" \"report-1.1.dtd\">\n<pdfset>" + pdfHTML + "</pdfset>";
	    var file = nlapiXMLToPDF(xml);

	    file.setName(filename);
	    // MSRP PDFs
	    var folderId = nlapiGetContext().getSetting('SCRIPT', 'custscriptgd_batchprintmsrp');
	    file.setFolder(folderId);

    	nlapiSubmitFile(file);
    } catch (error) {
    	failedMSRPs = salesOrderIds;
    } finally {
    	var failedMSRPSalesOrderNumbers = new Array();
    	for (var i = 0; i < failedMSRPs.length; i++)
    	{
    		if(nlapiGetContext().getRemainingUsage() < 100)
	    		nlapiYieldScript();

    		var salesOrderId = nlapiLookupField('salesorder', failedMSRPs[i], 'tranid');
    		nlapiLogExecution('DEBUG', 'salesOrderId', salesOrderId);
    		failedMSRPSalesOrderNumbers.push(salesOrderId == null ? ('InternalID: ' + failedMSRPs[i]) : salesOrderId);
    	}

    	if (failedMSRPSalesOrderNumbers.length > 0)
    		nlapiSendEmail(nlapiGetUser(), nlapiGetUser(), 'MSRP(s) Failed to Generate', 'Sales Order #s:\n' + JSON.stringify(failedMSRPSalesOrderNumbers));

        // If any MSRPs did not fail, send an email of the PDF.
        if (salesOrderIds.length != failedMSRPSalesOrderNumbers.length)
        {
            // Get datacenter URL
            var companyId = nlapiGetContext().getCompany();
            companyId = companyId.toLowerCase();
            companyId = companyId.replace('_', '-');
            var domain = 'https://' + companyId + '.app.netsuite.com';
            nlapiLogExecution('DEBUG', 'domain', domain);

            var folderURL = domain +
                '/app/common/media/mediaitemfolders.nl?whence=&folder=' +
                nlapiLoadFile('MSRP PDFs/' + filename).getFolder();
            nlapiSendEmail(nlapiGetUser(), nlapiGetUser(), 'MSRP(s) Generated', '<a href=' + folderURL + '>' + filename + '</a>');
        }
    }
}