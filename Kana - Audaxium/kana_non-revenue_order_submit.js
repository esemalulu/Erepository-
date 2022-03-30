 /** 
Change ID		:CH#PHASE II = Order Management
Programmer		:Sagar Shah
Description		: Create Non-Revenue Order Entry screen. This page would be initiated from the SugarCRM application.
Date			: 04/19/2010	
**/

var customerName;
var customerInternalID;
var customerSubsidiary;
var websiteItemList = new Array();
var employeeList = new Array();
var customerList = new Array();

function NonRevenueOrderEntry(request, response)
{
	if(request.getMethod() == 'GET') 
	{   //Generate Non-Revenue Order Entry screen

		var form = nlapiCreateForm('Non Revenue Order Entry Form',true);
		
		form.setScript('customscript_non_revenue_clientside');//may need to change the script ID when migrated to Production		
		
		//Creating Item Sub Tab
		var itemTab = form.addTab('custpage_itemtab','Items');

		var systemTab = form.addTab('custpage_systemtab','System');

		//Get Customer Information if the request is coming from SugarCRM
		
		var custSugarID = '';
		custSugarID = request.getParameter('custid');
		
		if(custSugarID != '' && custSugarID != null) {
			getCustomerInfo(custSugarID);
		}
		
		//Creating Header section
		var custField = form.addField('custpage_customer','select','Customer',null);
		custField.setMandatory(true);

		getCustomerList();

		//========================================================================
		var hiddenCustomerList = form.addField('custpage_hiddencustomerlist','select','Dummy Field (PLEASE IGNORE)',null,'custpage_systemtab');
		hiddenCustomerList.setDisplayType('disabled');
		//========================================================================
		
		custField.addSelectOption('-1', 'Select Customer...');
		for(var k in customerList)
		{
			custField.addSelectOption(customerList[k][0], customerList[k][1]);

			hiddenCustomerList.addSelectOption(customerList[k][0],customerList[k][2]);
		}

		var custIDField = form.addField('custpage_customer_id','text','Customer ID');
		custIDField.setDisplayType('hidden');

		var subsidiaryField = form.addField('custpage_subsidiary','text','Subsidiary',null,'custpage_systemtab');
		subsidiaryField.setDisplayType('inline');

		if(customerName!=null && customerName!='')//set the default customer based on the SugarCRM customer
		{
			custField.setDefaultValue(customerInternalID);
			custIDField.setDefaultValue(customerInternalID);
			subsidiaryField.setDefaultValue(customerSubsidiary);
			custField.setDisplayType('inline');
		}

		var d = new Date();
		var curr_date = d.getDate();
		var curr_month = d.getMonth();
		curr_month++;
		var curr_year = d.getFullYear();
		var todaysDate = curr_month+'/'+curr_date+'/'+curr_year;

		var dateField = form.addField('custpage_date','date','Date');
		dateField.setDefaultValue(todaysDate);
		dateField.setDisplayType('inline');

		form.addField('custpage_endcust','text','End Customer Name');

		//var requestTypeField = form.addField('custpage_requesttype','select','Request Type','customlist_online_request_type');
		var requestTypeField = form.addField('custpage_requesttype','select','Request Type',null);
		requestTypeField.addSelectOption('','');
		requestTypeField.addSelectOption('1','Upgrade');
		requestTypeField.addSelectOption('2','Replacement');
		//requestTypeField.addSelectOption('3','Evaluation');
		requestTypeField.addSelectOption('4','Internal');
		requestTypeField.addSelectOption('5','Documentation');
		requestTypeField.setMandatory(true);
		//requestTypeField.setDisplayType('entry');

		var kanaContactName = form.addField('custpage_kanacontactname','select','KANA Contact Name',null);
		kanaContactName.setMandatory(true);

		getEmployeeList();

		//========================================================================
		var hiddenEmployeeList = form.addField('custpage_hiddenemployeelist','select','Dummy Field (PLEASE IGNORE)',null,'custpage_systemtab');
		hiddenEmployeeList.setDisplayType('disabled');
		//========================================================================
		
		kanaContactName.addSelectOption('-1', 'Select Kana Contact...');

		for(var j in employeeList)
		{
			kanaContactName.addSelectOption(employeeList[j][3], employeeList[j][0]);

			hiddenEmployeeList.addSelectOption(employeeList[j][3],employeeList[j][0]+'|'+employeeList[j][1]+'|'+employeeList[j][2]);
		}

		var kanaContactEmailField = form.addField('custpage_kanacontactemail','email','KANA Contact Email');
		kanaContactEmailField.setDisplaySize(40);
		kanaContactEmailField.setMandatory(true);

		var kanaContactPhoneField = form.addField('custpage_kanacontactphone','phone','KANA Contact Phone');
		kanaContactPhoneField.setDisplaySize(40);

		//var urgentReq = form.addField('custpage_urgentrequest','select','Urgent Request','customlist_yesno_type');
		var urgentReq = form.addField('custpage_urgentrequest','select','Urgent Request',null);
		urgentReq.addSelectOption('','');
		urgentReq.addSelectOption('1','Yes');
		urgentReq.addSelectOption('2','No');

		//var classOfSaleField = form.addField('custpage_classofsale','select','Class of Sale','customlist_class_of_sale_list');
		var classOfSaleField = form.addField('custpage_classofsale','select','Class of Sale',null,'custpage_systemtab');
		classOfSaleField.addSelectOption('5','Non-Revenue');
		classOfSaleField.setDefaultValue('5');
		classOfSaleField.setDisplayType('disabled');

		//var curr_Maint = form.addField('custpage_currentonmaint','select','Current on Maintenance','customlist_yesno_type');
		var curr_Maint = form.addField('custpage_currentonmaint','select','Current on Maintenance',null);
		curr_Maint.addSelectOption('','');
		curr_Maint.addSelectOption('1','Yes');
		curr_Maint.addSelectOption('2','No');

		form.addField('custpage_currentmaintenddate','date','Current Maintenance End Date');

		//var requestingForField = form.addField('custpage_requestingfor','select','Requesting For','customlist_online_customer_type_list');
		var requestingForField = form.addField('custpage_requestingfor','select','Requesting For',null);
		requestingForField.addSelectOption('','');
		requestingForField.addSelectOption('1','Customer');
		requestingForField.addSelectOption('2','Partner/Reseller');
		requestingForField.addSelectOption('3','Internal');
		requestingForField.setMandatory(true);

		//var deliveredViaField = form.addField('custpage_deliveredvia','select','Delivered Via','customlist_delivery_options');
		var deliveredViaField = form.addField('custpage_deliveredvia','select','Delivered Via',null);
		deliveredViaField.addSelectOption('','');
		deliveredViaField.addSelectOption('1','FTP');
		deliveredViaField.addSelectOption('2','Physical Shipment');
		deliveredViaField.addSelectOption('3','Both');
		deliveredViaField.setDefaultValue('1');
		deliveredViaField.setMandatory(true);

		form.addField('custpage_shiptoname','text','Ship To Name');

		var shippingEmailField = form.addField('custpage_shiptoemail','text','Shipping Email Address');
		shippingEmailField.setMandatory(true);

		form.addField('custpage_shippingaddress','textarea','Shipping Address');

		form.addField('custpage_notes','textarea','Notes or Special Instructions');


		//========================================================================
		var hiddenItemList = form.addField('custpage_hiddenitemlist','select','Dummy Field (PLEASE IGNORE)',null,'custpage_systemtab');
		hiddenItemList.setDisplayType('disabled');

		var hiddenItemSelected = form.addField('custpage_hiddenitemselected','textarea','Dummy Field (PLEASE IGNORE)',null,'custpage_systemtab');
		hiddenItemSelected.setDisplayType('hidden');
		//========================================================================


		var itemSubList = form.addSubList('custpage_itemsublist','inlineeditor','Item','custpage_itemtab');

		var itemField = itemSubList.addField('custpage_item','select','Item',null);		
		//itemField.setDisplaySize(20);
		//populate Item List

		getWebsiteItemList();

		itemField.addSelectOption('-1', 'Select Item....');

		for(var i in websiteItemList)
		{
			itemField.addSelectOption(websiteItemList[i][4], websiteItemList[i][0]+' : '+websiteItemList[i][1].substring(0,40)+'....');

			hiddenItemList.addSelectOption(websiteItemList[i][4],websiteItemList[i][0]+'|'+websiteItemList[i][1]+'|'+websiteItemList[i][2]+'|'+websiteItemList[i][3]);
		}
		
		itemSubList.addField('custpage_itemdescription','text','Description');

		var itemProductFamily = itemSubList.addField('custpage_itemproductfamily','text','Product Family');
		itemProductFamily.setDisplayType('disabled');

		var itemCategory = itemSubList.addField('custpage_itemcategory','text','Item Category');
		itemCategory.setDisplayType('disabled');
		
		form.addSubmitButton('Create Order');
		form.addResetButton('Reset');

		var footer_msg = form.addField('custpage_footer_msg','inlinehtml');
		footer_msg.setDefaultValue('<br/><font color="red">In case of any issue or concern please contact </font><a href="mailto:netsuitehelpdesk@kana.com">KANA IT.</a><br/>');
		footer_msg.setLayoutType('outsidebelow', 'startrow');

		response.writePage(form);

	} 
	else { //Submit Non-Revenue Order data

		response.write('<html><body>');

		try
		{
			var custID = request.getParameter('custpage_customer_id');
			
			var salesOrder = nlapiCreateRecord('salesorder');

			salesOrder.setFieldValue('entity', custID);
			salesOrder.setFieldText('subsidiary', request.getParameter('custpage_subsidiary'));
			salesOrder.setFieldValue('trandate', request.getParameter('custpage_date'));
			salesOrder.setFieldValue('custbody_online_end_customer', request.getParameter('custpage_endcust'));
			salesOrder.setFieldValue('custbody_online_request_type', request.getParameter('custpage_requesttype'));

			salesOrder.setFieldValue('custbody_kana_contact_name', request.getParameter('custpage_kanacontactname'));
			salesOrder.setFieldValue('custbody_kana_contact_email', request.getParameter('custpage_kanacontactemail'));
			salesOrder.setFieldValue('custbody_kana_contact_telephone', request.getParameter('custpage_kanacontactphone'));

			salesOrder.setFieldValue('custbody_online_urgent_request', request.getParameter('custpage_urgentrequest'));
			salesOrder.setFieldValue('custbody_class_of_sale', request.getParameter('custpage_classofsale'));
			
			salesOrder.setFieldValue('custbody_online_maint_flag', request.getParameter('custpage_currentonmaint'));
			salesOrder.setFieldValue('custbody_online_cur_maint_end_dt', request.getParameter('custpage_currentmaintenddate'));
			salesOrder.setFieldValue('custbody_online_requesting_for', request.getParameter('custpage_requestingfor'));
			salesOrder.setFieldValue('custbody_online_delivered_via', request.getParameter('custpage_deliveredvia'));

			salesOrder.setFieldValue('custbodyonline_ship_to_name', request.getParameter('custpage_shiptoname'));
			salesOrder.setFieldValue('custbody_delivery_email', request.getParameter('custpage_shiptoemail'));
			salesOrder.setFieldValue('custbodyonline_shipping_address', request.getParameter('custpage_shippingaddress'));
			//salesOrder.setFieldValue('custbody_online_eval_term', request.getParameter('custpage_evalterm'));
			salesOrder.setFieldValue('custbody_online_notes', request.getParameter('custpage_notes'));

			salesOrder.setFieldValue('custbody_creation_source', 'Suitelet Form');			
			salesOrder.setFieldText('customform', 'KANA Sales Order - Non Revenue');		
			
			//adding line items
			var tempStr = request.getParameter('custpage_hiddenitemselected');
			var itemList = tempStr.split(':::');

			for(var i=0,j=1; i<itemList.length-1; i++,j++ )
			{
				salesOrder.setLineItemValue('item', 'item', j, itemList[i]);
				salesOrder.setLineItemValue('item', 'price', j, 5);			
				i++;
				salesOrder.setLineItemValue('item', 'custcol_non_rev_desc', j, itemList[i]);			
				salesOrder.setLineItemValue('item', 'custcol_hidden_non_rev_desc', j, itemList[i]);			
			}
			
			var salesOrderInternalID = nlapiSubmitRecord(salesOrder, true);


			var salesOrderNumber = nlapiLookupField('salesorder',salesOrderInternalID,'tranid');

			response.write('<table>');

			response.write('<tr><td>Your Order has been successfully created!!</td></tr>');

			response.write('<tr><td>The Sales Order number is&nbsp;<b>'+salesOrderNumber+'</b></td></tr>');

			response.write('<tr><td>&nbsp</td></tr>');

			//send email
			sendAckEmails(salesOrderInternalID);

			response.write('<tr><td>Sales Order confirmation email would be sent to following email addresses:</td></tr>');

			response.write('<tr><td>1.&nbsp;'+request.getParameter('custpage_kanacontactemail')+'</td></tr>');
			response.write('<tr><td>2.&nbsp;'+request.getParameter('custpage_shiptoemail')+'</td></tr>');

			response.write('</table>');
			
			//response.write('<br/>Information submitted!!!');
			//response.write('<br/> Sales Order Number: '+salesOrderID);
			
		}
		catch (e)
		{
			response.write('<h3>Error occurred while submitting the Order: '+e.message+'.<br>Please contact <a href="mailto:netsuitehelpdesk@kana.com">KANA IT</a></h3>');
		}

		response.write('</body></html>');

	}
}

