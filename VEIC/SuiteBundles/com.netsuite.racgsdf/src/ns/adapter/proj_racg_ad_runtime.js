/**
 * Copyright © 2018, Oracle and/or its affiliates. All rights reserved.
 *
 * @author jjaramillo
 */
define(
	[
		'N/runtime',
		'../adapter/proj_racg_ad_log'
	],

	function (nRuntime, rLog) {
		var module = {
			//For bundle copies
			//scompid:bundleid
			bundleCopyId: {
				'3682089': '242664'//pmiller
			}
		};

		//This key must be present in the options parameter - feature, which holds the internal ID of the feature to be checked
		module.isFeatureEnabled = function (options) {
			return nRuntime.isFeatureInEffect(options);
		};

		module.getCurrentScript = function () {
			return nRuntime.getCurrentScript();
		};

		module.getRemainingUsage = function () {
			return this.getCurrentScript().getRemainingUsage();
		};

		module.getCurrentUser = function () {
			return nRuntime.getCurrentUser();
		};

		module.getCurrentUserPreference = function (params) {
			return this.getCurrentUser().getPreference({
				name: params.preference
			});
		};

		module.getAccountId = function () {
			return nRuntime.accountId;
		};

		module.getBundleId = function () {
			var accountId = this.getAccountId();

			if (this.bundleCopyId.hasOwnProperty(accountId)) {
				return this.bundleCopyId[accountId];
			}

			return this.getCurrentScript().bundleIds[0];
		};

		return module;
	}
);
