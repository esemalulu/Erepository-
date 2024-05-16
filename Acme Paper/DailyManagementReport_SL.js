var REC_DIVISION = 'customrecord_cseg_accrete_divisi';
var FLDGRP_FILTER = 'custpage_fldgrp_filter';
var FLDGRP_TABLE = 'custpage_fldgrp_table';
var FLD_DATE = 'custpage_date';
var FLD_EXPORT = 'custpage_export';
var FLD_TABLE_HTML = 'custpage_table_html';
var BTN_EXPORT = 'custpage_btn_export';
var DIVISION_TO_EXCLUDE = ['ACME', 'SHOP', 'RICHMOND'];

var SCRIPT_REPORT = 'customscript_daily_mngmt_report_sl';
var DEPLOY_REPORT = 'customdeploy_daily_mngmt_report_sl';

var HC_COUNT_FIELDS = ['invoices_warehouse', 'invoices_direct_sale', 'invoices_other', 'invoices_total', 'credits_warehouse', 'credits_direct_sale', 'credits_other', 'credits_total'];

var aGlobalDivisions = [];
var aDivisionId = [];
var hasNone = false;

/**
 * @param {nlobjRequest} request Request object
 * @param {nlobjResponse} response Response object
 * @returns {Void} Any output is written via response object
 */
