/**
 * Module Description
 * 
 * Version    Date            Author           Remarks
 * 1.00       23 Jul 2012     mwise
 *
 */

/**
 * @param {nlobjRequest} request Request object
 * @param {nlobjResponse} response Response object
 * @returns {Void} Any output is written via response object
 */

function assignSalesOrder(request, response){
	initialize();
	
	if ( request.getMethod() == 'GET' )	{
		if (request.getParameter('custid')!=null) {
			var customerid = request.getParameter('custid');
			var orderid = request.getParameter('orderid');
			var custObj = nlapiLoadRecord('customer', customerid);
			var orderObj = nlapiLoadRecord('salesorder', orderid);
			var companyname = custObj.getFieldValue('companyname');
			var pl = custObj.getFieldValue('custentity411custid');
			var customerinfo = 'Customer: ' +companyname+ ' ' +pl;
			var orderstatus = orderObj.getFieldValue('status');
			var ordertranid = orderObj.getFieldValue('tranid');
			var orderinfo = 'Sales Order: ' +ordertranid+ ' ' +orderstatus;
			var assignee = custObj.getFieldValue('custentity_establishmentrep');
			if (assignee==null){
				assignee = '';
			}
			var form = nlapiCreateForm('ESTABLISHMENT - Assign Sales Order', false);
			form.setScript('assignevents');
			var field0 = form.addField('custpage_companyid','text', 'ID');
			field0.setDefaultValue(customerid);
			field0.setDisplayType('hidden');
			var soid= form.addField('custpage_soid','text', 'ID');
			soid.setDefaultValue(orderid);
			soid.setDisplayType('hidden');
			
			
			var searchresults = getEmployees(EXTROLE_Provisioner, 'Assign, provisioners');
			if (searchresults==null){
				nlapiLogExecution ('System', 'No records found', ''); 
				return;
			}
			nlapiLogExecution ('Debug', 'Assign Sales Orders: Search Results', searchresults.length); 	
			
			var customerInfofld = form.addField('custpage_customerinfo', 'inlinehtml','').setLayoutType('normal', 'startcol');
			customerInfofld.setDefaultValue("<font color='green'  border='thin' font size='3'><b>"+customerinfo+"</b></font>");
			
			var orderInfofld = form.addField('custpage_orderinfo', 'inlinehtml','');
			orderInfofld.setDefaultValue("<font color='green'  border='thin' font size='2'><b>"+orderinfo+"</b></font><p>");
			
			var field1 = form.addField('custpage_assignuser', 'select', 'Assign To:');
			field1.addSelectOption('', 'Select a user to assign to this order...');
			for ( var i = 0; searchresults != null && i < searchresults.length; i++ ){
				// get result values
				var searchresult = searchresults[ i ];
				//nlapiLogExecution ('Debug', searchresult.getValue('firstname') + " " + searchresult.getValue('lastname'), searchresult.getValue('department')); 	
				field1.addSelectOption(searchresult.getValue('internalid' ), searchresult.getValue('firstname') + " " + searchresult.getValue('lastname'));
			}			
			field1.setMandatory(true);
			if (assignee!=null){
				field1.setDefaultValue(assignee);
			}
			else{	
				field1.setDefaultValue('');
			}		
			form.addSubmitButton('Save');
			//form.addButton('custpage_custombutton','Cancel', 'onclick=window.close()');
			
			form.addButton('custpage_custombutton','Cancel, Go To NetSuite HOME', 'parent.location=\''+NETSUITE_HOME+'\'');
			form.addButton('custpage_custombutton1','Cancel : Go Back To Customer', 'parent.location=\''+PATHTOCUSTOMER+customerid+'\'');
			
			response.writePage( form );
		}
	}
	else {
		var assignee='';
		var cname='';
		var custObj = '';
		var customerid = '';
		try { 
			customerid = request.getParameter('custpage_companyid');
			custObj = nlapiLoadRecord('customer', customerid);
			cname= custObj.getFieldValue('entityid');
			
			assignee = request.getParameter('custpage_assignuser');
			custObj.setFieldValue('custentity_establishmentrep', assignee);
			custObj.setFieldValue('custentity_establishmentstatus', ESTABLISHMENTSTATUS_Assigned);
		}
		catch (e){
			nlapiLogExecution ('ERROR', 'Unable to get assignee values: ' + assignee, cname + " "+ e.getDetails()); 	
		}
		
		var empInfo = new Array(); 
		try {
			empInfo = getEmployeeInfo(assignee, 'Assign - post,  est rep info');
		}
		catch(e) {
			nlapiLogExecution ('ERROR', 'Unable to acquire employee details: '+ assignee, cname); 	
		}
		
		try {
	
			if (empInfo[0]!=''&&empInfo[0]!=null){
	  			custId = nlapiSubmitRecord(custObj, true);
				var details = cname + ' assigned to ' + empInfo[1] + ' '+empInfo[2] + ' for establishment.';
				addnote("ASSIGNED TO ESTABLISH REP", details, nlapiGetUser(), customerid);	
				
				var establish_suiteletURL = nlapiResolveURL('SUITELET', 'customscript_establish', 'customdeploy_establish');
				establishURL = establish_suiteletURL+'&custid='+customerid+'&orderid='+request.getParameter('custpage_soid');		
				nlapiSendEmail(nlapiGetUser(), empInfo[0], 'Sales Order Assigned', 'You have been assigned ' + cname + ' for establishment. \n\nClick <a href="'+establishURL+'" target="_self"><font size="2" face="arial">here</font></a>');
	
				logMessage(assignee, nlapiGetUser(), empInfo[0], 'Establish Account', details);
		
				//CONFIRMATION INTERFACE
				var form = nlapiCreateForm('Establishment Assignment Confirmation', true);
				//form.addButton('custpage_custombutton','Exit', 'onclick=window.close()');
				form.addButton('custpage_custombutton','Exit, Go To NetSuite HOME', 'parent.location=\''+NETSUITE_HOME+'\'');
				form.addButton('custpage_custombutton1','Exit, Go Back To Customer', 'parent.location=\''+PATHTOCUSTOMER+customerid+'\'');
					
				//var field100 = form.addField('custpage_confirmation','label', details);
				//var field100 = form.addField('custpage_confirmation','textarea', 'Log:').setDisplaySize(75, 20);
				//field100.setDefaultValue(details);
				
				response.writePage( form );
			}
			else{
				nlapiLogExecution ('ERROR', 'Unable to assign cx to est rep ', cname + " Unable to acquire employee info");
			}
		}
		catch (e){
			nlapiLogExecution ('ERROR', 'Unable to assign cx to est rep ', cname + " "+ e.getDetails()); 	
		}
	}	
}




