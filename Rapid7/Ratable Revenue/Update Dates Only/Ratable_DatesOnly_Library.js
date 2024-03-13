
function processE81_dateONLY(recTran){

	var PENDING_DELIVERY_DATE = '12/31/2025';
	var strToday = nlapiDateToString(new Date());
	var tranDate = recTran.getFieldValue('trandate');
	var partner = recTran.getFieldValue('partner');
	var recType = recTran.getRecordType();
	if (recType != 'salesorder' && !isBlank(recTran.getFieldValue('createdfrom'))) {
		var fieldValues = nlapiLookupField('transaction', recTran.getFieldValue('createdfrom'), new Array('trandate', 'type', 'createdfrom', 'partner'));
		var createdType = getRecTypeId(fieldValues['type']);
		tranDate = fieldValues['trandate'];
		partner = fieldValues['partner'];
		
		if (createdType == 'invoice' && !isBlank(fieldValues['createdfrom'])) {
			var fieldValues2 = nlapiLookupField('transaction', fieldValues['createdfrom'], new Array('trandate', 'partner'));
			tranDate = fieldValues2['trandate'];
			partner = fieldValues2['partner'];
		}
	}
	
	//price list stuff
	var dtTran = nlapiStringToDate(tranDate);
	var tranMonth = dtTran.getMonth();
	var tranHalf = 1;
	if (tranMonth >= 6) {
		tranHalf = 2;
	}
	var tranYear = dtTran.getFullYear() + '';
	
	switch (tranYear) {
		case '2008':
			//recTran.setFieldValue('custbody_besp_price_list_v', 1);
			break;
		case '2009':
			//recTran.setFieldValue('custbody_besp_price_list_v', 2);
			break;
		case '2010':
			//recTran.setFieldValue('custbody_besp_price_list_v', 3);
			break;
		case '2011':
			//recTran.setFieldValue('custbody_besp_price_list_v', 4);
			break;
		case '2012':
			if (tranHalf == 1) {
				if (isBlank(partner)) {
					//recTran.setFieldValue('custbody_besp_price_list_v', 12);
				}
				else {
					//recTran.setFieldValue('custbody_besp_price_list_v', 9);
				}
			}
			else {
				if (isBlank(partner)) {
					//recTran.setFieldValue('custbody_besp_price_list_v', 13);
				}
				else {
					//recTran.setFieldValue('custbody_besp_price_list_v', 14);
				}
			}
			break;
		case '2013':
			if (tranHalf == 1) {
				if (isBlank(partner)) {
					//recTran.setFieldValue('custbody_besp_price_list_v', 15);
				}
				else {
					//recTran.setFieldValue('custbody_besp_price_list_v', 10);
				}
			}
			else {
				if (isBlank(partner)) {
					//recTran.setFieldValue('custbody_besp_price_list_v', 16);
				}
				else {
					//recTran.setFieldValue('custbody_besp_price_list_v', 17);
				}
			}
			break;
		case '2014':
			if (tranHalf == 1) {
				if (isBlank(partner)) {
					//recTran.setFieldValue('custbody_besp_price_list_v', 7);
				}
				else {
					//recTran.setFieldValue('custbody_besp_price_list_v', 18);
				}
			}
			else {
				if (isBlank(partner)) {
					//recTran.setFieldValue('custbody_besp_price_list_v', 20);
				}
				else {
					//recTran.setFieldValue('custbody_besp_price_list_v', 21);
				}
			}
			break;
		case '2015':
			//recTran.setFieldValue('custbody_besp_price_list_v', 8);
			break;
		case '2016':
			//recTran.setFieldValue('custbody_besp_price_list_v', 11);
			break;
		case '2017':
		//	recTran.setFieldValue('custbody_besp_price_list_v', 24);
			break;
	}
	
	
	
	//get min ratable and max ratable dates
	var maxRatableStart = null;
	var maxRatableEnd = null;
	var multiElement = false;
	var lineItemCount = recTran.getLineItemCount('item');
	
	var arrAllSkuCats = new Array();
	
	for (var i = 1; i <= lineItemCount; i++) {
		var itemId = recTran.getLineItemValue('item', 'item', i);
		var amount = recTran.getLineItemValue('item', 'amount', i);
		var revRecSkuCategory = parseInt(getItemProperties(itemId, 'custitemr7revrecskucategory'));
		
		if (revRecSkuCategory == 8) {
			revRecSkuCategory = 4; //SAAS
			if (amount != null && amount != '' && parseFloat(amount) > 0) {
				revRecSkuCategory = 6; //Ratable
			}
		}
		if (revRecSkuCategory > 0) {
			arrAllSkuCats[arrAllSkuCats.length] = revRecSkuCategory;
		}
		
		var licenseStart = recTran.getLineItemValue('item', 'custcolr7startdate', i);
		var licenseEnd = recTran.getLineItemValue('item', 'custcolr7enddate', i);
		
		var revRecStartDate = recTran.getLineItemValue('item', 'revrecstartdate', i);
		var revRecEndDate = recTran.getLineItemValue('item', 'revrecenddate', i);
		
		if (isBlank(licenseStart) && isBlank(licenseEnd) && !isBlank(revRecStartDate) && !isBlank(revRecEndDate)) {
			//recTran.setLineItemValue('item', 'custcolr7startdate', i, revRecStartDate);
			//recTran.setLineItemValue('item', 'custcolr7enddate', i, revRecEndDate);
			
			licenseStart = revRecStartDate;
			licenseEnd = revRecEndDate;
		}
		
		if (revRecSkuCategory == 6) { //Ratable
			multiElement = true;
			if ((licenseStart != null && licenseStart != '') && (maxRatableStart == null || nlapiStringToDate(licenseStart) < nlapiStringToDate(maxRatableStart))) {
				maxRatableStart = licenseStart;
			}
			if ((licenseEnd != null && licenseEnd != '') && (maxRatableEnd == null || nlapiStringToDate(licenseEnd) > nlapiStringToDate(maxRatableEnd))) {
				maxRatableEnd = licenseEnd;
			}
		}
	}
	
	var isHistoric = false;
	if (nlapiStringToDate(tranDate) < nlapiStringToDate('1/1/2011')) {
		isHistoric = true;
	}
	
	//now for the actual setting of dates
	var lineItemCount = recTran.getLineItemCount('item');
	
	var minStart = null;
	var maxEnd = null;
	
	for (var i = 1; i <= lineItemCount; i++) {
	
		var itemId = recTran.getLineItemValue('item', 'item', i);
		var amount = recTran.getLineItemValue('item', 'amount', i);
		var lineId = recTran.getLineItemValue('item', 'line', i);
		var itemType = recTran.getLineItemValue('item', 'itemtype', i);
		
		var licenseStart = recTran.getLineItemValue('item', 'custcolr7startdate', i);
		var licenseEnd = recTran.getLineItemValue('item', 'custcolr7enddate', i);
		
		// DATE STUFF
		
		//SKU CATEGORY STUFF
		var revRecSkuCategory = parseInt(getItemProperties(itemId, 'custitemr7revrecskucategory'));
		if (revRecSkuCategory == 8) {
			revRecSkuCategory = 4; //SAAS
			if (amount != null && amount != '' && parseFloat(amount) > 0) {
				revRecSkuCategory = 6; //Ratable
			}
		}
		
		if (revRecSkuCategory > 0) {
			//recTran.setLineItemValue('item', 'vsoepermitdiscount', i, null);
			//recTran.setLineItemValue('item', 'vsoeprice', i, '');
			//recTran.setLineItemValue('item', 'revrecschedule', i, 5); //Month by Exact Days
		}
		
		switch (revRecSkuCategory) {
			case 1: //Hardware
				if (isHistoric) {
					recTran.setLineItemValue('item', 'revrecstartdate', i, maxRatableStart);
					recTran.setLineItemValue('item', 'revrecenddate', i, maxRatableEnd);
				}
				else {
					//set immediate?
					//recTran.setLineItemValue('item', 'revrecschedule', i, 4); //Immediate Recognition upon Delivery
					recTran.setLineItemValue('item', 'revrecstartdate', i, licenseStart);
					recTran.setLineItemValue('item', 'revrecenddate', i, licenseEnd);
				}
				break;
			case 2: //Voucher (On Demand)
				//recTran.setLineItemValue('item', 'revrecschedule', i, 4); //Immediate Recognition upon Delivery
				if (licenseStart != null && licenseStart != '') {
					recTran.setLineItemValue('item', 'revrecstartdate', i, licenseStart);
					recTran.setLineItemValue('item', 'revrecenddate', i, licenseStart);
				}
				else 
					if (maxRatableStart != null && maxRatableStart != '') {
						recTran.setLineItemValue('item', 'revrecstartdate', i, maxRatableStart);
						recTran.setLineItemValue('item', 'revrecenddate', i, maxRatableStart);
					}
					else {
						recTran.setLineItemValue('item', 'revrecstartdate', i, licenseStart);
						recTran.setLineItemValue('item', 'revrecenddate', i, licenseEnd);
					}
				break;
			case 3: //Voucher (Date Specific)
				recTran.setLineItemValue('item', 'revrecstartdate', i, licenseStart);
				recTran.setLineItemValue('item', 'revrecenddate', i, licenseEnd);
				break;
			case 4: //SAAS
				recTran.setLineItemValue('item', 'revrecstartdate', i, licenseStart);
				recTran.setLineItemValue('item', 'revrecenddate', i, licenseEnd);
				break;
			case 5: //PSO
				if (multiElement) {
					recTran.setLineItemValue('item', 'revrecstartdate', i, maxRatableStart);
					recTran.setLineItemValue('item', 'revrecenddate', i, maxRatableEnd);
				}
				else {
					//set immediate?
					//recTran.setLineItemValue('item', 'revrecschedule', i, 4); //Immediate Recognition upon Delivery
					recTran.setLineItemValue('item', 'revrecstartdate', i, PENDING_DELIVERY_DATE);
					recTran.setLineItemValue('item', 'revrecenddate', i, PENDING_DELIVERY_DATE);
				}
				break;
			case 8: //Ratable EVAL
			case 6: //Ratable
				recTran.setLineItemValue('item', 'revrecstartdate', i, maxRatableStart);
				recTran.setLineItemValue('item', 'revrecenddate', i, maxRatableEnd);
				break;
			case 7: //Travel
				//recTran.setLineItemValue('item', 'revrecschedule', i, 4); //Immediate Recognition upon Delivery
				break;
			default:
				if (itemType == 'Subtotal' || itemType == 'Discount' || itemType == 'Description') {
					recTran.setLineItemValue('item', 'revrecstartdate', i, '');
					recTran.setLineItemValue('item', 'revrecenddate', i, '');
				}
				break;
		}
		
		if (itemType != 'Subtotal' && itemType != 'Discount' && itemType != 'Description') {
			var newRevRecStart = recTran.getLineItemValue('item', 'revrecstartdate', i);
			var newRevRecEnd = recTran.getLineItemValue('item', 'revrecenddate', i);
			
			if ((newRevRecStart != null && newRevRecStart != '' && newRevRecStart != PENDING_DELIVERY_DATE) && (minStart == null || nlapiStringToDate(newRevRecStart) < nlapiStringToDate(minStart))) {
				minStart = newRevRecStart;
			}
			if ((newRevRecEnd != null && newRevRecEnd != '' && newRevRecEnd != PENDING_DELIVERY_DATE) && (maxEnd == null || nlapiStringToDate(newRevRecEnd) > nlapiStringToDate(maxEnd))) {
				maxEnd = newRevRecEnd;
			}
		}
		
		//END DATE STUFF
		
		var item_Category_R = parseInt(getItemProperties(itemId, 'custitem_item_category'));
		if (!isHistoric) { //2011 and later
			switch (item_Category_R) {
				case 1: //License - Perpetual
					//recTran.setLineItemValue('item', 'vsoesopgroup', i, 'SOFTWARE');
					//recTran.setLineItemValue('item', 'vsoeisestimate', i, 'T');
					//recTran.setLineItemValue('item', 'vsoedelivered', i, 'T');
					break;
				case 2: //License - Term
					//recTran.setLineItemValue('item', 'vsoesopgroup', i, 'SOFTWARE');
					//recTran.setLineItemValue('item', 'vsoeisestimate', i, 'F');
					//recTran.setLineItemValue('item', 'vsoedelivered', i, 'F');
					break;
				case 3: //Maintenance - New
				case 4: //Maintenance - Renewal
				case 5: //Support - New
				case 6: //Support - Renewal
					//recTran.setLineItemValue('item', 'vsoesopgroup', i, 'SOFTWARE');
					//recTran.setLineItemValue('item', 'vsoeisestimate', i, 'F');
					//recTran.setLineItemValue('item', 'vsoedelivered', i, 'F');
					break;
				case 7: //Services
				case 8: //Training
				case 9: //Other
					//recTran.setLineItemValue('item', 'vsoesopgroup', i, 'SOFTWARE');
					//recTran.setLineItemValue('item', 'vsoeisestimate', i, 'F');
					//recTran.setLineItemValue('item', 'vsoedelivered', i, 'F');
					break;
				case 10: //Parent Item
					break;
				case 11: //Hardware
					//recTran.setLineItemValue('item', 'vsoesopgroup', i, 'NORMAL');
					//recTran.setLineItemValue('item', 'vsoeisestimate', i, 'T');
					//recTran.setLineItemValue('item', 'vsoedelivered', i, 'T');
					break;
			}
		}
		else { //2010 and earlier
			switch (item_Category_R) {
				case 1: //License - Perpetual
					//recTran.setLineItemValue('item', 'vsoesopgroup', i, 'SOFTWARE');
					//recTran.setLineItemValue('item', 'vsoeisestimate', i, 'T');
					//recTran.setLineItemValue('item', 'vsoedelivered', i, 'T');
					break;
				case 2: //License - Term
					//recTran.setLineItemValue('item', 'vsoesopgroup', i, 'SOFTWARE');
					//recTran.setLineItemValue('item', 'vsoeisestimate', i, 'F');
					//recTran.setLineItemValue('item', 'vsoedelivered', i, 'F');
					break;
				case 3: //Maintenance - New
				case 4: //Maintenance - Renewal
				case 5: //Support - New
				case 6: //Support - Renewal
					//recTran.setLineItemValue('item', 'vsoesopgroup', i, 'SOFTWARE');
					//recTran.setLineItemValue('item', 'vsoeisestimate', i, 'F');
					//recTran.setLineItemValue('item', 'vsoedelivered', i, 'F');
					break;
				case 7: //Services
				case 8: //Training
				case 9: //Other
					//recTran.setLineItemValue('item', 'vsoesopgroup', i, 'SOFTWARE');
					//recTran.setLineItemValue('item', 'vsoeisestimate', i, 'F');
					//recTran.setLineItemValue('item', 'vsoedelivered', i, 'F');
					break;
				case 10: //Parent Item
					break;
				case 11: //Hardware
					//recTran.setLineItemValue('item', 'vsoesopgroup', i, 'SOFTWARE');
					//recTran.setLineItemValue('item', 'vsoeisestimate', i, 'F');
					//recTran.setLineItemValue('item', 'vsoedelivered', i, 'F');
					break;
			}
		}
				
	}
	
	//setfields
	//recTran.setFieldValue('tranisvsoebundle', 'T');
	//recTran.setFieldValue('custbody_eitf81_ise81bundle', 'T');
	//recTran.setFieldValue('iseitf81on', 'T'); //explicitly set
	//recTran.setFieldValue('vsoeautocalc', 'T');
	//recTran.setFieldValue('custbodyr7ratablerevenuerestatementsta', 9); //E81 Complete
	return recTran;
}

