/**
 *
 * Module Description
 *
 * Author	mburstein
 * Version	1.00
 * Date		10 Jul 2013
 *
 * @record
 * @script
 * @scriptlink <a href=""></a>
 *
 */

// MB: 11/7/13 - Added Customer and revrec end date to the email
// MB: 6/20/14 - Switch vsoedelivered from item field check to transaction line item field check
// MB: 11/11/14 - Added product key to the columns
/*
 * MB: 9/6/16
 * 	Added check to ensure emails not delivered if the html table is blank
 * 	Added check to not build html if no line items from order
 *  Removing isFulfillable and vsoeDelivered checks - Do we want to do this?  How to exclude specific items if not using fulfillable?
 *  Change itemType check to array.indexOf and add EndGroup type to exclude the blank end of an Item Group
 *  Added Script Parameter for Send From Fallback (custscriptr7partnerordfull_sendfromfb)
 *  Updated email template ID to pull from script parameter Email Template (custscripttr7partnerordfull_emailtemplat) - Previously, this was hardcoded to id 1353 = ACR - Partner Delivery Confirmation (Converted)
 *  Added setTransaction to the email merge to allow merge fields in the email template rather than code.
 *  Removed some superfluous custom tags.  Can use scriptable tags instead.
 */
/**
 * @param {String} type Context Types: scheduled, ondemand, userinterface, aborted, skipped
 * @returns {Void}
 */
function notifyPartnerOrderFulfillment() {

	var timeLimitInMinutes = 10;
	this.timeLimitInMilliseconds = timeLimitInMinutes * 60 * 1000;
	this.startingTime = new Date().getTime();
	this.context = nlapiGetContext();
	this.rescheduleScript = false;
	// Hardcode valid product types for confirmations - by acrId
	// Currently all except PSO
	this.validProductTypes = getValidProductTypes();

	// Load search SCRIPT - Partner Item Receipt Confirmation--14301
	var arrSearchResults = nlapiSearchRecord('transaction', 14301);

	for (var i = 0; arrSearchResults != null && i < arrSearchResults.length && unitsLeft(1500) && timeLeft(7); i++) {

		var searchResult = arrSearchResults[i];
		var columns = searchResult.getAllColumns();
		var orderId = searchResult.getValue(columns[0]);

		try {

			// Load the Sales Order
			var recOrder = nlapiLoadRecord('salesorder', orderId);
			//Process fulfillment confirmations
			var lineItems = getItemsFromOrderWPartner(recOrder);
			var orderListHtmlTable = formatLineItemsToTable(lineItems);
			if (orderListHtmlTable) { // MB: 7/6/16 - Added check to ensure emails not delivered if the html table is blank
				sendConfirmationEmail(recOrder, orderListHtmlTable);
			}
		} catch (e) {
			var adminUser = nlapiLoadConfiguration('companypreferences').getFieldValue('custscriptr7_system_info_email_sender');
			nlapiSendEmail(adminUser, adminUser, 'Error on Partner Order Fulfillment Confirmation OrderId ' + orderId, 'Error: ' + e);
		}
	}

	if (rescheduleScript) {
		nlapiLogExecution('DEBUG', 'Reschedule Strcript', context.getScriptId());
		var status = nlapiScheduleScript(context.getScriptId());
		nlapiLogExecution('DEBUG', 'Schedule Status', status);
	}
}

function getValidProductTypes() {
	var validProductTypes = new Array();
	// Check all ACR Product Types with 'Deliver Partner Confirmation' checked
	var arrFilters = [
		['custrecordr7acrproducttypepartnerconf', 'is', 'T'],
	];
	var arrColumns = new Array();
	arrColumns[0] = new nlobjSearchColumn('internalid');

	var results = nlapiSearchRecord('customrecordr7acrproducttype', null, arrFilters, arrColumns);
	for (var i = 0; results != null && i < results.length; i++) {
		validProductTypes[validProductTypes.length] = results[i].getId();
	}
	return validProductTypes;
}


