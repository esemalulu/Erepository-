/**
 *
 *  _warning email from 2, 340932 and 55011<br/>
 *
 *  library to: <br/>
 *  ACR_Process_Entire_Order.js 22:<br/>
 *
 * existing:<br/>
 * filename: ./ACR/ACR_Process_ACL.js ; <br/>
 *
 *
 * @author efagone<br/>
 */

var exitScript = false;

/**
 * Called from ACR_Process_Entire_Order.js 22:
 *
 * @method procssACLSalesOrder
 * @param {object} recOrder
 * @param {object} orderUpdates
 */
function procssACLSalesOrder(recOrder, orderUpdates) {
	// https://issues.corp.rapid7.com/browse/APPS-16781
	var recOrderBackup = JSON.stringify(recOrder);

	this.arrItemACRIds = grabLineItemACRIds(recOrder);
	nlapiLogExecution('DEBUG', 'Processing ACL For Order', recOrder.getRecordType() + ': ' + recOrder.getId());

	//clean up associations in-case it was only associated on quote
	recOrder = reAssociateItems(recOrder, null, null, orderUpdates);
	try {
		var customerId = recOrder.getFieldValue('entity');
		var strToday = nlapiDateToString(new Date());

		// optimized to make only one loop through arrItems
		var orderObject = getOrderObject(recOrder);
		var arrACRItems = orderObject.getAclItemsByAcr('1,2,6,7,8,9');
		var arrAddOnItems = orderObject.getAddonItemsByAcr('1,2,4,5,6,7,8,9');
		var arrHWDItems = orderObject.getHDWItems();

		this.arrParentEndDates = new Array();
		this.arrParentStartDates = new Array();
		this.currentFollowerCount = 1; //used to keep track of newrentech/newrensub dates
		this.licenseEmailsToSend = new Array();

		//map items by lineID
		var orderLineCount = recOrder.getLineItemCount('item');
		this.itemLineNums = new Array();

		for (var i = 1; i <= orderLineCount; i++) {
			var lineId = recOrder.getLineItemValue('item', 'id', i);
			itemLineNums[lineId] = i;
		}

		for (var i = 0; arrACRItems != null && i < arrACRItems.length && unitsLeft(1500) && timeLeft(); i++) {
			var acrItem = arrACRItems[i];
			var lineNum = acrItem['lineNum'];

			try {
				recOrder = processLineItemDates(recOrder, acrItem, orderUpdates, orderObject);
				recOrder = processACR(recOrder, acrItem, orderUpdates);
				//check if processed  last Insight line
				if (acrItem.acrId == 9) {
					var lastInsightline = checkIfLastInsightLine(arrACRItems, i);
					if (!lastInsightline) {
						recOrder.setFieldValue('custbodyr7_so_insight_plat_created', 'T');
						orderUpdates['custbodyr7_so_insight_plat_created'] = 'T';
					}
				}
				nlapiLogExecution('DEBUG', 'Processed ACL', acrItem['activationKey']);
			} catch (e) {
				nlapiSendEmail(55011, 'netsuite_admin@rapid7.com', 'ERROR PROCESSING AN ACL', e.name + ' : ' + e.message, ['michael_burstein@rapid7.com']);
				nlapiLogExecution('ERROR', 'ERROR PROCESSING AN ACL', e);
				recOrder.setLineItemValue('item', 'custcolr7translicenseid', lineNum, 'XXX');
				orderUpdates.lines[lineNum]['custcolr7translicenseid'] = 'XXX';
				exitScript = true;
				break;
			}
		}
		nlapiLogExecution('DEBUG', 'Finished ACLs', 'yup');
		//marking SO as good to go!
		//recOrder.setFieldValue('custbodyr7_so_license_fulfillment_st', 1);	//Ready for Fulfillment

		// Process add-ons now
		processACRAddOns(recOrder, arrAddOnItems, orderUpdates, orderObject);

		//done processing add-ons now
		determineOrderStartEndDates(recOrder, orderUpdates, orderObject);

		// Process Hardware, return array of hbrIds
		// Log how many hardware units need processing and how many were processed
		nlapiLogExecution('DEBUG', 'Hardware # Units to process: ', arrHWDItems.length);
		var arrHbrs = processHWD(recOrder, arrHWDItems, orderUpdates);
		nlapiLogExecution('DEBUG', 'Hardware # Units Completed: ', arrHbrs.length);

		// Send HBR notification to AM
		if (arrHbrs != null && arrHbrs.length > 0) {
			sendHBRNotifications(arrHbrs, recOrder);
		}

		// Handle 1Price ACL
		create1PriceFulfillments(recOrder, orderUpdates);

		//Handle 1Price Upgrades - Mid-Contract, or Early Renewal Orders
		process1PriceUpgrades(recOrder);

		// Item prop isfullfill and VSOE fullfill get lineIds for fulfillments
		//var arrItemFF = getItemFF(arrACRItems);
		//var itemFulFillmentIds = process_ItemFulfillments(recOrder,arrItemFF);

		// We no longer want to save the sales order here.  We will process the `orderUpdates` object later
		// nlapiSubmitRecord(recOrder, true, true);

		sendActivationEmails();
	} catch (e) {
		//luke is not ins SB1, add him later 194952346, TODO: change to the global option
		nlapiLogExecution('ERROR', 'Order ID: ' + recOrder.getId() + '\nError: ' + e.name + ' : ' + e.message, JSON.stringify(e));
		nlapiSendEmail(
			197052966,
			[87335123, 131416698, 192569849],
			'ERROR PROCESS ACL SCRIPT',
			'Order ID: ' + recOrder.getId() + '\nError: ' + e.name + ' : ' + e.message
		);
		if (e.name == 'RCRD_HAS_BEEN_CHANGED') {
			try {
				// https://issues.corp.rapid7.com/browse/APPS-16781
				var maxTries = 5;
				nlapiLogExecution('AUDIT', 'trying to setUnsavedDifferences from backup', 'max tries: ' + maxTries);
				var diffObj = recordsDeepCompare(JSON.parse(recOrderBackup), JSON.parse(JSON.stringify(recOrder)));
				for (var i = 1; i <= maxTries; i++) {
					try {
						function setTimeout(aFunction, milliseconds) {
							var date = new Date();
							date.setMilliseconds(date.getMilliseconds() + milliseconds);
							while (new Date() < date) {}
							return aFunction();
						}
						setTimeout(function () {
							setUnsavedDifferences(recOrder.getId(), diffObj);
							nlapiLogExecution('AUDIT', 'setUnsavedDifferences try: ' + i, 'succesfull');
							sendActivationEmails();
						}, 5000);
						break;
					} catch (setDiffError) {
						nlapiLogExecution('AUDIT', 'setUnsavedDifferences try: ' + i, 'failed');
						nlapiLogExecution('AUDIT', 'setUnsavedDifferences try: ' + i + '. Error:', setDiffError);
					}
				}
			} catch (er) {
				nlapiLogExecution(
					'ERROR',
					'setUnsavedDifferences FAILED as well - Order ID: ' + recOrder.getId() + '\nError: ' + er.name + ' : ' + er.message,
					JSON.stringify(er)
				);
			}
			nlapiSubmitField('salesorder', recOrder.getId(), 'custbodyr7_rcrd_change_error_happened', 'T');
		}
	}
}

