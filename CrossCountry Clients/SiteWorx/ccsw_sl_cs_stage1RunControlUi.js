/**
 * This Suitelet is designed to be the starting point to kick off the processing of imported ADP and OpenAir data.
 * UI display will give the users ability to choose unprocessed pay period and the ability to review all related records
 * and kick off the validation process. 
 * 
 * Version    Date            Author           Remarks
 * 1.00       13 Oct 2015     json
 *
 */

/**
 * @param {nlobjRequest} request Request object
 * @param {nlobjResponse} response Response object
 * @returns {Void} Any output is written via response object
 */
function stage1RunControl(req, res){

	var nsform = nlapiCreateForm('Journal Redistribution Controller', false);
	nsform.setScript('customscript_ccsw_cs_startjlrdproc');
	
	var errmsg = nsform.addField('custpage_msgfld', 'inlinehtml', '', null, null);
	errmsg.setLayoutType('outsideabove', null);
	
	try
	{
		var paramPayPeriod = req.getParameter('custpage_ppfld'),
			payPeriodFrom='',
			payPeriodTo='';
		if (!paramPayPeriod)
		{
			paramPayPeriod = req.getParameter('custparam_ppfld');
		}
		
		if (paramPayPeriod)
		{
			var arPayPeriods = paramPayPeriod.split('-'),
			payPeriodFrom = strTrim(arPayPeriods[0]),
			payPeriodTo = strTrim(arPayPeriods[1]);
		}
		
		var paramDisplayList = req.getParameter('custparam_display');
		
		var paramProcMessage = req.getParameter('custparam_procmsg');
		errmsg.setDefaultValue(paramProcMessage);
		
		//************** PROCESS DELETE ALL FOR PAY PERIOD ****************************************************/
		var paramDeleteAll = req.getParameter('custparam_deleteall');
		if (paramDeleteAll == 'y')
		{
			/**
			 * Delete ALL Scheduled Script Info:
			 * Script ID: customscript_ccsw_ss_purgeredistrodata
			 * Script Deployment: customdeploy_ccsw_ss_purgeredistrodata
			 * Parameter:
			 * custscript_sb142_triggeruser
			 * custscript_sb142_pprange
			 * custscript_sb142_isdeleteall
			 * custscript_sb142_deletestage
			 */
			var rparam = {
				'custscript_sb142_triggeruser':nlapiGetContext().getUser(),
				'custscript_sb142_pprange':paramPayPeriod,
				'custscript_sb142_deletestage':'OA',
				'custscript_sb142_isdeleteall':'T' //Pass in T to purge ALL elements in Project Time Review as well
			};
			
			nlapiScheduleScript(
				'customscript_ccsw_ss_purgeredistrodata', 
				'customdeploy_ccsw_ss_purgeredistrodata', 
				rparam
			);
			
			//Redirect to THIS suitelet
			var rdparam={
				'custparam_ppfld':paramPayPeriod,
				'custparam_display':'y',
				'custparam_procmsg':'Pay Period queued up for ALL DATA PURGE.'
			};
				
			nlapiSetRedirectURL(
				'SUITELET', 
				nlapiGetContext().getScriptId(),
				nlapiGetContext().getDeploymentId(),
				'VIEW',
				rdparam
			);
		}
		
		//************** Dynamic Saved Search Build to redirect the user **************************************/
		var paramRedirectRec = req.getParameter('custparam_gotors');
		
		if (paramRedirectRec=='adp' || paramRedirectRec=='oa')
		{
			//Grab initialization variables
			var rsflt = null,
				rscol = null,
				rsRecType = '';
			
			if (paramRedirectRec=='adp')
			{
				rsRecType = 'customrecord_adpdataimort';
				
				rsflt = [new nlobjSearchFilter('isinactive', null, 'is', 'F'),
				         new nlobjSearchFilter('custrecord_adpd_paystartdt', null, 'on', payPeriodFrom),
				         new nlobjSearchFilter('custrecord_adpd_payenddt', null, 'on',payPeriodTo)];
				
				rscol = [new nlobjSearchColumn('internalid'),
				         new nlobjSearchColumn('custrecord_adpd_paystartdt').setSort(),
				         new nlobjSearchColumn('custrecord_adpd_payenddt'),
				         new nlobjSearchColumn('custrecord_adpd_procstatus'),
				         new nlobjSearchColumn('custrecord_adpd_procnotes'),
				         new nlobjSearchColumn('custrecord_adpd_empname'),
				         new nlobjSearchColumn('custrecord_adpd_adpempid'),
				         new nlobjSearchColumn('custrecord_adpd_adpacctnumber'),
				         new nlobjSearchColumn('custrecord_adpd_adpmemo'),
				         new nlobjSearchColumn('custrecord_adpd_basepay')];
			}
			else if (paramRedirectRec=='oa')
			{
				
				rsRecType = 'customrecord_oatimesheetdata';
				rsflt = [new nlobjSearchFilter('isinactive', null, 'is', 'F'),
				         new nlobjSearchFilter('custrecord_oatd_timesheetdate', null, 'within', payPeriodFrom, payPeriodTo)];
				
				var rscustColumnSort = new nlobjSearchColumn('formulanumeric');
				rscustColumnSort.setFormula("case when {custrecord_oatd_procstatus}='Error' "+
										  "OR {custrecord_oatd_procstatus}='Invalid' then 0 else 1 end");
				
				rscol = [new nlobjSearchColumn('internalid'),
				         rscustColumnSort.setSort(),
				         new nlobjSearchColumn('custrecord_oatd_timesheetdate').setSort(),
				         new nlobjSearchColumn('custrecord_oatd_procstatus'),
				         new nlobjSearchColumn('custrecord_oatd_procnotes'),
				         new nlobjSearchColumn('custrecord_oatd_oaemployeename'),
				         new nlobjSearchColumn('custrecord_oatd_oaadpfileid'),
				         new nlobjSearchColumn('custrecord_oatd_nsemployee'),
				         new nlobjSearchColumn('custrecord_oatd_oaprojectname'),
				         new nlobjSearchColumn('custrecord_oatd_oaprojectid'),
				         new nlobjSearchColumn('custrecord_oatd_projectref'),
				         new nlobjSearchColumn('custrecord_oatd_oahhmmformat'),
				         new nlobjSearchColumn('custrecord_oatd_oahoursdecimal')];
			}
			
			//Redirect to the search result
			if (rsRecType)
			{
				rsset = nlapiCreateSearch(rsRecType, rsflt, rscol).setRedirectURLToSearchResults();
			}
		}
		
		//************** PROCESS POST REQUEST *****************************************************************/
		if (req.getMethod() == 'POST')
		{
			
			/**
			 * Validation Scheduled Script Info:
			 * Script ID: customscript_ccsw_ss_validateadpoaimport
			 * Script Deployment: customdeploy_ccsw_ss_validateadpoaimport
			 * Parameter:
			 * custscript_sb138_triggeruser
			 * custscript_sb138_pprange
			 * custscript_sb138_valstage
			 */
			var rparam ={
				'custscript_sb138_triggeruser':nlapiGetContext().getUser(),
				'custscript_sb138_pprange':paramPayPeriod,
				'custscript_sb138_valstage':'OA' // Start off with Open Air
			};
			
			var queueStatus = nlapiScheduleScript(
								'customscript_ccsw_ss_validateadpoaimport', 
								'customdeploy_ccsw_ss_validateadpoaimport', 
								rparam
							  );
			
			var rdparam={
				'custparam_ppfld':paramPayPeriod,
				'custparam_display':'y',
				'custparam_procmsg':'Pay Period queued up for data validation and processing'
			};
			
			nlapiSetRedirectURL(
				'SUITELET', 
				'customscript_ccsw_sl_startjlrdproc',
				'customdeploy_ccsw_sl_startjlrdproc',
				'VIEW',
				rdparam
			);
		}
		
		//-------------------------------------- Display Options -----------------------------------------------
		//1. Set up User Filter Options
		nsform.addFieldGroup('custpage_grpa', 'Options & Statuses', null);
		
		//2. Grab list of unique unprocessed pay periods from ADP Data Import table
		//	- These are ones with Process Status of Pending (1), Invalid(3), Error (5)
		var upflt = [new nlobjSearchFilter('custrecord_adpd_procstatus', null, 'anyof', ['1','3','5','@NONE@']),
		             new nlobjSearchFilter('isinactive', null, 'is', 'F')];
		var upcol = [new nlobjSearchColumn('custrecord_adpd_paystartdt', null, 'group'),
		             new nlobjSearchColumn('custrecord_adpd_payenddt', null, 'group').setSort(true)];
		var uprs = nlapiSearchRecord('customrecord_adpdataimort', null, upflt, upcol);
		
		//3. Add Drop list of unique pay periods
		var ppfld = nsform.addField(
						'custpage_ppfld', 
						'select', 
						'Pay Periods', 
						null, 
						'custpage_grpa'
					);
		ppfld.setMandatory(true);
		ppfld.setBreakType('startcol');
		//3 ---- Add in options
		ppfld.addSelectOption('', '', true);
		for (var pp=0; uprs && pp < uprs.length; pp+=1)
		{
			var valueText = uprs[pp].getValue('custrecord_adpd_paystartdt', null, 'group')+
							'-'+
							uprs[pp].getValue('custrecord_adpd_payenddt', null, 'group');
			ppfld.addSelectOption(valueText, valueText, false);
		}
		ppfld.setDefaultValue(paramPayPeriod);
		
		//4. Add in Currently Logged in user information
		var curUserNameFld = nsform.addField('custpage_username', 'text', 'Current User', null, 'custpage_grpa');
		curUserNameFld.setDisplayType('inline');
		curUserNameFld.setBreakType('startcol');
		curUserNameFld.setDefaultValue(nlapiGetContext().getName());
		
		//5. Add in potential instruction
		var instrFld = nsform.addField('custpage_instr','textarea','Instruction', null, 'custpage_grpa');
		instrFld.setDisplayType('inline');
		instrFld.setBreakType('startcol');
		instrFld.setDefaultValue(
			'<b>[Additional Direction NEEDED]</b><br/>'+
			'"Start Data Validation" Button will appear when a Pay Period is ready to be submitted for processing. '+
			'When ALL data loaded is validated, next process start automatically. <br/>'+
			'IF there is a validation in progress for another pay period, you will not see any button appear. <br/>'+
			'You will need to wait until that process ends'
		);
		
		
		var curUserIdFld = nsform.addField('custpage_userid', 'text', 'Current User ID', null, 'custpage_grpa');
		curUserIdFld.setDisplayType('hidden');
		curUserIdFld.setDefaultValue(nlapiGetContext().getUser());
		
		//Add in View Review Project Time 
		var revPrjTimeBtn = nsform.addButton('custpage_rptr','Review Project Time Calculations','navigateToReviewPtr()');
		
		//Add in Refresh Button
		nsform.addButton('custpage_refresh', 'Refresh Window', 'refreshWindow()');
		
		//-------------------------- Display Results with Process button --------------------------------------------
		if (paramPayPeriod && paramDisplayList=='y')
		{
			
			//Grab initialization variables
			var hasTimesheetData = false,
				hasAdpData = false;
			
			//Make sure BOTH dates are set
			if (!payPeriodFrom && !payPeriodTo)
			{
				throw nlapiCreateError(
					'STAGE1-ERR', 
					'Missing both Payeriod Start and End Dates: '+arPayPeriods+
					'. Contact Administrator and make sure both dates are set during the ADP Import', 
					true
				);
			}
			
			//2. Grab list of ALL ADP for this pay periods
			var adpflt = [new nlobjSearchFilter('isinactive', null, 'is', 'F'),
			              new nlobjSearchFilter('custrecord_adpd_paystartdt', null, 'on', payPeriodFrom),
			              new nlobjSearchFilter('custrecord_adpd_payenddt', null, 'on',payPeriodTo)];
			
			var adpcol = [new nlobjSearchColumn('internalid'),
			              new nlobjSearchColumn('custrecord_adpd_paystartdt').setSort(),
			              new nlobjSearchColumn('custrecord_adpd_payenddt'),
			              new nlobjSearchColumn('custrecord_adpd_procstatus'),
			              new nlobjSearchColumn('custrecord_adpd_procnotes'),
			              new nlobjSearchColumn('custrecord_adpd_empname'),
			              new nlobjSearchColumn('custrecord_adpd_adpempid'),
			              new nlobjSearchColumn('custrecord_adpd_adpacctnumber'),
			              new nlobjSearchColumn('custrecord_adpd_adpmemo'),
			              new nlobjSearchColumn('custrecord_adpd_basepay')];
			var adprs = nlapiSearchRecord('customrecord_adpdataimort', null, adpflt, adpcol);
			if (adprs && adprs.length > 0)
			{
				hasAdpData = true;
				
				var adpsl = nsform.addSubList('custpage_adpsl', 'list', 'ADP Data for Pay Period', null),
					adpslline=1;
				
				adpsl.addButton('custpage_adpviewsr', 'View All ADP Import Results', 'navigateToResults(\'adp\')');
				
				adpsl.addField('adpsl_view','textarea','View Import', null);
				adpsl.addField('adpsl_status','text','Status',null);
				adpsl.addField('adpsl_procnote','textarea','Notes',null).setDisplayType('inline');
				adpsl.addField('adpsl_adpmpinfo','textarea','ADP Employee Info',null).setDisplayType('inline');
				adpsl.addField('adpsl_adpotherinfo','textarea','ADP Other Info',null).setDisplayType('inline');
				adpsl.addField('adpsl_pay','currency','Payment Amount',null);
				
				for (var a=0; a < adprs.length; a+=1)
				{
					var viewImportText = '<a href="'+
										 nlapiResolveURL('RECORD', 'customrecord_adpdataimort', adprs[a].getValue('internalid'), 'VIEW')+
										 '" target="_blank">View Record</a>';
					var adpEmpInfoText = adprs[a].getValue('custrecord_adpd_empname')+
										 '(ADP ID: '+
										 adprs[a].getValue('custrecord_adpd_adpempid')+
										 ')';
					
					var adpOtherInfoText = adprs[a].getValue('custrecord_adpd_adpmemo')+
										   '(ADP Account Number: '+
										   adprs[a].getValue('custrecord_adpd_adpacctnumber')+
										   ')';
										
					adpsl.setLineItemValue('adpsl_view', adpslline, viewImportText);
					adpsl.setLineItemValue('adpsl_status', adpslline, adprs[a].getText('custrecord_adpd_procstatus'));
					adpsl.setLineItemValue('adpsl_procnote', adpslline, adprs[a].getValue('custrecord_adpd_procnotes'));
					adpsl.setLineItemValue('adpsl_adpmpinfo', adpslline, adpEmpInfoText);
					adpsl.setLineItemValue('adpsl_adpotherinfo', adpslline, adpOtherInfoText);
					adpsl.setLineItemValue('adpsl_pay', adpslline, adprs[a].getValue('custrecord_adpd_basepay'));
					
					adpslline += 1;
				}
			}
			
			//*****************************************************OPEN AIR***************************************************************
			//1. Grab list of ALL OpenAir Times for this pay periods
			var oaflt = [new nlobjSearchFilter('isinactive', null, 'is', 'F'),
			             new nlobjSearchFilter('custrecord_oatd_timesheetdate', null, 'within', payPeriodFrom, payPeriodTo)];
			
			//for OpenAir, since we are ONLY displaying first 1000 results 
			//	We want to show ANY Error or Invalid rows first
			//	This way, user will be driven to click on the button to VIEW ALL List
			var custColumnSort = new nlobjSearchColumn('formulanumeric');
			custColumnSort.setFormula("case when {custrecord_oatd_procstatus}='Error' "+
									  "OR {custrecord_oatd_procstatus}='Invalid' then 0 else 1 end");
			
			var oacol = [new nlobjSearchColumn('internalid'),
			             custColumnSort.setSort(),
			             new nlobjSearchColumn('custrecord_oatd_timesheetdate').setSort(),
			             new nlobjSearchColumn('custrecord_oatd_procstatus'),
			             new nlobjSearchColumn('custrecord_oatd_procnotes'),
			             new nlobjSearchColumn('custrecord_oatd_oaemployeename'),
			             new nlobjSearchColumn('custrecord_oatd_oaadpfileid'),
			             //new nlobjSearchColumn('custrecord_oatd_nsemployee'),
			             new nlobjSearchColumn('custrecord_oatd_oaprojectname'),
			             new nlobjSearchColumn('custrecord_oatd_oaprojectid'),
			             //new nlobjSearchColumn('custrecord_oatd_projectref'),
			             new nlobjSearchColumn('custrecord_oatd_oahhmmformat'),
			             new nlobjSearchColumn('custrecord_oatd_oahoursdecimal')];
			var oars = nlapiSearchRecord('customrecord_oatimesheetdata', null, oaflt, oacol);
			if (oars && oars.length > 0)
			{
				hasTimesheetData = true;
				
				var timesl = nsform.addSubList('custpage_timesl', 'list', 'OpenAir Timesheet Data for Pay Period', null),
					timeslline=1;
				
				timesl.addButton('custpage_adpviewsr', 'View All OpenAir Import Results', 'navigateToResults(\'oa\')');
				
				timesl.addField('timesl_view','textarea','View Import', null);
				timesl.addField('timesl_date', 'date', 'Timesheet Date', null);
				timesl.addField('timesl_status','text','Status',null);
				timesl.addField('timesl_procnote','textarea','Notes',null).setDisplayType('inline');
				timesl.addField('timesl_oaempinfo','textarea','OpenAir Employee Info',null).setDisplayType('inline');
				timesl.addField('timesl_oajobinfo','textarea','OpenAir Project Info',null).setDisplayType('inline');
				timesl.addField('timesl_durationstring','text','Duration HH:MM', null);
				timesl.addField('timesl_durationdecimal','float','Duration',null);
				
				for (var t=0; t < oars.length; t+=1)
				{
					var viewImportText = '<a href="'+
										 nlapiResolveURL('RECORD', 'customrecord_oatimesheetdata', oars[t].getValue('internalid'), 'VIEW')+
										 '" target="_blank">View Record</a>';
					var oaEmpInfoText = oars[t].getValue('custrecord_oatd_oaemployeename')+
										'(ADP ID: '+
										oars[t].getValue('custrecord_oatd_oaadpfileid')+
										')';
					var oaJobInfoText = oars[t].getValue('custrecord_oatd_oaprojectname')+
										'(NS ID: '+
										oars[t].getValue('custrecord_oatd_oaprojectid')+
										')';
										
					timesl.setLineItemValue('timesl_view', timeslline, viewImportText);
					timesl.setLineItemValue('timesl_date', timeslline, oars[t].getValue('custrecord_oatd_timesheetdate'));
					timesl.setLineItemValue('timesl_status', timeslline, oars[t].getText('custrecord_oatd_procstatus'));
					timesl.setLineItemValue('timesl_procnote', timeslline, oars[t].getValue('custrecord_oatd_procnotes'));
					timesl.setLineItemValue('timesl_oaempinfo', timeslline, oaEmpInfoText);
					timesl.setLineItemValue('timesl_oajobinfo', timeslline, oaJobInfoText);
					timesl.setLineItemValue('timesl_durationstring', timeslline, oars[t].getValue('custrecord_oatd_oahhmmformat'));
					timesl.setLineItemValue('timesl_durationdecimal', timeslline, oars[t].getValue('custrecord_oatd_oahoursdecimal'));
					
					timeslline += 1;
				}
			}
			
			
			
			//**************** Search to see if there are any isntance of validation running *******************************/
			/**
			 * Validation Scheduled Script Info:
			 * Script ID: customscript_ccsw_ss_validateadpoaimport
			 * Script Deployment: customdeploy_ccsw_ss_validateadpoaimport
			 * Parameter:
			 * custscript_sb138_triggeruser
			 * custscript_sb138_pprange
			 * custscript_sb138_valstage
			 */
			//Search for availability of Script deployment
			var sctdplStatus = 'Available';
			
			var sdrflt = [
			               	['status','noneof',['COMPLETE','FAILED']],
			               	'AND',
			               	[
			               	 	['scriptdeployment.scriptid','is','customdeploy_ccsw_ss_validateadpoaimport'],
			               	 	'OR',
			               	 	['scriptdeployment.scriptid','is','customdeploy_ccsw_ss_purgeredistrodata']
			               	]
			              ];
			
			var sdcol = [new nlobjSearchColumn('status')];
		
			var sdrrs = nlapiSearchRecord('scheduledscriptinstance', null, sdrflt, sdcol);
			if (sdrrs && sdrrs.length > 0) {
				sctdplStatus = sdrrs[0].getValue('status');
			}
			
			//If Available, provide submit button
			
			//Add in Delete ALL button here
			//Delete ALL THIS Pay Period Data ONLY
			var deleteAllBtn = nsform.addButton('custpage_deleteallppdata', 'Delete ALL Pay Period Data', 'executeDeleteAllPayPeriod()');
			
			if (sctdplStatus=='Available')
			{
				nsform.addSubmitButton('Start Data Validation');
				//Clear out the error message field
				errmsg.setDefaultValue('');
				
			} 
			else
			{
				deleteAllBtn.setDisabled(true);
				deleteAllBtn.setLabel('N/A or In Progress...');
				
				//12/4/2015 - request to disable Review Project Time Calculation button when it's in progress
				revPrjTimeBtn.setDisabled(true);
			}
			
		}//End Display Result
		
	}
	catch (err)
	{
		log('error','Error Processing',getErrText(err));
		errmsg.setDefaultValue(
			'<div style="color:red; font-weight:bold; font-size: 14px">'+
			'Error occured while processing your request:<br/>'+
			getErrText(err)+
			'</div>'
		);
	}
	
	res.writePage(nsform);
}

