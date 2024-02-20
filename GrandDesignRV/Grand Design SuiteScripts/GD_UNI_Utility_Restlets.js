/**
 * Various RESTlets to be used for the GD University site
 * 
 * Version    Date            Author           Remarks
 * 1.00       28 Jul 2017     brians
 *
 */

var GD_ENROLLMENT_ACHIEVEMENT = '19';

var GD_ROLE_STANDARD = '1';
var GD_ROLE_DEALERSHIP_MANAGER = '2';

/**
 * @param {Object} dataIn Parameter object
 * @returns {Object} Output object
 */
function GD_GetUnitSalesByMonth(dataIn) {
	
	if(dataIn != undefined)
	{
		var returnObj = {};
		returnObj.months = [];
		
		var userId = dataIn.userId || '';
		var startDate = dataIn.startDate || '';
		var endDate = dataIn.endDate || '';
		if(endDate == '')
		{
			endDate = new Date();
			endDate = (endDate.getMonth() + 1) + '/' + endDate.getDate() + '/' + endDate.getFullYear();
		}
		
		if(userId != '' && startDate != '')
		{
			var months = {};
			
			var seriesPointsDictionary = getSeriesPointValues(); 		//This method is defined in GD_UNI_Leaderboard_Restlets.js
			
			filters = [];
			filters.push(new nlobjSearchFilter('custrecordunitretailcustomer_dealsalesrp', null, 'anyof', userId));
			filters.push(new nlobjSearchFilter('custrecordunitretailcustomer_retailsold', null, 'onorafter', startDate));
			if(endDate != '')
				filters.push(new nlobjSearchFilter('custrecordunitretailcustomer_retailsold', null, 'onorbefore', endDate));
			
			columns = [];
			columns.push(new nlobjSearchColumn('custrecordunit_series', 'custrecordunitretailcustomer_unit'));
			columns.push(new nlobjSearchColumn('custrecordunitretailcustomer_dealsalesrp'));
			columns.push(new nlobjSearchColumn('custrecordunitretailcustomer_retailsold').setSort(false));
			
			unitResults = nlapiSearchRecord('customrecordrvsunitretailcustomer', null, filters, columns);
			if(unitResults != null && unitResults.length > 0)
			{
				var seriesId = '';
				months = getMonthsBetweenDates(startDate, endDate, seriesPointsDictionary);
				
				//Create properties for each of our series
				for(var seriesIdKey in seriesPointsDictionary)
				{
					returnObj["series_" + seriesIdKey + "_totalSalesCount"] = 0;
				}

				//Loop through our search results and get the sales counts
				for(var j = 0; j < unitResults.length; j++)
				{
					var saleDate = unitResults[j].getValue('custrecordunitretailcustomer_retailsold');
					if(saleDate != null)
					{
						seriesId = unitResults[j].getValue('custrecordunit_series', 'custrecordunitretailcustomer_unit');
						saleDate = new Date(saleDate);
						
						var saleMonthIndex = saleDate.getMonth();
						var saleYearIndex = saleDate.getFullYear();
						
						var index = saleMonthIndex + '-' + saleYearIndex;
						
						//Increment our sale count for this particular month
						if(months[index] != null)
							months[index]["series_" + seriesId + "_salesCount"]++;
						
					}
					//Increment our total sales count for this series
					returnObj["series_" + seriesId + "_totalSalesCount"]++;
				}
				
				var sortedMonths = sortDictionaryByProperty(months, 'index', true);
				for(var s = 0; s < sortedMonths.length; s++)
				{
					var indexToReturn = sortedMonths[s];
					delete months[indexToReturn].index; //We don't need to return this index, we just used it to sort our dictionary
					returnObj.months.push(months[indexToReturn]);
				}
			}
		}
		
		return returnObj;
	}
}

/**
 * 
 * @param {Object} dataIn Parameter object
 * @returns {Array} Output object
 */
function GD_GetSeries(dataIn) {
	var returnArray = [];
	
	var filters = [];
	filters.push(new nlobjSearchFilter('isinactive', null, 'is', 'F'));
	
	var columns = [];
	columns.push(new nlobjSearchColumn('name'));
	
	 var results = nlapiSearchRecord('customrecordrvsseries', null, filters, columns);
	 
	 if(results != null && results.length > 0)
	 {
		 var seriesObj = '';
		 for(var i = 0; i < results.length; i++)
		 {
			 seriesObj = {};
			 seriesObj.seriesId = results[i].getId();
			 seriesObj.seriesName = results[i].getValue('name');
			 
			 returnArray.push(seriesObj);
		 }
	 }
	 
	 return returnArray;
}

