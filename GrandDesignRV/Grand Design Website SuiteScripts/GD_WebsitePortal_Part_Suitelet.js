/**
 * Module Description
 * 
 * Version    Date            Author           Remarks
 * 1.00       03 Sep 2014     ibrahima
 *
 */
var WEB_ORDER_STATUS_OPEN = 'open';
var ORDER_TYPE_FIELD_NAME = 'custbodyrvsordertype';
var UNIT_FIELD_NAME = 'custbodyrvsunit';
var PARTS_INQUIRY_RECORD_TYPE = 'customrecordgranddesignpartsinquiry';
var checkoutDomainUrl = GetWebsiteMyAccountDomainURL();

/**
 * Suitelet that creates Part inks portlet for website dealer portal.
 * @param {nlobjRequest} request Request object
 * @param {nlobjResponse} response Response object
 * @returns {Void} Any output is written via response object
 */
function GD_PartLinksPortlet_Suitelet(request, response)
{

	var form = nlapiCreateForm('', true);		
	var sublist = form.addSubList('custpage_linklist', 'list', 'Part Links', null);
	var field = sublist.addField('custpage_links', 'text', ' ');
	field.setDisplayType('inline');

	var searchId =  nlapiGetContext().getSetting('SCRIPT', 'custscriptdealerpartorderlistsearch');	
	if(trim(searchId) != '')
		sublist.setLineItemValue('custpage_links', 1, '<a href="' + checkoutDomainUrl + GetSearchResultURL(searchId) + '" target="_parent">Parts Order History</a>');
	else
		sublist.setLineItemValue('custpage_links', 1, 'Missing "Dealer Portal - Part Web Order Search" on custom preferences.');
	
	response.writePage(form);
}

/**
 * Suitelet that creates Part links portlet with new web order link for website dealer portal.
 * @param {nlobjRequest} request Request object
 * @param {nlobjResponse} response Response object
 * @returns {Void} Any output is written via response object
 */
function GD_PartLinksWthNewWebOrdPortlet_Suitelet(request, response)
{

	var form = nlapiCreateForm('', true);		
	var sublist = form.addSubList('custpage_linklist', 'list', 'Part Links', null);
	var lineIndex = 1;
	var partsInqURL = '';
	
	var field = sublist.addField('custpage_links', 'text', ' ');
	field.setDisplayType('inline');

	var extPartWebOrderCustomFormId = GetRVSExternalPartWebOrderForm();
	if(trim(extPartWebOrderCustomFormId) != '')
	{
		var newPartWebOrderURL = nlapiResolveURL('RECORD', 'estimate', null, null) + '?whence=&cf=' + extPartWebOrderCustomFormId + '&entity=';
		sublist.setLineItemValue('custpage_links', lineIndex, '<a href="' + checkoutDomainUrl + newPartWebOrderURL + '" target="_parent">New Part Web Order</a>');
	}
	else
		sublist.setLineItemValue('custpage_links', lineIndex, 'Missing "Dealer Portal - External Part Web Order Form" on custom preferences.');
	
	lineIndex++; //increment links line index
	
	try
	{
		partsInqURL = nlapiResolveURL('RECORD',PARTS_INQUIRY_RECORD_TYPE,null,null); 
	}
	catch(ex)
	{
		//We  added try..catch to prevent RVS Old Test from breaking because Parts Inquiry only exist in GD
		//& we are showing a demo in RVS Old Test since it has the new UI.
	}

	if(trim(partsInqURL) != '')
	{
		var recType = GetURLParameter(partsInqURL, 'rectype');	
		sublist.setLineItemValue('custpage_links', lineIndex, '<a href="' + checkoutDomainUrl + partsInqURL + '" target="_parent">New Parts Inquiry</a>');
		lineIndex++;
		sublist.setLineItemValue('custpage_links', lineIndex, '<a href="' + checkoutDomainUrl + GetCustomRecordListURL(recType) + '" target="_parent">Parts Inquiry List</a>');
		lineIndex++;
	}

	var searchId =  nlapiGetContext().getSetting('SCRIPT', 'custscriptdealerpartweborderlistsearch');
	if(trim(searchId) != '')
		sublist.setLineItemValue('custpage_links', lineIndex, '<a href="' + checkoutDomainUrl + GetSearchResultURL(searchId) + '" target="_parent">Unapproved Parts Orders</a>');
	else
		sublist.setLineItemValue('custpage_links', lineIndex, 'Missing "Dealer Portal - Part Web Order Search" on custom preferences.');
	lineIndex++;

	searchId =  nlapiGetContext().getSetting('SCRIPT', 'custscriptdealerpartorderlistsearch');	
	if(trim(searchId) != '')
		sublist.setLineItemValue('custpage_links', lineIndex, '<a href="' + checkoutDomainUrl + GetSearchResultURL(searchId) + '" target="_parent">Parts Order History</a>');
	else
		sublist.setLineItemValue('custpage_links', lineIndex, 'Missing "Dealer Portal - Part Web Order Search" on custom preferences.');
	lineIndex++;
	
	var config = nlapiLoadConfiguration('companypreferences');
	searchId = config.getFieldValue('custscriptgd_dealerportal_rtnauthsearch');
	if(trim(searchId) != '')
		sublist.setLineItemValue('custpage_links', lineIndex, '<a href="' + GetWebsiteMyAccountDomainURL() + GetSearchResultURL(searchId) + '" target="_parent">View Return Authorizations</a>');
	else
		sublist.setLineItemValue('custpage_links', lineIndex, 'Missing "Dealer Portal - Return Authorization Search" on custom preferences.');
	lineIndex++;
	
	
	searchId =  nlapiGetContext().getSetting('SCRIPT', 'custscriptgd_dealerportal_credmem_search');	
	if(trim(searchId) != '')
		sublist.setLineItemValue('custpage_links', lineIndex, '<a href="' + checkoutDomainUrl + GetSearchResultURL(searchId) + '" target="_parent">View Credit Memos</a>');
	else
		sublist.setLineItemValue('custpage_links', lineIndex, 'Missing "GD DEALER PORTAL CREDIT MEMO SEARCH" on custom preferences.');
	
	response.writePage(form);
}


