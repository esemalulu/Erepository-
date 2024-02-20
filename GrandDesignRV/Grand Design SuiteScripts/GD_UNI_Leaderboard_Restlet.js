/**
 * RESTlet for getting GD University results (full results or by dealer)
 * 
 * Version    Date            Author           Remarks
 * 1.00       27 Jul 2017     brians
 *
 */

var GD_CERTIFICATION_ACHIEVEMENT = '1';

/**
 * @param {Object} dataIn Parameter object
 * @returns {Array} Output object
 */
function GD_GetLeaderboard(dataIn) {
	
	if(dataIn != undefined)
	{
		var returnArray = [];
		
		var dealerIds = dataIn.dealerId || '';
		//Can pass in a comma-separated list of dealer ids
		if(dealerIds != '')
		{
			dealerIds = dealerIds.split(',');
		}
		var startDate = dataIn.startDate;
		var endDate = dataIn.endDate || '';
		var sortBySeries = dataIn.seriesId || '';
		var state = dataIn.state || '';
		var countryAbbrevs = dataIn.country || '';
		if(countryAbbrevs != '')
		{
			countryAbbrevs = countryAbbrevs.split(',');

			//Set our dealer parameter to be our array of dealers for the chosen countries
			dealerIds = getDealersByCountry(countryAbbrevs);
		}
		
		var userIdList = [];
		var userDictionary = {};
		
		var seriesPointsDictionary = getSeriesPointValues();
		var seriesCertPoints = getSeriesCertificationAchievementPoints();
		
		var userResultsObj = getUserIdList(seriesPointsDictionary); 	//Get an array of all enrolled users
		if(userResultsObj != undefined)
		{
			userDictionary = userResultsObj.dict;
			userIdList = userResultsObj.array;
		}
		
		//Get Achievement Points - Returns an object containing our user dictionary
		userDictionary = GetAchievementPoints(startDate, endDate, '', userDictionary, userIdList, seriesPointsDictionary);
		
		//Get Certifications & associated points - Returns an object containing our user dictionary
		userDictionary = GetCertifications(startDate, endDate, dealerIds, userDictionary, userIdList, seriesCertPoints);
		
		//Calculate Unit Sales Points
		userDictionary = CalculateUnitSalesPoints(startDate, endDate, dealerIds, userDictionary, userIdList, seriesPointsDictionary);
		
		if(userDictionary != undefined)
		{
			var seriesKeysToSortBy = '';
			//Sort & Rank by each series
			for(var seriesKey in seriesPointsDictionary)
			{
				var basePropertyName = 'series_' + seriesKey;
				//Sort by points for both the entire date range and the final month of the date range
				var seriesToDateKeys = sortDictionaryByProperty(userDictionary, basePropertyName + '_points', false);
				var seriesMonthKeys = sortDictionaryByProperty(userDictionary, basePropertyName + '_monthPoints', false);
				
				//Store that ranking in the appropriate property for each item in our dictionary, using our sorted keys
				userDictionary = rankDictionaryByProperty(seriesToDateKeys, userDictionary, basePropertyName + '_rank', null);
				userDictionary = rankDictionaryByProperty(seriesMonthKeys, userDictionary, basePropertyName + '_monthRank', null);
				
				//If we're sorting by a particular series, store those keys to be used in our final sorting
				if(seriesKey != '' && seriesKey == sortBySeries)
				{
					seriesKeysToSortBy = seriesToDateKeys;
				}
			}

			//Sort and rank by overall points
			var overallKeys = sortDictionaryByProperty(userDictionary, 'totalPoints', false);
			var monthKeys = sortDictionaryByProperty(userDictionary, 'monthPoints', false);
			
			if(dealerIds != null && dealerIds.length > 0)
			{
				userDictionary = rankDictionaryByProperty(overallKeys, userDictionary, 'overallRank', null);		//We're not passing in a returnArray, so we'll just return a sortedDictionary
				userDictionary = rankDictionaryByProperty(monthKeys, userDictionary, 'monthRank', null);
				userDictionary = filterDictionaryByProperty(userDictionary, 'dealer', dealerIds);				//Filter to get the dealers we want
				overallKeys = sortDictionaryByProperty(userDictionary, 'totalPoints', false);
			}
			if(state != '') {
				userDictionary = rankDictionaryByProperty(overallKeys, userDictionary, 'overallRank', null);
				userDictionary = rankDictionaryByProperty(monthKeys, userDictionary, 'monthRank', null);
				userDictionary = filterDictionaryByProperty(userDictionary, 'state', state);					//Filter to get the state we want
				overallKeys = sortDictionaryByProperty(userDictionary, 'totalPoints', false);
			}
			if(dealerIds == '' && state == '')
			{
				userDictionary = rankDictionaryByProperty(overallKeys, userDictionary, 'overallRank', null);
				userDictionary = rankDictionaryByProperty(monthKeys, userDictionary, 'monthRank', null);
				overallKeys = sortDictionaryByProperty(userDictionary, 'totalPoints', false);
			}
			//In these rank calls, we pass in our return array so we can actually add our ranked & sorted objects
			if(sortBySeries != '')
				returnArray = rankDictionaryByProperty(seriesKeysToSortBy, userDictionary, null, returnArray);		//Return an array sorted by the desired series
			else
				returnArray = rankDictionaryByProperty(overallKeys, userDictionary, null, returnArray);				//Return a sorted array of objects

		}
		return returnArray;
	}
}

