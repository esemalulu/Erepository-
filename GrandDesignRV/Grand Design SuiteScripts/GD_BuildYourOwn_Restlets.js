/**
 * List of Restlets that are used in Build Your Own (BYO) for Grand Design public website.
 * 
 * Version    Date            Author           Remarks
 * 1.00       13 Apr 2016     Ibrahim Abdalla
 *
 */

var BYO_DEALER_TYPE_PRODUCTLINE = 'Product Line';
var BYO_DEALER_TYPE_STOCK = 'Stock';
var WEB_ORDER_STATUS_SUCCESS = 'OK';
var WEB_ORDER_STATUS_SUCCESS_NOEMAIL = 'OK NO EMAIL';
var WEB_ORDER_STATUS_FAILED = 'FAILED';
var EMAIL_SENDER_EMPLOYEE_ID = 2357; //We will use Scales Integration employee internal id to send emails to sales reps when new web order is created.
var NETSUITE_SHOPPING_DOMAIN = 'http://dpshop.';
var NETSUITE_CHECKOUT_DOMAIN = 'https://dpcheckout.';

/**
 * Gets all series available for Build Your Own.
 * @param {Object} dataIn Parameter object
 * @returns {Array} Output object
 */
function GD_GetBYOSeries_Restlet(dataIn) 
{
	var jsonArray = new Array();
	
	var filters = 	[
	              	 new nlobjSearchFilter('isinactive', null, 'is', 'F'),
	              	 new nlobjSearchFilter('custrecordgd_seriesshowinbuildyourown', null, 'is', 'T')
					];
	var cols = [
				 new nlobjSearchColumn('internalid', null, null),
				 new nlobjSearchColumn('name', null, null),
				 new nlobjSearchColumn('custrecordseries_vincode', null, null), 
				 new nlobjSearchColumn('custrecordseries_description', null, null)
			   ];
	cols[1].setSort(false); //sort by name asc.
	
	var results = GetSteppedSearchResults('customrecordrvsseries', filters, cols);	
	if(results != null && results.length > 0)
	{
		for(var i = 0; i < results.length; i++)
		{
			jsonArray.push({
							'id': results[i].getId(),
							'name': results[i].getValue('name'),
							'vinCode': results[i].getValue('custrecordseries_vincode'),
							'description': results[i].getValue('custrecordseries_description')
						  });	
		}
	}
	
	return jsonArray;
}

/**
 * Gets all models available for Build Your Own by series.
 * 
 * @param {Object} dataIn Parameter object
 * @returns {Array} Output object
 */
function GD_GetBYOModelsBySeries_Restlet(dataIn) 
{
	var jsonArray = new Array();
	if(IsDefined(dataIn) && IsDefined(dataIn.seriesId) && IsValidRecordId(dataIn.seriesId))
	{
		var filters = [
						new nlobjSearchFilter('isinactive', null, 'is', 'F'), 
						new nlobjSearchFilter('custitemgd_showinbuildyourown', null, 'is', 'T'),
						new nlobjSearchFilter('custitemrvsitemtype', null, 'is', ITEM_CATEGORY_MODEL),
						//new nlobjSearchFilter('internalid', 'pricing', 'is', GD_PRICE_LEVEL_MSRP), //filter by MSR Price Level UPDATE: Case 8076 require to look at model msrp set.
						new nlobjSearchFilter('internalid', 'custitemrvsmodelseries', 'anyof', dataIn.seriesId)
					  ];
		var cols = [
					 new nlobjSearchColumn('internalid', null, null),
					 new nlobjSearchColumn('itemid', null, null),
					 new nlobjSearchColumn('displayname', null, null), 
					 new nlobjSearchColumn('description', null, null),					 
					 new nlobjSearchColumn('unitprice', 'pricing', null), //Because the results are filtered by MSRP price level, this will be the MSRP Price.
					 new nlobjSearchColumn('custitemrvsmodelseries', null, null),
					 new nlobjSearchColumn('imageurl', null, null), 
					 new nlobjSearchColumn('thumbnailurl', null, null),
					 new nlobjSearchColumn('custitemrvsmodeltype', null, null),
					 new nlobjSearchColumn('custitemrvs_msrplevel', null, null),  //UPDATE: Case 8076 require to look at model msrp set. 6-14-17 JRB
					 new nlobjSearchColumn('internalid', 'pricing', null)		//UPDATE: Case 8076 require to look at model msrp set. 6-14-17 JRB
				   ];
		cols[1].setSort(false); //sort by name asc.
		
		var results = GetSteppedSearchResults('item', filters, cols);
		if(results != null && results.length > 0)
		{
			var unitPrice = 0;
			var msrpLevelOnModel = '';	//UPDATE: Case 8076 require to look at model msrp set. 6-14-17 JRB
			for(var i = 0; i < results.length; i++)
			{
				//UPDATE: Case 8076 require to look at model msrp set. 6-14-17 JRB
				msrpLevelOnModel = results[i].getValue('custitemrvs_msrplevel') || GD_PRICE_LEVEL_MSRP;
				if (msrpLevelOnModel == results[i].getValue('internalid', 'pricing')) {
					unitPrice = parseFloat(results[i].getValue('unitprice', 'pricing'));
					if(isNaN(unitPrice)){unitPrice = 0;}
					unitPrice = Math.round(ConvertNSFieldToFloat(unitPrice.toString())).toFixed(2);
					
					jsonArray.push({
									'id': results[i].getId(),
									'name': results[i].getValue('itemid'),
									'displayName': results[i].getValue('displayname'),
									'description': results[i].getValue('description'),
									'price': unitPrice,
									'seriesId': results[i].getValue('custitemrvsmodelseries'),
									'seriesName': results[i].getText('custitemrvsmodelseries'),
									'imageUrl': getCheckoutDomainUrl(results[i].getValue('imageurl')),
									'thumbnailUrl': getCheckoutDomainUrl(results[i].getValue('thumbnailurl')),
									'modelTypeId': results[i].getValue('custitemrvsmodeltype'),
									'modelTypeName': results[i].getText('custitemrvsmodeltype')
								  });
				}
			}
		}	
	}
	
	return jsonArray;
}

/**
 * Gets an array of JSON objects for "Build Your Own" decors by series or model.
 * 
 * @returns {Array}
 */
