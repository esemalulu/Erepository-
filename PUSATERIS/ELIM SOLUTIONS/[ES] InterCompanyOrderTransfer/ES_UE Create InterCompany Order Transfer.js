/**
 * Module Description
 * 
 * Version    Date            Author           Remarks
 * 1.00       16 Feb 2016     Fan Lu
 *
 */

/**
 * The recordType (internal id) corresponds to the "Purchase Order" record in your script deployment. 
 * @appliedtorecord recordType
 *   
 * @param {String} type Operation types: create, edit, view, copy, print, email
 * @param {nlobjForm} form Current form
 * @param {nlobjRequest} request Request object
 * @returns {Void}
 */
function userEventBeforeLoad(type, form, request){
	if (type == 'view') {
		var results = nlapiSearchRecord(nlapiGetRecordType(), null,
				[['internalid', 'is', nlapiGetRecordId()], 'and',
				 ['customform', 'anyof', '148'], 'and',
				 ['approvalstatus', 'anyof', 2], 'and',
				 ['status', 'anyof', ['PurchOrd:D','PurchOrd:E','PurchOrd:F','PurchOrd:G']]]);
		if (!results || !results[0]){
			return;
		}
		var results = nlapiSearchRecord('transferorder', null,
				['custbody_es_created_from', 'anyof', nlapiGetRecordId()]);
		if (results && results[0]){
			return;
		}
		var config = [{
			col: 'custcol_es_bayview'
		},{
			col: 'custcol_es_yorkville'
		},{
			col: 'custcol_es_sherway'
		},{
			col: 'custcol_es_commissary'
		}];
		var count = nlapiGetLineItemCount('item');
		var invantoryItems = (function(id){
			var output = null;
			var results = nlapiSearchRecord('purchaseorder', null, 
					[['mainline', 'is', 'F'], 'and',
					 ['internalid', 'anyof', id], 'and',
					 ['item.type', 'anyof', 'InvtPart']],
					 [new nlobjSearchColumn('item')]);
			for (var i = 0; results && i < results.length; i += 1) {
				if (!output) {
					output = {};
				}
				output[results[i].getValue('item')] = true;
			}
			return output;
		})(nlapiGetRecordId());
		for (var i = 0; invantoryItems && i < config.length; i += 1) {
			var sum = 0;
			for (var l = 1; l <= count; l += 1) {
				if (invantoryItems[nlapiGetLineItemValue('item', 'item', l)]) {
					sum = parseFloat(nlapiGetLineItemValue('item', config[i].col, l) || 0) || 0;
				}
				if (sum > 0) {
					break;
				}
			}
			if (sum > 0) {
				form.addButton('custpage_generate_icto', 'Generate Intercompany Transfers', ('(' +
						function(url){
						window.open(url, '_self');
				} +
					')("' + nlapiResolveURL('SUITELET', 'customscript_es_sl_create_intercompny_ot', 'customdeploy1') + '&esId=' + nlapiGetRecordId() + '")').replace(/"/g,"'"));
				break;
			}
		}
	}
}
