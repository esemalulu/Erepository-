/**
 * Module Description
 * 
 * Version    Date            Author           Remarks
 * 1.00       20 Mar 2014     AnJoe
 *
 */

/**
 * @param {nlobjRequest} req Request object
 * @param {nlobjResponse} res Response object
 * @returns {Void} Any output is written via response object
 */

var openOppStatusIds = nlapiGetContext().getSetting('SCRIPT', 'custscript_ns_ax_param_openstatusids').split(',');
//Loop through each status ID and trim any empty spaces
for (var os=0; openOppStatusIds && os < openOppStatusIds.length; os++) {
	openOppStatusIds[os] = strTrim(openOppStatusIds[os]);
}
var primeNotifer = nlapiGetContext().getSetting('SCRIPT', 'custscript_ns_ax_param_primenotif');
var ccNotifier = null;
if (nlapiGetContext().getSetting('SCRIPT', 'custscript_ns_ax_param_ccnotif')) {
	ccNotifier = nlapiGetContext().getSetting('SCRIPT', 'custscript_ns_ax_param_ccnotif').split(',');
}

var paramPrjNewId = nlapiGetContext().getSetting('SCRIPT', 'custscript_ns_ax_param_prjnew');
var paramPrjNeutralId = nlapiGetContext().getSetting('SCRIPT', 'custscript_ns_ax_param_prjnet');
var paramPrjUpId = nlapiGetContext().getSetting('SCRIPT', 'custscript_ns_ax_param_prjup');
var paramPrjDownId = nlapiGetContext().getSetting('SCRIPT', 'custscript_ns_ax_param_prjdown');
var paramPrjTerminationId = nlapiGetContext().getSetting('SCRIPT', 'custscript_ns_ax_param_prjterm');

var paramHistPossibleId = nlapiGetContext().getSetting('SCRIPT', 'custscript_ns_ax_param_histpossible');
var paramHistActualId = nlapiGetContext().getSetting('SCRIPT', 'custscript_ns_ax_param_histactual');

var paramSubStatusRenewedId = nlapiGetContext().getSetting('SCRIPT', 'custscript_ns_ax_param_substrenew');
var paramSubStatusTerminateId = nlapiGetContext().getSetting('SCRIPT', 'custscript_ns_ax_param_substtermin');

function getActualMrr(req, res){

	var retobj = {
		'0':'New Item',
		'-1':'One Time Spend'
	};
	
	var customerId = req.getParameter('trxcustomer');
	try {
		
		if (customerId) {
			
			//search for matching actual MRR records
			//subscription status NONE OF Terminated (2)
			var aflt = [new nlobjSearchFilter('custrecord_abmrr_customer', null, 'anyof',customerId),
			            new nlobjSearchFilter('isinactive', null, 'is','F'),
			            new nlobjSearchFilter('custrecord_abmrr_subs_status', null, 'noneof',paramSubStatusTerminateId)];
			var acol = [new nlobjSearchColumn('internalid'),
			            new nlobjSearchColumn('name')];
			var ars = nlapiSearchRecord('customrecord_ax_baseline_mrr', null, aflt, acol);
			for (var a=0; ars && a < ars.length; a++) {
				retobj[ars[a].getValue('internalid')] = ars[a].getValue('name'); 
			}
		}
	} catch (getamrrerr) {
		log('error','Error Getting List of Actual MRR','Customer ID: '+customerId);
		nlapiSendEmail(-5, primeNotifer, 'Error ax_sl_Get_ActualMrrList_by_Customer.js', 'Customer Internal ID: '+customerId+'<br/>'+getErrText(mrrrptuierr), ccNotifier, null, null, null);
	}
	
	//return JSON text
	res.write(JSON.stringify(retobj));
	
}
