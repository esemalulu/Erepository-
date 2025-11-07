/**
 * Copyright � 2018, Oracle and/or its affiliates. All rights reserved.
 *
 * @author jjaramillo
 */
define(
	['N/encode'],

	function (nEncode) {
		var module = {};

		module.convert = function (params) {
			return nEncode.convert(params);
		};

		module.getEncoding = function () {
			return nEncode.Encoding;
		};

		return module;
	}
);
