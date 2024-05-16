/**
 *@NApiVersion 2.1
 *@NScriptType ScheduledScript
 */

const REGION_ENTITY_KEY = 101;
const ORDER_ENTITY_KEY = 202;

define(["N/search", "N/runtime", "N/https", "N/email", "N/record", "N/file"], function (search, runtime, https, email, record, file) {
    function execute(context) {
        try {
            var errorTitle = "Error in Omnitracs Daily Order Export";
            var scriptObj = runtime.getCurrentScript();
            var orderExportSearchId = scriptObj.getParameter({
                name: "custscript_acc_odoi_order_search",
            });
            var loginURL = scriptObj.getParameter({
                name: "custscript_acc_odoi_login_url",
            });
            var orderURL = scriptObj.getParameter({
                name: "custscript_acc_odoi_order_url",
            });
            var username = scriptObj.getParameter({
                name: "custscript_acc_odoi_username",
            });
            var password = scriptObj.getParameter({
                name: "custscript_acc_odoi_password",
            });
            var locationIdentifier = scriptObj.getParameter({
                name: "custscript_acc_odoi_location_identifier",
            });
            createTotalOrdersSentFile();
            if (
                isEmpty(orderExportSearchId) ||
                isEmpty(loginURL) ||
                isEmpty(orderURL) ||
                isEmpty(username) ||
                isEmpty(password) ||
                isEmpty(locationIdentifier)
            ) {
                log.error(errorTitle, "Script Parameters are missing.");

                createTotalOrdersSentFile();
                return;
            }
          log.debug("params", "login: " +loginURL+", order: " +orderURL+", username: " +username+", password: "+password)
                
          
            var token =getToken(loginURL, username, password);
            log.debug("token: ", token)
            if (isEmpty(token)) {
                createTotalOrdersSentFile();

                log.error(errorTitle, "Token Retrieved is blank.");
                return;
            }
            var ordersObj = getOrders(orderExportSearchId);
            if (isEmpty(ordersObj)) {
                // Save qty files received
                createTotalOrdersSentFile();

                log.debug("Creating file", ordersSentFile.save());

                log.debug(
                    errorTitle,
                    "No orders retrived using the saved search provided."
                );

                createTotalOrdersSentFile();

                return;
            }
            var requestBody = JSON.stringify(
                populateRequestBody(ordersObj, locationIdentifier)
            );
            log.debug("requestBody", requestBody);
            email.send({
                author: -5,
                recipients: "felipe.v@suitedb.com",
                subject: 'Roadnet Orders JSON',
                body: requestBody
            });

            var resultOrders = sendOrders(requestBody, token, orderURL);
            log.debug("🚀 ~ file: ACC_SS_OmnitracsDailyOrders.js:87 ~ resultOrders:", resultOrders)

            createTotalOrdersSentFile(resultOrders.totalOrdersSent, JSON.parse(requestBody).items.length, resultOrders.totalErrorOrders);

        } catch (error) {
            log.error("Error in Main", error.toString());
        }
    }

    function sendOrders(requestBody, token, orderURL) {
        try {
            var totalsResult = sendItemsInBatches(requestBody, 200, token, orderURL);

            return totalsResult;

        } catch (error) {
            log.error("Error in sendOrders", error.toString());
        }
    }

    function populateRequestBody(ordersObj, locationIdentifier) {
        try {
            var sessionDate = getNextBusinessDay();
            log.debug('sessionDate', sessionDate);
            var requestObj = { items: [] };
            for (var i = 0; i < ordersObj.length; i++) {
                var identifier = ordersObj[i].locationId.toString();
                // log.debug("identifier before ", identifier);
                // log.debug("identifier after ", identifier.padStart(10, "0"));

                var lineOrderObj = {
                    identity: { identifier: ordersObj[i].documentNumber.toString() },
                    regionIdentity: { identifier: "ACME", entityKey: REGION_ENTITY_KEY },
                    sessionIdentity: {
                        date: sessionDate.toString(),
                        description: locationIdentifier.toString(),
                    },
                    beginDate: sessionDate.toString(),
                    orderClassIdentity: {
                        identifier: "DELIVERY",
                        entityKey: ORDER_ENTITY_KEY,
                    },
                    tasks: [
                        {
                            taskType: "Delivery",
                            quantities: [
                                parseInt(ordersObj[i].totalCount)  || 0,
                                parseInt(ordersObj[i].totalCube)   || 0,
                                parseInt(ordersObj[i].totalWeight) || 0,
                            ],
                            locationIdentity: {
                                identifier: identifier.padStart(10, "0"),
                            },
                        },
                    ],
                };
                requestObj.items.push(lineOrderObj);
            }
            return requestObj;
        } catch (error) {
            log.error("Error in populateRequestBody", error.toString());
        }
    }

    // Function to send the items
    function sendItems(requestBody, orderURL, token) {
        let totalOrdersSent = 0;
        let totalErrorsOrders = 0;

        // Get case number
        var caseNumber = search.lookupFields({
            type: 'customrecord_sdb_order_counter_cases',
            id: '1',
            columns: ["custrecord_sdb_case_number_roadnet"]
        })?.custrecord_sdb_case_number_roadnet;

        log.debug('orderURL', orderURL);
        var response = https.post({
            url: orderURL,
            body: JSON.stringify(requestBody),
            headers: {
                accept: "*/*",
                "content-type": "application/json",
                authorization: "Bearer " + token,
            },
        });
        var responseCode = response.code;


        log.debug("ordersToSend: ", requestBody.items.length);

        log.debug("responseCode", responseCode);

        if (responseCode != 201) return { totalOrdersSent: 0, errorOrders: 0 };

        var responseBody = response.body;

        email.send({
            author: -5,
            recipients: "bernabee.g@suitedb.com",
            subject: 'Roadnet body orders',
            body: responseBody
        });

        var myResponse = JSON.parse(responseBody);

        totalOrdersSent = myResponse.results.length;
        //Search Transaction ID Order
        const ordersByIdentifier = searchOrdersByIdentifier(myResponse.results);
        log.debug('ordersByIdentifier', ordersByIdentifier);
        for (var i = 0; i < myResponse.results.length; i++) {
            var currentResult = myResponse.results[i];

            if (currentResult.error) {
                totalErrorsOrders++;


                try {
                    var rec = record.create({
                        type: "customrecord_sdb_road_net_orders"
                    })
                    // Set error message
                    rec.setValue("custrecord_sdb_error", currentResult.error.message || "");

                    // Set error identifier
                    rec.setValue("custrecord_sdb_identifier", currentResult.identity.identifier || "");

                    // Set error code
                    rec.setValue("custrecord_sdb_error_code", currentResult.error.errorCode || "");

                    // Set Date order sent
                    rec.setValue("custrecord_sdb_date_order_sent", new Date());

                    // Set case number
                    rec.setValue("custrecord_sdb_case_number_for_roadnet", Number(caseNumber));

                    rec.setValue("custrecord_sdb_reference_id_order", ordersByIdentifier?.[currentResult.identity.identifier].idOrd);
                    rec.save();

                } catch (error) {
                    log.debug('error en creacion de records', error)
                }
            }

        }

        log.debug("Error orders after sending 200: ", totalErrorsOrders);

        return { totalOrdersSent: totalOrdersSent, errorOrders: totalErrorsOrders };
    }

    // Function to split and send items in batches
    function sendItemsInBatches(array, batchSize, token, orderURL) {
        let totalItems = JSON.parse(array).items.length;

        createTotalOrdersSentFile(0, totalItems, 0);

        let startIndex = 0;
        let totalOrdersSentResult = 0;
        let totalErrorOrdersResult = 0;
        let iterator = 0;
        // Loop until all items are sent
        while (startIndex < totalItems || iterator > 30) {
            iterator++;
            // Calculate the end index for the current batch
            const endIndex = Math.min(startIndex + batchSize, totalItems);

            // Get the items for the current batch
            const batchItems = JSON.parse(array).items.slice(startIndex, endIndex);

            // Send the items in the current batch
            const { totalOrdersSent, errorOrders } = sendItems({ items: batchItems, stopNumber: 605 }, orderURL, token);
            totalOrdersSentResult += Number(totalOrdersSent);
            totalErrorOrdersResult += Number(errorOrders);

            log.debug("total orders sent", totalOrdersSent);

            // Update the start index for the next batch
            startIndex += batchSize;

            createTotalOrdersSentFile(totalOrdersSentResult, totalItems, totalErrorOrdersResult);
        }

        log.debug("totalOrdersSent", totalOrdersSentResult);
        log.debug("totalErrorOrders", totalErrorOrdersResult);

        return { totalOrdersSent: totalOrdersSentResult, totalErrorOrders: totalErrorOrdersResult };
    }
    // Function axuliar searchs orders ids 
    function searchOrdersByIdentifier(orders) {
        let myIds = [];
        let groups = {};
        log.debug('searchOrdersByIdentifier orders ', orders);
        orders.forEach(elem => {
            if (!groups[elem.identity.identifier]) {
                groups[elem.identity.identifier] = {};//Esto esta mal pporque no existe nada en groups[elem]

            }
            if (elem.error) {
                myIds.push(elem.identity.identifier);
            }
        })
        if(myIds.length == 0) return groups;
        myIds = JSON.stringify(myIds).replaceAll('"', "'").replace('[', '').replace(']', '');
        var criteria = "formulatext: CASE WHEN {number} IN (" + myIds + ") THEN 'YES' ELSE 'NO' END";
        log.debug('criteria', criteria);
        var salesorderSearchObj = search.create({
            type: "salesorder",
            filters:
                [
                    ["mainline", "is", "T"],
                    "AND",
                    ["type", "anyof", "SalesOrd"],
                    "AND",
                    [criteria, "is", "YES"]
                ],
            columns:
                [
                    search.createColumn({ name: "internalid", label: "Internal ID" }),
                    search.createColumn({ name: "tranid", label: "Document Number" })
                ]
        });
        var searchResultCount = salesorderSearchObj.runPaged().count;
        log.debug("salesorderSearchObj result count", searchResultCount);
        salesorderSearchObj.run().each(function (result) {
            let idOrder = result.id;
            let tranid = result.getValue('tranid');
            groups[tranid].idOrd = idOrder
            return true;
        });
        return groups
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
            log.debug("response: ", response.body)
            var responseCode = response.code;
            var responseBody = response.body;
            if (responseCode == 200) {
                return JSON.parse(responseBody).token;
            }
        } catch (error) {
            log.error("Error in getToken", error.toString());
        }
    }

    function getOrders(orderExportSearchId) {
        try {
            var orderExportSearch = search.load({
                id: orderExportSearchId,
            });
            var ordersArr = [];
            try {
                var pagedData = orderExportSearch.runPaged({
                    pageSize: 1000,
                });
                for (var i = 0; i * 1000 < pagedData.count; i++) {
                    pagedData
                        .fetch({
                            index: i,
                        })
                        .data.forEach(function (result) {
                            var documentNumber = result.getValue({
                                name: "tranid",
                                summary: "GROUP",
                            });
                            var totalWeight = result.getValue(orderExportSearch.columns[2]);
                            var totalCube = result.getValue(orderExportSearch.columns[3]);
                            var totalCount = result.getValue(orderExportSearch.columns[4]);
                            var locationId = result.getValue({
                                name: "custrecord_acc_omnitracs_location_id",
                                join: "shippingAddress",
                                summary: "GROUP",
                            });
                            var internalId = result.getValue({
                                name: "internalid",
                                summary: "GROUP",
                            });
                            var obj = {
                                documentNumber: documentNumber,
                                internalId: internalId,
                                totalWeight: totalWeight,
                                totalCube: totalCube,
                                totalCount: totalCount,
                                locationId: locationId,
                            };
                            ordersArr.push(obj);
                            return true;
                        });
                }
            } catch (e) {
                log.error("Error in getOrders For Loop", e.toString());
            }
            log.debug("ordersArr", ordersArr);
            return ordersArr;
        } catch (errors) {
            log.error("Error in getOrders", error.toString());
        }
    }

    function getSessionDate() {
        try {
            var currentDate = new Date(new Date().getTime() + 24 * 60 * 60 * 1000);
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
    function isBusinessDay(date) {
        // Verifica si el día de la semana es de lunes (1) a viernes (5)
        return date.getDay() >= 1 && date.getDay() < 5;
    }

    function getNextBusinessDay() {
        try {
            var currentDate = new Date();

            // console.log(currentDate)
            // Itera hasta encontrar el próximo día laborable
            if (!isBusinessDay(currentDate)) {
                while (!isBusinessDay(currentDate)) {
                    // Aumenta la fecha en un día
                    currentDate.setDate(currentDate.getDate() + 1);
                }
            } else {
                currentDate.setDate(currentDate.getDate() + 1);
            }
            var day = currentDate.getDate();
            if (day < 10) {
                day = '0' + day;
            }
            var month = currentDate.getMonth() + 1;
            if (month < 10) {
                month = '0' + month;
            }
            var year = currentDate.getFullYear();

            return year + '-' + month + '-' + day;
        } catch (error) {
            log.error('Error in getNextBusinessDay', error.toString());
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

    function createTotalOrdersSentFile(ordersSent = 0, totalOrders = 0, errorOrders = 0) {
        // Save qty files received
        var ordersSentFile = file.create({
            name: "roadnet_orders_sent",
            fileType: file.Type.JSON,
            contents: JSON.stringify({ totalOrders: totalOrders, ordersSent: ordersSent, errorOrders: errorOrders }),
            folder: 3393,//Roadnet folder inside suitescript
        });

        log.debug("Creating file", ordersSentFile.save());
    }

    return {
        execute: execute,
    };
});
