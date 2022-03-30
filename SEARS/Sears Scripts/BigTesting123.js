/**
 * @NApiVersion 2.x
 * @NScriptType ScheduledScript
 * @NModuleScope public
 */
define([ 'N/task','N/http', 'N/https', 'N/record', 'N/runtime', 
         'N/search', 'N/format', './NSUtil' ],
/**
 * @param {Object} nsutil
 * @param {http} http
 * @param {https} https
 * @param {record} record
 * @param {runtime} runtime
 * @param {search} search
 */
function(task, http, https, record, runtime, search, format, nsutil) {
	var debug = null;
	var token = null;
	const params = {
		sendToLogfireUrl: 'custscript_send_to_logfire_url1',
		getClearDHubIdUrl: 'custscript_get_cleard_hub_id_url1',
		getClearDTokenUrl: 'custscript_get_cleard_token_url1',
		customHubIdSearch: 'custscriptcustom_hubid_search1',
		debugEnabled: 'custscriptdebug_enabled_hubid1',
      smallTicketSearch: 'custscript_sss2_sendso_savedsearch'
	};

	/**
	 * Definition of the Scheduled script trigger point.
	 * 
	 * @param {Object}
	 *            scriptContext
	 * @param {string}
	 *            scriptContext.type - The context in which the script
	 *            is executed. It is one of the values from the
	 *            scriptContext.InvocationType enum.
	 * @Since 2015.2
	 */
	function execute(scriptContext) {

		log.audit("***STATUS***", "STARTED");

		debug = runtime.getCurrentScript().getParameter(
				params.debugEnabled);

		scriptid = runtime.getCurrentScript().id;

		deploymentid = runtime.getCurrentScript().deploymentId;

		setupHubIds();

		log.audit("***STATUS***", "FINISHED");
	 

	}

	function setupHubIds() {
		try {
			//var search = createSearch();
       
			var pageRanges = null;
          	var pageRanges1 = null;
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

		          
             var search = createSearch();
			
          	var pageData = search.runPaged({
				pageSize : 400
			});
          
          if (pageData) {
			pageRanges = pageData.pageRanges;
            
            
             if (pageRanges.length > 0) {
              token = getToken();

                pageRanges.forEach(function (pageRange) {
                    var page = pageData.fetch({
                        index: pageRange.index
                    });

                    var arrSo = page.data;
                  
                   if (arrSo) {
                        arrSo.forEach(function (currSo) {
                            log.debug(
								'***ORDER***',
								JSON.stringify(currSo));
                          
                            currLocation = currSo.getText({
                                name: 'location'
                            });
                          
                          
                            if (prevSo) {
                                var currExtId = currSo
										.getValue({
										    name: 'externalid'
										});

                                var prevExtId = prevSo
										.getValue({
										    name: 'externalid'
										});

                                externalIdCheck = currExtId !== prevExtId;
                                locationCheck = currLocation !== prevLocation;

                                if (externalIdCheck
										|| locationCheck) {
                                    var response = getHubId(
											prevExtId,
											token);

                                    response = JSON
											.parse(response);

                                 //   if (debug) {
                                        log.debug(
											"***HUB ID RESP***",
											response);
                                 //   }

                                    var recSo = record
											.load({
											    type: record.Type.SALES_ORDER,
											    id: prevSo.id,
											    isDynamin: false
											});

                                    var hubid = null;

                                    if (response ||
											(hubValue && hubValue !== 'N/A')) {
                                        if (hubValue && hubValue !== 'N/A') {
                                            hubid = hubValue;
                                        } else {
                                            hubid = response.hubName;
                                        }
                                        salesOrder.hubid = hubid;

                                        salesOrders
												.push(salesOrder);
                                    }

                                    salesOrder = null;

                                    var recId = updateRecord(
											recSo,
											hubid,
											externalIdCheck,
											lineIds);

                                    if (debug) {
                                        log.debug(
											"***REC ID***",
											recId);
                                    }

                                    log.debug(
											"***Length for salesorder***",
											salesOrders.length );
                                    if (salesOrders.length > 0) {
                                        salesOrdersObj.salesOrders = salesOrders;
                                        respLogfire = sendToLogFire(salesOrdersObj);

                                     
                                            log.debug("***LOGFIRE RESP***",
													respLogfire);
                                        

                                        reactToLogfireResponse(salesOrders, respLogfire);
                                    }
                                    lineIds = [];
                                    salesOrders = [];
                                }
                            }
                          
                          salesOrder = buildSalesOrders(
									salesOrder, currSo);
                          
                            log.debug(
								'***Sales Order***',
								JSON.stringify(salesOrder));
                            prevSo = currSo;
                            prevLocation = currLocation;
                            lineIds.push(prevSo.getValue({
                                name: 'linesequencenumber'
                            }));
                            hubValue = prevSo.getValue({
                                name: 'custcol_hub_id_item'
                            });
                          

                        })}

                  })
              }
			}
          
          
          //  var search = createSearch1();
			
          //	var pageData = search.runPaged({
		//		pageSize : 400
		//	});
          
        //  if (pageData) {
		//	pageRanges = pageData.pageRanges;
            
          //
           //  if (pageRanges.length > 0) {
             //   token = getToken();

              //  pageRanges.forEach(function (pageRange) {
               //     var page = pageData.fetch({
               //         index: pageRange.index
             //       });

             //       var arrSo = page.data;
                  
               //    if (arrSo) {
               //         arrSo.forEach(function (currSo) {
               //             log.debug(
				//				'***ORDER***',
				//				JSON.stringify(currSo));

                 //       })}

               //   })
            //  }
		//	}
          
          
          log.error("***SETUP HUB ID1***", pageRanges.length);
          
          
           
          
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
                        name: 'linesequencenumber',
                    });
                    var shipdate = sRes.getValue({
                        name: 'custcol_ship_date',
                    });

                    log.debug("***LINE NUM***", "LINE NUM:" + linenum);

                    order.items.push({
                        'itemid': itemid,
                        'quantity': quantity,
                        'iteminternalid': iteminternalid,
                        'rate': rate,
                        'amount': amount,
                        'description': description,
                        'custcol_line_id': linenum,
                        'custcol_ship_date': shipdate
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
                    name: 'custbody_locale'
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
                        name: 'linesequencenumber',
                    });
                    var shipdate = sRes.getValue({
                        name: 'custcol_ship_date',
                    });

                    log.debug("***LINE NUM***", "LINE NUM:" + linenum);
                    log.debug("***LINE NUM***", "LINE NUM:" + itemid);

                    items.push({
                        'itemid': itemid,
                        'quantity': quantity,
                        'iteminternalid': iteminternalid,
                        'rate': rate,
                        'amount': amount,
                        'description': description,
                        'custcol_line_id': linenum,
                        'custcol_ship_date': shipdate
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
                    "shipdate": shipdate,
                    "custbody_phone_shipping": custbody_phone_shipping,
                    "bigticket": "Y"
                };
            }

            return order;
        } catch (e) {
            log.error("***BUILD IMPORT OBJECT ERR***", e);
            throw e.toString();
        }
    }

	function createSearch() {
		//checkForReSchedule();

		var searchId = runtime.getCurrentScript().getParameter(
				params.customHubIdSearch);
      
      
      
        log.debug('*customHubIdSearch*', searchId);

		if (!searchId) {
			throw 'MISSING_REQUIRED_PARAMETER: '
					+ params.customHubIdSearch;
		}

		var savedSearch = search.load({
			id : searchId
		});
    

		return savedSearch;
	}
  
  function createSearch1() {
		//checkForReSchedule();

		
      
		var searchId1 = runtime.getCurrentScript().getParameter(
				params.smallTicketSearch);
      
        // log.debug('*customHubIdSearch*', searchId);

		if (!searchId1) {
			throw 'MISSING_REQUIRED_PARAMETER1: '
					+ params.smallTicketSearch;
		}

	
      
      var savedSearch1 = search.load({
			id : searchId1
		});

		return savedSearch1;
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
          log.error("***Response Body***", resttResponse.body);
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
            method: method,
            url: url,
            body: JSON.stringify(salesOrders),
            headers: headers
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
            log.debug("response", "checking logfire response:" + JSON.stringify(respLogfire));
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

                salesOrders.forEach(function (salesOrder) {
                    checkForReSchedule();

                    orderRecord = record.load({
                        type: record.Type.SALES_ORDER,
                        id: salesOrder.internalid,
                        isDynamin: false
                    });

                    lineCount = orderRecord
							.getLineCount({
							    sublistId: 'item'
							});

                    if (lineCount > 0) {
                        for (var line = 0; line < lineCount; line++) {
                            var itemType = orderRecord.getSublistValue({
                                sublistId: 'item',
                                fieldId: 'itemtype',
                                line: line,
                            });
                            var amount = orderRecord.getSublistValue({
                                sublistId: 'item',
                                fieldId: 'amount',
                                line: line,
                            });
                            log.debug("response", "Item Type:" + itemType);
                            if (itemType == 'Discount') {
                                orderRecord.setSublistValue({
                                    sublistId: 'item',
                                    fieldId: 'costestimatetype',
                                    line: line,
                                    value: null
                                });
                                orderRecord.setSublistValue({
                                    sublistId: 'item',
                                    fieldId: 'amount',
                                    line: line,
                                    value: amount
                                });
                                log.debug("response", "Im a discount");
                            }
                            isBigTicket = orderRecord.getSublistValue({
                                sublistId: 'item',
                                fieldId: 'custcol_bigticket',
                                line: line
                            });

                            itemShipDate = orderRecord.getSublistValue({
                                sublistId: 'item',
                                fieldId: 'custcol_ship_date',
                                line: line
                            });
                            itemShipDate = new Date(itemShipDate);

                            isSentToWms = orderRecord.getSublistValue({
                                sublistId: 'item',
                                fieldId: 'custcol_sent_to_wms_timestamp',
                                line: line
                            });

                            wmsTimestamp = new Date();
                            dateAhead = wmsTimestamp.getDate() + 2;

                            wmsTimestamp = format.parse({
                                value: wmsTimestamp,
                                type: format.Type.DATE
                            });

                            isValidDate = (itemShipDate
									.getDate() <= dateAhead);


                            log.debug("response", "did it fail?:" + isSentToWms + ":" + isValidDate + ":" + isBigTicket);
                            if (isBigTicket) {
                                log.debug("response", "it succeeded, setting flag:" + isSentToWms);
                                orderRecord.setSublistValue({
                                    sublistId: 'item',
                                    fieldId: 'custcol_sent_to_apigee',
                                    line: line,
                                    value: true
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

  
    function updateRecord(so, hubid, incrementFailCounter, lineIds) {
        checkForReSchedule();
        var hub = null;
        var value = so.getValue({
            fieldId: 'custbodyhub_id_get_failed'
        });
        var externalId = so.getValue({
            fieldId: 'externalid'
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
                fieldId: 'custbodyhubid',
                value: hub,
                ignoreFieldChange: true
            });
        } else {
            so.setValue({
                fieldId: 'custbodyhub_id_get_failed',
                value: value + 1,
                ignoreFieldChange: true
            });
        }
        var numLines = so.getLineCount({
            sublistId: 'item'
        });
        for (var i = 0; i < numLines; i++) {
            var itemType = so.getSublistValue({
                sublistId: 'item',
                fieldId: 'itemtype',
                line: i,
            });
            var amount = so.getSublistValue({
                sublistId: 'item',
                fieldId: 'amount',
                line: i,
            });
            log.debug("response", "Item Type:" + itemType);
            if (itemType == 'Discount') {
                so.setSublistValue({
                    sublistId: 'item',
                    fieldId: 'costestimatetype',
                    line: i,
                    value: null
                });
                so.setSublistValue({
                    sublistId: 'item',
                    fieldId: 'amount',
                    line: i,
                    value: amount
                });
                log.debug("response", "Im a discount");
            }
        }

        return so.save();
    }

  
	function checkForReSchedule() {
	
    
	}

	return {
		execute : execute
	};

});