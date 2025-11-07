/**
 * Copyright © 2018, Oracle and/or its affiliates. All rights reserved.
 * @author kkung
 */
define(
	['N/error'],
	function (error) {
		var module = {};
		module.create = function (options) {
			if (!options.code) {
				options.code = 'RACG_ERROR';
			}
			return error.create(options);
		};

		return module;
	}
);

