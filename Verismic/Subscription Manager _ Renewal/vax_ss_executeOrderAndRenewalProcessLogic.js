/**
 * 
 */

//Company Level Preference
var paramSubsMgrClassIds = nlapiGetContext().getSetting('SCRIPT','custscript_64_subsmgrclassids');
var paramPrimaryErrorNotifier = nlapiGetContext().getSetting('SCRIPT', 'custscript_64_subsmgrprimeerr');
var paramDaysBeforeEndDate = nlapiGetContext().getSetting('SCRIPT', 'custscript_64_daysbeforeend');
//9/19/2015 - Added Number of days before end date for Month To Month added as company setting
var paramM2MDaysBeforeEndDate = nlapiGetContext().getSetting('SCRIPT','custscript_64_m2mdaysbeforeend');
//9/19/2015 
//Ignore Billing Schedule defined on the company setting will contain Month to Month ID. 
//This is ONLY used for processing None Month to Month Renewals
var paramIgnoreBillingSchedules = nlapiGetContext().getSetting('SCRIPT','custscript_64_ignorebillschvalues');
if (paramIgnoreBillingSchedules)
{
	paramIgnoreBillingSchedules = paramIgnoreBillingSchedules.split(',');
}

//Script Level Preference
var paramJson = nlapiGetContext().getSetting('SCRIPT', 'custscript_65_procjson');

//Script File Constant
var paramMonthToMonthId = '9';

//Other Renewal Script Level Preference
var paramRenewalLastProcCustId = nlapiGetContext().getSetting('SCRIPT','custscript_66_lastproccustid');
var paramCustomDateToProc = nlapiGetContext().getSetting('SCRIPT','custscript_66_custrenewaldate');
var paramOtherCustomCustomerId = nlapiGetContext().getSetting('SCRIPT','custscript_66_custclientid');

//Month to Month Renewal Script Level Preference
var paramM2MRenewalLastProcAssetId = nlapiGetContext().getSetting('SCRIPT','custscript_67_lastprocassetid');
var paramM2MCustomDateToProc = nlapiGetContext().getSetting('SCRIPT','custscript_67_custrenewaldate');
var paramM2MCustomCustomerId = nlapiGetContext().getSetting('SCRIPT','custscript_67_custclientid');

//--------------------------------------------------------------------------------------------------------

/**
 * Month to Month renewal process has been taken out as it's own function.
 * It does share many of the same element with all other renewal process
 */
