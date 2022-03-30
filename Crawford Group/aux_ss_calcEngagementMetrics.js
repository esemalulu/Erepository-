/**
 * Scheduled script that will run through each Engagement (job) and calculate reporting metrics.
 * A) Marketing Services Budget = Sum of Sales Order and Credit Note (Credit Memo) Lines (Professional Marketing Services) attached to the Engagement Record. 
 * 								  12/21/2015
 * 								  Add Value from Marketing Service Adjustment
 * B) Pass Through Budgeted = Sum of Sales Order Lines and Credit Note Lines (Pass Through Expenses) attached to the Engagement Record.
 * 							  12/21/2015
 * 							  Add Value from Pass Through Adjustment
 * 								- Original Name: Pass Through Expenses Budget
 * 
 * C) Travel Expenses Budget = Sum of Sales Order Lines and Credit Note Lines (Travel Expenses) attached to the Engagement Record. Use Rate Column instead of Amount.
 * D) Resource Time Expense =  Sum of all actual time against all project tasks attached to the Engagement record.  Actual Work * Unit Price
 * 							   12/21/2015
 * 								- Original Name: Marketing Services Used
 *  
 * E) Resource Time Expense (Unit Cost) =  Sum of all actual time against all project tasks attached to the Engagement record.  Actual Work * Unit Cost
 * F) 	Marketing Services Invoiced = Sum of all the Invoice lines (Professional Marketing Services) attached to the Engagement Record
 * 								    12/21/2015 
 * 									- Original Name: Actual Mktg Services Billed
 * 
 * G) Used Pass Through Expenses =  Sum of all Vendor Bills and Credits (Vendor Credits) related to the Engagement Record
 * 		12/21/2015
 * 		- Original Name: Actual Pass Through Expenses
 * 
 * H) Pass Through Expenses Invoiced = Sum of all Invoice lines (Pass Through Expenses) attached to the Engagement Record
 * 	- Original Name: Actual Pass Through Expenses Billed
 * 
 * I) Actual Travel Expenses = Sum of all Invoice lines (Travel Expenses) and Employee Expense Reports (with corresponding Expense Categories - see Expense Category/Expense Account Listing.csv) attached to the Engagement Record
 * J) Marketing Budget Balance = Currency calculation of (A) - (D) 
 * 		12/21/2015
 * 		- Marketing Services Remaining
 * 
 * K) Pass Through Exp Balance =  Currency calculation of (B) - (G)
 * L) Travel Expense Remaining = Currency calculation of  (C) - (I) 
 * 		- Original Name: Travel Expenses Balance

 * 
 * - 11/18/2015 - Requested by client on 11/9 to Add separate reporting metrix for Service Fee item.
 * 				  This is Same Formula as A) Marketing Services Budget but with Service Fee Item and NOT Professional Marketing Services Item.
 * 
 * R) Service Fee Budget = Sum of Sales Order and Credit Note (Credit Memo) Lines (Service Fee) attached to the Engagement Record.
 * 
 * - 11/18/2015 - Update Gross Profit calculation to include R) 
 * M) Gross Profit = Currency calculation of [(A) + (R)] - (E)
 *  ** N,O,P is Billable calculation
 * 
 * - 11/18/2015 - Update Gross Margin
 * Q)	  Gross Margin % = ([A+R] - E)/ [A+R]
 * 
 * 12/21/2015 - Add in Marketing Service Adjustment and Pass Through Adjustment values 
 * S) Marketing Service Adjustment = All Journal Entries logged against 4000 income account
 * 
 * T) Pass Through Adjustment = All Journal Entries logged against 4050 income account
 * 
 */

/**
 * @param {String} type Context Types: scheduled, ondemand, userinterface, aborted, skipped
 * @returns {Void}
 */
