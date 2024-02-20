/**
 * Module Description
 * 
 * Version    Date            Author           Remarks
 * 1.00       24 Apr 2014     jeffrb
 * 1.01		6 Apr 2017		Jeffrey Bajit		Added Field Reports by adding a support case that finds all the field report categorized cases and tallying the number of complaints. 
 *
 */

/***************************************************************************************
 * BEGIN CONSTANTS
 ***************************************************************************************/
var CONTEXT = nlapiGetContext();
var ENV = CONTEXT.getEnvironment();

var NHTSA_SUBSTANTIALLYSIMILAR_XML = 328136;
var NHTSA_SUBSTANTIALLYSIMILAR_XSD = 328137;

var GD_NHTSA_AGGREGATE_TYPE_CONSUMERCOMPLAINT = 1;
var GD_NHTSA_AGGREGATE_TYPE_FIELDREPORT = 2;

/****************************************************************************************
 * END CONSTANTS
 ****************************************************************************************/


/**
 * User enters a date which is converted into a range that is a quarter within the year of the given date.
 * Searches are loaded depending on this date range and data is then set on an xml doc that is then created for
 * the user to save on their hard drive.
 * XML File ID: 61381 for GD Sandbox
 * XSD File ID: 61382 for GD Sandbox
 * XML File ID: 139261 for GD Live
 * XSD File ID: 139262 for GD Live
 * @param {nlobjRequest} request Request object
 * @param {nlobjResponse} response Response object
 * @returns {Void} Any output is written via response object
 */
