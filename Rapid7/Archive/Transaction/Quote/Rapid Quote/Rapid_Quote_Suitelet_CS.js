/*
 * Module Description
 * 
 * Version    Date            Author           Remarks
 * 1.00       24 Sep 2012     efagone
 * Updated to TSL 1.2.0
 *
 */

var objItemProps = new Object();

function pageInit(){

	window.onbeforeunload = function(){};

	nlapiSetFieldValue('custpage_currentitems', getCurrentListHTML(), false);

	var lineCount = nlapiGetLineItemCount('custpage_relateditemlist');
	for (var i = 1; i <= lineCount; i++) {

		var lockQuantity = nlapiGetLineItemValue('custpage_relateditemlist', 'custpage_relateditem_lockquantity', i);
		var required = nlapiGetLineItemValue('custpage_relateditemlist', 'custpage_relateditem_required', i);
		
		if (lockQuantity == 'T') {
			nlapiSetLineItemDisabled('custpage_relateditemlist', 'custpage_relateditem_quantity', true, i);
		}
		if (required == 'T'){
			nlapiSetLineItemDisabled('custpage_relateditemlist', 'custpage_relateditem_select', true, i);
		}
	}
	
	
}

function fieldChanged(type, name, linenum){
        var toURL = nlapiRequestURL(nlapiResolveURL('SUITELET','customscriptretrieveurl','customdeployretrieveurl',true)).getBody();

	if (name == 'custpage_itemtype') {
	
		nlapiSetFieldValue('custpage_itemfamily', '');
		nlapiSetFieldValue('custpage_itemselect', '');
		nlapiSetFieldValue('custpage_productselect', '');
		nlapiSetFieldValue('custpage_licenseselect', '');
	}
	
	if (name == 'custpage_itemselectqty') {
		var selectedItem = nlapiGetFieldValue('custpage_itemselect');
		var selectedItemQty = nlapiGetFieldValue('custpage_itemselectqty');
		if (selectedItem != null && selectedItem != '' && selectedItemQty != null && selectedItemQty != '') {
			var minQty = getItemProperties(selectedItem, 'minimumquantity') || getItemProperties(selectedItem, 'custitemr7itemlockquantityminimum');
			var maxQty = getItemProperties(selectedItem, 'custitemr7itemlockquantitymaximum');
			
			if (parseFloat(selectedItemQty) > parseFloat(maxQty)){
				alert('Maximum quantity for this item is ' + maxQty);
				nlapiSetFieldValue('custpage_itemselectqty', maxQty, false);
				return;
			}
			if (parseFloat(selectedItemQty) < parseFloat(minQty)){
				alert('Minimum quantity for this item is ' + minQty);
				nlapiSetFieldValue('custpage_itemselectqty', minQty, false);
				return;
			}
		}
	}
	
	if (name == 'custpage_productselect') {
	
		nlapiSetFieldValue('custpage_itemselect', '', false);
		
	}
	
	if (name == 'custpage_itemfamily') {
		
		nlapiSetFieldValue('custpage_itemselect', '', false);
		nlapiSetFieldValue('custpage_itemselectqty', '', false);
		nlapiSetFieldValue('custpage_itemselectunit', '', false);
			
		var itemFamily = nlapiGetFieldValue('custpage_itemfamily');
		if (itemFamily != null && itemFamily != '') {
			nlapiDisableField('custpage_itemselect', false);
			nlapiDisableField('custpage_itemselectqty', false);
			var jsonItemFamilies = nlapiGetContext().getSessionObject('json_itemfamilies');
			if (jsonItemFamilies != null && jsonItemFamilies != '') {
				var objItemFamilies = JSON.parse(jsonItemFamilies);
				if (objItemFamilies.hasOwnProperty(itemFamily)) {
					var objFamily = objItemFamilies[itemFamily];
					
					var arrItems = objFamily.items;
					
					nlapiRemoveSelectOption('custpage_itemselect');
					nlapiInsertSelectOption('custpage_itemselect', '', '', true);
					for (var i = 0; arrItems != null && i < arrItems.length; i++) {
						nlapiInsertSelectOption('custpage_itemselect', arrItems[i].id, arrItems[i].name);
					}
				}
				nlapiSetFieldValue('custpage_itemselect', '', false);
			}
		}
		else {
			nlapiDisableField('custpage_itemselect', true);
			nlapiDisableField('custpage_itemselectqty', true);
		}
	}
	
	if (name == 'custpage_itemtype' || name == 'custpage_itemselect' || name == 'custpage_productselect' || name == 'custpage_licenseselect') {
		saveDataJSON(1);
	}
	
	if (type == 'custpage_relateditemlist' && name == 'custpage_relateditem_quantity') {
		var minQty = nlapiGetLineItemValue('custpage_relateditemlist', 'custpage_relateditem_minquantity', linenum);
		var maxQty = nlapiGetLineItemValue('custpage_relateditemlist', 'custpage_relateditem_maxquantity', linenum);
		
		var newValue = nlapiGetLineItemValue('custpage_relateditemlist', 'custpage_relateditem_quantity', linenum);
		if (maxQty != null && maxQty != '' && newValue > maxQty) {
			nlapiSetLineItemValue('custpage_relateditemlist', 'custpage_relateditem_quantity', linenum, maxQty);
			alert('Maximum quantity for this item is ' + maxQty);
		}
		if (minQty != null && minQty != '' && newValue < minQty) {
			nlapiSetLineItemValue('custpage_relateditemlist', 'custpage_relateditem_quantity', linenum, minQty);
			alert('Minimum quantity for this item is ' + minQty);
		}
	}
	
	if (type == 'custpage_relateditemlist' && name == 'custpage_relateditem_select') {
	
		var selected = nlapiGetLineItemValue('custpage_relateditemlist', 'custpage_relateditem_select', linenum);
		var required = nlapiGetLineItemValue('custpage_relateditemlist', 'custpage_relateditem_required', linenum);
		var strOtherRequiredItems = nlapiGetLineItemValue('custpage_relateditemlist', 'custpage_relateditem_itemsrequired', linenum);
		
		var arrOtherRequiredItems = new Array();
		if (strOtherRequiredItems != null && strOtherRequiredItems != '') {
			arrOtherRequiredItems = strOtherRequiredItems.split(',');
		}
		
		var lineCount = nlapiGetLineItemCount('custpage_relateditemlist');
		for (var i = 0; arrOtherRequiredItems != null && i < arrOtherRequiredItems.length; i++) {
		
			var requiredItem = arrOtherRequiredItems[i];
			
			for (var j = 1; j <= lineCount; j++) {
				var itemId = nlapiGetLineItemValue('custpage_relateditemlist', 'custpage_relateditem_itemid', j);
				
				if (requiredItem == itemId) {
				
					if (selected == 'T') {
						var selectedItemName = nlapiGetLineItemValue('custpage_relateditemlist', 'custpage_relateditem_itemtext', linenum);
						var currentItemName = nlapiGetLineItemValue('custpage_relateditemlist', 'custpage_relateditem_itemtext', j);
						
						var currentSelection = nlapiGetLineItemValue('custpage_relateditemlist', 'custpage_relateditem_select', j);
						if (currentSelection != 'T') {
							alert(selectedItemName + ' requires ' + currentItemName + '. Automaticaly selecting ' + currentItemName + '.');
							nlapiSetLineItemValue('custpage_relateditemlist', 'custpage_relateditem_select', j, 'T');
						}
						nlapiSetLineItemDisabled('custpage_relateditemlist', 'custpage_relateditem_select', true, j);
					}
					else 
						if (selected == 'F' && required == 'F') {
							nlapiSetLineItemDisabled('custpage_relateditemlist', 'custpage_relateditem_select', false, j);
						}
				}
			}
		}
	}
	
	if (name == 'custpage_billingaddress' || name == 'custpage_shippingaddress') {
		var addyJSON = nlapiGetFieldValue('custpage_addressjson');
		var addId = nlapiGetFieldValue(name);
		
		if (addId == 'new') {
			var customerId = nlapiGetFieldValue('custpage_customerid');
			var newAddressURL = toURL+'/app/common/entity/address.nl?etype=custjob&ship=T&entity_id=' + customerId + '&entity=' + customerId;
			popUpWindow(newAddressURL, 600, 400);
		}
		else {
			if (addyJSON != null && addyJSON != '') {
				var objAddy = JSON.parse(addyJSON);
				
				
				if (name == 'custpage_billingaddress') {
				
					for (var i = 0; objAddy.address != null && i < objAddy.address.length; i++) {
					
						if (addId == objAddy.address[i].id) {
							nlapiSetFieldValue('custpage_billingaddresstext', objAddy.address[i].address);
							break;
						}
						
					}
				}
				if (name == 'custpage_shippingaddress') {
					for (var i = 0; objAddy.address != null && i < objAddy.address.length; i++) {
					
						if (addId == objAddy.address[i].id) {
							nlapiSetFieldValue('custpage_shippingaddresstext', objAddy.address[i].address);
							break;
						}
						
					}
				}
			}
		}
	}
}

