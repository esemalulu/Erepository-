/*
 * @author efagone
 */

var SEND_ACL_EMAILS_FROM = 340932;
 
function processSalesOrder(){

	this.startingTime = new Date().getTime();
	this.context = nlapiGetContext();
	this.rescheduleScript = false;
	this.debug = true;
	var exitScript = false;
	var arrSearchResults = nlapiSearchRecord('transaction', 10071);
	
	for (var k = 0; arrSearchResults != null && k < arrSearchResults.length && unitsLeft(1500) && timeLeft(7); k++) {
	
		var searchResult = arrSearchResults[k];
		var columns = searchResult.getAllColumns();
		var orderId = searchResult.getValue(columns[0]);
		
		var recOrder = nlapiLoadRecord('salesorder', orderId);
		nlapiLogExecution('DEBUG', 'Processing Order', recOrder.getRecordType() + ': ' + recOrder.getId());
		
		//clean up associations in-case it was only associated on quote
		recOrder = reAssociateItems(recOrder, null, null);
		
		try {
			//remove this after testing
			var customerId = recOrder.getFieldValue('entity');
			recOrder = setAllLocation(recOrder);
			var orderObject = getOrderObject(recOrder);
			var strToday = nlapiDateToString(new Date());
			
			var arrItems = getItemsFromOrder(recOrder);
			var arrACLItems = getACLItems(arrItems);
			var arrAllAddOnItems = getAddOnItems(arrItems);
			var arrAddOnItems = arrAllAddOnItems[0];
			
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
			nlapiLogExecution('DEBUG', 'arrACLItems.length', arrACLItems.length);
			for (var i = 0; arrACLItems != null && i < arrACLItems.length && unitsLeft(1500) && timeLeft(); i++) {
				var aclItem = arrACLItems[i];
				var lineNum = aclItem['lineNum'];
				
				try {
					recOrder = processLineItemDates(recOrder, aclItem);
					recOrder = processACL(recOrder, aclItem);
					nlapiLogExecution('DEBUG', 'Processed ACL', aclItem['productKey']);
				} 
				catch (e) {
					nlapiSendEmail(55011, 55011, 'ERROR PROCESSING AN ACL', 'InternalID: ' + recOrder.getId() + '\nError: ' + e.name + ' : ' + e.message);
					recOrder.setLineItemValue('item', 'custcolr7translicenseid', lineNum, 'XXX');
					exitScript = true;
					break;
				}
				
			}
			nlapiLogExecution('DEBUG', 'Finished ACLs', 'yup');
			
			for (var i = 0; arrAddOnItems != null && i < arrAddOnItems.length && unitsLeft(1000) && timeLeft() && !exitScript; i++) {
				try {
					var lineItem = arrAddOnItems[i];
					var itemId = lineItem['itemId'];
					var lineNum = lineItem['lineNum'];
					var licenseId = lineItem['licenseId'];
					var productKey = recOrder.getLineItemValue('item', 'custcolr7itemmsproductkey', lineNum);
					nlapiLogExecution('DEBUG', 'lineItem[productKey]', lineItem['productKey']);
					
					var fields = new Array();
					if ((productKey != '' && productKey != null) && (licenseId == '' || licenseId == null)) {
					
						nlapiLogExecution('DEBUG', 'Processing addOn dates', lineId);
						recOrder = processLineItemDates(recOrder, lineItem);
						nlapiLogExecution('DEBUG', 'Finished processing addOn dates', lineId);
						
						if (productKey.substr(0, 4) == 'PEND') {
							var parentACLLineId = productKey.substr(5);
							var parentOrderId = parentACLLineId.substr(0, parentACLLineId.indexOf('_'));
							nlapiLogExecution('DEBUG', 'parentOrderId', parentOrderId);
							
							if (parentOrderId == orderId) {
								var recParentOrder = recOrder;
								var parentLineNum = itemLineNums[parentACLLineId];
							}
							else {
								try {
									var recParentOrder = nlapiLoadRecord('salesorder', parentOrderId);
								} 
								catch (e) {
									try {
										var recParentOrder = nlapiLoadRecord('estimate', parentOrderId);
									} 
									catch (e) {
										var recParentOrder = nlapiLoadRecord('opportunity', parentOrderId);
									}
								}
								var parentLineNum = findParentLineNumber(recParentOrder, parentACLLineId);
							}
							
							fields['productKey'] = recParentOrder.getLineItemValue('item', 'custcolr7itemmsproductkey', parentLineNum);
							fields['parentLicId'] = recParentOrder.getLineItemValue('item', 'custcolr7translicenseid', parentLineNum);
							
						}
						else {
							fields['productKey'] = productKey;
						}
						
						fields['itemId'] = itemId;
						fields['lineNum'] = lineNum;
						fields['lineId'] = recOrder.getLineItemValue('item', 'id', lineNum);
						
						
						if (fields['parentLicId'] != 'XXX' && fields['productKey'] != null && fields['productKey'].substr(0, 4) != 'PEND') {
						
							nlapiLogExecution('DEBUG', 'fields[productKey]', fields['productKey']);
							var returnedFields = createAddOnFMR(recOrder, fields);
							nlapiLogExecution('DEBUG', 'created FMR', itemId);
							
							var licenseName = returnedFields[0];
							var success = returnedFields[1];
							var newProductKey = returnedFields[2];
							
							if (success) {
								recOrder.setLineItemValue('item', 'custcolr7translicenseid', lineNum, licenseName);
								recOrder.setLineItemValue('item', 'custcolr7itemmsproductkey', lineNum, newProductKey);
							//recOrder.setLineItemValue('item', 'vsoedelivered', lineNum, 'T');
							}
							else {
								recOrder.setLineItemValue('item', 'custcolr7translicenseid', lineNum, 'XXX');
							}
						}
						else {
							recOrder.setLineItemValue('item', 'custcolr7translicenseid', lineNum, 'XXX');
						}
					}
				} 
				catch (e) {
					nlapiSendEmail(55011, 55011, 'ERROR PROCESSING AN ADDON', 'OrderID: ' + recOrder.getId() + '\nlineNum: ' + lineNum + '\n' + e.name + ' : ' + e.message);
					nlapiLogExecution('ERROR', 'ERROR PROCESSING AN ADDON', 'OrderID: ' + recOrder.getId() + '\n' + e.name + ' : ' + e.message);
					recOrder.setLineItemValue('item', 'custcolr7translicenseid', lineNum, 'XXX');
					exitScript = true;
					break;
				}
			}

			determineOrderStartEndDates(recOrder, null, orderObject);
			
			nlapiSubmitRecord(recOrder, true, true);
			sendActivationEmails();
		} 
		catch (e) {
			nlapiSendEmail(55011, 55011, 'ERROR PROCESS ACL SCRIPT', e.name + ' : ' + e.message);
			break;
		}
	}
	
	nlapiScheduleScript(462, 3);
	nlapiLogExecution('DEBUG', 'Finished ACL Script', 'Units to spare: ' + context.getRemainingUsage());
	
	if (rescheduleScript && !exitScript) {
		nlapiLogExecution('DEBUG', 'Rescheduling script (script/deploy id)', context.getScriptId() + ' : ' + context.getDeploymentId());
		//var status = nlapiScheduleScript(context.getScriptId(), context.getDeploymentId());
		//nlapiLogExecution('DEBUG', 'Schedule Status', status);
	}
	
}

