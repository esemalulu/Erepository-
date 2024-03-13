/*
 * @author efagone
 */
function pageInit(){
	
	window.onbeforeunload = function() {};
	/*
		var count = nlapiGetLineItemCount('custpage_addonitems');
		if (count == 0) {
			alert('There are no unprocessed add-ons awaiting association for this order');
			window.opener = top;
			window.close();
		}
	*/
}

function saveRecord() {

	var addOnItemAssociations = getItemAssociations('custpage_addonitems', 'custpage_itemtext', 'custpage_license_acl', 'custpage_parent_sku_line', 'Add-On Item');
	var aclItemAssociations = getItemAssociations('custpage_aclitems', 'custpage_itemtext_acl', 'custpage_license_aclexisting', 'custpage_parent_sku_line_acl', 'ACL Item');
	var eventItemAssociations = getItemAssociations('custpage_eventlist', 'custpage_itemtext_event', 'custpage_thissucks', 'custpage_parent_sku_line_event', 'Event Item');
	var mngItemAssociations = getItemAssociations('custpage_mnglist', 'custpage_itemtext_mng', 'custpage_license_mngexisting', 'custpage_parent_sku_line_mng', 'Managed Service Item');
	var mngAddOnItemAssociations = getItemAssociations('custpage_mngaddonlist', 'custpage_itemtext_mng_addon', 'custpage_license_select_mng_addon', 'custpage_parent_sku_line_mng_addon', 'Managed Service Add-On Item');
	//var hdwOnItemAssociations = getItemAssociations('custpage_hdwlist', 'custpage_itemtext_hdw', 'custpage_license_acl', 'custpage_parent_sku_line_hdw', 'Hardware Item');

    var allAssociations = addOnItemAssociations.concat(aclItemAssociations).concat(eventItemAssociations).concat(mngItemAssociations).concat(mngAddOnItemAssociations);

    console.log('allAssociations: ' + JSON.stringify(allAssociations));

    var conflicts = findConflicts(allAssociations);

    var generateConflicts = generateConflictsString(conflicts);

    if (!generateConflicts.success) {
        alert(generateConflicts.message);
    }

    return generateConflicts.success;
}


/**
 * Get's Values of Item Associations in Suitelet
 * @param sublistId
 * @param itemTextFieldId
 * @param aclSelectFieldId
 * @param parentLineFieldId
 * @param associationType
 * @returns {ItemAssociation[]}
 */
function getItemAssociations(sublistId, itemTextFieldId, aclSelectFieldId, parentLineFieldId, associationType) {
    var lineCount = nlapiGetLineItemCount(sublistId);
    console.log('lineCount: ' + lineCount);

    var results = new Array();
    for (var j = 1; j <= lineCount; j++) {

        /**
         * @typedef {Object} ItemAssociation
         * @property {string} parentLine
         * @property {string} itemText
         * @property {string} aclSelect
         * @property {string} associationType
         */
        results.push({
            parentLine : nlapiGetLineItemValue(sublistId, parentLineFieldId, j),
            itemText : nlapiGetLineItemValue(sublistId, itemTextFieldId, j),
            aclSelect : nlapiGetLineItemValue(sublistId, aclSelectFieldId, j).replace('PK:','').replace('PEND:',''),
            associationType: associationType
        });
    }

    console.log(sublistId + ' results: ' + JSON.stringify(results));

    return results;
}

/**
 * Combine and compare Item Associations
 *
 * @param {ItemAssociation[]} itemAssociations
 *
 */
function findConflicts(itemAssociations) {

    var conflicts = {};
    for (var i = 0; i < itemAssociations.length; i++) {
        var compareFrom = itemAssociations[i];

        console.log('Find Conflict: compareFrom: ' + JSON.stringify(compareFrom));

        var matchedConflicts = new Array();

        for (var j = (i + 1); j < itemAssociations.length; j++) {
            var compareTo = itemAssociations[j];

            console.log('Find Conflict: compareTo: ' + JSON.stringify(compareTo));

            if ((compareFrom.parentLine === compareTo.parentLine) && (compareFrom.aclSelect !== compareTo.aclSelect)) {
                console.log('ACL Select Mismatch: ' + JSON.stringify(compareFrom) + ' and ' + JSON.stringify(compareTo));

                matchedConflicts.push([compareFrom, compareTo]);
            }
        }

        if (matchedConflicts.length) {
            conflicts[i] = matchedConflicts;
        }
    }
    console.log('conflicts Object: ' + JSON.stringify(conflicts));

    return conflicts;
}

