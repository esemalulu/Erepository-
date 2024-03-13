/*
 * Module Description
 * 
 * Version    Date            Author           Remarks
 * 1.00       01 Dec 2014     efagone
 *

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
Notes from Michael Burstein

1) Create external Suitelet for updating an Event Attendee record contact information
  	- Suitelet driven by link with parameters for Contact SID and Event Master ID
  	- Search all attendee records for same Contact SID and Event Master ID
 	- Show sublist of registered attendees and contact information
 	- Allow customer to inline edit to submit new contact info and update their registration
 	- Once updated, kick off redelivery of confirmation emails to updated contact
2) Update United event attendee confirmation emails to include link to Suitelet for self-service contact information updates
  	- Suitelet link includes parameters for Contact SID and Event Master ID
3) Expose Contact SID and Event Master ID to Marketo so campaigns can be sent to contacts to update their information


////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
 */

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
		var htmlFileId = context.getSetting('SCRIPT', 'custscriptr7_unitedreg_htmlfileid');
		var objFile = nlapiLoadFile(htmlFileId);
		var content = objFile.getValue();
		
		var form = nlapiCreateForm('United Registration', true);
		form.addField('custpage_html', 'inlinehtml');
		form.getField('custpage_html').setDefaultValue(content);
		
		response.setContentType('HTMLDOC');
		response.write(content);
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