/**
 * 
 * @param {Object} dataIn Parameter object
 * @returns {Array} Output object
 */
function GD_GetDealerList(dataIn) {
	var returnArray = [];
	
	var dealerId = dataIn.dealerId || '';
	
	var filters = [];
	filters.push(new nlobjSearchFilter('isinactive', null, 'is', 'F'));
	filters.push(new nlobjSearchFilter('custentityrvscreditdealer', null, 'is', 'F'));
	filters.push(new nlobjSearchFilter('custentityrvsdealertype', null, 'anyof', ['10']));
	if(dealerId != '')
		filters.push(new nlobjSearchFilter('internalid', null, 'anyof', [dealerId]));
	
	var columns = [];
	columns.push(new nlobjSearchColumn('entityid'));
	columns.push(new nlobjSearchColumn('companyname'));
	columns.push(new nlobjSearchColumn('shipstate').setSort(true));
	
	 var results = nlapiSearchRecord('customer', null, filters, columns);
	 
	 if(results != null && results.length > 0)
	 {
		 var dealerObj = '';
		 for(var i = 0; i < results.length; i++)
		 {
			 dealerObj = {};
			 dealerObj.dealerId = results[i].getId();
			 dealerObj.dealerName = results[i].getValue('companyname');
			 dealerObj.state = results[i].getValue('shipstate');
			 
			 returnArray.push(dealerObj);
		 }
	 }
	 
	 return returnArray;
}

/**
 * 
 * @param {Object} dataIn Parameter object
 * @returns {String} Output object
 */
function GD_GetUser(dataIn) {
	var returnObj = {};
	returnObj.id = '';
	
	var dealerId = dataIn.dealerId || '';
	var emailAddress = dataIn.emailAddress || '';
	var userId = dataIn.userId || '';
	
	var filters = [];
	if(dealerId != '')
		filters.push(new nlobjSearchFilter('company', null, 'anyof', dealerId));
	if(emailAddress != '')
		filters.push(new nlobjSearchFilter('email', null, 'is', emailAddress));
	if(userId != '')
		filters.push(new nlobjSearchFilter('internalid', null, 'anyof', userId));
	
	var columns = [];
	columns.push(new nlobjSearchColumn('firstname'));
	columns.push(new nlobjSearchColumn('lastname'));
	columns.push(new nlobjSearchColumn('entityid'));
	columns.push(new nlobjSearchColumn('custentitygd_uni_role'));
	columns.push(new nlobjSearchColumn('custentitygd_uni_isactive'));

	
	 var results = nlapiSearchRecord('contact', null, filters, columns);
	 
	 if(results != null && results.length > 0)
	 {
		 //There should only be one result
		 returnObj.id = results[0].getId();
		 returnObj.name = results[0].getValue('entityid');
		 returnObj.firstname = results[0].getValue('firstname');
		 returnObj.lastname = results[0].getValue('lastname');
		 returnObj.isActive = results[0].getValue('custentitygd_uni_isactive');
		 if(returnObj.isActive == 'T')
			 returnObj.isActive = true;
		 else
			 returnObj.isActive = false;
		 returnObj.role = results[0].getValue('custentitygd_uni_role');
	 }
	 
	 return returnObj;
}

/**
 * 
 * @param {Object} dataIn Parameter object
 * @returns {String} Output object
 */
