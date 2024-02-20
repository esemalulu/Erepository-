/**
 * Module Description
 * 
 * Version    Date            Author           Remarks
 * 1.00       29 Aug 2014     ibrahima
 *
 */
var WEB_ORDER_STATUS_OPEN = 'open';
var ORDER_TYPE_FIELD_NAME = 'custbodyrvsordertype';
var UNIT_FIELD_NAME = 'custbodyrvsunit';

//*************************** CLAIM PORTLETS ***************************//
/**
 * Creates Claim Links Suitelet.
 * @param {nlobjRequest} request Request object
 * @param {nlobjResponse} response Response object
 * @returns {Void} Any output is written via response object
 */
function GD_ClaimLinksPortlet_Suitelet(request, response)
{
	var form = nlapiCreateForm('', true);		
	var sublist = form.addSubList('custpage_claimlinks', 'list', 'Claim Links', null);
	
	var field = sublist.addField('custpage_claimlinks', 'text', ' ');
	field.setDisplayType('inline');

	var claimURL = GetWebsiteMyAccountDomainURL() + nlapiResolveURL('RECORD',CLAIM_RECORD_TYPE,null,null); 
	var recType = GetURLParameter(claimURL, 'rectype');	
	sublist.setLineItemValue('custpage_claimlinks', 1, '<a href="' + claimURL + '" target="_parent">New Claim</a>');
	sublist.setLineItemValue('custpage_claimlinks', 2, '<a href="' + GetWebsiteMyAccountDomainURL() + GetCustomRecordListURL(recType) + '" target="_parent">Claim List</a>');
	response.writePage(form);
	
}

/**
 * Gets Claim Overview Portlet.
 * @param request
 * @param response
 */
function GD_ClaimOverviewPortlet_Suitelet(request, response)
{
	var form = nlapiCreateForm('', true);		
	var sublist = form.addSubList('custpage_claimoverview', 'list', 'Claim Overview', null);
	
	var field = sublist.addField('custpage_claimcount', 'text', ' ');
	field.setDisplayType('inline');
	
	var results = null;
	//create columns to return
	var cols = new Array();
	cols[cols.length] = new nlobjSearchColumn('internalid');
	//create filters
	var filters = new Array();
	filters[0] = new nlobjSearchFilter('custrecordclaim_customer',null,'anyof', ['@CURRENT@']); //Filter: "Dealer is mine"
	
	//Get Open Claims
	filters[1] = new nlobjSearchFilter('custrecordclaim_status',null,'anyof', [PRE_AUTH_STATUS_OPEN]);
	results = nlapiSearchRecord(CLAIM_RECORD_TYPE,null, filters, cols);
	var numOfResults =  'Open Claims: ';
	numOfResults += (results != null ? results.length : 0);
	
	sublist.setLineItemValue('custpage_claimcount', 1, numOfResults);
	
	//Get Approved claims
	filters[1] = new nlobjSearchFilter('custrecordclaim_status',null,'anyof', [CLAIM_STATUS_APPROVED]); 	
	results = nlapiSearchRecord(CLAIM_RECORD_TYPE,null, filters, cols); 
	numOfResults =  'Approved Claims: ';
	numOfResults += (results != null ? results.length : 0);
	sublist.setLineItemValue('custpage_claimcount', 2, numOfResults);
		
	//Get Rejected claims
	filters[1] = new nlobjSearchFilter('custrecordclaim_status',null,'anyof', [CLAIM_STATUS_REJECTED]); 	
	results = nlapiSearchRecord(CLAIM_RECORD_TYPE,null, filters, cols); 
	numOfResults =  'Rejected Claims: ';
	numOfResults += (results != null ? results.length : 0);
	sublist.setLineItemValue('custpage_claimcount', 3, numOfResults);
		
	//Get Pending Part Return claims
	filters[1] = new nlobjSearchFilter('custrecordclaim_status',null,'anyof', [CLAIM_STATUS_PENDING_PART_RETURN]); 	
	results = nlapiSearchRecord(CLAIM_RECORD_TYPE,null, filters, cols); 
	numOfResults =  'Pending Part Return Claims (last 60 days): ';
	numOfResults += (results != null ? results.length : 0);
	sublist.setLineItemValue('custpage_claimcount', 4, numOfResults);				
	
	response.writePage(form);
}