function SendTreadXMLDocSuitelet(request, response)
{
	if (request.getMethod() == 'GET')
	{
		var createXML = request.getParameter('custparam_createxml');		//Toggle to xml report
		var createExcel = request.getParameter('custparam_createexcel');  	//Toggle to excel report
		var custparamDate = request.getParameter('custparam_date');
		
		
		if (createXML == 'T' || createExcel == 'T')
		{
			// Quarters
			// Jan-Mar = 1
			// Apr-Jun = 2
			// Jul-Sep = 3
			// Oct-Dec = 4
			var date = new Date(custparamDate);
			var month = date.getMonth();
			var year = date.getFullYear();
			var beginDateRange = '';
			var endDateRange = '';
			var beginMonth = 0;
			var endMonth = 0;
			var quarter = '';   //ReportInfo data
			var today = new Date();
			var currDate = ConvertNSFieldToString(today.getDate());
			var currMonth = ConvertNSFieldToString(today.getMonth() + 1);
			var currYear = today.getFullYear();
			if (currDate.length == 1)
				currDate = '0' + currDate;
			if (currMonth.length == 1)
				currMonth = '0' + currMonth;
			var todaysDate = currYear + '-' + currMonth + '-' + currDate;   //ReportInfo data
			
			if (month < 3) //Q1
			{
				beginMonth = 0;
				endMonth = 2;
				quarter = 1;
			}
			else if (month < 6) //Q2
			{
				beginMonth = 3;
				endMonth = 5;
				quarter = 2;
			}
			else if (month < 9) //Q3
			{
				beginMonth = 6;
				endMonth = 8;
				quarter = 3;
			}
			else //Q4
			{
				beginMonth = 9;
				endMonth = 11;
				quarter = 4;
			}
			beginDateRange = new Date(year, beginMonth, 1);
			endDateRange = new Date(year, endMonth + 1, 0);
			
			if (date != null)
			{
				/*REPORTINFO DATA*/
				var companyInfo = nlapiLoadConfiguration('companyinformation');
				var companyName = '852';
				var userId = nlapiGetUser();
				var userInfo = nlapiLookupField('employee', userId, ['email', 'phone', 'entityid']);
				/*REPORTINFO DATA*/
				
				/* BEGIN LOAD SEARCH RESULTS */
				var prodFilters = new Array();
				prodFilters[prodFilters.length] = new nlobjSearchFilter('custrecordunit_actualofflinedate', null, 'onorbefore', endDateRange);  // production is for all time.
				var productionSearchResult = nlapiSearchRecord('customrecordrvsunit', 'customsearchgd_treadxmlproduction_search', prodFilters, null);
				
				/* We use 'onOrAfter' and 'onOrBefore' because for some reason 'between' does not work for the
				 * following searches, there is probably a defect here. UPDATE: I found the documentation for this and 'between' actually
				 * can not be used for date values. JRB 7-10-14 */
				var conCompFilters = new Array();
				conCompFilters[conCompFilters.length] = new nlobjSearchFilter('created', null, 'onOrAfter', beginDateRange);
				conCompFilters[conCompFilters.length] = new nlobjSearchFilter('created', null, 'onOrBefore', endDateRange);
				
				var conCompColumns = new Array();
				conCompColumns[conCompColumns.length] = new nlobjSearchColumn('formulatext', null, 'group').setFormula("CONCAT(CONCAT({custrecordrvsunitnotesunit.custrecordunit_series},{custrecordrvsunitnotesunit.custrecordunit_msomodelname}),CONCAT({custrecordrvsunitnotesunit.custrecordunit_modelyear},{custrecordrvsunitnotesunit.custrecordunit_typeofvehicle}))");
				
				
				// We use item id and location combination to get a unique id.
				var internalIdColumnSort = new nlobjSearchColumn('formulanumeric', null, 'group').setFormula("TO_NUMBER(CONCAT({internalid}, CONCAT('.', {inventorylocation.internalid})))");
				internalIdColumnSort.setSort();
				
				var consumerCompaintsSearchResult = nlapiSearchRecord('customrecordrvsunitnotes', 'customsearchgd_treadxmlconsumercomp_srch', conCompFilters, conCompColumns);
				
				//This 'Support Cases' section was added as a part of the Customer Services Change Order on 8/23/16 - BrianS
				var supCaseFilters = new Array();
				supCaseFilters[supCaseFilters.length] = new nlobjSearchFilter('createddate', null, 'onOrAfter', beginDateRange);
				supCaseFilters[supCaseFilters.length] = new nlobjSearchFilter('createddate', null, 'onOrBefore', endDateRange);
				supCaseFilters[supCaseFilters.length] = new nlobjSearchFilter('custeventgd_nhtsaaggregatetype', null, 'anyOf', GD_NHTSA_AGGREGATE_TYPE_CONSUMERCOMPLAINT);
				
				var supCaseColumns = new Array();
				supCaseColumns[supCaseColumns.length] = new nlobjSearchColumn('formulatext', null, 'group').setFormula("CONCAT(CONCAT({custeventgd_vinnumber.custrecordunit_series},{custeventgd_vinnumber.custrecordunit_msomodelname}),CONCAT({custeventgd_vinnumber.custrecordunit_modelyear},{custeventgd_vinnumber.custrecordunit_typeofvehicle}))");
				var supportCaseSearchResult = nlapiSearchRecord('supportcase', 'customsearchgd_treadxmlsupportcases', supCaseFilters, supCaseColumns);
				
				//This second 'Support Cases' section was added as a part of the Field Reports on NHTSA Field Report Change Order on 4/5/17 - JRB
				var supCaseFieldReportFilters = new Array();
				supCaseFieldReportFilters[supCaseFieldReportFilters.length] = new nlobjSearchFilter('custeventgd_vinnumber', null, 'noneOf', ['@NONE@']);
				supCaseFieldReportFilters[supCaseFieldReportFilters.length] = new nlobjSearchFilter('createddate', null, 'onOrAfter', beginDateRange);
				supCaseFieldReportFilters[supCaseFieldReportFilters.length] = new nlobjSearchFilter('createddate', null, 'onOrBefore', endDateRange);
				supCaseFieldReportFilters[supCaseFieldReportFilters.length] = new nlobjSearchFilter('custeventgd_nhtsaaggregatetype', null, 'anyof', GD_NHTSA_AGGREGATE_TYPE_FIELDREPORT);
				
				var supCaseFieldReportColumns = new Array();
				supCaseFieldReportColumns[supCaseFieldReportColumns.length] = new nlobjSearchColumn('custrecordunit_series', 'custeventgd_vinnumber', 'group').setSort();
				supCaseFieldReportColumns[supCaseFieldReportColumns.length] = new nlobjSearchColumn('custrecordunit_msomodelname', 'custeventgd_vinnumber', 'GROUP').setSort();
				supCaseFieldReportColumns[supCaseFieldReportColumns.length] = new nlobjSearchColumn('custrecordunit_typeofvehicle', 'custeventgd_vinnumber', 'GROUP');
				supCaseFieldReportColumns[supCaseFieldReportColumns.length] = new nlobjSearchColumn('custrecordunit_modelyear', 'custeventgd_vinnumber', 'GROUP').setSort();
				supCaseFieldReportColumns[supCaseFieldReportColumns.length] = new nlobjSearchColumn('custeventgd_casetreadcode', null, 'GROUP');
				supCaseFieldReportColumns[supCaseFieldReportColumns.length] = new nlobjSearchColumn('internalid', null, 'COUNT');
				supCaseFieldReportColumns[supCaseFieldReportColumns.length] = new nlobjSearchColumn('formulatext', null, 'GROUP');
				
				var supportCaseFieldReportSearchResult = nlapiSearchRecord('supportcase', null, supCaseFieldReportFilters, supCaseFieldReportColumns);
				
				var warFilters = new Array();
				warFilters[warFilters.length] = new nlobjSearchFilter('custrecordclaim_approveddate', null, 'onOrAfter', beginDateRange);
				warFilters[warFilters.length] = new nlobjSearchFilter('custrecordclaim_approveddate', null, 'onOrBefore', endDateRange);
				var warrantyReportSearchResult = nlapiSearchRecord('customrecordrvsclaim', 'customsearchgd_treadxmlwarranty_search', warFilters, null);
				/* END LOAD SEARCH RESULTS */
				
				var xmlDoc = '';
				var xsdDoc = '';
				var xmlExcelString = {str: ''};
				if (createXML == 'T') {
					/* LOAD XMLDOC FROM FILE */
					var xmlFile = nlapiLoadFile(139261);
					var xmlString = xmlFile.getValue();
					xmlDoc = nlapiStringToXML(xmlString);
					/* LOAD XMLDOC FROM FILE*/
					
					/* Load XMLXSD FROM FILE */
					var xsdFile = nlapiLoadFile(139262);
					var xsdString = xsdFile.getValue();
					xsdDoc = nlapiStringToXML(xsdString);  //This is not being used because the netsuite xml validator is very picky/not working.
					/* Load XMLXSD FROM FILE */
				} else if (createExcel == 'T') {  // Initialize the excel file
					xmlExcelString.str = '<?xml version="1.0"?><?mso-application progid="Excel.Sheet"?>';
					xmlExcelString.str += '<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet" ';
					xmlExcelString.str += 'xmlns:o="urn:schemas-microsoft-com:office:office" ';
					xmlExcelString.str += 'xmlns:x="urn:schemas-microsoft-com:office:excel" ';
					xmlExcelString.str += 'xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet" ';
					xmlExcelString.str += 'xmlns:html="http://www.w3.org/TR/REC-html40">';
					xmlExcelString.str += '<Styles>';
					xmlExcelString.str += '<Style ss:ID="s23">';
					xmlExcelString.str += '<Alignment ss:Vertical="Bottom" ss:Rotate="90"/>';
					xmlExcelString.str += '<Borders>';
					xmlExcelString.str += '<Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1"/>';
					xmlExcelString.str += '<Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1"/>';
					xmlExcelString.str += '<Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1"/>';
					xmlExcelString.str += '<Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1"/>';
					xmlExcelString.str += '</Borders>';
					xmlExcelString.str += '<Interior ss:Color="#c4ffc6" ss:Pattern="Solid"/>';
					xmlExcelString.str += '</Style>';
					xmlExcelString.str += '<Style ss:ID="s24">';
					xmlExcelString.str += '<Borders>';
					xmlExcelString.str += '<Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1"/>';
					xmlExcelString.str += '<Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1"/>';
					xmlExcelString.str += '<Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1"/>';
					xmlExcelString.str += '<Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1"/>';
					xmlExcelString.str += '</Borders>';
					xmlExcelString.str += '<Interior ss:Color="#c4ffc6" ss:Pattern="Solid"/>';
					xmlExcelString.str += '</Style>';
					xmlExcelString.str += '</Styles>';
				}
				
				
				/* BEGIN REMOVE CHILDREN */
				var removeParentArray = new Array('Production', 'ConsumerComplaints', 'PropertyDamage', 'WarrantyClaims', 'FieldReports');
				var removeChildArray = new Array('PrTrailer', 'CcTrailer', 'PdTrailer', 'WcTrailer', 'FrTrailer');
				if (createXML == 'T')
					RemoveChildNode(xmlDoc, removeParentArray, removeChildArray);
				
				var removeSingleParentArray = new Array('ReportInfo');
				var removeReportInfoChildArray = new Array('ManufacturerName', 'ReportQuarter', 'ReportYear', 'ReportName', 'ReportVersion', 
						'ReportGeneratedDate', 'ReportContactName', 'ReportContactEmail', 'ReportContactPhone', 'NHTSATemplateRevisionNo');
				if (createXML == 'T')
					RemoveChildNode(xmlDoc, removeSingleParentArray, removeReportInfoChildArray);
				/* END REMOVE CHILDREN */
				
				/* BEGIN ADD GRANDCHILDREN */
				
				/* ReportInfo */
				var child = 'ReportInfo';
				var grandChildArray = new Array('ManufacturerName', 'ReportQuarter', 'ReportYear', 'ReportName', 'ReportVersion', 
						'ReportGeneratedDate', 'ReportContactName', 'ReportContactEmail', 'ReportContactPhone', 'NHTSATemplateRevisionNo');
				var valuesArray = new Array();
				valuesArray[valuesArray.length] = nlapiEscapeXML(VerifyValueElseReturnNone(companyName));
				valuesArray[valuesArray.length] = VerifyValueElseReturnNone(quarter);
				valuesArray[valuesArray.length] = VerifyValueElseReturnNone(year);
				valuesArray[valuesArray.length] = 'Trailers';
				valuesArray[valuesArray.length] = 1;
				valuesArray[valuesArray.length] = todaysDate;
				valuesArray[valuesArray.length] = VerifyValueElseReturnNone(userInfo.entityid);
				valuesArray[valuesArray.length] = VerifyValueElseReturnNone(userInfo.email);
				if (userInfo.phone.length < 7)
					userInfo.phone = '574-825-8000';
				valuesArray[valuesArray.length] = userInfo.phone;
				valuesArray[valuesArray.length] = '1.2';
				if (createXML == 'T') {
					AddNodesAndValues(xmlDoc, null, child, grandChildArray, valuesArray);
				} else if (createExcel == 'T') {
					AddExcelWorkSheetName(xmlExcelString, child, new Array('InfoName', 'InfoValue'));  // initialize the worksheet (excel tab sheet) and the first row or headers.
					var arrayLength = grandChildArray.length;
					for (var i = 0; i < arrayLength; i++) {
						AddExcelRowHeadersAndValues(xmlExcelString, new Array(grandChildArray[i], valuesArray[i]), i, arrayLength);  // each loop is a row in excel
					}
				}
					
				/* ReportInfo */
				
				/* Production */
				var parent = 'Production';
				child = 'PrTrailer';
				grandChildArray = new Array('Make', 'Model', 'ModelYear', 'Type', 'BrakeSystem', 'TotalProduction');
				valuesArray = '';
				if (productionSearchResult != null)
				{
					AddExcelWorkSheetName(xmlExcelString, parent, grandChildArray, true); // initialize the worksheet (excel tab sheet) and the first row or headers.
					for (var i = 0; i < productionSearchResult.length; i++)
					{
						valuesArray = new Array();
						valuesArray[valuesArray.length] = VerifyValueElseReturnNone(productionSearchResult[i].getText('custrecordunit_series', null, 'group'));
						valuesArray[valuesArray.length] = VerifyValueElseReturnNone(productionSearchResult[i].getValue('custitemrvsmsomodel', 'CUSTRECORDUNIT_MODEL', 'group'));
						valuesArray[valuesArray.length] = VerifyValueElseReturnNone(productionSearchResult[i].getText('custrecordunit_modelyear', null, 'group'));
						/* Accepted Values for Type: RT, VT, FT, CD, LB, DT, TT, DB, LT, AT, OT, BT */
						valuesArray[valuesArray.length] = 'RT'; 
						/* Accepted Values for BrakeSystem: A, H, N */
						valuesArray[valuesArray.length] = 'H';
						valuesArray[valuesArray.length] = productionSearchResult[i].getValue('internalid', null, 'count');
						if (createXML == 'T')
							AddNodesAndValues(xmlDoc, parent, child, grandChildArray, valuesArray);
						else if (createExcel == 'T') {
							AddExcelRowHeadersAndValues(xmlExcelString, valuesArray, i, productionSearchResult.length); // each loop is a row in excel
						}
					}
				}
				/* Production */
				
				/* ConsumerComplaints */
				parent = 'ConsumerComplaints';
				child = 'CcTrailer';
				grandChildArray = new Array('Make', 'Model', 'ModelYear', 'Suspension-02', 'ServiceBrake-03', 'ServiceBrakeAir-04', 
						'ParkingBrake-05', 'Electrical-11', 'ExtLighting-12', 'Structure-16', 'Latch-17', 'TiresRelated-19', 'Wheels-20', 
						'TrailerHitch-21', 'FireRelated-23');
				
				var makeId = 'custrecordunit_series';
				var modelId = 'custrecordunit_msomodelname';
				var yearId = 'custrecordunit_modelyear';
				var unitNotesTreadId = 'custrecordrvsunitnotetreadcode';
				var numComplaintsId = 'internalid';
				var claimUnitJoin = 'CUSTRECORDRVSUNITNOTESUNIT';
				var treadJoin = null;
				
				// Case 7760, changes added to combine both unit nots and support cases for consumer complaints for XML and Excel file generation. JRB 5-9-2017
				
				/* Support Cases - which are listed under the consumer complaints header */
				//This 'Support Cases' section was added as a part of the Customer Services Change Order on 8/23/16 - BrianS
				var supCaseTreadId = 'custeventgd_casetreadcode';
				var supCaseUnitJoin = 'custeventgd_vinnumber';

				if (createXML == 'T') {
					// Using a special function to deal with two searches to be combined into the consumer complaint section of the XML.
					SetXMLValuesFromMultipleSearchResult(xmlDoc, parent, child, grandChildArray, [supportCaseSearchResult, consumerCompaintsSearchResult], makeId, modelId, 
							yearId, [supCaseTreadId, unitNotesTreadId], numComplaintsId, [supCaseUnitJoin, claimUnitJoin], treadJoin, createXML, createExcel);
				} else if (createExcel == 'T') {
					// Using a special function to deal with two searches to be combined into the consumer complaint section of Excel.
					SetXMLValuesFromMultipleSearchResult(xmlExcelString, parent, child, grandChildArray, [supportCaseSearchResult, consumerCompaintsSearchResult], makeId, modelId, 
							yearId, [supCaseTreadId, unitNotesTreadId], numComplaintsId, [supCaseUnitJoin, claimUnitJoin], treadJoin, createXML, createExcel);
				}
				/* END Support Cases */
				/* END Consumer Complaints */

				/* PropertyDamage */
				if (createXML == 'T') {
					// Do nothing.  Property damage is not implemented yet.
				} else if (createExcel == 'T') {
					// this is only to build an empty property damage excel tab.
					SetXMLValuesFromSearchResult(xmlExcelString, 'PropertyDamage', child, grandChildArray, null, makeId, modelId, 
							yearId, treadId, numComplaintsId, claimUnitJoin, treadJoin, createXML, createExcel);
				}
				/* END PropertyDamange */
				
				/* WarrantyClaims */
				parent = 'WarrantyClaims';
				child = 'WcTrailer';
				grandChildArray = new Array('Make', 'Model', 'ModelYear', 'Suspension-02', 'ServiceBrake-03', 'ServiceBrakeAir-04', 
						'ParkingBrake-05', 'Electrical-11', 'ExtLighting-12', 'Structure-16', 'Latch-17', 'TiresRelated-19', 'Wheels-20', 
						'TrailerHitch-21', 'FireRelated-23');
				
				var makeId = 'custrecordunit_series';
				var modelId = 'custrecordunit_msomodelname';
				var yearId = 'custrecordunit_modelyear';
				var treadId = 'custrecordclaimoperationline_tread';
				var numComplaintsId = 'internalid';
				var claimUnitJoin = 'CUSTRECORDCLAIM_UNIT';
				var treadJoin = 'CUSTRECORDCLAIMOPERATIONLINE_CLAIM';
				if (createXML == 'T') {
					SetXMLValuesFromSearchResult(xmlDoc, parent, child, grandChildArray, warrantyReportSearchResult, makeId, modelId, 
							yearId, treadId, numComplaintsId, claimUnitJoin, treadJoin, createXML, createExcel);
				} else if (createExcel == 'T') {
					SetXMLValuesFromSearchResult(xmlExcelString, parent, child, grandChildArray, warrantyReportSearchResult, makeId, modelId, 
							yearId, treadId, numComplaintsId, claimUnitJoin, treadJoin, createXML, createExcel);
				}
				/* WarrantyClaims */
				
				/* FieldReports */
				parent = 'FieldReports';
				child = 'FrTrailer';
				grandChildArray = new Array('Make', 'Model', 'ModelYear', 'Suspension-02', 'ServiceBrake-03', 'ServiceBrakeAir-04', 
						'ParkingBrake-05', 'Electrical-11', 'ExtLighting-12', 'Structure-16', 'Latch-17', 'TiresRelated-19', 'Wheels-20', 
						'TrailerHitch-21', 'FireRelated-23');
				
				var makeId = 'custrecordunit_series';
				var modelId = 'custrecordunit_msomodelname';
				var yearId = 'custrecordunit_modelyear';
				var treadId = 'custeventgd_casetreadcode';
				var numComplaintsId = 'internalid';
				var claimUnitJoin = 'custeventgd_vinnumber';
				var treadJoin = null;

				if (createXML == 'T') {
					SetXMLValuesFromSearchResult(xmlDoc, parent, child, grandChildArray, supportCaseFieldReportSearchResult, makeId, modelId, 
							yearId, treadId, numComplaintsId, claimUnitJoin, treadJoin, createXML, createExcel);
				} else if (createExcel == 'T') {
					SetXMLValuesFromSearchResult(xmlExcelString, parent, child, grandChildArray, supportCaseFieldReportSearchResult, makeId, modelId, 
							yearId, treadId, numComplaintsId, claimUnitJoin, treadJoin, createXML, createExcel);
				}
				/* FieldReports */
				
				/* END ADD GRANDCHILDREN */


				if (createXML == 'T') {
					response.setContentType('XMLDOC', 'Aggregate_Tread_XML.xml');
					response.write(xmlDoc);
				} else if (createExcel == 'T') {
					xmlExcelString.str += '</Workbook>';
					var file = nlapiCreateFile('NHTSA_Aggregate_Tread_Report.txt', 'PLAINTEXT', xmlExcelString.str);
//					response.setContentType('PLAINTEXT', 'NHTSA_Aggregate_Tread_Report.txt');
//					response.write(xmlExcelString.str);
					var xlsFile = nlapiCreateFile('NHTSA_Aggregate_Tread_Report.xls', 'EXCEL', nlapiEncrypt(xmlExcelString.str, 'base64'));
					response.setContentType('EXCEL', 'NHTSA_Aggregate_Tread_Report.xls');
					response.write(xlsFile.getValue());
				}
			}
		}
		else
		{
			/* Create a form with date field for user to enter a certain date where they want to generate the xml tread codes reports
			 * in that quarter */
			var form = nlapiCreateForm('Create NHTSA Aggregate Tread XML Doc', false);
			form.setScript('customscriptgd_treadxmldocgen_client');
			var dateField = form.addField('custpage_datefield', 'date', 'Enter Date', null, null);
			dateField.setDisplayType('normal');
			
			form.addButton('createxmldocbutton', 'Generate XML', 'CreateXMLDocClientScript');
			form.addButton('createexceldocbutton', 'Generate Excel', 'CreateExcelDocClientScript');
			form.addSubmitButton('Reset');
			response.writePage(form);
		}
	}
	else //POST
	{
		/* Resets the Form */
		nlapiSetRedirectURL('SUITELET', 'customscriptgd_treadxmldocgeneratr_suite', 'customdeploygd_treadxmldocgeneratr_deplo', null, null);
	}
}

