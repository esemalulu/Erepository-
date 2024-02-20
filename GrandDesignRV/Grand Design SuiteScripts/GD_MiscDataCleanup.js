/**
 * Misc. data cleanup scrips for GD.
 * 
 * Version    Date            Author           Remarks
 * 1.00       11 Mar 2015     nathanah
 *
 */

/**
 * Scheduled script that removes GD016 Winterization from orders.
 * 
 * @param {String} recType Record type internal id
 * @param {Number} recId Record internal id
 * @returns {Void}
 */
function GD_RemoveWinterizationOptionsFmOrder_Sch(type)
{
	var context = nlapiGetContext();
	
	var searchResults = nlapiSearchRecord('salesorder', 'customsearchgd_2017opensalesorderrmwint', null, null);
	
	if (searchResults != null)
	{
		var removedItem = false;
		for (var i=0; i<searchResults.length; i++)
		{
			var orderId = searchResults[i].getId();
			var order = nlapiLoadRecord('salesorder', orderId, null);
			removedItem = false;
			var lineCount = order.getLineItemCount('item');
			for (var j=1; j<=lineCount; j++)
			{
				var itemId = order.getLineItemValue('item', 'item', j);
				
				if (itemId == '24771' || itemId == '24772' || itemId == '24773' || itemId == '24774' || itemId == '24775')
				{
					order.removeLineItem('item', j);
					removedItem = true;
					break;
				}
			}
			nlapiLogExecution('debug', 'orderId', orderId);
			if (removedItem)
				nlapiSubmitRecord(order, true, false);
			
			if (context.getRemainingUsage() < 50)
			{
				nlapiYieldScript();
			}
		}
	}
}

/**
 * Resets the freight lines on orders.
 * This script was original used to combine the freight and fuel on 2016 GD orders that were pending fulfillment.
 * This removes the fuel surcharge from the order and then recalculates the freight one.
 * @param {String} type Context Types: scheduled, ondemand, userinterface, aborted, skipped
 * @returns {Void}
 */
function GD_ResetFreightOnOrders_Sch(type) 
{
	var context = nlapiGetContext();
	
	var searchResults = GetSearchResults('salesorder', 'customsearchgd_2016orderstoremovefuelsur', null, null, 'internalid'); //nlapiSearchRecord('salesorder', 'customsearchgd_2016orderstoremovefuelsur', null, null);
	
	if (searchResults != null)
	{
		for (var i=0; i<searchResults.length; i++)
		{
			var orderId = searchResults[i].getId();
			var order = nlapiLoadRecord('salesorder', orderId, {recordmode: 'dynamic'});
			
			var dealerId = order.getFieldValue('entity');
			
			// load the dealer and find the freight charge line
			var dealer = nlapiLoadRecord('customer', dealerId, null);
			
			var lines = dealer.getLineItemCount('itempricing');
			var freightCharge = 0;
			for (var j=1; j<=lines; j++)
			{
				if (dealer.getLineItemValue('itempricing', 'item', j) == '9')
				{
					freightCharge = dealer.getLineItemValue('itempricing', 'price', j);
					break;
				}
			}
			
			var lineCount = order.getLineItemCount('item');
			for (var j=1; j<=lineCount; j++)
			{				
				// find the freight charge line and refresh it
				// refresh it by selecting the fuel surcharge line and then reselecting the freight charge
				// we are in dynamic mode so that should work
				var itemId = order.getLineItemValue('item', 'item', j);
				if (itemId == '9')
				{
					order.selectLineItem('item', j);
					order.setCurrentLineItemValue('item', 'rate', freightCharge);
					order.commitLineItem('item', false);
					
					break;
				}
			}
			
			for (var j=1; j<=lineCount; j++)
			{
				// find the fuel surcharge line and remove it
				var itemId = order.getLineItemValue('item', 'item', j);
				if (itemId == '10')
				{
					order.removeLineItem('item', j);
					break;
				}
			}
			
			// submit the order and yield if necessary
			nlapiSubmitRecord(order, true, false);
			
			if (context.getRemainingUsage() < 50)
			{
				nlapiYieldScript();
			}
		}
	}
}

/**
 * Updates the MSRP Ammount on the unit sales order's line items, Case 5882
 * @param recType
 * @param recId
 */
