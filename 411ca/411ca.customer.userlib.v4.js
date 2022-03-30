/**
 * Module Description
 * 
 * Version    Date            Author           Remarks
 * 1.00       17 Oct 2012     MWise
 *
 */

var script_user_id = 8568;


var user_id = '';
var enable_customer_id_field = false;
var old_customer_id = 0;
var old_entityid = '';
var old_customeralert = '';
var environment = '';

var globalFieldList = new Array(); 
var FieldList = new Array(); 

var telephones = new Array();

/****************************************************************************************************************
*											USER EVENTS															*
*****************************************************************************************************************/

function beforeCustomerLoad(type, form){
	
	try {
		initialize();
		
		var user_id = nlapiGetUser();
		var currentrole = nlapiGetRole();
		var profile;
		var syncmess = '';
		var customform = nlapiGetFieldValue('customform');
		var customerid = nlapiGetRecordId();
		//var customerid = nlapiGetFieldValue('id');
		
		if (customform==FORM_CUST_OACMGR || customform==FORM_CUST_OAC || customform==FORM_CUST_MTL || customform== FORM_CUST_FINANCE || customform== FORM_CUST_COLLECTIONS){
			if ( type == 'edit' || type == 'xedit' ) {
				accessLog(customerid , "Cx has been accessed in EDIT MODE");
			}	
			else {
				if ( type == 'view' ) {	
					accessLog(customerid, "Cx has been accessed in VIEW MODE");
				}
			}
		}
		
		var eststatus = nlapiGetFieldValue('custentity_establishmentstatus');
		var estrep = nlapiGetFieldValue('custentity_establishmentrep');
		
		var retentionstatus  =nlapiGetFieldValue('custentity_retentionstatus');
		var retentionfinalstatus = nlapiGetFieldValue('custentity_retcancelrequestresolution');	
		
		
		var url = nlapiResolveURL('SUITELET', 'customscript_cancellationrequest', 'customdeploy_cancellationrequest');
		var cancelForm = 'JavaScript:var MiniWin=window.open(\'' + NETSUITE_URL + url + '&custid='+customerid+'\',  \'_self\'); MiniWin.focus();';
		
		if (retentionstatus==null){
			retentionstatus='';
		}
		var customer_id = nlapiGetFieldValue('custentity411custid');
		
		//VIEW MODE ONLY - SYNC WITH 411
		if (type == 'view' && customer_id > 0) {
			nlapiLogExecution("Error", "Not an error", user_id);if (currentrole==ROLE_ADMIN||currentrole==ROLE_OAC_MGR||currentrole==ROLE_OAC_MGR_ENH||currentrole==ROLE_OAC_MGR_MTL||
					currentrole==ROLE_OAC||currentrole==ROLE_OAC_MTL||currentrole==ROLE_EST ||currentrole==ROLE_RETENTION||user_id==EMPLOYEE_GILLESSHARGARY){
				nlapiLogExecution("Error", "Not an error", "In sync method");
				profile = getBusinessProfile(customer_id);
				if (profile!=null){
					if (profile['timedout']==true){
						syncmess = '<font color="black" style="background-color: rgb(255, 255, 255); " size="2"><b>Connection Timed Out to 411,... Refresh and try again.</b></font><div style="font-size: 8pt; "></div><br>';	
					}
					else {
						if (profile['notfound']==true){
							 if (addCustomerTo411()==true){
							 	syncmess = '<font color="black" style="background-color: rgb(255, 255, 255); " size="2"><b>Customer record successfully added to 411.</b></font><div style="font-size: 8pt; "></div><br>';	
							 }
							 else{
								syncmess = '<font color="black" style="background-color: rgb(255, 255, 255); " size="2"><b>Profile hidden. RECORD IS OUT OF SYNC WITH LISTING.<br>PLEASE PRESS EDIT TO UPDATE THE RECORD </b></font><div style="font-size: 8pt; "></div><br>';
							 }
						}
						else {
							if (profile['nsOutOfSync']==true){
								nlapiLogExecution("Debug", "record NOT IN sync", customer_id);
								//updateNetsuite(profile, customerid, customer_id);
								//update_NS_OutOfSync(profile, customer_id);
								syncmess = '<font color="black" style="background-color: rgb(255, 255, 255); " size="2"><b>RECORD IS OUT OF SYNC WITH LISTING<br>PLEASE PRESS EDIT TO UPDATE THE RECORD </b></font><div style="font-size: 8pt; "></div><br>';
								nlapiSetFieldValue('custentity_a9r_recordupdate', 'T');
							}
							else{
								nlapiLogExecution("Debug", "record in sync, PL=", customer_id);
								nlapiSetFieldValue('custentity_a9r_recordupdate', '');
							}
						}	
					}
				}
				else{
					syncmess = '<font color="#ff0000" style="background-color: rgb(255, 255, 255); " size="3"><b>System Error. UNABLE TO RETRIEVE CUSTOMER FROM 411 AT THIS TIME.</b></font><div style="font-size: 8pt; "></div><br>';
				}
			}
			var currentTime = new Date();
			currentTime.setDate(currentTime.getDate() - 1);
			var month = currentTime.getMonth() + 1;
			var day = currentTime.getDate();
			var year = currentTime.getFullYear();
			if (day < 10) {
				day = '0' + day;
			}
			if (month < 10) {
				month = '0' + month;
			}
			day = '01';
			month = month - 3;
			if (month < 0) {
				month = 12 + month;
				year = year - 1;
			}
			if (month < 10) {
				month = '0' + month;
			}
		}
		else{
			nlapiLogExecution("Error", "Not an error", user_id);
			if (currentrole==ROLE_ADMIN||currentrole==ROLE_OAC_MGR||currentrole==ROLE_OAC_MGR_ENH||currentrole==ROLE_OAC_MGR_MTL||
					currentrole==ROLE_OAC||currentrole==ROLE_OAC_MTL||currentrole==ROLE_EST ||currentrole==ROLE_RETENTION||user_id==EMPLOYEE_GILLESSHARGARY){
				if (customer_id < 1) {
					syncmess = '<font color="#ff0000" style="background-color: rgb(255, 255, 255); " size="3"><b>UNABLE TO FIND THIS CUSTOMER IN 411.<br>This customer has no CustPL#.</b></font><div style="font-size: 8pt; "></div><br>';
				}
			}
		}
	
		
	
		nlapiSetFieldValue('custentityadjust_map_coordinates_button', 
				'<center>'
					+ create411Link(customer_id)
					+ '&nbsp;'
					+ '<input type=button style="width: 150px; background-color: #5BB645;" value="Ad Centre" onClick="JavaScript:var MiniWin=window.open(\'' + ao_url + customer_id + '\', \'AO\', \'width=1000,height=700,location=no,resizable=yes,scrollbars=yes\'); MiniWin.focus();">'
					+ '</center>');
		
		nlapiSetFieldValue('custentity_ao_button',
			'<center>'
					+ '<input type=button style="width: 150px;" value="Adjust Map" onClick="JavaScript:var MiniWin=window.open(\'' + external_411ca_server + '/v2_edit/edit_map/edit_map.php?&user_id=' + user_id + '&customer_id=' + customer_id + '\', \'_blank\'); MiniWin.focus();">'
					+ '&nbsp;'
					+ '<input type=button style="width: 150px;" value="Acct Settings" onClick="JavaScript:var MiniWin=window.open(\'' + ac_url+ customer_id + '\', \'AC\', \'width=1000,height=700,location=no,resizable=yes,scrollbars=yes\'); MiniWin.focus();">'
					+ '</center>');
	
		var moneris_url = 'https://www3.moneris.com/mpg/recur/add/index.php';
		nlapiSetFieldValue('custentity_moneris_button',
			'<center>'
					+ '<input type="button" style="width: 150px; background-color: #5BB645;" name="gotodash" value="Open OAC Centre" onClick="window.open(\'' +  a9r_server + '/oac/\')\">'
					+ '&nbsp;'
					+ '<input type=button style="width: 150px; background-color: #5BB645;" value="Open Moneris" onClick="JavaScript:var MonerisWin=window.open(\'' + moneris_url + '\', \'Moneris\', \'width=1000,height=700,location=yes,resizable=yes,scrollbars=yes\'); MonerisWin.focus();">'
					+ '</center>');

		var callbuttonHTML = '';
		var buttonHTML = '';
		try {
			var filters = new Array();
			filters[0] = new nlobjSearchFilter( 'custrecord_phones_customer', null, 'anyof', customerid);
			
			var columns = new Array();
			columns[0] = new nlobjSearchColumn('internalid');
			columns[1] = new nlobjSearchColumn('custrecord_phones_number');
			columns[2] = new nlobjSearchColumn('custrecord_phones_type');
			
			var searchresults = nlapiSearchRecord( 'customrecord_phones', null, filters, columns );
				
			for ( var i = 0; searchresults != null && i < searchresults.length; i++ ){
				var searchresult = searchresults[ i ];
				var telno  = searchresult.getValue('custrecord_phones_number' );
				var ptype  = searchresult.getValue('custrecord_phones_type' );
				//createCallButton(form, i, telno, ptype, ''); 
				
				if (type=='view'){
					callbuttonHTML = callbuttonHTML + '&nbsp;'+ createOnScreenPhoneLabel(telno, ptype, '') ;
						
				}
				if (type=='edit'){
					callbuttonHTML = callbuttonHTML + '&nbsp;'+ createCallButton(telno, ptype, '') ;
				}
				
				buttonHTML = buttonHTML + '&nbsp;'+ createYPLink(telno, ptype, '') ;
				telephones[i] = new Array(telno, ptype);
	
			}	

			nlapiSetFieldValue('custentity_phonebutton1', buttonHTML);
			nlapiSetFieldValue('custentity_phonebutton0', callbuttonHTML);	

		}	
		catch (e){
			nlapiLogExecution("Error", "Getting Customer telephones: ",e);		
		}		
		
		//VIEW & EDIT MODE
	//	nlapiSetFieldValue('custentity_phonebutton1', create411Link(customer_id));
	
		
		var redalert = nlapiGetFieldValue('custentity_customeralert');
		var alertaddon = '';
		if (redalert!= ""&&redalert!=null){
			alertaddon="<table width='300'><tr><td><b style='mso-bidi-font-weight:normal'><span style='font-size:12.0pt;mso-bidi-font-size:11.0pt;line-height:115%;color:red'>"+redalert+"<o:p></o:p></span></b><br></td></tr></table>";
		}
		
		var alert = '';
		var resolution = '';
		
		//**Audaxium Retention Module Modification**//
		//Aux Mod Date: 5/28/2014
		//Final status values grabbed from company level custom preferences
		
		var auxRetentionStatusId = nlapiGetFieldValue('custentity_ax_retentionstatus');
		if (auxRetentionStatusId) {
			//Aux Mod: 7/16/2014 - Vlads suggestion. 
			var paramRetExitStatusAccept = nlapiGetContext().getSetting('SCRIPT','custscript_axrt_exitstatusaccept');
			var paramRetExitStatusLost = nlapiGetContext().getSetting('SCRIPT','custscript_axrt_exitstatuslost');
			var paramRetExitStatusLost10 = nlapiGetContext().getSetting('SCRIPT','custscript_axrt_exitstatuslost10');
			
			var auxRetentionStatusText = nlapiGetFieldText('custentity_ax_retentionstatus');
			
			if (auxRetentionStatusId != paramRetExitStatusAccept && auxRetentionStatusId != paramRetExitStatusLost && auxRetentionStatusId != paramRetExitStatusLost10) {
				alert = 'REQUEST TO CANCEL - '+auxRetentionStatusText;
			} else {
				//9/23/2014 - If Status is set to In Queue for Account Processing, show it on the header
				if (retentionstatus == nlapiGetContext().getSetting('SCRIPT','custscript_axrt_status_ipacct')) {
					alert = 'In Accounting Queue - '+auxRetentionStatusText;
				} else {
					alert = auxRetentionStatusText;
				}
			}
		} else {
			//1/19/2015 - After production go live, THEY Needed legacy retention status back. Oksana confirmed that IF new retention was logged, new status will override.
			//ORIGINAL Status Setting Code 
			//Original Status field
			retentionstatus = nlapiGetFieldValue('custentity_retentionstatus');
			retentionfinalstatus = nlapiGetFieldValue('custentity_retcancelrequestresolution');
			
			if (retentionstatus!=null&&retentionstatus!=''){
				switch 	(retentionfinalstatus){
					case RETENTIONFINALSTATUS_Saved : 	
						resolution = 'ACCOUNT SAVED';  
						break;
					case RETENTIONFINALSTATUS_RetainedWithChanges :
						resolution = 'RETAINED WITH CHANGES'; 
						break;
					case RETENTIONFINALSTATUS_Cancelled :
						resolution = 'CANCELLED'; 
						break;	
				}	
				
				switch 	(retentionstatus){
				case RETENTIONSTATUS_RequestToCancel : 	
					var fdate = nlapiGetFieldValue('custentity_downgradefollowupdate');
					var tendaysremorse = nlapiGetFieldValue('custentity_ret10daysremorse'); 
					if (fdate==null||fdate==''){
						if (tendaysremorse=='T'){
							alert = 'REQUEST TO CANCEL - 10 DAYS REMORSE';
						}else{
							alert = 'REQUEST TO CANCEL';
						}
							
					}
					else {
						alert = 'REQUEST TO CANCEL <br>Scheduled Follow Up on '+ fdate;  
					} 	
					break;
				case RETENTIONSTATUS_SentToRetention : 	
					alert = 'SENT TO RETENTION';
					break;
				case RETENTIONSTATUS_InQueue :
					alert = resolution + '<br>In queue for account cancellation'; 
					break;
				case RETENTIONSTATUS_CompletedByAccounting : 	
					if (resolution=='RETAINED WITH CHANGES') {
						var followup = nlapiGetFieldValue('custentity_downgradefollowupdate');
						alert = resolution + ' : ACCOUNT DOWNGRADED <br> Account set for follow up on '+ followup; 
					}
					else {
						if (resolution=='CANCELLED') {
							var followup = nlapiGetFieldValue('custentity_downgradedate');
							if (nlapiGetFieldValue('custentity_downgradecomplete')== 'T'){
								alert = resolution + ' : ACCOUNT CANCELLED <br> Listing removed on '+ followup; 	
							}
							else {
								alert = resolution + ' : ACCOUNT CANCELLED <br> Listing set for removal on '+ followup;	
							}
						}
						else {
							if (resolution=='ACCOUNT SAVED') {
								alert = 'ACCOUNT SAVED';
							}
						}
					}
					break;
				}
			}
			else {
				if (retentionfinalstatus==RETENTIONFINALSTATUS_Saved) {
					alert = 'ACCOUNT SAVED';
				}
			}
			//*** END Original ***//
		}
		
		
		
		//var eststatus = nlapiGetFieldValue('custentity_establishmentstatus');
		switch 	(eststatus){
		case ESTABLISHMENTSTATUS_Newsale  : 	
			alert = 'Establishment: NEW SALE<br>To Be Assigned'	;
			break;
		case ESTABLISHMENTSTATUS_Assigned : 	
			alert = 'Establishment: NOT STARTED<br>Assigned to ' + nlapiGetFieldText('custentity_establishmentrep') + '.';  
			break;
		case ESTABLISHMENTSTATUS_InProgress : 	
			alert = 'Establishment: IN PROGRESS<br>Assigned to ' + nlapiGetFieldText('custentity_establishmentrep') + ' .';    
			break;
		case ESTABLISHMENTSTATUS_Established : 	
			alert = 'Establishment: AWAITING VERIFICATION<br>Assigned to ' + nlapiGetFieldText('custentity_establishmentrep') + ' .';     
			break;
		
		}
		
		
		if (nlapiGetFieldValue('custentity_thirdpartysent')=='T'||nlapiGetFieldValue('custentity_thirdpartysend')=='T'){
			if (nlapiGetFieldValue('custentity_thirdpartysent')=='T') {
				alert = alert + "<br>SENT TO 3RD PARTY";
			}	
			else {
				alert = alert + "<br>In Queue to SEND TO 3RD PARTY";
			}	
		}
		
		nlapiLogExecution('debug','alert',alert);
		
		var uiMessage = syncmess+"<br>"+alertaddon+"<b style='mso-bidi-font-weight:normal'><span style='font-size:12.0pt;mso-bidi-font-size:11.0pt;line-height:115%;color:black'>"+alert+"<o:p></o:p></span></b>";
	/*
		var ar = getDeclinedStatus(customerid);
		if (ar!=null){
			var ndeclines = ar[0];
			var decamount = ar[1];
			var declineMessage  ='';
			switch (ndeclines){
			case 1 :
				declineMessage = "Last payment declined, Balance Outstanding = $" + parseFloat(decamount);
				break;
			case 2 :
				declineMessage = "Last TWO payments declined, Balance Outstanding = $" + parseFloat(decamount);
				break;
			case 3 :
				declineMessage = "Last THREE payments declined, Balance Outstanding = $" + parseFloat(decamount);
				break;
			}
			uiMessage = uiMessage + "<br><b style='mso-bidi-font-weight:normal'><span style='font-size:12.0pt;mso-bidi-font-size:11.0pt;line-height:115%;color:red'>"+declineMessage+"<o:p></o:p></span></b>";
		}
		*/	
		
		nlapiSetFieldValue('custentity_top_message', uiMessage);
		
		//ASSIGN SALES ORDER LINK
		if (estrep==null||estrep==''){
			form.getField('custentity_assignorder').setDisplayType('inline');
		}
		else{
			form.getField('custentity_assignorder').setDisplayType('hidden');
		}
		
		//ESTABLISH SALES ORDER LINK
		if (eststatus==ESTABLISHMENTSTATUS_Newsale||eststatus==ESTABLISHMENTSTATUS_Assigned||eststatus==ESTABLISHMENTSTATUS_InProgress){
			form.getField('custentity_establishorder').setDisplayType('inline');
		}
		else{
			form.getField('custentity_establishorder').setDisplayType('hidden');
		}
	
		//VERIFY SALES ORDER LINK
		if (eststatus==ESTABLISHMENTSTATUS_Established){
			form.getField('custentity_verifyorder').setDisplayType('inline');
		}
		else{
			form.getField('custentity_verifyorder').setDisplayType('hidden');
		}
		
		
		//AD IS READY BUTTON
		if (eststatus==ESTABLISHMENTSTATUS_Verified&&nlapiGetFieldValue('custentity_comm_adisready_sent')!='T'&&type!='edit'){
			form.getField('custentity_adisready').setDefaultValue('<input type="button" name="Send Ad Is Ready Email" value="Ad is Ready" style="width: 100px; background-color:#CDCDCD;" onClick="javascript:sendAdIsReadyCommunication()" >');
		}
		else{
			form.getField('custentity_adisready').setDisplayType('hidden');
		}
		
		if ( type == 'view'  ) {			
			form.getField('custentity_welcomecampaignbutton0').setDisplayType('hidden');
			
			switch (retentionstatus) {
			case null : 	
				//form.addButton('custpage_requesttocancelbutton', "Request To Cancel", cancelForm); 
				break;
			case '' :
				//form.addButton('custpage_requesttocancelbutton', "Request To Cancel", cancelForm); 
				break;
			case RETENTIONSTATUS_RequestToCancel : 	
				form.addButton('custpage_sendtoretentionbutton', "Cancel/Send To Retention", cancelForm); 
				break;
			case RETENTIONSTATUS_SentToRetention : 	
				form.addButton('custpage_sendtoretentionbutton', "Cancel Account", cancelForm); 
				break;
			case RETENTIONSTATUS_InQueue	: 	
				if (currentrole==ROLE_ADMIN||currentrole==ROLE_FINANCE&&nlapiGetFieldValue('custentity_accountingcancelque')=='T'){
					switch (retentionfinalstatus){
						case RETENTIONFINALSTATUS_RetainedWithChanges : 
							form.addButton('custpage_cancelbutton', "Process Account Changes", cancelForm);		
							break;
						case RETENTIONFINALSTATUS_Cancelled	: 		
							form.addButton('custpage_cancelbutton', "Remove Listings and Cancel Account", cancelForm);		
							break;
					}
				}
				break;
			case RETENTIONSTATUS_CompletedByAccounting	: 	
				switch (retentionfinalstatus){
				case RETENTIONFINALSTATUS_RetainedWithChanges : 
					form.addButton('custpage_cancelbutton', "Reset Status", cancelForm);		
					break;
				case RETENTIONFINALSTATUS_Saved : 
					form.addButton('custpage_cancelbutton', "Reset Status", cancelForm);		
					break;
				default : 		
					form.addButton('custpage_cancelbutton', "Reinstate", cancelForm);		
					break;
				}
			}	
			
			if (currentrole==ROLE_ADMIN||currentrole==ROLE_FINANCE||nlapiGetUser()==EMPLOYEE_CBERRIDGE){
				var url = nlapiResolveURL('SUITELET', 'customscript_cxdeclinetransaction', 'customdeploy_cxdeclinetransaction');
				var declineForm = 'JavaScript:var MiniWin=window.open(\'' + NETSUITE_URL + url + '&custid='+customerid+'\',  \'_self\'); MiniWin.focus();';
				form.addButton('custpage_declinebutton', "CC Decline", declineForm);
			}
			var url = nlapiResolveURL('SUITELET', 'customscript_evosearch', 'customdeploy_evosearch');
			var evoSearchForm = 'JavaScript:var MiniWin=window.open(\'' + NETSUITE_URL + url + '&flag=1&custid='+customerid+'\',  \'_self\'); MiniWin.focus();';
			form.addButton('custpage_evosearch', 'EVO Search', evoSearchForm );
		
			if (currentrole==ROLE_ADMIN||currentrole==ROLE_OAC_MGR||currentrole==ROLE_OAC_MGR_ENH||currentrole==ROLE_OAC_MGR_MTL||
					currentrole==ROLE_OAC||currentrole==ROLE_OAC_MTL||currentrole==ROLE_COLLECT||currentrole==ROLE_FINANCE||currentrole==ROLE_RETENTION){
				var url = nlapiResolveURL('SUITELET', 'customscript_collectpayment', 'customdeploy_collectpayment');
				var paymentForm = 'JavaScript:var MiniWin=window.open(\'' + NETSUITE_URL + url + '&custid='+customerid+'\',  \'_self\'); MiniWin.focus();';
				form.addButton('custpage_paybutton', "Collect", paymentForm);		
			}
			
			
			var empObj = nlapiLoadRecord('employee', nlapiGetUser());
			var mgrVisaCards = empObj.getFieldValue("custentity_411visa_mgr");
			
			if (mgrVisaCards=='T'){
				var url = nlapiResolveURL('SUITELET', 'customscript_prepaidvisa', 'customdeploy_prepaidvisa');
				var visaForm = 'JavaScript:var MiniWin=window.open(\'' + NETSUITE_URL + url + '&entityid='+customerid+'&etype=CUSTOMER\',  \'_self\'); MiniWin.focus();';
				form.addButton('custpage_prepaidvisabutton', "411.ca Visa", visaForm);		
			}
		
			
			var url = nlapiResolveURL('SUITELET', 'customscript_invoicesender', 'customdeploy_invoicesender');
			var printForm = 'JavaScript:var MiniWin=window.open(\'' + NETSUITE_URL + url + '&custid='+customerid+'\',  \'_self\'); MiniWin.focus();';
			form.addButton('custpage_printbutton', "Email Invoice(s)", printForm);		

			
		}	
		else{
			form.getField('custentity_welcomecampaignbutton0').setDefaultValue('<input type="button" name="Reset Campaign" value="Start/Restart Welcome Campaign" style="width: 200px; background-color:#CDCDCD;" onClick="javascript:startwelcomecampaign()" >');
		}
	}
	catch (e) {
		nlapiLogExecution("Error", "Before Load", e);
	}
}