/**
 * Creates Claim Feedback Required Suitelet.
 * @param {nlobjRequest} request Request object
 * @param {nlobjResponse} response Response object
 * @returns {Void} Any output is written via response object
 */
function GD_ClaimFeedbackRequiredPortlet_Suitelet(request, response)
{
	var form = nlapiCreateForm('', true);		
	
	var sublist = form.addSubList('custpage_claimfeedbackreq', 'list', 'Claim: Feedback Required', null);
	
	var field = sublist.addField('custpage_claimid', 'text', 'Claim #');
	field.setDisplayType('inline');
	
	field = sublist.addField('custpage_requestor', 'text', 'Requestor');
	field.setDisplayType('inline');
	
	field = sublist.addField('custpage_model', 'text', 'Model');
	field.setDisplayType('inline');
	
	field = sublist.addField('custpage_serialnum', 'text', 'Serial #');
	field.setDisplayType('inline');
	
	field = sublist.addField('custpage_dealerclaimnumber', 'text', 'Dealer Work Ord #');
	field.setDisplayType('inline');
	
	field = sublist.addField('custpage_claimtotal', 'currency', 'Claim Total');
	field.setDisplayType('inline');

	var cols = new Array();
	cols[cols.length] = new nlobjSearchColumn('internalid');
	cols[cols.length] = new nlobjSearchColumn('custrecordclaim_requestor');
	cols[cols.length] = new nlobjSearchColumn('custrecordclaim_unitmodel');
	cols[cols.length] = new nlobjSearchColumn('custrecordclaim_unitserialnumber');
	cols[cols.length] = new nlobjSearchColumn('custrecordclaim_claimtotal');
	cols[cols.length] = new nlobjSearchColumn('custrecordclaim_dealerclaimnumber');
	
	//create filters
	var filters = new Array();
	filters[filters.length] = new nlobjSearchFilter('custrecordclaim_customer',null,'anyof', ['@CURRENT@']); //Filter: "Dealer is mine"
	filters[filters.length] = new nlobjSearchFilter('custrecordclaim_status',null,'anyof', [CLAIM_STAUS_FEEDBACK_REQUIRED]); //Filter: "Status is Feedback Required"
	
	//Now search for claims
	var results = nlapiSearchRecord(CLAIM_RECORD_TYPE,null,filters, cols);
	
	if(results != null && results.length > 0) //Add results to the portlet
	{
		for(var i = 0; i < results.length; i++)
		{
			var lineIndex = i + 1;
			var url = GetWebsiteMyAccountDomainURL() + nlapiResolveURL('RECORD', CLAIM_RECORD_TYPE, null, 'VIEW') + '&id=' + results[i].getId();
			
			sublist.setLineItemValue('custpage_claimid', lineIndex, '<a href="'+ url + '" target="_parent">' + results[i].getId() + '</a>');	
			sublist.setLineItemValue('custpage_requestor', lineIndex, results[i].getText('custrecordclaim_requestor'));
			sublist.setLineItemValue('custpage_model', lineIndex, results[i].getText('custrecordclaim_unitmodel'));
			sublist.setLineItemValue('custpage_serialnum', lineIndex, results[i].getValue('custrecordclaim_unitserialnumber'));
			sublist.setLineItemValue('custpage_dealerclaimnumber', lineIndex, results[i].getValue('custrecordclaim_dealerclaimnumber'));
			sublist.setLineItemValue('custpage_claimtotal', lineIndex, results[i].getValue('custrecordclaim_claimtotal'));
		}
	}
	
	response.writePage(form);
	
}


/**
 * Creates Claim Feedback Required Suitelet.
 * @param {nlobjRequest} request Request object
 * @param {nlobjResponse} response Response object
 * @returns {Void} Any output is written via response object
 */
