/*
 * @author efagone
 */

var objItemProps = new Object();

function grabLineItemACRIds(recOrder){

	var itemACRIds = new Array();
	var orderLineCount = recOrder.getLineItemCount('item');
	
	for (var i = 1; i <= orderLineCount; i++) {
		var itemId = recOrder.getLineItemValue('item', 'item', i);
		var lineId = recOrder.getLineItemValue('item', 'id', i);
		
		var acrId = getItemProperties(itemId, 'custitemr7itemacrproducttype');
		
		itemACRIds[lineId] = acrId;
	}
	
	return itemACRIds;
}

function convertEndDate(strStartDate, quantity, unitType, defaultTerm){
	// unit = 1
	// month = 2
	// year = 3
	// days = 5
	// 15-day = 6
	startDate = nlapiStringToDate(strStartDate);
	var dateEndDate = new Date();
	
	if (defaultTerm == null || defaultTerm == '') {
		defaultTerm = 365;
	}
	
	switch (unitType) {
		case '1':
			dateEndDate = nlapiAddDays(startDate, Math.ceil(parseInt(defaultTerm)) - 1);
			break;
		case '2':
			dateEndDate = nlapiAddDays(nlapiAddMonths(startDate, quantity), -1);
			break;
		case '3':
			dateEndDate = nlapiAddDays(startDate, Math.ceil(parseInt(defaultTerm) * quantity) - 1);
			break;
		case '5':
			dateEndDate = nlapiAddDays(startDate, Math.ceil(quantity) - 1);
			break;
		case '6':
			dateEndDate = nlapiAddDays(startDate, (quantity * 15) - 1);
			break;
		case '7':
			dateEndDate = nlapiAddDays(startDate, Math.ceil(parseInt(defaultTerm)) - 1); 
			break;
		default:
			dateEndDate = nlapiAddDays(startDate, Math.ceil(parseInt(defaultTerm) * quantity) - 1);
	}
	
	var strEndDate = nlapiDateToString(dateEndDate);
	return strEndDate;
}

function getItemsFromOrder(recOrder){

	var lineItems = new Array();
	var arrCurrentItemFamilyACLs = new Array();
	
	lineItemCount = recOrder.getLineItemCount('item');
	
	for (var i = 1; i <= lineItemCount; i++) {
		var lineItem = new Array();
		var itemId = recOrder.getLineItemValue('item', 'item', i);
		var itemType = recOrder.getLineItemValue('item', 'itemtype', i);
		//nlapiLogExecution('DEBUG', 'itemId', itemId);
		if (itemType != 'Subtotal' && itemType != 'Discount' && itemType != 'Description') {
		
			var itemProperties = getItemProperties(itemId);
			var ACL = itemProperties['custitemr7itemautocreatelicense'];
			// Get product type from item properties
			var acrId = itemProperties['custitemr7itemacrproducttype'];
			nlapiLogExecution('DEBUG', 'acrId', acrId);
			
			if (acrId != null && acrId != '') {
				var itemOptionId = arrProductTypes[acrId]['optionid'];
				var activationKey = recOrder.getLineItemValue('item', itemOptionId, i);
				
				var itemFamilies = itemProperties['custitemr7itemfamily'];
				if (itemFamilies != '') {
					itemFamilies = itemFamilies.split(",");
				}
				// nlapiSendEmail(55011, 55011, 'itemFamilies', itemFamilies);
				if (ACL == 'T' && itemFamilies != '' && itemFamilies != null) {
					//set suggestion
					if (activationKey == '' || activationKey.substr(0, 4) == 'PEND') {
						for (var j = 0; itemFamilies != null && j < itemFamilies.length; j++) {
							var itemFamily = itemFamilies[j];
							arrCurrentItemFamilyACLs[itemFamily] = recOrder.getLineItemValue('item', 'id', i);
						}
					}
					else {
						for (var j = 0; itemFamilies != null && j < itemFamilies.length; j++) {
							var itemFamily = itemFamilies[j];
							arrCurrentItemFamilyACLs[itemFamily] = 'PK:' + activationKey;
						}
					}
				}
				var suggestedACL = '';
				//calculating suggestions
				for (var j = 0; itemFamilies != null && j < itemFamilies.length; j++) {
					var itemFamily = itemFamilies[j];
					if (arrCurrentItemFamilyACLs[itemFamily] != null && arrCurrentItemFamilyACLs[itemFamily] != '' && arrCurrentItemFamilyACLs[itemFamily] != 'undefined') {
						suggestedACL = arrCurrentItemFamilyACLs[itemFamily];
						break;
					}
				}
				
				// nlapiSendEmail(55011, 55011, 'suggestedACL', suggestedACL);
				var currentACLId = activationKey;
				if (activationKey != null && activationKey != '' && activationKey.substr(0, 4) != 'PEND') { //PK should take precedence
					currentACLId = 'PK:' + activationKey;
				}
				else 
					if (activationKey != null && activationKey != '' && activationKey.substr(0, 4) == 'PEND') {
						currentACLId = activationKey.substr(5);
					}
				
				lineItem['itemProperties'] = itemProperties;
				lineItem['itemId'] = itemId;
				lineItem['isACL'] = ACL;
				lineItem['currentParentACL'] = currentACLId;
				lineItem['suggestedParentACL'] = suggestedACL;
				lineItem['lineId'] = recOrder.getLineItemValue('item', 'id', i);
				lineItem['quantity'] = recOrder.getLineItemValue('item', 'quantity', i);
				lineItem['unitType'] = recOrder.getLineItemValue('item', 'custcolr7itemqtyunit', i);
				lineItem['amount'] = recOrder.getLineItemValue('item', 'amount', i);
				lineItem['custcolr7translicenseid'] = recOrder.getLineItemValue('item', 'custcolr7translicenseid', i);
				lineItem['contact'] = recOrder.getLineItemValue('item', 'custcolr7translinecontact', i); //Line item contact
				lineItem['description'] = recOrder.getLineItemValue('item', 'description', i);
				lineItem['licenseId'] = recOrder.getLineItemValue('item', 'custcolr7translicenseid', i);
				lineItem['shipping'] = recOrder.getLineItemValue('item', 'custcolr7lineshipaddress', i);
				lineItem['isCoTermLine'] = recOrder.getLineItemValue('item', 'custcolr7iscotermline', i);
				lineItem['createdFromRA'] = recOrder.getLineItemValue('item', 'custcolr7createdfromra', i);
				lineItem['lineNum'] = i;
				lineItems[lineItems.length] = lineItem;
				/*
				 * Using dynamic product method, delete commented lines after debug
				 */
				lineItem['acrId'] = acrId; // product Type id
				lineItem['activationKey'] = activationKey;
				
				/*
				 * Get Fields for itemFulfillment check
				 */
				lineItem['isfulfillable'] = itemProperties['isfulfillable'];
				lineItem['vsoedelivered'] = itemProperties['vsoedelivered'];
				
				/*
				 * Get field for requires HBR
				 */
				lineItem['requireshbr'] = itemProperties['custitemr7requireshbr'];
								
			}
		}
	}
	return lineItems;
}

