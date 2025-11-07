/**
 * Copyright � 2018, Oracle and/or its affiliates. All rights reserved.
 *
 * @author jjaramillo
 * @NScriptName PSA RACG SU Filters
 * @NScriptId _proj_racg_su_filters
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
		'../custom/proj_racg_cu_translation'
	],

	function (rHttp, rLog, rRecord, rRuntime, rSearch, rTranslation) {
		var module = {};

		/*
		 * Suitelet Default function
		 *
		 * @param {Object} params - onRequest Object
		 * @returns {Void}
		 */
		module.onRequest = function (params) {
			rLog.startMethod('onRequest');
			var returnData = {};
			try {
				if (params.request.method === rHttp.getMethods().GET) {
					returnData = this.getFilters();
				} else {
					returnData = this.saveFilter(params.request.body);
				}
			} catch (e) {
				returnData.success = false;
				returnData.message = 'Failed to process filters. Request parameters: ' + JSON.stringify(params.request.body);
				rLog.handleError(e);
			}
			rLog.debug('returnData: ' + JSON.stringify(returnData));
			params.response.write(JSON.stringify(returnData));
			rLog.endMethod();
		};

		/*
		 * Retrieve filters saved in customrecord_proj_racg_filter
		 * @returns {Boolean} returnData.success - flag to indicate success or failure of loading
		 * @returns {Array} returnData.data - list of filter objects
		 * @returns {Integer} returnData.total - count of filter objects
		 * @returns {String} returnData.message - string message to indicate success of loading
		 */
		module.getFilters = function () {
			rLog.startMethod('getFilters');
			var returnData = {
					data: [],
					total: 0
			};
			var resultSet = rSearch.load({
					id: 'customsearch_proj_racg_all_filters'
			}).run();
			var limit = 1000;
			var start = 0;
			var end = start + limit;
			var length = limit;

			function translateDefaultFilterName (filterName) {
				var filterTransKey;
				var translatedFilter;

				if (filterName === '- Resource Default -') {
					filterTransKey = 'FILTER.RESOURCE_DEFAULT';
				} else if (filterName === '- Project Default -') {
					filterTransKey = 'FILTER.PROJECT_DEFAULT';
				} else if (filterName === '- Customer Default -') {
					filterTransKey = 'FILTER.CUSTOMER_DEFAULT';
				}

				if (filterTransKey) {
					translatedFilter = rTranslation.getTranslationOfKey({key: filterTransKey});
				}

				return translatedFilter ? '- ' + translatedFilter + ' -' : filterName;
			}

			do {
				var rangedResults = resultSet.getRange({
					start: start,
					end: end
				});
				length = rangedResults.length;

				for (var int = 0; int < length; int++) {
					var eachResult = rangedResults[int];
					var isShared = eachResult.getValue('custrecord_proj_racg_filter_is_shared');
					var isDefault = eachResult.getValue('custrecord_proj_racg_filter_is_default');
					var owner = eachResult.getValue('owner');
					var isOwner = (owner === rRuntime.getCurrentUser().id.toString());
					var filterName = translateDefaultFilterName(eachResult.getValue('name'));

					if (isOwner || isShared || isDefault) {
						if (!isOwner && isShared) {
							filterName = filterName + ' [' + eachResult.getText('owner') + ']';
						}
						returnData.data.push({
							id: eachResult.getValue('internalid'),
							name: filterName,
							filterName: filterName,
							owner: owner,
							ownerName: eachResult.getText('owner'),
							inactive: eachResult.getValue('isinactive') === 'T',
							shared: isShared,
							record1: eachResult.getValue('custrecord_proj_racg_filter_record1'),
							field1: eachResult.getValue('custrecord_proj_racg_filter_field1'),
							record2: eachResult.getValue('custrecord_proj_racg_filter_record2'),
							field2: eachResult.getValue('custrecord_proj_racg_filter_field2'),
							record3: eachResult.getValue('custrecord_proj_racg_filter_record3'),
							field3: eachResult.getValue('custrecord_proj_racg_filter_field3'),
							record4: eachResult.getValue('custrecord_proj_racg_filter_record4'),
							field4: eachResult.getValue('custrecord_proj_racg_filter_field4'),
							record5: eachResult.getValue('custrecord_proj_racg_filter_record5'),
							field5: eachResult.getValue('custrecord_proj_racg_filter_field5'),
							record6: eachResult.getValue('custrecord_proj_racg_filter_record6'),
							field6: eachResult.getValue('custrecord_proj_racg_filter_field6'),
							record7: eachResult.getValue('custrecord_proj_racg_filter_record7'),
							field7: eachResult.getValue('custrecord_proj_racg_filter_field7'),
							record8: eachResult.getValue('custrecord_proj_racg_filter_record8'),
							field8: eachResult.getValue('custrecord_proj_racg_filter_field8'),
							viewByType: this.handleViewByType(eachResult.getValue('custrecord_proj_racg_filter_view_by_type')),
							isDefault: isDefault
						});
					}
				}
				start = end;
				end = start + limit;
			} while (length === limit);
			returnData.success = true;
			returnData.message = 'Saved Filters loaded';
			returnData.total = returnData.data.length;
			rLog.endMethod();
			return returnData;
		};

		/*
		 * Default the view by type to 1 (view by resource) if there is no value from the record
		 * No need trigger rLog startMethod and endMethod
		 * @param {Integer} viewByType - selected view by type from the record
		 * @returns {Integer} - viewByType or default value of 1
		 */
		module.handleViewByType = function (viewByType) {
			return viewByType || 1;
		};

		/*
		 * Save a filter record
		 * @param {String} requestBody - request body in string
		 * @returns {Boolean} returnData.success - flag to indicate success or failure of loading
		 * @returns {Array} returnData.data - list with 1 element that is the filter record that was created, updated or deleted
		 * @returns {String} returnData.message - string message to indicate creation or update or deletion of filter record
		 */
		module.saveFilter = function (requestBody) {
			rLog.startMethod('saveFilter');
			var dataInput = JSON.parse(requestBody),
				returnData = {
					success: true
				},
				record = null;
			if (dataInput.isDelete) {
				returnData.message = 'Data Deleted';
				rRecord.delete({
					type: 'customrecord_proj_racg_filter',
					id: dataInput.id
				});
			} else {
				if (dataInput.id === 0) {
					returnData.message = 'Data Added';
					record = rRecord.create({
						type: 'customrecord_proj_racg_filter'
					});
				} else {
					returnData.message = 'Data Updated';
					record = rRecord.load({
						type: 'customrecord_proj_racg_filter',
						id: dataInput.id
					});
				}
				record.setValue({
					fieldId: 'name',
					value: dataInput.filterName
				});
				record.setValue({
					fieldId: 'custrecord_proj_racg_filter_is_shared',
					value: dataInput.shared
				});
				record.setValue({
					fieldId: 'custrecord_proj_racg_filter_view_by_type',
					value: this.handleViewByType(dataInput.viewByType)
				});
				var noneString = rTranslation.getTranslationOfKey({key: 'DISPLAY.NONE'});
				var filterStack = [];
				for (var int = 1; int <= 8; int++) {
					var dataRecord = dataInput['record' + int];
					if (dataRecord && dataRecord !== noneString) {
						filterStack.push({
							record: dataRecord,
							field: dataInput['field' + int]
						});
					}
				}
				for (var int = 1; int <= 8; int++) {
					var recordColumn = 'custrecord_proj_racg_filter_record' + int,
						fieldColumn = 'custrecord_proj_racg_filter_field' + int;
					if (filterStack[int - 1]) {
						record.setValue({
							fieldId: recordColumn,
							value: filterStack[int - 1].record
						});
						record.setValue({
							fieldId: fieldColumn,
							value: filterStack[int - 1].field
						});
					} else {
						record.setValue({
							fieldId: recordColumn,
							value: null
						});
						record.setValue({
							fieldId: fieldColumn,
							value: null
						});
					}
				}
				dataInput.id = record.save();
				dataInput.name = dataInput.filterName;
			}
			returnData.data = [dataInput];
			rLog.endMethod();
			return returnData;
		};

		return module;
	}
);