function getUserIdList(seriesPointsDict)
{
	var returnArray = [];
	var returnDict = {};
	
	var userFilters = [];
	userFilters.push(new nlobjSearchFilter('custentitygd_uni_isactive', null, 'is', 'T'));
	
	var userCols = [];
	userCols.push(new nlobjSearchColumn('entityid'));
	userCols.push(new nlobjSearchColumn('company'));
	userCols.push(new nlobjSearchColumn('shipstate', 'company'));
	userCols.push(new nlobjSearchColumn('shipcountry', 'company'));
	
	var userResults = GetSteppedSearchResults('contact', userFilters, userCols, null);
	if(userResults != null && userResults.length > 0)
	{
		//Create a spot in the user dictionary for each user
		for(var i = 0; i < userResults.length; i++)
		{
			var userId = userResults[i].getId();
			returnArray.push("" + userId);

			var userObj = {};
			userObj.userId = userId;
			userObj.userName = userResults[i].getValue('entityid');
			userObj.totalPoints = 0;
			userObj.monthPoints = 0;
			userObj.monthRank = 0;
			userObj.certifications = [];
			
			//Create properties for each of our series
			for(var seriesIdKey in seriesPointsDict)
			{
				userObj["series_" + seriesIdKey + "_points"] = 0;
				userObj["series_" + seriesIdKey + "_salesCount"] = 0;
				userObj["series_" + seriesIdKey + "_monthPoints"] = 0;
				userObj["series_" + seriesIdKey + "_monthRank"] = 0;
				userObj["series_" + seriesIdKey + "_monthSalesCount"] = 0;
				userObj["series_" + seriesIdKey + "_rank"] = 0;
			}
			
			var theDealerId = userResults[i].getValue('company') || '';
			if(theDealerId != '')
			{
				userObj.dealer = {id: theDealerId, name: userResults[i].getText('company')};
				userObj.state = userResults[i].getValue('shipstate', 'company');
				userObj.country = userResults[i].getValue('shipcountry', 'company');
			}
			
			returnDict[userId] = userObj;
		}
	}

	return {dict: returnDict, array: returnArray};
}

