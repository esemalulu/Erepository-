/**
 * Module Description
 * 
 * Version    Date            Author           Remarks
 * 1.00       5 Jul 2017     brians
 *
 */

/**
 * @param {nlobjRequest} request Request object
 * @param {nlobjResponse} response Response object
 * @returns {Void} Any output is written via response object
 */
function RVSWebsiteUnitSuitelet(request, response){
	
	var form = nlapiCreateForm('', true);		
	
	var dealerId = nlapiGetUser();
	var dealerGroupMembers = GetDealerGroupMembers(dealerId);
	
	var HTMLfield = form.addField('custpage_unithtml', 'inlinehtml', '');
	HTMLfield.setDisplayType('inline');
	
	var returnObj = {};
	
	var showRegistered = request.getParameter('showregistered');
	var role = nlapiGetRole();

	returnObj.showRegistered = showRegistered == 'true';
	
	var filters = new Array();	//create filters
	filters.push(new nlobjSearchFilter('custrecordunit_dealer',null,'anyof', dealerGroupMembers)); //dealer is any of the dealers in the dealer group of the logged in user
	filters.push(new nlobjSearchFilter('isinactive',null,'is','F'));
	filters.push(new nlobjSearchFilter('status','custrecordunit_salesorder','anyof', [SALESORDER_SRCHFILTER_BILLED]));
	filters.push(new nlobjSearchFilter('mainline','custrecordunit_salesorder','is', 'T'));

	if(returnObj.showRegistered)
		filters.push(new nlobjSearchFilter('custrecordunit_receiveddate',null,'isnotempty'));
	else
		filters.push(new nlobjSearchFilter('custrecordunit_receiveddate',null,'isempty'));
	
	var columns = new Array();		//create columns to return
	columns.push(new nlobjSearchColumn('name').setSort(true));
	columns.push(new nlobjSearchColumn('custrecordunit_serialnumber'));
	columns.push(new nlobjSearchColumn('custrecordunit_series'));
	columns.push(new nlobjSearchColumn('custrecordunit_model'));
	columns.push(new nlobjSearchColumn('custrecordunit_decor'));
	columns.push(new nlobjSearchColumn('custrecordunit_retailpurchaseddate'));
	columns.push(new nlobjSearchColumn('custrecordunit_offlinedate'));
	columns.push(new nlobjSearchColumn('custrecordunit_warrantyexpirationdate'));
	columns.push(new nlobjSearchColumn('custrecordunit_status'));
	columns.push(new nlobjSearchColumn('custrecordunit_shippingstatus'));
	columns.push(new nlobjSearchColumn('custrecordunit_shipdate'));
	columns.push(new nlobjSearchColumn('custrecordunit_receiveddate'));
	
	var unitIdList = [];
	var results = GetSteppedSearchResults('customrecordrvsunit', filters, columns, null);

	if(results != null && results.length > 0)
	{
		returnObj.units = [];
		var unitObj = '';
		for(var i = 0; i < results.length; i++)
		{
			unitObj = {};
			unitObj.id = results[i].getId();
			unitObj.vin = results[i].getValue('name');
			unitObj.serial = results[i].getValue('custrecordunit_serialnumber');
			unitObj.series = results[i].getText('custrecordunit_series');
			unitObj.model = results[i].getText('custrecordunit_model');
			unitObj.decor = results[i].getText('custrecordunit_decor');
			unitObj.status = {"id":results[i].getValue('custrecordunit_status'), "name": results[i].getText('custrecordunit_status')};
			unitObj.offlineDate = results[i].getValue('custrecordunit_offlinedate');
			unitObj.purchaseDate = results[i].getValue('custrecordunit_retailpurchaseddate');
			unitObj.expDate = results[i].getValue('custrecordunit_warrantyexpirationdate');
			unitObj.shipDate = results[i].getValue('custrecordunit_shipdate');
			unitObj.receivedDate = results[i].getValue('custrecordunit_receiveddate');
			returnObj.units.push(unitObj);
			unitIdList.push(unitObj.id);
		}
	}
	
	var context = nlapiGetContext();
	var acct = context.getCompany();
	var domain = context.getSetting('SCRIPT', 'custscriptwebsitemyaccountdomainurl');

	returnObj.role = context.getRole();
	returnObj.recTypeId = GD_UNIT_RECORDTYPE;
	returnObj.urlString = domain + '/app/common/custom/custrecordentry.nl?compid=' + acct + '&rectype=' + returnObj.recTypeId;
	
	//Retail Customer List. RVS Dealer Portal - Unit Retail Customer List Saved Search
	var retailCustURL = domain + nlapiResolveURL('RECORD', UNIT_RETAIL_CUSTOMER_RECORD_TYPE, null, null); 
	var retailCustType = GetURLParameter(retailCustURL, 'rectype');	
	returnObj.retailCustURL = domain + GetCustomRecordListURL(retailCustType);
	
	//Search For Recalls By Vin
	returnObj.vinSearchURL = domain + nlapiResolveURL('SUITELET', 'customscriptgd_searchrecalls_suitelet', 'customdeploygd_searchrecalls_suitelet', null);
	
	//Register Unit
	returnObj.unitRegURL = domain + nlapiResolveURL('SUITELET', 'customscriptgdregisterunitsuitelet', 'customdeploygdregisterunitsuiteletdeploy', null);
	returnObj.canRegisterUnits = canRegisterUnits(nlapiGetRole());
	
	var datafield = form.addField('custpage_unitdata', 'inlinehtml', '');
	datafield.setDisplayType('inline');
	datafield.setDefaultValue('<div style="color: #333; display:none;">' + JSON.stringify(returnObj) + '</div>');
	datafield.setLayoutType('outsidebelow', 'startrow');
	
	var html = '';
	html = buildHTMLFileLinks(RVS_BUNDLE_FILES_MODULE_RVSCOMMON) +
			   buildHTMLFileLinks(RVS_BUNDLE_FILES_MODULE_JQUERY) +
			   buildHTMLFileLinks(RVS_BUNDLE_FILES_MODULE_KNOCKOUT) + 
			   buildHTMLFileLinks(RVS_BUNDLE_FILES_MODULE_PORTAL) + 
			   buildHTMLFileLinks(RVS_BUNDLE_FILES_MODULE_PORTALUNIT);
	HTMLfield.setDefaultValue(html);
	
	response.writePage(form);
}

