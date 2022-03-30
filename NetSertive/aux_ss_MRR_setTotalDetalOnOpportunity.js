

var paramLastProcId = nlapiGetContext().getSetting('SCRIPT','custscript_sct53_lastprocid'),
	paramRunALL = nlapiGetContext().getSetting('SCRIPT','custscript_sct53_runall'),
	paramOppId = nlapiGetContext().getSetting('SCRIPT','custscript_sct53_oppid');
function setDeltaTotalOnOpp() 
{
		
	try {
	
		//1. Search for all Historical records WITH opportunity and NOT inactive 
		//2/25/2016 - Add in logic to ONLY process those modified YESTERDAY.
		var oflt = [new nlobjSearchFilter('custrecord_hbmrr_opportunity',null,'noneof',['@NONE@']),
		            new nlobjSearchFilter('isinactive',null,'is','F'),
		            new nlobjSearchFilter('custrecord_abmrr_deltavalue', null, 'isnotempty','')
		            ];
		
		if (paramOppId)
		{
			oflt.push(new nlobjSearchFilter('custrecord_hbmrr_opportunity',null,'anyof',paramOppId));
		}
		
		if (!paramOppId && paramRunALL != 'T')
		{
			oflt.push(new nlobjSearchFilter('lastmodified',null,'on','yesterday'));
		}
		
		
		
		var ocol = [new nlobjSearchColumn('internalid','CUSTRECORD_HBMRR_OPPORTUNITY','group').setSort(true),
		            new nlobjSearchColumn('tranid','CUSTRECORD_HBMRR_OPPORTUNITY','group'),
		            new nlobjSearchColumn('custrecord_abmrr_deltavalue',null,'sum'),
		            new nlobjSearchColumn('custrecordhbmrr_techdeltavalue',null,'sum')];
		
		//Grab last process internal id of Opportunity in MRR History record.
		if (paramLastProcId) {
			oflt.push(new nlobjSearchFilter('internalidnumber', 'CUSTRECORD_HBMRR_OPPORTUNITY', 'lessthan', paramLastProcId));
		}
		
		var ors = nlapiSearchRecord('customrecord_ax_historybaseline_mrr', null, oflt, ocol);
		
		//2. Loop through all result and execute update on opportunity
		for (var i=0; ors && i < ors.length; i++) {
			
			//BUG Fix
			//Need to run a search for THIS Opportunity and summarize the values in historical table
			var thisOppFlt = [new nlobjSearchFilter('custrecord_hbmrr_opportunity',null,'anyof',ors[i].getValue('internalid','CUSTRECORD_HBMRR_OPPORTUNITY','group')),
					          new nlobjSearchFilter('isinactive',null,'is','F'),
					          new nlobjSearchFilter('custrecord_abmrr_deltavalue', null, 'isnotempty','')],
			    thisOppRs = nlapiSearchRecord('customrecord_ax_historybaseline_mrr', null, thisOppFlt, ocol);
			
			
			var oppid = thisOppRs[0].getValue('internalid','CUSTRECORD_HBMRR_OPPORTUNITY','group'),
				oppnum = thisOppRs[0].getValue('tranid','CUSTRECORD_HBMRR_OPPORTUNITY','group'),
				deltasum = thisOppRs[0].getValue('custrecord_abmrr_deltavalue',null,'sum'),
				deltaTechSum = (thisOppRs[0].getValue('custrecordhbmrr_techdeltavalue',null,'sum'))?thisOppRs[0].getValue('custrecordhbmrr_techdeltavalue',null,'sum'):0;
			
			try {
				//2/24/2016 - Add in Tech. Delta Total Updates
				var deltaUpdFlds = ['custbody_ax_mrr_delta_total',
				                    'custbody_ax_mrr_techdelta_total'],
				    deltaUpdVals = [deltasum,
				                    deltaTechSum];
				nlapiSubmitField('opportunity', oppid, deltaUpdFlds, deltaUpdVals, false);
				log('debug','Process', oppid+' // '+oppnum+' == Delta: '+deltasum+' // Tech.Delta: '+deltaTechSum);
				
			} catch (oppupderr) {
				
				log('error','Error Updating Opportunity','Delta Summ Update Error for Opp #'+oppnum+' with value of '+deltasum+' // '+getErrText(oppupderr));
				
				//Log Error and send Update Error notification.
				var sendErrTo = nlapiGetContext().getSetting('SCRIPT','custscript_ns_ax_param_primenotif');
				var ccTo = nlapiGetContext().getSetting('SCRIPT','custscript_ns_ax_param_ccnotif');
				if (ccTo) {
					ccTo = ccTo.split(',');
				}
				var sbj = 'Error occured Updating Delta SUM on Opp #: '+oppnum;
				var msg = 'Error occured while attempting to update Opp #: '+oppnum+' with Delta SUM value of '+deltasum+'<br/><br/>'+
						  getErrText(oppupderr);
				nlapiSendEmail(-5, sendErrTo, sbj, msg, ccTo, null, null, null);
			}
			
			
			
			//Set % completed of script processing
			var pctCompleted = Math.round(((i+1) / ors.length) * 100);
			nlapiGetContext().setPercentComplete(pctCompleted);
			
			//Reschedule logic
			if ((i+1)==1000 || ((i+1) < ors.length && nlapiGetContext().getRemainingUsage() < 2000)) {
				//reschedule
				log('debug','Getting Rescheduled at', oppid+' // '+oppnum);
				var rparam = new Object();
				rparam['custscript_sct53_lastprocid'] = oppid;
				nlapiScheduleScript(nlapiGetContext().getScriptId(), nlapiGetContext().getDeploymentId(), rparam);
				break;
			}
		}
		
	} catch (procerr) {
		
		throw nlapiCreateError('MRR-OPPDELTA-ERR', 'Script terminated due to unexpected error: '+getErrText(procerr), false);
		
	}
	
}