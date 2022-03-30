/* * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * *
Change ID		:CH#NON-REVENUE_AUTO_ACK_EMAIL
Programmer		:Sagar Shah
Description		: Send Auto-Ack Email to the Requestor
Date			: 03/11/2010
* * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * *
Change ID		:CH#ADD_RELEASE_TYPE
Programmer		:Sagar Shah
Description		: Add Release Type description in the Email to both Employee and Customer
Date			: 10/07/2013
* * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * */
var sNetsuiteEmailId = 17394;//Order Fulfillment Group ID
function afterSubmit(type)
{

   var record;
   var soId = nlapiGetRecordId();

	try	{
	   record = nlapiLoadRecord('salesorder', soId);		
	} catch (exception)	{
		return false;
	}


   var source = record.getFieldValue('source');
   //var emailSentFlag = record.getFieldValue('custbody_ack_email_sent');
   
	
	if (source == 'Customer Center')// Process only for Non-Revenue Sales Order generated from the Customer Center
	{			

		var kanaContactEmail = record.getFieldValue('custbody_kana_contact_email');
		var customerEmail = record.getFieldValue('custbody_delivery_email');
		
		sendEmpEmail(record,kanaContactEmail);
		if(customerEmail != '' && customerEmail != null) {
			sendCustEmail(record,customerEmail);
		}

		//record.setFieldValue('custbody_ack_email_sent','T');
		nlapiSubmitRecord(record,true);

		//return true;
	}
	
}

function sendCustEmail(record,toEmail) {

	var productsList = '';
	var itemcount = record.getLineItemCount('item');
	
	for ( var i = 1; i <= itemcount; i++) {
		var itemDesc = record.getLineItemValue('item', 'custcol_non_rev_desc', i);
		//CH#ADD_RELEASE_TYPE - start
		var releaseTypeDesc = record.getLineItemValue('item', 'custcol_item_release_desc', i);

		productsList += '&nbsp;'+i+'&nbsp;'+itemDesc;
		
		if(releaseTypeDesc != '' && releaseTypeDesc != null) 
			productsList += '&nbsp;&minus;&nbsp;'+releaseTypeDesc + '<br>&nbsp;';
		else
			productsList += '<br>&nbsp;';
		
		//CH#ADD_RELEASE_TYPE - end		
	}		

	var custName = record.getFieldValue('custbody_online_ext_customer_name');
	var shipToName = record.getFieldValue('custbodyonline_ship_to_name');
	if(shipToName != '' && shipToName != null) {
		custName = shipToName;
	}

	var emailBody = '<html><body>';
	emailBody += '<p>Dear&nbsp;'+custName+',</p>';
	emailBody += '<p>As requested an order has been placed for the following install files / documentation. Please kindly email the support case if you have any changes/questions about this.<br/>';
	emailBody += 'Please do not reply back to this email.</p>';
	emailBody += '<table width="100%" border="0">';
	
	emailBody += '<tr><td><b>Submitted On </b></td><td>: '+record.getFieldValue('trandate')+'</td></tr>';
	
	emailBody += '<tr><td><b>Requestor </b></td><td>: '+record.getFieldText('custbody_kana_contact_name');
	emailBody +='&nbsp;<<a href="mailto:'+record.getFieldValue('custbody_kana_contact_email')+'">'+record.getFieldValue('custbody_kana_contact_email')+'</a>></td></tr>';

	emailBody += '<tr><td><b>Request Type </b></td><td>: '+record.getFieldText('custbody_online_request_type')+'</td></tr>';

	emailBody += '<tr><td><b>Urgent Request </b></td><td>: '+record.getFieldText('custbody_online_urgent_request')+'</td></tr>';

	emailBody += '<tr><td><b>Current Maint. End Date </b></td><td>: '+record.getFieldValue('custbody_online_cur_maint_end_dt')+'</td></tr>';

	emailBody += '<tr><td><b>Requesting for	</b></td><td>: '+record.getFieldText('custbody_online_requesting_for')+'</td></tr>';

	emailBody += '<tr><td><b>Company </b></td><td>: '+record.getFieldValue('custbody_online_ext_customer_name')+'</td></tr>';

	emailBody += '<tr><td><b>Delivery Type </b></td><td>: '+record.getFieldText('custbody_online_delivered_via')+'</td></tr>';

	emailBody += '<tr><td><b>Contact </b></td><td>: '+record.getFieldValue('custbodyonline_ship_to_name')+'</td></tr>';

	emailBody += '<tr><td><b>Email </b></td><td>: '+record.getFieldValue('custbody_delivery_email')+'</td></tr>';

	emailBody += '<tr><td><b>Address </b></td><td>: '+record.getFieldValue('custbodyonline_shipping_address')+'</td></tr>';

	emailBody += '<tr><td><b>Eval Expiration </b></td><td>: '+record.getFieldText('custbody_online_eval_term')+'</td></tr>';

	emailBody += '<tr><td><b>Special Notes </b></td><td>: '+record.getFieldValue('custbody_online_notes')+'</td></tr>';

	emailBody += '<tr><td><b>Requested Product(s) </b></td><td>:'+productsList+'</td></tr>';
	emailBody += '</table>';

	emailBody += '</body></html>';
	
	var soRecord = new Object();
	soRecord['transaction'] = record.getId();//attach email to the sales order record
	
	//send email to Sales Rep
	nlapiSendEmail(sNetsuiteEmailId,toEmail, 'KANA Order Confirmation', emailBody, null, null,soRecord);
}