function createAddOnFMR(recOrder, fields){
	nlapiLogExecution('DEBUG', 'lineNum', fields['lineNum']);
	
	var orderId = recOrder.getId();
	var productKey = recOrder.getLineItemValue('item', 'custcolr7itemmsproductkey', fields['lineNum']);
	var startDate = recOrder.getLineItemValue('item', 'revrecstartdate', fields['lineNum']);
	var endDate = recOrder.getLineItemValue('item', 'revrecenddate', fields['lineNum']);
	
	var addOns = getItemAddOns(fields['itemId']);
	
	var failed = false;
	
	var arrDates = getDatesByACL(recOrder, productKey);
	var arrAddOnDates = getDatesByAddOn(recOrder, productKey, null);
	
	var isACLOrder = true;
	nlapiLogExecution('DEBUG', 'arrDates[\'aclStartDate\']', arrDates['aclStartDate']);
	if (arrDates['aclStartDate'] == null || arrDates['aclStartDate'] == ''){
			isACLOrder = false;
	}
	nlapiLogExecution('DEBUG', 'isACLOrder', isACLOrder);
	for (var i = 0; addOns != null && i < addOns.length && unitsLeft(200) && timeLeft(); i++) {
	
		var addOnId = addOns[i];
		var fieldsToLookup = ['custrecordr7acladdon_fieldid', 'custrecordr7acladdon_value', 'custrecordr7acladdon_specificvalue', 'custrecordr7acladdon_fieldtype']
		var addOnFields = nlapiLookupField('customrecordr7acladdoncomponents', addOnId, fieldsToLookup);
		fields['licFieldId'] = addOnFields.custrecordr7acladdon_fieldid;
		fields['licFieldType'] = addOnFields.custrecordr7acladdon_fieldtype;
		fields['licValueId'] = addOnFields.custrecordr7acladdon_value;
		fields['licSpecificValue'] = addOnFields.custrecordr7acladdon_specificvalue;
		fields['licRecordId'] = nlapiLookupField('customrecordr7acladdoncomponents', addOnId, 'custrecordr7aclrecord_internalid', 'text');
		
		if (fields['licFieldType'] == 'date') { // if add on is a date, it should take effect immediatly
			startDate = nlapiDateToString(new Date());
		}
		else //end date for nondate features should be the current end date for product
 			if (arrParentEndDates[productKey] != '' && arrParentEndDates[productKey] != null && arrParentEndDates[productKey] != 'undefined') {
				endDate = arrParentEndDates[productKey];
			}
			else 
				if (!isACLOrder) {
					endDate = arrAddOnDates['addOnMaxEndDate'];
				}
		
		var licenseInfo = findLicenceInfo(fields['productKey'], fields['licRecordId']);
		fields['licenseId'] = licenseInfo[1];
		fields['licenseName'] = licenseInfo[2];
		
		nlapiLogExecution('DEBUG', 'productKey', productKey);
		nlapiLogExecution('DEBUG', 'arrParentEndDates[productKey]', arrParentEndDates[productKey]);
		
		if (fields['licFieldType'] == 'date' && fields['licValueId'] == 4 && !isACLOrder) {
		
		// do nothing, it is only an addOn purchase
		}
		else {
			var result = calculateAddOnValue(recOrder, fields);
			nlapiLogExecution('DEBUG', 'FMR result', result);
			
			if (result != 'noChange') {
			
				var newFMRRecord = nlapiCreateRecord('customrecordr7licensefeaturemanagement');
				newFMRRecord.setFieldValue('custrecordr7licfmfeature', addOnId);
				newFMRRecord.setFieldValue('custrecordr7licfmvalue', result);
				newFMRRecord.setFieldValue('custrecordr7licfmsalesorder', orderId);
				newFMRRecord.setFieldValue('custrecordr7licfmstartdate', startDate);
				newFMRRecord.setFieldValue('custrecordr7licfmenddate', endDate);
				newFMRRecord.setFieldValue('custrecordr7licfmproductkey', fields['productKey']);
				newFMRRecord.setFieldValue('custrecordr7licfmstatus', 1);
				newFMRRecord.setFieldValue('custrecordr7licfmaclcreated', 'T');
				newFMRRecord.setFieldValue('custrecordr7licfmitemlineid', fields['lineId']);
				var id = nlapiSubmitRecord(newFMRRecord);
				if (id == null || id == '') {
					failed = true;
				}
			}
		}
	}
	
	if (!failed) {
		return new Array(fields['licenseName'], true, fields['productKey']);
	}
	else {
		return new Array('XXX', false);
	}
	
}