function GD_SetLineItemMSRP_MassUpdate(recType, recId)
{
	var record = nlapiLoadRecord(recType, recId);
	
	var lineCount = record.getLineItemCount('item');
	var submitRecord = false;

	for (var i = 1; i <= lineCount; i++)
	{
		record.selectLineItem('item', i);
		var msrpAmount = record.getCurrentLineItemValue('item', 'custcolrvsmsrpamount') || '';
		
		if (msrpAmount == '' || msrpAmount == 0)
		{
			var itemId = record.getCurrentLineItemValue('item', 'item') || '';
			var priceLevel = record.getCurrentLineItemValue('item', 'price') || '';
			nlapiLogExecution('debug', 'msrp, itemid, pricelevel', msrpAmount + ' - ' + itemId + ' - ' + priceLevel);
			if (itemId != '')
			{
				if (priceLevel == '-1') // do this only for custom price level
				{
					var msrpRate = parseFloat(record.getFieldValue('custbodyrvsmsrprate')) || 0;
					var msrpRatePlusOne = 1 + (msrpRate / 100);
					var msrpCalculatedAmount = parseFloat(record.getCurrentLineItemValue('item', 'amount')) * msrpRatePlusOne;
					record.setCurrentLineItemValue('item', 'custcolrvsmsrpamount', msrpCalculatedAmount);
					submitRecord = true;
				}
				else	// get the msrp value from the item.
				{
					record.setCurrentLineItemValue('item', 'custcolrvsmsrpamount', GetMSRPForItem(itemId));
					submitRecord = true;
				}
				if (submitRecord)
					record.commitLineItem('item');
			}
		}
	}
	if (submitRecord)
		nlapiSubmitRecord(record);
}

/**
 * Deletes all records passed into the update.
 * You better know what you're getting yourself into.
 * 
 * @param {String} recType
 * @param {String} recId
 */
function GD_Delete_MassUpdate(recType, recId)
{
	nlapiDeleteRecord(recType, recId);
}


/**
 * Loads and saves all records passed into the update.
 * This is really only useful if you're wanting to run User Event scripts on the records
 *  
 * @param {String} recType
 * @param {String} recId
 */
function GD_SubmitRecord_MU(recType, recId) {
	// Use try catch to process all records and log the ones that erroreD out.
	try {
		// Load and save record.
		nlapiSubmitRecord(nlapiLoadRecord(recType, recId), true, true);
	} catch (err) {
		nlapiLogExecution('audit', 'recType: ' + recType + ' recId: ' + recId, JSON.stringify(err));
	}
}

/**
 * Loads and saves all dealer records passed into the update and clear latitude and longitude fields.
 *  
 * @param {String} recType
 * @param {String} recId
 */
function GD_SubmitDealerRecordUpdateFields_MU(recType, recId)
{
	var record = nlapiLoadRecord(recType, recId);
	record.setFieldValue('custentitygd_addresslongitude', '');
	record.setFieldValue('custentitygd_addresslatitude', '');
	nlapiSubmitRecord(record, true, true);
}

/**
 * update the dpu storage line item to $100 from $45
 * @param recType
 * @param recId
 */
function GD_UpdateDPUStorageFeeOnOrders(recType, recId) {
	var salesOrder = nlapiLoadRecord(recType, recId);
	var dpuNewPrice = 100;
	var index = salesOrder.findLineItemValue('item', 'item', '37341');
	if(index != -1) {
		salesOrder.setLineItemValue('item', 'rate', index, dpuNewPrice);
		salesOrder.setLineItemValue('item', 'custcolrvsmsrpamount', index, dpuNewPrice * (1 + parseFloat(salesOrder.getFieldValue('custbodyrvsmsrprate')) / 100.0));
		nlapiSubmitRecord(salesOrder);
	}
}

/**
 * Updates Models and Orders to no longer be linked to Option Groups.
 * See Case #9727
 * 
 * @returns {Void}
 */