/**
 * Suitelet that creates Open Part Web Order Portlet for website dealer portal.
 * @param {nlobjRequest} request Request object
 * @param {nlobjResponse} response Response object
 * @returns {Void} Any output is written via response object
 */
function GD_OpenPartWebOrdersPortlet_Suitelet(request, response)
{
	
	var form = nlapiCreateForm('', true);		
	var sublist = form.addSubList('custpage_list', 'list', 'Unapproved Parts Orders: Open', null);
	
	var field = sublist.addField('custpage_id', 'text', 'Web Order #');
	field.setDisplayType('inline');
	
	field = sublist.addField('custpage_trandate', 'text', 'Date');
	field.setDisplayType('inline');
	
	field = sublist.addField('custpage_po', 'text', 'PO/Check Number');
	field.setDisplayType('inline');
	
	field = sublist.addField('custpage_memo', 'textarea', 'Memo');
	field.setDisplayType('inline');
	
	field = sublist.addField('custpage_total', 'currency', 'Amount');
	field.setDisplayType('inline');
	
	field = sublist.addField('custpage_status', 'text', 'Status');
	field.setDisplayType('inline');
	
	//create columns to return
	var cols = new Array();
	cols[cols.length] = new nlobjSearchColumn('tranid');
	cols[cols.length] = new nlobjSearchColumn('trandate');
	cols[cols.length] = new nlobjSearchColumn(UNIT_FIELD_NAME);
	cols[cols.length] = new nlobjSearchColumn('otherrefnum');
	cols[cols.length] = new nlobjSearchColumn('total');
	cols[cols.length] = new nlobjSearchColumn('memo');
	cols[cols.length] = new nlobjSearchColumn('status');
	
	//create filters
	var filters = new Array();
	filters[filters.length] = new nlobjSearchFilter('entity',null,'anyof', ['@CURRENT@']); //Filter: "Dealer is mine"
	filters[filters.length] = new nlobjSearchFilter(ORDER_TYPE_FIELD_NAME, null, 'anyof', [ORDERTYPE_PART]); //Filter: Order Type is Part
	//Commented out filters are in the saved search 'customsearchopenwebordersearch'
	//filters[filters.length] = new nlobjSearchFilter('mainline',null,'is',"T"); //Filter: "Mainline is true"
	//List should be filtered by status: current status filter configuration yields no results - Currently Commented out.
	//filters[filters.length] = new nlobjSearchFilter('status', null, 'anyof', 'open') ;//[WEB_ORDER_STATUS_OPEN]); //Filter: Order Status is Open

	//Now search for part web orders for this dealer.
	//Note: "customsearchopenwebordersearch" saved search returns all open web orders, and
	//      we are only interested in open part web orders for this dealer, hence the 2 filters above
	var results = nlapiSearchRecord('estimate','customsearchopenwebordersearch',filters, cols);
	if(results != null && results.length > 0) //Add results to the portlet
	{
		var postDomainURL = nlapiResolveURL('RECORD', 'estimate', null, 'VIEW');	
		for(var i = 0; i < results.length; i++)
		{
			var lineIndex = i + 1;	
			//If url after domain does not contains "?" (i.e, has no parameter) then set id as the first parameter, otherwise append id as the parameter
			var url = (postDomainURL.indexOf('?') == -1 ? checkoutDomainUrl + postDomainURL + '?id=' + results[i].getId() : checkoutDomainUrl + postDomainURL + '&id=' + results[i].getId());
			
			sublist.setLineItemValue('custpage_id', lineIndex, '<a href="'+ url + '" target="_parent">' + results[i].getValue('tranid') + '</a>');	
			sublist.setLineItemValue('custpage_trandate', lineIndex, results[i].getValue('trandate'));
			sublist.setLineItemValue('custpage_po', lineIndex, results[i].getValue('otherrefnum'));
			sublist.setLineItemValue('custpage_memo', lineIndex, results[i].getValue('memo'));
			sublist.setLineItemValue('custpage_total', lineIndex, results[i].getValue('total'));
			sublist.setLineItemValue('custpage_status', lineIndex, results[i].getText('status'));
		}
	}
	response.writePage(form);
	
}


