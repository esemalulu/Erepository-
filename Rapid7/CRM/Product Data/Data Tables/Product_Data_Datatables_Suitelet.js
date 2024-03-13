/**
 * Module Description
 * 
 * Version    Date            Author           Remarks
 * 1.00       15 Sep 2014     efagone
 *
 */

function zc_custom_suitelet(request, response){

	try {
		var context = nlapiGetContext();
		var htmlFileId = context.getSetting('SCRIPT', 'custscriptzc_proddata_htmlfileid');
		var objFile = nlapiLoadFile(htmlFileId);
		var content = objFile.getValue();
		
		var form = nlapiCreateForm('Product Data', false);
		    // FIELD GROUPS
        form.addFieldGroup('primarygroup', 'Opportunity Details').setSingleColumn(true);
		form.addField('custpage_customerid', 'select', 'Customer', 'customer', 'primarygroup');
        form.getField('custpage_customerid').setDisplayType('inline');
		form.getField('custpage_customerid').setLayoutType('normal', 'startcol');
		
        form.addField('custpage_opportunity', 'select', 'Opportunity', 'opportunity', 'primarygroup');
        form.getField('custpage_opportunity').setDisplayType('inline');
		
		form.getField('custpage_opportunity').setDefaultValue(request.getParameter('custparam_oppid'));
		if (request.getParameter('custparam_oppid') != null && request.getParameter('custparam_oppid') != ''){
			form.getField('custpage_customerid').setDefaultValue(nlapiLookupField('opportunity', request.getParameter('custparam_oppid'), 'entity'));
		}
		
		form.addField('custpage_html', 'inlinehtml');
		form.getField('custpage_html').setDefaultValue(content);
		
		//response.setContentType('HTMLDOC');
		response.writePage(form);
		return;
	} 
	catch (e) {
		var emsg = '';
		
		if (e instanceof nlobjError) {
			emsg = 'Code: ' + e.getCode() + ' \nDetails: ' + e.getDetails() + '\nStackTrace: \n';
			var st = e.getStackTrace();
			// nlobjError.getStackTrace() is documented as returning an array, but actually (sometimes?) returns a single string...
			if ((typeof st !== 'undefined') && (st !== null)) {
				if (typeof st === 'string') {
					emsg += '\n' + st;
				}
				else { // in case we ever do get an array...
					for (var n = 0; n < st.length; n++) {
						if (st[n] !== 'undefined') {
							emsg += '\n' + st[n];
						}
					}
				}
			}
		}
		else {
			emsg = e.toString();
		}
		
		nlapiLogExecution('ERROR', 'Error', emsg);
	}
	
}
