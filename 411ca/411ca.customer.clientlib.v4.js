/**
 * Module Description
 * 
 * Version    Date            Author           Remarks
 * 1.00       09 Aug 2012     MWise
 *m
 */
 
/**
 * The recordType (internal id) corresponds to the "Applied To" record in your script deployment. 
 * @appliedtorecord recordType 
 * 
 * @param {String} type Access mode: create, copy, edit
 * @returns {Void}
 */

var script_user_id = 8568;
var user_id = '';
var enable_customer_id_field = false;
var old_customer_id = 0;
var old_entityid = '';
var old_customeralert = '';
var environment = '';
var FieldSyncList = new Array();
var recordmode = '';	

/****************************************************************************************************************
*										ENVIRONMENTAL CONTROLS	  												*
*****************************************************************************************************************/

/****************************************************************************************************************
*											CLIENT EVENTS														*
/****************************************************************************************************************/

function initializeFieldList(){
		
		FieldSyncList[0] =  'companyname';
		FieldSyncList[1] = 'custentity_displayaddress';
		FieldSyncList[2] = 'custentity_displayemail';
		FieldSyncList[3] = 'custentity_email_business';
		FieldSyncList[4] = 'email';
		FieldSyncList[5] = 'custentity_comm_firstname';
		FieldSyncList[6] = 'custentity_comm_lastname';
		FieldSyncList[7] = 'custentity_language';
		FieldSyncList[8] = 'custentity_comm_languagepreference';
		FieldSyncList[8] = 'custentity_unsubscribe_adtips';
		FieldSyncList[10] = 'custentity_unsubscribe_marktips';
		FieldSyncList[11] = 'custentity_unsubscribe_websiteinfo';
		FieldSyncList[12] = 'custentity_hide_on_site';
		FieldSyncList[13] = 'custentity_unsubcribe_positive_review';
		FieldSyncList[14] = 'custentity_unsubcribe_nn_review';
		FieldSyncList[15] = 'custentity_unsubscribe_promotions';

}

function pageInit_admin() {
	enable_customer_id_field = true;
	pageInit();
}


function pageInit(type) {

	nlapiLogExecution("DEBUG", "PAGEINIT", "start");

	initialize();

	try {

		var customer_id = nlapiGetFieldValue('custentity411custid');
		old_customer_id = customer_id;
		var entityid = nlapiGetFieldValue('entityid');
		old_entityid = entityid;
		var rec_id = nlapiGetRecordId();
		var stage = nlapiGetFieldValue('stage');
				
		var syncwithA9R_controller = false;
		var profile = '';
		var role = nlapiGetRole(); 
	
	
		if (type == 'create' ) {
			recordmode = 'create';
		}

		nlapiLogExecution("DEBUG", "PAGEINIT","START");
		
	
		if (type == 'edit' || type == 'xedit' ) {
		
		
			nlapiLogExecution("Debug", "setting sync control field", '1');
		
			nlapiSetFieldValue('custentity_a9r_recordupdate', '', false, true);
		
			recordmode = 'initialize';
			if (role==ROLE_ADMIN||role==ROLE_OAC_MGR||role==ROLE_OAC_MGR_ENH||role==ROLE_OAC_MGR_MTL||
					role==ROLE_OAC||role==ROLE_OAC_MTL||role==ROLE_EST || role==ROLE_RETENTION ){
				syncwithA9R_controller = true;
			}  
		}
		
	
		if ((stage== 'CUSTOMER') && (customer_id == '') && (rec_id == '' )) {
			customer_id = parseInt(getNewCustomerID());
			nlapiSetFieldValue('custentity411custid', customer_id, false, true);
			//alert(customer_id);
			if (customer_id <= 0) {
				alert('ERROR: Cannot receive customer_id!');
			}
		}
	
		
		if (! enable_customer_id_field) {
			nlapiDisableField('custentity411custid', true);
		}
	
	
		//nlapiSetFieldValue('custentity_a9r_recordupdate', '', false, true);	
		if (syncwithA9R_controller) {
	
			if (customer_id>0){
				nlapiLogExecution("DEBUG", "SYNC ROUTINE", "start");
	//			try {
					profile = getBusinessProfile(customer_id);
	
					if (profile!=null){
						if (profile['timedout']==true){
							syncmess = '<font color="black" style="background-color: rgb(255, 255, 255); " size="2"><b>Connection Timed Out to 411,... Refresh and try again.</b></font><div style="font-size: 8pt; "></div><br>';	
						}
						else {
							if (profile['notfound']==true){
								if (!addCustomerTo411()){
									syncmess = '<font color="#ff0000" style="background-color: rgb(255, 255, 255); " size="3"><b>UNABLE TO ADD THIS CUSTOMER ON 411.</b></font><div style="font-size: 8pt; "></div><br>';	
								}
								else{
									syncmess = '<font color="black" style="background-color: rgb(255, 255, 255); " size="2"><b>Record added to 411.</b></font><div style="font-size: 8pt; "></div><br>';
								}
							}
							else {
								nlapiSetFieldValue('custentity_a9r_checksum', profile['CHECKSUM']);
								if (profile['nsOutOfSync']==true){
									if (updateNetsuite(profile, entityid, customer_id)){
										nlapiSetFieldValue('custentity_a9r_recordsync', 'T', false, true);
										nlapiSetFieldValue('custentity_a9r_recordupdate', 'T', false, true);	
									}
									else{
										syncmess = '<font color="#ff0000" style="background-color: rgb(255, 255, 255); " size="3"><b>Synchronization between Netsuite and 411 failed.</b></font><div style="font-size: 8pt; "></div><br>';
									} 						
								}
								else{
									nlapiLogExecution("Debug", "record in sync", customer_id);
								}
							}	
						}
					}
					else{
						syncmess = '<font color="#ff0000" style="background-color: rgb(255, 255, 255); " size="3"><b>System Error. UNABLE TO RETRIEVE CUSTOMER FROM 411 AT THIS TIME.</b></font><div style="font-size: 8pt; "></div><br>';
					}
			}
			else{
				syncmess = '<font color="#ff0000" style="background-color: rgb(255, 255, 255); " size="3"><b>There is no CUSTPL# registered to this customer.</b></font><div style="font-size: 8pt; "></div><br>';
			}
		}

		
		
	
		//WEBSITE - UPSELL & REVOKE & CONVERT TO SALE button(s)	
		
		var upsellstate  = nlapiGetFieldValue('custentity_website_upsellattempt');
		var channel  = nlapiGetFieldValue('custentity_websitesaleschannel');
		var web = nlapiGetFieldValue('custentity_website');
		var webbuttonHTML = '';
		if (web!='T'){
			webbuttonHTML = '<input type=button style="width: 100px;" value="Invoke to Upsell" onClick="JavaScript:upsellwebsite()">&nbsp;<input type=button style="width: 100px;" value="Web to Mobile" onClick="JavaScript:upsellwebsite(\'Web||Mobile\')">';
		}
		else {	
			if (channel==WEBSITESALESCHAN_OACUpSell){
				switch (upsellstate){
					case WEBSITEUPSELLSTATUS_Attempt : 
						webbuttonHTML = '<input type=button style="width: 100px;" value="Revoke Website" onClick="JavaScript:revokewebsite()">' + 
						'&nbsp;<input type=button style="width: 100px;" value="Convert to Sale" onClick="JavaScript:convertwebupsell()">';
						break;
					case WEBSITEUPSELLSTATUS_Lost :
						webbuttonHTML = '<input type=button style="width: 100px;" value="Invoke to Upsell" onClick="JavaScript:upsellwebsite()">&nbsp;<input type=button style="width: 100px;" value="Web to Mobile" onClick="JavaScript:upsellwebsite(\'Web||Mobile\')">';
						break;
				}
			}
			else{
				if (nlapiGetFieldValue('custentity_website_publishstatus')!=WEBSITEPUBSTATUS_Published||nlapiGetFieldValue('custentity_websiterevoked')=='T'){
					webbuttonHTML = '<input type=button style="width: 100px;" value="Invoke to Upsell" onClick="JavaScript:upsellwebsite()">&nbsp;<input type=button style="width: 100px;" value="Web to Mobile" onClick="JavaScript:upsellwebsite(\'Web||Mobile\')">';
				}
			}
		}
		document.getElementById('custentity_websitebutton0_val').innerHTML = webbuttonHTML;

	
		
	/*	//ESTABLISHMENT FIELDS  (Verticals)
		switch (nlapiGetFieldValue('custentity_vertical_type')) {
			case '' 				: 	nlapiDisableField('custentity_vertical_sf', true);
										nlapiDisableField('custentity_vertical_nosf', true);
										break;
			case VERTICALTYPES_SF 	: 	nlapiDisableField('custentity_vertical_sf', false);
										nlapiDisableField('custentity_vertical_nosf', true);
										break;
			case VERTICALTYPES_NoSF	: 	nlapiDisableField('custentity_vertical_sf', true);
										nlapiDisableField('custentity_vertical_nosf', false);
										break;
		} 
		
		//BUSINESS CARD BATCHES
		if (nlapiGetFieldValue('custentity_businesscards')=='T') {
			nlapiDisableField('custentity_businesscardbatch', false);
		}
		else {
			nlapiDisableField('custentity_businesscardbatch', true);					
		} 
	*/
		//Cache original value (s)
		//CUSTOMER ALERT : 
		old_customeralert = nlapiGetFieldValue('custentity_customeralert');
		if (old_customeralert==null){
			old_customeralert = '';
		}
		recordmode = 'edit';
		initializeFieldList();
		
		var unstatus = nlapiGetFieldValue('globalsubscriptionstatus');
		if (unstatus==SUBSCRIPTION_SOFTOUT||unstatus==SUBSCRIPTION_CONFOUT){
			if(nlapiGetFieldValue('custentity_unsubscribe_adtips')!='T'){
				nlapiSetFieldValue('custentity_unsubscribe_adtips', 'T', true, true);		
			}
			if(nlapiGetFieldValue('custentity_unsubscribe_marktips')!='T'){
				nlapiSetFieldValue('custentity_unsubscribe_marktips', 'T', true, true);		
			}
			if(nlapiGetFieldValue('custentity_unsubscribe_websiteinfo')!='T'){
				nlapiSetFieldValue('custentity_unsubscribe_websiteinfo', 'T', true, true);
			}		
			if(nlapiGetFieldValue('custentity_unsubcribe_positive_review')!='T'){
				nlapiSetFieldValue('custentity_unsubcribe_positive_review', 'T', true, true);
			}
			if(nlapiGetFieldValue('custentity_unsubcribe_nn_review')!='T'){
				nlapiSetFieldValue('custentity_unsubcribe_nn_review', 'T', true, true);
			}
			if(nlapiGetFieldValue('custentity_unsubscribe_promotions')!='T'){
				nlapiSetFieldValue('custentity_unsubscribe_promotions', 'T', true, true);
			}
		}
	}
	catch(e){
		nlapiLogExecution("Error", "Page Init Error",e);
		alert("Error during page initialization");
	}
}
////////////////////END OF ///////////////////////////////////////////

