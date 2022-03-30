/**
 * Module Description
 * 
 * Version    Date            Author           Remarks
 * 1.00       27 Nov 2013     AnJoe
 *
 */

var ctx = nlapiGetContext();
var mapsBiDashboardViewUrl = nlapiResolveURL('SUITELET','customscript_ax_sl_mapsbi_dashview_hdle','customdeploy_ax_sl_mapsbi_dashview_dpl');


function dashboardViewPageInit(type) {


}

function dashboardViewFieldChange(type, name, linenum) {
	
	//upon field change reload SL by passing in user selected dashboard from drop down list
	
	if (name == 'custpage_mbidash' && nlapiGetFieldValue(name)) {
		displayDashboard(nlapiGetFieldValue(name), nlapiGetFieldValue('custpage_hidenav'));
	}
	
}

//reload suitelet to show details
function displayDashboard(_id, _hideNav) {
	if (!_hideNav) {
		_hideNav = 'no';
	}
	
	if (!_id) {
		alert("Please select MapsBI Dashboard to display");
		return false;
	}
	
	window.ischanged = false;
	window.location = mapsBiDashboardViewUrl + '&custparam_dashid='+_id+'&custparam_showanv='+_hideNav;
}