function beforeCustomerSubmit(type)
{
	try {
		initialize();
		if ( type == 'create' || type == 'edit' || type == 'xedit' ) {
			var record = nlapiGetNewRecord();
			var customer_id = record.getFieldValue('custentity411custid');
	
	/*		var today = new Date();
			if ( type == 'create' ) {
				//set default values
				
				record.setFieldValue('custentity_closedate', nlapiDateToString(today));	
				record.setFieldValue('custentity_displayaddress', 'T');	
				record.setFieldValue('custentity_displayemail', 'T');	
				record.setFieldValue('custentity_monthlybillingday', 1);	
				for ( var i = 1; i <= record.getLineItemCount('addressbook'); i++ ) {
					if ( record.getLineItemValue('addressbook', 'defaultshipping', i) == 'T' ) {
						var defaultshipping_province = record.getLineItemValue('addressbook', 'state', i);
						if (( defaultshipping_province != null ) && ( defaultshipping_province.toLowerCase() == 'qc' )) {
							// French
							record.setFieldValue('custentity_language', 7);
						}
					}
				}
	
			}
	*/		
			var internalid = 0;
			var entityid = record.getFieldValue('entityid');
			var companyname = record.getFieldValue('companyname');
			
				
			// If EntityId without "customer_id"
			if ((entityid == companyname) && (customer_id > 0)) {
				var entityid_new = companyname + ' ' + customer_id;
				// If shorter than 84 chars
				if (entityid_new.length <= 83) {
					if (isUniqueEntityId(entityid_new, internalid)) {
						record.setFieldValue('entityid', entityid_new);
					}
				}
			}
	
			
			var updateSignature_trigger= nlapiGetFieldValue('custentity_updatesignature');
			if (updateSignature_trigger=='T'){
				if (!updateSignature()){
					return false;		
				}
			}
			
			var updateARSignature_trigger= nlapiGetFieldValue('custentity_updatearsignature');
			if (updateARSignature_trigger=='T'){
				if (!updateARSignature()){
					return false;		
				}
			}
			
			var sendBusCardTrigger  = nlapiGetFieldValue('custentity_sendbusinesscardtrigger');
			if (sendBusCardTrigger=='T'){
				if (!sendQueuedBusinessCardEmail()){
					return false;		
				}
			}
			
			var sendRequestToCancelRecievedTrigger  = nlapiGetFieldValue('custentity_retention_sendemailtrigger');
			if (sendRequestToCancelRecievedTrigger=='T'){
				if (!sendRequestToCancelRecievedEmail()){
					return false;		
				}
			}
			
		}
	}
	catch (e) 
	{
		nlapiLogExecution("Error", "Customer Before Submit", e);
	}
	return true;
}

