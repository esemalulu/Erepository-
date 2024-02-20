/**
 * Module Description
 * 
 * Version    Date            Author           Remarks
 * 1.00       12 22 2016     Jeffrey Bajit		GD version of DRO printout
 *
 */

// ARRAY CONSTANTS
var SERIESID = 'seriesId';
var SERIESTEXT = 'seriesText';
// OBJECT TYPE CONSTANTS
var  TYPE_DAILY = 1;
var  TYPE_MONTHLY = 2;
var  TYPE_REG = 3;
// Daily fields
//var DAILY_BEGINNINGINVENTORY = 'dailyBeginningInventory';
//var DAILY_UNITSPRODUCED = 'dailyUnitsProduced';
var DAILY_SHIPMENTS = 'dailyShipments';
//var DAILY_ENDINGINVENTORY = 'dailyEndingInventory';
var DAILY_UNITSOFFLINE = 'dailyUnitsOffline';
var DAILY_SALESORDERS = 'dailySalesOrders';

//var DAILY_BEGINNINGINVENTORYAMOUNT = 'dailyBeginningInventoryAmount';
//var DAILY_UNITSPRODUCEDAMOUNT = 'dailyUnitsProducedAmount';
var DAILY_SHIPMENTSAMOUNT = 'dailyShipmentsAmount';
//var DAILY_ENDINGINVENTORYAMOUNT = 'dailyEndingInventoryAmount';
var DAILY_UNITSOFFLINEAMOUNT = 'dailyUnitsOfflineAmount';
var DAILY_SALESORDERSAMOUNT = 'dailySalesOrdersAmount';
// Monthly Fields
var MONTHLY_BEGINNINGINVENTORY = 'monthlyBeginningInventory';
//var MONTHLY_UNITSPRODUCED = 'monthlyUnitsProduced';
var MONTHLY_SHIPMENTS = 'monthlyShipments';
var MONTHLY_ENDINGINVENTORY = 'monthlyEndingInventory';
var MONTHLY_UNITSOFFLINE = 'monthlyUnitsOffline';
var MONTHLY_SALESORDERS = 'monthlySalesOrders';
var MONTHLY_LAST_SALESORDERS = 'lastMonthSalesOrders';
var MONTHLY_YTD_SALESORDERS = 'monthlyYTDSalesOrders';
var MONTHLY_LASTYTD_SALESORDERS = 'lastMonthYTDSalesOrders';
var MONTHLY_TOTAL_TO_SHIP = 'monthlyTotalToShip';	
var MONTHLY_LEFT_TO_SHIP = 'monthlyLeftToShip';	
var MONTHLY_OPEN_UNITS = 'monthlyOpenUnits';
var MONTHLY_SCHEDULED_OPENS = 'monthlyScheduledOpens';
var MONTHLY_SCHEDULED_SOLD = 'monthlyScheduledSold';
var MONTHLY_BACKLOG = 'monthlyBacklog';

//Monthly amount fields
var MONTHLY_BEGINNINGINVENTORYAMOUNT = 'monthlyBeginningInventoryAmount';
//var MONTHLY_UNITSPRODUCEDAMOUNT = 'monthlyUnitsProducedAmount';
var MONTHLY_SHIPMENTSAMOUNT = 'monthlyShipmentsAmount';
var MONTHLY_ENDINGINVENTORYAMOUNT = 'monthlyEndingInventoryAmount';
var MONTHLY_UNITSOFFLINEAMOUNT = 'monthlyUnitsOfflineAmount';
var MONTHLY_SALESORDERSAMOUNT = 'monthlySalesOrdersAmount';
var MONTHLY_LAST_SALESORDERSAMOUNT = 'lastMonthSalesOrdersAmount';
var MONTHLY_YTD_SALESORDERSAMOUNT = 'monthlyYTDSalesOrdersAmount';
var MONTHLY_LASTYTD_SALESORDERSAMOUNT = 'lastMonthYTDSalesOrdersAmount';
var MONTHLY_TOTAL_TO_SHIPAMOUNT = 'monthlyTotalToShipAmount';	
var MONTHLY_LEFT_TO_SHIPAMOUNT = 'monthlyLeftToShipAmount';	
var MONTHLY_OPEN_UNITSAMOUNT = 'monthlyOpenUnitsAmount';
var MONTHLY_SCHEDULED_OPENSAMOUNT = 'monthlyScheduledOpensAmount';
var MONTHLY_SCHEDULED_SOLDAMOUNT = 'monthlyScheduledSoldAmount';
var MONTHLY_BACKLOGAMOUNT = 'monthlyBacklogAmount';

//Totals
//var TOTAL_AVAIL_SHIP = 'totalAvailableToShip';
//var TOTAL_LEFT_SHIP = 'totalLeftToShip';
//var TOTAL_OPEN = 'totalOpen';

var UNITS_INCOMPLETE_IN_YARD = 'unitsIncompleteInYard';
var UNSCHEDULED_ORDERS = 'unscheduledOrders';
var SCHEDULED_NOT_SHIPPED = 'scheduledNotShipped';
var UNITS_INCOMPLETE_IN_YARD_AMOUNT = 'unitsIncompleteInYardAmount';
var UNSCHEDULED_ORDERS_AMOUNT = 'unscheduledOrdersAmount';
var SCHEDULED_NOT_SHIPPED_AMOUNT = 'scheduledNotShippedAmount';

//Registration Count fields
var DAILY_REGISTRATIONS = 'dailyRegistrations';
var MONTHLY_REGISTRATIONS = 'monthlyRegistrations';
var MONTHLY_LAST_YEAR_REGISTRATIONS = 'lastYearRegistrations';
var YEARLY_REGISTRATIONS = 'yearToDateRegistrations';	
var LAST_YEARLY_REGISTRATIONS = 'lastYearToDateRegistrations';

/**
 * Suitelet for printing the DRO.
 * 
 * @param {nlobjRequest} request Request object
 * @param {nlobjResponse} response Response object
 * @returns {Void} Any output is written via response object
 */
function GD_DROPrintSuitelet(request, response)
{
	if (request.getMethod() == 'GET') {
		var form = nlapiCreateForm('Daily Dashboard Operations Report' , false);
		
		var field = form.addField('custpage_reportdate', 'date', 'Report Date', null, null);
		var custparamReportDate = request.getParameter('custparam_reportdate') || '';
		var custparam_printlayoutlandscape = request.getParameter('custparam_printlayoutlandscape') || 'T';  // the default value is 'T'
		var field2 = form.addField('custpage_reportprintlayoutoption', 'checkbox', 'Print Landscape', null, null); // This field was added as a switch for landscape or portrait
		field2.setDefaultValue(custparam_printlayoutlandscape);
//		field2.setDisplayType('hidden');  // This is hidden since there is no reason for GD to use portrait.
		field.setMandatory(true);
		if (custparamReportDate != '' ) {
			field.setDefaultValue(custparamReportDate);
			var headerHTML = 
				'<table cellpadding="0" width="100%" style="font-size:12pt; font-weight:bold;">' + 
					'<tr>' + 
						'<td>' + 
							'Daily Operations Dashboard (' + custparamReportDate + ')' + 
						'</td>' + 
					'</tr>' + 
				'</table>';
			
			// get the dro object array.
			var droObjectArray = GetDRODailyObjectArray(custparamReportDate);
			var droMonthlyObjArray = GetDROMonthlyObjectArray(custparamReportDate);
			var droRegObjArray = GetDRORegistrationsObjectArray(custparamReportDate);
			
			var chunk = 8;
			

			// set up an empty row with a colspan of the number of series plus 1
			// the number of series if the number of elements in the array
			var emptyRow = 
				'<tr>' + 
					'<td style="border:none;" colspan="' + ((chunk*2) + 1) + '">&nbsp;</td>' + 
				'</tr>';
			
			// build the data HTML
			var dataHTML = 
				'<table cellpadding="5" width="100%" style="padding-top:9px;" cellborder="1" cellmargin="0">' + 
					GetDRODailyHTML(droObjectArray, chunk, emptyRow) +
					emptyRow + GetDROMonthlyHTML(droMonthlyObjArray, chunk) + emptyRow + GetDRORegHTML(droRegObjArray, chunk, emptyRow) +
				'</table>';
			
			var portraitOrLandscape = '';
			if (custparam_printlayoutlandscape == 'T')
				portraitOrLandscape = ' size:Letter-landscape;';
				
			// build the HTML object to be passed into the Suitelet
			var html = 
				'<body padding=".1in .1in .1in .1in" style="font-size:10pt; font-family:sans-serif; ' + portraitOrLandscape + '">' + 
					headerHTML + 
					'<br />' + 
					dataHTML +
				'</body>';
			
			PrintPDFInSuiteLet(request, response, 'DRO.pdf', html);
		} else {
			form.addSubmitButton('Generate Report');
			response.writePage(form);
		}
	} else { // POST
		var parameters = new Object();
		parameters.custparam_reportdate = request.getParameter('custpage_reportdate');
		parameters.custparam_printlayoutlandscape = request.getParameter('custpage_reportprintlayoutoption');  // this parameter is solely for switching between portrait or landscape on the printout
		
		nlapiSetRedirectURL('SUITELET', 'customscriptgd_droprintsuitelet', 'customdeploygd_droprintsuitelet', false, parameters);
	}
}

