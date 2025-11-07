/**
 * © 2015 NetSuite Inc.  User may not copy, modify, distribute, or re-bundle or otherwise make available this code.
 */

/*
 * Logger class that allows easy toggling of console messages
 */
Ext4.define('RA.Util.Logger', {

	statics: {
		enableLogs: false, // Do not set this to true when checking in to Perforce!

		getCallerNames: function (args) {
			var className = '';
			var functionName = '';
			try {
				className = args.callee.caller.$owner.$className;
				functionName = args.callee.caller.$name;
			} catch (e) {
				return null;
			}
			return {className: className, functionName: functionName};
		},

		log: function (message) {
			if (this.enableLogs && window.console && window.console.log) {
				var prefix = RA.Util.Logger.getCallerNames(arguments);
				var displayMsg = prefix ? prefix.className + ':' + prefix.functionName + '() - ' + message : message;
				console.log(displayMsg);
			}
		},
		info: function (message) {
			if (this.enableLogs && window.console && window.console.info) {
				var prefix = RA.Util.Logger.getCallerNames(arguments);
				var displayMsg = prefix ? prefix.className + ':' + prefix.functionName + '() - ' + message : message;
				console.info(displayMsg);
			}
		},
		warn: function (message) {
			if (this.enableLogs && window.console && window.console.warn) {
				var prefix = RA.Util.Logger.getCallerNames(arguments);
				var displayMsg = prefix ? prefix.className + ':' + prefix.functionName + '() - ' + message : message;
				console.warn(displayMsg);
			}
		},
		error: function (message) {
			if (this.enableLogs && window.console && window.console.error) {
				var prefix = RA.Util.Logger.getCallerNames(arguments);
				var displayMsg = prefix ? prefix.className + ':' + prefix.functionName + '() - ' + message : message;
				console.error(displayMsg);
			}
		},
	}
});

/*
 * Singleton class for converting exceptiondate string to a Date object
 */
Ext4.define('RA.Util.ExceptionDate', {
	singleton: true,
	toDate: function (exceptionDateStr) {
		var tok = exceptionDateStr.split('/');
		return new Date(tok[0], tok[1] - 1, tok[2]);
	}
});

Ext4.define('RA.Util.Boolean', {
	singleton: true,
	stringToBoolean: function (v) {
		return v == 'T';
	}
});