function updateNetsuite(profile, internalid, custpl){
	nlapiLogExecution('Debug', '411 Updating Netsuite', "CustomerPL=:"+custpl);
	initialize();
	try {
		nlapiSetFieldValue('custentity_displayaddress', profile['is_display_address'] == 1 ? 'T' : 'F', false, true);
		nlapiSetFieldValue('custentity_displayemail', profile['is_display_email'] == 1 ? 'T' : 'F', false, true);
	 		
		nlapiSetFieldValue('custentity_email_business', profile['E_Mail'] , false, true);
		
		var em = profile['Comm_E_Mail'];
		if (em!=null&&em!=''){
			nlapiSetFieldValue('email', em, false, true);
		}
		nlapiSetFieldValue('custentity_comm_firstname', profile['Comm_Firstname'], false, true);
		nlapiSetFieldValue('custentity_comm_lastname',profile['Comm_Lastname'] , false, true);
		
		nlapiSetFieldValue('custentity_comm_languagepreference', profile['Comm_Language']=='French' ? COMMLANGUAGE_FRENCH : COMMLANGUAGE_ENGLISH, false, true);
		
		nlapiSetFieldValue('custentity_unsubscribe_adtips', profile['Advertising_Tips'] != 1 ? 'T' : 'F', false, true);
		nlapiSetFieldValue('custentity_unsubscribe_marktips', profile['Marketing_Tips'] != 1 ? 'T' : 'F', false, true);
		nlapiSetFieldValue('custentity_unsubscribe_websiteinfo', profile['Website_Info'] != 1 ? 'T' : 'F', false, true);
		nlapiSetFieldValue('custentity_unsubcribe_positive_review', profile['Review_Positive'] != 1 ? 'T' : 'F', false, true);
		nlapiSetFieldValue('custentity_unsubcribe_nn_review', profile['Review_Neutral_Negative'] != 1 ? 'T' : 'F', false, true);
		nlapiSetFieldValue('custentity_unsubscribe_promotions', profile['Promotional_Messages'] != 1 ? 'T' : 'F', false, true);
		
		var noOfBusinesses = 1;
		noOfBusinesses = profile['numberOfAssociatedBusinesses'];
		if (noOfBusinesses>1){
			nlapiSetFieldValue('custentity_a9r_multiplebusinesses', 'T', false, true);
		}
		else{
			nlapiSetFieldValue('custentity_a9r_multiplebusinesses', 'F', false, true);
		}
		
		while (nlapiGetLineItemCount('recmachcustrecord_phones_customer')>0){
			nlapiRemoveLineItem('recmachcustrecord_phones_customer', 1);	
		}
		
		if (profile['Phone_0']!=null&&profile['Phone_0']!=''){
			var type = profile['Phone_0_type']; 
			var teltype = '';
			switch (type) {
				case 'phone' 		: 	teltype = PHONETYPE_PHONE;
										break;
				case 'cell' 		: 	teltype = PHONETYPE_CELL;
										break;
				case 'toll-free' 	: 	teltype = PHONETYPE_TOLLFREE;
										break;
				case 'fax' 			: 	teltype = PHONETYPE_FAX;
										break;
			} 
			if (teltype!=''){
				nlapiSelectNewLineItem('recmachcustrecord_phones_customer');
				nlapiSetCurrentLineItemValue('recmachcustrecord_phones_customer', 'custrecord_phones_type', teltype, false, true);
				nlapiSetCurrentLineItemValue('recmachcustrecord_phones_customer', 'custrecord_phones_number', profile['Phone_0'], false, true);
				nlapiSetCurrentLineItemValue('recmachcustrecord_phones_customer', 'custrecord_phones_ext', profile['Phone_0_ext'], false, true);
				nlapiSetCurrentLineItemValue('recmachcustrecord_phones_customer', 'custrecord_phones_textual', profile['Phone_0_textual'], false, true);
				nlapiCommitLineItem('recmachcustrecord_phones_customer');
			}
		}			
		if (profile['Phone_1']!=null&&profile['Phone_1']!=''){
			var type = profile['Phone_1_type']; 
			var teltype = '';
			switch (type) {
				case 'phone' 		: 	teltype = PHONETYPE_PHONE;
										break;
				case 'cell' 		: 	teltype = PHONETYPE_CELL;
										break;
				case 'toll-free' 	: 	teltype = PHONETYPE_TOLLFREE;
										break;
				case 'fax' 			: 	teltype = PHONETYPE_FAX;
										break;
			} 
			if (teltype!=''){
				nlapiSelectNewLineItem('recmachcustrecord_phones_customer');
				nlapiSetCurrentLineItemValue('recmachcustrecord_phones_customer', 'custrecord_phones_type', teltype, false, true);
				nlapiSetCurrentLineItemValue('recmachcustrecord_phones_customer', 'custrecord_phones_number', profile['Phone_1'], false, true);
				nlapiSetCurrentLineItemValue('recmachcustrecord_phones_customer', 'custrecord_phones_ext', profile['Phone_1_ext'], false, true);
				nlapiSetCurrentLineItemValue('recmachcustrecord_phones_customer', 'custrecord_phones_textual', profile['Phone_1_textual'], false, true);
				nlapiCommitLineItem('recmachcustrecord_phones_customer');
			}
		}			
		if (profile['Phone_2']!=null&&profile['Phone_2']!=''){
			var type = profile['Phone_2_type']; 
			var teltype = '';
			switch (type) {
				case 'phone' 		: 	teltype = PHONETYPE_PHONE;
										break;
				case 'cell' 		: 	teltype = PHONETYPE_CELL;
										break;
				case 'toll-free' 	: 	teltype = PHONETYPE_TOLLFREE;
										break;
				case 'fax' 			: 	teltype = PHONETYPE_FAX;
										break;
			} 
			if (teltype!=''){
				nlapiSelectNewLineItem('recmachcustrecord_phones_customer');
				nlapiSetCurrentLineItemValue('recmachcustrecord_phones_customer', 'custrecord_phones_type', teltype, false, true);
				nlapiSetCurrentLineItemValue('recmachcustrecord_phones_customer', 'custrecord_phones_number', profile['Phone_2'], false, true);
				nlapiSetCurrentLineItemValue('recmachcustrecord_phones_customer', 'custrecord_phones_ext', profile['Phone_2_ext'], false, true);
				nlapiSetCurrentLineItemValue('recmachcustrecord_phones_customer', 'custrecord_phones_textual', profile['Phone_2_textual'], false, true);
				nlapiCommitLineItem('recmachcustrecord_phones_customer');
			}
		}			
		if (profile['Phone_3']!=null&&profile['Phone_3']!=''){
			var type = profile['Phone_3_type']; 
			var teltype = '';
			switch (type) {
				case 'phone' 		: 	teltype = PHONETYPE_PHONE;
										break;
				case 'cell' 		: 	teltype = PHONETYPE_CELL;
										break;
				case 'toll-free' 	: 	teltype = PHONETYPE_TOLLFREE;
										break;
				case 'fax' 			: 	teltype = PHONETYPE_FAX;
										break;
			} 
			if (teltype!=''){
				nlapiSelectNewLineItem('recmachcustrecord_phones_customer');
				nlapiSetCurrentLineItemValue('recmachcustrecord_phones_customer', 'custrecord_phones_type', teltype, false, true);
				nlapiSetCurrentLineItemValue('recmachcustrecord_phones_customer', 'custrecord_phones_number', profile['Phone_3'], false, true);
				nlapiSetCurrentLineItemValue('recmachcustrecord_phones_customer', 'custrecord_phones_ext', profile['Phone_3_ext'], false, true);
				nlapiSetCurrentLineItemValue('recmachcustrecord_phones_customer', 'custrecord_phones_textual', profile['Phone_3_textual'], false, true);
				nlapiCommitLineItem('recmachcustrecord_phones_customer');
			}
		}			
		if (profile['Phone_4']!=null&&profile['Phone_4']!=''){
			var type = profile['Phone_4_type']; 
			var teltype = '';
			switch (type) {
				case 'phone' 		: 	teltype = PHONETYPE_PHONE;
										break;
				case 'cell' 		: 	teltype = PHONETYPE_CELL;
										break;
				case 'toll-free' 	: 	teltype = PHONETYPE_TOLLFREE;
										break;
				case 'fax' 			: 	teltype = PHONETYPE_FAX;
										break;
			} 
			if (teltype!=''){
				nlapiSelectNewLineItem('recmachcustrecord_phones_customer');
				nlapiSetCurrentLineItemValue('recmachcustrecord_phones_customer', 'custrecord_phones_type', teltype, false, true);
				nlapiSetCurrentLineItemValue('recmachcustrecord_phones_customer', 'custrecord_phones_number', profile['Phone_4'], false, true);
				nlapiSetCurrentLineItemValue('recmachcustrecord_phones_customer', 'custrecord_phones_ext', profile['Phone_4_ext'], false, true);
				nlapiSetCurrentLineItemValue('recmachcustrecord_phones_customer', 'custrecord_phones_textual', profile['Phone_4_textual'], false, true);
				nlapiCommitLineItem('recmachcustrecord_phones_customer');
			}
		}			
		if (profile['Phone_5']!=null&&profile['Phone_5']!=''){
			var type = profile['Phone_5_type']; 
			var teltype = '';
			switch (type) {
				case 'phone' 		: 	teltype = PHONETYPE_PHONE;
										break;
				case 'cell' 		: 	teltype = PHONETYPE_CELL;
										break;
				case 'toll-free' 	: 	teltype = PHONETYPE_TOLLFREE;
										break;
				case 'fax' 			: 	teltype = PHONETYPE_FAX;
										break;
			} 
			if (teltype!=''){
				nlapiSelectNewLineItem('recmachcustrecord_phones_customer');
				nlapiSetCurrentLineItemValue('recmachcustrecord_phones_customer', 'custrecord_phones_type', teltype, false, true);
				nlapiSetCurrentLineItemValue('recmachcustrecord_phones_customer', 'custrecord_phones_number', profile['Phone_5'], false, true);
				nlapiSetCurrentLineItemValue('recmachcustrecord_phones_customer', 'custrecord_phones_ext', profile['Phone_5_ext'], false, true);
				nlapiSetCurrentLineItemValue('recmachcustrecord_phones_customer', 'custrecord_phones_textual', profile['Phone_5_textual'], false, true);
				nlapiCommitLineItem('recmachcustrecord_phones_customer');
			}
		}			
	
		var numberOfAddresses = nlapiGetLineItemCount('addressbook');
		nlapiLogExecution('DEBUG', 'Update Address', numberOfAddresses);
		
		var insert = true;
		try {
			for (var i=1; i <= numberOfAddresses; i++)
			{
				var defaultshipping = nlapiGetLineItemValue('addressbook','defaultshipping',i);
				var defaultbilling = nlapiGetLineItemValue('addressbook','defaultbilling',i);
				if (defaultshipping=='T'){
					if(defaultbilling=='T'){
						nlapiLogExecution('DEBUG', 'Updating address', "Reclassifying address as billing only");
						nlapiSelectLineItem('addressbook',i);
						nlapiSetCurrentLineItemValue('addressbook', 'defaultshipping', 'F', false, true);
						nlapiCommitLineItem('addressbook');
						insert = true;
					}
					else {
						insert = false;
					}
				}
				else{
					insert = true;
				}
			}
		}
		catch(e){
			nlapiLogExecution('Error', 'Address Reclassifing', e);
		}
		if (insert){
			try {
				nlapiLogExecution('DEBUG', 'Inserting new address', '');
				nlapiSelectNewLineItem('addressbook');
				nlapiSetCurrentLineItemValue('addressbook', 'label', profile['Address_1'], false, true);
				nlapiSetCurrentLineItemValue('addressbook', 'addr1', profile['Address_1'], false, true);
				nlapiSetCurrentLineItemValue('addressbook', 'addr2', profile['Address_2'], false, true);
				nlapiSetCurrentLineItemValue('addressbook', 'city', profile['AddressCity'], false, true);
				nlapiSetCurrentLineItemValue('addressbook', 'state', profile['AddressProvince'], false, true);
				nlapiSetCurrentLineItemValue('addressbook', 'zip', profile['AddressPostalCode'], false, true);
				nlapiSetCurrentLineItemValue('addressbook', 'defaultshipping', 'T', false, true);
				nlapiSetCurrentLineItemValue('addressbook', 'defaultbilling', 'F', false, true);
				nlapiCommitLineItem('addressbook');
			}
			catch(e){
				nlapiLogExecution("Error", "Unable to insrt new address", e);
			}
		}
	
		else {
			try {
				nlapiLogExecution('DEBUG', 'Updating Existing address', '');
				numberOfAddresses = nlapiGetLineItemCount('addressbook');
				for (var i=1; i <= numberOfAddresses; i++)
				{
					var defaultshipping = nlapiGetLineItemValue('addressbook','defaultshipping',i);
					if (defaultshipping=='T'){
						nlapiLogExecution('DEBUG', 'Updating existing address', "");
						nlapiSelectLineItem('addressbook', i);
						nlapiSetCurrentLineItemValue('addressbook', 'label', profile['Address_1'], false, true);
						nlapiSetCurrentLineItemValue('addressbook', 'addr1', profile['Address_1'], false, true);
						nlapiSetCurrentLineItemValue('addressbook', 'addr2', profile['Address_2'], false, true);
						nlapiSetCurrentLineItemValue('addressbook', 'city', profile['AddressCity'], false, true);
						nlapiSetCurrentLineItemValue('addressbook', 'state', profile['AddressProvince'], false, true);
						nlapiSetCurrentLineItemValue('addressbook', 'zip', profile['AddressPostalCode'], false, true);
						nlapiSetCurrentLineItemValue('addressbook', 'defaultshipping', 'T', false, true);
						nlapiCommitLineItem('addressbook');
					}
				}
			}
			catch(e){
				nlapiLogExecution('Error', 'Address Insert/Update', e);
			}
		}
	
		nlapiSetFieldValue('custentity_a9r_checksum', profile['CHECKSUM'], false, true);
	    return true;
	}
	catch (e){
		nlapiLogExecution("Error", "Update Netsuite: custpl "+custpl, e)	;
		return false;
	}	
}





