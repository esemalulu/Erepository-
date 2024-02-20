/**
 * Module Description
 *
 * Version    Date            Author           Remarks
 * 1.00       2 1 2019     Jeffrey Bajit		GD version of DRO printout organized by sub-series
 *
 */

// ARRAY CONSTANTS
var SUBSERIESID = 'seriesId';
var SUBSERIESTEXT = 'seriesText';
// OBJECT TYPE CONSTANTS
var  TYPE_DAILY = 1;
var  TYPE_MONTHLY = 2;
var  TYPE_REG = 3;
// Daily fields
var DAILY_SHIPMENTS = 'dailyShipments';
var DAILY_UNITSOFFLINE = 'dailyUnitsOffline';
var DAILY_SALESORDERS = 'dailySalesOrders';

var DAILY_SHIPMENTSAMOUNT = 'dailyShipmentsAmount';
var DAILY_UNITSOFFLINEAMOUNT = 'dailyUnitsOfflineAmount';
var DAILY_SALESORDERSAMOUNT = 'dailySalesOrdersAmount';
// Monthly Fields
var MONTHLY_BEGINNINGINVENTORY = 'monthlyBeginningInventory';
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
function GD_DROSubSeriesSuitelet(request, response)
{
	if (request.getMethod() == 'GET') {
		var form = nlapiCreateForm('Daily Dashboard Operations Report' , false);

		var field = form.addField('custpage_reportdate', 'date', 'Report Date', null, null);
		field.setLayoutType('startrow');
		var custparamReportDate = request.getParameter('custparam_reportdate') || '';
		var custparam_PrintLayoutLandscape = request.getParameter('custparam_printlayoutlandscape') || 'T';  // the default value is 'T' since it can only be undefined or null if this is the first time the page is loaded.
		// Adding this feature so GD can print on legal size paper if needed.
		var custparam_PrintLegalSize = request.getParameter('custparam_printlegalsize') || 'T';  // the default value is 'T' since it can only be undefined or null if this is the first time the page is loaded.

		var isLandscapeField = form.addField('custpage_reportprintlayoutoption', 'checkbox', 'Print Landscape', null, null); // This field was added as a switch for landscape or portrait
		isLandscapeField.setDefaultValue(custparam_PrintLayoutLandscape);
		isLandscapeField.setLayoutType('startrow', 'startcol');
		var isLegalSizeField = form.addField('custpage_reportprintsizeoption', 'checkbox', 'Print Size Legal', null, null); // This field was added as a switch for Legal or letter size.
		isLegalSizeField.setDefaultValue(custparam_PrintLegalSize);
		isLegalSizeField.setLayoutType('startrow');
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

			var chunk = 7;



			// set up an empty row with a colspan of the number of series plus 1
			// the number of series is the number of elements in the array
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

			// check what is set on the check boxes and set the size and orientation accordingly.
			var sizeAndOrientation = ''
			var legalOrLetterSize = custparam_PrintLegalSize == 'T' ? 'Legal' : 'Letter';
			sizeAndOrientation = 'size:' + legalOrLetterSize;
			if (custparam_PrintLayoutLandscape == 'T')
				sizeAndOrientation += '-landscape;';

			// build the HTML object to be passed into the Suitelet
			var html = '<head>' +
					'<macrolist>' +
						'<macro id="pageHeader">' +
							'<table width="100%" align="right">' +
								'<tr>' +
									'<td width="100%" align="right">Page <pagenumber/> of <totalpages/></td>' +
								'</tr>' +
							'</table>' +
						'</macro>' +
					'</macrolist>' +
				'</head>' +
				'<body padding=".1in .1in .1in .1in" style="font-size:10pt; font-family:sans-serif; ' + sizeAndOrientation + '" header="pageHeader" header-height=".1in">' +
					headerHTML +
					'<br />' +
					dataHTML +
				'</body>';

			PrintPDFInSuiteLet(request, response, 'DRO-BySubSeries.pdf', html);
		} else {
			form.addSubmitButton('Generate Report');
			response.writePage(form);
		}
	} else { // POST
		var parameters = new Object();
		parameters.custparam_reportdate = request.getParameter('custpage_reportdate');
		// The check box values can be null, if that is the case set it to F as it is most likely unchecked.  This is the case on suitelet forms for check boxes.
		parameters.custparam_printlayoutlandscape = request.getParameter('custpage_reportprintlayoutoption') || 'F';  // this parameter is solely for switching between portrait or landscape on the printout
		parameters.custparam_printlegalsize = request.getParameter('custpage_reportprintsizeoption') || 'F';    // this parameter is solely for switching between legal or letter size on the printout.

		nlapiSetRedirectURL('SUITELET', 'customscriptgd_dro_bysubseriesprintsuite', 'customdeploygd_dro_bysubseriesprintsuite', false, parameters);
	}
}

