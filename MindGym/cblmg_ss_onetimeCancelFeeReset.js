
/**
 * THIS entry function will go through and backup current value of cancel fee to NEW temp Field that references new CUSTOM Field
 */

var paramLastProcId = '';

function backupCancelFee() {
	
	paramLastProcId = nlapiGetContext().getSetting('SCRIPT','custscript_sct312_lastid');
	
	//1. Search for matching booking records to backup
	var flt = [new nlobjSearchFilter('custentity_bo_cancellationfee', null, 'noneof', '@NONE@'),
	           new nlobjSearchFilter('custentity_temp_bo_cancellationfee', null, 'anyof', '@NONE@')];
	
	if (paramLastProcId) {
		flt.push(new nlobjSearchFilter('internalidnumber', null, 'lessthan', paramLastProcId));
	}
	
	var col = [new nlobjSearchColumn('internalid').setSort(true),
	           new nlobjSearchColumn('custentity_bo_cancellationfee')];
	var rs = nlapiSearchRecord('job', null, flt, col);
	
	for (var i=0; i < rs.length; i++) {
		//2. Search for matching 
		var mflt = [new nlobjSearchFilter('custrecord_cancel_legacylist', null, 'anyof', rs[i].getValue('custentity_bo_cancellationfee'))];
		var mcol = [new nlobjSearchColumn('internalid')];
		var mrs = nlapiSearchRecord('customrecord_bo_new_cancellationamount', null, mflt, mcol);
		if (mrs && mrs.length > 0) {
			//3. back up the value
			try {
				nlapiSubmitField('job', rs[i].getValue('internalid'), 'custentity_temp_bo_cancellationfee', mrs[0].getValue('internalid'), false);
			} catch (err) {
				log('error','Unable to Update booking id '+rs[i].getValue('internalid'), getErrText(err));
			}
			
		} else {
			//4. print out as error 
			log('error','Unable to match',rs[i].getValue('internalid')+' to match up fee value of '+rs[i].getText('custentity_bo_cancellationfee')+
					  					  '('+rs[i].getValue('custentity_bo_cancellationfee')+')');
		}
				
		if ((i+1)==1000 || (nlapiGetContext().getRemainingUsage() < 50 && i < (i+1)) ) {
			var param = new Object();
			param['custscript_sct312_lastid'] = rs[i].getValue('internalid');
			var qstatus = nlapiScheduleScript(nlapiGetContext().getScriptId(), nlapiGetContext().getDeploymentId(), param);
			
			log('debug','Rescheduled on Booking',rs[i].getValue('internalid'));
			
			if (qstatus=='QUEUED') {
				break;
			}
		}
	}
}

//Reset function
function resetCancelFee() {
	
	paramLastProcId = nlapiGetContext().getSetting('SCRIPT','custscript_sct312_lastid');
	
	//1. Search for matching booking records to backup
	var flt = [new nlobjSearchFilter('custentity_bo_cancellationfee', null, 'noneof', '@NONE@'),
	           new nlobjSearchFilter('custentity_temp_bo_cancellationfee', null, 'noneof', '@NONE@')];
	
	if (paramLastProcId) {
		flt.push(new nlobjSearchFilter('internalidnumber', null, 'lessthan', paramLastProcId));
	}
	
	var col = [new nlobjSearchColumn('internalid').setSort(true),
	           new nlobjSearchColumn('custentity_temp_bo_cancellationfee')];
	var rs = nlapiSearchRecord('job', null, flt, col);
	
	for (var i=0; i < rs.length; i++) {
		//2. Restore Value 
		log('debug','processing booking restore', rs[i].getValue('internalid')+' to restore fee value of '+rs[i].getText('custentity_temp_bo_cancellationfee')+
					  '('+rs[i].getValue('custentity_temp_bo_cancellationfee')+')');
		nlapiSubmitField('job', rs[i].getValue('internalid'), 'custentity_bo_cancellationfee', rs[i].getValue('custentity_temp_bo_cancellationfee'), false);
				
		if ((i+1)==1000 || (nlapiGetContext().getRemainingUsage() < 50 && i < (i+1)) ) {
			var param = new Object();
			param['custscript_sct312_lastid'] = rs[i].getValue('internalid');
			var qstatus = nlapiScheduleScript(nlapiGetContext().getScriptId(), nlapiGetContext().getDeploymentId(), param);
			
			log('debug','Rescheduled on Booking',rs[i].getValue('internalid'));
			
			if (qstatus=='QUEUED') {
				break;
			}
		}
	}
}