/**
 * GetAchievementPoints - Gets all contact achievement records within the given date range,
 * and creates an object in our dictionary for each contact.  Sets other relevant data on each contact object
 * 
 * @param {String} startDate - date formatted MM/DD/YYYY
 * @param {String} endDate - date formatted MM/DD/YYYY
 * @param {String} dealerIds
 * @param {Object} dictionary to store users
 * @param {Array} array to store users with achievements
 * @param {Object} dictionary to store series point values
 * @returns {Object} object containing our user dictionary, along with a array of users with achievements
 */
function GetAchievementPoints(startDate, endDate, dealerIds, userDict, idList, seriesPointsDict)
{
	var userId = '';
	try
	{
		var filters = [];
		filters.push(new nlobjSearchFilter('custrecordgd_contactach_date', null, 'onorafter', startDate));
		filters.push(new nlobjSearchFilter('custrecordgd_contactachievement_contact', null, 'anyof', idList));
		filters.push(new nlobjSearchFilter('isinactive', null, 'is', 'F'));
		filters.push(new nlobjSearchFilter('custentitygd_uni_isactive', 'custrecordgd_contactachievement_contact', 'is', 'T'));
		if(endDate != '')
			filters.push(new nlobjSearchFilter('custrecordgd_contactach_date', null, 'onorbefore', endDate));
		if(dealerIds != '')
			filters.push(new nlobjSearchFilter('company', 'custrecordgd_contactachievement_contact', 'anyof', dealerIds));
		
		var columns = [];
		columns.push(new nlobjSearchColumn('custrecordgd_contactachievement_contact').setSort(true));
		columns.push(new nlobjSearchColumn('entityid', 'custrecordgd_contactachievement_contact'));
		columns.push(new nlobjSearchColumn('company', 'custrecordgd_contactachievement_contact'));
		columns.push(new nlobjSearchColumn('custrecordgd_achievement_points', 'custrecordgd_contactach_achievement'));
		columns.push(new nlobjSearchColumn('custentitygd_uni_isactive', 'custrecordgd_contactachievement_contact'));
		
		//Get this user's achievements from the start date through the end date (if end date is null, use today's date)
		var achievements = GetSteppedSearchResults('customrecordgd_contactachievement', filters, columns);
		if(achievements != null && achievements.length > 0)
		{
			for(var i = 0; i < achievements.length; i++)
			{
				userId = achievements[i].getValue('custrecordgd_contactachievement_contact');
				
				//Our dictionary should already create an object for this user, indexed by userId
				if(userDict[userId] != null)
				{
					//We already have this user in our dictionary, so add these new points
					userDict[userId].totalPoints += ConvertNSFieldToInt(achievements[i].getValue('custrecordgd_achievement_points', 'custrecordgd_contactach_achievement'));
				}
			}
		}
		//Return our updated dictionary object
		return userDict;
	}
	catch(err)
	{
		nlapiLogExecution('error', 'Error', err.message + ' - on userId: ' + userId);
	}	
}

/**
 * GetCertifications - Gets all contact certification records within the given date range,
 * and adds the series ids to the certifications array on each contact object in our dictionary
 * 
 * @param {String} startDate - date formatted MM/DD/YYYY
 * @param {String} endDate - date formatted MM/DD/YYYY
 * @param {String} dealerIds
 * @param {Object} dictionary to store users
 * @param {Array} array to store users with achievements
 * @returns {Object} object containing our user dictionary, along with a array of users with achievements
 */