function getItemsFromOrderWPartner(recOrder) {
	/*
	 * Create an array to hold useful data object for all line items on the order
	 *  Each index of lineItems is a separate object 'lineItem' which holds specific data for each line
	 */
	var lineItems = new Array();
	var lineItemCount = recOrder.getLineItemCount('item');
	//CM - 9/7/20 APPS-13959 : Adding vars to handle item groups
	var isGroup = false;
	var groupDisplayName = '';

	for (var i = 1; lineItemCount != null && i <= lineItemCount; i++) {
		var lineItem = new Object();
		var itemId = recOrder.getLineItemValue('item', 'item', i);
		var itemType = recOrder.getLineItemValue('item', 'itemtype', i);
		var itemName = recOrder.getLineItemText('item', 'item', i);
		var isDescItem = /^DESC/i.test(itemName)
		// Get ingroup field - this lets you know if the item is in an item group or not.  However, this is inconsistent.
		//var inGroup = recOrder.getLineItemValue('item', 'ingroup', i);
		//nlapiLogExecution('DEBUG', 'itemName'+itemName.startsWith('DISC')+'--'+itemName);
		//CM - 9/7/20 APPS-13959 : if itemType is EndGroup, reset group vars
		if (itemType == 'EndGroup') {
			isGroup = false;
			groupDisplayName = '';
		}

		if ((['Subtotal', 'Discount', 'Description', 'EndGroup'].indexOf(itemType) == -1) && isDescItem !== true ) { // MB: 7/6/16 - Change itemType check to array.indexOf and add EndGroup type to exclude the blank end of an Item Group.

			// Get the properties from the item record for itemId
			var itemProperties = getItemProperties(itemId);
			var ACL = itemProperties['custitemr7itemautocreatelicense'];
			var isinactive = itemProperties['isinactive'];// although item doesnt have acl product type we want to include few items to included in email for order notifications
			/* MB: 7/6/16 - Removing isFulfillable and vsoeDelivered checks - Do we want to do this?  How to exclude specific items if not using fulfillable?
			 * var isFulfillable = itemProperties['isfulfillable'];
			var vsoeDelivered = recOrder.getLineItemValue('item', 'vsoedelivered', i);*/

			/** CM - 10/27/20 APPS-13959
			 * If this line is an item group, take the item group info;
			 * 'Item' & 'Description'
			 * and add from the next component line;
			 * 'Qty', 'Unit', 'Contact', 'Product Key', 'Start Date'
			 * & 'Exp Date'.
			 * This information will then be displayed in a single line
			 * on the order confirmation email.
			 */
			if (itemType == 'Group') {
				isGroup = true;

				/**
				 * Get the following information for item groups. For the component
				 * fields, use i+1 to get the info from the next line.
				 * (i = current group line, i+1 = first group component sku)
				 *
				 * group item
				 * group description
				 * component quantity
				 * component unit
				 * component contact
				 * component prodKey
				 * component startDate
				 * component expDate
				 */
				var contactId = recOrder.getLineItemValue('item', 'custcolr7translinecontact', i);

				lineItem['itemProperties'] = itemProperties;
				lineItem['itemId'] = itemId;
				lineItem['isACL'] = ACL;
				lineItem['displayname'] = itemProperties['displayname'];
				lineItem['lineId'] = recOrder.getLineItemValue('item', 'id', i);
				lineItem['quantity'] = recOrder.getLineItemValue('item', 'quantity', i + 1);
				lineItem['unitType'] = recOrder.getLineItemText('item', 'custcolr7itemqtyunit', i + 1);
				lineItem['description'] = recOrder.getLineItemValue('item', 'description', i);
				lineItem['amount'] = recOrder.getLineItemValue('item', 'amount', i);
				lineItem['contact'] = recOrder.getLineItemValue('item', 'custcolr7translinecontact', i + 1); //Line item contact
				lineItem['productKey'] = recOrder.getLineItemValue('item', 'custcolr7itemmsproductkey', i + 1);
				lineItem['shipping'] = recOrder.getLineItemValue('item', 'custcolr7lineshipaddress', i);
				lineItem['revrecstartdate'] = recOrder.getLineItemValue('item', 'custcolr7startdate', i + 1);
				lineItem['revrecenddate'] = recOrder.getLineItemValue('item', 'custcolr7enddate', i + 1);

				if (contactId != null && contactId != '') {
					lineItem['contactFields'] = nlapiLookupField('contact', contactId, new Array('firstname', 'lastname', 'email'));
				}
				lineItem['lineNum'] = i;
				lineItems[lineItems.length] = lineItem;

				continue;
			}

			// Get product type from item properties
			var acrId = itemProperties['custitemr7itemacrproducttype'];
			if ((acrId != null && acrId != '' && validProductTypes.indexOf(acrId) != -1) || (isinactive === 'F')) {
				var contactId = recOrder.getLineItemValue('item', 'custcolr7translinecontact', i);

				lineItem['itemProperties'] = itemProperties;
				lineItem['itemId'] = itemId;
				lineItem['isACL'] = acrId !=='' ? ACL :'';
				lineItem['lineId'] = recOrder.getLineItemValue('item', 'id', i);
				lineItem['quantity'] = recOrder.getLineItemValue('item', 'quantity', i);
				lineItem['unitType'] = recOrder.getLineItemText('item', 'custcolr7itemqtyunit', i);
				lineItem['description'] = recOrder.getLineItemValue('item', 'description', i);
				lineItem['amount'] = recOrder.getLineItemValue('item', 'amount', i);
				lineItem['contact'] = recOrder.getLineItemValue('item', 'custcolr7translinecontact', i); //Line item contact
				// lineItem['licenseId'] = recOrder.getLineItemValue('item', 'custcolr7translicenseid', i);
				lineItem['productKey'] = recOrder.getLineItemValue('item', 'custcolr7itemmsproductkey', i); // MB: 11/11/14 - Added product key
				lineItem['shipping'] = recOrder.getLineItemValue('item', 'custcolr7lineshipaddress', i);
				lineItem['revrecstartdate'] = recOrder.getLineItemValue('item', 'custcolr7startdate', i);
				lineItem['revrecenddate'] = recOrder.getLineItemValue('item', 'custcolr7enddate', i);

				/*
				 * CM - 10/27/20
				 * APPS-13959: If item is part of a group, the information for the email
				 * is processed above. Here, we can move on to the next iteration.
				 */
				if (isGroup) {
					continue;
				} else {
					lineItem['displayname'] = itemProperties['displayname'];
				}

				if (contactId != null && contactId != '') {
					lineItem['contactFields'] = nlapiLookupField('contact', contactId, new Array('firstname', 'lastname', 'email'));
				}
				lineItem['lineNum'] = i;
				lineItems[lineItems.length] = lineItem;
			}
		}
	}
	return lineItems;
}