function r7addmore(){

	if (checkRequiredFields()) {
		//stage 2
		saveDataJSON(2);
	}
	
}

function r7nextstep(){
	
	if (checkRequiredFields()) {
		saveDataJSON(3);
	}
}

function checkRequiredFields(){
	
	var arrRequiredFields = new Array();
	if (nlapiGetFieldValue('custpage_itemtype') == 'new' && nlapiGetFieldValue('custpage_itemselect') != null && nlapiGetFieldValue('custpage_itemselect') != ''){
		arrRequiredFields.push('custpage_itemselectqty');
	}
	
	var arrMissing = new Array();
	for (var i = 0; arrRequiredFields != null && i < arrRequiredFields.length; i++) {
		if (nlapiGetFieldValue(arrRequiredFields[i]) == null || nlapiGetFieldValue(arrRequiredFields[i]) == '') {
			arrMissing[arrMissing.length] = nlapiGetFieldLabel(arrRequiredFields[i]);
		}
	}
	
	if (arrMissing != null && arrMissing.length > 0) {
		alert('Please enter a value(s) for: ' + arrMissing.join(', '));
		return false;
	}	
	
	return true;
}

function r7prevstep(){
	
	saveDataJSON(1);
}


function startOver(){
	
	//stage 0
	saveDataJSON(0);
	
}