function getACRItems(arrItems, acrProductIds){

	var arrACRItems = new Array();
	var acrProductIdsArray = acrProductIds.split(',');
	if (arrItems != null) {
		for (var i = 0; i < arrItems.length; i++) {
			nlapiLogExecution('DEBUG','arritems',arrItems[i]);
			var lineItem = arrItems[i];
			var ACL = lineItem['isACL'];
			var acrId = lineItem['acrId'];
			if (ACL == 'T' && acrProductIdsArray.indexOf(acrId) != -1) {
				arrACRItems[arrACRItems.length] = lineItem;
			}
		}
	}
	return arrACRItems;
}	
/**
 * Loop through array of items on an order and return a subset of line items which require Hardware Build Request records
 * @method getHDWItems
 * @param {Array} arrItems
 * @return {Array} arrHDWItems
 */
function getHDWItems(arrItems){

	var arrHDWItems = new Array();
	
	for (var i = 0; arrItems != null && i < arrItems.length; i++) {
		var lineItem = arrItems[i];
		var requiresHBR = lineItem['itemProperties']['custitemr7requireshbr'];
		
		if (requiresHBR != null && requiresHBR != '' && (lineItem['licenseId'] == null || lineItem['licenseId'] == '')) {
			arrHDWItems[arrHDWItems.length] = lineItem;
		}
	}
	return arrHDWItems;
}

function getAddOnItems(arrItems){

	var arrAddOnItems = new Array();
	var arrMNGAddOnItems = new Array();
	
	for (var i = 0; arrItems != null && i < arrItems.length; i++) {
		var lineItem = arrItems[i];
		var lineItemPropertites = lineItem['itemProperties'];
		var strItemAddOns = lineItemPropertites['custitemr7acladdons'];
		var ACL = lineItem['isACL'];
		var acrId = lineItem['acrId'];
		
		if (strItemAddOns != null && strItemAddOns != '' && ACL != 'T') {
			lineItem['addOns'] = strItemAddOns;
			
			if (acrId == 3) { //man service
				arrMNGAddOnItems[arrMNGAddOnItems.length] = lineItem;
			}
			else {
				arrAddOnItems[arrAddOnItems.length] = lineItem;
			}
		}
	}
	var arrAllAddOns = new Array(arrAddOnItems, arrMNGAddOnItems);
	return arrAllAddOns;
}

/**
 * Loop through items on an order and return a subset of line items which require Event Attendee records
 * @method getEventItems
 * @param {Array} arrItems
 * @return {Array} arrEventItems
 */
function getEventItems(arrItems){

    var arrEventItems = new Array();
    
    for (var i = 0; arrItems != null && i < arrItems.length; i++) {
        var lineItem = arrItems[i];
        var lineItemPropertites = lineItem['itemProperties'];
        var requiresEventReg = lineItemPropertites['custitemr7itemrequireeventregistration'];
		
        if (requiresEventReg == 'T' && (lineItem['licenseId'] == null || lineItem['licenseId'] == '')) {
			lineItem['defaultEvent'] = lineItemPropertites['custitemr7itemdefaulteventmaster'];
            arrEventItems[arrEventItems.length] = lineItem;
        }
    }
    
    return arrEventItems;
}

function getItemProperties(itemId, specificFieldId){

	if (objItemProps.hasOwnProperty(itemId)) {
	
		if (objItemProps[itemId] == null) {
			return null;
		}
		if (specificFieldId != null && specificFieldId != '') {
			return objItemProps[itemId][specificFieldId];
		}
		return objItemProps[itemId];
	}
	
	var arrFieldIds = new Array();
	arrFieldIds[arrFieldIds.length] = 'custitemr7itemacrproducttype';
	arrFieldIds[arrFieldIds.length] = 'custitemr7itemautocreatelicense';
	arrFieldIds[arrFieldIds.length] = 'custitemr7itemdedicatedhosted';
	arrFieldIds[arrFieldIds.length] = 'custitemr7acladdons';
	arrFieldIds[arrFieldIds.length] = 'isinactive';
	arrFieldIds[arrFieldIds.length] = 'displayname';
	arrFieldIds[arrFieldIds.length] = 'custitemr7itemmslicensetype1';
	arrFieldIds[arrFieldIds.length] = 'custitemr7itemnxlicensetype';
	arrFieldIds[arrFieldIds.length] = 'issueproduct';
	arrFieldIds[arrFieldIds.length] = 'custitemr7itemactivationemailtemplate';
	arrFieldIds[arrFieldIds.length] = 'custitemr7itemfamily';
	arrFieldIds[arrFieldIds.length] = 'custitemr7itemdefaultterm';
	arrFieldIds[arrFieldIds.length] = 'custitemr7itemcategory';
	arrFieldIds[arrFieldIds.length] = 'custitemr7itemdefaulteventmaster';
	arrFieldIds[arrFieldIds.length] = 'custitemr7itemrequireeventregistration';
	arrFieldIds[arrFieldIds.length] = 'isfulfillable';
	arrFieldIds[arrFieldIds.length] = 'vsoedelivered';
	arrFieldIds[arrFieldIds.length] = 'custitemr7requireshbr';
	
	for (acrId in arrProductTypes) {
		var templateFieldId = arrProductTypes[acrId]['templateid'];
		
		if (templateFieldId != null && templateFieldId != '' && templateFieldId != 'undefined') {
			arrFieldIds[arrFieldIds.length] = templateFieldId;
		}
		
	}
	
	objItemProps[itemId] = nlapiLookupField('item', itemId, arrFieldIds);
	
	if (objItemProps[itemId] == null) {
		return null;
	}
	if (specificFieldId != null && specificFieldId != '') {
		return objItemProps[itemId][specificFieldId];
	}
	return objItemProps[itemId];
}

function getItemAddOns(itemId){

	var arrAddOns = new Array();
	
	var itemFields = getItemProperties(itemId);
	var strItemAddOns = itemFields['custitemr7acladdons'];
	
	if (strItemAddOns != null && strItemAddOns != '') {
		arrAddOns = strItemAddOns.split(",");
	}
	return arrAddOns;
}