function afterCustomerSubmit(type) {

	var today = new Date();
	try {
		
		
		initialize();
		
		var recordID  = nlapiGetRecordId();
		
		if (type == 'delete') {
			var oldRecord = nlapiGetOldRecord();
			var customer_id = oldRecord.getFieldValue('custentity411custid');
			var mess = new Array();
			mess['user_id'] = nlapiGetUser();
			if ((customer_id > 0) && (mess['user_id'] > 0)) {
				mess['customer_id'] = customer_id;
				var now = new Date();
				var response = nlapiRequestURL( external_411ca_ajax_server + '/update_customer.php?act=delete' + '&' + Math.round(now.getTime() * Math.random()), mess, null );
				var result_st = response.getBody();
	
				if (result_st.match("COMPANY_DELETED") == null) {
					return false;
				}
				else {
					return true;
				}
			}
		}
	
		if (type == 'create') {
			var newRecord = nlapiGetNewRecord();
			var phone = '';
			var fax = '';
			var tollfree = '';
			var phone1 = '';
			var phone2 = '';
			var phone3 = '';
			var phone_ext = '';
			var fax_ext = '';
			var tollfree_ext = '';
			var phone1_ext = '';
			var phone2_ext = '';
			var phone3_ext = '';
			var phone_text = '';
			var fax_text = '';
			var tollfree_text = '';
			var phone1_text = '';
			var phone2_text = '';
			var phone3_text = '';
				
			phone = newRecord.getFieldValue('phone');
			phone_ext = newRecord.getFieldValue('custentity_phone_ext');
			phone_text = newRecord.getFieldValue('custentityphone_textual');
			if (phone!=null&&phone!=''||phone_ext!=null&&phone_ext!=''||phone_text!=null&&phone_text!=''){
				createPhoneRecord(recordID, phone, phone_ext, phone_text, PHONETYPE_PHONE);	
				phone_del = true;
			}
			
			fax = newRecord.getFieldValue('fax');
			fax_ext = newRecord.getFieldValue('custentity_fax_ext');
			fax_text = newRecord.getFieldValue('custentityfax_textual');
			if (fax!=null&&fax!=''||fax_ext!=null&&fax_ext!=''||fax_text!=null&&fax_text!=''){
				createPhoneRecord(recordID, fax, fax_ext, fax_text, PHONETYPE_FAX);	
				fax_del = true;
			}
			
			tollfree= newRecord.getFieldValue('custentity_tollfreenumber');
			tollfree_ext = newRecord.getFieldValue('custentity_tollfreenumber_ext');
			tollfree_text = newRecord.getFieldValue('custentitytollfreenumber_textual');
			if (tollfree!=null&&tollfree!=''||tollfree_ext!=null&&tollfree_ext!=''||tollfree_text!=null&&tollfree_text!=''){
				createPhoneRecord(recordID, tollfree, tollfree_ext, tollfree_text, PHONETYPE_TOLLFREE);	
				tollfree_del = true;
			}
						
			phone1 = newRecord.getFieldValue('custentity_alt_phone_1');
			phone1_ext = newRecord.getFieldValue('custentity_alt_phone_1_ext');
			phone1_text = newRecord.getFieldValue('custentityalt_phone_1_textual');
			if (phone1!=null&&phone1!=''||phone1_ext!=null&&phone1_ext!=''||phone1_text!=null&&phone1_text!=''){
				createPhoneRecord(recordID, phone1, phone1_ext, phone1_text, PHONETYPE_PHONE);	
				phone1_del = true;
			}
			
			phone2 = newRecord.getFieldValue('custentity_alt_phone_2');
			phone2_ext = newRecord.getFieldValue('custentity_alt_phone_2_ext');
			phone2_text = newRecord.getFieldValue('custentityalt_phone_2_textual');
			if (phone2!=null&&phone2!=''||phone2_ext!=null&&phone2_ext!=''||phone2_text!=null&&phone2_text!=''){
				createPhoneRecord(recordID, phone2, phone2_ext, phone2_text, PHONETYPE_PHONE);	
				phone2_del = true;
			}
			
			phone3 = newRecord.getFieldValue('custentity_alt_phone_3');
			phone3_ext = newRecord.getFieldValue('custentity_alt_phone_3_ext');
			phone3_text = newRecord.getFieldValue('custentityalt_phone_3_textual');							
			if (phone3!=null&&phone3!=''||phone3_ext!=null&&phone3_ext!=''||phone3_text!=null&&phone3_text!=''){
				createPhoneRecord(recordID, phone3, phone3_ext, phone3_text, PHONETYPE_PHONE);	
				phone3_del = true;
			}
			
			nlapiSetFieldValue('custentity_closedate', nlapiDateToString(today));	
			nlapiSetFieldValue('custentity_displayaddress', 'F');	
			nlapiSetFieldValue('custentity_displayemail', 'T');	
			nlapiSetFieldValue('custentity_monthlybillingday', 1);	
	
			for ( var i = 1; i <= nlapiGetLineItemCount('addressbook'); i++ ) {
				if ( nlapiGetLineItemValue('addressbook', 'defaultshipping', i) == 'T' ) {
					var defaultshipping_province = nlapiGetLineItemValue('addressbook', 'state', i);
					if (( defaultshipping_province != null ) && ( defaultshipping_province.toLowerCase() == 'qc' )) {
					// French
					nlapiSetFieldValue('custentity_language', 7);
					}
				}
			}
	
			
	
		}	
		///////////////////
		var syncrecord = nlapiGetFieldValue('custentity_a9r_recordupdate');
		//nlapiLogExecution('Debug', "SYNC CUSTOMER?", nlapiGetFieldValue('custentity_a9r_recordupdate'));
		
		if (type=='create'|| (type== 'edit' && syncrecord=='T')){
			var mess = new Array();
			if (type=='create'){
				mess['CHECKSUM'] = 'NEW';
			}
			else{
				mess['CHECKSUM'] = nlapiGetFieldValue('custentity_a9r_checksum');
			}
			
			try {
				nlapiLogExecution('Debug', "SAVE CUSTOMER: 411 SYNC", 'Start 411 Update');
		
				var customer_id = parseInt(nlapiGetFieldValue('custentity411custid'));
				if (((customer_id > 0) || (old_customer_id > 0)) && (nlapiGetFieldValue('companyname') != '')) {
					mess['user_id'] = nlapiGetUser();
			
					mess['salesrep'] = nlapiGetFieldValue('salesrep');
					mess['entitystatus'] = nlapiGetFieldValue('entitystatus');
					mess['custentity_language'] = nlapiGetFieldText('custentity_language');
				
					mess['is_display'] = 1;
					if (nlapiGetFieldValue('custentity_hide_on_site') == 'T') {
						mess['is_display'] = 0;
					}
			
					mess['customer_id'] =  String(customer_id);
					nlapiLogExecution("debug", "customerid in array for update", mess['customer_id']);
					mess['CompanyName'] = encodeURIComponent(nlapiGetFieldValue('companyname'));
					//mess['alt_CompanyName'] = nlapiGetFieldValue('custentity_alternate_company_name');
	
					var lines = nlapiGetLineItemCount('recmachcustrecord_phones_customer');
					if (lines>0){
						for (var i = 1; i <= lines ; i++) {
							var lbl_phone = 'Phone_'+(i-1);
							var lbl_ext = 'Phone_'+(i-1)+'_ext'; 
							var lbl_text ='Phone_'+(i-1)+'_textual';
							var lbl_type = 'Phone_'+(i-1)+'_type';
							mess[lbl_phone] = parseTelNumber(nlapiGetLineItemValue('recmachcustrecord_phones_customer', 'custrecord_phones_number', i));
							mess[lbl_ext] = nlapiGetLineItemValue('recmachcustrecord_phones_customer', 'custrecord_phones_ext', i);
							mess[lbl_text] = nlapiGetLineItemValue('recmachcustrecord_phones_customer', 'custrecord_phones_textual', i);
							switch (nlapiGetLineItemValue('recmachcustrecord_phones_customer', 'custrecord_phones_type', i)){
							case PHONETYPE_CELL	: 	
								mess[lbl_type] = A9RPHONETYPE_CELL ;
								break;
							case PHONETYPE_TOLLFREE	: 	
								mess[lbl_type] = A9RPHONETYPE_TOLLFREE ;
								break;
							case PHONETYPE_FAX : 	
								mess[lbl_type] = A9RPHONETYPE_FAX ;
								break;
							default	:	
								mess[lbl_type] = A9RPHONETYPE_PHONE ;
								break;
							}
						}
					}
		
		
					mess['is_display_address'] = 1;
					if (nlapiGetFieldValue('custentity_displayaddress') == 'F') {
						mess['is_display_address'] = 0;
					}
			
					mess['is_display_email'] = 1;
					if (nlapiGetFieldValue('custentity_displayemail') == 'F') {
						mess['is_display_email'] = 0;
					}
			
					mess['E_Mail'] = nlapiGetFieldValue('custentity_email_business');
					mess['Comm_E_Mail'] = nlapiGetFieldValue('email');
					mess['Comm_Firstname'] = nlapiGetFieldValue('custentity_comm_firstname');
					mess['Comm_Lastname'] = nlapiGetFieldValue('custentity_comm_lastname');
					mess['Comm_Language'] = nlapiGetFieldValue('custentity_comm_languagepreference');
				
					mess['Advertising_Tips'] = nlapiGetFieldValue('custentity_unsubscribe_adtips') == 'T' ? 0 : 1;
					mess['Marketing_Tips'] = nlapiGetFieldValue('custentity_unsubscribe_marktips') == 'T' ? 0 : 1;
					mess['Website_Info'] = nlapiGetFieldValue('custentity_unsubscribe_websiteinfo') == 'T' ? 0 : 1;
					mess['Review_Positive'] = nlapiGetFieldValue('custentity_unsubcribe_positive_review') == 'T' ? 0 : 1;
					mess['Review_Neutral_Negative'] = nlapiGetFieldValue('custentity_unsubcribe_nn_review') == 'T' ? 0 : 1;
					mess['Promotional_Messages'] = nlapiGetFieldValue('custentity_unsubscribe_promotions') == 'T' ? 0 : 1;
					
					for (var i = 1; i <= nlapiGetLineItemCount('addressbook'); i++) {
						if (nlapiGetLineItemValue('addressbook', 'defaultshipping', i) == 'T') {
			
							mess['Address_1'] = encodeURIComponent(nlapiGetLineItemValue('addressbook', 'addr1', i));
							mess['Address_2'] = encodeURIComponent(nlapiGetLineItemValue('addressbook', 'addr2', i));
			
							mess['AddressFull'] = encodeURIComponent(nlapiGetLineItemValue('addressbook', 'addr1', i));
							if (nlapiGetLineItemValue('addressbook', 'addr2', i) != '') {
								mess['AddressFull'] += ', ' + encodeURIComponent(nlapiGetLineItemValue('addressbook', 'addr2', i));
							}
							mess['AddressCity'] = encodeURIComponent(nlapiGetLineItemValue('addressbook', 'city', i));
							mess['AddressProvince'] = encodeURIComponent(nlapiGetLineItemValue('addressbook', 'state', i));
							mess['AddressPostalCode'] = encodeURIComponent(nlapiGetLineItemValue('addressbook', 'zip', i));
						}
					}
		
					mess['contacts_count'] = 0;
					
		/*			nlapiLogExecution("DEBUG", "CONTACTS FOUND",nlapiGetLineItemCount('contacts'));
					for (var i = 1; i <= nlapiGetLineItemCount('contacts'); i++) {
						var lbl_fname = 'firstname_' + i; 
						var lbl_lname = 'lastname_' + i;
						var lbl_role = 'role_' + i;
						var lbl_email = 'email_' +i;
						var lbl_tel= 'phone_' +i;
						var lbl_id = 'entityid_' +i;
						mess[lbl_fname] = nlapiGetLinteItemValue('contacts', 'firstname', i);
						mess[lbl_lname] = nlapiGetLinteItemValue('contacts', 'lastname', i);
						mess[lbl_role] = nlapiGetLinteItemValue('contacts', 'role', i);
						mess[lbl_email] = nlapiGetLinteItemValue('contacts', 'email', i);
						mess[lbl_tel] = nlapiGetLinteItemValue('contacts', 'phone', i);
						mess[lbl_id] = nlapiGetLinteItemValue('contacts', 'entityid', i);
					}
					mess['contacts_count'] = i;
			*/		
					
					//logEntries(mess);
					
					var now = new Date();
					//nlapiLogExecution('Debug', "About to call 411 and send update", "START");
					
					var loopcontrol = 1;
					while (loopcontrol <=3){
						try {
							nlapiLogExecution("Debug",a9r_server + '/api/ns-update?key='+api_key+'&noCache=','');
							var response = nlapiRequestURL( a9r_server + '/api/ns-update?key='+api_key+'&noCache=' + Math.round(now.getTime() * Math.random()), mess, null );
							
							var result_st = response.getBody();
							loopcontrol = 4;
							nlapiLogExecution('Debug', "411 called", response.getBody());
							nlapiLogExecution('Debug', "411 Update Complete", result_st);
		
							var myArray = eval("[" + result_st + "]");  
							if (myArray[0].result!='successful') {
								nlapiLogExecution("Debug", '411.ca database update error!', myArray[0].result);
							}
							else{
								var rec = nlapiLoadRecord('customer', recordID); 
								rec.setFieldValue('custentity_a9r_recordupdate', '');
								nlapiSubmitRecord(rec) ;
							}
						}
						catch (e){
							if (e=='SyntaxError: missing ] after element list') {
								loopcontrol = loopcontrol+1;					
								if (loopcontrol<4){
									nlapiLogExecution("System", "ns-update timedout, connection timed out, retrying..., for "+ customer_id , e);	
								}
								else{
									nlapiLogExecution("System", "ns-update timedout, connection timed out for "+ customer_id , e);	
								}
							}
							else {
								if (e.getCode()=='SSS_REQUEST_TIME_EXCEEDED') {
									loopcontrol = loopcontrol+1;					
									if (loopcontrol<4){
										nlapiLogExecution("Error", "ns-update timedout, retrying....  pl= "+ customer_id , e);
									}
									else {
										nlapiLogExecution("Error", "ns-update all attempts timedout. pl="+ customer_id , e);
									}
								}
								else{
									nlapiLogExecution("Debug", '411.ca database update error!', "UNKNOWN ERROR");
								}
							}
						}					
					}
				}
			}
			catch (e){
				nlapiLogExecution('Error', 'Unable to update 411 with sync changes', e);
				//return false;
			}
		}
		
		if (type == 'edit'||type=='xedit') {
			var unstatus = nlapiGetFieldValue('globalsubscriptionstatus');
			if (unstatus==SUBSCRIPTION_SOFTOUT||unstatus==SUBSCRIPTION_CONFOUT){
				if(nlapiGetFieldValue('custentity_unsubscribe_adtips')!='T'){
					nlapiSetFieldValue('custentity_unsubscribe_adtips', 'T');		
				}
				if(nlapiGetFieldValue('custentity_unsubscribe_marktips')!='T'){
					nlapiSetFieldValue('custentity_unsubscribe_marktips', 'T');		
				}
				if(nlapiGetFieldValue('custentity_unsubscribe_websiteinfo')!='T'){
					nlapiSetFieldValue('custentity_unsubscribe_websiteinfo', 'T');
				}		
				if(nlapiGetFieldValue('custentity_unsubcribe_positive_review')!='T'){
					nlapiSetFieldValue('custentity_unsubcribe_positive_review', 'T');
				}
				if(nlapiGetFieldValue('custentity_unsubcribe_nn_review')!='T'){
					nlapiSetFieldValue('custentity_unsubcribe_nn_review', 'T');
				}
				if(nlapiGetFieldValue('custentity_unsubscribe_promotions')!='T'){
					nlapiSetFieldValue('custentity_unsubscribe_promotions', 'T');
				}
			}
		}
		
		if (type == 'create') {
			if (nlapiGetFieldValue('custentity_cancel_url')==null||nlapiGetFieldValue('custentity_cancel_url')==''){
				try {
					var cancel_suiteletURL = nlapiResolveURL('SUITELET', 'customscript_cancellationrequest', 'customdeploy_cancellationrequest');
					cancelURL = cancel_suiteletURL+'&custid='+recordID;
					var rec = nlapiLoadRecord('customer', recordID); 
					rec.setFieldValue('custentity_cancel_url', cancelURL);
					nlapiSubmitRecord(rec) ;
				}
				catch (e){
					nlapiLogExecution("Error", "Unable to update cancel URL", e);				
				}
			}
		}
		
		if (type == 'edit') {

			var welcomeTrigger  = nlapiGetFieldValue('custentity_welcomecampaigntrigger');
			if (welcomeTrigger=='T'){
				if (!setupAndStartWelcomeCampaign(recordID)){
					return false;		
				}
				else{
					try {
						var rec = nlapiLoadRecord('customer', recordID); 
						rec.setFieldValue('custentity_welcomecampaigntrigger', '');
						nlapiSubmitRecord(rec) ;
					}
					catch (e){
						nlapiLogExecution("Error", "Unable to update confirmation field for Welcome Campaign", e);				
					}
				}
			}
			
			var createWebUpsellSalesOrder_trigger= nlapiGetFieldValue('custentity_websalesordertrigger');
			if (createWebUpsellSalesOrder_trigger=='T'){
				var salesrecordId=createWebUpSellSalesOrder();
				if (salesrecordId!=null){
					try {
						var rec = nlapiLoadRecord('customer', recordID); 
						var salesRec = nlapiLoadRecord('salesorder', salesrecordId); 
						rec.setFieldValue('custentity_websalesordertrigger', 'F');
						rec.setFieldValue('custentity_website_upsellattempt', WEBSITEUPSELLSTATUS_Converted);		
	
						var subtotal = salesRec.getFieldValue('subtotal');
					   	var discount = salesRec.getFieldValue('discounttotal');
					   	varsalesRecID = salesRec.getFieldValue('internalid');
					   	if (discount==null||discount=='' ){
					   		discount = 0;	
					   	}
						var amount = parseFloat(subtotal)+parseFloat(discount);		
						var port = rec.getFieldValue('custentity_portfoliovalue');
						if (port==null||port==''){
							port = 0;
						}
						amount  = parseFloat(amount)+parseFloat(port);
						rec.setFieldValue('custentity_portfoliovalue', parseFloat(amount));
					    
						rec.setFieldValue('custentity_est_soldwebsite', YESNO_Yes);
						rec.setFieldValue('custentity_est_createwebsite', YESNO_No);
						rec.setFieldValue('custentity_est_confirmwebsitecreation', YESNO_Yes);
						nlapiSubmitRecord(rec) ;
						
						addnote("OAC UPSELL - WEBSITE", "Website upsell order processed.", nlapiGetUser(), recordID);	
						nlapiLogExecution("Debug", "Redirect to so ", salesrecordId);
						nlapiSetRedirectURL("RECORD",'salesorder', salesrecordId);
					}
					catch(e){
						nlapiLogExecution("Error", "create web upsell order", e);
					}
							
				}
			}	
		
			
		}
	}
	catch (e){
		nlapiLogExecution("Error", "After Customer Submit", e);
	}
	return true;
}

