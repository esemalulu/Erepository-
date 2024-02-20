/**
 * Contains the daily and monthly scheduled scripts that give out GD University awards.
 * 
 * Version    Date            Author           Remarks
 * 1.00       15 Oct 2017     brians
 *
 */

var GD_ACHIEVEMENTTYPE_CERTIFICATION = '1';
var GD_ACHIEVEMENTTYPE_OTHER = '2';
var GD_ACHIEVEMENTTYPE_MONTHLY = '3';
var GD_ACHIEVEMENTTYPE_YTD = '4';

var SUBSCRIPTION_SOFTOPTOUT = '2';

/**
 * GD_UNI_AwardsDaily_Scheduled - Scheduled script that runs each night to determine if there are any changes
 * in the top 3 on the overall and brand-specific leaderboards.  This runs individually for each country in the array.
 * @param {String} type Context Types: scheduled, ondemand, userinterface, aborted, skipped
 * @returns {Void}
 */
function GD_UNI_AwardsDaily_Scheduled(type) {
	
	var context = nlapiGetContext();
	context.setPercentComplete(0.00);
	
	var awardsGiven = [];
	var countriesToAward = [{code: 'US', id: '1', name: 'United States'}, {code: 'CA', id: '2', name: 'Canada'}];
	
	var today = new Date();
	
	for(var z = 0; z < countriesToAward.length; z++)
	{
		awardsGiven = GiveOverallAwardsDaily(context, awardsGiven, countriesToAward[z], today);
		context.setPercentComplete(context.getPercentComplete() + parseFloat(100/(countriesToAward.length*2)));
		awardsGiven = GiveBrandAwardsDaily(context, awardsGiven, countriesToAward[z], today);
		
		if(awardsGiven.length > 0)
			awardsGiven = []; 	//Empty our array, so we can send a new set of awards for the next country
		context.setPercentComplete(parseFloat(100/countriesToAward.length));
	}
}

/**
 * GD_UNI_AwardsMonthly_Scheduled - Scheduled script that runs once each month, on a date defined in the GD Company Preferences
 * On that date, gets the leaderboard for the previous month overall and by brand. Runs for each of the countries defined in the array.
 * @param {String} type Context Types: scheduled, ondemand, userinterface, aborted, skipped
 * @returns {Void}
 */
function GD_UNI_AwardsMonthly_Scheduled(type) {
	
	var context = nlapiGetContext();
	context.setPercentComplete(0.00);
	
	var awardsGiven = [];
	var countriesToAward = [{code: 'US', id: '1', name: 'United States'}, {code: 'CA', id: '2', name: 'Canada'}];
	
	//We want to process this as of the last day of the previous month
	var dateToProcess = new Date();
	dateToProcess.setMonth(dateToProcess.getMonth());
	dateToProcess.setDate(1);
	dateToProcess.setDate(dateToProcess.getDate()-1);
	
	for(var z = 0; z < countriesToAward.length; z++)
	{
		awardsGiven = GiveOverallAwardsMonthly(context, awardsGiven, countriesToAward[z], dateToProcess);
		context.setPercentComplete(context.getPercentComplete() + parseFloat(100/(countriesToAward.length*2)));
		awardsGiven = GiveBrandAwardsMonthly(context, awardsGiven, countriesToAward[z], dateToProcess);
		
		if(awardsGiven.length > 0)
			awardsGiven = []; 	//Empty our array, so we can send a new set of awards for the next country
		context.setPercentComplete(parseFloat(100/countriesToAward.length));
	}
}

function GiveOverallAwardsDaily(context, awardsGiven, country, dateToRun)
{
	var year = dateToRun.getFullYear();
	var today = dateToRun;
	today = (today.getMonth() + 1) + '/' + today.getDate() + '/' + today.getFullYear();
	
	var leaderboard = GD_GetLeaderboard({startDate: '1/1/' + year, endDate: '12/31/' + year, country: country.code}); 	//This method in GD_UNI_Leaderboard_Restlets.js
	
	if(leaderboard != null && leaderboard.length > 0)
	{
		for(var i = 0; i < Math.min(3, leaderboard.length); i++)
		{
			var userId = leaderboard[i].userId || '';
			var points = leaderboard[i].totalPoints || '';
			awardsGiven = GiveDailyAwardtoUser(userId, i, null, points, awardsGiven, country, today);
			
			//Yield if we do not have enough usage points.
			if(nlapiGetContext().getRemainingUsage() < 3500)
			{
				yieldScript();
			}
		}
	}
	return awardsGiven;
}

