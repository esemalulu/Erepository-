/**
 * Copyright � 2018, Oracle and/or its affiliates. All rights reserved.
 *
 * @author jjaramillo
 */
define(
	[
		'../adapter/proj_racg_ad_log',
		'../adapter/proj_racg_ad_format'
	],

	function (rLog, rFormat) {
		var module = {};

		/*
		 * Add days to date object
		 * @param {Date} dateObject - Date to add
		 * @param {Integer} numberOfDays - days to add
		 * @return {Date} added date
		 */
		module.addDays = function (params) {
			rLog.startMethod('addDays');
			var dateObject = params.dateObject;
			dateObject.setDate(dateObject.getDate() + params.numberOfDays);
			rLog.endMethod();
			return dateObject;
		};

		/*
		 * Convert Date object to String
		 * @param {Date} dateObject - Date to convert
		 * @param {String} format - date format to convert to
		 * @return {String} time only base from format
		 */
		module.convertToFormat = function (params) {
			rLog.startMethod('convertToFormat');
			var dateObject = params.dateObject || new Date(),
				strYear = dateObject.getFullYear().toString(),
				strMonth = ('0' + (dateObject.getMonth() + 1)).slice(-2),
				strDate = ('0' + dateObject.getDate()).slice(-2),
				strMonthName = dateObject.toLocaleString('en-us').split(' ')[0];
			dateString = '';
			switch (params.format.toUpperCase()) {
				case 'MM/DD/YYYY':
					dateString = [strMonth, strDate, strYear].join('/');
					break;
				case 'DD/MM/YYYY':
					dateString = [strDate, strMonth, strYear].join('/');
					break;
				case 'DD-MON-YYYY':
					dateString = [strDate, strMonthName.slice(0, 3), strYear].join('-');
					break;
				case 'DD.MM.YYYY':
					dateString = [strDate, strMonth, strYear].join('.');
					break;
				case 'DD-MONTH-YYYY':
					dateString = [strDate, strMonthName, strYear].join('-');
					break;
				case 'DD MONTH, YYYY':
					dateString = strDate + ' ' + strMonthName + ', ' + strYear;
					break;
				case 'YYYY/MM/DD':
					dateString = [strYear, strMonth, strDate].join('/');
					break;
				case 'YYYY-MM-DD':
					dateString = [strYear, strMonth, strDate].join('-');
					break;
			}
			rLog.endMethod();
			return dateString;
		};

		/*
		 * Convert Time to format to HH:MM
		 * @param {String} time - time format including seconds
		 * @return {String} time only in HHMM
		 */
		module.convertTimeToHHMM = function (time) {
			rLog.startMethod('convertTimeToHHMM');

			function pad(num) {
				var s = "00" + num;
				return s.substr(s.length - 2);
			};
			var retTime = Math.floor(time) + ':' + pad(Math.round(60 * (time % 1)));
			rLog.endMethod();
			return retTime;
		};

		/*
		 * Convert NS Date directly to specified format
		 *
		 * @param {Date}   date   - NS Date object
		 * @param {String} format - date format string
		 * @return {String} formatted date string
		 */
		module.dateToFormat = function (params) {
			rLog.startMethod('dateToFormat');

			var convertedDate = this.convertToFormat({
				dateObject: rFormat.parse({
					value: params.date,
					type: rFormat.getTypes().DATE
				}),
				format: params.format
			});

			rLog.endMethod();
			return convertedDate;
		};

		/*
		 * Convert date string to date object
		 * @param {String} dateString - date string
		 * @return {Date} converted according to date format preference
		 */
		module.dateStringToDateObject = function (dateString) {
			rLog.startMethod('dateStringToDateObject');
			var dateObject = rFormat.parse({
				value: new Date(dateString),
				type: rFormat.getTypes().DATE
			});
			rLog.endMethod();
			return dateObject;
		};

		return module;
	}
);