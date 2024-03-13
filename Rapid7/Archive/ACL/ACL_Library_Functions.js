/*
 * @author efagone
 */

function convertEndDate(strStartDate, quantity, unitType, defaultTerm){
	// unit = 1
	// month = 2
	// year = 3
	// days = 5
	// 15-day = 6
	// Per Term = 6
	startDate = nlapiStringToDate(strStartDate);
	var dateEndDate = new Date();
	
	if (defaultTerm != null && defaultTerm != '') {
	
		if (unitType == 7) {
			dateEndDate = nlapiAddDays(startDate, defaultTerm - 1);
		}
		else {
			dateEndDate = nlapiAddDays(startDate, (parseInt(defaultTerm) * quantity) - 1);
		}
	}
	else {
		switch (unitType) {
			case '1':
				dateEndDate = nlapiAddDays(nlapiAddMonths(startDate, 12), -1); //defaulting to 1 year
				break;
			case '2':
				dateEndDate = nlapiAddDays(nlapiAddMonths(startDate, quantity), -1);
				break;
			case '3':
				dateEndDate = nlapiAddDays(nlapiAddDays(startDate, quantity * 365), -1);
				break;
			case '5':
				dateEndDate = nlapiAddDays(startDate, quantity - 1);
				break;
			case '6':
				dateEndDate = nlapiAddDays(startDate, (quantity * 15) - 1);
				break;
			case '7':
				dateEndDate = nlapiAddDays(startDate, defaultTerm - 1);
				break;
			default:
				dateEndDate = nlapiAddDays(nlapiAddMonths(startDate, 12), -1); //defaulting to 1 year
		}
	}
	var strEndDate = nlapiDateToString(dateEndDate);
	return strEndDate;
}

