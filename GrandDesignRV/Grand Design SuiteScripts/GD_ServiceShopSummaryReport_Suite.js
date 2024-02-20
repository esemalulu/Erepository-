/**
 * Suitelet that generates the Service Shop Summary Report in Excel.
 * 
 * Version    Date            Author           Remarks
 * 1.00       18 Oct 2017     Jacob Shetler
 *
 */

var STAGE_COMPLETE = '3';
var PAYMENTTYPE_WARRANTY = '1';
var PAYMENTTYPE_CUSTOMER = '2';
var PAYMENTTYPE_INSURANCE = '3';
var PAYMENTTYPE_GOODWILL = '4';


/**
 * Suitelet that generates the Service Shop Summary Report in Excel.
 * 
 * @param {nlobjRequest} request Request object
 * @param {nlobjResponse} response Response object
 * @returns {Void} Any output is written via response object
 */
function GD_ServiceSummaryReport_Suite(request, response)
{
	if(request.getMethod() == 'GET')
	{
		//Create a form with a date range.
		var form = nlapiCreateForm('Service Shop Summary Report');
		form.addFieldGroup('custpage_mainfg', 'Select a date range to run the report. Then click "Download."').setSingleColumn(true);
		form.addField('custpage_startdate', 'date', 'Start Date', null, 'custpage_mainfg').setMandatory(true).setDefaultValue(nlapiDateToString(nlapiAddDays(new Date(), -30)));
		form.addField('custpage_enddate', 'date', 'End Date', null, 'custpage_mainfg').setMandatory(true).setDefaultValue(nlapiDateToString(new Date()));
		form.addSubmitButton('Download');
		response.writePage(form);
	}
	else if(request.getMethod() == 'POST')
	{
		var startDate = request.getParameter('custpage_startdate');
		var endDate = request.getParameter('custpage_enddate');
		
		//Get the data to include in the report.
		var summaryObj = GD_ServiceSummaryReport_GetDataForDateRange(startDate, endDate);
		
		//Create the XLS to download and download the file.
		var xml = GD_GenerateServiceSummaryReportXLS(summaryObj, startDate, endDate);
		ExportExcelInSuiteLet(request, response, xml, 'Service Shop Summary Report - ' + startDate.replace(/\//g, '-') + ' to ' + endDate.replace(/\//g, '-') + '.xls');
	}
}

/**
 * Returns all data needed to create the Service Shop Summary Report for the given date range.
 * 
 * @param {String} startDate Start date of the date range.
 * @param {String} endDate End date of the date range.
 * @returns {Object}
 */
function GD_ServiceSummaryReport_GetDataForDateRange(startDate, endDate)
{
	//Build the object to return from the function.
	var summaryObj = {
			warranty: {
				numClaims: 0,
				laborHours: 0,
				laborDollars: 0,
				costOfLabor: 0,
				partsDollars: 0,
				costOfParts: 0,
				salesTax: 0,
				totalDollars: 0,
				grossProfit: 0
			},
			retail: {
				numClaims: 0,
				laborHours: 0,
				laborDollars: 0,
				costOfLabor: 0,
				partsDollars: 0,
				costOfParts: 0,
				salesTax: 0,
				totalDollars: 0,
				grossProfit: 0
			},
			internal: {
				numClaims: 0,
				laborHours: 0,
				laborDollars: 0,
				costOfLabor: 0,
				partsDollars: 0,
				costOfParts: 0,
				salesTax: 0,
				totalDollars: 0,
				grossProfit: 0
			}
//			total: {
//				numClaims: 0,
//				laborHours: 0,
//				laborDollars: 0,
//				costOfLabor: 0,
//				partsDollars: 0,
//				costOfParts: 0,
//				salesTax: 0,
//				totalDollars: 0,
//				grossProfit: 0
//			}
	};
	
	//Get information from the operation lines
	var baseOpLineFilters = [new nlobjSearchFilter('custrecordsrv_swo_stage', null, 'anyof', [STAGE_COMPLETE])];
	if(startDate == endDate)
	{
		baseOpLineFilters.push(new nlobjSearchFilter('custrecordsrv_swo_startdate', null, 'on', startDate));
	}
	else
	{
		baseOpLineFilters.push(new nlobjSearchFilter('custrecordsrv_swo_startdate', null, 'onorafter', startDate));
		baseOpLineFilters.push(new nlobjSearchFilter('custrecordsrv_swo_startdate', null, 'onorbefore', endDate));
	}
	var opLineCols = [new nlobjSearchColumn('internalid', null, 'COUNT').setSort(),
                      new nlobjSearchColumn('custrecordsrv_opline_time','CUSTRECORDSRV_OPLINE_SWO','SUM'), 
                      new nlobjSearchColumn('custrecordsrv_opline_amt','CUSTRECORDSRV_OPLINE_SWO','SUM'), 
                      new nlobjSearchColumn('formulanumeric', null, 'SUM').setFormula('{CUSTRECORDSRV_OPLINE_SWO.custrecordsrv_opline_time}*40')];
	var opLineWarrantyFilters = baseOpLineFilters.concat([new nlobjSearchFilter('custrecordsrv_opline_paymenttype', 'custrecordsrv_opline_swo', 'is', PAYMENTTYPE_WARRANTY)]);
	var opLineWarrantyResults = nlapiSearchRecord('customrecordsrv_serviceworkorder', null, opLineWarrantyFilters, opLineCols);
	if(opLineWarrantyResults != null && opLineWarrantyResults.length > 0)
	{
		summaryObj.warranty.numClaims = ConvertNSFieldToFloat(opLineWarrantyResults[0].getValue('internalid', null, 'COUNT'));
		summaryObj.warranty.laborHours = ConvertNSFieldToFloat(opLineWarrantyResults[0].getValue('custrecordsrv_opline_time','CUSTRECORDSRV_OPLINE_SWO','SUM'));
		summaryObj.warranty.laborDollars = ConvertNSFieldToFloat(opLineWarrantyResults[0].getValue('custrecordsrv_opline_amt','CUSTRECORDSRV_OPLINE_SWO','SUM'));
		summaryObj.warranty.costOfLabor = ConvertNSFieldToFloat(opLineWarrantyResults[0].getValue('formulanumeric', null, 'SUM'));
	}
	var opLineRetailFilters = baseOpLineFilters.concat([new nlobjSearchFilter('custrecordsrv_opline_paymenttype', 'custrecordsrv_opline_swo', 'anyof', [PAYMENTTYPE_CUSTOMER, PAYMENTTYPE_INSURANCE])]);
	var opLineRetailResults = nlapiSearchRecord('customrecordsrv_serviceworkorder', null, opLineRetailFilters, opLineCols);
	if(opLineRetailResults != null && opLineRetailResults.length > 0)
	{
		summaryObj.retail.numClaims = ConvertNSFieldToFloat(opLineRetailResults[0].getValue('internalid', null, 'COUNT'));
		summaryObj.retail.laborHours = ConvertNSFieldToFloat(opLineRetailResults[0].getValue('custrecordsrv_opline_time','CUSTRECORDSRV_OPLINE_SWO','SUM'));
		summaryObj.retail.laborDollars = ConvertNSFieldToFloat(opLineRetailResults[0].getValue('custrecordsrv_opline_amt','CUSTRECORDSRV_OPLINE_SWO','SUM'));
		summaryObj.retail.costOfLabor = ConvertNSFieldToFloat(opLineRetailResults[0].getValue('formulanumeric', null, 'SUM'));
	}
	var opLineInternalFilters = baseOpLineFilters.concat([new nlobjSearchFilter('custrecordsrv_opline_paymenttype', 'custrecordsrv_opline_swo', 'is', PAYMENTTYPE_GOODWILL)]);
	var opLineInternalResults = nlapiSearchRecord('customrecordsrv_serviceworkorder', null, opLineInternalFilters, opLineCols);
	if(opLineInternalResults != null && opLineInternalResults.length > 0)
	{
		summaryObj.internal.numClaims = ConvertNSFieldToFloat(opLineInternalResults[0].getValue('internalid', null, 'COUNT'));
		summaryObj.internal.laborHours = ConvertNSFieldToFloat(opLineInternalResults[0].getValue('custrecordsrv_opline_time','CUSTRECORDSRV_OPLINE_SWO','SUM'));
		summaryObj.internal.laborDollars = ConvertNSFieldToFloat(opLineInternalResults[0].getValue('custrecordsrv_opline_amt','CUSTRECORDSRV_OPLINE_SWO','SUM'));
		summaryObj.internal.costOfLabor = ConvertNSFieldToFloat(opLineInternalResults[0].getValue('formulanumeric', null, 'SUM'));
	}
	
	//Get information from the Part lines.
	var basePartLineFilters = [new nlobjSearchFilter('custrecordsrv_swo_stage', 'custrecordsrv_partline_swo', 'anyof', [STAGE_COMPLETE])];
	if(startDate == endDate)
	{
		basePartLineFilters.push(new nlobjSearchFilter('custrecordsrv_swo_startdate', 'custrecordsrv_partline_swo', 'on', startDate));
	}
	else
	{
		basePartLineFilters.push(new nlobjSearchFilter('custrecordsrv_swo_startdate', 'custrecordsrv_partline_swo', 'onorafter', startDate));
		basePartLineFilters.push(new nlobjSearchFilter('custrecordsrv_swo_startdate', 'custrecordsrv_partline_swo', 'onorbefore', endDate));
	}
	var partLineCols = [new nlobjSearchColumn('custrecordsrv_partline_amt',null,'SUM').setSort(),
	                    new nlobjSearchColumn('formulanumeric',null,'SUM').setFormula('{custrecordsrv_partline_item.averagecost}*{custrecordsrv_partline_qty}')];
	var partLineWarrantyFilters = basePartLineFilters.concat([new nlobjSearchFilter('custrecordsrv_opline_paymenttype', 'custrecordsrv_partline_opline', 'is', PAYMENTTYPE_WARRANTY)]);
	var partLineWarrantyResults = nlapiSearchRecord('customrecordsrv_partline', null, partLineWarrantyFilters, partLineCols);
	if(partLineWarrantyResults != null && partLineWarrantyResults.length > 0)
	{
		summaryObj.warranty.partsDollars = ConvertNSFieldToFloat(partLineWarrantyResults[0].getValue('custrecordsrv_partline_amt',null,'SUM'));
		summaryObj.warranty.costOfParts = ConvertNSFieldToFloat(partLineWarrantyResults[0].getValue('formulanumeric',null,'SUM'));
	}
	var partLineRetailFilters = basePartLineFilters.concat([new nlobjSearchFilter('custrecordsrv_opline_paymenttype', 'custrecordsrv_partline_opline', 'anyof', [PAYMENTTYPE_CUSTOMER, PAYMENTTYPE_INSURANCE])]);
	var partLineRetailResults = nlapiSearchRecord('customrecordsrv_partline', null, partLineRetailFilters, partLineCols);
	if(partLineRetailResults != null && partLineRetailResults.length > 0)
	{
		summaryObj.retail.partsDollars = ConvertNSFieldToFloat(partLineRetailResults[0].getValue('custrecordsrv_partline_amt',null,'SUM'));
		summaryObj.retail.costOfParts = ConvertNSFieldToFloat(partLineRetailResults[0].getValue('formulanumeric',null,'SUM'));
	}
	var partLineInternalFilters = basePartLineFilters.concat([new nlobjSearchFilter('custrecordsrv_opline_paymenttype', 'custrecordsrv_partline_opline', 'is', PAYMENTTYPE_GOODWILL)]);
	var partLineInternalResults = nlapiSearchRecord('customrecordsrv_partline', null, partLineInternalFilters, partLineCols);
	if(partLineInternalResults != null && partLineInternalResults.length > 0)
	{
		summaryObj.internal.partsDollars = ConvertNSFieldToFloat(partLineInternalResults[0].getValue('custrecordsrv_partline_amt',null,'SUM'));
		summaryObj.internal.costOfParts = ConvertNSFieldToFloat(partLineInternalResults[0].getValue('formulanumeric',null,'SUM'));
	}
	
	//Get tax information for the Parts.
	var taxableSWOsFilters = [new nlobjSearchFilter('custrecordsrv_swo_stage', null, 'anyof', [STAGE_COMPLETE]),
	                          new nlobjSearchFilter('taxable', 'custrecordsrv_swo_retailcustdealer', 'is', 'T')];
	if(startDate == endDate)
	{
		taxableSWOsFilters.push(new nlobjSearchFilter('custrecordsrv_swo_startdate', null, 'on', startDate));
	}
	else
	{
		taxableSWOsFilters.push(new nlobjSearchFilter('custrecordsrv_swo_startdate', null, 'onorafter', startDate));
		taxableSWOsFilters.push(new nlobjSearchFilter('custrecordsrv_swo_startdate', null, 'onorbefore', endDate));
	}
	var taxableSWOResults = GetSteppedSearchResults('customrecordsrv_serviceworkorder', taxableSWOsFilters, new nlobjSearchColumn('internalid'));
	if(taxableSWOResults != null && taxableSWOResults.length > 0)
	{
		var taxableSWOIds = [];
		for(var i = 0; i < taxableSWOResults.length; i++) taxableSWOIds.push(taxableSWOResults[i].getValue('internalid'));
		var baseTaxFilters = [new nlobjSearchFilter('custrecordsrv_partline_swo', null, 'anyof', taxableSWOIds)];
		
		//Search for the data.
		var taxCols = [new nlobjSearchColumn('formulanumeric',null,'SUM').setFormula('{custrecordsrv_partline_amt}*.07').setSort()];
		var taxWarrantyFilters = baseTaxFilters.concat([new nlobjSearchFilter('custrecordsrv_opline_paymenttype', 'custrecordsrv_partline_opline', 'is', PAYMENTTYPE_WARRANTY)]);
		var taxWarrantyResults = nlapiSearchRecord('customrecordsrv_partline', null, taxWarrantyFilters, taxCols);
		if(taxWarrantyResults != null && taxWarrantyResults.length > 0)
		{
			summaryObj.warranty.salesTax = ConvertNSFieldToFloat(taxWarrantyResults[0].getValue('formulanumeric',null,'SUM'));
		}
		var taxRetailFilters = baseTaxFilters.concat([new nlobjSearchFilter('custrecordsrv_opline_paymenttype', 'custrecordsrv_partline_opline', 'anyof', [PAYMENTTYPE_CUSTOMER, PAYMENTTYPE_INSURANCE])]);
		var taxRetailResults = nlapiSearchRecord('customrecordsrv_partline', null, taxRetailFilters, taxCols);
		if(taxRetailResults != null && taxRetailResults.length > 0)
		{
			summaryObj.retail.salesTax = ConvertNSFieldToFloat(taxRetailResults[0].getValue('formulanumeric',null,'SUM'));
		}
		var taxInternalFilters = baseTaxFilters.concat([new nlobjSearchFilter('custrecordsrv_opline_paymenttype', 'custrecordsrv_partline_opline', 'is', PAYMENTTYPE_GOODWILL)]);
		var taxInternalResults = nlapiSearchRecord('customrecordsrv_partline', null, taxInternalFilters, taxCols);
		if(taxInternalResults != null && taxInternalResults.length > 0)
		{
			summaryObj.internal.salesTax = ConvertNSFieldToFloat(taxInternalResults[0].getValue('formulanumeric',null,'SUM'));
		}
	}
	
	//Calculate the totals.
//	summaryObj.total.numClaims = summaryObj.warranty.numClaims + summaryObj.retail.numClaims + summaryObj.internal.numClaims;
//	summaryObj.total.laborHours = summaryObj.warranty.laborHours + summaryObj.retail.laborHours + summaryObj.internal.laborHours;
//	summaryObj.total.laborDollars = summaryObj.warranty.laborDollars + summaryObj.retail.laborDollars + summaryObj.internal.laborDollars;
//	summaryObj.total.costOfLabor = summaryObj.warranty.costOfLabor + summaryObj.retail.costOfLabor + summaryObj.internal.costOfLabor;
//	summaryObj.total.partsDollars = summaryObj.warranty.partsDollars + summaryObj.retail.partsDollars + summaryObj.internal.partsDollars;
//	summaryObj.total.costOfParts = summaryObj.warranty.costOfParts + summaryObj.retail.costOfParts + summaryObj.internal.costOfParts;
//	summaryObj.total.salesTax = summaryObj.warranty.salesTax + summaryObj.retail.salesTax + summaryObj.internal.salesTax;
//	summaryObj.total.totalDollars = summaryObj.warranty.totalDollars + summaryObj.retail.totalDollars + summaryObj.internal.totalDollars;
//	summaryObj.total.grossProfit = summaryObj.warranty.grossProfit + summaryObj.retail.grossProfit + summaryObj.internal.grossProfit;
	
	return summaryObj;
}

/**
 * Creates and returns the XML that should be used to download an Excel version of the Summary Report
 * 
 * @param {Object} summaryObj
 * @param {String} startDate
 * @param {String} endDate
 * @returns {String} XML string of the XLS
 */
function GD_GenerateServiceSummaryReportXLS(summaryObj, startDate, endDate)
{
	return '<?xml version="1.0"?>'
		 + '<?mso-application progid="Excel.Sheet"?>'
		 + '<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"'
		 + ' xmlns:o="urn:schemas-microsoft-com:office:office"'
		 + ' xmlns:x="urn:schemas-microsoft-com:office:excel"'
		 + ' xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet"'
		 + ' xmlns:html="http://www.w3.org/TR/REC-html40">'
		 + '<OfficeDocumentSettings xmlns="urn:schemas-microsoft-com:office:office">'
		  + '<AllowPNG/>'
		 + '</OfficeDocumentSettings>'
		 + '<ExcelWorkbook xmlns="urn:schemas-microsoft-com:office:excel">'
		  + '<WindowHeight>10770</WindowHeight>'
		  + '<WindowWidth>9660</WindowWidth>'
		  + '<WindowTopX>0</WindowTopX>'
		  + '<WindowTopY>0</WindowTopY>'
		  + '<ProtectStructure>False</ProtectStructure>'
		  + '<ProtectWindows>False</ProtectWindows>'
		 + '</ExcelWorkbook>'
		 + '<Styles>'
		  + '<Style ss:ID="Default" ss:Name="Normal">'
		   + '<Alignment ss:Vertical="Bottom"/>'
		   + '<Borders/>'
		   + '<Font ss:FontName="Calibri" x:Family="Swiss" ss:Size="11" ss:Color="#000000"/>'
		   + '<Interior/>'
		   + '<NumberFormat/>'
		   + '<Protection/>'
		  + '</Style>'
		  + '<Style ss:ID="s16" ss:Name="Comma">'
		   + '<NumberFormat ss:Format="_(* #,##0.00_);_(* \(#,##0.00\);_(* &quot;-&quot;??_);_(@_)"/>'
		  + '</Style>'
		  + '<Style ss:ID="s18">'
		   + '<Borders>'
		    + '<Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1"/>'
		    + '<Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1"/>'
		    + '<Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1"/>'
		    + '<Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1"/>'
		   + '</Borders>'
		  + '</Style>'
		  + '<Style ss:ID="s20">'
		   + '<Borders>'
		    + '<Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1"/>'
		    + '<Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1"/>'
		   + '</Borders>'
		   + '<Interior ss:Color="#D9D9D9" ss:Pattern="Solid"/>'
		  + '</Style>'
		  + '<Style ss:ID="s23">'
		   + '<Borders>'
		    + '<Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1"/>'
		    + '<Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1"/>'
		    + '<Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1"/>'
		    + '<Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1"/>'
		   + '</Borders>'
		   + '<NumberFormat ss:Format="#,##0.00_);[Red]\(#,##0.00\)"/>'
		  + '</Style>'
		  + '<Style ss:ID="s29">'
		   + '<Borders>'
		    + '<Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1"/>'
		    + '<Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1"/>'
		    + '<Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1"/>'
		   + '</Borders>'
		   + '<Interior ss:Color="#D9D9D9" ss:Pattern="Solid"/>'
		  + '</Style>'
		  + '<Style ss:ID="s37">'
		   + '<Borders>'
		    + '<Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1"/>'
		    + '<Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1"/>'
		    + '<Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1"/>'
		   + '</Borders>'
		   + '<Font ss:FontName="Calibri" x:Family="Swiss" ss:Size="28" ss:Color="#000000"/>'
		   + '<Interior ss:Color="#D9D9D9" ss:Pattern="Solid"/>'
		  + '</Style>'
		  + '<Style ss:ID="s38">'
		   + '<Alignment ss:Horizontal="Center" ss:Vertical="Center"/>'
		   + '<Borders>'
		    + '<Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1"/>'
		    + '<Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1"/>'
		    + '<Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1"/>'
		    + '<Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1"/>'
		   + '</Borders>'
		   + '<Font ss:FontName="Calibri" x:Family="Swiss" ss:Size="11" ss:Color="#000000" ss:Bold="1"/>'
		   + '<Interior ss:Color="#D9D9D9" ss:Pattern="Solid"/>'
		  + '</Style>'
		  + '<Style ss:ID="s39">'
		   + '<Alignment ss:Horizontal="Center" ss:Vertical="Center"/>'
		   + '<Borders>'
		    + '<Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1"/>'
		    + '<Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1"/>'
		    + '<Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1"/>'
		    + '<Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1"/>'
		   + '</Borders>'
		   + '<Font ss:FontName="Calibri" x:Family="Swiss" ss:Size="11" ss:Color="#000000" ss:Bold="1"/>'
		   + '<Interior ss:Color="#FFFFFF" ss:Pattern="Solid"/>'
		  + '</Style>'
		  + '<Style ss:ID="s40">'
		   + '<Borders/>'
		   + '<Font ss:FontName="Calibri" x:Family="Swiss" ss:Size="28" ss:Color="#000000"/>'
		   + '<Interior ss:Color="#FFFFFF" ss:Pattern="Solid"/>'
		  + '</Style>'
		  + '<Style ss:ID="s41">'
		   + '<Borders/>'
		   + '<Interior ss:Color="#FFFFFF" ss:Pattern="Solid"/>'
		  + '</Style>'
		  + '<Style ss:ID="s42">'
		   + '<Borders>'
		    + '<Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1"/>'
		    + '<Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1"/>'
		    + '<Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1"/>'
		    + '<Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1"/>'
		   + '</Borders>'
		   + '<Font ss:FontName="Calibri" x:Family="Swiss" ss:Size="11" ss:Color="#000000" ss:Bold="1"/>'
		  + '</Style>'
		  + '<Style ss:ID="s43">'
		   + '<Alignment ss:Horizontal="Center" ss:Vertical="Center"/>'
		   + '<Borders>'
		    + '<Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1"/>'
		    + '<Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1"/>'
		    + '<Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1"/>'
		    + '<Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1"/>'
		   + '</Borders>'
		  + '</Style>'
		  + '<Style ss:ID="s44">'
		   + '<Alignment ss:Horizontal="Center" ss:Vertical="Center"/>'
		   + '<Borders>'
		    + '<Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1"/>'
		    + '<Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1"/>'
		    + '<Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1"/>'
		    + '<Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1"/>'
		   + '</Borders>'
		   + '<NumberFormat ss:Format="#,##0.00_);[Red]\(#,##0.00\)"/>'
		  + '</Style>'
		  + '<Style ss:ID="s49">'
		   + '<Borders>'
		    + '<Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1"/>'
		    + '<Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1"/>'
		    + '<Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1"/>'
		    + '<Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1"/>'
		   + '</Borders>'
		   + '<Font ss:FontName="Calibri" x:Family="Swiss" ss:Size="12" ss:Color="#000000" ss:Bold="1"/>'
		   + '<Interior ss:Color="#FFFF00" ss:Pattern="Solid"/>'
		   + '<NumberFormat ss:Format="[ENG][$-409]mmmm\-yy;@"/>'
		  + '</Style>'
		  + '<Style ss:ID="s50">'
		   + '<Alignment ss:Horizontal="Center" ss:Vertical="Bottom"/>'
		   + '<Borders>'
		    + '<Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1"/>'
		    + '<Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1"/>'
		    + '<Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1"/>'
		    + '<Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1"/>'
		   + '</Borders>'
		   + '<NumberFormat ss:Format="&quot;$&quot;#,##0.00"/>'
		  + '</Style>'
		  + '<Style ss:ID="s53">'
		   + '<Alignment ss:Horizontal="Center" ss:Vertical="Bottom"/>'
		   + '<Borders>'
		    + '<Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1"/>'
		    + '<Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1"/>'
		    + '<Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1"/>'
		    + '<Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1"/>'
		   + '</Borders>'
		   + '<NumberFormat ss:Format="#,##0.0"/>'
		  + '</Style>'
		  + '<Style ss:ID="s54">'
		   + '<Alignment ss:Horizontal="Center" ss:Vertical="Bottom"/>'
		   + '<Borders>'
		    + '<Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1"/>'
		    + '<Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1"/>'
		    + '<Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1"/>'
		    + '<Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1"/>'
		   + '</Borders>'
		   + '<NumberFormat ss:Format="#,##0"/>'
		  + '</Style>'
		  + '<Style ss:ID="s55">'
		   + '<Alignment ss:Horizontal="Center" ss:Vertical="Center"/>'
		   + '<Borders>'
		    + '<Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1"/>'
		    + '<Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1"/>'
		    + '<Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1"/>'
		    + '<Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1"/>'
		   + '</Borders>'
		   + '<NumberFormat ss:Format="Currency"/>'
		  + '</Style>'
		 + '</Styles>'
		 + '<Worksheet ss:Name="Sheet1">'
		  + '<Table ss:ExpandedColumnCount="11" ss:ExpandedRowCount="14" x:FullColumns="1" x:FullRows="1" ss:DefaultRowHeight="15">'
		   + '<Column ss:AutoFitWidth="0" ss:Width="17.25"/>'
		   + '<Column ss:AutoFitWidth="0" ss:Width="130.25"/>'
		   + '<Column ss:AutoFitWidth="0" ss:Width="15.75"/>'
		   + '<Column ss:AutoFitWidth="0" ss:Width="83.25"/>'
		   + '<Column ss:AutoFitWidth="0" ss:Width="15.75"/>'
		   + '<Column ss:AutoFitWidth="0" ss:Width="83.25"/>'
		   + '<Column ss:AutoFitWidth="0" ss:Width="15.75"/>'
		   + '<Column ss:AutoFitWidth="0" ss:Width="84"/>'
		   + '<Column ss:AutoFitWidth="0" ss:Width="15.75"/>'
		   + '<Column ss:AutoFitWidth="0" ss:Width="84"/>'
		   + '<Column ss:AutoFitWidth="0" ss:Width="15.75"/>'
		   + '<Row ss:Index="2" ss:AutoFitHeight="0" ss:Height="27.75">'
		    + '<Cell ss:Index="2" ss:StyleID="s37"><Data ss:Type="String">              Service Shop Summary Report</Data></Cell>'
		    + '<Cell ss:StyleID="s20"/>'
		    + '<Cell ss:StyleID="s20"/>'
		    + '<Cell ss:StyleID="s20"/>'
		    + '<Cell ss:StyleID="s20"/>'
		    + '<Cell ss:StyleID="s20"/>'
		    + '<Cell ss:StyleID="s20"/>'
		    + '<Cell ss:StyleID="s20"/>'
		    + '<Cell ss:StyleID="s29"/>'
		   + '</Row>'
		   + '<Row ss:AutoFitHeight="0" ss:Height="9">'
		    + '<Cell ss:Index="2" ss:StyleID="s40"/>'
		    + '<Cell ss:StyleID="s41"/>'
		    + '<Cell ss:StyleID="s41"/>'
		    + '<Cell ss:StyleID="s41"/>'
		    + '<Cell ss:StyleID="s41"/>'
		    + '<Cell ss:StyleID="s41"/>'
		    + '<Cell ss:StyleID="s41"/>'
		   + '</Row>'
		   + '<Row ss:Height="15.75">'
		    + '<Cell ss:Index="2" ss:StyleID="s49"><Data ss:Type="String">' + startDate.replace(/\//g, '-') + ' to ' + endDate.replace(/\//g, '-') + '</Data></Cell>'
		    + '<Cell ss:StyleID="s18"/>'
		    + '<Cell ss:StyleID="s38"><Data ss:Type="String">WARRANTY</Data></Cell>'
		    + '<Cell ss:StyleID="s39"/>'
		    + '<Cell ss:StyleID="s38"><Data ss:Type="String">RETAIL</Data></Cell>'
		    + '<Cell ss:StyleID="s39"/>'
		    + '<Cell ss:StyleID="s38"><Data ss:Type="String">INTERNAL</Data></Cell>'
		    + '<Cell ss:StyleID="s18"/>'
		    + '<Cell ss:StyleID="s38"><Data ss:Type="String">TOTAL</Data></Cell>'
		   + '</Row>'
		   + '<Row ss:AutoFitHeight="0" ss:Height="6.75"/>'
		   + '<Row>'
		    + '<Cell ss:Index="2" ss:StyleID="s42"><Data ss:Type="String"># Claims/Repair Orders:</Data></Cell>'
		    + '<Cell ss:StyleID="s18"/>'
		    + '<Cell ss:StyleID="s43"><Data ss:Type="Number">' + summaryObj.warranty.numClaims + '</Data></Cell>'
		    + '<Cell ss:StyleID="s18"/>'
		    + '<Cell ss:StyleID="s43"><Data ss:Type="Number">' + summaryObj.retail.numClaims + '</Data></Cell>'
		    + '<Cell ss:StyleID="s18"/>'
		    + '<Cell ss:StyleID="s43"><Data ss:Type="Number">' + summaryObj.internal.numClaims + '</Data></Cell>'
		    + '<Cell ss:StyleID="s18"/>'
		    + '<Cell ss:StyleID="s54" ss:Formula="=SUM(RC[-6]:RC[-2])"><Data ss:Type="Number">0</Data></Cell>'
		   + '</Row>'
		   + '<Row>'
		    + '<Cell ss:Index="2" ss:StyleID="s42"><Data ss:Type="String">Labor Hours Billed:</Data></Cell>'
		    + '<Cell ss:StyleID="s18"/>'
		    + '<Cell ss:StyleID="s43"><Data ss:Type="Number">' + summaryObj.warranty.laborHours + '</Data></Cell>'
		    + '<Cell ss:StyleID="s18"/>'
		    + '<Cell ss:StyleID="s43"><Data ss:Type="Number">' + summaryObj.retail.laborHours + '</Data></Cell>'
		    + '<Cell ss:StyleID="s18"/>'
		    + '<Cell ss:StyleID="s43"><Data ss:Type="Number">' + summaryObj.internal.laborHours + '</Data></Cell>'
		    + '<Cell ss:StyleID="s18"/>'
		    + '<Cell ss:StyleID="s53" ss:Formula="=SUM(RC[-6]:RC[-2])"><Data ss:Type="Number">0</Data></Cell>'
		   + '</Row>'
		   + '<Row>'
		    + '<Cell ss:Index="2" ss:StyleID="s42"><Data ss:Type="String">Labor $$$ Billed:</Data></Cell>'
		    + '<Cell ss:StyleID="s18"/>'
		    + '<Cell ss:StyleID="s55"><Data ss:Type="Number">' + summaryObj.warranty.laborDollars + '</Data></Cell>'
		    + '<Cell ss:StyleID="s23"/>'
		    + '<Cell ss:StyleID="s55"><Data ss:Type="Number">' + summaryObj.retail.laborDollars + '</Data></Cell>'
		    + '<Cell ss:StyleID="s23"/>'
		    + '<Cell ss:StyleID="s55"><Data ss:Type="Number">' + summaryObj.internal.laborDollars + '</Data></Cell>'
		    + '<Cell ss:StyleID="s23"/>'
		    + '<Cell ss:StyleID="s50" ss:Formula="=SUM(RC[-6]:RC[-2])"><Data ss:Type="Number">0</Data></Cell>'
		   + '</Row>'
		   + '<Row>'
		    + '<Cell ss:Index="2" ss:StyleID="s42"><Data ss:Type="String">Cost of Labor ($$):</Data></Cell>'
		    + '<Cell ss:StyleID="s18"/>'
		    + '<Cell ss:StyleID="s55"><Data ss:Type="Number">' + summaryObj.warranty.costOfLabor + '</Data></Cell>'
		    + '<Cell ss:StyleID="s23"/>'
		    + '<Cell ss:StyleID="s55"><Data ss:Type="Number">' + summaryObj.retail.costOfLabor + '</Data></Cell>'
		    + '<Cell ss:StyleID="s23"/>'
		    + '<Cell ss:StyleID="s55"><Data ss:Type="Number">' + summaryObj.internal.costOfLabor + '</Data></Cell>'
		    + '<Cell ss:StyleID="s23"/>'
		    + '<Cell ss:StyleID="s50" ss:Formula="=SUM(RC[-6]:RC[-2])"><Data ss:Type="Number">0</Data></Cell>'
		   + '</Row>'
		   + '<Row>'
		    + '<Cell ss:Index="2" ss:StyleID="s42"><Data ss:Type="String">Parts $$$ Billed: </Data></Cell>'
		    + '<Cell ss:StyleID="s18"/>'
		    + '<Cell ss:StyleID="s55"><Data ss:Type="Number">' + summaryObj.warranty.partsDollars + '</Data></Cell>'
		    + '<Cell ss:StyleID="s23"/>'
		    + '<Cell ss:StyleID="s55"><Data ss:Type="Number">' + summaryObj.retail.partsDollars + '</Data></Cell>'
		    + '<Cell ss:StyleID="s23"/>'
		    + '<Cell ss:StyleID="s55"><Data ss:Type="Number">' + summaryObj.internal.partsDollars + '</Data></Cell>'
		    + '<Cell ss:StyleID="s23"/>'
		    + '<Cell ss:StyleID="s50" ss:Formula="=SUM(RC[-6]:RC[-2])"><Data ss:Type="Number">0</Data></Cell>'
		   + '</Row>'
		   + '<Row>'
		    + '<Cell ss:Index="2" ss:StyleID="s42"><Data ss:Type="String">Cost of Parts Billed ($$):</Data></Cell>'
		    + '<Cell ss:StyleID="s18"/>'
		    + '<Cell ss:StyleID="s55"><Data ss:Type="Number">' + summaryObj.warranty.costOfParts + '</Data></Cell>'
		    + '<Cell ss:StyleID="s23"/>'
		    + '<Cell ss:StyleID="s55"><Data ss:Type="Number">' + summaryObj.retail.costOfParts + '</Data></Cell>'
		    + '<Cell ss:StyleID="s23"/>'
		    + '<Cell ss:StyleID="s55"><Data ss:Type="Number">' + summaryObj.internal.costOfParts + '</Data></Cell>'
		    + '<Cell ss:StyleID="s23"/>'
		    + '<Cell ss:StyleID="s50" ss:Formula="=SUM(RC[-6]:RC[-2])"><Data ss:Type="Number">0</Data></Cell>'
		   + '</Row>'
		   + '<Row>'
		    + '<Cell ss:Index="2" ss:StyleID="s42"><Data ss:Type="String">Sales Tax Collected</Data></Cell>'
		    + '<Cell ss:StyleID="s18"/>'
		    + '<Cell ss:StyleID="s55"><Data ss:Type="Number">' + summaryObj.warranty.salesTax + '</Data></Cell>'
		    + '<Cell ss:StyleID="s23"/>'
		    + '<Cell ss:StyleID="s55"><Data ss:Type="Number">' + summaryObj.retail.salesTax + '</Data></Cell>'
		    + '<Cell ss:StyleID="s23"/>'
		    + '<Cell ss:StyleID="s55"><Data ss:Type="Number">' + summaryObj.internal.salesTax + '</Data></Cell>'
		    + '<Cell ss:StyleID="s23"/>'
		    + '<Cell ss:StyleID="s50" ss:Formula="=SUM(RC[-6]:RC[-2])"><Data ss:Type="Number">0</Data></Cell>'
		   + '</Row>'
		   + '<Row>'
		    + '<Cell ss:Index="2" ss:StyleID="s42"><Data ss:Type="String">Total $$$ Billed:</Data></Cell>'
		    + '<Cell ss:StyleID="s18"/>'
		    + '<Cell ss:StyleID="s55" ss:Formula="=SUM(R[-5]C+R[-3]C)"><Data ss:Type="Number">0</Data></Cell>'
		    + '<Cell ss:StyleID="s23"/>'
		    + '<Cell ss:StyleID="s55" ss:Formula="=SUM(R[-5]C+R[-3]C+R[-1]C)"><Data ss:Type="Number">0</Data></Cell>'
		    + '<Cell ss:StyleID="s23"/>'
		    + '<Cell ss:StyleID="s55" ss:Formula="=SUM(R[-5]C+R[-3]C)"><Data ss:Type="Number">0</Data></Cell>'
		    + '<Cell ss:StyleID="s23"/>'
		    + '<Cell ss:StyleID="s50" ss:Formula="=SUM(RC[-6]:RC[-2])"><Data ss:Type="Number">0</Data></Cell>'
		   + '</Row>'
		   + '<Row>'
		    + '<Cell ss:Index="2" ss:StyleID="s42"><Data ss:Type="String">Gross Profit:</Data></Cell>'
		    + '<Cell ss:StyleID="s18"/>'
		    + '<Cell ss:StyleID="s55" ss:Formula="=SUM(R[-6]C-R[-5]C)+(R[-4]C-R[-3]C)"><Data ss:Type="Number">0</Data></Cell>'
		    + '<Cell ss:StyleID="s23"/>'
		    + '<Cell ss:StyleID="s55" ss:Formula="=SUM(R[-6]C-R[-5]C)+(R[-4]C-R[-3]C)"><Data ss:Type="Number">0</Data></Cell>'
		    + '<Cell ss:StyleID="s23"/>'
		    + '<Cell ss:StyleID="s55" ss:Formula="=SUM(R[-6]C-R[-5]C)+(R[-4]C-R[-3]C)"><Data ss:Type="Number">0</Data></Cell>'
		    + '<Cell ss:StyleID="s23"/>'
		    + '<Cell ss:StyleID="s50" ss:Formula="=SUM(RC[-6]:RC[-2])"><Data ss:Type="Number">0</Data></Cell>'
		   + '</Row>'
		  + '</Table>'
		  + '<WorksheetOptions xmlns="urn:schemas-microsoft-com:office:excel">'
		   + '<PageSetup>'
		    + '<Layout x:Orientation="Landscape"/>'
		    + '<Header x:Margin="0.3"/>'
		    + '<Footer x:Margin="0.3"/>'
		    + '<PageMargins x:Bottom="0.75" x:Left="0.7" x:Right="0.7" x:Top="0.75"/>'
		   + '</PageSetup>'
		   + '<FitToPage/>'
		   + '<Print>'
		    + '<ValidPrinterInfo/>'
		    + '<HorizontalResolution>600</HorizontalResolution>'
		    + '<VerticalResolution>600</VerticalResolution>'
		   + '</Print>'
		   + '<Selected/>'
		   + '<Panes>'
		    + '<Pane>'
		     + '<Number>3</Number>'
		     + '<ActiveRow>16</ActiveRow>'
		     + '<ActiveCol>3</ActiveCol>'
		    + '</Pane>'
		   + '</Panes>'
		   + '<ProtectObjects>False</ProtectObjects>'
		   + '<ProtectScenarios>False</ProtectScenarios>'
		  + '</WorksheetOptions>'
		 + '</Worksheet>'
		+ '</Workbook>';

}
