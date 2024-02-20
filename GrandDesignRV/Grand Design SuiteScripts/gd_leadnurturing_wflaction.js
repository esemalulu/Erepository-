/**
 * Module Description
 * 
 * Version    Date            Author           Remarks
 * 1.00       10 Jul 2015     ibrahima
 *
 */
var SALES_OPTION_MENU_BROCHURE = '8';
var SALES_OPTION_MENU_ASKAQUESTION = '11';
var SALES_OPTION_MENU_REQUESTAQUOTE = '12';

/**
 * @returns {Void} Any or no return value
 */
function GD_LeadNurturing_WflAction() 
{
	var menuOptionId = nlapiGetFieldValue('custentitygd_salesautomenuoption');
	var stateId = nlapiGetFieldValue('billstate');	//this returns bill state short name
	var billCountryId = nlapiGetFieldValue('billcountry'); //this returns bill country short name
	var stateFound = false;
	if(menuOptionId != null && menuOptionId != '') //menuOptionId is set. lead must be coming from one of our online forms. 
	{
		setLocalDealer();
		
		var seriesId = nlapiLookupField('customrecordgd_salesautomenuoptions', menuOptionId, 'custrecordgd_salesautooptions_series', false);
		if(menuOptionId == SALES_OPTION_MENU_BROCHURE)
			seriesId = nlapiGetFieldValue('custentitygd_brochureonechoice');
		if(menuOptionId == SALES_OPTION_MENU_ASKAQUESTION || menuOptionId == SALES_OPTION_MENU_REQUESTAQUOTE)
			seriesId = nlapiGetFieldValue('custentitygd_contact_marketingseries');
		
		//Convert the short name of the state to the internal ID of the state.
		var stateResults =	nlapiSearchRecord('customrecordrvs_state', null, 
								new nlobjSearchFilter('custrecordrvs_state_shortname', null, 'is', stateId), 
								[new nlobjSearchColumn('custrecordrvs_state_netsuitestate'), new nlobjSearchColumn('custrecordrvs_state_rvscountry')]);	
		
		//For different countries, state short name may not be unique.
		//Example: state with short name "WA" is Washington for USA and it is also Western Australia for Australia
		if (stateResults != null && stateResults.length > 0)
		{
			if(stateResults.length == 1) //found unique state
			{
				stateId = stateResults[0].getValue('custrecordrvs_state_netsuitestate');
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
						stateId = stateResults[i].getValue('custrecordrvs_state_netsuitestate');
						stateFound = true;
						break;
					}
				}
			}
		}

		if(!stateFound)
		{
			//Then we didn't find the state. Return out of this function so we know that the state was invalid.
			//This will not set the regional sales rep and so GD will receive an email saying that the sales manager could not be found.
			return;
		}
		
		setRegionalSalesManager(seriesId, stateId); //note: this method will not do anything if series or state is not set.
	}
	
}


/**
 * Sets Regional Sales Manager on lead based on the series and the state from which the lead is submitted from.
 * @param seriesId
 * @param stateId
 */
function setRegionalSalesManager(seriesId, stateId)
{
	if(seriesId != null && seriesId != '' && stateId != null && stateId != '')
	{
		var filters = new Array();
		filters[filters.length] = new nlobjSearchFilter('custentitysalesmgrassignedseries', null, 'anyof', seriesId);
		filters[filters.length] = new nlobjSearchFilter('custentitysalesmgrassignedstates', null, 'anyof', stateId);
		filters[filters.length] = new nlobjSearchFilter('isinactive', null, 'is', 'F');
		filters[filters.length] = new nlobjSearchFilter('salesrep', null, 'is', 'T'); //Note: "Is Sales Rep" field uses "salesrep" and not "issalesrep" as search filter name.
		
		var employees = nlapiSearchRecord('employee', null, filters, null);		
		if(employees != null && employees.length > 0) //regional sales manager for the specified series and state was found
			nlapiSetFieldValue('custentityregionalsalesmanager', employees[0].getId(), false, true);			
		
	}
}

/**
 * Sets Lead Local Dealer based on the address. 
 * Local dealer is the closest dealer from the address specified on the lead.
 */
