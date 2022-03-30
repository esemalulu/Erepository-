/**
 * Contract Management & Renewal Automation related.
 * Scheduled script to run Daily to send out Renewal Notifications.
 * The Dates will be calculated based on Current Date
 *
 * Current Date + paramFirstRminderNumFromEndDate == Contract Anniversary Date
 * 	- Use 90 Day Out Template
 *
 * Current Date + paramSecondReminderNumFromEndDate == Contract Anniversary Date
 * 	- Use 60 Days Out Template
 *
 * Email will be sent from Billing Entity salesrep employee
 * 			and  sent to Customer record to default email address
*/

/**
 * Returns it in JSON Object format:
 * {
 * 		[itemid]:{
 * 			'name':'',
 * 			'recordtype':'',
 * 			'itemtype':'',
 * 			'baseprice':'',
 * 			'tier':{
 * 				'pricelevelid':{
 * 					'pricelevelname':'',
 * 					'rate':''
 * 				},
 * 				...
 * 			}
 * 		}
 * }
 */

//Script Level Setting
//Last Proc ID
var	paramLastProcId = nlapiGetContext().getSetting('SCRIPT','custscript_sb145_lastprocid'),
	//Custom current Date.
	//	When this is passed in, it will use THIS date as current date instead of using system current date
	//	This date will be used to compare against contract anniversary date to bring out list of candidates
	paramCustomCurrentDate = nlapiGetContext().getSetting('SCRIPT','custscript_sb145_custcurrdate'),

	//Pass this in when you ONLY want to renew a single customer
	paramBillingCustomer = nlapiGetContext().getSetting('SCRIPT','custscript_sb145_custbillcustomer');

//Company Level Preference
var paramCraErrorNotifier = nlapiGetContext().getSetting('SCRIPT', 'custscript_sb131_primaryerr'),
	paramCraCcNotifier = nlapiGetContext().getSetting('SCRIPT','custscript_sb131_ccerr'),
	paramAcctNotifier = nlapiGetContext().getSetting('SCRIPT','custscript_sb131_acctnotifier'),
	paramDefaultQuoteForm = nlapiGetContext().getSetting('SCRIPT', 'custscript_sb131_defquoteform'),
	paramNewOppFormId = nlapiGetContext().getSetting('SCRIPT','custscript_sb131_newoppform'),
	paramRenewOppFormId = nlapiGetContext().getSetting('SCRIPT','custscript_sb131_renewoppform'),
	paramRecurringItemTypes = nlapiGetContext().getSetting('SCRIPT','custscript_sb131_recuritemtypeids');

	paramActiveStatusId = nlapiGetContext().getSetting('SCRIPT','custscript_sb131_ctractiveid'),
	paramPendingRenewalStatusId = nlapiGetContext().getSetting('SCRIPT','custscript_sb131_ctrpendrenewid'),
	paramRenewedStatusId = nlapiGetContext().getSetting('SCRIPT','custscript_sb131_ctrrenewedid'),
	paramDelayedStatusId = nlapiGetContext().getSetting('SCRIPT','custscript_sb131_ctrexpiredid'),
	paramTerminatedStatusId = nlapiGetContext().getSetting('SCRIPT','custscript_sb131_ctrterminatedid'),
	paramDefaultAnnualUplift = nlapiGetContext().getSetting('SCRIPT','custscript_sb131_defupliftperct'),

	paramDelayNumAfterEndDate = nlapiGetContext().getSetting('SCRIPT','custscript_sb131_numdays_delaycontract'),

	paramRenewalNumFromEndDate = nlapiGetContext().getSetting('SCRIPT','custscript_sb131_numdays_renewalopp'),
	paramExpCloseDateNumFromEndDate = nlapiGetContext().getSetting('SCRIPT','custscript_sb131_numdays_expclosedate'),
	paramFirstRminderNumFromEndDate = nlapiGetContext().getSetting('SCRIPT','custscript_sb131_numdays_upcomingrenewal'),
	paramSecondReminderNumFromEndDate = nlapiGetContext().getSetting('SCRIPT','custscript_sb131_numdays_renewalreminder'),

	param90DayEmailTemplate = nlapiGetContext().getSetting('SCRIPT','custscript_sb131_90daysrenewemailtemp'),
	param60DayEmailTemplate = nlapiGetContext().getSetting('SCRIPT','custscript_sb131_60daysrenewemailtemp'),
	paramGenericEmailTemplate = nlapiGetContext().getSetting('SCRIPT','custscript_sb131_genericrenewemailtemp'),

	//10/10/2016
	//Enhancement #2
	//Subsidiary Exclusion List
	paramSubsExcludeIds = nlapiGetContext().getSetting('SCRIPT','custscript_sb131_subsexclude');

