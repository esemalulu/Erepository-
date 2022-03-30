nlapiLogExecution("audit","FLOStart",new Date().getTime());
 /**
  * Due to SS2.0 Date format/parsing issue, Developing this IN SS1.0
  * 
  * This scheduled script executes every Monday Early Morning (12:30am),
  * to capture prior weeks' sales metric data from sales reps. 
  * Prior week is defined as Monday to Sunday based on Execution date of Current Monday.
  * For example if ran on Mon. Oct 3 2016, it will grab data for Mon (9/26/2016) to Sun (10/2/2016)
  *
  * Majority of columns in AX-Weekly Sales Metrics (customrecord_ax_weeklysalesmetrics) custom record tables
  * are mapped to saved search.  Rest are calculated fields.
  * 
 */

/**
 * @param {String} type Context Types: scheduled, ondemand, userinterface, aborted, skipped
 * @returns {Void}
 */
function captureWeeklySalesMetrics(type) 
{
	//Grab Error Notifier Info
	var paramPrimaryErrNotif = nlapiGetContext().getSetting('SCRIPT','custscript_450_primeerrnotifer'),
		paramCcErrNotif = nlapiGetContext().getSetting('SCRIPT','custscript_450_ccerremails');
	
	if (paramCcErrNotif)
	{
		paramCcErrNotif = strGlobalReplace(paramCcErrNotif, ' ', '');
		paramCcErrNotif = paramCcErrNotif.split(',');
	}
	else
	{
		paramCcErrNotif = null;
	}
	
	//Grab other custom script fields
	var paramCustomDate = nlapiGetContext().getSetting('SCRIPT','custscript_450_custcurdate');
	
	//Grab Saved Search IDs for mapped columns
	var paramLeadsSearchId = nlapiGetContext().getSetting('SCRIPT','custscript_450_leadsearch'),
		
		paramUnqualifiedOppsSearchId = nlapiGetContext().getSetting('SCRIPT','custscript_450_unqualifiedopps'),	//new
	
		paramTotalOppsSearchId = nlapiGetContext().getSetting('SCRIPT','custscript_450_totaloppsearch'),
		
		paramOppsToQualfdSearchId = nlapiGetContext().getSetting('SCRIPT','custscript_450_opps_to_qualified'), 	//new
		
		paramMrrOppSearchId = nlapiGetContext().getSetting('SCRIPT','custscript_450_mrroppsearch'),
		paramTotalPropSearchId = nlapiGetContext().getSetting('SCRIPT','custscript_450_totalpropsearch'),
		paramMrrPropSearchId = nlapiGetContext().getSetting('SCRIPT','custscript_450_mrrpropsearch'),
		paramOppToPropSearchId = nlapiGetContext().getSetting('SCRIPT','custscript_450_opptopropsearch'),
		paramOppLostSearchId = nlapiGetContext().getSetting('SCRIPT','custscript_450_opplostsearch'),
		paramAvgOppDurSearchId = nlapiGetContext().getSetting('SCRIPT','custscript_450_avgoppdursearch'),
		paramPropWonSearchId = nlapiGetContext().getSetting('SCRIPT','custscript_450_propwonsearch'),
		paramPropLostSearchId = nlapiGetContext().getSetting('SCRIPT','custscript_450_proplostsearch'),
		paramAvgPropDurSearchId = nlapiGetContext().getSetting('SCRIPT','custscript_450_avgpropdursearch'),
		paramWeeklyMrrSearchId = nlapiGetContext().getSetting('SCRIPT','custscript_450_weekmrrsearch'),
		paramMonthlyMrrSearchId = nlapiGetContext().getSetting('SCRIPT','custscript_450_monthmrrsearch');
		
		
		paramWeeklyAppvdSearchId = nlapiGetContext().getSetting('SCRIPT','custscript_450_weeklyapproved');
		paramMonthlyAppvdSearchId = nlapiGetContext().getSetting('SCRIPT','custscript_450_monthlyapproved');


		
		
		
		
		
	
	//Folder Location: Documents > SuiteScripts > Audaxium Customization > Sales Reporting Portlet
	var tempFolderId = '6841984';
	
	var curDate = new Date();
	if (paramCustomDate)
	{
		curDate = nlapiStringToDate(paramCustomDate);
	}
	
	log('debug','curDate obj', curDate);
	
	//Build Process JSON object to be used 
	var procJson = {
		'jsonfileid':'',
		'weekstart':'',
		'weekend':'',
		'repids':[],
		'datecaptured':nlapiDateToString(curDate),
		/**
		 * [salesrep]:{
		 * 		'srname':'',
		 * 		'leads':'',
		 * 		'totalopps:'',
		 * 		//10/17/2016
		 *		//totaloppsweek added to calculate "% of opps to proposal" value
		 * 		'totaloppsweek:'',
		 * 		'oppsmrr':'',
		 * 		'totalprops':'',
		 * 		//10/17/2016
		 *		//totalpropsweek added to calculate "% of opps to proposal" value
		 * 		'totalpropsweek':'',
		 * 		'propsmrr':'',
		 * 		'opptoprops':'',
		 * 		'oppslost':'',
		 * 		'percoppstoprops':'',
		 * 		'avgoppdur':'',
		 * 		'propswon':'',
		 * 		'propslost':'',
		 * 		'percpropswon':'',
		 * 		'avgpropsdur':'',
		 * 		'weekmrr':'',
		 * 		'monthmrr':''
		 * }
		 */
		'smdata':{}
	};
	
	//Dup Check. We first grab list of ALL Sales Metrics Data that is within capture week.
	//	  This is to ensure we do duplicate the entries.
	var dupflt = [new nlobjSearchFilter('custrecord_wsm_datecaptured', null, 'on', procJson.datecaptured)],
		dupcol = [new nlobjSearchColumn('internalid')],
		duprs = nlapiSearchRecord('customrecord_ax_weeklysalesmetrics', null, dupflt, dupcol);
		
	if (duprs && duprs.length > 0)
	{
		var errSbj = 'Duplicate Capture Week',
			errMsg = 'Week starting on '+procJson.datecaptured+' already processed. Please contact administrator';
		
		log('error','Duplicate Week', errMsg);
		
		nlapiSendEmail(-5, paramPrimaryErrNotif, errSbj, errMsg, paramCcErrNotif, null, null, null, true);
		
		return;
	}
	
	
	//Based on currendate, find out prior week start and end dates.
	//A. Week end date is current date - 1
	procJson.weekend = nlapiDateToString(nlapiAddDays(curDate, -1));
	
	//B. Week start date is current date - 7
	//in SS2.0, it's -6 for some reason
	procJson.weekstart = nlapiDateToString(nlapiAddDays(curDate, -7));
	
	log('debug','check point', JSON.stringify(procJson));
	
	//Script will go through ALL elements of this JSON and execute each search.
	//After each search, it will add to procJson.smdata by sales rep.
	//We grab all the data first and run the insert at once.
	
	//Each search we will add custom date parameter
	//	Some will require custom date parameters while others will not.
	//ASSUMPTION:
	//ALL Saved searches will always return two columns.
	//	0 = Sales Rep
	//	1 = Value
	try
	{
		//1. Run through Leads search 
		//JSON element: procJson.smdata[salesrep].leads
		//	Latest requirement states this search should run for ALL Times.
		//	leadsflt variable put in place just in case any changes occur
		var leadsflt = null,
			leadsrs = nlapiSearchRecord(null, paramLeadsSearchId, leadsflt, null);
		
		for (var l=0; leadsrs && l < leadsrs.length; l+=1)
		{
			var lallCols = leadsrs[0].getAllColumns(),
				leadsSr = leadsrs[l].getValue(lallCols[0]),
				leadsSrName = leadsrs[l].getText(lallCols[0]),
				leadsCnt = (leadsrs[l].getValue(lallCols[1])?leadsrs[l].getValue(lallCols[1]):0);
			
			if (!procJson.smdata[leadsSr])
			{
				//if this salesrep doesn't exist in smdata JSON object, initialize with ALL data points
				procJson.smdata[leadsSr] = initializeJson(leadsSrName);
				
				procJson.repids.push(leadsSr);
				
			}
			procJson.smdata[leadsSr].leads = parseInt(leadsCnt);
		}




		
		//1.5 Run through Unqualified Opps search 
		//JSON element: procJson.smdata[salesrep].unqualifiedopps
		//	Latest requirement states this search should run for ALL Times.
		//	unqualOpsFlt variable put in place just in case any changes occur
		var unqualOpsFlt =null,
			unqualOpsRsts = nlapiSearchRecord(null, paramUnqualifiedOppsSearchId, unqualOpsFlt, null);
		
		for (var unqopps=0; unqualOpsRsts && unqopps < unqualOpsRsts.length; unqopps+=1)
		{
			var uqallCols = unqualOpsRsts[0].getAllColumns(),
				uqopSr = unqualOpsRsts[unqopps].getValue(uqallCols[0]),
				uqopSrName = unqualOpsRsts[unqopps].getText(uqallCols[0]),
				uqopCnt = (unqualOpsRsts[unqopps].getValue(uqallCols[1])?unqualOpsRsts[unqopps].getValue(uqallCols[1]):0);
			
			if (!procJson.smdata[uqopSr])
			{
				//if this salesrep doesn't exist in smdata JSON object, initialize with ALL data points
				procJson.smdata[uqopSr] = initializeJson(uqopSrName);
				
				procJson.repids.push(uqopSr);				
			}
			procJson.smdata[uqopSr].unqualifiedopps = parseInt(uqopCnt);
		}		
		

	
		//2. Run through Total Opportunities search 
		//JSON element: procJson.smdata[salesrep].totalopps
		//	Latest requirement states this search should run for ALL Times.
		//	toppsflt variable put in place just in case any changes occur
		var toppsflt = null,
			toppsrs = nlapiSearchRecord(null, paramTotalOppsSearchId, toppsflt, null);
		
		for (var t=0; toppsrs && t < toppsrs.length; t+=1)
		{
			var tallCols = toppsrs[0].getAllColumns(),
				toppsSr = toppsrs[t].getValue(tallCols[0]),
				toppsSrName = toppsrs[t].getText(tallCols[0]),
				toppsCnt = (toppsrs[t].getValue(tallCols[1])?toppsrs[t].getValue(tallCols[1]):0);
			
			if (!procJson.smdata[toppsSr])
			{
				//if this salesrep doesn't exist in smdata JSON object, initialize with ALL data points
				procJson.smdata[toppsSr] = initializeJson(toppsSrName);
				
				procJson.repids.push(toppsSr);
			}
			procJson.smdata[toppsSr].totalopps = parseInt(toppsCnt);
		}
	


		//2A. Run through Total Opportunities search for WEEK Range 
		//JSON element: procJson.smdata[salesrep].totaloppsweek
		//	Grabs week range value
		//	TODO: Need to confirm the date to use for week range of total opportunities week value is trandate
		var toppswflt = [new nlobjSearchFilter('trandate', null, 'within', procJson.weekstart, procJson.weekend)],
		
			toppswrs = nlapiSearchRecord(null, paramTotalOppsSearchId, toppswflt, null);
		
		for (var tw=0; toppswrs && tw < toppswrs.length; tw+=1)
		{
			var twallCols = toppswrs[0].getAllColumns(),
				toppswSr = toppswrs[tw].getValue(twallCols[0]),
				toppswSrName = toppswrs[tw].getText(twallCols[0]),
				toppswCnt = (toppswrs[tw].getValue(twallCols[1])?toppswrs[tw].getValue(twallCols[1]):0);
			
			if (!procJson.smdata[toppswSr])
			{
				//if this salesrep doesn't exist in smdata JSON object, initialize with ALL data points
				procJson.smdata[toppswSr] = initializeJson(toppswSrName);
				
				procJson.repids.push(toppswSr);
			}
			procJson.smdata[toppswSr].totaloppsweek = parseInt(toppswCnt);
		}


		
		
		
				
		//2B. Run through Opportunities Converted to Qualified search
		//JSON element: procJson.smdata[salesrep].oppstoqualified
		//	Latest requirement states this search should run for ALL Times.
		//	oppstoquflt variable put in place just in case any changes occur
		var oppstoquflt =null,
			oppstoqurs = nlapiSearchRecord(null, paramOppsToQualfdSearchId, oppstoquflt, null);
		
		for (var otq=0; oppstoqurs && otq < oppstoqurs.length; otq+=1)
		{
			var otqallCols = oppstoqurs[0].getAllColumns(),
				otquSr = oppstoqurs[otq].getValue(otqallCols[0]),
				otquSrSrName = oppstoqurs[otq].getText(otqallCols[0]),
				otquCnt = (oppstoqurs[otq].getValue(otqallCols[1])?oppstoqurs[otq].getValue(otqallCols[1]):0);
			
			if (!procJson.smdata[otquSr])
			{
				//if this salesrep doesn't exist in smdata JSON object, initialize with ALL data points
				procJson.smdata[otquSr] = initializeJson(otquSrSrName);
				
				procJson.repids.push(otquSr);
			}
			procJson.smdata[otquSr].oppstoqualified = parseInt(otquCnt);
		}		
		
		
		
		//3. Run through MRR Opportunity $ search 
		//JSON element: procJson.smdata[salesrep].oppsmrr
		//	Latest requirement states this search should run for ALL Times.
		//	mrroppsflt variable put in place just in case any changes occur
		var mrroppsflt = null,
			mrroppsrs = nlapiSearchRecord(null, paramMrrOppSearchId, mrroppsflt, null);
		
		for (var mo=0; mrroppsrs && mo < mrroppsrs.length; mo+=1)
		{
			var moallCols = mrroppsrs[0].getAllColumns(),
				mooppsSr = mrroppsrs[mo].getValue(moallCols[0]),
				mooppsSrName = mrroppsrs[mo].getText(moallCols[0]),
				mooppsVal = (mrroppsrs[mo].getValue(moallCols[1])?mrroppsrs[mo].getValue(moallCols[1]):0.0);
			
			if (!procJson.smdata[mooppsSr])
			{
				//if this salesrep doesn't exist in smdata JSON object, initialize with ALL data points
				procJson.smdata[mooppsSr] = initializeJson(mooppsSrName);
				
				procJson.repids.push(mooppsSr);
			}
			//This is currency value. do parseFloat
			procJson.smdata[mooppsSr].oppsmrr = parseFloat(mooppsVal);
		}
		
		//4. Run through Total Proposals search 
		//JSON element: procJson.smdata[salesrep].totalprops
		//	Latest requirement states this search should run for ALL Times.
		//	tpropsflt variable put in place just in case any changes occur
		var tpropsflt = null,
			tpropsrs = nlapiSearchRecord(null, paramTotalPropSearchId, tpropsflt, null);
		
		for (var tp=0; tpropsrs && tp < tpropsrs.length; tp+=1)
		{
			var tpallCols = tpropsrs[0].getAllColumns(),
				tpropsSr = tpropsrs[tp].getValue(tpallCols[0]),
				tpropsSrName = tpropsrs[tp].getText(tpallCols[0]),
				tpropsCnt = (tpropsrs[tp].getValue(tpallCols[1])?tpropsrs[tp].getValue(tpallCols[1]):0);
			
			if (!procJson.smdata[tpropsSr])
			{
				//if this salesrep doesn't exist in smdata JSON object, initialize with ALL data points
				procJson.smdata[tpropsSr] = initializeJson(tpropsSrName);
				
				procJson.repids.push(tpropsSr);
			}
			procJson.smdata[tpropsSr].totalprops = parseInt(tpropsCnt);
		}
		
		//4A. Run through Total Proposals search 
		//JSON element: procJson.smdata[salesrep].totalpropsweek
		//	Grabs week range value
		//	WE are keeping this a separate search and separate field just incase they wnat to change it.
		//	In Custom Record, this is tracked as separate field even though it's same as Opp Converted to Prop value
		var twpropsflt = [new nlobjSearchFilter('custbody_converted_proposal', null, 'within', procJson.weekstart, procJson.weekend)],
			twpropsrs = nlapiSearchRecord(null, paramTotalPropSearchId, twpropsflt, null);
		
		for (var twp=0; twpropsrs && twp < twpropsrs.length; twp+=1)
		{
			var twpallCols = twpropsrs[0].getAllColumns(),
				twpropsSr = twpropsrs[twp].getValue(twpallCols[0]),
				twpropsSrName = twpropsrs[twp].getText(twpallCols[0]),
				twpropsCnt = (twpropsrs[twp].getValue(twpallCols[1])?twpropsrs[twp].getValue(twpallCols[1]):0);
			
			if (!procJson.smdata[twpropsSr])
			{
				//if this salesrep doesn't exist in smdata JSON object, initialize with ALL data points
				procJson.smdata[twpropsSr] = initializeJson(twpropsSrName);
				
				procJson.repids.push(twpropsSr);
			}
			procJson.smdata[twpropsSr].totalpropsweek = parseInt(twpropsCnt);
		}
		
		//5. Run through MRR Proposals $ search 
		//JSON element: procJson.smdata[salesrep].propsmrr
		//	Latest requirement states this search should run for ALL Times.
		//	mrroppsflt variable put in place just in case any changes occur
		var mrrpropsflt = null,
			mrrpropsrs = nlapiSearchRecord(null, paramMrrPropSearchId, mrrpropsflt, null);
		
		for (var mp=0; mrrpropsrs && mp < mrrpropsrs.length; mp+=1)
		{
			var mpallCols = mrrpropsrs[0].getAllColumns(),
				mpropsSr = mrrpropsrs[mp].getValue(mpallCols[0]),
				mpropsSrName = mrrpropsrs[mp].getText(mpallCols[0]),
				mpropsVal = (mrrpropsrs[mp].getValue(mpallCols[1])?mrrpropsrs[mp].getValue(mpallCols[1]):0.0);
			
			if (!procJson.smdata[mpropsSr])
			{
				//if this salesrep doesn't exist in smdata JSON object, initialize with ALL data points
				procJson.smdata[mpropsSr] = initializeJson(mpropsSrName);
				
				procJson.repids.push(mpropsSr);
			}
			//This is currency value. do parseFloat
			procJson.smdata[mpropsSr].propsmrr = parseFloat(mpropsVal);
		}
		
		//6. Run through Opportunities Converted to Proposal search 
		//JSON element: procJson.smdata[salesrep].opptoprops
		//	Latest requirement states this search should run for specified date range 
		//	of week start to week end
		var otopflt = [new nlobjSearchFilter('custbody_converted_proposal', null, 'within', procJson.weekstart, procJson.weekend)],
			otoprs = nlapiSearchRecord(null, paramOppToPropSearchId, otopflt, null);
		
		for (var op=0; otoprs && op < otoprs.length; op+=1)
		{
			var opallCols = otoprs[0].getAllColumns(),
				otopSr = otoprs[op].getValue(opallCols[0]),
				otopSrName = otoprs[op].getText(opallCols[0]),
				otopCnt = (otoprs[op].getValue(opallCols[1])?otoprs[op].getValue(opallCols[1]):0);
			
			if (!procJson.smdata[otopSr])
			{
				//if this salesrep doesn't exist in smdata JSON object, initialize with ALL data points
				procJson.smdata[otopSr] = initializeJson(otopSrName);
				
				procJson.repids.push(otopSr);
			}
			procJson.smdata[otopSr].opptoprops = parseInt(otopCnt);
		}
		
		//7. Run through Opportunities Lost search 
		//JSON element: procJson.smdata[salesrep].oppslost
		//	Latest requirement states this search should run for specified date range 
		//	of week start to week end
		var olflt = [new nlobjSearchFilter('custbody_opportunity_lost', null, 'within', procJson.weekstart, procJson.weekend)],
			olrs = nlapiSearchRecord(null, paramOppLostSearchId, olflt, null);
		
		for (var ol=0; olrs && ol < olrs.length; ol+=1)
		{
			var olallCols = olrs[0].getAllColumns(),
				olSr = olrs[ol].getValue(olallCols[0]),
				olSrName = olrs[ol].getText(olallCols[0]),
				olCnt = (olrs[ol].getValue(olallCols[1])?olrs[ol].getValue(olallCols[1]):0);
			
			if (!procJson.smdata[olSr])
			{
				//if this salesrep doesn't exist in smdata JSON object, initialize with ALL data points
				procJson.smdata[olSr] = initializeJson(olSrName);
				
				procJson.repids.push(olSr);
			}
			procJson.smdata[olSr].oppslost = parseInt(olCnt);
		}
		
		//8. Run through Avg. Opp Duration (Days) search 
		//JSON element: procJson.smdata[salesrep].avgoppdur
		//	Latest requirement states this search should run for ALL Times.
		//	aodflt variable put in place just in case any changes occur
		var aodflt = null,
			aodrs = nlapiSearchRecord(null, paramAvgOppDurSearchId, aodflt, null);
		
		for (var ad=0; aodrs && ad < aodrs.length; ad+=1)
		{
			var aodallCols = aodrs[0].getAllColumns(),
				aodSr = aodrs[ad].getValue(aodallCols[0]),
				aodSrName = aodrs[ad].getText(aodallCols[0]),
				aodCnt = (aodrs[ad].getValue(aodallCols[1])?aodrs[ad].getValue(aodallCols[1]):0);
			
			if (!procJson.smdata[aodSr])
			{
				//if this salesrep doesn't exist in smdata JSON object, initialize with ALL data points
				procJson.smdata[aodSr] = initializeJson(aodSrName);
				
				procJson.repids.push(aodSr);
			}
			procJson.smdata[aodSr].avgoppdur = parseInt(aodCnt);
		}
		
		//9. Run through Proposals Won search 
		//JSON element: procJson.smdata[salesrep].propswon
		//	Latest requirement states this search should run for specified date range 
		//	of week start to week end
		var pwflt = [new nlobjSearchFilter('custbody_proposal_won', null, 'within', procJson.weekstart, procJson.weekend)],
			pwrs = nlapiSearchRecord(null, paramPropWonSearchId, pwflt, null);
		
		for (var pw=0; pwrs && pw < pwrs.length; pw+=1)
		{
			var pwallCols = pwrs[0].getAllColumns(),
				pwSr = pwrs[pw].getValue(pwallCols[0]),
				pwSrName = pwrs[pw].getText(pwallCols[0]),
				pwCnt = (pwrs[pw].getValue(pwallCols[1])?pwrs[pw].getValue(pwallCols[1]):0);
			
			if (!procJson.smdata[pwSr])
			{
				//if this salesrep doesn't exist in smdata JSON object, initialize with ALL data points
				procJson.smdata[pwSr] = initializeJson(pwSrName);
				
				procJson.repids.push(pwSr);
			}
			procJson.smdata[pwSr].propswon = parseInt(pwCnt);
		}
		
		//10. Run through Proposals Lost search 
		//JSON element: procJson.smdata[salesrep].propslost
		//	Latest requirement states this search should run for specified date range 
		//	of week start to week end
		var plflt = [new nlobjSearchFilter('custbody_proposal_lost', null, 'within', procJson.weekstart, procJson.weekend)],
			plrs = nlapiSearchRecord(null, paramPropLostSearchId, plflt, null);
		
		for (var pl=0; plrs && pl < plrs.length; pl+=1)
		{
			var plallCols = plrs[0].getAllColumns(),
				plSr = plrs[pl].getValue(plallCols[0]),
				plSrName = plrs[pl].getText(plallCols[0]),
				plCnt = (plrs[pl].getValue(plallCols[1])?plrs[pl].getValue(plallCols[1]):0);
			
			if (!procJson.smdata[plSr])
			{
				//if this salesrep doesn't exist in smdata JSON object, initialize with ALL data points
				procJson.smdata[plSr] = initializeJson(plSrName);
				
				procJson.repids.push(plSr);
			}
			procJson.smdata[plSr].propslost = parseInt(plCnt);
		}
		
		//11. Run through Avg. Proposal Duration (Days) search 
		//JSON element: procJson.smdata[salesrep].avgpropsdur
		//	Latest requirement states this search should run for ALL Times.
		//	aodflt variable put in place just in case any changes occur
		var apdflt = null,
			apdrs = nlapiSearchRecord(null, paramAvgPropDurSearchId, apdflt, null);
		
		for (var ap=0; apdrs && ap < apdrs.length; ap+=1)
		{
			var apdallCols = apdrs[0].getAllColumns(),
				apdSr = apdrs[ap].getValue(apdallCols[0]),
				apdSrName = apdrs[ap].getText(apdallCols[0]),
				apdCnt = (apdrs[ap].getValue(apdallCols[1])?apdrs[ap].getValue(apdallCols[1]):0);
			
			if (!procJson.smdata[apdSr])
			{
				//if this salesrep doesn't exist in smdata JSON object, initialize with ALL data points
				procJson.smdata[apdSr] = initializeJson(apdSrName);
				
				procJson.repids.push(apdSr);
			}
			procJson.smdata[apdSr].avgpropsdur = parseInt(apdCnt);
		}
		
		//12. Run through Weekly MRR search 
		//JSON element: procJson.smdata[salesrep].weekmrr
		//	Latest requirement states this search should run for specified date range 
		//	of week start to week end
		var wmflt = [new nlobjSearchFilter('trandate', null, 'within', procJson.weekstart, procJson.weekend)],
			wmrs = nlapiSearchRecord(null, paramWeeklyMrrSearchId, wmflt, null);
		
		for (var wm=0; wmrs && wm < wmrs.length; wm+=1)
		{
			var wmallCols = wmrs[0].getAllColumns(),
				wmSr = wmrs[wm].getValue(wmallCols[0]),
				wmSrName = wmrs[wm].getText(wmallCols[0]),
				wmVal = (wmrs[wm].getValue(wmallCols[1])?wmrs[wm].getValue(wmallCols[1]):0);
			
			if (!procJson.smdata[wmSr])
			{
				//if this salesrep doesn't exist in smdata JSON object, initialize with ALL data points
				procJson.smdata[wmSr] = initializeJson(wmSrName);
				
				procJson.repids.push(wmSr);
			}
			procJson.smdata[wmSr].weekmrr = parseFloat(wmVal);
		}



		
		//13. Run through Monthly MRR search 
		//JSON element: procJson.smdata[salesrep].monthmrr
		//	Latest requirement states this search should run for specified date range 
		//	of Month range based on week start date.
		//	if week start date is 9/26/2016, we look at 9/1/2016 to 9/30/2016
		var weekStartObj = nlapiStringToDate(procJson.weekstart),
			monthStartObj = new Date((weekStartObj.getMonth()+1)+'/1/'+weekStartObj.getFullYear()),
			monthEndObj = null;
		
		//Add one month to month start and subtract one day to get last day of the month
		monthEndObj = nlapiAddMonths(monthStartObj, 1);
		monthEndObj = nlapiAddDays(monthEndObj, -1);
		
		log('debug','13 Month start and end', monthStartObj+' // '+monthEndObj);
		
		var mmflt = [new nlobjSearchFilter('trandate', null, 'within', nlapiDateToString(monthStartObj), nlapiDateToString(monthEndObj))],
			mmrs = nlapiSearchRecord(null, paramMonthlyMrrSearchId, mmflt, null);
		
		for (var mm=0; mmrs && mm < mmrs.length; mm+=1)
		{
			var mmallCols = mmrs[0].getAllColumns(),
				mmSr = mmrs[mm].getValue(mmallCols[0]),
				mmSrName = mmrs[mm].getText(mmallCols[0]),
				mmVal = (mmrs[mm].getValue(mmallCols[1])?mmrs[mm].getValue(mmallCols[1]):0);
			
			if (!procJson.smdata[mmSr])
			{
				//if this salesrep doesn't exist in smdata JSON object, initialize with ALL data points
				procJson.smdata[mmSr] = initializeJson(mmSrName);
				
				procJson.repids.push(mmSr);
			}
			procJson.smdata[mmSr].monthmrr = parseFloat(mmVal);
		}


		

		//13 A. Run through Weekly Approved Orders search 
		//JSON element: procJson.smdata[salesrep].weeklyapproved
		//	Latest requirement states this search should run for specified date range 
		//	wkappflt variable put in place just in case any changes occur
		var wkappflt = [new nlobjSearchFilter('trandate', null, 'within', procJson.weekstart, procJson.weekend)],
			wkapprs = nlapiSearchRecord(null, paramWeeklyAppvdSearchId, wkappflt, null);
		
		for (var wkapp=0; wkapprs && wkapp < wkapprs.length; wkapp+=1)
		{
			var wkapprsallCols = wkapprs[0].getAllColumns(),
				wkappSr = wkapprs[wkapp].getValue(wkapprsallCols[0]),
				wkappSrName = wkapprs[wkapp].getText(wkapprsallCols[0]),
				wkappVal = (wkapprs[wkapp].getValue(wkapprsallCols[1])?wkapprs[wkapp].getValue(wkapprsallCols[1]):0);
			
			if (!procJson.smdata[wkappSr])
			{
				//if this salesrep doesn't exist in smdata JSON object, initialize with ALL data points
				procJson.smdata[wkappSr] = initializeJson(wkappSrName);
				
				procJson.repids.push(wkappSr);
			}
			procJson.smdata[wkappSr].weeklyapproved = parseFloat(wkappVal);
		}




		//13 B. Run through Montly Approved Orders search 
		//JSON element: procJson.smdata[salesrep].monthlyapproved
		//	Latest requirement states this search should run for specified date range 
		//	mnappflt variable put in place just in case any changes occur
		var mnappflt = [new nlobjSearchFilter('trandate', null, 'within', nlapiDateToString(monthStartObj), nlapiDateToString(monthEndObj))],
			mnapprs = nlapiSearchRecord(null, paramMonthlyAppvdSearchId, mnappflt, null);
		
		for (var mnapp=0; mnapprs && mnapp < mnapprs.length; mnapp+=1)
		{
			var mnapprsallCols = mnapprs[0].getAllColumns(),
				mnappSr = mnapprs[mnapp].getValue(mnapprsallCols[0]),
				mnappSrName = mnapprs[mnapp].getText(mnapprsallCols[0]),
				mnappVal = (mnapprs[mnapp].getValue(mnapprsallCols[1])?mnapprs[mnapp].getValue(mnapprsallCols[1]):0);
			
			if (!procJson.smdata[mnappSr])
			{
				//if this salesrep doesn't exist in smdata JSON object, initialize with ALL data points
				procJson.smdata[mnappSr] = initializeJson(mnappSrName);
				
				procJson.repids.push(mnappSr);
			}
			procJson.smdata[mnappSr].monthlyapproved = parseFloat(mnappVal);
		}





		
		//14. Calculate % of Opps to Proposal (percoppstoprops) AND
		//				% Proposals Won (percpropswon)
		//	  for ALL Sales Rep Data
		for (var sr in procJson.smdata)
		{
			//Find out the value of Total Opps + Total Proposals + Opp. Lost
			//	if this value is 0, we mark percoppstopropsVal as 0
			//10/17/2016
			//Request changed to use week range data to calculate % of Opps to Props
			var opplVal = procJson.smdata[sr].totaloppsweek +
						  procJson.smdata[sr].totalpropsweek + 
						  procJson.smdata[sr].oppslost;
			
			var percoppstopropsVal = 0;
			
			//Only calculate % of Opps to Proposal if opplVal is greater than 0.
			//	You can't divide by 0
			if (opplVal > 0)
			{
				percoppstopropsVal = (procJson.smdata[sr].opptoprops / opplVal) * 100;
			}
			
			procJson.smdata[sr].percoppstoprops = percoppstopropsVal;
			
			//Find out the value of Proposal Won + Proposal Lost
			//	if this value is 0, we mark percpropswon as 0
			var pwlVal = procJson.smdata[sr].propswon +
						 procJson.smdata[sr].propslost;
			
			var percpropswonVal = 0;
			
			//Only calculate % of Proposals Won if pwlVal is greater than 0.
			//	You can't divide by 0
			if (pwlVal > 0)
			{
				percpropswonVal = (procJson.smdata[sr].propswon / pwlVal) * 100;
			}
			
			procJson.smdata[sr].percpropswon = percpropswonVal;
		}
		
		log('debug','Check point', 'Data Processing complete');
		
		//CHECK POINT Logic.
		//This IF we gotten to this point, we need to temporarily save the JSON file 
		//	JUST in case something goes wrong during database operation.
		try
		{
			//tempFolderId
			var ckfile = nlapiCreateFile(new Date().getTime()+'WeeklyDataCapture.json', 'JSON', JSON.stringify(procJson));
			ckfile.setFolder(tempFolderId);
			//Note it on the procJson object
			//	On Saved file, jsonfileid will always be empty. 
			//	it doesn't matter. jsonfileid is only needed to delete once done processing
			procJson.jsonfileid = nlapiSubmitFile(ckfile);
			
		}
		catch(chkpointerr)
		{
			nlapiSendEmail(
				-5, 
				paramPrimaryErrNotif, 
				'Weekly Sales Metric Data Capture JSON file Save', 
				'Checkpoint to save the processed JSON object failed. Attached is the copy incase something goes wrong during data insertion',
				paramCcErrNotif, 
				null, 
				null, 
				[ckfile], 
				true
			);
				
		}
		
		//15. Look up all inactive employees in the list and build JSON object
		//	  If Rep is inactive, do NOT set the employee field
		var ieJson = {};
			ieflt = [new nlobjSearchFilter('internalid', null, 'anyof', procJson.repids),
		             new nlobjSearchFilter('isinactive', null, 'is', 'T')],
			iecol = [new nlobjSearchColumn('internalid')],
			iers = nlapiSearchRecord('employee', null, ieflt, iecol);
		for (var e=0; iers && e < iers.length; e+=1)
		{
			ieJson[iers[e].getValue('internalid')] = 'Inactive';
		}
		
		//16. Loop through all procJson.smdata reps and add to Custom Record.
		//	  SKIP if already added
		for (var s in procJson.smdata)
		{
			var smrec = nlapiCreateRecord('customrecord_ax_weeklysalesmetrics'),
				recname = procJson.smdata[s].srname+
						  ' '+
						  procJson.weekstart+
						  '-'+
						  procJson.weekend,
				procNotes = '';
			
			if (ieJson[s])
			{
				procNotes = 'Sales Rep '+procJson.smdata[s].srname+' ('+s+') is Inactive';
			}
				
			smrec.setFieldValue('name', recname);
			smrec.setFieldValue('custrecord_wsm_weekrange', procJson.weekstart+' - '+procJson.weekend);
			smrec.setFieldValue('custrecord_wsm_datecaptured', procJson.datecaptured);
			smrec.setFieldValue('custrecord_wsm_startweekdate', procJson.weekstart);
			smrec.setFieldValue('custrecord_wsm_endweekdate', procJson.weekend);
			//ONLY set Employee IF he/she is active
			if (!ieJson[s])
			{
				smrec.setFieldValue('custrecord_wsm_salesrep', s);
			}
			smrec.setFieldValue('custrecord_wsm_procnotes',procNotes);
			smrec.setFieldValue('custrecord_wsm_totalnumleads',procJson.smdata[s].leads);						
			smrec.setFieldValue('custrecord_wsm_unqualifiedopps',procJson.smdata[s].unqualifiedopps);						
			smrec.setFieldValue('custrecord_wsm_totalopps',procJson.smdata[s].totalopps);			
			smrec.setFieldValue('custrecord_wsm_opps_to_qualified',procJson.smdata[s].oppstoqualified);									
			//10/17/2016
			//Add in Week data for total opportunities
			smrec.setFieldValue('custrecord_wsm_totaloppsweek', procJson.smdata[s].totaloppsweek);
			smrec.setFieldValue('custrecord_wsm_totalmrropp',procJson.smdata[s].oppsmrr);
			smrec.setFieldValue('custrecord_wsm_totalproposals',procJson.smdata[s].totalprops);
			//10/17/2016
			//Add in Week data for total proposals
			smrec.setFieldValue('custrecord_wsm_totalproposalsweek',procJson.smdata[s].totalpropsweek);
			smrec.setFieldValue('custrecord_wsm_totalmrrproposal',procJson.smdata[s].propsmrr);
			smrec.setFieldValue('custrecord_wsm_totalopptopro',procJson.smdata[s].opptoprops);
			smrec.setFieldValue('custrecord_wsm_opplost',procJson.smdata[s].oppslost);
			smrec.setFieldValue('custrecord_wsm_percoppstoproposal',procJson.smdata[s].percoppstoprops);
			smrec.setFieldValue('custrecord_wsm_avgoppdurationdays',procJson.smdata[s].avgoppdur);
			smrec.setFieldValue('custrecord_wsm_proposalswon',procJson.smdata[s].propswon);
			smrec.setFieldValue('custrecord_wsm_proposalslost',procJson.smdata[s].propslost);
			smrec.setFieldValue('custrecord_wsm_percproposalswon',procJson.smdata[s].percpropswon);
			smrec.setFieldValue('custrecord_wsm_avgproposaldurationdays',procJson.smdata[s].avgpropsdur);
			smrec.setFieldValue('custrecord_wsm_weeklymrr',procJson.smdata[s].weekmrr);
			smrec.setFieldValue('custrecord_wsm_monthlymrr',procJson.smdata[s].monthmrr);
			
			smrec.setFieldValue('custrecord_wsm_weeklyapprovedorders',procJson.smdata[s].weeklyapproved);
			smrec.setFieldValue('custrecord_wsm_monthlyapprovedorders',procJson.smdata[s].monthlyapproved);			
			
			nlapiSubmitRecord(smrec, true, true);
		}
		
		//17. At this point, we can clear out the temp file
		try
		{
			nlapiDeleteFile(procJson.jsonfileid);
		}
		catch(filedelerr)
		{
			throw nlapiCreateError(
				'WEEKLY_CAPTURE_WARNING', 
				'All process completed but failed to delete temp. json file id '+procJson.jsonfileid, 
				true
			);
		}
		
		log('debug','Final Usage', nlapiGetContext().getRemainingUsage());
		
	}
	catch(procerr)
	{
		log('error', 'Error Processing Weekly Data Capture', getErrText(procerr));
		
		//Throw the error so that it terminates the script and also generates custom error message
		throw nlapiCreateError(
			'WEEKLY_CAPTURE_ERR', 
			'Error Detail: '+getErrText(procerr)+' \n\n Process JSON: '+JSON.stringify(procJson), 
			false
		);
	}	
}

/********** HELPER *************/

/**
 * This will build initial JSON object with ALL data elements 
 * defaulted to 0, 0.0 or 0.0
 */
function initializeJson(_srName)
{
	return {
		'srname':_srName,
		'leads':0,
		'unqualifiedopps':0,
		'totalopps':0,		
		'totaloppsweek':0,
		'oppstoqualified':0,		
		'oppsmrr':0.0,
		'totalprops':0,
		'totalpropsweek':0,
		'propsmrr':0.0,
		'opptoprops':0,
		'oppslost':0,
		'percoppstoprops':0.0,
		'avgoppdur':0,
		'propswon':0,
		'propslost':0,
		'percpropswon':0.0,
		'avgpropsdur':0,
		'weekmrr':0.0,
		'monthmrr':0.0,
		'weeklyapproved':0.0,	
		'monthlyapproved':0.0			
		
	};
}
