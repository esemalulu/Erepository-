/**
 * 
 */

var nsform = null;
function campaignMetricDashboardGenerator(req, res)
{
	//DrillDown Types: salesvalue, forecastvalue, weightpipevalue
	var paramDrillType = req.getParameter('custparam_drilltype');
	var paramDrillCampId = req.getParameter('custparam_campid');
	var hideMainNav = true;

	if (paramDrillType && paramDrillType !='csvexport') 
	{
		hideMainNav = false;
	}
	
	//create nsform
	nsform = nlapiCreateForm('Campaign Metrics', hideMainNav);
	nsform.setScript('customscript_ax_cs_campmetrichelper');
	
	//Array that grabs list of unique campiagns
	var campaignlist = new Array();
	var campaignjson = {};
	var campidtoidjson = {};
	//Json of Campaign Categories
	var campcatjson = {};
	//Json of Campaign Audience
	var campaudjson = {};
	
	//request parameters
	var paramCategory = req.getParameter('custpage_campcategory'),
		paramAudience = req.getParameter('custpage_campaudience'),
		paramCampStartDt = req.getParameter('custpage_campstartdate'),
		paramCreateStartDt = req.getParameter('custpage_createstartdd') || '',
		paramCreateEndDt = req.getParameter('custpage_createenddd') || '';
	
	try {
		
		//0. grab list of all campaigns to get ALL Categories and Audiences
		var fcflt = [new nlobjSearchFilter('isinactive', null, 'is','F')];
		var fccol = [new nlobjSearchColumn('internalid'),
		             new nlobjSearchColumn('category'),
		             new nlobjSearchColumn('audience'),
		             new nlobjSearchColumn('campaignid')];
		var fcrs = nlapiSearchRecord('campaign', null, fcflt, fccol);
		for (var fi=0; fi < fcrs.length; fi++) 
		{
			
			//build JSON of all campaign id to internal id
			if (!campidtoidjson[fcrs[fi].getValue('campaignid')]) 
			{
				campidtoidjson[fcrs[fi].getValue('campaignid')] = fcrs[fi].getValue('internalid'); 
			}
			
			//build JSON of all campaign category 
			if (fcrs[fi].getValue('category') && !campcatjson[fcrs[fi].getValue('category')]) 
			{
				campcatjson[fcrs[fi].getValue('category')] = fcrs[fi].getText('category');
			}
			
			//build JSON oof all audience
			if (fcrs[fi].getValue('audience') && !campaudjson[fcrs[fi].getValue('audience')]) 
			{
				campaudjson[fcrs[fi].getValue('audience')] = fcrs[fi].getText('audience');
			}
		}
		
		//------------------------------------------------------------------------------------------
		
		//1. grab list of all campaigns
		var cflt = [new nlobjSearchFilter('isinactive', null, 'is','F')];
		
		//Add in Filter to display Specific Campaign ONLY 
		if (paramCategory) 
		{
			cflt.push(new nlobjSearchFilter('category', null, 'anyof',paramCategory));
		}
		
		if (paramAudience) 
		{
			cflt.push(new nlobjSearchFilter('audience', null, 'anyof',paramAudience));
		}
		
		if (paramCampStartDt) 
		{
			//5/2/2015 - Request to be changed to onorafter.
			//			 Client wants to see ALL campaign start date on and after the start date they specified.
			cflt.push(new nlobjSearchFilter('startdate', null, 'onorafter',paramCampStartDt));
		}
		
		var ccol = [new nlobjSearchColumn('internalid'),
		            new nlobjSearchColumn('title').setSort(),
		            new nlobjSearchColumn('campaignid'),
		            new nlobjSearchColumn('startdate'),
		            new nlobjSearchColumn('enddate'),
		            new nlobjSearchColumn('basecost'),
		            new nlobjSearchColumn('cost'),
		            new nlobjSearchColumn('category'),
		            new nlobjSearchColumn('owner'),
		            new nlobjSearchColumn('expectedrevenue'),
		            new nlobjSearchColumn('audience')];
		
		var crs = nlapiSearchRecord('campaign', null, cflt, ccol);
		//Check for result and populate campaignlist and campaignjson
		for (var i=0; crs && i < crs.length; i++) 
		{
						
			campaignjson[crs[i].getValue('internalid')]= {
				"title":crs[i].getValue('title'),
				"campaignid":crs[i].getValue('campaignid'),
				"startdate":crs[i].getValue('startdate'),
				"enddate":crs[i].getValue('enddate'),
				"basecost":crs[i].getValue('basecost')?parseFloat(crs[i].getValue('basecost')):0.0,
				"totalcost":crs[i].getValue('cost'),
				"categoryid":crs[i].getValue('category'),
				"categorytext":crs[i].getText('category'),
				"ownerid":crs[i].getValue('owner'),
				"ownertext":crs[i].getText('owner'),
				"expectedrevenue":crs[i].getValue('expectedrevenue'),
				"audienceid":crs[i].getValue('audience'),
				"audiencetext":crs[i].getText('audience'),
				"grosscontacts":"0",
				"newcontacts":"0",
				"newcompanies":"0",
				"newpartners":"0",
				"alltype":"0",
				"hipvalue":"0.0",
				"forecastvalue":"0.0",
				"weightedpipelinevalue":"0.0",
				"salesvalue":"0.0"
			};
				
			campaignlist.push(crs[i].getValue('internalid'));
		}
		
		//TODO: Run series of summary saved search to grab values for each metrics
		if (campaignlist.length > 0) 
		{
			//Sales Value - Make sure End User field is NOT Empty and Campaign Lead Source is matched against End Users' Lead Source
			var svSoStatuses = ['SalesOrd:A','SalesOrd:B','SalesOrd:D','SalesOrd:E','SalesOrd:F','SalesOrd:G'];
			var svflt = [new nlobjSearchFilter('custbody_enduser', null, 'isnotempty',''),
			             new nlobjSearchFilter('status', null, 'anyof',svSoStatuses),
			             new nlobjSearchFilter('mainline',null,'is','T'),
			             new nlobjSearchFilter('leadsource','custbody_enduser','anyof',campaignlist)];
			
			//10/30/2015 - Add in End User creation date Filter if provided
			if (paramCreateStartDt && paramCreateEndDt)
			{
				svflt.push(
					new nlobjSearchFilter(
						'datecreated',
						'custbody_enduser',
						'within', 
						paramCreateStartDt, 
						paramCreateEndDt
					)
				);
			}
			
			var svcol = [new nlobjSearchColumn('leadsource','custbody_enduser','group').setSort(),
			             new nlobjSearchColumn('amount',null,'sum')];
			
			//Create Ad-Hoc Saved Search and redirect the Popup window to result page.
			if (paramDrillType == 'salesvalue') {
				//create AddHoc search and redirect the SL
				var svdflt = [new nlobjSearchFilter('custbody_enduser', null, 'isnotempty',''),
				              new nlobjSearchFilter('status', null, 'anyof',svSoStatuses),
				              new nlobjSearchFilter('mainline',null,'is','T'),
				              new nlobjSearchFilter('leadsource','custbody_enduser','anyof',paramDrillCampId)];
				
				if (paramCreateStartDt && paramCreateEndDt)
				{
					svdflt.push(
						new nlobjSearchFilter(
							'datecreated',
							'custbody_enduser',
							'within', 
							paramCreateStartDt, 
							paramCreateEndDt
						)
					);
				}
				
				//Drill down search will NOT summarize the data
				var svdcol = [new nlobjSearchColumn('custbody_enduser'),
				              new nlobjSearchColumn('leadsource','custbody_enduser').setSort(),
				              new nlobjSearchColumn('datecreated','custbody_enduser'),
				              new nlobjSearchColumn('entity'),
				              new nlobjSearchColumn('type'),
				              new nlobjSearchColumn('status'),
				              new nlobjSearchColumn('trandate'),
				              new nlobjSearchColumn('tranid'),
				              new nlobjSearchColumn('amount')];
				var svsearch = nlapiCreateSearch('transaction', svdflt, svdcol);
				svsearch.setRedirectURLToSearchResults();
				return;
				
			} else {
				var svrs = nlapiSearchRecord('transaction', null, svflt, svcol);
				for (var sv=0; svrs && sv < svrs.length; sv++) {
					//log('debug','Campiagn Sales Amount', svrs[sv].getText('leadsource','custbody_enduser','group')+': '+svrs[sv].getValue('amount',null,'sum'));
					if (campaignjson[svrs[sv].getValue('leadsource','custbody_enduser','group')]) {
						campaignjson[svrs[sv].getValue('leadsource','custbody_enduser','group')]['salesvalue'] = svrs[sv].getValue('amount',null,'sum');
					}
				}
			}
			
			//Added 6/3/2016 - Request to add Total Historical Pipeline
			//Total Historical Pipeline
			//- Types: Opportunity
			//- End User is NOT Empty and Campaign matches End Users' Lead Source
			//- Use Amount 
			
			var hipTrxTypes = ['Opprtnty'];
			var hipflt = [new nlobjSearchFilter('type', null, 'anyof',hipTrxTypes),
			              new nlobjSearchFilter('mainline',null,'is','T'),
			              new nlobjSearchFilter('leadsource','custbody_enduser','anyof',campaignlist)];
			
			if (paramCreateStartDt && paramCreateEndDt)
			{
				hipflt.push(
					new nlobjSearchFilter(
						'datecreated',
						'custbody_enduser',
						'within', 
						paramCreateStartDt, 
						paramCreateEndDt
					)
				);
			}
			
			var hipcol = [new nlobjSearchColumn('leadsource','custbody_enduser','group').setSort(),
			              new nlobjSearchColumn('projectedamount', null,'sum')];
			
			//Create Ad-Hoc Saved Search and redirect the Popup window to result page.
			if (paramDrillType == 'historicalpipeline') {
				//create AddHoc search and redirect the SL
				var hipdflt = [new nlobjSearchFilter('type', null, 'anyof',hipTrxTypes),
					           new nlobjSearchFilter('mainline',null,'is','T'),
					           new nlobjSearchFilter('leadsource','custbody_enduser','anyof',paramDrillCampId)];
				
				//10/30/2015 - Add in End User creation date Filter if provided
				if (paramCreateStartDt && paramCreateEndDt)
				{
					hipdflt.push(
						new nlobjSearchFilter(
							'datecreated',
							'custbody_enduser',
							'within', 
							paramCreateStartDt, 
							paramCreateEndDt
						)
					);
				}
				
				//Drill down search will NOT summarize the data
				var hipdcol = [new nlobjSearchColumn('custbody_enduser'),
				               new nlobjSearchColumn('leadsource','custbody_enduser').setSort(),
				               new nlobjSearchColumn('datecreated','custbody_enduser'),
				               new nlobjSearchColumn('entity'),
				               new nlobjSearchColumn('type'),
				               new nlobjSearchColumn('status'),
				               new nlobjSearchColumn('trandate'),
				               new nlobjSearchColumn('tranid'),
				               new nlobjSearchColumn('projectedamount')];
				var hipsearch = nlapiCreateSearch('transaction', hipdflt, hipdcol);
				hipsearch.setRedirectURLToSearchResults();
				return;
				
			} else {
			
				var hipvrs = nlapiSearchRecord('transaction', null,hipflt, hipcol);
				for (var hipv=0; hipvrs && hipv < hipvrs.length; hipv++) {
					if (campaignjson[hipvrs[hipv].getValue('leadsource','custbody_enduser','group')]) {
						campaignjson[hipvrs[hipv].getValue('leadsource','custbody_enduser','group')]['hipvalue'] = hipvrs[hipv].getValue('projectedamount', null,'sum');
					}
					
					log('debug','Adding hipv', hipvrs[hipv].getValue('projectedamount', null,'sum'));
				}
			}
			
			//Forecast Value
			//- Types: Sales order, Opportunity and Quote
			//- Status: Sales Order:Pending Billing/Partially Fulfilled, Sales Order:Pending Billing, Sales Order:Partially Fulfilled, Sales Order:Pending Approval, Sales Order:Pending Fulfillment, 
			//			Sales Order:Billed
			//			Opportunity:Issued Estimate, Opportunity:In Progress
			//			Quote:Open
			//- End User is NOT Empty and Campaign matches End Users' Lead Source
			//- Use Amount 
			
			//Request from Karen/Client 5/29/2015
			//INCLUDE Sales Order Billed as well 
			var fvTrxTypes = ['Opprtnty','Estimate','SalesOrd'];
			
			//Mod Request 6/6/2017
			//Change the filter to ONLY pull data from Opportunity
			//var fvTrxStatuses = ['SalesOrd:F','SalesOrd:D','SalesOrd:A','SalesOrd:B','SalesOrd:G','Opprtnty:B','Opprtnty:A','Estimate:A'];
			var fvTrxStatuses = ['Opprtnty:B','Opprtnty:A'];
			var fvflt = [new nlobjSearchFilter('type', null, 'anyof',fvTrxTypes),
			             new nlobjSearchFilter('status', null, 'anyof', fvTrxStatuses),
			             new nlobjSearchFilter('mainline',null,'is','T'),
			             //9/16/2015 - Remove forecast type of ommitted
			             new nlobjSearchFilter('forecasttype', null, 'noneof','0'),
			             new nlobjSearchFilter('leadsource','custbody_enduser','anyof',campaignlist)];
			
			//10/30/2015 - Add in End User creation date Filter if provided
			if (paramCreateStartDt && paramCreateEndDt)
			{
				fvflt.push(
					new nlobjSearchFilter(
						'datecreated',
						'custbody_enduser',
						'within', 
						paramCreateStartDt, 
						paramCreateEndDt
					)
				);
			}
			
			var fvFormulaCol = new nlobjSearchColumn('formulanumeric', null, 'sum');
			fvFormulaCol.setFormula("case when {type} = 'Opportunity' then {projectedamount} else {amount} end");
			
			var fvcol = [new nlobjSearchColumn('leadsource','custbody_enduser','group').setSort(),
			             fvFormulaCol];
			
						 //Use project value if Opportunity otherwise use amount?
						 //new nlobjSearchColumn('amount',null,'sum')];
			
			//Create Ad-Hoc Saved Search and redirect the Popup window to result page.
			if (paramDrillType == 'forecastvalue') {
				//create AddHoc search and redirect the SL
				var fvdflt = [new nlobjSearchFilter('type', null, 'anyof',fvTrxTypes),
					          new nlobjSearchFilter('status', null, 'anyof', fvTrxStatuses),
					          new nlobjSearchFilter('mainline',null,'is','T'),
					          new nlobjSearchFilter('leadsource','custbody_enduser','anyof',paramDrillCampId)];
				
				//10/30/2015 - Add in End User creation date Filter if provided
				if (paramCreateStartDt && paramCreateEndDt)
				{
					fvdflt.push(
						new nlobjSearchFilter(
							'datecreated',
							'custbody_enduser',
							'within', 
							paramCreateStartDt, 
							paramCreateEndDt
						)
					);
				}
				
				//Drill down search will NOT summarize the data
				var fvdcol = [new nlobjSearchColumn('custbody_enduser'),
				              new nlobjSearchColumn('leadsource','custbody_enduser').setSort(),
				              new nlobjSearchColumn('datecreated','custbody_enduser'),
				              new nlobjSearchColumn('entity'),
				              new nlobjSearchColumn('type'),
				              new nlobjSearchColumn('status'),
				              new nlobjSearchColumn('trandate'),
				              new nlobjSearchColumn('tranid'),
				              new nlobjSearchColumn('amount'),
				              new nlobjSearchColumn('projectedamount')];
				var fvsearch = nlapiCreateSearch('transaction', fvdflt, fvdcol);
				fvsearch.setRedirectURLToSearchResults();
				return;
				
			} else {
			
				var fvrs = nlapiSearchRecord('transaction', null,fvflt, fvcol);
				for (var fv=0; fvrs && fv < fvrs.length; fv++) {
					if (campaignjson[fvrs[fv].getValue('leadsource','custbody_enduser','group')]) {
						campaignjson[fvrs[fv].getValue('leadsource','custbody_enduser','group')]['forecastvalue'] = fvrs[fv].getValue(fvFormulaCol);
					}
				}
			}
			
			//Weighted Pipeline Value
			//- Types: Opportunity and Quote
			//- Status: Opportunity:Issued Estimate, Opportunity:In Progress
			//			Quote:Open
			//- End User is NOT Empty and Campaign matches End Users' Lead Source
			//- Use Amount 
			var wvTrxTypes = ['Opprtnty','Estimate','SalesOrd'];
			var wvTrxStatuses = ['Opprtnty:B','Opprtnty:A','Estimate:A'];
			var wvflt = [new nlobjSearchFilter('type', null, 'anyof',wvTrxTypes),
			             new nlobjSearchFilter('status', null, 'anyof', wvTrxStatuses),
			             new nlobjSearchFilter('mainline',null,'is','T'),
			             new nlobjSearchFilter('leadsource','custbody_enduser','anyof',campaignlist),
			             new nlobjSearchFilter('expectedclosedate', null, 'onorafter','today')];
			
			//10/30/2015 - Add in End User creation date Filter if provided
			if (paramCreateStartDt && paramCreateEndDt)
			{
				wvflt.push(
					new nlobjSearchFilter(
						'datecreated',
						'custbody_enduser',
						'within', 
						paramCreateStartDt, 
						paramCreateEndDt
					)
				);
			}
			
			var wvFormulaCol = new nlobjSearchColumn('formulanumeric', null, 'sum');
			wvFormulaCol.setFormula("case when {type} = 'Opportunity' then {probability} * {projectedamount} else {probability} * {amount} end");
			wvFormulaCol.setFunction('roundToTenths');
			
			var wvcol = [new nlobjSearchColumn('leadsource','custbody_enduser','group').setSort(),
				         wvFormulaCol];
			
			//Create Ad-Hoc Saved Search and redirect the Popup window to result page.
			if (paramDrillType == 'weightpipevalue') {
				
				var wvdflt = [new nlobjSearchFilter('type', null, 'anyof',wvTrxTypes),
				              new nlobjSearchFilter('status', null, 'anyof', wvTrxStatuses),
				              new nlobjSearchFilter('mainline',null,'is','T'),
				              new nlobjSearchFilter('leadsource','custbody_enduser','anyof',paramDrillCampId),
				              new nlobjSearchFilter('expectedclosedate', null, 'onorafter','today')];
				
				//10/30/2015 - Add in End User creation date Filter if provided
				if (paramCreateStartDt && paramCreateEndDt)
				{
					wvdflt.push(
						new nlobjSearchFilter(
							'datecreated',
							'custbody_enduser',
							'within', 
							paramCreateStartDt, 
							paramCreateEndDt
						)
					);
				}
				
				var wvdFormulaCol = new nlobjSearchColumn('formulanumeric');
				wvdFormulaCol.setFormula("case when {type} = 'Opportunity' then {probability} * {projectedamount} else {probability} * {amount} end");
				wvdFormulaCol.setFunction('roundToTenths');
				
				var wvdcol = [new nlobjSearchColumn('custbody_enduser'),
				              new nlobjSearchColumn('leadsource','custbody_enduser').setSort(),
				              new nlobjSearchColumn('datecreated','custbody_enduser'),
				              new nlobjSearchColumn('entity'),
				              new nlobjSearchColumn('type'),
				              new nlobjSearchColumn('status'),
				              new nlobjSearchColumn('trandate'),
				              new nlobjSearchColumn('tranid'),
				              new nlobjSearchColumn('amount'),
				              new nlobjSearchColumn('projectedamount'),
				              new nlobjSearchColumn('probability'),
				              wvdFormulaCol];
					         
				var wvdsearch = nlapiCreateSearch('transaction', wvdflt, wvdcol);
				wvdsearch.setRedirectURLToSearchResults();
				return;
				
			} else {
				var wvrs = nlapiSearchRecord('transaction', null,wvflt, wvcol);
				for (var wv=0; wvrs && wv < wvrs.length; wv++) {
					if (campaignjson[wvrs[wv].getValue('leadsource','custbody_enduser','group')]) {
						campaignjson[wvrs[wv].getValue('leadsource','custbody_enduser','group')]['weightedpipelinevalue'] = wvrs[wv].getValue(wvFormulaCol);
					}
				}
			}

			//Company Count
			//- Types: Customer Search. 
			//- Status: Inactive = False, Lead Source = Campaign selected.
			//- INCLUDES All Stages that is Lead Source set.
			//	INCLUDES Both Persona AND Company TYpes (is person)
			//	INCLUDES All Stages (Lead, Prospect and Customer)
			//	DOES NOT INCLUDE Inactive records
			//
			//7/15/2015 - Add in filter for Customer Type of NONE or End User
			var compcntflt = [new nlobjSearchFilter('isinactive', null, 'is','F'),
			                  new nlobjSearchFilter('custentitycustomer_type', null, 'anyof',['@NONE@','2']),
			                  new nlobjSearchFilter('leadsource',null,'anyof',campaignlist)];
			
			//10/30/2015 - Add in End User creation date Filter if provided
			if (paramCreateStartDt && paramCreateEndDt)
			{
				compcntflt.push(
					new nlobjSearchFilter(
						'datecreated',
						null,
						'within', 
						paramCreateStartDt, 
						paramCreateEndDt
					)
				);	
			}
			
			var compcntcol = [new nlobjSearchColumn('leadsource',null,'group').setSort(),
			                  new nlobjSearchColumn('internalid',null,'count')];
			
			//Create Ad-Hoc Saved Search and redirect the Popup window to result page.
			if (paramDrillType == 'companycount') {
				//create AddHoc search and redirect the SL
				var compcntdflt = [new nlobjSearchFilter('isinactive', null, 'is','F'),
				                   new nlobjSearchFilter('custentitycustomer_type', null, 'anyof',['@NONE@','2']),
					               new nlobjSearchFilter('leadsource',null,'anyof',paramDrillCampId)];
				
				//10/30/2015 - Add in End User creation date Filter if provided
				if (paramCreateStartDt && paramCreateEndDt)
				{
					compcntdflt.push(
						new nlobjSearchFilter(
							'datecreated',
							null,
							'within', 
							paramCreateStartDt, 
							paramCreateEndDt
						)
					);	
				}
				
				//Drill down search will NOT summarize the data
				var compcntdcol = [new nlobjSearchColumn('entityid').setSort(),
				                   new nlobjSearchColumn('datecreated'),
				                   new nlobjSearchColumn('isperson'),
				                   new nlobjSearchColumn('entitystatus'),
				                   new nlobjSearchColumn('stage'),
				                   new nlobjSearchColumn('leadsource')];
				var compcntdsearch = nlapiCreateSearch('customer', compcntdflt, compcntdcol);
				compcntdsearch.setRedirectURLToSearchResults();
				return;
				
			} else {
			
				var compcntrs = nlapiSearchRecord('customer', null,compcntflt, compcntcol);
				for (var compcnt=0; compcntrs && compcnt < compcntrs.length; compcnt++) {
					if (campaignjson[compcntrs[compcnt].getValue('leadsource',null,'group')]) {
						campaignjson[compcntrs[compcnt].getValue('leadsource',null,'group')]['newcompanies'] = compcntrs[compcnt].getValue('internalid',null,'count');
					}
				}
			}
			
			//Partner Count
			//- Types: Customer Search. 
			//- Status: Inactive = False, Lead Source = Campaign selected.
			//- INCLUDES All Stages that is Lead Source set.
			//	INCLUDES Both Persona AND Company TYpes (is person)
			//	INCLUDES All Stages (Lead, Prospect and Customer)
			//	DOES NOT INCLUDE Inactive records
			//
			//7/15/2015 - Add in filter for Customer Type of Partner
			var ptrncntflt = [new nlobjSearchFilter('isinactive', null, 'is','F'),
			                  new nlobjSearchFilter('custentitycustomer_type', null, 'anyof',['1']), //Partner
			                  new nlobjSearchFilter('leadsource',null,'anyof',campaignlist)];
			
			//10/30/2015 - Add in End User creation date Filter if provided
			if (paramCreateStartDt && paramCreateEndDt)
			{
				ptrncntflt.push(
					new nlobjSearchFilter(
						'datecreated',
						null,
						'within', 
						paramCreateStartDt, 
						paramCreateEndDt
					)
				);	
			}
			
			var ptrncntcol = [new nlobjSearchColumn('leadsource',null,'group').setSort(),
			                  new nlobjSearchColumn('internalid',null,'count')];
			
			//Create Ad-Hoc Saved Search and redirect the Popup window to result page.
			if (paramDrillType == 'partnercount') {
				//create AddHoc search and redirect the SL
				var ptrncntdflt = [new nlobjSearchFilter('isinactive', null, 'is','F'),
				                   new nlobjSearchFilter('custentitycustomer_type', null, 'anyof',['1']),
					               new nlobjSearchFilter('leadsource',null,'anyof',paramDrillCampId)];
				
				//10/30/2015 - Add in End User creation date Filter if provided
				if (paramCreateStartDt && paramCreateEndDt)
				{
					ptrncntdflt.push(
						new nlobjSearchFilter(
							'datecreated',
							null,
							'within', 
							paramCreateStartDt, 
							paramCreateEndDt
						)
					);	
				}
				
				//Drill down search will NOT summarize the data
				var ptrncntdcol = [new nlobjSearchColumn('entityid').setSort(),
				                   new nlobjSearchColumn('datecreated'),
				                   new nlobjSearchColumn('isperson'),
				                   new nlobjSearchColumn('entitystatus'),
				                   new nlobjSearchColumn('stage'),
				                   new nlobjSearchColumn('leadsource')];
				var ptrncntdsearch = nlapiCreateSearch('customer', ptrncntdflt, ptrncntdcol);
				ptrncntdsearch.setRedirectURLToSearchResults();
				return;
				
			} else {
			
				var ptrncntrs = nlapiSearchRecord('customer', null,ptrncntflt, ptrncntcol);
				for (var ptrncnt=0; ptrncntrs && ptrncnt < ptrncntrs.length; ptrncnt++) {
					if (campaignjson[ptrncntrs[ptrncnt].getValue('leadsource',null,'group')]) {
						campaignjson[ptrncntrs[ptrncnt].getValue('leadsource',null,'group')]['newpartners'] = ptrncntrs[ptrncnt].getValue('internalid',null,'count');
					}
				}
			}
			
			//3/8/2016 - Client requested to have additional column added to show ALL Customer types count
			//ALL Customer Type Count
			//- Types: Customer Search. 
			//- Status: Inactive = False, Lead Source = Campaign selected.
			//- INCLUDES All Stages that is Lead Source set.
			//	INCLUDES Both Persona AND Company TYpes (is person)
			//	INCLUDES All Stages (Lead, Prospect and Customer)
			//	DOES NOT INCLUDE Inactive records
			//
			var allncntflt = [new nlobjSearchFilter('isinactive', null, 'is','F'),
			                  new nlobjSearchFilter('leadsource',null,'anyof',campaignlist)];
			
			//10/30/2015 - Add in End User creation date Filter if provided
			if (paramCreateStartDt && paramCreateEndDt)
			{
				allncntflt.push(
					new nlobjSearchFilter(
						'datecreated',
						null,
						'within', 
						paramCreateStartDt, 
						paramCreateEndDt
					)
				);	
			}
			
			var allncntcol = [new nlobjSearchColumn('leadsource',null,'group').setSort(),
			                  new nlobjSearchColumn('internalid',null,'count')];
			
			//Create Ad-Hoc Saved Search and redirect the Popup window to result page.
			if (paramDrillType == 'alltypecount') {
				//create AddHoc search and redirect the SL
				var allncntdflt = [new nlobjSearchFilter('isinactive', null, 'is','F'),
					               new nlobjSearchFilter('leadsource',null,'anyof',paramDrillCampId)];
				
				//10/30/2015 - Add in End User creation date Filter if provided
				if (paramCreateStartDt && paramCreateEndDt)
				{
					allncntdflt.push(
						new nlobjSearchFilter(
							'datecreated',
							null,
							'within', 
							paramCreateStartDt, 
							paramCreateEndDt
						)
					);	
				}

				//Drill down search will NOT summarize the data
				var allncntdcol = [new nlobjSearchColumn('entityid').setSort(),
				                   new nlobjSearchColumn('datecreated'),
				                   new nlobjSearchColumn('isperson'),
				                   new nlobjSearchColumn('custentitycustomer_type'),
				                   new nlobjSearchColumn('entitystatus'),
				                   new nlobjSearchColumn('stage'),
				                   new nlobjSearchColumn('leadsource')];
				var allncntdsearch = nlapiCreateSearch('customer', allncntdflt, allncntdcol);
				allncntdsearch.setRedirectURLToSearchResults();
				return;
				
			} else {
			
				var allncntrs = nlapiSearchRecord('customer', null,allncntflt, allncntcol);
				for (var allncnt=0; allncntrs && allncnt < allncntrs.length; allncnt++) {
					if (campaignjson[allncntrs[allncnt].getValue('leadsource',null,'group')]) {
						campaignjson[allncntrs[allncnt].getValue('leadsource',null,'group')]['alltype'] = allncntrs[allncnt].getValue('internalid',null,'count');
					}
				}
			}
			
			//Contact Count
			//- Types: Contact Search. 
			//- Status: Inactive = False, Lead Source (contactsource) = Campaign selected.
			//	DOES NOT INCLUDE Inactive records
			var ctcntflt = [new nlobjSearchFilter('isinactive', null, 'is','F'),
			                new nlobjSearchFilter('contactsource',null,'anyof',campaignlist)];
			
			//companyprimary
			//10/30/2015 - Add in End User creation date Filter if provided
			if (paramCreateStartDt && paramCreateEndDt)
			{
				ctcntflt.push(
					new nlobjSearchFilter(
						'datecreated',
						'companyprimary',
						'within', 
						paramCreateStartDt, 
						paramCreateEndDt
					)
				);	
			}
			
			var ctcntcol = [new nlobjSearchColumn('contactsource',null,'group').setSort(),
			                new nlobjSearchColumn('internalid',null,'count')];
			
			//Create Ad-Hoc Saved Search and redirect the Popup window to result page.
			if (paramDrillType == 'contactcount') {
				//create AddHoc search and redirect the SL
				var ctcntdflt = [new nlobjSearchFilter('isinactive', null, 'is','F'),
					             new nlobjSearchFilter('contactsource',null,'anyof',paramDrillCampId)];
				
				//companyprimary
				//10/30/2015 - Add in End User creation date Filter if provided
				if (paramCreateStartDt && paramCreateEndDt)
				{
					ctcntdflt.push(
						new nlobjSearchFilter(
							'datecreated',
							'companyprimary',
							'within', 
							paramCreateStartDt, 
							paramCreateEndDt
						)
					);	
				}
				
				//Drill down search will NOT summarize the data
				var ctcntdcol = [new nlobjSearchColumn('entityid').setSort(),
				                   new nlobjSearchColumn('company'),
				                   new nlobjSearchColumn('datecreated','companyPrimary'),
				                   new nlobjSearchColumn('title'),
				                   new nlobjSearchColumn('contactsource'),
				                   new nlobjSearchColumn('subsidiary')];
				var ctcntdsearch = nlapiCreateSearch('contact', ctcntdflt, ctcntdcol);
				ctcntdsearch.setRedirectURLToSearchResults();
				return;
				
			} else {
			
				var ctcntrs = nlapiSearchRecord('contact', null,ctcntflt, ctcntcol);
				for (var ctcnt=0; ctcntrs && ctcnt < ctcntrs.length; ctcnt++) {
					if (campaignjson[ctcntrs[ctcnt].getValue('contactsource',null,'group')]) {
						campaignjson[ctcntrs[ctcnt].getValue('contactsource',null,'group')]['newcontacts'] = ctcntrs[ctcnt].getValue('internalid',null,'count');
					}
				}
			}
			
			//Gross Contacts Count
			//- Types: Contact Search. 
			//- Status: Inactive = False, Lead Source = Campaign selected and Campaign Response Count > 0.
			//campidtoidjson
			var grosscntflt = [new nlobjSearchFilter('isinactive', null, 'is','F'),
							   //Filter removed on 11/3/2015 due to potential defect in NS
							   //This feature only returned those campaign responses that had "RESPONDED"
							   //11/19/2015 - Found that this defect is ONLY happening in Sandbox.
			                   new nlobjSearchFilter('internalid','campaignResponse','anyof',campaignlist),
			                   new nlobjSearchFilter('responded','campaignresponsecount','greaterthan',0)];
			
			//companyprimary
			//10/30/2015 - Add in End User creation date Filter if provided
			if (paramCreateStartDt && paramCreateEndDt)
			{
				grosscntflt.push(
					new nlobjSearchFilter(
						'datecreated',
						'companyprimary',
						'within', 
						paramCreateStartDt, 
						paramCreateEndDt
					)
				);	
			}
			
			var grosscntcol = [new nlobjSearchColumn('campaignid','campaignResponse','group').setSort(),
			                   new nlobjSearchColumn('internalid',null,'count')];
			
			//Create Ad-Hoc Saved Search and redirect the Popup window to result page.
			if (paramDrillType == 'grosscount') {
				//create AddHoc search and redirect the SL
				var drillCampId = campaignjson[paramDrillCampId].campaignid;
				log('debug','drillCampId',drillCampId+' // Camp Internal ID: '+paramDrillCampId);
				var grosscntdflt = [new nlobjSearchFilter('isinactive', null, 'is','F'),
				                    new nlobjSearchFilter('campaignid','campaignResponse','is',drillCampId),
									//Filter removed on 11/3/2015 due to potential defect in NS
									//This fiture only returned those campaign responses that had "RESPONDED"
				                    //11/19/2015 - Found that this defect is ONLY happening in Sandbox
									new nlobjSearchFilter('responded','campaignresponsecount','greaterthan',0)];
				
				//companyprimary
				//10/30/2015 - Add in End User creation date Filter if provided
				if (paramCreateStartDt && paramCreateEndDt)
				{
					grosscntdflt.push(
						new nlobjSearchFilter(
							'datecreated',
							'companyprimary',
							'within', 
							paramCreateStartDt, 
							paramCreateEndDt
						)
					);	
				}
				
				//Drill down search will NOT summarize the data
				var grosscntdcol = [new nlobjSearchColumn('entityid').setSort(),
				                    new nlobjSearchColumn('company'),
				                    new nlobjSearchColumn('datecreated'),
				                    new nlobjSearchColumn('campaignid','campaignResponse')];
				var grosscntdsearch = nlapiCreateSearch('contact', grosscntdflt, grosscntdcol);
				grosscntdsearch.setRedirectURLToSearchResults();
				return;
				
			} else {
			
				var grosscntrs = nlapiSearchRecord('contact', null,grosscntflt, grosscntcol);
				for (var grosscnt=0; grosscntrs && grosscnt < grosscntrs.length; grosscnt++) {
					var tempCampaignId = grosscntrs[grosscnt].getValue('campaignid','campaignResponse','group');
					if (tempCampaignId) {
						var tempCampaignInternalId = campidtoidjson[tempCampaignId];
						if (campaignjson[tempCampaignInternalId]) {
							campaignjson[tempCampaignInternalId]['grosscontacts'] = grosscntrs[grosscnt].getValue('internalid',null,'count');
						}
					}
				}
			}
		}
		
		
		
		//--------- Column Definition --------------------
		//[Place Holder]
		//Removed into documentation
		/******************* Column Def HTML ******************/
		var coldefhtml = nsform.addField('custpage_coldef','inlinehtml','',null,null);
		coldefhtml.setLayoutType('outsideabove', null);
		coldefhtml.setDefaultValue('<div style="padding: 10px"><input type="button" id="togglebtn" value="Show Definition" onclick="toggleDef()"/></div>'+
								   '<div id="def" style="display:none">'+
								   '<table width="100%">'+
								   '<tr>'+
								   '<td><b>Calculated Cols</b></td>'+
								   '<td><b>Sales Value</b></td>'+
								   '<td><b>Forecast Value</b></td>'+
								   '<td><b>Weighted Pipeline Value</b></td>'+
								   '<td><b>New Leads (End User and Partners)</b></td>'+
								   '<td><b>New Leads (People)</b></td>'+
								   '<td><b>Gross Contacts</b></td>'+
								   '</tr>'+
								   '<tr>'+
								   //Calculated Fields
								   '<td valign="top">'+
								   '<i>Implemented Def</i><br/>'+
								   'IMPORTANT: Division by 0 will be expressed as 0!!!<br/>'+
								   '<b>CPL:</b> CampCost / ( New Lead (End User) + New Lead (Partners) )<br/>'+
								   '<b>Projected ROI:</b> (Forecast value- Campaign Cost) / Campaign Cost expressed as %<br/>'+
								   '<b>ROI:</b> (Sales Value - Campaign Cost) / Campaign Cost</td>'+
								   //Sales Value
								   '<td valign="top">'+
								   '<i>Implemented Def</i><br/>'+
								   'Campaign matched against End User Lead Source<br/>'+
								   'Sales Order Statuses: Pending Approval, Pending Fulfillment, Partially Fulfilled, Pending Billing/Partially Fulfilled, Pending Billing, Billed<br/><br/>'+
								   '<i>Original Requested Def</i><br/>'+
								   'Sum of Amount. Use All Pending, Approved, Billed Sales Orders. No Invoices Included. No cancelled Sales orders. Sum of Amount</td>'+
								   
								   //Added 6/3/2016 - Historical Pipeline Value
								   '<td valign="top">'+
								   '<i>Implemented Def</i><br/>'+
								   'Campaign matched against End User Lead Source<br/>'+
								   'Showing Projected Amount Value<br/>'+
								   'ALL Opportunity Statuses<br/></td>'+
								   
								   //Forecast Value
								   '<td valign="top">'+
								   '<i>Implemented Def</i><br/>'+
								   'Campaign matched against End User Lead Source<br/>'+
								   'Showing Amount Value<br/>'+
								   //'Sales Order Statuses: Pending Billing/Partially Fulfilled, Pending Billing, Partially Fulfilled, Pending Approval, Pending Fulfillment, Billed<br/>'+
								   'Opportunity Statuses: Issued Estimate, In Progress<br/>'+
								   //'Quote Statuses: Open<br/><br/>'+
								   '<i>Original Requested Def</i><br/>'+
								   'Sum of Amount or Projected Amount. By Company Lead Source; All Transactions; Quote, Opps, Sales Orders<br/>'+
								   '(All sales orders except cancelled) Excluding Won Opps and Processed Quotes. Include Omitted Transactions.</td>'+
								   //Weighted Pipeline Value
								   '<td valign="top">'+
								   '<i>Implemented Def</i><br/>'+
								   'Campaign matched against End User Lead Source<br/>'+
								   'ONLY includes Expected Close Date ON OR AFTER CURRENT DATE<br/>'+
								   'Opportunity Statuses: Issued Estimate, In Progress ({probability} * {projectedamount})<br/>'+
								   'Quote Statuses: Open ({probability} * {amount})<br/><br/>'+
								   '<i>Original Requested Def</i><br/>'+
								   'Use only open opps and quotes.  The value of the opportunity is calculated at Probability * Projected Total.<br/>'+
								   'The Quote will be Probability * Amount.  Opportunities with expected close date in previous periods should not be included</td>'+
								   //New Leads End User, Partner or Total 
								   '<td valign="top">'+
								   '<i>Implemented Def</i><br/>'+
								   'Campaign matched against Customer Record Lead Source<br/>'+
								   'End User: Customer Type of NONE or End User<br/>'+
								   'Partner: Customer Type of Partner<br/>'+
								   'All: All Customer Types<br/>'+
								   'INCLUDES Leads, Prospects, Customers BOTH Individuals and Companies<br/>'+
								   'EXCLUDES Inactive Records and those with NO Lead Sources<br/><br/>'+
								   '<i>Original Requested Def was ONLY for Company - MODIFIED To break into Two Columns (End User and Partner)</i><br/>'+
								   'Count of Company Records by Lead Source. If there is no lead source, <br/>'+
								   'which there should be, then use the first campaign response</td>'+
								   //New Leads People
								   '<td valign="top">'+
								   '<i>Implemented Def</i><br/>'+
								   'Campaign matched against Customer Record Lead Source<br/>'+
								   'Schedule Script runs every 30 min to set Lead Source value based on First Response ONLY if they are missing.<br/><br/>'+
								   '<i>Original Requested Def</i><br/>'+
								   'Count of Contacts - Contact Lead Source. If there is no lead source, which there won\'t be most of the time, then look<br/>'+
								   'for the first campaign response on the contact. This field will need to get shown on the Contact Record.</td>'+
								   //Gross Contacts
								   '<td valign="top">'+
								   '<i>Implemented Def</i><br/>'+
								   'Campaign matched against Contact Record\'s Campaign Response Campaign.<br/>'+
								   'If Contact has Responses for Campaign A, B, C. This Contact will be counted for Each Campaigns. NOT JUST First Response<br/>'+
								   'EXCLUDES Inactive Contact Records<br/><br/>'+
								   '<i>Original Requested Def</i><br/>'+
								   'Count of Contacts - With this as an associated campaign. There are 2 options depending on if Scala implements Suspect Management from Audaxium.<br/>'+
								   'Option 1; contacts with a particular campaign response. Of course, the campaign response will need to exist.<br/>'+
								   'For manually imported and update records, the correct campaign response will need to be created separate from this SOW.<br/>'+
								   'Option 2 . Count of Suspect records with this as an associated campaign source.</td>'+
								   '</tr></table>'+
								   '</div>');

		
		//------------------------------------------------
		
		
		//Filters

		nsform.addFieldGroup('custpage_filteroption', 'Filter Options', null);
		//category filter
		var campcatdd = nsform.addField('custpage_campcategory', 'select', 'Campaign Category', null, 'custpage_filteroption');
		campcatdd.setBreakType('startcol');
		campcatdd.addSelectOption('', '', true);
		for (var ccat in campcatjson) {
			campcatdd.addSelectOption(ccat, campcatjson[ccat], false);
		}
		campcatdd.setDefaultValue(paramCategory);
		
		//audience filter
		var campauddd = nsform.addField('custpage_campaudience', 'select', 'Campaign Audience', null, 'custpage_filteroption');
		campauddd.setBreakType('startcol');
		campauddd.addSelectOption('', '', true);
		for (var caud in campaudjson) {
			campauddd.addSelectOption(caud, campaudjson[caud], false);
		}
		campauddd.setDefaultValue(paramAudience);
		
		//start date filter
		var campstartdd = nsform.addField('custpage_campstartdate', 'date', 'Campaign Start Date', null, 'custpage_filteroption');
		campstartdd.setBreakType('startcol');
		campstartdd.setDefaultValue(paramCampStartDt);
		
		//10/30/2015 - New Filter and changes requested by client.
		//	- Date Range added to allow THIS Tool to look at grab leads 
		//	  based on created date that falls within the range.
		
		var createStartDate = nsform.addField('custpage_createstartdd','date','Lead Creation Start Date', null, 'custpage_filteroption');
		createStartDate.setBreakType('startcol');
		createStartDate.setDefaultValue(paramCreateStartDt);
		
		var createEndDate = nsform.addField('custpage_createenddd','date','Lead Creation End Date', null, 'custpage_filteroption');
		createEndDate.setDefaultValue(paramCreateEndDt);
		
		//Add refresh button
		nsform.addButton('custpage_fltrefresh', 'Apply Filter', 'reloadDashboardSl');
		
		//Add EXPORT Metric to CSV button
		nsform.addButton('custpage_csvexport', 'Export Metrics To CSV','exportcsvSl');
		
		//Build Sublist for display
		var metriclist = nsform.addSubList('custpae_metriclist', 'list', 'Campaign Metrics', null);
		metriclist.addField('custpage_cml_camptitle', 'textarea', 'Campaign Event', null).setDisplayType('inline');
		metriclist.addField('custpage_cml_campcategory', 'textarea', 'Campaign Category', null).setDisplayType('inline');
		metriclist.addField('custpage_cml_yearmonth', 'textarea', 'Year/Month', null).setDisplayType('inline');
		metriclist.addField('custpage_cml_country', 'textarea', 'Country', null).setDisplayType('inline');
		metriclist.addField('custpage_cml_manager', 'textarea', 'Responsible', null).setDisplayType('inline');
		metriclist.addField('custpage_cml_campcost', 'textarea', 'Campaign Cost', null).setDisplayType('inline');
		metriclist.addField('custpage_cml_salesvalue', 'textarea', 'Sales Value', null).setDisplayType('inline');
		metriclist.addField('custpage_cml_hipvalue', 'textarea', 'Historical Pipeline Value', null).setDisplayType('inline');
		metriclist.addField('custpage_cml_forecastvalue', 'textarea', 'Forecast Value', null).setDisplayType('inline');
		metriclist.addField('custpage_cml_wpvalue', 'textarea', 'Weighted Pipeline Value', null).setDisplayType('inline');
		metriclist.addField('custpage_cml_compcntvalue', 'textarea', 'New Leads (End Users)', null).setDisplayType('inline');
		metriclist.addField('custpage_cml_ptrcntvalue', 'textarea', 'New Leads (Partners)', null).setDisplayType('inline');
		metriclist.addField('custpage_cml_allcntvalue', 'textarea', 'New Leads (Total)', null).setDisplayType('inline');
		metriclist.addField('custpage_cml_peoplecntvalue', 'textarea', 'New Leads (People)', null).setDisplayType('inline');
		metriclist.addField('custpage_cml_grosspcntvalue', 'textarea', 'Gross Contacts', null).setDisplayType('inline');
		metriclist.addField('custpage_cml_cpl', 'textarea', 'CPL', null).setDisplayType('inline');
		metriclist.addField('custpage_cml_prjroi', 'currency', 'Projected ROI', null).setDisplayType('inline');
		metriclist.addField('custpage_cml_wprjroi', 'currency', 'Weighted Projected ROI', null).setDisplayType('inline');
		metriclist.addField('custpage_cml_roi', 'currency', 'ROI', null).setDisplayType('inline');
		
		var csvHeader = "Campaign Event, Campaign Category, Country, Year/Month, Responsible, Campaign Cost, Sales Value, Historical Pipeline Value, "+
						"Forecast Value, Weighted Pipeline Value, New Leads (End Users), "+
						"New Leads (Partners), New Leads (All), New Leads (People), Gross Contacts, CPL, Projected ROI, Weighted Projected ROI, ROI\n";
		var csvBody = '';
		
		var mline=1;
		for (var camp in campaignjson) {
			
			var linkToCampaign = nlapiResolveURL('RECORD', 'campaign', camp, 'VIEW');
			var campTitleLink = '<a href="'+linkToCampaign+'" target="_blank">'+campaignjson[camp].title+'</a>';
			var campCostLink = '<a href="'+linkToCampaign+'" target="_blank">'+campaignjson[camp].basecost+'</a>';
			
			metriclist.setLineItemValue('custpage_cml_camptitle', mline, '<h1>'+campTitleLink+'</h1>');
			metriclist.setLineItemValue('custpage_cml_campcategory', mline, '<h1>'+campaignjson[camp].categorytext+'</h1>');
			//turn start date into Year-Month format
			var startyyyymm = '';
			if (campaignjson[camp].startdate) {
				var stdtobj = nlapiStringToDate(campaignjson[camp].startdate);
				startyyyymm = stdtobj.getFullYear()+'-'+(stdtobj.getMonth()+1)+'<br/>['+campaignjson[camp].startdate+']' ;
			}
			
			metriclist.setLineItemValue('custpage_cml_yearmonth', mline, startyyyymm);
			metriclist.setLineItemValue('custpage_cml_country', mline, campaignjson[camp].audiencetext);
			metriclist.setLineItemValue('custpage_cml_manager', mline, campaignjson[camp].ownertext);
			metriclist.setLineItemValue('custpage_cml_campcost', mline, campCostLink);
	
			//custparam_drilltype=salesvalue
			var salesValueLink = nlapiResolveURL('SUITELET','customscript_ax_sl_campmetricdashboard','customdeploy_ax_sl_campmetricdashboard')+
								 //'&ifrmcntnr=T'+
								 '&custparam_drilltype=salesvalue'+
								 '&custparam_campid='+camp;
			
			//10/30/2015 - Add in End User creation date Filter if provided
			if (paramCreateStartDt && paramCreateEndDt)
			{
				salesValueLink +='&custpage_createstartdd='+paramCreateStartDt+
								 '&custpage_createenddd='+paramCreateEndDt;
			}
			
			var salesValueText = '<a href="'+salesValueLink+'" target="_blank">'+parseFloat(campaignjson[camp].salesvalue).toFixed(2)+'</a>';
			
			//Added 6/3/2016 - Historical Pipeline value
			//custparam_drilltype=forecastvalue
			var hipValueLink = nlapiResolveURL('SUITELET','customscript_ax_sl_campmetricdashboard','customdeploy_ax_sl_campmetricdashboard')+
							   '&custparam_drilltype=historicalpipeline'+
								'&custparam_campid='+camp;
			if (paramCreateStartDt && paramCreateEndDt)
			{
				hipValueLink +='&custpage_createstartdd='+paramCreateStartDt+
							   '&custpage_createenddd='+paramCreateEndDt;
			}
			var hipValueLinkText = '<a href="'+hipValueLink+'" target="_blank">'+parseFloat(campaignjson[camp].hipvalue).toFixed(2)+'</a>';
			
			
			
			//custparam_drilltype=forecastvalue
			var forecaseValueLink = nlapiResolveURL('SUITELET','customscript_ax_sl_campmetricdashboard','customdeploy_ax_sl_campmetricdashboard')+
								    //'&ifrmcntnr=T'+
								 	'&custparam_drilltype=forecastvalue'+
								 	'&custparam_campid='+camp;
			//10/30/2015 - Add in End User creation date Filter if provided
			if (paramCreateStartDt && paramCreateEndDt)
			{
				forecaseValueLink +='&custpage_createstartdd='+paramCreateStartDt+
									'&custpage_createenddd='+paramCreateEndDt;
			}
			
			var forecaseValueLinkText = '<a href="'+forecaseValueLink+'" target="_blank">'+parseFloat(campaignjson[camp].forecastvalue).toFixed(2)+'</a>';
			
			//custparam_drilltype=weightpipevalue
			var weightplValueLink = nlapiResolveURL('SUITELET','customscript_ax_sl_campmetricdashboard','customdeploy_ax_sl_campmetricdashboard')+
								    //'&ifrmcntnr=T'+
								 	'&custparam_drilltype=weightpipevalue'+
								 	'&custparam_campid='+camp;
			
			//10/30/2015 - Add in End User creation date Filter if provided
			if (paramCreateStartDt && paramCreateEndDt)
			{
				weightplValueLink+='&custpage_createstartdd='+paramCreateStartDt+
								   '&custpage_createenddd='+paramCreateEndDt;
			}
			
			var weightplValueLinkText = '<a href="'+weightplValueLink+'" target="_blank">'+parseFloat(campaignjson[camp].weightedpipelinevalue).toFixed(2)+'</a>';
			
			//custparam_drilltype=companycount
			var companyCountLink = nlapiResolveURL('SUITELET','customscript_ax_sl_campmetricdashboard','customdeploy_ax_sl_campmetricdashboard')+
								    //'&ifrmcntnr=T'+
								 	'&custparam_drilltype=companycount'+
								 	'&custparam_campid='+camp;
			
			//10/30/2015 - Add in End User creation date Filter if provided
			if (paramCreateStartDt && paramCreateEndDt)
			{
				companyCountLink+='&custpage_createstartdd='+paramCreateStartDt+
			    				  '&custpage_createenddd='+paramCreateEndDt;
			}
			
			var companyCountLinkText = '<a href="'+companyCountLink+'" target="_blank">'+parseInt(campaignjson[camp].newcompanies)+'</a>';
			
			//custparam_drilltype=partnercount
			var partnerCountLink = nlapiResolveURL('SUITELET','customscript_ax_sl_campmetricdashboard','customdeploy_ax_sl_campmetricdashboard')+
								    //'&ifrmcntnr=T'+
								 	'&custparam_drilltype=partnercount'+
								 	'&custparam_campid='+camp;
			
			//10/30/2015 - Add in End User creation date Filter if provided
			if (paramCreateStartDt && paramCreateEndDt)
			{
				partnerCountLink+='&custpage_createstartdd='+paramCreateStartDt+
			    				  '&custpage_createenddd='+paramCreateEndDt;
			}
			
			var partnerCountLinkText = '<a href="'+partnerCountLink+'" target="_blank">'+parseInt(campaignjson[camp].newpartners)+'</a>';
			
			//Added 3/8/2016 - Added Column for ALL Customer Type
			//custparam_drilltype=alltypecount
			var allCountLink = nlapiResolveURL('SUITELET','customscript_ax_sl_campmetricdashboard','customdeploy_ax_sl_campmetricdashboard')+
							   //'&ifrmcntnr=T'+
							   '&custparam_drilltype=alltypecount'+
							   '&custparam_campid='+camp;
			
			//10/30/2015 - Add in End User creation date Filter if provided
			if (paramCreateStartDt && paramCreateEndDt)
			{
				allCountLink+='&custpage_createstartdd='+paramCreateStartDt+
			    			  '&custpage_createenddd='+paramCreateEndDt;
			}
			
			var allCountLinkText = '<a href="'+allCountLink+'" target="_blank">'+parseInt(campaignjson[camp].alltype)+'</a>';
			
			
			//custparam_drilltype=peoplecount
			var peopleCountLink = nlapiResolveURL('SUITELET','customscript_ax_sl_campmetricdashboard','customdeploy_ax_sl_campmetricdashboard')+
								    //'&ifrmcntnr=T'+
								 	'&custparam_drilltype=contactcount'+
								 	'&custparam_campid='+camp;
			
			//10/30/2015 - Add in End User creation date Filter if provided
			if (paramCreateStartDt && paramCreateEndDt)
			{
				peopleCountLink+='&custpage_createstartdd='+paramCreateStartDt+
			    				  '&custpage_createenddd='+paramCreateEndDt;
			}
			
			var peopleCountLinkText = '<a href="'+peopleCountLink+'" target="_blank">'+parseInt(campaignjson[camp].newcontacts)+'</a>';
				
			//custparam_drilltype=grosscount
			var grossCountLink = nlapiResolveURL('SUITELET','customscript_ax_sl_campmetricdashboard','customdeploy_ax_sl_campmetricdashboard')+
								 //'&ifrmcntnr=T'+
								 '&custparam_drilltype=grosscount'+
								 '&custparam_campid='+camp;
			
			//10/30/2015 - Add in End User creation date Filter if provided
			if (paramCreateStartDt && paramCreateEndDt)
			{
				grossCountLink+='&custpage_createstartdd='+paramCreateStartDt+
			    				'&custpage_createenddd='+paramCreateEndDt;
			}
			
			var grossCountLinkText = '<a href="'+grossCountLink+'" target="_blank">'+parseInt(campaignjson[camp].grosscontacts)+'</a>';
			
			metriclist.setLineItemValue('custpage_cml_salesvalue', mline, salesValueText);
			metriclist.setLineItemValue('custpage_cml_hipvalue', mline, hipValueLinkText);
			metriclist.setLineItemValue('custpage_cml_forecastvalue', mline, forecaseValueLinkText);
			metriclist.setLineItemValue('custpage_cml_wpvalue', mline, weightplValueLinkText);
			metriclist.setLineItemValue('custpage_cml_compcntvalue', mline, companyCountLinkText);
			metriclist.setLineItemValue('custpage_cml_ptrcntvalue', mline, partnerCountLinkText);
			//Added 3/8/2016
			metriclist.setLineItemValue('custpage_cml_allcntvalue', mline, allCountLinkText);
			metriclist.setLineItemValue('custpage_cml_peoplecntvalue', mline, peopleCountLinkText);
			metriclist.setLineItemValue('custpage_cml_grosspcntvalue', mline, grossCountLinkText);
			
			//Calculated Fields
			var numNewCompany = parseInt(campaignjson[camp].newcompanies);
			var numCampCost = parseFloat(campaignjson[camp].basecost).toFixed(2);
			var numForecastValue = parseFloat(campaignjson[camp].forecastvalue).toFixed(2);
			var numSalesValue = parseFloat(campaignjson[camp].salesvalue).toFixed(2);
			var numWeightedValue = parseFloat(campaignjson[camp].weightedpipelinevalue).toFixed(2);
			
			var cplvalue = 0;
			if (numNewCompany > 0) {
				//8/12/2015 Frank requested to have the CPL calculated as Camp. Cost / (End User + Partners)
				var numNewPartners = parseInt(campaignjson[camp].newpartners);
				cplvalue = (numCampCost / (numNewCompany+numNewPartners)).toFixed(2);
			}
			
			//(Forecast value- Campaign Cost) / Campaign Cost
			var prjRoi = 0;
			var wprjRoi = 0;
			var roi = 0;
			if (numCampCost > 0) {
				//prjRoi = (((numForecastValue - numCampCost) / numCampCost) * 100).toFixed(1) + ' %';
				//7/15/2015 - Request to have it as dollar value not %
				prjRoi = (numForecastValue - numCampCost) / numCampCost;
				
				//7/30/2015 - Request to have WPRJROI = (Sales Value + Weighted Value - Camp Cost) / Camp Cost
				//log('debug','wprj roi',parseFloat(campaignjson[camp].salesvalue)+parseFloat(numWeightedValue)+' // '+numCampCost);
				wprjRoi = (parseFloat(campaignjson[camp].salesvalue) + parseFloat(numWeightedValue) - parseFloat(numCampCost)) / parseFloat(numCampCost);
				roi = (numSalesValue - numCampCost) / numCampCost;
			}
			
			metriclist.setLineItemValue('custpage_cml_cpl', mline, cplvalue);
			metriclist.setLineItemValue('custpage_cml_prjroi', mline, prjRoi);
			metriclist.setLineItemValue('custpage_cml_wprjroi', mline, wprjRoi);
			metriclist.setLineItemValue('custpage_cml_roi', mline, roi);

			//Build CSV Body 
			csvBody += '"'+campaignjson[camp].title+'",'+
					   '"'+campaignjson[camp].categorytext+'",'+
					   '"'+campaignjson[camp].audiencetext+'",'+
					   '"'+campaignjson[camp].startdate+'",'+
					   '"'+campaignjson[camp].ownertext+'",'+
					   '"'+campaignjson[camp].basecost+'",'+
					   '"'+campaignjson[camp].salesvalue+'",'+
					   '"'+campaignjson[camp].hipvalue+'",'+
					   '"'+campaignjson[camp].forecastvalue+'",'+
					   '"'+campaignjson[camp].weightedpipelinevalue+'",'+
					   '"'+campaignjson[camp].newcompanies+'",'+
					   '"'+campaignjson[camp].newpartners+'",'+
					   '"'+campaignjson[camp].alltype+'",'+
					   '"'+campaignjson[camp].newcontacts+'",'+
					   '"'+campaignjson[camp].grosscontacts+'",'+
					   '"'+cplvalue+'",'+
					   '"'+prjRoi+'",'+
					   '"'+wprjRoi+'",'+
					   '"'+roi+'"\n';
			
			mline++;
			
		}
		
		//---------------------- CSV Export Section ---------------------------------------------------------
		// All Process still needs to be done to generate CSV export based on user Filters
		if (paramDrillType=='csvexport') {
			var file = nlapiCreateFile('MetricsExport.csv','CSV',csvHeader+csvBody);
			res.setContentType(file.getType(), 'MetricsExport.csv');
			res.write(file.getValue());
			return;
		}
		
		
	} catch (cmslerr) {
		log('error','Metric Dashboard Gen Error', getErrText(cmslerr));
	}
	
	res.writePage(nsform);
	
}