function getItemProperties(itemId, specificFieldId){
	
	if (itemId == null || itemId == ''){
		return null;
	}
	
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
	arrFieldIds[arrFieldIds.length] = 'isinactive';
	arrFieldIds[arrFieldIds.length] = 'displayname';
	arrFieldIds[arrFieldIds.length] = 'isfulfillable';
	arrFieldIds[arrFieldIds.length] = 'vsoedelivered';
	arrFieldIds[arrFieldIds.length] = 'custitemr7revrecskucategory';
	arrFieldIds[arrFieldIds.length] = 'custitem_custom_esp';
	arrFieldIds[arrFieldIds.length] = 'custitemr7customespproratedlist';
	arrFieldIds[arrFieldIds.length] = 'custitem_item_category';
	arrFieldIds[arrFieldIds.length] = 'custitemr7itemacrproducttype';
	arrFieldIds[arrFieldIds.length] = 'custitemr7skulicensetype';
	arrFieldIds[arrFieldIds.length] = 'custitemr7customespdefaultperc';
 
	objItemProps[itemId] = nlapiLookupField('item', itemId, arrFieldIds);
	
	if (objItemProps[itemId] == null) {
		return null;
	}
	if (specificFieldId != null && specificFieldId != '') {
		return objItemProps[itemId][specificFieldId];
	}
	return objItemProps[itemId];
}

