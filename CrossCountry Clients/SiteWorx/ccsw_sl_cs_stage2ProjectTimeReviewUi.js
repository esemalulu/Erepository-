/**
 * This Suitelet is designed to be Review approving processor for calculated records.
 * UI display will give the users ability to choose unapproved pay period and the 
 * ability to approve all, approve few or DELETE/Purge ALL and start over
 * 
 * Version    Date            Author           Remarks
 * 1.00       20 Oct 2015     json
 *
 */

var statusmap={
	'Pending':'1',
	'Approve':'6',
	'Validated':'2',
	'Invalid':'3',
	'Completed':'4',
	'Error':'5',
	'PendingApproval':'7'
}; 

/**
 * @param {nlobjRequest} request Request object
 * @param {nlobjResponse} response Response object
 * @returns {Void} Any output is written via response object
 */
function stage2PrjTimeRevController(req, res){

	var nsform = nlapiCreateForm('Project Time Review Controller', false);
	nsform.setScript('customscript_ccsw_cs_radcalcprjtimehelp');
	
	var errmsg = nsform.addField('custpage_msgfld', 'inlinehtml', '', null, null);
	errmsg.setLayoutType('outsideabove', null);
	
	try
	{
		var paramPayPeriod = req.getParameter('custpage_ppfld');
		if (!paramPayPeriod)
		{
			paramPayPeriod = req.getParameter('custparam_ppfld');
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
		
		//************** PROCESS POST REQUEST *****************************************************************/
		if (req.getMethod() == 'POST')
		{
			
			/**
			 * Process Journal Entry Generation
			 * Script ID: customscript_ccsw_ss_genredistroje
			 * Script Deployment: customdeploy_ccsw_ss_genredistroje
			 * Parameter:
			 * custscript_sb143_triggeruser
			 * custscript_sb143_pprange
			 */
			var rparam = {
				'custscript_sb143_triggeruser':nlapiGetContext().getUser(),
				'custscript_sb143_pprange':paramPayPeriod
			};
			
			nlapiScheduleScript(
				'customscript_ccsw_ss_genredistroje', 
				'customdeploy_ccsw_ss_genredistroje', 
				rparam
			);
			
			//Redirect to THIS suitelet
			var rdparam={
				'custparam_ppfld':paramPayPeriod,
				'custparam_display':'y',
				'custparam_procmsg':'Pay Period queued up for Journal Entry Creation Process'
			};
				
			nlapiSetRedirectURL(
				'SUITELET', 
				nlapiGetContext().getScriptId(),
				nlapiGetContext().getDeploymentId(),
				'VIEW',
				rdparam
			);
			
		}
		
		//-------------------------------------- Display Options -----------------------------------------------
		//1. Set up User Filter Options
		nsform.addFieldGroup('custpage_grpa', 'Options', null);
		
		//2. Grab list of unique ALL pay periods from Project Time Review table
		//	- These are ones with Process Status of Pending Approval, Error
		var upflt = [new nlobjSearchFilter('isinactive', null, 'is', 'F')];
		var upcol = [new nlobjSearchColumn('custrecord_ptr_paystartdt', null, 'group'),
		             new nlobjSearchColumn('custrecord_ptr_payenddt', null, 'group').setSort(true)];
		
		var uprs = nlapiSearchRecord('customrecord_projecttimereview', null, upflt, upcol);
		
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
			var valueText = uprs[pp].getValue('custrecord_ptr_paystartdt', null, 'group')+
							'-'+
							uprs[pp].getValue('custrecord_ptr_payenddt', null, 'group');
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
			'<b>[Additional Direction NEEDED]</b><br/>'
		);
		
		var curUserIdFld = nsform.addField('custpage_userid', 'text', 'Current User ID', null, 'custpage_grpa');
		curUserIdFld.setDisplayType('hidden');
		curUserIdFld.setDefaultValue(nlapiGetContext().getUser());
		
		//-------------------------- Display Results with Process button --------------------------------------------
		if (paramPayPeriod && paramDisplayList=='y')
		{
			
			//Grab initialization variables
			var arPayPeriods = paramPayPeriod.split('-'),
				payPeriodFrom = strTrim(arPayPeriods[0]),
				payPeriodTo = strTrim(arPayPeriods[1]);
			
			//Make sure BOTH dates are set
			if (!payPeriodFrom && !payPeriodTo)
			{
				throw nlapiCreateError(
					'STAGE2-ERR', 
					'Missing both Payeriod Start and End Dates: '+arPayPeriods+
					'. Contact Administrator.', 
					true
				);
			}
			
			var ptrflt = [new nlobjSearchFilter('isinactive', null, 'is', 'F'),
			              new nlobjSearchFilter('custrecord_ptr_paystartdt', null, 'on', payPeriodFrom),
			              new nlobjSearchFilter('custrecord_ptr_payenddt', null, 'on', payPeriodTo)];
			
			var ptrcol = [new nlobjSearchColumn('internalid'),
			              new nlobjSearchColumn('custrecord_ptr_procstatus'),
			              new nlobjSearchColumn('custrecord_ptr_procnotes'),
			              new nlobjSearchColumn('custrecord_ptr_journalentrydt').setSort(),
			              new nlobjSearchColumn('custrecord_ptr_employee').setSort(),
			              new nlobjSearchColumn('custrecord_ptr_project'),
			              new nlobjSearchColumn('custrecord_ptr_empdepartment'),
			              new nlobjSearchColumn('custrecord_ptr_projectclass'),
			              new nlobjSearchColumn('custrecord_ptr_emplocation'),
			              new nlobjSearchColumn('custrecord_ptr_account'),
			              new nlobjSearchColumn('custrecord_ptr_totalhoursworked'),
			              new nlobjSearchColumn('custrecord_ptr_totalbasepay'),
			              new nlobjSearchColumn('custrecord_ptr_hoursworked'),
			              new nlobjSearchColumn('custrecord_ptr_payhourlyrate'),
			              new nlobjSearchColumn('custrecord_ptr_payextendedamt'),
			              new nlobjSearchColumn('custrecord_ptr_jerefinfo')];
			
			//Create search to grab EVERY Possible Records
			var ptrsObj = nlapiCreateSearch('customrecord_projecttimereview', ptrflt, ptrcol);
			var ptrRss = ptrsObj.runSearch();
			//Total List of ALL Project Time Review Results for THIS Pay Period
			var ptrrslist = [];
			//Flag to indicate there are records marked as Pending Approval OR ERROR
			var hasItemsToProcess = false;
		    //flag for while loop
		    var crscnt = 1000;
		    var cnextStartIndex = 0;
		    var cnextEndIndex = 1000;
		    //Run while loop to grab ALL results. 
		    while (crscnt==1000) {
		    	log('debug','size',ptrRss.getResults(cnextStartIndex, cnextEndIndex).length);
		    	ptrrslist = ptrrslist.concat(ptrRss.getResults(cnextStartIndex, cnextEndIndex));
		    	
		    	crscnt = ptrRss.length;
		    	cnextStartIndex = cnextEndIndex;
		    	cnextEndIndex = cnextEndIndex + 1000;
		    }
			log('debug','size of ptrrslist',ptrrslist.length);
		    var ptrsl = nsform.addSubList('custpage_ptrsl', 'list', 'Project Time Review for Pay Period '+paramPayPeriod, null),
			ptrslline=1;
		
		    ptrsl.addMarkAllButtons();
		    
		    ptrsl.addField('ptrsl_approve', 'checkbox', 'Approve', null);
		    ptrsl.addField('ptrsl_rowid','text','Row Internal ID', null).setDisplayType('hidden');
		    ptrsl.addField('ptrsl_view','textarea','View Details', null);
			ptrsl.addField('ptrsl_status','text','Status',null);
			ptrsl.addField('ptrsl_statusid','text','Status ID', null).setDisplayType('hidden');
			ptrsl.addField('ptrsl_procnote','textarea','Notes',null).setDisplayType('inline');
			ptrsl.addField('ptrsl_journaldate','date','Journal Date',null);
			ptrsl.addField('ptrsl_emp','text','Employee',null).setDisplayType('inline');
			ptrsl.addField('ptrsl_prj','text','Project',null).setDisplayType('inline');
			ptrsl.addField('ptrsl_empinfo','textarea','Related Info',null).setDisplayType('inline');
			ptrsl.addField('ptrsl_prjhours','float','Project Hours',null);
			ptrsl.addField('ptrsl_hourlyamt','currency','Hourly Rate',null);
			ptrsl.addField('ptrsl_journalamt','currency','Journal Entry',null);
			ptrsl.addField('ptrsl_jeref','select','Created JE Ref','transaction').setDisplayType('inline');
			
			for (var p=0; p < ptrrslist.length; p+=1)
			{
				var statusValue = ptrrslist[p].getValue('custrecord_ptr_procstatus');
				//Indicate IF there are items to process
				if (!hasItemsToProcess && (statusValue == statusmap.PendingApproval || statusValue == statusmap.Error))
				{
					hasItemsToProcess = true;
				}
				
				var viewCalcRecText = '<a href="'+
									  nlapiResolveURL('RECORD', 'customrecord_projecttimereview', ptrrslist[p].getValue('internalid'), 'VIEW')+
									  '" target="_blank">View Record</a>';
				
				var classificationInfo = '<b>Location:</b> '+
										 ptrrslist[p].getText('custrecord_ptr_emplocation')+
										 '<br/>'+
										 '<b>Department: </b>'+
										 ptrrslist[p].getText('custrecord_ptr_empdepartment')+
										 '<br/>'+
										 '<b>Class:</b> '+
										 ptrrslist[p].getText('custrecord_ptr_projectclass')+
										 '<br/>'+
										 '<b>Total Hours:</b> '+
										 ptrrslist[p].getValue('custrecord_ptr_totalhoursworked')+
										 '<br/>'+
										 '<b>Total Payment:</b> '+
										 ptrrslist[p].getValue('custrecord_ptr_totalbasepay');
										   
				
				var projectText = ptrrslist[p].getText('custrecord_ptr_project');
				if (projectText)
				{
					projectText = projectText.replace(' : ','<br/> - ');
				}
				
				ptrsl.setLineItemValue('ptrsl_jeref', ptrslline, ptrrslist[p].getValue('custrecord_ptr_jerefinfo'));
				ptrsl.setLineItemValue('ptrsl_rowid', ptrslline, ptrrslist[p].getValue('internalid'));
				ptrsl.setLineItemValue('ptrsl_view', ptrslline, viewCalcRecText);
				ptrsl.setLineItemValue('ptrsl_status', ptrslline, ptrrslist[p].getText('custrecord_ptr_procstatus'));
				ptrsl.setLineItemValue('ptrsl_statusid', ptrslline, statusValue);
				ptrsl.setLineItemValue('ptrsl_procnote', ptrslline, ptrrslist[p].getValue('custrecord_ptr_procnotes'));
				ptrsl.setLineItemValue('ptrsl_journaldate', ptrslline, ptrrslist[p].getValue('custrecord_ptr_journalentrydt'));
				ptrsl.setLineItemValue('ptrsl_emp', ptrslline, ptrrslist[p].getText('custrecord_ptr_employee'));
				ptrsl.setLineItemValue('ptrsl_prj', ptrslline, projectText);
				ptrsl.setLineItemValue('ptrsl_empinfo', ptrslline, classificationInfo);
				ptrsl.setLineItemValue('ptrsl_prjhours', ptrslline, ptrrslist[p].getValue('custrecord_ptr_hoursworked'));
				ptrsl.setLineItemValue('ptrsl_hourlyamt', ptrslline, ptrrslist[p].getValue('custrecord_ptr_payhourlyrate'));
				ptrsl.setLineItemValue('ptrsl_journalamt', ptrslline, ptrrslist[p].getValue('custrecord_ptr_payextendedamt'));
				
				log(
					'debug',
					'Redistro Amount',
					ptrrslist[p].getValue('custrecord_ptr_payextendedamt')
				);
				
				ptrslline += 1;
			}
		    
			//**************** Search to see if there are any isntance of validation running *******************************/
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
			
			//Search for availability of Submit for Approval
			//For this one, you want to check for execution of 
			//customdeploy_ccsw_ss_procinitredistro 
			//OR
			//customdeploy_ccsw_ss_genredistroje
			//OR
			//customdeploy_ccsw_ss_purgeredistrodata
			//If Available, provide submit button
			
			var otherSctDplStatus = 'Available';
			
			var osdrflt = [
			               	['status','noneof',['COMPLETE','FAILED']],
			               	'AND',
			               	[
			               	 	['scriptdeployment.scriptid','is','customdeploy_ccsw_ss_procinitredistro'],
			               	 	'OR',
			               	 	['scriptdeployment.scriptid','is','customdeploy_ccsw_ss_genredistroje'],
			               	 	'OR',
			               	 	['scriptdeployment.scriptid','is','customdeploy_ccsw_ss_purgeredistrodata']
			               	]
			              ];
			
			var osdcol = [new nlobjSearchColumn('status')];
		
			var osdrrs = nlapiSearchRecord('scheduledscriptinstance', null, osdrflt, osdcol);
			if (osdrrs && osdrrs.length > 0) {
				otherSctDplStatus = osdrrs[0].getValue('status');
			}
			
			//Add Submit Button and delete all 
			if (ptrrslist.length > 0)
			{
				//Delete ALL THIS Pay Period Data ONLY
				var deleteAllBtn = nsform.addButton('custpage_deleteallppdata', 'Delete ALL Pay Period Data', 'executeDeleteAllPayPeriod()');
				
				//ONLY display submit button IF 
				// - there are items to process
				// - Approval Process OR Distribution process isn't Running
				// - Delete/Purge Process isn't running
				if (hasItemsToProcess && otherSctDplStatus=='Available')
				{
					//Submit button
					nsform.addSubmitButton('Process Approval');
					errmsg.setDefaultValue('');
				}
				
				if (otherSctDplStatus !='Available')
				{
					deleteAllBtn.setDisabled(true);
					deleteAllBtn.setLabel('Approval in Progress...');
				}
				
			}
			
			//Add Refresh Button
			nsform.addButton('custpage_refresh', 'Refresh Window', 'refreshWindow()');
			
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
function stage2PageInit()
{
	//Disable the field from being checked
	for (var al=1; al <= nlapiGetLineItemCount('custpage_ptrsl'); al+=1)
	{
		//If already invited, disable the field
		if (nlapiGetLineItemValue('custpage_ptrsl','ptrsl_statusid', al) == statusmap.Completed ||
			nlapiGetLineItemValue('custpage_ptrsl','ptrsl_statusid', al) == statusmap.Approve)
		{
			//Disable Invite
			nlapiSetLineItemDisabled('custpage_ptrsl','ptrsl_approve',true,al);
		}
	}
}

function stage2Save()
{
	
	//Go through make sure atleast ONE line item is marked to be processed as approved
	var linecnt = nlapiGetLineItemCount('custpage_ptrsl');
	
	var hasUnchecked = false;
	for (var i=1; i <= linecnt; i+=1)
	{
		if (nlapiGetLineItemValue('custpage_ptrsl','ptrsl_approve', i) != 'T')
		{
			hasUnchecked = true;
		}
	}
	
	if (hasUnchecked)
	{
		alert('All row must be approved before processing.');
		return false;
	}
	
	return true;
}

function stage2FldChanged(type, name, linenum)
{
	if (name=='custpage_ppfld' && nlapiGetFieldValue(name))
	{
		var slUrl = nlapiResolveURL(
						'SUITELET', 
						'customscript_ccsw_sl_vad_ptr', 
						'customdeploy_ccsw_sl_vad_ptr', 
						'VIEW');
		slUrl += '&custpage_ppfld='+nlapiGetFieldValue('custpage_ppfld')+
				 '&custparam_display=y';

		window.ischanged = false;
		window.location = slUrl;
	}
}


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
			'customscript_ccsw_sl_vad_ptr', 
			'customdeploy_ccsw_sl_vad_ptr', 
			'VIEW');
	slUrl += '&custpage_ppfld='+nlapiGetFieldValue('custpage_ppfld')+
		 	 '&custparam_deleteall=y';
	
	window.ischanged = false;
	window.location = slUrl;
	
}

function refreshWindow()
{
	window.ischanged = false;
	window.location = window.location.href;
}