function GetCertifications(startDate, endDate, dealerIds, userDict, idList, certsPointsDict)
{
	var userId = '';
	var GD_GENERAL_CERTIFICATION = nlapiGetContext().getSetting('SCRIPT', 'custscriptgd_uni_generalcertification');
	try
	{
		var filters = [];
		filters.push(new nlobjSearchFilter('created', null, 'onorafter', startDate));
		filters.push(new nlobjSearchFilter('isinactive', null, 'is', 'F'));
		filters.push(new nlobjSearchFilter('custentitygd_uni_isactive', 'custrecordgd_contactcert_contact', 'is', 'T'));
		filters.push(new nlobjSearchFilter('custrecordgd_contactcert_contact', null, 'anyof', idList));

		if(endDate != '')
			filters.push(new nlobjSearchFilter('created', null, 'onorbefore', endDate));
		if(dealerIds != '')
			filters.push(new nlobjSearchFilter('company', 'custrecordgd_contactcert_contact', 'anyof', dealerIds));
		
		var columns = [];
		columns.push(new nlobjSearchColumn('custrecordgd_contactcert_contact').setSort(true));
		columns.push(new nlobjSearchColumn('internalid', 'custrecordgd_contactcert_series'));
		
		//Get this user's certifications from the start date through the end date
		var certs = GetSteppedSearchResults('customrecordgd_contactcertification', filters, columns);
		if(certs != null && certs.length > 0)
		{
			for(var c = 0; c < certs.length; c++)
			{
				userId = certs[c].getValue('custrecordgd_contactcert_contact');
				var seriesId = certs[c].getValue('internalid', 'custrecordgd_contactcert_series') || "GENERAL";

				//This index will be undefined if the user has no contact achievements
				if(userDict[userId] != undefined)
					userDict[userId].certifications.push(seriesId);
				
				//Add the appropriate number of points for this series' certification to the user's totalPoints
				if(certsPointsDict[seriesId] != null)
				{
					userDict[userId].totalPoints += certsPointsDict[seriesId];
					if(seriesId != "GENERAL")
						userDict[userId]["series_" + seriesId + "_points"] += certsPointsDict[seriesId];
				}
			}
		}
		return userDict;
	}
	catch(err)
	{
		nlapiLogExecution('error', 'GetCertifications Error', err.message + ' - on userId: ' + userId);
	}
}

/**
 * CalculateUnitSalesPoints - Calculates sales points by getting all unit registrations received within the date
 * range where the dealer sales rep is on our userList (i.e. has achievements in the system).  Stores these sales
 * points in the appropriate category on each contact object in our user dictionary
 * 
 * @param {String} startDate - date formatted MM/DD/YYYY
 * @param {String} endDate - date formatted MM/DD/YYYY
 * @param {String} dealerIds
 * @param {Object} dictionary to store users
 * @param {Array} array to store users with achievements
 * @param {Object} dictionary to store series point values
 * @returns {Object} Our user dictionary
 */
