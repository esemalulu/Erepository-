/**
 * Script to go through all Setster related event that has start date of "Tomorrow" and generate reminder email 
 * Version    Date            Author           Remarks
 * 1.00       21 Dec 2015     json
 *
 */

function demoSetsterReminder(type) 
{
	var paramLastProcId = nlapiGetContext().getSetting('SCRIPT', 'custscript_77_lastproceid'),
		paramErrorNotification = nlapiGetContext().getSetting('SCRIPT','custscript_74_setstererr');
	
	//Need to create Formula based saved search because of NS defect
	//Due to NS defect, we MUST do Range Search instead of specific date search
	//ON Specific date does not return any value but WITHIN two dates does
	var tomorrowDate = nlapiDateToString(nlapiAddDays(new Date(), 1)),
		dayAfterTomorrowDate = nlapiDateToString(nlapiAddDays(new Date(), 2));
	
	log('debug','today/tomorrow/day AFter tomorrow',nlapiDateToString(new Date())+'//'+tomorrowDate+'//'+dayAfterTomorrowDate)
	
	var startDateFormula = new nlobjSearchFilter('formuladate', null,'within',tomorrowDate, dayAfterTomorrowDate);
	startDateFormula.setFormula('{startdate}');
	var eflt = [startDateFormula,
	            new nlobjSearchFilter('custevent_crm_setsterid',null, 'isnotempty')],
	    ecol = [new nlobjSearchColumn('custevent_crm_setsterid'), //Setster ID|Contact ID|Email|clientTz|opp
	            new nlobjSearchColumn('custevent_crm_setsterlocid'), //Setster Location ID|Name
	            new nlobjSearchColumn('custevent_crm_setsterproid'), //Setster Provider ID|Name|Email
	            new nlobjSearchColumn('custevent_crm_setsterserid'), //Setster Service ID|Name
	            new nlobjSearchColumn('custevent_crm_setsterclitztext'), //Setster client timezone text
	            new nlobjSearchColumn('custevent_crm_setster_ccemails'), //CC email addresses
	            new nlobjSearchColumn('custevent_demo_type'), //Demo Type
	            new nlobjSearchColumn('company'),
	            new nlobjSearchColumn('contact'),
	            new nlobjSearchColumn('startdate'),
	            new nlobjSearchColumn('starttime'),
	            new nlobjSearchColumn('internalid').setSort(true)];
	
	if (paramLastProcId)
	{
		eflt.push(new nlobjSearchFilter('internalidnumber', null,'lessthan',paramLastProcId));
	}
	
	var ers = nlapiSearchRecord('calendarevent', null, eflt, ecol);
	
	//Tracks Error generating Reminder Email
	var errLog = '';
	
	//Loop through each events returned and generate reminder
	for(var i=0; ers && i < ers.length; i+=1)
	{
		//ONLY Process tomorrows event. This is due to NS defect 
		if (ers[i].getValue('startdate') == tomorrowDate)
		{
			var eventId = ers[i].getValue('internalid'),
				companyName = ers[i].getText('company'),
				companyId = ers[i].getValue('company'),
				contactId = ers[i].getValue('contact'),
				ccEmails = ers[i].getValue('custevent_crm_setster_ccemails');
			
			if (ccEmails)
			{
				ccEmails = ccEmails.split(',');
			}
			else
			{
				ccEmails = null;
			}
			log('debug','contactId',contactId);	
			try
			{
				//Grab Contacts Full Name without Hierarchy
				var contactLookup = nlapiLookupField('contact', contactId, ['firstname','lastname'],false),
					contactname = contactLookup['firstname']+' '+contactLookup['lastname'];
				
				//Grab Company name without numbering and sales rep
				var companyLookup = nlapiLookupField('customer', companyId, ['companyname','salesrep'], false);
				var companyNameText = companyLookup['companyname'],
					companySalesRep = companyLookup['salesrep'];
				
				//Load up information about company assigned sales rep
				var srEmpRec = nlapiLoadRecord('employee', companySalesRep),
					srjson = {
						'salesrep':srEmpRec.getFieldValue('firstname')+' '+srEmpRec.getFieldValue('lastname'),
						'salesrepemail':srEmpRec.getFieldValue('email'),
						'salesrepphone':srEmpRec.getFieldValue('officephone'),
						'salesreptitle':srEmpRec.getFieldValue('title'),
						'supervisor':srEmpRec.getFieldText('supervisor'),
						'salesreprclink':srEmpRec.getFieldValue('custentity_ringcentrallink'),
						'supervisoremail':''
					};
				//Grab Supervisors email address
				if (srEmpRec.getFieldValue('supervisor'))
				{
					//Do a look up to find supervisors' email address
					var superEmail = nlapiLookupField('employee', srEmpRec.getFieldValue('supervisor'), 'email', false);
					if (superEmail)
					{
						srjson.supervisoremail = superEmail;
					}
				}
				
				var sjson = {
					'contactemail':'',
					'servicetext':'',
					'provideremail':'',
					//Demo Tech RC Link
					//KEEP THis JUST IN Case They want to change again to Demo Tech link.
					'providerrclink':''
				};
				
				//Break down the Setster related information and extract out Text Values
				if (ers[i].getValue('custevent_crm_setsterid'))
				{
					var arSetsterId = ers[i].getValue('custevent_crm_setsterid').split('|');
					//THis should always be three to execute. ID|Contact ID|Email|clientTz|opp
					if (arSetsterId && arSetsterId.length == 5)
					{
						sjson.contactemail = arSetsterId[2];
					}
				}
				
				if (ers[i].getValue('custevent_crm_setsterserid'))
				{
					var arServiceId = ers[i].getValue('custevent_crm_setsterserid').split('|');
					//THis should always be 2 to execute. ID|Name
					if (arServiceId && arServiceId.length == 2)
					{
						sjson.servicetext = arServiceId[1];
					}
				}
				
				if (ers[i].getValue('custevent_crm_setsterproid'))
				{
					var arProviderId = ers[i].getValue('custevent_crm_setsterproid').split('|');
					//THis should always be 3 to execute. ID|Name|Email
					if (arProviderId && arProviderId.length == 3)
					{
						sjson.provideremail = arProviderId[2];
						
						//look up provider ring central link value
						//Demo Tech RC Link
						//KEEP THis JUST IN Case They want to change again to Demo Tech link.
						var peflt = [new nlobjSearchFilter('email', null, 'is', sjson.provideremail)],
							pecol = [new nlobjSearchColumn('custentity_ringcentrallink')],
							pers = nlapiSearchRecord('employee', null, peflt, pecol);
						
						if (pers)
						{
							sjson.providerrclink = pers[0].getValue('custentity_ringcentrallink');
						}
						
					}
				}
				
				//Generate Reminder Email 
				var inviteSbj = 'Event Reminder: '+companyNameText+' - '+ers[i].getText('custevent_demo_type'),
				inviteMsg = getEmailMsg(
								{
									'contactname':contactname,
									'salesrep':srjson.salesrep,
									'salesrepemail':srjson.salesrepemail,
									'salesrepphone':srjson.salesrepphone,
									'salesreptitle':srjson.salesreptitle,
									'servicetext':sjson.servicetext,
									'date':ers[i].getValue('startdate'),
									'time':ers[i].getValue('starttime'),
									'clienttztext':ers[i].getValue('custevent_crm_setsterclitztext'),
							   		'iscancelled':false,
							   		//Demo Tech RC Link
									//'ringlink':srjson.providerrclink
							   		'ringlink':srjson.salesreprclink
								}
							);
			
				inviteFrom = nlapiGetContext().getSetting('SCRIPT', 'custscript_74_sendemailfrom');
			
				
				//2/12/2016 - Client request to generate single email with client as primary recepient.
				var ccList = [srjson.supervisoremail, srjson.salesrepemail, sjson.provideremail];
				if (ccEmails && ccEmails.length > 0)
				{
					//2/17/2016 - Go through and make sure there are no extra spaces on the email 
					for (var cc=0; cc < ccEmails.length; cc+=1)
					{
						ccEmails[cc] = strTrim(ccEmails[cc]);
					}
					
					ccList.concat(ccEmails);
				}
				
				
				nlapiSendEmail(companySalesRep, sjson.contactemail, inviteSbj, inviteMsg, ccEmails, null, null);
				
				//Send to Demo Tech
				//nlapiSendEmail(companySalesRep,sjson.provideremail, inviteSbj, inviteMsg, null, null, null);
				
				//Send to Sales Rep/Boss
				//nlapiSendEmail(companySalesRep, srjson.salesrepemail, inviteSbj, inviteMsg, [srjson.supervisoremail], null, null);
				
			} 
			catch (procerr)
			{
				log('error','Error Generating Reminder','Event ID: '+eventId+' // Company Name: '+companyName+' ('+companyId+') // '+getErrText(procerr));
				errLog += '<li>Event ID: '+eventId+' // Company Name: '+companyName+' ('+companyId+') // '+getErrText(procerr)+'</li>';
			}
			
		}
		
		//Set % completed of script processing
		var pctCompleted = Math.round(((i+1) / ers.length) * 100);
		nlapiGetContext().setPercentComplete(pctCompleted);
		
		//reschedule if gov is running low or legnth is 1000
		if (((i+1)==1000) || (nlapiGetContext().getRemainingUsage() <= 500)) 
		{
			var rparam = {
				'custscript_77_lastproceid':trxId
			};
			
			nlapiScheduleScript(nlapiGetContext().getScriptId(), nlapiGetContext().getDeploymentId(), rparam);
			
			log('audit','Rescheduled',JSON.stringify(rparam));
			break;
		}
	}
	
	if (errLog)
	{
		nlapiSendEmail(-5, paramErrorNotification, 'Error Generating Reminder for Setster Events', '<ul>'+errLog+'</ul>');
		log('error','errLog',errLog);
	}
	
}