//10/10/2016
//Enhancement #2
//We know that this will comma separated list of IDs.
//Remove any spaces if the value is set and run split to turn it into an array
if (paramSubsExcludeIds)
{
	//Remove extra spaces
	paramSubsExcludeIds = strGlobalReplace(paramSubsExcludeIds, ' ', '');

	//Turn it into an array
	paramSubsExcludeIds = paramSubsExcludeIds.split(',');
}
else
{
	//If not set, just simply turn it into Empty String
	paramSubsExcludeIds = [];
}

if (paramCraCcNotifier)
{
	paramCraCcNotifier = paramCraCcNotifier.split(',');
}

if (paramRecurringItemTypes)
{
	paramRecurringItemTypes = paramRecurringItemTypes.split(',');
}


/**
 * Main Entry function for Contract Expire Processor
 */
function processCtrRenewalNotifProcess()
{
	var logTblHeader = '<tr><td>Contract (Internal ID)</td>'+
					   '<td>End Company (Internal ID)</td>'+
					   '<td>Billing Entity (Internal ID)</td>'+
					   '<td>Current Date</td>'+
					   '<td>Contract Anniversary Date</td>'+
					   '<td>Contract Term</td>'+
					   '<td>Contract Term From/To</td>'+
					   '<td>Renewal Opp</td>'+
					   '<td>Renewal Quote</td>'+
					   '<td>Notification Type</td>'+
					   '<td>Send Status</td>'+
					   '<td>Detail</td></tr>',
		logTblBody = '',
		curDateObj = new Date(),
		procLogHasError = false;

	try
	{
		//Search for ALL Contracts in Pending Renewal State that has Contract Anniv. matching one of 90 or 60 days out
		//1. Status is Pending Renewal
		//	- We do not care for those marked as Delayed or Terminated.
		//	- Status of Pending Renewal means it's already gone through the 120 days renewal process.
		//2. Inactive is F
		//3. Current date + [90 or 60 days] is On Contract Anniversary date

		//If Custom current date is passed in as script parameter,
		//	Use that date as current Date
		if (paramCustomCurrentDate)
		{
			curDateObj = nlapiStringToDate(paramCustomCurrentDate);
		}

		var reminder90DaysDate = nlapiDateToString(nlapiAddDays(curDateObj, paramFirstRminderNumFromEndDate)),
			reminder60DaysDate = nlapiDateToString(nlapiAddDays(curDateObj, paramSecondReminderNumFromEndDate)),
			reminderType = '';

		log('debug','cur date // 90 Days Out // 60 Days OUt',curDateObj+' // '+reminder90DaysDate+' // '+reminder60DaysDate);

			//List of Opportunity Status to process for Email Notifications
			//Client Statuses
			//10= 02-Discovery, 8= 03-Qualifying, 20= 04-Proving, 11= 05-Proposing

		var toProcOppStatuses = ['10','8','20','11'],
			ctflt = [
		             	['custrecord_crc_status','anyof',paramPendingRenewalStatusId],
		             	'AND',
		             	['isinactive', 'is', 'F'],
		             	'AND',
		             	['custrecord_crc_latestrenewopp.custbody_renewal', 'is','T'],
		             	'AND',
		             	['custrecord_crc_latestrenewopp.entitystatus', 'anyof', toProcOppStatuses],
		             	'AND',
		             	// 10/14/2016
		        		// Part of Enhancement #2
		        		// We remove any renewal opportunity that has
		        		// custbody_axcr_unsubrenewalemail (unsubscribe) box checked
		        		// 01/09/2017 - Rehan
		        		// Fixed bug where opportunities where custbody_axcr_unsubrenewalemail is checked and its still receiving notifications.
		             	['custrecord_crc_latestrenewopp.custbody_axcr_unsubrenewalemail', 'is','F'],
		             	'AND',
		             	[
		             	 	['custrecord_crc_startdate', 'on', reminder90DaysDate],
		             	 	'OR',
		             	 	['custrecord_crc_startdate', 'on', reminder60DaysDate]
		             	]
		            ];

		if (paramBillingCustomer)
		{
			ctflt.push('AND');
			ctflt.push(['custrecord_crc_billingentity', 'anyof', paramBillingCustomer]);
		}

		if (paramLastProcId)
		{
			ctflt.push('AND');
			ctflt.push(['internalidnumber', 'lessthan', paramLastProcId]);
		}

		//10/13/2016
		//Part of Enhancement #2
		//if paramSubsExcludeIds has IDs in the array, ONLY return list of sales orders that
		//does NOT belong to identified subsidiaries
		if (paramSubsExcludeIds.length > 0)
		{
			//We do NOT process ANY Contract where linked Billing Entity Subsidiary is one of exclusion subsidiary
			ctflt.push('AND');
			ctflt.push(['custrecord_crc_billingentity.subsidiary','noneof',paramSubsExcludeIds]);
		}

		//Return columns. Some needed for logging purposes
		var ctcol = [
		             new nlobjSearchColumn('internalid').setSort(true),
		             new nlobjSearchColumn('name'),
		             new nlobjSearchColumn('custrecord_crc_acv'),
		             new nlobjSearchColumn('custrecord_crc_contractterm'),
		             new nlobjSearchColumn('custrecord_crc_termstartdate'),
		             new nlobjSearchColumn('custrecord_crc_termenddate'),
		             new nlobjSearchColumn('custrecord_crc_enduser'),
		             new nlobjSearchColumn('custrecord_crc_billingentity'),
		             new nlobjSearchColumn('custrecord_crc_startdate'),
		             new nlobjSearchColumn('custrecord_crc_latestrenewopp'),
		             new nlobjSearchColumn('custbody_axcr_activequoteref','custrecord_crc_latestrenewopp'),
		             new nlobjSearchColumn('email','custrecord_crc_billingentity'),
		             new nlobjSearchColumn('salesrep','custrecord_crc_latestrenewopp')
		             ];

		//Search for all pending renewal contracts to be reviewed
		var ctrs = nlapiSearchRecord('customrecord_axcr_contract', null, ctflt, ctcol);

		//Loop through each
		for (var i=0; ctrs && i < ctrs.length; i+=1)
		{
			var templateId = '';

			//1. Grab list of ALL contract column values
			var ctjson = {
				'id':ctrs[i].getValue('internalid'),
				'name':ctrs[i].getValue('name'),
				'acvamt':ctrs[i].getValue('custrecord_crc_acv'),
				'termid':ctrs[i].getValue('custrecord_crc_contractterm'),
				'termtext':ctrs[i].getText('custrecord_crc_contractterm'),
				'termstart':ctrs[i].getValue('custrecord_crc_termstartdate'),
				'termend':ctrs[i].getValue('custrecord_crc_termenddate'),
				'enduserid':ctrs[i].getValue('custrecord_crc_enduser'),
				'endusertext':ctrs[i].getText('custrecord_crc_enduser'),
				'billentityid':ctrs[i].getValue('custrecord_crc_billingentity'),
				'billentitytext':ctrs[i].getText('custrecord_crc_billingentity'),
				'anvidate':ctrs[i].getValue('custrecord_crc_startdate'),
				'renewopp':ctrs[i].getValue('custrecord_crc_latestrenewopp'),
				'renewopptext':ctrs[i].getText('custrecord_crc_latestrenewopp'),
				'renewquote':ctrs[i].getValue('custbody_axcr_activequoteref','custrecord_crc_latestrenewopp'),
				'renewquotetext':ctrs[i].getValue('custbody_axcr_activequoteref','custrecord_crc_latestrenewopp'),
				//4/8/2016 - Grab sales rep from Renewal Opportunity.
				//	- This is change after discussion with GM
				//	  When renewals are generated, Opportunity contains relationship manager as sales rep
				//	  NOT primary sales rep on the customer. Sales Rep on customer is person originally made the sale.
				//	  All email communications for renewals are by RM
				'salesrep':ctrs[i].getValue('salesrep','custrecord_crc_latestrenewopp'),
				'billentityemail':ctrs[i].getValue('email','custrecord_crc_billingentity')
			};

			//log('debug','contract json',JSON.stringify(ctjson));

			try
			{
				//1. Identify reminderType: Can be 90 Days or 60 Days
				reminderType = '';
				if (ctjson.anvidate == reminder90DaysDate)
				{
					reminderType = '90 Days';
					templateId = param90DayEmailTemplate;
				}
				else if (ctjson.anvidate == reminder60DaysDate)
				{
					reminderType = '60 Days';
					templateId = param60DayEmailTemplate;
				}

				if (!reminderType)
				{
					//Error Processing. NOTHING matched
					logTblBody += '<tr><td>'+ctjson.name+' ('+ctjson.id+')</td>'+
								  '<td>'+ctjson.endusertext+' ('+ctjson.enduserid+')</td>'+
								  '<td>'+ctjson.billentitytext+' ('+ctjson.billentityid+')</td>'+
								  '<td>'+nlapiDateToString(curDateObj)+'</td>'+
								  '<td>'+ctjson.anvidate+'</td>'+
								  '<td>'+ctjson.termtext+'</td>'+
								  '<td>'+ctjson.termstart+' to '+ctjson.termend+'</td>'+
								  '<td>'+ctjson.renewopptext+' ('+ctjson.renewopp+')</td>'+
								  '<td>'+ctjson.renewquotetext+' ('+ctjson.renewquote+')</td>'+
								  '<td>No Match 90 or 60</td>'+
								  '<td>ERROR</td>'+
								  '<td>Nothing matched even with search. Critical Error</td>';
					procLogHasError = true;
				}
				else if (!ctjson.billentityemail)
				{
					logTblBody += '<tr><td>'+ctjson.name+' ('+ctjson.id+')</td>'+
								  '<td>'+ctjson.endusertext+' ('+ctjson.enduserid+')</td>'+
								  '<td>'+ctjson.billentitytext+' ('+ctjson.billentityid+')</td>'+
								  '<td>'+nlapiDateToString(curDateObj)+'</td>'+
								  '<td>'+ctjson.anvidate+'</td>'+
								  '<td>'+ctjson.termtext+'</td>'+
								  '<td>'+ctjson.termstart+' to '+ctjson.termend+'</td>'+
								  '<td>'+ctjson.renewopptext+' ('+ctjson.renewopp+')</td>'+
								  '<td>'+ctjson.renewquotetext+' ('+ctjson.renewquote+')</td>'+
								  '<td>'+reminderType+'</td>'+
								  '<td>ERROR</td>'+
								  '<td>Billing Entity is Missing Email Address</td>';
					procLogHasError = true;
				}
				else if (!ctjson.salesrep)
				{
					logTblBody += '<tr><td>'+ctjson.name+' ('+ctjson.id+')</td>'+
								  '<td>'+ctjson.endusertext+' ('+ctjson.enduserid+')</td>'+
								  '<td>'+ctjson.billentitytext+' ('+ctjson.billentityid+')</td>'+
								  '<td>'+nlapiDateToString(curDateObj)+'</td>'+
								  '<td>'+ctjson.anvidate+'</td>'+
								  '<td>'+ctjson.termtext+'</td>'+
								  '<td>'+ctjson.termstart+' to '+ctjson.termend+'</td>'+
								  '<td>'+ctjson.renewopptext+' ('+ctjson.renewopp+')</td>'+
								  '<td>'+ctjson.renewquotetext+' ('+ctjson.renewquote+')</td>'+
								  '<td>'+reminderType+'</td>'+
								  '<td>ERROR</td>'+
								  '<td>Billing Entity is missing RM Equity (Relationship Manager) Value</td>';
					procLogHasError = true;
				}
				else
				{
					//1. Use email Merger (api avail 2015v2)
					var emailMerger = nlapiCreateEmailMerger(paramGenericEmailTemplate);
					emailMerger.setEntity('customer', ctjson.billentityid);
					emailMerger.setTransaction(ctjson.renewopp);

					var mergeObj = emailMerger.merge(),
						rawContent = mergeObj.getBody(),
						emailSbj = mergeObj.getSubject();

					log('debug','rawContent',rawContent);
					log('debug','emailSbj',emailSbj);

					//2. Get Email Template Raw text Value
					var opprec = nlapiLoadRecord('opportunity', ctjson.renewopp),
						finalMergedText = '';


					//3. Grab list of ALL Sales Team members on THIS Renewal Contract
					var rmJson = {
						'rmlist':[],
						'details':{}
					};

					//3a. Go through each sales rep and grab the sales rep info
					for (var rm = 1; rm <= opprec.getLineItemCount('salesteam'); rm+=1)
					{
						rmJson.rmlist.push(opprec.getLineItemValue('salesteam','employee',rm));
					}

					//3b. Grab RM sales rep info
					if (rmJson.rmlist.length > 0)
					{
						var rmflt = [new nlobjSearchFilter('internalid', null, 'anyof', rmJson.rmlist)],
							rmcol = [new nlobjSearchColumn('internalid'),
							         new nlobjSearchColumn('firstname'),
							         new nlobjSearchColumn('lastname'),
							         new nlobjSearchColumn('email'),
							         new nlobjSearchColumn('phone'),
							         new nlobjSearchColumn('title')],
							rmrs = nlapiSearchRecord('employee', null, rmflt, rmcol);

						//assume there are results
						for (var erm=0; erm < rmrs.length; erm+=1)
						{
							rmJson.details[rmrs[erm].getValue('internalid')] = {
								'firstname':rmrs[erm].getValue('firstname'),
								'lastname':rmrs[erm].getValue('lastname'),
								'email':rmrs[erm].getValue('email'),
								'phone':rmrs[erm].getValue('phone'),
								'title':rmrs[erm].getValue('title')
							};
						}
					}

					//6. Merge the text
					finalMergedText = rawContent;

					//7. Swap out additional CUSTOM Tag values
					//#CONTRACT_END_DATE# Contract Anniversary Date

					finalMergedText = finalMergedText.replace('#CONTRACT_END_DATE#', ctjson.anvidate);

					//8. Swap out #RELATIONSHIP_MANAGER# with Details of Relationship Manager
					var relManagerText = '',
						toCc = null;
					for (var r in rmJson.details)
					{
						relManagerText += rmJson.details[r].firstname+' '+
										  rmJson.details[r].lastname+'<br/>'+
										  (rmJson.details[r].title?rmJson.details[r].title+'<br/>':'')+
										  (rmJson.details[r].email?rmJson.details[r].email+'<br/>':'')+
										  (rmJson.details[r].phone?rmJson.details[r].phone+'<br/>':'');

						relManagerText += '<br/><br/>';

						//Check to see if we need to cc anyone
						//10/7/2016
						//Removed check for NOT including sales rep.
						//We want to send to CC All Sales Reps
						if (rmJson.details[r].email)
						{
							toCc = [rmJson.details[r].email];
						}

					}
					finalMergedText = finalMergedText.replace('#RELATIONSHIP_MANAGER#', relManagerText);

					//8. Send it to Customer

					nlapiSendEmail(
						ctjson.salesrep,
						ctjson.billentityid,
						emailSbj,
						finalMergedText,
						toCc,
						null,
						{
							'entity':ctjson.billentityid,
							'transaction':ctjson.renewopp
						},
						nlapiPrintRecord('TRANSACTION', ctjson.renewquote, 'PDF'),
						true
					);

					logTblBody += '<tr><td>'+ctjson.name+' ('+ctjson.id+')</td>'+
								  '<td>'+ctjson.endusertext+' ('+ctjson.enduserid+')</td>'+
								  '<td>'+ctjson.billentitytext+' ('+ctjson.billentityid+')</td>'+
								  '<td>'+nlapiDateToString(curDateObj)+'</td>'+
								  '<td>'+ctjson.anvidate+'</td>'+
								  '<td>'+ctjson.termtext+'</td>'+
								  '<td>'+ctjson.termstart+' to '+ctjson.termend+'</td>'+
								  '<td>'+ctjson.renewopptext+' ('+ctjson.renewopp+')</td>'+
								  '<td>'+ctjson.renewquotetext+' ('+ctjson.renewquote+')</td>'+
								  '<td>'+reminderType+'</td>'+
								  '<td>SUCCESS</td>'+
								  '<td>Email Sent to Billing Entity</td>';

				}

			}
			catch (procerr)
			{
				log('error','Error Processing '+ctjson.id, getErrText(procerr));

				logTblBody += '<tr><td>'+ctjson.name+' ('+ctjson.id+')</td>'+
							  '<td>'+ctjson.endusertext+' ('+ctjson.enduserid+')</td>'+
							  '<td>'+ctjson.billentitytext+' ('+ctjson.billentityid+')</td>'+
							  '<td>'+nlapiDateToString(curDateObj)+'</td>'+
							  '<td>'+ctjson.anvidate+'</td>'+
							  '<td>'+ctjson.termtext+'</td>'+
							  '<td>'+ctjson.termstart+' to '+ctjson.termend+'</td>'+
							  '<td>'+ctjson.renewopptext+' ('+ctjson.renewopp+')</td>'+
							  '<td>'+ctjson.renewquotetext+' ('+ctjson.renewquote+')</td>'+
							  '<td>'+reminderType+'</td>'+
							  '<td>ERROR</td>'+
							  '<td>'+getErrText(procerr)+'</td>';

				logTblBody += '<tr><td>'+ctjson.name+' ('+ctjson.id+')</td>'+
							  '<td>'+ctjson.endusertext+' ('+ctjson.enduserid+')</td>'+
							  '<td>'+ctjson.billentitytext+' ('+ctjson.billentityid+')</td>'+
							  '<td>'+nlapiDateToString(curDateObj)+'</td>'+
							  '<td>'+ctjson.anvidate+'</td>'+
							  '<td>'+ctjson.termtext+'</td>'+
							  '<td>'+ctjson.termstart+' to '+ctjson.termend+'</td>'+
							  '<td>Failed</td>'+
							  '<td></td>'+
							  '<td>'+getErrText(procerr)+'</td>';

			}

			//Add In Reschedule Logic
			//Set % completed of script processing
			var pctCompleted = Math.round(((i+1) / ctrs.length) * 100);
			nlapiGetContext().setPercentComplete(pctCompleted);

			//------------ Reschedule check -------------------
			if ((i+1)==1000 || ((i+1) < ctrs.length && nlapiGetContext().getRemainingUsage() < 1000))
			{
				//reschedule
				log(
					'audit',
					'Getting Rescheduled at',
					'Contract ID '+ctjson.id+' // #'+ctjson.name
				);

				var param = {
					'custscript_sb145_lastprocid':paramLastProcId,
					'custscript_sb145_custcurrdate':paramCustomAnniversaryDate
				};

				//execute reschedule
				nlapiScheduleScript(
					nlapiGetContext().getScriptId(),
					nlapiGetContext().getDeploymentId(),
					param
				);
				break;
			}
		}//End of Loop
	}
	catch(procerr)
	{
		//Log and and generate customized Error Message
		log(
			'error',
			'CRA_ERROR_REMINDER_NOTIFICATION_PROCESS',
			'Unexpected Error while processing Contract Reminder Notification '+getErrText(procerr)
		);

		//Generate Custom Error Email Notification
		nlapiSendEmail(
			-5,
			paramCraErrorNotifier,
			'CRA Reminder Notification Process Error',
			'Error Processing Contract Reminder Notification on '+nlapiDateToString(curDateObj)+' '+
				'. Unexpected Script Termination due to below error.<br/><br/>'+
				getErrText(procerr),
			paramCraCcNotifier
		);

	}

	//Generate csvLog. This is being done here just in case something errors during processing that terminates the script
	if (logTblBody)
	{
		nlapiSendEmail(
			-5,
			paramCraErrorNotifier,
			'Contract Expire Process Log'+
				(procLogHasError?' - Has Errors':''),
			'Reminder Notification Process Log for '+nlapiDateToString(curDateObj)+'<br/><br/>'+
				'<table border="1">'+
				logTblHeader+
				logTblBody+
				'</table>'
		);
	}
}