/**
 * Returns the DRO daily html table row.
 *
 * @returns {String}
 */
function GetDRODailyHTML(droObjectArray, chunk, emptyRow)
{
	droObjectArray.sort(function(a, b){
		return parseInt(a['mainSeriesIdSort']) - parseInt(b['mainSeriesIdSort']);
	});
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
					droObject['mainSeriesText'] + ':<br />' + droObject[SUBSERIESTEXT] +
				'</td>';
		}

		dailyDetailHTML += '</tr>';

		// build the detail html data for the daily part of the html
		dailyDetailHTML += GetDROHTMLDataByName(tempArraySlice, 'Units Produced (Offline)', DAILY_UNITSOFFLINE, DAILY_UNITSOFFLINEAMOUNT);
		dailyDetailHTML += GetDROHTMLDataByName(tempArraySlice, 'Shipments', DAILY_SHIPMENTS, DAILY_SHIPMENTSAMOUNT);
		dailyDetailHTML += GetDROHTMLDataByName(tempArraySlice, 'Orders Received', DAILY_SALESORDERS, DAILY_SALESORDERSAMOUNT);
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
	droObjectArray.sort(function(a, b){
		return parseInt(a['mainSeriesIdSort']) - parseInt(b['mainSeriesIdSort']);
	});
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
					droObject['mainSeriesText'] + ':<br />' + droObject[SUBSERIESTEXT] +
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
 * @param droObjectArray
 * @param chunk
 * @param emptyRow
 *
 * @returns {String}
 */
function GetDRORegHTML(droObjectArray, chunk, emptyRow)
{
	droObjectArray.sort(function(a, b){
		return parseInt(a['mainSeriesIdSort']) - parseInt(b['mainSeriesIdSort']);
	});
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
						'<span><p align="left">RETAIL REGISTRATIONS:</p></span>' +
					'</td>';

		// get the list of series for the top header row
		for (var i=0; i<tempArraySlice.length; i++)
		{
			var droObject = tempArraySlice[i];

			regDetailHTML +=
				'<td style="font-weight:bold;" colspan="2">' +
					droObject['mainSeriesText'] + ':<br />' + droObject[SUBSERIESTEXT] +
				'</td>';
		}

		regDetailHTML += '</tr>';

		// build the detail html data for the daily part of the html
		regDetailHTML += GetDROHTMLDataByName(tempArraySlice, 'Daily yesterday', DAILY_REGISTRATIONS);
		regDetailHTML += GetDROHTMLDataByName(tempArraySlice, 'Month To Date', MONTHLY_REGISTRATIONS);
		regDetailHTML += GetDROHTMLDataByName(tempArraySlice, 'Last Year MTD', MONTHLY_LAST_YEAR_REGISTRATIONS);
		regDetailHTML += GetDROHTMLDataByName(tempArraySlice, 'Year To Date', YEARLY_REGISTRATIONS);
		regDetailHTML += GetDROHTMLDataByName(tempArraySlice, 'Last Year To Date', LAST_YEARLY_REGISTRATIONS);
		if (currentLength > chunk) // adds a space between daily object rows
			regDetailHTML += emptyRow;
	}
	return regDetailHTML;
}

