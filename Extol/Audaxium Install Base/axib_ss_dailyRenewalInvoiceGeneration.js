/**
 * Scheduled script to run against ALL AX:EXTOL Maintenance to process against below:
 * 	- 45 calendar days before Entitlement End Date
 * 	- Inactive is F
 * Result will be Grouped in a single invoice
 */


function processInstallBaseRenewal() {
	//Company Level Params
	var paramPrimaryErrorNotifier = nlapiGetContext().getSetting('SCRIPT', 'custscript_104_axibprimeerr');
	var paramCcErrorNotifier = nlapiGetContext().getSetting('SCRIPT', 'custscript_104_axibccerr');
	if (paramCcErrorNotifier) {
		paramCcErrorNotifier = paramCcErrorNotifier.split(',');
	} else {
		paramCcErrorNotifier = null; 
	}
	
	var paramCcProcLogNotifier = nlapiGetContext().getSetting('SCRIPT','custscript_104_axibccproclog');
	if (paramCcProcLogNotifier) {
		paramCcProcLogNotifier = paramCcProcLogNotifier.split(',');
	} else {
		paramCcProcLogNotifier = null; 
	}
	
	//Script level
	var paramLastProcId = nlapiGetContext().getSetting('SCRIPT', 'custscript_112_lastprocid');
	var paramCustomExecDate = nlapiGetContext().getSetting('SCRIPT', 'custscript_112_custexecdate');
	var paramCustomExecCustomer = nlapiGetContext().getSetting('SCRIPT', 'custscript_112_custexeccustomer');
	
	//Current Date unless custom date is passed in.
	//Script will assume TODAY is custom date passed in IF set
	var currDate = nlapiDateToString(new Date());
	if (paramCustomExecDate) {
		currDate = paramCustomExecDate;
	}
	
	//Based on Current Date that's running, add 45 days TO IT to get list of all customers/maint to renew
	var renewProcDate = nlapiDateToString(nlapiAddDays(nlapiStringToDate(currDate), 45));
	
	log('debug','Check', 'Current Date: '+currDate+' // Process Date: '+renewProcDate);
	
	//49 = Customer Status noneof Customer - Former
	//Customer MUST be NOT inactive
	//1 = Maint. State of Active
	var rflt = [new nlobjSearchFilter('status', 'custrecord_aemaint_customer', 'noneof',['49']),
	            new nlobjSearchFilter('isinactive', 'custrecord_aemaint_customer', 'is', 'F'),
	            new nlobjSearchFilter('isinactive', null, 'is', 'F'),
	            new nlobjSearchFilter('custrecord_aemaint_state', null, 'anyof',['1']),
	            new nlobjSearchFilter('custrecord_aemaint_soentenddt', null, 'isnotempty',''),
	            new nlobjSearchFilter('custrecord_aemaint_soentenddt', null, 'on',renewProcDate)];
	
	var rcol = [new nlobjSearchColumn('internalid','custrecord_aemaint_customer', 'group').setSort(true),
	            new nlobjSearchColumn('custrecord_aemaint_customer', null, 'group'),
	            new nlobjSearchColumn('custrecord_aemaint_soentenddt', null, 'group')];
	
	//Incase it was rescheduled, make sure it returns where it left off
	if (paramLastProcId) 
	{
		rflt.push(new nlobjSearchFilter('internalidnumber', 'custrecord_aemaint_customer', 'lessthan', paramLastProcId));
	}
	
	//Incase custom exec customer value is passed in.
	if (paramCustomExecCustomer)
	{
		rflt.push(new nlobjSearchFilter('custrecord_aemaint_customer',null,'anyof',paramCustomExecCustomer));
	}
	
	var rrs = nlapiSearchRecord('customrecord_aemaint', null, rflt, rcol);

	//Daily Process log 
	var processLog = '';
	
	//loop through each and Maint. Install Base Record
	for (var i=0; rrs && i < rrs.length; i += 1) 
	{
		try {
			//Grab ALL Columns
			var allCols = rrs[i].getAllColumns();
			
			var customerId = rrs[i].getValue(allCols[0]);
			var customerText = rrs[i].getText(allCols[1]);
	 		var entEndDate = rrs[i].getValue(allCols[2]);
		
	 		processLog += '<br/><br/> - '+customerText+' ('+customerId+') with Ent. End Date '+entEndDate+'<br/>';
	 		
	 		log('debug','Run Renewal For '+customerId+' // '+customerText+' // '+entEndDate);
		
	 		if (customerId)
	 		{
	 		
	 			//Search for all Items for matching customer and entEnd Date 
		 		var procflt = [new nlobjSearchFilter('custrecord_aemaint_customer', null, 'anyof', customerId),
		 		               new nlobjSearchFilter('custrecord_aemaint_soentenddt', null, 'on', entEndDate),
		 		               new nlobjSearchFilter('isinactive', null, 'is', 'F'),
		 		               new nlobjSearchFilter('custrecord_aemaint_state', null, 'anyof',['1']),
		 		               new nlobjSearchFilter('mainline', 'custrecord_aemaint_so', 'is','T')];
		 		
		 		var proccol = [new nlobjSearchColumn('internalid').setSort(true),
		 		               new nlobjSearchColumn('custrecord_aemaint_item'),
		 		               new nlobjSearchColumn('custrecord_aemaint_itemqty'),
		 		               new nlobjSearchColumn('custrecord_aemaint_sotermsmonths'),
		 		               new nlobjSearchColumn('custrecord_aemaint_monthlyrate'),
		 		               new nlobjSearchColumn('custrecord_aemaint_taxcode'),
		 		               //8/19/2015 - Add in additional info
		 		               new nlobjSearchColumn('custrecord_aemaint_addinfo'),
		 		               //custentity74 represent Renewal Bill To Tier value of End User or Partner
		 		               new nlobjSearchColumn('custentity74','custrecord_aemaint_customer'),
		 		               new nlobjSearchColumn('partner','custrecord_aemaint_customer'),
		 		               new nlobjSearchColumn('custentity_axlms_customerbillcycle', 'custrecord_aemaint_customer')];
		 		
		 		var procrs = nlapiSearchRecord('customrecord_aemaint', null, procflt, proccol);
		 		
		 		var paramPartnerBillToTierValue = '2'; //Channel Tiers [SWE] 
		 		var paramEndUserBillToTierValue = '1'; //Channel Tiers [SWE]
		 		var paramRenewalAutomatedValue = '14'; //Order Types [R]
		 		var paramTermNet60Value = '3'; //Setup > Accounting > Accounting Lists > New > Terms.
		 		var paramAssetPendingRenewalState = '4'; //AX:EXTOL State
		 		var paramBillCycleAnnual = '1'; //Annual Billing cycle 12
		 		var paramBillCycleSemiAnnual = '2'; //Semi Annual Billing cycle 6
		 		var paramBillCycleQuarterly ='3'; //Quarterly billing cycle 3
		 		
		 		if (procrs && procrs.length > 0) {
		 			//Create new Invoice off of the result
		 			var renewinv = nlapiCreateRecord('invoice', {recordmode:'dynamic'});
		 	 		
		 			//TODO: Need to look at customer record attached to Maint. Install Base
		 			//		RENEWAL BILL TO TIER on Customer record will say End User Or Partner
		 			//		If End User = Customer
		 			//		If Parnter = Partner (Primary)
		 			
		 			//Defaults to customer on Install Base Record
		 	 		var whoToBill = customerId;
		 	 		//If Renewal Bill to tier is Partner, use Patner
		 	 		if (procrs[0].getValue('custentity74','custrecord_aemaint_customer') == paramPartnerBillToTierValue) {
		 	 			whoToBill = procrs[0].getValue('partner','custrecord_aemaint_customer');
		 	 			//At this point IF partner value is empty, throw error
		 	 			if (!whoToBill) {
		 	 				throw nlapiCreateError('EXIB-ERR', 'Renewal Bill To is set to Partner but NO Primary Partner Found for customer', true);
		 	 			}
		 	 		}
		 	 		
		 	 		renewinv.setFieldValue('custbody_bill_to_tier', procrs[0].getValue('custentity74','custrecord_aemaint_customer'));
		 	 		renewinv.setFieldValue('entity', whoToBill);
		 	 		renewinv.setFieldValue('custbody_end_user', customerId);
		 	 		
		 	 		//Make sure set transaction as currDate incase custom date was used
		 	 		renewinv.setFieldValue('trandate', currDate);
		 	 		//Set Order Type
		 	 		renewinv.setFieldValue('custbody_order_type', paramRenewalAutomatedValue);
		 	 		//Set due date 60 cdate from curr date
		 	 		var dueDateValue = nlapiDateToString(nlapiAddDays(nlapiStringToDate(currDate), 60));
		 	 		renewinv.setFieldValue('duedate', dueDateValue);
		 	 		//Set Term to Net 60
		 	 		renewinv.setFieldValue('terms', paramTermNet60Value);
		 	 		//Set AM/CAM - this is Sales Team Sublist
		 	 		//Check to see if there is already a sales rep assigned.
		 	 		var salesLineCount = renewinv.getLineItemCount('salesteam');
		 	 		
		 	 		//TODO: NEED TO CHECK WITH KAREN: ONLY add in sales rep if there aren't any already
		 	 		if (salesLineCount == 0) {
		 	 			renewinv.selectNewLineItem('salesteam');
		 	 	 		renewinv.setCurrentLineItemValue('salesteam', 'employee', procrs[0].getValue('salesrep','custrecord_aemaint_so'));
		 	 	 		renewinv.setCurrentLineItemValue('salesteam', 'isprimary','T');
		 	 	 		renewinv.setCurrentLineItemValue('salesteam', 'contribution', '100');
		 	 	 		renewinv.setCurrentLineItemValue('salesteam', 'salesrole', '-2'); //set it to sales rep
		 	 	 		renewinv.commitLineItem('salesteam');
		 	 		}
		 	 		
		 	 		//At this pointt, we can loop through each result and add to item sublist
		 	 		var periodStartDate = '', periodEndDate='';
		 	 		
		 	 		var newInvoiceTermsInMonthValue = '';
		 	 		
		 	 		for (var p=0; p < procrs.length; p++) {
		 	 			log('debug','Billing Cycle',procrs[p].getValue('custentity_axlms_customerbillcycle', 'custrecord_aemaint_customer'));
		 	 			var termsInMonthsValue = 12;
		 	 			if (procrs[p].getValue('custentity_axlms_customerbillcycle', 'custrecord_aemaint_customer') == paramBillCycleSemiAnnual) {
		 	 				termsInMonthsValue = 6;
		 	 			} else if (procrs[p].getValue('custentity_axlms_customerbillcycle', 'custrecord_aemaint_customer') == paramBillCycleQuarterly) {
		 	 				termsInMonthsValue = 3;
		 	 			}
		 	 			
		 	 			newInvoiceTermsInMonthValue = termsInMonthsValue;
		 	 			
		 	 			log('debug','termsInMonth', termsInMonthsValue);
		 	 			
		 	 			//Calculate new Period Value
		 	 			if (!periodEndDate && !periodStartDate) {
		 	 				var calcNewRevRecStartDate = nlapiAddDays(nlapiStringToDate(entEndDate), 1);
		 	 				periodStartDate = nlapiDateToString(calcNewRevRecStartDate);
		 	 				//always last day of prev. month
		 	 				periodEndDate = nlapiDateToString(nlapiAddDays(nlapiAddMonths(calcNewRevRecStartDate, termsInMonthsValue), -1));
		 	 			}
		 	 			
		 	 			//Value of AX:LMS CUSTOMER BILLING CYCLE * custrecord_aemaint_monthlyrate value and set it on RATE
		 	 			var rateValue = (parseFloat(procrs[p].getValue('custrecord_aemaint_monthlyrate')) * termsInMonthsValue).toFixed(2);
		 	 			
		 	 			
		 	 			renewinv.selectNewLineItem('item');
		 	 			renewinv.setCurrentLineItemValue('item', 'item', procrs[p].getValue('custrecord_aemaint_item'));
		 	 			renewinv.setCurrentLineItemValue('item', 'quantity', procrs[p].getValue('custrecord_aemaint_itemqty'));
		 	 			renewinv.setCurrentLineItemValue('item', 'price','-1'); // Set price level to -1 (Custom)
		 	 			
		 	 			//Add in Taxcode
		 	 			if (procrs[p].getValue('custrecord_aemaint_taxcode'))
		 	 			{
		 	 				renewinv.setCurrentLineItemValue('item', 'taxcode', procrs[p].getValue('custrecord_aemaint_taxcode'));
		 	 			}
		 	 			
		 	 			//NEEd to set legacy monthly list rate as well 
		 	 			renewinv.setCurrentLineItemValue('item', 'custcol_list_rate', procrs[p].getValue('custrecord_aemaint_monthlyrate'));
		 	 			
		 	 			//Need to use Terms Numerical Value of AX:LMS CUSTOMER BILLING CYCLE in Customer Record!!!
		 	 			renewinv.setCurrentLineItemValue('item', 'revrecterminmonths', termsInMonthsValue);
		 	 			
		 	 			renewinv.setCurrentLineItemValue('item', 'rate', rateValue); 
		 	 			
		 	 			renewinv.setCurrentLineItemValue('item', 'revrecstartdate', periodStartDate);
		 	 			renewinv.setCurrentLineItemValue('item', 'revrecenddate', periodEndDate);
		 	 			
		 	 			//Maintenance [NEW Rev Rec. Start] - [NEW Rev Rec. End]
		 	 			renewinv.setCurrentLineItemValue('item', 'custcol1', 'Maintenance '+periodStartDate+' - '+periodEndDate);
		 	 			
		 	 			//8/19/2015 - Add in Additional Info copied from SO to Renewal Invoice
		 	 			renewinv.setCurrentLineItemValue('item', 'custcol_aib_addinfo', procrs[p].getValue('custrecord_aemaint_addinfo'));
		 	 			
		 	 			renewinv.commitLineItem('item');
		 	 		}
		 	 		
		 	 		log('debug','period start/end', periodStartDate+' // '+periodEndDate);
		 	 		
		 	 		//Set Memo to Maintenance (Renewal Period)
		 	 		renewinv.setFieldValue('memo','Maintenance '+periodStartDate+' - '+periodEndDate);
		 	 		
		 	 		var invRecId = '';
		 	 		try {
		 	 			//Submit the Item Record 
		 	 	 		invRecId = nlapiSubmitRecord(renewinv, true, true);
		 	 	 		
		 	 	 		log('debug','Generated Invoice Internal ID', invRecId);
		 	 	 		
		 	 	 		//Update Asset records as Pending Renewal and set the Renewal Invoice to above generated invoice
		 	 	 		
		 	 	 		processLog += '&nbsp; &nbsp; &nbsp; Invoice Generated Successfully ('+invRecId+')<br/>';
		 	 	 		
		 	 	 		var maintEndDate = '';
		 	 	 		for (var p=0; p < procrs.length; p++) {
		 	 	 			try {
		 	 	 				
		 	 	 				//Clone each record and mark it as pending renewal
		 	 	 				var cloneRec = nlapiCopyRecord('customrecord_aemaint', procrs[p].getValue('internalid'), {recordmode:'dynamic'});
		 	 	 				cloneRec.setFieldValue('custrecord_aemaint_state', paramAssetPendingRenewalState);
		 	 	 				cloneRec.setFieldValue('custrecord_aemaint_so', invRecId);
		 	 	 				//Terms in Months MUST come from customer
		 	 	 				cloneRec.setFieldValue('custrecord_aemaint_sotermsmonths',newInvoiceTermsInMonthValue);
		 	 	 				
		 	 	 				var currEntEndDate = cloneRec.getFieldValue('custrecord_aemaint_soentenddt');
		 	 	 				var newEntStartDate = nlapiDateToString(nlapiAddDays(nlapiStringToDate(currEntEndDate), 1));
		 	 	 				var newEndEndDate = nlapiDateToString(nlapiAddMonths(nlapiStringToDate(currEntEndDate), parseInt(newInvoiceTermsInMonthValue)));
		 	 	 				
		 	 	 				cloneRec.setFieldValue('custrecord_aemaint_soentstartdt', newEntStartDate);
		 	 	 				cloneRec.setFieldValue('custrecord_aemaint_soentenddt', newEndEndDate);
		 	 	 				
		 	 	 				var cloneRecId = nlapiSubmitRecord(cloneRec, true, true);
		 	 	 				
		 	 	 				processLog += '&nbsp; &nbsp; &nbsp; ** PR Install Base Generated Successfully ('+cloneRecId+')<br/>';
		 	 	 				
		 	 	 				//1/13/2016 - 
		 	 	 				//Need to get most RECENT Date for maint End Date
		 	 	 				if (!maintEndDate || (maintEndDate && nlapiStringToDate(maintEndDate) < nlapiStringToDate(newEndEndDate)))
		 	 	 				{
		 	 	 					maintEndDate = newEndEndDate;
		 	 	 				}
		 	 	 				
		 	 	 				
		 	 	 			} catch (updasseterr) {
		 	 	 	 			log('error','Error Cloning Asset with Pending Renewal', 'Invoice ID: '+invRecId+
		 	 	 	 					' generated successfully but was unable to clone asset id '+
		 	 	 	 					procrs[p].getValue('internalid')+':: '+getErrText(updasseterr));
		 	 	 	 			
		 	 	 	 			processLog += '&nbsp; &nbsp; &nbsp; ** Unable to generate PR asset id '+
		 						   			   procrs[p].getValue('internalid')+' :: '+getErrText(updasseterr);
		 	 	 	 			
		 	 	 	 		}
		 	 	 		}
		 	 	 		
		 	 	 		//1/13/2016 - Bug fix to make sure to update Maint. End Date (custentity_axlms_maintenddate customerId)
		 	 	 		//Run Update on end user record
		 	 				
		 	 			nlapiSubmitField('customer', customerId, 'custentity_axlms_maintenddate', maintEndDate, false);
		 	 	 		
		 	 	 		
		 	 		} catch (asseterr) {
		 	 		
		 	 			processLog += '&nbsp; &nbsp; &nbsp; Error generating invoice: '+getErrText(asseterr)+'<br/>'+
		 	 						  '&nbsp; &nbsp; &nbsp; '+JSON.stringify(renewinv)+'<br/>';
		 	 			
		 	 			log('error','Error Generating Invoice','Customer '+customerId+' // End Date '+entEndDate+' // '+getErrText(asseterr));
		 	 		}
		 	 		
		 		}
		 		
	 		}
	 		
	 		//Set % completed of script processing
			var pctCompleted = Math.round(((i+1) / rrs.length) * 100);
			nlapiGetContext().setPercentComplete(pctCompleted);
			
			if ((i+1)==1000 || ((i+1) < rrs.length && nlapiGetContext().getRemainingUsage() < 1000)) 
			{
							//reschedule
				nlapiLogExecution('debug','Getting Rescheduled at', customerId);
				var rparam = new Object();
				rparam['custscript_112_lastprocid'] = customerId;
				rparam['custscript_112_custexecdate'] = paramCustomExecDate;
				rparam['custscript_112_custexeccustomer'] = paramCustomExecCustomer;
				nlapiScheduleScript(nlapiGetContext().getScriptId(), nlapiGetContext().getDeploymentId(), rparam);
				break;
			}
		} catch (procerr) {
			
			processLog += '&nbsp; &nbsp; &nbsp; Error processing customer :: '+getErrText(procerr)+'<br/>';
			log('error','Error Processing ',getErrText(procerr));
		}
	}

	//Send processLog
	if (processLog) {
		nlapiSendEmail(-5, paramPrimaryErrorNotifier, 'Process log for Generation of Exotl Rnewal Install Base Invoice - '+currDate, processLog, paramCcProcLogNotifier);
	}
}