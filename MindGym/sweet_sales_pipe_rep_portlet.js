/****************************************************************************


  Sales pipline portlet


*****************************************************************************/

/**
 * Main function
 *
 * @param {nlobjPortlet} portlet
 * @param {int} column (1 = left column, 2 = middle column, 3 = right column)
 */


//Labels gets passed in as is. Script will change the label to "Goal" but keep internally passed in label to function.
var budgetSubLabel = 'Budget (Subsidiary)';
var budgetRepLabel = 'Budget (Rep)';

var totalQuoteSalesOrderLabel = 'Total';
var performVsGoalLabel = 'vs Goal'; //Total - Budget
var percentCompleteLabel = 'Total % Goal'; //( (Total / Budget) * 100 );

//Ticket 10739 - Additional % Needed for Sales Order % Goal 
var percentSoCompletedLabel = '% Goal'; //(Sales Order / Budget) * 100

/**
 * JSON value to track each months' value
 */
var trxjson = {
	'Quote':{
		'total':0,
		'months':{}
	},
	'Sales Order':{
		'total':0,
		'months':{}
	},
	'Sales Order (Last Year)':{
		'total':0,
		'months':{}
	},
	'Quote (Last Year)':{
		'total':0,
		'months':{}
	},
	'Forecast':{
		'total':0,
		'months':{}
	}
};

trxjson[budgetSubLabel]={
	'total':0,
	'months':{}
};

trxjson[budgetRepLabel]={
		'total':0,
		'months':{}
};

/**
 * 11/18/2014 - oppjson will run the saved search for opp and grab the values based on current month on.
 * 
 */
var oppjson= {};

var financial_year = nlapiGetContext().getSetting('SCRIPT', 'custscript_194_financial_year');
//Always grab current year and subtract 1 to get rolling values
//var financial_year = new Date().getFullYear();

//MUST make sure current Date is before April 1st CURRENT Year for it to use it. OTHERWISE, it must use previous Year.
if (!financial_year) {
	if (new Date().getTime() < new Date('4/1/'+new Date().getFullYear()).getTime()) {
		financial_year = (new Date().getFullYear()) - 1;
	} else {
		financial_year = new Date().getFullYear();
	}
}


var subsidiary = nlapiGetContext().getSetting('SCRIPT', 'custscript_194_subsidiary');
var showMineOnly = nlapiGetContext().getSetting('SCRIPT', 'custscript_194_showmineonly');
var showMyTeamOnly = nlapiGetContext().getSetting('SCRIPT', 'custscript_194_showteamonly');
var companyWideOnly = nlapiGetContext().getSetting('SCRIPT', 'custscript_194_compwideonly');

var quoteSavedSearchId = nlapiGetContext().getSetting('SCRIPT', 'custscript_194_quotessid');
var quoteAmountFieldId = nlapiGetContext().getSetting('SCRIPT', 'custscript_194_quoteamtfldid');
var quoteDateFieldId = nlapiGetContext().getSetting('SCRIPT', 'custscript_194_quotedatefldid');

var salesOrderSavedSearchId = nlapiGetContext().getSetting('SCRIPT', 'custscript_194_salesorderssid');
var salesOrderAmountFieldId = nlapiGetContext().getSetting('SCRIPT', 'custscript_194_salesorderamtfldid');
var salesOrderDateFieldId = nlapiGetContext().getSetting('SCRIPT', 'custscript_194_salesorderdatefldid');

/**
 * 11/18/2014 - Major change in Saved Search referenced by Opportunity (Now Forecast).
 * David requested that value of Opportunity be sourced from REVAMPED version of saved search [OPP SCRIPT194 v2]-CLIENT_SFA_Opportunity forecast summary instead of ([OPP SCRIPT194]-KPI_Rep_Opportunity)
 * With this new requirement, Opp Field and Date does NOT Matter.
 * From April [Fiscal] to March [Fiscal+1], if month is already passed, it will mark as 0, 
 * - From current month to end, it will grab value from saved search. 
 * - IT IS Important to NOT modify number of columns or order of columns.
 */
var oppSavedSearchId = nlapiGetContext().getSetting('SCRIPT', 'custscript_194_oppssid');
var oppAmountFieldId = nlapiGetContext().getSetting('SCRIPT', 'custscript_194_oppamtfldid');
var oppDateFieldId = nlapiGetContext().getSetting('SCRIPT', 'custscript_194_oppdatefldid');

var sgrSavedSearchId = nlapiGetContext().getSetting('SCRIPT', 'custscript_194_sgrssid');
var sgrAmountFieldId = nlapiGetContext().getSetting('SCRIPT', 'custscript_194_sgramtfldid');
var sgrDateFieldId = nlapiGetContext().getSetting('SCRIPT', 'custscript_194_sgrdatefldid');

var sgcSavedSearchId = nlapiGetContext().getSetting('SCRIPT', 'custscript_194_sgcssid');
var sgcAmountFieldId = nlapiGetContext().getSetting('SCRIPT', 'custscript_194_sgcamtfldid');
var sgcDateFieldId = nlapiGetContext().getSetting('SCRIPT', 'custscript_194_sgcdatefldid');

//8/19/2015 Tix: 4704 - Add in feature to convert ANY Portlet into Quarterly View
var isQtrView = nlapiGetContext().getSetting('SCRIPT', 'custscript_194_isqtrview');


//4/25/2015
var paramVersionValue = nlapiGetContext().getSetting('SCRIPT', 'custscript_194_budgetversion');
if (!paramVersionValue) {
	paramVersionValue = 0;
}

nlapiLogExecution('debug','financial year',financial_year);

//1104 = US/CT ADM
var usRoles = [1104];

var salesRepFilter = null;

var exchangeRate = 1;