/////////////////////////// FUNCTIONS  //////////////////////////////////////////////////////////////////////////////////////////



function logEntries(mess) {
	
	logEntry('user_id',	mess['user_id']);

	logEntry('salesrep',	mess['salesrep']);
	logEntry('entitystatus',	mess['entitystatus']);
	logEntry('custentity_language',	mess['custentity_language']);

	logEntry('is_display',	mess['is_display']);
	
	logEntry('old_customer_id',	mess['old_customer_id']);
	logEntry('customer_id',	mess['customer_id']);
	logEntry('CompanyName',	mess['CompanyName']);
	logEntry('alt_CompanyName',	mess['alt_CompanyName']);
	
	logEntry('Phone_0',	mess['Phone_0']);
	logEntry('Phone_0_ext',	mess['Phone_0_ext']);
	logEntry('Phone_0_type',	mess['Phone_0_type']);
	logEntry('Phone_0_textual',	mess['Phone_0_textual']);
	
	logEntry('Phone_1',	mess['Phone_1']);
	logEntry('Phone_1_ext',	mess['Phone_1_ext']);
	logEntry('Phone_1_type',	mess['Phone_1_type']);
	logEntry('Phone_1_textual',	mess['Phone_1_textual']);
	
	logEntry('Phone_2',	mess['Phone_2']);
	logEntry('Phone_2_ext',	mess['Phone_2_ext']);
	logEntry('Phone_2_type',	mess['Phone_2_type']);
	logEntry('Phone_2_textual',	mess['Phone_2_textual']);

	logEntry('Phone_3',	mess['Phone_3']);
	logEntry('Phone_3_ext',	mess['Phone_3_ext']);
	logEntry('Phone_3_type',	mess['Phone_3_type']);
	logEntry('Phone_3_textual',	mess['Phone_3_textual']);
	
	logEntry('Phone_4',mess['Phone_4']);
	logEntry('Phone_4_ext',	mess['Phone_4_ext']);
	logEntry('Phone_4_type',	mess['Phone_4_type']);
	logEntry('Phone_4_textual',	mess['Phone_4_textual']);
	
	logEntry('Phone_5',	mess['Phone_5']);
	logEntry('Phone_5_ext',	mess['Phone_5_ext']);
	logEntry('Phone_5_type',	mess['Phone_5_type']);
	logEntry('Phone_5_textual',	mess['Phone_5_textual']);

	logEntry('is_display_address',	mess['is_display_address']);
	logEntry('is_display_email',	mess['is_display_email']);
	logEntry('E_Mail',	mess['E_Mail']);
	logEntry('Comm_E_Mail',	mess['Comm_E_Mail']);
	logEntry('Comm_Firstname',	mess['Comm_Firstname']);
	logEntry('Comm_Lastname',	mess['Comm_Lastname']);
	logEntry('Comm_Language',	mess['Comm_Language']);


	logEntry('Advertising_Tips',	mess['Advertising_Tips']);
	logEntry('Marketing_Tips',	mess['Marketing_Tips']);
	logEntry('Website_Info',	mess['Website_Info']);
	
	logEntry('Address_1',	mess['Address_1']);
	logEntry('Address_2',	mess['Address_2']);
	logEntry('AddressFull',	mess['AddressFull']);
	logEntry('AddressCity',	mess['AddressCity']);
	logEntry('AddressProvince',	mess['AddressProvince']);
	logEntry('AddressPostalCode',	mess['AddressPostalCode']);


	logEntry('contacts_count',	mess['contacts_count']);
	var contactcount= 0;
	try {
		contactcount = mess['contacts_count'];	
	}
	catch(e){
	}
	if (contactcount>0) {
		for ( var i = 0; i < contactcount; i++ ){
			logEntry('firstname_' + i, mess['firstname_' + i]);
			logEntry('lastname_' + i, mess['lastname_' + i]);
			logEntry('role_' + i, mess['role_' + i]);
			logEntry('email_' + i, mess['email_' + i]);
			logEntry('phone_' + i, mess['phone_' + i]);
			logEntry('entityid_' + i, mess['entityid_' + i]);
		}
	}		
}