/**
 * @method sendActivationEmails
 * @private
 */
function sendActivationEmails() {
	var memoizedGetSignature = memoize(getSignature);
	var memoizedGetTemplateVersion = memoize(getTemplateVersion);

	var objActivationEmailSent = {};

	for (var i = 0; licenseEmailsToSend != null && i < licenseEmailsToSend.length; i++) {
		var licRecordType = licenseEmailsToSend[i][0];
		var licRecordId = licenseEmailsToSend[i][1];
		var emailTemplateId = licenseEmailsToSend[i][2];
		var acrId = licenseEmailsToSend[i][3];
		var salesRepFieldId = arrProductTypes[acrId]['salesrep'];
		var contactFieldId = arrProductTypes[acrId]['contact'];
		var customerFieldId = arrProductTypes[acrId]['customer'];

		var fieldsToLookup = [salesRepFieldId, contactFieldId, customerFieldId];
		//var fieldsToLookup = ['custrecordr7nxlicensesalesrep', 'custrecordr7nxlicensecontact', 'custrecordr7nxlicensecustomer'];
		var newLicenseFields = nlapiLookupField(licRecordType, licRecordId, fieldsToLookup);
		var customerId = newLicenseFields[customerFieldId];
		var salesRepId = newLicenseFields[salesRepFieldId];
		var contactId = newLicenseFields[contactFieldId];

		nlapiLogExecution('DEBUG', 'In sendActivationEmail', 'Email Template Id: ' + emailTemplateId);
		var success = false;
		var successMsg = '';
		try {
			if (emailTemplateId != null) {
				// Get the employee id to send emails from and the reply to address from the script parameters
				var sendEmailFrom = context.getSetting('SCRIPT', 'custscriptr7acrprocessorderemailfrom');
				var emailReplyTo = context.getSetting('SCRIPT', 'custscriptr7acrprocessorderdeliveryreply');
				if (emailReplyTo == '') {
					// If the script parameter is blank then this needs to be null
					emailReplyTo = null;
				}
				// If the Script parameter is blank then send from Customer Success Manager
				if (sendEmailFrom == null || sendEmailFrom == '') {
					sendEmailFrom = memoizedLookupField('customer', customerId, 'custentityr7accountmanager');
				}

				//If no Customer Success Manager, send from salesrep
				if (sendEmailFrom == null || sendEmailFrom == '') {
					sendEmailFrom = salesRepId;
				}
				if (sendEmailFrom == null || sendEmailFrom == '') {
					sendEmailFrom = 2;
				}
				if (contactId != '' && contactId != null) {
					/**
					 * Change 277 nlapiMergeRecord Deprecation Script Cleanup
					 * 		Added branching for mergeRecord function deprecation
					 * 		Branch between freemarker/crmsdk to allow old function nlapiMergeRecord and new function nlapiCreateEmailMerger
					 */
					var subject, body;
					var templateVersion = memoizedGetTemplateVersion(emailTemplateId);
					if (templateVersion != 'FREEMARKER') {
						// CRMSDK Note: this is being deprecated.
						var merge = nlapiMergeRecord(emailTemplateId, licRecordType, licRecordId);

						subject = merge.getName();
						body = merge.getValue();
					} else {
						// the new FREEMARKER
						var emailMerger = nlapiCreateEmailMerger(emailTemplateId);
						emailMerger.setCustomRecord(licRecordType, licRecordId);

						var mergeResult = emailMerger.merge();
						subject = mergeResult.getSubject();
						body = mergeResult.getBody();
					}

					// Grab signature location in merged template
					var htmlContent = body;
					var matches = findSigMatches(htmlContent);

					// Grab info for signature
					var signature = memoizedGetSignature(sendEmailFrom);

					// Replace NLCUSTEATSIG tag with signature html
					htmlContent = replaceSigTagsWithContent(matches, htmlContent, signature);

					//Attach email to licensing record
					var records = new Array();
					records['recordtype'] = licRecordType;
					records['record'] = licRecordId;

					var sentEmailUniqueString = contactId + '_' + emailTemplateId + '_' + licRecordType + '_' + licRecordId;

					//Sending the email
					if (!objActivationEmailSent[sentEmailUniqueString]) {
						nlapiSendEmail(sendEmailFrom, contactId, subject, htmlContent, null, null, records, null, null, null, emailReplyTo);
					}
					objActivationEmailSent[sentEmailUniqueString] = true;
					success = true;
				} else {
					success = false;
					successMsg = 'Contact is null';
				}
			} else {
				//If no templateId is found declare victory. No email is sent.
				success = true;
			}
		} catch (e) {
			nlapiLogExecution('EMERGENCY', 'Could not mail activation email', e + '\n' + e.stack + '\n' + e.stackTraceLimit);

			success = false;
			successMsg = e;
		}
		//If fail to send activation email alert
		if (!success) {
			nlapiSendEmail(
				55011,
				'netsuite_admin@rapid7.com',
				'Error on ACL Process Sales Order - Could not email license purchaser his license key.',
				'\nLicenseId: <a href="https://663271.app.netsuite.com/app/common/custom/custrecordentry.nl?id=' +
					licRecordId +
					'&rectype=' +
					licRecordType +
					'&whence=">' +
					licRecordId +
					'</a>\nContactId: <a href="https://663271.app.netsuite.com/app/common/entity/contact.nl?id=' +
					contactId +
					'">' +
					contactId +
					'</a>\n\nMessage: ' +
					successMsg
			);
		}
	}
}

