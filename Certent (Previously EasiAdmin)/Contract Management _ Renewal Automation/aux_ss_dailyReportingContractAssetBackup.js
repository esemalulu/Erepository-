/**
 * This scheduled script runs daily and sync up reporting contract and reporting asset records
 * with active contract and active asset records.
 * The process runs daily for previous day. 
 * 
 * IMPORTANT NOTE:
 * - When previous day is 1st of the month, it will CREATE new row in the Reporting contract and asset records
 * 		for ALL Active or Pending Renewal contracts
 * 
 * - When previous day is any other day, it will ONLY look at last modified contract date of yesterday
 * 		and create or update Reporting contract and asset records. 
 * 
 * AT any given point in time, Active record values and Reporting record values for the period will be the same.
 *
 * There will be 24 hour delay in processing
 * 
 * Version    Date            Author           Remarks
 * 1.00       30 Mar 2016     json
 *
 */

//Script Level Setting
//Last Proc ID
var	paramLastProcId = nlapiGetContext().getSetting('SCRIPT','custscript_sb144_lastprocid'),
	paramCustomTodayDate = nlapiGetContext().getSetting('SCRIPT','custscript_sb144_custtoday');

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
	paramDefaultAnnualUplift = nlapiGetContext().getSetting('SCRIPT','custscript_sb131_defupliftperct'); //Default Annual uplift
	

if (paramCraCcNotifier)
{
	paramCraCcNotifier = paramCraCcNotifier.split(',');
}

if (paramRecurringItemTypes)
{
	paramRecurringItemTypes = paramRecurringItemTypes.split(',');
}

