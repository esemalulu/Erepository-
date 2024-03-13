/*
 * @author efagone
 */


var objItemDetailMap = null;
var objCategoryPurchasedDetailMap = null;

function setTotalDiscount(record){

	var recordId = record.getId();
	
	var dateCreated = new Date();
	if (recordId != '' && recordId != null) {
		dateCreated = nlapiStringToDate(nlapiLookupField('transaction', recordId, 'datecreated'));
	}

	var dateLegacy = nlapiStringToDate('7/1/2011'); //was told to not find total discount for anything before this date
	
	if (dateCreated > dateLegacy) {
		var lineDiscountTotal = 0;
		var transactionTotal = 0;
		var numberOfItems = record.getLineItemCount('item');
		
		if (numberOfItems != null) {
			for (var i = 1; i <= numberOfItems; i++) {
			
				var itemType = record.getLineItemValue('item', 'itemtype', i);
				
				var createdFromRA = record.getLineItemValue('item', 'custcolr7createdfromra', i);
				var lineAmount = formatNumber(record.getLineItemValue('item', 'amount', i));
				nlapiLogExecution('DEBUG', itemType + ': lineAmount', i + ': ' + lineAmount);
				if (lineAmount != null && !isNaN(lineAmount) && itemType != 'Subtotal' && itemType != 'group' && itemType != 'Group' && itemType != 'EndGroup') {
				
					if (lineAmount < 0 && (createdFromRA == null || createdFromRA == '')) {
						lineDiscountTotal = lineDiscountTotal + lineAmount;
					}
					else {
						transactionTotal = transactionTotal + lineAmount;
					}
				}
			}
		}
		
		var headerDiscount = formatNumber(record.getFieldValue('discounttotal'));
		nlapiLogExecution('DEBUG', 'headerDiscount', headerDiscount);
		var discountTotal = lineDiscountTotal + headerDiscount;
		nlapiLogExecution('DEBUG', 'discountTotal', discountTotal);
		var discountRate = (discountTotal / transactionTotal) * -100;
		if (transactionTotal == 0) {
			if (discountTotal > 0) {
				discountRate = 100;
			}
			else {
				discountRate = 0;
			}
		}

		discountRate = Math.round(discountRate * 10) / 10;
		
		nlapiLogExecution('DEBUG', 'discount rate', discountRate);
		
		record.setFieldValue('custbodyr7transactiondiscounttotal', discountRate);
	}
	else {
		record.setFieldValue('custbodyr7transactiondiscounttotal', 0);
	}
	
}