function calcEngagementRptMetrics(type) {

	var paramCustEngId = nlapiGetContext().getSetting('SCRIPT', 'custscript_sb29_custjobid'),
		paramLastProcEngId = nlapiGetContext().getSetting('SCRIPT','custscript_sb29_lastprocid'),
		paramAdjSerLineValue = nlapiGetContext().getSetting('SCRIPT','custscript_sb29_adjjeserline'),
		paramAcct4000 = nlapiGetContext().getSetting('SCRIPT','custscript_sb29_acct4000'),
		paramAcct4050 = nlapiGetContext().getSetting('SCRIPT','custscript_sb29_acct4050'),
		//This value is set at the script deployment level.
		//Value indicates how many hours are in a Day from Hours to Day calculation
		paramNumHoursInDay = nlapiGetContext().getSetting('SCRIPT','custscript_sb29_numhoursinday');
	
	try
	{
		
		//Execute against Engagement records with status of "In Progress","In Progress/Pending PO","Delivered" by Default.
		var engflt = [
		    new nlobjSearchFilter('isinactive', null, 'is','F'),
		    new nlobjSearchFilter('status', null, 'anyof', ['2','4','3'])
		];
		
		//If Custom is passed in, grab that Engagement ONLY
		if (paramCustEngId)
		{
			engflt.push(new nlobjSearchFilter('internalid', null, 'anyof', paramCustEngId));
		}
		
		//If last processed ID is passed in, return list of Engagement still left to process. List will be sorted by Internal ID DESC order
		if (paramLastProcEngId)
		{
			engflt.push(new nlobjSearchFilter('internalidnumber', null, 'lessthan', paramLastProcEngId));
		}
		
		var engcol = [
		    new nlobjSearchColumn('internalid').setSort(true),
		    new nlobjSearchColumn('entityid'),
		    //Added 9/26/2015
		    new nlobjSearchColumn('custentity_adx_billabledays')
		];
		
		var engrs = nlapiSearchRecord('job', null, engflt, engcol);
		
		for (var i=0; engrs && i < engrs.length; i+=1)
		{
			
			//JSON Object to hold value for each metric points
			var metricjson={
				'a':{
					'field':'custentity_axrpt_mktservicebudget',
					'value':0.0
				},
				'b':{
					'field':'custentity_axrpt_passtexpbudget',
					'value':0.0
				},
				'c':{
					'field':'custentity_axrpt_travelexpbudget',
					'value':0.0
				},
				'd':{
					'field':'custentity_axrpt_restimeexp',
					'value':0.0
				},
				'e':{
					'field':'custentity_axrpt_restimeexpuc',
					'value':0.0
				},
				'f':{
					'field':'custentity_axrpt_actmktservbilled',
					'value':0.0
				},
				'g':{
					'field':'custentity_axrpt_actpassthexp',
					'value':0.0
				},
				'h':{
					'field':'custentity_axrpt_actpassthrexpbilled',
					'value':0.0
				},
				'i':{
					'field':'custentity_axrpt_acttravelexp',
					'value':0.0
				},
				'j':{
					'field':'custentity_axrpt_mktbudgetbalance',
					'value':0.0
				},
				'k':{
					'field':'custentity_axrpt_passthrexpbalance',
					'value':0.0
				},
				'l':{
					'field':'custentity_axrpt_travelexpbalance',
					'value':0.0
				},
				'm':{
					'field':'custentity_axrpt_grossprofit',
					'value':0.0
				},
				'q':{
					'field':'custentity_axrpt_grossmarginprec',
					'value':0.0
				},
				'r':{
					'field':'custentity_axrpt_servicefee',
					'value':0.0
				},
				's':{
					'field':'custentity_axrpt_mktseradj',
					'value':0.0
				},
				't':{
					'field':'custentity_axrpt_passthradj',
					'value':0.0
				}
			};
			
			//12/21/2015 - Add in S) Marketing Service Adjustment and T) Pass Through Adjustment first.
			//			   They need to be applied to below calculations
			//S) Marketing Service Adjustment = All Journal Entries for Engaglement logged against 4000 income account
			//T) Pass Through Adjustment= All Journal Entries for Engagement logged against 4050 income account
			var adjflt = [new nlobjSearchFilter('internalid',null,'anyof',engrs[i].getValue('internalid')),
			              new nlobjSearchFilter('type','transaction','anyof',['Journal']),
			              new nlobjSearchFilter('accounttype','transaction','anyof',['Income']),
			              new nlobjSearchFilter('class','transaction','anyof',paramAdjSerLineValue)];
			var adjcol = [new nlobjSearchColumn('account','transaction','group').setSort(),
			              new nlobjSearchColumn('amount','transaction','sum')];
			
			var adjrs = nlapiSearchRecord('job', null, adjflt, adjcol);
			for (var adj=0; adjrs && adj < adjrs.length; adj+=1)
			{
				//check to see which field value need to set
				//There can only be two account 4000 or 4050
				if (adjrs[adj].getValue('account','transaction','group') == paramAcct4000)
				{
					//This is S) marketing service budget
					metricjson['s'].value = (adjrs[adj].getValue('amount','transaction','sum'))?adjrs[adj].getValue('amount','transaction','sum'):0.0;
				}
				else if (adjrs[adj].getValue('account','transaction','group') == paramAcct4050)
				{
					//This is T) Pass Through Expense budget
					metricjson['t'].value = (adjrs[adj].getValue('amount','transaction','sum'))?adjrs[adj].getValue('amount','transaction','sum'):0.0;
				} 
			}
			
			
			//go through series of custom searches to get values of each Report Metrics
			//-------------------------
			//A) Marketing Services Budget =  
			//		Sum of Sales Order and Credit Note (Credit Memo) Lines (Professional Marketing Services) 
			//		attached to the Engagement Record.
			//	11/6/2015 - Client Request
			//		- Do not include Cancelled Sales Orders
			//		- To support M) Calculation, add Service Fee item as well
			//	11/17/2015 - Above M) Calculation is NOT to add Service Fee to THIS Marketing budget but to have it as separate search with Service Fee ONLY
			var raflt = [
			    new nlobjSearchFilter('type', null, 'anyof', ['SalesOrd','CustCred']),
			    new nlobjSearchFilter('status', null, 'noneof',['SalesOrd:C']), //Sales Order Status NONE of Cancelled
			    new nlobjSearchFilter('item', null, 'anyof',['5']), //Item ID of Professional Marketing Services
			    new nlobjSearchFilter('internalid', 'jobmain', 'anyof',engrs[i].getValue('internalid')),
			    new nlobjSearchFilter('mainline', null, 'is', 'F'),
			    new nlobjSearchFilter('taxline', null, 'is','F'),
			    new nlobjSearchFilter('shipping', null, 'is','F'),
			    new nlobjSearchFilter('cogs', null, 'is', 'F')
			];
			
			var racol = [
			    new nlobjSearchColumn('amount', null, 'sum')
			];
			
			var rars = nlapiSearchRecord('transaction', null, raflt, racol);
			metricjson['a'].value = (rars && rars[0].getValue('amount',null,'sum'))?rars[0].getValue('amount',null,'sum'):0.0;
			//12/21/2015 - Add in value from s Marketing service adjustment
			metricjson['a'].value = parseFloat(metricjson['a'].value) +
									parseFloat(metricjson['s'].value);
			
			//-------------------------
			//B) Pass Through Expenses Budget =   
			//		Sum of Sales Order Lines and Credit Note Lines (Pass Through Expenses) attached to the Engagement Record.
			// 11/6/2015 - Client Request
			//		- Do not include Cancelled Sales Orders
			var rbflt = [
			    new nlobjSearchFilter('type', null, 'anyof', ['SalesOrd','CustCred']),
			    new nlobjSearchFilter('status', null, 'noneof',['SalesOrd:C']), //Sales Order Status NONE of Cancelled
			    new nlobjSearchFilter('item', null, 'anyof',['6']), //Item ID of Pass Through Expenses
			    new nlobjSearchFilter('internalid', 'jobmain', 'anyof',engrs[i].getValue('internalid')),
			    new nlobjSearchFilter('mainline', null, 'is', 'F'),
			    new nlobjSearchFilter('taxline', null, 'is','F'),
			    new nlobjSearchFilter('shipping', null, 'is','F'),
			    new nlobjSearchFilter('cogs', null, 'is', 'F')
			];
			
			var rbcol = [
			    new nlobjSearchColumn('amount', null, 'sum')
			];
			
			var rbrs = nlapiSearchRecord('transaction', null, rbflt, rbcol);
			metricjson['b'].value = (rbrs && rbrs[0].getValue('amount',null,'sum'))?rbrs[0].getValue('amount',null,'sum'):0.0;
			
			//12/21/2015 - Add in value from t Pass through adjustment
			metricjson['b'].value = parseFloat(metricjson['b'].value) +
									parseFloat(metricjson['t'].value);
			
			//-------------------------
			//C) Travel Expenses Budget =    
			//		Sum of Sales Order Lines and Credit Note Lines (Travel Expenses) attached to the Engagement Record. 
			//		Use Rate Column instead of Amount.
			var rcflt = [
			    new nlobjSearchFilter('type', null, 'anyof', ['SalesOrd','CustCred']),
			    new nlobjSearchFilter('item', null, 'anyof','10'), //Item ID of Travel Expenses
			    new nlobjSearchFilter('internalid', 'jobmain', 'anyof',engrs[i].getValue('internalid')),
			    new nlobjSearchFilter('mainline', null, 'is', 'F'),
			    new nlobjSearchFilter('taxline', null, 'is','F'),
			    new nlobjSearchFilter('shipping', null, 'is','F'),
			    new nlobjSearchFilter('cogs', null, 'is', 'F')
			];
			
			var rccol = [
			    new nlobjSearchColumn('rate', null, 'sum')
			];
			
			var rcrs = nlapiSearchRecord('transaction', null, rcflt, rccol);
			metricjson['c'].value = (rcrs && rcrs[0].getValue('rate',null,'sum'))?rcrs[0].getValue('rate',null,'sum'):0.0;
			
			//-------------------------
			//D) Resource Time Expense =     
			//		Sum of all actual time against all project tasks attached to the Engagement record.  
			//		Actual Work * Unit Price
			var rdflt = [
			    new nlobjSearchFilter('internalid', 'job', 'anyof',engrs[i].getValue('internalid'))
			];
			
			var formulaCurrencyColObjD = new nlobjSearchColumn('formulacurrency', null, 'sum');
			formulaCurrencyColObjD.setFormula('{projecttaskassignment.actualwork} * {projecttaskassignment.unitprice}');
			var rdcol = [
			    formulaCurrencyColObjD
			];
			
			var rdrs = nlapiSearchRecord('projecttask', null, rdflt, rdcol);
			metricjson['d'].value = (rdrs && rdrs[0].getValue(formulaCurrencyColObjD))?rdrs[0].getValue(formulaCurrencyColObjD):0.0;
			
			//-------------------------
			//E) Resource Time Expense (Unit Cost) =       
			//		Sum of all actual time against all project tasks attached to the Engagement record.  
			//		Actual Work * Unit Cost
			var reflt = [
			    new nlobjSearchFilter('internalid', 'job', 'anyof',engrs[i].getValue('internalid'))
			];
			
			var formulaCurrencyColObjE = new nlobjSearchColumn('formulacurrency', null, 'sum');
			formulaCurrencyColObjE.setFormula('{projecttaskassignment.actualwork} * {projecttaskassignment.unitcost}');
			var recol = [
			    formulaCurrencyColObjE
			];
			
			var rers = nlapiSearchRecord('projecttask', null, reflt, recol);
			metricjson['e'].value = (rers && rers[0].getValue(formulaCurrencyColObjE))?rers[0].getValue(formulaCurrencyColObjE):0.0;
			
			//-------------------------
			//F) Actual Mktg Services Billed = 
			//		Sum of all the Invoice lines (Professional Marketing Services) attached to the Engagement Record
			// 11/6/2015 - Client Request
			//		- Do NOT include Invice status of Rejected
			var rfflt = [
			    new nlobjSearchFilter('type', null, 'anyof', ['CustInvc']),
			    new nlobjSearchFilter('status', null, 'noneof', ['CustInvc:E']), //Invoice status none of Rejected
			    new nlobjSearchFilter('item', null, 'anyof','5'), //Item ID of Professional Marketing Services
			    new nlobjSearchFilter('internalid', 'jobmain', 'anyof',engrs[i].getValue('internalid')),
			    new nlobjSearchFilter('mainline', null, 'is', 'F'),
			    new nlobjSearchFilter('taxline', null, 'is','F'),
			    new nlobjSearchFilter('shipping', null, 'is','F'),
			    new nlobjSearchFilter('cogs', null, 'is', 'F')
			];
			
			var rfcol = [
			    new nlobjSearchColumn('amount', null, 'sum')
			];
			
			var rfrs = nlapiSearchRecord('transaction', null, rfflt, rfcol);
			metricjson['f'].value = (rfrs && rfrs[0].getValue('amount',null,'sum'))?rfrs[0].getValue('amount',null,'sum'):0.0;
			
			//-------------------------
			//G) Actual Pass Through Expenses =  
			//		Sum of all Vendor Bills and Credits (Vendor Credits)
			//		Credit Card and Credit Card Refund
			//		related to the Engagement Record
			
			var rgflt = [
			    new nlobjSearchFilter('type', null, 'anyof', ['VendBill','VendCred','CardChrg','CardRfnd']),
			    //1/26/2016 - Request by client - Add in Pass Through Expenses, Travel Expense Specifically
			    //2/2/2016 - Should ONLY include Pass Through NOT Travel
			    new nlobjSearchFilter('item', null, 'anyof',['6']), 
			    new nlobjSearchFilter('internalid', 'job', 'anyof',engrs[i].getValue('internalid')),
			    new nlobjSearchFilter('mainline', null, 'is', 'F')
			];
			
			var rgcol = [
			    new nlobjSearchColumn('amount', null, 'sum')
			];
			
			var rgrs = nlapiSearchRecord('transaction', null, rgflt, rgcol);
			
			//2550 and 2540 vendor bill that was created from TriNet
			//2/17/2016 - Client requested to include vendor bill which contains expense lines specifically created with TriNet as part of memo.
			//			  In order make sure we are grabbing correct value, below search filter will be used:
			//			  Main Line Memo contains the word "TriNet Expense"
			//			  Line level accounts goes to 5250 or 5240
			var rgtriflt = [new nlobjSearchFilter('mainline', null, 'is','F'),
			                new nlobjSearchFilter('internalid','job','anyof',engrs[i].getValue('internalid')),
			                new nlobjSearchFilter('memomain', null, 'contains','TriNet Expense'),
			                new nlobjSearchFilter('account', null, 'anyof', ['489','491'])],
				rgtricol = [new nlobjSearchColumn('amount',null,'sum')],
				rgtrs = nlapiSearchRecord('vendorbill', null, rgtriflt, rgtricol);
			
			var passThroughExpFromTriNet = 0.0;
			if (rgtrs && rgtrs[0].getValue('amount', null, 'sum'))
			{
				passThroughExpFromTriNet = parseFloat(rgtrs[0].getValue('amount', null, 'sum'));
			}
			
			metricjson['g'].value = (rgrs && rgrs[0].getValue('amount',null,'sum'))?rgrs[0].getValue('amount',null,'sum'):0.0;
			//2/17/2017 - Add the Pass through value from TriNet Expense
			metricjson['g'].value = parseFloat(metricjson['g'].value) +
									passThroughExpFromTriNet;
			
			//-------------------------
			//H) Actual Pass Through Expenses Billed =  
			//		Sum of all Invoice lines (Pass Through Expenses) attached to the Engagement Record
			// 11/6/2015 - Client Request
			//		- Include Credit Memo
			//		- Do NOT include Invice status of Rejected
			var rhflt = [
			    new nlobjSearchFilter('type', null, 'anyof', ['CustInvc','CustCred']),
			    new nlobjSearchFilter('status', null, 'noneof', ['CustInvc:E']), //Invoice status none of Rejected
			    new nlobjSearchFilter('item', null, 'anyof','6'), //Item ID of Pass Through Expenses
			    new nlobjSearchFilter('internalid', 'jobmain', 'anyof',engrs[i].getValue('internalid')),
			    new nlobjSearchFilter('mainline', null, 'is', 'F'),
			    new nlobjSearchFilter('taxline', null, 'is','F'),
			    new nlobjSearchFilter('shipping', null, 'is','F'),
			    new nlobjSearchFilter('cogs', null, 'is', 'F')
			];
			
			var rhcol = [
			    new nlobjSearchColumn('amount', null, 'sum')
			];
			
			var rhrs = nlapiSearchRecord('transaction', null, rhflt, rhcol);
			metricjson['h'].value = (rhrs && rhrs[0].getValue('amount',null,'sum'))?rhrs[0].getValue('amount',null,'sum'):0.0;
			
			//-------------------------
			//I) Actual Travel Expenses =   
			//		Sum of all Invoice lines (Travel Expenses) and Employee Expense Reports 
			//		(with corresponding Expense Categories - see Expense Category/Expense Account Listing.csv) 
			//		attached to the Engagement Record
			//2/2/2016 - Client requested to use the SAME search filter against VENDOR BILL as G but for Travel Expenses.
			var travelExpValue = 0.0,
				empExpenseRptValue = 0.0;
			
			/**
			var riaflt = [
			    new nlobjSearchFilter('type', null, 'anyof', ['CustInvc']),
			    new nlobjSearchFilter('item', null, 'anyof','10'), //Item ID of Travel Expenses
			    new nlobjSearchFilter('internalid', 'jobmain', 'anyof',engrs[i].getValue('internalid')),
			    new nlobjSearchFilter('mainline', null, 'is', 'F'),
			    new nlobjSearchFilter('taxline', null, 'is','F'),
			    new nlobjSearchFilter('shipping', null, 'is','F'),
			    new nlobjSearchFilter('cogs', null, 'is', 'F')
			];
			*/
			var riaflt = [
						    new nlobjSearchFilter('type', null, 'anyof', ['VendBill','VendCred','CardChrg','CardRfnd']),
						    //2/2/2016 - Travel Expense against vendor bill NOT invoice. 
						    new nlobjSearchFilter('item', null, 'anyof',['10']), 
						    new nlobjSearchFilter('internalid', 'job', 'anyof',engrs[i].getValue('internalid')),
						    new nlobjSearchFilter('mainline', null, 'is', 'F')
						];
			
			var riacol = [
			    new nlobjSearchColumn('amount', null, 'sum')
			];
			
			var riars = nlapiSearchRecord('transaction', null, riaflt, riacol);
			travelExpValue = (riars && riars[0].getValue('amount',null,'sum'))?riars[0].getValue('amount',null,'sum'):0.0;
			
			var ribflt = [
				new nlobjSearchFilter('type', null, 'anyof', ['ExpRept']),
				//Expense Categories: Engagement Cost - Airfare, Engagement Cost - Lodging, 
				//					  Engagement Cost - Meals, Engagement Cost - Mileage, 
				//					  Engagement Cost - Mobile Phone, Engagement Cost - Other, 
				//					  Engagement Cost - Travel Other
				new nlobjSearchFilter('expensecategory', null, 'anyof',['2','3','4','5','6','11','9']), 
				new nlobjSearchFilter('internalid', 'jobmain', 'anyof',engrs[i].getValue('internalid')),
				new nlobjSearchFilter('mainline', null, 'is', 'F'),
				new nlobjSearchFilter('taxline', null, 'is','F'),
				new nlobjSearchFilter('shipping', null, 'is','F'),
				new nlobjSearchFilter('cogs', null, 'is', 'F')
			];
						
			var ribcol = [
				new nlobjSearchColumn('amount', null, 'sum')
			];
						
			var ribrs = nlapiSearchRecord('transaction', null, ribflt, ribcol);
			empExpenseRptValue = (ribrs && ribrs[0].getValue('amount',null,'sum'))?ribrs[0].getValue('amount',null,'sum'):0.0;
			
			//Add them together and set it on the metricjson.i
			metricjson['i'].value = parseFloat(travelExpValue) + parseFloat(empExpenseRptValue);
			
			//-------------------------
			//J) Marketing Budget Balance = 
			//		Currency calculation of (A) - (D)   
			metricjson['j'].value = parseFloat(metricjson['a'].value) - parseFloat(metricjson['d'].value);
			
			//-------------------------
			//K) Pass Through Exp Balance =   
			//		Currency calculation of (B) - (G)   
			metricjson['k'].value = parseFloat(metricjson['b'].value) - parseFloat(metricjson['g'].value);
			
			//-------------------------
			//L) Travel Expenses Balance =    
			//		Currency calculation of  (C) - (I)   
			metricjson['l'].value = parseFloat(metricjson['c'].value) - parseFloat(metricjson['i'].value);
			
			//-------------------------
			//R) Service Fee Budget =  
			//		Sum of Sales Order and Credit Note (Credit Memo) Lines (Service Fee) 
			//		attached to the Engagement Record.
			var rrflt = [
			    new nlobjSearchFilter('type', null, 'anyof', ['SalesOrd','CustCred']),
			    new nlobjSearchFilter('status', null, 'noneof',['SalesOrd:C']), //Sales Order Status NONE of Cancelled
			    new nlobjSearchFilter('item', null, 'anyof',['13']), //Item ID of Service Fee
			    new nlobjSearchFilter('internalid', 'jobmain', 'anyof',engrs[i].getValue('internalid')),
			    new nlobjSearchFilter('mainline', null, 'is', 'F'),
			    new nlobjSearchFilter('taxline', null, 'is','F'),
			    new nlobjSearchFilter('shipping', null, 'is','F'),
			    new nlobjSearchFilter('cogs', null, 'is', 'F')
			];
			
			var rrcol = [
			    new nlobjSearchColumn('amount', null, 'sum')
			];
			
			var rrrs = nlapiSearchRecord('transaction', null, rrflt, rrcol);
			metricjson['r'].value = (rrrs && rrrs[0].getValue('amount',null,'sum'))?rrrs[0].getValue('amount',null,'sum'):0.0;
			
			//-------------------------
			//M) Gross Profit =     
			//		Currency calculation of (A) - (E) (This was original request. This is now invalid. Below is updated formula)   
			
			//- 11/18/2015 - Update Gross Profit calculation to include R) 
			//  Gross Profit = Currency calculation of [(A) + (R)] - (E)
			 
			metricjson['m'].value = (parseFloat(metricjson['a'].value) + parseFloat(metricjson['r'].value) ) - parseFloat(metricjson['e'].value);
			
			//-------------------------
			//Q) Gross Margin % =     
			//		Percentage calculation of (A) - (E)/(A) (This was original request. This is now invalid. Below is updated formula)
			
			// - 11/18/2015 - Update Gross Margin
			//	 Gross Margin % = ([A+R] - E)/ [A+R]
			if (parseFloat(metricjson['a'].value) > 0)
			{
				metricjson['q'].value = ( 
											( 
												(parseFloat(metricjson['a'].value) + 
												parseFloat(metricjson['r'].value)) - 
												parseFloat(metricjson['e'].value)
											)
											/
											(
												parseFloat(metricjson['a'].value) + 
												parseFloat(metricjson['r'].value) 
											) 
										) * 100;
			}
			
			//Now go through and Update the Engagement record.
			var updflds = [], 
				updvals = [];
			
			for (var m in metricjson)
			{
				updflds.push(metricjson[m].field);
				updvals.push(metricjson[m].value);
			}
			
			nlapiSubmitField('job', engrs[i].getValue('internalid'), updflds, updvals, false);
			log('debug','Engagement ID: '+engrs[i].getValue('internalid'),'Updated with Metrics: '+JSON.stringify(metricjson));
			
			//---------------------------------------------------
			//ADD IN RESCHEDULE LOGIC HERE
			//Set % completed of script processing
			var pctCompleted = Math.round(((i+1) / engrs.length) * 100);
			nlapiGetContext().setPercentComplete(pctCompleted);
			//j=0; parentTrxRs 
			//Reschedule for customer loop
			if ((i+1)==1000 || ((i+1) < engrs.length && nlapiGetContext().getRemainingUsage() < 500)) 
			{
				//reschedule
				log('audit','Getting Rescheduled at', engrs[i].getValue('internalid'));
				var rparam = new Object();
				rparam['custscript_sb29_lastprocid'] = engrs[i].getValue('internalid');
				nlapiScheduleScript(nlapiGetContext().getScriptId(), nlapiGetContext().getDeploymentId(), rparam);
				break;
			}
		}
		
	}
	catch(procerr)
	{
		//at this point, throw the error to notify admins
		log('error','Error Processing Engagement Calculation', getErrText(procerr));
		throw nlapiCreateError('ENG_CALC_ERR', 'Error Processing Engagement Calculation: '+getErrText(procerr), false);
	}
	
}
