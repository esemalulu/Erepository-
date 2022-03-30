/**
 * Allows admin type users to easily kick off Contract Related scheduled scripts
 * manually.  This will auto calculate certain custom parameters for them
 * so that they don't mock around with script deployments
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

//JSON object that holds details information about each Contract Module Scheduled Tasks
var sctJson = {
	'customscript_axcra_ss_soctrassetproc':{
		'name':'Approved Sales Order to Contract',
		'desc':'Manually kick off job to process Approved Sales Orders (Pending Billing) into Contracts. '+
			   'NO custom parameter(s) are available for this Job. However once queued up, it will process '+
			   'ALL pending unprocessed and approved (pending billing) Contract Module related Sales orders into Contract',
		'dplid':'customdeploy_axcra_ss_soctrprocadhoc',
		'params':[]
	},
	'customscript_axcra_ss_ctrrenewalproc':{
		'name':'Contract Renewal',
		'desc':'Manually kick off job to process contract renewals.  '+
			   'You can provide custom anniversary date and billing customer to execute against. '+
			   'Renewals are generated '+paramRenewalNumFromEndDate+' before contract anniversary date.',
		'dplid':'customdeploy_axcra_ss_ctrrenewaladhoc',
		'params':['custscript_sb135_ctanvidate',
		          'custscript_sb135_renewcustomer']
	},
	'customscript_axcra_ss_ctrexpireproc':{
		'name':'Contract Renewal Delay',
		'desc':'Manually kick off job to process Contracts in PENDING RENEWAL state to DELAYED state.  '+
			   'The job executes against contracts that has passed contract anniversary dates + '+paramDelayNumAfterEndDate+' Days. '+
			   'You can provide contract Anniversary Date and UI will calculate custom date to use for you. '+
			   'You will also be required to pass in billing customer to execute against. ',
		'dplid':'customdeploy_axcra_ss_ctrexpireprocadhoc',
		'params':['custscript_sb136_custcurrdate',
		          'custscript_sb136_custbillcustomer']
	},
	'customscript_axcra_ss_renewreminder':{
		'name':'Renewal Reminder',
		'desc':'Manually kick off job to process Contract renewal reminder notifications.  '+
			   'The job executes against those in PENDING RENEWAL state and linked renewal opportunity '+
			   'status any of 02-Discovery, 03-Qualifying, 04-Proving, 05-Proposing. '+
			   'You can provide contract Anniversary date and notification type and UI will calculate custom date to use for you.'+
			   'You will also be required to set pass in billing customer to execute against. '+
			   'Script will automatically add 90 and 60 days to the custom date provided '+
			   'and look for matching contract anniversary date. ',
		'dplid':'customdeploy_axcra_ss_renewreminderadhoc',
		'params':['custscript_sb145_custcurrdate',
		          'custscript_sb145_custbillcustomer']
	},
	'customscript_axcra_ss_ctrassetcancel':{
		'name':'Customer Return Asset Cancellation',
		'desc':'Manually kick off job to process Return Authorizations that is in Pending Receipt, Pending Refund, '+
			   'Pending Refund/Partially Received, Refunded state that has not been processed yet and is linked to '+
			   'Contract Module Sales order. '+
			   'NO custom parameter(s) are available for this Job. However once queued up, it will process '+
			   'ALL pending unprocessed Return Authorizations',
		'dplid':'customdeploy_axcra_ss_ctrasetcanceladhoc',
		'params':[]
	},
	'customscript_axcra_ss_genitemjsonfile':{
		'name':'Contract Module Eligible Items Generator',
		'desc':'Manually kick off job to re-generate JavaScript file containg information about ALL '+
			   'Contract Module eligible items.  Script runs on a scheduled basis but this tool is provided '+
			   'if new item is added and MUST be part of Contract Module process right away. '+
			   'NO custom parameter(s) are available for this Job.',
		'dplid':'customdeploy_axcma_ss_genitmjsonadhoc',
		'params':[]
	}
};

var EM_PILLAR = '1',
	DM_PILLAR = '2',
	BOTH_PILLAR = '3',
	//9/19/2016
	//Enhancement request to handle DN Pillar
	DN_PILLAR = '5';

/********* Suitelet Function *******/
function adHocProcUi(req, res)
{
	var nsform = nlapiCreateForm('AdHoc Contract Module Related Job Processor', false),
		//User selected processor script ID
		reqParamSctId = req.getParameter('custpage_sctid'),
		reqProcMsg = req.getParameter('custpage_msg');

	nsform.setScript('customscript_axcra_cs_adhocjobprochelp');

	var procMsgFld = nsform.addField('custpage_msg', 'inlinehtml', '', null, null);
	procMsgFld.setLayoutType('outsideabove', null);


	if (req.getMethod() == 'POST')
	{
		var queueStatus = '',
			queueParam = null,
			rparam = {};
		//Queue up SO to Contract Processor
		if (req.getParameter('custpage_sctid') == 'customscript_axcra_ss_soctrassetproc')
		{
			log('debug','Queued up SO To Contract',reqParamSctId+' // '+sctJson[reqParamSctId].dplid);
		}

		if (sctJson[reqParamSctId].params.length > 0)
		{
			queueParam={};
			for (var p=0; p < sctJson[reqParamSctId].params.length; p+=1)
			{
				queueParam[sctJson[reqParamSctId].params[p]] = req.getParameter(sctJson[reqParamSctId].params[p]);
			}
		}


		//Queue up Script
		queueStatus = nlapiScheduleScript(reqParamSctId, sctJson[reqParamSctId].dplid, queueParam);
		log('debug', 'Queue Process Value', reqParamSctId);
		log('debug', 'Queue Process Value', sctJson[reqParamSctId].dplid);
		log('debug', 'Queue Process Value', JSON.stringify(queueParam));

		if (queueStatus != 'QUEUED')
		{
			procMessageToShow = 'Failed to queue up process. It is either currently running or in queue already.';
		}
		else
		{
			procMessageToShow = 'Successfully queued for AdHoc processing';
		}

		//Do Redirect to Suitelet with Process Message
		rparam = {
			'custpage_sctid':reqParamSctId,
			'custpage_msg':procMessageToShow
		};
		nlapiSetRedirectURL(
			'SUITELET',
			'customscript_axcra_sl_adhocjobproc',
			'customdeploy_axcra_sl_adhocjobproc',
			'VIEW',
			rparam
		);

	}

	//*********** Add in user options *********/
	nsform.addFieldGroup('custpage_grpa', 'Options', null);
	//Column A
	var sctIdFld = nsform.addField('custpage_sctid', 'select', 'CM Process', null, 'custpage_grpa');
	sctIdFld.setBreakType('startcol');
	sctIdFld.setMandatory(true);
	sctIdFld.addSelectOption('', '', true);
	for (var s in sctJson)
	{
		sctIdFld.addSelectOption(s, sctJson[s].name, false);
	}
	sctIdFld.setDefaultValue(reqParamSctId);

	//Column B
	var sctDescFld = nsform.addField('custpage_sctdesc','textarea','Process Description', null, 'custpage_grpa');
	sctDescFld.setDisplayType('inline');
	sctDescFld.setBreakType('startcol');
	if (reqParamSctId)
	{
		sctDescFld.setDefaultValue(sctJson[reqParamSctId].desc);
	}

	//Column C
	//Value will be set once user selects script option
	var sctStatusFld = nsform.addField('custpage_sctstatus','textarea','Script Status', null, 'custpage_grpa');
	sctStatusFld.setDisplayType('inline');
	sctStatusFld.setBreakType('startcol');

	//Once User selects the script, display options including current status of the script
	if (reqParamSctId)
	{
		//1. Always RUN search to see if there is currently one (AdHoc version of scheduled deployment running)
		var sctflt = [new nlobjSearchFilter('scriptid','script','is',reqParamSctId)],
			sctcol = [new nlobjSearchColumn('datecreated').setSort(true),
			          new nlobjSearchColumn('status'),
			          new nlobjSearchColumn('percentcomplete')],
			sctrs = nlapiSearchRecord('scheduledscriptinstance', null, sctflt, sctcol),
			showSubmit = true,
			scriptStatusText = '<div style="color:green; font-weight:bold">Available for execution. </div>';

		//This means something is running
		if (sctrs)
		{
			if (sctrs[0].getValue('status')!='Complete' && sctrs[0].getValue('status')!='Failed' )
			{
				showSubmit = false;
				scriptStatusText = '<div style="color:red; font-weight:bold">Script is NOT Available for processing at this time</div>';
			}
			else
			{
				scriptStatusText = '<div style="color:green; font-weight:bold">Script is Available for processing. Most Recent Status Below</div>';
			}

			scriptStatusText += 'Queued Date: '+sctrs[0].getValue('datecreated')+'<br/>'+
							    'Current Script Status: '+sctrs[0].getValue('status')+'<br/>'+
							    'Percent Completed: '+sctrs[0].getValue('percentcomplete');
		}
		//Set Column C Status Value
		sctStatusFld.setDefaultValue(scriptStatusText);

		//Show Submit Button
		if (showSubmit)
		{
			nsform.addSubmitButton('Queue Up Job');
		}

		//******************************** Core Script Based Options ********************
		nsform.addFieldGroup('custpage_grpb', 'Script Parameter Options', null);

		//Contract Renewal Processor Related Parameters
		if (reqParamSctId == 'customscript_axcra_ss_ctrrenewalproc')
		{
			var custAnviDateFld = nsform.addField('custscript_sb135_ctanvidate','date','Contract Anniversary Date', null, 'custpage_grpb');
			custAnviDateFld.setMandatory(true);
			custAnviDateFld.setBreakType('startcol');

			var custClientFld = nsform.addField('custscript_sb135_renewcustomer','select','Billing Customer','customer','custpage_grpb');
			custClientFld.setMandatory(true);
			custClientFld.setBreakType('startcol');
		}

		else if (reqParamSctId == 'customscript_axcra_ss_ctrexpireproc')
		{
			var custCurrDateFld = nsform.addField('custscript_sb136_anvidate','date','Contract Anniversary Date', null, 'custpage_grpb');
			custCurrDateFld.setMandatory(true);
			custCurrDateFld.setBreakType('startcol');

			//Calculated Date to USE
			var custCurrDateToUseFld = nsform.addField('custscript_sb136_custcurrdate','date','Above Date + 1 Day + '+paramDelayNumAfterEndDate+' Days', null, 'custpage_grpb');
			custCurrDateToUseFld.setMandatory(true);
			custCurrDateToUseFld.setDisplayType('disabled');


			var custDeClientFld = nsform.addField('custscript_sb136_custbillcustomer','select','Billing Customer','customer','custpage_grpb');
			custDeClientFld.setMandatory(true);
			custDeClientFld.setBreakType('startcol');
		}

		else if (reqParamSctId == 'customscript_axcra_ss_renewreminder')
		{
			var custCurrDatereFld = nsform.addField('custscript_sb145_ctanvidate','date','Custom Anniversary Date', null, 'custpage_grpb');
			custCurrDatereFld.setMandatory(true);
			custCurrDatereFld.setBreakType('startcol');

			var notifTypeFld = nsform.addField('custpage_notiftype','select','Notification Type', null, 'custpage_grpb');
			notifTypeFld.setMandatory(true);
			notifTypeFld.addSelectOption('', '', true);
			notifTypeFld.addSelectOption(paramFirstRminderNumFromEndDate, paramFirstRminderNumFromEndDate+' Notification', false);
			notifTypeFld.addSelectOption(paramSecondReminderNumFromEndDate, paramSecondReminderNumFromEndDate+' Notification', false);

			//Calculated Current Date to use
			var custCurrDateToCalcFld = nsform.addField('custscript_sb145_custcurrdate','date','Calculated Current Date To Use', null, 'custpage_grpb');
			custCurrDateToCalcFld.setDisplayType('disabled');
			custCurrDateToCalcFld.setBreakType('startcol');
			custCurrDateToCalcFld.setMandatory(true);

			var custReClientFld = nsform.addField('custscript_sb145_custbillcustomer','select','Billing Customer','customer','custpage_grpb');
			custReClientFld.setMandatory(true);
			custReClientFld.setBreakType('startcol');
		}
	}

	res.writePage(nsform);

}