function GD_GetBYODecorsBySeriesOrModel_Restlet(dataIn)
{
	var jsonArray = new Array();
	var seriesIdToSearch = 0;
	if(IsDefined(dataIn))
	{
		var model = '';		//UPDATE: Case 8076 require to look at model msrp set. 6-14-17 JRB
		if((IsDefined(dataIn.seriesId) && IsValidRecordId(dataIn.seriesId)))
		{
			seriesIdToSearch = dataIn.seriesId;
		}
		else if(IsDefined(dataIn.modelId) && IsValidRecordId(dataIn.modelId)) //If model Id is set, we want to retrieve series assigned to it.
		{
			model = GetItemRecord(dataIn.modelId); //This returns an item record
			if(model != null)
			{
				var isInactive = model.getFieldValue('isinactive');
				var categoryId = model.getFieldValue('custitemrvsitemtype');
					
				//Make sure that the item record we found is categorized as Model, available in "Build Your Own" and is active
				if(categoryId == ITEM_CATEGORY_MODEL && isInactive == 'F')
					seriesIdToSearch = model.getFieldValue('custitemrvsmodelseries');	
			}
		}
	
		if(seriesIdToSearch > 0)
		{
			var filters = [
			                new nlobjSearchFilter('isinactive', null, 'is', 'F'),
			                new nlobjSearchFilter('custitemgd_showinbuildyourown', null, 'is', 'T'),
			                new nlobjSearchFilter('custitemrvsitemtype', null, 'is', GD_ITEM_CATEGORY_DECOR),
			                new nlobjSearchFilter('type', null, 'is', 'NonInvtPart'),
			                //new nlobjSearchFilter('internalid', 'pricing', 'is', GD_PRICE_LEVEL_MSRP), //filter by MSR Price Level  UPDATE: Case 8076 require to look at model msrp set. 6-14-17 JRB
			               	new nlobjSearchFilter('internalid', 'custitemrvsseriesassigned', 'anyof', [seriesIdToSearch])
			              ];
			
			var cols = [
						 new nlobjSearchColumn('internalid', null, null),
						 new nlobjSearchColumn('itemid', null, null),
						 new nlobjSearchColumn('displayname', null, null), 
						 new nlobjSearchColumn('description', null, null),					 
						 new nlobjSearchColumn('unitprice', 'pricing', null), //Because the results are filtered by MSRP price level, this will be the MSRP Price.
						 new nlobjSearchColumn('internalid', 'custitemrvsseriesassigned', null),
						 new nlobjSearchColumn('name', 'custitemrvsseriesassigned', null),
						 new nlobjSearchColumn('imageurl', null, null), 
						 new nlobjSearchColumn('thumbnailurl', null, null),
						 new nlobjSearchColumn('custitemrvs_msrplevel', null, null),		//UPDATE: Case 8076 require to look at model msrp set. 6-14-17 JRB
						 new nlobjSearchColumn('internalid', 'pricing', null)				//UPDATE: Case 8076 require to look at model msrp set. 6-14-17 JRB
			           ];
			cols[1].setSort(false); //sort by name asc.
			
			var results = GetSteppedSearchResults('item', filters, cols);
			if(results != null && results.length > 0)
			{
				var msrpPrice = 0;
				var msrpLevelOnModel = '';
				for(var i = 0; i < results.length; i++)
				{
					//UPDATE: Case 8076 require to look at model msrp set. 6-14-17 JRB
					msrpLevelOnModel = model != '' ? model.getFieldValue('custitemrvs_msrplevel') || GD_PRICE_LEVEL_MSRP : GD_PRICE_LEVEL_MSRP;
					if (msrpLevelOnModel == results[i].getValue('internalid', 'pricing')) {
						//Because the results are filtered by MSRP price level, this will be the MSRP Price.
						msrpPrice = parseFloat(results[i].getValue('unitprice', 'pricing')); 
						if(isNaN(msrpPrice)){msrpPrice = 0;}
						msrpPrice = Math.round(ConvertNSFieldToFloat(msrpPrice.toString())).toFixed(2);
	
						jsonArray.push({
										'id': results[i].getId(),
										'name': results[i].getValue('itemid'),
										'displayName': results[i].getValue('displayname'),
										'description': results[i].getValue('description'),
										'price': msrpPrice, 
										'seriesId': results[i].getValue('internalid', 'custitemrvsseriesassigned'),
										'seriesName': results[i].getValue('name', 'custitemrvsseriesassigned'),
										'imageUrl': getCheckoutDomainUrl(results[i].getValue('imageurl')),
										'thumbnailUrl': getCheckoutDomainUrl(results[i].getValue('thumbnailurl')),
									  });	
					}
				}
			}
		}		
	}
	return jsonArray;	
}


/**
 * Gets an array of JSON objects for "Build Your Own" options by model.
 * 
 * @returns {Array}
 */
function GD_GetBYOOptionsByModel_Restlet(dataIn)
{
	var jsonArray = new Array();
	if(IsDefined(dataIn) && IsDefined(dataIn.modelId) && IsValidRecordId(dataIn.modelId))
	{
		var modelFields = nlapiLookupField('assemblyitem', dataIn.modelId, ['custitemrvs_msrplevel', 'itemid']);
		var modelMSRPLevel = modelFields.custitemrvs_msrplevel;
		if(modelMSRPLevel == null || modelMSRPLevel == '') //UPDATE: Case 8076 require to look at model msrp set. 6-14-17 JRB
			modelMSRPLevel = GD_PRICE_LEVEL_MSRP;
		
		//First get the Options that are set up as non-inventory items
		var noninvtFilters = [new nlobjSearchFilter('isinactive', null, 'is', 'F'),
		                      new nlobjSearchFilter('isinactive', 'custrecordmodeloption_option', 'is', 'F'), 
		                      new nlobjSearchFilter('custitemgd_showinbuildyourown', 'custrecordmodeloption_option', 'is', 'T'),
		                      new nlobjSearchFilter('internalid', 'custrecordmodeloption_model', 'anyof', dataIn.modelId)];
		var noninvtCols = [new nlobjSearchColumn('itemid', 'custrecordmodeloption_option'),
		                   new nlobjSearchColumn('internalid', 'custrecordmodeloption_option'),
		                   new nlobjSearchColumn('description', 'custrecordmodeloption_option'),
		                   new nlobjSearchColumn('imageurl', 'custrecordmodeloption_option'),
		                   new nlobjSearchColumn('thumbnailurl', 'custrecordmodeloption_option'),
		                   new nlobjSearchColumn('custrecordmodeloption_mandatory'),
		                   new nlobjSearchColumn('custitemgd_byooptionsgroupfield', 'custrecordmodeloption_option'),
		                   new nlobjSearchColumn('custitemgd_byooptionstypefield', 'custrecordmodeloption_option')];
		var noninvtOptionResults = GetSteppedSearchResults('customrecordrvsmodeloption', noninvtFilters, noninvtCols);
		if(noninvtOptionResults != null && noninvtOptionResults.length > 0)
		{
			var optionIdArray = [];
			//Our search was based on a custom record "Model Option"
			//Because of that we could not filter the results using option MSRP price level.
			//To get MSRP of the item, we will search for item pricing for all options that were found.
			//We can then use the item-pricelevel table to find MSRP price for that item/option.
			for(var i = 0; i < noninvtOptionResults.length; i++)
				optionIdArray.push(noninvtOptionResults[i].getValue('internalid', 'custrecordmodeloption_option'));
			
			var itemPricingJSONArray = GetItemPricingJSONArray(optionIdArray); //Create ItemPricing table as a JSON array. We will use this table to find MSRP price.			
			var includedIds = [];
			for(var i = 0; i < noninvtOptionResults.length; i++)
			{
				var nsItemId = noninvtOptionResults[i].getValue('internalid', 'custrecordmodeloption_option');
				if (includedIds.indexOf(nsItemId) == -1)
				{
					includedIds.push(nsItemId);
					jsonArray.push({
									'id': nsItemId,
									'name': noninvtOptionResults[i].getValue('itemid', 'custrecordmodeloption_option'),
									'price': GetItemUnitPriceByPriceLevel(itemPricingJSONArray, nsItemId, modelMSRPLevel), //find MSRP price of the item from the table.
									'description': noninvtOptionResults[i].getValue('description', 'custrecordmodeloption_option'),
									'imageUrl': getCheckoutDomainUrl(noninvtOptionResults[i].getValue('imageurl', 'custrecordmodeloption_option')),
									'thumbnailUrl': getCheckoutDomainUrl(noninvtOptionResults[i].getValue('thumbnailurl', 'custrecordmodeloption_option')),
									'modelId': dataIn.modelId,
									'modelName': modelFields.itemid,
									'isMandatory': noninvtOptionResults[i].getValue('custrecordmodeloption_mandatory'),
									'optionGroupId': noninvtOptionResults[i].getValue('custitemgd_byooptionsgroupfield', 'custrecordmodeloption_option'),
									'optionGroupName': noninvtOptionResults[i].getText('custitemgd_byooptionsgroupfield', 'custrecordmodeloption_option'),
									'optionTypeId': noninvtOptionResults[i].getValue('custitemgd_byooptionstypefield', 'custrecordmodeloption_option'),
									'optionTypeName': noninvtOptionResults[i].getText('custitemgd_byooptionstypefield', 'custrecordmodeloption_option'),
									'itemGroupId': null,
									'itemGroupName': null
								  });
				}
			}
		}
		
		//Then get all of the Options that are part of Item Groups.
		var optgroupFilters = [new nlobjSearchFilter('isinactive', null, 'is', 'F'),
		                       new nlobjSearchFilter('isinactive', 'custrecordmodeloption_option', 'is', 'F'),
		                       new nlobjSearchFilter('type', 'custrecordmodeloption_option', 'is', 'Group'),
		                       new nlobjSearchFilter('internalid', 'custrecordmodeloption_model', 'anyof', dataIn.modelId)];
		var optgroupCols = [new nlobjSearchColumn('custrecordmodeloption_option'),
		                    new nlobjSearchColumn('custrecordmodeloption_mandatory')];
		var optionGroupResults = GetSteppedSearchResults('customrecordrvsmodeloption', optgroupFilters, optgroupCols);
		if(optionGroupResults != null && optionGroupResults.length > 0)
		{
			var allOptionGroupIds = [];
			for(var i = 0; i < optionGroupResults.length; i++)
				allOptionGroupIds.push(optionGroupResults[i].getValue('custrecordmodeloption_option'));
			
			//Each of the results contains a Item Group, so now do the search on the components.
			var optgroupNonInvtFilters = [new nlobjSearchFilter('isinactive', 'memberitem', 'is', 'F'), 
					                      new nlobjSearchFilter('custitemgd_showinbuildyourown', 'memberitem', 'is', 'T'),
					                      new nlobjSearchFilter('internalid', null, 'anyof', allOptionGroupIds)];
			var optgroupNonInvtCols = [new nlobjSearchColumn('itemid'),
			                           new nlobjSearchColumn('itemid', 'memberitem'),
					                   new nlobjSearchColumn('internalid', 'memberitem'),
					                   new nlobjSearchColumn('description', 'memberitem'),
					                   new nlobjSearchColumn('imageurl', 'memberitem'),
					                   new nlobjSearchColumn('thumbnailurl', 'memberitem'),
					                   new nlobjSearchColumn('custitemgd_byooptionsgroupfield', 'memberitem'),
					                   new nlobjSearchColumn('custitemgd_byooptionstypefield', 'memberitem')];
			var optgroupNonInvtResults = GetSteppedSearchResults('item', optgroupNonInvtFilters, optgroupNonInvtCols);
			if(optgroupNonInvtResults != null && optgroupNonInvtResults.length > 0)
			{
				var optionIdArray = [];
				//To get MSRP of the item, we will search for item pricing for all options that were found.
				//We can then use the item-pricelevel table to find MSRP price for that item/option.
				for(var i = 0; i < optgroupNonInvtResults.length; i++)
					optionIdArray.push(optgroupNonInvtResults[i].getValue('internalid', 'memberitem'));
				
				var itemPricingJSONArray = GetItemPricingJSONArray(optionIdArray); //Create ItemPricing table as a JSON array. We will use this table to find MSRP price.			
				var includedIds = [];
				for(var i = 0; i < optgroupNonInvtResults.length; i++)
				{
					var nsItemId = optgroupNonInvtResults[i].getValue('internalid', 'memberitem');
					if (includedIds.indexOf(nsItemId) == -1) 
					{
						includedIds.push(nsItemId);
						jsonArray.push({
										'id': nsItemId,
										'name': optgroupNonInvtResults[i].getValue('itemid', 'memberitem'),
										'price': GetItemUnitPriceByPriceLevel(itemPricingJSONArray, nsItemId, modelMSRPLevel), //find MSRP price of the item from the table.
										'description': optgroupNonInvtResults[i].getValue('description', 'memberitem'),
										'imageUrl': getCheckoutDomainUrl(optgroupNonInvtResults[i].getValue('imageurl', 'memberitem')),
										'thumbnailUrl': getCheckoutDomainUrl(optgroupNonInvtResults[i].getValue('thumbnailurl', 'memberitem')),
										'modelId': dataIn.modelId,
										'modelName': modelFields.itemid,
										'isMandatory': 'F', //Options that are part of a group are never mandatory.
										'optionGroupId': optgroupNonInvtResults[i].getValue('custitemgd_byooptionsgroupfield', 'memberitem'),
										'optionGroupName': optgroupNonInvtResults[i].getText('custitemgd_byooptionsgroupfield', 'memberitem'),
										'optionTypeId': optgroupNonInvtResults[i].getValue('custitemgd_byooptionstypefield', 'memberitem'),
										'optionTypeName': optgroupNonInvtResults[i].getText('custitemgd_byooptionstypefield', 'memberitem'),
										'itemGroupId': optgroupNonInvtResults[i].getId(),
										'itemGroupName': optgroupNonInvtResults[i].getValue('itemid')
									  });
					}
				}
			}
		}
		
		//Sort the jsonArray by the name of the Option.
		jsonArray.sort(function(a, b){
			if(a.name < b.name) return -1;
		    if(a.name > b.name) return 1;
		    return 0;
		});
	}
	
	return jsonArray;
}


