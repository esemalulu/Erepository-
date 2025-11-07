/**
 * Copyright � 2018, Oracle and/or its affiliates. All rights reserved.
 *
 * @author jjaramillo
 * @NScriptName PSA RACG SU Filter Values
 * @NScriptId _proj_racg_su_filter_values
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
		'N/query',
		'N/record'
	],

	function (rHttp, rLog, rRecord, rRuntime, rSearch, nQuery, nRecord) {
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
				var isDashboard = (params.request.parameters.isDashboard === 'true');
				if (params.request.method === rHttp.getMethods().GET) {
					returnData = this.getFilterValues(isDashboard);
				} else {
					returnData = this.saveBulkOrSingleFilterValues(params.request.body, isDashboard);
				}
			} catch (e) {
				returnData = {};
				returnData.success = false;
				returnData.message = 'Failed to process filter values. Request parameters: ' + JSON.stringify(params.request.body);
				returnData.filterValues = [];
				rLog.handleError(e);
			}
			rLog.debug('returnData: ' + JSON.stringify(returnData));
			params.response.write(JSON.stringify(returnData));
			rLog.endMethod();
		};

		/*
		 * Retrieve filter values saved in customrecord_proj_racg_filter_values
		 * @returns {Boolean} returnData.success - flag to indicate success or failure of loading
		 * @returns {Array} returnData.filterValues - list of filter objects
		 * @returns {String} returnData.message - string message to indicate success of loading
		 */
		module.getFilterValues = function (isDashboard) {
			rLog.startMethod('getFilterValues');
			var returnData = {
					filterValues: []
			};
			const queryStr = '' +
				'SELECT id, \n' +
				'	custrecord_proj_racg_filter, \n' +
				'	custrecord_proj_racg_filter_values_json, \n' +
				'	owner \n' +
				'FROM customrecord_proj_racg_filter_values \n' +
				'WHERE NVL(custrecord_proj_racg_filter_is_dashboard, \'F\') = ' + (isDashboard ? '\'T\'' : '\'F\'');

			var queryResults = nQuery.runSuiteQL({query: queryStr});

			queryResults.iterator()
				.each(function(eachResult) {
					var filterValues = eachResult.value.asMap();
					try {
						returnData.filterValues.push({
							internalId: (filterValues.id) ? filterValues.id.toString() : filterValues.id,
							filterId: (filterValues.custrecord_proj_racg_filter) ? filterValues.custrecord_proj_racg_filter.toString() : filterValues.custrecord_proj_racg_filter,
							filterValuesJson: JSON.parse(filterValues.custrecord_proj_racg_filter_values_json),
							owner: (filterValues.owner) ? filterValues.owner.toString() : filterValues.owner
						});
					} catch (e) {
						rLog.error("Invalid filter value", "Filter value ID: '" + filterValues.id + "'. Error: " + e.message);
					}
					return true;
				});

			returnData.success = true;
			returnData.message = 'Filter values loaded';
			rLog.endMethod();
			return returnData;
		};

		/*
		 * Save, updates or removes a filter
		 * @param {String} dataObj - data payload
		 * @returns {Boolean} returnData.success - flag to indicate success or failure of loading
		 * @returns {Integer} returnData.recordId - internal id if data added or updated, null if deleted
		 * @returns {String} returnData.message - string message to indicate creation or update or deletion of filter values record
		 */
		module.processFilterChange = function(dataObj, isDashboard) {
				var dataInput = dataObj;
				var returnObj = {
					success: true,
					recordId: null
				};
				var recordType = 'customrecord_proj_racg_filter_values';
				var record = null;

				if (dataInput.isDelete) {
					returnObj.message = 'Filter values deleted';
					rRecord.delete({
						type: recordType,
						id: dataInput.internalId
					});
				} else {
					if (dataInput.internalId === -1) {
						returnObj.message = 'Filter values added';
						record = rRecord.create({
							type: recordType
						});
						if (isDashboard) {
							record.setValue({
								fieldId: 'custrecord_proj_racg_filter_is_dashboard',
								value: true
							});
						}
					} else {
						returnObj.message = 'Filter values updated';
						record = rRecord.load({
							type: recordType,
							id: dataInput.internalId
						});
					}
					if (dataInput.filterId) {
						record.setValue({
							fieldId: 'custrecord_proj_racg_filter',
							value: dataInput.filterId
						});
					}
					record.setValue({
						fieldId: 'custrecord_proj_racg_filter_values_json',
						value: JSON.stringify(dataInput.filterValuesJson)
					});
					returnObj.recordId = record.save();
				}

				return returnObj;
			};

		/*
		 * Calls processFilterChange as many times as possible to save, update or remove a filter
		 * @param {String} requestBody - request body in string
		 * @returns {Boolean} returnData.success - flag to indicate success or failure of loading
		 * @returns {Integer} returnData.recordId - internal id if data added or updated, null if deleted
		 * @returns {String} returnData.message - string message to indicate creation or update or deletion of filter values record
		 */
		module.saveBulkOrSingleFilterValues = function (requestBody, isDashboard) {
			rLog.startMethod('saveBulkOrSingleFilterValues');
			var returnData = {};
			var requestJson = JSON.parse(requestBody);

			if (Array.isArray(requestJson)) {
				returnData = [];
				for (var i = 0; i < requestJson.length; i++) {
					returnData.push(this.processFilterChange(requestJson[i], isDashboard));
				}
			} else {
				returnData = this.processFilterChange(requestJson, isDashboard);
			}

			rLog.endMethod();
			return returnData;
		};

		return module;
	}
);