function getCustomerList()
{
		var columns = new Array();
		columns[1] = new nlobjSearchColumn('internalid');
		columns[0] = new nlobjSearchColumn('companyname');
		//columns[2] = new nlobjSearchColumn('subsidiarynohierarchy');
		columns[2] = new nlobjSearchColumn('subsidiary');
		
		//var searchFilters = new Array();
		//searchFilters[0] = new nlobjSearchFilter('isinactive',null,'is','F');
		//get data from the search 'Customer List for Non-Revenue Order (DO_NOT_DELETE'
		var searchResults = nlapiSearchRecord('customer', 'customsearch_cust_list_for_non_revenue', null, columns);
		for(var i in searchResults)
		{
			customerList[i] = new Array();
			customerList[i][0] = searchResults[i].getValue(columns[1]);//internalid
			customerList[i][1] = searchResults[i].getValue(columns[0]);//companyname
			customerList[i][2] = searchResults[i].getText(columns[2]);//subsidiary
		}

}
function getEmployeeList()
{
//Get the complete Employee List
	var searchFilters = new Array();
	searchFilters[0] = new nlobjSearchFilter('isinactive',null,'is','F');
	
	var searchColumns = new Array();
	searchColumns[0] = new nlobjSearchColumn('entityid',null,null);
	searchColumns[1] = new nlobjSearchColumn('email',null,null);
	searchColumns[2] = new nlobjSearchColumn('phone',null,null);
	searchColumns[3] = new nlobjSearchColumn('internalid',null,null);

	var searchResults = nlapiSearchRecord('employee',null, searchFilters, searchColumns);
	
	for(var i in searchResults)
	{
		employeeList[i] = new Array();
		employeeList[i][0] = searchResults[i].getValue(searchColumns[0]);//entityid
		employeeList[i][1] = searchResults[i].getValue(searchColumns[1]);//email
		employeeList[i][2] = searchResults[i].getValue(searchColumns[2]);//phone
		employeeList[i][3] = searchResults[i].getValue(searchColumns[3]);//Internal ID
	}
}

