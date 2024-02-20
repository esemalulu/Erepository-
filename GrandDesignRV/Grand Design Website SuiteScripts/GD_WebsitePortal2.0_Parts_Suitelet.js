/**
 * Module Description
 * 
 * Version    Date            Author           Remarks
 * 1.00       6 Jul 2017     brians
 *
 */

/**
 * @param {nlobjRequest} request Request object
 * @param {nlobjResponse} response Response object
 * @returns {Void} Any output is written via response object
 */
function RVSWebsitePartsEstimateSuitelet(request, response){
	
	var form = nlapiCreateForm('', true);
	
	var dealerId = nlapiGetUser();
	var dealerGroupMembers = GetDealerGroupMembers(dealerId);
	
	var HTMLfield = form.addField('custpage_partshtml', 'inlinehtml', '');
	HTMLfield.setDisplayType('inline');
	
	var returnObj = {};
	
	var filters = new Array();
	filters.push(new nlobjSearchFilter('entity',null,'anyof', dealerId));
	//filters.push(new nlobjSearchFilter('entity',null,'anyof', dealerGroupMembers)); //dealer is any of the dealers in the dealer group of the logged in user
	filters.push(new nlobjSearchFilter('custbodyrvsordertype', null, 'anyof', [ORDERTYPE_PART]));
	filters.push(new nlobjSearchFilter('status', null, 'anyof', ['Estimate:A','Estimate:X']));
	filters.push(new nlobjSearchFilter('mainline', null, 'is', 'T'));
	
	var columns = new Array();
	columns.push(new nlobjSearchColumn('tranid').setSort(true));
	columns.push(new nlobjSearchColumn('trandate'));
	columns.push(new nlobjSearchColumn('otherrefnum'));
	columns.push(new nlobjSearchColumn('custbodyrvsunit'));
	columns.push(new nlobjSearchColumn('total'));
	columns.push(new nlobjSearchColumn('memo'));
	columns.push(new nlobjSearchColumn('status'));
	
	var results = GetSteppedSearchResults('estimate', filters, columns, null);
	if(results != null && results.length > 0)
	{
		returnObj.orders = [];
		var orderObj = '';
		for(var i = 0; i < results.length; i++)
		{
			orderObj = {};
			orderObj.id = results[i].getId();
			orderObj.tranid = results[i].getValue('tranid');
			orderObj.trandate = results[i].getValue('trandate');
			orderObj.poNumber = results[i].getValue('otherrefnum');
			orderObj.unit = results[i].getText('custbodyrvsunit');
			orderObj.total = results[i].getValue('total');
			orderObj.status = {"id":results[i].getValue('status'), "name": results[i].getText('status')};
			orderObj.memo = results[i].getValue('memo');
			returnObj.orders.push(orderObj);
		}
	}
	var context = nlapiGetContext();
	var acct = context.getCompany();
	var domain = context.getSetting('SCRIPT', 'custscriptwebsitemyaccountdomainurl');
	
	returnObj.role = context.getRole();
	returnObj.urlString = domain + nlapiResolveURL('SUITELET','customscriptgd_viewrecordinportal_suite','customdeploygd_viewrecordinportal_suite')+'&rectype=estimate';
	returnObj.returnAuthsUrlString = domain + '/app/common/search/searchresults.nl?compid=' + acct + '&searchid=1781';
	returnObj.creditMemosUrlString = domain + '/app/common/search/searchresults.nl?compid=' + acct + '&searchid=1861';
	
	var datafield = form.addField('custpage_partsdata', 'inlinehtml', '');
	datafield.setDisplayType('inline');
	datafield.setDefaultValue('<div style="color: #333; display:none;">' + JSON.stringify(returnObj) + '</div>');
	datafield.setLayoutType('outsidebelow', 'startrow');
	
	var html = '';
	html = buildHTMLFileLinks(RVS_BUNDLE_FILES_MODULE_RVSCOMMON) +
			   buildHTMLFileLinks(RVS_BUNDLE_FILES_MODULE_JQUERY) +
			   buildHTMLFileLinks(RVS_BUNDLE_FILES_MODULE_KNOCKOUT) + 
			   buildHTMLFileLinks(RVS_BUNDLE_FILES_MODULE_PORTAL) + 
			   buildHTMLFileLinks(RVS_BUNDLE_FILES_MODULE_PORTALESTIMATES);
	HTMLfield.setDefaultValue(html);
	
	response.writePage(form);
}

/**
 * @param {nlobjRequest} request Request object
 * @param {nlobjResponse} response Response object
 * @returns {Void} Any output is written via response object
 */
