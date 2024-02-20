/**
 * Module Description
 * 
 * Version    Date            Author           Remarks
 * 1.00       16 Jun 2015     brians
 *
 */
//These constants correspond to a document's position in the array, starting at 1 (not zero) since they are used to populate the Netsuite sublist
var UNITQUOTE_INDEX = 1;
var MSRP_INDEX = 2;
//Grand Design wanted these buttons to remain on the sales order, since they are printed on special paper, and should not be included in the PDF of the documents
var DRIVERCHECKLIST_INDEX = 3;
var DEALERPRICESHEET_INDEX = 4;
var DELIVERYINSPECTIONFORM_INDEX = 5;
var LUGNUTTORQ_INDEX = 6;
var WARRANTYREGISTRATION_INDEX = 7;
var BLANKWARRANTYREGISTRATION_INDEX = 8;
var NVIS_INDEX = 9;
var CCI_INDEX = 10;

//Arrays of the possible documents for each type of dealer location - NOT including MSOs, per request
var domesticDocs = ['Unit Quote Sheet','MSRP','Driver Check List','Dealer Price Sheet','Delivery Inspection Form','Lug Nut Torque Req','Warranty Registration','Blank Unit Warranty Registration'];
//var californiaDocs = ['Unit Quote Sheet','MSRP','Driver Check List','Dealer Price Sheet','Delivery Inspection Form','Lug Nut Torque Req','Warranty Registration','Blank Unit Warranty Registration','California Compliance Declaration'];
//var oregonDocs = ['Unit Quote Sheet','MSRP','Driver Check List','Dealer Price Sheet','Delivery Inspection Form','Lug Nut Torque Req','Warranty Registration','Blank Unit Warranty Registration','Oregon Compliance Declaration'];
var canadaDocs = ['Unit Quote Sheet','MSRP','Driver Check List','Dealer Price Sheet','Delivery Inspection Form','Lug Nut Torque Req','Warranty Registration','Blank Unit Warranty Registration','NVIS','CCI'];
var genericStateDocs = ['Unit Quote Sheet','MSRP','Driver Check List','Dealer Price Sheet','Delivery Inspection Form','Lug Nut Torque Req','Warranty Registration','Blank Unit Warranty Registration'];

/**
 * @param {nlobjRequest} request Request object
 * @param {nlobjResponse} response Response object
 * @returns {Void} Any output is written via response object
 */
//***********************
//Name: GD - PrintOrderDocuments (Workflow)
//Description: Action that calls a suitelet where the user can select which documents to print
//Use: Workflow Action event
//************************
function GD_PrintOrderDocumentsCustomAction()
{
	var context = nlapiGetContext();
	var recordId = nlapiGetRecordId();

	var paramArray = new Array();
	paramArray['custparam_salesorderid'] = nlapiGetRecordId();
	nlapiSetRedirectURL('SUITELET', 'customscriptgd_printorderdocuments', 'customdeploygd_printdocument', false, paramArray);
}