function logEntry (field, value){
	nlapiLogExecution("Debug", "NS to 411 Update", field +  " # " + value )	;
}

/*
function updateSignature(){
	try{
		var repid = nlapiGetFieldValue('custentitycustservrep');
		var emp = nlapiLoadRecord('employee', repid);
		var firstname = emp.getFieldValue('firstname');
		var lastname = emp.getFieldValue('lastname');
		var email = emp.getFieldValue('email');
		var phone = emp.getFieldValue('phone');

		if (firstname==null){
			firstname = '';
		}
		if (lastname==null){
			lastname = '';
		}
		if (phone==null){
			phone = '';
		}
		if (email==null){
			email = '';
		}
		nlapiSetFieldValue('custentity_comm_signature_name', firstname + " " + lastname , true, true);
		nlapiSetFieldValue('custentity_comm_signature_officephone', phone, true, true);		
		nlapiSetFieldValue('custentity_comm_signature_emailaddress', email, true, true );
		nlapiSetFieldValue('custentity_updatesignature', 'F');
	}
	catch (e)
	{
		nlapiLogExecution('ERROR', e.getCode(), e.getDetails());      
	}	
	
}
*/



/*
function sendAdIsReadyEmail(){	
	
	initialize();
	var customerid = nlapiGetRecordId();
	//var customerid = nlapiGetFieldValue('id');
	var email = nlapiGetFieldValue('email');
	var author = EMPLOYEE411;
	var template = '';
	var commlanguage = nlapiGetFieldValue('custentity_comm_languagepreference');
	var multi = nlapiGetFieldValue('custentity_a9r_associatedbusinesses');
	var evo = false;
	
	if (nlapiGetFieldValue('parent')==EVO_MAIN_COMPANY_ID){evo = true;}
	if (nlapiGetFieldValue('custentity_cxaccounttype')==REPTYPE_Dedicated){
		author = nlapiGetFieldValue('custentitycustservrep');
		if (multi=='T'){
			if (commlanguage==COMMLANGUAGE_FRENCH){
				if (evo){template = ADISREADY_MULTI_DED_FR_EVO;}else{template = ADISREADY_MULTI_DED_FR;}
			}
			else{
				if (evo){template = ADISREADY_MULTI_DED_EN_EVO;}else{template = ADISREADY_MULTI_DED_EN;}
			}
		}
		else {
			if (commlanguage==COMMLANGUAGE_FRENCH){
				if (evo){template = ADISREADY_SINGLE_DED_FR_EVO;}else{template = ADISREADY_SINGLE_DED_FR;}
			}
			else{
				if (evo){template = ADISREADY_SINGLE_DED_EN_EVO;}else{template = ADISREADY_SINGLE_DED_EN;}
			}	
		}
	}
	else {
		if (multi=='T'){
			if (commlanguage==COMMLANGUAGE_FRENCH){
				if (evo){template = ADISREADY_MULTI_FR_EVO;}else{template = ADISREADY_MULTI_FR;}
			}
			else{
				if (evo){template = ADISREADY_MULTI_EN_EVO;}else{template = ADISREADY_MULTI_EN;}
			}
		}
		else {
			if (commlanguage==COMMLANGUAGE_FRENCH){
				if (evo){template = ADISREADY_SINGLE_FR_EVO;}else{template = ADISREADY_SINGLE_FR;}	
			}
			else{
				if (evo){template = ADISREADY_SINGLE_EN_EVO;}else{template = ADISREADY_SINGLE_EN;}	
			}
		}	
	}
	
	if (template==''){
		nlapiLogExecution('Debug', 'Send Ad Is Ready failed', "Template is blank");
		return false;
	}	
	
	if (sendMessage(customerid, author, email, template)){
		nlapiLogExecution('Debug', 'Send Ad Is Ready', customerid + " " + author + " " + email + " " + template);
		addnote("EMAIL SENT", "cx has been sent the Ad Is Ready email", author, customerid);
		
		
		return true;
	}
	else {
		nlapiLogExecution('Debug', 'Send Ad Is Ready failed', "Send Message Failure");
		return false;
	}
}
*/
function createWebUpSellSalesOrder(){
	initialize();
	var context = nlapiGetContext();
	var location = context.getLocation();
	var userDeptId = context.getDepartment();
	var cx = nlapiGetRecordId();

	try {
	
		var rec = nlapiCreateRecord('salesorder');
	    rec.setFieldValue('department', userDeptId);
	    rec.setFieldValue('location', location);
	    try {
	    	rec.setFieldValue('salesrep', nlapiGetUser());
	    }
	    catch (e){
	    	nlapiLogExecution("Error", "Unable to set current user as Sales Rep"+nlapiGetUser(), e);	 
	    }
	    rec.setFieldValue('entity', cx);
        rec.setFieldValue('custbody_paymenttype', nlapiGetFieldValue('custentity_paymenttype'));
        rec.setFieldValue('custbody_contractterm', nlapiGetFieldValue('custentity_contractlength'));
        rec.setFieldValue('custbody3', SALESTYPE_Upsell);
        rec.selectNewLineItem('item');
        rec.setCurrentLineItemValue('item', 'item', ITEM_WEBSITE_site_InvokeToUpsell);
        rec.commitLineItem('item');
        var recID = nlapiSubmitRecord(rec); 
		
        nlapiLogExecution("Debug","Created sales order ", recID);
        return recID;
	}
    catch (e){
        nlapiLogExecution("Error", "Create Sales Order for cx: " +cx, e) ;  
        return null;
    }

	
}

