/**
 * @NApiVersion 2.x
 * @NScriptType ScheduledScript
 * @NModuleScope public
 */
define([ 'N/http', 'N/https', 'N/record', 'N/runtime', 'N/search', 'N/format' ],

function(http, https, record, runtime, search, format) {
	
	var debug = null;
	var token = null;
	const params = {
		getClearDHubIdUrl: 'custscript_get_cleard_hub_id',
		getClearDTokenUrl: 'custscript_get_cleard_token',
		customHubIdSearch: 'custscript_hub_id_search',
		debugEnabled: 'custscript_debug_on',
    };

	function execute(scriptContext) {

		log.audit("***STATUS***", "STARTED");

		debug = runtime.getCurrentScript().getParameter(params.debugEnabled);
		
		scriptid = runtime.getCurrentScript().id;
		
		deploymentid = runtime.getCurrentScript().deploymentId;

		setupHubIds();

		log.audit("***STATUS***", "FINISHED");

	}

	function setupHubIds() {

		try {

			var search = createSearch();
			var pageRanges = null;
			var salesOrders = [];
			var salesOrdersObj = {};
			var prevSo = null;
			var salesOrder = null;
			var respLogfire = null;
			var currLocation = null;
			var prevLocation = null;
			var externalIdCheck = false;
			var locationCheck = false;
			var lineIds = [];

			var pageData = search.runPaged({
				pageSize : 400
			});
			log.debug ('search', 'performing search...!');	

			if (pageData) {
				pageRanges = pageData.pageRanges;
			}

			if (pageRanges.length > 0) {

				token = getToken();

				pageRanges.forEach(function(pageRange) {

					var page = pageData.fetch({
						index : pageRange.index
					});

					var arrSo = page.data;

					if (arrSo) {
						arrSo.forEach(function(currSo) {

							log.debug ('***ORDER***', JSON.stringify(currSo));

							currLocation = currSo.getText({
								name: 'location'
							});

							if (prevSo) {
								
								var currExtId = currSo.getValue({
									name: 'externalid'
								});

								var prevExtId = prevSo.getValue({
									name: 'externalid'
								});
								
								externalIdCheck = currExtId !== prevExtId;
								locationCheck = currLocation !== prevLocation;

								if (externalIdCheck || locationCheck) {

									var response = getHubId(prevExtId, 
											token);

									response = JSON.parse(response);

									if (debug) {
										log.debug("***HUB ID RESP***", 
												response);
									}

									var recSo = record.load({
										type: record.Type.SALES_ORDER,
										id: prevSo.id,
										isDynamin: false
									});

									var hubid = null;

									if (response) {

										hubid = response.hubName;
										salesOrder.hubid = hubid;

										salesOrders.push(salesOrder);
		
									}

									salesOrder = null;

									var recId = updateRecord(recSo, hubid,
											externalIdCheck,
											lineIds);
									
									lineIds = [];

									if (debug) {
										log.debug("***REC ID***", recId);
									}
								}

							}

							/*salesOrder = 
								buildSalesOrders(salesOrder,
										currSo);*/
							prevSo = currSo;
							prevLocation = currLocation;
							lineIds.push(
								prevSo.getValue({
									name: 'custcol_line_id'
								})
							);

							checkForReSchedule();

						});
						
						var currExtId = prevSo.getValue({
							name: 'externalid'
						});

						var response = getHubId(currExtId, 
								token);

						response = JSON.parse(response);

						if (debug) {
							log.debug("***HUB ID RESP***", 
									response);
						}

						var recSo = record.load({
							type: record.Type.SALES_ORDER,
							id: prevSo.id,
							isDynamin: false
						});

						var hubid = null;

						if (response) {

							hubid = response.hubName;
							salesOrder.hubid = hubid;

							salesOrders.push(salesOrder);

						}

						salesOrder = null;

						var recId = updateRecord(recSo, hubid, true,
								lineIds);
						
						lineIds = [];
						
						if (debug) {
							log.debug("***REC ID***", recId);
							log.debug ('***SALESORDER***', 
									JSON.stringify(salesOrders));
						}

						/*if (salesOrders.length > 0) {
							salesOrdersObj.salesOrders = salesOrders;
							respLogfire = sendToLogFire(salesOrdersObj);

							if (debug) {
								log.debug("***LOGFIRE RESP***", 
										respLogfire);
							}
						}*/

					}

				});

				/*if (respLogfire) {
					respLogfire = JSON.parse(respLogfire);
					if (respLogfire.code == 200 &&
						salesOrders.length > 0) {
						var lineCount = 0;
						var isBigTicket = false;
						var wmsTimestamp = null;
						var saveRecId = null;
						var orderRecord = null;

						salesOrders.forEach(function(salesOrder) {
							checkForReSchedule();

							orderRecord = record.load({
								type: record.Type.SALES_ORDER,
								id: salesOrder.internalid,
								isDynamin: false
							});

	
							lineCount = orderRecord.getLineCount({
								sublistId: 'item'
							});
	
							if (lineCount > 0) {
	
								for (var line = 0; line < lineCount; line++) {
									isBigTicket = orderRecord.getSublistValue({
										sublistId: 'item',
										fieldId: 'custcol_bigticket',
										line: line
									});
	
									if (isBigTicket) {
										orderRecord.setSublistValue({
											sublistId: 'item',
											fieldId: 'custcol_sent_to_apigee',
											line: line,
											value: true
										});
	
										wmsTimestamp = new Date();
										wmsTimestamp = format.parse({
											value: wmsTimestamp,
											type: format.Type.DATE
										});
										orderRecord.setSublistValue({
											sublistId: 'item',
											fieldId: 'custcol_sent_to_wms_timestamp',
											line: line,
											value: wmsTimestamp
										});
									}
								}
	
								saveRecId = orderRecord.save();

								log.debug("***SAVED REC ID***", saveRecId);
	
							}
						});
					}
				}*/

			}

		} catch (e) {
			log.error("***SETUP HUB ID***", e);
			throw e.toString();
		}

	}

	function buildSalesOrders(order, sRes) {
		checkForReSchedule();

		try {

			if (order) {

				var itemid = sRes.getValue({
					name: 'externalid',
					join: 'item'
				});

				if (itemid) {

					var quantity = parseInt(sRes.getValue({
						name: 'quantity'
					}), 10);
					var description = sRes.getValue({
						name: 'salesdescription',
						join: 'item'
					});
					var amount = parseFloat(sRes.getValue({
						name: 'amount'
					}));
					var rate = parseFloat(sRes.getValue({
						name: 'rate'
					}));
					var iteminternalid = sRes.getValue({
						name: 'internalid',
						join: 'item'
					});
					var linenum = sRes.getValue({
                        name: 'custcol_line_id',
					});

                    log.debug("***LINE NUM***", "LINE NUM:"+linenum);

					order.items.push({
						'itemid': itemid,
						'quantity': quantity,
						'iteminternalid': iteminternalid,
						'rate': rate,
						'amount': amount,
						'description': description,
                        'custcol_line_id' : linenum
					});

				}

			} else {

				var internalid = sRes.getValue({
					name: 'internalid'
				});
				var externalid = sRes.getValue({
					name: 'externalid'
				});
				var entity = sRes.getValue({
					name: 'entity'
				});
				var tranid = sRes.getValue({
					name: 'externalid'
				});
				var otherrefnum = sRes.getValue({
					name: 'otherrefnumber'
				});
				var location = sRes.getText({
					name: 'location'
				});
				var trandate = sRes.getValue({
					name: 'trandate'
				});
				var shipmethod = sRes.getText({
					name: 'shipmethod'
				});
				var source = sRes.getValue({
					name: 'source'
				});
				var billaddressee = sRes.getValue({
					name: 'billaddressee'
				});
				var billaddr1 = sRes.getValue({
					name: 'billaddress1'
				});
				var billaddr2 = sRes.getValue({
					name: 'billaddress2'
				});
				var billcity = sRes.getValue({
					name: 'billcity'
				});
				var billstate = sRes.getValue({
					name: 'billstate'
				});
				var billzip = sRes.getValue({
					name: 'billzip'
				});
				var billcountry = sRes.getValue({
					name: 'billcountrycode'
				});
				var billphone = sRes.getValue({
					name: 'billphone'
				});
				var shipaddressee = sRes.getValue({
					name: 'shipaddressee'
				});
				var shipaddr1 = sRes.getValue({
					name: 'shipaddress1'
				});
				var shipaddr2 = sRes.getValue({
					name: 'shipaddress2'
				});
				var shipcity = sRes.getValue({
					name: 'shipcity'
				});
				var shipstate = sRes.getValue({
					name: 'shipstate'
				});
				var shipzip = sRes.getValue({
					name: 'shipzip'
				});
				var shipcountry = sRes.getValue({
					name: 'shipcountrycode'
				});
				var shipphone = sRes.getValue({
					name: 'shipphone'
				});
				var shipdate = sRes.getValue({
					name: 'shipdate'
				});
				var custbody_phone_shipping = sRes.getValue({
					name: 'custbody_phone_shipping'
				});
				var email = sRes.getValue({
					name: 'custbody_email'
				});
				var custbody_gift_message = sRes.getValue({
					name: 'custbody_gift_message'
				});
				var custbody_locale = sRes.getText({
					fieldId: 'custbody_locale'
				});
				var items = [];
				
				var itemid = sRes.getValue({
					name: 'externalid',
					join: 'item'
				});

				if (itemid) {

					var quantity = parseInt(sRes.getValue({
						name: 'quantity'
					}), 10);
                    if (locale == 'fr_CA') {
                        var description = sRes.getValue({
                            fieldId: 'custcolfrench_item_idesc',
                            join: 'item'
                        });
                    }
                    else {
                        var description = sRes.getValue({
                            name: 'salesdescription',
                            join: 'item'
                        });
                    }
					var amount = parseFloat(sRes.getValue({
						name: 'amount'
					}));
					var rate = parseFloat(sRes.getValue({
						name: 'rate'
					}));
					var iteminternalid = sRes.getValue({
						name: 'internalid',
						join: 'item'
					});
					var linenum = sRes.getValue({
                        name: 'custcol_line_id',
					});

                    log.debug("***LINE NUM***", "LINE NUM:"+linenum);

					items.push({
						'itemid': itemid,
						'quantity': quantity,
						'iteminternalid': iteminternalid,
						'rate': rate,
						'amount': amount,
						'description': description,
                        'custcol_line_id' : linenum
					});

				}
				
				order = {
					"internalid": internalid,
					"externalid": externalid,
					"entity": entity,
					"tranid": tranid,
					"otherrefnum": otherrefnum,
					"location": location,
					"trandate": trandate,
					"shipmethod": shipmethod,
					"source": source,
					"billaddressee": billaddressee,
					"billaddr1": billaddr1,
					"billaddr2": billaddr2,
					"billcity": billcity,
					"billstate": billstate,
					"billzip": billzip,
					"billcountry": billcountry,
					"billphone": billphone,
					"shipaddressee": shipaddressee,
					"shipaddr1": shipaddr1,
					"shipaddr2": shipaddr2,
					"shipcity": shipcity,
					"shipstate": shipstate,
					"shipzip": shipzip,
					"shipcountry": shipcountry,
					"shipphone": shipphone,
					"custbody_email": email,
					"custbody_gift_message": custbody_gift_message,
					"items": items,
					"shipdate" : shipdate,
					"custbody_phone_shipping": custbody_phone_shipping,
                    "bigticket" : "Y"
				};
			}

			return order;
		
		} catch (e) {
	
			log.error("***BUILD IMPORT OBJECT ERR***", e);
			throw e.toString();
	
		}
	}

	function updateRecord(so, hubid, incrementFailCounter, lineIds) {
		checkForReSchedule();
		var hub = null;

		if (hubid) {
			hub = hubid;
		}

		var value = so.getValue({
			fieldId: 'custbodyhub_id_get_failed'
		});

		log.debug("***RETRY VALUE***", value);

		if (incrementFailCounter) {

			so.setValue({
				fieldId: 'custbodyhub_id_get_failed',
				value: value + 1,
				ignoreFieldChange: true
			});

		}

		if (hub) {
			if (lineIds.length > 0) {
				lineIds.forEach(function(line) {
					so.setSublistValue({
						sublistId: 'item',
						fieldId: 'custcol_hub_id_item',
						line: line - 1,
						value: hub
					});
				});
			}
		}

		return so.save();

	}

	function createSearch() {
		checkForReSchedule();

		var searchId = runtime.getCurrentScript().getParameter(
				params.customHubIdSearch);

		if (!searchId) {
			throw 'MISSING_REQUIRED_PARAMETER: '+params.customHubIdSearch;
		}

		var savedSearch = search.load({
			id: searchId
		});
		
		return savedSearch;
	}

	function getHubId(invoiceNumber, tok) {
		var logTitle = 'ClearD getHubId';
		try {
			checkForReSchedule();
	
			var method = "GET";
			var url = runtime.getCurrentScript().getParameter(params.getClearDHubIdUrl);
			log.debug(logTitle, '## url' + url);

			if (!url) {
				throw 'MISSING_REQUIRED_PARAMETER: '+params.getClearDHubIdUrl;
			}

			//HTTP headers
			var headers = new Array();
			headers['Content-Type'] = 'application/json';
			headers['Authorization'] = "Bearer " + tok;
	
			var resttResponse = http.request({
				method: method,
				url: url+invoiceNumber,
				headers: headers
			});
	
			if (resttResponse.code === 400) {
				return false;
			} else if (resttResponse.code === 401) {
				token = getToken();
				return getHubId(invoiceNumber, token);
			} else if (resttResponse.code === 504 ||
					resttResponse.code === 500) {
				return getHubId(invoiceNumber, tok);
			}

			log.debug("***CLEARD HubId***", resttResponse.body);

			return resttResponse.body;
		} catch (e) {
			if (e.name === 'SSS_CONNECTION_TIME_OUT') {
				log.error("***CONN TIMEOUT ERR***", e);
				return getHubId(invoiceNumber, tok);
			} else {
				log.error("***GET TOKEN ERR***", e);
				throw e.toString();
			}
		}
	}

	/**
	 * Gets access token from ClearD
	 * 
	 * @returns {String} access token
	 */
	function getToken() {
		var logTitle = 'ClearD getToken';
		try {
			checkForReSchedule();
			var method = "GET";
			var url = runtime.getCurrentScript().getParameter(params.getClearDTokenUrl);

			log.debug(logTitle, '## url' + url);

			if (!url) {
				throw 'MISSING_REQUIRED_PARAMETER: '+params.getClearDTokenUrl;
			}
			
			// HTTP headers
			var headers = new Array();
			headers['Content-Type'] = 'application/json';
	
			var resttResponse = http.request({
				method : method,
				url : url,
				headers : headers
			});
	
			if (debug) {
				log.debug("***CLEARD TOKEN***", resttResponse.body);
			}
	
			if (resttResponse.code === 400 || resttResponse.code === 500 ||
					resttResponse.code === 504 || resttResponse.code === 401) {
				return getToken();
			}
	
			return JSON.parse(resttResponse.body).access_token;
		} catch (e) {
			if (e.name === 'SSS_CONNECTION_TIME_OUT') {
				log.error("***CONN TIMEOUT ERR***", e);
				return getToken();
			} else {
				log.error("***GET TOKEN ERR***", e);
				throw e.toString();
			}
		}
	}

	function checkForReSchedule() {
		var remainingUsage = runtime.getCurrentScript()
			.getRemainingUsage();

		if (remainingUsage <= 100) {
			
			var scriptid = runtime.getCurrentScript().id;
			var deploymentid = runtime.getCurrentScript().deploymentId;
	
			var mrTask = task.create({
				taskType: task.TaskType.SCHEDULED_SCRIPT
			});
			mrTask.scriptId = scriptid;
			mrTask.deploymentId = deploymentid;
			var mrTaskId = mrTask.submit();
	
			log.audit("***STATUS***", 
					"USAGE LIMIT REACED. RESCHEDULED: "+mrTaskId);
	
		}
	}


	return {
		execute : execute
	};

});