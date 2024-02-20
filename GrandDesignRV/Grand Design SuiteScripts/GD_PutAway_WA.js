/**
 * Workflow Action on the Item Receipt record that creates a Put-Away Worksheet printout
 * 
 * Version    Date            Author           Remarks
 * 1.00       05 Dec 2016     Jacob Shetler
 *
 */

/**
 * @returns {Void} Any or no return value
 */
function GD_PutAway_WA()
{
	nlapiSetRedirectURL('suitelet', 'customscriptgd_putawayitemreceipt_suite', 'customdeploygd_putawayitemreceipt_suite', false, {custpage_irid: nlapiGetRecordId()});
}

/**
 * Started from the Item Receipt, generates a printout.
 * 
 * @param {nlobjRequest} request Request object
 * @param {nlobjResponse} response Response object
 * @returns {Void} Any output is written via response object
 */
function GD_PutAway_IRSuitelet(request, response)
{
	var pdfTitle = 'Put-Away Worksheet.pdf';
	var html = GD_GeneratePutAwayWorksheet([request.getParameter('custpage_irid')]);
	PrintPDFInSuiteLet(request, response, pdfTitle, html);
}
