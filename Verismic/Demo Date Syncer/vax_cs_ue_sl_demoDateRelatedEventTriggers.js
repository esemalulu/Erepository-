/********** User Event on Events ********************/
/**
 * Module Description
 * 
 * Version    Date            Author           Remarks
 * 1.00       05 Oct 2015     json
 *
 */

var paramApiUrl = nlapiGetContext().getSetting('SCRIPT','custscript_74_apiurl'),
	paramApiToken = nlapiGetContext().getSetting('SCRIPT','custscript_74_token'),
	paramApiEmail = nlapiGetContext().getSetting('SCRIPT','custscript_74_email'),
	pjson = {
		'sessionid':''
	};

//Company Setting
var paramErrorNotification = nlapiGetContext().getSetting('SCRIPT','custscript_74_setstererr'),
	paramErrorCc = nlapiGetContext().getSetting('SCRIPT','custscript_74_setstercc');
if (paramErrorCc)
{
	paramErrorCc = paramErrorCc.split(','); 
}

/**
 * The recordType (internal id) corresponds to the "Applied To" record in your script deployment. 
 * @appliedtorecord event
 *   
 * @param {String} type Operation types: create, edit, view, copy, print, email
 * @param {nlobjForm} form Current form
 * @param {nlobjRequest} request Request object
 * @returns {Void}
 */