function showReportSuitelet(request, response) {
    var frmMain;
    var fldDate, fldTable;
    var sContent = "";
    var dParamDate, dLastYear;
    var aDivisions;
    var oDates, oData;
    var aPeriods = ['daily', 'mtd', 'ytd'];
    var aExportData = [];
    var sURL = nlapiResolveURL('SUITELET', SCRIPT_REPORT, DEPLOY_REPORT);

    if (request.getParameter(FLD_DATE))
        dParamDate = nlapiStringToDate(request.getParameter(FLD_DATE));
    else
        dParamDate = new Date();

    dLastYear = new Date(dParamDate.getFullYear() - 1, dParamDate.getMonth(), dParamDate.getDate());

    if (dParamDate.getMonth() == 1 && dParamDate.getDate() == 29) {
        dLastYear.setDate(dLastYear.getDate() - 1);
    }

    oDates = {
        this_year: {
            daily: { start: nlapiDateToString(dParamDate), end: nlapiDateToString(dParamDate) },
            mtd: { start: nlapiDateToString(new Date(dParamDate.getFullYear(), dParamDate.getMonth(), 1)), end: nlapiDateToString(dParamDate) },
            ytd: { start: nlapiDateToString(new Date(dParamDate.getFullYear(), 0, 1)), end: nlapiDateToString(dParamDate) }
        },
        last_year: {
            daily: { start: nlapiDateToString(dLastYear), end: nlapiDateToString(dLastYear) },
            mtd: { start: nlapiDateToString(new Date(dLastYear.getFullYear(), dLastYear.getMonth(), 1)), end: nlapiDateToString(dLastYear) },
            ytd: { start: nlapiDateToString(new Date(dLastYear.getFullYear(), 0, 1)), end: nlapiDateToString(dLastYear) }
        },
    };

    frmMain = nlapiCreateForm('Daily Management Status Report');
    frmMain.addSubmitButton('Submit');
    frmMain.addFieldGroup(FLDGRP_FILTER, 'Filter', null);

    fldDate = frmMain.addField(FLD_DATE, 'date', 'Date', null, FLDGRP_FILTER).setDisplaySize(160);
    fldDate.setDefaultValue(nlapiDateToString(dParamDate));

    frmMain.addField(FLD_EXPORT, 'checkbox', 'Export?', null, FLDGRP_FILTER).setDisplayType('hidden');

    if (request.getParameter(FLD_DATE)) {
        sURL += '&' + FLD_DATE + '=' + request.getParameter(FLD_DATE);
        sURL += '&' + FLD_EXPORT + '=T';
        frmMain.addButton(BTN_EXPORT, 'Export', 'window.open(\'' + sURL + '\');');

        frmMain.addFieldGroup(FLDGRP_TABLE, 'Report', null);
        fldTable = frmMain.addField(FLD_TABLE_HTML, 'inlinehtml', null, null, FLDGRP_TABLE);

        oData = {
            this_year: {
                daily: getData(oDates.this_year.daily.start, oDates.this_year.daily.end),
                mtd: getData(oDates.this_year.mtd.start, oDates.this_year.mtd.end),
                ytd: getData(oDates.this_year.ytd.start, oDates.this_year.ytd.end)
            },
            last_year: {
                daily: getData(oDates.last_year.daily.start, oDates.last_year.daily.end),
                mtd: getData(oDates.last_year.mtd.start, oDates.last_year.mtd.end),
                ytd: getData(oDates.last_year.ytd.start, oDates.last_year.ytd.end)
            },
        };
        if (hasNone == true) {
            aGlobalDivisions.push({
                id: 'none',
                name: '- No Division -'
            });
        }
        aGlobalDivisions.push({
            id: 'total',
            name: 'Grand Totals'
        });
        aDivisions = aGlobalDivisions;

        aExportData.push(['DATE:', nlapiDateToString(dParamDate)]);
        aExportData.push(['']);

        sContent += "<style>.report-table {width: 1000px;} .report-table th, .report-table td {padding: 2px 5px;}<\/style>";
        aDivisions.forEach(function (oDivision) {
            sContent += "    <br>";
            sContent += "    <table class=\"report-table\">";
            sContent += "        <tr class=\"uir-list-headerrow\">";
            sContent += "           <th class=\"uir-list-header-td\" colspan=\"10\"><center>" + (!isNaN(oDivision.id) ? "DIVISION: " : "") + oDivision.name.toUpperCase() + "<\/center><\/th>";
            sContent += "        <\/tr>";
            sContent += "        <tr class=\"uir-list-headerrow\">";
            sContent += "           <th class=\"uir-list-header-td\" colspan=\"2\">&nbsp;<\/th>";
            sContent += "           <th class=\"uir-list-header-td\" colspan=\"4\"><center>THIS YEAR<\/center><\/th>";
            sContent += "           <th class=\"uir-list-header-td\" colspan=\"4\"><center>LAST YEAR<\/center><\/th>";
            sContent += "        <\/tr>";
            sContent += "        <tr class=\"uir-list-headerrow\">";
            sContent += "           <th class=\"uir-list-header-td\" colspan=\"2\">SALES<\/th>";
            sContent += "           <th class=\"uir-list-header-td\">WAREHOUSE<\/th>";
            sContent += "           <th class=\"uir-list-header-td\">DIRECT SALE<\/th>";
            sContent += "           <th class=\"uir-list-header-td\">OTHER<\/th>";
            sContent += "           <th class=\"uir-list-header-td\">TOTAL<\/th>";
            sContent += "           <th class=\"uir-list-header-td\">WAREHOUSE<\/th>";
            sContent += "           <th class=\"uir-list-header-td\">DIRECT SALE<\/th>";
            sContent += "           <th class=\"uir-list-header-td\">OTHER<\/th>";
            sContent += "           <th class=\"uir-list-header-td\">TOTAL<\/th>";
            sContent += "        <\/tr>";

            aExportData.push([(!isNaN(oDivision.id) ? "DIVISION: " : "") + oDivision.name.toUpperCase()]);
            aExportData.push(['', '', 'THIS YEAR', '', '', '', 'LAST YEAR', '', '', '']);
            aExportData.push(['SALES', '', 'WAREHOUSE', 'DIRECT SALE', 'OTHER', 'TOTAL', 'WAREHOUSE', 'DIRECT SALE', 'OTHER', 'TOTAL']);

            aPeriods.forEach(function (sPeriod) {
                sContent += "        <tr class=\"uir-list-row-cell uir-list-row-even\">";
                sContent += "            <td class=\"uir-list-row-cell\" rowspan=\"8\"><center>" + sPeriod.toUpperCase().split('').join('<br>') + "<\/center><\/td>";
                sContent += "            <td class=\"uir-list-row-cell\">INVOICES<\/td>";
                sContent += "            <td class=\"uir-list-row-cell\" style=\"text-align: right;\">" + getCellData(oData, 'this_year', sPeriod, oDivision.id, 'invoices_warehouse') + "<\/td>";
                sContent += "            <td class=\"uir-list-row-cell\" style=\"text-align: right;\">" + getCellData(oData, 'this_year', sPeriod, oDivision.id, 'invoices_direct_sale') + "<\/td>";
                sContent += "            <td class=\"uir-list-row-cell\" style=\"text-align: right;\">" + getCellData(oData, 'this_year', sPeriod, oDivision.id, 'invoices_other') + "<\/td>";
                sContent += "            <td class=\"uir-list-row-cell\" style=\"text-align: right;\">" + getCellData(oData, 'this_year', sPeriod, oDivision.id, 'invoices_total') + "<\/td>";
                sContent += "            <td class=\"uir-list-row-cell\" style=\"text-align: right;\">" + getCellData(oData, 'last_year', sPeriod, oDivision.id, 'invoices_warehouse') + "<\/td>";
                sContent += "            <td class=\"uir-list-row-cell\" style=\"text-align: right;\">" + getCellData(oData, 'last_year', sPeriod, oDivision.id, 'invoices_direct_sale') + "<\/td>";
                sContent += "            <td class=\"uir-list-row-cell\" style=\"text-align: right;\">" + getCellData(oData, 'last_year', sPeriod, oDivision.id, 'invoices_other') + "<\/td>";
                sContent += "            <td class=\"uir-list-row-cell\" style=\"text-align: right;\">" + getCellData(oData, 'last_year', sPeriod, oDivision.id, 'invoices_total') + "<\/td>";
                sContent += "        <\/tr>";
                sContent += "        <tr class=\"uir-list-row-cell uir-list-row-even\">";
                sContent += "            <td class=\"uir-list-row-cell\">CREDITS<\/td>";
                sContent += "            <td class=\"uir-list-row-cell\" style=\"text-align: right;\">" + getCellData(oData, 'this_year', sPeriod, oDivision.id, 'credits_warehouse') + "<\/td>";
                sContent += "            <td class=\"uir-list-row-cell\" style=\"text-align: right;\">" + getCellData(oData, 'this_year', sPeriod, oDivision.id, 'credits_direct_sale') + "<\/td>";
                sContent += "            <td class=\"uir-list-row-cell\" style=\"text-align: right;\">" + getCellData(oData, 'this_year', sPeriod, oDivision.id, 'credits_other') + "<\/td>";
                sContent += "            <td class=\"uir-list-row-cell\" style=\"text-align: right;\">" + getCellData(oData, 'this_year', sPeriod, oDivision.id, 'credits_total') + "<\/td>";
                sContent += "            <td class=\"uir-list-row-cell\" style=\"text-align: right;\">" + getCellData(oData, 'last_year', sPeriod, oDivision.id, 'credits_warehouse') + "<\/td>";
                sContent += "            <td class=\"uir-list-row-cell\" style=\"text-align: right;\">" + getCellData(oData, 'last_year', sPeriod, oDivision.id, 'credits_direct_sale') + "<\/td>";
                sContent += "            <td class=\"uir-list-row-cell\" style=\"text-align: right;\">" + getCellData(oData, 'last_year', sPeriod, oDivision.id, 'credits_other') + "<\/td>";
                sContent += "            <td class=\"uir-list-row-cell\" style=\"text-align: right;\">" + getCellData(oData, 'last_year', sPeriod, oDivision.id, 'credits_total') + "<\/td>";
                sContent += "        <\/tr>";
                sContent += "        <tr class=\"uir-list-row-cell uir-list-row-even\">";
                sContent += "            <td class=\"uir-list-row-cell\">NET SALES<\/td>";
                sContent += "            <td class=\"uir-list-row-cell\" style=\"text-align: right;\">" + getCellData(oData, 'this_year', sPeriod, oDivision.id, 'net_sales_warehouse') + "<\/td>";
                sContent += "            <td class=\"uir-list-row-cell\" style=\"text-align: right;\">" + getCellData(oData, 'this_year', sPeriod, oDivision.id, 'net_sales_direct_sale') + "<\/td>";
                sContent += "            <td class=\"uir-list-row-cell\" style=\"text-align: right;\">" + getCellData(oData, 'this_year', sPeriod, oDivision.id, 'net_sales_other') + "<\/td>";
                sContent += "            <td class=\"uir-list-row-cell\" style=\"text-align: right;\">" + getCellData(oData, 'this_year', sPeriod, oDivision.id, 'net_sales_total') + "<\/td>";
                sContent += "            <td class=\"uir-list-row-cell\" style=\"text-align: right;\">" + getCellData(oData, 'last_year', sPeriod, oDivision.id, 'net_sales_warehouse') + "<\/td>";
                sContent += "            <td class=\"uir-list-row-cell\" style=\"text-align: right;\">" + getCellData(oData, 'last_year', sPeriod, oDivision.id, 'net_sales_direct_sale') + "<\/td>";
                sContent += "            <td class=\"uir-list-row-cell\" style=\"text-align: right;\">" + getCellData(oData, 'last_year', sPeriod, oDivision.id, 'net_sales_other') + "<\/td>";
                sContent += "            <td class=\"uir-list-row-cell\" style=\"text-align: right;\">" + getCellData(oData, 'last_year', sPeriod, oDivision.id, 'net_sales_total') + "<\/td>";
                sContent += "        <\/tr>";
                sContent += "        <tr class=\"uir-list-row-cell uir-list-row-even\">";
                sContent += "            <td class=\"uir-list-row-cell\">--- G/L COST ---<\/td>";
                sContent += "            <td class=\"uir-list-row-cell\">" + "" + "<\/td>";
                sContent += "            <td class=\"uir-list-row-cell\">" + "" + "<\/td>";
                sContent += "            <td class=\"uir-list-row-cell\">" + "" + "<\/td>";
                sContent += "            <td class=\"uir-list-row-cell\">" + "" + "<\/td>";
                sContent += "            <td class=\"uir-list-row-cell\">" + "" + "<\/td>";
                sContent += "            <td class=\"uir-list-row-cell\">" + "" + "<\/td>";
                sContent += "            <td class=\"uir-list-row-cell\">" + "" + "<\/td>";
                sContent += "            <td class=\"uir-list-row-cell\">" + "" + "<\/td>";
                sContent += "        <\/tr>";
                sContent += "        <tr class=\"uir-list-row-cell uir-list-row-even\">";
                sContent += "            <td class=\"uir-list-row-cell\">NET COST OF SALES<\/td>";
                sContent += "            <td class=\"uir-list-row-cell\" style=\"text-align: right;\">" + getCellData(oData, 'this_year', sPeriod, oDivision.id, 'net_cost_of_sales_warehouse') + "<\/td>";
                sContent += "            <td class=\"uir-list-row-cell\" style=\"text-align: right;\">" + getCellData(oData, 'this_year', sPeriod, oDivision.id, 'net_cost_of_sales_direct_sale') + "<\/td>";
                sContent += "            <td class=\"uir-list-row-cell\" style=\"text-align: right;\">" + getCellData(oData, 'this_year', sPeriod, oDivision.id, 'net_cost_of_sales_other') + "<\/td>";
                sContent += "            <td class=\"uir-list-row-cell\" style=\"text-align: right;\">" + getCellData(oData, 'this_year', sPeriod, oDivision.id, 'net_cost_of_sales_total') + "<\/td>";
                sContent += "            <td class=\"uir-list-row-cell\" style=\"text-align: right;\">" + getCellData(oData, 'last_year', sPeriod, oDivision.id, 'net_cost_of_sales_warehouse') + "<\/td>";
                sContent += "            <td class=\"uir-list-row-cell\" style=\"text-align: right;\">" + getCellData(oData, 'last_year', sPeriod, oDivision.id, 'net_cost_of_sales_direct_sale') + "<\/td>";
                sContent += "            <td class=\"uir-list-row-cell\" style=\"text-align: right;\">" + getCellData(oData, 'last_year', sPeriod, oDivision.id, 'net_cost_of_sales_other') + "<\/td>";
                sContent += "            <td class=\"uir-list-row-cell\" style=\"text-align: right;\">" + getCellData(oData, 'last_year', sPeriod, oDivision.id, 'net_cost_of_sales_total') + "<\/td>";
                sContent += "        <\/tr>";
                sContent += "        <tr class=\"uir-list-row-cell uir-list-row-even\">";
                sContent += "            <td class=\"uir-list-row-cell\">NET PROFIT<\/td>";
                sContent += "            <td class=\"uir-list-row-cell\" style=\"text-align: right;\">" + getCellData(oData, 'this_year', sPeriod, oDivision.id, 'net_profit_warehouse') + "<\/td>";
                sContent += "            <td class=\"uir-list-row-cell\" style=\"text-align: right;\">" + getCellData(oData, 'this_year', sPeriod, oDivision.id, 'net_profit_direct_sale') + "<\/td>";
                sContent += "            <td class=\"uir-list-row-cell\" style=\"text-align: right;\">" + getCellData(oData, 'this_year', sPeriod, oDivision.id, 'net_profit_other') + "<\/td>";
                sContent += "            <td class=\"uir-list-row-cell\" style=\"text-align: right;\">" + getCellData(oData, 'this_year', sPeriod, oDivision.id, 'net_profit_total') + "<\/td>";
                sContent += "            <td class=\"uir-list-row-cell\" style=\"text-align: right;\">" + getCellData(oData, 'last_year', sPeriod, oDivision.id, 'net_profit_warehouse') + "<\/td>";
                sContent += "            <td class=\"uir-list-row-cell\" style=\"text-align: right;\">" + getCellData(oData, 'last_year', sPeriod, oDivision.id, 'net_profit_direct_sale') + "<\/td>";
                sContent += "            <td class=\"uir-list-row-cell\" style=\"text-align: right;\">" + getCellData(oData, 'last_year', sPeriod, oDivision.id, 'net_profit_other') + "<\/td>";
                sContent += "            <td class=\"uir-list-row-cell\" style=\"text-align: right;\">" + getCellData(oData, 'last_year', sPeriod, oDivision.id, 'net_profit_total') + "<\/td>";
                sContent += "        <\/tr>";
                sContent += "        <tr class=\"uir-list-row-cell uir-list-row-even\">";
                sContent += "            <td class=\"uir-list-row-cell\">GP%<\/td>";
                sContent += "            <td class=\"uir-list-row-cell\" style=\"text-align: right;\">" + getCellData(oData, 'this_year', sPeriod, oDivision.id, 'gp_warehouse') + "<\/td>";
                sContent += "            <td class=\"uir-list-row-cell\" style=\"text-align: right;\">" + getCellData(oData, 'this_year', sPeriod, oDivision.id, 'gp_direct_sale') + "<\/td>";
                sContent += "            <td class=\"uir-list-row-cell\" style=\"text-align: right;\">" + getCellData(oData, 'this_year', sPeriod, oDivision.id, 'gp_other') + "<\/td>";
                sContent += "            <td class=\"uir-list-row-cell\" style=\"text-align: right;\">" + getCellData(oData, 'this_year', sPeriod, oDivision.id, 'gp_total') + "<\/td>";
                sContent += "            <td class=\"uir-list-row-cell\" style=\"text-align: right;\">" + getCellData(oData, 'last_year', sPeriod, oDivision.id, 'gp_warehouse') + "<\/td>";
                sContent += "            <td class=\"uir-list-row-cell\" style=\"text-align: right;\">" + getCellData(oData, 'last_year', sPeriod, oDivision.id, 'gp_direct_sale') + "<\/td>";
                sContent += "            <td class=\"uir-list-row-cell\" style=\"text-align: right;\">" + getCellData(oData, 'last_year', sPeriod, oDivision.id, 'gp_other') + "<\/td>";
                sContent += "            <td class=\"uir-list-row-cell\" style=\"text-align: right;\">" + getCellData(oData, 'last_year', sPeriod, oDivision.id, 'gp_total') + "<\/td>";
                sContent += "        <\/tr>";
                sContent += "        <tr class=\"uir-list-row-cell uir-list-row-even\">";
                sContent += "            <td class=\"uir-list-row-cell\">TOTAL PIECES<\/td>";
                sContent += "            <td class=\"uir-list-row-cell\" style=\"text-align: right;\">" + getCellData(oData, 'this_year', sPeriod, oDivision.id, 'quantity_warehouse') + "<\/td>";
                sContent += "            <td class=\"uir-list-row-cell\" style=\"text-align: right;\">" + getCellData(oData, 'this_year', sPeriod, oDivision.id, 'quantity_direct_sale') + "<\/td>";
                sContent += "            <td class=\"uir-list-row-cell\" style=\"text-align: right;\">" + getCellData(oData, 'this_year', sPeriod, oDivision.id, 'quantity_other') + "<\/td>";
                sContent += "            <td class=\"uir-list-row-cell\" style=\"text-align: right;\">" + getCellData(oData, 'this_year', sPeriod, oDivision.id, 'quantity_total') + "<\/td>";
                sContent += "            <td class=\"uir-list-row-cell\" style=\"text-align: right;\">" + getCellData(oData, 'last_year', sPeriod, oDivision.id, 'quantity_warehouse') + "<\/td>";
                sContent += "            <td class=\"uir-list-row-cell\" style=\"text-align: right;\">" + getCellData(oData, 'last_year', sPeriod, oDivision.id, 'quantity_direct_sale') + "<\/td>";
                sContent += "            <td class=\"uir-list-row-cell\" style=\"text-align: right;\">" + getCellData(oData, 'last_year', sPeriod, oDivision.id, 'quantity_other') + "<\/td>";
                sContent += "            <td class=\"uir-list-row-cell\" style=\"text-align: right;\">" + getCellData(oData, 'last_year', sPeriod, oDivision.id, 'quantity_total') + "<\/td>";
                sContent += "        <\/tr>";
                sContent += "        <tr class=\"uir-list-row-cell uir-list-row-even\">";
                sContent += "           <td class=\"uir-list-row-cell\" colspan=\"10\">&nbsp;<\/td>";
                sContent += "        <\/tr>";

                if (request.getParameter(FLD_EXPORT) == 'T') {
                    aExportData.push([
                        sPeriod.toUpperCase(),
                        'INVOICES',
                        getCellData(oData, 'this_year', sPeriod, oDivision.id, 'invoices_warehouse'),
                        getCellData(oData, 'this_year', sPeriod, oDivision.id, 'invoices_direct_sale'),
                        getCellData(oData, 'this_year', sPeriod, oDivision.id, 'invoices_other'),
                        getCellData(oData, 'this_year', sPeriod, oDivision.id, 'invoices_total'),
                        getCellData(oData, 'last_year', sPeriod, oDivision.id, 'invoices_warehouse'),
                        getCellData(oData, 'last_year', sPeriod, oDivision.id, 'invoices_direct_sale'),
                        getCellData(oData, 'last_year', sPeriod, oDivision.id, 'invoices_other'),
                        getCellData(oData, 'last_year', sPeriod, oDivision.id, 'invoices_total')
                    ]);
                    aExportData.push([
                        '',
                        'CREDITS',
                        getCellData(oData, 'this_year', sPeriod, oDivision.id, 'credits_warehouse'),
                        getCellData(oData, 'this_year', sPeriod, oDivision.id, 'credits_direct_sale'),
                        getCellData(oData, 'this_year', sPeriod, oDivision.id, 'credits_other'),
                        getCellData(oData, 'this_year', sPeriod, oDivision.id, 'credits_total'),
                        getCellData(oData, 'last_year', sPeriod, oDivision.id, 'credits_warehouse'),
                        getCellData(oData, 'last_year', sPeriod, oDivision.id, 'credits_direct_sale'),
                        getCellData(oData, 'last_year', sPeriod, oDivision.id, 'credits_other'),
                        getCellData(oData, 'last_year', sPeriod, oDivision.id, 'credits_total')
                    ]);
                    aExportData.push([
                        '',
                        'NET SALES',
                        getCellData(oData, 'this_year', sPeriod, oDivision.id, 'net_sales_warehouse'),
                        getCellData(oData, 'this_year', sPeriod, oDivision.id, 'net_sales_direct_sale'),
                        getCellData(oData, 'this_year', sPeriod, oDivision.id, 'net_sales_other'),
                        getCellData(oData, 'this_year', sPeriod, oDivision.id, 'net_sales_total'),
                        getCellData(oData, 'last_year', sPeriod, oDivision.id, 'net_sales_warehouse'),
                        getCellData(oData, 'last_year', sPeriod, oDivision.id, 'net_sales_direct_sale'),
                        getCellData(oData, 'last_year', sPeriod, oDivision.id, 'net_sales_other'),
                        getCellData(oData, 'last_year', sPeriod, oDivision.id, 'net_sales_total')
                    ]);
                    aExportData.push([
                        '',
                        '--- G/L COST ---'
                    ]);
                    aExportData.push([
                        '',
                        'NET COST OF SALES',
                        getCellData(oData, 'this_year', sPeriod, oDivision.id, 'net_cost_of_sales_warehouse'),
                        getCellData(oData, 'this_year', sPeriod, oDivision.id, 'net_cost_of_sales_direct_sale'),
                        getCellData(oData, 'this_year', sPeriod, oDivision.id, 'net_cost_of_sales_other'),
                        getCellData(oData, 'this_year', sPeriod, oDivision.id, 'net_cost_of_sales_total'),
                        getCellData(oData, 'last_year', sPeriod, oDivision.id, 'net_cost_of_sales_warehouse'),
                        getCellData(oData, 'last_year', sPeriod, oDivision.id, 'net_cost_of_sales_direct_sale'),
                        getCellData(oData, 'last_year', sPeriod, oDivision.id, 'net_cost_of_sales_other'),
                        getCellData(oData, 'last_year', sPeriod, oDivision.id, 'net_cost_of_sales_total')
                    ]);
                    aExportData.push([
                        '',
                        'NET PROFIT',
                        getCellData(oData, 'this_year', sPeriod, oDivision.id, 'net_profit_warehouse'),
                        getCellData(oData, 'this_year', sPeriod, oDivision.id, 'net_profit_direct_sale'),
                        getCellData(oData, 'this_year', sPeriod, oDivision.id, 'net_profit_other'),
                        getCellData(oData, 'this_year', sPeriod, oDivision.id, 'net_profit_total'),
                        getCellData(oData, 'last_year', sPeriod, oDivision.id, 'net_profit_warehouse'),
                        getCellData(oData, 'last_year', sPeriod, oDivision.id, 'net_profit_direct_sale'),
                        getCellData(oData, 'last_year', sPeriod, oDivision.id, 'net_profit_other'),
                        getCellData(oData, 'last_year', sPeriod, oDivision.id, 'net_profit_total')
                    ]);
                    aExportData.push([
                        '',
                        'GP%',
                        getCellData(oData, 'this_year', sPeriod, oDivision.id, 'gp_warehouse'),
                        getCellData(oData, 'this_year', sPeriod, oDivision.id, 'gp_direct_sale'),
                        getCellData(oData, 'this_year', sPeriod, oDivision.id, 'gp_other'),
                        getCellData(oData, 'this_year', sPeriod, oDivision.id, 'gp_total'),
                        getCellData(oData, 'last_year', sPeriod, oDivision.id, 'gp_warehouse'),
                        getCellData(oData, 'last_year', sPeriod, oDivision.id, 'gp_direct_sale'),
                        getCellData(oData, 'last_year', sPeriod, oDivision.id, 'gp_other'),
                        getCellData(oData, 'last_year', sPeriod, oDivision.id, 'gp_total')
                    ]);
                    aExportData.push([
                        '',
                        'TOTAL PIECES',
                        getCellData(oData, 'this_year', sPeriod, oDivision.id, 'quantity_warehouse'),
                        getCellData(oData, 'this_year', sPeriod, oDivision.id, 'quantity_direct_sale'),
                        getCellData(oData, 'this_year', sPeriod, oDivision.id, 'quantity_other'),
                        getCellData(oData, 'this_year', sPeriod, oDivision.id, 'quantity_total'),
                        getCellData(oData, 'last_year', sPeriod, oDivision.id, 'quantity_warehouse'),
                        getCellData(oData, 'last_year', sPeriod, oDivision.id, 'quantity_direct_sale'),
                        getCellData(oData, 'last_year', sPeriod, oDivision.id, 'quantity_other'),
                        getCellData(oData, 'last_year', sPeriod, oDivision.id, 'quantity_total')
                    ]);
                }

                aExportData.push(['']);
            });

            sContent += "    <\/table>";
        });

        if (request.getParameter(FLD_EXPORT) == 'T') {
            exportExcel(aExportData, response);
            return false;
        }

        fldTable.setDefaultValue(sContent);
    }

    response.writePage(frmMain);
}