Ext4.define('RA.Util.Date', {
	statics: {
		preferenceFormatToExtFormatMap: function (format) {
			switch (format) {
				case 'Month D, YYYY':
					return {
						daily: 'D M j',
						weekly: 'M j',
						monthly: 'M Y'
					};
				case 'D Month YYYY':
					return {
						daily: 'D j M',
						weekly: 'j M',
						monthly: 'M Y'
					};
				case 'YYYY Month D':
					return {
						daily: 'D M j',
						weekly: 'M j',
						monthly: 'Y M'
					};
				case 'Month DD, YYYY':
					return {
						daily: 'D M d',
						weekly: 'M d',
						monthly: 'M Y'
					};
				case 'DD Month YYYY':
					return {
						daily: 'D d M',
						weekly: 'd M',
						monthly: 'M Y'
					};
				case 'YYYY Month DD':
				default:
					return {
						daily: 'D M d',
						weekly: 'M d',
						monthly: 'Y M'
					};
			}
		},
		getDateFormatForDailyPreset: function (preferenceLongDateFormat) {
			if (preferenceLongDateFormat) {
				return this.preferenceFormatToExtFormatMap(preferenceLongDateFormat).daily;
			}
			return '';
		},
		getDateFormatForWeeklyPreset: function (preferenceLongDateFormat) {
			if (preferenceLongDateFormat) {
				return this.preferenceFormatToExtFormatMap(preferenceLongDateFormat).weekly;
			}
			return '';
		},
		getDateFormatForMonthlyPreset: function (preferenceLongDateFormat) {
			if (preferenceLongDateFormat) {
				return this.preferenceFormatToExtFormatMap(preferenceLongDateFormat).monthly;
			}
			return '';
		},
		getDayOfMonth: function (dt) {
			return parseInt(Ext4.Date.format(dt, 'd'), 10);
		},
		getDayOfWeek: function (dt) {
			//0-based
			return parseInt(Ext4.Date.format(dt, 'w'), 10);
		},
		getDayOfWeekInMonthsCount: function (dt) {
			var startDate = Ext4.Date.getFirstDateOfMonth(dt);
			var dayOfWeek = this.getDayOfWeek(dt);
			var count = 0;
			while (startDate <= dt) {
				var _dayOfWeek = parseInt(Ext4.Date.format(startDate, 'w'), 10);
				if (_dayOfWeek == dayOfWeek) {
					count += 1;
				}
				startDate = Ext4.Date.add(startDate, Ext4.Date.DAY, 1);
			}
			return count;
		},
		setDateByNthDayOfWeek: function (dt, nthDay, dayOfWeek) {
			var firstDateOfMonth = Ext4.Date.getFirstDateOfMonth(dt);
			var lastDateOfMonth = Ext4.Date.getLastDateOfMonth(dt);

			var dayOfWeekInMonths = [];
			while (firstDateOfMonth <= lastDateOfMonth) {
				var _dayOfWeek = this.getDayOfWeek(firstDateOfMonth) + 1;

				if (_dayOfWeek == dayOfWeek) {
					dayOfWeekInMonths.push(firstDateOfMonth.getTime());
				}
				firstDateOfMonth = Ext4.Date.add(firstDateOfMonth, Ext4.Date.DAY, 1);
			}
			if (nthDay == 5) {
				dt.setTime(dayOfWeekInMonths[dayOfWeekInMonths.length - 1]);
			} else {
				dt.setTime(dayOfWeekInMonths[nthDay - 1]);
			}
		}
	}
});