function saveDataJSON(stage){

	//stage 0 - persist nothing (start over)
	//stage 1 - persist everything
	//stage 2 - store json in field and refresh suitelet to add more
	//stage 3 - store json in field to ask final questions
	
	var suiteletURL = nlapiResolveURL('SUITELET', 'customscriptr7rapidquote_suitelet', 'customdeployr7rapidquote_suitelet', false);
	suiteletURL += '&custparam_oppid=' + nlapiGetFieldValue('custpage_oppid');
	
	if (stage === 0) { //start over
		var params = new Array();
		params['custparam_sessionobject_name'] = 'rapidquote_json';
		params['custparam_sessionobject_value'] = '{}';
		var sessionResponse = nlapiRequestURL('/app/site/hosting/scriptlet.nl?script=582&deploy=1', params);
		window.location = suiteletURL;
		return;
	}
	
	var objSaved = new Object;
	objSaved.stage = stage;
	objSaved.oppId = nlapiGetFieldValue('custpage_oppid');
	objSaved.newOrUpsell = nlapiGetFieldValue('custpage_itemtype');
	objSaved.itemFamily = nlapiGetFieldValue('custpage_itemfamily');
	objSaved.itemSelect = nlapiGetFieldValue('custpage_itemselect');
	objSaved.itemSelectQty = nlapiGetFieldValue('custpage_itemselectqty');
	objSaved.licenseSelect = nlapiGetFieldValue('custpage_licenseselect');
	objSaved.productSelect = nlapiGetFieldValue('custpage_productselect');
	
	var storedItems = nlapiGetFieldValue('custpage_storeditems');
	objSaved.quoteItemsGroups = new Array();
	
	if (storedItems != null && storedItems != '') {
		objSaved.quoteItemsGroups = JSON.parse(storedItems);
	}
	
	if (stage == 2 || stage == 3) { //store json in field and refresh suitelet to add more
		var matchId = 'acr_' + Math.floor(Math.random() * 999999);
		var group = new Object;
		group.items = new Array();
		group.parentItem = '';
		
		var groupItemCount = 0;
		if (objSaved.itemSelect != null && objSaved.itemSelect != '') {
			var item = new Object;
			
			item.id = objSaved.itemSelect;
			group.parentItem = objSaved.itemSelect;
			item.quantity = nlapiGetFieldValue('custpage_itemselectqty');
			item.displayname = nlapiGetFieldValue('custpage_itemselecttext');
			item.description = nlapiGetFieldValue('custpage_itemselecttextdescribe');
			group.items[group.items.length] = item;
			groupItemCount++;
		}
		else {
			matchId = nlapiGetFieldValue('custpage_licenseselecttext');
		}
		
		var lineCount = nlapiGetLineItemCount('custpage_relateditemlist');
		for (var i = 1; i <= lineCount; i++) {
			var item = new Object;
			
			var addItem = nlapiGetLineItemValue('custpage_relateditemlist', 'custpage_relateditem_select', i);
			
			if (addItem == 'T') {
				item.id = nlapiGetLineItemValue('custpage_relateditemlist', 'custpage_relateditem_itemid', i);
				item.quantity = nlapiGetLineItemValue('custpage_relateditemlist', 'custpage_relateditem_quantity', i);
				item.displayname = nlapiGetLineItemValue('custpage_relateditemlist', 'custpage_relateditem_itemtext', i);
				item.description = nlapiGetLineItemValue('custpage_relateditemlist', 'custpage_relateditem_itemdescription', i);
				group.items[group.items.length] = item;
				groupItemCount++;
			}
		}
		group.discountPercent = nlapiGetFieldValue('custpage_discountsection');
		group.additionalYears = nlapiGetFieldValue('custpage_additionalyears');
		group.matchid = matchId;
		group.itemCount = groupItemCount;
		
		if (groupItemCount > 0) {
			objSaved.quoteItemsGroups[objSaved.quoteItemsGroups.length] = group;
		}
		
	}
	
	//objSaved.quoteItems.sort(myItemAssociatedSort);
	var json = JSON.stringify(objSaved);
	
	var params = new Array();
	params['custparam_sessionobject_name'] = 'rapidquote_json';
	params['custparam_sessionobject_value'] = json;
	var sessionResponse = nlapiRequestURL('/app/site/hosting/scriptlet.nl?script=582&deploy=1', params);
	window.location = suiteletURL;
	
}

