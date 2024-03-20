/**
 * Copyright (c) 1998-2018 Oracle-NetSuite, Inc.
 * 2955 Campus Drive, Suite 100, San Mateo, CA, USA 94403-2511
 * All Rights Reserved.
 * 
 * This software is the confidential and proprietary information of
 * NetSuite, Inc. ("Confidential Information"). You shall not
 * disclose such Confidential Information and shall use it only in
 * accordance with the terms of the license agreement you entered into
 * with NetSuite.
 * 
 * * Version    Date            Author           		Remarks
 *   1.00       20 Sept, 2019	Mahesh Pragada		    Initial Version
 *
 * 
 * @NApiVersion 2.0
 * @NScriptType restlet
 *
 *
 **/

define(['N/search', 'N/error'],
	function (NS_Search, error) {

		function getshipment(context) {

			var logTitle = 'savedSearchToJSONLog';

			try {

				log.debug(logTitle, 'getshipment context:' + context);
				var SavedSearchId = context.SearchId;
				var WHLocation = context.LocationId;
				var recordId = context.RecordId;
				var objResult = {};

				if (isEmpty(SavedSearchId)) {
					objResult.success = false;
					objResult.message = 'search: Missing a required argument. SearchId should be provided.';
					return objResult;
				}
				// Load saved search results
				//var results = search(null,option.savedSearch,null, null);

				var results = search(SavedSearchId, WHLocation,recordId);

				log.debug(logTitle, 'results:' + results);
				if (!results || !results.length > 0) {
					throwError('No data returned');
				}

				var columns = null;
				var json = [];
				
				// Get results
				for (var i = 0; results && i < results.length; i++) {
					var result = results[i];
					var objRow = {};

					// Get columns
					columns = columns || ((function (cols) {
						var columns = [];
						for (var c = 0; c < cols.length; c++) {
							var col = cols[c];
							if (col) {
								columns.push({
									name: col.name,
									join: col.join,
									label: col.label,
									summary: col.summary
								});
							}
						}
						return columns;
					})(result.columns));

					// Loop through columns
					if (columns && columns.length > 0) {
						for (var j = 0; j < columns.length; j++) {
							var col = columns[j];
							var label = col.label || col.name;
							objRow[label] = result.getText(col.name, col.join, col.summary) || result.getValue(col.name, col.join, col.summary);
						}
					}
					// Add each row to the final array
					json.push(objRow);

				}
			} catch (e) {
				log.debug(logTitle, 'exception in savedSearchToJSON:' + e.message);
				objResult.success = "NORECORDS";
				objResult.message = e.message;
				return objResult;
			}
			log.debug(logTitle, 'objRow: ' + JSON.stringify(json));
			return json;

		}

		function search(stSearchId, WHLocation,recordId) {
			try {
				var logTitle = 'savedSearchToJSONLog';
				log.debug(logTitle, 'stSearchId:' + stSearchId);
				log.debug(logTitle, 'WHLocation:' + WHLocation);
				log.debug(logTitle, 'recordId:' + recordId);
				
				if (stSearchId == null) {
					throwError('search: Missing a required argument. SearchId should be provided.');
				}
				var objResult = {};
				var arrReturnSearchResults = new Array();
				var objSavedSearch;


				log.debug(logTitle, 'stSearchId :' + stSearchId);
				objSavedSearch = NS_Search.load({ id: stSearchId });

				if (WHLocation != null && WHLocation != '') {
					var filter1 = NS_Search.createFilter({
						name: 'custrecord_wmsse_ship_location',
						operator: NS_Search.Operator.IS,
						values: WHLocation
					});

					objSavedSearch.filters.push(filter1);
				}
				
				if (recordId != null && recordId != ''&&recordId > 0 ) {
					var filter2 = NS_Search.createFilter({
						name: 'internalidnumber',
						operator: NS_Search.Operator.GREATERTHAN,
						values: recordId
					});

					objSavedSearch.filters.push(filter2);
				}

				var objResultset = objSavedSearch.run();
				//log.debug(logTitle, 'objResultset :' + objResultset);
				var intSearchIndex = 0;
				var arrResultSlice = null;
				do {
					arrResultSlice = objResultset.getRange(intSearchIndex, intSearchIndex + 1000);
					log.debug(logTitle, 'arrResultSlice LEN:' + arrResultSlice.length);
					//log.debug(logTitle,'arrResultSlice :' + arrResultSlice);
					if (arrResultSlice == null) {
						break;
					}

					arrReturnSearchResults = arrReturnSearchResults.concat(arrResultSlice);
					//log.debug(logTitle, 'arrReturnSearchResults:' + arrReturnSearchResults);
					intSearchIndex = arrReturnSearchResults.length;
				}

				while (arrResultSlice.length >= 1000);

			} catch (e) {
				log.debug(logTitle, 'exception in search:' + e.message);
				objResult.success = false;
				objResult.message = e.message;
				return objResult;
			}

			return arrReturnSearchResults;
		}

		function Bartender(context) {

			var logTitle = 'savedSearchToJSONLog';

			try {

				log.debug(logTitle, 'Bartender context:' + context);
				var SavedSearchId = context.SearchId;
				var WHLocation = context.LocationId;
				
				var objResult = {};

				if (isEmpty(SavedSearchId)) {
					objResult.success = false;
					objResult.message = 'search: Missing a required argument. SearchId should be provided.';
					return objResult;
				}
				// Load saved search results
				//var results = search(null,option.savedSearch,null, null);

				var results = extlabeldatasearch(SavedSearchId, WHLocation);

				log.debug(logTitle, 'results:' + results);
				if (!results || !results.length > 0) {
					throwError('No data returned');
				}

				var columns = null;
				var json = [];
				
				// Get results
				for (var i = 0; results && i < results.length; i++) {
					var result = results[i];
					var objRow = {};

					// Get columns
					columns = columns || ((function (cols) {
						var columns = [];
						for (var c = 0; c < cols.length; c++) {
							var col = cols[c];
							if (col) {
								columns.push({
									name: col.name,
									join: col.join,
									label: col.label,
									summary: col.summary
								});
							}
						}
						return columns;
					})(result.columns));

					// Loop through columns
					if (columns && columns.length > 0) {
						for (var j = 0; j < columns.length; j++) {
							var col = columns[j];
							var label = col.label || col.name;
							objRow[label] = result.getText(col.name, col.join, col.summary) || result.getValue(col.name, col.join, col.summary);
						}
					}
					// Add each row to the final array
					json.push(objRow);

				}
			} catch (e) {
				log.debug(logTitle, 'exception in savedSearchToJSON:' + e.message);
				objResult.success = "NORECORDS";
				objResult.message = e.message;
				return objResult;
			}
			log.debug(logTitle, 'objRow: ' + JSON.stringify(json));
			return json;

		}

		function extlabeldatasearch(stSearchId, WHLocation) {
			try {
				var logTitle = 'savedSearchToJSONLog';
				log.debug(logTitle, 'stSearchId:' + stSearchId);
				log.debug(logTitle, 'WHLocation:' + WHLocation);
				
				
				if (stSearchId == null) {
					throwError('search: Missing a required argument. SearchId should be provided.');
				}
				var objResult = {};
				var arrReturnSearchResults = new Array();
				var objSavedSearch;


				log.debug(logTitle, 'stSearchId :' + stSearchId);
				objSavedSearch = NS_Search.load({ id: stSearchId });

				if (WHLocation != null && WHLocation != '') {
					var filter1 = NS_Search.createFilter({
						name: 'custrecord_wmsse_ext_location',
						operator: NS_Search.Operator.IS,
						values: WHLocation
					});

					objSavedSearch.filters.push(filter1);
				}
	
				

				var objResultset = objSavedSearch.run();
				//log.debug(logTitle, 'objResultset :' + objResultset);
				var intSearchIndex = 0;
				var arrResultSlice = null;
				do {
					arrResultSlice = objResultset.getRange(intSearchIndex, intSearchIndex + 1000);
					log.debug(logTitle, 'arrResultSlice LEN:' + arrResultSlice.length);
					//log.debug(logTitle,'arrResultSlice :' + arrResultSlice);
					if (arrResultSlice == null) {
						break;
					}

					arrReturnSearchResults = arrReturnSearchResults.concat(arrResultSlice);
					//log.debug(logTitle, 'arrReturnSearchResults:' + arrReturnSearchResults);
					intSearchIndex = arrReturnSearchResults.length;
				}

				while (arrResultSlice.length >= 1000);

			} catch (e) {
				log.debug(logTitle, 'exception in search:' + e.message);
				objResult.success = false;
				objResult.message = e.message;
				return objResult;
			}
			log.debug(logTitle, 'arrReturnSearchResults in bartender:' + arrReturnSearchResults);
			return arrReturnSearchResults;
		}

		function throwError(message) {
			var errorObj = error.create({
				name: 'SearchToJSON',
				message: 'message',
				notifyOff: false
			});
			//log.debug(logTitle, 'printing this:');
			log.error(errorObj);
			throw (errorObj);
		}

		function isEmpty(stValue) {
			if ((stValue == '') || (stValue == null) || (stValue == undefined)) {
				return true;
			}
			return false;
		}

		function Submit(context)
		{
			log.debug('context.type' , context.type);
			if(context.type == "getshipmet")
			{
				var temp = getshipment(context);
				return temp;
				
			}
			else if(context.type == "bartender")
			{
				var temppp= Bartender(context);
				return temppp;
			}
		}

		return {
			post: Submit
		};
	});



