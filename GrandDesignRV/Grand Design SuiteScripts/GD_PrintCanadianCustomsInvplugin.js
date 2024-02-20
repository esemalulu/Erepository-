// Acct: RVS

function PrintCanadianCustomsInvoiceCustomAction()
{
	var context = nlapiGetContext();
	context.setSessionObject('printcancustinvoice_salesorderid', nlapiGetRecordId());
}


function PrintCanadianCustomsInvoiceSuitelet(request, response)
{
	var context = nlapiGetContext();
	var salesOrderId = context.getSessionObject('printcancustinvoice_salesorderid');
	context.setSessionObject('printcancustinvoice_salesorderid', null);
	
//	nlapiLogExecution('DEBUG', 'Sales Order Id', salesOrderId);
	
	if (salesOrderId == '' || salesOrderId == null)
	{
		salesOrderId = request.getParameter('salesOrderId');
	}
	
	if (salesOrderId != '' && salesOrderId != null) 
	{
		var pdfTitle = 'Canadian Customs Invoice - Order ' + nlapiLookupField('salesorder', salesOrderId, 'tranid') + '.pdf';
		var plugin = new CanadianCustomsInvoicePrintPlugin();
		var html = plugin.GetCanadianCustomsInvoiceHTML(salesOrderId);
		
		PrintPDFInSuiteLet(request, response, pdfTitle, html);
	}
}

