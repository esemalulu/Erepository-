/**
 * Final stage of the process triggered from Stage 2 PTR UI screen.
 * When all approval is provided and submitted. 
 * When triggered, script executes against ALL "Pending Approval" rows.
 * It will generate Journal Entries for the Pay Period.
 * If Pay period crosses month, it generates TWO Journal Entries. 
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


function executeRedistroJeCreation(type) {

	//These two parameters are passed in by Run Controller
	//Employee ID
	var paramTriggerUser = nlapiGetContext().getSetting('SCRIPT','custscript_sb143_triggeruser');
	//String value format: [Start Date]-[End Date]
	var paramPayPeriodRange = nlapiGetContext().getSetting('SCRIPT','custscript_sb143_pprange');
	
	//Company Level preference
	//Default Account to charge Employee Paid Salary Amount
	var paramDefaultSalaryExpAcct = nlapiGetContext().getSetting('SCRIPT','custscript_sb143_defsalexpacct');
	//Default Journal Entry Form
	var paramDefaultJeForm = nlapiGetContext().getSetting('SCRIPT','custscript_sb143_jeentryform');
	
	//Finalize JSON Parameter
	/**
	 * {
	 *   [JE Date]:
	 * 	 {
	 * 	   'status':[Error or Complete],
	 * 	   'errormsg':'',
	 * 	   'jeinfo':[JE Related INFO]
	 *	 },
	 *	 ...
	 * }
	 */
	var paramFinalizeJson = nlapiGetContext().getSetting('SCRIPT','custscript_sb143_finalizejson');
	var paramFinalizeLastProcId = nlapiGetContext().getSetting('SCRIPT','custscript_sb143_finalizelastprocid');
	
	if (!paramTriggerUser || !paramPayPeriodRange || !paramDefaultSalaryExpAcct || !paramDefaultJeForm)
	{
		//throw script terminating error WITH notification to ALL default notifier set on script.
		throw nlapiCreateError(
			'JOURNALENTRY-ERR', 
			'Triggering User, Pay Period Range, Default Journal Entry Form and Default Salary Expense Account values are required.', 
			false
		);
	}
	
	var arPayPeriods = paramPayPeriodRange.split('-');
		ppFromDate = arPayPeriods[0],
		ppEndDate = arPayPeriods[1];
		
	//Make sure value exists for both 
	if (!ppFromDate || !ppEndDate)
	{
		throw nlapiCreateError(
			'JOURNALENTRY-ERR', 
			'Pay period range passed in failed validation. Unable to break "'+paramPayPeriodRange+'" down using - character.', 
			false
		);
	}
	
	if (paramFinalizeJson)
	{
		//---------------------------------- Finalize the process by updating PTR Status --------------------------------
		//	- IF All JE Date elements are success, this WILL Initiate PURGE IMPORT DATA Step
		/**
		 * 		{
		 * 			[JE Date]:
		 * 			{
		 * 				[Subsidiary]:
		 * 				{
		 * 					'status':[Error or Complete],
		 * 					'errormsg':'',
		 * 					'jeinfo':[JE Related INFO]
		 *				},
		 *				...
		 *			},
		 *			...
		 * 		}
		 * 
		 * IF Error occured for JE Date, it will have subelement of ERROR
		 */
		try
		{
			var finJson = JSON.parse(paramFinalizeJson),
				isRescheduled = false;
			
			log('debug','finJson',JSON.stringify(finJson));
			
			var fptrflt = [new nlobjSearchFilter('isinactive', null, 'is', 'F'),
			               new nlobjSearchFilter('custrecord_ptr_paystartdt', null, 'on', ppFromDate),
			               new nlobjSearchFilter('custrecord_ptr_payenddt', null, 'on',ppEndDate)];
			
			if (paramFinalizeLastProcId)
			{
				fptrflt.push(new nlobjSearchFilter('internalidnumber', null, 'lessthan', paramFinalizeLastProcId));
			}
			
			//Return the results in Internal ID DESC Order to mark them completed or error 
			var fptrcol = [new nlobjSearchColumn('internalid').setSort(true),
			               new nlobjSearchColumn('custrecord_ptr_journalentrydt'),
			               new nlobjSearchColumn('subsidiary','custrecord_ptr_employee')];
			
			var fptrrs = nlapiSearchRecord('customrecord_projecttimereview', null, fptrflt, fptrcol);
			
			for (var f=0; fptrrs && f < fptrrs.length; f+=1)
			{
				var fuvStatus = '',
					fuvErrorMsg = '',
					fuvJeinfo = '',
					empSubs = fptrrs[f].getValue('subsidiary','custrecord_ptr_employee'),
					jeDate = fptrrs[f].getValue('custrecord_ptr_journalentrydt');
				
				if (finJson[jeDate]['ERROR'])
				{
					fuvStatus = finJson[jeDate]['ERROR'].status;
					fuvErrorMsg = finJson[jeDate]['ERROR'].errormsg;
					fuvJeinfo = finJson[jeDate]['ERROR'].jeinfo;
				}
				else
				{
					//assume there is a finalized value for subsidiary
					fuvStatus = finJson[jeDate][empSubs].status;
					fuvErrorMsg = finJson[jeDate][empSubs].errormsg;
					fuvJeinfo = finJson[jeDate][empSubs].jeinfo;
				}
				
				var fuflds = ['custrecord_ptr_procstatus',
				              'custrecord_ptr_procnotes',
				              'custrecord_ptr_jerefinfo'];
				
				var fuvals = [fuvStatus,
				              fuvErrorMsg,
				              fuvJeinfo];
				
				log('debug','About to Update PTR','PTR ID '+fptrrs[f].getValue('internalid'));
				
				nlapiSubmitField(
					'customrecord_projecttimereview',
					fptrrs[f].getValue('internalid'), 
					fuflds, 
					fuvals, 
					true
				);
				
				//Reschedule logic ----------------------------
				if ((f+1)==1000 || ((f+1) < fptrrs.length && nlapiGetContext().getRemainingUsage() < 500)) {
					//reschedule
					isRescheduled = true;
					var rparam = {
						'custscript_sb143_triggeruser':paramTriggerUser,
						'custscript_sb143_pprange':paramPayPeriodRange,
						'custscript_sb143_finalizejson':paramFinalizeJson,
						'custscript_sb143_finalizelastprocid':fptrrs[f].getValue('internalid')
					};
					
					nlapiScheduleScript(nlapiGetContext().getScriptId(), nlapiGetContext().getDeploymentId(), rparam);
					break;
				}
			}
			
			//**************** SEND OUT NOTIFICATION **********************/
			if (!isRescheduled)
			{
				var hasError = false,
					finSbj = 'Successfully completed Journal Entry Generation for '+paramPayPeriodRange,
					finMsg = 'Successfully processed Journal Entry Generation<br/><br/>'+
							 'This process will now purge ALL ADP and OpenAir Import Data '+
							 'for pay period '+paramPayPeriodRange,
					progressText = '';
				
				
				for (var fin in finJson)
				{
					var subjson = finJson[fin];
					//Loop through each Subsidiary Info
					for (var sub in subjson)
					{
						var subStatusText = 'SUCCESS';
						
						//Check for !hasError ensures it gets checked only once
						if (subjson[sub].status == statusmap.Error && !hasError)
						{
							subStatusText = 'FAILED';
							hasError = true;
							finSbj = 'Failure during Journal Entry Generation for '+paramPayPeriodRange;
							finMsg = 'Error occured during Journal Entry generation process. <br/><br/>'+
									 'IMPORTANT: <br/>'+
									 'IF <b>Journal Entry ID</b> is set, you MUST '+
									 'Reverse or Delete the entry before trying the pay period processing again. ';
							
						}
						
						var journalEntryUrlText = '';
						if (subStatusText == 'SUCCESS')
						{
							journalEntryUrlText = '<a href="'+
												  getNetSuiteDomain()+
												  nlapiResolveURL('RECORD', 'journalentry', subjson[sub].jeinfo, 'VIEW')+
												  '" target="_blank">View '+subjson[sub].jeinfo+'</a>';
						}
						
						progressText += '<li>Journal Entry Date '+fin+' // Subsidiary '+sub+'<br/>'+
										'Status: '+subStatusText+'<br/>'+
										'Error Message: '+subjson[sub].errormsg+'<br/>'+
										'Journal Entry ID: '+journalEntryUrlText+'</li>';	
					}
				}
				
				//Add any progressText
				finMsg = finMsg+'<br/><ul>'+progressText+'</ul>';
				
				//---------- SEND NOTIFICATION EMAIL // TODO: Templatize this content ----------------------------------------------------------------------------------------
				nlapiSendEmail(
					-5, 
					paramTriggerUser, 
					finSbj, 
					finMsg
				);
				
				//------ IF SUCCESS Trigger Purge ---------------
				if (!hasError)
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
						'custscript_sb142_pprange':paramPayPeriodRange,
						'custscript_sb142_deletestage':'OA',
						'custscript_sb142_isdeleteall':'F' //Pass in F to purge ONLY the OpenAir and ADP Import records
					};
					
					var purgeQueue = nlapiScheduleScript(
										'customscript_ccsw_ss_purgeredistrodata', 
										'customdeploy_ccsw_ss_purgeredistrodata', 
										rparam
									);
					
					log(
						'audit',
						'Purge OA and ADP ONLY',
						'Queue Status '+purgeQueue+' // This will purge all OA and ADP imported data ONLY'
					);
					
				}
			}
		}
		catch(finerr)
		{
			throw nlapiCreateError(
				'REDISTRO_FINALIZE_ERR', 
				'Error while processing finalize with following JSON: '+
					paramFinalizeJson+
					' // '+
					getErrText(finerr), 
				false
			);
		}
	}
	else
	{
		//----------------------------------- JOURNAL ENTRY Creation Step--------------------------------------------
		//	- ONCE This is Complete, It will Reschedule THIS Script by passing in paramFinalizeJson parameter
		
		//1. Grab list UNIQUE Journal Entry Date (custrecord_ptr_journalentrydt) for THIS Pay Period.
		//	 There can ONLY be ONE ore TWO depending on Pay Period Crossing Months.
		var ptrflt = [new nlobjSearchFilter('isinactive', null, 'is', 'F'),
		              new nlobjSearchFilter('custrecord_ptr_procstatus', null, 'noneof',statusmap.Completed),
		              new nlobjSearchFilter('custrecord_ptr_paystartdt', null, 'on', ppFromDate),
		              new nlobjSearchFilter('custrecord_ptr_payenddt', null, 'on',ppEndDate)];
		
		var ptrcol = [new nlobjSearchColumn('custrecord_ptr_journalentrydt', null, 'group')];
		
		var ptrrs = nlapiSearchRecord('customrecord_projecttimereview', null, ptrflt, ptrcol);
		
		//Loop through each Unique Journal Entry date and process them.
		
		/**
		 * Next Step JSON includes information regarding PROCESSED Journal Entry Date and it's reference to generated Journal Entry.
		 * - When process completes going through ALL data elements for one or two journal entry date, 
		 * 	 it will reschedule and pass in STRING version of THIS JSON Object. 
		 * 		{
		 * 			[JE Date]:
		 * 			{
		 * 				'status':[Error or Complete],
		 * 				'errormsg':'',
		 * 				'jeinfo':[JE Related INFO]
		 *			},
		 *			...
		 * 		}
		 * 
		 *   This approach allows us to generate ONE or TWO Journal Entries with ALL the info AND allow for 
		 *   updating of all PTR datas without having to put in complex rescheduling logic. 
		 *   When Above JSON is passed in, script will ONLY be concerned with Updating the data.
		 */
		var nextStepJson = {};
		for (var p=0; ptrrs && p < ptrrs.length; p+=1)
		{
			var journalEntryDate = ptrrs[p].getValue('custrecord_ptr_journalentrydt', null, 'group');
			try 
			{
				//Make sure we have journalEntryDate.
				if (!journalEntryDate)
				{
					throw nlapiCreateError(
						'JOURNALENTRY-ERR', 
						'Missing journal entry date for this pay period', 
						true
					);
				}
				
				log('debug','Journal Entry Processing',journalEntryDate);
				
				//10/26/2015 - Change
				//	- Need to group it by Employee Subsidiary so that Journals are created PER subsidiary
				var saptrflt = [new nlobjSearchFilter('isinactive', null, 'is', 'F'),
				                new nlobjSearchFilter('custrecord_ptr_procstatus', null, 'noneof',statusmap.Completed),
				                new nlobjSearchFilter('custrecord_ptr_paystartdt', null, 'on', ppFromDate),
				                new nlobjSearchFilter('custrecord_ptr_payenddt', null, 'on', ppEndDate),
				                new nlobjSearchFilter('custrecord_ptr_journalentrydt', null, 'on', journalEntryDate)];
				//Grab unique list of Subsidiaries
				var saptrcol = [new nlobjSearchColumn('subsidiary','custrecord_ptr_employee','group').setSort()];
				var saptrrs = nlapiSearchRecord('customrecord_projecttimereview', null, saptrflt, saptrcol);
				
				//Assume there are results
				for (var sa=0; sa < saptrrs.length; sa+=1)
				{
					var subsidiary = saptrrs[sa].getValue('subsidiary','custrecord_ptr_employee','group');
					
					//initialize nextStepJson for THIS Journal Entry Date
					nextStepJson[journalEntryDate] = {};
					nextStepJson[journalEntryDate][subsidiary] = {
						'status':'',
						'errormsg':'',
						'jeinfo':''
					};
					
					//1. Grab ALL PTR Data for THIS Journal Entry Date by THIS Subsidiary
					var aptrflt = [new nlobjSearchFilter('isinactive', null, 'is', 'F'),
					               new nlobjSearchFilter('custrecord_ptr_procstatus', null, 'noneof',statusmap.Completed),
					               new nlobjSearchFilter('custrecord_ptr_paystartdt', null, 'on', ppFromDate),
					               new nlobjSearchFilter('custrecord_ptr_payenddt', null, 'on', ppEndDate),
					               new nlobjSearchFilter('custrecord_ptr_journalentrydt', null, 'on', journalEntryDate),
					               new nlobjSearchFilter('subsidiary','custrecord_ptr_employee','anyof',subsidiary)];
					
					
					var aptrcol = [new nlobjSearchColumn('internalid'),
					               new nlobjSearchColumn('custrecord_ptr_journalentrydt'),
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
					               new nlobjSearchColumn('custrecord_ptr_payextendedamt')];
					
					//Create search to grab EVERY Possible Records
					var aptrsObj = nlapiCreateSearch('customrecord_projecttimereview', aptrflt, aptrcol);
					var aptrRss = aptrsObj.runSearch();
					//Total List of ALL Project Time Review Results for THIS Pay Period/Journal Entry
					var ptrrslist = [];
					//flag for while loop
				    var crscnt = 1000;
				    var cnextStartIndex = 0;
				    var cnextEndIndex = 1000;
				    //Run while loop to grab ALL results. 
				    while (crscnt==1000) {
				    	var aptrRssrs = aptrRss.getResults(cnextStartIndex, cnextEndIndex);
				    	log('debug','size',aptrRssrs.length);
				    	ptrrslist = ptrrslist.concat(aptrRssrs);
				    	
				    	crscnt = aptrRssrs.length;
				    	cnextStartIndex = cnextEndIndex;
				    	cnextEndIndex = cnextEndIndex + 1000;
				    }
					
					//2. Loop through each results and populate new Journal Entry to generate
					if (ptrrslist && ptrrslist.length > 0)
					{
						//Use Employees Subsidiary as Journal Entry Subsidiary.
						log('debug','employee subsidiary', subsidiary);
						//This JSON Object tracks if an Employee CREDIT has been added to the Line
						var empLineJson = {},
							//This JSON tracks total Pay (Adjusted Calculation) By an Employee for THIS Journal Entry. 
							//If it crosses months, we need to make sure proper amounts are CREDITED FOR THAT Month
							empJeTotalPay = {};
						
						//Loop through and find total Amounts for each Employee.
						for (var jj=0; jj < ptrrslist.length; jj+=1)
						{
							var empId = ptrrslist[jj].getValue('custrecord_ptr_employee');
							var jeAmount = ptrrslist[jj].getValue('custrecord_ptr_payextendedamt');
							
							if (!empJeTotalPay[empId])
							{
								empJeTotalPay[empId] = 0.0;
							}
							empJeTotalPay[empId] = (parseFloat(empJeTotalPay[empId]) +
												   parseFloat(jeAmount)).toFixed(2);
						}
						
						log('debug','Total Pay by Employee for JE', JSON.stringify(empJeTotalPay));
						
						var jerec = nlapiCreateRecord(
										'journalentry', 
										{
											recordmode:'dynamic', 
											customform:paramDefaultJeForm
										}
									);
						
						jerec.setFieldValue('subsidiary', subsidiary);
						jerec.setFieldValue('trandate', journalEntryDate);
						jerec.setFieldValue('approved','F');
						jerec.setFieldValue('memo','Payroll redistribution Journal Entry');
						
						
						for (var j=0; j < ptrrslist.length; j+=1)
						{
							var rowjson = {
								'id':ptrrslist[j].getValue('internalid'),
								'employee':ptrrslist[j].getValue('custrecord_ptr_employee'),
								'project':ptrrslist[j].getValue('custrecord_ptr_project'),
								'department':ptrrslist[j].getValue('custrecord_ptr_empdepartment'),
								'projectclass':ptrrslist[j].getValue('custrecord_ptr_projectclass'),
								'location':ptrrslist[j].getValue('custrecord_ptr_emplocation'),
								'account':ptrrslist[j].getValue('custrecord_ptr_account'),
								'totalhours':ptrrslist[j].getValue('custrecord_ptr_totalhoursworked'),
								'totalpay':ptrrslist[j].getValue('custrecord_ptr_totalbasepay'),
								'hourlyrate':ptrrslist[j].getValue('custrecord_ptr_payhourlyrate'),
								'projecthours':ptrrslist[j].getValue('custrecord_ptr_hoursworked'),
								'jeamount':ptrrslist[j].getValue('custrecord_ptr_payextendedamt')
							};
							
							if (!empLineJson[rowjson.employee])
							{
								//Add in a line for CREDIT
								//Select new Line
								
								log('debug','employee // total pay', rowjson.employee+' // '+empJeTotalPay[rowjson.employee]);
								
								jerec.selectNewLineItem('line');
								jerec.setCurrentLineItemValue('line', 'account', paramDefaultSalaryExpAcct);
								jerec.setCurrentLineItemValue('line', 'entity', '');
								jerec.setCurrentLineItemValue('line', 'credit', empJeTotalPay[rowjson.employee]);
								jerec.setCurrentLineItemValue('line', 'department', '');
								jerec.setCurrentLineItemValue('line', 'location', '');
								jerec.setCurrentLineItemValue('line', 'class', '');
								jerec.setCurrentLineItemValue('line', 'memo', 'Payroll redistribution Journal Entry');
								jerec.setCurrentLineItemValue('line', 'custcol_empname', rowjson.employee);
								jerec.commitLineItem('line', false);
								
								//Set the flag so that it doesn't get processed again
								empLineJson[rowjson.employee] = empJeTotalPay[rowjson.employee];
							}
							
							//ADD in Redistribution by Project 
							jerec.selectNewLineItem('line');
							jerec.setCurrentLineItemValue('line', 'account', rowjson.account);
							jerec.setCurrentLineItemValue('line', 'entity', rowjson.project);
							jerec.setCurrentLineItemValue('line', 'debit', rowjson.jeamount);
							jerec.setCurrentLineItemValue('line', 'department', rowjson.department);
							jerec.setCurrentLineItemValue('line', 'location', rowjson.location);
							jerec.setCurrentLineItemValue('line', 'class', rowjson.projectclass);
							jerec.setCurrentLineItemValue('line', 'custcol_empname', rowjson.employee);
							jerec.setCurrentLineItemValue('line', 'custcol_hoursworked', rowjson.projecthours);
							jerec.setCurrentLineItemValue('line', 'custcol_payhourlyrate', rowjson.hourlyrate);
							jerec.setCurrentLineItemValue(
								'line', 
								'memo',
								'Payroll redistribution Journal Entry'
							);
							jerec.commitLineItem('line', false);
							
						}
						
						log('debug','jerec JSON',JSON.stringify(jerec));
						
						//Save the Journal Entry.
						//If it fails, it will get logged as nextStepJson Error
						var jeid = nlapiSubmitRecord(jerec, true, true);
						
						nextStepJson[journalEntryDate][subsidiary] = {
							'status':statusmap.Completed,
							'errormsg':'',
							'jeinfo':jeid
						};
					}
					
				}//END Loop by Subsidiary
			}
			catch (procerr)
			{
				//Mark it as ERROR for THIS Group of Journal Entry
				nextStepJson[journalEntryDate] = {
					'ERROR': {
						'status':statusmap.Error,
						'errormsg':getErrText(procerr),
						'jeinfo':''
					}

				};
			}
			
		} //End Looping through all UNIQUE Journal Entry Dates
		
		log('debug','nextStepJson',JSON.stringify(nextStepJson));
		
		//********************* RESCHEDULE TO NEXT STEP ***************************
		/**
		 * Reschedule THIS script to run finalize step. Finalize step will pass in JSON string so that
		 * it can update all processed PTR records
		 */		
		var nextStepParam = {
			'custscript_sb143_triggeruser':paramTriggerUser,
			'custscript_sb143_pprange':paramPayPeriodRange,
			'custscript_sb143_finalizejson':JSON.stringify(nextStepJson)
		};
		
		var nextStepStatus = nlapiScheduleScript(
								nlapiGetContext().getScriptId(), 
								nlapiGetContext().getDeploymentId(), 
								nextStepParam
							 );
		
		log(
			'audit',
			'Reschedule for Finalize Step',
			'Status: '+nextStepStatus+' // '+
				'Following JSON Passed to finalize step: '+
				JSON.stringify(nextStepJson)
		);
		
	}//IF/Else Check to JE Creation or Finalize Step
}