/**
 * Returns the DRO daily html table row.
 * 
 * @returns {String}
 */
function GetDRODailyHTML(droObjectArray, chunk, emptyRow)
{
	var droObjectArraylength = droObjectArray.length;
	var currentLength = droObjectArraylength;
	var dailyDetailHTML = '';

	// we create chunks of 4 series per row.
	for (var j = 0; j < droObjectArraylength; j += chunk)
	{
		var tempArraySlice = droObjectArray.slice(j,j+chunk);
		// build the top header row
		dailyDetailHTML += 
				'<tr>' + 
					'<td style="font-weight:bold;">' + 
						'DAILY:' +
					'</td>';
		
		// get the list of series for the top header row
		for (var i=0; i<tempArraySlice.length; i++)
		{
			var droObject = tempArraySlice[i];
			
			dailyDetailHTML += 
				'<td style="font-weight:bold;" colspan="2">' + 
					droObject[SERIESTEXT] +
				'</td>';
		}
		
		dailyDetailHTML += '</tr>';
		
		// build the detail html data for the daily part of the html	
		//dailyDetailHTML += GetDROHTMLDataByName(droObjectArray, 'Beginning Inventory (Complete)', DAILY_BEGINNINGINVENTORY, DAILY_BEGINNINGINVENTORYAMOUNT);
		//dailyDetailHTML += GetDROHTMLDataByName(droObjectArray, 'Units Produced (Complete)', DAILY_UNITSPRODUCED, DAILY_UNITSPRODUCEDAMOUNT);
		dailyDetailHTML += GetDROHTMLDataByName(tempArraySlice, 'Units Produced (Offline)', DAILY_UNITSOFFLINE, DAILY_UNITSOFFLINEAMOUNT);
		
		dailyDetailHTML += GetDROHTMLDataByName(tempArraySlice, 'Shipments', DAILY_SHIPMENTS, DAILY_SHIPMENTSAMOUNT);
		//dailyDetailHTML += GetDROHTMLDataByName(droObjectArray, 'Ending Inventory (Complete)', DAILY_ENDINGINVENTORY, DAILY_ENDINGINVENTORYAMOUNT);
		//dailyDetailHTML += GetDROHTMLDataByName(droObjectArray, 'Units Not Complete in Yard', UNITS_INCOMPLETE_IN_YARD, UNITS_INCOMPLETE_IN_YARD_AMOUNT);
		dailyDetailHTML += GetDROHTMLDataByName(tempArraySlice, 'Orders Received', DAILY_SALESORDERS, DAILY_SALESORDERSAMOUNT);	
		// currentLength = currentLength - chunk;
		if (currentLength > chunk) // adds a space between daily object rows
			dailyDetailHTML += emptyRow;
	}
	return dailyDetailHTML;
}

/**
 * Returns the DRO monthly html table row.
 * 
 * @returns {String}
 */
function GetDROMonthlyHTML(droObjectArray, chunk)
{
	var droObjectArraylength = droObjectArray.length;
	var currentLength = droObjectArraylength;
	var monthlyDetailHTML = '';

	// we create chunks of 4 series per row.
	for (var j = 0; j < droObjectArraylength; j += chunk)
	{
		var tempArraySlice = droObjectArray.slice(j,j+chunk);
		// build the top header row
		monthlyDetailHTML += 
				'<tr>' + 
					'<td style="font-weight:bold;">' + 
						'MONTHLY:' +
					'</td>';
		
		// get the list of series for the top header row
		for (var i=0; i<tempArraySlice.length; i++)
		{
			var droObject = tempArraySlice[i];
			
			monthlyDetailHTML += 
				'<td style="font-weight:bold;" colspan="2">' + 
					droObject[SERIESTEXT] +
				'</td>';
		}
		
		monthlyDetailHTML += '</tr>';
		
		var emptyRow = 
			'<tr>' + 
				'<td style="border:none;" colspan="' + ((tempArraySlice.length*2) + 1) + '">&nbsp;</td>' + 
			'</tr>';
		
		// build the detail html data for the daily part of the html	
		monthlyDetailHTML += GetDROHTMLDataByName(tempArraySlice, 'Beginning Inventory (Total)', MONTHLY_BEGINNINGINVENTORY, MONTHLY_BEGINNINGINVENTORYAMOUNT);
		monthlyDetailHTML += GetDROHTMLDataByName(tempArraySlice, 'Units Produced (Total)', MONTHLY_UNITSOFFLINE, MONTHLY_UNITSOFFLINEAMOUNT);
		//monthlyDetailHTML += GetDROHTMLDataByName(droObjectArray, 'Units Produced (Total)', MONTHLY_UNITSPRODUCED, MONTHLY_UNITSPRODUCEDAMOUNT);
		monthlyDetailHTML += GetDROHTMLDataByName(tempArraySlice, 'Shipments', MONTHLY_SHIPMENTS, MONTHLY_SHIPMENTSAMOUNT);
		monthlyDetailHTML += GetDROHTMLDataByName(tempArraySlice, 'Ending Inventory (Total)', MONTHLY_ENDINGINVENTORY, MONTHLY_ENDINGINVENTORYAMOUNT);
		monthlyDetailHTML += GetDROHTMLDataByName(tempArraySlice, 'Units Not Complete in Yard', UNITS_INCOMPLETE_IN_YARD, UNITS_INCOMPLETE_IN_YARD_AMOUNT);
		monthlyDetailHTML += emptyRow;
		
		monthlyDetailHTML += GetDROHTMLDataByName(tempArraySlice, 'Orders Received (current month)', MONTHLY_SALESORDERS, MONTHLY_SALESORDERSAMOUNT);	
		monthlyDetailHTML += GetDROHTMLDataByName(tempArraySlice, 'Orders Received Last MTD (@ month end)', MONTHLY_LAST_SALESORDERS, MONTHLY_LAST_SALESORDERSAMOUNT);	
		monthlyDetailHTML += GetDROHTMLDataByName(tempArraySlice, 'Orders Received (YTD)', MONTHLY_YTD_SALESORDERS, MONTHLY_YTD_SALESORDERSAMOUNT);	
		monthlyDetailHTML += GetDROHTMLDataByName(tempArraySlice, 'Orders Received Last YTD (@ month end)', MONTHLY_LASTYTD_SALESORDERS, MONTHLY_LASTYTD_SALESORDERSAMOUNT);	
		//Shipments area
		monthlyDetailHTML += emptyRow;
		monthlyDetailHTML += GetDROHTMLDataByName(tempArraySlice, 'Total Available to Ship', MONTHLY_TOTAL_TO_SHIP, MONTHLY_TOTAL_TO_SHIPAMOUNT);	
		monthlyDetailHTML += GetDROHTMLDataByName(tempArraySlice, 'Shipments MTD', MONTHLY_SHIPMENTS, MONTHLY_SHIPMENTSAMOUNT);	
		monthlyDetailHTML += GetDROHTMLDataByName(tempArraySlice, 'Total Left to Ship for Month', MONTHLY_LEFT_TO_SHIP, MONTHLY_LEFT_TO_SHIPAMOUNT);	
		monthlyDetailHTML += GetDROHTMLDataByName(tempArraySlice, 'Total Open Units for Month', MONTHLY_OPEN_UNITS, MONTHLY_OPEN_UNITSAMOUNT);
		monthlyDetailHTML += emptyRow;
		// Scheduled totals area
		monthlyDetailHTML += GetDROHTMLDataByName(tempArraySlice, 'Scheduled Opens', MONTHLY_SCHEDULED_OPENS, MONTHLY_SCHEDULED_OPENSAMOUNT);
		monthlyDetailHTML += GetDROHTMLDataByName(tempArraySlice, 'Scheduled Sold', MONTHLY_SCHEDULED_SOLD, MONTHLY_SCHEDULED_SOLDAMOUNT);
		monthlyDetailHTML += GetDROHTMLDataByName(tempArraySlice, 'Backlog', MONTHLY_BACKLOG, MONTHLY_BACKLOGAMOUNT);
		if (currentLength > chunk) // adds a space between daily object rows
			monthlyDetailHTML += emptyRow;
	}
	
			
	return monthlyDetailHTML;
}