//***********************
//Name: GD - PrintOrderDocuments (Suitelet)
//Description: Allows the user to select RVS documents to print, then generates the selected PDFs on Submit
//Use: Suitelet event
//************************
function printOrderDocuments(request, response)
{

	if (request.getMethod() == 'GET')
	{
		//The sales order internal id
		var internalId = request.getParameter('custparam_salesorderid');

		if (internalId != '' && internalId != null) 
		{
			//var internalId = '418328';
			//var internalId = '2846'; //Canada test
			//var internalId = '214'; //California test

			var salesOrderRecord = nlapiLoadRecord('salesorder', internalId);
			var dealerRecord = nlapiLoadRecord('customer', salesOrderRecord.getFieldValue('entity'));
			var unitRecord = nlapiLoadRecord('customrecordrvsunit', salesOrderRecord.getFieldValue('custbodyrvsunit'));
			var unitRetailCustomerId = findUnitRetailCustomer(salesOrderRecord.getFieldValue('custbodyrvsunit'));

			//Determines if the Sales Order has an associated invoice.  The salesOrderInvoiceSearch() function returns the results of the search in an array
			var hasInvoice = salesOrderInvoiceSearch(internalId);

			//If the Sales Order has an invoice, determines if that invoice is a Unit Invoice. If so, a Unit Invoice checkbox will be added.
			if (hasInvoice != false)
			{
				var searchresult = hasInvoice[0];
				var invoiceType = searchresult.getText('customform');
				domesticDocs[domesticDocs.length] = 'Unit Invoice';
				canadaDocs[canadaDocs.length] = 'Unit Invoice';
				genericStateDocs[genericStateDocs.length] = 'Unit Invoice';
			}

			//Creates the form used in this Suitelet
			var form = nlapiCreateForm("Print Order Documents",false);

			var group1 = form.addFieldGroup('dealer_details', 'Dealer Details:');
			group1.setShowBorder(true);
			group1.setSingleColumn(false);

			var salesOrderNum = salesOrderRecord.getFieldValue('tranid');
			var salesOrderNumDisplay = form.addField('custpage_salesordernum','text','Sales Order #:',null,'dealer_details');
			salesOrderNumDisplay.setDisplayType('inline');
			salesOrderNumDisplay.setDefaultValue(salesOrderNum);

			var defaultType = getDefaultType(dealerRecord);
			var defaultTypeField = form.addField('custpage_dealertypefield','text','Default Print Documents Type:',null,'dealer_details');
			defaultTypeField.setDisplayType('inline');
			defaultTypeField.setDefaultValue(defaultType);

			var dealerName = dealerRecord.getFieldValue('entityid');
			var dealerNameDisplay = form.addField('custpage_dealername','textarea','Dealer Name:',null,'dealer_details');
			dealerNameDisplay.setDisplayType('inline');
			dealerNameDisplay.setDefaultValue(dealerName);

			var dealerAddress = dealerRecord.getFieldValue('defaultaddress');
			var dealerAddressDisplay = form.addField('custpage_dealeraddress','textarea','Dealer Address:',null,'dealer_details');
			dealerAddressDisplay.setDisplayType('inline');
			dealerAddressDisplay.setDefaultValue(dealerAddress);		
			
			if(defaultType.indexOf('Domestic') > -1 && defaultType.length == 1)
			{
				var sublist = createSublist(form,domesticDocs);
				//The line items default to 'null', so each one is initialized to 'F'
				for (var i = 1; i <= domesticDocs.length; i++)
				{
					sublist.setLineItemValue('custpage_toprint', i, 'F');
				}
				//Sets the documents that default to 'checked' for Domestic orders
				sublist.setLineItemValue('custpage_toprint', MSRP_INDEX, 'T'); 					//MSRP
				sublist.setLineItemValue('custpage_toprint', DRIVERCHECKLIST_INDEX, 'T'); 		//Driver Check List			
				sublist.setLineItemValue('custpage_toprint', DELIVERYINSPECTIONFORM_INDEX, 'T');//Delivery Inspection Form
				sublist.setLineItemValue('custpage_toprint', LUGNUTTORQ_INDEX, 'T'); 			//Lug Nut Torq
				sublist.setLineItemValue('custpage_toprint', WARRANTYREGISTRATION_INDEX, 'T'); 	//Warranty Registration
			}
			else if(defaultType.indexOf('Canada') > -1 && defaultType.length == 1)
			{
				var sublist = createSublist(form,canadaDocs);
				//The line items default to 'null', so each one is initialized to 'F'
				for (var i = 1; i <= canadaDocs.length; i++)
				{
					sublist.setLineItemValue('custpage_toprint', i, 'F');
				}
				//Sets the documents that default to 'checked' for Canadian orders
				sublist.setLineItemValue('custpage_toprint', MSRP_INDEX, 'T');
				sublist.setLineItemValue('custpage_toprint', DRIVERCHECKLIST_INDEX, 'T');
				sublist.setLineItemValue('custpage_toprint', DELIVERYINSPECTIONFORM_INDEX, 'T');
				sublist.setLineItemValue('custpage_toprint', LUGNUTTORQ_INDEX, 'T');
				sublist.setLineItemValue('custpage_toprint', WARRANTYREGISTRATION_INDEX, 'T');
				sublist.setLineItemValue('custpage_toprint', NVIS_INDEX, 'T');					//NVIS Document (Prints only for Canadian Orders)
				sublist.setLineItemValue('custpage_toprint', CCI_INDEX, 'T');					//CCI Document (Prints only for Canadian Orders)
			}
			else
			{
				for (var i = 0; i < defaultType.length; i++)
				{
					genericStateDocs.push(defaultType[i] + ' Compliance Declaration');
				}
				var sublist = createSublist(form, genericStateDocs);
				//The line items default to 'null', so each one is initialized to 'F'
				for (var i = 1; i <= genericStateDocs.length; i++)
				{
					sublist.setLineItemValue('custpage_toprint', i, 'F');
				}
				//Sets the documents that default to 'checked' for Oregon orders
				sublist.setLineItemValue('custpage_toprint', MSRP_INDEX, 'T');
				sublist.setLineItemValue('custpage_toprint', DRIVERCHECKLIST_INDEX, 'T');
				sublist.setLineItemValue('custpage_toprint', DELIVERYINSPECTIONFORM_INDEX, 'T');
				sublist.setLineItemValue('custpage_toprint', LUGNUTTORQ_INDEX, 'T');
				sublist.setLineItemValue('custpage_toprint', WARRANTYREGISTRATION_INDEX, 'T');

				for (var i = 0; i < defaultType.length; i++)
				{
					sublist.setLineItemValue('custpage_toprint', genericStateDocs.indexOf(defaultType[i] + ' Compliance Declaration') + 1, 'T');
				}
			}

			form.addSubmitButton('Print Documents');
			//Creates the button to return to the Sales Order
			form.setScript('customscriptgd_printorderdocumentsbtn');
			//form.addButton('custpage_backbutton', 'Back to Sales Order #' + salesOrderNum, "backToSalesOrder();" );
			form.addButton('custpage_backbutton', 'Back to Sales Order #' + salesOrderNum, "backToSalesOrder("+ internalId + ");" );
			//The 'View Invoice' button is only displayed if the Sales Order has an Invoice
			if (hasInvoice != false)
			{
				form.setScript('customscriptgd_printorderdocumentsinvbtn');
				form.addButton('custpage_invbutton', 'View Invoice', "viewInvoice(" + internalId + ");" );
			}

			var cbHasInvoice = form.addField('custpage_cbhasinvoice', 'checkbox', 'Sales Order Has Unit Invoice');
			cbHasInvoice.setDisplayType('inline');
			if(hasInvoice != false) cbHasInvoice.setDefaultValue('T');
			else cbHasInvoice.setDefaultValue('F');
			
			var theSalesOrderIdDisplay = form.addField('custpage_salesorderid', 'integer', 'Sales Order Id: ');
			theSalesOrderIdDisplay.setDisplayType('hidden');
			theSalesOrderIdDisplay.setDefaultValue(internalId);

			response.writePage(form);
			//End of GET call
		}
	}
	else
	{
		//POST call
		var internalId = request.getParameter('custpage_salesorderid');

		var salesOrderRecord = nlapiLoadRecord('salesorder', internalId);
		var dealerRecord = nlapiLoadRecord('customer', salesOrderRecord.getFieldValue('entity'));
		var unitRecord = nlapiLoadRecord('customrecordrvsunit', salesOrderRecord.getFieldValue('custbodyrvsunit'));
		var unitRetailCustomerId = findUnitRetailCustomer(salesOrderRecord.getFieldValue('custbodyrvsunit'));

		var hasInvoice = false;
		if(request.getParameter('custpage_cbhasinvoice') == 'T') hasInvoice = true;

		var defaultType = getDefaultType(dealerRecord);
		var docList = '';
		
		if(defaultType.indexOf('Canada') > -1 && defaultType.length == 1)
		{
			docList = canadaDocs;
		}
		else if (defaultType.length >= 1)
		{
			//Determines if the Sales Order has an associated invoice.  The salesOrderInvoiceSearch() function returns the results of the search in an array
			var hasInvoice = salesOrderInvoiceSearch(internalId);
			
			//If the Sales Order has an invoice, determines if that invoice is a Unit Invoice. If so, a Unit Invoice checkbox will be added.
			if (hasInvoice != false)
			{
				var searchresult = hasInvoice[0];
				var invoiceType = searchresult.getText('customform');
				domesticDocs[domesticDocs.length] = 'Unit Invoice';
				canadaDocs[canadaDocs.length] = 'Unit Invoice';
				genericStateDocs[genericStateDocs.length] = 'Unit Invoice';
			}
			for (var i = 0; i < defaultType.length; i++)
			{
				genericStateDocs.push(defaultType[i] + ' Compliance Declaration');
			}
			docList = genericStateDocs;
		}
		else
		{
			docList = domesticDocs;
		}

		//Creates the base HTML variable to which the HTML of the selected documents will be added
		var html_composite = '';

		var checkboxResults = new Array();
		//Gathers the current line item state ('F' or 'T') for each line item in the sublist
		for (var i = 0; i <= docList.length; i++)
		{
			checkboxResults[i] = request.getLineItemValue('custpage_sublist', 'custpage_toprint', i+1);
		}

		//The function for each printout is located in the appropriate .js file.
		//These files are included as libraries on the 'GD - PrintorderDocuments (Suitelet)' script file

		//Subtract 1 from each document index since we are accessing that location in the array
		if (checkboxResults[UNITQUOTE_INDEX-1] != 'F')
		{
			var html_UnitQuote = GD_GetPricerHTML(internalId, true, false, false, true, false);
			html_composite += html_UnitQuote;
		}
		if (checkboxResults[MSRP_INDEX-1] != 'F')
		{
			var html_MSRP = GetMSRPHTML(internalId);
			html_composite += html_MSRP;
		}
		//Grand Design wanted these buttons to remain on the sales order, since they are printed on special paper, and should not be included in the PDF of the documents
		if (checkboxResults[DRIVERCHECKLIST_INDEX-1] != 'F')
		{
			var html_DriverChecklist = GD_PrintDriverCheckListHTML(internalId);
			html_composite += html_DriverChecklist;
		}
		if (checkboxResults[DEALERPRICESHEET_INDEX-1] != 'F')
		{
			var html_DealerPrice = GD_GetPricerHTML(internalId, true, false, false, false, true);
			html_composite += html_DealerPrice;
		}
		if (checkboxResults[DELIVERYINSPECTIONFORM_INDEX-1] != 'F')
		{
			var html_DeliveryInspection = GD_GetDeliveryInspectionHTML(internalId);
			html_composite += html_DeliveryInspection;
		}
		if (checkboxResults[LUGNUTTORQ_INDEX-1] != 'F')
		{
			var html_LugNutTorqReq = GD_GetLugNutTorqReqHTML(internalId);
			html_composite += html_LugNutTorqReq;
		}
		if (checkboxResults[WARRANTYREGISTRATION_INDEX-1] != 'F')
		{
			//If no Retail Customer was found, then set the results array to print a blank warranty registration. Otherwise, pass in the unitRetailCustomerId and print
			if(unitRetailCustomerId == '') 
				checkboxResults[BLANKWARRANTYREGISTRATION_INDEX-1] = 'T';
			else
			{
				var html_WarrantyReg = PrintWarrantyRegistrationForm(internalId, unitRetailCustomerId);
				html_composite += html_WarrantyReg;
			}
		}

		if (checkboxResults[BLANKWARRANTYREGISTRATION_INDEX-1] != 'F')
		{
			var html_WarrantyReg = PrintWarrantyRegistrationForm(internalId, null);
			html_composite += html_WarrantyReg;
		}
		//Note that the invoice will be located at the very end for all default types (Domestic, Cali, Canada, etc)
		//So we'll check the final position of the array using arrayname.length-1

		//If it's a domestic order with an invoice, check to see if that document will be printed
		if (defaultType[0] == 'Domestic' && hasInvoice != false)
		{
			if(checkboxResults[domesticDocs.indexOf('Unit Invoice')] != 'F')
			{
				var invoiceHTML = printInvoice(internalId);
				html_composite += invoiceHTML;
			}
		}

		if(defaultType.length == 1 && defaultType[0] == 'Canada')
		{
			if (checkboxResults[NVIS_INDEX-1] != 'F')
			{
				var html_NVIS = GD_GetNVISHTML(internalId);
				html_composite += html_NVIS;
			}
			if (checkboxResults[CCI_INDEX-1] != 'F')
			{
				var html_CCI = GetCanadianCustomsInvoiceHTML(internalId);
				html_composite += html_CCI;
			}
			if (hasInvoice != false && checkboxResults[canadaDocs.indexOf('Unit Invoice')] != 'F')
			{
				var invoiceHTML = printInvoice(internalId);
				html_composite += invoiceHTML;
			}
		} 
		else if (defaultType.length > 0 && defaultType[0] != 'Domestic') 
		{
			// loop through the defaultType array and generate the pdf for the state compliance printout if they were selected on the suitelet page
			for (var i = 0; i < defaultType.length; i++)
			{
				if (defaultType[i] == 'California')
				{
					if ((checkboxResults[genericStateDocs.indexOf(defaultType[i] + ' Compliance Declaration')] || 'F') != 'F')
					{
						var html_CaliforniaCompliance = GetCaliforniaComplianceHTML(internalId);
						html_composite += html_CaliforniaCompliance;
					}
				}
				else if (defaultType[i] == 'Oregon')
				{
					if ((checkboxResults[genericStateDocs.indexOf(defaultType[i] + ' Compliance Declaration')] || 'F') != 'F'){
						var html_OregonCompliance = GetOregonComplianceHTML(internalId);
						html_composite += html_OregonCompliance;
					}
				}
				else
				{
					if ((checkboxResults[genericStateDocs.indexOf(defaultType[i] + ' Compliance Declaration')] || 'F') != 'F'){
						var html_GenericStateCompliance = GetGenericStateComplianceHTML(internalId, defaultType[i]);
						html_composite += html_GenericStateCompliance;
					}
				}
			}
			
			if (hasInvoice && checkboxResults[genericStateDocs.indexOf('Unit Invoice')] != 'F')
			{
				var invoiceHTML = printInvoice(internalId);
				html_composite += invoiceHTML;
			}
		}

		//Sets the PDF title to include the display number of the Order, then prints/downloads the PDF
		var pdfTitle = 'Order #' + nlapiLookupField('salesorder', internalId, 'tranid') +' Documents.pdf';
		PrintPDFInSuiteLet(request, response, pdfTitle, html_composite);

		//END of POST call
	}
}