/**
 * Suitelet that creates Pending Billing Order Portlet for website dealer portal.
 * @param {nlobjRequest} request Request object
 * @param {nlobjResponse} response Response object
 * @returns {Void} Any output is written via response object
 */
function GD_PendingBillPartOrdersPortlet_Suitelet(request, response)
{
	
	var form = nlapiCreateForm('', true);		
	var sublist = form.addSubList('custpage_list', 'list', 'Parts Order History: Shipped Parts Orders', null);
	
	var field = sublist.addField('custpage_id', 'text', 'Order #');
	field.setDisplayType('inline');
	
	field = sublist.addField('custpage_trandate', 'text', 'Date');
	field.setDisplayType('inline');
	
	field = sublist.addField('custpage_po', 'text', 'PO/Check Number');
	field.setDisplayType('inline');
	
	field = sublist.addField('custpage_memo', 'textarea', 'Memo');
	field.setDisplayType('inline');
	
	field = sublist.addField('custpage_total', 'currency', 'Amount');
	field.setDisplayType('inline');
	
	field = sublist.addField('custpage_status', 'text', 'Status');
	field.setDisplayType('inline');
	
	//create columns to return
	var cols = new Array();
	cols[cols.length] = new nlobjSearchColumn('tranid');
	cols[cols.length] = new nlobjSearchColumn('trandate')
	cols[cols.length] = new nlobjSearchColumn(UNIT_FIELD_NAME);
	cols[cols.length] = new nlobjSearchColumn('otherrefnum');
	cols[cols.length] = new nlobjSearchColumn('total');
	cols[cols.length] = new nlobjSearchColumn('memo');
	cols[cols.length] = new nlobjSearchColumn('status');
	
	//create filters
	var filters = new Array();
	filters[filters.length] = new nlobjSearchFilter('entity',null,'anyof', ['@CURRENT@']); //Filter: "Dealer is mine"
	filters[filters.length] = new nlobjSearchFilter(ORDER_TYPE_FIELD_NAME, null, 'anyof', [ORDERTYPE_PART]); //Filter: Order Type is Part
	//Commented out filters are in the saved search 'customsearchopenwebordersearch'
	//filters[filters.length] = new nlobjSearchFilter('mainline',null,'is',"T"); //Filter: "Mainline is true"
	//List should be filtered by status: current status filter configuration yields no results - Currently Commented out.
	//filters[filters.length] = new nlobjSearchFilter('status', null, 'anyof', 'open') ;//[WEB_ORDER_STATUS_OPEN]); //Filter: Order Status is Open

	//Now search for part web orders for this dealer.
	//Note: "customsearchopenwebordersearch" saved search returns all open web orders, and
	//      we are only interested in open part web orders for this dealer, hence the 2 filters above
	var results = nlapiSearchRecord('salesorder','customsearchpendingbillingsalesorders',filters, cols);
	if(results != null && results.length > 0) //Add results to the portlet
	{
		var postDomainURL = nlapiResolveURL('RECORD', 'salesorder', null, 'VIEW');
		for(var i = 0; i < results.length; i++)
		{
			var lineIndex = i + 1;					
			//If url after domain does not contains "?" (i.e, has no parameter) then set id as the first parameter, otherwise append id as the parameter
			var url = (postDomainURL.indexOf('?') == -1 ? checkoutDomainUrl + postDomainURL + '?id=' + results[i].getId() : checkoutDomainUrl + postDomainURL + '&id=' + results[i].getId());
			
			
			sublist.setLineItemValue('custpage_id', lineIndex, '<a href="'+ url + '" target="_parent">' + results[i].getValue('tranid') + '</a>');	
			sublist.setLineItemValue('custpage_trandate', lineIndex, results[i].getValue('trandate'));
			sublist.setLineItemValue('custpage_po', lineIndex, results[i].getValue('otherrefnum'));
			sublist.setLineItemValue('custpage_memo', lineIndex, results[i].getValue('memo'));
			sublist.setLineItemValue('custpage_total', lineIndex, results[i].getValue('total'));
			sublist.setLineItemValue('custpage_status', lineIndex, results[i].getText('status'));
		}
	}
	response.writePage(form);
}

