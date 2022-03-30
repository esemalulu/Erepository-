/*
 ***********************************************************************
 *
 * The following JavaScript code is created by GURUS Solutions,
 * a NetSuite Partner. It is a SuiteFlex component containing custom code
 * intended for NetSuite (www.netsuite.com) and uses the SuiteScript API.
 * The code is provided "as is": GURUS Solutions shall not be liable
 * for any damages arising out the intended use or if the code is modified
 * after delivery.
 *
 * Company:		GURUS Solutions inc., www.gurussolutions.com
 *              	Cloud Consulting Pioneers                      
 * Author:		sarmad.nomani@gurussolutions.com
 * Date:		Jan 22, 2021 10:15:10 AM
 * File:		GRAD_LIB_GeneralLibrary2.0.js

 ***********************************************************************/

/**
 *@NApiVersion 2.0
 *@NModuleScope SameAccount
 */

define(['N/search', 'N/log', 'N/error', 'N/https', 'N/record', 'N/runtime', 'N/email'], function(searchModule, logModule, errorModule, httpsModule, recordModule, runtimeModule, emailModule){

	var NS_MAX_SEARCH_RESULT = 1000;
	var NS_MIN_SEARCH_RESULT = 5;

	var SUCCESS_STATUS = "200";
	var ERROR_STATUS = "400";

	var ITR_LIB_DEFAULT_PAGE_SIZE = 50;


	/**
	 * forceParseFloat : Takes a textual value and converts it into a float value.
	 *
	 * Common usage : Take a NetSuite field value and convert it into a workable float number
	 *
	 * Example : forceParseFloat('5.99') = 5.99
	 *
	 * @param {string} valueToParse : textual value to parse into a float
	 *
	 * @return {float} parsedValue : text value forced into a float (0 if NaN)
	 *
	 * @author ERP Guru
	 */
	function forceParseFloat(valueToParse){
	    var parsedValue = parseFloat(valueToParse);

	    if (isNaN(parsedValue)) {
	        parsedValue = 0;
	    }

	    return parsedValue;
	}

	/**
	 * The following function will perform a search and retrieve all results and returns an array
	 *
	 * @author richard.wou@gurussolutions.com
	 * @param {String} type : The record type
	 * @param {[]} filter : The filter array
	 * @param {[]} column : The column array
	 * @return {[]} results : The entire search result
	 * @governance 10 units per 1000 results
	 */
	/*function guruSearchRecord(type, filter, column){
	    var results = [];

	    // Type is required or else create search will break
	    if (type != null && type != '' && typeof type !== 'undefined') {
	        var searchObject = searchModule.create({
				type: type,
				filters: filter,
				columns: column
			});

	        var searchResultsSets = searchObject.run();

	        var allResultsFound = false;
	        var resultsSetsCounter = 0;

	        while (!allResultsFound) {

	            // We start from 0 to 1000, increment the resultsSetsCounter as we go to move by 1000 increments. 1000 to 2000, 2000 to 3000 ...
	            var resultsSet = searchResultsSets.getRange(resultsSetsCounter * NS_MAX_SEARCH_RESULT, NS_MAX_SEARCH_RESULT + NS_MAX_SEARCH_RESULT * resultsSetsCounter);

	            // If original results set is empty, we stop
	            if (resultsSet == null || resultsSet == "") {
	                allResultsFound = true;
	            } else {
	                // If current results set is under the maximum number of results we know it is the final iteration and stop
	                if (resultsSet.length < NS_MAX_SEARCH_RESULT) {
	                    results = results.concat(resultsSet);
	                    allResultsFound = true;
	                } else {
	                    // Otherwise we keep on concatenating the results
	                    results = results.concat(resultsSet);
	                    resultsSetsCounter++;
	                }
	            }
	        }
	    } else {
	        throw errorModule.create({
	        	code: "SSS_MISSING_REQD_ARGUMENT",
	        	message: "Missing a required argument : type"
	        });
	    }

	    return results;
	}*/

	/**
	 * The following function will perform a search and retrieve all results and returns an array
	 *
	 * @author richard.wou@gurussolutions.com
	 * @param  {String} options.type : The record type
	 * @param  {Array}  options.filters : The filter array
	 * @param  {Array}  options.columns : The column array
	 * @param  {Number} options.maxResults : the maximum number of results to return (can be null)
	 * @return {Array}  results : The entire search result
	 * @governance 5 + 5R units (R is per 1000 records)
	 */
	function guruSearchRecord(type, filters, columns, maxResults){
		if (type) {
			var search = searchModule.create({
				type: type,
				filters: filters || null,
				columns: columns || null
			});
			return executeSearch({search: search, maxResults: maxResults}); // 5 + 5R units (R is per 1000 records)
		} else {
			throw errorModule.create({
				code: "SSS_MISSING_REQD_ARGUMENT",
				message: "Missing a required argument : type"
			});
		}
	}

	/**
	 * The following function will load a saved search, run the search and retrieve all the
	 * results.
	 *
	 * @author riley.vanryswyk@gurussolutions.com
	 * @param  {String} options.searchId 			: The internal id of the search to run
	 * @param  {String} options.searchType			: The internal id name of the record type of the search
	 * @param  {Array}  options.filterExpression  	: Additional filters to add (filter expression to be ANDed)
	 * @param  {Number} options.maxResults 			: the maximum number of results to return (can be null)
	 * @return {Array}  results : The entire search result
	 * @governance 10 + 5R units (R is per 1000 records)
	 */
	function guruRunSavedSearch(options) {
		if (options.searchId) {
			var search = searchModule.load({
				id: options.searchId,
				type: options.searchType || null
			}); // 5 units

			// Add additional filters
			if(options.filterExpression && options.filterExpression.length > 0) {
				var mergedFilters = [];
				mergedFilters.push(options.filterExpression);
				if(search.filterExpression && search.filterExpression.length > 0) {
					mergedFilters.push('AND');
					mergedFilters.push(search.filterExpression);
				}
				search.filterExpression = mergedFilters;
			}

			return executeSearch({search: search, maxResults: options.maxResults}); // 5 + 5R units (R is per 1000 records)

		} else {
			throw errorModule.create({
				code: "SSS_MISSING_REQD_ARGUMENT",
				message: "Missing a required argument : searchId"
			});
		}
	}

	/**
	 * The following function will run the search and return an array of all results.
	 *
	 * @author riley.vanryswyk@gurussolutions.com
	 * @param  {Search} options.searchId : The search object to run
	 * @param  {Number} options.maxResults : the maximum number of results to return (can be null)
	 * @return {Array}  results : The entire search result
	 * @governance 5 + 5R units (R is per 1000 records)
	 */
	function executeSearch(options) {
		if(options.search) {
			var results = [];
			var maxResults = (isNaN(options.maxResults)) ? null : options.maxResults;
			var pagedData = options.search.runPaged({pageSize: NS_MAX_SEARCH_RESULT}); // 5 units
			pageRangeLoop: for(var i = 0; i < pagedData.pageRanges.length; i++) {
				var page = pagedData.fetch({index: pagedData.pageRanges[i].index}); // 5 units
				for(var j = 0; j < page.data.length; j++) {
					results.push(page.data[j]);
					if(maxResults && results.length >= maxResults) {
						break pageRangeLoop;
					}
				}
			}
			return results;
		} else {
			throw errorModule.create({
				code: "SSS_MISSING_REQD_ARGUMENT",
				message: "Missing a required argument : search"
			});
		}
	}


	/**
	 * The following function will perform a search and retrieve results of the page with the given page index
	 *
	 * @author suhn.kim@gurussolutions.com
	 * @param {String} type : The record type
	 * @param {[]} filter : The filter array
	 * @param {[]} cols : The column array
	 * @param {String} page_index : page index number
	 * @param {String} page_size : number of entries per search result page
	 * @return {[]} results : search results of the page
	 * @governance 10 units per 1000 results
	 */
	function getPageResult(type, filter, column, page_index, page_size){
		var pageResults = {};
		pageResults.results = [];

		// Type is required or else create search will break
		if (type != null && type != '' && typeof type !== 'undefined') {
			var searchObject = searchModule.create({
			  type: type,
			  filters: filter,
			  columns: column
			});

			var pageSize = '';
			var pageIndex = '';
			if (page_size && !isNaN(page_size)){
				if (page_size > NS_MAX_SEARCH_RESULT){
					pageSize = NS_MAX_SEARCH_RESULT; // if greater the maximum number allowed(1,000), set the size to the maximum limit
				} else if(page_size < NS_MIN_SEARCH_RESULT){
					pageSize = NS_MIN_SEARCH_RESULT; // if smaller than the minimum number allowed(5), set the size to the minimum limit
				} else {
					pageSize = page_size;
				}
			} else {
				pageSize = ITR_LIB_DEFAULT_PAGE_SIZE; // if page size is not specified, set it to the default
			}

			var pagedData = searchObject.runPaged({
				pageSize : pageSize
			});

			if (pagedData.count != 0){
				if (page_index){
					pageIndex = page_index;
					if(page_index > pagedData.pageRanges.length-1){
						pageIndex = pagedData.pageRanges.length-1; // if the given page_index is greater than the last page index, set the page index to the last page index
					}

					// return results of the page
					var page = pagedData.fetch({ index: pageIndex });
					for (var i=0; i<page.data.length; i++){
						pageResults.results.push(page.data[i]);
					}
				} else {
					logModule.debug({title: 'Error:', details: 'no page index is specified'});

					// if no page_index is specified, return all the results
					pageResults.results = guruSearchRecord(type, filter, column); // 10 units per 1000 results
				}
			}

			// Below is for digest summary information
			pageResults.result_count = pagedData.count; // total number of results returned
			pageResults.last_index = pagedData.pageRanges.length-1; // last index equals to length-1 as page index is 0 based
			pageResults.page_size = pageSize;
			pageResults.page_index = pageIndex;

		} else {
				throw errorModule.create({
					code: "SSS_MISSING_REQD_ARGUMENT",
					message: "Missing a required argument : type"
				});
		}

		return pageResults;

	}

	/**
	 * The following function will map the input list text values (comma-separated)
	 * into a comma-separated list of the corresponding internal ids for that list.
	 *
	 * @author riley.vanryswyk@gurussolutions.com
	 * @param {String} listNames	the text values of the list (comma-separated)
	 * @param {String} listId		the internal id of the list
	 * @return {Array} listValues	the internal ids of the list (null if none)
	 * @governance 10 units
	 */
	function mapListValues(listNames, listId) {
		var listValues = null;
		if(listNames) {

			var listNames = listNames.split(',');
			var listMap = {};

			var listResults = searchModule.create({
				type: listId,
				filters: [],
				columns: [{name: 'name'}]
			});

			listResults.run().each(function(result) {
				var listName = result.getValue({name: 'name'}).toLowerCase();
				listMap[listName] = result.id;
				return true;
			}); // 10 units, max 4000 status values

			listValues = [];
			listNames.forEach(function(listName) {
				if(listName && listMap[listName.toLowerCase()]) {
					listValues.push(listMap[listName.toLowerCase()]);
				}
			});

			if(listValues.length == 0) {
				listValues = null;
			}
		}
		return listValues;
	}



	/**
	 * This function is required when working with possible cases of xedit in beforeSubmit When
	 * xediting, get value and get new records Value return null when reading a
	 * field that was not changed by the xedit Therefore, if we want to read the value. we have to read
	 * it by doing a whole load record. However, a field that WAS submitted by xedit will return
	 * its OLD value when read by load record. So this function tries reading with
	 * get value and only if that returns null does it read via load record.
	 *
	 * @author Olivier Gagnon
	 * @param {Object} loadedRecord : a reference to the record previously loaded via load record
	 * @param {Object} machineName : If working with line items, provide machine name. Otherwise set to
	 * null
	 * @param {Object} index : If working with line items, provide line item index number. Otherwise set
	 * to null
	 * @param {Object} fieldName : name of field to be read
	 *
	 * @return the value of the read field
	 */
	function getXeditFieldValue(loadedRecord, machineName, index, fieldName){
	    var value = null;
	    if (machineName != null && machineName != '') {
	       value = loadedRecord.getSublistValue({
	            sublistId: machineName,
	            fieldId: fieldName,
	            line: index
	        });
	        if (value == null && loadedRecord != null) {
	            value = loadedRecord.getLineItemValue(machineName, fieldName, index);
	        }
	    } else {
	        logModule.debug({title: 'getXeditFieldValue', details: fieldName + ': ' + loadedRecord.getValue({fieldId: fieldName}) + ' vs ' + loadedRecord.getValue(fieldName)});
	        value = loadedRecord.getValue({fieldId: fieldName});
	        if (value == null && loadedRecord != null) {
	            value = loadedRecord.getValue(fieldName);
	        }
	    }
	    return value;
	}

	/**
	 * Used to copy an array, rather than create a point to it
	 *
	 * @param {Object} array
	 * @return the copied array
	 */
	function copyArray(array){
	    var newArray = [];
	    for (var i = 0; i < array.length; i++) {
	        newArray[i] = array[i];
	    }
	    return newArray;
	}


	/**
	 * ------------------REQUIRES THE roundNumber FUNCTION IN THIS LIBRARY--------------------
	 * The following function formats a number entered too look like $1,234.56
	 * Does not accept the following type of String "1,234.00". Has to be "12345.59"
	 * @author agustin.suarez@erpguru.com
	 * @param {String || Number} amount - String of a float value.
	 * @param {String} symbol - The monetary symbol to be displayed in front of the amount ($, ? etc)
	 * @param {int} floatingPoint - Specifies how many floating points will be returned
	 * @return {String}
	 */
	function formatNum(amount, symbol, floatingPoint){

		if(typeof(symbol) != 'string'){
			throw new Error('IllegalArgumentException: Argument 2 is Invalid');
		}

		amount = String(amount).replace(',','');

		if(symbol === undefined || symbol == null){
			symbol = '';
		}

		if(floatingPoint === undefined || floatingPoint == null || isNaN(floatingPoint)){
			floatingPoint = '2';
		}


		if(!isNaN(amount) && amount !== ''){
			var splitAmount;

			if(amount.indexOf('.') != -1){
				amount = String(roundNumber(parseFloat(amount), floatingPoint));
				splitAmount = amount.split('.');
			}
			else{
				splitAmount = [amount];
			}
			// If there are digits followed by three more digits
			var expression = /(\d+)(\d{3})/;

			while (expression.test(splitAmount[0])){
				splitAmount[0] = splitAmount[0].replace(expression, '$1' + ',' + '$2');
			}

			amount = splitAmount[0];
			if(splitAmount[1] !== undefined){
				amount = amount +'.'+ splitAmount[1];
			}
			else{
				amount = amount + '.00';
			}
			amount = symbol + amount;
		}
		else{
			amount = "Entered amount is not a number";
		}
		return amount;
	}


	/**
	 * Logs an error in NetSuite, whether it's and nlobjError object or a plain Javascript error.
	 *
	 * @param {Object} err The nlobjError object or the plain Javascript error.
	 * @param {Object} title The title that will be given to the error log.
	 * @param {Object} emailAuthorID The internal ID of the active employee record which will be used as
	 * the author of the emailed error log.
	 */
	function logError(err, title, emailAuthorID){
	    var msg = [];

	    if (err.getCode != null) {
	        msg.push('[SuiteScript exception]');
	        msg.push('Error Code: {0}' + err.getCode());
	        msg.push('Error Data: {0}' + err.getDetails());
	        msg.push('Error Ticket: {0}' + err.getId());
	        if (err.getInternalId) {
	            msg.push('Record ID: {0}' + err.getInternalId());
	        }
	        if (err.getUserEvent) {
	            msg.push('Script: {0}' + err.getUserEvent());
	        }
	        var userObj = runtimeModule.getCurrentUser();
	        msg.push('User: {0}' + userObj);
	        msg.push('Role: {0}\n' + userObj.role);

	        var stacktrace = err.getStackTrace();
	        if (stacktrace) {
	            msg.push('Stack Trace');
	            msg.push('\n---------------------------------------------');

	            if (stacktrace.length > 20) {
	                msg.push('**stacktrace length > 20**');
	                msg.push(stacktrace);
	            } else {
	                msg.push('**stacktrace length < 20**');
	                for (var i = 0; stacktrace != null && i < stacktrace.length; i++) {
	                    msg.push(stacktrace[i]);
	                }
	            }
	        }
	    } else {
	    	var userObj = runtimeModule.getCurrentUser();

	        msg.push('[javascript exception]');
	        msg.push('User: {0}' + userObj);
	        msg.push(err.toString());
	    }

	    logModule.error({title: title, details: msg});

	    //MG Add to title the company ID and environment type, and email the error to our logging email.
	    if (emailAuthorID != null && emailAuthorID != '' && !isNaN(emailAuthorID)) {
	        var companyId = runtimeModule.accountId;
	    	var environment = runtimeModule.envType;

	        title = "An Error Has Occurred - " + title + '(NS Acct #' + companyId + ' ' + environment + ')';
	        try {
	            emailModule.send({
	                author: emailAuthorID,
	                recipients: LOGGING_EMAIL,
	                subject: title,
	                body: msg
	            });

	        } catch (mailErr) {
	            if (mailErr.getCode != null) {
	                logModule.error({title: 'Error sending error log email', details:  mailErr.getCode() + ': ' + mailErr.getDetails()});

	            } else {
	                logModule.error({title: 'Error sending error log email', details: mailErr.toString()});
	            }

	        }
	    } else {
	        logModule.audit({title: 'No email author set', details: emailAuthorID});
	    }
	}

	/**
	 * Create timer object to ensure execution time does not last more than 1 hour. USAGE: Initialize
	 * your times in the first lines of code like this: var timer = createTimer(); timer.setStartTime();
	 * Then, in the same way you'd use verifyMetering, call the time verifyer like this
	 * timer.verifyTimeExec(requiredTime, params); requiredTime is the approximate amount of time you
	 * need to complete the logic until the next time you verifyTimeExec
	 */
	function createTimer(){
	    //Global time object used to easily track time
	    var TIMER = {
	        //Initialize the timer start time
	        setStartTime: function(){
	            d = new Date();
	            time = d.getTime();
	        },
	        //Get the time that has gone by when the timer was started
	        getDiff: function(){
	            d = new Date();
	            return (d.getTime() - time);
	        },
	        //function that reschedule the script if maximum time is exceeded
	        verifyTimeExec: function(timeRequired, params){
	            if (timeRequired == null) {
	                timeRequired = this.MIN_EXEC_TIME;
	            }
	            var leftTime = this.MAXIMUM_EXEC_TIME - this.getDiff();
	            if (runtimeModule.executionContext == 'scheduled' && leftTime < timeRequired) {
	                logModule.audit({title: 'verifyTimeExec()', details: 'Time left of scheduled script is low, scheduling another execution'});
	                var scriptObj = runtimeModule.getCurrentScript();
	                var mrTask = taskModule.create({
	                	taskType: taskModule.TaskType.MAP_REDUCE,
	                	scriptId: scriptObj.id,
	                	deploymentId: scriptObj.deploymentId,
	                	params: params
	                	});
	                var errorObj = errorModule.create({
	                	name: 'TIME_LOW_ERR_CODE',
	                	message: 'Time left for scheduled script is low, another execution has been scheduled',
	                	notifyOff: true
	                	});
	                logModule.debug({title: 'Error Code: ', details: errorObj.name});
	            }
	        },
	        MAXIMUM_EXEC_TIME: 3600000,
	        MIN_EXEC_TIME: 900000

	    };

	    return TIMER;
	}


	/**
	 * Will delete the provided recordType and recordId while also attempting to log the deletion by sending an email with the
	 * stringified record details. Email will be sent from logEmailAuthor to logEmailRecipient
	 * NOTE: In order to stringify the record, this function must load the record.
	 * @param {Object} recordType : Netsuite record type
	 * @param {Object} recordId : Record Internal ID
	 * @param {Object} logEmailAuthor : The Internal ID of an active Employee. If left empty, the function will attempt to use the currently logged in user.
	 * 									If that is no possible, will try to default to -5, which is the original provionned user.
	 * @param {Object} logEmailRecipient: An email address to send the log too. If not provided, will default to logging@erpguru.com
	 */
	function deleteAndLog(recordType, recordId, logEmailAuthor, logEmailRecipient){
	    var stringObject = null;
	    try {
	    	var objRecord = recordModule.load({
	    		type: recordType,
	    		id: recordId,
	    		isDynamic: true,
	    		});
	        stringObject = JSON.stringify(objRecord);
	    } catch (stringifyFail) {
	        //do nothing
	    }
	    recordModule.delete({type: recordType,id: recordId});
	    if (stringObject != null) {
	        logModule.audit({title: 'DELETION: ', details: stringObject});
	        if (logEmailRecipient == '' || logEmailRecipient == null) {
	            logEmailRecipient = 'logging@erpguru.com';
	        }

	        if (isNaN(logEmailAuthor)) {
	            logEmailAuthor = runtimeModule.getCurrentUser();
	            if (logEmailAuthor == -4) { //-4 is the unidentified -System- user
	                logEmailAuthor = -5; //-5 is the default admin... not always a valid choice, but it's worth a shot
	            }
	        }

	        var subject = 'Acct ' + runtimeModule.accountId + ' Record Deletion: ' + recordType + ' ' + recordId;

	        try {
	        	emailModule.send({
	        		author: logEmailAuthor,
	        		recipients: logEmailRecipient,
	        		subject: subject,
	        		body: stringObject
	        		});
	        } catch (errEmail) {
	            logModule.error({title: 'Could not send deletion email', details: errEmail.message});
	        }
	    }
	}

	/**
	 * Converts a textual item type into a ID-style item type and returns it.
	 * This is mainly used to convert the the value of the current line 'itemtype' into a useable system value
	 * @param {Object} textName the textual item type
	 */
	function convertItemType(textName){
	    var internalid = textName;
	    switch (textName) {
	        case 'Assembly':
	            internalid = 'assemblyitem';
	            break;
	        case 'Description':
	            internalid = 'descriptionitem';
	            break;
	        case 'Discount':
	            internalid = 'discountitem';
	            break;
	        case 'InvtPart':
	            internalid = 'inventoryitem';
	            break;
	        case 'Group':
	            internalid = 'itemgroup';
	            break;
	        case 'Kit':
	            internalid = 'kititem';
	            break;
	        case 'Markup':
	            internalid = 'markupitem';
	            break;
	        case 'NonInvtPart':
	            internalid = 'noninventoryitem';
	            break;
	        case 'OthCharge':
	            internalid = 'otherchargeitem';
	            break;
	        case 'Payment':
	            internalid = 'paymentitem';
	            break;
	        case 'Service':
	            internalid = 'serviceitem';
	            break;
	        case 'Subtotal':
	            internalid = 'subtotalitem';
	            break;
	        case 'GiftCert':
	            internalid = 'giftcertificate';
	    }
	    return internalid;
	}
	/**
	 * DISCLAIMER: Only fill in filters and columns parameters if you wish to add filters and columns to the existing search.
	 * Make sure the global NS_MAX_SEARCH_RESULT is defined in your script
	 *
	 * Metering limitation : Each getResults cost 10 units. 1 000 000 search results limitation in a scheduled script.
	 * 100 000 search results limitation in a user event or client-side script
	 *
	 * The following function calls an existing saved search in UI with the option to add more parameters and columns.
	 * It loop through the results, building an object with 1000 results at a time and eventually return all results.
	 *
	 * @author andrew.kefalas@erpguru.com
	 * @param {string} [required] type : The record internal ID of the record type you are searching
	 * @param {nlobjSearchFilter | nlobjSearchFilter[]} [optional] filters : A single nlobjSearchFilter object - or - an array of nlobjSearchFilter objects
	 * @param {nlobjSearchColumn or nlobjSearchColumn[]} [optional] columns : A single nlobjSearchColumn object - or - an array of nlobjSearchColumn objects
	 * @param {string} searchId : the internal id of the UI saved search
	 * @return {nlobjSearchResult[]} results : concatenated array of all search results
	 */
	 function savedSearchUIGuruSearchRecord(type, filters, columns, searchId){
	    var results = [];

	    // Type is required or else create search will break
	    if (type != null && type != '' && typeof type !== 'undefined') {
			var searchObject = null;
			if (searchId != null && searchId != '') {
				searchObject = searchModule.load({
					id: searchId
					});
				if (columns != null && columns.length > 0) {
					searchObject.addColumns(columns);
				}
				// Does not work with filter expressoins though.
				//first check if a single nlobjSearchFilter was passed, or if it was an array of filters passed
				if(filters != null && ! (filters instanceof Array)){
					searchObject.addFilter(filters);
				}
				else if (filters != null && filters.length > 0) {
					searchObject.addFilters(filters);
				}
			} else {
				searchModule.create({
					type: type,
					columns: columns,
					filters:columns});
			}

	        var searchResultsSets = searchObject.run();

	        var allResultsFound = false;
	        var resultsSetsCounter = 0;

	        while (!allResultsFound) {

	            // We start from 0 to 1000, increment the resultsSetsCounter as we go to move by 1000 increments. 1000 to 2000, 2000 to 3000 ...
	            var resultsSet = searchResultsSets.getRange(resultsSetsCounter * NS_MAX_SEARCH_RESULT, NS_MAX_SEARCH_RESULT + NS_MAX_SEARCH_RESULT * resultsSetsCounter);

	            // If original results set is empty, we stop
	            if (resultsSet == null || resultsSet == "") {
	                allResultsFound = true;
	            } else {
	                // If current results set is under the maximum number of results we know it is the final iteration and stop
	                if (resultsSet.length < NS_MAX_SEARCH_RESULT) {
	                    results = results.concat(resultsSet);
	                    allResultsFound = true;
	                } else {
	                    // Otherwise we keep on concatenating the results
	                    results = results.concat(resultsSet);
	                    resultsSetsCounter++;
	                }
	            }
	        }
	    } else {
	         var errorObj = errorModule.create({
	        	name: 'SSS_MISSING_REQD_ARGUMENT',
	        	message: 'Missing a required argument : type'});
	        	logModule.debug({title: 'Error Code:', details: errorObj.name});
	    }


	    return results;
	}

	/**
	 * Function that correctly rounds a number to nearest decimal point.
	 * Avoids error caused in Math.round because of JS floating point representation.
	 *
	 * Note: Be carefull when using really large numbers: 1e14 + 0.111 -> 100000000000000.11
	 * Floats get truncated and cause headaches at this magnitude. If ever the numbers are this big
	 * consider implementing your own string addition, subtraction, multiplication functions as well
	 * as a string rounding function that never converts your numeric string to the number primitive type.
	 *
	 * Ex : roundNumber(5.786) = 5.79
	 * @param {float} numberToRound : number to round
	 * @param {integer} decimalPoints : number of decimals to round numberToRound to
	 * @return {float} rounded number
	 * @author ERP Guru
	 */
	function roundNumber(numberToRound, decimalPoints) {
	    var epsilon = Number.EPSILON || 0.00000000000000001;

	    // Use old method for very small numbers (i.e < 1e-7)
	    if (String(numberToRound).indexOf('e') != -1) {
	        return Math.round((numberToRound + epsilon) * Math.pow(10, decimalPoints)) / Math.pow(10, decimalPoints);
	    }

	    return Number(Math.round((numberToRound) + 'e' + decimalPoints) + 'e-' + decimalPoints);
	}


	/**
	 * This function gets the value of a url parameter. Returns null if the parameter is not found.
	 * For use in client-side scripts
	 *
	 * @author : ERP Guru
	 * @param  : {String} paramName name of parameter
	 * @return : {String} paramValue value of parameter
	 */
	function getUrlParam(paramName){
	    var urlParams = window.location.href.substr(window.location.href.indexOf("?") + 1).split("&");
	    var urlObject = {};
	    for(var i = 0; i < urlParams.length;i++){
	        if(urlParams[i].indexOf('=')!= -1){
	            urlObject[urlParams[i].split('=')[0]] = urlParams[i].split('=')[1];
	        }
	    }
	    return (typeof urlObject[paramName] == 'undefined') ? null : urlObject[paramName];
	}

	/**
	 *  This function returns whether a value is empty or not. It does not check for NaN
	 *  @author agustin.suarez@gurussolutions.com
	 *  @param {any} value - any type of object, primitive type
	 *  @return {boolean}
	 */
	function gsEmpty(value) {
	    return (value == null || value == undefined || value === '' ||  (typeof value == 'object' && Object.keys(value).length === 0));
	}


	/**
	 *
	 * This piece of code is to help logging error based on the type of error.
	 * It will look into the availability of the data in the caught error and format the message accordingly
	 *
	 * @param {error} error : any type of error message
	 * @return {Object} errorObject : error object encapsulating message and code
	 * @author julien.pelletier-morin@gurussolutions.com
	 * @governance 0
	 *
	 */
	function guruErrorMessageFormatting(error)
	{
		var errorObject = {};
		errorObject.errorMessage = '';
		errorObject.errorCode = 'Error';

		//NS error
		if (error != null && errorModule.getDetails != null) {
			errorObject.errorMessage = 'Error Code: ' + errorModule.getCode() + '\n' + 'Error Details: ' + errorModule.getDetails();
			errorObject.errorCode = errorModule.getCode();

		//Javascript error
		} else if (error != null && errorModule.message != null){
			errorObject.errorMessage = 'Error Message: ' + errorModule.message;
			errorObject.errorCode = 'Javascript Error ' + errorModule.name;

		//Stringified unknown error
		} else {
			errorObject.errorMessage = 'Error: ' + JSON.stringify(error);
			errorObject.errorCode = 'Unexpected Error';
		}
		logModule.error({title: 'SCRIPT ERROR -' + errorObject.errorCode, details: errorObject.errorMessage});
		return errorObject;
	}




	////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
	////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
	//////////////////////////////////////////////////////////CSV To Array Script///////////////////////////////////////////////////////////
	////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
	////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

	/**
	 * The following function transforms a csv string to an array
	 * @author francois.thibault@erpguru.com
	 * @param {String} csv - CSV formatted String
	 * @return {Object} finalArray - Array of values taken from the CSV String
	 */
	function csvToArray(csv){
	    var tempString;
	    var finalArray = [];
	    var stringArray = csv.split(/\r*\n/);
	    var pattern = new RegExp("(^|\\t|,)(\"*|'*)(.*?)\\2(?=,|\\t|$)", "g");

	    for (var i = 0; i < stringArray.length; i++) {
	        tempString = stringArray[i].replace(/""/g, "");
	        tempString = tempString.replace(pattern, "$3\t");
	        tempString = tempString.replace(/\t$/, "");
	        tempString = tempString.replace("- None -", "");

	        if (tempString) {
	            finalArray[i] = tempString.split("\t");
	        }
	    }
	    return finalArray;
	}


	////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
	////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
	//////////////////////////////////////////////////////////Array To CSV Scripts//////////////////////////////////////////////////////////
	////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
	////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

	/**
	 * The following function takes a 1D or 2D array of values (Either String or  and outputs a CSV formatted String
	 * @author francois.thibault@erpguru.com
	 * @modified by agustin.suarez@erpguru.com
	 * @param {String || int || float} array    - 1D  or 2D array containing the values to convert to csv
	 * @param {string} delimeter : The symbol to separate the entries.
	 * @param {string} escape : Character used to escape instances of delimeter in entries.
	 * @return {String} csvStr - CSV Formatted String
	 */
	function arrayToCsv(array, delimeter, escape){
	    var csvStr = '';
	    if (array != null && array != '') {
	        if(array[0] == null || typeof array[0] != 'object' || array[0].length == undefined){
	            csvStr = singleArrayToCsv(array, delimeter, escape);
	        }
	        else{
	            csvStr = multipleArrayToCsv(array, delimeter, escape);
	        }
	    }
	    return csvStr;
	}


	/**
	 * Converts an 1D array to a csv string. Trims leading and
	 * trailing whitespace from its array elements.
	 * @author malcolm.watt@gurussolutions.com
	 * @param {Object} array : The array to convert.
	 * @param {string} delimeter : The symbol to separate the entries.
	 * @param {string} escape : Character used to escape instances of delimeter in entries.
	 * @return {string} a csv representation of the input array.
	 * @governance 0 units
	 */
	function singleArrayToCsv(array, delimeter, escape) {
	    delimeter = delimeter || ',';
	    escape = escape || '"';
	    var trimmed = array.map(function (element){
	        if (typeof element === 'string') {
	            if (element.indexOf(delimeter) != -1) {
	                return escape + element.trim() + escape; // If the entry contains the delimeter, we need to escape it
	            }
	            return element.trim();
	        }
	        return element;
	    });
	    return trimmed.join(delimeter) + '\r\n';
	}



	/**
	 * Makes a 2D array into a csv string.
	 * @author malcolm.watt@gurussolutions.com
	 * @param {Object} array : array of arrays.
	 * @param {string} delimeter : The symbol to separate the entries.
	 * @param {string} escape : Character used to escape instances of delimeter in entries.
	 * @return {string} a csv representation of the input array.
	 * @governance 0 units
	 */
	function multipleArrayToCsv (array, delimeter, escape) {
	    var csv = array.map(function (arrayElement){
	        return singleArrayToCsv(arrayElement, delimeter, escape);
	    });
	    return csv.join('');
	}

	return {
		forceParseFloat: forceParseFloat,
		guruSearchRecord: guruSearchRecord,
		guruRunSavedSearch: guruRunSavedSearch,
		executeSearch: executeSearch,
		getPageResult: getPageResult,
		mapListValues: mapListValues,
		getXeditFieldValue: getXeditFieldValue,
		formatNum: formatNum,
		logError: logError,
		createTimer: createTimer,
		deleteAndLog: deleteAndLog,
		convertItemType: convertItemType,
		savedSearchUIGuruSearchRecord: savedSearchUIGuruSearchRecord,
		roundNumber: roundNumber,
		getUrlParam: getUrlParam,
		gsEmpty: gsEmpty,
		guruErrorMessageFormatting: guruErrorMessageFormatting,
		csvToArray: csvToArray,
		arrayToCsv: arrayToCsv,
		singleArrayToCsv: singleArrayToCsv,
		multipleArrayToCsv: multipleArrayToCsv,
		SUCCESS_STATUS: SUCCESS_STATUS,
		ERROR_STATUS: ERROR_STATUS
	};
});
