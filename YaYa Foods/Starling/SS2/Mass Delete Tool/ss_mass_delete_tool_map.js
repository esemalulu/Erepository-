/**
 * @NApiVersion 2.x
 * @NScriptType MapReduceScript
 * @NModuleScope SameAccount
 *
 * This script was provided by Starling Solutions.
 *
 *  Version     Date            Author          Ticket		Remarks
 *************************************************************************
 *  1.0         04 Sep 2019     Mark Baker      			Initial Version
 *  1.1         10 Aug 2020     Dimitry Mazur	STP-140 	CSV saved file functionality update
 *************************************************************************
 */

define(['N/runtime', 'N/search', 'N/record', 'N/url', 'N/email', 'N/file'],

	function (runtime, search, record, url, email, file) {

		/**
		 * Marks the beginning of the Map/Reduce process and generates input data.
		 *
		 * @typedef {Object} ObjectRef
		 * @property {number} id - Internal ID of the record instance
		 * @property {string} type - Record type id
		 *
		 * @return {Array|Object|Search|RecordRef} inputSummary
		 * @since 2015.1
		 */
		function getInputData () {
			log.debug({ title : '** START **', details : '******' });

			var userSearchId 	= runtime.getCurrentScript().getParameter({ name : 'custscript_ss_mass_delete_search_id' });
			var userSearch  	= search.load({ id : userSearchId });
			var userResults		= getSearchResults( search.load({ id : userSearchId }) );
			var ssSearchId 		= getSSsearch(userSearch.searchType);
			var ssResults 		= (ssSearchId) ? getSearchResults( search.load({ id : ssSearchId }) ) : [];
			var ssResultsMap 	= searchResultToMapOfArrays(ssResults);
			var stitchedArray 	= [];
			var userResultsMap  = {};

				// In order to avoid multiple accessing of the same ID, we only need one entry per id
			userResults.forEach(function(result){
				if (!userResultsMap[result.id]) {
					userResultsMap[result.id] = {type: result.recordType};
				}
			});
			log.audit({ title : 'userResultsMap', details : userResultsMap });

				// The stitched array will include the type, id and the csvData for the file
			Object.keys(userResultsMap).forEach(function(recordId){
				stitchedArray.push({
					type	: userResultsMap[recordId].type,
					id		: recordId,
					csvData : ssResultsMap[recordId]
				})
			});
			log.audit({ title : 'stitchedArray, length ' + stitchedArray.length, details : stitchedArray });

			return stitchedArray;
		}


		/**
		 * Executes when the map entry point is triggered and applies to each key/value pair.
		 *
		 * @param {MapSummary} context - Data collection containing the key/value pairs to process through the map stage
		 * @since 2015.1
		 */
		function map (context) {
			var thisResult  = JSON.parse(context.value);
			var recordType  = thisResult.type;
			var recordId    = thisResult.id;

			try {
				record['delete']({ type : recordType, id : recordId });
				thisResult.success = true;
			}
			catch(e) {
				thisResult.error = e;
			}
			context.write({key: context.key, value: JSON.stringify(thisResult)});
		}


		/**
		 * Executes when the reduce entry point is triggered and applies to each group.
		 *
		 * @param {ReduceSummary} context - Data collection containing the groups to process through the reduce stage
		 * @since 2015.1
		 */
		function reduce (context) {
			log.debug({ title : 'Reducing result ' + context.key, details : 'Values: ' + JSON.stringify(context.values) });
		}


		/**
		 * Executes when the summarize entry point is triggered and applies to the result set.
		 *
		 * @param {Summary} summary - Holds statistics regarding the execution of a map/reduce script
		 * @since 2015.1
		 */
		function summarize (summary) {
			log.debug({ title : 'Summary', details : JSON.stringify(summary) });

			var thisScript  = runtime.getCurrentScript();
			var userId      = thisScript.getParameter({ name : 'custscript_ss_mass_delete_user_id' });
          	var userName = 'unknown_user';

			if (userId) {
				try {
                  userName = search.lookupFields({type: search.Type.EMPLOYEE, id: userId, columns: ['altname']}).altname || '';
                  userName = userName.replace(' ', '_');
                }
              	catch(e) {
                  log.debug({ title : 'Unable to lookup user name', details : e });
                }
			}

			var userSearchId 	= thisScript.getParameter({ name : 'custscript_ss_mass_delete_search_id' });
			var userSearch  	= search.load({ id : userSearchId });
			var ssSearchId 		= getSSsearch(userSearch.searchType);
			var fileName 		= 'Mass_Delete_Log_' + userSearch.searchType + '_' + (new Date().toISOString()) + '_' + userName;
			var searchUrl   	= '/app/common/search/searchresults.nl?searchid=' + userSearchId;
			var folderId    	= thisScript.getParameter({ name : 'custscript_ss_mass_delete_log_folder_id' });
			var fileLinesMax   	= 10000; // Maximum lines in a file before we break to another file¨
			var docNum      	= 1; //Start at one to allow for calculation below
			var totalErrors 	= 0;
			var userRecIds		= [];
			var errors      	= {};
			var csvLines		= [];
			var errorRecs		= [];

			// Extract the IDs that were successfully deleted and their CSV data
			summary.output.iterator().each(function (key, value){

				var thisResult  = JSON.parse(value);

				if (thisResult.success) {

					userRecIds.push(thisResult.id);

					thisResult.csvData.forEach(function(csvLine){
						csvLines.push(csvLine);
					});
				}
				else {
					log.error({ title   : 'Map error for key: ' + key + ', ID #.  ' + thisResult.id, details : thisResult });

					if (errors[thisResult.name] === undefined) {
						errors[thisResult.name] = 0;
					}
					errorRecs.push(thisResult);
					errors[thisResult.name]++;
					totalErrors++;
				}

				return true;
			});

			// If record.delete failed on afterSubmit, the record can still be deleted, so add them to the CSV.
			// For that, we repeat the search and see if any of the errored record ids are missing now
			if (errorRecs.length) {
				var ssResults 		= (ssSearchId) ? getSearchResults( search.load({ id : ssSearchId }) ) : [];
				var ssResultsMap 	= searchResultToMapOfArrays(ssResults);

				errorRecs.forEach(function(erroredRec){
					if (!ssResultsMap[erroredRec.id]) {
						csvLines.push(erroredRec.csvData);
					}
				})
			}

			// Using those IDs, filter out Starling Search used to store fields in a csv
			if (userRecIds.length > 0) {

				log.audit({title: 'Got ' + csvLines.length + ' csv Lines', details: 'first line: ' + JSON.stringify(csvLines) });

				var columnNames     = getFormattedKeys( csvLines[0] );

				log.audit({title: 'Got ' + columnNames.length + 'csv Columns', details: columnNames });

					// Start the first log file. Add the first row of columns, then add a line break to signify a new line
				var contents    	= columnNames.join(',') + '\n';
				var csvLinks    	= [];

				csvLines.forEach(function(result, index) {

					// Compile each row into a comma separated string, then add it to contents.

					var newRow  = [];

					columnNames.forEach(function(columnName) {

						var textIndex = columnName.indexOf('_text');
						var valueIndex = columnName.indexOf('_value');

						if (textIndex !== -1) {
							columnName  = columnName.substring(0, textIndex);
							var value 	= (result.values[columnName][0] ? result.values[columnName][0].text : '')
						}
						else if (valueIndex !== -1) {
							columnName  = columnName.substring(0, valueIndex);
							var value 	= (result.values[columnName][0] ? result.values[columnName][0].value : '')
						}
						else {
							var value 	= result.values[columnName];
						}

						//Put double quotes around every field with a value to ensure that no escaped characters are lost
						newRow.push( value ? '"' + formatCsvString( String(value) ) +'"'  : '' );
					});

					contents += newRow.join(',') + '\n';

					if ( index === ( fileLinesMax * docNum ) || index === (csvLines.length - 1) ) { // If we've reached the end of the chunk or this is the last line

						//Save a CSV file with the current dataset and start again...
						var csvFile = file.create({
							name        : fileName + ('0' + docNum).slice(-2) + '.csv',
							fileType    : file.Type.CSV,
							contents    : contents,
							folder      : folderId,
							isOnline	: true,
						});
						var newCsvId 	= csvFile.save();
						var newCsv 		= file.load({id: newCsvId}); // Reloading to get the url created

						csvLinks.push('<a class="dottedlink" href="' + newCsv.url + '">' + newCsv.name + '</a>');

						log.audit({ title : fileName + ' CSV Created, Id : ' + newCsvId , details : csvFile });

						// If not last line
						if ( index <= csvLines.length - 1 ) {

							//Reset contents and build a new CSV string. Add the first row of columns, then add a line break to signify a new line.
							contents = columnNames.join(',') + '\n';
							docNum++;
						}
					}
				});
			}

			log.audit({ title : 'Total Errors', details : totalErrors });
			log.audit({ title : 'Errors list', details : errors });

			if (userId) {
				var emailBody = '';

				if (totalErrors > 0) {
					emailBody   +=  totalErrors + ' records could not be deleted. A count of the error types is below:<br><br>';
					emailBody   += '<table style="border: 1px solid black;border-collapse: collapse; text-align: center;font-size: 12pt"><tr><th style="border: 1px solid black; padding: 5px">Error Description</th><th style="border: 1px solid black; padding: 5px">Error Count</th></td></tr>';

					Object.keys(errors).forEach(function(errorName) {
						emailBody += '<tr><td style="border: 1px solid black; padding: 5px">' + errorName + '</td><td style="border: 1px solid black; padding: 5px">' + errors[errorName] + '</td></tr>'
					});

					emailBody   += '</table>';
				}
				else {
					emailBody   += 'All results were successfully deleted.';
				}

				emailBody       += '<br><br>To view the remaining search results, click <a href="' + searchUrl + '">here</a>.'

				if (csvLinks && csvLinks.length) {
					emailBody       += '<br><br>CSV Log file(s) of deleted records: <br>' + csvLinks.join(',');
				}


				var emailOptions = {
					author      : userId,
					recipients  : [userId],
					subject     : 'Mass deletion completed on search id ' + userSearchId,
					body        : emailBody
				};

				log.audit({ title : 'Sending email to ' + emailOptions.recipients, details : emailOptions.subject });

				email.send(emailOptions);
			}
			else {
				log.error({ title : 'No email address found - no email sent' });
			}

			log.debug({ title : '** END **', details : '******' });
		}


		// Helper Functions

		/**
		 * Get all results from a search
		 *
		 * @param thisSearch
		 * @returns {Array|*|Array|T[]}
		 */
		function getSearchResults (thisSearch) {
			var results   = [];
			var pagedData = thisSearch.runPaged({ pageSize : 1000 });

			if (pagedData.count == 0) {
				return results;
			}

			var page = pagedData.fetch({ index : 0 });
			results  = page.data;

			while (!page.isLast) {
				page    = page.next();
				results = results.concat(page.data);
			}

			log.debug({ title : 'Total Search Results', details : results.length });

			return results;
		}

		/**
		 * Use a regular expression to check for double quotes, and if found, replace them with "". This will allow them to
		 * be formatted correctly in the csv file.
		 *
		 * @param {String} inputString - The incoming string to be tested.
		 * @returns {String} - cleanString - The string encased in double quotes if necessary, or simply returned if no offending chars are found.
		 */
		function formatCsvString( inputString ) {

			var cleanString     = '';
			var quotePattern    = /"/g; //Detects double quotes

			if ( !inputString ) {
				return cleanString;
			}

			cleanString = inputString.replace(quotePattern, '""'); //Replace double quotes with double-double quotes.

			return cleanString; //Replace any double quotes with a double quote INSIDE double quotes.
		}

		/**
		 * Extracts column names for CSV
		 * Ensures that all column names are valid CSV strings and contain no commas, line breaks, or carriage returns.
		 *
		 * @param {Array} keys - The column objects to be processed.
		 * @returns {Array} - output - An array of strings with cleaned, valid column names .
		 */
		function getFormattedKeys ( result ) {
				// Used to extract the values in a JSON, so that we can know if we have a select field in there or not
				// Any joins will be converted to dots
			var resultJson = JSON.parse(JSON.stringify(result));

			var output = []; //Create an empty array to store the keys in after processing.

			Object.keys(resultJson.values).forEach(function(fieldId) {

				var fieldValue = resultJson.values[fieldId];

				if (fieldValue && Array.isArray(fieldValue) ) { // An empty select field would have a [] value. Populated select fields will have an array with object, text and value
					output.push( formatCsvString(fieldId + '_value') );
					output.push( formatCsvString(fieldId + '_text') );
				}
				else {
					output.push( formatCsvString(fieldId) );
				}
			});

			return  output;
		}


		/**
		 * Gets a SS search associated with the search type provided
		 * @param {String} searchType - String of the Search.Type
		 * @returns {Number} - output - SS search ID. Can be undefined
		 */

		function getSSsearch (searchType){
			// Maps record types to searches created by Starlings used to extract field data we want to save
			var SS_SEARCHES = {};
			SS_SEARCHES[search.Type.CUSTOMER] 		= 'customsearch_ss_cus_fields_to_delete'; 	// [SS - MDT] Customers to Delete
			SS_SEARCHES[search.Type.VENDOR] 		= 'customsearch_ss_ven_fields_to_delete'; 	// [SS - MDT] Vendor to Delete
			SS_SEARCHES[search.Type.ITEM] 			= 'customsearch_ss_item_fields_to_delete';	// [SS - MDT] Items to Delete
			SS_SEARCHES[search.Type.TRANSACTION] 	= 'customsearch_ss_tx_fields_to_delete';	// [SS - MDT] Transactions to Delete

			// TODO this will miss many search types ex: searchType:salesorder, missing this information could cause us a lot of headaches
			// Answer: This script is intended to handle UI based searches, that are created only the searchType : transaction with the transaction type as a filter.

			return SS_SEARCHES[searchType];
		}


		/**
		 *  Make out search into a map by ID for faster reference
		 * @param {Array} results - Array of Search Results
		 * @returns {Object} - Search Results mapped by Result.id
		 */
		function searchResultToMapOfArrays(results) {
			var map = {};
			results.forEach(function(result){
				if (!map[result.id]) {
					map[result.id] = [];
				}
				map[result.id].push(result);
			});

			log.debug({ title : 'searchResultToMapOfArrays', details : map });
			return map;
		}


		return {
			getInputData : getInputData,
			map          : map,
			// reduce       : reduce,
			summarize    : summarize
		};
	});