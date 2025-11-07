/**
 * Copyright � 2018, Oracle and/or its affiliates. All rights reserved.
 *
 * @author jjaramillo
 */
define(
	['N/http'],

	function (nHttp) {
		var module = {
			getMethods: function (params) {
				return nHttp.Method;
			}
		};

		return module;
	}
);
