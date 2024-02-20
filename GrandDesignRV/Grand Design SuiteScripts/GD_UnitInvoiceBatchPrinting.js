/**
 * Module Description
 * 
 * Version    Date            Author           Remarks
 * 1.00       19 May 2014     ibrahima
 *
 */
var FIELD_NAME_STARTDATE = 'custpage_startdate';
var FIELD_NAME_ENDDATE = 'custpage_enddate';
var FIELD_NAME_CUSTOMER = 'custpage_customer';
var PARAM_NAME_HAS_SEARCHED = 'custparam_hassearched';
var PARAM_NAME_SELECTED_INVOICES = 'custparam_selectedinvoices';

var SUBLIST_NAME_INVOICES = 'custpage_invoicesublist';
var SUBLIST_FIELD_NAME_SELECT = 'custpage_selectinvoice';
var SUBLIST_FIELD_NAME_INVOICE = 'custpage_invoice';
var SUBLIST_FIELD_NAME_INVOICEDATE = 'custpage_invoicedate';
var SUBLIST_FIELD_NAME_DEALER = 'custpage_invoicedealer';
var SUBLIST_FIELD_NAME_DUEDATE = 'custpage_duedate';
var SUBLIST_FIELD_NAME_PO_NUMBER = 'custpage_ponumber';
var SUBLIST_FIELD_NAME_AMOUNT = 'custpage_amount';
var MAXIMUM_NUMBER_OF_BATCH_INVOICE_TO_PRINT = 15; //Stores the maximum number that can be printed in batch before the script runs out of usage points.

/**
 * @param {nlobjRequest} request Request object
 * @param {nlobjResponse} response Response object
 * @returns {Void} Any output is written via response object
 */
function GD_UnitInvoiceBatchPrintSuitelet(request, response)
{
	var startDate = request.getParameter(FIELD_NAME_STARTDATE);
	var endDate = request.getParameter(FIELD_NAME_ENDDATE);
	var customer = request.getParameter(FIELD_NAME_CUSTOMER);
	var commaSeparatedInvoices = request.getParameter(PARAM_NAME_SELECTED_INVOICES);
	var hasSearched = request.getParameter(PARAM_NAME_HAS_SEARCHED);
	if(hasSearched == null || hasSearched == '')
		hasSearched = 'F';

	if(startDate == null || startDate == '')
		startDate = getCustomDate(30, false);  //returns a date of of 30 days ago
	
	if(endDate == null || endDate == '')
		endDate = getCustomDate(0, false);  //returns today's date
	
	var selectedInvoicesArray = null;
	
	if(commaSeparatedInvoices != null && commaSeparatedInvoices != '')
		selectedInvoicesArray = commaSeparatedInvoices.split(',');
		
	if(request.getMethod() == 'GET')
	{
		form = nlapiCreateForm('Unit Invoice Batch Printing', false);	
		
		//setup field groups
		var fgFiltersName = 'custpage_fgfilters';
		var fgNotesName = 'custpage_fgnotes';
		
		var fgFilters = form.addFieldGroup(fgFiltersName, 'Unit Invoices Filters', null);
		fgFilters.setSingleColumn(false);
		
		var fgNotes = form.addFieldGroup(fgNotesName, 'Printing Information', null);
		fgNotes.setSingleColumn(true);
		
		field = form.addField(FIELD_NAME_STARTDATE, 'date', 'Start Date', null, fgFiltersName);
		field.setDefaultValue(startDate);
		if(hasSearched == 'T')
			field.setDisplayType('inline');
		else
			field.setMandatory(true);
		
		field = form.addField(FIELD_NAME_ENDDATE, 'date', 'End Date', null, fgFiltersName);
		field.setDefaultValue(endDate);
		if(hasSearched == 'T')
			field.setDisplayType('inline');
		else
			field.setMandatory(true);
	
		field = form.addField(FIELD_NAME_CUSTOMER, 'select', 'Dealer', 'customer', fgFiltersName);	
		field.setDefaultValue(customer);
		if(hasSearched == 'T')
			field.setDisplayType('inline');
		
		
		if(hasSearched == 'T')
		{
			field = form.addField('custpage_maxinvoicesnote', 'inlinehtml', ' ', null, fgNotesName);	
			field.setDefaultValue('<div style="color:black;padding-left:15px;"><b>Note:</b> Maximum number of invoices that can be printed at a time is ' + MAXIMUM_NUMBER_OF_BATCH_INVOICE_TO_PRINT + '.</div>');
			
			var script = "var url = nlapiResolveURL('SUITELET', 'customscriptgd_batchprintunitinvoices', 'customdeploygdbatchprintinvoices', null);";
				script +=  "document.location = url;";
			
			form.addButton('custpage_btnreset', 'Reset', script);
			form.addSubmitButton('Print');	
						
			//Now do unit invoices
			BuildUnitInvoicesSublist(form, startDate, endDate, customer, selectedInvoicesArray);
		}
		else
			form.addSubmitButton('Get Invoices');	
		
		
		if(selectedInvoicesArray != null && selectedInvoicesArray.length > 0)
		{
			if(selectedInvoicesArray.length <= MAXIMUM_NUMBER_OF_BATCH_INVOICE_TO_PRINT)
			{
				var filePDF = GetPDFContentFromSelectedInvoices(selectedInvoicesArray);
				response.setContentType('PDF', 'Batch Invoice Printout - ' + getCustomDate(0, true) + '.pdf');
				response.write(filePDF.getValue()); 			
			}
			else
			{
				field = form.addField('custpage_maxinvexceeded', 'inlinehtml', ' ', null, fgNotesName);	
				field.setDefaultValue('<div style="color:red;padding-left:15px;"><b>You are attempting to print ' + selectedInvoicesArray.length + ' invoices which is more than the maximum number allowed at a time (' + MAXIMUM_NUMBER_OF_BATCH_INVOICE_TO_PRINT + ' invoices)</b></div>');
				response.writePage(form);
			}
		}
		else	
			response.writePage(form);
	}
	else
	{
		var params = new Array();
		params[PARAM_NAME_HAS_SEARCHED] = 'T';
		params[FIELD_NAME_STARTDATE] = startDate;
		params[FIELD_NAME_ENDDATE] = endDate;
		params[FIELD_NAME_CUSTOMER] = customer;
		
		//Build comma separated invoices parameter
		var invCount = request.getLineItemCount(SUBLIST_NAME_INVOICES);
		var selectedInvoices = '';
		for(var i = 1; i <= invCount; i++)
		{
			var isSelected = request.getLineItemValue(SUBLIST_NAME_INVOICES, SUBLIST_FIELD_NAME_SELECT, i);			
			if(isSelected == 'T')
			{
				var invInternalId = ConvertNSFieldToInt(request.getLineItemValue(SUBLIST_NAME_INVOICES, SUBLIST_FIELD_NAME_INVOICE, i));
				
				if(selectedInvoices == '')
					selectedInvoices += invInternalId;
				else
					selectedInvoices += ',' + invInternalId;
	
			}
		}
		
		if(selectedInvoices != '')
			params[PARAM_NAME_SELECTED_INVOICES] = selectedInvoices;
		
		nlapiSetRedirectURL('SUITELET', 'customscriptgd_batchprintunitinvoices', 'customdeploygdbatchprintinvoices', null, params);
	}
}

