/**
 * 2018 IT Rationale Inc. User may not copy, modify, distribute, or re-bundle or
 * otherwise make available this code
 * 
 * This software is the confidential and proprietary information of ITRationale,
 * Inc. ("Confidential Information"). You shall not disclose such Confidential
 * Information and shall use it only in accordance with the terms of the license
 * agreement you entered into with ITRationale Inc.
 * 
 *  Version    Date            Author           Remarks
 * 	1.00       19 Nov 2018     Raffy Gaspay    Initial version. This script will consists of the common functions
 
 * @NApiVersion 2.x
 * @author raffy.gaspay
 * @NModuleScope SameAccount
 * @NModuleScope Public
 * 
 */




define(['N/log','N/record','N/search','N/runtime'],

function(log,record,search,runtime) {
	var common = {};
		
		common.isNullOrEmpty = function(objVariable) {
			return (objVariable == null || objVariable == "" || objVariable == undefined || objVariable == 'undefined');
		};
		
		
		
		common.searchRecords = function(stRecordType, stSearchID, arrSearchFilters, arrSearchColumns) {
			
			var FUNC_NAME = 'searchRecords', arrSearchResults = [], count = 1000, min = 0, max = 1000, resultSet, rs, searchObj = null;

			log.debug(FUNC_NAME, 'Start');
			
			try {
				if (stSearchID) {
					searchObj = search.load({
						id : stSearchID
					});
					if (arrSearchFilters) {
						searchObj.filters = searchObj.filters
								.concat(arrSearchFilters);
						
					}
					if (arrSearchColumns) {
						searchObj.columns = arrSearchColumns;
					}
				} else {
					
					searchObj = search.create({
						type : stRecordType,
						filters : arrSearchFilters,
						columns : arrSearchColumns
					});
				}
				rs = searchObj.run();
				while (count == 1000) {
					resultSet = rs.getRange({
						start : min,
						end : max
					});

					arrSearchResults = arrSearchResults.concat(resultSet);
					min = max;
					max += 1000;
					count = resultSet.length;
				}
				log.debug(FUNC_NAME, 'total search result length: '
						+ arrSearchResults.length);
			} catch (error) {

			} finally {
				if (arrSearchResults && arrSearchResults.length == 0) {
					arrSearchResults = null;
				}
			}
			return (arrSearchResults);
		};
		
		common.searchRecFilExp = function(stRecordType, stSearchID, arrSearchFilters, arrSearchColumns) {
		    var objSearchResults = [], count = 1000, min = 0, max = 1000, resultSet, rs, searchObj = null;
		    var DEBUG_IDENTIFIER = 'searchRecFilExp';
			    try {
					
					log.debug(DEBUG_IDENTIFIER,'--START--');
					if (stSearchID) {
						searchObj = search.load({
							id : stSearchID
						});
						if (arrSearchFilters) {
							log.debug(DEBUG_IDENTIFIER,'Existing Filters: ' + JSON.stringify(searchObj.filterExpression));
						
							searchObj.filterExpression = searchObj.filterExpression.concat(arrSearchFilters);
						
							log.debug(DEBUG_IDENTIFIER,'New Filters: ' + JSON.stringify(searchObj.filterExpression));
						}
						
					} else {
						
						searchObj = search.create({
							type : stRecordType,
							filters : arrFilters,
							columns : arrSearchColumns
						});
					}
					rs = searchObj.run();
					while (count == 1000) {
						resultSet = rs.getRange({
							start : min,
							end : max
						});
		
						objSearchResults = objSearchResults.concat(resultSet);
						min = max;
						max += 1000;
						count = resultSet.length;
					}
					log.debug(DEBUG_IDENTIFIER, 'total search result length: '
							+ objSearchResults.length);
				} catch (error) {
					var errorStr = 'Type: ' + error.type + ' | ' +
					'Name: ' + error.name +' | ' +
					'Error Message: ' + error.message;
		    		log.debug(DEBUG_IDENTIFIER, ' Error on Catch : '
						+ JSON.stringify(errorStr));
				} finally {
					if (objSearchResults && objSearchResults.length == 0) {
						objSearchResults = null;
					}
				}
		log.debug(DEBUG_IDENTIFIER,'--END--');
			return objSearchResults;
		};
		common.forceInt = function(stValue){
		    var intValue = parseInt(stValue);

		    if (isNaN(intValue) || (stValue == Infinity)){
			    return 0;
		    }

		    return intValue;
	    };
		common.getScriptParameter = function(parameterName) {
	        var FUNC_NAME = 'getScriptParameter';
	        log.debug(FUNC_NAME, 'Start');
	        var paramValue = '';

	        require([ 'N/runtime' ], function(runtime) {
	            var scriptObj = runtime.getCurrentScript();

	            paramValue = scriptObj.getParameter({
	                name : parameterName
	            });
	            return;
	        });

	        if (common.isNullOrEmpty(paramValue)) {
	            log
	                    .error(
	                            FUNC_NAME,
	                            'A script parameter:'
	                                    + parameterName
	                                    + ': is null/empty. Please Review script deployment');
	            log
	                    .error(FUNC_NAME,
	                            '==================== END Script====================');
	            return null;
	        } else {
	            log.debug(FUNC_NAME, 'A script parameter: ' + parameterName
	                    + ' : ' + paramValue);
	        }
	        return paramValue;
	    };
		
	    common.showRemainingUsage = function (debugIdentifier) {
			var remUsage = runtime.getCurrentScript().getRemainingUsage();
	    	log.debug(debugIdentifier,"Remaining governance units: " + remUsage);
		};
		
		common.removeDuplicates = function removeDuplicates(arr){
		    var unique_array = [];
		    for(var i = 0;i < arr.length; i++){
		        if(unique_array.indexOf(arr[i]) == -1){
		            unique_array.push(arr[i]);
		        }
		    }
		    return unique_array;
		};
		common.removeDuplicatesArrofObjects = function(originalArray, prop) {
		     var newArray = [];
		     var lookupObject  = {};

		     for(var i in originalArray) {
		        lookupObject[originalArray[i][prop]] = originalArray[i];
		     }

		     for(i in lookupObject) {
		         newArray.push(lookupObject[i]);
		     }
		      return newArray;
		 };
		
	
    return common;
    
});