function calculateAddOnValue(recOrder, fields){
		
	var result;
	
	switch (fields['licValueId']) {
		case '1':
			result = 'T'
			break;
		case '2':
			result = 'F'
			break;
		case '3':
			result = recOrder.getLineItemValue('item', 'quantity', fields['lineNum']);
			break;
		case '4':
			result = recOrder.getLineItemValue('item', 'revrecenddate', fields['lineNum']);
			break;
		case '5':
			result = fields['licSpecificValue'];
			break;
		case '6':
			result = fields['licSpecificValue'];//array
			break;
		case '7':
			result = 'noChange';
			break;
		case '8':
			result = 'noChange';
			break;
		case '9':
			result = recOrder.getLineItemValue('item', 'revrecenddate', fields['lineNum']);
			break;
		default:
			result = 'noChange';
	}
	
	if (result == null || result == ''){
		result = 'noChange';
	}
	
	return result;
	
}

function processACL(recOrder, aclItem){

	var strToday = nlapiDateToString(new Date());
	var lineId = aclItem['lineId'];
	var lineNum = aclItem['lineNum'];
	var licenseId = aclItem['licenseId'];
	var productKey = recOrder.getLineItemValue('item', 'custcolr7itemmsproductkey', lineNum);
	
	//If the line-item is an ACL Order && and the license hasn't already been created
	if ((productKey != '' && productKey != null) && (licenseId == '' || licenseId == null)) {
		nlapiLogExecution('DEBUG', 'Needs processing', 'Yup');
				
		var itemProperties = aclItem['itemProperties'];
		var salesRep = recOrder.getFieldValue('salesrep');
		var activationNeeded = recOrder.getLineItemValue('item', 'custcolr7transautocreatelicense', lineNum);
		var licenseId = recOrder.getLineItemValue('item', 'custcolr7translicenseid', lineNum);
		
		//The fields array contains all the parameters for creating/renewing a license
		var fields = new Array();
		//Determining the orderType and productLine
		if (itemProperties['custitemr7itemmslicensetype1'] != null && itemProperties['custitemr7itemmslicensetype1'] != '') {
			fields['productline'] = 'metasploit';
			var licenseType = itemProperties['custitemr7itemmslicensetype1'];
		}
		else 
			if (itemProperties['custitemr7itemnxlicensetype'] != null && itemProperties['custitemr7itemnxlicensetype'] != '') {
				fields['productline'] = 'nexpose';
				var licenseType = itemProperties['custitemr7itemnxlicensetype'];
			}
		
		//Lookup the primarycontact of the customer
		var presentContact = recOrder.getLineItemValue('item', 'custcolr7translinecontact', lineNum);
		
		if (presentContact == null || presentContact == '') {
			var customerId = recOrder.getFieldValue('entity');
			var contactEmail = recOrder.getFieldValue('email');
			var lineItemContact = obtainLineItemContact(customerId, contactEmail);
			recOrder.setLineItemValue('item', 'custcolr7translinecontact', lineNum, lineItemContact);
			nlapiLogExecution('DEBUG', 'Set Primary Contact To', lineItemContact);
		}
		nlapiLogExecution('DEBUG', 'Contact ID for License', recOrder.getLineItemValue('item', 'custcolr7translinecontact', lineNum));
				
		//ProductLine should be set to metasploit or nexpose
		fields['custitemr7itemactivationemailtemplate'] = itemProperties['custitemr7itemactivationemailtemplate'];
		fields['startDate'] = recOrder.getLineItemValue('item', 'revrecstartdate', lineNum);
		fields['expirationDate'] = recOrder.getLineItemValue('item', 'revrecenddate', lineNum);
		fields['productKey'] = productKey;
		fields['licenseId'] = recOrder.getLineItemValue('item', 'custcolr7translicenseid', lineNum);
		fields['customer'] = recOrder.getFieldValue('entity');
		fields['salesorder'] = recOrder.getId();
		fields['salesrep'] = recOrder.getFieldValue('salesrep');
		fields['contact'] = recOrder.getLineItemValue('item', 'custcolr7translinecontact', lineNum);
		fields['lineId'] = recOrder.getLineItemValue('item', 'id', lineNum);
		fields['licenseTemplate'] = licenseType;
		fields['opportunity'] = recOrder.getFieldValue('opportunity');
		
		//if the productline is metasploit
		nlapiLogExecution('DEBUG', 'Time to process', 'yup');
		if (fields['productline'] == 'metasploit') {
		
			if (productKey.substr(0,4) == 'PEND') {
				var returnedFields = createNewMetasploitLicense(fields);
			}
			else {
				var returnedFields = createRenewalFMR(fields);
			}
		}
		if (fields['productline'] == 'nexpose') {
			if (productKey.substr(0,4) == 'PEND') {
				var returnedFields = createNewNexposeLicense(fields);
			}
			else {
				var returnedFields = createRenewalFMR(fields);
			}
		}
		
		var licenseName = returnedFields[0];
		var success = returnedFields[1];
		var newProductKey = returnedFields[2];
		
		nlapiLogExecution('DEBUG', 'success', success);
		
		if (success) {
			recOrder.setLineItemValue('item', 'custcolr7translicenseid', lineNum, licenseName);
			recOrder.setLineItemValue('item', 'custcolr7itemmsproductkey', lineNum, newProductKey);
			//recOrder.setLineItemValue('item', 'vsoedelivered', lineNum, 'T');
			
			if (productKey != newProductKey) {
				reAssociateItems(recOrder, productKey, newProductKey);
			}
		}
		else {
			recOrder.setLineItemValue('item', 'custcolr7translicenseid', lineNum, 'XXX');
			//recOrder.setLineItemValue('item', 'custcolr7itemmsproductkey', lineNum, '');
		}
		
		nlapiLogExecution('DEBUG', 'Processed ACL', lineId);
		
	}//If the line-item is an ACL Order && and the license hasn't already been created
	var revRecStartDate = recOrder.getLineItemValue('item', 'revrecstartdate', lineNum);
	var revRecEndDate = recOrder.getLineItemValue('item', 'revrecenddate', lineNum);
	arrParentStartDates[productKey] = revRecStartDate;
	arrParentEndDates[productKey] = revRecEndDate;
	
	return recOrder;
}

