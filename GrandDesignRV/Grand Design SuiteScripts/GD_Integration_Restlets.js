/**
 * Description: This script contains logic for Grand Design Restlets that are used in their public website.
 * 
 * @author ibrahima
 */

/******************* GD FORCE 5 (NEW WEB GUYS) RESTLETS ***********************/

var DEALER_TYPE_RVSDEALER = '10';
var DEALER_TYPE_NON_RVSDEALER = '11';
//var DEALER_TYPE_WARRANTY = '2';

var NETSUITE_SHOPPING_PROTOCOL = 'http://';
var NETSUITE_SHOPPING_DOMAIN = 'dpshop.';
var NETSUITE_CHECKOUT_PROTOCOL= 'https://';
var NETSUITE_CHECKOUT_DOMAIN = 'dpcheckout.';

/**
 * Get dealers that are close to the specified geo coordinate.
 * @param longitude - geo coordinate longitude
 * @param latitude - geo coordinate latitude
 * @param topN - number of records to be returned.
 * @returns {Array}
 */
function GD_GetClosestDealer_Restlet(dataIn)
{
	if(dataIn != undefined && dataIn != null && dataIn.latitude != undefined && dataIn.longitude != undefined && dataIn.type != undefined)
	{
		var dealerType = trim(dataIn.type).toLowerCase();
		var numberOfRecords = 5; //by default, we will return 5 closest dealers if topN is not specified.
		if(dataIn.topN != undefined && dataIn.topN != null && dataIn.topN > 0)
			numberOfRecords = dataIn.topN;

		return getDealersCloseToGeoLocation(dataIn.longitude, dataIn.latitude, numberOfRecords, null, dealerType, true);
	}
	
	//Return an empty array if no data is passed in.
	return [];
}

/**
 * Get dealers that are in the State.
 * 
 * @param dataIn
 * @returns {Array}
 */
function GD_GetDealersByState_Restlet(dataIn)
{
	if(dataIn != undefined && dataIn != null && dataIn.state != undefined)
	{
		return getDealersInStateOrCountry(dataIn.state);
	}
	
	//Return an empty array if no data is passed in.
	return [];
}

/**
 * Get dealers that are in the Country.
 * 
 * @param dataIn
 * @returns {Array}
 */
function GD_GetDealersByCountry_Restlet(dataIn)
{
	if(dataIn != undefined && dataIn != null && dataIn.country != undefined)
	{
		return getDealersInStateOrCountry(null, dataIn.country);
	}
	
	//Return an empty array if no data is passed in.
	return [];
}

/**
 * Restlet that retrieves parts catalogue categories.
 * Because Site Category is not scriptable record in NS, we created GD custom record that gets updated daily via scheduled script.
 * We use this custom record to expose webstore dealer portal parts categories.
 * @param dataIn
 * @returns {Array}
 */
function GD_GetPartsSiteCategories_Restlet(dataIn)
{
	var categoryArray = new Array();
	if(dataIn != undefined && dataIn != null)
	{
		var parentCategoryId = 0;
		
		if(dataIn.categoryId != undefined && dataIn.categoryId != '')
		{
			parentCategoryId = parseInt(dataIn.categoryId, 10);
			if(isNaN(parentCategoryId))
				parentCategoryId = 0;
		}
		
		//if parent category is specified, then return immediate children, otherwise return top level parents.
		var filters = new Array();		
		if(parentCategoryId != 0)
			filters.push(new nlobjSearchFilter('custrecordgd_partssitecategory_parentcat', null, 'is', parentCategoryId)); 
		else
			filters.push(new nlobjSearchFilter('custrecordgd_partssitecategory_parentcat', null, 'is', '@NONE@'));
		
		var cols = new Array();
		cols.push(new nlobjSearchColumn('custrecordgd_partssitecategory_category', null, null));
		cols.push(new nlobjSearchColumn('custrecordgd_partssitecategory_parentcat', null, null));
		cols.push(new nlobjSearchColumn('custrecordgd_partssitecategory_desc', null, null));
		cols.push(new nlobjSearchColumn('custrecordgd_partssitecategory_longdesc', null, null));
		
		
		var categoryResults = GetSteppedSearchResults('customrecordgd_partssitecategory', filters, cols);
		var categoryJSON = null;
		if(categoryResults != null && categoryResults.length > 0)
		{
			var parentId = null;
			for(var i = 0; i < categoryResults.length; i++)
			{
				parentId = categoryResults[i].getValue('custrecordgd_partssitecategory_parentcat');
				
				categoryJSON = new Object();
				categoryJSON.id = categoryResults[i].getValue('custrecordgd_partssitecategory_category');
				categoryJSON.name = categoryResults[i].getText('custrecordgd_partssitecategory_category');
				categoryJSON.description = categoryResults[i].getValue('custrecordgd_partssitecategory_desc');
				categoryJSON.longDescription = categoryResults[i].getValue('custrecordgd_partssitecategory_desc');				
				
				//set parent category info.
				categoryJSON.parentId = null;
				categoryJSON.parentName = null;				
				if(parentId != null && parentId != '')
				{
					categoryJSON.parentId = parentId;
					categoryJSON.parentName = categoryResults[i].getText('custrecordgd_partssitecategory_parentcat');				
				}

				categoryArray.push(categoryJSON);
			}
		}
		
	}
	
	
	return categoryArray;
}

