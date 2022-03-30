/** 
 * User Event script deployed against PO.
 * This is to be executed ONLY for User Interface to precalculate and store value for Remaining Budget column
 * @param type
 * @param form
 * @param request
 */
function beforeLoadPoBudget(type, form, request) {
	if (!canProcess(type))
	{
		return;
	}

	/**
	 * KEY = account text
	 * VALUE = {
	 * 		"budget":"xxx",
	 * 		"remaining":"xxxxx",
	 * 		"currency":"",
	 * 		"bicp":"0.0",
	 * 		"journal":"0.0"
	 * };
	 */
	var budgetJson = {};
	
	try 
	{
		
		//1. Build list of Unique Account IDs by Looping through all expense sublist
		var accountList = [];
		var categoryList = [];
		for (var ex=1; ex <= nlapiGetLineItemCount('expense'); ex+=1)
		{
			var lineAccountId = nlapiGetLineItemValue('expense','account', ex);
			var lineCategoryId = nlapiGetLineItemValue('expense','category',ex);
			
			log('debug','Line '+ex, 'Account: '+lineAccountId);
			
			if (!accountList.contains(lineAccountId))
			{
				accountList.push(lineAccountId);
			}
			
			if (!categoryList.contains(lineCategoryId))
			{
				categoryList.push(lineCategoryId);
			}
		}
		
		//2. As long as accountList array is NOT empty proceed to search out all budget by FY YEAR and 
		if (accountList.length > 0 || categoryList.length > 0)
		{
			//Call function to generate budgetJson
			budgetJson = generateBudgeJson(accountList, categoryList, nlapiGetRecordId(), nlapiStringToDate(nlapiGetFieldValue('trandate')).getFullYear());
		}
	}
	catch (loadbudgeterr)
	{
		log('error','Error Generating Budget JSON',getErrText(loadbudgeterr));
	}	
	
	//4. Add to dynamic Field
	var jsonObjFld = form.addField('custpage_budgejson', 'inlinehtml', '', null, null);
	jsonObjFld.setDefaultValue('<script language="JavaScript">var budgetJson='+JSON.stringify(budgetJson)+';</script>');
}

/******* Client Side Scripts ***/
var recordActionType = '';
/**
 * On Page Init clinet function
 */
function poMonitorPageInit(type)
{
	//Page init, you only want to trigger for edit and copy
	if (!canProcess(type))
	{
		return;
	}
	
	recordActionType = type;
	
	setRemainingBudgetOnLine();
}

/**
 * On Save Client function
 * //before saving, notify user if any line is about to go over the budget
 */
function poMonitorOnSave()
{
	
	if (nlapiGetContext().getExecutionContext() != 'userinterface')
	{
		return;
	}
	
	//build JSON of TOTAL Line value by Account
	var lineJson = {};
	var acctToCat = {};
	for (var ex=1; ex <= nlapiGetLineItemCount('expense'); ex+=1)
	{
		var lineAccountValue = nlapiGetLineItemValue('expense','account', ex);
		var lineCategoryValue = nlapiGetLineItemValue('expense','category',ex);
		//cattoacct
		//Try grabbing lineAccountValue based on Category
		if (!lineAccountValue && lineCategoryValue && budgetJson && budgetJson.cattoacct)
		{
			lineAccountValue = budgetJson.cattoacct[lineCategoryValue];
			acctToCat[lineAccountValue] = nlapiGetLineItemText('expense','category',ex);
		}
		
		if (!lineJson[lineAccountValue])
		{
			lineJson[lineAccountValue] = 0.0;
		}
		//sum up total account value
		lineJson[lineAccountValue] = parseFloat(lineJson[lineAccountValue]) + parseFloat(nlapiGetLineItemValue('expense','amount', ex));
	}
	
	//Loop through each lineJson and make sure we are not going over
	var overBudgetAccounts = [];
	for (var lb in lineJson)
	{
		if (budgetJson[lb] && parseFloat(lineJson[lb]) > parseFloat(budgetJson[lb].remaining) ) 
		{
			//if acctToCategory exists, show only the category
			if (acctToCat[lb])
			{
				overBudgetAccounts.push(acctToCat[lb]);
			}
			else
			{
				overBudgetAccounts.push(budgetJson[lb].name);
			}
			
		}
	}
	
	//if we have over budget accounts, show it on the header Warn the user
	var warningMessage = '';
	if (overBudgetAccounts.length > 0)
	{
		//set custbody_ax_overbudgetwarning with warning
		warningMessage = '<span style="color: red; font-weight: bold">Following Expense account(s) over budget:<br/><br/>'+overBudgetAccounts+'</span>';
	}
	nlapiSetFieldValue('custbody_ax_overbudgetwarning',warningMessage);
	
	//Warn the user and have them confirm. THis is being done separately because the requirement is to have the warning message field set first
	if (overBudgetAccounts.length > 0)
	{
		if (confirm(overBudgetAccounts+' expense account(s) are over the budget. Do you wish to continue?'))
		{
			//return true since all is well
			return true;
		}
		else
		{
			return false;
		}
	}
	
	return true;
}

