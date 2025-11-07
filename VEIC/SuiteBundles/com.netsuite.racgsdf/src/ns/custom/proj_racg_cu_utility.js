/**
 * Copyright � 2018, Oracle and/or its affiliates. All rights reserved.
 *
 * @author jjaramillo
 */
define(
	[],

	function () {
		var module = {};

		module.isValidObject = function (objectToTest) {
			var isValidObject = false;
			isValidObject = (objectToTest != null && objectToTest != '' && objectToTest != undefined) ? true : false;
			return isValidObject;
		};

		module.booleanToString = function (booleanValue) {
			return booleanValue ? 'T' : 'F';
		};

		module.stringToBoolean = function (booleanString) {
			return booleanString === 'T';
		};

		return module;
	}
);