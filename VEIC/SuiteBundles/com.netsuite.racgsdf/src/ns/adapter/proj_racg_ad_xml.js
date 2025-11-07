/**
 * Copyright � 2018, Oracle and/or its affiliates. All rights reserved.
 *
 * @author jjaramillo
 */
define(
	['N/xml'],

	function (nXml) {
		var module = {};

		module.getParser = function () {
			return nXml.Parser;
		};

		return module;
	}
);
