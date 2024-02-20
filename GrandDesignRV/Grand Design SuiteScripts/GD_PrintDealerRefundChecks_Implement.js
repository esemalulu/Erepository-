/**
 * Module Description
 * 
 * Version    Date            Author           Remarks
 * 1.00       06 Jun 2016     jeffrb
 *
 */

/**
 * Default implementation method for returning the RVS dealer refund check HTML.
 * 
 * @param dealerRefundId
 * @param dealerRefundsToPrint
 * @returns {String}
 */
function GetDealerRefundCheckHTML(dealerRefundId, dealerRefundsToPrint)
{
	var checkHTML = '';
	var creditMemos = GetCreditMemoElements(dealerRefundId, dealerRefundsToPrint);
	 
	if (creditMemos != null && creditMemos.length > 0)
	{
	 	var element = creditMemos[0];
		 
		nlapiLogExecution('DEBUG', 'Get Data', '');
		 
		var printOnCheckAs = nlapiEscapeXML(element.getValue('custbodyrvsentityprintoncheckas'));
		if (printOnCheckAs == null || printOnCheckAs == '')
	 	 	printOnCheckAs = nlapiEscapeXML(element.getText('entity'));
		 
		var amount = element.getValue('amount', 'appliedToTransaction');
		var checkNumber = element.getValue('tranid', 'appliedToTransaction');
		
		var date = nlapiStringToDate(element.getValue('trandate', 'appliedToTransaction')); //new Date(); date should come from the dealer refund
		var dateString = date.getMonth()+1 + '/' + date.getDate() + '/' + date.getFullYear();
		 
		var addressee = nlapiEscapeXML(element.getValue('billaddressee'));
		var address1 = nlapiEscapeXML(element.getValue('billaddress1'));
		var address2 = nlapiEscapeXML(element.getValue('billaddress2')) || '';
		var voucherSection1TopPaddingPx = '115px';
		var voucherSection2TopPaddingPx = '45px';
		if  (address2 != '') {
			address1 = 	address1 + '<br />' + address2;
			voucherSection1TopPaddingPx = '100px';
			voucherSection2TopPaddingPx = '30px';
		}
			
		var city = nlapiEscapeXML(element.getValue('billcity'));
		var state = nlapiEscapeXML(element.getValue('billstate'));
		var zip = nlapiEscapeXML(element.getValue('billzip'));
		var country = element.getValue('billcountry');
		if (country == null)
		 	 country = '';
		else if (country == 'CA')
			country = 'Canada';
		var attention = nlapiEscapeXML(element.getValue('billattention'));
		var attentionHTML = ''; 	 
		if (attention != null && attention != '')
		{
			attentionHTML = '<tr>' + 
								'<td style="width:50px;">' + 
									'&nbps;' + 
								'</td>' +
								'<td>' + 
									attention +
								'</td>' +
							'</tr>';
		}
	 	country = nlapiEscapeXML(country);
		 
		// need ** in front so that the total length of this string is 8
		var amountWithPadding = addCommas(padding_left(amount, '*', 8));
		 
		// remove the cents from the amount so that when we spell out the amount, the cents comes in as 10/100 instead of the wording
		var amountNoCents = amount.substr(0, amount.indexOf('.'));
		var amountCents = amount.substr(amount.indexOf('.')+1, amount.length-amount.indexOf('.')) + '/100';
		if (amountCents.length == 1)
			amountCents += '0';
		
		var amountInEnglish = ConvertCurrencyToEnglish(amountNoCents);
		
		var totalAmountString = addCommas(nlapiFormatCurrency(Math.abs(amount)));
		 
		// 91 spaces total on the number line
		// capitalize the first character
		var amountInEnglishWithPadding = padding_right(amountInEnglish + ' and ' + amountCents, '*', 109);
		amountInEnglishWithPadding = amountInEnglishWithPadding.charAt(0).toUpperCase() + amountInEnglishWithPadding.substr(1,amountInEnglishWithPadding.length-1);
		
		var claimsPerPage = 19;
		
		nlapiLogExecution('DEBUG', 'Get Voucher Line Sections', '');
		// there are two different sections separated only by the padding
		var voucherLineSection1 = GetVoucherHeaderSection_Implement(voucherSection1TopPaddingPx, printOnCheckAs, totalAmountString, checkNumber, dateString, 0);				
		var voucherLineSection2 = GetVoucherHeaderSection_Implement(voucherSection2TopPaddingPx, printOnCheckAs, totalAmountString, checkNumber, dateString, 381);
		
		var voucherLinesInner = '';
		
		nlapiLogExecution('DEBUG', 'Loop Claims', '');
		for (var i=0; i<claimsPerPage; i++)
		{
		 	if (creditMemos[i] != null)
			{
			 	var unit = nlapiEscapeXML(creditMemos[i].getText('custbodyrvsunit'));
				var claimId = nlapiEscapeXML(creditMemos[i].getValue('id', 'custbodyrvscreatedfromclaim'));
				var spiffId = nlapiEscapeXML(creditMemos[i].getValue('id', 'custbodyrvscreatedfromspiff'));
				var claimAmount = addCommas(nlapiFormatCurrency(Math.abs(parseFloat(creditMemos[i].getValue('amount')))));
				var amountPaid = addCommas(nlapiFormatCurrency(Math.abs(parseFloat(creditMemos[i].getValue('appliedtolinkamount')))));
				var creditMemoDate = creditMemos[i].getValue('trandate');
				
				var poNumber = creditMemos[i].getValue('otherrefnum');
				var memo = creditMemos[i].getValue('memo');
				
				if (poNumber != null && poNumber != '')
					poNumber = nlapiEscapeXML(poNumber);
				else
					poNumber = '';
				
				var maxMemoPOLength = 200;	
				if (poNumber.length > maxMemoPOLength)
				{
					poNumber = poNumber.substring(0, maxMemoPOLength);
				}
					
				if (memo != null && memo != '')
					memo = nlapiEscapeXML(memo);
				else
					memo = '';	
					
				if (memo.length > maxMemoPOLength)
				{
					memo = memo.substring(0, maxMemoPOLength);
				}
					
				if (claimId != '')
					claimId = 'Claim #' + claimId;
					
				if (spiffId != '')
					claimId = 'Spiff #' + spiffId;
				
				voucherLinesInner += 
					'<tr>' + 
						'<td style="padding-top:20px;">' + 
							creditMemoDate + 
						'</td>' +
						'<td>' + 
							claimId + 
						'</td>' +
						'<td>' + 
							poNumber + 
						'</td>' +
						'<td style="word-wrap: break-word; padding: 1px;">' +
							memo + 
						'</td>' +
						'<td align="right">' + 
						'</td>' +
						'<td>' + 
							unit + 
						'</td>' +
						'<td align="right">' + 
							claimAmount + 
						'</td>' +
						'<td align="right">' + 
							amountPaid + 
						'</td>' +
					'</tr>';
			}
			else
			{
			 	voucherLinesInner += 
					'<tr>' + 
						'<td style="padding-top:20px;">' + 
							'&nbsp;' + 
						'</td>' +
						'<td>' + 
							'&nbsp;' + 
						'</td>' +
						'<td>' + 
							'&nbsp;' + 
						'</td>' +
						'<td>' + 
							'&nbsp;' + 
						'</td>' +
						'<td>' + 
							'&nbsp;' + 
						'</td>' +
						'<td>' + 
							'&nbsp;' + 
						'</td>' +
						'<td>' + 
							'&nbsp;' + 
						'</td>' +
						'<td>' + 
							'&nbsp;' + 
						'</td>' +
					'</tr>';
			}			 
		}
		 
		voucherLineSection1 += voucherLinesInner + '</table>';
		voucherLineSection2 += voucherLinesInner + '</table>';
		 
		checkHTML = 
		 	'<body style="font-size:10pt; margin:0pt 0pt 0pt 0pt;">' +
				'<table width="100%" cellpadding="0" style="padding-top:0px; padding-left:8px;">' +
					'<tr>' + 
						'<td>' + 
							'<table width="100%" cellpadding="0" style="padding-top:5px;">' +
								'<tr>' + 
									'<td style="width:630px;">' + 
										'&nbps;' + 
									'</td>' +
									'<td style="font-size:6pt;">' + 
										checkNumber + 
									'</td>' +
								'</tr>' +  
							'</table>' + 
						'</td>' +
					'</tr>' +  
					'<tr>' + 
						'<td>' + 
							'<table width="100%" cellpadding="0" style="padding-top:5px;">' +
								'<tr>' + 
									'<td style="width:575px;">' + 
										'&nbps;' + 
									'</td>' +
									'<td>' + 
										dateString + 
									'</td>' +
								'</tr>' +  
							'</table>' + 
						'</td>' +
					'</tr>' +  
					'<tr>' + 
						'<td>' + 
							'<table width="100%" cellpadding="0" style="padding-top:25px;">' +
								'<tr>' + 
									'<td style="width:55px;">' + 
										'&nbps;' + 
									'</td>' +
									'<td style="width:520px;">' + 
										printOnCheckAs + 
									'</td>' +
									'<td>' + 
										'&nbsp; &nbsp;' + amountWithPadding + 
									'</td>' +
								'</tr>' +  
							'</table>' + 
						'</td>' +
					'</tr>' +  
					'<tr>' + 
						'<td>' + 
							'<table width="100%" cellpadding="0" style="padding-top:25px;">' +
								'<tr>' + 
									'<td style="width:0px;">' + 
										'&nbps;' + 
									'</td>' +
									'<td>' + 
										amountInEnglishWithPadding +
									'</td>' +
								'</tr>' +  
							'</table>' + 
						'</td>' +
					'</tr>' + 
					'<tr>' + 
						'<td>' + 
							'<table width="100%" cellpadding="0" style="padding-top:12px;">' +
								'<tr>' + 
									'<td style="width:50px;">' + 
										'&nbps;' + 
									'</td>' +
									'<td>' + 
										addressee +
									'</td>' +
								'</tr>' +  
								attentionHTML + 
								'<tr>' + 
									'<td style="width:50px;">' + 
										'&nbps;' + 
									'</td>' +
									'<td>' + 
										address1 +
									'</td>' +
								'</tr>' +  
									address2 +
								'<tr>' + 
									'<td style="width:50px;">' + 
										'&nbps;' + 
									'</td>' +
									'<td>' + 
										city + ', ' + state + ' ' + zip +
									'</td>' +
								'</tr>' +
								'<tr>' + 
									'<td style="width:50px;">' + 
										'&nbps;' + 
									'</td>' +
									'<td>' + 
										country +
									'</td>' +
								'</tr>' +  
							'</table>' + 
						'</td>' +
					'</tr>' + 
					'<tr>' + 
						'<td>' + 
							voucherLineSection1 +
						'</td>' +
					'</tr>' + 
					'<tr>' + 
						'<td>' + 
							voucherLineSection2 +
						'</td>' +
					'</tr>' + 
				'</table>' +  
			'</body>';
	}
	
	return checkHTML;
}