Ext4.define('RA.Util.WorkCalendar', {
	singleton: true,
	workDayCache: {},
	timeOffCache: {},
	fixLoggedForCalendars: [],
	computeWorkDays: function (workCalendar, startDate, lastDate) {
		if (!workCalendar) {
			return 0;
		}
		// allow RA.Cmp.Model.WorkCalendar input parameter
		var workCal = workCalendar.$className == 'RA.Cmp.Model.WorkCalendar' ? workCalendar.data : workCalendar;

		// Compute total days, total work weeks, and remaining days after the last work week
		var totalDays = RA.Util.CustomFunctions.getDayCountBetweenTwoDates(startDate, lastDate, true);
		var workWeeks = Math.floor(totalDays / 7);
		var remainDays = totalDays % 7;

		// Compute total working days for the full weeks
		var workDays = [
			workCal.workSunday,
			workCal.workMonday,
			workCal.workTuesday,
			workCal.workWednesday,
			workCal.workThursday,
			workCal.workFriday,
			workCal.workSaturday
		];
		var workDaysCount = 0;
		for (i in workDays) {
			if (workDays[i]) {
				workDaysCount++;
			}
		}

		var weekWorkDays = workWeeks * workDaysCount;

		// Compute total working days for remaining days after last full week
		var remainWorkDays = 0;
		var startDateIndex = Number(Ext4.Date.format(startDate, 'w'));
		for (var i = 0, j = startDateIndex; i < remainDays; i++ , j = ++j % 7) {
			if (workDays[j]) {
				remainWorkDays++;
			}
		}

		// Count excepted days, check each exception date if between (inclusive) of start and end dates
		var exceptions = workCal.nonWork;
		var exceptDays = 0;
		if (exceptions) {
			for (i in exceptions) {
				var exception = exceptions[i];
				var date = Ext4.Date.parse(exception.exceptiondate, convertNSDateFormat());

				if (workDays[Number(Ext4.Date.format(date, 'w'))] && Ext4.Date.between(date, startDate, lastDate)) {
					exceptDays++;
				}
			}
		}
		// Compute total work days within range, then distribute hours to derive percentage
		return weekWorkDays + remainWorkDays - exceptDays;
	},
	isWorkDay: function (date, workCalendar) {
		var that = this;
		if (!workCalendar) {
			return false;
		}
		workCalendar = workCalendar.$className == 'RA.Cmp.Model.WorkCalendar' ? workCalendar.data : workCalendar;

		var workCalendarId = workCalendar.id;
		var dateTime = date.getTime();
		var isWorkDay = this.getWorkDayFromCache(dateTime, workCalendarId);

		if (isWorkDay == null) {
			isWorkDay = true;

			// check weekly schedule first (Work Calendar > Working Days subtab)
			// we can immediately return false if date is a weekly non-working day
			// but, if it is a weekly working day, it may still be a "holiday" (Work Calendar > Non Working Days subtab)
			if (isWorkDay) {
				var workSchedule = [
					workCalendar.workSunday,
					workCalendar.workMonday,
					workCalendar.workTuesday,
					workCalendar.workWednesday,
					workCalendar.workThursday,
					workCalendar.workFriday,
					workCalendar.workSaturday
				];

				if (!workSchedule[date.getDay()]) {
					isWorkDay = false;
				} else {
					var nonWorkingDays = workCalendar.nonWork;
					var fixedDates = [];
					var brokenDates = [];
					var atLeastOneDateIsBroken = false;

					for (var i in nonWorkingDays) {
						var safeNonWorkDate = nonWorkingDays[i].exceptiondate;
						var safeDateFormat = convertNSDateFormat();
						var nonWorkingDay = Ext4.Date.parse(safeNonWorkDate, safeDateFormat);
						var formatIsBroken = (nonWorkingDay === undefined);

						if (formatIsBroken) {
							/*
							* Inline fix for cases when date of a non-work day from DB doesn't respect user's preference
							* The code between the two comments can be removed when the error is fixed outside RACG
							* */
							atLeastOneDateIsBroken = true;
							var separator = null;
							var dateArr = [];

							// only update formats that need it
							switch (safeDateFormat) {
								case 'n/j/Y':
								case 'j/n/Y':
								case 'Y/m/d':
								case 'Y/n/j':
								case 'm/d/Y':
								case 'd/m/Y':
									separator = '/';
									break;
								case 'Y-m-d':
								case 'j-M-Y':
								case 'j-F-Y':
								case 'Y-n-j':
								case 'd-M-Y':
								case 'd-F-Y':
									separator = '-';
									break;
								case 'j.n.Y':
								case 'd.m.Y':
									separator = '.';
									break;
								case 'd F, Y':
								case 'j F, Y':
									separator = ' ';
									break;
							}
							if (separator != null) {
								// replace double digits with single digits for day and month
								safeDateFormat = safeDateFormat.replace('d', 'j');
								safeDateFormat = safeDateFormat.replace('m', 'n');

								dateArr = nonWorkingDays[i].exceptiondate.split(separator);
								dateArr = dateArr.map(function (item) {
									return (!isNaN(item)) ? parseInt(item) : item;
								});

								safeNonWorkDate = dateArr.join(separator);
							}
							nonWorkingDay = Ext4.Date.parse(safeNonWorkDate, safeDateFormat);

							if (!nonWorkingDay && convertNSDateFormat() === 'd-M-Y') {
								nonWorkingDay = new Date(safeNonWorkDate);
							}
							/* End of the inline fix */

							if (!nonWorkingDay) {
								brokenDates.push(nonWorkingDays[i].exceptiondate);
								console.error(
									'Error when loading exception date.',
									{
										exceptionDate: nonWorkingDays[i].exceptiondate,
										nsDateFormat: convertNSDateFormat(),
										dateOutput: nonWorkingDay
									}
								);
							} else {
								fixedDates.push(nonWorkingDays[i].exceptiondate);
							}
						}

						if (nonWorkingDay) {
							if (nonWorkingDay.getTime() == dateTime) {
								isWorkDay = false;
								break;
							}
						}
					}

					if (atLeastOneDateIsBroken && that.fixLoggedForCalendars.indexOf(workCalendarId) === -1) {
						var payload = {
							RACG_user: RA.App.Context.context.name,
							RACG_email: RA.App.Context.context.email,
							RACG_company: RA.App.Context.context.company,
							RACG_ns_date_format: convertNSDateFormat(),
							RACG_work_calendar_id: workCalendarId,
							RACG_broken_dates: JSON.stringify(brokenDates),
							RACG_fixed_dates: JSON.stringify(fixedDates)
						};

						if (brokenDates.length === 0) {
							RA.Util.CustomFunctions.logIntoElasticSearch(
								"[PSA] RACG exception date - all errors FIXED INLINE " + RA.App.Context.context.email + " from company " + RA.App.Context.context.company + ".",
								payload
							);
						} else if (fixedDates.length === 0) {
							RA.Util.CustomFunctions.logIntoElasticSearch(
								"[PSA] RACG exception date - all have ERROR " + RA.App.Context.context.email + " from company " + RA.App.Context.context.company + ".",
								payload
							);
						} else {
							RA.Util.CustomFunctions.logIntoElasticSearch(
								"[PSA] RACG exception date - errors PARTIALLY FIXED INLINE " + RA.App.Context.context.email + " from company " + RA.App.Context.context.company + ".",
								payload
							);
						}

						that.fixLoggedForCalendars.push(workCalendarId);
					}
				}
			}

			this.setWorkDayToCache(dateTime, workCalendarId, isWorkDay);
		}

		return isWorkDay;
	},
	getWorkDayFromCache: function (dateTime, workCalendarId) {
		if (this.workDayCache.hasOwnProperty(workCalendarId)) {
			if (this.workDayCache[workCalendarId].hasOwnProperty(dateTime)) {
				return this.workDayCache[workCalendarId][dateTime];
			}
		}

		return null;
	},
	setWorkDayToCache: function (dateTime, workCalendarId, isWorkDay) {
		if (!this.workDayCache.hasOwnProperty(workCalendarId)) {
			this.workDayCache[workCalendarId] = {};
		}

		this.workDayCache[workCalendarId][dateTime] = isWorkDay;
	},
	isResourceTimeOff: function (resourceId, date) {
		var dateTime = date.getTime();
		var isTimeOff = this.getTimeOffFromCache(resourceId, dateTime);

		if (isTimeOff == null) {
			isTimeOff = false;

			var timeOffDates = RA.App.Stores.timeOff.getResourceTimeOffDates(resourceId);
			for (i in timeOffDates) {
				if (dateTime == timeOffDates[i]) {
					isTimeOff = true;
					break;
				}
			}

			this.setTimeOffToCache(resourceId, dateTime, isTimeOff);
		}

		return isTimeOff;
	},
	isBetweenResourceTimeOff: function (resourceId, dateStart, dateEnd) {
		var dateTimeStart = dateStart.getTime();
		var dateTimeEnd = dateEnd.getTime();
		var isTimeOff = false;

		var timeOffDates = RA.App.Stores.timeOff.getResourceTimeOffDates(resourceId);
		for (i in timeOffDates) {
			if (dateTimeStart <= timeOffDates[i] && timeOffDates[i] <= dateTimeEnd) {
				isTimeOff = true;
				break;
			}
		}

		return isTimeOff;
	},
	getTimeOffFromCache: function (resourceId, dateTime) {
		if (this.timeOffCache.hasOwnProperty(resourceId)) {
			if (this.timeOffCache[resourceId].hasOwnProperty(dateTime)) {
				return this.timeOffCache[resourceId][dateTime];
			}
		}

		return null;
	},
	setTimeOffToCache: function (resourceId, dateTime, isTimeOff) {
		if (!this.timeOffCache.hasOwnProperty(resourceId)) {
			this.timeOffCache[resourceId] = {};
		}

		this.timeOffCache[resourceId][dateTime] = isTimeOff;
	},
	isResourceWorkDay: function (resourceId, workCalendar, date) {
		return this.isWorkDay(date, workCalendar) && !this.isResourceTimeOff(resourceId, date);
	}
});

