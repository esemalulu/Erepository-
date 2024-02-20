var _gdDataCenterUrlsJSON = null; //global variable used to store data center urls JSON object. This variable is set in GetGrandDesignDataCenterUrls method. 

/**
 * Creates and returns JSON object array with properties being the Custom Label from the saved search.
 * See developer notes if you need:
 * 1) images and/or thumbnails from item record
 * 2) terms code/name on invoices
 * Method Type: Helper Method
 * @param {Object} searchResult
 */
//Developer Notes: - When working with items that have images, 
//                   use ImageId and ThumbnailId as the name of the properties
//                   for image and thumbnail respectively.
//                   The return item object will then have ImageURL and ThumbnailURL 
//                   set to access the image file from NS.
//                 - When working with invoices that have terms, 
//                   use TermsId as the name of the property for invoice terms
//                   The return invoice object will then have TermsCode set to access
//                   invoice terms code/name.
//                 - When working with invoices that have locations, 
//                   use OrderLocationId as the name of the property for Created From Location
//                   The return invoice object will then have OrderLocation set to access
//                   invoice's order location.
function CreateJSONArrayFromSearchResults(searchResults)
{
	if(searchResults != null && searchResults.length > 0)
	{
		var SPECIAL_LABEL_IMAGE_ID = 'imageid';
		var SPECIAL_LABEL_THUMBNAIL_ID = 'thumbnailid';
		var SPECIAL_LABEL_TERMS_ID = 'termsid';
		var SPECIAL_LABEL_ORDER_LOCATION_ID = 'orderlocationid';
		var SPECIAL_LABEL_BASEPRICE = 'baseprice';
		var SPECIAL_LABEL_RECORD_TYPE = 'RecordType';
		var SPECIAL_LABEL_CREATED_FROM = 'CreatedFrom';
			
		var IMAGE_URL_PROPERTY = 'ImageURL';
		var THUMBNAIL_URL_PROPERTY = 'ThumbnailURL';
		var TERMS_CODE_PROPERTY = 'TermsCode';
		var ORDER_LOCATION_PROPERTY = 'OrderLocation';
		var PRICE_PROPERTY = 'Price'; //This will be MSRP Price		
		var PRICE_LEVEL_MSRP = '6'; //MSRP Price Level Id
		
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

				if(join == '')
				{
					if(columnLabel == SPECIAL_LABEL_RECORD_TYPE)
						currentValue = trim(currentRow.getText(currentColumn));
					else
						currentValue = trim(currentRow.getValue(currentColumn));
				}				
				else
				{
					if(columnLabel == SPECIAL_LABEL_RECORD_TYPE)
						currentValue = trim(currentRow.getText(currentColumn.getName(), join).toLowerCase());
					else
						currentValue = trim(currentRow.getValue(currentColumn.getName(), join));
				}
										
				if(columnLabel.toLowerCase() == SPECIAL_LABEL_IMAGE_ID)
					json[IMAGE_URL_PROPERTY] = (currentValue != '') ? GetImageURL(currentValue) : '';
				else if(columnLabel.toLowerCase() == SPECIAL_LABEL_THUMBNAIL_ID)
					json[THUMBNAIL_URL_PROPERTY] = (currentValue != '') ? GetImageURL(currentValue) : '';
				else if(columnLabel.toLowerCase() == SPECIAL_LABEL_TERMS_ID)
					json[TERMS_CODE_PROPERTY] = (currentValue != '') ? GetTermsCode(currentValue) : '';
				else if(columnLabel.toLowerCase() == SPECIAL_LABEL_ORDER_LOCATION_ID)
					json[ORDER_LOCATION_PROPERTY] = (currentValue != '') ? GetLocationName(currentValue) : '';
				else if(columnLabel.toLowerCase() == SPECIAL_LABEL_BASEPRICE)
				{
					//json[columnLabel] = currentValue; //Set base price. They don't care about the BasePrice
					
					var basePrice = parseFloat(currentValue);					
					//Now set MSRP Price and return is as Price
					var msrpDiscountPct = nlapiLookupField('pricelevel',PRICE_LEVEL_MSRP, 'discountpct');
					if(isNaN(parseFloat(msrpDiscountPct)))
						msrpDiscountPct = '0';
					var msrpDiscount = parseFloat(msrpDiscountPct)/100; //convert percent to number.
					var msrpAmount = basePrice + (basePrice * msrpDiscount); //apply msrp discount to base price
					json[PRICE_PROPERTY] = msrpAmount; //Set MSRP Amount
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

/**
 * Gets a json formatted string from json object.
 * @param {Object} jsonObject
 */
function GetJSONString(jsonObject)
{
	var jsonString = '';
	if(jsonObject != null)
	{
		var propertyCount = 0;
		for (var prop in jsonObject) 
		{
			if (jsonObject.hasOwnProperty(prop)) 
			{
				if(propertyCount == 0)
					jsonString = "{\"" + prop + "\":\"" + jsonObject[prop];
				else
					jsonString += "\",\"" + prop + "\":\"" + jsonObject[prop];
					
				propertyCount++;
			}
		}
		
		if(jsonString != '')
			jsonString += "\"}";		
	}	
	return jsonString;
}

/**
 * Returns a JSON formatted string array given a JSON object array.
 * Note: 'JSON object array' can be created using 'CreateJSONArrayFromSearchResults' method.
 * @param {Object} jsonArray
 */
function CreateJSONStringArrayFromJSONArray(jsonArray)
{
	var jsonStringArray = '';
	if(jsonArray != null && jsonArray.length > 0)
	{
		var jsonString = '';
		for(var i = 0; i < jsonArray.length; i++)
		{
			jsonString = GetJSONString(jsonArray[i]);
			
			if(jsonString != '')
			{
				if(jsonStringArray == '')
					jsonStringArray = '[' + jsonString;
				else
					jsonStringArray += ',' + jsonString;
			}
		}
		
		jsonStringArray += ']';
	}	
	return jsonStringArray;
}

/**
 * Gets image URL given image Internal Id.
 * @param {Object} imageId
 */
function GetImageURL(imageId)
{
	var imageURL = null;
	if(IsValidRecordId(imageId))
	{
		var imageRecord = nlapiLoadFile(imageId);	
		if(imageRecord != null)
			imageURL = GetGrandDesignDataCenterUrls().systemDomain; // "https://system.netsuite.com/" + imageRecord.getURL();
	}	
	return imageURL;
}

/**
 * Returns Term name given terms id.
 * @param {Object} termId
 */
function GetTermsCode(termId)
{
	var termsCode = '';
	
	if(trim(termId) != '')
		termsCode = nlapiLookupField('term', termId, 'name');

	return termsCode;
}

/**
 * Returns location name given location id.
 * @param {Object} locationId
 */
function GetLocationName(locationId)
{
	var locationName = '';
	
	if(trim(locationId) != '')
		locationName = nlapiLookupField('location', locationId, 'name');

	return locationName;
}

/**
 * Check whether or not value specified is valid integer.
 * @param {Object} value
 */
function IsValidRecordId(value)
{
	if(value != undefined && value != null && !isNaN(parseInt(value)) && parseInt(value) > 0)
		return true;
	else
		return false;
}

/**
 * Returns whether or not the specified object is not null and is not undefined.
 * @param {Object} obj
 */
function IsDefined(obj)
{
	if(obj != null && obj != undefined && typeof(obj) != undefined)
		return true;
	else
		return false;
}

/**
 * 
 * @param {string} sString left and right trims specified string.
 * @return {string} Returns trimed string.
 */
function trim(sString) 
{ 
	if(sString != null)
	{
		sString = "" + sString; //convert any input to string
		while (sString.substring(0,1) == ' ') 
		{ 
			sString = sString.substring(1, sString.length); 
		} 
		while (sString.substring(sString.length-1, sString.length) == ' ') 
		{ 
			sString = sString.substring(0,sString.length-1); 
		} 
		return sString; 		
	}
	else
		return '';

}


/**
 * Returns Invoice Footer Text from General Preferences.
 * @returns
 */
function GetCustomInvoiceFooterText()
{
	return nlapiGetContext().getSetting('SCRIPT', 'custscriptinvoicefootertext');		
}

/**
 * Returns Parts Inquiry Attachments Folder from General Preferences.
 * @returns
 */
function GetPartsInquiryAttachmentsFolderId()
{
	return nlapiGetContext().getSetting('SCRIPT', 'custscriptpartsinquiryattachment');	
}

/**
 * Returns Pricing Mark-up value from General Preferences.
 * @returns
 */
function GetPricingMarkupPreference()
{
	return nlapiGetContext().getSetting('SCRIPT', 'custscriptgd_pricingmarkup');		
}

/**
 * Returns the number of Days in the Dealer Inactivation Period from General Preferences.
 * @returns
 */
function GetDealerInactivationPeriod()
{
	return nlapiGetContext().getSetting('SCRIPT', 'custscriptdealerinactivationperiod');		
}

/**
 * Gets Data Center Urls JSON object using suitelet. The object looks like this: 
 * 
 * { 
 * 		"systemDomain" : systemDomainUrl,
 * 		"restDomain" : restDomainUrl, 
 *   	"suiteletDomain" : suiteletDomainUrl, 
 *   	"webservicesDomain" : webservicesDomainUrl, 
 *   	"checkoutDomain" : checkoutDomainUrl
 * }
 * 
 * @returns {Object}
 */
function GetGrandDesignDataCenterUrls()
{
	if(_gdDataCenterUrlsJSON == null) //dataCenterUrlsJSON is a global variable. We use global variable to prevent consecutive calls to this method from executing suitelet.
		_gdDataCenterUrlsJSON = JSON.parse(nlapiRequestURL(nlapiResolveURL('SUITELET','customscriptrvs_getdatacenterurls_suitel','customdeployrvs_getdatacenterurls_suitel', true)).getBody());
	
	return _gdDataCenterUrlsJSON;
}


/**
 * Returns contact internal id given the dealerId and contact's e-mail address.
 *  
 * This function is in rvs as GetDealerContactIdByEmail, but we're using this version in Grand Design specific scripts.
 * @param {Number} dealerId
 * @param {String} email
 */
function GetContactFromDealerAndEmail(dealerId, email)
{
	if(email != null && trim(email) != '')
	{
		var filters = new Array();
		filters[filters.length] = new nlobjSearchFilter('isinactive',null,'is','F');
		filters[filters.length] = new nlobjSearchFilter('custentitygd_portalaccessdealer', null, 'anyof', dealerId);
		filters[filters.length] = new nlobjSearchFilter('email', null, 'is', email);
		
		var results = nlapiSearchRecord('contact', null, filters, null);
			
		if(results != null && results.length > 0)
			return results[0].getId();	
		else
			return null;
	}
	else
		return null;
}

/*
 * Returns an array of members in a dealer group, given a dealer id.
 * If the given dealer does not belong to a dealer group, their dealer id will be the only item returned in the array.
 * @param dealerId
 * @returns (Array) an array of group members
 */
function GetDealerGroupMembers(dealerId) {
	if(dealerId != null && dealerId != '')
	{
		var dgms = new Array();//this is what we'll return - an array of dealer group member ids.
		
		//Get the dealer's group.  If there is one, add its members to the dgms array
		var dealerGroupId = ConvertNSFieldToString(nlapiLookupField('customer', dealerId, 'custentitygd_dealergroup', false));
		
		if(dealerGroupId != '')
		{
			var cols = new Array();
			cols.push(new nlobjSearchColumn('internalid', null, null));
			cols.push(new nlobjSearchColumn('custentitygd_dealergroup', null, null));
			
			var filters = new Array();
			filters.push(new nlobjSearchFilter('custentitygd_dealergroup', null, 'anyof', dealerGroupId));
			filters.push(new nlobjSearchFilter('custentityrvscreditdealer', null, 'is', 'F'));
			filters.push(new nlobjSearchFilter('isinactive', null, 'is', 'F'));
			
			var searchResults = nlapiSearchRecord('customer', null, filters, cols);	
			
			//Add dealers in the group to the dgms array.
			if(searchResults != null && searchResults.length > 0)
			{
				for(var i = 0; i < searchResults.length; i++)
				{
					dgms.push(searchResults[i].getId());
				}
			}
		}
		else
		{
			dgms.push(dealerId);	//Return the dealers own id
		}
		return dgms;
	}
	return [];
}

function ConvertNSFieldToString(value)
{
	if (value == null)
		return '';
	else 
		return nlapiEscapeXML(value);
}

////////////////////////////////Begin Register Unit Suitelet Functions ///////////////////////////////////////

/**
 * Returns whether or not the specified dealer can register the specified unit.
 * @param vin
 * @param dealerId
 * @returns {Boolean}
 */
function CanDealerRegisterVin(vin, dealerId)
{
	var _canRegister = false;
	var vinResults = GetVinToRegisterSearchResults(vin, dealerId);
	
	if(vinResults != null && vinResults.length == 1)
		_canRegister = true;
	
	return _canRegister;
}

/**
 * Runs a search to determine if the specified dealer can register the specified unit.
 * @param vin
 * @param dealerId
 * @returns nlobjSearchResults
 */
function GetVinToRegisterSearchResults(vin, dealerId) {
	
	if(vin != null && vin != '')
	{
		var filterExp = '';
		
		if(dealerId != null && dealerId != '')
		{
			var vinDealers = GetDealerGroupMembers(dealerId);
			
			filterExp = [['name', 'is', vin],
		        'and',
		        [
		           ['custrecordunit_dealer.internalid', 'anyof', vinDealers],
		           'and',
		           ['custrecordunit_dealer.custentityrvscreditdealer', 'is', 'F'],
		           'and',
		           ['custrecordunit_dealer.isinactive', 'is', 'F']
		          
		        ],
		        'and',
		        ['custrecordunit_receiveddate', 'isempty', null],
		        'and',
		        ['isinactive', 'is', 'F'],
		        'and',
		        ['custrecordunit_shippingstatus', 'anyof', 'UNIT_SHIPPING_STATUS_SHIPPED']
	        ];	
		}
		else
		{
			filterExp = [['name', 'is', vin],
	            'and',
	            ['custrecordunit_receiveddate', 'isempty', null],
	            'and',
	            ['isinactive', 'is', 'F'],
	            'and',
	            ['custrecordunit_shippingstatus', 'anyof', 'UNIT_SHIPPING_STATUS_SHIPPED']		                 
			];	
		}
		
		var columns = new Array();
		columns.push(new nlobjSearchColumn('internalid'));
		columns.push(new nlobjSearchColumn('name'));
		
		return nlapiSearchRecord('customrecordrvsunit', null, filterExp, columns);
	}
}

//////////////////////////////// End Register Unit Suitelet Functions ///////////////////////////////////////

/**
 * Returns whether or not logged in user is Dealer, i.e Customer Center
 */
function GD_IsDealerLoggedIn()
{
	var context = nlapiGetContext();
	var roleName = context.getRoleCenter();
	if(trim(roleName.toLowerCase()) == 'customer' || trim(roleName.toLowerCase()) == 'website')
		return true;
	else
		return false;
}

function escapeHTMLEntities(str)
{
	str = str.replace(/&/g, "&amp;");
	str = str.replace(/>/g, "&gt;");
	str = str.replace(/</g, "&lt;");
	str = str.replace(/"/g, "&quot;");
	str = str.replace(/'/g, "&#039;");
	return str;
}

function unescapeHTMLEntities(str)
{
	str = str.replace(/&#039;/g, "'");
	str = str.replace(/&quot;/g, '"');
	str = str.replace(/&lt;/g, "<");
	str = str.replace(/&gt;/g, ">");
	str = str.replace(/&amp;/g, "&");
	return str;
}


/**
 * Takes an NS State and an NS Country (e.g. 'MI' and 'US') and outputs the RVS State (e.g. '23')
 * 
 */
function ConvertNSStateToRVSState(nsState, nsCountry)
{
	var modifiedNSCountry = '';
	if(nsCountry == 'US')
		modifiedNSCountry = 'United States';
	else if (nsCountry == 'AU')
		modifiedNSCountry = 'Australia';
	else if (nsCountry == 'CA')
		modifiedNSCountry = 'Canada';
	else if (nsCountry == 'MX')
		modifiedNSCountry = 'Mexico';
	else if (nsCountry == 'GB')
		modifiedNSCountry = 'United Kingdom';
	
	var filters = [new nlobjSearchFilter('custrecordrvs_state_shortname', null, 'is', nsState)];
	if (modifiedNSCountry.length > 0)
	{
		filters.push(new nlobjSearchFilter('name', 'custrecordrvs_state_rvscountry', 'is', modifiedNSCountry));
	}
	var cols = [new nlobjSearchColumn('custrecordrvs_state_netsuitestate')];
	
	var stateResult = nlapiSearchRecord('customrecordrvs_state', null, filters, cols);
	if (stateResult != null && stateResult.length > 0)
	{
		return stateResult[0].getValue('custrecordrvs_state_netsuitestate');
	}
	return null;
}

/**
 * Returns the internal ID of the RVS Country that matches the NetSuite abbreviated country name.
 * 
 * @param {String} nsCountry NetSuite abbreviation of the Country name. We only support 5 countries.
 */
function ConvertNSCountryToRVSCountry(nsCountry)
{
	var modifiedNSCountry = '';
	if(nsCountry == 'US')
		modifiedNSCountry = 'United States';
	else if (nsCountry == 'AU')
		modifiedNSCountry = 'Australia';
	else if (nsCountry == 'CA')
		modifiedNSCountry = 'Canada';
	else if (nsCountry == 'MX')
		modifiedNSCountry = 'Mexico';
	else if (nsCountry == 'GB')
		modifiedNSCountry = 'United Kingdom';

	var filters = [new nlobjSearchFilter('name', null, 'is', modifiedNSCountry)];
	var cols = [new nlobjSearchColumn('custrecordrvs_country_netsuitecountry')];
	
	var countryResult = nlapiSearchRecord('customrecordrvs_country', null, filters, cols);
	if (countryResult != null && countryResult.length > 0)
	{
		return countryResult[0].getValue('custrecordrvs_country_netsuitecountry');
	}
	return null;
}