function sweet_main(portlet, column) {
  
  nlapiLogExecution('DEBUG', 'Start', 'portlet starts');
  	
  //Ticket 2774 - Request to convert from GBP to USD ONLY if logged in user is using following roles
	//apply exchange rate to Sales Order, Quote and Opportunity Monthly Values

	if (usRoles.indexOf(nlapiGetContext().getRole()) > -1) {
		exchangeRate = nlapiExchangeRate('GBP', 'USD');
	}
	
  var portletMode = 'By Company';
  //If by company, grab subsidiary value from script
  if (companyWideOnly) {
	  //show All data from provided comma separated list of subsidiaries
	  portletMode = 'By Company Wide';
  } else if (showMineOnly=='T' && showMyTeamOnly=='T') {
	  //show mine and my team
	  portletMode = 'Mine and My Team';
	  salesRepFilter = ['@CURRENT@','@HIERARCHY@'];
	  //Pui Yuen TEST
	  //salesRepFilter = ['17054'];
  } else if (showMineOnly=='T' && showMyTeamOnly!='T') {
	  portletMode = 'Mine ONLY';
	  salesRepFilter = ['@CURRENT@'];
	  
  } else if (showMineOnly!='T' && showMyTeamOnly=='T') {
	  portletMode = 'My Team ONLY';
	  salesRepFilter = ['@HIERARCHY@'];
	
  }
  
  if (showMineOnly=='T' || showMyTeamOnly=='T') {
	//When running for Mine or My Team, grab logged in users' subsidiary
	  subsidiary = nlapiGetContext().getSubsidiary();
	  //Pui Yeun Test
	  //subsidiary = '2';
  }
  
  //look up subsidiary name
  var subsidiaryName = nlapiLookupField('subsidiary', subsidiary, 'name');
  if (companyWideOnly) {
	  subsidiaryName = 'Subsidiaries ('+companyWideOnly+')';
  }
  
  //------------ Look up Forecast here -------------------------------
  //OPPORTUNITY - needs to be update Joe, I just created
  //portlet.addRow(getRowData('opportunity', 'customsearch_kpi_rep_opportunity', '1774', 'custrecord_budget_amount', 'Budget', 'custrecord_budget_month', financial_year, 'custrecord_budget_subsidiary', subsidiary, '1'));
  //11/18/2014 - Run the Search and Build JSON Object of Opportunity (oppjson)
  var opfilters = new Array();
  //subsidiary
  if (companyWideOnly) {
	  opfilters.push(new nlobjSearchFilter('subsidiary', null, 'anyof', companyWideOnly.split(',')));
  } else {
	  opfilters.push(new nlobjSearchFilter('subsidiary', null, 'anyof', subsidiary));
  }
  
  if (salesRepFilter && salesRepFilter.length > 0) {
	  opfilters.push(new nlobjSearchFilter('salesrep', null, 'anyof', salesRepFilter));
  }
  /**
   * Column Index Def.
   * 0=Current Month Value
   * 1=Month+1
   * ...
   * 12=Month+1
   */
  var oprs = nlapiSearchRecord(null, oppSavedSearchId, opfilters);
  //oprs SHOULD ALWAYS return result
  //Start of financial year is 1st of April
  var oprscols = oprs[0].getAllColumns();
  var currDate = new Date();
  //start is always april [fiscal year]
  var startDate = nlapiAddMonths(nlapiStringToDate('1/1/' + financial_year), 3);
  var endDate = null;
  var i = 0; n = 12;
  var colindexToUse = 0;
  var oppTotalValue = 0.0;
nlapiLogExecution('debug','running opp','opp running');
  for (i; i < n; i++) {
    
	// Calculate the end date for each KPI Month
    endDate = nlapiAddMonths(startDate, 1);
    endDate = nlapiAddDays(endDate, -1);
    
    var oppjsonKeyValue = 'amount_'+(i+1);
    var oppjsonValue = 0;
    
    if (startDate > currDate || (currDate >= startDate && currDate <= endDate)) {
    	//1. Check to see if Loop is in Current month or future
    	oppjsonValue = oprs[0].getValue(oprscols[colindexToUse]);
    	colindexToUse++;
    }
    
    oppjsonValue = parseFloat(oppjsonValue) * exchangeRate;
    
    oppTotalValue = parseFloat(oppTotalValue) + parseFloat(oppjsonValue);
    
    oppjson[oppjsonKeyValue] = {
    	"MonthValue":nlapiDateToString(startDate),
    	"AmountValue":oppjsonValue
    };
    
    // Move the start date to the next month
    startDate = nlapiAddMonths(startDate, 1); // Add one month
  }
  
  oppjson['total'] = oppTotalValue;
  
  nlapiLogExecution('debug','Opportunity (Now Forecast) JSON', JSON.stringify(oppjson));
  //------------- End forcast lookup ------------------------
  
  var title = 'Sales Pipeline Consolidated ' + financial_year+' for '+subsidiaryName;
  
  portlet.setTitle(title+' ('+portletMode+')');
  
  //Tix 4704
  if (isQtrView == 'T')
  {
	  portlet.setTitle(title+' ('+portletMode+') Quarterly View');
	  
	// Create the columns
	  portlet.addColumn('label', 'text', 'Type', 'LEFT');
	  //portlet.addColumn('salesrepname', 'text', 'Sales Rep','LEFT');
	  portlet.addColumn('amount_3', 'text', 'Quarter 1 '+financial_year, 'RIGHT');
	  portlet.addColumn('amount_6', 'text', 'Quarter 2 '+financial_year, 'RIGHT');
	  portlet.addColumn('amount_9', 'text', 'Quarter 3 '+financial_year, 'RIGHT');
	  portlet.addColumn('amount_12', 'text', 'Quarter 4 '+(parseInt(financial_year)+1), 'RIGHT');
  }
  else
  {
	// Create the columns
	  portlet.addColumn('label', 'text', 'Type', 'LEFT');
	  //portlet.addColumn('salesrepname', 'text', 'Sales Rep','LEFT');
	  portlet.addColumn('amount_1', 'text', 'Apr '+financial_year, 'RIGHT');
	  portlet.addColumn('amount_2', 'text', 'May '+financial_year, 'RIGHT');
	  portlet.addColumn('amount_3', 'text', 'Jun '+financial_year, 'RIGHT');
	  portlet.addColumn('amount_4', 'text', 'Jul '+financial_year, 'RIGHT');
	  portlet.addColumn('amount_5', 'text', 'Aug '+financial_year, 'RIGHT');
	  portlet.addColumn('amount_6', 'text', 'Sep '+financial_year, 'RIGHT');
	  portlet.addColumn('amount_7', 'text', 'Oct '+financial_year, 'RIGHT');
	  portlet.addColumn('amount_8', 'text', 'Nov '+financial_year, 'RIGHT');
	  portlet.addColumn('amount_9', 'text', 'Dec '+financial_year, 'RIGHT');
	  portlet.addColumn('amount_10', 'text', 'Jan '+(parseInt(financial_year)+1), 'RIGHT');
	  portlet.addColumn('amount_11', 'text', 'Feb '+(parseInt(financial_year)+1), 'RIGHT');
	  portlet.addColumn('amount_12', 'text', 'Mar '+(parseInt(financial_year)+1), 'RIGHT');
  }
  
  
  portlet.addColumn('total', 'text', 'This Year', 'RIGHT');
 
  //SALES ORDERS
  //customsearch_kpi_rep_salesordersbyrevr_2  
  portlet.addRow(getRowData(salesOrderSavedSearchId, salesOrderAmountFieldId, 'Sales Order', salesOrderDateFieldId, financial_year, 'subsidiary', subsidiary, paramVersionValue, '0'));


    //BUDGET (Goal)
  //For company or by employee
  if (showMineOnly!='T' && showMyTeamOnly!='T') {
	  portlet.addRow(getRowData(sgcSavedSearchId, sgcAmountFieldId, budgetSubLabel, sgcDateFieldId, financial_year, 'custrecord_budget_subsidiary', subsidiary, paramVersionValue, '1'));
  } else {
	  portlet.addRow(getRowData(sgrSavedSearchId, sgrAmountFieldId, budgetRepLabel, sgrDateFieldId, financial_year, 'custrecord_budget_subsidiary', subsidiary, paramVersionValue, '1'));
  }
  //portlet.addRow(getRowData('customrecord_budget', 'customsearch_kpi_budget', '443', 'custrecord_budget_amount', 'Budget', 'custrecord_budget_month', financial_year, 'custrecord_budget_subsidiary', subsidiary, '1'));
  
  //% GOAL COMPLETION- Sales Order/Budget * 100  
  portlet.addRow(getRowData(null, null, percentSoCompletedLabel, null, financial_year, null, null, paramVersionValue, '0'));
  
  //add in Sales Order Last year Value
  portlet.addRow(getRowData(salesOrderSavedSearchId, salesOrderAmountFieldId, 'Sales Order (Last Year)', salesOrderDateFieldId, financial_year, 'subsidiary', subsidiary, paramVersionValue, '0'));
  
  //% YoY growth- Current SO / Last Year SO * 100  
  portlet.addRow(getRowData(null, null, 'YoY growth', null, financial_year, null, null, paramVersionValue, '0'));

  //---------- Forecast --------------------
  portlet.addRow(getRowData(null, null, 'Forecast', null, financial_year, null, null, paramVersionValue, '0'));
  
  // QUOTES
  //portlet.addRow(YoY growth('salesorder', 'customsearch_kpi_rep_quotesbyrevrec', '1767', 'grossamount', 'Sales orders', 'custcol_bo_date', financial_year, 'subsidiary', subsidiary, '0'));
  //customsearch_kpi_rep_quotesbyrevrec_2  
  //1945
  portlet.addRow(getRowData(quoteSavedSearchId, quoteAmountFieldId, 'Quote', quoteDateFieldId, financial_year, 'subsidiary', subsidiary, paramVersionValue, '0'));

  //TOTAL
  //portlet.addRow(getRowData('transaction', 'customsearch_kpi_rep_total_pipeline', '1772', 'formulacurrency', 'Total', 'custcol_bo_date', financial_year, 'subsidiary', subsidiary, '0'));
  //customsearch_kpi_rep_total_pipeline_2  
  //1946
  portlet.addRow(getRowData(null, null, totalQuoteSalesOrderLabel, null, financial_year, null, null, '0'));
  
  //PERFORMANCE VS GOAL (Was REVISED BUDGET) - 
  //Total - Budget
  //portlet.addRow(getRowData('customrecord_budget', 'customsearch_kpi_budget', '443', 'custrecord_budget_amount', 'Revised Budget', 'custrecord_budget_month', financial_year, 'custrecord_budget_subsidiary', subsidiary, '2'));
  portlet.addRow(getRowData(null, null, performVsGoalLabel, null, financial_year, null, null, paramVersionValue, '0'));
  
  
  //% GOAL COMPLETION- Total/Budget * 100  
  portlet.addRow(getRowData(null, null, percentCompleteLabel, null, financial_year, null, null, paramVersionValue, '0'));

  //Total YoY growth- Current Total (SO + QT + FC) / Last Year SO * 100  
  portlet.addRow(getRowData(null, null, 'Total YoY growth', null, financial_year, null, null, paramVersionValue, '0'));
  
  nlapiLogExecution('DEBUG', 'End', 'portlet ends');
  //log('debug','trxjson',JSON.stringify(trxjson));
  
  //nlapiSendEmail(-5, 'joe.son@audaxium.com', 'Portlent trxjson', JSON.stringify(trxjson), null, null, null, null, true, null, null);
  
}

