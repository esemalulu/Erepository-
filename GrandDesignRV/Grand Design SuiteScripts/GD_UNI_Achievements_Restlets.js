/**
 * Returns an object that describes a given user�s GD University achievements.
 * 
 * Version    Date            Author           Remarks
 * 1.00       26 Jul 2017     brians
 *
 */

/**
 * @param {Object} dataIn Parameter object
 * @returns {Object} Output object
 */
function GD_GetAchievementsRestlet(dataIn) {
	
	if(dataIn != undefined)
	{
		var returnObj = {};
		returnObj.userName = '';
		returnObj.achievements = [];
		returnObj.certifications = [];
		
		var GD_GENERAL_CERTIFICATION = nlapiGetContext().getSetting('SCRIPT', 'custscriptgd_uni_generalcertification');
		
		var userId = dataIn.userId || '';
		var startDate = dataIn.startDate || '';
		var endDate = dataIn.endDate || '';
		
		if(userId != '' && startDate != '')
		{
			returnObj.userName = nlapiLookupField('contact', userId, 'entityid');
			
			//Contact Achievement Search
			var filters = [];
			filters.push(new nlobjSearchFilter('custrecordgd_contactachievement_contact', null, 'anyof', userId));
			filters.push(new nlobjSearchFilter('custrecordgd_contactach_date', null, 'onorafter', startDate));
			if(endDate != '')
				filters.push(new nlobjSearchFilter('custrecordgd_contactach_date', null, 'onorbefore', endDate));
			
			var columns = [];
			columns.push(new nlobjSearchColumn('name', 'custrecordgd_contactach_achievement'));
			columns.push(new nlobjSearchColumn('custrecordgd_achievement_code', 'custrecordgd_contactach_achievement'));
			columns.push(new nlobjSearchColumn('custrecordgd_achievement_points', 'custrecordgd_contactach_achievement'));
			columns.push(new nlobjSearchColumn('custrecordgd_contactach_date').setSort(true));
			
			//Get this user's achievements from the start date through the end date (if end date is null, use today's date)
			var achievements = nlapiSearchRecord('customrecordgd_contactachievement', null, filters, columns);
			if(achievements != null && achievements.length > 0)
			{
				var achObj = '';
				for(var i = 0; i < achievements.length; i++)
				{
					achObj  = {};
					achObj.code = achievements[i].getValue('custrecordgd_achievement_code', 'custrecordgd_contactach_achievement');
					achObj.name = achievements[i].getValue('name', 'custrecordgd_contactach_achievement');
					achObj.points = achievements[i].getValue('custrecordgd_achievement_points', 'custrecordgd_contactach_achievement');
					achObj.date = achievements[i].getValue('custrecordgd_contactach_date');
					
					returnObj.achievements.push(achObj);
				}
			}
			
			var seriesPointsDictionary = getSeriesPointValues();
			
			//Get this user's unit sales/registrations, and return those as achievements with the "SALE" code
			filters = [];
			filters.push(['custrecordunitretailcustomer_retailsold', 'onorafter', startDate]);
			filters.push('AND');
			filters.push([[['custrecordunitretailcustomer_dealsalesrp', 'anyof', userId],'AND',['custrecordunitretailcustomer_dealsalesrp.custentitygd_uni_isactive', 'is', 'T']], 'OR',
			              [['custrecordunitretailcustomer_dsalesrp2', 'anyof', userId],'AND',['custrecordunitretailcustomer_dsalesrp2.custentitygd_uni_isactive', 'is', 'T']]]);
			if(endDate != '')
			{
				filters.push('AND');
				filters.push(['custrecordunitretailcustomer_retailsold', 'onorbefore', endDate]);
			}
			
			columns = [];
			columns.push(new nlobjSearchColumn('custrecordunit_series', 'custrecordunitretailcustomer_unit'));
			columns.push(new nlobjSearchColumn('custrecordunitretailcustomer_unit'));
			columns.push(new nlobjSearchColumn('custrecordunitretailcustomer_dealsalesrp'));
			columns.push(new nlobjSearchColumn('custrecordunitretailcustomer_dsalesrp2'));
			columns.push(new nlobjSearchColumn('custrecordunitretailcustomer_retailsold').setSort());
			
			var unitResults = GetSteppedSearchResults('customrecordrvsunitretailcustomer', filters, columns);
			
			if(unitResults != null && unitResults.length > 0)
			{
				for(var k = 0; k < unitResults.length; k++)
				{
					var secondaryRep = unitResults[k].getValue('custrecordunitretailcustomer_dsalesrp2') || '';
					
					var saleObj = {};
					saleObj.code = 'SALE';
					saleObj.name = unitResults[k].getText('custrecordunit_series', 'custrecordunitretailcustomer_unit');
					saleObj.name += ' ' + unitResults[k].getText('custrecordunitretailcustomer_unit');
					saleObj.points = '0';
					var seriesId = unitResults[k].getValue('custrecordunit_series', 'custrecordunitretailcustomer_unit') || '';
					if(seriesId != '' && seriesPointsDictionary[seriesId] != null)
						saleObj.points = seriesPointsDictionary[seriesId];
					//If this unit dual registered, then only give half the points
					if(secondaryRep != '')
					{
						saleObj.points = parseInt(saleObj.points)/2;
					}
					saleObj.date = unitResults[k].getValue('custrecordunitretailcustomer_retailsold');
					
					returnObj.achievements.push(saleObj);
				}
			}
			
			//Sort the achievements by date
			returnObj.achievements.sort(function(a,b) {
				if(ConvertNSFieldToString(a.date) == '') {
					return 1; //Achievement A doesnt have a date, so sort B higher (i.e. b comes first)
				}
				else if(ConvertNSFieldToString(b.date) == '')
					return -1; //Achievement B doesn't have a date, so sort A higher (i.e. a comes first)
				else //Both have dates, so sort by that
				{
					return ((new Date(a.date)) - (new Date(b.date)));
				}
			}).reverse();
			
			var seriesCertPoints = getSeriesCertificationAchievementPoints(); //This method located in GD_UNI_Leaderboard_Restlet.js
			
			//Contact Certification Search
			filters = [];
			filters.push(new nlobjSearchFilter('custrecordgd_contactcert_contact', null, 'anyof', userId));
			filters.push(new nlobjSearchFilter('isinactive', null, 'is', 'F'));
			filters.push(new nlobjSearchFilter('created', null, 'onorafter', startDate));
			if(endDate != '')
				filters.push(new nlobjSearchFilter('created', null, 'onorbefore', endDate));
			
			columns = [];
			columns.push(new nlobjSearchColumn('custrecordgd_series_certificationcode', 'custrecordgd_contactcert_series'));
			columns.push(new nlobjSearchColumn('custrecordgd_contactcert_series'));
			columns.push(new nlobjSearchColumn('created').setSort(true));
			
			//Get this user's certifications from the start date through the end date (if end date is null, use today's date)
			var certs = nlapiSearchRecord('customrecordgd_contactcertification', null, filters, columns);
			if(certs != null && certs.length > 0)
			{
				var certObj = '';
				for(var j = 0; j < certs.length; j++)
				{
					certObj  = {};
					certObj.code = certs[j].getValue('custrecordgd_series_certificationcode', 'custrecordgd_contactcert_series');
					certObj.points = 0;
					certObj.date = certs[j].getValue('created');
					
					//Set the points of this certification from the dictionary we got earlier, which fetched point values from Achievement records
					var seriesId = certs[j].getValue('custrecordgd_contactcert_series');
					if(seriesCertPoints[seriesId] != null)
					{
						certObj.points = seriesCertPoints[seriesId];
					}
					else
					{
						var results = nlapiLookupField('customrecordgd_achievement', GD_GENERAL_CERTIFICATION, ['custrecordgd_achievement_code', 'custrecordgd_achievement_points']);
						if(results != null)
						{
							certObj.code = results.custrecordgd_achievement_code;
							certObj.points = results.custrecordgd_achievement_points;
						}
	
					}
					
					returnObj.certifications.push(certObj);
				}
			}
		}
		
		return returnObj;
	}
}