function createRenewalFMR(fields){
	if (fields['productline'] == 'nexpose') {
		var licRecord = 'customrecordr7nexposelicensing';
	}
	if (fields['productline'] == 'metasploit') {
		var licRecord = 'customrecordr7metasploitlicensing';
	}
	
	nlapiLogExecution('DEBUG', 'Using this licTemplate', fields['licenseTemplate']);
	var recLicTemplate = nlapiCopyRecord(licRecord, fields['licenseTemplate']);
	compareToAvailableAddOns(recLicTemplate, fields, true);
	
	var arrlicenseInfo = findLicenceInfo(fields['productKey'], licRecord);
	var licenseId = arrlicenseInfo[1];
	var licenseName = arrlicenseInfo[2];
	
	if (licRecord == 'customrecordr7nexposelicensing') {
		var component = '8'; //nx expiration date
	}
	else if (licRecord == 'customrecordr7metasploitlicensing') {
		var component = '11'; //ms expiration date
	}
		
	var newFMRRecord = nlapiCreateRecord('customrecordr7licensefeaturemanagement');
	newFMRRecord.setFieldValue('custrecordr7licfmfeature', component);
	newFMRRecord.setFieldValue('custrecordr7licfmstartdate', nlapiDateToString(new Date()));
	newFMRRecord.setFieldValue('custrecordr7licfmenddate', fields['expirationDate']);
	newFMRRecord.setFieldValue('custrecordr7licfmsalesorder', fields['salesorder']);
	newFMRRecord.setFieldValue('custrecordr7licfmvalue', fields['expirationDate']);
	newFMRRecord.setFieldValue('custrecordr7licfmproductkey', fields['productKey']);
	newFMRRecord.setFieldValue('custrecordr7licfmstatus', 1);
	newFMRRecord.setFieldValue('custrecordr7licfmaclcreated', 'T');
	newFMRRecord.setFieldValue('custrecordr7licfmitemlineid', fields['lineId']);
	var id = nlapiSubmitRecord(newFMRRecord);
	
	nlapiLogExecution('DEBUG', 'FMR ID', id);
	if (id != null && id != '') {
		return new Array(licenseName, true, fields['productKey']);
	}
	else {
		return new Array('XXX', false);
	}
	
}

