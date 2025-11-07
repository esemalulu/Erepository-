/**
 * Copyright © 2018, Oracle and/or its affiliates. All rights reserved.
 *
 * @author pmiller
 */
define(
	[
		'../adapter/proj_racg_ad_log',
		'../adapter/proj_racg_ad_format',
		'../custom/proj_racg_cu_utility',
		'./proj_racg_cu_custom_segments'
	],

	function (rLog, rFormat, rUtility, rSegments) {
		var module = {};

		/*
		 * Build request parameters for consumption of other methods
		 *
		 * @param {Object} params.request - http.ServerRequest
		 * @returns {Object} - map of request parameters that have been null checked or typecasted
		 */
		module.buildRequestParameters = function (params) {
			rLog.startMethod('buildRequestParameters');
			var request = params.request.parameters,
				requestParams = {
					isPaging: request.isPaging == 'T',
					includeRejected: request.includeRejected == 'T',
					allocationUnit: request.allocatinUnit || 'P',
					limit: parseInt(request.limit) || 20,
					start: parseInt(request.start) || 0,
					startDateFilter: (rUtility.isValidObject(request.startDate) ? rFormat.format({
						value: new Date(request.startDate),
						type: rFormat.getTypes().DATE
					}) : null),
					endDateFilter: (rUtility.isValidObject(request.endDate) ? rFormat.format({
						value: new Date(request.endDate),
						type: rFormat.getTypes().DATE
					}) : null),
					entityTypeFilter: (rUtility.isValidObject(request.entityTypeFilter) ? request.entityTypeFilter : null), // null filter means all project resource
					resourcesFilter: (rUtility.isValidObject(request.resourcesFilter) ? request.resourcesFilter.split(',') : null),
					subsidiaryFilter: (rUtility.isValidObject(request.subsidiaryFilter) ? request.subsidiaryFilter.split(',') : null),
					billingClassFilter: (rUtility.isValidObject(request.billingClassFilter) ? request.billingClassFilter.split(',') : null),
					classFilter: (rUtility.isValidObject(request.classFilter) ? request.classFilter.split(',') : null),
					deptFilter: (rUtility.isValidObject(request.deptFilter) ? request.deptFilter.split(',') : null),
					locationFilter: (rUtility.isValidObject(request.locationFilter) ? request.locationFilter.split(',') : null),
					childSubsidiary: (rUtility.isValidObject(request.childSubsidiary) ? (request.childSubsidiary == 'true') : false),
					vendorTypeFilter: (rUtility.isValidObject(request.vendorTypeFilter) ? request.vendorTypeFilter.split(',') : null),
					vendorCatFilter: (rUtility.isValidObject(request.vendorCategoryFilter) ? request.vendorCategoryFilter.split(',') : null),
					resourceSearch: (rUtility.isValidObject(request.resourceSearch) ? request.resourceSearch : null),
					projectFilter: (rUtility.isValidObject(request.projectFilter) ? request.projectFilter : null),
					projectTaskFilter: (rUtility.isValidObject(request.projectTaskFilter) ? request.projectTaskFilter.split(',') : null),
					customerFilter: (rUtility.isValidObject(request.customerFilter) ? request.customerFilter : null),
					allocationTypeFilter: (rUtility.isValidObject(request.allocationTypeFilter) ? request.allocationTypeFilter : null),
					approvalStatusFilter: (rUtility.isValidObject(request.approvalStatusFilter) ? request.approvalStatusFilter : null),
					allocationLevelFilter: (rUtility.isValidObject(request.allocationLevelFilter) ? request.allocationLevelFilter : null),
					viewResourcesBy: (rUtility.isValidObject(request.viewResourcesBy) ? +request.viewResourcesBy : 1),
					resourceId: request.resourceId || null
				};
			var segmentTypes = rSegments.getSegmentTypes();
			for (var i = 0; i < segmentTypes.length; i++) {
				var segmentType = segmentTypes[i].id;
				requestParams[segmentType] = (rUtility.isValidObject(request[segmentType]) ? request[segmentType].split(',') : null);
			}
			requestParams.showAllResources = (request.showAllResources == 'T' && requestParams.viewResourcesBy === 1);
			requestParams.showProjectTasks = (request.showProjectTasks == 'T' && requestParams.viewResourcesBy === 1);
			requestParams.incProjectTemplate = (request.incProjectTemplate == 'T' && requestParams.viewResourcesBy !== 2);
			if (requestParams.isPaging) {
				requestParams.limit = null;
			}

			rLog.debug(JSON.stringify(requestParams));
			rLog.endMethod();
			return requestParams;
		};

		return module;
	}
);