/**
 * Module Description
 * 
 * Version    Date            Author           Remarks
 * 1.00       27 Mar 2014     AnJoe
 *
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

//Script level parameter
var paramLastProcId = nlapiGetContext().getSetting('SCRIPT', 'custscript_nsax_amrrtermid');

/**
 * @param {String} type Context Types: scheduled, ondemand, userinterface, aborted, skipped
 * @returns {Void}
 */
function terminateActualMrr(type) {

	try {
		
		var tflt = [new nlobjSearchFilter('isinactive', null, 'is','F'),
		            new nlobjSearchFilter('custrecord_abmrr_terminationdt', null, 'isnotempty'),
		            new nlobjSearchFilter('custrecord_abmrr_terminationdt', null, 'onorbefore', 'today'),
		            new nlobjSearchFilter('custrecord_abmrr_subs_status', null, 'noneof', paramSubStatusTerminateId)];
		
		if (paramLastProcId) {
			tflt.push(new nlobjSearchFilter('internalidnumber', null, 'lessthan', paramLastProcId));
		}
		
		var tcol = [new nlobjSearchColumn('internalid').setSort(true),
		            new nlobjSearchColumn('custrecord_abmrr_item'),
		            new nlobjSearchColumn('custrecord_abmrr_customer'),
		            new nlobjSearchColumn('custrecord_abmrr_terminationdt'),
		            new nlobjSearchColumn('custrecord_abmrr_linevalue'),
		            new nlobjSearchColumn('custrecord_abmrr_techlinevalue')];
		
		var trs = nlapiSearchRecord('customrecord_ax_baseline_mrr', null, tflt, tcol);
		
		for (var t=0; trs && t < trs.length; t++) {
			
			//grab Current MRR Value from customer
			//2/24/2016 - Add in Tech Related processing
			var lookupFlds = ['custentity_ax_calc_amrr',
			                  'custentity_ax_calc_atechmrr'];
			var curMrrOnCustomer = nlapiLookupField('customer', trs[t].getValue('custrecord_abmrr_customer'), lookupFlds, false);
			
			var curMrrUpdVal = 0,
				curTechMrrUpdVal = 0;
			if (curMrrOnCustomer) {
				
				if (curMrrOnCustomer['custentity_ax_calc_amrr'] && 
					parseFloat(curMrrOnCustomer['custentity_ax_calc_amrr']) > 0) 
				{
					//subtract the terminating value from Current MRR
					curMrrUpdVal = parseFloat(curMrrOnCustomer['custentity_ax_calc_amrr']) 
								   - 
								   parseFloat(trs[t].getValue('custrecord_abmrr_linevalue'));
				}
				
				if (curMrrOnCustomer['custentity_ax_calc_atechmrr'] && 
					parseFloat(curMrrOnCustomer['custentity_ax_calc_atechmrr']) > 0 &&
					trs[t].getValue('custrecord_abmrr_techlinevalue') &&
					parseFloat(trs[t].getValue('custrecord_abmrr_techlinevalue')) > 0) 
				{
						//subtract the terminating value from Current Tech MRR
						curTechMrrUpdVal = parseFloat(curMrrOnCustomer['custentity_ax_calc_atechmrr']) 
									       - 
									       parseFloat(trs[t].getValue('custrecord_abmrr_techlinevalue'));
				}
			} 
			
			log('debug',
				'Updating Current MRR of Customer ID: '+trs[t].getValue('custrecord_abmrr_customer'),
				'New Mrr Value: '+curMrrUpdVal+' // New Tech Mrr Value: '+curTechMrrUpdVal);
			
			//update customer record
			var custUpdFlds = ['custentity_ax_calc_amrr',
			                   'custentity_ax_calc_atechmrr'],
			    custUpdVals = [curMrrUpdVal,
			                   curTechMrrUpdVal];
			
			//2/24/2016 - Add in Tech Mrr related updates
			
			nlapiSubmitField('customer', trs[t].getValue('custrecord_abmrr_customer'), custUpdFlds, custUpdVals, false);
			
			//update sub status
			nlapiSubmitField('customrecord_ax_baseline_mrr', trs[t].getId(), 'custrecord_abmrr_subs_status', paramSubStatusTerminateId, false);
			
			//search for matching Possible Termination historical MRR and update it as Actual
			var hflt = [new nlobjSearchFilter('isinactive', null, 'is', 'F'),
			            new nlobjSearchFilter('custrecord_hbmrr_customer', null, 'anyof',trs[t].getValue('custrecord_abmrr_customer')),
			            new nlobjSearchFilter('custrecord_hbmrr_item', null, 'anyof',trs[t].getValue('custrecord_abmrr_item')),
			            new nlobjSearchFilter('custrecord_hbmrr_abmrr_ref', null, 'anyof', trs[t].getId()),
			            new nlobjSearchFilter('custrecord_hbmrr_projection', null, 'anyof', paramPrjTerminationId),
			            new nlobjSearchFilter('custrecord_hbmrr_historytype', null, 'anyof', paramHistPossibleId),
			            new nlobjSearchFilter('custrecord_hbmrr_termdt', null, 'on', trs[t].getValue('custrecord_abmrr_terminationdt'))];
			
			var hcol = [new nlobjSearchColumn('internalid'),
			            new nlobjSearchColumn('custrecord_hbmrr_linevalue')];
			var hrs = nlapiSearchRecord('customrecord_ax_historybaseline_mrr', null, hflt, hcol);
			
			//update matching termination history record
			for (var h=0; hrs && h < hrs.length; h++) {
				
				nlapiSubmitField('customrecord_ax_historybaseline_mrr', hrs[h].getId(),'custrecord_hbmrr_historytype', paramHistActualId, false);
				
			}
			
			if ((t+1)==1000 || (t < (t+1) && nlapiGetContext().getRemainingUsage() < 50)) {
				//reschedule
				var param = new Object();
				param['custscript_nsax_amrrtermid'] = trs[t].getId();
				
				var qstatus = nlapiScheduleScript(nlapiGetContext().getScriptId(), nlapiGetContext().getDeploymentId(), param);
				if (qstatus == 'QUEUED') {
					break;
				}
			}
		}
		
		
	} catch (tamrrerr) {
		log('error','Scheduled Actual MRR Termination Error', getErrText(tamrrerr));
		throw nlapiCreateError('MRR-ActualMrrTerminationErr', getErrText(tamrrerr), false);
		
	}
	
}