function eventDemoDateBeforeLoad(type, form, req)
{
	log('debug','type',type);
	
	//IF not UI, type of create or xedit or delete, exit out
	//nlapiGetContext().getExecutionContext() != 'userinterface' ||
	if (type == 'xedit' || type == 'delete' || type == 'create' || type =='copy' || nlapiGetContext().getExecutionContext()!='userinterface')
	{
		return;
	}
	
	//ADD in execution FORM logic Here
	//		- JUST incase they create another event form to be used without Setster
	if (nlapiGetFieldValue('customform') != nlapiGetContext().getSetting('SCRIPT', 'custscript_74_eventform'))
	{
		return;
	}
	
	
	var sjson = {
		'setsterid':'','contactname':'','email':'','timezone':'','opportunity':'',
		'location':'','locationtext':'',
		'service':'','servicetext':'',
		'provider':'','providertext':'','provideremail':'',
		'originaldate':nlapiGetFieldValue('startdate'),
		'originaltime':convertToAmPm(nlapiGetFieldValue('starttime'))
	};
	
	if (nlapiGetFieldValue('custevent_crm_setsterid'))
	{
		var arSetsterId = nlapiGetFieldValue('custevent_crm_setsterid').split('|');
		//THis should always be three to execute. ID|Contact ID|Email|clientTz|opp
		if (arSetsterId && arSetsterId.length == 5)
		{
			sjson.setsterid = arSetsterId[0];
			sjson.contactid = arSetsterId[1];
			sjson.email = arSetsterId[2];
			sjson.timezone = arSetsterId[3];
			sjson.opportunity = arSetsterId[4];
			//Add in contactname via lookup
			var contactLookup = nlapiLookupField('contact', sjson.contactid, ['firstname','lastname'],false);
			sjson.contactname = contactLookup['firstname']+' '+contactLookup['lastname'];
			
		}
	}
	
	var hiddenOpp = form.addField('custpage_opp', 'text', 'Opportunity', null, null);
	hiddenOpp.setDefaultValue(sjson.opportunity);
	hiddenOpp.setDisplayType('hidden');
	
	if (nlapiGetFieldValue('custevent_crm_setsterlocid'))
	{
		var arLocationId = nlapiGetFieldValue('custevent_crm_setsterlocid').split('|');
		//THis should always be 2 to execute. ID|Name
		if (arLocationId && arLocationId.length == 2)
		{
			sjson.location = arLocationId[0];
			sjson.locationtext = arLocationId[1];
		}
	}
	
	if (nlapiGetFieldValue('custevent_crm_setsterserid'))
	{
		var arServiceId = nlapiGetFieldValue('custevent_crm_setsterserid').split('|');
		//THis should always be 2 to execute. ID|Name
		if (arServiceId && arServiceId.length == 2)
		{
			sjson.service = arServiceId[0];
			sjson.servicetext = arServiceId[1];
		}
	}
	
	if (nlapiGetFieldValue('custevent_crm_setsterproid'))
	{
		var arProviderId = nlapiGetFieldValue('custevent_crm_setsterproid').split('|');
		//THis should always be 3 to execute. ID|Name|Email
		if (arProviderId && arProviderId.length == 3)
		{
			sjson.provider = arProviderId[0];
			sjson.providertext = arProviderId[1];
			sjson.provideremail = arProviderId[2];
		}
	}
	
	//Add in hidden setster id field
	var setidfld = form.addField('custpage_setsteridonly','text','Setster ID ONLY', null, null);
	setidfld.setDefaultValue(sjson.setsterid);
	setidfld.setDisplayType('hidden');
	
	//2. Add in Email Info as set in Setster
	//	 - Fields should be displayed before Demo Type Field custevent_demo_type
	var contactNameFld = form.addField('custpage_contactname','text','Contact Name', null, null);
	contactNameFld.setDisplayType('hidden');
	contactNameFld.setDefaultValue(sjson.contactname);

	//Add in CC email field
	var ccEmailFld = form.addField('custpage_ccemails','textarea','CC Emails', null,null);
	ccEmailFld.setDefaultValue(nlapiGetFieldValue('custevent_crm_setster_ccemails'));
	form.insertField(ccEmailFld, 'custevent_demo_type');
	
	var contactEmailFld = form.addField('custpage_contactemail', 'email', 'Contact Email', null, null);
	contactEmailFld.setDefaultValue(sjson.email);
	contactEmailFld.setMandatory(true);
	form.insertField(contactEmailFld, 'custpage_ccemails');
	

	
	/**
	 * Original fields are all hidden and OnLoad is rebuilding with custom fields 
	 * This will allow custom positioning of the fields
	 */
	//3. Build custom event detail and add in all custom setster fields.
	form.addFieldGroup('custpage_grpa', 'Setster Event Details', null);
	//3a. Add in date
	//	  - This field will sync with native startdate field
	//If display is VIEW show as text field
	var datefld = null;
	if (type=='view')
	{
		datefld = form.addField('custpage_demodate', 'text', 'Demo Date', null, 'custpage_grpa');
	}
	else
	{
		datefld = form.addField('custpage_demodate', 'date', 'Demo Date', null, 'custpage_grpa');
	}
	datefld.setDefaultValue(nlapiGetFieldValue('startdate'));
	datefld.setMandatory(true);
	datefld.setBreakType('startcol');
	//datefld disabled unless user changes status to Re-Scheduled
	datefld.setDisplayType('disabled');
	
	//3b. Add in time - Sync with current starttime field
	var timefld = form.addField('custpage_demotime', 'select','Demo Time', null, 'custpage_grpa');
	timefld.addSelectOption('', '', false);
	timefld.setMandatory(true);
	//add in currently set time to the list
	timefld.addSelectOption(convertTo24H(nlapiGetFieldValue('starttime')), nlapiGetFieldValue('starttime'), true);
	//timefld disabled unless user changes status to Re-Scheduled
	timefld.setDisplayType('disabled');
	
	//NS Defect where dynamic page field text does not come through
	var timetextfld = form.addField('custpage_demotimetext','text','Time Text', null,'custpage_grpa');
	timetextfld.setDisplayType('hidden');
	
	//3b. Add in Client timezone
	//Client Time zone
	var clitzfld = form.addField('custpage_clitz','select','Client Timezone', null, 'custpage_grpa');
	clitzfld.setMandatory(true);
	
	//3c. Add in Duration - Sync with current custevent_crm_setsterduration field
	var durationfld = form.addField('custpage_duration', 'integer', 'Duration', null, 'custpage_grpa');
	durationfld.setDisplayType('disabled');
	durationfld.setDefaultValue(nlapiGetFieldValue('custevent_crm_setsterduration'));
	durationfld.setMandatory(true);
	
	//1/28/2016 - Request to add Available dates on Event record as well
	//Add next available dates related info
	var nextdatesfld = form.addField('custpage_nextdates','textarea','Next Available Dates',null,'custpage_grpa');
	nextdatesfld.setDisplayType('inline');
	nextdatesfld.setBreakType('startcol');
	
	//3d. Add in Location - Default disabled
	var locationfld = form.addField('custpage_location', 'select','Location', null,'custpage_grpa');
	locationfld.setBreakType('startcol');
	locationfld.addSelectOption(sjson.location, sjson.locationtext, true);
	locationfld.setDisplayType('disabled');
	locationfld.setMandatory(true);
	
	//NS Defect where dynamic page field text does not come through
	var locationtextfld = form.addField('custpage_locationtext','text','Location Text', null,'custpage_grpa');
	locationtextfld.setDisplayType('hidden');
	
	//3e. Add in Service - Default disabled
	var servicefld = form.addField('custpage_service', 'select','Service', null, 'custpage_grpa');
	servicefld.addSelectOption(sjson.service, sjson.servicetext, true);
	servicefld.setDisplayType('disabled');
	servicefld.setMandatory(true);
	
	//NS Defect where dynamic page field text does not come through
	var servicetextfld = form.addField('custpage_servicetext','text','Service Text', null,'custpage_grpa');
	servicetextfld.setDisplayType('hidden');
	
	
	//3f. Add in Provider - Default disabled
	var providerfld = form.addField('custpage_provider','select','Demo Technician', null,'custpage_grpa');
	providerfld.addSelectOption(sjson.provider, sjson.providertext, true);
	providerfld.setDisplayType('disabled');
	providerfld.setMandatory(true);
	
	//NS Defect where dynamic page field text does not come through
	var providertextfld = form.addField('custpage_providertext','text','Provider Text', null,'custpage_grpa');
	providertextfld.setDisplayType('hidden');
	
	if (type == 'edit')
	{
		var authjson = setsterAuthenticate();
		if (authjson.status)
		{
			pjson.sessionid = authjson.sessionid;
			
			//Add in Session ID to be used on after submit
			var sidfld = form.addField('custpage_sessionid', 'text', 'Session ID', null, null);
			sidfld.setDisplayType('hidden');
			sidfld.setDefaultValue(pjson.sessionid);
		}
		//Grab ALL Time Zones
		var tzjson = getAllSetsterTimezone(pjson);
		var sjsonhtml = form.addField('custpage_sjsonhtml','inlinehtml','',null,null);
		sjsonhtml.setDefaultValue(
			'<script language="javascript">'+
			'var sjson = '+
			JSON.stringify(sjson)+
			';'+
			'</script>'
		);
		
		var tzhtml = form.addField('custpage_tzhtml','inlinehtml','',null,null);
		tzhtml.setDefaultValue(
			'<script language="javascript">'+
			'var tzjson = '+
			JSON.stringify(tzjson)+
			';'+
			'</script>'
		);
		
		//Add in List of ALL available timezones from Setster
		//clitzfld
		for(var tzz in tzjson.data)
		{
			if (tzz=='0')
			{
				continue;
			}
			
			clitzfld.addSelectOption(tzz, tzjson.data[tzz].caption, false);
		}
		clitzfld.setDefaultValue(sjson.timezone);
		clitzfld.setDisplayType('disabled');
		
		//Need to grab custom event status to native status mapping
		var eventStatusMap = {};
		var vsEventFlt = [new nlobjSearchFilter('isinactive', null, 'is', 'F')];
		var vsEventCol = [new nlobjSearchColumn('internalid'),
		                  new nlobjSearchColumn('custrecord_vses_nsstatus')];
		var vsEventRs = nlapiSearchRecord('customrecord_vseventstatus', null, vsEventFlt, vsEventCol);
		//assume there are values here
		for (var e=0; e < vsEventRs.length; e+=1)
		{
			eventStatusMap[vsEventRs[e].getValue('internalid')] = vsEventRs[e].getValue('custrecord_vses_nsstatus');
		}
		//Add this to client side for access
		var esmfld = form.addField('custpage_esmfld', 'inlinehtml', '', null, null);
		esmfld.setDefaultValue(
			'<script language="JavaScript">'+
			'var eventStatusMap='+JSON.stringify(eventStatusMap)+';'+
			'</script>'
		);
	}
	
}


