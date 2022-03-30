nlapiLogExecution("audit","FLOStart",new Date().getTime());
/**
 * Suitelet that displays Weekly Sales Metric Data
 * Display will default to current Month/Year and populate
 * the filter lists accordingly.
 * @param req
 * @param res
 */
function displayWsm(req, res)
{
	var nsform = nlapiCreateForm('Weekly Sales Metrics', false);
	nsform.setScript('customscript_ax_cs1_weeklysmdview');
	
	//Add Error or any other message display field
	var msgfld = nsform.addField('custpage_msgfld', 'inlinehtml','Message', null, null);
	msgfld.setLayoutType('outsideabove', null);
	
	//Request Level Parameters
	//	These are parameters are user filters
	var paramYear = (req.getParameter('custpage_year')?req.getParameter('custpage_year'):''),
		paramMonth = (req.getParameter('custpage_month')?req.getParameter('custpage_month'):''),
		paramWeekStartDate = (req.getParameter('custpage_weekstartdt')?req.getParameter('custpage_weekstartdt'):''),
		paramSalesRep = (req.getParameter('custpage_salesrep')?req.getParameter('custpage_salesrep'):''),
		paramSalesTeam = (req.getParameter('custpage_salesteam')?req.getParameter('custpage_salesteam'):''),
		
		paramStatusMsg = (req.getParameter('custparam_msg')?req.getParameter('custparam_msg'):''),
		
		//Values that are allowed to be drilled down to view detail will pass in drilltype value.
		//	IF drilltype value is set, this SUITELET will use setRedirectURLToSearchResults
		//	API to redirect the user to the result of the search.
		//	Instead of loading the associated with saved searches, we are going
		//	dynamically clone the search definitions from original and redirect the user
		paramDrillDownType = (req.getParameter('drilltype')?req.getParameter('drilltype'):''),
		paramDrillDownRep = (req.getParameter('ddrep')?req.getParameter('ddrep'):'');
	
	//11/3/2016
	//Request to make salesteam and salesrep multiselect
	var arParamSalesRep = [],
		arParamSalesTeam = [];
	//Turn it into an array
	if (paramSalesRep)
	{
		arParamSalesRep = paramSalesRep.split(',');
	}
	
	if (paramSalesTeam)
	{
		arParamSalesTeam = paramSalesTeam.split(',');
	}
	
	
	
	log('debug', 'paramSalesRep', paramSalesRep);
	log('debug', 'paramSalesTeam', paramSalesTeam);
	
	if (paramStatusMsg)
	{
		msgfld.setDefaultValue(
			'<div style="font-weight:bold; padding: 10px; font-size: 15px">'+
			paramStatusMsg+
			'</div>'
		);
	}
	
	//Company Level Script Search ID Parameters
	//Grab Saved Search IDs for mapped columns
	var paramLeadsSearchId = nlapiGetContext().getSetting('SCRIPT','custscript_450_leadsearch'),
	
		paramUnqalifiedOppsSearchId = nlapiGetContext().getSetting('SCRIPT','custscript_450_unqualifiedopps'),	//NEW
		
		paramTotalOppsSearchId = nlapiGetContext().getSetting('SCRIPT','custscript_450_totaloppsearch'),

		paramOppsToQualifiedSearchId = nlapiGetContext().getSetting('SCRIPT','custscript_450_opps_to_qualified'),	//NEW
		
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
		paramMonthlyMrrSearchId = nlapiGetContext().getSetting('SCRIPT','custscript_450_monthmrrsearch'),
		
		paramWeeklyApprovedSearchId = nlapiGetContext().getSetting('SCRIPT','custscript_450_weeklyapproved'),	//NEW
		paramMonthlyApprovedSearchId = nlapiGetContext().getSetting('SCRIPT','custscript_450_monthlyapproved');	//NEW	
		
	
	//Function defined in Audaxium_Spectrio_Utility.js
	//Simply returns month index and abbr. value of month
	var monthJson = getMonthJson();
	
	try
	{
		//============ Process Drill Down based on paramDrillDownType ========================
		if (paramDrillDownType)
		{
			//If WEEK is selected, we add in the range.
			//Otherwise, show for all time
			var weekend = '';
			if (paramWeekStartDate)
			{
				//Calculate the range same way as the scheduled script but in reverse
				//	since we are getting week start value
				weekend = nlapiDateToString(nlapiAddDays(new Date(paramWeekStartDate), 6));
			}
			
			
			
			//monthlyapproved																										//NEW BLOCK																																										
			if (paramDrillDownType == 'monthlyapproved')																				//
			{
				//We first load the original search
				var mnthlyApprovedSearch = nlapiLoadSearch(null,paramMonthlyApprovedSearchId),
					//We grab the filters from original saved search used by Scheduled Script.
					//Assumes that it is NOT using expression based search
					mnthlyappFlt = mnthlyApprovedSearch.getFilters(),
					newmnthlyappFlt = [],
					//We custom build the search results for lead search
					//ungrouped
					mnthlyappCol = [new nlobjSearchColumn('trandate'),
					            new nlobjSearchColumn('tranid'),
					            new nlobjSearchColumn('entity'),
					            new nlobjSearchColumn('custbody_comm_mrr'),
					            new nlobjSearchColumn('salesrep')];
				
				for (var mnthlyapp=0; mnthlyapp < mnthlyappFlt.length; wmnthlyapp+=1)
				{
					newmnthlyappFlt.push(mnthlyappFlt[mnthlyapp]);
				}
				
				//we need to add in filter specific for THIS sales rep
				newmnthlyappFlt.push(new nlobjSearchFilter('salesrep', null, 'anyof', paramDrillDownRep));
				//Add in Range. For Monthly MRR, we base it on selected week start date
				//So if Week start date is 10/3/2016, range will be start and end dates for Month of October
				//Please Note, if the week crosses month, it will grab start/end dates for the Month based on 
				//start of the week date
				var weekStartDatObj = nlapiStringToDate(paramWeekStartDate),
					monthStart = new Date((weekStartDatObj.getMonth()+1)+'/1/'+weekStartDatObj.getFullYear()),
					monthEnd = nlapiAddMonths(monthStart, 1);
				
				//subtract 1 day from monthEnd to get last date for the month
				monthEnd = nlapiAddDays(monthEnd, -1);
				
				newmnthlyappFlt.push(new nlobjSearchFilter('trandate', null, 'within', nlapiDateToString(monthStart), nlapiDateToString(monthEnd)));
				
				var	mnthlyApprovedCloneSearch = nlapiCreateSearch(
										mnthlyApprovedSearch.getSearchType(), 
										newmnthlyappFlt,
										mnthlyappCol
									   );
				mnthlyApprovedCloneSearch.setRedirectURLToSearchResults();
				return;
			}																															//
																																	//NEW BLOCK




																																	

			//weeklyapproved																										//NEW BLOCK																																										
			if (paramDrillDownType == 'weeklyapproved')																					//
			{
				//We first load the original search
				var wklyApprovedSearch = nlapiLoadSearch(null,paramWeeklyApprovedSearchId),
					//We grab the filters from original saved search used by Scheduled Script.
					//Assumes that it is NOT using expression based search
					wklyappFlt = wklyApprovedSearch.getFilters(),
					newwklyappFlt = [],
					//We custom build the search results for lead search
					//ungrouped
					wklyappCol = [new nlobjSearchColumn('trandate'),
					            new nlobjSearchColumn('tranid'),
					            new nlobjSearchColumn('entity'),
					            new nlobjSearchColumn('custbody_comm_mrr'),
					            new nlobjSearchColumn('salesrep')];
				
				for (var wklyapp=0; wklyapp < wklyappFlt.length; wklyapp+=1)
				{
					newwklyappFlt.push(wklyappFlt[wklyapp]);
				}
				
				//we need to add in filter specific for THIS sales rep
				newwklyappFlt.push(new nlobjSearchFilter('salesrep', null, 'anyof', paramDrillDownRep));
				//Add in Range. For Monthly MRR, we base it on selected week start date
				//So if Week start date is 10/3/2016, range will be start and end dates for Month of October
				//Please Note, if the week crosses month, it will grab start/end dates for the Month based on 
				//start of the week date
				var weekStartDatObj = nlapiStringToDate(paramWeekStartDate),
					monthStart = new Date((weekStartDatObj.getMonth()+1)+'/1/'+weekStartDatObj.getFullYear()),
					monthEnd = nlapiAddMonths(monthStart, 1);
				
				//subtract 1 day from monthEnd to get last date for the month
				monthEnd = nlapiAddDays(monthEnd, -1);
				
				newwklyappFlt.push(new nlobjSearchFilter('trandate', null, 'within', nlapiDateToString(monthStart), nlapiDateToString(monthEnd)));
				
				var	wklyApprovedCloneSearch = nlapiCreateSearch(
										wklyApprovedSearch.getSearchType(), 
										newwklyappFlt,
										wklyappCol
									   );
				wklyApprovedCloneSearch.setRedirectURLToSearchResults();
				return;
			}																																		//
																																				//NEW BLOCK




			
			//mmrr
			if (paramDrillDownType == 'mmrr')
			{
				//We first load the original search
				var mmrrSearch = nlapiLoadSearch(null,paramMonthlyMrrSearchId),
					//We grab the filters from original saved search used by Scheduled Script.
					//Assumes that it is NOT using expression based search
					mmrrFlt = mmrrSearch.getFilters(),
					newmmrrFlt = [],
					//We custom build the search results for lead search
					//ungrouped
					mmrrCol = [new nlobjSearchColumn('trandate'),
					            new nlobjSearchColumn('tranid'),
					            new nlobjSearchColumn('entity'),
					            new nlobjSearchColumn('custbody_comm_mrr'),
					            new nlobjSearchColumn('salesrep')];
				
				for (var mmrrs=0; mmrrs < mmrrFlt.length; mmrrs+=1)
				{
					newmmrrFlt.push(mmrrFlt[mmrrs]);
				}
				
				//we need to add in filter specific for THIS sales rep
				newmmrrFlt.push(new nlobjSearchFilter('salesrep', null, 'anyof', paramDrillDownRep));
				//Add in Range. For Monthly MRR, we base it on selected week start date
				//So if Week start date is 10/3/2016, range will be start and end dates for Month of October
				//Please Note, if the week crosses month, it will grab start/end dates for the Month based on 
				//start of the week date
				var weekStartDatObj = nlapiStringToDate(paramWeekStartDate),
					monthStart = new Date((weekStartDatObj.getMonth()+1)+'/1/'+weekStartDatObj.getFullYear()),
					monthEnd = nlapiAddMonths(monthStart, 1);
				
				//subtract 1 day from monthEnd to get last date for the month
				monthEnd = nlapiAddDays(monthEnd, -1);
				
				newmmrrFlt.push(new nlobjSearchFilter('trandate', null, 'within', nlapiDateToString(monthStart), nlapiDateToString(monthEnd)));
				
				var	mmrrCloneSearch = nlapiCreateSearch(
										mmrrSearch.getSearchType(), 
										newmmrrFlt,
										mmrrCol
									   );
				mmrrCloneSearch.setRedirectURLToSearchResults();
				return;
			}






			
			//wmrr
			if (paramDrillDownType == 'wmrr')
			{
				//We first load the original search
				var wmrrSearch = nlapiLoadSearch(null,paramWeeklyMrrSearchId),
					//We grab the filters from original saved search used by Scheduled Script.
					//Assumes that it is NOT using expression based search
					wmrrFlt = wmrrSearch.getFilters(),
					newwmrrFlt = [],
					//We custom build the search results for lead search
					//ungrouped
					wmrrCol = [new nlobjSearchColumn('trandate'),
					            new nlobjSearchColumn('tranid'),
					            new nlobjSearchColumn('entity'),
					            new nlobjSearchColumn('custbody_comm_mrr'),
					            new nlobjSearchColumn('salesrep')];
				
				for (var wmrrs=0; wmrrs < wmrrFlt.length; wmrrs+=1)
				{
					newwmrrFlt.push(wmrrFlt[wmrrs]);
				}
				
				//we need to add in filter specific for THIS sales rep
				newwmrrFlt.push(new nlobjSearchFilter('salesrep', null, 'anyof', paramDrillDownRep));
				//Add in Range
				newwmrrFlt.push(new nlobjSearchFilter('trandate', null, 'within', paramWeekStartDate, weekend));
				
				var	wmrrCloneSearch = nlapiCreateSearch(
										wmrrSearch.getSearchType(), 
										newwmrrFlt,
										wmrrCol
									   );
				wmrrCloneSearch.setRedirectURLToSearchResults();
				return;
			}
			
			//apdd
			if (paramDrillDownType == 'apdd')
			{
				var numDaysCol = new nlobjSearchColumn('formulanumeric');
				numDaysCol.setFunction('round');
				numDaysCol.setFormula(
					'to_number({custbody_proposal_won}-{custbody_converted_proposal})'
				);
				numDaysCol.setLabel('# of Days');
				//We first load the original search
				var apddSearch = nlapiLoadSearch(null,paramAvgPropDurSearchId),
					//We grab the filters from original saved search used by Scheduled Script.
					//Assumes that it is NOT using expression based search
					apddFlt = apddSearch.getFilters(),
					newapddFlt = [],
					//We custom build the search results for lead search
					//ungrouped
					apddCol = [new nlobjSearchColumn('trandate'),
					           new nlobjSearchColumn('tranid'),
					           new nlobjSearchColumn('datecreated'),
					           new nlobjSearchColumn('custbody_converted_proposal'),
					           new nlobjSearchColumn('entity'),
					           numDaysCol,
					           new nlobjSearchColumn('salesrep')];
				
				for (var apdds=0; apdds < apddFlt.length; apdds+=1)
				{
					newapddFlt.push(apddFlt[apdds]);
				}
				
				//we need to add in filter specific for THIS sales rep
				newapddFlt.push(new nlobjSearchFilter('salesrep', null, 'anyof', paramDrillDownRep));
				var	apddCloneSearch = nlapiCreateSearch(
										apddSearch.getSearchType(), 
										newapddFlt,
										apddCol
									  );
				apddCloneSearch.setRedirectURLToSearchResults();
				return;
			}
			
			//plost
			if (paramDrillDownType == 'plost')
			{
				//We first load the original search
				var plostSearch = nlapiLoadSearch(null,paramPropLostSearchId),
					//We grab the filters from original saved search used by Scheduled Script.
					//Assumes that it is NOT using expression based search
					plostFlt = plostSearch.getFilters(),
					newplostFlt = [],
					//We custom build the search results for lead search
					//ungrouped
					plostCol = [new nlobjSearchColumn('trandate'),
					            new nlobjSearchColumn('tranid'),
					            new nlobjSearchColumn('entity'),
					            new nlobjSearchColumn('custbody_proposal_lost'),
					            new nlobjSearchColumn('salesrep')];
				
				for (var plosts=0; plosts < plostFlt.length; plosts+=1)
				{
					newplostFlt.push(plostFlt[plosts]);
				}
				
				//we need to add in filter specific for THIS sales rep
				newplostFlt.push(new nlobjSearchFilter('salesrep', null, 'anyof', paramDrillDownRep));
				//Add in Range
				newplostFlt.push(new nlobjSearchFilter('custbody_proposal_lost', null, 'within', paramWeekStartDate, weekend));
				
				var	plostCloneSearch = nlapiCreateSearch(
										plostSearch.getSearchType(), 
										newplostFlt,
										plostCol
									   );
				plostCloneSearch.setRedirectURLToSearchResults();
				return;
			}
			
			//pwon
			if (paramDrillDownType == 'pwon')
			{
				//We first load the original search
				var pwonSearch = nlapiLoadSearch(null,paramPropWonSearchId),
					//We grab the filters from original saved search used by Scheduled Script.
					//Assumes that it is NOT using expression based search
					pwonFlt = pwonSearch.getFilters(),
					newpwonFlt = [],
					//We custom build the search results for lead search
					//ungrouped
					pwonCol = [new nlobjSearchColumn('trandate'),
					           new nlobjSearchColumn('tranid'),
					           new nlobjSearchColumn('entity'),
					           new nlobjSearchColumn('custbody_proposal_won'),
					           new nlobjSearchColumn('salesrep')];
				
				for (var pwons=0; pwons < pwonFlt.length; pwons+=1)
				{
					newpwonFlt.push(pwonFlt[pwons]);
				}
				
				//we need to add in filter specific for THIS sales rep
				newpwonFlt.push(new nlobjSearchFilter('salesrep', null, 'anyof', paramDrillDownRep));
				//Add in Range
				newpwonFlt.push(new nlobjSearchFilter('custbody_proposal_won', null, 'within', paramWeekStartDate, weekend));
				
				var	pwonCloneSearch = nlapiCreateSearch(
										pwonSearch.getSearchType(), 
										newpwonFlt,
										pwonCol
									  );
				pwonCloneSearch.setRedirectURLToSearchResults();
				return;
			}
			
			//aodd
			if (paramDrillDownType == 'aodd')
			{
				var numDaysCol = new nlobjSearchColumn('formulanumeric');
				numDaysCol.setFunction('round');
				numDaysCol.setFormula(
					'CASE WHEN (to_number({custbody_converted_proposal}-cast({datecreated} as date)))<0 THEN '+
					'0 ELSE (to_number({custbody_converted_proposal}-cast({datecreated} as date))) END'
				);
				numDaysCol.setLabel('# of Days');
				//We first load the original search
				var aoddSearch = nlapiLoadSearch(null,paramAvgOppDurSearchId),
					//We grab the filters from original saved search used by Scheduled Script.
					//Assumes that it is NOT using expression based search
					aoddFlt = aoddSearch.getFilters(),
					newaoddFlt = [],
					//We custom build the search results for lead search
					//ungrouped
					aoddCol = [new nlobjSearchColumn('trandate'),
					           new nlobjSearchColumn('tranid'),
					           new nlobjSearchColumn('datecreated'),
					           new nlobjSearchColumn('custbody_converted_proposal'),
					           new nlobjSearchColumn('entity'),
					           numDaysCol,
					           new nlobjSearchColumn('salesrep')];
				
				for (var aodds=0; aodds < aoddFlt.length; aodds+=1)
				{
					newaoddFlt.push(aoddFlt[aodds]);
				}
				
				//we need to add in filter specific for THIS sales rep
				newaoddFlt.push(new nlobjSearchFilter('salesrep', null, 'anyof', paramDrillDownRep));
				var	aoddCloneSearch = nlapiCreateSearch(
										aoddSearch.getSearchType(), 
										newaoddFlt,
										aoddCol
									  );
				aoddCloneSearch.setRedirectURLToSearchResults();
				return;
			}
			
			//olost
			if (paramDrillDownType == 'olost')
			{
				//We first load the original search
				var olostSearch = nlapiLoadSearch(null,paramOppLostSearchId),
					//We grab the filters from original saved search used by Scheduled Script.
					//Assumes that it is NOT using expression based search
					olostFlt = olostSearch.getFilters(),
					newolostFlt = [],
					//We custom build the search results for lead search
					//ungrouped
					olostCol = [new nlobjSearchColumn('trandate'),
					            new nlobjSearchColumn('tranid'),
					            new nlobjSearchColumn('entity'),
					            new nlobjSearchColumn('custbody_opportunity_lost'),
					            new nlobjSearchColumn('salesrep')];
				
				for (var olosts=0; olosts < olostFlt.length; olosts+=1)
				{
					newolostFlt.push(olostFlt[olosts]);
				}
				
				//we need to add in filter specific for THIS sales rep
				newolostFlt.push(new nlobjSearchFilter('salesrep', null, 'anyof', paramDrillDownRep));
				//Add in Range
				newolostFlt.push(new nlobjSearchFilter('custbody_opportunity_lost', null, 'within', paramWeekStartDate, weekend));
				
				var	olostCloneSearch = nlapiCreateSearch(
										olostSearch.getSearchType(), 
										newolostFlt,
										olostCol
									  );
				olostCloneSearch.setRedirectURLToSearchResults();
				return;
			}
			
			//otop
			if (paramDrillDownType == 'otop')
			{
				//We first load the original search
				var otopSearch = nlapiLoadSearch(null,paramOppToPropSearchId),
					//We grab the filters from original saved search used by Scheduled Script.
					//Assumes that it is NOT using expression based search
					otopFlt = otopSearch.getFilters(),
					newotopFlt = [],
					//We custom build the search results for lead search
					//ungrouped
					otopCol = [new nlobjSearchColumn('trandate'),
					           new nlobjSearchColumn('tranid'),
					           new nlobjSearchColumn('entity'),
					           new nlobjSearchColumn('custbody_converted_proposal'),
					           new nlobjSearchColumn('salesrep')];
				
				for (var otops=0; otops < otopFlt.length; otops+=1)
				{
					newotopFlt.push(otopFlt[otops]);
				}
				
				//we need to add in filter specific for THIS sales rep
				newotopFlt.push(new nlobjSearchFilter('salesrep', null, 'anyof', paramDrillDownRep));
				//Add in Range
				newotopFlt.push(new nlobjSearchFilter('custbody_converted_proposal', null, 'within', paramWeekStartDate, weekend));
				
				var	otopCloneSearch = nlapiCreateSearch(
										otopSearch.getSearchType(), 
										newotopFlt,
										otopCol
									  );
				otopCloneSearch.setRedirectURLToSearchResults();
				return;
			}
			
			//propmrr
			if (paramDrillDownType == 'propmrr')
			{
				//We first load the original search
				var propmrrSearch = nlapiLoadSearch(null,paramMrrPropSearchId),
					//We grab the filters from original saved search used by Scheduled Script.
					//Assumes that it is NOT using expression based search
					propmrrFlt = propmrrSearch.getFilters(),
					newpropmrrFlt = [],
					//We custom build the search results for lead search
					//ungrouped
					propmrrCol = [new nlobjSearchColumn('trandate'),
					              new nlobjSearchColumn('tranid'),
					              new nlobjSearchColumn('entity'),
					              new nlobjSearchColumn('custbody_sum_mrr'),
					              new nlobjSearchColumn('salesrep')];
				
				for (var propmrrs=0; propmrrs < propmrrFlt.length; propmrrs+=1)
				{
					newpropmrrFlt.push(propmrrFlt[propmrrs]);
				}
				
				//we need to add in filter specific for THIS sales rep
				newpropmrrFlt.push(new nlobjSearchFilter('salesrep', null, 'anyof', paramDrillDownRep));
				var	propmrrCloneSearch = nlapiCreateSearch(
											propmrrSearch.getSearchType(), 
											newpropmrrFlt,
											propmrrCol
									  	 );
				propmrrCloneSearch.setRedirectURLToSearchResults();
				return;
			}
			
			//if ddrep is empty, it will NOT have clickable drill down
			if (paramDrillDownType == 'leads')
			{
				//We first load the original search
				var leadsSearch = nlapiLoadSearch(null,paramLeadsSearchId),
					//We grab the filters from original saved search used by Scheduled Script.
					//Assumes that it is NOT using expression based search
					leadsFlt = leadsSearch.getFilters(),
					newLeadsFlt = [],
					//We custom build the search results for lead search
					//ungrouped
					leadsCol = [new nlobjSearchColumn('entityid'),
					            new nlobjSearchColumn('datecreated'),
					            new nlobjSearchColumn('salesrep')];
				
				//because leadsFlt is NetSuite version of Array. 
				//	Adding new filter option throws an error. 
				//	we clone it to new local array object
				for (var ls=0; ls < leadsFlt.length; ls+=1)
				{
					newLeadsFlt.push(leadsFlt[ls]);
				}
				
				//we need to add in filter specific for THIS sales rep
				newLeadsFlt.push(new nlobjSearchFilter('salesrep', null, 'anyof', paramDrillDownRep));
				var	leadCloneSearch = nlapiCreateSearch(
										leadsSearch.getSearchType(), 
										newLeadsFlt,
										leadsCol
									  );
				leadCloneSearch.setRedirectURLToSearchResults();
				return;
			}

			
			
			


			
			
				
			
			
			if (paramDrillDownType == 'totalopps')
			{
				//We first load the original search
				var toppSearch = nlapiLoadSearch(null,paramTotalOppsSearchId),
					//We grab the filters from original saved search used by Scheduled Script.
					//Assumes that it is NOT using expression based search
					toppFlt = toppSearch.getFilters(),
					newtoppFlt = [],
					//We custom build the search results for lead search
					//ungrouped
					toppCol = [new nlobjSearchColumn('trandate'),
					           new nlobjSearchColumn('tranid'),
					           new nlobjSearchColumn('entity'),
					           new nlobjSearchColumn('salesrep')];
				
				for (var topps=0; topps < toppFlt.length; topps+=1)
				{
					newtoppFlt.push(toppFlt[topps]);
				}
				
				//we need to add in filter specific for THIS sales rep
				newtoppFlt.push(new nlobjSearchFilter('salesrep', null, 'anyof', paramDrillDownRep));
				var	toppCloneSearch = nlapiCreateSearch(
										toppSearch.getSearchType(), 
										newtoppFlt,
										toppCol
									  );
				toppCloneSearch.setRedirectURLToSearchResults();
				return;
			}


			
			if (paramDrillDownType == 'oppmrr')
			{
				//We first load the original search
				var oppmrrSearch = nlapiLoadSearch(null,paramMrrOppSearchId),
					//We grab the filters from original saved search used by Scheduled Script.
					//Assumes that it is NOT using expression based search
					oppmrrFlt = oppmrrSearch.getFilters(),
					newoppmrrFlt = [],
					//We custom build the search results for lead search
					//ungrouped
					oppmrrCol = [new nlobjSearchColumn('trandate'),
					             new nlobjSearchColumn('tranid'),
					             new nlobjSearchColumn('entity'),
					             new nlobjSearchColumn('custbody_sum_mrr'),
					             new nlobjSearchColumn('salesrep')];
				
				for (var oppmrrs=0; oppmrrs < oppmrrFlt.length; oppmrrs+=1)
				{
					newoppmrrFlt.push(oppmrrFlt[oppmrrs]);
				}
				
				//we need to add in filter specific for THIS sales rep
				newoppmrrFlt.push(new nlobjSearchFilter('salesrep', null, 'anyof', paramDrillDownRep));
				var	oppmrrCloneSearch = nlapiCreateSearch(
											oppmrrSearch.getSearchType(), 
											newoppmrrFlt,
											oppmrrCol
									  	);
				oppmrrCloneSearch.setRedirectURLToSearchResults();
				return;
			}

			if (paramDrillDownType == 'oppstoqualified')																		//NEW BLOCK
			{																														//
				//We first load the original search
				var oppsToQualfiedSearch = nlapiLoadSearch(null,paramOppsToQualifiedSearchId),										
					//We grab the filters from original saved search used by Scheduled Script.
					//Assumes that it is NOT using expression based search
					oppsToQualFlt = oppsToQualfiedSearch.getFilters(),																
					newOppsToQualFlt = [],
					//We custom build the search results for lead search						
					//ungrouped
					oppsToQualCol = [new nlobjSearchColumn('trandate'),
					           new nlobjSearchColumn('tranid'),
					           new nlobjSearchColumn('entity'),
					           new nlobjSearchColumn('salesrep')];
				
				for (var topps=0; topps < oppsToQualFlt.length; topps+=1)
				{
					newOppsToQualFlt.push(unqlfdoppFlt[topps]);
				}
				
				//we need to add in filter specific for THIS sales rep
				newtoppFlt.push(new nlobjSearchFilter('salesrep', null, 'anyof', paramDrillDownRep));
				var	oppsToQualCloneSearch = nlapiCreateSearch(
										oppsToQualfiedSearch.getSearchType(), 
										newOppsToQualFlt,
										oppsToQualCol
									  );
				oppsToQualCloneSearch.setRedirectURLToSearchResults();
				return;																													//
			}																														//NEW BLOCK
																																


		

			//totalprops
			if (paramDrillDownType == 'totalprops')
			{
				//We first load the original search
				var tpropSearch = nlapiLoadSearch(null,paramTotalPropSearchId),
					//We grab the filters from original saved search used by Scheduled Script.
					//Assumes that it is NOT using expression based search
					tpropFlt = tpropSearch.getFilters(),
					newtpropFlt = [],
					//We custom build the search results for lead search
					//ungrouped
					tpropCol = [new nlobjSearchColumn('trandate'),
					            new nlobjSearchColumn('tranid'),
					            new nlobjSearchColumn('entity'),
					            new nlobjSearchColumn('salesrep')];
				
				for (var tprops=0; tprops < tpropFlt.length; tprops+=1)
				{
					newtpropFlt.push(tpropFlt[tprops]);
				}
				
				//we need to add in filter specific for THIS sales rep
				newtpropFlt.push(new nlobjSearchFilter('salesrep', null, 'anyof', paramDrillDownRep));
				var	tpropCloneSearch = nlapiCreateSearch(
											tpropSearch.getSearchType(), 
											newtpropFlt,
											tpropCol
									   );
				tpropCloneSearch.setRedirectURLToSearchResults();			
				return;
			}	
	
	
	
	
	
			if (paramDrillDownType == 'unqualifiedopps')																//NEW BLOCK
			{																												//
				//We first load the original search
				var ungualfdOppSearch = nlapiLoadSearch(null,paramUnqalifiedOppsSearchId),
					//We grab the filters from original saved search used by Scheduled Script.
					//Assumes that it is NOT using expression based search
					unqlfdoppFlt = ungualfdOppSearch.getFilters(),
					newunqlfdoppFlt = [],
					//We custom build the search results for lead search
					//ungrouped
					unqlfdoppCol = [new nlobjSearchColumn('trandate'),
					           new nlobjSearchColumn('tranid'),
					           new nlobjSearchColumn('entity'),
					           new nlobjSearchColumn('salesrep')];
				
				for (var topps=0; topps < unqlfdoppFlt.length; topps+=1)
				{
					newunqlfdoppFlt.push(unqlfdoppFlt[topps]);
				}
				
				//we need to add in filter specific for THIS sales rep
				newtoppFlt.push(new nlobjSearchFilter('salesrep', null, 'anyof', paramDrillDownRep));
				var	ungualfdOppCloneSearch = nlapiCreateSearch(
										ungualfdOppSearch.getSearchType(), 
										newunqlfdoppFlt,
										unqlfdoppCol
									  );
				ungualfdOppCloneSearch.setRedirectURLToSearchResults();
				return;
			}																													//
																															//NEW BLOCK






	

			
		}//End Drill Down Processing
		//================== END Drill Down Processing =======================================
		
		//0. Initial Data Setup for filters.
		//	we need to set up each filters based on the data that is in the AX-Weekly Sales Metrics 
		//	(customrecord_ax_weeklysalesmetrics) custom record. 
		//We first grab list of ALL unique Year and Month Values.
		//year/month value based on Week Start Date
		var ymflt = [new nlobjSearchFilter('isinactive', null, 'is', 'F')],
			ymcol = [new nlobjSearchColumn('custrecord_wsm_weekrange', null, 'group'),
			         new nlobjSearchColumn('custrecord_wsm_startweekdate', null, 'group').setSort(true)],
			ymrs = nlapiSearchRecord('customrecord_ax_weeklysalesmetrics', null, ymflt, ymcol);
		
		//If no data is returned from this search, we display a message to the user that there are no data
		//	This is an ERROR since there should always be data in this table
		if (!ymrs || (ymrs && ymrs.length == 0))
		{
			throw nlapiCreateError(
				'NO_SMDATA_FOUND', 
				'There were no Sales Metric Data to Display and MUST be looked into', 
				true
			);
		}
		
		/**
		 * JSON object will contain list of Years divided by Month and list of weeks within that month
		[year]:
		{
			[month]:[{weekStartDate:WeekName},{weekStartDate:WeekName},...],
			...
		}
		...
		*/
		var ymJson = {},
			//11/3/2016 
			//Added to default the year display to latest year available so that the user don't have to select
			//Since search is sorted by start week date in DESC order (Latest Year will come out first)
			//We grab the year value of the first record returned.
			defaultYear = '';
		for (var ym=0; ym < ymrs.length; ym+=1)
		{
			var wstartDateStr = ymrs[ym].getValue('custrecord_wsm_startweekdate', null, 'group'),
				wstartDate = nlapiStringToDate(wstartDateStr),
				wstartYear = wstartDate.getFullYear(),
				wstartMonth = wstartDate.getMonth(),
				weekValue = ymrs[ym].getValue('custrecord_wsm_weekrange', null, 'group');
			
			if (!defaultYear)
			{
				defaultYear = wstartYear;
			}
			
			if (!ymJson[wstartYear])
			{
				ymJson[wstartYear] = {};
			}
			
			if (!ymJson[wstartYear][wstartMonth])
			{
				ymJson[wstartYear][wstartMonth] = [];
			}
			
			var weekJson = {
				'weekstartdate':wstartDateStr,
				'weekvalue':weekValue
			};
			
			ymJson[wstartYear][wstartMonth].push(weekJson);
		}
		log('debug','ymJson', JSON.stringify(ymJson));
		
		log('debug','defaultYear', defaultYear);
		
		//11/3/2016
		//Default paramYear to defaultYear IF empty
		if (!paramYear)
		{
			paramYear = defaultYear;
		}
		
		log('debug','paramYear', paramYear);
		
		//-------------------- Build out UI ---------------------------------
		//Add in Download Button.
		//Button should be disabled until paramYear value is set.
		//	This way you have SOMETHING to download
		var dlbtn = nsform.addButton('custpage_dlbtn', 'Download CSV', 'downloadCsv()');
		
		nsform.addFieldGroup('grpa', 'Filter Options', null);
		//Col 1 Row 1: Year
		var yearfld = nsform.addField('custpage_year', 'select', 'Year', null, 'grpa');
		yearfld.addSelectOption('', '', true);
		yearfld.setMandatory(true);
		yearfld.setBreakType('startcol');
		yearfld.setDisplaySize(150);
		//Populate Year Drop down
		for (var ym in ymJson)
		{
			var isSelected = false;
			if (ym == paramYear)
			{
				isSelected = true;
			}
			
			yearfld.addSelectOption(ym, 'Year '+ym, isSelected);
		}
		//yearfld.setDefaultValue(paramYear);
		
		//Col 2: Month - This is Empty list until user selects the Year
		var monthfld = nsform.addField('custpage_month', 'select', 'Month', null, 'grpa');
		monthfld.addSelectOption('', '', true);
		monthfld.setDisplaySize(150);
		//Disable initially
		//Only enable if paramYear is passed in
		if (paramYear)
		{
			//Loop through all available months in selected year
			for (var m in ymJson[paramYear])
			{
				monthfld.addSelectOption(m, monthJson[m], false);
			}
		}
		else
		{
			monthfld.setDisplayType('disabled');
		}
		monthfld.setDefaultValue(paramMonth);
		monthfld.setBreakType('startcol');
		
		//Col2: Week Range (Week Start Date as option value) - This is Empty list until user selects Year and Month
		var weekfld = nsform.addField('custpage_weekstartdt', 'select', 'Week', null, 'grpa');
		weekfld.addSelectOption('', '', true);
		
		//Disable initially
		//Will become enabled with options populated once year + month are selected
		if (paramYear && paramMonth)
		{
			//Loop through all available week information for this month
			var mar = ymJson[paramYear][paramMonth];
			for (var mm=0; mm < mar.length; mm+=1)
			{
				weekfld.addSelectOption(mar[mm].weekstartdate, mar[mm].weekvalue, false);
			}
		}
		else
		{
			weekfld.setDisplayType('disabled');
		}
		weekfld.setDefaultValue(paramWeekStartDate);
		weekfld.setBreakType('startcol');
		
		//Col 3: Salesrep - This is Empty list until user selects Year+Month+Week.
		//		 page will refresh automatically once the user has all three filters set
		var salesrepfld = nsform.addField('custpage_salesrep', 'multiselect', 'Sales Rep', null, 'grpa');
		salesrepfld.setDisplaySize(190,3);
		//Disable initially
		//Will become enabled with options populated once year is selected
		if (paramYear)
		{
			//Do a search against Sales Metric Table and grab all unique sales rep names
			var srflt = [new nlobjSearchFilter('isinactive', null, 'is', 'F')],
				srcol = [new nlobjSearchColumn('custrecord_wsm_salesrep', null, 'group').setSort()],
				srrs = nlapiSearchRecord('customrecord_ax_weeklysalesmetrics', null, srflt, srcol);
			
			//Loop through the result and add to salesrepfld
			for (var sr=0; srrs && sr < srrs.length; sr+=1)
			{
				var opval = srrs[sr].getValue('custrecord_wsm_salesrep', null, 'group'),
					optext = srrs[sr].getText('custrecord_wsm_salesrep', null, 'group');
				if (!opval)
				{
					opval = '@NONE@';
				}
				salesrepfld.addSelectOption(opval,optext,false);
			}
		}
		else
		{
			salesrepfld.setDisplayType('disabled');
		}
		salesrepfld.setDefaultValue(arParamSalesRep);
		salesrepfld.setBreakType('startcol');
		
		//Apply Filter and Clear filter link
		var shHiClearFld = nsform.addField('custpage_acsalesrep','inlinehtml','',null,'grpa');
		shHiClearFld.setDefaultValue(
			'<a href="#" onclick="userAction(\'custpage_salesrep\',\'apply\')">Apply Filter</a> &nbsp; | &nbsp; '+
			'<a href="#" onclick="userAction(\'custpage_salesrep\',\'clear\')">Clear Filter</a>'
		);
		
		//Col 4: Salesteam - directly references "Sales Rep Type List (customlist_ec_sales_rep_type_list)"
		//11/3/2016
		//Client requests this to be multi select.
		//In orde
		var salesteamfld = nsform.addField('custpage_salesteam', 'multiselect', 'Sales Team', 'customlist_ec_sales_rep_type_list', 'grpa');
		salesteamfld.setDisplaySize(190,3);
		//Disable initially
		//Will become enabled once year is selected
		if (!paramYear)
		{
			salesteamfld.setDisplayType('disabled');
		}
		salesteamfld.setDefaultValue(arParamSalesTeam);
		
		salesteamfld.setBreakType('startcol');
		
		//Apply Filter and Clear filter link
		var shHiClearFld = nsform.addField('custpage_acsalesteam','inlinehtml','',null,'grpa');
		shHiClearFld.setDefaultValue(
			'<a href="#" onclick="userAction(\'custpage_salesteam\',\'apply\')">Apply Filter</a> &nbsp; | &nbsp; '+
			'<a href="#" onclick="userAction(\'custpage_salesteam\',\'clear\')">Clear Filter</a>'
		);
		
		
		//Add inlinehtml field to store client side JavaScript 
		//	Client side scripts will include JSON objects of selected weekly data
		//	as well as reference to Google Charts API
		var sctfld = nsform.addField('custpage_sctfld', 'inlinehtml','Client Script', null, null);
		sctfld.setLayoutType('outsidebelow',null);
		
		//Add Different JSON object to be accessed by client script
		var clientScriptJson = 'var ymJson = '+JSON.stringify(ymJson)+';';
		
		sctfld.setDefaultValue(
			'<script language="JavaScript">'+
			clientScriptJson+
			'</script>'
		);
		
		//Add in Sublist
		//10/18/2016
		//We are going to change the display to Text Area.
		//This way we can build URL for Drill Down
		var datasl = nsform.addSubList('custpage_datasl', 'list', 'Weekly Sales Metrics', null);
		datasl.addField('dsl_salesrep', 'text','<div align="center">Sales Rep', null).setDisplayType('inline');		
		datasl.addField('dsl_leads','textarea', '<div align="center">Leads', null).setDisplayType('inline');

		datasl.addField('dsl_unqualifiedopps','textarea', '<div align="center">Unqalified Opps', null).setDisplayType('inline');							//NEW
		
		datasl.addField('dsl_totalopps','textarea','<div align="center">Total Opps', null).setDisplayType('inline');
		
		datasl.addField('dsl_oppstoqualified','textarea', '<div align="center">Opportunities converted to Qualified', null).setDisplayType('inline');		//NEW
		
		datasl.addField('dsl_oppsvalue','textarea','<div align="center">Opp $', null).setDisplayType('inline');
		datasl.addField('dsl_totalprops','textarea','<div align="center">Total Proposals', null).setDisplayType('inline');
		datasl.addField('dsl_propsvalue','textarea','<div align="center">Proposal $', null).setDisplayType('inline');
		datasl.addField('dsl_otop','textarea','<div align="center">Opp. Converted to Proposal', null).setDisplayType('inline');
		datasl.addField('dsl_opplost','textarea','<div align="center">Opps Lost',null).setDisplayType('inline');
		datasl.addField('dsl_percotop','percent','<div align="center">% of Opps to Proposal',null).setDisplayType('inline');
		datasl.addField('dsl_avgoppdur','textarea','<div align="center">Avg. Opp Duration (days)', null).setDisplayType('inline');
		datasl.addField('dsl_propswon','textarea','<div align="center">Proposals Won', null).setDisplayType('inline');
		datasl.addField('dsl_propslost','textarea','<div align="center">Proposals Lost', null).setDisplayType('inline');
		datasl.addField('dsl_percpropswon','percent','<div align="center">% of Proposals Won',null).setDisplayType('inline');
		datasl.addField('dsl_avgpropsdur','textarea','<div align="center">Avg. Prop. Duration (days)', null).setDisplayType('inline');
		datasl.addField('dsl_weekmrr','textarea','<div align="center">Weekly MRR', null).setDisplayType('inline');
		datasl.addField('dsl_monthmrr','textarea','<div align="center">Monthly MRR', null).setDisplayType('inline');
		
		datasl.addField('dsl_weeklyapproved','textarea','<div align="center">Weekly Approved Orders', null).setDisplayType('inline');					//NEW
		datasl.addField('dsl_monthlyapproved','textarea','<div align="center">Monthly Approved Orders', null).setDisplayType('inline');					//NEW
		

		//We now execute the search based on user selected filters and display the result.
		//Last Row is always the total
		//We execute as long as Year is selected
		if (paramYear)
		{
			var smdJson = {
					'totalemployees':0,
					'totalleads':0,
					'unqualifiedopps':0, 																							//NEW
					'totalopps':0,
					'oppstoqualified':0,																							//NEW				
					'totaloppsmrr':0.0,
					'totalprops':0,
					'totalpropsmrr':0.0,
					'totalotop':0,
					'totaloppslost':0,
					'totalpercotop':0.0,
					'totalavgoppdur':0,
					'totalpropswon':0,
					'totalpropslost':0,
					'totalpercpropswon':0.0,
					'totalavgpropdur':0,
					'totalweekmrr':0.0,
					'totalmonthmrr':0.0,
					
					'totalweeklyapproved':0.0,																					//NEW
					'totalmonthlyapproved':0.0																					//NEW				
	

	
				},
				smdflt = [],
				smdcol = [new nlobjSearchColumn('custrecord_wsm_salesrep', null, 'group'),
				          new nlobjSearchColumn('custrecord_wsm_totalnumleads', null, 'max'),
						  
				          new nlobjSearchColumn('custrecord_wsm_unqualifiedopps', null, 'max'),									//NEW		  
						  
				          new nlobjSearchColumn('custrecord_wsm_totalopps', null, 'max'),
						  
				          new nlobjSearchColumn('custrecord_wsm_opps_to_qualified', null, 'max'),								//NEW						  
						  
				          new nlobjSearchColumn('custrecord_wsm_totalmrropp', null, 'max'),
				          new nlobjSearchColumn('custrecord_wsm_totalproposals', null,'max'),
				          new nlobjSearchColumn('custrecord_wsm_totalmrrproposal', null,'max'),
						  new nlobjSearchColumn('custrecord_wsm_totalopptopro', null,'max').setSort(true),
						  new nlobjSearchColumn('custrecord_wsm_opplost', null,'max'),
						  new nlobjSearchColumn('custrecord_wsm_percoppstoproposal', null,'max'),
						  new nlobjSearchColumn('custrecord_wsm_avgoppdurationdays', null,'max'),
						  new nlobjSearchColumn('custrecord_wsm_proposalswon', null,'max'),
						  new nlobjSearchColumn('custrecord_wsm_proposalslost', null,'max'),
						  new nlobjSearchColumn('custrecord_wsm_percproposalswon', null,'max'),
						  new nlobjSearchColumn('custrecord_wsm_avgproposaldurationdays', null,'max'),
						  new nlobjSearchColumn('custrecord_wsm_weeklymrr', null,'max'),
						  new nlobjSearchColumn('custrecord_wsm_monthlymrr', null,'max'),
						  
						  new nlobjSearchColumn('custrecord_wsm_weeklyapprovedorders', null,'max'),								//NEW
						  new nlobjSearchColumn('custrecord_wsm_monthlyapprovedorders', null,'max')],							//NEW				  
						  
						  
				smdrs = null,
				rangeStartDate = '1/1/'+paramYear,
				rangeEndDate = '12/31/'+paramYear;
			
			//If Week is filled in. add to the filter as is.
			//This means user actually selected year + Month + Week.
			if (paramWeekStartDate)
			{
				smdflt.push(new nlobjSearchFilter('custrecord_wsm_startweekdate', null,'on', paramWeekStartDate));
				
				//reset range to paramWeekStartDate
				rangeStartDate = paramWeekStartDate;
				rangeEndDate = paramWeekStartDate;
			}
			else
			{
				//Let's build the filter
				//if year is the ONLY one filled out (No Month), set the the
				//Start of week range to 1/1/[YEAR] to 12/31/[YEAR]
				//If not, we set the week range to start of selected month+year to end of selected month+year
				if (paramYear && paramMonth)
				{
					var rangeStartDate = (parseInt(paramMonth)+1)+'/1/'+paramYear;
					
					//Add one month to rangeStartDate
					var rangeEndDate = nlapiAddMonths(new Date(rangeStartDate), 1);
					//subtract one day from rangeEndDate
					rangeEndDate = nlapiAddDays(rangeEndDate, -1);
					//conver to text
					rangeEndDate = nlapiDateToString(rangeEndDate);
				}
				
				//Add Start of Week Filter
				smdflt.push(new nlobjSearchFilter('custrecord_wsm_startweekdate', null, 'within', rangeStartDate, rangeEndDate));
				
			}
			
			//if Sales Rep is added, let's add to the filter
			if (paramSalesRep)
			{
				smdflt.push(new nlobjSearchFilter('custrecord_wsm_salesrep', null, 'anyof', arParamSalesRep));
			}
			
			//if Sales Team is added, let's add to the filter
			if (paramSalesTeam)
			{
				smdflt.push(new nlobjSearchFilter('custentity_ec_sales_rep_type', 'custrecord_wsm_salesrep', 'anyof', arParamSalesTeam));
			}
			
			//---------------SEARCH FOR USER SELECTED DATA TABLE VALUES-----------------------------
			smdrs = nlapiSearchRecord('customrecord_ax_weeklysalesmetrics', null, smdflt, smdcol);
			
			
			
			
			
			//Loop through the result and add to each line.
			//	We also populate the smdJson with total values per each row
			var smdline = 1;
			
			//Variable kept in place in case of Download
			var csvHeader = '"Sales Rep","Leads","Unqualified Opps","Total Opps","Opp.Converted to Qualified","Opp $","Total Proposals","Proposal $","Opp.Converted to Proposal",'+
							'"Opps Lost","% of Opps to Proposal","Avg. Opp Duration (days)","Proposals Won","Proposals Lost",'+
							'"% of Proposals Won","Avg. Prop. Duration (days)","Weekly MRR","Monthly MRR","Weekly Approved Orders","Monthly Approved Orders"\n',
				csvBody = '';
			
			//This is to help easily build out Drill Down Links
			var ddBaseUrl = nlapiResolveURL(
								'SUITELET', 
								nlapiGetContext().getScriptId(), 
								nlapiGetContext().getDeploymentId(), 
								'VIEW'
							);
			ddBaseUrl += '&custpage_year='+paramYear+
						 '&custpage_month='+paramMonth+
						 '&custpage_weekstartdt='+paramWeekStartDate+
						 '&custpage_salesrep='+paramSalesRep+
						 '&custpage_salesteam='+paramSalesTeam;



						 
			for (var s=0; smdrs && s < smdrs.length; s+=1)
			{
				var hasSalesRep = (smdrs[s].getValue('custrecord_wsm_salesrep', null, 'group')?true:false);
				
				//lead drilltype = leads
				var leadDrillDownLink = smdrs[s].getValue('custrecord_wsm_totalnumleads', null, 'max');
				if (parseInt(smdrs[s].getValue('custrecord_wsm_totalnumleads', null, 'max')) > 0 && hasSalesRep && paramWeekStartDate)
				{
					leadDrillDownLink = '<a href="'+ddBaseUrl+
										'&drilltype=leads'+
										'&ddrep='+smdrs[s].getValue('custrecord_wsm_salesrep', null, 'group')+
										'" target="_blank">'+
										leadDrillDownLink+
										'</a>';
				}


				
																																			//NEW BLOCK					
				//Unqalified Opps drilltype = unqualifiedopps																					//
				var unqualifiedOppsDrillDownLink = smdrs[s].getValue('custrecord_wsm_unqualifiedopps', null, 'max');
				if (parseInt(smdrs[s].getValue('custrecord_wsm_unqualifiedopps', null, 'max')) > 0 && hasSalesRep && paramWeekStartDate)
				{
					unqualifiedOppsDrillDownLink = '<a href="'+ddBaseUrl+
											 '&drilltype=unqualifiedopps'+
											 '&ddrep='+smdrs[s].getValue('custrecord_wsm_salesrep', null, 'group')+
											 '" target="_blank">'+
											 unqualifiedOppsDrillDownLink+
											 '</a>';
				}																																//
																																			//NEW BLOCK					
				
			
				//Total Opps drilltype = totalopps
				var totalOppsDrillDownLink = smdrs[s].getValue('custrecord_wsm_totalopps', null, 'max');
				if (parseInt(smdrs[s].getValue('custrecord_wsm_totalopps', null, 'max')) > 0 && hasSalesRep && paramWeekStartDate)
				{
					totalOppsDrillDownLink = '<a href="'+ddBaseUrl+
											 '&drilltype=totalopps'+
											 '&ddrep='+smdrs[s].getValue('custrecord_wsm_salesrep', null, 'group')+
											 '" target="_blank">'+
											 totalOppsDrillDownLink+
											 '</a>';
				}
				


																																			//NEW BLOCK						
				//Opps Converted to Qualified drilltype = oppstoqualified																		//
				var oppsToQualifiedDrillDownLink = smdrs[s].getValue('custrecord_wsm_opps_to_qualified', null, 'max');
				if (parseInt(smdrs[s].getValue('custrecord_wsm_opps_to_qualified', null, 'max')) > 0 && hasSalesRep && paramWeekStartDate)
				{
					oppsToQualifiedDrillDownLink = '<a href="'+ddBaseUrl+
											 '&drilltype=oppstoqualified'+
											 '&ddrep='+smdrs[s].getValue('custrecord_wsm_salesrep', null, 'group')+
											 '" target="_blank">'+
											 oppsToQualifiedDrillDownLink+
											 '</a>';
				}																																//
																																			//NEW BLOCK						
			
				//Opp $ drilltype = oppmrr
				//This must be in currency format
				//Function is in Audaxium_Spectrio_Utility.js
				//formatCurrency(value,2,'.',',',false)
				var oppmrrDrillDownLink = formatCurrency(
												smdrs[s].getValue('custrecord_wsm_totalmrropp', null, 'max'),
												2,
												'.',
												',',
												',',
												false
										  );
				
				if (parseFloat(smdrs[s].getValue('custrecord_wsm_totalmrropp', null, 'max')) > 0 && hasSalesRep && paramWeekStartDate)
				{
					oppmrrDrillDownLink = '<a href="'+ddBaseUrl+
											 '&drilltype=oppmrr'+
											 '&ddrep='+smdrs[s].getValue('custrecord_wsm_salesrep', null, 'group')+
											 '" target="_blank">'+
											 oppmrrDrillDownLink+
											 '</a>';
				}
				
				//Total Proposals drilltype = totalprops
				var totalPropsDrillDownLink = smdrs[s].getValue('custrecord_wsm_totalproposals', null,'max');
				if (parseInt(smdrs[s].getValue('custrecord_wsm_totalproposals', null,'max')) > 0 && hasSalesRep && paramWeekStartDate)
				{
					totalPropsDrillDownLink = '<a href="'+ddBaseUrl+
											 '&drilltype=totalprops'+
											 '&ddrep='+smdrs[s].getValue('custrecord_wsm_salesrep', null, 'group')+
											 '" target="_blank">'+
											 totalPropsDrillDownLink+
											 '</a>';
				}
				
				//Props $ drilltype = propmrr
				//This must be in currency format
				//Function is in Audaxium_Spectrio_Utility.js
				//formatCurrency(value,2,'.',',',false)
				var propmrrDrillDownLink = formatCurrency(
												smdrs[s].getValue('custrecord_wsm_totalmrrproposal', null,'max'),
												2,
												'.',
												',',
												',',
												false
										  );
				
				if (parseFloat(smdrs[s].getValue('custrecord_wsm_totalmrrproposal', null,'max')) > 0 && hasSalesRep && paramWeekStartDate)
				{
					propmrrDrillDownLink = '<a href="'+ddBaseUrl+
											 '&drilltype=propmrr'+
											 '&ddrep='+smdrs[s].getValue('custrecord_wsm_salesrep', null, 'group')+
											 '" target="_blank">'+
											 propmrrDrillDownLink+
											 '</a>';
				}
				
				//Total Opp to Prop drilltype = otop
				var otopDrillDownLink = smdrs[s].getValue('custrecord_wsm_totalopptopro', null,'max');
				if (parseInt(smdrs[s].getValue('custrecord_wsm_totalopptopro', null,'max')) > 0 && hasSalesRep && paramWeekStartDate)
				{
					otopDrillDownLink = '<a href="'+ddBaseUrl+
											 '&drilltype=otop'+
											 '&ddrep='+smdrs[s].getValue('custrecord_wsm_salesrep', null, 'group')+
											 '" target="_blank">'+
											 otopDrillDownLink+
											 '</a>';
				}
				
				//Opps Lost drilltype = olost
				var olostDrillDownLink = smdrs[s].getValue('custrecord_wsm_opplost', null,'max');
				if (parseInt(smdrs[s].getValue('custrecord_wsm_opplost', null,'max')) > 0 && hasSalesRep && paramWeekStartDate)
				{
					olostDrillDownLink = '<a href="'+ddBaseUrl+
											 '&drilltype=olost'+
											 '&ddrep='+smdrs[s].getValue('custrecord_wsm_salesrep', null, 'group')+
											 '" target="_blank">'+
											 olostDrillDownLink+
											 '</a>';
				}
				
				//Avg Opp Dur drilltype = aodd
				var aoddDrillDownLink = smdrs[s].getValue('custrecord_wsm_avgoppdurationdays', null,'max');
				if (parseInt(smdrs[s].getValue('custrecord_wsm_avgoppdurationdays', null,'max')) != 0 && hasSalesRep && paramWeekStartDate)
				{
					aoddDrillDownLink = '<a href="'+ddBaseUrl+
											 '&drilltype=aodd'+
											 '&ddrep='+smdrs[s].getValue('custrecord_wsm_salesrep', null, 'group')+
											 '" target="_blank">'+
											 aoddDrillDownLink+
											 '</a>';
				}
				
				//Proposals Won drilltype = pwon
				var pwonDrillDownLink = smdrs[s].getValue('custrecord_wsm_proposalswon', null,'max');
				if (parseInt(smdrs[s].getValue('custrecord_wsm_proposalswon', null,'max')) > 0 && hasSalesRep && paramWeekStartDate)
				{
					pwonDrillDownLink = '<a href="'+ddBaseUrl+
											 '&drilltype=pwon'+
											 '&ddrep='+smdrs[s].getValue('custrecord_wsm_salesrep', null, 'group')+
											 '" target="_blank">'+
											 pwonDrillDownLink+
											 '</a>';
				}
				
				//Proposals Lost drilltype = plost
				var plostDrillDownLink = smdrs[s].getValue('custrecord_wsm_proposalslost', null,'max');
				if (parseInt(smdrs[s].getValue('custrecord_wsm_proposalslost', null,'max')) > 0 && hasSalesRep && paramWeekStartDate)
				{
					plostDrillDownLink = '<a href="'+ddBaseUrl+
											 '&drilltype=plost'+
											 '&ddrep='+smdrs[s].getValue('custrecord_wsm_salesrep', null, 'group')+
											 '" target="_blank">'+
											 plostDrillDownLink+
											 '</a>';
				}
				
				//Avg Props Dur drilltype = apdd
				var apddDrillDownLink = smdrs[s].getValue('custrecord_wsm_avgproposaldurationdays', null,'max');
				if (parseInt(smdrs[s].getValue('custrecord_wsm_avgproposaldurationdays', null,'max')) != 0 && hasSalesRep && paramWeekStartDate)
				{
					apddDrillDownLink = '<a href="'+ddBaseUrl+
											 '&drilltype=apdd'+
											 '&ddrep='+smdrs[s].getValue('custrecord_wsm_salesrep', null, 'group')+
											 '" target="_blank">'+
											 apddDrillDownLink+
											 '</a>';
				}
				
				//wmrr
				//Weekly MRR drilltype = wmrr
				//This must be in currency format
				//Function is in Audaxium_Spectrio_Utility.js
				//formatCurrency(value,2,'.',',',false)
				var wmrrDrillDownLink = formatCurrency(
											smdrs[s].getValue('custrecord_wsm_weeklymrr', null,'max'),
											2,
											'.',
											',',
											',',
											false
										);
				
				if (parseFloat(smdrs[s].getValue('custrecord_wsm_weeklymrr', null,'max')) > 0 && hasSalesRep && paramWeekStartDate)
				{
					wmrrDrillDownLink = '<a href="'+ddBaseUrl+
											 '&drilltype=wmrr'+
											 '&ddrep='+smdrs[s].getValue('custrecord_wsm_salesrep', null, 'group')+
											 '" target="_blank">'+
											 wmrrDrillDownLink+
											 '</a>';
				}
				
				//mmrr
				//Monthly MRR drilltype = mmrr
				//This must be in currency format
				//Function is in Audaxium_Spectrio_Utility.js
				//formatCurrency(value,2,'.',',',false)
				var mmrrDrillDownLink = formatCurrency(
											smdrs[s].getValue('custrecord_wsm_monthlymrr', null,'max'),
											2,
											'.',
											',',
											',',
											false
										);
				
				if (parseFloat(smdrs[s].getValue('custrecord_wsm_monthlymrr', null,'max')) > 0 && hasSalesRep && paramWeekStartDate)
				{
					mmrrDrillDownLink = '<a href="'+ddBaseUrl+
											 '&drilltype=mmrr'+
											 '&ddrep='+smdrs[s].getValue('custrecord_wsm_salesrep', null, 'group')+
											 '" target="_blank">'+
											 mmrrDrillDownLink+
											 '</a>';
				}
				
				
				
				
				
								
																																			//NEW BLOCK		
				//weeklyapproved																												//
				//Weekly Approved drilltype = weeklyapproved
				//This must be in currency format
				//Function is in Audaxium_Spectrio_Utility.js
				//formatCurrency(value,2,'.',',',false)
				var wklyAppDrillDownLink = formatCurrency(
											smdrs[s].getValue('custrecord_wsm_weeklyapprovedorders', null,'max'),
											2,
											'.',
											',',
											',',
											false
										);
				
				if (parseFloat(smdrs[s].getValue('custrecord_wsm_weeklyapprovedorders', null,'max')) > 0 && hasSalesRep && paramWeekStartDate)
				{
					wklyAppDrillDownLink = '<a href="'+ddBaseUrl+
											 '&drilltype=weeklyapproved'+
											 '&ddrep='+smdrs[s].getValue('custrecord_wsm_salesrep', null, 'group')+
											 '" target="_blank">'+
											 wklyAppDrillDownLink+
											 '</a>';
				}																																	//
																																				//NEW BLOCK						
				
				
				
				
				
				//monthlyapproved
				//Monthly Approved drilltype = monthlyapproved
				//This must be in currency format
				//Function is in Audaxium_Spectrio_Utility.js
				//formatCurrency(value,2,'.',',',false)
				var mnthlyAppDrillDownLink = formatCurrency(
											smdrs[s].getValue('custrecord_wsm_monthlyapprovedorders', null,'max'),
											2,
											'.',
											',',
											',',
											false
										);
				
				if (parseFloat(smdrs[s].getValue('custrecord_wsm_monthlyapprovedorders', null,'max')) > 0 && hasSalesRep && paramWeekStartDate)
				{
					mnthlyAppDrillDownLink = '<a href="'+ddBaseUrl+
											 '&drilltype=monthlyapproved'+
											 '&ddrep='+smdrs[s].getValue('custrecord_wsm_salesrep', null, 'group')+
											 '" target="_blank">'+
											 mnthlyAppDrillDownLink+
											 '</a>';
				}				
				
				
				
				
				
				
				
				
				
				
				
				
				
				
				//Let's add in all the lines
				datasl.setLineItemValue('dsl_salesrep', smdline, '<div align="center">'+smdrs[s].getText('custrecord_wsm_salesrep', null, 'group'));
				datasl.setLineItemValue('dsl_leads', smdline, '<div align="center">'+leadDrillDownLink);
						
			
				datasl.setLineItemValue('dsl_unqualifiedopps', smdline, '<div align="center">'+unqualifiedOppsDrillDownLink);									//NEW	
								
				datasl.setLineItemValue('dsl_totalopps', smdline, '<div align="center">'+totalOppsDrillDownLink);
				
				datasl.setLineItemValue('dsl_oppstoqualified', smdline, '<div align="center">'+oppsToQualifiedDrillDownLink);									//NEW			
				
				datasl.setLineItemValue('dsl_oppsvalue', smdline, '<div align="center">'+oppmrrDrillDownLink);
				datasl.setLineItemValue('dsl_totalprops', smdline, '<div align="center">'+totalPropsDrillDownLink);
				datasl.setLineItemValue('dsl_propsvalue', smdline, '<div align="center">'+propmrrDrillDownLink);
				datasl.setLineItemValue('dsl_otop', smdline, '<div align="center">'+otopDrillDownLink);
				datasl.setLineItemValue('dsl_opplost', smdline, '<div align="center">'+olostDrillDownLink);
				datasl.setLineItemValue('dsl_percotop', smdline, parseFloat(smdrs[s].getValue('custrecord_wsm_percoppstoproposal', null,'max')).toFixed(2));
				datasl.setLineItemValue('dsl_avgoppdur', smdline, '<div align="center">'+aoddDrillDownLink);
				datasl.setLineItemValue('dsl_propswon', smdline, '<div align="center">'+pwonDrillDownLink);
				datasl.setLineItemValue('dsl_propslost', smdline, '<div align="center">'+plostDrillDownLink);
				datasl.setLineItemValue('dsl_percpropswon', smdline, parseFloat(smdrs[s].getValue('custrecord_wsm_percproposalswon', null,'max')).toFixed(2));
				datasl.setLineItemValue('dsl_avgpropsdur', smdline, '<div align="center">'+apddDrillDownLink);
				datasl.setLineItemValue('dsl_weekmrr', smdline, '<div align="center">'+wmrrDrillDownLink);
				datasl.setLineItemValue('dsl_monthmrr', smdline, '<div align="center">'+mmrrDrillDownLink);
				
				datasl.setLineItemValue('dsl_weeklyapproved', smdline, '<div align="center">'+wklyAppDrillDownLink);											//NEW
				datasl.setLineItemValue('dsl_monthlyapproved', smdline, '<div align="center">'+mnthlyAppDrillDownLink);										//NEW		


				
				//Build out CSV Body
				csvBody += '"'+smdrs[s].getText('custrecord_wsm_salesrep', null, 'group')+'",'+
						   smdrs[s].getValue('custrecord_wsm_totalnumleads', null, 'max')+','+
						   
						   smdrs[s].getValue('custrecord_wsm_unqualifiedopps', null, 'max')+','+										//NEW		   
						   
						   smdrs[s].getValue('custrecord_wsm_totalopps', null, 'max')+','+

						   smdrs[s].getValue('custrecord_wsm_opps_to_qualified', null, 'max')+','+						   				//NEW
						   
						   smdrs[s].getValue('custrecord_wsm_totalmrropp', null, 'max')+','+
						   smdrs[s].getValue('custrecord_wsm_totalproposals', null,'max')+','+
						   smdrs[s].getValue('custrecord_wsm_totalmrrproposal', null,'max')+','+
						   smdrs[s].getValue('custrecord_wsm_totalopptopro', null,'max')+','+
						   smdrs[s].getValue('custrecord_wsm_opplost', null,'max')+','+
						   parseFloat(smdrs[s].getValue('custrecord_wsm_percoppstoproposal', null,'max')).toFixed(2)+','+
						   smdrs[s].getValue('custrecord_wsm_avgoppdurationdays', null,'max')+','+
						   smdrs[s].getValue('custrecord_wsm_proposalswon', null,'max')+','+
						   smdrs[s].getValue('custrecord_wsm_proposalslost', null,'max')+','+
						   parseFloat(smdrs[s].getValue('custrecord_wsm_percproposalswon', null,'max')).toFixed(2)+','+
						   smdrs[s].getValue('custrecord_wsm_avgproposaldurationdays', null,'max')+','+
						   smdrs[s].getValue('custrecord_wsm_weeklymrr', null,'max')+','+
						   smdrs[s].getValue('custrecord_wsm_monthlymrr', null,'max')+','+
						   
						   smdrs[s].getValue('custrecord_wsm_weeklyapprovedorders', null,'max')+','+										//NEW
						   smdrs[s].getValue('custrecord_wsm_monthlyapprovedorders', null,'max')+'\n';						   				//NEW
						   
						   
				
				smdline += 1;
				
				//Increment the number of total employee by 1
				//This will be used to calculate average value later
				//for total lines for certain columns
				smdJson.totalemployees = parseInt(smdJson.totalemployees) + 1;
				
				smdJson.totalleads = parseInt(smdJson.totalleads) +
									 parseInt(smdrs[s].getValue('custrecord_wsm_totalnumleads', null, 'max'));

				smdJson.unqualifiedopps = parseInt(smdJson.unqualifiedopps) +
									parseInt(smdrs[s].getValue('custrecord_wsm_unqualifiedopps', null, 'max'));								//NEW	 
				
				smdJson.totalopps = parseInt(smdJson.totalopps) +
									parseInt(smdrs[s].getValue('custrecord_wsm_totalopps', null, 'max'));
									
				smdJson.oppstoqualified = parseInt(smdJson.oppstoqualified) +		
									parseInt(smdrs[s].getValue('custrecord_wsm_opps_to_qualified', null, 'max'));							//NEW										
				
				smdJson.totaloppsmrr = (parseFloat(smdJson.totaloppsmrr) +
									   parseFloat(smdrs[s].getValue('custrecord_wsm_totalmrropp', null, 'max'))).toFixed(2);
				
				smdJson.totalprops = parseInt(smdJson.totalprops) +
									 parseInt(smdrs[s].getValue('custrecord_wsm_totalproposals', null,'max'));
				
				smdJson.totalpropsmrr = (parseFloat(smdJson.totalpropsmrr) +
										parseFloat(smdrs[s].getValue('custrecord_wsm_totalmrrproposal', null,'max'))).toFixed(2);
				
				smdJson.totalotop = parseInt(smdJson.totalotop) +
									parseInt(smdrs[s].getValue('custrecord_wsm_totalopptopro', null,'max'));
				
				smdJson.totaloppslost = parseInt(smdJson.totaloppslost) +
										parseInt(smdrs[s].getValue('custrecord_wsm_opplost', null,'max'));
				
				smdJson.totalpercotop = parseFloat(smdJson.totalpercotop) +
										parseFloat(smdrs[s].getValue('custrecord_wsm_percoppstoproposal', null,'max'));
				
				smdJson.totalavgoppdur = parseInt(smdJson.totalavgoppdur) +
										 parseInt(smdrs[s].getValue('custrecord_wsm_avgoppdurationdays', null,'max'));
				
				smdJson.totalpropswon = parseInt(smdJson.totalpropswon) +
										parseInt(smdrs[s].getValue('custrecord_wsm_proposalswon', null,'max'));
				
				smdJson.totalpropslost = parseInt(smdJson.totalpropslost) +
										 parseInt(smdrs[s].getValue('custrecord_wsm_proposalslost', null,'max'));
				
				smdJson.totalpercpropswon = parseFloat(smdJson.totalpercpropswon) +
											parseFloat(smdrs[s].getValue('custrecord_wsm_percproposalswon', null,'max'));
				
				smdJson.totalavgpropdur = parseInt(smdJson.totalavgpropdur) +
										  parseInt(smdrs[s].getValue('custrecord_wsm_avgproposaldurationdays', null,'max'));
				
				smdJson.totalweekmrr = parseFloat(smdJson.totalweekmrr) +
									   parseFloat(smdrs[s].getValue('custrecord_wsm_weeklymrr', null,'max'));
				
				smdJson.totalmonthmrr = parseFloat(smdJson.totalmonthmrr) +
										parseFloat(smdrs[s].getValue('custrecord_wsm_monthlymrr', null,'max'));
										
										
										
				smdJson.totalweeklyapproved = parseFloat(smdJson.totalweeklyapproved) +
									   parseFloat(smdrs[s].getValue('custrecord_wsm_weeklyapprovedorders', null,'max'));					//NEW
				
				smdJson.totalmonthlyapproved = parseFloat(smdJson.totalmonthlyapproved) +
										parseFloat(smdrs[s].getValue('custrecord_wsm_monthlyapprovedorders', null,'max'));					//NEW					
										
								
			}
			
			//Let's add in Total Line
			//smdline += 1;
			
			//Total calculation
			//Run calc for % of Opp. to Proposal
			//Run calc for Avg of Opp duration
			//Run calc for % of Proposals Won.
			//Run calc for Avg of Prop duration
			var percOtoP = 0.0,
				avgOppd = 0,
				percProsWon = 0.0,
				avgPropd = 0;
			
			if (smdJson.totalemployees)
			{
				percOtoP = (smdJson.totalpercotop / smdJson.totalemployees).toFixed(2);
				avgOppd = Math.round((smdJson.totalavgoppdur / smdJson.totalemployees)).toFixed(0);
				percProsWon = (smdJson.totalpercpropswon / smdJson.totalemployees).toFixed(2);
				avgPropd = Math.round((smdJson.totalavgpropdur / smdJson.totalemployees)).toFixed(0);
			}
			
			datasl.setLineItemValue('dsl_salesrep', smdline, '<div align="center"><b>Total</b>');
			datasl.setLineItemValue('dsl_leads', smdline, '<div align="center"><b>'+parseInt(smdJson.totalleads).toFixed(0));
			
			datasl.setLineItemValue('dsl_unqualifiedopps', smdline, '<div align="center"><b>'+parseInt(smdJson.unqualifiedopps).toFixed(0));						//NEW
			
			datasl.setLineItemValue('dsl_totalopps', smdline, '<div align="center"><b>'+parseInt(smdJson.totalopps).toFixed(0));
			
			datasl.setLineItemValue('dsl_oppstoqualified', smdline, '<div align="center"><b>'+parseInt(smdJson.oppstoqualified).toFixed(0));						//NEW
			
			datasl.setLineItemValue('dsl_oppsvalue', smdline, '<div align="center"><b>'+formatCurrency(smdJson.totaloppsmrr,2,'.',',',',',false));
			datasl.setLineItemValue('dsl_totalprops', smdline, '<div align="center"><b>'+parseInt(smdJson.totalprops).toFixed(0));
			datasl.setLineItemValue('dsl_propsvalue', smdline, '<div align="center"><b>'+formatCurrency(smdJson.totalpropsmrr,2,'.',',',',',false));
			datasl.setLineItemValue('dsl_otop', smdline, '<div align="center"><b>'+parseInt(smdJson.totalotop).toFixed(0));
			datasl.setLineItemValue('dsl_opplost', smdline, '<div align="center"><b>'+parseInt(smdJson.totaloppslost).toFixed(0));
			datasl.setLineItemValue('dsl_percotop', smdline, percOtoP);
			datasl.setLineItemValue('dsl_avgoppdur', smdline, '<div align="center"><b>'+avgOppd);
			datasl.setLineItemValue('dsl_propswon', smdline, '<div align="center"><b>'+parseInt(smdJson.totalpropswon).toFixed(0));
			datasl.setLineItemValue('dsl_propslost', smdline, '<div align="center"><b>'+parseInt(smdJson.totalpropslost).toFixed(0));
			datasl.setLineItemValue('dsl_percpropswon', smdline, percProsWon);
			datasl.setLineItemValue('dsl_avgpropsdur', smdline, '<div align="center"><b>'+avgPropd);
			datasl.setLineItemValue('dsl_weekmrr', smdline, '<div align="center"><b>'+formatCurrency(smdJson.totalweekmrr,2,'.',',',',',false));
			datasl.setLineItemValue('dsl_monthmrr', smdline, '<div align="center"><b>'+formatCurrency(smdJson.totalmonthmrr,2,'.',',',',',false));
			
			datasl.setLineItemValue('dsl_weeklyapproved', smdline, '<div align="center"><b>'+formatCurrency(smdJson.totalweeklyapproved,2,'.',',',',',false));		//NEW
			datasl.setLineItemValue('dsl_monthlyapproved', smdline, '<div align="center"><b>'+formatCurrency(smdJson.totalmonthlyapproved,2,'.',',',',',false));		//NEW	
	
				
			
			//Add final total line to csvBody
			csvBody += '"Total",'+
					   parseInt(smdJson.totalleads).toFixed(0)+','+
					   
					   parseInt(smdJson.unqualifiedopps).toFixed(0)+','+																	//NEW
					   
					   parseInt(smdJson.totalopps).toFixed(0)+','+	

					   parseInt(smdJson.oppstoqualified).toFixed(0)+','+																	//NEW
					   
					   smdJson.totaloppsmrr+','+
					   parseInt(smdJson.totalprops).toFixed(0)+','+
					   smdJson.totalpropsmrr+','+
					   parseInt(smdJson.totalotop).toFixed(0)+','+
					   parseInt(smdJson.totaloppslost).toFixed(0)+','+
					   percOtoP+','+
					   avgOppd+','+
					   parseInt(smdJson.totalpropswon).toFixed(0)+','+
					   parseInt(smdJson.totalpropslost).toFixed(0)+','+
					   percProsWon+','+
					   avgPropd+','+
					   smdJson.totalweekmrr+','+
					   smdJson.totalmonthmrr+','+
					   
					   smdJson.totalweeklyapproved+','+																			//NEW
					   smdJson.totalmonthlyapproved;					   														//NEW
			
			//Generate Email to Logged in user if download is button is clicked
			if (req.getParameter('csvdownload') == 'Y' && csvBody)
			{
				var csvFileName = paramYear;
				//Let's build out the File Name based on Filters Set
				if (paramMonth)
				{
					csvFileName += '_'+monthJson[paramMonth];
				}
				
				if (paramWeekStartDate)
				{
					csvFileName += '_'+strGlobalReplace(paramWeekStartDate, '/', '_');
				}
				csvFileName = 'SalesMetricData_'+csvFileName+'.csv';
				
				var	csvFileObj = nlapiCreateFile(csvFileName, 'CSV', csvHeader + csvBody);
				
				//We are going to send it out as email
				nlapiSendEmail(
					-5, 
					nlapiGetContext().getUser(), 
					'Sales Metric Data Export', 
					csvFileName+' is attached as CSV File', 
					null, 
					null, 
					null, 
					csvFileObj, 
					true, 
					null, 
					null
				);
				
				//At this point we are going to Redirect to THIS Suitelet without csvdownload parameter
				var rparam = {
					'custpage_year':paramYear,
					'custpage_month':paramMonth,
					'custpage_weekstartdt':paramWeekStartDate,
					'custpage_salesrep':paramSalesRep,
					'custpage_salesteam':paramSalesTeam,
					'custparam_msg':'Request to Download CSV Extract successfully processed and Emailed'
				};
				
				nlapiSetRedirectURL(
					'SUITELET', 
					nlapiGetContext().getScriptId(), 
					nlapiGetContext().getDeploymentId(), 
					'VIEW', 
					rparam
				);
			}//End Processing Download Request
			
		}
		
		//Lets add this JSON object to client side so that google charts can access it
		var gchartloadDataFld = nsform.addField('custpage_gcloadfld', 'inlinehtml', '', null, null);
		//This default field will Load the high level Google chart loader as well
		gchartloadDataFld.setDefaultValue(
			'<script type="text/javascript" src="https://www.gstatic.com/charts/loader.js"></script>'
		);
		
		//========================= GRAPHS =====================================
		//We ONLY add Graphs IF Week filter is NOT SET
		//Below sections will build out Graphs for different data points.
		if ( (paramYear || paramMonth) && !paramWeekStartDate )
		{
			//Look for individual Week data for ALL Sales Reps based on paramYear or paramMonth filter. 
			//Since we are displaying each week as timeline, we will grab ALL data for each week for 
			//each sales rep.  
			//The Search doesn't have to be summarized. 
			//To make sure we minimize the execution of search, we can programmatically summarize the data
			//if needed.
			
			//depending on the parameter, build out start and end dates.
			var rangeStartDate = '',
				rangeEndDate = '';
			
			//At this point, if paramMonth is set, we assume user selected both Year and Month
			if (paramMonth)
			{
				rangeStartDate = (parseInt(paramMonth) + 1)+'/1/'+paramYear;
				//Add one month and subtract one day to get last date of the month
				rangeEndDate = nlapiAddMonths(new Date(rangeStartDate), 1);
				rangeEndDate = nlapiAddDays(rangeEndDate, -1);
				rangeEndDate = nlapiDateToString(rangeEndDate);
			}
			//If not, we assume only year is selected
			else
			{
				rangeStartDate = '1/1/'+paramYear;
				rangeEndDate = '12/31/'+paramYear;
			}
			
			log('debug','start/end', rangeStartDate+' // '+rangeEndDate);
			
			//Filters are built so the date range is compared against both Start of the week
			//as well as end of the week date. This is to allow grabbing of data that crosses months
			var gflt = [
			            	['isinactive', 'is', 'F'],
			            	'and',
			            	[
			            	 	['custrecord_wsm_startweekdate', 'within', rangeStartDate, rangeEndDate],
			            	 	'or',
			            	 	['custrecord_wsm_endweekdate', 'within', rangeStartDate, rangeEndDate]
			            	]
			           ];
			
			//Depending and sales rep and/or sales team filter, set it her eas well
			if (paramSalesRep)
			{
				gflt.push('and');
				gflt.push(['custrecord_wsm_salesrep.internalid','anyof', arParamSalesRep]);
			}
			
			if (paramSalesTeam)
			{
				gflt.push('and');
				gflt.push(['custrecord_wsm_salesrep.custentity_ec_sales_rep_type','anyof', arParamSalesTeam]);
			}
			
			    //Sort by start week date
			var	gcol = [new nlobjSearchColumn('custrecord_wsm_startweekdate').setSort(),
			   	        new nlobjSearchColumn('custrecord_wsm_salesrep'),				        
				        new nlobjSearchColumn('custrecord_wsm_weekrange'),
				        new nlobjSearchColumn('custrecord_wsm_totalproposals'),
				        new nlobjSearchColumn('custrecord_wsm_totalopps'),
				        new nlobjSearchColumn('custrecord_wsm_totalopptopro'),
				        new nlobjSearchColumn('custrecord_wsm_proposalswon'),
				        new nlobjSearchColumn('custrecord_wsm_proposalslost'),
				        new nlobjSearchColumn('custrecord_wsm_monthlymrr')
				        ];
				grsearch = nlapiCreateSearch('customrecord_ax_weeklysalesmetrics', gflt, gcol),
				grset = grsearch.runSearch(),
				gcnt = 1000,
				gstart = 0,
				gend = 1000;
			
			//This will be grouped by Sales Rep (KEY)
			var datajson = {},
				//bydatejson tracks data points of each sales reps by week start date
				//this is to support building google data tabl on the client side
				bydatejson = {},
				hasValues = false;
			
			//Assume there is possibility that we may get more than 1000 data sets.
			while (gcnt == 1000)
			{
				var grs = grset.getResults(gstart, gend);
				
				if (grs && grs.length > 0)
				{
					hasValues = true;
				}
				
				for (var d=0; grs && d < grs.length; d+=1)
				{
					var salesRep = grs[d].getText('custrecord_wsm_salesrep'),
						startDate = grs[d].getValue('custrecord_wsm_startweekdate'),
						totalPropVal = grs[d].getValue('custrecord_wsm_totalproposals'),
						totalOppVal = grs[d].getValue('custrecord_wsm_totalopps'),
						convertedoppsVal = grs[d].getValue('custrecord_wsm_totalopptopro'),
						wonpropVal = grs[d].getValue('custrecord_wsm_proposalswon'),
						lostpropVal = grs[d].getValue('custrecord_wsm_proposalslost'),
						monthmrrVal = grs[d].getValue('custrecord_wsm_monthlymrr'),
						weekVal = grs[d].getValue('custrecord_wsm_weekrange');
					
					if (monthmrrVal == '.00')
					{
						monthmrrVal = '0.0';
					}
					
					if (!salesRep)
					{
						salesRep = 'N/A';
					}
					
					//Build out by Date json object
					//11/1/2016
					//When building out each of JSON objects to be used by the graph,
					//it is important to keep keys the same.
					//Each of the metric keys are passed in as function calls to the button
					//that swaps out the graphs.
					
					if (!bydatejson[startDate])
					{
						bydatejson[startDate] = {
							'week':weekVal,
							'totalprop':{},
							'totalopp':{},
							'convertedopps':{},
							'wonprop':{},
							'lostprop':{},
							'monthmrr':{}
						};
					}
					
					bydatejson[startDate].totalprop[salesRep] = totalPropVal;
					bydatejson[startDate].totalopp[salesRep] = totalOppVal;
					bydatejson[startDate].convertedopps[salesRep] = convertedoppsVal;
					bydatejson[startDate].wonprop[salesRep] = wonpropVal;
					bydatejson[startDate].lostprop[salesRep] = lostpropVal;
					bydatejson[startDate].monthmrr[salesRep] = monthmrrVal;
					
					if (!datajson[salesRep])
					{
						//build an array of data points for this sales rep.
						//Result is already sorted in ASC order 
						datajson[salesRep] = {
							'totalprop':[],
							'totalopp':[],
							'convertedopps':[],
							'wonprop':[],
							'lostprop':[],
							'monthmrr':[]
						};
					}
					
					datajson[salesRep].totalprop.push({
						'startdate':startDate,
						'week':weekVal,
						'value':totalPropVal
					});
					
					datajson[salesRep].totalopp.push({
						'startdate':startDate,
						'week':weekVal,
						'value':totalOppVal
					});
					
					datajson[salesRep].convertedopps.push({
						'startdate':startDate,
						'week':weekVal,
						'value':convertedoppsVal
					});
					
					datajson[salesRep].wonprop.push({
						'startdate':startDate,
						'week':weekVal,
						'value':wonpropVal
					});
					
					datajson[salesRep].lostprop.push({
						'startdate':startDate,
						'week':weekVal,
						'value':lostpropVal
					});
					
					datajson[salesRep].monthmrr.push({
						'startdate':startDate,
						'week':weekVal,
						'value':monthmrrVal
					});
				}
				
				gcnt = grs.length;
				gstart = gend;
				gend = gend + 1000;
			}
			
			//log('debug','datajson', JSON.stringify(datajson));
			
			//Lets add this JSON object to client side so that google charts can access it
			var gchartDataFld = nsform.addField('custpage_gcfld', 'inlinehtml', '', null, null);
			//This default field will Load the high level Google chart loader as well
			gchartDataFld.setDefaultValue(
				'<script language="JavaScript">'+
				'var hasValues = '+hasValues.toString()+';\n'+
				'var datajson = '+JSON.stringify(datajson)+';\n'+
				'var bydatejson = '+JSON.stringify(bydatejson)+';'+
				'</script>'
			);
			
			//Add in Subtabs for Graphs 1
			nsform.addSubTab('custpage_tab1','Graphs');
			var grp1html = nsform.addField('custpage_grp1', 'inlinehtml', 'Graph 1', null, 'custpage_tab1');
			//totalprops div and is holding cell for google charts to draw the graph into
			grp1html.setDefaultValue(
				'<div id="buttons">'+
				'<input type="button" onclick="reDraw(\'totalopp\')" id="totalopp" value="Total Opps" style="padding: 5px; border-radius: 8px; font-size: 13px"/> &nbsp; '+
				
				'<input type="button" onclick="reDraw(\'convertedopps\')" id="convertedopps" value="Converted Opps" style="padding: 5px; border-radius: 8px; font-size: 13px"/> &nbsp; '+
				
				'<input type="button" onclick="reDraw(\'wonprop\')" id="wonprop" value="Won Proposals" style="padding: 5px; border-radius: 8px; font-size: 13px"/> &nbsp; '+
				
				'<input type="button" onclick="reDraw(\'lostprop\')" id="lostprop" value="Lost Proposals" style="padding: 5px; border-radius: 8px; font-size: 13px"/> &nbsp; '+
				
				'<input type="button" onclick="reDraw(\'totalprop\')" id="totalprop" value="Total Proposals" style="padding: 5px; border-radius: 8px; font-size: 13px"/> &nbsp; '+
				
				'<input type="button" onclick="reDraw(\'monthmrr\')" id="monthmrr" value="Monthly MRR" style="padding: 5px; border-radius: 8px; font-size: 13px"/> &nbsp; '+
				'</div><br/>'+
				'<div id="graphs"></div>'
			);
			
			/**
			//Add in Subtabs for Graphs 2
			nsform.addSubTab('custpage_tab2','Testing Tab 2');
			var grp2html = nsform.addField('custpage_grp2', 'inlinehtml', 'Graph 2', null, 'custpage_tab2');
			grp2html.setDefaultValue('testing');
			*/
		}
		
	}
	catch(displayerr)
	{
		log('error','Error Generating Display', getErrText(displayerr));
		
		msgfld.setDefaultValue(
			'<div style="color: red; font-size: 15px">'+
			getErrText(displayerr)+
			'</div>'
		);
	}
	
	res.writePage(nsform);
}