/**************** Client Scripts *********************/

function executeDeleteAllPayPeriod()
{
	var confirmMessage = 'WARNING PLEASE CONFIRM!!\n\n'+
						 'This action will delete ALL data elements relating to '+
						 nlapiGetFieldValue('custpage_ppfld')+
						 ' Pay Periods. \n\n'+
						 'These includes data from ADP Import, OpenAir Import and Project Time Review custom records. \n\n'+
						 'Journal Entries already processed MUST BE MANUALLY reversed or deleted. \n\n'+
						 'Would you like to continue?';
	if (!confirm(confirmMessage))
	{
		return;
	}
	
	var slUrl = nlapiResolveURL(
			'SUITELET', 
			'customscript_ccsw_sl_startjlrdproc', 
			'customdeploy_ccsw_sl_startjlrdproc', 
			'VIEW');
	slUrl += '&custpage_ppfld='+nlapiGetFieldValue('custpage_ppfld')+
		 	 '&custparam_deleteall=y';
	
	window.ischanged = false;
	window.location = slUrl;
	
}


function stage1FldChanged(type, name, linenum)
{
	if (name=='custpage_ppfld' && nlapiGetFieldValue(name))
	{
		var slUrl = nlapiResolveURL(
						'SUITELET', 
						'customscript_ccsw_sl_startjlrdproc', 
						'customdeploy_ccsw_sl_startjlrdproc', 
						'VIEW');
		slUrl += '&custpage_ppfld='+nlapiGetFieldValue('custpage_ppfld')+
				 '&custparam_display=y';

		window.ischanged = false;
		window.location = slUrl;
	}
}