function isFieldOnSynclist(field){
	//nlapiLogExecution("Debug", "Update Sync List? checking for " , field);							
	try {
		if (FieldSyncList==null){
			nlapiLogExecution("Error", "Update sync list", "element list is null");
			return false;
		}
		else{
			for ( var x = 0; x < FieldSyncList.length; x++ ){
				if (FieldSyncList[x]==field){
					return true;
				}							
			}
			return false;
		}		
	}
	catch(e){
		nlapiLogExecution("Error", "Updating sync list for 411 Update " + field, e);
		return false;			
	}	
}

function FieldChanged(type, name){	
	
//	nlapiLogExecution("Debug", "FIELD CHANGED  " , type+" "+name);							
//	nlapiLogExecution("Debug", "FIELD CHANGED  record mode" , recordmode);							
	initialize();
	var role = nlapiGetRole(); 
	var customerid = nlapiGetRecordId();
	
	if (role==ROLE_ADMIN||role==ROLE_OAC_MGR||role==ROLE_OAC_MGR_ENH||role==ROLE_OAC_MGR_MTL||
			role==ROLE_OAC||role==ROLE_OAC_MTL||role==ROLE_EST||role==ROLE_RETENTION ){
		if (type=='addressbook'||type=='recmachcustrecord_phones_customer'){
				nlapiSetFieldValue('custentity_a9r_recordupdate', 'T', false, true);		
		}
		else {
			if (recordmode=='edit'){
				if (isFieldOnSynclist(name)){
					nlapiSetFieldValue('custentity_a9r_recordupdate', 'T', false, true);
				}		
			}
			
		}
	}
	switch (name) {
	
	case 'custentity_welcomecallstatus' :
		if (nlapiGetFieldValue('custentity_welcomecallstatus') == WELCOMECALLSTATUS_COMPLETED
			|| nlapiGetFieldValue('custentity_welcomecallstatus') == WELCOMECALLSTATUS_COULDNOTCONTACT) {
			nlapiSetFieldValue('custentity_welcomewalkthru', 'T', false, true);
		} else {
			nlapiSetFieldValue('custentity_welcomewalkthru', 'F', false, true);
		}
		
		break;
	case 'custentity_welcomecallnotes' :
		if (nlapiGetFieldValue('custentity_welcomecallnotes')!=null||nlapiGetFieldValue('custentity_welcomecallnotes')!='') {
			addnote("WELCOME CALL NOTES", nlapiGetFieldValue('custentity_welcomecallnotes'), nlapiGetUser() , customerid);
		} 
		
		break;
	
	// VERTICALS
	/*case 'custentity_vertical_type' : 	
	 * switch (nlapiGetFieldValue('custentity_vertical_type')) {
											case '' 				: 	nlapiDisableField('custentity_vertical_sf', true);
																		nlapiSetFieldValue('custentity_vertical_sf', '');
																		nlapiDisableField('custentity_vertical_nosf', true);
																		nlapiSetFieldValue('custentity_vertical_sf', '');
																		break;
											case VERTICALTYPES_SF	: 	nlapiDisableField('custentity_vertical_sf', false);
																		nlapiDisableField('custentity_vertical_nosf', true);
																		nlapiSetFieldValue('custentity_vertical_nosf', '');
																		break;
											case VERTICALTYPES_NoSF : 	nlapiDisableField('custentity_vertical_sf', true);
																		nlapiDisableField('custentity_vertical_nosf', false);
																		nlapiSetFieldValue('custentity_vertical_sf', '');
																		break;
										} 
	 */
	case 'custentity_ccdeclined' :
		if (nlapiGetFieldValue("custentity_ccdeclined")=='F'||nlapiGetFieldValue("custentity_ccdeclined")==null||nlapiGetFieldValue("custentity_ccdeclined")==''){
			nlapiSetFieldValue('custentity_declineresolutiondate', nlapiDateToString(new Date()));
		}
		else{
			nlapiSetFieldValue("custentity_ccdeclinedate", nlapiDateToString(new Date()));
		}
	case 'custentity_pap_declined' :
		if (nlapiGetFieldValue('custentity_pap_declined')=='F'||nlapiGetFieldValue('custentity_pap_declined')==null||nlapiGetFieldValue('custentity_pap_declined')==''){
			nlapiSetFieldValue('custentity_declineresolutiondate', nlapiDateToString(new Date()));
		}
		else{
			nlapiSetFieldValue("custentity_ccdeclinedate", nlapiDateToString(new Date()));
		}
		
		//EMAIL SIGNATURE
	case 'custentitycustservrep' :  	
		if (nlapiGetFieldValue('custentity_cxaccounttype')==REPTYPE_Dedicated&&nlapiGetFieldValue('custentitycustservrep')!=null&&nlapiGetFieldValue('custentitycustservrep')!=''){
			nlapiSetFieldValue('custentity_updatesignature', "T");
			//updateSignature();
		}
		else{
			nlapiSetFieldValue('custentity_comm_signature_name', '', false, true);
			nlapiSetFieldValue('custentity_comm_signature_officephone', '', false, true);		
			nlapiSetFieldValue('custentity_comm_signature_emailaddress', '', false, true );
		}
		break;											
	case 'custentity_cxaccounttype' :  	
		if (nlapiGetFieldValue('custentity_cxaccounttype')==REPTYPE_Dedicated){
			nlapiSetFieldValue('custentity_updatesignature', "T");
			//updateSignature();
		}
		else{
			nlapiSetFieldValue('custentity_comm_signature_name', '', false, true);
			nlapiSetFieldValue('custentity_comm_signature_officephone', '', false, true);		
			nlapiSetFieldValue('custentity_comm_signature_emailaddress', '', false, true );
		}
		break;
	case 'custentityarrep' :
		if (nlapiGetFieldValue('custentityarrep')==''||nlapiGetFieldValue('custentityarrep')==null){
			nlapiSetFieldValue('custentity_arrepsignature_name', '', false, true);
			nlapiSetFieldValue('custentity_arrepsignature_telephone', '', false, true);
			nlapiSetFieldValue('custentity_arrepsignature_ext', '', false, true);
			nlapiSetFieldValue('custentity_arrepsignature_email', '', false, true);
			nlapiSetFieldValue('custentity_updatearsignature', "");
		}else{
			nlapiSetFieldValue('custentity_updatearsignature', "T");
		}	
			
		break;											
/*	//BUSINESS CARDS
	case 'custentity_businesscards' : 	if (nlapiGetFieldValue('custentity_businesscards')=='T'){
											nlapiDisableField('custentity_businesscardbatch', false);
										}
										else{
											nlapiDisableField('custentity_businesscardbatch', true);
										}
										break;
	case 'custentity_businesscardbatch' : if (nlapiGetFieldValue('custentity_businesscardbatch')!=''&&nlapiGetFieldValue('custentity_businesscardbatch')!=null){
												nlapiSetFieldValue('custentity_businesscards', 'T');
										}
										break;
	*/
										//CUSTOMER ALERT
	case 'custentity_customeralert' : 	
		if (nlapiGetFieldValue('custentity_customeralert')=='') {
			addnote("Cx Alert DELETED", "The customer alert was removed: "+old_customeralert, nlapiGetUser(), customerid);
		}
		else {
			addnote("Cx Alert ADDED", "A customer alert was entered: "+nlapiGetFieldValue('custentity_customeralert') , nlapiGetUser(), customerid );
		}
		break;

	case 'custentity_thirdpartysend' :  
		if (nlapiGetFieldValue('custentity_thirdpartysend')=='T') {
			
			/*nlapiDisableField('custentity_cancelinstructions', false);
			nlapiDisableField('custentity_retentionnotes', false);
			nlapiDisableField('custentity_retentiondisp', false);
			nlapiDisableField('custentity_retchurnvalue', false);
			*/
			var today = new Date();
			var anote = nlapiGetFieldValue('custentity_cancelinstructions');
			var note = nlapiGetFieldValue('custentity_retentionnotes');
			var rep = nlapiGetFieldValue('custentity_retentioncustservrep');
			
			nlapiSetFieldValue('custentity_retcancellistings', 'T');
			if (nlapiGetFieldValue("custentity_website_publishstatus")==WEBSITEPUBSTATUS_Published&&nlapiGetFieldValue("custentity_websiterevoked")!='T'){
				nlapiSetFieldValue('custentity_retcancelwebsite', 'T');
			}
			nlapiSetFieldValue('custentity_churnclass', CHURNCLASS_AR);
			if (note==null||note==''){
				nlapiSetFieldValue('custentity_retentionnotes', 'Send to 3rd Party Collections');
			}else{
				nlapiSetFieldValue('custentity_retentionnotes', note+ '\nSend to 3rd Party Collections');
			}
			nlapiSetFieldValue('custentity_accountingcancelque', 'T');
			if (anote==null||anote==''){
				nlapiSetFieldValue('custentity_cancelinstructions', 'Send to 3rd Party Collections');
			}
			else{
				nlapiSetFieldValue('custentity_cancelinstructions', anote + '\nSend to 3rd Party Collections');
				
			}
			nlapiSetFieldValue('custentity_downgradefollowupdate', '');
			nlapiSetFieldValue('custentity_retentiondisp',	RETENTIONDISP_SendTo3rdParty);
			nlapiSetFieldValue('custentity_retentiondispdate', nlapiDateToString(today) );
			nlapiSetFieldValue('custentity_retentionstatus', RETENTIONSTATUS_InQueue);
			if (rep==null||rep==''){
				nlapiSetFieldValue('custentity_retentioncustservrep', nlapiGetUser());
			}
			
			nlapiSetFieldValue('custentity_retcancelrequestresolution', RETENTIONFINALSTATUS_Cancelled); 
			addnote("SEND TO THIRD PARTY", 'Send to 3rd Party Collections', nlapiGetUser() , customerid);
			document.getElementById('submitter').click();
			
		}									
		break;
	case 'globalsubscriptionstatus' 	: 	var unstatus = nlapiGetFieldValue('globalsubscriptionstatus');
											if (unstatus==SUBSCRIPTION_SOFTOUT||unstatus==SUBSCRIPTION_CONFOUT){
												nlapiSetFieldValue('custentity_unsubscribe_adtips', 'T', true, true);		
												nlapiSetFieldValue('custentity_unsubscribe_marktips', 'T', true, true);		
												nlapiSetFieldValue('custentity_unsubscribe_websiteinfo', 'T', true, true);
												nlapiSetFieldValue('custentity_unsubcribe_positive_review', 'T', true, true);
												nlapiSetFieldValue('custentity_unsubcribe_nn_review', 'T', true, true);
												nlapiSetFieldValue('custentity_unsubscribe_promotions', 'T', true, true);
											}
										 
	}
}

