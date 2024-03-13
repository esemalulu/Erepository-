/**
 * @author suvarshi
 */

var objItemProps2 = new Object(); 

//A library function to be called on lineInit
function lineInitLockdown(type){

	var user = nlapiGetUser();
	var role = nlapiGetRole();
	//If the sublist being tripped on is the item sublist
	//APPS-16215 - cmcaneney 11/9/20 - adding R7 Order Management (1172) & R7 Order Management 2 (1173) roles to excluded criteria
	if (type == 'item' && role != 3 && role != 1057  && role != 1155 && role != 1172 && role != 1173 && user != 340932 && user != 3889342) {
		lockDownLineItem();
	}
}


//Library function internal
function lockDownLineItem(){
	/* Load the relevant fields on the item record
	 * to see which fields need to be locked down.
	 * And disable those fields.
	 */
	var userId = nlapiGetUser();
	var roleId = nlapiGetRole();
	
	//Lock down only items which has item ids
	var itemId = nlapiGetCurrentLineItemValue('item', 'item');
	var isItem = (itemId != null && itemId != '') ? true : false;
	
	//lock start/end dates on acl/add-ons
	
	//add-on or acl locks
	var addOns = '';
	var isACL = 'F';
	
	if (isItem) {
		var itemFields = skulock_getItemProperties(itemId);
		if (itemFields != null) {
			addOns = itemFields['custitemr7acladdons'];
			isACL = (itemFields['custitemr7itemautocreatelicense'] == 'T' || itemFields['custitemr7itemrequireeventregistration'] == 'T') ? 'T' : 'F';
		}
		else {
			addOns = '';
			isACL = 'F';
		}
	}
	
	//created from locks			
	var createdFromRA = nlapiGetCurrentLineItemValue('item', 'custcolr7createdfromra');
	var verdictCreatedFrom = (createdFromRA != null && createdFromRA != '' && isItem) ? true : false;
	nlapiDisableLineItemField('item', 'job', verdictCreatedFrom);
	nlapiDisableLineItemField('item', 'item', verdictCreatedFrom);
	nlapiDisableLineItemField('item', 'quantity', verdictCreatedFrom);
	nlapiDisableLineItemField('item', 'price', verdictCreatedFrom);
	nlapiDisableLineItemField('item', 'rate', verdictCreatedFrom);
	nlapiDisableLineItemField('item', 'amount', verdictCreatedFrom);
	nlapiDisableLineItemField('item', 'options', verdictCreatedFrom);
	nlapiDisableLineItemField('item', 'description', verdictCreatedFrom);
	nlapiDisableLineItemField('item', 'custcolr7itemmsproductkey', verdictCreatedFrom);
	//nlapiDisableLineItemField('item', 'custcolr7translicenseid', verdictCreatedFrom);

	/*
	 * the field 'custcolr7translinecontact' not be set as disabled when the transaction type is Opportunity 
	 * and the user's role is either 'R7 Customer Success Staff' (Internal ID#1022), 
	 * or 'R7 Customer Success Manager' (Internal ID #1027)
	 */
	if(isTransLineContactDisabled(roleId)){
	    nlapiDisableLineItemField('item', 'custcolr7translinecontact', verdictCreatedFrom);
	}
	
	nlapiDisableLineItemField('item', 'custcolr7createdfromra', verdictCreatedFrom);
	nlapiDisableLineItemField('item', 'revrecstartdate', verdictCreatedFrom);
	nlapiDisableLineItemField('item', 'revrecenddate', verdictCreatedFrom);
	nlapiDisableLineItemField('item', 'custcolr7startdate', verdictCreatedFrom);
	nlapiDisableLineItemField('item', 'custcolr7enddate', verdictCreatedFrom);
	
	if (!verdictCreatedFrom) {
		//Loading fields that must be locked down
		var lockDownFields = loadLockedDownFieldsForItem();
		//fields to always lock based on non item skus
		var autoLockDownFields = loadAutoLockFields();
		var itemProperties = skulock_getItemProperties(itemId);
		
		var nonItemSKU = true;
		
		if (isItem && itemProperties != null) {
			var itemType = itemProperties['type'];
			nonItemSKU = (itemType == 'Discount' || itemType == 'Subtotal' || itemType == 'Description' || itemType == null) ? true : false;
		}
		
		for (fld in lockDownFields) {
			var fieldIdToLock = findFieldToLock(fld);
			var autoLock = false;
			
			for (var i = 0; autoLockDownFields != null && i < autoLockDownFields.length && nonItemSKU; i++) {
				if (autoLockDownFields[i] == fieldIdToLock) {
					autoLock = true;
					break;
				}
			}
			
			var verdict = false;
			if (autoLock) {
				verdict = true;
			}
			else {
				var lockFieldValue = lockDownFields[fld];
				if (itemProperties != null) {
					lockFieldValue = itemProperties[fld];
				}
				verdict = (lockFieldValue == 'T') ? true : false;
			}
			nlapiDisableLineItemField('item', fieldIdToLock, verdict);
		}
	}
	
	
	var verdictAddOnACL = ((addOns != null && addOns != '') || (isACL == 'T')) ? true : false;
	nlapiDisableLineItemField('item', 'revrecstartdate', verdictAddOnACL);
	nlapiDisableLineItemField('item', 'revrecenddate', verdictAddOnACL);
	nlapiDisableLineItemField('item', 'custcolr7startdate', verdictAddOnACL);
	nlapiDisableLineItemField('item', 'custcolr7enddate', verdictAddOnACL);
	
	//always locked
	//nlapiDisableLineItemField('item', 'custcolr7translicenseid', true);
	nlapiDisableLineItemField('item', 'custcolr7opamountrenewalbaseline', true);
	nlapiDisableLineItemField('item', 'custcolr7opamountrenewalcotermline', true);
	nlapiDisableLineItemField('item', 'custcolr7opamountrenewalmultiyearline', true);
	nlapiDisableLineItemField('item', 'custcolr7createdfromra', true);
	nlapiDisableLineItemField('item', 'custcolr7contractrenewal', true);
    
    //APPS-6430 editable, but disabled Monthly Data Limit column in order to avoid issue with non-saving assigned by scritp value.
  	if (roleId != 3) {
		nlapiDisableLineItemField('item', 'custcolr7_monthlydatalimit_gb', true);
    }
	
	if (roleId == 1027 || roleId == 1022) {
		//never locked
		//they can edit, but there is other validation that prevents them from lowering
		nlapiDisableLineItemField('item', 'rate', false);
    }

    if (roleId == 1164 || roleId == 1125 || roleId == 1158 || roleId == 1174) {
        nlapiDisableLineItemField('item', 'quantity', false);
        nlapiDisableLineItemField('item', 'price', false);
        nlapiDisableLineItemField('item', 'custcolr7amountdiscountinline', false);
        nlapiDisableLineItemField('item', 'rate', false);
        nlapiDisableLineItemField('item', 'amount', false);
        nlapiDisableLineItemField('item', 'custcolr7startdate', false);
        nlapiDisableLineItemField('item', 'custcolr7enddate', false);
    }

    
    
	
}