/**
 * Suitelet that creates Pending Fulfillment Order Portlet for website dealer portal.
 * @param {nlobjRequest} request Request object
 * @param {nlobjResponse} response Response object
 * @returns {Void} Any output is written via response object
 */
function GD_PendFulfilPartOrdersPortlet_Suitelet(request, response)
{
	var form = nlapiCreateForm('', true);		
	var sublist = form.addSubList('custpage_list', 'list', 'Parts Order History: Confirmed Parts Orders', null);
	
	var field = sublist.addField('custpage_id', 'text', 'Order #');
	field.setDisplayType('inline');
	
	field = sublist.addField('custpage_trandate', 'text', 'Date');
	field.setDisplayType('inline');
	
	field = sublist.addField('custpage_po', 'text', 'PO/Check Number');
	field.setDisplayType('inline');
	
	field = sublist.addField('custpage_memo', 'textarea', 'Memo');
	field.setDisplayType('inline');
	
	field = sublist.addField('custpage_total', 'currency', 'Amount');
	field.setDisplayType('inline');
	
	field = sublist.addField('custpage_status', 'text', 'Status');
	field.setDisplayType('inline');
	
	//create columns to return
	var cols = new Array();
	cols[cols.length] = new nlobjSearchColumn('tranid');
	cols[cols.length] = new nlobjSearchColumn('trandate');
	cols[cols.length] = new nlobjSearchColumn(UNIT_FIELD_NAME);
	cols[cols.length] = new nlobjSearchColumn('otherrefnum');
	cols[cols.length] = new nlobjSearchColumn('total');
	cols[cols.length] = new nlobjSearchColumn('memo');
	cols[cols.length] = new nlobjSearchColumn('status');
	
	//create filters
	var filters = new Array();
	filters[filters.length] = new nlobjSearchFilter('entity',null,'anyof', ['@CURRENT@']); //Filter: "Dealer is mine"
	filters[filters.length] = new nlobjSearchFilter(ORDER_TYPE_FIELD_NAME, null, 'anyof', [ORDERTYPE_PART]); //Filter: Order Type is Part
	//Commented out filters are in the saved search 'customsearchopenwebordersearch'
	//filters[filters.length] = new nlobjSearchFilter('mainline',null,'is',"T"); //Filter: "Mainline is true"
	//List should be filtered by status: current status filter configuration yields no results - Currently Commented out.
	//filters[filters.length] = new nlobjSearchFilter('status', null, 'anyof', 'open') ;//[WEB_ORDER_STATUS_OPEN]); //Filter: Order Status is Open

	//Now search for part web orders for this dealer.
	//Note: "customsearchopenwebordersearch" saved search returns all open web orders, and+	
	//      we are only interested in open part web orders for this dealer, hence the 2 filters above
	var results = nlapiSearchRecord('salesorder','customsearchpendingfulfillmentsalesorder',filters, cols);
	if(results != null && results.length > 0) //Add results to the portlet
	{
		var postDomainURL = nlapiResolveURL('RECORD', 'salesorder', null, 'VIEW');
		for(var i = 0; i < results.length; i++)
		{
			var lineIndex = i + 1;	
			//If url after domain does not contains "?" (i.e, has no parameter) then set id as the first parameter, otherwise append id as the parameter
			var url = (postDomainURL.indexOf('?') == -1 ? checkoutDomainUrl + postDomainURL + '?id=' + results[i].getId() : checkoutDomainUrl + postDomainURL + '&id=' + results[i].getId());
			
			sublist.setLineItemValue('custpage_id', lineIndex, '<a href="'+ url + '" target="_parent">' + results[i].getValue('tranid') + '</a>');	
			sublist.setLineItemValue('custpage_trandate', lineIndex, results[i].getValue('trandate'));
			sublist.setLineItemValue('custpage_po', lineIndex, results[i].getValue('otherrefnum'));
			sublist.setLineItemValue('custpage_memo', lineIndex, results[i].getValue('memo'));
			sublist.setLineItemValue('custpage_total', lineIndex, results[i].getValue('total'));
			sublist.setLineItemValue('custpage_status', lineIndex, results[i].getText('status'));
		}
	}
	response.writePage(form);
}