function establish(request, response){
	
	nlapiLogExecution("System", "Establish Suitelet", "Start");
	initialize();
	
	var checkmark =  '<img src='+greencheckmarkimage+' height="25" width="25">'; 
	var lineheight = '25';
	var fontcolor= 'red';
	var fontsize = '13';
	var companyname = '';
	
	if ( request.getMethod() == 'GET' )	{
		var customerid = request.getParameter('custid');
		var orderid = request.getParameter('orderid');
		
		if (customerid==null||orderid==null) {
			//alert("Unable to establish as the customer id or order id could not be read");
			if (customerid==null){nlapiLogExecution("Error", "Unable to establish", 'customerid is null');}
			if (orderid==null){nlapiLogExecution("Error", "Unable to establish", 'orderid is null');}
			return;
		}
		
		try {

			//COMPANY ID AND NAME
			nlapiLogExecution("System", "Establish Suitelet", "CustID= " + customerid + " Orderid= " + orderid);
			
			//SALES ORDER
			var orderObj = nlapiLoadRecord('salesorder', orderid);	
			var orderstatus = orderObj.getFieldValue('status');
			//var ordertranid = orderObj.getFieldValue('tranid');
			var logostatus = orderObj.getFieldValue('custbody_customer_logo_status');
			var contractlength = orderObj.getFieldValue('custbody_contractterm');
			var paymenttype = orderObj.getFieldValue('custbody_paymenttype');
			var salesrep = orderObj.getFieldValue('salesrep');
			var location = orderObj.getFieldValue('location');
			//var comments = orderObj.getFieldValue("custbody_comments");
	   	   	var subtotal = orderObj.getFieldValue('subtotal');
   	   		var discount = orderObj.getFieldValue('discounttotal');
   	   		var portfoliovalue  = parseFloat(subtotal)+parseFloat(discount);
			if (discount==null||discount=='' ){
   	   			discount = 0;	
   	   		}
		   	
			var billstate = orderObj.getFieldValue('billstate');
			//CUSTOMER RECORD
			var custObj = nlapiLoadRecord('customer', customerid);
			companyname = custObj.getFieldValue('companyname');
			var pl = custObj.getFieldValue('custentity411custid');
			var oacid = custObj.getFieldValue('custentitycustservrep');
			var status = custObj.getFieldValue('custentity_establishmentstatus');
			var assigneeID = custObj.getFieldValue('custentity_establishmentrep');
			var acct_type = custObj.getFieldValue('custentity_cxaccounttype');
			var businessemail = custObj.getFieldValue('custentity_email_business');
			var commemail = custObj.getFieldValue('email');
			var	preflanguage = COMMLANGUAGE_ENGLISH;
			var commlanguage  = custObj.getFieldValue('custentity_comm_languagepreference'); 
			var commfirstname = custObj.getFieldValue('custentity_comm_firstname');
			var commlastname = custObj.getFieldValue('custentity_comm_lastname');
			var logotype = custObj.getFieldValue('custentity_est_typelogo');
			var waitinglogo = custObj.getFieldValue('custentity_est_waitinglogo');
			var havewebsite = custObj.getFieldValue('custentity_est_havewebsite');
			var soldwebsite = custObj.getFieldValue('custentity_est_soldwebsite');
			var createwebsite = custObj.getFieldValue('custentity_est_createwebsite');
			var confirmcreatewebsite = custObj.getFieldValue('custentity_est_confirmwebsitecreation');
			//var websitecustservrep = custObj.getFieldValue('custentity_websitecustservrep');
			var est_description = custObj.getFieldValue('custentity_est_description');
			var est_synonyms = custObj.getFieldValue('custentity_est_synonyms');
			var est_hours = custObj.getFieldValue('custentity_est_hours');
			var est_extrainfo = custObj.getFieldValue('custentity_est_extrainfo');
			var synccontrol= custObj.getFieldValue('custentity_a9r_recordupdate');
			var hideonsite= custObj.getFieldValue('custentity_hide_on_site');
			//var billtoemail = custObj.getFieldValue('custentity_email_billto');
			//var sendbillcontrol = custObj.getFieldValue('custentity_invoiceemailcontrol');
			var displayAddress = custObj.getFieldValue('custentity_displayaddress');
			var displayEmail = custObj.getFieldValue('custentity_displayemail');
			var evoclient = false;
			if (custObj.getFieldValue('parent')==EVO_MAIN_COMPANY_ID){
				evoclient = true;
			}			
			var user = nlapiGetUser();			
			
			var result_list = getPrimaryContact(customerid);	
			if (result_list!=null){
				
				for ( var i = 0; result_list != null && i < result_list.length; i++ ){
					var onerecord = result_list[i];
					var fname = onerecord[0];
					var lname = onerecord[2];
					var email = onerecord[3];
					if (commfirstname==null||commfirstname==''){
						commfirstname=fname;	
					}
					if (commlastname==null||commlastname==''){
						commlastname=lname;	
					}
					if (commemail==null||commemail==''){
						commemail=email;	
					}
				}
			}
	
			
			
			var customerinfo = companyname+ ' ' +pl;
			//var orderinfo = 'Sales Order: ' +orderstatus;			
			var locationString='';
			switch (location){	
			case LOCATION_TORONTO :
				locationString = " CHECKLIST - Toronto";
				break;
			case LOCATION_MONTREAL :
				locationString = " - Montreal";
				break;
			}
			
			if (evoclient){
				locationString = locationString + " - EVO Client";
			}
			
			//SETUP INTERFACE			
			var form = nlapiCreateForm('ESTABLISHMENT' + locationString);
			form.setScript('customscript_establishlib');  
			form.addTab('custpage_maintab', "Sales Order");
			form.addTab('custpage_411tab', "411.ca");
			form.addTab('custpage_accounttab', "Contact and Sale Information");
			form.addTab('custpage_othertab', "Logo Website and Other");

			//ESTABLISHMENT REP
			//IS THE ACCOUNT ASSIGNED, IF NOT THEN ASSIGN TO CURRENT USER
			var noteTrigger = form.addField('custpage_notetrigger','text', '');
			noteTrigger.setDisplayType('hidden');
			noteTrigger.setDefaultValue('false');
		
			var soStatusField= form.addField('custpage_orderstatus','text', '');
			soStatusField.setDisplayType('hidden');
			
			var soIDField= form.addField('custpage_soid','text', '');
			soIDField.setDisplayType('hidden');
			soIDField.setDefaultValue(orderid);
			
			var locationField= form.addField('custpage_location','text', '');
			locationField.setDisplayType('hidden');
			locationField.setDefaultValue(location);

			var syncControlField = form.addField('custpage_a9r_recordupdate','checkbox', '');
			syncControlField.setDisplayType('hidden');
			syncControlField.setDefaultValue(synccontrol);
			
			if (assigneeID==null||assigneeID==''){
				assigneeID = user;	
				noteTrigger.setDefaultValue('true');
			}
			
			if (status==null||status==''||status== ESTABLISHMENTSTATUS_Newsale||status== ESTABLISHMENTSTATUS_Assigned){
				status = ESTABLISHMENTSTATUS_InProgress;
			}
		
			var assigneeidfield = form.addField('custpage_establishmentrep','integer', 'ID');
			assigneeidfield.setDefaultValue(assigneeID);
			assigneeidfield.setDisplayType('hidden');
			//Get Employee Info
			var empInfo = new Array(); 
			try {
				empInfo = getEmployeeInfo(assigneeID, "establish, assignee");
			}
			catch(e) {
				nlapiLogExecution ('System', 'Unable to acquire employee details: '+ assigneeID, companyname); 	
			}	
			
			var assignee='';
			if (empInfo[0]!=''&&empInfo[0]!=null){
				assignee = empInfo[1] + ' '+ empInfo[2];
			}

			//STATUS
			var statusidfield = form.addField('custpage_establishmentstatus','integer', 'ID');
			statusidfield.setDefaultValue(status);
			statusidfield.setDisplayType('hidden');
			var status_value = '';
			switch (status){
			case ESTABLISHMENTSTATUS_Assigned : 	
				status_value = 'Assigned to ' + assignee;
				break;
			case ESTABLISHMENTSTATUS_InProgress	: 	
				status_value = 'In Progress by ' + assignee;
				break;
			case ESTABLISHMENTSTATUS_Established : 	
				status_value = 'Established by '+ assignee + ', Awaiting Verification ';
				break;
			case ESTABLISHMENTSTATUS_Verified : 	
				status_value = 'Verified & Approved';
				break;	
			}
			
				
			var oacidField = form.addField('custpage_custservrep','integer', 'ID');
			oacidField.setDisplayType('hidden');
			oacidField.setDefaultValue(oacid);
			
			if (location==LOCATION_MONTREAL&&!evoclient ){
				oacidField.setDefaultValue(user);
				oacid = user;
			}
				
				
			/*
			switch (location){	
			case LOCATION_TORONTO :
				
				if (acct_type==null||acct_type==''){
					if (parseFloat(portfoliovalue)>TORONTO_BlendDedicatedCutOff){
						acct_type = REPTYPE_Dedicated;
					}
					else{
						acct_type = REPTYPE_Blended;
						oacidField.setDefaultValue(REP_Blended);
						oacid = REP_Blended;
					}
				}
				break;
			case LOCATION_MONTREAL :
				acct_type = REPTYPE_Dedicated;
				if (evoclient){
					oacidField.setDefaultValue(REP_EVO);
					oacid = REP_EVO;
				}
				else{
					oacidField.setDefaultValue(user);
					oacid = user;
				}
				break;
			}
			*/
			
			form.addFieldGroup('controlbar', customerinfo);
			
			var approveCheckbox= form.addField('custpage_approve','checkbox', 'On Submit Approve & Fulfill Order: ', null, 'controlbar');
			approveCheckbox.setDisplayType('hidden');
			var sendforverificationCheckbox= form.addField('custpage_sendforverification','checkbox', 'On Submit Send for Verification: ', null, 'controlbar');
			sendforverificationCheckbox.setDisplayType('hidden');
			
			var donotsend = custObj.getFieldValue('custentity_donotsendcomm');
			
			var mtlString = 'On Submit Finish Establishment: ';
			
			
			if (evoclient) {
				if (donotsend=='T'){
					mtlString = 'On Submit Finish Establishment (No Welcome/Ad Is Ready Email, DO NOT SEND COMMUNICATIONS is set.): ';
				}
				else{
					mtlString = 'On Submit Finish Establishment (Send Welcome/Ad Is Ready Email): ';
				}
			}
			else {
				if (donotsend=='T'){
					mtlString = 'On Submit Finish Establishment (No Welcome Communications, DO NOT SEND COMMUNICATIONS is set.): ';
				}
				else{
					mtlString = 'On Submit Finish Establishment (and start Welcome Communications): ';
				}
				
			}
			
			var mtl_completeOrderCheckbox= form.addField('custpage_mtl_completeorder','checkbox', mtlString, null, 'controlbar');
			mtl_completeOrderCheckbox.setDisplayType('hidden');
			switch (status) {
			case ESTABLISHMENTSTATUS_Assigned : 	
				if (orderstatus=="Pending Approval"||orderstatus=="Pending Fulfillment"){
					approveCheckbox.setDisplayType('normal');
				}	
				else{
					switch (location){
					case LOCATION_TORONTO :
						var viewField = form.addField('custpage_411listing', 'inlinehtml','',null, 'custpage_411tab');
						viewField.setDefaultValue('<iframe src='+'"' + a9r_server + business411_url + pl +'" width="1024" height="500" scrolling="auto" frameborder="1"></IFRAME>');
						sendforverificationCheckbox.setDisplayType('normal');	
							
						break;
					case LOCATION_MONTREAL :
						var viewField = form.addField('custpage_411listing', 'inlinehtml','',null, 'custpage_411tab');
						viewField.setDefaultValue('<iframe src='+'"' + a9r_server + business411_url + pl +'" width="1024" height="500" scrolling="auto" frameborder="1"></IFRAME>');
						mtl_completeOrderCheckbox.setDisplayType('normal');	
						break;
					}
				}
				break;
			case ESTABLISHMENTSTATUS_InProgress : 	
				if (orderstatus=="Pending Approval"||orderstatus=="Pending Fulfillment"){
					approveCheckbox.setDisplayType('normal');
				}
				else{
					switch (location){
					case LOCATION_TORONTO :
						var viewField = form.addField('custpage_411listing', 'inlinehtml','',null, 'custpage_411tab');
						viewField.setDefaultValue('<iframe src='+'"' + a9r_server + business411_url + pl +'" width="1024" height="500" scrolling="auto" frameborder="1"></IFRAME>');
						sendforverificationCheckbox.setDisplayType('normal');		
						break;
					case LOCATION_MONTREAL :
						var viewField = form.addField('custpage_411listing', 'inlinehtml','',null, 'custpage_411tab');
						viewField.setDefaultValue('<iframe src='+'"' + a9r_server + business411_url + pl +'" width="1024" height="500" scrolling="auto" frameborder="1"></IFRAME>');
						mtl_completeOrderCheckbox.setDisplayType('normal');	
						break;
					}
				}
				break;
			case ESTABLISHMENTSTATUS_Established :	
				break;
			
			}
		
			var status_assignmentField= form.addField('custpage_status_assignment', 'inlinehtml','',null, 'controlbar').setBreakType('startcol');
			status_assignmentField.setDefaultValue(status_value);

			
			//PRIMARY INFO 
			form.addFieldGroup('top', "Primary Info");
			
			
			var buttons = form.addField('custpage_buttons', 'inlinehtml', '', null, 'controlbar').setBreakType('startcol');
			var adcenterButton = '<input type=button style="width: 100px;" value="Acct Settings" onClick="JavaScript:var MiniWinAR=window.open(\'' + ac_url + customerid + '\', \'AC\', \'width=1000,height=700,location=no,resizable=yes,scrollbars=yes\'); MiniWinAR.focus();">';
			buttons.setDefaultValue(adcenterButton);
			
			var hiddenIDField = form.addField('custpage_companyid','text', 'ID',null, 'controlbar');
			hiddenIDField.setDefaultValue(customerid);
			hiddenIDField.setDisplayType('hidden');
				
			var salesrepField = form.addField('custpage_salesrep','text', 'ID',null, 'controlbar');
			salesrepField.setDefaultValue(salesrep);
			salesrepField.setDisplayType('hidden');
			
			form.addFieldGroup('saleOrder', "Sales Order",'custpage_maintab');
			var viewField = form.addField('custpage_salesorder', 'inlinehtml', '', null, 'saleOrder');
			
			var sourl = NETSUITE_URL + 'app/accounting/transactions/salesord.nl?id=' + orderid;
			viewField.setDefaultValue('<iframe src='+'"' + sourl +'" width="100%" height="768" scrolling="auto" frameborder="1"></IFRAME>');
			
			//Business Contact Information
			form.addFieldGroup('contactgroup', "Business Contact Information", 'custpage_accounttab');
			
			var fieldBusinessEmail = form.addField('custpage_email_business', 'email', 'Primary Business Email', null, 'contactgroup');
			fieldBusinessEmail.setDefaultValue(businessemail);
			var fieldCommEmail = form.addField('custpage_email', 'email', 'Communications Email', null, 'contactgroup');
			fieldCommEmail.setDefaultValue(commemail);
			var fieldCommFirst = form.addField('custpage_comm_firstname', 'text', 'First Name', null, 'contactgroup');
			fieldCommFirst.setDefaultValue(commfirstname);
			var fieldCommLast = form.addField('custpage_comm_lastname', 'text', 'Last Name', null, 'contactgroup');
			fieldCommLast.setDefaultValue(commlastname);

			
			if (commlanguage==null||commlanguage=='') {
				if (billstate==PROVINCE_QUEBEC) {
					preflanguage = COMMLANGUAGE_FRENCH;
				}
			}
			else {
				if (commlanguage==COMMLANGUAGE_FRENCH) {
					preflanguage = COMMLANGUAGE_FRENCH;
				}
			}
			var langField = form.addField('custpage_commlanguage', 'select', 'Language', null, 'contactgroup');
			langField.addSelectOption(COMMLANGUAGE_ENGLISH,'English');
			langField.addSelectOption(COMMLANGUAGE_FRENCH,'French');
			langField.setDefaultValue(preflanguage);
			
			
			form.addFieldGroup('dispcontrolgroup', "Listing Display Control", 'custpage_accounttab');
			
			var hideOnSiteField= form.addField('custpage_hideonsite', 'checkbox', 'Hide On Site', null, 'dispcontrolgroup');
			hideOnSiteField.setDefaultValue(hideonsite);
			hideOnSiteField.setDisplayType('normal');
			
			var showAddressOnSite = form.addField('custpage_displayaddress', 'checkbox', 'Display Address On Site', null, 'dispcontrolgroup');
			showAddressOnSite.setDefaultValue(displayAddress);
			showAddressOnSite.setDisplayType('normal');
			
			var showEmailOnSite = form.addField('custpage_displayemail', 'checkbox', 'Display Email On Site', null, 'dispcontrolgroup');
			showEmailOnSite.setDefaultValue(displayEmail);
			showEmailOnSite.setDisplayType('normal');
			
			var hideNotification = form.addField('custpage_hidenotification', 'inlinehtml', '', null, 'dispcontrolgroup').setBreakType('startcol');
			var html = '<br>';
			hideNotification.setDefaultValue(html);
		
//			var sendBillControllerField = form.addField('custpage_billtoemailcontrol', 'checkbox', 'Send Bill To Other Email', null, 'contactgroup');
//			sendBillControllerField.setDefaultValue(sendbillcontrol);
//			sendBillControllerField.setDisplayType('normal');
			
//			var fieldBillToEmail = form.addField('custpage_email_billto', 'email', 'Bill To Email', null, 'contactgroup');
//			fieldBillToEmail.setDefaultValue(billtoemail);
		
//			if (sendbillcontrol!='T'){
//				fieldBillToEmail.setDisplayType('disabled');
//			}
			
			
			var emailNotification = form.addField('custpage_emailnotification', 'inlinehtml', '', null, 'contactgroup').setBreakType('startcol');
			var html = (businessemail==null||businessemail=="") ? "<p style='LINE-HEIGHT: "+lineheight+"px;color:"+fontcolor+"; font-size:"+fontsize+"px;'><b>There is no business email address on file.</b></p>" : checkmark; 
			emailNotification.setDefaultValue(html);
		
			var commemailNotification = form.addField('custpage_commemailnotification', 'inlinehtml', '', null, 'contactgroup');
			var html = (commemail==null||commemail=="") ? "<p style='LINE-HEIGHT: "+lineheight+"px;color:"+fontcolor+"; font-size:"+fontsize+"px;'><b>There is no communications email address on file.</b></p>" : checkmark;
			commemailNotification.setDefaultValue(html);
			
			var commfirstNotification = form.addField('custpage_commfirstnotification', 'inlinehtml', '', null, 'contactgroup');
			var html = (commfirstname==null||commfirstname=="") ? "<p style='LINE-HEIGHT: "+lineheight+"px;color:"+fontcolor+"; font-size:"+fontsize+"px;'><b>There is no communications first name on file.</b></p>" : checkmark;
			commfirstNotification.setDefaultValue(html);
			
			var commlastNotification = form.addField('custpage_commlastnotification', 'inlinehtml', '', null, 'contactgroup');
			var html = (commlastname==null||commlastname=="") ? "<p style='LINE-HEIGHT: "+lineheight+"px;color:"+fontcolor+"; font-size:"+fontsize+"px;'><b>There is no communications last name on file.</b></p>" : checkmark;
			commlastNotification.setDefaultValue(html);
			
//			var billtoemailNotification = form.addField('custpage_billtoemailnotification', 'inlinehtml', '', null, 'contactgroup');
//			var html = "Bill will be sent to Primary Business Email Address";
//			if (sendbillcontrol=='T'){
//				var html = (billtoemail==null||billtoemail=="") ? "<p style='LINE-HEIGHT: "+lineheight+"px;color:"+fontcolor+"; font-size:"+fontsize+"px;'><b>There is no Bill To email address on file.</b></p>" : checkmark;
//			}
//			billtoemailNotification.setDefaultValue(html);
			
			
			//SALE AND ACCOUNT INFORMATION
			form.addFieldGroup('accountinfo', "Sale and Account Information", 'custpage_accounttab');
			
			var portfoliovalueField = form.addField('custpage_portfoliovalue', 'currency', "Monthly Cost", null, 'accountinfo');
			portfoliovalueField.setDefaultValue(portfoliovalue);
			
			
			var paymentTypeField = form.addField('custpage_paymenttype', 'select', 'Payment Type: ', 'customlist_paymenttype', 'accountinfo');
			
			
			/*paymentTypeField.addSelectOption('','');			
			
			
			paymentTypeField.addSelectOption(PAYMENTTYPE_MonthlyCreditCard, 'Monthly Credit Card');
			paymentTypeField.addSelectOption(PAYMENTTYPE_QuarterlyCreditCard, 'Quarterly Credit Card');
			paymentTypeField.addSelectOption(PAYMENTTYPE_SemiAnnualCreditCard, 'Semi-Annual Credit Card');
			paymentTypeField.addSelectOption(PAYMENTTYPE_AnnualCreditCard, 'Annual Credit Card');
			paymentTypeField.addSelectOption(PAYMENTTYPE_MonthlyInvoice, 'Monthly Invoice');
			paymentTypeField.addSelectOption(PAYMENTTYPE_QuarterlyInvoice, 'Quarterty Invoice');
			paymentTypeField.addSelectOption(PAYMENTTYPE_SemiAnnualInvoice, 'Semi-Annual Invoice');
			paymentTypeField.addSelectOption(PAYMENTTYPE_AnnualInvoice, 'Annual Invoice');
			paymentTypeField.addSelectOption(PAYMENTTYPE_MonthlyPAP, 'Monthly PAP');
			paymentTypeField.addSelectOption(PAYMENTTYPE_SemiAnnualPAP, 'Semi-Annual PAP');
			paymentTypeField.addSelectOption(PAYMENTTYPE_AnnualPAP, 'Annual PAP');
			paymentTypeField.addSelectOption(PAYMENTTYPE_BiWeekly, 'Bi-Weekly');
			paymentTypeField.addSelectOption(PAYMENTTYPE_QuarterlyMonthlyCreditCard, 'Quarterly-Monthly Credit Card');
			paymentTypeField.addSelectOption(PAYMENTTYPE_QuarterlyMonthlyInvoice, 'Quarterly-Monthly Invoice');
			paymentTypeField.addSelectOption(PAYMENTTYPE_QuarterlyMonthlyPAP, 'Quarterly-Monthly PAP');
			paymentTypeField.addSelectOption(PAYMENTTYPE_COAUTOMonthlyInvoice, 'CO AUTO Monthly Invoice');
			paymentTypeField.addSelectOption(PAYMENTTYPE_EVOMonthlyInvoice, 'EVO Monthly Invoice');  */
			paymentTypeField.setDefaultValue(paymenttype);
			
			
			var contractLengthField = form.addField('custpage_contractlength', 'select', 'Contract: ', null, 'accountinfo');
			contractLengthField.addSelectOption('','');			
			contractLengthField.addSelectOption(CONTRACT_12,'12 Months');
			contractLengthField.addSelectOption(CONTRACT_6,'6 Months');
			contractLengthField.addSelectOption(CONTRACT_3,'3 Months');
			contractLengthField.addSelectOption(CONTRACT_2,'2 Months');
			contractLengthField.addSelectOption(CONTRACT_15,'15 Months');
			contractLengthField.addSelectOption(CONTRACT_9,'9 Months');
			contractLengthField.addSelectOption(CONTRACT_m2m,'Month to Month');
			contractLengthField.addSelectOption(CONTRACT_3m2m,'3 Months - Month to Month');
			contractLengthField.setDefaultValue(contractlength);
			
			var accountTypeField = form.addField('custpage_cxaccounttype', 'select', 'Account Type', null, 'accountinfo');
			accountTypeField.addSelectOption('','');
			accountTypeField.addSelectOption(REPTYPE_Blended,'Blended');
			accountTypeField.addSelectOption(REPTYPE_Dedicated,'Dedicated');
			accountTypeField.setDefaultValue(acct_type);
	
			var costNotification = form.addField('custpage_costnotification', 'inlinehtml', '', null, 'accountinfo').setBreakType('startcol');
			var html = (portfoliovalue==null||portfoliovalue=="") ? "<p style='LINE-HEIGHT: "+lineheight+"px;color:"+fontcolor+"; font-size:"+fontsize+"px;'><b>Unable to calculate monthly cost.</b></p>" : checkmark; 
			costNotification.setDefaultValue(html);
		
			var paymentTypeNotification = form.addField('custpage_paymenttypenotification', 'inlinehtml', '', null, 'accountinfo');
			var html = (paymenttype==null||paymenttype=="") ? "<p style='LINE-HEIGHT: "+lineheight+"px;color:"+fontcolor+"; font-size:"+fontsize+"px;'><b>The Payment Type has not been set.</b></p>" : checkmark; 
			paymentTypeNotification.setDefaultValue(html);
			
			var contractLengthNotification = form.addField('custpage_contractlengthnotification', 'inlinehtml', '', null, 'accountinfo');
			var html = (contractlength==null||contractlength=="") ? "<p style='LINE-HEIGHT: "+lineheight+"px;color:"+fontcolor+"; font-size:"+fontsize+"px;'><b>The Contract Length has not been set.</b></p>" : checkmark; 
			contractLengthNotification.setDefaultValue(html);

			var acctypeNotification = form.addField('custpage_accttypenotification', 'inlinehtml', '', null, 'accountinfo');
			var html = (acct_type==null||acct_type=="") ? "<p style='LINE-HEIGHT: "+lineheight+"px;color:"+fontcolor+"; font-size:"+fontsize+"px;'><b>The account type has not been set.</b></p>" : checkmark; 
			acctypeNotification.setDefaultValue(html);


			//LOGO 
			form.addFieldGroup('logo', "Logo Information", 'custpage_othertab');
			
			var logostatusField = form.addField('custpage_logostatus', 'select', "Logo Status:", null, 'logo');
			logostatusField.addSelectOption('','');
			logostatusField.addSelectOption(LOGOSTATUS_Attached,'Attached');
			logostatusField.addSelectOption(LOGOSTATUS_Pending,'Pending');
			logostatusField.addSelectOption(LOGOSTATUS_OnFile,'On File');
			logostatusField.addSelectOption(LOGOSTATUS_RetrieveFromWebsite,'Retrieve from website');
			logostatusField.setDefaultValue(logostatus);
		
			var logotypeField = form.addField('custpage_est_typelogo', 'select', "Logo Type:", null, 'logo');
			logotypeField.addSelectOption('','');
			logotypeField.addSelectOption(LOGOTYPE_Pulled,'Pulled');
			logotypeField.addSelectOption(LOGOTYPE_Email,'Email');
			logotypeField.addSelectOption(LOGOTYPE_Created,'Created');
			logotypeField.addSelectOption(LOGOTYPE_Stock,'Stock');
			logotypeField.setDefaultValue(logotype);
		
			var waitinglogoField = form.addField('custpage_est_waitinglogo', 'select', "Are we still waiting on Logo?", null, 'logo');
			waitinglogoField.addSelectOption('','');
			waitinglogoField.addSelectOption(YESNO_Yes,'Yes');
			waitinglogoField.addSelectOption(YESNO_No,'No');
			waitinglogoField.setDefaultValue(waitinglogo);
		
			var logostatusNotification = form.addField('custpage_logostatusnotification', 'inlinehtml', '', null, 'logo').setBreakType('startcol');
			var html = (logostatus==null||logostatus=="") ? "<p style='LINE-HEIGHT: "+lineheight+"px;color:"+fontcolor+"; font-size:"+fontsize+"px;'><b>The Logo Status has not been set.</b></p>" : checkmark; 
			logostatusNotification.setDefaultValue(html);
			
			var logotypeNotification = form.addField('custpage_logotypenotification', 'inlinehtml', '', null, 'logo');
			var html = (logotype==null||logotype=="") ? "<p style='LINE-HEIGHT: "+lineheight+"px;color:"+fontcolor+"; font-size:"+fontsize+"px;'><b>The Logo Type has not been set.</b></p>" : checkmark; 
			logotypeNotification.setDefaultValue(html);
			
			var waitinglogoNotification = form.addField('custpage_waitinglogonotification', 'inlinehtml', '', null, 'logo');
			var html = (waitinglogo==null||waitinglogo=="") ? "<p style='LINE-HEIGHT: "+lineheight+"px;color:"+fontcolor+"; font-size:"+fontsize+"px;'><b>The Logo Wait Status has not been set.</b></p>" : checkmark; 
			waitinglogoNotification.setDefaultValue(html);
			
			//WEBSITE 
			var grp = form.addFieldGroup('website', "Website information", 'custpage_othertab');
			grp.setSingleColumn(true);
			
			var havewebsiteField = form.addField('custpage_est_havewebsite', 'select', "Does the CX have their own website?", null, 'website');
			havewebsiteField.addSelectOption('','');
			havewebsiteField.addSelectOption(YESNO_Yes,'Yes');
			havewebsiteField.addSelectOption(YESNO_No,'No');
			havewebsiteField.setDefaultValue(havewebsite);
			
			var soldwebsiteField = form.addField('custpage_est_soldwebsite', 'select', "Was the CX sold a 411 website?", null, 'website');
			soldwebsiteField.addSelectOption('','');
			soldwebsiteField.addSelectOption(YESNO_Yes,'Yes');
			soldwebsiteField.addSelectOption(YESNO_No,'No');
			soldwebsiteField.setDefaultValue(soldwebsite);
			soldwebsiteField.setDisplayType("inline");
			
			var createwebsiteField = form.addField('custpage_est_createwebsite', 'select', "411 Website to be created?", null, 'website');
			createwebsiteField.addSelectOption('','');
			createwebsiteField.addSelectOption(YESNO_Yes,'Yes');
			createwebsiteField.addSelectOption(YESNO_No,'No');
			createwebsiteField.setDefaultValue(createwebsite);
			if (createwebsite==null||createwebsite==''){
				createwebsiteField.setDisplayType("normal");
			}
			else{	
				createwebsiteField.setDisplayType("inline");
			}
			
			
			if (confirmcreatewebsite==null||confirmcreatewebsite==''){
				confirmcreatewebsite = YESNO_No;
			}
			var confirmcreatewebsiteField = form.addField('custpage_est_confirmwebsitecreation', 'select', "411 Website has been created:", null, 'website');
			confirmcreatewebsiteField.addSelectOption('','');
			confirmcreatewebsiteField.addSelectOption(YESNO_Yes,'Yes');
			confirmcreatewebsiteField.addSelectOption(YESNO_No,'No');
			confirmcreatewebsiteField.setDefaultValue(confirmcreatewebsite);
			confirmcreatewebsiteField.setDisplayType("inline");
			
			var websitecustservrepField = form.addField('custpage_websitecustservrep', 'text', 'Website Specialist', null, 'website');
			if (location!=LOCATION_MONTREAL){
				websitecustservrepField.setDefaultValue(TORONTO_WEBSPECIALIST);
				/*var searchresults = getEmployees(EXTROLE_WebsiteSpecialist, "Estblish, website specialists");
				if (searchresults!=null){
					websitecustservrepField.addSelectOption('', 'Select the website specialist...');
					for ( var i = 0; searchresults != null && i < searchresults.length; i++ ){
						// get result values
						var searchresult = searchresults[i];
						websitecustservrepField.addSelectOption(searchresult.getValue('internalid' ), searchresult.getValue('firstname') + " " + searchresult.getValue('lastname'));
					}			
					websitecustservrepField.setDefaultValue(websitecustservrep);
				}	
				else {
					websitecustservrepField.addSelectOption('', 'System has not been configured with WebSite Specialists.');	
				}
				*/
			}
			else {
			//	websitecustservrepField.setDisplayType('hidden');
			}
			websitecustservrepField.setDisplayType('hidden');
			
			if (confirmcreatewebsite==YESNO_Yes){
				createwebsiteField.setDefaultValue(YESNO_No);
				createwebsiteField.setDisplayType("inline");
				websitecustservrepField.setDisplayType('hidden');
			}
			
			
			/*var havewebsiteNotification = form.addField('custpage_havewebsitenotification', 'inlinehtml', '', null, 'website').setBreakType('startcol');
			var html = (havewebsite==null||havewebsite=="") ? "<p style='LINE-HEIGHT: "+lineheight+"px;color:"+fontcolor+"; font-size:"+fontsize+"px;'><b>'Does the customer have a website?' has not been set.</b></p>" : checkmark; 
			havewebsiteNotification.setDefaultValue(html);

			var soldwebsiteNotification = form.addField('custpage_soldwebsitenotification', 'inlinehtml', '', null, 'website');
			var html = (soldwebsite==null||soldwebsite=="") ? "<p style='LINE-HEIGHT: "+lineheight+"px;color:"+fontcolor+"; font-size:"+fontsize+"px;'><b>'Was the customer sold a website?' has not been set.</b></p>" : checkmark; 
			soldwebsiteNotification.setDefaultValue(html);
	
			var createwebsiteNotification = form.addField('custpage_createwebsitenotification', 'inlinehtml', '', null, 'website');
			var html = (createwebsite==null||createwebsite=="") ? "<p style='LINE-HEIGHT: "+lineheight+"px;color:"+fontcolor+"; font-size:"+fontsize+"px;'><b>Website creation directive has not been set.</b></p>" : checkmark; 
			createwebsiteNotification.setDefaultValue(html);
			
			var confirmcreatewebsiteNotification = form.addField('custpage_confirmcreatewebsitenotification', 'inlinehtml', '', null, 'website');
			var html = (confirmcreatewebsite==null||confirmcreatewebsite=="") ? "<p style='LINE-HEIGHT: "+lineheight+"px;color:"+fontcolor+"; font-size:"+fontsize+"px;'><b>Website creation confirmation has not been set.</b></p>" : checkmark; 
			confirmcreatewebsiteNotification.setDefaultValue(html);
			*/
			/*if (location!=LOCATION_MONTREAL&&createwebsite=='T'){
				var websitecustservrepNotification = form.addField('custpage_websitecustservrepnotification', 'inlinehtml', '', null, 'website');
				var html = (websitecustservrep==null||websitecustservrep=="") ? "<p style='LINE-HEIGHT: "+lineheight+"px;color:"+fontcolor+"; font-size:"+fontsize+"px;'><b>The website specialist has not been assigned.</b></p>" : checkmark; 
				websitecustservrepNotification.setDefaultValue(html);
			}*/
			//OTHER INFO 
			form.addFieldGroup('other', "Additional Information", 'custpage_othertab');
			
			var descriptionField = form.addField('custpage_est_description', 'select', "Do we have business description?", null, 'other');
			descriptionField.addSelectOption('','');
			descriptionField.addSelectOption(YESBASIC_Yes,'Yes');
			descriptionField.addSelectOption(YESBASIC_Basic,'Basic');
			descriptionField.setDefaultValue(est_description);
			
			var synonymsField = form.addField('custpage_est_synonyms', 'select', "Are there business synonyms?", null, 'other');
			synonymsField.addSelectOption('','');
			synonymsField.addSelectOption(YESNO_Yes,'Yes');
			synonymsField.addSelectOption(YESNO_No,'No');
			synonymsField.setDefaultValue(est_synonyms);
			
			var hoursField = form.addField('custpage_est_hours', 'select', "Do we have Hrs of Operation?", null, 'other');
			hoursField.addSelectOption('','');
			hoursField.addSelectOption(YESNO_Yes,'Yes');
			hoursField.addSelectOption(YESNO_No,'No');
			hoursField.setDefaultValue(est_hours);

			var extrainfoField = form.addField('custpage_est_extrainfo', 'select', "Do we have all extra profile information?", null, 'other');
			extrainfoField.addSelectOption('','');
			extrainfoField.addSelectOption(YESNO_Yes,'Yes');
			extrainfoField.addSelectOption(YESNO_No,'No');
			extrainfoField.setDefaultValue(est_extrainfo);
			
			var descriptionNotification = form.addField('custpage_descriptionnotification', 'inlinehtml', '', null, 'other').setBreakType('startcol');
			var html = (est_description==null||est_description=="") ? "<p style='LINE-HEIGHT: "+lineheight+"px;color:"+fontcolor+"; font-size:"+fontsize+"px;'><b>Business description status cannot be left blank.</b></p>" : checkmark; 
			descriptionNotification.setDefaultValue(html);
	
			var synonymNotification = form.addField('custpage_synonymnotification', 'inlinehtml', '', null, 'other');
			var html = (est_synonyms==null||est_synonyms=="") ? "<p style='LINE-HEIGHT: "+lineheight+"px;color:"+fontcolor+"; font-size:"+fontsize+"px;'><b>Business synonym status cannot be left blank.</b></p>" : checkmark; 
			synonymNotification.setDefaultValue(html);
	
			var hoursNotification = form.addField('custpage_hoursnotification', 'inlinehtml', '',null, 'other');
			var html = (est_hours==null||est_hours=="") ? "<p style='LINE-HEIGHT: "+lineheight+"px;color:"+fontcolor+"; font-size:"+fontsize+"px;'><b>Hours of operation status cannot be left blank.</b></p>" : checkmark; 
			hoursNotification.setDefaultValue(html);
	
			var extrainfoNotification = form.addField('custpage_extrainfonotification', 'inlinehtml', '', null, 'other');
			var html = (est_extrainfo==null||est_extrainfo=="") ? "<p style='LINE-HEIGHT: "+lineheight+"px;color:"+fontcolor+"; font-size:"+fontsize+"px;'><b>Extra profile information status cannot be left blank.</b></p>" : checkmark; 
			extrainfoNotification.setDefaultValue(html);
	
			
			if (status==ESTABLISHMENTSTATUS_Verified){ 	
				//form.addButton('custpage_custombutton','Exit', 'onclick=window.close()');
				form.addButton('custpage_custombutton','Exit', 'parent.location=\''+NETSUITE_HOME+'\'');
			}
			else{
				form.addSubmitButton('Submit');
				form.addButton('custpage_custombutton','Cancel, Go To NetSuite HOME', 'parent.location=\''+NETSUITE_HOME+'\'');
				form.addButton('custpage_custombutton1','Cancel : Go Back To Customer', 'parent.location=\''+PATHTOCUSTOMER+customerid+'\'');
							}	
			response.writePage( form );
		}
		catch (e) {
			nlapiLogExecution("Error", "Establish Suitelet" + customerid, e);
		}
	}

	else {
		var cname = '';			
		try {
			
			var approveFulfill = request.getParameter('custpage_approve');
			var verify  = request.getParameter('custpage_sendforverification');
			var mtl_completeOrder = request.getParameter('custpage_mtl_completeorder');
			var assigneeID = request.getParameter('custpage_establishmentrep');
			var customerid = request.getParameter('custpage_companyid');
			var orderid = request.getParameter('custpage_soid');
			var user = nlapiGetUser();			
			
			var custObj = nlapiLoadRecord('customer', customerid);
			cname= custObj.getFieldValue('companyname');
			/*var evoclient = false;
			if (custObj.getFieldValue('parent')==EVO_MAIN_COMPANY_ID){
				evoclient = true;
			}
			 */
			fieldupdate(custObj, 'custentity_a9r_recordupdate', 'custpage_a9r_recordupdate' );
			//fieldupdate(custObj, 'custentity_establishmentrep', 'custpage_establishmentrep'); 
			
//nlapiLogExecution("Debug", "Est rep", assigneeID);
			custObj.setFieldValue('custentity_establishmentrep', assigneeID);
			
			fieldupdate(custObj, 'custentity_establishmentstatus','custpage_establishmentstatus'); 
			
			//Business Contact Information
			fieldupdate(custObj, 'custentity_email_business', 'custpage_email_business'); 
			fieldupdate(custObj, 'email', 'custpage_email'); 
			fieldupdate(custObj, 'custentity_comm_lastname', 'custpage_comm_lastname'); 
			fieldupdate(custObj, 'custentity_comm_firstname', 'custpage_comm_firstname'); 
			fieldupdate(custObj, 'custentity_comm_languagepreference','custpage_commlanguage'); 
			switch (request.getParameter('custpage_commlanguage')){
			case COMMLANGUAGE_ENGLISH : 
				custObj.setFieldValue('language', LANGUAGE_ENGLISH);
				break;
			case COMMLANGUAGE_FRENCH : 
				custObj.setFieldValue('language', LANGUAGE_FRENCH);
				break;	
			}
			//fieldupdate(custObj, 'custentity_invoiceemailcontrol', 'custpage_billtoemailcontrol'); 
			//fieldupdate(custObj, 'custentity_email_billto', 'custpage_email_billto'); 
			
			//Listing Display Control
			fieldupdate(custObj, 'custentity_displayaddress', 'custpage_displayaddress'); 
			fieldupdate(custObj, 'custentity_displayemail', 'custpage_displayemail'); 
			fieldupdate(custObj, 'custentity_hide_on_site', 'custpage_hideonsite'); 
			
			//Sale and Account Information			
			fieldupdate(custObj, 'salesrep', 'custpage_salesrep'); 
			fieldupdate(custObj, 'custentity_portfoliovalue', 'custpage_portfoliovalue'); 
		
			fieldupdate(custObj, 'custentity_paymenttype', 'custpage_paymenttype'); 
			fieldupdate(custObj, 'custentity_contractlength', 'custpage_contractlength'); 
			
			
			fieldupdate(custObj, 'custentity_cxaccounttype', 'custpage_cxaccounttype'); 

			
			//OAC Rep & Signature
			var oacrep = request.getParameter('custpage_custservrep');
			if (custObj.getFieldValue('custentitycustservrep')!=oacrep&&oacrep!=null&&oacrep!=''){
				var empInfo = new Array(); 
				try {
					empInfo = getEmployeeInfo(oacrep, 'Estblishment Post, OAC sig');
					if (empInfo[0]!=''&&empInfo[0]!=null){
						custObj.setFieldValue('custentity_comm_signature_officephone', empInfo[3]);
						custObj.setFieldValue('custentity_comm_signature_emailaddress', empInfo[0]);
						custObj.setFieldValue('custentity_comm_signature_name', empInfo[1] + ' '+ empInfo[2]);
					}
				}
				catch(e) {
					nlapiLogExecution ('ERROR', 'Unable to acquire employee details ', oacrep); 	
				}
				custObj.setFieldValue('custentitycustservrep', oacrep);
			}
			
			//Logo Status
			fieldupdate(custObj, 'custentity_logostatus', 'custpage_logostatus' );
			fieldupdate(custObj, 'custentity_est_typelogo', 'custpage_est_typelogo' );
			fieldupdate(custObj, 'custentity_est_waitinglogo', 'custpage_est_waitinglogo' );
			fieldupdate(custObj, 'custentity_est_havewebsite', 'custpage_est_havewebsite' );
		
			//Website Status
			fieldupdate(custObj, 'custentity_est_soldwebsite', 'custpage_est_soldwebsite' );
			fieldupdate(custObj, 'custentity_est_createwebsite', 'custpage_est_createwebsite' );
			fieldupdate(custObj, 'custentity_est_confirmwebsitecreation', 'custpage_est_confirmwebsitecreation' );
			fieldupdate(custObj, 'custentity_websitecustservrep', 'custpage_websitecustservrep');
			
			//Additional Information
			fieldupdate(custObj, 'custentity_est_synonyms', 'custpage_est_synonyms' );
			fieldupdate(custObj, 'custentity_est_description', 'custpage_est_description' );
			fieldupdate(custObj, 'custentity_est_hours', 'custpage_est_hours' );
			fieldupdate(custObj, 'custentity_est_extrainfo', 'custpage_est_extrainfo' );
			nlapiSubmitRecord(custObj);	
			
			//NOTE Trigger (Assignment Note)
			var trigger = request.getParameter('custpage_notetrigger' );
			if (trigger == 'true'){
				var empInfo = getEmployeeInfo(assigneeID, "Establish, post, assign note");
				var details = cname + ' assigned to ' + empInfo[1] + ' '+empInfo[2] + ' for establishment.';	
				addnote("ASSIGNED TO ESTABLISHMENT REP", details, user, customerid);					
			}
		
			//update data on sales order
			var so = nlapiLoadRecord('salesorder', orderid);
			fieldupdate(so, 'custbody_paymenttype',  'custpage_paymenttype' );
			fieldupdate(so, 'custbody_customer_logo_status', 'custpage_logostatus'  );
			fieldupdate(so, 'custbody_contractterm', 'custpage_contractlength' );
			var compareLanguage = '5';
			switch  (request.getParameter('custpage_commlanguage')){
			case COMMLANGUAGE_ENGLISH :
				compareLanguage = '5';
				break;
			case COMMLANGUAGE_FRENCH :
				compareLanguage = '7';
				break;
			}
			if ( so.getFieldValue('custbody_customer_preferred_language')!=compareLanguage ){
				so.setFieldValue('custbody_customer_preferred_language',compareLanguage );
			}
			nlapiSubmitRecord(so);


			//APPROVE & FULFILL
			if (approveFulfill=='T'){
				try {
					var so = nlapiLoadRecord('salesorder', orderid);
					so.setFieldValue('orderstatus', "B");
					so.setFieldValue('custbody_provisioned_by', user);
					so.setFieldValue('custbody_provisioned_date', nlapiDateToString(new Date()));
					so.setFieldValue('custbody5', user );
					so.setFieldValue('custbody_verfied_date',nlapiDateToString(new Date()));
					nlapiSubmitRecord(so);
					var fulfillRecord = nlapiTransformRecord('salesorder', orderid,'itemfulfillment');
					nlapiSubmitRecord( fulfillRecord );
					
					var custObj = nlapiLoadRecord('customer', customerid);
					custObj.setFieldValue('custentity5', user);
					custObj.setFieldValue('custentity_est_verifieddate', nlapiDateToString(new Date()));
					custObj.setFieldValue('custentity_establishmentstatus', ESTABLISHMENTSTATUS_InProgress);
					nlapiSubmitRecord(custObj);	

					addnote("ESTABLISHMENT", "Listing posted to 411.", user, customerid);	
				}
				catch (e) {
					nlapiLogExecution("System", "Approve Fulfill Problem", e.getDetails()); 
				}	
			}

			//SEND FOR VERIFICATION
			if (verify=='T'){
				try {
					var custObj = nlapiLoadRecord('customer', customerid);
					custObj.setFieldValue( 'custentity_establishmentstatus', ESTABLISHMENTSTATUS_Established);
					nlapiSubmitRecord(custObj);	
				    addnote("ESTABLISHMENT", "Listing established. Awaiting verification...", user, customerid);	
					//alert("SENT FOR VERIFICATION");
				}
				catch (e) {
					//alert("Error: " + e.getDetails());	
					nlapiLogExecution("System", "Aprrove Fulfill Problem", e); 
				}				
			}
			
			//MTL - COMPLETE ORDER
			if (mtl_completeOrder=='T'){
				var createWebsite = 'F';
				var websitespecialist = '';
				var custObj = nlapiLoadRecord('customer', customerid);
				custObj.setFieldValue('custentity_establishmentstatus', ESTABLISHMENTSTATUS_Verified);
				
				createWebsite = request.getParameter('custpage_est_createwebsite');
				websitespecialist = request.getParameter('custpage_websitecustservrep');
				
				//setup welcome campaign trigger
				var campaign = custObj.getFieldValue('custentity_comm_campaign');
				if (campaign==null||campaign=='') { 
					custObj.setFieldValue('custentity_welcomecampaigntrigger', 'T');
				}
				
				//setup task for website specialist if website needs to be invoked.
				if (createWebsite==YESNO_Yes&&websitespecialist!=null&&websitespecialist!=''){
					var today = new Date();
					var title = "Setup Website"; 
					var assigned =  websitespecialist;
					var startdate =  nlapiDateToString(today);
					var timedevent = 'T'; 
					var starttime = '9:00 am';
					var endtime = '11:00 am';
					var duedate = nlapiDateToString(today); 
					var remindertype = 'POPUP';
					var reminderminutes = '5'; 
					var priority = 'HIGH';
					var status = 'NOTSTART';
					var message = "Please setup and configure a website for this client" ;
					var owner = nlapiGetUser();
					addtask(title, assigned, startdate, timedevent, starttime, endtime, duedate, remindertype, reminderminutes, priority, status, message, customerid, '', owner, 'T');
				}
				nlapiSubmitRecord(custObj, true);
				
			}
			
			var params = new Array();
			params['custid']=customerid;
			params['orderid']=orderid;
			if (approveFulfill=='T'){
				nlapiSetRedirectURL('SUITELET', 'customscript_establish', 'customdeploy_establish', null, params);
			}
			else {
				
				if (verify=='T'){
					nlapiSetRedirectURL('RECORD', 'customer', customerid, false,  null);
				}
				else {
					nlapiSetRedirectURL('RECORD', 'customer', customerid, false,  null);
				}
			}
		}
		catch (e){
			nlapiLogExecution("System", 'Establish POST Routine.', e);
		}
			
	}	
}


