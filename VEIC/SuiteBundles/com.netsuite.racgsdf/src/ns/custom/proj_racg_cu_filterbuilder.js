/**
 * Copyright � 2018, Oracle and/or its affiliates. All rights reserved.
 *
 * @author kkung
 */
define(
	[
		'../adapter/proj_racg_ad_log',
		'../adapter/proj_racg_ad_record',
		'../adapter/proj_racg_ad_runtime',
		'../adapter/proj_racg_ad_search',
		'./proj_racg_cu_custom_segments'
	],

	function (rLog, rRecord, rRuntime, rSearch, rSegments) {
		var module = {};

		/*
		 * Build the search filters for Resource Allocation search
		 * @param {Object} params.requestParams - map of request parameters
		 * @return {Object} resourceAllocationFilters - resource allocation filter expressions interspersed by 'and' expressions
		 *                  projectResourceFilters - project resource filter expressions interspersed by 'and' expressions
		 */
		module.buildUserFilters = function (params) {
			rLog.startMethod('buildUserFilters');
			var resourceAllocationFilters = [],
				projectResourceFilters = [],
				requestParams = params.requestParams,
				resourceTypes = requestParams.entityTypeFilter ? requestParams.entityTypeFilter.toString().replace('1', 'Employee').replace('2', 'Vendor').replace('3', 'GenericRsrc') : '',
				searchOperators = rSearch.getSearchOperators(),
				logicalOperators = rSearch.getLogicalOperators(),
				andLogicalOperator = logicalOperators.AND,
				orLogicalOperator = logicalOperators.OR,
				noneFilterValue = rSearch.getConstantFilterValues().NONE;

			//Build Resource Allocation Filters
			if (!requestParams.showProjectTasks) {
				resourceAllocationFilters.push(['projecttask', searchOperators.IS, noneFilterValue], andLogicalOperator);
			} else if (requestParams.projectTaskFilter) {
				resourceAllocationFilters.push(['projecttask', searchOperators.ANYOF, requestParams.projectTaskFilter], andLogicalOperator);
			}
			if (requestParams.startDateFilter) {
				resourceAllocationFilters.push(['startdate', searchOperators.ONORAFTER, requestParams.startDateFilter], andLogicalOperator);
			}
			if (!requestParams.includeRejected) {
				resourceAllocationFilters.push(['approvalstatus', searchOperators.NONEOF, 6], andLogicalOperator); //6 = Rejected
			}
			if (requestParams.subsidiaryFilter !== null && requestParams.subsidiaryFilter.length > 0 && requestParams.childSubsidiary) {
				requestParams.subsidiaryFilter = rRecord.getRecordDescendants({
					recordType: 'subsidiary',
					selectedIds: requestParams.subsidiaryFilter
				});
			}
			if (requestParams.projectFilter) {
				resourceAllocationFilters.push(['project', searchOperators.ANYOF, requestParams.projectFilter.split(',')], andLogicalOperator);
			}
			if (requestParams.customerFilter) {
				resourceAllocationFilters.push(['job.customer', searchOperators.ANYOF, requestParams.customerFilter.split(',')], andLogicalOperator);
			}
			if (requestParams.allocationTypeFilter) {
				resourceAllocationFilters.push(['allocationtype', searchOperators.ANYOF, requestParams.allocationTypeFilter.split(',')], andLogicalOperator);
			}
			if (requestParams.approvalStatusFilter) {
				resourceAllocationFilters.push(['approvalstatus', searchOperators.ANYOF, requestParams.approvalStatusFilter.split(',')], andLogicalOperator);
			}
			if (requestParams.allocationLevelFilter) {
				resourceAllocationFilters.push(this.buildAllocationLevelFilters({
					searchOperators: searchOperators,
					logicalOperators: logicalOperators,
					allocationLevelFilter: requestParams.allocationLevelFilter
				}), andLogicalOperator);
			}
			if (!requestParams.incProjectTemplate) {
				resourceAllocationFilters.push(['projecttemplate.internalid', searchOperators.ANYOF, noneFilterValue], andLogicalOperator);
			} else {
				resourceAllocationFilters.push(['projecttemplate.isinactive', searchOperators.IS, 'F'], andLogicalOperator);
			}

			//Build Project Resource Filters
			if (requestParams.classFilter && rRuntime.isFeatureEnabled({feature: 'CLASSES'})) {
				projectResourceFilters.push(['employee.class', searchOperators.ANYOF, requestParams.classFilter], andLogicalOperator);
			}
			if (requestParams.deptFilter && rRuntime.isFeatureEnabled({feature: 'DEPARTMENTS'})) {
				projectResourceFilters.push(['employee.department', searchOperators.ANYOF, requestParams.deptFilter], andLogicalOperator);
			}
			if (requestParams.locationFilter && rRuntime.isFeatureEnabled({feature: 'LOCATIONS'})) {
				projectResourceFilters.push(['employee.location', searchOperators.ANYOF, requestParams.locationFilter], andLogicalOperator);
			}
			if (requestParams.vendorCatFilter) {
				projectResourceFilters.push(['vendor.category', searchOperators.ANYOF, requestParams.vendorCatFilter], andLogicalOperator);
			}
			if (requestParams.vendorTypeFilter && requestParams.vendorTypeFilter.length === 1) {
				projectResourceFilters.push(['vendor.isperson', searchOperators.IS, ((requestParams.vendorTypeFilter[0] === 1) ? 'T' : 'F')], andLogicalOperator);
			}

			var segmentTypes = rSegments.getSegmentTypes();
			var employeeSegments = rSegments.getEmployeeSegments();
			var vendorSegments = rSegments.getVendorSegments();
			var genericSegments = rSegments.getGenericResourceSegments();
			for (var i = 0; i < segmentTypes.length; i++) {
				var segmentType = segmentTypes[i].id;
				var segmentFilters = [];
				if (requestParams[segmentType]) {
					var eSegmentField = ('employee.' + segmentType).toString();
					var vSegmentField = ('vendor.' + segmentType).toString();
					var gSegmentField = ('genericresource.' + segmentType).toString();
					if (employeeSegments.indexOf(segmentType) != -1) segmentFilters.push([eSegmentField, searchOperators.ANYOF, requestParams[segmentType]], orLogicalOperator);
					if (vendorSegments.indexOf(segmentType) != -1) segmentFilters.push([vSegmentField, searchOperators.ANYOF, requestParams[segmentType]], orLogicalOperator);
					if (genericSegments.indexOf(segmentType) != -1) segmentFilters.push([gSegmentField, searchOperators.ANYOF, requestParams[segmentType]], orLogicalOperator);
					segmentFilters.pop();
					if (segmentFilters.length == 1) // this is quite ugly, but Search Engine can't handle [[A or B]] as a part of filter tree, whereas [[A or B] and [C or D]] is fine
						segmentFilters = segmentFilters[0];
					projectResourceFilters.push(segmentFilters, andLogicalOperator);

				}
			}

			var filter = this.buildBillingClassAndSubsidiaryFilters({
				requestParams: requestParams,
				searchOperators: searchOperators,
				logicalOperators: logicalOperators,
				resourceTypes: resourceTypes
			});
			
			if (filter && filter.length) {
				projectResourceFilters = projectResourceFilters.concat(filter, andLogicalOperator);
			}

			//Concatenate for Resource Allocation
			if (projectResourceFilters.length) {
				resourceAllocationFilters = resourceAllocationFilters.concat(projectResourceFilters);
			}

			//Unique filters for both
			if (!requestParams.entityTypeFilter) {
				resourceAllocationFilters.push(['resource.type', searchOperators.ANYOF, ['Employee', 'Vendor', 'GenericRsrc']], andLogicalOperator);
				projectResourceFilters.push(['type', searchOperators.ANYOF, ['Employee', 'Vendor', 'GenericRsrc']], andLogicalOperator);
			} else {
				resourceAllocationFilters.push(['resource.type', searchOperators.ANYOF, resourceTypes.split(',')], andLogicalOperator);
				projectResourceFilters.push(['type', searchOperators.ANYOF, resourceTypes.split(',')], andLogicalOperator);
			}

			if (requestParams.resourceSearch) {
				resourceAllocationFilters.push(['resource.entityid', searchOperators.CONTAINS, requestParams.resourceSearch], andLogicalOperator);
				projectResourceFilters.push(['entityid', searchOperators.CONTAINS, requestParams.resourceSearch], andLogicalOperator);
			}
			if (requestParams.resourcesFilter) {
				resourceAllocationFilters.push(['resource', searchOperators.ANYOF, requestParams.resourcesFilter], andLogicalOperator);
				projectResourceFilters.push(['internalid', searchOperators.ANYOF, requestParams.resourcesFilter], andLogicalOperator);
			}

			resourceAllocationFilters.pop(); //Remove the last "and" operators
			projectResourceFilters.pop();

			rLog.endMethod();
			return {
				resourceAllocationFilters: resourceAllocationFilters,
				projectResourceFilters: projectResourceFilters
			};
		};

		/*
		 * Build the building class and subsidiary search filters
		 * @param {Object} params.requestParams - map of request parameters
		 * @param {Object} params.searchOperators - map of search operators to be used in filter expressions
		 * @param {Object} params.logicalOperators - map of logical operators to be used in filter expressions
		 * @param {String} params.resourceTypes - comma separated string indicating which resource types are selected in the resource type filter dropdown
		 * @return {Array} array of billing class and/or subsidiary filter expressions interspersed by 'or' and 'and' expression(s)
		 */
		module.buildBillingClassAndSubsidiaryFilters = function (params) {
			rLog.startMethod('buildBillingClassAndSubsidiaryFilters');
			var billingClassAndSubsidiaryFilters = [],
				requestParams = params.requestParams,
				searchOperators = params.searchOperators,
				orLogicalOperator = params.logicalOperators.OR,
				andLogicalOperator = params.logicalOperators.AND,
				resourceTypes = params.resourceTypes;
			if (!requestParams.entityTypeFilter) {
				if (requestParams.billingClassFilter) {
					billingClassAndSubsidiaryFilters.push([
						['employee.billingclass', searchOperators.ANYOF, requestParams.billingClassFilter], orLogicalOperator,
						['vendor.billingclass', searchOperators.ANYOF, requestParams.billingClassFilter], orLogicalOperator,
						['genericresource.billingclass', searchOperators.ANYOF, requestParams.billingClassFilter]
					], andLogicalOperator);
				}
				if (requestParams.subsidiaryFilter) {
					billingClassAndSubsidiaryFilters.push([
						['employee.subsidiary', searchOperators.ANYOF, requestParams.subsidiaryFilter], orLogicalOperator,
						['vendor.subsidiary', searchOperators.ANYOF, requestParams.subsidiaryFilter], orLogicalOperator,
						['genericresource.subsidiary', searchOperators.ANYOF, requestParams.subsidiaryFilter]
					], andLogicalOperator);
				}
				billingClassAndSubsidiaryFilters.pop(); //remove the last AND element
				if (billingClassAndSubsidiaryFilters.length == 1) // this is quite ugly, but Search Engine can't handle [[A or B]] as a part of filter tree, whereas [[A or B] and [C or D]] is fine
					billingClassAndSubsidiaryFilters = billingClassAndSubsidiaryFilters[0];
			} else {
				if (resourceTypes.indexOf('Employee') !== -1) {
					if (requestParams.billingClassFilter) {
						billingClassAndSubsidiaryFilters.push(['employee.billingclass', searchOperators.ANYOF, requestParams.billingClassFilter], andLogicalOperator);
					}
					if (requestParams.subsidiaryFilter) {
						billingClassAndSubsidiaryFilters.push(['employee.subsidiary', searchOperators.ANYOF, requestParams.subsidiaryFilter], andLogicalOperator);
					}
				}
				if (resourceTypes.indexOf('Vendor') !== -1) {
					if (requestParams.billingClassFilter) {
						billingClassAndSubsidiaryFilters.push(['vendor.billingclass', searchOperators.ANYOF, requestParams.billingClassFilter], andLogicalOperator);
					}
					if (requestParams.subsidiaryFilter) {
						billingClassAndSubsidiaryFilters.push(['vendor.subsidiary', searchOperators.ANYOF, requestParams.subsidiaryFilter], andLogicalOperator);
					}
				}
				if (resourceTypes.indexOf('GenericRsrc') !== -1) {
					if (requestParams.billingClassFilter) {
						billingClassAndSubsidiaryFilters.push(['genericresource.billingclass', searchOperators.ANYOF, requestParams.billingClassFilter], andLogicalOperator);
					}
					if (requestParams.subsidiaryFilter) {
						billingClassAndSubsidiaryFilters.push(['genericresource.subsidiary', searchOperators.ANYOF, requestParams.subsidiaryFilter], andLogicalOperator);
					}
				}
				billingClassAndSubsidiaryFilters.pop(); //remove the last AND element
			}

			rLog.endMethod();
			return billingClassAndSubsidiaryFilters;
		};

		/*
		 * Build the allocation level search filters
		 * @param {Object} params.searchOperators - map of search operators to be used in filter expressions
		 * @param {String} params.allocationLevelFilter - string of integer values based on selected values in the allocation level filter dropdown
		 * @return {Array} array of allocation level filter expressions interspersed by 'or' expression(s)
		 */
		module.buildAllocationLevelFilters = function (params) {
			rLog.startMethod('buildAllocationLevelFilters');
			var allocationLevelFilters = [],
				searchOperators = params.searchOperators,
				orLogicalOperator = params.logicalOperators.OR;
			levels = params.allocationLevelFilter.split(','),
				levelMap = {
					2: ['percentoftime', searchOperators.BETWEEN, [1, 25]],
					3: ['percentoftime', searchOperators.BETWEEN, [26, 50]],
					4: ['percentoftime', searchOperators.BETWEEN, [51, 75]],
					5: ['percentoftime', searchOperators.BETWEEN, [76, 100]],
					6: ['percentoftime', searchOperators.GREATERTHAN, 100]
				};
			levels = levels.filter(function (level) {
				return (level >= 2 && level <= 6);
			});
			if (levels.length === 1) {
				allocationLevelFilters.push(levelMap[levels[0]]);
			} else if (levels.length === 2) {
				allocationLevelFilters.push(levelMap[levels[0]]);
				allocationLevelFilters.push(orLogicalOperator);
				allocationLevelFilters.push(levelMap[levels[1]]);
			} else if (levels.length > 2) {
				for (var int = 0; int < levels.length - 1; int++) {
					allocationLevelFilters.push(levelMap[levels[int]]);
					allocationLevelFilters.push(orLogicalOperator);
				}
				allocationLevelFilters.push(levelMap[levels[levels.length - 1]]);
			}
			rLog.endMethod();
			return allocationLevelFilters;
		};

		return module;
	}
);