/**
 * Not called.
 *
 * @method sendErrorEmail
 * @private
 * @param {Array} fields
 * @param {String} text
 */
function sendErrorEmail(fields, text) {
	nlapiLogExecution('ERROR', 'Error on', text);
	var fieldListing = '';
	for (field in fields) {
		fieldListing += field + ': ' + fields[field] + '<br>';
	}
	nlapiSendEmail(55011, 'netsuite_admin@rapid7.com', 'Error on ACL Process Sales Order - FMR', text + '<br>' + fieldListing);
}

/**
 * Call commented out
 *
 * @method getItemFF
 * @private
 * @param {Array} arrACRItems
 * @returns {Array} arrItemFF
 */
function getItemFF(arrACRItems) {
	var arrItemFF = new Array();
	//var acrProductIdsArray = acrProductIds.split(',');
	if (arrACRItems != null) {
		for (var i = 0; i < arrACRItems.length; i++) {
			var lineItem = arrACRItems[i];
			var vsoeDelivered = lineItem['vsoedelivered'];
			var isFulfillable = lineItem['isfulfillable'];
			if (isFulfillable == 'T' && vsoeDelivered == 'T') {
				arrItemFF[arrItemFF.length] = lineItem;
			}
		}
	}
	return arrItemFF;
}