/**
 * @param {Object} dataIn Parameter object
 * @returns {Object} Output object
 */
function GD_PostAchievementRestlet(dataIn) {
	
	var returnObj = {};
	
	var today = new Date();
	today = (today.getMonth() + 1) + '/' + today.getDate() + '/' + today.getFullYear();
		
	var userId = dataIn.userId || '';
	var code = dataIn.code || '';
	
	if(userId != '' && code != '')
	{
		var results = nlapiSearchRecord('customrecordgd_achievement', null, new nlobjSearchFilter('custrecordgd_achievement_code', null, 'is', code), null);
		if(results != null && results.length > 0)
		{
			try {
				var achievementRecord = nlapiCreateRecord('customrecordgd_contactachievement');
				achievementRecord.setFieldValue('custrecordgd_contactachievement_contact', userId);
				achievementRecord.setFieldValue('custrecordgd_contactach_achievement', results[0].getId());
				achievementRecord.setFieldValue('custrecordgd_contactach_date', today);
				var recordId = nlapiSubmitRecord(achievementRecord, false, true);
			}
			catch(err) {
				returnObj.errMsg = err.getCode() + ' - ' + err.getDetails();
			}
		}
		else
			returnObj.errMsg = "Failed - No Achievement with the given code was found.";
	}
	
	return returnObj;
	
}

/**
 * @param {Object} dataIn Parameter object
 * @returns {Object} Output object
 */
function GD_PostCertificationRestlet(dataIn) {
	
	var returnObj = {};
	
	var GD_GENERAL_CERTIFICATION = nlapiGetContext().getSetting('SCRIPT', 'custscriptgd_uni_generalcertification');
		
	var userId = dataIn.userId || '';
	var seriesId = dataIn.seriesId || 'GENERAL';
	
	if(userId != '' && seriesId != '')
	{
		var filters = [];
		if(seriesId != 'GENERAL')
			filters.push(new nlobjSearchFilter('custrecordgd_contactcert_series', null, 'anyof', seriesId));
		else
			filters.push(new nlobjSearchFilter('custrecordgd_contactcert_series', null, 'anyof', ['@NONE@']));
		filters.push(new nlobjSearchFilter('custrecordgd_contactcert_contact', null, 'anyof', userId));
		
		var results = nlapiSearchRecord('customrecordgd_contactcertification', null, filters, null);
		if(results != null && results.length > 0)
		{
			returnObj.errMsg = 'This user has already been certified for this Series/Brand.';
		}
		else
		{
			try {
				var certRecord = nlapiCreateRecord('customrecordgd_contactcertification');
				certRecord.setFieldValue('custrecordgd_contactcert_contact', userId);
				//If it's a general certification, leave the Series field blank
				if(seriesId != 'GENERAL')
					certRecord.setFieldValue('custrecordgd_contactcert_series', seriesId);
				
				var recordId = nlapiSubmitRecord(certRecord, false, true);	
			}
			catch(err) {
				returnObj.errMsg = err.getCode() + ' - ' + err.getDetails();
			}
		}
	}
	
	return returnObj;
}
