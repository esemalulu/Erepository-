/**
 * Copyright © 2018, Oracle and/or its affiliates. All rights reserved.
 *
 * @author pmiller
 */
define(
	['N/url'],

	function (nUrl) {
		var module = {
			resolveRecord: function (options) {
				return nUrl.resolveRecord(options);
			},

			resolveScript: function (options) {
				return nUrl.resolveScript(options);
			},

			resolveDomain: function (options) {
				return nUrl.resolveDomain(options);
			},

			getHostTypes: function () {
				return nUrl.HostType;
			}
		};

		return module;
	}
);