function RVSWebsitePartsOrdersSuitelet(request, response){
	
	var form = nlapiCreateForm('', true);
	
	var dealerId = nlapiGetUser();
	var dealerGroupMembers = GetDealerGroupMembers(dealerId);
	
	var HTMLfield = form.addField('custpage_partsordershtml', 'inlinehtml', '');
	HTMLfield.setDisplayType('inline');
	
	var returnObj = {};
	
	var filters = new Array();
	filters.push(new nlobjSearchFilter('entity',null,'anyof', dealerId));
	//filters.push(new nlobjSearchFilter('entity',null,'anyof', dealerGroupMembers)); //dealer is any of the dealers in the dealer group of the logged in user
	filters.push(new nlobjSearchFilter('custbodyrvsordertype', null, 'anyof', [ORDERTYPE_PART]));
	filters.push(new nlobjSearchFilter('trandate', null, 'onorafter', 'ninetyDaysAgo'));
	filters.push(new nlobjSearchFilter('mainline', null, 'is', 'T'));
	
	var columns = new Array();
	columns.push(new nlobjSearchColumn('tranid').setSort(true));
	columns.push(new nlobjSearchColumn('trandate'));
	columns.push(new nlobjSearchColumn('otherrefnum'));
	columns.push(new nlobjSearchColumn('custbodyrvsunit'));
	columns.push(new nlobjSearchColumn('total'));
	columns.push(new nlobjSearchColumn('memo'));
	columns.push(new nlobjSearchColumn('status'));
	columns.push(new nlobjSearchColumn('shipmethod'));
	columns.push(new nlobjSearchColumn('trackingnumbers'));
	
	returnObj.orders = [];
	returnObj.role = '';
	
	var results = GetSteppedSearchResults('salesorder', filters, columns, null);
	if(results != null && results.length > 0)
	{
		var orderObj = '';
		for(var i = 0; i < results.length; i++)
		{
			orderObj = {};
			orderObj.id = results[i].getId();
			orderObj.tranid = results[i].getValue('tranid');
			orderObj.trandate = results[i].getValue('trandate');
			orderObj.poNumber = results[i].getValue('otherrefnum');
			orderObj.unit = results[i].getText('custbodyrvsunit');
			orderObj.total = results[i].getValue('total');
			orderObj.status = {"id":results[i].getValue('status'), "name": results[i].getText('status')};
			orderObj.memo = results[i].getValue('memo');
			if(orderObj.memo.length > 25)
				orderObj.memo = orderObj.memo.slice(0,25) + ' ...';
			orderObj.method = results[i].getText('shipmethod');
			orderObj.tracking = results[i].getValue('trackingnumbers').replace(/<BR>/g, ',');
			if(orderObj.tracking.length > 18)
				orderObj.tracking = orderObj.tracking.split(',')[0] + ' ...';
			orderObj.invoice = '';
			returnObj.orders.push(orderObj);
		}
	}

	var context = nlapiGetContext();
	var acct = context.getCompany();
	var domain = context.getSetting('SCRIPT', 'custscriptwebsitemyaccountdomainurl');

	returnObj.urlString = domain + nlapiResolveURL('SUITELET','customscriptgd_viewrecordinportal_suite','customdeploygd_viewrecordinportal_suite')+'&rectype=salesorder';

	var datafield = form.addField('custpage_partsordersdata', 'inlinehtml', '');
	datafield.setDisplayType('inline');
	datafield.setDefaultValue('<div style="color: #333; display:none;">' + JSON.stringify(returnObj) + '</div>');
	datafield.setLayoutType('outsidebelow', 'startrow');
	
	var html = '';
	html = buildHTMLFileLinks(RVS_BUNDLE_FILES_MODULE_RVSCOMMON) +
			   buildHTMLFileLinks(RVS_BUNDLE_FILES_MODULE_JQUERY) +
			   buildHTMLFileLinks(RVS_BUNDLE_FILES_MODULE_KNOCKOUT) + 
			   buildHTMLFileLinks(RVS_BUNDLE_FILES_MODULE_PORTAL) + 
			   buildHTMLFileLinks(RVS_BUNDLE_FILES_MODULE_PORTALORDERS);
	HTMLfield.setDefaultValue(html);
	
	response.writePage(form);
}

/**
 * @param {nlobjRequest} request Request object
 * @param {nlobjResponse} response Response object
 * @returns {Void} Any output is written via response object
 */