function GD_ClaimPendingPartRetPortlet_Suitelet(request, response)
{
	var form = nlapiCreateForm('', true);		
	var sublist = form.addSubList('custpage_claimpendingpartret', 'list', 'Claim: Pending Part Return in the last 60 days', null);
	
	var field = sublist.addField('custpage_claimid', 'text', 'Claim #');
	field.setDisplayType('inline');
	
	field = sublist.addField('custpage_requestor', 'text', 'Requestor');
	field.setDisplayType('inline');
	
	field = sublist.addField('custpage_model', 'text', 'Model');
	field.setDisplayType('inline');
	
	field = sublist.addField('custpage_serialnum', 'text', 'Serial #');
	field.setDisplayType('inline');
	
	field = sublist.addField('custpage_dealerclaimnumber', 'text', 'Dealer Work Ord #');
	field.setDisplayType('inline');
	
	field = sublist.addField('custpage_claimtotal', 'currency', 'Claim Total');
	field.setDisplayType('inline');
	
	//create columns to return
	var cols = new Array();
	cols[cols.length] = new nlobjSearchColumn('internalid');
	cols[cols.length] = new nlobjSearchColumn('custrecordclaim_requestor');
	cols[cols.length] = new nlobjSearchColumn('custrecordclaim_unitmodel');
	cols[cols.length] = new nlobjSearchColumn('custrecordclaim_unitserialnumber');
	cols[cols.length] = new nlobjSearchColumn('custrecordclaim_claimtotal');
	cols[cols.length] = new nlobjSearchColumn('custrecordclaim_dealerclaimnumber');
	
	//create filters
	var filters = new Array();
	filters[filters.length] = new nlobjSearchFilter('custrecordclaim_customer',null,'anyof', ['@CURRENT@']); //Filter: "Dealer is mine"
	filters[filters.length] = new nlobjSearchFilter('custrecordclaim_status',null,'anyof', [CLAIM_STATUS_PENDING_PART_RETURN]); //Filter: "Status is Feedback Required"
	filters[filters.length] = new nlobjSearchFilter('lastmodified',null,'onOrAfter', 'daysAgo60');
	
	//Now search for claims
	var results = nlapiSearchRecord(CLAIM_RECORD_TYPE,null,filters, cols);
	
	if(results != null && results.length > 0) //Add results to the portlet
	{
		for(var i = 0; i < results.length; i++)
		{
			var lineIndex = i + 1;
			var url = GetWebsiteMyAccountDomainURL() + nlapiResolveURL('RECORD', CLAIM_RECORD_TYPE, null, 'VIEW') + '&id=' + results[i].getId();
			
			sublist.setLineItemValue('custpage_claimid', lineIndex, '<a href="'+ url + '" target="_parent">' + results[i].getId() + '</a>');	
			sublist.setLineItemValue('custpage_requestor', lineIndex, results[i].getText('custrecordclaim_requestor'));
			sublist.setLineItemValue('custpage_model', lineIndex, results[i].getText('custrecordclaim_unitmodel'));
			sublist.setLineItemValue('custpage_serialnum', lineIndex, results[i].getValue('custrecordclaim_unitserialnumber'));
			sublist.setLineItemValue('custpage_dealerclaimnumber', lineIndex, results[i].getValue('custrecordclaim_dealerclaimnumber'));
			sublist.setLineItemValue('custpage_claimtotal', lineIndex, results[i].getValue('custrecordclaim_claimtotal'));
		}
	}
	response.writePage(form);
	
}

//******************************** END OF CLAIM PORTLETS ******************************** //



//********************************* PRE-AUTH PORTLETS **********************************//

/**
 * Suitelet that creates New/List links portlet for pre-Auths.
 * @param {Object} portlet
 * @param {Object} column
 */
