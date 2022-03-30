/**
 * Module Description
 * 
 * Version    Date            Author           Remarks
 * 1.00       27 Mar 2014     AnJoe
 *
 */

/**
 * The recordType (internal id) corresponds to the "Applied To" record in your script deployment. 
 * @appliedtorecord recordType
 *   
 * @param {String} type Operation types: create, edit, view, copy, print, email
 * @param {nlobjForm} form Current form
 * @param {nlobjRequest} request Request object
 * @returns {Void}
 */
function customerRecBeforeLoad(type, form, request){

	//custentity_ax_mrr_projanadisplay
	if (type != 'create' && nlapiGetContext().getExecutionContext()=='userinterface') {
		//iframe the suitelet
		var prjUrl = nlapiResolveURL('SUITELET', 'customscript_ns_ax_sl_mrr_projection', 'customdeploy_ns_ax_sl_mrr_projectiondpl', 'VIEW')+'&customerid='+nlapiGetRecordId();
		
		var inlineHtmlSource = '<iframe src="'+prjUrl+'" width="580px" frameborder="1" height="200px"></iframe>';
		form.getField('custentity_ax_mrr_projanadisplay', null).setDefaultValue(inlineHtmlSource);
	}
	
}