function zc_stampCategoryPurchased(oldRecord, record){

	try {
		
		var UPDATE_DATES_ALWAYS = true; //TODO uncheck this
		var processbeginTime = new Date();
		var objItemDetails = grabItemDetailMap();
		var objCategoryPurchasedMap = grabCategoryPurchasedDetailMap();

		//FIRST SET ANY CATEGORIES THAT NEED TO BE SET		
		var lineCount = record.getLineItemCount('item');
		for (var i = 1; i <= lineCount; i++) {
		
			var itemId = record.getLineItemValue('item', 'item', i);
			var itemType = record.getLineItemValue('item', 'itemtype', i);

			if (!isBlank(itemId) && !isBlank(itemType)) {
			
				if (['Subtotal', 'Discount', 'Description', 'EndGroup'].indexOf(itemType) == -1) {
	
					var categoryPurchased = record.getLineItemValue('item', 'custcolr7_category_purchased', i);
					var categoryExpiration = record.getLineItemValue('item', 'custcolr7_category_purchased_expire', i);
					var categoryLock = record.getLineItemValue('item', 'custcolr7_category_purchased_lock', i);
					
					var lockUpdated =  oldRecord.getLineItemValue('item', 'custcolr7_category_purchased_lock', i) != record.getLineItemValue('item', 'custcolr7_category_purchased_lock', i);
					var categoryUpdated = oldRecord.getLineItemValue('item', 'custcolr7_category_purchased', i) != record.getLineItemValue('item', 'custcolr7_category_purchased', i);
					
					if (!categoryPurchased && categoryLock == 'T') {
						//cannot lock if no category
						//record.setLineItemValue('item', 'custcolr7_category_purchased_lock', i, 'F');
						//categoryLock = 'F';
						//lockUpdated = true;
					}
					
					if (!categoryPurchased && objItemDetails.hasOwnProperty(itemId) && objItemDetails[itemId].custitemr7categorypurchaseditem) {
						//set category if null
						record.setLineItemValue('item', 'custcolr7_category_purchased', i, objItemDetails[itemId].custitemr7categorypurchaseditem);
						categoryPurchased = objItemDetails[itemId].custitemr7categorypurchaseditem;
						categoryUpdated = true;
					}
					
					if (categoryLock == 'T') {
						//leave it alone
						continue;
					}
					
					if (categoryPurchased && objCategoryPurchasedMap.hasOwnProperty(categoryPurchased)) {

						var daysTillExpire = parseInt(objCategoryPurchasedMap[categoryPurchased].custrecordr7catpurch_daystillexpire || 0);

						switch (objCategoryPurchasedMap[categoryPurchased].custrecordr7catpurch_expirationfield) {
							case '1':
								//Date Internal Reporting
								var oldDateInternalReporting = oldRecord.getFieldValue('custbodyr7dateinternalreporting') || oldRecord.getFieldValue('trandate');
								var dateInternalReporting = record.getFieldValue('custbodyr7dateinternalreporting') || record.getFieldValue('trandate');
								if (dateInternalReporting && (!categoryExpiration || categoryUpdated || lockUpdated || UPDATE_DATES_ALWAYS || oldDateInternalReporting != dateInternalReporting)) {
									record.setLineItemValue('item', 'custcolr7_category_purchased_expire', i, nlapiDateToString(nlapiAddDays(nlapiStringToDate(dateInternalReporting), daysTillExpire)));
								}
								break;
							case '2':
								//License End Date
								var oldLicenseEndDate = oldRecord.getLineItemValue('item', 'custcolr7enddate', i) || oldRecord.getLineItemValue('item', 'revrecenddate', i) || oldRecord.getFieldValue('trandate');
								var licenseEndDate = record.getLineItemValue('item', 'custcolr7enddate', i) || record.getLineItemValue('item', 'revrecenddate', i) || record.getFieldValue('trandate');
								if (licenseEndDate && (!categoryExpiration || categoryUpdated || lockUpdated || UPDATE_DATES_ALWAYS || oldLicenseEndDate != licenseEndDate)) {
									record.setLineItemValue('item', 'custcolr7_category_purchased_expire', i, nlapiDateToString(nlapiAddDays(nlapiStringToDate(licenseEndDate), daysTillExpire)));
								}
								break;
						}
						
					}
				}
			}
			
		}
		
		//NOW GRAB CATEGORY PURCHASED ROLLUP
		var arrCategoryPurchased = [];
		
		var lineCount = record.getLineItemCount('item');
		for (var i = 1; i <= lineCount; i++) {
			var categoryPurchased = record.getLineItemValue('item', 'custcolr7_category_purchased', i);
			if (categoryPurchased) {
				arrCategoryPurchased.push(categoryPurchased);
			}
		}
		
		arrCategoryPurchased = unique(arrCategoryPurchased);
		
		record.setFieldValues('custbodyr7categorypurchased', arrCategoryPurchased);
		record.setFieldValue('custbodyr7tempcatpurchv2procflag', 'T'); //TODO  - REMOVE THIS!
		record.setFieldValue('custbodyr7categorypurch_lastchecked', nlapiDateToString(getPSTDate(), 'datetimetz'));
		nlapiLogExecution('AUDIT', 'Time (in seconds) to process zc_stampCategoryPurchased', (new Date().getTime() - processbeginTime.getTime())/1000);
	} 
	catch (err) {
		nlapiLogExecution('ERROR', 'Problem zc_stampCategoryPurchased', err);
	}
	
	return record;
}

function zc_runCategoryPurchasedCopyRoutine(runType){

	try {
	
		if (runType == 'copy') {

			var lineCount = nlapiGetLineItemCount('item');
			
			for (var i = 1; i <= lineCount; i++) {
				var itemId = nlapiGetLineItemValue('item', 'item', i);
				var itemType = nlapiGetLineItemValue('item', 'itemtype', i);
				
				if (!isBlank(itemId) && !isBlank(itemType)) {
				
					if (['Subtotal', 'Discount', 'Description', 'EndGroup'].indexOf(itemType) == -1) {
						//unlock and null
						nlapiSetLineItemValue('item', 'custcolr7_category_purchased_expire', i, '');
						nlapiSetLineItemValue('item', 'custcolr7_category_purchased_lock', i, 'F');
					}
				}
			}
		}
	} 
	catch (e) {
		nlapiLogExecution('ERROR', 'Error on zc_runCategoryPurchasedCopyRoutine', e);
	}
}

function checkApplianceYears(tranRec){
	/*
	R7-1000CP
	R7-1000CP4H
	R7-3000CP
	R7-3000CP4H
	R7-5000CP
	R7-5000CP4H
	R7-5000X-4H
	R7-5000X-CP
	*/
	var listOfApplianceItems = [5989, 5990, 5993, 5994, 5997, 5998, 6000, 6002];
	var ignoreValidation = nlapiGetFieldValue('custbodyr7_ignore_quantity_valid');
	nlapiLogExecution('DEBUG','ignoreValidation',ignoreValidation);
	if(ignoreValidation != 'T'){
	var lineItemCount = tranRec.getLineItemCount('item');	        
		for (var i = 1; i <= lineItemCount; i++) {
			var lineItem = Number(nlapiGetLineItemValue('item', 'item', i));
			nlapiLogExecution('DEBUG','listOfApplianceItems.indexOf(lineItem)',listOfApplianceItems.indexOf(lineItem));
			if(listOfApplianceItems.indexOf(lineItem) != -1){
				var lineQuantity = Number(nlapiGetLineItemValue('item', 'quantity', i));
				nlapiLogExecution('DEBUG','[1,4].indexOf(lineQuantity)',[3,5].indexOf(lineQuantity));
				if([3,5].indexOf(lineQuantity) === -1){
					throw nlapiCreateError("APPLIANCE_PRODUCTS_INCORRECT_YEARS", "Warranty products for R7 appliances will only be available for 3 or 5 years.")
				}
			}
		}
	}	 
}