/**
 * Goes through the results and creates a grandchild node in the xmlDoc with values from the search result.
 * It creates a new node when the makemodelyear concatenated is different from the previous node and all result lines that
 * has the same makemodelyear combination takes the tread code and sets the value of number of complaints on the correct
 * treadcode that is in an array called valuesarray.
 * @param xml
 * @param parent
 * @param child
 * @param grandChildArray
 * @param searchResult
 * @param makeId
 * @param modelId
 * @param yearId
 * @param treadId
 * @param numComplaintsId
 * @param claimUnitJoin
 * @param treadJoin
 */
function SetXMLValuesFromSearchResult(xml, parent, child, grandChildArray, searchResult, makeId, modelId, yearId, treadId, 
		numComplaintsId, claimUnitJoin, treadJoin, createXML, createExcel)
{
	var valuesArray = '';
	var previousMakeModelYear = '';
	var currentMakeModelYear = '';
	var make = '';
	var model = '';
	var resultYear = '';
	var treadCode = '';
	var numberOfComplaints = '';
	
	/* Array equivalent for tread code values. Information purpose only.
	0 suspension02
	1 serviceBrake03
	2 serviceBrakeAir04
	3 parkingBrake05
	4 electrical11
	5 extLighting12
	6 structure16
	7 latch17 = '0';
	8 tiresRelated19
	9 wheels20 = '0';
	10 trailerHitch21
	11 fireRelated23
	*/
	var treadCodeValues = new Array('0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0');
	
	var isWorkSheetClosed = false;  // This checks to make sure the worksheet is always closed after the loop.
	if (createExcel == 'T') {
		AddExcelWorkSheetName(xml, parent, grandChildArray, true);
	}

	if (searchResult != null)
	{
		var index = 0;
		for (var i = 0; i < searchResult.length; i++)
		{
			if (i > 0)  
			{
				make = VerifyValueElseReturnNone(searchResult[i].getText(makeId, claimUnitJoin, 'group'));
				model = VerifyValueElseReturnNone(searchResult[i].getValue(modelId, claimUnitJoin, 'group'));
				resultYear = VerifyValueElseReturnNone(searchResult[i].getText(yearId, claimUnitJoin, 'group'));
				currentMakeModelYear = make + model + resultYear;
				
				if (currentMakeModelYear == previousMakeModelYear)  
				{
					treadCode = searchResult[i].getValue(treadId, treadJoin, 'group');
					numberOfComplaints = searchResult[i].getValue(numComplaintsId, treadJoin, 'count');
					SetTreadCodeCountValue(treadCodeValues, numberOfComplaints, treadCode);
					
					if (searchResult.length - 1 == i)  // We've reached the end of the resultlist so we need to set values and add the node.
					{
						if (CheckValuesNotAllZeroes(treadCodeValues))
						{
							SetValuesArray(valuesArray, treadCodeValues);
							if (createXML == 'T')
								AddNodesAndValues(xml, parent, child, grandChildArray, valuesArray);
							else if (createExcel == 'T')
							{
								AddExcelRowHeadersAndValues(xml, valuesArray, index, searchResult.length);
								isWorkSheetClosed = true;
							}
						}
					}	
				}
				else // the current result we are on needs to be on a new node from the previous so first
				{    // we set the values and add the previous data in a node and we start a new  node information by zeroing out treacodevalues.
					if (CheckValuesNotAllZeroes(treadCodeValues))
					{
						SetValuesArray(valuesArray, treadCodeValues);
						if (createXML == 'T')
							AddNodesAndValues(xml, parent, child, grandChildArray, valuesArray);
						else if (createExcel == 'T')
						{
							// The last parameter is a special case that stops the closure of the worksheet tag if the current searchresult is the last result, 
							//  it should not close the worksheet since it is only processing the previous searchresult.
							AddExcelRowHeadersAndValues(xml, valuesArray, index, searchResult.length, index == searchResult.length - 1); 
						}
					}
					
					valuesArray = new Array();
					previousMakeModelYear = currentMakeModelYear;
					treadCode = searchResult[i].getValue(treadId, treadJoin, 'group');
					numberOfComplaints = searchResult[i].getValue(numComplaintsId, treadJoin, 'count');
					
					treadCodeValues = new Array('0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0');  // we are staring on a new one.
					
					SetTreadCodeCountValue(treadCodeValues, numberOfComplaints, treadCode);
					valuesArray[valuesArray.length] = make;
					valuesArray[valuesArray.length] = model;
					valuesArray[valuesArray.length] = resultYear;
					if (searchResult.length - 1 == i) // this must be the last result so we must set the values and create the xml node.
					{
						if (CheckValuesNotAllZeroes(treadCodeValues))
						{
							SetValuesArray(valuesArray, treadCodeValues);
							if (createXML == 'T')
								AddNodesAndValues(xml, parent, child, grandChildArray, valuesArray);
							else if (createExcel == 'T')
							{
								AddExcelRowHeadersAndValues(xml, valuesArray, index, searchResult.length);
								isWorkSheetClosed = true;
							}
						}
					}
				}
			}
			else  //this is the first result so we don't do a comparison for previous or current
			{
				valuesArray = new Array();
				make = VerifyValueElseReturnNone(searchResult[i].getText(makeId, claimUnitJoin, 'group'));
				model = VerifyValueElseReturnNone(searchResult[i].getValue(modelId, claimUnitJoin, 'group'));
				resultYear = VerifyValueElseReturnNone(searchResult[i].getText(yearId, claimUnitJoin, 'group'));
				previousMakeModelYear = make + model + resultYear;
				treadCode = searchResult[i].getValue(treadId, treadJoin, 'group');
				numberOfComplaints = searchResult[i].getValue(numComplaintsId, treadJoin, 'count');
				
				SetTreadCodeCountValue(treadCodeValues, numberOfComplaints, treadCode);						
				
				valuesArray[valuesArray.length] = make;
				valuesArray[valuesArray.length] = model;
				valuesArray[valuesArray.length] = resultYear;
				
				if (searchResult.length == 1) //if there is only one result we set the values and create the nodes now.
				{
					if (CheckValuesNotAllZeroes(treadCodeValues))
					{
						SetValuesArray(valuesArray, treadCodeValues);	
						if (createXML == 'T')
							AddNodesAndValues(xml, parent, child, grandChildArray, valuesArray);
						else if (createExcel == 'T')
						{
							AddExcelRowHeadersAndValues(xml, valuesArray, index, searchResult.length);
							isWorkSheetClosed = true;
						}
					}
				}										
			}
			index = i + 1;
		}
	}
	if (createExcel == 'T' && !isWorkSheetClosed)
		xml.str += '</Table></Worksheet>';
}

/**
 * Goes through the results and creates a grandchild node in the xmlDoc with values from the search result.
 * It creates a new node when the makemodelyear concatenated is different from the previous node and all result lines that
 * has the same makemodelyear combination takes the tread code and sets the value of number of complaints on the correct
 * treadcode that is in an array called valuesarray.
 * @param xml
 * @param parent
 * @param child
 * @param grandChildArray
 * @param searchResult
 * @param makeId
 * @param modelId
 * @param yearId
 * @param treadIdArray
 * @param numComplaintsId
 * @param unitJoinArray
 * @param treadJoin
 */