function GetCanadianCustomsInvoiceHTML(salesOrderId)
{
	/** @record salesorder */ 
	var salesOrder = nlapiLoadRecord('salesorder', salesOrderId);
	var orderNumber = salesOrder.getFieldValue('tranid');
	var unitId = salesOrder.getFieldValue('custbodyrvsunit');
	var unit = nlapiLoadRecord('customrecordrvsunit', unitId);
	var modelId = salesOrder.getFieldValue('custbodyrvsmodel');
	var model = nlapiLoadRecord('assemblyitem', modelId);
	var seriesId = salesOrder.getFieldValue('custbodyrvsseries');
	var series = nlapiLoadRecord('customrecordrvsseries', seriesId);
	
	var cols = new Array();
	cols[cols.length] = new nlobjSearchColumn('internalid');
	cols[cols.length] = new nlobjSearchColumn('tranid');
	cols[cols.length] = new nlobjSearchColumn('total');
	var filters = new Array();
	filters[filters.length] = new nlobjSearchFilter('createdfrom', null, 'anyof', salesOrderId);
	filters[filters.length] = new nlobjSearchFilter('type', null, 'anyof', 'CustInvc');
	var invoices = nlapiSearchRecord('transaction', null, filters, cols); //search for invoice created from this sales order
	var invoiceNum = '';
	var invoiceTotal = '';
	if(invoices != null && invoices.length > 0) //there should only be one invoice, so get its invoice number from the result
	{
		invoiceNum = invoices[0].getValue('tranid');
		invoiceTotal = invoices[0].getValue('total');
	}
	
	
	var shipDate = unit.getFieldValue('custrecordunit_shipdate');
	var shipDateFormatted = '';
	if (shipDate != null)
	{
		shipDate = nlapiStringToDate(shipDate);
		var month = (shipDate.getMonth() + 1).toString();
		if (month.length == 1)
			month = '0' + month;
			
		var day = shipDate.getDate().toString();
		if (day.length == 1)
			day = '0' + day; 
		
		shipDateFormatted = shipDate.getFullYear() + '/' + month + '/' + day;
	}	
	
	var modelTypeText = ConvertNSFieldToString(model.getFieldText('custitemrvsmodeltype'));
//	var modelTypeId = model.getFieldValue('custitemrvsmodeltype');
	var modelYear = ConvertNSFieldToString(model.getFieldText('custitemrvsmodelyear'));
	var modelNumber = ConvertNSFieldToString(model.getFieldValue('itemid'));
	
	var seriesName = series.getFieldValue('custrecordseries_msoname');
	
	var dealerId = salesOrder.getFieldValue('entity');
	var dealer = nlapiLoadRecord('customer', dealerId);
	
	var orderTotal = salesOrder.getFieldValue('total');
	// var vinNumber = unit.getFieldValue('name');

	var vinNumberUnit = unit.getFieldValue('name');
	var vinNumberChassis = unit.getFieldValue('name');
	var serialNumber = unit.getFieldValue('custrecordunit_serialnumber');
	var chassisManufacturer = model.getFieldValue('custitemgd_chassismfg');


	if (chassisManufacturer) {
		vinNumberChassis = 'Chassis ' + vinNumberChassis;
		serialNumber = 'Serial ' + serialNumber;
	}
	else {
		vinNumberChassis = '&nbsp;';
		serialNumber = '&nbsp;';
	}
	
	// we are now pulling the weight from the model because they print this before the unit has been weighed
	var weight = model.getFieldValue('custitemrvsmodelgvwrlbs'); //unit.getFieldValue('custrecordunit_gvwrlbs');
	
	if (weight == null || weight == '0')
		weight = '';
	else
		weight = ConvertLbToKG(weight).toFixed(0) + ' kg';
	
	var uvwLb = ConvertNSFieldToInt(unit.getFieldValue('custrecordunit_uvw'));
	var netWeightKg = ConvertLbToKG(uvwLb);
	
	if(netWeightKg != 0)
		netWeightKg = netWeightKg.toFixed(0) + ' kg';
	else
		netWeightKg = '';
	
	
	var addressee = ConvertNSFieldToString(dealer.getFieldValue('companyname'));
	var address1 = ConvertNSFieldToString(salesOrder.getFieldValue('shipaddr1'));
	var city = ConvertNSFieldToString(salesOrder.getFieldValue('shipcity'));
	var state = ConvertNSFieldToString(salesOrder.getFieldValue('shipstate'));
	var zip = ConvertNSFieldToString(salesOrder.getFieldValue('shipzip'));
	var country = ConvertNSFieldToString(salesOrder.getFieldValue('shipcountry'));
	
	if (country == 'CA')
		country = 'Canada';
	else if (country == 'US')
		country = 'United States';
	
	var companyName = GetCompanyName(false);
	var companyShipAddress = GetCompanyShippingAddress(false);
	var transportation = 'TRUCK';
	var numberOfPackages = '1';
	var exportersName = 'SAME';
	
	var importerAddressee = '';
	var importerAddress1 = '';
	var importerAddress2 = '';
	var importerCity = '';
	var importerState = '';
	var importerZip = '';
	var importerCountry = '';
	var importerCompanyName = '';
	
	
	var importerId = salesOrder.getFieldValue('custbodyrvsimporter');
	if (importerId != null)
	{
		var importer = nlapiLoadRecord('vendor', importerId);
		importerCompanyName = ConvertNSFieldToString(importer.getFieldValue('printoncheckas'));	
		if(importerCompanyName == '')
			importerCompanyName = ConvertNSFieldToString(importer.getFieldValue('legalname')); 
		if(importerCompanyName == '')
			importerCompanyName = ConvertNSFieldToString(importer.getFieldValue('companyname'));
		
//		nlapiLogExecution('debug', 'CCI Printing', 'importerCompanyName = ' + importerCompanyName);
		for (var i=1; i<=importer.getLineItemCount('addressbook'); i++)
		{
			var label = ConvertNSFieldToString(importer.getLineItemValue('addressbook', 'label', i));
//			nlapiLogExecution('debug', 'CCI Printing', 'label = ' + label);
			if (label != null && label.toLowerCase() == 'cci')
			{
				importerAddressee = ConvertNSFieldToString(importer.getLineItemValue('addressbook', 'addressee', i));
				importerAddress1 = ConvertNSFieldToString(importer.getLineItemValue('addressbook', 'addr1', i));
				importerAddress2 = ConvertNSFieldToString(importer.getLineItemValue('addressbook', 'addr2', i));
				importerCity = ConvertNSFieldToString(importer.getLineItemValue('addressbook', 'city', i));
				importerState = ConvertNSFieldToString(importer.getLineItemValue('addressbook', 'displaystate', i));
				importerZip = ConvertNSFieldToString(importer.getLineItemValue('addressbook', 'zip', i));
				importerCountry = ConvertNSFieldToString(importer.getLineItemValue('addressbook', 'country', i));
				
				
//				nlapiLogExecution('debug', 'CCI Printing', 'importerAddressee = ' + importerAddressee);
				// print Canada instead of CA
				if (importerCountry == 'CA')
					importerCountry = 'Canada';
				else if (importerCountry == 'US')
					importerCountry = 'United States';
				
				break;
			}
		}	
	}
	
	
	var companyImporterAddressee = '';
	var companyImporterAddress1 = '';
	var companyImporterAddress2 = '';
	var companyImporterCity = '';
	var companyImporterState = '';
	var companyImporterZip = '';
	var companyImporterCountry = '';
	var companyImporterName = '';
	var companyImporterId = GetCompanyImporterId();
	var companyImporterPhone = '';
	if (companyImporterId != null && companyImporterId != '')
	{
		var importer = nlapiLoadRecord('vendor', companyImporterId);
		companyImporterName = ConvertNSFieldToString(importer.getFieldValue('printoncheckas'));		
		if(companyImporterName == '')
			companyImporterName = ConvertNSFieldToString(importer.getFieldValue('legalname'));
		if(companyImporterName == '')
			companyImporterName = ConvertNSFieldToString(importer.getFieldValue('companyname'));
		
//		nlapiLogExecution('debug', 'CCI Printing', 'importerCompanyName = ' + importerCompanyName);
		for (var i=1; i<=importer.getLineItemCount('addressbook'); i++)
		{
			var isDefaultShipping = ConvertNSFieldToString(importer.getLineItemValue('addressbook', 'defaultshipping', i));
			if (isDefaultShipping != '' && isDefaultShipping == 'T')
			{
				companyImporterAddressee = ConvertNSFieldToString(importer.getLineItemValue('addressbook', 'addressee', i));
				companyImporterAddress1 = ConvertNSFieldToString(importer.getLineItemValue('addressbook', 'addr1', i));
				companyImporterAddress2 = ConvertNSFieldToString(importer.getLineItemValue('addressbook', 'addr2', i));
				companyImporterCity = ConvertNSFieldToString(importer.getLineItemValue('addressbook', 'city', i));
				companyImporterState = ConvertNSFieldToString(importer.getLineItemValue('addressbook', 'displaystate', i));
				companyImporterZip = ConvertNSFieldToString(importer.getLineItemValue('addressbook', 'zip', i));
				companyImporterCountry = ConvertNSFieldToString(importer.getLineItemValue('addressbook', 'country', i));
				companyImporterPhone = ConvertNSFieldToString(importer.getFieldValue('phone'));
				
//				nlapiLogExecution('debug', 'CCI Printing', 'importerAddressee = ' + importerAddressee);
				// print Canada instead of CA
				if (companyImporterCountry == 'CA')
					companyImporterCountry = 'Canada';
				else if (companyImporterCountry == 'US')
					companyImporterCountry = 'United States';
				
				break;
			}
		}	
	}
	
	var fuelFreightSurchage = 0;
	var freightItemId = GetFreightItem();
	var fuelItemId = GetFuelSurchargeItem();
	for (var i=1; i<=salesOrder.getLineItemCount('item'); i++)
	{
		var itemId = salesOrder.getLineItemValue('item', 'item', i);
		
		if(fuelFreightSurchage == 0) //none of the items have been found
		{
			if(itemId == freightItemId || itemId == fuelItemId)
			{
				fuelFreightSurchage = ConvertNSFieldToFloat(salesOrder.getLineItemValue('item', 'amount', i));
			}
		}
		else //one item has been found, we can break out of the loop here when we find another one
		{
			if(itemId == freightItemId || itemId == fuelItemId)
			{
				fuelFreightSurchage += ConvertNSFieldToFloat(salesOrder.getLineItemValue('item', 'amount', i));
				break;
			}
		}
	}
	
	var borderBottom = ' border-bottom-width="1px" border-bottom-color="black" border-bottom-style="solid" ';
	var borderRight = ' border-right-width="1px" border-right-color="black" border-right-style="solid" ';
	var borderLeft = ' border-left-width="1px" border-left-color="black" border-left-style="solid" ';
	var borderTop = ' border-top-width="1px" border-top-color="black" border-top-style="solid" ';
	
	var checkboxHTML = 
		'<table width="20px" border-width="1px" border-color="black" border-style="solid">' +
			'<tr>' + 
				'<td>' +
					'<br /> &nbsp;' + 
				'</td>' + 
			'</tr>' +
		'</table>';
	
	var checkedCheckboxHTML = 
		'<table border-width="1px" border-color="black" border-style="solid">' +
			'<tr>' + 
				'<td>' +
					'X' + 
				'</td>' + 
			'</tr>' +
		'</table>';
	
	var headerHTML = 
		'<table width="100%" cellpadding="0">' + 
			'<tr>' + 
				'<td style="width:10%;">' + 
					'&nbsp;' + // logo? 
				'</td>' +
				'<td style="width:15%;">' + 
					'Canada Border <br /> Services Agency' +
				'</td>' + 
				'<td style="width:15%;">' + 
					'Agence des services <br /> frontaliers du Canada' +
				'</td>' +  
				'<td style="width:50%; font-weight:bold;">' + 
					'CANADA CUSTOMS INVOICE <br /> FACTURE DES DOUANES CANADIENNES' +
				'</td>' +
				'<td'  + borderTop + borderLeft + borderRight + 'style="width:10%;" class="smallFont">' + 
				 	'<table width="100%" cellpadding="1">' + 
						'<tr>' + 
							'<td colspan="3">' + 
								'Page' + 
							'</td>' +
						'</tr>' + 
						'<tr>' + 
							'<td>' + 
								'&nbsp;' + 
							'</td>' +
							'<td>' + 
								'of <br /> de' + 
							'</td>' +
							'<td>' + 
								'&nbsp;' + 
							'</td>' +
						'</tr>' +
					'</table>' + 
				'</td>' +
			'</tr>' + 
		'</table>';
		
	var box1Thru3HTML = 
		'<table border-width="1px" border-color="black" border-style="solid" width="100%">' +
			'<tr>' + 
				'<td ' + borderRight + borderBottom + 'style="width:50%;">' + // BOX 1
					'<table width="100%">' + 
						'<tr>' + 
							'<td colspan="2" class="smallFont">' +
								'1. Vendor (name and address) - Vendeur (nom et adresse)' + 
							'</td>' +
						'</tr>' + 
						'<tr>' + 
							'<td style="width:20%;">' +
								'&nbsp;' + 
							'</td>' +
							'<td style="width:80%;">' +
							companyName + 
							'</td>' +
						'</tr>' +
						'<tr>' + 
							'<td>' +
								'&nbsp;' + 
							'</td>' +
							'<td>' +
								companyShipAddress + 
							'</td>' +
						'</tr>' +
						'<tr>' + 
							'<td>' +
								'&nbsp;' + 
							'</td>' +
							'<td>' +
								'&nbsp;' + 
							'</td>' +
						'</tr>' +
					'</table>' + 
				'</td>' +
				'<td ' + borderBottom + 'style="width:50%;">' + // BOXES 2 & 3
					'<table width="100%">' + 
						'<tr>' + 
							'<td colspan="2" class="smallFont">' +
								'2. Date of direct shipment to Canada - Date d\'expedition directe vers le Canada' + 
							'</td>' +
						'</tr>' +
						'<tr>' + 
							'<td style="width:20%;">' +
								'&nbsp;' + 
							'</td>' +
							'<td style="width:80%;">' +
								shipDateFormatted + 
							'</td>' +
						'</tr>' +
						'<tr>' + 
							'<td colspan="2" class="smallFont">' +
								'3. Other references (include purchaser\'s order No.) <br /> &nbsp; &nbsp; Autres references (inclure le n� de commande de l\'acheteur)' + 
							'</td>' +
						'</tr>' +
						'<tr>' + 
							'<td colspan="2">' +
								importerCompanyName +
							'</td>' +
							
						'</tr>' +
					'</table>' + 
				'</td>' +
			'</tr>';
			
		var box4Thru7HTML = 			
			'<tr>' + 
				'<td ' + borderRight + borderBottom + 'style="width:50%;">' + // BOX 4
					'<table width="100%" cellpadding="1">' + 
						'<tr>' + 
							'<td colspan="2" class="smallFont">' +
								'4. Consignee (name and address) - Destinataire (nom et adresse)' + 
							'</td>' +
						'</tr>' + 
						'<tr>' + 
							'<td style="width:20%;">' +
								'&nbsp;' + 
							'</td>' +
							'<td style="width:80%;">' +
								addressee + 
							'</td>' +
						'</tr>' +
						'<tr>' + 
							'<td>' +
								'&nbsp;' + 
							'</td>' +
							'<td>' +
								address1 + 
							'</td>' +
						'</tr>' +
						'<tr>' + 
							'<td>' +
								'&nbsp;' + 
							'</td>' +
							'<td>' +
								city + ', '+ state + ' ' + zip + 
							'</td>' +
						'</tr>' +
						'<tr>' + 
							'<td>' +
								'&nbsp;' + 
							'</td>' +
							'<td>' +
								country + 
							'</td>' +
						'</tr>' +
					'</table>' + 
				'</td>' +
				'<td ' + borderBottom + 'style="width:50%;">' + // BOXES 5-8
					'<table width="100%">' + 
						'<tr>' + 
							'<td colspan="2" class="smallFont">' +
								'5. Purchaser\'s name and address (if other than consignee) <br /> &nbsp; &nbsp; Nom et adresse de l\'acheteur (s\'il diff�re du destinataire)' + 
							'</td>' +
						'</tr>' +
						'<tr>' + 
							'<td colspan="2">' +
								'<table width="100%" cellpadding="1">' + 
									'<tr>' + 
										'<td style="width:20%;">' +
											'&nbsp;' + 
										'</td>' +
										'<td style="width:80%;">' +
										//	companyImporterAddressee + 
										'</td>' +
									'</tr>' +
									'<tr>' + 
										'<td>' +
											'&nbsp;' + 
										'</td>' +
										'<td>' +
										//	companyImporterAddress1 + 
										'</td>' +
									'</tr>' +
									'<tr>' + 
										'<td>' +
											'&nbsp;' + 
										'</td>' +
										'<td>' +
									//		companyImporterCity + ', '+ companyImporterState + ' ' + companyImporterZip + 
										'</td>' +
									'</tr>' + 
									'<tr>' + 
										'<td>' +
											'&nbsp;' + 
										'</td>' +
										'<td>' +
									//		companyImporterCountry + 
										'</td>' +
									'</tr>' +
								'</table>' +
							'</td>' +
						'</tr>' +
						'<tr>' + 
							'<td colspan="2" class="smallFont" ' + borderTop + '>' +
								'6. Country of transhipment - Pays de transbordement' + 
							'</td>' +
						'</tr>' +
						'<tr>' + 
							'<td style="width:20%;">' +
								'&nbsp;' + 
							'</td>' +
							'<td style="width:80%;">' +
								'USA' + 
							'</td>' +
						'</tr>' +
						'<tr>' + 
							'<td colspan="2" ' + borderTop + '>' +
								'<table width="100%" cellpadding="1">' + 
									'<tr>' + 
										'<td style="width:50%;"' + borderRight + '>' +
											'<table width="100%" cellpadding="1">' + 
												'<tr>' + 
													'<td colspan="2" class="smallFont">' +
														'7. Country of origin of goods <br /> &nbsp; &nbsp; Pays d\'origine des marchandises' + 
													'</td>' +
												'</tr>' +
												'<tr>' + 
													'<td style="width:20%;">' +
														'&nbsp;' + 
													'</td>' +
													'<td style="width:80%;">' +
														'USA' + 
													'</td>' +
												'</tr>' +
											'</table>' +
										'</td>' +
										'<td>&nbsp;</td>' +
										'<td class="smallerFont" style="width:50%; font-weight:bold;">' + 
											'IF SHIPMENT INCLUDES GOODS OF DIFFERENT ORIGINS <br />' + 
											'ENTER ORIGINS AGAINST ITEMS IN 12. <br />' + 
											'SI L\'EXPEDITION COMPREND DES MARCHANDISES D\'ORIGINES <br />' + 
											'DIFFERENTES, PRECISEZ LEUR PROVENANCE EN 12. <br />' + 
										'</td>' +
									'</tr>' +
								'</table>' +
							'</td>' +
						'</tr>' +
					'</table>' + 
				'</td>' +
			'</tr>';
			
		var box8Thru10HTML = 
			'<tr>' + 
				'<td ' + borderRight + borderBottom + 'style="width:50%;">' + // BOX 8
					'<table width="100%" cellpadding="1">' + 
						'<tr>' + 
							'<td colspan="2" class="smallFont">' +
								'8. Transportation: Give mode and place of direct shipment to Canada' +
								'<br /> &nbsp; &nbsp; Transport : Precisez mode et point d\'expedition directe vers le Canada' +  
								'<br /><br />&nbsp; &nbsp; &nbsp; &nbsp;' + transportation + 
							'</td>' +
						'</tr>' + 
					'</table>' + 
				'</td>' +
				'<td ' + borderBottom + 'style="width:50%;">' + // BOXES 9-10
					'<table width="100%">' + 
						'<tr>' + 
							'<td class="smallFont">' +
								'9. Conditions of sale and terms of payment' + 
								'<br /> &nbsp; &nbsp; (i.e. sale, consignment shipment, leased goods, etc.)' +
								'<br /> &nbsp; &nbsp; Conditions de vente et modalites de paiement' + 
								'<br /> &nbsp; &nbsp; (p. ex. vente, expedition en consignation, location de marchandises, etc.)' +  
							'</td>' +
						'</tr>' +
						'<tr>' + 
							'<td>' +
								'&nbsp; &nbsp; &nbsp; SALE' + 
							'</td>' +
						'</tr>' +
						'<tr>' + 
							'<td class="smallFont" ' + borderTop + '>' +
								'10. Currency of settlement - Devises du paiement' + 
							'</td>' +
						'</tr>' +
						'<tr>' + 
							'<td>' +
								'&nbsp; &nbsp; &nbsp; US FUNDS' + 
							'</td>' +
						'</tr>' +
					'</table>' + 
				'</td>' +
			'</tr>';
		
			var box11Thru18HTML = 
			'<tr>' + 
				'<td colspan="2" ' + borderBottom + '>' + // BOXES 11-18
					'<table width="100%">' +
						'<tr>' + 
							'<td style="width:10%;" rowspan="2" ' + borderRight + ' class="smallFont">' + 
								'11. Number of packages <br /> &nbsp; &nbsp; &nbsp; Nombre de colis' +  
								'<br /><br /> &nbsp; &nbsp; &nbsp;&nbsp; &nbsp;' + numberOfPackages + 
							'</td>' +				
							'<td style="width:50%;" rowspan="2" ' + borderRight + ' class="smallFont">' + 
								'12. Specification of commodities (kind of packages, marks and numbers, general' +  
								'<br /> &nbsp; &nbsp; &nbsp; description and characteristics, i.e., grade, quality)' + 
								'<br /> &nbsp; &nbsp; &nbsp; Designation des articles (nature des colis, marques et numeros, description generale' + 
								'<br /> &nbsp; &nbsp; &nbsp; et caracteristiques, p. ex. classe, qualite)' + 
							'</td>' + 
							'<td style="width:15%;" rowspan="2" ' + borderRight + ' class="smallFont">' + 
								'13. Quantity' +  
								'<br /> &nbsp; &nbsp; &nbsp; (state unit)' + 
								'<br /> &nbsp; &nbsp; &nbsp; Quantite' + 
								'<br /> &nbsp; &nbsp; &nbsp; (precisez l\'unite)' + 
							'</td>' + 
							'<td class="smallFont" colspan="2" align="center">' + 
								'Selling price - Prix de vente' + 
							'</td>' + 
						'</tr>' +
						'<tr>' + 
							'<td style="width:13%;" ' + borderRight + borderTop + ' class="smallFont">' + 
								'14. Unit price' + 
								'<br /> &nbsp; &nbsp; &nbsp; Prix unitaire' + 
							'</td>' + 
							'<td style="width:12%;" class="smallFont" ' + borderTop + '>' + 
								'15. Total' + 
							'</td>' + 
						'</tr>' +
						'<tr>' + 
							'<td ' + borderRight + '>' +
								'&nbsp;' +  
							'</td>' + 
							'<td ' + borderRight + '>' +
								'&nbsp; &nbsp; ' + seriesName + ' ' + modelYear + ' ' + modelTypeText + ' ' + modelNumber + 
							'</td>' + 
							'<td ' + borderRight + ' align="center">' +
								'1' + 
							'</td>' +
							'<td ' + borderRight + '>' +
								'&nbsp; &nbsp; $' + addCommas(nlapiFormatCurrency((orderTotal - fuelFreightSurchage))) + //This is what is printed in #14.
							'</td>' +
							'<td>' +
								'&nbsp; &nbsp; $' + addCommas(nlapiFormatCurrency((orderTotal - fuelFreightSurchage))) +  //GD wants this to be qty (which is 1) * #14
							'</td>' +
						'</tr>' +
						'<tr>' + 
							'<td ' + borderRight + '>' +
								'&nbsp;' +  
							'</td>' + 
							'<td ' + borderRight + '>' +
								'&nbsp; &nbsp; ' + vinNumberUnit + 
							'</td>' + 
							'<td ' + borderRight + '>' +
								'&nbsp;' +  
							'</td>' +
							'<td ' + borderRight + '>' +
								'&nbsp;' +  
							'</td>' +
							'<td>' +
								'&nbsp;' +  
							'</td>' +
						'</tr>' +
						'<tr>' + 
							'<td ' + borderRight + '>' +
								'&nbsp;' +  
							'</td>' + 
							'<td ' + borderRight + '>' +
								'&nbsp; &nbsp; ' +serialNumber +  
							'</td>' + 
							'<td ' + borderRight + '>' +
								'&nbsp;' +  
							'</td>' +
							'<td ' + borderRight + '>' +
								'&nbsp;' +  
							'</td>' +
							'<td>' +
								'&nbsp;' +  
							'</td>' +
						'</tr>' +
						'<tr>' + 
							'<td ' + borderRight + '>' +
								'&nbsp;' +  
							'</td>' + 
							'<td ' + borderRight + '>' +
								'&nbsp; &nbsp; ' + vinNumberChassis + 	
							'</td>' + 
							'<td ' + borderRight + '>' +
								'&nbsp;' +  
							'</td>' +
							'<td ' + borderRight + '>' +
								'&nbsp;' +  
							'</td>' +
							'<td>' +
								'&nbsp;' +  
							'</td>' +
						'</tr>' +
						'<tr>' + 
							'<td ' + borderRight + '>' +
								'&nbsp;' +  
							'</td>' + 
							'<td ' + borderRight + '>' +
								'&nbsp;' +  
							'</td>' + 
							'<td ' + borderRight + '>' +
								'&nbsp;' +  
							'</td>' +
							'<td ' + borderRight + '>' +
								'&nbsp;' +  
							'</td>' +
							'<td>' +
								'&nbsp;' +  
							'</td>' +
						'</tr>' +
						'<tr>' + 
							'<td ' + borderRight + '>' +
								'&nbsp;' +  
							'</td>' + 
							'<td ' + borderRight + '>' +
								'&nbsp;' +  
							'</td>' + 
							'<td ' + borderRight + '>' +
								'&nbsp;' +  
							'</td>' +
							'<td ' + borderRight + '>' +
								'&nbsp;' +  
							'</td>' +
							'<td>' +
								'&nbsp;' +  
							'</td>' +
						'</tr>' +
						'<tr>' + 
							'<td ' + borderRight + '>' +
								'&nbsp;' +  
							'</td>' + 
							'<td ' + borderRight + '>' +
								'&nbsp;' +  
							'</td>' + 
							'<td ' + borderRight + '>' +
								'&nbsp;' +  
							'</td>' +
							'<td ' + borderRight + '>' +
								'&nbsp;' +  
							'</td>' +
							'<td>' +
								'&nbsp;' +  
							'</td>' +
						'</tr>' +
						'<tr>' + 
							'<td ' + borderRight + '>' +
								'&nbsp;' +  
							'</td>' + 
							'<td ' + borderRight + '>' +
								'&nbsp;' +  
							'</td>' + 
							'<td ' + borderRight + '>' +
								'&nbsp;' +  
							'</td>' +
							'<td ' + borderRight + '>' +
								'&nbsp;' +  
							'</td>' +
							'<td>' +
								'&nbsp;' +  
							'</td>' +
						'</tr>' +
						'<tr>' + 
							'<td ' + borderRight + '>' +
								'&nbsp;' +  
							'</td>' + 
							'<td ' + borderRight + '>' +
								'&nbsp;' +  
							'</td>' + 
							'<td ' + borderRight + '>' +
								'&nbsp;' +  
							'</td>' +
							'<td ' + borderRight + '>' +
								'&nbsp;' +  
							'</td>' +
							'<td>' +
								'&nbsp;' +  
							'</td>' +
						'</tr>' +
						'<tr>' + 
							'<td ' + borderRight + '>' +
								'&nbsp;' +  
							'</td>' + 
							'<td ' + borderRight + '>' +
								'&nbsp;' + 'Compliance Specialist:' + 
							'</td>' + 
							'<td ' + borderRight + '>' +
								'&nbsp;' +  
							'</td>' +
							'<td ' + borderRight + '>' +
								'&nbsp;' +  
							'</td>' +
							'<td>' +
								'&nbsp;' +  
							'</td>' +
						'</tr>' +
						'<tr>' + 
							'<td ' + borderRight + '>' +
								'&nbsp;' +  
							'</td>' + 
							'<td ' + borderRight + '>' +
								'&nbsp;' +  companyImporterAddressee.trim() + '&nbsp;' + companyImporterPhone + 
							'</td>' + 
							'<td ' + borderRight + '>' +
								'&nbsp;' +  
							'</td>' +
							'<td ' + borderRight + '>' +
								'&nbsp;' +  
							'</td>' +
							'<td>' +
								'&nbsp;' +  
							'</td>' +
						'</tr>' +
						'<tr>' + 
							'<td colspan="2" ' + borderRight + borderTop + ' class="smallFont">' +
								'<table width="100%">' +
									'<tr>' + 
										'<td>' +
											'18. If any of fields 1 to 17 are included on an attached commercial invoice, check this box' + 
											'<br /> &nbsp; &nbsp; &nbsp; Si tout renseignement relativement aux zones 1 a 17 figure sur une ou des factures' + 
											'<br /> &nbsp; &nbsp; &nbsp; commerciales ci-attach�es, cochez cette case' + 
											'<br /> &nbsp; &nbsp; &nbsp; Commercial Invoice No. - N� de la facture commerciale &nbsp; &nbsp; &nbsp; <span style="font-size:7pt;">' + invoiceNum + '</span>' +  
										'</td>' + 
										'<td align="right">' +
											checkedCheckboxHTML + 
										'</td>' + 
									'</tr>' +
								'</table>' + 
							'</td>' + 
							'<td ' + borderRight + borderTop + ' colspan="2">' +
								'<table width="100%">' +
									'<tr>' + 
										'<td ' + borderBottom + ' colspan="2" align="center" class="smallFont">' +
											'16. Total weight - Poids total' +
										'</td>' + 
									'</tr>' +
									'<tr>' + 
										'<td ' + borderRight + ' class="smallFont">' +
											'Net' + 
										'</td>' + 
										'<td class="smallFont">' +
											'Gross - Brut' + 
										'</td>' + 
									'</tr>' +
									'<tr>' + 
										'<td ' + borderRight + '>' +
											'&nbsp;&nbsp;' + netWeightKg +
										'</td>' + 
										'<td>' +
											'&nbsp; &nbsp; ' + weight + 
										'</td>' +
									'</tr>' +
								'</table>' +  
							'</td>' + 
							'<td ' + borderTop + ' class="smallFont">' +
								'17. Invoice total' +  
								'<br /> &nbsp; &nbsp; &nbsp; Total de la facture' + 
								'<br /><br /> &nbsp; &nbsp; &nbsp;&nbsp; &nbsp; $' + addCommas(nlapiFormatCurrency(invoiceTotal)) +
							'</td>' +
						'</tr>' +
					'</table>' + 
				'</td>' +
			'</tr>';
		
		var box19ThruEndHTML = 
			'<tr>' + // boxes 19-20
				'<td ' + borderRight + ' class="smallFont">' +
					'19. Exporter\'s name and address (if other than vendor)' +  
					'<br /> &nbsp; &nbsp; &nbsp; Nom et adresse de l\'exportateur (s\'il differe du vendeur)' + 
					'<br /> &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; ' + exportersName +
				'</td>' +
				'<td class="smallFont">' +
					'20. Originator (name and address) - Expediteur d\'origine (nom et adresse)' +  
				'</td>' +
			'</tr>' +
			'<tr>' + // boxes 19-20
				'<td ' + borderRight + borderBottom + '>' +
					'<br /> <br /> <br /> <br /> ' + 
				'</td>' +
				'<td ' + borderBottom + '>' +
					'<br /> <br /> <br /> <br /> ' + 
				'</td>' +
			'</tr>' +
			'<tr>' + // boxes 21-22
				'<td ' + borderRight + borderBottom + ' class="smallFont">' +
					'21. Agency ruling (if applicable) - Decision de l\'Agence (s\'il y a lieu)' +  
				'</td>' +
				'<td ' + borderBottom + ' class="smallFont">' +
					'<table width="100%">' +
						'<tr>' + 
							'<td>' +
								'22. If fields 23 to 25 are not applicable, check this box' +   
								'<br /> &nbsp; &nbsp; &nbsp; Si les zones 23 a 25 sont sans objet, cochez cette case' +   
							'</td>' + 
							'<td align="center">' +
								checkboxHTML + 
							'</td>' + 
						'</tr>' +
					'</table>' + 
				'</td>' +
			'</tr>' +
			'<tr>' + // boxes 23-25
				'<td ' + borderBottom + ' colspan="3">' + 
					'<table width="100%" cellpadding="1">' +
						'<tr>' +
							'<td ' + borderRight + ' style="width:33%;">' +
								'<table width="100%" cellpadding="1">' +
									'<tr>' +
										'<td class="smallFont" colspan="2">' +
											'23. If included in field 17 indicate amount:' + 
											'<br /> &nbsp; &nbsp; &nbsp; Si compris dans le total a la zone 17, precisez :' +   
										'</td>' +
									'</tr>' +
									'<tr>' +
										'<td class="smallFont" style="width:20px;">' +
											'&nbsp;' + 
										'</td>' +
										'<td class="smallFont">' +
											'(i) Transportation charges, expenses and insurance' +
											'<br /> &nbsp; &nbsp; from the place of direct shipment to Canada' +
											'<br /> &nbsp; &nbsp; Les frais de transport, depenses et assurances ' +
											'<br /> &nbsp; &nbsp; a partir du point d\'expedition directe vers le Canada' + 
											'<br /> <br /> &nbsp; &nbsp; &nbsp; ______________________<span padding="0" margin="0" style="border-bottom:1px solid black;">$' + addCommas(nlapiFormatCurrency(fuelFreightSurchage))  + '</span>____________________' +
										'</td>' +
									'</tr>' +
									'<tr>' +
										'<td class="smallFont">' +
											'&nbsp;' + 
										'</td>' +
										'<td class="smallFont">' +
											'(ii) Costs for construction, erection and assembly' +
											'<br /> &nbsp; &nbsp; &nbsp; incurred after importation into Canada' +
											'<br /> &nbsp; &nbsp; &nbsp; Les couts de construction, d\'erection et ' +
											'<br /> &nbsp; &nbsp; &nbsp; d\'assemblage apres importation au Canada' + 
											'<br /> <br /> &nbsp; &nbsp; &nbsp; ________________________________________________' + 
										'</td>' +
									'</tr>' +
									'<tr>' +
										'<td class="smallFont">' +
											'&nbsp;' + 
										'</td>' +
										'<td class="smallFont">' +
											'(iii) Export packing' +
											'<br /> &nbsp; &nbsp; &nbsp; Le cout de l\'emballage d\'exportation' +
											'<br /> <br /> &nbsp; &nbsp; &nbsp; ________________________________________________' + 
										'</td>' +
									'</tr>' +
								'</table>' + 
							'</td>' +
							'<td ' + borderRight + ' style="width:33%;">' +
								'<table width="100%" cellpadding="1">' +
									'<tr>' +
										'<td class="smallFont" colspan="2">' +
											'24. If included in field 17 indicate amount:' + 
											'<br /> &nbsp; &nbsp; &nbsp; Si compris dans le total a la zone 17, precisez :' +   
										'</td>' +
									'</tr>' +
									'<tr>' +
										'<td class="smallFont" style="width:20px;">' +
											'&nbsp;' + 
										'</td>' +
										'<td class="smallFont">' +
											'(i) Transportation charges, expenses and insurance' +
											'<br /> &nbsp; &nbsp; to the place of direct shipment to Canada' +
											'<br /> &nbsp; &nbsp; Les frais de transport, depenses et assurances ' +
											'<br /> &nbsp; &nbsp; jusqu\'au point d\'expedition directe vers le Canada' + 
											'<br /> <br /> &nbsp; &nbsp; _________________________________________________' + 
										'</td>' +
									'</tr>' +
									'<tr>' +
										'<td class="smallFont">' +
											'&nbsp;' + 
										'</td>' +
										'<td class="smallFont">' +
											'(ii) Amounts for commissions other than buying' +
											'<br /> &nbsp; &nbsp; &nbsp; commissions' +
											'<br /> &nbsp; &nbsp; &nbsp; Les couts de construction, d\'erection et ' +
											'<br /> &nbsp; &nbsp; &nbsp; pour l\'achat' + 
											'<br /> <br /> &nbsp; &nbsp; &nbsp; ________________________________________________' + 
										'</td>' +
									'</tr>' +
									'<tr>' +
										'<td class="smallFont">' +
											'&nbsp;' + 
										'</td>' +
										'<td class="smallFont">' +
											'(iii) Export packing' +
											'<br /> &nbsp; &nbsp; &nbsp; Le cout de l\'emballage d\'exportation' +
											'<br /> <br /> &nbsp; &nbsp; &nbsp; ________________________________________________' + 
										'</td>' +
									'</tr>' +
								'</table>' + 
							'</td>' +
							'<td style="width:34%;">' +
								'<table width="100%" cellpadding="1">' +
									'<tr>' +
										'<td class="smallFont" colspan="2">' +
											'25. Check (if applicable):' + 
											'<br /> &nbsp; &nbsp; &nbsp; Cochez (s\'il y a lieu) :' +   
										'</td>' +
									'</tr>' +
									'<tr>' +
										'<td class="smallFont" style="width:20px;">' +
											'&nbsp;' + 
										'</td>' +
										'<td class="smallFont">' +
											'(i) Royalty payments or subsequent proceeds are' +
											'<br /> &nbsp; &nbsp; paid or payable by the purchaser' +
											'<br /> &nbsp; &nbsp; Des redevances ou produits ont ete ou seront ' +
											'<br /> &nbsp; &nbsp; verses par l\'acheteur' + 
										'</td>' +
									'</tr>' +
									'<tr>' +
										'<td class="smallFont" colspan="2" align="center">' +
											checkboxHTML + '<br />' + 
										'</td>' +
									'</tr>' +
									'<tr>' +
										'<td class="smallFont">' +
											'&nbsp;' + 
										'</td>' +
										'<td class="smallFont">' +
											'(ii) The purchaser has supplied goods or services' +
											'<br /> &nbsp; &nbsp; &nbsp; for use in the production of these goods' +
											'<br /> &nbsp; &nbsp; &nbsp; L\'acheteur a fourni des marchandises ou des ' +
											'<br /> &nbsp; &nbsp; &nbsp; services pour la production de ces ' +
											'<br /> &nbsp; &nbsp; &nbsp; marchandises' + 
										'</td>' +
									'</tr>' +
									'<tr>' +
										'<td class="smallFont" colspan="2" align="center">' +
											checkboxHTML + 
										'</td>' +
									'</tr>' +
								'</table>' + 
							'</td>' +
						'</tr>' +
					'</table>' + 
				'</td>' +
			'</tr>' +
			'<tr>' +
				'<td class="smallFont" colspan="2" align="center">' +
					'Dans ce formulaire, toutes les expressions d�signant des personnes visent a la fois les hommes et les femmes.' + 
				'</td>' +
			'</tr>' +
		'</table>';
	
	var html = 
		'<head>' +
			'<style>' + 
				'.smallFont			{ font-size: 5pt; }' + 
				'.smallerFont		{ font-size: 4pt; }' + 
			'</style>' +  
		'</head>' +  
		'<body style="font-size:7pt; font-family: Verdana, Geneva, sans-serif; margin:0pt 0pt 0pt 0pt;">' + 
			'<table width="100%" cellpadding="0">' + 
				'<tr>' + 
					'<td>' + 
						headerHTML + 
					'</td>' + 
				'</tr>' + 
				'<tr>' + 
					'<td>' + 
						box1Thru3HTML + box4Thru7HTML + box8Thru10HTML + box11Thru18HTML + box19ThruEndHTML +
					'</td>' + 
				'</tr>' +
			'</table>' + 
		'</body>';
		
	return html;
}