function GD_PreAuthLinksPortlet_Suitelet(request, response)
{

	var form = nlapiCreateForm('', true);		
	var sublist = form.addSubList('custpage_claimlinks', 'list', 'Pre-Auth Links', null);
	
	var field = sublist.addField('custpage_links', 'text', ' ');
	field.setDisplayType('inline');

	var preAuthURL = GetWebsiteMyAccountDomainURL() + nlapiResolveURL('RECORD',PRE_AUTH_RECORD_TYPE,null,null); 
	var recType = GetURLParameter(preAuthURL, 'rectype');	
	sublist.setLineItemValue('custpage_links', 1, '<a href="' + preAuthURL + '" target="_parent">New Pre-Auth</a>');
	sublist.setLineItemValue('custpage_links', 2, '<a href="' + GetWebsiteMyAccountDomainURL() + GetCustomRecordListURL(recType) + '" target="_parent">Pre-Auth List</a>');
	response.writePage(form);
}



/**
 * Suitelet that creates  Preauthorization overview portlet.
 * @param {Object} portlet
 * @param {Object} column
 */
function GD_PreAuthOverviewPortlet_Suitelet(request, response) 
{
	var form = nlapiCreateForm('', true);		
	var sublist = form.addSubList('custpage_preauthoverview', 'list', 'Pre-Auth Overview', null);
	
	var field = sublist.addField('custpage_preauthcount', 'text', ' ');
	field.setDisplayType('inline');
	
	//column param can be: 1 = LEFT, 2 = MIDDLE, OR 3 = RIGHT.
	//This is where the portlet is shown on the page. This param is passed in 
	//automatically depending on where user drags the portlet on the page.
	var results = null;

	//create columns to return
	var cols = new Array();
	cols[cols.length] = new nlobjSearchColumn('internalid');
	//create filters
	var filters = new Array();
	filters[0] = new nlobjSearchFilter('custrecordpreauth_customer',null,'anyof', ['@CURRENT@']); //Filter: "Dealer is mine"
	
	//Get Open Pre-Auths
	filters[1] = new nlobjSearchFilter('custrecordpreauth_status',null,'anyof', [PRE_AUTH_STATUS_OPEN]);
	results = nlapiSearchRecord(PRE_AUTH_RECORD_TYPE,null, filters, cols);
	var numOfResults =  'Open Pre-Auths: ';
	numOfResults += (results != null ? results.length : 0);
	sublist.setLineItemValue('custpage_preauthcount', 1, numOfResults);
	
	//Get Approved PreAuths
	filters[1] = new nlobjSearchFilter('custrecordpreauth_status',null,'anyof', [PRE_AUTH_STATUS_APPROVED]); 	
	results = nlapiSearchRecord(PRE_AUTH_RECORD_TYPE,null, filters, cols); 
	numOfResults =  'Approved Pre-Auths: ';
	numOfResults += (results != null ? results.length : 0);
	sublist.setLineItemValue('custpage_preauthcount', 2, numOfResults);
		
	//Get Claimed PreAuths
	filters[1] = new nlobjSearchFilter('custrecordpreauth_status',null,'anyof', [PRE_AUTH_STATUS_CLAIMED]); 	
	results = nlapiSearchRecord(PRE_AUTH_RECORD_TYPE,null, filters, cols); 
	numOfResults =  'Claimed Pre-Auths: ';
	numOfResults += (results != null ? results.length : 0);
	sublist.setLineItemValue('custpage_preauthcount', 3, numOfResults);
		
	//Get Denied PreAuths
	filters[1] = new nlobjSearchFilter('custrecordpreauth_status',null,'anyof', [PRE_AUTH_STATUS_DENIED]); 	
	results = nlapiSearchRecord(PRE_AUTH_RECORD_TYPE,null, filters, cols); 
	numOfResults =  'Denied Pre-Auths (last 60 days): ';
	numOfResults += (results != null ? results.length : 0);
	sublist.setLineItemValue('custpage_preauthcount', 4, numOfResults);
		
	//Get Pending PreAuths
	filters[1] = new nlobjSearchFilter('custrecordpreauth_status',null,'anyof', [PRE_AUTH_STATUS_PENDING]); 	
	results = nlapiSearchRecord(PRE_AUTH_RECORD_TYPE,null, filters, cols); 
	numOfResults =  'Pending Pre-Auths: ';
	numOfResults += (results != null ? results.length : 0);
	sublist.setLineItemValue('custpage_preauthcount', 5, numOfResults);	
		
	//Get Pending Approval PreAuths
	filters[1] = new nlobjSearchFilter('custrecordpreauth_status',null,'anyof', [PRE_AUTH_STATUS_PENDING_APPROVAL]); 	
	results = nlapiSearchRecord(PRE_AUTH_RECORD_TYPE,null, filters, cols); 
	numOfResults =  'Pending Approval Pre-Auths: ';
	numOfResults += (results != null ? results.length : 0);
	sublist.setLineItemValue('custpage_preauthcount', 6, numOfResults);	
		
	//Get Approved w Modifications PreAuths
	filters[1] = new nlobjSearchFilter('custrecordpreauth_status',null,'anyof', [PRE_AUTH_STATUS_APPROVED_WITH_MOD]); 	
	results = nlapiSearchRecord(PRE_AUTH_RECORD_TYPE,null, filters, cols); 
	numOfResults =  'Approved w/ Mods Pre-Auths: ';
	numOfResults += (results != null ? results.length : 0);
	sublist.setLineItemValue('custpage_preauthcount', 7, numOfResults);				

	response.writePage(form);
}



