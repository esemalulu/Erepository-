/**
 * API to get closest dealers for Grand Design.
 * Note: This file expects RVS Common.js file to be part of the library.
 * 
 * Version    Date            Author           Remarks
 * 1.00       06 Jul 2015     ibrahima
 *
 */

var DEALER_TYPE_RVSDEALER = '10';
var DEALER_TYPE_WARRANTY = '2';
var DEALER_SERVICE_MANAGER_STARTSWITH_KEYWORD = 'Service';
var DEALER_SERVICE_MANAGER_CONTAINS_KEYWORD = 'Manager';

/**
 * Get dealers that are close to the specified geo coordinate.
 * Used by the Lead Nurturing workflow action and the Integration RESTlets.
 * 
 * @param longitude - geo coordinate longitude
 * @param latitude - geo coordinate latitude
 * @param topN - number of records to be returned.
 * @param optionalCountry - A single country to search in, or null to search by all countries.
 * @param dealerType - One of 'all', 'dealer', or 'service'. Optional. Currently does nothing.
 * @param includeServicePhone - If true, includes the service manager's phone number with the data. This causes an extra search.
 * @returns {Array}
 */
function getDealersCloseToGeoLocation(longitude, latitude, topN, optionalCountry, dealerType, includeServicePhone)
{
	var dealerJSONArray = new Array();
	var dealerIdsArray = new Array();
	var lat1 = '';
	var long1 = '';
	
	if(latitude != undefined && longitude != undefined && trim(latitude) != '' && trim(longitude) != '') //If latitude and longitude are provided, use them instead.
	{
		lat1 = latitude;
		long1 = longitude;
	}
	
	//Make sure we have base latitude and longitude.
	if(lat1 != '' && long1 != '')
	{
		var radlat1 = Math.PI * parseFloat(lat1) / 180;			
		
		var radlat2SinFormula = '(SIN(' + Math.PI + ' * {custentitygd_addresslatitude}/180))';
		var radlat2CosForumula = '(COS(' + Math.PI + ' * {custentitygd_addresslatitude}/180))';
		var radThetaFormula = '(COS(' + Math.PI + ' * (' + long1 + '- {custentitygd_addresslongitude}) / 180))';
		var radLat1SinFormula = '(SIN(' + radlat1 + '))';
		var radLat1CosFormula = '(COS(' + radlat1 + '))';
		
		var formula = '(ACOS(' + radLat1SinFormula + ' * ' + radlat2SinFormula + ' + ' + radLat1CosFormula + ' * ' + radlat2CosForumula + ' * ' + radThetaFormula + ')) * 180 / ' + Math.PI + ' * ((60 * 1.1515) * 0.8684)';
		
		//reset columns to include only columns that we will return.
		var cols = new Array();
		cols[0] = new nlobjSearchColumn('formulanumeric');
		cols[0].setFormula(formula);
		cols[0].setSort();
		cols[cols.length] = new nlobjSearchColumn('internalid');
		cols[cols.length] = new nlobjSearchColumn('companyname');
		cols[cols.length] = new nlobjSearchColumn('entityid');
		cols[cols.length] = new nlobjSearchColumn('custentitygd_dlrlocaddress1');
		cols[cols.length] = new nlobjSearchColumn('custentitygd_dlrlocaddress2');
		cols[cols.length] = new nlobjSearchColumn('custentitygd_dlrloccity');
		cols[cols.length] = new nlobjSearchColumn('custentitygd_dlrlocstate');
		cols[cols.length] = new nlobjSearchColumn('custentitygd_dlrloczipcode');
		cols[cols.length] = new nlobjSearchColumn('custentitygd_dlrloccountry');
		cols[cols.length] = new nlobjSearchColumn('custentitygd_dlrlocphone');
		cols[cols.length] = new nlobjSearchColumn('email');
		cols[cols.length] = new nlobjSearchColumn('custentitygd_addresslatitude');
		cols[cols.length] = new nlobjSearchColumn('custentitygd_addresslongitude');
		cols[cols.length] = new nlobjSearchColumn('custentityrvsdealertype');
		cols[cols.length] = new nlobjSearchColumn('custentitygd_hideindealerlocator');
		cols[cols.length] = new nlobjSearchColumn('custentitygd_rvtraderid');
		cols[cols.length] = new nlobjSearchColumn('custentitygd_rvtdealerid');
		cols[cols.length] = new nlobjSearchColumn('custentitygd_dlrlocstateabbreviation');
		cols[cols.length] = new nlobjSearchColumn('custentitygd_dlrloccountryabbreviation');


		//reset filters
		var filters = new Array();
		filters[filters.length] = new nlobjSearchFilter('isinactive', null, 'is', 'F');
		filters[filters.length] = new nlobjSearchFilter('custentitygd_hideindealerlocator', null, 'is', 'F'); //do not include dealers marked as "hide in dealer locator"
		filters[filters.length] = new nlobjSearchFilter('custentityrvscreditdealer', null, 'is', 'F'); //do not include credit dealers
		filters[filters.length] = new nlobjSearchFilter('custentitygd_addresslatitude', null, 'isnotempty');
        filters[filters.length] = new nlobjSearchFilter('custentitygd_addresslongitude', null, 'isnotempty');	   
        filters[filters.length] = new nlobjSearchFilter('custentityrvsdealertype', null, 'anyof', [DEALER_TYPE_RVSDEALER]);
        //new to match Dealer Locator Info - Used on Restlet (customsearchdealerlocatorinfo) 
        filters[filters.length] = new nlobjSearchFilter('custentitygd_dlrlocaddress1', null, 'isnotempty');
        filters[filters.length] = new nlobjSearchFilter('custentitygd_dlrloccity', null, 'isnotempty');
        filters[filters.length] = new nlobjSearchFilter('custentitygd_dlrloczipcode', null, 'isnotempty');
        filters[filters.length] = new nlobjSearchFilter('custentitygd_dlrlocstate', null, 'isnotempty');
        if (optionalCountry || null != null)
        {
			filters[filters.length] = new nlobjSearchFilter('country', null, 'is', optionalCountry);
		}

		var dealers =  nlapiSearchRecord('customer', null, filters, cols);
		var numberOfRecords = 0;
		if(topN != undefined && topN != null && topN > 0)
			numberOfRecords = topN;
		
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
				dealerJSON.shipState = trim(dealers[i].getValue('custentitygd_dlrlocstateabbreviation'));// + ' - ' + trim(dealers[i].getValue('state', 'address'));
				dealerJSON.shipZip = trim(dealers[i].getValue('custentitygd_dlrloczipcode'));
				dealerJSON.shipCountry = trim(dealers[i].getValue('custentitygd_dlrloccountryabbreviation'));// + ' - ' + trim(dealers[i].getValue('country', 'address'));
				dealerJSON.phone = trim(dealers[i].getValue('custentitygd_dlrlocphone'));
				
				dealerJSON.email = trim(dealers[i].getValue('email'));
				dealerJSON.latitude = trim(dealers[i].getValue('custentitygd_addresslatitude'));
				dealerJSON.longitude = trim(dealers[i].getValue('custentitygd_addresslongitude'));
				dealerJSON.distance = Math.round(parseFloat(dealers[i].getValue('formulanumeric')));
				dealerJSON.type = (dealers[i].getValue('custentityrvsdealertype') == DEALER_TYPE_RVSDEALER ? 'Dealer' : 'Service Center');
				dealerJSON.traderId = trim(dealers[i].getValue('custentitygd_rvtraderid'));
				dealerJSON.rvtDealerId = trim(dealers[i].getValue('custentitygd_rvtdealerid')) || null;
				if(dealerJSON.traderId == '') { dealerJSON.traderId = null; }
				
				dealerJSONArray[dealerJSONArray.length] = dealerJSON;
				dealerIdsArray.push(dealerJSON.id);
				
				if(numberOfRecords > 0 && dealerJSONArray.length == numberOfRecords)
					break;
			}
			
			if (includeServicePhone)
			{
				if(dealerIdsArray.length > 0)
				{
					//Now update/set dealerJSON.servicePhone based on the dealer service manager contact.
					//Service Managers are identified by their job titles: Service Manager, Service/Warranty Manager, Service/Warranty/Parts Manager, Service/Parts Manager
					var dealerServiceManagerResults = nlapiSearchRecord('contact', null,
																[new nlobjSearchFilter('isinactive', null, 'is', 'F'), 
																 new nlobjSearchFilter('company', null, 'anyof', dealerIdsArray),														 
																 new nlobjSearchFilter('title', null, 'startswith', DEALER_SERVICE_MANAGER_STARTSWITH_KEYWORD),
																 new nlobjSearchFilter('title', null, 'contains', DEALER_SERVICE_MANAGER_CONTAINS_KEYWORD)],
																[new nlobjSearchColumn('company', null, null), new nlobjSearchColumn('phone', null, null)]);
					
					if(dealerServiceManagerResults != null && dealerServiceManagerResults.length > 0) //found service manager contacts
					{
						var currentDealerServiceManagerResults = null;
						for(var j = 0; j < dealerJSONArray.length; j++) //loop though dealers and find the service phone number from dealer's service manager.
						{
							currentDealerServiceManagerResults = dealerServiceManagerResults.filter(filterContactsByDealer(dealerJSONArray[j].id)); //find current dealer service managers. Note: Array.filter returns an array even if there is one element
							
							if(currentDealerServiceManagerResults != null && currentDealerServiceManagerResults.length > 0)
							{
								if(dealerJSONArray[j].id == currentDealerServiceManagerResults[0].getValue('company')) //always use the first service manager record until we hear differently from GD.
								{
									dealerJSONArray[j].servicePhone = trim(currentDealerServiceManagerResults[0].getValue('phone'));
								}
							}
						}
					}				
				}
			}
		}
	}
	
	return dealerJSONArray;
} 