function getWebsiteItemList()
{
	//Search for Customer with Sugar ID 'custSugarID'
	var searchFilters = new Array();
	searchFilters[0] = new nlobjSearchFilter('isonline',null,'is','T');
	searchFilters[1] = new nlobjSearchFilter('isinactive',null,'is','F');
	
	var searchColumns = new Array();
	searchColumns[0] = new nlobjSearchColumn('name',null,null);
	searchColumns[1] = new nlobjSearchColumn('custitem_non_rev_sales_desc',null,null);
	searchColumns[2] = new nlobjSearchColumn('custitem_item_type',null,null);
	searchColumns[3] = new nlobjSearchColumn('custitem_item_type_4_scripting',null,null);
	searchColumns[4] = new nlobjSearchColumn('internalid',null,null);

	var searchResults = nlapiSearchRecord('item',null, searchFilters, searchColumns);
	
	for(var i in searchResults)
	{
		websiteItemList[i] = new Array();
		websiteItemList[i][0] = searchResults[i].getValue(searchColumns[0]);//item name
		websiteItemList[i][1] = searchResults[i].getValue(searchColumns[1]);//item description
		websiteItemList[i][2] = searchResults[i].getText(searchColumns[2]);//Product Family
		websiteItemList[i][3] = searchResults[i].getText(searchColumns[3]);//Item Category
		websiteItemList[i][4] = searchResults[i].getText(searchColumns[4]);//Internal ID
	}
}


