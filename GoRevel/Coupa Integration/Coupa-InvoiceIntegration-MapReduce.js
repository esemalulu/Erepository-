/**
 * @NApiVersion 2.1
 * @NScriptType MapReduceScript
 */

/*******************************************************************************
 *
 * Name: Coupa-InvoiceIntegration-MapReduce.js
 *
 * Script Type: Map/Reduce
 *
 * Description: Map/Reduce script for Integrating Invoice from Coupa to NetSuite
 *
 * Script Id: customscript_coupa_invoice_mr
 *
 * Deployment Id: customdeploy_coupa_invoice_mr
 ********************************************************************************/

define(['N/config', 'N/error', 'N/format', 'N/https', 'N/record', 'N/runtime', 'N/search', 'N/url', 'N/email', './Coupa-UtilityFunctionsModule', './Coupa - OpenIDConnect 2.0', './Coupa-InvoiceIntegration-VBModule', './Coupa-InvoiceIntegration-CNModule', './Coupa-InvoiceIntegration-InvToCNModule'],
    /**
     * @param{config} config
     * @param{error} error
     * @param{format} format
     * @param{https} https
     * @param{record} record
     * @param{runtime} runtime
     * @param{search} search
     * @param{url} url
     */
    (config, error, format, https, record, runtime, search, url, email, utility, oidc, vb, cn, invToCN) => {
        /**
         * Defines the function that is executed at the beginning of the map/reduce process and generates the input data.
         * @param {Object} inputContext
         * @param {boolean} inputContext.isRestarted - Indicates whether the current invocation of this function is the first
         *     invocation (if true, the current invocation is not the first invocation and this function has been restarted)
         * @param {Object} inputContext.ObjectRef - Object that references the input data
         * @typedef {Object} ObjectRef
         * @property {string|number} ObjectRef.id - Internal ID of the record instance that contains the input data
         * @property {string} ObjectRef.type - Type of the record instance that contains the input data
         * @returns {Array|Object|Search|ObjectRef|File|Query} The input data to use in the map/reduce process
         * @since 2015.2
         */

        const getInputData = (inputContext) => {
            const invoiceArray = [];
            let errordetails, errorcode;
            const configuration = utility.loadInvoiceConfiguration();
            log.debug({
                title: 'configuration',
                details: JSON.stringify(utility.getMaskedJSONObject(configuration))
            });
            let getURL = utility.createInvoiceGETURL(configuration);
            log.debug({
                title: 'getURL: ',
                details: getURL
            });
            try {
                let response = https.get({
                    url: getURL,
                    method: https.Method.GET,
                    headers: configuration.headers
                });

                let getResponseCode = response.code;
                let getResponseBody = response.body;

                if (getResponseCode == 200) {
                    if (getResponseBody && JSON.parse(getResponseBody)) {
                        getResponseBody = JSON.parse(getResponseBody);
                        if (getResponseBody.length == 0) {
                            log.audit({
                                title: 'No Invoices available to be integrated into NetSuite',
                                details: 'API Call returned ' + getResponseBody.length + ' invoices.'
                            });
                        } else {
                            log.audit({
                                title: 'Invoices to be integrated into NetSuite',
                                details: 'API Call returned ' + getResponseBody.length + ' invoices.'
                            });
                        }
                        for (let inv in getResponseBody) {
                            let object = {};
                            object.configuration = configuration;
                            object.invoicePayload = getResponseBody[inv];
                            object.type = "CREATE_OPERATION";
                            invoiceArray.push(object);
                        }
                    }
                } else if (getResponseCode == 401) {
                    let responsecode = "NetSuite received a non-200 response code: " + getResponseCode;
                    let e = error.create({
                        name: responsecode,
                        message: "Please verify the X-COUPA-API-KEY or OIDC parameters required for connection with Coupa.",
                        notifyOff: true
                    });
                    throw e;
                } else {
                    let responsecode = "NetSuite received a non-200 response code: " + getResponseCode;
                    let e = error.create({
                        name: responsecode,
                        message: getResponseBody,
                        notifyOff: true
                    });
                    throw e;
                }
            } catch (err) {
                if (err && err.name && err.message) {

                    errorcode = err.name;
                    switch (errorcode) {
                        case "SSS_REQUEST_TIME_EXCEEDED":
                            errordetails = "Connection closed because it has exceeded the time-out period (NetSuite has not received a response after 5 seconds on the initial connection or after 45 seconds on the request).";
                            break;
                        case "SSS_CONNECTION_TIME_OUT":
                            errordetails = "Connection closed because it has exceeded the time-out period (NetSuite has not received a response after 5 seconds on the initial connection or after 45 seconds on the request).";
                            break;
                        case "SSS_CONNECTION_CLOSED":
                            errordetails = "The connection closed because it was unresponsive.";
                            break;
                        case "SSS_INVALID_URL":
                            errordetails = "Connection closed because of an invalid URL.  The URL must be a fully qualified HTTP or HTTPS URL if it is referencing a non-NetSuite resource.  The URL cannot contain white space.";
                            break;
                        case "SSS_TIME_LIMIT_EXCEEDED":
                            errordetails = "NetSuite Suitescript execution time limit of 180 seconds exceeded. Exiting script.";
                            break;
                        case "SSS_USAGE_LIMIT_EXCEEDED":
                            errordetails = "NetSuite Suitescript usage limit exceeded. Exiting script.";
                            break;
                        default:
                            errordetails = err.message;
                    }
                    log.error({
                        title: 'Error while making a GET call to Coupa, Error: ',
                        details: errorcode + ' : ' + errordetails
                    });
                } else {
                    log.error({
                        title: 'Unexpected Error',
                        details: err.toString()
                    });
                }
                let emailSubject = configuration.accountName + ' Invoice Integration 2.x :Processing Error - Unable to do Coupa request api call to export Invoices';
                let emailBody = 'Error Code = ' + errorcode + ' Error Description = ' + errordetails;
                utility.sendErrorNotification(emailSubject, emailBody, configuration);
            }

            //Get Invoices to be voided
            log.debug({
                title: 'supportVoidingVendorBill flag: ',
                details: configuration.supportVoidingVendorBill
            });
            if (configuration.supportVoidingVendorBill) {
                let getVoidURL = utility.createInvoiceVoidGETURL(configuration);
                log.debug({
                    title: 'getVoidURL: ',
                    details: getVoidURL
                });
                try {
                    let response = https.get({
                        url: getVoidURL,
                        method: https.Method.GET,
                        headers: configuration.headers
                    });

                    let getVoidResponseCode = response.code;
                    let getVoidResponseBody = response.body;

                    if (getVoidResponseCode == 200) {
                        if (getVoidResponseBody && JSON.parse(getVoidResponseBody)) {
                            getVoidResponseBody = JSON.parse(getVoidResponseBody);
                            if (getVoidResponseBody.length == 0) {
                                log.audit({
                                    title: 'No Invoices available to be integrated into NetSuite',
                                    details: 'API Call returned ' + getVoidResponseBody.length + ' invoices.'
                                });
                            }
                            if (configuration.supportVoidingVendorBill) {
                                log.audit({
                                    title: 'Invoices to be voided into NetSuite',
                                    details: 'API Call returned ' + getVoidResponseBody.length + ' invoices.'
                                });
                            }
                            for (let inv in getVoidResponseBody) {
                                let object = {};
                                object.configuration = configuration;
                                object.invoicePayload = getVoidResponseBody[inv];
                                object.type = "VOID_OPERATION";
                                invoiceArray.push(object);
                            }
                        }
                    } else if (getVoidResponseCode == 401) {
                        let responsecode = "NetSuite received a non-200 response code for voided invoices API Call: " + getVoidResponseCode;
                        let e = error.create({
                            name: responsecode,
                            message: "Please verify the X-COUPA-API-KEY or OIDC parameters required for connection with Coupa.",
                            notifyOff: true
                        });
                        throw e;
                    } else {
                        let responsecode = "NetSuite received a non-200 response code for voided invoices API Call: " + getVoidResponseCode;
                        let e = error.create({
                            name: responsecode,
                            message: getVoidResponseBody,
                            notifyOff: true
                        });
                        throw e;
                    }
                } catch (err) {
                    if (err && err.name && err.message) {

                        errorcode = err.name;
                        switch (errorcode) {
                            case "SSS_REQUEST_TIME_EXCEEDED":
                                errordetails = "Connection closed because it has exceeded the time-out period (NetSuite has not received a response after 5 seconds on the initial connection or after 45 seconds on the request).";
                                break;
                            case "SSS_CONNECTION_TIME_OUT":
                                errordetails = "Connection closed because it has exceeded the time-out period (NetSuite has not received a response after 5 seconds on the initial connection or after 45 seconds on the request).";
                                break;
                            case "SSS_CONNECTION_CLOSED":
                                errordetails = "The connection closed because it was unresponsive.";
                                break;
                            case "SSS_INVALID_URL":
                                errordetails = "Connection closed because of an invalid URL.  The URL must be a fully qualified HTTP or HTTPS URL if it is referencing a non-NetSuite resource.  The URL cannot contain white space.";
                                break;
                            case "SSS_TIME_LIMIT_EXCEEDED":
                                errordetails = "NetSuite Suitescript execution time limit of 180 seconds exceeded. Exiting script.";
                                break;
                            case "SSS_USAGE_LIMIT_EXCEEDED":
                                errordetails = "NetSuite Suitescript usage limit exceeded. Exiting script.";
                                break;
                            default:
                                errordetails = err.message;
                        }
                        log.error({
                            title: 'Error while making a GET call for Voided Invoice to Coupa, Error: ',
                            details: errorcode + ' : ' + errordetails
                        });
                    } else {
                        log.error({
                            title: 'Unexpected Error  for voided invoices API Call',
                            details: err.toString()
                        });
                    }
                    let emailSubject = configuration.accountName + ' Invoice Integration 2.x :Processing Error - Unable to do Coupa request api call to export Invoices';
                    let emailBody = 'Error Code = ' + errorcode + ' Error Description = ' + errordetails
                    utility.sendErrorNotification(emailSubject, emailBody, configuration);
                }
            }
            let scriptContext = runtime.getCurrentScript();
            log.audit("Remaining Governance Units @ end of getInputData(): ", scriptContext.getRemainingUsage());
            return invoiceArray;
        }

        /**
         * Defines the function that is executed when the reduce entry point is triggered. This entry point is triggered
         * automatically when the associated map stage is complete. This function is applied to each group in the provided context.
         * @param {Object} reduceContext - Data collection containing the groups to process in the reduce stage. This parameter is
         *     provided automatically based on the results of the map stage.
         * @param {Iterator} reduceContext.errors - Serialized errors that were thrown during previous attempts to execute the
         *     reduce function on the current group
         * @param {number} reduceContext.executionNo - Number of times the reduce function has been executed on the current group
         * @param {boolean} reduceContext.isRestarted - Indicates whether the current invocation of this function is the first
         *     invocation (if true, the current invocation is not the first invocation and this function has been restarted)
         * @param {string} reduceContext.key - Key to be processed during the reduce stage
         * @param {List<String>} reduceContext.values - All values associated with a unique key that was passed to the reduce stage
         *     for processing
         * @since 2015.2
         */
        const reduce = (reduceContext) => {

            let scriptObject = runtime.getCurrentScript();
            log.audit("Reduce Stage Key: " + reduceContext.key, "Remaining governance units @ start of Reduce stage: " + scriptObject.getRemainingUsage());
            let operationResult = "";
            let value = reduceContext.values[0] ? JSON.parse(reduceContext.values[0]) : {};
            let configuration = value.configuration;
            let invoicePayload = value.invoicePayload;
            let invoiceStatus = value.type;
            try {
                if (!utility.skipVCInvoices(configuration, invoicePayload)) {
                    let operationType = utility.getTypeOfInvoice(invoicePayload);
                    if (invoiceStatus == "CREATE_OPERATION") {
                        log.debug({
                            title: "Validating Invoice Payload: ",
                            details: "Coupa Invoice ID " + value.invoicePayload.id
                        });
                        // if (utility.validateDocument(invoicePayload)) {
                        log.debug({
                            title: "Trying to Process Invoice with status: " + invoiceStatus,
                            details: "operationType: " + operationType + " | Coupa Invoice ID: " + invoicePayload.id
                        });
                        switch (operationType) {
                            case "NEGATIVE_AMT_INVOICE":
                                operationResult = invToCN.createVendorCreditFromInvoice(invoicePayload, configuration);             //TODO
                                break;
                            case "CREDIT_NOTE":
                                operationResult = cn.createVendorCreditFromCN(invoicePayload, configuration);                  //TODO
                                break;
                            case "POSITIVE_AMT_INVOICE":
                                operationResult = vb.createVendorBillFromInvoice(invoicePayload, configuration);
                                break;
                            default:
                                operationResult = "INVALID_OPERATION";
                        }
                        if (operationResult) {
                            let scriptObject = runtime.getCurrentScript();
                            log.audit("Reduce Stage Key: " + reduceContext.key, "Remaining governance units after creating the transaction in NetSuite: " + scriptObject.getRemainingUsage());
                            if (operationType == 'POSITIVE_AMT_INVOICE') {
                                if (isNaN(operationResult) && operationResult.indexOf('RECORD_UPDATED') > -1) {
                                    operationResult = operationResult.replace('RECORD_UPDATED', '');
                                    log.audit({
                                        title: 'RECORD_UPDATED_SUCCESSFULLY',
                                        details: 'Successfully updated transaction with ID vendorbill:' + operationResult + ' for Coupa Invoice with ID: ' + invoicePayload.id + '. Marking the transaction as exported in Coupa.'
                                    });
                                } else {
                                    log.audit({
                                        title: 'RECORD_CREATED_SUCCESSFULLY',
                                        details: 'Successfully created transaction with ID vendorbill:' + operationResult + ' for Coupa Invoice with ID: ' + invoicePayload.id + '. Marking the transaction as exported in Coupa.'
                                    });
                                }
                            } else {
                                log.audit({
                                    title: 'RECORD_CREATED_SUCCESSFULLY',
                                    details: 'Successfully created transaction with ID vendorcredit:' + operationResult + ' for Coupa Invoice with ID: ' + invoicePayload.id + '. Marking the transaction as exported in Coupa.'
                                });
                            }
                            let exportedFlag = utility.setDocumentAsExported(invoicePayload.id, configuration);
                            log.audit({
                                title: 'RECORD_EXPORTED_SUCCESSFULLY',
                                details: 'Successfully marked transaction with ID: ' + invoicePayload.id + ' exported.'
                            });
                            scriptObject = runtime.getCurrentScript();
                            log.audit("Reduce Stage Key: " + reduceContext.key, "Remaining governance units after marking the transaction as exported in Coupa: " + scriptObject.getRemainingUsage());
                        } else {
                            log.audit({
                                title: 'RECORD_NOT_CREATED',
                                details: 'Failed to create transaction for Coupa Invoice with ID: ' + invoicePayload.id + '. Not marking the transaction as exported in Coupa.'
                            });
                        }
                        /*} else {
                            log.audit({
                                title: "Invoice Integration skipped due to inconsistent signs for line and total amount",
                                details: JSON.stringify(value)
                            });
                        }*/
                    } else if (invoiceStatus == "VOID_OPERATION" && configuration.supportVoidingVendorBill) {
                        log.debug({
                            title: "Trying to Process Invoice with status: " + invoiceStatus,
                            details: "Coupa Invoice ID: " + invoicePayload.id
                        });
                        operationResult = utility.voidVendorBillFromInvoice(invoicePayload, configuration, operationType);
                        if (operationResult) {
                            log.audit({
                                title: 'Successfully voided invoice with ID: ' + invoicePayload.id,
                                details: 'Invoice Number: ' + invoicePayload["invoice-number"] + ' Supplier Name: ' + invoicePayload["supplier"]["name"]
                            });
                        } else {
                            log.audit({
                                title: 'Failed to void invoice with ID: ' + invoicePayload.id,
                                details: 'Invoice Number: ' + invoicePayload["invoice-number"] + ' Supplier Name: ' + invoicePayload["supplier"]["name"]
                            });
                        }
                    }
                }
                let scriptContext = runtime.getCurrentScript();
                log.audit("Remaining Governance Units @ end of reduce(): ", scriptContext.getRemainingUsage());
            } catch (e) {
                log.error({
                    title: 'Error in Reduce Stage while processing invoice - ' + invoicePayload.id,
                    details: JSON.stringify(e)
                });
                log.debug({
                    title: 'Error in Reduce Stage while processing invoice - ' + invoicePayload.id,
                    details: e
                });
                let errorMessage;
                if (e && e.message && e.stack) {
                    errorMessage = '<html><body>';
                    errorMessage += '<br>Coupa Invoice ID: ' + invoicePayload.id;
                    errorMessage += '<br>Error Name: ' + e.name;
                    errorMessage += '<br>Error Message: ' + e.message;
                    errorMessage += '<br>Error Type: ' + e.type;
                    errorMessage += '<br>Error Stacktrace: ' + e.stack;
                    errorMessage += '<br><br></body></html>';
                } else {
                    errorMessage = '<html><body>';
                    errorMessage += '<br>Coupa Invoice ID: ' + invoicePayload.id;
                    errorMessage += '<br>Error Message: ' + e;
                    errorMessage += '</body></html>';
                }
                throw errorMessage;
            }
            let scriptContext = runtime.getCurrentScript();
            log.audit("Remaining Governance Units @ end of reduce(): ", scriptContext.getRemainingUsage());
        }


        /**
         * Defines the function that is executed when the summarize entry point is triggered. This entry point is triggered
         * automatically when the associated reduce stage is complete. This function is applied to the entire result set.
         * @param {Object} summaryContext - Statistics about the execution of a map/reduce script
         * @param {number} summaryContext.concurrency - Maximum concurrency number when executing parallel tasks for the map/reduce
         *     script
         * @param {Date} summaryContext.dateCreated - The date and time when the map/reduce script began running
         * @param {boolean} summaryContext.isRestarted - Indicates whether the current invocation of this function is the first
         *     invocation (if true, the current invocation is not the first invocation and this function has been restarted)
         * @param {Iterator} summaryContext.output - Serialized keys and values that were saved as output during the reduce stage
         * @param {number} summaryContext.seconds - Total seconds elapsed when running the map/reduce script
         * @param {number} summaryContext.usage - Total number of governance usage units consumed when running the map/reduce
         *     script
         * @param {number} summaryContext.yields - Total number of yields when running the map/reduce script
         * @param {Object} summaryContext.inputSummary - Statistics about the input stage
         * @param {Object} summaryContext.mapSummary - Statistics about the map stage
         * @param {Object} summaryContext.reduceSummary - Statistics about the reduce stage
         * @since 2015.2
         */
        const summarize = (summaryContext) => {
            log.debug({
                title: 'summarize: ',
                details: JSON.stringify(summaryContext)
            });
            let contents = "Hello, <br><br> The Coupa Invoice integration script failed to process the below-mentioned records. Please find the error details below.<br><br>Thank you <br><br> <hr>";
            summaryContext.reduceSummary.errors.iterator().each(function (key, value) {
                contents += JSON.parse(value).message;
                return true;
            });
            if (contents) {           //If any Errors are reported in Reduce Summary send out an email to the Recipient/s in the script parameter
                let emailSubject = "Summary Email: Coupa - Invoice Integration 2.1 Processing Errors";
                let emailBody = contents;
                let configuration = utility.loadInvoiceConfiguration();
                utility.sendErrorNotification(emailSubject, emailBody, configuration);
            }
            log.debug('Summary Time', 'Total Seconds: ' + summaryContext.seconds);
            log.debug('Summary Usage', 'Total Usage: ' + summaryContext.usage);
            log.debug('Summary Yields', 'Total Yields: ' + summaryContext.yields);
            log.debug('Input Summary: ', JSON.stringify(summaryContext.inputSummary));
            log.debug('Reduce Summary: ', JSON.stringify(summaryContext.reduceSummary));
            let scriptContext = runtime.getCurrentScript();
            log.audit("Remaining Governance Units @ end of summarize(): ", scriptContext.getRemainingUsage());
            log.debug('——-SCRIPT——-', '——-END——-');
        }

        return {getInputData, reduce, summarize}

    });