/**
 * Restlet that retrieves items as JSON array by a specific site category.
 */
function GD_GetItemsByCategory_Restlet(dataIn)
{
	var itemArray = new Array();
	if(dataIn != undefined && dataIn != null)
	{
		var categoryId = 0;
		
		if(dataIn.categoryId != undefined && dataIn.categoryId != '')
		{
			categoryId = parseInt(dataIn.categoryId, 10);
			if(isNaN(categoryId))
				categoryId = 0;
		}
		
		if(categoryId != 0)
		{
			var filters = new Array();
			filters.push(new nlobjSearchFilter('type', null, 'anyof', ['NonInvtPart', 'InvtPart']));
			filters.push(new nlobjSearchFilter('isonline', null, 'is', 'T'));
			filters.push(new nlobjSearchFilter('category', null, 'is', categoryId)); 
			
			var cols = new Array();
			cols.push(new nlobjSearchColumn('internalid', null, null));
			cols.push(new nlobjSearchColumn('itemid', null, null));
			cols.push(new nlobjSearchColumn('displayname', null, null));
			cols.push(new nlobjSearchColumn('salesdescription', null, null));
			cols.push(new nlobjSearchColumn('thumbnailurl', null, null));
			cols.push(new nlobjSearchColumn('imageurl', null, null));
			cols[2].setSort(false); //sort by item display name asc
			
			var itemResults = GetSteppedSearchResults('item', filters, cols); //get items by specific category
			var itemJSON = null;
			if(itemResults != null && itemResults.length > 0)
			{
				//nlapiLogExecution('debug', 'GD_GetItemsByCategory_Restlet', 'itemResults.length = ' + itemResults.length);
				var thumbURL = null;
				for(var i = 0; i < itemResults.length; i++)
				{
					thumbURL = itemResults[i].getValue('thumbnailurl', null, null);
					
					itemJSON = new Object();
					itemJSON.id = itemResults[i].getValue('internalid', null, null);
					itemJSON.name = itemResults[i].getValue('itemid', null, null);
					itemJSON.displayName = itemResults[i].getValue('displayname', null, null);
					itemJSON.description = itemResults[i].getValue('salesdescription', null, null);					
					itemJSON.imageUrl = getCheckoutDomainUrl(itemResults[i].getValue('imageurl', null, null));
					itemJSON.thumbnailUrl = null;
					if(thumbURL != null && thumbURL != '')
						itemJSON.thumbnailUrl = getCheckoutDomainUrl(thumbURL + '&resizeid=-5'); //resizeid values: -5 returns 120x120 image, -1 returns 50x50 image, -2 returns 240x240 image
					
					itemArray.push(itemJSON);
				}
			}
		}
	}
	
	return itemArray;
}

/**
 * Restlet that retrieves item information as JSON object given the item Id.
 */