function CalculateUnitSalesPoints(startDate, endDate, dealerIds, userDict, idList, seriesPointsDict)
{
	var userId = '';
	var monthCutoffDate = new Date(); 	//If no end date is provided, use today's date as the cutoff date
	if(endDate != '')
		monthCutoffDate = new Date(endDate);
	
	var currentMonth = monthCutoffDate.getMonth()+1;
	var monthStartDateObj = new Date(currentMonth + '/1/' + monthCutoffDate.getFullYear());
	var monthEndDateObj = new Date((currentMonth+1) + '/1/' + monthCutoffDate.getFullYear()); 		//Back into the last day of the month by subtracting 1 from the following month
	monthEndDateObj.setDate(monthEndDateObj.getDate() - 1);
	
	var registrationCutoffDate = nlapiGetContext().getSetting('SCRIPT', 'custscriptgd_uni_registrationcutoffdate') || '7';
	registrationCutoffDate = new Date((currentMonth+1) + '/' + registrationCutoffDate + '/' + monthCutoffDate.getFullYear());
	
	try
	{
		filters = [];
		filters.push(['custrecordunitretailcustomer_retailsold', 'onorafter', startDate]);
		filters.push('AND');
		filters.push([[['custrecordunitretailcustomer_dealsalesrp', 'anyof', idList],'AND',['custrecordunitretailcustomer_dealsalesrp.custentitygd_uni_isactive', 'is', 'T']], 'OR',
		              [['custrecordunitretailcustomer_dsalesrp2', 'anyof', idList],'AND',['custrecordunitretailcustomer_dsalesrp2.custentitygd_uni_isactive', 'is', 'T']]]);
		if(endDate != '')
		{
			filters.push('AND');
			filters.push(['custrecordunitretailcustomer_retailsold', 'onorbefore', endDate]);
		}
		
		columns = [];
		columns.push(new nlobjSearchColumn('custrecordunit_series', 'custrecordunitretailcustomer_unit'));
		columns.push(new nlobjSearchColumn('custrecordunitretailcustomer_dealsalesrp'));
		columns.push(new nlobjSearchColumn('custrecordunitretailcustomer_dsalesrp2'));
		columns.push(new nlobjSearchColumn('custrecordunitretailcustomer_registrcvd'));
		columns.push(new nlobjSearchColumn('custrecordunitretailcustomer_retailsold').setSort());
		
		unitResults = GetSteppedSearchResults('customrecordrvsunitretailcustomer', filters, columns);
		
		if(unitResults != null && unitResults.length > 0)
		{
			var seriesId = '';
			for(var j = 0; j < unitResults.length; j++)
			{
				var primaryRep = unitResults[j].getValue('custrecordunitretailcustomer_dealsalesrp') || '';
				var secondaryRep = unitResults[j].getValue('custrecordunitretailcustomer_dsalesrp2') || '';
				
				var registrationReceived = unitResults[j].getValue('custrecordunitretailcustomer_registrcvd');
				var retailSold = unitResults[j].getValue('custrecordunitretailcustomer_retailsold');
				var registrationReceivedDateObj = new Date(registrationReceived);
				var retailSoldDateObj = new Date(retailSold);

				seriesId = unitResults[j].getValue('custrecordunit_series', 'custrecordunitretailcustomer_unit');
				var pointsToAward = seriesPointsDict[seriesId];
				//If there's a secondary rep on this registration, then we'll split the points between them
				if(secondaryRep != '')
				{
					pointsToAward = parseInt(pointsToAward)/2;
					
					//Award points to the secondary rep
					userId = secondaryRep;
					if(userDict[secondaryRep] != undefined)
					{
						userDict[secondaryRep]["series_" + seriesId + "_points"] += pointsToAward;
						userDict[secondaryRep]["series_" + seriesId + "_salesCount"]++;
						userDict[secondaryRep].lastSale = unitResults[j].getValue('custrecordunitretailcustomer_retailsold');
						userDict[secondaryRep].totalPoints += pointsToAward;
						//If sold within the current month and registered on or before the cutoff date
						if(retailSoldDateObj >= monthStartDateObj && retailSoldDateObj <= monthEndDateObj && registrationReceivedDateObj <= registrationCutoffDate)
						{
							userDict[secondaryRep].monthPoints += pointsToAward;
							userDict[secondaryRep]["series_" + seriesId + "_monthPoints"] += pointsToAward;
							userDict[secondaryRep]["series_" + seriesId + "_monthSalesCount"]++;
						}
					}
				}
				
				//Award points to the primary rep
				userId = primaryRep;
				if(userDict[primaryRep] != undefined)
				{
					userDict[primaryRep]["series_" + seriesId + "_points"] += pointsToAward;
					userDict[primaryRep]["series_" + seriesId + "_salesCount"]++;
					userDict[primaryRep].lastSale = unitResults[j].getValue('custrecordunitretailcustomer_retailsold');
					userDict[primaryRep].totalPoints += pointsToAward;
					//If sold within the current month and registered on or before the cutoff date
					if(retailSoldDateObj >= monthStartDateObj && retailSoldDateObj <= monthEndDateObj && registrationReceivedDateObj <= registrationCutoffDate)
					{
						userDict[primaryRep].monthPoints += pointsToAward;
						userDict[primaryRep]["series_" + seriesId + "_monthPoints"] += pointsToAward;
						userDict[primaryRep]["series_" + seriesId + "_monthSalesCount"]++;
					}
				}
			}
		}
		return userDict;
	}
	catch(err)
	{
		nlapiLogExecution('error', 'CalculateUnitSalesPoints Error', err.message + ' - on userId: ' + userId);
	}	
}

