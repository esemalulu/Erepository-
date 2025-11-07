/**
 * Copyright � 2018, Oracle and/or its affiliates. All rights reserved.
 *
 * @author jjaramillo
 */
define(
	[
		'N/search',
		'../adapter/proj_racg_ad_log',
		'../adapter/proj_racg_ad_runtime'
	],

	function (nSearch, rLog, rRuntime) {
		var module = {
			SEARCH_RESULT_LIMIT: 1000
		};

		module.getCoreRecordTypes = function () {
			var types = nSearch.Type;
			types['FILE'] = 'file';
			return types;
		};

		module.getSearchOperators = function () {
			return nSearch.Operator;
		};

		module.getLogicalOperators = function () {
			return {
				AND: 'and',
				OR: 'or',
				NOT: 'not'
			};
		};

		module.getSortDirections = function () {
			return nSearch.Sort;
		};

		module.getConstantFilterValues = function () {
			return {
				NONE: '@NONE@'
			};
		};

		module.getSummaryTypes = function () {
			return nSearch.Summary;
		};

		module.create = function (options) {
			return nSearch.create(options);
		};

		module.load = function (options) {
			return nSearch.load(options);
		};

		module.createFilter = function (options) {
			return nSearch.createFilter(options);
		};

		module.createColumn = function (options) {
			return nSearch.createColumn(options);
		};

		module.startSearchTimer = function () {
			this.searchStartTime = new Date();
		};

		module.stopSearchTimer = function (params) {
			var runTime = (new Date()) - this.searchStartTime;
			rLog.debug('Search time for ' + (params.searchType || params.searchId) + ' is ' + runTime + 'ms');
		};

		module.getSearchResults = function (params) {
			rLog.startMethod('getSearchResults');
			this.startSearchTimer();
			var returnData = [];
			try {
				params.searchObject = this.getSearchObject(params);
				returnData = this.runSearch(params);
				this.stopSearchTimer(params);
			} catch (e) {
				rLog.handleError(e);
			}
			rLog.endMethod();
			return returnData;
		};

		module.getSearchObject = function (params) {
			rLog.startMethod('getSearchObject');
			var searchObject = null;
			if (params.searchId) {
				searchObject = this.load({id: params.searchId});
				searchObject.filters = (params.filters || []).concat(searchObject.filters);
				searchObject.columns = (params.columns || []).concat(searchObject.columns);
				if (params.filterExpression && params.filterExpression.length) {
					searchObject.filterExpression = params.filterExpression;
				}
			} else {
				var createParams = {
					type: params.searchType,
					filters: params.filters || [],
					columns: params.columns || []
				};
				if (params.filterExpression && params.filterExpression.length) {
					createParams.filterExpression = params.filterExpression;
				}
				searchObject = this.create(createParams);
			}
			rLog.endMethod();
			return searchObject;
		};

		module.runSearch = function (params) {
			rLog.startMethod('runSearch');
			var minimumGovernance = 100,
				resultSet = params.searchObject.run(),
				resultSubset = ['override'],
				forPagedResultsOnly = false,
				start = params.startIndex || 0,
				end = params.endIndex || 1000,
				returnData = [];
			while (resultSubset.length > 0 && !forPagedResultsOnly) {
				resultSubset = resultSet.getRange({
					start: parseInt(start),
					end: parseInt(end)
				});
				for (var i = 0; i < resultSubset.length; i++) {
					if (params.maxLength && returnData.length >= params.maxLength) {
						rLog.debug('Result length reached at max length: ' + params.maxLength);
						rLog.endMethod();
						return returnData;
					} else {
						returnData.push(resultSubset[i]);
					}
				}
				start = end;
				end = start + 1000;
				if (params.startIndex && params.endIndex) {
					forPagedResultsOnly = true; //should only run getRange once for the startIndex and endIndex
				}
				if (rRuntime.getRemainingUsage() < minimumGovernance) {
					rLog.debug('Governance limit has reached minimum threshold of 100');
					break;
				}
			}
			rLog.debug('Data size: ' + returnData.length);
			rLog.endMethod();
			return returnData;
		};

		return module;
	}
);