/*
 * helper method converting num to currentcy.
 */
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
				'<p align="left">' + nlapiEscapeXML(headerName) + '</p>' +
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
 * Returns an object containing the DRO object by sub-series.
 *
 * @param custparamReportDate
 */
function GetDRODailyObjectArray(custparamReportDate)
{
	var objectArray = new Array();

	// shipments search
	var filterExpression =	  [
		                       	  [ 'custrecordunit_shipdate', 'on', custparamReportDate ],
                       	  ];

	var results = nlapiSearchRecord('customrecordrvsunit', 'customsearchrvs_drodailycount', filterExpression, [new nlobjSearchColumn('custitemgd_subseries', 'custrecordunit_model', 'group'), new nlobjSearchColumn('custitemgd_subseries', 'custrecordunit_model', 'group').setSort()]);
	ProcessDROSearchResults(results, DAILY_SHIPMENTS, objectArray, TYPE_DAILY, DAILY_SHIPMENTSAMOUNT);

	// units offline search
	filterExpression =	  [
		                       	  [ 'custrecordunit_actualofflinedate', 'on', custparamReportDate ],
                       	  ];

	results = nlapiSearchRecord('customrecordrvsunit', 'customsearchrvsdrooffline', filterExpression, [new nlobjSearchColumn('custitemgd_subseries', 'custrecordunit_model', 'group'), new nlobjSearchColumn('custitemgd_subseries', 'custrecordunit_model', 'group').setSort()]);
	ProcessDROSearchResults(results, DAILY_UNITSOFFLINE, objectArray, TYPE_DAILY, DAILY_UNITSOFFLINEAMOUNT);

	// Sales Order search
	filterExpression =	  [
		                       	  [ 'custrecordunit_salesorder.custbodyrvsdealerorderdate', 'on', custparamReportDate ],
		                       	  'AND',
		                       	  [ 'custrecordunit_dealer', 'noneof', GetRVSOpenLotDealer()]
                       	  ];

	results = nlapiSearchRecord('customrecordrvsunit', 'customsearchrvsdrosalesordercount', filterExpression, [new nlobjSearchColumn('custitemgd_subseries', 'custrecordunit_model', 'group'), new nlobjSearchColumn('custitemgd_subseries', 'custrecordunit_model', 'group').setSort()]);
	ProcessDROSearchResults(results, DAILY_SALESORDERS, objectArray, TYPE_DAILY, DAILY_SALESORDERSAMOUNT);


	// calculate the ending inventory
	return objectArray;
}

/**
 * Returns an object containing the DRO Monthly object by sub-series.
 */