/**
 * Sorts a dictionary by a given property, and returns an array of indices
 * @param [Object] dictionary
 * @param [String] property
 * @param [Boolean] isAscending (optional) - By default, sort by descending
 */
function sortDictionaryByProperty(dictionary, property, isAscending)
{
	var dictKeys = Object.keys(dictionary);
	if(isAscending)
	{
		dictKeys.sort(function(a,b) {
			var comparison = dictionary[a][property] - dictionary[b][property];
			//In the case of ties, give it to the user who made the sale first.  If no sale, go by id.
			if(comparison == 0){
				if(dictionary[a].lastSale == undefined) {
					if(dictionary[b].lastSale == undefined)
						return dictionary[b].userId - dictionary[a].userId; //Both don't have any sales, so sort by Id
					else
						return 1; //Contact a doesn't have any sales, so sort contact b higher (i.e. b comes first)
				}
				else if(dictionary[b].lastSale == undefined)
					return -1; //Contact b doesn't have any sales, so sort contact a higher (i.e. a comes first)
				else //Both have sales, so sort by that
				{
					return ((new Date(dictionary[a].lastSale)) - (new Date(dictionary[b].lastSale)));
				}
			}
		    return comparison;
		});
	}
	else
	{
		dictKeys.sort(function(a,b) {
			var comparison = dictionary[a][property] - dictionary[b][property];
			//In the case of ties, give it to the user who made the sale first.  If no sale, go by id.
			if(comparison == 0){
				if(dictionary[a].lastSale == undefined) {
					if(dictionary[b].lastSale == undefined)
						return dictionary[b].userId - dictionary[a].userId; //Both don't have any sales, so sort by Id
					else
						return 1; //Contact a doesn't have any sales, so sort contact b higher (i.e. b comes first)
				}
				else if(dictionary[b].lastSale == undefined)
					return -1; //Contact b doesn't have any sales, so sort contact a higher (i.e. a comes first)
				else //Both have sales, so sort by that
				{
					return ((new Date(dictionary[a].lastSale)) - (new Date(dictionary[b].lastSale)));
				}
			}
		    return comparison;
		}).reverse();
	}
	return dictKeys;
}

/**
 * Ranks a dictionary by a given property, and returns the dictionary.
 * Or, if a returnArray is passed in, will add our ranked dictionary items to that array. (We'll only do that once, the final time)
 * 
 * @param [Array] an array of indices.  The dictionary indices will be sorted to match the order of this array
 * @param [Object] dictionary
 * @param [String] property
 * @param [Array] ArrayToReturn (optional) - Give an array if this is our last sort, so we can actually add our dictionary items to our final array.
 */
function rankDictionaryByProperty(sortedArray, dictionary, propertyToSet, arrayToReturn)
{
	for(var n = 0; n < sortedArray.length; n++)
	{
		var key = sortedArray[n];
		if(propertyToSet != null)
			dictionary[key][propertyToSet] = n+1;
		
		if(arrayToReturn != null && dictionary[key] != null)
			arrayToReturn.push(dictionary[key]);
	}
	if(arrayToReturn != null)
		return arrayToReturn;
	else
		return dictionary;
}

function filterDictionaryByProperty(dictionary, property, anyOfValues, arrayToReturn)
{
	var dictKeys = Object.keys(dictionary);
	var dictToReturn = {};
	var filteredKeys = dictKeys.filter(function(userId){
		var valToFilter = dictionary[userId][property];
		if(valToFilter != null)
		{
			if(valToFilter.id != null)
				valToFilter = valToFilter.id;
			//Only return those objects who have a property in the anyOfValues array passed in
			if(anyOfValues.indexOf(valToFilter) != -1){
				if(arrayToReturn != null)
				{
					arrayToReturn.push(dictionary[userId]);
				}
				else
				{
					dictToReturn[userId] = dictionary[userId];
				}
				return true;
			}
			else
				return false;
		}
	});
	if(arrayToReturn != null)
		return arrayToReturn;
	return dictToReturn;
}