function GD_DealerInfo(dataIn) {
	var returnObj = {};
	returnObj.staff = [];
	returnObj.dealershipManagers = [];
	
	var dealerId = dataIn.dealerId || '';
	var includeInactive = dataIn.includeInactive || 'false';
	if(dealerId != '')
	{
		var dealerRec = '';
		
		try {
			dealerRec = nlapiLoadRecord('customer', dealerId) || '';
			if(dealerRec != '')
			{
				returnObj.name = dealerRec.getFieldValue('companyname');
				returnObj.state = dealerRec.getFieldValue('shipstate');
				returnObj.phone = dealerRec.getFieldValue('phone');
				var gdMgrs = getGDSalesRepsByDealer(dealerId);

				returnObj.gdManager = gdMgrs;
				
				var filters = [];
				filters.push(new nlobjSearchFilter('company', null, 'anyof', dealerId));
				filters.push(new nlobjSearchFilter('company', null, 'noneof', ['@NONE@']));
				if(includeInactive == 'false')
					filters.push(new nlobjSearchFilter('custentitygd_uni_isactive', null, 'is', 'T'));
				
				var columns = [];
				columns.push(new nlobjSearchColumn('internalid').setSort());
				columns.push(new nlobjSearchColumn('entityid'));
				columns.push(new nlobjSearchColumn('firstname'));
				columns.push(new nlobjSearchColumn('lastname'));
				columns.push(new nlobjSearchColumn('email'));
				columns.push(new nlobjSearchColumn('custentitygd_uni_role'));
				columns.push(new nlobjSearchColumn('custentitygd_uni_isactive'));
				
				 var results = nlapiSearchRecord('contact', null, filters, columns);
				 
				 if(results != null && results.length > 0)
				 {
					 for(var c = 0; c < results.length; c++)
					 {
						 var contactObj = {};
						 contactObj.id = results[c].getId();
						 contactObj.name = results[c].getValue('entityid');
						 contactObj.firstname = results[c].getValue('firstname');
						 contactObj.lastname = results[c].getValue('lastname');
						 contactObj.email = results[c].getValue('email');
						 contactObj.role = results[c].getValue('custentitygd_uni_role');
						 contactObj.active = results[c].getValue('custentitygd_uni_isactive');
						 if(contactObj.active == 'T')
							 contactObj.active = true;
						 else
							 contactObj.active = false;
						 if(contactObj.role == GD_ROLE_DEALERSHIP_MANAGER)
						 {
							 contactObj.isManager = true;
							 returnObj.dealershipManagers.push(contactObj);
						 }
						 else
							 contactObj.isManager = false;
						 
						 returnObj.staff.push(contactObj);
					 }
				 }
			}
		}
		catch(err) {
			nlapiLogExecution('error', err.getCode(), 'Error getting info for dealer Id: ' + dealerId);
		}
	}
	 
	 return returnObj;
}