function zc_categorypurchased_credits(creditRefundTranId){

	try {
	
		var processbeginTime = new Date();
		
		var arrFilters = [];
		arrFilters.push(new nlobjSearchFilter('internalid', null, 'anyof', [creditRefundTranId]));
		arrFilters.push(new nlobjSearchFilter('type', null, 'anyof', ['CustCred', 'CashRfnd']));
		arrFilters.push(new nlobjSearchFilter('mainline', null, 'is', 'F'));
		arrFilters.push(new nlobjSearchFilter('appliedtolinktype', null, 'anyof', ['SaleRet']));
		arrFilters.push(new nlobjSearchFilter('type', 'item', 'noneof', ['@NONE@', 'Description', 'Discount', 'Subtotal']));
		
		var arrColumns = [];
		arrColumns.push(new nlobjSearchColumn('internalid'));
		arrColumns.push(new nlobjSearchColumn('trandate'));
		arrColumns.push(new nlobjSearchColumn('type'));
		arrColumns.push(new nlobjSearchColumn('item'));
		arrColumns.push(new nlobjSearchColumn('line'));
		arrColumns.push(new nlobjSearchColumn('custcolr7_category_purchased'));
		arrColumns.push(new nlobjSearchColumn('appliedtolinktype'));
		arrColumns.push(new nlobjSearchColumn('appliedtotransaction'));
		arrColumns.push(new nlobjSearchColumn('line', 'appliedtotransaction'));
		arrColumns.push(new nlobjSearchColumn('type', 'appliedtotransaction'));
		arrColumns.push(new nlobjSearchColumn('custcolr7_category_purchased', 'appliedtotransaction'));
		arrColumns.push(new nlobjSearchColumn('custcolr7_category_purchased_expire', 'appliedtotransaction'));
		arrColumns.push(new nlobjSearchColumn('custcolr7_category_purchased_lock', 'appliedtotransaction'));
		
		var arrResults = nlapiSearchRecord('transaction', null, arrFilters, arrColumns);
		
		var objTransactionLinkMap = {};
		
		for (var i = 0; arrResults != null && i < arrResults.length; i++) {
		
			var objTransaction = {
				internalid: arrResults[i].getValue('internalid'),
				trandate: arrResults[i].getValue('trandate'),
				type: getRecTypeId(arrResults[i].getValue('type')),
				appliedtolinktype: arrResults[i].getValue('appliedtolinktype'),
				appliedtotransaction: arrResults[i].getValue('appliedtotransaction'),
				appliedtotransaction_type: getRecTypeId(arrResults[i].getValue('type', 'appliedtotransaction')),
				lines: {}
			};
			
			if (objTransactionLinkMap.hasOwnProperty(objTransaction.internalid)) {
				objTransaction = objTransactionLinkMap[objTransaction.internalid];
			}
			
			objTransaction.lines[arrResults[i].getValue('line')] = {
				line: arrResults[i].getValue('line'),
				custcolr7_category_purchased: arrResults[i].getValue('custcolr7_category_purchased'),
				appliedtotransaction_line: arrResults[i].getValue('line', 'appliedtotransaction'),
				appliedtotransaction_custcolr7_category_purchased: arrResults[i].getValue('custcolr7_category_purchased', 'appliedtotransaction'),
				appliedtotransaction_custcolr7_category_purchased_expire: arrResults[i].getValue('custcolr7_category_purchased_expire', 'appliedtotransaction'),
				appliedtotransaction_custcolr7_category_purchased_lock: arrResults[i].getValue('custcolr7_category_purchased_lock', 'appliedtotransaction')
			};
			
			objTransactionLinkMap[objTransaction.internalid] = objTransaction;
		}
		
		if (!objTransactionLinkMap.hasOwnProperty(creditRefundTranId)) {
			//no results
			return;
		}
		
		var objTranCredit = objTransactionLinkMap[creditRefundTranId];
		
		if (objTranCredit.appliedtotransaction) {
		
			var recAppliedTo = null;
			var somethingUpdated = false;
			for (var id in objTranCredit.lines) {
			
				var objLine = objTranCredit.lines[id];
				if (objLine.appliedtotransaction_custcolr7_category_purchased_lock == 'T' && objLine.appliedtotransaction_custcolr7_category_purchased_expire == objTranCredit.trandate) {
					//nothing needed to do... already correct
					continue;
				}
				
				if (!recAppliedTo) {
					//only want to load this if i need to
					recAppliedTo = nlapiLoadRecord(objTranCredit.appliedtotransaction_type, objTranCredit.appliedtotransaction);
				}
				
				var lineCount = recAppliedTo.getLineItemCount('item');
				for (var i = 1; i <= lineCount; i++) {
				
					var lineId = recAppliedTo.getLineItemValue('item', 'line', i);
					var currentCategoryPurchased = recAppliedTo.getLineItemValue('item', 'custcolr7_category_purchased', i);
					var currentCategoryExpiration = recAppliedTo.getLineItemValue('item', 'custcolr7_category_purchased_expire', i);
					if (lineId == objLine.appliedtotransaction_line) {
						//make note that i need to submit record
						somethingUpdated = true;
						if (!currentCategoryPurchased){
							//just in case category purchased isnt already set
							recAppliedTo.setLineItemValue('item', 'custcolr7_category_purchased', i, objLine.custcolr7_category_purchased);
						}

						recAppliedTo.setLineItemValue('item', 'custcolr7_category_purchased_expire', i, objTranCredit.trandate);
						recAppliedTo.setLineItemValue('item', 'custcolr7_category_purchased_lock', i, 'T');
						break;
					}
				}
			}
			
			if (somethingUpdated) {
				//something was updated... submit
				nlapiSubmitRecord(recAppliedTo);
			}
		}
		
		nlapiLogExecution('AUDIT', 'Time (in seconds) To Process zc_categorypurchased_credits', (new Date().getTime() - processbeginTime.getTime()) / 1000);
	} 
	catch (err) {
		nlapiLogExecution('ERROR', 'Problem zc_categorypurchased_credits', err);
	}
	
	return;
}