function getItemsFromOrder(recOrder){

    var lineItems = new Array();
    var arrCurrentItemFamilyACLs = new Array();
    var suggestedACL = '';
    
    lineItemCount = recOrder.getLineItemCount('item');
       
    for (var i = 1; i <= lineItemCount; i++) {
        var lineItem = new Array();
        var itemId = recOrder.getLineItemValue('item', 'item', i);
        var itemType = recOrder.getLineItemValue('item', 'itemtype', i);
        nlapiLogExecution('DEBUG', 'itemId', itemId);
		nlapiLogExecution('DEBUG', 'itemType', itemType);
        if (itemType != 'Subtotal' && itemType != 'Discount' && itemType != 'Description') {
        
            var itemProperties = getItemProperties(itemId);
            var ACL = itemProperties['custitemr7itemautocreatelicense'];
			nlapiLogExecution('DEBUG', 'ACL', ACL);
			var acrId = itemProperties['custitemr7itemacrproducttype'];
            var productKey = recOrder.getLineItemValue('item', 'custcolr7itemmsproductkey', i);
            var itemFamilies = itemProperties['custitemr7itemfamily'];
			if (itemFamilies != '') {
				itemFamilies = itemFamilies.split(",");
			}
           // nlapiSendEmail(55011, 55011, 'itemFamilies', itemFamilies);
            if (ACL == 'T' && itemFamilies != '' && itemFamilies != null) {
				//set suggestion
				
				if (productKey == null || productKey == '' || productKey.substr(0, 4) == 'PEND') {
					for (var j = 0; itemFamilies != null && j < itemFamilies.length; j++) {
						var itemFamily = itemFamilies[j];
						arrCurrentItemFamilyACLs[itemFamily] = recOrder.getLineItemValue('item', 'id', i);
					}
				}
				else {
					for (var j = 0; itemFamilies != null && j < itemFamilies.length; j++) {
						var itemFamily = itemFamilies[j];
						arrCurrentItemFamilyACLs[itemFamily] = 'PK:' + productKey;
					}
				}
			}
            
            //calculating suggestions
			for (var j = 0; itemFamilies != null && j < itemFamilies.length; j++) {
				var itemFamily = itemFamilies[j];
				if (arrCurrentItemFamilyACLs[itemFamily] != null && arrCurrentItemFamilyACLs[itemFamily] != '' && arrCurrentItemFamilyACLs[itemFamily] != 'undefined') {
					suggestedACL = arrCurrentItemFamilyACLs[itemFamily];
					break;
				}
			}

           // nlapiSendEmail(55011, 55011, 'suggestedACL', suggestedACL);
            var currentACLId = productKey;
            if (productKey != null && productKey != '' && productKey.substr(0, 4) != 'PEND') { //PK should take precedence
                currentACLId = 'PK:' + productKey;
            }
            else 
                if (productKey != null && productKey != '' && productKey.substr(0, 4) == 'PEND') {
                    currentACLId = productKey.substr(5);
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
            lineItem['productKey'] = productKey;
			lineItem['eventMaster'] = recOrder.getLineItemValue('item', 'custcolr7eventmaster', i);
			lineItem['mngId'] = recOrder.getLineItemValue('item', 'custcolr7managedserviceid', i);
            lineItem['lineNum'] = i;
			lineItem['acrId'] = acrId; // product Type id
            lineItems[lineItems.length] = lineItem;
        }
    }
    
    return lineItems;
}

function getACRItems(arrItems, acrProductIds){

	var arrACRItems = new Array();
	var acrProductIdsArray = acrProductIds.split(',');
	if (arrItems != null) {
		for (var i = 0; i < arrItems.length; i++) {
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

function getACLItems(arrItems){

    var arrACLItems = new Array();
    if (arrItems != null) {
		nlapiLogExecution('DEBUG', 'arrItems', arrItems.length);
        for (var i = 0; i < arrItems.length; i++) {
            var lineItem = arrItems[i];
            var ACL = lineItem['isACL'];
            nlapiLogExecution('DEBUG', 'ACL - get acl', ACL);
            if (ACL == 'T') {
                arrACLItems[arrACLItems.length] = lineItem;
            }
        }
    }
    return arrACLItems;
}

function getAddOnItems(arrItems){

	var arrAddOnItems = new Array();
	var arrMNGAddOnItems = new Array();
	
	for (var i = 0; arrItems != null && i < arrItems.length; i++) {
		var lineItem = arrItems[i];
		var lineItemPropertites = lineItem['itemProperties'];
		var strItemAddOns = lineItemPropertites['custitemr7acladdons'];
		
		var arrAddOns = new Array();
		
		if (strItemAddOns != null && strItemAddOns != '') {
			lineItem['addOns'] = strItemAddOns;
			
			arrAddOns = strItemAddOns.split(",");
			var addOnRecType = nlapiLookupField('customrecordr7acladdoncomponents', arrAddOns[0], 'custrecordr7aclrecord_internalid', 'text');

			if (addOnRecType == 'customrecordr7managedservices') {
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

function getEventItems(arrItems){

    var arrEventItems = new Array();
    
    for (var i = 0; arrItems != null && i < arrItems.length; i++) {
        var lineItem = arrItems[i];
        var lineItemPropertites = lineItem['itemProperties'];
        var requiresEventReg = lineItemPropertites['custitemr7itemrequireeventregistration'];
		
        if (requiresEventReg == 'T') {
			lineItem['defaultEvent'] = lineItemPropertites['custitemr7itemdefaulteventmaster'];
            arrEventItems[arrEventItems.length] = lineItem;
        }
    }
    
    return arrEventItems;
}

function getItemProperties(itemId){

    var properties = new Array('custitemr7itemautocreatelicense', 'custitemr7itemdedicatedhosted', 'custitemr7acladdons', 'isinactive', 'displayname', 'custitemr7itemmslicensetype1', 'custitemr7itemnxlicensetype', 'issueproduct', 'custitemr7itemactivationemailtemplate', 'custitemr7itemfamily', 'custitemr7itemdefaultterm', 'custitemr7itemrequireeventregistration', 'custitemr7itemcategory', 'custitemr7itemdefaulteventmaster', 'custitemr7itemacrproducttype');
    var lookedUpProperties = nlapiLookupField('item', itemId, properties);
    return lookedUpProperties;
}

function getItemAddOns(itemId){
    var arrAddOns = new Array();
    var strItemAddOns = nlapiLookupField('item', itemId, 'custitemr7acladdons');
    
    if (strItemAddOns != null && strItemAddOns != '') {
        arrAddOns = strItemAddOns.split(",");
    }
    return arrAddOns;
}

function processLineItemDates(recOrder, lineItem){

	var lineNum = lineItem['lineNum'];
    var dateToday = new Date();
    var strToday = nlapiDateToString(dateToday);
    
    var delayedStart = recOrder.getFieldValue('custbodyr7delayedlicensestartdate');
    if (delayedStart != '' && delayedStart != null) {
        strToday = delayedStart;
    }
    
    var orderId = recOrder.getId();
    var orderType = recOrder.getRecordType();
    var itemId = recOrder.getLineItemValue('item', 'item', lineNum);
	var itemFields = nlapiLookupField('item', itemId, new Array('custitemr7itemautocreatelicense', 'custitemr7itemdefaultterm'));
    var ACL = itemFields['custitemr7itemautocreatelicense'];
	var defaultTerm = itemFields['custitemr7itemdefaultterm'];
    var lineId = recOrder.getLineItemValue('item', 'id', lineNum);
    var quantity = recOrder.getLineItemValue('item', 'quantity', lineNum);
    var unitType = recOrder.getLineItemValue('item', 'custcolr7itemqtyunit', lineNum);
    var productKey = recOrder.getLineItemValue('item', 'custcolr7itemmsproductkey', lineNum);
    var licenseId = recOrder.getLineItemValue('item', 'custcolr7translicenseid', lineNum);
    
    if ((productKey != '' && productKey != null) && (licenseId == '' || licenseId == null || licenseId == 'XXX')) {
		var arrDates = getDatesByACL(recOrder, productKey);
		var isACLOrder = true;
		if (arrDates['aclStartDate'] == null || arrDates['aclStartDate'] == '') {
			isACLOrder = false;
		}
		var addOns = getItemAddOns(itemId);
		
		var isDateAddOn = false;
		var isAdditionalYear = false;
		
		for (var i = 0; addOns != null && i < addOns.length; i++) { //parse add-ons
			var addOnId = addOns[i];
			var fields = ['custrecordr7acladdon_fieldid', 'custrecordr7acladdon_value', 'custrecordr7acladdon_fieldtype']
			var addOnFields = nlapiLookupField('customrecordr7acladdoncomponents', addOnId, fields);
			var licField = addOnFields.custrecordr7acladdon_fieldid;
			var licFieldType = addOnFields.custrecordr7acladdon_fieldtype;
			var licValue = addOnFields.custrecordr7acladdon_value;
			var licRecord = nlapiLookupField('customrecordr7acladdoncomponents', addOnId, 'custrecordr7aclrecord_internalid', 'text');
			
			if (licFieldType == 'date') {
				if (addOnId == 34 || addOnId == 11 || addOnId == 42) { //these should be the id's of any product line add-ons that cause the expiration date to jump (with a single add-on)
					isAdditionalYear = true;
					isDateAddOn = true;
					break;
				}
				if (licValue == 4) {
					isDateAddOn = true;
					break;
				}
			}
		}
		
		//finding end date to use
		if (productKey.substr(0, 4) == 'PEND') { //unprocessed
			if (ACL == 'T') {// unprocessed ACL... determine dates and we good
				recOrder.setLineItemValue('item', 'revrecstartdate', lineNum, strToday);
				recOrder.setLineItemValue('item', 'revrecenddate', lineNum, convertEndDate(strToday, quantity, unitType, defaultTerm));
			}
			else { //we an add-on
				if (!isACLOrder) {
					var startDate = strToday;
					var endDate = convertEndDate(strToday, quantity, unitType, defaultTerm);
				}
				else {
					var startDate = arrDates['aclStartDate'];
					var endDate = arrDates['aclEndDate'];
				}
				recOrder.setLineItemValue('item', 'revrecstartdate', lineNum, startDate);
				recOrder.setLineItemValue('item', 'revrecenddate', lineNum, endDate);
			}
		}
		else { //has real productkey
			if (ACL == 'T') { //is acl
				var expDate = findLicenseExpirationFromFMR(productKey, itemId);
				
				if (expDate == null) {
					var licenseInfo = findLicenceInfo(productKey, null, itemId);
					if (licenseInfo != null) {
						expDate = nlapiStringToDate(licenseInfo[0]);
					}
				}
				if (expDate != null) {
					if (expDate < new Date()) {
						var aclStart = strToday;
						var aclEnd = convertEndDate(strToday, quantity, unitType, defaultTerm);
					}
					else {
						var aclStart = nlapiDateToString(nlapiAddDays(expDate, 1));
						var aclEnd = convertEndDate(aclStart, quantity, unitType, defaultTerm);
					}
				}
				else {
					var aclStart = strToday;
					var aclEnd = convertEndDate(strToday, quantity, unitType, defaultTerm);
				}
				recOrder.setLineItemValue('item', 'revrecstartdate', lineNum, aclStart);
				recOrder.setLineItemValue('item', 'revrecenddate', lineNum, aclEnd);
			}
			else {// is addon
				if (!isACLOrder) {
					var startDate = strToday;
					var endDate = convertEndDate(strToday, quantity, unitType, defaultTerm);
				}
				else {
					var startDate = arrDates['aclStartDate'];
					var endDate = arrDates['aclEndDate'];
				}
				recOrder.setLineItemValue('item', 'revrecstartdate', lineNum, startDate);
				recOrder.setLineItemValue('item', 'revrecenddate', lineNum, endDate);
			}
		}
		
		var arrAddOnDates = getDatesByAddOn(recOrder, productKey);
		
		if (isDateAddOn && ACL == 'F') {
		
			if (arrParentEndDates[productKey] == null || arrParentEndDates[productKey] == '') {
				arrParentStartDates[productKey] = arrDates['aclStartDate'];
				arrParentEndDates[productKey] = arrDates['aclEndDate'];
			}
			
			if (arrParentEndDates[productKey] == null || arrParentEndDates[productKey] == '') {
				arrParentStartDates[productKey] = strToday;
				arrParentEndDates[productKey] = arrAddOnDates['addOnMaxEndDate'];
			}

			if (currentFollowerCount < 2 || isAdditionalYear) { //if haven't processed 2nd rentech/sub yet, then add the dates
				if (!isAdditionalYear) {
					currentFollowerCount++
				}
				nlapiLogExecution('DEBUG', 'arrParentEndDates[' + productKey + ']', arrParentEndDates[productKey]);
				var dtTrackerEndDate = nlapiStringToDate(arrParentEndDates[productKey]);
				var newStartDate = nlapiDateToString(nlapiAddDays(dtTrackerEndDate, 1));
				var newTrackerEndDate = convertEndDate(newStartDate, quantity, unitType, defaultTerm);
				
				arrParentStartDates[productKey] = newStartDate;
				arrParentEndDates[productKey] = newTrackerEndDate;
			}
			else {
				var newStartDate = arrParentStartDates[productKey];
				var newTrackerEndDate = arrParentEndDates[productKey];
				currentFollowerCount = 1;
			}
			
			recOrder.setLineItemValue('item', 'revrecstartdate', lineNum, newStartDate);
			recOrder.setLineItemValue('item', 'revrecenddate', lineNum, newTrackerEndDate);
		}
		
		nlapiLogExecution('DEBUG', 'SETTING arrParentEndDates[' + productKey + ']', arrParentEndDates[productKey]);
		arrParentStartDates[productKey] = recOrder.getLineItemValue('item', 'revrecstartdate', lineNum);
		arrParentEndDates[productKey] = recOrder.getLineItemValue('item', 'revrecenddate', lineNum);
		
		recOrder.setLineItemValue('item', 'startdate', lineNum, recOrder.getLineItemValue('item', 'revrecstartdate', lineNum));
		recOrder.setLineItemValue('item', 'enddate', lineNum, recOrder.getLineItemValue('item', 'revrecenddate', lineNum));
		nlapiLogExecution('DEBUG', 'result', recOrder.getLineItemValue('item', 'revrecstartdate', lineNum));
	}
    
    return recOrder;
}

function findLicenceInfo(productKey, licRecord, itemId){

    var product = '';
    
    nlapiLogExecution('DEBUG', 'findLicenceInfo - productKey', productKey);
    nlapiLogExecution('DEBUG', 'findLicenceInfo - licRecord', licRecord);
    
    if (licRecord == 'customrecordr7metasploitlicensing') {
        product = 'metasploit';
    }
    if (licRecord == 'customrecordr7nexposelicensing') {
        product = 'nexpose';
    }
    if (itemId != null && itemId != '') {
	
		var productText = nlapiLookupField('item', itemId, 'issueproduct', 'text');
		productText = productText.toLowerCase();
		
		//Determining the orderType and productLine
		if (productText.indexOf('nexpose') != -1) {
			product = 'nexpose';
			licRecord = 'customrecordr7nexposelicensing';
		}
		else 
			if (productText.indexOf('metasploit') != -1) {
				product = 'metasploit';
				licRecord = 'customrecordr7metasploitlicensing';
			}
		
	}

    if (product == 'metasploit') {
        var searchFilters = new Array(new nlobjSearchFilter('custrecordr7msproductkey', null, 'is', productKey));
        var searchColumns = new Array(new nlobjSearchColumn('custrecordr7mslicenseexpirationdate'), new nlobjSearchColumn('internalid'), new nlobjSearchColumn('name'));
    }
    if (product == 'nexpose') {
        var searchFilters = new Array(new nlobjSearchFilter('custrecordr7nxproductkey', null, 'is', productKey));
        var searchColumns = new Array(new nlobjSearchColumn('custrecordr7nxlicenseexpirationdate'), new nlobjSearchColumn('internalid'), new nlobjSearchColumn('name'));
    }
    
    if (licRecord != null && licRecord != '') {
        var searchResults = nlapiSearchRecord(licRecord, null, searchFilters, searchColumns);

        if (searchResults != null && searchResults.length >= 1) {
            var expDate = searchResults[0].getValue(searchColumns[0]);
            var licenseId = searchResults[0].getValue(searchColumns[1]);
            var name = searchResults[0].getValue(searchColumns[2]);

            return new Array(expDate, licenseId, name);
        }
        else {
            return null;
        }
    }
    else {
        return null;
    }
}

function findLicenseExpirationFromFMR(productKey, itemId){

	var arrSearchFilters = new Array();
	arrSearchFilters[0] = new nlobjSearchFilter('custrecordr7licfmproductkey', null, 'is', productKey);
	arrSearchFilters[1] = new nlobjSearchFilter('custrecordr7licfmgrace', null, 'is', 'F');
	arrSearchFilters[2] = new nlobjSearchFilter('custrecordr7licfmfeaturefieldtype', null, 'is', 'date');
	
	if (itemId != null && itemId != '') {
		var productText = nlapiLookupField('item', itemId, 'issueproduct', 'text');
		productText = productText.toLowerCase();
		
		//Determining the orderType and productLine	
		if (productText.indexOf('nexpose') != -1) {
			arrSearchFilters[arrSearchFilters.length] = new nlobjSearchFilter('custrecordr7licfmrecordtypeid', null, 'is', 'customrecordr7nexposelicensing');
			arrSearchFilters[arrSearchFilters.length] = new nlobjSearchFilter('custrecordr7licfmfeildid', null, 'is', 'custrecordr7nxlicenseexpirationdate');
		}
		else 
			if (productText.indexOf('metasploit') != -1) {
				arrSearchFilters[arrSearchFilters.length] = new nlobjSearchFilter('custrecordr7licfmrecordtypeid', null, 'is', 'customrecordr7metasploitlicensing');
				arrSearchFilters[arrSearchFilters.length] = new nlobjSearchFilter('custrecordr7licfmfeildid', null, 'is', 'custrecordr7mslicenseexpirationdate');
			}
		
	}
	
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
			arrSearchFilters[arrSearchFilters.length] = new nlobjSearchFilter('custrecordr7licfmproductkey', null, 'is', productKey);
			arrSearchFilters[arrSearchFilters.length] = new nlobjSearchFilter('custrecordr7licfmgrace', null, 'is', 'T');
			arrSearchFilters[arrSearchFilters.length] = new nlobjSearchFilter('custrecordr7licfmfeaturefieldtype', null, 'is', 'date');
			arrSearchFilters[arrSearchFilters.length] = new nlobjSearchFilter('custrecordr7licfmstartdate', null, 'before', 'today');
			arrSearchFilters[arrSearchFilters.length] = new nlobjSearchFilter('custrecordr7licfmenddate', null, 'after', expDate);
			
			if (itemId != null && itemId != '') {
				var productText = nlapiLookupField('item', itemId, 'issueproduct', 'text');
				productText = productText.toLowerCase();
				
				//Determining the orderType and productLine	
				if (productText.indexOf('nexpose') != -1) {
					arrSearchFilters[arrSearchFilters.length] = new nlobjSearchFilter('custrecordr7licfmrecordtypeid', null, 'is', 'customrecordr7nexposelicensing');
					arrSearchFilters[arrSearchFilters.length] = new nlobjSearchFilter('custrecordr7licfmfeildid', null, 'is', 'custrecordr7nxlicenseexpirationdate');
				}
				else 
					if (productText.indexOf('metasploit') != -1) {
						arrSearchFilters[arrSearchFilters.length] = new nlobjSearchFilter('custrecordr7licfmrecordtypeid', null, 'is', 'customrecordr7metasploitlicensing');
						arrSearchFilters[arrSearchFilters.length] = new nlobjSearchFilter('custrecordr7licfmfeildid', null, 'is', 'custrecordr7mslicenseexpirationdate');
					}
				
			}
			
			var arrSearchColumns = new Array();
			arrSearchColumns[0] = new nlobjSearchColumn('internalid');
			arrSearchColumns[1] = new nlobjSearchColumn('custrecordr7licfmstartdate').setSort(true);
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
			
			if (dtNewExp < dtMaxEndDate) {
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
	var ONE_DAY = 1000 * 60 * 60 * 24
	
	// Convert both dates to milliseconds
	var date1_ms = date1.getTime()
	var date2_ms = date2.getTime()
	
	// Calculate the difference in milliseconds
	var difference_ms = Math.abs(date1_ms - date2_ms)
	
	// Convert back to days and return
	return Math.round(difference_ms / ONE_DAY)
	
}

function findParentLineNumber(recParentOrder, parentLineId){

    lineItemCount = recOrder.getLineItemCount('item');
    
    for (var i = 1; i <= lineItemCount; i++) {
        var lineId = recParentOrder.getLineItemValue('item', 'id', i);
        
        if (lineId == parentLineId) {
            return i;
        }
    }
}

function getDatesByACL(recOrder, productKey){

    var dates = new Array();
    dates['aclStartDate'] = ''
    dates['aclEndDate'] = ''
    
    var lineItemCount = recOrder.getLineItemCount('item');
    
    for (var i = 1; i <= lineItemCount; i++) {
        var currentProductKey = recOrder.getLineItemValue('item', 'custcolr7itemmsproductkey', i);
        var currentLineId = recOrder.getLineItemValue('item', 'id', i);
        
        if (currentProductKey == productKey || (productKey.substr(0, 4) == 'PEND' && productKey.substr(5) == currentLineId)) {
            var ACL = recOrder.getLineItemValue('item', 'custcolr7transautocreatelicense', i);
            var strRevRecStartDate = recOrder.getLineItemValue('item', 'revrecstartdate', i);
            var strRevRecEndDate = recOrder.getLineItemValue('item', 'revrecenddate', i);
            
            if (ACL == 'T') {
                dates['aclStartDate'] = strRevRecStartDate;
                dates['aclEndDate'] = strRevRecEndDate;
            }
        }
    }
    
    return dates;
}

function getDatesByAddOn(recOrder, productKey){

    var dates = new Array();
    dates['addOnMinStartDate'] = ''
    dates['addOnMaxEndDate'] = ''

	var lineCount = recOrder.getLineItemCount('item');
		
    for (var i = 1; i < lineCount; i++) {
		var currentProductKey = recOrder.getLineItemValue('item', 'custcolr7itemmsproductkey', i);
		var currentLineId = recOrder.getLineItemValue('item', 'id', i);
		
		if (currentProductKey == productKey || (productKey.substr(0, 4) == 'PEND' && productKey.substr(5) == currentLineId)) {
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

    return dates;
}

function reAssociateItems(record, oldPK, newPK){

    var lineItemCount = record.getLineItemCount('item');
    
    if (oldPK != null && newPK != null) {
        for (var k = 1; k <= lineItemCount; k++) {
            var productKey = record.getLineItemValue('item', 'custcolr7itemmsproductkey', k);
            
            if (productKey == oldPK) {
                record.setLineItemValue('item', 'custcolr7itemmsproductkey', k, newPK);
            }
        }
    }
    else {
    
        for (var i = 1; i <= lineItemCount; i++) {
            var ACL = record.getLineItemValue('item', 'custcolr7transautocreatelicense', i);
            var productKey = record.getLineItemValue('item', 'custcolr7itemmsproductkey', i);
            var lineID = record.getLineItemValue('item', 'id', i);
            var newProductKey = 'PEND:' + lineID;
            
            if (ACL == 'T' && productKey != null && productKey.substr(0, 4) == 'PEND' && productKey != newProductKey) {
            
                for (var j = 1; j <= lineItemCount; j++) {
                    var compareProductKey = record.getLineItemValue('item', 'custcolr7itemmsproductkey', j);
                    if (compareProductKey == productKey) {
                    
                        record.setLineItemValue('item', 'custcolr7itemmsproductkey', j, newProductKey);
                    }
                }
            }
        }
    }
    
    return record;
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