function eventDemoDateBeforeSubmit(type)
{
	//BUG Work around to keep transaction value set 
	//custpage_opp
	//IF not UI, type of view, xedit or delete, exit out 
	if (nlapiGetContext().getExecutionContext() != 'userinterface' || 
		type == 'xedit' || type == 'view')
	{
		return;
	}

	//ADD in execution FORM logic Here
	//		- JUST incase they create another event form to be used without Setster
	if (nlapiGetFieldValue('customform') != nlapiGetContext().getSetting('SCRIPT', 'custscript_74_eventform'))
	{
		return;
	}
	
	log('debug','trx field',nlapiGetFieldValue('transaction'));
	
	nlapiSetFieldValue('transaction',nlapiGetFieldValue('custpage_opp'));
	
	nlapiSetFieldValue('custevent_crm_setster_ccemails', nlapiGetFieldValue('custpage_ccemails'));

}

/**
 * The recordType (internal id) corresponds to the "Applied To" record in your script deployment. 
 * @appliedtorecord recordType
 * 
 * @param {String} type Operation types: create, edit, delete, xedit,
 *                      approve, cancel, reject (SO, ER, Time Bill, PO & RMA only)
 *                      pack, ship (IF only)
 *                      dropship, specialorder, orderitems (PO only) 
 *                      paybills (vendor payments)
 * @returns {Void}
 */
