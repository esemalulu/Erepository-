/**
 * Scheduled script to run against Active or Pending Renewal AX:EXTOL Maintenance to process against below:
	If Execution date is 7/1/2015, to bring out correct active and pending renewal,
	you would do
	
	//HAS to be done Early in the MORNING
	
	Current Date == Ent. Start Date
	OR
	Current Date - 1 == Ent. End Date
	
	ABOVE logic equates to what is deifned in Doc
	IF Today (7/1/2015) is == (Current Active End Date + 1) (6/30/2015 +1 = 7/1/2015)
		IF Status is Active 
		- Update to Expired
		Otherwise
		- Update Current Start Date == Today (Pending Renewal) to Active
		
 * Result will be Grouped in a single invoice
 */

function processInstallBaseAssetState() {
	//Company Level Params
	var paramPrimaryErrorNotifier = nlapiGetContext().getSetting('SCRIPT', 'custscript_104_axibprimeerr');
	var paramCcErrorNotifier = nlapiGetContext().getSetting('SCRIPT', 'custscript_104_axibccerr');
	if (paramCcErrorNotifier) {
		paramCcErrorNotifier = paramCcErrorNotifier.split(',');
	} else {
		paramCcErrorNotifier = null; 
	}
	
	var paramCcProcLogNotifier = nlapiGetContext().getSetting('SCRIPT','custscript_104_axibccproclog');
	if (paramCcProcLogNotifier) {
		paramCcProcLogNotifier = paramCcProcLogNotifier.split(',');
	} else {
		paramCcProcLogNotifier = null; 
	}
	
	
	var paramLastProcId = nlapiGetContext().getSetting('SCRIPT', 'custscript_114_lastprocid');
	var paramCustomExecDate = nlapiGetContext().getSetting('SCRIPT', 'custscript_114_custexecdate');
	var paramCustomExecCustomer = nlapiGetContext().getSetting('SCRIPT', 'custscript_114_custexeccustomer');
	
	//Current Date unless custom date is passed in.
	//Script will assume TODAY is custom date passed in IF set
	var currDate = nlapiDateToString(new Date());
	if (paramCustomExecDate) {
		currDate = paramCustomExecDate;
	}
	
	//49 = Customer Status noneof Customer - Former
	//Customer MUST be NOT inactive
	//1 = Maint. State of Active
	
	//Based on Current Date that's running, subtract 1 day TO IT to get list of all customers/maint to process
	//You subtract 1 day because we are processing 1 day AFTER entitlement end date has passed
	var procEntEndDate = nlapiDateToString(nlapiAddDays(nlapiStringToDate(currDate), -1));
	log('debug','Check', 'Current Date: '+currDate+' // Process Date: '+procEntEndDate);
	
	var rfltexp = [
					[
					 	['custrecord_aemaint_soentenddt', 'on', procEntEndDate],
					 	'OR',
					 	['custrecord_aemaint_soentstartdt', 'on', currDate]
					],
					'AND',
					['custrecord_aemaint_customer.status','noneof',['49']],
					'AND',
					['custrecord_aemaint_customer.isinactive','is','F'],
					'AND',
					['isinactive', 'is', 'F'],
					'AND',
					['custrecord_aemaint_state','anyof',['1','4']],
					'AND',
					['custrecord_aemaint_soentenddt','isnotempty','']
	               ];
	
	var rcol = [new nlobjSearchColumn('internalid','custrecord_aemaint_customer', 'group').setSort(true)];
	
	//Incase it was rescheduled, make sure it returns where it left off
	if (paramLastProcId) 
	{
		//rflt.push(new nlobjSearchFilter('internalidnumber', 'custrecord_aemaint_customer', 'lessthan', paramLastProcId));
		rfltexp.push('AND');
		rfltexp.push(['custrecord_aemaint_customer.internalidnumber','lessthan',paramLastProcId]);
	}
	
	//Incase custom exec customer value is passed in.
	if (paramCustomExecCustomer)
	{
		//rflt.push(new nlobjSearchFilter('custrecord_aemaint_customer',null,'anyof',paramCustomExecCustomer));
		rfltexp.push('AND');
		rfltexp.push(['custrecord_aemaint_customer', 'anyof', paramCustomExecCustomer]);
	}
	
	//FINALLY, Add in 
	//Daily Process log 
	var processLog = '';
	
	var rrs = nlapiSearchRecord('customrecord_aemaint', null, rfltexp, rcol);

	//loop through each and Maint. Install Base Record
	for (var i=0; rrs && i < rrs.length; i += 1) 
	{
		var customerId = rrs[i].getValue('internalid','custrecord_aemaint_customer', 'group');
		
		//11/1/2015 -
		//	Bug Fix to make sure it ONLY processes if customerId is set.
		//	There are instances where the record actually exists WITHOUT a customer. THIS is a true defect.
		//	
		if (customerId)
		{
			processLog += '<br/><br/> - '+rrs[i].getText('internalid','custrecord_aemaint_customer', 'group')+' ('+customerId+')<br/>';
			//log('debug','Run Renewal For '+customerId+' // '+entEndDate);
		
	 		//Re-run the parent search but ONLY against Customer in THIS Loop
			var pfltexp = [
							[
							 	['custrecord_aemaint_soentenddt', 'on', procEntEndDate],
							 	'OR',
							 	['custrecord_aemaint_soentstartdt', 'on', currDate]
							],
							'AND',
							['custrecord_aemaint_customer.status','noneof',['49']],
							'AND',
							['custrecord_aemaint_customer.isinactive','is','F'],
							'AND',
							['isinactive', 'is', 'F'],
							'AND',
							['custrecord_aemaint_state','anyof',['1','4']],
							'AND',
							['custrecord_aemaint_soentenddt','isnotempty',''],
							'AND',
							['custrecord_aemaint_customer', 'anyof', customerId]
			               ];
			
	 		var proccol = [new nlobjSearchColumn('internalid').setSort(true),
	 		               new nlobjSearchColumn('custrecord_aemaint_state'),
	 		               new nlobjSearchColumn('custrecord_aemaint_soentstartdt'),
	 		               new nlobjSearchColumn('custrecord_aemaint_soentenddt')];
	 		
	 		var procrs = nlapiSearchRecord('customrecord_aemaint', null, pfltexp, proccol);
	 		
	 		//Go througgh each and run below logic
	 		/**
				If Execution date is 7/1/2015, to bring out correct active and pending renewal,
				you would do
				Current Date == Ent. Start Date
				OR
				Current Date - 1 == Ent. End Date
				
				ABOVE logic equates to what is deifned in Doc
				IF Today (7/1/2015) is == (Current Active En Date + 1) (6/30/2015 +1 = 7/1/2015)
					IF Status is Active 
					- Update to Expired
					Otherwise
					- Update Current Start Date == Today (Pending Renewal) to Active
				**/
	 		var paramAssetPendingRenewalState = '4'; //AX:EXTOL State
	 		var paramAssetExpiredState = '2'; //AX:Extol State
	 		var paramAssetActiveState = '1'; //AX:Extol State 
	 		
	 		for (var pp=0; procrs && pp < procrs.length; pp += 1) {
	 			
	 			log('debug','Process Customer '+customerId,
	 					procrs[pp].getValue('internalid')+' // '+procrs[pp].getText('custrecord_aemaint_state')+
	 					' // Start: '+procrs[pp].getValue('custrecord_aemaint_soentstartdt')+' // End: '+procrs[pp].getValue('custrecord_aemaint_soentenddt'));
	 			
	 			var maintAssetRec = nlapiLoadRecord('customrecord_aemaint', procrs[pp].getValue('internalid'));
	 			//Check to see if stat is active
	 			if (procrs[pp].getValue('custrecord_aemaint_state')==paramAssetActiveState && 
	 				procrs[pp].getValue('custrecord_aemaint_soentenddt') == procEntEndDate)
	 			{
	 				try {
	 					
	 					//Create up Backup Maint Record to legacy custom recorcd 
	 					var legacyAssetRec = nlapiCreateRecord('customrecord_aelegacy', {recordmode:'dynamic'});
	 					legacyAssetRec.setFieldValue('custrecord_aeleg_customer',maintAssetRec.getFieldValue('custrecord_aemaint_customer'));
	 					legacyAssetRec.setFieldValue('custrecord_aeleg_item',maintAssetRec.getFieldValue('custrecord_aemaint_item'));
	 					legacyAssetRec.setFieldValue('custrecord_aeleg_itemdesc',maintAssetRec.getFieldValue('custrecord_aemaint_itemdesc'));
	 					legacyAssetRec.setFieldValue('custrecord_aeleg_itemqty',maintAssetRec.getFieldValue('custrecord_aemaint_itemqty'));
	 					legacyAssetRec.setFieldValue('custrecord_aeleg_itemclass',maintAssetRec.getFieldValue('custrecord_aemaint_itemclass'));
	 					legacyAssetRec.setFieldValue('custrecord_aeleg_state',paramAssetExpiredState);
	 					legacyAssetRec.setFieldValue('custrecord_aeleg_so',maintAssetRec.getFieldValue('custrecord_aemaint_so'));
	 					legacyAssetRec.setFieldValue('custrecord_aeleg_soentstartdt',maintAssetRec.getFieldValue('custrecord_aemaint_soentstartdt'));
	 					legacyAssetRec.setFieldValue('custrecord_aeleg_soentenddt',maintAssetRec.getFieldValue('custrecord_aemaint_soentenddt'));
	 					legacyAssetRec.setFieldValue('custrecord_aeleg_sotermsmonths',maintAssetRec.getFieldValue('custrecord_aemaint_sotermsmonths'));
	 					legacyAssetRec.setFieldValue('custrecord_aeleg_monthlyrate',maintAssetRec.getFieldValue('custrecord_aemaint_monthlyrate'));
	 					legacyAssetRec.setFieldValue('custrecord_aeleg_taxcode',maintAssetRec.getFieldValue('custrecord_aemaint_taxcode'));
	 					//8/19/2015 - Track Additional Info
	 					legacyAssetRec.setFieldValue('custrecord_aeleg_addinfo',maintAssetRec.getFieldValue('custrecord_aemaint_addinfo'));
	 					var legacyAssetRecId = nlapiSubmitRecord(legacyAssetRec, true, true);
	 					
	 					processLog += '&nbsp; &nbsp; &nbsp; Backup Generated Successfully ('+legacyAssetRecId+')<br/>';
	 				
	 					//Set it to Expired and LEAVE it 
	 	 				//maintAssetRec.setFieldValue('custrecord_aemaint_state',paramAssetExpiredState);
	 	 				
	 	 				//Delete the current
	 	 				try {
	 	 					nlapiDeleteRecord('customrecord_aemaint', procrs[pp].getValue('internalid'));
	 	 				} catch (delerr) {
	 	 					processLog += '&nbsp; &nbsp; &nbsp; Delete Current Active Maint Asset Record Failed ('+procrs[pp].getValue('internalid')+')<br/>';
	 	 				}
	 					
	 				} catch (backuperr) {
	 					
	 					processLog += '&nbsp; &nbsp; &nbsp; Backup Failed for Maint Asset Record ('+procrs[pp].getValue('internalid')+')<br/>';
	 				}
	 				
	 			}
	 			else if (procrs[pp].getValue('custrecord_aemaint_state')==paramAssetPendingRenewalState &&
	 					 procrs[pp].getValue('custrecord_aemaint_soentstartdt') == currDate)
	 			{
	 				//Update to Active
	 				//maintAssetRec.setFieldValue('custrecord_aemaint_state',paramAssetActiveState);
	 				//Save the Maint Record
	 	 			try {
	 	 				//nlapiSubmitRecord(maintAssetRec, true, true);
	 	 				nlapiSubmitField('customrecord_aemaint', procrs[pp].getValue('internalid'), 'custrecord_aemaint_state', paramAssetActiveState, true);
	 	 			} catch (savemaintrecerr) {
	 	 				processLog += '&nbsp; &nbsp; &nbsp; Update/Save Maint Record to Active Failed ('+procrs[pp].getValue('internalid')+')<br/>';
	 	 			}
	 			}
	 		}
		}
		
		//Set % completed of script processing
		var pctCompleted = Math.round(((i+1) / rrs.length) * 100);
		nlapiGetContext().setPercentComplete(pctCompleted);
		
		if ((i+1)==1000 || ((i+1) < rrs.length && nlapiGetContext().getRemainingUsage() < 1000)) 
		{
			//reschedule
			nlapiLogExecution('debug','Getting Rescheduled at', customerId);
			var rparam = new Object();
			rparam['custscript_114_lastprocid'] = customerId;
			rparam['custscript_114_custexecdate'] = paramCustomExecDate;
			rparam['custscript_114_custexeccustomer'] = paramCustomExecCustomer;
			nlapiScheduleScript(nlapiGetContext().getScriptId(), nlapiGetContext().getDeploymentId(), rparam);
			break;
		}
	}
	
	//Send processLog
	if (processLog) {
		nlapiSendEmail(3707, paramPrimaryErrorNotifier, 'Process log for Renewal Install Base Asset State - '+currDate, processLog, paramCcProcLogNotifier);
	}
}