/**
 *
 * @param objConflicts
 * @returns {{success: boolean, message: string}}
 */
function generateConflictsString(objConflicts) {

    console.log('generateConflictsString: ' + JSON.stringify(objConflicts));

    var keys = Object.keys(objConflicts);
    var arrConflicts = new Array();

    // For Each line
    for (var i = 0; i < keys.length; i++) {
        var key = keys[i];

        // For Each Conflict Pairing
        for (var j = 0; j < objConflicts[key].length; j++) {
            var comparisons = objConflicts[key][j];
            /** @type {ItemAssociation} */
            var compareFrom = comparisons[0];

            console.log('compareFrom: ' + JSON.stringify(compareFrom));

            /** @type {ItemAssociation} */
            var compareTo = comparisons[1];

            console.log('compareTo: ' + JSON.stringify(compareTo));

            arrConflicts.push(conflictString(compareFrom) + " is different than " + conflictString(compareTo));
        }
    }

    if (arrConflicts.length) {
        var message = "You have incorrectly associated component SKUs to different ACLs/Licenses. Please adjust the following Associations: \n \n";
        for (var t = 0; t < arrConflicts.length; t++) {
            message += t+1 + ": " + arrConflicts[t] + "\n";
        }

        return {
            message: message,
            success: false
        }
    }
    else {
        return {
            message: '',
            success: true
        }
    }
}

/**
 * Generates a repeatable string
 * @param {ItemAssociation} itemAssociation
 * @returns {string}
 */
function conflictString(itemAssociation) {
    return itemAssociation.itemText + " ("+ itemAssociation.associationType + ") [" + itemAssociation.aclSelect + "]"
}




function fieldChanged(type, name, linenum){
	var userId = nlapiGetUser();
	
	if (type == 'custpage_addonitems' && name == 'custpage_license_acl') {
		var aclValue = nlapiGetLineItemValue(type, name, linenum);
		var aclText = nlapiGetLineItemText(type, name, linenum);
		var aclType = aclText.substr(0, 3);
		var recordType = '';
		var recordField = '';
					
		if (aclType == 'NXL') {
			recordType = 'customrecordr7nexposelicensing';
		}
		if (aclType == 'MSL') {
			recordType = 'customrecordr7metasploitlicensing';
		}
		if (aclType == 'MBL') {
			recordType = 'customrecordr7mobilisafelicense';
		}
		if (aclType == 'UIL') {
			recordType = 'customrecordr7userinsightlicense';
		}
		if (aclType == 'INP') {
			recordType = 'customrecordr7insightplatform';
		}
		var itemFamily = nlapiGetLineItemValue(type, 'custpage_itemfamily', linenum);
		var licenseFamily = null;
		if (itemFamily != null && itemFamily != '') {

			if (aclValue.substr(0, 2) != 'PK') {
				licenseFamily = findParentItemFamily(aclValue);
			}
			else {
				var productKey = aclValue.substr(3);
				licenseFamily = findLicenceItemFamily(productKey, recordType);
				
			}
			if (licenseFamily != null && itemFamily.indexOf(licenseFamily) == -1) {
				alert('That ACL/Product Key is not compatible with this add-on feature');
				nlapiSetLineItemValue(type, name, linenum, nlapiGetLineItemValue(type, 'custpage_license_acl_orig', linenum));
			}
			else {
				nlapiSetLineItemValue(type, 'custpage_license_acl_orig', linenum, nlapiGetLineItemValue(type, name, linenum));
			}
		}
		else {
			nlapiSetLineItemValue(type, 'custpage_license_acl_orig', linenum, nlapiGetLineItemValue(type, name, linenum));
		}
	}
	
	if (type == 'custpage_aclitems' && name == 'custpage_license_aclexisting') {
		var productKey = nlapiGetLineItemValue(type, name, linenum);
		var aclText = nlapiGetLineItemText(type, name, linenum);
		var aclType = aclText.substr(0, 3);
		var recordType = '';
		var recordField = '';
		
		if (aclType == 'NXL') {
			recordType = 'customrecordr7nexposelicensing';
		}
		if (aclType == 'MSL') {
			recordType = 'customrecordr7metasploitlicensing';
		}
		if (aclType == 'MBL') {
			recordType = 'customrecordr7mobilisafelicense';
		}
		if (aclType == 'UIL') {
			recordType = 'customrecordr7userinsightlicense';
		}
		if (aclType == 'INP') {
			recordType = 'customrecordr7insightplatform';
		}
		var itemFamily = nlapiGetLineItemValue(type, 'custpage_itemfamily_acl', linenum);
		
		if (itemFamily != null && itemFamily != '') {
			var licenseFamily = findLicenceItemFamily(productKey, recordType);
			
			if (licenseFamily != null && itemFamily.indexOf(licenseFamily) == -1) {
				alert('That ACL/Product Key is not compatible with this item');
				nlapiSetLineItemValue(type, name, linenum, nlapiGetLineItemValue(type, 'custpage_license_aclexisting_orig', linenum));
			}
			else {
				nlapiSetLineItemValue(type, 'custpage_license_aclexisting_orig', linenum, nlapiGetLineItemValue(type, name, linenum));
			}
		}
		else {
			nlapiSetLineItemValue(type, 'custpage_license_aclexisting_orig', linenum, nlapiGetLineItemValue(type, name, linenum));
		}
	}
	
	if (type == 'custpage_hdwlist' && name == 'custpage_hdwship') {
		var addyJSON = nlapiGetFieldValue('custpage_addressjson');
		var addId = nlapiGetLineItemValue(type, 'custpage_hdwship', linenum);
		if (addId == 'new') {
			var customerId = nlapiGetFieldValue('custpage_customerid');
			var toURL = nlapiRequestURL(nlapiResolveURL('SUITELET','customscriptretrieveurl','customdeployretrieveurl',true)).getBody();
			var newAddressURL = toURL+'/app/common/entity/address.nl?etype=custjob&ship=T&entity_id=' + customerId + '&entity=' + customerId;
			popUpWindow(newAddressURL, 600, 400);
		}
		else {
			if (addyJSON != null && addyJSON != '') {
				var objAddy = JSON.parse(addyJSON);
				
				for (var i = 0; objAddy.address != null && i < objAddy.address.length; i++) {
					if (addId == objAddy.address[i].id) {
						nlapiSetLineItemValue(type, 'custpage_hdwshiptext', linenum, objAddy.address[i].address);
						break;
					} else {
						nlapiSetLineItemValue(type, 'custpage_hdwshiptext', linenum, '');
					}
					
				}
			}
		}
	}
}