function processMonthToMonthRenewals()
{
	if (!paramM2MDaysBeforeEndDate || isNaN(paramM2MDaysBeforeEndDate))
	{
		throw nlapiCreateError('SUBSMGR-ERR', 'Month to Month Days before Ent. End Date is Missing or is Not a Number', false);
		return;
	}
	
	//By default, we will add 3 days (or what ever days specified on the preference) to Current Date
	var currentDate = new Date();
	
	//Add Business Days Not Calendar Days
	//getBusinessDate function is defined in the Utility file
	//var m2mRenewalProcessDate = getBusinessDate(currentDate, paramM2MDaysBeforeEndDate, false);
	//Modify to look 5 calendar days ahead instead due to bug in looking at business days
	var m2mRenewalProcessDate = nlapiDateToString(nlapiAddDays(currentDate, 5));
	
	log('debug','current m2m renewal',currentDate+' // '+m2mRenewalProcessDate);
	if (paramM2MCustomDateToProc)
	{
		//HOWEVER, if custom M2M date is passed in, use that as Month to Month renewalProcessDate
		m2mRenewalProcessDate = paramM2MCustomDateToProc;
		//currentDate of custom process date would be renewalProcessDate - paramM2MDaysBeforeEndDate
		//Still need to identify what the current date is BASED on custom renewal process date passed in.
		
		//Go back in Business Days NOT Calendar Days
		currentDate = getBusinessDate(nlapiStringToDate(m2mRenewalProcessDate), paramM2MDaysBeforeEndDate, true);
		//convert this to date object
		currentDate = nlapiStringToDate(currentDate);
	}
	
	log('debug','Today - Param',new Date()+' // '+paramM2MDaysBeforeEndDate+' // '+m2mRenewalProcessDate);
	
	//Search for matching Month to Month Assets
	//IMPORTANT:
	//Month to Month Process assumes each asset is unique with it's OWN opportunity. 
	//	Thus, it will NOT group all matching Items Per Customer. 
	//	Reschedule logic is based off of Asset ID
	var pflt = [new nlobjSearchFilter('isinactive', null, 'is', 'F'),
	            new nlobjSearchFilter('custrecord_axsm_enddate', null, 'on', m2mRenewalProcessDate),
	            //Status of Active
	            new nlobjSearchFilter('custrecord_axsm_status', null, 'anyof', '1'),
	            //Month To Month Assets ONLY
	            new nlobjSearchFilter('custrecord_axsm_billschedule', null, 'anyof', paramMonthToMonthId)];
	
	if (paramM2MCustomCustomerId)
	{
		pflt.push(new nlobjSearchFilter('custrecord_axsm_customer', null, 'anyof', paramM2MCustomCustomerId));
	}
	
	if (paramM2MRenewalLastProcAssetId)
	{
		pflt.push(new nlobjSearchFilter('internalidnumber', 'custrecord_axsm_customer', 'lessthan', paramM2MRenewalLastProcAssetId));	
	}
	
	var pcol = [new nlobjSearchColumn('internalid').setSort(true), 
	            new nlobjSearchColumn('custrecord_axsm_customer'), //Customer
	            new nlobjSearchColumn('custrecord_axsm_item'), //Item
	            new nlobjSearchColumn('custrecord_axsm_qty'), //Qty
	            new nlobjSearchColumn('custrecord_axsm_rate'), //Rate
	            new nlobjSearchColumn('custrecord_axsm_amount'), //Amount
	            new nlobjSearchColumn('custrecord_axsm_oppref'), //Opportunity Ref.
	            new nlobjSearchColumn('custrecord_axsm_enddate'), //End Date
	            new nlobjSearchColumn('custrecord_axsm_terms'), //Terms
	            new nlobjSearchColumn('custrecord_axsm_termmonths'),// Terms in MOnths
	            new nlobjSearchColumn('salesrep', 'custrecord_axsm_customer'), //customer sales rep
                new nlobjSearchColumn('leadsource', 'custrecord_axsm_customer'), //customer lead source
                new nlobjSearchColumn('subsidiary', 'custrecord_axsm_customer')]; //customer subsidiary
	
	var prs = nlapiSearchRecord('customrecord_axsubsmanager', null, pflt, pcol);
	
	var procDebugLog = '';
	var hasError = false;
	//Loop through each customer and execute
	for (var i=0; prs && i < prs.length; i+=1)
	{
	
		//Build JSON of result row for easy access
		var pjson = {
			'id':prs[i].getValue('internalid'),
			'customer':prs[i].getValue('custrecord_axsm_customer'),
			'item':prs[i].getValue('custrecord_axsm_item'),
			'qty':prs[i].getValue('custrecord_axsm_qty'),
			'rate':prs[i].getValue('custrecord_axsm_rate'),
			'amount':prs[i].getValue('custrecord_axsm_amount'),
			'oppref':prs[i].getValue('custrecord_axsm_oppref'),
			'enddate':prs[i].getValue('custrecord_axsm_enddate'),
			'terms':prs[i].getValue('custrecord_axsm_terms'),
			'termsinmonths':prs[i].getValue('custrecord_axsm_termmonths'),
			'salesrep':prs[i].getValue('salesrep', 'custrecord_axsm_customer'),
			'salesrepdept':'',
			'leadsource':prs[i].getValue('leadsource', 'custrecord_axsm_customer'),
			'subsidiary':prs[i].getValue('subsidiary', 'custrecord_axsm_customer'),
			'revrecstart':'',
			'revrecend':''
		};
		
		try
		{
			//Make sure oppref is filled in
			if (!pjson.oppref)
			{
				throw nlapiCreateError('M2MRENEWAL-ERR', 'Error Generating Month2Month Sales Order due to Missing Opportunity', true);
			}
			
			//Set New Rev Rec Start and End Dates
			pjson.revrecstart = nlapiDateToString(
									nlapiAddDays(
										nlapiStringToDate(pjson.enddate),
										1
									)
								);
			
			//For Monthly renewal, we need to make sure this is TRUELY ONE Month. 
			//Add 1 day to previous enddate to get new start date
			//Subtract 1 day from NEW revrecend to get FINAL NEW END Date
			var newRevRecEndDate = nlapiAddDays(
										nlapiAddMonths(
									  		nlapiStringToDate(pjson.revrecstart), 
									  		pjson.termsinmonths
									  	), 
									  	-1
								   );
									
			pjson.revrecend = nlapiDateToString(newRevRecEndDate);
			
			//Set salesrep department
			pjson.salesrepdept = nlapiLookupField(
									'employee',
									pjson.salesrep, 
									'department',
									false
								);
			
			log('debug','PJSON',JSON.stringify(pjson));
			
			procDebugLog += 'M2M Renewal Date: '+m2mRenewalProcessDate+' for Customer ID: '+pjson.customer+' // Asset ID: '+pjson.id+'<br/>';
			
			//2/5/2016-Bug fix to enable selection of Opportunity when SO is being generated.
			//			NS must have changed this validation because it no longer works if opp has closed status.
			//8 - Issued Proposal, 13 - Closed won
			var oppRec = nlapiLoadRecord('opportunity',pjson.oppref);
			if (oppRec.getFieldValue('entitystatus') == '13')
			{
				oppRec.setFieldValue('entitystatus','8');
				//Submit it
				nlapiSubmitRecord(oppRec, true, true);
				log('debug','Changed OPP Status','Opp Status changed to 8 for '+pjson.oppref);
			}
			
			var m2mso = nlapiTransformRecord('opportunity', pjson.oppref, 'salesorder', {recordmode:'dynamic'});
			m2mso.setFieldValue('entity', pjson.customer);
			
			var paymentMethod = m2mso.getFieldValue('paymentmethod');
			log('debug','payment method',paymentMethod);
			
			m2mso.setFieldValue('trandate',nlapiDateToString(currentDate));
			m2mso.setFieldValue('leadsource',pjson.leadsource);
			m2mso.setFieldValue('salesrep',pjson.salesrep);
			m2mso.setFieldValue('department',pjson.salesrepdept);
			m2mso.setFieldValue('terms',pjson.terms);
			//When term is set to Credit Card, payment method gets cleared out while all other CC info stays.
			m2mso.setFieldValue('paymentmethod', paymentMethod);
			//3/29/2016 - Request to stop setting on the Main level and MOVE to Line Level
			//m2mso.setFieldValue('class','2'); //Default to Renewal
			m2mso.setFieldValue('otherrefnum','Month to Month Renewal'); //Default value
			
			//Delete ANY line that's there and replace it with information from Asset Data
			if (m2mso.getLineItemCount('item') > -1)
			{
				for (var d=m2mso.getLineItemCount('item'); d >= 1; d--)
				{
					m2mso.removeLineItem('item', d, false);
				}
			}
			
			m2mso.selectNewLineItem('item');
			m2mso.setCurrentLineItemValue('item', 'item', pjson.item);
			m2mso.setCurrentLineItemValue('item', 'quantity',pjson.qty);
			m2mso.setCurrentLineItemValue('item', 'revrecterminmonths', pjson.termsinmonths);
			m2mso.setCurrentLineItemValue('item', 'rate', pjson.rate);
			m2mso.setCurrentLineItemValue('item', 'custcol_assetid', pjson.id);
			m2mso.setCurrentLineItemValue('item', 'billingschedule', paramMonthToMonthId); //Default to Month to Month
			m2mso.setCurrentLineItemValue('item', 'revrecstartdate', pjson.revrecstart);
			m2mso.setCurrentLineItemValue('item', 'revrecenddate', pjson.revrecend);
			//3/29/2016 - set class at the line level - Default to Renewal (2)
			m2mso.setCurrentLineItemValue('item', 'class', '2'); 
			m2mso.commitLineItem('item');
			
			//First Try to save this SO
			try
			{
				m2mso.setFieldValue('opportunity', pjson.oppref);
				
				log('debug','m2mso JSON',JSON.stringify(m2mso));
				
				var renewalSoId = nlapiSubmitRecord(m2mso, true, true);
				procDebugLog += ' - Success Created Renewal SO ID '+renewalSoId+'<br/>';
				
				//If successful, update THIS asset to Pending Renewal
				/**
				 * TURNED OFF for MOnthly as requested.
				 * CODE will live though incase they change their mind
				try
				{
					nlapiSubmitField('customrecord_axsubsmanager', pjson.id, 'custrecord_axsm_status', '3', true); //3=Pending Renewal
					procDebugLog += ' - SUCCESS updated status on assetID '+pjson.id+' to 3 (Pending Renewal)'+'<br/>';
				}
				catch (assetstatusupderr)
				{
					log('error','Status Update Err on asset Record '+pjson.id+' to 3 (Pending Renewal).');
					procDebugLog += ' - Error Status Update on asset Record '+pjson.id+' to 3 (Pending Renewal): '+getErrText(assetstatusupderr)+'<br/>';
					hasError = true; 
					//Delete SO that was created
					try
					{
						nlapiDeleteRecord('salesorder', renewalSoId);
						procDebugLog += ' - SUCCESS DELETED Generated Renewal SO ID '+renewalSoId+'<br/>';
					}
					catch (sodeleteerr)
					{
						log('error','Failed to Delete Generated Renewal SO ID','SO ID '+renewalSoId+' Failed: '+getErrText(sodeleteerr));
						procDebugLog += ' - FAILED to DELETED Generated Renewal SO ID '+renewalSoId+' // '+getErrText(sodeleteerr)+'<br/>';
						hasError = true; 
					}
				}
				*/
			}
			catch (soerr)
			{
				log('error','Failed to create Renewal SO',getErrText(soerr));
				procDebugLog += ' - FAILED to generate Renewal Sales Order // '+getErrText(soerr)+'<br/>';
				hasError = true; 
			}
			
		}
		catch (m2mprocerr)
		{
			log('error','M2M Renewal Err', getErrText(m2mprocerr));
			procDebugLog += ' - Error Creation Renewal SO from Opportunity: '+getErrText(m2mprocerr)+'<br/>';
			hasError = true; 
		}
		
		
		//Set % completed of script processing
		var pctCompleted = Math.round(((i+1) / prs.length) * 100);
		nlapiGetContext().setPercentComplete(pctCompleted);
		
		//reschedule if gov is running low or legnth is 1000
		if ((i+1)==1000 || ((i+1) < prs.length && nlapiGetContext().getRemainingUsage() < 1000))
		{
			log('audit','Rescheduling at ','Asset ID: '+pjson.id);
			var rparam = {
				'custscript_67_lastprocassetid':pjson.id
			};
			
			nlapiScheduleScript(nlapiGetContext().getScriptId(), nlapiGetContext().getDeploymentId(), rparam);
			break;
		}
	}
	
	if (procDebugLog)
	{
		//paramPrimaryErrorNotifier
		nlapiSendEmail(-5, paramPrimaryErrorNotifier, 'Verismic Month to Month Renewal Process Log '+currentDate, procDebugLog);
	}
	
}