function getDivision() {
    var aColSearch = [];
    var aFltSearch = [];
    var aReturn = [];
    var aResult;

    aColSearch.push(new nlobjSearchColumn('name').setSort());
    aResult = nlapiSearchRecord(REC_DIVISION, null, aFltSearch, aColSearch);

    if (typeof aResult !== 'undefined' && aResult) {
        aResult.forEach(function (oItem) {
            aReturn.push({
                id: oItem.getId(),
                name: oItem.getValue('name')
            });
        });
    }
    return aReturn;
}

function getCellData(oData, sYear, sPeriod, idDivision, sField) {
    var nReturn = '';

    if (idDivision == 'total') {
        if (sField.indexOf('gp') > -1) {
            return getGPTotalCellData(oData, sYear, sPeriod, sField);
        }
        return getTotalCellData(oData, sYear, sPeriod, sField);
    }

    if (oData[sYear]) {
        if (oData[sYear][sPeriod]) {
            if (oData[sYear][sPeriod][idDivision]) {
                if (oData[sYear][sPeriod][idDivision][sField]) {
                    nReturn = oData[sYear][sPeriod][idDivision][sField];
                }
            }
        }
    }

    return (nReturn) ? ((HC_COUNT_FIELDS.indexOf(sField) == -1) ? formatCurrency(nReturn) : nReturn) : '';
}

