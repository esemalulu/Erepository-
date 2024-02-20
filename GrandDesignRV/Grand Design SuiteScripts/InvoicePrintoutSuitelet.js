/**
 * Module Description
 * 
 * Version    Date            Author           Remarks
 * 1.00       02 Jan 2014     ibrahima
 *
 */

/**
 * Prints invoice as a pdf.
 * @param {nlobjRequest} request Request object
 * @param {nlobjResponse} response Response object
 * @returns {Void} Any output is written via response object
 */
function PrintInvoiceSuitelet(request, response)
{
	var invoiceId = request.getParameter('id');
	var context = nlapiGetContext();
	if (invoiceId == null || invoiceId == '')
	{
		invoiceId = context.getSessionObject('PrintInvoice_InvoiceId');
		context.setSessionObject('PrintInvoice_InvoiceId', null);
	}
	
	if (invoiceId != null && invoiceId != '')
	{			
		PrintPDFInSuiteLet(request, response, 'Invoice #' + nlapiLookupField('invoice', invoiceId, 'tranid') + '.pdf', PrintInvoiceHTML(invoiceId));
	}
}

/**
 * Adds invoice id to be printed in session.
 */
function PrintInvoiceCustomAction()
{
	var context = nlapiGetContext();
	context.setSessionObject('PrintInvoice_InvoiceId', nlapiGetRecordId());
}

/**
 * Returns html formatted string to be printed as a pdf.
 * @param invoiceId
 * @returns {String}
 */
