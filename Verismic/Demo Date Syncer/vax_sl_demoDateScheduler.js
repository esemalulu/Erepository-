/**
 * Module Description
 * 
 * Version    Date            Author           Remarks
 * 1.00       30 Nov 2015     json
 *
 */

/**
 * @param {nlobjRequest} req Request object
 * @param {nlobjResponse} res Response object
 * @returns {Void} Any output is written via response object
 */

var nsform = null,
	//Below are company level preference values that are sourced from Setup > Company > General Preferences > Custom Preference Tab
	paramApiUrl = nlapiGetContext().getSetting('SCRIPT','custscript_74_apiurl'),
	paramApiToken = nlapiGetContext().getSetting('SCRIPT','custscript_74_token'),
	paramApiEmail = nlapiGetContext().getSetting('SCRIPT','custscript_74_email'),
	pjson = {
		'sessionid':'', 'paramLpcId':'', 'paramLpcType':'', 
		'nextaction':'', 'opportunity':'', 'demotype':'',
		'demotypetext':'','companyname':'','email':'', 'contactid':'', 'ccemails':'',
		'location':'', 'locationtext':'', 'service':'', 'servicetext':'', 
		'provider':'', 'providertext':'','demodate':'',
		'demotime':'', 'demotimetext':'','demoduration':'', 'nsevent':'',
		'salesrep':'', 'salesrepid':'', 'salesrepemail':'', 'salesrepphone':'','salesreptitle':'',
		'salesreprclink':'','demotechrclink':'','supervisor':'', 'supervisorid':'','supervisoremail':'',
		'provideremail':'','clienttz':'',
		'clienttztext':'','locationtztext':''
	};

//Company Setting
var paramErrorNotification = nlapiGetContext().getSetting('SCRIPT','custscript_74_setstererr'),
	paramErrorCc = nlapiGetContext().getSetting('SCRIPT','custscript_74_setstercc');
if (paramErrorCc)
{
	paramErrorCc = paramErrorCc.split(','); 
}