/**
 * Creates recent open invoices portlet on the dealer portal.
 * @param {Object} portlet
 * @param {Object} column
 */
function GD_RecentOpenPartsInvPortlet_Suitelet(request, response)
{
	var form = nlapiCreateForm('', true);		
	var sublist = form.addSubList('custpage_list', 'list', 'Part Invoices: Open Invoices', null);
	
	var field = sublist.addField('custpage_id', 'text', 'Invoice #');
	field.setDisplayType('inline');
	
	field = sublist.addField('custpage_orderno', 'text', 'Order #');
	field.setDisplayType('inline');
	
	field = sublist.addField('custpage_trandate', 'text', 'Date');
	field.setDisplayType('inline');
	
	field = sublist.addField('custpage_po', 'text', 'PO/Check Number');
	field.setDisplayType('inline');
	
	field = sublist.addField('custpage_memo', 'textarea', 'Memo');
	field.setDisplayType('inline');
	
	field = sublist.addField('custpage_total', 'currency', 'Amount');
	field.setDisplayType('inline');
	
	field = sublist.addField('custpage_status', 'text', 'Status');
	field.setDisplayType('inline');

	
	//create columns to return
	var cols = new Array();
	cols[cols.length] = new nlobjSearchColumn('tranid');
	cols[cols.length] = new nlobjSearchColumn('trandate');
	cols[cols.length] = new nlobjSearchColumn('otherrefnum');
	cols[cols.length] = new nlobjSearchColumn('total');
	cols[cols.length] = new nlobjSearchColumn('memo');
	cols[cols.length] = new nlobjSearchColumn('status');
	cols[cols.length] = new nlobjSearchColumn('tranid', 'createdfrom');
	
	//create filters
	var filters = new Array();
	filters[filters.length] = new nlobjSearchFilter('entity',null,'anyof', ['@CURRENT@']); //Filter: "Dealer is mine"
	filters[filters.length] = new nlobjSearchFilter(ORDER_TYPE_FIELD_NAME, null, 'anyof', [ORDERTYPE_PART]); //Filter: Order Type is Part
	filters[filters.length] = new nlobjSearchFilter('mainline', null, 'is', 'T'); 
	
	//Now search for part web orders for this dealer.
	//Note: "customsearchopenwebordersearch" saved search returns all open web orders, and
	//      we are only interested in open part web orders for this dealer, hence the 2 filters above
	var results = nlapiSearchRecord('invoice','customsearchrecentopenpartsinvoices',filters, cols);
	if(results != null && results.length > 0) //Add results to the portlet
	{
		var postDomainURL = nlapiResolveURL('RECORD', 'invoice', null, 'VIEW');
		//var domainUrl = checkoutDomainUrl;
		for(var i = 0; i < results.length; i++)
		{
			var lineIndex = i + 1;
			//If url after domain does not contains "?" (i.e, has no parameter) then set id as the first parameter, otherwise append id as the parameter
			var url = (postDomainURL.indexOf('?') == -1 ? checkoutDomainUrl + postDomainURL + '?id=' + results[i].getId() : checkoutDomainUrl + postDomainURL + '&id=' + results[i].getId());
			
			sublist.setLineItemValue('custpage_id', lineIndex, '<a href="'+ url + '" target="_parent">' + results[i].getValue('tranid') + '</a>');	
			sublist.setLineItemValue('custpage_orderno', lineIndex, results[i].getValue('tranid', 'createdfrom'));
			sublist.setLineItemValue('custpage_trandate', lineIndex, results[i].getValue('trandate'));
			sublist.setLineItemValue('custpage_po', lineIndex, results[i].getValue('otherrefnum'));
			sublist.setLineItemValue('custpage_memo', lineIndex, results[i].getValue('memo'));
			sublist.setLineItemValue('custpage_total', lineIndex, results[i].getValue('total'));
			sublist.setLineItemValue('custpage_status', lineIndex, results[i].getText('status'));
		}
	}
	response.writePage(form);
}