/**
 * Function to check if the transaction type is Opportunity and 
 * the user's role is either 'R7 Customer Success Staff' (Internal ID#1022), 
 * or 'R7 Customer Success Manager' (Internal ID #1027)
 *  
 * @param roleId
 * @returns {Boolean}
 */
function isTransLineContactDisabled(roleId){
    var recordType = nlapiGetRecordType();
    return recordType==null?true:(!(recordType.toLowerCase().localeCompare('opportunity')===0 && (roleId==1022 || roleId==1027)));
}

function findFieldToLock(lockBoxFld){

	var fieldMap = new Array();
	fieldMap['custitemlockquantity'] = 'quantity';
	fieldMap['custitemlockdescription'] = 'description';
	fieldMap['custitemlockprice'] = 'price';
	fieldMap['custitemlockrate'] = 'rate';
	fieldMap['custitemlockamount'] = 'amount';
	
	for (key in fieldMap) {
		if (lockBoxFld == key) {
			return fieldMap[key];
		}
	}
	
	return null;
	
}
 
//Library function internal
function loadLockedDownFieldsForItem(){
	
	//this gives list of lock fields and their default values
	
	var lockFields = new Array();
	lockFields['custitemlockquantity'] = 'F';
	lockFields['custitemlockdescription'] = 'F';
	lockFields['custitemlockprice'] = 'F';
	lockFields['custitemlockrate'] = 'F';
	lockFields['custitemlockamount'] = 'F';
	
	return lockFields;
}

function loadAutoLockFields(){
	
	var autoLockFields = new Array();
	//autoLockFields[autoLockFields.length] = 'price';
	autoLockFields[autoLockFields.length] = 'amount';
	
	return autoLockFields;
	
}

function skulock_getItemProperties(itemId, specificFieldId){
	
	if (itemId == null || itemId == ''){
		return null;
	}
	
	if (objItemProps2.hasOwnProperty(itemId)) {
	
		if (objItemProps2[itemId] == null) {
			return null;
		}
		if (specificFieldId != null && specificFieldId != '') {
			return objItemProps2[itemId][specificFieldId];
		}
		return objItemProps2[itemId];
	}
	
	var arrFieldIds = new Array();
	arrFieldIds[arrFieldIds.length] = 'isinactive';
	arrFieldIds[arrFieldIds.length] = 'type';
	arrFieldIds[arrFieldIds.length] = 'displayname';
	arrFieldIds[arrFieldIds.length] = 'custitemlockquantity';
	arrFieldIds[arrFieldIds.length] = 'custitemlockdescription';
	arrFieldIds[arrFieldIds.length] = 'custitemlockprice';
	arrFieldIds[arrFieldIds.length] = 'custitemlockrate';
	arrFieldIds[arrFieldIds.length] = 'custitemlockamount';
	arrFieldIds[arrFieldIds.length] = 'custitemr7itemlockquantityminimum';
	arrFieldIds[arrFieldIds.length] = 'custitemr7itemlockquantitymaximum';
	arrFieldIds[arrFieldIds.length] = 'custitemr7acladdons';
	arrFieldIds[arrFieldIds.length] = 'custitemr7itemautocreatelicense';
	arrFieldIds[arrFieldIds.length] = 'custitemr7itemrequireeventregistration';

	objItemProps2[itemId] = nlapiLookupField('item', itemId, arrFieldIds);

	if (objItemProps2[itemId] == null) {
		return null;
	}
	if (specificFieldId != null && specificFieldId != '') {
		return objItemProps2[itemId][specificFieldId];
	}
	if(objItemProps2[itemId].type === 'Description'){
		objItemProps2[itemId].custitemlockdescription = 'T';
	}
	return objItemProps2[itemId];
}
