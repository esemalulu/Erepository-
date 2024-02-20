// Acct: RVS

////***********************
//// Name: PrintVendorReturnAuthorizationButton
//// Description: Called by the "Print Vendor Return Authorization" button.
////				Opens a Suitelet that prints a single refund check.
//// Use: Client-side event
////************************
//function PrintVendorReturnAuthorizationButton()
//{
//	var vendorReturnAuthId = nlapiGetRecordId();
//	if (vendorReturnAuthId != '' && vendorReturnAuthId != null)
//	{
//		var printVendorReturnAuthURL = nlapiResolveURL('SUITELET', 'customscriptprintvendorreturnauth', 'customdeployprintvendorreturnauthdeploy') + '&vendorReturnAuthId=' + vendorReturnAuthId;
//		window.open(printVendorReturnAuthURL, '_blank');
//	}	
//}


function PrintVendorReturnAuthCustomAction()
{
	var context = nlapiGetContext();
	context.setSessionObject('printvendorreturnauth_vendorreturnauthid', nlapiGetRecordId());
}

//***********************
// Name: PrintVendorReturnAuthorizationSuitelet
// Description: Prints a vendor return authorization.  Pulls the id from the URL.
// Use: Suitelet event
//************************
function PrintVendorReturnAuthorizationSuitelet(request, response)
{
	var context = nlapiGetContext();
	var vendorReturnAuthId = context.getSessionObject('printvendorreturnauth_vendorreturnauthid');
	context.setSessionObject('printvendorreturnauth_vendorreturnauthid', null);
	
	if (vendorReturnAuthId == null || vendorReturnAuthId == '')
	{
		vendorReturnAuthId = request.getParameter('vendorReturnAuthId');
	}
	
	if (vendorReturnAuthId != null && vendorReturnAuthId != '')
	{
		var refNumber = nlapiLookupField('vendorreturnauthorization', vendorReturnAuthId, 'tranid');
		
		var vendorReturnAuthHTML =  PrintVendorReturnAuthorization(vendorReturnAuthId);
		//nlapiLogExecution('debug','PrintVendorReturnAuthorizationSuitelet',nlapiEscapeXML(vendorReturnAuthHTML));
		
//		var vendorReturnAuthHTML = PrintVendorReturnAuthorization(vendorReturnAuthId);
		
		PrintPDFInSuiteLet(request, response, 'Print Vendor Return Authorization ' + refNumber + '.pdf', vendorReturnAuthHTML);
	}
}


