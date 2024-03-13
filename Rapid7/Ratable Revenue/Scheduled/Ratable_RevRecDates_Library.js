
var objNormals = new Object();
objNormals['371'] = true;
objNormals['372'] = true;
objNormals['373'] = true;
objNormals['377'] = true;
objNormals['745'] = true;
objNormals['746'] = true;
objNormals['747'] = true;
objNormals['748'] = true;
objNormals['1036'] = true;
objNormals['1037'] = true;
objNormals['1038'] = true;
objNormals['1039'] = true;
objNormals['1040'] = true;
objNormals['1041'] = true;
objNormals['1139'] = true;
objNormals['1178'] = true;
objNormals['1199'] = true;
objNormals['1242'] = true;
objNormals['1245'] = true;
objNormals['1246'] = true;
objNormals['1247'] = true;
objNormals['1248'] = true;
objNormals['1305'] = true;
objNormals['1306'] = true;
objNormals['1363'] = true;
objNormals['380'] = true;
objNormals['90'] = true;
objNormals['1236'] = true;
objNormals['1235'] = true;
objNormals['1250'] = true;
objNormals['1233'] = true;
objNormals['1231'] = true;
objNormals['1234'] = true;
objNormals['1232'] = true;


function processInvoice(recType, invoiceId){

	nlapiLogExecution('DEBUG', 'Running EITF', invoiceId + ': ' + new Date());
	//invoice
	//EFIT PROCESS NOW
	var recTran = nlapiLoadRecord(recType, invoiceId);
	var stage = recTran.getFieldValue('custbodyr7ratablerevenuerestatementsta');
	if (stage == 14) {
		nlapiLogExecution('DEBUG', 'Pushing from invoice to Sales Order', invoiceId);
		pushDataFromInvoiceToOrder(recType, invoiceId);
		
		nlapiSubmitField(recType, invoiceId, new Array('custbodyr7ratablerevenuerestatementsta', 'custbodyr7ratabledateprocessed'), new Array(12, nlapiDateToString(new Date(), 'datetimetz'))); //Processed-Final
		nlapiLogExecution('DEBUG', 'Completed transaction', invoiceId + ': ' + new Date());
	}

	recTran = setLocations(recTran);
	var arrReturn = processE81(recTran);
	recTran = arrReturn[0];
	nlapiSubmitRecord(recTran, false, true);
	
	try {
		var adminUser =  nlapiLoadConfiguration('companypreferences').getFieldValue('custscriptr7_system_info_email_sender');
		nlapiSendEmail(adminUser, nlapiGetUser(), 'Finished processing order: ' + recTran.getFieldValue('tranid'), 'ID: ' + recTran.getFieldValue('tranid'));
	} 
	catch (e2) {
	
	}
	
	if (arrReturn[1] == true) {//stop processing tran, its already complete
		return;
	}
	
	nlapiLogExecution('DEBUG', 'Running FFT', invoiceId + ': ' + new Date());
	
	//time for FFT	
	var recTran = nlapiLoadRecord(recType, invoiceId);
	recTran = setLocations(recTran);
	processFFT(recTran);
	recTran.setFieldValue('custbodyr7ratablerevenuerestatementsta', 10); //E81 and FFT Complete
	nlapiSubmitRecord(recTran, false, true);
	
	nlapiLogExecution('DEBUG', 'Running Historical Rev Schedules', invoiceId + ': ' + new Date());
	updateRevRecSchedules(recType, invoiceId);
	nlapiSubmitField(recType, invoiceId, 'custbodyr7ratablerevenuerestatementsta', 11); //E81, FFT, and RevRecSched Complete
	
	nlapiLogExecution('DEBUG', 'Pushing from invoice to Sales Order', invoiceId);
	pushDataFromInvoiceToOrder(recType, invoiceId);
	
	nlapiSubmitField(recType, invoiceId, new Array('custbodyr7ratablerevenuerestatementsta', 'custbodyr7ratabledateprocessed'), new Array(12, nlapiDateToString(new Date(), 'datetimetz'))); //Processed-Final

	nlapiLogExecution('DEBUG', 'Completed transaction', invoiceId + ': ' + new Date());
	
}

function grabPrevFails(){

	var objPrevFails = new Object();
	
	var arrFilters = new Array();
	arrFilters[0] = new nlobjSearchFilter('isinactive', null, 'is', 'F');
	
	var arrColumns = new Array();
	arrColumns[0] = new nlobjSearchColumn('internalid');
	arrColumns[1] = new nlobjSearchColumn('custrecordr7ratabletranerrortran');
	
	var newSearch = nlapiCreateSearch('customrecordr7ratabletransactionerrorlog');
	newSearch.setFilters(arrFilters);
	newSearch.setColumns(arrColumns);
	var resultSet = newSearch.runSearch();
	
	var rowNum = 0;
	do {
		var resultSlice = resultSet.getResults(rowNum, rowNum + 1000);
		for (var rs in resultSlice) {
			var errorId = resultSlice[rs].getValue(arrColumns[0]);
			var tranId = resultSlice[rs].getValue(arrColumns[1]);
			objPrevFails[tranId] = errorId; // add to map
			rowNum++;
		}
	}
	while (resultSlice.length >= 1000);
	
	return objPrevFails;
}