function getDealersByGDManager(dataIn) {
	var returnObj = {};
	returnObj.dealers = [];
	
	var dealerDict = {};
	
	var managerId = dataIn.managerId || '';
	var includeInactive = dataIn.includeInactive || 'false';
	var getFullData = dataIn.fullData || 'false';
	var adminMode = dataIn.admin || 'false'; 	//adminMode returns all dealers, and ignores whatever managerid is passed in.

	
	var totalRepCount = 0;
	
	var dealers = [];
	
	if(managerId != '')
	{
		if(adminMode != 'false')
			dealers = getDealersByGDSalesRep('');
		else
			dealers = getDealersByGDSalesRep(managerId);
		
		if(dealers.length > 0)
		{
			for(var q = 0; q < dealers.length; q++)
			{
				var dealerObj = {};
				dealerObj.id = dealers[q];
				dealerObj.name = nlapiLookupField('customer', dealerObj.id, 'companyname');
				dealerObj.region = nlapiLookupField('customer', dealerObj.id, 'shipstate');
				if(getFullData != 'false')
				{
					dealerObj.totalReps = 0;
					dealerObj.activeReps = 0;
					dealerObj.managers = [];
				}
				dealerDict[dealerObj.id] = dealerObj;
			}
			
			var filters = [];
			filters.push(new nlobjSearchFilter('company', null, 'anyof', dealers));
			filters.push(new nlobjSearchFilter('custentityrvsisdealersalesrep', null, 'is', 'T'));
			filters.push(new nlobjSearchFilter('isinactive', null, 'is', 'F'));

			if(includeInactive == 'false')
				filters.push(new nlobjSearchFilter('custentitygd_uni_isactive', null, 'is', 'T'));
			
			var columns = [];
			columns.push(new nlobjSearchColumn('company'));
			
			if(getFullData != 'false')
			{
				columns.push(new nlobjSearchColumn('custentitygd_uni_isactive'));
				columns.push(new nlobjSearchColumn('custentitygd_uni_role'));
				columns.push(new nlobjSearchColumn('entityid'));
			}
			
			var results = GetSteppedSearchResults('contact', filters, columns, null);
			if(results != null && results.length > 0)
			{
				totalRepCount = results.length;
				for(var d = 0; d < results.length; d++)
				{
					var dealerId = results[d].getValue('company');
					var dealerObj = dealerDict[dealerId];
						
					if(getFullData != 'false' && dealerObj != undefined)
					{
						dealerObj.totalReps++;
						var isRegistered = results[d].getValue('custentitygd_uni_isactive');
						if(isRegistered == 'T')
							dealerObj.activeReps++;
						dealerObj.percentage = ((dealerObj.activeReps/dealerObj.totalReps)*100).toFixed(2);
						var gdUniversityRole = results[d].getValue('custentitygd_uni_role') || '';
						if(gdUniversityRole == GD_ROLE_DEALERSHIP_MANAGER)
							dealerObj.managers.push(results[d].getValue('entityid'));
						gdUniversityRole = 0;
					}
					dealerDict[dealerId] = dealerObj;
				}
			}
		}
	}
	//Add each item in our dictionary to an array, which will be returned.
	for(key in dealerDict)
	{
		returnObj.dealers.push(dealerDict[key]);
	}

	var seriesDictionary = {};
	
	//Generate some stats on how many users for this GD manager has received the certifications for each brand.
	var seriesResults = nlapiSearchRecord('customrecordrvsseries', null, new nlobjSearchFilter('isinactive', null, 'is', 'F'), new nlobjSearchColumn('custrecordgd_series_certificationcode'));
	if(seriesResults != null && seriesResults.length > 0)
	{
		var series = '';
		for(var s = 0; s < seriesResults.length; s++)
		{
			series = seriesResults[s].getId();
			seriesCode = seriesResults[s].getValue('custrecordgd_series_certificationcode');
			seriesDictionary[seriesCode] = series;
		}
	}
	var seriesCount = 0;
	var masterCertificationCount = 0;
	for(key in seriesDictionary)
	{
		var obj = {};
		obj.certifiedReps = 0;
		obj.certifiedPercentage = 0;
		seriesDictionary[key] = obj;
		seriesCount++;
	}
	if(getFullData != 'false' && dealers.length > 0)
	{
		//Search over existing certifications to count the number of brand certifications for users belonging to this GD Rep.
		//Also, count the number of users with Master certifications (meaning certified in everything)
		var certFilters = [];
		certFilters.push(new nlobjSearchFilter('isinactive', null, 'is', 'F'));
		certFilters.push(new nlobjSearchFilter('company', 'custrecordgd_contactcert_contact', 'anyof', dealers));
		var certColumns = [];
		certColumns.push(new nlobjSearchColumn('custrecordgd_contactcert_series'));
		certColumns.push(new nlobjSearchColumn('custrecordgd_series_certificationcode', 'custrecordgd_contactcert_series'));
		certColumns.push(new nlobjSearchColumn('custrecordgd_contactcert_contact').setSort());
		var certRes = nlapiSearchRecord('customrecordgd_contactcertification', null, certFilters, certColumns);
		
		if(certRes != null && certRes.length > 0)
		{
			var repId = '';
			var oldRepId = '';
			var tempMasterCount = 0;
			for(var c = 0; c < certRes.length; c++)
			{
				//Results are sorted by user, so if the number of results for a given user is equal to the number of series, they're a master.
				repId = certRes[c].getValue('custrecordgd_contactcert_contact');
				if(repId == oldRepId)
				{
					tempMasterCount++;
					if(tempMasterCount == seriesCount)
					{
						masterCertificationCount++;
					}
				}
				else
					tempMasterCount = 0;
				//Increment the appropriate series certification count
				var seriesId = certRes[c].getValue('custrecordgd_series_certificationcode', 'custrecordgd_contactcert_series');
				if(seriesDictionary[seriesId] != undefined)
				{
					var seriesObj = seriesDictionary[seriesId];
					seriesObj.certifiedReps++;
					seriesDictionary[seriesId] = seriesObj;
				}
				oldRepId = repId;
			}
		}
	}
	for(key in seriesDictionary)
	{
		var obj = seriesDictionary[key];
		if(isNaN(obj.certifiedReps/totalRepCount) == false)
			obj.certifiedPercentage = ((obj.certifiedReps/totalRepCount)*100).toFixed(2);
		seriesDictionary[key] = obj;
	}
	var masterObj = {};
	masterObj.certifiedReps = masterCertificationCount;
	if(isNaN(masterCertificationCount/totalRepCount) == false)
		masterObj.certifiedPercentage = ((masterCertificationCount/totalRepCount)*100).toFixed(2);
	else
		masterObj.certifiedPercentage = 0;
	seriesDictionary["MASTER"] = masterObj;
	returnObj.certifications = seriesDictionary;
	returnObj.totalReps = totalRepCount;
		
	return returnObj;
}

