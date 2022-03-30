/**
 * Module Description
 * 
 * Version    Date            Author           Remarks
 * 1.00       18 Oct 2013     AnJoe
 *
 */

/**
 * @param {nlobjPortlet} portletObj Current portlet object
 * @param {Number} column Column position index: 1 = left, 2 = middle, 3 = right
 * @returns {Void}
 */
function displayMapsBiSl(portlet, column) {
	portlet.setTitle('Sample MapsBI Portlet Display');
	//App Account URL
	var nsDomain = 'https://system.na1.netsuite.com';
	
	var mapsBiDashboardSlUrl = nsDomain + nlapiResolveURL('SUITELET','customscript_aux_sl_mapsbi_sampnsdisplay','customdeploy_aux_sl_mapsbi_sampnsdisplay');
	
	var content="<iframe src='"+mapsBiDashboardSlUrl+"&shownav=Y' "+
				"width='100%' height='750px' name='DisplayIframe'></iframe>";
	portlet.setHtml(content);
}