/**
 * Gets pdf printable file content given the selected invoices array.
 * @param selectedInvoicesArray
 * @returns
 */
function GetPDFContentFromSelectedInvoices(selectedInvoicesArray)
{
	var pdfs = '';
	var filePDF = null;
	for(var i = 0; i < selectedInvoicesArray.length; i++)
	{
		var invHTML = PrintInvoiceHTML(selectedInvoicesArray[i]); //This method is in InvoicePrintoutSuitelet.js file			
		pdfs += '<pdf>' + invHTML + '</pdf>';
	}
	
	if(pdfs != '')
	{
		var xml = '<?xml version=\"1.0\"?>\n<!DOCTYPE pdf PUBLIC \"-//big.faceless.org//report\" \"report-1.1.dtd\">\n<pdfset>' + pdfs + '</pdfset>';
		filePDF = nlapiXMLToPDF(xml);
	}
	
	return filePDF;
}

/**
 * Builds Unit Invoices sublist given the NS form object, start & enddate as well as customer if provided.
 * @param form
 * @param startDate
 * @param endDate
 * @param customerId
 * @param selectedInvoicesArray
 */
function BuildUnitInvoicesSublist(form, startDate, endDate, customerId, selectedInvoicesArray)
{
	
	var tab_name_invoices = 'custpage_tabinvoices';
	//Add tab on the form
	form.addTab(tab_name_invoices, 'Unit Invoices');	
	//add sublists to the tabs
	var sublist_invoices = form.addSubList(SUBLIST_NAME_INVOICES, 'list', 'Unit Invoices', tab_name_invoices);
	
	var field = sublist_invoices.addField(SUBLIST_FIELD_NAME_SELECT, 'checkbox', 'Select'); 
	
	field = sublist_invoices.addField(SUBLIST_FIELD_NAME_INVOICE, 'select', 'Invoice', 'transaction'); 
	field.setDisplayType('inline');
	
	field = sublist_invoices.addField(SUBLIST_FIELD_NAME_DEALER, 'select', 'Dealer', 'customer'); 
	field.setDisplayType('inline');
	
	
	field = sublist_invoices.addField(SUBLIST_FIELD_NAME_INVOICEDATE, 'date', 'Invoice Date', null); 
	field.setDisplayType('inline');
	
	field = sublist_invoices.addField(SUBLIST_FIELD_NAME_DUEDATE, 'date', 'Due Date', null); 
	field.setDisplayType('inline');
	
	field = sublist_invoices.addField(SUBLIST_FIELD_NAME_PO_NUMBER, 'text', 'PO #', null); 
	field.setDisplayType('inline');
	
	
	field = sublist_invoices.addField(SUBLIST_FIELD_NAME_AMOUNT, 'float', 'Amount', null); 
	field.setDisplayType('inline');
	
	
	var filters = new Array();
	filters[filters.length] = new nlobjSearchFilter('trandate', null, 'onorafter', startDate);
	filters[filters.length] = new nlobjSearchFilter('trandate', null, 'onorbefore', endDate);
	filters[filters.length] = new nlobjSearchFilter('mainline', null, 'is', 'T');
	filters[filters.length] = new nlobjSearchFilter('custbodyrvsordertype', null, 'anyof', ORDERTYPE_UNIT);
	if(customerId != null && customerId != '')
		filters[filters.length] = new nlobjSearchFilter('entity', null, 'anyof', customerId);
	
	var cols = new Array();
	cols[cols.length] = new nlobjSearchColumn('internalid', null, null);
	cols[cols.length] = new nlobjSearchColumn('entity', null, null);
	cols[cols.length] = new nlobjSearchColumn('duedate', null, null);
	cols[cols.length] = new nlobjSearchColumn('otherrefnum', null, null);
	cols[cols.length] = new nlobjSearchColumn('amount', null, null);
	var sortIndex = cols.length;
	cols[sortIndex] = new nlobjSearchColumn('trandate', null, null);
	cols[sortIndex].setSort(true);
	
	var unitInvoicesResults = nlapiSearchRecord('invoice', null, filters, cols);
	
	if(unitInvoicesResults != null && unitInvoicesResults.length > 0)
	{
		for(var i = 0; i < unitInvoicesResults.length; i++)
		{
			var internalId = unitInvoicesResults[i].getId();
			var customer = unitInvoicesResults[i].getValue('entity');		
			var invDate = ConvertNSFieldToString(unitInvoicesResults[i].getValue('trandate'));
			var dueDate = ConvertNSFieldToString(unitInvoicesResults[i].getValue('duedate'));
			var poNum = ConvertNSFieldToString(unitInvoicesResults[i].getValue('otherrefnum'));
			var amount = ConvertNSFieldToFloat(unitInvoicesResults[i].getValue('amount'));
			
			if(DoesElementExistInArray(selectedInvoicesArray, internalId))
				sublist_invoices.setLineItemValue(SUBLIST_FIELD_NAME_SELECT, i + 1, 'T');
			
			sublist_invoices.setLineItemValue(SUBLIST_FIELD_NAME_INVOICE, i + 1, internalId);
			sublist_invoices.setLineItemValue(SUBLIST_FIELD_NAME_DEALER, i + 1, customer); 
			sublist_invoices.setLineItemValue(SUBLIST_FIELD_NAME_INVOICEDATE, i + 1, invDate);		
			sublist_invoices.setLineItemValue(SUBLIST_FIELD_NAME_DUEDATE, i + 1, dueDate);
			sublist_invoices.setLineItemValue(SUBLIST_FIELD_NAME_PO_NUMBER, i + 1, poNum); 
			sublist_invoices.setLineItemValue(SUBLIST_FIELD_NAME_AMOUNT, i + 1, amount);	
			
		}	
	}
}