/**
 * processRenewals is SCHEDULED script that runs daily to execute renewals against each of the subscription manager assets.
 * Grab all Asset records where Entitle End Date is on TODAY - paramDaysBeforeEndDate
 * 
 */
function processRenewals()
{

	if (!paramDaysBeforeEndDate || isNaN(paramDaysBeforeEndDate))
	{
		throw nlapiCreateError('SUBSMGR-ERR', 'Days before Ent. End Date is Missing or is Not a Number', false);
		return;
	}
	
	//By default, we will add 60 days (or what ever days specified on the preference) to Current Date
	var currentDate = new Date();
	var renewalProcessDate = nlapiDateToString(nlapiAddDays(currentDate, paramDaysBeforeEndDate));
	if (paramCustomDateToProc)
	{
		//HOWEVER, if custom date is passed in, use that as renewalProcessDate
		renewalProcessDate = paramCustomDateToProc;
		//currentDate of custom process date would be renewalProcessDate - paramDaysBeforeEndDate
		//Still need to identify what the current date is BASED on custom renewal process date passed in.
		currentDate = nlapiAddDays(nlapiStringToDate(renewalProcessDate), -1*(parseInt(paramDaysBeforeEndDate)));
	}
	
	log('debug','Today - Param',new Date()+' // '+paramDaysBeforeEndDate+' // '+renewalProcessDate);
	
	var pflt = [new nlobjSearchFilter('isinactive', null, 'is', 'F'),
	            new nlobjSearchFilter('custrecord_axsm_enddate', null, 'on', renewalProcessDate),
	            //Status of Active
	            new nlobjSearchFilter('custrecord_axsm_status', null, 'anyof', '1')];
	if (paramIgnoreBillingSchedules && paramIgnoreBillingSchedules.length > 0)
	{
		pflt.push(new nlobjSearchFilter('custrecord_axsm_billschedule', null, 'NONEOF', paramIgnoreBillingSchedules));
	}
	
	if (paramRenewalLastProcCustId)
	{
		pflt.push(new nlobjSearchFilter('internalidnumber', 'custrecord_axsm_customer', 'lessthan', paramRenewalLastProcCustId));	
	}
	
	//9/28/2015 - Add in ability to run against specific customer
	//paramOtherCustomCustomerId
	if (paramOtherCustomCustomerId)
	{
		pflt.push(new nlobjSearchFilter('custrecord_axsm_customer', null, 'anyof', paramOtherCustomCustomerId));
	}
	
	var pcol = [new nlobjSearchColumn('internalid','custrecord_axsm_customer','group').setSort(true),
	            new nlobjSearchColumn('custrecord_axsm_customer', null, 'group')];
	
	var prs = nlapiSearchRecord('customrecord_axsubsmanager', null, pflt, pcol);
	
	var procDebugLog = '';
	//Loop through each customer and execute
	for (var i=0; prs && i < prs.length; i+=1)
	{
	
		var customerId = prs[i].getValue('internalid','custrecord_axsm_customer','group');
		
		log('debug','Processing customerId', customerId);
		
		//Search out match Assets grouped by item, Sum Quantity
		var itemsFlt = [new nlobjSearchFilter('isinactive', null, 'is', 'F'),
		                new nlobjSearchFilter('custrecord_axsm_enddate', null, 'on', renewalProcessDate),
		                new nlobjSearchFilter('custrecord_axsm_customer', null, 'anyof', customerId),
		                //Status of Active
			            new nlobjSearchFilter('custrecord_axsm_status', null, 'anyof', '1')];
		if (paramIgnoreBillingSchedules && paramIgnoreBillingSchedules.length > 0)
		{
			itemsFlt.push(new nlobjSearchFilter('custrecord_axsm_billschedule', null, 'NONEOF', paramIgnoreBillingSchedules));
		}
		
		var itemsCol = [new nlobjSearchColumn('custrecord_axsm_item').setSort(true),
		                new nlobjSearchColumn('custrecord_axsm_qty'),
		                new nlobjSearchColumn('custrecord_axsm_rate').setSort(true),
		                new nlobjSearchColumn('custrecord_axsm_enddate'),
		                new nlobjSearchColumn('custrecord_axsm_termmonths').setSort(true),
		                new nlobjSearchColumn('custrecord_axsm_terms'),
		                new nlobjSearchColumn('custrecord_axsm_opptitle'),
		                new nlobjSearchColumn('salesrep', 'custrecord_axsm_customer'),
		                new nlobjSearchColumn('leadsource', 'custrecord_axsm_customer'),
		                new nlobjSearchColumn('subsidiary', 'custrecord_axsm_customer'),
		                new nlobjSearchColumn('internalid')];
		
		procDebugLog += 'Renewal Date: '+renewalProcessDate+' for Customer ID: '+customerId+'<br/>';
		
		itemJson = {};
		var hasError = false;
		try
		{
			//search for subscription items for THIS entity
			var itemsRs = nlapiSearchRecord('customrecord_axsubsmanager', null, itemsFlt, itemsCol);
			
			var newRevRecStartDate = nlapiDateToString(
										nlapiAddDays(
											nlapiStringToDate(itemsRs[0].getValue('custrecord_axsm_enddate')),
											1
										)
									 );
			
			itemJson = {
				"items":{},
				"assets":{},
				"entitystatus":"8", // 4 - Proposal Sent
				"expectedclosedate":nlapiDateToString(nlapiAddDays(currentDate, 30)),
				"custbody_qtr_fcst_status":"3",
				"title":"",
				"terms":"",
				"salesrep":itemsRs[0].getValue('salesrep', 'custrecord_axsm_customer'),
				"subsidiary":itemsRs[0].getValue('subsidiary','custrecord_axsm_customer'),
				"leadsource":itemsRs[0].getValue('leadsource','custrecord_axsm_customer'),
				"originalenddate":itemsRs[0].getValue('custrecord_axsm_enddate'),
				"revrecstart":newRevRecStartDate,
				"revrecend":nlapiDateToString(
								nlapiAddMonths(
									nlapiStringToDate(newRevRecStartDate), 
									itemsRs[0].getValue('custrecord_axsm_termmonths')
								)
							)
			};
			
			log('debug','itemJson for '+customerId, JSON.stringify(itemJson));
			
			//loop through the result and build out items json
			for (var it=0; it < itemsRs.length; it+=1)
			{
				var itemId = itemsRs[it].getValue('custrecord_axsm_item');
				var itemQty = (itemsRs[it].getValue('custrecord_axsm_qty')?parseInt(itemsRs[it].getValue('custrecord_axsm_qty')):0);
				var itemRate = itemsRs[it].getValue('custrecord_axsm_rate');
				var itemTermsInMonth = itemsRs[it].getValue('custrecord_axsm_termmonths');
				var itemTerms = itemsRs[it].getValue('custrecord_axsm_terms');
				var itemOppTitle = itemsRs[it].getValue('custrecord_axsm_opptitle');
				var assetId = itemsRs[it].getValue('internalid');
				
				//grab first one with title value and use that
				if (!itemJson.title && itemOppTitle)
				{
					itemJson.title = itemOppTitle;
				}
				
				//8/12/2016
				//Client request to add the word renewal in front of every opp title.
				//	We need to check to see if the title already starts with the word renewal
				if (itemJson.title)
				{
					//Check to see if the word renewal appears in the front already
					//1. Convert to lower case first
					var tempTitle = itemJson.title.toLowerCase();
					if (tempTitle.indexOf('renewal') != 0)
					{
						itemJson.title = 'renewal '+itemJson.title;
					}
				}
				
				//grab first one with terms value and use that
				if (!itemJson.terms && itemTerms)
				{
					itemJson.terms = itemTerms;
				}
				
				if (itemJson.items[itemId])
				{
					//NOT Unique, Add qty to existing and mark asset to be DELETED
					itemJson.assets[assetId] = '4'; //4 = Deleted
					itemJson.items[itemId].quantity = parseInt(itemJson.items[itemId].quantity) + itemQty; 
				}
				else
				{
					//UNIQUE, Add FULL JSON to items JSON and mark asset to be PENDING RENEWAL
					itemJson.assets[assetId] = '3'; //3 = Pending Renewal
					itemJson.items[itemId] = {
						"quantity":itemQty,
						"revrecterminmonths":itemTermsInMonth,
						"rate":itemRate,
						"custcol_assetid":assetId
					};
				}
			}
			
			//assume there are line items and create an Opportunity
			var renewalOpp = nlapiCreateRecord('opportunity', {recordmode:'dynamic'});
			renewalOpp.setFieldValue('entity', customerId);
			renewalOpp.setFieldValue('title', (itemJson.title?itemJson.title:'renewal') );
			renewalOpp.setFieldValue('entitystatus',itemJson.entitystatus); // 4 - Proposal Sent
			renewalOpp.setFieldValue('expectedclosedate', itemJson.expectedclosedate);
			renewalOpp.setFieldValue('custbody_qtr_fcst_status', itemJson.custbody_qtr_fcst_status); //3 = Likely
			renewalOpp.setFieldValue('salesrep', itemJson.salesrep);
			renewalOpp.setFieldValue('custbody_subsmgr_renewalexpdate', itemJson.originalenddate);
			
			//Loop through items in itemJson object
			for (var itm in itemJson.items)
			{
				renewalOpp.selectNewLineItem('item');
				renewalOpp.setCurrentLineItemValue('item', 'item', itm);
				renewalOpp.setCurrentLineItemValue('item', 'quantity',itemJson.items[itm].quantity);
				renewalOpp.setCurrentLineItemValue('item', 'revrecterminmonths', itemJson.items[itm].revrecterminmonths);
				renewalOpp.setCurrentLineItemValue('item', 'rate', itemJson.items[itm].rate);
				renewalOpp.setCurrentLineItemValue('item', 'custcol_assetid', itemJson.items[itm].custcol_assetid);
				renewalOpp.commitLineItem('item');
			}
			
			var renewalOppId = '';
			try
			{
				renewalOppId = nlapiSubmitRecord(renewalOpp, true, true);
				log('debug','Renewal Opp ID', renewalOppId);
				procDebugLog += ' - SUCCESSFULLY Created Renewal Opportunity ID: '+renewalOppId+'<br/>';
				
				//---- CHECK Subsidiary. Verismic Software Ltd. (4) Uses different Estimate form
				//119	VSI Quotation - Updated is the Default
				var estimateFormId = '119';
				if (itemJson.subsidiary == '4')
				{
					//120	VSL Quotation - Updated	Estimate
					estimateFormId = '120';
				}
				
				//Create Estimate off of THIS
				var estimatRec = nlapiTransformRecord('opportunity', renewalOppId, 'estimate', {recordmode:'dynamic', customform:estimateFormId});
				var salesRepDept = nlapiLookupField('employee',
													itemJson.salesrep, 
													'department',
													false);
				estimatRec.setFieldValue('enddate', itemJson.expectedclosedate);
				estimatRec.setFieldValue('expectedclosedate', itemJson.expectedclosedate);
				estimatRec.setFieldValue('includeinforecast', 'T');
				estimatRec.setFieldValue('leadsource', itemJson.leadsource);
				estimatRec.setFieldValue('custbody_qtr_fcst_status', itemJson.custbody_qtr_fcst_status); //Likely
				estimatRec.setFieldValue('salesrep', itemJson.salesrep);
				estimatRec.setFieldValue('department', salesRepDept); //Likely
				estimatRec.setFieldValue('terms',itemJson.terms);
				
				//Estimate line level should be already generated since it's transformed
				try
				{
					var estimateId = nlapiSubmitRecord(estimatRec, true, true);
					log('debug','Renewal Estimate ID', estimateId);
					procDebugLog += ' - SUCCESSFULLY Created Renewal Estimate ID: '+estimateId+' OFF OF Opportunity ID: '+renewalOppId+'<br/>';
				}
				catch (esterr)
				{
					log('error','Save Estimate Err', getErrText(esterr));
					procDebugLog += ' - Error Creating Renewal Estimate off of Opportunity ID '+renewalOpId+': '+getErrText(esterr)+'<br/>';
					hasError = true;
				}
				
			}
			catch (saveopperr)
			{
				log('error','Save Opportunity Err', getErrText(saveopperr));
				procDebugLog += ' - Error Creating/Processing Renewal Opportunity: '+getErrText(saveopperr)+'<br/>';
				hasError = true;
				
				if (renewalOppId)
				{
					//Delete the created Opportunity Record
					nlapiDeleteRecord('opportunity', renewalOppId);
					log('audit','Delete Generated Opportunity Due to Error: Deleted Opp ID = '+renewalOppId);
					procDebugLog += ' - AUDIT Delete Generated Opportunity Due to Error: Deleted Opp ID = '+renewalOppId+'<br/>';
				}
				
			}
			
		}
		catch (procerr)
		{
			log('error','Renewal Err', getErrText(procerr));
			procDebugLog += ' - Error Searching for Subscription Assets: '+getErrText(procerr)+'<br/>';
			hasError = true;
		}
		
		//loop through itemJson.assets and change the trigger
		if (!hasError)
		{
			for (var ua in itemJson.assets)
			{
				try
				{
					nlapiSubmitField('customrecord_axsubsmanager', ua, 'custrecord_axsm_status', itemJson.assets[ua], true); //3=Pending Renewal
					procDebugLog += ' - SUCCESS updated status on assetID '+ua+' to '+itemJson.assets[ua];
				}
				catch (assetstatusupderr)
				{
					log('error','Status Update Err on asset Record '+ua+' to '+itemJson.assets[ua], getErrText(assetstatusupderr));
					procDebugLog += ' - Error Status Update on asset Record '+ua+' to '+itemJson.assets[ua]+': '+getErrText(assetstatusupderr)+'<br/>';
				}
			}
		}
		
		//Set % completed of script processing
		var pctCompleted = Math.round(((i+1) / prs.length) * 100);
		nlapiGetContext().setPercentComplete(pctCompleted);
		
		//reschedule if gov is running low or legnth is 1000
		if ((i+1)==1000 || ((i+1) < prs.length && nlapiGetContext().getRemainingUsage() < 1000))
		{
			log('audit','Rescheduling at ','Customer ID: '+customerId);
			var rparam = {
				'custscript_66_lastproccustid':customerId,
				'custscript_66_custrenewaldate':paramCustomDateToProc
			};
			
			nlapiScheduleScript(nlapiGetContext().getScriptId(), nlapiGetContext().getDeploymentId(), rparam);
			break;
		}
	}
	
	nlapiSendEmail(-5, paramPrimaryErrorNotifier, 'Verismic Other Renewal Process Log '+nlapiDateToString(new Date()), procDebugLog);
	
}


