/**
 * Module Description
 * 
 * Version    Date            Author           Remarks
 * 1.00       07 211 2016     Jeffrey Bajit		This Parts Order script is specifically for Sales orders instead of the Parts Order that is on Quotes/Estimate (Web Order)
 *
 */

/****************** GLOBAL CONSTANTS ****************************************/
var ORDER_TYPE_PARTS = '1';


/**
 * on the webstore (GD Dealer Portal), when the Users print the Sales Order, they will use a custom print button that print the same parts printout but it bypasses the 
 * unchecking of the "To Be Printed" checkbox which is used internally for batch printout. 
 * @appliedtorecord salesorder
 *   
 * @param {String} type Operation types: create, edit, view, copy, print, email
 * @param {nlobjForm} form Current form
 * @param {nlobjRequest} request Request object
 * @returns {Void}
 */
function GD_PartsSalesOrder_BeforeLoad(type, form, request)
{
	if (IsDealerLoggedIn() && nlapiGetFieldValue('custbodyrvsordertype') == ORDER_TYPE_PARTS)
	{
		// Per Case 6214, hide the to be printed check box on the dealer portal.
		var field = nlapiGetField('tobeprinted');
		field.setDisplayType('hidden');
		
		// get the suitelet url
		var sUrl = nlapiResolveURL('SUITELET', 'customscriptgd_dealerportpartsordprint', 'customdeploygd_dealerportpartsordprint') + '&custparam_printdealerportalparts_salesorderid=' + nlapiGetRecordId();
		// add the button to replace the print NetSuite Button, this button will invoke the suitelet.
		form.addButton('custpage_printpartsorderbtn', 'Print Parts Order', "window.open('" + sUrl + "', '_blank');");
		
		form.removeButton('print'); // hide the NetSuite built-in print button.
	}
}

/**
 * Performs Grand Design Part Sales Order Before Submit logic.
 * @param type
 */
function GD_PartsSalesOrder_BeforeSubmit(type)
{
	if(type == 'create')
	{
		if(IsDealerLoggedIn())
		{
			var dealerID = nlapiGetUser();
			var context = nlapiGetContext();
			var requesterEmail = context.getEmail(); //get requester's email address (requester is a dealer's contact)
			
			//Get dealer contact id given dealerId and contact email.
			
			var requester = GetContactFromDealerAndEmail(dealerID, requesterEmail) || ''; 
			if(requester != '')
				nlapiSetFieldValue('custbodygd_dealerportalrequester', requester);	
		}
	}	
}

/**
 * on the webstore (GD Dealer Portal), when the Users create a Sales Order (product catalogue), they want an email sent to the address set on the to be emailed field.
 * @appliedtorecord salesorder
 *   
 * @param {String} type Operation types: create, edit, view, copy, print, email
 * @param {nlobjForm} form Current form
 * @param {nlobjRequest} request Request object
 * @returns {Void}
 */
