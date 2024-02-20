/**
 * A suitelet available without login that takes the id of a contact and allows them to set their Global Subscription Status
 * 
 * Version    Date            Author           Remarks
 * 1.00       26 Oct 2018     brians
 *
 */

var SUBSCRIPTION_SOFTOPTIN = '1';
var SUBSCRIPTION_SOFTOPTOUT = '2';

/**
 * @param {nlobjRequest} request Request object
 * @param {nlobjResponse} response Response object
 * @returns {Void} Any output is written via response object
 */
function GD_EmailUnsubscribe_Suitelet(request, response){
	
	if (request.getMethod() == 'GET') {
		
		var form = nlapiCreateForm('', true);
		var field = '';
		
		var contactId = request.getParameter('custparam_cid');
		field = form.addField('custpage_contact', 'text', 'Contact');
		field.setDefaultValue(contactId);
		field.setDisplayType('hidden');
	
		try {
			
			var contactRecord = nlapiLoadRecord('contact', contactId);
			var companyId = nlapiGetContext().getCompany();
            var accountId = companyId.toLowerCase();
            accountId = accountId.replace('_', '-');
			var imageUrl = "https://" + accountId + ".app.netsuite.com/core/media/media.nl?id=5256051&c=" + companyId + "&h=b343490873f07f944d7f";
			
			//Add an html field that we can use to set some page styles
			//Inlcudes setting bg color, adding GD University logo, centering the suitelet table fields, and hiding the submit button so the user doesn't see it before we move it to another spot on the form. Because we're being sneaky and manipulating the DOM.
			var html = '<style>body {background-color: #41556b !important; }.gdrvu-logo{width: 338px; height: 85px; display: block; margin: auto;}.uir-outside-fields-table{margin: auto;}#tbl_submitter{cursor: pointer; display:none;}</style>' + 
			'<div style="width: 100%; height: 200px;"><img class="gdrvu-logo" src="' + imageUrl + '"/></div>';
			field = form.addField('custpage_inlinehtml', 'inlinehtml', '');
			field.setDefaultValue(html);
			
			//Add another html field with a nice little header
			field = form.addField('custpage_inlinehtml2', 'inlinehtml', '');
			field.setLayoutType('outsidebelow', 'startrow');
			field.setDefaultValue('<h1 style="font-size: 2em; color: #fff; margin-bottom: 20px;">Subscription Status</h1>');
			
			//Add a select field where the user can pick their subscription status
			field = form.addField('custpage_subscriptionstatus', 'select', '');
			field.setLayoutType('outsidebelow', 'startrow');
			var subscriptionStatus = contactRecord.getFieldValue('globalsubscriptionstatus');
			
			//Default the field to whatever is currently set on that contact
			if(subscriptionStatus == SUBSCRIPTION_SOFTOPTIN)
			{
				field.addSelectOption(SUBSCRIPTION_SOFTOPTIN, 'Yes, please send me email updates.', true);
				field.addSelectOption(SUBSCRIPTION_SOFTOPTOUT, 'No, do not send me email updates.', false);
			}
			else
			{
				field.addSelectOption(SUBSCRIPTION_SOFTOPTIN, 'Yes, please send me email updates.', false);
				field.addSelectOption(SUBSCRIPTION_SOFTOPTOUT, 'No, do not send me email updates.', true);
			}
			
			form.addSubmitButton('Save');
			
			//Add a final html field that just contains a placeholder div that is the target location for the submit button.
			//It also includes a script that finds the submit button and moves it to our placeholder div, then makes it visible (display: block)
			var html2 = '<script>document.addEventListener("DOMContentLoaded", function(event) {var saveBtn = document.getElementById("tbl_submitter");var targetDiv = document.getElementById("button-placeholder");targetDiv.insertBefore(saveBtn, targetDiv.childNodes[0]);saveBtn.style.display = "block";});</script>' +
			'<div style="width: 100%; height: 50px;"><div id="button-placeholder" style="padding: 20px 0px;"></div></div>';
			field = form.addField('custpage_inlinehtml3', 'inlinehtml', '');
			field.setLayoutType('outsidebelow', 'startrow');
			field.setDefaultValue(html2);
			
			response.writePage(form);

		}
		catch(err){
			//If there was some error, we assume it is because there's no contact id
			nlapiLogExecution('error', err.getCode(), err.getDetails());

			var form = nlapiCreateForm('', false);

			var field = form.addField('custpage_error', 'text', '');
			field.setDefaultValue('Contact not found - you must navigate to this page from the link included at the bottom of the email.');
			field.setDisplayType('inline');
			
			response.writePage(form);
		}
	
	}
	else {
		//POST
		var subscriptionStatus = request.getParameter('custpage_subscriptionstatus');
		var contactId = request.getParameter('custpage_contact');
		
		var form = nlapiCreateForm('', false);
		//Add the same html field we used on GET, which has the desired bg color and logo and such
		var html = '<style>body {background-color: #41556b !important; }.gdrvu-logo{width: 338px; height: 85px; display: block; margin: auto;}p{color: #fff; font-size: 1.5em;position: absolute;left: 50%;margin-right: -50%;transform: translate(-50%, -50%)}.post-wrapper{width: 100%; height: 100px;}</style>' + 
		'<div style="width: 100%; height: 200px;"><img class="gdrvu-logo" src="https://system.na2.netsuite.com/core/media/media.nl?id=5256051&c=3598857&h=b343490873f07f944d7f"/></div>';
		var field = form.addField('custpage_inlinehtml', 'inlinehtml', '');
		field.setDefaultValue(html);
		
		//Add another html field that we can use to display the status of the subscription update
		field = form.addField('custpage_post', 'inlinehtml', '');
		field.setLayoutType('outsidebelow', 'startrow');
		
		try {
			nlapiSubmitField('contact', contactId, 'globalsubscriptionstatus', subscriptionStatus);
			field.setDefaultValue('<div class="post-wrapper"><p>Your subscription preferences have been saved. You may close this window.</p></div>');
		}
		catch(err)
		{
			nlapiLogExecution('error', 'Error saving', 'Contact ' + contactId);
			field.setDefaultValue('<div class="post-wrapper"><p>Error saving your subscription preferences. Please contact Grand Design.</p></div>');
		}
		
		response.writePage(form);
	}

}
