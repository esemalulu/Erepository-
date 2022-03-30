/**
 * Scheduled script that will run through each Engagement (job) and calculate reporting metrics.
 * -- 10/20/2015: Taken out as it's own script so that it can process closed jobs
 * -- 9/26/2015: Adding calculation for  RPT-Days Remaining, RPT-Billable Days and RPT-Planned Time (in Days)	
 *    BELOW Fields are ONLY calculated and set if Is Billable Days? Field is Check on the Engagement
 * N) RPT-Planned Time (in Days) = Planned time calculated in Days. This value comes from "Planned Time (Hours)" field 
 * 								   on Engagement Task associated with this Engagement.  8 Hours = 1 Day
 * O) RPT-Billable Days = Total number of billable days for THIS Engagement. Value of this field is based on 
 * 						  ALL time entries with value greater than 0 logged against each Engagement Tasks. 
 * 						  Any hours greater than 0 for a single day equates to 1 day
 * P) RPT-Days Remaining = Calculated value: Planned Time (in Days) - Billable Days
 */

/**
 * @param {String} type Context Types: scheduled, ondemand, userinterface, aborted, skipped
 * @returns {Void}
 */
function calcBillableDaysRptMetrics(type) {

	var paramCustEngId = nlapiGetContext().getSetting('SCRIPT', 'custscript_sb30_custjobid'),
		paramLastProcEngId = nlapiGetContext().getSetting('SCRIPT','custscript_sb30_lastprocid'),
		//This value is set at the script deployment level.
		//Value indicates how many hours are in a Day from Hours to Day calculation
		paramNumHoursInDay = nlapiGetContext().getSetting('SCRIPT','custscript_sb30_numhoursinday');
	
	try
	{
		
		//Execute against ALL Engagement records where billable days checkbox is checked
		var engflt = [
		    new nlobjSearchFilter('isinactive', null, 'is','F'),
		    new nlobjSearchFilter('custentity_adx_billabledays', null, 'is', 'T')
		];
		
		//If Custom is passed in, grab that Engagement ONLY
		if (paramCustEngId)
		{
			engflt.push(new nlobjSearchFilter('internalid', null, 'anyof', paramCustEngId));
		}
		
		//If last processed ID is passed in, return list of Engagement still left to process. List will be sorted by Internal ID DESC order
		if (paramLastProcEngId)
		{
			engflt.push(new nlobjSearchFilter('internalidnumber', null, 'lessthan', paramLastProcEngId));
		}
		
		var engcol = [
		    new nlobjSearchColumn('internalid').setSort(true),
		    new nlobjSearchColumn('entityid')
		];
		
		var engrs = nlapiSearchRecord('job', null, engflt, engcol);
		
		for (var i=0; engrs && i < engrs.length; i+=1)
		{
			
			//JSON Object to hold value for each metric points
			var metricjson={
				//Added 9/26/2015 - Billable Days Calculations
				'n':{
					'field':'custentity_axrpt_plannedtime_days',
					'value':0
				},
				'o':{
					'field':'custentity_axrpt_billabledays',
					'value':0
				},
				'p':{
					'field':'custentity_axrpt_daysremaining',
					'value':0
				}
			};
			
			//-------------------------
			log(
				'debug',
				'Processing Engagement ID',
				engrs[i].getValue('internalid')
			);
			//N) RPT-Planned Time (in Days) =     
			//		Planned time calculated in Days. This value comes from "Planned Time (Hours)" field 
			// 		on Engagement Task associated with this Engagement.  8 Hours = 1 Day
			//		When there are multiple engagement tasks associated with it, add up the values in Planned Time (Hours) field
			var rnflt = [new nlobjSearchFilter('internalid', null, 'anyof',engrs[i].getValue('internalid')),
			             new nlobjSearchFilter('internalid','projecttask','noneof','@NONE@')];
			var rncol = [new nlobjSearchColumn('custevent_plannedtime', 'projectTask', 'sum').setSort()];
			var rnrs = nlapiSearchRecord('job', null, rnflt, rncol);
			
			//ONLY Hours to Day Calculation if planned time value is set
			if (rnrs && rnrs.length > 0 && rnrs[0].getValue('custevent_plannedtime', 'projectTask', 'sum'))
			{
				var plannedTimeHours = parseInt(rnrs[0].getValue('custevent_plannedtime', 'projectTask', 'sum'));
				//8 hours = 1 Day
				var plannedTimeInDays = Math.ceil(plannedTimeHours/parseInt(paramNumHoursInDay));
				log('debug','N Planned Time In Days', plannedTimeHours+' // Converted to '+paramNumHoursInDay+' Hour Day = '+plannedTimeInDays);
				
				metricjson['n'].value = plannedTimeInDays;
			}
				
			//O) RPT-Billable Days =     
			//		Total number of billable days for THIS Engagement. Value of this field is based on 
			// 		ALL time entries with value greater than 0 logged against each Engagement Tasks. 
			// 		Any hours greater than 0 for a single day equates to 1 day
			//		Search ALL Time Tracking (timebill) transaction record
			//		9/30/2015 Change
			//		If one employee logs hours against 2 or more tasks for a single day, this is counted as 1 day NOT 2
			//		Search is modified to include employee, date and task count.
			//		If task count is more than one for an employee , make sure the value is treated as 1
				
			//Use Formula Number to identify billable days.
			var billDaysColumn = new nlobjSearchColumn('formulanumeric', null, 'sum');
			//Formula DEF:
			//	- If Duration value is greater than 0, treat it as 1 day
			billDaysColumn.setFormula('case when {durationdecimal} > 0 then 1 else 0 end');
			
			var roflt = [new nlobjSearchFilter('internalid', 'job', 'anyof',engrs[i].getValue('internalid'))];
			var rocol = [new nlobjSearchColumn('date', null, 'group').setSort(),
			             new nlobjSearchColumn('employee', null, 'group').setSort(),
			             new nlobjSearchColumn('internalid','projectTask','count'),
			             billDaysColumn];
			
			var rors = nlapiSearchRecord('timebill', null, roflt, rocol);
			
			//log('debug','timebill executed','search ran');
			if (rors && rors.length > 0)
			{
				//Loop through the entire returned set. Since this search is grouped by Date, and Employee and Task is counted,
				// IF the count is more than 1, billable day for that day should always be 1 for that employee.
				// THIS ASSUMES total number of search result will NOT go over 1000 rows. 
				// Based on review, max number of search result was 250 records.
				// Billable DAY is essence is equal to number of results returned
				var totalBillableDays = rors.length;
					
				metricjson['o'].value = totalBillableDays;
			}
				
			//P) RPT-Days Remaining =     
			//		Calculated value: Planned Time (in Days) - Billable Days
			metricjson['p'].value = parseInt(metricjson['n'].value) - parseInt(metricjson['o'].value);
				
			
			//Now go through and Update the Engagement record.
			var updflds = [], 
				updvals = [];
			
			for (var m in metricjson)
			{
				updflds.push(metricjson[m].field);
				updvals.push(metricjson[m].value);
			}
			
			nlapiSubmitField('job', engrs[i].getValue('internalid'), updflds, updvals, false);
			log('debug','Engagement ID: '+engrs[i].getValue('internalid'),'Updated with Metrics: '+JSON.stringify(metricjson));
			
			//---------------------------------------------------
			//ADD IN RESCHEDULE LOGIC HERE
			//Set % completed of script processing
			var pctCompleted = Math.round(((i+1) / engrs.length) * 100);
			nlapiGetContext().setPercentComplete(pctCompleted);
			//j=0; parentTrxRs 
			//Reschedule for customer loop
			if ((i+1)==1000 || ((i+1) < engrs.length && nlapiGetContext().getRemainingUsage() < 500)) 
			{
				//reschedule
				log('audit','Getting Rescheduled at', engrs[i].getValue('internalid'));
				var rparam = new Object();
				rparam['custscript_sb33_lastprocid'] = engrs[i].getValue('internalid');
				nlapiScheduleScript(nlapiGetContext().getScriptId(), nlapiGetContext().getDeploymentId(), rparam);
				break;
			}
		}
		
	}
	catch(procerr)
	{
		//at this point, throw the error to notify admins
		log('error','Error Processing Billable Days Calculation', getErrText(procerr));
		throw nlapiCreateError('ENG_CALC_ERR', 'Error Processing Billable Days Calculation: '+getErrText(procerr), false);
	}
}
