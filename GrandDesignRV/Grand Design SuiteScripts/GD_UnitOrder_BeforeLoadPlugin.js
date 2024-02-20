/**
 * Module Description
 * 
 * Version    Date            Author           Remarks
 * 1.00       11 Jan 2016     Jacob Shetler
 *
 */

/**
 * The default implementation of the Before Load plugin on the Unit Order script.
 * It loads the HTML to use in the Configure Unit Information dialog.
 * 
 * @param {String} type Operation types: create, edit, view, copy, print, email
 * @param {nlobjForm} form Current form
 * @param {nlobjRequest} request Request object
 */
function UOPlugin_BeforeLoad(type, form, request)
{
	//Build the HTML for the modal dialog if they're editing/creating a new unit sales order
	if((type == 'edit' || type == 'create' || type =='copy') && nlapiGetFieldValue('custbodyrvsordertype') == ORDERTYPE_UNIT)
	{
		if(type == 'create' && request != null)
		{
			//If we're creating a new order, see if there is data coming from the New Order popup. If there is, set those fields on the form
			//Get the URL parameters when creating a new order. Set the field values on the form.
			//This needs to happen first.
			var rvsUnitOrderDataId = request.getParameter('rvsunitorderdata');
			if(rvsUnitOrderDataId != null && rvsUnitOrderDataId != '')
			{
				var rvsUnitOrderData = JSON.parse(nlapiLookupField('customrecordrvs_newunitorderdata', rvsUnitOrderDataId, 'custrecordrvs_newunitorderdata_data'));
				var transactionType = nlapiGetRecordType();
				var customForm = request.getParameter('cf');
				var newSO = nlapiCreateRecord(transactionType, {recordmode: 'dynamic', customform: customForm});
				for(var fieldId in rvsUnitOrderData.bodyFields)
				{
					if(fieldId != 'custbody_mes_settlement_discrepancy'){
						newSO.setFieldValue(fieldId, rvsUnitOrderData.bodyFields[fieldId]);
					}
					
				}
				for(var i = 0; i < rvsUnitOrderData.lineItems.length; i++)
				{
					var curLineData = rvsUnitOrderData.lineItems[i];
					newSO.selectNewLineItem('item');
					for(var colId in curLineData)
					{
						newSO.setCurrentLineItemValue('item', colId, curLineData[colId]);
					}
					
					// Try to commit the line.
					try {
						newSO.commitLineItem('item');
					}
					catch (err)
					{
						throw nlapiCreateError('ITEM_AMOUNT_ERROR', 'An item record (id: '+ curLineData['item']+ ') needs the amount set.');
					}
				}
				
				//We also need to set the Sales Rep in this function b/c it usually runs on post-sourcing of the series/dealer.
				//This isn't going to happen when the page loads (the fields are already set!), so we have to do it here.
				var srbsResults = nlapiSearchRecord('customrecordrvs_salesrepbyseries', null, [new nlobjSearchFilter('custrecordrvs_salesrepbyseries_dealer', null, 'is', newSO.getFieldValue('entity')),
				                                                                               new nlobjSearchFilter('custrecordrvs_salesrepbyseries_series', null, 'is', newSO.getFieldValue('custbodyrvsseries'))], new nlobjSearchColumn('custrecordrvs_salesrepbyseries_salesrep'));
				if(srbsResults != null && srbsResults.length > 0)
				{
					newSO.setFieldValue('salesrep', srbsResults[0].getValue('custrecordrvs_salesrepbyseries_salesrep'));
				}
				
				//We need to not overwrite fields that are set in BeforeLoad before we set values from the newSO. Otherwise those values will disappear (b/c the beforeLoad
				// code didn't run on the newSO record when it was created).
				var fieldsToSetBack = {};
				var rememberTheseFields = ['custbodyrvsactiontype', 'custbodyrvsordertype', 'entryformquerystring'];
				for(var i = 0; i < rememberTheseFields.length; i++) fieldsToSetBack[rememberTheseFields[i]] = nlapiGetFieldValue(rememberTheseFields[i]);
				
				//Now go back over the new Sales Order and set the fields on the current sales order.
				//We need to do this to fake the sourcing that would normally happen client-side. As of May 2017, NetSuite does not include
				//sourcing of fields on BeforeLoad.
				var allBodyFields = newSO.getAllFields();
				for(var i = 0; i < allBodyFields.length; i++) 
				{
					var fieldId = allBodyFields[i];
					if(fieldId != 'custbody_mes_settlement_discrepancy'){
						nlapiSetFieldValue(fieldId, newSO.getFieldValue(fieldId));
					}
					
				}
				var allLineItemFields = newSO.getAllLineItemFields('item');
				for(var i = 1; i <= newSO.getLineItemCount('item'); i++)
				{
					nlapiSelectNewLineItem('item');
					for(var j = 0; j < allLineItemFields.length; j++)
					{
						nlapiSetCurrentLineItemValue('item', allLineItemFields[j], newSO.getLineItemValue('item', allLineItemFields[j], i));
					}
					nlapiCommitLineItem('item');
				}
				
				//Set the fields back
				for(var fieldId in fieldsToSetBack) nlapiSetFieldValue(fieldId, fieldsToSetBack[fieldId]);
			}
		}
		
		//Set up the Configure Unit Order button.
		nlapiSetFieldValue('custbodyrvs_configunitorderbtn', '<div class="rvs-secondary-button exterior-button" id="rvsconfigunitorder" onclick="GetRVSUnitOrderVM().openPopup()" title="Configure Unit">Configure Unit</div>');
		
		//Set up the modal dialog.
		nlapiSetFieldValue('custbodyrvs_configunitorderhtml', buildHTMLFileLinks(RVS_BUNDLE_FILES_MODULE_RVSCOMMON) +
				   buildHTMLFileLinks(RVS_BUNDLE_FILES_MODULE_JQUERY) +
				   buildHTMLFileLinks(RVS_BUNDLE_FILES_MODULE_KNOCKOUT) + 
				   buildHTMLFileLinks(RVS_BUNDLE_FILES_MODULE_UNITORDER20));
		
		//Get all of the series, models, and decors in the system. Store these on the form so we can use them in the popup.
		//Filtering the options on the fly in the ViewModel is much faster than querying NetSuite from the client side to get the updated lists.
		RVS_UO_AddSeriesToForm(form);
		RVS_UO_AddModelsToForm(form);
		RVS_UO_AddDecorsToForm(form);
		
		//Disable the series/model/decor fields. You cannot disable these on the form.
		//If you try to just disable them on the form, they will not be disabled in Create mode.
		var seriesFld = nlapiGetField('custbodyrvsseries');
		if(seriesFld != null) seriesFld.setDisplayType('disabled');
		var decorFld = nlapiGetField('custbodyrvsdecor');
		if(decorFld != null) decorFld.setDisplayType('disabled');
		var modelFld = nlapiGetField('custbodyrvsmodel');
		if(modelFld != null) modelFld.setDisplayType('disabled');

		//Set whether or not the current user has the RVS Sales Manager function
		form.addField('custpagervs_userissalesmanager', 'checkbox', 'User Has RVS Sales Manager Function - Hidden').setDisplayType('hidden').setDefaultValue(nlapiLookupField('employee', nlapiGetUser(), 'custentityrvssalesmanagerfunction'));
	
		if(type == 'create' && request != null) {
			// Get the series ID
			var seriesFldId = nlapiGetFieldValue('custbodyrvsseries');

			// Set the Department when the page loads
			var departmentResults = nlapiSearchRecord('customrecordrvsseries', null,
											[
												new nlobjSearchFilter('isinactive', null, 'is', 'F'),
												new nlobjSearchFilter('internalid', null, 'is', seriesFldId)
											],
												
												new nlobjSearchColumn('custrecordgdseries_type')
			
			);

		
			if(departmentResults != null && departmentResults.length > 0) {
				nlapiSetFieldValue('department', departmentResults[0].getValue('custrecordgdseries_type'));
			}
	
		}

		// Gets item sublist and custom form id
		var itemSublist = form.getSubList('item');
		var customFormId = trim(nlapiGetFieldValue('customform'));

		//If pass multiple truthy conditions, hides RVS button and replaces it with a new GD version 
			// of the "Add Freight & Fuel Charges" button,
			//which is located on Item subtab of Unit Order record (in edit mode only).
		if(itemSublist != null && 
			customFormId != GetRVSInternalPartOrderForm() &&
			customFormId != GetRVSExternalPartWebOrderForm() && 
			customFormId != GetRVSInternalPartWebOrderForm())
		{
			GD_hideButtonOnForm(form, itemSublist, 'custpage_btnaddfreightfuel');
			itemSublist.addButton('custpage_btngdaddfreightfuel', 'Add Freight & Fuel Charges', 'GD_AddDealerFreightSurcharge()');
		}
	}
}

