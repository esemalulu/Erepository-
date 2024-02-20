// Acct: 1215293

function PrintMSRPCustomAction()
{
	var context = nlapiGetContext();
	context.setSessionObject('printmsrp_salesorderid', nlapiGetRecordId());
}

function PrintMSRPSuitelet(request, response)
{
	var context = nlapiGetContext();
	var salesOrderId = context.getSessionObject('printmsrp_salesorderid');
	context.setSessionObject('printmsrp_salesorderid', null);
	
	nlapiLogExecution('DEBUG', 'Sales Order Id...', salesOrderId);
	
	if (salesOrderId == '' || salesOrderId == null)
	{
		salesOrderId = request.getParameter('salesOrderId');
	}
	
	if (salesOrderId != '' && salesOrderId != null) 
	{
		var pdfTitle = 'MSRP - Order ' + nlapiLookupField('salesorder', salesOrderId, 'tranid') + '.pdf';
		//var html = GetMSRPHTML(salesOrderId);
		var plugin = new MSRPPrintoutPlugin();
		var html = plugin.GetMSRPHTML(salesOrderId);
		
		PrintPDFInSuiteLet(request, response, pdfTitle, html);
	}
}

function GetMSRPHTML(salesOrderId)
{
	//nlapiLogExecution('DEBUG', 'Sales Order Id...', salesOrderId);
	var salesOrder = nlapiLoadRecord('salesorder', salesOrderId);
	//nlapiLogExecution('DEBUG', 'Sales Order Id...37', salesOrderId);
	var unitId = salesOrder.getFieldValue('custbodyrvsunit');
	var unitText = salesOrder.getFieldText('custbodyrvsunit');
	
	var unit = nlapiLoadRecord('customrecordrvsunit', unitId);
	var seriesId = unit.getFieldValue('custrecordunit_series');
	var modelId = unit.getFieldValue('custrecordunit_model');
	var serialNum = unit.getFieldValue('custrecordunit_serialnumber');

	var dealerId = unit.getFieldValue('custrecordunit_dealer');
	var model = nlapiLoadRecord('assemblyitem', modelId);
	var modelTypeText = model.getFieldText('custitemrvsmodeltype');
	var modelYear = model.getFieldText('custitemrvsmodelyear');
	var modelPrice = '';
	var modelText = nlapiEscapeXML(model.getFieldValue('itemid'));
	var modelMsrpText = model.getFieldValue('custitemgd_msrptext') || '';
	
	var series = nlapiLoadRecord('customrecordrvsseries', seriesId);
	var seriesMSOMake = nlapiEscapeXML(series.getFieldValue('custrecordseries_msoname'));
	var seriesName = nlapiEscapeXML(series.getFieldValue('name'));
	var seriesStandardFeatures = nlapiEscapeXML(salesOrder.getFieldValue('custbodyrvsmodelstandardfeatures'));
	
	if (seriesStandardFeatures == null)
		seriesStandardFeatures = '';
	
	var dealerText = nlapiEscapeXML(unit.getFieldText('custrecordunit_dealer'));
	
	var decorId = unit.getFieldValue('custrecordunit_decor');
	var decorText = nlapiEscapeXML(nlapiLookupField('item', decorId, 'itemid'));
	// already getting these above
	//var salesOrderId = unit.getFieldValue('custrecordunit_salesorder');
	//var salesOrder = nlapiLoadRecord('salesorder', salesOrderId);
	
	var discountTotal = parseFloat(salesOrder.getFieldValue('discounttotal'));
	if (isNaN(discountTotal))
		discountTotal = 0;
	
	var companyInfo = nlapiLoadConfiguration('companyinformation');
	var companyName = nlapiEscapeXML(companyInfo.getFieldValue('companyname'));
	var companyAddress1 = companyInfo.getFieldValue('address1');
	var companyCity = companyInfo.getFieldValue('city'); 
	var companyState = companyInfo.getFieldValue('state');
	var companyZip = companyInfo.getFieldValue('zip');
	var companyPhone = companyInfo.getFieldValue('phone');
	var companyFax = ConvertNSFieldToString(companyInfo.getFieldValue('fax'));
	var companyLogoUrl = nlapiEscapeXML('/core/media/media.nl?id=1408034&c=3598857&h=c04a63b561dc4b5cee9a');	
	var optionsHTML = '';
	
	var companyCountry = salesOrder.getFieldText('custbodymsocountry') || '';
	if (companyCountry == ''){
		companyCountry = salesOrder.getFieldValue('billcountry');
	}
	var currencySymbol = '$';
	// If the company is Canadian, get the latest CAD conversion rate and set a special Canadian disclaimer
	if (companyCountry == 'Canada' || companyCountry == 'CA'){
		var customrecordgd_usdtocadconversionSearch = nlapiSearchRecord("customrecordgd_usdtocadconversion",null,[], 
		[
			new nlobjSearchColumn("custrecordgd_usdtocadconversion_rate"), 
			new nlobjSearchColumn("created").setSort(true)
		]
		);
		var conversionRateCAD = customrecordgd_usdtocadconversionSearch[0].getValue('custrecordgd_usdtocadconversion_rate');
		var disclaimerText = 'MSRP shown in Canadian Dollars. Based on estimated exchange rate at date of printing. Pricing does not include tax, title, license or dealer prep charges. Because of our commitment to continuous product improvement, Grand Design Recreational Vehicles reserves the right to change prices, components, standards, options, specifications, and materials without notice and at any time. Be sure to review current product details with your local dealer before purchasing.'
		currencySymbol = 'CAD ';
	}
	else {
		var disclaimerText = nlapiGetContext().getSetting('SCRIPT', 'custscriptgd_msrpdisclaimertext'); // get disclaimer text from company preferences. 
	}

	var msrpNotesTable = 
		'<table width="100%" style="font-size:8pt; border-style:sold; border-width:1px; border-color:black;">';
		
	var msrModelStandardFeaturesTable = 
		'<table width="100%" style="font-size:6pt; border-style:sold; border-width:1px; border-color:black;">' + 
			'<tr>' + 
				'<td>' +
					'<b><span padding="0" margin="0" style="border-bottom:1px solid black;">Standard Features:</span></b> &nbsp;' +  
					seriesStandardFeatures + 
				'</td>' + 
			'</tr>' + 
		'</table>';	
	
	// RCB 3-6-13 temp reset this to check formatting
	msrModelStandardFeaturesTable = '<table width="100%" style="font-size:6pt; border-style:none; border-width:1px; border-color:black;">' + 
		'<tr>' + 
		'<td>' +
			' &nbsp;' +  
		'</td>' + 
	'</tr>' + 
	'</table>';	
	
	var disclaimerTable = 
		'<table width="100%" style="font-size:10pt;">'+
			'<tr>' + 
				'<td align="center">'+
				'<i>' + disclaimerText + '</i>' +
				'</td>' + 
			'</tr>' + 
		'</table>';	
		
	var footerAddressTable = 
		'<table width="100%" style="font-size:6pt; border-style:sold; border-width:1px; border-color:black;">' + 
			'<tr>' + 
				'<td align="center">' +
					companyName + ' - ' + companyAddress1 + ', ' + companyCity + ', ' + companyState + ' ' +  companyZip + ' PHONE: ' + companyPhone + ' FAX: ' + companyFax + 
				'</td>' + 
			'</tr>' + 
		'</table>';	
	
	// loop through and build the options html table
	var lineItemCount = salesOrder.getLineItemCount('item');
	var totalOptions = 0;
	var totalFreight = 0;
	
//	var priceLevelRateText = salesOrder.getFieldValue('custbodyrvsmsrprate');
//	var priceLevelRate = 0;
//	if (priceLevelRateText == null)
//	{
//		priceLevelRate = 0;
//	}
//	else
//	{
//		priceLevelRate = parseFloat(priceLevelRateText.substring(0, priceLevelRateText.length-1))/ 100;
//	}
	
	// create the variables here and just reuse them in the loop for efficiency reasons
	var itemId, priceDec, msrpDec, description, msrpNotes, msrpNotesLineCount = 0, itemsLineCount = 0;
	//1-13-2015 -CO
	//FREIGHT_ITEM, FREIGHT_DISCOUNT_ITEM, & FUEL_SURCHARGE_ITEM are no longer
	//used to calculate the total per Case 4495
	var FREIGHT_ITEM = GetFreightItem();
	var FREIGHT_DISCOUNT_ITEM = GetFreightDiscountItem();
	var FUEL_SURCHARGE_ITEM = GetFuelSurchargeItem(); 
	var SHIPPING_METHOD_DPUID = GetShippingMethodDPUId();
	var DPU_CHARGE_ITEM = nlapiGetContext().getSetting('SCRIPT', 'custscriptgd_dpustoragefeeitem');
	
	for (var i=1; i<=lineItemCount; i++)
	{
	    itemId = salesOrder.getLineItemValue('item', 'item', i);
		priceDec = ConvertNSFieldToFloat(salesOrder.getLineItemValue('item', 'amount', i));
		msrpDec = Math.round(ConvertNSFieldToFloat(salesOrder.getLineItemValue('item', 'custcolrvsmsrpamount', i)));
		if (companyCountry == 'Canada') {
			priceDec *= conversionRateCAD;
			msrpDec *= conversionRateCAD;
		}
		description = nlapiEscapeXML(salesOrder.getLineItemValue('item', 'description', i));
		msrpNotes = nlapiEscapeXML(salesOrder.getLineItemValue('item', 'custcolrvsmsrpnotes', i)); 
		totalFreight += (itemId == FREIGHT_ITEM || itemId == FREIGHT_DISCOUNT_ITEM || itemId == FUEL_SURCHARGE_ITEM) ? priceDec : 0;
		if (isNaN(priceDec))
			priceDec = 0;
		
		var msrpText = addCommas(nlapiFormatCurrency(Math.ceil(msrpDec)));
		
		if (msrpDec == 0)
			msrpText = '&nbsp;';
		else
			msrpText = currencySymbol + msrpText;
		
		if (itemId == modelId)
		{
			modelPrice = msrpDec;
		}
		else if (itemId != decorId)
		{

			//DEBUG:
			

			if ((salesOrder.getLineItemValue('item', 'custcolrvsmsrp', i) == 'T') || (salesOrder.getLineItemValue('item', 'custcolgd_ischassis', i) == 'T') )
			{
				totalOptions += msrpDec;
				itemsLineCount += 1;
				optionsHTML += 
					'<tr>' + 
						'<td colspan="10" style="font-size:8pt; border-style:sold; border-width:1px; border-color:black;">' +  //style="font-size:10pt; font-family: Verdana, Geneva, sans-serif;
							description + 
						'</td>' + 
						'<td colspan="2" style="font-size:8pt; border-style:sold; border-width:1px; border-color:black; text-align:right;" align="right">' +  
							msrpText + 
						'</td>' + 
					'</tr>';
					
				if (msrpNotes != null && msrpNotes != '')
				{
					msrpNotesTable += 
						'<tr>' + 
							'<td>' + 
								'<b><span padding="0" margin="0" style="border-bottom:1px solid black;">' + description + '</span></b>: ' + msrpNotes +
							'</td>' + 
						'</tr>';
					msrpNotesLineCount += 1;
				}
			}
		}
	}
	
	optionsHTML =
					'<tr>' + 
						'<td colspan="8" style="border-left: 1px solid; border-top: 1px solid; border-bottom: 1px solid; border-color:black; font-weight:bold;">' +
							modelYear + ' ' + seriesMSOMake + ' ' + modelTypeText + ' Model: ' + modelText +//'Description' + 
						'</td>' + 
						'<td align="right" colspan="2" style="border-right: 1px solid; border-top: 1px solid; border-bottom: 1px solid; border-color:black; font-weight:bold;">' +
							'BASE PRICE:' +
						'</td>' +
						'<td align="right" colspan="2" style="width:100px; border-style:sold; border-width:1px; border-color:black;">' +
						'<b>' + currencySymbol + addCommas(nlapiFormatCurrency(Math.ceil(modelPrice))) + '</b>' + 
						'</td>' + 
					'</tr>' + optionsHTML;


	
	
	
	msrpNotesTable += '</table>';
	if (msrpNotesLineCount < 1)
		msrpNotesTable = '';
	var totalAmount = modelPrice + totalOptions + totalFreight;
	
	var grandTotalHTML = '<td colspan="2" style="font-weight:bold; border-style:solid; border-width:1px; border-color:black; border-top: 3px solid;" align="right">' +  
							currencySymbol + addCommas(nlapiFormatCurrency(Math.ceil(totalAmount))) +
							'</td>';
	var dpuMessage = '';
	if (salesOrder.getFieldValue('shipmethod') == SHIPPING_METHOD_DPUID){
		grandTotalHTML = '<td colspan="2" style="font-weight:bold; border-style:solid; border-width:1px; border-color:black; border-top: 3px solid;" align="left">' +  
							'***' +
							'</td>';
		dpuMessage = '<tr><td>&nbsp;</td></tr>' + //add a blank row so there is some separation between the total line and the notes table.
						'<tr>' +
							'<td colspan="3"> </td>' +
							'<td colspan="6" align="center" style="font-weight:bold; border-style:solid; border-width:1px; border-color:black;">' +
								'***Dealer billed directly for freight***' +
							'</td>' +
							'<td colspan="3"> </td>' +
						'</tr>';
	}
	
	var msrpTextTable = '<tr><td>&nbsp;</td></tr>' + //add a blank row
						'<tr >' + 
							'<td colspan="2"> </td>' +
							'<td colspan="8" align="center" style="font-size:11pt">' +
								modelMsrpText +  
							'</td>' + 
							'<td colspan="2"> </td>' +
						'</tr>';

	optionsHTML += 	'<tr>' + 
						'<td colspan="7">' +  //style="font-size:10pt; font-family: Verdana, Geneva, sans-serif;
						'</td>' + 
						'<td colspan="3" align="right" style="border-right: 1px solid; font-weight:bold;">' +  //style="font-size:10pt; font-family: Verdana, Geneva, sans-serif;
							'OPTIONS TOTAL' + //'BASE PRICE' +
						'</td>' +
						'<td colspan="2" style="font-weight:bold; border-bottom-style:sold; border-width:1px; border-bottom-color:black;" align="right">' +  
							currencySymbol + addCommas(nlapiFormatCurrency(Math.ceil(totalOptions))) + //currencySymbol + addCommas(nlapiFormatCurrency(modelPrice)) +
						'</td>' + 
					'</tr>' +
					'<tr>' + 
						'<td colspan="5">' +  //style="font-size:10pt; font-family: Verdana, Geneva, sans-serif;
						'</td>' + 
						'<td colspan="5" align="right" style="font-weight:bold; border-right: 1px solid;">' +  //style="font-size:10pt; font-family: Verdana, Geneva, sans-serif;
							'***MAP*** SUBTOTAL' +//'OPTIONS TOTAL' +
						'</td>' +
						'<td colspan="2" style="font-weight:bold; border-style:sold; border-width:1px; border-color:black;" align="right">' +  
							currencySymbol + addCommas(nlapiFormatCurrency(Math.ceil(totalOptions) + Math.ceil(modelPrice))) + //currencySymbol + addCommas(nlapiFormatCurrency(totalOptions)) +
						'</td>' + 
					'</tr>' +
					'<tr>' + 
						'<td colspan="2">' +  //style="font-size:10pt; font-family: Verdana, Geneva, sans-serif;
						'</td>' + 
						'<td colspan="8" align="right" style="font-weight:bold; border-right: 1px solid;">' +  //style="font-size:10pt; font-family: Verdana, Geneva, sans-serif;
							'GRAND TOTAL INC FREIGHT' +
						'</td>' +
						grandTotalHTML +
					'</tr>';
//					'<tr>' + 
//						'<td coslspan="10"></td>'+
//						'<td style="font-weight:bold;" align="right">' + 
//							'BASE PRICE' + 
//						'</td>' + 
//						'<td style="font-weight:bold; border-bottom-style:sold; border-bottom-width:1px; border-bottom-color:black" align="right">' + 
//							currencySymbol + addCommas(nlapiFormatCurrency(modelPrice)) + 
//						'</td>' + 
//					'</tr>' + 
//					'<tr>' + 
//						'<td coslspan="10"></td>'+
//						'<td style="font-weight:bold;" align="right">' + 
//							'OPTIONS' + 
//						'</td>' + 
//						'<td style="font-weight:bold; border-bottom-style:sold; border-bottom-width:1px; border-bottom-color:black" align="right">' + 
//							 currencySymbol + addCommas(nlapiFormatCurrency(totalOptions)) + 
//						'</td>' + 
//					'</tr>' +
//					'<tr>' + 
//						'<td coslspan="10"></td>'+
//						'<td style="font-weight:bold;" align="right">' + 
//							'TOTAL' + 
//						'</td>' + 
//						'<td style="font-weight:bold; border-style:sold; border-width:1px; border-color:black;" align="right">' + 
//							 currencySymbol + addCommas(nlapiFormatCurrency(totalAmount)) + 
//						'</td>' + 
//					'</tr>';
	
	//If companyLogoUrl is empty, index out of bounce exception is thrown for
	//<img src=" ' + companyLogoUrl + '" />, so do not set logo if there is no logo url.
	var logoTR = 
		'<tr>' + 
			'<td colspan="12" align="center">' +
				'&nbsp;&nbsp;' +
			'</td>' + 
		'</tr>';
	
	//Company logo is set, set the img src.
	if(companyLogoUrl != null && companyLogoUrl != '')
	{
		logoTR = 
			'<tr>' +
				'<td align="center" colspan="12">' +
					'<img src=" ' + companyLogoUrl + '" width="292px" height="71px" />' +  // Added size for logo per Case 5228 8-24-15 JRB
				'</td>' +
			'</tr>';
	}
	
	var headerHTML = 
		'<table width="100%">' +
				logoTR +
			'<tr>' +
				'<td colspan="4">' +
				'</td>' +
				'<td align="center" colspan="4" style="font-size:16pt; padding-top:5px;"><span padding="0" margin="0" style="border-bottom:1px solid black;">' +
					seriesName +
				'</span></td>' +
				'<td align="center" colspan="4" style="font-weight:bold; font-size:27pt; font-family:Times New Roman, Times, serif; color:red;">' +
					'MSRP' +
				'</td>' +
			'</tr>' +
			'<tr>' +
				'<td colspan="12">' +
					'<table width="100%">' +
						'<tr>' +
							'<td colspan="2"> ' +
							'</td>' +
							'<td colspan="2">' +
								//modelYear + ' ' + seriesMSOMake + ' ' + modelTypeText +
							'</td>' +
							'<td align="center" style="width:50px;" colspan="2">' +
								//'Model: ' + modelText +
							'</td>' +
							'<td align="right" colspan="1">' +
								'Decor: ' + 
							'</td>' +
							'<td colspan="5" align="left">' +
								decorText +
							'</td>' + 
						'</tr>' +
						'<tr>' +
							'<td colspan="2"> ' +
							'</td>' +
							'<td colspan="4" align="left">' +
								'Dealer: ' + dealerText +
							'</td>' +
							'<td colspan="1" align="right">' +
								'VIN: ' +  
							'</td>' + 
							'<td colspan="5" align="left">' +
								unitText + 
							'</td>' + 
							'<td colspan="4" align="left">' +
								'Serial #: ' + serialNum +
							'</td>' +
						'</tr>' + 
					'</table>' + 							
				'</td>' + 
			'</tr>' +
		'</table>';
	var notesTable = '';
	if (itemsLineCount < 25)
	{
		notesTable = '<tr><td>&nbsp;</td></tr>' + //add a blank row so there is some separation between the total line and the notes table.
						'<tr>' +
							'<td colspan="12">' +
								msrpNotesTable +
							'</td>' +
						'</tr>' +
						'<tr>' +
							'<td colspan="12">' +
								msrModelStandardFeaturesTable +
							'</td>' +
						'</tr>';
	}
	var footerTable = 
		'<table width="100%">' + 
			'<tr>' + 
				'<td colspan="2">' + 
					disclaimerTable + 
				'</td>' + 
			'</tr>' +
			'<tr>' + 
				'<td colspan="2">' + 
					footerAddressTable + 
				'</td>' + 
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
		'<body style="font-size:10pt; font-family: Verdana, Geneva, sans-serif;" footer="footer" footer-height="90px" padding="0.1in 0.5in 0.1in 0.5in" size="Letter">' + 
			'<table width="100%">' +
				'<tr>' +
					'<td colspan="12">' +
						headerHTML +
					'</td>' +
				'</tr>' +
				optionsHTML +
				notesTable + 
				dpuMessage +
				msrpTextTable +
			'</table>' +
		'</body>';
	
	return html;
}