function getItemProperties(itemId) {

	var arrFieldId = new Array();
	arrFieldId[arrFieldId.length] = 'custitemr7itemacrproducttype';
	arrFieldId[arrFieldId.length] = 'custitemr7itemautocreatelicense';
	arrFieldId[arrFieldId.length] = 'custitemr7acladdons';
	arrFieldId[arrFieldId.length] = 'isinactive';
	arrFieldId[arrFieldId.length] = 'displayname';
	arrFieldId[arrFieldId.length] = 'isfulfillable';
	arrFieldId[arrFieldId.length] = 'vsoedelivered';
	arrFieldId[arrFieldId.length] = 'isinactive';

	var lookedUpProperties = nlapiLookupField('item', itemId, arrFieldId);
	return lookedUpProperties;
}

/*
 * Build an html table to display the lineItems from the order
 */
function formatLineItemsToTable(lineItems) {
	if (lineItems && lineItems.length > 0) { // MB: 7/6/16 - added check to not build html if no line items from order
		var htmlTable = '';

		// Style
		htmlTable += '<style type="text/css">';
		htmlTable += '#orderItems {';
		htmlTable += 'font-family: "Lucida Sans Unicode", "Lucida Grande", Sans-Serif;';
		htmlTable += 'font-size: 12px;';
		htmlTable += 'margin: 45px;';
		//htmlTable += 'width: 100%;';
		htmlTable += 'text-align: left;';
		htmlTable += 'border-collapse: collapse;';
		htmlTable += 'border: 1px solid #ea5709;';
		htmlTable += '}';

		htmlTable += '#orderItems th {';
		htmlTable += 'padding: 12px 17px 12px 17px;';
		htmlTable += 'font-weight: normal;';
		htmlTable += 'font-size: 14px;';
		htmlTable += 'color: #000000;';
		htmlTable += 'border-bottom: 1px dashed #0197b8;';
		htmlTable += '}';

		htmlTable += '#orderItems td {';
		htmlTable += 'padding: 7px 17px 7px 17px;';
		htmlTable += 'color: #666666;';
		htmlTable += '}';

		htmlTable += '#orderItems tbody tr:hover td {';
		htmlTable += 'color: #000000;';
		htmlTable += 'background: #ea5709;';
		htmlTable += '}';
		htmlTable += '</style>';

		// Content
		htmlTable += '<table id="orderItems" summary="Fulfilled Items">';
		htmlTable += '<thead>';
		htmlTable += '<tr>';
		htmlTable += '<th scope="col">Item</th>';
		htmlTable += '<th scope="col">Quantity</th>';
		htmlTable += '<th scope="col">Unit</th>';
		htmlTable += '<th scope="col">Description</th>';
		htmlTable += '<th scope="col">Contact</th>';
		htmlTable += '<th scope="col">Product Key</th>';
		// htmlTable += '<th scope="col">License ID</th>';
		htmlTable += '<th scope="col">Start Date</th>';
		htmlTable += '<th scope="col">Exp Date</th>';
		htmlTable += '</tr>';
		htmlTable += '</thead>';
		htmlTable += '<tbody>';
		for (var i = 0; lineItems != null && i < lineItems.length; i++) {
			var lineItem = lineItems[i];
			htmlTable += '<tr>';
			htmlTable += '<td>' + lineItem['displayname'] + '</td>';
			htmlTable += '<td>' + lineItem['quantity'] + '</td>';
			htmlTable += '<td>' + lineItem['unitType'] + '</td>';
			htmlTable += '<td>' + lineItem['description'] + '</td>';
			// Format contact as 'first last : email'
			var contact = '';
			if (lineItem['contactFields'] != null) {
				contact = lineItem['contactFields']['firstname'] + ' ' + lineItem['contactFields']['lastname'] + ' : ' + lineItem['contactFields']['email'];
			}
			htmlTable += '<td>' + contact + '</td>';

			// MB: 11/11/14 - Add product key to table and Remove "Product Key: " string pre-text
			var productKey = '';
			if (lineItem['productKey'] != null && lineItem['productKey'] != '') {

				productKey = lineItem['productKey'].replace("Product Key: ", "");
			} else {
				productKey = '';
			}
			htmlTable += '<td>' + productKey + '</td>'; // MB: 11/11/14 - Added product key
			// htmlTable += '<td>' + lineItem['licenseId'] + '</td>';
			htmlTable += '<td>' + lineItem['revrecstartdate'] + '</td>';
			htmlTable += '<td>' + lineItem['revrecenddate'] + '</td>';
			htmlTable += '</tr>';
		}
		htmlTable += '</tbody>';
		htmlTable += '</table>';

		return htmlTable;
	}
}