function createSublist(formName,docNames)
{
	//Creates a sublist on the specified form based on the set of documents passed in, since orders from Canada or California require different document printouts
	var sublist = formName.addSubList('custpage_sublist', 'list', 'Documents to Print:');
	sublist.addMarkAllButtons();
	sublist.addField('custpage_toprint','checkbox','Print (Y/N)',null);
	sublist.addField('custpage_documents','text','Documents:',null);
	for (var i = 0; i < docNames.length; i++)
	{
		sublist.setLineItemValue('custpage_documents', i+1, docNames[i]);
	}
	return sublist;
}

/**
* Using the sales order's internal id, determines if the order is from Canada or California, in order to print the appropriate documents
* @param {String} any Dealer record internal id
* @returns {String} either 'Canada', 'California', or 'Domestic'
*/
function getDefaultType(theDealerRecord)
{
	var complianceOptionStates = theDealerRecord.getFieldTexts('custentitygd_statecomplianceoption') || [];
	
	if (complianceOptionStates.length > 0)
	{
		return complianceOptionStates;
	}
	
	var dealerCountry = '';
	if(theDealerRecord.getFieldValue('shipcountry') != null)
	{
		dealerCountry = theDealerRecord.getFieldValue('shipcountry');
	}
	var dealerState = '';
	if(theDealerRecord.getFieldValue('shipstate') != null)
		dealerState = theDealerRecord.getFieldValue('shipstate');
   
	var defaultType = '';
	//If the Dealer is from Canada, the default Canada printouts will be selected
	if(dealerCountry.toUpperCase() == 'CA')
	{
		defaultType = ['Canada'];
	}
	else if (dealerCountry.toUpperCase() == 'US' && dealerState.toUpperCase() == 'CA')
	//If the dealer is from California, the default California documents will be printed
	{
		defaultType = ['California'];
	}
	else if (dealerCountry.toUpperCase() == 'US' && dealerState.toUpperCase() == 'OR')
	{
		defaultType = ['Oregon'];
	}
	else
	{
		defaultType = ['Domestic'];
	}
	return defaultType;
}