function dailyCtrAsetBackup(type) 
{
	var curDate = new Date(),
		//firstDate is first day of current date.
		firstDate = '',
		//prevDate is 1 day prior to curDate
		prevDate='',
		//Internal ID of accounting period (Month Year) value that matches first day of the month
		
		//execFirstDate refers to FIRST Date of previous days Month.
		//These values is used since THIS Script runs in 24 hour delay. 
		//TODAY we Run for YESTERDAY.
		//	So if TODAY is 4/1/2016, Prevoius day would be 3/31/2016 and execFirstDate would be 3/1/2016
		//		  TODAY is 4/2/2016, Previous day would be 4/1/2016 and execFirstDate would be 4/1/2016
		execFirstDate = '',
		
		//execPrevFirstDate refers to FIRST Date of execFirstDate - 1 Months.
		//		So if TODAY is 4/1/2016, Prevoius day would be 3/31/2016, execFirstDate would be 3/1/2016 and execPrevFirstDate = 2/1/2016
		//		  TODAY is 4/2/2016, Previous day would be 4/1/2016 and execFirstDate would be 4/1/2016  and execPrevFirstDate = 3/1/2016
		
		execPrevFirstDate = '',
		
		//acctPeriod and prevAcctPeriod are based on execFirstDate and execPrevDate
		acctPeriodId = '',
		acctPeriodName = '',
		prevAcctPeriodId = '',
		prevAcctPeriodName = '';
	//if custom current date is passed in use that as current date
	if (paramCustomTodayDate)
	{
		curDate = nlapiStringToDate(paramCustomTodayDate);
	}

	log('debug','Current Date as seen by System',curDate+' // '+nlapiDateToString(curDate, 'datetimetz'));
	
	//Using curDate, calculate both first day of the month and previous date value
	firstDate = (curDate.getMonth()+1)+
				'/1/'+
				curDate.getFullYear();
	
	prevDate = nlapiDateToString(
			   		nlapiAddDays(curDate, -1)
			   );
	
	//Calculate and set execFirstDate and exectPrevFirstDate
	// - Turn prevDate (YESTERDAY based on Current date) into Date object
	execFirstDate = nlapiStringToDate(prevDate);
	execFirstDate = new Date( (execFirstDate.getMonth()+1)+'/1/'+execFirstDate.getFullYear());
	execFirstDate = nlapiDateToString(execFirstDate);
	
	//- Use execFirstDate and subtract 1 month to get execPrevFirstDate
	execPrevFirstDate = nlapiDateToString(nlapiAddMonths(nlapiStringToDate(execFirstDate), -1));
	
	log('debug','firstDate // prevDate //execFirstDate//execPrevFirstDate',firstDate+' // '+prevDate+' // '+execFirstDate+' // '+execPrevFirstDate);
	
	//Search and grab matching accounting period value
	var acctprdflt = [new nlobjSearchFilter('startdate', null, 'within', execPrevFirstDate, execFirstDate),
	                  new nlobjSearchFilter('isquarter', null, 'is', 'F'),
	                  new nlobjSearchFilter('isyear', null, 'is', 'F')],
	    acctprdcol = [new nlobjSearchColumn('internalid'),
	                  new nlobjSearchColumn('periodname'),
	                  new nlobjSearchColumn('startdate').setSort(true)],
	    acctprdrs = nlapiSearchRecord('accountingperiod', null, acctprdflt, acctprdcol),
	    
	    //List of contracts to execute against filter, column variables
	    //Eligible contracts are Active, Pending Renewal, Renewed and Delayed.
	    eligibleContractStatusIds = [paramActiveStatusId,
	                                 paramPendingRenewalStatusId,
	                                 paramRenewedStatusId,
	                                 paramDelayedStatusId],
	    ctrflt = [new nlobjSearchFilter('custrecord_crc_status', null, 'anyof',eligibleContractStatusIds),
	              new nlobjSearchFilter('isinactive', null, 'is', 'F')],
	    ctrcol = [new nlobjSearchColumn('internalid').setSort(true),
	              new nlobjSearchColumn('custrecord_crc_dealtype'),
	              new nlobjSearchColumn('custrecord_crc_contractterm'),
	              new nlobjSearchColumn('custrecord_crc_enduser'),
	              new nlobjSearchColumn('custrecord_crc_billingentity'),
	              new nlobjSearchColumn('custrecord_crc_acv'),
	              new nlobjSearchColumn('custrecord_crc_startingacv'),
	              new nlobjSearchColumn('custrecord_crc_targetacv'),
	              new nlobjSearchColumn('custrecord_crc_ctrpillar'),
	              //10/14/2016
	              //Part of Enhancement #2
	              //Need to grab currency value from contract
	              new nlobjSearchColumn('custrecord_crc_ctrcurrency')],
	    ctrrs = null;
	
	//add in filter to continue where it left off
	log('debug','last proc id', paramLastProcId);
	if (paramLastProcId)
	{
		ctrflt.push(new nlobjSearchFilter('internalidnumber', null,'lessthan', paramLastProcId));
	}
	
	//Assume there is a value. Otherwise, let it error out
	//	There will always be two results
	acctPeriodId = acctprdrs[0].getValue('internalid');
	prevAcctPeriodId = acctprdrs[1].getValue('internalid');
	acctPeriodName = acctprdrs[0].getValue('periodname');
	prevAcctPeriodName = acctprdrs[1].getValue('periodname');
	
	log('debug','first Date',firstDate);
	log('debug','prev Date',prevDate);
	log('debug','Acct Period', acctPeriodId+' // '+acctPeriodName);
	log('debug','Prev. Acct Period', prevAcctPeriodId+' // '+prevAcctPeriodName);
	
	try
	{
		//1. Determine the primary contract list to execute against.
		//	 IF it's NOT first day of the month, ONLY execute against last modified date as prev. date
		if (firstDate != prevDate)
		{
			log('debug','Adding last mod date value', prevDate);
			//ctrflt.push(new nlobjSearchFilter('lastmodified', null, 'on', prevDate));
			
			//testing
			ctrflt.push(new nlobjSearchFilter('lastmodified', null,'onorbefore', prevDate));
		}
		
		ctrrs = nlapiSearchRecord('customrecord_axcr_contract', null, ctrflt, ctrcol);
		
		//Keep track of each execution Status
		var errLog = '';
		
		if (ctrrs)
		{
			log('debug','Size of ctrrs', ctrrs.length);
		}
		
		//2. Loop through each Contract and execute the action to backup.
		for (var c=0; ctrrs && c < ctrrs.length; c+=1)
		{
			
			//Grab previous ACV amount
			var prevAcvAmt = 0.0,
				curPeriodAcvId = '',
				ctrId = ctrrs[c].getValue('internalid'),
				ctrDealType = ctrrs[c].getValue('custrecord_crc_dealtype'),
				ctrTerm = ctrrs[c].getValue('custrecord_crc_contractterm'),
				ctrEndUser = ctrrs[c].getValue('custrecord_crc_enduser'),
				ctrBillComp = ctrrs[c].getValue('custrecord_crc_billingentity'),
				ctrAcvAmt = ctrrs[c].getValue('custrecord_crc_acv'),
				ctrStartAcvAmt = ctrrs[c].getValue('custrecord_crc_startingacv'),
				ctrTargetAcvAmt = ctrrs[c].getValue('custrecord_crc_targetacv'),
				
				//9/19/2016
				ctrPillars = ctrrs[c].getValue('custrecord_crc_ctrpillar'),
				
				//10/14/2016
	            //Part of Enhancement #2
	            //Need to grab currency value from contract
	            ctrCurrency = ctrrs[c].getValue('custrecord_crc_ctrcurrency'),
				
				//Grab previous Months' Value
				prevCurPeriods = [prevAcctPeriodId, acctPeriodId];
				prevflt = [new nlobjSearchFilter('custrecord_cracv_contractref', null, 'anyof', ctrId),
				           new nlobjSearchFilter('isinactive', null, 'is','F'),
				           new nlobjSearchFilter('custrecord_cracv_captureperiod', null, 'anyof', prevCurPeriods)],
				prevcol = [new nlobjSearchColumn('custrecord_cracv_capturedate').setSort(true),
				           new nlobjSearchColumn('internalid'),
				           new nlobjSearchColumn('custrecord_cracv_captureperiod'),
				           new nlobjSearchColumn('custrecord_cracv_acv')],
				prevrs = nlapiSearchRecord('customrecord_axcr_acv', null, prevflt, prevcol),
				
				assetflt = [new nlobjSearchFilter('custrecord_cra_contract', null, 'anyof', ctrId),
				            new nlobjSearchFilter('isinactive', null, 'is', 'F')],
				assetcol = [new nlobjSearchColumn('custrecord_cra_enduser'),
				            new nlobjSearchColumn('custrecord_cra_billingentity'),
				            new nlobjSearchColumn('custrecord_cra_assetpillar'),
				            new nlobjSearchColumn('custrecord_cra_assetstatus'),
				            new nlobjSearchColumn('custrecord_cra_entstartdate'),
				            new nlobjSearchColumn('custrecord_cra_entenddate'),
				            new nlobjSearchColumn('custrecord_cra_isaddedtocontract'),
				            new nlobjSearchColumn('custrecord_cra_isaddoninstallbase'),
				            new nlobjSearchColumn('custrecord_cra_iscancelled'),
				            new nlobjSearchColumn('custrecord_cra_recurring'),
				            //7/17/2016 - Adding mapping to Is Concession
				            new nlobjSearchColumn('custrecord_cra_isconcession'),
				            new nlobjSearchColumn('custrecord_cra_item'),
				            new nlobjSearchColumn('custrecord_cra_itemqty'),
				            new nlobjSearchColumn('custrecord_cra_itemlistprice'),
				            new nlobjSearchColumn('custrecord_cra_actualsalesprice'),
				            new nlobjSearchColumn('custrecord_cra_originalsalesprice'),
				            new nlobjSearchColumn('custrecord_cra_itemrenewedamt'),
				            new nlobjSearchColumn('custrecord_cra_parentitemgrp'),
				            new nlobjSearchColumn('custrecord_cra_parentitemgrpqty'),
				            new nlobjSearchColumn('custrecord_cra_pricingtier'),
				            new nlobjSearchColumn('custrecord_cra_billingschedule'),
				            new nlobjSearchColumn('custrecord_cra_linkedso'),
				            new nlobjSearchColumn('custrecord_cra_linkedopp')],
				cassetrs = nlapiSearchRecord('customrecord_axcr_assets', null, assetflt, assetcol);
			
			//9/19/2016
			// Convert to an array
			if (ctrPillars)
			{
				ctrPillars = ctrPillars.split(',');
			}
				
			log('debug','Processing Contract', ctrId);
				
			//3. Look through prevrs result set and determine next step.
			//	 - Since we are only looking for current and previous reporting contract data, 
			// 	   we will always have max 2 records returned
			//	 - As we loop through, we determine two things
			//		IF prev period exists, set prevAcvAmt
			//		If current period exists, set curPeriodAcvId
			for (var pcr=0; prevrs && pcr < prevrs.length; pcr+=1)
			{
				if (prevrs[pcr].getValue('custrecord_cracv_captureperiod') == prevAcctPeriodId)
				{
					log('debug','---- Matched Prev Period',prevAcctPeriodName+' // Setting prevAcvAmt='+prevrs[pcr].getValue('custrecord_cracv_acv'));
					
					prevAcvAmt = prevrs[pcr].getValue('custrecord_cracv_acv');
				}
				else if (prevrs[pcr].getValue('custrecord_cracv_captureperiod') == acctPeriodId)
				{
					log('debug','---- Current Period Exists. Update', acctPeriodName+' Exists. Load and Update instead of create');
					curPeriodAcvId = prevrs[pcr].getValue('internalid');
				}
			}
			
			/************ Core Process Steps ************/
			//Delta is calculated as Current Contract - Prev Contract
			var deltaValue = parseFloat(ctrAcvAmt) - parseFloat(prevAcvAmt),
				rptCtrRec = null;
			
			//log('debug','deltaValue',deltaValue);
			
			//Each step will be wrapped in try/catch block to ensure proper error reporting
			//	Parent try/catch block will simply write it errLog variable 
			try
			{
				//4A. If NO Current Period Reporting Contract is found, Create One
				if (!curPeriodAcvId)
				{
					try
					{
						rptCtrRec = nlapiCreateRecord('customrecord_axcr_acv', {recordmode:'dynamic'});
						
						rptCtrRec.setFieldValues('custrecord_cracv_ctrpillar', ctrPillars);
						
						rptCtrRec.setFieldValue('custrecord_cracv_contractref', ctrId);
						rptCtrRec.setFieldValue('custrecord_cracv_dealtype', ctrDealType);
						
						rptCtrRec.setFieldValue('custrecord_cracv_capturedate', nlapiDateToString(curDate));
						rptCtrRec.setFieldValue('custrecord_cracv_captureperiod', acctPeriodId);
						
						rptCtrRec.setFieldValue('custrecord_cracv_startingacv', ctrStartAcvAmt);
						rptCtrRec.setFieldValue('custrecord_cracv_acv', ctrAcvAmt);
						rptCtrRec.setFieldValue(
							'custrecord_cracv_acvdelta',
							deltaValue
						);
						rptCtrRec.setFieldValue('custrecord_cracv_targetacv', ctrTargetAcvAmt);
						rptCtrRec.setFieldValue('custrecord_cracv_contractterms', ctrTerm);
						rptCtrRec.setFieldValue('custrecord_cracv_enduser', ctrEndUser);
						rptCtrRec.setFieldValue('custrecord_cracv_billingcustomer', ctrBillComp);
						
						//10/14/2016
			            //Part of Enhancement #2
			            //Need to set acv currency with contract currency
						rptCtrRec.setFieldValue('custrecord_cracv_ctrcurrency', ctrCurrency);
			            
						//Save the new ACV Record
						curPeriodAcvId = nlapiSubmitRecord(rptCtrRec, true, true);
						
						log('debug','---- Step 4A. Reporting Ctr created', curPeriodAcvId);
					}
					catch (step4aerr)
					{
						throw nlapiCreateError(
							'RPT_CTR_ERR_STEP4A', 
							'Creating Reporting Contract Record for '+acctPeriodName+' Failed: '+getErrText(step4aerr), 
							true
						);
					}
					
				}//END Step 4A
				
				//4B. If curPeriodAcvId existed previously, UPDATE the Record.
				//	  This step can happen if It contract was modified
				else
				{
					try
					{
						//10/14/2016
			            //Part of Enhancement #2
						//Need to set acv currency with contract currency
						var rptUpdFlds = ['custrecord_cracv_dealtype','custrecord_cracv_capturedate','custrecord_cracv_startingacv',
						                  'custrecord_cracv_acv','custrecord_cracv_acvdelta','custrecord_cracv_targetacv',
						                  'custrecord_cracv_contractterms','custrecord_cracv_enduser','custrecord_cracv_billingcustomer',
						                  'custrecord_cracv_ctrpillar',
						                  'custrecord_cracv_ctrcurrency'],
							rptUpdVals = [ctrDealType, nlapiDateToString(curDate), ctrStartAcvAmt, 
							              ctrAcvAmt, deltaValue, ctrTargetAcvAmt, 
							              ctrTerm, ctrEndUser, ctrBillComp, ctrPillars,
							              ctrCurrency];
						
						nlapiSubmitField('customrecord_axcr_acv', curPeriodAcvId, rptUpdFlds, rptUpdVals, true);
						
						log('debug','---- Step 4B. Reporting Ctr Updated', curPeriodAcvId);
					}
					catch (step4berr)
					{
						throw nlapiCreateError(
							'RPT_CTR_ERR_STEP4B', 
							'Updating Reporting Contract Record for '+acctPeriodName+' Failed: '+getErrText(step4berr), 
							true
						);
					}
					
				}//END Step 4B
				 
				
				//5. Clear out ALL Matching Reporting Asset for THIS Reporting Contract
				//	 At this point, we can assume current reporting period contract exists.
				try
				{
					//A. Search for ALL Reporting Assets for THIS reporting contract
					var rptasflt = [new nlobjSearchFilter('custrecord_crah_contractacv', null, 'anyof', curPeriodAcvId)],
						rptasrs = nlapiSearchRecord('customrecord_axcr_cras_history', null, rptasflt, null);
					for (var rd=0; rptasrs && rd < rptasrs.length; rd+=1)
					{
						nlapiDeleteRecord('customrecord_axcr_cras_history', rptasrs[rd].getId());
					}
					
					log('debug','---- Step 5. Deleted Previous Reporting Assets (History)', curPeriodAcvId);
					
				}
				catch (step5err)
				{
					throw nlapiCreateError(
						'RPT_CTR_ERR_STEP5', 
						'Deleting Reporting Asset for Reporting Contract ID '+curPeriodAcvId+' Failed: '+getErrText(step5err), 
						true
					);
				}//END step 5
				
				
				//6. Go through current asset records and add to reporting assets for THIS Reporting Contract
				var assetHistoryAdded = [];
				try
				{
					for (var ca=0; cassetrs && ca < cassetrs.length; ca+=1)
					{
						var aHistRec = nlapiCreateRecord('customrecord_axcr_cras_history', {recordmode:'dynamic'});
						aHistRec.setFieldValue('custrecord_crah_contractacv',curPeriodAcvId);
						aHistRec.setFieldValue('custrecord_crah_captureddate', nlapiDateToString(curDate));
						aHistRec.setFieldValue('custrecord_crah_enduser',cassetrs[ca].getValue('custrecord_cra_enduser'));
						aHistRec.setFieldValue('custrecord_crah_assetpillar',cassetrs[ca].getValue('custrecord_cra_assetpillar'));
						aHistRec.setFieldValue('custrecord_crah_billingentity',cassetrs[ca].getValue('custrecord_cra_billingentity'));
						aHistRec.setFieldValue('custrecord_crah_assetstatus',cassetrs[ca].getValue('custrecord_cra_assetstatus'));
						aHistRec.setFieldValue('custrecord_crah_entstartdate',cassetrs[ca].getValue('custrecord_cra_entstartdate'));
						aHistRec.setFieldValue('custrecord_crah_entenddate',cassetrs[ca].getValue('custrecord_cra_entenddate'));
						aHistRec.setFieldValue('custrecord_crah_isaddedtocontract',cassetrs[ca].getValue('custrecord_cra_isaddedtocontract'));
						aHistRec.setFieldValue('custrecord_crah_isaddoninstallbase',cassetrs[ca].getValue('custrecord_cra_isaddoninstallbase'));
						aHistRec.setFieldValue('custrecord_crah_iscancelled',cassetrs[ca].getValue('custrecord_cra_iscancelled'));
						aHistRec.setFieldValue('custrecord_crah_recurring',cassetrs[ca].getValue('custrecord_cra_recurring'));
						//7/17/2016 - Add mapping to Is Concession
						aHistRec.setFieldValue('custrecord_crah_isconcession', cassetrs[ca].getValue('custrecord_cra_isconcession'));
						aHistRec.setFieldValue('custrecord_crah_item',cassetrs[ca].getValue('custrecord_cra_item'));
						aHistRec.setFieldValue('custrecord_crah_itemqty',cassetrs[ca].getValue('custrecord_cra_itemqty'));
						aHistRec.setFieldValue('custrecord_crah_itemlistprice',cassetrs[ca].getValue('custrecord_cra_itemlistprice'));
						aHistRec.setFieldValue('custrecord_crah_actualsalesprice',cassetrs[ca].getValue('custrecord_cra_actualsalesprice'));
						aHistRec.setFieldValue('custrecord_crah_originalsalesprice',cassetrs[ca].getValue('custrecord_cra_originalsalesprice'));
						aHistRec.setFieldValue('custrecord_crah_itemrenewedamt',cassetrs[ca].getValue('custrecord_cra_itemrenewedamt'));
						aHistRec.setFieldValue('custrecord_crah_parentitemgrp',cassetrs[ca].getValue('custrecord_cra_parentitemgrp'));
						aHistRec.setFieldValue('custrecord_crah_parentitemgrpqty',cassetrs[ca].getValue('custrecord_cra_parentitemgrpqty'));
						aHistRec.setFieldValue('custrecord_crah_pricingtier',cassetrs[ca].getValue('custrecord_cra_pricingtier'));
						aHistRec.setFieldValue('custrecord_crah_billingschedule',cassetrs[ca].getValue('custrecord_cra_billingschedule'));
						aHistRec.setFieldValue('custrecord_crah_linkedso',cassetrs[ca].getValue('custrecord_cra_linkedso'));
						aHistRec.setFieldValue('custrecord_crah_linkedopp',cassetrs[ca].getValue('custrecord_cra_linkedopp'));
						
						//Create new Asset History Record
						assetHistoryAdded.push(nlapiSubmitRecord(aHistRec, true, true));
					}
					log('debug','---- Step 6. New History Created', 'New History Rec created for report contract id '+curPeriodAcvId);
				}
				catch (step6err)
				{
					throw nlapiCreateError(
						'RPT_CTR_ERR_STEP6', 
						'CR-ACV Record ID '+curPeriodAcvId+' has been created/updated already. '+
						'Error occured while trying backup current assets'+
						'Asset History IDs CREATED: '+assetHistoryAdded+' // '+getErrText(step6err), 
						true
					);
				}
				
			}
			catch (procerr)
			{
				errLog += '<li>Contract ID: '+ctrId+' Failed<br/>'+
						  getErrText(procerr)+'</li>';
				
				log('error','Contract ID '+ctrId+' Failed',getErrText(procerr));
			}
			
			log('debug','<<<<< Done Processing Contract', ctrId+' >>>>>> c index: '+c+' // Remainder: '+nlapiGetContext().getRemainingUsage());
			
			//Reschedule logic 
			//Add In Reschedule Logic
			//Set % completed of script processing
			var pctCompleted = Math.round(((c+1) / ctrrs.length) * 100);
			nlapiGetContext().setPercentComplete(pctCompleted);
			
			//------------ Reschedule check -------------------
			if ((c+1)==1000 || ((c+1) < ctrrs.length && nlapiGetContext().getRemainingUsage() < 2500)) 
			{
				//reschedule
				log(
					'audit',
					'Getting Rescheduled at', 
					'Contract ID '+ctrId
				);
				
				var param = {
					'custscript_sb144_lastprocid':ctrId,
					'custscript_sb144_custtoday':paramCustomTodayDate
				};
				
				//execute reschedule
				nlapiScheduleScript(
					nlapiGetContext().getScriptId(), 
					nlapiGetContext().getDeploymentId(), 
					param
				);
				break;
			}
		}//End For Loop of All active or modified active contracts
		
		//IF There are stuff for errLog, Send it out
		if (errLog)
		{
			nlapiSendEmail(
				-5, 
				paramCraErrorNotifier, 
				'CRA Daily Backup Process Error Log for '+acctPeriodName+' Period', 
				'Following Contract IDs errored during back up process and requires your attention.<br/>'+
					'<ul>'+errLog+'</ul>',
				paramCraCcNotifier,
				null,
				null,
				null,
				true
			);
			
		}
	}
	catch(procerr)
	{
		log('error','Error Running Daily Backup','Current Date: '+nlapiDateToString(curDate)+' // Prev. Date: '+prevDate+' || '+getErrText(procerr));
		//Generate Custom Error Email Notification
		nlapiSendEmail(
			-5, 
			paramCraErrorNotifier, 
			'CRA Daily Backup Process Error for '+acctPeriodName+' Period', 
			'Error Processing Daily Contract/Asset Backup'+
				'. Unexpected Script Termination due to below error.<br/><br/>'+
				getErrText(procerr),
			paramCraCcNotifier,
			null,
			null,
			null,
			true
		);
	}
}