/**
 * Shows a portlet that contains links to common Unit tasks.
 */
function GetUnitLinksSuitelet(request, response)
{
	if (request.getMethod() == 'GET')
	{
		var domain = nlapiGetContext().getSetting('SCRIPT', 'custscriptwebsitemyaccountdomainurl');
		 
		//Retail Customer List. RVS Dealer Portal - Unit Retail Customer List Saved Search
		var retailCustURL = domain + nlapiResolveURL('RECORD', UNIT_RETAIL_CUSTOMER_RECORD_TYPE, null, null); 
		var retailCustType = GetURLParameter(retailCustURL, 'rectype');	
		
		//Search For Recalls By Vin
		var vinSearchURL = nlapiResolveURL('SUITELET', 'customscriptgd_searchrecalls_suitelet', 'customdeploygd_searchrecalls_suitelet', null);
		
		//Register Unit
		var unitRegURL = nlapiResolveURL('SUITELET', 'customscriptgdregisterunitsuitelet', 'customdeploygdregisterunitsuiteletdeploy', null);
		 
		var content =
			"<style> a, a:visited {font-family: 'Open Sans', sans-serif; font-size: 14px; color: #337ab7; line-height: 150%;} </style>" +
//			'<a style="padding-bottom: 3px;" target="_parent" href="' + domain + '/s.nl/c.3598857/sc.65/category.7693103/.f">Retail Customer List</a></br>' +
//			'<a style="padding-bottom: 3px;" target="_parent" href="' + domain + '/s.nl/' + nlapiGetContext().getCompany() + '/sc.64/category.7748561/.f">Retail Customer List</a></br>' +
			'<a style="padding-bottom: 3px;" target="_parent" href="' + domain + vinSearchURL + '">Search Recalls/Notices by VIN</a></br>';
		 
		//If this role is allowed to register units, add the Register Unit link.
		if(canRegisterUnits(nlapiGetRole())) {
			content +=
			'<a style="padding-bottom: 3px;" target="_parent" href="' + domain + unitRegURL + '">Register Unit</a></br>';
		}
		response.write(content);
	}
}