/**
 * Adds all active Series records to the form in JSON format.
 */
function RVS_UO_AddSeriesToForm(form)
{
	//Build columns and filters. Do the search.
	var sortCol = new nlobjSearchColumn('name');
	sortCol.setSort();
	var cols = [sortCol,
	            new nlobjSearchColumn('custrecordseries_dealerdiscount')];
	var seriesResults = nlapiSearchRecord('customrecordrvsseries', null, new nlobjSearchFilter('isinactive', null, 'is', 'F'), cols);
	
	//Get defaults for all Series.
	var defaultDiscountId = GetDealerDiscountItem();
	
	//Add series info into the array and set it on the form.
	var allSeries = [];
	if(seriesResults != null) {
		for(var i = 0; i < seriesResults.length; i++) {
			var curResult = seriesResults[i]; 
			
			//Get the discount for this Series. If the series doesn't have a discount rate, then no discount for the Series.
			var curDiscountRate = ConvertNSFieldToFloat(curResult.getValue('custrecordseries_dealerdiscount'));
			var curDiscountId = defaultDiscountId;
			if(curDiscountRate == 0) {
				curDiscountRate = '';
				curDiscountId = '';
			}
			
			allSeries.push({
				id: curResult.getId(), 
				name: curResult.getValue('name'),
				discountRate: curDiscountRate,
				discountId: curDiscountId
			});
		}
	}
	form.addField('custpagervs_allseries', 'inlinehtml', 'All Series - Hidden').setDisplayType('hidden').setDefaultValue(JSON.stringify(allSeries));
}

