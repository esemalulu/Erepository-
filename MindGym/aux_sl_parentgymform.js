/**
 * Module Description
 * Suitelet that allows clients to enter information to their customer and contact records
 
 * Version    Date            Author           Remarks
 * 1.00            			  ELI
 * 2.0		  17 Jan 2017	  apple.villanueva 
 */

{
	var ObjClient = {};
	var ObjPrimaryContact = {};
	var ObjHeadTeacher = {};
	var ObjCPO = {};
	var ObjProgramme = {};
	
	var NumberOfFlyersText = 'Number of flyers required: ';
	var RoleId_PrimaryContact = nlapiGetContext().getSetting('SCRIPT','custscript_roleid_pc'); //-10;
	var RoleId_Headteacher = nlapiGetContext().getSetting('SCRIPT','custscript_roleid_ht');
	var RoleId_CPO = nlapiGetContext().getSetting('SCRIPT', 'custscript_roleid_cpo');
	
	var Email_Sender = nlapiGetContext().getSetting('SCRIPT','custscript_sendfrom'); 
	var Email_Recipient = nlapiGetContext().getSetting('SCRIPT','custscript_sendto'); 
	
	var ImageUrl_ParentGym = nlapiGetContext().getSetting('SCRIPT','custscript_header_url'); //https://system.netsuite.com/core/media/media.nl?id=2296161&c=720154&h=11f4721b916909e6d368
	var CSSUrl = nlapiGetContext().getSetting('SCRIPT','custscript_css_url');
}

/**
 * Main
 */
function htmlSuitelet(req, res){
	
	//Use Client ID from request parameter
	if(req.getParameter("clientid")){
		ObjClient.custID = req.getParameter("clientid");
	}
	nlapiLogExecution('debug', 'custID', ObjClient.custID);
	nlapiLogExecution('debug', 'action', req.getParameter("action"));
	
	/*------------------------------------
	 * GET - Show email sender popup
	 * ------------------------------------*/
	if(req.getMethod() == 'GET' && req.getParameter("action")){
			
		if(req.getParameter("action") == 'senderpopup'){
			
			nlapiLogExecution('debug', 'sender', req.getParameter("sender"));
			
			showEmailSenderPopup(req, res);
			
		}
		
	}
	/*------------------------------------
	 * POST - Send email with link to ParentGym form
	 * ------------------------------------*/
	else if(req.getMethod() == 'POST' && req.getParameter("action")){

		if(req.getParameter("action") == 'sendlink'){
		
			nlapiLogExecution('debug', 'sender', req.getParameter("sender"));
			nlapiLogExecution('debug', 'sendto', req.getParameter("sendto"));
			nlapiLogExecution('debug', 'companyname', req.getParameter("companyname"));
			
			var msg = sendSuiteletLink(req.getParameter("sender"), req.getParameter("sendto"), req.getParameter("companyname"));
			res.write(msg);
			
		} 
		
	} else {
		
		/*------------------------------------
		 * GET - Show ParentGym Form
		 * ------------------------------------*/
		if(req.getMethod() == 'GET'){
			
			//Get Client data
			getClientData();
			nlapiLogExecution('debug', 'ObjClient', JSON.stringify(ObjClient));
		
			//Get Contact data
			getCentreContactData();
			nlapiLogExecution('debug', 'ObjPrimaryContact', JSON.stringify(ObjPrimaryContact));
			nlapiLogExecution('debug', 'ObjHeadTeacher', JSON.stringify(ObjHeadTeacher));
			nlapiLogExecution('debug', 'ObjCPO', JSON.stringify(ObjCPO));
		}
		/*------------------------------------
		 * POST - form submit
		 * ------------------------------------*/
		else if(req.getMethod() == 'POST'){
					
			var objStatus;
			
			//GET DATA FROM USER INPUTS
			getUserFormInputs(req);
			
			//UPDATE CLIENT and CONTACTS
			objStatus = saveForm();
			
			//SEND PDF to Parent Gym
			objStatus = sendPDF(objStatus);
			
			//DISPLAY CONFIRMATION/ERROR MESSAGE
			var confirmation = getSubmitResultMessage(objStatus);
			res.write(confirmation);		
			
		}

		//DISPLAY MAIN FORM
		var html = getHtmlForUI();
		res.write(html);
	}
}
		
/**
 * Sets object containing data to display in School/Centre section
 */
function getClientData(){
	
	if(ObjClient && ObjClient.custID){
		
		var rec = nlapiLoadRecord('customer', ObjClient.custID);
								
		//Main Level Fields
		ObjClient.name = rec.getFieldValue('companyname');
		ObjClient.phone = rec.getFieldValue('phone');
		ObjClient.flyers = getNumberOfFlyers(rec.getFieldValue('comments'));
		
		//Address Fields
		var mainAddLn = rec.findLineItemValue('addressbook','defaultbilling', 'T');		
		ObjClient.address1 = rec.getLineItemValue('addressbook', 'addr1', mainAddLn );			
		ObjClient.address2 = rec.getLineItemValue('addressbook', 'addr2', mainAddLn );	
		ObjClient.address3 = rec.getLineItemValue('addressbook', 'addr3', mainAddLn );		
		ObjClient.city = rec.getLineItemValue('addressbook', 'city', mainAddLn );		
		ObjClient.state = rec.getLineItemValue('addressbook', 'dropdownstate', mainAddLn );	
		ObjClient.postal = rec.getLineItemValue('addressbook', 'zip', mainAddLn );	
		ObjClient.country = rec.getLineItemValue('addressbook', 'country', mainAddLn );
	}
}

