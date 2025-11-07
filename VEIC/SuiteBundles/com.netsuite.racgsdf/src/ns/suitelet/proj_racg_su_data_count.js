/**
 * Copyright © 2018, Oracle and/or its affiliates. All rights reserved.
 *
 * @author jjaramillo
 * @NScriptName PROJ RACG SU Data Count
 * @NScriptId _proj_racg_su_data_count
 * @NScriptType suitelet
 * @NApiVersion 2.x
 */
define(
	[
		'../adapter/proj_racg_ad_log',
		'../adapter/proj_racg_ad_runtime',
		'N/query'
	],

	function (rLog, rRuntime, nQuery) {
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
				success: true,
				dataCount: []
			};
			try {
				returnData.dataCount = this.getDataCount();
			} catch (e) {
				returnData.success = false;
				returnData.message = 'Failed to get data counts. Request parameters: ' + JSON.stringify(params.request.body);
				returnData.dataCount = [];
				rLog.handleError(e);
			}
			rLog.debug('returnData: ' + JSON.stringify(returnData));
			params.response.write(JSON.stringify(returnData));
			rLog.endMethod();
		};

		/*
         * Retrieve data count of various record types
         * @returns {Array} arrDataCount - list of record type key and count value objects
         */
		module.getDataCount = function () {
			rLog.startMethod('getDataCount');

			var getQueryResults = function (query) {
				return query.results[0].toJSON().values[0];
			};

			var arrDataCount = [];


			// TODO: Project Resources - misses resources that were any time in the past assigned to a project
			var queryResourceEmpRes = nQuery.runSuiteQL("SELECT COUNT(id) FROM employee          WHERE isjobresource = 'T'      AND isinactive = 'F'");
			var queryResourceVenRes = nQuery.runSuiteQL("SELECT COUNT(id) FROM vendor            WHERE isjobresourcevend = 'T'  AND isinactive = 'F'");
			var queryResourceGenRes = nQuery.runSuiteQL("SELECT COUNT(id) FROM genericresource   WHERE isinactive = 'F'");
			arrDataCount.push({
				recordType: 'resource',
				count: getQueryResults(queryResourceVenRes) + getQueryResults(queryResourceEmpRes) + getQueryResults(queryResourceGenRes)
			});

			var queryAppRes = nQuery.runSuiteQL("SELECT COUNT(id) FROM employee WHERE isinactive = 'F'");
			arrDataCount.push({
				recordType: 'approver',
				count: getQueryResults(queryAppRes)
			});

			var queryCusRes = nQuery.runSuiteQL("SELECT COUNT(id) FROM customer WHERE isinactive = 'F'");

			arrDataCount.push({
				recordType: 'customer',
				count: getQueryResults(queryCusRes)
			});

			var queryProjectRes = nQuery.runSuiteQL("SELECT COUNT(id) " +
													"FROM job " +
													"WHERE isinactive = 'F' AND nvl(entitystatus, 0) != 1");
			arrDataCount.push({
				recordType: 'project',
				count: getQueryResults(queryProjectRes)
			});

			var projectTaskCount = {};
			var queryProjectTaskRes = null;
			var pageSize = 5000;
			var index = pageSize;

			do {
				var queryProjectTask = "" +
									   "SELECT * FROM (" +
									   "   SELECT a.*, ROWNUM rnum FROM (" +
									   "       SELECT projecttask.project, COUNT(projecttask.id) as count " +
									   "       FROM projecttask " +
									   "       JOIN job ON projecttask.project = job.id " +
									   "       WHERE projecttask.status != 'COMPLETE' " +
									   "           AND job.isinactive = 'F' " +
									   "           AND issummarytask = 'F' " +
									   "       GROUP BY projecttask.project" +
									   "   ) a " +
									   "   WHERE ROWNUM <= " + index + " )" +
									   "WHERE rnum  >= " + (index - pageSize);

				queryProjectTaskRes = nQuery.runSuiteQL(queryProjectTask);

				var iterator = queryProjectTaskRes.iterator();

				iterator.each(function (resultPage) {
					projectTaskCount[resultPage.value.values[0]] = resultPage.value.values[1];
					return true;
				});

				index += pageSize;
			} while (queryProjectTaskRes.results.length === pageSize);

			arrDataCount.push({
				recordType: 'projecttask',
				countBy: projectTaskCount
			});

			if (rRuntime.isFeatureEnabled({feature: 'departments'})) {
				var queryDepartmentRes = nQuery.runSuiteQL("SELECT COUNT(id) FROM department WHERE isinactive = 'F'");
				arrDataCount.push({
					recordType: 'department',
					count: getQueryResults(queryDepartmentRes)
				});
			}
			if (rRuntime.isFeatureEnabled({feature: 'classes'})) {
				var queryClassRes = nQuery.runSuiteQL("SELECT COUNT(id) FROM classification WHERE isinactive = 'F'");
				arrDataCount.push({
					recordType: 'class',
					count: getQueryResults(queryClassRes)
				});
			}
			if (rRuntime.isFeatureEnabled({feature: 'locations'})) {
				var queryLocationRes = nQuery.runSuiteQL("SELECT COUNT(id) FROM location WHERE isinactive = 'F'");
				arrDataCount.push({
					recordType: 'location',
					count: getQueryResults(queryLocationRes)
				});
			}
			if (rRuntime.isFeatureEnabled({feature: 'billingclasses'})) {
				var queryBillingRes = nQuery.runSuiteQL("SELECT COUNT(id) FROM billingclass WHERE isinactive = 'F'");
				arrDataCount.push({
					recordType: 'billingclass',
					count: getQueryResults(queryBillingRes)
				});
			}
			if (rRuntime.isFeatureEnabled({feature: 'subsidiaries'})) {
				var querySubsidiaryRes = nQuery.runSuiteQL("SELECT COUNT(id) FROM subsidiary WHERE isinactive = 'F'");
				arrDataCount.push({
					recordType: 'subsidiary',
					count: getQueryResults(querySubsidiaryRes)
				});
			}

			rLog.endMethod();
			return arrDataCount;
		};

		return module;
	}
);