/**
 * Get saved search row
 *
 * @param searchIdNum
 * @param fieldName
 * @param rowLabel
 * @param dateField
 * @param year
 * @param subsidiaryField
 * @param subsidiary
 * @param version
 *
 * @return {Array}
 */
//function getRowData(searchType, searchId, searchIdNum, fieldName, rowLabel, dateField, year, subsidiaryField, subsidiary, version) {

function getRowData(searchIdNum, fieldName, rowLabel, dateField, year, subsidiaryField, subsidiary, version, toggle) {  
	
	
  var row = {};
  row['label'] = rowLabel;
  //change to common label if budget rep or corp
  if (rowLabel == budgetRepLabel || rowLabel == budgetSubLabel) {
	  row['label'] = 'Goal';
  }
  
  //log('debug',rowLabel,searchIdNum);
  
  // Start of financial year is 1st of April
  var startDate = nlapiAddMonths(nlapiStringToDate('1/1/' + year), 3);
  var endDate = null;
  
  //11/17/2014 - If label is Sales Order (Last Year) run it for same time last year
  if (rowLabel == 'Sales Order (Last Year)') {
	  startDate = nlapiAddMonths(startDate, -12);
	  //nlapiLogExecution('debug','Label is YOY last year so','start date '+startDate);
	  
  }
  
  // Get the data for each column
  
  var salesRepFldId = 'salesrep';
  if (toggle != '0') {
	  salesRepFldId = 'custrecord_budget_salesrep';
  }
  
  var keyPrefix = 'amount_';
  var i = 0; n = 12;
  
  //Quarterly View Index
  //0, 1, 2 = First Quarter
  //3, 4, 5 = Second Quarter
  //6, 7, 8 = Third Quarter
  //9, 10, 11 = Forth Quarter
  var qtrViewDateJson = {
	'Q1':{
		'start':'',
		'end':'',
		'total':0
	},
	'Q2':{
		'start':'',
		'end':'',
		'total':0
	},
	'Q3':{
		'start':'',
		'end':'',
		'total':0
	},
	'Q4':{
		'start':'',
		'end':'',
		'total':0
	}
  }; 
  
  for (i; i < n; i++) {
    
	// Calculate the end date for each KPI Month
    endDate = nlapiAddMonths(startDate, 1);
    endDate = nlapiAddDays(endDate, -1);
    
    nlapiLogExecution('debug','index '+i, startDate+' // '+endDate);
    
    //Populate Quarterly View Date JSON
    //--------------- Mod June 21 2016:  Quarterly View Date Population --------------------
    if (i == 0)
    {
    	//Add in start of first quarter date
    	qtrViewDateJson.Q1.start = nlapiDateToString(startDate);
    }
    
    if (i == 2)
    {
    	//Add in start of first quarter date
    	qtrViewDateJson.Q1.end = nlapiDateToString(endDate);
    }
    
    if (i == 3)
    {
    	//Add in start of first quarter date
    	qtrViewDateJson.Q2.start = nlapiDateToString(startDate);
    }
    
    if (i == 5)
    {
    	//Add in start of first quarter date
    	qtrViewDateJson.Q2.end = nlapiDateToString(endDate);
    }
    
    if (i == 6)
    {
    	//Add in start of first quarter date
    	qtrViewDateJson.Q3.start = nlapiDateToString(startDate);
    }
    
    if (i == 8)
    {
    	//Add in start of first quarter date
    	qtrViewDateJson.Q3.end = nlapiDateToString(endDate);
    }
    
    if (i == 9)
    {
    	//Add in start of first quarter date
    	qtrViewDateJson.Q4.start = nlapiDateToString(startDate);
    }
    
    if (i == 11)
    {
    	//Add in start of first quarter date
    	qtrViewDateJson.Q4.end = nlapiDateToString(endDate);
    }
    //------------------ END qtrViewDateJson population --------------------------
    
    if (searchIdNum && fieldName) {
    	//When Search ID and field is provided, it's to run search for each month for the trx type
	    // Create the filter
	    var filters = new Array();
	    filters.push(new nlobjSearchFilter(dateField, null, 'within', nlapiDateToString(startDate), nlapiDateToString(endDate)));
	    //filters.push(new nlobjSearchFilter(subsidiaryField, null, 'anyof', 2,3));
	    //subsidiary
	    if (companyWideOnly) {
	    	filters.push(new nlobjSearchFilter(subsidiaryField, null, 'anyof', companyWideOnly.split(',')));
	    } else {
	    	filters.push(new nlobjSearchFilter(subsidiaryField, null, 'anyof', subsidiary));
	    }
	    
	    
	    if (salesRepFilter && salesRepFilter.length > 0) {
	    	filters.push(new nlobjSearchFilter(salesRepFldId, null, 'anyof', salesRepFilter));
	    }
	    
	    //nlapiLogExecution('debug',rowLabel+' date range search',startDate+' // '+endDate);
	    
	    //paramVersionValue
	    //Adding version 
	    if (version != 0) {
	    	filters.push(new nlobjSearchFilter('custrecord_budget_version', null, 'is', version));
	    }
	    
	    // Run the search query
	    var results = nlapiSearchRecord(null, searchIdNum, filters);
	    
	    // Add the results to our row
	    var value = 0;
	    if (results) {
	    	value = results[0].getValue(fieldName, null, 'sum');
	    	if (!value) {
	    		value = 0;
	    	}
	    	//log('debug','label // value', rowLabel+' // '+value);
	    }
	    
	    //ticket 2774 - apply exhangeRate in case US Role logged in to view
	    
	    //ticket 2909. IF US Role is used AND line being processed is Goal, use custom exchange rate instead
	    if ((rowLabel == budgetRepLabel || rowLabel == budgetSubLabel) && usRoles.indexOf(nlapiGetContext().getRole()) > -1) {
	    	//nlapiLogExecution('audit','US Custom Exchnage being used due to Goal Label: '+rowLabel,results[0].getValue('custrecord_budget_exchangerategbptousd', null, 'max'));
	    	exchangeRate = parseFloat(results[0].getValue('custrecord_budget_exchangerategbptousd', null, 'max'));
	    }
	    
	    value = parseFloat(value) * exchangeRate;
	    
	    //store each amount in respective slots in trxjson
	    trxjson[rowLabel]['months'][keyPrefix + (i + 1)] = parseInt(Math.round(value).toFixed(0));
	    trxjson[rowLabel]['total'] = parseInt(trxjson[rowLabel]['total']) + parseInt(Math.round(value).toFixed(0));
	    
	    //Qarterly View or Full View?
	    if (isQtrView == 'T')
	    {
	    	//If index is between 0 and 2, process as first quarter
	    	if (i >= 0 || i==2)
	    	{
	    		//if NOT end of qarter, keep adding
    			qtrViewDateJson.Q1.total += parseInt(Math.round(value).toFixed(0));
    			if (i ==2)
	    		{
    				//value = results[0].getValue(fieldName, null, 'sum');
    			    // Round and format the value
    			    value = formatNumber(Math.round(qtrViewDateJson.Q1.total).toFixed(0));
    			    
    			    
    			    // Make the value into a link if NOT budget row
    			    if (toggle == 0) {
    			      value = buildLink(searchIdNum, nlapiStringToDate(qtrViewDateJson.Q1.start), nlapiStringToDate(qtrViewDateJson.Q1.end), subsidiary, value);
    			    }
    			    
    			    // Add value to row
    			    //	ONLY add to it at specific index. 
    			    row[keyPrefix + (i + 1)] = value;
	    		}
	    		
	    	}
	    	
	    	//If index is between 3 and 5, process as second quarter
	    	if (i>=3 || i==5)
	    	{
	    		//if NOT end of qarter, keep adding
    			qtrViewDateJson.Q2.total += parseInt(Math.round(value).toFixed(0));
    			if (i ==5)
	    		{
    				//value = results[0].getValue(fieldName, null, 'sum');
    			    // Round and format the value
    			    value = formatNumber(Math.round(qtrViewDateJson.Q2.total).toFixed(0));
    			    
    			    
    			    // Make the value into a link if NOT budget row
    			    if (toggle == 0) {
    			      value = buildLink(searchIdNum, nlapiStringToDate(qtrViewDateJson.Q2.start), nlapiStringToDate(qtrViewDateJson.Q2.end), subsidiary, value);
    			    }
    			    
    			    // Add value to row
    			    //	ONLY add to it at specific index. 
    			    row[keyPrefix + (i + 1)] = value;
	    		}
	    		
	    	}
	    	
	    	//If index is between 6 and 8, process as third quarter
	    	if (i>=6 || i==8)
	    	{
	    		//if NOT end of qarter, keep adding
    			qtrViewDateJson.Q3.total += parseInt(Math.round(value).toFixed(0));
    			if (i ==8)
	    		{
    				//value = results[0].getValue(fieldName, null, 'sum');
    			    // Round and format the value
    			    value = formatNumber(Math.round(qtrViewDateJson.Q3.total).toFixed(0));
    			    
    			    
    			    // Make the value into a link if NOT budget row
    			    if (toggle == 0) {
    			      value = buildLink(searchIdNum, nlapiStringToDate(qtrViewDateJson.Q3.start), nlapiStringToDate(qtrViewDateJson.Q3.end), subsidiary, value);
    			    }
    			    
    			    // Add value to row
    			    //	ONLY add to it at specific index. 
    			    row[keyPrefix + (i + 1)] = value;
	    		}
	    		
	    	}
	    	
	    	//If index is between 9 and 11, process as forth quarter
	    	if (i>=9 || i==11)
	    	{
	    		//if NOT end of qarter, keep adding
    			qtrViewDateJson.Q4.total += parseInt(Math.round(value).toFixed(0));
    			if (i ==11)
	    		{
    				//value = results[0].getValue(fieldName, null, 'sum');
    			    // Round and format the value
    			    value = formatNumber(Math.round(qtrViewDateJson.Q4.total).toFixed(0));
    			    
    			    
    			    // Make the value into a link if NOT budget row
    			    if (toggle == 0) {
    			      value = buildLink(searchIdNum, nlapiStringToDate(qtrViewDateJson.Q4.start), nlapiStringToDate(qtrViewDateJson.Q4.end), subsidiary, value);
    			    }
    			    
    			    // Add value to row
    			    //	ONLY add to it at specific index. 
    			    row[keyPrefix + (i + 1)] = value;
	    		}
	    		
	    	}
	    	
	    }
	    //NOT a Qtr View, Process as is
	    else
	    {
	    	//value = results[0].getValue(fieldName, null, 'sum');
		    // Round and format the value
		    value = formatNumber(Math.round(value).toFixed(0));
		    
		    
		    // Make the value into a link if NOT budget row
		    if (toggle == 0) {
		      value = buildLink(searchIdNum, startDate, endDate, subsidiary, value);
		    }
		    
		    // Add value to row
		    row[keyPrefix + (i + 1)] = value;
	    }
	    
	} else {
		
		//Other wise, it will calculate total. Total = Quote + Sales Order
		//Ticket 10739 - Total will now include Forecast value as well
		//nlapiLogExecution('debug','key // oppjson', keyPrefix+(i + 1)+ ' // '+JSON.stringify(oppjson));
		var totalValue = parseInt(trxjson['Quote']['months'][keyPrefix + (i + 1)]) + 
						 parseInt(trxjson['Sales Order']['months'][keyPrefix + (i + 1)]) +
						 parseInt(oppjson[keyPrefix + (i + 1)].AmountValue);
		
		//Qarterly View or Full View?
		if (isQtrView == 'T')
		{
			
			totalValue = 0;
			
			//For displaying calculated values, we only need to run it on quarter end indexes
			//If index is 2, calculate total for first quarter
			if (i==2)
			{
				for (var q1t=0; q1t <= 2; q1t +=1)
				{
					totalValue += parseInt(trxjson['Quote']['months'][keyPrefix + (q1t + 1)]) + 
								  parseInt(trxjson['Sales Order']['months'][keyPrefix + (q1t + 1)]) +
								  parseInt(oppjson[keyPrefix + (q1t + 1)].AmountValue);
				}
			}
			
			//If index is 5, calculate total for second quarter
			if (i==5)
			{
				for (var q2t=3; q2t <= 5; q2t +=1)
				{
					totalValue += parseInt(trxjson['Quote']['months'][keyPrefix + (q2t + 1)]) + 
								  parseInt(trxjson['Sales Order']['months'][keyPrefix + (q2t + 1)]) +
								  parseInt(oppjson[keyPrefix + (q2t + 1)].AmountValue);
				}
				
			}
			
			//If index 8, calculate total for third quarter
			if (i==8)
			{
				for (var q3t=6; q3t <= 8; q3t +=1)
				{
					totalValue += parseInt(trxjson['Quote']['months'][keyPrefix + (q3t + 1)]) + 
								  parseInt(trxjson['Sales Order']['months'][keyPrefix + (q3t + 1)]) +
								  parseInt(oppjson[keyPrefix + (q3t + 1)].AmountValue);
				}
			}
			
			//If index is 11, calculate total for forth quarter
			if (i==11)
			{
				for (var q4t=9; q4t <= 11; q4t +=1)
				{
					totalValue += parseInt(trxjson['Quote']['months'][keyPrefix + (q4t + 1)]) + 
								  parseInt(trxjson['Sales Order']['months'][keyPrefix + (q4t + 1)]) +
								  parseInt(oppjson[keyPrefix + (q4t + 1)].AmountValue);
				}
			}
			
		}//End check for qarterly view and calculating total value

		
		var trxjsonKey = budgetRepLabel;
		if (showMineOnly!='T' && showMyTeamOnly!='T') {
			trxjsonKey = budgetSubLabel;
		}
		
		
		if (rowLabel == totalQuoteSalesOrderLabel) {
		
			//Display the result of total ONLY if it is NOT quarterly view 
			//	OR
			//Quarterly VIEW and for each end of quarter indexes
			if (isQtrView != 'T' || 
				(isQtrView == 'T' && 
					(i==2 || i==5 || i==8 || i==11)
				)
			   )
			{
				row[keyPrefix + (i + 1)] = '<div style="font-weight: bold">'+formatNumber(parseInt(totalValue).toFixed(0))+'</div>';
			}
			
		} else if (rowLabel == performVsGoalLabel) {
			  //Total Difference Total - Budget
			
			var vsgDisplayVal = '';
			//goal value
			var vsgGoalValue = parseInt(trxjson[trxjsonKey]['months'][keyPrefix + (i + 1)]);
			
			if (isQtrView == 'T')
			{
				
				vsgGoalValue = 0;
				
				//For displaying calculated values, we only need to run it on quarter end indexes
				//If index is 2, calculate total for first quarter
				if (i==2)
				{
					for (var q1t=0; q1t <= 2; q1t +=1)
					{
						vsgGoalValue += parseInt(trxjson[trxjsonKey]['months'][keyPrefix + (q1t + 1)]); 
					}
				}
				
				//If index is 5, calculate total for second quarter
				if (i==5)
				{
					for (var q2t=3; q2t <= 5; q2t +=1)
					{
						vsgGoalValue += parseInt(trxjson[trxjsonKey]['months'][keyPrefix + (q2t + 1)]); 
					}
				}
				
				//If index 8, calculate total for third quarter
				if (i==8)
				{
					for (var q3t=6; q3t <= 8; q3t +=1)
					{
						vsgGoalValue += parseInt(trxjson[trxjsonKey]['months'][keyPrefix + (q3t + 1)]);
					}
				}
				
				//If index is 11, calculate total for forth quarter
				if (i==11)
				{
					for (var q4t=9; q4t <= 11; q4t +=1)
					{
						vsgGoalValue += parseInt(trxjson[trxjsonKey]['months'][keyPrefix + (q4t + 1)]);
					}
				}
			}
			
			//vs goal value
			var vsgNumberValue = parseInt(totalValue) - vsgGoalValue;
			//if VsGoal value is Less than Goal, display in red
			if (totalValue < vsgGoalValue) {
				vsgDisplayVal = '<div style="color:red">'+formatNumber(vsgNumberValue.toFixed(0))+'</div>';
			} else {
				vsgDisplayVal = '<div style="color:black; font-weight:bold">'+formatNumber(vsgNumberValue.toFixed(0))+'</div>';
			}
			
			//Display the result of total ONLY if it is NOT quarterly view 
			//	OR
			//Quarterly VIEW and for each end of quarter indexes
			if (isQtrView != 'T' || 
				(isQtrView == 'T' && 
					(i==2 || i==5 || i==8 || i==11)
				)
			   )
			{
				row[keyPrefix + (i + 1)] = vsgDisplayVal;
			}
			  
		} else if (rowLabel == percentCompleteLabel) {
			  //% Achieved Total/Budget * 100
			  var numberValue = 0;
			  
			  //goal value
			  var psgGoalValue = parseInt(trxjson[trxjsonKey]['months'][keyPrefix + (i + 1)]);
			  
			  if (isQtrView == 'T')
				{
					
				  psgGoalValue = 0;
					
					//For displaying calculated values, we only need to run it on quarter end indexes
					//If index is 2, calculate total for first quarter
					if (i==2)
					{
						for (var q1t=0; q1t <= 2; q1t +=1)
						{
							psgGoalValue += parseInt(trxjson[trxjsonKey]['months'][keyPrefix + (q1t + 1)]); 
						}
					}
					
					//If index is 5, calculate total for second quarter
					if (i==5)
					{
						for (var q2t=3; q2t <= 5; q2t +=1)
						{
							psgGoalValue += parseInt(trxjson[trxjsonKey]['months'][keyPrefix + (q2t + 1)]); 
						}
					}
					
					//If index 8, calculate total for third quarter
					if (i==8)
					{
						for (var q3t=6; q3t <= 8; q3t +=1)
						{
							psgGoalValue += parseInt(trxjson[trxjsonKey]['months'][keyPrefix + (q3t + 1)]);
						}
					}
					
					//If index is 11, calculate total for forth quarter
					if (i==11)
					{
						for (var q4t=9; q4t <= 11; q4t +=1)
						{
							psgGoalValue += parseInt(trxjson[trxjsonKey]['months'][keyPrefix + (q4t + 1)]);
						}
					}
				}
			  
			  
			  if (parseInt(trxjson[trxjsonKey]['months'][keyPrefix + (i + 1)]) != 0) {
				  numberValue = Math.round(((parseInt(totalValue) / psgGoalValue) * 100)).toFixed(0);
			  }
			  
			  var displayVal = '';
			  if (parseInt(totalValue) >= psgGoalValue) {
				  //Goal is >= to Total
				  displayVal = '<div style="color:green; font-weight: bold">'+numberValue+' %</div>';
			  } else {
				  displayVal = '<div style="color:red; font-weight: bold">'+numberValue+' %</div>';
			  }
			 
			  
			//Display the result of total ONLY if it is NOT quarterly view 
			//	OR
			//Quarterly VIEW and for each end of quarter indexes
			if (isQtrView != 'T' || 
				(isQtrView == 'T' && 
					(i==2 || i==5 || i==8 || i==11)
				)
			   )
			{
				row[keyPrefix + (i + 1)] = displayVal;
			}
		
		//Add in logic for SalesOrder % Goal Ticket 10739
		} 
		else if (rowLabel == percentSoCompletedLabel) 
		{
			//% Sales Order/Budget * 100
			  var numberValue = 0;
			  
			  //goal value
			  var psgGoalValue = parseInt(trxjson[trxjsonKey]['months'][keyPrefix + (i + 1)]);
			  var soTotalValue = parseInt(trxjson['Sales Order']['months'][keyPrefix + (i + 1)]);
			  
			  if (isQtrView == 'T')
			  {
					
				  	psgGoalValue = 0;
				  	soTotalValue = 0;
					
					//For displaying calculated values, we only need to run it on quarter end indexes
					//If index is 2, calculate total for first quarter
					if (i==2)
					{
						for (var q1t=0; q1t <= 2; q1t +=1)
						{
							psgGoalValue += parseInt(trxjson[trxjsonKey]['months'][keyPrefix + (q1t + 1)]);
							soTotalValue += parseInt(trxjson['Sales Order']['months'][keyPrefix + (q1t + 1)]);
						}
					}
					
					//If index is 5, calculate total for second quarter
					if (i==5)
					{
						for (var q2t=3; q2t <= 5; q2t +=1)
						{
							psgGoalValue += parseInt(trxjson[trxjsonKey]['months'][keyPrefix + (q2t + 1)]);
							soTotalValue += parseInt(trxjson['Sales Order']['months'][keyPrefix + (q2t + 1)]); 
						}
					}
					
					//If index 8, calculate total for third quarter
					if (i==8)
					{
						for (var q3t=6; q3t <= 8; q3t +=1)
						{
							psgGoalValue += parseInt(trxjson[trxjsonKey]['months'][keyPrefix + (q3t + 1)]);
							soTotalValue += parseInt(trxjson['Sales Order']['months'][keyPrefix + (q3t + 1)]);
						}
					}
					
					//If index is 11, calculate total for forth quarter
					if (i==11)
					{
						for (var q4t=9; q4t <= 11; q4t +=1)
						{
							psgGoalValue += parseInt(trxjson[trxjsonKey]['months'][keyPrefix + (q4t + 1)]);
							soTotalValue += parseInt(trxjson['Sales Order']['months'][keyPrefix + (q4t + 1)]);
						}
					}
			  }
			  
			  //nlapiLogExecution('debug','soTotalValue',keyPrefix+(i+1)+ ' // '+soTotalValue+' // psgGoalValue: '+psgGoalValue);
			  
			  if (psgGoalValue != 0) {
				  numberValue = Math.round(((soTotalValue / psgGoalValue) * 100)).toFixed(0);
			  }
			  
			  //nlapiLogExecution('debug','So Completed', numberValue);
			  
			  var displayVal = '';
			  if (soTotalValue >= psgGoalValue) {
				  //Goal is >= to Total
				  displayVal = '<div style="color:green; font-weight: bold">'+numberValue+' %</div>';
			  } else {
				  displayVal = '<div style="color:red; font-weight: bold">'+numberValue+' %</div>';
			  }
			  
			  //nlapiLogExecution('debug','So Display Val', displayVal);
			  	//Display the result of total ONLY if it is NOT quarterly view 
				//	OR
				//Quarterly VIEW and for each end of quarter indexes
				if (isQtrView != 'T' || 
					(isQtrView == 'T' && 
						(i==2 || i==5 || i==8 || i==11)
					)
				   )
				{
					row[keyPrefix + (i + 1)] = displayVal;
				}
			  
			  
		} else if (rowLabel == 'YoY growth') {
			//nlapiLogExecution('debug','% YOY',rowLabel);
			//% Current Total/ Last Year Total * 100
			  var numberValue = 0;
			  			  
			  var soCurrent = parseFloat(trxjson['Sales Order']['months'][keyPrefix + (i + 1)]);
			  var soLastYear = parseFloat(trxjson['Sales Order (Last Year)']['months'][keyPrefix + (i + 1)]);
			  
			  if (isQtrView == 'T')
			  {
					
				  soCurrent = 0;
				  soLastYear = 0;
					
				  //For displaying calculated values, we only need to run it on quarter end indexes
				  //If index is 2, calculate total for first quarter
				  if (i==2)
				  {
					  for (var q1t=0; q1t <= 2; q1t +=1)
					  {
						  soCurrent += parseFloat(trxjson['Sales Order']['months'][keyPrefix + (q1t + 1)]);
						  soLastYear += parseFloat(trxjson['Sales Order (Last Year)']['months'][keyPrefix + (q1t + 1)]);
					  }
				  }
					
					//If index is 5, calculate total for second quarter
					if (i==5)
					{
						for (var q2t=3; q2t <= 5; q2t +=1)
						{
							soCurrent += parseFloat(trxjson['Sales Order']['months'][keyPrefix + (q2t + 1)]);
							soLastYear += parseFloat(trxjson['Sales Order (Last Year)']['months'][keyPrefix + (q2t + 1)]); 
						}
					}
					
					//If index 8, calculate total for third quarter
					if (i==8)
					{
						for (var q3t=6; q3t <= 8; q3t +=1)
						{
							soCurrent += parseFloat(trxjson['Sales Order']['months'][keyPrefix + (q3t + 1)]);
							soLastYear += parseFloat(trxjson['Sales Order (Last Year)']['months'][keyPrefix + (q3t + 1)]);
						}
					}
					
					//If index is 11, calculate total for forth quarter
					if (i==11)
					{
						for (var q4t=9; q4t <= 11; q4t +=1)
						{
							soCurrent += parseFloat(trxjson['Sales Order']['months'][keyPrefix + (q4t + 1)]);
							soLastYear += parseFloat(trxjson['Sales Order (Last Year)']['months'][keyPrefix + (q4t + 1)]);
						}
					}
			  }
			  
			  //nlapiLogExecution('debug','so current / last year', soCurrent+' // '+soLastYear);
			  
			  if (parseInt(soCurrent) != 0) {
				  numberValue = -1 * (100 -(Math.round(((soCurrent / soLastYear) * 100)))).toFixed(0);
			  }
			  
			  var displayVal = '';
			  if (soCurrent >= soLastYear) {
				  //Goal is >= to Total
				  displayVal = '<div style="color:green; font-weight: bold">'+numberValue+' %</div>';
			  } else {
				  displayVal = '<div style="color:red; font-weight: bold">'+numberValue+' %</div>';
			  }
			  
			//Display the result of total ONLY if it is NOT quarterly view 
			//	OR
			//Quarterly VIEW and for each end of quarter indexes
			if (isQtrView != 'T' || 
				(isQtrView == 'T' && 
					(i==2 || i==5 || i==8 || i==11)
				)
			   )
			{
				row[keyPrefix + (i + 1)] = displayVal;
			}
		}
		//Added June 17 2016 - Ticket 10739
		else if (rowLabel == 'Total YoY growth')
		{
			  var numberValue = 0;
  			  
			  //Use Total Value to compare
			  var tSoLastYear = parseFloat(trxjson['Sales Order (Last Year)']['months'][keyPrefix + (i + 1)]);
			  
			  if (isQtrView == 'T')
				{
					
				  tSoLastYear = 0;
					
					//For displaying calculated values, we only need to run it on quarter end indexes
					//If index is 2, calculate total for first quarter
					if (i==2)
					{
						for (var q1t=0; q1t <= 2; q1t +=1)
						{
							tSoLastYear += parseFloat(trxjson['Sales Order (Last Year)']['months'][keyPrefix + (q1t + 1)]); 
						}
					}
					
					//If index is 5, calculate total for second quarter
					if (i==5)
					{
						for (var q2t=3; q2t <= 5; q2t +=1)
						{
							tSoLastYear += parseFloat(trxjson['Sales Order (Last Year)']['months'][keyPrefix + (q2t + 1)]); 
						}
					}
					
					//If index 8, calculate total for third quarter
					if (i==8)
					{
						for (var q3t=6; q3t <= 8; q3t +=1)
						{
							tSoLastYear += parseFloat(trxjson['Sales Order (Last Year)']['months'][keyPrefix + (q3t + 1)]);
						}
					}
					
					//If index is 11, calculate total for forth quarter
					if (i==11)
					{
						for (var q4t=9; q4t <= 11; q4t +=1)
						{
							tSoLastYear += parseFloat(trxjson['Sales Order (Last Year)']['months'][keyPrefix + (q4t + 1)]);
						}
					}
				}
			  
			  if (parseInt(tSoLastYear) != 0) {
				  numberValue = -1 * (100 -(Math.round(((totalValue / tSoLastYear) * 100)))).toFixed(0);
			  }
			  
			  var displayVal = '';
			  if (totalValue >= tSoLastYear) {
				  //Goal is >= to Total
				  displayVal = '<div style="color:green; font-weight: bold">'+numberValue+' %</div>';
			  } else {
				  displayVal = '<div style="color:red; font-weight: bold">'+numberValue+' %</div>';
			  }
			 
			//Display the result of total ONLY if it is NOT quarterly view 
			//	OR
			//Quarterly VIEW and for each end of quarter indexes
			if (isQtrView != 'T' || 
				(isQtrView == 'T' && 
					(i==2 || i==5 || i==8 || i==11)
				)
			   )
			{
				row[keyPrefix + (i + 1)] = displayVal;
			}
			
		} 
		else if (rowLabel == 'Forecast') 
		{
			
			if (isQtrView == 'T')
			{
				//For displaying calculated values, we only need to run it on quarter end indexes
				  //If index is 2, calculate total for first quarter
				var forecastDisplayVal = 0;
				  if (i==2)
				  {
					  for (var q1t=0; q1t <= 2; q1t +=1)
					  {
						  forecastDisplayVal += parseFloat(oppjson[keyPrefix + (q1t + 1)].AmountValue);
					  }
					  row[keyPrefix + (i + 1)] = formatNumber(forecastDisplayVal);
				  }
					
					//If index is 5, calculate total for second quarter
					if (i==5)
					{
						for (var q2t=3; q2t <= 5; q2t +=1)
						{
							forecastDisplayVal += parseFloat(oppjson[keyPrefix + (q2t + 1)].AmountValue); 
						}
						row[keyPrefix + (i + 1)] = formatNumber(forecastDisplayVal);
					}
					
					//If index 8, calculate total for third quarter
					if (i==8)
					{
						for (var q3t=6; q3t <= 8; q3t +=1)
						{
							forecastDisplayVal += parseFloat(oppjson[keyPrefix + (q3t + 1)].AmountValue);
						}
						row[keyPrefix + (i + 1)] = formatNumber(forecastDisplayVal);
					}
					
					//If index is 11, calculate total for forth quarter
					if (i==11)
					{
						for (var q4t=9; q4t <= 11; q4t +=1)
						{
							forecastDisplayVal += parseFloat(oppjson[keyPrefix + (q4t + 1)].AmountValue);
						}
						row[keyPrefix + (i + 1)] = formatNumber(forecastDisplayVal);
					}
			}
			else
			{
				row[keyPrefix + (i + 1)] = formatNumber(oppjson[keyPrefix + (i + 1)].AmountValue);
			}
			
			
		}
		
	}
    
    
    // Move the start date to the next month
    startDate = nlapiAddMonths(startDate, 1); // Add one month
    
    nlapiLogExecution('debug','index '+i,'New Start Date: '+startDate);
  }
  
  // Retrieve total year results
  
  nlapiLogExecution('debug','qtrViewDateJson',JSON.stringify(qtrViewDateJson));
  
  if (searchIdNum && fieldName) {
	  if (toggle == 0) {
		  row['total'] = buildLink(searchIdNum, startDate, endDate, subsidiary, formatNumber(trxjson[rowLabel]['total']));
	  } else {
		  row['total'] = formatNumber(trxjson[rowLabel]['total']);
	  }
	  
  } else {
	  
	  //nlapiLogExecution('debug','Last part of display','running');
	  var trxjsonKey = budgetRepLabel;
	  if (showMineOnly!='T' && showMyTeamOnly!='T') {
		  trxjsonKey = budgetSubLabel;
	  }
	  var totalValue = parseInt(trxjson['Quote']['total']) + 
					  parseInt(trxjson['Sales Order']['total']) +
					  parseInt(oppjson['total']);
	  
	  
	  if (rowLabel == totalQuoteSalesOrderLabel) {
		  //Total Quote + Total Sales Order
		  row['total'] = '<div style="font-weight: bold">'+formatNumber(totalValue.toFixed(0))+'</div>';  
	  } else if (rowLabel == performVsGoalLabel) {
		  //Total Difference Total - Budget
		  
		  var vsgTotalDisplayVal = '';
		  //goal value
		  var vsgTotalGoalValue = parseInt(trxjson[trxjsonKey]['total']);
		  //vs goal value
		  var vsgTotalNumberValue = parseInt(totalValue) - vsgTotalGoalValue;
		  //if VsGoal value is Less than Goal, display in red
		  if (vsgTotalNumberValue < vsgTotalGoalValue) {
			  vsgTotalDisplayVal = '<div style="color:red">'+formatNumber(vsgTotalNumberValue.toFixed(0))+'</div>';
		  } else {
			  vsgTotalDisplayVal = '<div style="color:black; font-weight:bold">'+formatNumber(vsgTotalNumberValue.toFixed(0))+'</div>';
		  }
			
		  row['total'] = vsgTotalDisplayVal;
		  
	  } else if (rowLabel == percentCompleteLabel) {
		  //% Achieved Total/Budget * 100
		  var numberValue = 0;
		//goal value
		  var psgTotalGoalValue = parseInt(trxjson[trxjsonKey]['total']);
		  
		  if (psgTotalGoalValue != 0) {
			  numberValue = Math.round((parseInt(totalValue) / psgTotalGoalValue) * 100).toFixed(0);
		  }
		  
		  var displayVal = '';
		  if (parseInt(totalValue) >= psgTotalGoalValue) {
			  //Goal is >= to Total
			  displayVal = '<div style="color:green; font-weight: bold">'+numberValue+' %</div>';
		  } else {
			  displayVal = '<div style="color:red; font-weight: bold">'+numberValue+' %</div>';
		  }
		  
		  row['total'] = displayVal;
	  } 
	  
	  //Ticket 10739
	  else if (rowLabel == percentSoCompletedLabel)
	  {
		//% Sales Order/Budget * 100
		  var numberValue = 0;
		//goal value
		  var psgTotalGoalValue = parseInt(trxjson[trxjsonKey]['total']);
		  
		  if (psgTotalGoalValue != 0) {
			  numberValue = Math.round((parseInt(trxjson['Sales Order']['total']) / psgTotalGoalValue) * 100).toFixed(0);
		  }
		  
		  var displayVal = '';
		  if (parseInt(trxjson['Sales Order']['total']) >= psgTotalGoalValue) {
			  //Goal is >= to Total
			  displayVal = '<div style="color:green; font-weight: bold">'+numberValue+' %</div>';
		  } else {
			  displayVal = '<div style="color:red; font-weight: bold">'+numberValue+' %</div>';
		  }
		  
		  row['total'] = displayVal;
	  }
	  else if (rowLabel == 'YoY growth') 
	  {
		//% Current SO Total/ Last Year SO Total * 100
		  var numberValue = 0;
		  			  
		  var soCurrent = parseFloat(trxjson['Sales Order']['total']);
		  var soLastYear = parseFloat(trxjson['Sales Order (Last Year)']['total']);
		  
		  if (parseInt(trxjson['Sales Order (Last Year)']['total']) != 0) {
			  numberValue = -1 * (100 -(Math.round(((soCurrent / soLastYear) * 100)))).toFixed(0);
		  }
		  
		  var displayVal = '';
		  if (soCurrent >= soLastYear) {
			  //Goal is >= to Total
			  displayVal = '<div style="color:green; font-weight: bold">'+numberValue+' %</div>';
		  } else {
			  displayVal = '<div style="color:red; font-weight: bold">'+numberValue+' %</div>';
		  }
		  
		  row['total'] = displayVal;

	  } 
	  else if (rowLabel == 'Total YoY growth')
	  {
		//% Current Total (SO + QT + FC)/ Last Year SO Total * 100
		  var numberValue = 0;
		  			  
		  var ttSoLastYear = parseFloat(trxjson['Sales Order (Last Year)']['total']);
		  
		  if (parseInt(ttSoLastYear) != 0) {
			  numberValue = -1 * (100 -(Math.round(((totalValue / ttSoLastYear) * 100)))).toFixed(0);
		  }
		  
		  var displayVal = '';
		  if (ttSoLastYear >= ttSoLastYear) {
			  displayVal = '<div style="color:green; font-weight: bold">'+numberValue+' %</div>';
		  } else {
			  displayVal = '<div style="color:red; font-weight: bold">'+numberValue+' %</div>';
		  }
		  
		  row['total'] = displayVal;
	  }
	  else if (rowLabel == 'Forecast') {
		
		row['total'] = formatNumber(oppjson['total']);
	  }
	  
	  
  }
  
  
  return row;
  
  /**
   * Programmatically get total amount for each transaction type
  startDate = nlapiAddMonths(nlapiStringToDate('1/1/' + year), 3);
  endDate = nlapiAddMonths(startDate, 12);
  endDate = nlapiAddDays(endDate, -1);
  nlapiLogExecution('debug','total',startDate+' // '+endDate);
  // Create the filter
  var filters = new Array();
  filters.push(new nlobjSearchFilter(dateField, null, 'within', nlapiDateToString(startDate), nlapiDateToString(endDate)));
  filters.push(new nlobjSearchFilter(subsidiaryField, null, 'anyof', subsidiary));
  
  if (version != 0) {
    filters.push(new nlobjSearchFilter('custrecord_budget_version', null, 'is', version));
  }
  
  if (salesRepFilter && salesRepFilter.length > 0) {
  	filters.push(new nlobjSearchFilter('salesrep', null, 'anyof', salesRepFilter));
  }
  
  // Run the search query
  var results = nlapiSearchRecord(null, searchIdNum, filters);
  
  // Add the results to our row
  var totalValue = 0;
  if (results) {
	  totalValue = formatNumber(Math.round(results[0].getValue(fieldName, null, 'sum')).toFixed(0));
  }
*/

 }