//***********************
//Name: GetVoucherHeaderSection
//Description: Returns the voucher header section of HTML code.
//Use: Helper event
//************************
function GetVoucherHeaderSection_Implement(paddingTopPixels, printOnCheckAs, totalAmountString, checkNumber, dateString, topPadding)
{
	var html = 
		'<table width="100%" cellpadding="0" style="position:absolute; top: ' + topPadding + 'px; padding-top:' + paddingTopPixels + '; font-size:8pt;">' +
			'<tr>' + 
				'<td style="font-style:italic;" colspan="5">' + 
					printOnCheckAs + ' - $' + totalAmountString + ' - Check #' + checkNumber + ' - ' + dateString +
				'</td>' +
			'</tr>' + 
			'<tr>' + 
				'<td colspan="5">' + 
					'&nbsp;' + 
				'</td>' +
			'</tr>' +
			'<tr>' + 
				'<td style="font-weight:bold; border-bottom:1px solid black; width:8%;">' + 
					'Date' + 
				'</td>' +
				'<td style="font-weight:bold; border-bottom:1px solid black; width:17%;">' + 
					'Claim/Spiff #' + 
				'</td>' +
				'<td style="font-weight:bold; border-bottom:1px solid black; width:15%;">' + 
					'PO #' + 
				'</td>' +
				'<td style="font-weight:bold; border-bottom:1px solid black; width:18%; word-wrap: break-word;">' + 
					'Memo' + 
				'</td>' +
				'<td style="font-weight:bold; border-bottom:1px solid black; width:1%;">' + 
				'</td>' +
				'<td style="font-weight:bold; border-bottom:1px solid black; width:15%;">' + 
					'VIN' + 
				'</td>' +
				'<td style="font-weight:bold; border-bottom:1px solid black; width:13%;" align="right">' + 
					'Claim Total' + 
				'</td>' +
				'<td style="font-weight:bold; border-bottom:1px solid black; width:13%;" align="right">' + 
					'Amt Paid' + 
				'</td>' +
			'</tr>';
			
	return html;
}