/**
 * Adds all active Model records to the form in JSON format.
 */
function RVS_UO_AddModelsToForm(form)
{
	//Build columns and filters. Do the search.
	var sortCol = new nlobjSearchColumn('itemid');
	sortCol.setSort();
	var cols = [sortCol,
	            new nlobjSearchColumn('displayname'),
	            new nlobjSearchColumn('custitemrvsdiscontinuedmodel'),
	            new nlobjSearchColumn('custitemrvs_msrplevel'),
	            new nlobjSearchColumn('otherprices'),
                new nlobjSearchColumn('custitemrvsmodelseries')];
	var filters = [new nlobjSearchFilter('isinactive', null, 'is', 'F'),
                   new nlobjSearchFilter('custitemrvsitemtype', null, 'is', ITEM_CATEGORY_MODEL)];
	var modelsResults = nlapiSearchRecord('assemblyitem', null, filters, cols);
	
	//Get defaults for the models.
	var defaultMSRP = ConvertNSFieldToString(GetMSRPPriceLevelId());
	var useMSRPByModel = nlapiGetContext().getSetting('script', 'custscriptrvs_msrpsetpermodel') == 'T';
	
	//Build the array of models and their information.
	var allModels = [];
	if(modelsResults != null) {
		for(var i = 0; i < modelsResults.length; i++) {
			var curResult = modelsResults[i];
			
			//For each model, we need to keep track of the msrpLevel for the options selected under this model.
			//We also need to keep track of the MSRP of the model itself so we don't need to do a lookup client-side.
			var msrpLevel = ConvertNSFieldToString(curResult.getValue('custitemrvs_msrplevel'));
			if(!useMSRPByModel) msrpLevel = defaultMSRP;
			var modelMSRPAmount = 0;
			if(msrpLevel.length > 0) {
				modelMSRPAmount = ConvertNSFieldToFloat(curResult.getValue('price' + msrpLevel));
			}

			//Push the model information into the array.
			allModels.push({
				id: curResult.getId(), 
				name: curResult.getValue('itemid'),
				displayName: curResult.getValue('displayname'),
				series: curResult.getValue('custitemrvsmodelseries'),
				msrpLevel: msrpLevel,
				msrpAmount: modelMSRPAmount,
				isDiscontinued: curResult.getValue('custitemrvsdiscontinuedmodel')
			});
		}
	}
	form.addField('custpagervs_allmodels', 'inlinehtml', 'All Models - Hidden').setDisplayType('hidden').setDefaultValue(JSON.stringify(allModels));
}

