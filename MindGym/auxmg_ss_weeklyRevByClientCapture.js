/**
 * Scheduled script to go through saved search passed in via script parameter 
 * to capture revenue value by client.
 * It is important to note that each column is specifically mapped.
 * 
 * 17th Feb 2016
 * - Talk with David. The two Date column represented in MONTH format is NOT needed.
 * 	 He wishes to have current timestamp translated into Calendar Week-Year and Financial Week-Year.
 * 	 There should ONLY be one row of data per client returned on the saved search
 * 
 * Version    Date            Author           Remarks
 * 1.00       15 Feb 2016     json
 *
 */

/**
 * @param {String} type Context Types: scheduled, ondemand, userinterface, aborted, skipped
 * @returns {Void}
 */
function weeklyRevCaptureByClient(type) {

	//MUST be provided and columns are hard coded.
	var paramRevSearchId = nlapiGetContext().getSetting('SCRIPT','custscript_434_revssid'),
		paramLastProcId = nlapiGetContext().getSetting('SCRIPT','custscript_434_lastprocid');
	
	var wflt = null;
	if (paramLastProcId)
	{
		wflt = [new nlobjSearchFilter('internalidnumber','customermain','lessthan',paramLastProcId)];
	}
	
	//Execute the saved search to start processing
	var wrs = nlapiSearchRecord(null, paramRevSearchId, wflt, null);
	if (wrs && wrs.length <= 0)
	{
		return;
	}
	
	/**
	 * Column Mapping
	 * 0 = Client Reference
	 * 1 = Formula Text (Client Name ONLY)
	 * 2 = Formula Currency (GBP Value)
	 * 3 = Formula Currency (USD Value)
	 * 4 = # of Booking 
	 * 5 = # of Days
	 * 6 = Sales Rep
	 * 7 = Sales Rep Inactive Flag
	 * 8 = Project Manager (Client Executive)
	 * 9 = Subsidiary
	 * 10 = Last Booking Date
	 * 
	 * Ticket 7915 - David Added additional column Month of Date as Text field
	 * 11 = Month Of Date
	 */
	var allCols = wrs[0].getAllColumns(), 
		prjMgrJson = {},
		arPrjMgr = [];
	
	//Go through and build list of ALL prject managers to look up inactive flag
	for (var p=0; p < wrs.length; p+=1)
	{
		if (wrs[p].getValue(allCols[8]) && !arPrjMgr.contains(wrs[p].getValue(allCols[8])))
		{
			arPrjMgr.push(wrs[p].getValue(allCols[8]));
		}
	}
	
	//Search all Employees for inactive flag 
	if (arPrjMgr.length > 0)
	{
		var empflt = [new nlobjSearchFilter('internalid', null, 'anyof', arPrjMgr)],
			empcol = [new nlobjSearchColumn('internalid'),
			          new nlobjSearchColumn('isinactive')],
			emprs = nlapiSearchRecord('employee', null, empflt, empcol);
		
		//Assume there are results
		for (var e=0; e < emprs.length; e+=1)
		{
			prjMgrJson[emprs[e].getValue('internalid')] = emprs[e].getValue('isinactive');
		}
	}
	
	//Loop through each result and process
	for (var c=0; c < wrs.length; c+=1)
	{
		var wrevRec = nlapiCreateRecord('customrecord_axd_weeklyrevsnapshot'),
			currDate = nlapiDateToString(new Date()),
			wyjson = getWeekYear(currDate),
			salesRepId = wrs[c].getValue(allCols[6]),
			salesRepText = wrs[c].getText(allCols[6]),
			prjMgrId = wrs[c].getValue(allCols[8]),
			prjMgrText = wrs[c].getText(allCols[8]);
		
		//Make sure employee records being reference is NOT Inactive.
		//	if so, set the value to empty
		if (salesRepId && wrs[c].getValue(allCols[7])=='T')
		{
			salesRepId = '';
		}

		if (prjMgrId && prjMgrJson[prjMgrId] == 'T')
		{
			prjMgrId = '';
		}
		
		wrevRec.setFieldValue('custrecord_wrs_datacapturedate', currDate);
		wrevRec.setFieldValue('custrecord_wrs_calweeknum', wyjson.calendar.week);
		wrevRec.setFieldValue('custrecord_wrs_calweekyear', wyjson.calendar.year);
		wrevRec.setFieldValue('custrecord_wrs_finweeknum', wyjson.financial.week);
		wrevRec.setFieldValue('custrecord_wrs_finweekyear', wyjson.financial.year);
		wrevRec.setFieldValue('custrecord_wrs_client', wrs[c].getValue(allCols[0]));
		wrevRec.setFieldValue('custrecord_wrs_clientnameonly', wrs[c].getValue(allCols[1]));
		wrevRec.setFieldValue('custrecord_wrs_gbpvalue', wrs[c].getValue(allCols[2]));
		wrevRec.setFieldValue('custrecord_wrs_usdvalue', wrs[c].getValue(allCols[3]));
		wrevRec.setFieldValue('custrecord_wrs_numbooking', wrs[c].getValue(allCols[4]));
		wrevRec.setFieldValue('custrecord_wrs_numdays', wrs[c].getValue(allCols[5]));
		wrevRec.setFieldValue('custrecord_wrs_salesrep', salesRepId);
		wrevRec.setFieldValue('custrecord_wrs_salesrepname', salesRepText);
		wrevRec.setFieldValue('custrecord_wrs_prjmanager', prjMgrId);
		wrevRec.setFieldValue('custrecord_wrs_prjmgrname', prjMgrText);
		wrevRec.setFieldValue('custrecord_wrs_subsidiary', wrs[c].getValue(allCols[9]));
		wrevRec.setFieldValue('custrecord_wrs_lastbookdate', wrs[c].getValue(allCols[10]));
		wrevRec.setFieldValue('custrecord_wrs_month', wrs[c].getValue(allCols[11]));
		
		var wrevId = nlapiSubmitRecord(wrevRec, true, true);
		
		
		log('debug','Rev. Captured', wrevId+' on '+currDate);
		
		
		//Set % completed of script processing
		var pctCompleted = Math.round(((c+1) / wrs.length) * 100);
		nlapiGetContext().setPercentComplete(pctCompleted);
		
		//reschedule if gov is running low or legnth is 1000
		if (((c+1)==1000) || (nlapiGetContext().getRemainingUsage() <= 1000)) {
			var rparam = {
				'custscript_434_lastprocid':minInternalId
			};
			
			nlapiScheduleScript(nlapiGetContext().getScriptId(), nlapiGetContext().getDeploymentId(), rparam);
			
			log('audit','Rescheduled',JSON.stringify(rparam));
		}
		
	}
	
}