function getTotalCellData(oData, sYear, sPeriod, sField) {
    var nReturn = 0;
    aGlobalDivisions.forEach(function (oDivision) {
        var idDivision = oDivision.id;
        if (oData[sYear]) {
            if (oData[sYear][sPeriod]) {
                if (oData[sYear][sPeriod][idDivision]) {
                    if (oData[sYear][sPeriod][idDivision][sField]) {
                        nReturn += oData[sYear][sPeriod][idDivision][sField];
                    }
                }
            }
        }
    });

    return (nReturn) ? ((HC_COUNT_FIELDS.indexOf(sField) == -1) ? formatCurrency(nReturn) : nReturn) : '';
}

function getGPTotalCellData(oData, sYear, sPeriod, sField) {
    var nReturn = 0;

    if (sField.indexOf("direct_sale") == -1) {
        var parts = sField.split("_");
        var lastPart = parts[parts.length - 1];
    } else {
        lastPart = "direct_sale";
    }

    var salesField = "net_sales_" + lastPart;
    var profitField = "net_profit_" + lastPart;

    var nSales = getTotalCellData(oData, sYear, sPeriod, salesField).replace(/,/g, '');
    var nProfit = getTotalCellData(oData, sYear, sPeriod, profitField).replace(/,/g, '');
    nReturn = Math.abs((parseFloat(nProfit) / parseFloat(nSales)) * 100)

    return (nReturn) ? ((HC_COUNT_FIELDS.indexOf(sField) == -1) ? formatCurrency(nReturn) : nReturn) : '';
}