function GD_GetItemById_Restlet(dataIn)
{
	var itemJSON = null;
	if(dataIn != undefined && dataIn != null)
	{
		var itemId = 0;		
		if(dataIn.itemId != undefined && dataIn.itemId != '')
		{
			itemId = parseInt(dataIn.itemId, 10);
			if(isNaN(itemId))
				itemId = 0;
		}
		
		if(itemId != 0)
		{
			var cols = new Array();
			cols.push(new nlobjSearchColumn('internalid', null, null));
			cols.push(new nlobjSearchColumn('itemid', null, null));
			cols.push(new nlobjSearchColumn('displayname', null, null));
			cols.push(new nlobjSearchColumn('salesdescription', null, null));
			cols.push(new nlobjSearchColumn('thumbnailurl', null, null));
			cols.push(new nlobjSearchColumn('imageurl', null, null));
			
			var itemResults = nlapiSearchRecord('item', null, new nlobjSearchFilter('internalid', null, 'anyof', itemId), cols);						
			if(itemResults != null && itemResults.length > 0)
			{
				//nlapiLogExecution('debug', 'GD_GetItemsByCategory_Restlet', 'itemResults.length = ' + itemResults.length);
				var thumbURL = itemResults[0].getValue('thumbnailurl', null, null);				
				itemJSON = new Object();
				itemJSON.id = itemResults[0].getValue('internalid', null, null);
				itemJSON.name = itemResults[0].getValue('itemid', null, null);
				itemJSON.displayName = itemResults[0].getValue('displayname', null, null);
				itemJSON.description = itemResults[0].getValue('salesdescription', null, null);					
				itemJSON.imageUrl = getCheckoutDomainUrl(itemResults[0].getValue('imageurl', null, null));
				itemJSON.thumbnailUrl = null;
				if(thumbURL != null && thumbURL != '')
					itemJSON.thumbnailUrl = getCheckoutDomainUrl(thumbURL + '&resizeid=-5'); //resizeid values: -5 returns 120x120 image, -1 returns 50x50 image, -2 returns 240x240 image				
			}
		}
	}
	return itemJSON;
}

/**
 * Returns whether or not the url is under shopping domain.
 * @param url
 * @returns {Boolean}
 */
function isShoppingDomainUrl(url)
{
	return (url != null && url != '' && url.indexOf(NETSUITE_SHOPPING_PROTOCOL) > -1 && url.indexOf(NETSUITE_SHOPPING_DOMAIN) > -1);
}

/**
 * Transforms to checkout domain url for the specified shopping url.
 * If the shoppingUrl is null, empty or not under shopping domain, the same url that was passed in is returned.
 * @param shoppingUrl
 * @returns
 */
function transformShoppingToCheckoutDomainUrl(shoppingUrl)
{
	return shoppingUrl.replace(NETSUITE_SHOPPING_PROTOCOL, NETSUITE_CHECKOUT_PROTOCOL).replace(NETSUITE_SHOPPING_DOMAIN, NETSUITE_CHECKOUT_DOMAIN);
}

/**
 * Returns checkout domain url for the specified shopping url.
 * If the shoppingUrl is null, empty or not under shopping domain, the same url that was passed in is returned.
 * @param shoppingUrl
 * @returns
 */
function getCheckoutDomainUrl(shoppingUrl)
{
	if(isShoppingDomainUrl(shoppingUrl))
		return transformShoppingToCheckoutDomainUrl(shoppingUrl);
	else
		return shoppingUrl;
}

/**
 * Filter contacts search results by dealer.
 */
function filterContactsByDealer(dealerId) 
{
	return function(contactSearchResult) 
	{
	   return contactSearchResult.getValue('company') == dealerId;
	};
}

/******************* END OF FORCE 5 RESTLETS *********************************/

/**
 * Returns an alphabetically-sorted list of all dealers in the specified State or Country.
 * You may only use one of these parameters, not both!
 * 
 * @param {String} state State to find dealers for.
 * @param {String} country Country to find dealers for.
 * @returns {Array}
 */