function sendRequestToCancelRecievedEmail(){
	initialize();
	var customerid = nlapiGetRecordId();
	//var customerid = nlapiGetFieldValue('id');
	var email = nlapiGetFieldValue('email');
	var	langpref = nlapiGetFieldValue('custentity_comm_languagepreference'); 
	var template = REQUESTTOCANCEL_EN;
	if (langpref==COMMLANGUAGE_FRENCH){
		template = REQUESTTOCANCEL_FR;
	}
	if (email!=''&&email!=null){
		if (sendMessage(customerid, EMPLOYEE411, email, template)){
			nlapiLogExecution('Debug', 'Request To Cancel', customerid + " " + EMPLOYEE411 + " " + email + " " + template);
			addnote("EMAIL SENT", "cx has been sent the Request To Cancel Received email", EMPLOYEE411, customerid);
			nlapiSetFieldValue('custentity_retention_sendemailtrigger', 'F');
		}
	}
}

function sendQueuedBusinessCardEmail(){	
	
	initialize();
	var customerid = nlapiGetRecordId();
	//var customerid = nlapiGetFieldValue('id');
	var customer = nlapiGetFieldValue('entityid');
	var email = nlapiGetFieldValue('email');
	var author = EMPLOYEE411;
	if (email==null||email==''){
		nlapiLogExecution('Debug', 'Send Business Cards failed', "Email is blank for customer " + customer);
		return false;
	}
	var commlanguage = nlapiGetFieldValue('custentity_comm_languagepreference');
	var template = '';
	
	if (nlapiGetFieldValue('custentity_cxaccounttype')==REPTYPE_Dedicated){
		author = nlapiGetFieldValue('custentitycustservrep');
		if (commlanguage==COMMLANGUAGE_FRENCH){
			template = BUSINESSCARDS_DED_FR;
		}
		else{
			template = BUSINESSCARDS_DED_EN;
		}
	}
	else {
		if (commlanguage==COMMLANGUAGE_FRENCH){
			template = BUSINESSCARDS_FR;
		}
		else{
			template = BUSINESSCARDS_EN;
		}
	}
	if (template==''){
		nlapiLogExecution('Debug', 'Send Business Cards failed', "Template is blank");
		return false;
	}	
	
	if (sendMessage(customerid, author, email, template)){
		nlapiLogExecution('Debug', 'Send Business Cards', customerid + " " + author + " " + email + " " + template);
		addnote("EMAIL SENT", "cx has been sent the business cards email", author, customerid);
		var today = new Date();
	  	var senddate = nlapiAddDays(today, 30);
		nlapiSetFieldValue('custentity_sendbusinesscardtrigger', 'F');
		nlapiSetFieldValue('custentity_sendfollowupbizcardemaildate', nlapiDateToString(senddate));
		return true;
	}
	else {
		nlapiLogExecution('Debug', 'Send Business Cards failed', "Send Message Failure");
		return false;
	}
}



