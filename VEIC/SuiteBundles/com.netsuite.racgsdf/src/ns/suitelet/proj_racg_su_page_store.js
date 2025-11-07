/**
 * Copyright � 2018, Oracle and/or its affiliates. All rights reserved.
 *
 * @author jjaramillo
 * @NScriptName PSA RACG SU Page Store
 * @NScriptId _proj_racg_su_page_store
 * @NScriptType suitelet
 * @NApiVersion 2.x
 */
define(
	[
		'../adapter/proj_racg_ad_log',
		'../custom/proj_racg_cu_request_builder',
		'../custom/proj_racg_cu_translation',
		'../suitelet/proj_racg_su_resource'
	],

	function (rLog, rRequestBuilder, rTranslation, rResource) {
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
				data: []
			};
			try {
				var leftPaneData = JSON.parse(rResource.getData(params)),
					requestParams = rRequestBuilder.buildRequestParameters({
						request: params.request
					});
				requestParams.limit = parseInt(params.request.parameters.limit); //need to reset so that limit is not null; albeit it was necessary for limit to be nulled when getting all of the nodes in the leftPaneData

				returnData.data = this.getPagingDetails({
					leftPaneData: leftPaneData,
					requestParams: requestParams
				});
			} catch (e) {
				returnData.success = false;
				returnData.message = 'Failed to get paging details. Request parameters: ' + JSON.stringify(params.request.body);
				returnData.data = [[]];
				rLog.handleError(e);
			}
			rLog.debug('returnData: ' + JSON.stringify(returnData));
			params.response.write(JSON.stringify(returnData));
			rLog.endMethod();
		};

		/*
		 * Retrieve paging details based on left pane hierarchy data from proj_racg_su_resource
		 * @param {Object} params.leftPaneData - return data of getData from proj_racg_su_resource
		 * @param {Object} params.requestParams - map of request parameters that have been null checked or typecasted
		 * @returns {Array} pages - list of page detail objects
		 */
		module.getPagingDetails = function (params) {
			rLog.startMethod('getPagingDetails');
			var pages = [];
			if (params.leftPaneData.children.length > 0 && params.leftPaneData.children[0].Name !== rTranslation.getTranslationOfKey({key: 'SS.MESSAGE.NO_RESULTS_VIEW'})) {
				switch (+params.requestParams.viewResourcesBy) {
					case 1:
						pages = this.getResourcePages(params);
						break;
					case 2:
						pages = this.getCustomerPages(params);
						break;
					case 3:
						pages = this.getProjectPages(params);
						break;
				}
			}
			rLog.endMethod();
			return pages;
		};

		/*
		 * Retrieve paging details for resource view
		 * @param {Object} params.leftPaneData - return data of getData from proj_racg_su_resource
		 * @param {Object} params.requestParams - map of request parameters that have been null checked or typecasted
		 * @returns {Array} pages - list of page detail objects
		 */
		module.getResourcePages = function (params) {
			rLog.startMethod('getResourcePages');
			var pages = [],
				nodes = params.leftPaneData.children,
				length = nodes.length,
				limit = params.requestParams.limit,
				endIndex = null;
			for (var i = 0; i < length; i = i + limit) {
				endIndex = i + limit - 1;
				if (endIndex >= length) endIndex = length - 1;
				pages.push({
					id: pages.length,
					name: nodes[i].resourceName + ' - ' + nodes[endIndex].resourceName,
					start: i
				});
			}
			rLog.endMethod();
			return pages;
		};

		/*
		 * Retrieve paging details for customer view
		 * @param {Object} params.leftPaneData - return data of getData from proj_racg_su_resource
		 * @param {Object} params.requestParams - map of request parameters that have been null checked or typecasted
		 * @returns {Array} pages - list of page detail objects
		 */
		module.getCustomerPages = function (params) {
			rLog.startMethod('getCustomerPages');
			var pages = [],
				nodes = params.leftPaneData.children,
				length = nodes.length,
				limit = params.requestParams.limit,
				endIndex = null;
			for (var i = 0; i < length; i = i + limit) {
				endIndex = i + limit - 1;
				if (endIndex >= length) endIndex = length - 1;
				pages.push({
					id: pages.length,
					name: nodes[i].customerName + ' - ' + nodes[endIndex].customerName,
					start: i
				});
			}
			rLog.endMethod();
			return pages;
		};

		/*
		 * Retrieve paging details for project view
		 * @param {Object} params.leftPaneData - return data of getData from proj_racg_su_resource
		 * @param {Object} params.requestParams - map of request parameters that have been null checked or typecasted
		 * @returns {Array} pages - list of page detail objects
		 */
		module.getProjectPages = function (params) {
			rLog.startMethod('getProjectPages');
			var pages = [],
				nodes = params.leftPaneData.children,
				length = nodes.length,
				limit = params.requestParams.limit,
				endIndex = null,
				startRange = null,
				endRange = null;
			for (var i = 0; i < length; i = i + limit) {
				endIndex = i + limit - 1;
				if (endIndex >= length) endIndex = length - 1;
				startRange = nodes[i].projectName;
				endRange = nodes[endIndex].projectName;
				if (params.requestParams.incProjectTemplate) {
					var noneString = rTranslation.getTranslationOfKey({key: 'DISPLAY.NONE'});
					if (!startRange || startRange === noneString) {
						startRange = nodes[i].projectName;
					}
					if (!endRange || endRange === noneString) {
						endRange = nodes[endIndex].projectName;
					}
				}
				pages.push({
					id: pages.length,
					name: startRange + ' - ' + endRange,
					start: i
				});
			}
			rLog.endMethod();
			return pages;
		};

		return module;
	}
);