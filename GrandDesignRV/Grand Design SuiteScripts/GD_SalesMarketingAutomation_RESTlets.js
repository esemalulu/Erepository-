/**
 * RESTlets for Grand Design's Contact Us forms that are created by Force5 (GD's website people)
 * 
 * Version    Date            Author           Remarks
 * 1.00       25 Apr 2016     Jacob Shetler
 *
 */

/**
 * Creates a lead from the data passed in.
 * Every field that is set in the data will be set on the lead.
 * 
 * Returns an object a success or failure flag.   
 * 
 * @param {Object} dataIn Parameter object
 * @returns {Object} Output object
 */
function createLead(dataIn)
{
	var returnObj = {'errmsg' : ''};
	if (dataIn != null && dataIn.type != null)
	{
		try
		{
			//Create the lead
			var leadRecord = nlapiCreateRecord('lead', {recordmode: 'dynamic'});
			leadRecord.setFieldValue('isperson', 'T');
			leadRecord.setFieldValue('custentitygd_salesautomenuoption', dataIn.type);
			
			//Go through all possible options on the lead and set them if they're defined.
			if (dataIn.currentOwner != null) leadRecord.setFieldValue('custentitygd_iscurrentowner', dataIn.currentOwner ? 1 : 2);
			if (!IsNullOrEmpty(dataIn.vin)) leadRecord.setFieldValue('custentitygd_vinnumber_contact', dataIn.vin);
			if (!IsNullOrEmpty(dataIn.email)) leadRecord.setFieldValue('email', dataIn.email);
			leadRecord.setFieldValue('firstname', dataIn.firstName);
			leadRecord.setFieldValue('lastname', dataIn.lastName);
			var fullName = dataIn.firstName + ' ' + dataIn.lastName;
			leadRecord.setFieldValue('companyname', fullName);
			leadRecord.setFieldValue('phone', dataIn.phone);
			if (!IsNullOrEmpty(dataIn.message)) leadRecord.setFieldValue('custentitygd_contactsmessage', dataIn.message);
			if (!IsNullOrEmpty(dataIn.campingStyle)) leadRecord.setFieldValue('custentitygd_contact_campingstyle', dataIn.campingStyle);
			if (!IsNullOrEmpty(dataIn.makeModelInterest)) leadRecord.setFieldValue('custentitygd_contact_makemodelintersted', dataIn.makeModelInterest);
			if (!IsNullOrEmpty(dataIn.dealerWorkingWith)) leadRecord.setFieldValue('custentitygd_contact_workingwithdealer', dataIn.dealerWorkingWith);
			if (!IsNullOrEmpty(dataIn.purchaseTimeFrame)) leadRecord.setFieldValue('custentitygd_contact_timeframe', dataIn.purchaseTimeFrame);
			if (dataIn.brochure1 != null) leadRecord.setFieldValue('custentitygd_brochureonechoice', dataIn.brochure1);
			if (dataIn.brochure2 != null) leadRecord.setFieldValue('custentitygd_brochuretwochoice', dataIn.brochure2);
			if (dataIn.make != null) leadRecord.setFieldValue('custentitygd_contact_marketingseries', dataIn.make);
			if (dataIn.model != null) leadRecord.setFieldValue('custentitygd_contact_marketingmodel', dataIn.model);
			if (dataIn.modelYear != null) leadRecord.setFieldValue('custentitygd_contact_modelyear', dataIn.modelYear);
			if (dataIn.latitude != null) leadRecord.setFieldValue('custentitygd_lead_latitude', dataIn.latitude);
			if (dataIn.longitude != null) leadRecord.setFieldValue('custentitygd_lead_longitude', dataIn.longitude);
			if (dataIn.buildInfo != null) leadRecord.setFieldValue('custentitygd_contact_custombuildinfo', dataIn.buildInfo);
			
			//Set the address
			leadRecord.selectNewLineItem('addressbook');
			leadRecord.setCurrentLineItemValue('addressbook', 'defaultshipping', 'T');
			leadRecord.setCurrentLineItemValue('addressbook', 'defaultbilling', 'T');
			leadRecord.setCurrentLineItemValue('addressbook', 'label', 'Default');
			
		    var subrecord = leadRecord.createCurrentLineItemSubrecord('addressbook', 'addressbookaddress');
		    var countryCode = convertCountryToAbbr(dataIn.country);
		    subrecord.setFieldValue('country', countryCode); //Country must be set before setting the other address fields
		    subrecord.setFieldValue('addressee', fullName);
		    subrecord.setFieldValue('addrphone', dataIn.phone);
		    subrecord.setFieldValue('addr1', dataIn.address1);
		    if (!IsNullOrEmpty(dataIn.address2)) subrecord.setFieldValue('addr2', dataIn.address2);
		    subrecord.setFieldValue('city', dataIn.city);
		    var stateCode = convertStateToAbbr(dataIn.state, countryCode);
		    if (countryCode == 'US' || countryCode == 'CA' || countryCode == 'AU')
		    {
		    	subrecord.setFieldValue('dropdownstate', stateCode);
			}
		    else
		    {
		    	//If the address is not in U.S., Canada, or Australia, use state instead of dropdownstate.
		    	subrecord.setFieldValue('state', stateCode);
		    }
		    subrecord.setFieldValue('zip', dataIn.zip);
		    subrecord.commit();
		    leadRecord.commitLineItem('addressbook');
			
			
			//Submit the lead
			nlapiSubmitRecord(leadRecord, true, true);
		}
		catch(errMsg)
		{
			returnObj.errmsg = errMsg;
		}
	}
	
	return returnObj;
}