Ext4.define('RA.Util.TextMetrics', {
	extend: 'Ext4.Component',
	singleton: true,
	initComponent: function (config) {
		this.callParent(config);

		this.textMetricMap = {
			'14px': new Ext4.util.TextMetrics('ra-bind-14px'),
			'13px': new Ext4.util.TextMetrics('ra-bind-13px'),
			'12px': new Ext4.util.TextMetrics('ra-bind-12px')
		};
	},
	getMetrics: function (fontSize) {
		return this.textMetricMap[fontSize];
	}
});

// A singleton that contains any global custom functions
Ext4.define('RA.Util.CustomFunctions', {

	singleton: true,

	/*
	 * ES5 version of Object.assign
	 * Returns a newly merged object.
	 * Parameters are all the objects that should be merged together.
	 */
	mergeObjects: function mergeObjects() {
		var resObj = {};
		for (var i = 0; i < arguments.length; i++) {
			var obj = arguments[i];
			var keys = Object.keys(obj);
			for (var j = 0; j < keys.length; j++) {
				resObj[keys[j]] = obj[keys[j]];
			}
		}

		return resObj;
	},
	/**
	 * Log a message into Elastic Search - creates an XHTTP object, inserts parameters message and paramObject into it
	 *                                     and calls loggerservice.nl that saves the results into Elastic Search
	 * @param {string} message to log
	 * @param {object} any object with any properties we want to put into Elastic Search
	 * @returns {object}
	 */
	logIntoElasticSearch: function (message, paramObject) {
		paramObject = paramObject ? paramObject : {};

		var baseURL = window.location.protocol + '//' + window.location.host;
		var xhttp = new XMLHttpRequest();
		var data = [
			message,
			paramObject
		];
		var params = 'jrid=5&jrmethod=remoteObject.logMessage&jrparams=' + encodeURIComponent(JSON.stringify(data));


		xhttp.open("POST", baseURL + "/app/accounting/project/elastic/loggerservice.nl", true);
		xhttp.timeout = 1;
		xhttp.setRequestHeader('Content-type', 'application/x-www-form-urlencoded');

		xhttp.onreadystatechange = function () {
			if (this.readyState === 4 && this.status === 200) {
				// console.log(this.responseText);
			}
		};

		xhttp.send(params);

		return xhttp;
	},

	/**
	 * Utility function to rotate an array
	 * @param array array to rotate
	 * @param shift number of elements to move to the end of the array. Only positive values are accepted
	 * @returns {*}
	 */
	rotate: function (array, shift) {
		while (shift--) {
			array.push(array.shift());
		}
		return array;
	},

	/**
	 * Get first day of the week in Ext format (Ext: sun=0, sat=6, whereas NetSuite: sun='1', sat='0')
	 * @returns {number}
	 */
	getWeekStart: function () {
		var day = parseInt(RA.App.Context.getPreference('FIRSTDAYOFWEEK'));
		if (day === 0) {
			day = 6;
		} else {
			day--;
		}
		return day; // Ext sunday = 0, NS sunday = 1
	},
	/**
	 * Returns a correct day count even with daylight savings dates
	 * @param startTimestamp
	 * @param lastDate
	 * @param includingLastDay
	 * @returns {number}
	 */
	getDayCountBetweenTwoDates: function (startTimestamp, lastDate, includingLastDay) {
		var lastDay = (includingLastDay) ? 1 : 0;
		var dayMillis = 86400000;
		var elapsed = Math.abs(Ext4.Date.getElapsed(Ext4.Date.clearTime(startTimestamp, true),  Ext4.Date.clearTime(lastDate, true)));
		var elapsedDays = elapsed / dayMillis;
		// Math.round is there for allocations that span across daylight savings switch and the distance between two days is therefore not exact days (but an hour less or more)
		return Math.round(elapsedDays) + lastDay;
	}
});

