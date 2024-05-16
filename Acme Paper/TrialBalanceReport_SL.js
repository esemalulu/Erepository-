
var FLDGRP_FILTER = 'custpage_fldgrp_filter';
var FLDGRP_TABLE = 'custpage_fldgrp_table';
var FLD_START_DATE = 'custpage_startdate';
var FLD_END_DATE = 'custpage_enddate';
var FLD_DATA = 'custpage_data';
var BTN_EXPORT = 'custpage_export';
var FLD_TABLE_HTML = 'custpage_table_html';
var SCRIPT_REPORT_DATA = 'customscript_trial_bal_report_script_cs';

/**
 * @param {nlobjRequest} request Request object
 * @param {nlobjResponse} response Response object
 * @returns {Void} Any output is written via response object
 */
function showReportSuitelet(request, response){
    var frmMain;
	var fldStartDate;
	var fldEndDate;
    var fldTable;
	var sContent = '';
    var oDates = getFirstAndLastDayCurrentMonth();
	
	if(request.getMethod() == 'POST' && request.getParameter(FLD_DATA)) {
		exportExcel(request, response);
	}
	else {
		sContent += "	<script type=\"text\/javascript\" src=\"https:\/\/www.gstatic.com\/charts\/loader.js\"><\/script>";
		sContent += "	<div style=\"margin-top:10px;\">";
		sContent += "		<div id=\"table_div\"><\/div>";
		sContent += "		<div id=\"toolbar_div\"><\/div>";
		sContent += "	<\/div>";

		//form creation
		frmMain = nlapiCreateForm('Monthly Trial Balance Report');
		frmMain.addButton(BTN_EXPORT,'Export','jQuery(\'#export_link\').click();');
		frmMain.addFieldGroup(FLDGRP_FILTER,'Filter',null);
		frmMain.addFieldGroup(FLDGRP_TABLE,'Report',null);

        fldStartDate = frmMain.addField(FLD_START_DATE, 'date', 'Start Date', null, FLDGRP_FILTER).setDisplaySize(140);
		fldEndDate = frmMain.addField(FLD_END_DATE, 'date', 'End Date', null, FLDGRP_FILTER).setDisplaySize(140);
        
		fldTable = frmMain.addField(FLD_TABLE_HTML, 'inlinehtml',null, null,FLDGRP_TABLE);
		frmMain.addField(FLD_DATA, 'longtext').setDisplayType('hidden');

		//set default values
		fldStartDate.setDefaultValue(oDates.first);
		fldEndDate.setDefaultValue(oDates.last);
		fldTable.setDefaultValue(sContent);

		frmMain.setScript(SCRIPT_REPORT_DATA);
		response.writePage(frmMain);
	}
}

/**
 * This function exports the data passed into excel file.
 *
 * @param {nlobjRequest} request Request object
 * @param {nlobjResponse} response Response object
 * @returns {Void} 
 */
function exportExcel(oRequest, oResponse) {
	var sXML = '';
	var oFile;
	var idFile;
	var aData = JSON.parse(decodeURIComponent(oRequest.getParameter(FLD_DATA)));
	
	sXML += '<?xml version="1.0"?><?mso-application progid="Excel.Sheet"?>'; 
	sXML += '<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet" ';
	sXML += 'xmlns:o="urn:schemas-microsoft-com:office:office" ';
	sXML += 'xmlns:x="urn:schemas-microsoft-com:office:excel" ';
	sXML += 'xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet" ';
	sXML += 'xmlns:html="http://www.w3.org/TR/REC-html40">'; 

	sXML += '<Worksheet ss:Name="Sheet1">';
	sXML += '<Table>';
	aData.forEach(function(aInnData){
		sXML += '<Row>'; 
		aInnData.forEach(function(sItem){
			sXML += '<Cell><Data ss:Type="String">'+sItem+'</Data></Cell>';
		});
		sXML += '</Row>';
	});
	sXML += '</Table></Worksheet></Workbook>';

	//create file
	oFile = nlapiCreateFile('Export.xls', 'EXCEL', nlapiEncrypt(sXML, 'base64'));
    
    oResponse.setContentType(oFile.getType(), 'MonthlyTrialBalanceReport.xls');
    oResponse.write(oFile.getValue());
}


function getFirstAndLastDayCurrentMonth() {
    var dDate = new Date();
    var dTemp;
    var oReturn = {};
    
    dTemp = nlapiStringToDate(nlapiDateToString(dDate));
    do {
        oReturn.first = nlapiDateToString(dTemp);
        dTemp.setDate(dTemp.getDate() - 1);
    } while(dTemp.getMonth() == dDate.getMonth());
    
    dTemp = nlapiStringToDate(nlapiDateToString(dDate));
    do {
        oReturn.last = nlapiDateToString(dTemp);
        dTemp.setDate(dTemp.getDate() + 1);
    } while(dTemp.getMonth() == dDate.getMonth());
    
    return oReturn;   
}