/**
 * Gets all available Series
 * 
 * @param {Object} dataIn Parameter object
 * @returns {Array} Output object
 */
function getSeries(dataIn)
{
	var seriesResults = nlapiSearchRecord('customrecordrvsseries', null, [new nlobjSearchFilter('isinactive', null, 'is', 'F'),
	                                                                      new nlobjSearchFilter('custrecordgd_seriesshowinbuildyourown', null, 'is', 'T')], new nlobjSearchColumn('name').setSort());
	
	var returnObj = [];
	if (seriesResults != null)
	{
		for (var i = 0; i < seriesResults.length; i++)
		{
			returnObj.push({
				'id': seriesResults[i].getId(),
				'name': seriesResults[i].getValue('name')
			});
		}
	}
	return returnObj;
}

/**
 * Gets all available Series
 * 
 * @param {Object} dataIn Parameter object
 * @returns {Array} Output object
 */
function getModels(dataIn)
{
	var modelResults = nlapiSearchRecord('customrecordgd_marketingmodels', null, null, new nlobjSearchColumn('name').setSort());
	
	var returnObj = [];
	if (modelResults != null)
	{
		for (var i = 0; i < modelResults.length; i++)
		{
			returnObj.push({
				'id': modelResults[i].getId(),
				'name': modelResults[i].getValue('name')
			});
		}
	}
	return returnObj;
}

/**
 * Gets all available Series
 * 
 * @param {Object} dataIn Parameter object
 * @returns {Array} Output object
 */
function getModelYears(dataIn)
{
	var modelYearResults = nlapiSearchRecord('customrecordgd_marketingmodelyears', null, null, new nlobjSearchColumn('name').setSort());
	
	var returnObj = [];
	if (modelYearResults != null)
	{
		for (var i = 0; i < modelYearResults.length; i++)
		{
			returnObj.push({
				'id': modelYearResults[i].getId(),
				'name': modelYearResults[i].getValue('name')
			});
		}
	}
	return returnObj;
}

/**
 * Returns the 2 letter NetSuite country abbreviation for the full country name.
 * 
 * @param countryName
 */
function convertCountryToAbbr(countryName)
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
		if (countries_list[i].name.toUpperCase().contains(countryName.toUpperCase()))
			return countries_list[i].id;
	}
	return 'US';
}

/**
 * Returns the NetSuite state abbrevitiation for the full State name.
 * @param stateName
 */
function convertStateToAbbr(stateName, countryAbbr)
{
	//Need to convert the country abbreviation to the text of how the RVS Country stores the country name.
	var modifiedCountryName = '';
	if(countryAbbr == 'US')
		modifiedCountryName = 'United States';
	else if (countryAbbr == 'AU')
		modifiedCountryName = 'Australia';
	else if (countryAbbr == 'CA')
		modifiedCountryName = 'Canada';
	else if (countryAbbr == 'MX')
		modifiedCountryName = 'Mexico';
	else if (countryAbbr == 'GB')
		modifiedCountryName = 'United Kingdom';
	
	var filters = [new nlobjSearchFilter('formulanumeric', null, 'equalto', 1).setFormula("CASE WHEN UPPER({name}) like '%" + stateName.toUpperCase() + "%' THEN 1 ELSE 0 END")];
	if (modifiedCountryName.length > 0)
	{
		filters.push(new nlobjSearchFilter('name', 'custrecordrvs_state_rvscountry', 'is', modifiedCountryName));
	}
	
	var stateResult = nlapiSearchRecord('customrecordrvs_state', null, filters, new nlobjSearchColumn('custrecordrvs_state_shortname'));
	if (stateResult != null)
	{
		return stateResult[0].getValue('custrecordrvs_state_shortname');
	}
	return stateName;
}

/**
 * Returns true if the parameter is null, undefined, or an empty string
 */
function IsNullOrEmpty(item)
{
	return item == null || item == undefined || typeof(item) == undefined || item.length == 0; 
}
