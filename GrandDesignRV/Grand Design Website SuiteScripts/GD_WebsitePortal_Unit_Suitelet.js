/**
 * Module Description
 * 
 * Version    Date            Author           Remarks
 * 1.00       03 Sep 2014     ibrahima
 *
 */

/**
 * Suitelet that creates Unit Links Portlet.
 * @param {nlobjRequest} request Request object
 * @param {nlobjResponse} response Response object
 * @returns {Void} Any output is written via response object
 */
function GD_UnitLinksPortlet_Suitelet(request, response)
{	
	var form = nlapiCreateForm('', true);		
	var sublist = form.addSubList('custpage_linklist', 'list', 'Unit Links', null);
	
	var field = sublist.addField('custpage_links', 'text', ' ');
	field.setDisplayType('inline');

	var unitURL = GetWebsiteMyAccountDomainURL() + nlapiResolveURL('RECORD',UNIT_RECORD_TYPE,null,null); 
	var recType = GetURLParameter(unitURL, 'rectype');	
	sublist.setLineItemValue('custpage_links', 1, '<a href="' + GetWebsiteMyAccountDomainURL() + GetCustomRecordListURL(recType) + '" target="_parent">Unit List</a>');
	
	//Retail Customer List. RVS Dealer Portal - Unit Retail Customer List Saved Search
	var retailCustURL = GetWebsiteMyAccountDomainURL() + nlapiResolveURL('RECORD',UNIT_RETAIL_CUSTOMER_RECORD_TYPE,null,null); 
	var retailCustType = GetURLParameter(retailCustURL, 'rectype');	
	sublist.setLineItemValue('custpage_links', 2, '<a href="' + GetWebsiteMyAccountDomainURL() + GetCustomRecordListURL(retailCustType) + '" target="_parent">Retail Customer List</a>');

	response.writePage(form);
}


/**
 * Suitelet that creates Unit Links with Registration Portlet.
 * @param {nlobjRequest} request Request object
 * @param {nlobjResponse} response Response object
 * @returns {Void} Any output is written via response object
 */
function GD_UnitLinksWithRegistPortlet_Suitelet(request, response)
{	
	var form = nlapiCreateForm('', true);		
	var sublist = form.addSubList('custpage_linklist', 'list', 'Unit Links', null);
	
	var field = sublist.addField('custpage_links', 'text', ' ');
	field.setDisplayType('inline');

	var unitURL = GetWebsiteMyAccountDomainURL() + nlapiResolveURL('RECORD',UNIT_RECORD_TYPE,null,null); 
	var recType = GetURLParameter(unitURL, 'rectype');	
	sublist.setLineItemValue('custpage_links', 1, '<a href="' + GetWebsiteMyAccountDomainURL() + GetCustomRecordListURL(recType) + '" target="_parent">Unit List</a>');
	
	//Retail Customer List. RVS Dealer Portal - Unit Retail Customer List Saved Search
	var retailCustURL = GetWebsiteMyAccountDomainURL() + nlapiResolveURL('RECORD',UNIT_RETAIL_CUSTOMER_RECORD_TYPE,null,null); 
	var retailCustType = GetURLParameter(retailCustURL, 'rectype');	
	sublist.setLineItemValue('custpage_links', 2, '<a href="' + GetWebsiteMyAccountDomainURL() + GetCustomRecordListURL(retailCustType) + '" target="_parent">Retail Customer List</a>');
	
	//Search For Recalls By Vin
	var vinSearchURL = nlapiResolveURL('SUITELET', 'customscriptgd_searchrecalls_suitelet', 'customdeploygd_searchrecalls_suitelet', null);
	sublist.setLineItemValue('custpage_links', 3, '<a href="' + GetWebsiteMyAccountDomainURL() + vinSearchURL + '" style="" target="_parent">Search Recalls by VIN</a>');
	
	//Register Unit
	var unitRegURL = nlapiResolveURL('SUITELET', 'customscriptgdregisterunitsuitelet', 'customdeploygdregisterunitsuiteletdeploy', null);
	sublist.setLineItemValue('custpage_links', 4, '<a href="' + GetWebsiteMyAccountDomainURL() + unitRegURL + '" style="font-weight:bold;color:red;" target="_parent">Register Unit</a>');
	response.writePage(form);
}

/**
 * Suitelet that creates Unit Overview Portlet.
 * @param {nlobjRequest} request Request object
 * @param {nlobjResponse} response Response object
 * @returns {Void} Any output is written via response object
 */
function GD_UnitOverviewPortlet_Suitelet(request, response)
{
	
	var form = nlapiCreateForm('', true);		
	var sublist = form.addSubList('custpage_overview', 'list', 'Unit Overview', null);
	
	var field = sublist.addField('custpage_unitcount', 'text', ' ');
	field.setDisplayType('inline');

	var results = null;
	//create columns to return
	var cols = new Array();
	cols[cols.length] = new nlobjSearchColumn('internalid');
	//create filters
	var filters = new Array();
	filters[0] = new nlobjSearchFilter('custrecordunit_dealer',null,'anyof', ['@CURRENT@']); //Filter: "Dealer is mine"

	//Get Pending Schedule Units
	filters[1] = new nlobjSearchFilter('custrecordunit_status',null,'anyof', [UNIT_STATUS_PENDING_SCHEDULE]); 	
	results = nlapiSearchRecord(UNIT_RECORD_TYPE,null, filters, cols); //Get search results
	var numOfResults =  'Pending Schedule Units: ';
	numOfResults += (results != null ? results.length : 0);
	sublist.setLineItemValue('custpage_unitcount', 1, numOfResults);
		
	//Get Scheduled Units
	filters[1] = new nlobjSearchFilter('custrecordunit_status',null,'anyof', [UNIT_STATUS_SCHEDULED]); 	
	results = nlapiSearchRecord(UNIT_RECORD_TYPE,null, filters, cols); 
	numOfResults =  'Scheduled Units: ';
	numOfResults += (results != null ? results.length : 0);
	sublist.setLineItemValue('custpage_unitcount', 2, numOfResults);
	
	//Get Offline-Short Units
	filters[1] = new nlobjSearchFilter('custrecordunit_status',null,'anyof', [UNIT_STATUS_OFFLINE_SHORT]); 	
	results = nlapiSearchRecord(UNIT_RECORD_TYPE,null, filters, cols); 
	numOfResults =  'Offline - Short Units: ';
	numOfResults += (results != null ? results.length : 0);
	sublist.setLineItemValue('custpage_unitcount', 3, numOfResults);
		
	//Get Offline Rework Units
	filters[1] = new nlobjSearchFilter('custrecordunit_status',null,'anyof', [UNIT_STATUS_OFFLINE_REWORK]); 	
	results = nlapiSearchRecord(UNIT_RECORD_TYPE,null, filters, cols); 
	numOfResults =  'Offline - Rework Units: ';
	numOfResults += (results != null ? results.length : 0);
	sublist.setLineItemValue('custpage_unitcount', 4, numOfResults);

	response.writePage(form);
}