function isUniqueEntityId(entityid, internalid)
{
	var is_unique = true;

	try {

		var filters = new Array();
		filters[0] = new nlobjSearchFilter('entityid', null, 'is', entityid, null);
	
		var results = new Array();
		results[0] = new nlobjSearchColumn('internalid');
	
		// Execute the search
		var searchresults = nlapiSearchRecord('customer', null, filters, results);
		for ( var i = 0; searchresults != null && i < searchresults.length; i++ )
		{
			var searchresult = searchresults[ i ];
			if (searchresult.getValue('internalid') != internalid) {
				return false;
			}
		}
	
	}
	catch(err) {
		return false;
	}

	return is_unique;
}



	
function update_NS_OutOfSync(profile, custpl){
	initialize();
	var loopcontrol = 1;
	while (loopcontrol <=3){
		try {
			var response = nlapiRequestURL( a9r_server+'/api/ns-sync-confirm?key='+api_key+'&customer_id='+custpl+'&CHECKSUM='+profile['CHECKSUM']);
			//nlapiLogExecution("Debug", "Call A9R: NS OUT OF SYNC" , a9r_server+'/api/ns-sync-confirm?key='+api_key+'&customer_id='+custpl+'&CHECKSUM='+profile['CHECKSUM'] );
			var result_st = response.getBody();
		 	loopcontrol = 4;
			var myArray = eval("[" + result_st + "]");  

			nlapiLogExecution("Debug", "Call A9R: NS OUT OF SYNC SET" , result_st );	
			if (myArray[0].result=='successful') {
				return true;
			}
		}
		catch (e)
		{
			if (e.getCode()=='SSS_REQUEST_TIME_EXCEEDED') {
				loopcontrol = loopcontrol+1;					
				if (loopcontrol<4){
					nlapiLogExecution("System", "update NS Out Of Sync timedout, retrying....  pl= "+ custpl , e);
				}
				else {
					nlapiLogExecution("System", "update NS Out Of Sync timedout on all attempts  pl="+ custpl , e);
					return false;
				}
			}
			else{
				nlapiLogExecution("System", "update NS Out Of Sync failed  pl="+ custpl , e.getDetails());
				return false;	
			}
		}
	}
	return false;
}	

function accessLog(custID, note){
	var logRecord = nlapiCreateRecord('customrecord_accesslog');
	try {
		logRecord.setFieldValue('custrecord_accesslog_customer', custID);
		logRecord.setFieldValue('custrecord_accesslog_note', note);
		nlapiSubmitRecord(logRecord, true, false);
	}
	catch (e)
	{
		nlapiLogExecution('ERROR', e.getCode(), e.getDetails());      
		return false;
	}
	return true;	
}