function backToSalesOrder(anyInternalId)
{
	///The function to return to the Sales Order.  This function is linked to the "Back to Sales Order" button
	//var context = nlapiGetContext();
	//var internalId = context.getSessionObject('printdocuments_recordid');
	//var internalId = request.getParameter('custparam_salesorderid');
	document.location = nlapiResolveURL('RECORD', 'salesorder', anyInternalId);
}

function salesOrderInvoiceSearch(anyInternalId)
{
	var filters = new Array();
	filters[filters.length] = new nlobjSearchFilter('createdfrom',null,'anyOf',anyInternalId);
	filters[filters.length] = new nlobjSearchFilter('mainline',null,'is','T');
	filters[filters.length] = new nlobjSearchFilter('custbodyrvsordertype',null,'is',2);
	
	var columns = new Array();
	columns[columns.length] = new nlobjSearchColumn('internalid');
	columns[columns.length] = new nlobjSearchColumn('customform');

	var searchresults = nlapiSearchRecord('invoice', null, filters, columns);
	if (searchresults != null && searchresults.length > 0) return searchresults;
	else return false;
}

function printInvoice(anyInternalId){
	var searchresults = salesOrderInvoiceSearch(anyInternalId);
	if (searchresults != false)
	{
		var searchresult = searchresults[0];
		var invoiceId = searchresult.getText('internalid');
		//Gets the HTML to print the Invoice (from 'InvoicePrinoutSuitelet.js' in GD Sandbox)

		//We do all this so we can use the advanced HTML template that Grand Design now uses to print their Invoices
		//Essentially, this is like clicking the Print icon on an invoice record
		var invoiceHTML = nlapiPrintRecord('transaction', invoiceId, 'HTML');
		var invoiceHTMLtext = invoiceHTML.getValue();

		//But, since we're adding this to a set of documents, we need to remove the <?xml> string at the beginning of the document.
		//There can only be one <?xml> string per document, and in this case, it will be added through the PrintPDFInSuiteLet() function above, so we don't want it here.
		var fixedInvoiceHTML = invoiceHTMLtext.replace('<?xml version="1.0"?><!DOCTYPE pdf PUBLIC "-//big.faceless.org//report" "report-1.1.dtd">','');
		
		fixedInvoiceHTML = fixedInvoiceHTML.replace('<html>',''); //Also, get rid of the opening and closing html tags.
		fixedInvoiceHTML = fixedInvoiceHTML.replace('</html>','');

		return fixedInvoiceHTML;
	}
}

