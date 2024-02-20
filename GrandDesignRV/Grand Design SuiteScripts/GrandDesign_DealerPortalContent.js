var ORDER_TYPE_FIELD_NAME = 'custbodyrvsordertype';

/**
 * Creates recent open invoices portlet on the dealer portal.
 * @param {Object} portlet
 * @param {Object} column
 */
function CreateDealerRecentOpenPartsInvPortlet(portlet, column)
{
	//column param can be: 1 = LEFT, 2 = MIDDLE, OR 3 = RIGHT.
	//This is where the portlet is shown on the page. This param is passed in 
	//automatically depending on where user drags the portlet on the page.
	
	//create columns to return
	var cols = new Array();
	cols[cols.length] = new nlobjSearchColumn('tranid');
	cols[cols.length] = new nlobjSearchColumn('trandate')
	cols[cols.length] = new nlobjSearchColumn('otherrefnum');
	cols[cols.length] = new nlobjSearchColumn('total');
	cols[cols.length] = new nlobjSearchColumn('memo');
	cols[cols.length] = new nlobjSearchColumn('status');
	
	//create filters
	var filters = new Array();
	filters[filters.length] = new nlobjSearchFilter('entity',null,'anyof', ['@CURRENT@']); //Filter: "Dealer is mine"
	filters[filters.length] = new nlobjSearchFilter(ORDER_TYPE_FIELD_NAME, null, 'anyof', [ORDERTYPE_PART]); //Filter: Order Type is Part

	//Now search for part web orders for this dealer.
	//Note: "customsearchopenwebordersearch" saved search returns all open web orders, and
	//      we are only interested in open part web orders for this dealer, hence the 2 filters above
	var invoiceResults = nlapiSearchRecord('invoice','customsearchrecentopenpartsinvoices',filters, cols);
	portlet.setTitle('Part Invoices: Open Invoices'); //set portlet title
	if(invoiceResults != null && invoiceResults.length > 0) //Add results to the portlet
	{
		//create portlet columns
		var idCol = portlet.addColumn('tranid','text', 'Invoice #', 'LEFT'); //Web Order #, not Web order ID
		idCol.setURL(nlapiResolveURL('RECORD','invoice')); 
    	idCol.addParamToURL('id','id', true);	
		portlet.addColumn('trandate','date','Date','LEFT'); //Transaction date
		portlet.addColumn('otherrefnum','text', 'PO/Check Number', 'LEFT'); 
		portlet.addColumn('memo','text','Memo','LEFT');
		portlet.addColumn('total','currency','Amount','LEFT');
		portlet.addColumn('status_display','text','Status','LEFT');
		
		//add rows to the portlet
		for(var i = 0; i < invoiceResults.length; i++)
		{
			portlet.addRow(invoiceResults[i]);	 
		}
	}
}

/**
 * Creates recent open invoices portlet on the dealer portal.
 * @param {Object} portlet
 * @param {Object} column
 */
function CreateDealerRecentPaidPartsInvPortlet(portlet, column)
{
	//column param can be: 1 = LEFT, 2 = MIDDLE, OR 3 = RIGHT.
	//This is where the portlet is shown on the page. This param is passed in 
	//automatically depending on where user drags the portlet on the page.
	
	//create columns to return
	var cols = new Array();
	cols[cols.length] = new nlobjSearchColumn('tranid');
	cols[cols.length] = new nlobjSearchColumn('trandate')
	cols[cols.length] = new nlobjSearchColumn('otherrefnum');
	cols[cols.length] = new nlobjSearchColumn('total');
	cols[cols.length] = new nlobjSearchColumn('memo');
	cols[cols.length] = new nlobjSearchColumn('status');
	
	//create filters
	var filters = new Array();
	filters[filters.length] = new nlobjSearchFilter('entity',null,'anyof', ['@CURRENT@']); //Filter: "Dealer is mine"
	filters[filters.length] = new nlobjSearchFilter(ORDER_TYPE_FIELD_NAME, null, 'anyof', [ORDERTYPE_PART]); //Filter: Order Type is Part

	//Now search for part web orders for this dealer.
	//Note: "customsearchopenwebordersearch" saved search returns all open web orders, and
	//      we are only interested in open part web orders for this dealer, hence the 2 filters above
	var invoiceResults = nlapiSearchRecord('invoice','customsearchrecentpaidpartsinvoices',filters, cols);
	portlet.setTitle('Part Invoices: Recent Paid Invoices'); //set portlet title
	if(invoiceResults != null && invoiceResults.length > 0) //Add results to the portlet
	{
		//create portlet columns
		var idCol = portlet.addColumn('tranid','text', 'Invoice #', 'LEFT'); //Web Order #, not Web order ID
		idCol.setURL(nlapiResolveURL('RECORD','invoice')); 
    	idCol.addParamToURL('id','id', true);	
		portlet.addColumn('trandate','date','Date','LEFT'); //Transaction date
		portlet.addColumn('otherrefnum','text', 'PO/Check Number', 'LEFT'); 
		portlet.addColumn('memo','text','Memo','LEFT');
		portlet.addColumn('total','currency','Amount','LEFT');
		portlet.addColumn('status_display','text','Status','LEFT');
		
		//add rows to the portlet
		for(var i = 0; i < invoiceResults.length; i++)
		{
			portlet.addRow(invoiceResults[i]);				 
		}
	}
}