function GetDROMonthlyObjectArray(custparamReportDate)
{
	var objectArray = new Array();

		// YTD Sales Order search
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

	var dateWithinLastMonthAccountingPeriod = nlapiDateToString(nlapiAddDays(currentMonthAccountingPeriodStartDate, - 1));

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

	var results = nlapiSearchRecord('customrecordrvsunit', 'customsearchrvs_drodailycount', filterExpression, [(new nlobjSearchColumn('custitemgd_subseries', 'custrecordunit_model', 'group')).setSort(), (new nlobjSearchColumn('custitemgd_subseries', 'custrecordunit_model', 'group')).setSort()]);
	ProcessDROSearchResults(results, MONTHLY_BEGINNINGINVENTORY, objectArray, TYPE_MONTHLY, MONTHLY_BEGINNINGINVENTORYAMOUNT);

	// shipments search
	filterExpression =	  [
		                       	  [ 'custrecordunit_shipdate', 'onorafter', currentMonthAccountingPeriod[0].getValue('startdate') ],
		                       	  'AND',
		                       	  [ 'custrecordunit_shipdate', 'onorbefore', custparamReportDate ]
                       	  ];

	results = nlapiSearchRecord('customrecordrvsunit', 'customsearchrvs_drodailycount', filterExpression, [(new nlobjSearchColumn('custitemgd_subseries', 'custrecordunit_model', 'group')).setSort(), (new nlobjSearchColumn('custitemgd_subseries', 'custrecordunit_model', 'group')).setSort()]);
	ProcessDROSearchResults(results, MONTHLY_SHIPMENTS, objectArray, TYPE_MONTHLY, MONTHLY_SHIPMENTSAMOUNT);

	// units offline search
	filterExpression =	  [
		                       	  [ 'custrecordunit_actualofflinedate', 'onorafter', currentMonthAccountingPeriod[0].getValue('startdate') ],
		                       	  'AND',
		                       	  [ 'custrecordunit_actualofflinedate', 'onorbefore', custparamReportDate ]
                       	  ];

	results = nlapiSearchRecord('customrecordrvsunit', 'customsearchrvsdrooffline', filterExpression, [(new nlobjSearchColumn('custitemgd_subseries', 'custrecordunit_model', 'group')).setSort(), (new nlobjSearchColumn('custitemgd_subseries', 'custrecordunit_model', 'group')).setSort()]);
	ProcessDROSearchResults(results, MONTHLY_UNITSOFFLINE, objectArray, TYPE_MONTHLY, MONTHLY_UNITSOFFLINEAMOUNT);

	// Sales Order search
	filterExpression =	  [
		                       	  [ 'custrecordunit_salesorder.custbodyrvsdealerorderdate', 'onorafter', currentMonthAccountingPeriod[0].getValue('startdate') ],
		                       	  'AND',
		                       	  [ 'custrecordunit_salesorder.custbodyrvsdealerorderdate', 'onorbefore', custparamReportDate],
		                       	  'AND',
		                       	  [ 'custrecordunit_dealer', 'noneof', GetRVSOpenLotDealer()]
                       	  ];

	results = nlapiSearchRecord('customrecordrvsunit', 'customsearchrvsdrosalesordercount', filterExpression, [(new nlobjSearchColumn('custitemgd_subseries', 'custrecordunit_model', 'group')).setSort(), (new nlobjSearchColumn('custitemgd_subseries', 'custrecordunit_model', 'group')).setSort()]);
	ProcessDROSearchResults(results, MONTHLY_SALESORDERS, objectArray, TYPE_MONTHLY, MONTHLY_SALESORDERSAMOUNT);

	// Last Month Sales Order search
	filterExpression =	  [
		                       	  [ 'custrecordunit_salesorder.custbodyrvsdealerorderdate', 'onorafter', lastMonthAccountingPeriod[0].getValue('startdate') ],
		                       	  'AND',
		                       	  [ 'custrecordunit_salesorder.custbodyrvsdealerorderdate', 'onorbefore', lastMonthAccountingPeriod[0].getValue('enddate') ],
		                       	  'AND',
		                       	  [ 'custrecordunit_dealer', 'noneof', GetRVSOpenLotDealer()]
                       	  ];

	results = nlapiSearchRecord('customrecordrvsunit', 'customsearchrvsdrosalesordercount', filterExpression, [(new nlobjSearchColumn('custitemgd_subseries', 'custrecordunit_model', 'group')).setSort(), (new nlobjSearchColumn('custitemgd_subseries', 'custrecordunit_model', 'group')).setSort()]);
	ProcessDROSearchResults(results, MONTHLY_LAST_SALESORDERS, objectArray, TYPE_MONTHLY, MONTHLY_LAST_SALESORDERSAMOUNT);


	filterExpression =	  [
		                       	  [ 'custrecordunit_salesorder.custbodyrvsdealerorderdate', 'onorafter', thisYearBeginning ],
		                       	  'AND',
		                       	  [ 'custrecordunit_salesorder.custbodyrvsdealerorderdate', 'onorbefore', custparamReportDate ],
		                       	  'AND',
		                       	  [ 'custrecordunit_dealer', 'noneof', GetRVSOpenLotDealer()]
                       	  ];

	results = nlapiSearchRecord('customrecordrvsunit', 'customsearchrvsdrosalesordercount', filterExpression, [(new nlobjSearchColumn('custitemgd_subseries', 'custrecordunit_model', 'group')).setSort(), (new nlobjSearchColumn('custitemgd_subseries', 'custrecordunit_model', 'group')).setSort()]);
	ProcessDROSearchResults(results, MONTHLY_YTD_SALESORDERS, objectArray, TYPE_MONTHLY, MONTHLY_YTD_SALESORDERSAMOUNT);

	// Last YTD Sales Order search
	filterExpression =	  [
		                       	  [ 'custrecordunit_salesorder.custbodyrvsdealerorderdate', 'onorafter', nlapiDateToString(lastYearAccountingPeriodStartDateByThisYear) ],
		                       	  'AND',
		                       	  [ 'custrecordunit_salesorder.custbodyrvsdealerorderdate', 'onorbefore', lastYearThisMonthAccountingPeriodEndDateByThisMonth ],
		                       	  'AND',
		                       	  [ 'custrecordunit_dealer', 'noneof', GetRVSOpenLotDealer()]
                       	  ];

	results = nlapiSearchRecord('customrecordrvsunit', 'customsearchrvsdrosalesordercount', filterExpression, [(new nlobjSearchColumn('custitemgd_subseries', 'custrecordunit_model', 'group')).setSort(), (new nlobjSearchColumn('custitemgd_subseries', 'custrecordunit_model', 'group')).setSort()]);
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

	results = nlapiSearchRecord('customrecordrvsunit', 'customsearchrvsdrooffline', filterExpression, [(new nlobjSearchColumn('custitemgd_subseries', 'custrecordunit_model', 'group')).setSort(), (new nlobjSearchColumn('custitemgd_subseries', 'custrecordunit_model', 'group')).setSort()]);
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


	results = nlapiSearchRecord('customrecordrvsunit', 'customsearchrvsdrosalesordercount', filterExpression, [(new nlobjSearchColumn('custitemgd_subseries', 'custrecordunit_model', 'group')).setSort(), (new nlobjSearchColumn('custitemgd_subseries', 'custrecordunit_model', 'group')).setSort()]);
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

	var results = nlapiSearchRecord('customrecordrvsunit', 'customsearchrvs_drodailycount', filterExpression, [(new nlobjSearchColumn('custitemgd_subseries', 'custrecordunit_model', 'group')).setSort(), (new nlobjSearchColumn('custitemgd_subseries', 'custrecordunit_model', 'group')).setSort()]);
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


	results = nlapiSearchRecord('customrecordrvsunit', 'customsearchrvsdrosalesordercount', filterExpression, [(new nlobjSearchColumn('custitemgd_subseries', 'custrecordunit_model', 'group')).setSort(), (new nlobjSearchColumn('custitemgd_subseries', 'custrecordunit_model', 'group')).setSort()]);
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


	results = nlapiSearchRecord('customrecordrvsunit', 'customsearchrvsdrosalesordercount', filterExpression, [(new nlobjSearchColumn('custitemgd_subseries', 'custrecordunit_model', 'group')).setSort(), (new nlobjSearchColumn('custitemgd_subseries', 'custrecordunit_model', 'group')).setSort()]);
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


	results = nlapiSearchRecord('customrecordrvsunit', 'customsearchrvsdrosalesordercount', filterExpression, [(new nlobjSearchColumn('custitemgd_subseries', 'custrecordunit_model', 'group')).setSort(), (new nlobjSearchColumn('custitemgd_subseries', 'custrecordunit_model', 'group')).setSort()]);
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

	objectArray.sort(function(a, b){return parseInt(a.mainSeriesIdSort) + 2 * parseInt(b.mainSeriesIdSort);});

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
	var filterExpression =	  [
		                       	  [ 'custrecordunit_receiveddate', 'on', custparamReportDate ], //TODO
                       	  ];

	var results = nlapiSearchRecord('customrecordrvsunit', 'customsearchrvs_droregistrtions', filterExpression, [(new nlobjSearchColumn('custitemgd_subseries', 'custrecordunit_model', 'group')).setSort(), (new nlobjSearchColumn('custitemgd_subseries', 'custrecordunit_model', 'group')).setSort()]);
	ProcessDROSearchResults(results, DAILY_REGISTRATIONS, objectArray, TYPE_REG);

	// Registrations entered month to date
	filterExpression =	  [
		                       	  [ 'custrecordunit_receiveddate', 'onorafter', currentMonthAccountingPeriod[0].getValue('startdate') ],
		                       	  'AND',
		                       	  [ 'custrecordunit_receiveddate', 'onorbefore', custparamReportDate ]
                       	  ];

	results = nlapiSearchRecord('customrecordrvsunit', 'customsearchrvs_droregistrtions', filterExpression, [(new nlobjSearchColumn('custitemgd_subseries', 'custrecordunit_model', 'group')).setSort(), (new nlobjSearchColumn('custitemgd_subseries', 'custrecordunit_model', 'group')).setSort()]);
	ProcessDROSearchResults(results, MONTHLY_REGISTRATIONS, objectArray, TYPE_REG);

	// Registrations entered last year MTD
	filterExpression =	  [
		                       	  [ 'custrecordunit_receiveddate', 'onorafter', nlapiDateToString(lastYearThisMonthAccountingPeriodStartDateByThisMonth) ],
		                       	  'AND',
		                       	  [ 'custrecordunit_receiveddate', 'onorbefore', reportDateLastYear ]
                       	  ];

	results = nlapiSearchRecord('customrecordrvsunit', 'customsearchrvs_droregistrtions', filterExpression, [(new nlobjSearchColumn('custitemgd_subseries', 'custrecordunit_model', 'group')).setSort(), (new nlobjSearchColumn('custitemgd_subseries', 'custrecordunit_model', 'group')).setSort()]);
	ProcessDROSearchResults(results, MONTHLY_LAST_YEAR_REGISTRATIONS, objectArray, TYPE_REG);

	// Registrations YTD
	filterExpression =	  [
							[ 'custrecordunit_receiveddate', 'onorafter', thisYearAccountingPeriodStartDate ],
							'AND',
							[ 'custrecordunit_receiveddate', 'onorbefore', custparamReportDate ],
                       	  ];

	results = nlapiSearchRecord('customrecordrvsunit', 'customsearchrvs_droregistrtions', filterExpression, [(new nlobjSearchColumn('custitemgd_subseries', 'custrecordunit_model', 'group')).setSort(), (new nlobjSearchColumn('custitemgd_subseries', 'custrecordunit_model', 'group')).setSort()]);
	ProcessDROSearchResults(results, YEARLY_REGISTRATIONS, objectArray, TYPE_REG);

	// Registrations Last YTD
	filterExpression =	  [
							[ 'custrecordunit_receiveddate', 'onorafter', nlapiDateToString(lastYearAccountingPeriodStartDateByThisYear) ],
							'AND',
							[ 'custrecordunit_receiveddate', 'onorbefore', reportDateLastYear ]
                       	  ];

	results = nlapiSearchRecord('customrecordrvsunit', 'customsearchrvs_droregistrtions', filterExpression, [(new nlobjSearchColumn('custitemgd_subseries', 'custrecordunit_model', 'group')).setSort(), (new nlobjSearchColumn('custitemgd_subseries', 'custrecordunit_model', 'group')).setSort()]);
	ProcessDROSearchResults(results, LAST_YEARLY_REGISTRATIONS, objectArray, TYPE_REG);

	return objectArray;
}

