/**
 * Module Description
 * 
 * Version    Date            Author           Remarks
 * 1.00       06 Jun 2016     jeffrb
 *
 */

/**
 * Default implementation method of printing the dealer refund voucher HTML.
 * 
 * @param dealerRefundId
 * @param dealerRefundsToPrint
 * @returns {String}
 */
function GetDealerRefundVoucherHTML(dealerRefundId, dealerRefundsToPrint, companyInfo, logoAddress)
{
	var checkHTML = '';
	var creditMemos = GetCreditMemoElements(dealerRefundId, dealerRefundsToPrint);
	 
	if (creditMemos != null && creditMemos.length > 0)
	{
	 	var element = creditMemos[0];
		 
		var printOnCheckAs = nlapiEscapeXML(element.getValue('custbodyrvsentityprintoncheckas'));
		if (printOnCheckAs == null || printOnCheckAs == '')
	 	 	printOnCheckAs = nlapiEscapeXML(element.getText('entity'));
		 
		var amount = element.getValue('amount', 'appliedToTransaction');
		var date = nlapiStringToDate(element.getValue('trandate', 'appliedToTransaction')); //new Date(); date should come from the dealer refund
		var dateString = date.getMonth()+1 + '/' + date.getDate() + '/' + date.getFullYear();
		
		var checkNumber = nlapiEscapeXML(element.getValue('tranid', 'appliedToTransaction'));
		 
		var addressee = nlapiEscapeXML(element.getValue('billaddressee'));
		var address1 = nlapiEscapeXML(element.getValue('billaddress1'));
		var address2 = nlapiEscapeXML(element.getValue('billaddress2')) || '';
        if  (address2 != '') {
            address1 =     address1 + '<br />' + address2;
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
								'<td>' + 
									attention +
								'</td>' +
							'</tr>';
		}
	 	country = nlapiEscapeXML(country);
		
		var totalAmountString = addCommas(nlapiFormatCurrency(Math.abs(amount)));

		var companyName = companyInfo.getFieldValue('companyname');
		var companyAddress1 = companyInfo.getFieldValue('address1');
		var companyCity = companyInfo.getFieldValue('city'); 
		var companyState = companyInfo.getFieldValue('state'); 
		var companyZip = companyInfo.getFieldValue('zip'); 
		
		var amountHTML = 
			'<table width="100%">' +
				'<tr>' + 
					'<td style="width:70%">' + 
						'&nbsp;' + 
					'</td>' +
					'<td style="width:20%; font-weight:bold;">' + 
						'Total Amount' + 
					'</td>' +
					'<td style="width:10%;" align="right;">' + 
						'$' + totalAmountString + 
					'</td>' +
				'</tr>' +     
			'</table>';

		var voucherLineSection = 
			'<table width="100%">' +
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
					'<td style="font-weight:bold; border-bottom:1px solid black; width:19%;">' + 
						'Memo' + 
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
		
		nlapiLogExecution('DEBUG', 'Loop Claims', '');
		
		for (var i=0; i<creditMemos.length; i++)
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
				
				voucherLineSection += 
					'<tr style="page-break-after: auto;">' + 
						'<td>' + 
							creditMemoDate + 
						'</td>' +
						'<td>' + 
							claimId + 
						'</td>' +
						'<td style="font-size:7pt;">' + 
							poNumber + 
						'</td>' +
						'<td style="word-wrap: break-word; font-size:7pt;">' + 
							memo + 
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
			 	voucherLineSection += 
					'<tr style="page-break-after: auto;">' + 
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
		 
		voucherLineSection += '</table>';
		 
		checkHTML = 
		 	'<body style="font-size:10pt; font-family:sans-serif;" size="A4">' +
				'<table width="100%">' +
					'<tr>' +
						'<td style="width:50%;">' +
							'<img src="' + logoAddress + '" width="150px" height="92px" />' +
						'</td>' +
						'<td style="font-size:18pt; font-weight:bold; width:50%; vertical-align:bottom;" colspan="2">' +
							'Payment Voucher' +
						'</td>' +
					'</tr>' +
					'<tr>' +
						'<td style="padding-top:10px; width:50%;">' +
							companyName +
						'</td>' +
						'<td style="padding-top:10px; width:25%;">' +
							'Date' +
						'</td>' +
						'<td style="padding-top:10px; width:25%;">' +
							dateString +
						'</td>' +
					'</tr>' +
					'<tr>' +
						'<td>' + 
							companyAddress1 +
						'</td>' +
						'<td>' + 
							'Check #' +
						'</td>' +
						'<td>' + 
							checkNumber +
						'</td>' +
					'</tr>' +  
					'<tr>' + 
						'<td>' + 
							companyCity + ', ' + companyState + ' ' + companyZip +
						'</td>' +
					'</tr>' +
					'<tr>' + 
						'<td>' + 
							//spacer
						'</td>' +
					'</tr>' +    
					'<tr>' + 
						'<td>' + 
							//spacer
						'</td>' +
					'</tr>' + 
					'<tr>' + 
						'<td>' + 
							//spacer
						'</td>' +
					'</tr>' + 
					'<tr>' + 
						'<td style="font-weight:bold;">' + 
							'Paid To' +
						'</td>' +
					'</tr>' +  
					'<tr>' + 
						'<td>' + 
							addressee +
						'</td>' +
					'</tr>' +  
					attentionHTML +
					'<tr>' + 
						'<td>' + 
							address1 +
						'</td>' +
					'</tr>' +  
					'<tr>' + 
						'<td>' + 
							city + ', ' + state + ' ' + zip +
						'</td>' +
					'</tr>' +
					'<tr>' + 
						'<td>' + 
							country +
						'</td>' +
					'</tr>' +  				
				'</table>' +
				voucherLineSection +
				amountHTML +
			'</body>';
	}
		
	return checkHTML;
}