function processLineItemDates(recOrder, lineItem){
	
	var setDateFields = true;
	if (lineItem['createdFromRA'] != null && lineItem['createdFromRA'] != ''){
		setDateFields = false;;
	}
	
	var lineNum = lineItem['lineNum'];
	var acrId = lineItem['acrId'];
	nlapiLogExecution('DEBUG', 'Line/acrId', 'LineNum: ' + lineNum + '\nacrId: ' + acrId);
	var optionId = arrProductTypes[acrId]['optionid'];
    var dateToday = new Date();
    var strToday = nlapiDateToString(dateToday);
    
    var delayedStart = recOrder.getFieldValue('custbodyr7delayedlicensestartdate');
    if (delayedStart != '' && delayedStart != null && nlapiStringToDate(delayedStart) > dateToday) {
        strToday = delayedStart;
    }
    
    var itemId = recOrder.getLineItemValue('item', 'item', lineNum);
	
	var itemFields = getItemProperties(itemId);

    var ACL = itemFields['custitemr7itemautocreatelicense'];
	var defaultTerm = itemFields['custitemr7itemdefaultterm'];
    var quantity = recOrder.getLineItemValue('item', 'quantity', lineNum);
    var unitType = recOrder.getLineItemValue('item', 'custcolr7itemqtyunit', lineNum);
    var activationKey = recOrder.getLineItemValue('item', optionId, lineNum);
    var licenseId = recOrder.getLineItemValue('item', 'custcolr7translicenseid', lineNum);
    
    if ((activationKey != '' && activationKey != null) && (licenseId == '' || licenseId == null || licenseId == 'XXX')) {
		var arrDates = getDatesByACL(recOrder, activationKey, optionId);
		var isACLOrder = true;
		if (arrDates['aclStartDate'] == null || arrDates['aclStartDate'] == '') {
			isACLOrder = false;
		}
		var addOns = getItemAddOns(itemId);
		
		var isDateAddOn = false;
		var isAdditionalYear = false;
		
		for (var i = 0; addOns != null && i < addOns.length; i++) { //parse add-ons
			var addOnId = addOns[i];
			var fields = ['custrecordr7acladdon_fieldid', 'custrecordr7acladdon_value', 'custrecordr7acladdon_fieldtype'];
			var addOnFields = nlapiLookupField('customrecordr7acladdoncomponents', addOnId, fields);
			var licFieldType = addOnFields.custrecordr7acladdon_fieldtype;
			var licValue = addOnFields.custrecordr7acladdon_value;
			
			if (licFieldType == 'date') {
				if (addOnId == 34 || addOnId == 11 || addOnId == 42 || addOnId == 56) { //these should be the id's of any product line add-ons that cause the expiration date to jump (with a single add-on)
					isAdditionalYear = true;
					isDateAddOn = true;
					break;
				}
				if (licValue == 4 || licValue == 9) {
					isDateAddOn = true;
					break;
				}
			}
		}
		
		var startDate, endDate;
				
		//finding end date to use
		if (activationKey.substr(0, 4) == 'PEND') { //unprocessed
			if (ACL == 'T') {// unprocessed ACL... determine dates and we good
				startDate = strToday;
				endDate = convertEndDate(strToday, quantity, unitType, defaultTerm);
			}
			else { //we an add-on
				startDate = arrDates['aclStartDate'];
				endDate = arrDates['aclEndDate'];
				
				if (!isACLOrder) {
					startDate = strToday;
					endDate = convertEndDate(strToday, quantity, unitType, defaultTerm);
				}
			}
		}
		else { //has real activationKey
			if (ACL == 'T') { //is acl
				var expDate = findLicenseExpirationFromFMR(activationKey, itemId);
				
				if (expDate == null) {
					var licenseInfo = findLicenseInfo(activationKey, null, itemId);
					if (licenseInfo != null) {
						expDate = nlapiStringToDate(licenseInfo[0]);
					}
				}
				if (expDate != null) {
					startDate = nlapiDateToString(nlapiAddDays(expDate, 1));
					endDate = convertEndDate(startDate, quantity, unitType, defaultTerm);
				}
				else {
					startDate = strToday;
					endDate = convertEndDate(strToday, quantity, unitType, defaultTerm);
				}
			}
			else {// is addon
				startDate = arrDates['aclStartDate'];
				endDate = arrDates['aclEndDate'];
				
				if (!isACLOrder) {
					startDate = strToday;
					endDate = convertEndDate(strToday, quantity, unitType, defaultTerm);
				}
			}
		}
		
		if (setDateFields) {
			recOrder.setLineItemValue('item', 'revrecstartdate', lineNum, startDate);
			recOrder.setLineItemValue('item', 'revrecenddate', lineNum, endDate);
			//EITF-08-01
			recOrder.setLineItemValue('item', 'custcolr7startdate', lineNum, startDate);
			recOrder.setLineItemValue('item', 'custcolr7enddate', lineNum, endDate);
		}
		
		var arrAddOnDates = getDatesByAddOn(recOrder, activationKey, optionId);
		
		if (isDateAddOn && ACL == 'F') {
		
			if (arrParentEndDates[activationKey] == null || arrParentEndDates[activationKey] == '') {
				arrParentStartDates[activationKey] = arrDates['aclStartDate'];
				arrParentEndDates[activationKey] = arrDates['aclEndDate'];
			}
			
			if (!isACLOrder && (arrParentEndDates[activationKey] == null || arrParentEndDates[activationKey] == '')) {
				var expDate = findLicenseExpirationFromFMR(activationKey, itemId);
				
				if (expDate == null) {
					var licenseInfo = findLicenseInfo(activationKey, null, itemId);
					if (licenseInfo != null) {
						expDate = licenseInfo[0];
					}
				}
				else {
					expDate = nlapiDateToString(expDate);
				}
				
				if (expDate != null) {
					arrParentEndDates[activationKey] = expDate;
				}
			}
			
			if (arrParentEndDates[activationKey] == null || arrParentEndDates[activationKey] == '') {
				arrParentStartDates[activationKey] = strToday;
				arrParentEndDates[activationKey] = arrAddOnDates['addOnMaxEndDate'];
			}
			
			var newStartDate = arrParentStartDates[activationKey];
			var newTrackerEndDate = arrParentEndDates[activationKey];
			
			if (currentFollowerCount < 2 || isAdditionalYear) { //if haven't processed 2nd rentech/sub yet, then add the dates
				if (!isAdditionalYear) {
					currentFollowerCount++;
				}
				var dtTrackerEndDate = nlapiStringToDate(arrParentEndDates[activationKey]);
				newStartDate = nlapiDateToString(nlapiAddDays(dtTrackerEndDate, 1));
				newTrackerEndDate = convertEndDate(newStartDate, quantity, unitType, defaultTerm);
				
				arrParentStartDates[activationKey] = newStartDate;
				arrParentEndDates[activationKey] = newTrackerEndDate;
			}
			else {
				currentFollowerCount = 1;
			}
			
			if (setDateFields) {
				recOrder.setLineItemValue('item', 'revrecstartdate', lineNum, newStartDate);
				recOrder.setLineItemValue('item', 'revrecenddate', lineNum, newTrackerEndDate);
				//EITF-08-01
				recOrder.setLineItemValue('item', 'custcolr7startdate', lineNum, newStartDate);
				recOrder.setLineItemValue('item', 'custcolr7enddate', lineNum, newTrackerEndDate);
			}
		}
		
		arrParentStartDates[activationKey] = recOrder.getLineItemValue('item', 'revrecstartdate', lineNum);
		arrParentEndDates[activationKey] = recOrder.getLineItemValue('item', 'revrecenddate', lineNum);
		
		//EITF-08-01   this can be removed after historic recs are updated
		recOrder.setLineItemValue('item', 'custcolr7startdate', lineNum, recOrder.getLineItemValue('item', 'revrecstartdate', lineNum));
		recOrder.setLineItemValue('item', 'custcolr7enddate', lineNum, recOrder.getLineItemValue('item', 'revrecenddate', lineNum));
	}
    return recOrder;
}

