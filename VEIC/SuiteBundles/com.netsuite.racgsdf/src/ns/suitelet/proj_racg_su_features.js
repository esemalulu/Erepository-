/**
 * Copyright © 2018, Oracle and/or its affiliates. All rights reserved.
 *
 * @author jjaramillo
 * @NScriptName PSA RACG SU Features
 * @NScriptId _proj_racg_su_features
 * @NScriptType suitelet
 * @NApiVersion 2.x
 */
define(
	[
		'../adapter/proj_racg_ad_http',
		'../adapter/proj_racg_ad_log',
		'../adapter/proj_racg_ad_runtime',
		'../adapter/proj_racg_ad_file'
	],

	function (rHttp, rLog, rRuntime, rFile) {
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
					returnData = this.getFeatures();
				}
			} catch (e) {
				returnData.success = false;
				returnData.message = 'Failed to get features. Request parameters: ' + JSON.stringify(params.request.body);
				rLog.handleError(e);
			}
			rLog.debug('returnData: ' + JSON.stringify(returnData));
			params.response.write(JSON.stringify(returnData));
			rLog.endMethod();
		};

		/*
		 * Retrieve features and their boolean values
		 * @returns {Boolean} returnData.success - flag to indicate success or failure of loading
		 * @returns {Array} returnData.data - list of feature name and boolean value if enabled or disabled
		 * @returns {String} returnData.message - string message to indicate success of loading
		 */
		module.getFeatures = function () {
			rLog.startMethod('getFeatures');
			var returnData = {
				data: []
			};

			returnData.data.push({name: 'department', isEnabled: rRuntime.isFeatureEnabled({feature: 'DEPARTMENTS'})});
			returnData.data.push({name: 'class', isEnabled: rRuntime.isFeatureEnabled({feature: 'CLASSES'})});
			returnData.data.push({name: 'location', isEnabled: rRuntime.isFeatureEnabled({feature: 'LOCATIONS'})});
			returnData.data.push({
				name: 'billingClass',
				isEnabled: rRuntime.isFeatureEnabled({feature: 'BILLINGCLASSES'})
			});
			returnData.data.push({name: 'subsidiary', isEnabled: rRuntime.isFeatureEnabled({feature: 'SUBSIDIARIES'})});
			returnData.data.push({
				name: 'approvalWorkFlow',
				isEnabled: rRuntime.getCurrentUserPreference({preference: 'CUSTOMAPPROVALRSRCALLOC'})
			});
			returnData.data.push({
				name: 'resourceAllocation',
				isEnabled: rRuntime.isFeatureEnabled({feature: 'RESOURCEALLOCATIONS'})
			});
			returnData.data.push({
				name: 'customRecord',
				isEnabled: rRuntime.isFeatureEnabled({feature: 'CUSTOMRECORDS'})
			});
			returnData.data.push({name: 'clientScript', isEnabled: rRuntime.isFeatureEnabled({feature: 'CUSTOMCODE'})});
			returnData.data.push({
				name: 'serverScript',
				isEnabled: rRuntime.isFeatureEnabled({feature: 'SERVERSIDESCRIPTING'})
			});
			returnData.data.push({
				name: 'customSegments',
				isEnabled: rRuntime.isFeatureEnabled({feature: 'CUSTOMSEGMENTS'})
			});

			returnData.data.push({
				name: 'skillsets',
				isEnabled: this.isBundleInstalled({
					bundleName: 'skillsets'
				})
			});

			returnData.success = true;
			returnData.message = 'Feature list loaded';
			rLog.endMethod();
			return returnData;
		};

		/**
		 * Retrieve installation status of companion bundles
		 * @returns {Boolean} status - true if bundle is installed; false otherwise
		 */
		module.isBundleInstalled = function (params) {
			rLog.startMethod('getFeatures');

			var isInstalled = false;

			var bundleFileMap = {
				'skillsets': {
					fileName: 'rss_bundle_identifier.txt',
					hash: '9be79a64-837c-49ef-8f65-61c093ca1198'
				}
			};

			if (params.bundleName && bundleFileMap[params.bundleName]) {
				var flagFileId = rFile.getFileId({
					name: bundleFileMap[params.bundleName].fileName
				});

				if (flagFileId) {
					var flagFile = rFile.load({
						id: flagFileId
					});

					if (flagFile && flagFile.getContents().indexOf(bundleFileMap[params.bundleName].hash) != -1) {
						isInstalled = true;
					}
				}
			}

			rLog.endMethod();
			return isInstalled;
		};

		return module;
	}
);