/**
 * 
 * @param _currDate 
 * @return {'calendar':{'week':'','year':''}, 'financial':{'week':'','year':''}}
 */
function getWeekYear(_currDate)
{
	var dt = nlapiStringToDate(_currDate);
	
	log('debug','dt',dt);
	
	//set the time to 0
	dt.setHours(0);
	var dtc = dt;
	
	var retjson = {
		'calendar':{
			'week':'',
			'year':''
		},
		'financial':{
			'week':'',
			'year':''
		}
	};

	//Get first day of year
	var calYearStart = new Date('1/1/'+dtc.getFullYear()),
		calWeekYear = dtc.getFullYear(),
		//	Financial starts from 4/1 to 3/31
		finWeekYear = calWeekYear - 1,
		finYearStart = new Date('4/1/'+finWeekYear);
	
	//Set to nearest Thursday: current date + 4 - current day number
	//Make Sunday's day number 7 instead of 0
	dtc.setDate(dt.getDate() + 4 - (dtc.getDay() || 7));

	//subtract first day of the year from current date and add 1 day to it.
	//86400000 == 1 Day in milliseconds

	//Divide # of days passed since start of the year to most recent Thursday by 7 (week)
	var calWeekNo = Math.ceil( ( ( (dtc - calYearStart) / 86400000) + 1)/7),
		finWeekNo = Math.ceil( ( ( (dtc - finYearStart) / 86400000) + 1)/7);

	retjson.calendar.week = calWeekNo;
	retjson.calendar.year = calWeekYear;
	retjson.financial.week = finWeekNo;
	retjson.financial.year = calWeekYear; //Financial year always matches calendar year. For example 1/1/2016 is FY2016 and so is 4/1/2015
	
	log('debug','week-year calc',JSON.stringify(retjson));
	
	return retjson;	
}