function findLicenseInfo(activationKey, acrId, itemId){

	if (itemId != null && itemId != '') {
	
		var itemFields = getItemProperties(itemId);
		acrId = itemFields['custitemr7itemacrproducttype'];
	}

	var acrProductTypeFields = arrProductTypes[acrId];
	
	if (acrProductTypeFields != null && acrProductTypeFields != '' && acrProductTypeFields != 'undefined') {
		var activationKeyField = acrProductTypeFields['activationid'];
		var recordId = acrProductTypeFields['recordid'];
		var expirationField = acrProductTypeFields['expiration'];
		var licenseIdField = acrProductTypeFields['licenseid'];
		
		var arrSearchFilters = new Array();
		arrSearchFilters[arrSearchFilters.length] = new nlobjSearchFilter(activationKeyField, null, 'is', activationKey);
		
		var arrSearchColumns = new Array();
		arrSearchColumns[0] = new nlobjSearchColumn(expirationField);
		arrSearchColumns[1] = new nlobjSearchColumn('internalid');
		arrSearchColumns[2] = new nlobjSearchColumn(licenseIdField);
		
		// remove after debug
		nlapiLogExecution('DEBUG','activationKeyField',activationKeyField);
		nlapiLogExecution('DEBUG','activationKey',activationKey);
		var arrSearchResults = nlapiSearchRecord(recordId, null, arrSearchFilters, arrSearchColumns);
		
		if (arrSearchResults != null && arrSearchResults.length >= 1) {
			var expDate = arrSearchResults[0].getValue(arrSearchColumns[0]);
			var licenseId = arrSearchResults[0].getValue(arrSearchColumns[1]);
			var name = arrSearchResults[0].getValue(arrSearchColumns[2]);
			
			return new Array(expDate, licenseId, name);
		}
		
	}
	return null;
}


function findLicenseExpirationFromFMR(activationKey, itemId){

	var itemFields = getItemProperties(itemId);
	var acrId = itemFields['custitemr7itemacrproducttype'];

	var activationKeyField = arrProductTypes[acrId]['activationid'];
	var recordId = arrProductTypes[acrId]['recordid'];
	var expirationField = arrProductTypes[acrId]['expiration'];
	var licenseIdField = arrProductTypes[acrId]['licenseid'];
	
	var arrSearchFilters = new Array();
	arrSearchFilters[arrSearchFilters.length] = new nlobjSearchFilter('custrecordr7licfmproductkey', null, 'is', activationKey);
	arrSearchFilters[arrSearchFilters.length] = new nlobjSearchFilter('custrecordr7licfmgrace', null, 'is', 'F');
	arrSearchFilters[arrSearchFilters.length] = new nlobjSearchFilter('custrecordr7licfmfeaturefieldtype', null, 'is', 'date');
	arrSearchFilters[arrSearchFilters.length] = new nlobjSearchFilter('custrecordr7licfmrecordtypeid', null, 'is', recordId);
	arrSearchFilters[arrSearchFilters.length] = new nlobjSearchFilter('custrecordr7licfmfeildid', null, 'is', expirationField);

	var arrSearchColumns = new Array();
	arrSearchColumns[0] = new nlobjSearchColumn('custrecordr7licfmenddate', null, 'max');
	arrSearchColumns[1] = new nlobjSearchColumn('custrecordr7licfmproductkey', null, 'group');
	
	var arrSearchResults = nlapiSearchRecord('customrecordr7licensefeaturemanagement', null, arrSearchFilters, arrSearchColumns);
	
	if (arrSearchResults != null && arrSearchResults.length >= 1) {
		var expDate = arrSearchResults[0].getValue(arrSearchColumns[0]);
		
		if (expDate != null && expDate != '') {
			var gracePeriodAllowed = nlapiGetContext().getSetting('SCRIPT','custscriptr7graceperiodallowed');
			if (gracePeriodAllowed == null || gracePeriodAllowed == ''){
				gracePeriodAllowed = 63;
			}
			
			var dtMinDateToCareAbout = nlapiAddDays(new Date(), gracePeriodAllowed * -1);
			
			var arrSearchFilters = new Array();
			arrSearchFilters[arrSearchFilters.length] = new nlobjSearchFilter('custrecordr7licfmproductkey', null, 'is', activationKey);
			arrSearchFilters[arrSearchFilters.length] = new nlobjSearchFilter('custrecordr7licfmgrace', null, 'is', 'T');
			arrSearchFilters[arrSearchFilters.length] = new nlobjSearchFilter('custrecordr7licfmfeaturefieldtype', null, 'is', 'date');
			arrSearchFilters[arrSearchFilters.length] = new nlobjSearchFilter('custrecordr7licfmstartdate', null, 'before', 'today');
			arrSearchFilters[arrSearchFilters.length] = new nlobjSearchFilter('custrecordr7licfmenddate', null, 'after', expDate);
			arrSearchFilters[arrSearchFilters.length] = new nlobjSearchFilter('custrecordr7licfmrecordtypeid', null, 'is', recordId);
			arrSearchFilters[arrSearchFilters.length] = new nlobjSearchFilter('custrecordr7licfmfeildid', null, 'is', expirationField);
			
			var arrSearchColumns = new Array();
			arrSearchColumns[0] = new nlobjSearchColumn('internalid');
			arrSearchColumns[1] = new nlobjSearchColumn('custrecordr7licfmstartdate').setSort(false);
			arrSearchColumns[2] = new nlobjSearchColumn('custrecordr7licfmenddate');
			
			var arrSearchResults = nlapiSearchRecord('customrecordr7licensefeaturemanagement', null, arrSearchFilters, arrSearchColumns);
			
			var totalGraceDays = 0;
			var prevMaxGraceEnd = null;
			for (var k = 0; arrSearchResults != null && k < arrSearchResults.length; k++) {
			
				var searchResult = arrSearchResults[k];
				var graceStart = searchResult.getValue(arrSearchColumns[1]);
				var graceEnd = searchResult.getValue(arrSearchColumns[2]);
				
				if (graceStart != null && graceStart != '' && graceEnd != null && graceEnd != '') {
				
					var dtMaxExp = nlapiStringToDate(expDate);
					var dtgraceStart = nlapiStringToDate(graceStart);
					var dtgraceEnd = nlapiStringToDate(graceEnd);
					
					if (dtgraceStart < dtMinDateToCareAbout){
						dtgraceStart = dtMinDateToCareAbout;
					}
					
					if (dtgraceStart < dtMaxExp) {
						dtgraceStart = dtMaxExp;
					}
										
					if (dtgraceEnd > new Date()) {
						dtgraceEnd = new Date();
					}
					
					if (prevMaxGraceEnd != null && dtgraceStart < prevMaxGraceEnd) {
						dtgraceStart = prevMaxGraceEnd;
					}

					if (dtgraceStart < dtgraceEnd) {
						var numGraceDays = days_between(dtgraceStart, dtgraceEnd);
						totalGraceDays = totalGraceDays + numGraceDays;
						
						if (prevMaxGraceEnd == null || dtgraceEnd > prevMaxGraceEnd) {
							prevMaxGraceEnd = dtgraceEnd;
						}
					}
				}
				
			}
			
			var dtMaxEndDate = nlapiStringToDate(expDate);
			var dtNewExp = nlapiAddDays(new Date(), (totalGraceDays * -1) - 1);
			
			if (dtMaxEndDate > new Date()) {
				return dtMaxEndDate;
			}
			else {
				return dtNewExp;
			}
		}

	}
	
	return null;
}

