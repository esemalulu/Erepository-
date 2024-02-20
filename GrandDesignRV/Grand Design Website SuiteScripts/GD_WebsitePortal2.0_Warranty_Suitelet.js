/**
 * Module Description
 * 
 * Version    Date            Author           Remarks
 * 1.00       20 Jun 2017     brians
 *
 */

/**
 * @param {nlobjRequest} request Request object
 * @param {nlobjResponse} response Response object
 * @returns {Void} Any output is written via response object
 */
function RVSWebsiteWarrantyClaimSuitelet(request, response){
	
	var form = nlapiCreateForm('', true);
	
	var HTMLfield = form.addField('custpage_warrantyhtml', 'inlinehtml', '');
	HTMLfield.setDisplayType('inline');
	
	var returnObj = {};
	
	var showClosed = request.getParameter('showclosed');

	if(showClosed == 'true')
		returnObj.showClosed = true;
	else
		returnObj.showClosed = false;
		
	var filters = new Array();
	filters.push(new nlobjSearchFilter('custrecordclaim_customer',null,'anyof', ['@CURRENT@'])); //Filter: "Dealer is mine"
	if(returnObj.showClosed)
		filters.push(new nlobjSearchFilter('custrecordclaim_status',null,'anyof', [CLAIM_STATUS_CLOSED, CLAIM_STATUS_PAID]));
	else
		filters.push(new nlobjSearchFilter('custrecordclaim_status',null,'noneof', [CLAIM_STATUS_CLOSED, CLAIM_STATUS_PAID]));
	
	var columns = new Array();
	columns.push(new nlobjSearchColumn('internalid').setSort(true));
	columns.push(new nlobjSearchColumn('custrecordclaim_requestor'));
	columns.push(new nlobjSearchColumn('custrecordclaim_preauthorization'));
	columns.push(new nlobjSearchColumn('custrecordclaim_unit'));
	columns.push(new nlobjSearchColumn('custrecordunit_series', 'custrecordclaim_unit'));
	columns.push(new nlobjSearchColumn('custrecordclaim_unitmodel'));
	columns.push(new nlobjSearchColumn('custrecordclaim_claimtotal'));
	columns.push(new nlobjSearchColumn('custrecordclaim_retailcustomername'));
	columns.push(new nlobjSearchColumn('custrecordclaim_status'));
	columns.push(new nlobjSearchColumn('custrecordclaim_dealerclaimnumber'));
	columns.push(new nlobjSearchColumn('created'));
	
	var results = GetSteppedSearchResults('customrecordrvsclaim', filters, columns, null);
	if(results != null && results.length > 0)
	{
		returnObj.claims = [];
		var claimObj = '';
		for(var i = 0; i < results.length; i++)
		{
			claimObj = {};
			claimObj.id = results[i].getId();
			claimObj.requestor = results[i].getText('custrecordclaim_requestor');
			claimObj.preauth = results[i].getText('custrecordclaim_preauthorization');
			claimObj.unit = results[i].getText('custrecordclaim_unit');
			claimObj.series = results[i].getText('custrecordunit_series', 'custrecordclaim_unit');
			claimObj.model = results[i].getText('custrecordclaim_unitmodel');
			claimObj.workOrder = results[i].getValue('custrecordclaim_dealerclaimnumber');
			claimObj.total = results[i].getValue('custrecordclaim_claimtotal');
			claimObj.customer = results[i].getValue('custrecordclaim_retailcustomername');
			claimObj.status = {"id":results[i].getValue('custrecordclaim_status'), "name": results[i].getText('custrecordclaim_status')};
			claimObj.date = results[i].getValue('created');
			returnObj.claims.push(claimObj);
		}
	}
	
	var context = nlapiGetContext();
	var acct = context.getCompany();
	var domain = nlapiGetContext().getSetting('SCRIPT', 'custscriptwebsitemyaccountdomainurl');
	
	returnObj.role = context.getRole();
	returnObj.recTypeId = GD_CLAIM_RECORDTYPE;
	returnObj.urlString = domain + '/app/common/custom/custrecordentry.nl?compid=' + acct + '&rectype=' + returnObj.recTypeId;
	
	var datafield = form.addField('custpage_warrantydata', 'inlinehtml', '');
	datafield.setDisplayType('inline');
	datafield.setDefaultValue('<div style="color: #fff; display:none;">' + JSON.stringify(returnObj) + '</div>');
	datafield.setLayoutType('outsidebelow', 'startrow');
	
	var html = '';
	html = buildHTMLFileLinks(RVS_BUNDLE_FILES_MODULE_RVSCOMMON) +
			   buildHTMLFileLinks(RVS_BUNDLE_FILES_MODULE_JQUERY) +
			   buildHTMLFileLinks(RVS_BUNDLE_FILES_MODULE_KNOCKOUT) + 
			   buildHTMLFileLinks(RVS_BUNDLE_FILES_MODULE_PORTAL) + 
			   buildHTMLFileLinks(RVS_BUNDLE_FILES_MODULE_PORTALCLAIM);
	HTMLfield.setDefaultValue(html);
	
	response.writePage(form);
}

