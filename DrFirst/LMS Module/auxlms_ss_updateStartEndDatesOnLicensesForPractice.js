/**
 * Scheduled script with multiple unscheduled deployments to handle trigger from User Event.
 * This script is triggered when Billing Type on practice is changed by NS User. 
 * THis script is designed to go through ALL License records for THAT practice and calculate Entitlement Start and End dates.
 * 
 * V1:
 * 	- ONLY execute against Licenses with missing Start and End Date
 * 	- Start Date == Rcopia Created Date ()
 * 
 * V2: 4/27/2016 
 * 	- Modified to Run as SCHEDULED script.
 * 		Script will look for all Licenses that matches following critiera:
 * 		- NO Entitlement Start and End Dates
 * 		- Rcopia created date IS NOT EMPTY
 * 		- Is Deleted = False
 * 		- Is Test Account = False
 * 		- Primary Location = TRUE
 * 		- Linked Practice HAS Billing Type value set
 */
function updateStartEndDatesOnLicense() {
	
	/**
	//grab changes
	var paramUpdPracticeId = nlapiGetContext().getSetting('SCRIPT', 'custscript_sb139_updpracticeid');
	
	//Exit out if one or both parameter values are missing
	if (!paramUpdPracticeId)
	{
		log('error',
			'LMS LICENSE Start/End Date TRIGGER ERROR',
			'Unable to trigger Start/End Date Calculation on licenses for practice due to missing Practice ID // '+
			'Practice Parameter Value: '+paramUpdPracticeId);
		throw nlapiCreateError(
				'LMS-ERR', 
				'Unable to trigger Start/End Date Calculation on licenses for practice due to missing Practice ID //'+
				'Practice Parameter Value: '+paramUpdPracticeId
				, true);
	}
	*/
	
	//Passed in by Scheduled script incase it needs to reschedule
	var paramLastProcLicId = nlapiGetContext().getSetting('SCRIPT', 'custscript_sb139_lastproclicid');
	
	//For initial sync. Do the Reverse
	//If Checked, run the script from Bottom up
	var paramReverOrder = nlapiGetContext().getSetting('SCRIPT', 'custscript_sb139_revorder'),
		orderDesc = true;
	
	if (paramReverOrder=='T')
	{
		orderDesc = false;
	}
	
	//Search for list of matching licenses to calculate
	//Rcopia Created Date MUST be set
	//Both Start and End Date MUST be Empty
	//4/27/2016 - Adding criteria to support scheduled version.
	var licflt = [new nlobjSearchFilter('custrecord_lmslc_practice', null, 'noneof', '@NONE@'),
	              new nlobjSearchFilter('isinactive', null, 'is','F'),
	              new nlobjSearchFilter('custrecord_lmslc_isdeleted', null, 'is', 'F'),
	              new nlobjSearchFilter('custrecord_lmslc_istest', null, 'is', 'F'),
	              new nlobjSearchFilter('custrecord_lmslc_rcopiacreateddate', null, 'isnotempty',''),
	              new nlobjSearchFilter('custrecord_lmslc_startdt', null, 'isempty',''),
	              new nlobjSearchFilter('custrecord_lmslc_enddt', null, 'isempty','')];
	
	var liccol = [new nlobjSearchColumn('internalid').setSort(orderDesc),
	              new nlobjSearchColumn('custrecord_lmslc_rcopiacreateddate'),
	              new nlobjSearchColumn('custrecord_lmsp_billtype','custrecord_lmslc_practice')];
	
	if (paramLastProcLicId)
	{
		if (!orderDesc)
		{
			licflt.push(new nlobjSearchFilter('internalidnumber', null, 'greaterthan', paramLastProcLicId));
		}
		else
		{
			licflt.push(new nlobjSearchFilter('internalidnumber', null, 'lessthan', paramLastProcLicId));
		}
		
	}
	
	var licrs = nlapiSearchRecord('customrecord_lmslic', null, licflt, liccol);
	
	//loop thorugh and delete the records
	for (var i=0; licrs && i < licrs.length; i++) 
	{
		
		var monthsToAdd = 1;
		if (licrs[i].getValue('custrecord_lmsp_billtype','custrecord_lmslc_practice') == '1')
		{
			//This is Annual change it to 12
			monthsToAdd = 12;
		}
		
		var startDateObj = nlapiStringToDate(licrs[i].getValue('custrecord_lmslc_rcopiacreateddate'),'datetimetz');
		var endDateObj = nlapiAddMonths(startDateObj, monthsToAdd);
		
		//11/16/2015 - Need to Update UI Updated date as well
		var updFlds = ['custrecord_lmslc_startdt',
		               'custrecord_lmslc_enddt',
		               'custrecord_lmslc_uiupdatedt'];
		var updVals = [nlapiDateToString(startDateObj, 'datetimetz'), 
		               nlapiDateToString(endDateObj,'datetimetz'), 
		               'T'];
		
		//Update the contract ref. field
		nlapiSubmitField('customrecord_lmslic', licrs[i].getValue('internalid'), updFlds, updVals, true);
		
		//Set % completed of script processing
		var pctCompleted = Math.round(((i+1) / licrs.length) * 100);
		nlapiGetContext().setPercentComplete(pctCompleted);
		
		//log('debug','testing',licrs[i].getValue('internalid'));
		
		//reschedule if gov is running low or legnth is 1000
		if (((i+1)==1000) || (nlapiGetContext().getRemainingUsage() <= 100)) 
		{
			var rparam = {
				'custscript_sb139_lastproclicid':licrs[i].getValue('internalid')
			};
			
			nlapiScheduleScript(nlapiGetContext().getScriptId(), nlapiGetContext().getDeploymentId(), rparam);
			
			log('audit','Rescheduled',JSON.stringify(rparam));
		}
	}
}