function getDealersByGDSalesRep(gdSalesRepId) {
	
	var returnArray = [];
	
	var dealerFils = [];
	dealerFils.push(new nlobjSearchFilter('custrecordrvs_salesrepbyseries_dealer', null, 'noneof', ['@NONE@']));
	//gdSalesRepId will be an empty string when in admin mode, so all dealers will be returned
	if(gdSalesRepId != '')
		dealerFils.push(new nlobjSearchFilter('custrecordrvs_salesrepbyseries_salesrep', null, 'anyof', gdSalesRepId));
	
	var dealerCols = [];
	dealerCols.push(new nlobjSearchColumn('custrecordrvs_salesrepbyseries_dealer', null, 'group'));
	
	var res = nlapiSearchRecord('customrecordrvs_salesrepbyseries', null, dealerFils , dealerCols);
	if(res != null && res.length > 0)
	{
		for(var r = 0; r < res.length; r++)
		{
			returnArray.push('' + res[r].getValue('custrecordrvs_salesrepbyseries_dealer', null, 'group'));
		}
	}
	return returnArray;
}

function getGDSalesRepsByDealer(dealerId) {
	
	var returnArray = [];
	
	var dealerIds = getDealerGroupDealersArray(dealerId);
	var dealerState = nlapiLookupField('customer', dealerId, 'shipstate') || '';
	
	var dealerFils = [];
	dealerFils.push(new nlobjSearchFilter('custrecordrvs_salesrepbyseries_dealer', null, 'anyof', dealerIds));
	dealerFils.push(new nlobjSearchFilter('formulatext', null, 'is', dealerState).setFormula('{custrecordrvs_salesrepbyseries_dealer.shipstate}'));
	if(dealerState != '')
		dealerFils.push(new nlobjSearchFilter('state', 'custrecordrvs_salesrepbyseries_dealer', 'anyof', dealerState));
	
	
	var dealerCols = [];
	dealerCols.push(new nlobjSearchColumn('custrecordrvs_salesrepbyseries_salesrep'));
	dealerCols.push(new nlobjSearchColumn('entityid', 'custrecordrvs_salesrepbyseries_salesrep'));
	dealerCols.push(new nlobjSearchColumn('email', 'custrecordrvs_salesrepbyseries_salesrep'));
	dealerCols.push(new nlobjSearchColumn('state', 'custrecordrvs_salesrepbyseries_dealer'));
	dealerCols.push(new nlobjSearchColumn('internalid', 'custrecordrvs_salesrepbyseries_dealer').setSort());

	var salesRepDict = {};
	
	var res = nlapiSearchRecord('customrecordrvs_salesrepbyseries', null, dealerFils , dealerCols);
	if(res != null && res.length > 0)
	{
		for(var r = 0; r < res.length; r++)
		{
			var salesRepId = res[r].getValue('custrecordrvs_salesrepbyseries_salesrep');
			if(salesRepDict[salesRepId] == null)
			{
				var salesRepObj = {};
				salesRepObj.id = salesRepId;
				salesRepObj.name = res[r].getValue('entityid', 'custrecordrvs_salesrepbyseries_salesrep');
				salesRepObj.email = res[r].getValue('email', 'custrecordrvs_salesrepbyseries_salesrep');
				salesRepDict[salesRepId] = salesRepObj;

			}
		}
	}
	for(key in salesRepDict)
	{
		returnArray.push(salesRepDict[key]);
	}
	return returnArray;
}