function getData(sStartDate, sEndDate) {
    var aColSearch = [];
    var aFltSearch = [];
    var oReturn = {};
    var aResult;
    var aColumns;

    aColSearch.push(new nlobjSearchColumn('cseg_accrete_divisi', null, 'GROUP').setSort());
    aColSearch.push(new nlobjSearchColumn('formulanumeric', null, 'COUNT').setFormula('case when {type} = \'Invoice\' and {custbody_dropship_order} = \'F\' then {internalid} end'));
    aColSearch.push(new nlobjSearchColumn('formulanumeric', null, 'COUNT').setFormula('case when {type} = \'Invoice\' and {custbody_dropship_order} = \'T\' then {internalid} end'));
    aColSearch.push(new nlobjSearchColumn('formulanumeric', null, 'COUNT').setFormula('case when {type} = \'Invoice\' then {internalid} end'));
    aColSearch.push(new nlobjSearchColumn('formulanumeric', null, 'COUNT').setFormula('case when {type} = \'Credit Memo\' and {custbody_dropship_order} = \'F\' then {internalid} end'));
    aColSearch.push(new nlobjSearchColumn('formulanumeric', null, 'COUNT').setFormula('case when {type} = \'Credit Memo\' and {custbody_dropship_order} = \'T\' then {internalid} end'));
    aColSearch.push(new nlobjSearchColumn('formulanumeric', null, 'COUNT').setFormula('case when {type} = \'Credit Memo\' then {internalid} end'));
    aColSearch.push(new nlobjSearchColumn('formulacurrency', null, 'SUM').setFormula('case when {accounttype} = \'Income\' and {custbody_dropship_order} = \'F\' then {amount} end'));
    aColSearch.push(new nlobjSearchColumn('formulacurrency', null, 'SUM').setFormula('case when {accounttype} = \'Income\' and {custbody_dropship_order} = \'T\' then {amount} end'));
    aColSearch.push(new nlobjSearchColumn('formulacurrency', null, 'SUM').setFormula('case when {accounttype} = \'Income\' and {custbody_dropship_order} is null then {amount} end'));
    aColSearch.push(new nlobjSearchColumn('formulacurrency', null, 'SUM').setFormula('case when {accounttype} = \'Income\' then {amount} end'));
    aColSearch.push(new nlobjSearchColumn('formulacurrency', null, 'SUM').setFormula('case when {accounttype} = \'Cost of Goods Sold\' and {custbody_dropship_order} = \'F\' then {amount} end'));
    aColSearch.push(new nlobjSearchColumn('formulacurrency', null, 'SUM').setFormula('case when {accounttype} = \'Cost of Goods Sold\' and {custbody_dropship_order} = \'T\' then {amount} end'));
    aColSearch.push(new nlobjSearchColumn('formulacurrency', null, 'SUM').setFormula('case when {accounttype} = \'Cost of Goods Sold\' and {custbody_dropship_order} is null then {amount} end'));
    aColSearch.push(new nlobjSearchColumn('formulacurrency', null, 'SUM').setFormula('case when {accounttype} = \'Cost of Goods Sold\' then {amount} end'));
    aColSearch.push(new nlobjSearchColumn('formulacurrency', null, 'MAX').setFormula('sum(case when {accounttype} = \'Income\' and {custbody_dropship_order} = \'F\' then {amount} end)-sum(case when {accounttype} = \'Cost of Goods Sold\' and {custbody_dropship_order} = \'F\' then {amount} end)'));
    aColSearch.push(new nlobjSearchColumn('formulacurrency', null, 'MAX').setFormula('sum(case when {accounttype} = \'Income\' and {custbody_dropship_order} = \'T\' then {amount} end)-sum(case when {accounttype} = \'Cost of Goods Sold\' and {custbody_dropship_order} = \'T\' then {amount} end)'));
    aColSearch.push(new nlobjSearchColumn('formulacurrency', null, 'MAX').setFormula('sum(case when {accounttype} = \'Income\' and {custbody_dropship_order} is null then {amount} end)-sum(case when {accounttype} = \'Cost of Goods Sold\' and {custbody_dropship_order} is null then {amount} end)'));
    aColSearch.push(new nlobjSearchColumn('formulacurrency', null, 'MAX').setFormula('sum(case when {accounttype} = \'Income\' then {amount} end)-sum(case when {accounttype} = \'Cost of Goods Sold\' then {amount} end)'));
    aColSearch.push(new nlobjSearchColumn('formulapercent', null, 'MAX').setFormula('(sum(case when {accounttype} = \'Income\' and {custbody_dropship_order} = \'F\' then {amount} end)-sum(case when {accounttype} = \'Cost of Goods Sold\' and {custbody_dropship_order} = \'F\' then {amount} end))/nvl(sum(case when {accounttype} = \'Income\' and {custbody_dropship_order} = \'F\' then {amount} end),0)'));
    aColSearch.push(new nlobjSearchColumn('formulapercent', null, 'MAX').setFormula('(sum(case when {accounttype} = \'Income\' and {custbody_dropship_order} = \'T\' then {amount} end)-sum(case when {accounttype} = \'Cost of Goods Sold\' and {custbody_dropship_order} = \'T\' then {amount} end))/nvl(sum(case when {accounttype} = \'Income\' and {custbody_dropship_order} = \'T\' then {amount} end),0)'));
    aColSearch.push(new nlobjSearchColumn('formulapercent', null, 'MAX').setFormula('(sum(case when {accounttype} = \'Income\' and {custbody_dropship_order} is null then {amount} end)-sum(case when {accounttype} = \'Cost of Goods Sold\' and {custbody_dropship_order} is null then {amount} end))/nvl(sum(case when {accounttype} = \'Income\' and {custbody_dropship_order} is null then {amount} end),0)'));
    aColSearch.push(new nlobjSearchColumn('formulapercent', null, 'MAX').setFormula('(sum(case when {accounttype} = \'Income\' then {amount} end)-sum(case when {accounttype} = \'Cost of Goods Sold\' then {amount} end))/nvl(sum(case when {accounttype} = \'Income\' then {amount} end),0)'));
    aColSearch.push(new nlobjSearchColumn('formulanumeric', null, 'MAX').setFormula('sum(case when {custbody_dropship_order} = \'F\' then {quantity} end)'));
    aColSearch.push(new nlobjSearchColumn('formulanumeric', null, 'MAX').setFormula('sum(case when {custbody_dropship_order} = \'T\' then {quantity} end)'));
    aColSearch.push(new nlobjSearchColumn('formulanumeric', null, 'MAX').setFormula('sum(case when {custbody_dropship_order} is null then {quantity} end)'));
    aColSearch.push(new nlobjSearchColumn('quantity', null, 'SUM').setFunction('roundToHundredths'));
    aColSearch.push(new nlobjSearchColumn('formulanumeric', null, 'COUNT').setFormula('case when {type} = \'Invoice\' and {custbody_dropship_order} is null then {internalid} end'));
    aColSearch.push(new nlobjSearchColumn('formulanumeric', null, 'MAX').setFormula('case when {type} = \'Credit Memo\' and {custbody_dropship_order} is null then {internalid} end'));

    aFltSearch.push(new nlobjSearchFilter('posting', 'null', 'is', 'T'));
    aFltSearch.push(new nlobjSearchFilter('accounttype', 'null', 'anyof', ['COGS', 'Expense', 'Income', 'OthExpense', 'OthIncome']));
    aFltSearch.push(new nlobjSearchFilter('saleseffectivedate', 'null', 'within', sStartDate, sEndDate)); //trandate


    aFltSearch.push(new nlobjSearchFilter('type', 'null', 'anyof', ['CustInvc', 'CustCred']));


    aResult = nlapiSearchRecord('transaction', null, aFltSearch, aColSearch);

    if (typeof aResult !== 'undefined' && aResult) {
        aResult.forEach(function (oItem) {
            var divisionText = oItem.getText('cseg_accrete_divisi', null, 'GROUP');
            if (divisionText == 'ACME' || divisionText == 'SHOP' || divisionText == 'RICHMOND') return;
            aColumns = oItem.getAllColumns();

            if (oItem.getValue('cseg_accrete_divisi', null, 'GROUP')) {
                if (aDivisionId.indexOf(oItem.getValue('cseg_accrete_divisi', null, 'GROUP')) === -1) {
                    aDivisionId.push(oItem.getValue('cseg_accrete_divisi', null, 'GROUP'));
                    aGlobalDivisions.push({
                        id: oItem.getValue('cseg_accrete_divisi', null, 'GROUP'),
                        name: oItem.getText('cseg_accrete_divisi', null, 'GROUP')
                    });
                }
            } else {
                hasNone = true;
            }

            oReturn[(oItem.getValue('cseg_accrete_divisi', null, 'GROUP')) ? oItem.getValue('cseg_accrete_divisi', null, 'GROUP') : 'none'] = {
                invoices_warehouse: !isNaN(parseFloat(oItem.getValue(aColumns[1]))) ? parseFloat(oItem.getValue(aColumns[1])) : 0,
                invoices_direct_sale: !isNaN(parseFloat(oItem.getValue(aColumns[2]))) ? parseFloat(oItem.getValue(aColumns[2])) : 0,
                invoices_total: !isNaN(parseFloat(oItem.getValue(aColumns[3]))) ? parseFloat(oItem.getValue(aColumns[3])) : 0,
                credits_warehouse: !isNaN(parseFloat(oItem.getValue(aColumns[4]))) ? parseFloat(oItem.getValue(aColumns[4])) : 0,
                credits_direct_sale: !isNaN(parseFloat(oItem.getValue(aColumns[5]))) ? parseFloat(oItem.getValue(aColumns[5])) : 0,
                credits_total: !isNaN(parseFloat(oItem.getValue(aColumns[6]))) ? parseFloat(oItem.getValue(aColumns[6])) : 0,
                net_sales_warehouse: !isNaN(parseFloat(oItem.getValue(aColumns[7]))) ? parseFloat(oItem.getValue(aColumns[7])) : 0,
                net_sales_direct_sale: !isNaN(parseFloat(oItem.getValue(aColumns[8]))) ? parseFloat(oItem.getValue(aColumns[8])) : 0,
                net_sales_other: !isNaN(parseFloat(oItem.getValue(aColumns[9]))) ? parseFloat(oItem.getValue(aColumns[9])) : 0,
                net_sales_total: !isNaN(parseFloat(oItem.getValue(aColumns[10]))) ? parseFloat(oItem.getValue(aColumns[10])) : 0,
                net_cost_of_sales_warehouse: !isNaN(parseFloat(oItem.getValue(aColumns[11]))) ? parseFloat(oItem.getValue(aColumns[11])) : 0,
                net_cost_of_sales_direct_sale: !isNaN(parseFloat(oItem.getValue(aColumns[12]))) ? parseFloat(oItem.getValue(aColumns[12])) : 0,
                net_cost_of_sales_other: !isNaN(parseFloat(oItem.getValue(aColumns[13]))) ? parseFloat(oItem.getValue(aColumns[13])) : 0,
                net_cost_of_sales_total: !isNaN(parseFloat(oItem.getValue(aColumns[14]))) ? parseFloat(oItem.getValue(aColumns[14])) : 0,
                net_profit_warehouse: !isNaN(parseFloat(oItem.getValue(aColumns[15]))) ? parseFloat(oItem.getValue(aColumns[15])) : 0,
                net_profit_direct_sale: !isNaN(parseFloat(oItem.getValue(aColumns[16]))) ? parseFloat(oItem.getValue(aColumns[16])) : 0,
                net_profit_other: !isNaN(parseFloat(oItem.getValue(aColumns[17]))) ? parseFloat(oItem.getValue(aColumns[17])) : 0,
                net_profit_total: !isNaN(parseFloat(oItem.getValue(aColumns[18]))) ? parseFloat(oItem.getValue(aColumns[18])) : 0,
                gp_warehouse: !isNaN(parseFloat(oItem.getValue(aColumns[19]))) ? Math.abs(parseFloat(oItem.getValue(aColumns[19]))) : 0,
                gp_direct_sale: !isNaN(parseFloat(oItem.getValue(aColumns[20]))) ? Math.abs(parseFloat(oItem.getValue(aColumns[20]))) : 0,
                gp_other: !isNaN(parseFloat(oItem.getValue(aColumns[21]))) ? Math.abs(parseFloat(oItem.getValue(aColumns[21]))) : 0,
                gp_total: !isNaN(parseFloat(oItem.getValue(aColumns[22]))) ? Math.abs(parseFloat(oItem.getValue(aColumns[22]))) : 0,
                quantity_warehouse: !isNaN(parseFloat(oItem.getValue(aColumns[23]))) ? parseFloat(oItem.getValue(aColumns[23])) : 0,
                quantity_direct_sale: !isNaN(parseFloat(oItem.getValue(aColumns[24]))) ? parseFloat(oItem.getValue(aColumns[24])) : 0,
                quantity_other: !isNaN(parseFloat(oItem.getValue(aColumns[25]))) ? parseFloat(oItem.getValue(aColumns[25])) : 0,
                quantity_total: !isNaN(parseFloat(oItem.getValue(aColumns[26]))) ? parseFloat(oItem.getValue(aColumns[26])) : 0,
                invoices_other: !isNaN(parseFloat(oItem.getValue(aColumns[26]))) ? parseFloat(oItem.getValue(aColumns[27])) : 0,
                credits_other: !isNaN(parseFloat(oItem.getValue(aColumns[26]))) ? parseFloat(oItem.getValue(aColumns[28])) : 0,
            }
        });
    }

    return oReturn;
}

