/**
 * Copyright � 2018, Oracle and/or its affiliates. All rights reserved.
 *
 * @author pmiller
 * @NScriptName RACG SU Cache Customer
 * @NScriptId _proj_racg_su_cache_cust
 * @NScriptType suitelet
 * @NApiVersion 2.x
 */

define(
	[
		'../adapter/proj_racg_ad_search',
		'../adapter/proj_racg_ad_url',
		'../adapter/proj_racg_ad_log'
	],
	function (rSearch, rUrl, rLog) {
		var module = {};

		/*
		 * Suitelet Default function. Returns a specific customer record given certain criteria via request parameters.
		 *
		 * @param {Object} params - onRequest Object
		 * @returns {Void}
		 */
		module.onRequest = function (context) {
			rLog.startMethod('onRequest');

			var params = context.request.parameters;

			var responseJson = {
				customers: []
			};

			if (this.isRequestValid(params)) {
				var customerSearch = rSearch.load({
					id: 'customsearch_proj_racg_customer_details'
				});

				customerSearch.filters = rSearch.createFilter({
					name: 'internalid',
					operator: rSearch.getSearchOperators().ANYOF,
					values: params.recordId
				});

				var results = customerSearch.run().getRange(0, 1000);

				for (i in results) {
					var result = results[i];

					responseJson.customers.push({
						internalId: result.getValue('internalid'),
						customerId: result.getValue('entityid'),
						companyName: result.getValue('companyname'),
						category: result.getText('category'),
						primarySubsidiary: result.getText('subsidiary'),
						primaryContact: result.getValue(result.columns[5]), // result.getValue({ name : 'entityid', join : 'primarycontact' }) won't work somehow
						city: result.getValue('city'),
						state: result.getText('state'), // getValue and getText both return the value somehow (e.g. AK instead of Alaska)
						country: result.getText('country'),
						url: rUrl.resolveRecord({
							recordType: 'customer',
							recordId: result.getValue('internalid'),
							isEditMode: false
						})
					});
				}
			}

			context.response.write(JSON.stringify(responseJson));

			rLog.endMethod('onRequest');
		};

		/*
		 * Checks if request is valid. The params object is considered valid if it contains all fields indicated in the method as required.
		 *
		 * @param {Object} params - onRequest Object
		 * @returns {Boolean} isValid - true if params is valid
		 */
		module.isRequestValid = function (params) {
			rLog.startMethod('isRequestValid');

			var isValid = true,
				required = ['recordId'];

			for (param in required) {
				if (!params[required[param]]) {
					rLog.error('Missing required parameter: ' + required[param]);
					isValid = false;
					break;
				}
			}

			rLog.endMethod('isRequestValid');

			return isValid;
		};

		return module;
	}
);