function verifySalesOrder(request, response){

	nlapiLogExecution ('Debug', 'Verify Established Sales Orders', "start"); 	
	initialize();
	
	if ( request.getMethod() == 'GET' )	{
		if (request.getParameter('custid')!=null) {
			var customerid = request.getParameter('custid');
			var orderid = request.getParameter('orderid');
			var custObj = nlapiLoadRecord('customer', customerid);
			var orderObj = nlapiLoadRecord('salesorder', orderid);
			var companyname = custObj.getFieldValue('companyname');
			var pl = custObj.getFieldValue('custentity411custid');
			var customerinfo = 'Customer: ' +companyname+ ' ' +pl;
			nlapiLogExecution ('Debug', 'Verify Established Sales Order', customerinfo); 	
			var orderstatus = orderObj.getFieldValue('status');
			var ordertranid = orderObj.getFieldValue('tranid');
			var orderinfo = 'Sales Order: ' +ordertranid+ ' ' +orderstatus;
			//var assignee = custObj.getFieldValue('custentity_establishmentrep');
			
			var oacid = custObj.getFieldValue('custentitycustservrep');
			var form = nlapiCreateForm('ESTABLISHMENT - Verify Established Sales Order', false);
   	   		var comments = orderObj.getFieldValue("custbody_comments");
			var businessemail = custObj.getFieldValue('custentity_email_business');
			var commemail = custObj.getFieldValue('email');
			var createwebsite = custObj.getFieldValue('custentity_est_createwebsite');
			var confirmwebsite = custObj.getFieldValue('custentity_est_confirmwebsitecreation');
			var websitecustservrep = custObj.getFieldValue('custentity_websitecustservrep');
			var parent = custObj.getFieldValue('parent');
			var donotsend = custObj.getFieldValue('custentity_donotsendcomm');
			var campaign = custObj.getFieldValue('custentity_comm_campaign');
			var custmessage = custObj.getFieldValue('custentity_customeralert');
			
			var wcDate = custObj.getFieldValue('custentity_wc_date');
			if (wcDate == null) {
				wcDate = '';
			}
			var wcTime = custObj.getFieldValue('custentity_wc_time');
			if (wcTime == null) {
				wcTime = '';
			}
			
			var parentField = form.addField('custpage_parent','text', '');
			parentField.setDefaultValue(parent);
			parentField.setDisplayType('hidden');
			var evoclient = false;
			if (custObj.getFieldValue('parent')==EVO_MAIN_COMPANY_ID){
				evoclient = true;
			}
			var createWebsiteField= form.addField('custpage_createwebsite','text', '');
			createWebsiteField.setDefaultValue(createwebsite);
			createWebsiteField.setDisplayType('hidden');
			
			var confirmWebsiteField= form.addField('custpage_confirmwebsite','text', '');
			confirmWebsiteField.setDefaultValue(confirmwebsite);
			confirmWebsiteField.setDisplayType('hidden');
			
			var websiteSpecialistField= form.addField('custpage_websitespecialist','text', '');
			websiteSpecialistField.setDefaultValue(websitecustservrep);
			websiteSpecialistField.setDisplayType('hidden');
		
			var field0 = form.addField('custpage_companyid','text', 'ID');
			field0.setDefaultValue(customerid);
			field0.setDisplayType('hidden');
		
			var soidField= form.addField('custpage_soid','text', '');
			soidField.setDefaultValue(orderid);
			soidField.setDisplayType('hidden');
		
			var searchresults = getEmployees(EXTROLE_OAC, 'Verify, oac reps ');
			if (searchresults==null){
				nlapiLogExecution ('System', 'No records found', ''); 
				return;
			}
	//		nlapiLogExecution ('Debug', 'Verify Established Sales Orders: Search Results', searchresults.length); 	
			
			
			var grp = form.addFieldGroup('controlbar', customerinfo);
			grp.setSingleColumn(true);
			if (evoclient){
				form.addField('custpage_process_stmt','label', '<b><font size = "2" color="green">EVO Client - No Welcome Campaign</font></b>', null, 'controlbar');
			}
			else{
				if (donotsend=='T'){
					form.addField('custpage_process_stmt','label', '<b><font size = "2" color="green">Standard Client - No Welcome Campaign as DO NOT SEND is set.</font></b>', null, 'controlbar');
				}
				else {
					if (campaign!=null&&campaign!=''){
						form.addField('custpage_process_stmt','label', '<b><font size = "2" color="green">Standard Client - Client is already in the Welcome Campaign</font></b>', null, 'controlbar');
						form.addField('custpage_restart','checkbox', 'Restart the standard Welcome Communications Process', null,'controlbar');
					}
					else {
						form.addField('custpage_process_stmt','label', '<b><font size = "2" color="green">Standard Client - Standard Welcome Campaign</font></b>', null, 'controlbar');		
					}	
				}
			}
		
				
			var adcenterButton = '<input type=button style="width: 100px;" value="Acct Settings" onClick="JavaScript:var MiniWinAR=window.open(\'' + ac_url + customerid + '\', \'AC\', \'width=1000,height=700,location=no,resizable=yes,scrollbars=yes\'); MiniWinAR.focus();">';
			var buttons = form.addField('custpage_buttons', 'inlinehtml', '', null, 'controlbar').setBreakType('startrow');
//			buttons.setDefaultValue('<br>' + look411Button+adcenterButton);
			buttons.setDefaultValue('<br>' + adcenterButton);
		
			if ((businessemail==null||businessemail=='')&&(commemail==null||commemail=='')){
				form.addField('custpage_noemailcomment','label', '<b><font size = "2" color="red">No Business or Communications Email Address on file<br>System will not send any communications.</font></b>', null, 'controlbar').setBreakType('startrow');
			}
		
	/*		var sendAdisreadyfield = form.addField('custpage_sendadisready','checkbox', 'On Submit Send Ad Is Ready Email: ', null, 'controlbar').setBreakType('startrow');
			if (evoclient||((businessemail==null||businessemail=='')&&(commemail==null||commemail==''))){
				sendAdisreadyfield.setDisplayType('hidden');
				sendAdisreadyfield.setDefaultValue('F');				
			}*/
		
			grp = form.addFieldGroup('top', orderinfo);
			//grp.setSingleColumn(true);
			var commentField = form.addField("custpage_comments", 'inlinehtml', '', null, 'top');
			if (comments==null){
				comments='';
			}
			commentField.setDefaultValue('<B>Sales Comments: ' + comments + '</B>');
			
			var alertField = form.addField("custpage_alert", 'inlinehtml', '', null, 'top').setLayoutType('outsidebelow','startrow');
			if (custmessage==null){
				custmessage='';
			}
			if (wcDate != '') {
				custmessage = custmessage + '<BR><BR><font color="red">Welcome Call Scheduled: ' + wcDate + ' ' + wcTime + '</font>';
			}
			alertField.setDefaultValue('<B>Customer Alert: ' + custmessage + '</B>');
			
			var oacrepLabel='Account Assigned To:';
			if (oacid==null||oacid==''){
				oacrepLabel='Assign Account To:';
			}
			var field1 = form.addField('custpage_assignoac', 'select', oacrepLabel, null, "top").setLayoutType('outsidebelow','startrow');
			field1.addSelectOption('', 'Select a oac rep to assign to this account...');
			for ( var i = 0; searchresults != null && i < searchresults.length; i++ ){
				// get result values
				var searchresult = searchresults[ i ];
				//nlapiLogExecution ('Debug', searchresult.getValue('firstname') + " " + searchresult.getValue('lastname'), searchresult.getValue('department')); 	
				field1.addSelectOption(searchresult.getValue('internalid' ), searchresult.getValue('firstname') + " " + searchresult.getValue('lastname'));
			}			
			field1.setMandatory(true);
			if (oacid!=null){
				field1.setDefaultValue(oacid);
			}
			else{	
				field1.setDefaultValue('');
			}	
					
			form.addFieldGroup('listing', a9r_server + business411_url + pl);
			var viewField = form.addField('custpage_411listing', 'inlinehtml', null, 'listing');
			viewField.setDefaultValue('<iframe src='+'"' + a9r_server + business411_url + pl +'" width="1024" height="768" scrolling="auto" frameborder="1"></IFRAME>');
			
			form.addSubmitButton('Complete Verification');
			//form.addButton('custpage_custombutton','Cancel', 'onclick=window.close()');
			form.addButton('custpage_custombutton','Cancel, Go To NetSuite HOME', 'parent.location=\''+NETSUITE_HOME+'\'');
			form.addButton('custpage_custombutton1','Cancel : Go Back To Customer', 'parent.location=\''+PATHTOCUSTOMER+customerid+'\'');
			
			response.writePage( form );
		}
	}
	else {
		initialize();
		var oacrep='';
		var cname='';
		var custObj = '';
		var customerid = '';
		var websitespecialist = '';
		try { 
			
			//https://system.netsuite.com/app/center/card.nl?sc=-29
			//sendadisready = request.getParameter('custpage_sendadisready');
			customerid = request.getParameter('custpage_companyid');
			createWebsite = request.getParameter('custpage_createwebsite');
			confirmWebsite = request.getParameter('custpage_confirmwebsite');
			websitespecialist = request.getParameter('custpage_websitespecialist');
			oacrep = request.getParameter('custpage_assignoac');
			restart = request.getParameter('custpage_restart');
			orderid = request.getParameter('custpage_soid');
				
			custObj = nlapiLoadRecord('customer', customerid);
			cname= custObj.getFieldValue('entityid');
			
			custObj.setFieldValue('custentity_establishmentstatus', ESTABLISHMENTSTATUS_Verified);
			custObj.setFieldValue('custentitycustservrep', oacrep);
			custObj.setFieldValue('custentity_welcomecallstatus',WELCOMECALLSTATUS_READY);
			custObj.setFieldValue('custentity_welcomecallerassigned', oacrep);
			custObj.setFieldValue('custentity_welcomecallflag', 'T');
			
			//var estRep = custObj.getFieldValue('custentity_establishmentrep');
			var billingdate = custObj.getFieldValue('custentity_monthlybillingdate');
			if (billingdate==null||billingdate==0||billingdate==1){
				var today = new Date();
				var day = today.getDate();
				if (day>1&&day<=31){
					custObj.setFieldValue('custentity_monthlybillingdate', day);
				}
				
			}
			
			
		}
		catch (e){
			nlapiLogExecution ('ERROR', 'Unable to get values: ' , cname + " "+ e.getDetails()); 	
		}
		
		//setup welcome campaign trigger
		
		var donotsend = custObj.getFieldValue('custentity_donotsendcomm');
		var campaign = custObj.getFieldValue('custentity_comm_campaign');
		if (donotsend!='T'){
			//DO NOT SEND is not set
			if (campaign==null||campaign==''){
				//client in not in a campgin
				custObj.setFieldValue('custentity_welcomecampaigntrigger', 'T');
			}
			else {
				//client is already in a campaogn
				if (restart=='T'){
					//restart the campaign
					custObj.setFieldValue('custentity_comm_campaign', '');
					custObj.setFieldValue('custentity_welcomecampaigntrigger', 'T');			
				}
			}
		}
		
		//setup task for website specialist if website needs to be invoked.
		if (websitespecialist!=null&&websitespecialist!=''&& (createWebsite==YESNO_Yes||confirmWebsite==YESNO_Yes)){
			var today = new Date();
			var title = "Setup Website"; 
			var assigned =  websitespecialist;
			var startdate =  nlapiDateToString(today);
			var timedevent = 'T'; 
			var starttime = '9:00 am';
			var endtime = '11:00 am';
			var duedate = nlapiDateToString(today); 
			var remindertype = 'POPUP';
			var reminderminutes = '5'; 
			var priority = 'HIGH';
			var status = 'NOTSTART';
			var message = "Please setup or review the website for this client";
			var owner = nlapiGetUser();
			addtask(title, assigned, startdate, timedevent, starttime, endtime, duedate, remindertype, reminderminutes, priority, status, message, customerid, '', owner, 'T');
		}
		
		var empInfo = new Array(); 
		try {
			empInfo = getEmployeeInfo(oacrep, "Verify, oac list");
		}
		catch(e) {
			nlapiLogExecution ('ERROR', 'Unable to acquire employee details: '+ oacrep, cname); 	
		}
		
		try {
			if (empInfo[0]!=''&&empInfo[0]!=null){
				custObj.setFieldValue('custentity_comm_signature_officephone', empInfo[3]);
				custObj.setFieldValue('custentity_comm_signature_emailaddress', empInfo[0]);
				custObj.setFieldValue('custentity_comm_signature_name', empInfo[1] + ' '+ empInfo[2]);
				custId = nlapiSubmitRecord(custObj, true);
				var details = cname + ' verified and assigned to ' + empInfo[1] + ' '+empInfo[2] + ' for acct mgmt.';
				addnote("LISTING VERIFIED" , details, nlapiGetUser(), customerid);	
				
				
				var establishURL = NETSUITE_URL + 'app/common/entity/custjob.nl?id=' + customerid + '&whence=';
				nlapiSendEmail(nlapiGetUser(), empInfo[0], 'Account Assigned', 'You have been assigned ' + cname + ' for acct mgmt. \n\nClick <a href="'+establishURL+'" target="_self"><font size="2" face="arial">here</font></a>');
				logMessage(oacrep, nlapiGetUser(), empInfo[0], 'Manage Account', details);
			}
			else{
				nlapiLogExecution ('ERROR', 'Unable to assign cx to oac rep ', cname + " Unable to acquire employee info");
			}
		}
		catch (e){
			nlapiLogExecution ('ERROR', 'VERIFICATION POSTING ROUTINE ', cname + " "+ e.getDetails()); 	
		}
		
		/*try {
			rec = nlapiLoadRecord('salesorder',orderid);
			rec.setFieldValue('custbody5', nlapiGetUser() );
			//rec.setFieldValue('custbody_verfied_date',rec.getFieldValue('trandate'));
			rec.setFieldValue('custbody_verfied_date',nlapiDateToString(new Date()));
			
			
			nlapiSubmitRecord(rec);
		}
		catch (e){
			nlapiLogExecution ('ERROR', 'VERIFICATION POSTING ROUTINE ', cname + " "+ e.getDetails()); 	
		}
		*/
		nlapiSetRedirectURL('RECORD', 'customer', customerid, false,  null);
	}	
}