function PrintInvoiceHTML(invoiceId)
{
	/** @record invoice */ 
	var invoice = nlapiLoadRecord('invoice', invoiceId);
	var invDate = invoice.getFieldValue('trandate');
	var invNum = invoice.getFieldValue('tranid');
	var salesRep = ConvertNSFieldToString(invoice.getFieldText('salesrep'));
	var vin = ConvertNSFieldToString(invoice.getFieldText('custbodyrvsunit'));
	var floorPlanType = ConvertNSFieldToString(invoice.getFieldText('custbodyrvsflooringtype'));
	var poNum = ConvertNSFieldToString(invoice.getFieldValue('otherrefnum'));
	var flooringApprovalNum = ConvertNSFieldToString(invoice.getFieldValue('custbodyrvsflooringapprovalnumber'));
	var shipVia = ConvertNSFieldToString(invoice.getFieldText('shipmethod'));
	var shipDate = ConvertNSFieldToString(invoice.getFieldValue('shipdate'));
	var dateFlooringApproved = ConvertNSFieldToString(invoice.getFieldValue('custbodyrvsdatefloorplanapproved'));
	var createdFrom = ConvertNSFieldToString(invoice.getFieldText('createdfrom'));
	var orderRetailSoldName = ConvertNSFieldToString(invoice.getFieldValue('custbodyrvsretailsoldname'));
	
	var companyLogo = GetCompanyPageLogo();
	var companyInfo = nlapiLoadConfiguration('companyinformation');
	//var companyName = ConvertNSFieldToString(companyInfo.getFieldValue('companyname'));
	var companyAddress1 = ConvertNSFieldToString(companyInfo.getFieldValue('address1'));
	var companyCity = ConvertNSFieldToString(companyInfo.getFieldValue('city')); 
	var companyState = ConvertNSFieldToString(companyInfo.getFieldText('state')); 
	var companyZip = ConvertNSFieldToString(companyInfo.getFieldValue('zip')); 
	var companyCountry = ConvertNSFieldToString(companyInfo.getFieldValue('country'));
	
	if (companyCountry == 'CA')
		companyCountry = 'Canada';
	else if (companyCountry == 'US')
		companyCountry = 'United States';
	var companyAddress = companyAddress1 + '<br />' + companyCity + ' ' + companyState + ' ' + companyZip + '<br />' + companyCountry;
	
	var dealerId = invoice.getFieldValue('entity');
	var dealer = nlapiLoadRecord('customer', dealerId);
	var addressee = ConvertNSFieldToString(dealer.getFieldValue('companyname'));
	var billAddress1 = ConvertNSFieldToString(invoice.getFieldValue('billaddr1'));
	var billAddress2 = ConvertNSFieldToString(invoice.getFieldValue('billaddr2'));
	var billCity = ConvertNSFieldToString(invoice.getFieldValue('billcity'));
	var billState = ConvertNSFieldToString(invoice.getFieldValue('billstate'));
	var billZip = ConvertNSFieldToString(invoice.getFieldValue('billzip'));
	var billCountry = ConvertNSFieldToString(invoice.getFieldValue('billcountry'));
	
	if (billCountry == 'CA')
		billCountry = 'Canada';
	else if (billCountry == 'US')
		billCountry = 'United States';
	
	var columns, results;
	var billTrue = 'F';
	if (billAddress1 == '' && billCity == '' && billState == '' && billZip == '')
	{
		var salesOrderId = invoice.getFieldValue('createdfrom');
	    var filters = new Array();
		filters[filters.length] = new nlobjSearchFilter('internalid', null, 'anyof', salesOrderId);
		filters[filters.length] = new nlobjSearchFilter('mainline', null, 'is', 'T');
		
		columns = [];
		columns.push(new nlobjSearchColumn('billaddress1'));
		columns.push(new nlobjSearchColumn('billaddress2'));
		columns.push(new nlobjSearchColumn('billcity'));
		columns.push(new nlobjSearchColumn('billstate'));
		columns.push(new nlobjSearchColumn('billzip'));
		columns.push(new nlobjSearchColumn('shipaddress1'));
		columns.push(new nlobjSearchColumn('shipaddress2'));
		columns.push(new nlobjSearchColumn('shipcity'));
		
		results = nlapiSearchRecord('salesorder', null, filters, columns);
		
		billAddress1 = ConvertNSFieldToString(results[0].getValue('billaddress1'));
		billAddress2 = ConvertNSFieldToString(results[0].getValue('billaddress'));
		billCity = ConvertNSFieldToString(results[0].getValue('billcity'));
		billState = ConvertNSFieldToString(results[0].getValue('billstate'));
		billZip = ConvertNSFieldToString(results[0].getValue('billzip'));
		
		if (billAddress1 == '' && billCity == '' && billState == '' && billZip == '')
		{
		    var filters = new Array();
			filters[filters.length] = new nlobjSearchFilter('internalid', null, 'anyof', dealerId);
			
			columns = [];
			columns.push(new nlobjSearchColumn('billaddress1'));
			columns.push(new nlobjSearchColumn('billaddress2'));
			columns.push(new nlobjSearchColumn('billcity'));
			columns.push(new nlobjSearchColumn('billstate'));
			columns.push(new nlobjSearchColumn('billzipcode'));
			columns.push(new nlobjSearchColumn('billcountry'));
			columns.push(new nlobjSearchColumn('shipaddress1'));
			columns.push(new nlobjSearchColumn('shipaddress2'));
			columns.push(new nlobjSearchColumn('shipcity'));
			
			results = nlapiSearchRecord('customer', null, filters, columns);
			
			billAddress1 = ConvertNSFieldToString(results[0].getValue('billaddress1'));
			billAddress2 = ConvertNSFieldToString(results[0].getValue('billaddress'));
			billCity = ConvertNSFieldToString(results[0].getValue('billcity'));
			billState = ConvertNSFieldToString(results[0].getValue('billstate'));
			billZip = ConvertNSFieldToString(results[0].getValue('billzip'));
		}
		billTrue = 'T';
	}
	
	var billAddress = addressee + '<br />' + billAddress1 + '<br />';
	if(billAddress2 != '')
		billAddress += billAddress2 + '<br />';
	billAddress += billCity + ' ' + billState + ' ' + billZip + '<br />' + billCountry;
	
	var shipAddress1 = ConvertNSFieldToString(invoice.getFieldValue('shipaddr1'));
	var shipAddress2 = ConvertNSFieldToString(invoice.getFieldValue('shipaddr2'));
	var shipCity = ConvertNSFieldToString(invoice.getFieldValue('shipcity'));
	var shipState = ConvertNSFieldToString(invoice.getFieldValue('shipstate'));
	var shipZip = ConvertNSFieldToString(invoice.getFieldValue('shipzip'));
	var shipCountry = ConvertNSFieldToString(invoice.getFieldValue('shipcountry'));	
	if (shipCountry == 'CA')
		shipCountry = 'Canada';
	else if (shipCountry == 'US')
		shipCountry = 'United States';
	
	if (shipAddress1 == '' && shipAddress2 == '' && billTrue == 'T')
	{		
		shipAddress1 = ConvertNSFieldToString(results[0].getValue('shipaddress1'));
		shipAddress2 = ConvertNSFieldToString(results[0].getValue('shipaddress2'));
		shipCity = ConvertNSFieldToString(results[0].getValue('shipcity'));
	}
	
	var shipAddress = addressee + '<br />' + shipAddress1 + '<br />';
	if(shipAddress2 != '')
		shipAddress += shipAddress2 + '<br />';
	shipAddress += shipCity + ' ' + shipState + ' ' + shipZip + '<br />' + shipCountry;
	
	
	var invoiceFooterText = GetCustomInvoiceFooterText();
	var lineItemCount = invoice.getLineItemCount('item');
	var itemName = '';
	var amount = 0;
	var qty = 0;
	var invoiceTotal = 0;
	var discountTotal = 0;
	var discountedTotal = 0;

	//If companyLogoUrl is empty, index out of bounce exception is thrown for
	//<img src=" ' + companyLogoUrl + '" />, so do not set logo if there is no logo url.
	var logoTD = 
			'<td align="center">' +
				'&nbsp;&nbsp;<br />' +
				companyAddress +
			'</td>';
	
	//Company logo is set, set the img src.
	if(companyLogo != null && companyLogo != '')
	{
		logoTD = 
				'<td align="left">' +
					'<img src=" ' + companyLogo + '" /><br />' +
					companyAddress +
				'</td>';
	}
		
	var detailsTable = '<table width="100%" cellpadding="0">' +
							'<tr>' +
								'<td>Invoice Date</td>' +
								'<td>' +
									invDate +
								'</td>' +
							'</tr>' +
							'<tr>' +
								'<td>Invoice #</td>' +
								'<td>' +
									invNum +
								'</td>' +
							'</tr>' +							
							'<tr>' +
								'<td>Sales Rep</td>' +
								'<td>' +
									salesRep +
								'</td>' +
							'</tr>' +	
							'<tr>' +
								'<td>VIN</td>' +
								'<td>' +
									vin +
								'</td>' +
							'</tr>' +	
							'<tr>' +
								'<td>Floorplan Type</td>' +
								'<td>' +
									floorPlanType +
								'</td>' +
							'</tr>' +									
							'<tr>' +
								'<td>PO #</td>' +
								'<td>' +
									poNum +
								'</td>' +
							'</tr>' +								
							'<tr>' +
								'<td>Flooring Approval #</td>' +
								'<td>' +
									flooringApprovalNum +
								'</td>' +
							'</tr>' +								
							'<tr>' +
								'<td>Ship Via</td>' +
								'<td>' +
									shipVia +
								'</td>' +
							'</tr>' +	
							
							'<tr>' +
								'<td>Ship Date</td>' +
								'<td>' +
									shipDate +
								'</td>' +
							'</tr>' +									
							'<tr>' +
								'<td>Date Flooring Approved</td>' +
								'<td>' +
									dateFlooringApproved +
								'</td>' +
							'</tr>' +	
							'<tr>' +
							'<td>Retail Sold Name</td>' +
							'<td>' +
								orderRetailSoldName +
							'</td>' +
							'</tr>' +	
							'<tr>' +
								'<td>Created From</td>' +
								'<td>' +
									createdFrom +
								'</td>' +
							'</tr>' +									
						'</table>';
	
	var headerTable = 
		'<table width="100%">' + 
			'<tr>' + 
				'<td colspan="2" style="padding-bottom:7px;">' +
					'<table width="100%" cellpadding="0">' +
						'<tr>' +
							'<td style="width:75%;">&nbsp;&nbsp;</td>' +
							'<td style="width:25%;font-size:16pt;">' +
								'<b>Invoice</b>' +
							'</td>' +
						'</tr>' +
					'</table>' +
				'</td>' + 
			'</tr>' +
			'<tr>' +
				logoTD +
				'<td>' +
					detailsTable +
				'</td>' +
			'</tr>' +				
		'</table>';
	
	
	var addressTable = 
					'<table width="100%">' + 	
						'<tr>' + 
							'<td style="padding-top:5px; width:40%;"><b>Bill To</b><br />' + 
								billAddress +
							'</td>' + 
							'<td style="padding-top:5px;width:60%;"><b>Ship To</b><br />' +
								shipAddress +
							'</td>' +
						'</tr>' +			
					'</table>';
	var lineItemTable = '<table width="100%" style="border:1px solid #000000;border-collapse: collapse; margin-top:50px;">' +
							'<tr style="border-bottom:1px solid #000000;">' + 
								'<td style="border-right:1px solid #000000;"><b>Qty</b></td>' +
								'<td style="border-right:1px solid #000000;"><b>Item</b></td>' +
								'<td style="border-right:1px solid #000000;"><b>Description</b></td>' +
								'<td><b>Total</b></td>' +
							'</tr>';
	var description = '';
	for (var i=1; i<=lineItemCount; i++)
	{
		qty = ConvertNSFieldToFloat(invoice.getLineItemValue('item', 'quantity', i));
		itemName = ConvertNSFieldToString(invoice.getLineItemText('item', 'item', i));
		description = ConvertNSFieldToString(invoice.getLineItemValue('item', 'description', i));
		amount = ConvertNSFieldToFloat(invoice.getLineItemValue('item', 'amount', i));
		
		if(amount >= 0) //only inlude lines with 0 or positive amount.
		{
			if(qty != 0)
			{
				lineItemTable += 
								'<tr>' + 
									'<td style="border-right:1px solid #000000;">' +
										qty +
									'</td>' +
									'<td style="border-right:1px solid #000000;">' +
										itemName +
									'</td>' +
									'<td style="border-right:1px solid #000000;">' +
										description +
									'</td>' +
									'<td align="right">' + 
									addCommas(nlapiFormatCurrency(amount)) +
									'</td>' +
								'</tr>';
				
				invoiceTotal += amount;
			}
		}		
		else
		{
			discountTotal += amount;
		}
			
	}

	lineItemTable += '</table>';	
	discountedTotal = invoiceTotal + discountTotal;	//Note: discountTotal will be negative, so to subtract it from invoiceTotal we simply add it.
	
	var totalTable = '<table width="100%">' +
						'<tr>' + 
							'<td style="margin-right:15px;">' +
								invoiceFooterText +
							'</td>' +
							'<td align="right">' +
								'<table>' +
									'<tr>' +
										'<td style="white-space:nowrap;padding-bottom:15px;" align="right"><b>Total</b>&nbsp;&nbsp;' + addCommas(nlapiFormatCurrency(invoiceTotal)) + '</td>' + 
									'</tr>' +
									'<tr>' +
										'<td style="white-space:nowrap;" align="right"><b>Dealer Discount</b>&nbsp;&nbsp;' + addCommas(nlapiFormatCurrency(discountTotal)) + '</td>' + 
									'</tr>' +	
									'<tr>' +
										'<td style="white-space:nowrap;" align="right"><b>Dealer Total</b>&nbsp;&nbsp;' + addCommas(nlapiFormatCurrency(discountedTotal)) + '</td>' + 
									'</tr>' +										
								'</table>' +
							'</td>' +
						'</tr>' +
						'</table>';

	
	
	var footerTable = '<table border="1" align="center">' +
					  	'<tr>' +
					  		'<td>&nbsp;</td>' +
							'<td>True and Certified Copy</td>' +
							'<td>&nbsp;&nbsp;&nbsp;</td>' +
						'</tr>' +
					   '</table>';
	
	var html = 
		'<head>' + 
			'<macrolist>' + 
			    '<macro id="footer">' + 
					footerTable +
			    '</macro>' + 
		    '</macrolist>' +
		'</head>' +  
		'<body style="font-size:9pt; font-family: Verdana, Geneva, sans-serif; margin-top:5px;margin-bottom:30px;margin-right:50px;margin-left:50px; padding:0px;" footer="footer" >' + 
			'<table width="100%">' + 
				'<tr>' + 
					'<td>' + 
						headerTable +
					'</td>' + 
				'</tr>' + 	
				'<tr>' + 
					'<td>' + 
						addressTable +
					'</td>' + 
				'</tr>' + 	
				'<tr>' + 
					'<td>' + 
						lineItemTable +
					'</td>' + 
				'</tr>' + 				
				'<tr>' + 
					'<td>' + 
					totalTable +
					'</td>' + 
				'</tr>' + 				
			'</table>' + 
		'</body>';
	
	return html;
}
