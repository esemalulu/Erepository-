/**
 * @NApiVersion 2.x
 * @NScriptType ScheduledScript
 * @NModuleScope public
 */
define([ 'N/task','N/http', 'N/https', 'N/record', 'N/runtime', 
         'N/search', 'N/format', './NSUtil' ],

function(task, http, https, record, runtime, search, format, nsutil) {
	var debug = null;
	const params = {
		sendToLogfireUrl: 'custscript_sendso',
		customHubIdSearch: 'custscript_bigticket_search',
		debugEnabled: 'custscript_debug_enabled',
	};

	function execute(scriptContext) {

		log.audit("***STATUS***", "STARTED");

		debug = runtime.getCurrentScript().getParameter(
				params.debugEnabled);

		scriptid = runtime.getCurrentScript().id;

		deploymentid = runtime.getCurrentScript().deploymentId;

		sendOrders();

		log.audit("***STATUS***", "FINISHED");

	}

	function sendOrders() {
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
			var hubValue = null;

			var pageData = search.runPaged({
				pageSize : 400
			});
			log.debug('search', 'performing search...!');

			if (pageData) {
				pageRanges = pageData.pageRanges;
			}

			if (pageRanges.length > 0) {
				//token = getToken();

				pageRanges.forEach(function(pageRange) {
					var page = pageData.fetch({
						index : pageRange.index
					});

					var arrSo = page.data;

					if (arrSo) {
						arrSo.forEach(function(currSo) {
							log.debug(
								'***ORDER***',
								JSON.stringify(currSo));

							currLocation = currSo.getText({
								name : 'location'
							});

							if (prevSo) {
								var currExtId = currSo
										.getValue({
											name : 'externalid'
										});

								var prevExtId = prevSo
										.getValue({
											name : 'externalid'
										});

								externalIdCheck = currExtId !== prevExtId;
								locationCheck = currLocation !== prevLocation;

								if (externalIdCheck
										|| locationCheck) {
									/*var response = getHubId(
											prevExtId,
											token);

									response = JSON
											.parse(response);

									if (debug) {
										log.debug(
											"***HUB ID RESP***",
											response);
									}*/

									var recSo = record
											.load({
												type : record.Type.SALES_ORDER,
												id : prevSo.id,
												isDynamin : false
											});

									var hubid = null;
									log.debug("***HUB1***", hubValue);
									if (hubValue && hubValue !== 'N/A') {
                                        hubid = hubValue;
										salesOrder.hubid = hubid;

										salesOrders
												.push(salesOrder);
									}
                                    else {
                                        return;
                                    }

									salesOrder = null;

									/*var recId = updateRecord(
											recSo,
											hubid,
											externalIdCheck,
											lineIds);

									if (debug) {
										log.debug(
											"***REC ID***",
											recId);
									}*/

									if (salesOrders.length > 0) {
										salesOrdersObj.salesOrders = salesOrders;
										respLogfire = sendToLogFire(salesOrdersObj);

										if (debug) {
											log.debug("***LOGFIRE RESP***",
													respLogfire);
										}

										reactToLogfireResponse(salesOrders, respLogfire);
									}
									lineIds = [];
									salesOrders = [];
								}
							}

							salesOrder = buildSalesOrders(
									salesOrder, currSo);
							prevSo = currSo;
							prevLocation = currLocation;
							lineIds.push(prevSo.getValue({
												name : 'custcol_line_id'
											}));
							log.debug("***ORDER***", JSON.stringify(prevSo));
							hubValue = prevSo.getValue({
								name : 'custbodyhubid'
							});
							log.debug("***READ HUB***", hubValue);

							checkForReSchedule();
						});

						var currExtId = prevSo.getValue({
							name : 'externalid'
						});

						/*var response = getHubId(currExtId,
								token);

						response = JSON.parse(response);

						if (debug) {
							log.debug("***HUB ID RESP***",
									response);
						}*/

						var recSo = record.load({
							type : record.Type.SALES_ORDER,
							id : prevSo.id,
							isDynamin : false
						});

						var hubid = null;
						log.debug("***HUB2***", hubValue);
                        if (hubValue && hubValue !== 'N/A') {
                            hubid = hubValue;
                            salesOrder.hubid = hubid;
                            salesOrders.push(salesOrder);
                        }

						salesOrder = null;

						/*var recId = updateRecord(recSo, hubid,
								true, lineIds);*/

						if (debug) {
							//log.debug("***REC ID***", recId);
							log.debug('***SALESORDER***', JSON
									.stringify(salesOrders));
						}

						if (salesOrders.length > 0) {
							salesOrdersObj.salesOrders = salesOrders;
							respLogfire = sendToLogFire(salesOrdersObj);

							if (debug) {
								log.debug("***LOGFIRE RESP***",
										respLogfire);
							}

							reactToLogfireResponse(salesOrders, respLogfire);
						}
						lineIds = [];
						salesOrders = [];
					}
				});
			}
		} catch (e) {
			log.error("***SETUP HUB ID***", e);
			throw e.toString();
		}

	}

	function sendToLogFire(salesOrders) {
		checkForReSchedule();

		var method = "POST";
		var url = runtime.getCurrentScript().getParameter(
				params.sendToLogfireUrl);

		if (!url) {
			throw 'MISSING_REQUIRED_PARAMETER: ' + params.sendToLogFire;
		}

		// HTTP headers
		var headers = new Array();
		headers['Content-Type'] = 'application/json';

		var resttResponse = http.request({
			method : method,
			url : url,
			body : JSON.stringify(salesOrders),
			headers : headers
		});

		if (debug) {
			log.debug("***IMPORT ORDER RESP STATUS***",
					resttResponse.code);
		}

		if (resttResponse.code === 400) {
			return false;
		} else if (resttResponse.code === 504
				|| resttResponse.code === 500
				|| resttResponse.code === 401) {
			return sendToLogFire(salesOrders);
		}
		return resttResponse.body;
	}

	function reactToLogfireResponse(salesOrders, respLogfire) {
		if (respLogfire) {
			respLogfire = JSON.parse(respLogfire);
            log.debug("response", "checking logfire response:"+JSON.stringify(respLogfire));
			if (respLogfire.code == 200
                && salesOrders.length > 0) {
                log.debug("response", "response is 200");
				var lineCount = 0;
				var isBigTicket = false;
				var wmsTimestamp = null;
				var saveRecId = null;
				var orderRecord = null;
				var itemShipDate = null;
				var isValidDate = false;
				var dateAhead = null;
				var isSentToWms = null;

				salesOrders.forEach(function(salesOrder) {
					checkForReSchedule();

					orderRecord = record.load({
						type : record.Type.SALES_ORDER,
						id : salesOrder.internalid,
						isDynamin : false
					});

					lineCount = orderRecord
							.getLineCount({
								sublistId : 'item'
							});

					if (lineCount > 0) {
						for (var line = 0; line < lineCount; line++) {
                            var itemType = orderRecord.getSublistValue({
								sublistId : 'item',
								fieldId : 'itemtype',
								line : line,
                            });
                            var amount = orderRecord.getSublistValue({
                                sublistId : 'item',
                                fieldId : 'amount',
                                line : line,
                            });
                            log.debug("response", "Item Type:"+itemType);
                            if (itemType == 'Discount') {
                                orderRecord.setSublistValue({
                                    sublistId : 'item',
                                    fieldId : 'costestimatetype',
                                    line : line,
                                    value: null
                                });
                                orderRecord.setSublistValue({
                                    sublistId : 'item',
                                    fieldId : 'amount',
                                    line : line,
                                    value: amount
                                });
                                log.debug("response", "Im a discount");
                            }
							isBigTicket = orderRecord.getSublistValue({
								sublistId : 'item',
								fieldId : 'custcol_bigticket',
								line : line
							});

							itemShipDate = orderRecord.getSublistValue({
								sublistId : 'item',
								fieldId : 'custcol_ship_date',
								line : line
							});
							itemShipDate = new Date(itemShipDate);

							isSentToWms = orderRecord.getSublistValue({
								sublistId : 'item',
								fieldId : 'custcol_sent_to_wms_timestamp',
								line : line
							});

							wmsTimestamp = new Date();
							dateAhead = wmsTimestamp.getDate() + 2;

							wmsTimestamp = format.parse({
								value : wmsTimestamp,
								type : format.Type.DATE
							});

							isValidDate = (itemShipDate
									.getDate() <= dateAhead);
                            

                            log.debug("response", "did it fail?:"+isSentToWms+":"+isValidDate+":"+isBigTicket);
							if (isBigTicket) {
                                log.debug("response", "it succeeded, setting flag:"+isSentToWms);
								orderRecord.setSublistValue({
									sublistId : 'item',
									fieldId : 'custcol_sent_to_apigee',
									line : line,
									value : true
								});

								orderRecord.setSublistValue({
									sublistId : 'item',
									fieldId : 'custcol_sent_to_wms_timestamp',
									line : line,
									value : wmsTimestamp
								});
							}
						}

						saveRecId = orderRecord.save();

						log.debug("***SAVED REC ID***",
								saveRecId);
					}
				});
			} else if (respLogfire.code == 400) {
                log.debug("response", "response is 400");
				addErrorToLineItem(respLogfire);
			}
		}
	}

	function buildSalesOrders(order, sRes) {
		checkForReSchedule();

		try {
			if (order) {
				var itemid = sRes.getValue({
					name : 'externalid',
					join : 'item'
				});

				if (itemid) {
					var quantity = parseInt(sRes.getValue({
						name : 'quantity'
					}), 10);
					var description = sRes.getValue({
						name : 'salesdescription',
						join : 'item'
					});
					var amount = parseFloat(sRes.getValue({
						name : 'amount'
					}));
					var rate = parseFloat(sRes.getValue({
						name : 'rate'
					}));
					var iteminternalid = sRes.getValue({
						name : 'internalid',
						join : 'item'
					});
					var linenum = sRes.getValue({
						name : 'custcol_line_id',
					});
					var shipdate = sRes.getValue({
						name : 'custcol_ship_date',
					});

					log.debug("***LINE NUM***", "LINE NUM:" + linenum);

					order.items.push({
						'itemid' : itemid,
						'quantity' : quantity,
						'iteminternalid' : iteminternalid,
						'rate' : rate,
						'amount' : amount,
						'description' : description,
						'custcol_line_id' : linenum,
						'custcol_ship_date' : shipdate
					});
				}
			} else {
				var internalid = sRes.getValue({
					name : 'internalid'
				});
				var externalid = sRes.getValue({
					name : 'externalid'
				});
				var entity = sRes.getValue({
					name : 'entity'
				});
				var tranid = sRes.getValue({
					name : 'externalid'
				});
				var otherrefnum = sRes.getValue({
					name : 'otherrefnumber'
				});
				var location = sRes.getText({
					name : 'location'
				});
				var trandate = sRes.getValue({
					name : 'trandate'
				});
				var shipmethod = sRes.getText({
					name : 'shipmethod'
				});
				var source = sRes.getValue({
					name : 'source'
				});
				var billaddressee = sRes.getValue({
					name : 'billaddressee'
				});
				var billaddr1 = sRes.getValue({
					name : 'billaddress1'
				});
				var billaddr2 = sRes.getValue({
					name : 'billaddress2'
				});
				var billcity = sRes.getValue({
					name : 'billcity'
				});
				var billstate = sRes.getValue({
					name : 'billstate'
				});
				var billzip = sRes.getValue({
					name : 'billzip'
				});
				var billcountry = sRes.getValue({
					name : 'billcountrycode'
				});
				var billphone = sRes.getValue({
					name : 'billphone'
				});
				var shipaddressee = sRes.getValue({
					name : 'shipaddressee'
				});
				var shipaddr1 = sRes.getValue({
					name : 'shipaddress1'
				});
				var shipaddr2 = sRes.getValue({
					name : 'shipaddress2'
				});
				var shipcity = sRes.getValue({
					name : 'shipcity'
				});
				var shipstate = sRes.getValue({
					name : 'shipstate'
				});
				var shipzip = sRes.getValue({
					name : 'shipzip'
				});
				var shipcountry = sRes.getValue({
					name : 'shipcountrycode'
				});
				var shipphone = sRes.getValue({
					name : 'shipphone'
				});
				var shipdate = sRes.getValue({
					name : 'shipdate'
				});
				var custbody_phone_shipping = sRes.getValue({
					name : 'custbody_phone_shipping'
				});
				var email = sRes.getValue({
					name : 'custbody_email'
				});
				var custbody_gift_message = sRes.getValue({
					name : 'custbody_gift_message'
				});
				var custbody_locale = sRes.getText({
					name: 'custbody_locale'
				});
				var items = [];

				var itemid = sRes.getValue({
					name : 'externalid',
					join : 'item'
				});

				if (itemid) {
					var quantity = parseInt(sRes.getValue({
						name : 'quantity'
					}), 10);
					if (custbody_locale == 'fr_CA') {
						var description = sRes.getValue({
							name: 'custcolfrench_item_idesc',
							join: 'item'
						});
					} else {
						var description = sRes.getValue({
							name: 'salesdescription',
							join: 'item'
						});
					}
					var description = sRes.getValue({
						name : 'salesdescription',
						join : 'item'
					});
					var amount = parseFloat(sRes.getValue({
						name : 'amount'
					}));
					var rate = parseFloat(sRes.getValue({
						name : 'rate'
					}));
					var iteminternalid = sRes.getValue({
						name : 'internalid',
						join : 'item'
					});
					var linenum = sRes.getValue({
						name : 'custcol_line_id',
					});
					var shipdate = sRes.getValue({
						name : 'custcol_ship_date',
					});

					log.debug("***LINE NUM***", "LINE NUM:" + linenum);

					items.push({
						'itemid' : itemid,
						'quantity' : quantity,
						'iteminternalid' : iteminternalid,
						'rate' : rate,
						'amount' : amount,
						'description' : description,
						'custcol_line_id' : linenum,
						'custcol_ship_date' : shipdate
					});
				}

				order = {
					"internalid" : internalid,
					"externalid" : externalid,
					"entity" : entity,
					"tranid" : tranid,
					"otherrefnum" : otherrefnum,
					"location" : location,
					"trandate" : trandate,
					"shipmethod" : shipmethod,
					"source" : source,
					"billaddressee" : billaddressee,
					"billaddr1" : billaddr1,
					"billaddr2" : billaddr2,
					"billcity" : billcity,
					"billstate" : billstate,
					"billzip" : billzip,
					"billcountry" : billcountry,
					"billphone" : billphone,
					"shipaddressee" : shipaddressee,
					"shipaddr1" : shipaddr1,
					"shipaddr2" : shipaddr2,
					"shipcity" : shipcity,
					"shipstate" : shipstate,
					"shipzip" : shipzip,
					"shipcountry" : shipcountry,
					"shipphone" : shipphone,
					"custbody_email" : email,
					"custbody_gift_message" : custbody_gift_message,
					"items" : items,
					"shipdate" : shipdate,
					"custbody_phone_shipping" : custbody_phone_shipping,
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
		var value = so.getValue({
			fieldId : 'custbodyhub_id_get_failed'
		});
		var externalId = so.getValue({
			fieldId : 'externalid'
		});

		log.debug("***RETRY VALUE***", value);
		log.debug("***EXT ID***", externalId);

		if (hubid) {
			hub = hubid;
		}

//		if (incrementFailCounter) {
//			so.setValue({
//				fieldId : 'custbodyhub_id_get_failed',
//				value : value + 1,
//				ignoreFieldChange : true
//			});
//		}

		if (hub) {
			so.setValue({
				fieldId : 'custbodyhubid',
				value : hub,
                ignoreFieldChange: true
			});
		} else {
			so.setValue({
				fieldId : 'custbodyhub_id_get_failed',
				value : value + 1,
				ignoreFieldChange : true
			});
		}
        var numLines = so.getLineCount({
                sublistId: 'item'
        });
        for (var i=0; i < numLines; i++) {
            var itemType = so.getSublistValue({
                sublistId : 'item',
                fieldId : 'itemtype',
                line : i,
            });
            var amount = so.getSublistValue({
                sublistId : 'item',
                fieldId : 'amount',
                line : i,
            });
            log.debug("response", "Item Type:"+itemType);
            if (itemType == 'Discount') {
                so.setSublistValue({
                    sublistId : 'item',
                    fieldId : 'costestimatetype',
                    line : i,
                    value: null
                });
                so.setSublistValue({
                    sublistId : 'item',
                    fieldId : 'amount',
                    line : i,
                    value: amount
                });
                log.debug("response", "Im a discount");
            }
        }

		return so.save();
	}
	
	function addErrorToLineItem(logfireResponse) {
        log.debug("response", "logfire response:"+JSON.stringify(logfireResponse));
		if (Object.keys(logfireResponse.orders).length > 0) {
            log.debug("response", "logfire response has an error");
			var orders = logfireResponse.orders;
			var salesOrder = null;
			var bigTicketItems = [];
			for (var orderId in orders) {
                var externalId;
                for (externalId in orders[orderId]);
				var internalId = searchOrderInternalId(externalId);
				salesOrder = record.load({
					type : record.Type.SALES_ORDER,
					id : internalId,
					isDynamin : false
				});
                log.debug("response", "Location:"+orders[orderId][externalId].location);
				bigTicketItems = findBigTicketItemsWithLocation(salesOrder, orders[orderId][externalId].location, orders[orderId][externalId].linenums);
                //bigTicketItems = orders[orderId].linenums;
                log.debug("response", "finding big ticket items:"+JSON.stringify(bigTicketItems));
                if (orders[orderId][externalId].location) {
                    bigTicketItems.forEach(function(itemData) {
                        log.debug("response", "applying error message to line:"+itemData.line);
                        salesOrder.setSublistValue({
                            sublistId : 'item',
                            fieldId : 'custcol_wms_sending_errormsg',
                            line : itemData.line,
                            value : orders[orderId][externalId].message
                        });
                        /*var count = salesOrder.getSublistValue({
                            sublistId : 'item',
                            fieldId : 'custcol_sent_towms_fail',
                            
                        });
                        log.debug("response","Current fail count:"+count);
                        if (count == '') {
                            count = 0;
                        }
                        count += 1;
                        log.debug("response","New fail count:"+count);
                        salesOrder.setSublistValue({
                            sublistId : 'item',
                            fieldId : 'custcol_sent_towms_fail',
                            line : itemData.line,
                            value : count,
                            ignoreFieldChange : true
                        });*/
                    });
                }
                else {
                    bigTicketItems.forEach(function(itemData) {
                        log.debug("response", "applying sent to apigee line:"+itemData.line);
                        orderRecord.setSublistValue({
                            sublistId : 'item',
                            fieldId : 'custcol_sent_to_apigee',
                            line : itemData.line,
                            value : true
                        });
                    });
                }
                salesOrder.save();
			}
		}
	}

	function searchOrderInternalId (externalId) {
        var logTitle = 'searchOrderInternalId';
        log.debug (logTitle, "EXTERNAL ID TO SEARCH:"+externalId);
        var arrSalesOrderSearch = nsutil.searchAll({
            recordType : 'salesorder',
            columns : [ 'internalid' ],
            filterExpression : [ [ 'externalid', search.Operator.IS, externalId ] ],
        });
        log.debug (logTitle, JSON.stringify(arrSalesOrderSearch));
        var internalId = arrSalesOrderSearch[0].id;
        return internalId;
    };

	
	function findBigTicketItemsWithLocation(recordObj, givenLocation, lineNums) {
		var lineCount = recordObj.getLineCount({sublistId: 'item'});

		var arrBigTicketItems = [];
		var isBigTicket = null, location = null, inLineNums = false;
        for (var line=0; line < lineCount; line++) {
            var itemType = recordObj.getSublistValue({
                sublistId : 'item',
                fieldId : 'itemtype',
                line : line,
            });
            var amount = recordObj.getSublistValue({
                sublistId : 'item',
                fieldId : 'amount',
                line : line,
            });
            log.debug("response", "Item Type:"+itemType);
            if (itemType == 'Discount') {
                recordObj.setSublistValue({
                    sublistId : 'item',
                    fieldId : 'costestimatetype',
                    line : line,
                    value: null
                });
                recordObj.setSublistValue({
                    sublistId : 'item',
                    fieldId : 'amount',
                    line : line,
                    value: amount
                });
                log.debug("response", "Im a discount");
            }
            isBigTicket = recordObj.getSublistValue({
                sublistId:'item',
                fieldId:'custcol_bigticket',
                line:line
            });
            location = recordObj.getSublistText({
                sublistId:'item',
                fieldId:'location',
                line:line
            });
            if(lineNums.indexOf((line+1).toString()) > -1) {
                inLineNums = true;
            }
            log.debug("response", "IN LINE NUMS:"+inLineNums+"->"+(line+1));
            log.debug("response", "Perform check:"+isBigTicket+":"+location+":"+givenLocation+":"+inLineNums);
            if ((isBigTicket && location === givenLocation && inLineNums) || !givenLocation) {
                log.debug("response", "adding to arrbigticketitems");
                var itemData = {};

                itemData.line = line;

                arrBigTicketItems.push(itemData);
            }
        }
		
		return arrBigTicketItems;
	}

	function createSearch() {
		checkForReSchedule();

		var searchId = runtime.getCurrentScript().getParameter(
				params.customHubIdSearch);

		if (!searchId) {
			throw 'MISSING_REQUIRED_PARAMETER: '
					+ params.customHubIdSearch;
		}

		var savedSearch = search.load({
			id : searchId
		});

		return savedSearch;
	}

	function getHubId(invoiceNumber, tok) {
		try {
			checkForReSchedule();

			var method = "GET";
			var url = runtime.getCurrentScript().getParameter(
					params.getClearDHubIdUrl);

			if (!url) {
				throw 'MISSING_REQUIRED_PARAMETER: '
						+ params.getClearDHubIdUrl;
			}

			// HTTP headers
			var headers = new Array();
			headers['Content-Type'] = 'application/json';
			headers['Authorization'] = "Bearer " + tok;

			var resttResponse = http.request({
				method : method,
				url : url + invoiceNumber,
				headers : headers
			});

			if (resttResponse.code === 400) {
				return false;
			} else if (resttResponse.code === 401) {
				token = getToken();
				return getHubId(invoiceNumber, token);
			} else if (resttResponse.code === 504
					|| resttResponse.code === 500) {
				return getHubId(invoiceNumber, tok);
			}
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
		try {
			checkForReSchedule();
			var method = "GET";
			var url = runtime.getCurrentScript().getParameter(
					params.getClearDTokenUrl);

			if (!url) {
				throw 'MISSING_REQUIRED_PARAMETER: '
						+ params.getClearDTokenUrl;
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

			if (resttResponse.code === 400
					|| resttResponse.code === 500
					|| resttResponse.code === 504
					|| resttResponse.code === 401) {
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
				taskType : task.TaskType.SCHEDULED_SCRIPT
			});
			mrTask.scriptId = scriptid;
			mrTask.deploymentId = deploymentid;
			var mrTaskId = mrTask.submit();

			log.audit("***STATUS***",
					"USAGE LIMIT REACED. RESCHEDULED: " + mrTaskId);
		}
	}

	return {
		execute : execute
	};

});