function GD_ReverseOptionGroups_Sch(type)
{
	//Find all Item Groups in the system that are classified as Options.
	//We'll use this later in the Model loop to determine whether or not options are Item Groups
	var allItemGroupOptions = [];
	var optGroupResults = GetSteppedSearchResults('itemgroup', new nlobjSearchFilter('custitemrvsitemtype', null, 'is', 2), new nlobjSearchColumn('internalid'));
	if(optGroupResults != null)
	{
		for(var i = 0; i < optGroupResults.length; i++) allItemGroupOptions.push(optGroupResults[i].getId());
	}
	
	//First half!
	//Find all of the Models that have Options that are Item Groups. We can do this by looking at the Model Option record, grouping on Model
	var modelResults = nlapiSearchRecord('customrecordrvsmodeloption', null, new nlobjSearchFilter('type', 'custrecordmodeloption_option', 'is', 'Group'), new nlobjSearchColumn('custrecordmodeloption_model', null, 'group'));
	if(modelResults != null)
	{
		nlapiLogExecution('debug', 'Total number of Models', modelResults.length);
		for(var i = 0; i < modelResults.length; i++)
		{
			var modelRec = nlapiLoadRecord('assemblyitem', modelResults[i].getValue('custrecordmodeloption_model', null, 'group'), {recordmode: 'dynamic'});
			//For each Model that has an Option Group:
			//Find all Option Groups on the Model Option sublist
			var j = 1;
			while (true)
			{
				var modelOptId = modelRec.getLineItemValue('recmachcustrecordmodeloption_model', 'custrecordmodeloption_option', j);
				var madeOptionListChange = false;
				if(allItemGroupOptions.indexOf(modelOptId) > -1)
				{
					var optGroupRec = nlapiLoadRecord('itemgroup', modelOptId);
					//For each Option Group, get the Components from the Group and insert them below the Option Group
					//(only if the component doesn't already exist on the sublist).
					for(var k = optGroupRec.getLineItemCount('member'); k > 0; k--)
					{
						var memberId = optGroupRec.getLineItemValue('member', 'item', k);
						if(modelRec.findLineItemValue('recmachcustrecordmodeloption_model', 'custrecordmodeloption_option', memberId) < 1)
						{
							var memberIsStandardMember = memberId == optGroupRec.getFieldValue('custitemrvs_optgrpstandardoption');
							modelRec.insertLineItem('recmachcustrecordmodeloption_model', j+1);
							modelRec.setCurrentLineItemValue('recmachcustrecordmodeloption_model', 'custrecordmodeloption_option', memberId);
							modelRec.setCurrentLineItemValue('recmachcustrecordmodeloption_model', 'custrecordmodeloption_quantity', optGroupRec.getLineItemValue('member', 'quantity', k));
							modelRec.setCurrentLineItemValue('recmachcustrecordmodeloption_model', 'custrecordmodeloption_standard', memberIsStandardMember ? 'T' : 'F');
							modelRec.commitLineItem('recmachcustrecordmodeloption_model');
						}
					}
					
					//Remove the Option Group from the Option list.
					modelRec.removeLineItem('recmachcustrecordmodeloption_model', j);
					madeOptionListChange = true;

					//Inactivate the Item Group
					optGroupRec.setFieldValue('isinactive', 'T');
					nlapiSubmitRecord(optGroupRec);
					
					//Yield if necessary
					if(nlapiGetContext().getRemainingUsage() < 100) nlapiYieldScript();
				}
				
				//Decide what to do with the loop. If we made a change to the sublist, then we need to start over.
				//If we didn't make a change, go on to the next line.
				//If we're at the end of the sublist, break.
				if(madeOptionListChange)
					j = 1;
				else if(j < modelRec.getLineItemCount('recmachcustrecordmodeloption_model'))
					j++;
				else
					break;
			}
			
			//Save the Model
			nlapiSubmitRecord(modelRec);
			
			//Update percent complete, Yield if necessary
			if(nlapiGetContext().getRemainingUsage() < 100) nlapiYieldScript();
			nlapiGetContext().setPercentComplete(((i+1)/modelResults.length)*50); //first half, so percents from 0% to 50%
		}
	}
	
	//Second half! At this point, all of the Models have been updated.
	//Find all open orders (not closed, cancelled, or billed) with an Option Group set.
	var soResults = GetSteppedSearchResults('salesorder',[new nlobjSearchFilter('custcolrvs_modeloptionitemgroup', null, 'noneof', '@NONE@'),
	                                                      new nlobjSearchFilter('status', null, 'noneof', ['SalesOrd:G','SalesOrd:C','SalesOrd:H'])], new nlobjSearchColumn('internalid',null,'GROUP'));
	if(soResults != null)
	{
		nlapiLogExecution('debug', 'Total number of Sales Orders', soResults.length);
		for(var i = 0; i < soResults.length; i++)
		{
			//Clear the Model Option Group column on every row.
			var soRec = nlapiLoadRecord('salesorder', soResults[i].getValue('internalid',null,'GROUP'));
			for(var j = 1; j <= soRec.getLineItemCount('item'); j++)
			{
				soRec.setLineItemValue('item', 'custcolrvs_modeloptionitemgroup', j, '');
			}
			try {
				nlapiSubmitRecord(soRec);
			}
			catch(err) {
				nlapiLogExecution('debug', 'err for id ' + soRec.getId(), err);
			}
			
			//Update percent complete, Yield if necessary
			if(nlapiGetContext().getRemainingUsage() < 100) nlapiYieldScript();
			nlapiGetContext().setPercentComplete((((i+1)/soResults.length)*50)+50); //second half, so percents from 50% to 100%
		}
	}
}