function getCustomerInfo(custSugarID)
{
	//Search for Customer with Sugar ID 'custSugarID'
	var searchFilter = new nlobjSearchFilter('custentity_sugarcrm_customer_id',null,'is',custSugarID);
	
	var searchColumns = new Array(2);
	searchColumns[0] = new nlobjSearchColumn('altname',null,null);
	searchColumns[1] = new nlobjSearchColumn('subsidiary',null,null);
	searchColumns[2] = new nlobjSearchColumn('internalid',null,null);

	var resultList = nlapiSearchRecord('entity',null, searchFilter, searchColumns);
	
	customerName = resultList[0].getValue(searchColumns[0]);
	customerSubsidiary = resultList[0].getText(searchColumns[1]);	
	customerInternalID = resultList[0].getValue(searchColumns[2]);	
}

/**************************   EMAIL CODE BELOW ******************************************************/
var sNetsuiteEmailId = 17394;//Order Fulfillment Group ID
function sendAckEmails(soId)
{

   var record;

	try	{
	   record = nlapiLoadRecord('salesorder', soId);		
	} catch (exception)	{
		return false;
	}


   //var source = record.getFieldValue('source');
   //var source_of_creation = record.getFieldValue('custbody_creation_source');//CH#SUITELET_FORM
   //var emailSentFlag = record.getFieldValue('custbody_ack_email_sent');
   
	
	//if (source == 'Customer Center' || source_of_creation == 'Suitelet Form')// Process only for Non-Revenue Sales Order generated from the Customer Center and Suitet Form
	//{			

	var kanaContactEmail = record.getFieldValue('custbody_kana_contact_email');
	var customerEmail = record.getFieldValue('custbody_delivery_email');
	
	sendEmpEmail(record,kanaContactEmail);
	if(customerEmail != '' && customerEmail != null) {
		sendCustEmail(record,customerEmail);
		}

	//}
	
}

