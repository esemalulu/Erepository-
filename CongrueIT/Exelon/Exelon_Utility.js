/**
 * Javascript prototype extension to simulate List.contains method
 * @param {Object} arg
 * Usage:
 * arrayObject.contains(value to search in arrayObject)
 */
Array.prototype.contains = function(arg) {
	for (i in this) {
		if (this[i]==arg) return true;
	}
	return false;
};

/**
 * Remove empty spaces before and after a string.
 * NS may return char type behavior when returning text back.
 * ie) When char field is set to 30 and actual string is 20, value returned may still be 30
 * @param {Object} stringToTrim
 */
function strTrim(stringToTrim) {
	if (!stringToTrim) {
		return '';
	}
	return stringToTrim.replace(/^\s+|\s+$/g,"");	
}


/**
 * Helper function to write custom debug/error message.
 * This function is to shortten the amount of code you have to write.
 * @param {Object} _type
 * @param {Object} _title
 * @param {Object} _msg
 */
function log(_type, _title, _msg) {
	nlapiLogExecution(_type, _title, _msg);
}

/**
 * validates email address format
 * @param email
 * @returns
 */
function validateEmail(email) { 
    var re = /^(([^<>()[\]\\.,;:\s@\"]+(\.[^<>()[\]\\.,;:\s@\"]+)*)|(\".+\"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
    return re.test(email);
}

/**
 * Translates Error into standarized text.
 * @param {Object} _e
 */
function getErrText(_e) {
	var txt='';
	if (_e instanceof nlobjError) {
		//this is netsuite specific error
		txt = 'NLAPI Error: '+_e.getCode()+' :: '+_e.getDetails();
	} else {
		//this is generic javascript error
		txt = 'JavaScript/Other Error: '+_e.toString();
	}
	
	txt = strGlobalReplace(txt, "\r", " || ");
	txt = strGlobalReplace(txt,"\n", " || ");
	
	return txt;
}

/**
 * Helper function to GLOBALLY search and replace char or word with provided char or word
 * @param _fullString - Original String Value
 * @param _searchChar - Char or Word to search for
 * @param _replaceChar - Char or Word to replace with.
 * @returns
 */
function strGlobalReplace(_fullString, _searchChar, _replaceChar) {
	var jsrs = new RegExp(_searchChar, "g");
	
	return _fullString.replace(jsrs,_replaceChar);
}


//7/7/2016 
//  1. Grab list of Rules for Issue Sub Account
//	2. Search against replica search of Jounral Extract Candidate.
//		 Uses custom build search filter that matches the 
//			"customsearch_mc_netactivity_eps_5_2_3_2" Saved Search
//	Function CAN BE called from Client Side.
//		THIS is because we need to know the period it needs to look up against.
//  Function is also called from Server Side during process
function getIssueSubAcctDetails(_period)
{
	var retJson = {
		'hasissueacct':false,
		'detail':{}
	};
	
	//1. Grab list of Issue Sub Account Logic
	var isaflt = [new nlobjSearchFilter('isinactive', null, 'is','F')],
		isacol = [new nlobjSearchColumn('name'),
		          new nlobjSearchColumn('custrecord_nseps_fgsa_matchtype')],
		isars = nlapiSearchRecord('customrecord_nseps_qloadissuesubacct');
	
	//No Logic? No need to check
	if (!isars)
	{
		return retJson;
	}
	
	//Loop through and build a logic 
	//[["amount","notequalto","0.00"],"AND",["posting","is","T"],"AND",["custbody_source","noneof","1"],"AND",["type","noneof","ExpRept","FxReval"],"AND",["item.type","noneof","Description","Discount","Subtotal"],"AND",["item.parent","noneof","73","-2","-4"],"AND",["item.description","isnot","Total Billable Time"],"AND",["accounttype","noneof","@NONE@"],"AND",["custbody_nseps_senttoeps","is","F"],"AND",["custbody_nseps_datamigrelated","is","F"],"AND",[["formulatext: SUBSTR({account}, 8 ,6)","startswith","529"],"OR",["formulatext: SUBSTR({account}, 8 ,6)","is","529123"]]]	
	//["formulatext: SUBSTR({account}, 8 ,6)","is","529123"]
	var expLogicFilter = [];
	
	
}



//JSON format
/**
 * {
 * 		alljson:{}, //This contains ALL Currency Key mapping
 * 		bujson:{},	//This contains BU Specific currency key mapping
 * 		idjson:{}   //This contains NS ID to ISO Code
 * }
 * 
 * BOTH version has same format.
 * {
 * 	'ISO Currency':'NS Currency ID'
 * }
 */
function getIsoCurrencyToNsMapping()
{
	var retjson = {
		'alljson':{},
		'bujson':{},
		'idjson':{}
	};
	//Grab list of all currencies in the system 
	//This will populate JSON object with
	//Currency Internal ID:Currency ISO Symbol
	var allCurrencyJson = {},
		curflt = [new nlobjSearchFilter('isinactive', null, 'is','F')],
		curcol = [new nlobjSearchColumn('internalid'),
		          new nlobjSearchColumn('symbol')],
		currs = nlapiSearchRecord('currency', null, curflt, curcol);
	
	//Assume there are results
	for (var cr=0; cr < currs.length; cr+=1)
	{
		allCurrencyJson[currs[cr].getValue('internalid')] = currs[cr].getValue('symbol');
		//Populate retjson.alljson
		retjson.alljson[currs[cr].getValue('symbol')] = currs[cr].getValue('internalid'); 
		
		retjson.idjson[currs[cr].getValue('internalid')] = currs[cr].getValue('symbol'); 
	}
	
	//Grab list of Currencies used by Active Business Units. 
	var abuflt = [new nlobjSearchFilter('isinactive', null, 'is','F')],
		abucol = [new nlobjSearchColumn('currency', null, 'group')],
		aburs = nlapiSearchRecord('subsidiary',null,abuflt, abucol);
	
	//Assume there are results
	for (var abu=0; abu < aburs.length; abu+=1)
	{
		retjson.bujson[allCurrencyJson[aburs[abu].getValue('currency', null, 'group')]] = aburs[abu].getValue('currency', null, 'group');
	}
	
	log('debug','retjson',JSON.stringify(retjson));
	
	return retjson;
}

//JSON format
/**
 * EPS-ID:{
	'name':'',
	'nsid':'',
	'inactive':''
   }
 */
function getAllNsClass()
{
	var ccol = [new nlobjSearchColumn('internalid'),
	            new nlobjSearchColumn('name'),
	            new nlobjSearchColumn('isinactive')],
		crs = nlapiSearchRecord('classification', null, null,ccol),
		cjson = {};
	
	//Assume there are results
	for (var c=0; c < crs.length; c+=1)
	{
		//1. Need to extract out EPS Identifier from Name.
		//	 - First 3 characters for Class
		var epsId = strTrim(crs[c].getValue('name').substring(0,3));
		
		//For now, remove any - or / or =
		epsId = strGlobalReplace(epsId.match(/\d+/g).toString(),',','');
		
		cjson[epsId]={
			'name':crs[c].getValue('name'),
			'nsid':crs[c].getValue('internalid'),
			'isinactive':(crs[c].getValue('isinactive')=='T'?'T':'F')
		};
	}
	
	return cjson;
}

//JSON format
/**
 * EPS-ID:{
	'name':'',
	'nsid':'',
	'isinactive':'',
	'epsbu':[]  
   }
 */
function getAllNsDepartments()
{
	var dcol = [new nlobjSearchColumn('internalid'),
	            new nlobjSearchColumn('namenohierarchy'),
	            new nlobjSearchColumn('subsidiary'),
	            new nlobjSearchColumn('isinactive')],
		drs = nlapiSearchRecord('department', null, null,dcol),
		djson = {};
	
	//Assume there are results
	for (var d=0; d < drs.length; d+=1)
	{
		//1. Need to extract out EPS Identifier from Name.
		//	 - First 5 characters for Department
		var epsId = drs[d].getValue('namenohierarchy').substring(0,5),
			nsBuList = drs[d].getValue('subsidiary');
		
		djson[epsId]={
			'name':drs[d].getValue('namenohierarchy'),
			'nsid':drs[d].getValue('internalid'),
			'isinactive':(drs[d].getValue('isinactive')=='T'?'T':'F'),
			'epsbu':[]
		};
		
		//Build out array of EPS BU Identifier this department belongs to in NetSuite
		if (nsBuList)
		{
			//Go and swap out ,LLC to LLC. This will reduce split issue in JavaScript
			nsBuList = strGlobalReplace(nsBuList, ', LLC', ' LLC');
			nsBuList = strGlobalReplace(nsBuList, ', More', ' More');
			
			nsBuList = nsBuList.split(',');
			//First 6 character will be EPS Business Unit Identifier
			for (var nsb=0; nsb < nsBuList.length; nsb+=1)
			{
				djson[epsId].epsbu.push(strTrim(strTrim(nsBuList[nsb]).substring(0,6)));
			}
		}
	}
	
	return djson;
}

//JSON format
/**
 * Search and grabs ALL special accounts specified in 
 * NS/EPS Special Account Ref (customrecord_nseps_specialacct_ref)
 * custom record.
 * Assume there are less than 1000 records in special accounts.
 * {
 *   [accoutn.subaccount]:[accoutn.subaccount]
 * }
 */
function getAllSpecialAccounts()
{
	var spflt = [new nlobjSearchFilter('isinactive', null, 'is','F')],
		spcol = [new nlobjSearchColumn('name')],
		sprs = nlapiSearchRecord('customrecord_nseps_specialacct_ref', null, spflt, spcol),
		spjson = {};
	
	for (var sp=0; sprs && sp < sprs.length; sp+=1)
	{
		spjson[sprs[sp].getValue('name')] = sprs[sp].getValue('name');
	}
	
	return spjson;
}

/**
 * DEPRECATED: This is search against Affiliate custom list (customlist_affiliates)
 * NEW Version as of 4/8/2016
 * 	- Use Custom Segment to look up Affiliate values
 * 		customrecord_cseg_affiliate
 *  - This custom segment list is generated with Affiliate custom segment is created
 * 
 * {
 * 		EPS-ID:NS-ID
 * }
 */
function getAllCustomAffiliates()
{
	var cfflt = [new nlobjSearchFilter('isinactive', null, 'is', 'F')],
		cfcol = [new nlobjSearchColumn('internalid'),
		         new nlobjSearchColumn('name')],
		cflrs = nlapiSearchRecord('customrecord_cseg_affiliate',null,cfflt, cfcol),
		cflJson = {};
	
	for (var ca=0; cflrs && ca < cflrs.length; ca+=1)
	{
		var nsInternalId = cflrs[ca].getValue('internalid'),
			//EPS ID for BU is first 6 character
			epsId = strTrim(cflrs[ca].getValue('name').substring(0,6));
		
		cflJson[epsId] = nsInternalId;
	}
	
	
	return cflJson;
}

//JSON format
/**
 * Builds out a JSON object representing Business Unit in two different perspectives.
 * bynsid will use NetSuite internal ID as the key to grab info.
 * byepsid will use EPS Identifier as the key to grab info.
 */
/**
 * {
 * 	'bynsid':{},
 * 	'byepsid':{}
 * }
 * 
 * NS-BUID:{
 * 		'name':'',
 * 		'epsid':'',
 * 		'inactive':'',
 * 		'elimnsid':'',
 * 		'elimepsid':'',
 * }
 * 
 * EPS-BUID:{
 * 		'name':'',
 * 		'nsid':'',
 * 		'inactive':'',
 * 		'elimnsid':'',
 * 		'elimepsid':'',
 * }
 */
function getAllNsBu()
{
	//1. Grab list of ALL Business Units
	var bucol = [new nlobjSearchColumn('internalid').setSort(),
	             new nlobjSearchColumn('namenohierarchy'),
	             new nlobjSearchColumn('parent'),
	             new nlobjSearchColumn('iselimination'),
	             new nlobjSearchColumn('isinactive')];
	
	var burs = nlapiSearchRecord('subsidiary', null, null, bucol),
		bjson = {
			'bynsid':{},
			'byepsid':{},
			'allelimnsids':[], //Array of ONLY ACTIVE NS BU Internal IDs
			'allelimnsidswi':[] //Array of NS BU Internal IDs including Inactive ones
		};
	
	//assume there are results
	for (var bu=0; bu < burs.length; bu+=1)
	{
		var nsInternalId = burs[bu].getValue('internalid'),
			//EPS ID for BU is first 6 character
			epsId = strTrim(burs[bu].getValue('namenohierarchy').substring(0,6));
		
		bjson.bynsid[nsInternalId] = {
			'name':burs[bu].getValue('namenohierarchy'),
			'epsid':epsId,
			'inactive':(burs[bu].getValue('isinactive')=='T')?'T':'F',
			'elimnsid':'',
			'elimepsid':''
		};
		
		bjson.byepsid[epsId] = {
			'name':burs[bu].getValue('namenohierarchy'),
			'nsid':nsInternalId,
			'inactive':(burs[bu].getValue('isinactive')=='T')?'T':'F',
			'elimnsid':'',
			'elimepsid':'',
		};
		
		//After adding the value, IF the row IS elimination, set it at the parent level
		//IF BU is marked as Elimination, THE GOLDEN RULE is that
		//	it is always for DIRECT parent
		if (burs[bu].getValue('iselimination') == 'T')
		{
			var parentId = burs[bu].getValue('parent');
			if (parentId)
			{
				var parentEpsId = bjson.bynsid[parentId].epsid;
				
				//Update by NS Object
				bjson.bynsid[parentId].elimnsid = nsInternalId;
				bjson.bynsid[parentId].elimepsid = epsId;
				
				//Update by EPS Object
				bjson.byepsid[parentEpsId].elimnsid = nsInternalId;
				bjson.byepsid[parentEpsId].elimepsid = epsId;
			}
			
			//3/23/2016 - Need list of ALL active Elimination accounts
			if (burs[bu].getValue('isinactive') != 'T')
			{
				bjson.allelimnsids.push(nsInternalId);
			}
			
			bjson.allelimnsidswi.push(nsInternalId);
		}
	}
	
	log('debug','All BU Json', JSON.stringify(bjson));
	
	return bjson;
}

/**
 * This function will grab list of ALL Queued up EPS Accounts.
 * This will be used to inactivate any active NetSuite accounts
 * This may seem redundent since the calling schedule script would have already done the search.
 * 		- Difference is that calling scheduled script only returns 1000 at a time
 * 		  and to provide reschedule logic if necessary. 
 * 		  THIS will grab EVERY single queued up records from single search to build the JSON Object 
 * 		  to be used by the calling scheduled script to identify which ns account to inactivate
 * 		  IF performance takes a hit, we may want to re-script this portion.
 * 
 *  JSON FORMAT
 *  {
 *  	[acct.subacct]:[acct.subacct],
 *  	...
 *  }
 * @param _queueid
 */
function getQueuedEpsAccounts(_queueid)
{
	if (!_queueid)
	{
		throw nlapiCreateError(
			'STAGE_TO_ACTUAL_ERROR', 
			'Requires Queue ID', 
			true
		);
	}
	
	var	aqjson = {},
		aqflt = [new nlobjSearchFilter('isinactive', null, 'is' ,'F'),
	   	         new nlobjSearchFilter('custrecord_nseacct_queueref', null, 'anyof', _queueid)],
	   	aqcol = [new nlobjSearchColumn('custrecord_nseacct_acct'),
	   	         new nlobjSearchColumn('custrecord_nseacct_charfield1')],
	//Use create search to go through and grab ALL Accounts from single search
	aqrsObj = nlapiCreateSearch('customrecord_nseps_accounts_staging', aqflt, aqcol);

	var aqrRss = aqrsObj.runSearch();

	//flag for while loop
	var qcrscnt = 1000;
	var qcnextStartIndex = 0;
	var qcnextEndIndex = 1000;
	//Run while loop to grab ALL results. 
	while (qcrscnt==1000) {
	
		//results in THIS set
		var aqrs = aqrRss.getResults(qcnextStartIndex, qcnextEndIndex);
	
		//Loop through each and add acctjson
		for (var q=0; q < aqrs.length; q+=1)
		{
			var acctNum = strTrim(aqrs[q].getValue('custrecord_nseacct_acct'))+
						  '.'+
						  strTrim(aqrs[q].getValue('custrecord_nseacct_charfield1'));
		
			aqjson[acctNum] = acctNum;
		}
	
		//Increment it to next 1000 set
		qcrscnt = aqrs.length;
		qcnextStartIndex = qcnextEndIndex;
		qcnextEndIndex = qcnextEndIndex + 1000;
	}
	
	return aqjson;
}

/**
 * JSON Format
 * var defclient = {
 * 		'bunsid':{
 *			'count':0,
 *			'clientid':clientid
 *		}
 * };
 */
function getAllDefClientByBu()
{
	var defclient = {};
	
	var cliflt = [new nlobjSearchFilter('custentity_default_client', null, 'is','T'),
	              new nlobjSearchFilter('isinactive', null, 'is', 'F')],
		clicol = [new nlobjSearchColumn('internalid'),
		          new nlobjSearchColumn('subsidiary')],
		clirs = nlapiSearchRecord('customer', null, cliflt, clicol);
	
	for (var c=0; clirs && c < clirs.length; c+=1)
	{
		var buId = clirs[c].getValue('subsidiary'),
			cId = clirs[c].getValue('internalid');
		
		if (!defclient[buId])
		{
			defclient[buId] = {
				'count':1,
				'clientid':cId
			};
		}
		else
		{
			//For each BU, there should always be ONLY one.
			//	if multiple BU is found, increment the count
			defclient[buId].count += 1;
		}
	}
	
	log('debug','defclient json',JSON.stringify(defclient));
	
	return defclient;
	
}

/**
 * JSON Format
 * Search ID is passed in due to programmatic search returns more data
 * compared to saved search. Use saved search to be on the safe side
 * var acctjson = {
		'account.subaccount':{
			'nsids':[], //Total number of NS Accounts with same account.subaccount
			'nsobj':{
				'nsid':{	//Each NS ID details.
					'name':'xxx',
					'number':'xxx', //This is FULL Account Number in NS NOT Acct.SubAcct ONLY
					'accounttype':'xx',
					'inactive':'xx'
				},
				...
			}
		},
		...
	};
 */
function getAllNsAccounts(_searchid)
{
	var acctjson = {};
	
	//1. Grab list of ALL Accounts in NetSuite that has [6 Digits Account].[6 Digits Sub Account] format
	//	 Use REGEX to grab the pattern from number field
	/**
	var acctSubAcctFormula = new nlobjSearchFilter('formulanumeric', null,'is','1');
	acctSubAcctFormula.setFormula("REGEXP_INSTR({number},'^\d{6}.\d{6}')");
	
	var	aflt = [acctSubAcctFormula],
		acol = [new nlobjSearchColumn('internalid').setSort(true),
		        new nlobjSearchColumn('name'),
		        new nlobjSearchColumn('number'),
		        new nlobjSearchColumn('type'),
		        new nlobjSearchColumn('isinactive'),
		        acctSubAcctOnly],
		//Use create search to go through and grab ALL Accounts from single search
		arsObj = nlapiCreateSearch('account', aflt, acol);
	*/
	//Use REGEX to ONLY PUll [6 Digits Account].[6 Digits Sub Account] pattern value
	var acctSubAcctOnly = new nlobjSearchColumn('formulatext');
	acctSubAcctOnly.setFormula("REGEXP_SUBSTR({number},'^\d{6}.\d{6}')");
	
	var arsObj = nlapiLoadSearch(null,_searchid);
	
	var arRss = arsObj.runSearch();
	
	//flag for while loop
    var crscnt = 1000;
    var cnextStartIndex = 0;
    var cnextEndIndex = 1000;
    //Run while loop to grab ALL results. 
    while (crscnt==1000) {
    	
    	//results in THIS set
    	var ars = arRss.getResults(cnextStartIndex, cnextEndIndex);
    	
    	//Loop through each and add acctjson
    	for (var a=0; a < ars.length; a+=1)
    	{
    		var acctNumOnly = ars[a].getValue(acctSubAcctOnly),
    			nsAcctId = ars[a].getValue('internalid'),
    			nsAcctNumber = ars[a].getValue('number'), //Account number contains [6D].[6D] plus any other characters after
    			nsAcctNameOnly = ars[a].getValue('name'),  
    			nsAcctType = ars[a].getValue('type'),
    			nsAcctTypeText = ars[a].getText('type'),
    			nsAcctInactive = ars[a].getValue('isinactive');
    		
    		//Account Name only is text without nsAcctNumber value. Swap out nsAcctNumber from name value
    		nsAcctNameOnly = strTrim(nsAcctNameOnly.replace(nsAcctNumber, ''));
    		
    		//populate the acctjson
    		//check to see if this account combo already exists if not, initialize it
    		if (!acctjson[acctNumOnly])
    		{
    			acctjson[acctNumOnly] = {
    				'nsids':[],
    				'nsobj':{}
    			};
    		}
    		
    		//Add it in to nsids array to keep track of ALL NetSuite IDs associated with THIS Account.Subaccount
    		acctjson[acctNumOnly].nsids.push(nsAcctId);
    		
    		acctjson[acctNumOnly].nsobj[nsAcctId] = {
    			'name':nsAcctNameOnly,
    			'number':nsAcctNumber, //This is FULL Account Number in NS NOT Acct.SubAcct ONLY
    			'accounttype':nsAcctType,
    			'accounttypeid':getAcctTypeId(nsAcctTypeText),
    			'inactive':(nsAcctInactive=='T'?'T':'F')
    		};
    	}
    	
    	//Increment it to next 1000 set
    	crscnt = ars.length;
    	cnextStartIndex = cnextEndIndex;
    	cnextEndIndex = cnextEndIndex + 1000;
    }
    
    log('debug','acctjson',JSON.stringify(acctjson));
    
    return acctjson;
}

/**
 * NS returns different set of ID values in Account Search compared to
 * actual ID value when referenced as Account Type drop down.
 * This function takes Account Name value and gets Numbered Internal ID value
 * 
 * Saved Search = Returns Abbr Value as ID
 * Drop Down Reference = Returns Numeric ID value
 */
function getAcctTypeId(_accttext)
{
	var acctJson = {
		"Accounts Payable":"6",
		"Accounts Receivable":"2",
		"Bank":"1",
		"Cost of Goods Sold":"12",
		"Credit Card":"7",
		"Deferred Expense":"18",
		"Deferred Revenue":"17",
		"Equity":"10",
		"Expense":"13",
		"Fixed Asset":"4",
		"Income":"11",
		"Long Term Liability":"9",
		"Non Posting":"16",
		"Other Asset":"5",
		"Other Current Asset":"3",
		"Other Current Liability":"8",
		"Other Expense":"15",
		"Other Income":"14",
		"Statistical":"20",
		"Unbilled Receivable":"19"
	};
	
	if (acctJson[_accttext])
	{
		return acctJson[_accttext];
	}
	
	return '';
}

/**
 * Based on passed in _epsType, identify matching NetSuite Account Type
 * If NO EPS Account Type identifier is passed in or no Match is found,
 * it will throw an ERROR which will be caught by main function
 * 
 * @param _epsType
 * @param _epsLevelJson
 * Initial pass we are only looking at L4_ID and L5_ID
 * However we are capturing L2_ID and L3_ID as well for potential future usage
 * {
 * 	L2_ID:'',
 *  L3_ID:'',
 *  L4_ID:'',
 *  L5_ID:''
 * }
 * @return jsonobj
 * {"value":"xxx","text":"xxx"}
 * 
 * JSON Object returned is hard coded NetSuite generated JSON object. 
 * This value may change or added to in the future by NetSuite.
 * 
 */
function getNsAcctType(_epsType, _epsLevelJson)
{
	if (!_epsType)
	{
		throw nlapiCreateError(
			'STAGE_TO_ACTUAL_ERROR', 
			'Missing EPS Account Type to match', 
			true
		);
	}
	
	//Upper case all inputs
	var etype = _epsType.toUpperCase();
	
	//-------- Begin logic check. -----------------
	//EPS account type N or Q = Equity 
	if (etype == 'N' || etype == 'Q')
	{
		return {"value":"Equity","text":"Equity"};
	}
	
	//EPS account type E or C = Expense 
	if (etype == 'E' || etype == 'C')
	{
		return {"value":"Expense","text":"Expense"};
	}
	
	//EPS account type R = Income 
	if (etype == 'R')
	{
		return {"value":"Income","text":"Income"};
	}
	
	//EPS account type X = Income 
	if (etype == 'X')
	{
		return {"value":"OthExpense","text":"Other Expense"};
	}
	
	//EPS account type V = Income 
	if (etype == 'V')
	{
		return {"value":"OthIncome","text":"Other Income"};
	}
	
	//EPS account type A or L- Go into Level value check 
	if (etype == 'A' || etype == 'L')
	{
		//Validate to make sure _epsLevelJson object is passed in.
		if (!_epsLevelJson)
		{
			throw nlapiCreateError(
				'STAGE_TO_ACTUAL_ERROR', 
				'Missing EPS Account Level Information for '+etype, 
				true
			);
		}
		
		//Logic tree for EPS Account Type of A
		if (etype == 'A')
		{
			//If L4_ID is PROPERTY_PLANT_EQUIP = Fixed Asset
			if (_epsLevelJson.L4_ID.toUpperCase() == 'PROPERTY_PLANT_EQUIP')
			{
				return {"value":"FixedAsset","text":"Fixed Asset"};
			}
			
			//if L4_ID is CURRENT_ASSET, run logic against L5_ID
			if (_epsLevelJson.L4_ID.toUpperCase() == 'CURRENT_ASSETS')
			{
				//L5_ID is ACCOUNTS_REC_NET = Accounts Receivable
				if (_epsLevelJson.L5_ID.toUpperCase() == 'ACCOUNTS_REC_NET')
				{
					return {"value":"AcctRec","text":"Accounts Receivable"};
				}
				
				//L5_ID is CASH_AND_CASH_EQUIV or RESTRICTED_CASH = Bank
				if (_epsLevelJson.L5_ID.toUpperCase() == 'CASH_AND_CASH_EQUIV' || _epsLevelJson.L5_ID.toUpperCase() == 'RESTRICTED_CASH')
				{
					return {"value":"Bank","text":"Bank"};
				}
				
				//All other cases within Child logic tree, treat it as Other Current Asset
				return {"value":"OthCurrAsset","text":"Other Current Asset"};
			}
			
			//All other cases within parent logic tree, treat it as Other Asset
			return {"value":"OthAsset","text":"Other Asset"};
		}
		
		//Logic tree for EPS Account Type of L
		if (etype == 'L')
		{
			//if L4_ID is CURRENT_LIABILITIES, run logic against L5_ID
			if (_epsLevelJson.L4_ID.toUpperCase() == 'CURRENT_LIABILITIES')
			{
				//L5_ID is ACCOUNTS_PAYABLE = Accounts Payable
				if (_epsLevelJson.L5_ID.toUpperCase() == 'ACCOUNTS_PAYABLE')
				{
					return {"value":"AcctPay","text":"Accounts Payable"};
				}
				
				//All other cases within Child logic tree, treat it as Other Current Liability
				return {"value":"OthCurrLiab","text":"Other Current Liability"};
			}
			
			//All other cases within parent logic tree, treat it as Other Asset
			return {"value":"LongTermLiab","text":"Long Term Liability"};
		}
	}
	
	//IF it comes to here, There is no match, THROW ERROR
	throw nlapiCreateError(
		'STAGE_TO_ACTUAL_ERROR', 
		'Unable to match any NetSuite Account type using EPS account type of '+etype, 
		true
	);
}
