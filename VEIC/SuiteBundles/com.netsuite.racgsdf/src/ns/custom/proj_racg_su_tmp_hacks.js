/**
 * Copyright � 2018, Oracle and/or its affiliates. All rights reserved.
 *
 * @author jmarek
 */
define(
	['N/log', 'N/search', 'N/runtime'],
	function (nLog, nSearch, nRuntime) {
		var module = {};

		module.issue582355AddSearchFields = function (searchObject, resourceType) {
			var affectedCompIds = [
				'5543196', // jmarek test account
				'3859183', // customer: issue 582355
				'5222535', // customer: issue 588427
				'4147968', // QA test account
				'4199456' // QA test account
			];

			var compId = nRuntime.accountId;

			if (affectedCompIds.indexOf(compId) >= 0) {
				// Remove file filters
				var filters = searchObject.filters;
				var newFilters = [];

				for (var i = 0; i < filters.length; i++) {
					var filter = filters[i];

					if (filter.name === 'folder' && filter.join === 'file') {
						continue;
					}

					if (filter.name === 'formulatext' && filter.formula === '{file.folder}') {
						continue;
					}

					newFilters.push(filter);
				}
				searchObject.filters = newFilters;

				// remove file fields
				var columns = searchObject.columns;
				var newColumns = [];

				for (var i = 0; i < columns.length; i++) {
					column = columns[i];
					if (column.join === 'file') {
						continue;
					}
					newColumns.push(column);
				}
				searchObject.columns = newColumns;
			}
		};

		return module;
	}
);