function stampACV(){

	try {
		
		var calculateACV = nlapiGetFieldValue('custbodyr7_calculate_acv');
		nlapiLogExecution('DEBUG', 'stampACV', calculateACV);
		if (calculateACV != 'T'){
			return;
		}
		
		var processbeginTime = new Date();

		var objItemDetails = grabItemDetailMap();
		
		nlapiLogExecution('DEBUG', 'running acv', 'starting process');
		//now go through and process
		var objACVGroups = new Object();
		var lineCount = nlapiGetLineItemCount('item');
		for (var i = 1; i <= lineCount; i++) {
		
			var itemId = nlapiGetLineItemValue('item', 'item', i);
			var itemType = nlapiGetLineItemValue('item', 'itemtype', i);
			
			if (itemId != null && itemId != '') {
				if (itemType != 'Subtotal' && itemType != 'Discount' && itemType != 'Description' && itemType != 'group' && itemType != 'Group' && itemType != 'EndGroup') {
				
					if (objItemDetails[itemId].allocate_acv != 'T') {
						//item shouldnt have acv
						continue;
					}
					
					var createdFromRA = nlapiGetLineItemValue('item', 'custcolr7createdfromra', i);
					var productKey = nlapiGetLineItemValue('item', 'custcolr7itemmsproductkey', i);
					var managedServiceId = nlapiGetLineItemValue('item', 'custcolr7managedserviceid', i);
					var registrationId = nlapiGetLineItemValue('item', 'custcolr7registrationid', i);
					var bookingCategory = objItemDetails[itemId].bookingcategory;
					
					var groupText = productKey || managedServiceId || registrationId || bookingCategory;
					groupText += ':' + createdFromRA;
					
					var objGroup = new ACVGroup();
					if (objACVGroups.hasOwnProperty(groupText)) {
						objGroup = objACVGroups[groupText];
					}
					
					var startDate = nlapiGetLineItemValue('item', 'custcolr7startdate', i) || nlapiGetLineItemValue('item', 'revrecstartdate', i);
					var endDate = nlapiGetLineItemValue('item', 'custcolr7enddate', i) || nlapiGetLineItemValue('item', 'revrecenddate', i);
					var vsoeAllocation = nlapiGetLineItemValue('item', 'vsoeallocation', i);
					//Get new 605 value and use it if it has a value other than 0
					var rev605Allocation = nlapiGetLineItemValue('item', 'custcol_r7_605_rev_amount', i);

					if (objGroup.minstart == null || (startDate != null && startDate != '' && nlapiStringToDate(startDate) < nlapiStringToDate(objGroup.minstart))) {
						objGroup.minstart = startDate;
					}
					if (objGroup.maxend == null || (endDate != null && endDate != '' && nlapiStringToDate(endDate) > nlapiStringToDate(objGroup.maxend))) {
						objGroup.maxend = endDate;
					}

					//Use 605 Amount if it is not 0
					if (rev605Allocation != null && rev605Allocation != '' && rev605Allocation != 0) {
						objGroup.totalvsoe += parseFloat(rev605Allocation);
					}
					else if (vsoeAllocation != null && vsoeAllocation != '') {
						objGroup.totalvsoe += parseFloat(vsoeAllocation);
					}
					nlapiLogExecution('DEBUG', 'objGroup.maxend', objGroup.maxend);
					objACVGroups[groupText] = objGroup;
				}
			}
		}
			
		var exchangeRate = parseFloat(nlapiGetFieldValue('exchangerate') || 1);
		var tranType = nlapiGetRecordType();
		var multiplier = (tranType == 'cashrefund' || tranType == 'creditmemo') ? -1 : 1;
		
		//now actually run calculations
		var lineCount = nlapiGetLineItemCount('item');
		for (var i = 1; i <= lineCount; i++) {
		
			var itemId = nlapiGetLineItemValue('item', 'item', i);
			var itemType = nlapiGetLineItemValue('item', 'itemtype', i);
			
			if (itemId != null && itemId != '') {
				if (itemType != 'Subtotal' && itemType != 'Discount' && itemType != 'Description' && itemType != 'group' && itemType != 'Group' && itemType != 'EndGroup') {

					if (objItemDetails[itemId].allocate_acv != 'T') {
						//item shouldnt have acv
						nlapiSetLineItemValue('item', 'custcolr7acvstartdate', i, '');
						nlapiSetLineItemValue('item', 'custcolr7acvenddate', i, '');
						nlapiSetLineItemValue('item', 'custcolr7acvamount', i, '');
						continue;
					}
					
					var createdFromRA = nlapiGetLineItemValue('item', 'custcolr7createdfromra', i);
					var productKey = nlapiGetLineItemValue('item', 'custcolr7itemmsproductkey', i);
					var managedServiceId = nlapiGetLineItemValue('item', 'custcolr7managedserviceid', i);
					var registrationId = nlapiGetLineItemValue('item', 'custcolr7registrationid', i);
					var bookingCategory = objItemDetails[itemId].bookingcategory;
					
					var groupText = productKey || managedServiceId || registrationId || bookingCategory;
					groupText += ':' + createdFromRA;
					
					var objGroup = new ACVGroup();
					if (objACVGroups.hasOwnProperty(groupText)) {
						objGroup = objACVGroups[groupText];
					}
					nlapiLogExecution('DEBUG', 'objGroup.minstart', objGroup.minstart);
					if (objGroup.minstart == null || objGroup.minstart == null || objGroup.maxend == null || objGroup.maxend == '') {
						continue;
					}
					
					var vsoeAllocation = nlapiGetLineItemValue('item', 'vsoeallocation', i) || 0;
					if (vsoeAllocation == 0)
						vsoeAllocation = nlapiGetLineItemValue('item', 'custcol_r7_605_rev_amount', i) || 0;

					var percentOfTotal = (parseFloat(vsoeAllocation) / objGroup.totalvsoe) || 0;
					
					var acvDays = days_between(nlapiStringToDate(objGroup.minstart), nlapiStringToDate(objGroup.maxend)) + 1;
					
					var groupACV = (Math.round(((objGroup.totalvsoe / acvDays) * 365) * 100) / 100) || 0;
					var acvAmount = (Math.round((multiplier * groupACV * percentOfTotal * exchangeRate) * 100) / 100) || 0;
					
					nlapiLogExecution('DEBUG', 'groupACV', groupACV);
					nlapiLogExecution('DEBUG', 'stamping', objGroup.minstart);
					
					nlapiSetLineItemValue('item', 'custcolr7acvstartdate', i, objGroup.minstart);
					nlapiSetLineItemValue('item', 'custcolr7acvenddate', i, objGroup.maxend);
					nlapiSetLineItemValue('item', 'custcolr7acvamount', i, acvAmount);
				}
			}
		}
		
		nlapiLogExecution('AUDIT', 'Time (in seconds) To Process ACV Lines', (new Date().getTime() - processbeginTime.getTime())/1000);
	} 
	catch (err) {
		nlapiLogExecution('ERROR', 'Error calculating ACV Lines', err);
	}
}