/**
 * @param {nlobjRequest} request Request object
 * @param {nlobjResponse} response Response object
 * @returns {Void} Any output is written via response object
 */
function RVSWebsiteWarrantyPreAuthSuitelet(request, response){
	
	var form = nlapiCreateForm('', true);
	
	var HTMLfield = form.addField('custpage_warrantypreauthhtml', 'inlinehtml', '');
	HTMLfield.setDisplayType('inline');
	
	var returnObj = {};
	
	var filters = new Array();
	filters.push(new nlobjSearchFilter('custrecordpreauth_customer',null,'anyof', ['@CURRENT@'])); //Filter: "Dealer is mine"
	filters.push(new nlobjSearchFilter('custrecordpreauth_status',null,'noneof', [PRE_AUTH_STATUS_CLAIMED]));
	
	var columns = new Array();
	columns.push(new nlobjSearchColumn('internalid').setSort(true));
	columns.push(new nlobjSearchColumn('custrecordpreauth_requestor'));
	columns.push(new nlobjSearchColumn('custrecordpreauth_unit'));
	columns.push(new nlobjSearchColumn('custrecordunit_series', 'custrecordpreauth_unit'));
	columns.push(new nlobjSearchColumn('custrecordpreauth_model'));
	columns.push(new nlobjSearchColumn('custrecordpreauth_totalamount'));
	columns.push(new nlobjSearchColumn('custrecordpreauth_retailpurchasedate'));
	columns.push(new nlobjSearchColumn('custrecordpreauth_retailcustomername'));
	columns.push(new nlobjSearchColumn('custrecordpreauth_status'));
	columns.push(new nlobjSearchColumn('custrecordpreauth_dealerworkorder'));
	columns.push(new nlobjSearchColumn('created'));
	
	var results = GetSteppedSearchResults('customrecordrvspreauthorization', filters, columns, null);
	if(results != null && results.length > 0)
	{
		returnObj.preAuths = [];
		var preAuthObj = '';
		for(var i = 0; i < results.length; i++)
		{
			preAuthObj = {};
			preAuthObj.id = results[i].getId();
			preAuthObj.requestor = results[i].getText('custrecordpreauth_requestor');
			preAuthObj.unit = results[i].getText('custrecordpreauth_unit');
			preAuthObj.series = results[i].getText('custrecordunit_series', 'custrecordpreauth_unit');
			preAuthObj.model = results[i].getValue('custrecordpreauth_model');
			preAuthObj.workOrder = results[i].getValue('custrecordpreauth_dealerworkorder');
			preAuthObj.total = results[i].getValue('custrecordpreauth_totalamount');
			preAuthObj.purchaseDate = results[i].getValue('custrecordpreauth_retailpurchasedate');
			preAuthObj.customer = results[i].getValue('custrecordpreauth_retailcustomername');
			preAuthObj.status = {"id":results[i].getValue('custrecordpreauth_status'), "name": results[i].getText('custrecordpreauth_status')};
			preAuthObj.date = results[i].getValue('created');
			returnObj.preAuths.push(preAuthObj);
		}
	}

	var context = nlapiGetContext();
	var acct = context.getCompany();
	var domain = nlapiGetContext().getSetting('SCRIPT', 'custscriptwebsitemyaccountdomainurl');
	
	returnObj.role = context.getRole();
	returnObj.recTypeId = GD_PREAUTH_RECORDTYPE;
	returnObj.urlString = domain + '/app/common/custom/custrecordentry.nl?compid=' + acct + '&rectype=' + returnObj.recTypeId;
	
	var datafield = form.addField('custpage_warrantypreauthdata', 'inlinehtml', '');
	datafield.setDisplayType('inline');
	datafield.setDefaultValue('<div style="color: #FFF; display:none;">' + JSON.stringify(returnObj) + '</div>');
	datafield.setLayoutType('outsidebelow', 'startrow');
	
	var html = '';
	html = buildHTMLFileLinks(RVS_BUNDLE_FILES_MODULE_RVSCOMMON) +
			   buildHTMLFileLinks(RVS_BUNDLE_FILES_MODULE_JQUERY) +
			   buildHTMLFileLinks(RVS_BUNDLE_FILES_MODULE_KNOCKOUT) + 
			   buildHTMLFileLinks(RVS_BUNDLE_FILES_MODULE_PORTAL) + 
			   buildHTMLFileLinks(RVS_BUNDLE_FILES_MODULE_PORTALPREAUTH);
	HTMLfield.setDefaultValue(html);
	
	response.writePage(form);
}