/**
 * executeOrderProc is unscheduled script that gets triggered by user event.
JSON object def.

var sojson =  {
		'salesorder':newRec.getId(),
		'number':newRec.getFieldValue('tranid'),
		'otherrefnum':newRec.getFieldValue('otherrefnum'),
		'terms':newRec.getFieldValue('terms'),
		'opportunity':(newRec.getFieldValue('opportunity')?newRec.getFieldValue('opportunity'):''),
		'opptitle':'',
		'itemclass':{
			[item id]:[item class id],
			...
		},
		'items':{
			[itemidid-linenumber]:{
			'line':[so line number],
			'itemid':[line item id],
			'itemname':[line item text],
			'qty':[line item qty],
			'desc':[line item dec],
			'revrecstart':[line rev rec start date],
			'revrecend':[line rev rec end date],
			'termsinmonths':[terms in months],
			'rate':[rate],
			'amount':[amount],
			'assetid':[asset id],
			'billingschedule':[billing schedule id]
			}
		}
	};
};
*/
function executeOrderProc() {
	
	//Grab and build software class IDs
	if (paramSubsMgrClassIds) {
		paramSubsMgrClassIds = paramSubsMgrClassIds.split(',');
		
		if (paramSubsMgrClassIds.length == 0)
		{
			throw nlapiCreateError('SUBMGRERR', 'SO Number '+nlapiGetFieldValue('tranid')+' Missing Item Class ID(s) to process', true); 
		}
	}
	
	log('debug','classes',paramSubsMgrClassIds);
	
	
	if (!paramJson) {
		throw nlapiCreateError('SUBMGRERR_EXECUTE_ORDER-ERR', 'Sales Order JSON Object is required. Please reprocess it from Sales order', false);
	}

	var sojson = JSON.parse(paramJson);
	
	//Month to Month Change. - When It's created, flag this to true and update ONLY line item on the OPP with THIS Asset
	sojson.updateopp = false;
	
	log('debug','Param JSON', JSON.stringify(sojson));
	
	try {
		
		var sorec = nlapiLoadRecord('salesorder', sojson.salesorder, {recordmode:'dynamic'});
		var procLog = 'Processing Subscription Manager Asset for SO# '+sojson.number+
					  '<ul>',
			hasError = false;
		//1. Go through all items sub json elements.
		//Create new if assetid is null
		//update existing if assetid is not null
		if (sojson.items) {
			//9/30/2015 - Change in business proces.
			//When creating Opportunity for Month to Month, we need to combine the line items with same item AND entitlement end date
			//Key = item-enddate
			var m2mLineJson = {},
				processM2M = false;
			
			//create Product records
			for (var i in sojson.items) 
			{
				var assetRec = null,
					ajson = sojson.items[i];
					
				if (ajson.assetid)
				{
					assetRec = nlapiLoadRecord('customrecord_axsubsmanager', sojson.items[i].assetid);
				}
				else
				{
					//9/30/2015 - Requested new changes where for Line with MONTH TO MONTH, we need to combine the lines with same item and end date.
					//Up until 9/18/2015 we created asset for each line even for Month To Month. This is a change due to business change
					//IF it comes across the line, set it to be executed separatly
					
					//TEST MODE SINCE IT ONLY EXECUTE FOR ONE USER
					//nlapiGetUser()=='233700' && 
					if (ajson.billingschedule == paramMonthToMonthId)
					{
						processM2M = true;
						//use the preagreed on key: item-enddate
						var m2mJsonKey = ajson.itemid+'-'+ajson.revrecend;
						log('debug','m2mJsonKey',m2mJsonKey);
						if (m2mLineJson[m2mJsonKey])
						{
							var newTotalQty = parseInt(m2mLineJson[m2mJsonKey].totalqty) + parseInt(ajson.qty);
							var newHighestRate = parseFloat(ajson.rate);
							if (parseFloat(m2mLineJson[m2mJsonKey].highestrate) > newHighestRate)
							{
								newHighestRate = m2mLineJson[m2mJsonKey].highestrate;
							}
							
							//m2mLineJson[m2mJsonKey].solines.push(ajson.line);
							m2mLineJson[m2mJsonKey].linejson = ajson;
							m2mLineJson[m2mJsonKey].totalqty = newTotalQty;
							m2mLineJson[m2mJsonKey].highestrate = newHighestRate;
						}
						else
						{
							
							//solines element keeps track of line number on SO to set generated asset ID
							//linejson element represents line item json object
							//totalqty element sum of all matching item quantities
							//highestrate element is rate that has a higher value
							m2mLineJson[m2mJsonKey]={
								//'solines':[],
								'linejson':ajson,
								'totalqty':ajson.qty,
								'highestrate':ajson.rate
							};
						}
						
					}
					else
					{
						//ONLY create asset at this point if it is NOT M2M
						assetRec = nlapiCreateRecord('customrecord_axsubsmanager');
					}
				}
				
				if (assetRec)
				{
					//9/19/2015 Mod
					//Set Opp Ref and Title Here instead of at the bottom
					assetRec.setFieldValue('custrecord_axsm_opptitle', sojson.opptitle);
					assetRec.setFieldValue('custrecord_axsm_oppref', sojson.opportunity);
					assetRec.setFieldValue('custrecord_axsm_customer', sorec.getFieldValue('entity'));
					assetRec.setFieldValue('custrecord_axsm_so', sojson.salesorder);
					assetRec.setFieldValue('custrecord_axsm_item', ajson.itemid);
					assetRec.setFieldValue('custrecord_axsm_qty', ajson.qty);
					assetRec.setFieldValue('custrecord_axsm_rate', ajson.rate);
					assetRec.setFieldValue('custrecord_axsm_amount', ajson.amount);
					assetRec.setFieldValue('custrecord_axsm_pootherrefnum', sojson.otherrefnum);
					assetRec.setFieldValue('custrecord_axsm_status', '1'); //Active
					assetRec.setFieldValue('custrecord_axsm_startdate', ajson.revrecstart);
					assetRec.setFieldValue('custrecord_axsm_enddate', ajson.revrecend);
					assetRec.setFieldValue('custrecord_axsm_termmonths', ajson.termsinmonths);
					assetRec.setFieldValue('custrecord_axsm_terms', sojson.terms);
					assetRec.setFieldValue('custrecord_axsm_billschedule', ajson.billingschedule);
					
					try 
					{
						var assetRecId = nlapiSubmitRecord(assetRec, true, true);
						//at this point, set the custocol_assetid column for THIS line
						//sorec.setLineItemValue('item','custcol_assetid',ajson.line, assetRecId);	
						//procLog += '<li>Line '+ajson.line+' = Success with Asset ID '+assetRecId+'</li>';
						log('debug','Line '+ajson.line,'Success with Asset ID '+assetRecId);
						
					}
					catch (updinserr)
					{
						log('error','Error processing SO #'+sojson.number,'Line #'+ajson.line+' Error: '+getErrText(updinserr));
						procLog += '<li>Line '+ajson.line+' = Failed with Error: '+getErrText(updinserr);
						hasError = true;
					}
				}
				
			}
			
			procLog += '</ul>';
			
			//9/30/2015 - Month to Month Process.
			//Loop through m2mLineJson object and ONLY process MOnth To Month as it's own
			//At this point all M2M lines are combined by qty, item and endate
			//for (var i in sojson.items) {
			if (processM2M)
			{
				procLog += 'Processing Month to Month Subscription Manager Asset for SO# '+sojson.number+
						   '<ul>';
				
				for (var mj in m2mLineJson)
				{
					var linemsg = '';
					try
					{
						//ONLY create asset at this point if it is NOT M2M
						var assetRec = nlapiCreateRecord('customrecord_axsubsmanager');
						//assetRec.setFieldValue('custrecord_axsm_opptitle', m2mOppTitle);
						//assetRec.setFieldValue('custrecord_axsm_oppref', m2mOppId);
						assetRec.setFieldValue('custrecord_axsm_customer', sorec.getFieldValue('entity'));
						assetRec.setFieldValue('custrecord_axsm_so', sojson.salesorder);
						assetRec.setFieldValue('custrecord_axsm_item', m2mLineJson[mj].linejson.itemid);
						assetRec.setFieldValue('custrecord_axsm_qty', m2mLineJson[mj].totalqty);
						assetRec.setFieldValue('custrecord_axsm_rate', m2mLineJson[mj].highestrate);
						assetRec.setFieldValue('custrecord_axsm_amount', parseInt(m2mLineJson[mj].totalqty) * parseFloat(m2mLineJson[mj].highestrate));
						assetRec.setFieldValue('custrecord_axsm_pootherrefnum', sojson.otherrefnum);
						assetRec.setFieldValue('custrecord_axsm_status', '1'); //Active
						assetRec.setFieldValue('custrecord_axsm_startdate', m2mLineJson[mj].linejson.revrecstart);
						assetRec.setFieldValue('custrecord_axsm_enddate', m2mLineJson[mj].linejson.revrecend);
						assetRec.setFieldValue('custrecord_axsm_termmonths', m2mLineJson[mj].linejson.termsinmonths);
						assetRec.setFieldValue('custrecord_axsm_terms', sojson.terms);
						assetRec.setFieldValue('custrecord_axsm_billschedule', m2mLineJson[mj].linejson.billingschedule);
						
						var assetRecId = nlapiSubmitRecord(assetRec, true, true);
						log('debug','M2M Asset Created '+assetRecId, JSON.stringify(m2mLineJson));
						
						linemsg += 'Asset Created: '+assetRecId;
						
						//Need customer name on the opp
						var m2mOppTitle = sorec.getFieldText('entity')+' - Month to Month Renewal',
							m2mOppId = '',
							m2mOpp = nlapiCreateRecord('opportunity', {recordmode:'dynamic'});
						
						m2mOpp.setFieldValue('entity', sorec.getFieldValue('entity'));
						m2mOpp.setFieldValue('title', m2mOppTitle );
						
						m2mOpp.setFieldValue('custbody_qtr_fcst_status','4'); //Default to Guranteed
						
						//3/29/2016 - Request to move to Line Level
						//m2mOpp.setFieldValue('class','2'); //Default to Renewal
						//Sales Rep should auto flow through from entity	
						// // 4 - Proposal Sent
						//m2mOpp.setFieldValue('expectedclosedate', ajson.revrecend);
						//m2mOpp.setFieldValue('custbody_qtr_fcst_status', itemJson.custbody_qtr_fcst_status); //3 = Likely
						//
						//m2mOpp.setFieldValue('custbody_subsmgr_renewalexpdate', itemJson.originalenddate);
						
						m2mOpp.setFieldValue('expectedcloseddate','');
						m2mOpp.setFieldValue('entitystatus','13');
						m2mOpp.selectNewLineItem('item');
						m2mOpp.setCurrentLineItemValue('item', 'item', m2mLineJson[mj].linejson.itemid);
						m2mOpp.setCurrentLineItemValue('item', 'quantity',m2mLineJson[mj].totalqty);
						m2mOpp.setCurrentLineItemValue('item', 'revrecterminmonths', m2mLineJson[mj].linejson.termsinmonths);
						m2mOpp.setCurrentLineItemValue('item', 'rate', m2mLineJson[mj].highestrate);
						m2mOpp.setCurrentLineItemValue('item', 'custcol_assetid', assetRecId);
						//3/29/2016 - set class at the line level - Default to Renewal (2)
						m2mOpp.setCurrentLineItemValue('item', 'class', '2'); 
						
						m2mOpp.commitLineItem('item');
						
						m2mOppId = nlapiSubmitRecord(m2mOpp, true, true);
						
						linemsg += ' // Opportunity Created: '+m2mOppId;
						
						//Update the asset with Opp info
						var assetupd = ['custrecord_axsm_opptitle','custrecord_axsm_oppref'],
							assetval = [m2mOppTitle,m2mOppId];
						nlapiSubmitField('customrecord_axsubsmanager', assetRecId, assetupd, assetval, true);
						
						linemsg += ' // Asset Updated with Opportunity';
						
					} 
					catch (m2merr)
					{
						linemsg += ' // ERROR: '+getErrText(m2merr);
						hasError = true;
						
					}
					procLog += '<li>'+linemsg+'</li>';
					
				}
				procLog+='</ul>';
			}
			
			
			//Generate error email to notifier
			if (hasError)
			{
				nlapiSendEmail(-5, paramPrimaryErrorNotifier, 'Subscription Manager Error - SO#'+sojson.number, procLog, null, null, null, null);
			}
		}
		
		//Save the Sales Order anyway
		//nlapiSubmitRecord(sorec, true, true);
		
	} catch (procerr) {
		log('error','Error processing: ', getErrText(procerr)+' :: '+paramJson);
		//SEND OUT detail retry error
		nlapiSendEmail(-5, paramPrimaryErrorNotifier, 'Subscription Manager Error - SO#'+sojson.number, getErrText(procerr)+' <br/><br/> '+paramJson, null, null, null, null);
		
	}
}

