/**
 * Module Description
 * 
 * Version    Date            Author           Remarks
 * 1.00       13 Nov 2015     Jacob Shetler
 *
 */

/**
 * Swap the sales rep on all orders and units.
 * 
 * 
 */

/**
 * Confirmation popup to alert user of the dangers or running the script during the day.
 */
function SwapSalesRep_SaveRecord()
{
	//creates a confirmation box.
	if(confirm('CAUTION: Once you click \'OK\', this will change ALL of the Units and Unit Orders to have the new Sales Rep. Please note that this should be run after work hours to avoid performance issues and conflicting data if a record is open elsewhere during the update.'))
	{
		return true;
	}
	else
	{
		return false;
	}
}

/**
 * Suitelet to swap an old sales rep with a new one. Kicks off a schedule script to
 * update all unit orders and units.
 * 
 * @param {nlobjRequest} request
 * @param {nlobjResponse} response
 */
function SwapSalesRep_Suitelet(request, response)
{
	if(request.getMethod() == 'GET')
	{
		var form = nlapiCreateForm('Swap Sales Reps', false);
		form.addSubmitButton('Submit');
		
		var oldRep = form.addField('custpage_oldsalesrep', 'select', 'Old Sales Rep', null, null);
		oldRep.addSelectOption('', '', true);
		oldRep.setMandatory(true);
		var newRep = form.addField('custpage_newsalesrep', 'select', 'New Sales Rep', null, null);
		newRep.addSelectOption('', '', true);
		newRep.setMandatory(true);
		
		var series = form.addField('custpage_series', 'multiselect', 'Series', 'customrecordrvsseries', null);
		series.setMandatory(true);
		
		//add field for the dealership
		form.addField('custpage_dealer', 'multiselect', 'Dealership', 'customer', null);
		
		//add field and options for the shipping state
		var shipState = form.addField('custpage_state', 'multiselect', 'Shipping State');
		var shortNames = nlapiSearchRecord('customrecordrvs_state', null, null, new nlobjSearchColumn('custrecordrvs_state_shortname'));
		if(shortNames != null)
		{
			for (var i = 0; i < shortNames.length; i++)
			{
				var stateVal = shortNames[i].getValue('custrecordrvs_state_shortname');
				shipState.addSelectOption(stateVal, stateVal);
			}
		}
		
		//manually populate the list so only employees who are sales reps are available
		var salesRepList = PopulateSalesRepList();
		if(salesRepList != null)
		{
			for(var i=0; i<salesRepList.length; i++)
			{
				oldRep.addSelectOption(salesRepList[i].getValue('internalid'), salesRepList[i].getValue('entityid'), false);
				newRep.addSelectOption(salesRepList[i].getValue('internalid'), salesRepList[i].getValue('entityid'), false);
			}
		}
		form.setScript('customscriptgd_swapsalesrep_client');
		response.writePage(form);
	}
	else//POST
	{
		//schedule the mass updates to run, passing in the old and new sales reps
		var scheduleParams = new Object();
		scheduleParams['custscriptgd_swapsalesrep_oldrepparam_mp'] = request.getParameter('custpage_oldsalesrep');
		scheduleParams['custscriptgd_swapsalesrep_newrepparam_mp'] = request.getParameter('custpage_newsalesrep');
		
		//turn the array into a string (the parameter is free form text) to allow for multiselect
		var seriesArray = request.getParameterValues('custpage_series');
		scheduleParams['custscriptgd_swapsalesrep_seriesparam_mp'] = seriesArray.join(',');
		
		//Get the dealership and the shipping states
		scheduleParams['custscriptgd_swapsalesrep_shipstate_mp'] = JSON.stringify(request.getParameterValues('custpage_state'));
		scheduleParams['custscriptgd_swapsalesrep_dealer_mp'] = JSON.stringify(request.getParameterValues('custpage_dealer'));
		
		//use auto deploy to queue up multiple instances if they run this again while the code is still running
		var url = nlapiResolveURL('SUITELET', 'customscriptgd_startmapreduce_suite', 'customdeploygd_startmapreduce_suite', true) //Get the external url. deployment must be available without login.
		nlapiRequestURL(url + '&custparam_scriptid=customscriptgd_swapsalesrep_mapreduce&custparam_scriptdeploymentid=&custparam_parameters=' + JSON.stringify(scheduleParams));

		//redirects back to the suitelet to update another sales rep.
		nlapiSetRedirectURL('SUITELET', 'customscriptgd_swapsalesrep_suitelet', 'customdeploygd_swapsalesrep_suitelet_d', null);
	}
}