//********* Client Side helper function
function ahJobFldChanged(type, name, linenum)
{
	if (name == 'custpage_sctid' && nlapiGetFieldValue(name))
	{
		//reload the page
		window.ischanged = false;
		window.location = nlapiResolveURL(
									'SUITELET',
									'customscript_axcra_sl_adhocjobproc',
									'customdeploy_axcra_sl_adhocjobproc',
									'VIEW'
								 )+'&custpage_sctid='+nlapiGetFieldValue(name);

	}

	if (name == 'custscript_sb136_anvidate')
	{
		if (!nlapiGetFieldValue(name))
		{
			nlapiSetFieldValue('custscript_sb136_custcurrdate','');
		}
		else
		{
			//One Day After Anniversary Date since it looks for AFTER anvi date
			var delayDate = nlapiAddDays(nlapiStringToDate(nlapiGetFieldValue(name)), 1);
			//Add delay number of days
			delayDate = nlapiAddDays(delayDate, paramDelayNumAfterEndDate);

			nlapiSetFieldValue('custscript_sb136_custcurrdate',nlapiDateToString(delayDate));
		}
	}

	if (name == 'custscript_sb145_ctanvidate' || name == 'custpage_notiftype')
	{
		if (!nlapiGetFieldValue(name))
		{
			nlapiSetFieldValue('custscript_sb145_custcurrdate','');
		}
		else
		{
			//Calculate as long as BOTH are filled in
			if (nlapiGetFieldValue('custpage_notiftype') && nlapiGetFieldValue('custscript_sb145_ctanvidate'))
			{
				//Add Calculated current date
				var notifCalcDate = nlapiAddDays(
										nlapiStringToDate(nlapiGetFieldValue('custscript_sb145_ctanvidate')),
										(-1 * parseInt(nlapiGetFieldValue('custpage_notiftype'))));
				nlapiSetFieldValue('custscript_sb145_custcurrdate',nlapiDateToString(notifCalcDate));
			}



		}
	}

}