function requestToCancel(request, response){
	initialize();
	var form = '';
	if ( request.getMethod() == 'GET' )	{
		if (request.getParameter('custid')!=null) {

			var customerid = request.getParameter('custid');
			var custObj = nlapiLoadRecord('customer', customerid);
			var published = custObj.getFieldValue('custentity_website_publishstatus');
			var revoked = custObj.getFieldValue('custentity_websiterevoked');
			var companyname = custObj.getFieldValue('companyname');
			var pl = custObj.getFieldValue('custentity411custid');
			var customerinfo = 'Customer: ' +companyname+ ' ' +pl;
			var closedate = custObj.getFieldValue('custentity_closedate');
			var portfoliovalue = custObj.getFieldValue('custentity_portfoliovalue');
		
			var cancellisting = custObj.getFieldValue('custentity_retcancellistings');
			var cancelwebsite = custObj.getFieldValue('custentity_retcancelwebsite');
			var rstatus = custObj.getFieldValue('custentity_retentionstatus');
			var retentionrep = custObj.getFieldValue('custentity_retentioncustservrep');
			var notes = custObj.getFieldValue('custentity_retentionnotes');
			var a10 = custObj.getFieldValue('custentity_ret_10accepted');
			var d10 = custObj.getFieldValue('custentity_ret_10declined');
			var offer = '';
			var followupdate = custObj.getFieldValue('custentity_downgradefollowupdate');
			var disposition = custObj.getFieldValue('custentity_retentiondisp');
			var cancelinstructs = custObj.getFieldValue('custentity_cancelinstructions');
			var tendaysremorse = custObj.getFieldValue('custentity_ret10daysremorse');
			var finalstatus = custObj.getFieldValue('custentity_retcancelrequestresolution');
			var newValue = custObj.getFieldValue('custentity_ret_wc_new_value');
			var monthForFree = custObj.getFieldValue('custentity_ret_wc_month_free');
			var stage = "REQUEST";
			//var sendto3rdparty = custObj.getFieldValue('custentity_thirdpartysend');
			//var sentto3rdparty = custObj.getFieldValue('custentity_thirdpartysent');
			var evoclient = false;
			if (custObj.getFieldValue('parent')==EVO_MAIN_COMPANY_ID){
				evoclient = true;
			}	
			
			switch (rstatus) {
			case ''	: 	
				stage  ="REQUEST";
				break;
			case null :	
				stage = "REQUEST";
				break;
			case RETENTIONSTATUS_RequestToCancel :
				stage = "REQUEST";
				break;
			case RETENTIONSTATUS_SentToRetention :	
				stage = "REQUEST";
				break;
			case RETENTIONSTATUS_InQueue :	
				if (finalstatus== RETENTIONFINALSTATUS_Cancelled){
					stage = "CANCEL";
				}
				else {
					stage = "RETAINCHANGE";
				}
				break;
			case RETENTIONSTATUS_CompletedByAccounting 	: 	
				if (finalstatus== RETENTIONFINALSTATUS_Saved){
					stage = "REQUEST";
					custObj.setFieldValue('custentity_downgradecomplete', '');
					custObj.setFieldValue('custentity_downgradedate', '');
					custObj.setFieldValue('custentity_downgradefollowupdate', '');
					custObj.setFieldValue("custentity_retentiondisp", '');
					custObj.setFieldValue("custentity_retentiondispdate", '');
					custObj.setFieldValue('custentity_accountingcancelque', '' );
					custObj.setFieldValue('custentity_retcancelrequestresolution','');
					custObj.setFieldValue('custentity_cancelcustservrep', '' );
					custObj.setFieldValue('custentity_cancelinstructions', '' );
					custObj.setFieldValue('custentity_churnclass', '' );
					custObj.setFieldValue('custentity_retcancelall', '' );
					custObj.setFieldValue('custentity_retcancellistings', '' );
					custObj.setFieldValue('custentity_retcancelwebsite', '' );
					custObj.setFieldValue('custentity_retentionnotes', '' );
					custObj.setFieldValue('custentity_ret10daysremorse', '' );
					custObj.setFieldValue('custentity_retentioncustservrep', '' );
					custObj.setFieldValue('custentity_requesttocanceldate', '' );
					custObj.setFieldValue('custentity_retentionstartdate', '' );
					custObj.setFieldValue('custentity_sendtoretention', '' );
					custObj.setFieldValue('custentity_retentionstatus', '' );
					custObj.setFieldValue('custentity_retentionaccountant', '' );
					cancellisting = '';
					cancelwebsite = '';
					rstatus = '';
					retentionrep = '';
					notes = '';
					a10 = '';
					d10 = '';
					offer = '';
					followupdate = '';
					disposition = '';
					cancelinstructs = '';
					tendaysremorse = '';
					finalstatus = '';
					nlapiSubmitRecord(custObj);
				}
				else {
					stage = "REINSTATE";
				}
				break;
			}
			
			
					
			
			switch (stage){
			case 'REQUEST' : 
				form = nlapiCreateForm('Request To Cancel', false);
				break;
			case 'CANCEL' : 
				form = nlapiCreateForm('Customer Cancellation', false);
				break;
			case 'RETAINCHANGE' : 
				form = nlapiCreateForm('Retain Customer with Changes', false);
				break;
			case 'REINSTATE' : 
				form = nlapiCreateForm('Reinstate Customer', false);
				break;
			}
			
			form.setScript('customscript_requestforcancelevents');
			
			
			var stageReference = form.addField('custpage_stage','text', '');
			stageReference.setDisplayType('hidden');
			stageReference.setDefaultValue(stage);
			
			var hiddenPL= form.addField('custpage_pl','text', '');
			hiddenPL.setDisplayType('hidden');
			hiddenPL.setDefaultValue(pl);
				
			if (a10=='T'){
	        	offer = 'accept10';
	        }
	        else{
	        	if (d10=='T'){
		       		offer = 'decline10';
		        }
			}
	        
			
			var field0 = form.addField('custpage_companyid','text', 'ID');
			field0.setDefaultValue(customerid);
			field0.setDisplayType('hidden');

			form.addFieldGroup('controlbar', customerinfo);
			
			var closedateField = form.addField('custpage_closedate','date', 'Customer Since', null, 'controlbar');
			closedateField.setDefaultValue(closedate);
			closedateField.setDisplayType('inline');
			
			var portfolioField = form.addField('custpage_portfoliovalue','currency', 'Portfolio Value',null, 'controlbar');
			portfolioField.setDefaultValue(portfoliovalue);
			portfolioField.setDisplayType('inline');
			
			form.addFieldGroup('services', "Services");

			
			if (stage=='REQUEST'){ 
				if(published==WEBSITEPUBSTATUS_Published&&revoked!='T'){
					//has a website
					form.addField('custpage_cancelrequest', 'radio', 'All Services', 'all', 'services');
					form.addField('custpage_cancelrequest', 'radio', "Cancel Website Only", 'web',   'services');
					if (rstatus==null||rstatus==''){
						form.getField('custpage_cancelrequest').setDefaultValue( 'all' );
					}
					else{
						if (cancellisting=='T'&&cancelwebsite=='T'){
							form.getField('custpage_cancelrequest').setDefaultValue( 'all' );
						}
						else{
							if (cancelwebsite=='T'){
								form.getField('custpage_cancelrequest').setDefaultValue( 'web' );
							}
							else{
								form.getField('custpage_cancelrequest').setDefaultValue( 'all' );
							}
						}
					}
				}
				else {
					form.addField('custpage_cancelrequest', 'radio', 'Cancel Listing', 'listing',  'services');
					form.getField('custpage_cancelrequest').setDefaultValue( 'listing' );
				} 
			}
			
			
			form.addFieldGroup('offers', "Retention Offer");
	
			var offersField = form.addField('custpage_offers', 'radio', '$10 Accepted', 'accept10', 'offers').setLayoutType('normal', 'startcol');
			form.addField('custpage_offers', 'radio', '$10 Declined', 'decline10', 'offers');
			offersField.setDefaultValue(offer);
	
			form.addFieldGroup('outcome', "Resolution");
			
			switch (rstatus){
				case '' :
				case null :	
					var actionField = form.addField('custpage_sendtoqueue', 'radio', 'Level 1 Follow Up', 'followup', 'outcome');
						form.addField('custpage_sendtoqueue', 'radio', '10 Days Remorse', 'remorse', 'outcome');
						form.addField('custpage_sendtoqueue', 'radio', 'Send To Retention', 'sendtoretention', 'outcome');
						form.addField('custpage_sendtoqueue', 'radio', 'Cancel', 'cancel', 'outcome');
						form.addField('custpage_sendtoqueue', 'radio', 'Save', 'retain', 'outcome');
						form.addField('custpage_sendtoqueue', 'radio', 'Retain with changes', 'retainchange', 'outcome');
					actionField.setDefaultValue('sendtoretention');		
					actionField.setMandatory(true);		
					break;
				case RETENTIONSTATUS_RequestToCancel :	
					if (tendaysremorse=='T'){				
						var actionField = form.addField('custpage_sendtoqueue', 'radio', 'Cancel', 'cancel', 'outcome');
						actionField.setMandatory(true);
						form.addField('custpage_sendtoqueue', 'radio', 'Send To Retention', 'sendtoretention', 'outcome');
					}
					else{
						var actionField = form.addField('custpage_sendtoqueue', 'radio', 'Level 1 Follow Up', 'followup', 'outcome');
						form.addField('custpage_sendtoqueue', 'radio', '10 Days Remorse', 'remorse', 'outcome');
						form.addField('custpage_sendtoqueue', 'radio', 'Send To Retention', 'sendtoretention', 'outcome');
						form.addField('custpage_sendtoqueue', 'radio', 'Cancel', 'cancel', 'outcome');
						form.addField('custpage_sendtoqueue', 'radio', 'Save', 'retain', 'outcome');
						form.addField('custpage_sendtoqueue', 'radio', 'Retain with changes', 'retainchange', 'outcome');
						actionField.setDefaultValue('sendtoretention');			
						actionField.setMandatory(true);		
					}
					break;
				
				case RETENTIONSTATUS_SentToRetention :	
					var actionField = 
						form.addField('custpage_sendtoqueue', 'radio', 'Cancel', 'cancel', 'outcome');
					form.addField('custpage_sendtoqueue', 'radio', 'Save', 'retain', 'outcome');
					form.addField('custpage_sendtoqueue', 'radio', 'Retain with changes', 'retainchange', 'outcome');
					actionField.setMandatory(true);		
					actionField.setDefaultValue('cancel');			
																		
					//Assign the retention rep
					if (retentionrep==null||retentionrep==''){
						custObj.setFieldValue('custentity_retentioncustservrep', nlapiGetUser());
						nlapiSubmitRecord(custObj);
					}
					break;
				case RETENTIONSTATUS_InQueue :	
					var actionField = 
						form.addField('custpage_sendtoqueue', 'radio', 'Cancel', 'cancel', 'outcome');
					form.addField('custpage_sendtoqueue', 'radio', 'Save', 'retain', 'outcome');
					form.addField('custpage_sendtoqueue', 'radio', 'Retain with changes', 'retainchange', 'outcome');
					actionField.setMandatory(true);		
					switch (finalstatus){
						case RETENTIONFINALSTATUS_Cancelled : 	
							actionField.setDefaultValue('cancel');
							break;
						case RETENTIONFINALSTATUS_Saved : 
							actionField.setDefaultValue('retain');
							break;	
						case RETENTIONFINALSTATUS_RetainedWithChanges :
							actionField.setDefaultValue('retainchange');
							break;
					}			
					break;
			}

			var isRetainChangeState = (nlapiGetFieldValue('custpage_sendtoqueue') === 'retainchange');
			var newValueField = form.addField('custpage_new_value', 'currency', 'New Value', null, 'outcome');
			newValueField.setDefaultValue(newValue);
			isRetainChangeState && newValueField.setMandatory(true);
			isRetainChangeState || newValueField.setDisplayType('disabled');

			var monthForFreeField = form.addField('custpage_month_for_free', 'integer', 'Month for free', null, 'outcome');
			monthForFreeField.setDefaultValue(monthForFree);
			monthForFreeField.setMandatory(false);
			isRetainChangeState || monthForFreeField.setDisplayType('disabled');

			var notesField = form.addField('custpage_retentionnotes', 'textarea', 'Notes', null, 'outcome');
			notesField.setDefaultValue(notes);
			notesField.setMandatory(true);
			
			form.addFieldGroup('instructions', "Instructions");
			
			var dispField = form.addField('custpage_retentiondisp', 'select', 'Disposition', null, 'instructions');
			dispField.addSelectOption('','');
			dispField.addSelectOption(RETENTIONDISP_Seasonal,'Seasonal Business');
			dispField.addSelectOption(RETENTIONDISP_BusClosed,'Business Closed'); 
			dispField.addSelectOption(RETENTIONDISP_10DaysRemorse,'10 Days Buyers Remorse'); 
			dispField.addSelectOption(RETENTIONDISP_NoROI,'Not satisfied with ROI');
			dispField.addSelectOption(RETENTIONDISP_NeverPaid,'Never paid (unable to contact)');
			dispField.addSelectOption(RETENTIONDISP_NoContact,'Unable to contact - no reason given');
			if (evoclient){
				dispField.addSelectOption(RETENTIONDISP_EVO,'EVO');
			}
			dispField.addSelectOption(RETENTIONDISP_VOB,'VOB');
			dispField.setDefaultValue(disposition);
			
			var instructionField = form.addField('custpage_cancelinstructions', 'textarea', 'Instructions for Acct:', null, 'instructions').setLayoutType('outsidebelow', 'startrow');
			instructionField.setDefaultValue(cancelinstructs);
			
			if (stage=="REQUEST"){
				var fieldfdate = form.addField('custpage_followupdate', 'date', 'Follow-Up Date', null, 'instructions');
				fieldfdate.setDefaultValue(followupdate);
				fieldfdate.setDisplayType('disabled');
			
				offersField.setDisplayType('normal');
				notesField.setDisplayType('normal');
				
				if (disposition==null||disposition==''){
					dispField.setMandatory(false);
				}
				else{
					dispField.setDefaultValue(disposition);
					dispField.setMandatory(true);
				}
				if (cancelinstructs==null||cancelinstructs==''){
					instructionField.setMandatory(false);
				}
				else{
					instructionField.setDefaultValue(cancelinstructs);
					instructionField.setMandatory(true);
				}
			}
			else{
				offersField.setDisplayType('inline');
				notesField.setDisplayType('inline');	
				dispField.setDisplayType('inline');	
				instructionField.setDisplayType('inline');
			}
			
			
			if (stage=='CANCEL'||stage=='RETAINCHANGE'||stage=='REINSTATE'){
				
		
				var role = nlapiGetRole();
				if (role==ROLE_ADMIN||role==ROLE_FINANCE){
					var directionField = '';
					switch (stage){
					case 'RETAINCHANGE' :	 
						var grp = form.addFieldGroup('accounting', "Cancellation Processing");
						grp.setSingleColumn(true);
						directionField = form.addField("custpage_directions", 'inlinehtml', '', null, 'accounting');
						if(published==WEBSITEPUBSTATUS_Published&&revoked!='T'){
							//has a website
							form.addField('custpage_cancelrequest', 'radio', 'All Services', 'all', 'accounting');
							form.addField('custpage_cancelrequest', 'radio', "Cancel Website Only", 'web',   'accounting');
							if (rstatus==null||rstatus==''){
								form.getField('custpage_cancelrequest').setDefaultValue( 'all' );
								if (rstatus==RETENTIONSTATUS_InQueue&&finalstatus==RETENTIONFINALSTATUS_RetainedWithChanges){ 
									//var downgradeDate = 
									form.addField('custpage_downgradedate', 'date', 'Account Follow Up Date', null, 'accounting');
									//downgradeDate.setMandatory(true);
								}	
							}
							else{
								if (cancellisting=='T'&&cancelwebsite=='T'){
									form.getField('custpage_cancelrequest').setDefaultValue( 'all' );
									if (rstatus==RETENTIONSTATUS_InQueue&&finalstatus==RETENTIONFINALSTATUS_RetainedWithChanges){ 
										//var downgradeDate = 
										form.addField('custpage_downgradedate', 'date', 'Account Follow Up Date', null, 'accounting').setLayoutType('startrow', 'none');
										//downgradeDate.setMandatory(true);
									}	
								}
								else{
									if (cancelwebsite=='T'){
										if (rstatus==RETENTIONSTATUS_InQueue&&finalstatus==RETENTIONFINALSTATUS_RetainedWithChanges){ 
											//var downgradeDate = 
											form.addField('custpage_downgradedate', 'date', 'Website Cancel Date', null, 'accounting').setLayoutType('startrow', 'none');
											//downgradeDate.setMandatory(true);
										}
										form.getField('custpage_cancelrequest').setDefaultValue( 'web' );
									}
									else{
										if (rstatus==RETENTIONSTATUS_InQueue&&finalstatus==RETENTIONFINALSTATUS_RetainedWithChanges){ 
											//var downgradeDate = 
											form.addField('custpage_downgradedate', 'date', 'Account Follow Up Date', null, 'accounting').setLayoutType('startrow', 'none');
											//downgradeDate.setMandatory(true);
										}	
										form.getField('custpage_cancelrequest').setDefaultValue( 'all' );
									}
								}
							}
						}

						else {
							form.addField('custpage_cancelrequest', 'radio', 'Cancel Listing', 'listing',  'accounting');
							if (rstatus==RETENTIONSTATUS_InQueue&&finalstatus==RETENTIONFINALSTATUS_RetainedWithChanges){ 
								//var downgradeDate = 
								form.addField('custpage_downgradedate', 'date', 'Account Follow Up Date', null, 'accounting');
								//downgradeDate.setMandatory(true);
							}
							form.getField('custpage_cancelrequest').setDefaultValue( 'listing' );
						} 
						//var acctnotesField = 
						form.addField('custpage_acctnotes', 'textarea', 'Notes', null, 'accounting');
						break;
					case 'CANCEL' :	
						var grp = form.addFieldGroup('accounting', "Cancellation Processing");
						grp.setSingleColumn(true);
						directionField = form.addField("custpage_directions", 'inlinehtml', '', null, 'accounting');
						if(published==WEBSITEPUBSTATUS_Published&&revoked!='T'){
							//has a website
							form.addField('custpage_cancelrequest', 'radio', 'All Services', 'all', 'accounting');
							form.addField('custpage_cancelrequest', 'radio', "Cancel Website Only", 'web',   'accounting');
							if (rstatus==null||rstatus==''){
								form.getField('custpage_cancelrequest').setDefaultValue( 'all' );
								if (rstatus==RETENTIONSTATUS_InQueue&&finalstatus==RETENTIONFINALSTATUS_Cancelled){ 	
									//var downgradeDate = 
									form.addField('custpage_downgradedate', 'date', 'Listing Downgrade Date', null, 'accounting');
									//downgradeDate.setMandatory(true);
								}	
							}
							else{
								if (cancellisting=='T'&&cancelwebsite=='T'){
									form.getField('custpage_cancelrequest').setDefaultValue( 'all' );
									if (rstatus==RETENTIONSTATUS_InQueue&&finalstatus==RETENTIONFINALSTATUS_Cancelled){ 	
										//var downgradeDate = 
										form.addField('custpage_downgradedate', 'date', 'Service Downgrade Date', null, 'accounting');
										//downgradeDate.setMandatory(true);
									}	
								}
								else{
									if (cancelwebsite=='T'){
										form.getField('custpage_cancelrequest').setDefaultValue( 'web' );
										if (rstatus==RETENTIONSTATUS_InQueue&&finalstatus==RETENTIONFINALSTATUS_Cancelled){ 	
											//var downgradeDate = 
											form.addField('custpage_downgradedate', 'date', 'Website Cancellation Date', null, 'accounting');
											//downgradeDate.setMandatory(true);
										}	
									}
									else{
										form.getField('custpage_cancelrequest').setDefaultValue( 'all' );
										if (rstatus==RETENTIONSTATUS_InQueue&&finalstatus==RETENTIONFINALSTATUS_Cancelled){ 	
											//var downgradeDate = 
											form.addField('custpage_downgradedate', 'date', 'Service Downgrade Date', null, 'accounting');
											//downgradeDate.setMandatory(true);
										}
									}
								}
							}
						}
						else {
							form.addField('custpage_cancelrequest', 'radio', 'Cancel Listing', 'listing',  'accounting');
							if (rstatus==RETENTIONSTATUS_InQueue&&finalstatus==RETENTIONFINALSTATUS_Cancelled){ 	
								//var downgradeDate = 
								form.addField('custpage_downgradedate', 'date', 'Listing Downgrade Date', null, 'accounting');
								//downgradeDate.setMandatory(true);
							}
							form.getField('custpage_cancelrequest').setDefaultValue( 'listing' );
						} 
						//var acctnotesField = 
						form.addField('custpage_acctnotes', 'textarea', 'Notes', null, 'accounting');
						break;
					case 'REINSTATE' :	
						var grp = form.addFieldGroup('accounting', "Cancellation Processing");
						grp.setSingleColumn(true);
						directionField = form.addField("custpage_directions", 'inlinehtml', '', null, 'accounting');
						var fld1 = form.addField('custpage_cancelrequest', 'radio', 'Cancel Listing', 'listing',  'accounting');
						fld1.setDefaultValue( 'listing' );
						fld1.setDisplayType('hidden');
						break;
					}
					
					if (rstatus==RETENTIONSTATUS_InQueue){
						var moneris_url = 'https://www3.moneris.com/mpg/recur/add/index.php';
						var monerisButton = '<center><input type=button style="width: 200px;" value="Open Moneris" onClick="JavaScript:var MonerisWin=window.open(\'' + moneris_url + '\', \'Moneris\', \'width=1000,height=700,location=yes,resizable=yes,scrollbars=yes\'); MonerisWin.focus();"></center>';
						var buttons = form.addField('custpage_moneris', 'inlinehtml', '', null, 'accounting').setLayoutType('startrow', 'none');
						buttons.setDefaultValue('<br>' + monerisButton);
						switch (finalstatus){
							case RETENTIONFINALSTATUS_RetainedWithChanges : 
								directionField.setDefaultValue("<B><U><FONT SIZE=3 COLOR=GREEN>RETAIN WITH CHANGES</FONT></U></B>");
								break;
							case RETENTIONFINALSTATUS_Cancelled : 	
								directionField.setDefaultValue("<B><U><FONT SIZE=3 COLOR=GREEN>CANCEL ACCOUNT</FONT></U></B>");
								break;			
						}
					}	
				
				}
				if (stage!='REINSTATE'){
					var grp2 = form.addFieldGroup('reset', "Reset the status of this cancellation");
					grp2.setSingleColumn(true);
					form.addField('custpage_reset','checkbox', 'Send to Retention:', null, 'reset');
				}
			}

			
			if (stage=='CANCEL'||stage=='RETAINCHANGE'||stage=='REINSTATE'){
				if (stage=='REINSTATE'){
					form.addSubmitButton('Reinstate');
				}
				else {
					var role = nlapiGetRole();
					if ((role==ROLE_ADMIN||role==ROLE_FINANCE)){
						form.addSubmitButton('Submit');
					}
				}
			}
			else {
				form.addSubmitButton('Submit');
			}
			//form.addButton('custpage_custombutton','Exit without Save', 'onclick=window.close()');
			form.addButton('custpage_custombutton','Exit without Save, Go To NetSuite HOME', 'parent.location=\''+NETSUITE_HOME+'\'');
			form.addButton('custpage_custombutton1','Exit without Save : Go Back To Customer', 'parent.location=\''+PATHTOCUSTOMER+customerid+'\'');
		}
		response.writePage( form );
	}
	else {
		var today = new Date();
		var memo = '';	
		
		var stage = request.getParameter('custpage_stage');
		var customerid = request.getParameter('custpage_companyid');
		var customerPL = request.getParameter('custpage_pl');
		var notes = request.getParameter('custpage_retentionnotes');
		var cancelservices = request.getParameter('custpage_cancelrequest');
		var offers = request.getParameter('custpage_offers');
		var churnval =  parseFloat(request.getParameter('custpage_portfoliovalue'));
		var instructs =  request.getParameter('custpage_cancelinstructions');
		var resetstatus =  request.getParameter('custpage_reset');
		var user = nlapiGetUser();			
		
		var cancel_suiteletURL = nlapiResolveURL('SUITELET', 'customscript_cancellationrequest', 'customdeploy_cancellationrequest');
		var cancelURL = cancel_suiteletURL+'&custid='+customerid;
		var cname = '';
		
		if ((stage=='CANCEL'||stage=='RETAINCHANGE'||stage=='REINSTATE')&&resetstatus=='T'){
			var custObj = nlapiLoadRecord('customer', customerid);
			cname=custObj.getFieldValue('companyname');
			custObj.setFieldValue('custentity_retentionstatus', RETENTIONSTATUS_SentToRetention); 
			custObj.setFieldValue('custentity_retentiondisp', '');
			custObj.setFieldValue('custentity_retentiondispdate', '');
			custObj.setFieldValue('custentity_accountingcancelque', '');
			custObj.setFieldValue('custentity_retcancelrequestresolution',''); 
			custObj.setFieldValue('custentity_downgradefollowupdate', '');
			addnote("CUSTOMER STATUS REVERSED", "Cx has been placed back in the Retention Queue", user, customerid );
			try {
				nlapiSubmitRecord(custObj, true);
				var params = new Array();
				params['custid']=customerid;
				nlapiSetRedirectURL('SUITELET', 'customscript_cancellationrequest', 'customdeploy_cancellationrequest', null, params);	
			}
			catch (e){
				nlapiLogExecution ('ERROR', 'System', 'Unable to process cancellation status reversal for ' + cname + " "+ e.getDetails()); 	
				memo = 'Unable to process cancellation status reversal for ' + cname + " "+ e.getDetails();
		  		var form = nlapiCreateForm('Customer Profile', true);
				form.addButton('custpage_custombutton','Exit', 'onclick=window.close()');
				var field100 = form.addField('custpage_confirmation','textarea', 'Log:').setDisplaySize(300, 50);
				field100.setDefaultValue(memo);
				response.writePage( form );
			}
		}
		else {
			switch (stage) {
				case "REQUEST" : 			
					var custObj = nlapiLoadRecord('customer', customerid);
					cname=custObj.getFieldValue('companyname');
					if (custObj.getFieldValue('custentity_cancel_url')==null||custObj.getFieldValue('custentity_cancel_url')==''){
						custObj.setFieldValue('custentity_cancel_url', cancelURL);
					}
					
					var a10 = 'F';
					var d10 = 'F';
					
					var cancellisting =  'T';
					var cancelwebsite = 'F';
					var requestnote = 'REQUEST TO CANCEL: ';
					switch(cancelservices)	{
						case 'all' : 	
							requestnote = requestnote + "Listing & Website Services.";
							cancellisting = 'T';
							cancelwebsite = 'T';										
							break;
						case 'listing' : 	
							requestnote = requestnote +  "Listing Services.";
							cancellisting = 'T';
							cancelwebsite = 'F';										
							break;
						case 'web' : 	
							requestnote = requestnote +  "Website Services.";
							cancellisting = 'F';
							cancelwebsite = 'T';										
							break;
					
					}
											
					switch(offers){
						case 'accept10' :	
							a10 = 'T';
							break;
						case 'decline10' :	
							d10 = 'T';
							break;
					}
	
					custObj.setFieldValue('custentity_ret_10accepted', a10);
					custObj.setFieldValue('custentity_ret_10declined', d10);
					
					cname = custObj.getFieldValue('companyname');
					custObj.setFieldValue('custentity_churnclass', CHURNCLASS_Realtime);
					custObj.setFieldValue('custentity_retcancellistings', cancellisting); 
					custObj.setFieldValue('custentity_retcancelwebsite', cancelwebsite); 
					if (custObj.getFieldValue('custentity_cancelcustservrep')==null||custObj.getFieldValue('custentity_cancelcustservrep')==''){
						custObj.setFieldValue('custentity_cancelcustservrep', nlapiGetUser());
					}
					
					if (custObj.getFieldValue('custentity_requesttocanceldate')==null||custObj.getFieldValue('custentity_requesttocanceldate')==''){
						custObj.setFieldValue('custentity_requesttocanceldate', nlapiDateToString(today));			
					}
					
					
					custObj.setFieldValue('custentity_retentionnotes', notes);
					var actionMemo = '411: ';
					var processLane = request.getParameter('custpage_sendtoqueue');
					var notetitle = 'REQUEST TO CANCEL';
					switch(processLane){
						case 'followup' : 
							var fdate = request.getParameter('custpage_followupdate');
							custObj.setFieldValue('custentity_downgradefollowupdate', fdate); 
							custObj.setFieldValue('custentity_retentionstatus', RETENTIONSTATUS_RequestToCancel); 
							actionMemo = "Customer placed in Level 1 Handing w/FollowUp";
							var title = "Request To Cancel FollowUp"; 
							var assigned =  user;
							var startdate =  fdate;
							var timedevent = 'T'; 
							var starttime = '10:00 am';
							var endtime = '11:00 am';
							var duedate = fdate; 
							var remindertype = 'POPUP';
							var reminderminutes = '5'; 
							var priority = 'HIGH';
							var status = 'NOTSTART';
							var message = "This account requested to cancel and was set for follow-up." ;
							var owner = user;
							addtask(title, assigned, startdate, timedevent, starttime, endtime, duedate, remindertype, reminderminutes, priority, status, message, customerid, '', owner, 'T');  
							break;
							
							
							//10 Days Remorse - REQUEST TO CANCEL 
						case 'remorse' : 
							custObj.setFieldValue('custentity_retentionstatus', RETENTIONSTATUS_RequestToCancel); 
							custObj.setFieldValue('custentity_ret10daysremorse', 'T');
							custObj.setFieldValue('custentity_retentiondisp', RETENTIONDISP_10DaysRemorse);
							custObj.setFieldValue('custentity_retentiondispdate', nlapiDateToString(today));
							custObj.setFieldValue('custentity_retentionnotes', '10 Days Buyers Remorse\n' + notes);
							custObj.setFieldValue('custentity_cancelinstructions', '10 Days Buyers Remorse\n' + instructs);
							//custObj.setFieldValue('custentity_accountingcancelque', 'T');
							custObj.setFieldValue('custentity_donotsendcomm', 'T');
							//custObj.setFieldValue('custentity_retcancelrequestresolution',RETENTIONFINALSTATUS_Cancelled); 
							actionMemo = "Customer requested cancellation utilizing 10 Days Remorse Policy";
							notetitle = "10 Days Remorse";
							break;
							
							//SEND TO RETENTION - SENT TO RETENTION 
						case 'sendtoretention': 
							custObj.setFieldValue('custentity_retentionstatus', RETENTIONSTATUS_SentToRetention);   
							//custObj.setFieldValue('custentity_sendtoretention', 'T');
							custObj.setFieldValue('custentity_retentionstartdate', nlapiDateToString(today));
							custObj.setFieldValue('custentity_donotsendcomm', 'T');
							actionMemo = "Customer sent to retention.";
							notetitle = "SENT TO RETENTION";
							break;
							
							//CANCEL NOW - COMPLETED BY OAC 
						case 'cancel' : 
							custObj.setFieldValue('custentity_retentionstatus', RETENTIONSTATUS_InQueue);  
							custObj.setFieldValue('custentity_retentiondisp', request.getParameter('custpage_retentiondisp'));
							custObj.setFieldValue('custentity_retentiondispdate', nlapiDateToString(today));
							custObj.setFieldValue('custentity_cancelinstructions', instructs);
							custObj.setFieldValue('custentity_accountingcancelque', 'T');
							custObj.setFieldValue('custentity_retcancelrequestresolution',RETENTIONFINALSTATUS_Cancelled); 
							custObj.setFieldValue('custentity_retresolutionrep', user);
							custObj.setFieldValue('custentity_donotsendcomm', 'T');
							actionMemo = "Services cancelled by OAC: " +instructs; 
							notetitle = "ACCOUNT CANCELLED";
							break;
							
							//RETAIN - RETAINED  
						case 'retain' : 
							custObj.setFieldValue('custentity_retentionstatus', '');
							custObj.setFieldValue('custentity_retentiondispdate', nlapiDateToString(today));
							custObj.setFieldValue('custentity_retcancelrequestresolution',RETENTIONFINALSTATUS_Saved); 
							custObj.setFieldValue('custentity_retresolutionrep', user);
							actionMemo = "Customer SAVED by OAC.";
							notetitle = "ACCOUNT SAVED";
							break;
							
							//RETAIN W/CHANGES - RETAINED WITH CHANGES 
						case 'retainchange'	: 
							custObj.setFieldValue('custentity_retentionstatus', RETENTIONSTATUS_InQueue);
							custObj.setFieldValue('custentity_retentiondispdate', nlapiDateToString(today));
							custObj.setFieldValue('custentity_cancelinstructions', instructs);
							custObj.setFieldValue('custentity_accountingcancelque', 'T');
							custObj.setFieldValue('custentity_retcancelrequestresolution',RETENTIONFINALSTATUS_RetainedWithChanges); 
							custObj.setFieldValue('custentity_retresolutionrep', user);

							custObj.setFieldValue('custentity_ret_wc_new_value', request.getParameter('custpage_new_value'));
							custObj.setFieldValue('custentity_ret_wc_month_free', request.getParameter('custpage_month_for_free'));

							actionMemo = "Services retained with changes by OAC : " +instructs ;
							notetitle = "RETAINED WITH CHANGES";
							break;
							
					}
										
					memo = requestnote + '\n' + notes + '\n' + actionMemo;  
					addnote(notetitle, memo, user, customerid);
					if (churnval > 199) {
						
						var salesRep = custObj.getFieldText('salesrep');
						
						// Convert Disposition Code to Text
						var dispText = '';
						var dispCode = custObj.getFieldValue('custentity_retentiondisp');

						switch (dispCode) {
							case RETENTIONDISP_Seasonal:
								dispText = "Seasonal Business";
								break;
							case RETENTIONDISP_BusClosed:
								dispText = "Business Closed";
								break;
							case RETENTIONDISP_10DaysRemorse:
								dispText = "10 Days Buyers Remorse";
								break;
							case RETENTIONDISP_NoROI:
								dispText = "Not satisfied with ROI";
								break;
							case RETENTIONDISP_NeverPaid:
								dispText = "Never paid (unable to contact)";
								break;
							case RETENTIONDISP_NoContact:
								dispText = "Unable to contact - no reason given";
								break;
							case RETENTIONDISP_VOB:
								dispText = "VOB";
								break;
	
							default:
								dispText = 'Code ' + dispCode;
								break;
						}
					
						var body = cname + ' has requested to cancel. This customer has a monthly value of '+churnval+ '.';
						body = body
							+ "\n" + "Process Lane: " + processLane
							+ "\n\n"
							+ "\n" + "Disposition: " + dispText
							+ "\n" + "Customer ID: " + customerPL
							+ "\n" + "Sales Rep: " + salesRep + "\n"
							+ "\n" + "Request: " + requestnote
							+ "\n" + "OAC Note Title: " + notetitle
							+ "\n" + "OAC Note: " + notes
							+ "\n" + "Action: " + actionMemo
							+ "\n\n"
							;
							
						body = body
							+ "\n" + "Days Overdue: " + custObj.getFieldValue('daysoverdue')
							+ "\n" + "Overdue Balance: " + custObj.getFieldValue('overduebalance')
							+ "\n" + "Balance: " + custObj.getFieldValue('balance')
						;
						
						try {
							// Get financial history
							var financialHistory = getFinancialHistory(customerid);
							if (financialHistory != null) {
								body = body
									+ "\n" + "First Order Date: " + financialHistory.firstOrderDate
									+ "\n" + "Last Order Date: " + financialHistory.lastOrderDate

									+ "\n" + "First Payment Date: " + financialHistory.firstPaymentDate
									+ "\n" + "Last Payment Date: " + financialHistory.lastPaymentDate
									
									+ "\n" + "Total Payment Amount: " + financialHistory.totalPaymentAmount
									
									+ "\n" + "# of Payments: " + financialHistory.numOfPayments
									
									+ "\n" + "Average Payment Amount: " + financialHistory.avgPaymentAmount
								;
							}
						
						} catch (e) {
							nlapiLogExecution("Error", "requestToCancel (financial history)", e);
						}
						
						nlapiSendEmail(nlapiGetUser(), 'cancelalerts@411.ca', 'ALERT: Request for Cancel', body);
						//logMessage(customerid, user, 'cancelalerts@411.ca', 'Request To Cancel Alert', body);
					}
					
					try {
						custId = nlapiSubmitRecord(custObj, true);
					}
					catch (e){
						nlapiLogExecution ('ERROR', 'System', 'Unable to process cancellation request for ' + cname + " "+ e.getDetails()); 	
						memo = 'Unable to save Cancellation Request for ' + cname + " "+ e.getDetails();
					}
					
					break;
				case "CANCEL" : 
					var cancellisting =  'T';
					var cancelwebsite = 'F';
					switch(cancelservices)	{
						case 'all' : 	
							cancellisting = 'T';
							cancelwebsite = 'T';										
							break;
						case 'listing' : 	
							cancellisting = 'T';
							cancelwebsite = 'F';										
							break;
						case 'web' : 
							cancellisting = 'F';
							cancelwebsite = 'T';										
							break;				
					}
					var searchresults = null;
					var reqdate = nlapiStringToDate(request.getParameter('custpage_downgradedate'));
					var custObj = nlapiLoadRecord('customer', customerid);
					
					var anotes = request.getParameter('custpage_acctnotes');
					if (anotes!=null&&anotes!=''){
						addnote("ACCOUNT CANCELLATION", anotes,  user, customerid );
					}
					
					cname=custObj.getFieldValue('companyname');
					
					var entityid = custObj.getFieldValue('entityid');
					if (cancellisting=='T'){
						searchresults = getChildrenAccounts(entityid);
						if (searchresults!=null){
							nlapiLogExecution("DEBUG",'Parent has children', searchresults.length);
							for (var x=0;x<searchresults.length;x++){
								var result = searchresults[x];
								var childPL = result.getValue('custentity411custid');
								var childID = result.getValue('internalid');
								if (result.getValue('custentity_downgradedate') == ''
									|| result.getValue('custentity_comm_campaign') != ''
									|| result.getValue('custentity_donotsendcomm') != 'T'
									|| result.getValue('entitystatus') != '111'
									|| result.getValue('custentity_retentionstatus') != '8'
									|| result.getValue('custentity_accountingcancelque') != 'F'
									|| result.getValue('custentity_retcancelrequestresolution') != '3'
									) {
									cancelAccount(childID, childPL ,reqdate);
								}
								
								if (result.getValue('custentity_websiterevokedate') == '') {
									cancelWebsite(childID, childPL, reqdate);
								}
							}
						}
						cancelAccount(customerid, customerPL, reqdate);
					}
					if (cancelwebsite=='T'){
						cancelWebsite(customerid, customerPL, reqdate);
					}
					memo = cname + ' has been cancelled in NetSuite';
					break;
					
				case "RETAINCHANGE" :
					
					var cancellisting =  'T';
					var cancelwebsite = 'F';
					switch(cancelservices)	{
						case 'all' : 	
							cancellisting = 'T';
							cancelwebsite = 'T';										
							break;
						case 'listing' : 	
							cancellisting = 'T';
							cancelwebsite = 'F';										
							break;
						case 'web' : 
							cancellisting = 'F';
							cancelwebsite = 'T';										
							break;				
					}
					
					var reqdate = request.getParameter('custpage_downgradedate');
					var custObj = nlapiLoadRecord('customer', customerid);
					cname=custObj.getFieldValue('companyname');
	
					var anotes = request.getParameter('custpage_acctnotes');
					if (anotes!=null&&anotes!=''){
						addnote("ACCOUNT RETAIN CHANGE", anotes,  user, customerid );
					}
					
					if (cancellisting!='T'&&cancelwebsite=='T'){
						cancelWebsite(customerid, customerPL, reqdate);
						custObj.setFieldValue("custentity_retentionstatus", RETENTIONSTATUS_CompletedByAccounting);   
						custObj.setFieldValue('custentity_accountingcancelque', 'F');	
						custObj.setFieldValue('custentity_retentionaccountant', user);	
						addnote("ACCOUNT RETENTION DOWNGRADE", "Cx's account has been downgraded, the website has been scheduled for cancellation: "+ instructs,  user, customerid );
						alert("Please ensure you have also modified the memorized transactions and Moneris transactions as per this change request." );
					}	
					else {
					
						var title = "Upgrade Account"; 
						var assigned =  user;
						var startdate =  reqdate;
						var timedevent = 'T'; 
						var starttime = '10:00 am';
						var endtime = '11:00 am';
						var duedate = reqdate; 
						var remindertype = 'POPUP';
						var reminderminutes = '5'; 
						var priority = 'HIGH';
						var status = 'NOTSTART';
						var message = "This account was downgraded and now requires upgrading..." ;
						var owner = user;
						var checkdate = nlapiStringToDate(reqdate);
						if (!isDate1SameAsDate2(checkdate, today))	{
							if (addtask(title, assigned, startdate, timedevent, starttime, endtime, duedate, remindertype, reminderminutes, priority, status, message, customerid, '', owner, 'T')!=null){
								custObj.setFieldValue("custentity_retentionstatus", RETENTIONSTATUS_CompletedByAccounting);   
								custObj.setFieldValue('custentity_accountingcancelque', 'F');	
								custObj.setFieldValue('custentity_retentionaccountant', user);	
								custObj.setFieldValue('custentity_downgradefollowupdate', reqdate);
								addnote("ACCOUNT RETENTION DOWNGRADE", "Cx's account has been downgraded for Retention in Netsuite: "+ instructs,  user, customerid );
								alert("Please ensure you have also modified the memorized transactions and Moneris transactions as per this change request." );
							}
						}
						else {
							custObj.setFieldValue("custentity_retentionstatus", RETENTIONSTATUS_CompletedByAccounting);   
							custObj.setFieldValue('custentity_accountingcancelque', 'F');	
							custObj.setFieldValue('custentity_retentionaccountant', user);	
							custObj.setFieldValue('custentity_downgradefollowupdate', reqdate);
							addnote("ACCOUNT RETENTION DOWNGRADE", "Cx's account has been downgraded for Retention in Netsuite.: "+ instructs,  user, customerid );
							alert("Please ensure you have also modified the memorized transactions and Moneris transactions as per this change request." );
						}
					}
					try {
						custId = nlapiSubmitRecord(custObj, true);
					}
					catch (e){
						nlapiLogExecution ('ERROR', 'System', 'Unable to process cancellation record for ' + cname + " "+ e.getDetails()); 	
						memo = 'Unable to process cancellation record for ' + cname + " "+ e.getDetails();
					}
					memo = cname + ' has been downgraded in NetSuite';
					
					break;
				
				
				case "REINSTATE" :		
					var custObj = nlapiLoadRecord('customer', customerid);
					cname=custObj.getFieldValue('companyname');
					custObj.setFieldValue('custentity_comm_campaign', '');
					custObj.setFieldValue('entitystatus', STATUS_ClosedWon);
					custObj.setFieldValue('custentity_portfoliovalue', 0);
					custObj.setFieldValue('custentity_establishmentstatus', '');
					custObj.setFieldValue('custentity_establishmentrep', '');
					custObj.setFieldValue('custentity_establishorder', '');
					custObj.setFieldValue('custentity_assignorder', '');
					custObj.setFieldValue('custentity_verifyorder', '');
					custObj.setFieldValue('custentity_downgradecomplete', '');
					custObj.setFieldValue('custentity_downgradedate', '');
					custObj.setFieldValue('custentity_downgradefollowupdate', '');
					custObj.setFieldValue("custentity_retentiondisp", '');
					custObj.setFieldValue("custentity_retentiondispdate", '');
					custObj.setFieldValue('custentity_accountingcancelque', '' );
					custObj.setFieldValue('custentity_retcancelrequestresolution','');
					custObj.setFieldValue('custentity_cancelcustservrep', '' );
					custObj.setFieldValue('custentity_cancelinstructions', '' );
					custObj.setFieldValue('custentity_churnclass', '' );
					custObj.setFieldValue('custentity_retcancelall', '' );
					custObj.setFieldValue('custentity_retcancellistings', '' );
					custObj.setFieldValue('custentity_retcancelwebsite', '' );
					custObj.setFieldValue('custentity_retentionnotes', '' );
					custObj.setFieldValue('custentity_ret10daysremorse', '' );
					custObj.setFieldValue('custentity_retentioncustservrep', '' );
					custObj.setFieldValue('custentity_requesttocanceldate', '' );
					custObj.setFieldValue('custentity_retentionstartdate', '' );
					//custObj.setFieldValue('custentity_sendtoretention', '' );
					custObj.setFieldValue('custentity_retentionstatus', '' );
					custObj.setFieldValue('custentity_retentionaccountant', '' );
					custObj.setFieldValue('custentity_thirdpartydisp', '' );
					custObj.setFieldValue('custentity_thirdpartysend', '' );
					custObj.setFieldValue('custentity_thirdpartysent', '' );
					custObj.setFieldValue('custentity_thirdpartydatesent', '' );
					
					addnote("REINSTATED", "Cx has been REINSTATED from CANCELLED State", user, customerid );
					try {
						custId = nlapiSubmitRecord(custObj, true);
					}
					catch (e){
						nlapiLogExecution ('ERROR', 'System', 'Unable to process reinstatement for ' + cname + " "+ e.getDetails()); 	
						memo = 'Unable to process reinstatement for ' + cname + " "+ e.getDetails();
					}
					memo = cname + ' has been reinstated';
					break;
					
			}
			//SETUP CONFIRMATION PAGE  		
	  		var form = nlapiCreateForm('Customer Profile', true);
			//form.addButton('custpage_custombutton','Exit', 'onclick=window.close()');
	  		form.addButton('custpage_custombutton','Exit, Go To NetSuite HOME', 'parent.location=\''+NETSUITE_HOME+'\'');
			form.addButton('custpage_custombutton1','Exit, Go Back To Customer', 'parent.location=\''+PATHTOCUSTOMER+customerid+'\'');
			var field100 = form.addField('custpage_confirmation','textarea', 'Log:').setDisplaySize(300, 50);
			field100.setDefaultValue(memo);
			response.writePage( form );

		}	
	}
}


