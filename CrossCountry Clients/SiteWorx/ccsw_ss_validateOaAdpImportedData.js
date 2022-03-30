/**
 * Scheduled script is triggered from Run Controller. 
 * Run Controller will pass in pay period selected from the UI which will be in the format of [Start Date]-[End Date].
 * Run Controller will also pass in Triggering user to send notification to.
 * THIS validation process will make sure ALL ADP and OpenAir data within pay period are FULLY validated with matching
 * Employee record and Project record. It will also make sure each Employee data from ADP import has matching OpenAir Time data. 
 * When EVERY record is fully validated, it will mark all related records (ADP and OpenAir Imports) Valid and kick off calculation process 
 *
 * 
 * Version    Date            Author           Remarks
 * 1.00       14 Oct 2015     json
 *
 */

/**
 * @param {String} type Context Types: scheduled, ondemand, userinterface, aborted, skipped
 * @returns {Void}
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

function validateImportedAdpOaData(type) {

	//Company Level preference
	//Default Time Off project to use
	var paramDefaultTimeoffProject = nlapiGetContext().getSetting('SCRIPT','custscript_sb143_deftimeoffprj');
	var paramOpenAirTimeoffProjectName = nlapiGetContext().getSetting('SCRIPT','custscript_sb143_deftimeoffname');
	
	//These two parameters are passed in by Run Controller
	//Employee ID
	var paramTriggerUser = nlapiGetContext().getSetting('SCRIPT','custscript_sb138_triggeruser');
	//String value format: [Start Date]-[End Date]
	var paramPayPeriodRange = nlapiGetContext().getSetting('SCRIPT','custscript_sb138_pprange');
	//Validation Stage
	//OA = Run validation on OpenAir record. This needs to be done FIRST.
	//ADP = Run validation on ADP record. This is Second stage. Needs to run through and make sure it has matching OA record by NS Employee record
	//		If ADP passes validation, queue up redistroProcessorScript
	
	var paramValidateStage = nlapiGetContext().getSetting('SCRIPT','custscript_sb138_valstage');
	//Last Processed ID
	var paramLastProcId = nlapiGetContext().getSetting('SCRIPT','custscript_sb138_lastprocid');
	
	if (!paramTriggerUser || !paramPayPeriodRange || !paramValidateStage)
	{
		//throw script terminating error WITH notification to ALL default notifier set on script.
		throw nlapiCreateError(
			'VALIDATE-ERR', 
			'Validation Stage, Triggering User and Pay Period Range values are required.', 
			false
		);
	}
	
	var arPayPeriods = paramPayPeriodRange.split('-');
		ppFromDate = arPayPeriods[0],
		ppEndDate = arPayPeriods[1],
		isRescheduled = false;
	
	//Make sure value exists for both 
	if (!ppFromDate || !ppEndDate)
	{
		throw nlapiCreateError(
			'VALIDATE-ERR', 
			'Pay period range passed in failed validation. Unable to break "'+paramPayPeriodRange+'" down using - character.', 
			false
		);
	}
	
	//--------------- Ready To Start Processing. --------------------------------------------/
	try
	{
		//Stage 1: Run Validation of OpenAir import
		if (paramValidateStage == 'OA')
		{
			log('debug','Running OA Validation','Running OA Validation');
			
			//1. Grab list of ALL OpenAir for this pay periods
			var opaflt = [new nlobjSearchFilter('isinactive', null, 'is', 'F'),
			              new nlobjSearchFilter('custrecord_oatd_timesheetdate', null, 'within', ppFromDate, ppEndDate),
			              new nlobjSearchFilter('custrecord_oatd_procstatus', null, 'noneof', [statusmap.Validated, statusmap.Completed])];
			
			if (paramLastProcId)
			{
				opaflt.push(new nlobjSearchFilter('internalidnumber', null, 'lessthan', paramLastProcId));
			}
			
			var opacol = [new nlobjSearchColumn('internalid').setSort(true),
			              new nlobjSearchColumn('custrecord_oatd_procstatus'),
			              new nlobjSearchColumn('custrecord_oatd_oaadpfileid'),
			              new nlobjSearchColumn('custrecord_oatd_oaemployeename'),
			              new nlobjSearchColumn('custrecord_oatd_nsemployee'),
			              new nlobjSearchColumn('custrecord_oatd_oaprojectid'),
			              new nlobjSearchColumn('custrecord_oatd_oaprojectname'),
			              new nlobjSearchColumn('custrecord_oatd_projectref'),
			              new nlobjSearchColumn('custrecord_oatd_oahhmmformat'),
			              new nlobjSearchColumn('custrecord_oatd_oahoursdecimal')];
			var opars = nlapiSearchRecord('customrecord_oatimesheetdata', null, opaflt, opacol);
			
			//Loop through each OpenAir data and process them
			for (var p=0; opars && p < opars.length; p+=1)
			{
				var procStatus = '',
					procNote = '',
					//easy to use later 
					rowjson = {
						'id':opars[p].getValue('internalid'),
						'status':opars[p].getValue('custrecord_oatd_procstatus'),
						'empname':opars[p].getValue('custrecord_oatd_oaemployeename'),
						'opaempid':opars[p].getValue('custrecord_oatd_oaadpfileid'),
						'nsempid':opars[p].getValue('custrecord_oatd_nsemployee'),
						'prjname':opars[p].getValue('custrecord_oatd_oaprojectname'),
						'opaprjid':opars[p].getValue('custrecord_oatd_oaprojectid'),
						'nsprjid':opars[p].getValue('custrecord_oatd_projectref'),
						'hoursdecimal':opars[p].getValue('custrecord_oatd_oahoursdecimal'),
						'hoursstring':opars[p].getValue('custrecord_oatd_oahhmmformat')
					};

				try
				{
					//Execute if one or more of below elements are needed to be validated
					if ((rowjson.status != statusmap.Validated && rowjson.status != statusmap.Completed) ||
						!rowjson.nsempid || !rowjson.nsprjid || !rowjson.hoursdecimal)
					{
						
						//1. Check to make sure we have matching employee
						//10/23/2015 - Use ADP File # on the employee record (custentity_adp_file_no)
						//			   Also look up Payroll account associated with Employees Department to be used as Account on the Journal
						var empflt = [new nlobjSearchFilter('custentity_adp_file_no', null, 'is', rowjson.opaempid),
						              new nlobjSearchFilter('isinactive', null, 'is', 'F')];
						var empcol = [new nlobjSearchColumn('internalid'),
						              new nlobjSearchColumn('isinactive'),
						              new nlobjSearchColumn('department'),
						              new nlobjSearchColumn('departmentnohierarchy'),
						              new nlobjSearchColumn('custrecord_payrollacct','department')];
						var emprs = nlapiSearchRecord('employee', null, empflt, empcol);
						
						if (!emprs)
						{
							throw nlapiCreateError(
								'OAVALIDATE-ERR', 
								'No employee record found in NetSuite with ADP File # of '+rowjson.opaempid, 
								true
							);
						}
						
						//Check to see we ONLY get ONE active Employee record with this ADP File #
						if (emprs && emprs.length > 1)
						{
							//Loop through and add list of Employee IDs in Error Message.
							var duplicateEmpIds = [];
							for (var de=0; de < emprs.length; de+=1)
							{
								duplicateEmpIds.push(emprs[de].getValue('internalid'));
							}
							
							throw nlapiCreateError(
								'OAVALIDATE-ERR', 
								'Multiple Employee records found in NetSuite with ADP File # of '+rowjson.opaempid+' // Employee IDs: '+duplicateEmpIds, 
								true
							);
						}
												
						//Check to make sure department is set on employee
						if (!emprs[0].getValue('department'))
						{
							throw nlapiCreateError(
								'OAVALIDATE-ERR', 
								'Department is missing on Employee record with ADP File # of '+rowjson.opaempid, 
								true
							);
						}
						
						//Check to make sure employee department has payroll acount set
						if (!emprs[0].getValue('custrecord_payrollacct','department'))
						{
							throw nlapiCreateError(
								'OAVALIDATE-ERR', 
								'Payroll Account is Missing on Employee Department ('+
									emprs[0].getText('departmentnohierarchy')+
									'//'+
									emprs[0].getValue('departmentnohierarchy')+
									') with ADP File # of '+rowjson.opaempid, 
								true
							);
						}
						
						
						//Set NS Employee ID on the Object
						rowjson.nsempid = emprs[0].getValue('internalid');
						
						//2. Check to make sure we have matching project
						//10/28/2015 - 
						//Change it so that IF project ID is empty and Project name matches 
						//Open Air Time off Project, default it using company level parameter
						if (!rowjson.opaprjid)
						{
							if (rowjson.prjname == paramOpenAirTimeoffProjectName)
							{
								//default projec to time off project in NetSUite.
								//This value is set on the Company Preference page
								rowjson.nsprjid = paramDefaultTimeoffProject;
							}
						}
						else
						{
							var prjflt = [new nlobjSearchFilter('internalid', null, 'anyof', rowjson.opaprjid)];
							var prjcol = [new nlobjSearchColumn('internalid'),
							              new nlobjSearchColumn('isinactive'),
							              new nlobjSearchColumn('custentity_projclass')];
							var prjrs = nlapiSearchRecord('job', null, prjflt, prjcol);
							
							if (!prjrs)
							{
								throw nlapiCreateError(
									'OAVALIDATE-ERR', 
									'No project record found in NetSuite with ID of '+rowjson.opaprjid, 
									true
								);
							}
							
							//Check to see if project is inactive in the system
							if (prjrs && prjrs.length > 0 && prjrs[0].getValue('isinactive') == 'T')
							{
								throw nlapiCreateError(
									'OAVALIDATE-ERR', 
									'Project record found in NetSuite with ID of '+rowjson.opaprjid+
										' BUT record is INACTIVE', 
									true
								);
							}
							
							//Check to make sure THIS Project has project class set
							if (prjrs && !prjrs[0].getValue('custentity_projclass'))
							{
								throw nlapiCreateError(
									'OAVALIDATE-ERR', 
									'Project record found in NetSuite with ID of '+rowjson.opaprjid+
										' BUT record is Missing required Project Class value on the Project Record', 
									true
								);
							}
							
							//Set NS Project ID on the Object
							rowjson.nsprjid = prjrs[0].getValue('internalid');
						}//Check for Empty Project ID
						
						//3. Convert string version of Hours worked into Decimal
						if (!rowjson.hoursstring && !rowjson.hoursdecimal)
						{
							throw nlapiCreateError(
								'OAVALIDATE-ERR', 
								'Missing Hours worked from import', 
								true
							);
						}
						
						//ONLY DO this if Import didn't bring in the decimal version
						if (!rowjson.hoursdecimal)
						{
							var arHours = rowjson.hoursstring.split(':');
							//divide min. portion by 60 and add both numbers together to come up with decimal version
							var intHoursMins = parseInt(arHours[0], 10) + (parseInt(arHours[1], 10)/60);
							rowjson.hoursdecimal = intHoursMins.toFixed(2);
						}
					}
					
					procStatus = statusmap.Validated;
					procNote = 'Successfully mapped info to NetSuite';
					
				}
				catch (err)
				{
					procStatus = statusmap.Invalid;
					procNote = getErrText(err);
					log(
						'error',
						'OpenAir Process Error',
						getErrText(err)
					);
				}
				
				//Run Update on THIS OpenAir record as Valid
				var opaUpdFlds = ['custrecord_oatd_procstatus',
				                  'custrecord_oatd_procnotes',
				                  'custrecord_oatd_nsemployee',
				                  'custrecord_oatd_projectref',
				                  'custrecord_oatd_oahoursdecimal'];
				var opaUpdVals = [procStatus,
				                  procNote,
				                  rowjson.nsempid,
				                  rowjson.nsprjid,
				                  rowjson.hoursdecimal];
				//Let this throw unexpected Error and terminate the script 
				nlapiSubmitField(
					'customrecord_oatimesheetdata', 
					rowjson.id, 
					opaUpdFlds, 
					opaUpdVals, 
					true
				);
				
				//ADD IN RESCHEDULE LOGIC HERE
				//Set % completed of script processing
				var pctCompleted = Math.round(((p+1) / opars.length) * 100);
				nlapiGetContext().setPercentComplete(pctCompleted);
				
				
				//Reschedule logic ----------------------------
				if ((p+1)==1000 || ((p+1) < opars.length && nlapiGetContext().getRemainingUsage() < 500)) {
					log('audit','Rescheduling OA ',rowjson.id);
					//reschedule
					isRescheduled = true;
					var rparam = {
						'custscript_sb138_triggeruser':paramTriggerUser,
						'custscript_sb138_pprange':paramPayPeriodRange,
						'custscript_sb138_valstage':paramValidateStage,
						'custscript_sb138_lastprocid':opars[p].getValue('internalid')
					};
					
					nlapiScheduleScript(nlapiGetContext().getScriptId(), nlapiGetContext().getDeploymentId(), rparam);
					break;
				}
			}
			
			//If NOT Rescheduled, kicked of Next Stage
			if (!isRescheduled)
			{
				//Need to run search to see if any invalids exists. If So, terminate script here and notify user
				var opaflt = [new nlobjSearchFilter('isinactive', null, 'is', 'F'),
				              new nlobjSearchFilter('custrecord_oatd_timesheetdate', null, 'within', ppFromDate, ppEndDate),
				              new nlobjSearchFilter('custrecord_oatd_procstatus', null, 'anyof', [statusmap.Error, statusmap.Invalid, '@NONE@'])];
				
				var opacol = [new nlobjSearchColumn('internalid', null, 'count')];
				var opars = nlapiSearchRecord('customrecord_oatimesheetdata', null, opaflt, opacol);
				
				if (opars && opars.length > 0 && parseInt(opars[0].getValue('internalid', null, 'count')) > 0)
				{
					//Generate Email Notification to Triggering user
					var oaSbj = 'Error Validating OpenAir Time Data for '+paramPayPeriodRange;
					
					//---------- SEND ERROR EMAIL // TODO: Templatize this content ----------------------------------------------------------------------------------------
					var oaMsg = 'There were '+opars[0].getValue('internalid', null, 'count')+
								' Invalid OpenAir Timesheet records. Please log in review/fix the issue and try again';
					nlapiSendEmail(
						-5, 
						paramTriggerUser, 
						oaSbj, 
						oaMsg
					);
				}
				else
				{
					//All is well with OpenAir validation. Queue up the Next Stage: ADP
					var rparam = {
						'custscript_sb138_triggeruser':paramTriggerUser,
						'custscript_sb138_pprange':paramPayPeriodRange,
						'custscript_sb138_valstage':'ADP',
						'custscript_sb138_lastprocid':''
					};
						
					nlapiScheduleScript(nlapiGetContext().getScriptId(), nlapiGetContext().getDeploymentId(), rparam);
				}
			}
		}
		/********************************* ADP STAGE ************************************************************/
		else if (paramValidateStage == 'ADP')
		{
			/**
			 * Based on how this is coded, ADP valiation will NOT happen unless ALL Employee Time from OpenAir is FULLY validated
			 * Primary Reason behind this is to ensure ADP data is NOT marked as Validated while Employee Time data has invalid information.
			 * The Run Control grabs pay period information tofrom ADP data to be displayed and to be processed
			 */
			
			log('debug','Running ADP Validation','Running ADP Validation');
			
			//1. Grab list of ALL ADP for this pay periods
			var adpflt = [new nlobjSearchFilter('isinactive', null, 'is', 'F'),
			              new nlobjSearchFilter('custrecord_adpd_paystartdt', null, 'on', ppFromDate),
			              new nlobjSearchFilter('custrecord_adpd_payenddt', null, 'on',ppEndDate),
			              new nlobjSearchFilter('custrecord_adpd_procstatus', null, 'noneof', [statusmap.Validated, statusmap.Completed])];
			
			if (paramLastProcId)
			{
				adpflt.push(new nlobjSearchFilter('internalidnumber', null, 'lessthan', paramLastProcId));
			}
			
			var adpcol = [new nlobjSearchColumn('internalid').setSort(true),
			              new nlobjSearchColumn('custrecord_adpd_procstatus'),
			              new nlobjSearchColumn('custrecord_adpd_empname'),
			              new nlobjSearchColumn('custrecord_adpd_adpempid'),
			              new nlobjSearchColumn('custrecord_adpd_adpacctnumber'),
			              new nlobjSearchColumn('custrecord_adpd_adpmemo'),
			              new nlobjSearchColumn('custrecord_adpd_basepay'),
			              new nlobjSearchColumn('custrecord_adpd_nsemployee')];
			var adprs = nlapiSearchRecord('customrecord_adpdataimort', null, adpflt, adpcol);
			
			//Loop through each ADP data and process them
			for (var a=0; adprs && a < adprs.length; a+=1)
			{
				var procStatus = '',
					procNote = '',
					//easy to use later 
					rowjson = {
						'id':adprs[a].getValue('internalid'),
						'status':adprs[a].getValue('custrecord_adpd_procstatus'),
						'empname':adprs[a].getValue('custrecord_adpd_empname'),
						'adpempid':adprs[a].getValue('custrecord_adpd_adpempid'),
						'nsempid':adprs[a].getValue('custrecord_adpd_nsemployee'),
						'adpaccountnumber':adprs[a].getValue('custrecord_adpd_adpacctnumber'),
						'adpmemo':adprs[a].getValue('custrecord_adpd_adpmemo'),
						'payamount':adprs[a].getValue('custrecord_adpd_basepay')
					};
				try
				{
					//Run through validation process IF nsempid field is missing OR the status is NOT COmpleted and Validated. 
					if ((rowjson.status != statusmap.Validated && rowjson.status != statusmap.Completed) ||
						!rowjson.nsempid) 
					{
					
						log('debug','rowjson',JSON.stringify(rowjson));
						
						//1. Identify NetSuite Employee using (ADP FIle ID)adpemp id.
						//	In this use case, filter out the inactive employee.
						var empflt = [new nlobjSearchFilter('isinactive', null, 'is','F'),
						              new nlobjSearchFilter('custentity_adp_file_no', null, 'is', rowjson.adpempid)];
						var empcol = [new nlobjSearchColumn('internalid')];
						var emprs = nlapiSearchRecord('employee', null, empflt, empcol);
						
						if (!emprs)
						{
							throw nlapiCreateError(
								'ADPVALIDATE-ERR', 
								'No NetSuite Employee found with ADP Employee ID', 
								true
							);
						}
						
						//Found More than 1
						if (emprs && emprs.length > 1)
						{
							throw nlapiCreateError(
								'ADPVALIDATE-ERR',
								'Found multiple ('+emprs.length+') NetSuite Employees sharing same ADP Employee ID',
								true
							);
						}
						
						//At this point set the nsempid
						rowjson.nsempid = emprs[0].getValue('internalid');
						
						log('debug','adp employee check',rowjson.nsempid);
						
						//2. Look for matching OpenAir import by nsempid AND VALID
						var voaflt = [new nlobjSearchFilter('custrecord_oatd_procstatus', null, 'anyof', statusmap.Validated),
						              new nlobjSearchFilter('custrecord_oatd_timesheetdate', null, 'within', ppFromDate, ppEndDate),
									  new nlobjSearchFilter('isinactive', null, 'is','F'),
									  new nlobjSearchFilter('custrecord_oatd_nsemployee', null, 'anyof',rowjson.nsempid)];
						var voacol = [new nlobjSearchColumn('internalid')];
						var voars = nlapiSearchRecord('customrecord_oatimesheetdata', null, voaflt, voacol);
						//	IF NONE is FOUND, throw an error
						if (!voars)
						{
							throw nlapiCreateError(
								'ADPVALIDATE-ERR', 
								'No valid employee Open Air Time data found', 
								true
							);
						}
						
					}
					
					procStatus = statusmap.Validated;
					procNote = 'Successfully mapped info to NetSuite';
					
				}
				catch (err)
				{
					procStatus = statusmap.Invalid;
					procNote = getErrText(err);
					log(
						'error',
						'ADP Process Error',
						getErrText(err)
					);
				}
				
				//TODO:Run Update on THIS ADP record as Valid
				var adpUpdFlds = ['custrecord_adpd_procstatus',
				                  'custrecord_adpd_procnotes',
				                  'custrecord_adpd_nsemployee'];
				var adpUpdVals = [procStatus,
				                  procNote,
				                  rowjson.nsempid];
				
				//Let this throw unexpected Error and terminate the script 
				nlapiSubmitField(
					'customrecord_adpdataimort', 
					rowjson.id, 
					adpUpdFlds, 
					adpUpdVals, 
					true
				);
				
				//ADD IN RESCHEDULE LOGIC HERE
				//Set % completed of script processing
				var pctCompleted = Math.round(((a+1) / adprs.length) * 100);
				nlapiGetContext().setPercentComplete(pctCompleted);
				
				
				//Reschedule logic ----------------------------
				if ((a+1)==1000 || ((a+1) < adprs.length && nlapiGetContext().getRemainingUsage() < 500)) {
					//reschedule
					isRescheduled = true;
					var rparam = {
						'custscript_sb138_triggeruser':paramTriggerUser,
						'custscript_sb138_pprange':paramPayPeriodRange,
						'custscript_sb138_valstage':paramValidateStage,
						'custscript_sb138_lastprocid':adprs[a].getValue('internalid')
					};
					
					nlapiScheduleScript(nlapiGetContext().getScriptId(), nlapiGetContext().getDeploymentId(), rparam);
					break;
				}
			}
			
			//If NOT Rescheduled, kicked of Next Stage
			if (!isRescheduled)
			{
				//Need to run search to see if any invalids exists. If So, terminate script here and notify user
				var vadpflt = [new nlobjSearchFilter('isinactive', null, 'is', 'F'),
				               new nlobjSearchFilter('custrecord_adpd_paystartdt', null, 'on', ppFromDate),
				               new nlobjSearchFilter('custrecord_adpd_payenddt', null, 'on',ppEndDate),
				               new nlobjSearchFilter('custrecord_adpd_procstatus', null, 'anyof', [statusmap.Error, statusmap.Invalid, '@NONE@'])];
				
				var vadpcol = [new nlobjSearchColumn('internalid', null, 'count')];
				
				var vadprs = nlapiSearchRecord('customrecord_adpdataimort', null, vadpflt, vadpcol);
				
				if (vadprs && vadprs.length > 0 && parseInt(vadprs[0].getValue('internalid', null, 'count')) > 0)
				{
					//Generate Email Notification to Triggering user
					var adpSbj = 'Error Validating ADP Data for '+paramPayPeriodRange;
					
					//---------- SEND ERROR EMAIL // TODO: Templatize this content ----------------------------------------------------------------------------------------
					var adpMsg = 'There were '+vadprs[0].getValue('internalid', null, 'count')+
								' Invalid ADP records. Please log in review/fix the issue and try again';
					nlapiSendEmail(
						-5, 
						paramTriggerUser, 
						adpSbj, 
						adpMsg
					);
				}
				else
				{
					//All is well with ADP validation. 
					//	At this point, Both ADP and OpenAir information are validated.
					//	We can kick off Redistribution Processor
					log(
						'debug',
						'Validation Complete',
						'Kick off next process'
					);
					
					var rparam = {
						'custscript_sb139_triggeruser':paramTriggerUser,
						'custscript_sb139_pprange':paramPayPeriodRange,
						'custscript_sb139_lastprocid':''
					};
						
					nlapiScheduleScript(
						'customscript_ccsw_ss_procinitredistro', 
						'customdeploy_ccsw_ss_procinitredistro', 
						rparam
					);
					
					//Generate Email Notification to Triggering user
					var adpSbj = 'Validation of OpenAir and ADP Data for '+paramPayPeriodRange+' Completed';
					
					//---------- SEND ERROR EMAIL // TODO: Templatize this content ----------------------------------------------------------------------------------------
					var adpMsg = 'Validation process has completed for data imported for pay period of '+paramPayPeriodRange+'<br/>'+
								 'Redistribution process has been queued up and you will be notified when it has completed.<br/><br/>'+
								 'Thank You';
					
					nlapiSendEmail(
						-5, 
						paramTriggerUser, 
						adpSbj, 
						adpMsg
					);
					
				}
			}
		}
		
		
	}
	catch(procerr)
	{
		
		throw nlapiCreateError(
			'VALIDATE-PROC-ERR',
			'Error Processing ADP/OpenAir Import Validation process // '+
				getErrText(procerr),
			false
		);
		
	}
	
}