/**
 * Gets nearest product line and stock dealers.
 * This restlet always returns two dealers (nearest product line dealer at index 0 and nearest stock dealer at index 1).
 * Note: If one or both dealers were not found, an array with null value(s) in the proper index (indices) is returned.
 * 
 * @param dataIn
 * @returns {Array}
 */
function GD_GetBYONearProdLineAndStockDealer_Rest(dataIn)
{
	var dealerArray = new Array();
	if(IsDefined(dataIn) && IsDefined(dataIn.latitude) && IsDefined(dataIn.longitude) && IsDefined(dataIn.modelId) && IsValidRecordId(dataIn.modelId))
	{
		if(trim(dataIn.latitude) != '' && trim(dataIn.longitude) != '')
		{
			var seriesId = nlapiLookupField('item', dataIn.modelId, 'custitemrvsmodelseries');			
			var dealerResults = GetNearestStockOrProductLineDealerSearchResults(dataIn.latitude, dataIn.longitude, seriesId, null); //search for product line dealers.
			
			if(dealerResults != null && dealerResults.length > 0)
				dealerArray.push(GetJSONDealerObject(dealerResults, 0, BYO_DEALER_TYPE_PRODUCTLINE));
			
			//now get stock dealers.
			dealerResults = GetNearestStockOrProductLineDealerSearchResults(dataIn.latitude, dataIn.longitude, null, dataIn.modelId); //search for stock dealers.			
			if(dealerResults != null && dealerResults.length > 0)				
				dealerArray.push(GetJSONDealerObject(dealerResults, 0, BYO_DEALER_TYPE_STOCK));
			
		}				
	}

	return dealerArray;
}


/**
 * Creates Build Your Own Web Order and returns a json object with status and message.
 * @param {Object} dataIn Parameter object
 * @returns {Object} Output object
 */
