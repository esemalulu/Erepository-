/**
 * Copyright © 2018, Oracle and/or its affiliates. All rights reserved.
 *
 * @author pmiller
 */
define(
	['N/ui/serverWidget'],

	function (nServerWidget) {
		var module = {
			createForm: function (options) {
				return nServerWidget.createForm(options);
			},
			getFieldTypes: function () {
				return nServerWidget.FieldType;
			}
		};

		return module;
	}
);