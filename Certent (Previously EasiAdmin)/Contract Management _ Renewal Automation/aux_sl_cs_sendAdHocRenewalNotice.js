/**
 * Suitelet that is triggered from Contract Renewal Opportunity in VIEW mode to
 * manually send current version of Renewal Invoice.
 * This uses Generic Email Template as email subject and content.
 *
 * Version    Date            Author           Remarks
 * 1.00       04 Apr 2016     json
 *
 */

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
	paramGenericEmailTemplate = nlapiGetContext().getSetting('SCRIPT','custscript_sb131_genericrenewemailtemp');

if (paramCraCcNotifier)
{
	paramCraCcNotifier = paramCraCcNotifier.split(',');
}

if (paramRecurringItemTypes)
{
	paramRecurringItemTypes = paramRecurringItemTypes.split(',');
}

var EM_PILLAR = '1',
	DM_PILLAR = '2',
	BOTH_PILLAR = '3',
	//9/19/2016
	//Enhancement request to handle DN Pillar
	DN_PILLAR = '5';

/********* Suitelet Function *******/
function genAndSendRenewalNotice(req, res)
{
	var oppId = req.getParameter('custparam_oppid'),
		custId = req.getParameter('custparam_custid'),
		quoteId = req.getParameter('custparam_quoteid'),
		ctrEndDate = (req.getParameter('custparam_ctrenddate')?req.getParameter('custparam_ctrenddate'):''),
		nsform = nlapiCreateForm('Send Renewal Notification Email', true);


	nsform.setScript('customscript_axcra_cs_adhocrenewemail');

	//Add in process related fields
	var hasErrorFld = nsform.addField('custpage_haserr', 'checkbox', 'Has Error', null, null);
	hasErrorFld.setDisplayType('hidden');
	hasErrorFld.setLayoutType('outsideabove', null);

	var procMsgFld = nsform.addField('custpage_msg', 'inlinehtml', '', null, null);
	procMsgFld.setLayoutType('outsideabove', null);

	if (oppId && custId && quoteId)
	{
		try
		{
			//1. Use email Merger (api avail 2015v2)
			var emailMerger = nlapiCreateEmailMerger(paramGenericEmailTemplate);
			emailMerger.setEntity('customer', custId);
			emailMerger.setTransaction(oppId);

			var mergeObj = emailMerger.merge(),
				rawContent = mergeObj.getBody(),
				emailSbj = mergeObj.getSubject();

			log('debug','rawContent',rawContent);
			log('debug','emailSbj',emailSbj);

			//2. Get Email Template Raw text Value
			var opprec = nlapiLoadRecord('opportunity', oppId),
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

			finalMergedText = finalMergedText.replace('#CONTRACT_END_DATE#', ctrEndDate);

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

			//9. Send it to Customer
			//4/8/2016 - Send it from primary sales rep on Opportunity
			nlapiSendEmail(
				opprec.getFieldValue('salesrep'),
				custId,
				emailSbj,
				finalMergedText,
				toCc,
				null,
				{
					'entity':custId,
					'transaction':oppId
				},
				nlapiPrintRecord('TRANSACTION', quoteId, 'PDF'),
				true
			);

			procMsgFld.setDefaultValue(
				'<div style="color: green; font-weight:bold; font-size: 17px">'+
				'Email Successfully Sent'+
				'</div>'
			);

		}
		catch(emailerr)
		{
			procMsgFld.setDefaultValue(
				'<div style="color: red; font-weight:bold; font-size: 17px">'+
				'Error occured while attempting to send email<br/><br/>'+
				getErrText(emailerr)+
				'</div>'
			);
		}

	}
	else
	{
		procMsgFld.setDefaultValue(
			'<div style="color: red; font-weight:bold; font-size: 17px">'+
			'Missing Opportunity ID, Client ID, Estimate ID, and Contract Anniversary Date to generate/send renewal notification email.'+
			'</div>'
		);
	}

	nsform.addButton('custpage_closebtn', 'Close Window', 'closeAndRefreshParent()');

	res.writePage(nsform);

}


//********* Client Side helper function
function closeAndRefreshParent()
{
	//alert(window.parent.location);

	window.opener.location = window.opener.location;
	window.ischanged = false;

	window.close();

}