function getContactsByName(dataIn) {
	
	var returnObj = {};
	returnObj.contacts = [];
	
	var lastName = dataIn.lastName;
	var dealerId = dataIn.dealerId || '';
	
	var filters = [];
	filters = [['lastname', 'is', lastName], "AND",
				['custentityrvsisdealersalesrep', 'is', 'T'], "AND",
				['custentitygd_uni_isactive', 'is', 'F']];
	if(dealerId != '')
	{
		var dealerGroupDealers = getDealerGroupDealersArray(dealerId);
		filters.push("AND");
		filters.push(['company', 'anyof', dealerGroupDealers]);
	}
	
	
	var columns = [];
	columns.push(new nlobjSearchColumn('entityid'));
	columns.push(new nlobjSearchColumn('email'));
	columns.push(new nlobjSearchColumn('company'));
	
	var results = nlapiSearchRecord('contact', null, filters, columns);
	if(results != null && results.length > 0)
	{
		for(var i = 0; i < results.length; i++)
		{
			var contactObj = {};
			contactObj.id = results[i].getId();
			contactObj.name = results[i].getValue('entityid');
			contactObj.email = results[i].getValue('email') || '';
			contactObj.dealerId = results[i].getValue('company');
			returnObj.contacts.push(contactObj);
		}
	}
	
	return returnObj;
}

function getDealerGroupDealersRestlet(dataIn) {
	
	var returnObj = {};
	returnObj.dealers = [];
	
	var dealerId = dataIn.dealerId || '';
	
	//Get the dealer's group.  If there is one, add its members to the vinDealers array
	var dealerGroupId = ConvertNSFieldToString(nlapiLookupField('customer', dealerId, 'custentitygd_dealergroup', false));
	if(dealerGroupId != '')
	{
		var cols = [];
		cols.push(new nlobjSearchColumn('companyname'));
		
		var filters = [];
		filters.push(new nlobjSearchFilter('custentitygd_dealergroup', null, 'anyof', dealerGroupId));
		filters.push(new nlobjSearchFilter('custentityrvscreditdealer', null, 'is', 'F'));
		filters.push(new nlobjSearchFilter('isinactive', null, 'is', 'F'));
		
		var groupMembers = nlapiSearchRecord('customer', null, filters, cols);	
		
		//Add dealers in the group to the return array.
		if(groupMembers != null && groupMembers.length > 0)
		{
			for(var i = 0; i < groupMembers.length; i++)
			{
				var dealerObj = {};
				dealerObj.id = groupMembers[i].getId();
				dealerObj.name = groupMembers[i].getValue('companyname');
				
				returnObj.dealers.push(dealerObj);
			}
		}
	}
	else
	{
		var dealerObj = {};
		dealerObj.id = dealerId;
		dealerObj.name = nlapiLookupField('customer', dealerId, 'companyname');
		
		returnObj.dealers.push(dealerObj);		//Always return at least the given dealer
	}
	
	return returnObj;
}

function getDealerGroupDealersArray(dealerId) {
	
	var returnArray = [];

	try {
		//Get the dealer's group.  If there is one, add its members to the vinDealers array
		var dealerGroupId = nlapiLookupField('customer', dealerId, 'custentitygd_dealergroup', false) || '';

		if(dealerGroupId != '')
		{
			var cols = [];
			cols.push(new nlobjSearchColumn('internalid', null, null));
			
			var filters = [];
			filters.push(new nlobjSearchFilter('custentitygd_dealergroup', null, 'anyof', dealerGroupId));

			filters.push(new nlobjSearchFilter('custentityrvscreditdealer', null, 'is', 'F'));
			filters.push(new nlobjSearchFilter('isinactive', null, 'is', 'F'));
			
			var groupMembers = nlapiSearchRecord('customer', null, filters, cols);	
			
			//Add dealers in the group to the return array.
			if(groupMembers != null && groupMembers.length > 0)
			{
				for(var i = 0; i < groupMembers.length; i++)
				{
					returnArray.push(groupMembers[i].getId());
				}
			}
		}
		else
		{
			returnArray.push(dealerId);		//Always return at least the given dealer
		}
	}
	catch(err)
	{
		nlapiLogExecution('error', err.getCode(), 'Error getting group for dealerId: ' + dealerId);
		returnArray.push(dealerId);		//Always return at least the given dealer
	}

	return returnArray;
}

function isEmailFoundRestlet(dataIn) {
	
	var isFound = false;
	
	var email = dataIn.email || '';
	var dealerId = dataIn.dealerId || '';
	
	if(email != '')
	{
		var filters = [];
		filters.push(new nlobjSearchFilter('isinactive', null, 'is', 'F'));
		filters.push(new nlobjSearchFilter('email', null, 'is', email));
		if(dealerId != '')
		{
			var dealerGroupDealers = getDealerGroupDealersArray(dealerId);
			filters.push(new nlobjSearchFilter('company', null, 'anyof', dealerGroupDealers));

		}
		
		var emailResults = nlapiSearchRecord('contact', null, filters, null);
		if(emailResults != null && emailResults.length > 0)
			isFound = true;
	}
	
	return isFound;
}