function GiveBrandAwardsDaily(context, awardsGiven, country, dateToRun)
{
	var year = dateToRun.getFullYear();
	var today = dateToRun;
	today = (today.getMonth() + 1) + '/' + today.getDate() + '/' + today.getFullYear();
	
	var seriesList = getSeriesList();
	
	for(var k = 0; k < seriesList.length; k++)
	{
		var brandId = seriesList[k];
		//Return an array sorted by points for this particular series
		var leaderboard = GD_GetLeaderboard({startDate: '1/1/' + year, endDate: '12/31/' + year, seriesId: brandId, country: country.code});	//This method in GD_UNI_Leaderboard_Restlets.js
		if(leaderboard != null && leaderboard.length > 0)
		{
			for(var i = 0; i < Math.min(3, leaderboard.length); i++)
			{
				var userObj = leaderboard[i];
				var userId = userObj.userId || '';
				var points = userObj['series_' + seriesList[k] + '_points'] || '';
				awardsGiven = GiveDailyAwardtoUser(userId, i, brandId, points, awardsGiven, country, today);
			}
		}
		
		//Yield if we do not have enough usage points.
		if(nlapiGetContext().getRemainingUsage() < 3500)
		{
			yieldScript();
		}
	}
	return awardsGiven;
}

function GiveOverallAwardsMonthly(context, awardsGiven, country, dateToRun)
{
	var year = dateToRun.getFullYear();
	var month = dateToRun.getMonth() + 1;
	var date = dateToRun.getDate();
	var dateString = month + '/' + date + '/' + year;
	
	//Return an array sorted by points for this particular series
	var leaderboard = GD_GetLeaderboard({startDate: month + '/1/' + year, endDate: month + '/' + date + '/' + year, country: country.code});	//This method in GD_UNI_Leaderboard_Restlets.js
	
	if(leaderboard != null && leaderboard.length > 0)
	{
		for(var i = 0; i < Math.min(3, leaderboard.length); i++)
		{
			var userId = leaderboard[i].userId || '';
			var points = leaderboard[i].monthPoints || '0';
			
			awardsGiven = GiveMonthlyAwardtoUser(userId, i, null, points, awardsGiven, country, dateString);
		}
	}
	
	//Yield if we do not have enough usage points.
	if(nlapiGetContext().getRemainingUsage() < 3500)
	{
		yieldScript();
	}
	return awardsGiven;
}

function GiveBrandAwardsMonthly(context, awardsGiven, country, dateToRun) {
	
	var year = dateToRun.getFullYear();
	var month = dateToRun.getMonth() + 1;
	var date = dateToRun.getDate();
	var dateString = month + '/' + date + '/' + year;
	
	var seriesList = getSeriesList();
	for(var k = 0; k < seriesList.length; k++)
	{
		//Return an array sorted by points for this particular series
		var leaderboard = GD_GetLeaderboard({startDate: month + '/1/' + year, endDate: month + '/' + date + '/' + year, seriesId: seriesList[k], country: country.code});	//This method in GD_UNI_Leaderboard_Restlets.js
		
		if(leaderboard != null && leaderboard.length > 0)
		{
			for(var i = 0; i < Math.min(3, leaderboard.length); i++)
			{
				var userObj = leaderboard[i];
				var userId = userObj.userId || '';
				var points = userObj['series_' + seriesList[k] + '_monthPoints'] || '0';
				awardsGiven = GiveMonthlyAwardtoUser(userId, i, seriesList[k], points, awardsGiven, country, dateString);
			}
		}
		
		//Yield if we do not have enough usage points.
		if(nlapiGetContext().getRemainingUsage() < 3500)
		{
			yieldScript();
		}
	}
	return awardsGiven;
}