function processE81(recTran){
		
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
	if (tranMonth >= 6){
		tranHalf = 2;
	}
	var tranYear = dtTran.getFullYear() + '';
	
	switch (tranYear) {
		case '2008':
			recTran.setFieldValue('custbody_besp_price_list_v', 1);
			break;
		case '2009':
			recTran.setFieldValue('custbody_besp_price_list_v', 2);
			break;
		case '2010':
			recTran.setFieldValue('custbody_besp_price_list_v', 3);
			break;
		case '2011':
			recTran.setFieldValue('custbody_besp_price_list_v', 4);
			break;
		case '2012':
			if (tranHalf == 1) {
				if (isBlank(partner)) {
					recTran.setFieldValue('custbody_besp_price_list_v', 12);
				}
				else {
					recTran.setFieldValue('custbody_besp_price_list_v', 9);
				}
			}
			else {
				if (isBlank(partner)) {
					recTran.setFieldValue('custbody_besp_price_list_v', 13);
				}
				else {
					recTran.setFieldValue('custbody_besp_price_list_v', 14);
				}
			}
			break;
		case '2013':
			if (tranHalf == 1) {
				if (isBlank(partner)) {
					recTran.setFieldValue('custbody_besp_price_list_v', 15);
				}
				else {
					recTran.setFieldValue('custbody_besp_price_list_v', 10);
				}
			}
			else {
				if (isBlank(partner)) {
					recTran.setFieldValue('custbody_besp_price_list_v', 16);
				}
				else {
					recTran.setFieldValue('custbody_besp_price_list_v', 17);
				}
			}
			break;
		case '2014':
			if (tranHalf == 1) {
				if (isBlank(partner)) {
					recTran.setFieldValue('custbody_besp_price_list_v', 7);
				}
				else {
					recTran.setFieldValue('custbody_besp_price_list_v', 18);
				}
			}
			else {
				if (isBlank(partner)) {
					recTran.setFieldValue('custbody_besp_price_list_v', 20);
				}
				else {
					recTran.setFieldValue('custbody_besp_price_list_v', 21);
				}
			}
			break;
		case '2015':
			recTran.setFieldValue('custbody_besp_price_list_v', 8);
			break;
		case '2016':
			recTran.setFieldValue('custbody_besp_price_list_v', 11);
			break;
		case '2017':
			recTran.setFieldValue('custbody_besp_price_list_v', 24);
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
		
		if (revRecSkuCategory == 8){
			revRecSkuCategory = 4; //SAAS
			if (amount != null && amount != '' && parseFloat(amount) > 0){
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
			recTran.setLineItemValue('item', 'custcolr7startdate', i, revRecStartDate);
			recTran.setLineItemValue('item', 'custcolr7enddate', i, revRecEndDate);
			
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
	
	/*
	var loneCatOrder = false;
	arrAllSkuCats = unique(arrAllSkuCats);
	if (arrAllSkuCats != null && arrAllSkuCats.length <= 1){
		var loneCat = arrAllSkuCats[0];
		if (loneCat == 1 || loneCat == 2 || loneCat == 3 || loneCat == 5) {
			loneCatOrder = true;
		}
	}
	*/
		
	var isHistoric = false;
	if (nlapiStringToDate(tranDate) < nlapiStringToDate('1/1/2011')) {
		isHistoric = true;
	}
	var objDateLines = getTransactionHistoricalGroupDetail(recTran.getId());
	var objCustomESPLines = getTransactionCustomESPs(recTran.getId());
	var objLineDetailsFromSearch = getLinesFromTran(recTran.getId());
	
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
		
		var isCustomESP = getItemProperties(itemId, 'custitem_custom_esp');
		var isCustomESPList = getItemProperties(itemId, 'custitemr7customespproratedlist');
		
		
		// DATE STUFF
		
		//SKU CATEGORY STUFF
		var revRecSkuCategory = parseInt(getItemProperties(itemId, 'custitemr7revrecskucategory'));
		if (revRecSkuCategory == 8){
			revRecSkuCategory = 4; //SAAS
			if (amount != null && amount != '' && parseFloat(amount) > 0){
				revRecSkuCategory = 6; //Ratable
			}
		}
		
		if (revRecSkuCategory > 0) {
			recTran.setLineItemValue('item', 'vsoepermitdiscount', i, null);
			recTran.setLineItemValue('item', 'vsoeprice', i, '');
			recTran.setLineItemValue('item', 'revrecschedule', i, 5); //Month by Exact Days
		}
		
		switch (revRecSkuCategory) {
			case 1: //Hardware
				if (isHistoric) {
					recTran.setLineItemValue('item', 'revrecstartdate', i, maxRatableStart);
					recTran.setLineItemValue('item', 'revrecenddate', i, maxRatableEnd);
				}
				else {
					//set immediate?
					recTran.setLineItemValue('item', 'revrecschedule', i, 4); //Immediate Recognition upon Delivery
					if (objDateLines.hasOwnProperty(lineId)) {
						recTran.setLineItemValue('item', 'revrecstartdate', i, objDateLines[lineId].start);
						recTran.setLineItemValue('item', 'revrecenddate', i, objDateLines[lineId].end);
					}
					else {
						recTran.setLineItemValue('item', 'revrecstartdate', i, licenseStart);
						recTran.setLineItemValue('item', 'revrecenddate', i, licenseEnd);
					}
				}
				break;
			case 2: //Voucher (On Demand)
				recTran.setLineItemValue('item', 'revrecschedule', i, 4); //Immediate Recognition upon Delivery
				if (objDateLines.hasOwnProperty(lineId)) {
					recTran.setLineItemValue('item', 'revrecstartdate', i, objDateLines[lineId].start);
					recTran.setLineItemValue('item', 'revrecenddate', i, objDateLines[lineId].end);
				}
				else 
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
					recTran.setLineItemValue('item', 'revrecschedule', i, 4); //Immediate Recognition upon Delivery
					if (objDateLines.hasOwnProperty(lineId)) {
						recTran.setLineItemValue('item', 'revrecstartdate', i, objDateLines[lineId].start);
						recTran.setLineItemValue('item', 'revrecenddate', i, objDateLines[lineId].end);
					}
					else {
						recTran.setLineItemValue('item', 'revrecstartdate', i, licenseStart);
						recTran.setLineItemValue('item', 'revrecenddate', i, licenseEnd);
					}
				}
				break;
			case 8: //Ratable EVAL
			case 6: //Ratable
				recTran.setLineItemValue('item', 'revrecstartdate', i, maxRatableStart);
				recTran.setLineItemValue('item', 'revrecenddate', i, maxRatableEnd);
				break;
			case 7: //Travel
				recTran.setLineItemValue('item', 'revrecschedule', i, 4); //Immediate Recognition upon Delivery
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
		
		/*
		if (loneCatOrder) { //dont process anything mmore than dates
			continue;
		}
		*/
		
		//END DATE STUFF

		recTran.setLineItemValue('item', 'custcol_custom_esp', i, '');
		
		var quantity = parseFloat(recTran.getLineItemValue('item', 'quantity', i) || 1);
		
		if (objCustomESPLines.hasOwnProperty(lineId) && objCustomESPLines[lineId].item == itemId && !isBlank(objCustomESPLines[lineId].esp)) {
			recTran.setLineItemValue('item', 'custcol_custom_esp', i, Math.round((parseFloat(objCustomESPLines[lineId].esp) / quantity) * 100) / 100);
		}
		else 
			if (isCustomESPList == 'T') {
				var listAmount = objLineDetailsFromSearch[lineId].netamount;
				
				var customESPAmount = 0;
				if (listAmount != null && listAmount != '') {
					customESPAmount = Math.round((parseFloat(listAmount) / quantity) * 100) / 100;
				}
				
				recTran.setLineItemValue('item', 'custcol_custom_esp', i, Math.abs(customESPAmount));
			}
			else 
				if (isCustomESP == 'T') {
					var quantity = parseFloat(recTran.getLineItemValue('item', 'quantity', i) || 1);
					var vsoeAllocation = recTran.getLineItemValue('item', 'vsoeallocation', i);
					
					var customESPAmount = 0;
					if (vsoeAllocation != null && vsoeAllocation != '') {
						customESPAmount = Math.round((parseFloat(vsoeAllocation) / quantity) * 100) / 100;
					}
					recTran.setLineItemValue('item', 'custcol_custom_esp', i, Math.abs(customESPAmount));
				}
		
		var item_Category_R = parseInt(getItemProperties(itemId, 'custitem_item_category'));
		if (!isHistoric) { //2011 and later
			switch (item_Category_R) {
				case 1: //License - Perpetual
					recTran.setLineItemValue('item', 'vsoesopgroup', i, 'SOFTWARE');
					recTran.setLineItemValue('item', 'vsoeisestimate', i, 'T');
					recTran.setLineItemValue('item', 'vsoedelivered', i, 'T');
					break;
				case 2: //License - Term
					recTran.setLineItemValue('item', 'vsoesopgroup', i, 'SOFTWARE');
					recTran.setLineItemValue('item', 'vsoeisestimate', i, 'F');
					recTran.setLineItemValue('item', 'vsoedelivered', i, 'F');
					break;
				case 3: //Maintenance - New
				case 4: //Maintenance - Renewal
				case 5: //Support - New
				case 6: //Support - Renewal
					recTran.setLineItemValue('item', 'vsoesopgroup', i, 'SOFTWARE');
					recTran.setLineItemValue('item', 'vsoeisestimate', i, 'F');
					recTran.setLineItemValue('item', 'vsoedelivered', i, 'F');
					break;
				case 7: //Services
				case 8: //Training
				case 9: //Other
					recTran.setLineItemValue('item', 'vsoesopgroup', i, 'SOFTWARE');
					recTran.setLineItemValue('item', 'vsoeisestimate', i, 'F');
					recTran.setLineItemValue('item', 'vsoedelivered', i, 'F');
					break;
				case 10: //Parent Item
					break;
				case 11: //Hardware
					recTran.setLineItemValue('item', 'vsoesopgroup', i, 'NORMAL');
					recTran.setLineItemValue('item', 'vsoeisestimate', i, 'T');
					recTran.setLineItemValue('item', 'vsoedelivered', i, 'T');
					break;
			}
		}
		else { //2010 and earlier
			switch (item_Category_R) {
				case 1: //License - Perpetual
					recTran.setLineItemValue('item', 'vsoesopgroup', i, 'SOFTWARE');
					recTran.setLineItemValue('item', 'vsoeisestimate', i, 'T');
					recTran.setLineItemValue('item', 'vsoedelivered', i, 'T');
					break;
				case 2: //License - Term
					recTran.setLineItemValue('item', 'vsoesopgroup', i, 'SOFTWARE');
					recTran.setLineItemValue('item', 'vsoeisestimate', i, 'F');
					recTran.setLineItemValue('item', 'vsoedelivered', i, 'F');
					break;
				case 3: //Maintenance - New
				case 4: //Maintenance - Renewal
				case 5: //Support - New
				case 6: //Support - Renewal
					recTran.setLineItemValue('item', 'vsoesopgroup', i, 'SOFTWARE');
					recTran.setLineItemValue('item', 'vsoeisestimate', i, 'F');
					recTran.setLineItemValue('item', 'vsoedelivered', i, 'F');
					break;
				case 7: //Services
				case 8: //Training
				case 9: //Other
					recTran.setLineItemValue('item', 'vsoesopgroup', i, 'SOFTWARE');
					recTran.setLineItemValue('item', 'vsoeisestimate', i, 'F');
					recTran.setLineItemValue('item', 'vsoedelivered', i, 'F');
					break;
				case 10: //Parent Item
					break;
				case 11: //Hardware
					recTran.setLineItemValue('item', 'vsoesopgroup', i, 'SOFTWARE');
					recTran.setLineItemValue('item', 'vsoeisestimate', i, 'F');
					recTran.setLineItemValue('item', 'vsoedelivered', i, 'F');
					break;
			}
		}
		
		if (item_Category_R == 9) {//Other
			if (objNormals.hasOwnProperty(itemId)) {
				recTran.setLineItemValue('item', 'vsoesopgroup', i, 'NORMAL');
			}
			else {
				recTran.setLineItemValue('item', 'vsoesopgroup', i, 'EXCLUDE');
			}
		}
		
	}
	
	if (minStart == '' || minStart == null) {
		minStart = strToday;
	}
	if (maxEnd == '' || maxEnd == null) {
		maxEnd = minStart;
	}
	recTran.setFieldValue('startdate', minStart);
	recTran.setFieldValue('enddate', maxEnd);
	
	/*
	if (loneCatOrder) {
		recTran.setFieldValue('custbodyr7ratablerevenuerestatementsta', 12); //Final
		recTran.setFieldValue('custbodyr7ratabledateprocessed', nlapiDateToString(new Date(), 'datetimetz')); //E81 Complete
		return new Array(recTran, true);
	}
	*/
	
	//setfields
	recTran.setFieldValue('tranisvsoebundle', 'T');
	recTran.setFieldValue('custbody_eitf81_ise81bundle', 'T');
	recTran.setFieldValue('iseitf81on','T'); //explicitly set
	recTran.setFieldValue('vsoeautocalc', 'T');
	recTran.setFieldValue('custbodyr7ratablerevenuerestatementsta', 9); //E81 Complete
	
	return new Array(recTran, false);
}

function processFFT(recTran){
	
	recTran.setFieldValue('custbody_eitf81_ise81bundle', 'F');
	recTran.setFieldValue('vsoeautocalc', 'F');
	//recTran.setFieldValue('tranisvsoebundle', 'F');
	
	//discount in header not allowed, restoring
	var discountMoved = recTran.getFieldValue('custbodyr7headerdiscmovedtoline');
	
	var lineItemCount = recTran.getLineItemCount('item');
	
	var objHistoricalRevPosting = getTransactionRevSchedules(recTran.getId());
	
	var tranDate = recTran.getFieldValue('trandate');
	var isHistoric = false;
	if (nlapiStringToDate(tranDate) < nlapiStringToDate('1/1/2011')) {
		isHistoric = true;
	}
	
	var lineItemCount = recTran.getLineItemCount('item');
	
	var multiElement = false;
	for (var i = 1; i <= lineItemCount; i++) {
		var itemId = recTran.getLineItemValue('item', 'item', i);
		var amount = recTran.getLineItemValue('item', 'amount', i);
		var revRecSkuCategory = parseInt(getItemProperties(itemId, 'custitemr7revrecskucategory'));
		
		if (revRecSkuCategory == 8){
			revRecSkuCategory = 4; //SAAS
			if (amount != null && amount != '' && parseFloat(amount) > 0){
				revRecSkuCategory = 6; //Ratable
			}
		}
		
		if (revRecSkuCategory == 6) { //Ratable
			multiElement = true;
			break;
		}
	}
	
	for (var i = 1; i <= lineItemCount; i++) {
	
		var itemId = recTran.getLineItemValue('item', 'item', i);
		var line = recTran.getLineItemValue('item', 'line', i);
		
		var item_Category_R = parseInt(getItemProperties(itemId, 'custitem_item_category'));
		if (!isHistoric) { //2011 and later
			switch (item_Category_R) {
				case 1: //License - Perpetual
					break;
				case 2: //License - Term
					recTran.setLineItemValue('item', 'vsoedelivered', i, 'T');
					break;
				case 3: //Maintenance - New
				case 4: //Maintenance - Renewal
				case 5: //Support - New
				case 6: //Support - Renewal
					recTran.setLineItemValue('item', 'vsoedelivered', i, 'T');
					break;
				case 7: //Services
				case 8: //Training
					if (multiElement){
						recTran.setLineItemValue('item', 'vsoedelivered', i, 'T');
					}
					break;
				case 9: //Other
					recTran.setLineItemValue('item', 'vsoedelivered', i, 'T');
					break;
				case 10: //Parent Item
					break;
				case 11: //Hardware
					//recTran.setLineItemValue('item', 'vsoedelivered', i, 'F');  
					break;
			}
		}
		else { //2010 and earlier
			switch (item_Category_R) {
				case 1: //License - Perpetual
					break;
				case 2: //License - Term
					recTran.setLineItemValue('item', 'vsoedelivered', i, 'T');
					break;
				case 3: //Maintenance - New
				case 4: //Maintenance - Renewal
				case 5: //Support - New
				case 6: //Support - Renewal
					recTran.setLineItemValue('item', 'vsoedelivered', i, 'T');
					break;
				case 7: //Services
				case 8: //Training
					if (multiElement){
						recTran.setLineItemValue('item', 'vsoedelivered', i, 'T');
					}
					break;
				case 9: //Other
					recTran.setLineItemValue('item', 'vsoedelivered', i, 'T');
					break;
				case 10: //Parent Item
					break;
				case 11: //Hardware
					break;
			}
		}
		
		if (objHistoricalRevPosting.hasOwnProperty(line)) {
			recTran.setLineItemValue('item', 'vsoedelivered', i, 'T');
		}
	}
	return recTran;
}

function updateRevRecSchedules(recType, tranId){

	var objHistoricalRevPosting = getTransactionRevSchedules(tranId);
	var objAccountingPeriods = getAccountPeriodIds();
	
	var recTran = nlapiLoadRecord(recType, tranId);
	recTran = setLocations(recTran);
	var lineItemCount = recTran.getLineItemCount('item');
	
	var multiElement = false;
	for (var i = 1; i <= lineItemCount; i++) {
		var itemId = recTran.getLineItemValue('item', 'item', i);
		var amount = recTran.getLineItemValue('item', 'amount', i);
		var revRecSkuCategory = parseInt(getItemProperties(itemId, 'custitemr7revrecskucategory'));
		
		if (revRecSkuCategory == 8){
			revRecSkuCategory = 4; //SAAS
			if (amount != null && amount != '' && parseFloat(amount) > 0){
				revRecSkuCategory = 6; //Ratable
			}
		}
		
		if (revRecSkuCategory == 6) { //Ratable
			multiElement = true;
			break;
		}
	}
	
	for (var i = 1; i <= lineItemCount; i++) {
		var revRecSched = recTran.getLineItemValue('item', 'oldrevrecschedule', i);
		var itemId = recTran.getLineItemValue('item', 'item', i);
		var line = recTran.getLineItemValue('item', 'line', i);
		var revRecSkuCategory = parseInt(getItemProperties(itemId, 'custitemr7revrecskucategory'));
		
		if (revRecSkuCategory == 8){
			revRecSkuCategory = 4; //SAAS
			if (amount != null && amount != '' && parseFloat(amount) > 0){
				revRecSkuCategory = 6; //Ratable
			}
		}
		
		if (revRecSkuCategory == 5 && multiElement){
			continue;
		}
	
		if (objHistoricalRevPosting.hasOwnProperty(line)) {
			
			if (isBlank(revRecSched)){
				continue;
			}
			
			try {
				var recSched = nlapiLoadRecord('revrecschedule', revRecSched, {
					recordmode: 'dynamic'
				});
			}
			catch (er2){
				continue;
			}
			
			var revTemplate = recSched.getFieldValue('parentSched'); //  5 == Month by Exact Days
			
			if (revTemplate == 5){
				continue;
			}
			
			while (recSched.getLineItemCount('recurrence') >= 1) {
				recSched.removeLineItem('recurrence', '1');
			}
			
			nlapiLogExecution('DEBUG', 'Updating revrec schedule', revRecSched);
			var schedTotal = parseFloat(recSched.getFieldValue('totalamount'));
			var remainingBalance = schedTotal;
			nlapiLogExecution('DEBUG', 'schedTotal', schedTotal);
			var arrLines = objHistoricalRevPosting[line];
			var logTxt = '';
			logTxt += 'postingperiod,incomeaccount,recamount';
				
			for (var j = 0; arrLines != null && j < arrLines.length; j++) {
				var objLine = arrLines[j];

				var weightedAmount = Math.round(schedTotal * objLine.weight * 100) / 100;
				remainingBalance = remainingBalance - weightedAmount;
				
				if (j == (arrLines.length - 1) && Math.abs(remainingBalance) <= .02 && Math.abs(remainingBalance) >= .01) {
					weightedAmount = weightedAmount + (Math.round(remainingBalance * 100) / 100);
				}

				recSched.selectNewLineItem('recurrence');
				recSched.setCurrentLineItemValue('recurrence', 'postingperiod', objAccountingPeriods[objLine.period]);
				recSched.setCurrentLineItemValue('recurrence', 'incomeaccount', objLine.account);
				recSched.setCurrentLineItemValue('recurrence', 'recamount', weightedAmount);
				recSched.commitLineItem('recurrence');
				
				logTxt += '\n';
				logTxt += objAccountingPeriods[objLine.period] + ',' + objLine.account + ',' + weightedAmount;
				
				nlapiLogExecution('DEBUG', 'amount', weightedAmount);
			}
			var adminUser =  nlapiLoadConfiguration('companypreferences').getFieldValue('custscriptr7_system_info_email_sender');
			if (nlapiGetUser() == adminUser) {
				nlapiSendEmail(adminUser, adminUser, 'logs', 'Lines: ' + recSched.getLineItemCount('recurrence') + '\n\n' + logTxt);
			}
			nlapiLogExecution('AUDIT', 'logTxt', logTxt);
			nlapiLogExecution('AUDIT', 'total lines before save', recSched.getLineItemCount('recurrence'));
			nlapiSubmitRecord(recSched);
		}
	}
}

function pushDataFromInvoiceToOrder(recType, invoiceId){

	if (isBlank(invoiceId)) {
		return;
	}
	
	var arrLineFieldsToPush = new Array();
	arrLineFieldsToPush.push('revrecstartdate');
	arrLineFieldsToPush.push('revrecenddate');
	arrLineFieldsToPush.push('vsoeallocation');
	
	var arrFieldsToPush = new Array();
	arrFieldsToPush.push('custbodyr7tempratablecheckbox');
	
	if (recType != 'cashsale' && recType != 'invoice'){
		return;
	}
	var recInvoice = nlapiLoadRecord(recType, invoiceId);
	recInvoice = setLocations(recInvoice);
	var createdFromId = recInvoice.getFieldValue('createdfrom');
	if (isBlank(createdFromId)) {
		return;
	}
	var recCreatedFromOrder = nlapiLoadRecord('salesorder', createdFromId);
	var orderLineCount = recInvoice.getLineItemCount('item');
	
	var invLineCount = recInvoice.getLineItemCount('item');
	for (var i = 1; i <= invLineCount; i++) {
		var orderDoc = recInvoice.getLineItemValue('item', 'orderdoc', i);
		var orderLine = recInvoice.getLineItemValue('item', 'orderline', i);
		
		if (orderDoc != createdFromId || isBlank(orderLine)) {
			continue;
		}
		
		for (var k = 1; k <= orderLineCount; k++) {
			var c_line = recCreatedFromOrder.getLineItemValue('item', 'line', k);
			
			if (orderLine == c_line) {
			
				for (var j = 0; arrLineFieldsToPush != null && j < arrLineFieldsToPush.length; j++) {
					recCreatedFromOrder.setLineItemValue('item', arrLineFieldsToPush[j], k, recInvoice.getLineItemValue('item', arrLineFieldsToPush[j], k));
				}
				break;
			}
		}
	}
	
	for (var j = 0; arrFieldsToPush != null && j < arrFieldsToPush.length; j++) {
		recCreatedFromOrder.setFieldValue(arrLineFieldsToPush[j], recInvoice.getFieldValue(arrLineFieldsToPush[j]));
	}
	
	recCreatedFromOrder = setLocations(recCreatedFromOrder);
	nlapiSubmitRecord(recCreatedFromOrder, true, true);
	return;
}

function getLinesFromTran(tranId){
	
	var objAllLines = new Object();
	
	if (tranId == null || tranId == '') {
		return objAllLines;
	}
	
	var arrFilters = new Array();
	arrFilters[arrFilters.length] = new nlobjSearchFilter('internalid', null, 'is', tranId);
	arrFilters[arrFilters.length] = new nlobjSearchFilter('mainline', null, 'is', 'F');
	
	var arrColumns = new Array();
	arrColumns[0] = new nlobjSearchColumn('internalid');
	arrColumns[1] = new nlobjSearchColumn('line');
	arrColumns[2] = new nlobjSearchColumn('netamount');
	arrColumns[3] = new nlobjSearchColumn('custcol_custom_esp');
	arrColumns[4] = new nlobjSearchColumn('revrecstartdate');
	arrColumns[5] = new nlobjSearchColumn('revrecenddate');
	
	var savedsearch = nlapiCreateSearch('transaction', arrFilters, arrColumns);
	var resultSet = savedsearch.runSearch();
	
	resultSet.forEachResult(function(searchResult){
		var objLine = new Object();
		objLine.id = searchResult.getValue(arrColumns[1]);
		objLine.netamount = searchResult.getValue(arrColumns[2]);
		objLine.customesp = searchResult.getValue(arrColumns[3]);
		objLine.revrecstart = searchResult.getValue(arrColumns[4]);
		objLine.revrecend = searchResult.getValue(arrColumns[5]);
		
		objAllLines[objLine.id] = objLine; // process the search result
		return true; // return true to keep iterating
	});
	
	return objAllLines;
}

function getTransactionHistoricalGroupDetail(tranId){
	
	var objLines = new Object();
	
	if (tranId == null || tranId == ''){
		return objLines;
	}
	
	var arrFilters = new Array();
	arrFilters[0] = new nlobjSearchFilter('isinactive', null, 'is', 'F');
	arrFilters[1] = new nlobjSearchFilter('custrecordr7ratablerevenuesourcetrans', null, 'anyof', tranId);
	
	var arrColumns = new Array();
	arrColumns[0] = new nlobjSearchColumn('custrecordr7ratablerevenuelineid', null, 'group');
	arrColumns[1] = new nlobjSearchColumn('formuladate', null , 'min');
	arrColumns[1].setFormula("LAST_DAY(TO_DATE(DECODE({custrecordr7ratablerevenueperiod}, 'Posting Period:' , '12/31/2025',  CASE SUBSTR({custrecordr7ratablerevenueperiod}, 17,3) WHEN 'Jan' THEN '01' WHEN 'Feb' THEN '02' WHEN 'Mar' THEN '03' WHEN 'Apr' THEN '04' WHEN 'May' THEN '05' WHEN 'Jun' THEN '06' WHEN 'Jul' THEN '07' WHEN 'Aug' THEN '08' WHEN 'Sep' THEN '09' WHEN 'Oct' THEN '10' WHEN 'Nov' THEN '11' WHEN 'Dec' THEN '12' END || '/' || '01' || '/' || SUBSTR({custrecordr7ratablerevenueperiod}, 21)), 'MM/DD/YYYY'))");
	arrColumns[2] = new nlobjSearchColumn('formuladate', null , 'max');
	arrColumns[2].setFormula("LAST_DAY(TO_DATE(DECODE({custrecordr7ratablerevenueperiod}, 'Posting Period:' , '12/31/2025',  CASE SUBSTR({custrecordr7ratablerevenueperiod}, 17,3) WHEN 'Jan' THEN '01' WHEN 'Feb' THEN '02' WHEN 'Mar' THEN '03' WHEN 'Apr' THEN '04' WHEN 'May' THEN '05' WHEN 'Jun' THEN '06' WHEN 'Jul' THEN '07' WHEN 'Aug' THEN '08' WHEN 'Sep' THEN '09' WHEN 'Oct' THEN '10' WHEN 'Nov' THEN '11' WHEN 'Dec' THEN '12' END || '/' || '01' || '/' || SUBSTR({custrecordr7ratablerevenueperiod}, 21)), 'MM/DD/YYYY'))");
	arrColumns[3] = new nlobjSearchColumn('custrecordr7ratablerevenueamount', null , 'sum');
	
	var newSearch = nlapiCreateSearch('customrecordr7ratablerevhistorical', arrFilters, arrColumns);
	newSearch.setFilters(arrFilters);
	var resultSet = newSearch.runSearch();
	
	var rowNum = 0;
	do {
		var resultSlice = resultSet.getResults(rowNum, rowNum + 1000);
		for (var rs in resultSlice) {
			var columns = resultSlice[rs].getAllColumns();
			var lineId = resultSlice[rs].getValue(columns[0]);
			var strStartDate = resultSlice[rs].getValue(columns[1]);
			var strEndDate = resultSlice[rs].getValue(columns[2]);
			var lineTotalAmt = resultSlice[rs].getValue(columns[3]);
			
			var objLine = new Object();

			objLine.start = strStartDate;
			objLine.end = strEndDate;
			objLine.total = lineTotalAmt;
			
			objLines[lineId] = objLine;
			rowNum++;
		}
	}
	while (resultSlice.length >= 1000);
	
	return objLines;
}

function getTransactionRevSchedules(tranId){
	
	var objGroupLines = getTransactionHistoricalGroupDetail(tranId);
	var objLines = new Object();
	
	if (tranId == null || tranId == '') {
		return objLines;
	}
	
	var arrFilters = new Array();
	arrFilters[0] = new nlobjSearchFilter('isinactive', null, 'is', 'F');
	arrFilters[1] = new nlobjSearchFilter('custrecordr7ratablerevenuesourcetrans', null, 'anyof', tranId);
	
	var arrColumns = new Array();
	arrColumns[0] = new nlobjSearchColumn('formulatext');
	arrColumns[0].setFormula("DECODE({custrecordr7ratablerevenueperiod}, 'Posting Period:' , 'Dec 2025', SUBSTR({custrecordr7ratablerevenueperiod}, 17,8))");
	arrColumns[1] = new nlobjSearchColumn('custrecordr7ratablerevenueamount');
	arrColumns[2] = new nlobjSearchColumn('custrecordr7ratablerevenuelineid');
	arrColumns[3] = new nlobjSearchColumn('custrecordr7ratablerevenuedestinationacc');
	
	var newSearch = nlapiCreateSearch('customrecordr7ratablerevhistorical', arrFilters, arrColumns);
	var resultSet = newSearch.runSearch();
	
	var rowNum = 0;
	do {
		var resultSlice = resultSet.getResults(rowNum, rowNum + 1000);
		for (var rs in resultSlice) {
			var objLine = new Object();
			
			objLine.id = resultSlice[rs].getValue(arrColumns[2]);
			objLine.amount = resultSlice[rs].getValue(arrColumns[1]);
			objLine.period = resultSlice[rs].getValue(arrColumns[0]);
			objLine.account = resultSlice[rs].getValue(arrColumns[3]);
			
			var lineTotal = objGroupLines[objLine.id].total;
			objLine.weight = (lineTotal == 0) ? 1 : parseFloat(objLine.amount)/parseFloat(lineTotal);
			
			if (objLines.hasOwnProperty(objLine.id)) {
				var arrExisting = objLines[objLine.id];
				arrExisting[arrExisting.length] = objLine;
				objLines[objLine.id] = arrExisting;
			}
			else {
				objLines[objLine.id] = new Array(objLine);
			}
			rowNum++;
		}
	}
	while (resultSlice.length >= 1000);
	
	return objLines;
}

function getAccountPeriodIds(){

	var objAccountingPeriods = new Object();
	
	var arrFilters = new Array();
	arrFilters[0] = new nlobjSearchFilter('isinactive', null, 'is', 'F');
	
	var arrColumns = new Array();
	arrColumns[0] = new nlobjSearchColumn('internalid');
	arrColumns[1] = new nlobjSearchColumn('periodname');
	
	var newSearch = nlapiCreateSearch('accountingperiod', arrFilters, arrColumns);
	var resultSet = newSearch.runSearch();
	
	var rowNum = 0;
	do {
		var resultSlice = resultSet.getResults(rowNum, rowNum + 1000);
		for (var rs in resultSlice) {

			objAccountingPeriods[resultSlice[rs].getValue(arrColumns[1])] = resultSlice[rs].getValue(arrColumns[0]);
			
			rowNum++;
		}
	}
	while (resultSlice.length >= 1000);
	
	return objAccountingPeriods;
}

function getTransactionCustomESPs(tranId){
	
	var objLines = new Object();
	
	if (tranId == null || tranId == ''){
		return objLines;
	}
	
	var arrFilters = new Array();
	arrFilters[0] = new nlobjSearchFilter('isinactive', null, 'is', 'F');
	arrFilters[1] = new nlobjSearchFilter('custrecordr7ratrevhislinetransaction', null, 'anyof', tranId);
	
	var newSearch = nlapiLoadSearch('customrecordr7ratrevhiscusesp', 16007); //16007 in production
	newSearch.setFilters(arrFilters);
	var resultSet = newSearch.runSearch();
	
	var rowNum = 0;
	do {
		var resultSlice = resultSet.getResults(rowNum, rowNum + 1000);
		for (var rs in resultSlice) {
			var columns = resultSlice[rs].getAllColumns();
			var lineId = resultSlice[rs].getValue(columns[2]);
			var itemId = resultSlice[rs].getValue(columns[3]);
			var customESP = resultSlice[rs].getValue(columns[4]);
			
			var objLine = new Object();
			
			if (isBlank(customESP) || isBlank(lineId) || isBlank(itemId)){
				continue;
			}
			
			objLine.id = lineId;
			objLine.item = itemId;
			objLine.esp = customESP;
			
			objLines[lineId] = objLine;
			rowNum++;
		}
	}
	while (resultSlice.length >= 1000);
	
	return objLines;
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
			record.setLineItemValue('item', 'location', i, headerLocation);
		}
	}
	
	return record;
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