/**
 * Extract number of flyers from comments
 */
function getNumberOfFlyers(stComments){
	
	var stFlyers  = '';
	
	if(stComments){
		var ar = stComments.toUpperCase().split(NumberOfFlyersText.toUpperCase().trim());
		if(ar && ar.length > 1){
			stFlyers = ar[1].trim();
		}
	}
	
	return stFlyers;
}

/**
 * Sets object containing data to display in Contacts section
 */
function getCentreContactData(){
	
	var arAllContacts = [];
	
	if(ObjClient && ObjClient.custID){
		
		//Get all Contacts
		var arResults = nlapiSearchRecord('customer', null,
							[new nlobjSearchFilter('internalid', null, 'anyof', ObjClient.custID),
							 new nlobjSearchFilter('isinactive', null, 'is', 'F')],
							[new nlobjSearchColumn('internalid', 'contact').setSort(true),
							 new nlobjSearchColumn('contactrole', 'contact'),	//Role
							 new nlobjSearchColumn('entityid', 'contact'),		//Name
							 new nlobjSearchColumn('firstname', 'contact'),		//First Name
							 new nlobjSearchColumn('lastname', 'contact'),		//Last Name
							 new nlobjSearchColumn('title', 'contact'),			//Job Title
							 new nlobjSearchColumn('phone', 'contact'),			//Phone
							 new nlobjSearchColumn('email', 'contact')]);		//Email
							 					
		if(arResults){
			for(var i = 0; i < arResults.length; i++){
				
				var stRole = arResults[i].getValue('contactrole', 'contact');
				var objContact = {
					id : arResults[i].getValue('internalid', 'contact'),
					role : arResults[i].getValue('contactrole', 'contact'),
					firstname : arResults[i].getValue('firstname', 'contact'),
					lastname : arResults[i].getValue('lastname', 'contact'),
					oldname : arResults[i].getValue('firstname', 'contact') + ' ' + arResults[i].getValue('lastname', 'contact'),
					title : arResults[i].getValue('title', 'contact'),
					phone : arResults[i].getValue('phone', 'contact'),
					email : arResults[i].getValue('email', 'contact')
				};
				
				//Store contact
				arAllContacts.push(objContact);

				//Store contacts for UI display
				//Primary Contact = -10
				if(!ObjPrimaryContact.id && stRole == RoleId_PrimaryContact){	   
					ObjPrimaryContact = objContact;
				}
				//Headteacher = 
				else if(!ObjHeadTeacher.id && stRole == RoleId_Headteacher){	
					ObjHeadTeacher = objContact;
				}
				//Child Protection Officer = 
				else if(!ObjCPO.id && stRole == RoleId_CPO){
					ObjCPO = objContact;
				}				
			}
		}
	}
	
	nlapiLogExecution('debug', 'arAllContacts', JSON.stringify(arAllContacts));
	return arAllContacts;
}

/**
 * Sets user page inputs into objects
 */
function getUserFormInputs(req){
	//School/Centre
	ObjClient = {
		custID : req.getParameter("custID"),
		name : req.getParameter("name"),	
		phone : req.getParameter("phone"),		   
		address1 : req.getParameter("address1"),
		address2 : req.getParameter("address2"),
		address3 : req.getParameter("address3"),
		city : req.getParameter("city"),
		postal : req.getParameter("postal"), 
		flyers : req.getParameter("flyers")
	};
	
	//Primary Contact
	ObjPrimaryContact = {
		id : req.getParameter("contact_pc_id"),
		role : req.getParameter("contact_pc_role"),
		firstname : req.getParameter("contact_pc_firstname"),
		lastname : req.getParameter("contact_pc_lastname"),
		oldname : req.getParameter("contact_pc_oldname"),
		title : req.getParameter("contact_pc_title"),
		phone : req.getParameter("contact_pc_phone"),
		email : req.getParameter("contact_pc_email")
	};
	
	//Headteacher
	ObjHeadTeacher = {
		id : req.getParameter("contact_ht_id"),
		role : req.getParameter("contact_ht_role"),
		firstname : req.getParameter("contact_ht_firstname"),
		lastname : req.getParameter("contact_ht_lastname"),
		oldname : req.getParameter("contact_ht_oldname"),
		title : req.getParameter("contact_ht_title"),
		phone : req.getParameter("contact_ht_phone"),
		email : req.getParameter("contact_ht_email")
	};
	
	//Child Protection Officer
	ObjCPO = {
		id : req.getParameter("contact_cpo_id"),
		role : req.getParameter("contact_cpo_role"),
		firstname : req.getParameter("contact_cpo_firstname"),
		lastname : req.getParameter("contact_cpo_lastname"),
		oldname : req.getParameter("contact_cpo_oldname"),
		title : req.getParameter("contact_cpo_title"),
		phone : req.getParameter("contact_cpo_phone"),
		email : req.getParameter("contact_cpo_email")
	};
	
	//Programme Details
	ObjProgramme = {
		ambassador1 : req.getParameter("ambassador1"),
		ambassador2 : req.getParameter("ambassador2"),
		roomsessions : req.getParameter("roomsessions"),
		roomcreche : req.getParameter("roomcreche"),
		tastersession : req.getParameter("tastersession"),
		sessions : req.getParameter("sessions"),
		datefirst : req.getParameter("datefirst"),
		datelast : req.getParameter("datelast"),
		halftermdates : req.getParameter("halftermdates")
	};
}