/**
 * On field change function
 * grabs updated remaining balance for all accounts
 */
function poMonitorFldChange(type, name, linenum)
{
	if (nlapiGetContext().getExecutionContext() != 'userinterface')
	{
		return;
	}
	
	if (type=='expense' && (name=='account' || name=='category') )
	{
		//loop through and grab list of ALL unique accounts
		var accountList = [];
		var categoryList = [];
		
		//Add in current line.
		if (strTrim(nlapiGetCurrentLineItemValue('expense', 'account')))
		{
			accountList.push(nlapiGetCurrentLineItemValue(type, name));
		}
		
		if (strTrim(nlapiGetCurrentLineItemValue('expense', 'category')))
		{
			categoryList.push(nlapiGetCurrentLineItemValue(type, name));	
		}
		
		//Add in rest of the line
		for (var ex=1; ex <= nlapiGetLineItemCount('expense'); ex+=1)
		{
			var lineAccountId = nlapiGetLineItemValue('expense','account', ex);
			var lineCategoryId = nlapiGetLineItemValue('expense','category', ex);
			if (strTrim(lineAccountId) && !accountList.contains(strTrim(lineAccountId)))
			{
				accountList.push(strTrim(lineAccountId));
			}
			
			if (strTrim(lineCategoryId) && !categoryList.contains(strTrim(lineCategoryId)))
			{
				categoryList.push(strTrim(lineCategoryId));
			}
		}
		
		if ((accountList.length > 0 || categoryList.length > 0) && nlapiGetFieldValue('trandate'))
		{
			var slUrl = nlapiResolveURL('SUITELET', 'customscript_aux_sl_pobudgetmonitor', 'customdeploy_aux_sl_pobudgetmonitor', 'view');
			slUrl += '&categorylist='+categoryList.toString()+
					 '&accountlist='+accountList.toString()+
					 '&year='+nlapiStringToDate(nlapiGetFieldValue('trandate')).getFullYear();
			
			if (recordActionType != 'create')
			{
				slUrl += '&poid='+nlapiGetRecordId();
			}
			var slRes = nlapiRequestURL(slUrl);
			var resJson = eval(slRes.getBody());
			if (!resJson.error)
			{
				budgetJson = resJson.budgetJson;
			}
		}
	}
}

/**
 * Recalc function
 */
function poMonitorRecalc()
{
	if (!canProcess(recordActionType))
	{
		return;
	}
	
	//Once this is done, update the remaining balance
	//Loop through each expense line and set remaining budget value appropriately
	setRemainingBudgetOnLine();
	
}

