/**
 * Copyright 2018, Oracle and/or its affiliates. All rights reserved.
 *
 * @author kkung
 * @NScriptName PSA RACG SU RA Count
 * @NScriptId _proj_racg_su_ra_count
 * @NScriptType suitelet
 * @NApiVersion 2.x
 */
define(
	[
		'../adapter/proj_racg_ad_log',
		'../adapter/proj_racg_ad_search',
		'../custom/proj_racg_cu_filterbuilder',
		'../custom/proj_racg_cu_request_builder'
	],

	function (rLog, rSearch, rFilterBuilder, rRequestBuilder) {
		var module = {};
		module.strResAllocationSearchId = 'customsearch_proj_racg_count';
		module.strProjResourceSearchId = 'customsearch_proj_racg_cnt_project_rsrc';

		/*
		 * Suitelet Default function
		 *
		 * @param {Object} params - onRequest Object
		 * @returns {Void}
		 */
		module.onRequest = function (params) {
			rLog.startMethod('onRequest');
			var requestParams = rRequestBuilder.buildRequestParameters({
					request: params.request
				}),
				userFilters = rFilterBuilder.buildUserFilters({
					requestParams: requestParams
				}),
				jsonReturnData = {
					success: true,
					Id: '0',
					Name: 'root',
					message: 'Count Resource Allocations',
					total: '0',
					children: []
				};
			try {
				jsonReturnData.total = this.countResourceAllocation({
					requestParams: requestParams,
					userFilters: userFilters
				});

			} catch (e) {
				jsonReturnData.success = false;
				jsonReturnData.message = 'Failed to load resource data';
				rLog.handleError(e);
			}
			params.response.write(JSON.stringify(jsonReturnData));
			rLog.endMethod();
		};

		/*
		 * Build search Count Resource Allocation or Project Resource
		 * @param {Object} params.requestParams - http request data
		 * @param {Object} params.userFilters - resource and project resource filter expressions interspersed by 'and' expressions
		 * @return {Integer} total Resource count
		 */
		module.countResourceAllocation = function (params) {
			rLog.startMethod('countResourceAllocation');
			rLog.debug('params: ' + JSON.stringify(params));
			var requestParams = params.requestParams,
				strSearchId = (requestParams.showAllResources) ?
							  this.strProjResourceSearchId : this.strResAllocationSearchId,
				searchObject = rSearch.load({id: strSearchId});

			//ShowAllResource saved search already have configured columns
			if (!requestParams.showAllResources) {
				this.appendSearchColumns({
					searchObject: searchObject,
					requestParams: requestParams
				});
			}

			this.appendSearchFilters({
				searchObject: searchObject,
				requestParams: requestParams,
				userFilters: params.userFilters
			});

			var total = 0,
				resultSet = searchObject.run(),
				rangedResults = resultSet.getRange({start: 0, end: 1});

			if (rangedResults && rangedResults.length) {

				switch (requestParams.viewResourcesBy) {
					case 1:
						if (requestParams.showAllResources) {
							total = +(rangedResults[0].getValue({name: 'internalid', summary: 'count'}));
						} else {
							total = +(rangedResults[0].getValue({name: 'resource', summary: 'count'}));
						}
						break;
					case 2:
						total = +(rangedResults[0].getValue({name: 'customer', summary: 'count'}));
						break;
					case 3:
						total = +(rangedResults[0].getValue({name: 'project', summary: 'count'}));
						break;
				}
			}

			rLog.endMethod();
			return total;
		};

		/*
		 * Append search object's columns
		 * @param {Object} params.searchObject - search object to modify
		 * @param {Object} params.requestParams - http request data
		 * @return {None}
		 */
		module.appendSearchColumns = function (params) {
			rLog.startMethod('appendSearchColumns');
			var searchObject = params.searchObject,
				requestParams = params.requestParams;

			switch (requestParams.viewResourcesBy) {
				case 1:
					searchObject.columns.push(rSearch.createColumn({name: 'resource', summary: 'count'}));
					break;
				case 2:
					searchObject.columns.push(rSearch.createColumn({name: 'customer', summary: 'count'}));
					break;
				case 3:
					searchObject.columns.push(rSearch.createColumn({name: 'project', summary: 'count'}));
					break;
			}

			rLog.endMethod();
		};

		/*
		 * Append search object's filters
		 * @param {Object} params.searchObject - search object to modify
		 * @param {Object} params.userFilters - resource and project resource filter expressions interspersed by 'and' expressions
		 * @param {Object} params.requestParams - http request data
		 * @return {None}
		 */
		module.appendSearchFilters = function (params) {
			rLog.startMethod('appendSearchFilters');
			var searchObject = params.searchObject,
				requestParams = params.requestParams,
				userFilters = params.userFilters,
				logicalOperators = rSearch.getLogicalOperators(),
				searchOperators = rSearch.getSearchOperators(),
				andLogicalOperator = logicalOperators.AND,
				filterExpression = searchObject.filterExpression;
			appendExpression = [];

			//Append Filters
			if (requestParams.showAllResources && userFilters.projectResourceFilters.length) {
				appendExpression.push(userFilters.projectResourceFilters, andLogicalOperator);
			} else if (userFilters.resourceAllocationFilters.length) {
				appendExpression.push(userFilters.resourceAllocationFilters, andLogicalOperator);
			}

			if (requestParams.viewResourcesBy == 2) {
				appendExpression.push(['customer.isinactive', searchOperators.IS, 'F'], andLogicalOperator);
				appendExpression.push(['customer.stage', searchOperators.IS, 'CUSTOMER'], andLogicalOperator);
			}
			appendExpression.pop();

			if (appendExpression.length) {
				if (searchObject.filterExpression.length) {
					filterExpression.push(andLogicalOperator);
				}
				filterExpression.push(appendExpression);
				searchObject.filterExpression = filterExpression;
			}

			rLog.endMethod();
		};

		return module;
	}
);