/**
 * Creates recent open invoices portlet on the dealer portal.
 * @param {Object} portlet
 * @param {Object} column
 */
function GD_RecentPaidPartsInvPortlet_Suitelet(request, response)
{
	var form = nlapiCreateForm('', true);		
	var sublist = form.addSubList('custpage_list', 'list', 'Part Invoices: Recent Paid Invoices', null);
	
	var field = sublist.addField('custpage_id', 'text', 'Invoice #');
	field.setDisplayType('inline');
	
	field = sublist.addField('custpage_orderno', 'text', 'Order #');
	field.setDisplayType('inline');
	
	field = sublist.addField('custpage_trandate', 'text', 'Date');
	field.setDisplayType('inline');
	
	field = sublist.addField('custpage_po', 'text', 'PO/Check Number');
	field.setDisplayType('inline');
	
	field = sublist.addField('custpage_memo', 'textarea', 'Memo');
	field.setDisplayType('inline');
	
	field = sublist.addField('custpage_total', 'currency', 'Amount');
	field.setDisplayType('inline');
	
	field = sublist.addField('custpage_status', 'text', 'Status');
	field.setDisplayType('inline');

	
	//create columns to return
	var cols = new Array();
	cols[cols.length] = new nlobjSearchColumn('tranid');
	cols[cols.length] = new nlobjSearchColumn('trandate');
	cols[cols.length] = new nlobjSearchColumn('otherrefnum');
	cols[cols.length] = new nlobjSearchColumn('total');
	cols[cols.length] = new nlobjSearchColumn('memo');
	cols[cols.length] = new nlobjSearchColumn('status');
	cols[cols.length] = new nlobjSearchColumn('tranid', 'createdfrom');
	
	//create filters
	var filters = new Array();
	filters[filters.length] = new nlobjSearchFilter('entity',null,'anyof', ['@CURRENT@']); //Filter: "Dealer is mine"
	filters[filters.length] = new nlobjSearchFilter(ORDER_TYPE_FIELD_NAME, null, 'anyof', [ORDERTYPE_PART]); //Filter: Order Type is Part
	filters[filters.length] = new nlobjSearchFilter('mainline', null, 'is', 'T');
	
	//Now search for part web orders for this dealer.
	//Note: "customsearchopenwebordersearch" saved search returns all open web orders, and
	//      we are only interested in open part web orders for this dealer, hence the 2 filters above
	var results = nlapiSearchRecord('invoice','customsearchrecentpaidpartsinvoices',filters, cols);
	if(results != null && results.length > 0) //Add results to the portlet
	{
		var postDomainURL = nlapiResolveURL('RECORD', 'invoice', null, 'VIEW');
		//var domainUrl = checkoutDomainUrl;
		for(var i = 0; i < results.length; i++)
		{
			var lineIndex = i + 1;					
			//If url after domain does not contains "?" (i.e, has no parameter) then set id as the first parameter, otherwise append id as the parameter
			var url = (postDomainURL.indexOf('?') == -1 ? checkoutDomainUrl + postDomainURL + '?id=' + results[i].getId() : checkoutDomainUrl + postDomainURL + '&id=' + results[i].getId());
			
			sublist.setLineItemValue('custpage_id', lineIndex, '<a href="'+ url + '" target="_parent">' + results[i].getValue('tranid') + '</a>');	
			sublist.setLineItemValue('custpage_orderno', lineIndex, results[i].getValue('tranid', 'createdfrom'));
			sublist.setLineItemValue('custpage_trandate', lineIndex, results[i].getValue('trandate'));
			sublist.setLineItemValue('custpage_po', lineIndex, results[i].getValue('otherrefnum'));
			sublist.setLineItemValue('custpage_memo', lineIndex, results[i].getValue('memo'));
			sublist.setLineItemValue('custpage_total', lineIndex, results[i].getValue('total'));
			sublist.setLineItemValue('custpage_status', lineIndex, results[i].getText('status'));
		}
	}
	response.writePage(form);
}