/**
 * Adds all active Decor records to the form in JSON format.
 */
function RVS_UO_AddDecorsToForm(form)
{
	//Build columns and filters. Do the search.
	var sortCol = new nlobjSearchColumn('itemid');
	sortCol.setSort();
	var cols = [sortCol,
	            new nlobjSearchColumn('displayname'),
	            new nlobjSearchColumn('custitemrvsdiscontinuedecor'),
	            new nlobjSearchColumn('otherprices'),
	            new nlobjSearchColumn('custitemrvsseriesassigned')];
	var filters = [new nlobjSearchFilter('isinactive', null, 'is', 'F'),
                   new nlobjSearchFilter('custitemrvsitemtype', null, 'is', GetItemCategoryDecorId())];
	var decorsResults = nlapiSearchRecord('noninventoryitem', null, filters, cols);
	
	//Determine which price levels might be used as the MSRP for this item. This will either be the MSRP set in the company prefs or on models.
	var msrpLevels = [];
	if(nlapiGetContext().getSetting('script', 'custscriptrvs_msrpsetpermodel') == 'T') {
		//Add all of the MSRP levels that appear on models.
		var msrpResults = nlapiSearchRecord('item', null, new nlobjSearchFilter('custitemrvs_msrplevel', null, 'noneof', '@NONE@'), new nlobjSearchColumn('custitemrvs_msrplevel', null, 'GROUP'));
		if(msrpResults != null) {
			for(var i = 0; i < msrpResults.length; i++) {
				msrpLevels.push('price' + msrpResults[i].getValue('custitemrvs_msrplevel', null, 'GROUP'));
			}
		}
	}
	else {
		msrpLevels.push('price' + GetMSRPPriceLevelId());
	}
	
	//Build the array of decors and add it to the form.
	var allDecors = [];
	if(decorsResults != null) {
		for(var i = 0; i < decorsResults.length; i++) {
			var curResult = decorsResults[i];
			
			//Build the array of msrpLevels
			var msrps = {};
			for(var j = 0; j < msrpLevels.length; j++) {
				msrps[msrpLevels[j]] = curResult.getValue(msrpLevels[j]);
			}
			
			//Add info to the array
			allDecors.push({
				id: curResult.getId(), 
				name: curResult.getValue('itemid'),
				displayName: curResult.getValue('displayname'),
				displayText: curResult.getValue('itemid') + ' ' + curResult.getValue('displayname'),
				series: curResult.getValue('custitemrvsseriesassigned').split(','),
				isDiscontinued: curResult.getValue('custitemrvsdiscontinuedecor') == 'T',
				msrps: msrps
			});
		}
	}
	form.addField('custpagervs_alldecors', 'inlinehtml', 'All Decors - Hidden').setDisplayType('hidden').setDefaultValue(JSON.stringify(allDecors));
}


/**
 * Name: GD_AddDealerFreightSurcharge
 * Description: Adds price item lines to the sales order. 
 * 				This particular method only adds Freight and Fuel cost lines
 * 				This is a customized Grand Design version of RVS code,
 * 				specifically for motorized units. 
 * 				(Most of the functions in the following sections,
 * 				particularly ones related to towable units,
 * 				are borrowed from the RVS
 * 				Common.js file.)     
 * @appliedtorecord salesorder
 * 
 * @returns {void}
 */
