/**
 * @NApiVersion 2.1
 * @NScriptType MapReduceScript
 * @NModuleScope SameAccount
 */
const PAGE_SIZE = 100;
define([
    "N/record",
    "N/runtime",
    "N/search",
    "N/log",
    "N/email",
    "N/error",
    "N/https",
    "N/file"
], function (record, runtime, search, log, email, error, https, file) {
    var scriptObj = runtime.getCurrentScript();

    function getInputData(context) {
        const idFolder = 3393;
        const fileName = "roadnet_orders_received";
        try {
            createFile(idFolder, fileName, JSON.stringify({ ordersReceived: 0, errorOrders: 0 }));
            var loginURL = scriptObj.getParameter({
                name: "custscript_acc_odri_login_url",
            });
            var routeURL = scriptObj.getParameter({
                name: "custscript_acc_odri_route_url",
            });
            var username = scriptObj.getParameter({
                name: "custscript_acc_odri_username",
            });
            var password = scriptObj.getParameter({
                name: "custscript_acc_odri_password",
            });
            if (
                isEmpty(loginURL) ||
                isEmpty(routeURL) ||
                isEmpty(username) ||
                isEmpty(password)
            ) {
                log.error("Error in getInputData", "Script Parameters are missing.");
                return;
            }
            var token = getToken(loginURL, username, password);
            log.debug('token',token)
            var routeInformationArr = [];
            var hasMore = true;
            var pageIndex = 0;
            let i = 0;
            while (hasMore && i <= 500) {
                var routeInformation = getRoutesList(
                    token,
                    routeURL,
                    PAGE_SIZE,
                    pageIndex
                );
                if (isEmpty(routeInformation)) {
                    hasMore = false;
                } else {
                    routeInformationArr = routeInformationArr.concat(routeInformation);
                    const content = JSON.stringify({ ordersReceived: routeInformationArr?.length || 0, errorOrders: 0 });
                    var fileId = createFile(idFolder, fileName, content);
                    pageIndex = pageIndex + 1;
                }
                i++;
            }
            // Function increment 1 record
         //   let numberCase = numerationCasesOrders();
            // optimization, multiple orders and we match orders
            if (routeInformationArr.length > 0) {
                var arrayOrdersId = getOrderIds(routeInformationArr)
                let orderObj = getNSDocumentId(arrayOrdersId);
                for (let i = 0; i < routeInformationArr.length; i++) {
                    if (orderObj[routeInformationArr[i].orderId]) {
                        if(orderObj[routeInformationArr[i].orderId]["stop"] != routeInformationArr[i].stop 
                           && orderObj[routeInformationArr[i].orderId]["routeNo"] != routeInformationArr[i].routeNo){
                          routeInformationArr[i].type = orderObj[routeInformationArr[i].orderId].type;
                          routeInformationArr[i].internalId = orderObj[routeInformationArr[i].orderId].internalId;
                       //   routeInformationArr[i].case = numberCase;
                          routeInformationArr[i].dateOfTheRoute = routeInformationArr[i].routeStartTime 
                        }
                        
                    }
                }
                return routeInformationArr;
            }

        } catch (e) {
            log.error("Error - getInputData", e.message);
        }
    }

    function reduce(context) {
        try {
            var summaryParse = JSON.parse(context.values[0]);
            var typeMapping = {
                SalesOrd: record.Type.SALES_ORDER,
                RtnAuth: record.Type.RETURN_AUTHORIZATION,
            };

            var orderId = summaryParse.orderId;
            var routeNo = summaryParse.routeNo;
            var stopNo = summaryParse.stop;
            var internalId = summaryParse.internalId;
            var type = summaryParse.type;
            var numCounter = summaryParse.case;
            var dateOfTheRoute = new Date(summaryParse.routeStartTime);

            log.debug('summaryParse', summaryParse)
          
            if (!type) {
                type = orderId.indexOf("SO") < 0 ? 'RtnAuth' : 'SalesOrd';
            } 

            if (!isEmpty(summaryParse)) {
                // record.submitFields.promise({
                //     type: string*,
                //     id: number | string*,
                //     values: Object*,
                //     options: {
                //         enablesourcing: boolean,
                    
                // }).then(function(response){
                // // DO SOMETHING WITH RESPONSE HERE
                // }, function(error){
                // // DO SOMETHING WITH ERROR HERE
                // });
                record.submitFields({
                    type: typeMapping[type],
                    id: internalId,
                    values: {
                        "custbody_aps_stop": stopNo,
                        "custbody_acc_odoi_route_no": routeNo,
                        "custbody_sdb_case_number_recib": numCounter,
                        "startdate": dateOfTheRoute
                    },
                  options: {
                    ignoreMandatoryFields: true,
                    enablesourcing: true
                  }
                });
                log.debug("Record updated with ID", internalId);

            }
            else {
                const orderError = error.create({
                    name: 'ORDER_PROCESSING_ERROR',
                    message: 'Roeadnet Order Processing Error',
                    notifyOff: false
                });
                throw orderError;
            }
        } catch (err) {
            log.debug('error en el reduce', err)
        }

    }

    function summarize(summary) {
        try {
            const reduceErrors = summary.reduceSummary.errors;
            log.debug('reduceErrors', reduceErrors)
    
            let array = [];
            const idFolder = 3393;
            const fileName = "roadnet_orders_received";
            const fileId = getFileId(idFolder, fileName);
    
            reduceErrors.iterator().each(function (key, value) {
                array.push(value);
                return true;
            });
    
            addErrorsToFile(fileId, idFolder, fileName, Number(array.length))
    
            handleErrorIfAny(summary);
            createSummaryRecord(summary);
        }catch(error) {
            log.debug('error en el summarize',error)
        }

        
    }

    function getNSDocumentId(ordersId) {
        try {
            var textFiter = "formulatext: CASE WHEN {number} IN (" + ordersId + ") THEN 'yes' else 'no' end";
            var filterForula = [textFiter, "is", "yes"];
            var documentSearchResult = search.create({
                type: "transaction",
                filters: [
                    filterForula,
                    "AND",
                    ["mainline", "is", "T"],
                ],
                columns: [
                    search.createColumn({ name: "internalid" }),
                    search.createColumn({ name: "type" }),
                    search.createColumn({ name: "tranid" }),
                    search.createColumn({ name: "custbody_aps_stop" }),
                    search.createColumn({ name: "custbody_acc_odoi_route_no" })
                ],
            });

            var results = {};
            // aca hay que agregar lo de future date.
            log.debug('documentSearchResult.run()', documentSearchResult.runPaged().count)
            documentSearchResult.run().each(function (result) {
                var internalId = result.getValue({ name: "internalid" });
                var type = result.getValue({ name: "type" });
                var orderId = result.getValue({ name: "tranid" });
                var stop = result.getValue({ name: "custbody_aps_stop" });
                var routeNo = result.getValue({ name: "custbody_acc_odoi_route_no" });
                if (!results[orderId]) {
                    result[orderId] = {};
                    result[orderId].type = type;
                    result[orderId].internalId = internalId;
                    result[orderId].stop = stop;
                    result[orderId].routeNo = routeNo;
                }
                results[orderId] = result[orderId];
                return true;
            });
            log.debug('results', results);
            return results;
        } catch (error) {
            log.error("Error in getNSDocumentId", error.toString());
        }
    }

    function getRoutesList(token, routeURL, pageSize, pageIndex) {
        try {
            var headerObj = {
                name: "Accept-Language",
                value: "en-us",
            };

            var routeDate = getSessionDate();
            // var routeDate = '2023-09-08';
            log.debug("routeDate", routeDate);

            var routingURL =
                routeURL +
                "?pageSize=" +
                pageSize +
                "&pageIndex=" +
                pageIndex +
                "&sessionDate=" +
                routeDate +
                "&expand=all";

            log.debug('routingURL',routingURL);
            var response = https.get({
                url: routingURL,
                headers: {
                    accept: "*/*",
                    authorization: "Bearer " + token,
                },
            });

            if (response.code != 200) return;

            // log.debug("response body: ", response.body);
            var body = JSON.parse(response.body);
            log.debug('body', body);
            var routeInformation = getRouteInformation(body);

            return routeInformation;
        } catch (error) {
            log.error("Error in getRoutesList", error.toString());
        }
    }

    function getRouteInformation(body) {
        try {
            var routeInformationArr = [];
            if (!body.hasOwnProperty("items") || body?.items.length == 0) {
                return routeInformationArr;
            }
            var itemsArr = body.items;

            for (var i = 0; i < itemsArr.length; i++) {
                var routeNo = itemsArr[i].identity.identifier;
                var stopsArr = itemsArr[i].stops;
                var stopCount = 1;
                for (var j = 0; j < stopsArr.length; j++) {
                    var stopType = stopsArr[j].stopType;
                    if (stopType != "ServiceableStop") {
                        continue;
                    }
                    if (!stopsArr[j].hasOwnProperty("serviceableStopInfo")) {
                        continue;
                    }
                    var serviceableStopInfo = stopsArr[j].serviceableStopInfo;
                    if (!serviceableStopInfo.hasOwnProperty("orders")) {
                        continue;
                    }
                    var ordersArr = serviceableStopInfo.orders;
                    for (var k = 0; k < ordersArr.length; k++) {
                        if (!ordersArr[k].hasOwnProperty("identity")) {
                            continue;
                        }
                        var orderIdentity = ordersArr[k].identity;
                        if (!orderIdentity.hasOwnProperty("identifier")) {
                            continue;
                        }
                        var orderId = ordersArr[k].identity.identifier;
                        var obj = { orderId: orderId, routeNo: routeNo, stop: stopCount, routeStartTime: itemsArr[k].routeStartTime };

                        routeInformationArr.push(obj);
                    }
                    stopCount = stopCount + 1;
                }
            }
            log.debug('routeInformationArr', routeInformationArr);
            return routeInformationArr;
        } catch (error) {
            log.error("Error in getRouteInformation", error.toString());
        }
    }

    function getToken(loginURL, username, password) {
        try {
            var loginObj = {
                username: username.toString(),
                password: password.toString(),
            };
            var response = https.post({
                url: loginURL,
                body: JSON.stringify(loginObj),
                headers: {
                    accept: "*/*",
                    "content-type": "application/json",
                },
            });
            var responseCode = response.code;
            var responseBody = response.body;
            if (responseCode == 200) {
                return JSON.parse(responseBody).token;
            }
        } catch (error) {
            log.error("Error in getToken", error.toString());
        }
    }

    function handleErrorAndSendNotification(e, stage) {
        log.error("Stage: " + stage + " failed", e);
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
            log.audit(" Usage Consumed", usage);
            log.audit(" Concurrency Number ", summary.concurrency);
            log.audit(" Number of Yields", yields);
            log.audit(" Seconds", seconds);
        } catch (e) {
            handleErrorAndSendNotification(e, "summarize");
        }
    }

    function getSessionDate() {
        try {
            var currentDate = new Date();
            currentDate.setDate(currentDate.getDate() + 1);
            if (currentDate.getDay() == 0) currentDate.setDate(currentDate.getDate() + 1);
            else if (currentDate.getDay() == 6) currentDate.setDate(currentDate.getDate() + 2);
            var day = currentDate.getDate();
            if (day < 10) {
                day = "0" + day;
            }
            var month = currentDate.getMonth() + 1;
            if (month < 10) {
                month = "0" + month;
            }
            var year = currentDate.getFullYear();
            if (year < 10) {
                year = "0" + year;
            }
            return year + "-" + month + "-" + day;
        } catch (error) {
            log.error("Error in getSessionDate", error.toString());
        }
    }

    function isEmpty(stValue) {
        log.audit('stValue', stValue);
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

    function createFile(idFolder, name, content) {
        const ordersReceiveFile = file.create({
            name: name,
            fileType: file.Type.JSON,
            contents: content,
            folder: idFolder,//Roadnet folder inside suitescript
        });
        const fileId = ordersReceiveFile.save();
        return fileId;
    }

    function getFileId(idFolder, name) {

        const searchObj = search.create({
            type: "file",
            filters: [
                ["name", "haskeywords", name],
                "AND",
                ["folder", "anyof", idFolder]
            ]
        });

        const result = searchObj.run().getRange({
            start: 0,
            end: 1,
        });

        return result[0].id;
    }

    function addErrorsToFile(fileId, idFolder, fileName, errors) {
        const fileLoaded = file.load(fileId);
        const content = JSON.parse(fileLoaded.getContents());
        if (Number(content.ordersReceived) > 0) content.ordersReceived = Number(content.ordersReceived) - errors;
        content.errorOrders = Number(content.errorOrders) + errors;
        log.audit('content when remove', content);
        const newFileId = createFile(idFolder, fileName, JSON.stringify(content));
    }
    function numerationCasesOrders() {
        // get number
        let numCounter = search.lookupFields({
            type: 'customrecord_sdb_order_counter_cases',
            id: '1',
            columns: 'custrecord_sdb_counter_received'
        });
        log.audit('numCounter', numCounter);
        //  Counter plus 1 for set at record, incremtental number
        numCounter = Number(numCounter.custrecord_sdb_counter_received) + 1;
        record.submitFields({
            type: 'customrecord_sdb_order_counter_cases',
            id: '1',
            values: {
                'custrecord_sdb_counter_received': numCounter
            },
        });
        return numCounter;
    }
    function getOrderIds(data) {
        const orderIds = [];

        for (const item of data) {
            orderIds.push(item.orderId);
        }

        return orderIds.map(item => `'${item}'`).join(', ');
    }
    return {
        getInputData: getInputData,
        reduce: reduce,
        summarize: summarize,
    };
});