function getDealersInStateOrCountry(state, country)
{
	//Create columns
	var cols = [new nlobjSearchColumn('internalid'),
				new nlobjSearchColumn('companyname').setSort(),
				new nlobjSearchColumn('entityid'),
				new nlobjSearchColumn('custentitygd_dlrlocaddress1'),
				new nlobjSearchColumn('custentitygd_dlrlocaddress2'),
				new nlobjSearchColumn('custentitygd_dlrloccity'),
				new nlobjSearchColumn('custentitygd_dlrlocstateabbreviation'),
				new nlobjSearchColumn('custentitygd_dlrloczipcode'),
				new nlobjSearchColumn('custentitygd_dlrloccountryabbreviation'),
				new nlobjSearchColumn('custentitygd_dlrlocphone'),
				new nlobjSearchColumn('email'),
				new nlobjSearchColumn('custentitygd_addresslatitude'),
				new nlobjSearchColumn('custentitygd_addresslongitude'),
				new nlobjSearchColumn('custentityrvsdealertype'),
				new nlobjSearchColumn('custentitygd_hideindealerlocator'),
				new nlobjSearchColumn('custentitygd_rvtraderid'),
				new nlobjSearchColumn('custentitygd_rvtdealerid')];

	//Create filters
	var filters = [	new nlobjSearchFilter('isinactive', null, 'is', 'F'),
					new nlobjSearchFilter('custentitygd_hideindealerlocator', null, 'is', 'F'), //do not include dealers marked as "hide in dealer locator"
					new nlobjSearchFilter('custentityrvscreditdealer', null, 'is', 'F'), //do not include credit dealers
					new nlobjSearchFilter('custentitygd_addresslatitude', null, 'isnotempty'),
				    new nlobjSearchFilter('custentitygd_addresslongitude', null, 'isnotempty'),	   
				    new nlobjSearchFilter('custentityrvsdealertype', null, 'anyof', [DEALER_TYPE_RVSDEALER])];
				    
	//Determine if we're using the state filter or the country filter.
	if(state != null && state != '')
	{
		//If we're using the state, convert the state to an abbreviation
		var stateResult = nlapiSearchRecord('customrecordrvs_state', null, new nlobjSearchFilter('formulanumeric', null, 'equalto', 1).setFormula("CASE WHEN UPPER({name}) like '" + state.toUpperCase() + "' THEN 1 ELSE 0 END"), new nlobjSearchColumn('custrecordrvs_state_shortname'));
		if (stateResult != null)
		{
			state = stateResult[0].getValue('custrecordrvs_state_shortname');
		}
		else 
		{
			state = state.toUpperCase();
		}
		filters.push(new nlobjSearchFilter('custentitygd_dlrlocstateabbreviation', null, 'is', state));
	}
	else if (country != null && country != '')
	{
		//If we're using the country, use the abbreviation of the country.
		var countryAbbr = GD_GetDealers_ConvertCountryToAbbr(country);
		filters.push(new nlobjSearchFilter('custentitygd_dlrloccountryabbreviation', null, 'is', countryAbbr));
	}

	//Search for data
	var dealers =  nlapiSearchRecord('customer', null, filters, cols);
	var dealerArr = [];
	if(dealers != null && dealers.length > 0)
	{
		for(var i = 0; i < dealers.length; i++)
		{
			var dealerJSON = new Object();
			dealerJSON.id = dealers[i].getId();
			dealerJSON.name = trim(dealers[i].getValue('companyname'));
			if(dealerJSON.name == '') //For Individuals, companyname will empty
				dealerJSON.name = trim(dealers[i].getValue('entityid'));
			
			dealerJSON.shipAddress1 = trim(dealers[i].getValue('custentitygd_dlrlocaddress1'));
			dealerJSON.shipAddress2 = trim(dealers[i].getValue('custentitygd_dlrlocaddress2'));
			dealerJSON.shipCity = trim(dealers[i].getValue('custentitygd_dlrloccity'));
			dealerJSON.shipState = trim(dealers[i].getValue('custentitygd_dlrlocstateabbreviation'));
			dealerJSON.shipZip = trim(dealers[i].getValue('custentitygd_dlrloczipcode'));
			dealerJSON.shipCountry = trim(dealers[i].getValue('custentitygd_dlrloccountryabbreviation'));
			dealerJSON.phone = trim(dealers[i].getValue('custentitygd_dlrlocphone'));
			
			dealerJSON.email = trim(dealers[i].getValue('email'));
			dealerJSON.latitude = trim(dealers[i].getValue('custentitygd_addresslatitude'));
			dealerJSON.longitude = trim(dealers[i].getValue('custentitygd_addresslongitude'));
			dealerJSON.distance = Math.round(parseFloat(dealers[i].getValue('formulanumeric')));
			dealerJSON.type = (dealers[i].getValue('custentityrvsdealertype') == DEALER_TYPE_RVSDEALER ? 'Dealer' : 'Service Center');
			dealerJSON.traderId = trim(dealers[i].getValue('custentitygd_rvtraderid'));
			dealerJSON.rvtDealerId = trim(dealers[i].getValue('custentitygd_rvtdealerid')) || null;
			if(dealerJSON.traderId == '') { dealerJSON.traderId = null; }
			
			dealerArr.push(dealerJSON);
		}
	}
	return dealerArr;
}



/******************** USED BY GD FORMER WEBSITE GUYS **********************/

/*
* Scripts below were used by GD previous (old) website guys. We still keep them because while in transition, the restlet is still in use.
*/

/**
 * Returns dealer information based on modified date or internal id.
 */