/**
 * Creates answered Parts Inquiry portlet.
 * @param {Object} portlet
 * @param {Object} column
 */
function GD_AnsPartsInquiryPortlet_Suitelet(request, response)
{

	var form = nlapiCreateForm('', true);		
	var sublist = form.addSubList('custpage_list', 'list', 'Parts Inquiry: Answered', null);
	
	var field = sublist.addField('custpage_id', 'text', 'Parts Inquiry #');
	field.setDisplayType('inline');
	
	field = sublist.addField('custpage_unit', 'text', 'VIN');
	field.setDisplayType('inline');
	
	field = sublist.addField('custpage_dealer', 'text', 'Dealer');
	field.setDisplayType('inline');
	
	field = sublist.addField('custpage_requestor', 'text', 'Requestor');
	field.setDisplayType('inline');

	field = sublist.addField('custpage_status', 'text', 'Status');
	field.setDisplayType('inline');
	
	//create columns to return
	var cols = new Array();
	cols[cols.length] = new nlobjSearchColumn('internalid');
	cols[cols.length] = new nlobjSearchColumn('custrecordpartsinquiry_unit');
	cols[cols.length] = new nlobjSearchColumn('custrecordpartsinquiry_dealer');
	cols[cols.length] = new nlobjSearchColumn('custrecordpartsinquiry_requestor');
	cols[cols.length] = new nlobjSearchColumn('custrecordpartsinquiry_status');
	
	//create filters
	var filters = new Array();
	filters[filters.length] = new nlobjSearchFilter('custrecordpartsinquiry_dealer',null,'anyof', ['@CURRENT@']);
	filters[filters.length] = new nlobjSearchFilter('custrecordpartsinquiry_status', null, 'anyof', PARTS_INQUIRY_STATUS_ANSWERED);

	var results = nlapiSearchRecord('customrecordgranddesignpartsinquiry',null,filters, cols);
	if(results != null && results.length > 0) //Add results to the portlet
	{

		var postDomainURL = nlapiResolveURL('RECORD', PARTS_INQUIRY_RECORD_TYPE, null, 'VIEW');
		for(var i = 0; i < results.length; i++)
		{
			var lineIndex = i + 1;
					
			//If url after domain does not contains "?" (i.e, has no parameter) then set id as the first parameter, otherwise append id as the parameter
			var url = (postDomainURL.indexOf('?') == -1 ? checkoutDomainUrl + postDomainURL + '?id=' + results[i].getId() : checkoutDomainUrl + postDomainURL + '&id=' + results[i].getId());
			
			sublist.setLineItemValue('custpage_id', lineIndex, '<a href="'+ url + '" target="_parent">' + results[i].getId() + '</a>');	
			sublist.setLineItemValue('custpage_unit', lineIndex, results[i].getText('custrecordpartsinquiry_unit'));
			sublist.setLineItemValue('custpage_dealer', lineIndex, results[i].getText('custrecordpartsinquiry_dealer'));
			sublist.setLineItemValue('custpage_requestor', lineIndex, results[i].getText('custpage_requestor'));
			sublist.setLineItemValue('custpage_status', lineIndex, results[i].getText('status'));
		}
	}
	response.writePage(form);
}

