/**
 * Creation Date: 3/6/2015
 * This script is created to ensure all Opportunity with below criteria gets CLOSED.
 * - winlossreason is NOT NULL and EntityStatus is NONE of 13 or 14 (7 - Closed Won or * Closed Lost)
 * - Entity Status should be set to 13 or 14 based on custbody_document_status value of Won or Lost. If custbody_document_status is not set, use value on winloss reason to SET
 * 		both EntityStatus and custbody_document_status 
 * 
 * Background:
 * SFA Preference is set up to default status for Client Account to be 6 - Execute.  
 * In NetSuite 6 - Execute probability is set as 80%.  This was done so that Opportunity ALWAYS stays in OPEN state until Sales Order is created off of Quote. 
 * When sales order or invoice is updated, netsuite will sync the status of Opportunity with Quote it is linked to.
 * This causes previously closed Opportunity to become "OPEN with status if Issued Estimate" because entity status gets set to 6 - Execute.  
 * It is fine for keeping Opportunity OPEN but NOT when it should have closed status.
 * 
 * There are user triggered script that runs upon SO, INV and QUOTE modification to recalculate forecast values on Opportunity record. This causes the native document status to change to Open. 
 * THIS script is designed to CLOSE Opportunity that SHOULD Be Closed.
 * 
 * This is bit of circular logic and may seem unnecessary but due to the way MindGym conducts it's business, it is necessary process.
 * Process implemented by David A. (COO from MindGym) and Joe S. (Audaxium)
 */

//Global JSON continaining ALL script related variables
var sctvars= {
	'closedStatuses':['13','14'], //array of closed entity status 
	'paramLastProcId':nlapiGetContext().getSetting('script','custscript_328_lastprocid'), //Last processed ID
	'closedWonEntityStatus':'13',
	'closedLostEntityStatus':'14',
	'closedWonPercent':'100',
	'closedLostPercent':'0',
	'closedWonCustom':'2',
	'closedLostCustom':'3',
	'newEntityStatus':'',
	'newCustomStatus':'',
	'newPercent':''
};

function documentStatusCloseOpp() {
	
	//1. Search for Opportunity records that NEEDS to be Closed
	var coflt = [new nlobjSearchFilter('winlossreason', null, 'noneof','@NONE@'),
	             new nlobjSearchFilter('entitystatus', null, 'noneof', sctvars.closedStatuses)];
	
	if (sctvars.paramLastProcId) {
		coflt.push(new nlobjSearchFilter('internalidnumber', null, 'lessthan', sctvars.paramLastProcId));
	}
	
	var cocol = [new nlobjSearchColumn('internalid').setSort(true),
	             new nlobjSearchColumn('entitystatus'),
	             new nlobjSearchColumn('winlossreason'),
	             new nlobjSearchColumn('custbody_document_status')];
	
	//Execute search to bring list of all opportunities
	var cors = nlapiSearchRecord('opportunity', null, coflt, cocol);
	
	//2. Loop through and change entitystatus
	for (var i=0; cors && i < cors.length; i++) {
		//3. Decide what NEW Entity Status Should Be.
		if (cors[i].getText('winlossreason').indexOf('Closed lost:') > -1) {
			sctvars.newEntityStatus = sctvars.closedLostEntityStatus;
			sctvars.newCustomStatus = sctvars.closedLostCustom;
			sctvars.newPercent = sctvars.closedLostPercent;
		} else {
			//assume it's Closed won:
			sctvars.newEntityStatus = sctvars.closedWonEntityStatus;
			sctvars.newCustomStatus = sctvars.closedWonCustom;
			sctvars.newPercent = sctvars.closedWonPercent;
		}
		
		log('debug','Processing Opp',cors[i].getValue('internalid')+' // entitystatus: '+cors[i].getText('entitystatus')+' // winlossreason: '+cors[i].getText('winlossreason')+' // Custom Doc Status: '+cors[i].getText('custbody_document_status'));
		log('debug','Processing Opp','------ Update to: EntityStatus = '+sctvars.newEntityStatus+' // Custom Status = '+sctvars.newCustomStatus+' // Percent = '+sctvars.newPercent);
		
		var recloseCount = 0;
		try {
			//Load the Opp and Save so that the native Document Status will get updated
			var oppRec = nlapiLoadRecord('opportunity', cors[i].getValue('internalid'), {recordmode:'dynamic'});
			
			if (oppRec.getFieldValue('custbody_aux_reclosedcount')) {
				recloseCount = parseInt(oppRec.getFieldValue('custbody_aux_reclosedcount')) + 1;
			} else {
				recloseCount = 1;
			}
			log('debug','Processing Opp','----- Current RecloseCount ON Rec: '+oppRec.getFieldValue('custbody_aux_reclosedcount')+' // New Reclose count: '+recloseCount);
			oppRec.setFieldValue('entitystatus', sctvars.newEntityStatus);
			oppRec.setFieldValue('probability', sctvars.newPercent);
			oppRec.setFieldValue('custbody_document_status', sctvars.newCustomStatus);
			oppRec.setFieldValue('custbody_aux_reclosedcount', recloseCount);
			nlapiSubmitRecord(oppRec, true, true);
		} catch (opprecerr) {
			log('error','Error Updating',getErrText(opprecerr));
			//RCRD_HAS_BEEN_CHANGED
        	if (getErrText(opprecerr).indexOf('RCRD_HAS_BEEN_CHANGED') > -1) {
        		log('audit','Trying again due to Rec. Changed Error','Trying again');
        		//reload and try again
        		try {
        			var reoppRec = nlapiLoadRecord('opportunity', cors[i].getValue('internalid'), {recordmode:'dynamic'});
        			reoppRec.setFieldValue('entitystatus', sctvars.newEntityStatus);
        			reoppRec.setFieldValue('probability', sctvars.newPercent);
        			reoppRec.setFieldValue('custbody_document_status', sctvars.newCustomStatus);
        			reoppRec.setFieldValue('custbody_aux_reclosedcount', recloseCount);
        			nlapiSubmitRecord(reoppRec, true, true);
        		} catch (secondtryerr) {
        			
        		}
        	}
		}
		
		//Check to see if we need to reschedule
		//Set % completed of script processing
		var pctCompleted = Math.round(((i+1) / cors.length) * 100);
		nlapiGetContext().setPercentComplete(pctCompleted);
		
		//reschedule if gov is running low or legnth is 1000
		if (((i+1)==1000) || (nlapiGetContext().getRemainingUsage() <= 100)) {
			var reqParam = {};
			reqParam['custscript_328_lastprocid'] = cors[i].getValue('internalid');
			var reschedulStatus = nlapiScheduleScript(nlapiGetContext().getScriptId(), nlapiGetContext().getDeploymentId(), reqParam);
			log('audit','Reclose Rescheduled',reschedulStatus);
			break;
		}
	}
}