function eventDemoDateAfterSubmit(type)
{
	log('debug','custom flds',nlapiGetFieldValue('custpage_demotime'));
	log('debug','Start date vs demostart flds',nlapiGetFieldValue('startdate')+' // '+nlapiGetFieldValue('custpage_demodate'));
	log('debug','Recurrance',nlapiGetFieldValue('seriesstartdate'));
	
	//IF not UI, type of view, xedit or delete, exit out 
	if (nlapiGetContext().getExecutionContext() != 'userinterface' || 
		type == 'xedit' || type == 'view')
	{
		return;
	}
	
	//ADD in execution FORM logic Here
	//		- JUST incase they create another event form to be used without Setster
	if (nlapiGetFieldValue('customform') != nlapiGetContext().getSetting('SCRIPT', 'custscript_74_eventform'))
	{
		return;
	}
	
	//Get the sessio ID from prior screen
	pjson.sessionid = nlapiGetFieldValue('custpage_sessionid');
	pjson.eventid = nlapiGetFieldValue('custpage_setsteridonly');
	if (!pjson.sessionid)
	{
		var authjson = setsterAuthenticate();
		if (authjson.status)
		{
			pjson.sessionid = authjson.sessionid;
		}
		else
		{
			log('error','Unable to process Setster Sync','Event ID '+nlapiGetRecordId()+' // Unable to Authenticate into Setster: '+pjson.error);
			nlapiSendEmail(
				-5, 
				paramErrorNotification, 
				'Unable to process Setster sync', 
				'Event ID '+nlapiGetRecordId()+' // Unable to Authenticate into Setster: '+pjson.error,
				paramErrorCc
			);
			return;
		}
	}
	
	try
	{
		//Delete - Delete the event in Setster as Well. 
		//		   NO Notification is generated
		if (type=='delete')
		{
			var intobj = deleteSetsterAppt(pjson);
			if (!intobj.status)
			{
				throw nlapiCreateError('SETSTER_ERR', getErrText(intobj.error), true);
			}
		}
		else
		{
			var oldrec = nlapiGetOldRecord();
			var newrec = nlapiGetNewRecord();
			var formattedStartDate = nlapiStringToDate(nlapiGetFieldValue('custpage_demodate'));
			formattedStartDate = formattedStartDate.getFullYear()+
								 '-'+
								 (formattedStartDate.getMonth()+1)+
								 '-'+
								 formattedStartDate.getDate()+
								 ' '+
								 nlapiGetFieldValue('custpage_demotime');
			
			var nsToSetsterStatusMap = {
				'2':'3', //Cancelled == declined or canceled
				'4':'8', //Completed == completed
				'1':'2', //Confirmed == email confirmed and validated or paid
				'3':'2' //Rescheduled == email confirmed and validated or paid 
						//12/21/2015 - Instead of doing delayed, use auto confirmed
			};
			
			//Execute below Process IF either status, startdate or starttime is different
			if ( (oldrec.getFieldValue('custevent_crm_vseventstatus') != newrec.getFieldValue('custevent_crm_vseventstatus') ) ||
				 (oldrec.getFieldValue('startdate') != newrec.getFieldValue('startdate') ) ||
				 (oldrec.getFieldValue('starttime') != newrec.getFieldValue('starttime') )
			   )
			{
				//Gets Sales Rep
				var custrec = nlapiLoadRecord('customer',nlapiGetFieldValue('company'));
				
				//Execute when evetn status have changed
				var postjson = {
					'data':JSON.stringify({
						'client_email':nlapiGetFieldValue('custpage_contactemail'),
						'client_name':custrec.getFieldValue('companyname'),
						'employee_id':nlapiGetFieldValue('custpage_provider'),
						'location_id':nlapiGetFieldValue('custpage_location'),
						'service_id':nlapiGetFieldValue('custpage_service'),
						'status':nsToSetsterStatusMap[nlapiGetFieldValue('custevent_crm_vseventstatus')],
						'start_date':formattedStartDate,
						'timezone_id':nlapiGetFieldValue('custpage_clitz')
					})
				};
				
				log('debug','Modify JSON', JSON.stringify(postjson));
				
				var modifyUrl = paramApiUrl+'appointment/'+pjson.eventid+'?session_token='+pjson.sessionid;
				
				log('debug','mod url',modifyUrl);
				
				var modifyRes = nlapiRequestURL(modifyUrl,postjson,null,'PUT');
				var modifyResJson = JSON.parse(modifyRes.getBody());
				
				log('debug','Modify JSON', JSON.stringify(modifyResJson));
				
				//If statusCode is 0, it's successful
				if (modifyResJson.statusCode == '0')
				{
					log('debug','modify res',JSON.stringify(modifyResJson));
					log('debug','New Start',modifyResJson.data.start_date);
					log('debug','New ID',modifyResJson.data.id);
					log('debug','GMT Formatted', getGmtInUtcFormat(modifyResJson.data.start_date));
					
					//Need to Update Event Record with Following Field values updated
					//custevent_crm_setsterid
					//custevent_crm_setstergmt
					var strSetsterId = modifyResJson.data.id.toString()+
					   '|'+
					   nlapiGetFieldValue('contact')+
					   '|'+
					   nlapiGetFieldValue('custpage_contactemail')+
					   '|'+
					   nlapiGetFieldValue('custpage_clitz')+
					   '|'+
					   nlapiGetFieldValue('transaction');
					
					var eventUpdFlds = ['custevent_crm_setsterid','custevent_crm_setstergmt'];
					var eventUpdVals = [strSetsterId, getGmtInUtcFormat(modifyResJson.data.start_date)];
					nlapiSubmitField(nlapiGetRecordType(), nlapiGetRecordId(), eventUpdFlds, eventUpdVals, false);
					
					//ONLY Execute below section IF it's cancelled or re-scheduled
					if (newrec.getFieldValue('custevent_crm_vseventstatus')=='2' || newrec.getFieldValue('custevent_crm_vseventstatus')=='3')
					{
						//If Re-Scheduled, Update Opportunity
						if (newrec.getFieldValue('custevent_crm_vseventstatus')=='3')
						{
							//Update Opportunity with new time and Demo type
							nlapiSubmitField(
								'opportunity', 
								nlapiGetFieldValue('transaction'), 
								'custbody_vs_demo_scheduled', 
								nlapiGetFieldValue('custpage_demodate'), 
								true
							);
						}
						
						var companyLookup = nlapiLookupField('customer', nlapiGetFieldValue('company'), ['companyname','salesrep'], false);
						var companyNameText = companyLookup['companyname'],
							companySalesRep = companyLookup['salesrep'];
						
						log('debug','Company Lookup',JSON.stringify(companyLookup));
						//Demo Tech RC Link
						//KEEP THis JUST IN Case They want to change again to Demo Tech link.
						var providerEmail = '',
							providerrclink = '';
						if (nlapiGetFieldValue('custevent_crm_setsterproid'))
						{
							var arProviderId = nlapiGetFieldValue('custevent_crm_setsterproid').split('|');
							//THis should always be 3 to execute. ID|Name|Email
							if (arProviderId && arProviderId.length == 3)
							{
								providerEmail = arProviderId[2];
								
								//look up provider ring central link value
								var peflt = [new nlobjSearchFilter('email', null, 'is', providerEmail)],
									pecol = [new nlobjSearchColumn('custentity_ringcentrallink')],
									pers = nlapiSearchRecord('employee', null, peflt, pecol);
								
								if (pers)
								{
									providerrclink = pers[0].getValue('custentity_ringcentrallink');
								}
								
							}
						}
						
						var srEmpRec = nlapiLoadRecord('employee', companySalesRep),
							srjson = {
								'salesrep':'',
								'salesrepemail':'',
								'salesrepphone':'',
								'salesreprclink':'',
								'salesreptitle':'',
								'supervisor':'',
								'supervisoremail':''
							};
						
						if (srEmpRec)
						{
							srjson.salesrep = srEmpRec.getFieldValue('firstname')+' '+srEmpRec.getFieldValue('lastname');
							srjson.salesrepemail = srEmpRec.getFieldValue('email');
							srjson.salesrepphone = srEmpRec.getFieldValue('officephone');
							srjson.salesreptitle = srEmpRec.getFieldValue('title');
							srjson.salesreprclink = srEmpRec.getFieldValue('custentity_ringcentrallink');
							srjson.supervisor = srEmpRec.getFieldText('supervisor');
							
							if (srEmpRec.getFieldValue('supervisor'))
							{
								//Do a look up to find supervisors' email address
								var superEmail = nlapiLookupField('employee', srEmpRec.getFieldValue('supervisor'), 'email', false);
								if (superEmail)
								{
									srjson.supervisoremail = superEmail;
								}
							}
						}
						
						//6. We MUST Generate Email Notification to Client, Demo Tech and Sales Rep/Boss
						var isCancelled = false;
						//If cancellation change the content
						if (newrec.getFieldValue('custevent_crm_vseventstatus')=='2')
						{
							isCancelled = true;
							
							//1/22/2016
							//MUST Clear out Schduled Date on Opportunity
							if (nlapiGetFieldValue('transaction'))
							{
								nlapiSubmitField('opportunity', nlapiGetFieldValue('transaction'), 'custbody_vs_demo_scheduled', '', false);
							}
							
						}
						
						var icsAttachment = generateIcsFile(
										   	{
										   		'start_date':getGmtInUtcFormat(modifyResJson.data.start_date),
										   		'duration':nlapiGetFieldValue('custpage_duration'),
										   		'subject':companyNameText+' - '+nlapiGetFieldText('custevent_demo_type'),
										   		'demotech':nlapiGetFieldValue('custpage_providertext'),
										   		'demotechemail':providerEmail,
										   		'salesrep':srjson.salesrep,
										   		'salesrepemail':srjson.salesrepemail,
										   		'servicetext':nlapiGetFieldValue('custpage_servicetext'),
										   		'locationtext':nlapiGetFieldValue('custpage_locationtext'),
										   		'company':companyNameText,
										   		'contact':nlapiGetFieldValue('custpage_contactname'),
										   		'contactemail':nlapiGetFieldValue('custpage_contactemail'),
										   		'iscancelled':isCancelled,
										   		'nseventid':nlapiGetRecordId(),
												'ringlink':srjson.salesreprclink
												//Demo Tech RC Link
												//KEEP THis JUST IN Case They want to change again to Demo Tech link.
										   		//'ringlink':providerrclink
										   	}
										   );
						
						var inviteSbj = companyNameText+' - '+nlapiGetFieldText('custevent_demo_type'),
							inviteMsg = getEmailMsg(
											{
												'contactname':nlapiGetFieldValue('custpage_contactname'),
												'salesrep':srjson.salesrep,
												'salesrepemail':srjson.salesrepemail,
												'salesrepphone':srjson.salesrepphone,
												'salesreptitle':srjson.salesreptitle,
												'servicetext':nlapiGetFieldValue('custpage_servicetext'),
												'date':nlapiGetFieldValue('custpage_demodate'),
												'time':nlapiGetFieldValue('custpage_demotimetext'),
												'clienttztext':nlapiGetFieldValue('custevent_crm_setsterclitztext'),
										   		'iscancelled':isCancelled,
										   		'ringlink':srjson.salesreprclink
										   		//For Demo Tech RC Link
										   		//'ringlink':providerrclink
											}
										);
						
							inviteFrom = nlapiGetContext().getSetting('SCRIPT', 'custscript_74_sendemailfrom');
						
							
						//We can Optionally BCC sales rep to all the emails using pjson.salesrepemail
						//1/22/2016 -
						//	Instead of Invite from, send from Sales Rep
						//Send to Client Contact Email
						var contactCcEmail = null;
						if (nlapiGetFieldValue('custevent_crm_setster_ccemails'))
						{
							contactCcEmail = nlapiGetFieldValue('custevent_crm_setster_ccemails').split(',');
						}

						//2/12/2016 - Client request to generate single email with client as primary recepient.
						var ccList = [srjson.supervisoremail, srjson.salesrepemail, providerEmail];
						if (contactCcEmail && contactCcEmail.length > 0)
						{
							//2/17/2016 - Go through and make sure there are no extra spaces on the email 
							for (var cc=0; cc < contactCcEmail.length; cc+=1)
							{
								contactCcEmail[cc] = strTrim(contactCcEmail[cc]);
							}
							
							
							ccList.concat(contactCcEmail);
						}
						
						nlapiSendEmail(companySalesRep, nlapiGetFieldValue('custpage_contactemail'), inviteSbj, inviteMsg, ccList, null, null, icsAttachment);
						
						//nlapiSendEmail(companySalesRep, nlapiGetFieldValue('custpage_contactemail'), inviteSbj, inviteMsg, contactCcEmail, null, null, icsAttachment);
						
						//Send to Demo Tech
						//nlapiSendEmail(companySalesRep,providerEmail, inviteSbj, inviteMsg, null, null, null, icsAttachment);
						
						//Send to Sales Rep/Boss
						//nlapiSendEmail(companySalesRep, companySalesRep, inviteSbj, inviteMsg, [srjson.supervisoremail], null, null, icsAttachment);
					}
				}
				else
				{	
					throw nlapiCreateError(
						'SETSTER_ERROR',
						'Error Modifying Appointment in Setster: '+pjson.eventid+
						 modifyResJson.statusCode+
						 ' // '+
						 modifyResJson.statusDescription,
						 false
					);
					
				}
			}
		}
	}
	catch(setsprocerr)
	{
		//Generate Error Email
		
		log('error','Error Updating Event', getErrText(setsprocerr));
		nlapiSendEmail(
			-5, 
			paramErrorNotification, 
			'Unable to Finalize Setster Update', 
			'Event ID '+nlapiGetRecordId()+
				', Unable to finalize updates to Setster. '+
				'Please note the ONLY NetSuite Event record was updated properly<br/><br/>'+
				getErrText(setsprocerr),
			paramErrorCc
		);
	}
	
}