function demoDateScheduler(req, res){

	nsform = nlapiCreateForm('Event Scheduling', false);
	nsform.setScript('customscript_ax_cs_demodateschhelper');
	
	var statusfld = nsform.addField('custpage_statusfld', 'inlinehtml', '', null, null);
	statusfld.setLayoutType('outsideabove', null);
	
	if (req.getParameter('custparam_procmsg'))
	{
		var procStatus = req.getParameter('custparam_procstatus');
		
		statusfld.setDefaultValue(req.getParameter('custparam_procmsg'));
		
	}
	
	try
	{
		//Add Cancel/Close Button here
		nsform.addButton('custpage_closebtn', 'Cancel', 'cancelGoBack');
		
		pjson.paramLpcId = req.getParameter('custpage_lpcid'),
		pjson.paramLpcType = req.getParameter('custpage_lpctype');
		pjson.companyname = req.getParameter('custpage_companyname');
		pjson.contactid = req.getParameter('custpage_contactlist');
		pjson.contactname = '';
		pjson.email = req.getParameter('custpage_email');
		pjson.ccemails = req.getParameter('custpage_ccemail');
		pjson.nextaction = req.getParameter('custpage_nextaction');
		pjson.opportunity = req.getParameter('custpage_custopp');
		pjson.demotype = req.getParameter('custpage_demotype');
		pjson.demotypetext = req.getParameter('custpage_demotypetext');
		pjson.location = req.getParameter('custpage_location');
		pjson.locationtext = req.getParameter('custpage_locationtext');
		pjson.service = req.getParameter('custpage_service');
		pjson.servicetext = req.getParameter('custpage_servicetext');
		pjson.provider = req.getParameter('custpage_provider');
		pjson.providertext = req.getParameter('custpage_providertext');
		pjson.provideremail = req.getParameter('custpage_provideremail');
		pjson.demodate = req.getParameter('custpage_date');
		pjson.demotime = req.getParameter('custpage_time');
		pjson.demotimetext = req.getParameter('custpage_timetext');
		pjson.demoduration = req.getParameter('custpage_duration');
		pjson.sessionid = req.getParameter('custpage_ssession');
		pjson.salesrep = req.getParameter('custpage_salesrep');
		pjson.salesrepid = req.getParameter('custpage_salesrepid');
		pjson.salesrepemail = req.getParameter('custpage_salesrepemail');
		pjson.salesrepphone = req.getParameter('custpage_salesrepphone');
		pjson.salesreprclink = req.getParameter('custpage_salesreprclink');
		//for Demo Tech Link
		//pjson.demotechrclink = req.getParameter('custpage_demotechrclink');
		pjson.salesreptitle = req.getParameter('custpage_salesreptitle');
		pjson.supervisor = req.getParameter('custpage_supervisor');
		pjson.supervisorid = req.getParameter('custpage_supervisorid');
		pjson.supervisoremail = req.getParameter('custpage_supervisoremail');
		pjson.clienttz = req.getParameter('custpage_clitz');
		pjson.locationtztext = req.getParameter('custpage_loctz');
		pjson.clienttztext = req.getParameter('custpage_clitztext');
		
		log('debug','cc Emails', pjson.ccemails);
		
		if (!pjson.paramLpcId)
		{
			pjson.paramLpcId = req.getParameter('custparam_lpcid') || '';
		}
		
		if (!pjson.paramLpcType)
		{
			pjson.paramLpcType = req.getParameter('custparam_lpctype') || '';
		}
		
		if (!pjson.paramLpcId || !pjson.paramLpcType)
		{
			//throw error that you are missing some values
			throw new nlapiCreateError(
				'DDSCH_ERR', 
				'Missing Required information such as L/P/C ID and Type. // User '+nlapiGetUser(), 
				false
			);
		}
		
		if (!pjson.sessionid)
		{
			pjson.sessionid = req.getParameter('custparam_ssession');
		}
		
		//Initially grab and set session ID
		if (!pjson.sessionid)
		{
			var authjson = setsterAuthenticate();
			if (authjson.status)
			{
				pjson.sessionid = authjson.sessionid;
			}
		}
		
		//Grab all request level parameters
		
		//------------------ Begin POST PROCESSING --------------------------------------------------
		//	- Will Redirect to THIS Suitelet 
		if (req.getMethod() == 'POST')
		{
			var apptjson = {
				'status':false,
				'error':'',
				'data':{},
				'id':'',
				'client_id':''
			};
			
			//Do quick first/lastname lookup
			var contactLookup = nlapiLookupField('contact', pjson.contactid, ['firstname','lastname'],false);
			pjson.contactname = contactLookup['firstname']+' '+contactLookup['lastname'];
			
			var formattedStartDate = nlapiStringToDate(pjson.demodate);
			formattedStartDate = formattedStartDate.getFullYear()+
								 '-'+
								 (formattedStartDate.getMonth()+1)+
								 '-'+
								 formattedStartDate.getDate()+
								 ' '+
								 pjson.demotime;
								 
			var postjson = {
				'data':JSON.stringify({
					'client_email':pjson.email,
					'client_name':pjson.companyname,
					'employee_id':pjson.provider,
					'location_id':pjson.location,
					'service_id':pjson.service,
					'start_date':formattedStartDate,
					//Client TZ removed. Support is unclear.
					'timezone_id':pjson.clienttz
				})
			};
			
			log('debug','postjson',JSON.stringify(postjson));
			
			try 
			{
				//1. Create Opportunity IF we need to creat one
				if (pjson.nextaction == 'saveandopp' || !pjson.opportunity)
				{
					try
					{
						var opprec = nlapiCreateRecord('opportunity', {recordmode:'dynamic'});
						//Set Title
						opprec.setFieldValue(
							'title',
							pjson.companyname+' - '+pjson.demotypetext
						);
						
						//Set Customer
						opprec.setFieldValue(
							'entity',
							pjson.paramLpcId
						);
						
						//Set Class use custscript_74_oppdefclass default
						opprec.setFieldValue(
							'class',
							nlapiGetContext().getSetting('SCRIPT', 'custscript_74_oppdefclass')
						);
						
						//Set Demo Type
						opprec.setFieldValue(
							'custbody_vs_opp_demo_type',
							pjson.demotype
						);
						
						//Set Status to Demo Booked
						opprec.setFieldValue(
							'entitystatus',
							'18'
						);
						
						//Set Demo Scheduled Date to CURRENT Date (Date event is created)
						opprec.setFieldValue(
							'custbody_vs_demo_scheduled',
							pjson.demodate
						);
						
						//1/22/2016 - Leave it blank
						//Set Demo Comleted Date to Date of Event
						opprec.setFieldValue(
							'custbody_vs_opp_demo_datee',
							''
						);
						
						pjson.opportunity = nlapiSubmitRecord(opprec, true, true);
					}
					catch (createopperr)
					{
						//throw the error and NOTIFY Admins
						throw nlapiCreateError(
							'DEMODATE-OPPCREATE-ERR', 
							'Unable to create Opportunity for this event. NO Opportunity, NO Appointment, NO Event is created: '+getErrText(createopperr), 
							false
						);
					}
				}
				else
				{
					//Assume Update
					try
					{
						var opprec = nlapiLoadRecord('opportunity', pjson.opportunity, {recordmode:'dynamic'});
						
						//Set Title
						opprec.setFieldValue(
							'title',
							pjson.companyname+' - '+pjson.demotypetext
						);
						
						//Set Demo Type
						opprec.setFieldValue(
							'custbody_vs_opp_demo_type',
							pjson.demotype
						);
						
						//1/22/2016 - Client Request. DO NOT Touch Demo Completed Date
						//Set Demo Comleted Date to Date of Event
						opprec.setFieldValue(
							'custbody_vs_opp_demo_datee',
							''
						);
						
						//1/22/2016 - Demo Scheduled Date
						//Set Demo Scheduled Date to CURRENT Date (Date event is created)
						opprec.setFieldValue(
							'custbody_vs_demo_scheduled',
							pjson.demodate
						);
						
						pjson.opportunity = nlapiSubmitRecord(opprec, true, true);
					}
					catch (updopperr)
					{
						//throw the error and NOTIFY Admins
						throw nlapiCreateError(
							'DEMODATE-OPPUPDATE-ERR', 
							'Unable to update Opportunity for this event. NO Opportunity is updated, NO Appointment, NO Event is created: '+getErrText(updateopperr), 
							false
						);
					}
				
				}
				
				
				//2. At this point, we KNOW we have Opportunity
				//	 Create NS Event first
				try
				{
					var nsevent = nlapiCreateRecord('calendarevent', {recordmode:'dynamic'});
					nsevent.setFieldValue(
						'title',
						'Setster Event '+pjson.companyname+' - '+pjson.demotypetext
					);
					
					nsevent.setFieldValue(
						'custevent_crm_vseventstatus',
						'1' //Confirmed
					);
					
					nsevent.setFieldValue(
						'startdate',
						pjson.demodate
					);
					
					nsevent.setFieldValue(
						'starttime',
						pjson.demotimetext
					);
					
					nsevent.setFieldValue(
						'company',
						pjson.paramLpcId
					);
					
					//Set contact
					nsevent.setFieldValue(
						'contact',
						pjson.contactid
					);
					
					nsevent.setFieldValue(
						'custevent_demo_type',
						pjson.demotype
					);
					
					nsevent.setFieldValue(
						'transaction',
						pjson.opportunity
					);
					
					nsevent.setFieldValue(
						'custevent_crm_setster_ccemails',
						pjson.ccemails);
					
					pjson.nsevent = nlapiSubmitRecord(nsevent, true, true);
					
				}
				catch (nseventerr)
				{
					//throw the error and NOTIFY Admins
					throw nlapiCreateError(
						'DEMODATE-NSEVENTCREATE-ERR', 
						'Unable to create NetSuite Event. NO Appointment, NO Event is created: '+getErrText(nseventerr), 
						false
					);
				}
				
				//3. At this point, we have EVENT AND OPPORTUNITY
				//	 CREATE Setster Event
				try
				{
					var createUrl = paramApiUrl+'appointment?session_token='+pjson.sessionid;
	
					var createRes = nlapiRequestURL(createUrl,postjson,null,'POST');
					var createResJson = JSON.parse(createRes.getBody());
					
					log('debug','Create JSON', JSON.stringify(createResJson));
					
					//If statusCode is 0, it's successful
					if (createResJson.statusCode == '0')
					{
						apptjson.status = true;
						apptjson.data = createResJson.data;
						apptjson.id = createResJson.data.id;
						apptjson.client_id = createResJson.data.client_id;
						apptjson.error = 'Successfully created Appointment ID '+apptjson.id+' in Setster';
						
					}
					else
					{	
						throw nlapiCreateError(
							'SETSTER_ERROR',
							'Error Creating Appointment in Setster: '+
							 createResJson.statusCode+
							 ' // '+
							 createResJson.statusDescription,
							 false
						);
						
					}
				}
				catch (setcreateerr)
				{
					//throw the error and NOTIFY Admins
					throw nlapiCreateError(
						'DEMODATE-SETSTERCREATE-ERR', 
						'Unable to create Setster Event. NO Appointment created BUT NetSuite Event and/or NS Opportunity WAS CREATED: '+getErrText(setcreateerr), 
						false
					);
				}
				
				//4. At this point, WE HAVE EVERYTHING. UPDATE EVENT With Setster ID and 
				try
				{
					//Combine Both ID and Text values when storing it on the Event
					//IMPORTANT: 
					//setster ID: ID|Contact ID|Contact Email|Client Timezone|Opp
					//Location ID: ID|Location Text
					//Service ID: ID|Service Text
					//Provider ID: ID|Provider Text|Provider Email
					
					var strSetsterId = apptjson.id.toString()+
									   '|'+
									   pjson.contactid+
									   '|'+
									   pjson.email+
									   '|'+
									   pjson.clienttz+
									   '|'+
									   pjson.opportunity,
						strSetsterLocId = apptjson.data.location_id.toString()+
										  '|'+
										  pjson.locationtext,
						strSetsterSerId = apptjson.data.service_id.toString()+
										  '|'+
										  pjson.servicetext,
						strSetsterProId = apptjson.data.employee_id.toString()+
										  '|'+
										  pjson.providertext+
										  '|'+
										  pjson.provideremail;
					
					var updEventFlds = ['custevent_crm_setsterid',
					                    'custevent_crm_setsterlocid',
					                    'custevent_crm_setsterserid',
					                    'custevent_crm_setsterproid',
					                    'custevent_crm_setsterduration',
					                    'custevent_crm_setstergmt',
					                    'custevent_crm_setsterloctztext',
					                    'custevent_crm_setsterclitztext'];
					
					var updEventVals = [strSetsterId,
					                    strSetsterLocId,
					                    strSetsterSerId,
					                    strSetsterProId,
					                    pjson.demoduration,
					                    getGmtInUtcFormat(apptjson.data.start_date),
					                    pjson.locationtztext,
					                    pjson.clienttztext];
					
					nlapiSubmitField('calendarevent', pjson.nsevent, updEventFlds, updEventVals, false);
				}
				catch (eveupderr)
				{
					//throw the error and NOTIFY Admins
					throw nlapiCreateError(
						'DEMODATE-NSUPD-ERR', 
						'Unable to Update NS Event with Setster APPOINTMENT ID. Setster Event, NetSuite Event and/or NS Opportunity WAS CREATED: '+getErrText(eveupderr), 
						false
					);
				}
				
				//5. We MUST Generate Email Notification to Client, Demo Tech and Sales Rep/Boss
				var icsAttachment =generateIcsFile(
								   	{
								   		'start_date':getGmtInUtcFormat(apptjson.data.start_date),
								   		'duration':pjson.demoduration,
								   		'subject':pjson.companyname+' - '+pjson.demotypetext,
								   		'demotech':pjson.providertext,
								   		'demotechemail':pjson.provideremail,
								   		'salesrep':pjson.salesrep,
								   		'salesrepemail':pjson.salesrepemail,
								   		'servicetext':pjson.servicetext,
								   		'locationtext':pjson.locationtext,
								   		'company':pjson.companyname,
								   		'contact':pjson.contactname,
								   		'contactemail':pjson.email,
								   		'iscancelled':false,
								   		'nseventid':pjson.nsevent,
										'ringlink':pjson.salesreprclink
										//For Demo Tech link
								   		//'ringlink':pjson.demotechrclink
								   	}
								   );
				
				var inviteSbj = pjson.companyname+' - '+pjson.demotypetext,
					inviteMsg = getEmailMsg(
									{
										'contactname':pjson.contactname,
										'salesrep':pjson.salesrep,
										'salesrepemail':pjson.salesrepemail,
										'salesrepphone':pjson.salesrepphone,
										'salesreptitle':pjson.salesreptitle,
										'servicetext':pjson.servicetext,
										'date':pjson.demodate,
										'time':pjson.demotimetext,
										'clienttztext':pjson.clienttztext,
								   		'iscancelled':false,
										'ringlink':pjson.salesreprclink
										//For Demo Tech Link
								   		//'ringlink':pjson.demotechrclink
									}
								);
				
					inviteFrom = nlapiGetContext().getSetting('SCRIPT', 'custscript_74_sendemailfrom');
				
				//We can Optionally BCC sales rep to all the emails using pjson.salesrepemail
				
				//Send to Client Contact Email
				//1/22/2016 - Instead of coming from inviteFrom, have it come from Sales Rep	
				//			  If contact has CC Emails, Generate CC as well
				var contactCcEmails = null;
				if (pjson.ccemails)
				{
					contactCcEmails = pjson.ccemails.split(',');
				}
				
				//2/12/2016 - Client request to generate single email with client as primary recepient.
				var ccList = [pjson.supervisoremail, pjson.salesrepemail, pjson.provideremail];
				if (contactCcEmails && contactCcEmails.length > 0)
				{
					//2/17/2016 - Go through and make sure there are no extra spaces on the email 
					for (var cc=0; cc < contactCcEmails.length; cc+=1)
					{
						contactCcEmails[cc] = strTrim(contactCcEmails[cc]);
					}
					
					ccList.concat(contactCcEmails);
				}
				
				nlapiSendEmail(pjson.salesrepid, pjson.email, inviteSbj, inviteMsg, ccList, null, null, icsAttachment);
				
				//Send to Demo Tech
				//nlapiSendEmail(pjson.salesrepid, pjson.provideremail, inviteSbj, inviteMsg, null, null, null, icsAttachment);
				
				//Send to Sales Rep/Boss
				//nlapiSendEmail(pjson.salesrepid, pjson.salesrepid, inviteSbj, inviteMsg, [pjson.supervisoremail], null, null, icsAttachment);
				
				
				//7. At this point, either redirect to L/P/C or redirect to Newly Created Opportunity
				if (pjson.nextaction == 'saveandopp')
				{
					nlapiSetRedirectURL(
							'RECORD', 
							'opportunity', 
							pjson.opportunity, 
							true, 
							null
					);
					
				}
				else
				{
					nlapiSetRedirectURL(
							'RECORD', 
							pjson.paramLpcType, 
							pjson.paramLpcId, 
							false, 
							null
					);
					
				}
				return;
			}
			catch (createerr)
			{
				apptjson.status = false;
				apptjson.error = 'Error Processing Appointment Process: '+getErrText(createerr);
			}
			
			//----- Redirect Back to Suitelet Page IF it comes back down to here
			var rparam = {
				'custparam_ssession':pjson.sessionid,
				'custparam_lpcid':pjson.paramLpcId,
				'custparam_lpctype':pjson.paramLpcType,
				'custparam_procstatus':apptjson.status,
				'custparam_procmsg':apptjson.error
			};

			nlapiSetRedirectURL('SUITELET', nlapiGetContext().getScriptId(), nlapiGetContext().getDeploymentId(), 'VIEW', rparam);
		}
		
		//------------------ Begin Display -----------------------------------------------------
		
		//------------------ General Detail DISPLAY ---------------------------------------------
		
		nsform.addSubmitButton('Submit');
		
		//------------------ SETSTER DEBUG DISPLAY ---------------------------------------------
		var semail = nsform.addField('custpage_semail', 'text', 'API Email', null, null);
		semail.setDisplayType('hidden');
		semail.setDefaultValue(paramApiEmail);
		
		var stoken = nsform.addField('custpage_stoken', 'text', 'API Token', null, null);
		stoken.setDisplayType('hidden');
		stoken.setDefaultValue(paramApiToken);
		
		var surl = nsform.addField('custpage_surl', 'text', 'API URL', null, null);
		surl.setDisplayType('hidden');
		surl.setDefaultValue(paramApiUrl);
		
		var ssession = nsform.addField('custpage_ssession', 'text', 'API Session', null, null);
		ssession.setDisplayType('hidden');
		ssession.setDefaultValue(pjson.sessionid);
		
		//--------------------------- Information Section -------------------------------------------
		
		nsform.addFieldGroup('custpage_grpa', 'Schedule Detail', null);
		var lpcRec = nlapiLoadRecord(pjson.paramLpcType, pjson.paramLpcId);
		
		//Load the Sales Rep Record to grab Supervisor info. Loading Non-Trx = 5 // Search = 10.
		var srEmpRec = null;
		if (lpcRec.getFieldValue('salesrep'))
		{
			srEmpRec = nlapiLoadRecord('employee', lpcRec.getFieldValue('salesrep'));
		}
		
		var lpcidfld = nsform.addField('custpage_lpcid','text','LPC ID',null,'custpage_grpa');
		lpcidfld.setDisplayType('hidden');
		lpcidfld.setDefaultValue(pjson.paramLpcId);
		
		var lpctypefld = nsform.addField('custpage_lpctype','text','LPC Type',null,'custpage_grpa');
		lpctypefld.setDisplayType('hidden');
		lpctypefld.setDefaultValue(pjson.paramLpcType);
		
		//Custer info
		var custfld = nsform.addField('custpage_companyname', 'text', 'Customer', null, 'custpage_grpa');
		custfld.setDisplayType('inline');
		custfld.setBreakType('startcol');
		custfld.setDefaultValue(lpcRec.getFieldValue('companyname'));
		custfld.setMandatory(true);
		
		//Contact Info
		//12/30/2015 - Grab list of ALL related contacts to THIS customer
		var ctddfld = nsform.addField('custpage_contactlist','select','Contacts',null,'custpage_grpa');
		ctddfld.addSelectOption('', '', true);
		ctddfld.setMandatory(true);
		//search for ALL contacts for client
		var cflt = [new nlobjSearchFilter('company', null, 'anyof', pjson.paramLpcId),
		            new nlobjSearchFilter('isinactive',null,'is','F')];
		var ccol = [new nlobjSearchColumn('internalid'),
		            new nlobjSearchColumn('email'),
		            new nlobjSearchColumn('firstname').setSort(),
		            new nlobjSearchColumn('lastname')];
		var crs = nlapiSearchRecord('contact', null, cflt, ccol);
		
		if (crs && crs.length > 0) 
		{
			
			var contacthtml = nsform.addField('custpage_contacthtml','inlinehtml','',null,null),
				contactjson = {};
			
			for (var ct=0; ct < crs.length; ct+=1)
			{
				contactjson[crs[ct].getValue('internalid')] = {
					'email':crs[ct].getValue('email'),
					'name':crs[ct].getValue('firstname')+' '+crs[ct].getValue('lastname')
				};
				
				ctddfld.addSelectOption(
					crs[ct].getValue('internalid'), 
					crs[ct].getValue('firstname')+' '+crs[ct].getValue('lastname'), 
					false
				);
			}
			
			contacthtml.setDefaultValue(
				'<script language="javascript">'+
				'var contactjson = '+
				JSON.stringify(contactjson)+
				';'+
				'</script>'
			);
		}
				
		var emailfld = nsform.addField('custpage_email','email', 'Contact Email', null,'custpage_grpa');
		emailfld.setMandatory(true);
		emailfld.setDisplaySize(30);
		
		//1/18/2016 - Request to add in List of CC emails.
		var ccemailfld = nsform.addField('custpage_ccemail','textarea','CC Emails', null, 'custpage_grpa');
		ccemailfld.setDisplaySize(25, 3);
		
		var ccemailhelp = nsform.addField('custpage_ccemailhelp','inlinehtml','CC Emails Help', null, 'custpage_grpa');
		ccemailhelp.setDefaultValue('Please provide comma separated list of Email Address(es) to CC.');
		
		//Setster related fields
		var locationfld = nsform.addField('custpage_location','select','Location', null, 'custpage_grpa');
		locationfld.addSelectOption('', '', true);
		locationfld.setMandatory(true);
		
		var locationtext = nsform.addField('custpage_locationtext','text','location Text', null, 'custpage_grpa');
		locationtext.setDisplayType('hidden');
		
		var servicefld = nsform.addField('custpage_service','select','Service', null, 'custpage_grpa');
		servicefld.addSelectOption('', '', true);
		servicefld.setMandatory(true);
		
		var servicetext = nsform.addField('custpage_servicetext','text','Service Text', null, 'custpage_grpa');
		servicetext.setDisplayType('hidden');
		
		
		var providerfld = nsform.addField('custpage_provider','select','Demo Technician', null, 'custpage_grpa');
		providerfld.addSelectOption('', '', true);
		providerfld.setMandatory(true);
		
		var providertext = nsform.addField('custpage_providertext','text','Demo Tech Text', null, 'custpage_grpa');
		providertext.setDisplayType('hidden');
		
		var provideremailfld = nsform.addField('custpage_provideremail','email','Tech. Email', null, 'custpage_grpa');
		provideremailfld.setMandatory(true);
		provideremailfld.setDisplayType('hidden');
		
		//Location Time Zone. 
		var loctzfld = nsform.addField('custpage_loctz','text','Location/Demo Tech Timezone',null,'custpage_grpa');
		loctzfld.setDisplayType('inline');
		loctzfld.setMandatory(true);
		
		//Client Time zone
		var clitzfld = nsform.addField('custpage_clitz','select','Client Timezone', null, 'custpage_grpa');
		clitzfld.setMandatory(true);
		clitzfld.addSelectOption('', '', true);

		//Client Time zone text value
		var clitztextfld = nsform.addField('custpage_clitztext','text','Client Timezone Text', null, 'custpage_grpa');
		clitztextfld.setMandatory(true);
		clitztextfld.setDisplayType('hidden');
		
		
		var timehelp = nsform.addField('custpage_timehelp','inlinehtml','Important Note About Time',null,'custpage_grpa');
		timehelp.setDefaultValue(
			'<br/>'+
			'<b>Appointment time you are setting will be converted to location timezone!!</b><br/>'+
			'<br/>'
		);
		
		var datefld = nsform.addField('custpage_date','date','Date', null, 'custpage_grpa');
		datefld.setMandatory(true);
		datefld.setDisplaySize(20);
		
		//Add next available dates related info
		var nextdatesfld = nsform.addField('custpage_nextdates','textarea','Next Available Dates',null,'custpage_grpa');
		nextdatesfld.setDisplayType('inline');
		
		
		var timefld = nsform.addField('custpage_time','select','Time', null, 'custpage_grpa');
		timefld.addSelectOption('','',true);
		timefld.setMandatory(true);
		
		var timetextfld = nsform.addField('custpage_timetext','text','Time Text', null, 'custpage_grpa');
		timetextfld.setDisplayType('hidden');
		
		var durationfld = nsform.addField('custpage_duration','text','Duration', null, 'custpage_grpa');
		durationfld.setMandatory(true);
		durationfld.setDisplaySize(20);
		
		var nextactionfld = nsform.addField('custpage_nextaction','select','Next Action', null, 'custpage_grpa');
		nextactionfld.setMandatory(true);
		nextactionfld.addSelectOption('save', 'Save & Update Opportunity', true);
		nextactionfld.addSelectOption('saveandopp','Save & Create Opportunity', false);
		
		
		//---------- Column B ---
		var salesrepfld = nsform.addField('custpage_salesrep','text','Sales Rep', null, 'custpage_grpa');
		salesrepfld.setDisplayType('inline');
		salesrepfld.setBreakType('startcol');
		
		var salesrepidfld = nsform.addField('custpage_salesrepid','text','Sales Rep ID', null, 'custpage_grpa');
		salesrepidfld.setDisplayType('hidden');
		
		var salesrepemail = nsform.addField('custpage_salesrepemail','email', 'Sales Rep Email', null, 'custpage_grpa');
		salesrepemail.setDisplayType('disabled');
		
		var salesrepphone = nsform.addField('custpage_salesrepphone','phone','Sales Rep Phone', null, 'custpage_grpa');
		salesrepphone.setDisplayType('disabled');
		salesrepphone.setMandatory(true);
		
		var salesreptitle = nsform.addField('custpage_salesreptitle','text','Sales Rep Title', null, 'custpage_grpa');
		salesreptitle.setDisplayType('disabled');
		salesreptitle.setMandatory(true);
		
		//1/22/2016 - Add in Sales Rep Ring Central Link
		var salesreprclink = nsform.addField('custpage_salesreprclink','textarea','Sales Rep RingCentral Link', null, 'custpage_grpa');
		salesreprclink.setDisplayType('disabled');
		salesreprclink.setMandatory(true);
		
		//For Demo Tech Link
		//var demotechrclink = nsform.addField('custpage_demotechrclink','textarea','Demo Tech RingCentral Link', null, 'custpage_grpa');
		//demotechrclink.setDisplayType('disabled');
		//demotechrclink.setMandatory(true);
		
		var supervisorfld = nsform.addField('custpage_supervisor', 'text', 'Supervisor', null, 'custpage_grpa');
		supervisorfld.setDisplayType('inline');
		
		var supervisoridfld = nsform.addField('custpage_supervisorid', 'text', 'Supervisor ID', null, 'custpage_grpa');
		supervisoridfld.setDisplayType('hidden');
		
		var supervisoremail = nsform.addField('custpage_supervisoremail', 'email', 'Supervisor Email', null, 'custpage_grpa');
		supervisoremail.setDisplayType('disabled');
		
		//If Sales Rep Employee Record was successfully loaded, 
		//	Add in the default values
		if (srEmpRec)
		{
			salesrepfld.setDefaultValue(lpcRec.getFieldText('salesrep'));
			salesrepidfld.setDefaultValue(lpcRec.getFieldValue('salesrep'));
			salesrepemail.setDefaultValue(srEmpRec.getFieldValue('email'));
			salesrepphone.setDefaultValue(srEmpRec.getFieldValue('officephone'));
			salesreprclink.setDefaultValue(srEmpRec.getFieldValue('custentity_ringcentrallink'));
			salesreptitle.setDefaultValue(srEmpRec.getFieldValue('title'));
			supervisorfld.setDefaultValue(srEmpRec.getFieldText('supervisor'));
			supervisoridfld.setDefaultValue(srEmpRec.getFieldValue('supervisor'));
			if (srEmpRec.getFieldValue('supervisor'))
			{
				//Do a look up to find supervisors' email address
				var superEmail = nlapiLookupField('employee', srEmpRec.getFieldValue('supervisor'), 'email', false);
				if (superEmail)
				{
					supervisoremail.setDefaultValue(superEmail);
				}
			}
		}
		//NEED TO ADD Supervisor
		//lpcRec
		
		//add in empty drop down for Opportunities
		//This will get populated from client page init
		nsform.addField('custpage_custopp','select','Opportunity', null, 'custpage_grpa');
		
		//Demo Type
		var demotypefld = nsform.addField('custpage_demotype','select','Demo Type','customlist_demo_type_list', 'custpage_grpa');
		demotypefld.setMandatory(true);
		
		//Demo Type Text field.
		var demotypetextfld = nsform.addField('custpage_demotypetext','text','Demo Type Text',null,'custpage_grpa');
		demotypetextfld.setDisplayType('hidden');
		
		
		//Initially go through and grab all locations, services and employees.  These will return links as well
		//	Location links = services:[employees array]
		//	Service links = employee:{ {location:1},...}
		//	Provider (Employee) Links = 
		if (pjson.sessionid)
		{
			//Grab Account Details getSetsterAccountDetail
			var acctjson = getSetsterAccountDetail(pjson);
			//log('debug','acctjson',JSON.stringify(acctjson));
			
			var accthtml = nsform.addField('custpage_accthtml','inlinehtml','',null,null);
			accthtml.setDefaultValue(
				'<script language="javascript">'+
				'var acctjson = '+
				JSON.stringify(acctjson)+
				';'+
				'</script>'
			);
			
			var locjson = getAllLocations(pjson);
			
			//log('debug','locjson',JSON.stringify(locjson));
			
			var lochtml = nsform.addField('custpage_lochtml','inlinehtml','',null,null);
			lochtml.setDefaultValue(
				'<script language="javascript">'+
				'var locjson = '+
				JSON.stringify(locjson)+
				';'+
				'</script>'
			);
			
			//Populate the drop down with list of locations
			if (locjson.data && locjson.data.length > 0)
			{
				for (var l=0; l < locjson.data.length; l+=1)
				{
					locationfld.addSelectOption(
						locjson.data[l].id, 
						locjson.data[l].name, 
						false
					);
				}
			}
			
			//Grab All Services 
			var serjson = getAllServices(pjson);
			//log('debug','serjson',JSON.stringify(serjson));
			
			var serhtml = nsform.addField('custpage_serhtml','inlinehtml','',null,null);
			serhtml.setDefaultValue(
				'<script language="javascript">'+
				'var serjson = '+
				JSON.stringify(serjson)+
				';'+
				'</script>'
			);
			
			//Grab ALL Employees
			var projson = getAllProvider(pjson);
			//log('debug','projson',JSON.stringify(projson));
			
			var prohtml = nsform.addField('custpage_prohtml','inlinehtml','',null,null);
			prohtml.setDefaultValue(
				'<script language="javascript">'+
				'var projson = '+
				JSON.stringify(projson)+
				';'+
				'</script>'
			);
			
			//1/27/2016 - Grab RingCentral Link from NetSuite employee record related to email addresses
			var proEmailFlt = [],
				proEmailCol = [new nlobjSearchColumn('email'),
				               new nlobjSearchColumn('custentity_ringcentrallink')],
				proRclJson = {};
			for (var pd=0; pd < projson.data.length; pd+=1)
			{
				proEmailFlt.push(['email','is',projson.data[pd].email]);
				
				if ((pd+1) != projson.data.length)
				{
					proEmailFlt.push('OR');
				}
			}
			
			if (proEmailFlt.length > 0)
			{
				var proEmailRs = nlapiSearchRecord('employee', null, proEmailFlt, proEmailCol);
				for (var pe=0; proEmailRs && pe < proEmailRs.length; pe+=1)
				{
					log('debug','rcl value',proEmailRs[pe].getValue('custentity_ringcentrallink'));
					//var rcltext = strGlobalReplace(proEmailRs[pe].getValue('custentity_ringcentrallink'), "\r", "||");
					//log('debug','rcl formtted',rcltext);
					//rcltext = strGlobalReplace(rcltext,"\n", "");
					
					proRclJson[proEmailRs[pe].getValue('email')] = proEmailRs[pe].getValue('custentity_ringcentrallink'); 
					log('debug','rcl json',JSON.stringify(proRclJson));
				}
			}
			var prorlchtml = nsform.addField('custpage_prorlchtml','inlinehtml','',null,null);
			prorlchtml.setDefaultValue(
				'<script language="javascript">'+
				'var prorlcjson = '+
				JSON.stringify(proRclJson)+
				';'+
				'</script>'
			);
			
			//Grab ALL Time Zones
			var tzjson = getAllSetsterTimezone(pjson);
			//log('debug','tzjson',JSON.stringify(tzjson));
			
			var tzhtml = nsform.addField('custpage_tzhtml','inlinehtml','',null,null);
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
		}
		
	}
	catch (disperr)
	{
		statusfld.setDefaultValue(
			'<div style="color:red; font-weight:bold; font-size: 15px">'+
			getErrText(disperr)+
			'</div>'
		);
		
		//Generate Error Email
		nlapiSendEmail(
			-5, 
			paramErrorNotification, 
			'Unable to Finalize Setster Create',
			'User: '+nlapiGetContext().getEmail()+' ('+nlapiGetUser()+')<br/>'+
			'Following Error occured while trying to Book New Event in Setster:<br/><br/>'+
				getErrText(disperr),
			paramErrorCc
		);
	}
	
	
	res.writePage(nsform);
}