function RVSWebsitePartsInvoicesSuitelet(request, response){
	
	var form = nlapiCreateForm('', true);		
	
	var dealerId = nlapiGetUser();
	var dealerGroupMembers = GetDealerGroupMembers(dealerId);
	
	var HTMLfield = form.addField('custpage_partsinvoiceshtml', 'inlinehtml', '');
	HTMLfield.setDisplayType('inline');
	
	var returnObj = {};
	
	var showClosed = request.getParameter('showclosed');

	if(showClosed == 'true')
		returnObj.showClosed = true;
	else
		returnObj.showClosed = false;
	
	var filters = new Array();
	filters.push(new nlobjSearchFilter('entity',null,'anyof', dealerId));
	//filters.push(new nlobjSearchFilter('entity',null,'anyof', dealerGroupMembers)); //dealer is any of the dealers in the dealer group of the logged in user
	filters.push(new nlobjSearchFilter('custbodyrvsordertype', null, 'anyof', [ORDERTYPE_PART]));
	filters.push(new nlobjSearchFilter('mainline', null, 'is', 'T'));
	if(returnObj.showClosed)
		filters.push(new nlobjSearchFilter('status',null,'anyof', ['CustInvc:B']));
	else
		filters.push(new nlobjSearchFilter('status',null,'noneof', ['CustInvc:B']));
	
	var columns = new Array();
	columns.push(new nlobjSearchColumn('tranid').setSort(true));
	columns.push(new nlobjSearchColumn('trandate'));
	columns.push(new nlobjSearchColumn('otherrefnum'));
	columns.push(new nlobjSearchColumn('custbodyrvsunit'));
	columns.push(new nlobjSearchColumn('total'));
	columns.push(new nlobjSearchColumn('memo'));
	columns.push(new nlobjSearchColumn('status'));
	columns.push(new nlobjSearchColumn('createdfrom'));
	
	returnObj.invoices = [];
	returnObj.role = '';
	
	var results = GetSteppedSearchResults('invoice', filters, columns, null);
	if(results != null && results.length > 0)
	{
		var invObj = '';
		for(var i = 0; i < results.length; i++)
		{
			invObj = {};
			invObj.id = results[i].getId();
			invObj.tranid = results[i].getValue('tranid');
			invObj.trandate = results[i].getValue('trandate');
			invObj.poNumber = results[i].getValue('otherrefnum');
			invObj.unit = results[i].getText('custbodyrvsunit');
			invObj.total = results[i].getValue('total');
			invObj.status = {"id":results[i].getValue('status'), "name": results[i].getText('status')};
			invObj.memo = results[i].getValue('memo');
			invObj.salesOrder = results[i].getText('createdfrom');
			returnObj.invoices.push(invObj);
		}
	}
	
	var context = nlapiGetContext();
	var acct = context.getCompany();
	var domain = context.getSetting('SCRIPT', 'custscriptwebsitemyaccountdomainurl');
	var dealerId = context.getUser();
	var userId = GetContactFromDealerAndEmail(dealerId, context.getEmail());

	returnObj.role = context.getRole();
	returnObj.urlString = domain + nlapiResolveURL('SUITELET','customscriptgd_viewrecordinportal_suite','customdeploygd_viewrecordinportal_suite') + '&rectype=invoice';							
	
	var datafield = form.addField('custpage_partsinvoicesdata', 'inlinehtml', '');
	datafield.setDisplayType('inline');
	datafield.setDefaultValue('<div style="color: #333; display:none;">' + JSON.stringify(returnObj) + '</div>');
	datafield.setLayoutType('outsidebelow', 'startrow');
	
	var html = '';
	html = buildHTMLFileLinks(RVS_BUNDLE_FILES_MODULE_RVSCOMMON) +
			   buildHTMLFileLinks(RVS_BUNDLE_FILES_MODULE_JQUERY) +
			   buildHTMLFileLinks(RVS_BUNDLE_FILES_MODULE_KNOCKOUT) + 
			   buildHTMLFileLinks(RVS_BUNDLE_FILES_MODULE_PORTAL) + 
			   buildHTMLFileLinks(RVS_BUNDLE_FILES_MODULE_PORTALINVOICES);
	HTMLfield.setDefaultValue(html);
	
	response.writePage(form);
}

/**
 * @param {nlobjRequest} request Request object
 * @param {nlobjResponse} response Response object
 * @returns {Void} Any output is written via response object
 */