function GetDealerLocatorInfo(datain)
{	
	var jsonObjectArray = null;
	
	if(IsDefined(datain))
	{
		var filters = new Array();		
		if(IsDefined(datain.lastModifiedDate)) //if last modified date is specified, use it as a filter
			filters[filters.length] =  new nlobjSearchFilter('lastmodifieddate', null, 'onorafter', datain.lastModifiedDate, null);
		else if(IsDefined(datain.internalId)) //if no last modified date, use internalId if it is specified
			filters[filters.length] =  new nlobjSearchFilter('internalid', null, 'anyof', datain.internalId, null);
		
		var results = null;
		if(filters.length > 0)
			results = nlapiSearchRecord('customer', 'customsearchdealerlocatorinfo', filters);	
		
		if(results != null && results.length > 0)
		{
			jsonObjectArray = CreateJSONArrayFromSearch(results);
			return jsonObjectArray;
		}	

	}

	//for some reason, dealer locator programmer was getting an error when there was no results.
	//We suspect that this could be because whatever environment he is using does not support nulls,
	//so instead of returning null, we will return empty string if there is no result.
	if(jsonObjectArray == null)
		return '';
	else
		return jsonObjectArray;
}

/**
 * Creates JSON Array from saved search results.
 * This method assumes that if a custom label ends with Id, then it needs to retrieve both value and text.
 * @param searchResults
 * @returns
 */
function CreateJSONArrayFromSearch(searchResults)
{
	if(searchResults != null && searchResults.length > 0)
	{
		var jsonResults = []; //An array to store json objects.
		for(var i = 0; i < searchResults.length; i++) //loop throught search results/rows
		{
			var currentRow = searchResults[i];
			var columns = currentRow.getAllColumns();
			var json = {}; //a json object for the current search result
			
			for(var j = 0; j < columns.length; j++) //loop through properties/columns
			{
				var currentColumn = columns[j];				
				var columnLabel = currentColumn.getLabel();
				var join = trim(currentColumn.getJoin());
				var currentValue = '';
				var isSelectField = false;
				var columnEndsWithText = '';
				var selectFieldDisplayName = '';
				
				if(columnLabel.length > 2)
				{
					columnEndsWithText = columnLabel.substring(columnLabel.length - 2);				
					selectFieldDisplayName = columnLabel.substring(0, columnLabel.length - 2);					
				}
				
				//if column label ends with id, then treat this as a select field which means we should get both text and value.
				if(columnEndsWithText.toLowerCase() == 'id' && columnLabel.toLowerCase() != 'internalid')
				{
					isSelectField = true;
				}

				if(join == '')
				{
					//If this is a select field, then select text as the value.
					if(isSelectField)
						currentValue = trim(currentRow.getText(currentColumn));
					else
						currentValue = trim(currentRow.getValue(currentColumn));
				}				
				else
				{
					//If this is a select field, then select text as the value.
					if(isSelectField)
						currentValue = trim(currentRow.getText(currentColumn));
					else
						currentValue = trim(currentRow.getValue(currentColumn));
				}

			    if(isSelectField && selectFieldDisplayName != '')
				{
					json[selectFieldDisplayName] = currentValue;
					json[columnLabel] = trim(currentRow.getValue(currentColumn));

				}
				else
					json[columnLabel] = currentValue;

			}
			jsonResults.push(json);			
		}		
		return jsonResults;
	}
	else
		return null;
}
/*************************** END OF FORMER **************************************/

/**
 * Returns the 2 letter NetSuite country abbreviation for the full country name.
 * 
 * @param countryName
 */