function setLocalDealer()
{
	//Use the latitude and longitude set on the lead if we have them.
	var addressGeo = null;
	if (ConvertNSFieldToString(nlapiGetFieldValue('custentitygd_lead_latitude')).length > 0 && ConvertNSFieldToString(nlapiGetFieldValue('custentitygd_lead_longitude')).length > 0)
	{
		addressGeo = {
			lat: nlapiGetFieldValue('custentitygd_lead_latitude'),
			lng: nlapiGetFieldValue('custentitygd_lead_longitude')
		};
	}
		
	var addressInfoObj = null;
	//get address fields
	var billAddress1 = null;
	var billCity = null;
	var stateId = null;
	var billZip = null;
	var billCountry = null;
	var billCountryForSearch = null;
	
	if (nlapiGetFieldValue('country') == null)
	{
		billAddress1 = nlapiGetFieldValue('billaddr1');
		billCity = nlapiGetFieldValue('billcity');
		stateId = nlapiGetFieldValue('billstate');
		billZip = nlapiGetFieldValue('billzip');
		billCountry = nlapiGetFieldValue('billcountry');
		billCountryForSearch = nlapiGetFieldValue('billcountry');
	}
	else
	{
		billAddress1 = nlapiGetFieldValue('address1');
		billCity = nlapiGetFieldValue('city');
		stateId = nlapiGetFieldValue('state');
		billZip = nlapiGetFieldValue('zipcode');
		billCountry = nlapiGetFieldValue('country');
		billCountryForSearch = nlapiGetFieldValue('country');
	}
	
	var billState = stateId;
	if(!isNaN(parseInt(stateId))) //stateId is numeric, it must be the numeric internal id, lookup its short name.
		billState = getStateName(stateId);

	if (billCountry.toUpperCase() == 'CA')
		billCountry = 'Canada';
	
	//set dealer geo code based on the ship address. if ship address is not specified, use bill address.
	if(billAddress1 != '')
	{
		addressInfoObj = {
			'address': billAddress1,
			'city': billCity,
			'state': billState,
			'zip': billZip,
			'country': billCountry
			};
	}
		
	if (addressGeo == null && addressInfoObj != null)
	{
		addressGeo = getAddressGeometry(addressInfoObj); //this will try to find the address with different combination of street, zip and city.
	}
		
	if(addressGeo != null)
	{
		var closestDealerArray = getDealersCloseToGeoLocation(addressGeo.lng, addressGeo.lat, 1, billCountryForSearch, null, false);			
		if(closestDealerArray != null && closestDealerArray.length == 1)
		{
			nlapiSetFieldValue('custentitygd_localdealer', closestDealerArray[0].id, false, true);
			var localDealerAddress = GetLocalDealerAddress(closestDealerArray[0].id);
			nlapiSetFieldValue('custentitygd_localdealer_address', localDealerAddress, false, false);
		}			
	}
	else
		nlapiLogExecution('debug', 'address 2', 'NO ADDRESS');
}

/**
 * Returns the 2 letter NetSuite country abbreviation for the full country name.
 * 
 * @param countryShortName
 */
function getCountryFullName(countryShortName)
{
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
		if (countries_list[i].id.toUpperCase().contains(countryShortName.toUpperCase()))
			return countries_list[i].name;
	}
	return 'United States';
}

/**
 * Gets the name of the state given the state id.
 * Note: This uses RVS state custom record which supports only US and Canada
 * @param stateId
 * @returns {String}
 */
function getStateName(stateId)
{
	var stateName = '';
	
	if(stateId != null && stateId != '')
	{
		var filters = new Array();
		filters[filters.length] = new nlobjSearchFilter('custrecordrvs_state_netsuitestate', null, 'is', stateId);
		
		var cols = new Array();
		cols = new Array();
		cols[cols.length] = new nlobjSearchColumn('name', null, null);
		cols[cols.length] = new nlobjSearchColumn('custrecordrvs_state_netsuitestate', null, null);
		cols[cols.length] = new nlobjSearchColumn('custrecordrvs_state_shortname', null, null);
		cols[cols.length] = new nlobjSearchColumn('custrecordrvs_state_rvscountry', null, null);
		
		var states = nlapiSearchRecord('customrecordrvs_state', null, filters, cols);
		
		if(states != null && states.length > 0)
			stateName = states[0].getValue('custrecordrvs_state_shortname');
	}
	
	return stateName;
}

/**
 * Returns dealer address (ship address if there is one, otherwise; bill address)
 * @param dealerId
 * @returns {String}
 */
function GetLocalDealerAddress(dealerId)
{
	var addressBlock = '';
	var dealer = nlapiLoadRecord('customer', dealerId);
	
	var shipAdd1 = '';
	var shipCity = '';
	var shipState = '';
	var shipZip = '';
	
	var billAdd1 = '';
	var billCity = '';
	var billState = '';
	var billZip = '';
	
	for (var i=1; i<=dealer.getLineItemCount('addressbook'); i++)
	{
		if (dealer.getLineItemValue('addressbook', 'defaultshipping', i) == 'T')
		{
			dealer.selectLineItem('addressbook', i);
            addrSubrecord = dealer.viewCurrentLineItemSubrecord('addressbook', 'addressbookaddress');
            if(addrSubrecord != null)
        	{
	            shipAdd1 = trim(addrSubrecord.getFieldValue('addr1'));
				shipCity = trim(addrSubrecord.getFieldValue('city'));
				shipState = trim(addrSubrecord.getFieldValue('state')); //use "state" to get short name or displaystate to get long name
				shipZip = trim(addrSubrecord.getFieldValue('zip'));	            	
        	}
			
			addressBlock = shipAdd1 + '<BR>' + shipCity + ', ' + shipState + ' ' + shipZip;
			break;
		}
	}
	
	if(addressBlock == '') //This will be true only if dealer has no shipping address. In this case use the billing address.
	{
		for (var i=1; i<=dealer.getLineItemCount('addressbook'); i++)
		{
			if (dealer.getLineItemValue('addressbook', 'defaultbilling', i) == 'T')
			{
				dealer.selectLineItem('addressbook', i);
	            addrSubrecord = dealer.viewCurrentLineItemSubrecord('addressbook', 'addressbookaddress');
	            if(addrSubrecord != null)
	        	{
	            	billAdd1 = trim(addrSubrecord.getFieldValue('addr1'));
	            	billCity = trim(addrSubrecord.getFieldValue('city'));
	            	billState = trim(addrSubrecord.getFieldValue('state')); //use "state" to get short name or displaystate to get long name
	            	billZip = trim(addrSubrecord.getFieldValue('zip'));	            	
	        	}
				
				addressBlock = billAdd1 + '<BR>' + billCity + ', ' + billState + ' ' + billZip;
				break;
			}
		}	
	}
	
	return addressBlock;
}