/**
 * Suitelet that creates Pre Auth list portlet on the dealer portal.
 * @param {Object} portlet
 * @param {Object} column
 */
function GD_PendingOrOpenPreAuthsPortlet_Suitelet(request, response) 
{
	var form = nlapiCreateForm('', true);		
	var sublist = form.addSubList('custpage_preauthlist', 'list', 'Pre-Auth: Pending/Open', null);
	
	var field = sublist.addField('custpage_id', 'text', 'Pre-Auth #');
	field.setDisplayType('inline');
	
	field = sublist.addField('custpage_requestor', 'text', 'Requestor');
	field.setDisplayType('inline');
	
	field = sublist.addField('custpage_model', 'text', 'Model');
	field.setDisplayType('inline');
	
	field = sublist.addField('custpage_series', 'text', 'Series');
	field.setDisplayType('inline');
	
	field = sublist.addField('custpage_status', 'text', 'Status');
	field.setDisplayType('inline');
	
	field = sublist.addField('custpage_dealerclaimnumber', 'text', 'Dealer Work Ord #');
	field.setDisplayType('inline');
	
	//create columns to return
	var cols = new Array();
	cols[cols.length] = new nlobjSearchColumn('internalid');
	cols[cols.length] = new nlobjSearchColumn('custrecordpreauth_requestor');
	cols[cols.length] = new nlobjSearchColumn('custrecordpreauth_unit');
	cols[cols.length] = new nlobjSearchColumn('custrecordpreauth_model');
	cols[cols.length] = new nlobjSearchColumn('custrecordpreauth_series');
	cols[cols.length] = new nlobjSearchColumn('custrecordpreauth_status');
	cols[cols.length] = new nlobjSearchColumn('custrecordpreauth_dealerworkorder');
	
	//create filters
	var filters = new Array();
	filters[filters.length] = new nlobjSearchFilter('custrecordpreauth_customer',null,'anyof', ['@CURRENT@']); //Filter: "Dealer is mine"
	filters[filters.length] = new nlobjSearchFilter('custrecordpreauth_status',null,'anyof', [PRE_AUTH_STATUS_PENDING, PRE_AUTH_STATUS_OPEN]); //Filter: "Status is Pending"

	//Now search for pre_auths
	var results = nlapiSearchRecord(PRE_AUTH_RECORD_TYPE,null,filters, cols);
	if(results != null && results.length > 0) //Add results to the portlet
	{
		for(var i = 0; i < results.length; i++)
		{
			var lineIndex = i + 1;
			var url = GetWebsiteMyAccountDomainURL() + nlapiResolveURL('RECORD', PRE_AUTH_RECORD_TYPE, null, 'VIEW') + '&id=' + results[i].getId();
			
			sublist.setLineItemValue('custpage_id', lineIndex, '<a href="'+ url + '" target="_parent">' + results[i].getId() + '</a>');	
			sublist.setLineItemValue('custpage_requestor', lineIndex, results[i].getText('custrecordpreauth_requestor'));
			sublist.setLineItemValue('custpage_model', lineIndex, results[i].getText('custrecordpreauth_model'));
			sublist.setLineItemValue('custpage_series', lineIndex, results[i].getText('custrecordpreauth_series'));
			sublist.setLineItemValue('custpage_status', lineIndex, results[i].getText('custrecordpreauth_status'));
			sublist.setLineItemValue('custpage_dealerclaimnumber', lineIndex, results[i].getValue('custrecordpreauth_dealerworkorder'));
		}
	}
	response.writePage(form);
	
}


