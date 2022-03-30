/**
 * Module Description
 * 
 * Version    Date            Author           Remarks
 * 1.00       27 Mar 2014     AnJoe
 *
 */

//NOT Needed after 4/9/2014 Call with NetSertive.
//Keep it JUST incase


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
var paramLastProcId = nlapiGetContext().getSetting('SCRIPT', 'custscript_nsax_prmrrcustid');

/**
 * @param {String} type Context Types: scheduled, ondemand, userinterface, aborted, skipped
 * @returns {Void}
 */
function calculateUpdateReportMrr(type) {

	try {
		
		//search list of unique Customers in Historical Baseline
		var tflt = [new nlobjSearchFilter('isinactive', null, 'is','F')];
		
		if (paramLastProcId) {
			tflt.push(new nlobjSearchFilter('internalidnumber', 'custrecord_hbmrr_customer', 'lessthan', paramLastProcId));
		}
		
		var tcol = [new nlobjSearchColumn('internalid','custrecord_hbmrr_customer', 'group').setSort(true),
		            new nlobjSearchColumn('custrecord_hbmrr_customer', null, 'group')];
		var trs = nlapiSearchRecord('customrecord_ax_historybaseline_mrr', null, tflt, tcol);
		
		for (var t=0; trs && t < trs.length; t++) {
			
			var custId = trs[t].getValue('custrecord_hbmrr_customer', null,'group');
			log('debug','customer internal id', custId);
			
			//---------------------------------- Step 1: Delete existing report record for THIS customer ---------------------
			//Delete all Projected Report Records
			var prflt = [new nlobjSearchFilter('custrecord_prmrr_customer', null, 'anyof', custId)]
			var prcol = [new nlobjSearchColumn('internalid')];
			var prrs = nlapiSearchRecord('customrecord_ax_projectionreport_mrr', null, prflt, prcol);
			for (var p=0; prrs && p < prrs.length; p++) {
				nlapiDeleteRecord('customrecord_ax_projectionreport_mrr', prrs[p].getId());
			}
			
			//---------------------------------- Step 2: Get List of Renewed Actual MRR for each Items for THIS Customer ---------------------
			//get list of Actual MRR values for each items for THIS customer 
			var aflt = [new nlobjSearchFilter('isinactive', null, 'is','F'),
			            new nlobjSearchFilter('custrecord_abmrr_subs_status', null, 'noneof', paramSubStatusTerminateId),
			            new nlobjSearchFilter('custrecord_abmrr_customer', null, 'anyof', custId)];
			var acol = [new nlobjSearchColumn('custrecord_abmrr_item').setSort(true),
			            new nlobjSearchColumn('custrecord_abmrr_linevalue')];
			var ars = nlapiSearchRecord('customrecord_ax_baseline_mrr', null, aflt, acol);
			
			//collect Actual MRR values for this client
			var custItemJson = {};
			for (var a=0; ars && a < ars.length; a++) {
				if (!custItemJson[ars[a].getValue('custrecord_abmrr_item')]) {
					custItemJson[ars[a].getValue('custrecord_abmrr_item')] = 0.0;
				}
				
				custItemJson[ars[a].getValue('custrecord_abmrr_item')] = parseFloat(custItemJson[ars[a].getValue('custrecord_abmrr_item')]) + 
																		 parseFloat(ars[a].getValue('custrecord_abmrr_linevalue'));
			}
			
			//---------------------------------- Step 3: Get Possible MRR Items for THIS Customer ---------------------
			//get list of Possible MRR Item Values for Customer
			//FROM Historical Record
			//WILL ONLY return Expected Closed Date that is AFTER Current Date.
			var tiflt = [new nlobjSearchFilter('isinactive', null, 'is','F'), 
			             new nlobjSearchFilter('custrecord_hbmrr_customer', null, 'anyof', custId),
			             new nlobjSearchFilter('custrecord_hbmrr_historytype', null, 'anyof',[paramHistPossibleId]),
			             new nlobjSearchFilter('custrecord_hbmrr_poexpclosedt', null, 'after', nlapiDateToString(new Date()))];
			
			var ticol = [new nlobjSearchColumn('custrecord_hbmrr_item').setSort(true),
			             new nlobjSearchColumn('custrecord_hbmrr_projection'),
			             new nlobjSearchColumn('custrecord_hbmrr_linevalue')];
			var tirs = nlapiSearchRecord('customrecord_ax_historybaseline_mrr', null, tiflt, ticol);
			
			//for each item, build Possible TOTAL value and count
			//Average Possible value will be calculated and compared against actual
			var possibleItemJson = {};
			
			for (var ti=0; tirs && ti < tirs.length; ti++) {
				hasPossible = true;
				var itemId = tirs[ti].getValue('custrecord_hbmrr_item');
				if (!possibleItemJson[itemId]) {
					//get total possible values AND count
					possibleItemJson[itemId] = {
						"total":0.0,
						"count":0
					}
				}
				
				possibleItemJson[itemId].total = parseFloat(possibleItemJson[itemId].total) + parseFloat(tirs[ti].getValue('custrecord_hbmrr_linevalue'));
				possibleItemJson[itemId].count = parseInt(possibleItemJson[itemId].count)+1;
			}
			
			//---------------------------------- Step 4: Loop through possibilities and add to report table ---------------------
			for (var ps in possibleItemJson) {
				var actual = 0.0;
				var possibleavg = parseFloat(possibleItemJson[ps].total) / parseInt(possibleItemJson[ps].count);
				var delta = 0.0;
				if (custItemJson[ps]) {
					actual = custItemJson[ps];
					delta = possibleavg - parseFloat(actual);
				} else {
					delta = possibleavg;
				}
				
				log('debug','cust//actual//possible//delta', custId+' // '+actual+' // '+possibleavg+' // '+delta);
				
				var prrec = nlapiCreateRecord('customrecord_ax_projectionreport_mrr');
				prrec.setFieldValue('custrecord_prmrr_customer', custId);
				prrec.setFieldValue('custrecord_prmrr_item', ps);
				prrec.setFieldValue('custrecord_prmrr_actualval', actual);
				prrec.setFieldValue('custrecord_prmrr_avgppval', possibleavg);
				prrec.setFieldValue('custrecord_prmrr_prjdelta', delta);
				nlapiSubmitRecord(prrec, false, true);
			}
			
			//---------------------------------- Step 5: If No possible, add neutral from actual ---------------------
			for (var as in custItemJson) {
				
				if (!possibleItemJson[as]) {
					var prrec = nlapiCreateRecord('customrecord_ax_projectionreport_mrr');
					prrec.setFieldValue('custrecord_prmrr_customer', custId);
					prrec.setFieldValue('custrecord_prmrr_item', as);
					prrec.setFieldValue('custrecord_prmrr_actualval', custItemJson[as]);
					prrec.setFieldValue('custrecord_prmrr_avgppval', custItemJson[as]);
					prrec.setFieldValue('custrecord_prmrr_prjdelta', 0);
					nlapiSubmitRecord(prrec, false, true);
				}
				
			}
			
			
			if ((t+1)==1000 || (t < (t+1) && nlapiGetContext().getRemainingUsage() < 50)) {
				//reschedule
				var param = new Object();
				param['custscript_nsax_prmrrcustid'] = trs[t].getValue('custrecord_hbmrr_customer', null,'group');
				
				var qstatus = nlapiScheduleScript(nlapiGetContext().getScriptId(), nlapiGetContext().getDeploymentId(), param);
				if (qstatus == 'QUEUED') {
					break;
				}
			}
		}
		
		
	} catch (tamrrerr) {
		log('error','Scheduled Projection Report MRR Calculation Error', getErrText(tamrrerr));
		
	}
	
}