/**
 * Updates Client record and Contacts
 * @returns {obj}
 */
function saveForm(){
	
	var objStatus = {};
	objStatus.error = false;
	objStatus.message = '';
	
	if(ObjClient && ObjClient.custID){	

		//UPDATE CLIENT
		var rec = nlapiLoadRecord('customer', ObjClient.custID);
		
		//Main Level
		if(ObjClient.name){
			rec.setFieldValue('companyname', ObjClient.name);
		}
		rec.setFieldValue('phone', ObjClient.phone);
		rec.setFieldValue('comments', NumberOfFlyersText + ObjClient.flyers);
		
		//Address
		var mainAddLn = rec.findLineItemValue('addressbook','defaultbilling', 'T');	
		var subrecord;
		if(mainAddLn > 0){
			//Update existing address
			rec.selectLineItem('addressbook', mainAddLn);
			subrecord = rec.editCurrentLineItemSubrecord('addressbook', 'addressbookaddress');
		} else {
			//Add new address
			rec.selectNewLineItem('addressbook');
			rec.setCurrentLineItemValue('addressbook', 'defaultbilling',  'T');
			subrecord = rec.createCurrentLineItemSubrecord('addressbook', 'addressbookaddress');
		}
		subrecord.setFieldValue('addrphone', ObjClient.phone);						
		subrecord.setFieldValue('addr1', ObjClient.address1);
		subrecord.setFieldValue('addr2', ObjClient.address2);
		subrecord.setFieldValue('addr3', ObjClient.address3);
		subrecord.setFieldValue('city', ObjClient.city);
		subrecord.setFieldValue('zip', ObjClient.postal);
		subrecord.commit();
		rec.commitLineItem('addressbook');
		
		//Save client record
		try{
			nlapiSubmitRecord(rec, true, true);	
		} catch(error){
			objStatus.error = true;
			objStatus.message += 'Error in saving School/Centre information: ' + error.toString() + '<br/>';	
		}
		
		//CREATE/UPDATE CONTACTS
		var stContactId;
		try{
			stContactId = saveContactRecord(ObjPrimaryContact, RoleId_PrimaryContact);	
			if(stContactId){
				//Store contact ID and oldname in UI field
				ObjPrimaryContact.id = stContactId;
				ObjPrimaryContact.oldname = ObjPrimaryContact.firstname + ' ' + ObjPrimaryContact.lastname;
			}
		} catch(error){
			objStatus.error = true;
			objStatus.message += 'Error in saving Centre Contact information: ' + error.toString() + '<br/>';
		}
		try{
			stContactId = saveContactRecord(ObjHeadTeacher, RoleId_Headteacher);
			if(stContactId){
				//Store contact ID and oldname in UI field
				ObjHeadTeacher.id = stContactId;
				ObjHeadTeacher.oldname = ObjHeadTeacher.firstname + ' ' + ObjHeadTeacher.lastname;
			}
		} catch(error){
			objStatus.error = true;
			objStatus.message += 'Error in saving Headteacher information: ' + error.toString() + '<br/>';
		}
		try{
			stContactId = saveContactRecord(ObjCPO, RoleId_CPO);
			if(stContactId){
				//Store contact ID and oldname in UI field
				ObjCPO.id = stContactId;
				ObjCPO.oldname = ObjCPO.firstname + ' ' + ObjCPO.lastname;
			}
		} catch(error){
			objStatus.error = true;
			objStatus.message += 'Error in saving Child Protection Officer information: ' + error.toString() + '<br/>';
		}
	}
	
	return objStatus;
}

/**
 * Creates/updates Contacts
 */
function saveContactRecord(objContact, stRoleId){
	
	nlapiLogExecution('debug', 'objContact', JSON.stringify(objContact));
	nlapiLogExecution('debug', 'stRoleId', stRoleId);
	
	if(objContact.firstname || objContact.lastname){
		
		//Check if contact is new or existing based on ID and name
		var contact;
		var stNewName = objContact.firstname + ' ' + objContact.lastname;
		if(stNewName.toUpperCase() == objContact.oldname.toUpperCase() && objContact.id){
			//Update the contact
			contact = nlapiLoadRecord('contact', objContact.id);
		} else{
			//Create new contact
			contact = nlapiCreateRecord('contact');
		}
		contact.setFieldValue('firstname', objContact.firstname || '');
		contact.setFieldValue('lastname', objContact.lastname || '');
		contact.setFieldValue('company', ObjClient.custID);
		contact.setFieldValue('contactrole', stRoleId);
		contact.setFieldValue('title', objContact.title || '');
		contact.setFieldValue('phone', objContact.phone || '');
		if(objContact.email){
			contact.setFieldValue('email', objContact.email); //throws error if email is empty
		}
		
		//SAVE CONTACT RECORD
		return nlapiSubmitRecord(contact, true, true);
	}
}