/**
 * Creates answered Parts Inquiry portlet.
 * @param {Object} portlet
 * @param {Object} column
 */
function GD_SubmittedPartsInquiry_Suitelet(request, response)
{

	var form = nlapiCreateForm('', true);		
	var sublist = form.addSubList('custpage_list', 'list', 'Parts Inquiry: Submitted', null);
	
	var field = sublist.addField('custpage_id', 'text', 'Parts Inquiry #');
	field.setDisplayType('inline');
	
	field = sublist.addField('custpage_unit', 'text', 'VIN');
	field.setDisplayType('inline');
	
	field = sublist.addField('custpage_dealer', 'text', 'Dealer');
	field.setDisplayType('inline');
	
	field = sublist.addField('custpage_requestor', 'text', 'Requestor');
	field.setDisplayType('inline');

	field = sublist.addField('custpage_status', 'text', 'Status');
	field.setDisplayType('inline');
	
	//create columns to return
	var cols = new Array();
	cols[cols.length] = new nlobjSearchColumn('internalid');
	cols[cols.length] = new nlobjSearchColumn('custrecordpartsinquiry_unit');
	cols[cols.length] = new nlobjSearchColumn('custrecordpartsinquiry_dealer');
	cols[cols.length] = new nlobjSearchColumn('custrecordpartsinquiry_requestor');
	cols[cols.length] = new nlobjSearchColumn('custrecordpartsinquiry_status');
	
	//create filters
	var filters = new Array();
	filters[filters.length] = new nlobjSearchFilter('custrecordpartsinquiry_dealer',null,'anyof', ['@CURRENT@']);
	filters[filters.length] = new nlobjSearchFilter('custrecordpartsinquiry_status', null, 'anyof', PARTS_INQUIRY_STATUS_ANSWERED);

	var results = nlapiSearchRecord('customrecordgranddesignpartsinquiry',null,filters, cols);
	if(results != null && results.length > 0) //Add results to the portlet
	{

		var postDomainURL = nlapiResolveURL('RECORD', PARTS_INQUIRY_RECORD_TYPE, null, 'VIEW');
		for(var i = 0; i < results.length; i++)
		{
			var lineIndex = i + 1;
					
			//If url after domain does not contains "?" (i.e, has no parameter) then set id as the first parameter, otherwise append id as the parameter
			var url = (postDomainURL.indexOf('?') == -1 ? checkoutDomainUrl + postDomainURL + '?id=' + results[i].getId() : checkoutDomainUrl + postDomainURL + '&id=' + results[i].getId());
			
			sublist.setLineItemValue('custpage_id', lineIndex, '<a href="'+ url + '" target="_parent">' + results[i].getId() + '</a>');	
			sublist.setLineItemValue('custpage_unit', lineIndex, results[i].getText('custrecordpartsinquiry_unit'));
			sublist.setLineItemValue('custpage_dealer', lineIndex, results[i].getText('custrecordpartsinquiry_dealer'));
			sublist.setLineItemValue('custpage_requestor', lineIndex, results[i].getText('custpage_requestor'));
			sublist.setLineItemValue('custpage_status', lineIndex, results[i].getText('status'));
		}
	}
	response.writePage(form);
}
