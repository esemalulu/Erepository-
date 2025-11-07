/**
 * Copyright © 2018, Oracle and/or its affiliates. All rights reserved.
 *
 * @author jjaramillo
 */
define(
	['N/config'],

	function (nConfig) {
		var module = {};

		module.isAccountPreferenceEnabled = function (params) {
			var configObject = nConfig.load({
				type: nConfig.Type.ACCOUNTING_PREFERENCES
			});
			return configObject.getValue({fieldId: params.fieldId});
		};

		return module;
	}
);