function PrintVendorReturnAuthorization(vendorReturnAuthId)
{
	var returnAuth = nlapiLoadRecord('vendorreturnauthorization', vendorReturnAuthId);
	
	var vendorName = nlapiEscapeXML(returnAuth.getFieldText('entity'));
	var vendorId = returnAuth.getFieldValue('entity');
	
	var vendor = nlapiLoadRecord('vendor', vendorId);
	
	var refNumber = returnAuth.getFieldValue('tranid');
	
	var tranDate = returnAuth.getFieldValue('trandate');
	var memo = nlapiEscapeXML(returnAuth.getFieldValue('memo'));
	if (memo == null)
		memo = '';
	
	var unitNumber = nlapiEscapeXML(returnAuth.getFieldText('custbodyrvsunit'));
	var claimNumber = nlapiEscapeXML(returnAuth.getFieldValue('custbodyrvscreatedfromclaim'));
	
	var shipToName = vendorName;
	var shipToAddress = '';
	var shipToCity = '';
	var shipToState = '';
	var shipToZip = '';
	var shipToCountry = '';
	
	// try and get an address from the vendor auth record
	var address = returnAuth.getFieldValue('custbodyrvsvendorreturnauthaddress1');
	if (address != null && address != '')
	{
		shipToAddress = address;
		shipToCity = returnAuth.getFieldValue('custbodyrvsvendorreturnauthcity');
		shipToState = returnAuth.getFieldValue('custbodyrvsvendorreturnauthstate');
		shipToZip = returnAuth.getFieldValue('custbodyrvsvendorreturnauthzip');
		shipToCountry = returnAuth.getFieldValue('custbodyrvsvendorreturnauthcountry');
		
		if (shipToCity == null)
			shipToCity = '';
			
		if (shipToState == null)
			shipToState = '';
			
		if (shipToZip == null)
			shipToZip = '';
			
		if (shipToCountry == null)
			shipToCountry = '';
	}
	else
	{
		// no address set on the return auth so get the default shipping from the vendor record
		var addressCount = vendor.getLineItemCount('addressbook');
		for (var i=1; i<=addressCount; i++)
		{
			var defaultShipping = vendor.getLineItemValue('addressbook', 'defaultshipping', i);
			if (defaultShipping == 'T')
			{
				shipToAddress = nlapiEscapeXML(vendor.getLineItemValue('addressbook', 'addr1', i));
				shipToCity = nlapiEscapeXML(vendor.getLineItemValue('addressbook', 'city', i));
				shipToState = nlapiEscapeXML(vendor.getLineItemValue('addressbook', 'state', i));
				shipToZip = nlapiEscapeXML(vendor.getLineItemValue('addressbook', 'zip', i));
				shipToCountry = nlapiEscapeXML(vendor.getLineItemValue('addressbook', 'country', i));
				
				break;
			}
		}
	}
	
	var unitNumberHTML = '';
	if (unitNumber != null && unitNumber != '')
	{
		unitNumberHTML = 
			'<tr>' + 
				'<td style="font-weight:bold;">' + 
					'VIN' + 
				'</td>' +
				'<td>' + 
					unitNumber + 
				'</td>' +
			'</tr>';
	}
		
	var claimNumberHTML = '';
	if (claimNumber != null && claimNumber != '')
	{
		claimNumberHTML = 
			'<tr>' + 
				'<td style="font-weight:bold;">' + 
					'Claim #' + 
				'</td>' +
				'<td>' + 
					claimNumber + 
				'</td>' +
			'</tr>';
	}
	
	var shipToHTML =
		'<table width="100%" style="padding-top:0px;" cellpadding="2">' +
			'<tr>' + 
				'<td style="font-weight:bold;">' +
					'Ship To' +
				'</td>' +
			'</tr>' + 
			'<tr>' + 
				'<td style="padding-top:3px;">' +
					shipToName +
				'</td>' +
			'</tr>' +
			'<tr>' + 
				'<td>' +
					shipToAddress +
				'</td>' +
			'</tr>' +
			'<tr>' + 
				'<td>' +
					shipToCity + ', ' + shipToState + ' ' + shipToZip +
				'</td>' +
			'</tr>' + 
			'<tr>' + 
				'<td>' +
					shipToCountry +
				'</td>' +
			'</tr>' + 
		'</table>'; 
		
	var itemHTML = 
		
			'<tr>' + 
				'<td style="font-weight:bold; border-bottom: 1px solid black; padding-bottom:10px;width:10%;">' +
					'Item' +
				'</td>' +
				'<td style="font-weight:bold; border-bottom: 1px solid black; padding-bottom:10px;width:10%; text-align:center;">' +
					'Vendor<br />Part #' +
				'</td>' +
				'<td style="font-weight:bold; border-bottom: 1px solid black; padding-bottom:10px;width:12%; text-align:center;">' +
					'Scrap/Salvage<br />Tag Number' +
				'</td>' +
				'<td style="font-weight:bold; border-bottom: 1px solid black; padding-bottom:10px;width:12%; text-align:center;">' +
					'Serial #' +
				'</td>' +
				'<td style="font-weight:bold; border-bottom: 1px solid black; padding-bottom:10px;width:40%;">' +
					'&nbsp;&nbsp;&nbsp;Description' +
				'</td>' +
				'<td style="font-weight:bold; border-bottom: 1px solid black; padding-bottom:10px;width:8%;">' +
					'Qty' +
				'</td>' +
				'<td style="font-weight:bold; border-bottom: 1px solid black; padding-bottom:10px;width:8%;">' +
				'UoM' +
				'</td>' +
			'</tr>' + 
			'<tr>' + 
				'<td colspan="8">' + 
					'&nbsp;' + 
				'</td>' + 
			'</tr>';
			
	var itemCount = returnAuth.getLineItemCount('item');
	for (var i=1; i<=itemCount; i++)
	{	
		returnAuth.selectLineItem('item', i);
		var itemDisplay = ConvertNSFieldToString(returnAuth.getCurrentLineItemText('item', 'item'));
		var itemDisplayNumber = itemDisplay.split(" ");
		itemDisplayNumber = ConvertNSFieldToString(itemDisplayNumber[0]); //Do this to separate the Item Display Number from the rest of the display text
		var vendorPartNumber = ConvertNSFieldToString(returnAuth.getCurrentLineItemValue('item', 'vendorname'));
		var scrapOrSalvageNum = ConvertNSFieldToString(returnAuth.getCurrentLineItemValue('item', 'custcolgd_scrapsalvagetagnumber'));
		var serialNumber = ConvertNSFieldToString(returnAuth.getCurrentLineItemValue('item', 'custcolgd_serialnumber'));
		var description = ConvertNSFieldToString(returnAuth.getLineItemValue('item', 'description', i));
		var qty =  ConvertNSFieldToString(returnAuth.getLineItemValue('item', 'quantity', i));
		var uom =  ConvertNSFieldToString(returnAuth.getLineItemText('item', 'units', i));
		var location = ConvertNSFieldToString(returnAuth.getFieldText('location'));

		itemHTML += 
		
			'<tr>' + 
				'<td style="padding-top:3px;">' +
				itemDisplayNumber +
					//itemName +
				'</td>' +
				'<td style="padding-top:3px;">' +
					vendorPartNumber +
				'</td>' +
				'<td style="padding-top:3px;">' +
					scrapOrSalvageNum +
				'</td>' +
				'<td style="padding-top:3px;">' +
					serialNumber +
				'</td>' +
				'<td style="margin-left:10px;margin-right:10px;">' +
					description +
				'</td>' +
				'<td style="white-space:no-wrap;">&nbsp;' +
					qty +
				'</td>' +
				'<td style="white-space:no-wrap;">&nbsp;' +
				uom +
				'</td>' +
			'</tr>' + 
			'<tr>' + 
				'<td colspan="7">' + 
					'&nbsp;' + 
				'</td>' + 
			'</tr>';
	} 

	var footerText = '&nbsp;';
	if (claimNumber != '' && claimNumber != null)
	{
		footerText = nlapiGetContext().getSetting('SCRIPT', 'custscriptrvsclaimvrafooter');
	}
	
	var footerHTML = 
		'<table width="100%" style="border-style:solid; border-width:1px; border-color:black;">' +
		'<tr style="text-align:center; font-size:14px;">' + 
			'<td style="padding-right:20px;">' + '&nbsp;' + '</td>' +
			'<td style="padding-left:auto; padding-right:auto;" colspan="2">' + 
				'<b>' +
					'**Grand Design RV reserves the right to take credit and dispose of material' + '<br></br>' +
					'that has not been picked up within 15 calendar days of supplier notification** ' + 
				'</b>' +
			'</td>' +
		'</tr>' +	
//		'<tr>' + 
//				'<td>' + 
//					footerText +
//				'</td>' +
//		'</tr>' +  
		'</table>';
	
	var companyInfo = nlapiLoadConfiguration('companyinformation');
	var companyName = companyInfo.getFieldValue('companyname');
	var companyAddress1 = companyInfo.getFieldValue('address1');
	var companyCity = companyInfo.getFieldValue('city'); 
	var companyState = companyInfo.getFieldValue('state'); 
	var companyZip = companyInfo.getFieldValue('zip'); 
	
	var html = 
			'<head>' + 
				'<macrolist>' + 
				    '<macro id="footer">' + 
						footerHTML +
				    '</macro>' + 
			    '</macrolist>' +
			'</head>' +  
		 	'<body style="font-size:10pt; margin-top: 0pt; margin-bottom:15pt; margin-left:0pt; margin-right:0pt;" footer="footer">' +
				'<table width="100%" cellpadding="0">' +
					'<tr>' + 
						'<td>' + 
							'<table width="100%" cellpadding="0">' +
								'<tr>' + 
									'<td style="width:60%">' +
										'<table width="100%">' +
											'<tr>' + 
												'<td>' + 
													'<img src="' + GetCompanyPageLogo() + '" />' +
												 '</td>' +
											'</tr>' +
											'<tr>' + 
												'<td>' + 
													'&nbsp;' +
												 '</td>' +
											'</tr>' +  
											'<tr>' + 
												'<td>' + 
													companyName +
												 '</td>' +
											'</tr>' + 
											'<tr>' + 
												'<td>' + 
													companyAddress1 +
												 '</td>' +
											'</tr>' +  
											'<tr>' + 
												'<td>' + 
													companyCity + ', ' + companyState + ' ' + companyZip + 
												 '</td>' +
											'</tr>' +   
										'</table>' + 
									'</td>' + 
									'<td>' +
										'<table width="100%" style="padding-top:5px;">' +
											'<tr>' + 
												'<td style="font-size:16pt; font-weight:bold;" colspan="2">' + 
													'Vendor Return Authorization' + 
												'</td>' +
											'</tr>' + 
											'<tr>' + 
												'<td style="font-weight:bold; padding-top:10px;">' + 
													'Ref. No.' + 
												'</td>' +
												'<td style="padding-top:10px;">' + 
													refNumber + 
												'</td>' +
											'</tr>' + 
											'<tr>' + 
												'<td style="font-weight:bold; padding-top:10px;">' + 
													'Vendor' + 
												'</td>' +
												'<td style="padding-top:10px;">' + 
													vendorName + 
												'</td>' +
											'</tr>' + 
											'<tr>' + 
												'<td style="font-weight:bold;">' + 
													'Date' + 
												'</td>' +
												'<td>' + 
													tranDate + 
												'</td>' +
											'</tr>' +  
											'<tr>' + 
												'<td style="font-weight:bold;">' + 
													'Memo' + 
												'</td>' +
												'<td>' + 
													memo + 
												'</td>' +
											'</tr>' +  
											unitNumberHTML +
											claimNumberHTML + 
										'</table>' +
									 '</td>' +
								'</tr>' +
								'<tr>' + 
									'<td colspan="2">' +
										'&nbsp;' + 
									'</td>' + 
								'</tr>' + 
								'<tr>' + 
									'<td colspan="1">' +
										shipToHTML + 
									'</td>' + 
									'<td colspan="1">' +
										'<b>Location: </b>' + location + 
									'</td>' + 
								'</tr>' +  
							'</table>' +  
						'</td>' +
					'</tr>' +  
				  '</table>' + 
                  '<table width="100%" padding-top="20px">' +
							itemHTML + 
				  '</table>' +  
			'</body>';
	html = html.replaceAll('','');
	return html;
}