function setAllLocation(recOrder){
	for (var i = 1; i <= recOrder.getLineItemCount('item'); i++) {
		var location = recOrder.getLineItemValue('item', 'location', i);
		if (location == null || location == '') {
			recOrder.setLineItemValue('item', 'location', i, recOrder.getFieldValue('location'));
		}
	}
	return recOrder;
}

function obtainLineItemContact(customerId, email){
	//Check if customerId, email, and give acesss
	
	nlapiLogExecution('DEBUG', 'CustomerId of SalesOrder', customerId);
	nlapiLogExecution('DEBUG', 'Email of salesOrder', email);
	
	var searchFilters = new Array(new nlobjSearchFilter('company', null, 'is', customerId), new nlobjSearchFilter('email', null, 'is', email));
	
	var results = nlapiSearchRecord('contact', null, searchFilters);
	if (results != null) {
		contactId = results[0].getId();
	}
	else {
		contactId = null;
	}
	return contactId;
}

function createNewMetasploitLicense(fields){
	//Creating new metasploit License record from Template
	var newRecord = nlapiCopyRecord('customrecordr7metasploitlicensing', fields['licenseTemplate']);
	
	//Null out ProductKey, Nexpose License Serial No, Product Serial No
	newRecord.setFieldValue('custrecordr7msproductkey', '');
	newRecord.setFieldValue('custrecordr7mslicenseserialnumber', '');
	newRecord.setFieldValue('custrecordr7msproductserialno', '');
	
	//Setting other fields
	newRecord.setFieldValue('custrecordr7mslicenseexpirationdate', fields['expirationDate']);
	newRecord.setFieldValue('custrecordr7mslicensesalesrep', fields['salesrep']);
	newRecord.setFieldValue('custrecordr7mslicensecustomer', fields['customer']);
	newRecord.setFieldValue('custrecordr7mslicensesalesorder', fields['salesorder']);
	newRecord.setFieldValue('custrecordr7mslicensecontact', fields['contact']);
	newRecord.setFieldValue('custrecordr7mslicenseopportunity', fields['opportunity']);
	newRecord.setFieldValue('custrecordr7mslicensefeaturemgmntcreated', 'T');
	newRecord.setFieldValue('custrecordr7mslicensecomments', '');
	
	try {
		var id = nlapiSubmitRecord(newRecord);

		licenseEmailsToSend[licenseEmailsToSend.length] = ['customrecordr7metasploitlicensing', id, fields['custitemr7itemactivationemailtemplate']];

		var fieldsToLookup = ['name', 'custrecordr7msproductkey', 'custrecordr7mslicenseexpirationdate']
		var newLicenseFields = nlapiLookupField('customrecordr7metasploitlicensing', id, fieldsToLookup);
		
		var licName = newLicenseFields.name;
		var productKey = newLicenseFields.custrecordr7msproductkey;
		var expirationDate = newLicenseFields.custrecordr7mslicenseexpirationdate;
				
		nlapiLogExecution('DEBUG', 'ProductKey', productKey);
		
		//creating built-in FMRs
		fields['productKey'] = productKey;
		compareToAvailableAddOns(newRecord, fields, false);
		
		return new Array(licName, true, productKey, nlapiDateToString(new Date()), expirationDate);
		
	} 
	catch (e) {
		sendErrorEmail(fields, "Could not submit new license record " + e);
		return new Array('XXX', false);
	}
	
}