function postCreateNewUser(dataIn) {
	
	var returnObj = {};
	
	var email = dataIn.email || '';
	var dealerId = dataIn.dealerId || '';
	var firstName = dataIn.firstName || '';
	var middleName = dataIn.middleName || '';
	var lastName = dataIn.lastName || '';
	var roleId = dataIn.roleId || GD_ROLE_STANDARD;
	var phone = dataIn.phone || '';
	var officePhone = dataIn.officePhone || '';
	var mobilePhone = dataIn.mobilePhone || '';
	var fax = dataIn.fax || '';
	var activate = dataIn.activate || '';
	
	try {
		var contactRec = nlapiCreateRecord('contact');
		contactRec.setFieldValue('firstname', firstName);
		contactRec.setFieldValue('lastname', lastName);
		contactRec.setFieldValue('email', email);
		contactRec.setFieldValue('company', dealerId);
		
		if(roleId != '')
			contactRec.setFieldValue('custentitygd_uni_role', roleId);
		if(roleId == GD_ROLE_STANDARD)
			contactRec.setFieldValue('custentityrvsisdealersalesrep', 'T');
		if(activate == true || ('' + activate == 'true')){
			contactRec.setFieldValue('custentitygd_uni_isactive', 'T');
		}
		if(middleName != '')
			contactRec.setFieldValue('middlename', middleName);
		if(phone != '')
			contactRec.setFieldValue('phone', phone);
		if(officePhone != '')
			contactRec.setFieldValue('officephone', officePhone);
		if(mobilePhone != '')
			contactRec.setFieldValue('mobilephone', mobilePhone);
		if(fax != '')
			contactRec.setFieldValue('fax', fax);
		
		returnObj.userId = nlapiSubmitRecord(contactRec, null, true);

		if(returnObj.userId != '' && (activate == true || ('' + activate == 'true')))
		{
			CreateEnrollmentAchievementForUser(returnObj.userId);
		}
	}
	catch(err)
	{
		returnObj.errMsg = err;
		nlapiLogExecution('error', 'error creating user for dealer: ' + dealerId, firstName + ' ' + lastName + ' | ' + err);
	}
	
	return returnObj;
}

function postUpdateUser(dataIn) {
	
	var returnObj = {};
	
	var userId = dataIn.userId;
	
	var email = dataIn.email || '';
	var firstName = dataIn.firstName || '';
	var middleName = dataIn.middleName || '';
	var lastName = dataIn.lastName || '';
	var roleId = dataIn.roleId || '';
	var phone = dataIn.phone || '';
	var officePhone = dataIn.officePhone || '';
	var mobilePhone = dataIn.mobilePhone || '';
	var fax = dataIn.fax || '';
	var activate = dataIn.activate || '';
	
	try {
		var contactRec = nlapiLoadRecord('contact', userId);
		
		if(firstName != '')
			contactRec.setFieldValue('firstname', firstName);
		if(lastName != '')
			contactRec.setFieldValue('lastname', lastName);
		//If an email is provided, and the current email is blank
		if(email != '' && ConvertNSFieldToString(contactRec.getFieldValue('email')) == '')
			contactRec.setFieldValue('email', email);
		
		if(roleId != '')
			contactRec.setFieldValue('custentitygd_uni_role', roleId);
		if(activate != '') {
			if(activate == true || ('' + activate == 'true'))
			{
				contactRec.setFieldValue('custentitygd_uni_isactive', 'T');
				CreateEnrollmentAchievementForUser(userId);
			}
			else
				contactRec.setFieldValue('custentitygd_uni_isactive', 'F');
		}
		if(middleName != '')
			contactRec.setFieldValue('middlename', middleName);
		if(phone != '')
			contactRec.setFieldValue('phone', phone);
		if(officePhone != '')
			contactRec.setFieldValue('officephone', officePhone);
		if(mobilePhone != '')
			contactRec.setFieldValue('mobilephone', mobilePhone);
		if(fax != '')
			contactRec.setFieldValue('fax', fax);
		
		returnObj.userId = nlapiSubmitRecord(contactRec, null, true);
	}
	catch(err)
	{
		returnObj.errMsg = err;
		nlapiLogExecution('error', 'error updating user: ', firstName + ' ' + lastName + ' | ' + err);
	}
	
	return returnObj;
}