function ACVGroup(){
	
	this.minstart = null;
	this.maxend = null;
	this.totalvsoe = 0;
	this.acv = 0;
}

function grabItemDetailMap(){

	if (objItemDetailMap) {
		return objItemDetailMap;
	}
	
	//first just get list of all items so i can search their details
	var arrItemIds = [];
	var lineCount = nlapiGetLineItemCount('item');
	for (var i = 1; i <= lineCount; i++) {
	
		var itemId = nlapiGetLineItemValue('item', 'item', i);
		var itemType = nlapiGetLineItemValue('item', 'itemtype', i);
		
		if (itemId != null && itemId != '') {
			if (['Subtotal', 'Discount', 'Description', 'EndGroup'].indexOf(itemType) == -1) {
				arrItemIds[arrItemIds.length] = itemId;
			}
		}
	}
	arrItemIds = unique(arrItemIds);
	
	objItemDetailMap = {};

	if (arrItemIds && arrItemIds.length > 0) {
	
		var arrFilters = [];
		arrFilters[arrFilters.length] = new nlobjSearchFilter('internalid', null, 'anyof', arrItemIds);
		
		var arrColumns = [];
		arrColumns[0] = new nlobjSearchColumn('internalid');
		arrColumns[1] = new nlobjSearchColumn('custitemr7acvallocation');
		arrColumns[2] = new nlobjSearchColumn('custitemr7categorybookingssalesdept');
		arrColumns[3] = new nlobjSearchColumn('custitemr7categorypurchaseditem');
		
		var arrResults = nlapiSearchRecord('item', null, arrFilters, arrColumns);
		
		for (var i = 0; arrResults != null && i < arrResults.length; i++) {
			
			var objItem = {};
			
			objItem.id = arrResults[i].getValue(arrColumns[0]);
			objItem.allocate_acv = arrResults[i].getValue(arrColumns[1]);
			objItem.bookingcategory = arrResults[i].getText(arrColumns[2]);
			objItem.custitemr7categorypurchaseditem = arrResults[i].getValue(arrColumns[3]);
			
			objItemDetailMap[objItem.id] = objItem;
		}
	}
	
	return objItemDetailMap;
}

