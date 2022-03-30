/**
 * TO BE DELETED - Prod version developed by Consultant J.E.  (cb_sl_mindgym_geocode.js)
 * 
 * Module Description
 * 
 * Version    Date            Author           Remarks
 * 1.00       13 Jul 2014     AnJoe
 *
 */

/**
 * @param {nlobjRequest} request Request object
 * @param {nlobjResponse} response Response object
 * @returns {Void} Any output is written via response object
 */

var paramGeoCodeFormIds = nlapiGetContext().getSetting('SCRIPT', 'custscript_sct246_formids').split(',');
var paramGeoCodeSupplierCategoryIds = nlapiGetContext().getSetting('SCRIPT', 'custscript_sct246_categoryids').split(',');

var nsform = nlapiCreateForm('Mind Gym Coach Map by Default Shipping Address', false);

function supplierVendorGoogleMap(req, res){

	
	
	res.writePage(nsform);
	
}