function navigateToReviewPtr()
{
	var sl2Url = nlapiResolveURL(
					'SUITELET',
					'customscript_ccsw_sl_vad_ptr',
					'customdeploy_ccsw_sl_vad_ptr',
					'VIEW'
				 );
	
	//If There is a value on the drop down, send it as well
	if (nlapiGetFieldValue('custpage_ppfld'))
	{
		sl2Url += '&custpage_ppfld='+nlapiGetFieldValue('custpage_ppfld')+
				  '&custparam_display=y';
	}
	
	window.ischanged = false;
	window.location = sl2Url;
	
}

//Open THIS Suitelet is NEW window and have it navigate to Search Results
function navigateToResults(_rec)
{
	if (!nlapiGetFieldValue('custpage_ppfld'))
	{
		alert('You must select pay period first');
		return;
	}

	if (!_rec || (_rec!='adp' && _rec!='oa'))
	{
		alert('Require proper record  type to point to');
		return;
	}
	
	var rsUrl = nlapiResolveURL(
			'SUITELET', 
			'customscript_ccsw_sl_startjlrdproc', 
			'customdeploy_ccsw_sl_startjlrdproc', 
			'VIEW');
	
	rsUrl += '&custpage_ppfld='+nlapiGetFieldValue('custpage_ppfld')+
		 	 '&custparam_gotors='+_rec;
	
	window.open(
		rsUrl, 
		'Import_RESULTS', 
		'height=900, width=1200'
	);
}

function refreshWindow()
{
	window.ischanged = false;
	window.location = window.location.href;
}