function grabCategoryPurchasedDetailMap(){

	if (objCategoryPurchasedDetailMap) {
		return objCategoryPurchasedDetailMap;
	}

	var arrColumns = [];
	arrColumns.push(new nlobjSearchColumn('internalid'));
	arrColumns.push(new nlobjSearchColumn('custrecordr7catpurch_custstatusmap'));
	arrColumns.push(new nlobjSearchColumn('custrecordr7catpurch_expirationfield'));
	arrColumns.push(new nlobjSearchColumn('custrecordr7catpurch_daystillexpire'));
	arrColumns.push(new nlobjSearchColumn('custrecordr7catpurch_daystoremaininactiv'));
	
	var arrResults = nlapiSearchRecord('customrecordr7categorypurchased', null, null, arrColumns);
	
	objCategoryPurchasedDetailMap = {};
	
	for (var i = 0; arrResults != null && i < arrResults.length; i++) {
		
		var objCategory = {};
		
		objCategory.internalid = arrResults[i].getValue('internalid');
		objCategory.custrecordr7catpurch_custstatusmap = arrResults[i].getValue('custrecordr7catpurch_custstatusmap');
		objCategory.custrecordr7catpurch_expirationfield = arrResults[i].getValue('custrecordr7catpurch_expirationfield');
		objCategory.custrecordr7catpurch_daystillexpire = parseInt(arrResults[i].getValue('custrecordr7catpurch_daystillexpire') || 0);
		objCategory.custrecordr7catpurch_daystoremaininactiv = parseInt(arrResults[i].getValue('custrecordr7catpurch_daystoremaininactiv') || 0);
		
		objCategoryPurchasedDetailMap[objCategory.internalid] = objCategory;
	}
	
	return objCategoryPurchasedDetailMap;
}

/*function stampClass(){
	try {
		var salesTerritoryId = nlapiGetFieldValue('custbodyr7salesterritoryhistoricalcust');
		
		if (salesTerritoryId != null && salesTerritoryId != '') {
			var newClass = nlapiLookupField('customrecordr7salesterritorygroups', salesTerritoryId, 'custrecordr7territorygroupclass');
			
			nlapiSetFieldValue('class', newClass);
		}
	} 
	catch (e) {
		nlapiLogExecution('ERROR', 'Could not stamp class', 'ID: ' + nlapiGetRecordId() + '\n\nError: ' + e);
		nlapiSendEmail(55011, 55011, 'Could not stamp class', 'ID: ' + nlapiGetRecordId() + '\n\nError: ' + e);
	}
}*/

function setLocations(){
	var curSubsidiary = parseInt(nlapiGetFieldValue('subsidiary'));
    switch (curSubsidiary) {
        case 10://Rapid7 International
            nlapiSetFieldValue('location', 29); //UKS London
            break;
        case 13://Rapid7 Ireland Limited
            nlapiSetFieldValue('location', 66); //GLS - Galway IRE
            break;
        case 22: //Rapid7 DivvyCloud
            nlapiSetFieldValue('location', 73); //VA - Arlington (Divvy)
            break;
        default:
            nlapiSetFieldValue('location', 1); //MA Boston
    }

	var headerLocation = nlapiGetFieldValue('location');
	for (var i = 1; i <= nlapiGetLineItemCount('item'); i++) {
		
		var itemType = nlapiGetLineItemValue('item', 'itemtype', i);

		if (itemType == 'Group' || itemType == 'group' || itemType == 'EndGroup'){
			continue;
		}
		nlapiSetLineItemValue('item', 'location', i, headerLocation);
	}
}