/**
 * Suitelet that creates Denied Pre Auth list portlet on the dealer portal.
 * @param {Object} portlet
 * @param {Object} column
 */
function GD_DeniedPreAuthsPortlet_Suitelet(request, response) 
{
	var form = nlapiCreateForm('', true);		
	var sublist = form.addSubList('custpage_preauthlist', 'list', 'Pre-Auth: Denied within last 60 days', null);
	
	var field = sublist.addField('custpage_id', 'text', 'Pre-Auth #');
	field.setDisplayType('inline');
	
	field = sublist.addField('custpage_requestor', 'text', 'Requestor');
	field.setDisplayType('inline');
	
	field = sublist.addField('custpage_model', 'text', 'Model');
	field.setDisplayType('inline');
	
	field = sublist.addField('custpage_series', 'text', 'Series');
	field.setDisplayType('inline');
	
	field = sublist.addField('custpage_status', 'text', 'Status');
	field.setDisplayType('inline');
	
	field = sublist.addField('custpage_dealerclaimnumber', 'text', 'Dealer Work Ord #');
	field.setDisplayType('inline');
	
	//create columns to return
	var cols = new Array();
	cols[cols.length] = new nlobjSearchColumn('internalid');
	cols[cols.length] = new nlobjSearchColumn('custrecordpreauth_requestor');
	cols[cols.length] = new nlobjSearchColumn('custrecordpreauth_unit');
	cols[cols.length] = new nlobjSearchColumn('custrecordpreauth_model');
	cols[cols.length] = new nlobjSearchColumn('custrecordpreauth_series');
	cols[cols.length] = new nlobjSearchColumn('custrecordpreauth_status');
	cols[cols.length] = new nlobjSearchColumn('custrecordpreauth_dealerworkorder');
	
	//create filters
	var filters = new Array();
	filters[filters.length] = new nlobjSearchFilter('custrecordpreauth_customer',null,'anyof', ['@CURRENT@']); //Filter: "Dealer is mine"
	filters[filters.length] = new nlobjSearchFilter('custrecordpreauth_status',null,'anyof', [PRE_AUTH_STATUS_DENIED]);
	filters[filters.length] = new nlobjSearchFilter('lastmodified',null,'onOrAfter', 'daysAgo60');

	//Now search for pre_auths
	var results = nlapiSearchRecord(PRE_AUTH_RECORD_TYPE,null,filters, cols);
	if(results != null && results.length > 0) //Add results to the portlet
	{
		for(var i = 0; i < results.length; i++)
		{
			var lineIndex = i + 1;
			var url = GetWebsiteMyAccountDomainURL() + nlapiResolveURL('RECORD', PRE_AUTH_RECORD_TYPE, null, 'VIEW') + '&id=' + results[i].getId();
			
			sublist.setLineItemValue('custpage_id', lineIndex, '<a href="'+ url + '" target="_parent">' + results[i].getId() + '</a>');	
			sublist.setLineItemValue('custpage_requestor', lineIndex, results[i].getText('custrecordpreauth_requestor'));
			sublist.setLineItemValue('custpage_model', lineIndex, results[i].getText('custrecordpreauth_model'));
			sublist.setLineItemValue('custpage_series', lineIndex, results[i].getText('custrecordpreauth_series'));
			sublist.setLineItemValue('custpage_status', lineIndex, results[i].getText('custrecordpreauth_status'));
			sublist.setLineItemValue('custpage_dealerclaimnumber', lineIndex, results[i].getValue('custrecordpreauth_dealerworkorder'));
		}
	}
	response.writePage(form);
	
}