function cancelAccount(customerid, customerPL, reqdate){ //CANCEL ACCOUNT  (ACCT)
	initialize();
	try{
		var rec = nlapiLoadRecord('customer', customerid);	
		rec.setFieldValue('custentity_downgradedate', nlapiDateToString(reqdate));	
		rec.setFieldValue('custentity_comm_campaign', '');
		rec.setFieldValue('custentity_donotsendcomm', 'T');
		rec.setFieldValue("entitystatus", STATUS_Cancelled);   
		rec.setFieldValue("custentity_retentionstatus", RETENTIONSTATUS_CompletedByAccounting );  
		rec.setFieldValue('custentity_accountingcancelque', 'F');	
		rec.setFieldValue('custentity_retentionaccountant', nlapiGetUser());
		rec.setFieldValue('custentity_retcancelrequestresolution', RETENTIONFINALSTATUS_Cancelled);
		nlapiSubmitRecord(rec);
		cleanTracker(customerid);
		clearSuppression(customerid);
	}
	catch (e){
		nlapiLogExecution("Error", "Error cancelling account:" + customerPL, e);
		return false;
	}
	
	addnote("LISTINGS REMOVAL REQUEST", "Cx's services have been scheduled for removal from 411 site on "+reqdate, nlapiGetUser(), customerid );
	addnote("ACCOUNT CANCELLED", "Cx's account has been cancelled in Netsuite: "+ nlapiGetFieldValue('custentity_cancelinstructions'), nlapiGetUser(), customerid );
	//addnote("COMMUNCATIONS", "Cx's has been moved to the Cancelled Comm Campaign ", nlapiGetUser(), nlapiGetFieldValue('id') )
	alert("Cx's account has been cancelled in Netsuite and listings have been scheduled for downgraded from 411.ca on "+reqdate + '\n'+ "Please ensure you have also removed the memorized transactions, applied required journal entries, and cancelled Moneris transactions. Please press SAVE to complete." );
	return true;
}