/**
 * Returns the DRO registration html table row.
 * 
 * @returns {String}
 */
function GetDRORegHTML(droObjectArray, chunk, emptyRow)
{
	var droObjectArraylength = droObjectArray.length;
	var currentLength = droObjectArraylength;
	var regDetailHTML = '';

	// we create chunks of 4 series per row.
	for (var j = 0; j < droObjectArraylength; j += chunk)
	{
		var tempArraySlice = droObjectArray.slice(j,j+chunk);
		// build the top header row
		regDetailHTML += 
				'<tr>' + 
					'<td style="font-weight:bold;">' + 
						'<span>RETAIL </span><span>REGISTRATIONS:</span>' +
					'</td>';
		
		// get the list of series for the top header row
		for (var i=0; i<tempArraySlice.length; i++)
		{
			var droObject = tempArraySlice[i];
			
			regDetailHTML += 
				'<td style="font-weight:bold;" colspan="2">' + 
					droObject[SERIESTEXT] +
				'</td>';
		}
		
		regDetailHTML += '</tr>';
		
		// build the detail html data for the daily part of the html	
		regDetailHTML += GetDROHTMLDataByName(tempArraySlice, 'Daily (yesterday)', DAILY_REGISTRATIONS);
		regDetailHTML += GetDROHTMLDataByName(tempArraySlice, 'Month To Date', MONTHLY_REGISTRATIONS);
		regDetailHTML += GetDROHTMLDataByName(tempArraySlice, 'Last Year MTD', MONTHLY_LAST_YEAR_REGISTRATIONS);
		regDetailHTML += GetDROHTMLDataByName(tempArraySlice, 'Year To Date', YEARLY_REGISTRATIONS);
		regDetailHTML += GetDROHTMLDataByName(tempArraySlice, 'Last Year To Date', LAST_YEARLY_REGISTRATIONS);	
		if (currentLength > chunk) // adds a space between daily object rows
			regDetailHTML += emptyRow;
	}
	return regDetailHTML;
}

function toCurrency(num, c, d, t)
{
	var n = num, 
	    c = isNaN(c = Math.abs(c)) ? 2 : c, 
	    d = d == undefined ? "." : d, 
	    t = t == undefined ? "," : t, 
	    s = n < 0 ? "-" : "", 
	    i = parseInt(n = Math.abs(+n || 0).toFixed(c)) + "", 
	    j = (j = i.length) > 3 ? j % 3 : 0;
	   return s + (j ? i.substr(0, j) + t : "") + i.substr(j).replace(/(\d{3})(?=\d)/g, "$1" + t) + (c ? d + Math.abs(n - i).toFixed(c).slice(2) : "");
}; 
	 
/**
 * Returns the html data row given the object array, header, and field name.
 * 
 * @param droObjectArray
 * @param headerName
 * @param fieldName
 * @returns {String}
 */
function GetDROHTMLDataByName(droObjectArray, headerName, fieldName, amountFieldName)
{
	var detailHTML = 
		'<tr>' + 
			'<td>' + 
				nlapiEscapeXML(headerName) +
			'</td>';
	
	for (var i=0; i<droObjectArray.length; i++)
	{
		var droObject = droObjectArray[i];
		detailHTML += 
			'<td'+ (amountFieldName? '': ' colspan="2"') +'>' + 
			((fieldName in droObject) ? droObject[fieldName]: ' ') +
			'</td>';
		if(amountFieldName)
		{
			detailHTML += 
				'<td align="right">' + 
				((amountFieldName in droObject) ?  '$'+toCurrency(droObject[amountFieldName],0,' ',','): ' ') +
				'</td>';
		}
	}
	
	detailHTML += '</tr>';
	
	return detailHTML;
}

/**
 * Returns an object containing the DRO object by series.
 */
function GetDRODailyObjectArray(custparamReportDate)
{	
	var objectArray = new Array();
	
	// beginning inventory search
//	var filterExpression =	  [ 
//		                       	  [ 'custrecordunit_datecompleted', 'before', custparamReportDate ], 
//		                       	  'AND', 
//		                       	  [
//		                       	   		[ 'custrecordunit_shipdate', 'isempty', null ],
//		                       	   		'OR',
//		                       	   		[ 'custrecordunit_shipdate', 'onorafter', custparamReportDate ]
//		                       	  ]
//	                       	  ];
//	
//	var results = nlapiSearchRecord('customrecordrvsunit', 'customsearchrvs_drodailycount', filterExpression);
//	ProcessDROSearchResults(results, DAILY_BEGINNINGINVENTORY, objectArray, TYPE_DAILY, DAILY_BEGINNINGINVENTORYAMOUNT);
	
	// units produced search
//	filterExpression =	  [ 
//		                       	  [ 'custrecordunit_datecompleted', 'on', custparamReportDate ], 
//                       	  ];	
//	
//	results = nlapiSearchRecord('customrecordrvsunit', 'customsearchrvs_drodailycount', filterExpression);	
//	ProcessDROSearchResults(results, DAILY_UNITSPRODUCED, objectArray, TYPE_DAILY, DAILY_UNITSPRODUCEDAMOUNT);
//	
	// shipments search
	filterExpression =	  [ 
		                       	  [ 'custrecordunit_shipdate', 'on', custparamReportDate ], 
                       	  ];	
	
	results = nlapiSearchRecord('customrecordrvsunit', 'customsearchrvs_drodailycount', filterExpression);	
	ProcessDROSearchResults(results, DAILY_SHIPMENTS, objectArray, TYPE_DAILY, DAILY_SHIPMENTSAMOUNT);
	
	// units offline search
	filterExpression =	  [ 
		                       	  [ 'custrecordunit_actualofflinedate', 'on', custparamReportDate ], 
                       	  ];	
	
	results = nlapiSearchRecord('customrecordrvsunit', 'customsearchrvsdrooffline', filterExpression);	
	ProcessDROSearchResults(results, DAILY_UNITSOFFLINE, objectArray, TYPE_DAILY, DAILY_UNITSOFFLINEAMOUNT);
	
	// Sales Order search
	filterExpression =	  [ 
		                       	  [ 'custrecordunit_salesorder.custbodyrvsdealerorderdate', 'on', custparamReportDate ], 
		                       	  'AND',
		                       	  [ 'custrecordunit_dealer', 'noneof', GetRVSOpenLotDealer()]
                       	  ];	
	
	results = nlapiSearchRecord('customrecordrvsunit', 'customsearchrvsdrosalesordercount', filterExpression);	
	ProcessDROSearchResults(results, DAILY_SALESORDERS, objectArray, TYPE_DAILY, DAILY_SALESORDERSAMOUNT);
	
	
	// calculate the ending inventory
//	for (var i=0; i<objectArray.length; i++)
//	{
//		objectArray[i][DAILY_ENDINGINVENTORY] = 
//			objectArray[i][DAILY_BEGINNINGINVENTORY] + 
//			objectArray[i][DAILY_UNITSPRODUCED] - 
//			objectArray[i][DAILY_SHIPMENTS];
//		
//		objectArray[i][DAILY_ENDINGINVENTORYAMOUNT] = 
//			objectArray[i][DAILY_BEGINNINGINVENTORYAMOUNT] + 
//			objectArray[i][DAILY_UNITSPRODUCEDAMOUNT] - 
//			objectArray[i][DAILY_SHIPMENTSAMOUNT];
//	}
	
	return objectArray;
}