function SetXMLValuesFromMultipleSearchResult(xml, parent, child, grandChildArray, searchResultsArray, makeId, modelId, yearId, treadIdArray, 
		numComplaintsId, unitJoinArray, treadJoin, createXML, createExcel)
{
	var valuesArray = '';
	var previousMakeModelYear = '';
	var currentMakeModelYear = '';
	var make = '';
	var model = '';
	var resultYear = '';
	var treadCode = '';
	var numberOfComplaints = '';
	
	/* Array equivalent for tread code values. Information purpose only.
	0 suspension02
	1 serviceBrake03
	2 serviceBrakeAir04
	3 parkingBrake05
	4 electrical11
	5 extLighting12
	6 structure16
	7 latch17 = '0';
	8 tiresRelated19
	9 wheels20 = '0';
	10 trailerHitch21
	11 fireRelated23
	*/
	var treadCodeValues = new Array('0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0');
	
	var isWorkSheetClosed = false;  // This checks to make sure the worksheet is always closed after the loop.
	if (createExcel == 'T') {
		AddExcelWorkSheetName(xml, parent, grandChildArray, true);
	}
	var searchResult = '';
	var foundElements = '';
	var foundElementMatch = false;
	var usedFiltersArray = new Array();  //Array of filters already used.
	if (searchResultsArray != null) {
		
		for(var j = 0; j <= searchResultsArray.length; j++) {
			searchResult = searchResultsArray[j];  // Loop through the two searches.
			isWorkSheetClosed = false;  // Reset this so that it gets evaluated on each loop.
			
			if (searchResult != null)
			{
				var index = 0;
				for (var i = 0; i < searchResult.length; i++)
				{
					foundElementMatch = false;
					make = VerifyValueElseReturnNone(searchResult[i].getText(makeId, unitJoinArray[j], 'group'));
					model = VerifyValueElseReturnNone(searchResult[i].getValue(modelId, unitJoinArray[j], 'group'));
					resultYear = VerifyValueElseReturnNone(searchResult[i].getText(yearId, unitJoinArray[j], 'group'));

					if (j == 0) //process found element if there is a match.
					{	
						foundElements = searchResultsArray[1] != null ? GetElementByFormulaText(searchResult[i].getValue('formulatext',null,'group'), searchResultsArray[1], 'group') || '' : '';
						if (foundElements != '') {  // we only care if the element has a match and it has not been set into the used filters array list.
							if (usedFiltersArray.indexOf(searchResult[i].getValue('formulatext',null,'group')) == -1) {
								usedFiltersArray.push(searchResult[i].getValue('formulatext',null,'group'));
								foundElementMatch = true;
							}
							
						}
						else
							foundElementMatch = false;
					}
					else if (j == 1) // process if there is NO match.
					{
						foundElements = searchResultsArray[0] != null ? GetElementByFormulaText(searchResult[i].getValue('formulatext',null,'group'), searchResultsArray[0], 'group') || '' : '';
						if (foundElements != '')
							foundElementMatch = true;
						else
							foundElementMatch = false;
					}
					
					
					// For the first search array we don't care if there is a match or not, all are processed.  For the second search in the array we only want to process results
					// without a match since we've already checked for any results with matches from the first serach iteration.
					if (j == 0 || (j == 1 && !foundElementMatch)) {
						if (i > 0)  
						{
							currentMakeModelYear = make + model + resultYear;
							
							if (currentMakeModelYear == previousMakeModelYear)
							{
								// Get the tread code and the number of complaints from the current search row.
								treadCode = searchResult[i].getValue(treadIdArray[j], treadJoin, 'group');
								numberOfComplaints = searchResult[i].getValue(numComplaintsId, treadJoin, 'count');
								
								SetTreadCodeCountValue(treadCodeValues, numberOfComplaints, treadCode);
								if (foundElementMatch && foundElements != '') {
									for (var k = 0; k < foundElements.length; k++) {
										// Get the treadcode and number of complaints from the matched rows and add them to the tread code count value
										treadCode = foundElements[k].getValue(treadIdArray[1], treadJoin, 'group');
										numberOfComplaints = foundElements[k].getValue(numComplaintsId, treadJoin, 'count');
										SetTreadCodeCountValue(treadCodeValues, numberOfComplaints, treadCode);
									}
								}
								
								if (j == 1 && searchResult.length - 1 == i)  // We've reached the end of the resultlist so we need to set values and add the node.
								{
									if (CheckValuesNotAllZeroes(treadCodeValues))
									{
										SetValuesArray(valuesArray, treadCodeValues);
										
										if (createXML == 'T')
											AddNodesAndValues(xml, parent, child, grandChildArray, valuesArray);
										else if (createExcel == 'T')
										{
											AddExcelRowHeadersAndValuesFromMultiple(xml, valuesArray, index, searchResult.length, j, searchResultsArray.length);
											isWorkSheetClosed = true;
										}
									}
								}	
							}
							else // the current result we are on needs to be on a new node from the previous so first
							{    // we set the values and add the previous data in a node and we start a new  node information by zeroing out treacodevalues.
								if (CheckValuesNotAllZeroes(treadCodeValues))
								{
									SetValuesArray(valuesArray, treadCodeValues);
									
									if (createXML == 'T')
										AddNodesAndValues(xml, parent, child, grandChildArray, valuesArray);
									else if (createExcel == 'T')
									{
										// The last parameter is a special case that stops the closure of the worksheet tag if the current searchresult is the last result, 
										//  it should not close the worksheet since it is only processing the previous searchresult.
										AddExcelRowHeadersAndValuesFromMultiple(xml, valuesArray, index, searchResult.length, j, searchResultsArray.length, j == searchResultsArray.length - 1); 
									}
								}
								valuesArray = new Array();
								previousMakeModelYear = currentMakeModelYear;
								// Get the tread code and the number of complaints from the current search row.
								treadCode = searchResult[i].getValue(treadIdArray[j], treadJoin, 'group');
								numberOfComplaints = searchResult[i].getValue(numComplaintsId, treadJoin, 'count');
								
								treadCodeValues = new Array('0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0');  // we are staring on a new one.
								
								SetTreadCodeCountValue(treadCodeValues, numberOfComplaints, treadCode);
								
								if (foundElementMatch && foundElements != '') {
									for (var k = 0; k < foundElements.length; k++) {
										// Get the treadcode and number of complaints from the matched rows and add them to the tread code count value
										treadCode = foundElements[k].getValue(treadIdArray[1], treadJoin, 'group');
										numberOfComplaints = foundElements[k].getValue(numComplaintsId, treadJoin, 'count');
										SetTreadCodeCountValue(treadCodeValues, numberOfComplaints, treadCode);
									}
								}
								
								valuesArray[valuesArray.length] = make;
								valuesArray[valuesArray.length] = model;
								valuesArray[valuesArray.length] = resultYear;
								if (j == 1 && searchResult.length - 1 == i) // this must be the last result so we must set the values and create the xml node.
								{
									if (CheckValuesNotAllZeroes(treadCodeValues))
									{
										SetValuesArray(valuesArray, treadCodeValues);
										
										if (createXML == 'T')
											AddNodesAndValues(xml, parent, child, grandChildArray, valuesArray);
										else if (createExcel == 'T')
										{
											AddExcelRowHeadersAndValuesFromMultiple(xml, valuesArray, index, searchResult.length, j, searchResultsArray.length);
											isWorkSheetClosed = true;
										}
									}
								}
							}
						}
						else  // This is the first result so we don't do a comparison for previous or current
						{
							valuesArray = new Array();
							previousMakeModelYear = make + model + resultYear;
							// Get the tread code and the number of complaints from the current search row.
							treadCode = searchResult[i].getValue(treadIdArray[j], treadJoin, 'group');
							numberOfComplaints = searchResult[i].getValue(numComplaintsId, treadJoin, 'count');
							
							SetTreadCodeCountValue(treadCodeValues, numberOfComplaints, treadCode);						
							
							if (foundElementMatch && foundElements != '') {
								for (var k = 0; k < foundElements.length; k++) {
									// Get the treadcode and number of complaints from the matched rows and add them to the tread code count value
									treadCode = foundElements[k].getValue(treadIdArray[1], treadJoin, 'group');
									numberOfComplaints = foundElements[k].getValue(numComplaintsId, treadJoin, 'count');
									SetTreadCodeCountValue(treadCodeValues, numberOfComplaints, treadCode);
								}
							}
							
							valuesArray[valuesArray.length] = make;
							valuesArray[valuesArray.length] = model;
							valuesArray[valuesArray.length] = resultYear;
							
							if (j == 1 && searchResult.length == 1) //if there is only one result we set the values and create the nodes now.
							{
								if (CheckValuesNotAllZeroes(treadCodeValues))
								{
									SetValuesArray(valuesArray, treadCodeValues);	
									
									if (createXML == 'T')  // only for XML generation
										AddNodesAndValues(xml, parent, child, grandChildArray, valuesArray);
									else if (createExcel == 'T')  // only for Excel file generation
									{
										AddExcelRowHeadersAndValuesFromMultiple(xml, valuesArray, index, searchResult.length, j, searchResultsArray.length);
										isWorkSheetClosed = true;
									}
								}
							}										
						}
					}
					index = i + 1;
				}
			}
		}
	}
	if (createExcel == 'T' && !isWorkSheetClosed)
		xml.str += '</Table></Worksheet>';
}

/**
 * Returns the index of the match found 
 * @param formulanumeric		Column in the search we filter by
 * @param data					Search result we pass in
 * @param summary				If grouped by count, sum, group, etc.
 * @returns
 */
function GetElementByFormulaText(formulatext, data, summary) 
{
	return data.filter(function(data){return data.getValue('formulatext', null, summary) == formulatext;});
}

/**
 * This method checks if the array being passed in has any value that is not '0'
 * if it does, return true right away.
 * @param treadCodeValues
 * @returns {Boolean}
 */
function CheckValuesNotAllZeroes(treadCodeValues)
{
	var notAllZeroes = false;
	for (var v = 0; v < treadCodeValues.length; v++)
	{
		if (treadCodeValues[v] != '0')
		{
			notAllZeroes = true;
		}			
	}
	return notAllZeroes;
}

/**
 * Sets the treadCodeValues array to the valuesArray.
 * @param valuesArray
 * @param treadCodeValues
 */
function SetValuesArray(valuesArray, treadCodeValues)
{
	for (var i = 0; i < treadCodeValues.length; i++)
	{
		valuesArray[valuesArray.length] = treadCodeValues[i];
	}
}

/**
 * Sets the number of Complaints value to the matching treadCode.
 * @param treadCodeValues
 * @param numberOfComplaints
 * @param treadCode
 */
function SetTreadCodeCountValue(treadCodeValues, numberOfComplaints, treadCode)
{
	for (var i = 0; i < treadCodeValues.length; i++)
	{
		if (treadCode == ConvertNSFieldToString(i + 1))
			treadCodeValues[i] = (parseInt(treadCodeValues[i]) + parseInt(numberOfComplaints)).toString();
	}
}

/**
 * Removes the children of all parents in the respected arrays assuming all parents only has one child.  There is a special situation where
 * there is only one parent in the removeParentArray but has multiple Children in the removeChildArray.
 * in this case the singleParent is set to true.
 * @param xmlDoc
 * @param removeParentArray
 * @param removeChildArray
 */
function RemoveChildNode(xmlDoc, removeParentArray, removeChildArray)
{
	var singleParent = true;
	var j = 0;
	if (removeParentArray.length == removeChildArray.length)
		singleParent = false;
	for (var i = 0; i < removeChildArray.length; i++)
	{
		if (!singleParent)  //handles when there is single or multiple parent.
			j = i;
			
		var xpath = "//*[name() = '" + removeParentArray[j] + "']";
		var node = nlapiSelectNode(xmlDoc, xpath);
		var xpathChild = "//*[name() = '" + removeChildArray[i] + "']";
		var childNode = nlapiSelectNode(node, xpathChild);

		childNode.parentNode.removeChild(childNode);
	}
}

/**
 * This script is called when the user clicks the Generate XML button, it resolves back to the suitelet setting custparam_createxml to 'T'
 * this will indicate if an xml document should be generated, this client-side script also passes the date for the suitelet to work with.
 */
function CreateXMLDocClientScript()
{
	var date = new Date(nlapiGetFieldValue('custpage_datefield')) || '';
	
	date = date.getFullYear() || '' != '' ? nlapiDateToString(date, "MM/DD/YYYY") : '';
	
	var suiteletURL = '';
	
	if (date == '')
		alert('Please enter value(s) for: Enter Date');
	else
		suiteletURL = nlapiResolveURL('SUITELET', 'customscriptgd_treadxmldocgeneratr_suite', 'customdeploygd_treadxmldocgeneratr_deplo');
	
	if (suiteletURL != '')
	{
		suiteletURL += 
		'&custparam_date=' + date +
		'&custparam_createxml=' + 'T';
		window.ischanged = false; // mark that window that it hasn't changed so we don't get any dialog popups asking us if we want to continue
		document.location = suiteletURL;
	}
}

