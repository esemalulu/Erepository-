/**
 * Contract Management & Renewal Automation related.
 * Scheduled script to run Daily to go through and process Asset Returns
 * Asset Returns will be handled in following steps:
 * 1. Return Authorization is created against Sales Order.
 * 2. Return Authorization is approved with status of "Pending Receipt"
 *
 * Scheduled script will go through ALL Return Authorizations with status of Pending Receipt
 * that was created against "CRA" Sales Order.
 *
 * When This scheduled process runs, it will mark each matching asset(s) as Cancelled and Status as Terminated.
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
var	paramLastProcId = nlapiGetContext().getSetting('SCRIPT','custscript_sb138_lastprocid');
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
else
{
	paramCraCcNotifier = null;
}

if (paramRecurringItemTypes)
{
	paramRecurringItemTypes = paramRecurringItemTypes.split(',');
}


/**
 * Main Entry function for Asset Return/Cancellation process
 */
function processAssetReturnProcess()
{
	var logTblHeader = '<tr><td>Contract (Internal ID)</td>'+
					   '<td>End Company (Internal ID)</td>'+
					   '<td>Billing Entity (Internal ID)</td>'+
					   '<td>Return Authorization</td>'+
					   '<td>Sales Order</td>'+
					   '<td>Asset ID</td>'+
					   '<td>Item Info</td>'+
					   '<td>Status</td>'+
					   '<td>Detail</td></tr>',
		logTblBody = '',
		curDateObj = new Date();

	try
	{

		//Include ALL Return Authorization statuses AFTEr Pending Approval
		//	ONLY using Pending Receipt may miss processing time if it gets process at the same time
		//	'RtnAuth:B' = Pending Receipt,
		//	'RtnAuth:F' = Pending Refund,
		//  'RtnAuth:E' = Pending Refund/Partially Received
		//	'RtnAuth:G' = Refunded
		var raStatuses = ['RtnAuth:B','RtnAuth:F','RtnAuth:E','RtnAuth:G'],
			ctflt = [new nlobjSearchFilter('type', null,'anyof',['RtnAuth']),
		             new nlobjSearchFilter('status', null, 'anyof', raStatuses),
		             //7/18/2016
		             //All Transactions created from Opp/SO that has Contract Module fields
		             //	Will be available on Invoice/RA.
		             new nlobjSearchFilter('custbody_axcr_contractreference',null,'noneof','@NONE@'),
		             new nlobjSearchFilter('custbody_axcr_iscratrx',null,'is','T'),
		             new nlobjSearchFilter('mainline', null, 'is','T'),
		             new nlobjSearchFilter('custbody_axcr_contractprocessed', null, 'is','F')
		             ];

		if (paramLastProcId)
		{
			ctflt.push(new nlobjSearchFilter('internalidnumber', null, 'lessthan', paramLastProcId));
		}

		//10/13/2016
		//Part of Enhancement #2
		//if paramSubsExcludeIds has IDs in the array, ONLY return list of sales orders that
		//does NOT belong to identified subsidiaries
		if (paramSubsExcludeIds.length > 0)
		{
			ctflt.push(new nlobjSearchFilter('subsidiary', null, 'noneof', paramSubsExcludeIds));
		}

		//Return columns. Some needed for logging purposes
		var ctcol = [
		             new nlobjSearchColumn('internalid').setSort(true),
		             new nlobjSearchColumn('tranid'),
		             new nlobjSearchColumn('createdfrom'),
		             //7/18/2016
		             //we need to grab Opportunity value from createdfrom.
		             //	This is because whether RA was created from Invoice Or Sales Order,
		             //	It will always have same value for Opportunity.
		             //	AND THIS Opportunity IS tracked at the CR-Asset level as well.
		             new nlobjSearchColumn('opportunity','createdfrom'),
		             new nlobjSearchColumn('custbody_axcr_contractreference')
		             ];

		//Search for all approved Return Authorizations
		var ctrs = nlapiSearchRecord('transaction', null, ctflt, ctcol);

		//Loop through each
		for (var i=0; ctrs && i < ctrs.length; i+=1)
		{
			try
			{
				var raid = ctrs[i].getValue('internalid'),
					rarec = nlapiLoadRecord(ctrs[i].getRecordType(), raid, true),
					rajson = {
						'itemlist':[],
						/**
						 * Assumes each item is unique per line on the RA
						 * {
						 *   'itemid':'amount'
						 * }
						 */
						'detail':{}
					},
					soInvid = ctrs[i].getValue('createdfrom'),
					//7/18/2016
					//Grab Opportunity for THIS RA via CreatedFrom record.
					oppId = ctrs[i].getValue('opportunity','createdfrom'),
					ctid = ctrs[i].getValue('custbody_axcr_contractreference');

				//1. build list of Items on the RA
				for (var li=1; li <= rarec.getLineItemCount('item'); li+=1)
				{
					var lineItemId = rarec.getLineItemValue('item', 'item', li),
						lineItemAmount = rarec.getLineItemValue('item','amount',li);

					//Add it to itemlist array for searching
					if (!rajson.itemlist.contains(lineItemId))
					{
						rajson.itemlist.push(lineItemId);
					}

					//If there are duplicate line item on THIS Return Authorization
					//	linked to specific Contract Module Sales order, throw an error
					if (rajson[lineItemId])
					{
						throw nlapiCreateError('CRA_ERROR_CANCEL_PROCESS', 'Duplicate line item found from single RA. ', true);
					}

					rajson[lineItemId] = lineItemAmount;

				}

				log('debug','rajson',JSON.stringify(rajson));

				//7/18/2016
				//Logic Change
				//We need to grab list of Assets that matches Opp ID linked to SO/Inv. being returned.
				//	Current Asset records will always hold reference to Opp. ID that triggered
				//	Asset creation during renewal or create process.
				//  IF an SO/Inv from previous years' or previous iteration is being returned,
				//	it will NEVER match on the assets.

				//2. Grab list of matching assets. Assume there are items to search for
				var assetflt = [new nlobjSearchFilter('custrecord_cra_contract', null, 'anyof', ctid),
				                //7/18/2016
				                //Instead of looking for SO/INV Id, we look for those assets matching OppID
				                new nlobjSearchFilter('custrecord_cra_linkedopp', null, 'anyof', oppId),
				                new nlobjSearchFilter('custrecord_cra_item', null, 'anyof', rajson.itemlist)],

				    assetcol = [new nlobjSearchColumn('internalid'),
				                new nlobjSearchColumn('custrecord_cra_item'),
				                new nlobjSearchColumn('custrecord_cra_contract'),
				                new nlobjSearchColumn('custrecord_crc_enduser','custrecord_cra_contract'),
				                new nlobjSearchColumn('custrecord_crc_billingentity','custrecord_cra_contract')],
				    assetrs = nlapiSearchRecord('customrecord_axcr_assets', null, assetflt, assetcol);

				//log('debug','ctid/soid/assetrs',ctid+'//'+soid+'//'+(assetrs?assetrs.length:0));

				//3. Go through matching assets and cancel/terminate them
				for (var a=0; assetrs && a < assetrs.length; a+=1)
				{
					try
					{
						//custrecord_cra_iscancelled
						//custrecord_cra_assetstatus paramTerminatedStatusId

						var assetUpdFlds = ['custrecord_cra_iscancelled',
						                    'custrecord_cra_assetstatus'],
						    assetUpdVals = ['T',
						                    paramTerminatedStatusId];
						nlapiSubmitField('customrecord_axcr_assets', assetrs[a].getValue('internalid'), assetUpdFlds, assetUpdVals, true);

						log('debug','Asset Termination Success', 'Asset ID: '+assetrs[a].getValue('internalid'));

						logTblBody += '<tr><td>'+assetrs[a].getText('custrecord_cra_contract')+' ('+assetrs[a].getValue('custrecord_cra_contract')+')</td>'+
									  '<td>'+assetrs[a].getText('custrecord_crc_enduser','custrecord_cra_contract')+
									  ' ('+assetrs[a].getValue('custrecord_crc_enduser','custrecord_cra_contract')+')</td>'+
									  '<td>'+assetrs[a].getText('custrecord_crc_billingentity','custrecord_cra_contract')+
									  ' ('+assetrs[a].getValue('custrecord_crc_billingentity','custrecord_cra_contract')+')</td>'+
									  '<td>'+rarec.getFieldValue('tranid')+' ('+raid+')</td>'+
									  '<td>'+rarec.getFieldText('createdfrom')+' ('+rarec.getFieldValue('createdfrom')+')</td>'+
									  '<td>'+assetrs[a].getValue('internalid')+'</td>'+
									  '<td>'+assetrs[a].getText('custrecord_cra_item')+'</td>'+
									  '<td>Success</td>'+
									  '<td>Terminated Asset</td></tr>';


					}
					catch (termerr)
					{
						log('error','Asset Termination Failed', 'Asset ID: '+assetrs[a].getValue('internalid')+' // '+getErrText(termerr));

						logTblBody += '<tr><td>'+assetrs[a].getText('custrecord_cra_contract')+' ('+assetrs[a].getValue('custrecord_cra_contract')+')</td>'+
									  '<td>'+assetrs[a].getText('custrecord_crc_enduser','custrecord_cra_contract')+
									  ' ('+assetrs[a].getValue('custrecord_crc_enduser','custrecord_cra_contract')+')</td>'+
									  '<td>'+assetrs[a].getText('custrecord_crc_billingentity','custrecord_cra_contract')+
									  ' ('+assetrs[a].getValue('custrecord_crc_billingentity','custrecord_cra_contract')+')</td>'+
									  '<td>'+rarec.getFieldValue('tranid')+' ('+raid+')</td>'+
									  '<td>'+rarec.getFieldText('createdfrom')+' ('+rarec.getFieldValue('createdfrom')+')</td>'+
									  '<td>'+assetrs[a].getValue('internalid')+'</td>'+
									  '<td>'+assetrs[a].getText('custrecord_cra_item')+'</td>'+
									  '<td>Failed</td>'+
									  '<td>'+getErrText(termerr)+'</td></tr>';
					}


				}

				//4. Execute ACV revalue
				var ctAcvValue = 0.0, //Total amount of all CRA eligible item
									  //5/14/2016 - ONLY calculate ACV based on recurring items
					ctAcvFlt = [new nlobjSearchFilter('custrecord_cra_contract', null, 'anyof', ctid),
					            new nlobjSearchFilter('isinactive', null, 'is', 'F'),
					            new nlobjSearchFilter('custrecord_cra_recurring', null, 'is','T'),
					            new nlobjSearchFilter('custrecord_cra_assetstatus', null, 'anyof', paramActiveStatusId)],
				    ctAcvCol = [new nlobjSearchColumn('custrecord_cra_actualsalesprice', null,'sum')],
				    ctAcvRs = nlapiSearchRecord('customrecord_axcr_assets', null, ctAcvFlt, ctAcvCol);

				if (ctAcvRs[0].getValue('custrecord_cra_actualsalesprice', null,'sum'))
				{
					ctAcvValue = ctAcvRs[0].getValue('custrecord_cra_actualsalesprice', null,'sum');
				}

				nlapiSubmitField('customrecord_axcr_contract',ctid,'custrecord_crc_acv',ctAcvValue);

				//Update the RA as processed
				nlapiSubmitField(ctrs[i].getRecordType(), raid,'custbody_axcr_contractprocessed','T');

			}
			catch (procerr)
			{
				log('error','Error Processing '+ctrs[i].getValue('internalid'), getErrText(procerr));

				logTblBody += '<tr><td>'+ctrs[i].getText('custbody_axcr_contractreference','createdfrom')+
							  ' ('+ctrs[i].getValue('custbody_axcr_contractreference','createdfrom')+')</td>'+
							  '<td> - </td>'+
							  '<td> - </td>'+
							  '<td>'+ctrs[i].getValue('tranid')+' ('+ctrs[i].getValue('internalid')+')</td>'+
							  '<td>'+ctrs[i].getText('createdfrom')+' ('+ctrs[i].getValue('createdfrom')+')</td>'+
							  '<td> - </td>'+
							  '<td> - </td>'+
							  '<td>Failed</td>'+
							  '<td>'+getErrText(procerr)+'</td></tr>';

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
					'Contract ID '+ctrs[i].getValue('internalid')
				);

				var param = {
					'custscript_sb138_lastprocid':paramLastProcId
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
			'CRA_ERROR_RENEWAL_PROCESS',
			'Unexpected Error while processing Contract Renewal '+getErrText(procerr)
		);

		//Generate Custom Error Email Notification
		nlapiSendEmail(
			-5,
			paramCraErrorNotifier,
			'CRA Renewal Process Error',
			'Error Processing Contract Renewal on '+nlapiDateToString(curDateObj)+' '+
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
			'Contract Asset Termination Process Log',
			'Termination Process Log for '+nlapiDateToString(curDateObj)+'<br/><br/>'+
				'<table border="1">'+
				logTblHeader+
				logTblBody+
				'</table>'
		);
	}
}