function viewInvoice(anyInternalId)
{
	///This function is linked to the 'View Invoice' Button.  When this button is clicked, a pop-up of the invoice will appear.
	var searchresults = salesOrderInvoiceSearch(anyInternalId);
	if (searchresults != false)
	{
		var searchresult = searchresults[0];
		var invoiceId = searchresult.getText('internalid');
		var xAvail = screen.availWidth;
		var yAvail = screen.availHeight;
		params = 'left=100,height='+ yAvail*0.80 +',width=' + xAvail*.80;
		window.open(nlapiResolveURL('RECORD', 'invoice', invoiceId),'_blank',params);
	} else {
		alert('No Invoice Found.');
	}
}

function findUnitRetailCustomer(unitRecordId)
{
	//Find current unit retail customer if there is one.
	var unitRetailCustomer = null;
	var cols = new Array();
	cols[cols.length] = new nlobjSearchColumn('internalid');
	cols[cols.length] = new nlobjSearchColumn('custrecordunitretailcustomer_currentcust');

	var filters = new Array();
	filters[filters.length] = new nlobjSearchFilter('custrecordunitretailcustomer_unit', null, 'anyof', unitRecordId);
	filters[filters.length] = new nlobjSearchFilter('custrecordunitretailcustomer_currentcust', null, 'is', 'T');

	var unitRetailResults = nlapiSearchRecord('customrecordrvsunitretailcustomer', null, filters, cols);			
	if(unitRetailResults != null && unitRetailResults.length == 1)
	{
		unitRetailCustomer = unitRetailResults[0].getId();
	}	
	return unitRetailCustomer;
}