function validateField(type, name, linenum){

	return true;
}

function validateLine(type){

	return true;
}

function findLicenceItemFamily(productKey, recordType){
	
	var searchFilters;
	var searchColumn;

	if (recordType == 'customrecordr7metasploitlicensing') {
		searchFilters = new nlobjSearchFilter('custrecordr7msproductkey', null, 'is', productKey);
		searchColumn = new nlobjSearchColumn('custrecordr7mslicenseitemfamily');
	}
	if (recordType == 'customrecordr7nexposelicensing') {
		searchFilters = new nlobjSearchFilter('custrecordr7nxproductkey', null, 'is', productKey);
		searchColumn = new nlobjSearchColumn('custrecordcustrecordr7nxlicenseitemfamil');
	}
	if (recordType == 'customrecordr7userinsightlicense') {
		searchFilters = new nlobjSearchFilter('custrecordr7uilicenseproductkey', null, 'is', productKey);
		searchColumn = new nlobjSearchColumn('custrecordr7uilicenseitemfamily');
	}
	if (recordType == 'customrecordr7insightplatform') {
		searchFilters = new nlobjSearchFilter('custrecordr7inplicenseprodcutkey', null, 'is', productKey);
		searchColumn = new nlobjSearchColumn('custrecordr7inplicenseitemfamily');
	}
	if (recordType != null && recordType != '') {
		var searchResults = nlapiSearchRecord(recordType, null, searchFilters, searchColumn);
		
		if (searchResults != null && searchResults.length >= 1) {
			return searchResults[0].getValue(searchColumn);
		}
		else {
			return null;
		}
	}
	return null;
}

function findParentItemFamily(lineId){

	for (var i = 1; i <= nlapiGetLineItemCount('custpage_aclitems'); i++) {
		if (nlapiGetLineItemValue('custpage_aclitems', 'custpage_lineid_acl', i) == lineId) {
			return nlapiGetLineItemValue('custpage_aclitems', 'custpage_itemfamily_acl', i);
		}
	}
	return null;
}

function popUpWindow(url, width, height){
	var params = '';
	
	if (width != null && width != '' && height != null && height != '') {
		var left = (screen.width - width) / 2;
		var top = (screen.height - height) / 2;
		params += 'width=' + width + ', height=' + height;
		params += ', menubar=no';
		params += ', status=no';
	}
	
	newwin = window.open(url, null, params);
	
	if (window.focus) {
		newwin.focus();
	}
	return false;
}