/**
 * Returns an object containing the DRO Monthly object by series.
 */
function GetDROMonthlyObjectArray(custparamReportDate)
{	
	var objectArray = new Array();
	
		// YTD Sales Order search
	// 6-9-2014 NAH: using "within" and the "thisfiscalyeartodate" or "lastfiscalyeartodate" doesn't work: the search just keeps running and eventually times out
	// [ 'custrecordunit_salesorder.custbodyrvsdealerorderdate', 'within', 'thisfiscalyeartodate' ],
//	var custparamReportDate = nlapiDateToString(nlapiAddDays(new Date(), -1));
//	var yesterdayLastMonth =  nlapiDateToString(nlapiAddMonths(custparamReportDate, -1));

	var thisYearFilters = new Array();
	thisYearFilters[thisYearFilters.length] = new nlobjSearchFilter('isquarter', null, 'is', 'F');
	thisYearFilters[thisYearFilters.length] = new nlobjSearchFilter('isyear', null, 'is', 'T');
	thisYearFilters[thisYearFilters.length] = new nlobjSearchFilter('startdate', null, 'onorbefore', custparamReportDate);
	thisYearFilters[thisYearFilters.length] = new nlobjSearchFilter('enddate', null, 'onorafter', custparamReportDate);

	var thisYearColumns = new Array();
	thisYearColumns[thisYearColumns.length] = new nlobjSearchColumn('isyear');
	thisYearColumns[thisYearColumns.length] = new nlobjSearchColumn('startdate');
	thisYearColumns[thisYearColumns.length] = new nlobjSearchColumn('enddate');

	var thisYearAccountingPeriod = nlapiSearchRecord('accountingperiod', null, thisYearFilters, thisYearColumns);

	var thisYearBeginning = thisYearAccountingPeriod[0].getValue('startdate');
	var d = new Date(custparamReportDate);
	d.setMonth(d.getMonth() - 12);
	var reportDateLastYear = nlapiDateToString(d);

	var lastYearFilters = new Array();
	lastYearFilters[lastYearFilters.length] = new nlobjSearchFilter('isquarter', null, 'is', 'F');
	lastYearFilters[lastYearFilters.length] = new nlobjSearchFilter('isyear', null, 'is', 'T');
	lastYearFilters[lastYearFilters.length] = new nlobjSearchFilter('startdate', null, 'onorbefore', reportDateLastYear);
	lastYearFilters[lastYearFilters.length] = new nlobjSearchFilter('enddate', null, 'onorafter', reportDateLastYear);

	var lastYearColumns = new Array();
	lastYearColumns[lastYearColumns.length] = new nlobjSearchColumn('isyear');
	lastYearColumns[lastYearColumns.length] = new nlobjSearchColumn('startdate');
	lastYearColumns[lastYearColumns.length] = new nlobjSearchColumn('enddate');

	var lastYearAccountingPeriod = nlapiSearchRecord('accountingperiod', null, lastYearFilters, lastYearColumns);

	//var lastYearBeginning = lastYearAccountingPeriod[0].getValue('startdate');
	//var lastYearEnd = lastYearAccountingPeriod[0].getValue('enddate');

	var thisYearAccountingPeriodStartDate = new Date(thisYearAccountingPeriod[0].getValue('startdate'));
	var lastYearAccountingPeriodStartDateByThisYear = new Date(thisYearAccountingPeriod[0].getValue('startdate'));
	lastYearAccountingPeriodStartDateByThisYear.setFullYear(lastYearAccountingPeriodStartDateByThisYear.getFullYear() - 1);
	var thisYearAccountingPeriodEndDate = new Date(thisYearAccountingPeriod[0].getValue('enddate'));

	var currentMonthFilters = new Array();
	currentMonthFilters[currentMonthFilters.length] = new nlobjSearchFilter('isquarter', null, 'is', 'F');
	currentMonthFilters[currentMonthFilters.length] = new nlobjSearchFilter('isyear', null, 'is', 'F');
	currentMonthFilters[currentMonthFilters.length] = new nlobjSearchFilter('startdate', null, 'onorbefore', custparamReportDate);
	currentMonthFilters[currentMonthFilters.length] = new nlobjSearchFilter('enddate', null, 'onorafter', custparamReportDate);

	var currentMonthColumns = new Array();
	currentMonthColumns[currentMonthColumns.length] = new nlobjSearchColumn('isyear');
	currentMonthColumns[currentMonthColumns.length] = new nlobjSearchColumn('startdate');
	currentMonthColumns[currentMonthColumns.length] = new nlobjSearchColumn('enddate');

	var currentMonthAccountingPeriod = nlapiSearchRecord('accountingperiod', null, currentMonthFilters, currentMonthColumns);

	var currentMonthAccountingPeriodStartDate = new Date(currentMonthAccountingPeriod[0].getValue('startdate'));
	var lastYearThisMonthAccountingPeriodStartDateByThisMonth = new Date(currentMonthAccountingPeriod[0].getValue('startdate'));
	lastYearThisMonthAccountingPeriodStartDateByThisMonth.setFullYear(lastYearThisMonthAccountingPeriodStartDateByThisMonth.getFullYear() - 1);

	var currentMonthAccountingPeriodEndDate = new Date(currentMonthAccountingPeriod[0].getValue('enddate'));
	var lastYearThisMonthAccountingPeriodEndDateByThisMonth = new Date(currentMonthAccountingPeriod[0].getValue('enddate'));
	lastYearThisMonthAccountingPeriodEndDateByThisMonth.setFullYear(lastYearThisMonthAccountingPeriodEndDateByThisMonth.getFullYear() - 1);
	nlapiLogExecution('debug', 'line 501', currentMonthAccountingPeriod[0].getValue('startdate'));
	var dateWithinLastMonthAccountingPeriod = nlapiDateToString(nlapiAddDays(currentMonthAccountingPeriodStartDate, - 1));
	nlapiLogExecution('debug', dateWithinLastMonthAccountingPeriod);
	var lastMonthFilters = new Array();
	lastMonthFilters[lastMonthFilters.length] = new nlobjSearchFilter('isquarter', null, 'is', 'F');
	lastMonthFilters[lastMonthFilters.length] = new nlobjSearchFilter('isyear', null, 'is', 'F');
	lastMonthFilters[lastMonthFilters.length] = new nlobjSearchFilter('startdate', null, 'onorbefore', dateWithinLastMonthAccountingPeriod);
	lastMonthFilters[lastMonthFilters.length] = new nlobjSearchFilter('enddate', null, 'onorafter', dateWithinLastMonthAccountingPeriod);

	var lastMonthColumns = new Array();
	lastMonthColumns[lastMonthColumns.length] = new nlobjSearchColumn('isyear');
	lastMonthColumns[lastMonthColumns.length] = new nlobjSearchColumn('startdate');
	lastMonthColumns[lastMonthColumns.length] = new nlobjSearchColumn('enddate');

	var lastMonthAccountingPeriod = nlapiSearchRecord('accountingperiod', null, lastMonthFilters, lastMonthColumns);

	var lastYearThisMonthFilters = new Array();
	lastYearThisMonthFilters[lastYearThisMonthFilters.length] = new nlobjSearchFilter('isquarter', null, 'is', 'F');
	lastYearThisMonthFilters[lastYearThisMonthFilters.length] = new nlobjSearchFilter('isyear', null, 'is', 'F');
	lastYearThisMonthFilters[lastYearThisMonthFilters.length] = new nlobjSearchFilter('startdate', null, 'onorbefore', reportDateLastYear);
	lastYearThisMonthFilters[lastYearThisMonthFilters.length] = new nlobjSearchFilter('enddate', null, 'onorafter', reportDateLastYear);

	var lastYearThisMonthColumns = new Array();
	lastYearThisMonthColumns[lastYearThisMonthColumns.length] = new nlobjSearchColumn('isyear');
	lastYearThisMonthColumns[lastYearThisMonthColumns.length] = new nlobjSearchColumn('startdate');
	lastYearThisMonthColumns[lastYearThisMonthColumns.length] = new nlobjSearchColumn('enddate');

	var lastYearThisMonthAccountingPeriod = nlapiSearchRecord('accountingperiod', null, lastYearThisMonthFilters, lastYearThisMonthColumns);

	var filterExpression = '';
	// beginning inventory search
	filterExpression =	  [ 
		                       	  [ 'custrecordunit_actualofflinedate', 'before', currentMonthAccountingPeriod[0].getValue('startdate') ], 
		                       	  'AND', 
		                       	  [
		                       	   		[ 'custrecordunit_shipdate', 'isempty', null ],
		                       	   		'OR',
		                       	   		[ 'custrecordunit_shipdate', 'after', currentMonthAccountingPeriod[0].getValue('startdate') ]
		                       	  ]
	                       	  ];
	
	var results = nlapiSearchRecord('customrecordrvsunit', 'customsearchrvs_drodailycount', filterExpression);
	ProcessDROSearchResults(results, MONTHLY_BEGINNINGINVENTORY, objectArray, TYPE_MONTHLY, MONTHLY_BEGINNINGINVENTORYAMOUNT);
	
	// units produced search
//	filterExpression =	  [ 
//		                       	  [ 'custrecordunit_datecompleted', 'within', 'thismonthtodate' ], 
//                       	  ];	
//	
//	results = nlapiSearchRecord('customrecordrvsunit', 'customsearchrvs_drodailycount', filterExpression);	
//	ProcessDROSearchResults(results, MONTHLY_UNITSPRODUCED, objectArray, TYPE_MONTHLY, MONTHLY_UNITSPRODUCEDAMOUNT);
	
	// shipments search
	filterExpression =	  [ 
		                       	  [ 'custrecordunit_shipdate', 'onorafter', currentMonthAccountingPeriod[0].getValue('startdate') ], 
		                       	  'AND',
		                       	  [ 'custrecordunit_shipdate', 'onorbefore', custparamReportDate ]
                       	  ];	
	
	results = nlapiSearchRecord('customrecordrvsunit', 'customsearchrvs_drodailycount', filterExpression);	
	ProcessDROSearchResults(results, MONTHLY_SHIPMENTS, objectArray, TYPE_MONTHLY, MONTHLY_SHIPMENTSAMOUNT);
	
	// units offline search
	filterExpression =	  [ 
		                       	  [ 'custrecordunit_actualofflinedate', 'onorafter', currentMonthAccountingPeriod[0].getValue('startdate') ],
		                       	  'AND',
		                       	  [ 'custrecordunit_actualofflinedate', 'onorbefore', custparamReportDate ] 
                       	  ];	
	
	results = nlapiSearchRecord('customrecordrvsunit', 'customsearchrvsdrooffline', filterExpression);	
	ProcessDROSearchResults(results, MONTHLY_UNITSOFFLINE, objectArray, TYPE_MONTHLY, MONTHLY_UNITSOFFLINEAMOUNT);
	
	// Sales Order search
	filterExpression =	  [ 
		                       	  [ 'custrecordunit_salesorder.custbodyrvsdealerorderdate', 'onorafter', currentMonthAccountingPeriod[0].getValue('startdate') ], 
		                       	  'AND',
		                       	  [ 'custrecordunit_salesorder.custbodyrvsdealerorderdate', 'onorbefore', custparamReportDate], 
		                       	  'AND',
		                       	  [ 'custrecordunit_dealer', 'noneof', GetRVSOpenLotDealer()]
                       	  ];	
											   
	results = nlapiSearchRecord('customrecordrvsunit', 'customsearchrvsdrosalesordercount', filterExpression);	
	ProcessDROSearchResults(results, MONTHLY_SALESORDERS, objectArray, TYPE_MONTHLY, MONTHLY_SALESORDERSAMOUNT);
	
	// Last Month Sales Order search
	filterExpression =	  [ 
		                       	  [ 'custrecordunit_salesorder.custbodyrvsdealerorderdate', 'onorafter', lastMonthAccountingPeriod[0].getValue('startdate') ],
		                       	  'AND',
		                       	  [ 'custrecordunit_salesorder.custbodyrvsdealerorderdate', 'onorbefore', lastMonthAccountingPeriod[0].getValue('enddate') ],
		                       	  'AND',
		                       	  [ 'custrecordunit_dealer', 'noneof', GetRVSOpenLotDealer()]
                       	  ];	
											   
	results = nlapiSearchRecord('customrecordrvsunit', 'customsearchrvsdrosalesordercount', filterExpression);	
	ProcessDROSearchResults(results, MONTHLY_LAST_SALESORDERS, objectArray, TYPE_MONTHLY, MONTHLY_LAST_SALESORDERSAMOUNT);
	
	
	filterExpression =	  [ 
		                       	  [ 'custrecordunit_salesorder.custbodyrvsdealerorderdate', 'onorafter', thisYearBeginning ],
		                       	  'AND',
		                       	  [ 'custrecordunit_salesorder.custbodyrvsdealerorderdate', 'onorbefore', custparamReportDate ],
		                       	  'AND',
		                       	  [ 'custrecordunit_dealer', 'noneof', GetRVSOpenLotDealer()]
                       	  ];	
											   
	results = nlapiSearchRecord('customrecordrvsunit', 'customsearchrvsdrosalesordercount', filterExpression);	
	ProcessDROSearchResults(results, MONTHLY_YTD_SALESORDERS, objectArray, TYPE_MONTHLY, MONTHLY_YTD_SALESORDERSAMOUNT);
	
	// Last YTD Sales Order search
	// 6-9-2014 NAH: using "within" and the "thisfiscalyeartodate" or "lastfiscalyeartodate" doesn't work: the search just keeps running and eventually times out
	// [ 'custrecordunit_salesorder.custbodyrvsdealerorderdate', 'within', 'lastfiscalyeartodate' ],
	filterExpression =	  [ 
		                       	  [ 'custrecordunit_salesorder.custbodyrvsdealerorderdate', 'onorafter', nlapiDateToString(lastYearAccountingPeriodStartDateByThisYear) ],
		                       	  'AND',
		                       	  [ 'custrecordunit_salesorder.custbodyrvsdealerorderdate', 'onorbefore', lastYearThisMonthAccountingPeriodEndDateByThisMonth ],
		                       	  'AND',
		                       	  [ 'custrecordunit_dealer', 'noneof', GetRVSOpenLotDealer()]
                       	  ];	
	
	results = nlapiSearchRecord('customrecordrvsunit', 'customsearchrvsdrosalesordercount', filterExpression);	
	ProcessDROSearchResults(results, MONTHLY_LASTYTD_SALESORDERS, objectArray, TYPE_MONTHLY, MONTHLY_LASTYTD_SALESORDERSAMOUNT);
	
	// units not complete in yard
	filterExpression =	  [ 
			                  	  [
		                      	   		[ 'custrecordunit_actualofflinedate', 'isnotempty', null ], 
		                      	   		'AND',
		                      	    	[ 'custrecordunit_actualofflinedate', 'onorbefore', custparamReportDate ]
		                      	  ],		                       	 
		                       	 'AND', 
		                       	  [
		                       	   		[ 'custrecordunit_datecompleted', 'isempty', null ],
		                       	   		'OR',
		                       	   		[ 'custrecordunit_datecompleted', 'after', custparamReportDate ]
		                       	  ]
                       	  ];	
	
	results = nlapiSearchRecord('customrecordrvsunit', 'customsearchrvsdrooffline', filterExpression);	
	ProcessDROSearchResults(results, UNITS_INCOMPLETE_IN_YARD, objectArray, TYPE_DAILY, UNITS_INCOMPLETE_IN_YARD_AMOUNT);
	
	// Current Month Open Unit Sales Order search
	filterExpression =	  [ 
	                  	   	   [
	                    	     [
			                       	  [ 'custrecordunit_datecompleted', 'before', currentMonthAccountingPeriod[0].getValue('startdate') ], 
			                       	  'AND', 
			                       	  [
			                       	   		[ 'custrecordunit_shipdate', 'isempty', null ],
			                       	   		'OR',
			                       	   		[ 'custrecordunit_shipdate', 'onorafter', currentMonthAccountingPeriod[0].getValue('startdate') ]
			                       	  ]
			                      ],
			                      'OR',
			                      [
			                       		[ 'custrecordunit_offlinedate', 'onorafter', currentMonthAccountingPeriod[0].getValue('startdate')  ],
			                       		'AND', 
			                       		[ 'custrecordunit_offlinedate', 'onorbefore', currentMonthAccountingPeriod[0].getValue('enddate')  ],
			                      ]
	                    	   ],
	                	       'AND', 
	                	       [ 'custrecordunit_salesorder.mainline', 'is', 'true' ],
	                   	       'AND',
	                    	   [ 'custrecordunit_dealer', 'anyof', GetRVSOpenLotDealer()]
	                 	  ];
	
											   
	results = nlapiSearchRecord('customrecordrvsunit', 'customsearchrvsdrosalesordercount', filterExpression);	
	ProcessDROSearchResults(results, MONTHLY_OPEN_UNITS, objectArray, TYPE_MONTHLY, MONTHLY_OPEN_UNITSAMOUNT);
	
	
	// Available To Ship
	filterExpression =	  [ 
	                      	      [
		                      	     [
				                       	  [ 'custrecordunit_actualofflinedate', 'before', currentMonthAccountingPeriod[0].getValue('startdate') ], 
				                       	  'AND', 
				                       	  [
				                       	   		[ 'custrecordunit_shipdate', 'isempty', null ],
				                       	   		'OR',
				                       	   		[ 'custrecordunit_shipdate', 'onorafter', currentMonthAccountingPeriod[0].getValue('startdate') ]
				                       	  ]
				                      ],
				                      'OR',
				                      [
				                       		[ 'custrecordunit_offlinedate', 'onorafter', currentMonthAccountingPeriod[0].getValue('startdate') ],
				                       		'AND',
				                       		[ 'custrecordunit_offlinedate', 'onorbefore', currentMonthAccountingPeriod[0].getValue('enddate') ]
				                      ]
		                      	   ],
	                      	       'AND', 
	                      	       [ 'custrecordunit_salesorder.mainline', 'is', 'true' ]
	                       	  ];
	
	var results = nlapiSearchRecord('customrecordrvsunit', 'customsearchrvs_drodailycount', filterExpression);
	ProcessDROSearchResults(results, MONTHLY_TOTAL_TO_SHIP, objectArray, TYPE_MONTHLY, MONTHLY_TOTAL_TO_SHIPAMOUNT);
	
	// Scheduled Opens - scheduled (sched offline date assigned) but not built and assigned to OPEN dealer
	filterExpression =	  [ 
	                  	   	   [
	                    	     [
	                    	      		[ 'custrecordunit_actualofflinedate', 'isempty', null ],
										'OR',
										[ 'custrecordunit_actualofflinedate', 'onorafter', custparamReportDate ]
			                      ],
			                      'AND',
			                      [
			                       		[ 'custrecordunit_offlinedate', 'isnotempty', null ]
			                      ]
	                    	   ],
	                	       'AND', 
	                	       [ 'custrecordunit_salesorder.mainline', 'is', 'true' ],
	                   	       'AND',
	                    	   [ 'custrecordunit_dealer', 'anyof', GetRVSOpenLotDealer()]
	                 	  ];
	
											   
	results = nlapiSearchRecord('customrecordrvsunit', 'customsearchrvsdrosalesordercount', filterExpression);	
	ProcessDROSearchResults(results, MONTHLY_SCHEDULED_OPENS, objectArray, TYPE_MONTHLY, MONTHLY_SCHEDULED_OPENSAMOUNT);
	
	// Scheduled Sold - scheduled (sched offline date assigned) but not built and assigned to real dealer
	filterExpression =	  [ 
	                  	   	   [
	                    	     [
	                    	      		[ 'custrecordunit_actualofflinedate', 'isempty', null ],
										'OR',
										[ 'custrecordunit_actualofflinedate', 'onorafter', custparamReportDate ]
			                      ],
			                      'AND',
			                      [
			                       		[ 'custrecordunit_offlinedate', 'isnotempty', null ]
			                      ]
	                    	   ],
	                	       'AND', 
	                	       [ 'custrecordunit_salesorder.mainline', 'is', 'true' ],
	                   	       'AND',
	                    	   [ 'custrecordunit_dealer', 'noneof', GetRVSOpenLotDealer()]
	                 	  ];
	
											   
	results = nlapiSearchRecord('customrecordrvsunit', 'customsearchrvsdrosalesordercount', filterExpression);	
	ProcessDROSearchResults(results, MONTHLY_SCHEDULED_SOLD, objectArray, TYPE_MONTHLY, MONTHLY_SCHEDULED_SOLDAMOUNT);
	
	// Backlog - real orders (not opens) that are not scheduled (no sched offline date)
	filterExpression =	  [ 
	                  	   	   [
	                    	     [
	                    	      		[ 'custrecordunit_actualofflinedate', 'isempty', null ],
										'OR',
										[ 'custrecordunit_actualofflinedate', 'onorafter', custparamReportDate ]
			                      ],
			                      'AND',
			                      [
			                       		[ 'custrecordunit_offlinedate', 'isempty', null ]			                       		
			                      ]
	                    	   ],
	                	       'AND', 
	                	       [ 'custrecordunit_salesorder.mainline', 'is', 'true' ],
	                   	       'AND',
	                    	   [ 'custrecordunit_dealer', 'noneof', GetRVSOpenLotDealer()]
	                 	  ];
	
											   
	results = nlapiSearchRecord('customrecordrvsunit', 'customsearchrvsdrosalesordercount', filterExpression);	
	ProcessDROSearchResults(results, MONTHLY_BACKLOG, objectArray, TYPE_MONTHLY, MONTHLY_BACKLOGAMOUNT);
	
	// calculate the ending inventory and Left To Ship
	for (var i=0; i<objectArray.length; i++)
	{
		// ending inventory
		objectArray[i][MONTHLY_ENDINGINVENTORY] = 
			(objectArray[i][MONTHLY_BEGINNINGINVENTORY] + 
			objectArray[i][MONTHLY_UNITSOFFLINE] - 
			objectArray[i][MONTHLY_SHIPMENTS]) || '';
		
		objectArray[i][MONTHLY_ENDINGINVENTORYAMOUNT] = 
			(objectArray[i][MONTHLY_BEGINNINGINVENTORYAMOUNT] + 
			objectArray[i][MONTHLY_UNITSOFFLINEAMOUNT] - 
			objectArray[i][MONTHLY_SHIPMENTSAMOUNT]) || '';
		
		// left to ship
		objectArray[i][MONTHLY_LEFT_TO_SHIP] = 
			(objectArray[i][MONTHLY_TOTAL_TO_SHIP] - 
			objectArray[i][MONTHLY_SHIPMENTS]) || '';
		
		objectArray[i][MONTHLY_LEFT_TO_SHIPAMOUNT] = 
			(objectArray[i][MONTHLY_TOTAL_TO_SHIPAMOUNT] - 
			objectArray[i][MONTHLY_SHIPMENTSAMOUNT]) || '';
	}
	
	return objectArray;
}

