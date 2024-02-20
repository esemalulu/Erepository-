/**
 * Module Description
 * 
 * Version    Date            Author           Remarks
 * 1.00       07 211 2016     Jeffrey Bajit
 *
 */

/**
 * Description: Using the form Parts Order form printout layout, the record is printed.
 * Use: Suitelet
 * @param {nlobjRequest} request Request object
 * @param {nlobjResponse} response Response object
 * @returns {Void} Any output is written via response object
 */
function GD_DealerPortal_PartPrintoutSuitelet(request, response)
{
	// Get form Id and transaction id.
	var formId = GetRVSInternalPartOrderForm() || '';
	var tranId = request.getParameter('custparam_printdealerportalparts_salesorderid') || '';

	if (tranId != '' && formId != '')
	{
		var properties = new Array();
		properties.formnumber = formId;
		// Print using the form.
		PrintPDFInSuiteletRecord(request, response, 'Sales Order #' + tranId + '.pdf', 'TRANSACTION', tranId, 'PDF', properties);	
	}
	else
		response.write('Could not perform requested operation. Make sure that Parts Invoice Pro Forma Form ID is set under Setup->Company->General Preferences.<br />Click <a href="javascript:history.back()">here</a> to go back.');
}