function days_between(date1, date2){

	// The number of milliseconds in one day
	var ONE_DAY = 1000 * 60 * 60 * 24;
	
	// Convert both dates to milliseconds
	var date1_ms = date1.getTime();
	var date2_ms = date2.getTime();
	
	// Calculate the difference in milliseconds
	var difference_ms = Math.abs(date1_ms - date2_ms);
	
	// Convert back to days and return
	return Math.round(difference_ms / ONE_DAY);
	
}

function findParentLineNumber(recParentOrder, parentLineId){

    lineItemCount = recParentOrder.getLineItemCount('item');
    
    for (var i = 1; i <= lineItemCount; i++) {
        var lineId = recParentOrder.getLineItemValue('item', 'id', i);
        
        if (lineId == parentLineId) {
            return i;
        }
    }
}

function getDatesByACL(recOrder, activationKey){

    var dates = new Array();
    dates['aclStartDate'] = '';
    dates['aclEndDate'] = '';
    
    var lineItemCount = recOrder.getLineItemCount('item');
    
    for (var i = 1; i <= lineItemCount; i++) {
		
		var lineId = recOrder.getLineItemValue('item', 'id', i);
		var acrId = arrItemACRIds[lineId];

		if (acrId == null || acrId == '' || acrId == 'undefined') {
			// do nothing
			continue;
		}
		else{
			var optionId = arrProductTypes[acrId]['optionid'];
			
			var currentActivationKey = recOrder.getLineItemValue('item', optionId, i);
			var currentLineId = recOrder.getLineItemValue('item', 'id', i);
			
			if (currentActivationKey == activationKey || (activationKey.substr(0, 4) == 'PEND' && activationKey.substr(5) == currentLineId)) {
				var ACL = recOrder.getLineItemValue('item', 'custcolr7transautocreatelicense', i);
				var strRevRecStartDate = recOrder.getLineItemValue('item', 'revrecstartdate', i);
				var strRevRecEndDate = recOrder.getLineItemValue('item', 'revrecenddate', i);
				
				if (ACL == 'T') {
					dates['aclStartDate'] = strRevRecStartDate;
					dates['aclEndDate'] = strRevRecEndDate;
				}
			}
		}
    }  
    return dates;
}


function getDatesByAddOn(recOrder, activationKey){

    var dates = new Array();
    dates['addOnMinStartDate'] = '';
    dates['addOnMaxEndDate'] = '';

	var lineCount = recOrder.getLineItemCount('item');
		
    for (var i = 1; i < lineCount; i++) {
		
		var lineId = recOrder.getLineItemValue('item', 'id', i);
		var acrId = arrItemACRIds[lineId];
		if (acrId == null || acrId == '' || acrId == 'undefined') {
			// do nothing
			continue;
		}
		else {
			var optionId = arrProductTypes[acrId]['optionid'];
			
			var currentActivationKey = recOrder.getLineItemValue('item', optionId, i);
			var currentLineId = recOrder.getLineItemValue('item', 'id', i);
			
			if (currentActivationKey == activationKey || (activationKey.substr(0, 4) == 'PEND' && activationKey.substr(5) == currentLineId)) {
				var ACL = recOrder.getLineItemValue('item', 'custcolr7transautocreatelicense', i);
				var strRevRecStartDate = recOrder.getLineItemValue('item', 'revrecstartdate', i);
				var strRevRecEndDate = recOrder.getLineItemValue('item', 'revrecenddate', i);
				
				if (ACL == 'F') {
					if (dates['addOnMinStartDate'] == '' || dates['addOnMinStartDate'] == null || (strRevRecStartDate != null && strRevRecStartDate != '' && nlapiStringToDate(strRevRecStartDate) < nlapiStringToDate(dates['addOnMinStartDate']))) {
						dates['addOnMinStartDate'] = strRevRecStartDate;
					}
					if (dates['addOnMaxEndDate'] == '' || dates['addOnMaxEndDate'] == null || (strRevRecEndDate != null && strRevRecEndDate != '' && nlapiStringToDate(strRevRecEndDate) > nlapiStringToDate(dates['addOnMaxEndDate']))) {
						dates['addOnMaxEndDate'] = strRevRecEndDate;
					}
				}
			}
		}
	}
    return dates;
}


function reAssociateItems(recOrder, oldAK, newAK){

    var lineItemCount = recOrder.getLineItemCount('item');
	for (var k = 1; k <= lineItemCount; k++) {
		// Use ACR in conjunction with arrProductTypes to get activationKey using dynamic Item Option Id
		var lineId = recOrder.getLineItemValue('item', 'id', k);
		var acrId = arrItemACRIds[lineId];
		if (acrId != null && acrId != '') {
		
		
			var optionId = arrProductTypes[acrId]['optionid'];
			var activationKey = recOrder.getLineItemValue('item', optionId, k);
			// If current activation key is same as old key, set activation key to new key
			if (oldAK != null && newAK != null) {
				if (activationKey == oldAK) {
					recOrder.setLineItemValue('item', optionId, k, newAK);
				}
			}
			else {
				// Set PEND on ACLs
				var ACL = recOrder.getLineItemValue('item', 'custcolr7transautocreatelicense', k);
				var lineID = recOrder.getLineItemValue('item', 'id', k);
				var newActivationKey = 'PEND:' + lineID;
				
				if (ACL == 'T' && activationKey != null && activationKey.substr(0, 4) == 'PEND' && activationKey != newActivationKey) {
				
					for (var j = 1; j <= lineItemCount; j++) {
						var compareActivationKey = recOrder.getLineItemValue('item', optionId, j);
						if (compareActivationKey == activationKey) {
						
							recOrder.setLineItemValue('item', optionId, j, newActivationKey);
						}
					}
				}
			}
		}
	}  
    return recOrder;
}