/****************** Suitelet Function ***********************/
/**
 * This Suitelet is necessary to provide dynamic Opportunity list generation when company changes 
 * at the client level.
 */
function getRelatedOpportunities (req, res)
{
	var robj = {
		'success':false,
		'message':'',
		'opps':{}
	};
		
	if (!req.getParameter('customerid'))
	{
		robj.success = false;
		robj.message = 'Missing Customer';
	}
	else
	{
		try 
		{
			var oflt = [new nlobjSearchFilter('entity', null, 'anyof', req.getParameter('customerid'))];
			var ocol = [new nlobjSearchColumn('internalid').setSort(true), //Sort in DESC to return newest first
			            new nlobjSearchColumn('tranid'),
			            new nlobjSearchColumn('title')];
			var ors = nlapiSearchRecord('opportunity', null, oflt, ocol);
			
			if (!ors || (ors && ors.length == 0))
			{
				throw nlapiCreateError('OPPSEARCH-ERR', 'No Opportunities for customer ID '+req.getParameter('customerid'), true);
			}
			
			for (var i=0; ors && i < ors.length; i+=1)
			{
				//build list of Opportunity to return back
				robj.opps[ors[i].getValue('internalid')] = '#'+ors[i].getValue('tranid') + ' - ' + ors[i].getValue('title');
			}	
			robj.success = true;
		}
		catch (opperr)
		{
			log(
				'error',
				'Error searching for Opportunities for Customer',
				'Customer ID '+req.getParameter('customerid')+' // '+getErrText(opperr)
			);
			robj.message = getErrText(opperr);
		}
	}
		
	log('debug','rjob',JSON.stringify(robj));
		
	res.write(JSON.stringify(robj));
}

