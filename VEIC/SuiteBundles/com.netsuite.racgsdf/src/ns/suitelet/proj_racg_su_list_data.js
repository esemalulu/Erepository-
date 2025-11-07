/**
 * Copyright � 2018, Oracle and/or its affiliates. All rights reserved.
 *
 * @author jjaramillo
 * @NScriptName PSA RACG SU List Data
 * @NScriptId _proj_racg_su_list_data
 * @NScriptType suitelet
 * @NApiVersion 2.x
 */
define(
	[
		'../adapter/proj_racg_ad_config',
		'../adapter/proj_racg_ad_format',
		'../adapter/proj_racg_ad_http',
		'../adapter/proj_racg_ad_log',
		'../adapter/proj_racg_ad_record',
		'../adapter/proj_racg_ad_runtime',
		'../adapter/proj_racg_ad_search',
		'../custom/proj_racg_cu_date',
		'../custom/proj_racg_cu_translation',
		'../custom/proj_racg_cu_utility',
		'../suitelet/proj_racg_su_settings',
		'../suitelet/proj_racg_su_work_calendars',
		'../custom/proj_racg_cu_custom_segments',
		'N/query'
	],

	function (rConfig, rFormat, rHttp, rLog, rRecord, rRuntime, rSearch, rDate, rTranslation, rUtility, rSettings, rWorkCalendars, rSegments, nQuery) {
		var module = {};
		var defaultPageSize = 50;

		/*
		 * Suitelet Default function
		 *
		 * @param {Object} params - onRequest Object
		 * @returns {Void}
		 */
		module.onRequest = function (params) {
			rLog.startMethod('onRequest');
			rLog.debug('params.request: ' + JSON.stringify(params.request.parameters));
			try {
				var returnData = {
						success: true,
						total: 0,
						data: []
					},
					requestParams = this.buildRequestParams(params.request.parameters);
				if (params.request.method !== rHttp.getMethods().GET) {
					throw('ERROR: Request method is incorrect: ' + params.request.method);
				}
				rLog.debug('Initial Usage: ' + rRuntime.getRemainingUsage());
				if (!requestParams.removeAll || requestParams.removeAll === 'F') {
					returnData.data.push({
						id: '',
						name: rTranslation.getTranslationOfKey({key: 'STORE.-ALL-'})
					});
				}
				returnData.data = returnData.data.concat(this.getListData(requestParams));
				returnData.total = returnData.data.length;
				rLog.debug('Remaining Usage: ' + rRuntime.getRemainingUsage());
			} catch (e) {
				if (e && e.getCode && e.getDetails) {
					returnData.message = 'System Error: ' + e.getCode() + ': ' + e.getDetails();
				} else {
					returnData.message = 'Unexpected Error: ' + e;
				}
				returnData.success = false;
				returnData.message = 'Failed to process settings. ' + returnData.message;
				rLog.handleError(e);
				rLog.debug('Remaining Usage: ' + rRuntime.getRemainingUsage());
			}
			rLog.debug('returnData: ' + JSON.stringify(returnData));
			params.response.write(JSON.stringify(returnData));
			rLog.endMethod();
		};

		/*
		 * Parse and build the request parameters
		 * @param {Object} requestParams - parameters from http.ServerRequest
		 * @returns {Object} - map of request parameters that have been null checked or typecasted
		 */
		module.buildRequestParams = function (requestParams) {
			rLog.startMethod('buildRequestParams');
			var params = {
				searchType: requestParams.searchType,
				removeAll: requestParams.removeAll,
				range: requestParams.range === 'T',
				startIndex: requestParams.startIndex,
				endIndex: requestParams.endIndex,
				nameStartsWith: requestParams.nameStartsWith,
				id: requestParams.entityId || 0,
				resourcesFilter: requestParams.resourcesFilter || null,
				jobFilter: requestParams.jobFilter || null,
				customerFilter: requestParams.customerFilter || null,
				taskFilter: requestParams.taskFilter || null,
				projectFilter: requestParams.projectFilter || null,
				billingClassFilter: requestParams.billingClassFilter || null,
				subsidiaryFilter: requestParams.subsidiaryFilter || null,
				classFilter: requestParams.classFilter || null,
				deptFilter: requestParams.deptFilter || null,
				locationFilter: requestParams.locationFilter || null,
				vendorTypeFilter: requestParams.vendorTypeFilter || null,
				vendorCatFilter: requestParams.vendorCategoryFilter || null,
				childSubsidiary: requestParams.childSubsidiary,
				childDepartment: requestParams.childDepartment,
				childClassification: requestParams.childClassification,
				childLocation: requestParams.childLocation,
				segment: requestParams.segment,
				showInactives: rUtility.stringToBoolean(requestParams.showInactives),
				incProjectTemplate: rUtility.stringToBoolean(requestParams.incProjectTemplate),
				filters: [],
				filterExpression: [],
				columns: []
			};
			if (requestParams.subsidiaryFilter && requestParams.subsidiaryFilter.length > 0 && requestParams.childSubsidiary) {
				params.subsidiaryFilter = rRecord.getRecordDescendants({
					recordType: 'subsidiary',
					selectedIds: requestParams.subsidiaryFilter
				});
			}
			rLog.endMethod();
			return params;
		};

		/*
		 * Get specific list data based on search type
		 * @param {Object} - map of request parameters
		 */
		module.getListData = function (requestParams) {
			rLog.startMethod('getListData');
			var searchData = [];
			switch (requestParams.searchType) {
				case 'department':
					searchData = this.getDepartments(requestParams);
					break;
				case 'classification':
					searchData = this.getClasses(requestParams);
					break;
				case 'location':
					searchData = this.getLocations(requestParams);
					break;
				case 'billingclass':
					searchData = this.getBillingClasses(requestParams);
					break;
				case 'job':
					searchData = this.getProjects(requestParams);
					break;
				case 'projecttask':
					searchData = this.getProjectTasks(requestParams);
					break;
				case 'projectresource':
					searchData = this.getProjectResources(requestParams);
					break;
				case 'employee':
					searchData = this.getEmployeesAsApprovers(requestParams);
					break;
				case 'employees':
					searchData = this.getEmployeesAsProjectResources(requestParams);
					break;
				case 'vendor':
					searchData = this.getVendors(requestParams);
					break;
				case 'vendorcategory':
					searchData = this.getVendorCategories(requestParams);
					break;
				case 'genericresource':
					searchData = this.getGenericResources(requestParams);
					break;
				case 'subsidiary':
					searchData = this.getSubsidiaries(requestParams);
					break;
				case 'customer':
					searchData = this.getCustomers(requestParams);
					break;
				case 'filterResource':
					searchData = this.getResourceFilters();
					break;
				case 'filterAllocation':
					searchData = this.getAllocationFilters();
					break;
				case 'resourceSegment':
					searchData = this.getResourceSegments();
					break;
				case 'resourceSegmentTypes':
					searchData = this.getResourceSegmentTypes();
					break;
				case 'resourceSegmentValues':
					searchData = this.getResourceSegmentValues(requestParams);
					break;
				default:
					throw ('PARAMETER_ERROR: Invalid search type: ' + requestParams.searchType);
			}
			rLog.endMethod();

			return searchData;
		};

		/*
		 * Get departments
		 * @param {Object} - map of request parameters
		 */
		module.getDepartments = function (requestParams) {
			if (!rRuntime.isFeatureEnabled({feature: 'DEPARTMENTS'})) {
				return [];
			}

			rLog.startMethod('getDepartments');

			var hasIndices = this.areIndicesSet(requestParams);

			var totalCount = null;
			var SQLColumns = "" +
							 "SELECT id, \n" +
							 "       fullname AS name \n";
			var SQLFromAndWhere = "" +
								  "FROM   department \n" +
								  "WHERE  isinactive = 'F' \n" +
								  ((requestParams.nameStartsWith) ? " AND UPPER(name) LIKE UPPER('" + requestParams.nameStartsWith + "%') \n" : "") +
								  "ORDER BY name ASC";

			var query = SQLColumns + SQLFromAndWhere;

			if (requestParams.range) {
				totalCount = this.getTotalResultsCount(SQLFromAndWhere);
				query = this.addRangeToSQLString(SQLColumns + SQLFromAndWhere, totalCount);
			} else if (hasIndices) {
				query = this.addIndicesToSQLString(query, requestParams.startIndex, requestParams.endIndex);
			}

			var queryResults = nQuery.runSuiteQL(query);

			var results = [];

			queryResults.results.forEach(function (res) {
				var resObj = {
					id: res.values[0],
					name: res.values[1]
				};

				if (hasIndices) {
					resObj['type'] = 'department';
				}

				results.push(resObj);
				return true;
			});

			if (requestParams.range) {
				results = this.convertResultsToRange(results, totalCount);
			}

			rLog.endMethod();

			return results;
		};

		/*
		 * Get classes
		 * @param {Object} - map of request parameters
		 */
		module.getClasses = function (requestParams) {
			if (!rRuntime.isFeatureEnabled({feature: 'CLASSES'})) {
				return [];
			}

			rLog.startMethod('getClasses');

			var hasIndices = this.areIndicesSet(requestParams);

			var totalCount = null;
			var SQLColumns = "" +
							 "SELECT id, \n" +
							 "       fullname AS name \n";
			var SQLFromAndWhere = "" +
								  "FROM   classification \n" +
								  "WHERE  isinactive = 'F' \n" +
								  ((requestParams.nameStartsWith) ? " AND UPPER(name) LIKE UPPER('" + requestParams.nameStartsWith + "%') \n" : "") +
								  "ORDER BY name ASC";

			var query = SQLColumns + SQLFromAndWhere;

			if (requestParams.range) {
				totalCount = this.getTotalResultsCount(SQLFromAndWhere);
				query = this.addRangeToSQLString(SQLColumns + SQLFromAndWhere, totalCount);
			} else if (hasIndices) {
				query = this.addIndicesToSQLString(query, requestParams.startIndex, requestParams.endIndex);
			}

			var queryResults = nQuery.runSuiteQL(query);

			var results = [];

			queryResults.results.forEach(function (res) {
				var resObj = {
					id: res.values[0],
					name: res.values[1]
				};

				if (hasIndices) {
					resObj["type"] = 'classification';
				}

				results.push(resObj);

				return true;
			});

			if (requestParams.range) {
				results = this.convertResultsToRange(results, totalCount);
			}

			rLog.endMethod();

			return results;
		};

		/*
		 * Get locations
		 * @param {Object} - map of request parameters
		 */
		module.getLocations = function (requestParams) {
			if (!rRuntime.isFeatureEnabled({feature: 'LOCATIONS'})) {
				return [];
			}

			rLog.startMethod('getLocations');

			var hasIndices = this.areIndicesSet(requestParams);

			var totalCount = null;
			var SQLColumns = "" +
							 "SELECT id, \n" +
							 "       fullname AS name \n";
			var SQLFromAndWhere = "" +
								  "FROM   location \n" +
								  "WHERE  isinactive = 'F' \n" +
								  ((requestParams.nameStartsWith) ? " AND UPPER(name) LIKE UPPER('" + requestParams.nameStartsWith + "%') \n" : "") +
								  "ORDER BY id ASC";

			var query = SQLColumns + SQLFromAndWhere;

			if (requestParams.range) {
				totalCount = this.getTotalResultsCount(SQLFromAndWhere);
				query = this.addRangeToSQLString(SQLColumns + SQLFromAndWhere, totalCount);
			} else if (hasIndices) {
				query = this.addIndicesToSQLString(query, requestParams.startIndex, requestParams.endIndex);
			}

			var queryResults = nQuery.runSuiteQL(query);

			var results = [];

			queryResults.results.forEach(function (res) {
				var resObj = {
					id: res.values[0],
					name: res.values[1]
				};

				if (hasIndices) {
					resObj["type"] = 'location';
				}

				results.push(resObj);

				return true;
			});

			if (requestParams.range) {
				results = this.convertResultsToRange(results, totalCount);
			}

			rLog.endMethod();
			return results;
		};

		/*
		 * Get billing classes
		 * @param {Object} - map of request parameters
		 */
		module.getBillingClasses = function (requestParams) {
			if (!rRuntime.isFeatureEnabled({feature: 'BILLINGCLASSES'})) {
				return [];
			}

			rLog.startMethod('getBillingClasses');

			var hasIndices = this.areIndicesSet(requestParams);

			var totalCount = null;
			var SQLColumns = "" +
							 "SELECT billingClass.id AS id, \n" +
							 "       billingClass.name AS name \n";
			var SQLFromAndWhere = "" +
								  "FROM   billingClass \n" +
								  "WHERE  billingClass.isinactive = 'F' \n" +
								  ((requestParams.nameStartsWith) ? " AND UPPER(billingClass.name) LIKE UPPER('" + requestParams.nameStartsWith + "%') \n" : "") +
								  "ORDER BY billingClass.name ASC";

			var query = SQLColumns + SQLFromAndWhere;

			if (requestParams.range) {
				totalCount = this.getTotalResultsCount(SQLFromAndWhere);
				query = this.addRangeToSQLString(SQLColumns + SQLFromAndWhere, totalCount);
			} else if (hasIndices) {
				query = this.addIndicesToSQLString(query, requestParams.startIndex, requestParams.endIndex);
			}

			var queryResults = nQuery.runSuiteQL(query);

			var results = [];

			queryResults.results.forEach(function (res) {
				var resObj = {
					id: res.values[0],
					name: res.values[1]
				};

				if (hasIndices) {
					resObj["type"] = 'billingclass';
				}

				results.push(resObj);

				return true;
			});

			if (requestParams.range) {
				results = this.convertResultsToRange(results, totalCount);
			}

			return results;
		};

		/*
	 * Returns the internalid of the Estimated Work field depending on whether the Planned Work feature is enabled or not
	 *
	 * @returns {String} internalid
	 */
		module.getEstimatedTimeId = function () {
			return rRuntime.isFeatureEnabled({feature: 'plannedwork'}) ? 'plannedwork' : 'estimatedtimeoverride';
		};

		/*
		 * Get projects
		 * @param {Object} - map of request parameters
		 */
		module.getProjects = function (requestParams) {
			rLog.startMethod('getProjects');

			var estimatedTimeId = this.getEstimatedTimeId();
			var hasIndices = this.areIndicesSet(requestParams);

			var areSubsidiariesEnabled = rRuntime.isFeatureEnabled({feature: 'SUBSIDIARIES'});
			var totalCount = null;

			var SQLColumns = "" +
							 "SELECT job.id AS id, \n" +
							 "       job.altname AS name, \n" +
							 "       customer.altname AS customer, \n" +
							 "       customer.id AS customerId, \n" +
							 "       job.startdate AS startDate, \n" +
							 "       job.calculatedenddate AS endDate, \n" +
							 "       (SELECT COUNT(1) total FROM projectTask WHERE projectTask.project = job.id) AS taskCount, \n" +
							 "       job." + estimatedTimeId + " AS estimate, \n" +
							 "       job.actualTime AS actual, \n" +
							 "       job.timeremaining AS remaining, \n" +
							 "       job.percenttimecomplete AS percent, \n" +
							 "       job.allocatedtime AS allocated, \n" +
							 "       job.companyname AS projectName\n";
			var SQLFromAndWhere = "" +
								  "FROM   job, \n" +
								  ((requestParams.subsidiaryFilter && areSubsidiariesEnabled) ? " projectSubsidiaryRelationship, \n" : "") +
								  "       customer \n" +
								  "WHERE  job.customer = customer.id(+) \n" +
								  ((requestParams.subsidiaryFilter && areSubsidiariesEnabled) ? " AND job.id = projectSubsidiaryRelationship.entity(+) \n" : "") +
								  "       AND NVL(job.isinactive, 'F') = 'F' \n" +
								  "       AND (\n" +
								  "           job.entitystatus != 1 \n" +
								  "           OR \n" +
								  "           job.entitystatus IS NULL\n" +
								  "       ) \n" +
								  ((requestParams.jobFilter) ? " AND job.id IN (" + requestParams.jobFilter + ") \n" : "") +
								  ((requestParams.nameStartsWith) ? " AND (UPPER(job.companyname) LIKE UPPER('" + requestParams.nameStartsWith + "%') OR UPPER(job.altname) LIKE UPPER('" + requestParams.nameStartsWith + "%'))  \n" : "") +
								  ((requestParams.subsidiaryFilter && areSubsidiariesEnabled) ? " AND projectSubsidiaryRelationship.subsidiary IN (" + requestParams.subsidiaryFilter.join(', ') + ") \n" : "") +
								  "ORDER BY name ASC";

			var query = SQLColumns + SQLFromAndWhere;

			if (!requestParams.range && !hasIndices && !requestParams.jobFilter && !requestParams.nameStartsWith) {
				var maxDropDownSize = rRuntime.getCurrentUserPreference({preference: 'MAXDROPDOWNSIZE'});
				requestParams.startIndex = 0;
				requestParams.endIndex = maxDropDownSize ? maxDropDownSize : 0;
				hasIndices = true;
			}

			if (requestParams.range) {
				totalCount = this.getTotalResultsCount(SQLFromAndWhere);
				query = this.addRangeToSQLString(SQLColumns + SQLFromAndWhere, totalCount);
			} else if (hasIndices) {
				query = this.addIndicesToSQLString(query, requestParams.startIndex, requestParams.endIndex);
			}

			var queryResults = nQuery.runSuiteQL(query);

			var results = [];
			var _this = this;

			queryResults.results.forEach(function (res) {
				var resObj = {
					type: 'job',
					id: res.values[0],
					name: res.values[1],
					customer: res.values[2],
					customerId: res.values[3],
					startDate: res.values[4],
					endDate: (res.values[5]) ? res.values[5] : '',
					taskCount: res.values[6],
					estimate: _this.convertHtoHMM(res.values[7]),
					actual: _this.convertHtoHMM(res.values[8]),
					remaining: _this.convertHtoHMM(res.values[9]),
					percent: parseFloat(res.values[10]).toFixed(1) + '%',
					allocated: _this.convertHtoHMM(res.values[11]),
					projectTitle: res.values[12] // projectName is already used for project full name
				};

				results.push(resObj);

				return true;
			});

			if (requestParams.range) {
				results = this.convertResultsToRange(results, totalCount);
			} else {
				if (!hasIndices) {
					if (requestParams.incProjectTemplate) {
						results = results.concat(this.getProjectTemplates(requestParams));
					}
				}
			}

			rLog.endMethod();
			return results;
		};

		/*
		 * Get project templates
		 * @param {Object} - map of request parameters
		 */
		module.getProjectTemplates = function (requestParams) {
			rLog.startMethod('getProjectTemplates');

			var estimatedTimeId = this.getEstimatedTimeId();
			var hasIndices = this.areIndicesSet(requestParams);

			var totalCount = null;
			var SQLColumns = "" +
							 "SELECT projectTemplate.id AS id, \n" +
							 "       projectTemplate.entityid AS entityid, \n" +
							 "       projectTemplate." + estimatedTimeId + " AS " + estimatedTimeId + ", \n" +
							 "       projectTemplate.startdate AS startdate \n";
			var SQLFromAndWhere = "" +
								  "FROM   projectTemplate, projectTemplateSubsidiaryRelationship \n" +
								  "WHERE  projectTemplate.id = projectTemplateSubsidiaryRelationship.entity(+) \n" +
								  "       AND NVL(projectTemplate.isinactive, 'F') = 'F' \n" +
								  ((requestParams.jobFilter) ? " AND projectTemplate.id IN (" + requestParams.jobFilter + ") \n" : "") +
								  ((requestParams.nameStartsWith) ? " AND UPPER(projectTemplate.entityid) LIKE UPPER('" + requestParams.nameStartsWith + "%') \n" : "") +
								  ((requestParams.subsidiaryFilter && rRuntime.isFeatureEnabled({feature: 'SUBSIDIARIES'})) ? " AND projectTemplateSubsidiaryRelationship.subsidiary IN (" + requestParams.subsidiaryFilter.join(", ") + ") \n" : "");

			var query = SQLColumns + SQLFromAndWhere;

			if (requestParams.range) {
				totalCount = this.getTotalResultsCount(SQLFromAndWhere);
				query = this.addRangeToSQLString(SQLColumns + SQLFromAndWhere, totalCount);
			} else if (hasIndices) {
				query = this.addIndicesToSQLString(query, requestParams.startIndex, requestParams.endIndex);
			}

			var queryResults = nQuery.runSuiteQL(query);

			var results = [];
			var _this = this;

			queryResults.results.forEach(function (res) {
				results.push({
					id: res.values[0],
					name: res.values[1],
					estimate: _this.convertHtoHMM(res.values[2]),
					startDate: res.values[3]
				});
				return true;
			});

			if (requestParams.range) {
				results = this.convertResultsToRange(results, totalCount);
			}

			rLog.endMethod();

			return results;
		};

		/*
		 * Get project tasks
		 * @param {Object} - map of request parameters
		 */
		module.getProjectTasks = function (requestParams) {
			rLog.startMethod('getProjectTasks');

			var hasIndices = this.areIndicesSet(requestParams);

			var dateFormatType = rFormat.getTypes().DATE;

			var totalCount = null;
			var SQLColumns = "" +
							 "SELECT projectTask.id AS id, \n" +
							 "       projectTask.fullname AS name, \n" +
							 "       projectTask.startdatetime AS startDate, \n" +
							 "       projectTask.enddate AS enddDate \n";
			var SQLFromAndWhere = "" +
								  "FROM   projectTask, \n" +
								  "       job \n" +
								  "WHERE  projectTask.project = job.id(+) \n" +
								  "       AND NVL(projectTask.issummarytask, 'F') = 'F' \n" +
								  "       AND NVL(job.isinactive, 'F') = 'F' \n" +
								  "       AND ( \n" +
								  "           NOT(job.entitystatus IN (1)) \n" +
								  "           OR job.entitystatus IS NULL \n" +
								  "       ) \n" +
								  ((requestParams.taskFilter) ? " AND projectTask.id IN (" + requestParams.taskFilter + ") \n" : "") +
								  ((requestParams.jobFilter) ? " AND job.id IN (" + requestParams.jobFilter + ") \n" : "") +
								  ((requestParams.nameStartsWith) ? " AND UPPER(projectTask.title) LIKE UPPER('" + requestParams.nameStartsWith + "%') \n" : "") +
								  ((requestParams.projectFilter) ? " AND job.id IN (" + requestParams.projectFilter + ") \n" : "") +
								  "ORDER BY name ASC";

			var query = SQLColumns + SQLFromAndWhere;

			if (!requestParams.range && !hasIndices && !requestParams.taskFilter && !requestParams.resourcesFilter && !requestParams.nameStartsWith && !requestParams.jobFilter) {
				var maxDropDownSize = rRuntime.getCurrentUserPreference({preference: 'MAXDROPDOWNSIZE'});
				requestParams.startIndex = 0;
				requestParams.endIndex = maxDropDownSize ? maxDropDownSize : 0;
				hasIndices = true;
			}

			if (requestParams.range) {
				totalCount = this.getTotalResultsCount(SQLFromAndWhere);
				query = this.addRangeToSQLString(SQLColumns + SQLFromAndWhere, totalCount);
			} else if (hasIndices) {
				query = this.addIndicesToSQLString(query, requestParams.startIndex, requestParams.endIndex);
			}

			var queryResults = nQuery.runSuiteQL(query);

			var results = [];

			queryResults.results.forEach(function (res) {
				var resObj = {
					id: res.values[0],
					name: res.values[1],
					type: 'projecttask',
					startDate: res.values[2],
					endDate: res.values[3]
				};

				results.push(resObj);

				return true;
			});

			if (results.length > 0) {
				if (requestParams.range) {
					results = this.convertResultsToRange(results, totalCount);
				} else {
					for (i = 0; i < results.length; i++) {
						if (results[i].startDate) {
							results[i].startDate = rDate.convertToFormat({
								dateObject: rFormat.parse({
									value: (results[i].startDate),
									type: dateFormatType
								}),
								format: 'yyyy/MM/dd'
							});
						}
						if (results[i].endDate) {
							results[i].endDate = rDate.convertToFormat({
								dateObject: rFormat.parse({
									value: (results[i].endDate),
									type: dateFormatType
								}),
								format: 'yyyy/MM/dd'
							});
						}
					}
				}
			}

			rLog.endMethod();
			return results;
		};

		/*
		 * Get project resources
		 * @param {Object} - map of request parameters
		 */
		module.getProjectResources = function (requestParams) {
			rLog.startMethod('getProjectResources');

			var hasIndices = this.areIndicesSet(requestParams);

			var isBillingClassEnabled = rRuntime.isFeatureEnabled({feature: 'BILLINGCLASSES'});
			var areSubsidiariesEnabled = rRuntime.isFeatureEnabled({feature: 'SUBSIDIARIES'});
			var results = [];
			var totalCount = null;

			var SQLColumnsEmp = "" +
								"SELECT employee.id AS id, \n" +
								"       employee.entityid AS name, \n" +
								"       'Employee' AS type, \n" +
								"       employee.workcalendar AS workCal, \n" +
								"       employee_0.id AS supervisorId, \n" +
								"       employee_0.entityid AS supervisor, \n" +
								"       EmployeeType.name AS emp_labortype, \n" +
								"       employee.laborcost AS emp_laborcost, \n" +
								"       NULL AS emp_job, \n" + // Not used. Relic from abandoned jobmanagement feature to preserve indices
								((isBillingClassEnabled) ? " employee.billingclass AS emp_billingclass, \n" : "NULL AS emp_billingclass, \n") +
								"       NULL AS vend_is1099eligible, \n" +
								"       NULL AS vend_laborcost, \n" +
								"       employee.firstname AS firstname, \n" +
								"       employee.middlename AS middlename, \n" +
								"       employee.lastname AS lastname, \n" +
								"		NULL as genrsrc_laborcost, \n" +
								"		NULL as genrsrc_price \n";
			var SQLFromAndWhereEmp = "" +
									 "FROM   employee,\n" +
									 "       EmployeeType, \n" +
									 "       employee employee_0 \n" +
									 "WHERE  employee.employeetype = EmployeeType.id(+) \n" +
									 "       AND employee.supervisor = employee_0.id(+) \n" +
									 "       AND employee.isjobresource = 'T' \n" +
									 (((!requestParams.showInactives)) ? " AND NVL(employee.isinactive, 'F') = 'F' \n" : "") +
									 ((requestParams.resourcesFilter) ? " AND employee.id IN (" + requestParams.resourcesFilter + ") \n" : "") +
									 ((requestParams.billingClassFilter && isBillingClassEnabled) ? " AND employee.billingclass IN (" + requestParams.billingClassFilter.join(', ') + ") \n" : "") +
									 ((requestParams.subsidiaryFilter && areSubsidiariesEnabled) ? " AND employee.subsidiary IN (" + requestParams.subsidiaryFilter.join(', ') + ") \n" : "") +
									 ((requestParams.nameStartsWith) ? " AND (UPPER(employee.entityid) LIKE UPPER('" + requestParams.nameStartsWith + "%') OR UPPER(employee.firstname || ' ' || NVL2(employee.middlename, CONCAT(SUBSTR(employee.middlename, 0, 1), ' '), '')  || employee.lastname) LIKE UPPER('" + requestParams.nameStartsWith + "%') OR UPPER(employee.lastname) LIKE UPPER('" + requestParams.nameStartsWith + "%') OR UPPER(employee.firstname || ' ' || employee.lastname) LIKE UPPER('" + requestParams.nameStartsWith + "%')) \n" : "") +
									 ((requestParams.id) ? " AND employee.id = " + parseInt(requestParams.id) : "");


			var queryEmp = SQLColumnsEmp + SQLFromAndWhereEmp;
			var countEmp = this.getTotalResultsCount(SQLFromAndWhereEmp);

			var SQLColumnsVend = "SELECT  vendor.id AS id, \n" +
								 "       entitytitle AS name, \n" +
								 "       'Vendor' AS type, \n" +
								 "       workcalendar AS workCal, \n" +
								 "       NULL AS supervisorId, \n" +
								 "       NULL AS supervisor, \n" +
								 "       NULL AS emp_labortype, \n" +
								 "       NULL AS emp_laborcost, \n" +
								 "       NULL AS emp_job, \n" + // Not used. Relic from abandoned jobmanagement feature to preserve indices
								 "       NULL AS emp_billingclass, \n" +
								 "       account.category1099misc AS vend_is1099eligible, \n" +
								 "       vendor.laborcost AS vend_laborcost, \n" +
								 "       vendor.firstname AS firstname, \n" +
								 "       vendor.middlename AS middlename, \n" +
								 "       vendor.lastname AS lastname, \n" +
								 "		 NULL as genrsrc_laborcost, \n" +
								 "		 NULL as genrsrc_price \n";
			var SQLFromAndWhereVend = "FROM vendor, \n" +
									  "       account \n" +
									  "WHERE  vendor.defaultbankaccount = account.id(+) \n" +
									  "       AND vendor.isjobresourcevend = 'T' \n" +
									  (((!requestParams.showInactives)) ? " AND NVL(vendor.isinactive, 'F') = 'F' \n" : "") +
									  ((requestParams.resourcesFilter) ? " AND vendor.id IN (" + requestParams.resourcesFilter + ") \n" : "") +
									  ((requestParams.billingClassFilter && isBillingClassEnabled) ? " AND vendor.billingclass IN (" + requestParams.billingClassFilter.join(', ') + ") \n" : "") +
									  ((requestParams.nameStartsWith) ? " AND (UPPER(vendor.companyname) LIKE UPPER('" + requestParams.nameStartsWith + "%') OR UPPER(vendor.entityid) LIKE UPPER('" + requestParams.nameStartsWith + "%') OR UPPER(vendor.firstname || ' ' || NVL2(vendor.middlename, CONCAT(SUBSTR(vendor.middlename, 0, 1), ' '), '')  || vendor.lastname) LIKE UPPER('" + requestParams.nameStartsWith + "%') OR UPPER(vendor.lastname) LIKE UPPER('" + requestParams.nameStartsWith + "%') OR UPPER(vendor.firstname || ' ' || vendor.lastname) LIKE UPPER('" + requestParams.nameStartsWith + "%')) \n" : "") +
									  ((requestParams.id) ? " AND vendor.id = " + parseInt(requestParams.id) : "");

			var queryVend = SQLColumnsVend + SQLFromAndWhereVend;
			var countVend = this.getTotalResultsCount(SQLFromAndWhereVend);

			var SQLColumnsGen = "" +
								"SELECT genericResource.id AS id, \n" +
								"       genericResource.entityid AS name, \n" +
								"       'GenericRsrc' AS type, \n" +
								"       workcalendar AS workCal, \n" +
								"       NULL AS supervisorId, \n" +
								"       NULL AS supervisor, \n" +
								"       NULL AS emp_labortype, \n" +
								"       NULL AS emp_laborcost, \n" +
								"       NULL AS emp_job, \n" + // Not used. Relic from abandoned jobmanagement feature to preserve indices
								"       NULL AS emp_billingclass, \n" +
								"       NULL AS vend_is1099eligible, \n" +
								"       NULL AS vend_laborcost, \n" +
								"       '' AS firstname, \n" +
								"       '' AS middlename, \n" +
								"       '' AS lastname \n," +
								"		 genericResource.laborcost as genrsrc_laborcost, \n" +
								((isBillingClassEnabled) ? " genericResource.laborprice" : " NULL") + " as genrsrc_price \n";
			var SQLFromAndWhereGen = "" +
									 "FROM   genericResource \n" +
									 "WHERE  1 = 1 \n" +
									 (((!requestParams.showInactives)) ? " AND NVL(genericResource.isinactive, 'F') = 'F' \n" : "") +
									 ((requestParams.resourcesFilter) ? " AND genericResource.id IN (" + requestParams.resourcesFilter + ") \n" : "") +
									 ((requestParams.billingClassFilter && isBillingClassEnabled) ? " AND genericResource.billingclass IN (" + requestParams.billingClassFilter.join(', ') + ") \n" : "") +
									 ((requestParams.nameStartsWith) ? " AND UPPER(genericResource.entityid) LIKE UPPER('" + requestParams.nameStartsWith + "%') \n" : "") +
									 ((requestParams.id) ? " AND genericResource.id = " + parseInt(requestParams.id) : "");

			var queryGen = SQLColumnsGen + SQLFromAndWhereGen;
			var countGen = this.getTotalResultsCount(SQLFromAndWhereGen);

			var query = queryEmp +
						" UNION ALL " +
						queryVend +
						" UNION ALL " +
						queryGen +
						" ORDER BY name ASC";

			if (!requestParams.range && !hasIndices && !requestParams.resourcesFilter && !requestParams.nameStartsWith) {
				var maxDropDownSize = rRuntime.getCurrentUserPreference({preference: 'MAXDROPDOWNSIZE'});
				requestParams.startIndex = 0;
				requestParams.endIndex = maxDropDownSize ? maxDropDownSize : 0;
				hasIndices = true;
			}

			if (requestParams.range) {
				totalCount = countEmp + countVend + countGen;
				query = this.addRangeToSQLString(query, totalCount);
			} else if (hasIndices) {
				query = this.addIndicesToSQLString(query, requestParams.startIndex, requestParams.endIndex);
			}

			var queryResults = nQuery.runSuiteQL(query);

			queryResults.results.forEach(function (res) {
				var name = null;
				var firstname = res.values[12] ? res.values[12] : '';
				var middlename = res.values[13] ? res.values[13].charAt(0) : '';
				var lastname = res.values[14] ? res.values[14] : '';
				var entityId = res.values[1];

				if (res.values[2] === 'Employee') {
					if (entityId.search(firstname) < 0 || entityId.search(lastname) < 0) {
						name = [entityId, firstname, middlename, lastname].filter(function (str) {
							return str !== '';
						}).join(' ');
					} else {
						name = entityId;
					}
				} else {
					name = res.values[1];
				}

				var resObj = {
					id: res.values[0],
					name: name,
					type: res.values[2],
					workCal: res.values[3],
					supervisorId: res.values[4] || '',
					supervisor: res.values[5] || '',
					emp_labortype: res.values[6] || '',
					emp_laborcost: res.values[7] || '',
					vend_is1099eligible: !!res.values[10],
					vend_laborcost: res.values[11] || '',
					genrsrc_laborcost: res.values[15] || '',
					genrsrc_price: res.values[16] || ''
				};
				if (isBillingClassEnabled) {
					resObj['emp_billingclass'] = res.values[9] || '';
				}

				results.push(resObj);
				return true;
			});

			if (requestParams.range) {
				results = this.convertResultsToRange(results, totalCount);
			} else {
				results = this.addCalendarsToResults(results);
			}

			rLog.endMethod();

			return results;
		};

		/*
		 * Get employees as approvers
		 * @param {Object} - map of request parameters
		 */
		module.getEmployeesAsApprovers = function (requestParams) {
			rLog.startMethod('getEmployeesAsApprovers');
			var hasIndices = this.areIndicesSet(requestParams);

			var totalCount = null;
			var SQLColumns = "" +
							 "SELECT employee.id AS id, \n" +
							 "       employee.entityid AS name, \n" +
							 "       employee_0.id AS supervisorId, \n" +
							 "       employee_0.entityid AS supervisor, \n" +
							 "       employee.workcalendar AS workCal \n";
			var SQLFromAndWhere = "" +
								  "FROM   employee, \n" +
								  "       employee employee_0 \n" +
								  "WHERE  employee.supervisor = employee_0.id(+) \n" +
								  "       AND NVL(employee.isinactive, 'F') = 'F' \n" +
								  ((requestParams.resourcesFilter) ? " AND employee.id IN (" + requestParams.resourcesFilter + ") \n" : "") +
								  ((requestParams.nameStartsWith) ? " AND UPPER(employee.entityid) LIKE UPPER('" + requestParams.nameStartsWith + "%') \n" : "") +
								  " ORDER BY LOWER(name) ASC";

			var query = SQLColumns + SQLFromAndWhere;

			if (requestParams.range) {
				totalCount = this.getTotalResultsCount(SQLFromAndWhere);
				query = this.addRangeToSQLString(SQLColumns + SQLFromAndWhere, totalCount);
			} else if (hasIndices) {
				query = this.addIndicesToSQLString(query, requestParams.startIndex, requestParams.endIndex);
			}

			var queryResults = nQuery.runSuiteQL(query);

			var results = [];

			queryResults.results.forEach(function (res) {
				var resObj = {
					id: res.values[0],
					name: res.values[1],
					supervisorId: res.values[2],
					supervisor: res.values[3],
					workCal: res.values[4]
				};

				if (hasIndices) {
					resObj["type"] = 'employee';
				}

				results.push(resObj);

				return true;
			});

			if (requestParams.range) {
				results = this.convertResultsToRange(results, totalCount);
			}

			rLog.endMethod();
			return results;
		};

		/*
		 * Get employees as project resources
		 * @param {Object} - map of request parameters
		 */
		module.getEmployeesAsProjectResources = function (requestParams) {
			rLog.startMethod('getEmployeesAsProjectResources');

			var hasIndices = this.areIndicesSet(requestParams);

			var isBillingClassEnabled = rRuntime.isFeatureEnabled({feature: 'BILLINGCLASSES'});
			var areSubsidiariesEnabled = rRuntime.isFeatureEnabled({feature: 'SUBSIDIARIES'});
			var areClassesEnabled = rRuntime.isFeatureEnabled({feature: 'CLASSES'});
			var areDepartmentsEnabled = rRuntime.isFeatureEnabled({feature: 'DEPARTMENTS'});
			var areLocationsEnabled = rRuntime.isFeatureEnabled({feature: 'LOCATIONS'});

			var totalCount = null;
			var SQLColumns = "" +
							 "SELECT employee.id AS id, \n" +
							 "       employee.entityid AS name, \n" +
							 "       employee_0.id AS supervisorId, \n" +
							 "       employee_0.entityid AS supervisor, \n" +
							 "       employee.workcalendar AS workCal, \n" +
							 "       workcalendar.name AS workCalendar \n";
			var SQLFromAndWhere = "" +
								  "FROM   employee, \n" +
								  "       employee employee_0," +
								  "       workcalendar \n" +
								  "WHERE  employee.supervisor = employee_0.id(+) \n" +
								  "       AND NVL(employee.isinactive, 'F') = 'F' \n" +
								  "       AND employee.isjobresource = 'T' \n" +
								  "       AND workcalendar.id = employee.workcalendar \n" +
								  ((requestParams.nameStartsWith) ? " AND UPPER(employee.entityid) LIKE UPPER('" + requestParams.nameStartsWith + "%') \n" : "") +
								  ((requestParams.resourcesFilter) ? " AND employee.id IN (" + requestParams.resourcesFilter + ") \n" : "") +
								  ((requestParams.billingClassFilter && isBillingClassEnabled) ? " AND employee.billingclass IN (" + requestParams.billingClassFilter.join(', ') + ") \n" : "") +
								  ((requestParams.subsidiaryFilter && areSubsidiariesEnabled) ? " AND employee.subsidiary IN (" + requestParams.subsidiaryFilter.join(', ') + ") \n" : "") +
								  ((requestParams.classFilter && areClassesEnabled) ? " AND employee.class IN (" + requestParams.classFilter.join(', ') + ") \n" : "") +
								  ((requestParams.deptFilter && areDepartmentsEnabled) ? " AND employee.department IN (" + requestParams.deptFilter.join(', ') + ") \n" : "") +
								  ((requestParams.locationFilter && areLocationsEnabled) ? " AND employee.location IN (" + requestParams.locationFilter.join(', ') + ") \n" : "") +
								  "ORDER BY employee.entityid ASC";

			var query = SQLColumns + SQLFromAndWhere;

			if (requestParams.range) {
				totalCount = this.getTotalResultsCount(SQLFromAndWhere);
				query = this.addRangeToSQLString(SQLColumns + SQLFromAndWhere, totalCount);
			} else if (hasIndices) {
				query = this.addIndicesToSQLString(query, requestParams.startIndex, requestParams.endIndex);
			}

			var queryResults = nQuery.runSuiteQL(query);

			var results = [];

			queryResults.results.forEach(function (res) {
				var resObj = {
					id: res.values[0],
					name: res.values[1],
					supervisorId: res.values[2],
					supervisor: res.values[3],
					workCal: res.values[4],
					workCalendar: res.values[5]
				};

				if (hasIndices) {
					resObj["type"] = 'employee';
				}

				results.push(resObj);

				return true;
			});

			if (requestParams.range) {
				results = this.convertResultsToRange(results, totalCount);
			}

			rLog.endMethod();
			return results;
		};

		/*
		 * Get vendors
		 * @param {Object} - map of request parameters
		 */
		module.getVendors = function (requestParams) {
			rLog.startMethod('getVendors');

			var hasIndices = this.areIndicesSet(requestParams);

			var isBillingClassEnabled = rRuntime.isFeatureEnabled({feature: 'BILLINGCLASSES'});
			var areSubsidiariesEnabled = rRuntime.isFeatureEnabled({feature: 'SUBSIDIARIES'});

			var totalCount = null;
			var SQLColumns = "" +
							 "SELECT vendor.id AS id, \n" +
							 "       entityid AS name, \n" +
							 "       'vendor' AS type, \n" +
							 "       vendor.workcalendar AS workCal, \n" +
							 "       workcalendar.name AS workCalendar \n";
			var SQLFromAndWhere = "" +
								  "FROM \n" +
								  ((requestParams.subsidiaryFilter && areSubsidiariesEnabled) ? " vendorSubsidiaryRelationship, \n" : "") +
								  "       vendor, \n" +
								  "       workcalendar \n" +
								  "WHERE  NVL(vendor.isinactive, 'F') = 'F' \n" +
								  "       AND vendor.isjobresourcevend = 'T' \n" +
								  "       AND vendor.workcalendar = workcalendar.id \n" +
								  ((requestParams.nameStartsWith) ? " AND (UPPER(vendor.companyname) LIKE UPPER('" + requestParams.nameStartsWith + "%') OR UPPER(vendor.entityid) LIKE UPPER('" + requestParams.nameStartsWith + "%') OR UPPER(vendor.firstname || ' ' || NVL2(vendor.middlename, CONCAT(vendor.middlename, ' '), '')  || vendor.lastname) LIKE UPPER('" + requestParams.nameStartsWith + "%')) \n" : "") +
								  ((requestParams.resourcesFilter) ? " AND vendor.id IN (" + requestParams.resourcesFilter + ") \n" : "") +
								  ((requestParams.billingClassFilter && isBillingClassEnabled) ? " AND vendor.billingclass IN (" + requestParams.billingClassFilter.join(', ') + ") \n" : "") +
								  ((requestParams.subsidiaryFilter && areSubsidiariesEnabled) ? " AND vendor.id = vendorSubsidiaryRelationship.entity(+) \n" : "") +
								  ((requestParams.subsidiaryFilter && areSubsidiariesEnabled) ? " AND vendorSubsidiaryRelationship.subsidiary IN (" + requestParams.subsidiaryFilter.join(', ') + ") \n" : "") +
								  ((requestParams.vendorCatFilter) ? " AND vendor.category IN (" + requestParams.vendorCatFilter.join(', ') + ") \n" : "") +
								  ((requestParams.vendorTypeFilter && requestParams.vendorTypeFilter.length === 1) ? " AND vendor.isperson = '" + ((requestParams.vendorTypeFilter[0] === 1) ? 'T' : 'F') + "' \n" : "") +
								  "ORDER BY name ASC";

			var query = SQLColumns + SQLFromAndWhere;

			if (requestParams.range) {
				totalCount = this.getTotalResultsCount(SQLFromAndWhere);
				query = this.addRangeToSQLString(SQLColumns + SQLFromAndWhere, totalCount);
			} else if (hasIndices) {
				query = this.addIndicesToSQLString(query, requestParams.startIndex, requestParams.endIndex);
			}

			var queryResults = nQuery.runSuiteQL(query);

			var results = [];

			queryResults.results.forEach(function (res) {
				var resObj = {
					id: res.values[0],
					name: res.values[1],
					type: res.values[2],
					workCal: res.values[3],
					workCalendar: res.values[4]
				};

				if (hasIndices) {
					resObj["type"] = 'vendor';
				}

				results.push(resObj);

				return true;
			});

			if (requestParams.range) {
				results = this.convertResultsToRange(results, totalCount);
			}

			rLog.endMethod();
			return results;
		};

		/*
		 * Get vendor categories
		 * @param {Object} - map of request parameters
		 */
		module.getVendorCategories = function (requestParams) {
			rLog.startMethod('getVendorCategories');

			var hasIndices = this.areIndicesSet(requestParams);

			var totalCount = null;
			var SQLColumns = "" +
							 "SELECT id, \n" +
							 "       name \n";
			var SQLFromAndWhere = "" +
								  "FROM   vendorCategory \n" +
								  "WHERE  NVL(isinactive, 'F') = 'F' \n" +
								  "ORDER BY name ASC";

			var query = SQLColumns + SQLFromAndWhere;

			if (requestParams.range) {
				totalCount = this.getTotalResultsCount(SQLFromAndWhere);
				query = this.addRangeToSQLString(SQLColumns + SQLFromAndWhere, totalCount);
			} else if (hasIndices) {
				query = this.addIndicesToSQLString(query, requestParams.startIndex, requestParams.endIndex);
			}

			var queryResults = nQuery.runSuiteQL(query);

			var results = [];

			queryResults.results.forEach(function (res) {
				var resObj = {
					id: res.values[0],
					name: res.values[1]
				};

				if (hasIndices) {
					resObj["type"] = 'vendorcategory';
				}

				results.push(resObj);

				return true;
			});

			if (requestParams.range) {
				results = this.convertResultsToRange(results, totalCount);
			}

			rLog.endMethod();
			return results;
		};

		/*
		 * Get generic resources
		 * @param {Object} - map of request parameters
		 */
		module.getGenericResources = function (requestParams) {
			rLog.startMethod('getGenericResources');

			var hasIndices = this.areIndicesSet(requestParams);

			var isBillingClassEnabled = rRuntime.isFeatureEnabled({feature: 'BILLINGCLASSES'});
			var areSubsidiariesEnabled = rRuntime.isFeatureEnabled({feature: 'SUBSIDIARIES'});

			var totalCount = null;
			var SQLColumns = "" +
							 "SELECT genericResource.id AS id, \n" +
							 "       genericResource.entityid AS name, \n" +
							 "       'GenericRsrc' AS type, \n" +
							 "       genericResource.workcalendar AS workCal, \n" +
							 "       workcalendar.name AS workCalendar \n";
			var SQLFromAndWhere = "" +
								  "FROM " +
								  ((requestParams.subsidiaryFilter && areSubsidiariesEnabled) ? " genericResourceSubsidiaryRelationship, \n" : "") +
								  "       genericResource, \n" +
								  "       workcalendar \n" +
								  "WHERE  NVL(genericResource.isinactive, 'F') = 'F' \n" +
								  "       AND genericResource.workcalendar = workcalendar.id \n" +
								  ((requestParams.nameStartsWith) ? " AND UPPER(genericResource.entityid) LIKE UPPER('" + requestParams.nameStartsWith + "%') \n" : "") +
								  ((requestParams.subsidiaryFilter && areSubsidiariesEnabled) ? " AND genericResource.id = genericResourceSubsidiaryRelationship.entity(+) \n" : "") +
								  ((requestParams.subsidiaryFilter && areSubsidiariesEnabled) ? " AND genericResourceSubsidiaryRelationship.id IN (" + requestParams.subsidiaryFilter.join(', ') + ") \n" : "") +
								  ((requestParams.resourcesFilter) ? " AND genericResource.id IN (" + requestParams.resourcesFilter + ") \n" : "") +
								  ((requestParams.billingClassFilter && isBillingClassEnabled) ? " AND genericResource.billingclass IN (" + requestParams.billingClassFilter.join(", ") + ") \n" : "") +
								  "ORDER BY genericResource.id ASC";

			var query = SQLColumns + SQLFromAndWhere;

			if (requestParams.range) {
				totalCount = this.getTotalResultsCount(SQLFromAndWhere);
				query = this.addRangeToSQLString(SQLColumns + SQLFromAndWhere, totalCount);
			} else if (hasIndices) {
				query = this.addIndicesToSQLString(query, requestParams.startIndex, requestParams.endIndex);
			}

			var queryResults = nQuery.runSuiteQL(query);

			var results = [];

			queryResults.results.forEach(function (res) {
				var resObj = {
					id: res.values[0],
					name: res.values[1],
					type: res.values[2],
					workCal: res.values[3],
					workCalendar: res.values[4]
				};

				if (hasIndices) {
					resObj["type"] = 'genericresource';
				}

				results.push(resObj);
				return true;
			});

			if (requestParams.range) {
				results = this.convertResultsToRange(results, totalCount);
			}

			rLog.endMethod();
			return results;
		};

		/*
		 * Get subsidiaries
		 * @param {Object} - map of request parameters
		 */
		module.getSubsidiaries = function (requestParams) {
			rLog.startMethod('getSubsidiaries');

			var hasIndices = this.areIndicesSet(requestParams);

			var totalCount = null;
			var SQLColumns = "" +
							 "SELECT id AS id, \n" +
							 "       fullname AS name \n";
			var SQLFromAndWhere = "" +
								  "FROM   subsidiary \n" +
								  "WHERE  NVL(isinactive, 'F') = 'F' \n" +
								  ((requestParams.nameStartsWith) ? " AND UPPER(name) LIKE UPPER('" + requestParams.nameStartsWith + "%') \n" : "") +
								  "ORDER BY name ASC";

			var query = SQLColumns + SQLFromAndWhere;

			if (requestParams.range) {
				totalCount = this.getTotalResultsCount(SQLFromAndWhere);
				query = this.addRangeToSQLString(SQLColumns + SQLFromAndWhere, totalCount);
			} else if (hasIndices) {
				query = this.addIndicesToSQLString(query, requestParams.startIndex, requestParams.endIndex);
			}

			var queryResults = nQuery.runSuiteQL(query);

			var results = [];

			queryResults.results.forEach(function (res) {
				var resObj = {
					id: res.values[0],
					name: res.values[1]
				};

				if (hasIndices) {
					resObj["type"] = 'subsidiary';
				}

				results.push(resObj);

				return true;
			});

			if (requestParams.range) {
				results = this.convertResultsToRange(results, totalCount);
			}

			rLog.endMethod();
			return results;
		};

		/*
		 * Get customers
		 * @param {Object} - map of request parameters
		 */
		module.getCustomers = function (requestParams) {
			rLog.startMethod('getCustomers');

			var hasIndices = this.areIndicesSet(requestParams);

			var totalCount = null;
			var SQLColumns = "" +
							 "SELECT id AS id, \n" +
							 "       altname AS name, \n" +
							 "       'customer' AS type \n";
			var SQLFromAndWhere = "" +
								  "FROM   customer \n" +
								  "WHERE  NVL(isinactive, 'F') = 'F' \n" +
								  ((requestParams.customerFilter) ? " AND id IN (" + requestParams.customerFilter + ") \n" : "") +
								  ((requestParams.nameStartsWith) ? " AND (UPPER(altname) LIKE UPPER('" + requestParams.nameStartsWith + "%') OR UPPER(companyname) LIKE UPPER('" + requestParams.nameStartsWith + "%') OR UPPER(entityid) LIKE UPPER('" + requestParams.nameStartsWith + "%')) \n" : "") +
								  "ORDER BY name ASC";

			var query = SQLColumns + SQLFromAndWhere;

			if (!requestParams.customerFilter && !requestParams.range && !hasIndices) {
				var maxDropDownSize = rRuntime.getCurrentUserPreference({preference: 'MAXDROPDOWNSIZE'});
				requestParams.startIndex = 0;
				requestParams.endIndex = maxDropDownSize ? maxDropDownSize : 0;
				hasIndices = true;
			}

			if (requestParams.range) {
				totalCount = this.getTotalResultsCount(SQLFromAndWhere);
				query = this.addRangeToSQLString(SQLColumns + SQLFromAndWhere, totalCount);
			} else if (hasIndices) {
				query = this.addIndicesToSQLString(query, requestParams.startIndex, requestParams.endIndex);
			}

			var queryResults = nQuery.runSuiteQL(query);

			var results = [];

			queryResults.results.forEach(function (res) {
				var resObj = {
					id: res.values[0],
					name: res.values[1],
					type: res.values[2]
				};

				if (hasIndices) {
					resObj["type"] = 'customer';
				}

				results.push(resObj);

				return true;
			});

			if (requestParams.range) {
				results = this.convertResultsToRange(results, totalCount);
			}

			rLog.endMethod();
			return results;
		};

		/*
		 * Get resource filters
		 * @param {Object} - map of request parameters
		 */
		module.getResourceFilters = function () {
			rLog.startMethod('getResourceFilters');

			var data = [
				{
					id: 'name',
					name: rTranslation.getTranslationOfKey({key: 'TEXT.NAME'})
				}
			];
			if (rRuntime.isFeatureEnabled({feature: 'DEPARTMENTS'})) {
				data.push({
					id: 'department',
					name: rTranslation.getTranslationOfKey({key: 'COMBOBOX.DEPARTMENT'})
				});
			}
			if (rRuntime.isFeatureEnabled({feature: 'CLASSES'})) {
				data.push({
					id: 'classification',
					name: rTranslation.getTranslationOfKey({key: 'COMBOBOX.CLASS'})
				});
			}
			if (rRuntime.isFeatureEnabled({feature: 'LOCATIONS'})) {
				data.push({
					id: 'location',
					name: rTranslation.getTranslationOfKey({key: 'COMBOBOX.LOCATION'})
				});
			}
			if (rRuntime.isFeatureEnabled({feature: 'BILLINGCLASSES'})) {
				data.push({
					id: 'billingclass',
					name: rTranslation.getTranslationOfKey({key: 'COMBOBOX.BILLING_CLASS'})
				});
			}
			if (rRuntime.isFeatureEnabled({feature: 'SUBSIDIARIES'})) {
				data.push({
					id: 'subsidiary',
					name: rTranslation.getTranslationOfKey({key: 'COMBOBOX.SUBSIDIARY'})
				});
			}
			var segments = rSegments.getSegmentTypes();
			for (var i = 0; i < segments.length; i++) {
				data.push({id: segments[i].id, name: segments[i].name});
			}
			data.push({
				id: 'isperson',
				name: rTranslation.getTranslationOfKey({key: 'COMBOBOX.VENDOR_TYPE'})
			}, {
				id: 'vendorcategory',
				name: rTranslation.getTranslationOfKey({key: 'COMBOBOX.VENDOR_CATEGORY'})
			}, {
				id: 'type',
				name: rTranslation.getTranslationOfKey({key: 'COMBOBOX.TYPE'})
			});
			rLog.endMethod();
			return data;
		};

		/*
		 * Get allocation filters
		 * @param {Object} - map of request parameters
		 */
		module.getAllocationFilters = function () {
			rLog.startMethod('getAllocationFilters');

			var data = [
				{
					id: 'project',
					name: rTranslation.getTranslationOfKey({key: 'COMBOBOX.PROJECT'})
				}, {
					id: 'customer',
					name: rTranslation.getTranslationOfKey({key: 'COMBOBOX.CUSTOMER'})
				}, {
					id: 'allocationtype',
					name: rTranslation.getTranslationOfKey({key: 'COMBOBOX.ALLOCATION_TYPE'})
				}, {
					id: 'startdate',
					name: rTranslation.getTranslationOfKey({key: 'DATE.START_DATE'})
				}
			];
			if (rConfig.isAccountPreferenceEnabled({fieldId: 'CUSTOMAPPROVALRSRCALLOC'})) {
				data.push({
					id: 'approvalstatus',
					name: rTranslation.getTranslationOfKey({key: 'COMBOBOX.APPROVAL_STATUS'})
				});
			}
			if (rSettings.getSettings().showProjectTasks === 'T') {
				data.push({
					id: 'projecttask',
					name: rTranslation.getTranslationOfKey({key: 'COMBOBOX.PROJECT_TASK'})
				});
			}
			data.push({
				id: 'allocationlevel',
				name: rTranslation.getTranslationOfKey({key: 'COMBOBOX.ALLOCATION_LEVEL'})
			});

			rLog.endMethod();
			return data;
		};

		module.getResourceSegments = function (requestParams) {
			if (!rRuntime.isFeatureEnabled({feature: 'CUSTOMSEGMENTS'})) {
				return [];
			}

			rLog.startMethod('getResourceSegments');
			var resourceSegments = rSegments.getSegmentInstances();
			rLog.endMethod();
			return resourceSegments;
		};

		module.getResourceSegmentTypes = function () {
			if (!rRuntime.isFeatureEnabled({feature: 'CUSTOMSEGMENTS'})) {
				return [];
			}

			rLog.startMethod('getResourceSegmentTypes');
			var resourceSegmentTypes = rSegments.getSegmentTypes();
			rLog.endMethod();
			return resourceSegmentTypes;
		};

		module.getResourceSegmentValues = function (requestParams) {
			if (!rRuntime.isFeatureEnabled({feature: 'CUSTOMSEGMENTS'})) {
				return [];
			}

			rLog.startMethod('getResourceSegmentValues');
			var resourceSegmentValues = rSegments.getResourceSegmentValues(requestParams);
			rLog.endMethod();
			return resourceSegmentValues;
		};

		/*
			 * Get total count of results based on the SQL query
			 * @param {String} - SQL query
		 */
		module.getTotalResultsCount = function (SQLFromAndWhere) {
			var arr = SQLFromAndWhere.split('ORDER BY ');

			if (arr.length === 2) {
				SQLFromAndWhere = arr[0];
			}

			var maxRowQuery = "SELECT COUNT(1) FROM " +
							  "(" +
							  "   SELECT '' AS id " +
							  "   " + SQLFromAndWhere +
							  ")";
			var maxRowRes = nQuery.runSuiteQL(maxRowQuery);

			return parseInt(maxRowRes.results[0].values[0]);
		};

		/*
			 * Adds a calendar record into the results
		 */
		module.addCalendarsToResults = function (results) {
			var workCalIds = [];
			var workCalendarsByIds = {};

			for (var i = 0; i < results.length; i++) {
				if (results[i].workCal) {
					workCalIds.push(results[i].workCal);
				}
			}

			var workCalendars = rWorkCalendars.getWorkCalendars({workCalendarIds: workCalIds});

			for (var wc in workCalendars) {
				workCalendarsByIds[workCalendars[wc].id] = workCalendars[wc];
			}
			for (var i = 0; i < results.length; i++) {
				results[i]['workCalendarRecord'] = workCalendarsByIds[results[i].workCal];
				results[i]['workCalendar'] = workCalendarsByIds[results[i].name];
			}
			return results;
		};

		/*
			 * Wraps SQL string with indices logic
		 */
		module.addIndicesToSQLString = function (SQLString, start, end) {
			return "SELECT * FROM (" +
				   "   SELECT a.*, ROWNUM rnum FROM (" +
				   SQLString +
				   "   ) a " +
				   "   WHERE ROWNUM < " + (parseInt(end) + 1) + " ) " +
				   "WHERE rnum  >= " + (parseInt(start) + 1);
		};

		/*
			 * Wraps SQL string with pagination logic
		 */
		module.addRangeToSQLString = function (SQLString, totalCount) {
			return "SELECT * FROM (" +
				   "   SELECT a.*, ROWNUM rnum, MOD(ROWNUM-1," + defaultPageSize + ") modulus FROM (" +
				   SQLString +
				   "   ) a) " +
				   "WHERE modulus = 0 OR rnum = 1 OR rnum = " + totalCount + " OR modulus = " + (defaultPageSize - 1);
		};

		/*
			 * Converts temporary results into a proper JSON object that will be returned by the SuiteLet
		 */
		module.convertResultsToRange = function (results, totalCount) {
			var resultsWithRange = [];
			var page = 0;
			var j = 0;

			if (results.length === 1) {
				resultsWithRange.push({
					id: 0,
					name: results[0].name + ' - ' + results[0].name,
					startIndex: 0,
					endIndex: totalCount
				});
			} else {
				for (var i = 0; i < results.length - 1; i += 2) {
					resultsWithRange.push({
						id: j,
						name: results[i].name + ' - ' + results[i + 1].name,
						startIndex: page,
						endIndex: (i !== results.length - 2) ? page + defaultPageSize : totalCount
					});
					page += defaultPageSize;
					j++;
				}
			}
			return resultsWithRange;
		};

		/*
			 * Returns true if both startIndex and endIndex are set
		 */
		module.areIndicesSet = function (requestParams) {
			return (requestParams.startIndex !== undefined && requestParams.endIndex !== undefined);
		};

		/*
			 * Converts hours into 'H:mm' format, i.e. 7.5 => '7:30'
		 */
		module.convertHtoHMM = function (hours) {
			hours = parseFloat(hours);
			var h = Math.floor(hours);
			var m = Math.round((hours % 1) * 60);
			m = (m < 10) ? '0' + m : m;

			return h + ':' + m;
		};

		return module;
	}
);