/**
 * Processes the DRO Search Results given the results object, field name, and objectArray
 *
 * @param results
 * @param fieldName
 * @param objectArray
 * @param type
 * @param amountFieldName
 */
function ProcessDROSearchResults(results, fieldName, objectArray, type, amountFieldName)
{
	// go through all the results and pull the grouped unit count for the SUBSERIESID	// add that to the object array
	if (results != null)
	{
		for (var i=0; i<results.length; i++)
		{
			var unitCount = results[i].getValue('name', null, 'count') || 0;
			var seriesId = results[i].getValue('custrecordunit_series', null, 'group');
			var subSeriesId = results[i].getValue('custitemgd_subseries', 'custrecordunit_model', 'group') || '';
			var seriesOrSubSeriesId = seriesId + subSeriesId;
			var seriesOrSubSeriesText = results[i].getText('custitemgd_subseries', 'custrecordunit_model', 'group') || '';
			var seriesText = results[i].getText('custrecordunit_series', null, 'group');
			if (subSeriesId == '') {
				seriesOrSubSeriesText = '';
			}
			var amount = results[i].getValue('amount', 'custrecordunit_salesorder', 'sum') || 0;
			var object;
			switch(type)
			{
			case TYPE_DAILY:
				object = GetObjectFromArray(objectArray, seriesOrSubSeriesId, seriesOrSubSeriesText, seriesId, seriesText);
				break;
			case TYPE_MONTHLY:
				object = GetMonthlyObjectFromArray(objectArray, seriesOrSubSeriesId, seriesOrSubSeriesText, seriesId, seriesText);
				break;
			case TYPE_REG:
				object = GetRegObjectFromArray(objectArray, seriesOrSubSeriesId, seriesOrSubSeriesText, seriesId, seriesText);
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
 * Returns the Daily DRO object based on the subSeriesId and the array being passed in.
 * If no object exists for the series already, then create one.
 *
 * @param objectArray
 * @param subSeriesId
 * @param subSeriesText
 */
function GetObjectFromArray(objectArray, seriesOrSubSeriesId, seriesOrSubSeriesText, seriesId, seriesText)
{
	for (var j=0; j<objectArray.length; j++)
	{
		var object = objectArray[j];

		if (object[SUBSERIESID] == seriesOrSubSeriesId)
		{
			return object;
		}
	}

	var object = new Array();
	object[SUBSERIESID] = seriesOrSubSeriesId;
	object[SUBSERIESTEXT] = nlapiEscapeXML(seriesOrSubSeriesText);
	object['mainSeriesIdSort'] = seriesId;
	object['mainSeriesText'] = seriesText;

	// set the defaults to 0
	object[DAILY_SHIPMENTS] = 0;
	object[DAILY_SALESORDERS] = 0;
	object[DAILY_UNITSOFFLINE] = 0;
	//set amount columns to 0
	object[DAILY_SHIPMENTSAMOUNT] = 0;
	object[DAILY_SALESORDERSAMOUNT] = 0;
	object[DAILY_UNITSOFFLINEAMOUNT] = 0;

	objectArray[objectArray.length] = object;
	return object;
}

/**
 * Returns the monthly dro object based on the subSeriesId and the array being passed in.
 * If no object exists for the series already, then create one.
 *
 * @param objectArray
 * @param subSeriesId
 * @param subSeriesText
 */
function GetMonthlyObjectFromArray(objectArray, seriesOrSubSeriesId, seriesOrSubSeriesText, seriesId, seriesText)
{
	for (var j=0; j<objectArray.length; j++)
	{
		var object = objectArray[j];

		if (object[SUBSERIESID] == seriesOrSubSeriesId)
		{
			return object;
		}
	}

	var object = new Array();
	object[SUBSERIESID] = seriesOrSubSeriesId;
	object[SUBSERIESTEXT] = nlapiEscapeXML(seriesOrSubSeriesText);
	object['mainSeriesIdSort'] = seriesId;
	object['mainSeriesText'] = seriesText;

	// set the defaults to 0
	object[MONTHLY_BEGINNINGINVENTORY] = 0;
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
 * Returns the registraitions dro object based on the subseriesId and the array being passed in.
 * If no object exists for the series already, then create one.
 *
 * @param objectArray
 * @param subSeriesId
 * @param subSeriesText
 */
function GetRegObjectFromArray(objectArray, seriesOrSubSeriesId, seriesOrSubSeriesText, seriesId, seriesText)
{
	for (var j=0; j<objectArray.length; j++)
	{
		var object = objectArray[j];

		if (object[SUBSERIESID] == seriesOrSubSeriesId)
		{
			return object;
		}
	}

	var object = new Array();
	object[SUBSERIESID] = seriesOrSubSeriesId;
	object[SUBSERIESTEXT] = nlapiEscapeXML(seriesOrSubSeriesText);
	object['mainSeriesIdSort'] = seriesId;
	object['mainSeriesText'] = seriesText;

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