/**
 * Sends PDF to ParentGym after the user submits the form
 */
function sendPDF(objStatus){
	
	//Email body
	var emailBody = ObjClient.name + ' submitted a Parent Gym booking form.';
	if(objStatus && objStatus.error){
		emailBody += '<br/><br/>However, the following errors occured during form submission.<br/><br/>';
		emailBody += objStatus.message;
	}
	
	emailBody += '<br/><br/>Link to Client Account record: ' + getEnvironmentUrl() + nlapiResolveURL('RECORD', 'customer', ObjClient.custID);
	
	//Get HTML
	var html = getHtmlForPDF();
	html = html.replace(/&/g, '&amp;');
	
	//Convert to PDF
	var xml = "<?xml version=\"1.0\"?><!DOCTYPE pdf PUBLIC \"-//big.faceless.org//report\" \"report-1.1.dtd\">";
	xml += html;
	xml = xml.replace(/html/g, 'pdf');
	xml = xml.replace('<input class="button" type="submit"/>', '');
	
	nlapiLogExecution('debug', 'xml', xml);
	
	var file = nlapiXMLToPDF(xml);
	file.setName('ParentGymBooking_' + ObjClient.name + '.pdf');
	
	//Send email
	if(Email_Sender && Email_Recipient){
		try{
			nlapiSendEmail(
				Email_Sender, 										//sender												
				Email_Recipient,									//recipient																																		
				'Parent Gym booking form submitted by ' + ObjClient.name,	//subject			
				emailBody,	//body																						
				null,		//cc																													
				null,		//bcc																												
				null, 		//records																								
				file, 		//attachments																								
				true, 		//notifySenderOnBounce 
				null, 		//internalOnly 
				null		//replyTo
			);
		} catch(ex){
			nlapiLogExecution('debug', 'email error', ex.toString());
		}
	}
	
	return objStatus;
}

/**
 * HTML for UI
 */
function getHtmlForUI(){
	
	var objInputs = {
		custID : '<input size="58" type="hidden" display="none" name="custID" id="custID" value="'+ (ObjClient.custID || '') +'"/>',
		name : '<input size="58" type="text" name="name" id="name" value="'+ (ObjClient.name || '') +'"/>',
		address1 : '<input size="55" type="text" name="address1" id="address1" value="'+ (ObjClient.address1 || '') +'"/>',
		address2 : '<input size="65" type="text" name="address2" id="address2" value="'+ (ObjClient.address2 || '') +'"/>',
		address3 : '<input size="65" type="text" name="address3" id="address3" value="'+ (ObjClient.address3 || '') +'"/>',
		city : '<input size="60" type="text" name="city" id="city" value="'+ (ObjClient.city || '') +'"/>',
		postal : '<input size="54" type="text" name="postal" id="postal" value="'+ (ObjClient.postal || '') +'"/>',
		phone : '<input size="48" type="text" name="phone" id="phone" value="'+ (ObjClient.phone || '') +'"/>',
		flyers : '<input size="65" type="text" name="flyers" id="flyers" value="'+ (ObjClient.flyers || '') +'"/>',
		
		contact_pc_id : '<input size="52" type="hidden" display="none" name="contact_pc_id" id="contact_pc_id" value="'+ (ObjPrimaryContact.id || '') +'"/>',
		contact_pc_oldname : '<input size="52" type="hidden" display="none" name="contact_pc_oldname" id="contact_pc_oldname" value="'+ (ObjPrimaryContact.oldname || '') +'"/>',
		contact_pc_firstname : '<input size="52" type="text" name="contact_pc_firstname" id="contact_pc_firstname" value="'+ (ObjPrimaryContact.firstname || '') +'"/>',
		contact_pc_lastname : '<input size="52" type="text" name="contact_pc_lastname" id="contact_pc_lastname" value="'+ (ObjPrimaryContact.lastname || '') +'"/>',
		contact_pc_title : '<input size="54" type="text" name="contact_pc_title" id="contact_pc_title" value="'+ (ObjPrimaryContact.title || '') +'"/>',
		contact_pc_phone : '<input size="48" type="text" name="contact_pc_phone" id="contact_pc_phone" value="'+ (ObjPrimaryContact.phone || '') +'"/>',
		contact_pc_email : '<input size="49" type="text" name="contact_pc_email" id="contact_pc_email" value="'+ (ObjPrimaryContact.email || '') +'"/>',
		
		contact_ht_id : '<input size="52" type="hidden" display="none" name="contact_ht_id" id="contact_ht_id" value="'+ (ObjHeadTeacher.id || '') +'"/>',
		contact_ht_oldname : '<input size="52" type="hidden" display="none" name="contact_ht_oldname" id="contact_ht_oldname" value="'+ (ObjHeadTeacher.oldname || '') +'"/>',
		contact_ht_firstname : '<input size="52" type="text" name="contact_ht_firstname" id="contact_ht_firstname" value="'+ (ObjHeadTeacher.firstname || '') +'"/>',
		contact_ht_lastname : '<input size="52" type="text" name="contact_ht_lastname" id="contact_ht_lastname" value="'+ (ObjHeadTeacher.lastname || '') +'"/>',
		contact_ht_title : '<input size="54" type="text" name="contact_ht_title" id="contact_ht_title" value="'+ (ObjHeadTeacher.title || '') +'"/>',
		contact_ht_phone : '<input size="48" type="text" name="contact_ht_phone" id="contact_ht_phone" value="'+ (ObjHeadTeacher.phone || '') +'"/>',
		contact_ht_email : '<input size="49" type="text" name="contact_ht_email" id="contact_ht_email" value="'+ (ObjHeadTeacher.email || '') +'"/>',
		
		contact_cpo_id : '<input size="52" type="hidden" display="none" name="contact_cpo_id" id="contact_cpo_id" value="'+ (ObjCPO.id || '') +'"/>',
		contact_cpo_oldname : '<input size="52" type="hidden" display="none" name="contact_cpo_oldname" id="contact_cpo_oldname" value="'+ (ObjCPO.oldname || '') +'"/>',
		contact_cpo_firstname : '<input size="52" type="text" name="contact_cpo_firstname" id="contact_cpo_firstname" value="'+ (ObjCPO.firstname || '') +'"/>',
		contact_cpo_lastname : '<input size="52" type="text" name="contact_cpo_lastname" id="contact_cpo_lastname" value="'+ (ObjCPO.lastname || '') +'"/>',
		contact_cpo_title : '<input size="54" type="text" name="contact_cpo_title" id="contact_cpo_title" value="'+ (ObjCPO.title || '') +'"/>',
		contact_cpo_phone : '<input size="48" type="text" name="contact_cpo_phone" id="contact_cpo_phone" value="'+ (ObjCPO.phone || '') +'"/>',
		contact_cpo_email : '<input size="49" type="text" name="contact_cpo_email" id="contact_cpo_email" value="'+ (ObjCPO.email || '') +'"/>',
		
		ambassador1 : '<input size="70" type="text" name="ambassador1" id="ambassador1" value="'+ (ObjProgramme.ambassador1 || '') +'"/>',
		ambassador2 : '<input size="70" type="text" name="ambassador2" id="ambassador2" value="'+ (ObjProgramme.ambassador2 || '') +'"/>',
		roomsessions : '<input size="70" type="text" name="roomsessions" id="roomsessions" value="'+ (ObjProgramme.roomsessions || '') +'"/>',
		roomcreche : '<input size="70" type="text" name="roomcreche" id="roomcreche" value="'+ (ObjProgramme.roomcreche || '') +'"/>',
		tastersession : '<input size="70" type="text" name="tastersession" id="tastersession" value="'+ (ObjProgramme.tastersession || '') +'"/>',
		sessions : '<input size="70" type="text" name="sessions" id="sessions" value="'+ (ObjProgramme.sessions || '') +'"/>',
		datefirst : '<input size="70" type="text" name="datefirst" id="datefirst" value="'+ (ObjProgramme.datefirst || '') +'"/>',
		datelast : '<input size="70" type="text" name="datelast" id="datelast" value="'+ (ObjProgramme.datelast || '') +'"/>',
		halftermdates : '<input size="70" type="text" name="halftermdates" id="halftermdates" value="'+ (ObjProgramme.halftermdates || '') +'"/>',

		header_img_size : '',
		centertbls_height : '490px'
	};
	
	return buildHtml(objInputs);
}