function RVSWebsitePartsInquirySuitelet(request, response){
	
	var form = nlapiCreateForm('', true);		
	
	var dealerId = nlapiGetUser();
	var dealerGroupMembers = GetDealerGroupMembers(dealerId);
	
	var HTMLfield = form.addField('custpage_partsinquiryhtml', 'inlinehtml', '');
	HTMLfield.setDisplayType('inline');
	
	var returnObj = {};
	
	var showClosed = request.getParameter('showclosed');

	if(showClosed == 'true')
		returnObj.showClosed = true;
	else
		returnObj.showClosed = false;
	
	var filters = new Array();
	filters.push(new nlobjSearchFilter('custrecordpartsinquiry_dealer',null,'anyof', dealerId));
	//filters.push(new nlobjSearchFilter('custrecordpartsinquiry_dealer',null,'anyof', dealerGroupMembers)); //dealer is any of the dealers in the dealer group of the logged in user
	if(returnObj.showClosed)
		filters.push(new nlobjSearchFilter('custrecordpartsinquiry_status',null,'anyof', [GD_PARTSINQ_CLOSED]));
	else
		filters.push(new nlobjSearchFilter('custrecordpartsinquiry_status',null,'noneof', [GD_PARTSINQ_CLOSED]));
	
	var columns = new Array();
	columns.push(new nlobjSearchColumn('internalid').setSort(true));
	columns.push(new nlobjSearchColumn('custrecordpartsinquiry_unit'));
	columns.push(new nlobjSearchColumn('custrecordpartsinquiry_dealer'));
	columns.push(new nlobjSearchColumn('custrecordpartsinquiry_requestor'));
	columns.push(new nlobjSearchColumn('custrecordpartsinquiry_status'));
	
	returnObj.inquiries = [];
	returnObj.role = '';
	
	var results = GetSteppedSearchResults('customrecordgranddesignpartsinquiry', filters, columns, null);
	if(results != null && results.length > 0)
	{
		var inqObj = '';
		for(var i = 0; i < results.length; i++)
		{
			inqObj = {};
			inqObj.id = results[i].getId();
			inqObj.dealer = results[i].getValue('custrecordpartsinquiry_dealer');
			inqObj.requestor = results[i].getText('custrecordpartsinquiry_requestor');
			inqObj.unit = results[i].getText('custrecordpartsinquiry_unit');
			inqObj.status = {"id":results[i].getValue('custrecordpartsinquiry_status'), "name": results[i].getText('custrecordpartsinquiry_status')};
			returnObj.inquiries.push(inqObj);
		}
	}
	
	var context = nlapiGetContext();
	var acct = context.getCompany();
	var domain = context.getSetting('SCRIPT', 'custscriptwebsitemyaccountdomainurl');

	returnObj.role = context.getRole();
	returnObj.urlString = domain + '/app/common/custom/custrecordentry.nl?compid=' + acct + '&rectype=' + GD_PARTSINQ_RECORDTYPE;
	
	var datafield = form.addField('custpage_partsinquirydata', 'inlinehtml', '');
	datafield.setDisplayType('inline');
	datafield.setDefaultValue('<div style="color: #333; display:none;">' + JSON.stringify(returnObj) + '</div>');
	datafield.setLayoutType('outsidebelow', 'startrow');
	
	var html = '';
	html = buildHTMLFileLinks(RVS_BUNDLE_FILES_MODULE_RVSCOMMON) +
			   buildHTMLFileLinks(RVS_BUNDLE_FILES_MODULE_JQUERY) +
			   buildHTMLFileLinks(RVS_BUNDLE_FILES_MODULE_KNOCKOUT) + 
			   buildHTMLFileLinks(RVS_BUNDLE_FILES_MODULE_PORTAL) + 
			   buildHTMLFileLinks(RVS_BUNDLE_FILES_MODULE_PORTALINQUIRIES);
	HTMLfield.setDefaultValue(html);
	
	response.writePage(form);
}

/**
 * Shows a portlet that contains links to common parts tasks.
 */
function GetPartLinksSuitelet(request, response)
{
	 if (request.getMethod() == 'GET')
	 {
		 var context = nlapiGetContext();
		 var acct = context.getCompany();
		 var domain = context.getSetting('SCRIPT', 'custscriptwebsitemyaccountdomainurl');

		 var content = 
			"<style> a, a:visited {font-family: 'Open Sans', sans-serif; font-size: 1em; color: #337ab7; line-height: 150%;} </style>" +
			'<a style="padding-bottom: 3px;" target="_parent" href="' + domain + '/app/accounting/transactions/estimate.nl?compid=' + acct + '&cf=173">New Parts Order</a></br>' +
			'<a style="padding-bottom: 3px;" target="_parent" href="' + domain + '/app/common/custom/custrecordentry.nl?compid=' + acct + '&rectype='+GD_PARTSINQ_RECORDTYPE+'">New Parts Inquiry</a></br>';
		 
		 var role = nlapiGetRole();
		 if(role == ROLE_ADMIN || role == ROLE_GD_DC_FULLACCESS || role == ROLE_GD_DC_PARTS || role == ROLE_GD_DC_WARRANTYANDPARTS) 
		 {
			 content +=
			 '<a style="padding-bottom: 3px;" target="_parent" href="' + domain + '/s.nl/c.' + acct + '/sc.65/category.7748562/.f">View Return Authorizations</a></br>' +
			 '<a style="padding-bottom: 3px;" target="_parent" href="' + domain + '/s.nl/c.' + acct + '/sc.65/category.7748563/.f">View Credit Memos</a></br>';
		 }
		 response.write(content);
	 }
}