/**
 * 
 * @returns list of employees who are sales reps
 */
function PopulateSalesRepList()
{
	var filters = new Array();
	filters[filters.length] = new nlobjSearchFilter('salesrep', null, 'is', 'T');
	
	var columns = new Array();
	columns[columns.length] = new nlobjSearchColumn('internalid');
	columns[columns.length] = new nlobjSearchColumn('entityid');
	
	return nlapiSearchRecord('employee', null, filters, columns);
}

/**
 * Update all unit orders with the new sales rep (all statuses)
 * 
 * @param recType
 * @param recId
 */
function SwapSalesRep_UnitOrderMassUpdate(recType, recId, oldRep, newRep)
{
	if(recType == 'salesorder' && recId != '' && recId != null)
	{
//		nlapiLogExecution('debug', 'SwapSalesRep_UnitOrderMassUpdate', 'recId: ' + recId);
		nlapiSubmitField('salesorder', recId, 'salesrep', newRep, false);
	}
}

/**
 * 
 * @param recType
 * @param recId
 */
function SwapSalesRep_UnitMassUpdate(recType, recId, oldRep, newRep)
{
	if(recType == 'customrecordrvsunit' && recId != '' && recId != null)
	{
//		nlapiLogExecution('debug', 'SwapSalesRep_UnitMassUpdate', 'recId: ' + recId);
		nlapiSubmitField('customrecordrvsunit', recId, 'custrecordunit_salesrep', newRep, false);
	}
}


//Keeps track of the time that the script started. We'll check against it in the loops to see
//if the script has been running >55 minutes. If it has, then we need to yield the script.
var START_DATETIME = null;

/**
 * 
 */
function SwapSalesRep_ScheduledScript()
{
	START_DATETIME = new Date();
	var context = nlapiGetContext();
	context.setPercentComplete(0.00);
	var oldRep = context.getSetting('SCRIPT', 'custscriptgd_swapsalesrep_oldrepparam');
	var newRep = context.getSetting('SCRIPT', 'custscriptgd_swapsalesrep_newrepparam');
	var seriesString = context.getSetting('SCRIPT', 'custscriptgd_swapsalesrep_seriesparam');
	var stateString = context.getSetting('SCRIPT', 'custscriptgd_swapsalesrep_shipstate');
	var dealerString = context.getSetting('SCRIPT', 'custscriptgd_swapsalesrep_dealer');
	
	//convert the states and dealers into arrays
	var states = new Array();
	var dealers = new Array();
	if(stateString != null && stateString.length > 0)states = JSON.parse(stateString);
	if(dealerString != null && dealerString.length > 0) dealers = JSON.parse(dealerString);

	var series = new Array();
	series = seriesString.split(',');
	
	var orderList = SearchOrdersBySalesRep(oldRep, series, states, dealers);
	var unitList = SearchUnitsBySalesRep(oldRep, series, states, dealers);
	var totalToUpdate = 0.0;
	var totalUpdated = 0.0;
	if(orderList != null)
	{
		totalToUpdate += orderList.length;
	}
	if(unitList != null)
	{
		totalToUpdate += unitList.length;
	}
	
	nlapiLogExecution('debug', 'total', totalToUpdate);
	
	if(orderList != null)
	{
		for(var i=0; i<orderList.length; i++)
		{
//			nlapiLogExecution('debug', 'Orders', 'id: ' + orderList[i].getValue('internalid'));
			SwapSalesRep_UnitOrderMassUpdate('salesorder', orderList[i].getId(), oldRep, newRep);
			//update estimated % complete
			totalUpdated++;
			context.setPercentComplete(Math.round((totalUpdated/totalToUpdate)*10000.0)/100);//round to 2 decimals
			
			//Yield if we do not have enough usage points.
			if(nlapiGetContext().getRemainingUsage() < 100 || runningForMoreThan55Minutes())
			{
				yieldScript();
			}
		}
	}
	orderList = null; 
	
	if(unitList != null)
	{
		for(var i=0; i<unitList.length; i++)
		{
//			nlapiLogExecution('debug', 'Units', 'id: ' + unitList[i].getValue('internalid'));
			SwapSalesRep_UnitMassUpdate('customrecordrvsunit', unitList[i].getValue('internalid'), oldRep, newRep);
			//update estimated % complete
			totalUpdated++;
			context.setPercentComplete(Math.round((totalUpdated/totalToUpdate)*10000.0)/100);//round to 2 decimals
			
			//Yield if we do not have enough usage points.
			if(nlapiGetContext().getRemainingUsage() < 100 || runningForMoreThan55Minutes())
			{
				yieldScript();
			}
		}
	}
}