/**
 * Returns an object containing the DRO Registrations object by series.
 */
function GetDRORegistrationsObjectArray(custparamReportDate)
{	
	var objectArray = new Array();
	
//	var custparamReportDate = nlapiDateToString(nlapiAddDays(new Date(), -1));
	var d = new Date(custparamReportDate);
	d.setMonth(d.getMonth() - 12);
	var reportDateLastYear = nlapiDateToString(d);

	var thisYearFilters = new Array();
	thisYearFilters[thisYearFilters.length] = new nlobjSearchFilter('isquarter', null, 'is', 'F');
	thisYearFilters[thisYearFilters.length] = new nlobjSearchFilter('isyear', null, 'is', 'T');
	thisYearFilters[thisYearFilters.length] = new nlobjSearchFilter('startdate', null, 'onorbefore', custparamReportDate);
	thisYearFilters[thisYearFilters.length] = new nlobjSearchFilter('enddate', null, 'onorafter', custparamReportDate);

	var thisYearColumns = new Array();
	thisYearColumns[thisYearColumns.length] = new nlobjSearchColumn('isyear');
	thisYearColumns[thisYearColumns.length] = new nlobjSearchColumn('startdate');
	thisYearColumns[thisYearColumns.length] = new nlobjSearchColumn('enddate');

	var thisYearAccountingPeriod = nlapiSearchRecord('accountingperiod', null, thisYearFilters, thisYearColumns);

	var thisYearAccountingPeriodStartDate = new Date(thisYearAccountingPeriod[0].getValue('startdate'));
	var lastYearAccountingPeriodStartDateByThisYear = new Date(thisYearAccountingPeriod[0].getValue('startdate'));
	lastYearAccountingPeriodStartDateByThisYear.setFullYear(lastYearAccountingPeriodStartDateByThisYear.getFullYear() - 1);
	var thisYearAccountingPeriodEndDate = new Date(thisYearAccountingPeriod[0].getValue('enddate'));

	var currentMonthFilters = new Array();
	currentMonthFilters[currentMonthFilters.length] = new nlobjSearchFilter('isquarter', null, 'is', 'F');
	currentMonthFilters[currentMonthFilters.length] = new nlobjSearchFilter('isyear', null, 'is', 'F');
	currentMonthFilters[currentMonthFilters.length] = new nlobjSearchFilter('startdate', null, 'onorbefore', custparamReportDate);
	currentMonthFilters[currentMonthFilters.length] = new nlobjSearchFilter('enddate', null, 'onorafter', custparamReportDate);

	var currentMonthColumns = new Array();
	currentMonthColumns[currentMonthColumns.length] = new nlobjSearchColumn('isyear');
	currentMonthColumns[currentMonthColumns.length] = new nlobjSearchColumn('startdate');
	currentMonthColumns[currentMonthColumns.length] = new nlobjSearchColumn('enddate');

	var currentMonthAccountingPeriod = nlapiSearchRecord('accountingperiod', null, currentMonthFilters, currentMonthColumns);

	var currentMonthAccountingPeriodStartDate = new Date(currentMonthAccountingPeriod[0].getValue('startdate'));
	var lastYearThisMonthAccountingPeriodStartDateByThisMonth = new Date(currentMonthAccountingPeriod[0].getValue('startdate'));
	lastYearThisMonthAccountingPeriodStartDateByThisMonth.setFullYear(lastYearThisMonthAccountingPeriodStartDateByThisMonth.getFullYear() - 1);

	var currentMonthAccountingPeriodEndDate = new Date(currentMonthAccountingPeriod[0].getValue('enddate'));
	var lastYearThisMonthAccountingPeriodEndDateByThisMonth = new Date(currentMonthAccountingPeriod[0].getValue('enddate'));
	lastYearThisMonthAccountingPeriodEndDateByThisMonth.setFullYear(lastYearThisMonthAccountingPeriodEndDateByThisMonth.getFullYear() - 1);

	var lastYearThisMonthFilters = new Array();
	lastYearThisMonthFilters[lastYearThisMonthFilters.length] = new nlobjSearchFilter('isquarter', null, 'is', 'F');
	lastYearThisMonthFilters[lastYearThisMonthFilters.length] = new nlobjSearchFilter('isyear', null, 'is', 'F');
	lastYearThisMonthFilters[lastYearThisMonthFilters.length] = new nlobjSearchFilter('startdate', null, 'onorbefore', reportDateLastYear);
	lastYearThisMonthFilters[lastYearThisMonthFilters.length] = new nlobjSearchFilter('enddate', null, 'onorafter', reportDateLastYear);

	var lastYearThisMonthColumns = new Array();
	lastYearThisMonthColumns[lastYearThisMonthColumns.length] = new nlobjSearchColumn('isyear');
	lastYearThisMonthColumns[lastYearThisMonthColumns.length] = new nlobjSearchColumn('startdate');
	lastYearThisMonthColumns[lastYearThisMonthColumns.length] = new nlobjSearchColumn('enddate');

	var lastYearThisMonthAccountingPeriod = nlapiSearchRecord('accountingperiod', null, lastYearThisMonthFilters, lastYearThisMonthColumns);

	// Registrations entered yesterday
	filterExpression =	  [ 
		                       	  [ 'custrecordunitretailcustomer_unit.created', 'on', custparamReportDate ], 
                       	  ];	
	
	results = nlapiSearchRecord('customrecordrvsunit', 'customsearchrvs_droregistrtions', filterExpression);	
	ProcessDROSearchResults(results, DAILY_REGISTRATIONS, objectArray, TYPE_REG);
	
	// Registrations entered month to date
	filterExpression =	  [ 
		                       	  [ 'custrecordunitretailcustomer_unit.created', 'onorafter', currentMonthAccountingPeriod[0].getValue('startdate') ], 
		                       	  'AND',
		                       	  [ 'custrecordunitretailcustomer_unit.created', 'onorbefore', custparamReportDate ]
                       	  ];	
	
	results = nlapiSearchRecord('customrecordrvsunit', 'customsearchrvs_droregistrtions', filterExpression);	
	ProcessDROSearchResults(results, MONTHLY_REGISTRATIONS, objectArray, TYPE_REG);
	
	// Registrations entered last year MTD
	filterExpression =	  [ 
		                       	  [ 'custrecordunitretailcustomer_unit.created', 'onorafter', nlapiDateToString(lastYearThisMonthAccountingPeriodStartDateByThisMonth) ], 
		                       	  'AND',
		                       	  [ 'custrecordunitretailcustomer_unit.created', 'onorbefore', reportDateLastYear ]
                       	  ];	
	
	results = nlapiSearchRecord('customrecordrvsunit', 'customsearchrvs_droregistrtions', filterExpression);	
	ProcessDROSearchResults(results, MONTHLY_LAST_YEAR_REGISTRATIONS, objectArray, TYPE_REG);
	
	// Registrations YTD
	filterExpression =	  [ 
		                       	  [ 'custrecordunitretailcustomer_unit.created', 'onorafter', thisYearAccountingPeriodStartDate ], 
		                       	  'AND',
		                       	  [ 'custrecordunitretailcustomer_unit.created', 'onorbefore', custparamReportDate ],
                       	  ];	
	
	results = nlapiSearchRecord('customrecordrvsunit', 'customsearchrvs_droregistrtions', filterExpression);	
	ProcessDROSearchResults(results, YEARLY_REGISTRATIONS, objectArray, TYPE_REG);
	
	// Registrations Last YTD
	filterExpression =	  [ 
		                       	  [ 'custrecordunitretailcustomer_unit.created', 'onorafter', nlapiDateToString(lastYearAccountingPeriodStartDateByThisYear) ], 
		                       	  'AND',
		                       	  [ 'custrecordunitretailcustomer_unit.created', 'onorbefore', reportDateLastYear ]
                       	  ];	
	
	results = nlapiSearchRecord('customrecordrvsunit', 'customsearchrvs_droregistrtions', filterExpression);	
	ProcessDROSearchResults(results, LAST_YEARLY_REGISTRATIONS, objectArray, TYPE_REG);
	
		
	return objectArray;
}