/**
 * Build link to saved search
 * 
 * @param searchId
 * @param endDate
 * @param endDate
 * @param subsidiary
 * @param value
 *
 * @return {String}
 */
function buildLink(searchId, startDate, endDate, subsidiary, value) {
  
  //var startDateFormatted = startDate.getDate() + '/' + (startDate.getMonth() + 1) + '/' + startDate.getFullYear();
  //var endDateFormatted = endDate.getDate() + '/' + (endDate.getMonth() + 1) + '/' + endDate.getFullYear();
  
  //Use NS native date API
  var startDateFormatted = nlapiDateToString(startDate);
  var endDateFormatted = nlapiDateToString(endDate);
  
  var baseUrl = "/app/common/search/searchresults.nl?";
  var parameters = new Array();
  parameters['searchtype'] = "Transaction";
  parameters['Transaction_SUBSIDIARY'] = subsidiary;
  parameters['CUSTCOL_BO_DATEmodi'] = "WITHIN";
  parameters['CUSTCOL_BO_DATE'] = "CUSTOM";
  parameters['CUSTCOL_BO_DATErange'] = "CUSTOM";
  parameters['CUSTCOL_BO_DATEfrom'] = startDateFormatted;
  parameters['CUSTCOL_BO_DATEfromrel'] = "";
  parameters['CUSTCOL_BO_DATEfromreltype'] = "DAGO";
  parameters['CUSTCOL_BO_DATEto'] = endDateFormatted;
  parameters['CUSTCOL_BO_DATEtorel'] = "";
  parameters['CUSTCOL_BO_DATEtoreltype'] = "DAGO";
  parameters['sortcol'] = "Transaction_TRANDATE_raw";
  parameters['sortdir'] = "ASC";
  parameters['csv'] = "HTML";
  parameters['OfficeXML'] = "F";
  parameters['pdf'] = "";
  parameters['detail'] = "CUSTCOL_BO_DATE";
  parameters['style'] = "NORMAL";
  parameters['report'] = "";
  parameters['grid'] = "";
  parameters['searchid'] = searchId;
  parameters['dle'] = "";
  
  // Build query string
  var params = new Array();
  for (key in parameters) {
    params.push(key + '=' + parameters[key]);
  }
  var query = params.join('&');
  
  // Build and return link
  var url = baseUrl + query;
  var link = '<a class="dottedlink" href="' + url + '">' + value + "</a>";
  return link;
 }