function getRecTypeId(recType){

	switch (recType) {
		case 'CustInvc':
			recType = 'invoice';
			break;
		case 'Invoice':
			recType = 'invoice';
			break;
		case 'CashSale':
			recType = 'cashsale';
			break;
		case 'Cash Sale':
			recType = 'cashsale';
			break;
		case 'SalesOrd':
			recType = 'salesorder';
			break;
		case 'Sales Order':
			recType = 'salesorder';
			break;
		case 'CustCred':
			recType = 'creditmemo';
			break;
		case 'Credit Memo':
			recType = 'creditmemo';
			break;
		case 'CashRfnd':
			recType = 'cashrefund';
			break;
		case 'Cash Refund':
			recType = 'cashrefund';
			break;
	}
	
	return recType;
}

function setLocations(record){

	var headerLocation = record.getFieldValue('location');
	
	if (headerLocation != null && headerLocation != '') {
		for (var i = 1; i <= record.getLineItemCount('item'); i++) {
		
			var itemType = strLowerCase(record.getLineItemValue('item', 'itemtype', i));
			
			if (itemType == 'group' || itemType == 'endgroup') {
				continue;
			}

			record.setLineItemValue('item', 'location', i, headerLocation);
		}
	}
	
	return record;
}

function strLowerCase(str){
	return (str != null && str != '') ? str.toLowerCase() : '';
}

function isBlank(val){
	return (val == null || val == '') ? true : false;
}

function unique(a){
	a.sort();
	for (var i = 1; i < a.length;) {
		if (a[i - 1] == a[i]) {
			a.splice(i, 1);
		}
		else {
			i++;
		}
	}
	return a;
}

function timeLeft(){
	var presentTime = new Date().getTime();
	if (presentTime - startingTime > timeLimitInMilliseconds) {
		nlapiLogExecution('DEBUG', 'Ran out of time', 'yup');
		rescheduleScript = true;
		return false;
	}
	return true;
}

function unitsLeft(){
	var unitsLeft = context.getRemainingUsage();
	if (unitsLeft <= 250) {
		nlapiLogExecution('DEBUG', 'Ran out of units', 'yup');
		rescheduleScript = true;
		return false;
	}
	return true;
}