/**
 * Suitelet that creates Approved Pre Auth list portlet on the dealer portal.
 * @param {Object} portlet
 * @param {Object} column
 */
function GD_ApprovedPreAuthsPortlet_Suitelet(request, response) 
{
	var form = nlapiCreateForm('', true);		
	var sublist = form.addSubList('custpage_preauthlist', 'list', 'Pre-Auth: Approved', null);
	
	var field = sublist.addField('custpage_id', 'text', 'Pre-Auth #');
	field.setDisplayType('inline');
	
	field = sublist.addField('custpage_requestor', 'text', 'Requestor');
	field.setDisplayType('inline');
	
	field = sublist.addField('custpage_model', 'text', 'Model');
	field.setDisplayType('inline');
	
	field = sublist.addField('custpage_series', 'text', 'Series');
	field.setDisplayType('inline');
	
	field = sublist.addField('custpage_status', 'text', 'Status');
	field.setDisplayType('inline');
	
	field = sublist.addField('custpage_dealerclaimnumber', 'text', 'Dealer Work Ord #');
	field.setDisplayType('inline');
	
	//create columns to return
	var cols = new Array();
	cols[cols.length] = new nlobjSearchColumn('internalid');
	cols[cols.length] = new nlobjSearchColumn('custrecordpreauth_requestor');
	cols[cols.length] = new nlobjSearchColumn('custrecordpreauth_unit');
	cols[cols.length] = new nlobjSearchColumn('custrecordpreauth_model');
	cols[cols.length] = new nlobjSearchColumn('custrecordpreauth_series');
	cols[cols.length] = new nlobjSearchColumn('custrecordpreauth_status');
	cols[cols.length] = new nlobjSearchColumn('custrecordpreauth_dealerworkorder');
	
	//create filters
	var filters = new Array();
	filters[filters.length] = new nlobjSearchFilter('custrecordpreauth_customer',null,'anyof', ['@CURRENT@']); //Filter: "Dealer is mine"
	filters[filters.length] = new nlobjSearchFilter('custrecordpreauth_status',null,'anyof', [PRE_AUTH_STATUS_APPROVED, PRE_AUTH_STATUS_APPROVED_WITH_MOD, PRE_AUTH_STATUS_PARTIALLY_CLAIMED]);

	//Now search for pre_auths
	var results = nlapiSearchRecord(PRE_AUTH_RECORD_TYPE,null,filters, cols);
	if(results != null && results.length > 0) //Add results to the portlet
	{
		for(var i = 0; i < results.length; i++)
		{
			var lineIndex = i + 1;
			var url = GetWebsiteMyAccountDomainURL() + nlapiResolveURL('RECORD', PRE_AUTH_RECORD_TYPE, null, 'VIEW') + '&id=' + results[i].getId();
			
			sublist.setLineItemValue('custpage_id', lineIndex, '<a href="'+ url + '" target="_parent">' + results[i].getId() + '</a>');	
			sublist.setLineItemValue('custpage_requestor', lineIndex, results[i].getText('custrecordpreauth_requestor'));
			sublist.setLineItemValue('custpage_model', lineIndex, results[i].getText('custrecordpreauth_model'));
			sublist.setLineItemValue('custpage_series', lineIndex, results[i].getText('custrecordpreauth_series'));
			sublist.setLineItemValue('custpage_status', lineIndex, results[i].getText('custrecordpreauth_status'));
			sublist.setLineItemValue('custpage_dealerclaimnumber', lineIndex, results[i].getValue('custrecordpreauth_dealerworkorder'));
		}
	}
	response.writePage(form);
	
}

//********************************** END OF PRE-AUTH PORTLETS ****************************//


