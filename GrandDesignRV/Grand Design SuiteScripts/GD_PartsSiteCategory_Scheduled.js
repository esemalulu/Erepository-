/**
 * Module Description
 * 
 * Version    Date            Author           Remarks
 * 1.00       06 Apr 2016     ibrahima
 *
 */

//Saved Search:
//Title: GD Presentation Site Categories - Used by Scheduled Script
//   ID: customsearchgd_prescategories

var SITE_CATEGORY_SUBLIST_NAME = 'recmachcustrecordgd_partssitecategory_parent';

/**
 * Scheduled script that creates parts site category custom records to be used by Grand Design website guys.
 * 
 * @param {String} type Context Types: scheduled, ondemand, userinterface, aborted, skipped
 * @returns {Void}
 */
function GD_CreatePartsSiteCategory_Scheduled(type)
{
	// DeleteAllPartsSiteCategoryRecords(); //this line will delete all site categories in our custom record.
	
	var filters = new Array();
	filters.push(new nlobjSearchFilter('type', null, 'anyof', ['NonInvtPart', 'InvtPart']));
	filters.push(new nlobjSearchFilter('isonline', null, 'is', 'T'));
	var formulaFilter = new nlobjSearchFilter('formulanumeric', null, 'greaterthan', 0);
	formulaFilter.setFormula('CASE WHEN {category} IS NULL THEN 0 ELSE 1 END');
	filters.push(formulaFilter);
	
	var cols = new Array();
	cols.push(new nlobjSearchColumn('category', null, 'GROUP')); //category with hierachy. e.g: Product Catalogue > SOLITUDE 2013 > 369RL > CHASSIS / FRAME / AXLE

	var itemUniqueCategoryResults = GetSteppedSearchResults('item', filters, cols);

	CreatePartsSiteCategoriesFromItemCategoryResults(itemUniqueCategoryResults); //create/update parts site categories information.
}

/**
 * Creates parts site category records given unique item category results.
 * @param itemUniqueCategoryResults
 */
function CreatePartsSiteCategoriesFromItemCategoryResults(itemUniqueCategoryResults)
{
	if(itemUniqueCategoryResults != null && itemUniqueCategoryResults.length > 0)
	{
		//find existing parent or create new parent if there is no parent.
		//note: we always use the same parent, so once created we will always use it.
		//      the purpose of the parent record is to make our record creation using less usage point.
		//      with this approach, we only submit one record that contains all the children (the records we care about).
		var partsSiteCategoryParentId = null;
		var partsSiteCatParentResults = nlapiSearchRecord('customrecordgd_partssitecategoryparent', null, null, null);
		
		if(partsSiteCatParentResults != null && partsSiteCatParentResults.length > 0)
		{
			partsSiteCategoryParentId = partsSiteCatParentResults[0].getId();
		}
		else
		{
			partsSiteCategoryParentId = nlapiSubmitRecord(nlapiCreateRecord('customrecordgd_partssitecategoryparent'));
		}

		// Array of GD Parts Site Category Unique IDs used for filtering
		var partsSiteCategoryResults = GetPartsSiteCategoriesUniqueIds(partsSiteCategoryParentId);

		//gets all NS Site Categories. This is a saved search with null as its type because site categories are not scriptable in NS, so we don't know the type.
		var allNSsiteCategoriesResults = GetSteppedSearchResults(null, null, null, 'customsearchgd_prescategories');
		var processedCategoriesHash = new HashTable();
		var addedOrFoundCategoryLineJSONArray = new Array(); //stores a JSON object with unique identifier (parentId.categoryId) and line index.

		var categoriesHash = {};
		var categoryFullName = '';
		for(var i = 0; i < allNSsiteCategoriesResults.length; i++)
		{
			categoryFullName = trim(allNSsiteCategoriesResults[i].getValue('fullname').toLowerCase()); //category with hierachy. e.g: Product Catalogue : SOLITUDE 2013 : 369RL : CHASSIS / FRAME / AXLE
			if(allNSsiteCategoriesResults[i].getValue('hidden') != 'T')
			{
				categoriesHash[categoryFullName] = {
													'id': allNSsiteCategoriesResults[i].getId(),
													'desc': ConvertNSFieldToString((allNSsiteCategoriesResults[i].getValue('description'))),
													'longDesc': ConvertNSFieldToString(allNSsiteCategoriesResults[i].getValue('longdescription'))
													}; //we will use the full name as the key in this hashtable because we will need to find category id based on the name.

			}
			
			if(nlapiGetContext().getRemainingUsage() < 100)
				nlapiYieldScript();
		}

		//Loop though items with categories and each category by creating its entry in the custom record that is structured.
		for(var i = 0; i < itemUniqueCategoryResults.length; i++)
		{
			var categoryTree = itemUniqueCategoryResults[i].getValue('category', null, 'GROUP'); //category with hierachy. e.g: Product Catalogue > SOLITUDE 2013 > 369RL > CHASSIS / FRAME / AXLE
			var categoryTreeArray = categoryTree.split(' > '); //parents and children are separated by " > ", top level parents will be at the top and youngest children at the bottom.

			CreatePartsSiteCategoriesUsingParent(categoryTreeArray, partsSiteCategoryParentId, categoriesHash, processedCategoriesHash, addedOrFoundCategoryLineJSONArray, partsSiteCategoryResults);
			
			if(nlapiGetContext().getRemainingUsage() < 100)
				nlapiYieldScript();
		}

		//this will always have something because it stores both new and existing categories 
		//that should be kept in our snapshot. Anything not in this array, should be removed 
		//from the current snapshot because it must have been deleted or not used on any item.
		if(addedOrFoundCategoryLineJSONArray.length > 0)
		{
			RemoveDeletedPartsSiteCategories(partsSiteCategoryResults, addedOrFoundCategoryLineJSONArray);
		}
	}
}