/**
 * Insert thousand separators
 *
 * @param v
 */
function formatNumber(v) {
  
	//MOD CBL
	//Turn it into positive number first.
	var val = 0; 
	var isNegative = false;
	if (v && !isNaN(v)) {
		val = parseInt(v);
	}
	
	if (val < 0) {
		isNegative = true;
		val = val * -1;
	}
	
  val = val.toString();
  
  var result = "";
  var len = val.length;
  while (len > 3){
    result = ","+val.substr(len-3,3)+result;
    len -=3;
  }
  
  var returnVal = val.substr(0,len)+result;
  if (isNegative) {
	  returnVal = '-'+returnVal;
  }
  return returnVal;
}

/**
 * Get employee currency by employee id
 *
 * @param employeeId
 * @return employee currency or null if not found
 */
function getEmployeeCurrency(employeeId) {
  
  // Filter by employee id
  var filters = new Array();
  filters.push(new nlobjSearchFilter('internalid', null, 'is', employeeId));
  
  // Run the search query
  var results = nlapiSearchRecord('employee', 'customsearch_script_employee_currency', filters);
  
  // Return employee currency
  return results ? results[0].getValue('custentity_em_currency') : null;
}

/**
 * Code Snippet for Budget Row
 * //version 0 is NONE budget values
    // Is this a budget row?
    if (version != 0) {
      
      // Yes...
      
      // Budget currency
      //var budgetCurrency = results[0].getValue('custrecord_budget_currency', null, 'max');
      var budgetCurrency = results[0].getValue('internalid', 'custrecord_budget_currency', 'max');
      var budgetExchangeRate = results[0].getValue('custrecord_budget_exchangerategbptousd', null, 'max');
      
      // Employee currency
      //var employeeId = nlapiGetUser();
      //var employee = nlapiLoadRecord('employee', employeeId);
      //var employeeCurrency = employee.getFieldValue('currency');
      var employeeCurrency = getEmployeeCurrency(nlapiGetUser());
      
      // Convert value to employee currency
      switch (employeeCurrency) {
        
        case '1': // British Pound
          
          switch (budgetCurrency) {
            case '1': // British Pound
              // Do nothing
              break;
            case '2': // US Dollar
              value = (1 / budgetExchangeRate) * value;
              break;
            default: // Unsupported currency
              //throw nlapiCreateError('SWEET_ERROR_UNKNOWN_BUDGET_CURRENCY', 'Unsupported budget currency: ' + budgetCurrency);
              break;
          }
          break;
          
        case '2': // US Dollar
          
          switch (budgetCurrency) {
            case '1': // British Pound
              value = budgetExchangeRate * value;
              break;
            case '2': // US Dollar
              // Do nothing
              break;
            default: // Unsupported currency
              //throw nlapiCreateError('SWEET_ERROR_UNKNOWN_BUDGET_CURRENCY', 'Unsupported budget currency: ' + budgetCurrency);
              break;
          }
          break;
          
        default: // Unsupported currency
          throw nlapiCreateError('SWEET_ERROR_UNKNOWN_EMPLOYEE_CURRENCY', 'Unsupported employee currency: ' + employeeCurrency);
          break;
      }
    }
    */
