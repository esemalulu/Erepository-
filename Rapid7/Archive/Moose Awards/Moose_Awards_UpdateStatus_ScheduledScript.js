/**
 * Module Description
 * 
 * Version    Date            Author           Remarks
 * 1.00       04 Apr 2013     mburstein
 *
 */

/**
 * @param {String} type Context Types: scheduled, ondemand, userinterface, aborted, skipped
 * @returns {Void}
 */
function updateMooseStatus() {
	this.context = nlapiGetContext();
	// Get the status from the param passed in by Moose_Awards_WorkflowAction.js
	var updateTypePublish = context.getSetting('SCRIPT', 'custscriptr7updatetypepublish');
	/*
	 * Get the Update Type Publish (checkbox) value.  
	 * 		If the value is false then close the nomination period by updating current period
	 * 		if false then update status to publish - last quarter nominations for all non-winners and publish winners for all winners
	 */
	if (updateTypePublish != 'T') {
		// Get Current Period
		var currentPeriod = context.getSetting('SCRIPT','custscriptr7mooseawards_ss_currentperiod');
		var newPeriod = getNewPeriod(currentPeriod);
		// Load the Company Preference Configuration
		var recCompanyPref = nlapiLoadConfiguration('companypreferences');
		recCompanyPref.setFieldValue('custscriptr7mooseawards_ss_currentperiod',newPeriod);
		// Submit New Configuration
		try {
			nlapiSubmitConfiguration(recCompanyPref);
		}
		catch(e){
			nlapiLogExecution('ERROR','Error Updating Global Preference: custscriptr7mooseawards_ss_currentperiod',e);
		}
		if (newPeriod != null && newPeriod != '') {
			updateCurrentPeriod(newPeriod);
		}
	}
	else {
		var timeLimitInMinutes = 10;
		this.timeLimitInMilliseconds = timeLimitInMinutes * 60 * 1000;
		this.startingTime = new Date().getTime();
		this.rescheduleScript = false;
		
		// SCRIPT - Moose Awards New Nominations
		var results = nlapiSearchRecord('customrecordr7mooseawards', 13655);
		for (var i = 0; results != null && i < results.length && unitsLeft(1500) && timeLeft(); i++) {
		
			var result = results[i];
			var columns = result.getAllColumns();
			var recId = result.getValue(columns[0]);
			var winner = result.getValue(columns[1]);
			var status = result.getValue(columns[2]);
			var newStatus = new Number();
			//nlapiLogExecution('DEBUG','Update record '+recId,'winner: '+winner+'\n status: '+status);
			if (status != null && status != '') {
				// If New Nomination
				if (status == 1) {
					// If not winner
					if (winner != 'T') {
						// Status is Publish - Last Quarter Nominations
						newStatus = 2;
					}
					else {
						// Status is Publish Winner
						newStatus = 3;
					}
				}
				// If Publish - Last Quarter Nomination
				else 
					if (status == 2) {
						// Status is Old Nomination
						newStatus = 4;
					}
			}
			try {
				// We want to use xedit so we don't trip the SS on edit
				// Set status to new status
				nlapiSubmitField('customrecordr7mooseawards', recId, 'custrecordr7mooseawardspublishstatus', newStatus);
			} 
			catch (e) {
				nlapiSendEmail(340932, 340932, 'ERROR UPDATING MOOSE STATUS', 'Error: ' + e);
			}
		}
		
		if (rescheduleScript) {
			nlapiLogExecution('DEBUG', 'Reschedule Strcript', context.getScriptId());
			var status = nlapiScheduleScript(context.getScriptId());
			nlapiLogExecution('DEBUG', 'Schedule Status', status);
		}
	}
}

function getNewPeriod(currentPeriod){
	if (currentPeriod != null && currentPeriod != '') {
		var newPeriod;
		switch (currentPeriod) {
			case '1':
				newPeriod = 2;
				break;
			case '2':
				newPeriod = 3;
				break;
			case '3':
				newPeriod = 4;
				break;
			case '4':
				newPeriod = 1;
				break;
		}	
		return newPeriod;
	}	
}

function updateCurrentPeriod(newPeriod){
	var columns = new Array();
	columns[0] = new nlobjSearchColumn('internalid'); // Nomination ID
	columns[0].setSort(true);
	columns[1] = new nlobjSearchColumn('custrecordr7mooseawardspublishstatus'); // Status?
	columns[2] = new nlobjSearchColumn('custrecordr7mooseawardscurrentperiod'); // Current Period
	var results = nlapiSearchRecord('customrecordr7mooseawards', null, null, columns);
	for (var i = 0; results != null && i < results.length; i++) {
		var result = results[i];
		
		var recId = result.getValue(columns[0]);
		var currentPeriod = result.getValue(columns[2]);
		if (currentPeriod != newPeriod) {
			try {
				nlapiSubmitField('customrecordr7mooseawards', recId, 'custrecordr7mooseawardscurrentperiod', newPeriod);
			} 
			catch (e) {
				nlapiLogExecution('ERROR', 'ERROR Updating Moose Record ' + recId + ' Current Period');
			}
		}
	}
}

function timeLeft(){
	var presentTime = new Date().getTime();
	if (presentTime - startingTime > timeLimitInMilliseconds) {
		nlapiLogExecution('AUDIT', 'Ran out of time', 'yup');
		rescheduleScript = true;
		return false;
	}
	return true;
}

function unitsLeft(units){
	if (units == null || units == ''){
		units = 100;
	}
	var unitsLeft = context.getRemainingUsage();
	if (unitsLeft <= units) {
		nlapiLogExecution('AUDIT', 'Ran out of units', 'yup');
		rescheduleScript = true;
		return false;
	}
	return true;
}