function GD_PartsSalesOrder_AfterSubmit(type) {
	if (IsDealerLoggedIn() && nlapiGetFieldValue('custbodyrvsordertype') == ORDER_TYPE_PARTS) {
		var salesOrderId = nlapiGetRecordId();
		// load record to get values from
		var salesOrder = nlapiLoadRecord(nlapiGetRecordType(), salesOrderId);
		var companyInfo = nlapiLoadConfiguration('companyinformation');
		var companyName = companyInfo.getFieldValue('companyname');
		// create the email subject and body
		var emailSubject = 	'Your order no. ' + salesOrder.getFieldValue('tranid');//mergeResult.getSubject();
		var emailBody = 	'Dear ' + salesOrder.getFieldText('entity') + ',<br><br>' +
							'Thank you for shopping at ' + companyName + '.<br><br>' +
							'Your order no. ' + salesOrder.getFieldValue('tranid') + ' has been received.<br><br>' +
							'Order Summary:<br><br>';//mergeResult.getBody();
		
		var itemList = '<table>';
		
		var lineCount = salesOrder.getLineItemCount('item');
		// add the line items in the body.
		for (var i = 1; i <= lineCount; i++) {
			if (i == 1) {
				itemList += 	'<tr>' +
								'<th>' +
									'Item' +
								'</th>' +
								'<th colspan="3">' +
								'</th>' +
								'<th>' +
									'Qty' +
								'</th>' +
								'<th>' +
									'Brief Description' +
								'</th>' +
								'<th>' +
									'Rate' +
								'</th>' +
								'<th>' +
									'Amount' +
								'</th>' +
							'</tr>';
			}
			itemList += 	'<tr>' +
							'<td>' +
								salesOrder.getLineItemValue('item', 'custcolrvsitemname', i) +
							'</td>' +
							'<td colspan="3">' +
							'</td>' +
							'<td>' +
								salesOrder.getLineItemValue('item', 'quantity', i) +
							'</td>' +
							'<td>' +
								salesOrder.getLineItemValue('item', 'description', i) +
							'</td>' +
							'<td>' +
								salesOrder.getLineItemValue('item', 'rate', i) +
							'</td>' +
							'<td>' +
								salesOrder.getLineItemValue('item', 'amount', i) +
							'</td>' +
						'</tr>';
			if (i == lineCount) {
				itemList += 	'<tr>' +
									'<td>' +
										
									'</td>' +
									'<td colspan="3">' +
									
									'</td>' +
									'<td>' +
										
									'</td>' +
									'<td>' +
										
									'</td>' +
									'<td>' +
										'Tax' +
									'</td>' +
									'<td>' +
										'$' + nlapiFormatCurrency(salesOrder.getFieldValue('tax')) +
									'</td>' +
								'</tr>' +
								'<tr>' +
									'<td>' +
										
									'</td>' +
									'<td colspan="3">' +
									
									'</td>' +
									'<td>' +
										
									'</td>' +
									'<td>' +
										
									'</td>' +
									'<td>' +
										'<b>Total</b>' +
									'</td>' +
									'<td>' +
										'<b>$' + nlapiFormatCurrency(salesOrder.getFieldValue('total')) + '</b>' +
									'</td>' +
								'</tr>';
			}
		}
		
		itemList += '</table>';
		
        var shoppingLink = nlapiGetContext().getSetting('SCRIPT', 'custscriptwebsitemyaccountdomainurl');
		
		emailBody += itemList + '<br><br>';
		emailBody += 	'Order Shipping Information:<br>' +
						salesOrder.getFieldValue('shipaddressee') + '<br>' +
						salesOrder.getFieldValue('shipaddr1') + '<br>' +
						salesOrder.getFieldValue('shipcity') + ', ' + salesOrder.getFieldValue('shipstate') + ' ' + salesOrder.getFieldValue('shipzip') + '<br>' +
						salesOrder.getFieldValue('shipcountry') + '<br>' +
						salesOrder.getFieldValue('shipphone') + '<br><br>' +
						'Ship Via: ' + salesOrder.getFieldText('shipmethod') + '<br><br>' +
						'To access your account, please go to ' + shoppingLink + ' Log in using the email address and password you provided during checkout.<br><br>' +
						'Thank you for you business.<br><br>' +
						companyName;
						
		var companyReturnEmailUserId = nlapiGetContext().getSetting('SCRIPT', 'custscriptgd_customerserviceuser'); // This is a company preference, the field label is: GD Customer Service User
		var records = new Object();
		records['transaction'] = salesOrderId;
		nlapiSendEmail(companyReturnEmailUserId, salesOrder.getFieldValue('email'), emailSubject, emailBody, null, null, records);
	}
	// On create, edit or approve of the sales order check if gst or hst needs to be reset.
	// Because of this code, the total may change from a higher number to a smaller number on create of the record.
	if (type == 'create' || type == 'edit' || type == 'approve'){
		var soRecord = nlapiLoadRecord(nlapiGetRecordType(), nlapiGetRecordId());
		var isSaveRecord = false;
		var shipMethod = soRecord.getFieldValue('shipmethod');
		if ((shipMethod == GD_SHIPMETHOD_DPU || shipMethod == GD_SHIPMETHOD_UNITSHIP) && nlapiGetRecordType() == 'salesorder' && nlapiGetFieldValue('custbodyrvsordertype') == ORDERTYPE_PART){
			var lineCount = soRecord.getLineItemCount('item');
			var itemId = 0;
			//reverse loop on lines since we could be removing lines.
			for (var i = lineCount; i >= 1; i--){
				soRecord.selectLineItem('item', i);
				itemId = soRecord.getCurrentLineItemValue('item', 'item') || 0;
				nlapiLogExecution('debug', 'item.item', itemId);
				if (itemId == '29832' || itemId == '29861'){
					soRecord.removeLineItem('item', i);
					isSaveRecord = true;
				}
			}
			if (isSaveRecord)
				nlapiSubmitRecord(soRecord);
		}
	}
}