/********************************** Client Script **********************************************/
var show = false;
function toggleDef()
{
	if (!show)
	{
		show = true;
		document.getElementById('togglebtn').value = 'Hide Definition';
		document.getElementById('def').style.display = 'block';
	}
	else
	{
		show = false;
		document.getElementById('togglebtn').value = 'Show Definition';
		document.getElementById('def').style.display = 'none';
	}
}

function onDashSave()
{
	//Add in client validation to check to make sure 
	//	Both Range values are provided if set
	if ( (nlapiGetFieldValue('custpage_createstartdd') && !nlapiGetFieldValue('custpage_createenddd') ) ||
		 (!nlapiGetFieldValue('custpage_createstartdd') && nlapiGetFieldValue('custpage_createenddd') ) )
	{
		alert('Both creation date range values must be provided');
		return false;
	}
	
	return true;
}

function reloadDashboardSl() {
	
	//grab and build parameters
	var slUrl=nlapiResolveURL(
				'SUITELET',
				'customscript_ax_sl_campmetricdashboard',
				'customdeploy_ax_sl_campmetricdashboard'
			  )+
			  '&ifrmcntnr=T';

	if (nlapiGetFieldValue('custpage_campaudience')) 
	{
		slUrl += '&custpage_campaudience='+nlapiGetFieldValue('custpage_campaudience');
	}
	
	if (nlapiGetFieldValue('custpage_campcategory')) 
	{
		slUrl += '&custpage_campcategory='+nlapiGetFieldValue('custpage_campcategory');
	}
	
	if (nlapiGetFieldValue('custpage_campstartdate')) 
	{
		slUrl += '&custpage_campstartdate='+nlapiGetFieldValue('custpage_campstartdate');
	}
	
	if (nlapiGetFieldValue('custpage_createstartdd') && nlapiGetFieldValue('custpage_createenddd'))
	{
		slUrl += '&custpage_createstartdd='+
				 nlapiGetFieldValue('custpage_createstartdd')+
				 '&custpage_createenddd='+
				 nlapiGetFieldValue('custpage_createenddd');
	}
	
	//disable the button
	nlapiDisableField('custpage_fltrefresh', true);
	
	window.ischanged = false;
	window.location = slUrl;
}

function exportcsvSl() {
	//grab and build parameters
	var slUrl=nlapiResolveURL('SUITELET','customscript_ax_sl_campmetricdashboard','customdeploy_ax_sl_campmetricdashboard')+'&ifrmcntnr=T';;

	if (nlapiGetFieldValue('custpage_campaudience')) {
		slUrl += '&custpage_campaudience='+nlapiGetFieldValue('custpage_campaudience');
	}
	
	if (nlapiGetFieldValue('custpage_campcategory')) {
		slUrl += '&custpage_campcategory='+nlapiGetFieldValue('custpage_campcategory');
	}
	
	if (nlapiGetFieldValue('custpage_campstartdate')) {
		slUrl += '&custpage_campstartdate='+nlapiGetFieldValue('custpage_campstartdate');
	}
	
	slUrl +='&custparam_drilltype=csvexport';
	
	window.ischanged = false;
	window.location = slUrl;
}