function sendConfirmationEmail(recOrder, orderListHtmlTable) {

	var success = false;

	var toURL = nlapiRequestURL(nlapiResolveURL('SUITELET', 'customscriptretrieveurl', 'customdeployretrieveurl', true)).getBody();

	// MB: 9/6/16 - Updated email template ID to pull from script parameter - Previously, this was hardcoded to id 1353 = ACR - Partner Delivery Confirmation (Converted)
	var emailTemplateId = context.getSetting('SCRIPT', 'custscripttr7partnerordfull_emailtemplat');
	try {
		if (emailTemplateId) {
			var customerId = recOrder.getFieldValue('entity');
			var accountManagerId = nlapiLookupField('customer', customerId, 'custentityr7accountmanager');
			nlapiLogExecution('DEBUG', 'accountManagerId: ' + accountManagerId);

			// Send from CSM, if no CSM use the default fallback param
			// MB: 9/1/16 - Added Script Parameter for Send From Fallback (custscriptr7partnerordfull_sendfromfb)
			var sendEmailFrom = accountManagerId || context.getSetting('SCRIPT', 'custscriptr7partnerordfull_sendfromfb');
			// Grab employee fields we need for checking inactive and the employee r7 company contact id
			var employeeLookupFields = ['isinactive', 'custentityr7linkemployeecontactid'];
			var employeeValues = nlapiLookupField('employee', sendEmailFrom, employeeLookupFields);
			if (employeeValues.isinactive == 'T') {
				throw nlapiCreateError('FROM_EMPLOYEE_INACTIVE', 'Could not send email for orderId ' + recOrder.getId() + '. From Employee ID ' + sendEmailFrom + ' is inactive', false);
			}
			// Get Partner License Delivery Contact - if none, then send to partner direct email, if exists, else send to from
			var partnerEmail = nlapiLookupField('partner', recOrder.getFieldValue('partner'), 'email')
			var contactId = nlapiLookupField('partner', recOrder.getFieldValue('partner'), 'custentityr7partnerlicensedeliverycont') || ((partnerEmail != null && partnerEmail != "") ? recOrder.getFieldValue('partner') : sendEmailFrom);

			// Grab contact fields we need for checking inactive and the employee company contact id

			// Check contact is active
			if (nlapiLookupField('contact', contactId, 'isinactive') == 'T') {
				throw nlapiCreateError('TO_CONTACT_INACTIVE', 'Could not send email for orderId ' + recOrder.getId() + '. Contact ID ' + contactId + ' is inactive', false);
			}
			if (sendEmailFrom && contactId) {
				//Attaching email to salesorder record
				var records = new Array();
				records['recordtype'] = 'salesorder';
				records['transaction'] = recOrder.getId();

				// If the merge is sent to Employee record, store the message onto Employee Rapid7 Contact Record
				var mergeContactId = contactId;
				if (mergeContactId == sendEmailFrom) {
					mergeContactId = employeeValues.custentityr7linkemployeecontactid;
				}
				var subject, body;
				var templateVersion = nlapiLoadRecord('emailtemplate', emailTemplateId).getFieldValue('templateversion');

				if (templateVersion != 'FREEMARKER') { // CRMSDK Note: this is being deprecated.
					var merge = nlapiMergeRecord(emailTemplateId, 'contact', mergeContactId, null, null, custTags);
					subject = merge.getName();
					body = merge.getValue();
				} else { // the new FREEMARKER
					var emailMerger = nlapiCreateEmailMerger(emailTemplateId);
					emailMerger.setEntity('contact', mergeContactId);
					// MB: 9/7/16 - Added setTransaction to the email merge to allow merge fields in the email template rather than code.
					emailMerger.setTransaction(recOrder.getId());


					var mergeResult = emailMerger.merge();
					subject = mergeResult.getSubject();
					body = mergeResult.getBody();
				}

				// Grab signature location
				var matches = findRegexMatches(body);
				nlapiLogExecution('DEBUG', 'sendConfirmationEmail step 9');

				// Replace NLTESTCONFTABLE tag with signature html
				body = replaceTagsWithContent(matches, body, orderListHtmlTable);
				nlapiLogExecution('DEBUG', 'sendConfirmationEmail step 10');

				//Sending the email
				// CC the Account Manager
				if (accountManagerId) {
					var accountManagerEmail = nlapiLookupField('employee', accountManagerId, 'email');
					nlapiLogExecution('DEBUG', 'sendConfirmationEmail step 11');
					nlapiSendEmail(sendEmailFrom, contactId, subject, body, accountManagerEmail, null, records);
				} else {
					nlapiLogExecution('DEBUG', 'sendConfirmationEmail step 11');
					nlapiSendEmail(sendEmailFrom, contactId, subject, body, null, null, records);
				}

				success = true;
				if (success) {

					recOrder.setFieldValue('custbodyr7confirmation_sent', 'T');
					var id = nlapiSubmitRecord(recOrder, true);
				}
			} else {
				success = false;
			}
		} else { //If no templateId is found declare victory. No email is sent.
			success = true;
		}
	} catch (e) {
		nlapiLogExecution("ERROR", 'Could not email partner order confirmation for OrderId ' + recOrder.getId(), e + '\n' + e.stack + '\n' + e.stackTraceLimit);

		success = false;
	}
	//If fail to send activation email alert
	if (!success) {
		var adminUser = nlapiLoadConfiguration('companypreferences').getFieldValue('custscriptr7_system_info_email_sender');
		nlapiSendEmail(adminUser, adminUser, 'Error on Partner Order Fulfillment Confirmation',
			'\nOrderId: <a href="' + toURL + '/app/accounting/transactions/salesord.nl?id=' + recOrder.getId() + '&whence=">' +
			recOrder.getId() + '</a>\nPartnerContact: <a href="' + toURL + '/app/common/entity/contact.nl?id=' + contactId + '">' + contactId + '</a>');
	}
}