/*********** Client Script ************/
//Google related functions
var graphToShow = 'totalopp',
	chart = null,
	chartJson = {
		'totalprop':{
			'title':'Total Proposals vs Sales Rep vs Week of Year'
		},
		'totalopp':{
			'title':'Total Opps vs Sales Rep vs Week of Year'
		},
		'convertedopps':{
			'title':'Total Opps Converted to proposal vs Sales Rep vs Week of Year'
		},
		'wonprop':{
			'title':'Proposals Won vs Sales Rep vs Week of Year'
		},
		'lostprop':{
			'title':'Proposals Lost vs Sales Rep vs Week of Year'
		},
		'monthmrr':{
			'title':'Monthly MRR vs Sales Rep vs Week of Year'
		}
	};


function reDraw(_graph)
{
	if (_graph)
	{
		graphToShow = _graph;
	}
	
	//Reset the color back to normal for all
	for (var i in chartJson)
	{
		document.getElementById(i).style.color = "black";
		document.getElementById(i).style.fontSize = "13px";
	}
	
	//Change the color of selected button
	document.getElementById(_graph).style.color = "red";
	document.getElementById(_graph).style.fontSize = "16px";
	
	drawGraphs();
}

function smdPageInit(type)
{
	//We only trigger a call to draw the graph is year or month is filled in
	if ( (nlapiGetFieldValue('custpage_year') || 
		nlapiGetFieldValue('custpage_month') ) && 
		!nlapiGetFieldValue('custpage_weekstartdt'))
	{
		//Let's load the line package from google 
		google.charts.load(
			'current', 
			{
				packages:['corechart']
			}
		);
		
		//Draw Graphs graph
		google.charts.setOnLoadCallback(drawGraphs);
		
		//Change the color of selected button
		document.getElementById(graphToShow).style.color = "red";
		document.getElementById(graphToShow).style.fontSize = "16px";
	}
}