/***************** SetSter Look up SUITELET called from Client Script ***********************/
//Single Suitelet Entry function that takes in action from Demo Scheduler Suitelet
function setsterEntry(req, res)
{
	var paramAction = req.getParameter('custparam_action'),
		paramSession = req.getParameter('custparam_session');
	
	//If call was successful, robj will be replaced by sub function returned value
	var robj = {
		'status':false,
		'error':''
	};
	
	try
	{
		if (!paramAction)
		{
			throw nlapiCreateError('SETSTER_ERR', 'Missing Setster action from client', true); 
		}
		
		if (paramAction == 'authenticate')
		{
			res.write(JSON.stringify(setsterAuthenticate()));
		}
		else if (paramAction == 'availability')
		{
			log('debug','action',paramAction);
			//Grab list of all actions and call getAvailableTimeByDate
			if (!paramSession)
			{
				throw nlapiCreateError('SETSTER_ERR', 'Authentication Required', true);
			}
			
			var paramDate = req.getParameter('custparam_date'),
				paramLocation = req.getParameter('custparam_location'),
				paramService = req.getParameter('custparam_service'),
				paramProvider = req.getParameter('custparam_provider'),
				paramTimezone = req.getParameter('custparam_timezone');
			
			if (!paramDate || !paramLocation || !paramService || !paramProvider)
			{
				throw nlapiCreateError('SETSTER_ERR', 'Date (YYYY-MM-DD), Location, Service and Provider Required', true);
			}
			
			log('debug','returning out','about to retunr');
			
			res.write(JSON.stringify(
						getAvailableTimeByDate(
							{
								'date':paramDate,
								'location':paramLocation,
								'service':paramService,
								'provider':paramProvider,
								'timezone':paramTimezone,
								'session':paramSession
							}
						)
				   )
			);
			
		}
		else if (paramAction == 'availdates')
		{
			log('debug','action',paramAction);
			if (!paramSession)
			{
				throw nlapiCreateError('SETSTER_ERR', 'Authentication Required', true);
			}
			
			var paramLocation = req.getParameter('custparam_location'),
				paramService = req.getParameter('custparam_service'),
				paramProvider = req.getParameter('custparam_provider'),
				paramTimezone = req.getParameter('custparam_timezone');
			
			if (!paramLocation || !paramService || !paramProvider)
			{
				throw nlapiCreateError('SETSTER_ERR', 'Location, Service and Provider Required', true);
			}
			
			log('debug','returning out','about to retunr');
			
			res.write(JSON.stringify(
						getNextAvailableDates(
							{
								'nsdate':nlapiDateToString(new Date()),
								'location':paramLocation,
								'service':paramService,
								'provider':paramProvider,
								'timezone':paramTimezone,
								'session':paramSession
							}
						)
				   )
			);
		}
		
	}
	catch(err)
	{
		robj.status = false;
		robj.error = 'Error Setster: '+getErrText(err);
		
		res.write(JSON.stringify(robj));
	}
	
}