/**
 * Suitelet that creates Shipped but not registered Unit Portlet.
 * @param {nlobjRequest} request Request object
 * @param {nlobjResponse} response Response object
 * @returns {Void} Any output is written via response object
 */
function GD_UnitShipNotRegisteredPortlet_Suitelet(request, response)
{	
	var form = nlapiCreateForm('', true);		
	var sublist = form.addSubList('custpage_list', 'list', 'Unit: Shipped Not Registered', null);
	
	var field = sublist.addField('custpage_vin', 'text', 'VIN #');
	field.setDisplayType('inline');
	
	field = sublist.addField('custpage_serialnum', 'text', 'Serial #');
	field.setDisplayType('inline');
	
	field = sublist.addField('custpage_model', 'text', 'Model');
	field.setDisplayType('inline');
	
	field = sublist.addField('custpage_series', 'text', 'Series');
	field.setDisplayType('inline');
	
	field = sublist.addField('custpage_shipdate', 'text', 'Ship Date');
	field.setDisplayType('inline');
	
	//create columns to return
	var cols = new Array();
	cols[cols.length] = new nlobjSearchColumn('internalid');
	cols[cols.length] = new nlobjSearchColumn('name');
	cols[cols.length] = new nlobjSearchColumn('custrecordunit_serialnumber');
	cols[cols.length] = new nlobjSearchColumn('custrecordunit_model');
	cols[cols.length] = new nlobjSearchColumn('custrecordunit_series');
	cols[cols.length] = new nlobjSearchColumn('custrecordunit_onlinedate');
	cols[cols.length] = new nlobjSearchColumn('custrecordunit_offlinedate');
	cols[cols.length] = new nlobjSearchColumn('custrecordunit_actualofflinedate');
	cols[cols.length] = new nlobjSearchColumn('custrecordunit_shipdate');
	
	//create filters
	var filters = new Array();
	filters[filters.length] = new nlobjSearchFilter('custrecordunit_dealer',null,'anyof', ['@CURRENT@']); //Filter: "Dealer is mine"
	filters[filters.length] = new nlobjSearchFilter('custrecordunit_status',null,'anyof', [UNIT_STATUS_COMPLETE]); //Filter: "Status is complete"
	filters[filters.length] = new nlobjSearchFilter('custrecordunit_shipdate',null,'isnotempty'); //Filter: "Status ship date is set"
	filters[filters.length] = new nlobjSearchFilter('custrecordunit_receiveddate',null,'isempty'); //Filter: "Status ship date is set"
	
	//Now search for pre_auths
	var results = nlapiSearchRecord(UNIT_RECORD_TYPE,null,filters, cols);
	var topN = 10;
	if(results != null && results.length > 0) //Add results to the portlet
	{
		results.sort(SortByShipDate);

		//add rows to the portlet
		for(var i = 0; i < results.length; i++)
		{
			if(i < topN) //Only list the topN, Note: i start at zero, so when i == 9, we have 10 added 10 units.
			{
				var lineIndex = i + 1;
				var url = GetWebsiteMyAccountDomainURL() + nlapiResolveURL('RECORD', UNIT_RECORD_TYPE, null, 'VIEW') + '&id=' + results[i].getId();
				
				sublist.setLineItemValue('custpage_vin', lineIndex, '<a href="'+ url + '" target="_parent">' + results[i].getValue('name') + '</a>');	
				sublist.setLineItemValue('custpage_serialnum', lineIndex, results[i].getValue('custrecordunit_serialnumber'));
				sublist.setLineItemValue('custpage_model', lineIndex, results[i].getText('custrecordclaim_unitmodel'));
				sublist.setLineItemValue('custrecordunit_series', lineIndex, results[i].getText('custrecordunit_series'));
				sublist.setLineItemValue('custpage_shipdate', lineIndex, results[i].getValue('custrecordunit_shipdate'));
			}
			else
			{
				break;
			}
		}
	}
	
	response.writePage(form);
}


/**
 * Methods to sort dealer results by company name.
 * @param dealerSearchResult1
 * @param dealerSearchResult2
 * @returns {Number}
 */
function SortByShipDate(unitResult1, unitResult2)
{
	var date1 = nlapiStringToDate(unitResult1.getValue('custrecordunit_shipdate'));
	var date2 = nlapiStringToDate(unitResult2.getValue('custrecordunit_shipdate'));
	
	if(date1 < date2)
	   return -1;
	else if(date1 > date2)
	   return 1;
	else
		return 0;	
}