function formatCurrency(x) {
    x = x.toFixed(2);
    return x.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

function exportExcel(aData, oResponse) {
    var sXML = '';
    var oFile;
    var idFile;

    sXML += '<?xml version="1.0"?><?mso-application progid="Excel.Sheet"?>';
    sXML += '<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet" ';
    sXML += 'xmlns:o="urn:schemas-microsoft-com:office:office" ';
    sXML += 'xmlns:x="urn:schemas-microsoft-com:office:excel" ';
    sXML += 'xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet" ';
    sXML += 'xmlns:html="http://www.w3.org/TR/REC-html40">';

    sXML += '<Worksheet ss:Name="Sheet1">';
    sXML += '<Table>';
    aData.forEach(function (aInnData) {
        sXML += '<Row>';
        aInnData.forEach(function (sItem) {
            sXML += '<Cell><Data ss:Type="String">' + sItem + '</Data></Cell>';
        });
        sXML += '</Row>';
    });
    sXML += '</Table></Worksheet></Workbook>';

    //create file
    oFile = nlapiCreateFile('Daily Management Status Report.xls', 'EXCEL', nlapiEncrypt(sXML, 'base64'));

    oResponse.setContentType(oFile.getType(), 'Daily Management Status Report.xls');
    oResponse.write(oFile.getValue());
}