/**
 * Creates Parts Site Category records (this is a custom record used to expose parts categories.)
 * @param categoryTreeArray - tree of categories with top level parent category at the top and youngest child category at the bottom
 * @param partsSiteCategoryParentId - id for parent record that contains all parts site category
 * @param categoriesHash - netsuite site categories hashtable
 * @param processedCategoriesHash - hash table of processed site categories unique identifies
 * @param addedOrFoundCategoryLineJSONArray - array of category and line info of JSON 
 */
function CreatePartsSiteCategoriesUsingParent(categoryTreeArray, partsSiteCategoryParentId, categoriesHash, processedCategoriesHash, addedOrFoundCategoryLineJSONArray, partsSiteCategoryResults)
{
	if(categoryTreeArray != null && categoryTreeArray.length > 0 && partsSiteCategoryParentId != null)
	{
		var categoryFullName = ''; //stores current catalog full name. We will use this to find categoryJSON.
		var categoryJSON = null; //stores JSON object of the category retrieved from categoriesHash given category full name.
		
		var parentCategoryId = 0; //stores category parent id. If none, we want this to be zero because we use it to set unique id.
		var parentCategoryFullName = ''; //stores the full name of the parent category. we will use this to find parentCategoryJSON.
		var parentCategoryJSON = null; //stores JSON object of the parent category retrieved from categoriesHash given category full name.

		//Note: categoryTreeArray is a tree of categories with top level parent category at the top and youngest child category at the bottom.
		for(var i = 0; i < categoryTreeArray.length; i++)
		{
			if(i == 0)
				categoryFullName = trim(categoryTreeArray[i].toLowerCase());
			else //i > 0
				categoryFullName += ' : ' + trim(categoryTreeArray[i].toLowerCase());
			
			categoryJSON = categoriesHash[categoryFullName];
			
			if(categoryJSON == undefined || categoryJSON == null)
			{
				nlapiLogExecution('debug', 'CreatePartsSiteCategoriesUsingParent:Missing Category', 'categoryTreeArray[' + i + '] for category [' + categoryFullName + ']');
			}
					
			if(categoryJSON != undefined && categoryJSON != null && categoryJSON.id != null && categoryJSON.id != 0)
			{
				if(i > 0) //must be a child category, find parent category info.
				{
					if(i == 1) //immediate parent
						parentCategoryFullName = trim(categoryTreeArray[i - 1].toLowerCase());
					else //i > 1 (grand parents), append parent-child separator.
						parentCategoryFullName += ' : ' + trim(categoryTreeArray[i - 1].toLowerCase());
					
					parentCategoryJSON = categoriesHash[parentCategoryFullName];
					if(parentCategoryJSON != undefined && parentCategoryJSON != null && parentCategoryJSON.id != 0)
					{
						parentCategoryId = parentCategoryJSON.id;
					}
				}
				
				AddPartsSiteCategoryLines(partsSiteCategoryParentId, categoryJSON, parentCategoryId, processedCategoriesHash, addedOrFoundCategoryLineJSONArray, partsSiteCategoryResults);
			}
			
			if(nlapiGetContext().getRemainingUsage() < 100)
				nlapiYieldScript();
		}
	}
}

/**
 * Adds or updates "Parts Site Category" records.
 */