Ext4.define('RA.Util.Benchmarking', {
	constants: {
		LOADING_ALLOCATIONS: 'loadingAllocations',
		LOADING_APP: 'loadingApp',
		LOADING_RESOURCES: 'loadingResources',
		SAVING_CHANGES: 'savingChanges'
	},
	singleton: true,
	timers: {},
	getDuration: function(idTimer) {
		var timer = this.timers[idTimer];
		if (timer && timer.start && timer.stop) {
			return (this.timers[idTimer].stop - this.timers[idTimer].start);
		} else {
			console.error('ERROR: Timer "' + idTimer + '" was set incorrectly.');
			return -1;
		}
	},
	getPayload: function(idTimer) {
		if (this.timers[idTimer]) {
			return this.timers[idTimer]["payload"];
		} else {
			console.error("ERROR: There is no timer called '" + idTimer + "' defined in the plugin.");
			return undefined;
		}
	},
	log: function(idTimer, message, data, withFilters) {
		data = RA.Util.CustomFunctions.mergeObjects(
			{
				RACG_duration: this.getDuration(idTimer),
				RACG_durationInSeconds: (this.getDuration(idTimer) / 1000).toFixed(2) + 's',
				RACG_user: RA.App.Context.context.name,
				RACG_email: RA.App.Context.context.email,
				RACG_company: RA.App.Context.context.company,
			},
			data
		);

		if (withFilters) {
			var filterValuesJson = RA.App.Filters.filterValuesRecord.get('filterValuesJson');
			var prefix = "RACG_filter_";

			for (const property in filterValuesJson) {
				let key = prefix + property;
				if (!data.hasOwnProperty(key)) {
					data[key] = (typeof(filterValuesJson[property]) === 'string') ? filterValuesJson[property] : JSON.stringify(filterValuesJson[property]);
				}
			}
		}

		RA.Util.CustomFunctions.logIntoElasticSearch(
			message,
			data
		);
	},
	start: function(idTimer, payload) {
		this.timers[idTimer] = {
			start: performance.now(),
			stop: 0,
			payload: payload
		};
	},
	stopAndGetPayload: function (idTimer) {
		this.stop(idTimer);
		return this.getPayload(idTimer);
	},
	stop: function(idTimer) {
		if (this.timers[idTimer]) {
			this.timers[idTimer]["stop"] = performance.now();
		} else {
			console.error("ERROR: You first need to start measuring '" + idTimer + "' before you stop it.");
		}
	},
});
Ext4.define('RA.Util.Dashboard', {
    singleton: true,
    _isActive: undefined,
    _projectId: undefined,
    isActive: function () {
        if(this._isActive === undefined) {
            this.init(window.location.href);
        }
        return this._isActive;
    },
    getProjectId: function () {
        if(this._projectId === undefined) {
            this.init(window.location.href);
        }
        return this._projectId;
    },
    init: function (url) {
        if (url.indexOf('?') < 0) {
            this.reset();
            return false;
        }
        var iHashtag = url.indexOf('#');
        url = url.slice(0, iHashtag > -1 ? iHashtag : url.length);
        url = url.slice(url.indexOf('?') + 1);
        var paramArray = url.split('&');
        var projectId;
        var isActive;

        for (var i in paramArray) {
            let paramPair = paramArray[i].split('=');

            switch (paramPair[0].toLowerCase()) {
                case 'isdashboard':
                    if (paramPair[1] === 'true') {
                        isActive = true;
                    }
                    break;
                case 'projectid':
                    if (
                        paramPair[1] !== undefined
                        && paramPair[1] !== ''
                    ) {
                        projectId = paramPair[1];
                    }
                    break;
            }
        }

        if (isActive && !isNaN(projectId)) {
            this._isActive = true;
            this._projectId = parseInt(projectId);
        } else {
            this.reset();
        }
    },
    reset: function () {
        this._isActive = false;
        this._projectId = undefined;
    }
});