function findRegexMatches(body) {

	//<!--{NLCUSEATSIG1}-->
	var regex = /\<\!\-\-\{NLTESTCONFTABLE\}\-\-\>/g;
	var matches = [];
	var match;

	while (match = regex.exec(body)) {
		matches.push(match[0]);
	}

	matches = unique(matches);

	return matches;
}

function replaceTagsWithContent(matches, body, signature) {

	for (var i = 0; matches != null && i < matches.length; i++) {
		var match = matches[i];
		var replaceRegex = new RegExp(match, 'g');

		body = body.replace(replaceRegex, signature);
	}
	return body;
}

function unique(a) {
	a.sort();
	for (var i = 1; i < a.length;) {
		if (a[i - 1] == a[i]) {
			a.splice(i, 1);
		} else {
			i++;
		}
	}
	return a;
}

function timeLeft() {
	var presentTime = new Date().getTime();
	if (presentTime - startingTime > timeLimitInMilliseconds) {
		nlapiLogExecution('AUDIT', 'Ran out of time', 'yup');
		rescheduleScript = true;
		return false;
	}
	return true;
}

function unitsLeft(units) {
	if (units == null || units == '') {
		units = 100;
	}
	var unitsLeft = context.getRemainingUsage();
	if (unitsLeft <= units) {
		nlapiLogExecution('AUDIT', 'Ran out of units', 'yup');
		rescheduleScript = true;
		return false;
	}
	return true;
}