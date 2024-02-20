/**
 * RESTlets for RVS Unit Sales Order 2.0
 * 
 * Version    Date            Author           Remarks
 * 1.00       21 Mar 2017	  Jacob Shetler
 *
 */

/**
 * Returns Options for the selected Model.
 * Requires three parameters in the dataIn object:
 * 	{String} modelId Internal ID of the model
 * 	{String} msrpLevel Name of the price level used for MSRP column.
 *  {String} priceLevel Name of the price level to be returned for the base price of the Option. This comes from the 'custbodydealerpricelevel' field on the order.
 * 
 * @param {Object} dataIn Parameter object
 * @returns {Object} Output object
 */
function RVS_GetOptionsForModel_GET(dataIn)
{
	dataIn = JSON.parse(dataIn);
	
	//Build the filters
	var filters = [new nlobjSearchFilter('custrecordmodeloption_model', null, 'is', dataIn.modelId),
	               new nlobjSearchFilter('isinactive', null, 'is', 'F')];
	
	//Build the columns for the search.
	var sortCol = new nlobjSearchColumn('custrecordmodeloption_sortorder');
	sortCol.setSort();
	var cols = [sortCol,
	            new nlobjSearchColumn('custrecordmodeloption_model'),
	            new nlobjSearchColumn('custrecordmodeloption_option'),
	            new nlobjSearchColumn('custrecordmodeloption_quantity'),
	            new nlobjSearchColumn('custrecordmodeloption_mandatory'),
	            new nlobjSearchColumn('custrecordmodeloption_standard'),
	            new nlobjSearchColumn('custitemrvs_optgrpstandardoption', 'CUSTRECORDMODELOPTION_OPTION'),
	            new nlobjSearchColumn('internalid', 'CUSTRECORDMODELOPTION_OPTION'),
	            new nlobjSearchColumn('type', 'CUSTRECORDMODELOPTION_OPTION'),
	            new nlobjSearchColumn('salesdescription', 'CUSTRECORDMODELOPTION_OPTION'),
	            new nlobjSearchColumn('displayname', 'CUSTRECORDMODELOPTION_OPTION'),
	            new nlobjSearchColumn('itemid', 'CUSTRECORDMODELOPTION_OPTION'),
	            new nlobjSearchColumn('baseprice', 'CUSTRECORDMODELOPTION_OPTION'),
	            new nlobjSearchColumn('otherprices', 'CUSTRECORDMODELOPTION_OPTION'),
	            new nlobjSearchColumn('isonline', 'CUSTRECORDMODELOPTION_OPTION'),
	            new nlobjSearchColumn('custitemrvsadvertisingfee', 'CUSTRECORDMODELOPTION_OPTION'),
	            new nlobjSearchColumn('custitemrvsgefee', 'CUSTRECORDMODELOPTION_OPTION'),
	            new nlobjSearchColumn('custitemrvsstate', 'CUSTRECORDMODELOPTION_OPTION'),
	            new nlobjSearchColumn('custitemrvsrestrictsalespersonrole', 'CUSTRECORDMODELOPTION_OPTION'),
				new nlobjSearchColumn('custitemgd_showinbuildyourown', 'CUSTRECORDMODELOPTION_OPTION'),];
	
	//Search
	var optionResults = nlapiSearchRecord('customrecordrvsmodeloption', null, filters, cols);
		
	//Build the results object and return it.
	var optionArr = [];
	var optionGroupIds = [];
	if (optionResults != null)
	{
		for(var i = 0; i < optionResults.length; i++)
		{
			var curResult = optionResults[i]; 
			var itemType = curResult.getValue('type', 'custrecordmodeloption_option');
			var stdComponent = curResult.getValue('custitemrvs_optgrpstandardoption', 'CUSTRECORDMODELOPTION_OPTION');
			if(stdComponent == '') stdComponent = null;
			
			optionArr.push({
				id: curResult.getId(),
				itemId: curResult.getValue('custrecordmodeloption_option'),
				itemName: curResult.getValue('itemid', 'custrecordmodeloption_option'),
				itemDisplayName: curResult.getValue('displayname', 'custrecordmodeloption_option'),
				itemDescription: curResult.getValue('salesdescription', 'custrecordmodeloption_option'),
				itemType: itemType,
				isMandatory: curResult.getValue('custrecordmodeloption_mandatory') == 'T',
				isStandard: curResult.getValue('custrecordmodeloption_standard') == 'T',
				standardComponent: stdComponent,
				stateAbbreviation: curResult.getValue('custitemrvsstate', 'custrecordmodeloption_option'),
				isRestrictedToSalespersonRole: curResult.getValue('custitemrvsrestrictsalespersonrole', 'custrecordmodeloption_option') == 'T',
				optionSortOrder: curResult.getValue('custrecordmodeloption_sortorder'),
				msrpAmount: parseFloat(curResult.getValue(dataIn.msrpLevel, 'custrecordmodeloption_option')),
				quantity: parseFloat(curResult.getValue('custrecordmodeloption_quantity')),
				basePrice: parseFloat(curResult.getValue(dataIn.priceLevel, 'custrecordmodeloption_option')),
				showInDealerPortal: curResult.getValue('isonline', 'CUSTRECORDMODELOPTION_OPTION') == 'T',
				components: [],
				hiddenOption: curResult.getValue('custitemgd_showinbuildyourown', 'custrecordmodeloption_option') == 'T' ? '' : 'Yes'
			});
			
			if(itemType == 'Group') optionGroupIds.push(curResult.getValue('internalid', 'CUSTRECORDMODELOPTION_OPTION'));
		}
	}
	
	//Add the extra information about the Options that are NS Item Groups
	if(optionGroupIds.length > 0)
	{
		//Build the columns for the search.
		var sortCol = new nlobjSearchColumn('internalid');
		sortCol.setSort();
		var secondarySortCol = new nlobjSearchColumn('memberline');
		secondarySortCol.setSort();
		var optCols = [sortCol,
		               secondarySortCol,
		               new nlobjSearchColumn('memberquantity'),
		               new nlobjSearchColumn('internalid', 'memberItem'),
		               new nlobjSearchColumn('type', 'memberItem'),
		               new nlobjSearchColumn('salesdescription', 'memberItem'),
		               new nlobjSearchColumn('displayname', 'memberItem'),
		               new nlobjSearchColumn('itemid', 'memberItem'),
		               new nlobjSearchColumn('baseprice', 'memberItem'),
		               new nlobjSearchColumn('otherprices', 'memberItem'),
		               new nlobjSearchColumn('isonline', 'memberItem'),
		               new nlobjSearchColumn('custitemrvsadvertisingfee', 'memberItem'),
		               new nlobjSearchColumn('custitemrvsgefee', 'memberItem'),
		               new nlobjSearchColumn('custitemrvsstate', 'memberItem'),
		               new nlobjSearchColumn('custitemrvsrestrictsalespersonrole', 'memberItem'),
					   new nlobjSearchColumn('custitemgd_showinbuildyourown', 'memberItem')];
		
		//Search
		var optionGroupResults = nlapiSearchRecord('item', null, new nlobjSearchFilter('internalid', null, 'anyof', optionGroupIds), optCols);
		if(optionGroupResults != null)
		{
			for(var i = 0; i < optionGroupResults.length; i++)
			{
				var curResult = optionGroupResults[i];
				for(var j = 0; j < optionArr.length; j++)
				{
					if(curResult.getId() == optionArr[j].itemId)
					{
						optionArr[j].components.push({
							itemId: curResult.getValue('internalid', 'memberItem'),
							itemName: curResult.getValue('itemid', 'memberItem'),
							itemDisplayName: curResult.getValue('displayname', 'memberItem'),
							itemDescription: curResult.getValue('salesdescription', 'memberItem'),
							itemType: curResult.getValue('type', 'memberItem'),
							stateAbbreviation: curResult.getValue('custitemrvsstate', 'memberItem'),
							isRestrictedToSalespersonRole: curResult.getValue('custitemrvsrestrictsalespersonrole', 'memberItem') == 'T',
							optionSortOrder: curResult.getValue('memberline'),
							msrpAmount: parseFloat(curResult.getValue(dataIn.msrpLevel, 'memberItem')),
							quantity: parseFloat(curResult.getValue('memberquantity')),
							basePrice: parseFloat(curResult.getValue(dataIn.priceLevel, 'memberItem')),
							showInDealerPortal: curResult.getValue('isonline', 'memberItem') == 'T',
							hiddenOption: curResult.getValue('custitemgd_showinbuildyourown', 'memberItem') == 'T' ? '' : 'Yes'
						});
					}
				}
			}
		}
	}
	
	return JSON.stringify(optionArr);
}