function GiveDailyAwardtoUser(leaderId, index, brand, pts, awards, countryObj, dString)
{
	if(leaderId != '')
	{
		var filters = [];
		filters.push(new nlobjSearchFilter('custrecordgd_achievement_rank', 'custrecordgd_contactach_achievement', 'anyof', [(index + 1)]));
		filters.push(new nlobjSearchFilter('custrecordgd_achievement_type', 'custrecordgd_contactach_achievement', 'anyof', [GD_ACHIEVEMENTTYPE_YTD]));
		filters.push(new nlobjSearchFilter('custrecordgd_contactach_country', null, 'anyof', [countryObj.id]));
		
		if(brand != null)
			filters.push(new nlobjSearchFilter('custrecordgd_achievement_series', 'custrecordgd_contactach_achievement', 'anyof', brand));
		else
			filters.push(new nlobjSearchFilter('custrecordgd_achievement_series', 'custrecordgd_contactach_achievement', 'anyof', ['@NONE@']));

		var searchResults = nlapiSearchRecord('customrecordgd_contactachievement', null, filters, new nlobjSearchColumn('custrecordgd_contactachievement_contact'));
		if(searchResults != null && searchResults.length == 1) 	//There should only be one result - since only one person can own this achievement at a time
		{
			var currentOwner = searchResults[0].getValue('custrecordgd_contactachievement_contact');

			//If this award is changing hands, set the new owner
			if(currentOwner != leaderId && leaderId != '')
			{
				nlapiSubmitField('customrecordgd_contactachievement', searchResults[0].getId(), 'custrecordgd_contactachievement_contact', leaderId, false);
				nlapiSubmitField('customrecordgd_contactachievement', searchResults[0].getId(), 'custrecordgd_contactach_date', dString, false);

				awards.push({user: leaderId, series: brand, place: (index + 1), points: pts});
				
				//If there's a new first-place leader, then update leader data
				if(index == 0)
				{
					var leaderData = {id: leaderId, brand: brand};
					var params = {};
					params['custscriptgd_uni_newleaderdata'] = JSON.stringify(leaderData);
				}
			}
		}
	}
	return awards;
}

function GiveMonthlyAwardtoUser(leaderId, index, brand, pts, awards, countryObj, dString)
{
	if(leaderId != '')
	{
		var filters = [];
		filters.push(new nlobjSearchFilter('custrecordgd_achievement_rank', null, 'anyof', (index + 1)));
		if(brand == null)
			filters.push(new nlobjSearchFilter('custrecordgd_achievement_series', null, 'anyof', ['@NONE@']));
		else
			filters.push(new nlobjSearchFilter('custrecordgd_achievement_series', null, 'anyof', brand));
		filters.push(new nlobjSearchFilter('custrecordgd_achievement_type', null, 'anyof', GD_ACHIEVEMENTTYPE_MONTHLY));
		
		var achievementResults = nlapiSearchRecord('customrecordgd_achievement', null, filters, null);
		
		if(achievementResults != null && achievementResults.length == 1)
		{
			var awardRecord = nlapiCreateRecord('customrecordgd_contactachievement');
			awardRecord.setFieldValue('custrecordgd_contactachievement_contact', leaderId);
			awardRecord.setFieldValue('custrecordgd_contactach_achievement', achievementResults[0].getId());
			awardRecord.setFieldValue('custrecordgd_contactach_country', countryObj.id);
			awardRecord.setFieldValue('custrecordgd_contactach_date', dString);
			var awardRecordId = nlapiSubmitRecord(awardRecord, true, true);

			awards.push({user: leaderId, series: brand, place: (index + 1), points: pts});

		}
	}
	return awards;
}


function getSeriesList(withNames) {
	//Either return a dictionary with series names indexed by ids, or just an array of series ids
	if(withNames)
	{
		var sList = {};
		var seriesIdResults = nlapiSearchRecord('customrecordrvsseries', null, new nlobjSearchFilter('isinactive', null, 'is', 'F'), new nlobjSearchColumn('name'));
		if(seriesIdResults != null && seriesIdResults.length > 0)
		{
			for(var r = 0; r < seriesIdResults.length; r++)
			{
				sList[seriesIdResults[r].getId()] = seriesIdResults[r].getValue('name');
			}
		}
		return sList;
	}
	else
	{
		var sList = [];
		var seriesIdResults = nlapiSearchRecord('customrecordrvsseries', null, new nlobjSearchFilter('isinactive', null, 'is', 'F'), null);
		if(seriesIdResults != null && seriesIdResults.length > 0)
		{
			for(var r = 0; r < seriesIdResults.length; r++)
			{
				sList.push(seriesIdResults[r].getId());
			}
		}
		return sList;
	}

}

function yieldScript()
{
	var stateMain = nlapiYieldScript();
	nlapiLogExecution('debug', 'time', nlapiGetContext().getRemainingUsage());
	if(stateMain.status == 'FAILURE')
	{ 
		nlapiLogExecution("debug","Failed to yield script (loop), exiting: Reason = "+ stateMain.reason + " / Size = "+ stateMain.size); 
		throw "Failed to yield script"; 
	} 
	else if (stateMain.status == 'RESUME')
	{ 
		nlapiLogExecution("debug", "Resuming script (loop) because of " + stateMain.reason+". Size = "+ stateMain.size); 
	}
}