/******* Suitelet ****/
function lookupBudgetInfo(req, res) {
	
	//MUST have comma separated list of account IDs
	var paramAccountList = req.getParameter('accountlist');
	var paramCategoryList = req.getParameter('categorylist');
	var paramPoId = req.getParameter('poid');
	var paramYear = req.getParameter('year');
	
	var robj = {
		'error':false,
		'message':'',
		'budgetJson':{}
	};
	
	if ((!paramAccountList && !paramCategoryList) || !paramYear)
	{
		robj.error = true;
		robj.message = 'One or more account IDs or Category IDs and Transaction Year parameters are required';
		res.write(JSON.stringify(robj));
	}
	
	log('debug','parameters',paramAccountList+' // '+paramCategoryList+' // '+paramPoId+' // '+paramYear);
	try 
	{
		/**
		 * KEY = account text
		 * VALUE = {
		 * 		"budget":"xxx",
		 * 		"remaining":"xxxxx",
		 * 		"currency":"",
		 * 		"bicp":"0.0",
		 * 		"journal":"0.0"
		 * };
		 */
		var categoryArray = null;
		if (paramCategoryList && paramCategoryList.length > 0)
		{
			categoryArray = paramCategoryList.split(',');
		}
		
		//1. Build list of Unique Account IDs by Looping through all expense sublist
		robj.budgetJson = generateBudgeJson(paramAccountList.split(','), categoryArray, paramPoId, paramYear);
		//log('debug','gen bjson', JSON.stringify(robj.budgetJson));
	}
	catch (loadbudgeterr)
	{
		robj.error = true;
		robj.message = getErrText(loadbudgeterr);
		log('error','Error Generating Budget JSON',getErrText(loadbudgeterr));
	}	
	
	log('debug','about to return',JSON.stringify(robj));
	
	res.write('('+JSON.stringify(robj)+')');
}

/****** Helpers ****/

function setRemainingBudgetOnLine()
{
	if (!budgetJson)
	{
		return;
	}
	
	for (var ex=1; ex <= nlapiGetLineItemCount('expense'); ex+=1)
	{
		var lineAccountValue = nlapiGetLineItemValue('expense','account', ex);
		var lineCategoryValue = nlapiGetLineItemValue('expense','category',ex);
		//cattoacct
		//Try grabbing lineAccountValue based on Category
		if (!lineAccountValue && lineCategoryValue && budgetJson && budgetJson.cattoacct)
		{
			lineAccountValue = budgetJson.cattoacct[lineCategoryValue];
		}
		
		if (budgetJson && lineAccountValue && budgetJson[lineAccountValue])
		{
			//alert('setting line '+ex);
			lineHasRemainingBudget = true;
			//set remaining budget col. value custcol_remainingbudget
			nlapiSetLineItemValue('expense', 'custcol_remainingbudget', ex, budgetJson[lineAccountValue].remaining);
			
			//Set the remaining budget %  custcol_remainingbudgetpct
			//remaining/budget * 100
			var perctVal = ( parseFloat(budgetJson[lineAccountValue].remaining)/parseFloat(budgetJson[lineAccountValue].budget) ) * 100;
			perctVal = Math.ceil(perctVal);
			nlapiSetLineItemValue('expense','custcol_remainingbudgetpct', ex, perctVal+'%');
			
		} else {
			nlapiSetLineItemValue('expense', 'custcol_remainingbudget', ex, '');
		}
		
	}	
}

function canProcess(type)
{
	if (type != 'edit' && type != 'copy' && type !='create') {
		return false;
	}
	
	//ONLY execute for user interface
	if (nlapiGetContext().getExecutionContext() != 'userinterface')
	{
		return false;
	}	
	
	return true;
}

/**
 * Function to generate BudgeJSON. This function can be called from User Event before Load for Edit 
 * OR
 * From Suitelet 
 * @param _accountList
 * @param _poRecId
 * @param _tranFullYear
 */