function createNewNexposeLicense(fields){

	//Creating new nexpose License record from Template
	var newRecord = nlapiCopyRecord('customrecordr7nexposelicensing', fields['licenseTemplate']);
	
	//Null out ProductKey, Nexpose License Serial No, Product Serial No
	newRecord.setFieldValue('custrecordr7nxproductkey', '');
	newRecord.setFieldValue('custrecordr7nxlicenseserialnumber', '');
	newRecord.setFieldValue('custrecordr7nxproductserialnumber', '');
	
	//Setting additional info
	newRecord.setFieldValue('custrecordr7nxlicenseoemstartdate', nlapiDateToString(new Date()));
	newRecord.setFieldValue('custrecordr7nxlicenseexpirationdate', fields['expirationDate']);
	newRecord.setFieldValue('custrecordr7nxlicensecustomer', fields['customer']);
	newRecord.setFieldValue('custrecordr7nxlicensesalesorder', fields['salesorder']);
	newRecord.setFieldValue('custrecordr7nxlicensecontact', fields['contact']);
	newRecord.setFieldValue('custrecordr7nxlicenseopportunity', fields['opportunity']);
	newRecord.setFieldValue('custrecordr7nxlicensefeaturemgmntcreated', 'T');
	newRecord.setFieldValue('custrecordr7nxlicensecomments', '');
	
	try {
		var id = nlapiSubmitRecord(newRecord);
		
		licenseEmailsToSend[licenseEmailsToSend.length] = ['customrecordr7nexposelicensing', id, fields['custitemr7itemactivationemailtemplate']];

		var fieldsToLookup = ['name', 'custrecordr7nxproductkey', 'custrecordr7nxlicenseexpirationdate']
		var newLicenseFields = nlapiLookupField('customrecordr7nexposelicensing', id, fieldsToLookup);
		
		var licName = newLicenseFields.name;
		var productKey = newLicenseFields.custrecordr7nxproductkey;
		var expirationDate = newLicenseFields.custrecordr7nxlicenseexpirationdate;
		
		nlapiLogExecution('DEBUG', 'ProductKey', productKey);
		
		//also creating FMR's for included features
		fields['productKey'] = productKey;
		compareToAvailableAddOns(newRecord, fields, false);
		
		return new Array(licName, true, productKey, nlapiDateToString(new Date()), expirationDate);
		
	} 
	catch (e) {
		sendErrorEmail(fields, "Could not submit new license record " + e);
		return new Array('XXX', false);
	}
}