/****************** Event Client Script *********************/
/**
 * Custom function to allow user to execute Save and Create Opportunity all at the same time
 * @returns {Boolean}
 */
function eventDemoDateOnSave()
{
	return true;	
}

function eventDemoDatePageInit(type)
{
	//ADD in execution FORM logic Here
	//		- JUST incase they create another event form to be used without Setster
	if (nlapiGetFieldValue('customform') != nlapiGetContext().getSetting('SCRIPT', 'custscript_74_eventform'))
	{
		return;
	}
	
	//Upon page init if the status is Re-scheduled, enable fields
	//Monitor custevent_crm_vseventstatus change
	if (nlapiGetFieldValue('custevent_crm_vseventstatus') == '3')
	{
		nlapiDisableField('custpage_demodate', false);
		nlapiDisableField('custpage_demotime', false);
	}
	
	nlapiSetFieldValue('custpage_demotimetext', nlapiGetFieldText('custpage_demotime'), true,true);
	
	nlapiSetFieldValue('custpage_locationtext', nlapiGetFieldText('custpage_location'), true,true);
	
	nlapiSetFieldValue('custpage_servicetext', nlapiGetFieldText('custpage_service'), true,true);
	
	nlapiSetFieldValue('custpage_providertext', nlapiGetFieldText('custpage_provider'), true,true);
	
	//Trigger look up on next available dates
	if (sjson.location && sjson.service && sjson.provider)
	{
		//Trigger Next available dates lookup
		var wvaUrl = nlapiResolveURL('SUITELET', 'customscript_ax_sl_demodatesetsterapi', 'customdeploy_ax_sl_demodatesetsterapi', 'VIEW')+
					    '&custparam_provider='+sjson.provider+
						'&custparam_service='+sjson.service+
						'&custparam_location='+sjson.location+
						'&custparam_action=availdates'+
						'&custparam_timezone='+nlapiGetFieldValue('custpage_clitz')+
						'&custparam_session='+nlapiGetFieldValue('custpage_sessionid');
		
		var wvaRes = nlapiRequestURL(wvaUrl);
		var wvaResJson = JSON.parse(wvaRes.getBody());
		//IF status is true display next available dates
		if (wvaResJson.status)
		{
			var arDates = wvaResJson.data,
				displayVal = '';
			
			for (var d=0; d < arDates.length; d+=1)
			{
				displayVal += arDates[d];
				
				if ((d+1)%3==0)
				{
					displayVal +='<br/>';
				}
				else
				{
					displayVal +=', ';
				}
			}
			
			nlapiSetFieldValue('custpage_nextdates', displayVal);
		}
	}
	
	//Trigger look up ONLY if all 4 fields are set
	if (nlapiGetFieldValue('custpage_demodate') && sjson.location && sjson.service && sjson.provider)
	{
		var apiDateFormat = nlapiStringToDate(nlapiGetFieldValue('custpage_demodate'));
		apiDateFormat = apiDateFormat.getFullYear()+
						'-'+
						(apiDateFormat.getMonth()+1)+
						'-'+
						apiDateFormat.getDate();
		
		var avaUrl = nlapiResolveURL('SUITELET', 'customscript_ax_sl_demodatesetsterapi', 'customdeploy_ax_sl_demodatesetsterapi', 'VIEW')+
					 '&custparam_date='+apiDateFormat+
					 '&custparam_provider='+sjson.provider+
					 '&custparam_service='+sjson.service+
					 '&custparam_location='+sjson.location+
					 '&custparam_timezone='+sjson.timezone+
					 '&custparam_action=availability'+
					 '&custparam_session='+nlapiGetFieldValue('custpage_sessionid');
		
		var avaRes = nlapiRequestURL(avaUrl);
		var avaResJson = JSON.parse(avaRes.getBody());
		//IF status is true go through and populate the Time drop down.
		//	Time drop down is available time FOR the date selected
		if (avaResJson.status)
		{			
			//Check to see if data element exist
			if (avaResJson.data)
			{
				//Only ONE Date element will return
				for (var t in avaResJson.data.times)
				{
					var arTimes = avaResJson.data.times[t];
					
					//Go through each available time and add it in as am/pm TEXT
					if (!arTimes || (arTimes && arTimes.length == 0) || (arTimes && arTimes.length > 0 && !arTimes[0]))
					{
						alert('There are no available time for this date. Please select another date');
					}
					else
					{
						for(var t=0; t < arTimes.length; t+=1)
						{
							var optionValue = arTimes[t];
							var optionText = arTimes[t];
							
							if (optionText)
							{
								optionText = convertToAmPm(optionText);
								
								//If original time matches what's been returned skip.
								//	This can happen when the event is in cancelled state
								if (optionText == sjson.originaltime)
								{
									continue;
								}
								
								//Add it into option
								nlapiInsertSelectOption('custpage_demotime', optionValue, optionText, false);
							}
						}
					}
				}
			}
		}
	}
}


