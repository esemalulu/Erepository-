/**
 * Copyright � 2018, Oracle and/or its affiliates. All rights reserved.
 *
 * @author jjaramillo
 */
define(
	['N/format'],

	function (nFormat) {
		var module = {};

		module.getTypes = function () {
			return nFormat.Type;
		};

		module.format = function (options) {
			return nFormat.format(options);
		};

		module.parse = function (options) {
			return nFormat.parse(options);
		};

		return module;
	}
);