function compareToAvailableAddOns(newRecord, fields, isRenewal){
	
	var now = new Date();
	
	var arrSearchFilters = new Array();
	arrSearchFilters[0] = new nlobjSearchFilter('custrecordr7acladdon_fieldid', null, 'isnot', 'id');
	arrSearchFilters[1] = new nlobjSearchFilter('custrecordr7acladdon_value', null, 'noneof', new Array(7,8));
	
	
	var arrSearchColumns = new Array();
	arrSearchColumns[0] = new nlobjSearchColumn('custrecordr7acladdon_fieldid');
	arrSearchColumns[1] = new nlobjSearchColumn('custrecordr7acladdon_fieldtype');
	arrSearchColumns[2] = new nlobjSearchColumn('custrecordr7acladdon_value');
	arrSearchColumns[3] = new nlobjSearchColumn('custrecordr7acladdon_specificvalue');
	
	var arrSearchResults = nlapiSearchRecord('customrecordr7acladdoncomponents', null, arrSearchFilters, arrSearchColumns);
	
	var allFields = newRecord.getAllFields();
	
	for (var i = 0; arrSearchResults != null && i < arrSearchResults.length; i++) {
		var createAddOn = false;
		var searchResult = arrSearchResults[i];
		var addOnId = searchResult.getId();
		var fieldId = searchResult.getValue(arrSearchColumns[0]);
		var fieldType = searchResult.getValue(arrSearchColumns[1]);
		var valueId = searchResult.getValue(arrSearchColumns[2]);
		var specificValue = searchResult.getValue(arrSearchColumns[3]);
		
		if (allFields.indexOf(fieldId) != -1) {
			var fieldValue = newRecord.getFieldValue(fieldId);
			
			if (fieldType == 'date' || fieldType == 'integer') {
			
				if ((specificValue == '' || specificValue == null) && (fieldValue != null && fieldValue != '')) {
				
					createAddOn = true;
					
					if (fieldId == 'custrecordr7nxlicensenumberips' && (fieldValue == '1' || fieldValue == '0')) {
						createAddOn = false;
					}
					
					if (isRenewal && (fieldId == 'custrecordr7nxlicenseexpirationdate' || fieldId == 'custrecordr7mslicenseexpirationdate')) {
						createAddOn = false;
					}
				}
			}
			else 
				if ((specificValue != '' || specificValue != null) && fieldValue == specificValue && fieldValue != 'F') {
					createAddOn = true;
				}
				else 
					if ((specificValue == '' || specificValue == null) && fieldType == 'select') {
						createAddOn = true;
					}
		}
		
		if (createAddOn) {
			allFields[allFields.indexOf(fieldId)] = '';
			
			var fmrStart = fields['startDate'];
			
			if (fieldType == 'date') { // if add on is a date, it should take effect immediatly
				fmrStart = nlapiDateToString(now);
			}
			else // if add on is NOT a date, end date should be current max end date
 				if (arrParentEndDates[fields['productKey']] != '' && arrParentEndDates[fields['productKey']] != null && arrParentEndDates[fields['productKey']] != 'undefined') {
					endDate = arrParentEndDates[fields['productKey']];
				}
			
			var now = new Date();
			if (nlapiStringToDate(fmrStart) >= nlapiAddDays(now, 1)){
				var status = 1;
			}
			else {
				var status = 3;
			}
			
			var newFMRRecord = nlapiCreateRecord('customrecordr7licensefeaturemanagement');
			newFMRRecord.setFieldValue('custrecordr7licfmfeature', addOnId);
			newFMRRecord.setFieldValue('custrecordr7licfmvalue', fieldValue);
			newFMRRecord.setFieldValue('custrecordr7licfmsalesorder', fields['salesorder']);
			newFMRRecord.setFieldValue('custrecordr7licfmstartdate', fmrStart);
			newFMRRecord.setFieldValue('custrecordr7licfmenddate', fields['expirationDate']);
			newFMRRecord.setFieldValue('custrecordr7licfmproductkey', fields['productKey']);
			newFMRRecord.setFieldValue('custrecordr7licfmstatus', status);
			newFMRRecord.setFieldValue('custrecordr7licfmaclcreated', 'T');
			newFMRRecord.setFieldValue('custrecordr7licfmitemlineid', fields['lineId']);
			
			try {
				var id = nlapiSubmitRecord(newFMRRecord);
			}
			catch (e) {
				nlapiSendEmail(55011, 55011, 'Could not create built-in FMR', 'AddOnId: ' + addOnId + '\nSalesOrder: ' + fields['salesorder']);
			}
		}
		
	}
	
}

