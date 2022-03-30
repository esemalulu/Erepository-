/**
 * Scheduled script designed to go through and PURGE ALL Data that falls within pay period.
 * This script can be triggered by 
 * User via "Delete ALL Data" on Stage 2 suitelet 
 * OR
 * After completion of Journal Entry Creation
 * 
 * ONLY Difference is that User triggered version WILL delete data in Project Time Review table as well.
 * In the case of User triggered version, it will have isdeleteall box checked.
 * 
 * 
 * Version    Date            Author           Remarks
 * 1.00       21 Oct 2015     json
 *
 */

var statusmap={
	'Pending':'1',
	'Approve':'6',
	'Validated':'2',
	'Invalid':'3',
	'Completed':'4',
	'Error':'5',
	'PendingApproval':'7'
}; 

/**
 * @param {String} type Context Types: scheduled, ondemand, userinterface, aborted, skipped
 * @returns {Void}
 */
function deleteAllRedistroRelatedData(type) {

	//These two parameters are passed in by Run Controller
	//Employee ID
	var paramTriggerUser = nlapiGetContext().getSetting('SCRIPT','custscript_sb142_triggeruser');
	//String value format: [Start Date]-[End Date]
	var paramPayPeriodRange = nlapiGetContext().getSetting('SCRIPT','custscript_sb142_pprange');
	//Validation Stage
	//OA = Delete OpenAir Import Data
	//ADP = Delete ADP Import Data
	//PTR = Delete Project Time Review Data
	var paramDeleteStage = nlapiGetContext().getSetting('SCRIPT','custscript_sb142_deletestage');
	//Delete ALL Flag indicates if it should delete PTR records or not.
	//	IF triggered by Journal Entry Completion process, IT SHOULD NEVER Delete PTR and
	//	SHOULD NOT have the box checked.
	var paramIsDeleteAll = nlapiGetContext().getSetting('SCRIPT','custscript_sb142_isdeleteall');
	
	if (!paramTriggerUser || !paramPayPeriodRange || !paramDeleteStage)
	{
		//throw script terminating error WITH notification to ALL default notifier set on script.
		throw nlapiCreateError(
			'DELETE-ERR', 
			'Deletion Stage, Triggering User and Pay Period Range values are required.', 
			false
		);
	}
	
	var arPayPeriods = paramPayPeriodRange.split('-');
		ppFromDate = arPayPeriods[0],
		ppEndDate = arPayPeriods[1],
		isRescheduled = false,
		customRecordId = '',
		nextStage = '',
		delflt = null,
		delcol = [new nlobjSearchColumn('internalid').setSort(true)],
		delrs = null;
	
	//Make sure value exists for both 
	if (!ppFromDate || !ppEndDate)
	{
		throw nlapiCreateError(
			'DELETE-ERR', 
			'Pay period range passed in failed validation. Unable to break "'+paramPayPeriodRange+'" down using - character.', 
			false
		);
	}
	
	//--------------- Ready To Start Processing. --------------------------------------------/
	//Stage 1: Run Validation of OpenAir import
	if (paramDeleteStage == 'OA')
	{
		log('debug','Running OA Deletion','Running OA Deletion');
		customRecordId = 'customrecord_oatimesheetdata';
		nextStage = 'ADP';
		delflt = [new nlobjSearchFilter('custrecord_oatd_timesheetdate', null, 'within',ppFromDate, ppEndDate)];
	}
	else if (paramDeleteStage == 'ADP')
	{
		log('debug','Running ADP Deletion','Running ADP Deletion');
		customRecordId = 'customrecord_adpdataimort';
		delflt = [new nlobjSearchFilter('custrecord_adpd_paystartdt', null, 'on',ppFromDate),
		          new nlobjSearchFilter('custrecord_adpd_payenddt', null, 'on', ppEndDate)];
		
		//ONLY if deleteAll is checked
		if (paramIsDeleteAll == 'T')
		{
			nextStage = 'PTR';
		}
		else
		{
			nextStage = '';
		}
	} 
	else if (paramDeleteStage == 'PTR')
	{
		log('debug','Running PTR Deletion','Running PTR Deletion');
		customRecordId = 'customrecord_projecttimereview';
		delflt = [new nlobjSearchFilter('custrecord_ptr_paystartdt', null, 'on',ppFromDate),
		          new nlobjSearchFilter('custrecord_ptr_payenddt', null, 'on', ppEndDate)];
		nextStage = '';
	}
	
	try 
	{
		//1. Search for ALL Records to Delete within the Pay Period Range
		delrs = nlapiSearchRecord(customRecordId, null, delflt, delcol);
		
		//2. Loop through each and delete.
		for (var i=0; delrs && i < delrs.length; i+=1)
		{
			
			//If it error out, let it terminate the script and notify the user
			nlapiDeleteRecord(customRecordId, delrs[i].getValue('internalid'));
			
			//Set % completed of script processing
			var pctCompleted = Math.round(((i+1) / delrs.length) * 100);
			nlapiGetContext().setPercentComplete(pctCompleted);
			
			//Reschedule logic ----------------------------
			if ((i+1)==1000 || ((i+1) < delrs.length && nlapiGetContext().getRemainingUsage() < 500)) {
				//reschedule
				isRescheduled = true;
				var rparam = {
					'custscript_sb142_triggeruser':paramTriggerUser,
					'custscript_sb142_pprange':paramPayPeriodRange,
					'custscript_sb142_deletestage':paramDeleteStage,
					'custscript_sb142_isdeleteall':paramIsDeleteAll
				};
				
				nlapiScheduleScript(nlapiGetContext().getScriptId(), nlapiGetContext().getDeploymentId(), rparam);
				break;
			}
		}
		
		//Check to see if we need to queue up NEXT in line OR send notification to triggering user
		if (!isRescheduled)
		{
			//ONLY queue up next IF nextStage value is set
			if (nextStage)
			{
				var nrparam = {
						'custscript_sb142_triggeruser':paramTriggerUser,
						'custscript_sb142_pprange':paramPayPeriodRange,
						'custscript_sb142_deletestage':nextStage,
						'custscript_sb142_isdeleteall':paramIsDeleteAll
					};
					
					nlapiScheduleScript(nlapiGetContext().getScriptId(), nlapiGetContext().getDeploymentId(), nrparam);
			}
			else
			{
				//THIS IS DONE. Notify the User
				var nsbj = 'Redistro Related Data Purge Completed for '+paramPayPeriodRange+' Pay Periods';
				var nmsg = 'Completed purging all data related to Salary Redistribution process.'+
						   '<br/>Following custom records are cleared SPECIFICALLY for data rows that falls within '+
						   paramPayPeriodRange+' Pay Periods:'+
						   '<ul>'+
						   '<li>OpenAir Timesheet Data Import</li>'+
						   '<li>ADP Data Import</li>';
				if (paramIsDeleteAll=='T')
				{
					nmsg += '<li>Project Time Review</li>';
				}
				//Add the rest of the message
				nmsg += '</ul>';
				
				nlapiSendEmail(
					-5, 
					paramTriggerUser, 
					nsbj, 
					nmsg
				);
			}
		}
	}
	catch (procerr)
	{
		//BY throwing you are letting ALL Admins or who ever is defiend to recieve the error email know.
		throw nlapiCreateError(
			'DELETE-ERR', 
			'Critical error terminated error while processing '+
				customRecordId+
				' deletion'+
				' // '+
				getErrText(procerr), 
			false);
	}
	
	
	
}
