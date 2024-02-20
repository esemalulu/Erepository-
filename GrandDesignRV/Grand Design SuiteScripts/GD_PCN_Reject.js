/**
 * Workflow Action and Suitelet to reject a PCN.
 * 
 * Version    Date            Author           Remarks
 * 1.00       07 Jun 2016     Jacob Shetler
 *
 */

var RECTYPE_PCN = 'customrecordrvsproductchangenotice';

/**
 * Redirects to the suitelet to reject a PCN.
 */
function GDPCN_RejectWkflow()
{
	nlapiSetRedirectURL('suitelet', 'customscriptgd_pcnreject', 'customdeploygd_pcnreject', null, {'custpage_pcnid' : nlapiGetRecordId()});
}

/**
 * Provides a form to reject a PCN. Redirects to the PCN after completion.
 * 
 * @param {nlobjRequest} request Request object
 * @param {nlobjResponse} response Response object
 * @returns {Void} Any output is written via response object
 */
function GDPCN_RejectSuitelet(request, response)
{
	var pcnId = request.getParameter('custpage_pcnid');
	if (pcnId == null || pcnId.length == 0) throw 'This page must be loaded from a PCN.';
	
	if (request.getMethod() == 'GET')
	{
		var form = nlapiCreateForm('Reject PCN');
		form.addField('custpage_rejectreason', 'textarea', 'Enter a Rejection Reason').setMandatory(true);
		form.addField('custpage_pcnid', 'text', 'hidden').setDisplayType('hidden').setDefaultValue(pcnId);
		form.addSubmitButton('Reject');
		response.writePage(form);
	}
	else
	{
		//Change the PCN Status to Rejected, set the Rejected Reason on the form, and send emails. 
		nlapiSubmitField(RECTYPE_PCN, pcnId, 'custrecordproductchangenotice_status', GD_PCNSTATUS_REJECTED);
		nlapiSubmitField(RECTYPE_PCN, pcnId, 'custrecordgd_pcnrejectedreason', request.getParameter('custpage_rejectreason'));
		GDPCN_SendEmails(nlapiLoadRecord(RECTYPE_PCN, pcnId));
		nlapiSetRedirectURL('record', RECTYPE_PCN, pcnId, false);
	}
}
