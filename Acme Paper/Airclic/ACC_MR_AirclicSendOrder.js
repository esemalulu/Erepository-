/**
 * @NApiVersion 2.1
 * @NScriptType MapReduceScript
 * @NModuleScope SameAccount
 */

define([
    "N/record",
    "N/runtime",
    "N/search",
    "N/log",
    "N/email",
    "N/error",
    "N/https",
    "N/file",
    "N/render",
], function (record, runtime, search, log, email, error, https, file, render) {
    function getInputData(context) {
        try {
            var airclicOrdersSent = file.create({
                name: "airclic_orders_sent",
                fileType: file.Type.JSON,
                contents: `{"OrdersSent": 0}`,
                folder: 3392,// folder inside suitescript
            });
            airclicOrdersSent.save();
            var airclicOrdersFailed = file.create({
                name: "orders_that_failed.json",
                fileType: file.Type.JSON,
                contents: "{}",
                folder: 3392,// folder inside suitescript
            });
            airclicOrdersFailed.save();

            var scriptObj = runtime.getCurrentScript();
            var username = scriptObj.getParameter("custscript_acc_air_username");
            var password = scriptObj.getParameter("custscript_acc_air_password");
            var orderURL = scriptObj.getParameter("custscript_acc_air_order_url");
            var routeNo = scriptObj.getParameter("custscript_acc_air_routeno");
            var routeNoEnd = scriptObj.getParameter("custscript_acc_air_routeno_end");
            var routeFilter = getRouteFilter(routeNo, routeNoEnd);
            log.debug('routeFilter', routeFilter)
            var startDate = scriptObj.getParameter("custscript_start_date");
            var endDate = scriptObj.getParameter("custscript_end_date");
            var xmlTemplateFile = scriptObj.getParameter("custscript_acc_air_xml_template");
            if (
                isEmpty(orderURL) ||
                isEmpty(username) ||
                isEmpty(password) ||
                isEmpty(routeNo) ||
                isEmpty(xmlTemplateFile)
            ) {
                log.debug(errorTitle, "Script Parameters are missing.");
                return;
            }
            routeNo = "" + routeNo;
            log.debug("Environment Data: ", { username, password, orderURL, xmlTemplateFile, routeNo, routeNoEnd });

            var myFilter = [];
            if (startDate && endDate) {
                myFilter = [["datecreated", "onorafter", startDate], ["datecreated", "onorbefore", endDate]]
            }
            var filters = [
                ["item", "noneof", 101912],
                "AND",
                ["mainline", "is", "F"],
                "AND",
                ["type", "anyof", "CustInvc", "RtnAuth"],
                "AND",
                routeFilter,
                "AND",
                ["taxline", "is", "F"],
                "AND",
                ["cogs", "is", "F"],
                "AND",
                ["shipping", "is", "F"],
                "AND",
                ["custbody_aps_sent_to_airclick", "is", "F"],
                "AND",
                ["status", "anyof", "CustInvc:A", "CustInvc:B", "RtnAuth:A", "RtnAuth:B"],
            ]
            if (myFilter.length) {
                filters.push("AND");
                filters.push(myFilter[0])
                filters.push("AND");
                filters.push(myFilter[1])
            }
            var invoiceSearchObj = search.create({
                type: search.Type.TRANSACTION,
                filters: filters,
                columns: [
                    "internalid",
                    search.createColumn({
                        name: "entityid",
                        join: "customerMain",
                    }),
                    search.createColumn({
                        name: "companyname",
                        join: "customerMain",
                    }),
                    "shipaddress1",
                    "shipaddress2",
                    "shipcity",
                    "shipstate",
                    "shipzip",
                    "shipcountry",
                    "location",
                    "custbody_acc_odoi_route_no",
                    "createdfrom",
                    search.createColumn({
                        name: "tranid",
                        join: "createdFrom",
                    }),
                    "tranid",
                    "otherrefnum",
                    "custbody_total_weight",
                    "custbody_total_cube_ft",
                    search.createColumn({
                        name: "rate",
                        join: "taxItem",
                    }),
                    "lineuniquekey",
                    "item",
                    search.createColumn({
                        name: "upccode",
                        join: "item",
                    }),
                    search.createColumn({
                        name: "custitem_acc_dot_harzardous",
                        join: "item",
                    }),
                    search.createColumn({
                        name: "displayname",
                        join: "item",
                    }),
                    search.createColumn({
                        name: "itemid",
                        join: "item",
                    }),
                    "memo",
                    "unit",
                    "unitid",
                    "quantity",
                    "amount",
                    /*search.createColumn({
                      name: "formulacurrency",
                      formula: "({taxamount}/{netamountnotax})*100",
                    }),*/
                    search.createColumn({
                        name: "custrecord_airclic_center",
                        join: "location",
                    }),
                    "custbody_aps_stop",
                    "trandate",
                    search.createColumn({
                        name: "trandate",
                        join: "createdFrom",
                    }),
                    "total",
                ]
            });

            var myResultSet = invoiceSearchObj.run();
            var resultRange = myResultSet.getRange({
                start: 0,
                end: 1000
            });
            log.debug("FILTERS: ", filters);
            log.debug("Transaction to Send: ", resultRange.length);
            return resultRange;
        } catch (e) {
            log.error("Error - getInputData", e.message);
        }
    }

    function getRouteFilter(routeNo, routeNoEnd) {
        if (!routeNoEnd || routeNo > routeNoEnd) return ["custbody_acc_odoi_route_no", "is", routeNo];
        var arrToReturn = [];
        for (let index = routeNo; index <= routeNoEnd; index++) {
            index == Number(routeNoEnd) ? arrToReturn.push(["custbody_acc_odoi_route_no", "is", String(index)]) : arrToReturn.push(["custbody_acc_odoi_route_no", "is", String(index)], "OR");
        }
        return arrToReturn;
    }

    function map(context) {
        try {
            var arrayData = JSON.parse(context.value);
            log.debug("Transaction to Send: ", { type: arrayData.recordType, id: arrayData.id });
            context.write({ key: arrayData.id, value: arrayData });
        } catch (e) {
            log.error("Error - map", e.message);
        }
    }

    function reduce(context) {
        try {
            var summaryParse = context.values;
            var baseData = JSON.parse(summaryParse[0]).values;

            baseData["customerMain.companyname"] = baseData["customerMain.companyname"].replaceAll("&", "AND"); // encodeURIComponent(baseData["customerMain.companyname"]);

            var itemsArr = getItemDetails(summaryParse);

            var orderObj = getOrderDetails(baseData, itemsArr);

            var requestBody = JSON.parse(JSON.stringify(getRequestBody(orderObj)).replaceAll("&", "AND"));;

            var orderSent = sendOrders(requestBody);

            if (orderSent === true) {
                // Save qty files received
                addOrderSentToFile()

                record.submitFields({
                    type: JSON.parse(summaryParse[0]).recordType,
                    id: context.key,
                    values: {
                        custbody_aps_sent_to_airclick: true,
                    },
                    options: {
                        enableSourcing: true,
                        ignoreMandatoryFields: true,
                    },
                });
                deleteFailedRecord(context.key)
            }
            else {
                addFailToFile(orderSent, orderObj.internalid)
            }
        }
        catch (error) {
            log.error("Error in reduce", error.toString());
        }
    }

    function summarize(summary) {

        handleErrorIfAny(summary);
        createSummaryRecord(summary);
    }

    // ------------------------------- AUXILIAR FUNCTIONS ----------------------------------------------------


    function addFailToFile(orderSent, internalid) {
        try {
            var fileId = -1
            var fileSearchObj = search.create({
                type: "file",
                filters:
                    [
                        ["name", "haskeywords", "orders_that_failed"]
                    ],
                columns:
                    [
                    ]
            });
            fileSearchObj.run().each(function (result) {
                fileId = result.id
                return false;
            });
            if (fileId != -1) {
                var fileLoaded = file.load({
                    id: fileId
                })
                var contents = JSON.parse(fileLoaded.getContents())
                try {
                    if(orderSent){
                        var newContents = orderSent.split("<body>")[1].split("</body>")[0]
                        contents[internalid] = newContents
    
                        var airclicOrdersFailed = file.create({
                            name: "orders_that_failed.json",
                            fileType: file.Type.JSON,
                            contents: JSON.stringify(contents),
                            folder: 3392,// folder inside suitescript
                        });
                        airclicOrdersFailed.save();
                        createFailRecord(JSON.parse(internalid), newContents)
                    }
    
                } catch (error) {
                    log.error("ERROR creating file", error);
                }
            }
        } catch (error) {
            log.error("error at addFailToFile", error)
        }
    }

    function createFailRecord(internalId, errorMessage) {
        try {
            var faieledSearchObj = search.create({
                type: "customrecord_sdb_airclic_orders_faieled",
                filters:
                    [
                        ["custrecord_sdb_airclic_order_id", "anyof", internalId]
                    ],
                columns:
                    [
                        search.createColumn({ name: "custrecord_sdb_airclic_order_id", label: "Airclic Order" }),
                        search.createColumn({ name: "custrecord_sdb_airclic_error_msg", label: "Error Message" }),
                        search.createColumn({ name: "lastmodified", label: "Last Modified" })
                    ]
            });
            var searchResultCount = faieledSearchObj.runPaged().count;
            if (searchResultCount > 0) {
                var loadedRecord = record.load({
                    type: "customrecord_sdb_airclic_orders_faieled",
                    id: internalId,
                    isDynamic: true,
                })
                loadedRecord.setValue({
                    fieldId: "custrecord_sdb_airclic_error_msg",
                    value: errorMessage,
                })
                loadedRecord.save()
            }
            else {
                var newFailRecord = record.create({
                    type: "customrecord_sdb_airclic_orders_faieled",
                    isDynamic: true,
                })
                newFailRecord.setValue({
                    fieldId: "custrecord_sdb_airclic_order_id",
                    value: internalId,
                })
                newFailRecord.setValue({
                    fieldId: "custrecord_sdb_airclic_error_msg",
                    value: errorMessage,
                })
                newFailRecord.save()
            }

        } catch (error) {
            log.error("Error at createFailRecord", error)
        }
    }

    function addOrderSentToFile() {
        try {
            var fileId = -1
            var fileSearchObj = search.create({
                type: "file",
                filters:
                    [
                        ["name", "haskeywords", "airclic_orders_sent"]
                    ],
                columns:
                    [
                    ]
            });
            fileSearchObj.run().each(function (result) {
                fileId = result.id
                return false;
            });
            if (fileId != -1) {
                var fileLoaded = file.load({
                    id: fileId
                })
                var contents = JSON.parse(fileLoaded.getContents())
                var newNumber = Number(contents.OrdersSent) + 1;
                var airclicOrdersSent = file.create({
                    name: "airclic_orders_sent",
                    fileType: file.Type.JSON,
                    contents: `{"OrdersSent": ${newNumber}}`,
                    folder: 3392,// folder inside suitescript
                });
                airclicOrdersSent.save();
            }
        } catch (error) {
            log.error("error at addORderSentToFile", error)
        }
    }

    function deleteFailedRecord(internalId) {
        try {
            var faieledSearchObj = search.create({
                type: "customrecord_sdb_airclic_orders_faieled",
                filters:
                    [
                        ["custrecord_sdb_airclic_order_id", "anyof", internalId]
                    ],
                columns:
                    [
                    ]
            });
            var searchResultCount = faieledSearchObj.runPaged().count;
            if (searchResultCount > 0) {
                faieledSearchObj.run().each(result => {
                    record.delete({
                        type: "customrecord_sdb_airclic_orders_faieled",
                        id: result.id
                    })
                    return false
                })
            }

        } catch (error) {
            log.error("Error at createFailRecord", error)
        }
    }

    function getRequestBody(orderObj) {
        try {

            var scriptObj = runtime.getCurrentScript();
            var xmlTemplateFile = scriptObj.getParameter("custscript_acc_air_xml_template");
            var template = file.load({ id: xmlTemplateFile }).getContents();
            if (orderObj.orderNumber.indexOf("RMA") > -1) {
                template = template.replaceAll('name="InvoiceNumber"', 'name="RMANumber"');
            }
            var objRender = render.create();
            objRender.templateContent = template;
            objRender.addCustomDataSource({
                format: render.DataSource.OBJECT,
                alias: "order",
                data: orderObj,
            });
            var requestBody = objRender.renderAsString();
            var fileObj = file.create({
                name: "test.xml",
                fileType: file.Type.XMLDOC,
                contents: requestBody,
            });
            fileObj.folder = 760;
            var id = fileObj.save();
            return requestBody;
        } catch (error) {
            log.error("Error in getRequestBody", error.toString());
        }
    }

    function getOrderDetails(baseData, itemsArr) {
        try {
            var scriptObj = runtime.getCurrentScript();
            var shipDate = scriptObj.getParameter("custscript_acc_air_shipmentdate");

            if (baseData.custbody_total_cube_ft < 1) {
                baseData.custbody_total_cube_ft = 1;
            }

            if (baseData.tranid.indexOf("RMA") > -1) {
                var rma = baseData.tranid;
                baseData.tranid = baseData["createdFrom.tranid"];
                baseData["createdFrom.tranid"] = rma;
                if(!baseData.tranid) baseData.tranid = rma;

                var rmaDate = baseData.trandate;
                baseData.trandate = baseData["createdFrom.trandate"];
                baseData["createdFrom.trandate"] = rmaDate;
                if(!baseData.trandate) baseData.trandate = rmaDate;
                if(!baseData.trandate) baseData.trandate = new Date();
            }

            if (!baseData["createdFrom.tranid"]) {
                baseData["createdFrom.tranid"] = baseData.tranid + "Creator";
                baseData["createdFrom.trandate"] = new Date();
            }
            log.debug('baseData', baseData)
            if (baseData.trandate)
                var orderObj = {
                    internalid: JSON.stringify(baseData.internalid[0].value),
                    timestamp: JSON.stringify(new Date().toISOString()),
                    customerNumber: baseData["customerMain.entityid"],
                    customerName: baseData["customerMain.companyname"],
                    addressLine1: baseData.shipaddress1.length ? baseData.shipaddress1 : "Empty",
                    addressLine2: baseData.shipaddress2,
                    city: baseData.shipcity,
                    state: baseData.shipstate,
                    zipCode: baseData.shipzip,
                    country: "USA",
                    centerNumber: baseData["location.custrecord_airclic_center"] || "N/A",
                    routeNumber: baseData.custbody_acc_odoi_route_no,
                    stopNumber: baseData.custbody_aps_stop,
                    invoiceDate: new Date(baseData.trandate).toISOString(),
                    orderNumber: baseData["createdFrom.tranid"],
                    orderDate: new Date(baseData["createdFrom.trandate"]).toISOString(),
                    poNumber: baseData.otherrefnum || 0,
                    amountDue: baseData.total || 0,
                    totalWeight: Number(baseData.custbody_total_weight) >= 1 ? baseData.custbody_total_weight : "1",
                    totalCube: baseData.custbody_total_cube_ft || 1,
                    invoiceNumber: baseData.tranid,
                    items: itemsArr,
                    shipmentDate: new Date(shipDate).toISOString(),
                };
            return orderObj;
        } catch (error) {
            log.error("Error in getOrderDetails", error.toString());
        }
    }

    function getItemDetails(summaryParse) {
        try {
            var itemsArr = [];
            for (var i = 0; i < summaryParse.length; i++) {
                var itemObj = JSON.parse(summaryParse[i]).values;
                var itemTest = itemObj["item.itemid"] || "";
                var itemTestName = itemObj["item.displayname"] || "";
                if (itemTest) itemTest = itemTest.replaceAll("&", "AND").substring(0, 49);
                if (itemTestName) itemTestName = itemTestName.replaceAll("&", "AND").substring(0, 49);
                var uom = itemObj.unit;

                if (isEmpty(itemObj.memo)) itemObj.memo = itemTestName;

                var obj = {
                    lineNumber: itemObj.lineuniquekey,
                    itemId: itemTest,
                    displayName: itemTestName,
                    UOM: uom ? uom.substring(0, 9) : "N/A",
                    description: itemObj.memo.replaceAll("&", "AND"),
                    quantity: itemObj.quantity,
                    UPC: itemObj["item.upccode"] || 0,
                    hazardous: itemObj["item.custitem_acc_dot_harzardous"],
                    amount: Math.abs(itemObj.amount) || 0,
                    taxRate: itemObj.formulacurrency || 0,
                };
                var alreadyHasItem = itemsArr.find(function (i) {
                    return i.itemId == itemTest;
                })
                try {
                    alreadyHasItem ? alreadyHasItem.quantity = Number(alreadyHasItem.quantity) + Number(obj.quantity) : itemsArr.push(obj);
                } catch (error) {
                    log.error("ERROR duplicate items", error);
                }
            }
            return itemsArr;
        } catch (error) {
            log.error("Error in getItemDetails", error.toString());
        }
    }

    function sendOrders(requestBody) {
        try {
            var scriptObj = runtime.getCurrentScript();
            var username = scriptObj.getParameter("custscript_acc_air_username");
            var password = scriptObj.getParameter("custscript_acc_air_password");
            var orderURL = scriptObj.getParameter("custscript_acc_air_order_url");
            log.audit("Send Order: ", requestBody);
            var response = https.post({
                url: orderURL,
                body: requestBody,
                headers: {
                    accept: "*/*",
                    "content-type": "application/xml",
                    username: username,
                    password: password,
                },
            });
            

            // email.send({
            //     author: -5,
            //     recipients: ["macarena.l@suitedb.com"],
            //     subject: "requestBody",
            //     body: requestBody,
            // });

            var responseCode = response.code;
            var responseBody = response.body;

            log.audit("Response: ", { responseBody, responseCode });

            if (responseCode == 200 && !responseBody.includes('error')) {
                return true;
            }
            else {
                return responseBody;
            }
        }
        catch (error) {
            log.error("Error in sendOrders", error.toString());
        }
    }

    function handleErrorAndSendNotification(e, stage) {
        var author = -5;
        var recipients = "mustafa@accrete.com";
        var subject =
            "Map/Reduce script " +
            runtime.getCurrentScript().id +
            " failed for stage: " +
            stage;
        var body =
            "An error occurred with the following information:\n" +
            "Error code: " +
            e.name +
            "\n" +
            "Error msg: " +
            e.message;

        email.send({
            author: author,
            recipients: recipients,
            subject: subject,
            body: body,
        });
    }

    function handleErrorIfAny(summary) {
        var inputSummary = summary.inputSummary;
        var mapSummary = summary.mapSummary;
        var reduceSummary = summary.reduceSummary;
        if (inputSummary.error) {
            var e = error.create({
                name: "INPUT_STAGE_FAILED",
                message: inputSummary.error,
            });
            handleErrorAndSendNotification(e, "getInputData");
        }
        handleErrorInStage("map", mapSummary);
        handleErrorInStage("reduce", reduceSummary);
    }

    function handleErrorInStage(stage, summary) {
        var errorMsg = [];
        summary.errors.iterator().each(function (key, value) {
            var msg =
                "Map/Reduce Failure: " +
                key +
                ". Error was: " +
                JSON.parse(value).message +
                "\n";
            errorMsg.push(msg);
            return true;
        });
        if (errorMsg.length > 0) {
            var e = error.create({
                name: "MAP_REDUCE_FAILED",
                message: JSON.stringify(errorMsg),
            });
            handleErrorAndSendNotification(e, stage);
        }
    }

    function createSummaryRecord(summary) {
        try {
            var seconds = summary.seconds;
            var usage = summary.usage;
            var yields = summary.yields;
            log.audit("Summary: ", { seconds, usage, yields, concurrency: summary.concurrency });
        } catch (e) {
            handleErrorAndSendNotification(e, "summarize");
        }
    }

    function isEmpty(stValue) {
        if (stValue == "" || stValue == null || stValue == undefined) {
            return true;
        } else {
            if (stValue instanceof String) {
                if (stValue == "") {
                    return true;
                }
            } else if (stValue instanceof Array) {
                if (stValue.length == 0) {
                    return true;
                }
            }
            return false;
        }
    }

    return {
        getInputData: getInputData,
        map: map,
        reduce: reduce,
        summarize: summarize,
    };
});