/**
 * Updates the location of the transaction to Plant 9 - Line 9
 *  
 * @param {String} recType
 * @param {String} recId
 */
function GD_UpdateToPlant9Line9_MU(recType, recId)
{
	var tranRec = nlapiLoadRecord(recType, recId);
	tranRec.setFieldValue('location', 30);
	nlapiSubmitRecord(tranRec, true, true);
}

/**
 * Updates the location of the transaction to Plant 1 - Line 1
 *  
 * @param {String} recType
 * @param {String} recId
 */
function GD_UpdateToPlant1Line1_MU(recType, recId)
{
	var tranRec = nlapiLoadRecord(recType, recId);
	tranRec.setFieldValue('location', 1);
	nlapiSubmitRecord(tranRec, true, true);
}

/**
 * Uncheck the Is Dealer Sales Rep flag on contacts where:
 *     -The contact does not have access to the portal
 *     -is not on an existing Unit Retail Customer
 * 
 * @param recType
 * @param recId
 */
function GD_UpdateContactsIsDealerSalesRep(recType, recId) {
    var contactHasLoginAccess = false;
    var dealerResults = nlapiSearchRecord('customer', null, [new nlobjSearchFilter('giveaccess', 'contact', 'anyof', 'T'), new nlobjSearchFilter('internalid', 'contact', 'anyof', recId)], new nlobjSearchColumn('internalid', 'contact')) || [];
    if (dealerResults.length > 0) {
        contactHasLoginAccess = true;
    }
    
    var contactExistInUnitRetailCustomer = false;
    var unitRetailCustomerResults = nlapiSearchRecord('customrecordrvsunitretailcustomer', null, new nlobjSearchFilter('formulanumeric', null, 'equalto', 1).setFormula("CASE WHEN {custrecordunitretailcustomer_dealsalesrp} = '" + recId + "' THEN 1 WHEN {custrecordunitretailcustomer_dsalesrp2} = '" + recId + "' THEN 1 ELSE 0 END")) || [];
    if (unitRetailCustomerResults.length > 0) {
        contactExistInUnitRetailCustomer = true;
    }
    
    if (!contactHasLoginAccess && !contactExistInUnitRetailCustomer) {
        nlapiSubmitField(recType, recId, 'custentityrvsisdealersalesrep', 'F');
    }
}

/**
 * Loads and saves all dealer records passed into the update and reset dealer locator address fields from latest system information field.
 *  
 * @param {String} recType
 * @param {String} recId
 */