function SearchOrdersBySalesRep(salesRep, series, states, dealers)
{
	var filters = new Array();
	filters[filters.length] = new nlobjSearchFilter('salesrep', null, 'anyof', salesRep);
	filters[filters.length] = new nlobjSearchFilter('custbodyrvsseries', null, 'anyof', series);
	//think its all orders, not just unit orders
	//filters[filters.length] = new nlobjSearchFilter('custbodyrvsordertype', null, 'anyof', ORDERTYPE_UNIT);
	filters[filters.length] = new nlobjSearchFilter('mainline', null, 'is', 'T');
	filters[filters.length] = new nlobjSearchFilter('memorized', null, 'is', 'F');
	
	//add the states and dealers if they exist
	if(states.length > 0) filters[filters.length] = new nlobjSearchFilter('shipstate', null, 'anyof', states);
	if(dealers.length > 0) filters[filters.length] = new nlobjSearchFilter('entity', null, 'anyof', dealers);
	
	var itemResultsFinal = [];
	var search = nlapiCreateSearch('salesorder', filters);
	var searchResults = search.runSearch();
	var resultIndex = 0; var resultStep = 1000;
	var resultSet; //loop variable to hold the 1000s of results.
	do 
	{
		if(nlapiGetContext().getRemainingUsage() < 50)
			nlapiYieldScript();
		
	    //fetch one result set
	    resultSet = searchResults.getResults(resultIndex, resultIndex + resultStep);
	    itemResultsFinal = itemResultsFinal.concat(resultSet);
	    
	    //increase the low index by the step.
	    resultIndex = resultIndex + resultStep;
	} while (resultSet.length > 0)
		
	return itemResultsFinal;
	
	//return GetSearchResults('salesorder', null, filters, columns, 'internalid');
	//return nlapiSearchRecord('salesorder', null, filters, columns);
}

function SearchUnitsBySalesRep(salesRep, series, states, dealers)
{
	var filters = new Array();
	filters[filters.length] = new nlobjSearchFilter('custrecordunit_salesrep', null, 'anyof', salesRep);
	filters[filters.length] = new nlobjSearchFilter('custrecordunit_series', null, 'anyof', series);
	
	//add the states and dealers if they exist
	if(states.length > 0) filters.push(new nlobjSearchFilter('shipstate', 'custrecordunit_salesorder', 'anyof', states));
	if(dealers.length > 0) filters.push(new nlobjSearchFilter('entity', 'custrecordunit_salesorder', 'anyof', dealers));
	
	var columns = new Array();
	var sortBy = new nlobjSearchColumn('internalid');
	sortBy.setSort();
	columns[columns.length] = sortBy;
	columns[columns.length] = new nlobjSearchColumn('custrecordunit_serialnumber');
	
	return GetSearchResults('customrecordrvsunit', null, filters, columns, 'internalid');
	//return nlapiSearchRecord('customrecordrvsunit', null, filters, columns);
}

function yieldScript()
{
	var stateMain = nlapiYieldScript();
	nlapiLogExecution('debug', 'time', nlapiGetContext().getRemainingUsage());
	if(stateMain.status == 'FAILURE')
	{ 
		nlapiLogExecution("debug","Failed to yield script (loop), exiting: Reason = "+ stateMain.reason + " / Size = "+ stateMain.size); 
		throw "Failed to yield script"; 
	} 
	else if (stateMain.status == 'RESUME')
	{ 
		nlapiLogExecution("debug", "Resuming script (loop) because of " + stateMain.reason+". Size = "+ stateMain.size); 
	}
	
	//Reset the date/time to the new start time of the script.
	START_DATETIME = new Date();
}

function runningForMoreThan55Minutes()
{
	return ((new Date() - START_DATETIME) / 60000) > 55;
}
