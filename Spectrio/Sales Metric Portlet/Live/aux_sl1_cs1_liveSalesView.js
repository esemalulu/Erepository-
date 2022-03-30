/**
 * Suitelet that displays LIVE Sales Metric Data
 * @param req
 * @param res
 */
function displayLiveSales(req, res)
{
	var nsform = nlapiCreateForm('Live Sales Metrics', false);
	nsform.setScript('customscript_ax_cs1_live_smdview');
	
	//Add Error or any other message display field	
	var msgfld = nsform.addField('custpage_msgfld', 'inlinehtml','Message', null, null);
	msgfld.setLayoutType('outsideabove', null);
	
	//Sales Rep and Sales Team Filters when the page is refreshed
	var paramSalesRep = (req.getParameter('custpage_salesrep')?req.getParameter('custpage_salesrep'):''),
	paramSalesTeam = (req.getParameter('custpage_salesteam')?req.getParameter('custpage_salesteam'):''),
	
	//Drilldown parameters for when users select underlined link values
	paramDrillDownType = (req.getParameter('drilltype')?req.getParameter('drilltype'):''),
	paramDrillDownRep = (req.getParameter('ddrep')?req.getParameter('ddrep'):''),
	
	paramStatusMsg = (req.getParameter('custparam_msg')?req.getParameter('custparam_msg'):'');
	
	//The following are all Script Level paremeters. 
	var paramUnqualifiedOpps = nlapiGetContext().getSetting('SCRIPT','custscript_454_unqualifiedoppssearch'),  		 	
	paramTotalOppsSearchId = nlapiGetContext().getSetting('SCRIPT','custscript_454_qualifiedopportunities'), 		
	paramOppsConvertedToQual = nlapiGetContext().getSetting('SCRIPT','custscript_454_oppsconvertedtoqualified'),  	
		
	paramMrrOppSearchId = nlapiGetContext().getSetting('SCRIPT','custscript_454_opportunity_mrr'),					
	paramTotalPropSearchId = nlapiGetContext().getSetting('SCRIPT','custscript_454_total_proposals'),				
	paramMrrPropSearchId = nlapiGetContext().getSetting('SCRIPT','custscript_454_proposal_mrr'),					
		
	paramOppToPropSearchId = nlapiGetContext().getSetting('SCRIPT','custscript_454_oppsconvertedtoprops'),			
	paramOppLostSearchId = nlapiGetContext().getSetting('SCRIPT','custscript_454_opportuntieslost'),				
	paramProposalWon = nlapiGetContext().getSetting('SCRIPT','custscript_454_proposalswonsearch'),						
	paramPropLostSearchId = nlapiGetContext().getSetting('SCRIPT','custscript_454_proposalslost'),					
	
	paramWeeklyMrr = nlapiGetContext().getSetting('SCRIPT','custscript_454_weekly_mrr'),							
	paramMonthlyMrr = nlapiGetContext().getSetting('SCRIPT','custscript_454_monthly_mrr'),					
	paramWeeklyMrrApproved = nlapiGetContext().getSetting('SCRIPT','custscript_454_weekly_approved'),			
	paramMonthlyMrrApproved = nlapiGetContext().getSetting('SCRIPT','custscript_454_monthly_approved'),

	paramQUALIFIED_OPPS_LESSTHAN =  nlapiGetContext().getSetting('SCRIPT','custscript_454_totalopps_lessthan'),
	paramQUALIFIED_OPPS_GREATERTHAN =  nlapiGetContext().getSetting('SCRIPT','custscript_454_totalopps_greaterthan'),	
	paramTOTAL_PROPS_GREATERTHAN =  nlapiGetContext().getSetting('SCRIPT','custscript_454_totalprops_greaterthan'),
	paramTOTAL_PROPS_LESSTHAN =  nlapiGetContext().getSetting('SCRIPT','custscript_454_totalprops_lessthan'),
	paramOPP_TO_PROP_LESSTHAN =  nlapiGetContext().getSetting('SCRIPT','custscript_454_opp_to_prop_lessthan'),
	paramOPP_TO_PROP_GREATERTHAN =  nlapiGetContext().getSetting('SCRIPT','custscript_454_opp_to_prop_greaterthan'),

	paramPROP_WON_LESSTHAN =  nlapiGetContext().getSetting('SCRIPT','custscript_454_props_won_lessthan'),
	paramPROP_WON_GREATERTHAN =  nlapiGetContext().getSetting('SCRIPT','custscript_454_props_won_greaterthan'),
	
	paramPROP_LOST_LESSTHAN =  nlapiGetContext().getSetting('SCRIPT','custscript_454_props_lost_lessthan');		

	
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
					
		if (paramStatusMsg)
		{
			msgfld.setDefaultValue(
				'<div style="font-weight:bold; padding: 10px; font-size: 15px">'+
				paramStatusMsg+
				'</div>'
			);
		}

		
	try
	{
					
		//============ Process Drill Down based on paramDrillDownType ========================
		if (paramDrillDownType)
		{

			if (paramDrillDownType == 'unqualopps')
			{
				//We first load the original search
				var unqoppsSearch = nlapiLoadSearch(null, paramUnqualifiedOpps),
					//We grab the filters from original saved search used by Scheduled Script.
					//Assumes that it is NOT using expression based search
					unqoppsFlt = unqoppsSearch.getFilters(),
					newunqoppsFlt = [],
					//We custom build the search results for lead search
					//ungrouped
					unqoppsCol = [new nlobjSearchColumn('trandate'),
					           new nlobjSearchColumn('tranid'),
					           new nlobjSearchColumn('entity'),
					           new nlobjSearchColumn('salesrep')];
				
				for (var unqopps =0; unqopps  < unqoppsFlt.length; unqopps+=1)
				{
					newunqoppsFlt.push(unqoppsFlt[unqopps]);
				}
				
				//we need to add in filter specific for THIS sales rep
				newunqoppsFlt.push(new nlobjSearchFilter('salesrep', null, 'anyof', paramDrillDownRep));
				var	unqoppsCloneSearch = nlapiCreateSearch(
										unqoppsSearch.getSearchType(), 
										newunqoppsFlt,
										unqoppsCol
									  );
				unqoppsCloneSearch.setRedirectURLToSearchResults();
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
			
			
			if (paramDrillDownType == 'oppscnvqual')
			{
				//We first load the original search
				var oppscnvqualSearch = nlapiLoadSearch(null, paramOppsConvertedToQual),
					//We grab the filters from original saved search used by Scheduled Script.
					//Assumes that it is NOT using expression based search
					oppscnvqualFlt = oppscnvqualSearch.getFilters(),
					newoppscnvqualFlt = [],
					//We custom build the search results for lead search
					//ungrouped
					oppscnvqualCol = [new nlobjSearchColumn('trandate'),
					           new nlobjSearchColumn('tranid'),
					           new nlobjSearchColumn('entity'),
					           new nlobjSearchColumn('salesrep')];
				
				for (var oppsqual =0; oppsqual  < oppscnvqualFlt.length; oppsqual+=1)
				{
					newoppscnvqualFlt.push(oppscnvqualFlt[oppsqual]);
				}
				
				//we need to add in filter specific for THIS sales rep
				newoppscnvqualFlt.push(new nlobjSearchFilter('salesrep', null, 'anyof', paramDrillDownRep));
				var	oppscnvqualCloneSearch = nlapiCreateSearch(
										oppscnvqualSearch.getSearchType(), 
										newoppscnvqualFlt,
										oppscnvqualCol
									  );
				oppscnvqualCloneSearch.setRedirectURLToSearchResults();
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
				newotopFlt.push(new nlobjSearchFilter('custbody_converted_proposal', null, 'within', 'thisweek'));
				var	otopCloneSearch = nlapiCreateSearch(
										otopSearch.getSearchType(), 
										newotopFlt,
										otopCol
									  );
				otopCloneSearch.setRedirectURLToSearchResults();
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
				newolostFlt.push(new nlobjSearchFilter('custbody_opportunity_lost', null, 'within', 'thisweek'));
				var	olostCloneSearch = nlapiCreateSearch(
										olostSearch.getSearchType(), 
										newolostFlt,
										olostCol
									  );
				olostCloneSearch.setRedirectURLToSearchResults();
				return;
			}
						
						
			//pwon
			if (paramDrillDownType == 'pwon')
			{
				//We first load the original search
				var pwonSearch = nlapiLoadSearch(null, paramProposalWon),
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
				newpwonFlt.push(new nlobjSearchFilter('custbody_proposal_won', null, 'within', 'thisweek'));
				
				var	pwonCloneSearch = nlapiCreateSearch(
										pwonSearch.getSearchType(), 
										newpwonFlt,
										pwonCol
									  );
				pwonCloneSearch.setRedirectURLToSearchResults();
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
				newplostFlt.push(new nlobjSearchFilter('custbody_proposal_lost', null, 'within', 'thisweek'));
				
				var	plostCloneSearch = nlapiCreateSearch(
										plostSearch.getSearchType(), 
										newplostFlt,
										plostCol
									   );
				plostCloneSearch.setRedirectURLToSearchResults();
				return;
			}
			
	
			//wklymmr
			if (paramDrillDownType == 'wklymmr')
			{
				//We first load the original search
				var wmrrSearch = nlapiLoadSearch(null, paramWeeklyMrr),
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
				
				var	wmrrCloneSearch = nlapiCreateSearch(
										wmrrSearch.getSearchType(), 
										newwmrrFlt,
										wmrrCol
									   );
				wmrrCloneSearch.setRedirectURLToSearchResults();
				return;
			}				
			
			
			//mnthlymmr
			if (paramDrillDownType == 'mnthlymmr')
			{
				//We first load the original search
				var mmrrSearch = nlapiLoadSearch(null, paramMonthlyMrr),
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
				
				var	mmrrCloneSearch = nlapiCreateSearch(
										mmrrSearch.getSearchType(), 
										newmmrrFlt,
										mmrrCol
									   );
				mmrrCloneSearch.setRedirectURLToSearchResults();
				return;
			}			
			
				
			//wklyapp
			if (paramDrillDownType == 'wklyapp')
			{
				//We first load the original search
				var wklyappSearch = nlapiLoadSearch(null, paramWeeklyMrrApproved),
					//We grab the filters from original saved search used by Scheduled Script.
					//Assumes that it is NOT using expression based search
					wklyappFlt = wklyappSearch.getFilters(),
					newwklyappFlt = [],
					//We custom build the search results for lead search
					//ungrouped
					wklyappCol = [new nlobjSearchColumn('trandate'),
					            new nlobjSearchColumn('tranid'),
					            new nlobjSearchColumn('entity'),
					            new nlobjSearchColumn('custbody_comm_mrr'),
					            new nlobjSearchColumn('salesrep')];
				
				for (var wkapp=0; wkapp < wklyappFlt.length; wkapp+=1)
				{
					newwklyappFlt.push(wklyappFlt[wkapp]);
				}
				
				//we need to add in filter specific for THIS sales rep
				newwklyappFlt.push(new nlobjSearchFilter('salesrep', null, 'anyof', paramDrillDownRep));
				
				var	wklyappCloneSearch = nlapiCreateSearch(
										wklyappSearch.getSearchType(), 
										newwklyappFlt,
										wklyappCol
									   );
				wklyappCloneSearch.setRedirectURLToSearchResults();
				return;
			}			
			
			
			//mnthlyapp
			if (paramDrillDownType == 'mnthlyapp')
			{
				//We first load the original search
				var mnthlyappSearch = nlapiLoadSearch(null, paramMonthlyMrrApproved),
					//We grab the filters from original saved search used by Scheduled Script.
					//Assumes that it is NOT using expression based search
					mnthlyappFlt = mnthlyappSearch.getFilters(),
					newmnthlyappFlt = [],
					//We custom build the search results for lead search
					//ungrouped
					mnthlyappCol = [new nlobjSearchColumn('trandate'),
					            new nlobjSearchColumn('tranid'),
					            new nlobjSearchColumn('entity'),
					            new nlobjSearchColumn('custbody_comm_mrr'),
					            new nlobjSearchColumn('salesrep')];
				
				for (var mnapp=0; mnapp < mnthlyappFlt.length; mnapp+=1)
				{
					newmnthlyappFlt.push(mnthlyappFlt[mnapp]);
				}
				
				//we need to add in filter specific for THIS sales rep
				newmnthlyappFlt.push(new nlobjSearchFilter('salesrep', null, 'anyof', paramDrillDownRep));
				
				var	mnthlyappCloneSearch = nlapiCreateSearch(
										mnthlyappSearch.getSearchType(), 
										newmnthlyappFlt,
										mnthlyappCol
									   );
				mnthlyappCloneSearch.setRedirectURLToSearchResults();
				return;
			}

			
		}//End Drill Down Processing
		//================== END Drill Down Processing =======================================
			
		
		var salesMetricArray = [];
		var salesMetricObj = {};
		
		//Original Sales Rep search is based on the custom record "customrecord_ax_weeklysalesmetrics" which is used for the HISTORICAL search 
		var slsrpflt = [new nlobjSearchFilter('isinactive', null, 'is', 'F'),
						new nlobjSearchFilter('isinactive', 'custrecord_wsm_salesrep' ,'is', 'F')];
									
		//if Sales Rep is added, let's add to the filter
		if (paramSalesRep)
		{
			slsrpflt.push(new nlobjSearchFilter('custrecord_wsm_salesrep', null, 'anyof', arParamSalesRep));
		}
		
		//if Sales Team is added, let's add to the filter
		if (paramSalesTeam)
		{
			slsrpflt.push(new nlobjSearchFilter('custentity_ec_sales_rep_type', 'custrecord_wsm_salesrep' ,'anyof', arParamSalesTeam));
		}

		slsrpcol = [new nlobjSearchColumn('custrecord_wsm_salesrep', null, 'group')];
		
		var smdrs = nlapiSearchRecord('customrecord_ax_weeklysalesmetrics', null, slsrpflt, slsrpcol);
	
		for(var i=0; smdrs && i < smdrs.length; i++){
	
			 salesMetricObj[smdrs[i].getValue('custrecord_wsm_salesrep', null, 'group')] = {	
			"id":smdrs[i].getValue('custrecord_wsm_salesrep', null, 'group'),			 
			"employees":smdrs[i].getText('custrecord_wsm_salesrep', null, 'group'),
			"unqualopps":"0",			
			"totalopps":"0",
			"oppscnvqual":"0",
			"totaloppsmrr":"0.00",
			"totalprops":"0",
			"totalpropsmrr":"0.00",
			"totalotop":"0",
			"totaloppslost":"0",
			"totalpropswon":"0",
			"totalpropslost":"0",		
			"totalweekmrr":"0.00",
			"totalmonthmrr":"0.00",
			"wklyapprvd":"0.00",
			"mnthlyapprvd":"0.00"
			
			};
			
			salesMetricArray.push(salesMetricObj[smdrs[i].getValue('custrecord_wsm_salesrep', null, 'group')]);
		}

		
		if (salesMetricArray.length > 0) 
		{
			
			
			//[LIVE SALES METRICS PORTLET] Unqualified Opportunities			
			var unqlfdopps = nlapiSearchRecord(null, paramUnqualifiedOpps );
							
			for (var a=0; unqlfdopps && a < unqlfdopps.length; a++) 
			{	
				if(salesMetricObj[unqlfdopps[a].getValue('salesrep', null,'group')]){
					
					salesMetricObj[unqlfdopps[a].getValue('salesrep',null,'group')]['unqualopps'] = unqlfdopps[a].getValue('internalid', null,'count');					
				}					
			}			
						
					
			//[LIVE SALES METRICS PORTLET] Total Opportunities				
			var totopps = nlapiSearchRecord(null, paramTotalOppsSearchId);
							
			for (var a=0; totopps && a < totopps.length; a++) 
			{	
				if(salesMetricObj[totopps[a].getValue('salesrep', null,'group')]){					
					salesMetricObj[totopps[a].getValue('salesrep',null,'group')]['totalopps'] = totopps[a].getValue('internalid', null,'count');					
				}					
			}

			
			//[LIVE SALES METRICS PORTLET] Opps Converted to Qualified		
			var oppsconvqual = nlapiSearchRecord(null, paramOppsConvertedToQual );
							
			for (var a=0; oppsconvqual && a < oppsconvqual.length; a++) 
			{	
				if(salesMetricObj[oppsconvqual[a].getValue('salesrep', null,'group')]){					
					salesMetricObj[oppsconvqual[a].getValue('salesrep',null,'group')]['oppscnvqual'] = oppsconvqual[a].getValue('internalid', null,'count');					
				}					
			}
			
//--------------------------------------------------------------------------------------------------------------------
		
			//[LIVE SALES METRICS PORTLET] Opportunity $															 						 
			var totoppsAmt = nlapiSearchRecord( null , paramMrrOppSearchId);
							
			for (var b=0; totoppsAmt && b < totoppsAmt.length; b++) 
			{		
				if(salesMetricObj[totoppsAmt[b].getValue('salesrep', null,'group')]  ){	
				
					salesMetricObj[totoppsAmt[b].getValue('salesrep',null,'group')]['totaloppsmrr'] = totoppsAmt[b].getValue('custbody_sum_mrr', null,'sum');						
				}						
			}				
		
			//[LIVE SALES METRICS PORTLET] Total Proposals							 						 
			var totProp = nlapiSearchRecord( null , paramTotalPropSearchId);
							
			for (var d=0; totProp && d < totProp.length; d++) 
			{		
				if(salesMetricObj[totProp[d].getValue('salesrep', null,'group')]){	
				
					salesMetricObj[totProp[d].getValue('salesrep',null,'group')]['totalprops'] = totProp[d].getValue('internalid', null,'count');						
				}				
			}				
								
			//[LIVE SALES METRICS PORTLET] Proposal $														 						 
			var totpropAmt = nlapiSearchRecord( null , paramMrrPropSearchId);
							
			for (var e=0; totpropAmt && e < totpropAmt.length; e++) 
			{		
				if(salesMetricObj[totpropAmt[e].getValue('salesrep', null,'group')]){	
				
					salesMetricObj[totpropAmt[e].getValue('salesrep',null,'group')]['totalpropsmrr'] = totpropAmt[e].getValue('custbody_sum_mrr', null,'sum');						
				}					
			}				
//--------------------------------------------------------------------------------------------------------------------


			//[LIVE SALES METRICS PORTLET] Opportunities converted to Proposals			
			var oppsConv = nlapiSearchRecord(null, paramOppToPropSearchId);
							
			for (var f=0; oppsConv && f < oppsConv.length; f++) 
			{		
				if(salesMetricObj[oppsConv[f].getValue('salesrep', null,'group')]){	
				
					salesMetricObj[oppsConv[f].getValue('salesrep',null,'group')]['totalotop'] = oppsConv[f].getValue('internalid', null,'count');						
				}						
			}				

			//[LIVE SALES METRICS PORTLET] Opportunities Lost								  						  						  						
			var oppsLoss = nlapiSearchRecord(null, paramOppLostSearchId);
							
			for (var g=0; oppsLoss && g < oppsLoss.length; g++) 
			{		
				if(salesMetricObj[oppsLoss[g].getValue('salesrep', null,'group')]){	
				
					salesMetricObj[oppsLoss[g].getValue('salesrep',null,'group')]['totaloppslost'] = oppsLoss[g].getValue('internalid', null,'count');						
				}						
			}							
													
			//[LIVE SALES METRICS PORTLET] Proposals Won							
			var avgOpp = nlapiSearchRecord(null, paramProposalWon);				
									
			for (var j=0; avgOpp && j < avgOpp.length; j++) 
			{		
				if(salesMetricObj[avgOpp[j].getValue('salesrep', null,'group')]){	
				
					salesMetricObj[avgOpp[j].getValue('salesrep',null,'group')]['totalpropswon'] = avgOpp[j].getValue('internalid', null,'count');						
				}						
			}				
						
			//[LIVE SALES METRICS PORTLET] Proposals Lost		
			var propLoss = nlapiSearchRecord( null, paramPropLostSearchId);
							
			for (var k=0; propLoss && k < propLoss.length; k++) 
			{		
				if(salesMetricObj[propLoss[k].getValue('salesrep', null,'group')] ){					
					salesMetricObj[propLoss[k].getValue('salesrep',null,'group')]['totalpropslost'] = propLoss[k].getValue('internalid', null,'count');						
				}									
			}				
				
					
			//[LIVE SALES METRICS PORTLET] MRR Weekly
			var weeklyMMR = nlapiSearchRecord(null, paramWeeklyMrr );					
										
			for (var l=0; weeklyMMR && l < weeklyMMR.length; l++) 
			{							
				if(salesMetricObj[weeklyMMR[l].getValue('salesrep', null,'group')]){									
					salesMetricObj[weeklyMMR[l].getValue('salesrep',null,'group')]['totalweekmrr'] = weeklyMMR[l].getValue('custbody_comm_mrr',null,'sum');						
				}

			}	
			
			//[LIVE SALES METRICS PORTLET] MRR Monthly
			var monthlyMMR = nlapiSearchRecord(null, paramMonthlyMrr );					
										
			for (var l=0; monthlyMMR && l < monthlyMMR.length; l++) 
			{							
				if(salesMetricObj[monthlyMMR[l].getValue('salesrep', null,'group')]){									
					salesMetricObj[monthlyMMR[l].getValue('salesrep',null,'group')]['totalmonthmrr'] = monthlyMMR[l].getValue('custbody_comm_mrr',null,'sum');						
				}

			}						
				
			//[LIVE SALES METRICS PORTLET] MRR Weekly Approved				
			var weekApprvd = nlapiSearchRecord(null, paramWeeklyMrrApproved );					
										
			for (var m=0; weekApprvd && m < weekApprvd.length; m++) 
			{							
				if(salesMetricObj[weekApprvd[m].getValue('salesrep', null,'group')]){									
					salesMetricObj[weekApprvd[m].getValue('salesrep',null,'group')]['wklyapprvd'] = weekApprvd[m].getValue('custbody_comm_mrr',null,'sum');						
				}

			}	

			//[LIVE SALES METRICS PORTLET] MRR Monthly Approved	
			var monthApprvd = nlapiSearchRecord(null, paramMonthlyMrrApproved);	
							
			for (var n=0; monthApprvd && n < monthApprvd.length; n++) 
			{		
				if(salesMetricObj[monthApprvd[n].getValue('salesrep',null,'group')]){		
					salesMetricObj[monthApprvd[n].getValue('salesrep',null,'group')]['mnthlyapprvd'] = monthApprvd[n].getValue('custbody_comm_mrr',null,'sum');
					
				}					
			}

				
		}
		

		//Sort the 
		function compare(a,b) {
		  if (a.totalotop > b.totalotop)
			return -1;
		  if (a.totalotop < b.totalotop)
			return 1;
		  return 0;
		}

		salesMetricArray.sort(compare);
				
			
		
								
		var dlbtn = nsform.addButton('custpage_dlbtn', 'Download CSV', 'downloadCsv()');										

		nsform.addFieldGroup('grpa', 'Filter Options', null);
		
		//Col 1: Salesrep - 

		var salesrepfld = nsform.addField('custpage_salesrep', 'multiselect', 'Sales Rep', null, 'grpa');
		salesrepfld.setDisplaySize(190,3);
		
		//Apply Filter and Clear filter link
		var shHiClearFld = nsform.addField('custpage_acsalesrep','inlinehtml','',null,'grpa');
		shHiClearFld.setDefaultValue(
			'<a href="#" onclick="userAction(\'custpage_salesrep\',\'apply\')">Apply Filter</a> &nbsp; | &nbsp; '+
			'<a href="#" onclick="userAction(\'custpage_salesrep\',\'clear\')">Clear Filter</a>'
		);
		
			
		//Col 2: Salesteam - directly references "Sales Rep Type List (customlist_ec_sales_rep_type_list)"
		var salesteamfld = nsform.addField('custpage_salesteam', 'multiselect', 'Sales Team', 'customlist_ec_sales_rep_type_list', 'grpa');
		salesteamfld.setDisplaySize(190,3);
		
		var shHiClearFld = nsform.addField('custpage_acsalesteam','inlinehtml','',null,'grpa');
		shHiClearFld.setDefaultValue(
			'<a href="#" onclick="userAction(\'custpage_salesteam\',\'apply\')">Apply Filter</a> &nbsp; | &nbsp; '+
			'<a href="#" onclick="userAction(\'custpage_salesteam\',\'clear\')">Clear Filter</a>'
		);

		//


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

	
	
		var datasl = nsform.addSubList('custpage_datasl', 'list', 'Live Sales Metrics', null);	
		datasl.addField('dsl_salesrep', 'text','Sales Rep', null).setDisplayType('inline');		
		datasl.addField('dsl_unqual_opps','text','<div align="center">Unqualified <br/> Opps', null).setDisplayType('inline');		
		datasl.addField('dsl_totalopps','text','<div align="center">Qualified Opps', null).setDisplayType('inline');		
		datasl.addField('dsl_oppscnvqual','text','<div align="center">Opps Converted <br/> to Qualified', null).setDisplayType('inline');			
		datasl.addField('dsl_oppsvalue','text','Opp $', null).setDisplayType('inline');
		datasl.addField('dsl_totalprops','text','<div align="center">Total Proposals', null).setDisplayType('inline');
		datasl.addField('dsl_propsvalue','textarea','Proposal $', null).setDisplayType('inline');
		datasl.addField('dsl_otop','textarea','<div align="center">Opp. Converted to Proposal', null).setDisplayType('inline');		
		datasl.addField('dsl_opplost','textarea','<div align="center">Opps Lost',null).setDisplayType('inline');
		datasl.addField('dsl_propswon','textarea','<div align="center">Proposals Won', null).setDisplayType('inline');
		datasl.addField('dsl_propslost','textarea','<div align="center">Proposals Lost', null).setDisplayType('inline');		
		datasl.addField('dsl_wklymmr','textarea','Weekly MRR', null).setDisplayType('inline');				
		datasl.addField('dsl_mnthlymmr','textarea','Monthly MRR', null).setDisplayType('inline');			
		datasl.addField('dsl_wklyapproved','textarea','Weekly <br/> Approved <br/> Orders', null).setDisplayType('inline');
		datasl.addField('dsl_mnthlyapproved','textarea','Monthly <br/> Approved <br/> Orders', null).setDisplayType('inline');	
		
		
		var mline=1;	
	

			//Variable kept in place in case of Download
			var csvHeader = '"Sales Rep","Qualified Opps","Total Opps","Opps Converted to Qualified","Opp $","Total Proposals","Proposal $","Opp.Converted to Proposal",'+
							'"Opps Lost","Proposals Won","Proposals Lost","Weekly MRR", "Monthly MRR",'+
							'"Weekly Approved Orders","Monthly Approved Orders"\n',
				xlsBody = '';
				
		var ddBaseUrl = nlapiResolveURL(
							'SUITELET', 
							nlapiGetContext().getScriptId(), 
							nlapiGetContext().getDeploymentId(), 
							'VIEW'
						);
											
		ddBaseUrl += '&custpage_salesrep='+paramSalesRep+
					 '&custpage_salesteam='+paramSalesTeam;
								
		//Define the Total Columns inorder to add up the values											
		var sumTtlUnqOpp = 0,
			sumTtlOpps = 0,
			sumOppsToQual = 0,
			sumOppsMMR = 0,
			sumTotalProps = 0,
			sumPropsMMR = 0,
			sumOtoP = 0,
			sumOppLoss = 0,
			sumPropWon = 0,
			sumPropLoss = 0,
			sumWklyMMR = 0,
			sumMnthMMR = 0,						
			sumWklyAPP = 0,
			sumMnthAPP = 0;
															
		for (var obj=0; salesMetricArray && obj < salesMetricArray.length; obj++)
		{
			
			//Unqualified Opportunities drilltype = unqualopps			
			var unqualOppsDrillDownLink = salesMetricArray[obj].unqualopps;
			
			if (parseInt(salesMetricArray[obj].unqualopps) > 0 )
			{
				unqualOppsDrillDownLink = '<a href="'+ddBaseUrl+
									'&drilltype=unqualopps'+
									'&ddrep='+salesMetricArray[obj].id+
									'" target="_blank">'+
									unqualOppsDrillDownLink+
									'</a>';
			}



			
			//Total Opps drilltype = totalopps
			var totalOppsDrillDownLink = salesMetricArray[obj].totalopps;	
			if (parseInt(salesMetricArray[obj].totalopps) > 0 )
			{
				totalOppsDrillDownLink = '<a href="'+ddBaseUrl+
										 '&drilltype=totalopps'+
										 '&ddrep='+salesMetricArray[obj].id+
										 '" target="_blank">'+
										 totalOppsDrillDownLink+
										 '</a>';
			}	
			



			//Opps Converted to Qualified drilltype = oppscnvqual
			var oppsCNVqualDrillDownLink = salesMetricArray[obj].oppscnvqual;	
			if (parseInt(salesMetricArray[obj].oppscnvqual) > 0 )
			{
				oppsCNVqualDrillDownLink = '<a href="'+ddBaseUrl+
										 '&drilltype=oppscnvqual'+
										 '&ddrep='+salesMetricArray[obj].id+
										 '" target="_blank">'+
										 oppsCNVqualDrillDownLink+
										 '</a>';
			}


			//Opp $ drilltype = oppmrr
			//This must be in currency format
			//Function is in Audaxium_Spectrio_Utility.js
			//formatCurrency(value,2,'.',',',false)
			var oppmrrDrillDownLink = formatCurrency(
											salesMetricArray[obj].totaloppsmrr,
											2,
											'.',
											',',
											',',
											false
									  );
			
			if (parseFloat(salesMetricArray[obj].totaloppsmrr) > 0)
			{
				oppmrrDrillDownLink = '<a href="'+ddBaseUrl+
										 '&drilltype=oppmrr'+
										 '&ddrep='+salesMetricArray[obj].id+
										 '" target="_blank">'+
										 oppmrrDrillDownLink+
										 '</a>';
			}			


			
			//Total Proposals drilltype = totalprops
			var totalPropsDrillDownLink = salesMetricArray[obj].totalprops;
			if (parseInt(salesMetricArray[obj].totalprops) > 0)
			{
				totalPropsDrillDownLink = '<a href="'+ddBaseUrl+
										 '&drilltype=totalprops'+
										 '&ddrep='+salesMetricArray[obj].id+
										 '" target="_blank">'+
										 totalPropsDrillDownLink+
										 '</a>';
			}		
		

			//Props $ drilltype = propmrr
			//This must be in currency format
			//Function is in Audaxium_Spectrio_Utility.js
			//formatCurrency(value,2,'.',',',false)
			var propmrrDrillDownLink = formatCurrency(
											salesMetricArray[obj].totalpropsmrr,
											2,
											'.',
											',',
											',',
											false
									  );
			
			if (parseFloat(salesMetricArray[obj].totalpropsmrr) > 0)
			{
				propmrrDrillDownLink = '<a href="'+ddBaseUrl+
										 '&drilltype=propmrr'+
										 '&ddrep='+salesMetricArray[obj].id+
										 '" target="_blank">'+
										 propmrrDrillDownLink+
										 '</a>';
			}		
			





			
			//Total Opp to Prop drilltype = otop
			var otopDrillDownLink = salesMetricArray[obj].totalotop;
			if (parseInt(salesMetricArray[obj].totalotop) > 0)
			{
				otopDrillDownLink = '<a href="'+ddBaseUrl+
										 '&drilltype=otop'+
										 '&ddrep='+salesMetricArray[obj].id+
										 '" target="_blank">'+
										 otopDrillDownLink+
										 '</a>';
			}
			
			//Opps Lost drilltype = olost
			var olostDrillDownLink = salesMetricArray[obj].totaloppslost;
			if (parseInt(salesMetricArray[obj].totaloppslost) > 0)
			{
				olostDrillDownLink = '<a href="'+ddBaseUrl+
										 '&drilltype=olost'+
										 '&ddrep='+salesMetricArray[obj].id+
										 '" target="_blank">'+
										 olostDrillDownLink+
										 '</a>';
			}		
	
				
			
			//Proposals Won drilltype = pwon
			var pwonDrillDownLink = salesMetricArray[obj].totalpropswon;
			if (parseInt(salesMetricArray[obj].totalpropswon) > 0)
			{
				pwonDrillDownLink = '<a href="'+ddBaseUrl+
										 '&drilltype=pwon'+
										 '&ddrep='+salesMetricArray[obj].id+
										 '" target="_blank">'+
										 pwonDrillDownLink+
										 '</a>';
			}		
		
		
				//Proposals Lost drilltype = plost
				var plostDrillDownLink = salesMetricArray[obj].totalpropslost;
				if (parseInt(salesMetricArray[obj].totalpropslost) > 0)
				{
					plostDrillDownLink = '<a href="'+ddBaseUrl+
											 '&drilltype=plost'+
											 '&ddrep='+salesMetricArray[obj].id+
											 '" target="_blank">'+
											 plostDrillDownLink+
											 '</a>';
				}	
		
				//wklymmr
				//Weekly MRR drilltype = wklymmr
				//This must be in currency format
				//Function is in Audaxium_Spectrio_Utility.js
				//formatCurrency(value,2,'.',',',false)
				var wmmrDrillDownLink = formatCurrency(
											salesMetricArray[obj].totalweekmrr,
											2,
											'.',
											',',
											',',
											false
										);
				
				if (parseFloat(salesMetricArray[obj].totalweekmrr) > 0)
				{
					wmmrDrillDownLink = '<a href="'+ddBaseUrl+
											 '&drilltype=wklymmr'+
											 '&ddrep='+salesMetricArray[obj].id+
											 '" target="_blank">'+
											 wmmrDrillDownLink+
											 '</a>';
				}

				
				//mnthlymmr
				//Weekly MRR drilltype = mnthlymmr
				//This must be in currency format
				//Function is in Audaxium_Spectrio_Utility.js
				//formatCurrency(value,2,'.',',',false)
				var mmmrDrillDownLink = formatCurrency(
											salesMetricArray[obj].totalmonthmrr,
											2,
											'.',
											',',
											',',
											false
										);
				
				if (parseFloat(salesMetricArray[obj].totalmonthmrr) > 0)
				{
					mmmrDrillDownLink = '<a href="'+ddBaseUrl+
											 '&drilltype=mnthlymmr'+
											 '&ddrep='+salesMetricArray[obj].id+
											 '" target="_blank">'+
											 mmmrDrillDownLink+
											 '</a>';
				}
				
				
		
				//wklyapprvd
				//Weekly MRR drilltype = wklyapprvd
				//This must be in currency format
				//Function is in Audaxium_Spectrio_Utility.js
				//formatCurrency(value,2,'.',',',false)
				var wklyapprvdDrillDownLink = formatCurrency(
											salesMetricArray[obj].wklyapprvd,
											2,
											'.',
											',',
											',',
											false
										);
				
				if (parseFloat(salesMetricArray[obj].wklyapprvd) > 0)
				{
					wklyapprvdDrillDownLink = '<a href="'+ddBaseUrl+
											 '&drilltype=wklyapp'+
											 '&ddrep='+salesMetricArray[obj].id+
											 '" target="_blank">'+
											 wklyapprvdDrillDownLink+
											 '</a>';
				}
				
				//mnthlyapprvd
				//Monthly MRR drilltype = mnthlyapprvd
				//This must be in currency format
				//Function is in Audaxium_Spectrio_Utility.js
				//formatCurrency(value,2,'.',',',false)
				var mnthlyapprvdDrillDownLink = formatCurrency(
											salesMetricArray[obj].mnthlyapprvd,
											2,
											'.',
											',',
											',',
											false
										);
				
				if (parseFloat(salesMetricArray[obj].mnthlyapprvd) > 0)
				{
					mnthlyapprvdDrillDownLink = '<a href="'+ddBaseUrl+
											 '&drilltype=mnthlyapp'+
											 '&ddrep='+salesMetricArray[obj].id+
											 '" target="_blank">'+
											 mnthlyapprvdDrillDownLink+
											 '</a>';
				}
	
			datasl.setLineItemValue('dsl_salesrep', mline, salesMetricArray[obj].employees);		
			datasl.setLineItemValue('dsl_unqual_opps', mline, '<div align="center">'+unqualOppsDrillDownLink);	

//datasl.setLineItemValue('dsl_totalopps', mline, '<div align="center">'+totalOppsDrillDownLink);	

			if(parseInt(salesMetricArray[obj].totalopps) < paramQUALIFIED_OPPS_LESSTHAN )
			{
			datasl.setLineItemValue('dsl_totalopps', mline, '<div style="width:100px; background:red" align="center">'+totalOppsDrillDownLink);				
			}
			else if (parseInt(salesMetricArray[obj].totalopps) > paramQUALIFIED_OPPS_GREATERTHAN)
			{
			datasl.setLineItemValue('dsl_totalopps', mline, '<div style="width:100px; background:yellow" align="center">'+totalOppsDrillDownLink);					
			}	
			else
			{
			datasl.setLineItemValue('dsl_totalopps', mline, '<div style="width:100px; background:green" align="center">'+totalOppsDrillDownLink);	
			}	
			
								
			datasl.setLineItemValue('dsl_oppscnvqual', mline, '<div align="center">'+oppsCNVqualDrillDownLink);				
			datasl.setLineItemValue('dsl_oppsvalue', mline, oppmrrDrillDownLink);	
			
//datasl.setLineItemValue('dsl_totalprops', mline, '<div align="center">'+totalPropsDrillDownLink);
			if(parseInt(salesMetricArray[obj].totalprops) > paramTOTAL_PROPS_GREATERTHAN)
			{
			datasl.setLineItemValue('dsl_totalprops', mline, '<div style="width:100px; background:red" align="center">'+totalPropsDrillDownLink);				
			}
			else if (parseInt(salesMetricArray[obj].totalprops) < paramTOTAL_PROPS_LESSTHAN)
			{
			datasl.setLineItemValue('dsl_totalprops', mline, '<div style="width:100px; background:yellow" align="center">'+totalPropsDrillDownLink);					
			}	
			else
			{
			datasl.setLineItemValue('dsl_totalprops', mline, '<div style="width:100px; background:green" align="center">'+totalPropsDrillDownLink);	
			}	

			datasl.setLineItemValue('dsl_propsvalue', mline, propmrrDrillDownLink);		
			
//datasl.setLineItemValue('dsl_otop', mline, '<div align="center">'+otopDrillDownLink);
			if(parseInt(salesMetricArray[obj].totalotop) < paramOPP_TO_PROP_LESSTHAN)
			{
			datasl.setLineItemValue('dsl_otop', mline, '<div style="width:100px; background:red" align="center">'+otopDrillDownLink);				
			}
			else if (parseInt(salesMetricArray[obj].totalotop) > paramOPP_TO_PROP_GREATERTHAN)
			{
			datasl.setLineItemValue('dsl_otop', mline, '<div style="width:100px; background:green" align="center">'+otopDrillDownLink);					
			}	
			else
			{
			datasl.setLineItemValue('dsl_otop', mline, '<div style="width:100px; background:yellow" align="center">'+otopDrillDownLink);	
			}			
		
			datasl.setLineItemValue('dsl_opplost', mline, '<div align="center">'+olostDrillDownLink);	
			
//datasl.setLineItemValue('dsl_propswon', mline, '<div align="center">'+pwonDrillDownLink);
			if(parseInt(salesMetricArray[obj].totalpropswon) < paramPROP_WON_LESSTHAN)
			{
			datasl.setLineItemValue('dsl_propswon', mline, '<div style="width:100px; background:red" align="center">'+pwonDrillDownLink);				
			}
			else if (parseInt(salesMetricArray[obj].totalpropswon) > paramPROP_WON_GREATERTHAN)
			{
			datasl.setLineItemValue('dsl_propswon', mline, '<div style="width:100px; background:green" align="center">'+pwonDrillDownLink);					
			}	
			else
			{
			datasl.setLineItemValue('dsl_propswon', mline, '<div style="width:100px; background:yellow" align="center">'+pwonDrillDownLink);	
			}
	
//datasl.setLineItemValue('dsl_propslost', mline, '<div align="center">'+plostDrillDownLink);	
			if(parseInt(salesMetricArray[obj].totalpropslost) < paramPROP_LOST_LESSTHAN)
			{
			datasl.setLineItemValue('dsl_propslost', mline, '<div style="width:100px; background:red" align="center">'+plostDrillDownLink);				
			}	
			else
			{
			datasl.setLineItemValue('dsl_propslost', mline, '<div style="width:100px;" align="center">'+plostDrillDownLink);	
			}			
			
				
			datasl.setLineItemValue('dsl_wklymmr', mline, wmmrDrillDownLink);
			datasl.setLineItemValue('dsl_mnthlymmr', mline, mmmrDrillDownLink);			
			datasl.setLineItemValue('dsl_wklyapproved', mline, wklyapprvdDrillDownLink);										
			datasl.setLineItemValue('dsl_mnthlyapproved', mline, mnthlyapprvdDrillDownLink);										
		
					//Build out CSV Body
			xlsBody += '"'+salesMetricArray[obj].employees+'",'+
					   salesMetricArray[obj].unqualopps+','+			
					   salesMetricArray[obj].totalopps+','+
					   salesMetricArray[obj].oppscnvqual+','+					   
					   salesMetricArray[obj].totaloppsmrr+','+
					   salesMetricArray[obj].totalprops+','+
					   salesMetricArray[obj].totalpropsmrr+','+
					   salesMetricArray[obj].totalotop+','+
					   salesMetricArray[obj].totaloppslost+','+
					   salesMetricArray[obj].totalpropswon+','+
					   salesMetricArray[obj].totalpropslost+','+					   
					   salesMetricArray[obj].totalweekmrr+','+					   
					   salesMetricArray[obj].totalmonthmrr+','+					   					   
					   salesMetricArray[obj].wklyapprvd+','+
					   salesMetricArray[obj].mnthlyapprvd+'\n';	
	
			mline +=1;			

			sumTtlUnqOpp += parseInt(salesMetricArray[obj].unqualopps);	
			sumTtlOpps += parseInt(salesMetricArray[obj].totalopps);				
			sumOppsToQual += parseInt(salesMetricArray[obj].oppscnvqual);	
			
			if(sumOppsMMR == 'NaN')
			{
			sumOppsMMR = '0.00';
			}			
			sumOppsMMR += parseFloat(salesMetricArray[obj].totaloppsmrr);			
			
			sumTotalProps += parseFloat(salesMetricArray[obj].totalprops);
			sumPropsMMR += parseFloat(salesMetricArray[obj].totalpropsmrr);
			sumOtoP += parseFloat(salesMetricArray[obj].totalotop);
			sumOppLoss += parseFloat(salesMetricArray[obj].totaloppslost);
			sumPropWon += parseFloat(salesMetricArray[obj].totalpropswon);
			sumPropLoss += parseFloat(salesMetricArray[obj].totalpropslost);			
			sumWklyMMR += parseFloat(salesMetricArray[obj].totalweekmrr);
			sumMnthMMR += parseFloat(salesMetricArray[obj].totalmonthmrr);						
			sumWklyAPP += parseFloat(salesMetricArray[obj].wklyapprvd);
			sumMnthAPP += parseFloat(salesMetricArray[obj].mnthlyapprvd);							
		}

	
		datasl.setLineItemValue('dsl_salesrep', mline, '<b>Total</b>'); 			
		datasl.setLineItemValue('dsl_unqual_opps', mline, '<b><div align="center">'+parseInt(sumTtlUnqOpp).toFixed(0));		
		datasl.setLineItemValue('dsl_totalopps', mline, '<b><div align="center">'+parseInt(sumTtlOpps).toFixed(0));		
		datasl.setLineItemValue('dsl_oppscnvqual', mline, '<b><div align="center">'+parseInt(sumOppsToQual).toFixed(0));		
		datasl.setLineItemValue('dsl_oppsvalue', mline, '<b>'+formatCurrency(sumOppsMMR,2,'.',',',',',false));			
		datasl.setLineItemValue('dsl_totalprops', mline, '<b><div align="center">'+parseInt(sumTotalProps).toFixed(0));
		datasl.setLineItemValue('dsl_propsvalue', mline, '<b><div align="center">'+formatCurrency(sumPropsMMR,2,'.',',',',',false));	
		datasl.setLineItemValue('dsl_otop', mline, '<b><div align="center">'+parseInt(sumOtoP).toFixed(0));
		datasl.setLineItemValue('dsl_opplost', mline, '<b><div align="center">'+parseInt(sumOppLoss).toFixed(0));	
		datasl.setLineItemValue('dsl_propswon', mline, '<b><div align="center">'+parseInt(sumPropWon).toFixed(0));
		datasl.setLineItemValue('dsl_propslost', mline, '<b><div align="center">'+parseInt(sumPropLoss).toFixed(0));	
		datasl.setLineItemValue('dsl_wklymmr', mline, '<b>'+formatCurrency(sumWklyMMR,2,'.',',',',',false));		
		datasl.setLineItemValue('dsl_mnthlymmr', mline, '<b>'+formatCurrency(sumMnthMMR,2,'.',',',',',false));	
		datasl.setLineItemValue('dsl_wklyapproved', mline, '<b>'+formatCurrency(sumWklyAPP,2,'.',',',',',false));		
		datasl.setLineItemValue('dsl_mnthlyapproved', mline, '<b>'+formatCurrency(sumMnthAPP,2,'.',',',',',false));	
	
				
				//Add final total line to xlsBody
		xlsBody += '"Total",'+
				   parseInt(sumTtlUnqOpp).toFixed(0)+','+			
				   parseInt(sumTtlOpps).toFixed(0)+','+	
				   parseInt(sumOppsToQual).toFixed(0)+','+					   
				   sumOppsMMR+','+
				   parseInt(sumTotalProps).toFixed(0)+','+
				   sumPropsMMR+','+					   
				   parseInt(sumOtoP).toFixed(0)+','+
				   parseInt(sumOppLoss).toFixed(0)+','+
				   parseInt(sumPropWon).toFixed(0)+','+
				   parseInt(sumPropLoss).toFixed(0)+','+				   
				   sumWklyMMR+','+				   
				   sumMnthMMR+','+				   
				   sumWklyAPP+','+
				   sumMnthAPP;

	   

		//Generate Email to Logged in user if download is button is clicked
		if (req.getParameter('csvdownload') == 'Y' && xlsBody)
		{		
	
	
			var xlsFileName = 'LIVE_SalesMetricData.csv';
			
			var	xlsFileObj = nlapiCreateFile(xlsFileName, 'CSV', csvHeader + xlsBody);
			
			//We are going to send it out as email
			nlapiSendEmail(
				-5, 
				nlapiGetContext().getUser(), 
				//'elijah@audaxium.com',
				'LIVE Sales Metric Data Export', 
				xlsFileName+' is attached as CSV File', 
				null, 
				null, 
				null, 
				xlsFileObj, 
				true, 
				null, 
				null
				
	
			);
	
			//At this point we are going to Redirect to THIS Suitelet without csvdownload parameter

			var rparam = {'custpage_salesrep':paramSalesRep,
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
		

		var context = nlapiGetContext();
		nlapiLogExecution('error', 'remaining usage', context.getRemainingUsage());
		

		
		
	
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
			'customscript_ax_sl1_livesalesview', 
			'customdeploy_ax_sl1_livesalesview', 
			'VIEW'
		   );

	smdSlUrl +=	'&custpage_salesrep='+nlapiGetFieldValues('custpage_salesrep').toString()+
			'&custpage_salesteam='+nlapiGetFieldValues('custpage_salesteam').toString();
	
	window.ischanged = false;
	window.location = smdSlUrl;
}


function downloadCsv()
{

	
	var smdSlUrl = nlapiResolveURL(
			'SUITELET', 
			'customscript_ax_sl1_livesalesview', 
			'customdeploy_ax_sl1_livesalesview', 
			'VIEW'
		   );
	smdSlUrl += '&custpage_salesrep='+nlapiGetFieldValues('custpage_salesrep').toString()+
				'&custpage_salesteam='+nlapiGetFieldValues('custpage_salesteam').toString()+
				'&csvdownload=Y';
	
	window.ischanged = false;
	window.location = smdSlUrl;
}



//**********************************************************EMAIL DISTRIBUTION SCHEDULED SCRIPT *************************************************************
function emailDistribution()
{

	try
	{
			
		var salesMetricArray = [];
		var salesMetricObj = {};
	
		var slsrpflt = [new nlobjSearchFilter('isinactive', null, 'is', 'F'),
						new nlobjSearchFilter('isinactive', 'custrecord_wsm_salesrep' ,'is', 'F'),		
						new nlobjSearchFilter('custentity_ec_sales_rep_type', 'custrecord_wsm_salesrep' ,'anyof', '1')],  //Inside Sales
									
			slsrpcol = [new nlobjSearchColumn('custrecord_wsm_salesrep', null, 'group')];
					
		var smdrs = nlapiSearchRecord('customrecord_ax_weeklysalesmetrics', null, slsrpflt, slsrpcol);
	
		for(var i=0; smdrs && i < smdrs.length; i++){
					
			 salesMetricObj[smdrs[i].getValue('custrecord_wsm_salesrep', null, 'group')] = {	
			"id":smdrs[i].getValue('custrecord_wsm_salesrep', null, 'group'),			 
			"employees":smdrs[i].getText('custrecord_wsm_salesrep', null, 'group'),
			"unqualopps":"0",			
			"totalopps":"0",
			"oppscnvqual":"0",
			"totaloppsmrr":"0.00",
			"totalprops":"0",
			"totalpropsmrr":"0.00",
			"totalotop":"0",
			"totaloppslost":"0",
			"totalpropswon":"0",
			"totalpropslost":"0",		
			"totalweekmrr":"0.00",
			"totalmonthmrr":"0.00",
			"wklyapprvd":"0.00",
			"mnthlyapprvd":"0.00"
			
			};
			
			salesMetricArray.push(salesMetricObj[smdrs[i].getValue('custrecord_wsm_salesrep', null, 'group')]);
		}
		
		if (salesMetricArray.length > 0) 
		{
						
			//[LIVE SALES METRICS PORTLET] Unqualified Opportunities			
			var unqlfdopps = nlapiSearchRecord(null, 'customsearch10776' );
							
			for (var a=0; unqlfdopps && a < unqlfdopps.length; a++) 
			{	
				if(salesMetricObj[unqlfdopps[a].getValue('salesrep', null,'group')]){
					
					salesMetricObj[unqlfdopps[a].getValue('salesrep',null,'group')]['unqualopps'] = unqlfdopps[a].getValue('internalid', null,'count');					
				}					
			}			
			
			//[LIVE SALES METRICS PORTLET] Total Opportunities				
			var totopps = nlapiSearchRecord(null, 'customsearch11274');
							
			for (var a=0; totopps && a < totopps.length; a++) 
			{	
				if(salesMetricObj[totopps[a].getValue('salesrep', null,'group')]){					
					salesMetricObj[totopps[a].getValue('salesrep',null,'group')]['totalopps'] = totopps[a].getValue('internalid', null,'count');					
				}					
			}

			//[LIVE SALES METRICS PORTLET] Opps Converted to Qualified			
			var oppsconvqual = nlapiSearchRecord(null, 'customsearch11203');
							
			for (var a=0; oppsconvqual && a < oppsconvqual.length; a++) 
			{	
				if(salesMetricObj[oppsconvqual[a].getValue('salesrep', null,'group')]){					
					salesMetricObj[oppsconvqual[a].getValue('salesrep',null,'group')]['oppscnvqual'] = oppsconvqual[a].getValue('internalid', null,'count');					
				}					
			}
		
//--------------------------------------------------------------------------------------------------------------------
		
			//[SALES METRICS PORTLET] Opportunity $															 						 
			var totoppsAmt = nlapiSearchRecord( null , 'customsearch10325');
							
			for (var b=0; totoppsAmt && b < totoppsAmt.length; b++) 
			{		
				if(salesMetricObj[totoppsAmt[b].getValue('salesrep', null,'group')]  ){	
				
					salesMetricObj[totoppsAmt[b].getValue('salesrep',null,'group')]['totaloppsmrr'] = totoppsAmt[b].getValue('custbody_sum_mrr', null,'sum');						
				}						
			}				
		
			//[SALES METRICS PORTLET] Total Proposals							 						 
			var totProp = nlapiSearchRecord( null , 'customsearch10326');
							
			for (var d=0; totProp && d < totProp.length; d++) 
			{		
				if(salesMetricObj[totProp[d].getValue('salesrep', null,'group')]){	
				
					salesMetricObj[totProp[d].getValue('salesrep',null,'group')]['totalprops'] = totProp[d].getValue('internalid', null,'count');						
				}				
			}				
								
			//[SALES METRICS PORTLET] Proposal $														 						 
			var totpropAmt = nlapiSearchRecord( null , 'customsearch10327');
							
			for (var e=0; totpropAmt && e < totpropAmt.length; e++) 
			{		
				if(salesMetricObj[totpropAmt[e].getValue('salesrep', null,'group')]){	
				
					salesMetricObj[totpropAmt[e].getValue('salesrep',null,'group')]['totalpropsmrr'] = totpropAmt[e].getValue('custbody_sum_mrr', null,'sum');						
				}					
			}				
//--------------------------------------------------------------------------------------------------------------------
			
			//[LIVE SALES METRICS PORTLET] Opportunities converted to Proposals	
		
			var oppsConv = nlapiSearchRecord(null, 'customsearch11275');
							
			for (var f=0; oppsConv && f < oppsConv.length; f++) 
			{		
				if(salesMetricObj[oppsConv[f].getValue('salesrep', null,'group')]){	
				
					salesMetricObj[oppsConv[f].getValue('salesrep',null,'group')]['totalotop'] = oppsConv[f].getValue('internalid', null,'count');						
				}						
			}				

			//[SALES METRICS PORTLET] Opportunities Lost	
							  						  						  						
			var oppsLoss = nlapiSearchRecord(null, 'customsearch11277');
							
			for (var g=0; oppsLoss && g < oppsLoss.length; g++) 
			{		
				if(salesMetricObj[oppsLoss[g].getValue('salesrep', null,'group')]){	
				
					salesMetricObj[oppsLoss[g].getValue('salesrep',null,'group')]['totaloppslost'] = oppsLoss[g].getValue('internalid', null,'count');						
				}						
			}							
												
			//[SALES METRICS PORTLET] Proposals Won							
			var avgOpp = nlapiSearchRecord(null, 'customsearch11277');				
									
			for (var j=0; avgOpp && j < avgOpp.length; j++) 
			{		
				if(salesMetricObj[avgOpp[j].getValue('salesrep', null,'group')]){	
				
					salesMetricObj[avgOpp[j].getValue('salesrep',null,'group')]['totalpropswon'] = avgOpp[j].getValue('internalid', null,'count');						
				}						
			}				
					
			//[SALES METRICS PORTLET] Proposals Lost
		
			var propLoss = nlapiSearchRecord(null, 'customsearch11278');
							
			for (var k=0; propLoss && k < propLoss.length; k++) 
			{		
				if(salesMetricObj[propLoss[k].getValue('salesrep', null,'group')] ){					
					salesMetricObj[propLoss[k].getValue('salesrep',null,'group')]['totalpropslost'] = propLoss[k].getValue('internalid', null,'count');						
				}									
			}				
												
			//[SALES METRICS PORTLET] MRR Weekly
			var weeklyMMR = nlapiSearchRecord(null, 'customsearch10639' );					
										
			for (var l=0; weeklyMMR && l < weeklyMMR.length; l++) 
			{							
				if(salesMetricObj[weeklyMMR[l].getValue('salesrep', null,'group')]){									
					salesMetricObj[weeklyMMR[l].getValue('salesrep',null,'group')]['totalweekmrr'] = weeklyMMR[l].getValue('custbody_comm_mrr',null,'sum');						
				}

			}	
			
			//[SALES METRICS PORTLET] MRR Monthly
			var monthlyMMR = nlapiSearchRecord(null, 'customsearch10784' );					
										
			for (var l=0; monthlyMMR && l < monthlyMMR.length; l++) 
			{							
				if(salesMetricObj[monthlyMMR[l].getValue('salesrep', null,'group')]){									
					salesMetricObj[monthlyMMR[l].getValue('salesrep',null,'group')]['totalmonthmrr'] = monthlyMMR[l].getValue('custbody_comm_mrr',null,'sum');						
				}

			}			
							
				
			//[SALES METRICS PORTLET] MRR Weekly Approved	
			
			var weekApprvd = nlapiSearchRecord(null, 'customsearch10778' );					
										
			for (var m=0; weekApprvd && m < weekApprvd.length; m++) 
			{							
				if(salesMetricObj[weekApprvd[m].getValue('salesrep', null,'group')]){									
					salesMetricObj[weekApprvd[m].getValue('salesrep',null,'group')]['wklyapprvd'] = weekApprvd[m].getValue('custbody_comm_mrr',null,'sum');						
				}

			}	

			//[SALES METRICS PORTLET] MRR Monthly Approved	
			var monthApprvd = nlapiSearchRecord(null, 'customsearch10779');	
							
			for (var n=0; monthApprvd && n < monthApprvd.length; n++) 
			{		
				if(salesMetricObj[monthApprvd[n].getValue('salesrep',null,'group')]){		
					salesMetricObj[monthApprvd[n].getValue('salesrep',null,'group')]['mnthlyapprvd'] = monthApprvd[n].getValue('custbody_comm_mrr',null,'sum');
					
				}					
			}
			
		}
		
	
		//Sort the 
		function compare(a,b) {
		  if (a.totalotop > b.totalotop)
			return -1;
		  if (a.totalotop < b.totalotop)
			return 1;
		  return 0;
		}

		salesMetricArray.sort(compare);
				
		//Variable kept in place in case of Download
		var csvHeader = '"Sales Rep","Unqualified Opps","Qualified Opps","Opps Converted to Qualified","Opp $","Total Proposals","Proposal $","Opp.Converted to Proposal",'+
						'"Opps Lost","Proposals Won","Proposals Lost","Weekly MRR", "Monthly MRR",'+
						'"Weekly Approved Orders","Monthly Approved Orders"\n',
			xlsBody = '';
												
		//Define the Total Columns inorder to add up the values											
		var sumTtlUnqOpp = 0,
			sumTtlOpps = 0,
			sumOppsToQual = 0,
			sumOppsMMR = 0,
			sumTotalProps = 0,
			sumPropsMMR = 0,
			sumOtoP = 0,
			sumOppLoss = 0,
			sumPropWon = 0,
			sumPropLoss = 0,
			sumWklyMMR = 0,
			sumMnthMMR = 0,						
			sumWklyAPP = 0,
			sumMnthAPP = 0;
															
		for (var obj=0; salesMetricArray && obj < salesMetricArray.length; obj++)
		{
												
					//Build out CSV Body
			xlsBody += '"'+salesMetricArray[obj].employees+'",'+
					   salesMetricArray[obj].unqualopps+','+			
					   salesMetricArray[obj].totalopps+','+
					   salesMetricArray[obj].oppscnvqual+','+					   
					   salesMetricArray[obj].totaloppsmrr+','+
					   salesMetricArray[obj].totalprops+','+
					   salesMetricArray[obj].totalpropsmrr+','+
					   salesMetricArray[obj].totalotop+','+
					   salesMetricArray[obj].totaloppslost+','+
					   salesMetricArray[obj].totalpropswon+','+
					   salesMetricArray[obj].totalpropslost+','+					   
					   salesMetricArray[obj].totalweekmrr+','+					   
					   salesMetricArray[obj].totalmonthmrr+','+					   					   
					   salesMetricArray[obj].wklyapprvd+','+
					   salesMetricArray[obj].mnthlyapprvd+'\n';	
		
			sumTtlUnqOpp += parseInt(salesMetricArray[obj].unqualopps);	
			sumTtlOpps += parseInt(salesMetricArray[obj].totalopps);				
			sumOppsToQual += parseInt(salesMetricArray[obj].oppscnvqual);	
			
			if(sumOppsMMR == 'NaN')
			{
			sumOppsMMR = '0.00';
			}			
			sumOppsMMR += parseFloat(salesMetricArray[obj].totaloppsmrr);			
			
			sumTotalProps += parseFloat(salesMetricArray[obj].totalprops);
			sumPropsMMR += parseFloat(salesMetricArray[obj].totalpropsmrr);
			sumOtoP += parseFloat(salesMetricArray[obj].totalotop);
			sumOppLoss += parseFloat(salesMetricArray[obj].totaloppslost);
			sumPropWon += parseFloat(salesMetricArray[obj].totalpropswon);
			sumPropLoss += parseFloat(salesMetricArray[obj].totalpropslost);			
			sumWklyMMR += parseFloat(salesMetricArray[obj].totalweekmrr);
			sumMnthMMR += parseFloat(salesMetricArray[obj].totalmonthmrr);						
			sumWklyAPP += parseFloat(salesMetricArray[obj].wklyapprvd);
			sumMnthAPP += parseFloat(salesMetricArray[obj].mnthlyapprvd);		

						
		}
				
				//Add final total line to xlsBody
		xlsBody += '"Total",'+
				   parseInt(sumTtlUnqOpp).toFixed(0)+','+			
				   parseInt(sumTtlOpps).toFixed(0)+','+	
				   parseInt(sumOppsToQual).toFixed(0)+','+					   
				   sumOppsMMR+','+
				   parseInt(sumTotalProps).toFixed(0)+','+
				   sumPropsMMR+','+					   
				   parseInt(sumOtoP).toFixed(0)+','+
				   parseInt(sumOppLoss).toFixed(0)+','+
				   parseInt(sumPropWon).toFixed(0)+','+
				   parseInt(sumPropLoss).toFixed(0)+','+				   
				   sumWklyMMR+','+				   
				   sumMnthMMR+','+				   
				   sumWklyAPP+','+
				   sumMnthAPP;
   

		//Generate Email to Logged in user if download is button is clicked
		if (xlsBody)
		{	
			var date = new Date ();
		
			var csvFileName = 'LIVE_SalesMetricData.csv';		
			var	csvFileObj = nlapiCreateFile(csvFileName, 'CSV', csvHeader + xlsBody);
				
			for(var j=0; smdrs && j < smdrs.length; j++)
			{	
		
				var emailAddy = nlapiLookupField('employee', smdrs[j].getValue('custrecord_wsm_salesrep', null,'group'), 'email', false);	
				
				log('error','Email address', emailAddy);
				
				//We are going to send it out as email
				nlapiSendEmail(
					'-5', 								
					smdrs[j].getValue('custrecord_wsm_salesrep', null,'group'),					
					'LIVE Sales Metric Report for: '+date, 
					csvFileName+' is attached as CSV File', 
					null, 					
					'elijah@audaxium.com', 
					null, 
					csvFileObj, 
					true, 
					null, 
					null
				);
		
				
			}
		
		}
			

		var context = nlapiGetContext();
		nlapiLogExecution('error', 'remaining usage', context.getRemainingUsage());
		
	}
	catch(displayerr)
	{
		log('error','Error Sending Email Distribution', getErrText(displayerr));

	}


}