/**
 * HTML for the PDF
 */
function getHtmlForPDF(){
	
	var objInputs = {
		custID : '',
		name : '<span>'+ (ObjClient.name || '') +'</span>',
		address1 : '<span>'+ (ObjClient.address1 || '') +'</span>',
		address2 : '<span>'+ (ObjClient.address2 || '') +'</span>',
		address3 : '<span>'+ (ObjClient.address3 || '') +'</span>',
		city : '<span>'+ (ObjClient.city || '') +'</span>',
		postal : '<span>'+ (ObjClient.postal || '') +'</span>',
		phone : '<span>'+ (ObjClient.phone || '') +'</span>',
		flyers : '<span>'+ (ObjClient.flyers || '') +'</span>',
		
		contact_pc_id : '',
		contact_pc_oldname : '',
		contact_pc_firstname : '<span>'+ (ObjPrimaryContact.firstname || '') +'</span>',
		contact_pc_lastname : '<span>'+ (ObjPrimaryContact.lastname || '') +'</span>',
		contact_pc_title : '<span>'+ (ObjPrimaryContact.title || '') +'</span>',
		contact_pc_phone : '<span>'+ (ObjPrimaryContact.phone || '') +'</span>',
		contact_pc_email : '<span>'+ (ObjPrimaryContact.email || '') +'</span>',
		
		contact_ht_id : '',
		contact_ht_oldname : '',
		contact_ht_firstname : '<span>'+ (ObjHeadTeacher.firstname || '') +'</span>',
		contact_ht_lastname : '<span>'+ (ObjHeadTeacher.lastname || '') +'</span>',
		contact_ht_title : '<span>'+ (ObjHeadTeacher.title || '') +'</span>',
		contact_ht_phone : '<span>'+ (ObjHeadTeacher.phone || '') +'</span>',
		contact_ht_email : '<span>'+ (ObjHeadTeacher.email || '') +'</span>',
		
		contact_cpo_id : '',
		contact_cpo_oldname : '',
		contact_cpo_firstname : '<span>'+ (ObjCPO.firstname || '') +'</span>',
		contact_cpo_lastname : '<span>'+ (ObjCPO.lastname || '') +'</span>',
		contact_cpo_title : '<span>'+ (ObjCPO.title || '') +'</span>',
		contact_cpo_phone : '<span>'+ (ObjCPO.phone || '') +'</span>',
		contact_cpo_email : '<span>'+ (ObjCPO.email || '') +'</span>',
		
		ambassador1 : '<span>'+ (ObjProgramme.ambassador1 || '') +'</span>',
		ambassador2 : '<span>'+ (ObjProgramme.ambassador2 || '') +'</span>',
		roomsessions : '<span>'+ (ObjProgramme.roomsessions || '') +'</span>',
		roomcreche : '<span>'+ (ObjProgramme.roomcreche || '') +'</span>',
		tastersession : '<span>'+ (ObjProgramme.tastersession || '') +'</span>',
		sessions : '<span>'+ (ObjProgramme.sessions || '') +'</span>',
		datefirst : '<span>'+ (ObjProgramme.datefirst || '') +'</span>',
		datelast : '<span>'+ (ObjProgramme.datelast || '') +'</span>',
		halftermdates : '<span>'+ (ObjProgramme.halftermdates || '') +'</span>',

		header_img_size : 'width="700px" height="138px"',
		centertbls_height : '400px'
	};
	
	return buildHtml(objInputs);
}