/**
 * Processes the DRO Search Results given the results object, field name, and objectArray
 * 
 * @param results
 * @param fieldName
 * @param objectArray
 */
function ProcessDROSearchResults(results, fieldName, objectArray, type, amountFieldName)
{
	// go through all the results and pull the grouped unit count for the series
	// add that to the object array
	if (results != null)
	{
		for (var i=0; i<results.length; i++)
		{
			var unitCount = results[i].getValue('name', null, 'count') || 0;
			var seriesId = results[i].getValue('custrecordunit_series', null, 'group');
			var seriesText = results[i].getText('custrecordunit_series', null, 'group');
			var amount = results[i].getValue('amount', 'custrecordunit_salesorder', 'sum') || 0;
			var object;
			switch(type)
			{
			case TYPE_DAILY:
				object = GetObjectFromArray(objectArray, seriesId, seriesText);
				break;
			case TYPE_MONTHLY:
				object = GetMonthlyObjectFromArray(objectArray, seriesId, seriesText);
				break;
			case TYPE_REG:
				object = GetRegObjectFromArray(objectArray, seriesId, seriesText);
				break;	
			default:
				object = null;
			}
			
			object[fieldName] = parseInt(unitCount); 
			if(amountFieldName)
				object[amountFieldName] = parseFloat(amount);
		}
	}
}