function determineOrderStartEndDates(recOrder){

	var dateToday = new Date();
	var strToday = nlapiDateToString(dateToday);
	recOrder.setFieldValue('startdate', '');
	recOrder.setFieldValue('enddate', '');
	
	lineItemCount = recOrder.getLineItemCount('item');
	
	for (var i = 1; i <= lineItemCount; i++) {
		var itemId = recOrder.getLineItemValue('item', 'item', i);
		var itemType = recOrder.getLineItemValue('item', 'itemtype', i);
		
		if (itemType != 'Subtotal' && itemType != 'Discount' && itemType != 'Description') {
		
			var itemStart = recOrder.getLineItemValue('item', 'revrecstartdate', i);
			var itemEnd = recOrder.getLineItemValue('item', 'revrecenddate', i);
			
			if ((itemStart != null && itemStart != '') && (recOrder.getFieldValue('startdate') == '' || nlapiStringToDate(itemStart) < nlapiStringToDate(recOrder.getFieldValue('startdate')))) {
				recOrder.setFieldValue('startdate', itemStart);
			}
			if ((itemEnd != null && itemEnd != '') && (recOrder.getFieldValue('enddate') == '' || nlapiStringToDate(itemEnd) > nlapiStringToDate(recOrder.getFieldValue('enddate')))) {
				recOrder.setFieldValue('enddate', itemEnd);
			}
		}
	}
	
	if (recOrder.getFieldValue('startdate') == '' || recOrder.getFieldValue('startdate') == null) {
		recOrder.setFieldValue('startdate', strToday);
	}
	if (recOrder.getFieldValue('enddate') == '' || recOrder.getFieldValue('enddate') == null) {
		recOrder.setFieldValue('enddate', strToday);
	}	
}