function generateBudgeJson(_accountList, _categoryList, _poRecId, _tranFullYear)
{
	var budgetJson = {};
	
	//Clean out _accountList
	//ODD Behavior where .split(',') on a empty string is called it creates an array with empty element at index 0
	if (_accountList && !_accountList[0])
	{
		_accountList = [];
	}
	
	//7/21/2015 - Add in ability to look up accounts by Category
	var categoryToAcctJson = {};
	if (_categoryList && _categoryList.length > 0)
	{
		var expCatFlt = [new nlobjSearchFilter('internalid', null, 'anyof', _categoryList)];
		var expCatCol = [new nlobjSearchColumn('internalid'),
		                 new nlobjSearchColumn('account')];
		
		var expCatRs = nlapiSearchRecord('expensecategory', null, expCatFlt, expCatCol);
		//search expensecategory to find matching account.
		//ASSUMED there is one to one matching
		for (var ex=0; expCatRs && ex < expCatRs.length; ex+=1)
		{
			categoryToAcctJson[expCatRs[ex].getValue('internalid')] = expCatRs[ex].getValue('account');
			
			if (!_accountList || (_accountList && !_accountList.contains(expCatRs[ex].getValue('account') ) ) )
			{
				
				if (!_accountList)
				{
					_accountList = [];
				}
				_accountList.push(expCatRs[ex].getValue('account'));
			}
		}
		
		budgetJson['cattoacct'] = categoryToAcctJson;
	}
	
	
	//0. Search for Account
	var acctFlt = [new nlobjSearchFilter('internalid', null, 'anyof', _accountList)];
	var acctCol = [new nlobjSearchColumn('name'),
	               new nlobjSearchColumn('number')];
	var acctRs = nlapiSearchRecord('account',null,acctFlt, acctCol);
	
	var acctJson = {};
	
	for (var ac=0; acctRs && ac < acctRs.length; ac+=1)
	{
		
		var nameToUse = acctRs[ac].getValue('name').replace(acctRs[ac].getValue('number')+' ','');
		
		acctJson[nameToUse] = acctRs[ac].getId();
	}
	
	log('debug','acctJson',JSON.stringify(acctJson));
	
	//1. Search for Matching Budget
	var trxYear = _tranFullYear;
	var fiscalYearStart = nlapiDateToString(new Date('1/1/'+trxYear));
	var fiscalYearEnd = nlapiDateToString(new Date('12/31/'+trxYear));
	var formulaTextFilter = new nlobjSearchFilter('formulatext', null, 'is', 'FY '+trxYear);
	formulaTextFilter.setFormula('{year}');
	
	var budgetFlt = [new nlobjSearchFilter('account', null, 'anyof', _accountList),
	                 formulaTextFilter];
	
	var budgetCol = [new nlobjSearchColumn('account',null,'group'),
	                 new nlobjSearchColumn('amount',null,'sum'),
	                 new nlobjSearchColumn('currency',null,'group')];
	
	var budgetRs = nlapiSearchRecord('budgetimport', null, budgetFlt, budgetCol);
	
	//Loop through each budget and build budgetJson
	for (var b=0; budgetRs && b < budgetRs.length; b+=1)
	{
		if (!budgetJson[budgetRs[b].getValue('account',null,'group')])
		{
			log('debug','Lookup Account VALUE',budgetRs[b].getValue('account',null,'group'));
			log('debug','Lookup Account TEXT', budgetRs[b].getText('account', null,'group'));
			//look up matching account ID based on ID returned with No Number prefix from budget search
			var acctId = acctJson[budgetRs[b].getText('account',null,'group')];
			
			budgetJson[acctId]={
				'name':budgetRs[b].getValue('account',null,'group'),
				'budget':budgetRs[b].getValue('amount',null,'sum'),
				'currency':budgetRs[b].getValue('currency',null,'group'),
				'remaining':0.0,
				'bicp':0.0,
				'journal':0.0
			};
		}
	}
	
	log('debug','budgetJson after budgetImport Search', JSON.stringify(budgetJson));
	
	//4. Search for Actuals (Bill, Invoice, Cash sales) and Planned (PO)
	//Status: Bill:Open (VendBill:A), Bill:Paid In Full (VendBill:B), Bill:Pending Approval (VendBill:D), 
	//		  Cash Sale:Unapproved Payment (CashSale:A), Cash Sale:Not Deposited (CashSale:B), Cash Sale:Deposited (CashSale:C)		  
	//		  Invoice:Open (CustInvc:A), Invoice:Paid In Full (CustInvc:B), Invoice:Pending Approval (CustInvc:D), 
	// 		  
	//		  Purchase Order:Pending Supervisor Approval (PurchOrd:A), Purchase Order:Pending Receipt (PurchOrd:B), 
	//		  Purchase Order:Partially Received (PurchOrd:D), Purchase Order:Pending Billing/Partially Received (PurchOrd:E), Purchase Order:Pending Bill (PurchOrd:F), 
	var acutalBicpStatus = ['VendBill:A','VendBill:B','VendBill:D','CashSale:A','CashSale:B','CashSale:C',
	                        'CustInvc:A','CustInvc:B','CustInvc:D','PurchOrd:A','PurchOrd:B','PurchOrd:D',
	                        'PurchOrd:E','PurchOrd:F'];
	
	var actualBicpFlt = [new nlobjSearchFilter('status', null, 'anyof', acutalBicpStatus),
	                     new nlobjSearchFilter('mainline', null, 'is','F'),
	                     new nlobjSearchFilter('account', null, 'anyof', _accountList),
	                     new nlobjSearchFilter('trandate', null, 'within', fiscalYearStart, fiscalYearEnd)];
	
	if (_poRecId)
	{
		actualBicpFlt.push(new nlobjSearchFilter('internalid', null, 'noneof', _poRecId));
	}
	
	var actualCol = [new nlobjSearchColumn('account', null, 'group'),
	                 new nlobjSearchColumn('amount', null, 'sum')];
	
	var actualBicpRs = nlapiSearchRecord('transaction', null, actualBicpFlt, actualCol);
	for (var ab=0; actualBicpRs && ab < actualBicpRs.length; ab+=1)
	{
		if (budgetJson[actualBicpRs[ab].getValue('account', null, 'group')])
		{
			budgetJson[actualBicpRs[ab].getValue('account', null, 'group')]['bicp'] = actualBicpRs[ab].getValue('amount', null, 'sum');
		}
		
	}
	
	//5. Search for Actual Journal
	var actualJournalFlt = [new nlobjSearchFilter('mainline', null, 'is','T'),
	                        new nlobjSearchFilter('account', null, 'anyof', _accountList),
	                        new nlobjSearchFilter('trandate', null, 'within', fiscalYearStart, fiscalYearEnd)];
	
	if (_poRecId)
	{
		actualJournalFlt.push(new nlobjSearchFilter('internalid', null, 'noneof', _poRecId));
	}
	
	var actualJournalRs = nlapiSearchRecord('journalentry', null, actualJournalFlt, actualCol);
	for (var aj=0; actualJournalRs && aj < actualJournalRs.length; aj+=1)
	{	
		if (budgetJson[actualJournalRs[aj].getValue('account', null, 'group')])
		{
			budgetJson[actualJournalRs[aj].getValue('account', null, 'group')]['journal'] = actualJournalRs[aj].getValue('amount', null, 'sum');
		}
	}
	
	//6. Calculate Remainder value budget - (bicp + journal) for each elements
	for (var bj in budgetJson)
	{
		budgetJson[bj].remaining = parseFloat(budgetJson[bj].budget) - (parseFloat(budgetJson[bj].bicp) + parseFloat(budgetJson[bj].journal)); 
	}
	
	return budgetJson;
}