function GD_AddDealerFreightSurcharge()
{
	// Prevents the button that activates this
		// function from adding a new freight & fuel
		// item--if one already exists.
	if (GD_hasFreightOrFuelChargeItem()) 
	{
		return;
	}
	
	//Gather data to calculate freight rate.
	var dealerId = nlapiGetFieldValue('entity');
	var modelId = nlapiGetFieldValue('custbodyrvsmodel');

	if(trim(dealerId) != '' && trim(modelId) != '')
	{
		var freightItem = GetFreightItem();
		var fuelItem = GetFuelSurchargeItem();
		var freightDiscountItem = GetFreightDiscountItem();

		// Data needed specifically to calculate freight & fuel rate for Motorized units.
		var usFreightRate = nlapiLookupField('assemblyitem', modelId, 'custitemgd_usfreightrate');
		var canadianFreightRate = nlapiLookupField('assemblyitem', modelId, 'custitemgd_canadafreightrate');
		var mileage = parseFloat(nlapiLookupField('customer', dealerId, 'custentityrvsmiles'));
		var tollsAndPermits = parseFloat(nlapiLookupField('customer', dealerId, 'custentityrvstollsandpermits'));
		var wash = parseFloat(nlapiLookupField('customer', dealerId, 'custentityrvswash'));
		var isMotorized = nlapiLookupField('assemblyitem', modelId, 'custitemgd_chassismfg');
		var dealerRecord = nlapiLoadRecord('customer', dealerId);
		var country = dealerRecord.getFieldValue('custentitygd_partsshipcountry');
		
		// Set base freight rate to US or Canadian based on country of dealer.
		var freightRate = 0;
		if (country === GD_CANADA) 
		{
			freightRate = canadianFreightRate;
		}
		else 
		{
			freightRate = usFreightRate;
		}

		// Calculates final freight rate (for motorized units) using this equation:
			// US/Canadian rate * mileage + wash + tolls & permits
		freightRate = (freightRate * mileage) + tollsAndPermits + wash;

		// Gathers any existing price line items for motorized and 
			//towable units (fuel, freight, freight discount)
		var freightArr = [];

		// Adds any line items only for MOTORIZED units
		if (isMotorized) { 
			addFreightChargeMotorized(modelId, freightItem, dealerRecord, fuelItem, freightDiscountItem, freightRate, freightArr);
		}

		// Adds any price lines for towable units.
		else
		{
			addFreightChargeNonMotorized(modelId, freightItem, dealerRecord, fuelItem, freightDiscountItem, freightArr);
		}
	}
	else
	{
		alert('Please select dealer and a model first.');
	}
}

/** 
 * Hides this button on the form's sublist or form itself.
 * 	used to hide RVS Freight and Calc button and replace with
 * 	Grand Design one. 
 * @param {nlobjForm} form 
 * @param {nlobjSublist} sublist
 * @param {String} buttonName 
 */
function GD_hideButtonOnForm(form, sublist, buttonName) {
    if (form != null) {
        var button = (sublist != null) ? sublist.getButton(buttonName) : form.getButton(buttonName);
        
        if (button != null) 
		{
            button.setVisible(false);
		}
    }
}

/**
 * Returns whether or not current sales order has a freight or fuel charge item
 * 		and breaks for loop.
 * @appliedtorecord salesorder
 * @returns {void}
 */
function GD_hasFreightOrFuelChargeItem()
{
	var hasFreightFeulItem = false;
	var itemPriceSublist = 'item';
	var count = nlapiGetLineItemCount(itemPriceSublist);
	if (count > 0)
	{
		for(var i = 1; i <= count; i++)
		{
			var itemId = nlapiGetLineItemValue(itemPriceSublist, 'item', i);
			if (itemId == GetFreightItem() || itemId == GetFuelSurchargeItem() || itemId == GetFreightDiscountItem())
			{
				hasFreightFeulItem = true;
				break;
			}
		}
	}
	return hasFreightFeulItem;
}