function GD_UpdateDlrLocFieldsFromSysNotes_MU(recType, recId)
{
	var record = nlapiLoadRecord(recType, recId);
	
	var customerSearch = nlapiSearchRecord("customer",null,
			[
			   ["systemnotes.oldvalue","isnotempty",""], 
			   "AND", 
			   ["systemnotes.newvalue","isempty",""], 
			   "AND", 
			   ["systemnotes.field","anyof","CUSTENTITYGD_DLRLOCADDRESS1","CUSTENTITYGD_DLRLOCADDRESS2","CUSTENTITYGD_DLRLOCCITY","CUSTENTITYGD_DLRLOCCOUNTRY","CUSTENTITYGD_DLRLOCCOUNTRYABBREVIATION","CUSTENTITYGD_DLRLOCPHONE","CUSTENTITYGD_DLRLOCSTATE","CUSTENTITYGD_DLRLOCSTATEABBREVIATION","CUSTENTITYGD_DLRLOCZIPCODE","CUSTENTITYGD_ADDRESSLONGITUDE","CUSTENTITYGD_ADDRESSLATITUDE"], 
			   "AND", 
			   ["lastmodifieddate","onorafter","6/29/2018 12:00 am"], 
			   "AND", 
			   ["systemnotes.date","onorafter","6/29/2018 12:00 am"],
			   "AND", 
			   ["internalid","anyof", recId]
			], 
			[
			   new nlobjSearchColumn("oldvalue","systemNotes","GROUP"),
			   new nlobjSearchColumn("field","systemNotes","GROUP").setSort(false), 
			   new nlobjSearchColumn("date","systemNotes","GROUP").setSort(true)
			]
			) || [];
	
	var address1Found = false;
	var address2Found = false;
	var cityFound = false;
	var phoneFound = false;
	var zipFound = false;
	var stateFound = false;
	var stateAbrvFound = false;
	var countryFound = false;
	var countryAbrvFound = false;
	var longitudeFound = false;
	var latitudeFound = false;
	
	for (var i = 0; i < customerSearch.length; i++) {
		if (customerSearch[i].getValue('field', 'systemnotes', 'group') == 'CUSTENTITYGD_DLRLOCADDRESS1' && !address1Found) {
			record.setFieldValue('custentitygd_dlrlocaddress1', customerSearch[i].getValue('oldvalue', 'systemnotes', 'group'));
			address1Found = true;
		}else if (customerSearch[i].getValue('field', 'systemnotes', 'group') == 'CUSTENTITYGD_DLRLOCADDRESS2' && !address2Found) {
			record.setFieldValue('custentitygd_dlrlocaddress2', customerSearch[i].getValue('oldvalue', 'systemnotes', 'group'));
			address2Found = true;
		}else if (customerSearch[i].getValue('field', 'systemnotes', 'group') == 'CUSTENTITYGD_DLRLOCCITY' && !cityFound) {
			record.setFieldValue('custentitygd_dlrloccity', customerSearch[i].getValue('oldvalue', 'systemnotes', 'group'));
			cityFound = true;
		}else if (customerSearch[i].getValue('field', 'systemnotes', 'group') == 'CUSTENTITYGD_DLRLOCCOUNTRY' && !countryFound) {
			record.setFieldText('custentitygd_dlrloccountry', customerSearch[i].getValue('oldvalue', 'systemnotes', 'group'));
			countryFound = true;
		}else if (customerSearch[i].getValue('field', 'systemnotes', 'group') == 'CUSTENTITYGD_DLRLOCCOUNTRYABBREVIATION' && !countryAbrvFound) {
			record.setFieldValue('custentitygd_dlrloccountryabbreviation', customerSearch[i].getValue('oldvalue', 'systemnotes', 'group'));
			countryAbrvFound = true;
		}else if (customerSearch[i].getValue('field', 'systemnotes', 'group') == 'CUSTENTITYGD_DLRLOCPHONE' && !phoneFound) {
			record.setFieldValue('custentitygd_dlrlocphone', customerSearch[i].getValue('oldvalue', 'systemnotes', 'group'));
			phoneFound = true;
		}else if (customerSearch[i].getValue('field', 'systemnotes', 'group') == 'CUSTENTITYGD_DLRLOCSTATE' && !stateFound) {
			record.setFieldText('custentitygd_dlrlocstate', customerSearch[i].getValue('oldvalue', 'systemnotes', 'group'));
			stateFound = true;
		}else if (customerSearch[i].getValue('field', 'systemnotes', 'group') == 'CUSTENTITYGD_DLRLOCSTATEABBREVIATION' && !stateAbrvFound) {
			record.setFieldValue('custentitygd_dlrlocstateabbreviation', customerSearch[i].getValue('oldvalue', 'systemnotes', 'group'));
			stateAbrvFound = true;
		}else if (customerSearch[i].getValue('field', 'systemnotes', 'group') == 'CUSTENTITYGD_DLRLOCZIPCODE' && !zipFound) {
			record.setFieldValue('custentitygd_dlrloczipcode', customerSearch[i].getValue('oldvalue', 'systemnotes', 'group'));
			zipFound = true;
		}else if (customerSearch[i].getValue('field', 'systemnotes', 'group') == 'CUSTENTITYGD_ADDRESSLONGITUDE' && !longitudeFound) {
			record.setFieldValue('custentitygd_addresslongitude', customerSearch[i].getValue('oldvalue', 'systemnotes', 'group'));
			longitudeFound = true;
		}else if (customerSearch[i].getValue('field', 'systemnotes', 'group') == 'CUSTENTITYGD_ADDRESSLATITUDE' && !latitudeFound) {
			record.setFieldValue('custentitygd_addresslatitude', customerSearch[i].getValue('oldvalue', 'systemnotes', 'group'));
			latitudeFound = true;
		}
	}
	if (address1Found || address2Found || cityFound || phoneFound || zipFound || stateFound || stateAbrvFound || countryFound || countryAbrvFound || longitudeFound || latitudeFound)
		nlapiSubmitRecord(record, false, true);
}