function AddPartsSiteCategoryLines(partsSiteCategoryParentId, categoryJSON, parentCategoryId, processedCategoriesHash, addedOrFoundCategoryLineJSONArray, partsSiteCategoryResults)
{	
	var uniqueIdentifier = parentCategoryId + '.' + categoryJSON.id;

	if(processedCategoriesHash.getItem(uniqueIdentifier) == null) //category has not been processed since scheduled script started.
	{
		var filteredCategories = partsSiteCategoryResults.filter(FilterByUniqueId(uniqueIdentifier));

		var partsSiteCategoryRec;

		if(filteredCategories == null || filteredCategories.length == 0) //category does not exist in our custom record, add it.
		{
			partsSiteCategoryRec = nlapiCreateRecord('customrecordgd_partssitecategory');
			partsSiteCategoryRec.setFieldValue('custrecordgd_partssitecategory_category', categoryJSON.id);
			partsSiteCategoryRec.setFieldValue('custrecordgd_partssitecategory_uniqident', uniqueIdentifier);
			if(parentCategoryId != 0)
				partsSiteCategoryRec.setFieldValue('custrecordgd_partssitecategory_parentcat', parentCategoryId);

			partsSiteCategoryRec.setFieldValue('custrecordgd_partssitecategory_parent', partsSiteCategoryParentId);						

			partsSiteCategoryRec.setFieldValue('custrecordgd_partssitecategory_desc', categoryJSON.desc);
			partsSiteCategoryRec.setFieldValue('custrecordgd_partssitecategory_longdesc', categoryJSON.longDesc);
			nlapiSubmitRecord(partsSiteCategoryRec);

			addedOrFoundCategoryLineJSONArray.push({"uniqueId": uniqueIdentifier});
		}
		else //category exists, update its information
		{
			partsSiteCategoryRec = nlapiLoadRecord('customrecordgd_partssitecategory', filteredCategories[0].id);
			partsSiteCategoryRec.setFieldValue('custrecordgd_partssitecategory_desc', categoryJSON.desc);
			partsSiteCategoryRec.setFieldValue('custrecordgd_partssitecategory_longdesc', categoryJSON.longDesc);
			nlapiSubmitRecord(partsSiteCategoryRec);

			addedOrFoundCategoryLineJSONArray.push({"uniqueId": uniqueIdentifier});
		}

		processedCategoriesHash.setItem(uniqueIdentifier, uniqueIdentifier); //add processed category unique id to our hash table. we will use this to find processed categories
	}		
}

/**
 * Removes deleted site categories. These are the site categories that have  
 * been deleted since the last time we took a snapshot of the site categories.
 * @param partsSiteCategoryResults
 * @param addedOrFoundCategoryLineJSONArray
 */
function RemoveDeletedPartsSiteCategories(partsSiteCategoryResults, addedOrFoundCategoryLineJSONArray)
{
	if(partsSiteCategoryResults != null && partsSiteCategoryResults.length > 0)
	{
		var curUniqueIdentifier, filteredCategories, id;
		
		for(var i = 0; i < partsSiteCategoryResults.length; i++)
		{
			curUniqueIdentifier = partsSiteCategoryResults[i].uniqueId;
			filteredCategories = addedOrFoundCategoryLineJSONArray.filter(FilterByUniqueId(curUniqueIdentifier));

			if(filteredCategories == null || filteredCategories.length == 0)
			{
				id = nlapiDeleteRecord('customrecordgd_partssitecategory', partsSiteCategoryResults[i].id);
			}

			if(nlapiGetContext().getRemainingUsage() < 50)
				nlapiYieldScript();
		}
	}
}

/**
 * Returns an array of GD Parts Site Category Unique IDs.
 *
 * @param partsSiteCategoryParentId
 * @returns {Function}
 */
function GetPartsSiteCategoriesUniqueIds(partsSiteCategoryParentId)
{
	var filters = new Array();
	filters.push(new nlobjSearchFilter('custrecordgd_partssitecategory_parent', null, 'anyof', partsSiteCategoryParentId));
	
	var cols = new Array();
	cols.push(new nlobjSearchColumn('custrecordgd_partssitecategory_uniqident', null, null));

	var results = GetSteppedSearchResults('customrecordgd_partssitecategory', filters, cols);

	var partsSiteCategoryResults = new Array();

	if(results != null && results.length > 0)
	{
		for(var i = 0; i < results.length; i++)
		{
			partsSiteCategoryResults.push({"id": results[i].getId(), "uniqueId": results[i].getValue('custrecordgd_partssitecategory_uniqident')});
		}
	}

	return partsSiteCategoryResults;
}

/**
 * Returns subset of array filtered by uniqueId.
 *
 * @param uniqueIdentifier
 * @returns {Function}
 */
function FilterByUniqueId(uniqueIdentifier)
{
	return function(result)
	{
		return (result.uniqueId == uniqueIdentifier);
	};
}

/**
 * Deletes all parts site categories. This method is only used to delete records while testing.
 */
function DeleteAllPartsSiteCategoryRecords()
{
	var partsSiteCatParentResults = nlapiSearchRecord('customrecordgd_partssitecategoryparent', null, null, null);

	if(partsSiteCatParentResults != null && partsSiteCatParentResults.length > 0)
	{
		var filters = new Array(); 
		filters.push(new nlobjSearchFilter('custrecordgd_partssitecategory_parent', null, 'anyof', partsSiteCatParentResults[0].getId()));
		
		var cols = new Array();
		cols.push(new nlobjSearchColumn('custrecordgd_partssitecategory_category', null, null));
		
		var partsSiteCategoryResults = GetSteppedSearchResults('customrecordgd_partssitecategory', filters, cols);
		var id;
		
		if(partsSiteCategoryResults != null && partsSiteCategoryResults.length > 0)
		{
			for(var i = 0; i < partsSiteCategoryResults.length; i++)
			{
				id = nlapiDeleteRecord('customrecordgd_partssitecategory', partsSiteCategoryResults[i].getId());

				if(nlapiGetContext().getRemainingUsage() < 50)
					nlapiYieldScript();
			}
		}
	}		
}