/**
 * HTML of the form
 */
function buildHtml(objInputs){
	
	var html = '<html>'
		+ '<head>'
			+ '<link rel="stylesheet" type="text/css" '
			+ 'href="'+ CSSUrl +'" />'    //Place URL from .css/.js file(in file cabinet) here.

			+ '<style type="text/css">'
			
				+ 'body {font-family: Helvetica,sans-serif;} '

				+ '.centertbls {'
				+ '	border-radius: 25px;'
				+ '	corner-radius: 25px;'		//for PDF
				+ '	border: 10px solid #65b2fa;'
				+ '	padding: 20px;'
				+ '	color: #65b2fa;'
				+ '	font-size: 100%;'
				+ '} '

				+ '.prgmtble{'
				+ '	border-radius: 25px;'
				+ '	corner-radius: 25px;'		//for PDF
				+ '	border: 10px solid red;'
				+ '	padding: 20px; '
				+ '	color: red;'
				+ '	font-size: 100%;'
				+ '} '

				+ '.footer{'
				+ '	color: grey;'
				+ '	font-size: 100%;'
				+ '} '
				
				+ '.centertbls div, .prgmtble div{' //keep here but is not used
				+ '	border: 1px solid #ccc;'
				+ '	corner-radius: 3px;'		//for PDF
				+ '	margin: 0;'
				+ '	padding: 0 10px;'
				+ ' width: 250px;'
				+ ' font-size: 12px;'
				+ ' color: #1C1C1C;'
				+ ' height: 20px;'
				+ '	display: inline-block;'
				+ '} '
				
				+ '.centertbls span, .prgmtble span{'
				+ ' color: #1C1C1C;'
				+ ' font-size: 12px;'
				+ '} '
				
				+ '.prgmtble span{'
				+ ' margin-bottom: 10px;'
				+ '} '

			+ '</style>'
		
		
		+ '</head>'
		
		+ '<body size="A4" style="padding:20px">'
		+'<table align="center"><tr><td>' //width="900px" 
			+'<img src="' + ImageUrl_ParentGym +'" alt="ParentGym Booking Form" '+ objInputs.header_img_size +'/>'
		+'</td></tr></table>'
			
		+'<br/>'	
		
		+'<form method="post">'
		
		+'<table width="90%" align="center" style="table-layout: fixed">'
		+'<tr>'
			+'<td width="45%">'
				+'<table width="100%" class="centertbls" height="'+ objInputs.centertbls_height +'">'
					+'<tr><td><p style="font-size:20px"><b>School/centre:</b></p>'+ objInputs.custID+'</td></tr>'
					+'<tr><td>Name: '+ objInputs.name+'</td></tr>'
					+'<tr><td>Address: '+ objInputs.address1+'</td></tr>'
					+'<tr><td>'+ objInputs.address2+'</td></tr>'
					+'<tr><td>'+ objInputs.address3+'</td></tr>'
					+'<tr><td>City: '+ objInputs.city+'</td></tr>'
					+'<tr><td>PostCode: '+ objInputs.postal+'</td></tr>'
					+'<tr><td>Phone Number: '+ objInputs.phone+'</td></tr>'
					+'<tr><td>Number of flyers required (minimum suggested 200): '+ objInputs.flyers+'</td></tr>'
				+'</table>'
			+'</td>'
			
			+'<td width="45%">'
				+'<table width="100%" class="centertbls" height="'+ objInputs.centertbls_height +'">'
					+'<tr><td><p style="font-size:20px"><b>Centre contact:</b><br/><i style="font-size:15px;">(The person who will liaise with the coach each week)</i></p>'
					+ objInputs.contact_pc_id 
					+ objInputs.contact_pc_oldname +'</td></tr>'
					+'<tr><td>First Name: '+ objInputs.contact_pc_firstname +'</td></tr>' 
					+'<tr><td>Last Name: '+ objInputs.contact_pc_lastname +'</td></tr>'
					+'<tr><td>Job Title: '+ objInputs.contact_pc_title +'</td></tr>'
					+'<tr><td>Phone Number: '+ objInputs.contact_pc_phone +'</td></tr>'
					+'<tr><td>Email Address: '+ objInputs.contact_pc_email +'</td></tr>'						 
				+'</table>'
			+'</td>'		
		+'</tr>'
		+'<tr>'
			+'<td width="45%">'
				+'<table width="100%" class="centertbls">'
					+'<tr><td><p style="font-size:20px"><b>Headteacher:</b><br/></p>'
					+ objInputs.contact_ht_id 
					+ objInputs.contact_ht_oldname +'</td></tr>' 
					+'<tr><td>First Name: '+ objInputs.contact_ht_firstname +'</td></tr>' 
					+'<tr><td>Last Name: '+ objInputs.contact_ht_lastname +'</td></tr>' 
					+'<tr><td>Job Title: '+ objInputs.contact_ht_title +'</td></tr>' 
					+'<tr><td>Phone Number: '+ objInputs.contact_ht_phone +'</td></tr>' 
					+'<tr><td>Email Address: '+ objInputs.contact_ht_email +'</td></tr>'			 					 
				+'</table>'
			+'</td>'
			
			+'<td width="45%">'
				+'<table width="100%" class="centertbls">'
					+'<tr><td><p style="font-size:20px"><b>Child Protection Officer:</b><br/></p>'
					+ objInputs.contact_cpo_id 
					+ objInputs.contact_cpo_oldname +'</td></tr>' 
					+'<tr><td>First Name: '+ objInputs.contact_cpo_firstname +'</td></tr>'  
					+'<tr><td>Last Name: '+ objInputs.contact_cpo_lastname +'</td></tr>' 
					+'<tr><td>Job Title: '+ objInputs.contact_cpo_title +'</td></tr>' 
					+'<tr><td>Phone Number: '+ objInputs.contact_cpo_phone +'</td></tr>' 
					+'<tr><td>Email Address: '+ objInputs.contact_cpo_email +'</td></tr>'								 
				+'</table>'
			+'</td>'
		+'</tr>'
		+'</table>'

		+'<table width="100%" align="center"><tr><td>'															
				+'<table align="center" width="89%" class="prgmtble"><tr>'
					+'<td>'
						+'<p style="font-size:20px"><b>Programme Details:</b></p><br/>'	
						+'Parent Ambassador 1 name/number:<br/>'+ objInputs.ambassador1 +'<br/>' 				
						+'Parent Ambassador 2 name/number:<br/>'+ objInputs.ambassador2 +'<br/>' 
						+'Room used for sessions(e.g. Library):<br/>'+ objInputs.roomsessions +'<br/>' 				
						+'Room used for crèche (if applicable):<br/>'+ objInputs.roomcreche 								 					 
					+'</td>'
					+'<td width="50px"></td>'			
					+'<td >'	
						+'Taster Session (date and time):<br/>'+ objInputs.tastersession +'<br/>' 				
						+'Sessions to run on (day of the week and time):<br/>'+ objInputs.sessions +'<br/>' 
						+'Date of first session (dd/mm/yy):<br/>'+ objInputs.datefirst +'<br/>' 				
						+'Date of last session (dd/mm/yy):<br/>'+ objInputs.datelast +'<br/>'
						+'Half Term dates (no sessions that week):<br/>'+ objInputs.halftermdates							 					 
					+'</td>'			
				+'</tr></table>'								
		+'</td></tr></table>'	
					
	//--------------------------------------------------------F O O T E R------------------------------------------------------									
		+'<table width="80%" align="center" style="margin-top:30px"><tr><td>'	
			+'<p class="footer">'					
				+'By completing this form, all schools and centres agree to the following: <br/> <br/>'
				+'Schools have a legal responsibility for ensuring adequate Health and Safety provisions for visitors on their premises. The school '
				+'must have an up-to-date risk assessment covering the space to be used for sessions as well as the volunteer coach and parents '
				+'participating in the programme, to be provided to Parent Gym on request.<br/> <br/>'
				+'Parent Gym will provide flyers and posters as part of our Support Pack in order to help you with the publicity to parents and carers. '
				+'We ask that at least 12 parents are registered for the programme at least one week before the session. <b>In the unfortunate event '
				+'that fewer parents are registered by this point, the programme will be postponed.</b><br/><br/>'
			+'</p>'				
		+'</td></tr></table>'
		
	//--------------------------------------------------------B U T T O N------------------------------------------------------	
		+'<table align="center"><tr><td><input class="button" type="submit"/></td></tr></table>'
	//--------------------------------------------------------B U T T O N------------------------------------------------------	
		
		+'</form>' 
		
		+ '<div style="width:100%; height:75px; background:red;">'	
			+'<table style="color:white; font-size:100%; padding-top:25px" width="85%" align="center"><tr>'		
				+'<td align="left" >'					
				+'<p>Any questions contact: <b><a style=" color: white; text-decoration: none;" href="mailto:info@parentgym.com" target="_top">info@parentgym.com</a></b></p>'
				+'</td>'				
				+'<td align="right" >'					
				+'<p><b><a style="color: white; text-decoration: none;" href="http://www.parentgym.com" target="_top">www.parentgym.com</a></b></p>'			
				+'</td>'				
			+'</tr></table>'					
		+ '</div>'
	 
		+'</body></html>';
			
	return html;
	
}

