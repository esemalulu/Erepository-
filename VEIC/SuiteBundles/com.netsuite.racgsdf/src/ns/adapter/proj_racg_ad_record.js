/**
 * Copyright � 2018, Oracle and/or its affiliates. All rights reserved.
 *
 * @author jjaramillo
 */
define(
	[
		'N/record',
		'../adapter/proj_racg_ad_log',
		'../adapter/proj_racg_ad_search'
	],

	function (nRecord, rLog, rSearch) {
		var module = {};

		module.create = function (options) {
			return nRecord.create(options);
		};

		module.load = function (options) {
			return nRecord.load(options);
		};

		module.delete = function (options) {
			return nRecord.delete(options);
		};

		module.getTypes = function () {
			return nRecord.Type;
		};

		module.getRecordDescendants = function (params) {
			rLog.startMethod('getRecordDescendants');
			var ids = [],
				selectedIds = params.selectedIds;
			if (selectedIds) {
				for (var i = 0; i < selectedIds.length; i++) {
					ids = ids.concat(this.getAllDescendants({
						recordType: params.recordType,
						parentId: selectedIds[i]
					}));
				}
				ids = ids.concat(selectedIds).sort().filter(function (elem, pos, self) {
					return self.indexOf(elem) == pos;
				});
			}
			rLog.endMethod();
			return ids;
		};

		module.getAllDescendants = function (params) {
			rLog.startMethod('getAllDescendants');
			var searchOperators = rSearch.getSearchOperators(),
				searchFilters = [
					rSearch.createFilter({
						name: 'isinactive',
						operator: searchOperators.IS,
						values: 'F'
					}),
					rSearch.createFilter({
						name: 'parent',
						operator: searchOperators.EQUALTO,
						values: params.parentId
					})
				],
				searchColumns = [rSearch.createColumn({name: 'internalid'})],
				search = rSearch.create({
					type: params.recordType,
					filters: searchFilters,
					columns: searchColumns
				}),
				results = search.run(),
				idList = [],
				response = [],
				ids = null;
			results.each(function (searchResult) {
				idList.push(searchResult.getValue('internalid'));
				return true;
			});
			if (idList.length > 0) {
				for (var i = 0; i < idList.length; i++) {
					var id = idList[i];
					if (id && id > 0) {
						ids = this.getAllDescendants({
							recordType: params.recordType,
							parentId: id
						});
					}
					if (ids && ids.length > 0) {
						response = response.concat(ids);
					}
				}
				response = response.concat(idList);
			}
			rLog.endMethod();
			return response;
		};

		return module;
	}
);