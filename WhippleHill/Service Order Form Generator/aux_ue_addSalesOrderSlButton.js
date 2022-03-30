/**
 * Author: joe.son@audaxium.com
 * Date: 12/8/2012
 * Record: estimate
 * Desc:
 */

var ctx = nlapiGetContext();

//internal ID of Estimate Forms to display Service Order Form Generator Button
var estimateFormIds = ctx.getSetting('SCRIPT','custscript_estimate_formids');

/**
 * Fires whenever a read operation on the record occurs just prior to returning the record or page
 * type: create, edit, view, copy, print, email
 * form: nlobjForm object representing the current form. 
 * request: nlobjRequest object representing GET request
 * 
 * Creates Custom Button to generate Customized Quote in Word document
 */
function beforeLoadQuote(type, form, request) {
	if (type != 'view' || !estimateFormIds) {
		return;
	}
	
	//Internal IDs of estimate entry form MUST be passed in
	if (!strTrim(estimateFormIds)) {
		return;
	}
	
	var arForms = estimateFormIds.split(',');
	var currentFormId = nlapiGetFieldValue('customform');
	//It's possible this field is hidden
	if (!currentFormId) {
		currentFormId = nlapiLookupField(nlapiGetRecordType(), nlapiGetRecordId(), 'customform');
	}
	
	log('debug','form id',currentFormId);
	
	//Estimate Entry Form must be contained within the list
	if (!arForms.contains(currentFormId)) {
		return;
	}
	
	var orderFormGeneratorUrl = nlapiResolveURL('SUITELET',
												'customscript_aux_sl_serviceorder_gen',
												'customdeploy_aux_sl_serviceorder_gen')+'&custparam_action=gen&custparam_quoteid='+nlapiGetRecordId();
	
	//add a button to the quote record
	var genBtn = form.addButton('custpage_btn_pkgform',
								'Generate Service Order Form',
								'window.open(\''+orderFormGeneratorUrl+'\', \'\', \'width=1100,height=600,resizable=yes,scrollbars=yes\');return true;');
	
}