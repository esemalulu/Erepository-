/**
 * @NApiVersion 2.1
 * @NScriptType MapReduceScript
 * @NModuleScope SameAccount
 */
/*******************************************************************************
 *
 * Name: Coupa-VendorPayment-MapReduce.js
 *
 * Script Type: Map/Reduce
 *
 * Description: Map/Reduce script for Integrating Vendor Payments from NetSuite to Coupa
 *
 * Script Id: customscript_coupa_invoice_payment_mr
 *
 * Deployment Id: customdeploy_coupa_pay_adhoc_mr
 ********************************************************************************/
define(['N/record', 'N/https', 'N/search', 'N/currency', 'N/runtime', 'N/email', 'N/config', "N/format","./Coupa - OpenIDConnect 2.0"],

    function (record, https, search, currencyMod, runtime, email, config, format, oidc) {


        /**
         * Marks the beginning of the Map/Reduce process and generates input data.
         *
         * @typedef {Object} ObjectRef
         * @property {number} id - Internal ID of the record instance
         * @property {string} type - Record type id
         *
         * @return {Array|Object|Search|RecordRef} inputSummary
         * @since 2015.1
         */
        function getInputData() {
            var transactionsToBeProcessed = [];
            try {
                var configuration = loadConfiguration();
                /*log.debug({           // uncomment to log the configuration object for debugging
                    title: 'Configuration Details: ',
                    details: JSON.stringify(configuration)
                });*/
                if (isValidEnvironment(configuration)) {
                    transactionsToBeProcessed = getPaymentsToBeProcessed(configuration);
                    log.audit({
                        title: 'Total documents to be processed: ' + transactionsToBeProcessed.length,
                        details: transactionsToBeProcessed
                    });
                } else {
                    log.audit({
                        title: 'NOTICE: ',
                        details: 'Error - script is running in non prod environment'
                    });
                }
            } catch (e) {
                if (typeof e == 'object' && e.message.indexOf("Error - script is running ") > -1) {
                    throw e;
                } else {
                    log.debug({
                        title: 'Error in getInputData()',
                        details: JSON.stringify(e)
                    });
                    log.error({
                        title: 'Error in getInputData()',
                        details: e.message
                    });
                }
            }
            return transactionsToBeProcessed;
        }

        /**
         * Defines the function that is executed when the map entry point is triggered. This entry point is triggered automatically
         * when the associated getInputData stage is complete. This function is applied to each key-value pair in the provided
         * context.
         * @param {Object} mapContext - Data collection containing the key-value pairs to process in the map stage. This parameter
         *     is provided automatically based on the results of the getInputData stage.
         * @param {Iterator} mapContext.errors - Serialized errors that were thrown during previous attempts to execute the map
         *     function on the current key-value pair
         * @param {number} mapContext.executionNo - Number of times the map function has been executed on the current key-value
         *     pair
         * @param {boolean} mapContext.isRestarted - Indicates whether the current invocation of this function is the first
         *     invocation (if true, the current invocation is not the first invocation and this function has been restarted)
         * @param {string} mapContext.key - Key to be processed during the map stage
         * @param {string} mapContext.value - Value to be processed during the map stage
         * @since 2015.2
         */

        const map = (mapContext) => {
            var scriptRef = runtime.getCurrentScript();
            log.debug({
                title: "Map Stage remaining governance units @ start: ",
                details: scriptRef.getRemainingUsage()
            });
            var configuration = loadConfiguration();
            let paymentAcknowledgement = "";
            var transactionObject = JSON.parse(mapContext.value);
            transactionObject = transactionObject[Object.keys(transactionObject)];
            log.audit({
                title: 'Processing Bill Payment: ',
                details: JSON.stringify(transactionObject)
            });
            try {
                if (transactionObject.status === 'voided') {
                    paymentAcknowledgement = postVoidedPaymentToCoupa(transactionObject, configuration);
                } else {
                    paymentAcknowledgement = postPaymentToCoupa(transactionObject, configuration);
                }
            } catch (error) {
                var errordetails;
                if (error && error.type === "error.SuiteScriptError") {
                    var errorcode = error.name;
                    switch (errorcode) {
                        case "SSS_REQUEST_TIME_EXCEEDED":
                            errordetails = "Connection closed because it has exceed the time out period (NetSuite has not received a response after 5 seconds on initial connection or after 45 seconds on the request).";
                            break;
                        case "SSS_CONNECTION_TIME_OUT":
                            errordetails = "Connection closed because it has exceed the time out period (NetSuite has not received a response after 5 seconds on initial connection or after 45 seconds on the request).";
                            break;
                        case "SSS_CONNECTION_CLOSED":
                            errordetails = "Connection closed because it was unresponsive.";
                            break;
                        case "SSS_INVALID_URL":
                            errordetails = "Connection closed because of an invalid URL.  The URL must be a fully qualified HTTP or HTTPS URL if it is referencing a non-NetSuite resource.  The URL cannot contain white space.";
                            break;
                        case "SSS_TIME_LIMIT_EXCEEDED":
                            errordetails = "NetSuite Suitescript execution time limit of 180 seconds exceeded. Exiting script.";
                            break;
                        case "SSS_USAGE_LIMIT_EXCEEDED":
                            errordetails = "NetSuite Map Reduce Suitescript usage limit exceeded. Exiting script.";
                            break;
                        default:
                            errordetails = error.message;
                    }
                    log.error({
                        title: 'Error in Reduce Stage-1',
                        details: errorcode + ': ' + errordetails
                    });
                    log.debug({
                        title: 'Error Details: ',
                        details: JSON.stringify(error)
                    });
                    throw "Payment ID:" + transactionObject.id + "\n\nError Code: " + errorcode + "Error Details: " + error.toString()
                } else {
                    log.error({
                        title: 'Error in Reduce Stage-2',
                        details: error.toString()
                    });
                    log.debug({
                        title: 'Error in Reduce Stage-2',
                        details: JSON.stringify(error)
                    });
                    throw "Payment ID:" + transactionObject.id + "\n\nError Details: " + error.toString()
                }
            }
            var scriptRef = runtime.getCurrentScript();
            log.debug({
                title: "Map Stage remaining governance units @ end: ",
                details: scriptRef.getRemainingUsage()
            });

            if (transactionObject.status === 'voided') {
                var ack = {};
                ack.flag = paymentAcknowledgement;
                ack.status = 'voided';
                ack.paymentMap = transactionObject.paymentMap;
                mapContext.write({
                    key: transactionObject.id,
                    value: ack
                });
            } else if (paymentAcknowledgement && paymentAcknowledgement.length == 1) {
                log.debug({
                    title: 'write ' + transactionObject.id,
                    details: paymentAcknowledgement[0]
                });
                mapContext.write({
                    key: transactionObject.id,
                    value: paymentAcknowledgement[0]
                });
            } else if (paymentAcknowledgement && paymentAcknowledgement.length > 1) {
                log.debug({
                    title: 'write ' + transactionObject.id,
                    details: paymentAcknowledgement
                });
                mapContext.write({
                    key: transactionObject.id,
                    value: paymentAcknowledgement
                });
            }
        }


        /**
         * Executes when the reduce entry point is triggered and applies to each group.
         *
         * @param {ReduceSummary} context - Data collection containing the groups to process through the reduce stage
         * @since 2015.1
         */
        function reduce(context) {
            try {
                var scriptRef = runtime.getCurrentScript();
                log.debug({
                    title: "Reduce Stage remaining governance units @ start: ",
                    details: scriptRef.getRemainingUsage()
                });
                log.audit({
                    title: 'Vendor Bill Payment ID: ' + context.key,
                    details: context.values
                });
                var configuration = loadConfiguration();
                log.debug({
                    title: 'JSON.parse(context.values[0]): ',
                    details: JSON.parse(context.values[0])
                });
                if (context.values && JSON.parse(context.values[0]).status == "voided") {
                    var paymentMap = getVoidedPaymentsLines(context.key, configuration);
                    var creditsAvailable = 0;
                    var flag = true;
                    log.debug({
                        title: 'paymentMap: ',
                        details: paymentMap.length
                    });
                    /*var contextValue = JSON.parse(context.values[0]);
                    for (let j in contextValue.paymentMap) {
                        var paymentObj = {};
                        if (contextValue.paymentMap[j].billCreditId) {
                            ++creditsAvailable;
                        }
                    }*/
                    log.debug({
                        title: 'paymentJSON: ',
                        details: context.values.length
                    });
                    if (paymentMap && context.values && paymentMap.length == context.values.length ) {
                        record.submitFields({
                            type: record.Type.VENDOR_PAYMENT,
                            id: context.key,
                            values: {
                                'externalid': "Processed" + context.key + "voided"
                            }
                        });
                        log.audit({
                            title: 'Vendor Bill Payment with ID: ' + context.key + ' voided successfully',
                            details: 'vendorpayment:' + context.key
                        });
                    }
                } else {
                    var creditsAvailable = 0;
                    var paymentJSON = [];
                    for (let i in context.values) {
                        var contextValue = JSON.parse(context.values[i]);
                        if (!contextValue[0]) {
                            var paymentObj = {};
                            paymentObj.invoiceId = contextValue.invoiceId;
                            paymentObj.amount = contextValue.amount;
                            paymentObj.discountAmount = contextValue.discountAmount;
                            paymentObj.notes = contextValue.notes;
                            paymentObj.date = contextValue.date;
                            paymentJSON.push(paymentObj);
                        } else {
                            for (let j in contextValue) {
                                var paymentObj = {};
                                if (contextValue[j].billCreditId) {
                                    ++creditsAvailable;
                                    paymentObj.billCreditId = contextValue[j].billCreditId;
                                    paymentObj.vendorBillId = contextValue[j].vendorBillId;
                                } else {
                                    paymentObj.invoiceId = contextValue[j].invoiceId;
                                }
                                paymentObj.amount = contextValue[j].amount;
                                paymentObj.discountAmount = contextValue[j].discountAmount;
                                paymentObj.notes = contextValue[j].notes;
                                paymentObj.date = contextValue[j].date;
                                paymentJSON.push(paymentObj);
                            }
                        }
                    }
                    log.debug({
                        title: 'paymentJSON: ',
                        details: paymentJSON
                    });
                    let paymentLines = getSuccessPaymentsLines(configuration, context.key);
                    log.debug({
                        title: 'paymentLines: ',
                        details: paymentLines && paymentLines.length
                    });
                    log.debug({
                        title: 'paymentJSON: ',
                        details: paymentJSON && paymentJSON.length
                    });
                    if (paymentLines && paymentJSON && (paymentLines.length + creditsAvailable) == paymentJSON.length) {
                        record.submitFields({
                            type: record.Type.VENDOR_PAYMENT,
                            id: context.key,
                            values: {
                                'custbody_coupa_payment_map': JSON.stringify(paymentJSON),
                                'externalid': "Processed" + context.key
                            }
                        });
                        log.audit({
                            title: 'Vendor Bill Payment with ID: ' + context.key + ' posted successfully to Coupa',
                            details: 'vendorpayment:' + context.key
                        });
                    }
                }
                var scriptRef = runtime.getCurrentScript();
                log.debug({
                    title: "Reduce Stage remaining governance units @ end: ",
                    details: scriptRef.getRemainingUsage()
                });
            } catch (e) {
                log.debug({
                    title: 'error',
                    details: e
                });
            }
        }


        /**
         * Executes when the summarize entry point is triggered and applies to the result set.
         *
         * @param {Summary} summary - Holds statistics regarding the execution of a map/reduce script
         * @since 2015.1
         */
        function summarize(summary) {
            log.debug('Summary Time', 'Total Seconds: ' + summary.seconds);
            log.debug('Summary Usage', 'Total Usage: ' + summary.usage);
            log.debug('Summary Yields', 'Total Yields: ' + summary.yields);
            log.debug('Input Summary: ', JSON.stringify(summary.inputSummary));
            log.debug('Map Summary: ', JSON.stringify(summary.mapSummary));
            log.debug('Reduce Summary: ', JSON.stringify(summary.reduceSummary));
            var scriptName = 'Coupa Invoice & ER Payment 2.0 Integration';
            var contents = '';
            summary.mapSummary.errors.iterator().each(function (key, value) {
                contents += "Vendor Bill (ID " + value + ") against CoupaPay Invoice(ID " + key + ") <br><br>";
                return true;
            });
            summary.reduceSummary.errors.iterator().each(function (key, value) {
                contents += "Vendor Bill (ID " + value + ") against CoupaPay Invoice(ID " + key + ") <br><br>";
                return true;
            });
            log.debug('contents: ', JSON.stringify(contents));
            if (contents) {           //If any Errors are reported in Reduce Summary send out an email to the Recipient/s in the script parameter
                sendFailureSummary(summary, scriptName);
            }
            log.audit('——-SCRIPT——-', '——-END——-');
        }

        /**
         * This method validates whether the NetSuite environment and the Coupa URL provided as the script parameter are compatible
         * @method
         * @return {boolean} flag
         * @author Yogesh Jagdale
         * @since 4.1.3
         */
        function isValidEnvironment(configuration) {
            var url_test_contains = ["-train", "-dev", "-dmo", "-demo", "-qa", "-train", "-sandbox", "-sbx", "-stage", "-staging", "-stg", "-support", "-test", "-uat", "coupadev.com", "coupacloud.com"];
            var errorMessage = 'Error - script is running in non prod environment and not using a ' + url_test_contains + ' in the coupa URL. If you believe this to be incorrect, please contact Coupa Support';
            var thisEnv = runtime.envType;
            log.debug({
                title: 'Current NetSuite Environment Type: ',
                details: thisEnv
            });
            if (thisEnv !== 'PRODUCTION') {
                var test_url = false;
                var config = configuration;
                test_url = url_test_contains.filter(function (key) {
                    return config.host.indexOf(key) > -1;
                }).length > 0;
                log.debug({
                    title: 'test_url is',
                    details: test_url
                });
                if (!test_url) {
                    email.send({
                        author: configuration.errorFrom,
                        recipients: configuration.errorTo.toString(),
                        subject: subject,
                        body: errorMessage
                    });
                    log.error({
                        title: 'Error in validateEnvironment: ',
                        details: errorMessage
                    });
                    throw errorMessage;
                }
                return test_url;
            } else {
                return true;
            }
        }

        /**
         * This method returns the configuration object by sourcing all script parameters and can be replaced in future with Configuration Custom Record
         * @method
         * @return {Array|Object|Search|RecordRef} inputSummary
         * @since 4.1.3
         */
        function loadConfiguration() {
            var scriptRef = runtime.getCurrentScript();

            var configuration = {};
            var configRecObj = config.load({
                type: config.Type.COMPANY_INFORMATION
            });
            configuration.errorTo = scriptRef.getParameter('custscript_coupa_pay_email_receiver');             //fieldType: TextArea
            configuration.errorFrom = scriptRef.getParameter('custscript_coupa_pay_email_sender') ? scriptRef.getParameter('custscript_coupa_pay_email_sender') : '-5'; //fieldType: List/Record or Free-Form Text
            configuration.host = scriptRef.getParameter('custscript_coupa_pay_host_url');                                //fieldType: Free-Form Text
            configuration.apiKey = scriptRef.getParameter('custscript_coupa_pay_api_key');                           //fieldType: Free-Form Text
            configuration.exportFromDate = scriptRef.getParameter('custscript_coupa_pay_from_paydate');              //fieldType: Date
            configuration.exportToDate = scriptRef.getParameter('custscript_coupa_pay_to_paydate');                  //fieldType: Date
            if (configuration.exportFromDate) {
                configuration.exportFromDate = format.format({
                    value: configuration.exportFromDate,
                    type: format.Type.DATE
                });              //fieldType: Date
            }
            if (configuration.exportToDate) {
                configuration.exportToDate = format.format({
                    value: configuration.exportToDate,
                    type: format.Type.DATE
                });                  //fieldType: Date
            }
            configuration.accountName = scriptRef.getParameter('custscript_coupa_pay_account_name') ? scriptRef.getParameter('custscript_coupa_pay_account_name') : configRecObj.getValue('companyname');                //fieldType: Free-Form Text
            configuration.isPaymentApprovalFeatureEnabled = scriptRef.getParameter('custscript_coupa_pay_wait_appr');
            configuration.skipPaymentWithoutCheckNumber = scriptRef.getParameter('custscript_coupa_pay_skip_payment'); //fieldType: checkbox
            configuration.getVoidedPayments = scriptRef.getParameter('custscript_coupa_pay_get_void_payments');        //fieldType: checkbox
            configuration.skip404Error = scriptRef.getParameter('custscript_coupa_pay_skip_404_log');        //fieldType: checkbox

            var requestHeader = oidc.getAPIHeader();
            var headers = {};
            if (requestHeader) {
                headers = requestHeader;
            } else {
                headers = {
                    'Accept': 'application/json',
                    'X-COUPA-API-KEY': configuration.apiKey
                };
            }
            configuration.headers = headers;

            configuration.skipClearedFilter = scriptRef.getParameter('custscript_coupa_pay_skip_cleared_filter');        //fieldType: checkbox

            return configuration;
        }


        function getPaymentsToBeProcessed(configuration) {
            var paymentsArray = [];
            var account_types = ["Bank", "CredCard"];
            var column = [
                search.createColumn({name: "status", label: "Status"}),
                search.createColumn({name: "appliedtotransaction", label: "Applied To Transaction"}),
                search.createColumn({name: "appliedtolinkamount", label: "Applied To Link Amount"}),
                search.createColumn({name: "custbody_coupa_payment_map", label: "Coupa Payment Map"})
            ];
            var paymentFilter = [
                ["externalidstring", "doesnotcontain", "Processed"],
                "AND",
                ["mainline", "is", "F"],
                "AND",
                ["appliedtotransaction.externalidstring","contains","coupa"],
                "AND",
                ["externalidstring","isempty",""],
                "AND",
                ["status", "noneof", "VendPymt:V"],
                "AND",
                ["transactiondiscount","is","F"],
                "AND",
                ["appliedtotransaction.externalidstring", "contains", "coupa"]
            ];

            if (!configuration.skipClearedFilter) {
                paymentFilter.push("AND");
                paymentFilter.push(["cleared", "is", false]);
            }

            if (configuration.skipPaymentWithoutCheckNumber) {
                paymentFilter.push("AND");
                paymentFilter.push(["tranid", "isnotempty", ""]);
            }

            if (configuration.isPaymentApprovalFeatureEnabled) {
                paymentFilter.push("AND");
                paymentFilter.push(["status", "anyof", "VendPymt:F"]);
            }

            if (configuration.exportFromDate && configuration.exportToDate) {
                paymentFilter.push("AND");
                paymentFilter.push(["trandate", "within", configuration.exportFromDate, configuration.exportToDate]);
            } else if (configuration.exportFromDate && !configuration.exportToDate) {
                paymentFilter.push("AND");
                paymentFilter.push(["trandate", "onorafter", configuration.exportFromDate]);
            } else if (!configuration.exportFromDate && configuration.exportToDate) {
                paymentFilter.push("AND");
                paymentFilter.push(["trandate", "onorbefore", configuration.exportToDate]);
            } else if (!configuration.exportFromDate && !configuration.exportToDate) {
                paymentFilter.push("AND");
                paymentFilter.push(["trandate", "onorafter", "daysago1"]);
            }

            //Search Payments yet to be processed
            var paymentSearchObj = search.create({
                type: "vendorpayment",
                filters: paymentFilter,
                columns: column
            });
            var searchResultCount = paymentSearchObj.runPaged().count;
            log.debug("Count of payments to be posted: ", searchResultCount);
            paymentSearchObj.run().each(function (result) {
                var transaction = {};
                transaction.id = result.id;
                transaction.recordType = result.recordType;
                transaction.status = result.getValue(column[0]);
                transaction.vendorBillID = result.getValue(column[1]);
                transaction.paymentAmount = parseFloatOrZero(result.getValue(column[2]));
                transaction.paymentMap = isValidJSON(result.getValue(column[3])) ? JSON.parse(result.getValue(column[3])) : [];
                var payment = {};
                payment[result.id]=transaction;
                paymentsArray.push(payment);
                return true;
            });

            if (configuration.getVoidedPayments) {
                //Search voided Payments
                var voidPaymentFilter = [
                    ["externalidstring", "doesnotcontain", "voided"],
                    "AND",
                    ["externalidstring", "doesnotcontain", "notinCoupa"],
                    "AND",
                    ["externalidstring", "doesnotcontain", "CoupaPay"],
                    "AND",
                    ["status", "anyof", "VendPymt:V"],
                    "AND",
                    ["mainline", "is", "F"],
                    "AND",
                    ["appliedtotransaction.externalidstring","contains","coupa"],
                    "AND",
                    ["transactiondiscount","is","F"]
                ];

                if (configuration.skipPaymentWithoutCheckNumber) {
                    voidPaymentFilter.push("AND");
                    voidPaymentFilter.push(["tranid", "isnotempty", ""]);
                }

                if (configuration.exportFromDate && configuration.exportToDate) {
                    voidPaymentFilter.push("AND");
                    voidPaymentFilter.push(["trandate", "within", configuration.exportFromDate, configuration.exportToDate]);
                } else if (configuration.exportFromDate && !configuration.exportToDate) {
                    voidPaymentFilter.push("AND");
                    voidPaymentFilter.push(["trandate", "onorafter", configuration.exportFromDate]);
                } else if (!configuration.exportFromDate && configuration.exportToDate) {
                    voidPaymentFilter.push("AND");
                    voidPaymentFilter.push(["trandate", "onorbefore", configuration.exportToDate]);
                } else if (!configuration.exportFromDate && !configuration.exportToDate) {
                    voidPaymentFilter.push("AND");
                    voidPaymentFilter.push(["trandate", "onorafter", "daysago1"]);
                }

                var voidedPaymentSearchObj = search.create({
                    type: "vendorpayment",
                    filters: voidPaymentFilter,
                    columns: column
                });
                var searchResultCount = voidedPaymentSearchObj.runPaged().count;
                log.debug("Count of voided payments to be posted: ", searchResultCount);
                voidedPaymentSearchObj.run().each(function (result) {
                    var transaction = {};
                    transaction.id = result.id;
                    transaction.recordType = result.recordType;
                    transaction.status = result.getValue(column[0]);
                    transaction.vendorBillID = result.getValue(column[1]);
                    transaction.paymentAmount = parseFloatOrZero(result.getValue(column[2]));
                    transaction.paymentMap = isValidJSON(result.getValue(column[3])) ? JSON.parse(result.getValue(column[3])) : [];
                    var payment = {};
                    payment[result.id]=transaction;
                    paymentsArray.push(payment);
                    //paymentsArray.push(transaction);
                    return true;
                });
            }
            return paymentsArray;
        }

        function postPaymentToCoupa(transactionObject, configuration) {
            var supplier = "", supplierName = "", processedSuccessfully = true, notInCoupa = false,
                containsCoupaInvoice = false;
            if (isCoupaBillPayment(transactionObject.id)) {
                var paymentRecord = record.load({
                    type: record.Type.VENDOR_PAYMENT,
                    id: transactionObject.id
                });
                var account_types = ["Bank", "CredCard"];
                let accountType = search.lookupFields({
                    type: record.Type.ACCOUNT,
                    id: paymentRecord.getValue({
                        fieldId: 'account'
                    }),
                    columns: 'type'
                }).type[0].value;
                log.debug({
                    title: "accountType:",
                    details: accountType
                });
                if (accountType != "Bank" && accountType != "CredCard") {
                    log.audit({
                        title: "Payment Skippped, Invalid account type.",
                        details: transactionObject
                    });
                    return;
                }

                var paymentMap = [];
                var paymentDate = netsuiteDateToCoupaDate(paymentRecord.getValue({
                    fieldId: 'trandate'
                }));
                log.debug({
                    title: 'Bill Payment Date in Coupa\'s date format :',
                    details: paymentDate
                });
                var tranId = paymentRecord.getValue({
                    fieldId: 'tranid'
                });
                log.debug({
                    title: 'Transaction Id / Check Number:',
                    details: tranId
                });

                supplier = paymentRecord.getValue({
                    fieldId: 'entity'
                });
                try {
                    var fieldLookUp = search.lookupFields({
                        type: search.Type.VENDOR,
                        id: supplier,
                        columns: ['companyname']
                    });
                    supplierName = fieldLookUp.companyname;
                } catch (e) {
                    if (e.type === "RCRD_DSNT_EXIST") {
                        var errorMessage = 'Supplier = ' + ' Check# = ' + tranId + ' Record number = ' + paymentRecord.getSublistValue({
                            sublistId: 'apply',
                            fieldId: 'refnum',
                            line: 0
                        }) + ' Payment date = ' + paymentDate;
                        log.error({
                            title: 'Vendor Record Not Found',
                            details: JSON.stringify(e)
                        });
                        errorMessage += '\nError Code = ' + e.code + ' Error Description = ' + e.message
                        errorMessage += '\n\nError Details: ' + JSON.stringify(e);
                        paymentRecord.setFieldValue('externalid', "Processed " + id + " vendorNotFound");
                        var paymentId = paymentRecord.save();
                        sendEmailNotification(errorMessage, paymentId);
                    } else {
                        var errorMessage = 'Supplier = ' + ' Check# = ' + tranId + ' Record number = ' + paymentRecord.getSublistValue({
                            sublistId: 'apply',
                            fieldId: 'refnum',
                            line: 0
                        }) + ' Payment date = ' + paymentDate;
                        log.error({
                            title: 'Error in postPaymentToCoupa()',
                            details: JSON.stringify(e)
                        });
                        errorMessage += '\nError Code = ' + e.code + ' Error Description = ' + e.message
                        errorMessage += '\n\nError Details: ' + JSON.stringify(e);
                        paymentRecord.setFieldValue('externalid', "Processed " + id + " vendorNotFound");
                        var paymentId = paymentRecord.save();
                        sendEmailNotification(errorMessage, paymentId);
                    }
                }

                var baseURL = configuration.host;

                var lineCount = paymentRecord.getLineCount({
                    sublistId: 'apply'
                });
                var i = paymentRecord.findSublistLineWithValue({
                    sublistId: 'apply',
                    fieldId: 'doc',
                    value: transactionObject.vendorBillID
                });
                log.debug({
                    title: 'Count of Bill/ER in Bill Payment',
                    details: lineCount
                });
                var isExpenseReport = false;
                var isapplied = paymentRecord.getSublistValue({
                    sublistId: 'apply',
                    fieldId: 'apply',
                    line: i
                })
                if (!isapplied) {
                    return;
                }
                var appliedToTransaction = paymentRecord.getSublistValue({
                    sublistId: 'apply',
                    fieldId: 'doc',
                    line: i
                });
                var appliedToTransactionType = paymentRecord.getSublistValue({
                    sublistId: 'apply',
                    fieldId: 'type',
                    line: i
                });
                log.debug({
                    title: 'appliedToTransactionType: ',
                    details: appliedToTransactionType
                });
                var fieldLookUp = "";
                if (appliedToTransactionType == 'Expense Report') {
                    fieldLookUp = search.lookupFields({
                        type: search.Type.EXPENSE_REPORT,
                        id: appliedToTransaction,
                        columns: ['externalid']
                    });
                } else {
                    fieldLookUp = search.lookupFields({
                        type: search.Type.VENDOR_BILL,
                        id: appliedToTransaction,
                        columns: ['externalid']
                    });
                }

                if (fieldLookUp.externalid[0] && (fieldLookUp.externalid[0].value.indexOf('ExpenseReport') > -1 || fieldLookUp.externalid[0].value.indexOf('Coupa-expensereport') > -1)) {
                    isExpenseReport = true;
                }
                var appliedAmount = paymentRecord.getSublistValue({
                    sublistId: 'apply',
                    fieldId: 'amount',
                    line: i
                });
                var discountAmount = paymentRecord.getSublistValue({
                    sublistId: 'apply',
                    fieldId: 'disc',
                    line: i
                });
                var appliedDate = paymentRecord.getSublistValue({
                    sublistId: 'apply',
                    fieldId: 'applydate',
                    line: i
                });
                var referenceNumber = paymentRecord.getSublistValue({
                    sublistId: 'apply',
                    fieldId: 'refnum',
                    line: i
                });

                var totalBillAmount = paymentRecord.getSublistValue({
                    sublistId: 'apply',
                    fieldId: 'total',
                    line: i
                });
                // NIB# 384 - Search Credits applied to the invoice
                var applyAmount = parseFloat(appliedAmount);
                var totalBillAmount = parseFloat(totalBillAmount);

                log.debug('Checking Applied amount vs total totalBillAmount ', " Applied Amount: " + applyAmount + " total amount: " + totalBillAmount);
                if (!isExpenseReport && applyAmount < totalBillAmount) {
                    log.debug('Searching for Credits applied to Invoice: ', referenceNumber);
                    let coupaInvID = fieldLookUp.externalid[0] ? fieldLookUp.externalid[0].value.replace("Coupa-VendorBill", "") : '';
                    var creditNotesApplied = searchCreditApplied(appliedToTransaction, transactionObject.id, coupaInvID);
                    paymentMap = paymentMap.concat(creditNotesApplied);
                    log.audit('Credit Notes applied', JSON.stringify(creditNotesApplied));
                    log.debug('Payments Map contents till now: ', JSON.stringify(paymentMap));
                }

                if (fieldLookUp.externalid[0] && fieldLookUp.externalid[0].value.indexOf('Coupa-expensereport') > -1) {
                    referenceNumber = fieldLookUp.externalid[0].value;
                    referenceNumber = referenceNumber.replace('Coupa-expensereport', '')
                }

                var origAmount = paymentRecord.getSublistValue({
                    sublistId: 'apply',
                    fieldId: 'total',
                    line: i
                });

                var coupaInvoiceId = getCoupaInvoiceId(appliedToTransaction, referenceNumber, supplier, "NetSuite Check#" + tranId, appliedAmount, paymentDate, configuration, appliedToTransactionType);
                log.debug({
                    title: 'coupaInvoiceId returned from getCoupaInvoiceId():',
                    details: coupaInvoiceId
                });

                if (coupaInvoiceId === 'INVOICE_PAID') {
                    log.audit({
                        title: 'Invoice already paid',
                        details: 'Invoice Number = ' + referenceNumber + ' supplier Name = ' + supplierName + ' supplier Number = ' + supplier + ' check# = ' + tranId + ' original amount paid = ' + origAmount + ' payment applied= ' + appliedAmount
                    });
                    return;
                } else if (coupaInvoiceId === 'EXPENSE_PAID') {
                    log.audit({
                        title: 'Expense already paid',
                        details: 'Report Number = ' + referenceNumber + ' Employee Name = ' + supplierName + ' Employee Number = ' + supplier + ' check# = ' + tranId + ' original amount paid = ' + origAmount + ' payment applied= ' + appliedAmount
                    });
                    return;
                } else if (coupaInvoiceId === 'INVALID_RESPONSE') {
                    log.audit({
                        title: 'Processing Error with posting payment - Invalid API Response Code',
                        details: 'Invoice Number = ' + referenceNumber + ' supplier Name = ' + supplierName + ' supplier Number = ' + supplier + ' check# = ' + tranId + ' original amount paid = ' + origAmount + ' payment applied= ' + appliedAmount
                    });
                    processedSuccessfully = false;
                    return;
                } else if (coupaInvoiceId === 'INVALID_COUPAID') {
                    if (containsCoupaInvoice) {
                        log.audit({
                            title: 'Processing of Bill Payment: ' + transactionObject.id + ' skipped.',
                            details: 'Invoice Number = ' + referenceNumber + ' supplier Name = ' + supplierName + ' supplier Number = ' + supplier + ' check# = ' + tranId + ' original amount paid = ' + origAmount + ' payment applied= ' + appliedAmount
                        });
                        return;
                    } else {
                        log.audit({
                            title: 'Processing Error with posting payment - could find not Invoice in Coupa',
                            details: 'Invoice Number = ' + referenceNumber + ' supplier Name = ' + supplierName + ' supplier Number = ' + supplier + ' check# = ' + tranId + ' original amount paid = ' + origAmount + ' payment applied= ' + appliedAmount
                        });
                        return;
                    }
                } else if (coupaInvoiceId === 'DUPLICATE_PAYMENT') {
                    log.audit({
                        title: 'DUPLICATE PAYMENT',
                        details: 'Invoice Number = ' + referenceNumber + ' supplier Name = ' + supplierName + ' supplier Number = ' + supplier + ' check# = ' + tranId + ' original amount paid = ' + origAmount + ' payment applied= ' + appliedAmount
                    });
                    log.error({
                        title: 'Processing Error with posting payment - Duplicate Payment',
                        details: 'Invoice Number = ' + referenceNumber + ' supplier Name = ' + supplierName + ' supplier Number = ' + supplier + ' check# = ' + tranId + ' original amount paid = ' + origAmount + ' payment applied= ' + appliedAmount
                    });

                    Message = 'Invoice Payment Integration:Processing Error with posting payment - Duplicate payment' + '\n' +
                        'Invoice Number = ' + referenceNumber + '\n' + ' supplierName = ' + supplierName + '\n' + ' supplierNumber = ' +
                        supplier + '\n' + ' check# = ' + tranId + '\n' + ' original amount paid = ' + origAmount + '\n' + ' payment applied= ' + appliedAmount + '\n\n';

                    return;
                } else {
                    var url = baseURL + '/api/invoices/' + coupaInvoiceId;

                    if (isExpenseReport) {
                        url = baseURL + '/api/expense_reports/' + coupaInvoiceId;
                    }
                    //paymentDate = netsuiteDateToCoupaDate(appliedDate);
                    var postData = "";
                    if (isExpenseReport) {
                        postData = {
                            "payment": {
                                "amount_paid": appliedAmount,
                                "notes": "NetSuite Check#" + tranId,
                                "payment_date": paymentDate
                            }
                        };
                        var paymentObj = {};
                        paymentObj.invoiceId = appliedToTransaction;
                        paymentObj.amount = appliedAmount;
                        paymentObj.discountAmount = discountAmount;
                        paymentObj.notes = "NetSuite Check#" + tranId;
                        paymentObj.date = paymentDate;
                        paymentObj.isPaymentVoided = false;
                        paymentMap.push(paymentObj);
                    } else {
                        if (creditNotesApplied != undefined && creditNotesApplied != null && creditNotesApplied != "" && creditNotesApplied.length > 0) {
                            log.audit({
                                title: 'Generating Payload with Credit Notes',
                                details: 'Credit Notes are attached to the Invoices in the payment'
                            });
                            postData = {};
                            postData.payments = [];
                            let payment = {};
                            payment.amount_paid = appliedAmount;
                            payment.notes = "NetSuite Check#" + tranId;
                            payment.payment_date = paymentDate;
                            postData.payments.push(payment);
                            //Adding Credit Lines Below
                            for (var c in creditNotesApplied) {
                                let payment = {};
                                payment.amount_paid = creditNotesApplied[c].amount;
                                payment.notes = creditNotesApplied[c].notes;
                                payment.payment_date = creditNotesApplied[c].date;
                                postData.payments.push(payment);
                            }
                            if (discountAmount) {
                                let payment = {};
                                payment.amount_paid = parseFloatOrZero(discountAmount);
                                payment.notes = tranId ? "NetSuite Check#" + tranId + ": Discount Applied" : '';
                                payment.payment_date = paymentDate;
                                postData.payments.push(payment);
                            }
                        } else {
                            log.audit({
                                title: 'Generating Payload',
                                details: 'No Credit Notes are attached to the Invoices in the payment'
                            });
                            postData = {};
                            postData.payments = [];
                            let payment = {};
                            payment.amount_paid = appliedAmount;
                            payment.notes = tranId ? "NetSuite Check#" + tranId:'';
                            payment.payment_date = paymentDate;
                            postData.payments.push(payment);
                            if (discountAmount) {
                                let payment = {};
                                payment.amount_paid = parseFloatOrZero(discountAmount);
                                payment.notes = tranId ? "NetSuite Check#" + tranId + ": Discount Applied" : '';
                                payment.payment_date = paymentDate;
                                postData.payments.push(payment);
                            }
                        }
                        var paymentObj = {};
                        paymentObj.invoiceId = appliedToTransaction;
                        paymentObj.amount = appliedAmount;
                        paymentObj.discountAmount = discountAmount;
                        paymentObj.notes = tranId ? "NetSuite Check#" + tranId : '';
                        paymentObj.date = paymentDate;
                        paymentObj.isPaymentVoided = false;
                        paymentMap.push(paymentObj);
                    }
                    log.audit({
                        title: 'Payload to be posted to Coupa: ',
                        details: JSON.stringify(postData)
                    });
                    var response = https.put({
                        url: url,
                        body: JSON.stringify(postData),
                        headers: configuration.headers,
                    });
                    if (response.code != '200') {
                        log.error({
                            title: 'Processing Error with posting payment',
                            details: 'Invoice Number = ' + referenceNumber + ' supplier Name = ' + supplierName + ' supplier Number = ' + supplier + ' check# = ' + tranId + ' original amount paid = ' + origAmount +
                                ' payment applied= ' + appliedAmount + ' HTTP Response Code = ' + response.code
                        });
                        log.debug({
                            title: 'Processing Error with posting payment',
                            details: ' HTTP Response body = ' + response.body
                        });

                        Message = 'Invoice Payment Integration:Processing Error with posting payment' + '\n' +
                            'Invoice Number = ' + referenceNumber + '\n' + ' supplierName = ' + supplierName + '\n' + ' supplierNumber = ' +
                            supplier + '\n' + ' check# = ' + tranId + '\n' + ' original amount paid = ' + origAmount + '\n' + ' payment applied= ' + appliedAmount + '\n' + ' HTTP Response Code = ' + response.code + '\n\n';
                        sendEmailNotification(Message, transactionObject.id);
                        return;
                    } else {
                        if (isExpenseReport) {
                            log.audit({
                                title: 'Payment successful',
                                details: 'Expense Report Number = ' + referenceNumber + ' supplier Name = ' + supplierName + ' supplier Number = ' + supplier + ' check# = ' + tranId + ' original amount paid = ' + origAmount +
                                    ' payment applied= ' + appliedAmount + '  Payment date = ' + paymentDate
                            });
                        } else {
                            log.audit({
                                title: 'Payment successful',
                                details: 'Invoice Number = ' + referenceNumber + ' supplier Name = ' + supplierName + ' supplier Number = ' + supplier + ' check# = ' + tranId + ' original amount paid = ' + origAmount +
                                    ' payment applied= ' + appliedAmount + '  Payment date = ' + paymentDate
                            });
                        }

                        var responseJSON = response.body ? JSON.parse(response.body) : undefined;
                        checkPaidFlag(isExpenseReport, responseJSON, coupaInvoiceId, configuration);
                    }
                }
                if (paymentMap) {
                    return paymentMap;
                }
                paymentRecord.save({
                    ignoreMandatoryFields: true
                });
            }
        }

        function postVoidedPaymentToCoupa(transactionObject, configuration) {
            var paymentMap = [], isMapFieldAvailable = false;
            var supplier = "", supplierName = "", processedSuccessfully = true;
            if (isCoupaBillPayment(transactionObject.id)) {
                var paymentRecord = record.load({
                    type: record.Type.VENDOR_PAYMENT,
                    id: transactionObject.id
                });
                var paymentMapString = paymentRecord.getValue({
                    fieldId: 'custbody_coupa_payment_map'
                });
                if (paymentMapString && JSON.parse(paymentMapString)) {
                    paymentMap = JSON.parse(paymentMapString);
                    isMapFieldAvailable = true;
                }
                var paymentDate = netsuiteDateToCoupaDate(paymentRecord.getValue({
                    fieldId: 'trandate'
                }));
                log.debug({
                    title: 'Payment Date: ',
                    details: paymentDate
                });
                var paymentStatus = paymentRecord.getValue({
                    fieldId: 'status'
                });
                log.debug({
                    title: 'paymentStatus: ',
                    details: paymentStatus
                });
                var tranId = paymentRecord.getValue({
                    fieldId: 'tranid'
                });
                log.debug({
                    title: 'Transaction Id / Check Number: ',
                    details: tranId
                });

                var voidedAmount = paymentRecord.getValue({
                    fieldId: 'total'
                });

                supplier = paymentRecord.getValue({
                    fieldId: 'entity'
                });
                try {
                    var fieldLookUp = search.lookupFields({
                        type: search.Type.VENDOR,
                        id: supplier,
                        columns: ['companyname']
                    });
                    supplierName = fieldLookUp.companyname;
                } catch (e) {
                    if (e.type === "RCRD_DSNT_EXIST") {
                        var errorMessage = 'Supplier = ' + ' Check# = ' + tranId + ' Record number = ' + paymentRecord.getSublistValue({
                            sublistId: 'apply',
                            fieldId: 'refnum',
                            line: 0
                        }) + ' Payment date = ' + paymentDate;
                        log.error({
                            title: 'Vendor Record Not Found',
                            details: JSON.stringify(e)
                        });
                        errorMessage += '\nError Code = ' + e.code + ' Error Description = ' + e.message
                        errorMessage += '\n\nError Details: ' + JSON.stringify(e);
                        paymentRecord.setFieldValue('externalid', "Processed " + id + " vendorNotFound");
                        var paymentId = paymentRecord.save();
                        sendEmailNotification(errorMessage, paymentId);
                    } else {
                        var errorMessage = 'Supplier = ' + ' Check# = ' + tranId + ' Record number = ' + paymentRecord.getSublistValue({
                            sublistId: 'apply',
                            fieldId: 'refnum',
                            line: 0
                        }) + ' Payment date = ' + paymentDate;
                        log.error({
                            title: 'Error in postPaymentToCoupa()',
                            details: JSON.stringify(e)
                        });
                        errorMessage += '\nError Code = ' + e.code + ' Error Description = ' + e.message
                        errorMessage += '\n\nError Details: ' + JSON.stringify(e);
                        paymentRecord.setFieldValue('externalid', "Processed " + id + " vendorNotFound");
                        var paymentId = paymentRecord.save();
                        sendEmailNotification(errorMessage, paymentId);
                    }
                }

                var baseURL = configuration.host;

                var lineCount = paymentRecord.getLineCount({
                    sublistId: 'apply'
                });
                log.debug({
                    title: 'Count of Bill/ER in Bill Payment',
                    details: lineCount
                });
                var i = paymentRecord.findSublistLineWithValue({
                    sublistId: 'apply',
                    fieldId: 'doc',
                    value: transactionObject.vendorBillID
                });

                    var isExpenseReport = false;
                    var creditsArray = [];
                    var isapplied = paymentRecord.getSublistValue({
                        sublistId: 'apply',
                        fieldId: 'apply',
                        line: i
                    })
                    if (!isapplied) {
                        return;
                    }
                    var documentType = paymentRecord.getSublistValue({
                        sublistId: 'apply',
                        fieldId: 'type',
                        line: i
                    });
                    var appliedToTransaction = paymentRecord.getSublistValue({
                        sublistId: 'apply',
                        fieldId: 'doc',
                        line: i
                    });
                    if (documentType == "Journal") {
                        log.audit({
                            title: 'Skipping Voiding Journal Sublist Line: ',
                            details: "journalentry:" + appliedToTransaction
                        });
                        return;
                    }

                var discountAmount = paymentRecord.getSublistValue({
                    sublistId: 'apply',
                    fieldId: 'disc',
                    line: i
                });

                    if (paymentMap && paymentMap.length > 0 && isMapFieldAvailable) {
                        log.debug({
                            title: 'COUPA PAYMENT MAP field found',
                            details: JSON.stringify(paymentMap)
                        });
                        log.debug({
                            title: 'appliedToTransaction: ',
                            details: appliedToTransaction
                        });
                        var paymentObj = paymentMap.filter(function (key) {
                            return key.invoiceId == appliedToTransaction;
                        });
                        creditsArray = paymentMap.filter(function (key) {
                            return key.vendorBillId == appliedToTransaction;
                        });

                        log.debug({
                            title: 'paymentObj: ',
                            details: JSON.stringify(paymentObj)
                        });

                        if (paymentObj && paymentObj.length > 0 && paymentObj[0].amount) {
                            voidedAmount = -Math.abs(paymentObj[0].amount);
                        } if (paymentObj && paymentObj.length > 0 && paymentObj[0].discountAmount) {
                            discountAmount = -Math.abs(paymentObj[0].discountAmount);
                        }
                    } else {
                        log.debug({
                            title: 'COUPA PAYMENT MAP field not found',
                            details: 'Using Total Amount instead of amount from COUPA PAYMENT MAP'
                        });
                        voidedAmount = -Math.abs(voidedAmount);
                        log.debug({
                            title: 'voidedAmount: ',
                            details: JSON.stringify(voidedAmount)
                        });
                    }
                    log.debug({
                        title: 'voidedAmount: ',
                        details: voidedAmount
                    });
                    var appliedToTransactionType = paymentRecord.getSublistValue({
                        sublistId: 'apply',
                        fieldId: 'type',
                        line: i
                    });
                    var fieldLookUp = "";
                    if (appliedToTransactionType == 'Expense Report') {
                        fieldLookUp = search.lookupFields({
                            type: search.Type.EXPENSE_REPORT,
                            id: appliedToTransaction,
                            columns: ['externalid']
                        });
                    } else {
                        fieldLookUp = search.lookupFields({
                            type: search.Type.VENDOR_BILL,
                            id: appliedToTransaction,
                            columns: ['externalid']
                        });
                    }
                    if (fieldLookUp.externalid[0] && (fieldLookUp.externalid[0].value.indexOf('ExpenseReport') > -1 || fieldLookUp.externalid[0].value.indexOf('Coupa-expensereport') > -1)) {
                        isExpenseReport = true;
                    }
                    var appliedAmount = paymentRecord.getSublistValue({
                        sublistId: 'apply',
                        fieldId: 'amount',
                        line: i
                    });
                    var appliedDate = paymentRecord.getSublistValue({
                        sublistId: 'apply',
                        fieldId: 'applydate',
                        line: i
                    });
                    //appliedDate = netsuiteDateToCoupaDate(appliedDate);
                    appliedDate = format.format({value: appliedDate, type: format.Type.DATE});
                    var referenceNumber = paymentRecord.getSublistValue({
                        sublistId: 'apply',
                        fieldId: 'refnum',
                        line: i
                    });
                    if (fieldLookUp.externalid[0] && fieldLookUp.externalid[0].value.indexOf('Coupa-expensereport') > -1) {
                        referenceNumber = fieldLookUp.externalid[0].value;
                        referenceNumber = referenceNumber.replace('Coupa-expensereport', '');
                    }
                    var encodedReferenceNumber = encodeURIComponent(referenceNumber);
                    var origAmount = paymentRecord.getSublistValue({
                        sublistId: 'apply',
                        fieldId: 'total',
                        line: i
                    });
                    if (encodedReferenceNumber == "" || encodedReferenceNumber == null || encodedReferenceNumber == null) {
                        log.audit({
                            title: 'Skipping the payment line with Encoded Reference Number: ' + encodedReferenceNumber,
                            details: 'Internal Id of the Vendor Bill: ' + appliedToTransaction
                        });
                        return;
                    }
                    if (!fieldLookUp.externalid[0] || (fieldLookUp.externalid[0] && fieldLookUp.externalid[0].value.toLowerCase().indexOf('coupa') == -1)) {
                        log.audit({
                            title: 'Skipping the payment line with Encoded Reference Number: ' + encodedReferenceNumber,
                            details: 'Internal Id of the Vendor Bill: ' + appliedToTransaction
                        });
                        return;
                    }
                    var integratedPayments = getPaymentsIntegrated(isExpenseReport, referenceNumber, encodedReferenceNumber, supplier, supplierName, "NetSuite Check#" + tranId, configuration, transactionObject);      //Payment details per ER or Invoice
                    if (integratedPayments && integratedPayments.length > 0) {
                        var reconciliationDetail = [];
                        if (isExpenseReport) {
                            reconciliationDetail = integratedPayments.filter(function (payment) {
                                log.debug({
                                    title: 'payment.notes: ' + payment.notes + ' tranId: ' + tranId,
                                    details: 'parseFloat(payment[\'amount-paid\']) : ' + parseFloat(payment['amount-paid']) + ' parseFloat(voidedAmount): ' + (parseFloat(voidedAmount)) + ' payment[\'payment-date\']: ' + convertCoupaDateToNetSuiteDate(payment['payment-date']) + ' paymentDate: ' + convertCoupaDateToNetSuiteDate(paymentDate)
                                });
                                return payment.notes == "NetSuite Check#" + tranId && parseFloat(payment['amount-paid']) == parseFloat(voidedAmount) && convertCoupaDateToNetSuiteDate(payment['payment-date']) == convertCoupaDateToNetSuiteDate(paymentDate);
                            });
                        } else {
                            reconciliationDetail = integratedPayments.filter(function (payment) {
                                log.debug({
                                    title: 'payment.notes: ' + payment.notes + ' tranId: ' + "NetSuite Check#" + tranId,
                                    details: 'parseFloat(payment[\'amount-paid\']) : ' + parseFloat(payment['amount-paid']) + ' parseFloat(voidedAmount): ' + (parseFloat(voidedAmount)) + ' payment[\'payment-date\']: ' + convertCoupaDateToNetSuiteDate(payment['payment-date']) + ' paymentDate: ' + convertCoupaDateToNetSuiteDate(paymentDate)
                                });
                                if (tranId.indexOf('NetSuite Check#') < 0) {
                                    return payment.notes == tranId && parseFloat(payment['amount-paid']) == parseFloat(voidedAmount) && convertCoupaDateToNetSuiteDate(payment['payment-date']) == convertCoupaDateToNetSuiteDate(paymentDate);
                                }
                                return payment.notes == "NetSuite Check#" + tranId && parseFloat(payment['amount-paid']) == parseFloat(voidedAmount) && convertCoupaDateToNetSuiteDate(payment['payment-date']) == convertCoupaDateToNetSuiteDate(paymentDate);
                            });
                        }
                        if (reconciliationDetail && reconciliationDetail.length == 0) {
                            var postData = "";
                            if (isExpenseReport) {
                                postData = {
                                    "payment": {
                                        "amount_paid": parseFloat(voidedAmount),
                                        "notes": "NetSuite Check#" + tranId,
                                        "payment_date": paymentDate
                                    }
                                };
                            } else {
                                if (creditsArray && creditsArray.length > 0) {
                                    log.audit({
                                        title: 'Generating Payload with Credit Notes',
                                        details: 'Credit Notes are attached to the Invoices in the payment'
                                    });
                                    postData = {};
                                    postData.payments = [];
                                    let payment = {};
                                    payment.amount_paid = voidedAmount;
                                    payment.notes = tranId ? "NetSuite Check#" + tranId : '';
                                    payment.payment_date = paymentDate;
                                    postData.payments.push(payment);
                                    //Adding Credit Lines Below
                                    for (let vc in creditsArray) {
                                        let payment = {};
                                        payment.amount_paid = -Math.abs(creditsArray[vc].amount);
                                        payment.notes = "Void Of " + creditsArray[vc].notes;
                                        payment.payment_date = creditsArray[vc].date;
                                        postData.payments.push(payment);
                                        processCreditReversal(creditsArray[vc].billCreditId, creditsArray[vc].vendorBillId, creditsArray[vc].amount);
                                    }
                                    if (discountAmount) {
                                        let payment = {};
                                        payment.amount_paid = -Math.abs(parseFloatOrZero(discountAmount));
                                        payment.notes = "Void Of " + "NetSuite Check#" + tranId + ": Discount Applied";
                                        payment.payment_date = paymentDate;
                                        postData.payments.push(payment);
                                    }
                                } else {
                                    log.audit({
                                        title: 'Generating Payload',
                                        details: 'No Credit Notes are attached to the Invoices in the payment'
                                    });
                                    postData = {};
                                    postData.payments = [];
                                    let payment = {};
                                    payment.amount_paid = parseFloat(voidedAmount);
                                    payment.notes = tranId ? "NetSuite Check#" + tranId : '';
                                    payment.payment_date = paymentDate;
                                    postData.payments.push(payment);
                                    if (discountAmount) {
                                        let payment = {};
                                        payment.amount_paid = -Math.abs(parseFloatOrZero(discountAmount));
                                        payment.notes = "Void Of " + "NetSuite Check#" + tranId + ": Discount Applied";
                                        payment.payment_date = paymentDate;
                                        postData.payments.push(payment);
                                    }
                                }
                            }
                            log.debug({
                                title: 'postData: ',
                                details: JSON.stringify(postData)
                            });
                            if (encodedReferenceNumber == "" || encodedReferenceNumber == null || encodedReferenceNumber == null) {
                                log.audit({
                                    title: 'Skipping the payment line with Encoded Reference Number: ' + encodedReferenceNumber,
                                    details: 'Internal Id of the Vendor Bill: ' + appliedToTransaction
                                });
                                return;
                            }
                            var coupaInvoiceId = getInvoiceIdToVoid(isExpenseReport, configuration, encodedReferenceNumber, supplier);
                            if (coupaInvoiceId) {
                                var url = baseURL + '/api/invoices/' + coupaInvoiceId;

                                if (isExpenseReport) {
                                    url = baseURL + '/api/expense_reports/' + referenceNumber;
                                }
                                var response = https.put({
                                    url: url,
                                    body: JSON.stringify(postData),
                                    headers: configuration.headers,
                                });
                                if (response.code != '200') {
                                    log.error({
                                        title: 'Processing Error with voiding payment',
                                        details: 'Invoice Number = ' + referenceNumber + ' supplier Name = ' + supplierName + ' supplier Number = ' + supplier + ' check# = ' + tranId + ' original amount paid = ' + origAmount +
                                            ' payment applied= ' + appliedAmount + ' HTTP Response Code = ' + response.code
                                    });
                                    log.debug({
                                        title: 'Processing Error with voiding payment',
                                        details: ' HTTP Response body = ' + response.body
                                    });

                                    Message = 'Invoice Payment Integration:Processing Error with voiding payment' + '\n' +
                                        'Invoice Number = ' + referenceNumber + '\n' + ' supplierName = ' + supplierName + '\n' + ' supplierNumber = ' +
                                        supplier + '\n' + ' check# = ' + tranId + '\n' + ' original amount paid = ' + origAmount + '\n' + ' payment applied= ' + appliedAmount + '\n' + ' HTTP Response Code = ' + response.code + '\n\n';
                                    sendEmailNotification(Message, transactionObject.id, configuration);
                                    processedSuccessfully = false;
                                    return;
                                } else {
                                    if (isExpenseReport) {
                                        log.audit({
                                            title: 'Payment Voided successfully',
                                            details: 'Expense Report Number = ' + referenceNumber + ' supplier Name = ' + supplierName + ' supplier Number = ' + supplier + ' check# = ' + tranId + ' original amount paid = ' + origAmount +
                                                ' payment applied= ' + appliedAmount + '  Payment date = ' + paymentDate
                                        });
                                    } else {
                                        log.audit({
                                            title: 'Payment  Voided successfully',
                                            details: 'Invoice Number = ' + referenceNumber + ' supplier Name = ' + supplierName + ' supplier Number = ' + supplier + ' check# = ' + tranId + ' original amount paid = ' + origAmount +
                                                ' payment applied= ' + appliedAmount + '  Payment date = ' + paymentDate
                                        });
                                    }
                                    var responseJSON = response.body ? JSON.parse(response.body) : undefined;
                                    // checkPaidFlag(responseJSON, coupaInvoiceId, paymentDate);
                                    checkPaidFlag(isExpenseReport, responseJSON, coupaInvoiceId, configuration);
                                }
                            } else {
                                log.audit({
                                    title: 'No Invoice/Expense Report found to post voided Payment: ',
                                    details: JSON.stringify(transactionObject)
                                });
                            }
                        } else {
                            log.audit({
                                title: 'Payment Already voided in Coupa: ',
                                details: JSON.stringify(transactionObject)
                            });
                            log.audit({
                                title: 'Reconciliation Detail on Invoice in Coupa: ',
                                details: JSON.stringify(reconciliationDetail)
                            });
                        }
                    } else {
                        log.audit({
                            title: 'No Payment details found for Invoice/ER in Payment: ',
                            details: JSON.stringify(transactionObject)
                        });
                    }
                    //TODO: check if no payment found direct mark the payment exported test this if unsuccessful create a +ve payment then a -ve payment in same payload

                if (processedSuccessfully) {
                    log.audit({
                        title: 'Marking Bill Payment as voided: ',
                        details: JSON.stringify(transactionObject)
                    });
                    return true;
                    /*paymentRecord.setValue({
                        fieldId: 'externalid',
                        value: "Processed" + transactionObject.id + "voided"
                    });*/
                }
                /*paymentRecord.save({
                    ignoreMandatoryFields: true
                });*/
            } else {
                log.audit({
                    title: 'Voiding of Bill Payment: ' + transactionObject.id + ' skipped.',
                    details: 'Reason: The bill Payment contains Payment for Vendor Bills not present in Coupa'
                });
                    return false;
                /*var id = record.submitFields({
                    type: record.Type.VENDOR_PAYMENT,
                    id: transactionObject.id,
                    values: {
                        externalid: "Processed " + transactionObject.id + " notinCoupa"
                    },
                    options: {
                        enableSourcing: false,
                        ignoreMandatoryFields: true
                    }
                });*/
            }
        }

        function isCoupaBillPayment(paymentId) {
            var isCoupaBillPayment = false;
            var vendorpaymentSearch = search.create({
                type: "vendorpayment",
                filters:
                    [
                        ["type", "anyof", "VendPymt"],
                        "AND",
                        ["internalid", "anyof", paymentId],
                        "AND",
                        ["mainline", "is", false],
                        "AND",
                        ["appliedtotransaction.externalidstring", "startswith", "Coupa"],
                        "AND",
                        ["appliedtotransaction.type", "anyof", "ExpRept", "VendBill"]
                    ]
            });
            var searchResultCount = vendorpaymentSearch.runPaged().count;
            log.debug("Count of Vendor Bills not associated with Coupa for Bill Payment:" + paymentId, searchResultCount);
            vendorpaymentSearch.run().each(function (result) {
                isCoupaBillPayment = true;
                return true;
            });
            log.audit("isCoupaBillPayment: ", isCoupaBillPayment);
            return isCoupaBillPayment;
        }


        function netsuiteDateToCoupaDate(netsuitedate) {
            return netsuitedate.getFullYear() + "-" + ('0' + (netsuitedate.getMonth() + 1)).slice(-2) + "-" + ('0' + netsuitedate.getDate()).slice(-2) + "T00:00:00-08:00";
        }

        function sendEmailNotification(errorMessage, recordId, configuration) {
            configuration = configuration ? configuration : loadConfiguration();
            email.send({
                author: configuration.errorFrom,
                recipients: configuration.errorTo,
                subject: configuration.accountName + ' Invoice Payment Integration: Processing Error with posting payment',
                body: errorMessage,
                relatedRecords: {
                    entityId: configuration.errorFrom,
                    transactionId: recordId
                }
            });
        }

        function getCoupaInvoiceId(appliedToTransaction, referenceNumber, supplier, tranId, appliedAmount, paymentDate, configuration, appliedToTransactionType) {
            var isExpenseReport = false, url = '';
            if (!referenceNumber) {
                log.debug({
                    title: 'INVALID_COUPAID',
                    details: 'This is Bill Payment Against Netsuite Generated Bill'
                });
                return 'INVALID_COUPAID';
            }
            var encodedReferenceNumber = encodeURIComponent(referenceNumber);
            var fieldLookUp = "";
            if (appliedToTransactionType == 'Expense Report') {
                fieldLookUp = search.lookupFields({
                    type: search.Type.EXPENSE_REPORT,
                    id: appliedToTransaction,
                    columns: ['externalid']
                });
            } else {
                fieldLookUp = search.lookupFields({
                    type: search.Type.VENDOR_BILL,
                    id: appliedToTransaction,
                    columns: ['externalid']
                });
            }
            var externalId = fieldLookUp.externalid[0] ? fieldLookUp.externalid[0].value : '';
            if (!externalId) {
                log.debug({
                    title: 'INVALID_COUPAID',
                    details: 'This is Bill Payment Against Netsuite Generated Bill'
                });
                return 'INVALID_COUPAID';
            }
            if (externalId.indexOf('ExpenseReport') > -1 || externalId.indexOf('Coupa-expensereport') > -1) {
                isExpenseReport = true;
                url = configuration.host + '/api/expense_reports/' + referenceNumber;
            } else {
                url = configuration.host + '/api/invoices?invoice-number=' + encodedReferenceNumber + '&supplier[number]=' + supplier + '&status=approved';
            }
            log.audit({
                title: 'isExpenseReport: ' + isExpenseReport,
                details: 'referenceNumber: ' + referenceNumber + ' externalId: ' + externalId + ' appliedToTransaction: ' + appliedToTransaction
            });
            var response = https.get({
                url: url,
                headers: configuration.headers
            });
            if (response.code == 200) {
                if (response.body && isValidJSON(response.body)) {
                    var response = JSON.parse(response.body);
                    if (isExpenseReport) {
                        //Commented code to handle the Enterprise issue where ER voided doesn't flip paid flag
                        /*                        if (response.status == 'paid') {
                                                    log.debug({
                                                        title: 'Expense Report already paid',
                                                        details: ' Expense Report ID = ' + referenceNumber + ' employee = ' + supplier
                                                    });
                                                    return 'EXPENSE_PAID';*/
                        //  } else {
                        log.debug({
                            title: 'Coupa Expense Id',
                            details: referenceNumber
                        });
                        return referenceNumber;
                        // }
                    } else {
                        response = response[0];
                        var coupaInvoiceId = response.id;
                        var isPaid = response.paid;
                        if (isPaid) {
                            log.debug({
                                title: 'Invoice already paid',
                                details: ' Invoice Number = ' + coupaInvoiceId + ' supplier = ' + supplier
                            });
                            return 'INVOICE_PAID';
                        }
                        var payments = response.payments;
                        for (var i = 0; i < payments.length; i++) {
                            if (payments[i]['amount-paid'] && payments[i]['payment-date']) {
                                var paidamount = payments[i]['amount-paid'];
                                var checknumber = payments[i]['notes'];

                                var paiddate = convertCoupaDateToNetSuiteDate(payments[i]['payment-date']);
                                log.debug({
                                    title: 'Check for duplicate',
                                    details: 'Invoice Check = ' + checknumber + ' Netsuite Tranid = ' + tranId + ' InvoicePaymentamount = ' + parseFloatOrZero(paidamount) + ' ToPayAmount = ' + parseFloatOrZero(appliedAmount) + ' Invoicedate = ' + paiddate + ' ToPayDate = ' + convertCoupaDateToNetSuiteDate(paymentDate)
                                });
                                if ((parseFloatOrZero(paidamount) == parseFloatOrZero(appliedAmount)) && (tranId == checknumber) && (paiddate == convertCoupaDateToNetSuiteDate(paymentDate))) {
                                    return 'DUPLICATE_PAYMENT';
                                }
                            }
                        }
                        return coupaInvoiceId;
                    }
                } else {
                    log.error({
                        title: 'Invalid response for URL: ' + url,
                        details: JSON.stringify(response.body)
                    });
                }
            } else if (response.code == 404 && configuration.skip404Error) {
                log.audit({
                    title: 'Processing Error with posting payment Error Code: ' + response.code,
                    details: 'URL: ' + url
                });
                return 'INVALID_COUPAID'
            } else if (response.code == 404) {
                log.audit({
                    title: 'Processing Error with posting payment Error Code: ' + response.code,
                    details: 'URL: ' + url
                });
                return 'INVALID_COUPAID'
            } else if(response.code != 404) {
                log.error({
                    title: 'Processing Error with posting payment ',
                    details: 'Invalid response Code: ' + response.code
                });
                return 'INVALID_RESPONSE';
            }
        }

        function isValidJSON(text) {
            if (typeof text !== "string") {
                return false;
            }
            try {
                JSON.parse(text);
                return true;
            } catch (error) {
                return false;
            }
        }

        function getFieldValue(obj, prop, defval) {
            if (typeof defval == 'undefined') defval = "";
            prop = prop.split('.');
            for (var i = 0; i < prop.length; i++) {
                if (typeof obj[prop[i]] == 'undefined')
                    return defval;
                obj = obj[prop[i]];
            }
            return obj;
        }

        function convertCoupaDateToNetSuiteDate(CoupaDate) {
            var nDate = CoupaDate.split('T');
            var datesplit = nDate[0].split('-');
            var Nyear = datesplit[0];
            var Nday;
            Nday = datesplit[2];
            var Nmonth;
            Nmonth = datesplit[1];
            var netDate = Nmonth + '/' + Nday + '/' + Nyear;
            return netDate;
        }

        function getPaymentsIntegrated(isExpenseReport, referenceNumber, encodedReferenceNumber, supplier, supplierName, tranId, configuration, transactionObject) {
            var paymentsArray = [];
             var baseURL = configuration.host;
            if (isExpenseReport) {
                url = configuration.host + '/api/expense_reports/' + referenceNumber;
            } else {
                url = configuration.host + '/api/invoices?invoice-number=' + encodedReferenceNumber + '&supplier[number]=' + supplier + '&status=approved';
            }
            log.debug({
                title: 'URL while getting payment details: ',
                details: url
            });
            var response = https.get({
                url: url,
                headers: configuration.headers
            });
            log.debug({
                title: 'response code while getting payment details: ',
                details: response.code
            });
            if (response.code == 200) {
                if (response.body && isValidJSON(response.body)) {
                    var response = JSON.parse(response.body);
                    if (isExpenseReport) {
                        paymentsArray = response['reconciliation-lines'];
                    } else {
                        paymentsArray = response[0].payments
                    }
                } else {
                    var Message = 'Invoice Payment Integration:Processing Error with voiding payment' + '\n' +
                        'Invoice Number = ' + referenceNumber + '\n' + ' supplierName = ' + supplierName + '\n' + ' supplierNumber = ' +
                        supplier + '\n' + ' check# = ' + tranId + '\n';
                    sendEmailNotification(Message, transactionObject.id);
                }
            } else {
                var Message = 'Invoice Payment Integration:Processing Error with voiding payment' + '\n' +
                    'Invoice Number = ' + referenceNumber + '\n' + ' supplierName = ' + supplierName + '\n' + ' supplierNumber = ' +
                    supplier + '\n' + ' check# = ' + tranId + '\n' + ' HTTP Response Code = ' + response.code + '\n\n';
                sendEmailNotification(Message, transactionObject.id);
            }
            /*log.audit({
                title: 'paymentsArray: ',
                details: JSON.stringify(paymentsArray)
            });*/
            return paymentsArray;
        }


        function getInvoiceIdToVoid(isExpenseReport, configuration, encodedReferenceNumber, supplier) {
            var invoiceId = "";
            var baseURL = configuration.host;
            if (isExpenseReport) {
                url = configuration.host + '/api/expense_reports/' + encodedReferenceNumber;
            } else {
                url = configuration.host + '/api/invoices?invoice-number=' + encodedReferenceNumber + '&supplier[number]=' + supplier + '&status=approved';
            }
            log.debug({
                title: 'URL while getting payment details: ',
                details: url
            });
            var response = https.get({
                url: url,
                headers: configuration.headers
            });
            log.debug({
                title: 'response code while getting payment details: ',
                details: response.code
            });
            if (response.code == 200) {
                if (response.body && isValidJSON(response.body)) {
                    response = JSON.parse(response.body);
                    if (isExpenseReport) {
                        invoiceId = response.id;
                    } else {
                        invoiceId = response[0].id
                    }
                }
            }
            log.audit({
                title: 'Returning InvoiceId from getInvoiceIdToVoid(): ',
                details: invoiceId
            });
            return invoiceId;
        }


        function checkPaidFlag(isExpenseReport, responseBody, coupaInvoiceId, configuration) {
            log.debug({
                title: 'isExpenseReport: ' + isExpenseReport,
                details: ' coupaInvoiceId: ' + coupaInvoiceId
            });
            var totalpaid = 0, invoiceTotal = 0;
            if (isExpenseReport) {
                return;
            }
            var payments = responseBody.payments;
            /*log.debug({
                title: 'In checkPaidFlag payments: ',
                details: JSON.stringify(payments)
            });*/
            for (var i = 0; i < payments.length; i++) {
                totalpaid += parseFloatOrZero(payments[i]['amount-paid']);
            }
            log.debug({
                title: 'In checkPaidFlag() Total Payments Amount = ',
                details: totalpaid
            });
            //var invoiceTotal = parseFloatOrZero(responseBody['total-with-taxes'];TODO Confirm with Ian
            // Get header chargers
            var headerCharge = parseFloatOrZero(responseBody['shipping-amount']) + parseFloatOrZero(responseBody['handling-amount']) + parseFloatOrZero(responseBody['misc-amount']);
            if (!responseBody['line-level-taxation']) {
                headerCharge = headerCharge + parseFloatOrZero(responseBody['tax-amount']);
            }
            for (var i = 0; i < responseBody["invoice-lines"].length; i++) {
                invoiceTotal += parseFloatOrZero(responseBody["invoice-lines"][i]['total']);
                if (responseBody['line-level-taxation'] && parseFloatOrZero(responseBody["invoice-lines"][i]['tax-amount'])) {
                    invoiceTotal += parseFloatOrZero(responseBody["invoice-lines"][i]['tax-amount']);
                }
            }
            invoiceTotal = invoiceTotal + headerCharge;

            if (invoiceTotal && totalpaid) {
                log.debug({
                    title: 'In checkPaidFlag() Invoice Total Amount = ' + parseFloatOrZero(invoiceTotal),
                    details: ' Paid amount = ' + parseFloatOrZero(totalpaid)
                });

                if (invoiceTotal.toFixed(2) === totalpaid.toFixed(2)) {
                    log.debug({
                        title: 'Setting PAID Flag to TRUE',
                        details: 'Invoice Amount = ' + invoiceTotal.toFixed(2) + ' Paid Amount = ' + totalpaid.toFixed(2) + ' CoupaInvoiceId = ' + coupaInvoiceId
                    });
                    setCoupaPaymentFlag(coupaInvoiceId, configuration, true);
                } else {
                    log.debug({
                        title: 'Setting PAID Flag to FALSE',
                        details: 'Invoice Amount = ' + invoiceTotal.toFixed(2) + ' Paid Amount = ' + totalpaid.toFixed(2) + ' CoupaInvoiceId = ' + coupaInvoiceId
                    });
                    setCoupaPaymentFlag(coupaInvoiceId, configuration, false);
                }
            } else {
                log.debug({
                    title: 'Setting PAID Flag to FALSE; invoiceTotal & totalpaid does not match',
                    details: 'Invoice Amount = ' + invoiceTotal.toFixed(2) + ' Paid Amount = ' + totalpaid.toFixed(2) + ' CoupaInvoiceId = ' + coupaInvoiceId
                });
                setCoupaPaymentFlag(coupaInvoiceId, configuration, false);
            }
        }


        function setCoupaPaymentFlag(coupaInvoiceId, configuration, flag) {
            var url = configuration.host + '/api/invoices/' + coupaInvoiceId;
            log.debug({
                title: 'setCoupaPaymentFlag() URL: ',
                details: url
            });
            var postData = {
                "paid": flag
            };
            var response = https.put({
                url: url,
                body: JSON.stringify(postData),
                headers: configuration.headers,
            });
            if (response.code != '200') {
                log.error({
                    title: 'Error setting the Paid Flag ',
                    details: 'Coupa Invoice Id = ' + coupaInvoiceId
                });
            } else {
                log.audit({
                    title: 'Successfully set the Paid Flag ',
                    details: 'Coupa Invoice Id = ' + coupaInvoiceId
                });
            }
        }

        function parseFloatOrZero(number) {
            number = parseFloat(number);
            return isNaN(number) ? 0 : number
        }

        /**
         * Description: Search Credit Notes which are applied to the vendor bill passed as an parameter
         * NIB#: NIB-384
         * @param vendorBillId
         * @return {*[]} creditNotesApplied
         */
        const searchCreditApplied = (vendorBillId, paymentID, coupaInvID) => {
            let creditNotesApplied = [];
            let columnsArray = [
                search.createColumn({
                    name: "internalid",
                    sort: search.Sort.ASC,
                    label: "Internal ID"
                }),
                search.createColumn({name: "tranid", label: "Document Number"}),
                search.createColumn({name: "appliedtolinkamount", label: "Applied To Link Amount"}),
                search.createColumn({name: "trandate", label: "Date"})
            ];
            let vendorcreditSearchObj = search.create({
                type: "vendorcredit",
                filters:
                    [
                        ["type", "anyof", "VendCred"],
                        "AND",
                        ["mainline", "is", "T"],
                        "AND",
                        ["appliedtotransaction", "anyof", vendorBillId],
                        "AND",
                        ["appliedtotransaction.type", "anyof", "VendBill"]
                    ],
                columns: columnsArray
            });
            let searchResultCount = vendorcreditSearchObj.runPaged().count;
            log.debug("vendorcreditSearchObj result count", searchResultCount);
            vendorcreditSearchObj.run().each(function (result) {
                let object = {};
                object.billCreditId = result.getValue(columnsArray[0]);
                object.amount = result.getValue(columnsArray[2]);
                object.notes = "Bill Credit - " + result.getValue(columnsArray[1]);
                object.date = netsuiteDateToCoupaDate(new Date(result.getValue(columnsArray[3])));
                object.vendorBillId = vendorBillId;
                creditNotesApplied.push(object)
                return true;
            });
            creditNotesApplied = getCreditsIntegrated(coupaInvID, paymentID, creditNotesApplied);
            log.debug("creditNotesApplied ", creditNotesApplied);
            return creditNotesApplied;
        }

        /**
         * Description: Process the Credit Reversal in case the Bill Payment is voided to rollback the credits applied.
         * NIB#: NIB-384
         * @param creditNoteId
         * @param vendorBillId
         * @param creditAmount
         */
        const processCreditReversal = (creditNoteId, vendorBillId, creditAmount) => {
            try {
                log.audit({
                    title: 'Trying to load Vendor Credit for reversal with Id:  >> ',
                    details: creditNoteId
                });

                let creditRecord = record.load({
                    type: record.Type.VENDOR_CREDIT,
                    id: creditNoteId,
                    isDynamic: true
                });

                let lineIndex = creditRecord.findSublistLineWithValue({
                    sublistId: 'apply',
                    fieldId: 'doc',
                    value: vendorBillId
                });

                if (lineIndex == -1) {
                    log.error('VB not found!', 'Cant find sublist with doc ' + vendorBillId);
                    return;
                } else {
                    creditRecord.selectLine({
                        sublistId: 'apply',
                        line: lineIndex
                    });
                }
                log.debug({
                    title: 'allocatedAmount: ' + creditAmount + ' >> ',
                    details: 'for Vendor Bill with ref: ' + vendorBillId
                });

                let paymentAmount = creditRecord.getCurrentSublistValue({
                    sublistId: 'apply',
                    fieldId: 'amount'
                });

                log.debug({
                    title: 'Payment to be set: >> ',
                    details: 'amount to be set: ' + (parseFloatOrZero(paymentAmount) - parseFloatOrZero(creditAmount))
                });

                creditRecord.setCurrentSublistValue({
                    sublistId: 'apply',
                    fieldId: 'amount',
                    value: parseFloatOrZero(paymentAmount) - parseFloatOrZero(creditAmount)
                });

                creditRecord.commitLine({
                    sublistId: 'apply'
                });

                creditRecord.save();

                log.audit({
                    title: 'Credit record processed Successfully with ID:  >> ',
                    details: creditNoteId
                });
            } catch (e) {
                log.error({
                    title: 'Error in processCreditReversal',
                    details: JSON.stringify(e)
                });
            }
        }

        /**
         * Description: Filter the Credits associated with the Invoice. If a credit is already integrated the credit gets skipped.
         * NIB#: NIB-384
         * @param invoiceID
         * @param paymentID
         * @param creditNotesApplied
         * @return {*[]} filteredCredits
         */
        const getCreditsIntegrated = (invoiceID, paymentID, creditNotesApplied) => {
            var paymentsArray = [], filteredCredits = [];
            var configuration = loadConfiguration();
            var headers = new Array();
            headers['Accept'] = 'application/json';
            headers['X-COUPA-API-KEY'] = configuration.apiKey
            var baseURL = configuration.host;
            headers['X-COUPA-API-KEY'] = configuration.apiKey;
            url = configuration.host + '/api/invoices/' + invoiceID;
            log.debug({
                title: 'URL while getting payment details: ',
                details: url
            });

            var response = https.get({
                url: url,
                headers: headers
            });

            log.debug({
                title: 'response code while getting payment details: ',
                details: response.code
            });

            if (response.code == 200) {
                if (response.body && isValidJSON(response.body)) {
                    var response = JSON.parse(response.body);
                    paymentsArray = response.payments
                } else {
                    var Message = 'Invoice Payment Integration:Processing Error in getCreditsIntegrated function' + '\n' + 'Invoice Number = ' + invoiceID + '\n';
                    sendEmailNotification(Message, paymentID);
                }
            } else {
                var Message = 'Invoice Payment Integration:Processing Error in getCreditsIntegrated function' + '\n' + 'Invoice Number = ' + invoiceID;
                sendEmailNotification(Message, paymentID);
            }
            /*log.audit({
                title: 'paymentsArray: ',
                details: JSON.stringify(paymentsArray)
            });*/

            if (paymentsArray && paymentsArray.length > 0) {

                for (var c in creditNotesApplied) {
                    var reconciliationDetail = [];
                    reconciliationDetail = paymentsArray.filter(function (payment) {
                        log.debug({
                            title: 'payment.notes: ' + payment.notes + ' creditNotesApplied[c].notes: ' + creditNotesApplied[c].notes,
                            details: 'parseFloat(payment[\'amount-paid\']) : ' + parseFloat(payment['amount-paid']) + ' creditNotesApplied[c].amount: ' + (parseFloat(creditNotesApplied[c].amount)) + ' payment[\'payment-date\']: ' + convertCoupaDateToNetSuiteDate(payment['payment-date']) + ' creditNotesApplied[c].date: ' + convertCoupaDateToNetSuiteDate(creditNotesApplied[c].date)
                        });
                        return payment.notes == creditNotesApplied[c].notes && parseFloat(payment['amount-paid']) == parseFloat(creditNotesApplied[c].amount) && convertCoupaDateToNetSuiteDate(payment['payment-date']) == convertCoupaDateToNetSuiteDate(creditNotesApplied[c].date);
                    });

                    if (reconciliationDetail && reconciliationDetail.length == 0) {
                        filteredCredits.push(creditNotesApplied[c]);
                    } else {
                        log.debug({
                            title: 'Skipping previously synced Credit Note',
                            details: 'Payment: ' + JSON.stringify(reconciliationDetail[0]) + "matched the credit note: " + JSON.stringify(creditNotesApplied)
                        });
                    }
                }
            } else {
                log.debug({
                    title: 'No Payments found on the Invoice record in Coupa',
                    details: 'Returning following credit Notes Applied from getCreditsIntegrated: ' + JSON.stringify(creditNotesApplied)
                });
                filteredCredits = filteredCredits.concat(creditNotesApplied);
            }
            return filteredCredits;
        }

        /**
         * This method sends the failure summary email to the recipients.
         * @method
         * @param {Object} summary
         * @param {string} scriptName
         * @return -NA-
         * @author Yogesh Jagdale
         */
        const sendFailureSummary = (summary, scriptName) => {
            var errorMap = {};
            var configuration = loadConfiguration();
            var subject = "Summary Email: Coupa Invoice & ER Payment 2.0 Completed with Errors";
            var message = "Hello, <br><br> " + scriptName + " Script Failed. Please contact the support team to discuss corrective steps. <br><br>Thank you <br><br> <hr>";
            var userid = configuration.errorFrom;
            var contents = '';
            summary.reduceSummary.errors.iterator().each(function (key, error, executionNo) {
                log.error({
                    title: 'Reduce error for key: ' + key + ', execution no.  ' + executionNo,
                    details: error
                });
                if (errorMap[key] == undefined) {
                    errorMap[key] = key;
                    contents += "Reduce error for key: " + key + ", execution no.  " + executionNo + " Error: " + JSON.stringify(error, undefined, 4) + " <br><br>";
                }
                return true;
            });

            message += contents;
            log.audit({
                title: 'Sending Erorr summary to : ' + configuration.errorTo.toString(),
                details: message
            });
            email.send({
                author: userid,
                recipients: configuration.errorTo.toString(),
                subject: subject,
                body: message
            });
        }

        /**
         * Retruns the payments lines for a bill payment
         * @param configuration
         * @param paymentID
         * @return {*[]}
         */
        function getSuccessPaymentsLines(configuration, paymentID) {
            var paymentsArray = [];
            var account_types = ["Bank", "CredCard"];
            var column = [
                search.createColumn({name: "status", label: "Status"}),
                search.createColumn({name: "appliedtotransaction", label: "Applied To Transaction"}),
                search.createColumn({name: "appliedtolinkamount", label: "Applied To Link Amount"})
            ];
            var paymentFilter = [
                ["internalid", "anyof", paymentID],
                "AND",
                ["externalidstring", "doesnotcontain", "Processed"],
                "AND",
                ["mainline", "is", "F"],
                "AND",
                ["appliedtotransaction.externalidstring", "contains", "coupa"],
                "AND",
                ["externalidstring", "isempty", ""],
                "AND",
                ["transactiondiscount","is","F"]
            ];
            if (configuration.isPaymentApprovalFeatureEnabled) {
                paymentFilter.push("AND");
                paymentFilter.push(["status", "anyof", "VendPymt:F"]);
                paymentFilter.push("AND");
                paymentFilter.push(["status", "noneof", "VendPymt:V"]);
            }
            //Search Payments yet to be processed
            var paymentSearchObj = search.create({
                type: "vendorpayment",
                filters: paymentFilter,
                columns: column
            });
            var searchResultCount = paymentSearchObj.runPaged().count;
            log.debug("Count of payments to be posted: ", searchResultCount);
            paymentSearchObj.run().each(function (result) {
                var transaction = {};
                transaction.id = result.id;
                transaction.recordType = result.recordType;
                transaction.status = result.getValue(column[0]);
                transaction.vendorBillID = result.getValue(column[1]);
                transaction.paymentAmount = parseFloatOrZero(result.getValue(column[2]));
                paymentsArray.push(transaction);
                return true;
            });
            return paymentsArray
        }

        /**
         * Retruns the payments lines for a bill payment
         * @param configuration
         * @param paymentID
         * @return {*[]}
         */
        function getVoidedPaymentsLines(paymentID, configuration) {
            var paymentsArray = [];
            var account_types = ["Bank", "CredCard"];
            var column = [
                search.createColumn({name: "status", label: "Status"}),
                search.createColumn({name: "appliedtotransaction", label: "Applied To Transaction"}),
                search.createColumn({name: "appliedtolinkamount", label: "Applied To Link Amount"})
            ];
            var paymentFilter = [
                ["internalid", "anyof", paymentID],
                "AND",
                ["externalidstring", "contains", "Processed"],
                "AND",
                ["mainline", "is", "F"],
                "AND",
                ["appliedtotransaction.type","anyof","VendBill","VendCred","ExpRept"],
                "AND",
                ["appliedtotransaction.externalidstring", "contains", "coupa"],
                "AND",
                ["transactiondiscount","is","F"]
            ];
            if (configuration.isPaymentApprovalFeatureEnabled) {
                paymentFilter.push("AND");
                paymentFilter.push(["status", "anyof", "VendPymt:V"]);
            }

            //Search Payments yet to be processed
            var paymentSearchObj = search.create({
                type: "vendorpayment",
                filters: paymentFilter,
                columns: column
            });
            var searchResultCount = paymentSearchObj.runPaged().count;
            log.debug("Count of payments to be posted: ", searchResultCount);
            paymentSearchObj.run().each(function (result) {
                var transaction = {};
                transaction.id = result.id;
                transaction.recordType = result.recordType;
                transaction.status = result.getValue(column[0]);
                transaction.vendorBillID = result.getValue(column[1]);
                transaction.paymentAmount = parseFloatOrZero(result.getValue(column[2]));
                paymentsArray.push(transaction);
                return true;
            });
            return paymentsArray;
        }


        return {
            getInputData: getInputData,
            map: map,
            reduce: reduce,
            summarize: summarize
        };
    });