//Adds any price line items (e.g., freight, fuel, freight discount) to MOTORIZED unit sales orders.
function addFreightChargeMotorized(modelId, freightItem, dealerRecord, fuelItem, freightDiscountItem, freightRate, freightArr) 
{
	var useCDL = nlapiLookupField('assemblyitem', modelId, 'custitemrvs_usecdlfreight') == 'T';
	if (useCDL)
	{
		freightArr.push({item: freightItem, rate: parseFloat(dealerRecord.getFieldValue('custentityrvs_cdlfreightcharge'))});
	}			
	
	var itemPriceSublist = 'itempricing';

	for (var i = 1; i <= dealerRecord.getLineItemCount(itemPriceSublist); i++)
	{
		var itemId = dealerRecord.getLineItemValue(itemPriceSublist, 'item', i);

		// Only gets values for price line items (freight, fuel, freight discount, if any)
		if((itemId == GetFreightItem() && !useCDL) || itemId == fuelItem || itemId == freightDiscountItem)
		{
			if (itemId == fuelItem || itemId == freightDiscountItem) 
			{
				freightArr.push({item: itemId, rate: parseFloat(dealerRecord.getLineItemValue(itemPriceSublist, 'price', i))});
			}
			else if (itemId == GetFreightItem() && !useCDL) 
			{
				freightArr.push({item: itemId, rate: freightRate});
			}
		}
	}

	//(Strigifying then parsing because for() loop produces an object (that looks like an array).
	freightArr = JSON.stringify(freightArr);
	freightArr = JSON.parse(freightArr);

	// Setting any price item lines gathered in previous section
		// (Could be any combination of one or more freight, fuel, or freight discount lines);

	if (freightArr.length > 0)
	{
		for(var i = 0; i < freightArr.length; i++)
		{
			//Only sets a price item line if a rate of more than
				// 0 has been found for that item type.
			if (freightArr[i].rate > 0)
			{
				nlapiSelectNewLineItem('item');

				nlapiSetCurrentLineItemValue('item', 'quantity', '1');
				nlapiSetCurrentLineItemValue('item', 'custcolrvsunititemsdealerportal', freightArr[i].item, false, true);
				nlapiSetCurrentLineItemValue('item', 'item', freightArr[i].item, true, true);
				nlapiSetCurrentLineItemValue('item', 'rate', freightRate);
				nlapiSetCurrentLineItemValue('item', 'amount', freightRate);

				nlapiCommitLineItem('item');
			}
		}
	}
	else
	{
		alert('The selected dealer has no Freight Surcharge Items');
	}
}

//Adds any price line items to TOWABLE units (e.g., freight, fuel, freight discount)
function addFreightChargeNonMotorized(modelId, freightItem, dealerRecord, fuelItem, freightDiscountItem, freightArr) 
{	
	var useCDL = nlapiLookupField('assemblyitem', modelId, 'custitemrvs_usecdlfreight') == 'T';
	if (useCDL)
	{
		freightArr.push({item: freightItem, rate: parseFloat(dealerRecord.getFieldValue('custentityrvs_cdlfreightcharge'))});
	}			
	
	var itemPriceSublist = 'itempricing';
	for (var i = 1; i <= dealerRecord.getLineItemCount(itemPriceSublist); i++)
	{
		var itemId = dealerRecord.getLineItemValue(itemPriceSublist, 'item', i);
		if((itemId == GetFreightItem() && !useCDL) || itemId == fuelItem || itemId == freightDiscountItem)
		{
			freightArr.push({item: itemId, rate: parseFloat(dealerRecord.getLineItemValue(itemPriceSublist, 'price', i))});
		}
	}

	//Add any price line items (with rate greater than 0) to their own line.
	if (freightArr.length > 0)
	{
		for(var i = 0; i < freightArr.length; i++)
		{
			if (freightArr[i].rate > 0)
			{
				nlapiSelectNewLineItem('item');

				nlapiSetCurrentLineItemValue('item', 'quantity', '1');
				nlapiSetCurrentLineItemValue('item', 'custcolrvsunititemsdealerportal', freightArr[i].item, false, true);
				nlapiSetCurrentLineItemValue('item', 'item', freightArr[i].item, true, true);
				nlapiSetCurrentLineItemValue('item', 'rate', freightArr[i].rate);
				nlapiSetCurrentLineItemValue('item', 'amount', freightArr[i].rate);

				nlapiCommitLineItem('item');
			}
		}
	}
	else
	{
		alert('The selected dealer has no Freight Surcharge Items');
	}
}
