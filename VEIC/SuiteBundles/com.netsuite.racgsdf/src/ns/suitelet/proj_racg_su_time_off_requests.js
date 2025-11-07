/**
 * Copyright © 2018, Oracle and/or its affiliates. All rights reserved.
 *
 * @author pmiller
 * @NScriptName PSA RACG SU Time-Off Requests
 * @NScriptId _proj_racg_su_time_off_reqs
 * @NScriptType suitelet
 * @NApiVersion 2.x
 */
define(
	[
		'../adapter/proj_racg_ad_log',
		'../adapter/proj_racg_ad_search',
		'../adapter/proj_racg_ad_runtime',
		'../custom/proj_racg_cu_date',
		'../custom/proj_racg_cu_request_builder',
		'N/query'
	],

	function (rLog, rSearch, rRuntime, rDate, rRequestBuilder, nQuery) {
		var module = {};

		/**
		 * Suitelet Default function. Returns all approved Time-Off Requests for now.
		 *
		 * @param {Object} params - onRequest Object
		 * @returns {Void}
		 */
		module.onRequest = function (params) {
			rLog.startMethod('onRequest');
			var returnData = {
				success: true,
				data: []
			};

			try {
				if (rRuntime.isFeatureEnabled({feature: 'timeoffmanagement'})) {
					var requestParams = rRequestBuilder.buildRequestParameters({
						request: params.request
					});
					var me = this;
					var query = "SELECT timeoffrequest.id,\n" +
						"       timeoffrequest.employee,\n" +
						"       timeoffrequest.startdate,\n" +
						"       timeoffrequest.enddate,\n" +
						"       timeoffrequestdetailsmachine.timeoffdate,\n" +
						"       timeoffrequestdetailsmachine.amountoftime,\n" +
						"       timeoffrequestdetailsmachine.timeofftype,\n" +
						"       timeoffrequestdetailsmachine.timeunit\n" +
						 "FROM timeoffrequest,\n" +
						"       timeoffrequestdetailsmachine\n" +
						" WHERE timeoffrequest.id = timeoffrequestdetailsmachine.timeoffrequest\n" +
						"       AND timeoffrequest.approvalstatus = '8'\n";

					if (requestParams.resourceId) {
						query += "       AND timeoffrequest.employee = " + requestParams.resourceId + "\n";
					} else if (requestParams.resourcesFilter && requestParams.resourcesFilter.length) {
						query += "       AND timeoffrequest.employee IN (" + requestParams.resourcesFilter.join(',') + ")\n";
					}

					var queryResultsIterator = nQuery.runSuiteQLPaged({
						query: query,
						pageSize: 1000,
					}).iterator();

					queryResultsIterator.each(function (page) {
						var pageIterator = page.value.data.iterator();

						pageIterator.each(function (result) {
							returnData.data.push(me.createResultObject(result));
							return true;
						})

						return true;
					});
				} else {
					returnData.message = 'Time-Off Management Feature is disabled.';
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

		module.createResultObject = function (result) {
			var formattedTimeoffDate = rDate.dateToFormat({
				date: result.value.getValue(4),
				format: 'yyyy/MM/dd',
			});
			return {
				employeeId: result.value.getValue(1),
				// timeoffrequestdetailsmachine.internalId is not exposed to USR, we compose this "fake" internalId
				internalId: result.value.getValue(0) + ":" + formattedTimeoffDate,
				startDate: rDate.dateToFormat({
					date: result.value.getValue(2),
					format: 'yyyy/MM/dd',
				}),
				endDate: rDate.dateToFormat({
					date: result.value.getValue(3),
					format: 'yyyy/MM/dd',
				}),
				timeOffDate: formattedTimeoffDate,
				amountOfTime: result.value.getValue(5),
				timeOffType: result.value.getValue(6),
				timeUnit: result.value.getValue(7),
			}
		}

		return module;
	}
);