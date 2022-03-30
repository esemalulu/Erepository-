/**
 * Module Description
 * 
 * Version    Date            Author           Remarks
 * 1.00       29 Nov 2013     JSon
 *
 */

var ctx = nlapiGetContext();
var paramMapsBiCred = ctx.getSetting('SCRIPT','custscript_mapsbi_cred');


/**
 * @param {nlobjPortlet} portletObj Current portlet object
 * @param {Number} column Column position index: 1 = left, 2 = middle, 3 = right
 * @returns {Void}
 */
function auxMapsBiDashboardViewer(ptlobj, column) {

	ptlobj.setTitle('MapsBI Dashboard Viewer');
	
	
}