/**
 * Returns the Daily DRO object based on the seriesId and the array being passed in.
 * If no object exists for the series already, then create one.
 * 
 * @param objectArray
 * @param seriesId
 */
function GetObjectFromArray(objectArray, seriesId, seriesText)
{
	for (var j=0; j<objectArray.length; j++)
	{
		var object = objectArray[j];
		
		if (object[SERIESID] == seriesId)
		{
			return object;
		}
	}
	
	var object = new Array();
	object[SERIESID] = seriesId;
	object[SERIESTEXT] = nlapiEscapeXML(seriesText);
	
	// set the defaults to 0
	//object[DAILY_BEGINNINGINVENTORY] = 0;
	//object[DAILY_UNITSPRODUCED] = 0;
	object[DAILY_SHIPMENTS] = 0;
	//object[DAILY_ENDINGINVENTORY] = 0;
	object[DAILY_SALESORDERS] = 0;
	object[DAILY_UNITSOFFLINE] = 0;
	//set amount columns to 0
	//object[DAILY_BEGINNINGINVENTORYAMOUNT] = 0;
	//object[DAILY_UNITSPRODUCEDAMOUNT] = 0;
	object[DAILY_SHIPMENTSAMOUNT] = 0;
	//object[DAILY_ENDINGINVENTORYAMOUNT] = 0;
	object[DAILY_SALESORDERSAMOUNT] = 0;
	object[DAILY_UNITSOFFLINEAMOUNT] = 0;
	
	objectArray[objectArray.length] = object;
	return object;
}