function GD_CreateBYOWebOrder_Restlet(dataIn) 
{
	var dealerId = nlapiGetContext().getSetting('SCRIPT', 'custscriptgd_buildyourowndealer'); //build your own dealer id from custom preferences.
	var statusMsg = '';
	var status = WEB_ORDER_STATUS_FAILED;
	var orderId = null;

	if(dataIn != null && dataIn != undefined)
	{
		if(trim(dealerId) != '')
		{
			
			var stateId = '';
			var stateFound = false;
			//Convert the short name of the state to the internal ID of the state.
			var stateResults =	nlapiSearchRecord('customrecordrvs_state', null, 
									new nlobjSearchFilter('custrecordrvs_state_shortname', null, 'is', dataIn.customerState), 
									[new nlobjSearchColumn('custrecordrvs_state_netsuitestate'), new nlobjSearchColumn('custrecordrvs_state_rvscountry')]);	
			
			//For different countries, state short name may not be unique.
			//Example: state with short name "WA" is Washington for USA and it is also Western Australia for Australia
			if (stateResults != null && stateResults.length > 0)
			{
				if(stateResults.length == 1) //found unique state
				{
					stateId = stateResults[0].id;
					stateFound = true;
				}				
				else //found multiple states, filter the correct one using the country.
				{
					var leadCountryName = getCountryFullName(billCountryId);
					var stateCountryName = null;
					for(var i = 0; i < stateResults.length; i++)
					{
						stateCountryName = stateResults[i].getText('custrecordrvs_state_rvscountry');							
						if(stateCountryName != null && leadCountryName.toLowerCase().contains(stateCountryName.toLowerCase()) || stateCountryName.toLowerCase().contains(leadCountryName.toLowerCase()))
						{
							stateId = stateResults[i].id;
							stateFound = true;
							break;
						}
					}
				}
			}

			//Make sure that required fields are set.
			if(IsDefined(dataIn.seriesId) && IsDefined(dataIn.modelId) && IsDefined(dataIn.decorId) && 
			   trim(dataIn.seriesId) != '' && trim(dataIn.modelId) != '' && trim(dataIn.decorId) != '' &&
			   IsDefined(dataIn.customerLatitude) && IsDefined(dataIn.customerLongitude) && trim(dataIn.customerLatitude) != '' && trim(dataIn.customerLongitude) != '' &&
			   IsDefined(dataIn.customerZipCode) && IsDefined(dataIn.customerName) && IsDefined(dataIn.customerEmail) && IsDefined(dataIn.customerPhone) &&
			   IsDefined(dataIn.customerStreetAddress) && IsDefined(dataIn.customerCity) && IsDefined(dataIn.customerState) &&
			   trim(dataIn.customerStreetAddress) != '' && trim(dataIn.customerCity) != '' && trim(dataIn.customerState) != '' &&
			   trim(dataIn.customerZipCode) != '' && trim(dataIn.customerName) != '' && trim(dataIn.customerEmail) != '' && trim(dataIn.customerPhone) != '' && stateFound)
			{
				try
				{
					
					var productLineDealerResult = null;					
					var webOrderRecord = nlapiCreateRecord('estimate');
					webOrderRecord.setFieldValue('entity', dealerId);
					webOrderRecord.setFieldValue('custbodyrvsseries', dataIn.seriesId);
					
					webOrderRecord.setFieldValue('custbodyrvsmodel', dataIn.modelId);	//model and model line
					AddWebOrderLineItem(webOrderRecord, dataIn.modelId, 1);
					
					webOrderRecord.setFieldValue('custbodyrvsdecor', dataIn.decorId); //decor and decor line
					webOrderRecord.setFieldValue('custbodyrvspreviousdecorid', dataIn.decorId); //set previous decor
					AddWebOrderLineItem(webOrderRecord, dataIn.decorId, 1);		
									
										
					//set discount from series
					var dealerDiscount = nlapiLookupField('customrecordrvsseries', dataIn.seriesId, 'custrecordseries_dealerdiscount');
					if(trim(dealerDiscount) != '' && !isNaN(parseFloat(dealerDiscount)) && parseFloat(dealerDiscount) != 0)
					{
						var dealerDiscountItemId = GetDealerDiscountItem();
						if(trim(dealerDiscountItemId) != '')
						{
							webOrderRecord.setFieldValue('discountitem', dealerDiscountItemId);
							webOrderRecord.setFieldValue('discountrate', dealerDiscount);							
						}
					}
					
					webOrderRecord.setFieldValue('custbodygd_byocustomername', dataIn.customerName);
					webOrderRecord.setFieldValue('custbodygd_byocustomeremail', dataIn.customerEmail);
					webOrderRecord.setFieldValue('custbodygd_byocustomerstreetaddress', dataIn.customerStreetAddress);
					webOrderRecord.setFieldValue('custbodygd_byocustomercity', dataIn.customerCity);
					webOrderRecord.setFieldValue('custbodygd_byocustomerstate', stateId);
					webOrderRecord.setFieldValue('custbodygd_byocustomerzipcode', dataIn.customerZipCode);
					webOrderRecord.setFieldValue('custbodygd_byocustomerphone', dataIn.customerPhone);	
					
					var nearestProductLineDealers = GetNearestStockOrProductLineDealerSearchResults(dataIn.customerLatitude, dataIn.customerLongitude, dataIn.seriesId, null);
					if(nearestProductLineDealers != null && nearestProductLineDealers.length > 0)
					{
						productLineDealerResult = nearestProductLineDealers[0];
						webOrderRecord.setFieldValue('custbodygd_byoproductlinedealer', productLineDealerResult.getId());
					}						
					
					var nearestStockDealers = GetNearestStockOrProductLineDealerSearchResults(dataIn.customerLatitude, dataIn.customerLongitude, null, dataIn.modelId);							
					if(nearestStockDealers != null && nearestStockDealers.length > 0)
						webOrderRecord.setFieldValue('custbodygd_byostockdealer', nearestStockDealers[0].getId());
					
					
					if(IsDefined(dataIn.memo) && dataIn.memo != null)
						webOrderRecord.setFieldValue('memo', dataIn.memo);
				
					BuildOptionsHTML(webOrderRecord, dataIn.options, false);	
					
					var salesRepId = null;
					if(productLineDealerResult != null)
					{
						salesRepId = productLineDealerResult.getValue('internalid', 'salesrep');	//nearest dealer sales rep id
						if(trim(salesRepId) != '')
							webOrderRecord.setFieldValue('salesrep', salesRepId);
					}
					
					orderId = nlapiSubmitRecord(webOrderRecord, true, true);
					
					var emailSentStatusObj = null;	
					if(trim(salesRepId) != '')					
						emailSentStatusObj = SendWebOrderCreatedEmail(orderId, salesRepId, dataIn);
																
					if(emailSentStatusObj == null || emailSentStatusObj.status == WEB_ORDER_STATUS_SUCCESS) //no sales rep to send email to or email was sent successfully
					{
						status = WEB_ORDER_STATUS_SUCCESS;
						statusMsg = 'Web Order #' + nlapiLookupField(webOrderRecord.getRecordType(), orderId, 'tranid', false) + ' was successfully created.';
					}
					else //could not send email to sales rep, but web order was successfully created.
					{
						status = WEB_ORDER_STATUS_SUCCESS_NOEMAIL;
						statusMsg = emailSentStatusObj.message; //get message from sentStatusObj
					}
		
				}
				catch(ex)
				{				
					statusMsg = "An unknown error occured during web order submission.\nError Details:\n" + GetErrorMessage(ex);
				}

			}
			else
				statusMsg = 'Missing required fields: latitude, longitude, series, model, decor, customerStreetAddress, customerCity, customerState, customerZip, customerName, customerEmail and customerPhone must all be set.';
		}
		else
			statusMsg = 'Missing "Build Your Own Dealer" setting from Grand Design RV Netsuite account.';	
	}
	else
		statusMsg = 'No data was supplied.';

	//nlapiLogExecution('DEBUG', 'Status Message', statusMsg);
	
	return { "status": status, "orderId" : orderId, "message": statusMsg }; //always return object with status, orderId and message.
}

/**
 * Gets all BYO type and BYO group lists.
 * @param {Object} dataIn Parameter object
 * @returns {Array} Output object
 */
function GD_GetBYOLists_Restlet(dataIn) 
{
	var jsonArray = new Array(); //Main Array
	
	var optionGroupArray = new Array(); //sub array
	
	var optionTypeArray = new Array(); //sub array
	
	// BYO Group List
	var filters = 	[
	              	 new nlobjSearchFilter('isinactive', null, 'is', 'F')
					];
	var cols = [
				 new nlobjSearchColumn('internalid', null, null),
				 new nlobjSearchColumn('name', null, null)
			   ];
	cols[1].setSort(false); //sort by name asc.
	
	var groupResults = GetSteppedSearchResults('customrecordgd_optionsgroup', filters, cols);	
	if(groupResults != null && groupResults.length > 0)
	{
		for(var i = 0; i < groupResults.length; i++)
		{
			optionGroupArray.push({
							'id': groupResults[i].getId(),
							'name': groupResults[i].getValue('name')
						  });	
		}
	}
	jsonArray.push({'group': optionGroupArray});  // add the array of objects as an object
	
	// BYO Type List
	var filters = 	[
	              	 new nlobjSearchFilter('isinactive', null, 'is', 'F')
					];
	var cols = [
				 new nlobjSearchColumn('internalid', null, null),
				 new nlobjSearchColumn('name', null, null)
			   ];
	cols[1].setSort(false); //sort by name asc.
	
	var typeResults = GetSteppedSearchResults('customrecordgd_optionstype', filters, cols);	
	if(typeResults != null && typeResults.length > 0)
	{
		for(var i = 0; i < typeResults.length; i++)
		{
			optionTypeArray.push({
							'id': typeResults[i].getId(),
							'name': typeResults[i].getValue('name')
						  });	
		}
	}
	jsonArray.push({'type': optionTypeArray});  // add the array of objects as an object
	
	return jsonArray;
}