/**
 * Updates the location of the PCN from  Plants Assigned level.
 *  
 * @param {String} recType
 * @param {String} recId
 */
function GD_UpdatePCNLocationField_MU(recType, recId){
	var tranRec = nlapiLoadRecord(recType, recId);
	var lineCount = tranRec.getLineItemCount('recmachcustrecordpcnunits_pcn');
	var locationIdArray = new Array();
	for (var i = 1; i <= lineCount; i++){
		locationIdArray.push(tranRec.getLineItemValue('recmachcustrecordpcnunits_pcn', 'custrecordpcnunits_plant', i));
	}
	tranRec.setFieldValues('custrecordgd_pcn_locations', locationIdArray);
	nlapiSubmitRecord(tranRec, true, true);
}

/**
 * Update the status of the Purchase order to closed.
 * @param recType
 * @param recId
 */
function GD_UpdatePOStatusToClosed_MU(recType, recId) {
	var tranRec = nlapiLoadRecord(recType, recId, {recordmode: 'dynamic'});
	
	// Loop through and close the lines which will close the entire Purchase Order record.
	for (var i = 1; i <= tranRec.getLineItemCount('item'); i++) {
		tranRec.selectLineItem('item', i);
		if (tranRec.getCurrentLineItemValue('item', 'billvariancestatus') != 'JOURNALPOSTED') {
			tranRec.setCurrentLineItemValue('item', 'isclosed', 'T');
			tranRec.commitLineItem('item');
		}
	}
	
	nlapiSubmitRecord(tranRec);
}

/**
 * Update the vendor code line item field by vendor and item.
 * @param recType
 * @param recId
 */
function GD_UpdatePOLineVendorCodeValue(recType, recId) {
	var tranRec = nlapiLoadRecord(recType, recId);
	var vendorId = tranRec.getFieldValue('entity');
	var itemIdsArray = new Array();
	var submitRecord = false;
	
	// Get all item IDs from the PO
	for (var i = 1; i <= tranRec.getLineItemCount('item'); i++) {
		itemIdsArray.push(tranRec.getLineItemValue('item', 'item', i));
	}
	
	// Find all vendor codes for each item on the PO with matching vendor.
    var vendorCodeSearchResults = nlapiSearchRecord(
            'item', 
            null, 
            [
                ["othervendor","anyof", tranRec.getFieldValue('entity')], 
                'AND', 
                ["vendorcode","isnotempty",""], 
                'AND', 
                ['internalid', 'anyof', itemIdsArray]
            ], 
            new nlobjSearchColumn('vendorcode')) || [];

    // update the item vendor codes on the PO lines if codes exist
	if (vendorCodeSearchResults.length > 0) {
		var vendorCodeResult = [];
		for (var i = 1; i <= tranRec.getLineItemCount('item'); i++) {
			// Ignore any lines that are Journal Posted status since these lines aren't allowed to be updated.
			if (tranRec.getLineItemValue('item', 'billvariancestatus', i) != 'JOURNALPOSTED') {
				vendorCodeResult = vendorCodeSearchResults.filter(function(data){return data.getId() == tranRec.getLineItemValue('item', 'item', i)}) || [];
				
				// If the vendor Code exist for the item, set it on the line.
				if (vendorCodeResult.length > 0) {
					tranRec.setLineItemValue('item', 'custcolgd_vendorcode', i, vendorCodeResult[0].getValue('vendorcode'));
					
					if (!submitRecord)
						submitRecord = true;
				}
			}
		}
	}
	
	// Only save the record if at least one of the line items was updated.
	if (submitRecord)
		nlapiSubmitRecord(tranRec);
}

/**
 * Move folder mass update
 * 
 * @param {String} recType
 * @param {String} recId
 */
function GD_MoveFolder_MassUpdate(recType, recId)
{
    var myFolderRec = nlapiLoadRecord(recType, recId);
    myFolderRec.setFieldValue('parent', nlapiGetContext().getSetting('script', 'custscriptgd_rgadropzoneparentfolder'));
    nlapiSubmitRecord(myFolderRec);
}