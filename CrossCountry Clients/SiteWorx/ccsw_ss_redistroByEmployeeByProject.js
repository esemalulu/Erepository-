/**
 * Core of redistribution processor. This scheduled script will execute for each employee within the pay period and calculate distribution by project. 
 * 
 * 
 * Version    Date            Author           Remarks
 * 1.00       16 Oct 2015     json
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


function executeRedistroCalc(type) {

	//These two parameters are passed in by Run Controller
	//Employee ID
	var paramTriggerUser = nlapiGetContext().getSetting('SCRIPT','custscript_sb139_triggeruser');
	//String value format: [Start Date]-[End Date]
	var paramPayPeriodRange = nlapiGetContext().getSetting('SCRIPT','custscript_sb139_pprange');
	//Last Processed ID
	var paramLastProcId = nlapiGetContext().getSetting('SCRIPT','custscript_sb139_lastprocid');
	
	
	if (!paramTriggerUser || !paramPayPeriodRange)
	{
		//throw script terminating error WITH notification to ALL default notifier set on script.
		throw nlapiCreateError(
			'REDISTROCALC-ERR', 
			'Both Triggering User and Pay Period Range values are required.', 
			false
		);
	}
	
	var arPayPeriods = paramPayPeriodRange.split('-');
		ppFromDate = arPayPeriods[0],
		ppFromDateObj = nlapiStringToDate(ppFromDate),
		ppEndDate = arPayPeriods[1],
		ppEndDateObj = nlapiStringToDate(ppEndDate),
		isRescheduled = false,
		//Below ppCross1 and ppCross2 date ranges will ONLY populate if it is Cross Month
		isCrossMonths = false,
		ppCross1FromDate = '', 
		ppCross1ToDate='',
		ppCross2FromDate = '',
		ppCross2ToDate = '';
		
	//Make sure value exists for both 
	if (!ppFromDate || !ppEndDate)
	{
		throw nlapiCreateError(
			'REDISTROCALC-ERR', 
			'Pay period range passed in failed validation. Unable to break "'+paramPayPeriodRange+'" down using - character.', 
			false
		);
	}
	
	//--------------- Need to identify of Pay period is cross month or not ------------------
	
	if (ppFromDateObj.getMonth() != ppEndDateObj.getMonth())
	{
		isCrossMonths = true;
		//Since this is cross month, we need to identify start and end dates of EACH Month
		
		//First date of crossed month is important to calculate end and beginning of each crossed months
		var firstDateOfCrossedMonthObj = new Date( (ppEndDateObj.getMonth() + 1)+'/1/'+ppEndDateObj.getFullYear() );
		//ppCross1 calculation. 
		//	- Set ppCross1FromDate to ppFromDate
		ppCross1FromDate = ppFromDate;
		//	- ppCross1ToDate is calculated by gett first day of the crossed over month and subtracting one day.
		ppCross1ToDate = nlapiDateToString(nlapiAddDays(firstDateOfCrossedMonthObj, -1));
		
		//ppCross2 calculation. 
		//	- Set ppCross2ToDate to ppEndDate
		ppCross2ToDate = ppEndDate;
		//	- ppCross2FromDate is calculated as first day of crossed over month.
		ppCross2FromDate = nlapiDateToString(firstDateOfCrossedMonthObj);
		
	}
	
	
	//--------------- Ready To Start Processing. --------------------------------------------/
	//1. Grab list of ALL ADP for this pay periods that are in Validated or Error status
	var adpflt = [new nlobjSearchFilter('isinactive', null, 'is', 'F'),
	              new nlobjSearchFilter('custrecord_adpd_procstatus', null, 'anyof', [statusmap.Validated, statusmap.Error]),
	              new nlobjSearchFilter('custrecord_adpd_paystartdt', null, 'on', ppFromDate),
	              new nlobjSearchFilter('custrecord_adpd_payenddt', null, 'on',ppEndDate)];
	
	if (paramLastProcId)
	{
		adpflt.push(new nlobjSearchFilter('internalidnumber', null, 'lessthan', paramLastProcId));
	}
	
	var adpcol = [new nlobjSearchColumn('internalid').setSort(true),
	              new nlobjSearchColumn('custrecord_adpd_procstatus'),
	              new nlobjSearchColumn('custrecord_adpd_nsemployee'),
	              new nlobjSearchColumn('custrecord_adpd_empname'),
	              new nlobjSearchColumn('custrecord_adpd_adpempid'),
	              new nlobjSearchColumn('custrecord_adpd_basepay')];
	var adprs = nlapiSearchRecord('customrecord_adpdataimort', null, adpflt, adpcol);
	
	//Loop through each ADP data and process them
	/**
	 * THIS ASSUME there are ONLY ONE row of data per each employees.
	 */
	for (var a=0; adprs && a < adprs.length; a+=1)
	{
		var procStatus = '',
			procNotes = '',
			oars = null,
			rowjson = {
				'id':adprs[a].getValue('internalid'),
				'nsempid':adprs[a].getValue('custrecord_adpd_nsemployee'),
				'status':adprs[a].getValue('custrecord_adpd_procstatus'),
				'empname':adprs[a].getValue('custrecord_adpd_empname'),
				'adpempid':adprs[a].getValue('custrecord_adpd_adpempid'),
				'payamount':adprs[a].getValue('custrecord_adpd_basepay')
			};
		try 
		{
			//ADP Record Validation.
			if (!rowjson.payamount)
			{
				throw nlapiCreateError(
					'REDISTRO-ERR', 
					'Missing pay amount for this employee', 
					true
				);
			}
			
			if (!rowjson.nsempid)
			{
				throw nlapiCreateError(
					'REDISTRO-ERR', 
					'Missing NetSuite Employee reference', 
					true
				);
			}
				
			//1. Grab ALL Time Entries for THIS Employee from OpenAir Import
			var oaflt = [new nlobjSearchFilter('isinactive', null, 'is','F'),
			             new nlobjSearchFilter('custrecord_oatd_nsemployee', null, 'anyof',rowjson.nsempid),
			             new nlobjSearchFilter('custrecord_oatd_timesheetdate', null, 'within', ppFromDate, ppEndDate)];
			
			var oacol = [new nlobjSearchColumn('internalid'),
			             new nlobjSearchColumn('custrecord_oatd_timesheetdate').setSort(),
			             new nlobjSearchColumn('custrecord_oatd_procstatus'),
			             new nlobjSearchColumn('custrecord_oatd_nsemployee'),
			             new nlobjSearchColumn('department','custrecord_oatd_nsemployee'),
			             new nlobjSearchColumn('location','custrecord_oatd_nsemployee'),
			             new nlobjSearchColumn('custrecord_oatd_projectref'),
			             new nlobjSearchColumn('custentity_projclass','custrecord_oatd_projectref'),
			             new nlobjSearchColumn('custrecord_oatd_oahoursdecimal')];
			
			//We ASSUME each employee will NOT have 1000 rows of time sheet entry per pay period
			oars = nlapiSearchRecord('customrecord_oatimesheetdata', null, oaflt, oacol);
			
			if (!oars)
			{
				throw nlapiCreateError(
					'REDISTRO-ERR', 
					'Missing OpenAir timesheet entry for time period', 
					true
				);
			}
			
			var oajson = {
				'totalhours':0.0,
				'totalpay':parseFloat(rowjson.payamount),
				'hourlyrate':0.0,
				'empdepartment':'',
				'emplocation':'',
				//10/23/2015 - Using Payroll Account defined on Employees' Home Department
				'empdeptpayrollid':'',
				//entries represents number of journal entries it must do depending on cross month or not
				//{
				//	[entry date]:
				//	{
				//		[projectId]:
				//		{
				//			'totalhouse':0.0,
				//			'projectclass':''
				//		},
				//		...
				//	},
				//	...				
				'entries':{}
			};
			
			//Add in Journal Entry Date element
			if (isCrossMonths)
			{
				oajson['entries'][ppCross1ToDate] = {};
				oajson['entries'][ppCross2ToDate] = {};
			}
			else
			{
				oajson['entries'][ppEndDate] = {};
			}
			
			//2. Loop through each results and populate oajson to get total before processing
			//	 if an invalid status is encountered, missing hours, missing project, missing payroll account on project, it will throw an error for this ADP row data
			//	 to Keep processing logic simple, STEP 2 loop is intended to find out totals and hourly rate
			for (var oa=0; oa < oars.length; oa+=1)
			{
				//Step 2 Validation - Project Validation
				if (!oars[oa].getValue('custrecord_oatd_projectref'))
				{
					throw nlapiCreateError(
						'REDISTRO-ERR', 
						'Missing NetSuite Project reference', 
						true
					);
				}
				
				//Setp 2 Validation - Project class validation
				if (!oars[oa].getValue('custentity_projclass','custrecord_oatd_projectref'))
				{
					throw nlapiCreateError(
						'REDISTRO-ERR', 
						'Missing Project Class reference on the project', 
						true
					);
				}
				
				//Setp 2 Validation - Hour validation
				if (!oars[oa].getValue('custrecord_oatd_oahoursdecimal'))
				{
					throw nlapiCreateError(
						'REDISTRO-ERR', 
						'Missing hour value for '+
							oars[oa].getValue('custrecord_oatd_timesheetdate')+
							' time entry', 
						true
					);
				}
				
				//Setp 2 Validation - OpenAir validation status MUST be VALIDATED
				if (oars[oa].getValue('custrecord_oatd_procstatus') != statusmap.Validated)
				{
					throw nlapiCreateError(
						'REDISTRO-ERR', 
						'Status of OpenAir time entry is not Validated. '+
							'(Internal ID of status is: '+
							oars[oa].getValue('custrecord_oatd_procstatus')+
							')', 
						true
					);
				}
				
				//Setp 2 Validation - Department payroll account validation
				//custrecord_oatd_nsemployee
				var empflt = [new nlobjSearchFilter('internalid', null, 'anyof', oars[oa].getValue('custrecord_oatd_nsemployee'))];
				var empcol = [new nlobjSearchColumn('custrecord_payrollacct','department')];
				var emprs = nlapiSearchRecord('employee', null, empflt, empcol);
				//look for payroll account on employee department
				if (!emprs || !emprs[0].getValue('custrecord_payrollacct','department'))
				{
					throw nlapiCreateError(
						'REDISTRO-ERR', 
						'Missing Payroll account reference on employee department ('+
							oars[oa].getText('department','custrecord_oatd_nsemployee')+
							')', 
						true
					);
				}
				
				//-------------------- OK To Project THIS Time Sheet Entry ---------------------------------------
				var prjId = oars[oa].getValue('custrecord_oatd_projectref'),
					prjHours = oars[oa].getValue('custrecord_oatd_oahoursdecimal'),
					prjClass = oars[oa].getValue('custentity_projclass','custrecord_oatd_projectref'),
					empDeptPayrollId = emprs[0].getValue('custrecord_payrollacct','department'),
					empDept = oars[oa].getValue('department','custrecord_oatd_nsemployee'),
					empLoc = oars[oa].getValue('location','custrecord_oatd_nsemployee'),
					timeDateObj = nlapiStringToDate(oars[oa].getValue('custrecord_oatd_timesheetdate'));
				
				//All passes add them all up
				oajson.totalhours = parseFloat(oajson.totalhours) + 
									parseFloat(prjHours);
				
				//Add in other variables
				oajson.empdepartment = empDept;
				oajson.emplocation = empLoc;
				oajson.empdeptpayrollid = empDeptPayrollId;
				
				var defaultJsonEntryDate = '';
				if (isCrossMonths)
				{
					//IF it's cross month, identify WHERE to put these hours
					//	Default it to first leg 
					defaultJsonEntryDate = ppCross1ToDate;
					if (timeDateObj > nlapiStringToDate(ppCross1ToDate))
					{
						//Timesheet date falls on the next month
						defaultJsonEntryDate = ppCross2ToDate;
					}
				}
				else
				{
					//This is NOT cross month, 
					//	Set the entry date as end of THIS pay period
					defaultJsonEntryDate = ppEndDate;
				}
				
				//Add to the oajson object
				if (!oajson['entries'][defaultJsonEntryDate][prjId])
				{
					oajson['entries'][defaultJsonEntryDate][prjId] = {
						'projectclass':prjClass,
						'totalhours':0.0
					};
				}
				//Add up the hours
				oajson['entries'][defaultJsonEntryDate][prjId]['totalhours'] = parseFloat(oajson['entries'][defaultJsonEntryDate][prjId]['totalhours']) +
																			   parseFloat(prjHours);
					
			}//END of For Loop for Employee Times
			
			//3. Once it reached here, calculate the hourlyrate value
			//fix it to TWO Decimal points
			oajson.hourlyrate = (parseFloat(oajson.totalpay) / 
								parseFloat(oajson.totalhours)).toFixed(2);
			
			
			//4. oajson is now READY to be processed. Each Entries > Projects will be entered into Review Table
			log('debug','oajson View',JSON.stringify(oajson));
			for (var e in oajson.entries)
			{
				var entryJson = oajson.entries[e];
				//Loop through Each Project in THIS entry element
				for (var p in entryJson)
				{
					
					//Search Project Time Review record with matching Employee, Project, Pay Period From/To
					var ptrflt = [new nlobjSearchFilter('isinactive', null, 'is', 'F'),
					              new nlobjSearchFilter('custrecord_ptr_employee', null, 'anyof', rowjson.nsempid),
					              new nlobjSearchFilter('custrecord_ptr_project', null, 'anyof', p),
					              new nlobjSearchFilter('custrecord_ptr_paystartdt', null, 'on',ppFromDate),
					              new nlobjSearchFilter('custrecord_ptr_payenddt', null, 'on', ppEndDate),
					              new nlobjSearchFilter('custrecord_ptr_journalentrydt', null, 'on', e)];
					var ptrcol = [new nlobjSearchColumn('internalid')];
					var ptrrs = nlapiSearchRecord('customrecord_projecttimereview', null, ptrflt, ptrcol);
					
					var ptrrec = null;
					//Assume we have SINGLE result
					if (ptrrs && ptrrs.length > 0)
					{
						ptrrec = nlapiLoadRecord('customrecord_projecttimereview', ptrrs[0].getValue('internalid'));
					}
					else
					{
						ptrrec = nlapiCreateRecord('customrecord_projecttimereview');
					}
					
					//go through and set the preview fields
					ptrrec.setFieldValue('custrecord_ptr_procstatus', statusmap.PendingApproval);
					ptrrec.setFieldValue('custrecord_ptr_paystartdt', ppFromDate);
					ptrrec.setFieldValue('custrecord_ptr_payenddt', ppEndDate);
					ptrrec.setFieldValue('custrecord_ptr_journalentrydt', e);
					ptrrec.setFieldValue('custrecord_ptr_employee',rowjson.nsempid);
					ptrrec.setFieldValue('custrecord_ptr_project', p);
					ptrrec.setFieldValue('custrecord_ptr_empdepartment', oajson.empdepartment);
					ptrrec.setFieldValue('custrecord_ptr_emplocation', oajson.emplocation);
					ptrrec.setFieldValue('custrecord_ptr_projectclass', entryJson[p].projectclass);
					ptrrec.setFieldValue('custrecord_ptr_account', oajson.empdeptpayrollid);
					ptrrec.setFieldValue('custrecord_ptr_totalhoursworked', oajson.totalhours);
					ptrrec.setFieldValue('custrecord_ptr_totalbasepay', oajson.totalpay);
					ptrrec.setFieldValue('custrecord_ptr_hoursworked', entryJson[p].totalhours);
					ptrrec.setFieldValue('custrecord_ptr_payhourlyrate', oajson.hourlyrate);
					var currencyRounded = (parseFloat(entryJson[p].totalhours) * parseFloat(oajson.hourlyrate)).toFixed(2);
					ptrrec.setFieldValue('custrecord_ptr_payextendedamt', currencyRounded );
					
					nlapiSubmitRecord(ptrrec, true, true);
				}
				
			} //End Going through All Entries Elements in oajson object
			
			procStatus = statusmap.Completed;
			procNotes = 'Project redistro calculation successful';
			
		}
		catch (procerr)
		{
			procStatus = statusmap.Error;
			procNotes = 'ADP Internal ID: '+
						adprs[a].getValue('internalid')+
						' // '+
						getErrText(procerr);
			log(
				'error',
				'ADP Redistro Proc Error', 
				procNotes
			);
		}
		
		// IF procStatus is COMPLETED; 
		// 1. Do final validation to make sure Project Total and Gross Pay Matches
		// 2. Update ADP record as completed
		// 3. Go through oars and set all timesheet entry to Completed
		if (procStatus == statusmap.Completed)
		{
			
			try
			{
				//Final Validation - Make sure redistributed total adds up to Gross Pay
				//	- Grab list of ALL calculated record for THIS Employee for Pay Period, sorted by JE Amount
				var cptrflt = [new nlobjSearchFilter('custrecord_ptr_paystartdt', null, 'on', ppFromDate),
				               new nlobjSearchFilter('custrecord_ptr_payenddt', null, 'on', ppEndDate),
				               new nlobjSearchFilter('custrecord_ptr_employee', null, 'anyof', rowjson.nsempid)];
				var cptrcol = [new nlobjSearchColumn('internalid'),
				               new nlobjSearchColumn('custrecord_ptr_payextendedamt').setSort(true)];
				//Assume there are results on this.
				var cptrrs = nlapiSearchRecord('customrecord_projecttimereview', null, cptrflt, cptrcol);
				
				var newTotalValue = 0.0,
					adjustRecId = cptrrs[0].getValue('internalid');
					adjustRecValue = parseFloat(cptrrs[0].getValue('custrecord_ptr_payextendedamt'));
					adjustRecProcNote = '';
				
				//Do Compare search
				var comparecol = [new nlobjSearchColumn('custrecord_ptr_payextendedamt', null,'sum'),
				                  new nlobjSearchColumn('custrecord_ptr_totalbasepay', null, 'group')];
				//Run Compare Search
				var comparers = nlapiSearchRecord('customrecord_projecttimereview', null, cptrflt, comparecol);
				//Assume there is result
				var totalPay = parseFloat(comparers[0].getValue('custrecord_ptr_totalbasepay', null, 'group')),
					totalSum = parseFloat(comparers[0].getValue('custrecord_ptr_payextendedamt', null, 'sum')),
					diffValue = parseFloat(totalPay) - parseFloat(totalSum),
					newAdjustedValue = parseFloat(diffValue) + parseFloat(adjustRecValue);
				
					
				//Compare the value
				log(
					'debug',
					'Final number compare',
					'Original Total: '+totalPay+' // New Amount: '+totalSum+' // Difference: '+diffValue+' // Adjusted Value: '+newAdjustedValue
				);
				
				if (parseFloat(diffValue) != 0.0)
				{
					var adjupdflds = ['custrecord_ptr_payextendedamt','custrecord_ptr_procnotes'];
					var adjupdvals = [newAdjustedValue, 
					                  adjustRecProcNote+
					                  	' // '+
					                  	'Value adjusted by '+
					                  	diffValue.toFixed(3)+
					                  	' to match total pay'];
					nlapiSubmitField(
						'customrecord_projecttimereview', 
						adjustRecId, 
						adjupdflds, 
						adjupdvals,
						true);
					
				}
				
								
				//UPDATE THIS ADP Status
				var adpUpdFlds = ['custrecord_adpd_procstatus','custrecord_adpd_procnotes'];
				var adpUpdVals = [procStatus, procNotes];
				nlapiSubmitField(
					'customrecord_adpdataimort', 
					adprs[a].getValue('internalid'), 
					adpUpdFlds, 
					adpUpdVals, 
					true
				);
				
				for (var ca=0; oars && ca < oars.length; ca+=1)
				{
					var oaUpdFlds = ['custrecord_oatd_procstatus','custrecord_oatd_procnotes'];
					var oaUpdVals = [statusmap.Completed,
					                 'Processed Successfully'];
					nlapiSubmitField(
						'customrecord_oatimesheetdata', 
						oars[ca].getValue('internalid'), 
						oaUpdFlds, 
						oaUpdVals, 
						true
					);
				}
			}
			catch (finalsteperr)
			{
				//UPDATE THIS ADP Status as ERROR
				var eadpUpdFlds = ['custrecord_adpd_procstatus','custrecord_adpd_procnotes'];
				var eadpUpdVals = [statusmap.Error, 
				                   'Error occured during final validation step // '+
				                   		getErrText(finalsteperr)];
				nlapiSubmitField(
					'customrecord_adpdataimort', 
					adprs[a].getValue('internalid'), 
					eadpUpdFlds, 
					eadpUpdVals, 
					true
				);
			}
			
		}
		
		
		
		//*** RESCHEDULE LOGIC ***
		//---------------------------------------------------
		//ADD IN RESCHEDULE LOGIC HERE
		//Set % completed of script processing
		var pctCompleted = Math.round(((a+1) / adprs.length) * 100);
		nlapiGetContext().setPercentComplete(pctCompleted);
		//j=0; parentTrxRs 
		//Reschedule for customer loop
		if ((a+1)==1000 || ((a+1) < adprs.length && nlapiGetContext().getRemainingUsage() < 1500)) 
		{
			isRescheduled = true;
			//reschedule
			log('audit','Getting Rescheduled at', adprs[a].getValue('internalid'));
			
			var rparam = new Object();
			rparam['custscript_sb139_lastprocid'] = adprs[a].getValue('internalid');
			rparam['custscript_sb139_pprange'] = paramPayPeriodRange;
			rparam['custscript_sb139_triggeruser'] = paramTriggerUser;
			nlapiScheduleScript(nlapiGetContext().getScriptId(), nlapiGetContext().getDeploymentId(), rparam);
			break;
		}
		
		
	} //End Looping through all valid ADP timeseet within passed in Range
	
	//***** End of Execution **** Need to Notify the User with the result
	if (!isRescheduled)
	{
		log(
			'debug',
			'About to Send out Completed Processing Notification',
			'Pay Period Range: '+
				paramPayPeriodRange+
				' Completed. About to Send out Notification'
		);
		
		var vadpflt = [new nlobjSearchFilter('isinactive', null, 'is', 'F'),
		               new nlobjSearchFilter('custrecord_adpd_procstatus', null, 'anyof', statusmap.Error),
		               new nlobjSearchFilter('custrecord_adpd_paystartdt', null, 'on', ppFromDate),
		               new nlobjSearchFilter('custrecord_adpd_payenddt', null, 'on',ppEndDate)];
		var vadpcol = [new nlobjSearchColumn('internalid')];
		var vadprs = nlapiSearchRecord('customrecord_adpdataimort', null, vadpflt, vadpcol);
		
		//****************** NOTIFICATION TO TRIGGER USER *******************************************************/
		
		var notifSbj = 'Project Redistribution Calculation Completed for Pay Periods '+paramPayPeriodRange,
			notifMsg = 'Successuflly completed processing ALL ADP Salary Data '+
					   'for pay periods '+paramPayPeriodRange+'.<br/>'+
					   '<br/>'+
					   'Results are ready for review/approval in "Project Time Review" Custom Record. ';
		
		if (vadprs && vadprs.length > 0)
		{
			notifSbj = 'Project Redistribution Calculation Completed WITH One/More ERRORs for Pay Periods '+paramPayPeriodRange,
			notifMsg = 'Completed processing ALL ADP Salary Data '+
					   'with '+vadprs.length+' ERRORed rows of ADP Import data<br/><br/>'+
					   'Please review all ERRORs and try again. <br/>'+
					   '<br/>'+
					   'For successfully processed imported ADP salary data, '+
					   'results are ready for review/approval in "Project Time Review" Custom Record. ';
		}
		
		//Add in Link to VIEW the Result
		var sl2Url = nlapiResolveURL(
				'SUITELET',
				'customscript_ccsw_sl_vad_ptr',
				'customdeploy_ccsw_sl_vad_ptr',
				'VIEW'
			 );

		//If There is a value on the drop down, send it as well
		sl2Url += '&custpage_ppfld='+paramPayPeriodRange+
				  '&custparam_display=y';
		
		notifMsg += '<br/><br/>'+
					'<a href="'+getNetSuiteDomain()+sl2Url+'" target="_blank">View Calculation Progress/Results</a>';
		
		nlapiSendEmail(
			-5, 
			paramTriggerUser, 
			notifSbj, 
			notifMsg
		);
	}
}
