/**
 * Copyright � 2018, Oracle and/or its affiliates. All rights reserved.
 *
 * @author jjaramillo
 * @NScriptName PSA RACG SU Allocation
 * @NScriptId _proj_racg_su_allocation
 * @NScriptType suitelet
 * @NApiVersion 2.x
 */
define(
	[
		'../adapter/proj_racg_ad_format',
		'../adapter/proj_racg_ad_log',
		'../adapter/proj_racg_ad_runtime',
		'../adapter/proj_racg_ad_search',
		'../custom/proj_racg_cu_date',
		'../custom/proj_racg_cu_filterbuilder',
		'../custom/proj_racg_cu_request_builder',
		'../custom/proj_racg_cu_translation',
		'../custom/proj_racg_cu_utility'
	],

	function (rFormat, rLog, rRuntime, rSearch, rDate, rFilterBuilder, rRequestBuilder, rTranslation, rUtility) {
		var module = {};

		/*
		 * Suitelet Default function
		 *
		 * @param {Object} params - onRequest Object
		 * @returns {None}
		 */
		module.onRequest = function (params) {
			rLog.startMethod('onRequest');
			var jsonReturnData = {
				success: true,
				message: 'Loaded Right Pane Data',
				data: []
			};
			try {
				var requestParams = rRequestBuilder.buildRequestParameters({
						request: params.request
					}),
					searchObject = rSearch.load({
						id: 'customsearch_proj_racg_resource_alloc'
					}),
					allocationFilters = rFilterBuilder.buildUserFilters({
						requestParams: requestParams,
						searchObject: searchObject
					}).resourceAllocationFilters;

				jsonReturnData.data = this.buildAllocationData({
					requestParams: requestParams,
					searchObject: searchObject,
					allocationFilters: allocationFilters
				});
			} catch (e) {
				jsonReturnData.success = false;
				jsonReturnData.message = 'Failed to load allocation data';
				rLog.handleError(e);
			}
			params.response.write(JSON.stringify(jsonReturnData));
			rLog.endMethod();
		};

		/*
		 * Initialize translation strings; ideally this runs only once
		 */
		module.initTranslations = function () {
			module.translations = {
				'DISPLAY.NONE': rTranslation.getTranslationOfKey({key: 'DISPLAY.NONE'}),
				'LEGEND.HARD': rTranslation.getTranslationOfKey({key: 'LEGEND.HARD'}),
				'LEGEND.SOFT': rTranslation.getTranslationOfKey({key: 'LEGEND.SOFT'})
			};
		};

		/*
		 * Build the allocation data for the right pane to be consumed by the chartEvent store
		 * @param {Object} params.searchObject - search object loaded by saved search customsearch_proj_racg_resource_alloc
		 * @param {Array} params.allocationFilters - array of filter expressions interspersed by 'and' expressions
		 * @param {Object} params.requestParams - map of request parameters
		 * @returns {Array} array of allocation data
		 */
		module.buildAllocationData = function (params) {
			rLog.startMethod('buildAllocationData');

			var searchObject = params.searchObject,
				requestParams = params.requestParams;

			this.initTranslations();

			this.appendSearchFilters({
				searchObject: searchObject,
				requestParams: requestParams,
				allocationFilters: params.allocationFilters
			});

			var resultSet = searchObject.run(),
				allocationData = [],
				limit = 1000,
				start = 0,
				end = start + limit,
				length = limit;

			do {
				var rangedResults = resultSet.getRange({
					start: start,
					end: end
				});
				length = rangedResults.length;

				for (var int = 0; int < length; int++) {
					var eachResult = rangedResults[int],
						resultAllocParams = {
							eachResult: eachResult,
							alloc: this.createBaseAllocationData({
								eachResult: eachResult,
								requestParams: requestParams
							}),
							requestParams: requestParams
						};
					this.addProjectOrProjectTemplateData(resultAllocParams);
					this.addProjectTask(resultAllocParams);
					this.addName(resultAllocParams);
					this.addDates(resultAllocParams);
					this.addCustomer(resultAllocParams);
					this.addResourceId(resultAllocParams);
					this.addFrequency(resultAllocParams);
					this.addApprovalDetails(resultAllocParams);

					allocationData.push(resultAllocParams.alloc);
				}

				start = end;
				end = start + limit;
			} while (length === limit);
			rLog.debug('Allocation data size: ' + allocationData.length);
			rLog.endMethod();
			return allocationData;
		};

		/*
		 * Create allocation object with static values
		 * @param {Object} params.eachResult - each allocation record from the search results
		 * @param {Object} params.requestParams - map of request parameters
		 * @returns {Object} base - key value map of initial non-changing allocation data
		 */
		module.createBaseAllocationData = function (params) {
			rLog.startMethod('createBaseAllocationData');
			var eachResult = params.eachResult,
				base = {
					Id: eachResult.getValue({name: 'internalid'}),
					ResourceId: 'placeholder',
					allocId: eachResult.getValue({name: 'internalid'}),
					resourceId: eachResult.getValue({name: 'resource'}),
					resourceName: eachResult.getText({name: 'resource'}),
					projectId: eachResult.getValue({name: 'company'}),
					projectName: eachResult.getValue({name: 'companyname', join: 'job'}),
					customerId: eachResult.getValue({name: 'customer'}),
					hour: eachResult.getValue({name: 'numberhours'}),
					percent: eachResult.getValue({name: 'percentoftime'}),
					unitName: eachResult.getValue({name: 'allocationunit'}),
					unit: params.requestParams.allocationUnit,
					type: parseInt(eachResult.getValue({name: 'allocationtype'})) === 2 ? 'Soft' : 'Hard',
					typeId: eachResult.getValue({name: 'allocationtype'}),
					comment: eachResult.getValue({name: 'notes'}),
					tipResource: eachResult.getText({name: 'resource'}),
					tipStart: eachResult.getValue({name: 'startdate'}).toString(),
					tipEnd: eachResult.getValue({name: 'enddate'}).toString(),
					requestedBy: eachResult.getText({name: 'requestedby'}),
					frequency: eachResult.getValue({name: 'frequency'})
				};
			rLog.endMethod();
			return base;
		};

		/*
		 * Add project or project template data to the base allocation object
		 * @param {Object} params.eachResult - each allocation record from the search results
		 * @param {Object} params.alloc - base allocation object that will accumulate data
		 * @returns {None}
		 */
		module.addProjectOrProjectTemplateData = function (params) {
			rLog.startMethod('addProjectOrProjectTemplateData');
			var alloc = params.alloc,
				eachResult = params.eachResult,
				isProject = (rUtility.isValidObject(eachResult.getValue({name: 'internalid', join: 'job'})) &&
							 !rUtility.isValidObject(eachResult.getValue({
								 name: 'internalid',
								 join: 'projecttemplate'
							 })));
			alloc.Resizable = isProject;
			alloc.Draggable = isProject;
			alloc.tipProject = eachResult.getValue({name: 'companyname', join: 'job'});
			if (!isProject) {
				alloc.tipProject = eachResult.getValue({name: 'entityid', join: 'projecttemplate'});
				alloc.status = 'template';
			}
			rLog.endMethod();
		};

		/*
		 * Add project task, if available or 0 to indicate that there is no project task, to the base allocation object
		 * @param {Object} params.eachResult - each allocation record from the search results
		 * @param {Object} params.alloc - base allocation object that will accumulate data
		 * @returns {None}
		 */
		module.addProjectTask = function (params) {
			rLog.startMethod('addProjectTask');
			params.alloc.taskId = params.eachResult.getValue({name: 'projecttask'}) || 0;
			params.alloc.tipTask = params.eachResult.getText({name: 'projecttask'}) || this.translations['DISPLAY.NONE'];
			rLog.endMethod();
		};

		/*
		 * Add percent or hours, as name, to the base allocation object
		 * @param {Object} params.eachResult - each allocation record from the search results
		 * @param {Object} params.alloc - base allocation object that will accumulate data
		 * @param {Object} params.requestParams - map of request parameters
		 * @returns {None}
		 */
		module.addName = function (params) {
			rLog.startMethod('addName');
			params.alloc.Name = params.requestParams.allocationUnit == 1 ? params.eachResult.getValue({name: 'percentoftime'}) : params.eachResult.getValue({name: 'numberhours'});
			rLog.endMethod();
		};

		/*
		 * Add startTimestamp, endTimestamp to the base allocation object
		 * @param {Object} params.eachResult - each allocation record from the search results
		 * @param {Object} params.alloc - base allocation object that will accumulate data
		 * @returns {None}
		 */
		module.addDates = function (params) {
			rLog.startMethod('addDates');
			params.alloc.startTimestamp = this.convertAndParseDate({dateValue: params.eachResult.getValue({name: 'startdate'})});
			params.alloc.endTimestamp = this.convertAndParseDate({
				dateValue: params.eachResult.getValue({name: 'enddate'}),
				addDays: 1
			});
			rLog.endMethod();
		};

		/*
		 * Call formatter and parser and add days if necessary to the date object
		 * @param {Object} params.eachResult - each allocation record from the search results
		 * @param {Object} params.alloc - base allocation object that will accumulate data
		 * @returns {None}
		 */
		module.convertAndParseDate = function (params) {
			rLog.startMethod('convertAndParseDate');
			var dateObject = null,
				dateTypeFormat = rFormat.getTypes().DATE;
			if (params.addDays) {
				dateObject = rDate.addDays({
					dateObject: rFormat.parse({
						value: params.dateValue,
						type: dateTypeFormat
					}),
					numberOfDays: params.addDays
				});
			} else {
				dateObject = rFormat.parse({
					value: params.dateValue,
					type: dateTypeFormat
				});
			}
			dateObject = rDate.convertToFormat({
				dateObject: dateObject,
				format: 'yyyy/MM/dd'
			});
			rLog.endMethod();
			return dateObject;
		};

		/*
		 * Add individual customer name or company name to the base allocation object
		 * @param {Object} params.eachResult - each allocation record from the search results
		 * @param {Object} params.alloc - base allocation object that will accumulate data
		 * @returns {None}
		 */
		module.addCustomer = function (params) {
			rLog.startMethod('addCustomer');
			params.alloc.customer = (params.eachResult.getValue({name: 'isperson'}) == 'T' ?
									 params.eachResult.getValue({
										 name: 'firstname',
										 join: 'customer'
									 }) + ' ' + params.eachResult.getValue({name: 'lastname', join: 'customer'}) :
									 params.eachResult.getValue({name: 'companyname', join: 'customer'}));
			rLog.endMethod();
		};

		/*
		 * Add hierarchy mapping ID to the base allocation object
		 * @param {Object} params.alloc - base allocation object that will accumulate data
		 * @param {Object} params.requestParams - map of request parameters
		 * @returns {None}
		 */
		module.addResourceId = function (params) {
			rLog.startMethod('addResourceId');
			var alloc = params.alloc,
				mappingId = [];
			switch (params.requestParams.viewResourcesBy) {
				case 1:
					mappingId = [alloc.resourceId, alloc.projectId, alloc.taskId];
					break;
				case 2:
					mappingId = [alloc.customerId, alloc.projectId, alloc.resourceId];
					break;
				case 3:
					mappingId = [alloc.projectId, alloc.resourceId];
					break;
			}
			alloc.ResourceId = mappingId.join('~');
			rLog.endMethod();
		};

		/*
		 * Add frequency data if applicable to the base allocation object
		 * @param {Object} params.eachResult - each allocation record from the search results
		 * @param {Object} params.alloc - base allocation object that will accumulate data
		 * @returns {None}
		 */
		module.addFrequency = function (params) {
			rLog.startMethod('addFrequency');
			var alloc = params.alloc,
				eachResult = params.eachResult;
			if (alloc.frequency && alloc.frequency !== 'NONE') {
				alloc.period = eachResult.getValue({name: 'period'});
				alloc.dayOfWeek = eachResult.getValue({name: 'dow'});
				alloc.dayOfWeekMask = eachResult.getValue({name: 'dowmask'});
				alloc.dayOfWeekInMonth = eachResult.getValue({name: 'dowim'});
				alloc.seriesStartDate = this.convertAndParseDate({dateValue: params.eachResult.getValue({name: 'seriesstartdate'})});
				alloc.seriesEndDate = this.convertAndParseDate({dateValue: params.eachResult.getValue({name: 'endbydate'})});
			}
			rLog.endMethod();
		};

		/*
		 * Add approval details if applicable to the base allocation object
		 * @param {Object} params.eachResult - each allocation record from the search results
		 * @param {Object} params.alloc - base allocation object that will accumulate data
		 * @returns {None}
		 */
		module.addApprovalDetails = function (params) {
			rLog.startMethod('addApprovalDetails');
			var alloc = params.alloc,
				eachResult = params.eachResult;
			if (rRuntime.getCurrentUserPreference({preference: 'CUSTOMAPPROVALRSRCALLOC'})) {
				alloc.approvalStatus = eachResult.getValue({name: 'approvalstatus'});
				alloc.approvalStatusName = eachResult.getText({name: 'approvalstatus'});
				alloc.nextApprover = eachResult.getValue({name: 'nextapprover'});
				alloc.nextApproverName = eachResult.getText({name: 'nextapprover'});
				alloc.tipAppStatus = eachResult.getText({name: 'approvalstatus'});
				alloc.tipApprover = eachResult.getText({name: 'nextapprover'});
			}
			rLog.endMethod();
		};

		/*
		 * Append search object's filters
		 * @param {Object} params.searchObject - search object to modify
		 * @param {Object} params.requestParams - suitelet parameters
		 * @param {Array} params.allocationFilters - filters based from user input
		 * @returns {None}
		 */
		module.appendSearchFilters = function (params) {
			rLog.startMethod('appendSearchFilters');
			var searchObject = params.searchObject,
				requestParams = params.requestParams,
				allocationFilters = params.allocationFilters,
				isSearchOperator = rSearch.getSearchOperators().IS,
				andLogicalOperator = rSearch.getLogicalOperators().AND,
				appendExpression = [];

			if (allocationFilters && allocationFilters.length) {
				appendExpression.push(allocationFilters, andLogicalOperator);
			}

			if (requestParams.viewResourcesBy === 2) {
				appendExpression.push(['customer.stage', isSearchOperator, 'CUSTOMER'], andLogicalOperator);
				appendExpression.push(['customer.isinactive', isSearchOperator, 'F'], andLogicalOperator);
			}
			appendExpression.pop();

			if (appendExpression.length) {
				var filterExpression = searchObject.filterExpression; //Copy to variable as filterExpression is immutable
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