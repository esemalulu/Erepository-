/**
 * Copyright 2018, Oracle and/or its affiliates. All rights reserved.
 *
 * @author kkung
 * @NScriptName PSA RACG SU Resource Search
 * @NScriptId _proj_racg_su_resource_search
 * @NScriptType suitelet
 * @NApiVersion 2.x
 */
define(
	[
		'../adapter/proj_racg_ad_log',
		'../adapter/proj_racg_ad_runtime',
		'../adapter/proj_racg_ad_search',
		'../custom/proj_racg_cu_search_library.js',
		'../custom/proj_racg_cu_utility',
		'../adapter/proj_racg_ad_format',
		'../custom/proj_racg_su_tmp_hacks',
		'./proj_racg_su_features'
	],

	function (rLog, rRuntime, rSearch, rSearchLibrary, rUtility, rFormat, rTmp, rSuFeatures) {
		var module = {};
		module.minimumGovernance = 100;

		module.process = function (params) {
			var result = {
				success: true
			};
			this.isRssInstalled = rSuFeatures.isBundleInstalled({bundleName: 'skillsets'});
			if (params.searchType == 'skills') {
				result.data = this.getSkills();
				result.message = 'skills loaded';
				result.total = result.data.length;
			} else if (params.searchType == 'skillsets') {
				result.data = this.getSkillSets({parameters: params});
				result.message = 'resource search results loaded';
			} else {
				result.success = false;
				result.message = 'No search type provided';
			}
			return result;
		};
		/*
		 * Suitelet Default function
		 *
		 * @param {Object} params - onRequest Object
		 * @returns {Void}
		 */
		module.onRequest = function (context) {
			rLog.startMethod('onRequest');
			var params = context.request.parameters;

			rLog.debug('parameters: ' + JSON.stringify(params));
			var result = {};

			try {
				result = module.process(params);
			} catch (e) {
				result = {
					success: false,
					message: 'Failed to get skill records. Request parameters: ' + JSON.stringify(params)
				};
				rLog.handleError(e);
			}
			rLog.debug('returnData: ' + JSON.stringify(result));
			context.response.write(JSON.stringify(result));
			rLog.endMethod();
		};

		/*
		 * Get List of skill records
		 * @param {none}
		 * @returns {Array} skill records list
		 */
		module.getSkills = function () {
			rLog.startMethod('getSkills');
			var arrSkills = [];
			if (this.isRssInstalled) {
				var searchObject = rSearch.create({
					type: 'customrecord_rss_skill',
					columns: ['name', 'custrecord_rss_skill_category']
				});
				var resultSet = searchObject.run();
				var rangedResults;
				var start = 0;
				var end = 1000;

				do {
					rangedResults = resultSet.getRange({
						start: start,
						end: end
					});

					for (var ctr = 0; ctr < rangedResults.length; ctr++) {
						var eachRecord = rangedResults[ctr];
						arrSkills.push({
							'id': eachRecord.id,
							'name': eachRecord.getValue({name: 'name'}),
							'category': eachRecord.getValue({name: 'custrecord_rss_skill_category'})
						});
					}
					start = end;
					end += 1000;
				} while (rangedResults.length);
			}

			rLog.endMethod();
			return arrSkills;
		};

		/*
		 * Get List of skill records
		 * @param {Object} params
		 * @param {Object} params.parameters - https request variables
		 * @returns {Object} Resource data with skill set info
		 */
		module.getSkillSets = function (params) {
			rLog.startMethod('getSkillSets');

			var parameters = params.parameters;
			var objDateFrom = rFormat.parse({value: parameters.fieldDateFrom, type: rFormat.getTypes().DATE});
			var objDateTo = rFormat.parse({value: parameters.fieldDateTo, type: rFormat.getTypes().DATE});
			var retData = {
				columns: [],
				fields: [],
				values: {root: []},
				levels: {}
			};
			var objCalendarWorkDays = rSearchLibrary.getCalendarWorkingDays({
				fromDate: objDateFrom,
				toDate: objDateTo
			});
			var userFilters = this.buildUserFilter({parameters: params.parameters});
			var objSkillLevels = this.isRssInstalled ? rSearchLibrary.getSkillLevels() : {};
			var objResult = this.getResourceList({
				parameters: params.parameters,
				userFilters: userFilters,
				objSkillLevels: objSkillLevels,
				objCalendarWorkDays: objCalendarWorkDays
			});
			var objResourceList = objResult.objResourceList;
			var arrResourceSkillId = objResult.arrResourceSkillId;

			if (Object.keys(objResourceList).length) {
				this.buildResourceAvailability({
					objResourceList: objResourceList,
					fromDate: objDateFrom,
					toDate: objDateTo
				});

				for (var key in objResourceList) {
						if(!params.parameters.fieldPercentAvailable || params.parameters.fieldPercentAvailable <= objResourceList[key].availability) {
							retData.values.root.push(objResourceList[key]);
						}
				}

				var objSkillLevels = this.isRssInstalled ?
									 rSearchLibrary.getSkillLevelsBySkill(arrResourceSkillId) :
					{"baseskillsetscore": 0};
				retData.levels = objSkillLevels;
				retData.columns = this.buildSkillSetsColumns(objSkillLevels);
				retData.fields = this.buildSkillSetsFields(objSkillLevels);
			}

			rLog.endMethod();
			return retData;
		};

		/*
		 * Build search filter from user input
		 * @param {Object} params
		 * @param {Object} params.parameters - https request variables
		 * @returns {Array} Filter expression
		 */
		module.buildUserFilter = function (params) {
			rLog.startMethod('buildUserFilter');
			var parameters = params.parameters;
			var arrRetFilters = [];
			var searchOperators = rSearch.getSearchOperators();
			var logicalOperators = rSearch.getLogicalOperators();
			var andLogicalOperator = logicalOperators.AND;
			var orLogicalOperator = logicalOperators.OR;

			if (rUtility.isValidObject(parameters.fieldBillingClass)) {
				arrRetFilters.push(['billingclass', searchOperators.ANYOF, parameters.fieldBillingClass], andLogicalOperator);
			}

			if (rUtility.isValidObject(parameters.fieldLaborCost)) {
				var laborCostFilter = [];
				laborCostFilter.push(['laborcost', searchOperators.LESSTHANOREQUALTO, (+parameters.fieldLaborCost)], orLogicalOperator);
				laborCostFilter.push(['laborcost', searchOperators.ISEMPTY, '']);
				arrRetFilters.push(laborCostFilter, andLogicalOperator);
			}

			if (this.isRssInstalled) {
				if (rUtility.isValidObject(parameters.fieldYOE)) {
					arrRetFilters.push(['custentity_rss_yoe', searchOperators.GREATERTHANOREQUALTO, parameters.fieldYOE], andLogicalOperator);
				}

				if (parameters.skills) {
					var arrSkills = JSON.parse(parameters.skills);
					if (arrSkills.length) {
						arrRetFilters.push(['custrecord_rss_skillset_resource.custrecord_rss_skillset_skill', searchOperators.ANYOF, arrSkills], andLogicalOperator);
					}
				}
			}

			//remove last AND operator
			arrRetFilters.pop();
			rLog.endMethod();
			return arrRetFilters;
		};

		/*
		 * Search list of employee and vendor resource
		 * @param {Object} params
		 * @param {Object} params.userFilters - filter expression from user input
		 * @param {Object} params.objSkillLevels - mapping of skill level records
		 * @param {Object} params.objCalendarWorkDays - employee work time during the time frame
		 * @returns {Object} objResourceList - list of resource, arrResourceSkillId - list of unique skill id belonging to the resource
		 */
		module.getResourceList = function (params) {
			rLog.startMethod('getResourceList');
			var userFilters = params.userFilters;
			var objSkillLevels = params.objSkillLevels;
			var objCalendarWorkDays = params.objCalendarWorkDays;
			var arrResourceSkillId = [];
			var arrResourceType = ['employee', 'vendor'];
			var searchId = {
				'employee': 'customsearch_proj_racg_emp_skillsets',
				'vendor': 'customsearch_proj_racg_vendor_skillsets'
			};
			var objResourceList = {};
			var withinUsageLimit = true;

			// Search resource type and append their results to objResourceList
			for (var tCtr = 0; tCtr < arrResourceType.length && withinUsageLimit; tCtr++) {
				var resourceType = arrResourceType[tCtr];
				var searchObject = rSearch.load({id: searchId[resourceType]});
				this.appendSearchColumns({searchObject: searchObject, resourceType: resourceType});

				if (userFilters.length) {
					var filterExpression = searchObject.filterExpression; //Copy to variable as filterExpression is immutable
					if (searchObject.filterExpression.length) {
						filterExpression.push(rSearch.getLogicalOperators().AND);
					}
					filterExpression.push(userFilters);
					searchObject.filterExpression = filterExpression;
				}

				rTmp.issue582355AddSearchFields(searchObject, resourceType);

				var resultSet = searchObject.run();
				var rangedResults;
				var start = 0;
				var end = 1000;

				do {
					rangedResults = resultSet.getRange({
						start: start,
						end: end
					});

					for (var ctr = 0; ctr < rangedResults.length; ctr++) {
						var entityId = rangedResults[ctr].id;

						//Every result entry has mulitple skill set info but has repeated employee information (not normalized)
						if (!objResourceList[entityId]) {
							var objEmployee = this.buildResourceEntry({
								eachRecord: rangedResults[ctr],
								resourceType: resourceType
							});
							objEmployee.workingtime = +(objCalendarWorkDays[objEmployee.workcalendar]);
							objResourceList[entityId] = objEmployee;
						}
						var resourceSkillId = this.buildSkillSet({
							objResource: objResourceList[entityId],
							eachRecord: rangedResults[ctr],
							objSkillLevels: objSkillLevels
						});
						arrResourceSkillId = arrResourceSkillId.concat(resourceSkillId);
					}
					start = end;
					end += 1000;

					if (tCtr % 5 == 0 && rRuntime.getRemainingUsage() < this.minimumGovernance) {
						withinUsageLimit = false;
						rLog.error('Governance limit has reached minimum threshold of 100');
						break;
					}
				} while (rangedResults.length);
			}

			//remove duplicate skill id
			arrResourceSkillId = arrResourceSkillId.filter(function (value, index, self) {
				return self.indexOf(value) == index;
			});

			var ret = {
				objResourceList: objResourceList,
				arrResourceSkillId: arrResourceSkillId
			};
			rLog.endMethod();
			return ret;
		};

		/*
		 * Columns for the store record
		 * @param {Object} objSkillLevels - List of skill of all resource
		 * @returns {Array} Array of skill columns
		 */
		module.buildSkillSetsColumns = function (objSkillLevels) {
			rLog.startMethod('buildSkillSetsColumns');
			var arrColumns = [];
			arrColumns.push({
				text: 'Select',
				dataIndex: 'id',
				string: 'COLUMN.SELECT',
				menuDisabled: true,
				align: 'center',
				draggable: false,
				sortable: false
			});
			arrColumns.push({
				text: 'Name',
				dataIndex: 'name',
				string: 'COLUMN.NAME',
				menuDisabled: true,
				align: 'left',
				draggable: false
			});
			arrColumns.push({
				text: 'Labor Cost',
				dataIndex: 'laborcost',
				string: 'COLUMN.LABOR_COST',
				menuDisabled: true,
				align: 'right'
			});
			arrColumns.push({
				text: 'Availability',
				dataIndex: 'availability',
				string: 'COLUMN.AVAILABILITY',
				menuDisabled: true,
				align: 'right'
			});
			arrColumns.push({
				text: 'Type',
				dataIndex: 'type',
				string: 'COLUMN.TYPE',
				menuDisabled: true,
				align: 'left'
			});

			if (rRuntime.isFeatureEnabled({feature: 'billingclasses'})) {
				arrColumns.push({
					text: 'Billing Class',
					dataIndex: 'billingclass',
					string: 'COLUMN.BILLING_CLASS',
					menuDisabled: true,
					align: 'left'
				});
			}
			if (this.isRssInstalled) {
				arrColumns.push({
					text: 'SkillSet Score',
					dataIndex: 'skillsetscore',
					string: 'COLUMN.SKILLSET_SCORE',
					menuDisabled: true,
					align: 'center'
				});
				arrColumns.push({
					text: 'Years of Experience',
					dataIndex: 'yoe',
					string: 'COLUMN.YRS_OF_EXP',
					menuDisabled: true,
					align: 'right'
				});
				arrColumns.push({
					text: 'Resume',
					dataIndex: 'url',
					string: 'COLUMN.RESUME',
					menuDisabled: true,
					align: 'center'
				});

				for (var key in objSkillLevels) {
					if (key !== 'baseskillsetscore') {
						arrColumns.push({
							text: objSkillLevels[key].name,
							dataIndex: key,
							menuDisabled: true,
							align: 'center',
							columns: [
								{
									text: 'ra_skill_level_' + key,
									dataIndex: key,
									menuDisabled: true,
									sortable: false,
									draggable: false,
									align: 'left'
								}
							]
						});
					}
				}
			}

			rLog.endMethod();
			return arrColumns;
		};

		/*
		 * Fields for the store record
		 * @param {Object} objSkillLevels - List of skill of all resource
		 * @returns {Array} Array of skill fields
		 */
		module.buildSkillSetsFields = function (objSkillLevels) {
			rLog.startMethod('buildSkillSetsFields');
			var objFields = [];
			objFields.push({name: 'id', type: 'int'});
			objFields.push({name: 'name', type: 'string'});
			objFields.push({name: 'url', type: 'string'});
			objFields.push({name: 'type', type: 'string'});
			objFields.push({name: 'laborcost', type: 'string'});
			objFields.push({name: 'yoe', type: 'float'});
			objFields.push({name: 'availability', type: 'float'});
			objFields.push({name: 'skillsetscore', type: 'int'});
			objFields.push({name: 'vendortype', type: 'string'});
			objFields.push({name: 'vcategory', type: 'string'});
			objFields.push({name: 'email', type: 'string'});
			objFields.push({name: 'phone', type: 'string'});
			objFields.push({name: 'jobtitle', type: 'string'});
			objFields.push({name: 'department', type: 'string'});
			objFields.push({name: 'address', type: 'string'});
			objFields.push({name: 'supervisor', type: 'string'});

			if (rRuntime.isFeatureEnabled({feature: 'billingclasses'})) {
				objFields.push({name: 'billingclass', type: 'string'});
			}

			if (this.isRssInstalled) {
				for (var key in objSkillLevels) {
					if (key !== 'baseskillsetscore') {
						objFields.push({name: key, type: 'string'});
					}
				}
			}

			rLog.endMethod();
			return objFields;
		};

		/*
		 * Append search object's columns
		 * @param {Object} params
		 * @param {Object} params.searchObject - search object to modify
		 * @param {String} params.resourceType - whether employee or vendor
		 * @return {None}
		 */
		module.appendSearchColumns = function (params) {
			rLog.startMethod('appendSearchColumns');
			var searchObject = params.searchObject;

			if (rRuntime.isFeatureEnabled({feature: 'billingclasses'})) {
				searchObject.columns.push(rSearch.createColumn({name: 'billingclass'}));
			}
			if (params.resourceType == 'employee' && rRuntime.isFeatureEnabled({feature: 'departments'})) {
				searchObject.columns.push(rSearch.createColumn({name: 'department'}));
			}

			if (this.isRssInstalled) {
				searchObject.columns.push(rSearch.createColumn({name: 'custentity_rss_yoe'}));
				searchObject.columns.push(rSearch.createColumn({
					name: 'custrecord_rss_skillset_skill',
					join: 'custrecord_rss_skillset_resource'
				}));
				searchObject.columns.push(rSearch.createColumn({
					name: 'custrecord_rss_skillset_level',
					join: 'custrecord_rss_skillset_resource'
				}));
			}

			rLog.endMethod();
		};

		/*
		 * Build resource node for store
		 * @param {Object} params
		 * @param {Object} params.eachRecord - search result for resource
		 * @param {String} params.resourceType - whether employee or vendor
		 * @return {Object} resource node
		 */
		module.buildResourceEntry = function (params) {
			rLog.startMethod('buildResourceEntry');

			var eachRecord = params.eachRecord,
				resourceType = params.resourceType,
				objEmployee = {
					id: eachRecord.id,
					name: eachRecord.getValue({name: 'entityid'}),
					type: resourceType,
					billingclass: eachRecord.getText({name: 'billingclass'}) || '',
					laborcost: eachRecord.getValue({name: 'laborcost'}),
					workcalendar: eachRecord.getValue({name: 'workCalendar'}),
					workcal: eachRecord.getText({name: 'workCalendar'}),
					jobtitle: eachRecord.getValue({name: 'title'}),
					phone: eachRecord.getValue({name: 'phone'}),
					email: eachRecord.getValue({name: 'email'}),
					address: eachRecord.getValue({name: 'address'}) || eachRecord.getValue({name: 'billaddress'}) || '',
					url: eachRecord.getValue({name: 'url', join: 'file'}) || ''
				};
			if (resourceType == 'employee') {
				objEmployee.supervisor = eachRecord.getText({name: 'supervisor'});
				if (rRuntime.isFeatureEnabled({feature: 'departments'})) {
					objEmployee.department = eachRecord.getText({name: 'department'});
				}
			}

			if (this.isRssInstalled) {
				objEmployee.yoe = eachRecord.getValue({name: 'custentity_rss_yoe'});
			}

			rLog.endMethod();
			return objEmployee;
		};

		/*
		 * build skillsets node for each resource
		 * @param {Object} params
		 * @param {Object} params.eachRecord - search result for resource
		 * @param {Object} params.objResource - Resource object that will append skillset info
		 * @oaram {Object} params.objSkillLevels - Contains linenumber or the skill mastery value
		 * @return {Array} skillsets info
		 */
		module.buildSkillSet = function (params) {
			rLog.startMethod('buildSkillSet');
			var arrResourceSkills = [];

			if (this.isRssInstalled) {
				var objResource = params.objResource,
					eachRecord = params.eachRecord,
					objSkillLevels = params.objSkillLevels;

				if (!objResource.hasOwnProperty('skillsets')) {
					objResource.skillsets = [];
				}
				if (!objResource.hasOwnProperty('skillsetscore')) {
					objResource.skillsetscore = 0;
				}

				var levelId = +eachRecord.getValue({
					name: 'custrecord_rss_skillset_level',
					join: 'custrecord_rss_skillset_resource'
				});
				if (levelId) {
					//Append skill sets
					var skillName = eachRecord.getText({
							name: 'custrecord_rss_skillset_skill',
							join: 'custrecord_rss_skillset_resource'
						}),
						levelName = eachRecord.getText({
							name: 'custrecord_rss_skillset_level',
							join: 'custrecord_rss_skillset_resource'
						}),
						skillId = +eachRecord.getValue({
							name: 'custrecord_rss_skillset_skill',
							join: 'custrecord_rss_skillset_resource'
						});
					objResource.skillsets.push({
						skillid: skillId,
						skill: skillName,
						levelid: levelId,
						level: levelName
					});

					objResource[skillId] = levelName;
					//Append skill set score
					objResource.skillsetscore += (+objSkillLevels[levelId].linenumber);
					arrResourceSkills.push(skillId);
				}
			}

			rLog.endMethod();
			return arrResourceSkills;
		};

		/*
		 * Compute and set for the availability of resource base from calendar
		 * @param {Object} params
		 * @param {Object} params.objResourceList - Contain calendar info
		 * @param {Object} params.fromDate - start date
		 * @param {Object} params.toDate - end date
		 * @return {None}
		 */
		module.buildResourceAvailability = function (params) {
			rLog.startMethod('buildResourceAvailability');
			var objResourceList = params.objResourceList;
			var objResourceAlloc = this.getTotalAllocatedTimePerResource({
				arrResource: Object.keys(objResourceList),
				fromDate: params.fromDate,
				toDate: params.toDate
			});
			for (var key in objResourceList) {
				objResourceList[key].availability = this.computeAvailability({
					workingtime: objResourceList[key].workingtime,
					allocatedtime: objResourceAlloc[key] || 0
				});
			}

			rLog.endMethod();
		};

		/*
		 * Get allocation base from bill search per employee/vendor
		 * @param {Object} params
		 * @param {Arrat} params.arrResource - Resource list to search
		 * @param {Object} params.fromDate - start date
		 * @param {Object} params.toDate - end date
		 * @return {Object} allocations stored by resource id as key
		 */
		module.getTotalAllocatedTimePerResource = function (params) {
			rLog.startMethod('getTotalAllocatedTimePerResource');
			var objRetAllocations = {},
				arrResource = params.arrResource,
				strFromDate = rFormat.format({value: params.fromDate, type: rFormat.getTypes().DATE}),
				strToDate = rFormat.format({value: params.toDate, type: rFormat.getTypes().DATE}),
				searchOperators = rSearch.getSearchOperators(),
				logicalOperators = rSearch.getLogicalOperators(),
				summaryType = rSearch.getSummaryTypes(),
				searchObject = rSearch.load({id: 'customsearch_proj_racg_rsrc_time_bill'});

			//Append Filters
			var timeBillFilters = [];
			timeBillFilters.push(['resourceallocation.resource', searchOperators.ANYOF, arrResource], logicalOperators.AND);
			timeBillFilters.push(['date', searchOperators.WITHIN, strFromDate, strToDate]);
			var filterExpression = searchObject.filterExpression; //Copy to variable as filterExpression is immutable
			if (searchObject.filterExpression.length) {
				filterExpression.push(logicalOperators.AND);
			}
			filterExpression.push(timeBillFilters);
			searchObject.filterExpression = filterExpression;

			//Execute search
			var rangedResults = searchObject.run().getRange({
				start: 0,
				end: 1000
			});

			for (var ctr = 0; ctr < rangedResults.length; ctr++) {
				var eachRecord = rangedResults[ctr],
					resourceId = eachRecord.getValue({name: 'employee', summary: summaryType.GROUP}),
					allocatedTime = eachRecord.getValue({name: 'durationdecimal', summary: summaryType.SUM}) || 0;
				objRetAllocations[resourceId] = +allocatedTime;
			}

			rLog.endMethod();
			return objRetAllocations;
		};

		/*
		 * Compute availability of a resource
		 * @param {Object} params
		 * @param {Integer} params.workingtime - work time of a resource
		 * @param {Integer} params.allocatedtime - time allocated of a resource
		 * @return {Integer} availability
		 */
		module.computeAvailability = function (params) {
			rLog.startMethod('computeAvailability');
			var availabilityInHrs = params.workingtime - params.allocatedtime;
			var availabilityInPercent = availabilityInHrs / params.workingtime * 100;
			if (availabilityInPercent < 0) {
				availabilityInPercent = 0;
			}

			rLog.endMethod();
			return availabilityInPercent;
		};

		return module;
	}
);