function cancelWebsite(customerID, customerPL, revokedate){
	try{
		var rec = nlapiLoadRecord('customer', customerID);	
		if (customerPL!=null&&customerPL!=''){
			rec.setFieldValue('custentity_websiterevokedate',  nlapiDateToString(revokedate));
			addnote("WEBSITE REVOKED", "Cx's website scheduled to be revoked on "+revokedate, nlapiGetUser(), customerID );
		}
		nlapiSubmitRecord(rec);
	}
	catch (e){
		nlapiLogExecution("Error", "Error scheduling website revoke: "+ customerPL,e);
		return false;
	}
}


//////////////

function suiteletEVOSearch(request, response){
	nlapiLogExecution("Debug", "EVO Search", "Start");
	initialize();
	if (request.getMethod() == 'GET' )	{
		var form = nlapiCreateForm("EVO Search");
		var flag = request.getParameter('flag');
		var customerid= request.getParameter('custid');
				
		var custIdField= form.addField('custpage_customerid','text', '');
		custIdField.setDisplayType('hidden');
		custIdField.setDefaultValue(customerid);
	
		if (flag=='0'){
			var message = '<B><Font color=red>No customer found with that merchant ID</font></b><br>';
			var idEntered = request.getParameter('merchantid');
			if (idEntered!=null&&idEntered!=''){
				message = '<B><Font color=red>No customer found with merchant ID: '+idEntered+'</font></b><br>';
			}
			var fld =form.addField('custpage_message', 'inlinehtml','').setBreakType('startcol');
			fld.setDefaultValue(message);
		}
	
		form.addField('custpage_searchid', 'text','EVO Merchant ID: ').setBreakType('startrow');
		form.addSubmitButton('Submit');
		form.addButton('custpage_custombutton','NetSuite HOME', 'parent.location=\''+NETSUITE_HOME+'\'');
		form.addButton('custpage_custombutton1','Back To Customer', 'parent.location=\''+PATHTOCUSTOMER+customerid+'\'');
		response.writePage( form );
	}	
	else{
	    try {
	    	var customerid = request.getParameter('custpage_customerid');
	    	var searchforId = request.getParameter('custpage_searchid');
			var evoid = getCustomerID_EVOMerchant(searchforId);
			if (evoid==null||evoid==''){
				var params = new Array();
				params['flag'] = '0';
				params['merchantid'] = searchforId;
				params['custid'] = customerid;
				nlapiSetRedirectURL('SUITELET', 'customscript_evosearch', 'customdeploy_evosearch', false,  params);
			}else{
				nlapiSetRedirectURL('RECORD', 'customer', evoid, false,  null);
			}
			
		}
	    catch(e){
	    	nlapiLogExecution("Error", "Error", e.getDetails());
	    }
	    
	    
	}
}