/**
 * Gets all Model type record list.
 * @param {Object} dataIn Parameter object
 * @returns {Array} Output object
 */
function GD_GetBYOModelTypeList_Restlet(dataIn) 
{
	var jsonArray = new Array();
	
	// Filters
	var filters = 	[
	              	 new nlobjSearchFilter('isinactive', null, 'is', 'F'),
	              	 new nlobjSearchFilter('custrecordvehicletype_gd_showbuildnprice', null, 'is', 'T')
					];
	// Columns
	var cols = [
				 new nlobjSearchColumn('internalid', null, null),
				 new nlobjSearchColumn('name', null, null),
				 new nlobjSearchColumn('custrecordvehicletype_vincode', null, null)
			   ];
	cols[1].setSort(false); //sort by name asc.
	
	// Get list
	var vehicleTypeResults = GetSteppedSearchResults('customrecordrvsvehicletype', filters, cols) || '';	
	if(vehicleTypeResults != '')
	{
		for(var i = 0; i < vehicleTypeResults.length; i++)
		{
			jsonArray.push({
							'internalId': vehicleTypeResults[i].getId(),
							'name': vehicleTypeResults[i].getValue('name'),
							'vinCode': vehicleTypeResults[i].getValue('custrecordvehicletype_vincode')
						  });	
		}
	}

	return jsonArray;
}

/**
 * Gets a model available for Build Your Own by Model Internal ID.
 * 
 * @param {Object} dataIn Parameter object
 * @returns {Array} Output object
 */
function GD_GetBYOModelByModelInternalId_Restlet(dataIn) 
{
	var jsonArray = new Array();
	if(IsDefined(dataIn) && IsDefined(dataIn.modelId) && IsValidRecordId(dataIn.modelId))
	{
		var filters = [
						new nlobjSearchFilter('isinactive', null, 'is', 'F'), 
						new nlobjSearchFilter('custitemgd_showinbuildyourown', null, 'is', 'T'),
						new nlobjSearchFilter('custitemrvsitemtype', null, 'is', ITEM_CATEGORY_MODEL),
						//new nlobjSearchFilter('internalid', 'pricing', 'is', GD_PRICE_LEVEL_MSRP), //filter by MSR Price Level  UPDATE: Case 8076 require to look at model msrp set. 6-14-17 JRB
						new nlobjSearchFilter('internalid', null, 'anyof', dataIn.modelId)
					  ];
		var cols = [
					 new nlobjSearchColumn('internalid', null, null),
					 new nlobjSearchColumn('itemid', null, null),
					 new nlobjSearchColumn('displayname', null, null), 
					 new nlobjSearchColumn('description', null, null),					 
					 new nlobjSearchColumn('unitprice', 'pricing', null), //Because the results are filtered by MSRP price level, this will be the MSRP Price.
					 new nlobjSearchColumn('custitemrvsmodelseries', null, null),
					 new nlobjSearchColumn('imageurl', null, null), 
					 new nlobjSearchColumn('thumbnailurl', null, null),
					 new nlobjSearchColumn('custitemrvsmodeltype', null, null),
					 new nlobjSearchColumn('custitemrvs_msrplevel', null, null),  //UPDATE: Case 8076 require to look at model msrp set. 6-14-17 JRB
					 new nlobjSearchColumn('internalid', 'pricing', null)		//UPDATE: Case 8076 require to look at model msrp set. 6-14-17 JRB
				   ];
		cols[1].setSort(false); //sort by name asc.
		
		var results = GetSteppedSearchResults('item', filters, cols);
		if(results != null && results.length > 0)
		{
			var unitPrice = 0;
			var msrpLevelOnModel = '';
			var currentId = '';
			var includedIds = [];
			for(var i = 0; i < results.length; i++)
			{
				//UPDATE: Case 8076 require to look at model msrp set. 6-14-17 JRB
				msrpLevelOnModel = results[i].getValue('custitemrvs_msrplevel') || GD_PRICE_LEVEL_MSRP;
				currentId = results[i].getValue('internalid', 'pricing');
				if (includedIds.indexOf(currentId) == -1 && msrpLevelOnModel == currentId) {
					unitPrice = parseFloat(results[i].getValue('unitprice', 'pricing'));
					if(isNaN(unitPrice)){unitPrice = 0;}
					unitPrice = Math.round(ConvertNSFieldToFloat(unitPrice.toString())).toFixed(2);
					
					jsonArray.push({
									'id': results[i].getId(),
									'name': results[i].getValue('itemid'),
									'displayName': results[i].getValue('displayname'),
									'description': results[i].getValue('description'),
									'price': unitPrice,
									'seriesId': results[i].getValue('custitemrvsmodelseries'),
									'seriesName': results[i].getText('custitemrvsmodelseries'),
									'imageUrl': getCheckoutDomainUrl(results[i].getValue('imageurl')),
									'thumbnailUrl': getCheckoutDomainUrl(results[i].getValue('thumbnailurl')),
									'modelTypeId': results[i].getValue('custitemrvsmodeltype'),
									'modelTypeName': results[i].getText('custitemrvsmodeltype')
								  });
					includedIds.push(currentId);
				}
			}
		}	
	}
	
	return jsonArray;
}

/************************************** HELPER METHODS **********************************/

/**
 * Returns whether or not the url is under shopping domain.
 * @param url
 * @returns {Boolean}
 */
function isShoppingDomainUrl(url)
{
	return (url != null && url != '' && url.toLowerCase().indexOf(NETSUITE_SHOPPING_DOMAIN) > -1);
}

/**
 * Returns checkout domain url for the specified shopping url.
 * If the shoppingUrl is null, empty or not under shopping domain, the same url that was passed in is returned.
 * @param shoppingUrl
 * @returns
 */
function getCheckoutDomainUrl(shoppingUrl)
{
	if(shoppingUrl == null){ return '';}	
	if(isShoppingDomainUrl(shoppingUrl))
		return shoppingUrl.toLowerCase().replace(NETSUITE_SHOPPING_DOMAIN, NETSUITE_CHECKOUT_DOMAIN);
	else
		return shoppingUrl;
}

/**
 * Sends an email to the specified salesRep regarding the specified webOrder.
 * If no error is encountered an empty string is returned, otherwise error message is returned.
 * @param webOrderInternalId
 * @param saleRepId
 * @returns {Object}
 */
function SendWebOrderCreatedEmail(webOrderInternalId, salesRepId, datain)
{
	var statusMsg = '';
	var status = WEB_ORDER_STATUS_FAILED;
	
	var webOrderNumber = nlapiLookupField('estimate', webOrderInternalId, 'tranid');
	try
	{	
		var salesRepHasEmail = false;
		if(salesRepId != null && salesRepId != '')
		{
			var salesRepEmail = nlapiLookupField('employee', salesRepId, 'email');		
			if(salesRepEmail != null && salesRepEmail != '')
			{
				salesRepHasEmail = true;
				var webOrderURL = GetURLPrefix() + nlapiResolveURL('RECORD', 'estimate', webOrderInternalId, 'VIEW');		
				nlapiLogExecution('debug', 'SendWebOrderCreatedEmail', 'WEB ORDER URL: ' + webOrderURL);
				var message = 'New Web Order #' + webOrderNumber + ' has been created from ' +
							  '"Grand Design RV Build Your Own" web site. Click <a href="' + webOrderURL + '">here</a> to view the web order in Netsuite.<br><br>' +
							   'Retail Customer Information:<br>' +
							   'Name: ' + datain.customerName + '<br>' +
							   'Email: ' + datain.customerEmail + '<br>' +
							   'Zip Code: ' + datain.customerZipCode + '<br>' +
							   'Phone #: ' + datain.customerPhone;
						
				//Now that web order has been created, send email to Sales Rep
				nlapiSendEmail(EMAIL_SENDER_EMPLOYEE_ID, salesRepEmail, 'Grand Design RV: Build Your Own Web Order' , message, null, null, null);	
				
				status = WEB_ORDER_STATUS_SUCCESS;
				statusMsg = 'Notification email was successfully sent to: ' + salesRepEmail;
			}
		}
	
		if(!salesRepHasEmail)
		{
			statusMsg = 'Your Web Order #' + webOrderNumber + ' was successfully created, but no sales rep was found in your area.\n' +
						'Please contact Grand Design RV with your Web Order #.';						
		}

	}
	catch(exc)
	{
		statusMsg = 'Your Web Order #' + webOrderNumber + ' was successfully created, but Sales Rep in your area could not be notified.\n' +
					'Please call Grand Design RV with your Web Order #.';
	}
	
	return { "status": status, "message": statusMsg };
}