function postActivateOrDeactivateUser(dataIn) {
	
	var returnObj = {};
	
	var activate = dataIn.activate || true;
	var userId = dataIn.userId;
	
	if(activate == true || ('' + activate == 'true')) 	//Activate the user
	{
		try {
			nlapiSubmitField('contact', userId, 'custentitygd_uni_isactive', 'T', null);
			var currentRole = nlapiLookupField('contact', userId, 'custentitygd_uni_role') || '';
			if(currentRole == '')
				nlapiSubmitField('contact', userId, 'custentitygd_uni_role', GD_ROLE_STANDARD, null);
			
			//This method checks to see if this user already has an enrollment achievement, and creates one if necessary
			CreateEnrollmentAchievementForUser(userId);
		}
		catch (err) {
			nlapiLogExecution('error', 'Error activating user: ' + userId, err);
			returnObj.errMsg = err;
		}
	}
	else					//Deactivate the user
	{
		try {
			nlapiSubmitField('contact', userId, 'custentitygd_uni_isactive', 'F', null);
		}
		catch (err) {
			nlapiLogExecution('error', 'Error deactivating user: ' + userId, err);
			returnObj.errMsg = err;
		}
		
	}
		
	return returnObj;
}

function CreateEnrollmentAchievementForUser(uId)
{
	var filters = [];
	filters.push(new nlobjSearchFilter('isinactive', null, 'is', 'F'));
	filters.push(new nlobjSearchFilter('custrecordgd_contactachievement_contact', null, 'anyof', uId));
	filters.push(new nlobjSearchFilter('custrecordgd_contactach_achievement', null, 'anyof', GD_ENROLLMENT_ACHIEVEMENT));
	
	var achievements = nlapiSearchRecord('customrecordgd_contactachievement', null, filters, null);
	
	//If this user does not already have the enrollment achievement, then create it for them
	if(achievements == null || achievements.length == 0)
	{
		var achRec = nlapiCreateRecord('customrecordgd_contactachievement');
		achRec.setFieldValue('custrecordgd_contactachievement_contact', uId);
		achRec.setFieldValue('custrecordgd_contactach_achievement', GD_ENROLLMENT_ACHIEVEMENT);
		var today = new Date();
		achRec.setFieldValue('custrecordgd_contactach_date', (today.getMonth()+1)+'/'+today.getDate()+'/'+today.getFullYear());
		nlapiSubmitRecord(achRec, null, true);
	}
}

function getMonthsBetweenDates(startDateString, endDateString, dict) {
	var returnDict = {};
	
	var monthsDict = {};
	monthsDict[0] = "January";
	monthsDict[1] = "February";
	monthsDict[2] = "March";
	monthsDict[3] = "April";
	monthsDict[4] = "May";
	monthsDict[5] = "June";
	monthsDict[6] = "July";
	monthsDict[7] = "August";
	monthsDict[8] = "September";
	monthsDict[9] = "October";
	monthsDict[10] = "November";
	monthsDict[11] = "December";
	
	var startDate = new Date(startDateString);
	var endDate = new Date(endDateString);
	
	var nYears  = endDate.getUTCFullYear() - startDate.getUTCFullYear();
	var nMonths = endDate.getUTCMonth() - startDate.getUTCMonth() + (nYears!=0 ? nYears*12 : 0);
	
	var monthObj = '';
	var startMonth = startDate.getUTCMonth();
	var startYear = startDate.getFullYear();
	
	for(var m = 0; m <= nMonths; m++)
	{
		monthObj = {};
		
		var monthIndex = (startMonth + m) % 12;
		var yearIndex = (startYear + parseInt((m + startMonth)/12));
		monthObj.index = m;
		monthObj.month = monthsDict[monthIndex];
		
		//Create properties for each of our series
		for(var seriesIdKey in dict)
		{
			monthObj["series_" + seriesIdKey + "_salesCount"] = 0;
		}
		
		returnDict[monthIndex + '-' + yearIndex] = monthObj;
	}
	
	return returnDict;
}