function validateField(type, name){
	initialize();
	switch (name) {	
		case 'custentitycustservrep' :  	if (nlapiGetFieldValue('custentity_cxaccounttype')==REPTYPE_Dedicated){
												if (nlapiGetFieldValue('custentitycustservrep')==null||nlapiGetFieldValue('custentitycustservrep')==''){
													alert("Account cannot be set as DEDICATED as there is no Customer Service Representative assigned to this account. Please upate and try again.");
													return false;
												}
												else{
													return true;
												}
											}
											break;		
		case 'custentity_cxaccounttype' :  	if (nlapiGetFieldValue('custentity_cxaccounttype')==REPTYPE_Dedicated){
												if (nlapiGetFieldValue('custentitycustservrep')==null||nlapiGetFieldValue('custentitycustservrep')==''){
													alert("Account cannot be set as DEDICATED as there is no Customer Service Representative assigned to this account. Please upate and try again.");
													return false;
												}
												else{
													return true;
												}
											}
											break;		}
	return true;
}

function validateInsert(type){

	initialize();
	var role = nlapiGetRole(); 
	//nlapiLogExecution("Debug","validateInsert", type);
	if (role==ROLE_ADMIN||role==ROLE_OAC_MGR||role==ROLE_OAC_MGR_ENH||role==ROLE_OAC_MGR_MTL||
			role==ROLE_OAC||role==ROLE_OAC_MTL||role==ROLE_EST||role==ROLE_RETENTION){
		if (type=='addressbook'||type=='recmachcustrecord_phones_customer'){
				nlapiSetFieldValue('custentity_a9r_recordupdate', 'T', true, true);		
		}
	}	return true;
}