/**
 * Build optins html checkboxes for BYO.
 */
function BuildOptionsHTML(webOrderRecord, userSelectedOptionsJSONArray, addMandatoryOptions)
{
	var orderModelId = webOrderRecord.getFieldValue('custbodyrvsmodel');
	var isSalesPersonRole = IsSalesPersonLoggedIn();
	
	var dealerId = webOrderRecord.getFieldValue('entity');
	var priceLevel = 'baseprice';
	
	if (dealerId != null && dealerId != '') //Make sure that dealer is selected
	{
		var dealerPriceLevel = nlapiLookupField('customer', dealerId, 'pricelevel'); 
		if (dealerPriceLevel != null && dealerPriceLevel != '' && dealerPriceLevel != '1')
		{
			priceLevel = 'price' + dealerPriceLevel;
		}
	}
	
	if(trim(orderModelId) != '')
	{		
		var html = 
			'<table class="inputreadonly" id="tbloptionslist">' + 
				'<tr>' +
					'<td style="font-weight:bold; width:5%" colspan="2">&nbsp;</td>' +  
					'<td style="font-weight:bold; width:15%">Item</td>' + 
					'<td style="font-weight:bold; width:60%">Description</td>' + 
					'<td style="font-weight:bold; width:10%">Quantity</td>' + 
					'<td style="font-weight:bold; width:10%">Price</td>' + 
				'</tr>';
					
		var options = GetOptionsByModel(orderModelId);
		
		if(options != null && options.length > 0) //We found options for the specified series or model
		{		
			for(var i = 0; i < options.length; i++)
			{
				var itemId = options[i].getValue('custrecordmodeloption_option');				
				var itemName = options[i].getValue('itemid', 'custrecordmodeloption_option');
				var itemDescription = options[i].getValue('salesdescription', 'custrecordmodeloption_option');
				var mandatory = options[i].getValue('custrecordmodeloption_mandatory');
				var restrictToSalespersonRole = options[i].getValue('custitemrvsrestrictsalespersonrole', 'custrecordmodeloption_option');
				
				if (itemDescription == null)
					itemDescription = '';
				
				var quantity = parseInt(options[i].getValue('custrecordmodeloption_quantity'));
				var basePrice = parseFloat(options[i].getValue(priceLevel, 'custrecordmodeloption_option'));
				
				var price = basePrice * quantity;
				var optionSelectedOnOrder = IsOptionSelectedOnWebOrder(webOrderRecord, itemId);
				var isOptionSelectedByUser = IsOptionSelectedByUser(itemId, userSelectedOptionsJSONArray);
				
				// some options are mandatory and cannot be changed and some options are restricted so that sales reps cannot add or remove them
				// if the option is mandatory or if the option is seleted on the order, restricted to sales person role, and the logged in user is the sales person role
				// 		then disable the option and mark it selected
				// if the option is selected on the order and the person logged in is not a sales person OR
				//		if the option is selected on the order and the option isn't restricted and the it is the sales person role logged in
				//		then don't disable the option and mark it selected
				// if the option is restricted by sales person role and the sales person role is logged in then disable the option
				var inputHTML = '<INPUT TYPE="CHECKBOX" NAME="ckoption_' + itemId + '" ID="ckoption_' + itemId + '" ONCHANGE="LineItemSelected(' + itemId + ', ' + quantity + ', this.checked)">';
				if (mandatory == 'T' || (optionSelectedOnOrder && restrictToSalespersonRole == 'T' && isSalesPersonRole))
				{
					inputHTML = '<INPUT TYPE="CHECKBOX" NAME="ckoption_' + itemId + '" ID="ckoption_' + itemId + '" ONCHANGE="LineItemSelected(' + itemId + ', ' + quantity + ', this.checked)" checked="True" DISABLED="True">';
				}
				else if ((optionSelectedOnOrder && !isSalesPersonRole) || (optionSelectedOnOrder && restrictToSalespersonRole == 'F' && isSalesPersonRole))
				{
					inputHTML = '<INPUT TYPE="CHECKBOX" NAME="ckoption_' + itemId + '" ID="ckoption_' + itemId + '" ONCHANGE="LineItemSelected(' + itemId + ', ' + quantity + ', this.checked)" checked="True">';
				}
				else if (restrictToSalespersonRole == 'T' && isSalesPersonRole)
				{
					inputHTML = '<INPUT TYPE="CHECKBOX" NAME="ckoption_' + itemId + '" ID="ckoption_' + itemId + '" ONCHANGE="LineItemSelected(' + itemId + ', ' + quantity + ', this.checked)" DISABLED="True">';
				}
				else if(isOptionSelectedByUser && !optionSelectedOnOrder) //User chose this option and it is not selected on order
				{
					inputHTML = '<INPUT TYPE="CHECKBOX" NAME="ckoption_' + itemId + '" ID="ckoption_' + itemId + '" ONCHANGE="LineItemSelected(' + itemId + ', ' + quantity + ', this.checked)" checked="True">';					
				}
				
				html += 
					'<tr>' + 
						'<td>' +
							inputHTML + 
						'</td>' + 
						'<td style="visibility:hidden;">' + 
							itemId + 
						'</td>' + 
						'<td>' + 
							itemName + 
						'</td>' + 
						'<td>' + 
							itemDescription + 
						'</td>' + 
						'<td>' + 
							quantity + 
						'</td>' + 
						'<td>$' + 
							CurrencyFormatted(price) + 
						'</td>' + 
					'</tr>';
					
				if (mandatory == 'T' && addMandatoryOptions)
				{
					AddWebOrderLineItem(webOrderRecord, itemId, quantity);
				}	
				
				if(isOptionSelectedByUser && !optionSelectedOnOrder)
				{
					AddWebOrderLineItem(webOrderRecord, itemId, quantity);
				}									
			}
		}	
		
		html += '</table>';	

		webOrderRecord.setFieldValue('custbodyoptionshtml', html);				
	}		
}

/**
 * Adds the specified item into the web order line items.
 * @param webOrderRecord
 * @param itemId
 * @param quantity
 */
function AddWebOrderLineItem(webOrderRecord, itemId, quantity)
{	
	webOrderRecord.selectNewLineItem('item');		
	webOrderRecord.setCurrentLineItemValue('item', 'quantity', quantity);	
	webOrderRecord.setCurrentLineItemValue('item', 'item', itemId);
	webOrderRecord.commitLineItem('item');		
}

/**
 * Returns whether or not specified option is selected on the web order record.
 * @param webOrderRecord
 * @param optionId
 * @returns {Boolean}
 */
function IsOptionSelectedOnWebOrder(webOrderRecord, optionId)
{
	var lineCount = webOrderRecord.getLineItemCount('item');
	for (var i=1; i<=lineCount; i++)
	{
		var itemId = webOrderRecord.getLineItemValue('item', 'item', i);
		if (itemId == optionId)
			return true;
	}
	return false;
}

/**
 * Returns whether or not the specified option is selected by user.
 * @param {Object} optionId
 * @param {Object} jsonArrayOptions
 */
