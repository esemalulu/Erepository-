/**
 * June 18th 2015 Note:
 * - This scheduled script replaces functionalities handled by Sweet Transaction Server (sweet_transaction_userevent.js)
 * Scheduled script to go through results of quotes and attempt to count:
 * LOOK for ALL quotes that were generated off of an Opportunity (Created From)
 * 	- Number of Sales Order generated from Quote.
 * 	- Number of Invoices generated off of Sales Order that was created from Quote
 * 
 * THIS is a recoded version of "sweet_so_count_scheduled.js" 
 * Instead of having many unscheduled deployments it will be scheduled to run nightly
 */
function calculateSoAndInvCount(type) {
	var paramLastProcId = nlapiGetContext().getSetting('SCRIPT', 'custscript_340_lastprocid');
	//4/15/2015
	var paramProcZeroSoQuotes = nlapiGetContext().getSetting('SCRIPT', 'custscript_340_zerosoonly');
	
	var paramIsDailyProcess = nlapiGetContext().getSetting('SCRIPT','custscript_340_isdailyprocess');
	if (!paramIsDailyProcess)
	{
		paramIsDailyProcess = 'F';
	}
	
	//Sept. 1 2015: JS@Audaxium
	//Add in parameter of Quote Internal ID which is passed in by Sales Order User Event.
	var paramQuoteId = nlapiGetContext().getSetting('SCRIPT','custscript_340_quoteid');
	
	//Build the filters out based on parameters
	var qflt = [new nlobjSearchFilter('mainline', null, 'is','T')];
	
	//Sept. 1 2015: JS@Audaxium
	//Add in parameter of Quote Internal ID which is passed in by Sales Order User Event.
	//	When triggered by User Event of SO Create, ALL other flags should be ignored
	if (paramQuoteId)
	{
		qflt.push(new nlobjSearchFilter('internalid', null, 'anyof', paramQuoteId));
	}
	else
	{
		if (paramProcZeroSoQuotes == 'T') 
		{
			qflt.push(new nlobjSearchFilter('custbody_sales_order_count', null, 'equalto','0'));
		}
		
		log('audit','script type', type);
		//5/29/2015
		//- Daily script changed to run on weekdays only. When on Daily Scheduled execution, make sure to ONLY process quotes with due date > current date
		var currDateObj = new Date();
		if (paramIsDailyProcess == 'T' && currDateObj.getDay() > 0 && currDateObj.getDay() < 6)
		{
			//6/5/2015 request by DA
			//Change filter to be on or after 1st day of current month
			//CHANGE to include last previous month as well
			var currentDate = new Date();
			//set day to 1st day
			currentDate.setDate(1);
			var firstDayOfMonth = nlapiDateToString(currentDate);
			var firstDayOfTwoMonthsAgo = nlapiAddMonths(currentDate, -1);
			log('debug','First day of the month', firstDayOfMonth);
			log('debug','First day of two months ago - This is being used as of June 5th 2015', firstDayOfTwoMonthsAgo);
			
			qflt.push(new nlobjSearchFilter('trandate', null, 'onorafter',nlapiDateToString(firstDayOfTwoMonthsAgo)));
		}
		
		if (paramLastProcId) {
			qflt.push(new nlobjSearchFilter('internalidnumber', null, 'lessthan', paramLastProcId));
		}
	}
	
	var qcol = [new nlobjSearchColumn('internalid').setSort(true)];
	
	var qrs = nlapiSearchRecord('estimate', null, qflt, qcol);
	
	log('debug','Size of Quotes', (qrs?qrs.length:0));
	
	//loop through each and requeue
	for (var i=0; qrs && i < qrs.length; i += 1) 
	{
		
		var arSoList = [];
		var invCount = 0;
		//1. Grab count of all Sales Orders created from THIS quote, AND populate into LIST of Arrays
		var soflt = [new nlobjSearchFilter('createdfrom', null, 'anyof', [qrs[i].getValue('internalid')]),
		             new nlobjSearchFilter('mainline', null, 'is','T')];
		var socol = [new nlobjSearchColumn('internalid')];
		
		//TODO: Try using Search Record first. Assuming there are no more than 1000 SO created off of Quote
		var sors = nlapiSearchRecord('salesorder', null, soflt, socol);
		for (var so=0; sors && so < sors.length; so += 1) 
		{
			arSoList.push(sors[so].getValue('internalid'));
		}
		
		//2. Grab count of ALL Invoices created from Sales Order collected from Step 1. This indicates ALL invoices created from THIS Quote
		if (arSoList.length > 0) {
			var ivflt = [new nlobjSearchFilter('createdfrom', null, 'anyof', arSoList),
			             new nlobjSearchFilter('mainline', null, 'is','T')];
			var ivcol = [new nlobjSearchColumn('internalid', null, 'count')];
			var ivrs = nlapiSearchRecord('invoice', null, ivflt, ivcol);
			
			if (ivrs && ivrs.length > 0)
			{
				invCount = ivrs[0].getValue('internalid', null, 'count');
			}
		}
		
		//Run Update on Quote.
		var updFlds = ['custbody_sales_order_count','custbody_invoice_count'];
		var updVals = [arSoList.length, invCount];
		
		try
		{
			nlapiSubmitField('estimate', qrs[i].getValue('internalid'), updFlds, updVals, false);
			
			log('debug','processing id', qrs[i].getValue('internalid')+' // SO: '+arSoList.length+' // INV: '+invCount);
		}
		catch (upderr)
		{
			log('error','Error Updating Count for Quote','Quote ID: '+qrs[i].getValue('internalid')+' SO Count: '+arSoList.length+' // INV Count: '+invCount);
		}
				
		//Set % completed of script processing
		var pctCompleted = Math.round(((i+1) / qrs.length) * 100);
		nlapiGetContext().setPercentComplete(pctCompleted);
		
		if ((i+1)==1000 || ((i+1) < qrs.length && nlapiGetContext().getRemainingUsage() < 1000)) {
			//reschedule
			nlapiLogExecution('debug','Getting Rescheduled at', qrs[i].getId());
			var rparam = new Object();
			rparam['custscript_340_lastprocid'] = qrs[i].getId();
			rparam['custscript_340_isdailyprocess'] = paramIsDailyProcess;
			nlapiScheduleScript(nlapiGetContext().getScriptId(), nlapiGetContext().getDeploymentId(), rparam);
			break;
		}
		
	}
	
}