function validateDelete(type){
	initialize();
	var role = nlapiGetRole(); 
	//nlapiLogExecution("Debug","validateDelete", type);
	if (role==ROLE_ADMIN||role==ROLE_OAC_MGR||role==ROLE_OAC_MGR_ENH||role==ROLE_OAC_MGR_MTL||
			role==ROLE_OAC||role==ROLE_OAC_MTL||role==ROLE_EST ||role==ROLE_RETENTION){
		if (type=='addressbook'||type=='recmachcustrecord_phones_customer'){
				nlapiSetFieldValue('custentity_a9r_recordupdate', 'T', true, true);		
		}
	}
	return true;
}


function saveCustomer() {
	return true;
}



function upsellwebsite(campaignId){
	campaignId = typeof campaignId !== 'undefined' ? campaignId : '';
	
	initialize();
	try {
		
		var cx = nlapiGetRecordId();
		var customerPL = nlapiGetFieldValue('custentity411custid');
		
		if (local_invoke_Website(cx, customerPL, campaignId)){
			nlapiSetFieldValue('custentity_websitesaleschannel', WEBSITESALESCHAN_OACUpSell);
			nlapiSetFieldValue('custentity_website_upsellattempt', WEBSITEUPSELLSTATUS_Attempt);
			nlapiSetFieldValue('custentity_est_soldwebsite', YESNO_No);
			nlapiSetFieldValue('custentity_est_createwebsite', YESNO_No);
			nlapiSetFieldValue('custentity_est_confirmwebsitecreation', YESNO_Yes);
			nlapiSetFieldValue('custentity_websitecustservrep', nlapiGetUser());
			
			document.getElementById('submitter').click();
		}
		else{
			alert('Website Invoke failed.');
		}
	}
	catch (e){
		nlapiLogExecution("Error", "Upsell Website attempt", e);
	}
	
	
}

function revokewebsite(){
	nlapiLogExecution("Debug", "Revoke Website", "Start");
	initialize();
	try {
		var cx = nlapiGetRecordId();
		var customerPL = nlapiGetFieldValue('custentity411custid');
		var result = local_revoke_Website(cx, customerPL);
		if (result){
			nlapiSetFieldValue('custentity_websitesaleschannel', '');
			nlapiSetFieldValue('custentity_website_upsellattempt', WEBSITEUPSELLSTATUS_Lost);
			nlapiSetFieldValue('custentity_est_confirmwebsitecreation', YESNO_No);
			document.getElementById('submitter').click();
		}
		else{
			alert('Website Revoke failed. (timed-out)');
		}
	}
	catch (e){
		nlapiLogExecution("Error", "Revoke Website failed.", e);
	}
}

function convertwebupsell(){
	initialize();
	nlapiSetFieldValue('custentity_website_upsellattempt', WEBSITEUPSELLSTATUS_Converted );
    nlapiSetFieldValue('custentity_websalesordertrigger', 'T');
	document.getElementById('submitter').click();
    alert("Creating Sales Order for Website Upsell");
    
}