function sendCustEmail(record,toEmail) {

	var productsList = '';
	var itemcount = record.getLineItemCount('item');
	
	for ( var i = 1; i <= itemcount; i++) {
		//var itemDesc = record.getLineItemValue('item', 'custcol_non_rev_desc', i);
		var itemDesc = record.getLineItemValue('item', 'custcol_hidden_non_rev_desc', i);		
		productsList += '&nbsp;'+i+'&nbsp;'+itemDesc + '<br>&nbsp;';
	}		
	
	//CH#SUITELET_FORM - start
	var custInternalID = record.getFieldValue('entity');
	var companyName = nlapiLookupField('customer',custInternalID,'companyname');
	var custName = companyName;
	//CH#SUITELET_FORM - end

	var shipToName = record.getFieldValue('custbodyonline_ship_to_name');
	if(shipToName != '' && shipToName != null) {
		custName = shipToName;
	}

	var emailBody = '<html><body>';
	emailBody += '<p>Dear&nbsp;'+checkNull(custName)+',</p>';
	emailBody += '<p>As requested an order has been placed for the following install files / documentation. Please contact KANA Customer Support for any changes/questions about this.<br/>';
	emailBody += 'Please do not reply back to this email.</p>';
	emailBody += '<table width="100%" border="0">';
	
	emailBody += '<tr><td><b>Submitted On </b></td><td>: '+checkNull(record.getFieldValue('trandate'))+'</td></tr>';
	
	emailBody += '<tr><td><b>Requestor </b></td><td>: '+checkNull(record.getFieldText('custbody_kana_contact_name'));
	emailBody +='&nbsp;<<a href="mailto:'+record.getFieldValue('custbody_kana_contact_email')+'">'+record.getFieldValue('custbody_kana_contact_email')+'</a>></td></tr>';

	emailBody += '<tr><td><b>Request Type </b></td><td>: '+checkNull(record.getFieldText('custbody_online_request_type'))+'</td></tr>';

	emailBody += '<tr><td><b>Urgent Request </b></td><td>: '+checkNull(record.getFieldText('custbody_online_urgent_request'))+'</td></tr>';

	emailBody += '<tr><td><b>Current Maint. End Date </b></td><td>: '+checkNull(record.getFieldValue('custbody_online_cur_maint_end_dt'))+'</td></tr>';

	emailBody += '<tr><td><b>Requesting for	</b></td><td>: '+checkNull(record.getFieldText('custbody_online_requesting_for'))+'</td></tr>';

	emailBody += '<tr><td><b>Company </b></td><td>: '+checkNull(companyName)+'</td></tr>';//	//CH#SUITELET_FORM

	emailBody += '<tr><td><b>Delivery Type </b></td><td>: '+checkNull(record.getFieldText('custbody_online_delivered_via'))+'</td></tr>';

	emailBody += '<tr><td><b>Contact </b></td><td>: '+checkNull(record.getFieldValue('custbodyonline_ship_to_name'))+'</td></tr>';

	emailBody += '<tr><td><b>Email </b></td><td>: '+checkNull(record.getFieldValue('custbody_delivery_email'))+'</td></tr>';

	emailBody += '<tr><td><b>Address </b></td><td>: '+checkNull(record.getFieldValue('custbodyonline_shipping_address'))+'</td></tr>';

	emailBody += '<tr><td><b>Eval Expiration </b></td><td>: '+checkNull(record.getFieldText('custbody_online_eval_term'))+'</td></tr>';

	emailBody += '<tr><td><b>Special Notes </b></td><td>: '+checkNull(record.getFieldValue('custbody_online_notes'))+'</td></tr>';

	emailBody += '<tr><td><b>Requested Product(s) </b></td><td>:'+checkNull(productsList)+'</td></tr>';
	emailBody += '</table>';

	emailBody += '</body></html>';
	//send email to Sales Rep
	nlapiSendEmail(sNetsuiteEmailId,toEmail, 'KANA Order Confirmation', emailBody, null, null);
}