/**
 * Confirmation/error message display after Submit of the form
 */
function getSubmitResultMessage(objStatus){
		
	var confirmation = '<html>'
		+ '<head>'
		+ '<link rel="stylesheet" type="text/css" '
		+ 'href="'+ CSSUrl +'" />'    //Place URL from .css/.js file(in file cabinet) here.
		+ '</head>'						
		+ '</body>'	
		+ '<div><span align="center" style="font-size:20px; width:100%; background:' + (objStatus.error ? 'red' : 'yellow') + '">'													
		+ (objStatus.error ? 
			'<p style="color:black;"><b>ERROR MESSAGE</b><br>' + objStatus.message +'</p>' :	
			'<p style="color:green;"><b>CONFIRMATION MESSAGE</b><br>The form was successfully submitted.</p>')	
		+ '</span>'						
		+'</body></html>';
	
	return confirmation;
}

function getEnvironmentUrl() {
	var ctxObjEnv = nlapiGetContext().getEnvironment();
	var ctxObjCompany = nlapiGetContext().getCompany();
    switch(ctxObjEnv){
        case 'SANDBOX':
            nsEnv = 'https://system.sandbox.netsuite.com';
            break;
        case 'BETA':
            nsEnv = 'https://system.beta.netsuite.com';
            break;
        default:
        	if(ctxObjCompany.indexOf('TSTDRV') != -1){
        		nsEnv = 'https://system.na1.netsuite.com';
        	}else{
        		nsEnv = 'https://system.netsuite.com';
        	}
            
    }
    return nsEnv;
}