function processACRAddOns(recOrder, arrAddOnItems){


	for (var i = 0; arrAddOnItems != null && i < arrAddOnItems.length && unitsLeft(1000) && timeLeft() && !exitScript; i++) {
		try {
			var lineItem = arrAddOnItems[i];
			var itemProperties = lineItem['itemProperties'];
			var itemId = lineItem['itemId'];
			var lineId = lineItem['lineId'];
			var acrId = arrItemACRIds[lineId];
			var lineNum = lineItem['lineNum'];
			var licenseId = lineItem['licenseId'];
			var skusHOSD = itemProperties['custitemr7itemdedicatedhosted'];
			var hbrType = lineItem['requireshbr'];
			var activationKey = recOrder.getLineItemValue('item', arrProductTypes[acrId]['optionid'], lineNum);
			nlapiLogExecution('DEBUG', 'lineItem[activationKey]', lineItem['activationKey']);
			
			var fields = new Array();
			if ((activationKey != '' && activationKey != null) && (licenseId == '' || licenseId == null)) {
				
				// If the Item is a new Dedicated hosted Engine send build requests and create Dedicated Hosted Records
				if (skusHOSD == 'T') {
					// Create Dedicated Hosted Record
					try{
						var dedicatedId = createDedicatedHostedRecord(recOrder);
					}
					catch(e){
						nlapiSendEmail(340932, 340932, 'Could Not create Dedicated Hosted Record', e.name + ' : ' + e.message);
					}
					// Send Help Desk Ticket
					sendDedicatedBuildRequestEmail(recOrder,dedicatedId);
				}
			
				nlapiLogExecution('DEBUG', 'Processing addOn dates', lineId);
				recOrder = processLineItemDates(recOrder, lineItem);
				nlapiLogExecution('DEBUG', 'Finished processing addOn dates', lineId);
				
				if (activationKey.substr(0, 4) == 'PEND') {
					var parentACLLineId = activationKey.substr(5);
					var parentOrderId = parentACLLineId.substr(0, parentACLLineId.indexOf('_'));
					nlapiLogExecution('DEBUG', 'parentOrderId', parentOrderId);
					
					if (parentOrderId == recOrder.getId()) {
						var recParentOrder = recOrder;
						var parentLineNum = itemLineNums[parentACLLineId];
						nlapiLogExecution('DEBUG', 'parentLineNum', parentLineNum);
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
						nlapiLogExecution('DEBUG', 'parentLineNum - ESLEEE', parentLineNum);
					}
					nlapiLogExecution('DEBUG', 'arrProductTypes[acrId][optionid]', arrProductTypes[acrId]['optionid']);
					fields['activationKey'] = recParentOrder.getLineItemValue('item', arrProductTypes[acrId]['optionid'], parentLineNum);
					fields['parentLicId'] = recParentOrder.getLineItemValue('item', 'custcolr7translicenseid', parentLineNum);
					nlapiLogExecution('DEBUG', 'fields[activationKey] - FO REAL', fields['activationKey']);
				}
				else {
					nlapiLogExecution('DEBUG', 'fields[activationKey] - activationKey  ELSE', activationKey);
					fields['activationKey'] = activationKey;
				}
				
				fields['itemId'] = itemId;
				fields['lineNum'] = lineNum;
				fields['lineId'] = recOrder.getLineItemValue('item', 'id', lineNum);
				fields['custitemr7itemactivationemailtemplate'] = itemProperties['custitemr7itemactivationemailtemplate'];
				
				if (fields['parentLicId'] != 'XXX' && fields['activationKey'] != null && fields['activationKey'].substr(0, 4) != 'PEND') {
				
					nlapiLogExecution('DEBUG', 'fields[activationKey]', fields['activationKey']);
					var returnedFields = createAddOnFMR(recOrder, fields);
					nlapiLogExecution('DEBUG', 'created FMR', itemId);
										
					var licenseName = returnedFields[0];
					var success = returnedFields[1];
					var newProductKey = returnedFields[2];
					var licenseId = returnedFields[3];
					
					if (success) {
						if (fields['custitemr7itemactivationemailtemplate'] != null && fields['custitemr7itemactivationemailtemplate'] != '') {
							licenseEmailsToSend[licenseEmailsToSend.length] = [arrProductTypes[acrId]['recordid'], licenseId, fields['custitemr7itemactivationemailtemplate'], acrId];
						}
						
						recOrder.setLineItemValue('item', 'custcolr7translicenseid', lineNum, licenseName);
						recOrder.setLineItemValue('item', arrProductTypes[acrId]['optionid'], lineNum, newProductKey);
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
			nlapiSendEmail(55011, 55011, 'ERROR PROCESSING AN ADDON', 'OrderID: ' + recOrder.getId() + '\nlineNum: ' + lineNum + '\n' + e.name + ' : ' + e.message, 'michael_burstein@rapid7.com');
			nlapiLogExecution('ERROR', 'ERROR PROCESSING AN ADDON', 'OrderID: ' + recOrder.getId() + '\n' + e.name + ' : ' + e.message);
			recOrder.setLineItemValue('item', 'custcolr7translicenseid', lineNum, 'XXX');
			exitScript = true;
			break;
		}
	}
}

function processACR(recOrder, acrItem){

	var strToday = nlapiDateToString(new Date());
	var lineId = acrItem['lineId'];
	var lineNum = acrItem['lineNum'];
	var licenseId = acrItem['licenseId'];
	var acrId = acrItem['acrId'];
	var itemOptionId = arrProductTypes[acrId]['optionid'];
	var activationKey = recOrder.getLineItemValue('item', itemOptionId, lineNum);	
	var templateFieldId = arrProductTypes[acrId]['templateid'];
	
	//If the line-item is an MNG Order && and the license hasn't already been created
	if ((activationKey != '' && activationKey != null) && (licenseId == '' || licenseId == null)) {
		nlapiLogExecution('DEBUG', 'Needs processing', 'Yup');
				
		var itemProperties = acrItem['itemProperties'];
		var templateId = itemProperties[templateFieldId];
		var salesRep = recOrder.getFieldValue('salesrep');
		var activationNeeded = recOrder.getLineItemValue('item', 'custcolr7transautocreatelicense', lineNum);
		var licenseId = recOrder.getLineItemValue('item', 'custcolr7translicenseid', lineNum);
		
		//The fields array contains all the parameters for creating/renewing a license
		var fields = new Array();
		
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

		//ProductLine should be set to Managed Service
		fields['custitemr7itemactivationemailtemplate'] = itemProperties['custitemr7itemactivationemailtemplate'];
		fields['startDate'] = recOrder.getLineItemValue('item', 'revrecstartdate', lineNum);
		fields['expirationDate'] = recOrder.getLineItemValue('item', 'revrecenddate', lineNum);
		fields['activationKey'] = activationKey;
		fields['licenseId'] = recOrder.getLineItemValue('item', 'custcolr7translicenseid', lineNum);
		fields['customer'] = recOrder.getFieldValue('entity');
		fields['salesorder'] = recOrder.getId();
		fields['salesrep'] = recOrder.getFieldValue('salesrep');
		fields['contact'] = recOrder.getLineItemValue('item', 'custcolr7translinecontact', lineNum);
		fields['lineId'] = recOrder.getLineItemValue('item', 'id', lineNum);
		fields['licenseTemplate'] = templateId;
		fields['acrId'] = acrId;
		fields['lineNum'] = lineNum;
		fields['itemId'] = recOrder.getLineItemValue('item', 'item', lineNum);;
				
		// Create New licenses
		nlapiLogExecution('DEBUG', 'Time to process', 'yup');
		var returnedFields = new Array();
		if (activationKey.substr(0,4) == 'PEND') {
			returnedFields = createNewACRLicense(fields, recOrder);
		}
		else {
			returnedFields = createRenewalFMR(fields);
		}
		
		var licenseName = returnedFields[0];
		var success = returnedFields[1];
		var newActivationKey = returnedFields[2];
		
		nlapiLogExecution('DEBUG', 'success', success);
		
		if (success) {
			recOrder.setLineItemValue('item', 'custcolr7translicenseid', lineNum, licenseName);
			recOrder.setLineItemValue('item', itemOptionId, lineNum, newActivationKey);
			nlapiLogExecution('DEBUG', 'itemOptionId', itemOptionId);
			nlapiLogExecution('DEBUG', 'lineNum', lineNum);
			nlapiLogExecution('DEBUG', 'newActivationKey', newActivationKey);
			//recOrder.setLineItemValue('item', 'vsoedelivered', lineNum, 'T');
			
			if (activationKey != newActivationKey) {
				reAssociateItems(recOrder, activationKey, newActivationKey);
			}
		}
		else {
			recOrder.setLineItemValue('item', 'custcolr7translicenseid', lineNum, 'XXX');
			//recOrder.setLineItemValue('item', 'custcolr7itemmsproductkey', lineNum, '');
		}
		
		nlapiLogExecution('DEBUG', 'Processed ACR', lineId);
		
	}//If the line-item is an ACR Order && and the license hasn't already been created
	var revRecStartDate = recOrder.getLineItemValue('item', 'revrecstartdate', lineNum);
	var revRecEndDate = recOrder.getLineItemValue('item', 'revrecenddate', lineNum);
	arrParentStartDates[activationKey] = revRecStartDate;
	arrParentEndDates[activationKey] = revRecEndDate;
	
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

function createNewACRLicense(fields, recOrder){
	var acrId = fields['acrId'];
	var acrProductTypeFields = arrProductTypes[acrId];
	var licRecord = acrProductTypeFields['recordid'];
	var activationId = acrProductTypeFields['activationid'];
	var expirationFieldId = acrProductTypeFields['expiration'];
	// Creating new MNG License record from fields
	/*nlapiLogExecution('DEBUG', 'acrID', acrId);
	 nlapiLogExecution('DEBUG', 'licRecord', licRecord);
	 nlapiLogExecution('DEBUG', 'fields[licenseTemplate]', fields['licenseTemplate']);*/
	var newRecord = nlapiCopyRecord(licRecord, fields['licenseTemplate']);
	
	// Null out any necessary fields
	var fieldsToEmpty = acrProductTypeFields['emptyfields'];
	
	if (fieldsToEmpty != null && fieldsToEmpty != '' && fieldsToEmpty != 'undefined') {
		var arrFieldsToEmpty = fieldsToEmpty.split(',');
		for (var i = 0; i < arrFieldsToEmpty.length; i++) {
			newRecord.setFieldValue(arrFieldsToEmpty[i], '');
		}
	}
	
	//Setting other fields
	newRecord.setFieldValue(acrProductTypeFields['expiration'], fields['expirationDate']);
	//newRecord.setFieldValue(acrProductTypeFields['salesrep'], fields['salesrep']);
	newRecord.setFieldValue(acrProductTypeFields['customer'], fields['customer']);
	newRecord.setFieldValue(acrProductTypeFields['salesorder'], fields['salesorder']);
	newRecord.setFieldValue(acrProductTypeFields['contact'], fields['contact']);
	newRecord.setFieldValue(acrProductTypeFields['fmrcreatedid'], 'T');
	
	try {
		var id = nlapiSubmitRecord(newRecord);
		nlapiLogExecution('DEBUG', 'licRecord', licRecord);
		nlapiLogExecution('DEBUG', 'id', id);
		nlapiLogExecution('DEBUG', 'fields[custitemr7itemactivationemailtemplate]', fields['custitemr7itemactivationemailtemplate']);
		
		licenseEmailsToSend[licenseEmailsToSend.length] = [licRecord, id, fields['custitemr7itemactivationemailtemplate'], fields['acrId']];
		
		nlapiLogExecution('DEBUG', 'activationId', activationId);
		nlapiLogExecution('DEBUG', 'expirationFieldId', expirationFieldId);
		var fieldsToLookup = ['name', activationId, expirationFieldId];
		var newLicenseFields = nlapiLookupField(licRecord, id, fieldsToLookup);
		
		var licName = newLicenseFields['name'];
		var activationKey = newLicenseFields[activationId];
		var expirationDate = newLicenseFields[expirationFieldId];
		nlapiLogExecution('DEBUG', 'licName', licName);
		nlapiLogExecution('DEBUG', 'activationKey', activationKey);
		nlapiLogExecution('DEBUG', 'expirationDate', expirationDate);
		
		//creating built-in FMRs
		fields['activationKey'] = activationKey;
		compareToAvailableAddOns(newRecord, fields, false);
		createAddOnFMR(recOrder, fields);
		
		return new Array(licName, true, activationKey, nlapiDateToString(new Date()), expirationDate);
		
	} 
	catch (e) {
		sendErrorEmail(fields, "Could not submit new " + licRecord + " license record " + e);
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
					
					if ((fieldId == 'custrecordr7nxlicensenumberips' || fieldId == 'custrecordr7managedservicesips') && (fieldValue == '1' || fieldValue == '0')) {
						createAddOn = false;
					}
					
					if (isRenewal && arrProductTypesByRecId[newRecord.getRecordType()]['expiration'] == fieldId) {
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
 				if (arrParentEndDates[fields['activationKey']] != '' && arrParentEndDates[fields['activationKey']] != null && arrParentEndDates[fields['activationKey']] != 'undefined') {
					endDate = arrParentEndDates[fields['activationKey']];
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
			newFMRRecord.setFieldValue('custrecordr7licfmproductkey', fields['activationKey']);
			newFMRRecord.setFieldValue('custrecordr7licfmstatus', status);
			newFMRRecord.setFieldValue('custrecordr7licfmaclcreated', 'T');
			newFMRRecord.setFieldValue('custrecordr7licfmitemlineid', fields['lineId']);
			
			try {
				var id = nlapiSubmitRecord(newFMRRecord);
			}
			catch (e) {
				nlapiSendEmail(55011, 55011, 'Could not create built-in FMR - ACR', 'AddOnId: ' + addOnId + '\nSalesOrder: ' + fields['salesorder'] + '\n\nError: ' + e);
			}
		}	
	}	
}

function createRenewalFMR(fields){
	var acrId = fields['acrId'];
	var licRecord = arrProductTypes[acrId]['recordid'];
	var component = arrProductTypes[acrId]['componentid'];
	
	nlapiLogExecution('DEBUG', 'Using this licTemplate', fields['licenseTemplate']);
	var recLicTemplate = nlapiCopyRecord(licRecord, fields['licenseTemplate']);
	compareToAvailableAddOns(recLicTemplate, fields, true);
	
	var arrLicenseInfo = findLicenseInfo(fields['activationKey'], acrId);
	var licenseId = arrLicenseInfo[1];
	var licenseName = arrLicenseInfo[2];
		
	var newFMRRecord = nlapiCreateRecord('customrecordr7licensefeaturemanagement');
	newFMRRecord.setFieldValue('custrecordr7licfmfeature', component);
	newFMRRecord.setFieldValue('custrecordr7licfmstartdate', nlapiDateToString(new Date()));
	newFMRRecord.setFieldValue('custrecordr7licfmenddate', fields['expirationDate']);
	newFMRRecord.setFieldValue('custrecordr7licfmsalesorder', fields['salesorder']);
	newFMRRecord.setFieldValue('custrecordr7licfmvalue', fields['expirationDate']);
	newFMRRecord.setFieldValue('custrecordr7licfmproductkey', fields['activationKey']);
	newFMRRecord.setFieldValue('custrecordr7licfmstatus', 1);
	newFMRRecord.setFieldValue('custrecordr7licfmaclcreated', 'T');
	newFMRRecord.setFieldValue('custrecordr7licfmitemlineid', fields['lineId']);
	var id = nlapiSubmitRecord(newFMRRecord);
	
	nlapiLogExecution('DEBUG', 'FMR ID', id);
	if (id != null && id != '') {
		return new Array(licenseName, true, fields['activationKey']);
	}
	else {
		return new Array('XXX', false);
	}
}


function createAddOnFMR(recOrder, fields){
	nlapiLogExecution('DEBUG', 'lineNum', fields['lineNum']);
	
	var orderId = recOrder.getId();
	var lineId = recOrder.getLineItemValue('item', 'id', fields['lineNum']);
	var acrId = arrItemACRIds[lineId];
	var activationKey = recOrder.getLineItemValue('item', arrProductTypes[acrId]['optionid'], fields['lineNum']);
	var startDate = recOrder.getLineItemValue('item', 'revrecstartdate', fields['lineNum']);
	var endDate = recOrder.getLineItemValue('item', 'revrecenddate', fields['lineNum']);
	
	var addOns = getItemAddOns(fields['itemId']);
	
	var failed = false;
	
	var arrDates = getDatesByACL(recOrder, activationKey);
	var arrAddOnDates = getDatesByAddOn(recOrder, activationKey, null);
	
	var isACLOrder = true;
	nlapiLogExecution('DEBUG', 'arrDates[\'aclStartDate\']', arrDates['aclStartDate']);
	if (arrDates['aclStartDate'] == null || arrDates['aclStartDate'] == ''){
			isACLOrder = false;
	}
	nlapiLogExecution('DEBUG', 'isACLOrder', isACLOrder);
	for (var i = 0; addOns != null && i < addOns.length && unitsLeft(200) && timeLeft(); i++) {
	
		var addOnId = addOns[i];
		var fieldsToLookup = ['custrecordr7acladdon_fieldid', 'custrecordr7acladdon_value', 'custrecordr7acladdon_specificvalue', 'custrecordr7acladdon_fieldtype'];
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
 			if (arrParentEndDates[activationKey] != '' && arrParentEndDates[activationKey] != null && arrParentEndDates[activationKey] != 'undefined') {
				endDate = arrParentEndDates[activationKey];
			}
			else 
				if (!isACLOrder) {
					endDate = arrAddOnDates['addOnMaxEndDate'];
				}
		
		var licenseInfo = findLicenseInfo(fields['activationKey'], null, fields['itemId']);     //fields['licRecordId']);
		
		fields['licenseId'] = licenseInfo[1];
		fields['licenseName'] = licenseInfo[2];
		
		
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
				newFMRRecord.setFieldValue('custrecordr7licfmproductkey', fields['activationKey']);
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
		return new Array(fields['licenseName'], true, fields['activationKey'], fields['licenseId']);
	}
	else {
		return new Array('XXX', false);
	}
	
}

function calculateAddOnValue(recOrder, fields){
		
	var result;
	
	switch (fields['licValueId']) {
		case '1':
			result = 'T';
			break;
		case '2':
			result = 'F';
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

//TODO how to handle renewals, HOSD is not true on these
function createDedicatedHostedRecord(recOrder){
	var orderId = recOrder.getId();
	var customerId = recOrder.getFieldValue('entity');
	/*Create New Dedicated Record
	 * 
	 * Set Customer and Sales Order
	 * Comment - timestamp and tranId
	 */
	var recDedicated = nlapiCreateRecord('customrecordr7dedicatedhe');
	recDedicated.setFieldValue('custrecordr7dedicatedhecustomer',customerId);
	recDedicated.setFieldValue('custrecordr7dedicatedhesalesorder',orderId);
	var orderName = nlapiLookupField('salesorder',orderId,'tranid');
	var today = new Date();
	var comments = nlapiDateToString(today) + ': Dedicate Hosted Created per ' + orderName + '.';
	recDedicated.setFieldValue('custrecordr7dedicatedhecomments',comments);
	var id = nlapiSubmitRecord(recDedicated,true,true);
	return id;
}