/**
 * Function to draw total proposals line chart
 * uses datajson variable dynamically generated by server side
 * datajson
 * [sales rep name].totalprop = [{week:'', value:'', startdate:''}...]
 * 
 * bydatejson
 * [startdate].week 
 * [startdate].totalprop[salesrep]
 * 
 * draws chart in graphs container
 */
function drawGraphs()
{
	
	if (chart)
	{
		chart.clearChart();
	}
	
	chart = new google.visualization.LineChart(document.getElementById('graphs'));
	
	if (!hasValues)
	{
		return;
	}
	
	//we are going to build out data table definition based on number of sales reps returned
	var tpdata = new google.visualization.DataTable(),
		tprows = [];
	//we know the first element in the array will be week range value
	tpdata.addColumn('string', 'Week');
	//loop through each returned sales rep and add to column def.
	//var testRows = 'Week || ';
	for (var s in datajson)
	{
		tpdata.addColumn('number', s);
		//testRows += s+' || ';
	}
	
	//console.log(testRows);
	
	//now we need to build tprows by looping through bydatejson. 
	for (var bd in bydatejson)
	{
		var rowArray = [];
		
		//start off with adding week value since that is col. 1
		rowArray.push(bydatejson[bd].week);
		
		//we loop through each sales reps in datajson
		//	and check against bydatejson[bd].totalprop[salesrep].
		//	this is because datajson contains list of ALL Sales reps that matches filter
		//	while bydatejson will contain only those sales reps with values for the date
		for (var s in datajson)
		{
			var valByRep = 0;
			if (bydatejson[bd][graphToShow][s])
			{
				valByRep = parseInt(bydatejson[bd][graphToShow][s]);
			}
			
			rowArray.push(valByRep);
		}
		
		//console.log(rowArray);
		
		//Add this row data to row list
		tprows.push(rowArray);
	}
	
	//add the rows to tpdata object
	tpdata.addRows(tprows);
	
	//DataTable object is now built, let's draw out the graph
	//options object contains some of customization options for the graph
	var options = {
		'title':chartJson[graphToShow].title,
		'chartArea':{
			'left':50,
			'top':30,
			'width':'75%',
			'height':'75%'
		},
		'pointSize':5,
		'legend':{
			'position':'right',
			'alignment':'start',
			'textStyle':{
				'fontSize':12
			}
		},
		'hAxis':{
			'slantedText':true,
			'slantedTextAngle':45,
			'textStyle':{
				'fontSize':12
			}
		},
		'width':'1700',
		'height':'600'
	};
	
	chart.draw(tpdata, options);
}