/**
 * Creates answered Parts Inquiry portlet.
 * @param {Object} portlet
 * @param {Object} column
 */
function CreateDealerAnsweredPartsInquiryPortlet(portlet, column)
{
	//column param can be: 1 = LEFT, 2 = MIDDLE, OR 3 = RIGHT.
	//This is where the portlet is shown on the page. This param is passed in 
	//automatically depending on where user drags the portlet on the page.
	
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
	portlet.setTitle('Parts Inquiry: Answered'); //set portlet title
	if(results != null && results.length > 0) //Add results to the portlet
	{
		//create portlet columns
		var idCol = portlet.addColumn('internalid','text', 'Parts Inquiry #', 'LEFT'); 
		idCol.setURL(nlapiResolveURL('RECORD','customrecordgranddesignpartsinquiry')); 
    	idCol.addParamToURL('id','internalid', true);	
		portlet.addColumn('custrecordpartsinquiry_unit_display','text','VIN','LEFT'); 
		portlet.addColumn('custrecordpartsinquiry_dealer_display','text', 'Dealer', 'LEFT'); 
		portlet.addColumn('custrecordpartsinquiry_requestor_display','text','Requestor','LEFT');
		portlet.addColumn('custrecordpartsinquiry_status_display','text','Status','LEFT');
		
		//add rows to the portlet
		for(var i = 0; i < results.length; i++)
		{
			portlet.addRow(results[i]);				 
		}
	}
}

/**
 * Creates answered Parts Inquiry portlet.
 * @param {Object} portlet
 * @param {Object} column
 */
function CreateDealerSubmittedPartsInquiryPortlet(portlet, column)
{
	//column param can be: 1 = LEFT, 2 = MIDDLE, OR 3 = RIGHT.
	//This is where the portlet is shown on the page. This param is passed in 
	//automatically depending on where user drags the portlet on the page.
	
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
	filters[filters.length] = new nlobjSearchFilter('custrecordpartsinquiry_status', null, 'anyof', PARTS_INQUIRY_STATUS_OPEN);

	var results = nlapiSearchRecord('customrecordgranddesignpartsinquiry',null,filters, cols);
	portlet.setTitle('Parts Inquiry: Submitted'); //set portlet title
	if(results != null && results.length > 0) //Add results to the portlet
	{
		//create portlet columns
		var idCol = portlet.addColumn('internalid','text', 'Parts Inquiry #', 'LEFT'); 
		idCol.setURL(nlapiResolveURL('RECORD','customrecordgranddesignpartsinquiry')); 
    	idCol.addParamToURL('id','internalid', true);	
		portlet.addColumn('custrecordpartsinquiry_unit_display','text','VIN','LEFT'); 
		portlet.addColumn('custrecordpartsinquiry_dealer_display','text', 'Dealer', 'LEFT'); 
		portlet.addColumn('custrecordpartsinquiry_requestor_display','text','Requestor','LEFT');
		portlet.addColumn('custrecordpartsinquiry_status_display','text','Status','LEFT');
		
		//add rows to the portlet
		for(var i = 0; i < results.length; i++)
		{
			portlet.addRow(results[i]);				 
		}
	}
}


/**
 * Creates part web order links on the dealer portal.
 * @param {Object} portlet
 * @param {Object} column
 */
function CreateDealerPartLinksPortlet(portlet, column)
{
	portlet.setTitle('Part Links'); //Set Portlet title
	
	var newPartWebOrderURL = GetNewParWebOrderURL();	
	if(trim(newPartWebOrderURL) != '')
		portlet.addLine('New Part Web Order', newPartWebOrderURL, 2); //New Part Web order 	
	else
		portlet.addLine("Missing 'External Part Web Order Form' on custom preferences.", null, 2);
				
	var searchId =  nlapiGetContext().getSetting('SCRIPT', 'custscriptdealerpartweborderlistsearch');	
	if(trim(searchId) != '')
		portlet.addLine('Unapproved Parts Orders', GetSearchResultURL(searchId), 2); //Part Web Order List
	else
		portlet.addLine( "Missing 'Dealer Portal - Part Sales Order Search' on custom preferences.", null, 2);
	
	searchId =  nlapiGetContext().getSetting('SCRIPT', 'custscriptdealerpartorderlistsearch');			
	if(trim(searchId) != '')
		portlet.addLine('Parts Order History', GetSearchResultURL(searchId), 2); //Part Sales Order List
	else
		portlet.addLine("Missing 'Dealer Portal - Part Web Order Search' on custom preferences.", null, 2);
			
	portlet.addLine('New Parts Inquiry', nlapiResolveURL('RECORD', 'customrecordgranddesignpartsinquiry', null, null), 2); 
		
}