/*------------------------------------
 * Email Sender - for sending Parent Form Gym form url
 * ------------------------------------*/
 /**
 * Popup window for sending email
 */
function showEmailSenderPopup(req, res){
	
	var stSenderEmpl = req.getParameter("sender");
	var stCompanyName = req.getParameter("companyname");
	
	//Build popup
    var form = nlapiCreateForm("Send Parent Gym booking form link", true);
	
	//Find contacts
    var arContacts = getCentreContactData();

    //Client Account field
    var fldClient = form.addField('clientid', 'select', 'Client Account', 'customer');
    fldClient.setDefaultValue(ObjClient.custID);
    fldClient.setDisplayType('inline');
    fldClient.setLayoutType('normal', 'startcol');
	
	//From field
	var fldFrom = form.addField('sender', 'select', 'From', 'employee');
    fldFrom.setDefaultValue(stSenderEmpl);
    fldFrom.setMandatory(true);

    //Contact field
	var contactId;
	var contactName;
    var fldTo = form.addField('sendto', 'select', 'To');
    fldTo.addSelectOption('', 'Choose a contact');
    for (var i = 0; (arContacts != null) && (i < arContacts.length); i++) {
      contactId = arContacts[i].id;
      contactName = arContacts[i].oldname;
      fldTo.addSelectOption(contactId, contactName);
    }
    fldTo.setMandatory(true);
	
	//Company name (hidden) field
    var fldName = form.addField('companyname', 'text');
    fldName.setDefaultValue(stCompanyName);
    fldName.setDisplayType('hidden');
	
	//Action (hidden) field
    var fldAction = form.addField('action', 'text');
    fldAction.setDefaultValue('sendlink');
    fldAction.setDisplayType('hidden');
    
    // Buttons
    form.addSubmitButton('Send');
    form.addButton('btn_cancel', 'Cancel', 'window.close()');
    
    res.writePage(form);
}

/**
 * Sends an email to client with the link to the Parent Gym form
 */
function sendSuiteletLink(stSender, stRecipient, stCompanyName){
	
	var stRecipientEmail = '';
	
	if(!stSender){
		return 'Email not sent: email sender is empty';
	}
	
	if(stRecipient){
		
		stRecipientEmail = nlapiLookupField('contact', stRecipient, 'email');
		nlapiLogExecution('debug', 'stRecipientEmail', stRecipientEmail);
		
		if(!stRecipientEmail){	
			return 'Email not sent: contact email address is empty';
		}
	}
					
	var emailBody = (stCompanyName ? 'Dear ' + stCompanyName + ',<br/><br/>' : 'Hi,<br/><br/>')
					+'<a href="'+ getEnvironmentUrl() + nlapiResolveURL('SUITELET', 'customscript_aux_sl_parentgymform', 'customdeploy_aux_sl_parentgymform')
					+ '&clientid=' + ObjClient.custID
					+'">Please click here to complete your Parent Gym booking form.</a>'
					+ '<br/><br/>Thank you!';
		
	try{
		nlapiSendEmail(
			stSender, 					//sender												
			stRecipientEmail,			//recipient																																
			'Parent Gym booking form',	//subject			
			emailBody,	//body																						
			null,		//cc																													
			null,		//bcc																												
			null, 		//records																								
			null, 		//attachments																								
			true, 		//notifySenderOnBounce 
			null, 		//internalOnly 
			null		//replyTo
		);
	} catch(ex){
		nlapiLogExecution('debug', 'sendSuiteletLink email error', ex.toString());
		return 'An error occurred while attempting to send the email to ' + stRecipientEmail + ' : ' + ex.toString();
	}
	
	return 'Email sent: Parent Gym booking form link sent to ' + stRecipientEmail;
}		