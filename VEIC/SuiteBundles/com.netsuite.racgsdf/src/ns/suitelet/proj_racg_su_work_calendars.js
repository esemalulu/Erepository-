/**
 * Copyright � 2018, Oracle and/or its affiliates. All rights reserved.
 *
 * @author jjaramillo
 * @NScriptName PROJ RACG SU Work Calendars
 * @NScriptId _proj_racg_su_work_calendars
 * @NScriptType suitelet
 * @NApiVersion 2.x
 */
define(
	[
		'../adapter/proj_racg_ad_log',
		'../adapter/proj_racg_ad_search',
		'../adapter/proj_racg_ad_runtime',
		'N/query'
	],

	function (rLog, rSearch, rRuntime, nQuery) {
		var module = {};

		/*
		 * A hashmap of correct separators to each available date format
		 */
		var dateFormatHash = {
			'M/D/YYYY': '/',
			'D/M/YYYY':'/',
			'YYYY/MM/DD': '/',
			'YYYY/M/D': '/',
			'MM/DD/YYYY': '/',
			'DD/MM/YYYY': '/',
			'YYYY-MM-DD': '-',
			'D-Mon-YYYY': '-',
			'D-MONTH-YYYY': '-',
			'YYYY-M-D': '-',
			'DD-MM-YYYY': '-',
			'DD-MONTH-YYYY': '-',
			'D.M.YYYY': '.',
			'DD.MM.YYYY': '.',
			'DD MONTH, YYYY': ' ',
			'D MONTH, YYYY': ' '
		};

		/*
		 * Suitelet Default function
		 *
		 * @param {Object} params - onRequest Object
		 * @returns {Void}
		 */
		module.onRequest = function (params) {
			rLog.startMethod('onRequest');
			var returnData = {
				success: true,
				workCalendars: []
			};
			try {
				var calendarsMap = this.getWorkCalendars(params);
				for (i in calendarsMap) {
					returnData.workCalendars.push(calendarsMap[i]);
				}
			} catch (e) {
				returnData.success = false;
				returnData.message = 'Failed to get work calendars. Request parameters: ' + JSON.stringify(params.request.body);
				returnData.workCalendars = [];
				rLog.handleError(e);
			}
			rLog.debug('returnData: ' + JSON.stringify(returnData));
			params.response.write(JSON.stringify(returnData));
			rLog.endMethod();
		};


		var getQueryResults = function (params) {

			var workCalendarsQuery = nQuery.create({type: nQuery.Type.WORK_CALENDAR});

			var exceptionJoin = workCalendarsQuery.autoJoin({fieldId: 'workcalendarexception'});

			workCalendarsQuery.columns = [
				workCalendarsQuery.createColumn({fieldId: 'id'}),
				workCalendarsQuery.createColumn({fieldId: 'name'}),
				workCalendarsQuery.createColumn({fieldId: 'starthour'}),
				workCalendarsQuery.createColumn({fieldId: 'workhoursperday'}),
				workCalendarsQuery.createColumn({fieldId: 'sunday'}),
				workCalendarsQuery.createColumn({fieldId: 'monday'}),
				workCalendarsQuery.createColumn({fieldId: 'tuesday'}),
				workCalendarsQuery.createColumn({fieldId: 'wednesday'}),
				workCalendarsQuery.createColumn({fieldId: 'thursday'}),
				workCalendarsQuery.createColumn({fieldId: 'friday'}),
				workCalendarsQuery.createColumn({fieldId: 'saturday'}),
				exceptionJoin.createColumn({fieldId: 'exceptiondate',}),
				exceptionJoin.createColumn({fieldId: 'description',})
			];

			var results = [];
			if (params && params.workCalendarIds && params.workCalendarIds.length > 0) {
				workCalendarsQuery.condition = workCalendarsQuery.createCondition({
					fieldId: 'id',
					operator: nQuery.Operator.ANY_OF,
					values: params.workCalendarIds
				});

				var myPagedResults = workCalendarsQuery.runPaged({pageSize: 5000});

				for (var i = 0; i < myPagedResults.pageRanges.length; i++) {
					results = results.concat(myPagedResults.fetch({index: i}).data.results);
				}
			}



			return results;
		};

		/*
		 * Retrieve work calendars
		 * @returns {Object} allWorkCalendars - id-calendar map of calendar details
		 */
		module.getWorkCalendars = function (params) {
			rLog.startMethod('getWorkCalendars');
			var allWorkCalendars = {},
				searchResults = getQueryResults(params);
			for (var i = 0; i < searchResults.length; i++) {
				var eachResult = searchResults[i].values,
					eachCalendarId = eachResult[0],
					exceptionDate = eachResult[11];
				if (!allWorkCalendars[eachCalendarId]) {
					allWorkCalendars[eachCalendarId] = {
						id: eachCalendarId,
						name: eachResult[1],
						startHour: eachResult[2],
						hrsPerDay: eachResult[3],
						workSunday: eachResult[4],
						workMonday: eachResult[5],
						workTuesday: eachResult[6],
						workWednesday: eachResult[7],
						workThursday: eachResult[8],
						workFriday: eachResult[9],
						workSaturday: eachResult[10],
						nonWork: []
					};
				}
				if (exceptionDate) {
					exceptionDate = this.setDateToCorrectFormat(exceptionDate);
					allWorkCalendars[eachCalendarId].nonWork.push({
						exceptiondate: exceptionDate,
						exceptiondescription: eachResult[12]
					});
				}
			}
			rLog.endMethod();

			return allWorkCalendars;
		};

		/*
		 * Checks if the given Date string is in correct format based on the current user preference and if it's not, it fixes it
		 * @returns {String} - Date string in the correct format
		 */
		module.setDateToCorrectFormat = function(dateString) {
			var NSDateFormat = rRuntime.getCurrentUserPreference({preference: 'DATEFORMAT'});
			var separator = dateFormatHash[NSDateFormat];
			if (separator) {
				var dateFormArr = NSDateFormat.split(separator);
				var dateArr = dateString.split(separator);
				var newSafeDate = [];
				var radix = 10;

				if (dateFormArr.length === dateArr.length) {
					dateFormArr.forEach(function(item, index) {
						if (item === 'M' || item === 'D') {
							newSafeDate.push(parseInt(dateArr[index], radix));
						} else if (item === 'MM' || item === 'DD') {
							newSafeDate.push((parseInt(dateArr[index], radix) < radix) ? '0' + parseInt(dateArr[index], radix) : dateArr[index])
						} else {
							newSafeDate.push(dateArr[index]);
						}
					});
					dateString = newSafeDate.join(separator);
				} else {
					rLog.error('setDateToCorrectFormat', 'Exception date and preffered NS date format differ. NS date format: "' + NSDateFormat + '", Exception date: "' + dateString + '"');
				}

			} else {
				rLog.error('setDateToCorrectFormat', 'Unrecognized NS date format: "' + NSDateFormat + '"');
			}
			return dateString;
		};

		return module;
	}
);