function eventDemoDateFldChanged(type, name, linenum)
{
	//ADD in execution FORM logic Here
	//		- JUST incase they create another event form to be used without Setster
	if (nlapiGetFieldValue('customform') != nlapiGetContext().getSetting('SCRIPT', 'custscript_74_eventform'))
	{
		return;
	}
	
	//Monitor custevent_crm_vseventstatus change
	if (name == 'custevent_crm_vseventstatus')
	{
		if (nlapiGetFieldValue(name) == '3')
		{
			nlapiDisableField('custpage_demodate', false);
			nlapiDisableField('custpage_demotime', false);
		}
		else
		{
			nlapiDisableField('custpage_demodate', true);
			nlapiDisableField('custpage_demotime', true);
		}
		
		//Sync it up to status
		nlapiSetFieldValue('status', eventStatusMap[nlapiGetFieldValue('custevent_crm_vseventstatus')], true, true);
		
	}
	
	//Monitor custpage_demodate
	if (name == 'custpage_demodate')
	{
		//Set native startdate
		nlapiSetFieldValue('startdate', nlapiGetFieldValue(name),true,true);
		nlapiSetFieldValue('enddate', nlapiGetFieldValue(name),true,true);
		//nlapiSetFieldValue('seriesstartdate',nlapiGetFieldValue(name),true,true);
		
		//Trigger look up ONLY if all 4 fields are set
		if (nlapiGetFieldValue(name) && sjson.location && sjson.service && sjson.provider)
		{
			var apiDateFormat = nlapiStringToDate(nlapiGetFieldValue(name));
			apiDateFormat = apiDateFormat.getFullYear()+
							'-'+
							(apiDateFormat.getMonth()+1)+
							'-'+
							apiDateFormat.getDate();
			
			var avaUrl = nlapiResolveURL('SUITELET', 'customscript_ax_sl_demodatesetsterapi', 'customdeploy_ax_sl_demodatesetsterapi', 'VIEW')+
						 '&custparam_date='+apiDateFormat+
						 '&custparam_provider='+sjson.provider+
						 '&custparam_service='+sjson.service+
						 '&custparam_location='+sjson.location+
						 '&custparam_timezone='+sjson.timezone+
						 '&custparam_action=availability'+
						 '&custparam_session='+nlapiGetFieldValue('custpage_sessionid');
			
			var avaRes = nlapiRequestURL(avaUrl);
			var avaResJson = JSON.parse(avaRes.getBody());
			//IF status is true go through and populate the Time drop down.
			//	Time drop down is available time FOR the date selected
			if (avaResJson.status)
			{
				nlapiRemoveSelectOption('custpage_demotime', null);
				nlapiInsertSelectOption('custpage_demotime', '', '', true);
				
				//If date selected matches original date, add in original time
				if (nlapiGetFieldValue(name) == sjson.originaldate)
				{
					nlapiInsertSelectOption('custpage_demotime',convertTo24H(sjson.originaltime),sjson.originaltime,false);
				}
				
				//Check to see if data element exist
				if (avaResJson.data)
				{
					//Only ONE Date element will return
					for (var t in avaResJson.data.times)
					{
						var arTimes = avaResJson.data.times[t];
						
						//Go through each available time and add it in as am/pm TEXT
						if (!arTimes || (arTimes && arTimes.length == 0) || (arTimes && arTimes.length > 0 && !arTimes[0]))
						{
							alert('There are no available time for this date. Please select another date');
						}
						else
						{
							for(var t=0; t < arTimes.length; t+=1)
							{
								var optionValue = arTimes[t];
								var optionText = arTimes[t];
								
								if (optionText)
								{
									optionText = convertToAmPm(optionText);
									
									//If original time matches what's been returned skip.
									//	This can happen when the event is in cancelled state
									if (optionText == sjson.originaltime)
									{
										continue;
									}
									
									//Add it into option
									nlapiInsertSelectOption('custpage_demotime', optionValue, optionText, false);
								}
							}
						}
					}
				}
			}
		}
	}	
	
	//Monitor custpage_demotime
	if (name == 'custpage_demotime')
	{
		nlapiSetFieldValue('starttime', nlapiGetFieldText('custpage_demotime'), true,true);
		
		nlapiSetFieldValue('custpage_demotimetext', nlapiGetFieldText(name), true,true);
	}
	
	if (name == 'custpage_ccemails')
	{
		nlapiSetFieldValue('custevent_crm_setster_ccemails', nlapiGetFieldValue(name),true,true);
	}
	
}