/**
 * @param {nlobjRequest} request Request object
 * @param {nlobjResponse} response Response object
 * @returns {Void} Any output is written via response object
 */
function RVSWebsiteWarrantyFlatRateCodeSuitelet(request, response){
	
	var form = nlapiCreateForm('', true);
	
	var HTMLfield = form.addField('custpage_warrantyflatratecodehtml', 'inlinehtml', '');
	HTMLfield.setDisplayType('inline');
	
	var returnObj = {};
	
	var filters = new Array();
	filters.push(new nlobjSearchFilter('isinactive', null, 'is', 'F'));
	
	var columns = new Array();
	columns.push(new nlobjSearchColumn('name').setSort(true));
	columns.push(new nlobjSearchColumn('altname'));
	columns.push(new nlobjSearchColumn('custrecordflatratecode_maincategory'));
	columns.push(new nlobjSearchColumn('custrecordflatratecode_subcategory'));
	columns.push(new nlobjSearchColumn('custrecordflatratecodes_timeallowed'));
	columns.push(new nlobjSearchColumn('custrecordflatratecode_straighttime'));
	columns.push(new nlobjSearchColumn('custrecordflatratecode_par'));
	
	var results = GetSteppedSearchResults('customrecordrvsflatratecodes', filters, columns, null);
	if(results != null && results.length > 0)
	{
		returnObj.flatRateCodes = [];
		var flatRateCodeObj = {};

		for(var i = 0; i < results.length; i++)
		{
			flatRateCodeObj = {};
			flatRateCodeObj.id = results[i].getId();
			flatRateCodeObj.code = results[i].getValue('name');
			flatRateCodeObj.displayName = results[i].getValue('altname');
			flatRateCodeObj.mainCategory = {"id": results[i].getValue('custrecordflatratecode_maincategory'), "name": results[i].getText('custrecordflatratecode_maincategory')};
			flatRateCodeObj.subCategory = {"id": results[i].getValue('custrecordflatratecode_subcategory'), "name": results[i].getText('custrecordflatratecode_subcategory')};
			flatRateCodeObj.timeAllowed = results[i].getValue('custrecordflatratecodes_timeallowed');
			flatRateCodeObj.straightTime = results[i].getValue('custrecordflatratecode_straighttime');
			flatRateCodeObj.preAuthRequired = results[i].getText('custrecordflatratecode_par');
			returnObj.flatRateCodes.push(flatRateCodeObj);
		}
	}

	var context = nlapiGetContext();
	var acct = context.getCompany();
	var domain = nlapiGetContext().getSetting('SCRIPT', 'custscriptwebsitemyaccountdomainurl');
	
	returnObj.role = context.getRole();
	returnObj.recTypeId = GD_FLATRATECODE_RECORDTYPE;
	returnObj.urlString = domain + '/app/common/custom/custrecordentry.nl?compid=' + acct + '&rectype=' + returnObj.recTypeId;
	
	var datafield = form.addField('custpage_warrantyflatratecodedata', 'inlinehtml', '');
	datafield.setDisplayType('inline');
	datafield.setDefaultValue('<div style="color: #FFF; display:none;">' + JSON.stringify(returnObj) + '</div>');
	datafield.setLayoutType('outsidebelow', 'startrow');
	
	var html = '';
	html = buildHTMLFileLinks(RVS_BUNDLE_FILES_MODULE_RVSCOMMON) +
			   buildHTMLFileLinks(RVS_BUNDLE_FILES_MODULE_JQUERY) +
			   buildHTMLFileLinks(RVS_BUNDLE_FILES_MODULE_KNOCKOUT) + 
			   buildHTMLFileLinks(RVS_BUNDLE_FILES_MODULE_PORTAL) + 
			   buildHTMLFileLinks(RVS_BUNDLE_FILES_MODULE_PORTALFLATRATECODE);
	HTMLfield.setDefaultValue(html);
	
	response.writePage(form);
}