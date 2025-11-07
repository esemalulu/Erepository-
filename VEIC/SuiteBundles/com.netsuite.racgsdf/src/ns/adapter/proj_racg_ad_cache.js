/**
 * Copyright � 2018, Oracle and/or its affiliates. All rights reserved.
 *
 * @author jjaramillo
 */
define(
	['N/cache'],

	function (nCache) {
		var module = {
			getCache: function (params) {
				return nCache.getCache(params);
			},

			getScope: function () {
				return nCache.Scope;
			},

			put: function (params) {
				return nCache.put(params);
			},

			get: function (params) {
				return nCache.get(params);
			}
		};

		return module;
	}
);