/**
 * This script is called when the user clicks the Generate Excel button, it resolves back to the suitelet setting custparam_createexcel to 'T'
 * this will indicate if an excel document should be generated, this client-side script also passes the date for the suitelet to work with.
 */
function CreateExcelDocClientScript()
{
	var date = new Date(nlapiGetFieldValue('custpage_datefield')) || '';
	
	date = date.getFullYear() || '' != '' ? nlapiDateToString(date, "MM/DD/YYYY") : '';
	
	var suiteletURL = '';
	
	if (date == '')
		alert('Please enter value(s) for: Enter Date');
	else
		suiteletURL = nlapiResolveURL('SUITELET', 'customscriptgd_treadxmldocgeneratr_suite', 'customdeploygd_treadxmldocgeneratr_deplo');
	
	if (suiteletURL != '')
	{
		suiteletURL += 
		'&custparam_date=' + date +
		'&custparam_createexcel=' + 'T';
		window.ischanged = false; // mark that window that it hasn't changed so we don't get any dialog popups asking us if we want to continue
		document.location = suiteletURL;
	}
}

/**
 * This script is called when the user clicks the submit button, it resolves back to the suitelet setting custparam_createxml to 'T'
 * this will indicate if an xml document should be generated, this client-side script also passes the date for the suitelet to work with.
 */
function CreateDIXMLDocClientScript()
{
	var date = new Date(nlapiGetFieldValue('custpage_datefield')) || '';
	
	date = date.getFullYear() || '' != '' ? nlapiDateToString(date, "MM/DD/YYYY") : '';
	
	var suiteletURL = '';
	
	if (date == '')
		alert('Please enter value(s) for: Enter Date');
	else
		suiteletURL = nlapiResolveURL('SUITELET', 'customscriptgd_ditreadxmldocgen_suitelet', 'customdeploygd_ditreadxmldocgen_deploy');
	
	if (suiteletURL != '')
	{
		suiteletURL += 
		'&custparam_date=' + date +
		'&custparam_createxml=' + 'T';
		window.ischanged = false; // mark that window that it hasn't changed so we don't get any dialog popups asking us if we want to continue
		document.location = suiteletURL;
	}
}

/**
 * This script is called when the user clicks the submit button, it resolves back to the suitelet setting custparam_createxml to 'T'
 * this will indicate if an xml document should be generated, this client-side script also passes the date for the suitelet to work with.
 */
function CreateDIExcelDocClientScript()
{
	var date = new Date(nlapiGetFieldValue('custpage_datefield')) || '';
	
	date = date.getFullYear() || '' != '' ? nlapiDateToString(date, "MM/DD/YYYY") : '';
	
	var suiteletURL = '';
	
	if (date == '')
		alert('Please enter value(s) for: Enter Date');
	else
		suiteletURL = nlapiResolveURL('SUITELET', 'customscriptgd_ditreadxmldocgen_suitelet', 'customdeploygd_ditreadxmldocgen_deploy');
	
	if (suiteletURL != '')
	{
		suiteletURL += 
		'&custparam_date=' + date +
		'&custparam_createexcel=' + 'T';
		window.ischanged = false; // mark that window that it hasn't changed so we don't get any dialog popups asking us if we want to continue
		document.location = suiteletURL;
	}
}

/**
 * This script is called when the user clicks the submit button, it resolves back to the suitelet setting custparam_createsubsimxml to 'T'
 * this will indicate if an xml document should be generated, this client-side script also passes the date for the suitelet to work with.
 */
function CreateSSXMLDocClientScript()
{
	var date = new Date(nlapiGetFieldValue('custpage_datefield')) || '';
	
	date = date.getFullYear() || '' != '' ? nlapiDateToString(date, "MM/DD/YYYY") : '';
	
	var toDate = new Date(nlapiGetFieldValue('custpage_todatefield')) || '';

	toDate = toDate.getFullYear() || '' != '' ? nlapiDateToString(toDate, "MM/DD/YYYY") : '';
		
	var suiteletURL = '';
	
	if (date == '' || toDate == '')
		alert('Please enter value(s) for: Enter From Date and/or Enter To Date');
	else
		suiteletURL = nlapiResolveURL('SUITELET', 'customscriptgd_substantiallysimilarxmlge', 'customdeploygd_substantiallysimilarxmlde');
	
	if (suiteletURL != '')
	{
		suiteletURL += 
		'&custparam_subsimdate=' + date +
		'&custparam_subsimtodate=' + toDate +
		'&custparam_createsubsimxml=' + 'T';
		window.ischanged = false; // mark that window that it hasn't changed so we don't get any dialog popups asking us if we want to continue
		document.location = suiteletURL;
	}
}

/**
 * This script is called when the user clicks the submit button, it resolves back to the suitelet setting custparam_createsubsimxml to 'T'
 * this will indicate if an xml document should be generated, this client-side script also passes the date for the suitelet to work with.
 */
function CreateSSExcelDocClientScript()
{
	var date = new Date(nlapiGetFieldValue('custpage_datefield')) || '';
	
	date = date.getFullYear() || '' != '' ? nlapiDateToString(date, "MM/DD/YYYY") : '';
	
	var toDate = new Date(nlapiGetFieldValue('custpage_todatefield')) || '';

	toDate = toDate.getFullYear() || '' != '' ? nlapiDateToString(toDate, "MM/DD/YYYY") : '';
		
	var suiteletURL = '';
	
	if (date == '' || toDate == '')
		alert('Please enter value(s) for: Enter From Date and/or Enter To Date');
	else
		suiteletURL = nlapiResolveURL('SUITELET', 'customscriptgd_substantiallysimilarxmlge', 'customdeploygd_substantiallysimilarxmlde');
	
	if (suiteletURL != '')
	{
		suiteletURL += 
		'&custparam_subsimdate=' + date +
		'&custparam_subsimtodate=' + toDate +
		'&custparam_createsubsimexcel=' + 'T';
		window.ischanged = false; // mark that window that it hasn't changed so we don't get any dialog popups asking us if we want to continue
		document.location = suiteletURL;
	}
}

/**
 * This method adds the nodes/elements into the child node as grandchildren and sets the values for them according to the 
 * valuesArray that is passed.  
 * @param xmlDoc
 * @param parent
 * @param child
 * @param grandChildArray
 * @param valuesArray
 */
function AddNodesAndValues(xmlDoc, parent, child, grandChildArray, valuesArray)
{
	if (parent != null) //only the parent exist in the current xmlDoc so child and grandchildresn needs to be created.
	{
		var xpath = "//*[name() = '" + parent + "']";
		
		var newTextNode = xmlDoc.createTextNode(" ");
		var newChild = xmlDoc.createElement(child);
		var textNodeArray = new Array();
		var elementArray = new Array();
		
		if (grandChildArray.length > 0 && valuesArray.length > 0)
		{
			for (var i = 0; i < grandChildArray.length; i++)
			{
				textNodeArray[textNodeArray.length] = xmlDoc.createTextNode(" ");
				elementArray[elementArray.length] = xmlDoc.createElement(grandChildArray[i]);
				
				newChild.appendChild(elementArray[elementArray.length - 1]); // This adds the grandChild to the newchild.
				elementArray[elementArray.length - 1].appendChild(textNodeArray[textNodeArray.length - 1]); //this adds the textnode to the element
				elementArray[elementArray.length - 1]["textContent"] = valuesArray[i];  // This sets the value for the element
			}
			var node = nlapiSelectNode(xmlDoc, xpath);
			node.appendChild(newChild);
			node.appendChild(newTextNode);  //without creating textnode the xml is not complete and shows as '<xml/>' instead of '<xml></xml>'
		}
	}
	else // This means that we add elements to the child directly and that the child exist already so we don't need a parent assuming the name of
	{    // the child is unique in the entire xmlDoc.
		var xpath = "//*[name() = '" + child + "']";
		var textNodeArray = new Array();
		var elementArray = new Array();
		var node = nlapiSelectNode(xmlDoc, xpath);
		
		if (grandChildArray.length > 0 && valuesArray.length > 0)
		{
			for (var i = 0; i < grandChildArray.length; i++)
			{
				textNodeArray[textNodeArray.length] = xmlDoc.createTextNode(" ");
				elementArray[elementArray.length] = xmlDoc.createElement(grandChildArray[i]);
				
				node.appendChild(elementArray[elementArray.length - 1]);
				elementArray[elementArray.length - 1].appendChild(textNodeArray[textNodeArray.length - 1]);
				elementArray[elementArray.length - 1]["textContent"] = valuesArray[i];
			}
		}
	}
}

function AddExcelWorkSheetName(xmlExcelString, tabName, headers, isUsingHeaderClass) {
	xmlExcelString.str += '<Worksheet ss:Name="' + tabName + '"><Table>';
	xmlExcelString.str += '<Column ss:AutoFitWidth="0" ss:Width="60"/>';
	xmlExcelString.str += '<Column ss:AutoFitWidth="0" ss:Width="57"/>';
	xmlExcelString.str += '<Row>';
	var headerClass = 's23';
	headerClass = isUsingHeaderClass ? headerClass : 's24';
	for (var i = 0; i < headers.length; i++) {
		xmlExcelString.str +='<Cell ss:StyleID="' + headerClass + '"><Data ss:Type="String">' + headers[i] + '</Data></Cell>';
	}
    xmlExcelString.str += '</Row>';
}

/**
 * This method adds the headers into the xmlstring according to the 
 * valuesArray that is passed.
 * The last parameter (isIgnoreLastIndex) is a special case to stop the closure of the worksheet if the current searchresult is the last result, 
 * 	it should not close th worksheet since it is only processing the previous searchresult
 * @param xmlExcelString
 * @param valuesArray
 */
function AddExcelRowHeadersAndValues(xmlExcelString, valuesArray, index, arrayLength, isIgnoreLastIndex) {    
	xmlExcelString.str += '<Row>';
	for (var i = 0; i < valuesArray.length; i++) {
		xmlExcelString.str += '<Cell><Data ss:Type="String">' + valuesArray[i] + '</Data></Cell>';
	}
	xmlExcelString.str += '</Row>';
	
    if(index == arrayLength - 1 && !isIgnoreLastIndex) {
		xmlExcelString.str += '</Table></Worksheet>';
	}
}

/**
 * This method adds the headers into the xmlstring according to the 
 * valuesArray that is passed.
 * The last parameter (isIgnoreLastIndex) is a special case to stop the closure of the worksheet if the current searchresult is the last result, 
 * 	it should not close th worksheet since it is only processing the previous searchresult
 * @param xmlExcelString
 * @param valuesArray
 */
function AddExcelRowHeadersAndValuesFromMultiple(xmlExcelString, valuesArray, individualSearchIndex, individualArrayLength, arrayOfSearchesIndex, arrayOfSearchesLength, isIgnoreLastIndex) {	
	xmlExcelString.str += '<Row>';
	for (var i = 0; i < valuesArray.length; i++) {
		xmlExcelString.str += '<Cell><Data ss:Type="String">' + valuesArray[i] + '</Data></Cell>';
	}
	xmlExcelString.str += '</Row>';
	
	if(individualSearchIndex == individualArrayLength - 1 && !isIgnoreLastIndex && arrayOfSearchesIndex == arrayOfSearchesLength - 1) {
		xmlExcelString.str += '</Table></Worksheet>';
	}
}

