/**
 *    Copyright � 2018, Oracle and/or its affiliates. All rights reserved.
 */
/**
 * wmsUtility.js
 * @NApiVersion 2.x
 * @NModuleScope public
 */
define(['N/search','N/runtime','N/record','N/config','N/format','./wmsts_big.js','./wmsts_translator.js','N/url'],function (search,runtime,record,config,format,Big,translator,url) {

	/**
	 * Makes a saved search call and returns all result items in JSON array
	 * @param searchObj Search object from which search needs to be performed
	 * @param callback callback function if any to which search item needs to be given
	 * @param callbackResultObj search Collector, only mutable object (like array and object)
	 * @returns {*} Array of search result in JSON format
	 */
	function _getSearchResultInJSON(searchObj, callback, callbackResultObj) {
		//if callback and callbackResultObj are undefined, default behaviour is 1 result -> 1 object
		if (callback == undefined || callback == '') {
			callback = _searchResultToJson;
		}
		if (callbackResultObj == undefined) {
			callbackResultObj = []; // initialize as array
		}

		var search_page_count = 1000;

		var myPagedData = searchObj.runPaged({
			pageSize: search_page_count
		});



		myPagedData.pageRanges.forEach(function (pageRange) {
			var myPage = myPagedData.fetch({
				index: pageRange.index
			});
			myPage.data.forEach(function (result) {
				//get json of result
				callback(result,callbackResultObj);
			});
		});
		return callbackResultObj;
	}

	/**
	 * Converts Search result to JSON object
	 * @param searchResult each search result object
	 * @returns {Array} JSON equivalent of search object
	 */
	function _searchResultToJson(searchResult, searchResults) {
		var resultObj = {};

		var columnsArray = searchResult.columns;
		var columnKeys =[];
		for (var j in columnsArray) {
			var columnObj = JSON.parse(JSON.stringify(columnsArray[j]));
			var column = columnObj.name;
			var columnSummary = columnObj.summary;
			var columnLabel = columnObj.label;
			var columnJoin = columnObj.join;
			var columnType = columnObj.type;

			if (column == 'formulanumeric' || column == 'formuladate' || column == 'formulatext') {
				var columnValue = searchResult.getValue(columnsArray[j]);
				resultObj[columnLabel] = columnValue;
			}
			else {
				var columnValue = searchResult.getValue({
					name: column,
					summary: columnSummary,
					join: columnJoin
				});
				if(columnKeys.indexOf(column) != -1)
				{
					columnKeys.push(columnLabel);
					resultObj[columnLabel] = columnValue;
				}
				else
				{
					columnKeys.push(column);
					resultObj[column] = columnValue;
				}
				if (columnType == 'select' || column == 'unit'  || typeof columnObj == 'object') {
					if(columnValue!= '')
					{
						var columnText = searchResult.getText({
							name: column,
							summary: columnSummary,
							join: columnJoin
						});
						var colName = column + "Text";
						resultObj[colName] = columnText;
					}
					else
					{
						var colName = column + "Text";
						resultObj[colName] = '';	
					}                                             
				}
			}

			resultObj['id'] = searchResult.id;
			resultObj['recordType'] = searchResult.recordType;
		}

		searchResults.push(resultObj);
	}

	function _searchResultToJsonForPOListBYVendor(searchResult, searchResults) {
		var resultObj = {};

		var columnsArray = searchResult.columns;
		for (var j in columnsArray) {
			var columnObj = JSON.parse(JSON.stringify(columnsArray[j]));
			var column = columnObj.name;
			var columnSummary = columnObj.summary;
			var columnLabel = columnObj.label;
			var columnJoin = columnObj.join;
			var columnType = columnObj.type;

			if (column == 'formulanumeric' || columnLabel != '') {
				var columnValue = searchResult.getValue(columnsArray[j]);
				resultObj[columnLabel] = columnValue;
			}
			else {
				var columnValue = searchResult.getValue({
					name: column,
					summary: columnSummary,
					join: columnJoin
				});
				resultObj[column] = columnValue;
				if ((columnType == 'select' || column == 'unit')) {
					if(columnValue!= '')
					{
						var columnText = searchResult.getText({
							name: column,
							summary: columnSummary,
							join: columnJoin
						});
						var colName = column + "Text";
						resultObj[colName] = columnText;
					}
					else
					{
						var colName = column + "Text";
						resultObj[colName] = '';	
					}                                             
				}
			}

			resultObj['id'] = searchResult.id;
			resultObj['recordType'] = searchResult.recordType;
		}

		searchResults.push(resultObj);
	}

	/**
	 * Makes a saved search call and returns single result  in JSON array basically it can be used for validation.
	 * @param searchObj Search object from which search needs to be performed
	 * @returns {*} Array of search result in JSON format
	 */
	function _getSearchResultInJSONForValidation(searchObj,resultLength) {

		var	callbackResultObj = []; 
		if(resultLength == undefined || resultLength == '')
		{
			resultLength = 2;
		}
		searchObj.run().each(function(result) {
			_searchResultToJson(result, callbackResultObj);
			if(callbackResultObj.length == resultLength)
			{
				return false;
			}
			else
			{
				return true;
			}
		});
		return callbackResultObj;
	}

	function _getCurrentUserLanguage()
	{
		var user = runtime.getCurrentUser();
		return user.getPreference({
			name :'LANGUAGE'
		});
	}

	/**
	 *
	 * @param poNumber
	 * @param transactionType
	 * @param itemID
	 * @param wareHouseLocation
	 * @param poLineNo
	 * @returns {*search Result}
	 */
	function getPOLineDetailsNew(poNumber,itemID,wareHouseLocation,poLineNo)
	{
		var vType='PurchOrd';

		var POLineDetails = search.load({
			id : 'customsearch_wmsse_rcv_ordline_details'
		});

		var savedFilter = POLineDetails.filters;
		savedFilter.push(search.createFilter({
			name: 'tranid',
			operator: search.Operator.IS,
			values: poNumber
		}));
		savedFilter.push(
				search.createFilter({
					name: 'type',
					operator: search.Operator.ANYOF,
					values: vType
				}));

		if(_isValueValid(wareHouseLocation)) {
			savedFilter.push(
					search.createFilter({
						name: 'location',
						operator: search.Operator.ANYOF,
						values: ['@NONE@', wareHouseLocation]
					}));
		}
		if(_isValueValid(itemID)) {
			savedFilter.push(
					search.createFilter({
						name: 'item',
						operator: search.Operator.ANYOF,
						values: itemID
					}));
		}
		if(_isValueValid(poLineNo)) {
			savedFilter.push(
					search.createFilter({
						name: 'line',
						operator: search.Operator.EQUALTO,
						values: poLineNo
					}));
		}

		POLineDetails.filters = savedFilter;

		var POLineDetailsResult = _getSearchResultInJSON(POLineDetails);
		return POLineDetailsResult;
	}
	/**  This function calls when the end user selects or scans the item to check the same
	 *  line/item is being processed by any other user.If the lock records found error message will be returned else
	 *  lock will be created for that order line to prevent others process the same line.  */
	function checkTransactionLock(trantype,getPOInternalId,getPOLineNo){

		var currentUser = runtime.getCurrentUser();
		var currentUserId  = currentUser.id;
		var lockfilters = [
			search.createFilter({
				name: 'custrecord_wmsse_trantype',
				operator: search.Operator.IS,
				values: trantype
			}), search.createFilter({
				name: 'custrecord_wmsse_order',
				operator: search.Operator.ANYOF,
				values: getPOInternalId
			}), search.createFilter({
				name: 'custrecord_wmsse_line',
				operator: search.Operator.EQUALTO,
				values: getPOLineNo
			}), search.createFilter({
				name: 'custrecord_wmsse_lockflag',
				operator: search.Operator.IS,
				values: true
			})
			];
		var lockSearch = search.load({
			id: 'customsearch_wmsse_lockrecs_srh'
		});

		var savedFilters = lockSearch.filters;
		lockSearch.filters = savedFilters.concat(lockfilters);

		var lockresults = lockSearch.run().getRange({start: 0, end: 1000});
		if (lockresults.length >0) {
			var getLockUser = lockresults[0].getValue({
				name: 'custrecord_wmsse_user'
			});
			var getLockLine = lockresults[0].getValue({
				name: 'custrecord_wmsse_line'
			});


			if (parseInt(getLockUser) != parseInt(currentUserId)) {

				var error = translator.getTranslationString('PO_ITEMVALIDATE.CHECK_MULTIPLE_USERS');
				return error;
			}
			else if (parseInt(getLockLine) != parseInt(getPOLineNo)) {
				var lockRecId = createLockRecord(getPOInternalId,trantype,getPOLineNo,currentUserId);
				log.debug('lockRecId',lockRecId);
				return null;
			}
		}
		else {
			var lockRecId = createLockRecord(getPOInternalId,trantype,getPOLineNo,currentUserId);
			log.debug('lockRecId',lockRecId);
			return null;
		}
//		end
	}
	/** Lock record creation */
	function createLockRecord(getPOInternalId,trantype,getPOLineNo,currentUserId){
		var lockRecord = record.create({
			type: 'customrecord_wmsse_lockrecs',
			isDynamic: true
		});
		lockRecord.setValue({fieldId: 'name', value: getPOInternalId});
		lockRecord.setValue({fieldId: 'custrecord_wmsse_trantype', value: trantype});
		lockRecord.setValue({fieldId: 'custrecord_wmsse_order', value: getPOInternalId});
		lockRecord.setValue({fieldId: 'custrecord_wmsse_line', value: getPOLineNo});
		lockRecord.setValue({fieldId: 'custrecord_wmsse_lockflag', value: true});
		lockRecord.setValue({fieldId: 'custrecord_wmsse_user', value: currentUserId});

		var date = new Date();
		var mSecs = date.getTime();
		lockRecord.setValue({fieldId: 'custrecord_wmsse_time_msec', value: mSecs});

		var recid = lockRecord.save();
		return recid;
	}


	/**
	 * This function is used to validate selected/scanned item
	 * @param itemNo
	 * @param location
	 * @param company
	 * @param poid
	 * @returns
	 */
	function getSKUIdWithName(itemNo,location,vendor,transactionId,searchItem){

		var currItem = validateItemForNameAndUpccode(itemNo,location,searchItem);

		/*if(currItem.length == 0){
			currItem = wmsse_GetItemIdWithNameBasedOnUPCCode(itemNo, location, searchItem);*/

		if(currItem.length == 0){
			currItem = wmsse_GetItemIdWithNameBasedOnItemAlias(itemNo, location, searchItem);

			if(currItem.length == 0 && _isValueValid(vendor)==true){
				currItem = parsebarcodestring(vendor,itemNo,location,transactionId);
			}
		}
		//}

		var logMsg = "";
		if(currItem.length == 0){
			logMsg = 'Unable to retrieve item';
		} else {
			logMsg = 'Item = ' + currItem;
		}
		log.debug({'title':'logMsg',details:logMsg});
		return currItem;
	}

	function validateItemForNameAndUpccode(itemNo,location,searchItem)
	{
		var itemList = [];
		var currItem = [];
		var itemSearchResultsSearch=  search.load({
			id: 'customsearch_wmsse_validitem_name_srh'});

		var filters = [];
		if(searchItem){

			filters= [
				['location',search.Operator.ANYOF,['@NONE@',location]],'and', [["nameinternal", search.Operator.CONTAINS, itemNo], "or",
					["upccode", search.Operator.CONTAINS, itemNo]],'and',["isinactive",search.Operator.IS,false]
				];
		}
		else
		{
			filters= [
				['location',search.Operator.ANYOF,['@NONE@',location]],'and', [["nameinternal", search.Operator.IS, itemNo], "or",
					["upccode", search.Operator.IS, itemNo]],'and',["isinactive",search.Operator.IS,false]
				];
		}
		itemSearchResultsSearch.filterExpression= filters;

		var itemSearchResults =itemSearchResultsSearch.run().getRange({ start :0 ,end :1000});
		if(itemSearchResults != null && itemSearchResults.length > 0)
		{
			if(searchItem){
				for(i in itemSearchResults){
					var currItem = {};
					currItem['id'] = itemSearchResults[i].id;
					currItem['itemid'] = itemSearchResults[i].getValue({
						name :'itemid'
					});
					currItem['upccode'] = itemSearchResults[i].getValue({
						name :'upccode'
					});
					currItem['description'] = itemSearchResults[i].getValue({
						name :'salesdescription'
					});
					itemList.push(currItem);
				}
				return itemList;
			}else{
				if(itemSearchResults != null && itemSearchResults != '')
				{
					//There will be only one record in search result
					currItem.push(itemSearchResults[0].id);
					currItem.push(itemSearchResults[0].getValue({
						name :'itemid'
					}));
				}
				return currItem;
			}
		}
		else
		{
			return currItem;
		}

	}

	/**
	 * This function is used to get Item internal Id
	 * @param itemNo
	 * @returns {String}
	 */
	function wmsse_GetItemIdWithNameForItemNo(itemNo,location,searchItem){
		var itemList = [];
		var currItem = [];
		var filters = [];
		if(searchItem){
			filters.push(search.createFilter({
				name: 'nameinternal',
				operator: search.Operator.CONTAINS,
				values: itemNo
			}));
			filters.push(search.createFilter({
				name: 'isinactive',
				operator: search.Operator.IS,
				values: false
			}));
		}else{
			filters.push(search.createFilter({
				name: 'nameinternal',
				operator: search.Operator.IS,
				values: itemNo
			}));
		}
		if(location!=null && location!='' && location!='null')
		{
			filters.push(search.createFilter({
				name: 'location',
				operator: search.Operator.ANYOF,
				values: ['@NONE@',location]
			}));
		}

		var itemSearchResultsSearch = search.load({
			id :'customsearch_wmsse_validitem_name_srh'
		});
		var savedFilters = itemSearchResultsSearch.filters ;
		itemSearchResultsSearch.filters = savedFilters.concat(filters);;
		var itemSearchResults =itemSearchResultsSearch.run().getRange({ start :0 ,end :1000});
		if(searchItem){
			for(i in itemSearchResults){
				var currItem = {};
				currItem['id'] = itemSearchResults[i].id;
				currItem['itemid'] = itemSearchResults[i].getValue({
					name :'itemid'
				});
				currItem['upccode'] = itemSearchResults[i].getValue({
					name :'upccode'
				});
				currItem['description'] = itemSearchResults[i].getValue({
					name :'salesdescription'
				});
				itemList.push(currItem);
			}
			return itemList;
		}else{
			if(itemSearchResults != null && itemSearchResults != '')
			{
				//There will be only one record in search result
				currItem.push(itemSearchResults[0].id);
				currItem.push(itemSearchResults[0].getValue({
					name :'itemid'
				}));
			}
			return currItem;
		}
	}

	/**
	 * This function is used to get item id with scanned UPC code.
	 * @param itemNo
	 * @param location
	 * @returns {String}
	 */
	function wmsse_GetItemIdWithNameBasedOnUPCCode(itemNo,location, searchItem){
		var itemList = [];
		var currItem = [];
		var filters = [];
		if(searchItem){
			filters.push(
					search.createFilter({
						name: 'upccode',
						operator: search.Operator.CONTAINS,
						values: itemNo
					}));
		}else{
			filters.push(
					search.createFilter({
						name: 'upccode',
						operator: search.Operator.IS,
						values: itemNo
					}));
		}
		if(location!=null && location!='' && location!='null')
			filters.push(search.createFilter({
				name: 'location',
				operator: search.Operator.ANYOF,
				values: ['@NONE@',location]
			}));
		var itemSearchResultsSearch = search.load({
			id : 'customsearch_wmsse_validitem_name_srh'
		});
		var savedFilter = itemSearchResultsSearch.filters;
		itemSearchResultsSearch.filters = savedFilter.concat(filters);
		var itemSearchResults = itemSearchResultsSearch.run().getRange({ start : 0,end :1000}) ;
		if(searchItem){
			for(i in itemSearchResults){
				var currItem = {};
				currItem['id'] = itemSearchResults[i].id;
				currItem['itemid'] = itemSearchResults[i].getValue({
					name :'itemid'
				});
				currItem['upccode'] = itemSearchResults[i].getValue({
					name :'upccode'
				});
				currItem['description'] = itemSearchResults[i].getValue({
					name :'salesdescription'
				});
				itemList.push(currItem);
			}
			return itemList;
		}else{
			if(itemSearchResults != null && itemSearchResults.length != 0)
			{
				currItem.push(itemSearchResults[0].id);
				currItem.push(itemSearchResults[0].getValue({
					name :'itemid'
				}));
			}
			return currItem;
		}
	}
	/** This function is to check for the scanned item in the item alias custom record   */
	function wmsse_GetItemIdWithNameBasedOnItemAlias(itemNo, location, searchItem)
	{
		var itemList = [];
		var actItem=[];
		var skuAliasFilters = [];
		if(searchItem){
			skuAliasFilters.push(search.createFilter({
				name: 'name',
				operator: search.Operator.CONTAINS,
				values: itemNo
			}));
		}else{
			skuAliasFilters.push(search.createFilter({
				name: 'name',
				operator: search.Operator.IS,
				values: itemNo
			}));
		}
		if(location != null && location !='')
			skuAliasFilters.push(search.createFilter({
				name: 'custrecord_wmsse_alias_location',
				operator: search.Operator.ANYOF,
				values: ['@NONE@',location]
			}));
		var skuAliasResultsSearch = search.load({
			id :'customsearch_wmsse_itemalias_validate'
		});
		var savedFilters = skuAliasResultsSearch.filters;
		skuAliasResultsSearch.filters = savedFilters.concat(skuAliasFilters);
		var skuAliasResults = skuAliasResultsSearch.run().getRange({ start : 0,end: 1000});
		if(searchItem){
			for(i in skuAliasResults){
				var currItem = {};
				currItem['id'] = skuAliasResults[i].getValue({
					name :'custrecord_wmsse_alias_item'
				});
				currItem['itemid'] = skuAliasResults[i].getText({
					name :'custrecord_wmsse_alias_item'
				});
				currItem['upccode'] = skuAliasResults[i].getValue({
					join : 'CUSTRECORD_WMSSE_ALIAS_ITEM',
					name :'upccode'
				});
				currItem['description'] = skuAliasResults[i].getValue({
					join : 'CUSTRECORD_WMSSE_ALIAS_ITEM',
					name :'salesdescription'
				});
				itemList.push(currItem);
			}			
			return itemList;
		}else{
			if(skuAliasResults != null && skuAliasResults.length != 0)
			{
				actItem.push(skuAliasResults[0].getValue({
					name :'custrecord_wmsse_alias_item'
				}));
				actItem.push(skuAliasResults[0].getText({
					name: 'custrecord_wmsse_alias_item'
				}));
			}
			return actItem;
		}
	}
	/**returns item Type */
	function getItemType(itemNo, location) {
		var itemType = "";

		var searchRec = search.load({
			id: 'customsearch_wmsse_itemtype_srh'
		});
		var savedFilter = searchRec.filters;
		savedFilter.push(search.createFilter({
			name: 'internalid',
			operator: search.Operator.ANYOF,
			values: itemNo
		}));
		searchRec.filters = savedFilter;
		var searchres = searchRec.run().getRange({
			start: 0, end: 1
		});
		if (searchres.length>0) {
			itemType = searchres[0].recordType;
		}
		return itemType;
	}

	/**
	 *
	 * @returns {boolean}
	 */
	function isInvStatusFeatureEnabled() {
		var vResult = false;
		try {
			var inventoryStatusFeature = runtime.isFeatureInEffect({
				feature: 'inventorystatus' // Not sure about this feature
			});
			//var inventoryStatusFeature = nlapiGetContext().getFeature('inventorystatus');
			if (inventoryStatusFeature != null && inventoryStatusFeature != '' && inventoryStatusFeature != 'null' &&
					inventoryStatusFeature != 'undefined' && inventoryStatusFeature != false) {
				//The Inventory Status feature if provisioned on your account then return true
				vResult = true;
			}
		}
		catch (e) {
			//The Inventory Status feature if not provisioned on your account then return false
			log.error({
				title: 'exception in isInvStatusFeatureEnabled',
				details: e
			});
			vResult = false;
		}
		return vResult;
	}


	/**
	 *This function calculates the conversion rate for the given UOM 
	 *
	 */
	function getStockCoversionRate(vUnitTypeId, vUnits, cToConersionRate) {
		var uomfilters = [];
		if (vUnitTypeId != null && vUnitTypeId != '' && vUnitTypeId != 'null' && vUnitTypeId != undefined) {
			uomfilters.push(search.createFilter({
				name: 'internalid',
				operator: search.Operator.ANYOF,
				values: vUnitTypeId
			})
			);
		}
		if (vUnits != null && vUnits != '' && vUnits != 'null' && vUnits != undefined) {
			uomfilters.push(search.createFilter({
				name: 'unitname',
				operator: search.Operator.IS,
				values: vUnits
			})
			);
		}
		var uomcolumns = [];
		uomcolumns.push(search.createColumn({name: 'conversionrate'}));
		var uomresults = search.create({
			type: 'unitstype',
			filters: uomfilters,
			columns: uomcolumns
		}).run().getRange({start: 0, end: 1000});
		var vRetConversionRate = 1;
		if (uomresults != null && uomresults != '') {
			var vFromRate = uomresults[0].getValue({
				name: 'conversionrate'
			});
			if (vFromRate == null || vFromRate == '') {
				vFromRate = 1;
			}
			vRetConversionRate =Number(Big(vFromRate).div(cToConersionRate));
		}
		return vRetConversionRate;
	}
	/**This function returns configured uoms for the provided unitType */
	function getUnitsType(unitId,unitName) {
		var results = '';
		var searchRec = search.load({
			id: 'customsearch_wmsse_unitstype'
		});
		var uomfilters = searchRec.filters;

		if(_isValueValid(unitId))
		{
			uomfilters.push(search.createFilter({
				name: 'internalid',
				operator: search.Operator.ANYOF,
				values: unitId
			}));
		}
		if(_isValueValid(unitName))
		{
			uomfilters.push(search.createFilter({
				name: 'unitname',
				operator: search.Operator.IS,
				values: unitName
			}));
		}

		searchRec.filters = uomfilters;
		results = _getSearchResultInJSON(searchRec);

		log.error({
			title: 'results',
			details: results
		});
		return results;
	}

	/**
	 * To get System rule
	 * @param RuleId
	 * @param loc
	 * @returns {String}
	 */
	function getSystemRuleValue(RuleId, loc) {
		var systemrulevalue = 'N';
		try {

			var LANG = "LANGUAGE";
			var  locale = runtime.getCurrentUser().getPreference(LANG)
			if(locale != "en_US")
			{				
				RuleId = translator.getKeyBasedonValue(RuleId);
			}

			var searchRec = search.load({
				id: 'customsearch_wmsse_sys_rules'
			});
			var filters = searchRec.filters;
			filters.push(search.createFilter({
				name: 'name',
				operator: search.Operator.IS,
				values: RuleId.toString()
			}), search.createFilter({
				name: 'isinactive',
				operator: search.Operator.IS,
				values: false
			}));

			//starts
			if (loc != null && loc != '') {
				filters.push(search.createFilter({
					name: 'custrecord_wmssesite',
					operator: search.Operator.ANYOF,
					values: ['@NONE@', loc]
				}));
			}
			searchRec.filters = filters;
			searchresults = _getSearchResultInJSON(searchRec);


			
			if (searchresults.length > 0) {
				if (searchresults[0]['custrecord_wmsserulevalue'] != null &&
						searchresults[0]['custrecord_wmsserulevalue'] != '') {
					systemrulevalue = searchresults[0]['custrecord_wmsserulevalue'];
				}
			}
		}
		catch (exp) {
			log.error('expception', exp);
			return systemrulevalue;
		}
		return systemrulevalue;
	}

	function getDefaultInventoryStatusList(invtStatus_ID, isSpecOrd) {

		var inventoryStatusSearchResults = '';
		var filters = [];
		var inventoryStatusFeature = isInvStatusFeatureEnabled();
		if (inventoryStatusFeature) {

			var inventoryStatusResults = search.load({
				id: 'customsearch_wmsse_getinventorystatuslst'
			});
			filters = inventoryStatusResults.filters;
			if (_isValueValid(invtStatus_ID)) {
				filters.push(search.createFilter({
					name: 'internalid',
					operator: search.Operator.ANYOF,
					values: invtStatus_ID
				}));
			}
			//To include the filter only if it special order.
			if (_isValueValid(isSpecOrd) && isSpecOrd == 'SpecOrd') {
				filters.push(search.createFilter({
					name: 'inventoryavailable',
					operator: search.Operator.IS,
					values: true
				}));
			}
			inventoryStatusResults.filters = filters;
			inventoryStatusSearchResults = _getSearchResultInJSON(inventoryStatusResults);
		}

		return inventoryStatusSearchResults;
	}

	//Function to get Bins and InternalIds
	function getPutBinAndIntDetails_old(objPutBinQueryDetails) {

		log.debug({title:'objPutBinQueryDetails',details:objPutBinQueryDetails});

		var getItemInternalId =objPutBinQueryDetails['itemInternalId'];
		var strItemGrp = objPutBinQueryDetails['itemGroup'];
		var  strItemFam = objPutBinQueryDetails['itemFamily'];
		var blnMixItem = objPutBinQueryDetails['blnMixItem'];
		var blnMixLot = objPutBinQueryDetails['blnMixLot'];
		var getPreferBin = objPutBinQueryDetails['preferedBinName'];
		var strLocation = objPutBinQueryDetails['warehouseLocationId'];
		var itemType =  objPutBinQueryDetails['itemType'];
		var strLot = objPutBinQueryDetails['lotName'];
		var strItemDepartment= objPutBinQueryDetails['department'];
		var strItemClass = objPutBinQueryDetails['class'];
		var strvUnits = objPutBinQueryDetails['transcationUomInternalId'];
		var makeInvAvailFlagFromSelect = objPutBinQueryDetails['makeInvAvailFlagFromSelect'];
		var  fromBinInternalId = objPutBinQueryDetails['fromBinInternalId'];
		var selectedUOMText = objPutBinQueryDetails['selectedUOMText'];
		var preferBinInternalId = objPutBinQueryDetails["preferedBinInternalId"];
		var inventoryStatusFeature = isInvStatusFeatureEnabled();

		var invstatusarray=[];
		var vTotalBinArr = [];
		if(inventoryStatusFeature == true && _isValueValid(makeInvAvailFlagFromSelect)==true)
		{
			if(makeInvAvailFlagFromSelect == 'T' || makeInvAvailFlagFromSelect == 'F')
			{
				invstatusarray=_getInventoryAvailableStatusFromCore(makeInvAvailFlagFromSelect);
			}
			else
			{ 
				invstatusarray.push('@NONE@');
				invstatusarray.push(makeInvAvailFlagFromSelect);
			}
		}

		if(_isValueValid(preferBinInternalId) && preferBinInternalId != fromBinInternalId){
			var	preferBinZone ='';
			var fields = ['custrecord_wmsse_zone'];
			var binRec = search.lookupFields({
				type: 'Bin',
				id: preferBinInternalId,
				columns: fields
			});
			if (_isValueValid(binRec)) {
				if(binRec.custrecord_wmsse_zone[0] != undefined)
				{
					preferBinZone = binRec.custrecord_wmsse_zone[0].text;
				}
			}

			if (inventoryStatusFeature) {

				var filterPreferBin = [];
				var objBinPreferBinDetails =  [];

				if (_isValueValid(strLocation))
				{
					filterPreferBin.push(search.createFilter({
						name: 'location', operator: search.Operator.ANYOF,
						values: strLocation
					}));
				}

				filterPreferBin.push(search.createFilter({
					name: 'binnumber', operator: search.Operator.ANYOF,
					values: preferBinInternalId
				}));
				if(_isValueValid(fromBinInternalId))
				{
					filterPreferBin.push(search.createFilter({
						name: 'binnumber', operator: search.Operator.NONEOF,
						values: fromBinInternalId
					}));
				}
				if (makeInvAvailFlagFromSelect != null && makeInvAvailFlagFromSelect != '' && makeInvAvailFlagFromSelect != 'null' &&
						makeInvAvailFlagFromSelect != 'undefined' && makeInvAvailFlagFromSelect != undefined) {
					if (makeInvAvailFlagFromSelect == true || makeInvAvailFlagFromSelect == false) {
						filterPreferBin.push(search.createFilter({
							name: 'inventoryavailable',
							join: 'inventorystatus',
							operator: search.Operator.IS,
							values: makeInvAvailFlagFromSelect
						}));
					}
					else {
						if (makeInvAvailFlagFromSelect != 'All') {
							filterPreferBin.push(search.createFilter({
								name: 'status', operator: search.Operator.ANYOF,
								values: makeInvAvailFlagFromSelect
							}));
						}

					}
				}

				var objPreferBinDetailsSearch = search.load({
					id: 'customsearch_wmsse_srchres_preferbin',
					type:search.Type.INVENTORY_BALANCE
				});

				var  savedFilters = objPreferBinDetailsSearch.filters;
				objPreferBinDetailsSearch.filters = savedFilters.concat(filterPreferBin);
				objBinPreferBinDetails = _getSearchResultInJSON(objPreferBinDetailsSearch);


				var preferBinAvailQtyArr = [];
				var preferBinStatusArr = [];
				var preferBinStatusIdArr = [];
				var preferBinArr = [];
				log.debug({title:'objBinPreferBinDetails',details:objBinPreferBinDetails});
				if (objBinPreferBinDetails.length > 0) {
					var selectedConvRate = objPutBinQueryDetails['selectedConversionRate'];
					var currentConvRate = objPutBinQueryDetails['stockConversionRate'];
					for (var p = 0; p < objBinPreferBinDetails.length; p++) {

						var statusMakeAvailable = objBinPreferBinDetails[p]['inventoryavailable'];
						var strBin = objBinPreferBinDetails[p]['binnumberText'];
						var strBinId = objBinPreferBinDetails[p]['binnumber'];
						var invStatus = objBinPreferBinDetails[p]['statusText'];
						var invStatusId = objBinPreferBinDetails[p]['status'];
						var vBinQtyAvail = objBinPreferBinDetails[p]['onhand'];
						var binQtyAvailWithUOM = vBinQtyAvail;// + " "+selectedUOMText;
						if(_isValueValid(selectedUOMText))
						{
							binQtyAvailWithUOM = vBinQtyAvail+ " "+selectedUOMText;
						}
						if(_isValueValid(vBinQtyAvail) && _isValueValid(selectedConvRate) && _isValueValid(currentConvRate) 
								&& (selectedConvRate != currentConvRate))
						{
							vBinQtyAvail = uomConversions(vBinQtyAvail,selectedConvRate,currentConvRate);
							if(vBinQtyAvail > 0)
							{
								binQtyAvailWithUOM = vBinQtyAvail + " "+selectedUOMText;
							}
						}
						var zone ='';

						if(parseFloat(vBinQtyAvail)==0 && preferBinArr.indexOf(strBinId) == -1)
						{
							invStatus = '';
							preferBinArr.push(strBinId);
							var currentRowValues = {'binName':strBin,'binInternalId':strBinId,'statusName':invStatus,
									'statusInternalId':invStatusId,'quantity':vBinQtyAvail,'zone':preferBinZone,'quantityWithUOM':binQtyAvailWithUOM};
							vTotalBinArr.push(currentRowValues);
						}
						else if(parseFloat(vBinQtyAvail)>0)
						{
							var currentRowValues = {'binName':strBin,'binInternalId':strBinId,'statusName':invStatus,
									'statusInternalId':invStatusId,'quantity':vBinQtyAvail,'zone':preferBinZone,'quantityWithUOM':binQtyAvailWithUOM};
							vTotalBinArr.push(currentRowValues);
						}


					}
				}

				else{
					var invStatus ='';
					var invStatusId ='';
					var vBinQtyAvail =0;
					var currentRowValues = {'binName':getPreferBin,'binInternalId':preferBinInternalId,'statusName':invStatus,
							'statusInternalId':invStatusId,'quantity':vBinQtyAvail,'zone':preferBinZone,'quantityWithUOM':vBinQtyAvail};
					vTotalBinArr.push(currentRowValues);

				}
			}
			else
			{
				var qtyDetailsArr =  getBinQtyDetails(preferBinInternalId, strLocation);
				log.debug({title:'qtyDetailsArr',details:qtyDetailsArr});
				if(qtyDetailsArr.length > 0)
				{
					for(var qtydetail in qtyDetailsArr)
					{
						var selectedConvRate = objPutBinQueryDetails['selectedConversionRate'];
						var currentConvRate = objPutBinQueryDetails['stockConversionRate'];
						var row = qtyDetailsArr[qtydetail];
						qty = row['quantityonhand'];
						var zone = '';
						var binQtyAvailWithUOM =qty;
						if(_isValueValid(selectedUOMText))
						{
							binQtyAvailWithUOM = qty+ " "+selectedUOMText;
						}
						if(_isValueValid(qty) && _isValueValid(selectedConvRate) && _isValueValid(currentConvRate)
								&& (selectedConvRate != currentConvRate))
						{
							qty = uomConversions(qty,selectedConvRate,currentConvRate);
							if(qty > 0)
							{
								binQtyAvailWithUOM = qty + " "+selectedUOMText;
							}
						}
						var currentRowValues = {'binName':row['binnumberText'],'binInternalId': row['binnumber'],
								'quantity':qty,'zone':preferBinZone,'quantityWithUOM':binQtyAvailWithUOM};
						vTotalBinArr.push(currentRowValues);
					}
				}
				else{
					var vBinQtyAvail =0;
					var currentRowValues = {'binName':getPreferBin,'binInternalId': preferBinInternalId,
							'quantity':vBinQtyAvail,'zone':preferBinZone,'quantityWithUOM':vBinQtyAvail};
					vTotalBinArr.push(currentRowValues);

				}
			}
		}

		var vBinLocArr = [];
		var vPutZoneArr = [];
		var filters = [];
		var columns = [];
		var binlocationsArray = [];
		var vPutZoneArr = [];
		var vBinLocArr = [];

		var vBinIntIdExcludeArr = [];
		var binZoneArr = [];
		if (_isValueValid(fromBinInternalId)) {
			vBinLocArr.push(fromBinInternalId);
		}
		var objPutstrategiesSearchObj = search.load({
			id: 'customsearch_wmsse_putstrategies_srh'
		});
		filters = objPutstrategiesSearchObj.filters;

		if (_isValueValid(getItemInternalId))
		{
			filters.push(search.createFilter({
				name: 'custrecord_wmsse_item',
				operator: search.Operator.ANYOF,
				values: ['@NONE@', getItemInternalId]
			}));
		}
		if (_isValueValid(strItemGrp))
		{
			filters.push(search.createFilter({
				name: 'custrecord_wmsse_itemgroup', operator: search.Operator.ANYOF,
				values: ['@NONE@', strItemGrp]
			}));
		}
		else
		{
			filters.push(search.createFilter({
				name: 'custrecord_wmsse_itemgroup', operator: search.Operator.ANYOF,
				values: ['@NONE@']
			}));
		}
		if (_isValueValid(strItemFam))
		{
			filters.push(search.createFilter({
				name: 'custrecord_wmsse_itemfamily', operator: search.Operator.ANYOF,
				values: ['@NONE@', strItemFam]
			}));
		}
		else
		{
			filters.push(search.createFilter({
				name: 'custrecord_wmsse_itemfamily', operator: search.Operator.ANYOF,
				values: ['@NONE@']
			}));
		}
		if (_isValueValid(strLocation))
		{
			filters.push(search.createFilter({
				name: 'custrecord_wmsse_location', operator: search.Operator.ANYOF,
				values: ['@NONE@', strLocation]
			}));
		}
		else
		{
			filters.push(search.createFilter({
				name: 'custrecord_wmsse_location', operator: search.Operator.ANYOF,
				values: ['@NONE@']
			}));
		}

		if (_isValueValid(strItemClass))
		{
			filters.push(search.createFilter({
				name: 'custrecord_wmsse_put_class', operator: search.Operator.ANYOF,
				values: ['@NONE@', strItemClass]
			}));
		}
		else
		{
			filters.push(search.createFilter({
				name: 'custrecord_wmsse_put_class', operator: search.Operator.ANYOF,
				values: ['@NONE@']
			}));
		}
		if (_isValueValid(strItemDepartment))
		{
			filters.push(search.createFilter({
				name: 'custrecord_wmsse_put_department', operator: search.Operator.ANYOF,
				values: ['@NONE@', strItemDepartment]
			}));
		}
		else
		{
			filters.push(search.createFilter({
				name: 'custrecord_wmsse_put_department', operator: search.Operator.ANYOF,
				values: ['@NONE@']
			}));
		}
		if (_isValueValid(strvUnits))
		{
			filters.push(search.createFilter({
				name: 'custrecord_wmsse_put_units', operator: search.Operator.ANYOF,
				values: ['@NONE@', strvUnits]
			}));
		}
		if(inventoryStatusFeature==true && invstatusarray.length > 0)
		{
			filters.push(search.createFilter({name:'custrecord_wmsse_put_invstatus', 
				operator: search.Operator.ANYOF,
				values: invstatusarray}));
		}

		objPutstrategiesSearchObj.filters = filters;

		var objPutstrategies = _getSearchResultInJSON(objPutstrategiesSearchObj);
		if (objPutstrategies.length > 0) {
			log.debug({title:'objPutstrategies',details:objPutstrategies.length});
			if (blnMixItem == 'false' || blnMixItem == false) {
				var binLocArr = fnGetInventoryBins(strLocation,getItemInternalId,null);
				if(binLocArr.length > 0)
				{
					for(var bin = 0 ; bin < binLocArr.length; bin++)
					{
						vBinLocArr.push(binLocArr[bin]);
					}
				}
			}

			if (((blnMixItem == false ||  blnMixItem == 'false') && (blnMixLot == 'false' || blnMixLot == false)) &&
					(itemType == "lotnumberedinventoryitem" || itemType == "lotnumberedassemblyitem")) {
				var binLocArr = fnGetInventoryBinsForLot(strLocation,strLot,getItemInternalId,null);
				if(binLocArr.length > 0)
				{
					for(var bin= 0 ; bin < binLocArr.length; bin++)
					{
						vBinLocArr.push(binLocArr[bin]);
					}
				}
			}
			for (var i = 0; i < objPutstrategies.length; i++) {
				var vBinLocIdArr=[];
				var vBinArr = [];
				var BinIdArr =[];
				var BinTextArr = [];
				var binZoneArr=[];
				var strPutZone = objPutstrategies[i]['custrecord_wmsse_putzone'];
				if (!_isValueValid(strPutZone))
				{
					strPutZone = "-None-";
				}
				if (strPutZone != null && strPutZone != '' && vPutZoneArr.indexOf(strPutZone) == -1) {

					vPutZoneArr.push(strPutZone);

					var filterStrat = [];

					filterStrat.push(search.createFilter({
						name: 'inactive', operator: search.Operator.IS,
						values: false
					}));

					if (_isValueValid(strPutZone)&& strPutZone != '-None-')
					{
						filterStrat.push(search.createFilter({
							name: 'custrecord_wmsse_zone', operator: search.Operator.ANYOF,
							values: strPutZone
						}));
					}

					if (_isValueValid(strLocation))
					{
						filterStrat.push(search.createFilter({
							name: 'location', operator: search.Operator.ANYOF,
							values: strLocation
						}));
					}

					if (_isValueValid(vBinLocArr))
					{
						filterStrat.push(search.createFilter({
							name: 'internalid', operator: search.Operator.NONEOF,
							values: vBinLocArr
						}));
					}

					var objBinDetailsSearch = search.load({id: 'customsearch_wmsse_binsbyzones'});
					var  savedFilters = objBinDetailsSearch.filters;
					objBinDetailsSearch.filters = savedFilters.concat(filterStrat);
					var objBinDetails = _getSearchResultInJSON(objBinDetailsSearch);//
					if (objBinDetails.length > 0) {

						for (var j = 0; j < objBinDetails.length; j++) {
							if (objBinDetails[j]['binnumber'] != getPreferBin && vBinLocArr.indexOf(objBinDetails[j]['internalid']) == -1)
							{
								vBinLocIdArr.push(objBinDetails[j]['internalid']);
								vBinArr.push(objBinDetails[j]['binnumber']);
								binZoneArr.push(objBinDetails[j]['custrecord_wmsse_zoneText']);

							}

						}
						log.debug({title:'inventoryStatusFeature',details:inventoryStatusFeature});
						//To get Bin details when Inventory status fetaure is true
						if (inventoryStatusFeature) {

							var filterInvBal = [];
							var objBinDetails =  [];
							if(vBinLocIdArr.length > 0)
							{
								if (strLocation != null && strLocation != '')
									filterInvBal.push(search.createFilter({
										name: 'location', operator: search.Operator.ANYOF,
										values: strLocation
									}));

								filterInvBal.push(search.createFilter({
									name: 'binnumber', operator: search.Operator.ANYOF,
									values: vBinLocIdArr
								}));


								if (makeInvAvailFlagFromSelect != null && makeInvAvailFlagFromSelect != '' && makeInvAvailFlagFromSelect != 'null' &&
										makeInvAvailFlagFromSelect != 'undefined' && makeInvAvailFlagFromSelect != undefined) {
									if (makeInvAvailFlagFromSelect == true || makeInvAvailFlagFromSelect == false) {
										filterInvBal.push(search.createFilter({
											name: 'inventoryavailable',
											join: 'inventorystatus',
											operator: search.Operator.IS,
											values: makeInvAvailFlagFromSelect
										}));
									}
									else {
										if (makeInvAvailFlagFromSelect != 'All') {
											filterInvBal.push(search.createFilter({
												name: 'status', operator: search.Operator.ANYOF,
												values: makeInvAvailFlagFromSelect
											}));
										}

									}
								}

								var objBinDetailsSearch = search.load({
									id: 'customsearch_wmsse_srchres_statuswise',
									type:search.Type.INVENTORY_BALANCE
								});

								var  savedFilters = objBinDetailsSearch.filters;
								objBinDetailsSearch.filters = savedFilters.concat(filterInvBal);
								objBinDetails = _getSearchResultInJSON(objBinDetailsSearch);
							}

							var BinAvailQtyArr = [];
							var BinStatusArr = [];
							var BinStatusIdArr = [];
							log.debug({title:'objBinDetails',details:objBinDetails});
							if (objBinDetails.length > 0) {
								var selectedConvRate = objPutBinQueryDetails['selectedConversionRate'];
								var currentConvRate =  objPutBinQueryDetails['stockConversionRate'];
								for (var vPutBinDtls = 0; vPutBinDtls < objBinDetails.length; vPutBinDtls++) {

									var statusMakeAvailable = objBinDetails[vPutBinDtls]['inventoryavailable'];
									var strBin = objBinDetails[vPutBinDtls]['binnumberText'];
									var strBinId = objBinDetails[vPutBinDtls]['binnumber'];
									var invStatus = objBinDetails[vPutBinDtls]['statusText'];
									var invStatusId = objBinDetails[vPutBinDtls]['status'];
									var vBinQtyAvail = objBinDetails[vPutBinDtls]['onhand'];
									var binQtyAvailWithUOM = vBinQtyAvail;// + " "+selectedUOMText;
									if(_isValueValid(selectedUOMText))
									{
										binQtyAvailWithUOM = vBinQtyAvail+ " "+selectedUOMText;
									}
									if(_isValueValid(vBinQtyAvail) && _isValueValid(selectedConvRate) && _isValueValid(currentConvRate) 
											&& (selectedConvRate != currentConvRate))
									{
										vBinQtyAvail = uomConversions(vBinQtyAvail,selectedConvRate,currentConvRate);
										if(vBinQtyAvail > 0)
										{
											binQtyAvailWithUOM = vBinQtyAvail + " "+selectedUOMText;
										}
									}
									BinIdArr.push(strBinId);
									vBinLocArr.push(strBinId);
									BinTextArr.push(strBin);
									BinAvailQtyArr.push(vBinQtyAvail);
									BinStatusArr.push(invStatus);
									BinStatusIdArr.push(invStatusId);
									var binIndex = vBinLocIdArr.indexOf(strBinId);
									var zone = binZoneArr[binIndex];
									var currentRowValues = {'binName':strBin,'binInternalId':strBinId,'statusName':invStatus,
											'statusInternalId':invStatusId,'quantity':vBinQtyAvail,'zone':zone,'quantityWithUOM':binQtyAvailWithUOM};
									vTotalBinArr.push(currentRowValues);

								}
							}
						}
						else
						{
							var qtyDetailsArr =  getBinQtyDetails(vBinLocIdArr, strLocation);
							log.debug({title:'qtyDetailsArr',details:qtyDetailsArr});
							if(qtyDetailsArr.length > 0)
							{
								for(var qtydetail in qtyDetailsArr)
								{
									var selectedConvRate = objPutBinQueryDetails['selectedConversionRate'];
									var currentConvRate = objPutBinQueryDetails['stockConversionRate'];
									var row = qtyDetailsArr[qtydetail];
									BinIdArr.push(row['binnumber']);
									vBinLocArr.push(row['binnumber']);
									qty = row['quantityonhand'];
									var binIndex = vBinLocIdArr.indexOf(row['binnumber']);
									var zone = binZoneArr[binIndex];
									var binQtyAvailWithUOM =qty;
									if(_isValueValid(selectedUOMText))
									{
										binQtyAvailWithUOM = qty+ " "+selectedUOMText;
									}
									if(_isValueValid(qty) && _isValueValid(selectedConvRate) && _isValueValid(currentConvRate)
											&& (selectedConvRate != currentConvRate))
									{
										qty = uomConversions(qty,selectedConvRate,currentConvRate);
										if(qty > 0)
										{
											binQtyAvailWithUOM = qty + " "+selectedUOMText;
										}
									}
									var currentRowValues = {'binName':row['binnumberText'],'binInternalId': row['binnumber'],
											'quantity':qty,'zone':zone,'quantityWithUOM':binQtyAvailWithUOM};
									vTotalBinArr.push(currentRowValues);
								}
							}
						}
						for (var vPutBin = 0; vPutBin < vBinLocIdArr.length; vPutBin++) {
							var blnEmpty = true;
							for (var vInvBal = 0; vInvBal < BinIdArr.length; vInvBal++) {
								if (BinIdArr[vInvBal] == vBinLocIdArr[vPutBin]) {
									blnEmpty = false;
								}
							}
							if (blnEmpty == true) {
								vBinLocArr.push(vBinLocIdArr[vPutBin]);
								var binIndex = vBinLocIdArr.indexOf(vBinLocIdArr[vPutBin]);
								var zone = binZoneArr[binIndex];
								var currentRowValues = {'binName':vBinArr[vPutBin],'binInternalId':vBinLocIdArr[vPutBin],
										'statusName':'','statusInternalId':'','quantity':'0','quantityWithUOM':'0','zone':zone};
								vTotalBinArr.push(currentRowValues);

							}
						}

						if (strPutZone != null && strPutZone != '' && strPutZone == '-None-') {
							break;
						}
					}
				}


			}
		}
		log.debug({title:'vTotalBinArr length',details:vTotalBinArr.length});
		return vTotalBinArr;

	}


	/**
	 * To get bin internal id
	 * @param Binnumber
	 * @param whLocation
	 * @returns {String}
	 */
	function getValidBinInternalId(Binnumber, whLocation, Item) {
		var bininternalId = '';
		var filter = [];
		if (Binnumber != null && Binnumber != '' && Binnumber != 'null' && Binnumber != 'undefined')
			filter.push(search.createFilter({
				name: 'binnumber', operator: search.Operator.IS,
				values: Binnumber
			}));
		filter.push(search.createFilter({
			name: 'inactive', operator: search.Operator.IS,
			values: false
		}));
		if (whLocation != null && whLocation != '' && whLocation != 'null' && whLocation != 'undefined')
			filter.push(search.createFilter({
				name: 'location', operator: search.Operator.ANYOF,
				values: whLocation
			}));
		var columns = [];
		columns[0] = search.createColumn({
			name: 'custrecord_wmsse_bin_loc_type'
		});
		var searchrecord = search.create({
			type: 'Bin',
			filters: filter,
			column: columns
		}).run().getRange({start: 0, end: 1000});
		if (searchrecord != null && searchrecord != "") {
			var vLocationType = searchrecord[0].getText({
				name: 'custrecord_wmsse_bin_loc_type'
			});
			if (vLocationType != 'WIP')
				bininternalId = searchrecord[0].id;
		}        
		filter = null;
		searchrecord = null;
		filtersku = null;
		searchitemrecord = null;
		return bininternalId;
	}

	function getOpenTaskStockCoversionRate(vUnitTypeId,vUnits)
	{
		var uomfilters=[];
		uomfilters[0]=search.createFilter({
			name: 'internalid',
			operator: search.Operator.ANYOF,
			values: vUnitTypeId
		});
		uomfilters[1]= search.createFilter({
			name: 'unitname',
			operator: search.Operator.IS,
			values: vUnits
		});
		var uomcolumns=[];
		uomcolumns[0]=search.createColumn({
			name :"conversionrate"
		});
		var uomresults= search.create({
			type : 'unitstype',
			filters : uomfilters,
			columns : uomcolumns
		}).run().getRange({ start :0,end :1000});
		var vFromRate=1;
		if(uomresults != null && uomresults != '')
		{
			//There will be only one record in the search result
			vFromRate=uomresults[0].getValue({
				name :'conversionrate'
			});
			if(vFromRate == null || vFromRate == '')
				vFromRate=1;

		}
		return vFromRate;
	}



	function fnGetInventoryBins(strLocation,ItemInternalId,binnumber) {
		var searchObj = search.load({ id : 'customsearch_wmsse_itemwise_invt_inbound'});
		if (_isValueValid(strLocation)) {
			searchObj.filters.push(search.createFilter({ name :'location',
				join :'binonhand',
				operator: search.Operator.ANYOF,
				values: strLocation
			}));
		}
		searchObj.filters.push(search.createFilter({ name :'internalid',
			operator: search.Operator.NONEOF,
			values: ItemInternalId
		}));
		searchObj.filters.push(search.createFilter({ name :'quantityonhand',
			join :'binonhand',
			operator: search.Operator.GREATERTHAN,
			values: 0
		}));
		if (_isValueValid(binnumber)) {
			searchObj.filters.push(search.createFilter({ name :'binnumber',
				join :'binonhand',
				operator: search.Operator.ANYOF,
				values: binnumber
			}));
		}
		var alltaskresults = _getSearchResultInJSON(searchObj);
		var binLocArr = [];
		if (alltaskresults.length > 0) {
			for (var f = 0; f < alltaskresults.length; f++) {
				if (binLocArr.indexOf(alltaskresults[f]['binnumber']) == -1) {
					binLocArr.push(alltaskresults[f]['binnumber']);
				}
			}
		}
		return binLocArr;
	}

	function fnGetInventoryBinsForLot(strLocation,strLot,ItemInternalId,binnumber) {
		var searchObj = search.load({id: 'customsearch_wmsse_itemwise_lots'});
		if (_isValueValid(strLocation)) {
			searchObj.filters.push(search.createFilter({ name :'location',
				join :'inventoryNumberBinOnHand',
				operator: search.Operator.ANYOF,
				values:  strLocation}));
		}
		if (_isValueValid(strLot)) {
			searchObj.filters.push(search.createFilter({
				name :'inventorynumber',
				join :'inventoryNumberBinOnHand',
				operator: search.Operator.ISNOT,
				values:  strLot}));

		}
		searchObj.filters.push(search.createFilter({
			name :'islotitem',
			operator: search.Operator.IS,
			values:  true}));
		if (_isValueValid(binnumber)) {
			searchObj.filters.push(search.createFilter({ name :'binnumber',
				join :'inventoryNumberBinOnHand',
				operator: search.Operator.ANYOF,
				values:  binnumber}));
		}
		var alltaskresults = _getSearchResultInJSON(searchObj);
		var binLocArr =[];
		if (alltaskresults.length > 0) {
			for (var f = 0; f < alltaskresults.length; f++) {
				if (binLocArr.indexOf(alltaskresults[f]['binnumber']) == -1) {
					binLocArr.push(alltaskresults[f]['binnumber']);
				}
			}
		}
		return binLocArr;
	}
	function checkIsBinEmpty(vBinId) {
		var isEmptyBinRes = true;
		var objBinDetailsSearch = search.load({
			id: 'customsearch_wmsse_srchres_statuswise',
			type:search.Type.INVENTORY_BALANCE,
		});
		var savedFilter = objBinDetailsSearch.filters ;
		if (vBinId != null && vBinId != '')
			savedFilter.push(search.createFilter({
				name: 'binnumber',
				operator: search.Operator.ANYOF,
				values: vBinId
			}));
		objBinDetailsSearch.filters = savedFilter;
		var objBinDetails = _getSearchResultInJSON(objBinDetailsSearch);
		if (objBinDetails.length > 0) {
			isEmptyBinRes = false;
		}
		return isEmptyBinRes;
	}

	//Function to get total qty against bin loaction
	function getBinwiseQtyDetails(binId, location) {
		var qtyArray = [];
		var filterStrat = [];
		if (location != null && location != '')
			filterStrat.push(search.createFilter({
				name: 'location',
				join :'binonhand',
				operator: search.Operator.ANYOF,
				values: location
			}));
		if (binId != null && binId != '')
			filterStrat.push(search.createFilter({
				name: 'binnumber',
				join :'binonhand',
				operator: search.Operator.ANYOF,
				values: binId
			}));

		var objInvDetailsSearch = search.load({id: 'customsearch_wmsse_binwise_inventory'});
		var savedFilter = objInvDetailsSearch.filters ;
		objInvDetailsSearch.filters = savedFilter.concat(filterStrat);
		var objInvDetails = _getSearchResultInJSON(objInvDetailsSearch);
		if (objInvDetails != null && objInvDetails != '' && objInvDetails.length > 0) {
			for (var s = 0; s < objInvDetails.length; s++) {
				var qty = objInvDetails[s]['quantityonhand'];
				qtyArray.push(qty);
			}
		}
		return qtyArray;
	}
	function getBinQtyDetails(binId, location) {
		var qtyArray = [];
		var filterStrat = [];
		if (location != null && location != '')
			filterStrat.push(search.createFilter({
				name: 'location',
				join :'binonhand',
				operator: search.Operator.ANYOF,
				values: location
			}));
		if (binId != null && binId != '')
			filterStrat.push(search.createFilter({
				name: 'binnumber',
				join :'binonhand',
				operator: search.Operator.ANYOF,
				values: binId
			}));

		var objInvDetailsSearch = search.load({id: 'customsearch_wmsse_binwise_inventory'});
		var savedFilter = objInvDetailsSearch.filters ;
		objInvDetailsSearch.filters = savedFilter.concat(filterStrat);
		var objInvDetails = _getSearchResultInJSON(objInvDetailsSearch);

		return objInvDetails;
	}
	function isInventoryNumberExists(item,serial,location)
	{
		var boolfound = false;
		var objDetailsSearch = search.load({id :'customsearch_wmsse_assembly_lotscan_srh'});
		var filter = objDetailsSearch.filters;
		var cols = [];
		filter.push(search.createFilter({
			name :'item',
			operator: search.Operator.ANYOF,
			values:  item
		}));
		filter.push(search.createFilter({
			name :'inventorynumber',
			operator: search.Operator.IS,
			values:  serial
		}));
		objDetailsSearch.filters = filter;
		var objDetails = objDetailsSearch.run().getRange({
			start : 0,end :1000
		});
		if(objDetails != null && objDetails != '' && objDetails.length > 0)
		{
			boolfound = true;
		}
		return boolfound ;
	}

	function getBinInternalId(Binnumber,whLocation)
	{
		var bininternalId='';
		var searchrecordSearch= search.load({
			id : 'customsearch_wmsse_woqty_bin_srh'
		});

		var filter= searchrecordSearch.filters;
		filter.push(search.createFilter({
			name :'binnumber',
			operator: search.Operator.IS,
			values:  Binnumber
		}));
		//filter.push(new nlobjSearchFilter('inactive',null, 'is',false));
		if(whLocation!=null && whLocation!='' && whLocation!='null' && whLocation!='undefined')
			filter.push(search.createFilter({
				name :'location',
				operator: search.Operator.ANYOF,
				values:  whLocation
			}));
		searchrecordSearch.filters = filter;
		var searchrecord = searchrecordSearch.run().getRange({ start : 0,end :1000});
		if(searchrecord!=null && searchrecord!="")
			bininternalId=searchrecord[0].id;

		return bininternalId;
	}


	//TODO : Have to make
	function _loadLookUpJson(processParentApp) {
		var lookUpSearchObj = search.create({
			type: dependencyLookup_CR,
			filters: [
				{
					name: 'custrecord_mobile_src_application',
					operator: search.Operator.IS,
					values: processParentApp
				}
				],
				columns: [
					{name: 'custrecord_mobile_source_id'},
					{name: 'custrecord_mobile_destination_id'}
					]
		});
		var myPagedData = lookUpSearchObj.runPaged({
			pageSize: search_page_count
		});

		myPagedData.pageRanges.forEach(function (pageRange) {
			var myPage = myPagedData.fetch({
				index: pageRange.index
			});
			myPage.data.forEach(function (result) {

				var sourceId = result.getValue({
					name: 'custrecord_mobile_source_id'
				});

				var destinationId = result.getValue({
					name: 'custrecord_mobile_destination_id'
				});

				lookUpJSON[sourceId] = destinationId;

			});
		});

	}


	function postItemReceipt(objPostIrValues)
	{

		var trantype = objPostIrValues['transactionType'];
		var poInternalId = objPostIrValues['poInternalId'];
		var FetchedItemId = objPostIrValues['fetchedItemId'];
		var poLineno = objPostIrValues['poLineno'];
		var enterQty = objPostIrValues['enterQty'];
		var enterBin = objPostIrValues['binInternalId'];
		var itemType = objPostIrValues['itemType'];
		var whLocation = objPostIrValues['whLocation'];
		var batchno =  objPostIrValues['lotno'];
		var expiryDate = objPostIrValues['lotExpiryDate'];
		var fifoDate = objPostIrValues['fifoDate'];
		var poname = objPostIrValues['tranid'];
		var  PutStrategy = objPostIrValues['PutStrategy'];
		var zoneno = objPostIrValues['zoneno'];
		var actualBeginTime = objPostIrValues['actualBeginTime'];
		var customer = objPostIrValues['customer'];
		var uom = objPostIrValues['uom'];
		var conversionRate = objPostIrValues['conversionRate'];
		var TOLineDetails=objPostIrValues['TOLineDetails'];
		var lineFullQty = objPostIrValues['lineFullQty'];
		var useitemcostflag = objPostIrValues['useitemcostflag'];
		var vInvStatus_select = objPostIrValues['invtStatus'];
		var systemRule = objPostIrValues['systemRuleValue'];
		var strBarCode = objPostIrValues['strBarCode'];
		var impctRecReturn = {};

		var idl="";
		var vCurrCompRecLine=0;
		log.debug({title:'systemRule',details:systemRule});
		if(systemRule=='N')
		{
			var itemindex=-1;
			log.debug({title:'trantype',details:trantype});
			var vCurrCompRecLine=0;
			if(trantype == 'transferorder')
			{
				log.debug({title:'itemType',details:itemType});

				var vitemfulfillmentid = '';
				var qtyEntered = enterQty;
				if(TOLineDetails.length>0)
				{
					log.debug({title:'TOLineDetails.length',details:TOLineDetails.length});
					var remainingqty=enterQty;
					var isMatched = false;
					for (var d = 0; d < TOLineDetails.length; d++)
					{
						vitemfulfillmentid = TOLineDetails[d];
						log.debug({title:'vitemfulfillmentid',details:vitemfulfillmentid});

						if(_isValueValid(vitemfulfillmentid))
						{

							trecord  = record.transform({
								fromType: record.Type.TRANSFER_ORDER,
								fromId: poInternalId,
								toType: record.Type.ITEM_RECEIPT,
								defaultValues: {itemfulfillment: vitemfulfillmentid},
								isDynamic:false
							});

							var polinelength = trecord.getLineCount({sublistId:'item'});
							log.debug({title:'polinelength',details:polinelength});
							isMatched = false;
							for (var j = 0; j < polinelength; j++)
							{
								var item_id = trecord.getSublistValue({sublistId:'item',fieldId: 'item',line: j});
								var itemrec = trecord.getSublistValue({sublistId:'item',fieldId: 'itemreceive',line: j});
								var itemLineNo = trecord.getSublistValue({sublistId:'item',fieldId: 'line',line: j});
								var itemQuantity = trecord.getSublistValue({sublistId:'item',fieldId: 'quantity',line: j});
								log.debug({title:'itemQuantity xx',details:itemQuantity});
								if( useitemcostflag == false)
								{
									itemQuantity =  enterQty;
								}

								var opentaskSearchResults=getopentaskresultsforIRPosting(poInternalId,null,item_id,itemLineNo);
								log.debug({title:'opentaskSearchResults',details:opentaskSearchResults});
								if(opentaskSearchResults.length>0)
								{
									var totalLineQty = 0;
									for(var tempItr = 0; tempItr < opentaskSearchResults.length; tempItr++)
									{
										var enterQty = opentaskSearchResults[tempItr][2];
										var toLineno = opentaskSearchResults[tempItr][0];
										if(parseFloat(toLineno) == parseFloat(itemLineNo))
											totalLineQty = parseFloat(totalLineQty) + parseFloat(enterQty);
									}
									enterQty = parseFloat(totalLineQty);
								}

								var enterQty1 =0;
								var itemLineNo = parseInt(itemLineNo) - parseInt(2);

								if ((parseInt(itemLineNo) ==  parseInt(poLineno)) && (((useitemcostflag == false || useitemcostflag == 'false') ) || 
										(parseFloat(itemQuantity) == parseFloat(enterQty))))
								{
									log.debug({title:'itemLineNo',details:itemLineNo});
									log.debug({title:'poLineno',details:poLineno});
									itemindex=j;								

									trecord.setSublistValue({sublistId: 'item',line:itemindex,fieldId: 'itemreceive',value: true});
									trecord.setSublistValue({sublistId: 'item',line:itemindex,fieldId: 'quantity',value: enterQty});
									trecord.setSublistValue({sublistId: 'item',line:itemindex,fieldId: 'location',value: whLocation});
									log.debug({title:'itemType',details:itemType});
									if (itemType == "lotnumberedinventoryitem" || itemType=="lotnumberedassemblyitem") 
									{
										var compSubRecord = trecord.getSublistSubrecord({sublistId:'item',fieldId:'inventorydetail',line:itemindex});
										var complinelength = compSubRecord.getLineCount({sublistId:'inventoryassignment'});
										if(parseInt(complinelength)>0)
										{
											for(var r1=0;r1<complinelength;r1++)
											{ 
												compSubRecord.removeLine({sublistId:'inventoryassignment',line:0});
											}
										}
										compSubRecord.setSublistValue({sublistId:'inventoryassignment',fieldId: 'quantity',line:0,value: enterQty});
										compSubRecord.setSublistValue({sublistId:'inventoryassignment',fieldId: 'receiptinventorynumber',line:0,value:batchno});
										if(enterBin!=null && enterBin!="" && enterBin!='null')
											compSubRecord.setSublistValue({sublistId:'inventoryassignment',fieldId: 'binnumber',line:0,value:enterBin});
										if(expiryDate!=null && expiryDate!="" && expiryDate!='null')
										{
											var parsedExpiryDate = format.parse({
												value: expiryDate,
												type: format.Type.DATE
											});
											compSubRecord.setSublistValue({sublistId:'inventoryassignment',fieldId: 'expirationdate',line:0,value:parsedExpiryDate});

										}
										if(vInvStatus_select != null && vInvStatus_select != "" && vInvStatus_select != 'null'  && vInvStatus_select != undefined)
											compSubRecord.setSublistValue({sublistId:'inventoryassignment', fieldId:'inventorystatus',line:0,value:vInvStatus_select});

										isMatched = true; 
									}
									else if (itemType == "inventoryitem" || itemType == "assemblyitem") 
									{
										log.debug({title:'vInvStatus_select',details:vInvStatus_select});
										if(vInvStatus_select != null && vInvStatus_select != '')
										{
											var compSubRecord = trecord.getSublistSubrecord({sublistId:'item',fieldId:'inventorydetail',line:itemindex});
											var complinelength = compSubRecord.getLineCount({sublistId:'inventoryassignment'});
											if(parseInt(complinelength)>0)
											{

												for(var r1=0;r1<complinelength;r1++)
												{ 
													log.debug({title:'r1',details:r1});
													compSubRecord.removeLine({sublistId:'inventoryassignment',line:0});
												}
											}
											compSubRecord.setSublistValue({sublistId:'inventoryassignment',fieldId: 'quantity',line:0,value: enterQty});
											if(enterBin!=null && enterBin!="" && enterBin!='null')
												compSubRecord.setSublistValue({sublistId:'inventoryassignment',fieldId: 'binnumber',line:0,value: enterBin});

											if(vInvStatus_select != null && vInvStatus_select != "" && vInvStatus_select != 'null'  && vInvStatus_select != undefined)
												compSubRecord.setSublistValue({sublistId:'inventoryassignment',fieldId: 'inventorystatus',line:0,value: vInvStatus_select});

											isMatched = true;
										}
										else
										{
											var compSubRecord = trecord.getSublistSubrecord({sublistId:'item',fieldId:'inventorydetail',line:itemindex});
											var complinelength = compSubRecord.getLineCount({sublistId:'inventoryassignment'});
											log.debug({title:'complinelength',details:complinelength});
											if(parseInt(complinelength)>0)
											{

												for(var r1=0;r1<complinelength;r1++)
												{ 
													log.debug({title:'r1',details:r1});
													compSubRecord.removeLine({sublistId:'inventoryassignment',line:0});
												}
											}

											compSubRecord.setSublistValue({sublistId:'inventoryassignment',fieldId: 'quantity',line:0,value: enterQty});
											if(enterBin!=null && enterBin!="" && enterBin!='null')
												compSubRecord.setSublistValue({sublistId:'inventoryassignment',fieldId: 'binnumber',line:0,value: enterBin});

											isMatched = true;
										}
									}
									else if (itemType == "serializedinventoryitem" || itemType=="serializedassemblyitem") 
									{
										var filterssertemp1 = [search.createFilter({
											name: 'custrecord_wmsse_ser_status',
											operator: search.Operator.IS,
											values: false
										}), search.createFilter({
											name: 'custrecord_wmsse_ser_ordline',
											operator: search.Operator.EQUALTO,
											values: parseFloat(poLineno)
										})];
										filterssertemp1.push(search.createFilter({
											name: 'custrecord_wmsse_ser_ordno',
											operator: search.Operator.ANYOF,
											values: poInternalId
										}));

										var columnssertemp1 = [];
										columnssertemp1[0] = search.createColumn({
											name: 'custrecord_wmsse_ser_no'
										});
										columnssertemp1[1] = search.createColumn({
											name: 'name'});

										columnssertemp1[1].sort = search.Sort.ASC;
										var SrchRecordTmpSerial1 = search.create({
											type: 'customrecord_wmsse_serialentry',
											filters: filterssertemp1,
											columns: columnssertemp1
										}).run().getRange({start: 0, end: 1000});

										log.debug({title:'SrchRecordTmpSerial1',details:SrchRecordTmpSerial1});
										if(SrchRecordTmpSerial1!=null && SrchRecordTmpSerial1!="")
										{
											var compSubRecord = trecord.getSublistSubrecord({sublistId:'item',fieldId:'inventorydetail',line:itemindex});

											var complinelength = compSubRecord.getLineCount({sublistId:'inventoryassignment'});
											log.debug({title:'complinelength',details:complinelength});
											if(parseInt(complinelength)>0)
											{
												for(var r1=0;r1<complinelength;r1++)
												{ 
													compSubRecord.removeLine({sublistId:'inventoryassignment',line:0});
												}
											}
											var transerresultvalues = [];
											var tranlotdetails = search.load({
												id: 'customsearch_wmsse_transf_ful_lot_detail'
											});

											var tranfilter = tranlotdetails.filters;
											log.debug({title:'poInternalId',details:poInternalId});
											log.debug({title:'FetchedItemId',details:FetchedItemId});


											if(_isValueValid(poInternalId))
											{
												tranfilter.push(search.createFilter({
													name: 'internalid',
													operator: search.Operator.ANYOF,
													values: poInternalId
												}));
											}
											tranfilter.push(search.createFilter({
												name: 'item',
												operator: search.Operator.ANYOF,
												values: FetchedItemId
											}));
											var fline = (parseFloat(poLineno) + 1);
											log.debug({title:'fline',details:fline});
											tranfilter.push(search.createFilter({
												name: 'line',
												operator: search.Operator.EQUALTO,
												values: fline
											}));


											tranlotdetails.filters = tranfilter;
											var tranlotresults = _getSearchResultInJSON(tranlotdetails);									
											log.debug({title:'tranlotresults',details:tranlotresults});
											for(var z in tranlotresults)
											{
												var seritemfulfillmentid = tranlotresults[z]['internalid'];

												log.debug({title:'seritemfulfillmentid',details:seritemfulfillmentid});
												log.debug({title:'vitemfulfillmentid',details:vitemfulfillmentid});
												var serialnumber = tranlotresults[z]['serialnumber'];
												if(seritemfulfillmentid == vitemfulfillmentid)
													transerresultvalues.push(serialnumber); 
											}
											log.debug({title:'tranlotresults',details:tranlotresults});
											log.debug({title:'vInvStatus_select',details:vInvStatus_select});
											for (var n = 0; n < SrchRecordTmpSerial1.length; n++) {

												log.debug({title:'transerresultvalues',details:transerresultvalues});
												if(transerresultvalues != null && transerresultvalues != 'null' && transerresultvalues != '' &&
														transerresultvalues.length > 0 &&
														transerresultvalues.indexOf(SrchRecordTmpSerial1[n].getValue('custrecord_wmsse_ser_no'))!= -1)
												{
													log.debug({title:'transerresultvalues  test',details:transerresultvalues});
													compSubRecord.setSublistValue({sublistId:'inventoryassignment',fieldId: 'quantity',line:n,value: 1});
													compSubRecord.setSublistValue({sublistId:'inventoryassignment',fieldId: 'receiptinventorynumber',line:n,value:SrchRecordTmpSerial1[n].getValue('custrecord_wmsse_ser_no')});

													if(enterBin!=null && enterBin!="" && enterBin!='null')
														compSubRecord.setSublistValue({sublistId:'inventoryassignment',fieldId: 'binnumber',line:n,value: enterBin});
													if(vInvStatus_select!=null && vInvStatus_select!="" && vInvStatus_select!='null'  && vInvStatus_select!='undefined')
														compSubRecord.setSublistValue({sublistId:'inventoryassignment', fieldId:'inventorystatus',line:n, value:vInvStatus_select});

													var TempRecord=SrchRecordTmpSerial1[n];
													var serialRec = record.load({type:'customrecord_wmsse_serialentry',
														id:TempRecord.id,
														isDynamic: true
													});
													serialRec.setValue({fieldId:'id',value: TempRecord.id});
													serialRec.setValue({fieldId: 'name',value: poInternalId});
													serialRec.setValue({fieldId:'custrecord_wmsse_ser_note1',
														value:'because of item receipt posted for serial number  we have marked this serial number as closed'});
													serialRec.setValue({fieldId:'custrecord_wmsse_ser_status', value:true});
													serialRec.save();
													isMatched = true;

												}

											}

										}
									}

								}
								else{
									log.debug({title:'J else',details:j});
									trecord.setSublistValue({
										sublistId: 'item',
										fieldId: 'itemreceive',
										line:j,
										value: false
									});

								}
							}
							if(trecord != null && trecord != '' && isMatched == true)
							{
								remainingqty = parseFloat(remainingqty)-parseFloat(enterQty);
								log.debug({title:'trecord',details:trecord});
								idl = trecord.save();
								log.debug({title:'idl',details:idl});
								impctRecReturn['itemreceiptid'] = idl;
							}
							if(parseFloat(remainingqty) <= 0)
							{
								break;
							}
						}


					}					
				}

			}
			else
			{
				var crossSubsidiaryFeature = isIntercompanyCrossSubsidiaryFeatureEnabled();
				log.debug({title:'crossSubsidiaryFeature',details:crossSubsidiaryFeature});
				var recordType = record.Type.PURCHASE_ORDER;
				if (trantype=='returnauthorization')
					recordType = record.Type.RETURN_AUTHORIZATION;

				var trecord =null;

				if(crossSubsidiaryFeature == true && trantype=='returnauthorization')
				{
					var locationSubsidiary = getSubsidiaryforLocation(whLocation)

					trecord  = record.transform({
						fromType: record.Type.RETURN_AUTHORIZATION,
						fromId: poInternalId,
						toType: record.Type.ITEM_RECEIPT,
						defaultValues: {orderinvtsub: locationSubsidiary},							
						isDynamic:false
					});
				}
				else
				{
					trecord  = record.transform({
						fromType: recordType,
						fromId: poInternalId,
						toType: record.Type.ITEM_RECEIPT,
						isDynamic:false
					});
				}
				var polinelength = trecord.getLineCount({sublistId:'item'});
				for (var j = 0; j < polinelength; j++) {
					var itemLineNo = trecord.getSublistValue({sublistId:'item',fieldId: 'line',line: j});
					if (parseInt(itemLineNo) ==  parseInt(poLineno))
					{
						itemindex=j;
					}
					else
					{
						trecord.setSublistValue({
							sublistId: 'item',
							fieldId: 'itemreceive',
							line:j,
							value: false
						});
					}
				}
				trecord.setSublistValue({
					sublistId: 'item',
					line:itemindex,
					fieldId: 'itemreceive',
					value: true
				});
				trecord.setSublistValue({
					sublistId: 'item',
					fieldId: 'quantity',
					line:itemindex,
					value: enterQty
				});
				trecord.setSublistValue({
					sublistId: 'item',
					fieldId: 'location',
					line:itemindex,
					value: whLocation
				});

				if (itemType == "lotnumberedinventoryitem" || itemType== "lotnumberedassemblyitem") {

					var compSubRecord = trecord.getSublistSubrecord({sublistId:'item',fieldId:'inventorydetail',line:itemindex});
					var complinelength = compSubRecord.getLineCount({sublistId:'inventoryassignment'});
					if(parseInt(complinelength)>0)
					{

						for(var vItr=0;vItr<complinelength;vItr++)
						{ 
							compSubRecord.removeLine({sublistId:'inventoryassignment',line:0});
						}
						complinelength = compSubRecord.getLineCount({sublistId:'inventoryassignment'});
					}
					compSubRecord.insertLine({
						sublistId: 'inventoryassignment',
						line:complinelength
					});
					compSubRecord.setSublistValue({sublistId:'inventoryassignment',fieldId: 'quantity',line:complinelength,value: enterQty});
					compSubRecord.setSublistValue({sublistId:'inventoryassignment',fieldId: 'receiptinventorynumber',line:complinelength,value:batchno});
					if(enterBin!=null && enterBin!="" && enterBin!='null')
						compSubRecord.setSublistValue({sublistId:'inventoryassignment',fieldId: 'binnumber',line:complinelength,value:enterBin});
					if(expiryDate!=null && expiryDate!="" && expiryDate!='null')
					{
						var parsedExpiryDate = format.parse({
							value: expiryDate,
							type: format.Type.DATE
						});
						compSubRecord.setSublistValue({sublistId:'inventoryassignment',fieldId: 'expirationdate',line:complinelength,value:parsedExpiryDate});
					}
					if(vInvStatus_select!=null && vInvStatus_select!="" && vInvStatus_select!='null'  && vInvStatus_select!='undefined')
						compSubRecord.setSublistValue({sublistId:'inventoryassignment', fieldId:'inventorystatus',line:complinelength,value:vInvStatus_select});
				}
				else if (itemType == "inventoryitem" || itemType == "assemblyitem") {
					var compSubRecord = trecord.getSublistSubrecord({sublistId:'item',fieldId:'inventorydetail',line:itemindex});
					var complinelength = compSubRecord.getLineCount({sublistId:'inventoryassignment'});
					if(parseInt(complinelength)>0)
					{

						for(var vItr=0;vItr<complinelength;vItr++)
						{ 
							compSubRecord.removeLine({sublistId:'inventoryassignment',line:0});
						}
						complinelength = compSubRecord.getLineCount({sublistId:'inventoryassignment'});
					}

					compSubRecord.insertLine({
						sublistId: 'inventoryassignment',
						line:complinelength
					});
					compSubRecord.setSublistValue({sublistId:'inventoryassignment',fieldId: 'quantity',line:complinelength,value: enterQty});
					if(enterBin!=null && enterBin!="" && enterBin!='null')
						compSubRecord.setSublistValue({sublistId:'inventoryassignment',fieldId: 'binnumber',line:complinelength,value: enterBin});
					if(vInvStatus_select!=null && vInvStatus_select!="" && vInvStatus_select!='null'  && vInvStatus_select!='undefined')
						compSubRecord.setSublistValue({sublistId:'inventoryassignment',fieldId: 'inventorystatus',line:complinelength,value: vInvStatus_select});
				}
				else if (itemType == "serializedinventoryitem" || itemType== "serializedassemblyitem") {
					var serialSearch = search.load({
						id: 'customsearch_wmsse_wo_serialentry_srh',
					});
					var serailFilters = serialSearch.filters;

					serailFilters.push(search.createFilter({name:'custrecord_wmsse_ser_ordline',
						operator: search.Operator.EQUALTO,
						values:poLineno }));
					serailFilters.push(search.createFilter({name:'custrecord_wmsse_ser_ordno',
						operator: search.Operator.ANYOF,
						values:poInternalId }));

					serialSearch.filters = serailFilters;
					var serialSearchResults =_getSearchResultInJSON(serialSearch);
					if(serialSearchResults !=null && serialSearchResults !="" && serialSearchResults != 'null' 
						&& serialSearchResults.length > 0)
					{
						log.debug('serialSearchResults',serialSearchResults.length);
						var compSubRecord = trecord.getSublistSubrecord({sublistId:'item',fieldId:'inventorydetail',line:itemindex});
						var complinelength = compSubRecord.getLineCount({sublistId:'inventoryassignment'});

						if(parseInt(complinelength)>0)
						{

							for(var vItr=0;vItr<complinelength;vItr++)
							{ 
								compSubRecord.removeLine({sublistId:'inventoryassignment',line:0});
							}
							complinelength = compSubRecord.getLineCount({sublistId:'inventoryassignment'});
						}
						var tLineNo = complinelength;
						for (var n = 0; n < serialSearchResults.length; n++) {
							if(n > 0)
							{
								tLineNo = parseInt(complinelength) + 1;
							}
							compSubRecord.insertLine({
								sublistId: 'inventoryassignment',
								line:tLineNo
							});
							compSubRecord.setSublistValue({sublistId:'inventoryassignment',fieldId: 'quantity',line:tLineNo,value: 1});
							compSubRecord.setSublistValue({sublistId:'inventoryassignment',fieldId: 'receiptinventorynumber',line:tLineNo,value:serialSearchResults[n]['custrecord_wmsse_ser_no']});
							if(enterBin!=null && enterBin!="" && enterBin!='null')
							{
								compSubRecord.setSublistValue({sublistId:'inventoryassignment',fieldId: 'binnumber',line:tLineNo,value: enterBin});
							}
							if(vInvStatus_select!=null && vInvStatus_select!="" && vInvStatus_select!='null' && vInvStatus_select!='undefined')
							{
								compSubRecord.setSublistValue({sublistId:'inventoryassignment', fieldId:'inventorystatus',line:tLineNo, value:vInvStatus_select});
							}
						}


					}

				}
				if(trecord != null && trecord != '')
				{
					idl = trecord.save();
					impctRecReturn['itemreceiptid'] = idl;
				}
			}
		}

		if(!_isValueValid(idl)){
			impctRecReturn['itemreceiptid'] = null;
		}

		if((idl != '' && idl != null && idl != 'null' && idl != undefined) || (systemRule!=null && systemRule!='' && systemRule=='Y'))
		{
			var taskType="PUTW";
			var opentaskObj = {};
			opentaskObj['poInternalId']= poInternalId;
			opentaskObj['FetchedItemId']=FetchedItemId ;
			opentaskObj['poLineno']= poLineno;
			opentaskObj['enterQty']=enterQty ;
			opentaskObj['enterBin']=enterBin ;
			opentaskObj['itemType']=itemType ;
			opentaskObj['whLocation']=whLocation ;
			opentaskObj['batchno']=batchno ;
			opentaskObj['expiryDate']=expiryDate ;
			opentaskObj['fifoDate']=fifoDate ;
			opentaskObj['itemReceiptId']= idl;
			opentaskObj['poname']=poname ;
			opentaskObj['PutStrategy']=PutStrategy ;
			opentaskObj['zoneno']= zoneno;
			opentaskObj['taskType']=taskType ;
			opentaskObj['trantype']=trantype ;
			opentaskObj['actualBeginTime']= actualBeginTime;
			opentaskObj['systemRule']= systemRule;
			opentaskObj['uom']=uom ;
			opentaskObj['conversionRate']= conversionRate;
			opentaskObj['vInvStatus_select']= vInvStatus_select;
			opentaskObj['strBarCode']=strBarCode;
			idl =	updateOpenTask(opentaskObj);

			if(_isValueValid(idl)){
				impctRecReturn['openTaskId'] = idl;

				// serach to get labels.
				var labelSearch = search.load({
					type : 'customrecord_wmsse_labelprinting',
					id : 'customsearch_wms_label_dtls'
				});
				labelSearch.filters.push(search.createFilter({
					name : 'name',
					operator : search.Operator.IS,
					values : poname
				}));

				labelSearch.filters.push(search.createFilter({
					name : 'custrecord_wmsse_label_opentaskid',
					operator : search.Operator.IS,
					values : idl
				}));
				labelSearch.filters.push(search.createFilter({
					name : 'custrecord_wmsse_label_location',
					operator : search.Operator.IS,
					values : whLocation
				}));

				var result = _getSearchResultInJSON(labelSearch);
				var labelrecArr = [];

				if(_isValueValid(result) && result.length > 0){
					for(var i=0; i< result.length; i++){
						labelrecArr.push(parseInt(result[i]['internalid']));
					}
					impctRecReturn['labelrec'] = labelrecArr;
				}else{
					impctRecReturn['labelrec'] = labelrecArr;
				}


				// serach to get External labels.
				var extlabelSearch = search.load({
					type : 'customrecord_wmsse_ext_labelprinting',
					id : 'customsearch_wms_ext_label_id_dtls'
				});
				extlabelSearch.filters.push(search.createFilter({
					name : 'name',
					operator : search.Operator.IS,
					values : poname
				}));

				extlabelSearch.filters.push(search.createFilter({
					name : 'custrecord_wmsse_label_ext_opentaskid',
					operator : search.Operator.IS,
					values : idl
				}));

				var extLabelResult = _getSearchResultInJSON(extlabelSearch);
				var extlabelrecArr = [];

				if(_isValueValid(extLabelResult) && extLabelResult.length > 0){
					for(var i=0; i< extLabelResult.length; i++){
						extlabelrecArr.push(parseInt(extLabelResult[i]['internalid']));
					}
					impctRecReturn['extlabelrec'] = extlabelrecArr;
				}else{
					impctRecReturn['extlabelrec'] = extlabelrecArr;
				}			
			}

		}
		return impctRecReturn;

	}

	function updateOpenTask(objOpentaskDetails)
	{

		var poInternalId = objOpentaskDetails['poInternalId'];
		var FetchedItemId = objOpentaskDetails['FetchedItemId'];
		var poLineno = objOpentaskDetails['poLineno'];
		var enterQty = objOpentaskDetails['enterQty'];
		var enterBin = objOpentaskDetails['enterBin'];
		var itemType = objOpentaskDetails['itemType'];
		var whLocation = objOpentaskDetails['whLocation'];			
		var idl = objOpentaskDetails['itemReceiptId'];
		var poname = objOpentaskDetails['poname'];
		var PutStrategy = objOpentaskDetails['PutStrategy'];
		var zoneno = objOpentaskDetails['zoneno'];
		var taskType = objOpentaskDetails['taskType'];
		var trantype = objOpentaskDetails['trantype'];
		var actualBeginTime = objOpentaskDetails['actualBeginTime'];
		var customer = objOpentaskDetails['customer'];
		var systemRule = objOpentaskDetails['systemRule'];
		var beginLoc = objOpentaskDetails['beginLoc'];
		var uom = objOpentaskDetails['uom'];
		var conversionRate = objOpentaskDetails['conversionRate'];
		var ordQty = objOpentaskDetails['ordQty'];
		var ordType = objOpentaskDetails['ordType'];
		var department = objOpentaskDetails['department'];
		var vclass = objOpentaskDetails['vclass'];
		var vInvStatus_select = objOpentaskDetails['vInvStatus_select'];
		var strBarCode = objOpentaskDetails['strBarCode'];
		var openTaskRecord = record.create({
			type : 'customrecord_wmsse_trn_opentask'

		});
		if(_isValueValid(poname))
		{
			openTaskRecord.setValue({ fieldId :'name',value :poname});
		}
		var currDate = DateStamp();
		var parsedCurrentDate = format.parse({
			value: currDate,
			type: format.Type.DATE
		});
		openTaskRecord.setValue({fieldId :'custrecord_wmsse_act_begin_date',value: parsedCurrentDate});
		openTaskRecord.setValue({fieldId :'custrecord_wmsse_act_end_date',value: parsedCurrentDate});
		openTaskRecord.setValue({fieldId :'custrecord_wmsse_act_qty',value: Number(Big(enterQty).toFixed(5))});
		if(_isValueValid(uom))      
		{
			openTaskRecord.setValue({fieldId:'custrecord_wmsse_uom',value: uom});
		}
		if(_isValueValid(conversionRate))
		{
			openTaskRecord.setValue({fieldId : 'custrecord_wmsse_conversionrate',value :conversionRate});
		}

		openTaskRecord.setValue({fieldId : 'custrecord_wmsse_sku',value : FetchedItemId });
		openTaskRecord.setValue({ fieldId :'custrecord_wmsse_line_no',value : poLineno});
		openTaskRecord.setValue({fieldId : 'custrecord_wmsse_expe_qty',value: Number(Big(enterQty).toFixed(5))});
		if(taskType=="PUTW")
		{
			openTaskRecord.setValue({fieldId : 'custrecord_wmsse_wms_status_flag',value : 3});//putaway completed
			openTaskRecord.setValue({fieldId : 'custrecord_wmsse_tasktype',value : 2}); //For PUTW
			if(_isValueValid(strBarCode))
			{
				openTaskRecord.setValue({fieldId : 'custrecord_wmsse_compositebarcode_string',value :strBarCode});
			}
			/*if(_isValueValid(InbcontainerId))
				{
					openTaskRecord.setValue({fieldId : 'custrecord_wmsse_inboundcontainer',value: InbcontainerId});
				}*/
		}
		else
		{
			var componentitemExpectedQty = objOpentaskDetails['componentitemExpectedQty'];
			var componentitemActualQty = objOpentaskDetails['componentitemActualQty'];
			var parentItem = objOpentaskDetails['parentItem'];
			var kitFlag =objOpentaskDetails['kitFlag'];
			var shipMethod = objOpentaskDetails['shipMethod'];
			var PickreportNo = objOpentaskDetails['PickreportNo'];
			//	var InbcontainerId = objOpentaskDetails['InbcontainerId'];
			var PickStrategy = objOpentaskDetails['PickStrategy'];
			var carton = objOpentaskDetails['carton'];
			var cartonSize = objOpentaskDetails['cartonSize'];
			var cartonWeight= objOpentaskDetails['cartonWeight'];
			var isItLastPick = objOpentaskDetails['isItLastPick'];
			if(_isValueValid(componentitemExpectedQty))
			{
				openTaskRecord.setValue({fieldId :'custrecord_wmsse_compitm_expqty',value: componentitemExpectedQty});
			}
			if(_isValueValid(componentitemActualQty))
			{
				openTaskRecord.setValue({fieldId :'custrecord_wmsse_compitm_actqty',value: componentitemActualQty});
			}
			if(_isValueValid(parentItem))
			{
				openTaskRecord.setValue({fieldId :'custrecord_wmsse_parent_sku_no',value: parentItem });
			}
			if(_isValueValid(shipMethod))
			{
				openTaskRecord.setValue({fieldId :'custrecord_wmsse_shipmethod',value: shipMethod});
			}
			openTaskRecord.setValue({fieldId : 'custrecord_wmsse_wms_status_flag',value: 8 });//picking completed
			openTaskRecord.setValue({fieldId : 'custrecord_wmsse_tasktype',value : 3}); //For Pick
			var vDate=parsedCurrentDate;
			var vTime=getConvertedTimeStamp();
			var vNewDate=vDate + ' ' + vTime;

			openTaskRecord.setValue({fieldId :'custrecord_wmsse_pick_comp_date', value :vNewDate });
			if(_isValueValid(ordQty))
			{
				openTaskRecord.setValue({fieldId :'custrecord_wmsse_expe_qty',value : Number(Big(ordQty).toFixed(5)) });
			}
			if(_isValueValid(PickreportNo))
			{
				openTaskRecord.setValue({fieldId :'custrecord_wmsse_pickreport_no',value: PickreportNo});
			}
			if(_isValueValid(carton))
			{
				openTaskRecord.setValue({fieldId :'custrecord_wmsse_container_lp_no',value : carton});
			}
			if(_isValueValid(cartonSize))
			{
				openTaskRecord.setValue({fieldId :'custrecord_wmsse_container_size',value: cartonSize});
			}
			if(_isValueValid(cartonWeight))
			{
				openTaskRecord.setValue({fieldId :'custrecord_wmsse_containerweight',value: cartonWeight});
			}
			if(_isValueValid(isItLastPick))
			{
				openTaskRecord.setValue({fieldId :'custrecord_wmsse_device_upload_flag',value: isItLastPick});
			}
			if(_isValueValid(kitFlag))
			{
				openTaskRecord.setValue({fieldId :'custrecord_wmsse_kitflag',value: kitFlag});
				openTaskRecord.setValue({fieldId :'custrecord_wmsse_act_qty',value :''});
			}
			if(_isValueValid(PickStrategy))
			{
				openTaskRecord.setValue({fieldId :'custrecord_wmsse_pick_strategy',value: PickStrategy});
			}
		}
		if(_isValueValid(enterBin))
		{
			openTaskRecord.setValue({fieldId :'custrecord_wmsse_actbeginloc',value : enterBin});
			openTaskRecord.setValue({fieldId : 'custrecord_wmsse_actendloc',value : enterBin });
		}
		if(_isValueValid(beginLoc))
		{
			openTaskRecord.setValue({fieldId :'custrecord_wmsse_actbeginloc', value :beginLoc});
		}
		if (itemType == translator.getTranslationString("ITEMTYPE_LOT" )|| itemType== translator.getTranslationString("ITEMTYPE_LOT_ASSEMBLY")) {
			var batchno = objOpentaskDetails['batchno'];
			var expiryDate =objOpentaskDetails['expiryDate'];
			var fifoDate = objOpentaskDetails['fifoDate'];

			if(_isValueValid(batchno))
			{
				openTaskRecord.setValue({fieldId :'custrecord_wmsse_batch_num',value : batchno});
			}
			if(_isValueValid(expiryDate))
			{
				var parsedExpiryDate = format.parse({
					value: expiryDate,
					type: format.Type.DATE
				});
				openTaskRecord.setValue({fieldId :'custrecord_wmsse_expirydate',value : parsedExpiryDate});
			}
			else
			{
				var lotInternalId='';
				if(_isValueValid(batchno))
				{
					lotInternalId = getLotInternalId(batchno);
				}
				if(_isValueValid(lotInternalId))
				{
					var lotLookUp = search.lookupFields({
						type: search.Type.INVENTORY_NUMBER,
						id: lotInternalId,
						columns: ['inventorynumber', 'expirationdate']
					});
					var vexpiryDate = lotLookUp.expirationdate;
					var parsedExpiryDate = null;
					if(_isValueValid(vexpiryDate))
					{
						parsedExpiryDate = format.parse({
							value: vexpiryDate,
							type: format.Type.DATE
						});
					}
					if(_isValueValid(parsedExpiryDate))
					{
						openTaskRecord.setValue({fieldId :'custrecord_wmsse_expirydate',value : parsedExpiryDate});
					}
				}
			}
			if(_isValueValid(fifoDate))
			{
				var parsedFifoDate = format.parse({
					value: fifoDate,
					type: format.Type.DATE
				});
				openTaskRecord.setValue({fieldId :'custrecord_wmsse_fifodate',value :parsedFifoDate});
			}

		}
		if (itemType == translator.getTranslationString("ITEMTYPE_SERIAL") || itemType== translator.getTranslationString("ITEMTYPE_SERIAL_ASSEMBLY")) {

			var serialSearch = search.load({
				id: 'customsearch_wmsse_wo_serialentry_srh',
			});
			var serailFilters = serialSearch.filters;

			serailFilters.push(search.createFilter({
				name:'custrecord_wmsse_ser_ordline',
				operator: search.Operator.EQUALTO,
				values : poLineno
			}));
			serailFilters.push(search.createFilter({
				name:'custrecord_wmsse_ser_ordno',
				operator: search.Operator.ANYOF,
				values : poInternalId
			}));

			serialSearch.filters = serailFilters;
			var serialSearchResults =_getSearchResultInJSON(serialSearch);
			if(serialSearchResults !=null && serialSearchResults !="" && serialSearchResults != 'null' && serialSearchResults.length > 0)
			{
				var serialArray='';
				for (var n = 0; n < serialSearchResults.length; n++) {
					if(serialArray==null || serialArray=='')
						serialArray=serialSearchResults[n]['custrecord_wmsse_ser_no'];
					else
						serialArray=serialArray+","+serialSearchResults[n]['custrecord_wmsse_ser_no'];
				}
				openTaskRecord.setValue({fieldId:'custrecord_wmsse_serial_no',value: serialArray });
				if(systemRule==null || systemRule=='' || systemRule=='N')
				{
					for (var j = 0; j < serialSearchResults.length; j++) {
						var TempRecord = serialSearchResults[j];
						var serialRec = record.load({type:'customrecord_wmsse_serialentry',
							id:serialSearchResults[j].id,
							isDynamic: true
						});
						serialRec.setValue({fieldId:'id',value: TempRecord.id});
						serialRec.setValue({fieldId: 'name',value: TempRecord.name});
						serialRec.setValue({fieldId:'custrecord_wmsse_ser_note1',
							value:'because of serial number is updated in opentask we have marked this serial number as closed'});
						serialRec.setValue({fieldId:'custrecord_wmsse_ser_status', value:true});
						serialRec.save();
					}
				}

			}
		}
		openTaskRecord.setValue({fieldId :'custrecord_wmsse_order_no',value : poInternalId });
		openTaskRecord.setValue({fieldId :'custrecord_wmsse_wms_location',value : whLocation});
		if(_isValueValid(PutStrategy))
		{
			openTaskRecord.setValue({fieldId :'custrecord_wmsse_put_strategy',value: PutStrategy});
		}

		if(_isValueValid(zoneno))
		{
			openTaskRecord.setValue({fieldId :'custrecord_wmsse_zone_no',value: zoneno });
		}

		openTaskRecord.setValue({fieldId :'custrecord_wmsse_parent_sku_no',value :FetchedItemId });
		if(_isValueValid(idl))
		{
			openTaskRecord.setValue({fieldId :'custrecord_wmsse_nsconfirm_ref_no',value : idl });
		}
		var currentUserID = runtime.getCurrentUser();
		openTaskRecord.setValue({fieldId :'custrecord_wmsse_upd_user_no',value: currentUserID.id });
		if(_isValueValid(actualBeginTime))
		{
			var parsedBeginTime = parseTimeString(actualBeginTime);
			openTaskRecord.setValue({fieldId :'custrecord_wmsse_actualbegintime',value: parsedBeginTime});
		}
		var timeStamp=getCurrentTimeStamp();
		if(_isValueValid(timeStamp))
		{
			var timeString = parseTimeString(timeStamp);
			openTaskRecord.setValue({fieldId :'custrecord_wmsse_actualendtime', value: timeString});
		}
		if(_isValueValid(customer))
		{
			openTaskRecord.setValue({fieldId :'custrecord_wmsse_customer',value: customer});
		}

		if(_isValueValid(ordType))
		{
			openTaskRecord.setValue({fieldId :'custrecord_wmsse_ord_type',value: ordType});
		}
		if(_isValueValid(department))
		{
			openTaskRecord.setValue({fieldId :'custrecord_wmsse_dept',value: department});
		}
		if(_isValueValid(vclass))
		{
			openTaskRecord.setValue({fieldId :'custrecord_wmsse_classification',value: vclass });
		}

		if(_isValueValid(vInvStatus_select))
		{
			openTaskRecord.setValue({fieldId :'custrecord_wmsse_inventorystatus',value: vInvStatus_select});
		}
		var recid = openTaskRecord.save();
		openTaskRecord=null;
		if(recid!=null && recid!='')
		{
			var lockSearch = search.create({
				type: 'customrecord_wmsse_lockrecs',
				filters:[{name:'custrecord_wmsse_trantype',operator:'IS',values:trantype},
					{name:'custrecord_wmsse_order',operator:'ANYOF',values:poInternalId},
					{name:'custrecord_wmsse_line',operator:'EQUALTO',values:poLineno},
					{name:'custrecord_wmsse_lockflag',operator:'IS',values:true}],
					columns:[{name:'custrecord_wmsse_user'}]
			});

			var lockSearchResults = lockSearch.run().getRange({start:0,end:1000});

			if(lockSearchResults !=null && lockSearchResults !='' && lockSearchResults != 'null' && lockSearchResults != undefined
					&& lockSearchResults != 'undefined' && lockSearchResults.length > 0)
			{
				for(var lockItr = 0;lockItr < lockSearchResults.length;lockItr ++)
				{
					var lockRecordId=lockSearchResults[lockItr].id;
					var lockDeleteRecordId = record.delete({
						type: 'customrecord_wmsse_lockrecs',
						id: lockRecordId
					});
				}
				LockDeleteRecordId=null;
			}
			lockresults=null;
			lockcolumns=null;
			lockfilters=null;
			var locBinFilters = [];
			locBinFilters.push(search.createFilter({name:'custrecord_wmse_lock_sku',
				operator: search.Operator.ANYOF,
				values : FetchedItemId
			}));
			if(enterBin != null && enterBin != '' && enterBin != 'null' && enterBin != 'undefined')
			{
				locBinFilters.push(search.createFilter({name:'custrecord_wmsse_lock_binlocation',
					operator: search.Operator.ANYOF,
					values : enterBin
				}));
			}
			locBinFilters.push(search.createFilter({name:'custrecord_wmsse_lock_flag',
				operator: search.Operator.IS,
				values : true
			}));
			locBinFilters.push(search.createFilter({name:'custrecord_wmsse_lockuser',
				operator: search.Operator.ANYOF,
				values : currentUserID.id
			}));

			var lockBinSearch = search.create({
				type: 'customrecord_wmsse_lockbin',
				filters:locBinFilters,
				columns:[{name:'custrecord_wmsse_lockuser'}]
			});
			var lockBinSearchResults = lockBinSearch.run().getRange({start:0,end:1000});
			if(lockBinSearchResults !=null && lockBinSearchResults !='null' &&  lockBinSearchResults  !='' 
				&& lockBinSearchResults != 'undefined')
			{
				var lockBinRecordId=lockBinSearchResults[0].id;
				var lockDeleteRecordId = record.delete({
					type: 'customrecord_wmsse_lockbin',
					id: lockBinRecordId
				});
			}
		}
		currentUserID=null;

		return recid;
	}

	/**
	 * Parses time string to date object for TIMEOFDAY field
	 * @param time
	 * @returns {Date}
	 */
	function parseTimeString(time){

		if(time == null || time== ''){
			var date = new convertDate();
			return date;
		}

		var timeStamp = format.parse({value: time, type: format.Type.TIMEOFDAY})
		log.debug({title:'parseTimeString timestamp',details:timeStamp});
		return timeStamp;
	}

	function getLotInternalId(batchno,FetchedItemId)
	{
		var lotInternalId='';
		var lotSearch = search.create({
			type:search.Type.INVENTORY_NUMBER,
			filters:[{name:'inventorynumber',operator:'is',values:batchno}]
		})

		var lotResults = lotSearch.run().getRange({start:0,end:1000});
		if(lotResults.length > 0)
		{
			lotInternalId=lotResults[0].id;
		}

		return lotInternalId;
	}
	function DateSetting()
	{
		var loadConfig = config.load({
			type: config.Type.USER_PREFERENCES
		});
		var setpreferencesdateformate = loadConfig.getValue({fieldId:'DATEFORMAT'});

		return setpreferencesdateformate;
	}
	function TimeSetting()
	{
		var loadConfig = config.load({
			type: config.Type.USER_PREFERENCES
		});
		var setpreferencestimeformat = loadConfig.getValue({fieldId:'TIMEFORMAT'});

		return setpreferencestimeformat;
	}
	function DateStamp(){
		var now = convertDate();
		var dtsettingFlag = DateSetting();

		if(dtsettingFlag == 'DD/MM/YYYY')
		{
			return ((parseFloat(now.getDate())) + '/' + (parseFloat(now.getMonth()) + 1) + '/' +now.getFullYear());
		}
		else if(dtsettingFlag == 'MM/DD/YYYY')
		{
			return ((parseFloat(now.getMonth()) + 1) + '/' + (parseFloat(now.getDate())) + '/' + now.getFullYear());
		}
		else
		{
			var formattedDateString = format.format({
				value: now,
				type: format.Type.DATE
			});

			return formattedDateString;
		}
		//
	}

	function convertDate(DS){//DS(true/false) pass true for daylight saving.
		if(DS==null || DS=='')
			DS=true;

		var date = new Date(); // get current date

		var loadConfig = config.load({
			type: config.Type.USER_PREFERENCES,
			isDynamic:true
		});
		var getTimeZone = loadConfig.getText({fieldId:'TIMEZONE'});
		var timezoneDate;
		var getOffset = '';
		var vgetOffsetDecimals='';
		var vTempOffsetDecimals='';
		if(getTimeZone != '(GMT) Greenwich Mean Time : Dublin, Edinburgh, Lisbon, London' && getTimeZone != '(GMT) Casablanca' && getTimeZone != '(GMT) Monrovia, Reykjavik'){
			getOffset = getTimeZone.substring(4, 7);
			var vgetSign= getTimeZone.substring(4, 5);
			vTempOffsetDecimals= getTimeZone.substring(4, 10);
			if(vTempOffsetDecimals.indexOf(':00')==-1)
			{
				vTempOffsetDecimals= getTimeZone.substring(8, 10);
				vTempOffsetDecimals=vTempOffsetDecimals/60;
				if(vgetSign == '-')
				{
					var vTempgetOffset=parseInt(getOffset)-parseFloat(vTempOffsetDecimals);
					getOffset = vTempgetOffset;
				}
				else
				{
					var vTempgetOffset=parseInt(getOffset)+parseFloat(vTempOffsetDecimals);
					getOffset = vgetSign + vTempgetOffset;
				}
			}
			else
				vTempOffsetDecimals="";

		}else{
			getOffset = 1; // under 3 timezones above are equal to UTC which is zero difference in hours
		}
		var UTCDate = date.getTime() + (date.getTimezoneOffset() * 60000); // convert current date into UTC (Coordinated Universal Time)
		timezoneDate = new Date(UTCDate + (3600000*getOffset)); //create new date object with, subtract if customer timezone is behind UTC and add if ahead
		if(DS)
		{
			var timezoneDateDayLight = new Date(timezoneDate.getTime() + 60*60000); // add 1 hour customer's timezone is currently under daylight saving
			return timezoneDateDayLight;

		}else{
			return timezoneDate;
		}
	}
	function getCurrentTimeStamp(){

		//var timestamp;
		/*	NEED TO DELETE THE BELOW COMMENTED CODE
	 var now = convertDate();    //  

		log.debug({title:'convertDate',details:convertDate});
		var a_p = "";
		//Getting time in hh:mm tt format.
		var curr_hour = now.getHours();
		var curr_min = now.getMinutes();
		var curr_sec = now.getSeconds();
		// determining the am/pm indicator
		if (curr_hour < 12)
			a_p = "am";
		else
			a_p = "pm";
		// finalizing hours depending on 24hr clock
		if (curr_hour == 0)
			curr_hour = 12;
		else if(curr_hour > 12)
			curr_hour -= 12;
		if (curr_min.toString().length == 1)
			curr_min = "0" + curr_min;
		//Adding fields to update time zones.
		var vTimeFormat = TimeSetting();
		log.debug({title:'vTimeFormat',details:vTimeFormat});
		if(vTimeFormat =='fmHH:fmMI am')
		{
			timestamp = curr_hour + ":" + curr_min + " " + a_p;
		}
		else if(vTimeFormat =='fmHH-fmMI am')
		{
			timestamp = curr_hour + "-" + curr_min + " " + a_p;
		}
		else if(vTimeFormat =='fmHH24:fmMI')
		{
			curr_hour = parseInt(curr_hour)+12;
			if(parseInt(curr_hour) == 24)
				curr_hour = 0;
			timestamp = curr_hour + ":" + curr_min;
		}
		else
		{
			curr_hour = parseInt(curr_hour)+12;
			if(parseInt(curr_hour) == 24)
				curr_hour = 0;
			timestamp = curr_hour + "-" + curr_min;
		}
		log.debug({title:'timestamp',details:timestamp});*/

		var now = new convertDate(); 
		var timeStamp = format.format({value: now, type: format.Type.TIMEOFDAY}) ;
		log.debug({title:'getCurrentTimeStamp timestamp',details:timeStamp});
		return timeStamp;
	}

	function setExpiryDate(expiryDateFormat,vmonth,vday,vyear)
	{
		var dateObj = new Date(vyear,vmonth-1,vday);
		var expDate = format.format({
			value: dateObj,
			type: format.Type.DATE
		});

		return expDate;
	}
	function _createDynamicSearchOnRoleForSubsidaries(){
		//This needs to be via code as saved search load on role is failing with internal error.
		var vRolefilters=[];

		vRolefilters.push(search.createFilter({
			name: 'isinactive',
			operator: search.Operator.IS,
			values : false
		}));

		var vRoleColumns=[];
		vRoleColumns.push(search.createColumn({
			name :'name'
		}));
		vRoleColumns.push(search.createColumn({
			name :'subsidiaries'
		}));

		return search.create({
			type :'Role',
			filters :vRolefilters,
			columns : vRoleColumns
		});
	}
	/**
	 * This function gets Role based locations list.
	 * @returns {String}
	 */
	function getRoleBasedLocation()
	{
		var subs = runtime.isFeatureInEffect({
			feature : 'subsidiaries'
		});
		var user = runtime.getCurrentUser();
		var vRoleLocation=[];
		var vEmpRoleLocation=user.location;

		if(subs==true)
		{
			var vSubsid=user.subsidiary;
			var vRoleid=user.role;
			var vRoleSubsidArray = [];

			if(_isValueValid(vRoleid))
			{
				var roleSearch = _createDynamicSearchOnRoleForSubsidaries();
				var roleFilters = roleSearch.filters;

				roleFilters.push(search.createFilter({
					name: 'internalid',
					operator: search.Operator.ANYOF,
					values : vRoleid
				}));
				roleSearch.filters = roleFilters;
				var rolesSearchResult = _getSearchResultInJSON(roleSearch);
				for(var i=0;i<rolesSearchResult.length;i++)
				{
					var vnRoleSubsid=rolesSearchResult[i]['subsidiaries'];
					if(vnRoleSubsid != '')
					{
						vRoleSubsidArray.push(vnRoleSubsid);
					}
				}
			}
			var filterForLocation = [];
			if(vRoleSubsidArray.length > 0) {
				filterForLocation.push(search.createFilter({

					name: 'subsidiary',
					operator: search.Operator.ANYOF,
					values : vRoleSubsidArray
				}));
			}
			else if(_isValueValid(vSubsid))
			{
				filterForLocation.push(search.createFilter({
					name: 'subsidiary',
					operator: search.Operator.ANYOF,
					values : vSubsid
				}));
			}

			if(vEmpRoleLocation!=null && vEmpRoleLocation!='') {
				filterForLocation.push(search.createFilter({
					name: 'internalid',
					operator: search.Operator.IS,
					values: vEmpRoleLocation
				}));
			}

			var roleBasedLocationSearch = search.load({id:'customsearch_wmsse_getrolelocation'});
			var roleBasedLocationSearchFilter = roleBasedLocationSearch.filters;
			for(var i = 0; i< filterForLocation.length; i++)
			{
				//append our custom filtering conditions
				roleBasedLocationSearchFilter.push(filterForLocation[i])
			}
			roleBasedLocationSearch.filters = roleBasedLocationSearchFilter;
			var roleBasedLocations = _getSearchResultInJSON(roleBasedLocationSearch);

			for(var i = 0; i<roleBasedLocations.length; i++)
			{
				vRoleLocation.push(roleBasedLocations[i]['id']);
			}
		}

		//common for both subs=T||F
		if(vEmpRoleLocation !=null && vEmpRoleLocation !='' && vEmpRoleLocation !=0)
		{
			var vLocname= search.lookupFields({
				type :'location',
				id :vEmpRoleLocation,
				columns : 'name'
			});

			var roleBasedLocationSearch = search.load({id:'customsearch_wmsse_getrolelocation'});
			var roleBasedLocations = _getSearchResultInJSON(roleBasedLocationSearch);

			for (var i = 0; i <roleBasedLocations.length; i++) {
				var loc_name = roleBasedLocations[i]['name'];
				var loc_nohier = roleBasedLocations[i]['namenohierarchy'];

				var loc_subs = roleBasedLocations[i]['location_name'];
				var loc_id = roleBasedLocations[i]['id']; // Parent

				if((loc_subs!=null && loc_subs!='') && (vLocname==loc_subs)) {
					vRoleLocation.push(loc_id);
				}
			}
		}

		return vRoleLocation;
	}
	function _getAllLocations()
	{
		var vLocationArray = [];
		// for non oneoworld account case when no location is configured, show all location
		var roleBasedLocationSearch = search.load({id:'customsearch_wmsse_getrolelocation'});
		var roleBasedLocations = _getSearchResultInJSON(roleBasedLocationSearch);

		for (var i = 0; i <roleBasedLocations.length; i++) {
			var loc_id = roleBasedLocations[i]['id'];
			vLocationArray.push(loc_id);
		}

		return vLocationArray;
	}

	function _getWHLocations(location)
	{
		var vLocationArray = [];
		var Whsite='';
		// for non oneoworld account case when no location is configured, show all location
		var locationSearch = search.load({id:'customsearch_wmsse_getrolelocation'});
		var locationFilters = locationSearch.filters;

		locationFilters.push(search.createFilter({
			name: 'internalid',
			operator: search.Operator.ANYOF,
			values : location
		}));
		locationSearch.filters = locationFilters;

		var roleBasedLocations = _getSearchResultInJSON(locationSearch);
		if(roleBasedLocations!=null && roleBasedLocations!='')
		{
			Whsite='T';
		}
		else
			Whsite='F';


		return Whsite;
	}

	function _getPoOverage(transactionType)
	{
		var vPOoverageChecked = false;
		var vConfig = config.load({
			type: config.Type.ACCOUNTING_PREFERENCES
		});
		if (vConfig != null && vConfig != '' && transactionType != 'transferorder') {
			vPOoverageChecked = vConfig.getValue({
				fieldId: 'OVERRECEIPTS'
			});
		}

		return vPOoverageChecked;
	}
	function _getItemCostRuleValue()
	{
		var accountingPreferences = config.load({
			type: config.Type.ACCOUNTING_PREFERENCES
		});
		var itemCostRuleValue=accountingPreferences.getValue({fieldId:'ITEMCOSTASTRNFRORDCOST'});
		return itemCostRuleValue
	}
	function _isValueValid(val)
	{
		var isNotNull = false;
		if( typeof(val) == 'boolean')
		{
			val = val.toString();
		}
		if (val != null && val != '' && val != 'null' && val != undefined && val != 'undefined')
		{
			isNotNull = true;
		}

		return isNotNull;
	}

	function _getRecevingOrderItemDetails(orderNumber,itemID,wareHouseLocationId,orderLineNo,orderInternalId,colsArr,tranType,crossSubsidiaryFeature)
	{

		var searchName = 'customsearch_wmsse_rcv_poitem_details';
		var vType = 'PurchOrd';
		if(tranType == 'transferorder')
		{
			searchName = 'customsearch_wmsse_rcv_to_item_details';	
			vType = 'TrnfrOrd';
		}
		else if(tranType=='returnauthorization')
		{
			searchName = 'customsearch_wmsse_rcv_rma_item_details';	
			vType='RtnAuth';			
		}
		if(_isValueValid(orderNumber) || _isValueValid(orderInternalId)) {
			var POLineDetails = search.load({
				id: searchName
			});

			var filtersArr = POLineDetails.filters;
			if(_isValueValid(colsArr))
			{
				for(var j=0;j<colsArr.length;j++)
				{
					log.debug({title:'colsArr[j]',details:colsArr[j]});
					POLineDetails.columns.push(colsArr[j]); 
				}
			}
			if(_isValueValid(orderInternalId))
			{
				filtersArr.push(search.createFilter({
					name: 'internalid',
					operator: search.Operator.ANYOF,
					values: orderInternalId
				}));
			}
			else
			{
				filtersArr.push(search.createFilter({
					name: 'tranid',
					operator: search.Operator.IS,
					values: orderNumber
				}));
			}     
			filtersArr.push(search.createFilter({
				name: 'type',
				operator: search.Operator.ANYOF,
				values: vType
			}));

			if (_isValueValid(wareHouseLocationId)) {
				if(tranType == 'transferorder')
				{
					filtersArr.push(
							search.createFilter({
								name: 'transferlocation',
								operator: search.Operator.ANYOF,
								values: ['@NONE@', wareHouseLocationId]
							}));
				}
				else
				{
					if(crossSubsidiaryFeature == true && tranType=='returnauthorization')
					{
						filtersArr.push(
								search.createFilter({
									name: 'inventorylocation',
									operator: search.Operator.ANYOF,
									values: ['@NONE@', wareHouseLocationId]
								}));

					}
					else
					{
						filtersArr.push(
								search.createFilter({
									name: 'location',
									operator: search.Operator.ANYOF,
									values: ['@NONE@', wareHouseLocationId]
								}));
					}
				}
			}
			if (_isValueValid(itemID)) {
				filtersArr.push(
						search.createFilter({
							name: 'item',
							operator: search.Operator.ANYOF,
							values: itemID
						}));
			}
			if (_isValueValid(orderLineNo)) {
				filtersArr.push(
						search.createFilter({
							name: 'line',
							operator: search.Operator.EQUALTO,
							values: orderLineNo
						}));
			}
			POLineDetails.filters = filtersArr;
			var POLineDetailsResult = _getSearchResultInJSON(POLineDetails);
			return POLineDetailsResult;
		}
		else
		{
			return null;
		}
	}


	function _getRecevingOrderDetails(orderNumber,itemID,wareHouseLocationId,orderLineNo,orderInternalId,colsArr,tranType,crossSubsidiaryFeature)
	{

		var searchName = 'customsearch_wmsse_rcv_po_validate';
		var vType = 'PurchOrd';
		if(tranType == 'transferorder')
		{
			searchName = 'customsearch_wmsse_rcv_to_item_details';	
			vType = 'TrnfrOrd';
		}
		else if(tranType=='returnauthorization')
		{
			searchName = 'customsearch_wmsse_rcv_rma_item_details';	
			vType='RtnAuth';			
		}
		if(_isValueValid(orderNumber) || _isValueValid(orderInternalId)) {
			var POLineDetails = search.load({
				id: searchName
			});

			var filtersArr = POLineDetails.filters;
			if(_isValueValid(colsArr))
			{
				for(var j=0;j<colsArr.length;j++)
				{
					log.debug({title:'colsArr[j]',details:colsArr[j]});
					POLineDetails.columns.push(colsArr[j]); 
				}
			}
			if(_isValueValid(orderInternalId))
			{
				filtersArr.push(search.createFilter({
					name: 'internalid',
					operator: search.Operator.ANYOF,
					values: orderInternalId
				}));
			}
			else
			{
				filtersArr.push(search.createFilter({
					name: 'tranid',
					operator: search.Operator.IS,
					values: orderNumber
				}));
			}     
			filtersArr.push(search.createFilter({
				name: 'type',
				operator: search.Operator.ANYOF,
				values: vType
			}));

			if (_isValueValid(wareHouseLocationId)) {
				if(tranType == 'transferorder')
				{
					filtersArr.push(
							search.createFilter({
								name: 'transferlocation',
								operator: search.Operator.ANYOF,
								values: ['@NONE@', wareHouseLocationId]
							}));
				}
				else
				{
					if(crossSubsidiaryFeature == true && tranType=='returnauthorization')
					{
						filtersArr.push(
								search.createFilter({
									name: 'inventorylocation',
									operator: search.Operator.ANYOF,
									values: ['@NONE@', wareHouseLocationId]
								}));

					}
					else
					{
						filtersArr.push(
								search.createFilter({
									name: 'location',
									operator: search.Operator.ANYOF,
									values: ['@NONE@', wareHouseLocationId]
								}));
					}
				}
			}
			if (_isValueValid(itemID)) {
				filtersArr.push(
						search.createFilter({
							name: 'item',
							operator: search.Operator.ANYOF,
							values: itemID
						}));
			}
			if (_isValueValid(orderLineNo)) {
				filtersArr.push(
						search.createFilter({
							name: 'line',
							operator: search.Operator.EQUALTO,
							values: orderLineNo
						}));
			}
			POLineDetails.filters = filtersArr;
			var POLineDetailsResult = _getSearchResultInJSON(POLineDetails);
			return POLineDetailsResult;
		}
		else
		{
			return null;
		}
	}

	function _getItemSearchDetails(getItemInternalId,warehouseLocationId)
	{
		if(_isValueValid(getItemInternalId)) {
			var itemSearchDetails = search.load({
				id: 'customsearch_wmsse_itemdetails'
			});
			var filtersArr = itemSearchDetails.filters;
			filtersArr.push(
					search.createFilter({
						name: 'internalid',
						operator: search.Operator.ANYOF,
						values: getItemInternalId
					}));
			filtersArr.push(
					search.createFilter({
						name: 'location',
						operator: search.Operator.ANYOF,
						values:['@NONE@',warehouseLocationId]
					}));

			itemSearchDetails.filters = filtersArr;
			var itemSearchResult = _getSearchResultInJSON(itemSearchDetails);
			return itemSearchResult;
		}
		else
		{
			return null;
		}

	}
	//Function to get open putaway quantity
	function _getOpentaskOpenPutwayDetails(poId,whLocation,itemId,lineNo) {
		var opentaskArr = {};
		var filterStrat = [];
		if (_isValueValid(poId))
		{
			if (_isValueValid(whLocation))
			{
				filterStrat.push(search.createFilter({
					name: 'custrecord_wmsse_wms_location',
					operator: search.Operator.ANYOF,
					values: whLocation
				}));
			}
			filterStrat.push(search.createFilter({
				name: 'custrecord_wmsse_order_no',
				operator: search.Operator.ANYOF,
				values: poId
			}));
			if (_isValueValid(lineNo))
			{
				filterStrat.push(search.createFilter({
					name: 'custrecord_wmsse_line_no',
					operator: search.Operator.EQUALTO,
					values: lineNo
				}));
			}
			if (_isValueValid(itemId))
			{
				filterStrat.push(search.createFilter({
					name: 'custrecord_wmsse_sku',
					operator: search.Operator.ANYOF,
					values: itemId
				}));
			}
			filterStrat.push(search.createFilter({
				name: 'custrecord_wmsse_nsconfirm_ref_no',
				operator: search.Operator.ANYOF,
				values: ['@NONE@']
			}));

			var objOpentaskDetailsSearch = search.load({id: 'customsearch_wmsse_openputawaydetails'});
			var savedFilter = objOpentaskDetailsSearch.filters ;
			objOpentaskDetailsSearch.filters = savedFilter.concat(filterStrat);
			var objOPentaskDetails = _getSearchResultInJSON(objOpentaskDetailsSearch);
			if (objOPentaskDetails != null &&  objOPentaskDetails.length > 0) {
				for (var objOPentask in objOPentaskDetails) {
					var objOPentaskRec = objOPentaskDetails[objOPentask];	
					opentaskArr[objOPentaskRec['custrecord_wmsse_line_no']] = objOPentaskRec['custrecord_wmsse_expe_qty'];
				}
			}
		}
		log.debug({title:'opentaskArr',details:opentaskArr});
		return opentaskArr;
	}
	//Function to get open putaway quantity for order list
	function _getAllOpentaskOpenPutwayDetails(whLocation,transactionType) {
		var opentaskArr = [];
		var filterStrat = [];
		filterStrat.push(search.createFilter({
			name: 'custrecord_wmsse_nsconfirm_ref_no',
			operator: search.Operator.ANYOF,
			values: ['@NONE@']
		}));
		if (_isValueValid(whLocation))
		{
			filterStrat.push(search.createFilter({
				name: 'custrecord_wmsse_wms_location',
				operator: search.Operator.ANYOF,
				values: whLocation
			}));
		}
		if (_isValueValid(transactionType))
		{
			if(transactionType=='transferorder')
			{
				filterStrat.push(search.createFilter({
					name:'transactionlinetype',
					join: 'custrecord_wmsse_order_no',
					operator: search.Operator.IS,
					values:'RECEIVING'}));
			}


		}

		var objOpentaskDetailsSearch = search.load({id: 'customsearch_wmsse_openputawaysbyorder'});
		var savedFilter = objOpentaskDetailsSearch.filters ;
		objOpentaskDetailsSearch.filters = savedFilter.concat(filterStrat);
		var objOPentaskDetails = _getSearchResultInJSON(objOpentaskDetailsSearch);
		if (objOPentaskDetails != null &&  objOPentaskDetails.length > 0) {
			for (var objOPentask in objOPentaskDetails) {
				var opentaskRec = objOPentaskDetails[objOPentask];
				var poId = opentaskRec['internalid'];
				var transactionLineCount = opentaskRec['Transaction Line Count'];
				var opentaskLineCount = opentaskRec['OpenTask Line Count'];
				var erpReceivedCount = 0;
				if(opentaskLineCount  > 0 && parseInt(opentaskRec['ERP received count']) > 0)
				{
					erpReceivedCount = Number(Big(opentaskRec['ERP received count']).div(opentaskRec['OpenTask Line Count']));
				}
				else
				{
					erpReceivedCount =  opentaskRec['ERP received count'];
				}
				if(!_isValueValid(erpReceivedCount))
				{
					erpReceivedCount = 0;
				}
				if(!_isValueValid(opentaskLineCount))
				{
					opentaskLineCount = 0;
				}
				var isLinesToReceive = -1;
				if(transactionLineCount > 0)
				{
					isLinesToReceive = Number(Big(transactionLineCount).minus(Big(opentaskLineCount).plus(erpReceivedCount)));
				}
				if(isLinesToReceive == 0)
				{
					opentaskArr.push(poId);
				}
			}
		}
		log.debug({title:'opentaskArr1',details:opentaskArr});
		return opentaskArr;
	}
	function _validateDate(vDateString,dtsettingFlag)
	{
		if(vDateString != null && vDateString != '')
		{
			var vValidDate= format.parse({
				type :format.Type.DATE,
				value : vDateString
			});
			if(isNaN(vValidDate) || vValidDate == null || vValidDate == '')
				return null;
			else
				return vValidDate;
		}
		else
			return null;
	}
	/**
	 * To Get Inventory availablestatus from core status record
	 */
	function _getInventoryAvailableStatusFromCore(makeInvAvailFlagFromSelect)
	{
		var objwmsstatusDetailsSearch = search.load({id: 'customsearch_wmsse_inventorystatusvalues'});
		var savedFilters = objwmsstatusDetailsSearch.filters ;
		var wmsInvstatusidArray = [];
		savedFilters.push(search.createFilter({
			name: 'inventoryavailable',
			operator: search.Operator.IS,
			values: makeInvAvailFlagFromSelect
		}));

		objwmsstatusDetailsSearch.filters = savedFilters;
		var objwmsstatusdetails = _getSearchResultInJSON(objwmsstatusDetailsSearch);

		if(objwmsstatusdetails.length > 0 )
		{
			wmsInvstatusidArray.push('@NONE@');

			for(var statusid in  objwmsstatusdetails)
			{
				var currentRec = objwmsstatusdetails[statusid];
				wmsInvstatusidArray.push(currentRec.id);
			}
		}

		return wmsInvstatusidArray;
	}
	/**
	 * To Get Inventory availablestatus
	 */
	function getInventoryAvailableStatus(makeInvAvailFlagFromSelect)
	{

		var wmsInvstatusidArray = [];
		var objwmsstatusDetailsSearch = search.load({id: 'customsearch_wmsse_inventorystatus_det'});
		var savedFilters = objwmsstatusDetailsSearch.filters ;
		savedFilters.push(search.createFilter({
			name: 'custrecord_wmsse_makeinventoryflag',
			operator: search.Operator.IS,
			values: makeInvAvailFlagFromSelect
		}));
		objwmsstatusDetailsSearch.filters = savedFilters;
		var objwmsstatusdetails = _getSearchResultInJSON(objwmsstatusDetailsSearch);

		if(objwmsstatusdetails.length > 0)
		{
			wmsInvstatusidArray.push('@NONE@');
			for(var statusid in objwmsstatusdetails)
			{
				wmsInvstatusidArray.push(objwmsstatusdetails[statusid].id);


			}
		}

		return wmsInvstatusidArray;
	}

	function replaceAll(originalstring, charactertoreplace, replacementcharacter) 
	{
		return originalstring.replace(new RegExp(escapeRegExp(charactertoreplace), 'g'), replacementcharacter);
	}
	function escapeRegExp(string)
	{
		return string.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
	}
	function getbarcodecomponents(barcodeformatref,barcodestring,whlocation)
	{
		var barcodecomponents={};
		var barcodecomponentSearch = search.load({
			id : 'customsearch_wmsse_barcodecomponents'
		});

		var barcodecomponentFilters = barcodecomponentSearch.filters;
		barcodecomponentFilters.push(
				search.createFilter({
					name: 'custrecord_wmsse_barcode_templatename',
					operator: search.Operator.ANYOF,
					values: barcodeformatref
				}));
		barcodecomponentFilters.push(
				search.createFilter({
					name: 'isinactive',
					operator: search.Operator.IS,
					values: false	
				}));

		barcodecomponentSearch.filters = barcodecomponentFilters;
		var srchbarcodecomponents = _getSearchResultInJSON(barcodecomponentSearch);
		log.debug({title:'srchbarcodecomponents',details:srchbarcodecomponents});
		if(srchbarcodecomponents.length > 0 )
		{
			var vItem = '';
			var vLot='';
			var vExpiryDate='';
			var vQty='';
			var vUOM='';
			var vSerialNumber='';		

			log.debug({title:'barcodestring.length1',details:srchbarcodecomponents[srchbarcodecomponents.length-1]['custrecord_wmsse_componentendingindex']});
			//If the bar code string is not having all the components configured
			if(barcodestring.length >= srchbarcodecomponents[srchbarcodecomponents.length-1]['custrecord_wmsse_componentendingindex'])
			{
				/*	barcodecomponents['error'] =translator.getTranslationString('PO_ITEMVALIDATE.INVALID_BARCODE');
				//return barcodecomponents;
			}
			else
			{*/
				for (var barcode in srchbarcodecomponents)
				{
					if(JSON.stringify(barcodecomponents) !== '{}')
					{
						break;
					}
					var barcodeRec = srchbarcodecomponents[barcode];
					for (var barcodecomponent in srchbarcodecomponents)
					{
						var barcodecomponentRec = srchbarcodecomponents[barcodecomponent];

						if(barcodeRec["custrecord_wmsse_barcode_templatename"] == barcodecomponentRec["custrecord_wmsse_barcode_templatename"])
						{
							var datafield = barcodecomponentRec['custrecord_wmsse_componentnameText'];
							var startindex = barcodecomponentRec['custrecord_wmsse_componentstartingindex'];
							var endindex = barcodecomponentRec['custrecord_wmsse_componentendingindex'];
							var dataformat = barcodecomponentRec['custrecord_wmsse_componentdataformatText'];
							var paddingchar = barcodecomponentRec['custrecord_wms_barcode_paddingcharacterText'];
							switch (datafield) 
							{
							case 'Item':
								vItem = barcodestring.substring(parseInt(startindex)-1,parseInt(endindex));
								if(_isValueValid(paddingchar))
								{
									vItem = replaceAll(vItem,paddingchar,'');
								}

								if(_isValueValid(vItem))
								{
									vItem=vItem.trim();
									var curitem = getSKUIdWithName(vItem,whlocation,null,null);
									log.debug({title:'barcodeitem',details:curitem});
									if(curitem.length > 0)
									{
										barcodecomponents['barcodeItemname'] = curitem[1];
										barcodecomponents['barcodeIteminternalid'] = curitem[0];
									}
									else
									{
										barcodecomponents['error']=translator.getTranslationString('PO_ITEMVALIDATE.BARCODE_ITEM_NOTFOUND');
									}
								}
								else
								{
									barcodecomponents['error']=translator.getTranslationString('PO_ITEMVALIDATE.BARCODE_ITEM_NOTFOUND');
								}
								break;

							case 'Lot':
								vLot = barcodestring.substring(parseInt(startindex)-1,parseInt(endindex));
								if(_isValueValid(paddingchar))
								{
									vLot = replaceAll(vLot,paddingchar,'');
								}
								if(_isValueValid(vLot))
								{
									vLot=vLot.trim();
									barcodecomponents['barcodeLotname'] = vLot;
								}
								else
								{
									barcodecomponents['barcodeLotname']='';
								}

								break;

							case 'Expiry Date':
								vExpiryDate = barcodestring.substring(parseInt(startindex)-1,parseInt(endindex));	
								if(_isValueValid(paddingchar))
								{
									vExpiryDate = replaceAll(vExpiryDate,paddingchar,'');
								}

								if(_isValueValid(vExpiryDate))
								{
									vExpiryDate=vExpiryDate.trim();
									if(vExpiryDate.length == dataformat.length)
									{

										var actexpirydate = getvalidexpirydate(vExpiryDate,dataformat);
										var getExpDateresult=null;
										if(_isValueValid(actexpirydate))
										{
											getExpDateresult   = _validateDate(actexpirydate);
										}
										if( getExpDateresult == null || getExpDateresult =="")
										{
											barcodecomponents['error']=translator.getTranslationString('PO_ITEMVALIDATE.BARCODE_EXPIRYDATE_INVALIDFORMAT');
										}
										else
										{
											barcodecomponents['barcodeLotExpirydate'] = actexpirydate;
										}
									}
									else
									{
										barcodecomponents['error']=translator.getTranslationString('PO_ITEMVALIDATE.BARCODE_EXPIRYDATE_INVALIDFORMAT');
									}

								}
								else
								{
									barcodecomponents['barcodeLotExpirydate']='';
								}
								break;

							case 'Quantity':
								vQty = barcodestring.substring(parseInt(startindex)-1,parseInt(endindex));
								if(_isValueValid(paddingchar))
								{
									vQty = replaceAll(vQty,paddingchar,'');
								}
								if(_isValueValid(vQty))
								{
									vQty=vQty.trim();
									//below code is used to replace the extra zeros, i.e 0001 replace 1
									vQty = vQty.replace(/^0+/, '');
								}
								if(parseFloat(vQty)>0 && !isNaN(vQty))
								{
									barcodecomponents['barcodeQuantity'] = vQty;
								}
								else
								{
									barcodecomponents['error']=translator.getTranslationString('PO_ITEMVALIDATE.BARCODE_QUANTITY_INVALIDFORMAT');
								}
								break; 

							case 'UOM':
								vUOM = barcodestring.substring(parseInt(startindex)-1,parseInt(endindex));
								if(_isValueValid(paddingchar))
								{
									vUOM = replaceAll(vUOM,paddingchar,'');
								}
								if(_isValueValid(vUOM))
								{
									vUOM=vUOM.trim();
								}
								if(_isValueValid(vUOM))
								{
									var uomResults= getUnitsType(null,vUOM);	
									log.debug({title:'uomresults',details:uomResults});
									if(_isValueValid(uomResults))
									{	
										barcodecomponents['barcodeUomName'] = vUOM;
									}
									else
									{
										barcodecomponents['error'] = translator.getTranslationString('PO_ITEMVALIDATE.BARCODE_UOM_NOTFOUND');

									}
								}
								else
								{
									barcodecomponents['barcodeUomName']='';
								}
								break; 

							case 'Serial Number':
								vSerialNumber = barcodestring.substring(parseInt(startindex)-1,parseInt(endindex));
								if(_isValueValid(paddingchar))
								{
									vSerialNumber = replaceAll(vSerialNumber,paddingchar,'');
								}
								if(_isValueValid(vSerialNumber))
								{
									vSerialNumber=vSerialNumber.trim();
								}
								var serValidationArr =[];
								if(_isValueValid(vSerialNumber))
								{
									var serLen  = vSerialNumber.length;
									for(var serItr= 0;serItr<serLen;serItr++)
									{
										serValidationArr.push(vSerialNumber[serItr]);
									}					

									if(serValidationArr.indexOf('[')!=-1 || serValidationArr.indexOf('+')!=-1 || serValidationArr.indexOf('\\')!=-1 ||
											serValidationArr.indexOf(';')!=-1 || serValidationArr.indexOf('<')!=-1 || serValidationArr.indexOf('>')!=-1 ||
											serValidationArr.indexOf('{')!=-1 || serValidationArr.indexOf('}')!=-1 || serValidationArr.indexOf('(')!=-1 || 
											serValidationArr.indexOf(')')!=-1 || serValidationArr.indexOf("'")!=-1)
									{
										barcodecomponents['error'] = translator.getTranslationString("PO_ITEMVALIDATE.BARCODE_SERAIL_INVALIDFORMAT");
									}
									else
									{
										barcodecomponents['barcodeSerialname'] = vSerialNumber;
									}
								}
								else
								{
									barcodecomponents['barcodeSerialname'] = '';
								}
								break; 
							}
						}
					}
				}

				var componentCount = Object.keys(barcodecomponents).length; 



				if(componentCount<srchbarcodecomponents.length)
				{
					barcodecomponents['error']= translator.getTranslationString("PO_ITEMVALIDATE.INVALID_BARCODE");
				}
			}
			/*else
			{
				nlapiLogExecution('DEBUG', 'Components are not configured for the Template');
				barcodecomponents['error'] = "NoBarcodeFormats";
			}*/
		}
		return barcodecomponents;
	}
	function getbarcodeformat(vendor,barcodestring)
	{
		var srchbarcodeformats =[];
		if(_isValueValid(vendor))
		{
			var barcodeFormatSearch = search.load({
				id : 'customsearch_wmsse_barcodetemplatesearch'
			});

			var barcodeFilters = barcodeFormatSearch.filters;
			barcodeFilters.push(
					search.createFilter({
						name: 'custrecord_wmsse_barcodevendor',
						operator: search.Operator.ANYOF,
						values: vendor
					}));
			barcodeFilters.push(
					search.createFilter({
						name: 'isinactive',
						operator: search.Operator.IS,
						values: false	
					}));

			barcodeFormatSearch.filters = barcodeFilters;

			srchbarcodeformats = _getSearchResultInJSON(barcodeFormatSearch);
		}

		return srchbarcodeformats;
	}
	function Insertbarcodestring(vbarcodestring,vtranaction,vbarcodetempid)
	{

		var barcodestringSearch = search.load({
			id : 'customsearch_wmsse_barcode_string'
		});
		var barcodestringFilters = barcodestringSearch.filters;
		barcodestringFilters.push(
				search.createFilter({
					name: 'custrecord_wmsse_barcode_string',
					operator: search.Operator.IS,
					values: vbarcodestring	
				}));
		barcodestringSearch.filters = barcodestringFilters;

		var Searchresults = _getSearchResultInJSON(barcodestringSearch);
		if(Searchresults.length == 0)
		{
			var barcoderecord = record.create({
				type  :'customrecord_wmsse_barcode_strings'});
			barcoderecord.setValue({fieldId:'name', value:vtranaction});
			barcoderecord.setValue({fieldId:'custrecord_wmsse_barcode_string', value:vbarcodestring});
			barcoderecord.setValue({fieldId:'custrecord_wmsse_barcode_transactionno', value:vtranaction});
			barcoderecord.setValue({fieldId:'custrecord_wmsse_barcode_templaterefno', value:vbarcodetempid});
			var recid = barcoderecord.save();
		}



	}


	function parsebarcodestring(vendor,barcodeString,whLocationInternalId,transactionId)
	{
		var barcodeComponents={};

		var barcodeFormatArr=getbarcodeformat(vendor,barcodeString);
		if(barcodeFormatArr.length > 0)
		{
			var barcodeFormatRef='';
			for(var barcodeFormat in barcodeFormatArr)
			{
				var barcodeFormatRef= barcodeFormatArr[barcodeFormat].id;

				barcodeComponents=getbarcodecomponents(barcodeFormatRef,barcodeString,whLocationInternalId);
				log.debug({title:'barcodeComponents[error]',details:barcodeComponents['error']});
				if(JSON.stringify(barcodeComponents) !== '{}')
				{
					if (barcodeComponents['error']== null || barcodeComponents['error'] ==''|| barcodeComponents['error']=='null')
					{
						Insertbarcodestring(barcodeString,transactionId,barcodeFormatRef);
						break;
					}

				}
			}
		}
		else
		{	
			barcodeComponents["error"]= translator.getTranslationString("PO_ITEMVALIDATE.NO_BARCODES");
		}

		log.debug({title:'barcodeComponents',details:barcodeComponents});
		return barcodeComponents;
	}

	function getvalidexpirydate(expDate,dateformat)
	{
		var vyear = '';
		var vmonth = '';
		var vday = '';

		if(dateformat == 'MMDDYY')
		{
			vmonth = expDate.substring(0,2);
			vday = expDate.substring(2,4);
			vyear = expDate.substring(4,6);
		}
		else if(dateformat == 'DDMMYY')
		{
			vday = expDate.substring(0,2);
			vmonth = expDate.substring(2,4);
			vyear = expDate.substring(4,6);
		}
		else if(dateformat == 'YYDDMM')
		{
			vyear = expDate.substring(0,2);
			vday = expDate.substring(2,4);
			vmonth = expDate.substring(4,6);
		}
		else if(dateformat == 'YYMMDD')
		{
			vyear = expDate.substring(0,2);
			vmonth = expDate.substring(2,4);
			vday = expDate.substring(4,6);
		}

		var now = new Date();
		var yearPrefix = now.getFullYear().toString();
		yearPrefix = yearPrefix.substring(0, 2);

		vyear = yearPrefix + vyear;	

		var expiryDateFormat = DateSetting();	
		var expiryDate = setExpiryDate(expiryDateFormat,vmonth,vday,vyear);	

		return expiryDate;
	}

	function _itemValidationForInventoryAndOutBound(itemText,wareHouseLocationId)
	{
		var itemArray = {};		
		var currItem = getSKUIdWithName(itemText, wareHouseLocationId, null,null);
		log.debug({title:'currItem',details:currItem});
		if(currItem.length == 0)
		{
			var barcodeComponents = parsebarcodeoutsidereceiving(itemText,wareHouseLocationId);
			if(_isValueValid(barcodeComponents) && (JSON.stringify(barcodeComponents) !== '{}'))
			{
				if(barcodeComponents["error"] == translator.getTranslationString("PO_ITEMVALIDATE.NO_BARCODES"))
				{
					itemArray = {};
					itemArray["errorMessage"] = translator.getTranslationString('PO_ITEMVALIDATE.NO_BARCODES');
					itemArray['isValid'] = false;
				}
				else if(barcodeComponents["error"] !=null && barcodeComponents["error"] !='' && barcodeComponents["error"] !='undefined')
				{
					itemArray = {};
					itemArray["errorMessage"] = barcodeComponents["error"];
					itemArray['isValid'] = false;
				}
				else{

					var barcodeItemname =barcodeComponents['barcodeItemname'];
					var barcodeIteminternalid =barcodeComponents['barcodeIteminternalid'];

					var barcodeQuantity = barcodeComponents['barcodeQuantity'];
					var barcodeUomName = barcodeComponents['barcodeUomName']; 

					var barcodeLotname = '';
					var barcodeLotExpirydate ='';
					var barcodeSerialname ='';
					itemArray["barcodeItemname"] = barcodeComponents['barcodeItemname'];
					itemArray["barcodeIteminternalid"] = barcodeComponents['barcodeIteminternalid'];
					itemArray["barcodeQuantity"] = barcodeComponents['barcodeQuantity'];
					itemArray["barcodeUomName"] = barcodeComponents['barcodeUomName'];
					log.debug({title:'itemArray',details:itemArray});
					if(_isValueValid(barcodeIteminternalid))
					{
						var currItemType = '';
						var unitsType = '';
						var itemLookUp = search.lookupFields({
							type: search.Type.ITEM,
							id: barcodeIteminternalid,
							columns: ['recordtype','unitstype']
						});
						if (itemLookUp.unitstype != undefined) 
						{
							unitsType = itemLookUp.unitstype[0].value;
						}
						if (itemLookUp.recordtype != undefined) 
						{
							currItemType = itemLookUp.recordtype;
						}
						if(currItemType == "lotnumberedinventoryitem" || currItemType == "lotnumberedassemblyitem")
						{
							barcodeLotname = barcodeComponents['barcodeLotname'];
							barcodeLotExpirydate = barcodeComponents['barcodeLotExpirydate'];

							if(_isValueValid(barcodeLotname))
							{
								itemArray["barcodeLotname"] = barcodeLotname;
							}

							if(_isValueValid(barcodeLotExpirydate))										
								itemArray["barcodeLotExpirydate"] = barcodeLotExpirydate;
						}
						if(currItemType == "serializedinventoryitem" || currItemType == "serializedassemblyitem")
						{
							barcodeSerialname = barcodeComponents['barcodeSerialname'];
							log.debug({title:'barcodeSerialname',details:barcodeSerialname});

							if(_isValueValid(barcodeSerialname))
							{	
								var barcodeUomConversionRate = getConversionRate(barcodeUomName,unitsType);
								log.debug({title:'barcodeUomConversionRate',details:barcodeUomConversionRate});
								if((_isValueValid(barcodeQuantity)) && (barcodeQuantity == 1|| barcodeQuantity =='1') && barcodeUomConversionRate==1)
								{
									itemArray["barcodeSerialname"]=barcodeSerialname;
								}
								else
								{
									itemArray = {};
									itemArray["errorMessage"] = translator.getTranslationString("BINTRANSFER_ITEMORBINVALIDATE.BARCODE_SERIALQUANTITY_VALIDATION");
									itemArray['isValid'] = false;
								}

							}

						}

					}
				}
				log.debug({title:'itemArray',details:itemArray});
				itemArray['isbarcodescanned'] = true;
			}


		}
		else
		{
			itemArray["itemName"] = currItem[1];
			itemArray["itemInternalid"] = currItem[0];
			itemArray["isValid"] = true;
			itemArray['isbarcodescanned'] = false;
		}

		log.debug({title:'itemArray',details:itemArray});
		return itemArray;
	}
	/**
	 * To parse barcode string for outside receiving processes
	 * @parameter :barcode string
	 * @parameter :warehouse location
	 * @return : barcodencomponent details
	 * 
	 */

	function parsebarcodeoutsidereceiving(barcodeString,whLocationInternalId)
	{
		var barcodeComponents={};

		var barcodeStringSearch = search.load({
			id : 'customsearch_wmsse_barcode_string'
		});
		var barcodeStringFilters = barcodeStringSearch.filters;
		barcodeStringFilters.push(
				search.createFilter({
					name: 'custrecord_wmsse_barcode_string',
					operator: search.Operator.IS,
					values: barcodeString	
				}));
		barcodeStringSearch.filters = barcodeStringFilters;

		var searchResults = _getSearchResultInJSON(barcodeStringSearch);
		log.debug({title:'searchResults',details:searchResults});
		if(searchResults.length > 0)
		{

			var barcodeTemplateRefno = searchResults[0]['custrecord_wmsse_barcode_templaterefno'];
			log.debug({title:'barcodeTemplateRefno',details:barcodeTemplateRefno});
			barcodeComponents = getbarcodecomponents(barcodeTemplateRefno,barcodeString,whLocationInternalId);
			if(barcodeComponents==null || barcodeComponents=='')
			{
				barcodeComponents['error'] = translator.getTranslationString("BINTRANSFER_ITEMORBINVALIDATE.INVALID_BARCODE");
			}
		}
		/*	else
		{
			barcodecomponents["error"]=translator.getTranslationString('PO_ITEMVALIDATE.NO_BARCODES');
		}*/

		return barcodeComponents;
	}
	function getConversionRate(uomName,unitTypeId)
	{
		var uomfilters=[];	
		var vconversionRate = 1;
		if(_isValueValid(uomName))
		{

			var searchRec = search.load({
				id: 'customsearch_wmsse_unitstype'
			});
			var uomfilters = searchRec.filters;

			uomfilters.push(search.createFilter({
				name: 'unitname',
				operator: search.Operator.IS,
				values: uomName
			}));
			uomfilters.push(search.createFilter({
				name: 'internalid',
				operator: search.Operator.ANYOF,
				values: unitTypeId
			}));

			searchRec.filters = uomfilters;
			var uomResults = _getSearchResultInJSON(searchRec);
			if(uomResults.length > 0)
			{
				vconversionRate = uomResults[0]['conversionrate'];
			}
		}

		return vconversionRate;
	}
	function uomConversions(stockqty,selectedConversionRate,currentConversionRate)
	{
		var conersionRate = Number(Big(currentConversionRate).div(selectedConversionRate));
		var uomValue = parseFloat(Number(Big(stockqty).mul(conersionRate)).toFixed(5));

		return uomValue;

	}
	function _getStageLocations(stageTypesArr,BinlocationTypes)
	{
		var stgLocArr = [];
		if(BinlocationTypes != null && BinlocationTypes !='' && BinlocationTypes.length > 0)
		{

			for(var b=0;b<BinlocationTypes.length;b++)
			{
				var tName= BinlocationTypes[b].getValue({name:'name'});
				if(stageTypesArr.indexOf(tName)!=-1)
				{
					stgLocArr.push(BinlocationTypes[b].id);
					if(stageTypesArr.length==1 && stageTypesArr[0]=='Stage')
					{
						break;
					}

				}
			}
		}
		return stgLocArr;
	}


	function transferallInvTransfer(invtransferObj)
	{
		log.debug({title:'bintransferObj',details:invtransferObj});
		var itemType =invtransferObj['itemType'];
		var whLocation =invtransferObj['whLocation'];
		var towhLocation =invtransferObj['towhLocation'];
		var itemId=invtransferObj['itemId'];
		var quantity=invtransferObj['quantity'];
		var fromBinId=invtransferObj['fromBinId'];
		var toBinId = invtransferObj['toBinId'];
		var batchnoArr=invtransferObj['batchno'];
		var actualBeginTime=invtransferObj['actualBeginTime'];
		var units =invtransferObj['units'];
		var stockConversionRate =invtransferObj['stockConversionRate'];
		var opentaskQty=invtransferObj['opentaskQty'];
		var fromStatus=invtransferObj['fromStatus'];
		var toStatus=invtransferObj['toStatus'];				
		var allowAllLots = 'T';
		var inventoryStatusFeature = isInvStatusFeatureEnabled();

		var batchnoArr=[];
		var statusArr=[];
		var quantityArr=[];
		var fromStatusarr=[];
		var toStatusarr=[];

		var objBinDetails = getPickBinDetailsLotWithExpiryDates(itemId,fromBinId,'',whLocation,
				null,units,stockConversionRate,allowAllLots,null,null,null,null,itemType);

		log.debug({title:'objBinDetails',details:objBinDetails.length});
		if(objBinDetails !=null && objBinDetails.length>0)
		{
			for(var bindetail in objBinDetails)
			{
				binTransferQty=objBinDetails[bindetail]['availableqty'];												
				if(binTransferQty==null || binTransferQty=='')
					binTransferQty=0;

				if(quantity==null || quantity=='')
					quantity=0;

				if((itemType == "serializedinventoryitem" || itemType == "serializedassemblyitem") && (!inventoryStatusFeature))
				{
					binTransferQty=Number((Big(binTransferQty).div(stockConversionRate)).toFixed(8));
				}
				else
				{
					binTransferQty=Number((Big(binTransferQty)).toFixed(8));	
				}
				quantity=Number(Big(quantity).plus(binTransferQty));												
				vlotNo=objBinDetails[bindetail]['lotnumber'];
				vstatus=objBinDetails[bindetail]['statusid'];
				quantityArr.push(binTransferQty);
				batchnoArr.push(vlotNo);
				log.debug({title:'vstatus',details:vstatus});
				if(inventoryStatusFeature)
				{
					fromStatusarr.push(vstatus);
					toStatusarr.push(vstatus);
				}

			}
		}



		var invTransfer = record.create({
			type: record.Type.INVENTORY_TRANSFER,
			isDynamic:true
		});

		var vSubsidiaryVal =getSubsidiaryforLocation(whLocation);

		if(vSubsidiaryVal != null && vSubsidiaryVal != '')
		{
			invTransfer.setValue({
				fieldId: 'subsidiary',
				value: vSubsidiaryVal
			});
		}


		invTransfer.setValue({
			fieldId: 'location',
			value: whLocation
		});
		invTransfer.setValue({
			fieldId: 'transferlocation',
			value: towhLocation
		});
		var currDate = DateStamp();
		var parsedCurrentDate = format.parse({
			value: currDate,
			type: format.Type.DATE
		});
		invTransfer.setValue({
			fieldId: 'trandate',
			value: parsedCurrentDate
		});
		invTransfer.selectNewLine({
			sublistId: 'inventory',

		});

		invTransfer.setCurrentSublistValue({
			sublistId: 'inventory',
			fieldId: 'item',
			value: itemId
		});
		invTransfer.setCurrentSublistValue({
			sublistId: 'inventory',
			fieldId: 'adjustqtyby',
			value: quantity
		});

		if(itemType == "lotnumberedinventoryitem" || itemType == "lotnumberedassemblyitem")
		{
			var	compSubRecord = invTransfer.getCurrentSublistSubrecord({
				sublistId: 'inventory',
				fieldId: 'inventorydetail'
			});



			for (var putawayall = 0; putawayall < batchnoArr.length; putawayall++) {
				compSubRecord.selectNewLine({
					sublistId: 'inventoryassignment'
				});
				compSubRecord.setCurrentSublistValue({
					sublistId: 'inventoryassignment',
					fieldId: 'quantity',
					value: parseFloat(quantityArr[putawayall])
				});
				compSubRecord.setCurrentSublistValue({
					sublistId: 'inventoryassignment',
					fieldId: 'receiptinventorynumber',
					value: batchnoArr[putawayall]
				});
				compSubRecord.setCurrentSublistValue({
					sublistId: 'inventoryassignment',
					fieldId: 'binnumber',
					value: fromBinId
				});
				compSubRecord.setCurrentSublistValue({
					sublistId: 'inventoryassignment',
					fieldId: 'tobinnumber',
					value: toBinId
				});
				if(inventoryStatusFeature)
				{
					compSubRecord.setCurrentSublistValue({
						sublistId: 'inventoryassignment',
						fieldId: 'inventorystatus',
						value: fromStatusarr[putawayall]
					});
					compSubRecord.setCurrentSublistValue({
						sublistId: 'inventoryassignment',
						fieldId: 'toinventorystatus',
						value: toStatusarr[putawayall]
					});
				}
				compSubRecord.commitLine({sublistId:'inventoryassignment'});
			}

		}
		else
		{

			var	compSubRecord = invTransfer.getCurrentSublistSubrecord({
				sublistId: 'inventory',
				fieldId: 'inventorydetail'
			});

			for (var n = 0; n < batchnoArr.length; n++) {
				compSubRecord.selectNewLine({
					sublistId: 'inventoryassignment'
				});
				compSubRecord.setCurrentSublistValue({
					sublistId: 'inventoryassignment',
					fieldId: 'quantity',
					value: 1
				});
				compSubRecord.setCurrentSublistValue({
					sublistId: 'inventoryassignment',
					fieldId: 'receiptinventorynumber',
					value: batchnoArr[n]
				});
				compSubRecord.setCurrentSublistValue({
					sublistId: 'inventoryassignment',
					fieldId: 'binnumber',
					value: fromBinId
				});
				compSubRecord.setCurrentSublistValue({
					sublistId: 'inventoryassignment',
					fieldId: 'tobinnumber',
					value: toBinId
				});
				if(inventoryStatusFeature)
				{
					compSubRecord.setCurrentSublistValue({
						sublistId: 'inventoryassignment',
						fieldId: 'inventorystatus',
						value: fromStatusarr[n]
					});
					compSubRecord.setCurrentSublistValue({
						sublistId: 'inventoryassignment',
						fieldId: 'toinventorystatus',
						value: toStatusarr[n]
					});
				}
				compSubRecord.commitLine({sublistId:'inventoryassignment'});
			}


		}
		invTransfer.commitLine({sublistId:'inventory'});
		var inventoryCountId = invTransfer.save();
		log.debug({title:'inventoryCountId',details:inventoryCountId});
		var taskType="XFER";
		var Qty = quantity;
		if(opentaskQty != null && opentaskQty != '' && opentaskQty != 'null' && opentaskQty != 'undefined')
		{
			Qty = opentaskQty;
		}
		var opentaskObj = {};
		var opentaskId = '';
		var impactedRec = {};


		opentaskObj['itemType'] = itemType;
		opentaskObj['whLocation']=whLocation;
		opentaskObj['itemId']=itemId;
		opentaskObj['quantity']=Qty;
		opentaskObj['fromBinId']=fromBinId;
		opentaskObj['toBinId']=toBinId;
		opentaskObj['batchno'] = batchnoArr.toString();
		opentaskObj['inventoryCountId']=inventoryCountId;
		opentaskObj['taskType']=taskType;
		opentaskObj['actwhLocation']='';
		opentaskObj['soInternalId']='';
		opentaskObj['actualBeginTime']=actualBeginTime;
		opentaskObj['units']=units;
		opentaskObj['stockConversionRate']=stockConversionRate;
		opentaskObj['fromStatus']=fromStatus;
		opentaskObj['toStatus']=toStatus;
		opentaskId = updateMoveOpenTaskforInventory(opentaskObj);
		
		impactedRec['opentaskId'] = opentaskId;
		impactedRec['inventoryCountId'] = inventoryCountId;
		return impactedRec;
	}



	function inventoryInvTransfer(invtransferObj)
	{
		log.debug({title:'invtransferObj',details:invtransferObj});
		var itemType =invtransferObj['itemType'];
		var whLocation =invtransferObj['whLocation'];
		var towhLocation =invtransferObj['towhLocation'];
		var itemId=invtransferObj['itemId'];
		var quantity=invtransferObj['quantity'];
		var fromBinId=invtransferObj['fromBinId'];
		var toBinId = invtransferObj['toBinId'];
		var batchno=invtransferObj['batchno'];
		var actualBeginTime=invtransferObj['actualBeginTime'];
		var units =invtransferObj['units'];
		var stockConversionRate =invtransferObj['stockConversionRate'];
		var opentaskQty=invtransferObj['opentaskQty'];
		var fromStatus=invtransferObj['fromStatus'];
		var toStatus=invtransferObj['toStatus'];

		var inventoryStatusFeature = isInvStatusFeatureEnabled();
		var invTransfer = record.create({
			type: record.Type.INVENTORY_TRANSFER,
			isDynamic:true
		});

		var vSubsidiaryVal =getSubsidiaryforLocation(whLocation);


		if(vSubsidiaryVal != null && vSubsidiaryVal != '')
		{
			invTransfer.setValue({
				fieldId: 'subsidiary',
				value: vSubsidiaryVal
			});
		}

		invTransfer.setValue({
			fieldId: 'location',
			value: whLocation
		});

		invTransfer.setValue({
			fieldId: 'transferlocation',
			value: towhLocation
		});
		var currDate = DateStamp();
		var parsedCurrentDate = format.parse({
			value: currDate,
			type: format.Type.DATE
		});
		invTransfer.setValue({
			fieldId: 'trandate',
			value: parsedCurrentDate
		});
		invTransfer.selectNewLine({
			sublistId: 'inventory',

		});

		invTransfer.setCurrentSublistValue({
			sublistId: 'inventory',
			fieldId: 'item',
			value: itemId
		});
		invTransfer.setCurrentSublistValue({
			sublistId: 'inventory',
			fieldId: 'adjustqtyby',
			value: quantity
		});
		if(itemType == "inventoryitem" || itemType == "assemblyitem") 
		{

			var	compSubRecord = invTransfer.getCurrentSublistSubrecord({
				sublistId: 'inventory',
				fieldId: 'inventorydetail'
			});

			compSubRecord.selectNewLine({
				sublistId: 'inventoryassignment'
			});
			compSubRecord.setCurrentSublistValue({sublistId:'inventoryassignment',fieldId: 'quantity',value:quantity});
			compSubRecord.setCurrentSublistValue({
				sublistId: 'inventoryassignment',
				fieldId: 'binnumber',
				value: fromBinId
			});	
			compSubRecord.setCurrentSublistValue({
				sublistId: 'inventoryassignment',
				fieldId: 'tobinnumber',
				value: toBinId
			});	
			if(inventoryStatusFeature)
			{
				compSubRecord.setCurrentSublistValue({
					sublistId: 'inventoryassignment',
					fieldId: 'inventorystatus',
					value: fromStatus
				});
				compSubRecord.setCurrentSublistValue({
					sublistId: 'inventoryassignment',
					fieldId: 'toinventorystatus',
					value: toStatus
				});
			}

			compSubRecord.commitLine({sublistId:'inventoryassignment'});
		}
		else if(itemType == "lotnumberedinventoryitem" || itemType == "lotnumberedassemblyitem")
		{
			var	compSubRecord = invTransfer.getCurrentSublistSubrecord({
				sublistId: 'inventory',
				fieldId: 'inventorydetail'
			});


			compSubRecord.selectNewLine({
				sublistId: 'inventoryassignment'
			});
			compSubRecord.setCurrentSublistValue({
				sublistId: 'inventoryassignment',
				fieldId: 'quantity',
				value: quantity
			});
			compSubRecord.setCurrentSublistValue({
				sublistId: 'inventoryassignment',
				fieldId: 'receiptinventorynumber',
				value: batchno
			});
			compSubRecord.setCurrentSublistValue({
				sublistId: 'inventoryassignment',
				fieldId: 'binnumber',
				value: fromBinId
			});
			compSubRecord.setCurrentSublistValue({
				sublistId: 'inventoryassignment',
				fieldId: 'tobinnumber',
				value: toBinId
			});
			if(inventoryStatusFeature)
			{
				compSubRecord.setCurrentSublistValue({
					sublistId: 'inventoryassignment',
					fieldId: 'inventorystatus',
					value: fromStatus
				});
				compSubRecord.setCurrentSublistValue({
					sublistId: 'inventoryassignment',
					fieldId: 'toinventorystatus',
					value: toStatus
				});
			}
			compSubRecord.commitLine({sublistId:'inventoryassignment'});

		}
		else
		{
			var filterssertemp = [];
			filterssertemp.push(search.createFilter({name:'custrecord_wmsse_ser_status',operator: search.Operator.IS,values:false}));
			filterssertemp.push(search.createFilter({name:'custrecord_wmsse_ser_tasktype',operator: search.Operator.ANYOF,values:9}));
			filterssertemp.push(search.createFilter({name:'custrecord_wmsse_ser_bin',operator: search.Operator.ANYOF,values:fromBinId}));
			filterssertemp.push(search.createFilter({name:'custrecord_wmsse_ser_item',operator: search.Operator.ANYOF,values:itemId}));
			var columns = [];
			columns.push(search.createColumn('custrecord_wmsse_ser_no'));
			columns.push(search.createColumn('name'));
			var SrchRecordTmpSeriaObj = search.create({type:'customrecord_wmsse_serialentry', filters:filterssertemp,columns:columns});
			var SrchRecordTmpSerial1 = _getSearchResultInJSON(SrchRecordTmpSeriaObj);
			log.debug({title:'SrchRecordTmpSerial1',details:SrchRecordTmpSerial1});
			if(SrchRecordTmpSerial1 != null && SrchRecordTmpSerial1 !='')
			{
				var	compSubRecord = invTransfer.getCurrentSublistSubrecord({
					sublistId: 'inventory',
					fieldId: 'inventorydetail'
				});

				for (var n = 0; n < SrchRecordTmpSerial1.length; n++) {
					compSubRecord.selectNewLine({
						sublistId: 'inventoryassignment'
					});
					compSubRecord.setCurrentSublistValue({
						sublistId: 'inventoryassignment',
						fieldId: 'quantity',
						value: 1
					});
					compSubRecord.setCurrentSublistValue({
						sublistId: 'inventoryassignment',
						fieldId: 'receiptinventorynumber',
						value: SrchRecordTmpSerial1[n]['custrecord_wmsse_ser_no']
					});
					compSubRecord.setCurrentSublistValue({
						sublistId: 'inventoryassignment',
						fieldId: 'binnumber',
						value: fromBinId
					});
					compSubRecord.setCurrentSublistValue({
						sublistId: 'inventoryassignment',
						fieldId: 'tobinnumber',
						value: toBinId
					});
					if(inventoryStatusFeature)
					{
						compSubRecord.setCurrentSublistValue({
							sublistId: 'inventoryassignment',
							fieldId: 'inventorystatus',
							value: fromStatus
						});
						compSubRecord.setCurrentSublistValue({
							sublistId: 'inventoryassignment',
							fieldId: 'toinventorystatus',
							value: toStatus
						});
					}
					compSubRecord.commitLine({sublistId:'inventoryassignment'});
				}
				for (var j = 0; j < SrchRecordTmpSerial1.length; j++) {
					var TempRecord = SrchRecordTmpSerial1[j];
					var serialRec = record.load({
						type : 'customrecord_wmsse_serialentry',
						id : TempRecord.id
					});
					serialRec.setValue({ fieldId:'id', value :TempRecord.id });
					serialRec.setValue({ fieldId:'name', value :TempRecord.name});
					serialRec.setValue({ fieldId:'custrecord_wmsse_ser_note1', value :'because of discontinue of serial number scanning we have marked this serial number as closed'});
					serialRec.setValue({ fieldId:'custrecord_wmsse_ser_status', value :true });
					serialRec.save();
					TempRecord=null;
				}
			}
		}
		invTransfer.commitLine({sublistId:'inventory'});
		var inventoryCountId = invTransfer.save();
		log.debug({title:'inventoryCountId',details:inventoryCountId});
		var taskType="XFER";
		var Qty = quantity;
		if(opentaskQty != null && opentaskQty != '' && opentaskQty != 'null' && opentaskQty != 'undefined')
		{
			Qty = opentaskQty;
		}
		var opentaskObj = {};
		var opentaskId = '';
		var impactedRec = {};		
		
		opentaskObj['itemType'] = itemType;
		opentaskObj['whLocation']=whLocation;
		opentaskObj['itemId']=itemId;
		opentaskObj['quantity']=Qty;
		opentaskObj['fromBinId']=fromBinId;
		opentaskObj['toBinId']=toBinId;
		opentaskObj['batchno'] = batchno;
		opentaskObj['inventoryCountId']=inventoryCountId;
		opentaskObj['taskType']=taskType;
		opentaskObj['actwhLocation']='';
		opentaskObj['soInternalId']='';
		opentaskObj['actualBeginTime']=actualBeginTime;
		opentaskObj['units']=units;
		opentaskObj['stockConversionRate']=stockConversionRate;
		opentaskObj['fromStatus']=fromStatus;
		opentaskObj['toStatus']=toStatus;
		opentaskId = updateMoveOpenTaskforInventory(opentaskObj);
		
		impactedRec['opentaskId'] = opentaskId;
		impactedRec['inventoryCountId'] = inventoryCountId;
		return impactedRec;
	}

	function putawayallBinTransfer(bintransferObj)
	{
		//for both bintransfer,binputaway same function
		log.debug({title:'bintransferObj',details:bintransferObj});
		var itemType =bintransferObj['itemType'];
		var whLocation =bintransferObj['whLocation'];
		var itemId=bintransferObj['itemId'];
		var quantity=bintransferObj['quantity'];
		var fromBinId=bintransferObj['fromBinId'];
		var toBinId = bintransferObj['toBinId'];
		var batchno=bintransferObj['batchno'];
		var actualBeginTime=bintransferObj['actualBeginTime'];
		var units =bintransferObj['units'];
		var stockConversionRate =bintransferObj['stockConversionRate'];
		var opentaskQty=bintransferObj['opentaskQty'];
		var fromStatus=bintransferObj['fromStatus'];
		var toStatus=bintransferObj['toStatus'];
		var fromStatusarr=bintransferObj['fromStatusarr'];
		var toStatusarr=bintransferObj['toStatusarr'];		
		var quantityArr=bintransferObj['quantityarr'];
		var allowAllLots = 'T';
		var inventoryStatusFeature = isInvStatusFeatureEnabled();
		var batchnoArr=[];
		var statusArr=[];
		var quantityArr=[];

		var objBinDetails = getPickBinDetailsLotWithExpiryDates(itemId,fromBinId,'',whLocation,
				null,units,stockConversionRate,allowAllLots,null,null,null,batchno,itemType);



		log.debug({title:'objBinDetails',details:objBinDetails.length});
		if(objBinDetails !=null && objBinDetails.length>0)
		{
			for(var bindetail in objBinDetails)
			{
				binTransferQty=objBinDetails[bindetail]['availableqty'];												
				if(binTransferQty==null || binTransferQty=='')
					binTransferQty=0;

				if(inventoryStatusFeature)
				{
					binTransferQty=Number((Big(binTransferQty).mul(stockConversionRate)).toFixed(8));
				}
				else if(!inventoryStatusFeature && itemType == "lotnumberedinventoryitem" || itemType == "lotnumberedassemblyitem")
				{
					//since the data for serial item in inventory detail of item master is showing in base unit.so need to convet again.have to raise the core issue
					binTransferQty=Number((Big(binTransferQty).mul(stockConversionRate)).toFixed(8));
				}

				if(quantity==null || quantity=='')
					quantity=0;
				quantity=Number(Big(quantity).plus(binTransferQty));												
				vlotNo=objBinDetails[bindetail]['lotnumber'];
				vstatus=objBinDetails[bindetail]['statusid'];
				quantityArr.push(binTransferQty);
				batchnoArr.push(vlotNo);
				if(inventoryStatusFeature)
					statusArr.push(vstatus);
			}
		}


		var binTransfer = record.create({
			type: record.Type.BIN_TRANSFER,
			isDynamic:true
		});

		binTransfer.setValue({
			fieldId: 'location',
			value: whLocation
		});
		var currDate = DateStamp();
		var parsedCurrentDate = format.parse({
			value: currDate,
			type: format.Type.DATE
		});
		binTransfer.setValue({
			fieldId: 'trandate',
			value: parsedCurrentDate
		});
		binTransfer.selectNewLine({
			sublistId: 'inventory',

		});

		binTransfer.setCurrentSublistValue({
			sublistId: 'inventory',
			fieldId: 'item',
			value: itemId
		});
		binTransfer.setCurrentSublistValue({
			sublistId: 'inventory',
			fieldId: 'quantity',
			value: quantity
		});
		if(itemType == "inventoryitem" || itemType == "assemblyitem") 
		{

			var	compSubRecord = binTransfer.getCurrentSublistSubrecord({
				sublistId: 'inventory',
				fieldId: 'inventorydetail'
			});

			compSubRecord.selectNewLine({
				sublistId: 'inventoryassignment'
			});
			compSubRecord.setCurrentSublistValue({sublistId:'inventoryassignment',fieldId: 'quantity',value:quantity});
			compSubRecord.setCurrentSublistValue({
				sublistId: 'inventoryassignment',
				fieldId: 'binnumber',
				value: fromBinId
			});	
			compSubRecord.setCurrentSublistValue({
				sublistId: 'inventoryassignment',
				fieldId: 'tobinnumber',
				value: toBinId
			});	
			if(inventoryStatusFeature)
			{
				compSubRecord.setCurrentSublistValue({
					sublistId: 'inventoryassignment',
					fieldId: 'inventorystatus',
					value: fromStatus
				});
				compSubRecord.setCurrentSublistValue({
					sublistId: 'inventoryassignment',
					fieldId: 'toinventorystatus',
					value: toStatus
				});
			}

			compSubRecord.commitLine({sublistId:'inventoryassignment'});
		}
		else if(itemType == "lotnumberedinventoryitem" || itemType == "lotnumberedassemblyitem" || itemType == "serializedinventoryitem" || itemType=="serializedassemblyitem")
		{
			var	compSubRecord = binTransfer.getCurrentSublistSubrecord({
				sublistId: 'inventory',
				fieldId: 'inventorydetail'
			});

			for (var putawayall = 0; putawayall < batchnoArr.length; putawayall++) {
				compSubRecord.selectNewLine({
					sublistId: 'inventoryassignment'
				});
				if(itemType == "serializedinventoryitem" || itemType=="serializedassemblyitem")
				{
					compSubRecord.setCurrentSublistValue({
						sublistId: 'inventoryassignment',
						fieldId: 'quantity',
						value: 1
					});
				}
				else
				{
					compSubRecord.setCurrentSublistValue({
						sublistId: 'inventoryassignment',
						fieldId: 'quantity',
						value: quantityArr[putawayall]
					});
				}
				compSubRecord.setCurrentSublistValue({
					sublistId: 'inventoryassignment',
					fieldId: 'receiptinventorynumber',
					value: batchnoArr[putawayall]
				});
				compSubRecord.setCurrentSublistValue({
					sublistId: 'inventoryassignment',
					fieldId: 'binnumber',
					value: fromBinId
				});
				compSubRecord.setCurrentSublistValue({
					sublistId: 'inventoryassignment',
					fieldId: 'tobinnumber',
					value: toBinId
				});
				if(inventoryStatusFeature)
				{
					compSubRecord.setCurrentSublistValue({
						sublistId: 'inventoryassignment',
						fieldId: 'inventorystatus',
						value: statusArr[putawayall]
					});
					compSubRecord.setCurrentSublistValue({
						sublistId: 'inventoryassignment',
						fieldId: 'toinventorystatus',
						value: statusArr[putawayall]
					});


				}
				compSubRecord.commitLine({sublistId:'inventoryassignment'});
			}

		}

		binTransfer.commitLine({sublistId:'inventory'});
		var inventoryCountId = binTransfer.save();
		log.debug({title:'inventoryCountId',details:inventoryCountId});
		var taskType="MOVE";
		var Qty = quantity;

		var opentaskObj = {};
		var opentaskId = '';
		var impactedRec = {};


		opentaskObj['itemType'] = itemType;
		opentaskObj['whLocation']=whLocation;
		opentaskObj['itemId']=itemId;
		opentaskObj['quantity'] = Number(Big(Qty).div(stockConversionRate));
		opentaskObj['fromBinId']=fromBinId;
		opentaskObj['toBinId']=toBinId;
		opentaskObj['batchno'] = batchnoArr;
		opentaskObj['inventoryCountId']=inventoryCountId;
		opentaskObj['taskType']=taskType;
		opentaskObj['actwhLocation']='';
		opentaskObj['soInternalId']='';
		opentaskObj['actualBeginTime']=actualBeginTime;
		opentaskObj['units']=units;
		opentaskObj['stockConversionRate']=stockConversionRate;
		opentaskObj['fromStatus']=fromStatus;
		opentaskObj['toStatus']=toStatus;
		opentaskId = updateMoveOpenTaskforInventory(opentaskObj);
		
		impactedRec['opentaskId'] = opentaskId;
		impactedRec['inventoryCountId'] = inventoryCountId;
		return impactedRec;
	}

	function inventoryBinTransfer(bintransferObj)
	{
		log.debug({title:'bintransferObj',details:bintransferObj});
		var itemType =bintransferObj['itemType'];
		var whLocation =bintransferObj['whLocation'];
		var itemId=bintransferObj['itemId'];
		var quantity=bintransferObj['quantity'];
		var fromBinId=bintransferObj['fromBinId'];
		var toBinId = bintransferObj['toBinId'];
		var batchno=bintransferObj['batchno'];
		var actualBeginTime=bintransferObj['actualBeginTime'];
		var units =bintransferObj['units'];
		var stockConversionRate =bintransferObj['stockConversionRate'];
		var opentaskQty=bintransferObj['opentaskQty'];
		var fromStatus=bintransferObj['fromStatus'];
		var toStatus=bintransferObj['toStatus'];
		var processType  = bintransferObj['processType'];


		var batchnoArr=[];
		var statusArr=[];
		var quantityArr=[];
		var lotArrr = [];

		if((itemType == "lotnumberedinventoryitem" || itemType == "lotnumberedassemblyitem") && (processType == "replen"))
		{
			var quantityArray=bintransferObj['scannedStatusQtyList'];
			var batchno=bintransferObj['scannedStatusLotList'];
			var fromStatusArray=bintransferObj['scannedStatusList'];	

			if(_isValueValid(batchno))
			{				
				var lotArray=batchno.split(',');				
				for(var intItr=0;intItr<lotArray.length;intItr++)
				{
					batchnoArr.push(lotArray[intItr]);

				}
			}
			if(_isValueValid(quantityArray))
			{
				var totalQuantity=0;				
				var qtyArray=quantityArray.split(',');				
				for(var qtyItr=0;qtyItr<qtyArray.length;qtyItr++)
				{					
					totalQuantity=Number(Big(totalQuantity).plus(qtyArray[qtyItr]));
					var lotQauntity =Number(Big(qtyArray[qtyItr]).mul(stockConversionRate));
					quantityArr.push(lotQauntity);

				}
				log.debug({title:'totalQuantity',details:totalQuantity});
				quantity=Number((Big(totalQuantity).mul(stockConversionRate)).toFixed(8));

			}			
			if(_isValueValid(fromStatus))
			{

				var statusArray=fromStatusArray.split(',');				
				for(var statusItr=0;statusItr<statusArray.length;statusItr++)
				{
					statusArr.push(statusArray[statusItr]);

				}
			}

			log.debug({title:'batchnoArr',details:batchnoArr});
			log.debug({title:'quantityArray',details:quantityArray});
			log.debug({title:'statusArr',details:statusArr});

		}
		log.debug({title:'quantity',details:quantity});
		var inventoryStatusFeature = isInvStatusFeatureEnabled();
		var binTransfer = record.create({
			type: record.Type.BIN_TRANSFER,
			isDynamic:true
		});

		binTransfer.setValue({
			fieldId: 'location',
			value: whLocation
		});
		var currDate = DateStamp();
		var parsedCurrentDate = format.parse({
			value: currDate,
			type: format.Type.DATE
		});
		binTransfer.setValue({
			fieldId: 'trandate',
			value: parsedCurrentDate
		});
		binTransfer.selectNewLine({
			sublistId: 'inventory',

		});

		binTransfer.setCurrentSublistValue({
			sublistId: 'inventory',
			fieldId: 'item',
			value: itemId
		});
		binTransfer.setCurrentSublistValue({
			sublistId: 'inventory',
			fieldId: 'quantity',
			value: quantity
		});
		if(itemType == "inventoryitem" || itemType == "assemblyitem") 
		{

			var	compSubRecord = binTransfer.getCurrentSublistSubrecord({
				sublistId: 'inventory',
				fieldId: 'inventorydetail'
			});

			compSubRecord.selectNewLine({
				sublistId: 'inventoryassignment'
			});
			compSubRecord.setCurrentSublistValue({sublistId:'inventoryassignment',fieldId: 'quantity',value:quantity});
			compSubRecord.setCurrentSublistValue({
				sublistId: 'inventoryassignment',
				fieldId: 'binnumber',
				value: fromBinId
			});	
			compSubRecord.setCurrentSublistValue({
				sublistId: 'inventoryassignment',
				fieldId: 'tobinnumber',
				value: toBinId
			});	
			if(inventoryStatusFeature)
			{
				compSubRecord.setCurrentSublistValue({
					sublistId: 'inventoryassignment',
					fieldId: 'inventorystatus',
					value: fromStatus
				});
				compSubRecord.setCurrentSublistValue({
					sublistId: 'inventoryassignment',
					fieldId: 'toinventorystatus',
					value: toStatus
				});
			}

			compSubRecord.commitLine({sublistId:'inventoryassignment'});
		}
		else if(itemType == "lotnumberedinventoryitem" || itemType == "lotnumberedassemblyitem")
		{

			if(processType == "replen")
			{

				log.debug({title:'batchnoArr.length',details:batchnoArr.length});

				var	compSubRecord = binTransfer.getCurrentSublistSubrecord({
					sublistId: 'inventory',
					fieldId: 'inventorydetail'
				});

				for (var putawayall = 0; putawayall < batchnoArr.length; putawayall++) {

					compSubRecord.selectNewLine({
						sublistId: 'inventoryassignment'
					});

					compSubRecord.setCurrentSublistValue({
						sublistId: 'inventoryassignment',
						fieldId: 'quantity',
						value: quantityArr[putawayall]
					});

					compSubRecord.setCurrentSublistValue({
						sublistId: 'inventoryassignment',
						fieldId: 'receiptinventorynumber',
						value: batchnoArr[putawayall]
					});
					compSubRecord.setCurrentSublistValue({
						sublistId: 'inventoryassignment',
						fieldId: 'binnumber',
						value: fromBinId
					});
					compSubRecord.setCurrentSublistValue({
						sublistId: 'inventoryassignment',
						fieldId: 'tobinnumber',
						value: toBinId
					});
					if(inventoryStatusFeature)
					{
						compSubRecord.setCurrentSublistValue({
							sublistId: 'inventoryassignment',
							fieldId: 'inventorystatus',
							value: statusArr[putawayall]
						});
						compSubRecord.setCurrentSublistValue({
							sublistId: 'inventoryassignment',
							fieldId: 'toinventorystatus',
							value: statusArr[putawayall]
						});


					}
					compSubRecord.commitLine({sublistId:'inventoryassignment'});
				}

			}
			else
			{
				var	compSubRecord = binTransfer.getCurrentSublistSubrecord({
					sublistId: 'inventory',
					fieldId: 'inventorydetail'
				});


				compSubRecord.selectNewLine({
					sublistId: 'inventoryassignment'
				});
				compSubRecord.setCurrentSublistValue({
					sublistId: 'inventoryassignment',
					fieldId: 'quantity',
					value: quantity
				});
				compSubRecord.setCurrentSublistValue({
					sublistId: 'inventoryassignment',
					fieldId: 'receiptinventorynumber',
					value: batchno
				});
				compSubRecord.setCurrentSublistValue({
					sublistId: 'inventoryassignment',
					fieldId: 'binnumber',
					value: fromBinId
				});
				compSubRecord.setCurrentSublistValue({
					sublistId: 'inventoryassignment',
					fieldId: 'tobinnumber',
					value: toBinId
				});
				if(inventoryStatusFeature)
				{
					compSubRecord.setCurrentSublistValue({
						sublistId: 'inventoryassignment',
						fieldId: 'inventorystatus',
						value: fromStatus
					});
					compSubRecord.setCurrentSublistValue({
						sublistId: 'inventoryassignment',
						fieldId: 'toinventorystatus',
						value: toStatus
					});
				}
				compSubRecord.commitLine({sublistId:'inventoryassignment'});
			}

		}
		else
		{
			var filterssertemp = [];
			filterssertemp.push(search.createFilter({name:'custrecord_wmsse_ser_status',operator: search.Operator.IS,values:false}));
			if(_isValueValid(processType) && processType == 'replen')
			{
				filterssertemp.push(search.createFilter({name:'custrecord_wmsse_ser_tasktype',operator: search.Operator.ANYOF,values:[17]}));
			}
			else
			{
				filterssertemp.push(search.createFilter({name:'custrecord_wmsse_ser_tasktype',operator: search.Operator.ANYOF,values:9}));
			}
			if(_isValueValid(processType) && processType == 'replen')
			{
				filterssertemp.push(search.createFilter({name:'custrecord_wmsse_ser_bin',operator: search.Operator.ANYOF,values:toBinId}));
			}
			else
			{
				filterssertemp.push(search.createFilter({name:'custrecord_wmsse_ser_bin',operator: search.Operator.ANYOF,values:fromBinId}));
			}
			filterssertemp.push(search.createFilter({name:'custrecord_wmsse_ser_item',operator: search.Operator.ANYOF,values:itemId}));
			var columns = [];
			columns.push(search.createColumn('custrecord_wmsse_ser_no'));
			columns.push(search.createColumn('name'));
			var SrchRecordTmpSeriaObj = search.create({type:'customrecord_wmsse_serialentry', filters:filterssertemp,columns:columns});
			var SrchRecordTmpSerial1 = _getSearchResultInJSON(SrchRecordTmpSeriaObj);
			log.debug({title:'SrchRecordTmpSerial1',details:SrchRecordTmpSerial1});
			if(SrchRecordTmpSerial1 != null && SrchRecordTmpSerial1 !='')
			{
				var	compSubRecord = binTransfer.getCurrentSublistSubrecord({
					sublistId: 'inventory',
					fieldId: 'inventorydetail'
				});

				for (var n = 0; n < SrchRecordTmpSerial1.length; n++) {
					compSubRecord.selectNewLine({
						sublistId: 'inventoryassignment'
					});
					compSubRecord.setCurrentSublistValue({
						sublistId: 'inventoryassignment',
						fieldId: 'quantity',
						value: 1
					});
					compSubRecord.setCurrentSublistValue({
						sublistId: 'inventoryassignment',
						fieldId: 'receiptinventorynumber',
						value: SrchRecordTmpSerial1[n]['custrecord_wmsse_ser_no']
					});
					compSubRecord.setCurrentSublistValue({
						sublistId: 'inventoryassignment',
						fieldId: 'binnumber',
						value: fromBinId
					});
					compSubRecord.setCurrentSublistValue({
						sublistId: 'inventoryassignment',
						fieldId: 'tobinnumber',
						value: toBinId
					});
					if(inventoryStatusFeature)
					{
						compSubRecord.setCurrentSublistValue({
							sublistId: 'inventoryassignment',
							fieldId: 'inventorystatus',
							value: fromStatus
						});
						compSubRecord.setCurrentSublistValue({
							sublistId: 'inventoryassignment',
							fieldId: 'toinventorystatus',
							value: toStatus
						});
					}
					compSubRecord.commitLine({sublistId:'inventoryassignment'});
				}
				for (var j = 0; j < SrchRecordTmpSerial1.length; j++) {
					var TempRecord = SrchRecordTmpSerial1[j];
					var serialRec = record.load({
						type : 'customrecord_wmsse_serialentry',
						id : TempRecord.id
					});
					serialRec.setValue({ fieldId:'id', value :TempRecord.id });
					serialRec.setValue({ fieldId:'name', value :TempRecord.name});
					serialRec.setValue({ fieldId:'custrecord_wmsse_ser_note1', value :'because of discontinue of serial number scanning we have marked this serial number as closed'});
					serialRec.setValue({ fieldId:'custrecord_wmsse_ser_status', value :true });
					serialRec.save();
					TempRecord=null;
				}
			}
		}
		binTransfer.commitLine({sublistId:'inventory'});
		var inventoryCountId = binTransfer.save();
		log.debug({title:'inventoryCountId',details:inventoryCountId});
		var taskType="MOVE";
		var Qty = quantity;
		if(opentaskQty != null && opentaskQty != '' && opentaskQty != 'null' && opentaskQty != 'undefined')
		{
			Qty = opentaskQty;
		}
		var opentaskObj = {};
		var opentaskId = '';
		var impactedRec = {};
		opentaskObj['itemType'] = itemType;
		opentaskObj['whLocation']=whLocation;
		opentaskObj['itemId']=itemId;
		opentaskObj['quantity']=Qty;
		opentaskObj['fromBinId']=fromBinId;
		opentaskObj['toBinId']=toBinId;
		opentaskObj['batchno'] = batchno;
		opentaskObj['inventoryCountId']=inventoryCountId;
		opentaskObj['taskType']=taskType;
		opentaskObj['actwhLocation']='';
		opentaskObj['soInternalId']='';
		opentaskObj['actualBeginTime']=actualBeginTime;
		opentaskObj['units']=units;
		opentaskObj['stockConversionRate']=stockConversionRate;
		opentaskObj['fromStatus']=fromStatus;
		opentaskObj['toStatus']=toStatus;
		opentaskId = updateMoveOpenTaskforInventory(opentaskObj);
		
		impactedRec['opentaskId'] = opentaskId;
		impactedRec['inventoryCountId'] = inventoryCountId;
		return impactedRec;
	}

	/**
	 * To create/update open task with Move task type
	 * @param itemType
	 * @param whLocation
	 * @param itemId
	 * @param quantity
	 * @param fromBinId
	 * @param toBinId
	 * @param batchno
	 * @param inventoryCountId
	 * @param taskType
	 * @param ActwhLocation
	 */
	function updateMoveOpenTaskforInventory(opentaskObj)
	{
		var itemType = opentaskObj['itemType'];
		var whLocation = opentaskObj['whLocation'];
		var itemId = opentaskObj['itemId'];
		var quantity = opentaskObj['quantity'];
		var fromBinId = opentaskObj['fromBinId'];
		var toBinId = opentaskObj['toBinId'];
		var batchno = opentaskObj['batchno'];
		var inventoryCountId = opentaskObj['inventoryCountId'];
		var taskType = opentaskObj['taskType'];
		var actwhLocation = opentaskObj['actwhLocation'];
		var soInternalId =opentaskObj['soInternalId'];
		var	actualBeginTime = opentaskObj['actualBeginTime'];
		var units = opentaskObj['units'];
		var stockConversionRate = opentaskObj['stockConversionRate'];
		var fromStatus = opentaskObj['fromStatus'];
		var toStatus = opentaskObj['toStatus'];
		var customrecord = record.create({type:'customrecord_wmsse_trn_opentask'});

		if(_isValueValid(inventoryCountId))
		{
			customrecord.setValue({fieldId:'name',value:inventoryCountId});
		}
		var currDate = DateStamp();
		var parsedCurrentDate = format.parse({
			value: currDate,
			type: format.Type.DATE
		});
		customrecord.setValue({fieldId:'custrecord_wmsse_act_begin_date',value:parsedCurrentDate});
		customrecord.setValue({fieldId:'custrecord_wmsse_act_end_date',value: parsedCurrentDate});

		customrecord.setValue({fieldId:'custrecord_wmsse_act_qty',value:quantity});

		customrecord.setValue({fieldId:'custrecord_wmsse_sku',value:itemId});

		customrecord.setValue({fieldId:'custrecord_wmsse_expe_qty',value:quantity});
		if(taskType=="MOVE")
		{
			customrecord.setValue({fieldId:'custrecord_wmsse_wms_status_flag',value:19});//storage

			customrecord.setValue({fieldId:'custrecord_wmsse_tasktype',value:9}); //For MOVE
			if(_isValueValid(soInternalId))
			{
				customrecord.setValue({fieldId:'custrecord_wmsse_order_no',value: soInternalId});
			}
		}
		else if(taskType=="XFER")//For inventory transfer
		{
			customrecord.setValue({fieldId:'custrecord_wmsse_wms_status_flag',value:19});//storage

			customrecord.setValue({fieldId:'custrecord_wmsse_tasktype',value:18}); //For Inventory Transfer
			if(_isValueValid(actwhLocation))
			{
				customrecord.setValue({fieldId:'custrecord_wmsse_act_wms_location',value: actwhLocation});
			}
		}
		if(_isValueValid(units))
		{
			customrecord.setValue({fieldId:'custrecord_wmsse_uom',value:units});
		}

		if(_isValueValid(stockConversionRate))
		{
			customrecord.setValue({fieldId:'custrecord_wmsse_conversionrate',value:stockConversionRate});
		}

		customrecord.setValue({fieldId:'custrecord_wmsse_actbeginloc',value:fromBinId});
		customrecord.setValue({fieldId:'custrecord_wmsse_actendloc',value:toBinId});

		if (itemType == translator.getTranslationString("ITEMTYPE_LOT") || 
				itemType == translator.getTranslationString("ITEMTYPE_LOT_ASSEMBLY")) {

			if(_isValueValid(batchno))
			{
				customrecord.setValue({fieldId:'custrecord_wmsse_batch_num',value:batchno});
			}

		}
		if(_isValueValid(actualBeginTime))
		{
			var parsedBeginTime = parseTimeString(actualBeginTime);
			customrecord.setValue({fieldId:'custrecord_wmsse_actualbegintime',value:parsedBeginTime});
		}
		var timeStamp=getCurrentTimeStamp();
		var parsedCurrentTime = parseTimeString(timeStamp);
		customrecord.setValue({fieldId:'custrecord_wmsse_actualendtime',value: parsedCurrentTime});

		customrecord.setValue({fieldId:'custrecord_wmsse_wms_location',value: whLocation});	
		customrecord.setValue({fieldId:'custrecord_wmsse_parent_sku_no',value:itemId});
		if(_isValueValid(inventoryCountId) && taskType!="XFER")
		{
			customrecord.setValue({fieldId:'custrecord_wmsse_nsconfirm_ref_no',value: inventoryCountId});
		}

		if(_isValueValid(fromStatus))
		{
			customrecord.setValue({fieldId:'custrecord_wmsse_inventorystatus',value: fromStatus});
		}

		if(_isValueValid(toStatus))
		{
			customrecord.setValue({fieldId:'custrecord_wmsse_inventorystatusto',value: toStatus});
		}

		var currentUserID = runtime.getCurrentUser();
		customrecord.setValue({fieldId:'custrecord_wmsse_upd_user_no',value: currentUserID.id});
		var recid = customrecord.save();
		return recid;

	}
	function getPickBinDetailsLotWithExpiryDates(getItemInternalId,vBinIdArr,getPreferBin,strLocation,
			makeInvAvailFlagFromSelect,itemUnitType,itemStockUnit,allowAllLots,selectedConversionRate,stockConversionUnitname,selectedUOMText,batchno,itemType)
	{
		var vmakeInvAvailFlag = true;
		var vLocDetails = search.lookupFields({
			type: search.Type.LOCATION,
			id: strLocation,
			columns: ['makeinventoryavailable']
		});
		vmakeInvAvailFlag = vLocDetails.makeinventoryavailable;
		var inventoryStatusFeature = isInvStatusFeatureEnabled();
		var systemRule_AllowExpiredItems=' ';
		systemRule_AllowExpiredItems = getSystemRuleValue('Allow picking of expired items?',strLocation);



		if(inventoryStatusFeature)
		{
			var objBinDetails =[];
			var vBinLocArr=[];
			var invBalanceSearch = search.load({id:'customsearch_wmsse_inventorybalance',type:search.Type.INVENTORY_BALANCE});
			var filters = invBalanceSearch.filters;

			log.debug({title:'batchno',details:batchno});
			if(getItemInternalId != null && getItemInternalId != '')
			{
				filters.push(search.createFilter({
					name:'internalid',
					join:'item', 
					operator:search.Operator.ANYOF, 
					values:getItemInternalId}));
			}
			if(_isValueValid(batchno))
			{
				filters.push(search.createFilter({
					name:'inventorynumber',					
					operator:search.Operator.ANYOF, 
					values:batchno}));
			}
			if(strLocation!= null && strLocation!= '')
			{
				filters.push(search.createFilter({
					name:'location',
					operator:search.Operator.ANYOF, 
					values:strLocation}));
			}
			if(vBinIdArr!= null && vBinIdArr!= '')
			{
				filters.push(search.createFilter({
					name:'binnumber',
					operator:search.Operator.ANYOF, 
					values:vBinIdArr}));
			}
			if(makeInvAvailFlagFromSelect != null && makeInvAvailFlagFromSelect != '' && makeInvAvailFlagFromSelect != 'null' &&
					makeInvAvailFlagFromSelect != 'undefined' && makeInvAvailFlagFromSelect != undefined)
			{
				if(makeInvAvailFlagFromSelect == 'T' || makeInvAvailFlagFromSelect == 'F')
				{
					filters.push(search.createFilter({
						name:'inventoryavailable',
						join:'inventorystatus',
						operator:search.Operator.IS, 
						values:makeInvAvailFlagFromSelect}));
				}
				else
				{
					if(makeInvAvailFlagFromSelect != 'All')
					{
						filters.push(search.createFilter({
							name:'status',
							operator:search.Operator.ANYOF, 
							values:makeInvAvailFlagFromSelect}));
					}

				}
			}

			if((systemRule_AllowExpiredItems == 'N' || systemRule_AllowExpiredItems == '') && (allowAllLots != 'T'))

			{
				var currDate = DateStamp();

				var dateFormat = DateSetting();
				var defalutExpiryDate  = setExpiryDate(dateFormat,'01','01','2199');
				filters.push(search.createFilter({
					name:'formuladate',
					operator:search.Operator.ONORAFTER, 
					formula:"NVL({inventorynumber.expirationdate},TO_DATE('"+defalutExpiryDate+"','"+dateFormat+"'))",
					values:currDate}));

			}

			invBalanceSearch.filters = filters;
			objBinDetails = _getSearchResultInJSON(invBalanceSearch)

			if(objBinDetails.length >0)
			{


				var vLotExpArr=[];
				var vLotArr=[];
				var vValidBinIdArr=[];
				var vValidBinTextArr=[];
				var vValidBinAvailQtyArr=[];
				var vValidBinInvNumArr=[];
				var vValidBinStatusArr = [];	
				var vValidBinStatusIDArr =[];
				var vstrLotNameCSV="";
				var strBinCSV="";
				for(var binItr in objBinDetails)
				{
					//No need to check status Makeavailable flag
					var vValidBinId=objBinDetails[binItr]['binnumber'];
					var vValidBin=objBinDetails[binItr]['binnumberText'];
					var vBinQtyAvail=objBinDetails[binItr]['available'];
					log.debug({title:'vBinQtyAvail4',details:vBinQtyAvail});
					var vBinInvNum=objBinDetails[binItr]['inventorynumberText'];
					var vBinStatus=objBinDetails[binItr]['statusText'];
					var vValidBinStatusId = objBinDetails[binItr]['status'];
					var vLotExp  = objBinDetails[binItr]['expirationdate'];

					log.debug({title:'vBinQtyAvail5',details:vBinQtyAvail});
					vBinQtyAvail = parseFloat(vBinQtyAvail);

					if(parseFloat(vBinQtyAvail) > 0)
					{						
						if(vValidBin != getPreferBin)
						{
							var availableQuantityWithUOM = vBinQtyAvail + " "+stockConversionUnitname;
							if(_isValueValid(selectedConversionRate) && _isValueValid(itemStockUnit) && (selectedConversionRate != itemStockUnit))
							{
								vBinQtyAvail = uomConversions(vBinQtyAvail,selectedConversionRate,itemStockUnit);
								availableQuantityWithUOM = vBinQtyAvail + " "+selectedUOMText;
							}
							log.debug({title:'vBinQtyAvail6',details:vBinQtyAvail});

							var currRow ={'binnumber':vValidBin,'availableqty':vBinQtyAvail,'bininternalid':vValidBinId,
									'lotnumber':vBinInvNum,'lotexpirydate':vLotExp,'status':vBinStatus,'statusid':vValidBinStatusId,'availableQuantityWithUOM':availableQuantityWithUOM};
							vBinLocArr.push(currRow);
						}
					}


				}
			}

		}
		else
		{
			var vBinLocArr=[];
			var binDetailsSearch = search.load({id:'customsearch_wmsse_itemwise_lots'});
			var filterStrat =  binDetailsSearch.filters;
			if(getItemInternalId != null && getItemInternalId != '')
			{
				filterStrat.push(search.createFilter({
					name:'internalid',
					operator: search.Operator.ANYOF,
					values:getItemInternalId}));
			}
			if(strLocation!= null && strLocation!= '')
			{
				filterStrat.push(search.createFilter({
					name:'location',
					join:'inventoryNumberBinOnHand', 
					operator: search.Operator.ANYOF,
					values:strLocation}));
			}
			if(_isValueValid(batchno))
			{
				filterStrat.push(search.createFilter({
					name:'inventorynumber',	
					join:'inventoryNumberBinOnHand',
					operator:search.Operator.IS, 
					values:batchno}));
			}
			if(vBinIdArr!= null && vBinIdArr!= '')
			{
				filterStrat.push(search.createFilter({
					name:'binnumber',
					join:'inventoryNumberBinOnHand',
					operator: search.Operator.ANYOF,
					values:vBinIdArr}));
			}
			binDetailsSearch.filters = filterStrat;
			var objBinDetails = _getSearchResultInJSON(binDetailsSearch);
			log.debug({title:'objBinDetails',details:objBinDetails});
			if(objBinDetails.length >0)
			{

				var vLotExpArr=[];
				var vLotArr=[];

				var vValidBinIdArr=[];
				var vValidBinTextArr=[];
				var vValidBinAvailQtyArr=[];
				var vValidBinInvNumArr=[];
				var vstrLotNameCSV="";
				var strBinCSV="";
				var objBinDetailsRec='';
				var vValidBinId='';
				var vValidBin ='';
				var vBinQtyAvail='';
				var vBinInvNum ='';
				for(var bindetail in objBinDetails)
				{
					objBinDetailsRec = objBinDetails[bindetail];
					vValidBinId=objBinDetailsRec['binnumber'];
					vValidBin=objBinDetailsRec['binnumberText'];
					if(vmakeInvAvailFlag)
						vBinQtyAvail=objBinDetailsRec['quantityavailable'];
					else
						vBinQtyAvail=objBinDetailsRec['quantityonhand'];
					vBinInvNum=objBinDetailsRec['inventorynumberText'];
					vValidBinIdArr.push(vValidBinId);
					vValidBinTextArr.push(vValidBin);

					vValidBinAvailQtyArr.push(vBinQtyAvail);
					vValidBinInvNumArr.push(vBinInvNum);
					if(strBinCSV == "")
						strBinCSV=vValidBinId;
					else
						strBinCSV=strBinCSV + ',' + vValidBinId;
					if(vstrLotNameCSV == "")
						vstrLotNameCSV=vBinInvNum;
					else
						vstrLotNameCSV= vstrLotNameCSV + ',' + vBinInvNum;

				}

				var searchName = 'customsearch_wmsse_expdate_lots';

				if(itemType == "serializedinventoryitem" || itemType == "serializedassemblyitem")
				{
					searchName = 'customsearch_wmsse_details';
				}
				var lotExpiryDateSearch = search.load({id:searchName});

				var filtersExp = lotExpiryDateSearch.filters;
				if (getItemInternalId != null && getItemInternalId != ""){
					filtersExp.push(search.createFilter({
						name:'internalid',
						operator:search.Operator.ANYOF,
						values:getItemInternalId}));		
				}
				if(strLocation != null && strLocation != '' && strLocation != 'null')
				{
					filtersExp.push(search.createFilter({
						name:'location',
						join:'inventorynumber',
						operator:search.Operator.ANYOF,
						values:strLocation}));

				}
				if(allowAllLots != 'T')
				{
					var systemRule_AllowExpiredItems = getSystemRuleValue('Allow picking of expired items?',strLocation);
					if((systemRule_AllowExpiredItems == 'N'))
					{
						var currDate = DateStamp();
						var dateFormat = DateSetting();
						var defalutExpiryDate  = setExpiryDate(dateFormat,'01','01','2199');
						filtersExp.push(search.createFilter({
							name:'formuladate',
							operator:search.Operator.ONORAFTER, 
							formula:"NVL({inventorynumber.expirationdate},TO_DATE('"+defalutExpiryDate+"','"+dateFormat+"'))",
							values:currDate}));
					}
				}
				lotExpiryDateSearch.filters = filtersExp;
				var searchresultsExp =_getSearchResultInJSON(lotExpiryDateSearch);
				if(searchresultsExp.length > 0)
				{ 
					for(var s in searchresultsExp)
					{

						if(searchresultsExp[s]['inventorynumber'] != null && searchresultsExp[s]['inventorynumber'] != '')
						{
							if(vValidBinInvNumArr.indexOf(searchresultsExp[s]['inventorynumber']) != -1)
							{	
								vLotArr.push(searchresultsExp[s]['inventorynumber']);
								vLotExpArr.push(searchresultsExp[s]['expirationdate']);
							}
						}	
					}	
				}

				for(var u=0;u<vLotArr.length;u++)
				{
					if(vLotArr[u]!= null && vLotArr[u]!= '')
					{	
						var vLotExp = vLotExpArr[u];
						var vTempLotArrNew=vstrLotNameCSV.split(',');
						var vTempLotArr = [];
						for(var l=0;l<vTempLotArrNew.length;l++)
						{
							var tLot= vTempLotArrNew[l];
							if(tLot == vLotArr[u])
							{
								vTempLotArr.push(l);
							}
						}
						if(vTempLotArr.length>1)//Means lot occures in more than once
						{
							for(l1=0;l1<vValidBinIdArr.length;l1++)
							{
								if(vValidBinInvNumArr[l1] == vLotArr[u])
								{
									var vValidBin = vValidBinTextArr[l1];
									var vValidBinId = vValidBinIdArr[l1];
									var vBinQtyAvail = vValidBinAvailQtyArr[l1];
									log.debug({title:'vBinQtyAvail3',details:vBinQtyAvail});
									var vBinQtyInvNum = vValidBinInvNumArr[l1];

									log.debug({title:'vBinQtyAvail2',details:vBinQtyAvail});
									vBinQtyAvail = parseFloat(vBinQtyAvail);
									if(parseFloat(vBinQtyAvail) > 0)
									{
										var availableQuantityWithUOM = vBinQtyAvail + " "+stockConversionUnitname;
										if(_isValueValid(selectedConversionRate) && _isValueValid(itemStockUnit) && (selectedConversionRate != itemStockUnit))
										{
											vBinQtyAvail = uomConversions(vBinQtyAvail,selectedConversionRate,itemStockUnit);
											availableQuantityWithUOM = vBinQtyAvail + " "+selectedUOMText;
										}
										if(vValidBin != getPreferBin)
										{
											var currRow ={'binnumber':vValidBin,'availableqty':vBinQtyAvail,'bininternalid':vValidBinId,'lotnumber':vBinQtyInvNum,'lotexpirydate':vLotExp,'availableQuantityWithUOM':availableQuantityWithUOM};
											vBinLocArr.push(currRow);
										}
									}
								}
							}

						}
						else
						{
							var vValidBin = vValidBinTextArr[vValidBinInvNumArr.indexOf(vLotArr[u])];
							var vBinQtyAvail = vValidBinAvailQtyArr[vValidBinInvNumArr.indexOf(vLotArr[u])];
							log.debug({title:'vBinQtyAvail1',details:vBinQtyAvail});
							var vBinQtyInvNum = vValidBinInvNumArr[vValidBinInvNumArr.indexOf(vLotArr[u])];
							var vValidBinId = vValidBinIdArr[vValidBinInvNumArr.indexOf(vLotArr[u])];

							vBinQtyAvail = parseFloat(vBinQtyAvail);
							if(parseFloat(vBinQtyAvail) > 0)
							{
								var availableQuantityWithUOM = vBinQtyAvail + " "+stockConversionUnitname;
								if(_isValueValid(selectedConversionRate) && _isValueValid(itemStockUnit) && (selectedConversionRate != itemStockUnit))
								{
									vBinQtyAvail = uomConversions(vBinQtyAvail,selectedConversionRate,itemStockUnit);
									availableQuantityWithUOM = vBinQtyAvail + " "+selectedUOMText;
								}
								if(vValidBin != getPreferBin)
								{
									var currRow ={'binnumber':vValidBin,'availableqty':vBinQtyAvail,'bininternalid':vValidBinId,'lotnumber':vBinQtyInvNum,'lotexpirydate':vLotExp,'availableQuantityWithUOM':availableQuantityWithUOM};
									vBinLocArr.push(currRow);
								}
							}
						}	
					}

				}
			}
		}
		log.debug({title:'vBinLocArr',details:vBinLocArr});
		return vBinLocArr;

	}


	/**
	 * To get Bin location details to pick based on pick strategies
	 */
	function getPickBinDetails(pickBinDetailsObj,processType,binLengthRequired)
	{
		var getItemInternalId = pickBinDetailsObj['itemInternalId'];
		var strItemGrp = pickBinDetailsObj['strItemGrp'];
		var strItemFam = pickBinDetailsObj['strItemFamily'];
		var getPreferBin = pickBinDetailsObj["preferBinId"];
		var strLocation = pickBinDetailsObj["whLocationId"];
		var strItemDept = pickBinDetailsObj["department"];
		var strItemClass = pickBinDetailsObj["classes"];
		var strOrderType = pickBinDetailsObj["strOrderType"];
		var strvUnits = pickBinDetailsObj["strvUnits"];
		var boolinclIBStageInvFlag =pickBinDetailsObj["boolinclIBStageInvFlag"];
		var makeInvAvailFlagFromSelect = pickBinDetailsObj["makeInvAvailFlagFromSelect"];
		var itemType = pickBinDetailsObj["itemType"];
		var itemUnitType = pickBinDetailsObj["unitType"];
		var itemStockUnit = pickBinDetailsObj["blnItemUnit"];
		var getPreferBinId = pickBinDetailsObj["preferBinId"];
		var selectedConversionRate = pickBinDetailsObj["selectedConversionRate"];
		var currentConversionRate = pickBinDetailsObj["currentConversionRate"];
		var invstatusarray=[];
		var inventoryStatusFeature = isInvStatusFeatureEnabled();

		if(! _isValueValid(makeInvAvailFlagFromSelect))
		{
			makeInvAvailFlagFromSelect='All';
		}
		if(inventoryStatusFeature==true && makeInvAvailFlagFromSelect!=null && makeInvAvailFlagFromSelect!=''
			&& makeInvAvailFlagFromSelect!='All')
		{
			if(makeInvAvailFlagFromSelect == 'T' || makeInvAvailFlagFromSelect == 'F')
			{
				invstatusarray=getInventoryAvailableStatus(makeInvAvailFlagFromSelect);
			}
			else
			{ 
				invstatusarray=getSelectedStatus(makeInvAvailFlagFromSelect);
			}

		}
		var vmakeInvAvailFlag = true;
		var vLocDetails = search.lookupFields({
			type: search.Type.LOCATION,
			id: strLocation,
			columns: ['makeinventoryavailable']
		});
		vmakeInvAvailFlag = vLocDetails.makeinventoryavailable;
		var vBinLocArr=[];
		var vPickZoneArr=[];
		var vBinIntIdExcludeArr = [];
		var filterPref = [];
		var inclIBStageInvFlagArr =[];
		var stageLocArr = [];

		if(_isValueValid(getPreferBin) && processType != 'replen')
		{
			var BinlocationSearch =  search.create({
				type:'customlist_wmsse_bin_loc_type',
				columns:[{
					name: 'name'}]
			});
			var	 BinlocationTypes = BinlocationSearch.run().getRange({
				start: 0,
				end: 1000
			});
			if(BinlocationTypes.length > 0)
			{
				var stgTypeArr = [];
				stgTypeArr.push('Stage');
				stageLocArr =_getStageLocations(stgTypeArr,BinlocationTypes);
				stageLocArr.push('@NONE@');
			}
			var preferBinSearch = search.load({id:'customsearch_wmsse_binsbypickzonesearch'});
			var PreferBinFilters =preferBinSearch.filters;

			PreferBinFilters.push(search.createFilter({name:
				'inactive',
				operator:search.Operator.IS,
				values:false}));


			PreferBinFilters.push(search.createFilter({name:
				'binnumber',
				operator:search.Operator.IS,
				values:getPreferBin}));


			if(_isValueValid(strLocation))
			{
				PreferBinFilters.push(search.createFilter({name:
					'location',
					operator:search.Operator.ANYOF,
					values:strLocation}));

			}
			if(stageLocArr.length > 0)
			{
				PreferBinFilters.push(search.createFilter({name:
					'custrecord_wmsse_bin_loc_type',
					operator:search.Operator.ANYOF,
					values:stageLocArr}));
          	if(processType == 'invtransfer'){
				PreferBinFilters.push(search.createFilter({name:
					'custrecord_wmsse_bin_stg_direction',
					operator:search.Operator.ANYOF,
					values: ['@NONE@','1']}));
          }
			}
			preferBinSearch.filters = PreferBinFilters;
			var objPrefBinIdDetails = _getSearchResultInJSON(preferBinSearch);

			if(objPrefBinIdDetails.length>0 && objPrefBinIdDetails[0]['internalid']!= null && 
					objPrefBinIdDetails[0]['internalid'] != '' && _isValueValid(getPreferBin))
			{
				getPreferBinId=objPrefBinIdDetails[0]['internalid'];
				log.debug({title:'getPreferBinId',details:getPreferBinId});
				//Inventorystatus Feature is enabled
				if(inventoryStatusFeature)
				{
					var vStockUnit="";
					var vUnittype="";
					var objPrefBinDetails =[];
					var searchName = 'customsearch_wmsse_invtbalance_invt_item';
					if(itemType == "inventoryitem" || itemType == "assemblyitem")
					{
						searchName = 'customsearch_wmsse_invtbalance_invt_item';
					}
					else  
					{
						searchName = 'customsearch_wmsse_invtbalance_serialsrh';

					}						
					var objPrefSearch =search.load({id:searchName,type:search.Type.INVENTORY_BALANCE});
					var preferBinFilters =objPrefSearch.filters;
					if(_isValueValid(getItemInternalId))
					{
						preferBinFilters.push(search.createFilter({name:
							'internalid',
							join:'item',
							operator:search.Operator.ANYOF,
							values:getItemInternalId}));

					}
					if(_isValueValid(strLocation))
					{
						preferBinFilters.push(search.createFilter({name:
							'location',
							operator:search.Operator.ANYOF,
							values:strLocation}));

					}

					if(_isValueValid(makeInvAvailFlagFromSelect))
					{
						if(makeInvAvailFlagFromSelect == 'T' || makeInvAvailFlagFromSelect == 'F')
						{
							preferBinFilters.push(search.createFilter({name:
								'inventoryavailable',
								join:'inventorystatus',
								operator:search.Operator.IS,
								values:makeInvAvailFlagFromSelect}));

						}
						else
						{
							if(makeInvAvailFlagFromSelect != 'All')
							{
								preferBinFilters.push(search.createFilter({name:
									'status',
									operator:search.Operator.ANYOF,
									values:makeInvAvailFlagFromSelect}));
							}

						}

					}
					preferBinFilters.push(search.createFilter({name:
						'binnumber',
						operator:search.Operator.ANYOF,
						values:objPrefBinIdDetails[0]['internalid']}));

					objPrefSearch.filters = preferBinFilters;
					var objPrefBinDetails  = _getSearchResultInJSON(objPrefSearch);

					if(objPrefBinDetails.length > 0)
					{
						var vValidBinId='';
						var vValidBin='';
						var vPrefBinQtyAvail='';
						var vBinStatus='';
						var vBinStatusID='';
						var VZone ='';

						for(var prefBinIterator in  objPrefBinDetails)
						{

							vValidBinId=objPrefBinDetails[prefBinIterator]['binnumber'];
							vValidBin=objPrefBinDetails[prefBinIterator]['binnumberText'];
							vPrefBinQtyAvail=objPrefBinDetails[prefBinIterator]['available'];
							vBinStatus=objPrefBinDetails[prefBinIterator]['statusText'];
							VZone = objPrefBinDetails[prefBinIterator]['custrecord_wmsse_zoneText'];
							vBinStatusID = objPrefBinDetails[prefBinIterator]['status'];

							vPrefBinQtyAvail = parseFloat(vPrefBinQtyAvail);
							if(parseFloat(vPrefBinQtyAvail) > 0)
							{
								if(_isValueValid(selectedConversionRate) && _isValueValid(currentConversionRate) && (selectedConversionRate != currentConversionRate))
								{
									vPrefBinQtyAvail = uomConversions(vPrefBinQtyAvail,selectedConversionRate,currentConversionRate);
								}
								var currRow ={'binnumber':getPreferBin,'availableqty':vPrefBinQtyAvail,'bininternalid':objPrefBinIdDetails[0]['internalid'],'zone':VZone,'status':vBinStatus};
								vBinIntIdExcludeArr.push(objPrefBinIdDetails[0]['internalid']);
								vBinLocArr.push(currRow);

							}
						}
					}
				}
				else
				{
					var preferBinSearch = search.load({id:'customsearch_wmsse_itemwise_inventory'});
					var filterPrefInv = preferBinSearch.filters;
					if(_isValueValid(getItemInternalId))
					{
						filterPrefInv.push(search.createFilter({
							name:'internalid',
							operator:search.Operator.ANYOF,
							values:getItemInternalId}));
					}
					if(strLocation!= null && strLocation!= '')
					{
						filterPrefInv.push(search.createFilter({
							name:'location',
							join:'binonhand',
							operator:search.Operator.ANYOF,
							values:strLocation}));
					}

					filterPrefInv.push(search.createFilter({
						name:'binnumber',
						join:'binonhand',
						operator:search.Operator.ANYOF,
						values:objPrefBinIdDetails[0]['internalid']}));

					preferBinSearch.filters = filterPrefInv;

					var objPrefBinDetails = _getSearchResultInJSON(preferBinSearch);
					if(objPrefBinDetails.length > 0)
					{
						var prefBinQtyAvail= 0;
						if(vmakeInvAvailFlag)
						{
							prefBinQtyAvail=objPrefBinDetails[0]['quantityavailable'];
						}
						else
						{
							prefBinQtyAvail=objPrefBinDetails[0]['quantityonhand'];
						}
						var VZone = objPrefBinIdDetails[0]['custrecord_wmsse_zoneText'];

						prefBinQtyAvail = parseFloat(prefBinQtyAvail);
						if(parseFloat(prefBinQtyAvail) > 0)
						{
							if(_isValueValid(selectedConversionRate) && _isValueValid(currentConversionRate))
							{
								prefBinQtyAvail = uomConversions(prefBinQtyAvail,selectedConversionRate,currentConversionRate);
							}

							var currRow ={'binnumber':getPreferBin,'availableqty':prefBinQtyAvail,'bininternalid':objPrefBinIdDetails[0]['internalid'],'zone':VZone};
							vBinIntIdExcludeArr.push(objPrefBinIdDetails[0]['internalid']);
							vBinLocArr.push(currRow);
						}

					}
				}

			}
		}
		var pickStratagiesSearch = search.load({id:'customsearch_wmsse_get_pickstrategies'});
		var pickStratagiesFilters = pickStratagiesSearch.filters;
		if(_isValueValid(getItemInternalId))
		{
			pickStratagiesFilters.push(search.createFilter({
				name:'custrecord_wmsse_pick_item',
				operator:search.Operator.ANYOF,
				values:['@NONE@',getItemInternalId]}));
		}

		if(_isValueValid(strItemGrp))
		{
			pickStratagiesFilters.push(search.createFilter({
				name:'custrecord_wmsse_pick_itemgroup',
				operator:search.Operator.ANYOF,
				values:['@NONE@',strItemGrp]}));
		}
		else
		{
			pickStratagiesFilters.push(search.createFilter({
				name:'custrecord_wmsse_pick_itemgroup',
				operator:search.Operator.ANYOF, 
				values:['@NONE@']}));
		}
		if(_isValueValid(strItemFam))
		{
			pickStratagiesFilters.push(search.createFilter({
				name:'custrecord_wmsse_pick_itemfamily',
				operator:search.Operator.ANYOF,
				values:['@NONE@',strItemFam]}));
		}
		else
		{
			pickStratagiesFilters.push(search.createFilter({
				name:'custrecord_wmsse_pick_itemfamily',
				operator:search.Operator.ANYOF,
				values:['@NONE@']}));
		}
		if(_isValueValid(strLocation))
		{
			pickStratagiesFilters.push(search.createFilter({
				name:'custrecord_wmsse_pick_location',
				operator:search.Operator.ANYOF,
				values:['@NONE@',strLocation]}));
		}
		else
		{
			pickStratagiesFilters.push(search.createFilter({
				name:'custrecord_wmsse_pick_location',
				operator:search.Operator.ANYOF,
				values:['@NONE@']}));
		}
		pickStratagiesFilters.push(search.createFilter({
			name:'isinactive',
			operator:search.Operator.IS,
			values:false}));

		if(_isValueValid(strItemDept))
		{
			pickStratagiesFilters.push(search.createFilter({
				name:'custrecord_wmsse_pick_department',
				operator:search.Operator.ANYOF,
				values:['@NONE@',strItemDept]}));
		}
		else
		{
			pickStratagiesFilters.push(search.createFilter({
				name:'custrecord_wmsse_pick_department',
				operator:search.Operator.ANYOF,
				values:['@NONE@']}));
		}

		if(_isValueValid(strItemClass))
		{
			pickStratagiesFilters.push(search.createFilter({
				name:'custrecord_wmsse_pick_class',
				operator:search.Operator.ANYOF,
				values:['@NONE@',strItemClass]}));
		}
		else
		{
			pickStratagiesFilters.push(search.createFilter({
				name:'custrecord_wmsse_pick_class',
				operator:search.Operator.ANYOF,
				values:['@NONE@']}));
		}

		if(_isValueValid(strOrderType))
		{
			pickStratagiesFilters.push(search.createFilter({
				name:'custrecord_wmsse_pick_ordertype',
				operator:search.Operator.ANYOF,
				values:['@NONE@',strOrderType]}));
		}
		if(_isValueValid(strvUnits))
		{
			pickStratagiesFilters.push(search.createFilter({
				name:'custrecord_wmsse_pick_units',
				operator:search.Operator.ANYOF,
				values:['@NONE@',strvUnits]}));
		}
		if(inventoryStatusFeature==true && _isValueValid(invstatusarray))
		{
			pickStratagiesFilters.push(search.createFilter({
				name:'custrecord_wmsse_invstatus',
				operator:search.Operator.ANYOF,
				values:invstatusarray}));
		}

		pickStratagiesSearch.filters  = pickStratagiesFilters;

		var objPickstrategies = _getSearchResultInJSON(pickStratagiesSearch);
		if(objPickstrategies.length > 0)
		{
			var vBinLocStatusArr  = [];
			for(var pickStrategie in objPickstrategies)
			{

				var strPickZone= objPickstrategies[pickStrategie]['custrecord_wmsse_pick_zone'];
				var strInvStatus= objPickstrategies[pickStrategie]['custrecord_wmsse_invstatusText'];
				var inclIBStageInvFlag = objPickstrategies[pickStrategie]['custrecord_wmsse_pick_from_stageloc'];

				//This is to restrict the display of stage bins at inventroy to bin scan page
				if(_isValueValid(boolinclIBStageInvFlag) && ((boolinclIBStageInvFlag == false)||(boolinclIBStageInvFlag == 'false')))
				{
					inclIBStageInvFlag   = false;
				}
				//ends

				if(!_isValueValid(strPickZone))
				{
					strPickZone="-None-";
				}

				if(inclIBStageInvFlag == true && stageLocArr.length == 0)
				{
					var BinlocationSearch =  search.create({
						type:'customlist_wmsse_bin_loc_type',
						columns:[{
							name: 'name'}]
					});
					var	 BinlocationTypes = BinlocationSearch.run().getRange({
						start: 0,
						end: 1000
					});
					if(BinlocationTypes.length > 0)
					{
						var stgTypeArr = [];
						stgTypeArr.push('Stage');
						stageLocArr =_getStageLocations(stgTypeArr,BinlocationTypes);
						stageLocArr.push('@NONE@');
					}
				}
				var strPickZoneText= objPickstrategies[pickStrategie]['custrecord_wmsse_pick_zoneText'];
				var pickZoneIndx = vPickZoneArr.indexOf(strPickZone);
				if(_isValueValid(strPickZone) && (vPickZoneArr.indexOf(strPickZone)== -1 ||
						(inclIBStageInvFlag == true && inclIBStageInvFlag != inclIBStageInvFlagArr[pickZoneIndx]) ))
				{
					vPickZoneArr.push(strPickZone);
					inclIBStageInvFlagArr.push(inclIBStageInvFlag);
					var vBinIdArr=[];
					var vBinArr=[];
					var vNonStorageBinIdArr = [];
					if(_isValueValid(strPickZone)&& strPickZone != '-None-')
					{	
						var objBinByZoneDetails = [];
						if(inclIBStageInvFlag == false)
						{
							objBinByZoneDetails = fnGetBinsbyZones(strPickZone,strLocation);
						}
						else
						{
							objBinByZoneDetails = fnGetBinsbyZonesAlongWithStage(strPickZone,strLocation);
						}
						if(objBinByZoneDetails.length > 0)
						{

							for(var bin in objBinByZoneDetails)
							{ 
								vBinIdArr.push(objBinByZoneDetails[bin]['internalid']);
								vBinArr.push(objBinByZoneDetails[bin]['binnumber']);

							}
						}
					}
					else if(strPickZone == '-None-')
					{
						if(!inclIBStageInvFlag)
						{

							var binSearch = search.load({id:'customsearch_wmsse_non_storagebins'});
							var binFilters = binSearch.filters;

							if(_isValueValid(strLocation))
							{
								binFilters.push(search.createFilter({name:'location',
									operator:search.Operator.ANYOF,
									values:strLocation}));
							}

							binFilters.push(search.createFilter({name:'inactive',
								operator:search.Operator.IS,
								values:false}));

							binSearch.filters = binFilters;

							objBinByZoneDetails = _getSearchResultInJSON(binSearch);

							if(objBinByZoneDetails.length > 0)
							{
								for(var j=0;j<objBinByZoneDetails.length;j++)
								{ 
									vNonStorageBinIdArr.push(objBinByZoneDetails[j].id);						 

								}
							}
						}
					}
					else
					{

					}

					var systemRule_AllowExpiredItems=' ';
					systemRule_AllowExpiredItems = getSystemRuleValue('Allow picking of expired items?',strLocation);
					log.debug({title:'systemRule_AllowExpiredItems',details:systemRule_AllowExpiredItems});
					var filterStrat = [];
					if(inventoryStatusFeature)
					{
						var invstatusid = getStatusId(strInvStatus);
						var objBinDetails = [];

						var searchName = 'customsearch_wmsse_invtbalance_invt_item';
						if(itemType == "inventoryitem" || itemType == "assemblyitem")
						{
							searchName = 'customsearch_wmsse_invtbalance_invt_item';
						}
						else  
						{
							searchName = 'customsearch_wmsse_invtbalance_serialsrh';

						}
						var inventorySearchDetails = search.load({id:searchName,type:search.Type.INVENTORY_BALANCE});
						var inventorySearchFilters = inventorySearchDetails.filters;

						if(_isValueValid(strLocation))
						{
							inventorySearchFilters.push(search.createFilter({
								name:'location',
								operator:search.Operator.ANYOF,
								values:strLocation}));
						}

						if(_isValueValid(getItemInternalId))
						{
							inventorySearchFilters.push(search.createFilter({
								name:'internalid',
								join:'item',
								operator:search.Operator.ANYOF,
								values:getItemInternalId}));
						}
						log.debug({title:'vNonStorageBinIdArr',details:vNonStorageBinIdArr});
						if(_isValueValid(vNonStorageBinIdArr))
						{
							inventorySearchFilters.push(search.createFilter({
								name:'binnumber',
								operator:search.Operator.NONEOF,
								values:vNonStorageBinIdArr}));
						}

						if((systemRule_AllowExpiredItems == 'N' || systemRule_AllowExpiredItems == '') && (itemType == "lotnumberedinventoryitem" || itemType== "lotnumberedassemblyitem"))
						{
							var currDate = DateStamp();

							var dateFormat = DateSetting();
							var defalutExpiryDate  = setExpiryDate(dateFormat,'01','01','2199');
							inventorySearchFilters.push(search.createFilter({
								name:'formuladate',
								operator:search.Operator.ONORAFTER, 
								formula:"NVL({inventorynumber.expirationdate},TO_DATE('"+defalutExpiryDate+"','"+dateFormat+"'))",
								values:currDate}));

						}
						if(makeInvAvailFlagFromSelect != null && makeInvAvailFlagFromSelect != '' && makeInvAvailFlagFromSelect != 'null' &&
								makeInvAvailFlagFromSelect != 'undefined' && makeInvAvailFlagFromSelect != undefined )
						{
							if(makeInvAvailFlagFromSelect == 'T' || makeInvAvailFlagFromSelect == 'F')
							{
								inventorySearchFilters.push(search.createFilter({
									name:'inventoryavailable',
									join:'inventorystatus',
									operator:search.Operator.IS,
									values:makeInvAvailFlagFromSelect}));
								if(invstatusid!=null && invstatusid!='' && invstatusid!='undefined')
								{
									inventorySearchFilters.push(search.createFilter({
										name:'status',
										operator:search.Operator.ANYOF,
										values:invstatusid}));
								}
							}
							else
							{
								if(makeInvAvailFlagFromSelect != 'All')
								{
									inventorySearchFilters.push(search.createFilter({
										name:'status',
										operator:search.Operator.ANYOF,
										values:makeInvAvailFlagFromSelect}));
								}
								else
								{
									if(invstatusid!=null && invstatusid!='' && invstatusid!='undefined')
									{
										inventorySearchFilters.push(search.createFilter({
											name:'status',
											operator:search.Operator.ANYOF,
											values:invstatusid}));
									}
									else
									{
										if(strInvStatus=='All Available')
										{
											inventorySearchFilters.push(search.createFilter({
												name:'inventoryavailable',
												join:'inventorystatus',
												operator:search.Operator.ANYOF,
												values:true}));
										}
										else if(strInvStatus=='Not Available')
										{
											inventorySearchFilters.push(search.createFilter({
												name:'inventoryavailable',
												join:'inventorystatus',
												operator:search.Operator.ANYOF,
												values:false}));
										}
									}
								}

							}

						}

						inventorySearchDetails.filters = inventorySearchFilters;
						objBinDetails = _getSearchResultInJSON(inventorySearchDetails);

						if(objBinDetails.length >0)
						{

							var vValidBinIdArr=[];
							var vValidBinTextArr=[];
							var vValidBinAvailQtyArr=[];
							var vValidBinStatusArr =  [];
							var vValidBinStatusIdArr =  [];
							var vValidBinId='';
							var vValidBin='';
							var vBinQtyAvail='';
							var vBinStatus='';
							var vBinStatusId='';
							var vBinLocStatusArr=[];
							for(var invIterator in objBinDetails)
							{
								log.debug({title:'objBinDetails',details:objBinDetails[invIterator]})
								vValidBinId=objBinDetails[invIterator]['binnumber'];
								if(_isValueValid(vValidBinId))
								{
									if((strPickZone == '-None-' || vBinIdArr.indexOf(vValidBinId) != -1)
											&& vBinIntIdExcludeArr.indexOf(vValidBinId) == -1)
									{
										vValidBin=objBinDetails[invIterator]['binnumberText'];
										vBinQtyAvail=objBinDetails[invIterator]['available'];
										vBinStatus=objBinDetails[invIterator]['statusText'];
										vBinStatusId=objBinDetails[invIterator]['status'];
										var binIndex = 	vValidBinIdArr.indexOf(vValidBinId);

										if((vValidBinIdArr.indexOf(vValidBinId)==-1) || (vValidBinStatusIdArr[binIndex] != vBinStatusId ))
										{
											vValidBinIdArr.push(vValidBinId);
											vValidBinTextArr.push(vValidBin);
											vValidBinAvailQtyArr.push(vBinQtyAvail);
											vValidBinStatusArr.push(vBinStatus);
											vValidBinStatusIdArr.push(vBinStatusId);
										}
										else
										{
											var binQty = vValidBinAvailQtyArr[binIndex];
											var totalBinAvailableQty = parseFloat(binQty)+parseFloat(vBinQtyAvail);
											vValidBinAvailQtyArr[binIndex] = totalBinAvailableQty;
										}
									}
								}

							}
							var objBinwithSeq=[];
							if(vValidBinIdArr.length > 0 && inclIBStageInvFlag == true)
							{
								var binsByPickZoneSearch = search.load({id:'customsearch_wmsse_binsbypickzonenodir'});
								var binFilters = binsByPickZoneSearch.filters;
								binFilters.push(search.createFilter({
									name:'internalid',
									operator:search.Operator.ANYOF,
									values:vValidBinIdArr}));

								if(_isValueValid(strLocation))
								{
									binFilters.push(search.createFilter({
										name:'location',
										operator:search.Operator.ANYOF,
										values:strLocation}));
								}

								binFilters.push(search.createFilter({
									name:'inactive',
									operator:search.Operator.IS,
									values:false}));

								if(stageLocArr.length > 0)
								{
									binFilters.push(search.createFilter({
										name:'custrecord_wmsse_bin_loc_type',
										operator:search.Operator.ANYOF,
										values:stageLocArr}));
                    if(processType == 'invtransfer'){
									binFilters.push(search.createFilter({name:
										'custrecord_wmsse_bin_stg_direction',
										operator:search.Operator.ANYOF,
										values: ['@NONE@','1']}));
                    }
								}

								binsByPickZoneSearch.filters = binFilters;

								objBinwithSeq = _getSearchResultInJSON(binsByPickZoneSearch);

							}
							else if(vValidBinIdArr.length > 0 && inclIBStageInvFlag == false)
							{

								log.debug({title:'vValidBinIdArr',details:vValidBinIdArr});
								var binSearchObj = search.load({id:'customsearch_wmsse_binsbypickzones'});

								var binFilters = binSearchObj.filters;

								binFilters.push(search.createFilter({
									name:'internalid',
									operator:search.Operator.ANYOF,
									values:vValidBinIdArr}));


								if(_isValueValid(strLocation))
								{
									binFilters.push(search.createFilter({
										name:'location',
										operator:search.Operator.ANYOF,
										values:strLocation}));
								}

								binFilters.push(search.createFilter({
									name:'inactive',
									operator:search.Operator.ANYOF,
									values:false}));

								binSearchObj.filters = binFilters;

								objBinwithSeq =  _getSearchResultInJSON(binSearchObj);

							}
							var strPickZone = strPickZoneText;
							if(objBinwithSeq.length > 0)
							{
								for(var objItr=0;objItr<objBinwithSeq.length ;objItr++)
								{
									var vValidBinId=objBinwithSeq[objItr]['internalid'];								
									if(!_isValueValid(strPickZone))
									{
										strPickZoneText=objBinwithSeq[objItr]['custrecord_wmsse_zoneText'];

									}
									for(var binItr=0;binItr<vValidBinIdArr.length;binItr++)
									{
										var bin = vValidBinIdArr[binItr];
										var status = vValidBinStatusIdArr[binItr];
										var vValidBinStatus =  vValidBinStatusArr[binItr];									
										var vValidBinStatusId = vValidBinStatusIdArr[binItr];

										if(vValidBinId!= null && vValidBinId!= '' && vValidBinId == bin  )
										{
											if(vValidBinIdArr.indexOf(vValidBinId) != -1)
											{
												var vValidBin = vValidBinTextArr[binItr];
												var vBinQtyAvail = vValidBinAvailQtyArr[binItr];

												var vValidBinStatus =  vValidBinStatusArr[binItr];	

												vBinQtyAvail = parseFloat(vBinQtyAvail);
												if(parseFloat(vBinQtyAvail) > 0)
												{
													if(vValidBin != getPreferBin && vValidBinId != getPreferBinId)
													{			
														if(_isValueValid(selectedConversionRate) && _isValueValid(currentConversionRate))
														{
															vBinQtyAvail = uomConversions(vBinQtyAvail,selectedConversionRate,currentConversionRate);
														}
														vBinIntIdExcludeArr.push(vValidBinId);
														var currRow ={'binnumber':vValidBin,'availableqty':vBinQtyAvail,'bininternalid':vValidBinId,'zone':strPickZoneText,'status':vValidBinStatus};
														vBinLocArr.push(currRow);
														if(_isValueValid(processType)  && processType == 'replen' &&_isValueValid(binLengthRequired) && binLengthRequired ==1  && vBinLocArr.length > 1)
														{
															break;
														}
													}
												}

											}	
										}
									}
								}
							}

						}	

					}
					else
					{
						var itemSearchObj = search.load({id:'customsearch_wmsse_itemwise_inventory'});
						var itemSearchFilters = itemSearchObj.filters;

						if(_isValueValid(strLocation))
						{
							itemSearchFilters.push(search.createFilter({
								name:'location',
								join:'binonhand',
								operator:search.Operator.ANYOF,
								values:strLocation}));
						}
						if(_isValueValid(getItemInternalId))
						{
							itemSearchFilters.push(search.createFilter({
								name:'internalid',
								operator:search.Operator.ANYOF,
								values:getItemInternalId}));
						}
						if(_isValueValid(vNonStorageBinIdArr))
						{
							itemSearchFilters.push(search.createFilter({
								name:'binnumber',
								join:'binonhand',
								operator:search.Operator.NONEOF,
								values:vNonStorageBinIdArr}));
						}
						itemSearchObj.filters = itemSearchFilters;
						var objBinDetails =  _getSearchResultInJSON(itemSearchObj); 
						if(objBinDetails.length >0)
						{

							var vValidBinIdArr=[];
							var vValidBinTextArr=[];
							var vValidBinAvailQtyArr=[];

							for(var vbinItr in objBinDetails)
							{
								var vValidBinId=objBinDetails[vbinItr]['binnumber'];
								if(_isValueValid(vValidBinId))
								{
									if((strPickZone == '-None-' || vBinIdArr.indexOf(vValidBinId) != -1)&& 
											vBinIntIdExcludeArr.indexOf(vValidBinId) == -1)
									{
										var vValidBin=objBinDetails[vbinItr]['binnumberText'];
										if(vmakeInvAvailFlag)
											var vBinQtyAvail=objBinDetails[vbinItr]['quantityavailable'];
										else
											var vBinQtyAvail=objBinDetails[vbinItr]['quantityonhand'];
										vValidBinIdArr.push(vValidBinId);
										vValidBinTextArr.push(vValidBin);
										vValidBinAvailQtyArr.push(vBinQtyAvail);
									}
								}

							}
							var objBinwithSeq=null;
							if(vValidBinIdArr.length > 0 && inclIBStageInvFlag == true)
							{
								var binSearchObj = search.load({id:'customsearch_wmsse_binsbypickzonenodir'});
								var binSearchFilters = binSearchObj.filters;

								binSearchFilters.push(search.createFilter({
									name:'internalid',
									operator:search.Operator.ANYOF,
									values:vValidBinIdArr}));

								if(_isValueValid(strLocation))
								{
									binSearchFilters.push(search.createFilter({
										name:'location',
										operator:search.Operator.ANYOF,
										values:strLocation}));
								}

								binSearchFilters.push(search.createFilter({
									name:'inactive',
									operator:search.Operator.ANYOF,
									values:false}));

								if(stageLocArr.length > 0)
								{
									binSearchFilters.push(search.createFilter({
										name:'custrecord_wmsse_bin_loc_type',
										operator:search.Operator.ANYOF,
										values:stageLocArr}));
                    if(processType == 'invtransfer'){
									binSearchFilters.push(search.createFilter({name:
										'custrecord_wmsse_bin_stg_direction',
										operator:search.Operator.ANYOF,
										values: ['@NONE@','1']}));
                    }
								}
								binSearchObj.filters = binSearchFilters;

								objBinwithSeq = _getSearchResultInJSON(binSearchObj); 

							}
							else if(vValidBinIdArr.length > 0 && inclIBStageInvFlag == false)
							{

								var binSearchObj = search.load({id:'customsearch_wmsse_binsbypickzones'});
								var binSearchFilters = binSearchObj.filters;
								binSearchFilters.push(search.createFilter({
									name:'internalid',
									operator:search.Operator.ANYOF,
									values:vValidBinIdArr}));


								if(_isValueValid(strLocation))
								{

									binSearchFilters.push(search.createFilter({
										name:'location',
										operator:search.Operator.ANYOF,
										values:strLocation}));
								}

								binSearchFilters.push(search.createFilter({
									name:'inactive',
									operator:search.Operator.IS,
									values:false}));
								binSearchObj.filters = binSearchFilters;

								objBinwithSeq = _getSearchResultInJSON(binSearchObj); 

							}
							var strPickZone = strPickZoneText;
							if(objBinwithSeq != null && objBinwithSeq.length > 0)
							{

								for(var l=0;l<objBinwithSeq.length;l++)
								{
									var vValidBinId=objBinwithSeq[l]['internalid'];								
									if(strPickZone == null || strPickZone == "" || strPickZone == "null")
									{
										strPickZoneText=objBinwithSeq[l]['custrecord_wmsse_zoneText'];

									}
									if(vValidBinId!= null && vValidBinId!= '')
									{
										if(vValidBinIdArr.indexOf(vValidBinId) != -1)
										{
											var vValidBin = vValidBinTextArr[vValidBinIdArr.indexOf(vValidBinId)];
											var vBinQtyAvail = vValidBinAvailQtyArr[vValidBinIdArr.indexOf(vValidBinId)];											
											vBinQtyAvail = parseFloat(vBinQtyAvail);
											if(parseFloat(vBinQtyAvail) > 0)
											{											
												if(vValidBin != getPreferBin && vValidBinId != getPreferBinId)
												{
													log.debug({title:'selectedConversionRate u',details:selectedConversionRate});
													log.debug({title:'currentConversionRate u',details:currentConversionRate});
													if(_isValueValid(selectedConversionRate) && _isValueValid(currentConversionRate) && (selectedConversionRate != currentConversionRate))
													{
														vBinQtyAvail = uomConversions(vBinQtyAvail,selectedConversionRate,currentConversionRate);
													}
													var currRow ={'binnumber':vValidBin,'availableqty':vBinQtyAvail,'bininternalid':vValidBinId,'zone':strPickZoneText};
													vBinIntIdExcludeArr.push(vValidBinId);
													vBinLocArr.push(currRow);
													if(_isValueValid(processType)  && processType == 'replen' &&_isValueValid(binLengthRequired) && binLengthRequired ==1  && vBinLocArr.length > 1)
													{
														break;
													}
												}
											}

										}	
									}
								}
							}

						}	
					}

				}	
				if(_isValueValid(processType)  && processType == 'replen' &&_isValueValid(binLengthRequired) && binLengthRequired ==1  && vBinLocArr.length > 1)
				{
					break;
				}
			}
		}
		return vBinLocArr;
	}


	function inventoryNumberInternalId(serial, location, item,processType){
		var internalId = '';
		var invNumSearch = search.load({id:'customsearch_inv_num_basic_search'});

		if(_isValueValid(serial))
		{
			invNumSearch.filters.push(search.createFilter({
				name : 'inventorynumber',
				operator : search.Operator.IS,
				values : serial
			}));
		}

		invNumSearch.filters.push(search.createFilter({
			name : 'location',
			operator:search.Operator.ANYOF,
			values : location
		}));

		if(_isValueValid(item))
		{
			invNumSearch.filters.push(search.createFilter({
				name : 'item',
				operator : search.Operator.ANYOF,
				values : item
			}));
		}
		var invNumSearchRes =  _getSearchResultInJSON(invNumSearch);

		if(invNumSearchRes.length > 0){
			internalId = invNumSearchRes[0]['id'];
		}
		if(_isValueValid(processType)){
			return invNumSearchRes;
		}else{
			return internalId;
		}

	}
	function _getcomponentmapping(scriptid,barcodecomponentsstring)
	{
		var barcodecomponents=JSON.parse(JSON.stringify(barcodecomponentsstring));

		var compmappingarr = [];

		if(barcodecomponents!=null && barcodecomponents!='')
		{
			var searchObj = search.load({id:'customsearch_wmsse_barcodecomp_mapping'});
			var columns = searchObj.columns;
			columns.push(search.createColumn({name:'custrecord_barcode_mappingcomponent'}));
			columns.push(search.createColumn({name:'custrecord_barcode_mappinginputfieldtype'}));
			columns.push(search.createColumn({name:'custrecord_barcode_mappingfieldposition'}));

			var filters = searchObj.filters;
			filters.push(search.createFilter({
				name:'custrecord_barcode_pagescriptid',
				join:'custrecord_barcode_mappingpage', 
				operator:search.Operator.IS, 
				values:scriptid}));
			filters.push(search.createFilter({
				name:'isinactive',
				operator:search.Operator.IS, 
				values:false}));

			searchObj.filters = filters;
			searchObj.columns = columns;
			var	insrchbccomponentmapping = _getSearchResultInJSON(searchObj);

			if(insrchbccomponentmapping.length>0)
			{
				for (var srchitr in insrchbccomponentmapping)
				{
					var vfieldtype = srchbccomponentmapping[srchitr]['custrecord_barcode_mappinginputfieldtypeText'];
					var vfieldposition = srchbccomponentmapping[srchitr]['custrecord_barcode_mappingfieldposition'];
					var vcomponentname = srchbccomponentmapping[srchitr]['custrecord_barcode_mappingcomponentText'];
					var vcomponentvalue ='';
					if(!isempty(barcodecomponents[vcomponentname]))
						vcomponentvalue = barcodecomponents[vcomponentname];

					var currow = [vfieldtype+'$'+vfieldposition+'$'+vcomponentvalue];
					compmappingarr.push(currow);
				}
			}
		}

		return compmappingarr;
	}


	/**
	 * To get Bin location details to pick based on pick strategies
	 */
	function getPickBinDetailsLot(pickBinDetailsArr)
	{
		log.debug({title:'pickBinDetailsArr',details:pickBinDetailsArr});
		var getItemInternalId =pickBinDetailsArr["itemInternalId"] ;
		var strItemGrp = pickBinDetailsArr["strItemGrp"] ;
		var strItemFam = pickBinDetailsArr["strItemFamily"] ;
		var getPreferBin = pickBinDetailsArr["preferBin"] ;
		var strLocation = pickBinDetailsArr["whLocationId"] ;
		var strItemDept = pickBinDetailsArr["strItemDept"] ;
		var strItemClass = pickBinDetailsArr["strItemClass"] ;
		var strOrderType = pickBinDetailsArr["strOrderType"] ;
		var strvUnits = pickBinDetailsArr["strvUnits"] ;
		var boolinclIBStageInvFlag = pickBinDetailsArr["boolinclIBStageInvFlag"] ;
		var makeInvAvailFlagFromSelect = pickBinDetailsArr["makeInvAvailFlagFromSelect"] ;
		var itemUnitType = pickBinDetailsArr["itemUnitType"] ;
		var itemStockUnit = pickBinDetailsArr["itemStockUnit"] ;
		var getPreferBinId = pickBinDetailsArr["preferBinId"] ;
		var allowAllLots= pickBinDetailsArr["allowAllLots"] ;
		var selectedConversionRate = pickBinDetailsArr["selectedConversionRate"];
		var currentConversionRate = pickBinDetailsArr["currentConversionRate"];

		var invstatusarray=[];
		//Check Inventorystatus Feature is turn on/off
		var inventoryStatusFeature = isInvStatusFeatureEnabled();
		if(makeInvAvailFlagFromSelect==null || makeInvAvailFlagFromSelect=='')
		{
			makeInvAvailFlagFromSelect='All';
		}
		if(inventoryStatusFeature==true && makeInvAvailFlagFromSelect!=null &&
				makeInvAvailFlagFromSelect!='' && makeInvAvailFlagFromSelect!='All' )
		{
			if(makeInvAvailFlagFromSelect == 'T' || makeInvAvailFlagFromSelect == 'F')
			{
				invstatusarray=getInventoryAvailableStatus(makeInvAvailFlagFromSelect);
			}
			else
			{
				invstatusarray=getSelectedStatus(makeInvAvailFlagFromSelect);
			}


		}
		var vmakeInvAvailFlag = true;
		var vLocDetails = search.lookupFields({
			type: search.Type.LOCATION,
			id: strLocation,
			columns: ['makeinventoryavailable']
		});
		vmakeInvAvailFlag = vLocDetails.makeinventoryavailable;
		var vBinLocArr=[];
		var vPickZoneArr=[];
		var vValidZoneArr=[];
		var filterPref = [];
		var vIsLotItem='F';
		var objPrefBinDetails="";
		var vPrefBinQtyAvailArr = [];
		var vPrefBinInvNumArr = [];
		var vPrefBinInvNumIDArr = [];
		var vPrefBinQtyAvailArr = [];
		var vprefBinStatusArr =  [];
		var vprefBinStatusIDArr =  [];
		var VZoneArr = [];
		var vBinIntIdExcludeArr = [];
		//Case # 201413255 start
		var systemRule_AllowExpiredItems=' ';
		systemRule_AllowExpiredItems = getSystemRuleValue('Allow picking of expired items?',strLocation);

		if(_isValueValid(getPreferBin))
		{
			var binSearchObj = search.load({id:'customsearch_wmsse_binsbypickzonesearch'});

			var binSearchFilters = binSearchObj.filters;

			binSearchFilters.push(search.createFilter({
				name:'inactive',
				operator:search.Operator.IS,
				values:false}));

			binSearchFilters.push(search.createFilter({
				name:'binnumber',
				operator:search.Operator.IS,
				values:getPreferBin}));

			if(_isValueValid(strLocation))
			{
				binSearchFilters.push(search.createFilter({
					name:'location',
					operator:search.Operator.IS,
					values:strLocation}));
			}
			binSearchFilters.push(search.createFilter({
				name:'custrecord_wmsse_bin_loc_type',
				operator:search.Operator.ANYOF,
				values:['@NONE@','1']}));


			var objPrefBinIdDetails =  _getSearchResultInJSON(binSearchFilters); 


			var vsearchresultsExp =null;
			if(objPrefBinIdDetails.length>0 && objPrefBinIdDetails[0]['internalid']!= null &&
					objPrefBinIdDetails[0]['internalid']!= '')
			{
				var vUnitType="";
				var vStockUnit="";
				//Inventorystatus Feature is enabled
				if(inventoryStatusFeature)
				{
					vsearchresultsExp =[];
					var PrefInvDetailsSearchObj = search.load({id:'customsearch_wmsse_inventorybalance',type:search.Type.INVENTORY_BALANCE});
					var PrefInvDetailsSearchFilters = PrefInvDetailsSearchObj.filters;
					if(_isValueValid(getItemInternalId))
					{
						PrefInvDetailsSearchFilters.push(
								search.createFilter({
									name:'internalid',
									join:'item',
									operator:search.Operator.ANYOF,
									values:getItemInternalId}));	
					}

					if(_isValueValid(strLocation))
					{
						PrefInvDetailsSearchFilters.push(
								search.createFilter({
									name:'location',
									operator:search.Operator.ANYOF,
									values:strLocation}));
					}
					PrefInvDetailsSearchFilters.push(
							search.createFilter({
								name:'binnumber',
								operator:search.Operator.ANYOF,
								values:objPrefBinIdDetails[0]['internalid']}));

					if(makeInvAvailFlagFromSelect != null && makeInvAvailFlagFromSelect != '' && makeInvAvailFlagFromSelect != 'null' &&
							makeInvAvailFlagFromSelect != 'undefined' && makeInvAvailFlagFromSelect != undefined)
					{
						if(makeInvAvailFlagFromSelect == 'T' || makeInvAvailFlagFromSelect == 'F')
						{
							PrefInvDetailsSearchFilters.push(
									search.createFilter({
										name:'inventoryavailable',
										join:'inventorystatus',
										operator:search.Operator.IS,
										values:makeInvAvailFlagFromSelect}));
						}
						else
						{
							if(makeInvAvailFlagFromSelect != 'All')
							{
								PrefInvDetailsSearchFilters.push(
										search.createFilter({
											name:'status',
											operator:search.Operator.ANYOS,
											values:makeInvAvailFlagFromSelect}));
							}

						}
					}
					if(allowAllLots == '' || allowAllLots == 'null' || allowAllLots == null || allowAllLots == undefined)
					{
						allowAllLots = 'F';
					}
					if((systemRule_AllowExpiredItems == 'N') && (allowAllLots != 'T'))
					{
						var currDate = DateStamp();
						var dateFormat = DateSetting();
						var defalutExpiryDate  = setExpiryDate(dateFormat,'01','01','2199');
						PrefInvDetailsSearchFilters.push(search.createFilter({
							name:'formuladate',
							operator:search.Operator.ONORAFTER, 
							formula:"NVL({inventorynumber.expirationdate},TO_DATE('"+defalutExpiryDate+"','"+dateFormat+"'))",
							values:currDate}));
					}

					PrefInvDetailsSearchObj.filters  = PrefInvDetailsSearchFilters;

					vsearchresultsExp = _getSearchResultInJSON(PrefInvDetailsSearchObj);
				}
				else
				{

					var itemSearchObj = search.load({id:'customsearch_wmsse_itemwise_lots'});
					var filterPrefInv = itemSearchObj.filters;

					if(_isValueValid(getItemInternalId))
					{
						filterPrefInv.push(
								search.createFilter({
									name:'internalid',
									operator:search.Operator.ANYOF,
									values:getItemInternalId}));
					}
					if(_isValueValid(strLocation))
					{
						filterPrefInv.push(
								search.createFilter({
									name:'location',
									join:'inventoryNumberBinOnHand',
									operator:search.Operator.ANYOF,
									values:strLocation}));
					}
					filterPrefInv.push(
							search.createFilter({
								name:'binnumber',
								join:'inventoryNumberBinOnHand',
								operator:search.Operator.ANYOF,
								values:objPrefBinIdDetails[0]['internalid']}));

					itemSearchObj.filters = filterPrefInv;

					objPrefBinDetails = _getSearchResultInJSON(itemSearchObj);
					if(objPrefBinDetails.length > 0)
					{
						for(var l1=0;l1<objPrefBinDetails.length;l1++)
						{
							if(vmakeInvAvailFlag)
								var vPrefBinQtyAvail=objPrefBinDetails[l1]['quantityavailable'];
							else
								var vPrefBinQtyAvail=objPrefBinDetails[l1]['quantityonhand'];
							var vPrefBinInvNum=objPrefBinDetails[l1]['inventorynumberText'];
							var vPrefBinInvNumID=objPrefBinDetails[l1]['inventorynumber'];
							vIsLotItem=objPrefBinDetails[l1]['islotitem'];
							var VZone = objPrefBinDetails[l1]['custrecord_wmsse_zoneText'];
							vUnitType=objPrefBinDetails[l1]['unitstype'];
							vStockUnit=objPrefBinDetails[l1]['stockunitText'];
							vPrefBinQtyAvailArr.push(vPrefBinQtyAvail);
							vPrefBinInvNumArr.push(vPrefBinInvNum);
							vPrefBinInvNumIDArr.push(vPrefBinInvNumID);
							VZoneArr.push(VZone);
						}	
					}
				}

				//Inventorystatus Feature is enabled
				if(inventoryStatusFeature ==false)
				{

					var lotExpiryDateSearchObj = search.load({id:'customsearch_wmsse_expdate_lots'});
					var lotExpiryDateSearchFilters = lotExpiryDateSearchObj.filters;
					var vLotExpDate = "";
					var vfiltersExp = [];
					if (_isValueValid(getItemInternalId)){
						lotExpiryDateSearchFilters.push(search.createFilter({
							name:'internalid',
							operator:search.Operator.ANYOF,
							values:getItemInternalId}));
					}
					if(_isValueValid(strLocation))
					{
						lotExpiryDateSearchFilters.push(search.createFilter({
							name:'location',
							join:'inventorynumber',
							operator:search.Operator.ANYOF,
							values:strLocation}));

					}
					if(vPrefBinInvNumIDArr != null && vPrefBinInvNumIDArr != '' && vPrefBinInvNumIDArr != 'null'
						&& vPrefBinInvNumIDArr !='undefined')
					{
						lotExpiryDateSearchFilters.push(search.createFilter({
							name:'internalid',
							join:'inventorynumber',
							operator:search.Operator.ANYOF,
							values:vPrefBinInvNumIDArr}));
					}


					if((systemRule_AllowExpiredItems == 'N') && (allowAllLots != 'T'))
					{
						var currDate = DateStamp();
						var dateFormat = DateSetting();
						var defalutExpiryDate  = setExpiryDate(dateFormat,'01','01','2199');
						lotExpiryDateSearchFilters.push(search.createFilter({
							name:'formuladate',
							operator:search.Operator.ONORAFTER, 
							formula:"NVL({inventorynumber.expirationdate},TO_DATE('"+defalutExpiryDate+"','"+dateFormat+"'))",
							values:currDate}));	

					}

					lotExpiryDateSearchObj.filters = lotExpiryDateSearchFilters;
					vsearchresultsExp = _getSearchResultInJSON(lotExpiryDateSearchObj);
				}

				if(vsearchresultsExp.length > 0)
				{ 
					for(var s1=0;s1<vsearchresultsExp.length;s1++)
					{
						if(inventoryStatusFeature)
						{
							if(vsearchresultsExp[s1]['inventorynumber'] != null && 
									vsearchresultsExp[s1]['inventorynumber'] != '')
							{

								vLotExpDate = vsearchresultsExp[s1]['expirationdate'];
								var vnPrefBinQtyAvail = vsearchresultsExp[s1]['available'];

								var vnPrefBinInvNum = vsearchresultsExp[s1]['inventorynumberText'];
								var VnZone = vsearchresultsExp[s1]['custrecord_wmsse_zoneText'];
								var vPrefBinStatus = vsearchresultsExp[s1]['statusText'];																										   
								var vPrefBinStatusID = vsearchresultsExp[s1]['status'];

								vnPrefBinQtyAvail = parseFloat(vnPrefBinQtyAvail) ;
								if(parseFloat(vnPrefBinQtyAvail) > 0)
								{
									if(_isValueValid(selectedConversionRate) && _isValueValid(currentConversionRate))
									{
										vnPrefBinQtyAvail = uomConversions(vnPrefBinQtyAvail,selectedConversionRate,currentConversionRate);
									}

									var currRow ={'binnumber':getPreferBin,'availableqty':vnPrefBinQtyAvail,'bininternalid':objPrefBinIdDetails[0]['internalid'],
											'lotnumber': vnPrefBinInvNum,'lotexpirydate':vLotExpDate,'zone':VnZone,'status':vPrefBinStatus};
									vBinLocArr.push(currRow);
								}

							}

						}
						else
						{
							if(vsearchresultsExp[s1]['inventorynumber'] != null && vsearchresultsExp[s1]['inventorynumber'] != '')
							{
								if(vPrefBinInvNumArr.indexOf(vsearchresultsExp[s1]['inventorynumber']) != -1)
								{
									vLotExpDate = vsearchresultsExp[s1]['expirationdate'];
									var vnPrefBinQtyAvail = vPrefBinQtyAvailArr[vPrefBinInvNumArr.indexOf(vsearchresultsExp[s1]['inventorynumber'])];
									var vnPrefBinInvNum = vPrefBinInvNumArr[vPrefBinInvNumArr.indexOf(vsearchresultsExp[s1]['inventorynumber'])];
									var VnZone = VZoneArr[vPrefBinInvNumArr.indexOf(vsearchresultsExp[s1]['inventorynumber'])];
									var vPrefBinStatus = vprefBinStatusArr[vPrefBinInvNumArr.indexOf(vsearchresultsExp[s1]['inventorynumber'])];																										   
									var vPrefBinStatusID = vprefBinStatusIDArr[vPrefBinInvNumArr.indexOf(vsearchresultsExp[s1]['inventorynumber'])];
									var vOpenPrefLotQty = 0;

									if(vPrefBinOpenTaskBinIdArr != null && vPrefBinOpenTaskBinIdArr !='')
									{
										for(var openTaskIterator=0;openTaskIterator<vPrefBinOpenTaskBinIdArr.length;openTaskIterator++)
										{
											var vOpenBinId = vPrefBinOpenTaskBinIdArr[openTaskIterator];
											if(objPrefBinIdDetails[0]['internalid'] == vOpenBinId)
											{
												var vOpenLot=vPrefBinOpenTaskDetails[3][openTaskIterator];
												var vOpenLotStatus=vPrefBinOpenTaskDetails[5][openTaskIterator];
												if(inventoryStatusFeature ==true)
												{
													if(vnPrefBinInvNum == vOpenLot && vPrefBinStatusID == vOpenLotStatus)
													{
														vOpenPrefLotQty=vPrefBinOpenTaskDetails[1][openTaskIterator];
														break;
													} 
												}
												else
												{
													if(vnPrefBinInvNum == vOpenLot)
													{
														vOpenPrefLotQty=vPrefBinOpenTaskDetails[1][openTaskIterator];
														break;
													} 
												}
											}
										}
									}
									if(vOpenPrefLotQty==null || vOpenPrefLotQty=='null' || vOpenPrefLotQty=='' || vOpenPrefLotQty =='undefined')
										vOpenPrefLotQty = 0;

									vnPrefBinQtyAvail = parseFloat(vnPrefBinQtyAvail) - parseFloat(vOpenPrefLotQty);
									if(parseFloat(vnPrefBinQtyAvail) > 0)
									{
										if(_isValueValid(selectedConversionRate) && _isValueValid(currentConversionRate))
										{
											vnPrefBinQtyAvail = uomConversions(vnPrefBinQtyAvail,selectedConversionRate,currentConversionRate);
										}

										var currRow ={'binnumber':getPreferBin,'availableqty':vnPrefBinQtyAvail,'bininternalid':objPrefBinIdDetails[0]['internalid'],
												'lotnumber':vnPrefBinInvNum,'lotexpirydate':vLotExpDate,'zone':VnZone,'status':vPrefBinStatus};
										vBinIntIdExcludeArr.push(objPrefBinIdDetails[0]['internalid']);
										vBinLocArr.push(currRow);
									}
								}
							}
						}
					}	
				}

			}	


		}


		var pickStratagiesObj = search.load({id:'customsearch_wmsse_get_pickstrategies'});
		var pickStratagiesFilters = pickStratagiesObj.filters;
		if(_isValueValid(getItemInternalId))
		{
			pickStratagiesFilters.push(search.createFilter({
				name:'custrecord_wmsse_pick_item',
				operator:search.Operator.ANYOF,
				values:['@NONE@',getItemInternalId]}));
		}
		if(_isValueValid(strItemGrp))
		{
			pickStratagiesFilters.push(search.createFilter({
				name:'custrecord_wmsse_pick_itemgroup',
				operator:search.Operator.ANYOF,
				values:['@NONE@',strItemGrp]}));
		}
		else
		{
			pickStratagiesFilters.push(search.createFilter({
				name:'custrecord_wmsse_pick_itemgroup',
				operator:search.Operator.ANYOF,
				values:['@NONE@']}));
		}
		if(_isValueValid(strItemFam))
		{
			pickStratagiesFilters.push(search.createFilter({
				name:'custrecord_wmsse_pick_itemfamily',
				operator:search.Operator.ANYOF,
				values:['@NONE@',strItemFam]}));
		}
		else
		{
			pickStratagiesFilters.push(search.createFilter({
				name:'custrecord_wmsse_pick_itemfamily',
				operator:search.Operator.ANYOF,
				values:['@NONE@']}));
		}
		if(_isValueValid(strLocation))
		{
			pickStratagiesFilters.push(search.createFilter({
				name:'custrecord_wmsse_pick_location',
				operator:search.Operator.ANYOF,
				values:['@NONE@',strLocation]}));
		}
		else
		{
			pickStratagiesFilters.push(search.createFilter({
				name:'custrecord_wmsse_pick_location',
				operator:search.Operator.ANYOF,
				values:['@NONE@']}));
		}
		pickStratagiesFilters.push(search.createFilter({
			name:'isinactive',
			operator:search.Operator.IS,
			values:false}));

		if(_isValueValid(strItemDept))
		{
			pickStratagiesFilters.push(search.createFilter({
				name:'custrecord_wmsse_pick_department',
				operator:search.Operator.ANYOF,
				values:['@NONE@',strItemDept]}));
		}
		else
		{
			pickStratagiesFilters.push(search.createFilter({
				name:'custrecord_wmsse_pick_department',
				operator:search.Operator.ANYOF,
				values:['@NONE@']}));
		}

		if(_isValueValid(strItemClass))
		{
			pickStratagiesFilters.push(search.createFilter({
				name:'custrecord_wmsse_pick_class',
				operator:search.Operator.ANYOF,
				values:['@NONE@',strItemClass]}));
		}
		else
		{
			pickStratagiesFilters.push(search.createFilter({
				name:'custrecord_wmsse_pick_class',
				operator:search.Operator.ANYOF,
				values:['@NONE@']}));
		}
		if(_isValueValid(strOrderType))
		{
			pickStratagiesFilters.push(search.createFilter({
				name:'custrecord_wmsse_pick_ordertype',
				operator:search.Operator.ANYOF,
				values:['@NONE@',strOrderType]}));

		}
		if(_isValueValid(strvUnits))
		{
			pickStratagiesFilters.push(search.createFilter({
				name:'custrecord_wmsse_pick_units',
				operator:search.Operator.ANYOF,
				values:['@NONE@',strvUnits]}));
		}
		if(inventoryStatusFeature==true && invstatusarray != undefined && invstatusarray != null && 
				invstatusarray != 'null' && invstatusarray != '')
		{
			pickStratagiesFilters.push(search.createFilter({
				name:'custrecord_wmsse_invstatus',
				operator:search.Operator.ANYOF,
				values:invstatusarray}));
		}
		pickStratagiesObj.filters = pickStratagiesFilters;

		var objPickstrategies = _getSearchResultInJSON(pickStratagiesObj);
		if(objPickstrategies.length > 0)
		{

			var bindedBinStatusArr =  [];
			for(var i=0;i<objPickstrategies.length;i++)
			{

				var strPickZone= objPickstrategies[i]['custrecord_wmsse_pick_zone'];
				var strInvStatus= objPickstrategies[i]['custrecord_wmsse_invstatusText'];
				if(strPickZone == null || strPickZone =='')
					strPickZone="-None-";
				var inclIBStageInvFlag = objPickstrategies[i]['custrecord_wmsse_pick_from_stageloc'];

				//This is to restrict the display of stage bins at inventroy to bin scan page
				if(boolinclIBStageInvFlag != null && boolinclIBStageInvFlag != '' &&
						boolinclIBStageInvFlag != 'null' && boolinclIBStageInvFlag != 'undefined' && boolinclIBStageInvFlag == false)
				{
					inclIBStageInvFlag   =false;
				}
				//ends


				if(strPickZone != null && strPickZone != '' && 
						(inventoryStatusFeature==true || vPickZoneArr.indexOf(strPickZone)== -1))
				{
					vPickZoneArr.push(strPickZone);
					var vBinIdArr=[];
					var vBinArr=[];
					var vNonStorageBinIdArr=[];
					if(strPickZone != null && strPickZone != '' && strPickZone != '-None-')
					{	
						var objBinByZoneDetails = '';
						if(inclIBStageInvFlag == false)
						{

							objBinByZoneDetails = fnGetBinsbyZones(strPickZone,strLocation);
						}
						else
						{


							objBinByZoneDetails = fnGetBinsbyZonesAlongWithStage(strPickZone,strLocation);

						}

						if(objBinByZoneDetails.length > 0)
						{
							for(var j=0;j<objBinByZoneDetails.length;j++)
							{ 
								vBinIdArr.push(objBinByZoneDetails[j]['internalid']);
								vBinArr.push(objBinByZoneDetails[j]['binnumber']);
								var strPickZoneText = objBinByZoneDetails[j]['custrecord_wmsse_zoneText'];
								vValidZoneArr.push(strPickZoneText);

							}
						}
					}
					else if(strPickZone == '-None-')
					{
						if(inclIBStageInvFlag)
						{
							var objBinByZoneDetails = fnGetBinsbyZonesAlongWithStage(strPickZone,strLocation);

							if(objBinByZoneDetails.length > 0)
							{
								for(var j=0;j<objBinByZoneDetails.length;j++)
								{ 
									vBinIdArr.push(objBinByZoneDetails[j]['internalid']);
									vBinArr.push(objBinByZoneDetails[j]['binnumber']);
									var strPickZoneText = objBinByZoneDetails[j]['custrecord_wmsse_zoneText'];
									vValidZoneArr.push(strPickZoneText);

								}
							}
						}
						else
						{


							var binSearchObj = search.load({id:'customsearch_wmsse_non_storagebins'});
							var binSearchFilters = binSearchObj.filters;
							if(_isValueValid(strLocation))
							{
								pickStratagiesFilters.push(search.createFilter({
									name:'location',
									operator:search.Operator.ANYOF,
									values:strLocation}));
							}
							pickStratagiesFilters.push(search.createFilter({
								name:'inactive',
								operator:search.Operator.IS,
								values:false}));	

							binSearchObj.filters = binSearchFilters;
							var objBinByZoneDetails = _getSearchResultInJSON(binSearchObj);
							if(objBinByZoneDetails.length > 0)
							{
								for(var j=0;j<objBinByZoneDetails.length;j++)
								{ 
									vNonStorageBinIdArr.push(objBinByZoneDetails[j].id);						 

								}
							}
						}
					}	

					if((vNonStorageBinIdArr.length == 0) && inclIBStageInvFlag == false )
					{


						var binSearchObj = search.load({id:'customsearch_wmsse_non_storagebins'});
						var binSearchFilters = binSearchObj.filters;
						if(_isValueValid(strLocation))
						{
							pickStratagiesFilters.push(search.createFilter({
								name:'location',
								operator:search.Operator.ANYOF,
								values:strLocation}));
						}
						pickStratagiesFilters.push(search.createFilter({
							name:'inactive',
							operator:search.Operator.IS,
							values:false}));	

						binSearchObj.filters = binSearchFilters;
						var objBinByZoneDetails = _getSearchResultInJSON(binSearchObj);

						if(objBinByZoneDetails.length > 0)
						{
							for(var j=0;j<objBinByZoneDetails.length;j++)
							{ 
								vNonStorageBinIdArr.push(objBinByZoneDetails[j].id);						 

							}
						}
					}



					var filterStrat = [];
					//Inventorystatus Feature is enabled
					if(inventoryStatusFeature)
					{
						var invstatusid = getStatusId(strInvStatus);
						var objBinDetails=[];
						var binSearchObj =  search.load({id:'customsearch_wmsse_inventorybalance',type:search.Type.INVENTORY_BALANCE});
						var binSearchFilters = binSearchObj.filters;
						if(_isValueValid(getItemInternalId)){
							binSearchFilters.push(search.createFilter({
								name:'internalid',
								join:'item',
								operator:search.Operator.ANYOF,
								values:getItemInternalId}));
						}
						if(_isValueValid(strLocation)){

							binSearchFilters.push(search.createFilter({
								name:'location',
								operator:search.Operator.ANYOF,
								values:strLocation}));
						}
						if(_isValueValid(vBinIdArr)){

							binSearchFilters.push(search.createFilter({
								name:'binnumber',
								operator:search.Operator.ANYOF,
								values:vBinIdArr}));
						}
						if(_isValueValid(vBinIntIdExcludeArr)){
							binSearchFilters.push(search.createFilter({
								name:'binnumber',
								operator:search.Operator.NONEOF,
								values:vBinIntIdExcludeArr}));
						}
						if(_isValueValid(vNonStorageBinIdArr)){

							binSearchFilters.push(search.createFilter({
								name:'binnumber',
								operator:search.Operator.NONEOF,
								values:vNonStorageBinIdArr}));
						}
						if(makeInvAvailFlagFromSelect != null && makeInvAvailFlagFromSelect != '' && makeInvAvailFlagFromSelect != 'null' &&
								makeInvAvailFlagFromSelect != 'undefined' && makeInvAvailFlagFromSelect != undefined)
						{
							if(makeInvAvailFlagFromSelect == 'T' || makeInvAvailFlagFromSelect == 'F')
							{
								binSearchFilters.push(search.createFilter({
									name:'inventoryavailable',
									join:'inventorystatus',
									operator:search.Operator.IS,
									values:makeInvAvailFlagFromSelect}));
								if(invstatusid!=null && invstatusid!='' && invstatusid!='undefined')
								{
									binSearchFilters.push(search.createFilter({
										name:'status',
										operator:search.Operator.ANYOF,
										values:invstatusid}));
								}
							}
							else
							{
								if(makeInvAvailFlagFromSelect != 'All')
								{
									binSearchFilters.push(search.createFilter({
										name:'status',
										operator:search.Operator.ANYOF,
										values:makeInvAvailFlagFromSelect}));
								}
								else
								{
									if(invstatusid!=null && invstatusid!='' && invstatusid!='undefined')
									{
										binSearchFilters.push(search.createFilter({
											name:'status',
											operator:search.Operator.ANYOF,
											values:invstatusid}));
									}

									else
									{
										if(strInvStatus=='All Available')
										{
											binSearchFilters.push(search.createFilter({
												name:'inventoryavailable',
												join:'inventorystatus',
												operator:search.Operator.IS,
												values:true}));
										}
										else if(strInvStatus=='Not Available')
										{
											binSearchFilters.push(search.createFilter({
												name:'inventoryavailable',
												join:'inventorystatus',
												operator:search.Operator.IS,
												values:false}));
										}
									}
								}


							}
						}
						var objBinDetails = _getSearchResultInJSON(binSearchObj);

						var vBinOpenTaskLotArr = [];
						var vBinOpenTaskExpDateArr =[];
						var vBinOpenTaskBinIdArr = [];
						var vBinOpenTaskBinQtyArr = [];
						var vBinOpenTaskStatusArr = [];
						if(objBinDetails.length >0)
						{

							vIsLotItem= 'T';//objBinDetails[0].getValue('islotitem','item','group');

							var vLotExpArr= [];
							var vLotArr= [];
							var vUnitType="";
							var vStockUnit="";
							if(vIsLotItem == 'T')
							{
								var vValidBinIdArr=[];
								var vValidBinTextArr=[];
								var vValidBinAvailQtyArr=[];
								var vValidBinInvNumArr=[];
								var vValidInvNumIDArr=[];
								var vValidBinStatusArr =  [];
								var vValidBinStatusIDArr =  [];
								var vstrLotNameCSV="";
								var strBinCSV="";
								for(var binItr=0;binItr<objBinDetails.length;binItr++)
								{
									var vValidBinId=objBinDetails[binItr]['binnumber'];
									if(_isValueValid(vValidBinId))
									{
										var vValidBin=objBinDetails[binItr]['binnumberText'];
										var vBinQtyAvail=objBinDetails[binItr]['available'];
										var vBinInvNum=objBinDetails[binItr]['inventorynumberText'];
										vValidInvNumIDArr.push(objBinDetails[binItr]['inventorynumber']);
										var vBinStatus=objBinDetails[binItr]['statusText'];
										var vBinStatusID=objBinDetails[binItr]['status'];
										vUnitType =itemUnitType;
										vStockUnit=itemStockUnit;

										var isLotBinStatusBinded = 'F';
										for(var binLotItr = 0;binLotItr < bindedBinStatusArr.length;binLotItr++)
										{
											var cRow = bindedBinStatusArr[binLotItr]; 
											var cBinId = cRow[0];
											var cStsId = cRow[1];
											var cLotId = cRow[2];
											if(cBinId == vValidBinId && cStsId == vBinStatusID && vBinInvNum == cLotId)
											{
												isLotBinStatusBinded = 'T';
												break;
											}
										}
										if(isLotBinStatusBinded == 'T')
										{
											continue;
										}

										vValidBinIdArr.push(vValidBinId);
										vValidBinTextArr.push(vValidBin);
										vValidBinAvailQtyArr.push(vBinQtyAvail);
										vValidBinInvNumArr.push(vBinInvNum);
										vValidBinStatusArr.push(vBinStatus);
										vValidBinStatusIDArr.push(objBinDetails[binItr]['status'])

										if(strBinCSV == "")
											strBinCSV=vValidBinId;
										else
											strBinCSV=strBinCSV + ',' + vValidBinId;
										if(vstrLotNameCSV == "")
											vstrLotNameCSV=vBinInvNum;
										else
											vstrLotNameCSV= vstrLotNameCSV + ',' + vBinInvNum;
									}

								}
								var itemSearchObj = search.load({id:'customsearch_wmsse_expdate_lots'});

								var filtersExp = itemSearchObj.filters;
								if (_isValueValid(getItemInternalId)){
									filtersExp.push(search.createFilter({
										name:'internalid',
										operator:search.Operator.ANYOF,
										values:getItemInternalId}));
								}
								if(_isValueValid(strLocation))
								{
									filtersExp.push(search.createFilter({
										name:'location',
										join:'inventorynumber',
										operator:search.Operator.ANYOF,
										values:strLocation}));
								}
								if(_isValueValid(vValidInvNumIDArr))
								{
									filtersExp.push(search.createFilter({
										name:'internalid',
										join:'inventorynumber',
										operator:search.Operator.ANYOF,
										values:vValidInvNumIDArr}));
								}
								if((systemRule_AllowExpiredItems == 'N') && (allowAllLots != 'T'))
								{
									var currDate = DateStamp();
									var dateFormat = DateSetting();
									var defalutExpiryDate  = setExpiryDate(dateFormat,'01','01','2199');
									filtersExp.push(search.createFilter({
										name:'formuladate',
										operator:search.Operator.ONORAFTER, 
										formula:"NVL({inventorynumber.expirationdate},TO_DATE('"+defalutExpiryDate+"','"+dateFormat+"'))",
										values:currDate}));	
								}
								itemSearchObj.filters = filtersExp;
								var searchresultsExp = _getSearchResultInJSON(itemSearchObj);
								var vTempInvBinArr=[];
								if(searchresultsExp.length > 0)
								{ 
									for(var searchItr=0;searchItr<searchresultsExp.length;searchItr++)
									{

										if(searchresultsExp[searchItr]['inventorynumber'] != null && searchresultsExp[searchItr]['inventorynumber'] != '')
										{
											if(vValidBinInvNumArr.indexOf(searchresultsExp[searchItr]['inventorynumber']) != -1)
											{	
												vLotArr.push(searchresultsExp[searchItr]['inventorynumber']);
												vLotExpArr.push(searchresultsExp[searchItr]['expirationdate']);
											}
										}	
									}	
								}

								var vMainBinArr=[];
								var objBinwithSeq=null;
								if(vValidBinIdArr.length > 0 && inclIBStageInvFlag == true)
								{

									var binSearchObj = search.load({id:'customsearch_wmsse_binsbypickzonenodir'});
									var binSearchFilters = binSearchObj.filters;
									binSearchFilters.push(search.createFilter({
										name:'internalid',
										operator:search.Operator.ANYOF,
										values:vValidBinIdArr}));
									if(_isValueValid(strLocation))
									{
										binSearchFilters.push(search.createFilter({
											name:'location',
											operator:search.Operator.ANYOF,
											values:strLocation}));
									}
									binSearchFilters.push(search.createFilter({
										name:'inactive',
										operator:search.Operator.IS,
										values:false}));
									binSearchFilters.push(search.createFilter({
										name:'custrecord_wmsse_bin_loc_type',
										operator:search.Operator.ANYOF,
										values:['@NONE@','1']}));

									binSearchObj.filters = binSearchFilters;
									objBinwithSeq = _getSearchResultInJSON(binSearchObj);

								}
								if(vValidBinIdArr.length > 0 && inclIBStageInvFlag == false)
								{


									var binSearchObj = search.load({id:'customsearch_wmsse_binsbypickzones'});
									var binSearchFilters = binSearchObj.filters;
									binSearchFilters.push(search.createFilter({
										name:'internalid',
										operator:search.Operator.ANYOF,
										values:vValidBinIdArr}));


									if(_isValueValid(strLocation))
									{
										binSearchFilters.push(search.createFilter({
											name:'location',
											operator:search.Operator.ANYOF,
											values:strLocation}));
									}

									binSearchFilters.push(search.createFilter({
										name:'inactive',
										operator:search.Operator.IS,
										values:false}));

									binSearchObj.filters = binSearchFilters;
									objBinwithSeq = _getSearchResultInJSON(binSearchObj);

								}

								for(var lotItr=0;lotItr<vLotArr.length;lotItr++)
								{
									var vZone ='';
									if(vLotArr[lotItr]!= null && vLotArr[lotItr]!= '')
									{	
										var vLotExp = vLotExpArr[lotItr];
										var vTempLotArrNew=vstrLotNameCSV.split(',');
										var vTempLotArr = [];
										for(var tempItr=0;tempItr<vTempLotArrNew.length;tempItr++)
										{
											var tLot= vTempLotArrNew[tempItr];
											if(tLot == vLotArr[lotItr])
											{
												vTempLotArr.push(tempItr);
											}
										}

										if(vTempLotArr.length>1)//Means lot occures in more than once
										{
											if(objBinwithSeq !=null && objBinwithSeq.length > 0)
											{

												for(var binseqItr=0;binseqItr<objBinwithSeq.length;binseqItr++)
												{
													var vValidBinId=objBinwithSeq[binseqItr]['internalid'];

													var vZone="";
													if(vBinIdArr.length > 0 && vBinIdArr.indexOf(vValidBinId)!= -1)
													{	
														vZone = vValidZoneArr[vBinIdArr.indexOf(vValidBinId)];
													}
													else
													{
														vZone = objBinwithSeq[binseqItr]['custrecord_wmsse_zoneText'];
													}

													if(vValidBinId!= null && vValidBinId!= '')
													{
														for(invItr=0;invItr<vValidBinIdArr.length;invItr++)
														{

															if(vValidBinIdArr[invItr] == vValidBinId && vValidBinInvNumArr[invItr] == vLotArr[lotItr])
															{

																var vValidBin = vValidBinTextArr[invItr];
																var vBinQtyAvail = vValidBinAvailQtyArr[invItr];
																var vBinQtyInvNum = vValidBinInvNumArr[invItr];
																var vValidBinStatus =  vValidBinStatusArr[invItr];	
																var vValidBinStatusId =  vValidBinStatusIDArr[invItr];	


																vBinQtyAvail = parseFloat(vBinQtyAvail);
																if(parseFloat(vBinQtyAvail) > 0)
																{
																	if(vValidBin != getPreferBin && vValidBinId != getPreferBinId)
																	{
																		if(_isValueValid(selectedConversionRate) && _isValueValid(currentConversionRate))
																		{
																			vBinQtyAvail = uomConversions(vBinQtyAvail,selectedConversionRate,currentConversionRate);
																		}
																		var currRow ={'binnumber':vValidBin,'availableqty':vBinQtyAvail,'bininternalid':vValidBinId,
																				'lotnumber':vBinQtyInvNum,'lotexpirydate':vLotExp,'zone':vZone,'status':vValidBinStatus};
																		var row = [vValidBinId,vValidBinStatusId,vBinQtyInvNum];
																		bindedBinStatusArr.push(row);
																		vBinLocArr.push(currRow);
																	}
																}

															}
														}
													}


												}
											}
										}
										else
										{
											var vValidBin = vValidBinTextArr[vValidBinInvNumArr.indexOf(vLotArr[lotItr])];
											var vValidBinId = vValidBinIdArr[vValidBinInvNumArr.indexOf(vLotArr[lotItr])];
											var vValidBinStatus=vValidBinStatusArr[vValidBinInvNumArr.indexOf(vLotArr[lotItr])];
											var vValidBinStatusID = vValidBinStatusIDArr[vValidBinInvNumArr.indexOf(vLotArr[lotItr])];
											var vZone="";
											if(vBinIdArr.indexOf(vValidBinId)!= -1)
											{	
												vZone = vValidZoneArr[vBinIdArr.indexOf(vValidBinId)];
											}
											else
											{
												for(var Itr=0;Itr<objBinwithSeq.length;Itr++)
												{
													var vTempBinId=objBinwithSeq[Itr]['internalid'];
													if(vTempBinId == vValidBinId)
													{
														vZone = objBinwithSeq[Itr]['custrecord_wmsse_zoneText'];
														break;
													}
												}
											}

											var vBinQtyAvail = vValidBinAvailQtyArr[vValidBinInvNumArr.indexOf(vLotArr[lotItr])];
											var vBinQtyInvNum = vValidBinInvNumArr[vValidBinInvNumArr.indexOf(vLotArr[lotItr])];

											var vOpenLotQty = 0;

											if(vBinOpenTaskDetails[0] != null && vBinOpenTaskDetails[0] !='')
											{
												for(var openTskItr=0;openTskItr<vBinOpenTaskDetails[0].length;openTskItr++)
												{
													var vOpenBinId = vBinOpenTaskDetails[0][openTskItr];
													var vOpenStatusID = vBinOpenTaskDetails[5][openTskItr];
													if(vValidBinId == vOpenBinId)
													{
														var vOpenLot=vBinOpenTaskDetails[3][openTskItr];
														if(vBinQtyInvNum == vOpenLot && vOpenStatusID == vValidBinStatusID)
														{
															vOpenLotQty=vBinOpenTaskDetails[1][openTskItr];
															break;
														} 
													}
												}
											}

											if(vOpenLotQty ==null || vOpenLotQty =='null' || vOpenLotQty =='' || vOpenLotQty =='undefined')
												vOpenLotQty = 0;

											vBinQtyAvail = parseFloat(vBinQtyAvail) - parseFloat(vOpenLotQty);
											if(parseFloat(vBinQtyAvail) > 0)
											{
												if(vValidBin != getPreferBin && vValidBinId != getPreferBinId)
												{
													if(_isValueValid(selectedConversionRate) && _isValueValid(currentConversionRate))
													{
														vBinQtyAvail = uomConversions(vBinQtyAvail,selectedConversionRate,currentConversionRate);
													}
													var currRow ={'binnumber':vValidBin,'availableqty':vBinQtyAvail,'bininternalid':vValidBinId,'lotnumber':vBinQtyInvNum,
															'lotexpirydate':vLotExp,'zone':vZone,'status':vValidBinStatus};
													var row = [vValidBinId,vValidBinStatusID,vBinQtyInvNum];
													bindedBinStatusArr.push(row);
												}
											}
										}

									}

								}

							}
							else
							{

								var vValidBinIdArr=[];
								var vValidBinTextArr=[];
								var vValidBinAvailQtyArr=[];
								var vValidBinInvNumArr=[];
								for(var binDetailsItr=0;binDetailsItr<objBinDetails.length;binDetailsItr++)
								{
									var vValidBinId=objBinDetails[binDetailsItr]['binnumber'];
									if(_isValueValid(vValidBinId))
									{
										var vValidBin=objBinDetails[binDetailsItr]['binnumberText'];
										if(vmakeInvAvailFlag)
											var vBinQtyAvail=objBinDetails[binDetailsItr]['quantityavailable'];
										else
											var vBinQtyAvail=objBinDetails[binDetailsItr]['quantityonhand'];
										var vBinInvNum=objBinDetails[binDetailsItr]['inventorynumberText'];
										vValidBinIdArr.push(vValidBinId);
										vValidBinTextArr.push(vValidBin);
										vValidBinAvailQtyArr.push(vBinQtyAvail);
										vValidBinInvNumArr.push(vBinInvNum);
									}

								}
								var objBinwithSeq=null;
								if(vValidBinIdArr.length > 0 && inclIBStageInvFlag == true)
								{
									var binSearchObj = search.load({id:'customsearch_wmsse_binsbypickzonenodir'});
									var binSearchFilters = binSearchObj.filters;
									binSearchFilters.push(search.createFilter({
										name:'internalid',
										operator:search.Operator.ANYOF,
										values:vValidBinIdArr}));

									if(_isValueValid(strLocation))
									{
										binSearchFilters.push(search.createFilter({
											name:'location',
											operator:search.Operator.ANYOF,
											values:strLocation}));
									}

									binSearchFilters.push(search.createFilter({
										name:'inactive',
										operator:search.Operator.IS,
										values:false}));
									binSearchFilters.push(search.createFilter({
										name:'custrecord_wmsse_bin_loc_type',
										operator:search.Operator.ANYOF,
										values:['@NONE@','1']}));

									binSearchObj.filters = binSearchFilters;
									objBinwithSeq = _getSearchResultInJSON(binSearchObj);


								}
								if(vValidBinIdArr.length > 0  && inclIBStageInvFlag == false)
								{
									var binSearchObj = search.load({id:'customsearch_wmsse_binsbypickzones'});
									var binSearchFilters = binSearchObj.filters;
									binSearchFilters.push(search.createFilter({
										name:'internalid',
										operator:search.Operator.ANYOF,
										values:vValidBinIdArr}));

									if(_isValueValid(strLocation))
									{
										binSearchFilters.push(search.createFilter({
											name:'location',
											operator:search.Operator.ANYOF,
											values:strLocation}));
									}

									binSearchFilters.push(search.createFilter({
										name:'inactive',
										operator:search.Operator.IS,
										values:false}));

									binSearchObj.filters = binSearchFilters;
									objBinwithSeq = _getSearchResultInJSON(binSearchObj);
								}



								if(objBinwithSeq.length > 0)
								{
									for(var binseqItr=0;binseqItr<objBinwithSeq.length;binseqItr++)
									{
										var vValidBinId=objBinwithSeq[binseqItr]['internalid'];
										var vZone=objBinwithSeq[binseqItr]['custrecord_wmsse_zoneText'];
										if(vValidBinId!= null && vValidBinId!= '')
										{
											if(vValidBinIdArr.indexOf(vValidBinId) != -1)
											{
												var vValidBin = vValidBinTextArr[vValidBinIdArr.indexOf(vValidBinId)];
												var vBinQtyAvail = vValidBinAvailQtyArr[vValidBinIdArr.indexOf(vValidBinId)];
												var vBinQtyInvNum = vValidBinInvNumArr[vValidBinIdArr.indexOf(vValidBinId)];


												vBinQtyAvail = parseFloat(vBinQtyAvail);
												if(parseFloat(vBinQtyAvail) > 0)
												{
													if(vValidBin != getPreferBin && vValidBinId != getPreferBinId)
													{
														if(_isValueValid(selectedConversionRate) && _isValueValid(currentConversionRate))
														{
															vBinQtyAvail = uomConversions(vBinQtyAvail,selectedConversionRate,currentConversionRate);
														}
														var currRow ={'binnumber':vValidBin,'availableqty':vBinQtyAvail,'bininternalid':vValidBinId,'lotnumber':vBinQtyInvNum,'lotexpirydate':'','zone':vZone};
														vBinIntIdExcludeArr.push(vValidBinId);
														vBinLocArr.push(currRow);
													}
												}
											}	
										}

									}
								}
							}	


						}	
						objBinDetails=null;

					}
					else
					{

						var itemSearchObj = search.load({id:'customsearch_wmsse_itemwise_lots'});
						var itemSearchFilters = itemSearchObj.filters;
						if(_isValueValid(getItemInternalId))
						{
							itemSearchFilters.push(search.createFilter({
								name:'internalid',
								operator:search.Operator.ANYOF,
								values:getItemInternalId}));
						}
						if(_isValueValid(strLocation))
						{
							itemSearchFilters.push(search.createFilter({
								name:'location',
								join:'inventoryNumberBinOnHand',
								operator:search.Operator.ANYOF,
								values:strLocation}));
						}
						if(_isValueValid(vBinIdArr))
						{
							itemSearchFilters.push(search.createFilter({
								name:'binnumber',
								join:'inventoryNumberBinOnHand',
								operator:search.Operator.ANYOF,
								values:vBinIdArr}));
						}
						if(_isValueValid(vBinIntIdExcludeArr))
						{
							itemSearchFilters.push(search.createFilter({
								name:'binnumber',
								join:'inventoryNumberBinOnHand',
								operator:search.Operator.NONEOF,
								values:vBinIntIdExcludeArr}));
						}
						if(_isValueValid(vNonStorageBinIdArr))
						{
							itemSearchFilters.push(search.createFilter({
								name:'binnumber',
								join:'inventoryNumberBinOnHand',
								operator:search.Operator.NONEOF,
								values:vNonStorageBinIdArr}));
						}

						itemSearchObj.filters = itemSearchFilters;
						var objBinDetails = _getSearchResultInJSON(itemSearchObj);
						var vBinOpenTaskLotArr = [];
						var vBinOpenTaskExpDateArr =[];
						var vBinOpenTaskBinIdArr = [];
						var vBinOpenTaskBinQtyArr = [];
						if(objBinDetails.length >0)
						{

							vIsLotItem=objBinDetails[0]['islotitem'];
							var vLotExpArr=[];
							var vLotArr=[];
							if(vIsLotItem == true)
							{
								var vValidBinIdArr=[];
								var vValidBinTextArr=[];
								var vValidBinAvailQtyArr=[];
								var vValidBinInvNumArr=[];
								var vValidInvNumIDArr=[];
								var vstrLotNameCSV="";
								var strBinCSV="";
								for(var j=0;j<objBinDetails.length;j++)
								{
									var vValidBinId=objBinDetails[j]['binnumber'];
									if(_isValueValid(vValidBinId))
									{
										var vValidBin=objBinDetails[j]['binnumberText'];
										if(vmakeInvAvailFlag)
											var vBinQtyAvail=objBinDetails[j]['quantityavailable'];
										else
											var vBinQtyAvail=objBinDetails[j]['quantityonhand'];
										var vBinInvNum=objBinDetails[j]['inventorynumberText'];
										vValidInvNumIDArr.push(objBinDetails[j]['inventorynumber']);
										vValidBinIdArr.push(vValidBinId);
										vValidBinTextArr.push(vValidBin);
										vValidBinAvailQtyArr.push(vBinQtyAvail);
										vValidBinInvNumArr.push(vBinInvNum);
										if(strBinCSV == "")
											strBinCSV=vValidBinId;
										else
											strBinCSV=strBinCSV + ',' + vValidBinId;
										if(vstrLotNameCSV == "")
											vstrLotNameCSV=vBinInvNum;
										else
											vstrLotNameCSV= vstrLotNameCSV + ',' + vBinInvNum;
									}

								}

								var itemSearchObj = search.load({id:'customsearch_wmsse_expdate_lots'});
								var itemSearchFilters = itemSearchObj.filters;
								if (getItemInternalId){
									itemSearchFilters.push(search.createFilter({
										name:'internalid',
										operator:search.Operator.ANYOF,
										values:getItemInternalId}));

								}
								if(_isValueValid(strLocation))
								{
									itemSearchFilters.push(search.createFilter({
										name:'location',
										join:'inventorynumber',
										operator:search.Operator.ANYOF,
										values:strLocation}));
								}
								if(vValidInvNumIDArr)
								{
									itemSearchFilters.push(search.createFilter({
										name:'internalid',
										join:'inventorynumber',
										operator:search.Operator.ANYOF,
										values:vValidInvNumIDArr}));
								}
								if(systemRule_AllowExpiredItems == 'N')
								{
									var currDate = DateStamp();
									var dateFormat = DateSetting();
									var defalutExpiryDate  = setExpiryDate(dateFormat,'01','01','2199');
									itemSearchFilters.push(search.createFilter({
										name:'formuladate',
										operator:search.Operator.ONORAFTER, 
										formula:"NVL({inventorynumber.expirationdate},TO_DATE('"+defalutExpiryDate+"','"+dateFormat+"'))",
										values:currDate}));
								}
								itemSearchObj.filters = itemSearchFilters;
								var searchresultsExp =  _getSearchResultInJSON(itemSearchObj);
								var vTempInvBinArr=[];
								if(searchresultsExp.length > 0)
								{ 
									for(var s=0;s<searchresultsExp.length;s++)
									{

										if(searchresultsExp[s]['inventorynumber'] != null && searchresultsExp[s]['inventorynumber'] != '')
										{
											if(vValidBinInvNumArr.indexOf(searchresultsExp[s]['inventorynumber']) != -1)
											{	
												vLotArr.push(searchresultsExp[s]['inventorynumber']);
												vLotExpArr.push(searchresultsExp[s]['expirationdate']);
											}
										}	
									}	
								}

								var vMainBinArr=[];
								var objBinwithSeq=null;
								if(vValidBinIdArr.length > 0 && inclIBStageInvFlag == true)
								{
									var binSearchObj = search.load({id:'customsearch_wmsse_binsbypickzonenodir'});
									var binSearchFilters = binSearchObj.filters;

									binSearchFilters.push(search.createFilter({
										name:'internalid',
										operator:search.Operator.ANYOF,
										values:vValidBinIdArr}));

									if(_isValueValid(strLocation))
									{
										binSearchFilters.push(search.createFilter({
											name:'location',
											operator:search.Operator.ANYOF,
											values:strLocation}));
									}

									binSearchFilters.push(search.createFilter({
										name:'inactive',
										operator:search.Operator.IS,
										values:false}));
									binSearchFilters.push(search.createFilter({
										name:'custrecord_wmsse_bin_loc_type',
										operator:search.Operator.ANYOF,
										values:['@NONE@','1']}));

									binSearchObj.filters = binSearchFilters;
									objBinwithSeq = _getSearchResultInJSON(binSearchObj);

								}
								if(vValidBinIdArr.length > 0  && inclIBStageInvFlag != true)
								{

									var binSearchObj = search.load({id:'customsearch_wmsse_binsbypickzones'});
									var binSearchFilters = binSearchObj.filters;

									binSearchFilters.push(search.createFilter({
										name:'internalid',
										operator:search.Operator.ANYOF,
										values:vValidBinIdArr}));

									if(_isValueValid(strLocation))
									{
										binSearchFilters.push(search.createFilter({
											name:'location',
											operator:search.Operator.ANYOF,
											values:strLocation}));
									}

									binSearchFilters.push(search.createFilter({
										name:'inactive',
										operator:search.Operator.IS,
										values:false}));

									binSearchObj.filters = binSearchFilters;
									objBinwithSeq = _getSearchResultInJSON(binSearchObj);

								}



								for(var u=0;u<vLotArr.length;u++)
								{
									var vZone ='';
									if(vLotArr[u]!= null && vLotArr[u]!= '')
									{	
										var vLotExp = vLotExpArr[u];
										var vTempLotArrNew=vstrLotNameCSV.split(',');
										var vTempLotArr = [];
										for(var l=0;l<vTempLotArrNew.length;l++)
										{
											var tLot= vTempLotArrNew[l];
											if(tLot == vLotArr[u])
											{
												vTempLotArr.push(l);
											}
										}
										if(vTempLotArr.length>1)//Means lot occures in more than once
										{
											if(objBinwithSeq.length > 0)
											{
												for(var l=0;l<objBinwithSeq.length;l++)
												{
													var vValidBinId=objBinwithSeq[l]['internalid'];
													var vZone="";
													if(vBinIdArr.length > 0 && vBinIdArr.indexOf(vValidBinId)!= -1)
													{	
														vZone = vValidZoneArr[vBinIdArr.indexOf(vValidBinId)];
													}
													else
													{
														vZone = objBinwithSeq[l]['custrecord_wmsse_zoneText'];
													}

													if(vValidBinId!= null && vValidBinId!= '')
													{
														for(l1=0;l1<vValidBinIdArr.length;l1++)
														{
															if(vValidBinIdArr[l1] == vValidBinId && vValidBinInvNumArr[l1] == vLotArr[u])
															{

																var vValidBin = vValidBinTextArr[l1];
																var vBinQtyAvail = vValidBinAvailQtyArr[l1];
																var vBinQtyInvNum = vValidBinInvNumArr[l1];


																vBinQtyAvail = parseFloat(vBinQtyAvail);
																if(parseFloat(vBinQtyAvail) > 0)
																{
																	if(vValidBin != getPreferBin && vValidBinId != getPreferBinId)
																	{
																		if(_isValueValid(selectedConversionRate) && _isValueValid(currentConversionRate))
																		{
																			vBinQtyAvail = uomConversions(vBinQtyAvail,selectedConversionRate,currentConversionRate);
																		}
																		var currRow ={'binnumber':vValidBin,'availableqty':vBinQtyAvail,'bininternalid':vValidBinId,'lotnumber':vBinQtyInvNum,'lotexpirydate':vLotExp,'zone':vZone};
																		vBinIntIdExcludeArr.push(vValidBinId);
																		vBinLocArr.push(currRow);
																	}
																}

															}
														}
													}
												}
											}
										}
										else
										{
											var vValidBin = vValidBinTextArr[vValidBinInvNumArr.indexOf(vLotArr[u])];
											var vValidBinId = vValidBinIdArr[vValidBinInvNumArr.indexOf(vLotArr[u])];
											var vZone="";
											if(vBinIdArr.indexOf(vValidBinId)!= -1)
											{	
												vZone = vValidZoneArr[vBinIdArr.indexOf(vValidBinId)];
											}
											else
											{
												for(var q=0;q<objBinwithSeq.length;q++)
												{
													var vTempBinId=objBinwithSeq[q]['internalid'];
													if(vTempBinId == vValidBinId)
													{
														vZone = objBinwithSeq[q]['custrecord_wmsse_zoneText'];
														break;
													}
												}
											}


											var vBinQtyAvail = vValidBinAvailQtyArr[vValidBinInvNumArr.indexOf(vLotArr[u])];
											var vBinQtyInvNum = vValidBinInvNumArr[vValidBinInvNumArr.indexOf(vLotArr[u])];
											var vOpenLotQty = 0;
											if(vBinOpenTaskDetails[0] != null && vBinOpenTaskDetails[0] !='')
											{
												for(var m1=0;m1<vBinOpenTaskDetails[0].length;m1++)
												{
													var vOpenBinId = vBinOpenTaskDetails[0][m1];
													if(vValidBinId == vOpenBinId)
													{
														var vOpenLot=vBinOpenTaskDetails[3][m1];
														if(vBinQtyInvNum == vOpenLot)
														{
															vOpenLotQty=vBinOpenTaskDetails[1][m1];
															break;
														} 
													}
												}
											}

											if(vOpenLotQty ==null || vOpenLotQty =='null' || vOpenLotQty =='' || vOpenLotQty =='undefined')
												vOpenLotQty = 0;

											vBinQtyAvail = parseFloat(vBinQtyAvail) - parseFloat(vOpenLotQty);
											if(parseFloat(vBinQtyAvail) > 0)
											{
												if(vValidBin != getPreferBin && vValidBinId != getPreferBinId)
												{
													if(_isValueValid(selectedConversionRate) && _isValueValid(currentConversionRate))
													{
														vBinQtyAvail = uomConversions(vBinQtyAvail,selectedConversionRate,currentConversionRate);
													}
													var currRow ={'binnumber':vValidBin,'availableqty':vBinQtyAvail,'bininternalid':vValidBinId,'lotnumber':vBinQtyInvNum,'lotexpirydate':vLotExp,'zone':vZone};
													vBinIntIdExcludeArr.push(vValidBinId);
													vBinLocArr.push(currRow);
												}
											}
										}
									}

								}
							}
							else
							{
								var vValidBinIdArr=[];
								var vValidBinTextArr=[];
								var vValidBinAvailQtyArr=[];
								var vValidBinInvNumArr=[];
								for(var j=0;j<objBinDetails.length;j++)
								{
									var vValidBinId=objBinDetails[j]['binnumber'];
									if(_isValueValid(vValidBinId))
									{
										var vValidBin=objBinDetails[j]['binnumberText'];
										if(vmakeInvAvailFlag)
											var vBinQtyAvail=objBinDetails[j]['quantityavailable'];
										else
											var vBinQtyAvail=objBinDetails[j]['quantityonhand'];
										var vBinInvNum=objBinDetails[j]['inventorynumberText'];
										vValidBinIdArr.push(vValidBinId);
										vValidBinTextArr.push(vValidBin);
										vValidBinAvailQtyArr.push(vBinQtyAvail);
										vValidBinInvNumArr.push(vBinInvNum);
									}

								}
								var objBinwithSeq=null;
								if(vValidBinIdArr != null && vValidBinIdArr != '' && inclIBStageInvFlag == 'T')
								{

									var binSearchObj = search.load({id:'customsearch_wmsse_binsbypickzonenodir'});
									var binSearchFilters = binSearchObj.filters;

									binSearchFilters.push(search.createFilter({
										name:'internalid',
										operator:search.Operator.ANYOF,
										values:vValidBinIdArr}));

									if(_isValueValid(strLocation))
									{
										binSearchFilters.push(search.createFilter({
											name:'location',
											operator:search.Operator.ANYOF,
											values:strLocation}));
									}
									binSearchFilters.push(search.createFilter({
										name:'inactive',
										operator:search.Operator.ANYOF,
										values:false}));

									binSearchFilters.push(search.createFilter({
										name:'custrecord_wmsse_bin_loc_type',
										operator:search.Operator.ANYOF,
										values:['@NONE@','1']}));

									binSearchObj.filters = binSearchFilters;
									objBinwithSeq = _getSearchResultInJSON(binSearchObj);
								}
								if(vValidBinIdArr.length > 0 && inclIBStageInvFlag != true)
								{

									var binSearchObj = search.load({id:'customsearch_wmsse_binsbypickzones'});
									var binSearchFilters = binSearchObj.filters;

									binSearchFilters.push(search.createFilter({
										name:'internalid',
										operator:search.Operator.ANYOF,
										values:vValidBinIdArr}));

									if(strLocation!= null && strLocation!= '')
									{
										binSearchFilters.push(search.createFilter({
											name:'location',
											operator:search.Operator.ANYOF,
											values:strLocation}));
									}
									binSearchFilters.push(search.createFilter({
										name:'inactive',
										operator:search.Operator.IS,
										values:false}));
									binSearchObj.filters = binSearchFilters;
									objBinwithSeq =  _getSearchResultInJSON(binSearchObj);
								}



								if(objBinwithSeq.length > 0)
								{
									for(var l=0;l<objBinwithSeq.length;l++)
									{
										var vValidBinId=objBinwithSeq[l]['internalid'];
										var vZone=objBinwithSeq[l]['custrecord_wmsse_zoneText'];
										if(vValidBinId!= null && vValidBinId!= '')
										{
											if(vValidBinIdArr.indexOf(vValidBinId) != -1)
											{
												var vValidBin = vValidBinTextArr[vValidBinIdArr.indexOf(vValidBinId)];
												var vBinQtyAvail = vValidBinAvailQtyArr[vValidBinIdArr.indexOf(vValidBinId)];
												var vBinQtyInvNum = vValidBinInvNumArr[vValidBinIdArr.indexOf(vValidBinId)];


												vBinQtyAvail = parseFloat(vBinQtyAvail);
												if(parseFloat(vBinQtyAvail) > 0)
												{
													if(vValidBin != getPreferBin)
													{
														if(_isValueValid(selectedConversionRate) && _isValueValid(currentConversionRate))
														{
															vBinQtyAvail = uomConversions(vBinQtyAvail,selectedConversionRate,currentConversionRate);
														}
														var currRow ={'binnumber':vValidBin,'availableqty':vBinQtyAvail,'bininternalid':vValidBinId,'lotnumber':vBinQtyInvNum,'lotexpirydate':'','zone':vZone};
														vBinIntIdExcludeArr.push(vValidBinId);
														vBinLocArr.push(currRow);
													} 
												}

											}	
										}
									}
								}
							}	

						}	
					}

				}
			}
		}
		return vBinLocArr;
	}
	/**
	 * To Get selected Inventory available status
	 */
	function getSelectedStatus(makeInvAvailFlagFromSelect)
	{
		var wmsInvstatusidArray = [];
		var getmakeflag;
		var makeinvflag;
		var getstatusname;

		var objStatusDetailsSearch = search.load({id: 'customsearch_wmsse_inventorystatusvalues'});
		var savedFilters = objStatusDetailsSearch.filters ;
		savedFilters.push(search.createFilter({
			name: 'internalid',
			operator: search.Operator.IS,
			values: makeInvAvailFlagFromSelect
		}));
		objStatusDetailsSearch.filters = savedFilters;
		var objStatusDetails = _getSearchResultInJSON(objStatusDetailsSearch);

		if(objStatusDetails.length > 0)
		{
			getmakeflag=getmakeflagresults[0]['inventoryavailable'];
			getstatusname=getmakeflagresults[0]['name'];
			if(getmakeflag==null || getmakeflag=='')
				makeinvflag='T';
			else
				makeinvflag=getmakeflag;
		}


		var statusDetailsSearch = search.load({id: 'customsearch_wmsse_inventorystatus_det'});
		var savedFilters = statusDetailsSearch.filters ;
		savedFilters.push(search.createFilter({
			name: 'custrecord_wmsse_makeinventoryflag',
			operator: search.Operator.IS,
			values: makeinvflag
		}));
		statusDetailsSearch.filters = savedFilters;
		var statusDetails = _getSearchResultInJSON(statusDetailsSearch);

		if(statusDetails.length > 0)
		{
			wmsInvstatusidArray.push('@NONE@');
			for(var statusid in  statusDetails)
			{
				var statusname=objwmsstatusdetails[statusid]['name'];
				if(getstatusname==statusname ||  statusname=='All Available' || statusname=='Not Available')
					wmsInvstatusidArray.push(statusDetails[statusid].id);


			}
		}

		return wmsInvstatusidArray;
	}
	/**
	 * To get storage Bin locations details based on Pick Zone sorted by Internal Id
	 */
	function fnGetBinsbyZones(strPickZone,strLocation)
	{
		var binSearchObj = search.load({id:'customsearch_wmsse_binssort_byinternalid'});
		var binSearchFilters = binSearchObj.filters;
		if(_isValueValid(strPickZone) && strPickZone != '-None-')
		{
			binSearchFilters.push(search.createFilter({
				name: 'custrecord_wmsse_zone',
				operator: search.Operator.ANYOF,
				values: strPickZone
			}));
		}

		if(_isValueValid(strLocation))
		{
			binSearchFilters.push(search.createFilter({
				name: 'location',
				operator: search.Operator.ANYOF,
				values: strLocation
			}));
		}
		binSearchFilters.push(search.createFilter({
			name: 'inactive',
			operator: search.Operator.IS,
			values: false
		}));
		binSearchObj.filters = binSearchFilters;
		var objBinByZoneDetails =  _getSearchResultInJSON(binSearchObj);

		return objBinByZoneDetails;
	}

	/**
	 * To get Storage and Stage Bin locations details based on Pick Zone sorted by Internal Id
	 */
	function fnGetBinsbyZonesAlongWithStage(strPickZone,strLocation)
	{
		var binSearchObj = search.load({id:'customsearch_wmsse_binsbypickzonewithstg'});
		var binSearchFilters = binSearchObj.filters;

		if(_isValueValid(strPickZone) && strPickZone != '-None-')
		{
			binSearchFilters.push(search.createFilter({
				name: 'custrecord_wmsse_zone',
				operator: search.Operator.ANYOF,
				values: strPickZone
			}));
		}

		if(_isValueValid(strLocation))
		{
			binSearchFilters.push(search.createFilter({
				name: 'location',
				operator: search.Operator.ANYOF,
				values: strLocation
			}));
		}

		binSearchFilters.push(search.createFilter({
			name: 'inactive',
			operator: search.Operator.IS,
			values: false
		}));
		binSearchObj.filters = binSearchFilters;
		var objBinByZoneDetails =  _getSearchResultInJSON(binSearchObj);
		return objBinByZoneDetails;
	}
	function getStatusId(strInvStatus)
	{

		var statusid='';
		var filterInvstatus = [];

		if(strInvStatus!= null && strInvStatus!= '')
		{
			var inventorySearchObj = search.load({id:'customsearch_wmsse_inventorystatusvalues'});
			var inventorySearchFilters = inventorySearchObj.filters;
			inventorySearchFilters.push(search.createFilter({
				name: 'name',
				operator: search.Operator.IS,
				values: strInvStatus
			}));
			inventorySearchObj.filters = inventorySearchFilters;
			var objstatusdetails = _getSearchResultInJSON(inventorySearchObj);
			if(objstatusdetails.length > 0)
			{
				statusid=objstatusdetails[0].id;
			}
		}

		return statusid;
	}

	function getInventoryStatusOptions()
	{
		var sOptionsArr = [];
		/*var cols = [];
		cols[0] = search.createColumn({name:'name'});
		cols[1] = search.createColumn({name:'internalId'});

		var objInventoryStatusSearch = search.create({type:'customlist_wmsse_status_optionslst',
			columns: cols});

		var inventoryResults = _getSearchResultInJSON(objInventoryStatusSearch);

		for ( var result in inventoryResults )
		{
			var res = inventoryResults[result];
			var listValue = res['name'];
			var listID = null;
			if(listValue == 'All')
			{
				listID = 'All';
			}
			else if(listValue == 'All Available')
			{
				listID = 'T'
			}
			else if(listValue == 'Not Available')
			{
				listID = 'F';
			}
			else
			{

			}
			var row1={'internalid':listID,'name':listValue};
			sOptionsArr.push(row1);
		} */
		var statusList = getInventoryStatusListForOutBound(null);
		if(statusList.length > 0)
		{
			for ( var statusItr in statusList)
			{
				var res = statusList[statusItr];
				var listValue = res['name'];
				var listID = res['id'];
				var row1={'internalid':listID,'name':listValue};
				sOptionsArr.push(row1);
			} 
		}

		return sOptionsArr;
	}
	function getInventoryStatusListForOutBound(invtStatus_ID)
	{

		var inventoryStatusFeature = isInvStatusFeatureEnabled();
		if(inventoryStatusFeature)
		{

			var inventoryStatusSearch = search.load({id:'customsearch_wmsse_getinvtstatuslst_ob'});
			var inventoryStatusFilters  = inventoryStatusSearch.filters;

			if(_isValueValid(invtStatus_ID))
			{
				inventoryStatusFilters.push(search.createFilter({
					name: 'internalid',
					operator: search.Operator.ANYOF,
					values: invtStatus_ID
				}));
			}
			inventoryStatusSearch.filters = inventoryStatusFilters;
			inventoryResultsArray  = _getSearchResultInJSON(inventoryStatusSearch);
		}

		return inventoryResultsArray;
	}

	function getItemDetails(itemInternalId)
	{
		var itemResults="";
		if(_isValueValid(itemInternalId))
		{

			var itemDetails = search.load({id:'customsearch_wmsse_inventory_itemdetails'});
			var itemSavedFilter  = itemDetails.filters;

			itemSavedFilter.push(search.createFilter({
				name: 'internalid',
				operator: search.Operator.ANYOF,
				values: itemInternalId
			}));

			itemDetails.filters = itemSavedFilter;
			itemResults  = _getSearchResultInJSON(itemDetails);
		}
		return itemResults;
	}

	function getopentaskresultsforIRPosting(poid,containerID,item_id,itemLineNo)
	{		
		var postItemReceiptSearchObj = search.load({id:'customsearch_wmsse_postitemreceipt_srch'});
		var postItemReceiptSearchFilters = postItemReceiptSearchObj.filters;

		if(_isValueValid(poid))
		{
			postItemReceiptSearchFilters.push(search.createFilter({
				name: 'custrecord_wmsse_order_no',
				operator: search.Operator.ANYOF,
				values: poid
			}));
		}

		if(_isValueValid(containerID))
		{
			postItemReceiptSearchFilters.push(search.createFilter({
				name: 'custrecord_wmsse_inboundcontainer',
				operator: search.Operator.ANYOF,
				values: containerID
			}));
		}
		if(_isValueValid(item_id))
		{
			postItemReceiptSearchFilters.push(search.createFilter({
				name: 'custrecord_wmsse_sku',
				operator: search.Operator.ANYOF,
				values: item_id
			}));
		}
		if(_isValueValid(itemLineNo))
		{
			postItemReceiptSearchFilters.push(search.createFilter({
				name: 'custrecord_wmsse_line_no',
				operator: search.Operator.EQUALTO,
				values: itemLineNo
			}));
		}
		postItemReceiptSearchFilters.push(search.createFilter({
			name: 'custrecord_wmsse_nsconfirm_ref_no',
			operator: search.Operator.ANYOF,
			values: ['@NONE@']
		}));
		postItemReceiptSearchObj.filters = postItemReceiptSearchFilters;
		var objPostItemReceiptDetails =  _getSearchResultInJSON(postItemReceiptSearchObj);

		if (objPostItemReceiptDetails.length > 0)
		{
			for (var objOPentask in objPostItemReceiptDetails) {

				var actQuantity=objPostItemReceiptDetails[objOPentask]['custrecord_wmsse_act_qty'];
				var linenum=objPostItemReceiptDetails[objOPentask]['custrecord_wmsse_line_no'];
				var	itemid=objPostItemReceiptDetails[objOPentask]['custrecord_wmsse_sku'];
				var	batchno=objPostItemReceiptDetails[objOPentask]['custrecord_wmsse_batch_num'];								
				var	expiryDate=objPostItemReceiptDetails[objOPentask]['custrecord_wmsse_expirydate'];
				var	enterBin=objPostItemReceiptDetails[objOPentask]['custrecord_wmsse_actendloc'];
				var	serial=objPostItemReceiptDetails[objOPentask]['custrecord_wmsse_serial_no'];
				var	wmsLocation=objPostItemReceiptDetails[objOPentask]['custrecord_wmsse_act_wms_location'];
				var	vInvStatus_select=objPostItemReceiptDetails[objOPentask]['custrecord_wmsse_inventorystatus'];

				var opentaskId = objPostItemReceiptDetails[objOPentask]['internalid'];
				var serailNum='';
				if(_isValueValid(serial))
				{
					var serialArray = [];
					serailArray = serial.split(',');
					if(serialArray.length > 1)
					{
						for(var s=0;s<serialArray.length;s++)
						{
							if (s==0)
							{
								serailNum = serialArray[s] ;
							}
							else
							{
								serailNum = serailNum +"^"+ serialArray[s] ;
							}
						}
					}
					else
					{
						serailNum = serial;
					}
				}
				var currRow = [linenum,itemid,actQuantity,enterBin,batchno,expiryDate,serailNum,opentaskId,wmsLocation,vInvStatus_select];
				objPostItemReceiptDetails.push(currRow);
			}

		}

		return objPostItemReceiptDetails;
	}
	function _getstatusDetailsForValidation(whLocation,getItemInternalId,eneteredBinId,enteredLot,fromStatusInternalId)
	{

		var balanceSearch=search.load({id:'customsearch_wms_get_invbalance_details',type:search.Type.INVENTORY_BALANCE});

		if(_isValueValid(whLocation))
		{
			balanceSearch.filters.push(search.createFilter({name:'location',
				operator:search.Operator.ANYOF,
				values:whLocation}));
		}

		if(_isValueValid(getItemInternalId))
		{
			balanceSearch.filters.push(search.createFilter({name:'internalid'
				,join:'item',
				operator:search.Operator.ANYOF,
				values:getItemInternalId}));
		}

		if(_isValueValid(eneteredBinId))
		{
			balanceSearch.filters.push(search.createFilter({name:'binnumber',
				operator:search.Operator.ANYOF,
				values:eneteredBinId}));
		}

		if(_isValueValid(enteredLot))
		{
			balanceSearch.filters.push(search.createFilter({name:'inventorynumber',
				operator:search.Operator.ANYOF,
				values:enteredLot}));
		}

		if (_isValueValid(fromStatusInternalId)) {
			balanceSearch.filters.push(search.createFilter({ name :'status',
				operator: search.Operator.ANYOF,
				values: fromStatusInternalId
			}));

		}

		var StatusDetails = _getSearchResultInJSON(balanceSearch);

		return StatusDetails;

	}
	function getstatusDetails(whLocation,getItemInternalId,eneteredBinId,enteredLot,fromStatusInternalId)
	{

		var balanceSearch=search.load({id:'customsearch_wmsse_srchres_statuswise',type:search.Type.INVENTORY_BALANCE});

		if(_isValueValid(whLocation))
		{
			balanceSearch.filters.push(search.createFilter({name:'location',
				operator:search.Operator.ANYOF,
				values:whLocation}));
		}

		if(_isValueValid(getItemInternalId))
		{
			balanceSearch.filters.push(search.createFilter({name:'internalid'
				,join:'item',
				operator:search.Operator.ANYOF,
				values:getItemInternalId}));
		}

		if(_isValueValid(eneteredBinId))
		{
			balanceSearch.filters.push(search.createFilter({name:'binnumber',
				operator:search.Operator.ANYOF,
				values:eneteredBinId}));
		}

		if(_isValueValid(enteredLot))
		{
			balanceSearch.filters.push(search.createFilter({name:'inventorynumber',
				operator:search.Operator.ANYOF,
				values:enteredLot}));
		}

		if (_isValueValid(fromStatusInternalId)) {
			balanceSearch.filters.push(search.createFilter({ name :'status',
				operator: search.Operator.ANYOF,
				values: fromStatusInternalId
			}));

		}

		var StatusDetails = _getSearchResultInJSON(balanceSearch);

		return StatusDetails;

	}

	function getserialDetails(whLocation,getItemInternalId,eneteredBinId)
	{
		var balanceSearch=search.load({id:'customsearch_wmsse_seialdetails_putaway',type:search.Type.INVENTORY_BALANCE});

		if(_isValueValid(whLocation))
		{
			balanceSearch.filters.push(search.createFilter({name:'location',
				operator:search.Operator.ANYOF,
				values:whLocation}));
		}

		if(_isValueValid(getItemInternalId))
		{
			balanceSearch.filters.push(search.createFilter({name:'internalid'
				,join:'item',
				operator:search.Operator.ANYOF,
				values:getItemInternalId}));
		}

		if(_isValueValid(eneteredBinId))
		{
			balanceSearch.filters.push(search.createFilter({name:'binnumber',
				operator:search.Operator.ANYOF,
				values:eneteredBinId}));
		}


		var serialDetails = _getSearchResultInJSON(balanceSearch);

		return serialDetails;

	}


	function fnGetInventoryforserial(strLocation,ItemInternalId,binnumber) {
		var searchObj = search.load({id: 'customsearch_wmsse_itemwise_lots'});

		if (_isValueValid(strLocation)) {
			searchObj.filters.push(search.createFilter({ name :'location',
				join :'inventoryNumberBinOnHand',
				operator: search.Operator.ANYOF,
				values:  strLocation}));
		}

		if (_isValueValid(ItemInternalId)) {
			searchObj.filters.push(search.createFilter({ name :'internalid',
				join :'item',
				operator: search.Operator.ANYOF,
				values:  ItemInternalId}));
		}

		if (_isValueValid(binnumber)) {
			searchObj.filters.push(search.createFilter({ name :'binnumber',
				join :'inventoryNumberBinOnHand',
				operator: search.Operator.ANYOF,
				values:  binnumber}));
		}
		var alltaskresults = _getSearchResultInJSON(searchObj);


		return alltaskresults;
	}


	function isIntercompanyCrossSubsidiaryFeatureEnabled() {
		var vResult = false;
		try {
			var crossSubsidiaryFeature = runtime.isFeatureInEffect({
				feature: 'crosssubsidiaryfulfillment' 
			});

			if (crossSubsidiaryFeature != null && crossSubsidiaryFeature != '' && crossSubsidiaryFeature != 'null' &&
					crossSubsidiaryFeature != 'undefined' && crossSubsidiaryFeature != false) {

				vResult = true;
			}
		}
		catch (e) {

			log.error({
				title: 'exception in isIntercompanyCrossSubsidiaryFeatureEnabled',
				details: e
			});
			vResult = false;
		}
		return vResult;
	}

	function _getTOfulfilledLotDetails(orderInternalId,getItemInternalId,orderLineNo)
	{
		if(_isValueValid(orderInternalId)) {
			var toLotDetails = search.load({
				id: 'customsearch_wmsse_transf_ful_lot_detail'
			});
			var filtersArr = toLotDetails.filters;
			filtersArr.push(
					search.createFilter({
						name: 'internalid',
						operator: search.Operator.ANYOF,
						values: orderInternalId
					}));
			filtersArr.push(
					search.createFilter({
						name: 'item',
						operator: search.Operator.ANYOF,
						values:getItemInternalId
					}));
			if(_isValueValid(orderInternalId))
			{
				filtersArr.push(
						search.createFilter({
							name: 'line',
							operator: search.Operator.EQUALTO,
							values:orderLineNo
						}));
			}

			toLotDetails.filters = filtersArr;
			var transferOrderLotDetails = _getSearchResultInJSON(toLotDetails);
			return transferOrderLotDetails;
		}
		else
		{
			return null;
		}

	}	

	function getSubsidiaryforLocation(locationId)
	{
		if(locationId != null && locationId !='')
		{	
			var locationSubsidiary='';

			var locationResults = record.load({
				type : 'location',
				id : locationId
			});
			if(locationResults != null && locationResults !='')
				locationSubsidiary =locationResults.getValue({fieldId:'subsidiary'});					
			if(locationSubsidiary != null && locationSubsidiary != '')
				return locationSubsidiary;
			else 
				return null;
		}
		else
			return null;

	}

	function _getInboundStageBinDetails(locationId)
	{
		var inboundStageBinResults = "";

		if(_isValueValid(locationId)) {

			var stageBinDetails = search.load({id:'customsearch_stage_bindetails'});

			var stageBinFilters  = stageBinDetails.filters;

			stageBinFilters.push(search.createFilter({
				name: 'location',
				operator: search.Operator.ANYOF,
				values: locationId
			}));
			stageBinFilters.push(search.createFilter({
				name: 'custrecord_wmsse_bin_stg_direction',
				operator: search.Operator.ANYOF,
				values: '1'
			}));

			stageBinDetails.filters = stageBinFilters;
			inboundStageBinResults  = _getSearchResultInJSON(stageBinDetails);
			log.debug({title:'inboundStageBinResults',details:inboundStageBinResults});


		}
		return inboundStageBinResults;
	}

	function _getInventoryDetailsFromBins(stageBins,locationId)
	{

		var binsInventoryDetails = search.load({id:'customsearch_wmsse_binlocwise_inventory'});
		var binFiltersArr  = binsInventoryDetails.filters;
		if(_isValueValid(stageBins)) {
			binFiltersArr.push(search.createFilter({
				name: 'binnumber',
				join: 'binOnHand',				
				operator: search.Operator.ANYOF,
				values: stageBins
			}));
		}
		if(_isValueValid(locationId)) {
			binFiltersArr.push(search.createFilter({
				name: 'location',
				join: 'binOnHand',				
				operator: search.Operator.ANYOF,
				values: locationId
			}));
		}

		binsInventoryDetails.filters = binFiltersArr;
		var	inventoryDetailsFromBins  = _getSearchResultInJSON(binsInventoryDetails);
		return inventoryDetailsFromBins;
	}

	function _getInventoryDetailsforItem(stageBins,locationId,itemInternalId)
	{

		var binsInventoryDetails = search.load({id:'customsearch_wmsse_binwise_invt_item'});
		var binFiltersArr  = binsInventoryDetails.filters;
		if(_isValueValid(stageBins)) {
			binFiltersArr.push(search.createFilter({
				name: 'binnumber',
				join: 'binOnHand',				
				operator: search.Operator.ANYOF,
				values: stageBins
			}));
		}
		if(_isValueValid(itemInternalId)) {
			binFiltersArr.push(search.createFilter({
				name: 'internalid',
				operator: search.Operator.ANYOF,
				values: itemInternalId
			}));
		}
		if(_isValueValid(locationId)) {
			binFiltersArr.push(search.createFilter({
				name: 'location',
				join: 'binOnHand',				
				operator: search.Operator.ANYOF,
				values: locationId
			}));
		}

		binsInventoryDetails.filters = binFiltersArr;
		var	inventoryDetailsFromBins  = _getSearchResultInJSON(binsInventoryDetails);
		return inventoryDetailsFromBins;
	}

	function _getItemWiseStatusDetailsInBin(binInternalId,whLocationId,itemInternalId) {

		var searchObj = search.load({ id : 'customsearch_wmsse_srchres_statuswise',type:search.Type.INVENTORY_BALANCE});

		if (_isValueValid(itemInternalId)) {
			searchObj.filters.push(search.createFilter({ name :'item',
				operator: search.Operator.ANYOF,
				values: itemInternalId
			}));
		}
		if (_isValueValid(whLocationId)) {
			searchObj.filters.push(search.createFilter({ name :'location',
				operator: search.Operator.ANYOF,
				values: whLocationId
			}));
		}
		if (_isValueValid(binInternalId)) {
			searchObj.filters.push(search.createFilter({ name :'binnumber',
				operator: search.Operator.ANYOF,
				values: binInternalId
			}));
		}
		var inventoryDetailsResults = _getSearchResultInJSON(searchObj);
		return inventoryDetailsResults;
	}

	function _getItemWiseDetails(binInternalId,whLocationId,itemInternalId,lotInternalId) {

		var searchObj = search.load({ id : 'customsearch_wmsse_itemwise_inventory',type:search.Type.ITEM});

		if (_isValueValid(itemInternalId)) {
			searchObj.filters.push(search.createFilter({ name :'internalid',				
				operator: search.Operator.ANYOF,
				values: itemInternalId
			}));
		}

		if (_isValueValid(whLocationId)) {
			searchObj.filters.push(search.createFilter({ name :'location',
				join: 'binOnHand',
				operator: search.Operator.ANYOF,
				values: whLocationId
			}));
		}
		if (_isValueValid(binInternalId)) {
			searchObj.filters.push(search.createFilter({ name :'binnumber',
				join: 'binOnHand',
				operator: search.Operator.ANYOF,
				values: binInternalId
			}));
		}
		var inventoryDetailsResults = _getSearchResultInJSON(searchObj);
		return inventoryDetailsResults;
	}

	function _getOpenPutawayTasksforIRPosting(transactionInternalId,warehouseLocationId)
	{		
		var openPutwTasksDetails = search.load({id:'customsearch_wmsse_openputaways_details'});
		var openTaskSearchFilters = openPutwTasksDetails.filters;

		if(_isValueValid(transactionInternalId))
		{
			openTaskSearchFilters.push(search.createFilter({
				name: 'custrecord_wmsse_order_no',
				operator: search.Operator.ANYOF,
				values: transactionInternalId
			}));
		}	
		if(_isValueValid(warehouseLocationId))
		{
			openTaskSearchFilters.push(search.createFilter({
				name: 'custrecord_wmsse_wms_location',
				operator: search.Operator.ANYOF,
				values: warehouseLocationId
			}));
		}

		openPutwTasksDetails.filters = openTaskSearchFilters;
		var objOpenPutwTaskDetails =  _getSearchResultInJSON(openPutwTasksDetails);
		return objOpenPutwTaskDetails;
	}
	function consolidatePostItemReceipt(trecord,actQuantity,linenum,itemId,transactionType,batchNo,expiryDate,
			whLocationId,enterBin,serialArray,opentaskSearchResults,transactionInternalId,itrValue)
	{
		try
		{
			var compSubRecord=null;
			var commitflag = 'N';
			var isSerialItem ='';
			var isLotItem = '';
			var isInventoryItem = '';
			var itemLineNo = '';
			var item_id = '';
			var itemrec = '';
			var itemType ='';
			var polinelength = trecord.getLineCount({sublistId:'item'});
			if(itrValue == 0)
			{
				for (var irItr = 0; irItr < polinelength; irItr++) 
				{
					trecord.setSublistValue({
						sublistId: 'item',
						fieldId: 'itemreceive',
						line:irItr,
						value: false
					});
				}
			}

			for (var irItr = 0; irItr < polinelength; irItr++) 
			{
				itemLineNo = trecord.getSublistValue({sublistId:'item',fieldId: 'line',line: irItr});
				item_id = trecord.getSublistValue({sublistId:'item',fieldId: 'item',line: irItr});
				itemrec = trecord.getSublistValue({sublistId:'item',fieldId: 'itemreceive',line: irItr});
				quantity = actQuantity;

				if(transactionType == 'transferorder')
				{
					itemLineNo = parseInt(itemLineNo) - parseInt(2);
				}
				if (itemLineNo == linenum)
				{
					isSerialItem = trecord.getSublistValue({sublistId:'item',fieldId: 'isserial',line: irItr});
					isLotItem = trecord.getSublistValue({sublistId:'item',fieldId: 'isnumbered',line: irItr});
					isInventoryItem = trecord.getSublistValue({sublistId:'item',fieldId: 'invttype',line: irItr});
					if(isSerialItem == 'T')
					{
						itemType  = 'serializedinventoryitem' ;
					}
					else if(isLotItem == 'T')
					{
						itemType  = 'lotnumberedinventoryitem' ; 
					}
					else if(isInventoryItem == 'T')
					{
						itemType  = 'inventoryitem' ;  
					}
					else
					{

					}

					var totallineQty=0;
					for(var otItr=0;otItr<opentaskSearchResults.length;otItr++)
					{

						var opentaskLinenum=opentaskSearchResults[otItr]['custrecord_wmsse_line_no'];
						if(opentaskLinenum == linenum)
						{
							var actlineQuantity=opentaskSearchResults[otItr]['custrecord_wmsse_act_qty'];

							totallineQty = Big(totallineQty).plus(actlineQuantity); 

						}
					}

					var whLocation = trecord.getSublistValue({sublistId:'item',fieldId: 'location',line: irItr});
					if(whLocation==null||whLocation=="")
						whLocation=whLocationId;
					commitflag = 'Y';

					trecord.setSublistValue({
						sublistId: 'item',
						line:irItr,
						fieldId: 'itemreceive',
						value: true
					});
					trecord.setSublistValue({
						sublistId: 'item',
						fieldId: 'quantity',
						line:irItr,
						value: Number(Big(totallineQty).toFixed(5))
					});
					trecord.setSublistValue({
						sublistId: 'item',
						fieldId: 'location',
						line:irItr,
						value: whLocation
					});

					if (itemType == "serializedinventoryitem" || itemType == "serializedassemblyitem" || itemType == "lotnumberedinventoryitem" ||
							itemType=="lotnumberedassemblyitem" || itemType == "inventoryitem" || itemType == "assemblyitem") 
					{

						var compSubRecord = trecord.getSublistSubrecord({sublistId:'item',fieldId:'inventorydetail',line:irItr});
						var complinelength = compSubRecord.getLineCount({sublistId:'inventoryassignment'});

						if(parseInt(complinelength)>0)
						{

							for(var invassItr=0;invassItr<complinelength;invassItr++)
							{ 
								compSubRecord.removeLine({sublistId:'inventoryassignment',line:0});
							}
						}
						complinelength = compSubRecord.getLineCount({sublistId:'inventoryassignment'});
						if (itemType == "lotnumberedinventoryitem" || itemType== "lotnumberedassemblyitem") {

							for(var r2=0;r2<opentaskSearchResults.length;r2++)
							{
								var opentaskLinenumber=opentaskSearchResults[r2]['custrecord_wmsse_line_no'];
								var vInvStatus_select=opentaskSearchResults[r2]['custrecord_wmsse_inventorystatus'];
								var openTaskBatchno=opentaskSearchResults[r2]['custrecord_wmsse_batch_num'];
								var opentaskQuantity=opentaskSearchResults[r2]['custrecord_wmsse_act_qty'];
								var opentaskbin=opentaskSearchResults[r2]['custrecord_wmsse_actendloc'];

								if(opentaskLinenumber == linenum)
								{

									compSubRecord.insertLine({
										sublistId: 'inventoryassignment',
										line:complinelength
									});

									compSubRecord.setSublistValue({sublistId:'inventoryassignment',fieldId: 'quantity',line:complinelength,value: Number(Big(opentaskQuantity).toFixed(5))});
									compSubRecord.setSublistValue({sublistId:'inventoryassignment',fieldId: 'receiptinventorynumber',line:complinelength,value:openTaskBatchno});
									if(opentaskbin!=null && opentaskbin!="" && opentaskbin!='null')
										compSubRecord.setSublistValue({sublistId:'inventoryassignment',fieldId: 'binnumber',line:complinelength,value:opentaskbin});
									if(expiryDate!=null && expiryDate!="" && expiryDate!='null')
									{
										var parsedExpiryDate = format.parse({
											value: expiryDate,
											type: format.Type.DATE
										});
										compSubRecord.setSublistValue({sublistId:'inventoryassignment',fieldId: 'expirationdate',line:complinelength,value:parsedExpiryDate});
									}
									if(vInvStatus_select!=null && vInvStatus_select!="" && vInvStatus_select!='null'  && vInvStatus_select!='undefined')
										compSubRecord.setSublistValue({sublistId:'inventoryassignment', fieldId:'inventorystatus',line:complinelength,value:vInvStatus_select});
									complinelength++;
								}
							}
						}
						else if (itemType == "inventoryitem" || itemType == "assemblyitem") {
							for(var r1=0;r1<opentaskSearchResults.length;r1++)
							{
								var opentaskLinenumber=opentaskSearchResults[r1]['custrecord_wmsse_line_no'];
								var vInvStatus_select=opentaskSearchResults[r1]['custrecord_wmsse_inventorystatus'];
								var opentaskQuantity=opentaskSearchResults[r1]['custrecord_wmsse_act_qty'];
								var opentaskbin=opentaskSearchResults[r1]['custrecord_wmsse_actendloc'];

								if(opentaskLinenumber == linenum)
								{
									compSubRecord.insertLine({
										sublistId: 'inventoryassignment',
										line:complinelength
									});

									compSubRecord.setSublistValue({sublistId:'inventoryassignment',fieldId: 'quantity',line:complinelength,value: Number(Big(opentaskQuantity).toFixed(5))});
									if(opentaskbin!=null && opentaskbin!="" && opentaskbin!='null')
										compSubRecord.setSublistValue({sublistId:'inventoryassignment',fieldId: 'binnumber',line:complinelength,value: opentaskbin});
									if(vInvStatus_select!=null && vInvStatus_select!="" && vInvStatus_select!='null'  && vInvStatus_select!='undefined')
										compSubRecord.setSublistValue({sublistId:'inventoryassignment',fieldId: 'inventorystatus',line:complinelength,value: vInvStatus_select});
									complinelength++;

								}
							}
						}
						else if (itemType == "serializedinventoryitem" || itemType== "serializedassemblyitem") {
							for(var r3=0;r3<opentaskSearchResults.length;r3++)
							{

								var opentaskLinenumber=opentaskSearchResults[r3]['custrecord_wmsse_line_no'];											

								if(opentaskLinenumber == linenum)
								{

									var opentaskQuantity=opentaskSearchResults[r3]['custrecord_wmsse_act_qty'];
									var	opentaskserialArray=opentaskSearchResults[r3]['custrecord_wmsse_serial_no'];
									var	vInvStatus_select=opentaskSearchResults[r3]['custrecord_wmsse_inventorystatus'];
									var opentaskbin=opentaskSearchResults[r3]['custrecord_wmsse_actendloc'];
									var totalSerialArray=opentaskserialArray.split(',');

									for (var k1 = 0; k1 < totalSerialArray.length; k1++)
									{
										complinelength=k1;
										compSubRecord.insertLine({
											sublistId: 'inventoryassignment',
											line:complinelength
										});

										compSubRecord.setSublistValue({sublistId:'inventoryassignment',fieldId: 'quantity',line:complinelength,value: 1});
										compSubRecord.setSublistValue({sublistId:'inventoryassignment',fieldId: 'receiptinventorynumber',line:complinelength,value:totalSerialArray[k1]});
										if(opentaskbin!=null && opentaskbin!="" && opentaskbin!='null')
										{
											compSubRecord.setSublistValue({sublistId:'inventoryassignment',fieldId: 'binnumber',line:complinelength,value: opentaskbin});
										}
										if(vInvStatus_select!=null && vInvStatus_select!="" && vInvStatus_select!='null' && vInvStatus_select!='undefined')
										{
											compSubRecord.setSublistValue({sublistId:'inventoryassignment', fieldId:'inventorystatus',line:complinelength, value:vInvStatus_select});
										}

										complinelength++;
									}
									var serialSearch = search.load({
										id: 'customsearch_wmsse_serialentry_details',
									});
									var serailFilters = serialSearch.filters;

									serailFilters.push(search.createFilter({name:'custrecord_wmsse_ser_ordline',
										operator: search.Operator.EQUALTO,
										values:linenum }));
									serailFilters.push(search.createFilter({name:'custrecord_wmsse_ser_ordno',
										operator: search.Operator.ANYOF,
										values:transactionInternalId }));
									serailFilters.push(search.createFilter({name:'custrecord_wmsse_ser_status',
										operator: search.Operator.EQUALTO,
										values:'F' }));

									serialSearch.filters = serailFilters;
									var serialSearchResults =_getSearchResultInJSON(serialSearch);
									if(serialSearchResults.length > 0)
									{		
										for (var j3 = 0; j3 < serialSearchResults.length; j3++) {

											var vid=serialSearchResults[j3]['id'];
											var id = record.submitFields({
												type: 'customrecord_wmsse_serialentry',
												id: vid,
												values: {
													'custrecord_wmsse_ser_note1': 'because of serial number is updated in opentask we have marked this serial number as closed',
													'custrecord_wmsse_ser_status': 'T'
												}
											});

										}
									}
								}
							}
						}

					}
					break;
				}
				/*else{
					//log.debug({title:'irItr else',details:irItr});
					trecord.setSublistValue({
						sublistId: 'item',
						fieldId: 'itemreceive',
						line:irItr,
						value: false
					});
				}*/
			}
		}
		catch(e)
		{
			log.error({title:'e',details:e});
		}

	}


	function consolidatePostItemReceiptforTO(transactionInternalId,warehouseLocationId,opentaskSearchResults)
	{

		try
		{
			var idl = '';
			var trecord = '';
			var vitemfulfillmentid = '';
			var trecord = '';
			var toLineDetailsSearch = search.load({id:'customsearch_wmsse_transf_fulfill_detail'});
			var toLineDetailsFilters = toLineDetailsSearch.filters;
			var itemindex=1;
			if(_isValueValid(transactionInternalId))
			{
				toLineDetailsFilters.push(search.createFilter({
					name:'internalid',
					operator: search.Operator.ANYOF,
					values:transactionInternalId}));
			}

			toLineDetailsFilters.push(search.createFilter({
				name:'type',
				operator: search.Operator.ANYOF,
				values : 'TrnfrOrd'}));


			toLineDetailsFilters.push(search.createFilter({
				name: 'formulatext',
				operator:search.Operator.IS,  	
				formula:"decode({type},'Transfer Order',{transactionlinetype},'Shipping')",
				values:"Shipping"
			}));


			toLineDetailsSearch.filters = toLineDetailsFilters;
			var	 TOLineDetailsNew = _getSearchResultInJSON(toLineDetailsSearch);
			var vitemfulfillmentid = '';

			if(TOLineDetailsNew.length>0)
			{
				var TOLineDetails = [];
				var remainingqty=0;
				for (var ifItr = 0; ifItr < TOLineDetailsNew.length; ifItr++)
				{

					vitemfulfillmentid = TOLineDetailsNew[ifItr]['internalid'];
					vitemfulfillmentitemid = TOLineDetailsNew[ifItr]['item'];											
					vitemfulfillmentqty = TOLineDetailsNew[ifItr]['quantity'];

					if(vitemfulfillmentid!=null && vitemfulfillmentid!= 'null' && vitemfulfillmentid!= undefined && 
							vitemfulfillmentid != '' && TOLineDetails.indexOf(parseInt(vitemfulfillmentid)) == -1)
					{
						TOLineDetails.push(parseInt(vitemfulfillmentid));
					}

				}
                       log.debug({title:'TOLineDetailsNew.length',details:TOLineDetailsNew.length});
                       log.debug({title:'vitemfulfillmentid',details:vitemfulfillmentid});
				for (var postitemItr = 0; postitemItr < TOLineDetails.length; postitemItr++)
				{
					try
					{
						vitemfulfillmentid = TOLineDetails[postitemItr];

						var frecord = record.load({
							type: record.Type.ITEM_FULFILLMENT,
							id: vitemfulfillmentid,
							isDynamic: true

						});

						trecord  = record.transform({
							fromType: record.Type.TRANSFER_ORDER,
							fromId: transactionInternalId,
							toType: record.Type.ITEM_RECEIPT,
							defaultValues: {itemfulfillment: vitemfulfillmentid},
							isDynamic:false
						});

						var tolinelength = trecord.getLineCount({sublistId:'item'});
						var openTaskIdArr = [];
						for (var itemItr = 0; itemItr < tolinelength; itemItr++)
						{
							var itemId = trecord.getSublistValue({sublistId:'item',fieldId: 'item',line: itemItr});
							var itemRec = trecord.getSublistValue({sublistId:'item',fieldId: 'itemreceive',line: itemItr});
							var itemLineNo = trecord.getSublistValue({sublistId:'item',fieldId: 'line',line: itemItr});
							var itemQuantity = trecord.getSublistValue({sublistId:'item',fieldId: 'quantity',line: itemItr});
							var whLocation = trecord.getSublistValue({sublistId:'item',fieldId: 'location',line: itemItr});

							if(whLocation==null||whLocation=="")
								whLocation=warehouseLocationId;

							var itemLineNo = parseInt(itemLineNo) - parseInt(2);
							if(opentaskSearchResults.length>0)
							{
								var totalLineQty = 0;
								for(var tempItr = 0; tempItr < opentaskSearchResults.length; tempItr++)
								{
									var toLineno = opentaskSearchResults[tempItr]['custrecord_wmsse_line_no'];
									if(parseFloat(toLineno) == parseFloat(itemLineNo))
									{
										var enterQty = opentaskSearchResults[tempItr]['custrecord_wmsse_act_qty'];
										totalLineQty = Big(totalLineQty).plus(enterQty);
									}
								}

								var compSubRecord = trecord.getSublistSubrecord({sublistId:'item',fieldId:'inventorydetail',line:itemItr});
								var complinelength = compSubRecord.getLineCount({sublistId:'inventoryassignment'});

								if(parseInt(complinelength)>0)
								{
									for(var invassItr=0;invassItr<complinelength;invassItr++)
									{ 
										compSubRecord.removeLine({sublistId:'inventoryassignment',line:0});
									}
									complinelength = compSubRecord.getLineCount({sublistId:'inventoryassignment'});
								}
								var enterQty = '';
								var toLineno = '';
								var enterBin = '';
								var batchno = '';
								var expiryDate = '';
								var FetchedItemId =  '';
								var itemStatus =  '';
								var serialNumber = '';
								var itemType =  '';
								var isSerialItem ='';
								var isLotItem ='';
								var isInventoryItem ='';
								for(var otItr=0; otItr<opentaskSearchResults.length;otItr++)
								{
									enterQty = opentaskSearchResults[otItr]['custrecord_wmsse_act_qty'];
									toLineno = opentaskSearchResults[otItr]['custrecord_wmsse_line_no'];
									enterBin = opentaskSearchResults[otItr]['custrecord_wmsse_actendloc'];
									batchno = opentaskSearchResults[otItr]['custrecord_wmsse_batch_num'];
									expiryDate = opentaskSearchResults[otItr]['custrecord_wmsse_expirydate'];
									FetchedItemId = opentaskSearchResults[otItr]['custrecord_wmsse_sku'];
									itemStatus = opentaskSearchResults[otItr]['custrecord_wmsse_inventorystatus'];
									serialNumber = opentaskSearchResults[otItr]['custrecord_wmsse_serial_no'];

									isSerialItem = trecord.getSublistValue({sublistId:'item',fieldId: 'isserial',line: itemItr});
									isLotItem = trecord.getSublistValue({sublistId:'item',fieldId: 'isnumbered',line: itemItr});
									isInventoryItem = trecord.getSublistValue({sublistId:'item',fieldId: 'invttype',line: itemItr});
									if(isSerialItem == 'T')
									{
										itemType  = 'serializedinventoryitem' ;
									}
									else if(isLotItem == 'T')
									{
										itemType  = 'lotnumberedinventoryitem' ; 
									}
									else if(isInventoryItem == 'T')
									{
										itemType  = 'inventoryitem' ;  
									}
									else
									{

									}
									
									if ((parseInt(itemLineNo) ==  parseInt(toLineno)) && ((parseFloat(itemQuantity) == parseFloat(enterQty)) 
											|| (parseFloat(itemQuantity) == parseFloat(totalLineQty))))
									{
										
										var fitemcount = frecord.getLineCount({
											sublistId: 'item'
										});

										for(var Ifitr=0;Ifitr<fitemcount;Ifitr++)
										{

											frecord.selectLine({
												sublistId: 'item',
												line: Ifitr
											});
											var fline = frecord.getSublistValue({sublistId: 'item',fieldId: 'orderline',	line:Ifitr});
											var pofline= parseInt(fline) + 1;
											var fulfillSubRecord = frecord.getCurrentSublistSubrecord({
												sublistId: 'item',
												fieldId: 'inventorydetail'
											});

											var toInventoryassignmentLineLength=0;
											if(fulfillSubRecord!=null && fulfillSubRecord!=''&& fulfillSubRecord!='null')
												toInventoryassignmentLineLength = fulfillSubRecord.getLineCount({
													sublistId: 'inventoryassignment'
												});

											if(parseInt(toLineno) == (parseInt(pofline)-2))
											{
												break;
											}

										}
										openTaskIdArr.push(opentaskSearchResults[otItr]['id']);
										itemindex=itemItr;	
										
										log.debug({title:'enterQty',details:enterQty});
										trecord.setSublistValue({sublistId: 'item',line:itemindex,fieldId: 'itemreceive',value: true});
										trecord.setSublistValue({sublistId: 'item',line:itemindex,fieldId: 'quantity',value: parseFloat(itemQuantity)});
										trecord.setSublistValue({sublistId: 'item',line:itemindex,fieldId: 'location',value: whLocation});

										if (itemType == "lotnumberedinventoryitem" || itemType=="lotnumberedassemblyitem")
										{	
											compSubRecord.insertLine({
												sublistId: 'inventoryassignment',
												line:complinelength
											});

											compSubRecord.setSublistValue({sublistId:'inventoryassignment',fieldId: 'quantity',line:complinelength,value: parseFloat(enterQty)});
											compSubRecord.setSublistValue({sublistId:'inventoryassignment',fieldId: 'receiptinventorynumber',line:complinelength,value:batchno});

											if(enterBin!=null && enterBin!="" && enterBin!='null')
												compSubRecord.setSublistValue({sublistId:'inventoryassignment',fieldId: 'binnumber',line:complinelength,value:enterBin});
											if(expiryDate!=null && expiryDate!="" && expiryDate!='null')
											{
												var parsedExpiryDate = format.parse({
													value: expiryDate,
													type: format.Type.DATE
												});
												compSubRecord.setSublistValue({sublistId:'inventoryassignment',fieldId: 'expirationdate',line:complinelength,value:parsedExpiryDate});

											}
											if(itemStatus != null && itemStatus != "" && itemStatus != 'null'  && itemStatus != undefined)
												compSubRecord.setSublistValue({sublistId:'inventoryassignment', fieldId:'inventorystatus',line:complinelength,value:itemStatus});
											complinelength++;
											if(otItr+1 == toInventoryassignmentLineLength)
											{
												break;
											}
										}
										else if (itemType == "inventoryitem" || itemType == "assemblyitem")
										{
											compSubRecord.insertLine({
												sublistId: 'inventoryassignment',
												line:complinelength
											});
											log.debug({title:'enterQty11111',details:enterQty});
											compSubRecord.setSublistValue({sublistId:'inventoryassignment',fieldId: 'quantity',line:complinelength,value: parseFloat(enterQty)});

											if(enterBin!=null && enterBin!="" && enterBin!='null')
												compSubRecord.setSublistValue({sublistId:'inventoryassignment',fieldId: 'binnumber',line:complinelength,value:enterBin});

											if(itemStatus != null && itemStatus != "" && itemStatus != 'null'  && itemStatus != undefined)
												compSubRecord.setSublistValue({sublistId:'inventoryassignment', fieldId:'inventorystatus',line:complinelength,value:itemStatus});
											complinelength++;
											if(otItr+1 == toInventoryassignmentLineLength)
											{
												break;
											}
											
										}
										else if (itemType == "serializedinventoryitem" || itemType=="serializedassemblyitem") 
										{

											var serialSearch = search.load({
												id: 'customsearch_wmsse_serialentry_details',
											});
											var serailFilters = serialSearch.filters;

											serailFilters.push(search.createFilter({name:'custrecord_wmsse_ser_ordline',
												operator: search.Operator.EQUALTO,
												values:toLineno }));
											serailFilters.push(search.createFilter({name:'custrecord_wmsse_ser_ordno',
												operator: search.Operator.ANYOF,
												values:transactionInternalId }));
											serailFilters.push(search.createFilter({name:'custrecord_wmsse_ser_status',
												operator: search.Operator.EQUALTO,
												values:'F' }));

											serialSearch.filters = serailFilters;
											var SrchRecordTmpSerial1 =_getSearchResultInJSON(serialSearch);
											log.debug({title:'SrchRecordTmpSerial1',details:SrchRecordTmpSerial1});
											if(SrchRecordTmpSerial1!=null && SrchRecordTmpSerial1!="")
											{
												var transerresultvalues = [];
												if(serialNumber != null && serialNumber != '')
													transerresultvalues = serialNumber.split(',');

												if(transerresultvalues != null && transerresultvalues != 'null' && transerresultvalues != '' && transerresultvalues.length > 0)
												{
													for(var n = 0; n < transerresultvalues.length; n++) 
													{
														compSubRecord.insertLine({
															sublistId: 'inventoryassignment',
															line:complinelength
														});


														compSubRecord.setSublistValue({sublistId:'inventoryassignment',fieldId: 'quantity',line:complinelength,value: 1});
														compSubRecord.setSublistValue({sublistId:'inventoryassignment',fieldId: 'receiptinventorynumber',line:complinelength,value:transerresultvalues[n]});
														if(enterBin!=null && enterBin!="" && enterBin!='null')
															compSubRecord.setSublistValue({sublistId:'inventoryassignment',fieldId: 'binnumber',line:complinelength,value:enterBin});

														if(itemStatus != null && itemStatus != "" && itemStatus != 'null'  && itemStatus != undefined)
															compSubRecord.setSublistValue({sublistId:'inventoryassignment', fieldId:'inventorystatus',line:complinelength,value:itemStatus});
														complinelength++;
														if(otItr+1 == toInventoryassignmentLineLength)
														{
															break;
														}
													}
												}
												for (var j1 = 0; j1 < SrchRecordTmpSerial1.length; j1++) {
													var TempRecord=SrchRecordTmpSerial1[j1];
													var serialRec = record.load({type:'customrecord_wmsse_serialentry',
														id:TempRecord.id,
														isDynamic: true
													});
													serialRec.setValue({fieldId:'id',value: TempRecord.id});
													serialRec.setValue({fieldId: 'name',value: transactionInternalId});
													serialRec.setValue({fieldId:'custrecord_wmsse_ser_note1',
														value:'because of item receipt posted for serial number  we have marked this serial number as closed'});
													serialRec.setValue({fieldId:'custrecord_wmsse_ser_status', value:true});
													serialRec.save();
												}
											}

										}
										log.debug({title:'trecord',details:trecord});
									}
									else
									{

										//log.debug({title:'itemItr else',details:itemItr});
										trecord.setSublistValue({
											sublistId: 'item',
											fieldId: 'itemreceive',
											line:itemItr,
											value: false
										});

									}
								}


							}
						}
						if(trecord != null && trecord != '')
						{
							log.debug({title:'trecord',details:trecord});
							idl = trecord.save();
							log.debug({title:'idl',details:idl});
						}
						if(idl != null && idl != '')
						{

							for(var q=0; q<openTaskIdArr.length;q++)
							{
								var vid = openTaskIdArr[q];
								var id = record.submitFields({
									type: 'customrecord_wmsse_trn_opentask',
									id: vid,
									values: {
										'custrecord_wmsse_nsconfirm_ref_no': idl
									}
								});
							}

						}
					}
					catch(e)
					{
						log.error({title:'e for fullfiment id',details:e});
					}
				}

			}
		}
		catch(e)
		{
			log.error({title:'e',details:e});
		}
		return idl;
	}
	function _getOrderStatus(orderInternalId,getTranId,tranType)
	{
		log.error({title:'_getOrderStatus',details:'_getOrderStatus'});
		var vType = 'PurchOrd';
		if(tranType == 'transferorder')
		{
			vType = 'TrnfrOrd';
		}
		else if(tranType=='returnauthorization')
		{	
			vType='RtnAuth';			
		}

		var orderDetails = search.load({id:'customsearch_wmsse_transactionid_details'});
		var objFiltersArr  = orderDetails.filters;
		if(_isValueValid(orderInternalId)) {
			objFiltersArr.push(search.createFilter({
				name:'internalid',
				operator: search.Operator.IS,
				values : orderInternalId
			}));
		}

		objFiltersArr.push(search.createFilter({
			name:'type',
			operator: search.Operator.ANYOF,
			values : vType
		}));

		objFiltersArr.push(search.createFilter({
			name:'tranid',
			operator: search.Operator.IS,
			values : getTranId
		}));
		objFiltersArr.push(search.createFilter({
			name:'mainline',
			operator: search.Operator.IS,
			values : true
		}));		

		orderDetails.filters = objFiltersArr;
		var	orderSearchResults  = _getSearchResultInJSON(orderDetails);
		log.error({title:'orderSearchResults',details:orderSearchResults});
		return orderSearchResults;
	}
	function getOTResultsforIRPosting(poid,containerID,item_id,itemLineNo,warehouseLocationId)
	{		
		var otResultsforopenputawayarr = [];
		var postItemReceiptSearchObj = search.load({id:'customsearch_wmsse_postitemreceipt_srch'});
		var postItemReceiptSearchFilters = postItemReceiptSearchObj.filters;

		if(_isValueValid(poid))
		{
			postItemReceiptSearchFilters.push(search.createFilter({
				name: 'custrecord_wmsse_order_no',
				operator: search.Operator.ANYOF,
				values: poid
			}));
		}


		if(_isValueValid(item_id))
		{
			postItemReceiptSearchFilters.push(search.createFilter({
				name: 'custrecord_wmsse_sku',
				operator: search.Operator.ANYOF,
				values: item_id
			}));
		}
		if(_isValueValid(itemLineNo))
		{
			postItemReceiptSearchFilters.push(search.createFilter({
				name: 'custrecord_wmsse_line_no',
				operator: search.Operator.EQUALTO,
				values: itemLineNo
			}));
		}

		if(_isValueValid(warehouseLocationId))
		{
			postItemReceiptSearchFilters.push(search.createFilter({
				name: 'custrecord_wmsse_wms_location',
				operator: search.Operator.ANYOF,
				values: warehouseLocationId
			}));
		}

		postItemReceiptSearchFilters.push(search.createFilter({
			name: 'custrecord_wmsse_nsconfirm_ref_no',
			operator: search.Operator.ANYOF,
			values: ['@NONE@']
		}));
		postItemReceiptSearchObj.filters = postItemReceiptSearchFilters;
		var objPostItemReceiptDetails =  _getSearchResultInJSON(postItemReceiptSearchObj);

		return objPostItemReceiptDetails;
	}


	function updateScheduleScriptStatus(processname,currentUserId,status,transactionInternalId,transactionType,notes)
	{		

		var str = 'processname. = ' + processname + '<br>';
		str = str + 'currentUserId. = ' + currentUserId + '<br>';	
		str = str + 'transactionInternalId. = ' + transactionInternalId + '<br>';	
		str = str + 'transactionType. = ' + transactionType + '<br>';	
		str = str + 'notes. = ' + notes + '<br>';
		str = str + 'status. = ' + status + '<br>';

		log.debug({title:'updateScheduleScriptStatus Function Parameters',details:str});

		if((currentUserId == null) || (currentUserId =='') || (currentUserId<0))
			currentUserId='';

		if(!_isValueValid(notes))
			notes='';

		if(status=='Submitted')
		{
			var datetime = DateStamp() +" "+ getCurrentTimeStamp();  
			var schedulestatus =  record.create({
				type: 'customrecord_wmsse_schscripts_status',

			});
			schedulestatus.setValue({
				fieldId: 'name',
				value: processname
			}); 
			schedulestatus.setValue({
				fieldId: 'custrecord_wmsse_schprsname',
				value: processname
			}); 
			schedulestatus.setValue({
				fieldId: 'custrecord_wmsse_schprsstatus',
				value: status
			}); 
			schedulestatus.setValue({
				fieldId: 'custrecord_wmsse_schprstranrefno',
				value: parseInt(transactionInternalId).toString()
			}); 
			if(currentUserId!=null && currentUserId!='')
			{
				schedulestatus.setValue({
					fieldId: 'custrecord_wmsse_schprsinitiatedby',
					value: currentUserId
				});
			}
			if(transactionType!=null && transactionType!='')
			{
				schedulestatus.setValue({
					fieldId: 'custrecord_wmsse_schprstrantype',
					value: transactionType
				});
			}
			var tranid = schedulestatus.save();
			log.debug('tranid',tranid);
		}
		else if(status=='In Progress') 
		{
			var statusDetails = search.load({id:'customsearch_wmsse_mapreduce_status'});
			var objFiltersArr  = statusDetails.filters;

			if(currentUserId!=null && currentUserId!='')
			{
				objFiltersArr.push(search.createFilter({
					name: 'custrecord_wmsse_schprsinitiatedby',
					operator: search.Operator.ANYOF,
					values: currentUserId
				}));
			}
			objFiltersArr.push(search.createFilter({
				name: 'custrecord_wmsse_schprsstatus',
				operator: search.Operator.IS,
				values: 'Submitted'
			}));
			objFiltersArr.push(search.createFilter({
				name: 'custrecord_wmsse_schprsname',
				operator: search.Operator.IS,
				values: processname
			}));

			objFiltersArr.push(search.createFilter({
				name: 'custrecord_wmsse_schprstranrefno',
				operator: search.Operator.IS,
				values: parseFloat(transactionInternalId)
			}));

			statusDetails.filters = objFiltersArr;
			var statusSearchResult =  _getSearchResultInJSON(statusDetails);

			if(statusSearchResult!=null && statusSearchResult!='')
			{
				var vid=statusSearchResult[0].id;
				log.debug('vid in In Progress',vid);
				record.submitFields({
					type: 'customrecord_wmsse_schscripts_status',
					id: vid,
					values: {
						'custrecord_wmsse_schprsstatus': status,
						'custrecord_wmsse_schprsbegindate': DateStamp()

					}
				});
			}
			//}
		}
		else if(status=='Completed') 
		{
			var statusDetails = search.load({id:'customsearch_wmsse_mapreduce_status'});
			var objFiltersArr  = statusDetails.filters;

			if(currentUserId!=null && currentUserId!='')
			{
				objFiltersArr.push(search.createFilter({
					name: 'custrecord_wmsse_schprsinitiatedby',
					operator: search.Operator.ANYOF,
					values: currentUserId
				}));
			}
			objFiltersArr.push(search.createFilter({
				name: 'custrecord_wmsse_schprsstatus',
				operator: search.Operator.IS,
				values: 'In Progress'
			}));
			objFiltersArr.push(search.createFilter({
				name: 'custrecord_wmsse_schprsname',
				operator: search.Operator.IS,
				values: processname
			}));

			objFiltersArr.push(search.createFilter({
				name: 'custrecord_wmsse_schprstranrefno',
				operator: search.Operator.IS,
				values: parseFloat(transactionInternalId)
			}));

			statusDetails.filters = objFiltersArr;
			var statusSearchResult = _getSearchResultInJSON(statusDetails);

			if(statusSearchResult!=null && statusSearchResult!='')
			{
				var vid=statusSearchResult[0].id;
				log.debug('vid in In Completed',vid);
				record.submitFields({
					type: 'customrecord_wmsse_schscripts_status',
					id: vid,
					values: {
						'custrecord_wmsse_schprsstatus': status,
						'custrecord_wmsse_schprsenddate': DateStamp(),
						'custrecord_wmsse_schprsnotes': notes
					}
				});
			}

		}
	}
	function _getValidBinInternalIdWithLocationTypeInv(Binnumber,warehouseLocationId)
	{
		var searchrecordSearch= search.load({
			id : 'customsearch_wmsse_woqty_bin_srh'
		});
		var filter= searchrecordSearch.filters;
		filter.push(search.createFilter({
			name :'binnumber',
			operator: search.Operator.IS,
			values:  Binnumber
		}));
		if(_isValueValid(warehouseLocationId))
			filter.push(search.createFilter({
				name :'location',
				operator: search.Operator.ANYOF,
				values:  warehouseLocationId
			}));
		searchrecordSearch.filters = filter;
		var binSearchResults = _getSearchResultInJSON(searchrecordSearch);
		return binSearchResults;
	}
	function  _InvokeNSInventoryAdjustment(nsInvAdjObj)
	{
		log.debug('nsInvAdjObj',nsInvAdjObj);
		var itemInternalId = nsInvAdjObj['itemInternalId'];
		var itemType = nsInvAdjObj['itemType'];
		var warehouseLocationId = nsInvAdjObj['warehouseLocationId'];
		var scannedQuantity = nsInvAdjObj['scannedQuantity'];
		var enterBin = nsInvAdjObj['binInternalId'];
		var expiryDate = nsInvAdjObj['expiryDate'];
		var lot = nsInvAdjObj['lotName'];
		var notes = nsInvAdjObj['notes'];
		var date = nsInvAdjObj['date'];
		var period = nsInvAdjObj['period'];
		var accountNo = nsInvAdjObj['accountNo'];
		var inventoryStatus = nsInvAdjObj['statusInternalId'];
		var units = nsInvAdjObj['units'];
		var stockConversionRate = nsInvAdjObj['stockConversionRate'];
		var vAccountNo=accountNo;
		var vCost=0;
		var vAvgCost=0;
		var vItemname='';
		var avgcostlot=0;
		var itemSearch = search.load({
			id : 'customsearch_wmsse_inv_basic_itemdetails'
		});
		itemSearch.filters.push(search.createFilter({
			name : 'internalid',
			operator : search.Operator.IS,
			values : itemInternalId
		}));
		itemSearch.filters.push(search.createFilter({
			name : 'isinactive',
			operator : search.Operator.IS,
			values : false
		}));
		if(warehouseLocationId !=null && warehouseLocationId!='' && warehouseLocationId!='null' && warehouseLocationId!='undefined' && warehouseLocationId > 0)
		{
			itemSearch.filters.push(search.createFilter({
				name : 'inventorylocation',
				operator : search.Operator.ANYOF,
				values : warehouseLocationId
			}));
		}
		itemSearch.columns.push(search.createColumn({
			name : 'cost'
		}));
		itemSearch.columns.push(search.createColumn({
			name : 'locationaveragecost'
		}));
		itemSearch.columns.push(search.createColumn({
			name : 'itemid'
		}));
		var itemObj = _getSearchResultInJSON(itemSearch);
		if (itemObj.length >0) 
		{
			vItemname=itemObj[0]['itemid'];
			vCost = itemObj[0]['cost'];
			vAvgCost = itemObj[0]['locationaveragecost'];
		}
		var adjInventory = record.create({
			type: record.Type.INVENTORY_ADJUSTMENT, 
			isDynamic: true,
		});
		var subs = runtime.isFeatureInEffect({
			feature: 'subsidiaries' 
		});
		if(subs==true)
		{
			var vSubsidiaryVal=getSubsidiaryforLocation(warehouseLocationId);
			if(vSubsidiaryVal != null && vSubsidiaryVal != '')
			{
				adjInventory.setValue({
					fieldId: 'subsidiary',
					value: vSubsidiaryVal
				});
			}
		}
		if(_isValueValid(vAccountNo))
		{
			adjInventory.setValue({
				fieldId: 'account',
				value: vAccountNo
			});
		}
		else{
			adjInventory.setValue({
				fieldId: 'account',
				value: 1
			});
		}
		adjInventory.setValue({
			fieldId: 'memo',
			value: notes
		});
		adjInventory.setCurrentSublistValue({
			sublistId: 'inventory',
			fieldId: 'item',
			value: itemInternalId
		});
		adjInventory.setCurrentSublistValue({
			sublistId: 'inventory',
			fieldId: 'location',
			value: warehouseLocationId
		});
		adjInventory.setCurrentSublistValue({
			sublistId: 'inventory',
			fieldId: 'adjustqtyby',
			value: scannedQuantity
		});
		var currDate = DateStamp();
		var parsedCurrentDate = format.parse({
			value: currDate,
			type: format.Type.DATE
		});
		if(_isValueValid(date))
		{
			adjInventory.setValue({
				fieldId: 'trandate',
				value: parsedCurrentDate
			});
		}
		if(_isValueValid(period))
		{
			adjInventory.setValue({
				fieldId: 'postingperiod',
				value: period
			});
		}
		if(_isValueValid(vAvgCost))	
		{
			adjInventory.setCurrentSublistValue({
				sublistId: 'inventory',
				fieldId: 'unitcost',
				value: vAvgCost
			});
		}
		else
		{
			adjInventory.setCurrentSublistValue({
				sublistId: 'inventory',
				fieldId: 'unitcost',
				value: vCost
			});
		}
		if (itemType == "serializedinventoryitem" || itemType == "serializedassemblyitem") {
			var tempQty;
			if(parseFloat(scannedQuantity)<0)
			{
				tempQty=-1;
			}
			else
			{
				tempQty=1;
			}
			var filterssertemp = [];
			filterssertemp.push(search.createFilter({name:'custrecord_wmsse_ser_status',operator: search.Operator.IS,values:false}));
			filterssertemp.push(search.createFilter({name:'custrecord_wmsse_ser_tasktype',operator: search.Operator.ANYOF,values:10}));
			filterssertemp.push(search.createFilter({name:'custrecord_wmsse_ser_item',operator: search.Operator.ANYOF,values:itemInternalId}));
			var columns = [];
			columns.push(search.createColumn('custrecord_wmsse_ser_no'));
			columns.push(search.createColumn('name'));
			var SrchRecordTmpSeriaObj = search.create({type:'customrecord_wmsse_serialentry', filters:filterssertemp,columns:columns});
			var SrchRecordTmpSerial1 = _getSearchResultInJSON(SrchRecordTmpSeriaObj);
			if(SrchRecordTmpSerial1!=null && SrchRecordTmpSerial1!="")
			{
				var	compSubRecord = adjInventory.getCurrentSublistSubrecord({
					sublistId: 'inventory',
					fieldId: 'inventorydetail'
				});
				for (var x = 0; x < SrchRecordTmpSerial1.length; x++)
				{
					compSubRecord.selectNewLine({
						sublistId: 'inventoryassignment'
					});
					compSubRecord.setCurrentSublistValue({
						sublistId: 'inventoryassignment',
						fieldId: 'quantity',
						value: tempQty
					});
					compSubRecord.setCurrentSublistValue({
						sublistId: 'inventoryassignment',
						fieldId: 'receiptinventorynumber',
						value:  SrchRecordTmpSerial1[x]['custrecord_wmsse_ser_no']
					});
					if(enterBin!=null && enterBin!="" && enterBin!='null')
					{
						compSubRecord.setCurrentSublistValue({
							sublistId: 'inventoryassignment',
							fieldId: 'binnumber',
							value: enterBin
						});
					}
					if(inventoryStatus)
					{
						compSubRecord.setCurrentSublistValue({
							sublistId: 'inventoryassignment',
							fieldId: 'inventorystatus',
							value: inventoryStatus
						});
					}
					compSubRecord.commitLine({sublistId:'inventoryassignment'});
				}
				for (var j = 0; j < SrchRecordTmpSerial1.length; j++) {
					var TempRecord = SrchRecordTmpSerial1[j];
					var serialRec = record.load({
						type : 'customrecord_wmsse_serialentry',
						id : TempRecord.id
					});
					serialRec.setValue({ fieldId:'customrecord_wmsse_serialentry', value :TempRecord.id });
					serialRec.setValue({ fieldId:'custrecord_wmsse_ser_note1', value :'because of discontinue of serial number scanning we have marked this serial number as closed'});
					serialRec.setValue({ fieldId:'custrecord_wmsse_ser_status', value :true });
					serialRec.save();
					TempRecord=null;
				}
			}
		}
		else if (itemType == "inventoryitem" || itemType == "lotnumberedinventoryitem" || itemType=="lotnumberedassemblyitem"  || itemType=="assemblyitem" )
		{
			var	compSubRecord = adjInventory.getCurrentSublistSubrecord({
				sublistId: 'inventory',
				fieldId: 'inventorydetail'
			});
			var complinelength = compSubRecord.getLineCount({sublistId:'inventoryassignment'});
			compSubRecord.selectNewLine({
				sublistId: 'inventoryassignment'
			});
			compSubRecord.setCurrentSublistValue({
				sublistId: 'inventoryassignment',
				fieldId: 'quantity',
				value: scannedQuantity
			});
			if(inventoryStatus!=null && inventoryStatus!=''){
				compSubRecord.setCurrentSublistValue({
					sublistId: 'inventoryassignment',
					fieldId: 'inventorystatus',
					value: inventoryStatus
				});
			}
			if(enterBin!=null && enterBin!="" && enterBin!='null')
			{
				compSubRecord.setCurrentSublistValue({
					sublistId: 'inventoryassignment',
					fieldId: 'binnumber',
					value: enterBin
				});	
			}
			if(itemType == "lotnumberedinventoryitem" || itemType=="lotnumberedassemblyitem")
			{
				if(lot!=null && lot!='' && lot!='null' && lot!='undefined')
				{
					compSubRecord.setCurrentSublistValue({
						sublistId: 'inventoryassignment',
						fieldId: 'receiptinventorynumber',
						value: lot
					});	
				}
				if(expiryDate!=null && expiryDate!="" && expiryDate!='null'){

					var parsedExpiryDate = format.parse({
						value: expiryDate,
						type: format.Type.DATE
					});
					compSubRecord.setCurrentSublistValue({
						sublistId: 'inventoryassignment',
						fieldId: 'expirationdate',
						value: parsedExpiryDate
					});
				}
			}
			compSubRecord.commitLine({sublistId:'inventoryassignment'});
		}
		adjInventory.commitLine({sublistId:'inventory'});
		var id = adjInventory.save();
		if(id!=null && id!=''){
			var taskType="INVT";
			var opentaskObj = {};
			opentaskObj['itemType']=itemType ;
			opentaskObj['whLocation']=warehouseLocationId ;
			opentaskObj['itemId']=itemInternalId ;
			opentaskObj['quantity']=scannedQuantity ;
			opentaskObj['fromBinId']=enterBin ;
			opentaskObj['toBinId']=enterBin ;
			opentaskObj['batchno']=lot ;
			opentaskObj['inventoryCountId']= id;
			opentaskObj['taskType']=taskType ;
			opentaskObj['units']=units ;
			opentaskObj['stockConversionRate']= stockConversionRate;
			opentaskObj['fromStatus']= inventoryStatus;
			idl =	updateMoveOpenTaskforInventory(opentaskObj);
		}
	}
	function ValidateDate(vDateString,dtsettingFlag)
	{
		if(vDateString != null && vDateString != '')
		{
			var vValidDate= format.parse({
				type :format.Type.DATE,
				value : vDateString
			});
			if(isNaN(vValidDate) || vValidDate == null || vValidDate == '')
				return null;
			else
				return vValidDate;
		}
		else
			return null;
	}
	function validateLocationForAccNo(whLocation){
		var  isValid = '';
		var accountNo = '';
		var vSubsid = getSubsidiaryforLocation(whLocation);
		var searchRec = search.load({
			id : 'customsearch_wmsse_locsearchresults'
		});
		searchRec.filters.push(search.createFilter({
			name : 'internalid',
			operator : search.Operator.IS,
			values : whLocation
		}));
		searchRec.columns.push(search.createColumn({
			name : 'custrecord_wmsse_wms_account'
		}));
		var searchRes = _getSearchResultInJSON(searchRec);
		if(searchRes.length > 0){
			var searcObj = searchRes[0];
			accountNo = searcObj['custrecord_wmsse_wms_account'];
			if(_isValueValid(accountNo))
			{
				isValid = accountNo;
			}
			else
			{					
				var searchRec = search.load({
					id : 'customsearch_wms_account_search'
				});
				searchRec.filters.push(search.createFilter({
					name : 'isinactive',
					operator : search.Operator.IS,
					values : false
				}));
				if(vSubsid != null && vSubsid != '' && vSubsid != 'null')
				{
					searchRec.filters.push(search.createFilter({
						name : 'subsidiary',
						operator : search.Operator.ANYOF,
						values : vSubsid
					}));
				}
				searchRec.columns.push(search.createColumn({
					name : 'internalid'
				}));
				var searchRes = _getSearchResultInJSON(searchRec);
				if(searchRes != '' && searchRes != 'null' && searchRes != null && searchRes != 'undefined')
				{
					isValid=searchRes[0]['internalidText'];
				}
			}
		}
		return isValid;
	}
	function getItemMixFlag(itemNo,binInternalId,strLocation,BinLocation)
	{
		var resultArray = [];
		var mixFlag = "T";
		var mixLotFlag = "T";
		var isValid='T';
		var useBins=true;
		var searchrecordSearch= search.load({
			id : 'customsearch_wmsse_inv_basic_itemdetails'
		});
		var filter= searchrecordSearch.filters;
		filter.push(search.createFilter({
			name :'internalid',
			operator: search.Operator.ANYOF,
			values:  itemNo
		}));
		searchrecordSearch.columns.push(search.createColumn({
			name: 'custitem_wmsse_mix_item'
		}));
		searchrecordSearch.columns.push(search.createColumn({
			name: 'usebins'
		}));
		searchrecordSearch.columns.push(search.createColumn({
			name: 'custitem_wmsse_mix_lot'
		}));
		searchrecordSearch.filters = filter;
		var searchRes = _getSearchResultInJSON(searchrecordSearch);
		if(searchRes!=null && searchRes !="")
		{
			mixFlag = searchRes[0]['custitem_wmsse_mix_item'];
			useBins= searchRes[0]['usebins'];
			mixLotFlag =searchRes[0]['custitem_wmsse_mix_lot'];
		}
		var getPreferBin='';
		var searchrecordSearch= search.load({
			id : 'customsearch_wmsse_inventory_itemdetails'
		});
		var preferBinfilter= searchrecordSearch.filters;
		preferBinfilter.push(search.createFilter({
			name :'internalid',
			operator: search.Operator.ANYOF,
			values:  itemNo
		}));
		preferBinfilter.push(search.createFilter({
			name :'isinactive',
			operator: search.Operator.ANYOF,
			values:  false
		}));
		if(_isValueValid(strLocation))
		{
			preferBinfilter.push(search.createFilter({
				name :'location',
				operator: search.Operator.ANYOF,
				values:  ['@NONE@',strLocation]
			}));
		}
		searchrecordSearch.columns.push(search.createColumn({
			name: 'itemid'
		}));
		searchrecordSearch.filters = preferBinfilter;
		var itemresults = _getSearchResultInJSON(searchrecordSearch);
		if(itemresults!=null && itemresults!='')
		{
			if(itemresults[0]['preferredbin']==true)
			{
				getPreferBin = itemresults[0]['binnumber'];
			}
		}
		if(mixFlag== false && (getPreferBin != BinLocation))
		{
			var objInvDetails= search.load({
				id : 'customsearch_wmsse_itemwise_inventory'
			});
			var filterStrat= objInvDetails.filters;
			filterStrat.push(search.createFilter({
				name :'internalid',
				operator: search.Operator.NONEOF,
				values:  itemNo
			}));
			filterStrat.push(search.createFilter({
				name :'quantityonhand',
				join: 'binOnHand',
				operator: search.Operator.GREATERTHAN,
				values:  0
			}));
			if(strLocation!=null && strLocation!='')
			{
				filterStrat.push(search.createFilter({
					name :'location',
					join: 'binOnHand',
					operator: search.Operator.ANYOF,
					values:  strLocation
				}));
			}
			if(binInternalId!=null && binInternalId!='')
			{
				filterStrat.push(search.createFilter({
					name :'binnumber',
					join: 'binOnHand',
					operator: search.Operator.ANYOF,
					values:  binInternalId
				}));
			}
			objInvDetails.columns.push(search.createColumn({
				name: 'binnumber'
			}));
			objInvDetails.filters = filterStrat;
			var objInvDetailsRes = _getSearchResultInJSON(objInvDetails);
			if(objInvDetailsRes.length > 0)
			{
				isValid='F';
			}
		}

		var currRow = {'isValid':isValid,'useBins':useBins,'mixLotFlag':mixLotFlag};
		resultArray.push(currRow);
		return resultArray;
	}
	function _getTransferOrderItemReceiptDetails(orderInternalId,orderLineNo)
	{
		var toLineDetailsSearch = search.load({id:'customsearch_wmsse_transf_ful_lot_detail'});
		var toLineDetailsFilters = toLineDetailsSearch.filters;

		if(_isValueValid(orderInternalId))
		{
			toLineDetailsFilters.push(search.createFilter({
				name:'internalid',
				operator: search.Operator.ANYOF,
				values:orderInternalId}));
			toLineDetailsFilters.push(search.createFilter({
				name:'transactionlinetype',
				operator: search.Operator.IS,
				values:'RECEIVING'}));

		}
		if(_isValueValid(orderLineNo))
		{
			toLineDetailsFilters.push(search.createFilter({
				name:'line',
				operator: search.Operator.ANYOF,
				values:(parseFloat(orderLineNo)+1)}));
		}

		toLineDetailsSearch.filters = toLineDetailsFilters;
		var	 transferOrderReceiptDetails = _getSearchResultInJSON(toLineDetailsSearch);
		log.debug({title:'transferOrderReceiptDetails',details:transferOrderReceiptDetails});

		return transferOrderReceiptDetails;
	}
	function _getTransferOrderOpenTaskDetails(getItemInternalId,getOrderInternalId,getOrderLineNo,whLocation,fromStatusInternalId,lot,inventoryStatusFeature)
	{
		var searchObj = search.load({ id : 'customsearch_wmsse_opentaskreceivingdata'});

		if (_isValueValid(getItemInternalId)) {
			searchObj.filters.push(search.createFilter({ name :'custrecord_wmsse_sku',
				operator: search.Operator.ANYOF,
				values: getItemInternalId
			}));
		}
		if (_isValueValid(getOrderInternalId)) {
			searchObj.filters.push(search.createFilter({ name :'custrecord_wmsse_order_no',
				operator: search.Operator.ANYOF,
				values: getOrderInternalId
			}));
		}
		if (_isValueValid(getOrderLineNo)) {
			searchObj.filters.push(search.createFilter({ name :'custrecord_wmsse_line_no',
				operator: search.Operator.EQUALTO,
				values: getOrderLineNo
			}));
		}
		if (_isValueValid(whLocation)) {
			searchObj.filters.push(search.createFilter({ name :'custrecord_wmsse_wms_location',
				operator: search.Operator.ANYOF,
				values: whLocation
			}));
		}
		searchObj.filters.push(search.createFilter({ name :'custrecord_wmsse_tasktype',
			operator: search.Operator.ANYOF,
			values: ['2']
		}));
		if (_isValueValid(lot)) {
			searchObj.filters.push(search.createFilter({ name :'custrecord_wmsse_batch_num',
				operator: search.Operator.IS,
				values: lot
			}));
		}
		searchObj.filters.push(search.createFilter({ name :'custrecord_wmsse_nsconfirm_ref_no',
			operator: search.Operator.ANYOF,
			values:['@NONE@']
		}));
		if(inventoryStatusFeature)
		{
			if (_isValueValid(fromStatusInternalId)) {
				searchObj.filters.push(search.createFilter({ name :'custrecord_wmsse_inventorystatus',
					operator: search.Operator.ANYOF,
					values: fromStatusInternalId
				}));
			}
		}

		var results = _getSearchResultInJSON(searchObj);

		log.debug({title:'results',details:results});

		return results;
	}

	function getPickTaskDetails(pickTaskDetails)
	{
		var getOrderInternalId = pickTaskDetails['orderInternalId'];
		var strLocation = pickTaskDetails["whLocationId"];
		var transactionType = pickTaskDetails["transactionType"];
		var pickTaskName = pickTaskDetails["pickTaskName"];

		var pickTaskSearch = search.load({id:'customsearch_wmsse_picktask_list'});
		var pickTaskFilters = pickTaskSearch.filters;
		if(_isValueValid(getOrderInternalId))
		{
			pickTaskFilters.push(search.createFilter({
				name:'internalid',
				join:'transaction',
				operator:search.Operator.ANYOF,
				values:getOrderInternalId}))
		}
		if(_isValueValid(pickTaskName))
		{
			pickTaskFilters.push(search.createFilter({
				name:'name',
				operator:search.Operator.EQUALTO,
				values:pickTaskName}))
		}
		if(_isValueValid(transactionType))
		{
			pickTaskFilters.push(search.createFilter({
				name:'type',
				join:'transaction',
				operator:search.Operator.IS,
				values:transactionType}))
		}

		if(_isValueValid(strLocation))
		{
			pickTaskFilters.push(search.createFilter({
				name:'location',
				operator:search.Operator.ANYOF,
				values:['@NONE@',strLocation]}));
		}

		pickTaskSearch.filters = pickTaskFilters;
		var	 objpicktaskSearchDetails = _getSearchResultInJSON(pickTaskSearch);
		log.debug({title:'pickTaskSearch',details:objpicktaskSearchDetails});

		return objpicktaskSearchDetails;

	}

	function getwavePickTaskDetails(pickTaskDetails)
	{
		var getWaveName = pickTaskDetails['waveName'];
		var strLocation = pickTaskDetails["whLocationId"];
		var transactionType = pickTaskDetails["transactionType"];
		var pickTaskName = pickTaskDetails["pickTaskName"];

		var pickTaskSearch = search.load({id:'customsearch_wms_multiorder_picktasklist'});
		var pickTaskFilters = pickTaskSearch.filters;
		if(_isValueValid(getWaveName))
		{
			pickTaskFilters.push(search.createFilter({
				name:'wavename',			
				operator:search.Operator.ANYOF,
				values:getWaveName}))
		}
		if(_isValueValid(pickTaskName))
		{
			pickTaskFilters.push(search.createFilter({
				name:'name',
				operator:search.Operator.EQUALTO,
				values:pickTaskName}))
		}


		if(_isValueValid(strLocation))
		{
			pickTaskFilters.push(search.createFilter({
				name:'location',
				operator:search.Operator.ANYOF,
				values:['@NONE@',strLocation]}));
		}

		pickTaskSearch.filters = pickTaskFilters;
		var	 objpicktaskSearchDetails = _getSearchResultInJSON(pickTaskSearch);
		log.debug({title:'pickTaskSearch',details:objpicktaskSearchDetails});

		return objpicktaskSearchDetails;

	}

	function getPickTaskDtlstoIncldAlreadyPickedOrders(pickTaskDetails)
	{
		log.debug({title:'getPickTaskDtlstoIncldAlreadyPickedOrders',details:pickTaskDetails});
		var getOrderInternalId = pickTaskDetails['orderInternalId'];
		var strLocation = pickTaskDetails["whLocationId"];
		var transactionType = pickTaskDetails["transactionType"];
		var pickTaskName = pickTaskDetails["pickTaskName"];
		var pickTaskSearch = search.load({id:'customsearch_wmsse_picktasklst_pickedord'});
		var pickTaskFilters = pickTaskSearch.filters;
		if(_isValueValid(getOrderInternalId))
		{
			pickTaskFilters.push(search.createFilter({
				name:'internalid',
				join:'transaction',
				operator:search.Operator.ANYOF,
				values:getOrderInternalId}))
		}
		if(_isValueValid(pickTaskName))
		{
			pickTaskFilters.push(search.createFilter({
				name:'name',
				operator:search.Operator.IS,
				values:pickTaskName}))
		}
		if(_isValueValid(transactionType))
		{
			pickTaskFilters.push(search.createFilter({
				name:'type',
				join:'transaction',
				operator:search.Operator.IS,
				values:transactionType}))
		}

		if(_isValueValid(strLocation))
		{
			pickTaskFilters.push(search.createFilter({
				name:'location',
				operator:search.Operator.ANYOF,
				values:['@NONE@',strLocation]}));
		}
		pickTaskSearch.filters = pickTaskFilters;
		var	 objpicktaskSearchDetails = _getSearchResultInJSON(pickTaskSearch);
		log.debug({title:'pickTaskSearch',details:objpicktaskSearchDetails});
		return objpicktaskSearchDetails;
	}
	function getPickingOrderDetails(orderParams)
	{
		var getOrderName = orderParams['orderName'];		
		var strLocation = orderParams["whLocationId"];
		var transactionType = orderParams["transactionType"];
		var orderSearch = '';

		if(transactionType == 'TrnfrOrd')
		{
			orderSearch = search.load({id:'customsearch_wmsse_toorders_list'});	
		}
		else
		{
			orderSearch = search.load({id:'customsearch_wmsse_orders_list'});	
		}

		var orderSearchFilters = orderSearch.filters;
		if(_isValueValid(getOrderName))
		{
			orderSearchFilters.push(search.createFilter({
				name:'tranid',
				join:'transaction',
				operator:search.Operator.IS,
				values:getOrderName}));
		}

		if(_isValueValid(strLocation))
		{
			orderSearchFilters.push(search.createFilter({
				name:'location',
				operator:search.Operator.ANYOF,
				values:['@NONE@',strLocation]}));
		}

		if(_isValueValid(transactionType))
		{
			orderSearchFilters.push(search.createFilter({
				name:'type',
				join:'transaction',
				operator:search.Operator.IS,
				values:transactionType}));
		}

		var currentUserID = runtime.getCurrentUser();	
		orderSearchFilters.push(search.createFilter({
			name:'picker',
			operator:search.Operator.ANYOF,
			values:['@NONE@',currentUserID.id]}));
		orderSearch.filters = orderSearchFilters;

		var	 objOrderSearchDetails = _getSearchResultInJSON(orderSearch);
		log.debug({title:'objOrderSearchDetails',details:objOrderSearchDetails});

		return objOrderSearchDetails;

	}

	function getItemList(itemText,whLocation){
		var itemcolumns= null;
		var filters = null;
		var itemSearch = search.load({
			id: 'customsearch_wmsse_inv_basic_itemdetails',
		});
		filters = itemSearch.filters;
		itemcolumns = itemSearch.columns;
		filters.push(search.createFilter({
			name : 'nameinternal',
			operator : search.Operator.IS,
			values : itemText
		}));
		itemcolumns.push(search.createColumn({
			name: 'isinactive'
		}));
		itemcolumns.push(search.createColumn({
			name: 'storedisplaythumbnail'
		}));
		itemcolumns.push(search.createColumn({
			name: 'unitstype'
		}));
		itemSearch.columns = itemcolumns;
		return _getSearchResultInJSON(itemSearch);
	}
	function _getSerialList(binInternalId,itemInternalId,warehouseLocationId,pickStatusInternalId,getSerialNoId)
	{
		var inventoryStatusFeature = isInvStatusFeatureEnabled();
		log.debug({title:'inventoryStatusFeature',details:inventoryStatusFeature});
		if (inventoryStatusFeature) {	

			log.debug({title:'pickStatusInternalId',details:pickStatusInternalId});
			log.debug({title:'binInternalId',details:binInternalId});
			log.debug({title:'warehouseLocationId',details:warehouseLocationId});
			log.debug({title:'itemInternalId',details:itemInternalId});
			var filters = [];

			var serialSearch = search.load({
				type : search.Type.INVENTORY_BALANCE,
				id: 'customsearch_wmsse_serial_details',
			});

			filters = serialSearch.filters;
			if(_isValueValid(itemInternalId))
			{
				filters.push(search.createFilter({
					name : 'item',
					operator : search.Operator.ANYOF,
					values : itemInternalId
				}));
			}
			if(_isValueValid(binInternalId))
			{
				filters.push(search.createFilter({
					name : 'binnumber',					
					operator : search.Operator.ANYOF,
					values : binInternalId
				}));
			}
			if(_isValueValid(warehouseLocationId))
			{
				filters.push(search.createFilter({
					name : 'location',					
					operator : search.Operator.ANYOF,
					values : warehouseLocationId
				}));
			}
			if(_isValueValid(pickStatusInternalId))
			{
				filters.push(search.createFilter({
					name : 'status',					
					operator : search.Operator.ANYOF,
					values : pickStatusInternalId
				}));
			}
			if(_isValueValid(getSerialNoId))
			{
				filters.push(search.createFilter({
					name : 'inventorynumber',					
					operator : search.Operator.ANYOF,
					values : getSerialNoId
				}));
			}
			serialSearch.filters = filters;


		}
		else
		{


			var filters = [];

			var serialSearch = search.load({
				id: 'customsearch_wms_serial_list',
			});

			filters = serialSearch.filters;
			if(_isValueValid(itemInternalId))
			{
				filters.push(search.createFilter({
					name : 'internalid',
					operator : search.Operator.ANYOF,
					values : itemInternalId
				}));
			}
			if(_isValueValid(binInternalId))
			{
				filters.push(search.createFilter({
					name : 'binnumber',
					join : 'inventorynumberbinonhand',
					operator : search.Operator.ANYOF,
					values : binInternalId
				}));
			}
			if(_isValueValid(warehouseLocationId))
			{
				filters.push(search.createFilter({
					name : 'location',
					join : 'inventorynumberbinonhand',
					operator : search.Operator.ANYOF,
					values : warehouseLocationId
				}));
			}
			if(_isValueValid(getSerialNoId))
			{
				filters.push(search.createFilter({
					name : 'inventorynumber',
					join : 'inventorynumberbinonhand',
					operator : search.Operator.IS,
					values : getSerialNoId
				}));
			}
			serialSearch.filters = filters;
		}
		return  _getSearchResultInJSON(serialSearch);
	}
	function getReplenItemsList(warehouseLocationId,itemInternalId,toBinInternalId,currentUserId,recordInternalId)
	{

		var replentaskDetailsSearch = search.load({id:'customsearch_wmsse_rpln_getopentask_srh'});
		var replenFilters = replentaskDetailsSearch.filters;

		if (_isValueValid(warehouseLocationId)) {

			replenFilters.push(search.createFilter({
				name :'custrecord_wmsse_wms_location',
				operator: search.Operator.ANYOF,
				values:  warehouseLocationId
			}));
		}
		if (_isValueValid(itemInternalId)) {

			replenFilters.push(search.createFilter({
				name :'custrecord_wmsse_sku',
				operator: search.Operator.ANYOF,
				values:  itemInternalId
			}));
		}
		if (_isValueValid(toBinInternalId)) {

			replenFilters.push(search.createFilter({
				name :'custrecord_wmsse_actendloc',
				operator: search.Operator.ANYOF,
				values:  toBinInternalId
			}));
		}

		if (_isValueValid(recordInternalId)) {

			replenFilters.push(search.createFilter({
				name :'internalid',
				operator: search.Operator.ANYOF,
				values:  recordInternalId
			}));
		}

		replenFilters.push(search.createFilter({
			name :'custrecord_wmsse_task_assignedto',
			operator: search.Operator.ANYOF,
			values:  ['@NONE@',currentUserId]
		}));


		replentaskDetailsSearch.filters = replenFilters;
		var replenOpenTaskDetails = _getSearchResultInJSON(replentaskDetailsSearch);
		return replenOpenTaskDetails;		
	}

	function getReplenItemSearch(itemInternalId,warehouseLocationId)
	{

		var replenItemDetailsSearch = search.load({id:'customsearch_wmsse_rpln_item_srh'});
		var replenFilters = replenItemDetailsSearch.filters;

		if (_isValueValid(itemInternalId)) {

			replenFilters.push(search.createFilter({
				name :'internalid',
				operator: search.Operator.ANYOF,
				values:  itemInternalId
			}));
		}
		if (_isValueValid(warehouseLocationId)) {

			replenFilters.push(search.createFilter({
				name :'location',
				operator: search.Operator.ANYOF,
				values:  ['@NONE@', warehouseLocationId]
			}));

			replenFilters.push(search.createFilter({
				name :'location',
				join: 'binnumber',
				operator: search.Operator.ANYOF,
				values:  ['@NONE@', warehouseLocationId]
			}));


		}

		replenItemDetailsSearch.filters = replenFilters;
		var replenItemDetails = _getSearchResultInJSON(replenItemDetailsSearch);
		return replenItemDetails;

	}
	function getCyclePlanTaskDetails(planId, whLocationId, binName, itemInternalId, hideCompletedTaks,reconcilecountZeroqty,noBinExcepforReconcile){

		var getCycPlanTasks = search.load({
			id: 'customsearch_wms_cyc_plan_task_list'
		});

		getCycPlanTasks.filters.push(
				search.createFilter({
					name: 'tranid',
					operator: search.Operator.IS,
					values:  planId
				}));
		if(_isValueValid(whLocationId))
			getCycPlanTasks.filters.push(
					search.createFilter({
						join : 'binnumber',
						name: 'location',
						operator: search.Operator.IS,
						values:  whLocationId
					}));
		if(_isValueValid(hideCompletedTaks))
			getCycPlanTasks.filters.push(
					search.createFilter({
						name: 'quantity',
						operator: search.Operator.ISEMPTY,
					}));
		if(_isValueValid(noBinExcepforReconcile))
			getCycPlanTasks.filters.push(
					search.createFilter({
						name: 'quantity',
						operator: search.Operator.ISEMPTY,
					}));
		if(_isValueValid(reconcilecountZeroqty))
			getCycPlanTasks.filters.push(
					search.createFilter({
						name: 'quantity',
						operator: search.Operator.ISNOTEMPTY,
					}));
		if(_isValueValid(binName)){
			getCycPlanTasks.filters.push(
					search.createFilter({
						name: 'binnumber',
						join : 'binnumber',
						operator: search.Operator.IS,
						values:  binName
					}));
		}
		if(_isValueValid(itemInternalId))
			getCycPlanTasks.filters.push(
					search.createFilter({
						name: 'item',
						operator: search.Operator.ANYOF,
						values:  itemInternalId
					}));

		return _getSearchResultInJSON(getCycPlanTasks);
	}
	function getAllOpentaskOpenPutwayOrderDetails(whLocation,transactionType,itemInternalId) {


		var opentaskArr = [];
		var filterStrat = [];
		filterStrat.push(search.createFilter({
			name: 'custrecord_wmsse_nsconfirm_ref_no',
			operator: search.Operator.ANYOF,
			values: ['@NONE@']
		}));
		if (_isValueValid(whLocation))
		{
			filterStrat.push(search.createFilter({
				name: 'custrecord_wmsse_wms_location',
				operator: search.Operator.ANYOF,
				values: whLocation
			}));
		}
		if (_isValueValid(itemInternalId))
		{
			filterStrat.push(search.createFilter({
				name:'item',
				join: 'custrecord_wmsse_order_no',
				operator: search.Operator.ANYOF,
				values:itemInternalId}));

		}
		var savedSearch ="customsearch_wmsse_openputaway_orders";
		if(transactionType=='transferorder')
		{
			savedSearch ="customsearch_wmsse_openputaway_orders_to";
		}

		var objOpentaskDetailsSearch = search.load({id: savedSearch});
		var savedFilter = objOpentaskDetailsSearch.filters ;
		objOpentaskDetailsSearch.filters = savedFilter.concat(filterStrat);
		var objOPentaskDetails = _getSearchResultInJSON(objOpentaskDetailsSearch);

		var overageReceiveEnabled = false;
		if(transactionType != 'transferorder')
		{
			overageReceiveEnabled = _getPoOverage(transactionType);
		}


		if (objOPentaskDetails != null &&  objOPentaskDetails.length > 0) {
			var orderInternalIdArray = new Array();

			for (var objOPentask in objOPentaskDetails) {
				var opentaskRec = objOPentaskDetails[objOPentask];
				var poId = opentaskRec['internalid'];
				var erpReceivedQuantity = 0;
				var transactionLineCount = opentaskRec['Transaction Line Count'];
				var opentaskQuantity = opentaskRec['OpenTask Quantity'];
				var orderQuantity = opentaskRec['quantityuom'];
				var erpReceivedQuantity = opentaskRec['totalReceivedQty'];								

				if(transactionType=="returnauthorization")
				{
					if(parseInt(orderQuantity)<0)
						orderQuantity=Big(orderQuantity).mul(-1);


				}				

				if(!_isValueValid(erpReceivedQuantity))
				{
					erpReceivedQuantity = 0;
				}
				if(!_isValueValid(opentaskQuantity))
				{
					opentaskQuantity = 0;
				}

				if(transactionLineCount > 0)
				{
					//isLinesToReceive = Number(Big(orderQuantity).minus(Big(opentaskQuantity)));
					isLinesToReceive = Number(Big(orderQuantity).minus(Big(opentaskQuantity).plus(erpReceivedQuantity)));
				}

				if((isLinesToReceive == 0) || ((isLinesToReceive<=0) &&(overageReceiveEnabled ==true )))
				{
					if(opentaskArr.indexOf(poId)== -1)
					{
						opentaskArr.push(poId);
					}
				}
				else 
				{
					if(orderInternalIdArray.indexOf(poId)== -1)
					{
						orderInternalIdArray.push(poId);
					}					
				}

			}
			log.debug({title:'opentaskArr before remove',details:opentaskArr});
			log.debug({title:'orderInternalIdArray',details:orderInternalIdArray});
			if((_isValueValid(opentaskArr)) && (_isValueValid(orderInternalIdArray)))
			{
				for( var intItr = 0;intItr <orderInternalIdArray.length;intItr++)
				{
					var orderId =orderInternalIdArray[intItr]
					if(opentaskArr.indexOf(orderId)!= -1)
					{

						var arrIndex = opentaskArr.indexOf(orderId);						
						if (arrIndex > -1)
							opentaskArr.splice(arrIndex, 1);
					}
				}
			}
		}
		log.debug({title:'opentaskArr1',details:opentaskArr});
		return opentaskArr;
	}
	function getOPenTaskPickBinDetailsSerialbyStatus(vItemId,vBinArray,whLocation,vUnitType,StockUnitText,vStatus)
	{
		var vPickBinDetailsArr = [];
		var vPickBinIdArr =[];
		var vPickBinTextArr = [];
		var vPickBinQtyArr = [];
		var vPickBinSerialArr = [];
		var vPickBinExpArr = [];
		var conversionRate =1;
		var filterArr=[];
		var serialSearch = search.load({
			id: 'customsearch_wmsse_serbystat_openpickbin',
		});
		var filterArr = serialSearch.filters;
		if(_isValueValid(vItemId))
		{
			filterArr.push(search.createFilter({
				name: 'custrecord_wmsse_sku',
				operator: search.Operator.ANYOF,
				values: vItemId
			}));
		}
		if(_isValueValid(vBinArray))
		{
			filterArr.push(search.createFilter({
				name: 'custrecord_wmsse_actendloc',
				operator: search.Operator.ANYOF,
				values: vBinArray
			}));
		}
		if(_isValueValid(whLocation))
		{
			filterArr.push(search.createFilter({
				name: 'custrecord_wmsse_wms_location',
				operator: search.Operator.ANYOF,
				values: whLocation
			}));
		}
		if(_isValueValid(vStatus))
		{
			filterArr.push(search.createFilter({
				name: 'custrecord_wmsse_inventorystatus',
				operator: search.Operator.ANYOF,
				values: vStatus
			}));
		}
		filterArr.push(search.createFilter({
			name: 'status',
			join : 'custrecord_wmsse_order_no' ,
			operator: search.Operator.ANYOF,
			values:  ['SalesOrd:B','SalesOrd:D','SalesOrd:E','TrnfrOrd:B','TrnfrOrd:D','TrnfrOrd:E','WorkOrd:B','WorkOrd:D']
		}));
		serialSearch.filters = filterArr;
		var vOpenTaskDetails =_getSearchResultInJSON(serialSearch);
		if(_isValueValid(StockUnitText) && StockUnitText!='- None -')
		{
			conversionRate = getOpenTaskStockCoversionRate(vUnitType,StockUnitText);
		}
		if(vOpenTaskDetails.length > 0)
		{ 
			var pickDetailSrch = search.load({
				id: 'customsearch_wmsse_pickdetail_statuswise'
			});
			for(var i=0;i<filterArr.length;i++){
				pickDetailSrch.filters.push(filterArr[i]);
			}
			var objOpenTaskDetails = _getSearchResultInJSON(pickDetailSrch);
			for(var z=0; z < objOpenTaskDetails.length ; z++)
			{
				var KitFlag = objOpenTaskDetails[z]['custrecord_wmsse_kitflag'];
				var vPickQty = 0;
				if(KitFlag == 'T')
					vPickQty = objOpenTaskDetails[z]['custrecord_wmsse_expe_qty'];
				else
					vPickQty = objOpenTaskDetails[z]['custrecord_wmsse_act_qty'];
				var vPickBeginLocId = objOpenTaskDetails[z]['custrecord_wmsse_actendloc'];
				var vPickBeginLocText = objOpenTaskDetails[z]['custrecord_wmsse_actendlocText'];
				var vPickBeginLocSerial = objOpenTaskDetails[z]['custrecord_wmsse_serial_no'];
				var vPickBeginLocExpDate = objOpenTaskDetails[z]['custrecord_wmsse_expirydate'];
				var vPickConversionRate = objOpenTaskDetails[z]['custrecord_wmsse_conversionrate'];
				if(!(_isValueValid(vPickConversionRate))|| vPickConversionRate == '- None -')
					vPickConversionRate=1;
				if(!(_isValueValid(vPickQty)) || vPickQty == '- None -' )
					vPickQty=0;
				if(vPickBinIdArr.indexOf(vPickBeginLocId) == -1)
				{
					vPickBinIdArr.push(vPickBeginLocId);
					vPickBinTextArr.push(vPickBeginLocText);
					vPickBinQtyArr.push(vPickQty * (parseFloat(vPickConversionRate)/parseFloat(conversionRate)));
					vPickBinSerialArr.push(vPickBeginLocSerial);
				}
				else
				{
					if(vPickBinIdArr.length > 0 && vPickBinIdArr.indexOf(vPickBeginLocId) != -1)
					{
						var ind = vPickBinIdArr.indexOf(vPickBeginLocId);
						var tempQty = vPickBinQtyArr[ind];
						var tempSerial = vPickBinSerialArr[ind];
						var totalSerial = tempSerial +","+vPickBeginLocSerial;
						var totalLotQty = parseFloat(tempQty)+(vPickQty * (parseFloat(vPickConversionRate)/parseFloat(conversionRate)));
						vPickBinQtyArr[ind] = totalLotQty;
						vPickBinSerialArr[ind] = totalSerial;
					}
					else
					{
						vPickBinIdArr.push(vPickBeginLocId);
						vPickBinTextArr.push(vPickBeginLocText);
						vPickBinQtyArr.push(vPickQty * (parseFloat(vPickConversionRate)/parseFloat(conversionRate)));
						vPickBinSerialArr.push(vPickBeginLocSerial);
					}
				}
			}
			vPickBinDetailsArr.push(vPickBinIdArr,vPickBinQtyArr,vPickBinTextArr,vPickBinSerialArr);
		}
		objOpenTaskDetails = null;
		return vPickBinDetailsArr;
	}
	function inventoryCountPosting(planInternalId,planLineNo,enterQty,itemType,itemId,whLocation,vBinOpenTaskDetails,
			serialStatusArr,binlocationid,VUnitType,uom, zeroQty)
	{
		var recId = '';
		var compSubRecord='';
		var	invDtlSubRecord = '';
		try
		{
			var inventoryStatusFeature = isInvStatusFeatureEnabled();
			var vInvRec = record.load({type:'inventorycount',
				id:planInternalId
			});
			var lineNo = (((parseInt(planLineNo)+2)/3)-1);
			vInvRec.setSublistValue({
				sublistId:		'item',
				fieldId:  'countquantity',
				line : lineNo,
				value: enterQty
			});
			vInvRec.setSublistValue({
				sublistId:		'item',
				fieldId:  'location',
				line : lineNo,
				value: whLocation
			});
			if(zeroQty == 'zeroQty'){
				recId=vInvRec.save();
				return recId;
			}
			else if(itemType == "serializedinventoryitem" || itemType=="serializedassemblyitem")
			{
				var vBinOpenTaskSerialArr = [];
				var vBinOpenTaskBinIdArr = [];
				var vBinOpenTaskBinQtyArr = [];
				var serialArray='';
				var statusArray='';
				var openTaskSrch = search.load({
					id: 'customsearch_wmsse_opentask_search'
				});
				openTaskSrch.filters.push(
						search.createFilter({
							name: 'custrecord_wmsse_order_no',
							operator: search.Operator.ANYOF,
							values:  planInternalId
						}));
				openTaskSrch.filters.push(
						search.createFilter({
							name: 'custrecord_wmsse_line_no',
							operator: search.Operator.EQUALTO,
							values:  planLineNo
						}));
				openTaskSrch.filters.push(
						search.createFilter({
							name: 'custrecord_wmsse_parent_sku_no',
							operator: search.Operator.ANYOF,
							values:  itemId
						}));
				openTaskSrch.filters.push(
						search.createFilter({
							name: 'custrecord_wmsse_currentdate',
							operator: search.Operator.ISEMPTY,
						}));
				if(inventoryStatusFeature == true){
					openTaskSrch.columns.push(
							search.createColumn({
								name: 'custrecord_wmsse_serial_no'
							}));
					openTaskSrch.columns.push(
							search.createColumn({
								name: 'custrecord_wmsse_actendloc'
							}));
					openTaskSrch.columns.push(
							search.createColumn({
								name: 'custrecord_wmsse_inventorystatus'
							}));
				}
				var SrchRecordTmpSerial1 =  _getSearchResultInJSON(openTaskSrch);

				if(_isValueValid(SrchRecordTmpSerial1))
				{
					invDtlSubRecord = vInvRec.getSublistSubrecord({
						sublistId : 'item',
						fieldId: 'countdetail',
						line : lineNo
					});
					if(_isValueValid(invDtlSubRecord))
					{

						var complinelength = invDtlSubRecord.getLineCount({
							sublistId:'inventorydetail'
						});
						if(parseInt(complinelength)>0)
						{
							for(var r1=0;r1<complinelength;r1++)
							{ 
								invDtlSubRecord.removeLine({
									sublistId : 'inventorydetail',
									line : 0
								});
							}
						}

					}
					if(inventoryStatusFeature == true){
						for(var statsItr=0;statsItr<serialStatusArr.length;statsItr++)
						{  
							serialArray ='';
							statusArray = serialStatusArr[statsItr];
							for (var n = 0; n < SrchRecordTmpSerial1.length; n++) {
								statusArr=SrchRecordTmpSerial1[n]['custrecord_wmsse_inventorystatus'];
								if(statusArray==statusArr)
								{
									if(!(_isValueValid(serialArray)))
									{
										serialArray=SrchRecordTmpSerial1[n]['custrecord_wmsse_serial_no'];
									}
									else
									{
										serialArray=serialArray+","+SrchRecordTmpSerial1[n]['custrecord_wmsse_serial_no'];
									}
								}
							}

							var totalSerialArray=serialArray.split(',');

							if(!(_isValueValid(invDtlSubRecord)))
							{
								invDtlSubRecord = vInvRec.getSublistSubrecord({
									sublistId	:'item',
									fieldId : 'countdetail',
									line : lineNo
								});

								var complinelength =invDtlSubRecord.getLineCount({
									sublistId:'inventorydetail'
								});
								log.debug( 'invDtlSubRecord of lot item new--', invDtlSubRecord);
								if(parseInt(complinelength)>0)
								{
									for(var r1=0;r1<complinelength;r1++)
									{
										log.debug( 'r1 of inventory lot new--', r1);
										compSubRecord.removeLine({
											sublistId : 'inventorydetail',
											line : 0
										});
									}
								}
							}
							for (var k = 0; k < totalSerialArray.length; k++) {
								invDtlSubRecord.insertLine({
									sublistId:	'inventorydetail',
									line : k
								});
								invDtlSubRecord.setSublistValue({
									sublistId : 'inventorydetail',
									fieldId : 'quantity', 
									line : k,
									value : 1
								});
								invDtlSubRecord.setSublistValue({
									sublistId : 'inventorydetail',
									fieldId : 'inventorynumber', 
									line : k,
									value : totalSerialArray[k]
								});
								invDtlSubRecord.setSublistValue({
									sublistId : 'inventorydetail',
									fieldId : 'inventorystatus', 
									line : k,
									value : statusArray
								});
							}
						}
					}
					else
					{	
						for (var n = 0; n < SrchRecordTmpSerial1.length; n++) {
							if(!(_isValueValid(serialArray)))
							{
								serialArray=SrchRecordTmpSerial1[n]['custrecord_wmsse_serial_no'];
							}
							else
							{
								serialArray=serialArray+","+SrchRecordTmpSerial1[n]['custrecord_wmsse_serial_no'];
							}
						}
						log.error({title:'in non inv serialArray',details:serialArray});
						var totalSerialArray=serialArray.split(',');

						if(!(_isValueValid(invDtlSubRecord))) 
						{
							invDtlSubRecord = vInvRec.getSublistSubrecord({
								sublistId	:'item',
								fieldId : 'countdetail',
								line : lineNo
							}); 
						}
						for (var k = 0; k < totalSerialArray.length; k++) {
							invDtlSubRecord.insertLine({
								sublistId:	'inventorydetail',
								line :k
							});
							invDtlSubRecord.setSublistValue({
								sublistId : 'inventorydetail',
								fieldId : 'quantity', 
								line :k,
								value : 1
							});
							invDtlSubRecord.setSublistValue({
								sublistId : 'inventorydetail',
								fieldId : 'inventorynumber', 
								line :k,
								value : totalSerialArray[k]
							});

						}

					}
				}
			}
			else if (itemType == "lotnumberedinventoryitem" || itemType=="lotnumberedassemblyitem")
			{

				var serialEntrySrch = search.load({
					id: 'customsearch_wmsse_serialentry_details'
				});

				serialEntrySrch.filters.push(
						search.createFilter({
							name: 'custrecord_wmsse_ser_status',
							operator: search.Operator.IS,
							values:  'F'
						}));
				serialEntrySrch.filters.push(
						search.createFilter({
							name: 'custrecord_wmsse_ser_ordline',
							operator: search.Operator.EQUALTO,
							values:  planLineNo
						}));
				serialEntrySrch.filters.push(
						search.createFilter({
							name: 'custrecord_wmsse_ser_ordno',
							operator: search.Operator.ANYOF,
							values:  planInternalId
						}));
				serialEntrySrch.columns.push(
						search.createColumn({
							name: 'custrecord_wmsse_ser_bin'
						}));
				serialEntrySrch.columns.push(
						search.createColumn({
							name: 'custrecord_wmsse_ser_qty'
						}));
				if(inventoryStatusFeature == true)
					serialEntrySrch.columns.push(
							search.createColumn({
								name: 'custrecord_serial_inventorystatus'
							}));

				var SrchRecordTmpLot1 =  _getSearchResultInJSON(serialEntrySrch);



				compSubRecord = vInvRec.getSublistSubrecord({
					sublistId    :'item',
					fieldId : 'countdetail',
					line : lineNo
				});     
				log.debug('compSubRecord 1111---',compSubRecord);
				var complinelength =compSubRecord.getLineCount({
					sublistId:'inventorydetail'
				});
				log.debug( 'compSubRecord of lot item new--', compSubRecord);
				if(parseInt(complinelength)>0)
				{
					for(var r1=0;r1<complinelength;r1++)
					{
						log.debug( 'r1 of inventory item new--', r1);
						compSubRecord.removeLine({
							sublistId : 'inventorydetail',
							line : 0
						});
					}
				}

				if(_isValueValid(SrchRecordTmpLot1 ))
				{
					for (var n = 0; n < SrchRecordTmpLot1.length; n++) {

						if(!(_isValueValid(invDtlSubRecord)))
						{
							invDtlSubRecord = vInvRec.getSublistSubrecord({
								sublistId	:'item',
								fieldId : 'countdetail',
								line : lineNo
							}); 	
						}

						invDtlSubRecord.insertLine({
							sublistId:	'inventorydetail',
							line : n
						});
						invDtlSubRecord.setSublistValue({
							sublistId : 'inventorydetail',
							fieldId : 'quantity', 
							line : n,
							value : SrchRecordTmpLot1[n]['custrecord_wmsse_ser_qty']
						});
						invDtlSubRecord.setSublistValue({
							sublistId : 'inventorydetail',
							fieldId : 'inventorynumber', 
							line : n,
							value : SrchRecordTmpLot1[n]['custrecord_wmsse_ser_no']
						});
						if(inventoryStatusFeature == true)
							invDtlSubRecord.setSublistValue({
								sublistId : 'inventorydetail',
								fieldId : 'inventorystatus', 
								line : n,
								value : SrchRecordTmpLot1[n]['custrecord_serial_inventorystatus']
							});


					}
				}

			}
			else if (itemType == "inventoryitem" || itemType=="assemblyitem")
			{
				if(inventoryStatusFeature == true)
				{
					var serialEntrySrch = search.load({
						id: 'customsearch_wmsse_serialdetails_search'
					});

					serialEntrySrch.filters.push(
							search.createFilter({
								name: 'custrecord_wmsse_ser_status',
								operator: search.Operator.IS,
								values:  'F'
							}));
					serialEntrySrch.filters.push(
							search.createFilter({
								name: 'custrecord_wmsse_ser_ordline',
								operator: search.Operator.EQUALTO,
								values:  planLineNo
							}));
					serialEntrySrch.filters.push(
							search.createFilter({
								name: 'custrecord_wmsse_ser_ordno',
								operator: search.Operator.ANYOF,
								values:  planInternalId
							}));
					serialEntrySrch.filters.push(
							search.createFilter({
								name: 'custrecord_wmsse_ser_item',
								operator: search.Operator.ANYOF,
								values:  itemId
							}));

					var SrchRecordTmpInv =  _getSearchResultInJSON(serialEntrySrch);

					/*var hasSubrecord = vInvRec.hasSublistSubrecord({
						sublistId: 'item',
						fieldId: 'countdetail',
						line: lineNo
					});

					if(hasSubrecord){
						vInvRec = vInvRec.removeSublistSubrecord({
							sublistId: 'item',
							fieldId: 'countdetail',
							line: lineNo
						});
					}*/


					invDtlSubRecord = vInvRec.getSublistSubrecord({
						sublistId	:'item',
						fieldId : 'countdetail',
						line : lineNo
					}); 	 
					var complinelength =invDtlSubRecord.getLineCount({
						sublistId:'inventorydetail'
					});
					log.debug( 'compSubRecord of inventory item new--', compSubRecord);
					if(parseInt(complinelength)>0)
					{
						for(var r1=0;r1<complinelength;r1++)
						{
							log.debug( 'r1 of inventory item new--', r1);
							invDtlSubRecord.removeLine({
								sublistId : 'inventorydetail',
								line : 0
							});
						}
					}


					if(_isValueValid(SrchRecordTmpInv ))
					{
						for (var invInvCount = 0; invInvCount < SrchRecordTmpInv.length; invInvCount++) {
							invDtlSubRecord.insertLine({
								sublistId:	'inventorydetail',
								line : invInvCount
							});
							invDtlSubRecord.setSublistValue({
								sublistId : 'inventorydetail',
								fieldId : 'quantity', 
								line : invInvCount,
								value : SrchRecordTmpInv[invInvCount]['custrecord_wmsse_ser_qty'],
							});
							invDtlSubRecord.setSublistValue({
								sublistId : 'inventorydetail',
								fieldId : 'inventorystatus', 
								line : invInvCount,
								value :SrchRecordTmpInv[invInvCount]['custrecord_serial_inventorystatus']
							});
						}
					}
				}
			}	
			recId=vInvRec.save();	
		}
		catch(e)
		{
			recId = 'INVALID_KEY_OR_REF';
			log.debug('e',e);
		}
		return recId;

	} 
	function createSerialEntry(lotName, cyclePlanInternalId, lineNum, itemInternalId, binInternalId, scannedQuantity, statusInternalId, inventoryStatusFeature){
		var objRecord = record.create({
			type : 'customrecord_wmsse_serialentry'
		});
		objRecord.setValue({
			fieldId : 'name',
			value : lotName
		});
		objRecord.setValue({
			fieldId : 'custrecord_wmsse_ser_ordno',
			value : cyclePlanInternalId
		});
		objRecord.setValue({
			fieldId : 'custrecord_wmsse_ser_ordline',
			value : lineNum
		});
		objRecord.setValue({
			fieldId : 'custrecord_wmsse_ser_item',
			value : itemInternalId
		});
		objRecord.setValue({
			fieldId : 'custrecord_wmsse_ser_bin',
			value : binInternalId
		});
		objRecord.setValue({
			fieldId : 'custrecord_wmsse_ser_qty',
			value : scannedQuantity
		});
		objRecord.setValue({
			fieldId : 'custrecord_wmsse_ser_no',
			value : lotName
		});
		objRecord.setValue({
			fieldId : 'custrecord_wmsse_ser_status',
			value : false
		});
		if(inventoryStatusFeature)
			objRecord.setValue({
				fieldId : 'custrecord_serial_inventorystatus',
				value : statusInternalId
			});
		log.debug('statusInternalId',statusInternalId);
		log.debug('create serial entry end','create serial entry end ');
		return objRecord.save();
	}
	function updateCycleCountOpenTask(cyclePlanInternalId, itemInternalId, lineNum, scannedQty,
			binInternalId, itemType, warehouseLocationId, batchno, inventoryCountRecId, cyclePlanId, actualBeginTime,
			units, conversionRate, vOpenBinQty,vBinOpenTaskSerialArr,status){

		var inventoryStatusFeature = isInvStatusFeatureEnabled();

		var objRecord = record.create({
			type : 'customrecord_wmsse_trn_opentask',
		});
		if(_isValueValid(cyclePlanId))
			objRecord.setValue({
				fieldId : 'name',
				value : cyclePlanId
			});
		var parsedCurrentDate = format.parse({
			value: DateStamp(),
			type: format.Type.DATE
		});
		objRecord.setValue({
			fieldId : 'custrecord_wmsse_act_begin_date',
			value : parsedCurrentDate
		});
		objRecord.setValue({
			fieldId : 'custrecord_wmsse_act_end_date',
			value : parsedCurrentDate
		});
		objRecord.setValue({
			fieldId : 'custrecord_wmsse_act_qty',
			value : scannedQty
		});
		if(_isValueValid(vOpenBinQty)){
			if(itemType != "lotnumberedinventoryitem" && itemType !="lotnumberedassemblyitem")
				objRecord.setValue({
					fieldId : 'custrecord_wmsse_act_qty',
					value : (parseFloat(scannedQty)+parseFloat(vOpenBinQty)).toFixed(8)
				});
			var vNotes="System is added "+vOpenBinQty+" qty because this qty is picked from bin location but item fulfillment is not yet posted";
			objRecord.setValue({
				fieldId : 'custrecord_wmsse_notes',
				value : vNotes
			});
		}
		objRecord.setValue({
			fieldId : 'custrecord_wmsse_sku',
			value : itemInternalId
		});
		objRecord.setValue({
			fieldId : 'custrecord_wmsse_line_no',
			value : lineNum
		});
		objRecord.setValue({
			fieldId : 'custrecord_wmsse_expe_qty',
			value : scannedQty
		});
		objRecord.setValue({
			fieldId : 'custrecord_wmsse_wms_status_flag',
			value : 31                          
		});
		objRecord.setValue({
			fieldId : 'custrecord_wmsse_tasktype',
			value : 7                          
		});
		if(_isValueValid(binInternalId))
			objRecord.setValue({
				fieldId : 'custrecord_wmsse_actendloc',
				value : binInternalId                          
			});
		if(_isValueValid(units))
			objRecord.setValue({
				fieldId : 'custrecord_wmsse_uom',
				value : units                          
			});
		if(_isValueValid(conversionRate))
			objRecord.setValue({
				fieldId : 'custrecord_wmsse_conversionrate',
				value : conversionRate                          
			});		
		if(_isValueValid(status))
			objRecord.setValue({
				fieldId : 'custrecord_wmsse_inventorystatus',
				value : status                          
			});	
		if (itemType == "lotnumberedinventoryitem" || itemType=="lotnumberedassemblyitem") {
			if(_isValueValid(batchno)){
				objRecord.setValue({
					fieldId : 'custrecord_wmsse_batch_num',
					value : batchno                          
				});	
				var lotInternalId = getLotInternalId(batchno);
				if(_isValueValid(lotInternalId)){
					var lotDetails = search.lookupFields({
						type : search.Type.INVENTORY_NUMBER,
						id : lotInternalId,
						columns : ['inventorynumber','expirationdate']
					});
					var expDate = lotDetails['expirationdate'];
					log.debug('expDate',expDate);
					if(_isValueValid(expDate))
						objRecord.setValue({
							fieldId : 'custrecord_wmsse_expirydate',
							value : expDate                          
						});	
				}
			}
		}
		if(itemType == "serializedinventoryitem" || itemType=="serializedassemblyitem"){
			//if(inventoryStatusFeature == true){
			var vPickStatusIdArr = new Array();
			var SrchRecordTmpSerial1 = [];
			var serialArray = '';
			if(inventoryStatusFeature == true){
				SrchRecordTmpSerial1 = fnGetAllSerialsbyStatus(cyclePlanInternalId, lineNum, status, SrchRecordTmpSerial1);
			}else{
				SrchRecordTmpSerial1 = getAllSerials(cyclePlanInternalId,lineNum);
			}
			if(SrchRecordTmpSerial1.length > 0){
				/*var objRecord = record.create({
					type : 'customrecord_wmsse_throwaway_parent'
				});
				var serialparentid = objRecord.submit();

				var serialparent = record.load({
					type : 'customrecord_wmsse_throwaway_parent', 
					id : serialparentid
				});*/

				for(var i in SrchRecordTmpSerial1){
					if(_isValueValid(serialArray))
					{
						serialArray = serialArray+","+SrchRecordTmpSerial1[i]['custrecord_wmsse_ser_no'];
					}
					else
					{
						serialArray = SrchRecordTmpSerial1[i]['custrecord_wmsse_ser_no'];
					}


					var notes = "because of serial number is updated in opentask we have marked this serial number as closed";

					closeSerialEntryStatusCycleCount(SrchRecordTmpSerial1[i],notes);

				}
				//serialparent.save();
				log.debug('vBinOpenTaskSerialArr',vBinOpenTaskSerialArr);
				if(_isValueValid(vBinOpenTaskSerialArr)){
					for(var z in vBinOpenTaskSerialArr){
						/*if(_isValueValid(serialArray)){
								//if(serialArray.indexOf(vBinOpenTaskSerialArr[z]) == -1)
									serialArray=vBinOpenTaskSerialArr[z];
							}else{
								if(serialArray.indexOf(vBinOpenTaskSerialArr[z]) == -1)
									serialArray = serialArray+","+vBinOpenTaskSerialArr[z];
							}*/
						if(serialArray == ''){
							serialArray=vBinOpenTaskSerialArr[z];
						}else{
							serialArray = serialArray+","+vBinOpenTaskSerialArr[z];
						}
					}
				}
				objRecord.setValue({
					fieldId : 'custrecord_wmsse_serial_no',
					value : serialArray
				});
			}else{
				if(_isValueValid(vBinOpenTaskSerialArr)){
					for(var i in vBinOpenTaskSerialArr){
						/*if(_isValueValid(serialArray)){
								if(serialArray.indexOf(vBinOpenTaskSerialArr[z]) == -1)
									serialArray=vBinOpenTaskSerialArr[z];
							}else{
								if(serialArray.indexOf(vBinOpenTaskSerialArr[z]) == -1)
									serialArray = serialArray+","+vBinOpenTaskSerialArr[z];
							}*/
						if(serialArray == ''){
							serialArray=vBinOpenTaskSerialArr[z];
						}else{
							serialArray = serialArray+","+vBinOpenTaskSerialArr[z];
						}
					}
				}
				objRecord.setValue({
					fieldId : 'custrecord_wmsse_serial_no',
					value : serialArray
				});
			}
			SrchRecordTmpSerial1=null;
			columnssertemp1=null;
			filterssertemp1=null;
			//}
			/*else{
				var SrchRecordTmpSerial1=getAllSerials(cyclePlanInternalId,poLineno);
				var serialArray = '';
				if(SrchRecordTmpSerial1.length > 0){
					var objRecord = record.create({
						type : 'customrecord_wmsse_throwaway_parent'
					});
					var serialparentid = objRecord.submit();

					var serialparent = record.load({
						type : 'customrecord_wmsse_throwaway_parent', 
						id : serialparentid
					});
				}
			}*/
		}

		objRecord.setValue({
			fieldId : 'custrecord_wmsse_order_no',
			value : cyclePlanInternalId
		});
		objRecord.setValue({
			fieldId : 'custrecord_wmsse_wms_location',
			value : warehouseLocationId
		});
		objRecord.setValue({
			fieldId : 'custrecord_wmsse_parent_sku_no',
			value : itemInternalId
		});
		if(_isValueValid(inventoryCountRecId)){
			objRecord.setValue({
				fieldId : 'custrecord_wmsse_nsconfirm_ref_no',
				value : inventoryCountRecId
			});
		}
		var currentUserId = runtime.getCurrentUser().id
		objRecord.setValue({
			fieldId : 'custrecord_wmsse_upd_user_no',
			value : currentUserId
		});
		if(_isValueValid(actualBeginTime))
			objRecord.setValue({
				fieldId : 'custrecord_wmsse_actualbegintime',
				value : parseTimeString(actualBeginTime)
			});
		var endTime = getCurrentTimeStamp();
		objRecord.setValue({
			fieldId : 'custrecord_wmsse_actualendtime',
			value : parseTimeString(endTime)
		});
		var recId = objRecord.save();
		if(_isValueValid(recId)){
			//createLockRecord(cyclePlanInternalId,'inventorycount',lineNum,currentUserId);
		}
		objRecord = null;
		return recId;
	}
	function getAllSerials(internalId, lineNum){
		var serialSearch = search.load('customsearch_wms_get_all_serials');
		serialSearch.filters.push(search.createFilter({
			name : 'custrecord_wmsse_ser_status',
			operator : search.Operator.IS,
			values : false
		}));
		serialSearch.filters.push(search.createFilter({
			name : 'custrecord_wmsse_ser_ordline',
			operator : search.Operator.EQUALTO,
			values : lineNum
		}));
		serialSearch.filters.push(search.createFilter({
			name : 'custrecord_wmsse_ser_ordno',
			operator : search.Operator.ANYOF,
			values : internalId
		}));
		return _getSearchResultInJSON(serialSearch);
	}

	function fnGetAllSerialsbyStatus(poInternalId,poLineno,vstatus,vAllSerialArray){
		var serialSearch = search.load({
			type : 'customrecord_wmsse_serialentry',
			id : 'customsearch_wmsse_serialentry_statussrh'
		});
		serialSearch.filters.push(search.createFilter({
			name : 'custrecord_wmsse_ser_status',
			operator : search.Operator.IS,
			values : false
		}));
		if(_isValueValid(poLineno))
			serialSearch.filters.push(search.createFilter({
				name : 'custrecord_wmsse_ser_ordline',
				operator : search.Operator.EQUALTO,
				values : poLineno
			}));
		if(_isValueValid(poInternalId))
			serialSearch.filters.push(search.createFilter({
				name : 'custrecord_wmsse_ser_ordno',
				operator : search.Operator.ANYOF,
				values : poInternalId
			}));
		if(_isValueValid(vstatus))
			serialSearch.filters.push(search.createFilter({
				name : 'custrecord_serial_inventorystatus',
				operator : search.Operator.ANYOF,
				values : vstatus
			}));
		var result = _getSearchResultInJSON(serialSearch);
		return result;
	}
	function deleteCycleCountOpenTask(cyclePlanInternalId, cyclePlanId, lineNum, itemInternalId, inventoryStatusFeature){
		var serialSearch = search.load({
			type : 'customrecord_wmsse_serialentry',
			id : 'customsearch_wmsse_serialentry_details'
		});
		serialSearch.filters.push(search.createFilter({
			name : 'custrecord_wmsse_ser_status',
			operator : search.Operator.IS,
			values : false
		}));
		serialSearch.filters.push(search.createFilter({
			name : 'custrecord_wmsse_ser_ordline',
			operator : search.Operator.EQUALTO,
			values : lineNum
		}));
		serialSearch.filters.push(search.createFilter({
			name : 'custrecord_wmsse_ser_ordno',
			operator : search.Operator.ANYOF,
			values : cyclePlanInternalId
		}));
		serialSearch.columns.push(search.createColumn({
			name : 'custrecord_wmsse_ser_bin'
		}));
		serialSearch.columns.push(search.createColumn({
			name : 'custrecord_wmsse_ser_qty'
		}));
		if(inventoryStatusFeature)
			serialSearch.columns.push(search.createColumn({
				name : 'custrecord_serial_inventorystatus'
			}));
		var serialSearchRes = _getSearchResultInJSON(serialSearch);
		if(serialSearchRes.length > 0){
			var openTaskPlanSearch = search.load('customsearch_wmsse_opentask_search');
			openTaskPlanSearch.filters.push(search.createFilter({
				name : 'name',
				operator : search.Operator.IS,
				values : cyclePlanId
			}));
			openTaskPlanSearch.filters.push(search.createFilter({
				name : 'custrecord_wmsse_wms_status_flag',
				operator : search.Operator.ANYOF,
				values : 31
			}));
			openTaskPlanSearch.filters.push(search.createFilter({
				name : 'custrecord_wmsse_tasktype',
				operator : search.Operator.ANYOF,
				values : 7
			}));
			openTaskPlanSearch.filters.push(search.createFilter({
				name : 'custrecord_wmsse_line_no',
				operator : search.Operator.EQUALTO,
				values : lineNum
			}));
			openTaskPlanSearch.filters.push(search.createFilter({
				name : 'custrecord_wmsse_sku',
				operator : search.Operator.ANYOF,
				values : itemInternalId
			}));
			openTaskPlanDtls = _getSearchResultInJSON(openTaskPlanSearch);
			for(var i in openTaskPlanDtls){
				var recId = openTaskPlanDtls[i]['id'];
				var id = record.delete({
					type : 'customrecord_wmsse_trn_opentask',
					id : recId
				});
			}
		}
		log.debug('delelteOpen Task serialSearchRes',serialSearchRes);
		return serialSearchRes;
	}
	function getInventoryBalanceDetails(warehouseLocationId, itemInternalId, binInternalId){
		var invsearch = search.load({
			type : search.Type.INVENTORY_BALANCE,
			id: 'customsearch_wmsse_inv_report_invbalance'
		});
		invsearch.filters.push(search.createFilter({
			name : 'location',
			operator : search.Operator.ANYOF,
			values : warehouseLocationId
		}));
		invsearch.filters.push(search.createFilter({
			name : 'item',
			operator : search.Operator.ANYOF,
			values : itemInternalId
		}));
		invsearch.filters.push(search.createFilter({
			name : 'binnumber',
			operator : search.Operator.ANYOF,
			values : binInternalId
		}));
		return _getSearchResultInJSON(invsearch);
	}
	function closeSerialEntryStatusCycleCount(lotListSearchRes, serialNotes){
		var serialRec = record.load({
			type : 'customrecord_wmsse_serialentry',
			id : lotListSearchRes['id']
		});
		serialRec.setValue({
			fieldId : 'id',
			value : lotListSearchRes['id']
		});
		serialRec.setValue({
			fieldId : 'name',
			value : lotListSearchRes['name']
		});
		serialRec.setValue({
			fieldId : 'custrecord_wmsse_ser_note1',
			value : serialNotes
		});
		serialRec.setValue({
			fieldId : 'custrecord_wmsse_ser_status',
			value : true
		});
		serialRec.save();
	}

	function deleteTransactionLock(trantype, internalId, lineNo){
		var lockSearch = search.load({
			id: 'customsearch_wmsse_lockrecs_srh'
		});

		var lockfilters = [
			search.createFilter({
				name: 'custrecord_wmsse_trantype',
				operator: search.Operator.IS,
				values: trantype
			}), search.createFilter({
				name: 'custrecord_wmsse_order',
				operator: search.Operator.ANYOF,
				values: internalId
			}), search.createFilter({
				name: 'custrecord_wmsse_line',
				operator: search.Operator.EQUALTO,
				values: lineNo
			}), search.createFilter({
				name: 'custrecord_wmsse_lockflag',
				operator: search.Operator.IS,
				values: true
			})
			];

		lockSearch.filters = lockSearch.filters.concat(lockfilters);

		lockSearchRes = _getSearchResultInJSON(lockSearch);

		for(var i in lockSearchRes){
			var lockDeleteRecordId = record.delete({
				type: 'customrecord_wmsse_lockrecs',
				id: lockSearchRes[0].id
			});
		}	
	}


	function picktaskupdate(picktaskObj)
	{
		var whLocation =picktaskObj['whLocation'];
		var pickTaskId =picktaskObj['picktaskid'];
		var itemId=picktaskObj['itemId'];
		var pickQty=picktaskObj['pickqty'];
		var enterQty = picktaskObj['enterqty'];
		var fromBinId=picktaskObj['fromBinId'];
		var batchNo=picktaskObj['batchno'];
		var fromStatus=picktaskObj['statusInternalId'];
		var itemType=picktaskObj['itemType'];
		var totalLinepickqty = picktaskObj['totalLinepickqty'];
		var containerName = picktaskObj['containerName'];
		var inventoryStatusFeature = isInvStatusFeatureEnabled();
		var currentUserId = runtime.getCurrentUser().id
		var vPicktaskRec = record.load({type:'picktask',
			id:pickTaskId
		});

		var picker = vPicktaskRec.getValue({
			fieldId: 'picker'
		});
		log.debug('picker exist',picker);
		if(!(_isValueValid(picker))){
			var objPickerDetails = getPickerDetails(whLocation,currentUserId);
			if(objPickerDetails.length > 0 ){
				vPicktaskRec.setValue({fieldId: 'picker', value: currentUserId});
			}	
		}

		var lineNo = (parseInt(0));

		var pickedQty = vPicktaskRec.getSublistValue({
			sublistId: 'pickactions',
			fieldId: 'pickedquantity',
			line : lineNo
		});
		if(!_isValueValid(pickedQty))
		{
			pickedQty = 0;
		}
		var totalLinePickedQty = Number(Big(pickedQty).plus(enterQty));
		vPicktaskRec.setSublistValue({
			sublistId: 'pickactions',
			fieldId: 'pickedquantity',
			line : lineNo,
			value: totalLinePickedQty
		});
		if(itemType != "noninventoryitem")
		{
			compSubRecord = vPicktaskRec.getSublistSubrecord({
				sublistId :'pickactions',
				fieldId : 'inventorydetail',
				line : lineNo
			});
			var complinelength =compSubRecord.getLineCount({
				sublistId:'inventoryassignment'
			});
			if (itemType == "serializedinventoryitem" || itemType=="serializedassemblyitem") 
			{
				var serialSearchObj = search.load({type:'customrecord_wmsse_serialentry', id:'customsearch_wmsse_serialdetails_search'});
				serialSearchObj.filters.push(search.createFilter({
					name : 'custrecord_wmsse_ser_status',
					operator : search.Operator.IS,
					values : false
				}));

				serialSearchObj.filters.push(search.createFilter({
					name : 'custrecord_wmsse_ser_tasktype',
					operator : search.Operator.ANYOF,
					values : 3
				}));
				serialSearchObj.filters.push(search.createFilter({
					name : 'custrecord_wmsse_ser_item',
					operator : search.Operator.ANYOF,
					values : itemId
				}));
				serialSearchObj.filters.push(search.createFilter({
					name : 'name',
					operator : search.Operator.IS,
					values : pickTaskId
				}));
				var serialSearchResults = _getSearchResultInJSON(serialSearchObj);
				var serialIdArr = [];
				if(serialSearchResults.length  > 0)
				{
					var intItr=0;
					for (var x = complinelength; intItr < serialSearchResults.length; x++)
					{
						serialIdArr.push(serialSearchResults[intItr].id);
						compSubRecord.insertLine({
							sublistId: 'inventoryassignment',
							line : x
						});
						compSubRecord.setSublistValue({
							sublistId : 'inventoryassignment',
							fieldId : 'binnumber',
							line : x,
							value : fromBinId
						});
						compSubRecord.setSublistValue({
							sublistId : 'inventoryassignment',
							fieldId : 'quantity',
							line : x,
							value : 1
						});
						if(_isValueValid(containerName))
						{
							compSubRecord.setSublistValue({
								sublistId : 'inventoryassignment',
								fieldId : 'custrecord_wms_pickcarton',
								line : x,
								value : containerName//name
							});
						}
						compSubRecord.setSublistValue({
							sublistId : 'inventoryassignment',
							fieldId : 'receiptinventorynumber',
							line : x,
							value:  serialSearchResults[intItr]['custrecord_wmsse_ser_no']
						});
						if(inventoryStatusFeature) {
							compSubRecord.setSublistValue({
								sublistId: 'inventoryassignment',
								fieldId: 'inventorystatus',
								line: x,
								value: fromStatus
							});//523782(core issue raised)
						}
						intItr++;
					}

					for (var serialId in serialIdArr) {

						var serialEntryRecId = serialIdArr[serialId];

						record.submitFields({
							type: 'customrecord_wmsse_serialentry',
							id: serialEntryRecId,
							values: {
								'custrecord_wmsse_ser_note1' : 'because of discontinue of serial number scanning we have marked this serial number as closed',
								'custrecord_wmsse_ser_status':true
							}
						});
					}
				}

			}
			else
			{
				var compinvlinelength =compSubRecord.getLineCount({
					sublistId:'inventoryassignment'
				});

				compSubRecord.insertLine({
					sublistId: 'inventoryassignment',
					line : compinvlinelength
				});
				compSubRecord.setSublistValue({
					sublistId : 'inventoryassignment',
					fieldId : 'binnumber',
					line :compinvlinelength,
					value : fromBinId
				});
				compSubRecord.setSublistValue({
					sublistId : 'inventoryassignment',
					fieldId : 'quantity',
					line : compinvlinelength,
					value : enterQty
				});
				if(_isValueValid(batchNo))
				{
					compSubRecord.setSublistValue({
						sublistId : 'inventoryassignment',
						fieldId : 'receiptinventorynumber',
						line : compinvlinelength,
						value : batchNo
					});
				}
				if(_isValueValid(containerName))
				{
					compSubRecord.setSublistValue({
						sublistId : 'inventoryassignment',
						fieldId : 'custrecord_wms_pickcarton',
						line : compinvlinelength,
						value : containerName
					});
				}
				if(inventoryStatusFeature) {
					compSubRecord.setSublistValue({
						sublistId: 'inventoryassignment',
						fieldId: 'inventorystatus',
						line: compinvlinelength,
						value: fromStatus
					});
				}  //523782(core issue raised)

			}
		}

		var picktaskrecId=vPicktaskRec.save();
		return picktaskrecId;
	}

	function multiorderpicktaskupdate(picktaskObj)
	{
		log.debug({title:'multipicktaskObj',details:picktaskObj});

		var whLocation =picktaskObj['whLocation'];
		var pickTaskId =picktaskObj['picktaskid'];
		var itemId=picktaskObj['itemId'];
		var pickQty=picktaskObj['pickqty'];
		var fromBinId=picktaskObj['fromBinId'];
		var batchNo=picktaskObj['batchno'];
		var picktasklineNo=picktaskObj['line'];
		//var units =picktaskObj['units'];
		// var stockConversionRate =picktaskObj['stockConversionRate'];
		var fromStatus=picktaskObj['statusInternalId'];
		var itemType=picktaskObj['itemType'];
		var orderInternalId =picktaskObj['orderInternalId'];
		var containerName =picktaskObj['containerName'];
		var inventoryStatusFeature = isInvStatusFeatureEnabled();
		var totalLinepickqty = picktaskObj['totalLinepickqty'];
		var currentUserId = runtime.getCurrentUser().id
		var vPicktaskRec= record.load({
			type : 'picktask',
			id : pickTaskId,
			//isDynamic: true
		});
		var picker = vPicktaskRec.getValue({
			fieldId: 'picker'
		});
		log.debug('picker exist',picker);
		if(!(_isValueValid(picker))){
			var objPickerDetails = getPickerDetails(whLocation,currentUserId);
			if(objPickerDetails.length > 0 ){
				vPicktaskRec.setValue({fieldId: 'picker', value: currentUserId});
			}
		}
		//var lineNo = (parseInt(1));
		//vPicktaskRec.setValue({fieldId: 'picker', value: currentUserId});

		var pickTaskItemcount = vPicktaskRec.getLineCount({
			sublistId: 'pickactions'
		});
		for(var Ifitr=0;Ifitr<pickTaskItemcount;Ifitr++)
		{
			var pickTaskOrderId = vPicktaskRec.getSublistValue({sublistId: 'pickactions',fieldId: 'ordernumber',line:Ifitr});
			var lineId = vPicktaskRec.getSublistValue({sublistId: 'pickactions',fieldId: 'linenumber',line:Ifitr});

			if(orderInternalId == pickTaskOrderId && picktasklineNo == lineId)
			{
				vPicktaskRec.setSublistValue({
					sublistId: 'pickactions',
					fieldId: 'pickedquantity',
					line : parseInt(Ifitr),
					value: totalLinepickqty //pickQty
				});

				if(itemType != "noninventoryitem")
				{
					compSubRecord = vPicktaskRec.getSublistSubrecord({
						sublistId :'pickactions',
						fieldId : 'inventorydetail',
						line : parseInt(Ifitr)
					});

					var complinelength =compSubRecord.getLineCount({
						sublistId:'inventoryassignment'
					});
					if (itemType == "serializedinventoryitem" || itemType=="serializedassemblyitem") 
					{
						var filterssertemp = [];
						filterssertemp.push(search.createFilter({name:'custrecord_wmsse_ser_status',operator: search.Operator.IS,values:false}));
						filterssertemp.push(search.createFilter({name:'custrecord_wmsse_ser_tasktype',operator: search.Operator.ANYOF,values:3}));
						filterssertemp.push(search.createFilter({name:'custrecord_wmsse_ser_item',operator: search.Operator.ANYOF,values:itemId}));
						filterssertemp.push(search.createFilter({name:'name',operator: search.Operator.IS,values:pickTaskId}));
						var columns = [];
						columns.push(search.createColumn('custrecord_wmsse_ser_no'));
						columns.push(search.createColumn('name'));
						var SrchRecordTmpSeriaObj = search.create({type:'customrecord_wmsse_serialentry', filters:filterssertemp,columns:columns});
						var SrchRecordTmpSerial1 = _getSearchResultInJSON(SrchRecordTmpSeriaObj);
						log.debug({title:'SrchRecordTmpSerial1',details:SrchRecordTmpSerial1});
						if(SrchRecordTmpSerial1!=null && SrchRecordTmpSerial1!="")
						{
							var intItr=0;
							for (var x = complinelength; intItr < SrchRecordTmpSerial1.length; x++)
							{

								compSubRecord.insertLine({
									sublistId: 'inventoryassignment',
									line : x
								});
								compSubRecord.setSublistValue({
									sublistId : 'inventoryassignment',
									fieldId : 'binnumber',
									line : x,
									value : fromBinId
								});
								compSubRecord.setSublistValue({
									sublistId : 'inventoryassignment',
									fieldId : 'quantity',
									line : x,
									value : 1
								});
								compSubRecord.setSublistValue({
									sublistId : 'inventoryassignment',
									fieldId : 'receiptinventorynumber',
									line : x,
									value:  SrchRecordTmpSerial1[intItr]['custrecord_wmsse_ser_no']
								});
								if(inventoryStatusFeature) {
									compSubRecord.setSublistValue({
										sublistId: 'inventoryassignment',
										fieldId: 'inventorystatus',
										line: x,
										value: fromStatus
									});
								}

								if(_isValueValid(containerName))
								{
									compSubRecord.setSublistValue({
										sublistId : 'inventoryassignment',
										fieldId : 'custrecord_wms_pickcarton',
										line : x,
										value : containerName//name
									});
								}
								intItr++;
							}

							for (var j = 0; j < SrchRecordTmpSerial1.length; j++) {
								var TempRecord = SrchRecordTmpSerial1[j];
								var serialRec = record.load({
									type : 'customrecord_wmsse_serialentry',
									id : TempRecord.id
								});
								serialRec.setValue({ fieldId:'customrecord_wmsse_serialentry', value :TempRecord.id });
								serialRec.setValue({ fieldId:'custrecord_wmsse_ser_note1', value :'because of discontinue of serial number scanning we have marked this serial number as closed'});
								serialRec.setValue({ fieldId:'custrecord_wmsse_ser_status', value :true });
								serialRec.save();
								TempRecord=null;
							}
						}

					}
					else
					{

						var compinvlinelength =compSubRecord.getLineCount({
							sublistId:'inventoryassignment'
						});
						log.debug({title:'compinvlinelength',details:compinvlinelength});
						compSubRecord.insertLine({
							sublistId: 'inventoryassignment',
							line : compinvlinelength
						});
						compSubRecord.setSublistValue({
							sublistId : 'inventoryassignment',
							fieldId : 'binnumber',
							line : compinvlinelength,
							value : fromBinId
						});
						compSubRecord.setSublistValue({
							sublistId : 'inventoryassignment',
							fieldId : 'quantity',
							line : compinvlinelength,
							value : pickQty
						});
						if(inventoryStatusFeature) {
							compSubRecord.setSublistValue({
								sublistId: 'inventoryassignment',
								fieldId: 'inventorystatus',
								line: compinvlinelength,
								value: fromStatus
							});
						}

						if(_isValueValid(batchNo))
						{
							compSubRecord.setSublistValue({
								sublistId : 'inventoryassignment',
								fieldId : 'receiptinventorynumber',
								line :compinvlinelength,
								value :batchNo//name
							});
						}


						if(_isValueValid(containerName))
						{
							compSubRecord.setSublistValue({
								sublistId : 'inventoryassignment',
								fieldId : 'custrecord_wms_pickcarton',
								line : compinvlinelength,
								value : containerName//name
							});
						}
						log.debug({title:'compSubRecord',details:compSubRecord});

					}
				}
			}
		}
		var picktaskrecId=vPicktaskRec.save();
		log.debug('recId1111---',picktaskrecId);

		return picktaskrecId;
	}

	function _fnEmptyBin(pickTaskId)
	{

		var pickQty=0;
		var vPicktaskRec= record.load({
			type : 'picktask',
			id : pickTaskId
		});
		var pickTaskItemcount = vPicktaskRec.getLineCount({
			sublistId: 'pickactions'
		});
		var picktaskrecId= '';
		for(var Ifitr=0;Ifitr<pickTaskItemcount;Ifitr++)
		{
			var pickTaskOrderId = vPicktaskRec.getSublistValue({sublistId: 'pickactions',fieldId: 'ordernumber',line:Ifitr});

			var pickedQuantity = vPicktaskRec.getSublistValue({sublistId: 'pickactions',fieldId: 'pickedquantity',line:Ifitr});
			if(!_isValueValid(pickedQuantity))
			{
				vPicktaskRec.setSublistValue({
					sublistId: 'pickactions',
					fieldId: 'pickedquantity',
					line : parseFloat(Ifitr),
					value: pickQty
				});
			}
			picktaskrecId=vPicktaskRec.save();


		}

		return picktaskrecId;
	}

	function _validateStageBin(picktaskObj)
	{
		var stageBinId = '';
		var binName = picktaskObj['binName'];
		var warehouseLocationId = picktaskObj['whLocationId'];

		var binlocationSearch =  search.load({
			id:'customsearch_wmsse_pickstagebin_validate'
		});

		var binFilters = binlocationSearch.filters;

		if(_isValueValid(warehouseLocationId))
		{
			binFilters.push(search.createFilter({
				name : 'location',
				operator : search.Operator.ANYOF,
				values : warehouseLocationId
			}));
		}
		binFilters.push(search.createFilter({
			name : 'binnumber',
			operator : search.Operator.IS,
			values : binName
		}));

		binlocationSearch.filters = binFilters

		var binRecord = _getSearchResultInJSON(binlocationSearch);

		if(binRecord.length > 0)
		{
			stageBinId = binRecord[0]['internalid'];
		}

		return stageBinId;
	}

	function _updateStageBin(picktaskObj)
	{
		var isPickTaskUpdated = 'T';//change it to 'F' when the below comments are removed
		var whLocation =picktaskObj['whLocationId'];
		var ordId =picktaskObj['orderInternalId'];
		var stageBinId=picktaskObj['stageBinInternalId'];
		var pickingType=picktaskObj['pickingType'];
		var waveName=picktaskObj['waveName'];

		var pickTaskIdarr=[];
		log.debug({title:'whLocation',details:whLocation});
		log.debug({title:'ordId',details:ordId});
		log.debug({title:'stageBinId',details:stageBinId});

		var orderSearch = search.load({id:'customsearch_wmsse_stagedet_updatestatus'});

		var orderSearchFilters = orderSearch.filters;

		if(pickingType == 'multiOrder')
		{
			orderSearchFilters.push(search.createFilter({
				name:'wavename',
				operator:search.Operator.IS,
				values:waveName}));
		}
		else
		{
			orderSearchFilters.push(search.createFilter({
				name:'internalid',
				join:'transaction',
				operator:search.Operator.IS,
				values:ordId}));
		}


		orderSearchFilters.push(search.createFilter({
			name:'location',
			operator:search.Operator.ANYOF,
			values:['@NONE@',whLocation]}));

		orderSearch.filters = orderSearchFilters;


		var	 objOrderSearchDetails = _getSearchResultInJSON(orderSearch);
		log.debug({title:'objOrderSearchDetails',details:objOrderSearchDetails});

		var duplicate_pickTaskArr = [];

		if(objOrderSearchDetails!=null && objOrderSearchDetails!='' && objOrderSearchDetails.length > 0)
		{

			for(var task = 0 ; task < objOrderSearchDetails.length; task++)
			{
				var pickTask = objOrderSearchDetails[task]['id'];
				if(duplicate_pickTaskArr.indexOf(pickTask)==-1)
				{
					pickTaskIdarr.push(objOrderSearchDetails[task]);
					duplicate_pickTaskArr.push(pickTask);
				}
			}



		}

		log.debug({title:'pickTaskIdarr',details:pickTaskIdarr});
		var pickTaskStagedarr=[];
		var newLinetoStage ='N';
		if(pickTaskIdarr!=null && pickTaskIdarr!='')
		{

			for (var picktaskid = 0; picktaskid < pickTaskIdarr.length; picktaskid++) {

				var vPicktaskRec = record.load({type:'picktask',
					id:pickTaskIdarr[picktaskid]['id']
				});
				log.debug({title:'pickTaskIdarr[picktaskid][id]',details:pickTaskIdarr[picktaskid]['id']});
				log.debug({title:'vPicktaskRec',details:vPicktaskRec});

				//var lineNo = (parseInt(0));

				var complinelength =vPicktaskRec.getLineCount({
					sublistId:'pickactions'
				});




				for (var pickAction = 0; pickAction < complinelength; pickAction++) {
					var pickedQty = vPicktaskRec.getSublistValue({
						sublistId : 'pickactions',
						fieldId: 'pickedquantity',
						line : pickAction
					});
					log.debug({title:'pickedQty new',details:pickedQty});
					if(pickedQty > 0)
					{
						var stagedlineitemstatus = vPicktaskRec.getSublistValue({
							sublistId : 'pickactions',
							fieldId : 'status', 
							line : pickAction
						});
						log.debug({title:'stagedlineitemstatus new',details:stagedlineitemstatus});
						var stagedBin = vPicktaskRec.getSublistValue({
							sublistId : 'pickactions',
							fieldId : 'stagingbin', 
							line : pickAction
						});
						log.debug({title:'pickAction new',details:pickAction});
						log.debug({title:'stagedBin new it is from picktask load',details:stagedBin});	
						log.debug({title:'stageBinId new it is from stage scanning screen',details:stageBinId});	
						if(stagedBin == '' || stagedBin == null)//new line to stage
						{
							log.debug({title:'new line to stage new',details:invDetailslinelength});	
					vPicktaskRec.setSublistValue({
						sublistId: 'pickactions',
						fieldId: 'stagingbin',
						line : pickAction,
						value: stageBinId
					});
							var invdetailLine = vPicktaskRec.getSublistSubrecord({
								sublistId :'pickactions',
								fieldId : 'inventorydetail',
								line : parseInt(pickAction)
							});
							log.debug({title:'invdetailLine new',details:invdetailLine});	
							var invDetailslinelength =invdetailLine.getLineCount({
								sublistId:'inventoryassignment'
							});
							log.debug({title:'invDetailslinelength new',details:invDetailslinelength});	
							for (var n = 0; n < invDetailslinelength; n++) {
								invdetailLine.setSublistValue({
									sublistId : 'inventoryassignment',
									fieldId : 'custrecord_wmsse_staged',
									line : n,
									value : true
								});
							}
							newLinetoStage ='Y';
						}
						else if(stagedBin == stageBinId)//existing stage bin is already existing when partial qty
						{
							log.debug({title:'existing line to stage when same bin is scannned new',details:''});	
							var invdetailLine = vPicktaskRec.getSublistSubrecord({
								sublistId :'pickactions',
								fieldId : 'inventorydetail',
								line : parseInt(pickAction)
							});
							log.debug({title:'invdetailLine new',details:invdetailLine});	
							var invDetailslinelength =invdetailLine.getLineCount({
								sublistId:'inventoryassignment'
							});
							for (var n = 0; n < invDetailslinelength; n++) {
								invdetailLine.setSublistValue({
									sublistId : 'inventoryassignment',
									fieldId : 'custrecord_wmsse_staged',
									line : n,
									value : true
								});
							}
							if(stagedlineitemstatus == 'STAGED')
							{
								log.debug({title:'stagedlineitemstatus new is staged',details:stagedlineitemstatus});	
								pickTaskStagedarr.push(stageBinId);
							}
						}
						else
						{
							var invdetailLine = vPicktaskRec.getSublistSubrecord({
								sublistId :'pickactions',
								fieldId : 'inventorydetail',
								line : parseInt(pickAction)
							});
							log.debug({title:'invdetailLine new',details:invdetailLine});	
							var invDetailslinelength =invdetailLine.getLineCount({
								sublistId:'inventoryassignment'
							});
							log.debug({title:'invDetailslinelength new',details:invDetailslinelength});	
							for (var n = 0; n < invDetailslinelength; n++) {
								var invdetStagedFlagStatus = invdetailLine.getSublistValue({
									sublistId : 'inventoryassignment',
									fieldId : 'custrecord_wmsse_staged',
									line : n
								});
								if(stagedlineitemstatus == 'STAGED' && invdetStagedFlagStatus == false)
								{
									pickTaskStagedarr.push(stagedBin);
								}
								else if(stagedlineitemstatus == 'PICKED' || stagedlineitemstatus == 'STARTED')
								{
									newLinetoStage = 'Y';
								}
							}
						}
					}
				}
				var picktaskrecId=vPicktaskRec.save();

			}
		}
		log.debug({title:'pickTaskStagedarr new',details:pickTaskStagedarr});

		if((pickTaskStagedarr!=null && pickTaskStagedarr!='') && newLinetoStage == 'N' && pickTaskStagedarr.indexOf(stageBinId)==-1)
		{
			if(pickTaskStagedarr.indexOf(stageBinId)==-1)
			{
				log.debug({title:'empty else new',details:'empty else new'});
				isPickTaskUpdated = 'N';
				return isPickTaskUpdated;
			}
		}
		//Stage to DONE updation
		var orderStgSearch = search.load({id:'customsearch_wms_stage_picktask_dtl'});			

		var orderStgSearchFilters = orderStgSearch.filters;

		if(pickingType == 'multiOrder')
		{
			orderStgSearchFilters.push(search.createFilter({
				name:'wavename',
				operator:search.Operator.IS,
				values:waveName}));
		}
		else
		{
			orderStgSearchFilters.push(search.createFilter({
				name:'internalid',
				join:'transaction',
				operator:search.Operator.ANYOF,
				values:ordId}));
		}


		orderStgSearchFilters.push(search.createFilter({
			name:'location',
			operator:search.Operator.ANYOF,
			values:['@NONE@',whLocation]}));

		orderStgSearch.filters = orderStgSearchFilters;


		var	 objOrderStgSearchDetails = _getSearchResultInJSON(orderStgSearch);
		log.debug({title:'objOrderSearchDetails',details:objOrderStgSearchDetails});

		var duplicate_pickTaskstgArr = [];
		var pickTaskIdStgarr=[];

		if(objOrderStgSearchDetails!=null && objOrderStgSearchDetails!='' && objOrderStgSearchDetails.length > 0)
		{

			for(var task = 0 ; task < objOrderStgSearchDetails.length; task++)
			{
				//pickTaskIdarr.push(objOrderSearchDetails[task]);
				var pickTask = objOrderStgSearchDetails[task]['id'];
				if(duplicate_pickTaskstgArr.indexOf(pickTask)==-1)
				{
					pickTaskIdStgarr.push(objOrderStgSearchDetails[task]);
					duplicate_pickTaskstgArr.push(pickTask);
				}

			}
		}

		log.debug({title:'pickTaskIdarr',details:pickTaskIdStgarr});

		if(pickTaskIdStgarr!=null && pickTaskIdStgarr!='')
		{

			for (var picktaskid = 0; picktaskid < pickTaskIdStgarr.length; picktaskid++) {

				var vPicktaskStgRec = record.load({type:'picktask',
					id:pickTaskIdStgarr[picktaskid]['id']
				});
				log.debug({title:'pickTaskIdStgarr[picktaskid][id]',details:pickTaskIdStgarr[picktaskid]['id']});
				log.debug({title:'vPicktaskStgRec ',details:vPicktaskStgRec});

				//var lineNo = (parseInt(0));
				var complinelength =vPicktaskStgRec.getLineCount({
					sublistId:'pickactions'
				});

				log.debug({title:'complinelength',details:complinelength});
				var lineNo = parseFloat(picktaskid); // changed for Multi Order
				log.debug({title:'lineNo',details:lineNo});

				for (var pickAction = 0; pickAction < complinelength; pickAction++) {
					var lineRemainingQty = vPicktaskStgRec.getSublistValue({
						sublistId : 'pickactions',
						fieldId : 'remainingquantity', 
						line : pickAction
					});
					log.debug({title:'lineRemainingQty',details:lineRemainingQty});
					var currentpickTaskLineItemStatus = vPicktaskStgRec.getSublistValue({
						sublistId : 'pickactions',
						fieldId : 'status', 
						line : pickAction
					});
					log.debug({title:'currentpickTaskLineItemStatus',details:currentpickTaskLineItemStatus});
					var stageBin = vPicktaskStgRec.getSublistValue({
						sublistId : 'pickactions',
						fieldId : 'stagingbin', 
						line : pickAction
					});
					log.debug({title:'stageBin new',details:stageBin});	
					var invdetailLine = vPicktaskStgRec.getSublistSubrecord({
						sublistId :'pickactions',
						fieldId : 'inventorydetail',
						line : parseInt(pickAction)
					});
					log.debug({title:'invdetailLine new',details:invdetailLine});	
					var invDetailslinelength =invdetailLine.getLineCount({
						sublistId:'inventoryassignment'
					});
					log.debug({title:'stageBin',details:stageBin});
					log.debug({title:'stageBinId',details:stageBinId});
					var stagedFlagarr=[];
					if(stageBin == stageBinId)//since in multi order stage flag array should not be of all picktask need only the present picktask lines of currently scanned stagebin
					{
						for (var n = 0; n < invDetailslinelength; n++) {
							var stagedFlagStatusInvDet = invdetailLine.getSublistValue({
								sublistId : 'inventoryassignment',
								fieldId : 'custrecord_wmsse_staged',
								line : n
							});
							stagedFlagarr.push(stagedFlagStatusInvDet);
							log.debug({title:'stagedFlagarr',details:stagedFlagarr});
						}
						log.debug({title:'picktask id to update status with done',details:pickTaskIdStgarr[picktaskid]['id']});
						var stgFlag = false;
						if(stagedFlagarr!=null && stagedFlagarr!='')
						{
							if(lineRemainingQty == 0 && currentpickTaskLineItemStatus == 'STAGED' && stagedFlagarr.indexOf(stgFlag)==-1)//since not to try update which are already updated to done or failed
							{
								log.debug({title:'picktask id to update status with done2',details:pickTaskIdStgarr[picktaskid]['id']});
					vPicktaskStgRec.setSublistValue({
						sublistId: 'pickactions',
						fieldId: 'status',
						line : pickAction,
						value: 'DONE'
					});
							}
						}
					}
				}
				var picktaskrecId=vPicktaskStgRec.save();

			}
		}		

		if(_isValueValid(picktaskrecId))
		{
			isPickTaskUpdated = 'T'
		}

		return isPickTaskUpdated;
	}

	function getStagedPickTaskDetails(pickTaskDetails,containerEnabled)
	{
		var getOrderInternalId = pickTaskDetails['orderInternalId'];
		var warehouseLocationId = pickTaskDetails["whLocationId"];
		var stageBinInternalId = pickTaskDetails["stageBinInternalId"];
		var waveName = pickTaskDetails["waveName"];
		log.debug({title:'stageBinInternalId',details:stageBinInternalId});
		var pickTaskSearch = search.load({id:'customsearch_wmsse_stagedpicktask_detail'});
		var pickTaskFilters = pickTaskSearch.filters;
		if(_isValueValid(getOrderInternalId))
		{
			pickTaskFilters.push(search.createFilter({
				name:'internalid',
				join:'transaction',
				operator:search.Operator.ANYOF,
				values:getOrderInternalId}))
		}

		if(_isValueValid(warehouseLocationId))
		{
			pickTaskFilters.push(search.createFilter({
				name:'location',
				operator:search.Operator.ANYOF,
				values:['@NONE@',warehouseLocationId]}));
		}
		if(_isValueValid(stageBinInternalId))
		{
			pickTaskFilters.push(search.createFilter({
				name:'stagingbin',
				operator:search.Operator.ANYOF,
				values:stageBinInternalId}));
		}
		if(_isValueValid(waveName))
		{
			pickTaskFilters.push(search.createFilter({
				name:'waveName',
				operator:search.Operator.IS,
				values:waveName
			}));
		}

		pickTaskSearch.filters = pickTaskFilters;
		var	 objpicktaskSearchDetails = _getSearchResultInJSON(pickTaskSearch);
		log.debug({title:'pickTaskSearch',details:objpicktaskSearchDetails});
		if(objpicktaskSearchDetails.length > 0)
		{
			for(var pickTaskItr=0; pickTaskItr<objpicktaskSearchDetails.length; pickTaskItr++)
			{
				
				objpicktaskSearchDetails[pickTaskItr]['lineitempickedquantity']=
					objpicktaskSearchDetails[pickTaskItr]['lineitempickedquantity'] + ' ' +objpicktaskSearchDetails[pickTaskItr]['unitsText'];
				
			}
		}
		
		var stgItmContrTempArr = [];
		if(_isValueValid(containerEnabled) && containerEnabled == 'Y' && _isValueValid(objpicktaskSearchDetails) && objpicktaskSearchDetails.length!=0)
		{
			var stgOrderInternalIdArr = [];	
			var transactionid = objpicktaskSearchDetails[0]['tranid'];
			var picktaskSearch = search.load({
				id : 'customsearch_wms_multiorder_containr_lst'
			});

			var picktaskSearchArr = picktaskSearch.filters;
			picktaskSearchArr.push(search.createFilter({
				name: 'location',
				operator: search.Operator.ANYOF,
				values: warehouseLocationId
			}));
			picktaskSearchArr.push(search.createFilter({
				name       : 'appliedtotransaction',
				join          : 'transaction',
				operator  : search.Operator.IS,
				values      : getOrderInternalId
			}));	
			picktaskSearchArr.filters = picktaskSearchArr;
			var pickTaskStgContrDtls = _getSearchResultInJSON(picktaskSearch);
			log.debug({title:'container list :', details:pickTaskStgContrDtls});
			if(_isValueValid(pickTaskStgContrDtls) && pickTaskStgContrDtls.length > 0)
			{
				for(var stgContrItr=0; stgContrItr<pickTaskStgContrDtls.length; stgContrItr++)
				{
					var stgItmContrTempObj = {};
					stgItmContrTempObj['itemText']=pickTaskStgContrDtls[stgContrItr]['item'];
					stgItmContrTempObj['custrecord_wms_pickcarton']=pickTaskStgContrDtls[stgContrItr]['custrecord_wms_pickcarton'];
					stgItmContrTempObj['lineitempickedquantity']=pickTaskStgContrDtls[stgContrItr]['quantity'];
					stgItmContrTempObj['tranid']=transactionid;
					stgItmContrTempArr.push(stgItmContrTempObj);
				}
			}	
			log.debug({title:'stgItmContrTempArr list :', details:stgItmContrTempArr});
			return stgItmContrTempArr;
		}
		else
		{
			log.debug({title:'objpicktaskSearchDetails list :', details:objpicktaskSearchDetails});
			return objpicktaskSearchDetails;
		}

	}
	function _getPickingLotDetails(lotParams)
	{
		var warehouseLocationId = lotParams['warehouseLocationId'];		
		var itemInternalId = lotParams["itemInternalId"];
		var fromBinInternalId = lotParams["fromBinInternalId"];
		var lotName = lotParams["lotName"];
		var lotInternalId = lotParams["lotInternalId"];
		var is_InvStatusFeatureEnabled = lotParams["invStatusFeature"];
		if(!_isValueValid(is_InvStatusFeatureEnabled))
		{
			is_InvStatusFeatureEnabled = isInvStatusFeatureEnabled();
		}

		var orderType = lotParams["orderType"];

		var objBinDetails = {};
		var systemRule_AllowExpiredItems = getSystemRuleValue('Allow picking of expired items?',warehouseLocationId);
		var vmakeInvAvailFlag = true;
		var vLocDetails = search.lookupFields({
			type: search.Type.LOCATION,
			id: warehouseLocationId,
			columns: ['makeinventoryavailable']
		});
		vmakeInvAvailFlag = vLocDetails.makeinventoryavailable;

		var invBalanceSearch = search.load({id:'customsearch_wmsse_invtbalance_lotlist',type:search.Type.INVENTORY_BALANCE});
		var filters = invBalanceSearch.filters;
		if(_isValueValid(lotInternalId))
		{
			filters.push(search.createFilter({
				name:'inventorynumber',					
				operator:search.Operator.ANYOF, 
				values:lotInternalId}));
		}
		if(itemInternalId != null && itemInternalId != '')
		{
			filters.push(search.createFilter({
				name:'internalid',
				join:'item', 
				operator:search.Operator.ANYOF, 
				values:itemInternalId}));
		}
		if(warehouseLocationId!= null && warehouseLocationId!= '')
		{
			filters.push(search.createFilter({
				name:'location',
				operator:search.Operator.ANYOF, 
				values:warehouseLocationId}));
		}
		if(fromBinInternalId!= null && fromBinInternalId!= '')
		{
			filters.push(search.createFilter({
				name:'binnumber',
				operator:search.Operator.ANYOF, 
				values:fromBinInternalId}));
		}
		if(vmakeInvAvailFlag)
		{
			filters.push(search.createFilter({
				name:'available',
				operator:search.Operator.GREATERTHAN, 
				values:0}));
		}
		if((systemRule_AllowExpiredItems == 'N' || systemRule_AllowExpiredItems == '') && (!_isValueValid(orderType)))
		{
			var currDate = DateStamp();

			var dateFormat = DateSetting();
			var defalutExpiryDate  = setExpiryDate(dateFormat,'01','01','2199');
			filters.push(search.createFilter({
				name:'formuladate',
				operator:search.Operator.ONORAFTER, 
				formula:"NVL({inventorynumber.expirationdate},TO_DATE('"+defalutExpiryDate+"','"+dateFormat+"'))",
				values:currDate}));

		}

		invBalanceSearch.filters = filters;
		objBinDetails = _getSearchResultInJSON(invBalanceSearch);
		return objBinDetails;
	}
	function getOrdersForQuickship(transactionType,warehouseLocationId,transactionName)
	{    	
		var searchName ="customsearch_wms_quickship_so_orders";    	
		if(transactionType == 'TrnfrOrd')
		{
			searchName = "customsearch_wms_quickship_to_orders";
		}

		var orderDetailsSearch = search.load({id:searchName});
		var orderFilters = orderDetailsSearch.filters;

		if(_isValueValid(warehouseLocationId))
		{
			orderFilters.push(search.createFilter({
				name:'location',
				operator:search.Operator.ANYOF,
				values:warehouseLocationId}));
		}
		if(_isValueValid(transactionName))
		{
			orderFilters.push(search.createFilter({
				name: 'tranid',
				join: 'createdfrom',
				operator: search.Operator.IS,
				values: transactionName
			}));
		}

		orderDetailsSearch.filters = orderFilters;
		var	 orderSearchDetails = _getSearchResultInJSON(orderDetailsSearch);

		return orderSearchDetails;

	}
	function getQuickShipFlagbyShipmethod(shipmethod)
	{
		log.debug({title:'shipmethod',details:shipmethod});
		var quickShipFalg= false;
		if(_isValueValid(shipmethod))
		{
			var shipMethodSearch = search.load({id:'customsearch_wmsse_getquickshipflag'});
			var shipmethodFilters = shipMethodSearch.filters;

			shipmethodFilters.push(search.createFilter({
				name:'custrecord_wmsse_carrier_nsmethod',
				operator:search.Operator.ANYOF,
				values:shipmethod}));

			shipMethodSearch.filters = shipmethodFilters;
			var	shipMethodSearchDetails = _getSearchResultInJSON(shipMethodSearch);    	
			if(shipMethodSearchDetails!=null && shipMethodSearchDetails !='')
			{
				quickShipFalg=shipMethodSearchDetails[0]['custrecord_wmsse_carrier_allow_quickship']; 
			}	
		}
		log.debug({title:'quickShipFalg',details:quickShipFalg});

		return quickShipFalg;
	}
	function getQSCartonList(transactionInternalId,shipMethodArray,wareHouseLocation,cartonId)
	{
		var cartonDetailsSrch = search.load({
			id : 'customsearch_wms_quickship_carton_list'
		});

		var cartonDtlFilterArr = cartonDetailsSrch.filters;
		var cartonDetailsObj ;

		if(_isValueValid(transactionInternalId))
		{
		cartonDtlFilterArr.push(search.createFilter({
			name : 'internalid',
			join : 'createdfrom',
			operator : search.Operator.ANYOF,
			values : transactionInternalId
		}));
		}
		if( shipMethodArray.length > 0)
		{
		cartonDtlFilterArr.push(search.createFilter({
			name : 'shipmethod',
			operator : search.Operator.ANYOF,
			values : shipMethodArray
		}));
		}
		cartonDtlFilterArr.push(search.createFilter({
			name: 'location',
			operator: search.Operator.ANYOF,
			values: wareHouseLocation
		}));

		//this gets added during the carton Validation
		if(_isValueValid(cartonId))
		{
			cartonDtlFilterArr.push(search.createFilter({
				//name       : 'packagedescr', 
				//	join       : 'package',
				name       : 'contentsdescription',
				join          : 'shipmentpackage',
				operator  :  search.Operator.IS,
				values        : cartonId
			}));
		}

		cartonDetailsSrch.filters = cartonDtlFilterArr;
		var CartonListDetailsResult = _getSearchResultInJSON(cartonDetailsSrch);

		return CartonListDetailsResult;
	}
	function fnIsContainerLpExist(vContLpNo,vOrderNumber)
	{
		log.debug( 'Into IsContLpExist',vContLpNo);	
		var IsContLpExist='F';

		var manifestListSearch = search.load({id:'customsearch_wmsse_shipmanifest_details',
			type : 'customrecord_wmsse_ship_manifest' });

		manifestListSearch.filters.push(
				search.createFilter({
					name:'custrecord_wmsse_ship_contlp',
					operator:search.Operator.IS,
					values:vContLpNo
				})
		);
		if(_isValueValid(vOrderNumber))
			manifestListSearch.filters.push(
					search.createFilter({
						name:'custrecord_wmsse_ship_order',
						operator:search.Operator.ANYOF,
						values:vOrderNumber
					})
			);


		var	 manifestList = _getSearchResultInJSON(manifestListSearch);

		if(manifestList.length>0)
			IsContLpExist='T';		

		log.debug( 'Out of IsContLpExist',IsContLpExist);	

		return IsContLpExist;
	}
	function  orderDetailsList(ordNo,ordType,itemId) {
		log.debug( 'General Functions', 'In to OrderList');
		var searchName = '';
		if(ordType == 'TrnfrOrd')
			searchName = 'customsearch_wms_to_details_quickship';
		else
			searchName = 'customsearch_wms_so_details_quickship';

		var orderDetailsSearch = search.load({
			id:searchName
		});

		orderDetailsSearch.filters.push(
				search.createFilter({
					name:'Internalid',
					operator:search.Operator.IS,
					values:ordNo
				})
		);
		if(_isValueValid(itemId) && ordType != 'TrnfrOrd')
			orderDetailsSearch.filters.push(
					search.createFilter({
						name:'item',
						operator:search.Operator.ANYOF,
						values:itemId
					})
			);
		var	 searchresults = _getSearchResultInJSON(orderDetailsSearch);


		return searchresults;
	}
	function getSerViceLevel(carrier)
	{
		log.debug( 'carrier in GetSerViceLevel',carrier);	
		var servicelevelList='';
		var serviecLevlSearch = search.load({id:'customsearch_wmsse_getquickshipflag'});

		serviecLevlSearch.filters.push(search.createFilter({
			name:'custrecord_wmsse_carrier_nsmethod',
			operator:search.Operator.ANYOF,
			values:carrier
		}));

		servicelevelList = _getSearchResultInJSON(serviecLevlSearch);
		log.debug({title:'servicelevelList',details:servicelevelList});

		return servicelevelList;

	}

	function fnCreateShipManifestRecord(vordNo,vordName, vContLpNo,vCarrierType,vTrackingNo,vActualweight,PackageWeight,vOrderType,whlocation,
			itemFulfillementId,cartonSize,itemId) 
	{
		try {
			log.debug( 'into fnCreateShipManifestRecord','from inside');		
			log.debug( 'Order #',vordNo);
			log.debug( 'vordName #',vordName);
			log.debug( 'Container LP #',vContLpNo);	
			log.debug('Carrier Type',vCarrierType);	
			log.debug('vTrackingNo',vTrackingNo);
			log.debug('trantype', vOrderType);
			var shipManifestId  = '';
			var shipManifestArr  = [];
			if (_isValueValid( vordNo )) 
			{
				if(fnIsContainerLpExist(vContLpNo,vordNo)!='T')
				{
					var freightterms ="";
					var otherrefnum="";
					var vreference3 = "";
					var trantype = vOrderType;
					var  searchresults={};
					var useItemCostFlag =true;
					var servicelevelvalue
					searchresults = orderDetailsList(vordNo,trantype,itemId);
					if(searchresults!=null && searchresults!='')
					{
						vreference3 = searchresults[0]['tranid'];
						otherrefnum=searchresults[0]['otherrefnum'];
						servicelevelvalue= searchresults[0]['shipmethod'];
					}
					else
					{
						searchresults = orderDetailsList(vordNo,trantype);
						if(searchresults!=null && searchresults!='')
						{
							vreference3 = searchresults[0]['tranid'];
							otherrefnum=searchresults[0]['otherrefnum'];
							servicelevelvalue= searchresults[0]['shipmethod'];
						}
					}



					log.debug('OrderList details',searchresults);

					var ShipManifest = record.create({
						type: 'customrecord_wmsse_ship_manifest'
					});
					ShipManifest.setValue({
						fieldId : 'custrecord_wmsse_ship_order', 
						value : vordNo
					});
					ShipManifest.setValue({
						fieldId : 'custrecord_wmsse_ship_location', 
						value : whlocation
					});
					ShipManifest.setValue({
						fieldId : 'custrecord_wmsse_ship_nsconf_no', 
						value : itemFulfillementId
					});
					ShipManifest.setValue({
						fieldId : 'custrecord_wmsse_ship_pkgtype', 
						value : cartonSize
					});
					ShipManifest.setValue({
						fieldId : 'custrecord_wmsse_ship_orderno', 
						value :searchresults[0]['tranid']
					});

					ShipManifest.setValue({
						fieldId : 'custrecord_wmsse_ship_trackno',
						value :vTrackingNo
					});
					ShipManifest.setValue({
						fieldId: 'custrecord_wmsse_ship_masttrackno',
						value : vTrackingNo
					});
					ShipManifest.setValue({
						fieldId : 'custrecord_wmsse_ship_actwght',
						value :vActualweight
					});
					ShipManifest.setValue({
						fieldId : 'name',
						value :vordNo
					});
					ShipManifest.setValue({
						fieldId : 'custrecord_wmsse_ship_ordertype',
						value : searchresults[0]['custbody_wmsse_ordertypeText']
					});	
					ShipManifest.setValue({
						fieldId : 'custrecord_wmsse_ship_custom5',
						value : 'S'
					});
					ShipManifest.setValue({
						fieldId : 'custrecord_wmsse_ship_void',
						value : 'N'
					});
					ShipManifest.setValue({
						fieldId : 'custrecord_wmsse_ship_paymethod',
						value : freightterms
					});

					ShipManifest.setValue({
						fieldId : 'custrecord_wmsse_ship_ref2',
						value : otherrefnum
					});
					ShipManifest.setValue({
						fieldId : 'custrecord_wmsse_ship_pkgcount',
						value : 1
					});

					if(_isValueValid(servicelevelvalue))
					{
						var servicelevelList= getSerViceLevel(servicelevelvalue);
						if(servicelevelList.length>0)
						{
							vcarrier=servicelevelList[0]['custrecord_wmsse_carrier_id']; 

							ShipManifest.setValue({
								fieldId : 'custrecord_wmsse_ship_carrier',
								value :vcarrier
							});

							vserlevel=servicelevelList[0]['custrecord_wmsse_carrier_service_level']; 

							ShipManifest.setValue({
								fieldId : 'custrecord_wmsse_ship_servicelevel',
								value : vserlevel
							}); 
						}
					}
					//sales order specific code 
					if(trantype=="SalesOrd")
					{
						var contactName=searchresults[0]['entityText'];
						var entity=searchresults[0]['entityText'];
						if(_isValueValid( contactName))
							contactName=contactName.replace(","," ");

						if(_isValueValid( entity))
							entity=entity.replace(","," ");
						ShipManifest.setValue({
							fieldId : 'custrecord_wmsse_ship_contactname',
							value : contactName
						});		
						ShipManifest.setValue({
							fieldId : 'custrecord_wmsse_ship_city',
							value :searchresults[0]['shipcity']
						});
						ShipManifest.setValue({
							fieldId : 'custrecord_wmsse_ship_state',
							value :searchresults[0]['shipstate']
						});
						ShipManifest.setValue({
							fieldId : 'custrecord_wmsse_ship_country',
							value :searchresults[0]['shipcountry']
						});
						ShipManifest.setValue({
							fieldId : 'custrecord_wmsse_ship_phone',
							value : searchresults[0]['custbody_customer_phone']
						});

						var cashondelivery= searchresults[0]['custbody_wmsse_nswmscodflag'];
						ShipManifest.setValue({
							fieldId : 'custrecord_wmsse_ship_codflag',
							value : cashondelivery
						}); 
						ShipManifest.setValue({
							fieldId : 'custrecord_wmsse_ship_email',
							value : searchresults[0]['email']
						}); 

						var zipvalue=searchresults[0]['shipzip'];

						var consignee= searchresults[0]['shipaddressee']; 
						var shipcomplete=searchresults[0]['shipcomplete']; 
						var termscondition=searchresults[0]['terms']; 
						var address1=searchresults[0]['shipaddress1'];
						var address2=searchresults[0]['shipaddress2'];
						if(_isValueValid( address1) )
							address1=address1.replace(","," ");

						if(_isValueValid( address2))
							address2=address2.replace(","," ");

						ShipManifest.setValue({
							fieldId : 'custrecord_wmsse_ship_addr1',
							value : address1
						}); 
						ShipManifest.setValue({
							fieldId : 'custrecord_wmsse_ship_addr2',
							value : address2
						}); 

						var shiptotal="0.00";
						if((shipcomplete=="T")&&(termscondition=="C.O.D."))
						{
							ShipManifest.setValue({
								fieldId : 'custrecord_wmsse_ship_codflag',
								value : 'T'
							});  
							shiptotal=searchresults[0]['total'];
							ShipManifest.setValue({
								fieldId : 'custrecord_wmsse_ship_codamount',
								value : shiptotal
							});  
						}
						else
						{ ShipManifest.setValue({
							fieldId : 'custrecord_wmsse_ship_codflag',
							value : 'F'
						});  
						ShipManifest.setValue({
							fieldId : 'custrecord_wmsse_ship_codamount',
							value : shiptotal
						}); 

						}

						if(_isValueValid( consignee))
							ShipManifest.setValue({
								fieldId : 'custrecord_wmsse_ship_consignee',
								value : consignee
							});  
						else
							ShipManifest.setValue({
								fieldId : 'custrecord_wmsse_ship_consignee',
								value : entity
							});  

						ShipManifest.setValue({
							fieldId : 'custrecord_wmsse_ship_zip',
							value : zipvalue
						});  



					}

					else if(trantype=="TrnfrOrd")
					{
						var tolocation = searchresults[0]['transferlocation'];

						var locRecord = search.load({
							id: 'customsearch_wms_location_add_details'
						});
						var locationfilter= locRecord.filters;
						if(_isValueValid(tolocation))
						{
							locationfilter.push(search.createFilter({
								name : 'internalid',
								operator : search.Operator.ANYOF,
								values : tolocation
							}));
						}

						locRecord.filters = locationfilter;
						var locationSearchResults = _getSearchResultInJSON(locRecord);
						log.debug('locationSearchResults' , locationSearchResults);
						if(locationSearchResults !=null)
						{
							var shipfromaddress1 = locationSearchResults[0]['address1'];
							var shipfromaddress2 = locationSearchResults[0]['address2'];
							var shipfromcity =   locationSearchResults[0]['city'];
							var shipfromstate = locationSearchResults[0]['state'];
							var shipfromzipcode = locationSearchResults[0]['zip'];
							var shipfromcompanyname = locationSearchResults[0]['addressee'];
							var shipfromcountry = locationSearchResults[0]['country'];

							ShipManifest.setValue({
								fieldId : 'custrecord_wmsse_ship_city',
								value : shipfromcity
							}); 
							ShipManifest.setValue({
								fieldId : 'custrecord_wmsse_ship_state',
								value : shipfromstate
							}); 
							ShipManifest.setValue({
								fieldId : 'custrecord_wmsse_ship_country',
								value : shipfromcountry
							}); 
							ShipManifest.setValue({
								fieldId : 'custrecord_wmsse_ship_addr1',
								value : shipfromaddress1
							}); 
							ShipManifest.setValue({
								fieldId : 'custrecord_wmsse_ship_addr2',
								value : shipfromaddress2
							});
							ShipManifest.setValue({
								fieldId : 'custrecord_wmsse_ship_zip',
								value : shipfromzipcode
							});
						}
					}

					ShipManifest.setValue({
						fieldId : 'custrecord_wmsse_ship_contlp',
						value : vContLpNo
					});
					ShipManifest.setValue({
						fieldId : 'custrecord_wmsse_ship_ref5',
						value : vContLpNo
					});
					ShipManifest.setValue({
						fieldId : 'custrecord_wmsse_ship_ref3',
						value : vreference3
					});
					ShipManifest.setValue({
						fieldId : 'custrecord_ship_length',
						value : 1
					});
					ShipManifest.setValue({
						fieldId : 'custrecord_ship_width',
						value : 1
					});
					ShipManifest.setValue({
						fieldId : 'custrecord_ship_height',
						value : 1
					});
					if (_isValueValid(vContLpNo)) {

						if (PackageWeight == '0.0' || PackageWeight == '0.0000' || PackageWeight == 'undefined' || PackageWeight == '' || PackageWeight == 'NAN' || PackageWeight == 'NaN')
						{
							pakageweight='0.11';

						}
						ShipManifest.setValue({
							fieldId : 'custrecord_wmsse_ship_pkgwght',
							value : PackageWeight
						});
					}

					shipManifestId = ShipManifest.save();
					shipManifestArr.push(shipManifestId);

					if (trantype=="TrnfrOrd" )
						useItemCostFlag = searchresults[0]['istransferpricecosting'];

					shipManifestArr.push(useItemCostFlag);
					log.debug('ShipManifestId' , shipManifestId);
				}
				else
				{
					log.debug('in else' , vContLpNo );

					var shipManifestSearch = search.load({
						id:'customsearch_wmsse_shipmanifest_details',
						type : 'customrecord_wmsse_ship_manifest'
					});

					shipManifestSearch.filters.push(search.createFilter({
						name:'custrecord_wmsse_ship_contlp',
						operator:search.Operator.IS,
						values:vContLpNo
					}));
					shipManifestSearch.filters.push(search.createFilter({
						name:'custrecord_wmsse_ship_order',
						operator:search.Operator.ANYOF,
						values:vordNo
					}));

					var	manifestList = _getSearchResultInJSON(shipManifestSearch);
					log.debug('in else' , manifestList);
					log.debug('itemFulfillementId', itemFulfillementId);	       

					if(manifestList.length>0)
					{  
						shipManifestId = record.submitFields({
							type: 'customrecord_wmsse_ship_manifest',
							id: manifestList[0]['id'],
							values: {
								'custrecord_wmsse_ship_trackno': vTrackingNo,
								'custrecord_wmsse_ship_actwght': vActualweight,
								'custrecord_wmsse_ship_masttrackno': vTrackingNo,
								'custrecord_wmsse_ship_void': 'U'							
							}
						});
						log.debug('shipManifestId', shipManifestId);
					}
					shipManifestArr.push(shipManifestId);
				}	
			}
			log.debug('shipManifestArr --', shipManifestArr);
			return shipManifestArr;
		}

		catch (e) {	
			log.error('ERRROR' , e);
		}

	}
	function getMultiOrderWaveList(wareHouseLocation, currentUserId)
	{
		var waveDetailsSrch = search.load({
			id : 'customsearch_wms_multiorder_wave_list'
		});

		var waveDtlFilterArr = waveDetailsSrch.filters;

		waveDtlFilterArr.push(search.createFilter({
			name: 'location',
			operator: search.Operator.ANYOF,
			values: wareHouseLocation
		}));

		waveDtlFilterArr.push(search.createFilter({
			name: 'picker',
			operator: search.Operator.ANYOF,
			values:  ['@NONE@', currentUserId]
		}));		

		waveDtlFilterArr.filters = waveDtlFilterArr;
		var WaveListDetailsResult = _getSearchResultInJSON(waveDetailsSrch);

		return WaveListDetailsResult;
	}

	function getPickingWaveDetails(orderParams)
	{
		log.debug({title:'orderParams',details:orderParams});
		var getWaveName = orderParams['waveName'];		
		var strLocation = orderParams["whLocationId"];

		var waveSearch = '';


		waveSearch = search.load({id:'customsearch_wms_multiorder_wave_valid'});	


		var waveSearchFilters = waveSearch.filters;
		if(_isValueValid(getWaveName))
		{
			waveSearchFilters.push(search.createFilter({
				name:'waveName',				
				operator:search.Operator.IS,
				values:getWaveName}));
		}

		if(_isValueValid(strLocation))
		{
			waveSearchFilters.push(search.createFilter({
				name:'location',
				operator:search.Operator.ANYOF,
				values:['@NONE@',strLocation]}));
		}

		var currentUserID = runtime.getCurrentUser();	
		waveSearchFilters.push(search.createFilter({
			name:'picker',
			operator:search.Operator.ANYOF,
			values:['@NONE@',currentUserID.id]}));
		waveSearch.filters = waveSearchFilters;

		var	 objwaveSearchDetails = _getSearchResultInJSON(waveSearch);
		log.debug({title:'objwaveSearchDetails',details:objwaveSearchDetails});

		return objwaveSearchDetails;

	}







	function getMultiOrderContainerList(wareHouseLocation,itemName,transactionInternalId,currentUserId)
	{
		var containerDetailsSrch = search.load({
			id : 'customsearch_wms_multiorder_containr_lst'
		});

		var containerDtlFilterArr = containerDetailsSrch.filters;

		containerDtlFilterArr.push(search.createFilter({
			name: 'location',
			operator: search.Operator.ANYOF,
			values: wareHouseLocation
		}));		

		/*	containerDtlFilterArr.push(search.createFilter({
			name: 'item',
			operator: search.Operator.ANYOF,
			values: itemName
		}));	*/	

		containerDtlFilterArr.push(search.createFilter({
			name       : 'appliedtotransaction',
			join          : 'transaction',
			operator  : search.Operator.IS,
			values      : transactionInternalId
		}));			


		containerDtlFilterArr.filters = containerDtlFilterArr;
		var ContainerListDetailsResult = _getSearchResultInJSON(containerDetailsSrch);

		return ContainerListDetailsResult;
	}
	/*function getMultiOrderPickTaskOrderDetails(whLocationId,waveName,pickTaskInternalId)
	{
		var pickTaskSearch = search.load({id:'customsearch_wms_picktask_order_details'});
		var pickTaskFilters = pickTaskSearch.filters;

		if(_isValueValid(waveName))
		{
			pickTaskFilters.push(search.createFilter({
				name:'waveName',
				operator:search.Operator.IS,
				values:waveName
			}));
		}
		if(_isValueValid(whLocationId))
		{
			pickTaskFilters.push(search.createFilter({
				name:'location',
				operator:search.Operator.IS,
				values:['@NONE@',whLocationId] 
			}));
		}

		if(_isValueValid(pickTaskInternalId))
		{
			pickTaskFilters.push(search.createFilter({
				name:'internalId',
				operator:search.Operator.ANYOF,
				values:[pickTaskInternalId] 
			}));
		}

		pickTaskSearch.filters = pickTaskFilters;
		var	 objpicktaskSearchDetails = _getSearchResultInJSON(pickTaskSearch);
		log.debug({title:'Multi Order pickTaskSearch',details:objpicktaskSearchDetails});

		return objpicktaskSearchDetails;

	}*/

	function getMultiOrderStageItemList(whLocation,waveName, stageBinInternalId, containerEnabled)
	{
		var picktaskSearch = search.load({
			id : 'customsearch_wms_stage_item_list'
		});

		var picktaskSearchArr = picktaskSearch.filters;

		picktaskSearchArr.push(search.createFilter({
			name: 'location',
			operator: search.Operator.ANYOF,
			values: whLocation
		}));

		picktaskSearchArr.push(search.createFilter({
			name       : 'wavename',
			operator  : search.Operator.IS,
			values      : waveName
		}));	

		picktaskSearchArr.push(search.createFilter({
			name       : 'stagingbin',
			operator  : search.Operator.IS,
			values      : stageBinInternalId
		}));	

		picktaskSearchArr.filters = picktaskSearchArr;
		var pickTaskStgDtls = _getSearchResultInJSON(picktaskSearch);

		log.debug({title:'Stage Item Details :', details:pickTaskStgDtls});


		if(_isValueValid(containerEnabled) && containerEnabled == 'Y' && _isValueValid(pickTaskStgDtls) && pickTaskStgDtls.length!=0)
		{
			var stgOrderInternalIdArr = [];	

			for(var stgItr=0; stgItr<pickTaskStgDtls.length; stgItr++)
			{
				var stgOrderInternalIdArrObj = {};
				stgOrderInternalIdArrObj['internalid'] = pickTaskStgDtls[stgItr]['internalid'];
				stgOrderInternalIdArrObj['tranid'] = pickTaskStgDtls[stgItr]['tranid'];

				stgOrderInternalIdArr.push(stgOrderInternalIdArrObj);
			}
//			log.debug({title:'Order Id array :', details:stgOrderInternalIdArr});

			if(_isValueValid(stgOrderInternalIdArr) && stgOrderInternalIdArr.length > 0)
			{
				var stgItemContrListArr = [];
				var stgItmContrTempArr = [];

				for(var stgOrdItr =0; stgOrdItr < stgOrderInternalIdArr.length; stgOrdItr++)
				{
					var stgItemContrListObj = {};
					var orderId = stgOrderInternalIdArr[stgOrdItr]['internalid'];
//					log.debug({title:'Order Id :', details:orderId});

					var picktaskSearch = search.load({
						id : 'customsearch_wms_multiorder_containr_lst'
					});

					var picktaskSearchArr = picktaskSearch.filters;

					picktaskSearchArr.push(search.createFilter({
						name: 'location',
						operator: search.Operator.ANYOF,
						values: whLocation
					}));

					picktaskSearchArr.push(search.createFilter({
						name       : 'appliedtotransaction',
						join          : 'transaction',
						operator  : search.Operator.IS,
						values      : orderId
					}));	

					picktaskSearchArr.filters = picktaskSearchArr;
					var pickTaskStgContrDtls = _getSearchResultInJSON(picktaskSearch);

					log.debug({title:'container list :', details:pickTaskStgContrDtls});

					if(_isValueValid(pickTaskStgContrDtls) && pickTaskStgContrDtls.length > 0)
					{
						for(var stgContrItr=0; stgContrItr<pickTaskStgContrDtls.length; stgContrItr++)
						{
							var stgItmContrTempObj = {};
							stgItmContrTempObj['item']=pickTaskStgContrDtls[stgContrItr]['item'];
							stgItmContrTempObj['custrecord_wms_pickcarton']=pickTaskStgContrDtls[stgContrItr]['custrecord_wms_pickcarton'];
							stgItmContrTempObj['quantity']=pickTaskStgContrDtls[stgContrItr]['quantity'];
							stgItmContrTempObj['tranid']=stgOrderInternalIdArr[stgOrdItr]['tranid'];

							stgItmContrTempArr.push(stgItmContrTempObj);

						}
					}	

//					if(stgItmContrTempArr!='' || stgItmContrTempArr!=null || stgItmContrTempArr.length!=0)
//					{
//					stgItemContrListArr.push(stgItmContrTempArr);						
//					}
				}
			}
//			log.debug({title:'Stage Container Details :', details:stgItmContrTempArr});
		}

		if(containerEnabled == 'Y' && _isValueValid(stgItmContrTempArr)){

			var pickTaskStgDtlsArrr =[];
			if(stgItmContrTempArr.length!=0){
				log.debug({title:'Stage Container Details :', details:'Inside stage container arry return'});

				for(var i=0; i<stgItmContrTempArr.length; i++)
				{

//					log.debug({title:'stgItemContrListArr Details Container :', details:stgItmContrTempArr[i]['custrecord_wms_pickcontainer']});

					var pickTaskStgcontrDtls = {};
					pickTaskStgcontrDtls['item'] = stgItmContrTempArr[i]['item'];
					pickTaskStgcontrDtls['custrecord_wms_pickcarton'] = stgItmContrTempArr[i]['custrecord_wms_pickcarton'];
					pickTaskStgcontrDtls['lineitempickedquantity'] = stgItmContrTempArr[i]['quantity'];
					pickTaskStgcontrDtls['tranid'] = stgItmContrTempArr[i]['tranid'];

					pickTaskStgDtlsArrr.push(pickTaskStgcontrDtls);
				}
				log.debug({title:'Stage Container Array Details2 :', details:pickTaskStgDtlsArrr});
			}
			return pickTaskStgDtlsArrr;
		}else{
			return pickTaskStgDtls;
		}

	}

	function getOutboundStageBinDetails(locationId,processType)
	{
		var outboundStageBinResults = "";

		if(_isValueValid(locationId)) {

			var stageBinDetails = search.load({id:'customsearch_wms_pickstage_ob_bindtl'});

			var stageBinFilters  = stageBinDetails.filters;

			if(processType == 'workOrder')
			{
				stageBinFilters.push(search.createFilter({
					name: 'type',
					operator: search.Operator.ANYOF,
					values: 'WIP'
				}));
			}
			else
			{
				stageBinFilters.push(search.createFilter({
					name: 'type',
					operator: search.Operator.ANYOF,
					values: 'OUTBOUND_STAGING'
				}));
			}

			stageBinFilters.push(search.createFilter({
				name: 'location',
				operator: search.Operator.ANYOF,
				values: locationId
			}));

			stageBinDetails.filters = stageBinFilters;
			outboundStageBinResults  = _getSearchResultInJSON(stageBinDetails);
			log.debug({title:'outboundStageBinResults :',details:outboundStageBinResults});

		}
		return outboundStageBinResults;
	}


	function getShipmethods(){
		var shipMethodSearch = search.load({id:'customsearch_wmsse_getquickshipflag'});
		var	shipMethodSearchDetails = _getSearchResultInJSON(shipMethodSearch);    	

		return shipMethodSearchDetails;
	}
	function getAllprinternames(){
		var printerDetailsSearch = search.load({id:'customsearch_wms_printer_details_list'});
		var	searchresults = _getSearchResultInJSON(printerDetailsSearch);    	

		return searchresults;
	}
	function getLocationName(vRoleLocation)
	{
		var locationArray=[];
		var locationNameSearch = search.load({id:'customsearch_wmsse_whloc_srh'});

		if(_isValueValid(vRoleLocation))
			locationNameSearch.filters.push(search.createFilter({
				name:'internalid',
				operator:search.Operator.ANYOF,
				values:vRoleLocation
			})); 
		var searchresults = _getSearchResultInJSON(locationNameSearch);
		log.debug({title:'searchresults',details:searchresults});

		if(searchresults.length > 0)
		{
			for(var i=0;i<searchresults.length;i++)
			{
				locationArray[i]=new Array();
				locationArray[i][0]=searchresults[i]['id'];
				locationArray[i][1]=searchresults[i]['name'];
			}
		}

		return locationArray;
	}

	function bindPackingLinesSublist(form,sublistData,sublistCount,Shiparray,i,invDtlCount,tranType)
	{

		try {
			var pickQuantity=sublistData['quantity'];
			var packQuantity=sublistData['packQuantity'];
			var ActQuantity=parseFloat(pickQuantity)-parseFloat(packQuantity);

			var ExpQuantity=ActQuantity;
			var linenum= sublistData['line'];
			var	itemid=sublistData['itemText'];
			var	iteminternalid=sublistData['item'];
			//var vParentItemText = sublistData.getText('custrecord_wmsse_parent_sku_no',null,'group');
			//var vParentItemInternalId = sublistData.getValue('custrecord_wmsse_parent_sku_no',null,'group');
			var vShipMethod = sublistData['shipmethod'];
			var vShipMethodText = sublistData['shipmethodText'];
			var orderInternalId = sublistData['createdfrom'];
			var OrderNo =sublistData['createdfromText'];
			var vUnits = sublistData['unitText'];
			var location = sublistData['location'];
			var locationName = sublistData['locationText'];
			var itemfulfillId = sublistData['internalid'];	
			var itemfulfillnum = sublistData['transactionname'];	
			var shipAddress = sublistData['shipaddress'];	
			var entity = sublistData['entity'];	
			var entityName = sublistData['entityText'];	
			var shipCarrier = sublistData['shipcarrier'];
			var shipCarrierText = sublistData['shipcarrierText']; 

			if(!(_isValueValid(vShipMethod)))
				vShipMethod = '- None -';
			if(!(_isValueValid(vShipMethodText)))
				vShipMethodText = '- None -';
			if(!(_isValueValid(vUnits)))
				vUnits = '- None -';
			if(!(_isValueValid(shipAddress)))
				shipAddress = '- None -';
			if(!(_isValueValid(entity)))
				entity = '- None -';

			log.debug('locationName',locationName); 
			log.debug('vShipMethodText',vShipMethodText); 

			form.getSublist({ id :'custpage_packinglist'}).setSublistValue({
				id : 'custpage_listlineno',
				line : sublistCount,
				value : i
			});
			form.getSublist({ id :'custpage_packinglist'}).setSublistValue({
				id : 'custpage_orderinternalid',
				line : sublistCount,
				value : orderInternalId
			});
			form.getSublist({ id :'custpage_packinglist'}).setSublistValue({
				id : 'custpage_ordernumber',
				line : sublistCount,
				value : OrderNo
			});
			if(tranType == 'SalesOrd')
				form.getSublist({ id :'custpage_packinglist'}).setSublistValue({
					id : 'custpage_entityname',
					line : sublistCount,
					value : entityName
				});
			form.getSublist({ id :'custpage_packinglist'}).setSublistValue({
				id : 'custpage_fulfillnumber',
				line : sublistCount,
				value : itemfulfillnum
			});

			form.getSublist({ id :'custpage_packinglist'}).setSublistValue({
				id : 'custpage_skuinternalid',
				line : sublistCount,
				value : iteminternalid
			});
			form.getSublist({ id :'custpage_packinglist'}).setSublistValue({
				id : 'custpage_sku',
				line : sublistCount,
				value : itemid
			});
			form.getSublist({ id :'custpage_packinglist'}).setSublistValue({
				id : 'custpage_lineno',
				line : sublistCount,
				value : linenum
			});
			form.getSublist({ id :'custpage_packinglist'}).setSublistValue({
				id : 'custpage_pickqty',
				line : sublistCount,
				value : pickQuantity
			});
			form.getSublist({ id :'custpage_packinglist'}).setSublistValue({
				id : 'custpage_packqty',
				line : sublistCount,
				value : packQuantity
			});
			form.getSublist({ id :'custpage_packinglist'}).setSublistValue({
				id : 'custpage_actqty',
				line : sublistCount,
				value : ActQuantity
			});
			form.getSublist({ id :'custpage_packinglist'}).setSublistValue({
				id : 'custpage_actqtyhddn',
				line : sublistCount,
				value : ActQuantity
			});
			form.getSublist({ id :'custpage_packinglist'}).setSublistValue({
				id : 'custpage_expqtyhddn',
				line : sublistCount,
				value : ExpQuantity
			});
			form.getSublist({ id :'custpage_packinglist'}).setSublistValue({
				id : 'custpage_locationhddn',
				line : sublistCount,
				value : location
			});

			form.getSublist({ id :'custpage_packinglist'}).setSublistValue({
				id : 'custpage_shipmethodid',
				line : sublistCount,
				value : vShipMethod
			});
			form.getSublist({ id :'custpage_packinglist'}).setSublistValue({
				id : 'custpage_shipmethodtext',
				line : sublistCount,
				value : vShipMethodText
			});
			form.getSublist({ id :'custpage_packinglist'}).setSublistValue({
				id : 'custpage_shipmethodid',
				line : sublistCount,
				value : vShipMethod
			});
			form.getSublist({ id :'custpage_packinglist'}).setSublistValue({
				id : 'custpage_locationname',
				line : sublistCount,
				value : locationName
			});
			form.getSublist({ id :'custpage_packinglist'}).setSublistValue({
				id : 'custpage_itemfulfillid',
				line : sublistCount,
				value : itemfulfillId
			}); 
			form.getSublist({ id :'custpage_packinglist'}).setSublistValue({
				id : 'custpage_units',
				line : sublistCount,
				value : vUnits
			});
			form.getSublist({ id :'custpage_packinglist'}).setSublistValue({
				id : 'custpage_shipaddress',
				line : sublistCount,
				value : shipAddress
			});
			form.getSublist({ id :'custpage_packinglist'}).setSublistValue({
				id : 'custpage_entity',
				line : sublistCount,
				value : entity
			});
			form.getSublist({ id :'custpage_packinglist'}).setSublistValue({
				id : 'custpage_inventorydetailhdn',
				line : sublistCount,
				value : 'None'
			});
			form.getSublist({ id :'custpage_packinglist'}).setSublistValue({
				id : 'custpage_invdtlcount',
				line : sublistCount,
				value : invDtlCount
			});
			form.getSublist({ id :'custpage_packinglist'}).setSublistValue({
				id : 'custpage_shipcarriertext',
				line : sublistCount,
				value : shipCarrierText
			});
	       form.getSublist({ id :'custpage_packinglist'}).setSublistValue({
				id : 'custpage_shipcarrier',
				line : sublistCount,
				value : shipCarrier
			});
	       
		}
		catch(exp)
		{
			log.error( 'exp',exp);		

		}	
	}


	function updateItemfulfillment(objitemFulfillmentId,objitemfulfillmentIdLine,cartonNo,cartonWeight,objinvDetailData,useItemCostFlag)
	{ 
		log.debug('getRemainingUsage start --', runtime.getCurrentScript().getRemainingUsage());
		log.debug('useItemCostFlag --', useItemCostFlag);
		var inventoryStatusFeature = isInvStatusFeatureEnabled();
		var errItemFulfillId ='';		
		var itemFulfillmentIdArr = objitemFulfillmentId.split(',');

		var compSubRecord='';
		var setShipStatus = 'Y';
		var itemLineNo ='';
		var line=''
			var kitline='N';
		var kitIterator=1;
		var nonInvIterator=0;
		var nonInvline='N';
		for(var i=0;i<itemFulfillmentIdArr.length;i++)
		{ 

			var linenumArr = objitemfulfillmentIdLine[itemFulfillmentIdArr[i]].split(',');

			var frecord = record.load({
				type : 'itemfulfillment',
				id : itemFulfillmentIdArr[i],
				isDynamic: false
			});

			var totalLine = frecord.getLineCount({
				sublistId: 'package'
			});

			frecord.setSublistValue({sublistId: 'package',fieldId: 'packagedescr',line: totalLine ,value : cartonNo});
			frecord.setSublistValue({sublistId: 'package',fieldId: 'packageweight',line: totalLine ,value :cartonWeight});  

			for (var j = 0; j < linenumArr.length; j++) { 

				
				var kititem= frecord.getSublistValue({sublistId:'item',fieldId: 'kitmemberof',line: j+1});
				var kititemType= frecord.getSublistValue({sublistId:'item',fieldId: 'itemtype',line: j+1});

				

				if(kititemType=='Kit')
				{
					kitIterator++
				}
				if(kititemType=='NonInvtPart')
				{
					nonInvIterator++
				}
				if(kititemType=='NonInvtPart')
				{
					nonInvline='Y';
				}

				if(kititem!=null && kititem!='')
				{
					kitline='Y'
				}
				
				if(kitline=='N' && nonInvline=='N')
				{
					var line=(parseInt(linenumArr[j]));
				}
				else if(nonInvline=='Y' && kitline=='Y')
				{
					var line=(parseInt(linenumArr[j])+3);
				}
				else if(nonInvline=='Y' && kitline=='N')
				{
					var line=(parseInt(linenumArr[j])+2);
				}
				else
				{
					var line=(parseInt(linenumArr[j])-kitIterator);
				}
				
				if(useItemCostFlag)
					itemLineNo = parseInt((((line)+3)/3)-1);
				else
					itemLineNo = (((parseInt(line)+4)/4)-1);

				

				if(kitline=='N')
				{
					compSubRecord = frecord.getSublistSubrecord({
						sublistId	:'item',
						fieldId : 'inventorydetail',
						line : itemLineNo
					});
				}
				else if(nonInvline=='Y' && kitline=='Y' )
				{
					compSubRecord = frecord.getSublistSubrecord({
						sublistId	:'item',
						fieldId : 'inventorydetail',
						line : itemLineNo+nonInvIterator
					});
				}
				else
				{
					compSubRecord = frecord.getSublistSubrecord({
						sublistId	:'item',
						fieldId : 'inventorydetail',
						line : itemLineNo+kitIterator
					});
				}

				var complinelength =compSubRecord.getLineCount({
					sublistId:'inventoryassignment'
				});
				for (var n = 0; n < complinelength; n++) {

					var internalid = compSubRecord.getSublistValue({
						sublistId : 'inventoryassignment',
						fieldId : 'internalid', 
						line : n
					});

					var objlineNum	= objinvDetailData[itemFulfillmentIdArr[i]];

					var objinvdtl   = objlineNum[linenumArr[j]];

					if(objinvdtl[internalid]){
						var qtyArr = objinvdtl[internalid].split(',');
						compSubRecord.setSublistValue({
							sublistId : 'inventoryassignment',
							fieldId : 'custrecord_wmsse_packing_container', 
							line : n,
							value : cartonNo
						});
						if(qtyArr[0] != qtyArr[1]){
							setShipStatus = 'N';
							compSubRecord.setSublistValue({
								sublistId : 'inventoryassignment',
								fieldId : 'quantity', 
								line : n,
								value : qtyArr[0]
							});

							var sublistlength =compSubRecord.getLineCount({
								sublistId:'inventoryassignment'
							});

							var invNumber = compSubRecord.getSublistValue({
								sublistId : 'inventoryassignment',
								fieldId : 'issueinventorynumber', 
								line : n
							});
							var binnumber = compSubRecord.getSublistValue({
								sublistId : 'inventoryassignment',
								fieldId : 'binnumber', 
								line : n
							});
							if(inventoryStatusFeature)
								var status = compSubRecord.getSublistValue({
									sublistId : 'inventoryassignment',
									fieldId : 'status', 
									line : n
								});
							var expDate = compSubRecord.getSublistValue({
								sublistId : 'inventoryassignment',
								fieldId : 'expirationdate', 
								line : n
							});
							compSubRecord.insertLine({
								sublistId:	'inventoryassignment',
								line : sublistlength
							});
							compSubRecord.setSublistValue({
								sublistId : 'inventoryassignment',
								fieldId : 'issueinventorynumber', 
								line : sublistlength,
								value :invNumber
							});
							compSubRecord.setSublistValue({
								sublistId : 'inventoryassignment',
								fieldId : 'binnumber', 
								line : sublistlength,
								value :binnumber
							});
							if(inventoryStatusFeature)
								compSubRecord.setSublistValue({
									sublistId : 'inventoryassignment',
									fieldId : 'status', 
									line : sublistlength,
									value :status
								});

							compSubRecord.setSublistValue({
								sublistId : 'inventoryassignment',
								fieldId : 'expirationdate', 
								line : sublistlength,
								value :expDate
							});
							compSubRecord.setSublistValue({
								sublistId : 'inventoryassignment',
								fieldId : 'quantity', 
								line : sublistlength,
								value :qtyArr[1]-qtyArr[0]
							});

						}
					}
					if(_isValueValid(objinvdtl['total'])){

						var packCont= compSubRecord.getSublistValue({
							sublistId : 'inventoryassignment',
							fieldId : 'custrecord_wmsse_packing_container', 
							line : n
						}); 
						if(!(_isValueValid(packCont)))
							compSubRecord.setSublistValue({
								sublistId : 'inventoryassignment',
								fieldId : 'custrecord_wmsse_packing_container', 
								line : n,
								value : cartonNo
							});
					}
				}
			}
			var totalLine = frecord.getLineCount({
				sublistId: 'package'
			});
			for (var c = 0; c < totalLine; c++) { 

				var pckdtls = frecord.getSublistValue({sublistId: 'package',fieldId: 'packagedescr',line: c });
				var pckweight = frecord.getSublistValue({sublistId: 'package',fieldId: 'packageweight',line: c });  

				frecord.setSublistValue({sublistId: 'package',fieldId: 'packagedescr',line: c ,value : pckdtls});
				frecord.setSublistValue({sublistId: 'package',fieldId: 'packageweight',line: c ,value : pckweight});
			}

			if(setShipStatus == 'Y'){
				var totalItemLine = frecord.getLineCount({
					sublistId: 'item'
				});
				for (var j = 0; j < totalItemLine; j++) {
					if(setShipStatus == 'Y'){
						compSubRecord = frecord.getSublistSubrecord({
							sublistId	:'item',
							fieldId : 'inventorydetail',
							line : j
						});

						var complinelength =compSubRecord.getLineCount({
							sublistId:'inventoryassignment'
						});
						for (var n = 0; n < complinelength; n++) {

							var packContainer = compSubRecord.getSublistValue({
								sublistId : 'inventoryassignment',
								fieldId : 'custrecord_wmsse_packing_container', 
								line : n
							});	
							if(!(_isValueValid(packContainer)))
							{ setShipStatus = 'N';
							break;
							}
						}
					}
				}
				if(setShipStatus == 'Y')
					frecord.setValue('shipstatus','B'); 
			}
			try{
				var resultId = frecord.save();										
				if(!(_isValueValid(resultId)))
					errItemFulfillId = errItemFulfillId + ',' +itemFulfillmentIdArr[i];
			}catch (e)  {
				log.debug('e in Utility--',e);
				errItemFulfillId = errItemFulfillId + ',' +itemFulfillmentIdArr[i];
			}

		}
		log.debug('getRemainingUsage end --', runtime.getCurrentScript().getRemainingUsage());
		return errItemFulfillId;
	}




	function getMultiOrderPickTaskCompletedDetails(whLocationId,waveName,currentUser)
	{
		var pickTaskSearch = search.load({id:'customsearch_wms_multiorder_completelist'});
		var pickTaskFilters = pickTaskSearch.filters;

		if(_isValueValid(waveName))
		{
			pickTaskFilters.push(search.createFilter({
				name:'waveName',
				operator:search.Operator.IS,
				values:waveName
			}));
		}
		if(_isValueValid(whLocationId))
		{
			pickTaskFilters.push(search.createFilter({
				name:'location',
				operator:search.Operator.IS,
				values:['@NONE@',whLocationId] 
			}));
		}
		pickTaskFilters.push(search.createFilter({
			name:'picker',
			operator:search.Operator.ANYOF,
			values:['@NONE@',currentUser]
		}));

		pickTaskSearch.filters = pickTaskFilters;
		var	 objpicktaskSearchDetails = _getSearchResultInJSON(pickTaskSearch);
		log.debug({title:'Multi Order pickTaskSearch',details:objpicktaskSearchDetails});

		return objpicktaskSearchDetails;

	}

	function getMultiOrderPickTaskDetails(whLocationId,waveName,currentUser)
	{
		var pickTaskSearch = search.load({id:'customsearch_wms_multiorder_picktasklist'});
		var pickTaskFilters = pickTaskSearch.filters;

		if(_isValueValid(waveName))
		{
			pickTaskFilters.push(search.createFilter({
				name:'waveName',
				operator:search.Operator.IS,
				values:waveName
			}));
		}
		if(_isValueValid(whLocationId))
		{
			pickTaskFilters.push(search.createFilter({
				name:'location',
				operator:search.Operator.IS,
				values:['@NONE@',whLocationId] 
			}));
		}
		pickTaskFilters.push(search.createFilter({
			name:'picker',
			operator:search.Operator.ANYOF,
			values:['@NONE@',currentUser]
		}));

		pickTaskSearch.filters = pickTaskFilters;
		var	 objpicktaskSearchDetails = _getSearchResultInJSON(pickTaskSearch);
		log.debug({title:'Multi Order pickTaskSearch',details:objpicktaskSearchDetails});

		return objpicktaskSearchDetails;

	}
	function getMultiOrderPickTaskOrderDetails(whLocationId,waveName,pickTaskInternalId,transactionInternalArray,transactiontype,remainQty)
	{
		var pickTaskSearch = search.load({id:'customsearch_wms_picktask_order_details'});
		if(transactiontype!='' && transactiontype=='SalesOrd')
		{
			var pickTaskSearch = search.load({id:'customsearch_wms_picktask_order_details'});
		}
		else if(transactiontype!='' && transactiontype=='TrnfrOrd')
		{
			var pickTaskSearch = search.load({id:'customsearch_wms_picktask_to_order_dtls'});
		}
		//
		var pickTaskFilters = pickTaskSearch.filters;

		if(_isValueValid(waveName))
		{
			pickTaskFilters.push(search.createFilter({
				name:'waveName',
				operator:search.Operator.IS,
				values:waveName
			}));
		}
		if(_isValueValid(whLocationId))
		{
			pickTaskFilters.push(search.createFilter({
				name:'location',
				operator:search.Operator.ANYOF,
				values:['@NONE@',whLocationId] 
			}));
		}

		if(_isValueValid(pickTaskInternalId))
		{
			pickTaskFilters.push(search.createFilter({
				name:'internalId',
				operator:search.Operator.ANYOF,
				values:[pickTaskInternalId] 
			}));
		}

		if(_isValueValid(transactionInternalArray) && remainQty<=0)
		{
			log.debug({title:'transactionInternalArray',details:transactionInternalArray});
			pickTaskFilters.push(search.createFilter({
				name: 'internalId',
				join : 'transaction',
				operator: search.Operator.NONEOF,
				values:  transactionInternalArray
			}));
		}
		pickTaskSearch.filters = pickTaskFilters;
		var	 objpicktaskSearchDetails = _getSearchResultInJSON(pickTaskSearch);
		log.debug({title:'Multi Order pickTaskSearch',details:objpicktaskSearchDetails});

		return objpicktaskSearchDetails;

	}

	function getPickTaskStageflag(pickingType,waveName,ordId,whLocation){

		var orderSearch = search.load({id:'customsearch_wmsse_stagedetails'});

		var orderSearchFilters = orderSearch.filters;

		if(pickingType == 'multiOrder')
		{

			if(_isValueValid(waveName))
			{
				orderSearchFilters.push(search.createFilter({
					name:'wavename',
					operator:search.Operator.IS,
					values:waveName}));
			}
		}
		else
		{
			if(_isValueValid(ordId))
			{
				orderSearchFilters.push(search.createFilter({
					name:'internalid',
					join:'transaction',
					operator:search.Operator.IS,
					values:ordId}));
			}
		}

		if(_isValueValid(whLocation))
		{
			orderSearchFilters.push(search.createFilter({
				name:'location',
				operator:search.Operator.ANYOF,
				values:['@NONE@',whLocation]}));
		}

		orderSearch.filters = orderSearchFilters;

		var	 objOrderSearchDetails =  _getSearchResultInJSON(orderSearch);

		return objOrderSearchDetails;

	}


	function loadCyclePlanItemListForSeletedBin(cyclePlanId, warehouseLocationId, binInternalId, showCompletedFlag){
		var itemListSearch = search.load({
			id : 'customsearch_wms_cycle_plan_item_list'
		});
		itemListSearch.filters.push(
				search.createFilter({
					name: 'tranid',
					operator: search.Operator.IS,
					values:  cyclePlanId
				}));

		itemListSearch.filters.push(
				search.createFilter({
					name: 'location',
					operator: search.Operator.IS,
					values:  warehouseLocationId
				}));

		itemListSearch.filters.push(
				search.createFilter({
					name: 'internalid',
					join : 'binnumber',
					operator: search.Operator.IS,
					values:  binInternalId
				}));

		if(showCompletedFlag == 'true'){
			itemListSearch.filters.push(
					search.createFilter({
						name: 'quantity',
						operator: search.Operator.ISNOTEMPTY,
					}));
		}
		else{
			itemListSearch.filters.push(
					search.createFilter({
						name: 'quantity',
						operator: search.Operator.ISEMPTY,
					}));
		}

		return _getSearchResultInJSON(itemListSearch);
	}

	function createPacklistHtml(vOrdNo,trantype,salesorderdetails,vcontainerLp)
	{


		try
		{
			//var trantype = nlapiLookupField('transaction', vOrdNo, 'recordType');


			log.debug('trantype ',trantype);

			//var salesorderdetails =nlapiLoadRecord(trantype, vOrdNo);
			var salesorderdetails = record.load({type:trantype,
				id:vOrdNo

			});

			var billtoaddress=salesorderdetails.getValue({fieldId:'billaddress'});	        

			var shipaddress=salesorderdetails.getValue({fieldId:'shipaddress'}); 

			if((shipaddress!=null && shipaddress!=''))

			{
				shipaddress= shipaddress.replace(/\r\n/g, "<br />").replace(/\n/g, "<br />");
			}

			var orderdate=salesorderdetails.getText({fieldId:'trandate'});

			var ordernumber=salesorderdetails.getValue({fieldId:'tranid'});       

			var customerpo=salesorderdetails.getValue({fieldId:'otherrefnum'});

			var entity=salesorderdetails.getText({fieldId:'entity'});

			var locationId =salesorderdetails.getValue({fieldId:'location'});

			var shipmethod=salesorderdetails.getText({fieldId:'shipmethod'});

			var shipDate=salesorderdetails.getText({fieldId:'shipdate'});

			if((customerpo==null)||(customerpo==''))

			{

				customerpo="";

			}

			if((shipDate==null)||(shipDate==''))

			{

				shipDate="";

			}

			if((orderdate==null)||(orderdate==''))

			{
				orderdate="";

			}


			shipmethod=shipmethod.replace(/\s/g, "");

			if((shipmethod==null)||(shipmethod==''))

			{
				shipmethod="";

			}

			var FOB='';


			log.debug('location ',locationId);

			var shipaddressee="";var shipaddr1="";var shipaddr2="";var shipcity="";var shipcountry="";var shipstate="";var shipzip="";var shipstateandcountry="";




			shipaddressee=salesorderdetails.getValue({fieldId:'shipaddressee'});

			if(shipaddressee!=null && shipaddressee!='')

			{
				shipaddr1=salesorderdetails.getValue({fieldId:'shipaddr1'});

				shipaddr2=salesorderdetails.getValue({fieldId:'shipaddr2'});

				shipcity=salesorderdetails.getValue({fieldId:'shipcity'});

				shipcountry=salesorderdetails.getValue({fieldId:'shipcountry'});

				shipstate=salesorderdetails.getValue({fieldId:'shipstate'});

				shipzip=salesorderdetails.getValue({fieldId:'shipzip'});
			}

			if((shipaddressee==null)||(shipaddressee==''))

			{
				shipaddressee=shipaddress;

			}

			if((shipaddr1==null)||(shipaddr1==''))

			{
				shipaddr1="";

			}

			if((shipaddr2==null)||(shipaddr2==''))

			{
				shipaddr2="";

			}

			if((shipcity==null)||(shipcity==''))

			{
				shipcity="";

			}

			if((shipcountry==null)||(shipcountry==''))

			{

				shipcountry="";

			}

			if((shipstate==null)||(shipstate==''))

			{

				shipstate="";

			}

			if((shipzip==null)||(shipzip==''))

			{

				shipzip="";

			}
			if(shipaddressee!=null && shipaddressee!='')

			{
				shipaddr1=shipaddr1+", "+shipaddr2;

				shipstateandcountry=shipcity+" "+shipstate+" "+shipzip;
			}




			var domainName='NS WMS'; //= fndomainName();

			log.debug('domainName ',domainName);

			var getPackIfresults = search.load({
				id:'customsearch_wms_packlistord'
			});


			getPackIfresults.filters.push(
					search.createFilter({
						name:'createdfrom',
						join:'transaction',
						operator:search.Operator.IS,
						values:vOrdNo
					})
			);

			getPackIfresults.filters.push(
					search.createFilter({
						name:'custrecord_wmsse_packing_container',
						join:'inventoryDetailLines',
						operator:search.Operator.IS,
						values:vcontainerLp
					})
			);
			var	 groupopentasksearchresults = _getSearchResultInJSON(getPackIfresults);



			var appendcontlp="";

			var actualenddate="";

			var strVar="";

			var noofCartons=0; 

			if(groupopentasksearchresults!=null && groupopentasksearchresults!='' && groupopentasksearchresults.length>0)

			{           
				log.debug('groupopentasksearchresults.length ',groupopentasksearchresults.length);

				if(locationId==null || locationId=='')
				{

					locationId = groupopentasksearchresults[0]['location'];

				}

				//to get the Location address				

				var locationadress = record.load({type:'location',
					id:locationId

				});

				var billtoaddress=salesorderdetails.getValue({fieldId:'billaddress'});	

				var addr1="";var city="";var state="";var zip=""; var stateandzip=""; var returnadresse="";
				log.debug('locationId ',locationId);
				if(locationId!=null && locationId!='')
				{
					addr1=locationadress.getValue({fieldId:'addr1'});
					city=locationadress.getValue({fieldId:'city'});

					state=locationadress.getValue({fieldId:'state'});

					zip=locationadress.getValue({fieldId:'zip'});

					returnadresse=locationadress.getValue({fieldId:'addressee'});
					if(returnadresse==null || returnadresse=='')
						returnadresse=groupopentasksearchresults[0]['locationText'];
					log.debug('returnadresse ',returnadresse);
				}

				if((addr1==null)||(addr1==''))

				{

					addr1="";

				}

				if((city==null)||(city==''))

				{

					city="";

				}

				if((state==null)||(state==''))

				{

					state="";

				}

				if((zip==null)||(zip==''))

				{

					zip="";

				}

				if((returnadresse==null)||(returnadresse==''))

				{

					returnadresse="";

				}

				stateandzip=city+" "+state+" "+zip;

				var totalamount='';

				var groupcount=groupopentasksearchresults.length;

				var grouplength=0;

				var invoicetasklength=groupopentasksearchresults.length;

				var linenumber=1;

				var pagecount=1; 

				var totalinvoice=0; 

				var totalcount=groupopentasksearchresults.length;

				var totalshipqty=0;

				var totalcube=0;

				var totalweight=0;
				var vorderqty="";

				var strVar="";

				while(0<totalcount)

				{
					var count=0;

					var kititemcount=0;

					strVar +="<html>";



					strVar += " <body>";

					strVar += "    <table style=\"width: 100%;\">";

					strVar += "    <tr>";

					strVar += "    <td >";

					strVar += "    <table>";

					strVar += " <td align=\"left\" style=\"width: 65%;\">";

					strVar += "        <table style=\"width: 25%;\" align=\"left\">";

					strVar += "            <tr>";

					strVar += "                <td>";

					strVar += "                    <img src=\"headerimage\" width=\"320\" height=\"65\" />";

					strVar += "                </td>";

					strVar += "            </tr>";

					strVar += "            <tr>";

					strVar += "                <td style=\"font-size: 12px; font-family:Arial;\">";

					strVar += "                 <b>" + domainName + "</b>";

					strVar += "<br \/>" +returnadresse+" <br \/>" +addr1+" <br \/>" +stateandzip+"" ;                                        

					strVar += "                </td>";

					strVar += "            </tr>";                               

					strVar += "        </table>";

					strVar += "        </td>";

					strVar += " <td></td>";

					strVar += "    <td></td>";

					strVar += "<td style=\"width: 35%; font-family:Arial;\" valign=\"top\">";

					strVar += "        <b>";

					strVar += "            <h2 align=\"right\">";

					strVar += "                Packing Slip</h2>";

					strVar += "        </b>";

					strVar += "        <table style=\"width: 150px;\" frame=\"box\" rules=\"all\" align=\"right\" border=\"0\" cellpadding=\"0.5\"";

					strVar += "            cellspacing=\"0\">";

					strVar += "            <tr>";

					strVar += "                <td style=\"font-size: 14px; text-align: center; border-top: 1px solid black; border-right: 1px solid black;";

					strVar += "                    border-left: 1px solid black; border-bottom: 1px solid black;\">";

					strVar += "                    Order Date";                                           

					strVar += "                </td>";

					strVar += "            </tr>";

					strVar += "            <tr>";

					strVar += "                <td style=\"font-size: 12px; text-align: center; border-right: 1px solid black; border-left: 1px solid black;";

					strVar += "                    border-bottom: 1px solid black; height: 18px\">";

					strVar += "                                                                          "+orderdate+"";

					strVar += "                </td>";

					strVar += "            </tr>";

					strVar += "        </table>";

					strVar += "        </td>";





					strVar += "</table>";

					strVar += "    </td>";

					strVar += "   </tr>";

					strVar += "   <tr>";

					strVar += "<td align=\"left\" style=\"width: 100%;\">";                                 

					strVar += "        <table style=\"width: 100%\">";

					strVar += "            <tr>";

					strVar += "                <td>";

					strVar += "                    <table style=\"width: 55%;\" rules=\"all\" align=\"left\" border=\"0\" frame=\"box\">";

					strVar += "                        <tr>";

					strVar += "                            <td style=\"font-size: 15px; text-align: left; border-top: 1px solid black; border-right: 1px solid black;";

					strVar += "                                border-left: 1px solid black; border-bottom: 1px solid black; height:24px; font-family:Arial;\">";

					strVar += "                               &nbsp Ship To";

					strVar += "                            </td>";

					strVar += "                        </tr>";

					strVar += "                        <tr>";

					strVar += "                            <td style=\"font-size: 14px; text-align: left; border-right: 1px solid black; border-left: 1px solid black;";

					strVar += "                                border-bottom: 1px solid black; height: 80px;\" valign=\"top\">";

					strVar += "                                <table>";

					strVar += "                                    <tr>";

					strVar += "                                        <td style=\"font-size: 12px;\">";

					strVar += "                                                                                                                                                                          "+shipaddressee+"";

					strVar += "                                        </td>";

					strVar += "                                    </tr>";

					strVar += "                                    <tr>";

					strVar += "                                        <td style=\"font-size: 12px;\">";

					strVar += "                                                                                                                                                                          "+shipaddr1+"";

					strVar += "                                        </td>";

					strVar += "                                    </tr>";

					strVar += "                                    <tr>";

					strVar += "                                        <td style=\"font-size: 12px;\">";

					strVar += "                                                                                                                                                                          "+shipstateandcountry+"";

					strVar += "                                        </td>";

					strVar += "                                    </tr>";

					strVar += "                                </table>";

					strVar += "                            </td>";

					strVar += "                        </tr>";

					strVar += "                    </table>";

					strVar += "                </td>";

					strVar += "            </tr>";

					strVar += "            <br />";

					strVar += "            <tr>";

					strVar += "                <td>";

					strVar += "                    <table style=\"width: 100%;\" rules=\"all\" border=\"0\" frame=\"box\" cellpadding=\"0.5\"";

					strVar += "                        cellspacing=\"0\">";

					strVar += "                        <tr>";

					strVar += "                            <td style=\"font-size: 15px; text-align: left; border-top: 1px solid black; border-right: 1px solid black;";

					strVar += "                                border-left: 1px solid black; border-bottom: 1px solid black; height:24px; font-family:Arial;\">";

					strVar += "                                &nbsp Ship Date";

					strVar += "                            </td>";

					strVar += "                            <td style=\"font-size: 15px; text-align: left; border-top: 1px solid black; border-right: 1px solid black;";

					strVar += "                                border-bottom: 1px solid black; height:24px; font-family:Arial;\">";

					strVar += "                                 &nbsp Ship Via";

					strVar += "                            </td>";

					strVar += "                            <td style=\"font-size: 15px; text-align: left; border-top: 1px solid black; border-right: 1px solid black;";

					strVar += "                                border-bottom: 1px solid black; height:24px; font-family:Arial;\">";

					strVar += "                               &nbsp PO #";

					strVar += "                            </td>";

					strVar += "                            <td style=\"font-size: 15px; text-align: left; border-top: 1px solid black; border-right: 1px solid black;";

					strVar += "                                border-bottom: 1px solid black; height:24px; font-family:Arial;\">";

					strVar += "                               &nbsp Order # / Container #";

					strVar += "                            </td>";

					strVar += "                        </tr>";

					strVar += "                        <tr>";

					strVar += "                            <td style=\"font-size: 14px; text-align: left; border-right: 1px solid black; border-left: 1px solid black;";

					strVar += "                                border-bottom: 1px solid black; height: 22px;\">";

					strVar += "                                                                                                                          &nbsp"+shipDate+"";

					strVar += "                            </td>";

					strVar += "                            <td style=\"font-size: 14px; text-align: left; border-right: 1px solid black; border-bottom: 1px solid black;";

					strVar += "                                height: 22px;\">";

					strVar += "                                                                                                                          &nbsp"+shipmethod+"";

					strVar += "                            </td>";

					strVar += "                            <td style=\"font-size: 14px; text-align: left; border-right: 1px solid black; border-bottom: 1px solid black;";

					strVar += "                                height: 22px;\">";

					strVar += "                                                                                                                          &nbsp"+customerpo+"";

					strVar += "                            </td>";

					strVar += "                            <td style=\"font-size: 14px; text-align: left; border-right: 1px solid black; border-bottom: 1px solid black;";

					strVar += "                                height: 22px;\">";

					strVar += "                                                                                                                          &nbsp"+ordernumber+" /"+vcontainerLp+"";

					strVar += "                            </td>";

					strVar += "                        </tr>";

					strVar += "                    </table>";





					strVar += "                    <table style=\"width: 100%;\" rules=\"all\" border=\"0\" frame=\"box\" cellpadding=\"0.5\"";

					strVar += "                        cellspacing=\"0\">";

					strVar += "                        <tr>";

					strVar += "                            <td style=\"font-size: 15px; text-align: left; border-right: 1px solid black; border-left: 1px solid black;";

					strVar += "                                border-bottom: 1px solid black; height:24px; font-family:Arial;\">";

					strVar += "                               &nbsp Shipping Notes";

					strVar += "                            </td>";

					strVar += "                        </tr>";

					strVar += "                        <tr>";

					strVar += "                            <td style=\"font-size: 14px; text-align: left; border-right: 1px solid black; border-left: 1px solid black;";

					strVar += "                                border-bottom: 1px solid black; height: 22px;\">";



					strVar += "                            </td>";

					strVar += "                        </tr>";

					strVar += "                    </table>";





					strVar += "                    <table style=\"width: 100%;\" rules=\"all\" border=\"0\" frame=\"box\" cellpadding=\"0.5\"";

					strVar += "                        cellspacing=\"0\">";

					strVar += "                        <tr>";

					strVar += "                            <td style=\"font-size: 15px; text-align: center; border-right: 1px solid black; border-left: 1px solid black;";

					strVar += "                                border-bottom: 1px solid black; height:24px; font-family:Arial;\">";

					strVar += "                                Item #";

					strVar += "                            </td>";

					strVar += "                            <td style=\"font-size: 15px; text-align: left; border-right: 1px solid black; border-bottom: 1px solid black; height:24px; font-family:Arial;\">";

					strVar += "                               &nbsp Description";

					strVar += "                            </td>";

					strVar += "                            <td style=\"font-size: 15px; text-align: center; border-right: 1px solid black; border-bottom: 1px solid black; height:24px; font-family:Arial;\">";

					strVar += "                                Ordered";

					strVar += "                            </td>";

					strVar += "                            <td style=\"font-size: 15px; text-align: center; border-right: 1px solid black; border-bottom: 1px solid black; height:24px; font-family:Arial;\">";

					strVar += "                                Units";

					strVar += "                            </td>";

					strVar += "                            <td style=\"font-size: 15px; text-align: center; border-right: 1px solid black; border-bottom: 1px solid black; height:24px; font-family:Arial;\">";

					strVar += "                                Back Order";

					strVar += "                            </td>";

					strVar += "                            <td style=\"font-size: 15px; text-align: center; border-right: 1px solid black; border-bottom: 1px solid black; height:24px; font-family:Arial;\">";

					strVar += "                                Shipped";

					strVar += "                            </td>";

					strVar += "                        </tr>";

					//loop starts

					var repeatpartentsku;

					for(var g=grouplength; g<groupopentasksearchresults.length;g++)

					{


						count++;
						grouplength++;

						var itemText = groupopentasksearchresults[g]['itemText'];						
						var ItemId= groupopentasksearchresults [g]['item'];
						var lineno = groupopentasksearchresults[g]['line'];

						var totalactqty = groupopentasksearchresults[g]['quantity'];
						var totalqty = groupopentasksearchresults[g]['quantity'];

						log.debug('totalqty ',totalqty);
						var unitvalue = '';

						var backordervalue,decscription,suggestedprice;

						var parentskuitemid = groupopentasksearchresults[g]['item'];


						log.debug('groupopentasklineno ',lineno);


						if((parentskuitemid==null)||(parentskuitemid==''))

						{

							parentskuitemid=ItemId;

						}

						var parentitemSubtype = search.lookupFields({
							type: search.Type.ITEM,
							id: parentskuitemid,
							columns: ['type']
						});


						var parentitemtype=parentitemSubtype.type[0].value;

						var itemsubtype = search.lookupFields({
							type: search.Type.ITEM,
							id: ItemId,
							columns: ['type']
						});




						var itemtype=itemsubtype.type[0].value;


						log.debug('itemtype ',itemtype);
						log.debug('parentitemtype ',parentitemtype);
						if(parentitemtype!="Kit")

						{

							if(trantype!='transferorder')

							{

								var lineitemcount=salesorderdetails.getLineCount('item');
								log.debug('lineitemcount ',lineitemcount);
								for(var p=0;p<lineitemcount;p++)

								{
									var iteminternalid= salesorderdetails.getSublistValue({
										sublistId : 'item',
										fieldId : 'item', 
										line : p
									});
									var itemlineno= salesorderdetails.getSublistValue({
										sublistId : 'item',
										fieldId : 'line', 
										line : p
									});


									log.debug('itemlineno,lineno ',itemlineno+','+lineno);
									//if(iteminternalid==ItemId && lineno == itemlineno)
									if(iteminternalid==ItemId)
									{
										var vorderqty= salesorderdetails.getSublistValue({
											sublistId : 'item',
											fieldId : 'quantity', 
											line : p
										});

										var unitvalue= salesorderdetails.getSublistText({
											sublistId : 'item',
											fieldId : 'units', 
											line : p
										});

										backordervalue= salesorderdetails.getSublistValue({
											sublistId : 'item',
											fieldId : 'quantitybackordered', 
											line : p
										});

										decscription= salesorderdetails.getSublistValue({
											sublistId : 'item',
											fieldId : 'description', 
											line : p
										});



										break;

									}


								}

							}

							else

							{

								var lineitemcount=salesorderdetails.getLineCount('item');

								for(var p=0;p<lineitemcount;p++)

								{

									var iteminternalid= salesorderdetails.getSublistValue({
										sublistId : 'item',
										fieldId : 'item', 
										line : p
									});
									var itemlineno= salesorderdetails.getSublistValue({
										sublistId : 'item',
										fieldId : 'line', 
										line : p
									});
									if(iteminternalid==ItemId && lineno == itemlineno )

									{


										var vorderqty= salesorderdetails.getSublistValue({
											sublistId : 'item',
											fieldId : 'quantity', 
											line : p
										});

										var unitvalue= salesorderdetails.getSublistValue({
											sublistId : 'item',
											fieldId : 'units', 
											line : p
										});

										backordervalue= salesorderdetails.getSublistValue({
											sublistId : 'item',
											fieldId : 'quantitybackordered', 
											line : p
										});

										decscription= salesorderdetails.getSublistValue({
											sublistId : 'item',
											fieldId : 'description', 
											line : p
										});


										break;


									}

								}

							}

						}

						else
						{						
							if(trantype!='transferorder')

							{



								var lineitemcount=salesorderdetails.getLineCount('item');

								log.debug('lineitemcount ',lineitemcount);
								for(var p=0;p<lineitemcount;p++)
								{
									var iteminternalid= salesorderdetails.getSublistValue({
										sublistId : 'item',
										fieldId : 'item', 
										line : p
									});
									var itemlineno= salesorderdetails.getSublistValue({
										sublistId : 'item',
										fieldId : 'line', 
										line : p
									});


									log.debug('iteminternalid,parentskuitemid ',iteminternalid+','+ItemId);
									if(iteminternalid==parentskuitemid && lineno == itemlineno)
									{


										var vorderqty= salesorderdetails.getSublistValue({
											sublistId : 'item',
											fieldId : 'quantity', 
											line : p
										});

										var unitvalue= salesorderdetails.getSublistValue({
											sublistId : 'item',
											fieldId : 'units', 
											line : p
										});

										backordervalue= salesorderdetails.getSublistValue({
											sublistId : 'item',
											fieldId : 'quantitybackordered', 
											line : p
										});

										decscription= salesorderdetails.getSublistValue({
											sublistId : 'item',
											fieldId : 'description', 
											line : p
										});


										break;
									}
								}

							}
							else
							{
								var lineitemcount=salesorderdetails.getLineCount('item');

								for(var p=0;p<lineitemcount;p++)
								{
									var iteminternalid= salesorderdetails.getSublistValue({
										sublistId : 'item',
										fieldId : 'item', 
										line : p
									});
									var itemlineno= salesorderdetails.getSublistValue({
										sublistId : 'item',
										fieldId : 'line', 
										line : p
									});
									if(iteminternalid==ItemId && lineno == itemlineno )
									{

										var vorderqty= salesorderdetails.getSublistValue({
											sublistId : 'item',
											fieldId : 'quantity', 
											line : p
										});

										var unitvalue= salesorderdetails.getSublistValue({
											sublistId : 'item',
											fieldId : 'units', 
											line : p
										});

										backordervalue= salesorderdetails.getSublistValue({
											sublistId : 'item',
											fieldId : 'quantitybackordered', 
											line : p
										});

										decscription= salesorderdetails.getSublistValue({
											sublistId : 'item',
											fieldId : 'description', 
											line : p
										});

										break;
									}
								}

							}


							log.debug('vorderqty',vorderqty);						

						}
						//case 201412009
						if((decscription==null)||(decscription==''))

						{

							decscription="";

						}
						if((backordervalue==null)||(backordervalue==''))

						{

							backordervalue="";

						}
						// case # 201417313 

						if((vorderqty==null)||(vorderqty==''))

						{

							vorderqty=totalqty;

						}

//						end of  case # 201417313
						if(parentitemtype=="Kit")

						{




							var parentskudesc = search.lookupFields({
								type: search.Type.ITEM,
								id: parentskuitemid,
								columns: ['displayname']
							});

							var parentdescription=parentskudesc.displayname[0].value;


							kititemcount++;

							strVar += "<tr>";

							strVar += "<td style=\"font-size: 14px;font-family:Times New Roman; text-align: center; border-right: 1px solid black; border-left: 1px solid black;";

							strVar += " border-bottom: none; height:22px;\">";

							strVar += "                                                                                                                          "+parentsku+"";

							strVar += "</td>";

							strVar += "                            <td style=\"font-size: 12px; text-align: left; border-right: 1px solid black; border-bottom: none; height:22px;\">";

							strVar +=""+parentdescription+"";

							strVar += "                            </td>";

							strVar += "                            <td style=\"font-size: 12px; text-align: center; border-right: 1px solid black; border-bottom: none; height:22px;\">";

							strVar += "                                           &nbsp";

							strVar += "                            </td>";

							strVar += "                            <td style=\"font-size: 12px; text-align: center; border-right: 1px solid black; border-bottom: none; height:22px;\">";

							strVar += "                                           &nbsp ";

							strVar += "                            </td>";

							strVar += "                            <td style=\"font-size: 12px; text-align: center; border-right: 1px solid black; border-bottom: none; height:22px;\">";

							strVar +=" &nbsp";

							strVar += "                            </td>";

							strVar += "                            <td style=\"font-size: 12px; text-align: center; border-right: 1px solid black; border-bottom: none; height:22px;\">";

							strVar += "   &nbsp";

							strVar += "                            </td>";

							strVar += "                        </tr>";



						}

						if(itemtype!="Kit")

						{

							strVar += "                        <tr>";

							if(parentskuitemid==ItemId)

							{

								strVar += "                            <td style=\"font-size: 14px; text-align: left; border-right: 1px solid black; border-left: 1px solid black;";

								strVar += "                                border-bottom: none; height:22px;\">";

								strVar += "                                                                                                                         &nbsp"+itemText+"";

								strVar += "                            </td>";

							}

							else

							{

								strVar += "                            <td style=\"font-size: 14px; text-align: left; border-right: 1px solid black; border-left: 1px solid black;";

								strVar += "                                border-bottom: none; height:22px;\">";

								strVar += "                                                                                                          &nbsp"+itemText+"";

								strVar += "                            </td>";

							}

							if(parentskuitemid==ItemId)

							{

								strVar += "                            <td style=\"font-size: 12px; text-align: left; border-right: 1px solid black; border-bottom: none; height:22px;\">";
								strVar +="&nbsp"+decscription+"";

								strVar += "                            </td>";

							}

							else

							{

								strVar += "                            <td style=\"font-size: 12px; text-align: left; border-right: 1px solid black; border-bottom: none; height:22px;\">";

								strVar +="&nbsp"+decscription+"";

								strVar += "                            </td>";

							}

							//case:201417430
							strVar += "                            <td style=\"font-size: 12px; text-align: right; border-right: 1px solid black; border-bottom: none; height:22px;\">";

							strVar += "                                            "+vorderqty+" &nbsp";

							strVar += "                            </td>";
							//case:201417430
							strVar += "                            <td style=\"font-size: 12px; text-align: left; border-right: 1px solid black; border-bottom: none; height:22px;\">";

							strVar += "    &nbsp                 "+unitvalue+" &nbsp";

							strVar += "                            </td>";

							strVar += "                            <td style=\"font-size: 12px; text-align: right; border-right: 1px solid black; border-bottom: none; height:22px;\">";

							strVar +=" &nbsp"+backordervalue+" &nbsp";

							strVar += "                            </td>";

							strVar += "                            <td style=\"font-size: 12px; text-align: right; border-right: 1px solid black; border-bottom: none; height:22px;\">";

							strVar += "                                            "+totalactqty+" &nbsp";

							strVar += "                            </td>";

							strVar += "                        </tr>";
						}

						var pagebreakcount=parseInt(count)+parseInt(kititemcount);

						if(pagebreakcount==10)

						{

							break;

						}

						//Loop Ends

						//repeatpartentsku=parentsku;

					}



					// start of for Not Having lines



					var Height='';

					if(pagecount==1)

					{

						Height='230px';

					}

					if(pagecount>1)

					{

						Height='420px';

					}

					var recordCount=pagebreakcount;

					Height=parseInt(Height)-parseInt((recordCount*20));





					strVar += "                                    <tr>";

					strVar += "                                        <td style=\"font-size: 12px; text-align: left; border-right: 1px solid black; border-left: 1px solid black;";

					strVar += "                                            border-bottom: 1px solid black; height: "+Height+";\">";

					strVar += "                                        </td>";

					strVar += "                                        <td style=\"font-size: 12px; text-align: left; border-right: 1px solid black; border-bottom: 1px solid black;";

					strVar += "                                            height: 4px;\">";

					strVar += "                                        </td>";

					strVar += "                                        <td style=\"font-size: 12px; text-align: left; border-right: 1px solid black; border-bottom: 1px solid black;";

					strVar += "                                            height: 4px;\">";

					strVar += "                                        </td>";

					strVar += "                                        <td style=\"font-size: 12px; text-align: left; border-right: 1px solid black; border-bottom: 1px solid black;";

					strVar += "                                            height: 4px;\">";

					strVar += "                                        </td>";

					strVar += "                                        <td style=\"font-size: 12px; text-align: left; border-right: 1px solid black; border-bottom: 1px solid black;";

					strVar += "                                            height: 4px;\">";

					strVar += "                                        </td>";

					strVar += "                                        <td style=\"font-size: 12px; text-align: left; border-right: 1px solid black; border-bottom: 1px solid black;";

					strVar += "                                            height: 4px;\">";

					strVar += "                                        </td>";                  

					strVar += "                                    </tr>";



					// End of for Not Having lines



					strVar += "  </table>";

					strVar += "                </td>";

					strVar += "            </tr>";

					strVar += "        </table>";

					strVar += " </td>";

					strVar += "    </tr>";                                       



					strVar += " <tr>";

					strVar += "    <td>";

					strVar += "    <br \/>";

					strVar += "    ----------------------------------------------------------------------------------------------------------------------------";

					strVar += "    <br \/>";

					strVar += "    <br \/>    ";

					strVar += "    </td>";

					strVar += "    </tr>";





					strVar += "  <tr>";

					strVar += "   <td>";





					strVar += "        <table style=\"width: 45%;\" align=\"left\">";

					strVar += "<tr>";

					strVar += "            <td style=\"font-size: 15px;\">";

					strVar += "               <br \/>";

					strVar += "            </td>";

					strVar += "        </tr>";

					strVar += " <tr>";

					strVar += "            <td style=\"font-size: 13px; font-family:Arial;\">";

					strVar += "                <b>Ship Returns To<\/b>";

					strVar += "            </td>";

					strVar += "        </tr>";



					strVar += "            <tr>";

					strVar += "                <td style=\"font-size: 12px; \">";

					strVar +=""+returnadresse+" <br /> "+addr1+" <br /> "+stateandzip+" ";

					strVar += "                </td>";

					strVar += "            </tr>";



					strVar += "        </table>";


					strVar += "        <table style=\"width: 55%;\" align=\"right\">";                                   

					strVar += "            <tr>";

					strVar += "                <td style=\"font-size: 13px; font-family:Arial;\"><b>Customer Return From </b>";

					strVar += "                </td>";

					strVar += "                <td >";                                           

					strVar += "                </td>";

					strVar += "            </tr>";

					strVar += "            <tr>";

					strVar += "                <td style=\"font-size: 13px; font-family:Arial;\">";

					strVar += "                    <b>Customer </b>";

					strVar += "                </td>";

					strVar += "                <td style=\"font-size: 12px;\">";

					strVar += "                                                                                                                                                                          "+entity+"";

					strVar += "                </td>";

					strVar += "            </tr>";

					strVar += "            <tr>";

					strVar += "                <td style=\"font-size: 13px; font-family:Arial;\">";

					strVar += "                    <b>Order  </b>";

					strVar += "                </td>";

					strVar += "                <td style=\"font-size: 12px;\">";

					strVar +=""+ordernumber+"";

					strVar += "                </td>";

					strVar += "            </tr>";

					strVar += "            <tr>";

					strVar += "                <td style=\"font-size: 13px; font-family:Arial;\">";

					strVar += "                    <b>R.A. # </b>";

					strVar += "                </td>";

					strVar += "                <td>";

					strVar += "                </td>";

					strVar += "            </tr>";

					strVar += "        </table>";

					strVar += "        <br />";

					strVar += "        <br />";

					strVar += "        <br />";

					strVar += "        <br />";                                 

					strVar += " </td>";

					strVar += "     </tr>";



					strVar += " <tr>";

					strVar += "     <td>";

					strVar += "        <table style=\"width: 100%;\" frame=\"box\" rules=\"all\" align=\"right\" border=\"0\" cellpadding=\"0.5\"";

					strVar += "            cellspacing=\"0\">";

					strVar += "            <tr style=\"background-color: Gray;\">";

					strVar += "                <td style=\"font-size: 15px; text-align: left; color: white; border-top: 1px solid black;";

					strVar += "                    border-right: 1px solid black; border-left: 1px solid black; border-bottom: 1px solid black; font-family:Arial;\">";

					strVar += "                    &nbsp Item";

					strVar += "                </td>";

					strVar += "                <td style=\"font-size: 15px; text-align: left; color: white; border-top: 1px solid black;";

					strVar += "                    border-right: 1px solid black; border-bottom: 1px solid black; font-family:Arial;\">";

					strVar += "                    &nbsp Quantity";

					strVar += "                </td>";

					strVar += "                <td style=\"font-size: 15px; text-align: left; color: white; border-top: 1px solid black;";

					strVar += "                    border-right: 1px solid black; border-bottom: 1px solid black; font-family:Arial;\">";

					strVar += "                   &nbsp Reason For Returning";

					strVar += "                </td>";

					strVar += "            </tr>";

					strVar += "            <tr>";

					strVar += "                <td style=\"font-size: 16px; text-align: left; border-right: 1px solid black; border-left: 1px solid black;";

					strVar += "                    border-bottom: 1px solid black;\" height=\"55px\">";

					strVar += "                </td>";

					strVar += "                <td style=\"font-size: 16px; text-align: left; border-right: 1px solid black; border-bottom: 1px solid black;\"";

					strVar += "                    height=\"55px\">";

					strVar += "                </td>";

					strVar += "                <td style=\"font-size: 16px; text-align: left; border-right: 1px solid black; border-bottom: 1px solid black;\"";

					strVar += "                    valign=\"Top\">";

					strVar += "                </td>";

					strVar += "            </tr>";

					strVar += "        </table>";

					strVar += "</td>";

					strVar += "    </tr>";




					strVar += "        </table>";

					if(grouplength==groupopentasksearchresults.length)

					{

						strVar +="<p style=\" page-break-after:avoid\"></p>";

					}

					else

					{

						strVar +="<p style=\" page-break-after:always\"></p>";

					}

					strVar += " </body>";

					strVar += "        </html>";


					log.debug('totalcount',totalcount);

					totalcount=parseInt(totalcount)-parseInt(count);

					log.debug('totalcountafter',totalcount);
				}

				var tasktype='14';

				var labeltype='PackList';

				var print=false;

				var reprint=false;

				var company='';

				var location='';

				var formattype='html';



				var labelrecord = record.create({
					type: 'customrecord_wmsse_labelprinting',
					isDynamic: true
				});


				labelrecord.setValue({fieldId: 'name', value: vOrdNo});

				labelrecord.setValue({fieldId:'custrecord_wmsse_label_data',value:strVar}); 

				labelrecord.setValue({fieldId:'custrecord_wmsse_label_refno',value:ordernumber});    

				labelrecord.setValue({fieldId:'custrecord_wmsse_label_task_type',value:tasktype});//chkn task  

				labelrecord.setValue({fieldId:'custrecord_wmsse_label_type',value:labeltype});   

				labelrecord.setValue({fieldId:'custrecord_wmsse_label_lp',value:vcontainerLp});

				labelrecord.setValue({fieldId:'custrecord_wmse_label_print',value:print});

				labelrecord.setValue({fieldId:'custrecord_wmsse_label_reprint',value:reprint});

				var tranid = labelrecord.save();


			}
		}
		catch(exp) {

			log.debug('Exception in CreatePacklistHtml ',exp);

		}



	}



	function GenerateLabel(vWMSSeOrdNo,uompackflag,vContLpNo)
	{
		var uccText="";
		var duns="";
		var label="",uom="",uccLabel="";

		try 
		{	

			var prefixlength='0';

			if(prefixlength==0)
				label="000000000";
			else if(prefixlength==1)
				label="00000000"+lpMaxValue;
			else if(prefixlength==2)
				label="0000000"+lpMaxValue;
			else if(prefixlength==3)
				label="000000"+lpMaxValue;
			else if(prefixlength==4)
				label="00000"+lpMaxValue;
			else if(prefixlength==5)
				label="0000"+lpMaxValue;
			else if(prefixlength==6)
				label="000"+lpMaxValue;
			else if(prefixlength==7)
				label="00"+lpMaxValue;
			else if(prefixlength==8)
				label="0"+lpMaxValue;
			else if(prefixlength==9)
				label=lpMaxValue;

			//to get company id
			duns='15671';
			if(uompackflag == "1") 
				uom="0"; 
			else if(uompackflag == "3") 
				uom="2";
			else
				uom="0";		
			uccText=uom+duns+label;

			//to get chk digit
			var checkStr=uccText;
			var ARL=0;
			var BRL=0;
			var CheckDigitValue="";
			for (i = checkStr.length-1;  i > 0;  i--)
			{
				ARL = ARL+parseInt(checkStr.charAt(i));
				i--;
			}		
			ARL=ARL*3;
			for (i = checkStr.length-2;  i > 0;  i--)
			{
				BRL = BRL+parseInt(checkStr.charAt(i));
				i--;
			}		
			var sumOfARLBRL=ARL+BRL;
			var CheckDigit=0;

			while(CheckDigit<10)
			{
				if(sumOfARLBRL%10==0)
				{ 
					CheckDigitValue=CheckDigit; 
					break; 
				} 

				sumOfARLBRL++;
				CheckDigit++;
			}

			uccLabel="00"+uccText+CheckDigitValue.toString();



			var uccNo = record.create({
				type: 'customrecord_wmsse_ucc_master',
				isDynamic: true
			});


			uccNo.setValue({fieldId: 'name', value: vContLpNo});

			uccNo.setValue({fieldId:'custrecord_wmsse_contlp',value:vContLpNo}); 

			uccNo.setValue({fieldId:'custrecord_wmsse_uccno',value:uccLabel});    

			uccNo.setValue({fieldId:'custrecord_wmsse_orderno',value:vWMSSeOrdNo});		

			var recid = uccNo.save();


		} 
		catch (err) 
		{

		}
		return recid
	}

	function GenerateUCCLabel(vOrdNo,containerLpShip,salesorderrecords)
	{

		try
		{

			log.debug('vOrdNo ',vOrdNo);
			log.debug('containerLpShip ',containerLpShip);




			var location;
			var customername,customerpo;	
			var shiptoAddressee,shiptoAddress1,shiptoAddress2,shiptocity,shiptostate,shiptocountry,shiptocompany,shiptozipcode;

			customerpo=salesorderrecords.getValue({fieldId:'otherrefnum'});	       
			shiptoAddressee=salesorderrecords.getValue({fieldId:'shipaddressee'});
			shiptoAddress1=salesorderrecords.getValue({fieldId:'shipaddr1'});
			shiptoAddress2=salesorderrecords.getValue({fieldId:'shipaddr2'});

			shiptocity=salesorderrecords.getValue({fieldId:'shipcity'});
			shiptostate=salesorderrecords.getValue({fieldId:'shipstate'});
			shiptocountry=salesorderrecords.getValue({fieldId:'shipcountry'});
			shiptocompany=salesorderrecords.getValue({fieldId:'entity'});
			shiptozipcode=salesorderrecords.getValue({fieldId:'shipzip'});
			location=salesorderrecords.getValue({fieldId:'location'});


			var shipfromcity,shipfromcountry,shipfromzipcode,shipfromaddress,shipfromphone,shipfromstate;

			log.debug('location ',location);

			if(location !="" && location !=null)
			{
				var locationrecord = record.load({type:'location',
					id:location

				});
				log.debug('locationrecord ',locationrecord);

				shipfromaddress=locationrecord.getValue({fieldId:'addr1'});
				var addr2=locationrecord.getValue({fieldId:'addr2'});
				shipfromaddress=shipfromaddress+" " + addr2;
				shipfromcity=locationrecord.getValue({fieldId:'city'});
				shipfromstate=locationrecord.getValue({fieldId:'state'});
				shipfromzipcode =locationrecord.getValue({fieldId:'zip'});
				companyname=locationrecord.getValue({fieldId:'addressee'});
				shipfromphone=locationrecord.getValue({fieldId:'addrphone'});
				shipfromcountry =locationrecord.getValue({fieldId:'country'});


			}

			var uccnumber=getUCCNumber(containerLpShip);

			log.debug('uccnumber ',uccnumber);

			var ucc=uccnumber[0]['custrecord_wmsse_uccno'];

			var ExternalLabelRecord = record.create({
				type: 'customrecord_wmsse_ext_labelprinting',
				isDynamic: true
			});
			ExternalLabelRecord.setValue({fieldId: 'name', value: containerLpShip});			

			ExternalLabelRecord.setValue({fieldId:'custrecord_wmsse_label_addr1',value:shipfromaddress}); 
			ExternalLabelRecord.setValue({fieldId:'custrecord_wmsse_label_city',value:shipfromcity}); 
			ExternalLabelRecord.setValue({fieldId:'custrecord_wmsse_label_state',value:shipfromstate}); 
			ExternalLabelRecord.setValue({fieldId:'custrecord_wmsse_label_zip',value:shipfromzipcode}); 
			//ShipToAddress
			//ExternalLabelRecord.setFieldValue('custrecord_wmsse_label_shipaddressee',shipaddressee); 
			ExternalLabelRecord.setValue({fieldId:'custrecord_wmsse_label_shipaddr1',value:shiptoAddress1}); 
			//ExternalLabelRecord.setFieldValue('custrecord_wmsse_label_addr2',shiptoAddress2); 
			ExternalLabelRecord.setValue({fieldId:'custrecord_wmsse_label_shipcity',value:shiptocity}); 
			ExternalLabelRecord.setValue({fieldId:'custrecord_wmsse_label_shipstate',value:shiptostate}); 
			ExternalLabelRecord.setValue({fieldId:'custrecord_wmsse_label_shipcountry',value:shiptocountry}); 
			ExternalLabelRecord.setValue({fieldId:'custrecord_wmsse_label_shipzip',value:shiptozipcode}); 
			ExternalLabelRecord.setValue({fieldId:'custrecord_wmsse_label_custom1',value:customerpo});
			ExternalLabelRecord.setValue({fieldId:'custrecord_wmsse_label_licenseplatenum',value:ucc});
			ExternalLabelRecord.setValue({fieldId:'custrecord_wmsse_ext_location',value:location});

			var tranid = ExternalLabelRecord.save();

			log.debug('internalid ',tranid);
		}
		catch(ex)
		{
			log.debug('Exception in GenerateExtUCCLabel ',ex);

		}
	}


	function GenerateZebraUccLabel(vWMSSeOrdNo,containerLpShip,salesorderrecord,whLocation)
	{



		log.debug('vOrderNo ',vWMSSeOrdNo);
		log.debug('cartonnumber ',containerLpShip);

		//var salesorderrecord=nlapiLoadRecord('salesorder', vWMSSeOrdNo);
		var labeltype="UCCLABEL";
		var shiptocompanyid=salesorderrecord.getValue({fieldId:'entity'});

		var labeldata=GetSELabelTemplate("",labeltype);
		var location;
		var customername,customerpo;	
		if(labeldata!=null && labeldata!="")
		{
			var uccnumbersearchresults=getUCCNumber(containerLpShip);
			var uccnumber="";

			if(uccnumbersearchresults!=null && uccnumbersearchresults!="")
			{
				uccnumber=uccnumbersearchresults[0]['custrecord_wmsse_uccno'];
			}
			var labelcount="";

			log.debug('uccnumber ',uccnumber);
			GenerateZebraLabel(labeltype,labeldata,uccnumber,vWMSSeOrdNo,"",labelcount,salesorderrecord,containerLpShip,whLocation);

		}
	}


	function GenerateZebraLabel(labeltype,Label,ucc,vWMSSeOrdNo,skuname,labelcount,salesorderrecord,containerLpShip,whLocation)
	{

		try
		{
			//shiptocompanyAdress	

			var shiptocity=salesorderrecord.getValue({fieldId:'shipcity'});
			var shiptostate=salesorderrecord.getValue({fieldId:'shipstate'});
			var shiptocountry=salesorderrecord.getValue({fieldId:'shipcountry'});
			var shiptocompany=salesorderrecord.getValue({fieldId:'shipaddressee'});
			var shiptozipcode=salesorderrecord.getValue({fieldId:'shipzip'});
			var shiptoAddress2=salesorderrecord.getValue({fieldId:'shipaddr2'});
			var shiptoAddress1=salesorderrecord.getValue({fieldId:'shipaddr1'});			
			log.debug('shiptoAddress1 ',shiptoAddress1);
			var customerpo=salesorderrecord.getValue({fieldId:'otherrefnum'});
			var location=salesorderrecord.getValue({fieldId:'location'});
			var shiptocompanyid=salesorderrecord.getValue({fieldId:'entity'});


			var customerpo=salesorderrecord.getValue({fieldId:'otherrefnum'});
			//var location=salesorderrecord.getFieldValue('location');
			var shipcarrier=salesorderrecord.getValue({fieldId:'shipmethod'});
			var shiptocompanyid=salesorderrecord.getValue({fieldId:'entity'});
			location=whLocation;


			log.debug('location ',location);


			var locationrecord = record.load({type:'location',
				id:location
			});
			log.debug('locationrecord ',locationrecord);
			var salesorder=salesorderrecord.getValue({fieldId:'tranid'});
			var shipfromaddress1=locationrecord.getValue({fieldId:'addr1'});
			var shipfromaddress2=locationrecord.getValue({fieldId:'addr2'});
			var shipfromcity=locationrecord.getValue({fieldId:'city'});
			var shipfromstate=locationrecord.getValue({fieldId:'state'});
			var shipfromzipcode =locationrecord.getValue({fieldId:'zip'});
			var shipfromcompanyname=locationrecord.getValue({fieldId:'addressee'});
			var shipfromcountry =locationrecord.getValue({fieldId:'country'});
			//This code not in Dev.Code For Production Dynacraft
			var shipfromaddress3=locationrecord.getValue({fieldId:'addr3'});

			var shipdate=DateStamp();
			if((shiptoAddress1!=null)&&(shiptoAddress1!=""))
			{
				Label =Label.replace(/parameter01/,shiptoAddress1);
			}
			else
			{
				Label =Label.replace(/parameter01/,'');
			}
			if((shiptoAddress2!=null)&&(shiptoAddress2!=""))
			{
				Label =Label.replace(/parameter02/,shiptoAddress2);
			}
			else
			{
				Label =Label.replace(/parameter02/,'');
			}
			if((shiptocity!=null)&&(shiptocity!=""))
			{
				Label =Label.replace(/parameter03/,shiptocity);
			}
			else
			{
				Label =Label.replace(/parameter03/,'');
			}
			if((shiptostate!=null)&&(shiptostate!=""))
			{
				Label =Label.replace(/parameter04/,shiptostate);
			}
			else
			{
				Label =Label.replace(/parameter04/,'');
			}
			if((shiptocountry!=null)&&(shiptocountry!=""))
			{
				Label =Label.replace(/parameter05/,shiptocountry);
			}
			else
			{
				Label =Label.replace(/parameter05/,'');
			}
			if((shiptozipcode!=null)&&(shiptozipcode!=""))
			{
				Label =Label.replace(/parameter06/g,shiptozipcode);
			}
			else
			{  
				Label =Label.replace(/parameter06/g,'');
			}


			if((shiptocompany!=null)&&(shiptocompany!=""))
			{
				Label =Label.replace(/parameter07/g,shiptocompany);
			}
			else
			{
				Label =Label.replace(/parameter07/g,'');
			}


			if((shipfromaddress1!=null)&&(shipfromaddress1!=""))
			{
				Label =Label.replace(/parameter08/,shipfromaddress1);
			}
			else
			{
				Label =Label.replace(/parameter08/,'');
			}
			if((shipfromaddress2!=null)&&(shipfromaddress2!=""))
			{
				Label =Label.replace(/parameter09/,shipfromaddress2);
			}
			else
			{
				Label =Label.replace(/parameter09/,'');
			}
			if((shipfromcity!=null) &&(shipfromcity!=""))
			{
				Label =Label.replace(/parameter10/,shipfromcity);
			}
			else
			{
				Label =Label.replace(/parameter10/,'');
			}
			if((shipfromstate!=null)&&(shipfromstate!=""))
			{
				Label =Label.replace(/parameter11/,shipfromstate);
			}
			else
			{
				Label =Label.replace(/parameter11/,'');

			}
			if((shipfromcountry!=null) && (shipfromcountry!=""))
			{
				Label =Label.replace(/parameter12/,shipfromcountry);
			}
			else
			{
				Label =Label.replace(/parameter12/,'');
			}
			if((shipfromzipcode!=null) && (shipfromzipcode!=""))
			{
				Label =Label.replace(/parameter13/,shipfromzipcode);
			}
			else
			{
				Label =Label.replace(/parameter13/,'');
			}
			if((customerpo!=null)&&(customerpo!=""))
			{
				Label =Label.replace(/parameter14/g,customerpo);
			}
			else
			{
				Label =Label.replace(/parameter14/g,'');
			}


			if((shipcarrier!=null)&&(shipcarrier!=""))
			{
				Label =Label.replace(/parameter15/,shipcarrier);
			}
			else
			{
				Label =Label.replace(/parameter15/,'');
			}


			if((salesorder!=null)&&(salesorder!=""))
			{
				Label =Label.replace(/parameter16/g,salesorder);
			}
			else
			{
				Label =Label.replace(/parameter16/g,'');
			}

			if((skuname!=null)&&(skuname!=""))
			{
				Label =Label.replace(/parameter17/,skuname);
			}
			else
			{
				Label =Label.replace(/parameter17/,'');
			}
			if((ucc!=null)&&(ucc!=""))
			{
				Label =Label.replace(/parameter18/g,ucc);
			}
			else
			{
				Label =Label.replace(/parameter18/g,'');
			}
			if((shipfromcompanyname!=null)&&(shipfromcompanyname!=""))
			{
				Label =Label.replace(/parameter19/,shipfromcompanyname);
			}
			else
			{
				Label =Label.replace(/parameter19/,'');
			}
			if((shipdate!=null)&&(shipdate!=""))
			{
				Label =Label.replace(/parameter20/,shipdate);
			}
			else
			{
				Label =Label.replace(/parameter20/,'');
			}

			var print=false;
			var reprint=false;
			var refno="";
			var printername="";	
			//printername=GetLabelSpecificPrintername(labeltype,whLocation);
			CreateLabelData(Label,labeltype,refno,print,reprint,shiptocompanyid,salesorder,skuname,labelcount,printername,containerLpShip,whLocation);
		}
		catch(ex)
		{
			log.debug('Exception in GenerateZebraLabel ',ex);


		}
	}
	function CreateLabelData(labeldata,labeltype,refno,print,reprint,company,salesorder,skuname,labelcount,printername,containerLpShip,location)
	{
		try
		{

			var labelrecord = record.create({
				type: 'customrecord_wmsse_labelprinting',
				isDynamic: true
			});

			labelrecord.setValue({fieldId:'name', value:salesorder}); 
			labelrecord.setValue({fieldId:'custrecord_wmsse_label_data',value:labeldata});  
			labelrecord.setValue({fieldId:'custrecord_wmsse_label_refno',value:labeltype});     

			labelrecord.setValue({fieldId:'custrecord_wmsse_label_type',value:"ZEBRALABEL"});                                                                                                                                                                     
			labelrecord.setValue({fieldId:'custrecord_wmse_label_print', value:print});
			labelrecord.setValue({fieldId:'custrecord_wmsse_label_reprint', value:reprint});
			labelrecord.setValue({fieldId:'custrecord_wmsse_label_lp', value:containerLpShip});

			labelrecord.setValue({fieldId:'custrecord_wmsse_label_printername', value:printername});
			labelrecord.setValue({fieldId:'custrecord_wmsse_label_location', value:location});
			var tranid = labelrecord.save();

			log.debug('recordid ',tranid);

		}
		catch(ex)
		{
			log.debug('Exception in CreateLabelData ',ex);

		}
	}

	function GenerateZebraAddressLabel(vWMSSeOrdNo,salesorderrecord,whLocation)
	{

		log.debug('vWMSSeOrdNo ',vWMSSeOrdNo);


		var labeltype="ADDRESSLABEL";
		var labeldata=GetSELabelTemplate("",labeltype);
		var location;
		var customername,customerpo;	
		var labelcount="";
		if(labeldata!=null && labeldata!="")
		{
			GenerateZebraLabel(labeltype,labeldata,"",vWMSSeOrdNo,"",labelcount,salesorderrecord,"",whLocation);
		}
	}

	function fngethtmlstring(soid,containerlp,isbulkpack,whLocation)
	{

		var getLabelresults = search.create({			
			type:"customrecord_wmsse_labelprinting",			   
			//id: 'customrecord_wmsse_labelprinting',

			columns: [{
				name: 'custrecord_wmsse_label_data'
			}],
			filters: [{
				name: 'custrecord_wmsse_label_lp',
				operator: 'is',
				values: containerlp},

				{ name: 'custrecord_wmsse_label_type',
					operator: 'is',
					values: 'PackList'
				}]
		});





		var Labelprintingsearchrec = [];
		var search_page_count = 100;

		var myPagedData = getLabelresults.runPaged({
			pageSize: search_page_count
		});
		myPagedData.pageRanges.forEach(function (pageRange) {
			var myPage = myPagedData.fetch({
				index: pageRange.index
			});
			myPage.data.forEach(function (result) {
				Labelprintingsearchrec.push(result);
			});
		});

		log.error('Labelprintingsearchrec', Labelprintingsearchrec);


		var strHtmlString="";
		if(Labelprintingsearchrec.length >0)
		{
			log.error('Labelprintingsearchrec.length', Labelprintingsearchrec.length);
			for(var m=0; m < Labelprintingsearchrec.length; m++)
			{
				strHtmlString = Labelprintingsearchrec[m].getValue('custrecord_wmsse_label_data');			
			}
		}
		log.error('strHtmlString', strHtmlString);
		return strHtmlString;

	}

	function getUCCNumber(containerLpShip)
	{

		var getUccresults = search.load({
			id:'customsearch_wms_ucc_labeldata'
		});


		getUccresults.filters.push(
				search.createFilter({
					name:'custrecord_wmsse_contlp',					
					operator:search.Operator.IS,
					values:containerLpShip
				})
		);

		var	 searchResults = _getSearchResultInJSON(getUccresults);


		return searchResults;
	}

	function GetSELabelTemplate(shiptocompanyid,labeltype)
	{

		log.debug('GetLabelTemplate','GetLabelTemplate');
		log.debug('shiptocompanyid',shiptocompanyid);


		var gettemplatedata = search.load({
			id:'customsearch_wms_label_templatedata'
		});
		if((shiptocompanyid!=null)&&(shiptocompanyid!=""))
		{
			gettemplatedata.filters.push(
					search.createFilter({
						name:'custrecord_wmsse_labeltemplate_name',					
						operator:search.Operator.ANYOF,
						values:shiptocompanyid
					})
			);

			gettemplatedata.filters.push(
					search.createFilter({
						name:'name',					
						operator:search.Operator.IS,
						values:labeltype
					})
			);
		}

		var searchtemplate= _getSearchResultInJSON(gettemplatedata);
		var Label="";
		if((searchtemplate !=null)&&(searchtemplate!=""))
		{
			log.debug('searchtemplate',searchtemplate);
			Label=searchtemplate[0]['custrecord_wmsse_labeltemplate_data'];
		}	
		Label='<html> <body> <table style="width: 100%;"> <tr> <td > <table> <td align="left" style="width: 65%;"> <table style="width: 25%;" align="left"> <tr> <td> <img src="headerimage" width="320" height="65" /> </td> </tr> <tr> <td style="font-size: 12px; font-family:Arial;"> <b>NS WMS</b><br />Hyderabad <br /> <br /> </td> </tr> </table> </td> <td></td> <td></td><td style="width: 35%; font-family:Arial;" valign="top"> <b> <h2 align="right"> Packing Slip</h2> </b> <table style="width: 150px;" frame="box" rules="all" align="right" border="0" cellpadding="0.5" cellspacing="0"> <tr> <td style="font-size: 14px; text-align: center; border-top: 1px solid black; border-right: 1px solid black; border-left: 1px solid black; border-bottom: 1px solid black;"> Order Date </td> </tr> <tr> <td style="font-size: 12px; text-align: center; border-right: 1px solid black; border-left: 1px solid black; border-bottom: 1px solid black; height: 18px"> Wed Jan 09 2019 00:00:00 GMT-0800 (PST) </td> </tr> </table> </td></table> </td> </tr> <tr><td align="left" style="width: 100%;"> <table style="width: 100%"> <tr> <td> <table style="width: 55%;" rules="all" align="left" border="0" frame="box"> <tr> <td style="font-size: 15px; text-align: left; border-top: 1px solid black; border-right: 1px solid black; border-left: 1px solid black; border-bottom: 1px solid black; height:24px; font-family:Arial;"> &nbsp Ship To </td> </tr> <tr> <td style="font-size: 14px; text-align: left; border-right: 1px solid black; border-left: 1px solid black; border-bottom: 1px solid black; height: 80px;" valign="top"> <table> <tr> <td style="font-size: 12px;"> </td> </tr> <tr> <td style="font-size: 12px;"> , </td> </tr> <tr> <td style="font-size: 12px;"> </td> </tr> </table> </td> </tr> </table> </td> </tr> <br /> <tr> <td> <table style="width: 100%;" rules="all" border="0" frame="box" cellpadding="0.5" cellspacing="0"> <tr> <td style="font-size: 15px; text-align: left; border-top: 1px solid black; border-right: 1px solid black; border-left: 1px solid black; border-bottom: 1px solid black; height:24px; font-family:Arial;"> &nbsp Ship Date </td> <td style="font-size: 15px; text-align: left; border-top: 1px solid black; border-right: 1px solid black; border-bottom: 1px solid black; height:24px; font-family:Arial;"> &nbsp Ship Via </td> <td style="font-size: 15px; text-align: left; border-top: 1px solid black; border-right: 1px solid black; border-bottom: 1px solid black; height:24px; font-family:Arial;"> &nbsp PO # </td> <td style="font-size: 15px; text-align: left; border-top: 1px solid black; border-right: 1px solid black; border-bottom: 1px solid black; height:24px; font-family:Arial;"> &nbsp Order # / Container # </td> </tr> <tr> <td style="font-size: 14px; text-align: left; border-right: 1px solid black; border-left: 1px solid black; border-bottom: 1px solid black; height: 22px;"> &nbspWed Jan 09 2019 00:00:00 GMT-0800 (PST) </td> <td style="font-size: 14px; text-align: left; border-right: 1px solid black; border-bottom: 1px solid black; height: 22px;"> &nbsp3 </td> <td style="font-size: 14px; text-align: left; border-right: 1px solid black; border-bottom: 1px solid black; height: 22px;"> &nbsp </td> <td style="font-size: 14px; text-align: left; border-right: 1px solid black; border-bottom: 1px solid black; height: 22px;"> &nbspSO35 /cart34363 </td> </tr> </table> <table style="width: 100%;" rules="all" border="0" frame="box" cellpadding="0.5" cellspacing="0"> <tr> <td style="font-size: 15px; text-align: left; border-right: 1px solid black; border-left: 1px solid black; border-bottom: 1px solid black; height:24px; font-family:Arial;"> &nbsp Shipping Notes </td> </tr> <tr> <td style="font-size: 14px; text-align: left; border-right: 1px solid black; border-left: 1px solid black; border-bottom: 1px solid black; height: 22px;"> </td> </tr> </table> <table style="width: 100%;" rules="all" border="0" frame="box" cellpadding="0.5" cellspacing="0"> <tr> <td style="font-size: 15px; text-align: center; border-right: 1px solid black; border-left: 1px solid black; border-bottom: 1px solid black; height:24px; font-family:Arial;"> Item # </td> <td style="font-size: 15px; text-align: left; border-right: 1px solid black; border-bottom: 1px solid black; height:24px; font-family:Arial;"> &nbsp Description </td> <td style="font-size: 15px; text-align: center; border-right: 1px solid black; border-bottom: 1px solid black; height:24px; font-family:Arial;"> Ordered </td> <td style="font-size: 15px; text-align: center; border-right: 1px solid black; border-bottom: 1px solid black; height:24px; font-family:Arial;"> Units </td> <td style="font-size: 15px; text-align: center; border-right: 1px solid black; border-bottom: 1px solid black; height:24px; font-family:Arial;"> Back Order </td> <td style="font-size: 15px; text-align: center; border-right: 1px solid black; border-bottom: 1px solid black; height:24px; font-family:Arial;"> Shipped </td> </tr> <tr> <td style="font-size: 14px; text-align: left; border-right: 1px solid black; border-left: 1px solid black; border-bottom: none; height:22px;"> &nbspWCLot1 </td> <td style="font-size: 12px; text-align: left; border-right: 1px solid black; border-bottom: none; height:22px;">&nbsp </td> <td style="font-size: 12px; text-align: right; border-right: 1px solid black; border-bottom: none; height:22px;"> 2 &nbsp </td> <td style="font-size: 12px; text-align: left; border-right: 1px solid black; border-bottom: none; height:22px;"> &nbsp Ea &nbsp </td> <td style="font-size: 12px; text-align: right; border-right: 1px solid black; border-bottom: none; height:22px;"> &nbsp &nbsp </td> <td style="font-size: 12px; text-align: right; border-right: 1px solid black; border-bottom: none; height:22px;"> 2 &nbsp </td> </tr> <tr> <td style="font-size: 12px; text-align: left; border-right: 1px solid black; border-left: 1px solid black; border-bottom: 1px solid black; height: 210;"> </td> <td style="font-size: 12px; text-align: left; border-right: 1px solid black; border-bottom: 1px solid black; height: 4px;"> </td> <td style="font-size: 12px; text-align: left; border-right: 1px solid black; border-bottom: 1px solid black; height: 4px;"> </td> <td style="font-size: 12px; text-align: left; border-right: 1px solid black; border-bottom: 1px solid black; height: 4px;"> </td> <td style="font-size: 12px; text-align: left; border-right: 1px solid black; border-bottom: 1px solid black; height: 4px;"> </td> <td style="font-size: 12px; text-align: left; border-right: 1px solid black; border-bottom: 1px solid black; height: 4px;"> </td> </tr> </table> </td> </tr> </table> </td> </tr> <tr> <td> <br /> ---------------------------------------------------------------------------------------------------------------------------- <br /> <br /> </td> </tr> <tr> <td> <table style="width: 45%;" align="left"><tr> <td style="font-size: 15px;"> <br /> </td> </tr> <tr> <td style="font-size: 13px; font-family:Arial;"> <b>Ship Returns To</b> </td> </tr> <tr> <td style="font-size: 12px; ">Hyderabad <br /> <br /> </td> </tr> </table> <table style="width: 55%;" align="right"> <tr> <td style="font-size: 13px; font-family:Arial;"><b>Customer Return From </b> </td> <td > </td> </tr> <tr> <td style="font-size: 13px; font-family:Arial;"> <b>Customer </b> </td> <td style="font-size: 12px;"> </td> </tr> <tr> <td style="font-size: 13px; font-family:Arial;"> <b>Order </b> </td> <td style="font-size: 12px;">SO35 </td> </tr> <tr> <td style="font-size: 13px; font-family:Arial;"> <b>R.A. # </b> </td> <td> </td> </tr> </table> <br /> <br /> <br /> <br /> </td> </tr> <tr> <td> <table style="width: 100%;" frame="box" rules="all" align="right" border="0" cellpadding="0.5" cellspacing="0"> <tr style="background-color: Gray;"> <td style="font-size: 15px; text-align: left; color: white; border-top: 1px solid black; border-right: 1px solid black; border-left: 1px solid black; border-bottom: 1px solid black; font-family:Arial;"> &nbsp Item </td> <td style="font-size: 15px; text-align: left; color: white; border-top: 1px solid black; border-right: 1px solid black; border-bottom: 1px solid black; font-family:Arial;"> &nbsp Quantity </td> <td style="font-size: 15px; text-align: left; color: white; border-top: 1px solid black; border-right: 1px solid black; border-bottom: 1px solid black; font-family:Arial;"> &nbsp Reason For Returning </td> </tr> <tr> <td style="font-size: 16px; text-align: left; border-right: 1px solid black; border-left: 1px solid black; border-bottom: 1px solid black;" height="55px"> </td> <td style="font-size: 16px; text-align: left; border-right: 1px solid black; border-bottom: 1px solid black;" height="55px"> </td> <td style="font-size: 16px; text-align: left; border-right: 1px solid black; border-bottom: 1px solid black;" valign="Top"> </td> </tr> </table></td> </tr> </table><p style=" page-break-after:avoid"></p> </body> </html>';
		return Label;
	}
	function getInvdtldataforPacking(itemfulfillid,itemInternalId)
	{
		var invDtlLinesSearch = search.load({
			id:'customsearch_wms_get_inv_detail_packing'
		});

		invDtlLinesSearch.filters.push(
				search.createFilter({
					name:'internalid',
					join:'transaction',
					operator:search.Operator.ANYOF,
					values: itemfulfillid
				})
		);
		invDtlLinesSearch.filters.push(
				search.createFilter({
					name:'item',
					operator:search.Operator.ANYOF,
					values:itemInternalId
				})
		);

		var	 invDtlLineSearchResults = _getSearchResultInJSON(invDtlLinesSearch);
		log.debug('invDtlLineSearchResults',invDtlLineSearchResults);

		return invDtlLineSearchResults;
	}
	function _migrateBinFields()
	{
		var wmsBinsSearchObj = search.load({
			id: 'customsearch_wms_bins_srch'			
		}); 
		var wmsBinSearchResult = _getSearchResultInJSON(wmsBinsSearchObj);



	}

	function _migrateZones()
	{
		var wmsZoneSearchObj = search.load({
			id: 'customsearch_wms_zonesbybinssrh'			
		}); 
		var wmsZoneSearchResult = _getSearchResultInJSON(wmsZoneSearchObj);

		var erpZoneSearchObj = search.load({
			id: 'customsearch_wms_erp_zonesearch'			
		}); 
		var erpZoneSearchResult = _getSearchResultInJSON(erpZoneSearchObj);
		if(wmsZoneSearchResult.length > 0)
		{
			var erpZonesArr = getUniqueArrValues(wmsZoneSearchResult,erpZoneSearchResult,true);
			migrateWmsZonesToERP(erpZonesArr,wmsZoneSearchResult);
		}
		if(erpZoneSearchResult.length > 0)
		{
			var wmsZonesArr = getUniqueArrValues(erpZoneSearchResult,wmsZoneSearchResult,true);
			migrateERPZonesToWMS(wmsZonesArr);
		}


	}

	function _migrateItemGroup()
	{
		var wmsItemGroupSearchObj = search.load({
			id: 'customsearch_wms_itemgroup_srch'			
		}); 
		var wmsItemGroupSearchResult = _getSearchResultInJSON(wmsItemGroupSearchObj);

		var erpItemGroupSearchObj = search.load({
			id: 'customsearch_wms_itemprocessgroup_srch'			
		}); 
		var erpItemGroupSearchResult = _getSearchResultInJSON(erpItemGroupSearchObj);
		if(wmsItemGroupSearchResult.length > 0)
		{
			var erpItemGroupArr = getUniqueArrValues(wmsItemGroupSearchResult,erpItemGroupSearchResult,false);
			migrateWmsItemGroupToERP(erpItemGroupArr);
		}
		if(erpItemGroupSearchResult.length > 0)
		{
			var wmsItemGroupArr = getUniqueArrValues(erpItemGroupSearchResult,wmsItemGroupSearchResult,false);
			migrateERPItemGroupToWMS(wmsItemGroupArr);
		}


	}
	function migrateWmsItemGroupToERP(itemGroupArr)
	{
		if(itemGroupArr.length > 0)
		{
			for(var itemGroup in itemGroupArr)
			{
				var wmsItemGroupName = itemGroupArr[itemGroup];

				var erpItemGroupRec = record.create({type:'itemprocessgroup',
				});
				erpItemGroupRec.setValue({fieldId:'name',value: wmsItemGroupName});
				erpItemGroupRec.save(); 

			}
		}
	}
	function migrateERPItemGroupToWMS(wmsitemGroupArr)
	{
		if(wmsitemGroupArr.length > 0)
		{
			for(var itemGroup in wmsitemGroupArr)
			{
				var itemGroupName = wmsitemGroupArr[itemGroup];

				var wmsItemGroupRec = record.create({type:'customrecord_wmsse_itemgroup',
				});
				wmsItemGroupRec.setValue({fieldId:'name',value: itemGroupName});
				wmsItemGroupRec.save(); 

			}
		}
	}
	function _migrateItemfamily()
	{
		var wmsItemFamilySearchObj = search.load({
			id: 'customsearch_wms_itemfamily_srh'			
		}); 
		var wmsItemFamilySearchResult = _getSearchResultInJSON(wmsItemFamilySearchObj);

		var erpItemFamilySearchObj = search.load({
			id: 'customsearch_wms_itemprocessfamily_srch'			
		}); 
		var erpItemFamilySearchResult = _getSearchResultInJSON(erpItemFamilySearchObj);
		if(wmsItemFamilySearchResult.length > 0)
		{
			var erpItemFamilyArr = getUniqueArrValues(wmsItemFamilySearchResult,erpItemFamilySearchResult,false);
			migrateWmsItemFamilyToERP(erpItemFamilyArr);
		}
		if(erpItemFamilySearchResult.length > 0)
		{
			var wmsItemFamilyArr = getUniqueArrValues(erpItemFamilySearchResult,wmsItemFamilySearchResult,false);
			migrateERPItemFamilyToWMS(wmsItemFamilyArr);
		}


	}
	function migrateWmsItemFamilyToERP(itemFamilyArr)
	{
		if(itemFamilyArr.length > 0)
		{
			for(var itemFamily in itemFamilyArr)
			{
				var wmsItemFamilyName = itemFamilyArr[itemFamily];

				var erpItemFamilyRec = record.create({type:'itemprocessfamily',
				});
				erpItemFamilyRec.setValue({fieldId:'name',value: wmsItemFamilyName});
				erpItemFamilyRec.save(); 

			}
		}
	}
	function migrateERPItemFamilyToWMS(wmsItemFamilyArr)
	{
		if(wmsItemFamilyArr.length > 0)
		{
			for(var itemFamily in wmsItemFamilyArr)
			{
				var itemFamilyName = wmsItemFamilyArr[itemFamily];

				var wmsItemFamilyNameRec = record.create({type:'customrecord_wmsse_item_family',
				});
				wmsItemFamilyNameRec.setValue({fieldId:'name',value: itemFamilyName});
				wmsItemFamilyNameRec.save(); 

			}
		}
	}

	function getUniqueArrValues(zoneSearchResultObj1,zoneSearchResultObj2,isFromZones)
	{
		var zoneObjArr = [];
		if(zoneSearchResultObj1.length > 0)
		{
			for(var zone in zoneSearchResultObj1)
			{
				var zoneRec = zoneSearchResultObj1[zone];
				var zoneName = '';

				if(isFromZones)
				{
					zoneName = zoneRec['custrecord_wmsse_zoneText'];
				}
				else
				{
					zoneName = zoneRec['name'];
				}

				var isMatchFound = false
				for(var zone1 in zoneSearchResultObj2)
				{
					var zoneRec2 = zoneSearchResultObj2[zone1];
					var zoneName2 = zoneRec2['name'];
					if(zoneName == zoneName2)
					{
						isMatchFound = true;
						break;
					}

				}

				if(!isMatchFound)
				{
					zoneObjArr.push(zoneName);
				}

			}
		}

		return zoneObjArr;
	}
	function migrateWmsZonesToERP(zonesArr,wmsZoneSearchResultObj)
	{
		if(zonesArr.length > 0)
		{
			for(var zone in zonesArr)
			{
				var wmsZoneName = zonesArr[zone];
				var wmsLocationId = '';
				for(var searchResult in wmsZoneSearchResultObj)
				{
					var wmsZoneSearchResult  = wmsZoneSearchResultObj[searchResult]; 
					var zoneName = wmsZoneSearchResult['custrecord_wmsse_zoneText'];
					if(zoneName == wmsZoneName)
					{
						wmsLocationId = wmsZoneSearchResult['location'];	 
					}

					if(wmsLocationId != '')
					{
						break;
					}
				}
				if(wmsLocationId != '')
				{
					var erpZoneRec = record.create({type:'zone',
					});
					erpZoneRec.setValue({fieldId:'name',value: wmsZoneName});
					erpZoneRec.setValue({fieldId:'location',value: wmsLocationId});
					erpZoneRec.save();
				}

			}
		}
	}
	function migrateERPZonesToWMS(wmsZonesArrObj)
	{
		if(wmsZonesArrObj.length > 0)
		{
			for(var zone in wmsZonesArrObj)
			{
				var zoneName = wmsZonesArrObj[zone];

				var wmsZoneRec = record.create({type:'customrecord_wmsse_zone',
				});
				wmsZoneRec.setValue({fieldId:'name',value: zoneName});
				wmsZoneRec.save(); 

			}
		}
	}

	function getBinQtyDetailsItemwise(binInternalId, warehouseLocationId,itemInternalId,lotName) {
		log.error('lotName',lotName);
		var qtyArray = [];
		var filterStrat = [];

		if (_isValueValid(itemInternalId))
			filterStrat.push(search.createFilter({
				name: 'internalid',
				operator: search.Operator.ANYOF,
				values: itemInternalId
			}));

		if (_isValueValid(warehouseLocationId))
			filterStrat.push(search.createFilter({
				name: 'location',
				join :'binonhand',
				operator: search.Operator.ANYOF,
				values: warehouseLocationId
			}));
		if (_isValueValid(binInternalId))
			filterStrat.push(search.createFilter({
				name: 'binnumber',
				join :'binonhand',
				operator: search.Operator.ANYOF,
				values: binInternalId
			}));	
		if (_isValueValid(lotName))
			filterStrat.push(search.createFilter({
				name:'inventorynumber',	
				join:'inventoryNumberBinOnHand',
				operator:search.Operator.IS, 
				values:lotName
			}));	


		var objInvDetailsSearch = search.load({id: 'customsearch_wmsse_binwise_inventory'});
		var savedFilter = objInvDetailsSearch.filters ;	
		objInvDetailsSearch.filters = savedFilter.concat(filterStrat);
		log.error('filterStrat',filterStrat);
		var objInvDetails = _getSearchResultInJSON(objInvDetailsSearch);

		return objInvDetails;
	}
	function _getBinQtyDetailsItemwiseForValidation(binInternalId, warehouseLocationId,itemInternalId,lotName) {
		var qtyArray = [];
		var filterStrat = [];

		if (_isValueValid(itemInternalId))
			filterStrat.push(search.createFilter({
				name: 'internalid',
				operator: search.Operator.ANYOF,
				values: itemInternalId
			}));

		if (_isValueValid(warehouseLocationId))
			filterStrat.push(search.createFilter({
				name: 'location',
				join :'binonhand',
				operator: search.Operator.ANYOF,
				values: warehouseLocationId
			}));
		if (_isValueValid(binInternalId))
			filterStrat.push(search.createFilter({
				name: 'binnumber',
				join :'binonhand',
				operator: search.Operator.ANYOF,
				values: binInternalId
			}));	
		if (_isValueValid(lotName))
			filterStrat.push(search.createFilter({
				name:'inventorynumber',	
				join:'inventoryNumberBinOnHand',
				operator:search.Operator.IS, 
				values:lotName
			}));	


		var objInvDetailsSearch = search.load({id: 'customsearch_wmsse_get_bininventorydtls'});
		var savedFilter = objInvDetailsSearch.filters ;	
		objInvDetailsSearch.filters = savedFilter.concat(filterStrat);
		var objInvDetails = _getSearchResultInJSON(objInvDetailsSearch);

		return objInvDetails;
	}
	function _getPickTaskDetailsForValidation(pickTaskDetails)
	{
		var getOrderInternalId = pickTaskDetails['orderInternalId'];
		var strLocation = pickTaskDetails["whLocationId"];
		var transactionType = pickTaskDetails["transactionType"];
		var pickingType=pickTaskDetails['pickingType'];
		var waveName=pickTaskDetails['waveName'];

		var pickTaskSearch = search.load({id:'customsearch_wmsse_validate_picktask'});
		var pickTaskFilters = pickTaskSearch.filters;
		if(pickingType == 'multiOrder')
		{
			pickTaskFilters.push(search.createFilter({
				name:'wavename',
				operator:search.Operator.IS,
				values:waveName}));
		}
		else if(_isValueValid(getOrderInternalId))
		{
			pickTaskFilters.push(search.createFilter({
				name:'internalid',
				join:'transaction',
				operator:search.Operator.ANYOF,
				values:getOrderInternalId}))
		}
		if(_isValueValid(transactionType))
		{
			pickTaskFilters.push(search.createFilter({
				name:'type',
				join:'transaction',
				operator:search.Operator.IS,
				values:transactionType}))
		}

		if(_isValueValid(strLocation))
		{
			pickTaskFilters.push(search.createFilter({
				name:'location',
				operator:search.Operator.ANYOF,
				values:['@NONE@',strLocation]}));
		}

		pickTaskSearch.filters = pickTaskFilters;
		var	 objpicktaskSearchDetails = _getSearchResultInJSONForValidation(pickTaskSearch,2);

		return objpicktaskSearchDetails;

	}
	
	function _getmultiorderPickTaskDetailsForValidation(whLocationId, waveName, currentUser)
	{
		

		var pickTaskSearch = search.load({id:'customsearch_wmsse_multiorder_picktask'});
		var pickTaskFilters = pickTaskSearch.filters;
		
		if(_isValueValid(waveName))
		{
			pickTaskFilters.push(search.createFilter({
				name:'waveName',
				operator:search.Operator.IS,
				values:waveName
			}));
		}
		if(_isValueValid(whLocationId))
		{
			pickTaskFilters.push(search.createFilter({
				name:'location',
				operator:search.Operator.IS,
				values:['@NONE@',whLocationId] 
			}));
		}
		pickTaskFilters.push(search.createFilter({
			name:'picker',
			operator:search.Operator.ANYOF,
			values:['@NONE@',currentUser]
		}));
		
				

		pickTaskSearch.filters = pickTaskFilters;
		var	 objpicktaskSearchDetails = _getSearchResultInJSONForValidation(pickTaskSearch,2);

		return objpicktaskSearchDetails;

	}
	
	function _getItemWiseDetailsinventoryNumberBinOnhand(binInternalId,whLocationId,itemInternalId,lotInternalId) {
		var searchObj = search.load({ id : 'customsearch_wmsse_itemwise_lots_rpt',type:search.Type.ITEM});
		if (_isValueValid(itemInternalId)) {
			searchObj.filters.push(search.createFilter({ name :'internalid',				
				operator: search.Operator.ANYOF,
				values: itemInternalId
			}));
		}
		if (_isValueValid(whLocationId)) {
			searchObj.filters.push(search.createFilter({ name :'location',
				join: 'binOnHand',
				operator: search.Operator.ANYOF,
				values: whLocationId
			}));
		}

		if (_isValueValid(lotInternalId)) {
			log.error({title:'lotInternalId',details:lotInternalId});
			searchObj.filters.push(search.createFilter({
				name:'inventorynumber',	
				join:'inventoryNumberBinOnHand',
				operator:search.Operator.IS, 
				values:lotInternalId}));
			if (_isValueValid(binInternalId)) {
				searchObj.filters.push(search.createFilter({ name :'binnumber',
					join: 'inventoryNumberBinOnHand',
					operator: search.Operator.ANYOF,
					values: binInternalId
				}));
			}
		}
		else{
			if (_isValueValid(binInternalId)) {
				searchObj.filters.push(search.createFilter({ name :'binnumber',
					join: 'binOnHand',
					operator: search.Operator.ANYOF,
					values: binInternalId
				}));
			}
		}
		var inventoryDetailsResults = _getSearchResultInJSON(searchObj);
		log.error({title:'inventoryDetailsResults',details:inventoryDetailsResults});
		return inventoryDetailsResults;
	}
	function _getTransactionOrderlineCount(getOrderInternalId,strLocation,transactionType)
	{

		var searchName = 'customsearch_wms_transactions_so_linecnt';
		if(transactionType == 'TrnfrOrd')
		{
			searchName = 'customsearch_wms_transactions_to_linecnt';
		}

		var transactionOrderDetails = search.load({id:searchName});
		var transactionfilters = transactionOrderDetails.filters;
		if(_isValueValid(getOrderInternalId))
		{
			transactionfilters.push(search.createFilter({
				name:'internalid',
				operator:search.Operator.ANYOF,
				values:getOrderInternalId}))
		}		
		if(_isValueValid(strLocation))
		{
			transactionfilters.push(search.createFilter({
				name:'location',
				operator:search.Operator.ANYOF,
				values:strLocation}));
		}

		transactionOrderDetails.filters = transactionfilters;
		var	 objTransactionSearchDetails = _getSearchResultInJSONForValidation(transactionOrderDetails,2);
		return objTransactionSearchDetails;

	}
	function fnGetInventoryBinsForBinPutaway(strLocation,ItemInternalId,binnumber) {

		var searchObj = search.load({ id : 'customsearch_wmsse_getinvtentoryitembins',
			type:search.Type.INVENTORY_BALANCE});

		if (_isValueValid(strLocation)) {
			searchObj.filters.push(search.createFilter({ name :'location',
				operator: search.Operator.ANYOF,
				values: strLocation
			}));
		}
		if (_isValueValid(ItemInternalId)) {
			searchObj.filters.push(search.createFilter({ name :'item',
				operator: search.Operator.ANYOF,
				values: ItemInternalId
			}));
		}

		searchObj.filters.push(search.createFilter({ name :'onhand',
			operator: search.Operator.GREATERTHAN,
			values: 0
		}));

		var alltaskresults = _getSearchResultInJSON(searchObj);
		var binLocArr = [];

		if (alltaskresults.length > 0) {
			for (var f = 0; f < alltaskresults.length; f++) {
				var binnumber = alltaskresults[f]['binnumber'];
				if (binLocArr.indexOf(binnumber) == -1) {
					binLocArr.push(binnumber);
				}
			}
		}

		return binLocArr;
	}


	function fnGetInventoryBinsForLotForBinPutaway(strLocation,strLot,ItemInternalId,binnumber) {
		var searchObj = search.load({id: 'customsearch_wms_getlotbins',type:search.Type.INVENTORY_BALANCE});
		if (_isValueValid(strLocation)) {
			searchObj.filters.push(search.createFilter({ name :'location',
				operator: search.Operator.ANYOF,
				values:  strLocation}));
		}
		if (_isValueValid(ItemInternalId)) {
			searchObj.filters.push(search.createFilter({ name :'item',
				operator: search.Operator.ANYOF,
				values:  ItemInternalId}));
		}
		if (_isValueValid(strLot)) {
			var  EntLotId = inventoryNumberInternalId(strLot,strLocation,ItemInternalId);
			if(_isValueValid(EntLotId)){
				searchObj.filters.push(search.createFilter({ name :'inventorynumber',
					operator: search.Operator.ANYOF,
					values:  EntLotId}));
			}
		}

		searchObj.filters.push(search.createFilter({ name :'onhand',
			operator: search.Operator.GREATERTHAN,
			values: 0
		}));
		var alltaskresults = _getSearchResultInJSON(searchObj);
		var binLocArr =[];
		if (alltaskresults.length > 0) {

			for (var f = 0; f < alltaskresults.length; f++) {
				var invtNumber = alltaskresults[f]['inventorynumberText'];
				var binnumber = alltaskresults[f]['binnumber'];
				if(strLot == invtNumber)
				{
					if (binLocArr.indexOf(binnumber) == -1) {

						binLocArr.push(alltaskresults[f]['binnumber']);

					}
				}
			}
		}
		return binLocArr;
	}



	//Function to get Bins and InternalIds
	function getPutBinAndIntDetailsForBinPutawayWithBinSequence(objPutBinQueryDetails) {

		log.debug({title:'objPutBinQueryDetails',details:objPutBinQueryDetails});
		var getItemInternalId =objPutBinQueryDetails['itemInternalId'];
		var strItemGrp = objPutBinQueryDetails['itemGroup'];
		var  strItemFam = objPutBinQueryDetails['itemFamily'];
		var blnMixItem = objPutBinQueryDetails['blnMixItem'];
		var blnMixLot = objPutBinQueryDetails['blnMixLot'];
		var getPreferBin = objPutBinQueryDetails['preferedBinName'];
		var strLocation = objPutBinQueryDetails['warehouseLocationId'];
		var itemType =  objPutBinQueryDetails['itemType'];
		var strLot = objPutBinQueryDetails['lotName'];
		var strItemDepartment= objPutBinQueryDetails['department'];
		var strItemClass = objPutBinQueryDetails['class'];
		var strvUnits = objPutBinQueryDetails['transcationUomInternalId'];
		var makeInvAvailFlagFromSelect = objPutBinQueryDetails['makeInvAvailFlagFromSelect'];
		var  fromBinInternalId = objPutBinQueryDetails['fromBinInternalId'];
		var selectedUOMText = objPutBinQueryDetails['selectedUOMText'];
		var preferBinInternalId = objPutBinQueryDetails["preferedBinInternalId"];
		var inventoryStatusFeature = isInvStatusFeatureEnabled();

		var invstatusarray=[];
		var vTotalBinArr = [];
		if(inventoryStatusFeature == true && _isValueValid(makeInvAvailFlagFromSelect)==true)
		{
			if(makeInvAvailFlagFromSelect == 'T' || makeInvAvailFlagFromSelect == 'F')
			{
				invstatusarray=_getInventoryAvailableStatusFromCore(makeInvAvailFlagFromSelect);
			}
			else
			{ 
				invstatusarray.push('@NONE@');
				invstatusarray.push(makeInvAvailFlagFromSelect);
			}
		}

		if(_isValueValid(preferBinInternalId) && preferBinInternalId != fromBinInternalId){
			var	preferBinZone ='';
			var fields = ['custrecord_wmsse_zone'];
			var binRec = search.lookupFields({
				type: 'Bin',
				id: preferBinInternalId,
				columns: fields
			});
			if (_isValueValid(binRec)) {
				if(binRec.custrecord_wmsse_zone[0] != undefined)
				{
					preferBinZone = binRec.custrecord_wmsse_zone[0].text;
				}
			}
			var filterPreferBin = [];
			var objBinPreferBinDetails =  [];

			if (_isValueValid(strLocation))
			{
				filterPreferBin.push(search.createFilter({
					name: 'location', operator: search.Operator.ANYOF,
					values: strLocation
				}));
			}

			filterPreferBin.push(search.createFilter({
				name: 'binnumber', operator: search.Operator.ANYOF,
				values: preferBinInternalId
			}));
			if(_isValueValid(fromBinInternalId))
			{
				filterPreferBin.push(search.createFilter({
					name: 'binnumber', operator: search.Operator.NONEOF,
					values: fromBinInternalId
				}));
			}

			var objPreferBinDetailsSearch = search.load({
				id: 'customsearch_wmsse_srchres_preferbin',
				type:search.Type.INVENTORY_BALANCE
			});

			var  savedFilters = objPreferBinDetailsSearch.filters;
			objPreferBinDetailsSearch.filters = savedFilters.concat(filterPreferBin);
			objBinPreferBinDetails = _getSearchResultInJSON(objPreferBinDetailsSearch);

			var preferBinArr = [];
//			log.debug({title:'objBinPreferBinDetails',details:objBinPreferBinDetails});
			if (objBinPreferBinDetails.length > 0) {
				var selectedConvRate = objPutBinQueryDetails['selectedConversionRate'];
				var currentConvRate = objPutBinQueryDetails['stockConversionRate'];
				var strBin = '';
				var strBinId = '';
				var invStatus = '';
				var invStatusId = '';
				var vBinQtyAvail = '';
				var binQtyAvailWithUOM = '';

				for (var p = 0; p < objBinPreferBinDetails.length; p++) {
					strBin = objBinPreferBinDetails[p]['binnumberText'];
					strBinId = objBinPreferBinDetails[p]['binnumber'];
					invStatus = objBinPreferBinDetails[p]['statusText'];
					invStatusId = objBinPreferBinDetails[p]['status'];
					vBinQtyAvail = objBinPreferBinDetails[p]['onhand'];
					binQtyAvailWithUOM = vBinQtyAvail;// + " "+selectedUOMText;
					if(_isValueValid(selectedUOMText))
					{
						binQtyAvailWithUOM = vBinQtyAvail+ " "+selectedUOMText;
					}
					if(_isValueValid(vBinQtyAvail) && _isValueValid(selectedConvRate) && _isValueValid(currentConvRate) 
							&& (selectedConvRate != currentConvRate))
					{
						vBinQtyAvail = uomConversions(vBinQtyAvail,selectedConvRate,currentConvRate);
						if(vBinQtyAvail > 0)
						{
							binQtyAvailWithUOM = vBinQtyAvail + " "+selectedUOMText;
						}
					}

					if(parseFloat(vBinQtyAvail)==0 && preferBinArr.indexOf(strBinId) == -1)
					{
						invStatus = '';
						preferBinArr.push(strBinId);
						var currentRowValues = {'binName':strBin,'binInternalId':strBinId,'statusName':invStatus,
								'statusInternalId':invStatusId,'quantity':vBinQtyAvail,'zone':preferBinZone,
								'quantityWithUOM':binQtyAvailWithUOM};
						vTotalBinArr.push(currentRowValues);
					}
					else if(parseFloat(vBinQtyAvail)>0)
					{
						var currentRowValues = {'binName':strBin,'binInternalId':strBinId,'statusName':invStatus,
								'statusInternalId':invStatusId,'quantity':vBinQtyAvail,'zone':preferBinZone,
								'quantityWithUOM':binQtyAvailWithUOM};
						vTotalBinArr.push(currentRowValues);
					}


				}
			}
			else{
				var invStatus ='';
				var invStatusId ='';
				var vBinQtyAvail =0;
				var currentRowValues = {'binName':getPreferBin,'binInternalId':preferBinInternalId,'statusName':invStatus,
						'statusInternalId':invStatusId,'quantity':vBinQtyAvail,'zone':preferBinZone,'quantityWithUOM':vBinQtyAvail};
				vTotalBinArr.push(currentRowValues);
			}
		}

		var vBinLocArr = [];
		var mixItemBinsArr = [];
		var vPutZoneArr = [];
		var filters = [];
		var columns = [];

		var binZoneArr = [];
		if (_isValueValid(fromBinInternalId)) {
			vBinLocArr.push(fromBinInternalId);
		}
		var objPutstrategiesSearchObj = search.load({
			id: 'customsearch_wmsse_putstrategies_srh'
		});
		filters = objPutstrategiesSearchObj.filters;

		if (_isValueValid(getItemInternalId))
		{
			filters.push(search.createFilter({
				name: 'custrecord_wmsse_item',
				operator: search.Operator.ANYOF,
				values: ['@NONE@', getItemInternalId]
			}));
		}
		if (_isValueValid(strItemGrp))
		{
			filters.push(search.createFilter({
				name: 'custrecord_wmsse_itemgroup', operator: search.Operator.ANYOF,
				values: ['@NONE@', strItemGrp]
			}));
		}
		else
		{
			filters.push(search.createFilter({
				name: 'custrecord_wmsse_itemgroup', operator: search.Operator.ANYOF,
				values: ['@NONE@']
			}));
		}
		if (_isValueValid(strItemFam))
		{
			filters.push(search.createFilter({
				name: 'custrecord_wmsse_itemfamily', operator: search.Operator.ANYOF,
				values: ['@NONE@', strItemFam]
			}));
		}
		else
		{
			filters.push(search.createFilter({
				name: 'custrecord_wmsse_itemfamily', operator: search.Operator.ANYOF,
				values: ['@NONE@']
			}));
		}
		if (_isValueValid(strLocation))
		{
			filters.push(search.createFilter({
				name: 'custrecord_wmsse_location', operator: search.Operator.ANYOF,
				values: ['@NONE@', strLocation]
			}));
		}
		else
		{
			filters.push(search.createFilter({
				name: 'custrecord_wmsse_location', operator: search.Operator.ANYOF,
				values: ['@NONE@']
			}));
		}

		if (_isValueValid(strItemClass))
		{
			filters.push(search.createFilter({
				name: 'custrecord_wmsse_put_class', operator: search.Operator.ANYOF,
				values: ['@NONE@', strItemClass]
			}));
		}
		else
		{
			filters.push(search.createFilter({
				name: 'custrecord_wmsse_put_class', operator: search.Operator.ANYOF,
				values: ['@NONE@']
			}));
		}
		if (_isValueValid(strItemDepartment))
		{
			filters.push(search.createFilter({
				name: 'custrecord_wmsse_put_department', operator: search.Operator.ANYOF,
				values: ['@NONE@', strItemDepartment]
			}));
		}
		else
		{
			filters.push(search.createFilter({
				name: 'custrecord_wmsse_put_department', operator: search.Operator.ANYOF,
				values: ['@NONE@']
			}));
		}
		if (_isValueValid(strvUnits))
		{
			filters.push(search.createFilter({
				name: 'custrecord_wmsse_put_units', operator: search.Operator.ANYOF,
				values: ['@NONE@', strvUnits]
			}));
		}
		if(inventoryStatusFeature==true && invstatusarray.length > 0)
		{
			filters.push(search.createFilter({name:'custrecord_wmsse_put_invstatus', 
				operator: search.Operator.ANYOF,
				values: invstatusarray}));
		}

		objPutstrategiesSearchObj.filters = filters;

		var objPutstrategies = _getSearchResultInJSON(objPutstrategiesSearchObj);
		if (objPutstrategies.length > 0) {
			var mixItemsInBins = true;
			if(itemType == "lotnumberedinventoryitem" || itemType == "lotnumberedassemblyitem")
			{
				if((blnMixItem == false ||  blnMixItem == 'false') && (blnMixLot == 'false' || blnMixLot == false) )
				{
					mixItemsInBins = false;
				}
			}
			else
			{
				if((blnMixItem == false ||  blnMixItem == 'false'))
				{
					mixItemsInBins = false;
				}
			}

			log.debug({title:'objPutstrategies',details:objPutstrategies.length});
			if (mixItemsInBins == false &&
					(itemType == "lotnumberedinventoryitem" || itemType == "lotnumberedassemblyitem")) {
				var binLocArr = fnGetInventoryBinsForLotForBinPutaway(strLocation,strLot,getItemInternalId,null);
				if(binLocArr.length > 0)
				{
					for(var bin= 0 ; bin < binLocArr.length; bin++)
					{
						mixItemBinsArr.push(binLocArr[bin]);
					}
				}
			}
			else
			{
				if (!mixItemsInBins) {
					var binLocArr = fnGetInventoryBinsForBinPutaway(strLocation,getItemInternalId,null);
					if(binLocArr.length > 0)
					{
						for(var bin = 0 ; bin < binLocArr.length; bin++)
						{
							mixItemBinsArr.push(binLocArr[bin]);
						}
					}
				}
			}
			for (var i = 0; i < objPutstrategies.length; i++) {
				var vBinLocIdArr=[];
				var vBinArr = [];
				var BinIdArr =[];
				var strPutZone = objPutstrategies[i]['custrecord_wmsse_putzone'];
				if (!_isValueValid(strPutZone))
				{
					strPutZone = "-None-";
				}
				if (strPutZone != null && strPutZone != '' && vPutZoneArr.indexOf(strPutZone) == -1) {

					vPutZoneArr.push(strPutZone);

					var filterStrat = [];

					filterStrat.push(search.createFilter({
						name: 'inactive', operator: search.Operator.IS,
						values: false
					}));

					if (_isValueValid(strPutZone)&& strPutZone != '-None-')
					{
						filterStrat.push(search.createFilter({
							name: 'custrecord_wmsse_zone', operator: search.Operator.ANYOF,
							values: strPutZone
						}));
					}

					if (_isValueValid(strLocation))
					{
						filterStrat.push(search.createFilter({
							name: 'location', operator: search.Operator.ANYOF,
							values: strLocation
						}));
					}

					var objBinDetailsSearch = search.load({id: 'customsearch_wmsse_binsbyzones'});
					var  savedFilters = objBinDetailsSearch.filters;
					objBinDetailsSearch.filters = savedFilters.concat(filterStrat);
					var objBinDetails = _getSearchResultInJSON(objBinDetailsSearch);//
					if (objBinDetails.length > 0) {

						for (var j = 0; j < objBinDetails.length; j++) {

							if (objBinDetails[j]['binnumber'] != getPreferBin &&
									vBinLocArr.indexOf(objBinDetails[j]['internalid']) == -1)
							{
								vBinLocIdArr.push(objBinDetails[j]['internalid']);
								vBinArr.push(objBinDetails[j]['binnumber']);
								binZoneArr.push(objBinDetails[j]['custrecord_wmsse_zoneText']);
							}

						}

						var filterInvBal = [];
						var objBinDetails =  [];
						if(vBinLocIdArr.length > 0)
						{
							if (strLocation != null && strLocation != '')
								filterInvBal.push(search.createFilter({
									name: 'location', operator: search.Operator.ANYOF,
									values: strLocation
								}));

							filterInvBal.push(search.createFilter({
								name: 'binnumber', operator: search.Operator.ANYOF,
								values: vBinLocIdArr
							}));

							var objBinDetailsSearch = search.load({
								id: 'customsearch_wms_invbal_getstatuswise',
								type:search.Type.INVENTORY_BALANCE
							});

							var  savedFilters = objBinDetailsSearch.filters;
							objBinDetailsSearch.filters = savedFilters.concat(filterInvBal);
							objBinDetails = _getSearchResultInJSON(objBinDetailsSearch);
						}

						//					log.debug({title:'objBinDetails',details:objBinDetails});
						if (objBinDetails.length > 0) {
							var selectedConvRate = objPutBinQueryDetails['selectedConversionRate'];
							var currentConvRate =  objPutBinQueryDetails['stockConversionRate'];
							var strBin = '';
							var strBinId = '';
							var invStatus = '';
							var invStatusId = '';
							var vBinQtyAvail = '';
							var binQtyAvailWithUOM = '';
							var binIndex = '';
							var zone = '';
							var isValidBin = true;
							var invtItem = '';
							var isEmptyBin = true;
							for (var vPutBin = 0; vPutBin < vBinLocIdArr.length; vPutBin++) {
								var mBin = vBinLocIdArr[vPutBin];
								isEmptyBin = true;
								for (var vPutBinDtls = 0; vPutBinDtls < objBinDetails.length; vPutBinDtls++) {
									strBinId = objBinDetails[vPutBinDtls]['binnumber'];

									if(strBinId == mBin)
									{
										isEmptyBin = false;
										isValidBin = true;
										strBin = objBinDetails[vPutBinDtls]['binnumberText'];

										invtItem = objBinDetails[vPutBinDtls]['item'];
										if(!mixItemsInBins)
										{
											//log.debug({title:'mixItemBinsArr',details:mixItemBinsArr});
											BinIdArr.push(strBinId);
											if(invtItem != getItemInternalId || mixItemBinsArr.indexOf(strBinId) == -1 )
											{
												isValidBin = false;

											}
											else
											{
												var strBinId1 ='';
												var invtItem1 ='';
												for(var p=0;p<objBinDetails.length;p++)
												{
													strBinId1 = objBinDetails[p]['binnumber'];
													invtItem1 = objBinDetails[p]['item'];
													if(strBinId1 == strBinId && invtItem1 != getItemInternalId )
													{
														isValidBin = false;
														break;
													}
												}
											}
										}
										if(isValidBin)
										{
											invStatus = objBinDetails[vPutBinDtls]['statusText'];
											invStatusId = objBinDetails[vPutBinDtls]['status'];
											vBinQtyAvail = objBinDetails[vPutBinDtls]['onhand'];
											binQtyAvailWithUOM = vBinQtyAvail;// + " "+selectedUOMText;
											if(_isValueValid(selectedUOMText))
											{
												binQtyAvailWithUOM = vBinQtyAvail+ " "+selectedUOMText;
											}
											else
											{
												selectedUOMText = '';
											}
											if(_isValueValid(vBinQtyAvail) && _isValueValid(selectedConvRate) &&
													_isValueValid(currentConvRate) 
													&& (selectedConvRate != currentConvRate))
											{
												vBinQtyAvail = uomConversions(vBinQtyAvail,selectedConvRate,currentConvRate);
												if(vBinQtyAvail > 0)
												{
													binQtyAvailWithUOM = vBinQtyAvail + " "+selectedUOMText;
												}
											}
											var binNumberIndex = BinIdArr.indexOf(strBinId);
											if(binNumberIndex == -1)
											{
												BinIdArr.push(strBinId);
												vBinLocArr.push(strBinId);
												binIndex = vBinLocIdArr.indexOf(strBinId);
												zone = binZoneArr[binIndex];
												var currentRowValues = {'binName':strBin,'binInternalId':strBinId,'statusName':invStatus,
														'statusInternalId':invStatusId,'quantity':vBinQtyAvail,'zone':zone,
														'quantityWithUOM':binQtyAvailWithUOM};
												vTotalBinArr.push(currentRowValues);
											}
											else
											{
												if(!inventoryStatusFeature)
												{
													var binNumberQty = vTotalBinArr[binNumberIndex]['quantity']; 
													var totalQuantity = Number(Big(vBinQtyAvail).plus(binNumberQty));
													vTotalBinArr[binNumberIndex]['quantity'] = totalQuantity;
													if(totalQuantity > 0)
													{
														var binQtyAvailWithUOM1 = totalQuantity + " "+selectedUOMText;
														vTotalBinArr[binNumberIndex]['quantityWithUOM'] = binQtyAvailWithUOM1;
													}
												}
												else
												{
													var binFound = false;
													for(var row in vTotalBinArr)
													{
														var currBinRow = vTotalBinArr[row];
														var binLocId = currBinRow['binInternalId']; 
														var binStatusId = currBinRow['statusInternalId']; 
														if(binLocId == strBinId && invStatusId == binStatusId)
														{
															binFound = true;
															var binNumberQty = currBinRow['quantity']; 
															var totalQuantity = Number(Big(vBinQtyAvail).plus(binNumberQty));
															vTotalBinArr[row]['quantity'] = totalQuantity;
															if(totalQuantity > 0)
															{
																var binQtyAvailWithUOM1 = totalQuantity + " "+selectedUOMText;
																vTotalBinArr[row]['quantityWithUOM'] = binQtyAvailWithUOM1;
															}
															break;
														}
													}
													if(!binFound)
													{
														BinIdArr.push(strBinId);
														vBinLocArr.push(strBinId);
														binIndex = vBinLocIdArr.indexOf(strBinId);
														zone = binZoneArr[binIndex];
														var currentRowValues = {'binName':strBin,'binInternalId':strBinId,'statusName':invStatus,
																'statusInternalId':invStatusId,'quantity':vBinQtyAvail,'zone':zone,
																'quantityWithUOM':binQtyAvailWithUOM};
														vTotalBinArr.push(currentRowValues);
													}

												}
											}
										}
									}
								}

								if(isEmptyBin)
								{
									vBinLocArr.push(vBinLocIdArr[vPutBin]);
									binIndex = vBinLocIdArr.indexOf(vBinLocIdArr[vPutBin]);
									zone = binZoneArr[binIndex];
									var currentRowValues = {'binName':vBinArr[vPutBin],'binInternalId':vBinLocIdArr[vPutBin],
											'statusName':'','statusInternalId':'','quantity':'0','quantityWithUOM':'0','zone':zone};
									vTotalBinArr.push(currentRowValues);
								}
							}
						}
						else
						{
							for (var vPutBin = 0; vPutBin < vBinLocIdArr.length; vPutBin++) {

								vBinLocArr.push(vBinLocIdArr[vPutBin]);
								binIndex = vBinLocIdArr.indexOf(vBinLocIdArr[vPutBin]);
								zone = binZoneArr[binIndex];
								var currentRowValues = {'binName':vBinArr[vPutBin],'binInternalId':vBinLocIdArr[vPutBin],
										'statusName':'','statusInternalId':'','quantity':'0','quantityWithUOM':'0','zone':zone};
								vTotalBinArr.push(currentRowValues);
							}
						}

						/*var blnEmpty = true;
							var binIndex = '';
							var zone =  '';
							for (var vPutBin = 0; vPutBin < vBinLocIdArr.length; vPutBin++) {
								blnEmpty = true;
								for (var vInvBal = 0; vInvBal < BinIdArr.length; vInvBal++) {
									if (BinIdArr[vInvBal] == vBinLocIdArr[vPutBin]) {
										blnEmpty = false;
									}
								}
								if (blnEmpty) {
									vBinLocArr.push(vBinLocIdArr[vPutBin]);
									binIndex = vBinLocIdArr.indexOf(vBinLocIdArr[vPutBin]);
									zone = binZoneArr[binIndex];
									var currentRowValues = {'binName':vBinArr[vPutBin],'binInternalId':vBinLocIdArr[vPutBin],
											'statusName':'','statusInternalId':'','quantity':'0','quantityWithUOM':'0','zone':zone};
									vTotalBinArr.push(currentRowValues);

								}
							}*/

						if (strPutZone != null && strPutZone != '' && strPutZone == '-None-') {
							break;
						}
					}
				}


			}
		}
		log.debug({title:'vTotalBinArr length',details:vTotalBinArr.length});
		return vTotalBinArr;

	}


	function SortByItem(x,y) {
	      return x.sortByItem === y.sortByItem ? x.sortBySeq - y.sortBySeq : x.sortByItem - y.sortByItem;
	    }

	function fnGetItemInventoryBins(strLocation,ItemInternalId) {
		var searchObj = search.load({ id : 'customsearch_wmsse_itemwise_invt_inbound'});
		if (_isValueValid(strLocation)) {
			searchObj.filters.push(search.createFilter({ name :'location',
				join :'binonhand',
				operator: search.Operator.ANYOF,
				values: strLocation
			}));
		}
		searchObj.filters.push(search.createFilter({ name :'internalid',
			operator: search.Operator.ANYOF,
			values: ItemInternalId
		}));
		searchObj.filters.push(search.createFilter({ name :'quantityonhand',
			join :'binonhand',
			operator: search.Operator.GREATERTHAN,
			values: 0
		}));
		
		var alltaskresults = _getSearchResultInJSON(searchObj);
		var binLocArr = [];
		if (alltaskresults.length > 0) {
			for (var f = 0; f < alltaskresults.length; f++) {
				if (binLocArr.indexOf(alltaskresults[f]['binnumber']) == -1) {
					binLocArr.push(alltaskresults[f]['binnumber']);
				}
			}
		}
		log.debug({title:'alltaskresults binLocArr',details:binLocArr.length});
		return binLocArr;
	}

	//Function to get Bins and InternalIds
	function getPutBinAndIntDetails(objPutBinQueryDetails) {

		log.debug({title:'getPutBinAndIntDetailsForBinPutaway',details:objPutBinQueryDetails});
		
		var getItemInternalId =objPutBinQueryDetails['itemInternalId'];
		var strItemGrp = objPutBinQueryDetails['itemGroup'];
		var strItemFam = objPutBinQueryDetails['itemFamily'];
		var blnMixItem = objPutBinQueryDetails['blnMixItem'];
		var blnMixLot = objPutBinQueryDetails['blnMixLot'];
		var getPreferBin = objPutBinQueryDetails['preferedBinName'];
		var strLocation = objPutBinQueryDetails['warehouseLocationId'];
		var itemType =  objPutBinQueryDetails['itemType'];
		var strLot = objPutBinQueryDetails['lotName'];
		var strItemDepartment= objPutBinQueryDetails['department'];
		var strItemClass = objPutBinQueryDetails['class'];
		var strvUnits = objPutBinQueryDetails['transcationUomInternalId'];
		var makeInvAvailFlagFromSelect = objPutBinQueryDetails['makeInvAvailFlagFromSelect'];
		var fromBinInternalId = objPutBinQueryDetails['fromBinInternalId'];
		var selectedUOMText = objPutBinQueryDetails['selectedUOMText'];
		var preferBinInternalId = objPutBinQueryDetails["preferedBinInternalId"];
		var inventoryStatusFeature = isInvStatusFeatureEnabled();

		var vTotalBinArr = [];
		if(_isValueValid(preferBinInternalId) && preferBinInternalId != fromBinInternalId){
			var	preferBinZone ='';
			var fields = ['custrecord_wmsse_zone'];
			var binRec = search.lookupFields({
				type: 'Bin',
				id: preferBinInternalId,
				columns: fields
			});
			if (_isValueValid(binRec)) {
				if(binRec.custrecord_wmsse_zone[0] != undefined)
				{
					preferBinZone = binRec.custrecord_wmsse_zone[0].text;
				}
			}

				var filterPreferBin = [];
				var objBinPreferBinDetails =  [];

				if (_isValueValid(strLocation))
				{
					filterPreferBin.push(search.createFilter({
						name: 'location', operator: search.Operator.ANYOF,
						values: strLocation
					}));
				}

				filterPreferBin.push(search.createFilter({
					name: 'binnumber', operator: search.Operator.ANYOF,
					values: preferBinInternalId
				}));
				if(_isValueValid(fromBinInternalId))
				{
					filterPreferBin.push(search.createFilter({
						name: 'binnumber', operator: search.Operator.NONEOF,
						values: fromBinInternalId
					}));
				}
				

				var objPreferBinDetailsSearch = search.load({
					id: 'customsearch_wmsse_srchres_preferbin',
					type:search.Type.INVENTORY_BALANCE
				});

				var  savedFilters = objPreferBinDetailsSearch.filters;
				objPreferBinDetailsSearch.filters = savedFilters.concat(filterPreferBin);
				objBinPreferBinDetails = _getSearchResultInJSON(objPreferBinDetailsSearch);

				var preferBinAvailQtyArr = [];
				var preferBinStatusArr = [];
				var preferBinStatusIdArr = [];
				var preferBinArr = [];
				log.debug({title:'objBinPreferBinDetails',details:objBinPreferBinDetails});
				if (objBinPreferBinDetails.length > 0) {
					var selectedConvRate = objPutBinQueryDetails['selectedConversionRate'];
					var currentConvRate = objPutBinQueryDetails['stockConversionRate'];
						for(var p in objBinPreferBinDetails)
						{
							var statusMakeAvailable = objBinPreferBinDetails[p]['inventoryavailable'];
							var strBin = objBinPreferBinDetails[p]['binnumberText'];
							var strBinId = objBinPreferBinDetails[p]['binnumber'];
							var invStatus = objBinPreferBinDetails[p]['statusText'];
							var invStatusId = objBinPreferBinDetails[p]['status'];
							var vBinQtyAvail = objBinPreferBinDetails[p]['onhand'];
							var binQtyAvailWithUOM = vBinQtyAvail;// + " "+selectedUOMText;
							if(_isValueValid(selectedUOMText))
							{
								binQtyAvailWithUOM = vBinQtyAvail+ " "+selectedUOMText;
							}
							if(_isValueValid(vBinQtyAvail) && _isValueValid(selectedConvRate) && _isValueValid(currentConvRate) 
									&& (selectedConvRate != currentConvRate))
							{
								vBinQtyAvail = uomConversions(vBinQtyAvail,selectedConvRate,currentConvRate);
								if(vBinQtyAvail > 0)
								{
									binQtyAvailWithUOM = vBinQtyAvail + " "+selectedUOMText;
								}
							}
							var zone ='';

							if(parseFloat(vBinQtyAvail)==0 && preferBinArr.indexOf(strBinId) == -1)
							{
								invStatus = '';
								preferBinArr.push(strBinId);
								var currentRowValues = {'binName':strBin,'binInternalId':strBinId,'statusName':invStatus,
										'statusInternalId':invStatusId,'quantity':vBinQtyAvail,'zone':preferBinZone,'quantityWithUOM':binQtyAvailWithUOM,
										'sortByItem':0,'sortBySeq':0};
								vTotalBinArr.push(currentRowValues);
							}
							else if(parseFloat(vBinQtyAvail)>0)
							{
								var currentRowValues = {'binName':strBin,'binInternalId':strBinId,'statusName':invStatus,
										'statusInternalId':invStatusId,'quantity':vBinQtyAvail,'zone':preferBinZone,'quantityWithUOM':binQtyAvailWithUOM,
										'sortByItem':0,'sortBySeq':0};
								vTotalBinArr.push(currentRowValues);
							}
						}
				}

				else{
					var invStatus ='';
					var invStatusId ='';
					var vBinQtyAvail =0;
					var currentRowValues = {'binName':getPreferBin,'binInternalId':preferBinInternalId,'statusName':invStatus,
							'statusInternalId':invStatusId,'quantity':vBinQtyAvail,'zone':preferBinZone,'quantityWithUOM':vBinQtyAvail,
							'sortByItem':0,'sortBySeq':0};
					vTotalBinArr.push(currentRowValues);

				}
			
		}

		var vBinLocArr = [];
		var vPutZoneArr = [];
		var filters = [];
		var columns = [];
		
		if (_isValueValid(fromBinInternalId)) {
			vBinLocArr.push(fromBinInternalId);
		}
		var objPutstrategiesSearchObj = search.load({
			id: 'customsearch_wmsse_putstrategies_srh'
		});
		filters = objPutstrategiesSearchObj.filters;

		if (_isValueValid(getItemInternalId))
		{
			filters.push(search.createFilter({
				name: 'custrecord_wmsse_item',
				operator: search.Operator.ANYOF,
				values: ['@NONE@', getItemInternalId]
			}));
		}
		if (_isValueValid(strItemGrp))
		{
			filters.push(search.createFilter({
				name: 'custrecord_wmsse_itemgroup', operator: search.Operator.ANYOF,
				values: ['@NONE@', strItemGrp]
			}));
		}
		else
		{
			filters.push(search.createFilter({
				name: 'custrecord_wmsse_itemgroup', operator: search.Operator.ANYOF,
				values: ['@NONE@']
			}));
		}
		if (_isValueValid(strItemFam))
		{
			filters.push(search.createFilter({
				name: 'custrecord_wmsse_itemfamily', operator: search.Operator.ANYOF,
				values: ['@NONE@', strItemFam]
			}));
		}
		else
		{
			filters.push(search.createFilter({
				name: 'custrecord_wmsse_itemfamily', operator: search.Operator.ANYOF,
				values: ['@NONE@']
			}));
		}
		if (_isValueValid(strLocation))
		{
			filters.push(search.createFilter({
				name: 'custrecord_wmsse_location', operator: search.Operator.ANYOF,
				values: ['@NONE@', strLocation]
			}));
		}
		else
		{
			filters.push(search.createFilter({
				name: 'custrecord_wmsse_location', operator: search.Operator.ANYOF,
				values: ['@NONE@']
			}));
		}

		if (_isValueValid(strItemClass))
		{
			filters.push(search.createFilter({
				name: 'custrecord_wmsse_put_class', operator: search.Operator.ANYOF,
				values: ['@NONE@', strItemClass]
			}));
		}
		else
		{
			filters.push(search.createFilter({
				name: 'custrecord_wmsse_put_class', operator: search.Operator.ANYOF,
				values: ['@NONE@']
			}));
		}
		if (_isValueValid(strItemDepartment))
		{
			filters.push(search.createFilter({
				name: 'custrecord_wmsse_put_department', operator: search.Operator.ANYOF,
				values: ['@NONE@', strItemDepartment]
			}));
		}
		else
		{
			filters.push(search.createFilter({
				name: 'custrecord_wmsse_put_department', operator: search.Operator.ANYOF,
				values: ['@NONE@']
			}));
		}
		if (_isValueValid(strvUnits))
		{
			filters.push(search.createFilter({
				name: 'custrecord_wmsse_put_units', operator: search.Operator.ANYOF,
				values: ['@NONE@', strvUnits]
			}));
		}
		

		objPutstrategiesSearchObj.filters = filters;
		var objPutstrategies = _getSearchResultInJSON(objPutstrategiesSearchObj);
		var itemBinsArray = [];
		if (objPutstrategies.length > 0) {
			itemBinsArray = fnGetItemInventoryBins(strLocation,getItemInternalId);

			if (itemType == "lotnumberedinventoryitem" || itemType == "lotnumberedassemblyitem") {
				var binLocArr = fnGetInventoryBinsForLotForBinPutaway(strLocation,strLot,getItemInternalId,null);
				if(binLocArr.length > 0)
				{
					for(var bin= 0 ; bin < binLocArr.length; bin++)
					{
						if(itemBinsArray.indexOf(binLocArr[bin]) == -1)
						{
							itemBinsArray.push(binLocArr[bin]);
						}
					}
				}
			}
			var mixItemsInBins = true;
			if(itemType == "lotnumberedinventoryitem" || itemType == "lotnumberedassemblyitem")
			{
				if((blnMixItem == false ||  blnMixItem == 'false') && (blnMixLot == 'false' || blnMixLot == false) )
				{
					mixItemsInBins = false;
				}
			}
			else
			{
				if((blnMixItem == false ||  blnMixItem == 'false'))
				{
					mixItemsInBins = false;
				}
			}
			 log.debug({title:'itemBinsArr',details:itemBinsArray});
			if(!mixItemsInBins)
				{
				  if(itemBinsArray.length > 0)
					  {
					  var filterInvBal = [];
					  if (_isValueValid(strLocation))
						  {
							filterInvBal.push(search.createFilter({
								name: 'location', operator: search.Operator.ANYOF,
								values: strLocation
							}));
						  }
						
						filterInvBal.push(search.createFilter({
							name: 'item',
							operator: search.Operator.NONEOF,
							values: getItemInternalId
						}));
						filterInvBal.push(search.createFilter({
							name: 'binnumber',
							operator: search.Operator.ANYOF,
							values: itemBinsArray
						}));
						var objOtherItemBinDetailsSearch = search.load({
							id: 'customsearch_wmsse_srchres_statuswise',
							type:search.Type.INVENTORY_BALANCE
						});
						var  savedFilters = objOtherItemBinDetailsSearch.filters;
						objOtherItemBinDetailsSearch.filters = savedFilters.concat(filterInvBal);
						var	objOtherItemBinDetails = _getSearchResultInJSON(objOtherItemBinDetailsSearch);
						 log.debug({title:'objOtherItemBinDetails',details:objOtherItemBinDetails});
					     if(objOtherItemBinDetails.length > 0)
					    	 {
					    	   for(var row in objOtherItemBinDetails)
					    	   {
					    		   var otherItemBin = objOtherItemBinDetails[row]['binnumber'];
					    		   var otherItembinIndex = itemBinsArray.indexOf(otherItemBin);
					    		   if(otherItembinIndex != -1)
					    		   {
					    			   itemBinsArray.splice(otherItembinIndex,1);
					    		   }
					    	   }
					    	 
					    	 }
					     log.debug({title:'itemBinsArr',details:itemBinsArray});

					  }
				}
			var vBinLocIdArr=[];
			var vBinArr = [];
			var BinIdArr =[];
			var binZoneArr=[];
			var strPutZone = '';
			var putStrBinID = '';
			var strBinId = '';
			var strBin =  '';
			var invStatus = '';
			var invStatusId =  '';
			var vBinQtyAvail = '';
			var binQtyAvailWithUOM = '';
			var binIndex = '';
			var zone = '';
			var itemBinFound =  '';
			var sortVar = 3;
			var isEmptyBin = true;
			var selectedConvRate ='';
			var currentConvRate =  '';
			var isMixedBin = true;
			var invstatusid= '';
			var binDetailsArray = [];
			for (var i = 0; i < objPutstrategies.length && vTotalBinArr.length <= 4000; i++) {
				binDetailsArray = [];
				 vBinLocIdArr=[];
				 vBinArr = [];
				 BinIdArr =[];
				 binZoneArr=[];
				 log.debug({title:'objPutstrategies',details:objPutstrategies[i]});
				 strPutZone = objPutstrategies[i]['custrecord_wmsse_putzone'];
				 invstatusid= objPutstrategies[i]['custrecord_wmsse_put_invstatus'];
				 
				if (!_isValueValid(strPutZone))
				{
					strPutZone = "-None-";
				}
				if (strPutZone != null && strPutZone != '' && vPutZoneArr.indexOf(strPutZone) == -1) {

					vPutZoneArr.push(strPutZone);
					var filterStrat = [];

					filterStrat.push(search.createFilter({
						name: 'inactive', operator: search.Operator.IS,
						values: false
					}));

					if (_isValueValid(strPutZone)&& strPutZone != '-None-')
					{
						filterStrat.push(search.createFilter({
							name: 'custrecord_wmsse_zone', operator: search.Operator.ANYOF,
							values: strPutZone
						}));
					}

					if (_isValueValid(strLocation))
					{
						filterStrat.push(search.createFilter({
							name: 'location', operator: search.Operator.ANYOF,
							values: strLocation
						}));
					}
					var objBinDetailsSearch = search.load({id: 'customsearch_wmsse_binsbyzones'});
					var  savedFilters = objBinDetailsSearch.filters;
					objBinDetailsSearch.filters = savedFilters.concat(filterStrat);
					var objBinDetails = _getSearchResultInJSONForValidation(objBinDetailsSearch,4000);//
					if (objBinDetails.length > 0) {

						for (var bin in objBinDetails) {
							if (objBinDetails[bin]['binnumber'] != getPreferBin &&
									vBinLocArr.indexOf(objBinDetails[bin]['internalid']) == -1)
							{
								vBinLocIdArr.push(objBinDetails[bin]['internalid']);
								vBinArr.push(objBinDetails[bin]['binnumber']);
								binZoneArr.push(objBinDetails[bin]['custrecord_wmsse_zoneText']);

							}
						}

						var filterInvBal = [];
						var objBinDetails =  [];
						if(vBinLocIdArr.length > 0)
						{
							if (_isValueValid(strLocation))
								filterInvBal.push(search.createFilter({
									name: 'location', operator: search.Operator.ANYOF,
									values: strLocation
								}));
							
							filterInvBal.push(search.createFilter({
								name: 'binnumber',
								operator: search.Operator.ANYOF,
								values: vBinLocIdArr
							}));
							
							var objBinDetailsSearch = search.load({
								id: 'customsearch_wmsse_srchres_statuswise',
								type:search.Type.INVENTORY_BALANCE
							});

							var  savedFilters = objBinDetailsSearch.filters;
							objBinDetailsSearch.filters = savedFilters.concat(filterInvBal);
							objBinDetails = _getSearchResultInJSONForValidation(objBinDetailsSearch,4000);
							
						}
						 log.debug({title:'objBinDetails',details:objBinDetails});
						if (objBinDetails.length > 0) {
							
							 selectedConvRate = objPutBinQueryDetails['selectedConversionRate'];
							 currentConvRate =  objPutBinQueryDetails['stockConversionRate'];
							
							 putStrBinID = '';
							 strBinId = '';
							 strBin =  '';
							 invStatus = '';
							 invStatusId =  '';
							 vBinQtyAvail = '';
							 binQtyAvailWithUOM = '';
							 binIndex = '';
							 zone = '';
							 itemBinFound =  '';
							 sortVar = 3;
							 isEmptyBin = true;
							 
							for (var vPutBin = 0; vPutBin < vBinLocIdArr.length; vPutBin++) {
								 putStrBinID = vBinLocIdArr[vPutBin];
								 isEmptyBin = true;
								for (var vPutBinDtls in  objBinDetails) {

									 strBinId = objBinDetails[vPutBinDtls]['binnumber'];
									if(strBinId == putStrBinID)
									{
										isEmptyBin = false;
										invStatusId = objBinDetails[vPutBinDtls]['status'];
										var putStatusId = invstatusid;
										if(_isValueValid(invstatusid))
										{
											putStatusId = invstatusid;
										}
										else
										{
											putStatusId = invStatusId;
										}
										if(invStatusId == putStatusId)
										{

											strBin = objBinDetails[vPutBinDtls]['binnumberText'];
											invStatus = objBinDetails[vPutBinDtls]['statusText'];
											vBinQtyAvail = objBinDetails[vPutBinDtls]['onhand'];
											binQtyAvailWithUOM = vBinQtyAvail;

											if(_isValueValid(selectedUOMText))
											{
												binQtyAvailWithUOM = vBinQtyAvail+ " "+selectedUOMText;
											}
											if(_isValueValid(vBinQtyAvail) && _isValueValid(selectedConvRate) && _isValueValid(currentConvRate) 
													&& (selectedConvRate != currentConvRate))
											{
												vBinQtyAvail = uomConversions(vBinQtyAvail,selectedConvRate,currentConvRate);
												if(parseFloat(vBinQtyAvail) > 0)
												{
													binQtyAvailWithUOM = vBinQtyAvail + " "+selectedUOMText;
												}
											}

											BinIdArr.push(strBinId);
											vBinLocArr.push(strBinId);

											binIndex = vBinLocIdArr.indexOf(strBinId);
											zone = binZoneArr[binIndex];

											itemBinFound = itemBinsArray.indexOf(putStrBinID);
											sortVar = 3;
											isMixedBin = true;

											if(!blnMixItem && itemBinFound == -1)
											{
												isMixedBin = false;
											}
											if(itemBinFound != -1)
											{
												sortVar = 1;
											}
											if(isMixedBin)
											{
												var currentRowValues = {'binName':strBin,'binInternalId':strBinId,'statusName':invStatus,
														'statusInternalId':invStatusId,'quantity':vBinQtyAvail,'zone':zone,'quantityWithUOM':binQtyAvailWithUOM,
														'sortByItem':sortVar,'sortBySeq':vPutBin};
												binDetailsArray.push(currentRowValues);
											}
										}
									}

								}
								if(isEmptyBin)
								{
									vBinLocArr.push(vBinLocIdArr[vPutBin]);
									binIndex = vBinLocIdArr.indexOf(vBinLocIdArr[vPutBin]);
									zone = binZoneArr[binIndex];
									currentRowValues = {'binName':vBinArr[vPutBin],'binInternalId':vBinLocIdArr[vPutBin],
											'statusName':'','statusInternalId':'','quantity':'0','quantityWithUOM':'0','zone':zone,
											'sortByItem':2,'sortBySeq':vPutBin};
									binDetailsArray.push(currentRowValues);
								}
								//log.debug({title:'binDetailsArray',details:binDetailsArray});
							}
						}
						else
						{
                            //  All are empty bins
							var binIndex = '';
							var zone =  '';
							for (var vPutBin = 0; vPutBin < vBinLocIdArr.length; vPutBin++) {

								vBinLocArr.push(vBinLocIdArr[vPutBin]);
								binIndex = vBinLocIdArr.indexOf(vBinLocIdArr[vPutBin]);
								zone = binZoneArr[binIndex];
								var currentRowValues = {'binName':vBinArr[vPutBin],'binInternalId':vBinLocIdArr[vPutBin],
										'statusName':'','statusInternalId':'','quantity':'0','quantityWithUOM':'0','zone':zone,
										'sortByItem':2,'sortBySeq':vPutBin};
								binDetailsArray.push(currentRowValues);

							}
						}
						

						
					}
					
					
					
				}
				binDetailsArray = binDetailsArray.sort(SortByItem);
				vTotalBinArr =	vTotalBinArr.concat(binDetailsArray);
				if (strPutZone != null && strPutZone != '' && strPutZone == '-None-' || vTotalBinArr.length >= 4000) {
				break;
			}
				
			}
		}
		log.debug({title:'vTotalBinArr',details:vTotalBinArr});
		return vTotalBinArr;
	
	}



	function getPickerDetails(location,currentUser)
	{
		var pickerRoleSrch = search.load({id:'customsearch_wms_picker_role_srch'});

		pickerRoleSrch.filters.push(search.createFilter({
			name:'location',
			operator:search.Operator.ANYOF,
			values:location
		}));

		pickerRoleSrch.filters.push(search.createFilter({
			name:'internalid',
			operator:search.Operator.ANYOF,
			values: currentUser
		}));


		var	 objpickerSearchDetails = _getSearchResultInJSON(pickerRoleSrch);
		log.debug({title:'objpickerSearchDetails ',details:objpickerSearchDetails});

		return objpickerSearchDetails;

	}
	function _updateStageForNonInventoryItem(pickTaskId,line,pickingType,OrderInternalId)
	{

		var vPicktaskStgRec = record.load({type:'picktask',
			id:pickTaskId
		});
		log.debug({title:'vPicktaskStgRec ',details:vPicktaskStgRec});
		var complinelength =vPicktaskStgRec.getLineCount({
			sublistId:'pickactions'
		});

		if(pickingType == "multiorder")
		{
			for(var Ifitr=0;Ifitr<complinelength;Ifitr++)
			{
				var pickTaskOrderId = vPicktaskStgRec.getSublistValue({sublistId: 'pickactions',fieldId: 'ordernumber',line:Ifitr});
				var lineId = vPicktaskStgRec.getSublistValue({sublistId: 'pickactions',fieldId: 'linenumber',line:Ifitr});

				if(OrderInternalId == pickTaskOrderId && line == lineId)
				{
					vPicktaskStgRec.setSublistValue({
						sublistId: 'pickactions',
						fieldId: 'status',
						line : parseInt(Ifitr),
						value: 'STAGED'
					});
				}
			}

		}
		else
		{
			vPicktaskStgRec.setSublistValue({
				sublistId: 'pickactions',
				fieldId: 'status',
				line : 0,
				value: 'STAGED'
			});
		}

		var picktaskrecId=vPicktaskStgRec.save();


		var vPicktaskDoneRec = record.load({type:'picktask',
			id:pickTaskId
		});

		//var lineNo = (parseInt(0));
		var complinelength =vPicktaskDoneRec.getLineCount({
			sublistId:'pickactions'
		});
		if(pickingType == "multiorder")
		{
			for (var pickAction = 0; pickAction < complinelength; pickAction++)
			{
				var pickTaskOrderId = vPicktaskDoneRec.getSublistValue({sublistId: 'pickactions',fieldId: 'ordernumber',line:pickAction});
				var lineId = vPicktaskDoneRec.getSublistValue({sublistId: 'pickactions',fieldId: 'linenumber',line:pickAction});

				if(OrderInternalId == pickTaskOrderId && line == lineId)
				{
					vPicktaskStgRec.setSublistValue({
						sublistId: 'pickactions',
						fieldId: 'status',
						line : pickAction,
						value: 'DONE'
					});
				}
			}
		}
		else
		{
			vPicktaskStgRec.setSublistValue({
				sublistId: 'pickactions',
				fieldId: 'status',
				line : 0,
				value: 'DONE'
			});

		}
		var picktaskrecId=vPicktaskStgRec.save();

	}
	
	
	
	
	function _wmsmenusHiding(isEnabled)
	{
		var scrdeploymentquickship=search.create({
			type: search.Type.SCRIPT_DEPLOYMENT,
			filters:[
				search.createFilter({
					name: 'scriptid',
					operator: 'is',
					values: 'customdeploy_wms_gui_quickship'
				})
				]
		});
		var result=scrdeploymentquickship.run().getRange({
			start: 0,
			end: 1
		}) || [];
		if(result.length>0){
			var menuDeploymentRecordquickship=record.load({
				type: record.Type.SCRIPT_DEPLOYMENT,
				id: result[0].id
			});
			menuDeploymentRecordquickship.setValue({
				fieldId:'isdeployed',
				value:isEnabled,
				ignoreFieldChange: true
			});
			menuDeploymentRecordquickship.save();
		}

		//Packing script deployment
		var scrdeploymentpacking=search.create({
			type: search.Type.SCRIPT_DEPLOYMENT,
			filters:[
				search.createFilter({
					name: 'scriptid',
					operator: 'is',
					values: 'customdeploy_wms_gui_packing'
				})
				]
		});
		var result=scrdeploymentpacking.run().getRange({
			start: 0,
			end: 1
		}) || [];
		if(result.length>0){
			var menuDeploymentRecordpacking=record.load({
				type: record.Type.SCRIPT_DEPLOYMENT,
				id: result[0].id
			});
			menuDeploymentRecordpacking.setValue({
				fieldId:'isdeployed',
				value:isEnabled,
				ignoreFieldChange: true
			});
			menuDeploymentRecordpacking.save();
		}
		//-----------------------------------------------------

		//pickreversal script deploymeny
		var scrdeploymentreversal=search.create({
			type: search.Type.SCRIPT_DEPLOYMENT,
			filters:[
				search.createFilter({
					name: 'scriptid',
					operator: 'is',
					values: 'customdeploy_wms_guipickreversal'
				})
				]
		});
		var result=scrdeploymentreversal.run().getRange({
			start: 0,
			end: 1
		}) || [];
		if(result.length>0){
			var menuDeploymentRecordreversal=record.load({
				type: record.Type.SCRIPT_DEPLOYMENT,
				id: result[0].id
			});
			menuDeploymentRecordreversal.setValue({
				fieldId:'isdeployed',
				value:isEnabled,
				ignoreFieldChange: true
			});
			menuDeploymentRecordreversal.save();
		}
		//-----------------------------------------------------
		


		//marktaskdone script deploymeny
		var scrdeploymentmarktaskdone=search.create({
			type: search.Type.SCRIPT_DEPLOYMENT,
			filters:[
				search.createFilter({
					name: 'scriptid',
					operator: 'is',
					values: 'customdeploy_wms_gui_mrkcmp_partial_pick'
				})
				]
		});
		var result=scrdeploymentmarktaskdone.run().getRange({
			start: 0,
			end: 1
		}) || [];
		if(result.length>0){
			var menuDeploymentRecordmarktaskdone=record.load({
				type: record.Type.SCRIPT_DEPLOYMENT,
				id: result[0].id
			});
			menuDeploymentRecordmarktaskdone.setValue({
				fieldId:'isdeployed',
				value:isEnabled,
				ignoreFieldChange: true
			});
			menuDeploymentRecordmarktaskdone.save();
		}
		//-----------------------------------------------------
		


		//Mobilemenu script deploymeny
		var scrdeploymentMobilemenu=search.create({
			type: search.Type.SCRIPT_DEPLOYMENT,
			filters:[
				search.createFilter({
					name: 'scriptid',
					operator: 'is',
					values: 'customdeploy_wms_mobilemenu'
				})
				]
		});
		var result=scrdeploymentMobilemenu.run().getRange({
			start: 0,
			end: 1
		}) || [];
		if(result.length>0){
			var menuDeploymentRecordmobilemenu=record.load({
				type: record.Type.SCRIPT_DEPLOYMENT,
				id: result[0].id
			});
			menuDeploymentRecordmobilemenu.setValue({
				fieldId:'isdeployed',
				value:isEnabled,
				ignoreFieldChange: true
			});
			menuDeploymentRecordmobilemenu.save();
		}
		//-----------------------------------------------------

	}
	
	function noCodeSolForPicking(pickTaskId, waveId, soId,toId,txnLineId,picktaskLineId)
	{
		var pickTaskIdArr = [];
		var waveIdArr = [];
		var saleOrderIdArr = [];
		var transOrderIdArr = [];
		var tranLineIdArr = [];
		var pickLineIdArr = [];
		var impactedRecords = {};
		
		if(_isValueValid(pickTaskId)){
			pickTaskIdArr.push(pickTaskId);
		}else{
			pickTaskIdArr.push();
		}
		
		if(_isValueValid(waveId)){
			waveIdArr.push(parseInt(waveId));
		}else{
			waveIdArr.push();
		}
		
		if(_isValueValid(soId)){
			saleOrderIdArr.push(parseInt(soId));
		}else{
			saleOrderIdArr.push();
		}
		
		if(_isValueValid(toId)){
			transOrderIdArr.push(parseInt(toId));
		}else{
			transOrderIdArr.push();
		}
		
		if(_isValueValid(txnLineId)){
			tranLineIdArr.push(txnLineId);
		}else{
			tranLineIdArr.push();
		}
		
		if(_isValueValid(picktaskLineId)){
			pickLineIdArr.push(picktaskLineId);
		}else{
			pickLineIdArr.push();
		}
		impactedRecords['picktask'] = pickTaskIdArr;
		impactedRecords['wave'] = waveIdArr;
		impactedRecords['salesorder'] = saleOrderIdArr;
		impactedRecords['transferorder'] = transOrderIdArr;
		impactedRecords['trasactionlineno'] = tranLineIdArr;
		impactedRecords['picktasklineno'] = pickLineIdArr;		
		log.debug({title:'impactedRecords :', details: impactedRecords });
       return impactedRecords;
	}
	function getBackOrderQty(warehouseLocationId, itemInternalId)
	{
		var backOrdQtySearch= search.load({id:'customsearch_wms_backord_qty_dtls'});
		var backOrdQtySearchFilters = backOrdQtySearch.filters;
		var backordqty = '';

		backOrdQtySearchFilters.push(search.createFilter({
				name: 'inventorylocation',
				operator: search.Operator.ANYOF,
				values: ['@NONE@',warehouseLocationId]
			}));
			backOrdQtySearchFilters.push(search.createFilter({
				name: 'internalid',
				operator: search.Operator.ANYOF,
				values: itemInternalId
			}));
		backOrdQtySearch.filters = backOrdQtySearchFilters;

		var backOrdQtySrchRes =_getSearchResultInJSON(backOrdQtySearch);
		
		if(_isValueValid(backOrdQtySrchRes))
		{
			log.debug('Back Order Qty Search Results:',backOrdQtySrchRes);
			
		  if(_isValueValid(backOrdQtySrchRes[0]['locationquantitybackordered'])){
			  backordqty = backOrdQtySrchRes[0]['locationquantitybackordered'];
		  }
		  if(!_isValueValid(backordqty)){
			  backordqty = 0;
		  }
		}else{
		      backordqty = 0;
		}
		return backordqty;
	}
	function getBaseUnitRate(vUnitTypeId)
	{  var baseUnitSrch= search.load({id:'customsearch_wms_get_baseunit'}); 
     	baseUnitSrch.filters.push(search.createFilter({
			name: 'internalid',
			operator: search.Operator.ANYOF,
			values: vUnitTypeId
		}));
	var baseUnitSrchRes = _getSearchResultInJSON(baseUnitSrch);
	log.debug('baseUnitSrchRes',baseUnitSrchRes);
		return baseUnitSrchRes;
	}
	function getCustomerASNEnabled(customerId){

		var customerInfoSearch = search.load({id:'customsearch_wms_asn_customer_details'});
		var customerInfoFilter = customerInfoSearch.filters;
		if(_isValueValid(customerId))
		{
			customerInfoFilter.push(search.createFilter({
				name:'internalid',
				operator:search.Operator.ANYOF,
				values:customerId}));
		}

		customerInfoSearch.filters = customerInfoFilter;

		var customerInfoObjDetails = _getSearchResultInJSON(customerInfoSearch);


		return customerInfoObjDetails;

	}
	return {
		getPOLineDetailsNew : getPOLineDetailsNew,
		checkTransactionLock : checkTransactionLock,
		getSKUIdWithName : getSKUIdWithName,
		getItemType : getItemType,
		isInvStatusFeatureEnabled :isInvStatusFeatureEnabled,
		getStockCoversionRate :getStockCoversionRate,
		getUnitsType: getUnitsType,
		getSystemRuleValue :getSystemRuleValue,
		getDefaultInventoryStatusList :getDefaultInventoryStatusList,
		getPutBinAndIntDetails :getPutBinAndIntDetails,
		getValidBinInternalId :getValidBinInternalId,
		getOpenTaskStockCoversionRate :getOpenTaskStockCoversionRate,		
		getBinwiseQtyDetails :getBinwiseQtyDetails,
		isInventoryNumberExists :isInventoryNumberExists,
		getBinInternalId: getBinInternalId,
		postItemReceipt:postItemReceipt,
		setExpiryDate :setExpiryDate,
		getRoleBasedLocation : getRoleBasedLocation,
		DateSetting:DateSetting,
		convertDate:convertDate,
		getSearchResultInJSON : _getSearchResultInJSON,
		getCurrentUserLanguage: _getCurrentUserLanguage,
		getAllLocations:_getAllLocations,
		getWHLocations:_getWHLocations,
		getPoOverage:_getPoOverage,
		getItemCostRuleValue:_getItemCostRuleValue,
		isValueValid:_isValueValid,
		getRecevingOrderItemDetails:_getRecevingOrderItemDetails,
		getRecevingOrderDetails:_getRecevingOrderDetails,
		getItemSearchDetails:_getItemSearchDetails,
		getOpentaskOpenPutwayDetails:_getOpentaskOpenPutwayDetails,
		getAllOpentaskOpenPutwayDetails:_getAllOpentaskOpenPutwayDetails,
		searchResultToJsonForPOListBYVendor:_searchResultToJsonForPOListBYVendor,
		itemValidationForInventoryAndOutBound:_itemValidationForInventoryAndOutBound,
		uomConversions:uomConversions,
		getStageLocations:_getStageLocations,
		fnGetInventoryBins:fnGetInventoryBins,
		fnGetInventoryBinsForLot:fnGetInventoryBinsForLot,
		inventoryBinTransfer:inventoryBinTransfer,
		putawayallBinTransfer:putawayallBinTransfer,
		transferallInvTransfer:transferallInvTransfer,
		inventoryInvTransfer:inventoryInvTransfer,
		getPickBinDetailsLotWithExpiryDates:getPickBinDetailsLotWithExpiryDates,
		inventoryNumberInternalId:inventoryNumberInternalId,
		DateStamp:DateStamp,
		DateSetting:DateSetting,
		getPickBinDetails:getPickBinDetails,
		getPickTaskDetails:getPickTaskDetails,
		getPickBinDetailsLot:getPickBinDetailsLot,
		getInventoryStatusOptions:getInventoryStatusOptions,
		getcomponentmapping:_getcomponentmapping,
		getBinQtyDetails:getBinQtyDetails,
		getItemDetails:getItemDetails,
		getstatusDetails:getstatusDetails,
		getserialDetails:getserialDetails,
		fnGetInventoryforserial:fnGetInventoryforserial,
		isIntercompanyCrossSubsidiaryFeatureEnabled:isIntercompanyCrossSubsidiaryFeatureEnabled,
		getTOfulfilledLotDetails:_getTOfulfilledLotDetails,
		getInboundStageBinDetails:_getInboundStageBinDetails,
		getInventoryDetailsFromBins:_getInventoryDetailsFromBins,
		getInventoryDetailsforItem:_getInventoryDetailsforItem,
		getItemWiseStatusDetailsInBin:_getItemWiseStatusDetailsInBin,
		getItemWiseDetails:_getItemWiseDetails,
		consolidatePostItemReceipt:consolidatePostItemReceipt,
		getSubsidiaryforLocation:getSubsidiaryforLocation,
		consolidatePostItemReceiptforTO:consolidatePostItemReceiptforTO,
		getOrderStatus:_getOrderStatus,
		getOpenPutawayTasksforIRPosting:_getOpenPutawayTasksforIRPosting,
		getOTResultsforIRPosting:getOTResultsforIRPosting,
		updateScheduleScriptStatus:updateScheduleScriptStatus,
		getValidBinInternalIdWithLocationTypeInv:_getValidBinInternalIdWithLocationTypeInv,
		invokeNSInventoryAdjustment:_InvokeNSInventoryAdjustment,
		ValidateDate:ValidateDate,
		getItemMixFlag:getItemMixFlag,
		validateLocationForAccNo:validateLocationForAccNo,
		getTransferOrderItemReceiptDetails:_getTransferOrderItemReceiptDetails,
		getTransferOrderOpenTaskDetails:_getTransferOrderOpenTaskDetails,
		getItemList:getItemList,
		getCurrentTimeStamp:getCurrentTimeStamp,
		getSerialList:_getSerialList,
		getReplenItemsList:getReplenItemsList,
		getReplenItemSearch:getReplenItemSearch,
		getCyclePlanTaskDetails:getCyclePlanTaskDetails,
		getAllOpentaskOpenPutwayOrderDetails:getAllOpentaskOpenPutwayOrderDetails,
		inventoryCountPosting:inventoryCountPosting,
		getOPenTaskPickBinDetailsSerialbyStatus:getOPenTaskPickBinDetailsSerialbyStatus,
		createSerialEntry : createSerialEntry,
		updateCycleCountOpenTask : updateCycleCountOpenTask,
		deleteCycleCountOpenTask : deleteCycleCountOpenTask,
		getInventoryBalanceDetails : getInventoryBalanceDetails,
		closeSerialEntryStatusCycleCount : closeSerialEntryStatusCycleCount,
		picktaskupdate:picktaskupdate,
		deleteTransactionLock : deleteTransactionLock,
		getPickingOrderDetails:getPickingOrderDetails,
		getPickingWaveDetails:getPickingWaveDetails,
		getPickTaskDetails:getPickTaskDetails,
		getwavePickTaskDetails:getwavePickTaskDetails,
		validateStageBin:_validateStageBin,
		updateStageBin:_updateStageBin,
		getStagedPickTaskDetails:getStagedPickTaskDetails,
		getPickingLotDetails:_getPickingLotDetails,
		getOrdersForQuickship:getOrdersForQuickship,
		getQuickShipFlagbyShipmethod:getQuickShipFlagbyShipmethod,
		getQSCartonList :  getQSCartonList,
		fnIsContainerLpExist : fnIsContainerLpExist,
		orderDetailsList:orderDetailsList,
		getSerViceLevel:getSerViceLevel,
		fnCreateShipManifestRecord : fnCreateShipManifestRecord,
		getMultiOrderWaveList : getMultiOrderWaveList,
		getMultiOrderContainerList : getMultiOrderContainerList,
		getMultiOrderStageItemList : getMultiOrderStageItemList,
		getMultiOrderPickTaskOrderDetails:getMultiOrderPickTaskOrderDetails,
		getShipmethods:getShipmethods,
		getAllprinternames:getAllprinternames,
		getLocationName:getLocationName,
		bindPackingLinesSublist :bindPackingLinesSublist,
		updateItemfulfillment :updateItemfulfillment,
		multiorderpicktaskupdate :multiorderpicktaskupdate,
		fnEmptyBin:_fnEmptyBin,
		getMultiOrderPickTaskDetails:getMultiOrderPickTaskDetails,
		getMultiOrderPickTaskCompletedDetails:getMultiOrderPickTaskCompletedDetails,
		loadCyclePlanItemListForSeletedBin : loadCyclePlanItemListForSeletedBin,
		createPacklistHtml:createPacklistHtml,
		getInvdtldataforPacking:getInvdtldataforPacking,
		GenerateLabel:GenerateLabel,
		GenerateUCCLabel:GenerateUCCLabel,
		GenerateZebraUccLabel:GenerateZebraUccLabel,
		CreateLabelData:CreateLabelData,
		GenerateZebraAddressLabel:GenerateZebraAddressLabel,
		fngethtmlstring:fngethtmlstring,
		migrateZones:_migrateZones,
		getConversionRate:getConversionRate,
		getPickTaskStageflag:getPickTaskStageflag,
		getOutboundStageBinDetails : getOutboundStageBinDetails,
		getBinQtyDetailsItemwise:getBinQtyDetailsItemwise,
		getSearchResultInJSONForValidation:_getSearchResultInJSONForValidation,
		getstatusDetailsForValidation:_getstatusDetailsForValidation,
		getBinQtyDetailsItemwiseForValidation:_getBinQtyDetailsItemwiseForValidation,
		getPickTaskDetailsForValidation:_getPickTaskDetailsForValidation,
		getmultiorderPickTaskDetailsForValidation:_getmultiorderPickTaskDetailsForValidation,
		getItemWiseDetailsinventoryNumberBinOnhand:_getItemWiseDetailsinventoryNumberBinOnhand,
		getTransactionOrderlineCount :_getTransactionOrderlineCount,
		getInventoryAvailableStatus:getInventoryAvailableStatus,
		getSelectedStatus:getSelectedStatus,
		fnGetBinsbyZones:fnGetBinsbyZones,
		fnGetBinsbyZonesAlongWithStage:fnGetBinsbyZonesAlongWithStage,
		getStatusId:getStatusId,
		getLotInternalId : getLotInternalId,
		getPickTaskDtlstoIncldAlreadyPickedOrders:getPickTaskDtlstoIncldAlreadyPickedOrders,
		updateStageForNonInventoryItem : _updateStageForNonInventoryItem,
		wmsmenusHiding:_wmsmenusHiding,
		noCodeSolForPicking:noCodeSolForPicking,
		getBackOrderQty : getBackOrderQty,
		getBaseUnitRate:getBaseUnitRate,
		getCustomerASNEnabled:getCustomerASNEnabled
	}
});
