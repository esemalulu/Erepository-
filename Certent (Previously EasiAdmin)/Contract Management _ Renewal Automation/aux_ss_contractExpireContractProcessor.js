/**
 * Contract Management & Renewal Automation related.
 * Scheduled script to run Daily to go through all Pending Renewal 
 * contracts and if it passed [Anniversary Date] + [paramDelayNumAfterEndDate]
 * This means it is well passed the time 
 * and should be marked as Delayed. 
 * 
 * 
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
var	paramLastProcId = nlapiGetContext().getSetting('SCRIPT','custscript_sb136_lastprocid'),
	//Custom current Date.
	//	When this is passed in, it will use THIS date as current date instead of using system current date
	//	This date will be used to compare against contract anniversary date to bring out list of candidates
	paramCustomCurrentDate = nlapiGetContext().getSetting('SCRIPT','custscript_sb136_custcurrdate'),
	
	//Custom Billing Customer.
	//	When this is passed in, it will ONLY look for contract with billing entity of THIS value.
	paramCustomBillClient = nlapiGetContext().getSetting('SCRIPT','custscript_sb136_custbillcustomer');

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
function processCtrExpireProcess()
{
	var logTblHeader = '<tr><td>Contract (Internal ID)</td>'+
					   '<td>End Company (Internal ID)</td>'+
					   '<td>Billing Entity (Internal ID)</td>'+
					   '<td>Current Date</td>'+
					   '<td>Contract Anniversary Date</td>'+
					   '<td>Contract Term</td>'+
					   '<td>Contract Term From/To</td>'+
					   '<td>Status</td>'+
					   '<td># of Days Passed</td>'+
					   '<td>Detail</td></tr>',
		logTblBody = '',
		curDateObj = new Date();
	
	try
	{
		//Search for ALL Contracts in Pending Renewal State that has Contract Anniv. After Current Date
		//1. Status is Pending Renewal
		//	- We do not care for those marked as Delayed or Terminated. 
		//	- Status of Pending Renewal means it's already gone through the process.
		//2. Inactive is F
		//3. Current date is On or After Contract Anniversary date
		
		log('debug','custom params',paramCustomCurrentDate+' // '+paramCustomBillClient);
		
		//If Custom current date is passed in as script parameter,
		//	Use that date as current Date
		if (paramCustomCurrentDate)
		{
			curDateObj = nlapiStringToDate(paramCustomCurrentDate);
		}
		
		var ctflt = [new nlobjSearchFilter('custrecord_crc_status', null, 'anyof', paramPendingRenewalStatusId),
		             new nlobjSearchFilter('isinactive', null, 'is', 'F'),
		             new nlobjSearchFilter('custrecord_crc_startdate', null, 'before', nlapiDateToString(curDateObj))];
		
		if (paramLastProcId)
		{
			ctflt.push(new nlobjSearchFilter('internalidnumber', null, 'lessthan', paramLastProcId));
		}
		
		if (paramCustomBillClient)
		{
			ctflt.push(new nlobjSearchFilter('custrecord_crc_billingentity', null,'anyof', paramCustomBillClient));
		}
		
		//10/13/2016
		//Part of Enhancement #2
		//if paramSubsExcludeIds has IDs in the array, ONLY return list of sales orders that 
		//does NOT belong to identified subsidiaries
		if (paramSubsExcludeIds.length > 0)
		{
			//We do NOT process ANY Contract where linked Billing Entity Subsidiary is one of exclusion subsidiary
			ctflt.push(new nlobjSearchFilter('subsidiary', 'custrecord_crc_billingentity', 'noneof', paramSubsExcludeIds));
		}
		
		//Return columns. Some needed for logging purposes
		var ctcol = [
		             new nlobjSearchColumn('internalid').setSort(true),
		             new nlobjSearchColumn('name'),
		             new nlobjSearchColumn('custrecord_crc_contractterm'),
		             new nlobjSearchColumn('custrecord_crc_termstartdate'),
		             new nlobjSearchColumn('custrecord_crc_termenddate'),
		             new nlobjSearchColumn('custrecord_crc_enduser'),
		             new nlobjSearchColumn('custrecord_crc_billingentity'),
		             new nlobjSearchColumn('custrecord_crc_startdate')
		             ];
		
		//Search for all pending renewal contracts to be reviewed
		var ctrs = nlapiSearchRecord('customrecord_axcr_contract', null, ctflt, ctcol);
		
		//Loop through each
		for (var i=0; ctrs && i < ctrs.length; i+=1)
		{
			//dateToLookFor is THIS contracts anniversary date + paramDelayNumAfterEndDate
			var dateToLookFor = nlapiAddDays(nlapiStringToDate(ctrs[i].getValue('custrecord_crc_startdate')), paramDelayNumAfterEndDate);
			
			log('debug','Anniv date // paramDelayNumAfterEndDate // dateToLookFor',ctrs[i].getValue('custrecord_crc_startdate')+' // '+paramDelayNumAfterEndDate+' // '+dateToLookFor);
			
			//1. Grab list of ALL contract column values
			var ctjson = {
				'id':ctrs[i].getValue('internalid'),
				'name':ctrs[i].getValue('name'),
				'termid':ctrs[i].getValue('custrecord_crc_contractterm'),
				'termtext':ctrs[i].getText('custrecord_crc_contractterm'),
				'termstart':ctrs[i].getValue('custrecord_crc_termstartdate'),
				'termend':ctrs[i].getValue('custrecord_crc_termenddate'),
				'enduserid':ctrs[i].getValue('custrecord_crc_enduser'),
				'endusertext':ctrs[i].getText('custrecord_crc_enduser'),
				'billentityid':ctrs[i].getValue('custrecord_crc_billingentity'),
				'billentitytext':ctrs[i].getText('custrecord_crc_billingentity'),
				'anvidate':ctrs[i].getValue('custrecord_crc_startdate')
			}; 
			
			if (curDateObj >= dateToLookFor)
			{
				log('debug','contract json','Date to look for is after current. Process // Curr: '+curDateObj+' // date to look: '+dateToLookFor+' // '+JSON.stringify(ctjson));
				
				try
				{
					//1. Calculate number of days passed since contract anniversary date to today.
					var numDaysPass = Math.round((curDateObj - nlapiStringToDate(ctjson.anvidate))
									  /
									  (1000*60*60*24));
					log('debug','Current Date // Anniversary Date // Date Diff', curDateObj+' // '+ctjson.anvidate+' // '+numDaysPass);
					
					if (numDaysPass < parseFloat(paramExpCloseDateNumFromEndDate))
					{
						//Skip processing if date passed from Anniversary date is still before Expected closed date of Opportunity
						logTblBody += '<tr><td>'+ctjson.name+' ('+ctjson.id+')</td>'+
									  '<td>'+ctjson.endusertext+' ('+ctjson.enduserid+')</td>'+
									  '<td>'+ctjson.billentitytext+' ('+ctjson.billentityid+')</td>'+
									  '<td>'+nlapiDateToString(curDateObj)+'</td>'+
									  '<td>'+ctjson.anvidate+'</td>'+
									  '<td>'+ctjson.termtext+'</td>'+
									  '<td>'+ctjson.termstart+' to '+ctjson.termend+'</td>'+
									  '<td>SKIP</td>'+
									  '<td>'+numDaysPass+' from Anniversary Date</td>'+
									  '<td>Skipping Expiration. Still within expected close date</td>';
					}
					else
					{
						//1. Grab list of ALL Assets linked to THIS contract
						//	 Expiration process will expire all assets linked to THIS contract
						//	 That are currently Active
						var asflt = [new nlobjSearchFilter('isinactive', null, 'is','F'),
						             new nlobjSearchFilter('custrecord_cra_assetstatus', null, 'anyof', paramActiveStatusId),
						             new nlobjSearchFilter('custrecord_cra_contract', null, 'anyof', ctjson.id)],
						    ascol = [new nlobjSearchColumn('internalid')],
						    asrs = nlapiSearchRecord('customrecord_axcr_assets', null, asflt, ascol);
						
						try
						{
							//Loop through all Assets and change status to Expired.
							for (var a=0; asrs && a < asrs.length; a+=1)
							{
								nlapiSubmitField(
									'customrecord_axcr_assets', 
									asrs[a].getValue('internalid'), 
									'custrecord_cra_assetstatus', 
									paramDelayedStatusId, 
									true
								);
							}
						}
						catch (assupderr)
						{
							throw nlapiCreateError('CRA_EXPIRE_ERR', 'Error Delayed Asset Internal ID '+asrs[a].getValue('internalid'), true);
						}
						
						//2. Update THIS contract status to be Delayed
						nlapiSubmitField(
							'customrecord_axcr_contract', 
							ctjson.id, 
							'custrecord_crc_status', 
							paramDelayedStatusId, 
							true
						);
						
						logTblBody += '<tr><td>'+ctjson.name+' ('+ctjson.id+')</td>'+
									  '<td>'+ctjson.endusertext+' ('+ctjson.enduserid+')</td>'+
									  '<td>'+ctjson.billentitytext+' ('+ctjson.billentityid+')</td>'+
									  '<td>'+nlapiDateToString(curDateObj)+'</td>'+
									  '<td>'+ctjson.anvidate+'</td>'+
									  '<td>'+ctjson.termtext+'</td>'+
									  '<td>'+ctjson.termstart+' to '+ctjson.termend+'</td>'+
									  '<td>SUCCESS</td>'+
									  '<td>'+numDaysPass+' from Anniversary Date</td>'+
									  '<td>Contract marked as Delayed</td>';
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
								  '<td>Failed</td>'+
								  '<td></td>'+
								  '<td>'+getErrText(procerr)+'</td>';

				}
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
					'custscript_sb136_lastprocid':paramLastProcId,
					'custscript_sb136_custcurrdate':paramCustomAnniversaryDate
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
			'CRA_ERROR_DELAY_PROCESS',
			'Unexpected Error while processing Contract Delay '+getErrText(procerr)
		);
		
		//Generate Custom Error Email Notification
		nlapiSendEmail(
			-5, 
			paramCraErrorNotifier, 
			'CRA Renewal Process Error', 
			'Error Processing Contract Delay on '+nlapiDateToString(curDateObj)+' '+
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
			paramAcctNotifier, 
			'Contract Delay Process Log', 
			'Expire Process Log for '+nlapiDateToString(curDateObj)+'<br/><br/>'+
				'<table border="1">'+
				logTblHeader+
				logTblBody+
				'</table>'
		);
	}
}