/**
 * Returns NONE if there is no data from the search results.  The validator complaints when passing an empty string.
 * @param value
 * @returns
 */
function VerifyValueElseReturnNone(value)
{
	if (value != null && value != '')
		return value;
	else
	{
		value = 'NONE';
		return value;
	}
}

/**
 * User enters a date which is converted into a range that is a quarter within the year of the given date.
 * Searches are loaded depending on this date range and data is then set on an xml doc that is then created for
 * the user to save.
 * XML File ID: 154638 for GD Sandbox
 * XSD File ID: 154639 for GD Sandbox
 * XML File ID: 203216 for GD Live
 * XSD File ID: 203214 for GD Live
 * @param {nlobjRequest} request Request object
 * @param {nlobjResponse} response Response object
 * @returns {Void} Any output is written via response object
 */
function SendDITreadXMLDocSuitelet(request, response)
{
	if (request.getMethod() == 'GET')
	{
		// toggle for xml creationg or excel creation.
		var createXML = request.getParameter('custparam_createxml');
		var createExcel = request.getParameter('custparam_createexcel');
		
		var custparamDate = request.getParameter('custparam_date');
		
		
		if (createXML == 'T' || createExcel == 'T')
		{
			// Quarters
			// Jan-Mar = 1
			// Apr-Jun = 2
			// Jul-Sep = 3
			// Oct-Dec = 4
			var date = new Date(custparamDate);
			var month = date.getMonth();
			var year = date.getFullYear();
			var beginDateRange = '';
			var endDateRange = '';
			var beginMonth = 0;
			var endMonth = 0;
			var quarter = '';   //ReportInfo data
			var today = new Date();
			var currDate = ConvertNSFieldToString(today.getDate());
			var currMonth = ConvertNSFieldToString(today.getMonth() + 1);
			var currYear = today.getFullYear();
			if (currDate.length == 1)
				currDate = '0' + currDate;
			if (currMonth.length == 1)
				currMonth = '0' + currMonth;
			var todaysDate = currYear + '-' + currMonth + '-' + currDate;   //ReportInfo data
			
			if (month < 3) //Q1
			{
				beginMonth = 0;
				endMonth = 2;
				quarter = 1;
			}
			else if (month < 6) //Q2
			{
				beginMonth = 3;
				endMonth = 5;
				quarter = 2;
			}
			else if (month < 9) //Q3
			{
				beginMonth = 6;
				endMonth = 8;
				quarter = 3;
			}
			else //Q4
			{
				beginMonth = 9;
				endMonth = 11;
				quarter = 4;
			}
			beginDateRange = new Date(year, beginMonth, 1);
			endDateRange = new Date(year, endMonth + 1, 0);
			if (date != null)
			{
				/*REPORTINFO DATA*/
				var companyInfo = nlapiLoadConfiguration('companyinformation');
				var companyName = '852';
				var userId = nlapiGetUser();
				var userInfo = nlapiLookupField('employee', userId, ['email', 'phone', 'entityid']);
				/*REPORTINFO DATA*/
				
				/* BEGIN LOAD SEARCH RESULTS */
				var diFilters = new Array();
				diFilters[diFilters.length] = new nlobjSearchFilter('created', null, 'onorafter', beginDateRange);
				diFilters[diFilters.length] = new nlobjSearchFilter('created', null, 'onorbefore', endDateRange);
				diFilters[diFilters.length] = new nlobjSearchFilter('custrecordrvsunitnotetreadcode', null, 'anyof', ['14', '16']);
				var cols = new Array();
				cols[cols.length] = new nlobjSearchColumn('name', 'custrecordrvsunitnotesunit');
				cols[cols.length] = new nlobjSearchColumn('custrecordunit_series', 'custrecordrvsunitnotesunit');
				cols[cols.length] = new nlobjSearchColumn('custrecordunit_model', 'custrecordrvsunitnotesunit');
				cols[cols.length] = new nlobjSearchColumn('custrecordunit_modelyear', 'custrecordrvsunitnotesunit');
				var diSearchResult = nlapiSearchRecord('customrecordrvsunitnotes', null, diFilters, cols) || '';
				var diSearchResultLength = 0;
				if (diSearchResult != '')
					diSearchResultLength = diSearchResult.length;
				
				//This 'Support Cases' section was added as a part of the Customer Services Change Order on 8/23/16 - BrianS
				/* BEGIN LOAD CASE SEARCH RESULTS */
				var diFilters = new Array();
				diFilters[diFilters.length] = new nlobjSearchFilter('createddate', null, 'onorafter', beginDateRange);
				diFilters[diFilters.length] = new nlobjSearchFilter('createddate', null, 'onorbefore', endDateRange);
				diFilters[diFilters.length] = new nlobjSearchFilter('custeventgd_casetreadcode', null, 'anyof', ['14', '16']);
				var cols = new Array();
				cols[cols.length] = new nlobjSearchColumn('name', 'custeventgd_vinnumber');
				cols[cols.length] = new nlobjSearchColumn('custrecordunit_series', 'custeventgd_vinnumber');
				cols[cols.length] = new nlobjSearchColumn('custrecordunit_model', 'custeventgd_vinnumber');
				cols[cols.length] = new nlobjSearchColumn('custrecordunit_modelyear', 'custeventgd_vinnumber');
				var diCaseSearchResult = nlapiSearchRecord('supportcase', null, diFilters, cols) || '';
				var diCaseSearchResultLength = 0;
				if (diCaseSearchResult != '')
					diCaseSearchResultLength = diCaseSearchResult.length;
				/* END LOAD CASE SEARCH RESULTS */
				
				/* END LOAD SEARCH RESULTS */

				var xmlDoc = '';
				var xsdDoc = '';
				var xmlExcelString = {str: ''};
				if (createXML == 'T') {
					/* LOAD XMLDOC FROM FILE */
					var xmlFile = nlapiLoadFile(203216);
					var xmlString = xmlFile.getValue();
					xmlDoc = nlapiStringToXML(xmlString);
					/* LOAD XMLDOC FROM FILE*/
					
					/* Load XMLXSD FROM FILE */
					var xsdFile = nlapiLoadFile(203214);
					var xsdString = xsdFile.getValue();
					xsdDoc = nlapiStringToXML(xsdString);  //This is not being used because the netsuite xml validator is very picky/not working.
					/* Load XMLXSD FROM FILE */
				} else if (createExcel == 'T') {  // Initialize excel file
					xmlExcelString.str = '<?xml version="1.0"?><?mso-application progid="Excel.Sheet"?>';
					xmlExcelString.str += '<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet" ';
					xmlExcelString.str += 'xmlns:o="urn:schemas-microsoft-com:office:office" ';
					xmlExcelString.str += 'xmlns:x="urn:schemas-microsoft-com:office:excel" ';
					xmlExcelString.str += 'xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet" ';
					xmlExcelString.str += 'xmlns:html="http://www.w3.org/TR/REC-html40">';
					xmlExcelString.str += '<Styles>';
					xmlExcelString.str += '<Style ss:ID="s23">';
					xmlExcelString.str += '<Alignment ss:Vertical="Bottom" ss:Rotate="90"/>';
					xmlExcelString.str += '<Borders>';
					xmlExcelString.str += '<Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1"/>';
					xmlExcelString.str += '<Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1"/>';
					xmlExcelString.str += '<Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1"/>';
					xmlExcelString.str += '<Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1"/>';
					xmlExcelString.str += '</Borders>';
					xmlExcelString.str += '<Interior ss:Color="#c4ffc6" ss:Pattern="Solid"/>';
					xmlExcelString.str += '</Style>';
					xmlExcelString.str += '<Style ss:ID="s24">';
					xmlExcelString.str += '<Borders>';
					xmlExcelString.str += '<Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1"/>';
					xmlExcelString.str += '<Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1"/>';
					xmlExcelString.str += '<Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1"/>';
					xmlExcelString.str += '<Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1"/>';
					xmlExcelString.str += '</Borders>';
					xmlExcelString.str += '<Interior ss:Color="#c4ffc6" ss:Pattern="Solid"/>';
					xmlExcelString.str += '</Style>';
					xmlExcelString.str += '</Styles>';
				}
				
				/* BEGIN REMOVE CHILDREN */
				var removeParentArray = new Array('DeathsInjuries');
				var removeChildArray = new Array('DiTrailer');
				if (createXML == 'T')
					RemoveChildNode(xmlDoc, removeParentArray, removeChildArray);
				
				var removeSingleParentArray = new Array('ReportInfo');
				var removeReportInfoChildArray = new Array('ManufacturerName', 'ReportQuarter', 'ReportYear', 'ReportName', 'ReportVersion', 
						'ReportGeneratedDate', 'ReportContactName', 'ReportContactEmail', 'ReportContactPhone', 'NHTSATemplateRevisionNo');
				if (createXML == 'T')
					RemoveChildNode(xmlDoc, removeSingleParentArray, removeReportInfoChildArray);
				/* END REMOVE CHILDREN */
				
				/* BEGIN ADD GRANDCHILDREN */
				
				/* ReportInfo */
				var child = 'ReportInfo';
				var grandChildArray = new Array('ManufacturerName', 'ReportQuarter', 'ReportYear', 'ReportName', 'ReportVersion', 
						'ReportGeneratedDate', 'ReportContactName', 'ReportContactEmail', 'ReportContactPhone', 'NHTSATemplateRevisionNo');
				var valuesArray = new Array();
				valuesArray[valuesArray.length] = nlapiEscapeXML(VerifyValueElseReturnNone(companyName));
				valuesArray[valuesArray.length] = VerifyValueElseReturnNone(quarter);
				valuesArray[valuesArray.length] = VerifyValueElseReturnNone(year);
				valuesArray[valuesArray.length] = 'TrailersDI';
				valuesArray[valuesArray.length] = 1;
				valuesArray[valuesArray.length] = todaysDate;
				valuesArray[valuesArray.length] = VerifyValueElseReturnNone(userInfo.entityid);
				valuesArray[valuesArray.length] = VerifyValueElseReturnNone(userInfo.email);
				if (userInfo.phone.length < 7)
					userInfo.phone = '574-825-8000';
				valuesArray[valuesArray.length] = userInfo.phone;
				valuesArray[valuesArray.length] = '1.2';
				if (createXML == 'T')
					AddNodesAndValues(xmlDoc, null, child, grandChildArray, valuesArray);
				else if (createExcel == 'T') {
					AddExcelWorkSheetName(xmlExcelString, child, new Array('InfoName', 'InfoValue'));  // Initialize worksheet or excel tab and the first row or headers in the excel file.
					var arrayLength = grandChildArray.length;
					for (var i = 0; i < arrayLength; i++) {
						AddExcelRowHeadersAndValues(xmlExcelString, new Array(grandChildArray[i], valuesArray[i]), i, arrayLength);  // each loop is a row in excel.
					}
				}
				/* ReportInfo */
				
				/* DeathsInjuries */
				var parent = 'DeathsInjuries';
				child = 'DiTrailer';
				grandChildArray = new Array('SeqID', 'ManUniqueID', 'Make', 'Model', 'ModelYear', 'VIN', 'IncidentDate', 
						'NumDeaths', 'NumInjuries', 'StateOrFCntry', 'SysOrCompA', 'SysOrCompB', 'SysOrCompC', 'SysOrCompD', 'SysOrCompE');
				valuesArray = '';
				var diProdDate = '';
				
				if (diSearchResult != '')
				{
					AddExcelWorkSheetName(xmlExcelString, parent, grandChildArray, true);  // set the worsheet begin tag and set the headers.
					for (var i = 0; i < diSearchResultLength; i++)
					{
						valuesArray = new Array();
						valuesArray[valuesArray.length] = ' ';
						valuesArray[valuesArray.length] = ' ';						
						valuesArray[valuesArray.length] = VerifyValueElseReturnNone(diSearchResult[i].getText('custrecordunit_series', 'custrecordrvsunitnotesunit')); // Vehicle Make
						valuesArray[valuesArray.length] = VerifyValueElseReturnNone(diSearchResult[i].getText('custrecordunit_model', 'custrecordrvsunitnotesunit')); // Model
						valuesArray[valuesArray.length] = VerifyValueElseReturnNone(diSearchResult[i].getText('custrecordunit_modelyear', 'custrecordrvsunitnotesunit')); // Vehicle Model Year
						valuesArray[valuesArray.length] = VerifyValueElseReturnNone(diSearchResult[i].getValue('name', 'custrecordrvsunitnotesunit')); // VIN
						valuesArray[valuesArray.length] = ' ';
						valuesArray[valuesArray.length] = ' ';
						valuesArray[valuesArray.length] = ' ';
						valuesArray[valuesArray.length] = ' ';
						valuesArray[valuesArray.length] = ' ';
						valuesArray[valuesArray.length] = ' ';
						valuesArray[valuesArray.length] = ' ';
						valuesArray[valuesArray.length] = ' ';
						valuesArray[valuesArray.length] = ' ';
						if (createXML == 'T')
							AddNodesAndValues(xmlDoc, parent, child, grandChildArray, valuesArray);
						else if (createExcel == 'T') {
							AddExcelRowHeadersAndValues(xmlExcelString, valuesArray, i, diSearchResultLength + diCaseSearchResultLength);  // set the rows and close the table and worksheet.
						}
					}
				}
				else
				{
					valuesArray = new Array();
					valuesArray[valuesArray.length] = ' ';
					valuesArray[valuesArray.length] = ' ';
					valuesArray[valuesArray.length] = ' ';
					valuesArray[valuesArray.length] = ' ';
					valuesArray[valuesArray.length] = ' '; 
					valuesArray[valuesArray.length] = ' ';
					valuesArray[valuesArray.length] = ' ';
					valuesArray[valuesArray.length] = ' ';
					valuesArray[valuesArray.length] = ' ';
					valuesArray[valuesArray.length] = ' ';
					valuesArray[valuesArray.length] = ' '; 
					valuesArray[valuesArray.length] = ' '; 
					valuesArray[valuesArray.length] = ' '; 
					valuesArray[valuesArray.length] = ' ';
					valuesArray[valuesArray.length] = ' ';
					if (createXML == 'T')
						AddNodesAndValues(xmlDoc, parent, child, grandChildArray, valuesArray);
				}
				
				// --- Processing Support Cases -------//
				//This 'Support Cases' section was added as a part of the Customer Services Change Order on 8/23/16 - BrianS
				if (diCaseSearchResult != '')
				{
					diSearchResultLength == 0 ? AddExcelWorkSheetName(xmlExcelString, parent, grandChildArray, true) : '';
					for (var i = 0; i < diCaseSearchResult.length; i++)
					{
						valuesArray = new Array();
						valuesArray[valuesArray.length] = ' ';
						valuesArray[valuesArray.length] = ' ';						
						valuesArray[valuesArray.length] = VerifyValueElseReturnNone(diCaseSearchResult[i].getText('custrecordunit_series', 'custeventgd_vinnumber')); // Vehicle Make
						valuesArray[valuesArray.length] = VerifyValueElseReturnNone(diCaseSearchResult[i].getText('custrecordunit_model', 'custeventgd_vinnumber')); // Model
						valuesArray[valuesArray.length] = VerifyValueElseReturnNone(diCaseSearchResult[i].getText('custrecordunit_modelyear', 'custeventgd_vinnumber')); // Vehicle Model Year
						valuesArray[valuesArray.length] = VerifyValueElseReturnNone(diCaseSearchResult[i].getValue('name', 'custeventgd_vinnumber')); // VIN
						valuesArray[valuesArray.length] = ' ';
						valuesArray[valuesArray.length] = ' ';
						valuesArray[valuesArray.length] = ' ';
						valuesArray[valuesArray.length] = ' ';
						valuesArray[valuesArray.length] = ' ';
						valuesArray[valuesArray.length] = ' ';
						valuesArray[valuesArray.length] = ' ';
						valuesArray[valuesArray.length] = ' ';
						valuesArray[valuesArray.length] = ' ';
						if (createXML == 'T')
							AddNodesAndValues(xmlDoc, parent, child, grandChildArray, valuesArray);
						else if (createExcel == 'T') {
							// both disearch and dicasesearch results are combined as death injuries so on the excel file creation we need to add the lengths when checking
							// if we are at the end of the results so we don't close too early.
							AddExcelRowHeadersAndValues(xmlExcelString, valuesArray, i + diSearchResultLength, diCaseSearchResultLength + diSearchResultLength);
						}
					}
				}
				else
				{
					valuesArray = new Array();
					valuesArray[valuesArray.length] = ' ';
					valuesArray[valuesArray.length] = ' ';
					valuesArray[valuesArray.length] = ' ';
					valuesArray[valuesArray.length] = ' ';
					valuesArray[valuesArray.length] = ' '; 
					valuesArray[valuesArray.length] = ' ';
					valuesArray[valuesArray.length] = ' ';
					valuesArray[valuesArray.length] = ' ';
					valuesArray[valuesArray.length] = ' ';
					valuesArray[valuesArray.length] = ' ';
					valuesArray[valuesArray.length] = ' '; 
					valuesArray[valuesArray.length] = ' '; 
					valuesArray[valuesArray.length] = ' '; 
					valuesArray[valuesArray.length] = ' ';
					valuesArray[valuesArray.length] = ' ';
					if (createXML == 'T')
						AddNodesAndValues(xmlDoc, parent, child, grandChildArray, valuesArray);
					else if (createExcel == 'T') {
						diSearchResultLength == 0 ? AddExcelWorkSheetName(xmlExcelString, parent, grandChildArray, true) : '';
						AddExcelRowHeadersAndValues(xmlExcelString, valuesArray, 0 + diSearchResultLength, 1 + diSearchResultLength);
					}
				}
				// -END- Processing Support Cases -------//
				/* DeathsInjuries */
				if (createXML == 'T') {
					response.setContentType('XMLDOC', 'NHTSA_Death_And_Injury.xml');
					response.write(xmlDoc);
				} else if (createExcel == 'T') {
					xmlExcelString.str += '</Workbook>';  // close the workbook tag
					// create the excel file.
					var xlsFile = nlapiCreateFile('NHTSA_Death_And_Injury.xls', 'EXCEL', nlapiEncrypt(xmlExcelString.str, 'base64'));
					response.setContentType('EXCEL', 'NHTSA_Death_And_Injury.xls');
					response.write(xlsFile.getValue());
				}
			}
		}
		else
		{
			/* Create a form with date field for user to enter a certain date where they want to generate the xml tread codes reports
			 * in that quarter */
			var form = nlapiCreateForm('Create NHTSA Death & Injury Tread XML Doc', false);
			form.setScript('customscriptgd_treadxmldocgen_client');
			var dateField = form.addField('custpage_datefield', 'date', 'Enter Date', null, null);
//			dateField.setMandatory(true);
			
			form.addButton('createxmldocbutton', 'Generate XML', 'CreateDIXMLDocClientScript');
			form.addButton('createexceldocbutton', 'Generate Excel', 'CreateDIExcelDocClientScript');
			form.addSubmitButton('Reset');
			response.writePage(form);
		}
	}
	else //POST
	{
		/* Resets the Form */
		nlapiSetRedirectURL('SUITELET', 'customscriptgd_ditreadxmldocgen_suitelet', 'customdeploygd_ditreadxmldocgen_deploy', null, null);
	}
}