function addCustomerTo411(){
	var customer_id = '';
	var mess = new Array();
	mess['CHECKSUM'] = 'NEW';
	try {
		
		nlapiLogExecution('Debug', "ADD CUSTOMER", 'Start 411 Update');

		customer_id = parseInt(nlapiGetFieldValue('custentity411custid'));
		
		
		
		mess['user_id'] = nlapiGetUser();

		mess['salesrep'] = encodeURIComponent(nlapiGetFieldValue('salesrep'));
		mess['entitystatus'] = nlapiGetFieldValue('entitystatus');
		mess['custentity_language'] = nlapiGetFieldText('custentity_language');
	
		mess['is_display'] = 1;
		if (nlapiGetFieldValue('custentity_hide_on_site') == 'T') {
			mess['is_display'] = 0;
		}

		
		mess['customer_id'] = customer_id;
		mess['CompanyName'] = encodeURIComponent(nlapiGetFieldValue('companyname'));
		//mess['alt_CompanyName'] = nlapiGetFieldValue('custentity_alternate_company_name');
		

		var lines = nlapiGetLineItemCount('recmachcustrecord_phones_customer');
		if (lines>0){
			for (var i = 1; i <= lines ; i++) {
				var lbl_phone = 'Phone_'+(i-1);
				var lbl_ext = 'Phone_'+(i-1)+'_ext'; 
				var lbl_text ='Phone_'+(i-1)+'_textual';
				var lbl_type = 'Phone_'+(i-1)+'_type';
				mess[lbl_phone] = parseTelNumber(nlapiGetLineItemValue('recmachcustrecord_phones_customer', 'custrecord_phones_number', i));
				mess[lbl_ext] = nlapiGetLineItemValue('recmachcustrecord_phones_customer', 'custrecord_phones_ext', i);
				mess[lbl_text] = nlapiGetLineItemValue('recmachcustrecord_phones_customer', 'custrecord_phones_textual', i);
				switch (nlapiGetLineItemValue('recmachcustrecord_phones_customer', 'custrecord_phones_type', i)){
					case PHONETYPE_CELL		: 	mess[lbl_type] = A9RPHONETYPE_CELL ;
												break;
					case PHONETYPE_TOLLFREE	: 	mess[lbl_type] = A9RPHONETYPE_TOLLFREE ;
												break;
					case PHONETYPE_FAX		: 	mess[lbl_type] = A9RPHONETYPE_FAX ;
												break;
					default					:	mess[lbl_type] = A9RPHONETYPE_PHONE ;
												break;
				}
			}
		}


		mess['is_display_address'] = 1;
		if (nlapiGetFieldValue('custentity_displayaddress') == 'F') {
			mess['is_display_address'] = 0;
		}

		mess['is_display_email'] = 1;
		if (nlapiGetFieldValue('custentity_displayemail') == 'F') {
			mess['is_display_email'] = 0;
		}

		mess['E_Mail'] = nlapiGetFieldValue('custentity_email_business');
		mess['Comm_E_Mail'] = nlapiGetFieldValue('email');
		mess['Comm_Firstname'] = nlapiGetFieldValue('custentity_comm_firstname');
		mess['Comm_Lastname'] = nlapiGetFieldValue('custentity_comm_lastname');
		mess['Comm_Language'] = nlapiGetFieldValue('custentity_comm_languagepreference');
	
		mess['Advertising_Tips'] = nlapiGetFieldValue('custentity_unsubscribe_adtips') == 'T' ? 0 : 1;
		mess['Marketing_Tips'] = nlapiGetFieldValue('custentity_unsubscribe_marktips') == 'T' ? 0 : 1;
		mess['Website_Info'] = nlapiGetFieldValue('custentity_unsubscribe_websiteinfo') == 'T' ? 0 : 1;
		mess['Review_Positive'] = nlapiGetFieldValue('custentity_unsubcribe_positive_review') == 'T' ? 0 : 1;
		mess['Review_Neutral_Negative'] = nlapiGetFieldValue('custentity_unsubcribe_nn_review') == 'T' ? 0 : 1;
		mess['Promotional_Messages'] = nlapiGetFieldValue('custentity_unsubscribe_promotions') == 'T' ? 0 : 1;
		
		for (var i = 1; i <= nlapiGetLineItemCount('addressbook'); i++) {
			if (nlapiGetLineItemValue('addressbook', 'defaultshipping', i) == 'T') {

				mess['Address_1'] = encodeURIComponent(nlapiGetLineItemValue('addressbook', 'addr1', i));
				mess['Address_2'] = encodeURIComponent(nlapiGetLineItemValue('addressbook', 'addr2', i));

				mess['AddressFull'] = encodeURIComponent(nlapiGetLineItemValue('addressbook', 'addr1', i));
				if (nlapiGetLineItemValue('addressbook', 'addr2', i) != '') {
					mess['AddressFull'] += ', ' + encodeURIComponent(nlapiGetLineItemValue('addressbook', 'addr2', i));
				}
				mess['AddressCity'] = encodeURIComponent(nlapiGetLineItemValue('addressbook', 'city', i));
				mess['AddressProvince'] = encodeURIComponent(nlapiGetLineItemValue('addressbook', 'state', i));
				mess['AddressPostalCode'] = encodeURIComponent(nlapiGetLineItemValue('addressbook', 'zip', i));
			}
		}

		mess['contacts_count'] = 0;
		
/*			nlapiLogExecution("DEBUG", "CONTACTS FOUND",nlapiGetLineItemCount('contacts'));
			for (var i = 1; i <= nlapiGetLineItemCount('contacts'); i++) {
				var lbl_fname = 'firstname_' + i; 
				var lbl_lname = 'lastname_' + i;
				var lbl_role = 'role_' + i;
				var lbl_email = 'email_' +i;
				var lbl_tel= 'phone_' +i;
				var lbl_id = 'entityid_' +i;
				mess[lbl_fname] = nlapiGetLinteItemValue('contacts', 'firstname', i);
				mess[lbl_lname] = nlapiGetLinteItemValue('contacts', 'lastname', i);
				mess[lbl_role] = nlapiGetLinteItemValue('contacts', 'role', i);
				mess[lbl_email] = nlapiGetLinteItemValue('contacts', 'email', i);
				mess[lbl_tel] = nlapiGetLinteItemValue('contacts', 'phone', i);
				mess[lbl_id] = nlapiGetLinteItemValue('contacts', 'entityid', i);
			}
			mess['contacts_count'] = i;
	*/		//logEntries(mess);
		
		//mess['nsOutOfSync'] = false;
		mess['CHECKSUM'] = 'NEW';
		
		var now = new Date();
		nlapiLogExecution('Debug', "About to call 411 and ADD CUSTOMER", "START");
		
		var loopcontrol = 1;
		while (loopcontrol <=3){
			try {
				var response = nlapiRequestURL( a9r_server + '/api/ns-update?key='+api_key+'&noCache=' + Math.round(now.getTime() * Math.random()), mess, null );
				var result_st = response.getBody();
				loopcontrol = 4;
				nlapiLogExecution('Debug', "411 called to ADD CUSTOMER, Response:", response.getBody());
				nlapiLogExecution('Debug', "411 Update Complete, Response: ", result_st);
	
				var myArray = eval("[" + result_st + "]");  
			
				//nlapiLogExecution('Debug', "m1 nsoutofsync", myArray[0].nsOutOfSync);
				//nlapiLogExecution('Debug', "m2 result", myArray[0].result);
	
			
			/*
				if (myArray[0].nsOutOfSync==true && myArray[0].result=='fail') {
					if (!update_NS_OutOfSync2(customer_id)){
						nlapiLogExecution('Error', "SYNC UPDATE FAILED", customer_id);
						return false;
					}	
			
				}
			*/	
				if (myArray[0].result!='successful') {
					return false;	
				}
				else {
					return true;
				}
			
			
			}
			catch (e){
				if (e.getCode()=='SSS_REQUEST_TIME_EXCEEDED') {
					loopcontrol = loopcontrol+1;					
					if (loopcontrol<4){
						nlapiLogExecution("Error", "ns-update failed , timed out, retrying... PL="+ customer_id , e);
					}
					else{
						nlapiLogExecution("Error", "ns-update failed , timed out on all attempts PL="+ customer_id , e);
						return false;
					}
				}
				else{
					nlapiLogExecution("Error", "ns-update failed"+ customer_id , e);
					return false;	
				}
			}
		}				
	}
	catch (e){
		nlapiLogExecution("Error", "ADDING CUSTOMER TO 411"+ customer_id , e);
		return false;	
		
	}
	
}



	
	