function getSeriesPointValues()
{
	var returnObj = {};
	seriesResults = nlapiSearchRecord('customrecordrvsseries', null, new nlobjSearchFilter('isinactive', null, 'is', 'F'), new nlobjSearchColumn('custrecordgd_series_points'));
	
	if(seriesResults != null && seriesResults.length > 0)
	{
		var seriesId = '';
		for(var s = 0; s < seriesResults.length; s++)
		{
			seriesId = seriesResults[s].getId();
			returnObj[seriesId] = ConvertNSFieldToInt(seriesResults[s].getValue('custrecordgd_series_points'));
		}
	}
	return returnObj;
}

/**
 * This function returns a dictionary containing the point values defined on the GD Achievements of Type "Certification"
 */
function getSeriesCertificationAchievementPoints()
{
	var returnObj = {};
	
	var seriesDict = {};
	seriesResults = nlapiSearchRecord('customrecordrvsseries', null, new nlobjSearchFilter('isinactive', null, 'is', 'F'), new nlobjSearchColumn('custrecordgd_series_certificationcode'));
	
	if(seriesResults != null && seriesResults.length > 0)
	{
		var series = '';
		for(var s = 0; s < seriesResults.length; s++)
		{
			series = seriesResults[s].getId();
			seriesCode = seriesResults[s].getValue('custrecordgd_series_certificationcode');
			seriesDict[seriesCode] = series;
		}
	}
	
	var filters = [];
	filters.push(new nlobjSearchFilter('custrecordgd_achievement_type', null, 'anyof', [GD_CERTIFICATION_ACHIEVEMENT]));
	
	var columns = [];
	columns.push(new nlobjSearchColumn('custrecordgd_achievement_points'));
	columns.push(new nlobjSearchColumn('custrecordgd_achievement_code'));
	
	certResults = GetSteppedSearchResults('customrecordgd_achievement', filters, columns, null);
	
	if(certResults != null && certResults.length > 0)
	{
		for(var c = 0; c < certResults.length; c++)
		{
			var code = certResults[c].getValue('custrecordgd_achievement_code');
			var points = ConvertNSFieldToInt(certResults[c].getValue('custrecordgd_achievement_points'));
			if(seriesDict[code] != null)
			{
				var seriesId = seriesDict[code];
				returnObj[seriesId] = points;
			}
		}
	}
	var GD_GENERAL_CERTIFICATION = nlapiGetContext().getSetting('SCRIPT', 'custscriptgd_uni_generalcertification');
	returnObj["GENERAL"] = ConvertNSFieldToInt(nlapiLookupField('customrecordgd_achievement', GD_GENERAL_CERTIFICATION, 'custrecordgd_achievement_points'));
	return returnObj;
}

function getDealersByCountry(countries) {
	var dealers = [];
	
	var dealerFils = [];
	dealerFils.push(new nlobjSearchFilter('country', null, 'anyof', countries));
	dealerFils.push(new nlobjSearchFilter('custentityrvscreditdealer', null, 'is', 'F'));
	dealerFils.push(new nlobjSearchFilter('isinactive', null, 'is', 'F'));
	dealerFils.push(new nlobjSearchFilter('custentityrvsdealertype', null, 'anyof', ['10']));

	var dealerResults = GetSteppedSearchResults('customer', dealerFils, [new nlobjSearchColumn('shipcountry')], null);
	if(dealerResults != null && dealerResults.length > 0)
	{
		for(var d = 0; d < dealerResults.length; d++)
		{
			var shipCountry = dealerResults[d].getValue('shipcountry');
			if(countries.indexOf(shipCountry) != -1)
				dealers.push(dealerResults[d].getId());
		}
	}
	
	return dealers;
}
