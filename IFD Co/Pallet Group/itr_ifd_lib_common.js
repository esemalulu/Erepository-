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
 * 	1.00       24 July 2018     Raffy Gaspay    Initial version. This script will consists of the common functions
 *  
 * 
 * @NApiVersion 2.x
 * @author raffy.gaspay
 * @NModuleScope SameAccount
 * @NModuleScope Public
 * 
 */
define(['N/log','N/record','N/search'],

function(log,record,search) {
	var common = {};
		
		common.isNullOrEmpty = function(objVariable) {
			return (objVariable == null || objVariable == "" || objVariable == undefined);
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
				//if (arrSearchResults && arrSearchResults.length == 0) {
				//	arrSearchResults = null;
				//}
			}
			return (arrSearchResults);
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
	    
	 
	
	    	
	
    return common;
    
});