/**
 * Returns the monthly dro object based on the seriesId and the array being passed in.
 * If no object exists for the series already, then create one.
 * 
 * @param objectArray
 * @param seriesId
 */
function GetMonthlyObjectFromArray(objectArray, seriesId, seriesText)
{
	for (var j=0; j<objectArray.length; j++)
	{
		var object = objectArray[j];
		
		if (object[SERIESID] == seriesId)
		{
			return object;
		}
	}
	
	var object = new Array();
	object[SERIESID] = seriesId;
	object[SERIESTEXT] = nlapiEscapeXML(seriesText);
	
	// set the defaults to 0
	object[MONTHLY_BEGINNINGINVENTORY] = 0;
	//object[MONTHLY_UNITSPRODUCED] = 0;
	object[MONTHLY_SHIPMENTS] = 0;
	object[MONTHLY_ENDINGINVENTORY] = 0;
	object[UNITS_INCOMPLETE_IN_YARD] = 0;
	object[MONTHLY_UNITSOFFLINE] = 0;
	object[MONTHLY_SALESORDERS] = 0;
	object[MONTHLY_LAST_SALESORDERS] = 0;
	object[MONTHLY_YTD_SALESORDERS] = 0;
	object[MONTHLY_LASTYTD_SALESORDERS] = 0;	
	object[MONTHLY_TOTAL_TO_SHIP] = '0';
	object[MONTHLY_LEFT_TO_SHIP] = '0';	
	object[MONTHLY_OPEN_UNITS] = 0;
	object[MONTHLY_SCHEDULED_OPENS] = 0;
	object[MONTHLY_SCHEDULED_SOLD] = 0;
	object[MONTHLY_BACKLOG] = 0;
	
	// set default amounts to 0
	object[MONTHLY_BEGINNINGINVENTORYAMOUNT] = 0;
	//object[MONTHLY_UNITSPRODUCEDAMOUNT] = 0;
	object[MONTHLY_SHIPMENTSAMOUNT] = 0;
	object[MONTHLY_ENDINGINVENTORYAMOUNT] = 0;
	object[UNITS_INCOMPLETE_IN_YARD_AMOUNT] = 0;
	object[MONTHLY_UNITSOFFLINEAMOUNT] = 0;
	object[MONTHLY_SALESORDERSAMOUNT] = 0;
	object[MONTHLY_LAST_SALESORDERSAMOUNT] = 0;
	object[MONTHLY_YTD_SALESORDERSAMOUNT] = 0;
	object[MONTHLY_LASTYTD_SALESORDERSAMOUNT] = 0;	
	object[MONTHLY_TOTAL_TO_SHIPAMOUNT] = 0;
	object[MONTHLY_LEFT_TO_SHIPAMOUNT] = 0;	
	object[MONTHLY_OPEN_UNITSAMOUNT] = 0;
	object[MONTHLY_SCHEDULED_OPENSAMOUNT] = 0;
	object[MONTHLY_SCHEDULED_SOLDAMOUNT] = 0;
	object[MONTHLY_BACKLOGAMOUNT] = 0;
	
	objectArray[objectArray.length] = object;
	return object;
}
/**
 * Returns the registraitions dro object based on the seriesId and the array being passed in.
 * If no object exists for the series already, then create one.
 * 
 * @param objectArray
 * @param seriesId
 */
function GetRegObjectFromArray(objectArray, seriesId, seriesText)
{
	for (var j=0; j<objectArray.length; j++)
	{
		var object = objectArray[j];
		
		if (object[SERIESID] == seriesId)
		{
			return object;
		}
	}
	
	var object = new Array();
	object[SERIESID] = seriesId;
	object[SERIESTEXT] = nlapiEscapeXML(seriesText);
	
	var DAILY_REGISTRATIONS = 'dailyRegistrations';
	var MONTHLY_REGISTRATIONS = 'monthlyRegistrations';
	var MONTHLY_LAST_YEAR_REGISTRATIONS = 'lastYearRegistrations';
	var YEARLY_REGISTRATIONS = 'yearToDateRegistrations';	
	var LAST_YEARLY_REGISTRATIONS = 'lastYearToDateRegistrations';
	
	// set the defaults to 0
	object[DAILY_REGISTRATIONS] = 0;
	object[MONTHLY_REGISTRATIONS] = 0;
	object[MONTHLY_LAST_YEAR_REGISTRATIONS] = 0;
	object[YEARLY_REGISTRATIONS] = 0;
	object[LAST_YEARLY_REGISTRATIONS] = 0;
		
	objectArray[objectArray.length] = object;
	return object;
}