function IsOptionSelectedByUser(optionId, jsonArrayOptions)
{
	var _isOptionSelected = false;
	if(IsDefined(optionId) && IsDefined(jsonArrayOptions) && jsonArrayOptions.length > 0)
	{
		for(var i = 0; i < jsonArrayOptions.length; i++)
		{	
			if(optionId == jsonArrayOptions[i].id)
			{
				_isOptionSelected = true;
				break;
			}
		}
	}
	return _isOptionSelected;
}

/**
 * Gets a NS search results array of all options for the specified model.
 * @param modelId
 * @returns
 */
function GetOptionsByModel(modelId)
{	
	var filters = new Array();
	filters.push(new nlobjSearchFilter('custrecordmodeloption_model', null, 'is', modelId));
	
	var cols = new Array();
	cols.push(new nlobjSearchColumn('custrecordmodeloption_model', null, null));
	cols.push(new nlobjSearchColumn('custrecordmodeloption_option', null, null));
	cols.push(new nlobjSearchColumn('custrecordmodeloption_quantity', null, null));
	cols.push(new nlobjSearchColumn('custrecordmodeloption_mandatory', null, null));
	
	cols.push(new nlobjSearchColumn('salesdescription', 'custrecordmodeloption_option', null));
	cols.push(new nlobjSearchColumn('displayname', 'custrecordmodeloption_option', null));
	cols.push(new nlobjSearchColumn('itemid', 'custrecordmodeloption_option', null));
	cols.push(new nlobjSearchColumn('baseprice', 'custrecordmodeloption_option', null));
	cols.push(new nlobjSearchColumn('isonline', 'custrecordmodeloption_option', null));
	cols.push(new nlobjSearchColumn('custitemrvsadvertisingfee', 'custrecordmodeloption_option', null));
	cols.push(new nlobjSearchColumn('custitemrvsgefee', 'custrecordmodeloption_option', null));
	cols.push(new nlobjSearchColumn('custitemrvsstate', 'custrecordmodeloption_option', null));
	cols.push(new nlobjSearchColumn('custitemrvsrestrictsalespersonrole', 'custrecordmodeloption_option', null));
	cols.push(new nlobjSearchColumn('custitemrvsrestrictsalespersonrole', 'custrecordmodeloption_option', null));
	
	return nlapiSearchRecord('customrecordrvsmodeloption', null, filters, cols);
}

/**
 * Gets error message from error object.
 * @param errorObj
 * @returns {String}
 */
function GetErrorMessage(errorObj)
{
	var errorcode = '';
	try 
	{
		errorcode = errorObj.getCode();
		
		try 
		{
			errorcode += '\n' + errorObj.getDetails() + '\n' + errorObj.getStackTrace();
		}
		catch (err3) { }
	}
	catch (err2) { 
		// if it is not a netsuite error, then getCode() will not work an exception is thrown
		// this means that the error was some other kind of error
		try 
		{
			errorcode += errorObj.description + '\n' + errorObj.name + '\n' + errorObj.message;
		}
		catch (err3)
		{
			errorcode = "Unknown error.";
		}
	}
	
	return errorcode;
}

/**
 * Gets JSON dealer object given dealers search results array and the index of the dealer search result.
 */
function GetJSONDealerObject(dealers, index, type)
{	
	var NEAREST_DEALER_ID = 'id';
	var NEAREST_DEALER_NAME = 'name';
	var NEAREST_DEALER_DISTANCE = 'distance';
	var NEAREST_DEALER_PHONE = 'phone';
	var NEAREST_DEALER_SHIP_ADDRESS1 = 'address1';
	var NEAREST_DEALER_SHIP_ADDRESS2 = 'address2';
	var NEAREST_DEALER_SHIP_ADDRESSEE = 'addressee';
	var NEAREST_DEALER_SHIP_CITY = 'city';
	var NEAREST_DEALER_SHIP_STATE = 'state';
	var NEAREST_DEALER_SHIP_ZIP = 'zip';
	var NEAREST_DEALER_SHIP_COUNTRY = 'country';
	var NEAREST_DEALER_SHIP_WEBSITE = 'website';
	var NEAREST_DEALER_TYPE = 'type';
	var NEAREST_DEALER_TRADERID = 'traderId';
	var NEAREST_DEALER_RVTDEALERID = 'rvtDealerId';
	
	var	json = {}; //a json object for the current search results	
	var id = dealers[index].getValue('internalid');
	var name = dealers[index].getValue('companyname');
	var distance = Math.round(parseFloat(dealers[index].getValue('formulanumeric')));
	var phone = dealers[index].getValue('phone');
	var shipAddress1 = dealers[index].getValue('shipaddress1');
	var shipAddress2 = dealers[index].getValue('shipaddress2');
	var shipAddressee = dealers[index].getValue('shipaddressee');
	var shipCity = dealers[index].getValue('shipcity');
	var shipState = dealers[index].getValue('shipstate');
	var shipZip = dealers[index].getValue('shipzip');
	var shipCountry = dealers[index].getValue('shipcountry');
	var webURL = dealers[index].getValue('url');
	var traderId = trim(dealers[index].getValue('custentitygd_rvtraderid'));
	var rvtDealerId = trim(dealers[index].getValue('custentitygd_rvtdealerid')) || null;
	
	if(traderId == '') { traderId = null; }
	
	json[NEAREST_DEALER_ID] = id;
	json[NEAREST_DEALER_NAME] = name;	
	json[NEAREST_DEALER_PHONE] = phone;
	json[NEAREST_DEALER_SHIP_ADDRESS1] = shipAddress1;
	json[NEAREST_DEALER_SHIP_ADDRESS2] = shipAddress2;
	json[NEAREST_DEALER_SHIP_ADDRESSEE] = shipAddressee;
	json[NEAREST_DEALER_SHIP_CITY] = shipCity;
	json[NEAREST_DEALER_SHIP_STATE] = shipState;
	json[NEAREST_DEALER_SHIP_ZIP] = shipZip;
	json[NEAREST_DEALER_SHIP_COUNTRY] = shipCountry;
	json[NEAREST_DEALER_DISTANCE] = distance;
	json[NEAREST_DEALER_SHIP_WEBSITE] = webURL;
	json[NEAREST_DEALER_TRADERID] = traderId;
	json[NEAREST_DEALER_RVTDEALERID] = rvtDealerId;
	
	if(type != undefined && trim(type) != '')
		json[NEAREST_DEALER_TYPE] = type;
	else
		json[NEAREST_DEALER_TYPE] = '';
	
	return json;
}

/**
 * Returns stock or product line dealers close to the specified latitude and longitude.
 * - If seriesId is specified, then product lines dealers will be returned
 * - If modelId is specified, then stock dealers will be returned.
 * 
 * Note: If both seriesId and modelId are specicified, only stock dealers are returned.
 */
