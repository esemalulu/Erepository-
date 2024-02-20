/**
 * Navigate back to the parts tab. 
 * 
 * Version    Date            Author           Remarks
 * 1.00      11 Mar 2019      Lydia Miller
 *
 */

/**
 * @param {nlobjRequest} request Request object
 * @param {nlobjResponse} response Response object
 * @returns {Void} Any output is written via response object
 */
function GD_PortalNav_Suitelet(request, response)
{
	var recId = request.getParameter('recid');
	var tranId = request.getParameter('tranid');

	var pnForm = nlapiCreateForm('Portal Nav',false);
	
	pnForm.addField('custpage_status', 'inlinehtml', '').setDefaultValue('click here to go back to the parts tab');
	
	var domain = nlapiGetContext().getSetting('SCRIPT', 'custscriptwebsitemyaccountdomainurl');
	var suiteletURL = domain + nlapiResolveURL('SUITELET','customscriptgd_viewrecordinportal_suite', 'customdeploygd_viewrecordinportal_suite', null)+'&rectype=estimate&recid='+recId;
	
	var message = "<br/><br/>Parts Order # <span style='color: #666666;'>" + tranId + "</span> was successfully submitted.<br/>";
	
	pnForm.addField('custpage_html','inlinehtml').setDefaultValue('<div style="padding-left: 50px;"><p style="font-size:18px; font-weight: bold"><br />' + message + '<br />' +
			'<a  style="font-size:16px; padding-left: 55px" href="' + suiteletURL + '" target="_blank"> >> Click to view printout</a></div>');
	
	response.writePage(pnForm);
}