function smdFldChanged(type, name, linenum)
{
	if (
		name=='custpage_year' || name == 'custpage_month' || name == 'custpage_weekstartdt'
	   )
	{
		refreshWithFilter();
	}
	
	/**
	 *  ||
		name=='custpage_salesrep' || name=='custpage_salesteam'
	 */
}

/**
 * 11/3/2016
 * Since Sales Rep and Sales Team is multiselect, we don't want the page to refresh 
 * each time it changes.
 * Added clear filter and apply filter option
 */
function userAction(_fld, _action)
{
	if (_action == 'apply')
	{
		refreshWithFilter();
	}
	else if (_action == 'clear')
	{
		//assume _fld value is passed in
		nlapiSetFieldValue(_fld, '', true, true);
	}
}

//Moved out to be used by other functions
function refreshWithFilter()
{
	var smdSlUrl = nlapiResolveURL(
			'SUITELET', 
			'customscript_ax_sl1_weeklysmdview', 
			'customdeploy_ax_sl1_weeklysmdview', 
			'VIEW'
		   );

	//11/3/2016
	//Bug. If Month value is null, empty out week value as well
	//	   If Year value is null, empty out both week and month
	var monthVal = nlapiGetFieldValue('custpage_month'),
	weekVal = nlapiGetFieldValue('custpage_weekstartdt');
	
	if (!nlapiGetFieldValue('custpage_year'))
	{
	monthVal = '';
	weekVal = '';
	}
	
	if (!nlapiGetFieldValue('custpage_month'))
	{
	weekVal = '';
	}
	
	smdSlUrl += '&custpage_year='+nlapiGetFieldValue('custpage_year')+
			'&custpage_month='+monthVal+
			'&custpage_weekstartdt='+weekVal+
			'&custpage_salesrep='+nlapiGetFieldValues('custpage_salesrep').toString()+
			'&custpage_salesteam='+nlapiGetFieldValues('custpage_salesteam').toString();
	
	window.ischanged = false;
	window.location = smdSlUrl;
}