function GetNearestStockOrProductLineDealerSearchResults(latitude, longitude, seriesId, modelId)
{
	var dealerResults = null;
	if(trim(latitude) != '' && trim(longitude) != '')
	{
		
		var radlat1 = Math.PI * parseFloat(latitude) / 180;
		var radlat2SinFormula = '(SIN(' + Math.PI + ' * {custentitygd_addresslatitude}/180))';
		var radlat2CosForumula = '(COS(' + Math.PI + ' * {custentitygd_addresslatitude}/180))';
		var radThetaFormula = '(COS(' + Math.PI + ' * (' + longitude + '- {custentitygd_addresslongitude}) / 180))';
		var radLat1SinFormula = '(SIN(' + radlat1 + '))';
		var radLat1CosFormula = '(COS(' + radlat1 + '))';
		
		var formula = '(ACOS(' + radLat1SinFormula + ' * ' + radlat2SinFormula + ' + ' + radLat1CosFormula + ' * ' + radlat2CosForumula + ' * ' + radThetaFormula + ')) * 180 / ' + Math.PI + ' * ((60 * 1.1515) * 0.8684)';
		
		var cols = new Array();
		cols[0] = new nlobjSearchColumn('formulanumeric');
		cols[0].setFormula(formula);
		cols[0].setSort();

		cols[cols.length] = new nlobjSearchColumn('internalid');
		cols[cols.length] = new nlobjSearchColumn('companyname');
		cols[cols.length] = new nlobjSearchColumn('entityid');
		cols[cols.length] = new nlobjSearchColumn('internalid', 'custentityrvsproductline');
		cols[cols.length] = new nlobjSearchColumn('internalid');
		cols[cols.length] = new nlobjSearchColumn('internalid', 'salesrep');
		cols[cols.length] = new nlobjSearchColumn('phone'); 
		cols[cols.length] = new nlobjSearchColumn('shipaddress1');
		cols[cols.length] = new nlobjSearchColumn('shipaddress2');
		cols[cols.length] = new nlobjSearchColumn('shipaddressee');
		cols[cols.length] = new nlobjSearchColumn('shipcity');
		cols[cols.length] = new nlobjSearchColumn('shipstate');
		cols[cols.length] = new nlobjSearchColumn('shipzip');
		cols[cols.length] = new nlobjSearchColumn('shipcountry');
		cols[cols.length] = new nlobjSearchColumn('url');
		cols[cols.length] = new nlobjSearchColumn('custentitygd_rvtraderid');
		cols[cols.length] = new nlobjSearchColumn('custentitygd_rvtdealerid');
		
		var filters = new Array();
		filters[filters.length] = new nlobjSearchFilter('custentityrvsdealertype', null, 'anyof', DEALER_TYPE_RVSDEALER);
		filters[filters.length] = new nlobjSearchFilter('isdefaultshipping', 'address', 'is', 'T');
		filters[filters.length] = new nlobjSearchFilter('isinactive', null, 'is', 'F');
		filters[filters.length] = new nlobjSearchFilter('custentitygd_hideindealerlocator', null, 'is', 'F'); //do not include dealers marked as "hide in dealer locator"
		filters[filters.length] = new nlobjSearchFilter('custentityrvscreditdealer', null, 'is', 'F'); //do not include credit dealers
		filters[filters.length] = new nlobjSearchFilter('custentitygd_addresslatitude', null, 'isnotempty');
        filters[filters.length] = new nlobjSearchFilter('custentitygd_addresslongitude', null, 'isnotempty');
		

		//if series Id is set, we will also filter dealers by production lines that are assigned to this series.
		if(seriesId != null && !isNaN(parseInt(seriesId.toString())) && parseInt(seriesId.toString()) > 0)
		{
			var prodLineCols = new Array();
			prodLineCols[prodLineCols.length] = new nlobjSearchColumn('internalid');
			
			//First look for product lines that are assigned to the specified series
			var productLines = nlapiSearchRecord('customrecordrvsproductline', null, 
								new nlobjSearchFilter('internalid', 'custrecordproductline_series', 'anyof', seriesId), prodLineCols);
			
			var productLineIds = new Array();			
			if(productLines != null && productLines.length > 0) //We found product line for this series
			{
				for(var i = 0; i < productLines.length; i++)
					productLineIds.push(productLines[i].getId());

			}
			
			//Now we can filter dealers based on these product lines.
			if(productLineIds.length > 0)
			{
				filters[filters.length] = new nlobjSearchFilter('custentityrvsproductline', null, 'anyof', productLineIds);	
				
				dealerResults = nlapiSearchRecord('customer', null, filters, cols); //set product line dealers to be returned.				
			}
		}
		
		//if model is specified, find stock dealers
		if(modelId != null && !isNaN(parseInt(modelId.toString())) && parseInt(modelId.toString()) > 0) 
		{
			//First look for units that are assigned to the specified model and have not been registered
			//(i.e, Warrantty Registration Date is not set and "Retail Sold, Not Registered" flag is not checked.
			var unitCols = new Array();
			unitCols[unitCols.length] = new nlobjSearchColumn('internalid');
			unitCols[unitCols.length] = new nlobjSearchColumn('custrecordunit_dealer');
			unitCols[unitCols.length] = new nlobjSearchColumn('name');
			
			var unitFilters = new Array();

			//Looking for specific model, makes dealers not show up when the year changes. So, we will use MSO Name instead. 
		    //unitFilters[unitFilters.length] = new nlobjSearchFilter('internalid', 'custrecordunit_model', 'anyof', modelId); 
			var modelMSO = nlapiLookupField('item', modelId, 'custitemrvsmsomodel');
			unitFilters[unitFilters.length] = new nlobjSearchFilter('custitemrvsmsomodel', 'custrecordunit_model', 'is', modelMSO);
			
			unitFilters[unitFilters.length] = new nlobjSearchFilter('custrecordunit_receiveddate', null, 'isempty');
			unitFilters[unitFilters.length] = new nlobjSearchFilter('custrecordunit_retailsoldnotregistered', null, 'is', 'F');

			var units = nlapiSearchRecord('customrecordrvsunit', null, unitFilters, unitCols);
			var dealerIdsFilter = new Array();
			
			//Now that we have units that match our criteria, loop through and get all dealers associated with the units.
			if(units != null && units.length > 0)
			{
				for(var i = 0; i < units.length; i++)
					dealerIdsFilter[dealerIdsFilter.length] = units[i].getValue('custrecordunit_dealer') ;
			}
				
			//Finally, filter the results based on these dealer Ids.
			if(dealerIdsFilter.length > 0)
			{				
				filters[filters.length] = new nlobjSearchFilter('internalid', null, 'anyof', dealerIdsFilter);
				
				dealerResults = nlapiSearchRecord('customer', null, filters, cols); //set stock dealers to be returned.
			}				
		}				
	}	
	
	return dealerResults; //This is either product line or stock dealer based on seriesId or modelId respectively
	
} 

/**
 * Get item pricing matrix JSON array for a given item search results.
 * The JSON array contains elements with the following properties:
 * itemId - Internal id of the item
 * itemName - Name of the item
 * priceLevelId - internal id of the price level
 * unitPrice - Unit price of the item for the price level
 * @param itemIdArray - array of item internal ids.
 * @returns {Array}
 */
function GetItemPricingJSONArray(itemIdArray)
{
	var itemPricingArray = new Array();
	if(itemIdArray != null && itemIdArray.length > 0)
	{		
		//search items with price level join.
		var items = GetSteppedSearchResults('item', new nlobjSearchFilter('internalid', null, 'anyof', itemIdArray), 
				                                     [
				                                      new nlobjSearchColumn('itemid', null, null),
				                                      new nlobjSearchColumn('internalid', 'pricing', null),
				                                      new nlobjSearchColumn('unitprice', 'pricing', null)
				                                     ], null);
		
		if(items != null && items.length > 0)
		{
			var unitPrice = 0;
			for(var j = 0; j < items.length; j++)
			{
				unitPrice = parseFloat(items[j].getValue('unitprice', 'pricing'));
				if(isNaN(unitPrice)){unitPrice = 0;}
				unitPrice = Math.round(ConvertNSFieldToFloat(unitPrice.toString())).toFixed(2);
				
				itemPricingArray.push({
										'itemId': items[j].getId(), 
										'itemName': items[j].getValue('itemid'), 
										'priceLevelId': items[j].getValue('internalid', 'pricing'),
										'unitPrice': unitPrice
									  });
			}
		}	
	}
	
	return itemPricingArray;
}

/**
 * Get item unit price for a specific price level. If price cannot be found, return 0.
 * @param itemPricingJSONArray - item pricing json array obtained from 'GetItemPricingJSONArray' method.
 * @param itemId - item internal id to look its price for.
 * @param priceLevelId - price level internal id to look its price.
 */
function GetItemUnitPriceByPriceLevel(itemPricingJSONArray, itemId, priceLevelId)
{
	var itemPriceArray = itemPricingJSONArray.filter(function(itemPricingJSON)
			 											{
															return itemPricingJSON.itemId == itemId && itemPricingJSON.priceLevelId == priceLevelId;
													    });
	
	if(itemPriceArray.length > 0)
		return itemPriceArray[0].unitPrice;
	
	return 0;
}

/******************************** END OF HELPER METHODS *************************************/