/////////////SALES ORDER APPROVAL FOR CUSTOMER SERVICES SALES ORDERS

function suitelet_approveFulfillOAC(request, response){
	nlapiLogExecution("Debug", "approve fulfill", "Start");
	initialize();
	
	if ( request.getMethod() == 'GET' )	{
		if (request.getParameter('soid')!=null) {
			try { 
				recId = request.getParameter('soid');
				nlapiLogExecution("Debug", "Custom approve fulfill", recId);
				var rec = nlapiLoadRecord('salesorder', recId);
				rec.setFieldValue('orderstatus', "B");
				rec.setFieldValue('custbody_provisioned_by', nlapiGetUser());
				rec.setFieldValue('custbody_provisioned_date', nlapiDateToString(new Date()));
				rec.setFieldValue('custbody5', nlapiGetUser() );
				rec.setFieldValue('custbody_verfied_date',nlapiDateToString(new Date()));
				nlapiSubmitRecord(rec);
			
				try {
					var fulfillRecord = nlapiTransformRecord('salesorder', recId,'itemfulfillment');
					nlapiSubmitRecord( fulfillRecord );
				}
				catch (fe){
					nlapiLogExecution("Debug", "fulfillment", fe);
					
				}
				var customerid = rec.getFieldValue('entity');
				rec = nlapiLoadRecord('salesorder', recId);

				var googlesaletype = '';
				
				//IF THIS IS A SALES ORDER CONVERTING AN UPSELL RECORD THERE MAY BE AUTOMATED BILLING ALREADY IN PLACE : REMOVE--->
				var nlines = rec.getLineItemCount('item');
				for (var i=1;i<=nlines;i++){
					var item = rec.getLineItemValue('item', 'item', i);
					if (item==ITEM_WEBSITE_site_InvokeToUpsell){
						try {
							var custObj = nlapiLoadRecord('customer', customerid);
							if (custObj.getFieldValue('custentity_website_automatedbilling')=='T'){
								custObj.setFieldValue('custentity_website_automatedbilling','F');
								nlapiSubmitRecord(custObj);
							}
						}
						catch(e){
							nlapiLogExecution("error", "so approve update cust auto billing", e);
						}
					}
					if (item==ITEM_GOOGLE_ADS85_new || item==ITEM_GOOGLE_ADS135_new|| item==ITEM_GOOGLE_ADS200_new|| 
							item==ITEM_GOOGLE_ADS300_new || item==ITEM_GOOGLE_ADS500_new ||   
							item==ITEM_GOOGLE_ADBASIC_new || item==ITEM_GOOGLE_ADSTANDARD_new||  
							item==ITEM_GOOGLE_ADEXTREME_new || item==ITEM_GOOGLE_ADADVANCED_new  ){
						googlesaletype = "NEW";
						nlapiLogExecution("Debug", "Google Ad Words Sale","NEW SALE");
					}
					if (item==ITEM_GOOGLE_ADS85_recur || item==ITEM_GOOGLE_ADS135_recur|| item==ITEM_GOOGLE_ADS200_recur|| 
							item==ITEM_GOOGLE_ADS300_recur|| item==ITEM_GOOGLE_ADS500_recur ||   
							item==ITEM_GOOGLE_ADBASIC_recur || item==ITEM_GOOGLE_ADSTANDARD_recur||  
							item==ITEM_GOOGLE_ADEXTREME_recur || item==ITEM_GOOGLE_ADADVANCED_recur  ){
						googlesaletype = "RENEWAL";
						nlapiLogExecution("Debug", "Google Ad Words Sale","NEW SALE");
					}
				}
		
				if (googlesaletype=='NEW'||googlesaletype=='RENEWAL'){
					var params = new Array();
					params['custid'] = customerid;
					params['soid'] = recId;
					params['saletype'] = googlesaletype;
					nlapiSetRedirectURL('SUITELET', 'customscript_googleadwordssetup', 'customdeploy_googleadwordssetup', null,  params);
				}
				else{
					nlapiSetRedirectURL('RECORD', 'customer', customerid, null, null);
				}
				
			}
			catch (e) {
				nlapiLogExecution("Debug", "Error", e);
			}
			
		}
	}
}


