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
var paramLastProcId = nlapiGetContext().getSetting('SCRIPT', 'custscript_nsax_hmrrdeltaid');

/**
 * @param {String} type Context Types: scheduled, ondemand, userinterface, aborted, skipped
 * @returns {Void}
 */
function updatePossibleMrrDeltaValues(type) {

	
	try {
		
		//2/24/2016 - Implement new search critiera to ONLY process those modified today.
		//			  This is an interim fix to set these values.
		//			  This fix also includes those records that were full processed (Item fulfilled) in same day
		//			  and became active.
		var tflt = [
		            	['isinactive','is','F'],
		            	'AND',
		            	[
		            	 	[
		            	 	 	['custrecord_hbmrr_historytype','anyof',['2']], //History type of Possible (ID 2)
		            	 	 	'AND',
		            	 	 	[
		            	 	 	 	['lastmodified','on','today'],
		            	 	 	 	'OR',
		            	 	 	 	['custrecord_hbmrr_abmrr_ref.lastmodified','on','today']
		            	 	 	]
		            	 	]
		            	]
		           ];
	
		/**
		 * Below logic Removed. 
		 * on 2/24/2016-This logic caused massive data discrepencyissue
		 * ,
		            	 	'OR',
		            	 	[
		            	 	 	['custrecord_hbmrr_historytype','anyof',['1']], // History type of Active (ID 1)
		            	 	 	'AND',
		            	 	 	[
		            	 	 	 	['custrecord_abmrr_actualcurrval','isempty',''],
		            	 	 	 	'OR',
		            	 	 	 	['custrecord_abmrr_deltavalue','isempty','']
		            	 	 	]
		            	 	]
		 */
	
		if (paramLastProcId)
		{
			tflt.push('AND');
			tflt.push(['internalidnumber','lessthan',paramLastProcId]);
		}
		
		
		//search for list of ALL Active Possible MRR to calculate delta
		/**
		var tflt = [new nlobjSearchFilter('isinactive', null, 'is','F'),
		            new nlobjSearchFilter('custrecord_hbmrr_historytype', null, 'anyof', paramHistPossibleId)];
		
		if (paramLastProcId) {
			tflt.push(new nlobjSearchFilter('internalidnumber', null, 'lessthan', paramLastProcId));
		}
		*/
		
		//2/24/2016 - add in Tech. Related Values
		
		var tcol = [new nlobjSearchColumn('internalid').setSort(true),
		            new nlobjSearchColumn('custrecord_hbmrr_abmrr_ref'),
		            new nlobjSearchColumn('custrecord_hbmrr_linevalue'),
		            new nlobjSearchColumn('custrecord_hbmrr_techlinevalue'),
		            new nlobjSearchColumn('custrecord_abmrr_linevalue','custrecord_hbmrr_abmrr_ref'),
		            new nlobjSearchColumn('custrecord_abmrr_techlinevalue','custrecord_hbmrr_abmrr_ref'),
		            new nlobjSearchColumn('custrecord_hbmrr_historytype')];
		
		var trs = nlapiSearchRecord('customrecord_ax_historybaseline_mrr', null, tflt, tcol);
		
		if (trs && trs.length > 0)
		{
			log('debug','size of trs',trs.length);
		}
		
		for (var t=0; trs && t < trs.length; t++) {

			var pval = parseFloat(trs[t].getValue('custrecord_hbmrr_linevalue')),
				ptechval = 0.0,
				aval = 0.0,
				atechval = 0.0,
				historyType = trs[t].getText('custrecord_hbmrr_historytype');
			
			if (trs[t].getValue('custrecord_abmrr_linevalue','custrecord_hbmrr_abmrr_ref'))
			{
				aval = parseFloat(trs[t].getValue('custrecord_abmrr_linevalue','custrecord_hbmrr_abmrr_ref'));
			}
			
			var actualRefRec = trs[t].getValue('custrecord_hbmrr_abmrr_ref');
			
			if (trs[t].getValue('custrecord_hbmrr_techlinevalue'))
			{
				ptechval = parseFloat(trs[t].getValue('custrecord_hbmrr_techlinevalue'));
			}
			
			if (trs[t].getValue('custrecord_abmrr_techlinevalue','custrecord_hbmrr_abmrr_ref'))
			{
				atechval = parseFloat(trs[t].getValue('custrecord_abmrr_techlinevalue','custrecord_hbmrr_abmrr_ref'));
			}
			
			//Run Calculation
			var delta = pval - aval,
				techDelta = ptechval - atechval;
			
			//Always update Actual current and Delta value
			var updfld = ['custrecord_abmrr_actualcurrval',
			              'custrecord_abmrr_deltavalue'],
				updval = [aval,
			              delta];
			
			//Check for Tech. Update criteria
			//Logic is spread out into nested if/else to display more clear criteira
			if (actualRefRec)
			{
				//If Actual Baseline is Set, ONLY set to update tech. MRR values if both Tech. Line Value and Base MRRs' Tech Line Value is set
				if (trs[t].getValue('custrecord_hbmrr_techlinevalue') && 
					trs[t].getValue('custrecord_abmrr_techlinevalue','custrecord_hbmrr_abmrr_ref')) 
				{
					updfld.push('custrecord_hbmrr_techactualcurrent');
					updval.push(atechval);
					
					updfld.push('custrecordhbmrr_techdeltavalue');
					updval.push(techDelta);
					
					log('debug','Baseline Has Tech Value History ID '+trs[t].getId()+' ('+historyType+')', 'Line Value: '+pval+' // Acutal Curr: '+aval+' // Delta: '+delta+' || Tech Line Value: '+ptechval+' // Tech. Actual Curr: '+atechval+' // Tech. Delta: '+techDelta);
				}
				else
				{
					log('debug','Actual DOES NOT HAVE Tech Value DO NOT PROCES Tech. History ID '+trs[t].getId()+' ('+historyType+')', 'Line Value: '+pval+' // Acutal Curr: '+aval+' // Delta: '+delta+' || NO Tech Update Due to Missing Tech Value');
				}
			}
			else
			{
				//This is NEW Possible, ONLY process if lines' tech value is set
				if (trs[t].getValue('custrecord_hbmrr_techlinevalue'))
				{
					updfld.push('custrecord_hbmrr_techactualcurrent');
					updval.push(atechval);
					
					updfld.push('custrecordhbmrr_techdeltavalue');
					updval.push(techDelta);
					
					log('debug','Possible LINE Has Tech Value History ID '+trs[t].getId()+' ('+historyType+')', 'Line Value: '+pval+' // Acutal Curr: '+aval+' // Delta: '+delta+' || Tech Line Value: '+ptechval+' // Tech. Actual Curr: '+atechval+' // Tech. Delta: '+techDelta);
				}
				else
				{
					log('debug','Line DOES NOT HAVE Tech Value DO NOT PROCES Tech. History ID '+trs[t].getId()+' ('+historyType+')', 'Line Value: '+pval+' // Acutal Curr: '+aval+' // Delta: '+delta+' || NO Tech Update Due to Missing Tech Value');
				}
			}
			
			//udpate
			nlapiSubmitField('customrecord_ax_historybaseline_mrr', trs[t].getId(),updfld, updval, false);
			
			log('debug','Updated History ID',trs[t].getId()+' ('+historyType+')');
			
			//Set % completed of script processing
			var pctCompleted = Math.round(((t+1) / trs.length) * 100);
			nlapiGetContext().setPercentComplete(pctCompleted);
			
			
			if ((t+1)==1000 || (t < (t+1) && nlapiGetContext().getRemainingUsage() < 100)) {
				//reschedule
				var param = new Object();
				param['custscript_nsax_hmrrdeltaid'] = trs[t].getId();
				
				var qstatus = nlapiScheduleScript(nlapiGetContext().getScriptId(), nlapiGetContext().getDeploymentId(), param);
				if (qstatus == 'QUEUED') {
					break;
				}
			}
		}
		
	} catch (tamrrerr) {
		log('error','Scheduled Historical Possible MRR Update Error', getErrText(tamrrerr));
		throw nlapiCreateError('MRR-CalcDeltaErr', getErrText(tamrrerr), false);
	}
	
}