function downloadCsv()
{
	//Validate to make sure atleast year field is filled in
	if (!nlapiGetFieldValue('custpage_year'))
	{
		alert('No Filters are set. Please set one or more filter(s) so that you will have data to download');
		return false;
	}
	
	var smdSlUrl = nlapiResolveURL(
			'SUITELET', 
			'customscript_ax_sl1_weeklysmdview', 
			'customdeploy_ax_sl1_weeklysmdview', 
			'VIEW'
		   );

	//11/3/2016
	//Bug. If Month value is null, empty out week value as well
	//	   If Year value is null, empty out both week and month
	var monthVal = nlapiGetFieldValue('custpage_month'),
		weekVal = nlapiGetFieldValue('custpage_weekstartdt');
	
	if (!nlapiGetFieldValue('custpage_year'))
	{
		monthVal = '';
		weekVal = '';
	}
	
	if (!nlapiGetFieldValue('custpage_month'))
	{
		weekVal = '';
	}
	
	smdSlUrl += '&custpage_year='+nlapiGetFieldValue('custpage_year')+
				'&custpage_month='+monthVal+
				'&custpage_weekstartdt='+weekVal+
				'&custpage_salesrep='+nlapiGetFieldValues('custpage_salesrep').toString()+
				'&custpage_salesteam='+nlapiGetFieldValues('custpage_salesteam').toString()+
				'&csvdownload=Y';
	
	window.ischanged = false;
	window.location = smdSlUrl;
}