function sendActivationEmails(){
	
	for (var i = 0; licenseEmailsToSend != null && i < licenseEmailsToSend.length; i++) {
		var licRecordType = licenseEmailsToSend[i][0];
		var licRecordId = licenseEmailsToSend[i][1];
		var emailTemplateId = licenseEmailsToSend[i][2];
		
		if (licRecordType == 'customrecordr7nexposelicensing') {
			var fieldsToLookup = ['custrecordr7nxlicensesalesrep', 'custrecordr7nxlicensecontact', 'custrecordr7nxlicensecustomer']
			var newLicenseFields = nlapiLookupField(licRecordType, licRecordId, fieldsToLookup);
			var customerId = newLicenseFields.custrecordr7nxlicensecustomer;
			var salesRepId = newLicenseFields.custrecordr7nxlicensesalesrep;
			var contactId = newLicenseFields.custrecordr7nxlicensecontact;
		}
		if (licRecordType == 'customrecordr7metasploitlicensing') {
			var fieldsToLookup = ['custrecordr7mslicensesalesrep', 'custrecordr7mslicensecontact', 'custrecordr7mslicensecustomer']
			var newLicenseFields = nlapiLookupField(licRecordType, licRecordId, fieldsToLookup);
			var customerId = newLicenseFields.custrecordr7mslicensecustomer;
			var salesRepId = newLicenseFields.custrecordr7mslicensesalesrep;
			var contactId = newLicenseFields.custrecordr7mslicensecontact;
		}
		
		nlapiLogExecution('DEBUG', 'In sendActivationEmail', 'Email Template Id: ' + emailTemplateId)
		var success = false;
		
		try {
			if (emailTemplateId != null) {
				
				var sendEmailFrom = nlapiLookupField('customer', customerId, 'custentityr7accountmanager');
				
				//If no account manager, send from salesrep
				if (sendEmailFrom == null || sendEmailFrom == '') {
					sendEmailFrom = salesRepId;
				}
				if (sendEmailFrom == null || sendEmailFrom == '') {
					sendEmailFrom = 2;
				}
				if (contactId != '' && contactId != null) {
				
					//Attaching email to licensing record
					var records = new Array();
					records['recordtype'] = licRecordType;
					records['record'] = licRecordId;
					var body = nlapiMergeRecord(emailTemplateId, licRecordType, licRecordId);
					
					//Sending the email
					nlapiSendEmail(sendEmailFrom, contactId, body.getName(), body.getValue(), null, null, records);
					
					success = true;
				}
				else {
					success = false;
				}
			}
			else { //If no templateId is found declare victory. No email is sent.
				success = true;
			}
		} 
		catch (e) {
			nlapiLogExecution("EMERGENCY", 'Could not mail activation email', e);
			success = false;
		}
		//If fail to send activation email alert
		if (!success) {
			nlapiSendEmail(55011, 55011, 'Error on ACL Process Sales Order - Could not email Nexpose license purchaser his license key.', '\nLicenseId: ' + licRecordId + '\nContactId: ' + contactId);

		}
	}
}

function sendErrorEmail(fields, text){
	nlapiLogExecution("ERROR", 'Error on', text);
	var fieldListing = "";
	for (field in fields) {
		fieldListing += field + ": " + fields[field] + "<br>";
	}
	nlapiSendEmail(55011, 55011, 'Error on ACL Process Sales Order - FMR', text + "<br>" + fieldListing);
}

function timeLeft(timeLimitInMinutes){

	if (timeLimitInMinutes == null || timeLimitInMinutes == '') {
		timeLimitInMinutes = 11;
	}
	var timeLimitInMilliseconds = timeLimitInMinutes * 60 * 1000;
	
	var presentTime = new Date().getTime();
	if (presentTime - startingTime > timeLimitInMilliseconds) {
		nlapiLogExecution('DEBUG', 'Ran out of time', 'yup');
		rescheduleScript = true;
		return false;
	}
	return true;
}

function unitsLeft(number){
	var unitsLeft = context.getRemainingUsage();
	if (unitsLeft <= number) {
		nlapiLogExecution('DEBUG', 'Ran out of units', 'yup');
		rescheduleScript = true;
		return false;
	}
	return true;
}