function sendEmpEmail(record,toEmail) {

	var productsList = '';
	var itemcount = record.getLineItemCount('item');
	
	for ( var i = 1; i <= itemcount; i++) {
		//var itemDesc = record.getLineItemValue('item', 'custcol_non_rev_desc', i);
		var itemDesc = record.getLineItemValue('item', 'custcol_hidden_non_rev_desc', i);		
		productsList += '&nbsp;'+i+'&nbsp;'+itemDesc + '<br>&nbsp;';
	}		

	//CH#SUITELET_FORM - start
	var custInternalID = record.getFieldValue('entity');
	var companyName = nlapiLookupField('customer',custInternalID,'companyname');
	//CH#SUITELET_FORM - end

	var emailBody = '<html><body>';
	emailBody += '<h2>Sales Order details</h2>';
	emailBody += '<table width="100%" border="0">';
	emailBody += '<tr><td><b>Submitted On </b></td><td>: '+checkNull(record.getFieldValue('trandate'))+'</td></tr>';
	emailBody += '<tr><td><b>Order Number </b></td><td>: '+checkNull(record.getFieldValue('tranid'))+'</td></tr>';
	emailBody += '<tr><td><b>Requestor </b></td><td>: '+checkNull(record.getFieldText('custbody_kana_contact_name'))+'</td></tr>';
	emailBody += '<tr><td><b>Request Type </b></td><td>: '+checkNull(record.getFieldText('custbody_online_request_type'))+'</td></tr>';
	emailBody += '<tr><td><b>Class of Sale </b></td><td>: '+checkNull(record.getFieldText('custbody_class_of_sale'))+'</td></tr>';
	emailBody += '<tr><td><b>Urgent Request </b></td><td>: '+checkNull(record.getFieldText('custbody_online_urgent_request'))+'</td></tr>';
	emailBody += '<tr><td><b>Current Maint. End Date </b></td><td>: '+checkNull(record.getFieldValue('custbody_online_cur_maint_end_dt'))+'</td></tr>';
	emailBody += '<tr><td><b>Requesting for	</b></td><td>: '+checkNull(record.getFieldText('custbody_online_requesting_for'))+'</td></tr>';
	emailBody += '<tr><td><b>Customer Account Name </b></td><td>: '+checkNull(companyName)+'</td></tr>';////CH#SUITELET_FORM
	emailBody += '<tr><td><b>End Customer Requested For</b></td><td>: '+checkNull(record.getFieldValue('custbody_online_end_customer'))+'</td></tr>';
	emailBody += '<tr><td><b>Delivery Type </b></td><td>: '+checkNull(record.getFieldText('custbody_online_delivered_via'))+'</td></tr>';
	emailBody += '<tr><td><b>ShipTo Name </b></td><td>: '+checkNull(record.getFieldValue('custbodyonline_ship_to_name'))+'</td></tr>';
	emailBody += '<tr><td><b>Shipping Email </b></td><td>: '+checkNull(record.getFieldValue('custbody_delivery_email'))+'</td></tr>';
	emailBody += '<tr><td><b>Shipping Address </b></td><td>: '+checkNull(record.getFieldValue('custbodyonline_shipping_address'))+'</td></tr>';
	emailBody += '<tr><td><b>Eval Term (in days) </b></td><td>: '+checkNull(record.getFieldText('custbody_online_eval_term'))+'</td></tr>';
	emailBody += '<tr><td><b>Special Notes </b></td><td>: '+checkNull(record.getFieldValue('custbody_online_notes'))+'</td></tr>';
	emailBody += '<tr><td><b>Product(s) Requested </b></td><td>:'+checkNull(productsList)+'</td></tr>';
	emailBody += '</table>';

	emailBody += '<br><p><b>Please do not reply to this email.</b><p>';	
	emailBody += '</body></html>';
	//send email to Sales Rep
	nlapiSendEmail(sNetsuiteEmailId,toEmail, 'Acknowledgment: Sales Order No: '+record.getFieldValue('tranid')+' submitted.', emailBody, null, null);
}

//CH#SUITELET_FORM - start
function checkNull(value) 
{
	if(value == null || value == '') 
		{
			return 'None';
		}
	else {
		return value;
	}
}
//CH#SUITELET_FORM - end