//TODO remore

function cloneObj(obj) {
	var cloned = JSON.parse(JSON.stringify(obj));
	for (var key in cloned) {
		if (typeof cloned[key] === 'object') {
			cloned[key] = cloneObj(cloned[key]);
		}
	}

	return cloned;
}

function checkIfLastInsightLine(arrACRItems, i) {
	var foundInsightLine = false;
	if (i + 1 < arrACRItems.length) {
		for (var j = i + 1; j < arrACRItems.length; j++) {
			if (Number(arrACRItems[j].acrId) == 9) {
				foundInsightLine = true;
				break;
			}
		}
	}
	nlapiLogExecution('DEBUG', 'check if line ' + i + ' is the last insight line', foundInsightLine);
	return foundInsightLine;
}

/*var numberOfItems= itemFulfillment .getLineItemCount('item');
 for (var i = 1; i <= numberOfItems;++i) {
	itemFulfillment .setLineItemValue('item', 'itemreceive', i, 'T');
 } */

/**
 * Call commented out
 *
 * @method process_ItemFulfillments
 * @private
 * @param {Object} recOrder
 * @param {Array} arrItemFF
 */
function process_ItemFulfillments(recOrder, arrItemFF) {
	var itemFulFillmentIds = new Array();
	for (var i = 0; arrItemFF != null && i < arrItemFF.length && unitsLeft(1500) && timeLeft(); i++) {
		var lineItem = arrItemFF[i];
		var lineId = lineItem['lineId'];
		var lineNum = lineItem['lineNum'];
		var orderId = recOrder.getId();

		// Get default values
		var shipmethod = 174; //download
		var customerId = recOrder.getFieldValue('customer');
		var memo = recOrder.getLineItemValue('item', 'custcolr7translicenseid', lineNum);

		// If no order Errors
		if (memo != 'XXX' && memo != null && memo != '') {
			nlapiLogExecution('DEBUG', 'memo: ' + lineNum + ' / ' + lineId, memo);

			// Build object for default field:value pairs
			var objItemFFVals = new Object();
			objItemFFVals['shipmethod'] = shipmethod;
			objItemFFVals['entity'] = customerId;
			objItemFFVals['memo'] = memo;
			//objItemFFVals['trandate'] = new Date();

			// Transform to Fulfillment record using objItemFF vals
			var recItemFulfillment = nlapiTransformRecord('salesorder', orderId, 'itemfulfillment');
			for (key in objItemFFVals) {
				recItemFulfillment.setFieldValue(key, objItemFFVals[key]);
			}
			var fulfillmentId = nlapiSubmitRecord(recItemFulfillment);
			nlapiLogExecution('DEBUG', 'fulfillment: ' + lineNum + ' / ' + lineId, fulfillmentId);
			itemFulFillmentIds[itemFulFillmentIds.length] = fulfillmentId;
		} else {
			nlapiSendEmail(340932, 340923, 'ERROR FULFILLING ITEM LINEID: ' + lineId);
		}
	}
}