function getCurrentListHTML(){

	var storedItems = nlapiGetFieldValue('custpage_storeditems');
	
	var objSaved = new Object;
	objSaved.quoteItemsGroups = new Array();
	
	if (storedItems != null && storedItems != '') {
		objSaved.quoteItemsGroups = JSON.parse(storedItems);
	}
	else {
		return '';
	}
	
	var currentItems = '';
	currentItems += '<html><body><style media="screen" type="text/css">';
	currentItems += '.datagrid table { border-collapse: collapse; text-align: left; width: 100%; } .datagrid {font: normal 12px/150% Arial, Helvetica, sans-serif; background: #fff; overflow: hidden; border: 1px solid #006699; -webkit-border-radius: 3px; -moz-border-radius: 3px; border-radius: 3px; }.datagrid table td, .datagrid table th { padding: 3px 5px; }.datagrid table thead th {background:-webkit-gradient( linear, left top, left bottom, color-stop(0.05, #006699), color-stop(1, #00557F) );background:-moz-linear-gradient( center top, #006699 5%, #00557F 100% );filter:progid:DXImageTransform.Microsoft.gradient(startColorstr="#006699", endColorstr="#00557F");background-color:#006699; color:#FFFFFF; font-size: 12px; font-weight: bold; border-left: 1px solid #0070A8; } .datagrid table thead th:first-child { border: none; }.datagrid table tbody td { color: #00496B; border-left: 1px solid #E1EEF4;font-size: 12px;font-weight: normal; }.datagrid table tbody .alt td { background: #E1EEF4; color: #00496B; }.datagrid table tbody td:first-child { border-left: none; }.datagrid table tbody tr:last-child td { border-bottom: none; }';
	currentItems += '</style>';
	
	currentItems += '<div class="datagrid"><table width="400">';
	currentItems += '<thead><tr><th>Qty</th><th>Item</th><th>Description</th><th>Item Association</th></tr></thead>';
	currentItems += '<tbody>';
	
	for (var i = 0; objSaved.quoteItemsGroups != null && i < objSaved.quoteItemsGroups.length; i++) {
		var group = objSaved.quoteItemsGroups[i];
		var itemAssociation = group.matchid;
		
		for (var j = 0; group.items != null && j < group.items.length; j++) {
			var item = group.items[j];
			if (isEven(j)) {
				currentItems += '<tr><td>' + item.quantity + '</td><td>' + item.displayname + '</td><td>' + item.description + '</td><td>' + itemAssociation + '</td></tr>';
			}
			else {
				currentItems += '<tr class="alt"><td>' + item.quantity + '</td><td>' + item.displayname + '</td><td>' + item.description + '</td><td>' + itemAssociation + '</td></tr>';
			}
		}
	}
	
	currentItems += '</tbody></table></div></body></html>';
	
	return currentItems;
}

function getItemProperties(recId, specificFieldId){

	if (recId == null || recId == '') {
		return null;
	}
	
	if (objItemProps.hasOwnProperty(recId)) {
	
		if (objItemProps[recId] == null) {
			return null;
		}
		if (specificFieldId != null && specificFieldId != '') {
			return objItemProps[recId][specificFieldId];
		}
		return objItemProps[recId];
	}
	
	var arrFieldIds = new Array();
	arrFieldIds[arrFieldIds.length] = 'isinactive';
	arrFieldIds[arrFieldIds.length] = 'internalid';
	arrFieldIds[arrFieldIds.length] = 'minimumquantity';
	arrFieldIds[arrFieldIds.length] = 'custitemr7itemlockquantityminimum';
	arrFieldIds[arrFieldIds.length] = 'custitemr7itemlockquantitymaximum';
	arrFieldIds[arrFieldIds.length] = 'custitemlockquantity';

	objItemProps[recId] = nlapiLookupField('item', recId, arrFieldIds);
	
	if (objItemProps[recId] == null) {
		return null;
	}
	if (specificFieldId != null && specificFieldId != '') {
		return objItemProps[recId][specificFieldId];
	}
	return objItemProps[recId];
	
}

function myItemAssociatedSort(a, b){
	var valA = a.matchid;
	var valB = b.matchid;
	
	if (valA < valB) //sort string ascending
		return -1;
	if (valA > valB) 
		return 1;
	return 0; //default return value (no sorting)
}

function isEven(someNumber){
	return (someNumber % 2 == 0) ? true : false;
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