function sendEmpEmail(record,toEmail) {

	var productsList = '';
	var itemcount = record.getLineItemCount('item');
	
	for ( var i = 1; i <= itemcount; i++) {
		var itemDesc = record.getLineItemValue('item', 'custcol_non_rev_desc', i);

		//CH#ADD_RELEASE_TYPE - start
		var releaseTypeDesc = record.getLineItemValue('item', 'custcol_item_release_desc', i);

		productsList += '&nbsp;'+i+'&nbsp;'+itemDesc;
		
		if(releaseTypeDesc != '' && releaseTypeDesc != null) 
			productsList += '&nbsp;&minus;&nbsp;'+releaseTypeDesc + '<br>&nbsp;';
		else
			productsList += '<br>&nbsp;';
		
		//CH#ADD_RELEASE_TYPE - end
	}		

	var emailBody = '<html><body>';
	emailBody += '<h2>Sales Order details</h2>';
	emailBody += '<table width="100%" border="0">';
	emailBody += '<tr><td><b>Submitted On </b></td><td>: '+record.getFieldValue('trandate')+'</td></tr>';
	emailBody += '<tr><td><b>Order Number </b></td><td>: '+record.getFieldValue('tranid')+'</td></tr>';
	emailBody += '<tr><td><b>Requestor </b></td><td>: '+record.getFieldText('custbody_kana_contact_name')+'</td></tr>';
	emailBody += '<tr><td><b>Request Type </b></td><td>: '+record.getFieldText('custbody_online_request_type')+'</td></tr>';
	emailBody += '<tr><td><b>Class of Sale </b></td><td>: '+record.getFieldText('custbody_class_of_sale')+'</td></tr>';
	emailBody += '<tr><td><b>Urgent Request </b></td><td>: '+record.getFieldText('custbody_online_urgent_request')+'</td></tr>';
	emailBody += '<tr><td><b>Current Maint. End Date </b></td><td>: '+record.getFieldValue('custbody_online_cur_maint_end_dt')+'</td></tr>';
	emailBody += '<tr><td><b>Requesting for	</b></td><td>: '+record.getFieldText('custbody_online_requesting_for')+'</td></tr>';
	emailBody += '<tr><td><b>Customer Account Name </b></td><td>: '+record.getFieldValue('custbody_online_ext_customer_name')+'</td></tr>';
	emailBody += '<tr><td><b>End Customer Requested For</b></td><td>: '+record.getFieldValue('custbody_online_end_customer')+'</td></tr>';
	emailBody += '<tr><td><b>Delivery Type </b></td><td>: '+record.getFieldText('custbody_online_delivered_via')+'</td></tr>';
	emailBody += '<tr><td><b>ShipTo Name </b></td><td>: '+record.getFieldValue('custbodyonline_ship_to_name')+'</td></tr>';
	emailBody += '<tr><td><b>Shipping Email </b></td><td>: '+record.getFieldValue('custbody_delivery_email')+'</td></tr>';
	emailBody += '<tr><td><b>Shipping Address </b></td><td>: '+record.getFieldValue('custbodyonline_shipping_address')+'</td></tr>';
	emailBody += '<tr><td><b>Eval Term (in days) </b></td><td>: '+record.getFieldText('custbody_online_eval_term')+'</td></tr>';
	emailBody += '<tr><td><b>Special Notes </b></td><td>: '+record.getFieldValue('custbody_online_notes')+'</td></tr>';
	emailBody += '<tr><td><b>Product(s) Requested </b></td><td>:'+productsList+'</td></tr>';
	emailBody += '</table>';

	emailBody += '<br><p><b>Please do not reply to this email.</b><p>';	
	emailBody += '</body></html>';
	
	var soRecord = new Object();
	soRecord['transaction'] = record.getId();//attach email to the sales order record

	//send email to Sales Rep
	nlapiSendEmail(sNetsuiteEmailId,toEmail, 'Acknowledgment: Sales Order No: '+record.getFieldValue('tranid')+' submitted.', emailBody, null, null,soRecord);
}