function GD_GetDealers_ConvertCountryToAbbr(countryName)
{
	//If they already made it an abbreviation, don't search for it.
	if(countryName.length == 2) return countryName.toUpperCase();
	
	//Search for the country
	var countries_list = [
		{id: 'AD', name: 'Andorra'},
		{id: 'AE', name: 'United Arab Emirates'},
		{id: 'AF', name: 'Afghanistan'},
		{id: 'AG', name: 'Antigua and Barbuda'},
		{id: 'AI', name: 'Anguilla'},
		{id: 'AL', name: 'Albania'},
		{id: 'AM', name: 'Armenia'},
		{id: 'AO', name: 'Angola'},
		{id: 'AQ', name: 'Antarctica'},
		{id: 'AR', name: 'Argentina'},
		{id: 'AS', name: 'American Samoa'},
		{id: 'AT', name: 'Austria'},
		{id: 'AU', name: 'Australia'},
		{id: 'AW', name: 'Aruba'},
		{id: 'AX', name: 'Aland Islands'},
		{id: 'AZ', name: 'Azerbaijan'},
		{id: 'BA', name: 'Bosnia and Herzegovina'},
		{id: 'BB', name: 'Barbados'},
		{id: 'BD', name: 'Bangladesh'},
		{id: 'BE', name: 'Belgium'},
		{id: 'BF', name: 'Burkina Faso'},
		{id: 'BG', name: 'Bulgaria'},
		{id: 'BH', name: 'Bahrain'},
		{id: 'BI', name: 'Burundi'},
		{id: 'BJ', name: 'Benin'},
		{id: 'BL', name: 'Saint Barth�lemy'},
		{id: 'BM', name: 'Bermuda'},
		{id: 'BN', name: 'Brunei Darrussalam'},
		{id: 'BO', name: 'Bolivia'},
		{id: 'BQ', name: 'Bonaire'},
		{id: 'BQ', name: 'Saint Eustatius'},
		{id: 'BQ', name: 'Saba'},
		{id: 'BR', name: 'Brazil'},
		{id: 'BS', name: 'Bahamas'},
		{id: 'BT', name: 'Bhutan'},
		{id: 'BV', name: 'Bouvet Island'},
		{id: 'BW', name: 'Botswana'},
		{id: 'BY', name: 'Belarus'},
		{id: 'BZ', name: 'Belize'},
		{id: 'CA', name: 'Canada'},
		{id: 'CC', name: 'Cocos (Keeling) Islands'},
		{id: 'CD', name: 'Democratic People\'s Republic of Congo'},
		{id: 'CF', name: 'Central African Republic'},
		{id: 'CG', name: 'Republic of Congo'},
		{id: 'CH', name: 'Switzerland'},
		{id: 'CI', name: 'Cote d\'Ivoire'},
		{id: 'CK', name: 'Cook Islands'},
		{id: 'CL', name: 'Chile'},
		{id: 'CM', name: 'Cameroon'},
		{id: 'CN', name: 'China'},
		{id: 'CO', name: 'Colombia'},
		{id: 'CR', name: 'Costa Rica'},
		{id: 'CU', name: 'Cuba'},
		{id: 'CV', name: 'Cape Verde'},
		{id: 'CW', name: 'Curacao'},
		{id: 'CX', name: 'Christmas Island'},
		{id: 'CY', name: 'Cyprus'},
		{id: 'CZ', name: 'Czech Republic'},
		{id: 'DE', name: 'Germany'},
		{id: 'DJ', name: 'Djibouti'},
		{id: 'DK', name: 'Denmark'},
		{id: 'DM', name: 'Dominica'},
		{id: 'DO', name: 'Dominican Republic'},
		{id: 'DZ', name: 'Algeria'},
		{id: 'EA', name: 'Ceuta and Melilla'},
		{id: 'EC', name: 'Ecuador'},
		{id: 'EE', name: 'Estonia'},
		{id: 'EG', name: 'Egypt'},
		{id: 'EH', name: 'Western Sahara'},
		{id: 'ER', name: 'Eritrea'},
		{id: 'ES', name: 'Spain'},
		{id: 'ET', name: 'Ethiopia'},
		{id: 'FI', name: 'Finland'},
		{id: 'FJ', name: 'Fiji'},
		{id: 'FK', name: 'Falkland Islands'},
		{id: 'FM', name: 'Federal State of Micronesia'},
		{id: 'FO', name: 'Faroe Islands'},
		{id: 'FR', name: 'France'},
		{id: 'GA', name: 'Gabon'},
		{id: 'GB', name: 'United Kingdom'},
		{id: 'GB', name: 'Great Britain'},
		{id: 'GD', name: 'Grenada'},
		{id: 'GE', name: 'Georgia'},
		{id: 'GF', name: 'French Guiana'},
		{id: 'GG', name: 'Guernsey'},
		{id: 'GH', name: 'Ghana'},
		{id: 'GI', name: 'Gibraltar'},
		{id: 'GL', name: 'Greenland'},
		{id: 'GM', name: 'Gambia'},
		{id: 'GN', name: 'Guinea'},
		{id: 'GP', name: 'Guadeloupe'},
		{id: 'GQ', name: 'Equatorial Guinea'},
		{id: 'GR', name: 'Greece'},
		{id: 'GS', name: 'South Georgia'},
		{id: 'GT', name: 'Guatemala'},
		{id: 'GU', name: 'Guam'},
		{id: 'GW', name: 'Guinea-Bissau'},
		{id: 'GY', name: 'Guyana'},
		{id: 'HK', name: 'Hong Kong'},
		{id: 'HM', name: 'Heard and McDonald Islands'},
		{id: 'HN', name: 'Honduras'},
		{id: 'HR', name: 'Croatia'},
		{id: 'HR', name: 'Hrvatska'},
		{id: 'HT', name: 'Haiti'},
		{id: 'HU', name: 'Hungary'},
		{id: 'IC', name: 'Canary Islands'},
		{id: 'ID', name: 'Indonesia'},
		{id: 'IE', name: 'Ireland'},
		{id: 'IL', name: 'Israel'},
		{id: 'IM', name: 'Isle of Man'},
		{id: 'IN', name: 'India'},
		{id: 'IO', name: 'British Indian Ocean Territory'},
		{id: 'IQ', name: 'Iraq'},
		{id: 'IR', name: 'Iran'},
		{id: 'IS', name: 'Iceland'},
		{id: 'IT', name: 'Italy'},
		{id: 'JE', name: 'Jersey'},
		{id: 'JM', name: 'Jamaica'},
		{id: 'JO', name: 'Jordan'},
		{id: 'JP', name: 'Japan'},
		{id: 'KE', name: 'Kenya'},
		{id: 'KG', name: 'Kyrgyzstan'},
		{id: 'KH', name: 'Cambodia'},
		{id: 'KI', name: 'Kiribati'},
		{id: 'KM', name: 'Comoros'},
		{id: 'KN', name: 'Saint Kitts and Nevis'},
		{id: 'KR', name: 'Republic of Korea'},
		{id: 'KW', name: 'Kuwait'},
		{id: 'KY', name: 'Cayman Islands'},
		{id: 'KZ', name: 'Kazakhstan'},
		{id: 'LA', name: 'Lao People\'s Democratic Republic'},
		{id: 'LB', name: 'Lebanon'},
		{id: 'LC', name: 'Saint Lucia'},
		{id: 'LI', name: 'Liechtenstein'},
		{id: 'LK', name: 'Sri Lanka'},
		{id: 'LR', name: 'Liberia'},
		{id: 'LS', name: 'Lesotho'},
		{id: 'LT', name: 'Lithuania'},
		{id: 'LU', name: 'Luxembourg'},
		{id: 'LV', name: 'Latvia'},
		{id: 'LY', name: 'Libyan Arab Jamahiriya'},
		{id: 'MA', name: 'Morocco'},
		{id: 'MC', name: 'Monaco'},
		{id: 'MD', name: 'Republic of Moldova'},
		{id: 'ME', name: 'Montenegro'},
		{id: 'MF', name: 'Saint Martin'},
		{id: 'MG', name: 'Madagascar'},
		{id: 'MH', name: 'Marshall Islands'},
		{id: 'MK', name: 'Macedonia'},
		{id: 'ML', name: 'Mali'},
		{id: 'MM', name: 'Myanmar'},
		{id: 'MN', name: 'Mongolia'},
		{id: 'MO', name: 'Macau'},
		{id: 'MP', name: 'Northern Mariana Islands'},
		{id: 'MQ', name: 'Martinique'},
		{id: 'MR', name: 'Mauritania'},
		{id: 'MS', name: 'Montserrat'},
		{id: 'MT', name: 'Malta'},
		{id: 'MU', name: 'Mauritius'},
		{id: 'MV', name: 'Maldives'},
		{id: 'MW', name: 'Malawi'},
		{id: 'MX', name: 'Mexico'},
		{id: 'MY', name: 'Malaysia'},
		{id: 'MZ', name: 'Mozambique'},
		{id: 'NA', name: 'Namibia'},
		{id: 'NC', name: 'New Caledonia'},
		{id: 'NE', name: 'Niger'},
		{id: 'NF', name: 'Norfolk Island'},
		{id: 'NG', name: 'Nigeria'},
		{id: 'NI', name: 'Nicaragua'},
		{id: 'NL', name: 'Netherlands'},
		{id: 'NO', name: 'Norway'},
		{id: 'NP', name: 'Nepal'},
		{id: 'NR', name: 'Nauru'},
		{id: 'NU', name: 'Niue'},
		{id: 'NZ', name: 'New Zealand'},
		{id: 'OM', name: 'Oman'},
		{id: 'PA', name: 'Panama'},
		{id: 'PE', name: 'Peru'},
		{id: 'PF', name: 'French Polynesia'},
		{id: 'PG', name: 'Papua New Guinea'},
		{id: 'PH', name: 'Philippines'},
		{id: 'PK', name: 'Pakistan'},
		{id: 'PL', name: 'Poland'},
		{id: 'PM', name: 'St. Pierre and Miquelon'},
		{id: 'PN', name: 'Pitcairn Island'},
		{id: 'PR', name: 'Puerto Rico'},
		{id: 'PS', name: 'Palestinian Territories'},
		{id: 'PT', name: 'Portugal'},
		{id: 'PW', name: 'Palau'},
		{id: 'PY', name: 'Paraguay'},
		{id: 'QA', name: 'Qatar'},
		{id: 'RE', name: 'Reunion Island'},
		{id: 'RO', name: 'Romania'},
		{id: 'RS', name: 'Serbia'},
		{id: 'RU', name: 'Russian Federation'},
		{id: 'RW', name: 'Rwanda'},
		{id: 'SA', name: 'Saudi Arabia'},
		{id: 'SB', name: 'Solomon Islands'},
		{id: 'SC', name: 'Seychelles'},
		{id: 'SD', name: 'Sudan'},
		{id: 'SE', name: 'Sweden'},
		{id: 'SG', name: 'Singapore'},
		{id: 'SH', name: 'Saint Helena'},
		{id: 'SI', name: 'Slovenia'},
		{id: 'SJ', name: 'Svalbard and Jan Mayen Islands'},
		{id: 'SK', name: 'Slovak Republic'},
		{id: 'SL', name: 'Sierra Leone'},
		{id: 'SM', name: 'San Marino'},
		{id: 'SN', name: 'Senegal'},
		{id: 'SO', name: 'Somalia'},
		{id: 'SR', name: 'Suriname'},
		{id: 'SS', name: 'South Sudan'},
		{id: 'ST', name: 'Sao Tome and Principe'},
		{id: 'SV', name: 'El Salvador'},
		{id: 'SX', name: 'Sint Maarten'},
		{id: 'SY', name: 'Syrian Arab Republic'},
		{id: 'SZ', name: 'Swaziland'},
		{id: 'TC', name: 'Turks and Caicos Islands'},
		{id: 'TD', name: 'Chad'},
		{id: 'TF', name: 'French Southern Territories'},
		{id: 'TG', name: 'Togo'},
		{id: 'TH', name: 'Thailand'},
		{id: 'TJ', name: 'Tajikistan'},
		{id: 'TK', name: 'Tokelau'},
		{id: 'TM', name: 'Turkmenistan'},
		{id: 'TN', name: 'Tunisia'},
		{id: 'TO', name: 'Tonga'},
		{id: 'TP', name: 'East Timor'},
		{id: 'TR', name: 'Turkey'},
		{id: 'TT', name: 'Trinidad and Tobago'},
		{id: 'TV', name: 'Tuvalu'},
		{id: 'TW', name: 'Taiwan'},
		{id: 'TZ', name: 'Tanzania'},
		{id: 'UA', name: 'Ukraine'},
		{id: 'UG', name: 'Uganda'},
		{id: 'UM', name: 'US Minor Outlying Islands'},
		{id: 'US', name: 'United States of America'},
		{id: 'UY', name: 'Uruguay'},
		{id: 'UZ', name: 'Uzbekistan'},
		{id: 'VA', name: 'Holy See (City Vatican State)'},
		{id: 'VA', name: 'Vatican City'},
		{id: 'VC', name: 'Saint Vincent and the Grenadines'},
		{id: 'VE', name: 'Venezuela'},
		{id: 'VG', name: 'Virgin Islands (British)'},
		{id: 'VI', name: 'Virgin Islands (USA)'},
		{id: 'VN', name: 'Vietnam'},
		{id: 'VU', name: 'Vanuatu'},
		{id: 'WF', name: 'Wallis and Futuna Islands'},
		{id: 'WS', name: 'Samoa'},
		{id: 'XK', name: 'Kosovo'},
		{id: 'YE', name: 'Yemen'},
		{id: 'YT', name: 'Mayotte'},
		{id: 'ZA', name: 'South Africa'},
		{id: 'ZM', name: 'Zambia'},
		{id: 'ZW', name: 'Zimbabwe'}
	];
	for (var i = 0; i < countries_list.length; i++)
	{
		if (countries_list[i].name.toUpperCase().contains(countryName.toUpperCase()))
			return countries_list[i].id;
	}
}