/*
function cancelwebsiteonly(){
	initialize();
	var today = new Date();
	try {
		var cx = nlapiGetRecordId();
		nlapiSetFieldValue('custentity_cancelinstructions', "CANCEL WEBSITE. Please reduce the recurring charge on the memorized transaction and modify Moneris or PAP information" );
		nlapiSetFieldValue('custentity_accountingcancelque', 'T' );
		nlapiSetFieldValue('custentity_retentionstatus', RETENTIONSTATUS_InQueue);
		nlapiSetFieldValue('custentity_retcancelrequestresolution',RETENTIONFINALSTATUS_RetainedWithChanges);
		nlapiSetFieldValue('custentity_retresolutionrep', nlapiGetUser());
		nlapiSetFieldValue('custentity_retentionstartdate', nlapiDateToString(today));
		nlapiSetFieldValue('custentity_retcancelwebsite', 'T');
		if (nlapiGetFieldValue('custentity_website_upsellattempt') != null &&nlapiGetFieldValue('custentity_website_upsellattempt') != ''){
			nlapiSetFieldValue('custentity_website_upsellattempt', WEBSITEUPSELLSTATUS_Lost );
		}
		addnote("WEBSITE BILLING CANCELLED", "Cx's website billing has been cancelled in Netsuite: ", nlapiGetUser(), cx );
		alert('Website cancellation request complete. Account has been sent to Finance for adjustment.');
		document.getElementById('submitter').click();
	}
	catch (e){
		nlapiLogExecution("Error", "Cancel Website failed.", e);
	}
	
}
*/
function addCustomerTo411(){
	var customer_id = '';
	var mess = new Array();
	mess['CHECKSUM'] = 'NEW';
	try {
		
		nlapiLogExecution('Debug', "ADD CUSTOMER", 'Start 411 Update');

		customer_id = parseInt(nlapiGetFieldValue('custentity411custid'));
		mess['user_id'] = nlapiGetUser();

		mess['salesrep'] = nlapiGetFieldValue('salesrep');
		mess['entitystatus'] = nlapiGetFieldValue('entitystatus');
		mess['custentity_language'] = nlapiGetFieldText('custentity_language');
	
		mess['is_display'] = 1;
		if (nlapiGetFieldValue('custentity_hide_on_site') == 'T') {
			mess['is_display'] = 0;
		}

		
		mess['customer_id'] = customer_id;
		mess['CompanyName'] = encodeURIComponent(nlapiGetFieldValue('companyname'));
		//mess['alt_CompanyName'] = encodeURIComponent(nlapiGetFieldValue('custentity_alternate_company_name'));
		

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
		
		var now = new Date();
		nlapiLogExecution('Debug', "About to call 411 and send update", "START");
		
		var loopcontrol = 1;
		while (loopcontrol <=3){
			try {
				var response = nlapiRequestURL( a9r_server + '/api/ns-update?key='+api_key+'&noCache=' + Math.round(now.getTime() * Math.random()), mess, null );
				var result_st = response.getBody();
				loopcontrol = 4;
				nlapiLogExecution('Debug', "411 called", response.getBody());
				nlapiLogExecution('Debug', "411 Update Complete", result_st);
	
				var myArray = eval("[" + result_st + "]");  
				if (myArray[0].result=='successful') {
					return true;	
				}
				else {
					return false;
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
		nlapiLogExecution("Error", "ADD CUSTOMER TO 411:"+ customer_id , e);
		return false;	
		
	}
	
}


	
	
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


function updateSignature(){
	nlapiSetFieldValue('custentity_updatesignature', "T");
}

function updateARSignature(){
	nlapiSetFieldValue('custentity_updatearsignature', "T");
}

function insertUpdatedData(field, data) {
	if (field == 'address') {
		//data = new Array('1st e st', 'unit 100', 'toronto', 'on', 'h0h0h0');

		if (window.isinited && window.isvalid) {
			ShowTab("address",false);

			if (window.isinited) {
				window.shownmachine = "address";
				ShowgeneralMachine("address");
			}
		}

		for (var i = 0; i <= 4; i++) {
			if (document.getElementById(data[i])) {
				data[i] = document.getElementById(data[i]).value;
			}
			else {
				data[i] = '';
			}
		}

		nlapiSelectNewLineItem('addressbook');
		nlapiSetCurrentLineItemValue('addressbook', 'addr1', data[0], false, true);
		nlapiSetCurrentLineItemValue('addressbook', 'addr2', data[1], false, true);
		nlapiSetCurrentLineItemValue('addressbook', 'city', data[2], false, true);
		nlapiSetCurrentLineItemValue('addressbook', 'state', data[3], false, true);
		nlapiSetCurrentLineItemValue('addressbook', 'zip', data[4], false, true);
		nlapiSetCurrentLineItemValue('addressbook', 'defaultshipping', 'T', false, true);
		nlapiSetCurrentLineItemValue('addressbook', 'defaultbilling', 'F', false, true);
		nlapiCommitLineItem('addressbook');

		return false;
	}
	else if (field == 'contact') {
		//data = new Array('vladislav', 'yanyuk');

		var error_flag = false;
		try {
			for (var i = 0; i <= 4; i++) {
				if (i != 2) {
					if (document.getElementById(data[i])) {
						data[i] = document.getElementById(data[i]).value;
					}
					else {
						data[i] = '';
					}
				}
			}

			var attributes = new Array();
			attributes['role'] = 2;
			
			nlapiAttachRecord('contact', createContactRecord(data[0], data[1], data[2], data[3], data[4]), nlapiGetRecordType(), nlapiGetRecordId(), attributes);
		}
		catch(err) {
			error_flag = true;
			//!!! alert("ERROR: We already have such contact in the NS database or this contact name is too long.");
		}

		if (! error_flag) {
			if (window.isinited && window.isvalid) {
				ShowTab("general",false);

				if (window.isinited) {
					window.shownmachine = "contact";
					ShowgeneralMachine("contact");

	  				refreshmachine('contact');
				}
			}
		}

		return false;
	}
	else {
		//

	}

	return false;
}

function createContactRecord(first_name, last_name, title_role, email, phone) {

	var contact = nlapiCreateRecord('contact');

	contact.setFieldValue('entityid', first_name + ' ' + last_name);
	contact.setFieldValue('company', nlapiGetRecordId());
	contact.setFieldValue('firstname', first_name);
	contact.setFieldValue('lastname', last_name);
	contact.setFieldValue('title', 'VBO Contact'/*title_role*/);
	contact.setFieldValue('email', email);
	contact.setFieldValue('phone', phone);

	try {
		return nlapiSubmitRecord( contact, true );
	}
	catch(err) {
		return 0;
	}
}




function getNewCustomerID() {
	var mess = new Array();
	mess['user_id'] = nlapiGetUser();

	var now = new Date();
	var response = nlapiRequestURL( external_411ca_ajax_server + '/update_customer.php?act=add' + '&' + Math.round(now.getTime() * Math.random()), mess, null );
	var result_st = response.getBody();

	var temp_mass = result_st.match(new RegExp("new_customer_id=\"([0-9]+)\"", "i"));

	return temp_mass[1];
}






function sendAdIsReadyCommunication(){
	
	var custpl = nlapiGetFieldValue('custentity411custid');
	//var today = new Date();
	var response = nlapiRequestURL( a9r_server+'/communication/get-reset-password-info?key='+api_key+'&customer_id='+custpl);
	var result_st = response.getBody();
 	var myArray = eval("[" + result_st + "]");  
	var login = '';
	var url = '';
	if (myArray[0].result=='successful') {
		login = myArray[0].login;
		url = myArray[0].loginurl;
		//url = parseJSON(myArray[0].loginurl);
		nlapiSetFieldValue("custentity_a9r_login", login);
		nlapiSetFieldValue("custentity_a9r_resetpasswordurl", url);
		if (login==null||login==''||url==null||url==''){
			alert("Cannot send email as the system was unable to retrieve the login info from A9R. Please try again");
			return false;
		}
		var email = nlapiGetFieldValue('email');
		if (email==null||email==''){
			alert("Cannot send email as the Communications Email is missing. Please update and try again");
			return false;
		}
		nlapiSetFieldValue("custentity_comm_sendadisready_trigger", 'T');
		document.getElementById('submitter').click();
		return true;
	}
	else{
		alert("System was unable to locate a user account associated with this Custmer ID");
		return false;
	}		
}

function startwelcomecampaign(){
	nlapiSetFieldValue('custentity_welcomecampaigntrigger', 'T');
	document.getElementById('submitter').click();	
}


function validEmployee(employee){
	
	try {
		var emp = nlapiLoadRecord('employee', employee);
		if (emp!=null&&emp.getFieldValue('isinactive')!='T'){
			return true;	
		}
	}
	catch (e){
		nlapiLogExecution('ERROR', e.getCode(), e.getDetails());      
		return false;
	}
	return false;
}



function setupphonecall(title, datein){

 	var today = new Date();	
 	var tomorrow = nlapiAddDays(today, 1);
	var callbackdate = '';
 	
 	if(datein== null  || datein =='') {	
  		callbackdate = tomorrow;
  	}	
  	else {
  		callbackdate = nlapiStringToDate(datein);
  	}
	
	var call = nlapiCreateRecord("phonecall");	
    var callId = null;
 	

	//if callback date is blank or before tomorrow then we set it for tomorrow
	call.setFieldValue('title', title);		
  	call.setFieldValue('phone', nlapiGetFieldValue('phone'));			    
  	call.setFieldValue('company', nlapiGetRecordId());
 	
 	
 	try {
		if(callbackdate== null  || callbackdate =='') {	
  			callbackdate = tomorrow;
		}	
		else {
			if (!isDate1BeforeDate2(today, callbackdate)){
				callbackdate = tomorrow;
			}
		}
  		var callbackdateString = nlapiDateToString(callbackdate);
		call.setFieldValue('startdate',  callbackdateString);		
		//call.setFieldValue('startdate',  today);		
 	}
	catch(e)    
 	{       
 		//console.log('ERROR', "Problem with call back date");   
 		alert("Problem with call back date");   
   	} 	

	  	   
  	try {   
  		callId = nlapiSubmitRecord(call, true, true );
  		//alert("A Return Phone Call has been added to your pending Call List on " + nlapiDateToString(callbackdate) + "."); 
  		//console.log('DEBUG', 'call record successfully created', 'ID = ' + callId);
 	}
    catch(e)    
 	{       
 		//	alert(e.getDetails());	
 		//	console.log('ERROR', e.getCode(), e.getDetails());   
   	} 	
   	
   	var url = nlapiResolveURL('RECORD', 'phonecall', callId, true);
	window.open(url, 'Phone Call', "location = 0, toolbar = 0, status= 0, menubar= 0, resizable= 0, scrollbars= 0, width=1400, height=825");
   	
	 	
}

function sendMessage(customer, author, email, template){
	
	try {
		var mailRec = nlapiMergeRecord(template, 'customer', customer);
	}
	catch (e){
		alert('Unable to merge email for ID: ' + customer + ""+e);
		nlapiLogExecution ('DEBUG', 'System', 'Unable to merge email for ID: ' + customer  ); 	
		return false;
	}
	
	try {
		nlapiSendEmail(author, email, mailRec.getName(),mailRec.getValue());
		logMessage(customer, author, email, mailRec.getName(),mailRec.getValue() );
	}
	catch (e){
		alert('Unable to send email for ID: ' + id );
		nlapiLogExecution ('DEBUG', 'System', 'Unable to send email for ID: ' + id); 	
		return false;
	}
	
	return true;
		
}



////////////


var NS411 = {

	// Downgrade single customer
	downgradeCustomer : function (businessId) {
		var result = false;
		
		// Call external script to downgrade
		var response = nlapiRequestURL(NS411Config.getDowngradeCustomerUrl() + '&businessId=' + businessId);

		try {
			response = JSON.parse(response.getBody());
			if (typeof response.result == "boolean") {
				result = response.result;
			}
		} catch (err) {
			result = false;
		}

		return result;
	}

};


/*
function addCancelLogRecord(custID, churnvalue, canceldisposition, canceldate, requestdate, salesrep, level1rep, level2rep, resolutionrep, swimlane, categories, finalstatus, closedate, balance, daysoverdue){
	initialize();
	var logRecord = nlapiCreateRecord('customrecord_cancelhistory');
	try {
		logRecord.setFieldValue('custrecord_cancellog_customer', custID);
		logRecord.setFieldValue('custrecord_cancellog_churnvalue', churnvalue);
		logRecord.setFieldValue('custrecord_cancellog_retentiondisp', canceldisposition);
		logRecord.setFieldValue('custrecord_cancellog_retentiondispdate', canceldate);
		logRecord.setFieldValue('custrecord_cancellog_requesttocanceldate', requestdate);
		
		if (salesrep!=null&&salesrep!=''){
			if (validEmployee(salesrep)) {
				logRecord.setFieldValue('custrecord_cancellog_salesrep', salesrep);
			}
			else {
				logRecord.setFieldValue('custrecord_cancellog_salesrep', EMPLOYEE_nolongerhere);
			}
		}
		if (level1rep!=null&&level1rep!='') {
			if (validEmployee(level1rep)) {
				logRecord.setFieldValue('custrecord_cancellog_level1rep', level1rep);		}
			else {
				logRecord.setFieldValue('custrecord_cancellog_level1rep', EMPLOYEE_nolongerhere);
			}
		}
		if (level2rep!=null&&level2rep!=''){
			if (validEmployee(level2rep)) {
				logRecord.setFieldValue('custrecord_cancellog_level2rep', level2rep);		}
			else {
				logRecord.setFieldValue('custrecord_cancellog_level2rep', EMPLOYEE_nolongerhere);
			}
		}
		if (resolutionrep!=null&&resolutionrep!=''){
			if (validEmployee(resolutionrep)) {
				logRecord.setFieldValue('custrecord_cancellog_resolutionrep', resolutionrep);		}
			else {
				logRecord.setFieldValue('custrecord_cancellog_resolutionrep', EMPLOYEE_nolongerhere);
			}
		}		
		
		logRecord.setFieldValue('custrecord_cancellog_swimlane', swimlane);
		if (categories!=null) {
			logRecord.setFieldValues('custrecord_cancellog_categories', categories);
		}
		logRecord.setFieldValue('custrecord_cancellog_finalstatus', finalstatus);
		logRecord.setFieldValue('custrecord_cancellog_closedate', closedate);
		logRecord.setFieldValue('custrecord_cancellog_overduebalance', balance);
		logRecord.setFieldValue('custrecord_cancellog_daysoverdue', daysoverdue);
		

		var ndays = 0;
		if (closedate!=null&&closedate!=''&&canceldate!=null&&canceldate!=null){
			ndays = numberOfDays(nlapiStringToDate(closedate), nlapiStringToDate(canceldate));
		}
		
		logRecord.setFieldValue('custrecord_cancellog_tenure', ndays);
		logRecord.setFieldValue('custrecord_cancellog_activerecord', 'T');
			
		nlapiSubmitRecord(logRecord, true, false);
	}
	catch (e)
	{
		alert(e.getDetails());
		nlapiLogExecution('ERROR', e.getCode(), e.getDetails());      
		return false;
	}


	return true;	
	
	
}

*/



/*
function requestToCancel(){
	//open the request to cancel interface with the dynamically set options
	// user can make the cancellation selections\
	initialize();
	var customerid = nlapiGetFieldValue('id');
	//nlapiSetFieldValue('custentity_retention_sendemailtrigger', 'T');
	var url = nlapiResolveURL('SUITELET', 'customscript_cancellationrequest', 'customdeploy_cancellationrequest');
	window.open(url+'&custid='+customerid, 'Request_To_Cancel_Level_1', "location = 0, toolbar = 0, status= 0, menubar= 0, resizable= 0, scrollbars= 0, width=1000, height=825");
	document.getElementById('submitter').click();
	
	
}
*/

/*
 * 
 function secondrequestToCancel() {
	//check previous final resolution
	//if retain w change then check followupdate
	initialize();
	switch (nlapiGetFieldValue('custentity_retcancelrequestresolution')){
			case RETENTIONFINALSTATUS_RetainedWithChanges	: 	var followupdate = nlapiGetFieldValue('custentity_downgradefollowupdate');
																if (clearRetentionfields()) {
																	requestToCancel();
																}
																break;
			case RETENTIONFINALSTATUS_Cancelled				:	alert("This cX has already been cancelled.");
																return false;
																break;
	}
	return true;
}
*/

/*
function reinstateCancelledCustomer(){
	initialize();	
	if (clearRetentionfields()) {
		nlapiSetFieldValue('custentity_comm_campaign', '');
		nlapiSetFieldValue('entitystatus', STATUS_ClosedWon);
		nlapiSetFieldValue('custentity_portfoliovalue', 0);
		nlapiSetFieldValue('custentity_downgradecomplete', '');
		nlapiSetFieldValue('custentity_downgradedate', '');
		//reset establishment fields
		alert("Cx has been reinstated. Please press SAVE to complete.");
		addnote("CUSTOMER REINSTATED", "Cx has been REINSTATED from CANCELLED State", nlapiGetUser(), nlapiGetFieldValue('id') );
	}	
}
*/
/*
function sendToRetention(){
	initialize();	
	nlapiSetFieldValue("custentity_sendtoretention", "T", true, true);
	nlapiSetFieldValue('custentity_retentionstatus', RETENTIONSTATUS_SentToRetention);   
	var today = new Date();
	alert("The customer has been sent to retention. Please press Save to complete.");
	addnote("SENT TO RETENTION", "Cx has been sent to RETENTION.", nlapiGetUser(), nlapiGetFieldValue('id') );
}
*/
/*
function retain() {
	initialize();	
	var today = new Date();
	
	nlapiSetFieldValue("custentity_retentiondisp", '');
	nlapiSetFieldValue("custentity_retentionstatus", RETENTIONSTATUS_Retained); 
	nlapiSetFieldValue("custentity_retentiondispdate", nlapiDateToString(today));
	nlapiSetFieldValue('custentity_retcancelrequestresolution', RETENTIONFINALSTATUS_Saved);
	nlapiSetFieldValue('custentity_retresolutionrep', nlapiGetUser()); 
	alert("The customer has been SAVED. Please press Save to complete.");
	addnote("CUSTOMER SAVED", "Cx has been SAVED.", nlapiGetUser(), nlapiGetFieldValue('id') );
	
													
}
*/
/*
function retainchange() {
	initialize();	
	if (nlapiGetFieldValue('custentity_cancelinstructions')==null||nlapiGetFieldValue('custentity_cancelinstructions')==''){
			alert("Instructions for accounting must be filled out.")
			return;
	}
	var today = new Date();
	nlapiSetFieldValue("custentity_downgradefollowupdate", '');
	nlapiSetFieldValue("custentity_retentiondisp", '');
	nlapiSetFieldValue("custentity_retentionstatus", RETENTIONSTATUS_RetainedWithChanges);   
	nlapiSetFieldValue("custentity_retentiondispdate", nlapiDateToString(today));
	nlapiSetFieldValue('custentity_accountingcancelque', 'T');	
	nlapiSetFieldValue('custentity_retcancelrequestresolution', RETENTIONFINALSTATUS_RetainedWithChanges); 
	nlapiSetFieldValue('custentity_retresolutionrep', nlapiGetUser()); 
	alert("The customer has been retained with changes. Please press Save to complete.");
	addnote("CUSTOMER RETAINED w/CHANGE", "Cx has been RETAINED with changes, Request sent to accounting: "+ nlapiGetFieldValue('custentity_cancelinstructions') , nlapiGetUser(), nlapiGetFieldValue('id') );
	
											
}
*/
/*
function cancelDowngrade(){  //retain with changes - listings are not removed, but scheduled  (ACCT)
	initialize();
	var today = new Date();
	var reqdate = nlapiGetFieldValue('custentity_downgradefollowupdate');
	
	if (reqdate=='null'||reqdate==''){
		alert("Unable to process without a valid DOWNGRADE FOLLOW UP DATE. Please enter a date and try again.");
		return;
	}	
	
	var checkdate = nlapiStringToDate(reqdate);
	if (!isDate1SameAsDate2(today, checkdate)){
		if (!isDate1BeforeDate2(today, checkdate)){
			alert("Unable to process without a valid DOWNGRADE FOLLOW UP DATE. Please enter a date in the future and try again.");
			return;
		}
	}

	var title = "Upgrade Account"; 
	var assigned =  nlapiGetUser();
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
	var custid =  nlapiGetFieldValue('id'); 
	var owner = nlapiGetUser();
	if (!isDate1SameAsDate2(checkdate, today))	{
		if (addtask(title, assigned, startdate, timedevent, starttime, endtime, duedate, remindertype, reminderminutes, priority, status, message, custid, '', owner)){
			nlapiSetFieldValue("custentity_retentionstatus", RETENTIONSTATUS_CompletedByAccounting);   
			nlapiSetFieldValue('custentity_accountingcancelque', 'F');	
			addnote("ACCOUNT RETENTION DOWNGRADE", "Cx's account has been downgraded for Retention in Netsuite: "+ nlapiGetFieldValue('custentity_cancelinstructions'),  nlapiGetUser(), nlapiGetFieldValue('id') );
			alert("Please ensure you have also modified the memorized transactions and Moneris transactions as per this change request and press SAVE to complete." );
		}
	}
	else {
		nlapiSetFieldValue("custentity_retentionstatus", RETENTIONSTATUS_CompletedByAccounting);  
		nlapiSetFieldValue('custentity_accountingcancelque', 'F');	
		addnote("ACCOUNT RETENTION DOWNGRADE", "Cx's account has been downgraded for Retention in Netsuite.: "+ nlapiGetFieldValue('custentity_cancelinstructions'),  nlapiGetUser(), nlapiGetFieldValue('id') );
		alert("Please ensure you have also modified the memorized transactions and Moneris transactions as per this change request and press SAVE to complete." );
	}
	nlapiSetFieldValue('custentity_retentionaccountant', nlapiGetUser());	
	//var url = nlapiResolveURL('RECORD', 'task');
	//window.open(url);
	return;
}
*/
/*
function processCancellation(){
	initialize();
	var cancellisting = 'F';
	var cancelwebsite = 'F';
	var searchresults = null;
	var today = new Date();
	var cx = nlapiGetFieldValue('entityid');
	var businessId = nlapiGetFieldValue('custentity411custid');
	var reqdate = nlapiGetFieldValue('custentity_downgradedate');
	cancellisting = nlapiGetFieldValue('custentity_retcancellistings'); 
	cancelwebsite = nlapiGetFieldValue('custentity_retcancelwebsite'); 	
	
	if (cancellisting=='T'){
		if (reqdate=='null'||reqdate==''){
			alert("Unable to process without a valid LISTING REMOVAL DATE. Please enter a date in the future and try again.");
			return;	
		}
		var checkdate = nlapiStringToDate(reqdate);
		if (!isDate1BeforeDate2(today, checkdate)){
			alert("Unable to process without a valid LISTING REMOVAL DATE. Please enter a date in the future and try again.");
			return;	
		}
		searchresults = getChildrenAccounts(cx);
		if (searchresults!=null){
			alert(searchresults.length);
			nlapiLogExecution("DEBUG",'Parent has children', searchresults.length);
			
			for (var x=0;x<searchresults.length;x++){
				var result = searchresults[x];
				var childPL = result.getValue('custentity411custid');
				var childID = result.getValue('internalid');
				//alert(x+" : " + childPL);
				
				nlapiLogExecution("Debug", "Parent record has been cancelled", childPL);
				cancelAccount(childPL ,reqdate, childID);
				cancelWebsite(childPL, childID);
			}
		}
		cancelAccount(businessId, reqdate, null);
	}
	
	if (cancelwebsite=='T'){
		cancelWebsite(businessId, null);
	}
	
}


function cancelAccount(customerPL, reqdate, childID){ //CANCEL ACCOUNT  (ACCT)
	var cx;
	var website = 'F';
	try{
		if (childID==null){
			//PARENT ACCOUNT
			nlapiSetFieldValue('custentity_comm_campaign', '');
			nlapiSetFieldValue('custentity_donotsendcomm', 'T');
			nlapiSetFieldValue("entitystatus", STATUS_Cancelled);   
			nlapiSetFieldValue("custentity_retentionstatus", RETENTIONSTATUS_CompletedByAccounting);  
			nlapiSetFieldValue('custentity_accountingcancelque', 'F');	
			nlapiSetFieldValue('custentity_retentionaccountant', nlapiGetUser());			
		}
		else {
			//CHILD ACCOUNT
			var rec = nlapiLoadRecord('customer', childID);	
			rec.setFieldValue('custentity_comm_campaign', '');
			rec.setFieldValue('custentity_donotsendcomm', 'T');
			rec.setFieldValue("entitystatus", STATUS_Cancelled);   
			rec.setFieldValue("custentity_retentionstatus", RETENTIONSTATUS_CompletedByAccounting);  
			rec.setFieldValue('custentity_accountingcancelque', 'F');	
			rec.setFieldValue('custentity_retentionaccountant', nlapiGetUser());
			nlapiSubmitRecord(rec);
		}
	}
	catch (e){
		nlapiLogExecution("Error", "Error cancelling account:", customerPL);
		return false;
	}
	
	
	addnote("LISTINGS REMOVAL REQUEST", "Cx's services have been scheduled for removal from 411 site on "+reqdate, nlapiGetUser(), nlapiGetFieldValue('id') );
	addnote("ACCOUNT CANCELLED", "Cx's account has been cancelled in Netsuite: "+ nlapiGetFieldValue('custentity_cancelinstructions'), nlapiGetUser(), nlapiGetFieldValue('id') );
	//addnote("COMMUNCATIONS", "Cx's has been moved to the Cancelled Comm Campaign ", nlapiGetUser(), nlapiGetFieldValue('id') )
	alert("Cx's account has been cancelled in Netsuite and listings have been scheduled for downgraded from 411.ca on "+reqdate + '\n'+ "Please ensure you have also removed the memorized transactions, applied required journal entries, and cancelled Moneris transactions. Please press SAVE to complete." );
	return true;
}

function cancelWebsite(customerPL, childID){
	try{
		if (childID==null){
			//PARENT ACCOUNT
			invoke_revoke_Website(cx, customerPL, "REVOKE");
			if (nlapiGetFieldValue('custentity_website_automatedbilling')=='T'){
				nlapiSetFieldValue('custentity_website_automatedbilling', 'F');
			}			
		}
		else {
			//CHILD ACCOUNT
			var rec = nlapiLoadRecord('customer', childID);	
			cx = childID;
			if (customerPL!=null&&customerPL!=''){
				if (invoke_revoke_Call(customerPL, action)=="SUCCESS"){
					var today = new Date();
					rec.setFieldValue('custentity_website_publishstatus', WEBSITEPUBSTATUS_UnPublished);
					rec.setFieldValue('custentity_websiterevokedate',  nlapiDateToString(today));
					rec.setFieldValue('custentity_websiterevoked', 'T');
					if (rec.getFieldValue('custentity_website_automatedbilling')=='T'){
						rec.setFieldValue('custentity_website_automatedbilling', 'F');
					}
					addnote("WEBSITE REVOKED", "Cx's website revoked on "+today, nlapiGetUser(), childID );
				}
			}
			nlapiSubmitRecord(rec);
		}
	}
	catch (e){
		nlapiLogExecution("Error", "Error cancelling account:", customerPL);
		return false;
	}
}



function getChildrenAccounts(entityID){
	alert(entityID);
	
	nlapiLogExecution("DEBUG", "cancelChildrenAccounts", entityID);
	
	var searchresults = null;
	try {
		var filters = new Array();
		filters[0] = new nlobjSearchFilter( 'entityid', 'parentcustomer', 'is', entityID);
		
		
		var columns = new Array();
		columns[0] = new nlobjSearchColumn('custentity411custid');
		columns[1] = new nlobjSearchColumn('internalid');
		
		searchresults = nlapiSearchRecord( 'customer', null, filters, columns );
		
	}
	catch (e){
		nlapiLogExecution('Error', 'cancelChildrenQuery failed'+customerPL, e.getDetails());
	}
	return searchresults;
	
}
*/




/*
function sendbusinesscardemail(){
	initialize();
	var email = nlapiGetFieldValue('email');
	if (email==null||email==''){
		alert("Cannot send email as the Communications Email is missing. Please update and try again");
		return;
	}
	nlapiSetFieldValue('custentity_sendbusinesscardtrigger', 'T');
	document.getElementById('submitter').click();
}


*/

/*
function oldsaveCustomer() {

	nlapiLogExecution('Debug', "SAVE CUSTOMER", 'Start');
	initialize();
	
	
/*	var syncrecord = nlapiGetFieldValue('custentity_a9r_recordupdate');
	nlapiLogExecution('Debug', "SAVE CUSTOMER mode " + recordmode, "Sync Status = " + syncrecord);
	
	if (recordmode=='create'|| (recordmode == 'edit' && syncrecord=='T')){
		var mess = new Array();
		if (recordmode=='create'){
			mess['CHECKSUM'] = 'NEW';
		}
		else{
			mess['CHECKSUM'] = nlapiGetFieldValue('custentity_a9r_checksum');
		}
		
		try {
			nlapiLogExecution('Debug', "SAVE CUSTOMER", 'Start 411 Update');
	
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
		
				mess['old_customer_id'] = old_customer_id;
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
			
				mess['Advertising_Tips'] = 1;
				if (nlapiGetFieldValue('custentity_unsubscribe_adtips') == 'T') {
					mess['Advertising_Tips'] = 0;
				}
		
				mess['Marketing_Tips'] = 1;
				if (nlapiGetFieldValue('custentity_unsubscribe_marktips') == 'T') {
					mess['Marketing_Tips'] = 0;
				}
		
				mess['Website_Info'] = 1;
				if (nlapiGetFieldValue('custentity_unsubscribe_websiteinfo') == 'T') {
					mess['Website_Info'] = 0;
				}
				
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
				/*logEntries(mess);
				
				var now = new Date();
				nlapiLogExecution('Debug', "About to call 411 and send update", "START");
				
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
							alert('ERROR: 411.ca database update error! Please try again...');
							return true;	
						}
						else {
							nlapiDisableField('custentity411custid', false);
							return true;
						}
					}
					catch (e){
						if (e.getCode()=='SSS_REQUEST_TIME_EXCEEDED') {
							loopcontrol = loopcontrol+1;					
							if (loopcontrol<4){
								nlapiLogExecution("Error", "ns-update timedout, retrying....  pl= "+ customer_id , e);
								
							}
							else {
								nlapiLogExecution("Error", "ns-update all attempts timedou. pl="+ customer_id , e);
								alert('ERROR: 411.ca database update error! Connection timed-out. Please try again...');		
								return false;
							}
						}
						else{
							alert('ERROR: 411.ca database update error! Please try again...');		
							return false;	
						}
					}					
				}
			}
			else {
				return true;
			}
		}
		catch (e){
			nlapiLogExecution('Error', 'Save cX Record', e);
			alert('ERROR: System error. Please report this to your system administrator.');		
			return false;
		}
	}
*/
/*	return true;



}*/
/*
function OLDcancelwebsiteonly(){
	initialize();
	try {
		var cx = nlapiGetRecordId();
		var customerPL = nlapiGetFieldValue('custentity411custid');
		
		if (invoke_revoke_Website(cx, customerPL, "REVOKE")){
			nlapiSetFieldValue('custentity_cancelinstructions', "Website cancelled. Please reduce the recurring charge on the memorized transaction and modify Moneris or PAP information" );
			
			if (nlapiGetFieldValue('custentity_website_automatedbilling')=='T'){
				nlapiSetFieldValue('custentity_website_automatedbilling', 'F');
			}
			nlapiSetFieldValue('custentity_accountingcancelque', 'T' );
			
			if (nlapiGetFieldValue('custentity_website_upsellattempt') != null &&nlapiGetFieldValue('custentity_website_upsellattempt') != ''){
				nlapiSetFieldValue('custentity_website_upsellattempt', WEBSITEUPSELLSTATUS_Lost );
			}
			
			nlapiSetFieldValue('custentity_websitesaleschannel', '');
			nlapiSetFieldValue('custentity_websitepackage', '');
			nlapiSetFieldValue('custentity_websitedomainname', '');
			nlapiSetFieldValue('custentity_websiteemailaddress', '');
			nlapiSetFieldValue('custentity_websiteprice', '');
			
			addnote("WEBSITE BILLING CANCELLED", "Cx's website billing has been cancelled in Netsuite: ", nlapiGetUser(), cx );
			alert('Website has been revoked. Account has been sent to Finance for adjustment.');
			document.getElementById('submitter').click();
		}
		else{
			alert('Website Cancel failed.');
		}
	}
	catch (e){
		nlapiLogExecution("Error", "Cancel Website failed.", e);
	}
	
}

*/

