/**
 * Copyright NetSuite, Inc. 2013 All rights reserved. The following code is a
 * demo prototype. Due to time constraints of a demo, the code may contain bugs,
 * may not accurately reflect user requirements and may not be the best
 * approach. Actual implementation should not reuse this code without due
 * verification.
 * 
 * (Module description here. Whole header length should not exceed 100
 * characters in width. Use another line if needed.)
 * 
 * Version Date Author Remarks
 * 
 * 1.00 3 Oct Chetan Jumani
 
/*
 * This script is a mapreduce script where it uplifts the priceplan
 * of the renewal subscription which are in draft status.
 * specified in script parameter.
 * 
 * @NApiVersion 2.0
 * @NScriptType MapReduceScript
 */
 
 define(
		[ 'N/error', 'N/log', 'N/record', 'N/search' ],
		function(error, log, record, search) {

			function isNullOrEmpty(objVariable) {
				return (objVariable == null || objVariable == "" || objVariable == undefined);
			}

			function getScriptParameter(parameterName) {
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
				if (isNullOrEmpty(paramValue)) {
					log.error(FUNC_NAME,
									'A script parameter:'
											+ parameterName
											+ ': is null/empty. Please Review script deployment');
					log.error(FUNC_NAME,
									'==================== END Script====================');
					return null;
				} else {
					log.debug(FUNC_NAME, 'A script parameter: ' + parameterName+ ' : ' + paramValue);
				}
				return paramValue;
			}

			function getInputData() {
				var FUNC_NAME = "getInputData";

				var SEARCH_OPEN_SALEORDER = getScriptParameter('custscript_mr_sp_close_saleorder');
				
                log.debug(FUNC_NAME, 'SEARCH_OPEN_SALEORDER: ' + SEARCH_OPEN_SALEORDER);
				if (isNullOrEmpty(SEARCH_OPEN_SALEORDER)) {
					return null;
				}
			
				var searchResults = search.load({
					id : SEARCH_OPEN_SALEORDER
				});
                log.debug(FUNC_NAME, 'searchResults: ' + searchResults);				
				if (isNullOrEmpty(searchResults)) {
					 log.debug(FUNC_NAME, 'No existing subscription to be uplifted');
				}
               	 log.debug(FUNC_NAME, 'DONE ');			
				return searchResults;
			}
			
			function map(context) {
				try
				{
					var FUNC_NAME = 'map';
					
					log.debug(FUNC_NAME, 'Start context.value: ' + context.value);

					var searchResult = JSON.parse(context.value);
				
					log.debug(FUNC_NAME, 'searchResult: ' + searchResult);
					
					
					var saleOrderId = searchResult.values['internalid'].value;
					log.debug(FUNC_NAME, 'saleOrderId: ' + saleOrderId);
					var saleOrderRec = record.load({
											type : record.Type.SALES_ORDER,
											id : saleOrderId									
											});	
											
					var stLineCount = saleOrderRec.getLineCount	({sublistId: 'item'});

					log.debug({	title: FUNC_NAME,	details:'record.type:'+saleOrderRec.type+': Id:'+saleOrderRec.id +': stLineCount:'+stLineCount});
					
					for	(var icnt = 0; icnt < stLineCount;icnt++)
					{
						saleOrderRec.setSublistValue({
							sublistId: 'item',
							fieldId: 'isclosed',
							line: icnt,
							value: true
						});
					}
					
									
					saleOrderRec.save();
					log.audit({
									title: FUNC_NAME,
									details: 'Map Completed for RecordType:,'+saleOrderRec.type+': RecordId:'+saleOrderRec.id+': Successfully Updated '+stLineCount+' lines with isClosed.'
								});
				}
				catch (e) 
				{
					log.error({
								title: e.name,
								details: 'RecordType:'+saleOrderRec.type+': RecordId:'+saleOrderRec.id+': Error Message'+e.message
							});
					
				}                    					
			}	
			
			function summarize(summary) {

				var FUNC_NAME = 'nsps_mr_open_saleorder_lines-Summary';
				log.debug(FUNC_NAME, 'Smmarize Started+Completed.');
				
			}
					
			

			return {
				getInputData : getInputData,
				map : map,			
				summarize : summarize
			};
			
	})