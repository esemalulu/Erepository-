
var FLD_START_DATE = 'custpage_startdate';
var FLD_END_DATE = 'custpage_enddate';
var FLD_DATA = 'custpage_data';
var HC_NS_TABLE_CLASSES = {
	headerRow: 'uir-list-headerrow',
	headerCell: 'uir-list-header-td',
	tableRow : 'uir-list-row-cell uir-list-row-even',
	tableCell  : 'uir-list-row-cell',
	oddTableRow : 'uir-list-row-cell uir-list-row-odd',
};

var SCRIPT_REPORT_DATA = 'customscript_trial_bal_report_data_sl';
var DEPLOY_REPORT_DATA = 'customdeploy_trial_bal_report_data_sl';

var aReportData = [];
var aAccountingPeriods = [];
var sExportData = null;

/**
 * The recordType (internal id) corresponds to the "Applied To" record in your script deployment. 
 * @appliedtorecord recordType 
 * 
 * @param {String} type Access mode: create, copy, edit
 * @returns {Void}
 */
function generateReportPageInit(type){
    setData(
        nlapiGetFieldValue(FLD_START_DATE),
        nlapiGetFieldValue(FLD_END_DATE)
    );
}

/**
 * The recordType (internal id) corresponds to the "Applied To" record in your script deployment. 
 * @appliedtorecord recordType
 * 
 * @param {String} type Sublist internal id
 * @param {String} name Field internal id
 * @param {Number} linenum Optional line item number, starts from 1
 * @returns {Void}
 */
function generateReportFieldChanged(type, name, linenum){
	if(name != FLD_DATA) {
        if(!nlapiGetFieldValue(FLD_START_DATE) || !nlapiGetFieldValue(FLD_END_DATE)) {
            alert('Please enter the start and end date.');
            return false;
        } else {
            setData(
                nlapiGetFieldValue(FLD_START_DATE),
                nlapiGetFieldValue(FLD_END_DATE)
            );
        }
	}
}

/**
 * This function build the data and show the report
 * 
 * @returns {Void}
 */
function showReport() {
	var aData = [];
	var aHeader = [[]];

    aData = aReportData;
    
	google.charts.load('current', {'packages':['table']});
	google.charts.setOnLoadCallback(drawTable);

	//this function is default in google chart
	function drawTable() {
        var cellVal;
        var colIndexList = [0,1];
		var data = new google.visualization.DataTable();
        
		data.addColumn('string', 'Type');
		data.addColumn('string', 'Account');
		data.addColumn('number', 'Beginning Balance');
        aAccountingPeriods.forEach(function(oPeriod){
            data.addColumn('number', oPeriod.periodname);
        });
		data.addColumn('number', 'Ending Balance');
		
		data.addRows(aData);
        
        for(var rowIndex = 0; rowIndex < data.getNumberOfRows(); rowIndex++) {
            colIndexList.forEach(function(colIndex) { 
                cellVal = data.getValue(rowIndex, colIndex);
                
                if(!isNaN(cellVal)) {
                    if(cellVal > 0)
                        data.setProperty(rowIndex, colIndex, 'style', 'background-color: #ffbdbd;');
                    else if(cellVal < 0)
                        data.setProperty(rowIndex, colIndex, 'style', 'background-color: #92fc9e;');
                }
            });
        }
        
		for(var nIndex=0;nIndex<data.getNumberOfColumns();nIndex++) {
			aHeader[0].push(data.getColumnLabel(nIndex));
		}
		sExportData = encodeURIComponent(JSON.stringify(aHeader.concat(aData)));
		
		document.getElementById('toolbar_div').innerHTML 
			= '<br><a href="#" id="export_link" onclick="fnExportReport2(); return false;">'
			+ 'Export to Excel'
			+ '</a>';

		var table = new google.visualization.Table(document.getElementById('table_div'));
		table.draw(data, {
			showRowNumber: true, 
			width: '1200px', 
			showRowNumber: false,
			cssClassNames: HC_NS_TABLE_CLASSES,
			alternatingRowStyle: true,
			sort: 'disable',
            allowHtml: true
		});
        
        jQuery('.google-visualization-table div').css('overflow','inherit');
        jQuery('.google-visualization-table-table').css('font-size','11px');
        
        if(aData.length == 0) {
            jQuery('#export_link').hide();
            jQuery('#table_div').html('No data to display');
        }
	}
}

function setData(sStartDate, sEndDate) 
{
    var aData = [];
    var aPeriods = getAcctPeriods(sStartDate, sEndDate);
    var aTemp;
    var oEmpData = {};
    
    jQuery('#export_link').hide();
    jQuery('#table_div').html('Loading...');
    
    aAccountingPeriods = aPeriods;
    
    jQuery.get(nlapiResolveURL('SUITELET', SCRIPT_REPORT_DATA, DEPLOY_REPORT_DATA), { 
        startdate: sStartDate, 
        enddate: sEndDate 
    }).done(function(data) {
        var oReturnData = JSON.parse(data);
        console.log(oReturnData);
        
        if(oReturnData.accounts && oReturnData.accounts.length > 0) {
            oReturnData.accounts.forEach(function(oAccount){
                aTemp = [];
                aTemp.push(oAccount.type);
                aTemp.push(oAccount.account_name);
                aTemp.push(formatNumber(oReturnData['data']['beginning'][oAccount.id]));
                aPeriods.forEach(function(oPeriod){
                    aTemp.push(formatNumber(oReturnData['data'][oPeriod.id][oAccount.id]));
                });
                aTemp.push(formatNumber(oReturnData['data']['ending'][oAccount.id]));
                aData.push(aTemp);
            });
        }
        
        
        aReportData = aData;
        showReport();
    });
}

function formatNumber(sNum) {
    var fNum = (!isNaN(parseFloat(sNum))) ? parseFloat(parseFloat(sNum).toFixed('2')) : 0;
    
    return fNum;
}


function getAcctPeriods(sStartDate, sEndDate) 
{ 
    var aColSearch = []; 
    var aFltSearch = []; 
    var aReturn = []; 
    var aResult; 
  
    aColSearch.push(new nlobjSearchColumn('periodname')); 
    aColSearch.push(new nlobjSearchColumn('startdate').setSort()); 
  
    aFltSearch.push(new nlobjSearchFilter('isquarter','null','is','F')); 
    aFltSearch.push(new nlobjSearchFilter('isyear','null','is','F')); 
    aFltSearch.push(new nlobjSearchFilter('enddate','null','onorafter',sStartDate)); 
    aFltSearch.push(new nlobjSearchFilter('startdate','null','onorbefore',sEndDate)); 
 
    aResult = nlapiSearchRecord('accountingperiod', null, aFltSearch, aColSearch); 
 
 	if(typeof aResult !== 'undefined' && aResult) {
    	aResult.forEach(function(oItem) { 
        	aReturn.push({
                id: oItem.getId(),
                periodname: oItem.getValue('periodname'),
            }); 
    	}); 
    }
    return aReturn; 
}


function fnExportReport2() {
    jQuery('#submitted').val('');
    jQuery('#custpage_data').val(sExportData);
    jQuery('#main_form').submit();
}