/**
 * Returns whether or not element exist in the specified array.
 * @param array
 * @param element
 * @returns {Boolean}
 */
function DoesElementExistInArray(array, element)
{
	var _elementExist = false;
	if(array != null && array.length > 0 && element != null && element != '')
	{
		for(var i = 0; i < array.length; i++)
		{
			if(array[i] == element)
			{
				_elementExist = true;
				break;
			}
		}
	}
	
	return _elementExist;
}


/**
 * Returns date object of number of days specified ago or today's date 
 * if numberOdDaysAgo is not specified or is zero formatted as m/d/yyyy
 */
function getCustomDate(numberOfDaysAgo, useDotSeparator)
{
	var customDate = '';
	var currentDate = new Date();
	
	if(numberOfDaysAgo && numberOfDaysAgo > 0) //If number of days is specified, set currentDate to be today's date minus number of days ago.
		currentDate.setDate(currentDate.getDate() - numberOfDaysAgo);
	
	var dd = currentDate.getDate();
	var mm = currentDate.getMonth() + 1;
	var yyyy = currentDate.getFullYear();	
	
	if(!useDotSeparator)
		customDate = mm + '/' + dd + '/' + yyyy;
	else
		customDate = mm + '.' + dd + '.' + yyyy;
	
	return customDate; 
}
