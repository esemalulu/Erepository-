/**
 * Author: joe.son@audaxium.com
 * Date: 12/2/2012
 * Record: estimate
 * Desc:
 */

/**
 * Fires whenever a read operation on the record occurs just prior to returning the record or page
 * type: create, edit, view, copy, print, email
 * form: nlobjForm object representing the current form. 
 * request: nlobjRequest object representing GET request
 * 
 * Creates Custom Button to generate Customized Quote in Word document
 */
function beforeLoadQuote(type, form, request) {
	if (type != 'view') {
		return;
	}
	
	var orderFormGeneratorUrl = nlapiResolveURL('SUITELET',
												'customscript_aux_sl_customized_quote_gen',
												'customdeploy_aux_sl_customized_quote_gen')+'&custparam_quoteid='+nlapiGetRecordId();
	var disableBtn = false;
	if (!nlapiGetFieldValue('opportunity')) {
		disableBtn = true;
	} else {
		disableBtn = false;
		orderFormGeneratorUrl += '&custparam_oppid='+nlapiGetFieldValue('opportunity');
	}
	//add a button to the quote record
	var genBtn = form.addButton('custpage_btn_pkgform',
								'Generate Package Form',
								'window.open(\''+orderFormGeneratorUrl+'\', \'\', \'width=900,height=400,resizable=yes,scrollbars=yes\');return true;');
	genBtn.setDisabled(disableBtn);
}