function getRecTypeId(recType){

	switch (recType) {
		case 'Opprtnty':
			recType = 'opportunity';
			break;
		case 'Opportunity':
			recType = 'opportunity';
			break;
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

function getRandomString(string_length){
    var chars = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXTZabcdefghiklmnopqrstuvwxyz';
    var randomstring = '';
    for (var i = 0; i < string_length; i++) {
        var rnum = Math.floor(Math.random() * chars.length);
        randomstring += chars.substring(rnum, rnum + 1);
    }
    return randomstring;
}

function formatNumber(field){

	if (field == '' || field == null) {
		field = 0;
	}
	else {
		field = parseFloat(field);
	}
	
	if (isNaN(field)) {
		field = 0;
	}
	
	return field;
}

function days_between(date1, date2) {
	
	if (date1 == null || date1 == '' || date2 == null || date2 == ''){
		return '';
	}
	// The number of milliseconds in one day
	var ONE_DAY = 1000 * 60 * 60 * 24;

	// Convert both dates to milliseconds
	var date1_ms = date1.getTime();
	var date2_ms = date2.getTime();

	// Calculate the difference in milliseconds
	var difference_ms = (date1_ms - date2_ms) * -1;

	// Convert back to days and return
	return Math.round(difference_ms / ONE_DAY);

}

function getPSTDate(){
	var now = new Date();
	now.setHours(now.getHours() + 3);
	return now;
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

function isBlank(val){
	return (val == null || val === '') ? true : false;
}

function assignCSM(recId)
{   var CSMstatus = '';
var context = nlapiGetContext();
var defaultCSM = context.getSetting('SCRIPT', 'custscript_r7_smb_csm');
	var total = nlapiGetFieldValue('total');
	nlapiLogExecution('DEBUG', 'total', total);
	var customer = nlapiGetFieldValue('entity');
	nlapiLogExecution('DEBUG', 'customer', customer);
	var status = nlapiLookupField('customer', customer, 'entitystatus');
	nlapiLogExecution('DEBUG', 'status', status);
	var currentCSM = nlapiLookupField('customer', customer, 'custentityr7accountmanager');
	if(currentCSM)
		{
		CSMstatus = nlapiLookupField('employee', currentCSM, 'isinactive');
		nlapiLogExecution('DEBUG', 'CSM and Status', currentCSM + '/' + CSMstatus);
		}
		if((status == 13 || status == 15 || status == 95 || status == 97) && CSMstatus != 'F')//100% Won or 100% Won-Renewal
		{
		var directLevelTerm = nlapiLookupField('customer', customer, 'custentityr7directorlevelteam');
		nlapiLogExecution('DEBUG', 'assignTeamTerritory', directLevelTerm);
		if(total <= 20000.00 && (directLevelTerm == '2' || directLevelTerm == '3'))//Mid-Market West or Mid-Market East
			{nlapiLogExecution('DEBUG', 'SMB', 'Searching for SMB');
			var smbSearch = nlapiSearchRecord('customrecord_r7_csm_assignment_rules', null, new nlobjSearchFilter('custrecord_r7_smb_csm', null, 'is', 
					'T'), new nlobjSearchColumn('internalid'));
			nlapiLogExecution('DEBUG', 'SMB Search Length', smbSearch.length);
			if(!smbSearch){nlapiSubmitField('customer', customer, 'custentityr7accountmanager', defaultCSM);
			return;}
			for(var a in smbSearch)
				{
				var ruleId = smbSearch[a].getValue('internalid');
				nlapiLogExecution('DEBUG', 'Rule', ruleId);
				var csm = nlapiLookupField('customrecord_r7_csm_assignment_rules', ruleId, 'custrecord_r7_csm');
				nlapiLogExecution('DEBUG', 'CSM', csm);
				nlapiSubmitField('customer', customer, 'custentityr7accountmanager', csm);
				return;
				}
			}//end of SMB Search
		
		if(directLevelTerm == '12')//SLED
			{
			var companyDesig = nlapiLookupField('customer', customer, 'custentityr7companydesignation');
			nlapiLogExecution('DEBUG', 'Company Designation', companyDesig);
			if(companyDesig == '3')//Named
			{
			var sledNamedSearch = nlapiSearchRecord('customrecord_r7_csm_assignment_rules', null, new nlobjSearchFilter('custrecord_r7_sled_named', null, 'is', 
			'T'), new nlobjSearchColumn('internalid'));
			if(!sledNamedSearch){nlapiSubmitField('customer', customer, 'custentityr7accountmanager', defaultCSM);
			return;}
			for(var a in sledNamedSearch)
			{
				var ruleId = sledNamedSearch[a].getValue('internalid');
				nlapiLogExecution('DEBUG', 'Rule', ruleId);
				var csm = nlapiLookupField('customrecord_r7_csm_assignment_rules', ruleId, 'custrecord_r7_csm');
				nlapiLogExecution('DEBUG', 'CSM', csm);
				nlapiSubmitField('customer', customer, 'custentityr7accountmanager', csm);
				return;
			}
			}// end of Sled Named
			if(companyDesig == '4')//Mid-Market
				{			
				var sledMMSearch = nlapiSearchRecord('customrecord_r7_csm_assignment_rules', null, new nlobjSearchFilter('custrecord_r7_sled_named', null, 'is', 'T'), new nlobjSearchColumn('internalid'));;
				if(!sledMMSearch){nlapiSubmitField('customer', customer, 'custentityr7accountmanager', defaultCSM);
				return;}
				for(var a in sledMMSearch)
				{
					var ruleId = sledMMSearch[a].getValue('internalid');
					nlapiLogExecution('DEBUG', 'Rule', ruleId);
					var csm = nlapiLookupField('customrecord_r7_csm_assignment_rules', ruleId, 'custrecord_r7_csm');
					nlapiLogExecution('DEBUG', 'CSM', csm);
					nlapiSubmitField('customer', customer, 'custentityr7accountmanager', csm);
					return;
				}
				}// end of Sled MM
			}// end of SLED
		var state = nlapiLookupField('customer', customer, 'billstate');
		nlapiLogExecution('DEBUG', 'state', state);
		var newState = nlapiSearchRecord('customrecordr7statecountrycus', null, new nlobjSearchFilter('name', null, 'contains', state), new nlobjSearchColumn('internalid'));
		for(var t in newState)
		{state = newState[t].getValue('internalid');}
		var country = nlapiLookupField('customer', customer, 'billcountry');
		nlapiLogExecution('DEBUG', 'Country', country);
		if(country == 'US' || country == 'CA'){
		var searchResults = nlapiSearchRecord('customrecord_r7_csm_assignment_rules', null, [new nlobjSearchFilter('custrecord_r7_director_level_term', null, 'anyof', directLevelTerm), new nlobjSearchFilter('custrecord_r7_state', null, 'anyof', state)], new nlobjSearchColumn('internalid'));
		if(!searchResults){nlapiSubmitField('customer', customer, 'custentityr7accountmanager', defaultCSM);
		return;}
		for (var z in searchResults)
			{
			var ruleId = searchResults[z].getValue('internalid');
			nlapiLogExecution('DEBUG', 'Rule', ruleId);
			var csm = nlapiLookupField('customrecord_r7_csm_assignment_rules', ruleId, 'custrecord_r7_csm');
			nlapiLogExecution('DEBUG', 'CSM', csm);
			nlapiSubmitField('customer', customer, 'custentityr7accountmanager', csm);
			}
		}//End of US or CA assignment
		if(country != 'US' && country != 'CA')
			{nlapiLogExecution('DEBUG', 'Country Not US or CA', 'True');
			var searchCountry = nlapiSearchRecord('customrecordr7countries', null, new nlobjSearchFilter('custrecordr7countriescountryid', null, 'is', country), new nlobjSearchColumn('internalid'));
			for(var y in searchCountry)
			{
			var countryId = searchCountry[y].getValue('internalid'); 
			nlapiLogExecution('DEBUG', 'Country', countryId);
			var region = nlapiLookupField('customer', customer, 'custentityr7region');
			nlapiLogExecution('DEBUG', 'Region', region);
			var arrRegion = ['6', '7', '8', '9', '10', '14']//ANZ, S. Asia, Middle East, Latin America, Africa, N. Asia
			if(arrRegion.indexOf(region) == -1)
				{var filter = new nlobjSearchFilter('custrecord_r7_country', null, 'anyof', countryId);}
			else
				{var filter = new nlobjSearchFilter('custrecord_r7_region', null, 'anyof', region);}
			var searchResults = nlapiSearchRecord('customrecord_r7_csm_assignment_rules', null, filter, new nlobjSearchColumn('internalid'));
			if(!searchResults){nlapiSubmitField('customer', customer, 'custentityr7accountmanager', defaultCSM);
			return;}
			for (var z in searchResults)
			{
			var ruleId = searchResults[z].getValue('internalid');
			nlapiLogExecution('DEBUG', 'Rule', ruleId);
			var csm = nlapiLookupField('customrecord_r7_csm_assignment_rules', ruleId, 'custrecord_r7_csm');
			nlapiLogExecution('DEBUG', 'CSM', csm);
			nlapiSubmitField('customer', customer, 'custentityr7accountmanager', csm);
			}
			}
		}// end of if country is not US or CA
	
	
}//end of status == 13 or 15
}//end function assignCSM()	

function checkAndSetBESPFields(record, type) {
    var shipping_country = null;
    var besp_category = null;
    var useShippingCountry = true;
    var usePartner = true;
    
    // Check if we need to execute BL in 'xedit' mode
    if(type=='xedit'){
        useShippingCountry = false;
        usePartner = false;
        var fields = record.getAllFields();
        for(var i = 0; i<fields.length; i++){
           if(fields[i]=='partner'){
               usePartner = true;
           }
           if(fields[i]=='shipcountry'){
               useShippingCountry = true;
           }
        }
        nlapiLogExecution('AUDIT','BESP Logic from XEDIT','useShippingCountry = '+ useShippingCountry+ ' ; usePartner = '+ usePartner);
        // When no related to BL fields are changed in 'xedit' mode - exit
        if(!useShippingCountry && !usePartner){
            return;
        }
    }
    
    if(useShippingCountry){
        var country = record.getFieldValue('shipcountry');
        shipping_country = (country == 'US' || country == 'CA') ? 1 : 2 
        nlapiLogExecution('AUDIT','BESP Shipping Country','Country = '+ country+ ' ; shipping_country = '+ shipping_country);
    }

    if(usePartner){
        var partner = record.getFieldValue('partner');
        besp_category = isBlank(partner) ? 1 : 2;
    }
    
    for (var i = 1; i <= record.getLineItemCount('item'); i++) {
        var itemType = record.getLineItemValue('item', 'itemtype', i);
        if (itemType == 'Subtotal' || itemType == 'Discount' || itemType == 'Description' || itemType == 'group'
                || itemType == 'Group' || itemType == 'EndGroup') {
            continue;
        }
        if (useShippingCountry) {
            record.setLineItemValue('item', 'custcol_r7_shipping_country', i, shipping_country);
        }
        if (usePartner) {
            record.setLineItemValue('item', 'custcol_r7_besp_category', i, besp_category);
        }
    }
}