/**
 * User enters a date which is converted into a range that is a quarter within the year of the given date.
 * Searches are loaded depending on this date range and data is then set on an xml doc that is then created for
 * the user to save.
 * XML File ID: 155575 for GD Sandbox
 * XSD File ID: 155576 for GD Sandbox
 * XML File ID: 328136 for GD Live
 * XSD File ID: 328137 for GD Live
 * @param {nlobjRequest} request Request object
 * @param {nlobjResponse} response Response object
 * @returns {Void} Any output is written via response object
 */
function SendSubstantiallySimilarXMLDocSuitelet(request, response)
{
	if (request.getMethod() == 'GET')
	{
		// Toggle between xml report or excel report
		var createXML = request.getParameter('custparam_createsubsimxml');
		var createExcel = request.getParameter('custparam_createsubsimexcel');
		// Date range
		var custparamDate = request.getParameter('custparam_subsimdate');
		var custparamToDate = request.getParameter('custparam_subsimtodate');
		
		if (createXML == 'T' || createExcel == 'T')
		{
//			// Quarters
//			// Jan-Mar = 1
//			// Apr-Jun = 2
//			// Jul-Sep = 3
//			// Oct-Dec = 4
			var date = new Date(custparamToDate);
			var month = date.getMonth();
			var year = date.getFullYear();
			var beginDateRange = '';
			var endDateRange = '';
			var beginMonth = 0;
			var endMonth = 0;
			var quarter = '';   //ReportInfo data
			var today = new Date();
			var currDate = ConvertNSFieldToString(today.getDate());
			var currMonth = ConvertNSFieldToString(today.getMonth() + 1);
			var currYear = today.getFullYear();
			if (currDate.length == 1)
				currDate = '0' + currDate;
			if (currMonth.length == 1)
				currMonth = '0' + currMonth;
			var todaysDate = currYear + '-' + currMonth + '-' + currDate;   //ReportInfo data
			
			if (month < 3) //Q1
			{
				beginMonth = 0;
				endMonth = 2;
				quarter = 4;
			}
			else if (month < 6) //Q2
			{
				beginMonth = 3;
				endMonth = 5;
				quarter = 1;
			}
			else if (month < 9) //Q3
			{
				beginMonth = 6;
				endMonth = 8;
				quarter = 2;
			}
			else //Q4
			{
				beginMonth = 9;
				endMonth = 11;
				quarter = 3;
			}
			beginDateRange = custparamDate; //new Date(year - 9, endMonth + 1, 0);
			endDateRange = custparamToDate; //new Date(year, endMonth + 1, 0);
			if (beginDateRange != null && endDateRange != null)
			{
				/*REPORTINFO DATA*/
				var companyInfo = nlapiLoadConfiguration('companyinformation');
				var companyName = '852';
				var userId = nlapiGetUser();
				var userInfo = nlapiLookupField('employee', userId, ['email', 'phone', 'entityid']);
				/*REPORTINFO DATA*/
				
				/* BEGIN LOAD SEARCH RESULTS */
				var subSimFilters = new Array();
				subSimFilters[subSimFilters.length] = new nlobjSearchFilter('custrecordunit_actualofflinedate', null, 'onorafter', beginDateRange);
				subSimFilters[subSimFilters.length] = new nlobjSearchFilter('custrecordunit_actualofflinedate', null, 'onorbefore', endDateRange);
//				diFilters[diFilters.length] = new nlobjSearchFilter('custrecordrvsunitnotetreadcode', null, 'anyof', ['14', '16']);
				var cols = new Array();
				cols[cols.length] = new nlobjSearchColumn('custrecordunit_series', null, 'group');
				cols[cols.length] = new nlobjSearchColumn('custrecordunit_model', null, 'group');
				cols[cols.length] = new nlobjSearchColumn('custrecordunit_modelyear', null, 'group');
				var subSimSearchResult = nlapiSearchRecord('customrecordrvsunit', null, subSimFilters, cols);
				/* END LOAD SEARCH RESULTS */

				var xmlDoc = '';
				var xsdDoc = '';
				var xmlExcelString = {str: ''};
				if (createXML == 'T') {
					/* LOAD XMLDOC FROM FILE */
					var xmlFile = nlapiLoadFile(NHTSA_SUBSTANTIALLYSIMILAR_XML);
					var xmlString = xmlFile.getValue();
					xmlDoc = nlapiStringToXML(xmlString);
					/* LOAD XMLDOC FROM FILE*/
					
					/* Load XMLXSD FROM FILE */
					var xsdFile = nlapiLoadFile(NHTSA_SUBSTANTIALLYSIMILAR_XSD);
					var xsdString = xsdFile.getValue();
					xsdDoc = nlapiStringToXML(xsdString);  //This is not being used because the netsuite xml validator is very picky/not working.
					/* Load XMLXSD FROM FILE */
				} else if (createExcel == 'T') {
					xmlExcelString.str = '<?xml version="1.0"?><?mso-application progid="Excel.Sheet"?>';
					xmlExcelString.str += '<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet" ';
					xmlExcelString.str += 'xmlns:o="urn:schemas-microsoft-com:office:office" ';
					xmlExcelString.str += 'xmlns:x="urn:schemas-microsoft-com:office:excel" ';
					xmlExcelString.str += 'xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet" ';
					xmlExcelString.str += 'xmlns:html="http://www.w3.org/TR/REC-html40">';
					xmlExcelString.str += '<Styles>';
					xmlExcelString.str += '<Style ss:ID="s23">';
					xmlExcelString.str += '<Alignment ss:Vertical="Bottom" ss:Rotate="90"/>';
					xmlExcelString.str += '<Borders>';
					xmlExcelString.str += '<Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1"/>';
					xmlExcelString.str += '<Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1"/>';
					xmlExcelString.str += '<Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1"/>';
					xmlExcelString.str += '<Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1"/>';
					xmlExcelString.str += '</Borders>';
					xmlExcelString.str += '<Interior ss:Color="#c4ffc6" ss:Pattern="Solid"/>';
					xmlExcelString.str += '</Style>';
					xmlExcelString.str += '<Style ss:ID="s24">';
					xmlExcelString.str += '<Borders>';
					xmlExcelString.str += '<Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1"/>';
					xmlExcelString.str += '<Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1"/>';
					xmlExcelString.str += '<Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1"/>';
					xmlExcelString.str += '<Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1"/>';
					xmlExcelString.str += '</Borders>';
					xmlExcelString.str += '<Interior ss:Color="#c4ffc6" ss:Pattern="Solid"/>';
					xmlExcelString.str += '</Style>';
					xmlExcelString.str += '</Styles>';
				}
				
				/* BEGIN REMOVE CHILDREN */
				var removeParentArray = new Array('SimilarVehicles');
				var removeChildArray = new Array('SsVehicle');
				if (createXML == 'T')
					RemoveChildNode(xmlDoc, removeParentArray, removeChildArray);
				
				var removeSingleParentArray = new Array('ReportInfo');
				var removeReportInfoChildArray = new Array('ManufacturerName', 'ReportQuarter', 'ReportYear', 'ReportName', 'ReportVersion', 
						'ReportGeneratedDate', 'ReportContactName', 'ReportContactEmail', 'ReportContactPhone', 'NHTSATemplateRevisionNo');
				if (createXML == 'T')
					RemoveChildNode(xmlDoc, removeSingleParentArray, removeReportInfoChildArray);
				/* END REMOVE CHILDREN */
				
				/* BEGIN ADD GRANDCHILDREN */
				
				/* ReportInfo */
				var child = 'ReportInfo';
				var grandChildArray = new Array('ManufacturerName', 'ReportQuarter', 'ReportYear', 'ReportName', 'ReportVersion', 
						'ReportGeneratedDate', 'ReportContactName', 'ReportContactEmail', 'ReportContactPhone', 'NHTSATemplateRevisionNo');
				var valuesArray = new Array();
				valuesArray[valuesArray.length] = nlapiEscapeXML(VerifyValueElseReturnNone(companyName));
				valuesArray[valuesArray.length] = VerifyValueElseReturnNone(quarter);
				valuesArray[valuesArray.length] = VerifyValueElseReturnNone(year);
				valuesArray[valuesArray.length] = 'SubstantiallySimilarVehicles';
				valuesArray[valuesArray.length] = 1;
				valuesArray[valuesArray.length] = todaysDate;
				valuesArray[valuesArray.length] = VerifyValueElseReturnNone(userInfo.entityid);
				valuesArray[valuesArray.length] = VerifyValueElseReturnNone(userInfo.email);
				if (userInfo.phone.length < 7)
					userInfo.phone = '574-825-8000';
				valuesArray[valuesArray.length] = userInfo.phone;
				valuesArray[valuesArray.length] = '1.2';
				if (createXML == 'T')
					AddNodesAndValues(xmlDoc, null, child, grandChildArray, valuesArray);
				else if (createExcel == 'T') {
                    AddExcelWorkSheetName(xmlExcelString, child, new Array('InfoName', 'InfoValue'));  // initialize the worksheet (excel tab sheet) and the first row or headers.
                    var arrayLength = grandChildArray.length;
                    for (var i = 0; i < arrayLength; i++) {
                        AddExcelRowHeadersAndValues(xmlExcelString, new Array(grandChildArray[i], valuesArray[i]), i, arrayLength);  // each loop is a row in excel
                    }
				}
				/* ReportInfo */
				
				/* SimilarVehicles */
				var parent = 'SimilarVehicles';
				child = 'SsVehicle';
				grandChildArray = new Array('Make', 'Model', 'ModelYear', 'ForeignManufacturer', 'ForeignMake', 
						'ForeignModel', 'ForeignModelYear', 'ForeignMarkets');
				valuesArray = '';
				var diProdDate = '';
				
				if (subSimSearchResult != null)
				{
					if (createExcel == 'T')
						AddExcelWorkSheetName(xmlExcelString, parent, grandChildArray, true); // initialize the worksheet (excel tab sheet) and the first row or headers.
					for (var i = 0; i < subSimSearchResult.length; i++)
					{
						valuesArray = new Array();
						valuesArray[valuesArray.length] = VerifyValueElseReturnNone(subSimSearchResult[i].getText('custrecordunit_series', null, 'group')); // Vehicle Make
						valuesArray[valuesArray.length] = VerifyValueElseReturnNone(subSimSearchResult[i].getText('custrecordunit_model', null, 'group')); // Model
						valuesArray[valuesArray.length] = VerifyValueElseReturnNone(subSimSearchResult[i].getText('custrecordunit_modelyear', null, 'group')); // Vehicle Model Year
						valuesArray[valuesArray.length] = 'Grand Design RV'; // VIN
						valuesArray[valuesArray.length] = VerifyValueElseReturnNone(subSimSearchResult[i].getText('custrecordunit_series', null, 'group')); // Vehicle Make
						valuesArray[valuesArray.length] = VerifyValueElseReturnNone(subSimSearchResult[i].getText('custrecordunit_model', null, 'group')); // Model
						valuesArray[valuesArray.length] = VerifyValueElseReturnNone(subSimSearchResult[i].getText('custrecordunit_modelyear', null, 'group')); // Vehicle Model Year
						valuesArray[valuesArray.length] = 'Canada';
                        if (createXML == 'T')
                        	AddNodesAndValues(xmlDoc, parent, child, grandChildArray, valuesArray);
                        else if (createExcel == 'T') {
                            AddExcelRowHeadersAndValues(xmlExcelString, valuesArray, i, subSimSearchResult.length); // each loop is a row in excel
                        }
					}
				}
				else
				{
					valuesArray = new Array();
					valuesArray[valuesArray.length] = ' ';
					valuesArray[valuesArray.length] = ' ';
					valuesArray[valuesArray.length] = ' ';
					valuesArray[valuesArray.length] = ' ';
					valuesArray[valuesArray.length] = ' ';
					valuesArray[valuesArray.length] = ' ';
					valuesArray[valuesArray.length] = ' ';
					valuesArray[valuesArray.length] = ' ';
                    if (createXML == 'T')
                    	AddNodesAndValues(xmlDoc, parent, child, grandChildArray, valuesArray);
                    else if (createExcel == 'T') {
                    	AddExcelWorkSheetName(xmlExcelString, parent, grandChildArray, true); // initialize the worksheet (excel tab sheet) and the first row or headers.
                        AddExcelRowHeadersAndValues(xmlExcelString, valuesArray, 0, 1); // each loop is a row in excel
                    }
				}
				/* SimilarVehicles */
                if (createXML == 'T') {
					response.setContentType('XMLDOC', 'NHTSA_Substantially_Similar.xml');
					response.write(xmlDoc);
                } else if (createExcel == 'T') {
	                xmlExcelString.str += '</Workbook>';
	                nlapiSubmitField('salesorder', 1262915, 'custbodygd_flatworldresponse', xmlExcelString.str);
	                var xlsFile = nlapiCreateFile('NHTSA_Substantially_Similar.xls', 'EXCEL', nlapiEncrypt(xmlExcelString.str, 'base64'));
	                response.setContentType('EXCEL', 'NHTSA_Substantially_Similar.xls');
	                response.write(xlsFile.getValue());
	            }
			}
		}
		else
		{
			/* Create a form with date field for user to enter a certain date where they want to generate the xml tread codes reports
			 * in that quarter */
			var form = nlapiCreateForm('Create NHTSA Substantially Similar Tread XML Doc', false);
			form.setScript('customscriptgd_treadxmldocgen_client');
			var dateField = form.addField('custpage_datefield', 'date', 'Enter From Date', null, null);
//			dateField.setMandatory(true);
			dateField = form.addField('custpage_todatefield', 'date', 'Enter To Date', null, null);
//			dateField.setMandatory(true);
			
			form.addButton('createxmldocbutton', 'Generate XML', 'CreateSSXMLDocClientScript');
			form.addButton('createxmldocbutton', 'Generate Excel', 'CreateSSExcelDocClientScript');
			form.addSubmitButton('Reset');
			response.writePage(form);
		}
	}
	else //POST
	{
		/* Resets the Form */
		nlapiSetRedirectURL('SUITELET', 'customscriptgd_substantiallysimilarxmlge', 'customdeploygd_substantiallysimilarxmlde', null, null);
	}
}