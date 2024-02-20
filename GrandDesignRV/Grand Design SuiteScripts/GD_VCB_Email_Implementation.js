/**
 * Module Description
 * 
 * Version    Date            Author           Remarks
 * 1.00       01 16 2017     Jeffrey Bajit
 *
 */

/**
 * plugin default to allow customization using the plugin implemenation for changes to the email 
 * @param vcbRec
 * @returns {___anonymous1191_1196}
 */
function RVS_VCB_Email_HelperMethod(vcbRec) {
	var recipientEmail = vcbRec.getFieldValue('custrecordvcb_vendoremail') || '';
	var emailFromVendorRecord = nlapiLookupField('vendor', vcbRec.getFieldValue('custrecordvcb_vendor'), 'custentityrvs_vcbvendoremail') || '';
	var params = new Object();
	params.author = nlapiGetContext().getSetting('SCRIPT', 'custscriptgd_vcbemailonprintout') || '';
	params.subject = 'VCB #' + vcbRec.getId();
	params.recipient = recipientEmail != '' ? recipientEmail : emailFromVendorRecord;
	params.body = 'In an effort to simplify the VCB process, please refer to the information provided below.<br><br>' +
					'Please see the attached required documentation.<br><br>' +
					'If this is a NO Part Return, accept this as submittal for payment.  If a part return is required, the respective part will be ready for pick up between 7 am &#45; 4 pm.  Please provide an RMA # if required.<br><br>' +
					'It is critical that we address any questions or concerns within the first 30 days of receipt.  If a VCB is not paid within 60 days, full credit will be taken.<br><br>' +
					'Thank you in advance for your cooperation.<br><br>' + 
					nlapiLoadConfiguration('companyinformation').getFieldValue('companyname');
	params.cc = null;
	params.bcc = null;
	params.pdffile = RVS_VCB_Print_GetVCBHTML(vcbRec);
	params.notifysenderonbounce = null;
	params.internalonly = null;
	params.replyto = null;
	
	return params;
}