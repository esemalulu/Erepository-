/**
 * Copyright � 2018, Oracle and/or its affiliates. All rights reserved.
 *
 * @author jjaramillo
 */
define(
	['N/render'],

	function (nRender) {
		var module = {};

		module.xmlToPdf = function (params) {
			return nRender.xmlToPdf(params);
		};

		return module;
	}
);
