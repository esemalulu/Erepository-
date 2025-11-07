/**
 * Copyright � 2018, Oracle and/or its affiliates. All rights reserved.
 *
 * @author kkung
 */
define(
	[
		'../adapter/proj_racg_ad_log',
		'../adapter/proj_racg_ad_format',
		'../adapter/proj_racg_ad_search',
		'../suitelet/proj_racg_su_work_calendars'
	],

	function (rLog, rFormat, rSearch, rWorkCalendars) {
		var module = {};

		/*
		 * Searches working days of all calendars within time frame
		 * @param {Object} params
		 * @param {Date} params.fromDate - start date
		 * @param {Date} params.toDate - end date
		 * @returns {Object} list of work days
		 */
		module.getCalendarWorkingDays = function (params) {
			rLog.startMethod('getCalendarWorkingDays');
			var objCalendarDays = rWorkCalendars.getWorkCalendars(),
				objWorkDays = {};

			for (var ctr in objCalendarDays) {
				objWorkDays[ctr] = this.getWorkDays({
					objCalendar: objCalendarDays[ctr],
					fromDate: params.fromDate,
					toDate: params.toDate
				});
			}
			rLog.endMethod();
			return objWorkDays;
		};

		/*
		 * Searches working days of a calendars within time frame
		 * @param {Object} params
		 * @param {Date} params.fromDate - start date
		 * @param {Date} params.toDate - end date.
		 * @param {Object} objCalendar - Mapping of calendar records
		 * @returns {Integer} work days within the time frame
		 */
		module.getWorkDays = function (params) {
			rLog.startMethod('getWorkDays');
			var startDate = params.fromDate;
			var endDate = params.toDate;
			var workCal = params.objCalendar;
			var hrsPerDay = workCal.hrsPerDay;

			// Compute total days, total work weeks, and remaining days after the last work week
			var totalDays = (Math.abs(startDate - endDate) / 86400000) + 1;
			var workWeeks = Math.floor(totalDays / 7);
			var remainDays = totalDays % 7;

			// Compute total working days for the full weeks
			var workDays = [];
			if (workCal.workSunday) workDays.push(0);
			if (workCal.workMonday) workDays.push(1);
			if (workCal.workTuesday) workDays.push(2);
			if (workCal.workWednesday) workDays.push(3);
			if (workCal.workThursday) workDays.push(4);
			if (workCal.workFriday) workDays.push(5);
			if (workCal.workSaturday) workDays.push(6);

			var weekWorkDays = workWeeks * workDays.length,
				remainWorkDays = 0,
				startDateIndex = startDate.getDay();

			for (var i = 0, j = startDateIndex; i < remainDays; i++, j = ++j % 7) {
				if (workDays.indexOf(j) != -1) remainWorkDays++;
			}

			// Count excepted days, check each exception date if between (inclusive) of start and end dates
			var exceptions = workCal.nonWork,
				exceptDays = 0;
			for (var i = 0; i < exceptions.length; i++) {
				var exceptiondate = rFormat.parse({value: exceptions[i].exceptiondate, type: rFormat.getTypes().DATE});
				if (startDate.getTime() <= exceptiondate.getTime() && exceptiondate.getTime() <= endDate.getTime()) {
					exceptDays++;
				}
			}

			// Compute total work days
			var totalWorkDays = weekWorkDays + remainWorkDays - exceptDays;
			rLog.endMethod();
			return totalWorkDays * hrsPerDay;
		};

		/*
		 * Get mapping of skill level records
		 * @param {None}
		 * @return {Object} skill level records
		 */
		module.getSkillLevels = function () {
			rLog.startMethod('getSkillLevels');
			var objSkillLevels = {};
			var searchObject = rSearch.create({
				type: 'customrecord_rss_skill_level',
				columns: ['name', 'custrecord_rss_skill_level_category', 'custrecord_rss_skill_level_linenumber']
			});
			var resultSet = searchObject.run();
			var rangedResults, start = 0, end = 1000;

			do {
				rangedResults = resultSet.getRange({
					start: start,
					end: end
				});

				for (var ctr = 0; ctr < rangedResults.length; ctr++) {
					var eachRecord = rangedResults[ctr];
					objSkillLevels[eachRecord.id] = {
						'name': eachRecord.getValue({name: 'name'}),
						'category': eachRecord.getValue({name: 'custrecord_rss_skill_level_category'}),
						'linenumber': eachRecord.getValue({name: 'custrecord_rss_skill_level_linenumber'})
					};
				}
				start = end;
				end += 1000;
			} while (rangedResults.length);

			rLog.endMethod();
			return objSkillLevels;
		};

		/*
		 * Retrieve all skilllevels base from skill id provided
		 * @param {Array} arrSkills - Skills id to search
		 * @return {Object} Skillsets info
		 */
		module.getSkillLevelsBySkill = function (arrSkills) {
			rLog.startMethod('getSkillLevelsBySkill');
			var objSkillLevels = {},
				lineNumber = 0,
				filters = arrSkills && arrSkills.length ?
					['custrecord_rss_skill_category.internalid', rSearch.getSearchOperators().ANYOF, arrSkills] :
					[];

			// Fetch relevant skill sets
			var searchObject = rSearch.create({
				type: 'customrecord_rss_category',
				columns: [
					'custrecord_rss_skill_category.internalid',
					'custrecord_rss_skill_category.name',
					'custrecord_rss_skill_level_category.internalid',
					'custrecord_rss_skill_level_category.name',
					'custrecord_rss_skill_level_category.custrecord_rss_skill_level_linenumber'
				],
				filters: filters
			});
			var resultSet = searchObject.run();
			var rangedResults = resultSet.getRange({
				start: 0,
				end: 1000
			});

			// Find max val for each skill set
			for (var ctr = 0; ctr < rangedResults.length; ctr++) {
				var eachRecord = rangedResults[ctr],
					skillId = eachRecord.getValue({name: 'internalid', join: 'custrecord_rss_skill_category'});

				if (!objSkillLevels[skillId]) {
					objSkillLevels[skillId] = {
						name: eachRecord.getValue({
							name: 'name',
							join: 'custrecord_rss_skill_category'
						})
					};
					objSkillLevels[skillId].skilllevels = [];
					objSkillLevels[skillId].maxLineNumber = 0;
				}
				lineNumber = +eachRecord.getValue({
					name: 'custrecord_rss_skill_level_linenumber',
					join: 'custrecord_rss_skill_level_category'
				}) || 0;
				objSkillLevels[skillId].skilllevels.push({
					skilllevelid: eachRecord.getValue({
						name: 'internalid',
						join: 'custrecord_rss_skill_level_category'
					}),
					skilllevelname: eachRecord.getValue({name: 'name', join: 'custrecord_rss_skill_level_category'}),
					linenumber: lineNumber
				});

				if (lineNumber > objSkillLevels[skillId].maxLineNumber) {
					objSkillLevels[skillId].maxLineNumber = lineNumber;
				}
			}

			// Compute maximum achievable value for the given skill set
			var baseSkillSetScore = 0;
			for (var key in objSkillLevels) {
				baseSkillSetScore += objSkillLevels[key].maxLineNumber;
			}
			objSkillLevels.baseskillsetscore = baseSkillSetScore;

			rLog.endMethod();
			return objSkillLevels;
		};

		return module;
	}
);