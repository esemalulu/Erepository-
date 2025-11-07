/**
 * Copyright � 2018, Oracle and/or its affiliates. All rights reserved.
 *
 * @author jjaramillo
 * @NScriptName PSA RACG SU Settings
 * @NScriptId _proj_racg_su_settings
 * @NScriptType suitelet
 * @NApiVersion 2.x
 */
define(
	[
		'../adapter/proj_racg_ad_http',
		'../adapter/proj_racg_ad_log',
		'../adapter/proj_racg_ad_record',
		'../adapter/proj_racg_ad_runtime',
		'../adapter/proj_racg_ad_search',
		'../custom/proj_racg_cu_utility',
		'N/query'
	],

	function (rHttp, rLog, rRecord, rRuntime, rSearch, rUtility, nQuery) {
		var module = {};

		/*
		 * Suitelet Default function
		 *
		 * @param {Object} params - onRequest Object
		 * @returns {Void}
		 */
		module.onRequest = function (params) {
			rLog.startMethod('onRequest');
			var returnData = {
				success: true
			};
			try {
				if (params.request.method === rHttp.getMethods().GET) {
					returnData.message = 'Get settings';
					returnData.settings = this.getSettings(rUtility.stringToBoolean(params.request.parameters.isDashboard));
				} else {
					returnData.message = 'Save settings';
					returnData.settings = this.saveSettings(params.request.body, rUtility.stringToBoolean(params.request.parameters.isDashboard));
				}
			} catch (e) {
				returnData.success = false;
				returnData.message = 'Failed to process settings. Request parameters: ' + JSON.stringify(params.request.body);
				rLog.handleError(e);
			}
			rLog.debug('returnData: ' + JSON.stringify(returnData));
			params.response.write(JSON.stringify(returnData));
			rLog.endMethod();
		};

		function getProjectFilterId(){
			var queryProjectFilterId = '' +
				'SELECT id ' +
				'FROM customrecord_proj_racg_filter ' +
				'WHERE custrecord_proj_racg_filter_view_by_type = 3 ' +
				'AND custrecord_proj_racg_filter_is_default = \'T\'';
			var projectFilterId = nQuery.runSuiteQL({query: queryProjectFilterId}).results
				.map(function (result) {
					return result.asMap();
				})
				.shift()
				.id;
			return projectFilterId;
		}

		/*
		 * Retrieve settings' values saved in customrecord_proj_racg_ui_setting, will return default settings on fresh bundle install
		 * @returns {Object} defaultSettings - map of setting keys and their values
		 */
		module.getSettings = function (isDashboard) {
			rLog.startMethod('getSettings');
			var defaultFilters = this.getDefaultFilters();
			var defaultSettings = this.getDefaultSettings();
			var searchObject = rSearch.load({
				id: 'customsearch_proj_racg_ui_setting'
			});

			this.appendSearchFilters({searchObject: searchObject});
			var resultSet = searchObject.run();
			var searchResult = resultSet.getRange({
				start: 0,
				end: 1
			})[0];
			if (!defaultFilters.allocation && defaultFilters.customer && defaultFilters.project) {
				rLog.handleError({
					name: 'MISSING_DEFAULT_FILTER',
					message: 'The default allocation filter is missing.'
				});
			}
			if (searchResult) {
				defaultSettings.internalId = searchResult.getValue('internalid') || defaultSettings.internalId;
				defaultSettings.entityId = searchResult.getValue('custrecord_proj_racg_entity_id') || defaultSettings.entityId;
				defaultSettings.entityType = searchResult.getValue('custrecord_proj_racg_entity_type') || defaultSettings.entityType;
				defaultSettings.allocateById = searchResult.getValue('custrecord_proj_racg_allocate_by') || defaultSettings.allocateById;
				defaultSettings.allocateBy = searchResult.getText('custrecord_proj_racg_allocate_by') || defaultSettings.allocateBy;
				defaultSettings.showNumbers = rUtility.booleanToString(searchResult.getValue('custrecord_proj_racg_show_numbers')) || defaultSettings.showNumbers;
				defaultSettings.includeAllResources = rUtility.booleanToString(searchResult.getValue('custrecord_proj_racg_include_all_res')) || defaultSettings.includeAllResources;
				defaultSettings.availabilityColor1 = searchResult.getValue('custrecord_proj_racg_avail_color_1') || defaultSettings.availabilityColor1;
				defaultSettings.availabilityColor2 = searchResult.getValue('custrecord_proj_racg_avail_color_2') || defaultSettings.availabilityColor2;
				defaultSettings.availabilityColor3 = searchResult.getValue('custrecord_proj_racg_avail_color_3') || defaultSettings.availabilityColor3;
				defaultSettings.availabilityColor4 = searchResult.getValue('custrecord_proj_racg_avail_color_4') || defaultSettings.availabilityColor4;
				defaultSettings.availabilityColor5 = searchResult.getValue('custrecord_proj_racg_avail_color_5') || defaultSettings.availabilityColor5;
				defaultSettings.showHovers = rUtility.booleanToString(searchResult.getValue('custrecord_proj_racg_show_hovers')) || defaultSettings.showHovers;
				defaultSettings.showProjectTasks = rUtility.booleanToString(searchResult.getValue('custrecord_proj_racg_show_tasks')) || defaultSettings.showProjectTasks;
				defaultSettings.includeShared = rUtility.booleanToString(searchResult.getValue('custrecord_proj_racg_include_shared')) || defaultSettings.includeShared;
				defaultSettings.selectedFilter = isDashboard ? getProjectFilterId() : (searchResult.getValue('custrecord_proj_racg_selected_filter') || defaultSettings.selectedFilter);
				defaultSettings.includeRejected = rUtility.booleanToString(searchResult.getValue('custrecord_proj_racg_include_rejected')) || defaultSettings.includeRejected;
				defaultSettings.chartDensity = searchResult.getValue('custrecord_proj_racg_chart_density') || defaultSettings.chartDensity;
				defaultSettings.filterNameCounter = searchResult.getValue('custrecord_proj_racg_name_counter') || defaultSettings.filterNameCounter;
				defaultSettings.expandFilterSummary = rUtility.booleanToString(searchResult.getValue('custrecord_proj_racg_expand_filters')) || defaultSettings.expandFilterSummary;
				defaultSettings.hiddenColumns = searchResult.getValue('custrecord_proj_racg_hidden_columns') || defaultSettings.hiddenColumns;
				defaultSettings.lastUsedMode = searchResult.getValue('custrecord_proj_racg_last_used_mode') || defaultSettings.lastUsedMode;
				defaultSettings.limitDecimalPlaces = searchResult.getValue('custrecord_proj_racg_decimal_places') || defaultSettings.limitDecimalPlaces;
				defaultSettings.expandedAllocations = searchResult.getValue('custrecord_proj_racg_expanded_allocs') || defaultSettings.expandedAllocations;
				defaultSettings.dateRange = searchResult.getValue('custrecord_proj_racg_view_preset') || defaultSettings.dateRange;
				defaultSettings.incProjectTemplate = rUtility.booleanToString(searchResult.getValue('custrecord_proj_racg_inc_template')) || defaultSettings.incProjectTemplate;
			}
			rLog.endMethod();
			return defaultSettings;
		};

		/*
		 * Retrieve the internal IDs of the default filters
		 * @returns {Object} returnData - map of default filter type keys and the internal id of their corresponding filters
		 */
		module.getDefaultFilters = function () {
			rLog.startMethod('getDefaultFilters');
			if (!this.defaultFilters) {
				var returnData = {},
					searchObject = rSearch.load({
						id: 'customsearch_proj_racg_all_filters'
					}),
					limit = 1000,
					start = 0,
					end = start + limit,
					length = limit,
					idMap = {1: 'allocation', 2: 'customer', 3: 'project'},
					viewType = null,
					internalId = null;
				searchObject.filters = rSearch.createFilter({
					name: 'custrecord_proj_racg_filter_is_default',
					operator: rSearch.getSearchOperators().IS,
					values: true
				});
				resultSet = searchObject.run();
				do {
					var rangedResults = resultSet.getRange({
						start: start,
						end: end
					});
					length = rangedResults.length;
					for (var int = 0; int < length; int++) {
						var eachResult = rangedResults[int];
						viewType = eachResult.getValue('custrecord_proj_racg_filter_view_by_type');
						returnData[idMap[viewType]] = eachResult.getValue('internalid');
					}
					start = end;
					end = start + limit;
				} while (length === limit);
				this.defaultFilters = returnData;
			}
			rLog.endMethod();
			return this.defaultFilters;
		};

		/*
		 * Save the settings
		 * @param {String} requestBody - request body in string
		 * @returns {String} returnData - copy of requestBody with internal id of new or updated settings record
		 */
		module.saveSettings = function (requestBody, isDashboard) {
			rLog.startMethod('saveSettings');
			var dataInput = JSON.parse(requestBody),
				returnData = dataInput,
				recordType = 'customrecord_proj_racg_ui_setting',
				record = null;
			if (dataInput.internalId > 0) {
				record = rRecord.load({
					type: recordType,
					id: dataInput.internalId
				});
			} else {
				record = rRecord.create({
					type: recordType
				});
			}
			record.setValue({
				fieldId: 'custrecord_proj_racg_filter',
				value: dataInput.filterId
			});
			record.setValue({
				fieldId: 'custrecord_proj_racg_entity_id',
				value: dataInput.entityId
			});
			record.setValue({
				fieldId: 'custrecord_proj_racg_entity_type',
				value: dataInput.entityType
			});
			record.setValue({
				fieldId: 'custrecord_proj_racg_show_numbers',
				value: rUtility.stringToBoolean(dataInput.showNumbers)
			});
			record.setValue({
				fieldId: 'custrecord_proj_racg_allocate_by',
				value: dataInput.allocateById
			});
			record.setValue({
				fieldId: 'custrecord_proj_racg_include_all_res',
				value: rUtility.stringToBoolean(dataInput.includeAllResources)
			});
			record.setValue({
				fieldId: 'custrecord_proj_racg_avail_color_1',
				value: dataInput.availabilityColor1
			});
			record.setValue({
				fieldId: 'custrecord_proj_racg_avail_color_2',
				value: dataInput.availabilityColor2
			});
			record.setValue({
				fieldId: 'custrecord_proj_racg_avail_color_3',
				value: dataInput.availabilityColor3
			});
			record.setValue({
				fieldId: 'custrecord_proj_racg_avail_color_4',
				value: dataInput.availabilityColor4
			});
			record.setValue({
				fieldId: 'custrecord_proj_racg_avail_color_5',
				value: dataInput.availabilityColor5
			});
			record.setValue({
				fieldId: 'custrecord_proj_racg_show_hovers',
				value: rUtility.stringToBoolean(dataInput.showHovers)
			});
			record.setValue({
				fieldId: 'custrecord_proj_racg_show_tasks',
				value: rUtility.stringToBoolean(dataInput.showProjectTasks)
			});
			record.setValue({
				fieldId: 'custrecord_proj_racg_include_shared',
				value: rUtility.stringToBoolean(dataInput.includeShared)
			});
			if (!isDashboard) {
				record.setValue({
					fieldId: 'custrecord_proj_racg_selected_filter',
					value: dataInput.selectedFilter
				});
			}
			record.setValue({
				fieldId: 'custrecord_proj_racg_include_rejected',
				value: rUtility.stringToBoolean(dataInput.includeRejected)
			});
			record.setValue({
				fieldId: 'custrecord_proj_racg_chart_density',
				value: dataInput.chartDensity
			});
			record.setValue({
				fieldId: 'custrecord_proj_racg_name_counter',
				value: dataInput.filterNameCounter
			});
			record.setValue({
				fieldId: 'custrecord_proj_racg_expand_filters',
				value: rUtility.stringToBoolean(dataInput.expandFilterSummary)
			});
			record.setValue({
				fieldId: 'custrecord_proj_racg_hidden_columns',
				value: dataInput.hiddenColumns
			});
			record.setValue({
				fieldId: 'custrecord_proj_racg_last_used_mode',
				value: dataInput.lastUsedMode
			});
			record.setValue({
				fieldId: 'custrecord_proj_racg_decimal_places',
				value: dataInput.limitDecimalPlaces
			});
			record.setValue({
				fieldId: 'custrecord_proj_racg_expanded_allocs',
				value: dataInput.expandedAllocations
			});
			record.setValue({
				fieldId: 'custrecord_proj_racg_view_preset',
				value: dataInput.dateRange
			});
			record.setValue({
				fieldId: 'custrecord_proj_racg_inc_template',
				value: rUtility.stringToBoolean(dataInput.incProjectTemplate)
			});
			returnData.internalId = record.save();
			rLog.endMethod();
			return returnData;
		};

		/*
		 * Map of settings keys and their default values which will be used if a field in settings record have a null value
		 */
		module.getDefaultSettings = function () {
			return {
				internalId: 0,
				entityId: rRuntime.getCurrentUser().id,
				entityType: '1',
				allocateById: 2,
				allocateBy: 'Hours',
				showNumbers: 'T',
				includeAllResources: 'F',
				availabilityColor1: 'FDFF89',
				availabilityColor2: 'BFE8FF',
				availabilityColor3: '79C6F2',
				availabilityColor4: '6695D5',
				availabilityColor5: 'FF1919',
				showHovers: 'T',
				showProjectTasks: 'F',
				includeShared: 'F',
				selectedFilter: this.getDefaultFilters().allocation,
				includeRejected: 'T',
				chartDensity: 2,
				filterNameCounter: 1,
				expandFilterSummary: 'F',
				hiddenColumns: 'F/F/F/F',
				lastUsedMode: 'grid',
				limitDecimalPlaces: 4,
				expandedAllocations: '',
				dateRange: 2,
				incProjectTemplate: 'F'
			};
		};

		/*
		 * Append search object's filters
		 * @param {Object} params.searchObject - search object to modify
		 * @return {None}
		 */
		module.appendSearchFilters = function (params) {
			rLog.startMethod('appendSearchFilters');
			var searchObject = params.searchObject,
				searchOperators = rSearch.getSearchOperators(),
				logicalOperators = rSearch.getLogicalOperators(),
				andLogicalOperator = logicalOperators.AND,
				appendExpression = [];

			appendExpression.push(['custrecord_proj_racg_entity_id', searchOperators.IS, rRuntime.getCurrentUser().id]);
			var filterExpression = searchObject.filterExpression; //Copy to variable as filterExpression is immutable
			if (searchObject.filterExpression.length) {
				filterExpression.push(andLogicalOperator);
			}
			filterExpression.push(appendExpression);
			searchObject.filterExpression = filterExpression;

			rLog.endMethod();
		};

		return module;
	}
);