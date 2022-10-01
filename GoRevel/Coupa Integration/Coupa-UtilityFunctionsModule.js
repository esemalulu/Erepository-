/**
 * @NApiVersion 2.1
 */
/*******************************************************************************
 *
 * Name: Coupa-UtilityFunctionsModule.js
 *
 * Script Type: SuiteScript 2.1 Module
 *
 * Description: Supporting functions for Invoice Integration scripts
 *
 * Parent Script Id/s: customscript_coupa_invoice_mr
 *
 * Parent Deployment Id/s: customdeploy_coupa_invoice_mr
 ********************************************************************************/
define(['N/https', 'N/record', 'N/runtime', 'N/search', 'N/email', 'N/error', 'N/config', "N/format", './Coupa - OpenIDConnect 2.0'],

    (https, record, runtime, search, email, error, config, format, oidc) => {

        /**
         * @description This method validates whether the NetSuite environment and the Coupa URL provided as the script parameter are compatible
         * @method
         * @param configuration
         * @return {boolean} flag
         * @author Yogesh Jagdale
         * @since 8.0.0
         */
        const isValidateEnvironment = (configuration) => {
            let url_test_contains = ["-train", "-dev", "-dmo", "-demo", "-qa", "-train", "-sandbox", "-sbx", "-stage", "-staging", "-stg", "-support", "-test", "-uat", "coupadev.com", "coupacloud.com"];
            let errorMessage = 'Error - script is running in non prod environment and not using a ' + url_test_contains + ' in the coupa URL. If you believe this to be incorrect, please contact Coupa Support';
            let thisEnv = runtime.envType;
            log.debug({
                title: 'Current NetSuite Environment Type: ',
                details: thisEnv
            });
            if (thisEnv !== 'PRODUCTION') {
                let test_url = false;
                let config = configuration;
                test_url = url_test_contains.filter(function (key) {
                    return config.host.indexOf(key) > -1;
                }).length > 0;
                log.debug({
                    title: 'test_url is',
                    details: test_url
                });
                if (!test_url) {
                    sendErrorNotification(subject, errorMessage, configuration);
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
         * @description This method returns the configuration object by sourcing all script parameters and can be replaced in future with Configuration Custom Record
         * @method
         * @return {Array|Object|Search|RecordRef} inputSummary
         * @author Yogesh Jagdale
         * @since 8.0.0
         */
        const loadInvoiceConfiguration = () => {
            let scriptRef = runtime.getCurrentScript();
            let configuration = {};
            let configRecObj = config.load({
                type: config.Type.COMPANY_INFORMATION
            });
            configuration.host = scriptRef.getParameter('custscript_coupa_inv_mr_host_url');                                //fieldType: Hyperlink
            configuration.apiKey = scriptRef.getParameter('custscript_coupa_inv_mr_api_key');                               //fieldType: Free-Form Text
            configuration.errorTo = scriptRef.getParameter('custscript_coupa_inv_mr_email_receiver');                       //fieldType: TextArea
            configuration.errorFrom = scriptRef.getParameter('custscript_coupa_inv_mr_email_sender') ? scriptRef.getParameter('custscript_coupa_inv_mr_email_sender') : '-5'; //fieldType: List/Record or Free-Form Text
            configuration.accountsPayableAccountNumber = scriptRef.getParameter('custscript_coupa_inv_mr_act_payable_num'); //fieldType: Free-Form Text
            configuration.accountSegment = scriptRef.getParameter('custscript_coupa_inv_mr_acc_seg');                       //fieldType: Free-Form Text
            configuration.departmentSegment = scriptRef.getParameter('custscript_coupa_inv_mr_dept_seg');                   //fieldType: Free-Form Text
            configuration.classSegment = scriptRef.getParameter('custscript_coupa_inv_mr_class_seg');                       //fieldType: Free-Form Text
            configuration.locationSegment = scriptRef.getParameter('custscript_coupa_inv_mr_loc_seg');                      //fieldType: Free-Form Text
            configuration.subsidiarySegment = scriptRef.getParameter('custscript_coupa_inv_mr_sub_seg');                    //fieldType: Free-Form Text
            configuration.exportFromInvoiceDate = scriptRef.getParameter('custscript_coupa_inv_mr_from_inv_date');          //fieldType: Date
            configuration.exportToInvoiceDate = scriptRef.getParameter('custscript_coupa_inv_mr_to_inv_date');              //fieldType: Date
            configuration.exportFromUpdatedAtDate = scriptRef.getParameter('custscript_coupa_inv_mr_from_upd_date');        //fieldType: Date
            configuration.exportToUpdatedAtDate = scriptRef.getParameter('custscript_coupa_inv_mr_to_upd_date');            //fieldType: Date
            configuration.customLineFields = scriptRef.getParameter('custscript_coupa_inv_mr_cust_line_fields');            //fieldType: TextArea
            configuration.customBodyFields = scriptRef.getParameter('custscript_coupa_inv_mr_cust_body_fields');            //fieldType: TextArea
            configuration.limitExportedRecordsTo = scriptRef.getParameter('custscript_coupa_inv_mr_inv_limit');             //fieldType: Free-Form Text
            configuration.postingPeriodCutoffDay = scriptRef.getParameter('custscript_coupa_inv_mr_cutoff_day');            //fieldType: Free-Form Text
            configuration.accountName = scriptRef.getParameter('custscript_coupa_inv_mr_account_name') ? scriptRef.getParameter('custscript_coupa_inv_mr_account_name') : configRecObj.getValue('companyname');  //fieldType: Free-Form Text
            configuration.invoiceURLLink = scriptRef.getParameter('custscript_coupa_inv_mr_inv_url_field');                 //fieldType: Free-Form Text
            configuration.invoiceImageURLLink = scriptRef.getParameter('custscript_coupa_inv_mr_image_url_field');          //fieldType: Free-Form Text
            configuration.invoiceAPIFilter = scriptRef.getParameter('custscript_coupa_inv_mr_inv_api_filter');              //fieldType: TextArea
            configuration.useExternalID = scriptRef.getParameter('custscript_coupa_inv_mr_use_ext_id');                     //fieldType: checkbox
            configuration.supportVoidingVendorBill = scriptRef.getParameter('custscript_coupa_inv_mr_support_void');        //fieldType: checkbox
            configuration.skipVCAndPOInvoices = scriptRef.getParameter('custscript_coupa_inv_mr_skip_vc_po_bill');          //fieldType: checkbox
            configuration.customForm = scriptRef.getParameter('custscript_coupa_inv_mr_custom_form');                       //fieldType:  Free-Form Text/TextArea
            configuration.useCoupaChargeDistribution = scriptRef.getParameter('custscript_coupa_inv_mr_use_coupa_distri');  //fieldType:  checkbox
            configuration.sendTaxCode = scriptRef.getParameter('custscript_coupa_inv_mr_send_taxcode');                     //fieldType:  checkbox
            configuration.skipCreditNotes = scriptRef.getParameter('custscript_coupa_inv_mr_skip_credit_note');             //fieldType:  checkbox
            configuration.customLocation = scriptRef.getParameter('custscript_coupa_inv_mr_custom_location');               //fieldType:  Free-Form Text
            configuration.useDynamicAccounting = scriptRef.getParameter('custscript_coupa_inv_mr_use_dynamic_acc');               //fieldType:  checkbox
            //TODO  Add limits,custom args params
            if (configuration.exportFromInvoiceDate) {
                configuration.exportFromInvoiceDate = format.format({
                    value: configuration.exportFromInvoiceDate,
                    type: format.Type.DATE
                });
            }
            if (configuration.exportToInvoiceDate) {
                configuration.exportToInvoiceDate = format.format({
                    value: configuration.exportToInvoiceDate,
                    type: format.Type.DATE
                });
            }
            if (configuration.exportFromUpdatedAtDate) {
                configuration.exportFromUpdatedAtDate = format.format({
                    value: configuration.exportFromUpdatedAtDate,
                    type: format.Type.DATE
                });
            }
            if (configuration.exportToUpdatedAtDate) {
                configuration.exportToUpdatedAtDate = format.format({
                    value: configuration.exportToUpdatedAtDate,
                    type: format.Type.DATE
                });
            }

            // Generate the API Headers
            let requestHeader = oidc.getAPIHeader();
            let headers = {};
            if (requestHeader) {
                headers = requestHeader;
            } else {
                headers = {
                    'Accept': 'application/json',
                    'X-COUPA-API-KEY': configuration.apiKey
                };
            }
            configuration.headers = headers;
            configuration.isOneWorldAccount = runtime.isFeatureInEffect({    //returns true if oneworld feature i.e subsidiary enabled or returns false
                feature: 'SUBSIDIARIES'
            });
            configuration.isMulticurrencyAccount = runtime.isFeatureInEffect({    //returns true if multicurrency feature i.e Multiple currency except USD enabled or returns false
                feature: 'multicurrency'
            });
            configuration.isVBApprovalEnabled = runtime.getCurrentUser().getPreference('CUSTOMAPPROVALVENDORBILL'); //returns true if Vendor Bills Approval Routing feature or returns false
            return configuration;
        }

        /**
         * @description This function returns the NetSuite date formatted as Coupa Date/time
         * @param netsuitedate
         * @return {string}
         * @author Yogesh Jagdale
         * @since 8.0.0
         */
        const netsuiteDateToCoupaDate = (netsuitedate) => {
            netsuitedate = new Date(netsuitedate);
            return netsuitedate.getFullYear() + "-" + ('0' + (netsuitedate.getMonth() + 1)).slice(-2) + "-" + ('0' + netsuitedate.getDate()).slice(-2) + "T00:00:00-08:00";
        }

        /**
         * @description This function returns the URL used to pull approved invoices to be integrated
         * @param configuration
         * @return {string}
         * @author Yogesh Jagdale
         * @since 8.0.0
         */
        const createInvoiceGETURL = (configuration) => {
            let baseURL = configuration.host;
            let getURL = baseURL + '/api/invoices?exported=false&status=approved';

            if (configuration.exportFromUpdatedAtDate || configuration.exportToUpdatedAtDate) {
                if (configuration.exportFromUpdatedAtDate) {
                    getURL = getURL + '&updated-at[gt_or_eq]=' + netsuiteDateToCoupaDate(configuration.exportFromUpdatedAtDate);
                }

                if (configuration.exportToUpdatedAtDate) {
                    getURL = getURL + '&updated-at[lt_or_eq]=' + netsuiteDateToCoupaDate(configuration.exportToUpdatedAtDate);
                }
            }

            if (configuration.exportFromInvoiceDate || configuration.exportToInvoiceDate) {
                if (configuration.exportFromInvoiceDate) {
                    getURL = getURL + '&invoice-date[gt_or_eq]=' + netsuiteDateToCoupaDate(configuration.exportFromInvoiceDate);
                }

                if (configuration.exportToInvoiceDate) {
                    getURL = getURL + '&invoice-date[lt_or_eq]=' + netsuiteDateToCoupaDate(configuration.exportToInvoiceDate);
                }
            }

            if (configuration.limitExportedRecordsTo) {
                getURL = getURL + '&limit=' + configuration.limitExportedRecordsTo;
            }

            if (configuration.invoiceAPIFilter) {
                getURL = getURL + configuration.invoiceAPIFilter;
            }
            return getURL;
        }

        /**
         * @description This function returns the URL used to pull voided invoices to be integrated
         * @param configuration
         * @return {string}
         * @author Yogesh Jagdale
         * @since 8.0.0
         */
        const createInvoiceVoidGETURL = (configuration) => {
            let baseURL = configuration.host;
            let getURL = baseURL + '/api/invoices?exported=false&status=voided';

            if (configuration.exportFromUpdatedAtDate || configuration.exportToUpdatedAtDate) {
                if (configuration.exportFromUpdatedAtDate) {
                    getURL = getURL + '&updated-at[gt_or_eq]=' + netsuiteDateToCoupaDate(configuration.exportFromUpdatedAtDate);
                }

                if (configuration.exportToUpdatedAtDate) {
                    getURL = getURL + '&updated-at[lt_or_eq]=' + netsuiteDateToCoupaDate(configuration.exportToUpdatedAtDate);
                }
            }

            if (configuration.exportFromInvoiceDate || configuration.exportToInvoiceDate) {
                if (configuration.exportFromInvoiceDate) {
                    getURL = getURL + '&invoice-date[gt_or_eq]=' + netsuiteDateToCoupaDate(configuration.exportFromInvoiceDate);
                }

                if (configuration.exportToInvoiceDate) {
                    getURL = getURL + '&invoice-date[lt_or_eq]=' + netsuiteDateToCoupaDate(configuration.exportToInvoiceDate);
                }
            }

            if (configuration.limitExportedRecordsTo) {
                getURL = getURL + '&limit=' + configuration.limitExportedRecordsTo;
            }

            if (configuration.invoiceAPIFilter) {
                getURL = getURL + configuration.invoiceAPIFilter;
            }
            return getURL;
        }

        /**
         * @description This function returns the type of integration operation to be performed
         * @param invoicePayload
         * @return {string}
         * @author Yogesh Jagdale
         * @since 8.0.0
         */
        const getTypeOfInvoice = (invoicePayload) => {
            let operationType = "";
            if (invoicePayload["total-with-taxes"] < 0 && invoicePayload["document-type"] == "Invoice") {
                operationType = "NEGATIVE_AMT_INVOICE";
            } else if (invoicePayload["document-type"] == "Credit Note") {
                operationType = "CREDIT_NOTE";
            } else if (invoicePayload["total-with-taxes"] >= 0 && invoicePayload["document-type"] == "Invoice") {
                operationType = "POSITIVE_AMT_INVOICE";
            }
            return operationType;
        }

        /**
         * @description This function returns the boolean flag after validating the document based on total amount.
         * @param document
         * @return {boolean}
         * @author Yogesh Jagdale
         * @since 8.0.0
         */
        const validateDocument = (document) => {
            let positiveFlag = false;
            let negativeFlag = false;
            for (let l in document["invoice-lines"]) {
                let linePayload = document["invoice-lines"][l];
                let TaxAmount = Number(linePayload["tax-amount"]) == 0 ? 1 : Number(linePayload["tax-amount"]);
                if ((Number(linePayload["accounting-total"]) * TaxAmount * Number(document["total-with-taxes"])) < 0) {
                    negativeFlag = true;
                } else {
                    positiveFlag = true;
                }
            }
            let mixedSignLines = (positiveFlag == negativeFlag ? false : true);
            log.debug({
                title: 'Is valid Invoice? ',
                details: mixedSignLines
            });
            return mixedSignLines
        }

        /**
         * @description This function returns the Vendor Bill's / Vendor Credit's ID for the Coupa Invoice / Credit Note transaction
         * @param vendorID
         * @param invoiceID
         * @param configuration
         * @param isCreditNote
         * @return {string}
         * @author Yogesh Jagdale
         * @since 8.0.0
         */
        const searchTransactionInNetSuite = (vendorID, invoiceID, configuration, isCreditNote) => {
            let transactionID = "";
            if (vendorID && invoiceID) {
                let searchFilters = [
                    ["type", "anyof", "VendBill", "VendCred"],
                    "AND",
                    ["mainline", "is", "T"],
                    "AND",
                    ["vendor.internalid", "anyof", vendorID]
                ];
                if (isCreditNote) {
                    searchFilters.push("AND");
                    searchFilters.push(["externalidstring", "is", "Coupa-VendorCredit-" + invoiceID]);
                } else {
                    searchFilters.push("AND");
                    searchFilters.push(["externalidstring", "is", "Coupa-VendorBill" + invoiceID]);
                }
                let searchColumns = [
                    search.createColumn({name: "tranid", label: "Document Number"}),
                    search.createColumn({name: "entity", label: "Name"}),
                    search.createColumn({name: "recordtype", label: "Record Type"})
                ];

                if (configuration && configuration.isVBApprovalEnabled) {
                    searchFilters.push("AND");
                    searchFilters.push(["status", "noneof", "VendBill:C", "VendBill:E"]);
                }
                let vendorbillSearchObj = search.create({
                    type: "transaction",
                    filters: searchFilters,
                    columns: searchColumns
                });
                let searchResultCount = vendorbillSearchObj.runPaged().count;
                //log.debug("Vendor Bill/Credit Search result count: ", searchResultCount);
                vendorbillSearchObj.run().each(function (result) {
                    log.audit({
                        title: 'INVOICE_ALREADY_INTEGRATED',
                        details: 'Coupa Invoice with ID: ' + invoiceID + ' already exists in NetSuite for Vendor: ' +
                            result.getValue(searchColumns[1]) + ' with Document Number: ' + result.getValue(searchColumns[0])
                            + ' ID: ' + result.getValue(searchColumns[2]) + ':' + result.id
                    })
                    transactionID = result.id;
                    return true;
                });
            }
            return transactionID;
        }

        /**
         * @description This function voids the vendor bill associated with Coupa's invoice & returns a boolean flag after voiding.
         * @param invoicePayload
         * @param configuration
         * @param operationType
         * @return {boolean}
         * @author Yogesh Jagdale
         * @since 8.0.0
         */
        const voidVendorBillFromInvoice = (invoicePayload, configuration, operationType) => {
            let isVBRoutingEnabled = configuration.isVBApprovalEnabled;
            let recordType = "";
            switch (operationType) {
                case "NEGATIVE_AMT_INVOICE":
                    recordType = "vendorcredit";
                    break;
                case "CREDIT_NOTE":
                    recordType = "vendorcredit";
                    break;
                case "POSITIVE_AMT_INVOICE":
                    recordType = "vendorbill";
                    break;
            }
            if (isVBRoutingEnabled && recordType != "vendorcredit") {
                let entity = invoicePayload["supplier"]["number"] ? invoicePayload["supplier"]["number"] : '';              //set the vendor id as default value
                let existingTransactionID = searchTransactionInNetSuite(entity, invoicePayload.id);
                if (existingTransactionID) {
                    try {
                        let recordObj = record.load({
                            type: recordType,
                            id: existingTransactionID
                        });
                        recordObj.setText({
                            fieldId: 'approvalstatus',
                            text: 'Rejected'
                        });
                        recordObj.save();
                        log.audit({
                            title: 'Successfully voided ' + (recordType == "vendorbill" ? "vendor bill" : "vendor credit"),
                            details: 'Invoice Number: ' + invoicePayload["invoice-number"] + ' Supplier Name: ' + invoicePayload["supplier"]["name"]
                        });
                        setDocumentAsExported(invoicePayload.id, configuration);
                        return true;
                    } catch (e) {
                        log.error({
                            title: 'Processing Error - Unable to void ' + (recordType == "vendorbill" ? "vendor bill" : "vendor credit"),
                            details: 'Invoice Number: ' + invoicePayload["invoice-number"] + ' Supplier Name: ' + invoicePayload["supplier"]["name"] + ' Error Description: ' + e.message
                        });
                        log.debug({
                            title: ' Error Details: ',
                            details: JSON.stringify(e)
                        });
                        let configRecObj = config.load({
                            type: config.Type.COMPANY_INFORMATION
                        });
                        let companyName = configRecObj.getValue('companyname');
                        let companyID = configRecObj.getValue('companyid');

                        let emailSubject = companyName + '(' + companyID + ') | Invoice Integration: Processing Error - Unable to void ' + (recordType == "vendorbill" ? "vendor bill" : "vendor credit");
                        let emailBody = 'Invoice Number: ' + invoicePayload["invoice-number"] + ' Supplier Name: ' + invoicePayload["supplier"]["name"] + ' Error Description: ' + e.message;
                        sendErrorNotification(emailSubject, emailBody, configuration);
                        return false;
                    }
                } else {
                    log.audit({
                        title: 'voidVendorBillFromInvoice: Unable to process the void transaction request for ' + invoicePayload["invoice-number"],
                        details: 'Vendor Bill not available in NetSuite'
                    });
                    return false;
                }
            } else {
                if (!isVBRoutingEnabled) {
                    log.audit({
                        title: 'Voiding operation for Invoice Number: ' + invoicePayload["invoice-number"] + ' skipped',
                        details: 'The vendor Bill Approval Routing feature is not enabled in the account. Please enable the feature to use Vendor Bill voiding functionality.'
                    });
                }
                if (recordType == "vendorcredit") {
                    log.audit({
                        title: 'Voiding operation for Invoice Number: ' + invoicePayload["invoice-number"] + ' skipped',
                        details: 'The script is unable to set the approval status to Rejected for the Credit Note to be voided. Reason: The Vendor Credit Approval Routing feature is not available in the NetSuite.'
                    });
                }
                log.audit({
                    title: 'voidVendorBillFromInvoice: Unable to process the void transaction request for ' + invoicePayload["invoice-number"],
                    details: 'Marking the Transaction as exported in Coupa'
                });
                setDocumentAsExported(invoicePayload.id, configuration);
                return false;
            }
        }

        /**
         * @description This function marks the Coupa transaction as exported & returns a boolean flag after exporting
         * @param invoiceID
         * @param configuration
         * @return {boolean}
         * @author Yogesh Jagdale
         * @since 8.0.0
         */
        const setDocumentAsExported = (invoiceID, configuration) => {
            let url = configuration.host + '/api/invoices/' + invoiceID + '?return_object=none&exported=true';
            let response, errorcode, getResponseCode;
            try {
                response = https.put({
                    url: url,
                    headers: configuration.headers
                });
                getResponseCode = response.code;
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
                        title: 'Error while marking invoice as exported, Error: ',
                        details: errorcode + ' : ' + errordetails
                    });
                } else {
                    log.error({
                        title: 'Unexpected Error',
                        details: err.toString()
                    });
                }
                let emailSubject = configuration.accountName + ' Invoice Integration 2.x :Processing Error - Unable to mark Invoice: ' + invoiceID + ' exported';
                let emailBody = 'Error Code = ' + errorcode + ' Error Description = ' + errordetails
                sendErrorNotification(emailSubject, emailBody, configuration);
            }

            if (response.code != '200') {
                let responsecode = "NetSuite received a non-200 response code: " + getResponseCode;
                let e = error.create({
                    name: responsecode,
                    message: "Processing Error - Unable to mark Invoice: " + invoiceID + " exported",
                    notifyOff: true
                });

                let emailSubject = configuration.accountName + ' Invoice Integration 2.x :Processing Error - Unable to mark Invoice: ' + invoiceID + ' exported';
                let emailBody = 'Error Code = ' + errorcode + ' Error Description = ' + errordetails;
                sendErrorNotification(emailSubject, emailBody, configuration);
                throw e;
            } else {
                return true;
            }
        }

        /**
         * @description This function returns the Posting Period ID based on the cutoff day provided in script parameter
         * @param dateString
         * @param configuration
         * @return string}
         * @author Yogesh Jagdale
         * @since 8.0.0
         */
        const processCutOff = (dateString, configuration) => {
            let postingPeriodId = "";
            let cutoffDay = configuration.postingPeriodCutoffDay ? configuration.postingPeriodCutoffDay : 5;
            let dateObj = convertCoupaDateToNetSuiteDate(dateString);
            let isNegativeCutoffDay = cutoffDay && parseFloat(cutoffDay) < 0 ? true : false;
            if (!isNegativeCutoffDay) {
                //Positive CutOff day
                postingPeriodId = processPositiveCutOff(dateObj, cutoffDay, dateString);
            } else {
                //Negative CutOff day
                postingPeriodId = processNegativeCutOff(dateObj, cutoffDay, dateString);
            }
            return postingPeriodId;
        }

        /**
         * @description This function returns the posting period's id when positive cutoff day is provided
         * @param dateObj
         * @param cutoffDay
         * @param dateString
         * @return string}
         * @author Yogesh Jagdale
         * @since 8.0.0
         */
        const processPositiveCutOff = (dateObj, cutoffDay, dateString) => {
            let postingPeriodId = "";
            log.debug({
                title: 'Processing Positive Cut off day: ' + cutoffDay,
                details: dateObj
            });
            let todaysDate = new Date();
            let invoiceDate = new Date(dateObj);
            if (todaysDate.getDate() > cutoffDay && todaysDate.getMonth() > invoiceDate.getMonth()) {
                //same month as of today's date
                /*log.debug({
                    title: 'todaysDate.getDate() > cutoffDay: ' + todaysDate.getDate() > cutoffDay,
                    details: 'todaysDate.getMonth() > invoiceDate.getMonth(): ' + todaysDate.getMonth() > invoiceDate.getMonth()
                });*/
                postingPeriodId = searchCutOffPostingPeriod(todaysDate);
            } else if (todaysDate.getDate() < cutoffDay && todaysDate.getMonth() > invoiceDate.getMonth()) {
                //same month as of invoice date
                /*log.debug({
                    title: 'todaysDate.getDate() < cutoffDay: ' + todaysDate.getDate() < cutoffDay,
                    details: 'todaysDate.getMonth() > invoiceDate.getMonth(): ' + todaysDate.getMonth() > invoiceDate.getMonth()
                });*/
                postingPeriodId = searchCutOffPostingPeriod(invoiceDate);
            } else {
                /*log.debug({
                    title: 'In Else condition for default case: ',
                    details: 'dateString: ' + dateString
                });*/
                postingPeriodId = searchCutOffPostingPeriod(invoiceDate);
            }
            return postingPeriodId;
        }

        /**
         * @description This function returns the posting period's id when negative cutoff day is provided
         * @param dateObj
         * @param cutoffDay
         * @param dateString
         * @return string}
         * @author Yogesh Jagdale
         * @since 8.0.0
         */
        const processNegativeCutOff = (dateObj, cutoffDay, dateString) => {
            let postingPeriodId = "";
            log.debug({
                title: 'Processing Negative Cut off day: ' + cutoffDay,
                details: 'Date Object: ' + dateObj
            });
            let todaysDate = new Date();
            let invoiceDate = new Date(dateObj);
            let maxDays = new Date(invoiceDate.getFullYear(), (invoiceDate.getMonth() + 1), 0).getDate();
            let thresholdDay = maxDays - Math.abs(parseFloat(cutoffDay));
            let monthDifference = monthDiff(todaysDate, invoiceDate);
            log.debug({
                title: 'MonthDifference: ' + monthDifference,
                details: 'Threshold Day of the month: ' + thresholdDay
            });
            if (todaysDate.getDate() > thresholdDay && todaysDate.getMonth() == invoiceDate.getMonth()) {
                //push to next month
                /*log.debug({
                    title: 'todaysDate.getDate() > thresholdDay: ' + (todaysDate.getDate() > thresholdDay),
                    details: 'todaysDate.getMonth() == invoiceDate.getMonth(): ' + (todaysDate.getMonth() == invoiceDate.getMonth())
                });*/
                postingPeriodId = searchCutOffPostingPeriod(invoiceDate.addMonths(1));
            } else if (todaysDate.getDate() < thresholdDay && todaysDate.getMonth() == invoiceDate.getMonth()) {
                //same month as of invoice date
                /*log.debug({
                    title: 'todaysDate.getDate() < thresholdDay: ' + todaysDate.getDate() < thresholdDay,
                    details: 'todaysDate.getMonth() == invoiceDate.getMonth(): ' + todaysDate.getMonth() == invoiceDate.getMonth()
                });*/
                postingPeriodId = searchCutOffPostingPeriod(invoiceDate);
            } else if (todaysDate.getDate() > thresholdDay && monthDifference < 0) {
                //same month as of today's date
                /*log.debug({
                    title: 'todaysDate.getDate() > thresholdDay: ' + todaysDate.getDate() > thresholdDay,
                    details: 'monthDifference < 0: ' + monthDifference < 0
                });*/
                postingPeriodId = searchCutOffPostingPeriod(todaysDate);
            } else {
                /*log.debug({
                    title: 'In Else condition for default case: ',
                    details: 'dateString: ' + invoiceDate
                });*/
                postingPeriodId = searchCutOffPostingPeriod(invoiceDate);
            }
            return postingPeriodId;
        }

        /**
         * @description This function searches the posting period record based on the date string provided
         * @param transactionDate
         * @return string}
         * @author Yogesh Jagdale
         * @since 8.0.0
         */
        const searchCutOffPostingPeriod = (transactionDate) => {
            log.debug('Searching Cutoff posting period: ', 'provided date: ' + transactionDate);
            let dateObj = transactionDate;
            let nsDate = format.format({
                value: dateObj,
                type: format.Type.DATE,
            });
            log.debug('NetSuite formatted date: ', nsDate);
            let postingPeriodId = null;

            let filters = [];
            let columns = [];

            filters.push(['startdate', search.Operator.ONORBEFORE, nsDate], 'and');
            filters.push(['enddate', search.Operator.ONORAFTER, nsDate], 'and');
            filters.push(['isinactive', search.Operator.IS, false], 'and');
            filters.push(['aplocked', search.Operator.IS, false], 'and');
            filters.push(['closed', search.Operator.IS, false], 'and');
            filters.push(['isquarter', search.Operator.IS, false], 'and');
            filters.push(['isyear', search.Operator.IS, false]);
            log.debug('Filters are: ', filters);

            columns.push(search.createColumn({
                name: 'startdate',
                sort: search.Sort.DESC,
            }));
            columns.push(search.createColumn({
                name: 'internalid'
            }));

            let periodSearch = search.create({
                type: search.Type.ACCOUNTING_PERIOD,
                filters: filters,
                columns: columns,
            });

            let result = periodSearch.run().getRange(0, 1);

            if (result != null && result.length > 0)
                postingPeriodId = result[0].getValue({
                    name: 'internalid',
                });

            log.debug('Posting Period', 'After first search, postingPeriodId searched: ' + postingPeriodId);

            if (!postingPeriodId) {
                log.debug('Posting Period', 'No posting period found by end date, searching first open period after transaction month.');
                let filters1 = [];
                let columns1 = [];

                filters1.push(['startdate', search.Operator.ONORAFTER, nsDate], 'and');
                filters1.push(['enddate', search.Operator.ONORAFTER, nsDate], 'and');
                filters1.push(['isinactive', search.Operator.IS, false], 'and');
                filters1.push(['aplocked', search.Operator.IS, false], 'and');
                filters1.push(['closed', search.Operator.IS, false], 'and');
                filters1.push(['isquarter', search.Operator.IS, false], 'and');
                filters1.push(['isyear', search.Operator.IS, false]);

                columns1.push(search.createColumn({
                    name: 'enddate',
                    sort: search.Sort.ASC,
                }));

                columns1.push(search.createColumn({
                    name: 'internalid'
                }));

                let periodSearch1 = search.create({
                    type: search.Type.ACCOUNTING_PERIOD,
                    filters: filters1,
                    columns: columns1,
                });
                let result1 = periodSearch1.run().getRange(0, 1); // returns only the
                log.debug('Posting Period', 'result1' + result1);
                if (result1 != null && result1.length > 0)
                    postingPeriodId = result1[0].getValue({
                        name: 'internalid',
                    });
                log.debug('Posting Period', 'After second search, postingPeriodId searched: ' + postingPeriodId);
            }
            return postingPeriodId;
        }

        /**
         * @description This function adds the months to the date object
         * @param months
         * @return {Date}
         * @author Yogesh Jagdale
         * @since 8.0.0
         */
        Date.prototype.addMonths = function (months) {
            let date = new Date(this.valueOf());
            date.setMonth(date.getMonth() + months);
            return date;
        }

        /**
         * @description This function returns the difference between two dates in months
         * @param months
         * @return {Date}
         * @author Yogesh Jagdale
         * @since 8.0.0
         */
        const monthDiff = (d1, d2) => {
            let months;
            months = (d2.getFullYear() - d1.getFullYear()) * 12;
            months -= d1.getMonth();
            months += d2.getMonth();
            return months;
        }

        /**
         * @description This function send Email notification
         * @param emailSubject
         * @param emailBody
         * @param configuration
         * @author Yogesh Jagdale
         * @since 8.0.0
         */
        const sendErrorNotification = (emailSubject, emailBody, configuration) => {
            let notification = {
                author: configuration.errorFrom,
                recipients: configuration.errorTo.split(","),
                subject: emailSubject || 'Coupa Invoice Integration Error',
                body: emailBody
            };
            email.send(notification);
            log.audit({
                title: 'Error notification email sent to: ',
                details: configuration.errorTo
            });
        }

        /**
         * @description This function parses the string to float and if the string is undefined returns 0(zero)
         * @param a
         * @return {number|number}
         * @author Yogesh Jagdale
         * @since 8.0.0
         */
        const parseFloatOrZero = (a) => {
            a = parseFloat(a);
            return isNaN(a) ? 0 : a;
        }

        /**
         * @description This function returns the internal ID of the record by the external id provided
         * @param externalId
         * @param recordType
         * @return {string}
         * @author Yogesh Jagdale
         * @since 8.0.0
         */
        const getInternalIDByExternalID = (externalId, recordType) => {
            let internalID = "";
            if (externalId) {
                let subsidiarySearchObj = search.create({
                    type: recordType,
                    filters: [
                        ["isinactive", "is", "F"],
                        "AND",
                        ["externalidstring", "is", externalId]
                    ],
                    columns: []
                });
                subsidiarySearchObj.run().each(function (result) {
                    internalID = result.id;
                    return true;
                });
            }
            log.debug({
                title: 'Returning Internal ID: ' + internalID + ' of ' + recordType + ' based on external ID' + externalId,
                details: recordType + ":" + internalID
            });
            return internalID;
        }

        /**
         * @description This function returns the internal ID of the account by account number
         * @param accountNumber
         * @return {string}
         * @author Yogesh Jagdale
         * @since 8.0.0
         */
        const getAccountIDByNumber = (accountNumber) => {
            let internalID = "";
            if (accountNumber) {
                let accountSearchObj = search.create({
                    type: "account",
                    filters:
                        [
                            ["number", "is", accountNumber],
                            "AND",
                            ["isinactive", "is", "F"]
                        ],
                    columns: []
                });
                accountSearchObj.run().each(function (result) {
                    internalID = result.id;
                    return true;
                });
            }
            log.debug({
                title: 'Returning Internal ID: ' + internalID + ' of Account based on account number: ' + accountNumber,
                details: "account" + ":" + internalID
            });
            return internalID;
        }

        /**
         * @description This function returns the internal ID of the currency by currency code
         * @param currencyCode
         * @return {string}
         * @author Yogesh Jagdale
         * @since 8.0.0
         */
        const getCurrencyIDByCode = (currencyCode) => {
            let internalID = "";
            if (currencyCode) {
                let currencySearchObj = search.create({
                    type: "currency",
                    filters:
                        [
                            ["symbol", "is", currencyCode],
                            "AND",
                            ["isinactive", "is", "F"]
                        ],
                    columns: []
                });
                currencySearchObj.run().each(function (result) {
                    internalID = result.id;
                    return true;
                });
            }
            log.debug({
                title: 'Returning Internal ID: ' + internalID + ' of Currency based on currency code: ' + currencyCode,
                details: "account" + ":" + internalID
            });
            return internalID;
        }

        /**
         * @description This function converts the Coupa transaction date to Netsuite compatible date
         * @param CoupaDate
         * @return {Date|string|number}
         * @author Yogesh Jagdale
         * @since 8.0.0
         */
        const convertCoupaDateToNetSuiteDate = (CoupaDate) => {
            let netSuiteDate = "";
            let dateSplitArray = CoupaDate.split('T');
            let datesplit = dateSplitArray[0].split('-');
            let year = datesplit[0];
            let day = datesplit[2];
            let month = datesplit[1];
            let dateString = month + '/' + day + '/' + year;
            try {
                netSuiteDate = format.format({
                    value: new Date(dateString),
                    type: format.Type.DATE
                });
                netSuiteDate = format.parse({
                    value: netSuiteDate,
                    type: format.Type.DATE
                });
            } catch (e) {
                netSuiteDate = new Date(month + '/' + day + '/' + year);
            }
            return netSuiteDate;
        }

        /**
         * @description This function calculates the proportion for charge based on the line amount and NetTotal of Invoice
         * @param lineAmount
         * @param LineNetTotal
         * @param charge
         * @return {number}
         * @author Yogesh Jagdale
         * @since 8.0.0
         */
        const calculateProportion = (lineAmount, LineNetTotal, charge) => {
            let calculatedCharge = 0;
            if (charge != 0 && LineNetTotal != 0 && lineAmount != 0) {
                calculatedCharge = (lineAmount / LineNetTotal) * charge;
            }
            return calculatedCharge;
        }

        /**
         * @description This function returns the configuration record for logging with API Key & OIDC header masked for security
         * @param configuration
         * @return {any}
         * @author Yogesh Jagdale
         * @since 8.0.0
         */
        const getMaskedJSONObject = (configuration) => {
            let returnObject = JSON.parse(JSON.stringify(configuration));
            try {
                returnObject.apiKey = returnObject.apiKey ? returnObject.apiKey.replace(/[A-Za-z0-9]/g, "*") : '';
                if (returnObject.headers.Authorization) {
                    returnObject.headers.Authorization = returnObject.headers.Authorization ? returnObject.headers.Authorization.replace(/[A-Za-z0-9]/g, "*") : '';
                }
                if (returnObject.headers['X-COUPA-API-KEY']) {
                    returnObject.headers['X-COUPA-API-KEY'] = returnObject.headers['X-COUPA-API-KEY'] ? returnObject.headers['X-COUPA-API-KEY'].replace(/[A-Za-z0-9]/g, "*") : '';
                }

                return returnObject
            } catch (e) {
                log.error({
                    title: 'Error in getMaskedJSONObject',
                    details: JSON.stringify(e)
                })
                return configuration
            }
        }

        /**
         * @description This function formats the amount in currency string based on the format selected by the company
         * @param rawNumber
         * @return {string}
         * @author Yogesh Jagdale
         * @since 8.0.0
         */
        const formatCurrency = (rawNumber) => {
            return format.format({value: rawNumber, type: format.Type.CURRENCY})
        }

        /**
         * @description This function sets the custom header level custom fields value
         * @param vendorBillRecord
         * @param invoicePayload
         * @param configuration
         * @return {*}
         * @author Yogesh Jagdale
         * @since 8.0.0
         */
        const setHeaderLevelCustomFields = (vendorBillRecord, invoicePayload, configuration) => {
            let headerCustomFields = getHeaderCustomFields(invoicePayload, configuration);
            /*log.debug({
                title: 'setHeaderLevelCustomFields => headerCustomFields',
                details: headerCustomFields
            });*/
            for (let key in headerCustomFields) {
                if (headerCustomFields.hasOwnProperty(key) && key.indexOf("DATE: ") < 0) {
                    vendorBillRecord.setValue({
                        fieldId: key,
                        value: headerCustomFields[key]
                    });
                } else {
                    //reconverting the date string to date object
                    if (headerCustomFields[key]) {
                        vendorBillRecord.setValue({
                            fieldId: key.replace("DATE: ", ""),
                            value: new Date(headerCustomFields[key])
                        });
                    }
                }
            }
            return vendorBillRecord;
        }

        /**
         * @description This function sets the custom line level custom fields value
         * @param vendorBillRecord
         * @param invoicePayload
         * @param configuration
         * @return {*}
         * @author Yogesh Jagdale
         * @since 8.0.0
         */
        const setLineLevelCustomFields = (vendorBillRecord, customLineFields, configuration) => {
            for (let key in customLineFields) {
                if (customLineFields.hasOwnProperty(key) && key.indexOf("DATE: ") < 0) {
                    vendorBillRecord.setCurrentSublistValue({
                        sublistId: 'expense',
                        fieldId: key,
                        value: customLineFields[key]
                    });
                } else if (typeof customLineFields[key] == 'object') {
                    vendorBillRecord.setCurrentSublistValue({
                        sublistId: 'expense',
                        fieldId: key,
                        value: customLineFields[key]
                    });
                } else {
                    //reconverting the date string to date object
                    if (customLineFields[key]) {
                        vendorBillRecord.setCurrentSublistValue({
                            sublistId: 'expense',
                            fieldId: key.replace("DATE: ", ""),
                            value: new Date(customLineFields[key])
                        });
                    }
                }
            }
            return vendorBillRecord;
        }

        /**
         * This function gets the value for header custom fields
         * @param invoicePayload
         * @param configuration
         * @return {{}}
         * @author Yogesh Jagdale
         * @since 8.0.0
         */
        const getHeaderCustomFields = (invoicePayload, configuration) => {
            let headerCustomFields = configuration.customBodyFields;
            if (headerCustomFields) {
                let custFieldSplit = headerCustomFields.split(';');
                let customFieldsMap = {};
                for (let i = 0; i < custFieldSplit.length; i++) {
                    let linePair = custFieldSplit[i];
                    let linePairSplit = linePair.split('==');
                    if (linePairSplit && linePairSplit.length == 2) {
                        customFieldsMap[linePairSplit[1]] = getCustomFieldValue(invoicePayload, linePairSplit[0]);
                        //log.debug("Header customCoupa Field Key: " + linePairSplit[0], "value fetched :" + getCustomFieldValue(invoicePayload, linePairSplit[0]));
                    } else if (linePairSplit && linePairSplit.length == 3) {
                        let coupaField = linePairSplit[0];
                        let nsField = linePairSplit[1];
                        let fieldType = linePairSplit[2];
                        if (fieldType == "DATE") {
                            customFieldsMap["DATE: " + linePairSplit[1]] = processDataTypeMapping(invoicePayload, coupaField, nsField, fieldType);
                        } else {
                            customFieldsMap[linePairSplit[1]] = processDataTypeMapping(invoicePayload, coupaField, nsField, fieldType);
                        }
                        //log.debug("Header customCoupa Field Key: " + linePairSplit[0], "value fetched :" + customFieldsMap[linePairSplit[1]]);
                    }
                }
                log.debug("HeaderCustomFields Map returned :", JSON.stringify(customFieldsMap));
                return customFieldsMap;
            }
        }

        /**
         * @description This function gets the value of line level custom field from a nested JSON
         * @param invoicePayload
         * @param configuration
         * @return {{}}
         * @author Yogesh Jagdale
         * @since 8.0.0
         */
        const getLineCustomFields = (invoicePayload, configuration, accountAllocation) => {
            let lineCustomFields = configuration.customLineFields;
            if (lineCustomFields) {
                let lineSplit = lineCustomFields.split(';');
                let customCoupa = {};
                for (let i = 0; i < lineSplit.length; i++) {
                    let linePair = lineSplit[i];
                    let linePairSplit = linePair.split('==');
                    if (linePairSplit && linePairSplit.length == 3) {
                        // customCoupa[linePairSplit[1]] = getCustomFieldValue(invoicePayload, linePairSplit[0]);
                        let coupaField = linePairSplit[0];
                        let nsField = linePairSplit[1];
                        let fieldType = linePairSplit[2];
                        if (fieldType == "DATE") {
                            customCoupa["DATE: " + linePairSplit[1]] = processDataTypeMapping(invoicePayload, coupaField, nsField, fieldType);
                        } else if (fieldType == "SEGMENT") {
                            if (accountAllocation) {
                                customCoupa[nsField] = processDataTypeMapping(accountAllocation, coupaField, nsField, fieldType);
                            } else {
                                log.debug("invoicePayload.account: ", JSON.stringify(invoicePayload.account));
                                customCoupa[nsField] = processDataTypeMapping(invoicePayload.account, coupaField, nsField, fieldType);
                            }
                        } else {
                            customCoupa[nsField] = processDataTypeMapping(invoicePayload, coupaField, nsField, fieldType);
                        }
                        // log.debug("Line customCoupa Field Key: " + coupaField, "value fetched :" + customCoupa[nsField]);
                    } else if (linePairSplit && linePairSplit.length == 2) {
                        customCoupa[linePairSplit[0]] = getCustomFieldValue(invoicePayload, linePairSplit[0]);
                        log.debug("The customCoupa value is :", getCustomFieldValue(invoicePayload, linePairSplit[0]));
                    }
                }
                log.debug("The customCoupa value is :", customCoupa);
                return customCoupa;
            }
        }

        /**
         * @description This function gets the value of line level custom field from a nested JSON
         * @param obj
         * @param prop
         * @param defval
         * @return {string|*}
         * @example charge-allocations.0.account.segment-4;
         * @author Yogesh Jagdale
         * @since 8.0.0
         */
        const getCustomFieldValue = (obj, prop, defval) => {
            //log.debug('In getCustomFieldValue: obj', JSON.stringify(obj));
            //log.debug('In getCustomFieldValue: prop', JSON.stringify(prop));
            if (typeof defval == 'undefined') {
                defval = "";
            }
            prop = prop.split('.');
            for (let i = 0; i < prop.length; i++) {
                if (typeof obj[prop[i]] == 'undefined')
                    return defval;
                obj = obj[prop[i]];
            }
            return obj;
        }

        /**
         * @description This function parses the value of custom field based on the field type selected
         * @param invoicePayload
         * @param coupaField
         * @param nsField
         * @param fieldType
         * @return {string|*}
         * @author Yogesh Jagdale
         * @since 8.0.0
         */
        const processDataTypeMapping = (invoicePayload, coupaField, nsField, fieldType) => {
            let value = getCustomFieldValue(invoicePayload, coupaField);

            switch (fieldType) {
                case "DATE":
                    if (value && value != undefined && value != null) {
                        let dateObj = convertCoupaDateToNetSuiteDate(value);
                        value = format.format({
                            value: dateObj,
                            type: format.Type.DATE
                        });
                        value = format.parse({
                            value: value,
                            type: format.Type.DATE
                        });
                    } else {
                        log.debug({title: 'Date not found', details: ''});
                    }
                    break;
                case "CHECKBOX":
                    value = (value == "true" || value == true ? true : false);
                    break;
                case "MULTI-SELECT":
                    value = getMultiSelectList(value, coupaField);
                    break;
                case "LOOKUP":
                    value = getLookupValue(value, coupaField);
                    break;
                case "SEGMENT":
                    value = getCustomFieldValue(invoicePayload, coupaField);
                    break;
                default:
                    value = getCustomFieldValue(invoicePayload, coupaField);
                    break;
            }
            //log.debug('Returning Field Value: ' + value, 'Field: ' + coupaField + ' | FieldType: ' + fieldType);
            return value;
        }

        /**
         * @description This function parses the payload of multi-select custom field and returns array of values to be set in NS
         * @param customFieldNode
         * @param customFieldId
         * @return {*[]}
         * @author Yogesh Jagdale
         * @since 8.0.0
         */
        const getMultiSelectList = (customFieldNode, customFieldId) => {
            let multiSelectArray = [];
            if (customFieldNode && customFieldNode.length > 0) {
                for (let i in customFieldNode) {
                    multiSelectArray.push(customFieldNode[i]["external-ref-num"]);
                }
            } else {
                log.audit("Multi-select field skipped", "Multi-select custom field not available in script parameter");
            }
            //log.audit("multiSelectArray returned from getMultiSelectList: ", JSON.stringify(multiSelectArray));
            return multiSelectArray;
        }

        /**
         * @description This function parses the payload of lookup custom field and returns internal id to be set as value
         * @param customFieldNode
         * @param customFieldId
         * @return {string}
         * @author Yogesh Jagdale
         * @since 8.0.0
         */
        const getLookupValue = (customFieldNode, customFieldId) => {
            let lookup = '';
            if (customFieldNode) {
                lookup = customFieldNode["external-ref-num"];
            } else {
                log.audit("Lookup field skipped", "Lookup custom field not available in script parameter");
            }

            return lookup;
        }

        /**
         * @description This function searches the billing term based on the termcode/name
         * @param customFieldNode
         * @param customFieldId
         * @return {string}
         * @author Yogesh Jagdale
         * @since 8.0.0
         */
        const searchTermID = (termCode) => {
            let internalID = "";
            if (termCode) {
                let termSearchObj = search.create({
                    type: "term",
                    filters:
                        [
                            ["name", "is", termCode],
                            "AND",
                            ["isinactive", "is", "F"]
                        ],
                    columns: []
                });
                termSearchObj.run().each(function (result) {
                    internalID = result.id;
                    return true;
                });
            }
            log.debug({
                title: 'Returning Internal ID: ' + internalID + ' of Billing term based on term code: ' + termCode,
                details: "term:" + internalID
            });
            return internalID;
        }

        /**
         * @description This function returns the line object for invoices with no split accounting and sendtaxcode set to false
         * @param invoiceLine
         * @param tempObject
         * @param configuration
         * @return {{}}
         * @author Yogesh Jagdale
         * @since 8.0.0
         */
        const getNonSplitAccountExpenseLine = (invoiceLine, tempObject, configuration, flipSignFlag, headerTaxArray, lineLevelTaxationFlag) => {
            let line = {};
            line.type = invoiceLine['type'];
            line.description = invoiceLine['description'];
            line.quantity = parseFloatOrZero(invoiceLine['quantity']);
            line.price = flipSignFlag ? flipSign(parseFloatOrZero(invoiceLine['price'])) : parseFloatOrZero(invoiceLine['price']);
            line.amount = flipSignFlag ? flipSign(parseFloatOrZero(invoiceLine['total'])) : parseFloatOrZero(invoiceLine['total']);
            log.debug({
                title: 'Use Charge Distribution provided by Coupa?',
                details: configuration.useCoupaChargeDistribution
            });
            if (!configuration.useCoupaChargeDistribution) {
                if (!lineLevelTaxationFlag) {
                    line.taxDistributionTotal = formatCurrency(calculateProportion(line.amount, tempObject.linesNetTotal, tempObject.taxAmount));
                } else {
                    line.taxDistributionTotal = 0;
                }
                line.shippingDistributionTotal = formatCurrency(calculateProportion(line.amount, tempObject.linesNetTotal, tempObject.totalShippingAmount));
                line.handlingDistributionTotal = formatCurrency(calculateProportion(line.amount, tempObject.linesNetTotal, tempObject.totalHandlingAmount));
                line.miscDistributionTotal = formatCurrency(calculateProportion(line.amount, tempObject.linesNetTotal, tempObject.totalMiscAmount));
            } else {
                line.taxDistributionTotal = formatCurrency(parseFloatOrZero(invoiceLine['tax-distribution-total']));
                line.shippingDistributionTotal = formatCurrency(parseFloatOrZero(invoiceLine['shipping-distribution-total']));
                line.handlingDistributionTotal = formatCurrency(parseFloatOrZero(invoiceLine['handling-distribution-total']));
                line.miscDistributionTotal = formatCurrency(parseFloatOrZero(invoiceLine['misc-distribution-total']));
            }
            line.subsidiary = invoiceLine['account'][configuration.subsidiarySegment] ? invoiceLine['account'][configuration.subsidiarySegment] : '';
            if (configuration.useDynamicAccounting) {
                line.account = invoiceLine['account'][configuration.accountSegment] ? invoiceLine['account'][configuration.accountSegment] : '';
            } else {
                line.account = invoiceLine['account'][configuration.accountSegment] ? invoiceLine['account'][configuration.accountSegment].split(':')[0] : '';
            }
            line.account = getAccountIDByNumber(line.account);
            if (configuration.useDynamicAccounting) {
                line.department = invoiceLine['account'][configuration.departmentSegment] ? invoiceLine['account'][configuration.departmentSegment] : '';
            } else {
                line.department = invoiceLine['account'][configuration.departmentSegment] ? invoiceLine['account'][configuration.departmentSegment].split(':')[1] : '';
            }
            if (configuration.useDynamicAccounting) {
                line.location = invoiceLine['account'][configuration.locationSegment] ? invoiceLine['account'][configuration.locationSegment] : '';
            } else {
                line.location = invoiceLine['account'][configuration.locationSegment] ? invoiceLine['account'][configuration.locationSegment].split(':')[1] : '';
            }
            if (configuration.customLocation) {
                let locationValue = invoiceLine ? getCustomFieldValue(invoiceLine, configuration.customLocation) : '';
                if (locationValue) {
                    line.location = getRecordIdbyName(record.Type.LOCATION, locationValue);
                } else {
                    line.location = "";
                }
            }
            if (configuration.useDynamicAccounting) {
                line.class = invoiceLine['account'][configuration.classSegment] ? invoiceLine['account'][configuration.classSegment] : '';
            } else {
                line.class = invoiceLine['account'][configuration.classSegment] ? invoiceLine['account'][configuration.classSegment].split(':')[1] : '';
            }
            line.hasTaxCodes = false;
            // check for Coupa order line
            if (invoiceLine['order-header-num'] && invoiceLine['order-line-num']) {
                line.poNumber = invoiceLine['order-header-num'] + '-' + invoiceLine['order-line-num'];
                line.poURL = configuration.host + "/order_headers/" + invoiceLine['order-header-num'] + "#po_lines";
            }
            let taxLines = invoiceLine['tax-lines'] && invoiceLine['tax-lines'].length > 0 ? invoiceLine['tax-lines'] : headerTaxArray;
            let taxLinesArray = [];
            for (let tl in taxLines) {
                if (taxLines[tl]) {
                    let taxLine = {};
                    taxLine.amount = parseFloatOrZero(taxLines[tl]['amount']);
                    if (lineLevelTaxationFlag) {
                        line.taxDistributionTotal += parseFloatOrZero(taxLines[tl]['amount']);
                    }
                    taxLine.code = taxLines[tl]['code'];
                    let taxCodeSplitArray = taxLines[tl].code ? taxLines[tl].code.split(':') : [];
                    taxLine.codeID = taxCodeSplitArray.length == 2 ? taxCodeSplitArray[1] : '';
                    if (taxLine.codeID) {
                        line.hasTaxCodes = true;
                    }
                    taxLine.rate = parseFloatOrZero(taxLines[tl]['rate']);
                    taxLinesArray.push(taxLine);
                }
            }
            if (lineLevelTaxationFlag) {
                line.taxDistributionTotal = formatCurrency(line.taxDistributionTotal);
            }
            line.taxLines = taxLinesArray;
            line.customLineFields = [];                                                                             //TODO Add function to extract line custom fields
            line.customLineFields = getLineCustomFields(invoiceLine, configuration, invoiceLine.account);
            return line;
        }

        /**
         * @description This function returns the line array for invoices with split accounting and sendtaxcode set to false
         * @param invoiceLine
         * @param tempObject
         * @param configuration
         * @return {{}}
         * @author Yogesh Jagdale
         * @since 8.0.0
         */
        const getSplitAccountExpenseLine = (invoiceLine, tempObject, configuration, flipSignFlag, headerTaxArray, lineLevelTaxationFlag) => {
            let lineArray = [];
            for (let acc in invoiceLine['account-allocations']) {
                let line = {};
                line.type = invoiceLine['type'];
                line.description = invoiceLine['description'];
                line.quantity = parseFloatOrZero(invoiceLine['quantity']);
                line.price = flipSignFlag ? flipSign(parseFloatOrZero(invoiceLine['price'])) : parseFloatOrZero(invoiceLine['price']);
                line.amount = flipSignFlag ? flipSign(parseFloatOrZero(invoiceLine['account-allocations'][acc]['amount'])) : parseFloatOrZero(invoiceLine['account-allocations'][acc]['amount']);
                //log.debug('line.amount', line.amount);
                log.debug({
                    title: 'Use Charge Distribution provided by Coupa?',
                    details: configuration.useCoupaChargeDistribution
                });
                if (!configuration.useCoupaChargeDistribution) {
                    if (!lineLevelTaxationFlag) {
                        line.taxDistributionTotal = formatCurrency(calculateProportion(line.amount, tempObject.linesNetTotal, tempObject.taxAmount));
                    } else {
                        line.taxDistributionTotal = 0;
                    }
                    line.shippingDistributionTotal = formatCurrency(calculateProportion(line.amount, tempObject.linesNetTotal, tempObject.totalShippingAmount));
                    line.handlingDistributionTotal = formatCurrency(calculateProportion(line.amount, tempObject.linesNetTotal, tempObject.totalHandlingAmount));
                    line.miscDistributionTotal = formatCurrency(calculateProportion(line.amount, tempObject.linesNetTotal, tempObject.totalMiscAmount));
                } else {
                    line.taxDistributionTotal = formatCurrency(parseFloatOrZero(invoiceLine['account-allocations'][acc]['tax-distribution-total']));
                    line.shippingDistributionTotal = formatCurrency(parseFloatOrZero(invoiceLine['account-allocations'][acc]['shipping-distribution-total']));
                    line.handlingDistributionTotal = formatCurrency(parseFloatOrZero(invoiceLine['account-allocations'][acc]['handling-distribution-total']));
                    line.miscDistributionTotal = formatCurrency(parseFloatOrZero(invoiceLine['account-allocations'][acc]['misc-distribution-total']));
                }
                line.subsidiary = invoiceLine['account-allocations'][acc]['account'][configuration.subsidiarySegment] ? invoiceLine['account-allocations'][acc]['account'][configuration.subsidiarySegment] : '';
                if (configuration.useDynamicAccounting) {
                    line.account = invoiceLine['account-allocations'][acc]['account'][configuration.accountSegment] ? invoiceLine['account-allocations'][acc]['account'][configuration.accountSegment] : '';
                } else {
                    line.account = invoiceLine['account-allocations'][acc]['account'][configuration.accountSegment] ? invoiceLine['account-allocations'][acc]['account'][configuration.accountSegment].split(':')[0] : '';
                }
                line.account = getAccountIDByNumber(line.account);
                if (configuration.useDynamicAccounting) {
                    line.department = invoiceLine['account-allocations'][acc]['account'][configuration.departmentSegment] ? invoiceLine['account-allocations'][acc]['account'][configuration.departmentSegment] : '';
                } else {
                    line.department = invoiceLine['account-allocations'][acc]['account'][configuration.departmentSegment] ? invoiceLine['account-allocations'][acc]['account'][configuration.departmentSegment].split(':')[1] : '';
                }
                if (configuration.useDynamicAccounting) {
                    line.location = invoiceLine['account-allocations'][acc]['account'][configuration.locationSegment] ? invoiceLine['account-allocations'][acc]['account'][configuration.locationSegment] : '';
                } else {
                    line.location = invoiceLine['account-allocations'][acc]['account'][configuration.locationSegment] ? invoiceLine['account-allocations'][acc]['account'][configuration.locationSegment].split(':')[1] : '';
                }
                if (configuration.customLocation) {
                    let locationValue = invoiceLine ? getCustomFieldValue(invoiceLine, configuration.customLocation) : '';
                    if (locationValue) {
                        line.location = getRecordIdbyName(record.Type.LOCATION, locationValue);
                    } else {
                        line.location = "";
                    }
                }
                if (configuration.useDynamicAccounting) {
                    line.class = invoiceLine['account-allocations'][acc]['account'][configuration.classSegment] ? invoiceLine['account-allocations'][acc]['account'][configuration.classSegment] : '';
                } else {
                    line.class = invoiceLine['account-allocations'][acc]['account'][configuration.classSegment] ? invoiceLine['account-allocations'][acc]['account'][configuration.classSegment].split(':')[1] : '';
                }
                line.hasTaxCodes = false;
                // check for Coupa order line
                if (invoiceLine['order-header-num'] && invoiceLine['order-line-num']) {
                    line.poNumber = invoiceLine['order-header-num'] + '-' + invoiceLine['order-line-num'];
                    line.poURL = configuration.host + "/order_headers/" + invoiceLine['order-header-num'] + "#po_lines";
                }
                let taxLines = invoiceLine['tax-lines'] && invoiceLine['tax-lines'].length > 0 ? invoiceLine['tax-lines'] : headerTaxArray;
                let taxLinesArray = [];
                for (let tl in taxLines) {
                    if (taxLines[tl]) {
                        let taxLine = {};
                        taxLine.amount = parseFloatOrZero(taxLines[tl]['amount']);
                        if (lineLevelTaxationFlag) {
                            line.taxDistributionTotal += parseFloatOrZero(calculateProportion(line.amount, parseFloatOrZero(invoiceLine['total']), parseFloatOrZero(taxLines[tl]['amount'])));
                        }
                        taxLine.code = taxLines[tl]['code'];
                        let taxCodeSplitArray = taxLines[tl].code ? taxLines[tl].code.split(':') : [];
                        taxLine.codeID = taxCodeSplitArray.length == 2 ? taxCodeSplitArray[1] : '';
                        if (taxLine.codeID) {
                            line.hasTaxCodes = true;
                        }
                        taxLine.rate = parseFloatOrZero(taxLines[tl]['rate']);
                        taxLinesArray.push(taxLine);
                    }
                }
                if (lineLevelTaxationFlag) {
                    line.taxDistributionTotal = formatCurrency(line.taxDistributionTotal);
                }
                line.taxLines = taxLinesArray;
                line.customLineFields = [];                                                                             //TODO Add function to extract line custom fields
                line.customLineFields = getLineCustomFields(invoiceLine, configuration, invoiceLine['account-allocations'][acc]['account']);
                lineArray.push(line);
            }
            return lineArray;
        }

        /**
         * @description This function returns the line array for invoices with no split accounting and sendtaxcode set to true with invoice lines along-with charge lines
         * @param invoiceLine
         * @param tempObject
         * @param configuration
         * @param chargesArray
         * @param flipSignFlag
         * @return {*[]}
         * @author Yogesh Jagdale
         * @since 8.0.0
         */
        const getNonSplitAccExpnsLineWithTaxCode = (invoiceLine, tempObject, configuration, chargesArray, flipSignFlag, headerTaxArray) => {
            let lineArray = [];
            let chargeType = ["totalShippingAmount", "totalHandlingAmount", "totalMiscAmount"];

            /*****************************************
             *
             *  Getting invoice line detail
             *
             *****************************************/
            let line = {};
            line.type = invoiceLine['type'];
            line.description = invoiceLine['description'];
            line.quantity = parseFloatOrZero(invoiceLine['quantity']);
            line.price = flipSignFlag ? flipSign(parseFloatOrZero(invoiceLine['price'])) : parseFloatOrZero(invoiceLine['price']);
            line.amount = flipSignFlag ? flipSign(parseFloatOrZero(invoiceLine['total'])) : parseFloatOrZero(invoiceLine['total']);
            //log.debug('line.amount', line.amount);
            log.debug({
                title: 'Use Charge Distribution provided by Coupa?',
                details: configuration.useCoupaChargeDistribution
            });
            line.taxDistributionTotal = formatCurrency(0);
            line.shippingDistributionTotal = formatCurrency(0);
            line.handlingDistributionTotal = formatCurrency(0);
            line.miscDistributionTotal = formatCurrency(0);
            line.subsidiary = invoiceLine['account'][configuration.subsidiarySegment] ? invoiceLine['account'][configuration.subsidiarySegment] : '';
            if (configuration.useDynamicAccounting) {
                line.account = invoiceLine['account'][configuration.accountSegment] ? invoiceLine['account'][configuration.accountSegment] : '';
            } else {
                line.account = invoiceLine['account'][configuration.accountSegment] ? invoiceLine['account'][configuration.accountSegment].split(':')[0] : '';
            }
            line.account = getAccountIDByNumber(line.account);
            if (configuration.useDynamicAccounting) {
                line.department = invoiceLine['account'][configuration.departmentSegment] ? invoiceLine['account'][configuration.departmentSegment] : '';
            } else {
                line.department = invoiceLine['account'][configuration.departmentSegment] ? invoiceLine['account'][configuration.departmentSegment].split(':')[1] : '';
            }
            if (configuration.useDynamicAccounting) {
                line.location = invoiceLine['account'][configuration.locationSegment] ? invoiceLine['account'][configuration.locationSegment] : '';
            } else {
                line.location = invoiceLine['account'][configuration.locationSegment] ? invoiceLine['account'][configuration.locationSegment].split(':')[1] : '';
            }
            if (configuration.customLocation) {
                let locationValue = invoiceLine ? getCustomFieldValue(invoiceLine, configuration.customLocation) : '';
                if (locationValue) {
                    line.location = getRecordIdbyName(record.Type.LOCATION, locationValue);
                } else {
                    line.location = "";
                }
            }
            if (configuration.useDynamicAccounting) {
                line.class = invoiceLine['account'][configuration.classSegment] ? invoiceLine['account'][configuration.classSegment] : '';
            } else {
                line.class = invoiceLine['account'][configuration.classSegment] ? invoiceLine['account'][configuration.classSegment].split(':')[1] : '';
            }
            line.hasTaxCodes = false;
            // check for Coupa order line
            if (invoiceLine['order-header-num'] && invoiceLine['order-line-num']) {
                line.poNumber = invoiceLine['order-header-num'] + '-' + invoiceLine['order-line-num'];
                line.poURL = configuration.host + "/order_headers/" + invoiceLine['order-header-num'] + "#po_lines";
            }
            let taxLines = invoiceLine['tax-lines'] && invoiceLine['tax-lines'].length > 0 ? invoiceLine['tax-lines'] : headerTaxArray;
            let taxLinesArray = [];
            for (let tl in taxLines) {
                let taxLine = {};
                taxLine.amount = parseFloatOrZero(taxLines[tl]['amount']);
                taxLine.code = taxLines[tl]['code'];
                let taxCodeSplitArray = taxLines[tl].code ? taxLines[tl].code.split(':') : [];
                taxLine.codeID = taxCodeSplitArray.length == 2 ? taxCodeSplitArray[1] : '';
                if (taxLine.codeID) {
                    line.hasTaxCodes = true;
                }
                taxLine.rate = parseFloatOrZero(taxLines[tl]['rate']);
                taxLinesArray.push(taxLine);
            }
            line.taxLines = taxLinesArray;
            line.customLineFields = [];
            line.customLineFields = getLineCustomFields(invoiceLine, configuration, invoiceLine.account);
            lineArray.push(line);

            /*****************************************
             *
             *  Getting charge details
             *
             *****************************************/

            for (let i in chargeType) {
                if (parseFloatOrZero(tempObject[chargeType[i]]) != 0) {
                    let chargeLine = {};
                    chargeLine.type = invoiceLine['type'];
                    chargeLine.description = chargeType[i].replace(/total|Amount/gi, '') + " Charges for Invoice line: " + invoiceLine['description'];
                    chargeLine.quantity = parseFloatOrZero(invoiceLine['quantity']);
                    chargeLine.price = tempObject[chargeType[i]];
                    chargeLine.amount = tempObject[chargeType[i]];
                    //log.debug('line.amount', chargeLine.amount);
                    log.debug({
                        title: 'Use Charge Distribution provided by Coupa?',
                        details: configuration.useCoupaChargeDistribution
                    });
                    chargeLine.taxDistributionTotal = formatCurrency(0);
                    chargeLine.shippingDistributionTotal = formatCurrency(0);
                    chargeLine.handlingDistributionTotal = formatCurrency(0);
                    chargeLine.miscDistributionTotal = formatCurrency(0);
                    chargeLine.subsidiary = invoiceLine['account'][configuration.subsidiarySegment] ? invoiceLine['account'][configuration.subsidiarySegment] : '';
                    if (configuration.useDynamicAccounting) {
                        chargeLine.account = invoiceLine['account'][configuration.accountSegment] ? invoiceLine['account'][configuration.accountSegment] : '';
                    } else {
                        chargeLine.account = invoiceLine['account'][configuration.accountSegment] ? invoiceLine['account'][configuration.accountSegment].split(':')[0] : '';
                    }
                    chargeLine.account = getAccountIDByNumber(chargeLine.account);
                    if (configuration.useDynamicAccounting) {
                        chargeLine.department = invoiceLine['account'][configuration.departmentSegment] ? invoiceLine['account'][configuration.departmentSegment] : '';
                    } else {
                        chargeLine.department = invoiceLine['account'][configuration.departmentSegment] ? invoiceLine['account'][configuration.departmentSegment].split(':')[1] : '';
                    }
                    if (configuration.useDynamicAccounting) {
                        chargeLine.location = invoiceLine['account'][configuration.locationSegment] ? invoiceLine['account'][configuration.locationSegment] : '';
                    } else {
                        chargeLine.location = invoiceLine['account'][configuration.locationSegment] ? invoiceLine['account'][configuration.locationSegment].split(':')[1] : '';
                    }
                    if (configuration.customLocation) {
                        let locationValue = invoiceLine ? getCustomFieldValue(invoiceLine, configuration.customLocation) : '';
                        if (locationValue) {
                            chargeLine.location = getRecordIdbyName(record.Type.LOCATION, locationValue);
                        } else {
                            chargeLine.location = "";
                        }
                    }
                    if (configuration.useDynamicAccounting) {
                        chargeLine.class = invoiceLine['account'][configuration.classSegment] ? invoiceLine['account'][configuration.classSegment] : '';
                    } else {
                        chargeLine.class = invoiceLine['account'][configuration.classSegment] ? invoiceLine['account'][configuration.classSegment].split(':')[1] : '';
                    }
                    chargeLine.hasTaxCodes = false;
                    // check for Coupa order line
                    if (invoiceLine['order-header-num'] && invoiceLine['order-line-num']) {
                        chargeLine.poNumber = invoiceLine['order-header-num'] + '-' + invoiceLine['order-line-num'];
                        chargeLine.poURL = configuration.host + "/order_headers/" + invoiceLine['order-header-num'] + "#po_lines";
                    }
                    log.audit('chargeType: ', JSON.stringify(chargeType));
                    let taxLinesArray = getChargeTaxLine(chargesArray, chargeType[i], flipSignFlag);
                    chargeLine.hasTaxCodes = taxLinesArray.hasTaxCodes;
                    chargeLine.taxLines = taxLinesArray.taxLines;
                    chargeLine.customLineFields = [];                                                                             //TODO Add function to extract line custom fields
                    chargeLine.customLineFields = getLineCustomFields(invoiceLine, configuration, invoiceLine.account);
                    lineArray.push(chargeLine);
                }
            }
            /*log.debug({
                title: tempObject.invoiceLineID + " with Charges",
                details: JSON.stringify(lineArray)
            });*/
            return lineArray;
        }

        /**
         * @description This function returns the line array for invoices with split accounting and sendtaxcode set to true with invoice lines along-with charge lines
         * @param invoiceLine
         * @param accountAllocation
         * @param tempObject
         * @param configuration
         * @param chargesArray
         * @param flipSignFlag
         * @return {*[]}
         * @author Yogesh Jagdale
         * @since 8.0.0
         */
        const getSplitAccExpnsLineWithTaxCode = (invoiceLine, accountAllocation, tempObject, configuration, chargesArray, flipSignFlag, headerTaxArray) => {
            let lineArray = [];
            let chargeType = ["totalShippingAmount", "totalHandlingAmount", "totalMiscAmount"];
            let line = {};
            line.type = invoiceLine['type'];
            line.description = invoiceLine['description'];
            line.quantity = parseFloatOrZero(invoiceLine['quantity']);
            line.price = flipSignFlag ? flipSign(parseFloatOrZero(invoiceLine['price'])) : parseFloatOrZero(invoiceLine['price']);
            line.amount = flipSignFlag ? flipSign(parseFloatOrZero(accountAllocation['amount'])) : parseFloatOrZero(accountAllocation['amount']);
            //log.debug('line.amount', line.amount);
            log.debug({
                title: 'Use Charge Distribution provided by Coupa?',
                details: configuration.useCoupaChargeDistribution
            });
            line.taxDistributionTotal = formatCurrency(0);
            line.shippingDistributionTotal = formatCurrency(0);
            line.handlingDistributionTotal = formatCurrency(0);
            line.miscDistributionTotal = formatCurrency(0);
            line.subsidiary = accountAllocation['account'][configuration.subsidiarySegment] ? accountAllocation['account'][configuration.subsidiarySegment] : '';
            if (configuration.useDynamicAccounting) {
                line.account = accountAllocation['account'][configuration.accountSegment] ? accountAllocation['account'][configuration.accountSegment] : '';
            } else {
                line.account = accountAllocation['account'][configuration.accountSegment] ? accountAllocation['account'][configuration.accountSegment].split(':')[0] : '';
            }
            line.account = getAccountIDByNumber(line.account);
            if (configuration.useDynamicAccounting) {
                line.department = accountAllocation['account'][configuration.departmentSegment] ? accountAllocation['account'][configuration.departmentSegment] : '';
            } else {
                line.department = accountAllocation['account'][configuration.departmentSegment] ? accountAllocation['account'][configuration.departmentSegment].split(':')[1] : '';
            }
            if (configuration.useDynamicAccounting) {
                line.location = accountAllocation['account'][configuration.locationSegment] ? accountAllocation['account'][configuration.locationSegment] : '';
            } else {
                line.location = accountAllocation['account'][configuration.locationSegment] ? accountAllocation['account'][configuration.locationSegment].split(':')[1] : '';
            }
            if (configuration.customLocation) {
                let locationValue = invoiceLine ? getCustomFieldValue(invoiceLine, configuration.customLocation) : '';
                if (locationValue) {
                    line.location = getRecordIdbyName(record.Type.LOCATION, locationValue);
                } else {
                    line.location = "";
                }
            }
            if (configuration.useDynamicAccounting) {
                line.class = accountAllocation['account'][configuration.classSegment] ? accountAllocation['account'][configuration.classSegment] : '';
            } else {
                line.class = accountAllocation['account'][configuration.classSegment] ? accountAllocation['account'][configuration.classSegment].split(':')[1] : '';
            }
            line.hasTaxCodes = false;
            // check for Coupa order line
            if (invoiceLine['order-header-num'] && invoiceLine['order-line-num']) {
                line.poNumber = invoiceLine['order-header-num'] + '-' + invoiceLine['order-line-num'];
                line.poURL = configuration.host + "/order_headers/" + invoiceLine['order-header-num'] + "#po_lines";
            }

            let taxLines = invoiceLine['tax-lines'] && invoiceLine['tax-lines'].length > 0 ? invoiceLine['tax-lines'] : headerTaxArray;
            let taxLinesArray = [];
            for (let tl in taxLines) {
                let taxLine = {};
                taxLine.amount = parseFloatOrZero(taxLines[tl]['amount']);
                taxLine.code = taxLines[tl]['code'];
                let taxCodeSplitArray = taxLines[tl].code ? taxLines[tl].code.split(':') : [];
                taxLine.codeID = taxCodeSplitArray.length == 2 ? taxCodeSplitArray[1] : '';
                if (taxLine.codeID) {
                    line.hasTaxCodes = true;
                }
                taxLine.rate = parseFloatOrZero(taxLines[tl]['rate']);
                taxLinesArray.push(taxLine);
            }
            line.taxLines = taxLinesArray;
            line.customLineFields = [];                                                                             //TODO Add function to extract line custom fields
            line.customLineFields = getLineCustomFields(invoiceLine, configuration, accountAllocation['account']);

            lineArray.push(line);


            /*****************************************
             *
             *  Getting charge details
             *
             *****************************************/

            for (let i in chargeType) {
                let chargeLine = {};
                chargeLine.type = invoiceLine['type'];
                chargeLine.description = chargeType[i].replace(/total|Amount/gi, '') + " Charges for Invoice line: " + invoiceLine['description'];
                chargeLine.quantity = parseFloatOrZero(invoiceLine['quantity']);
                chargeLine.price = tempObject[chargeType[i]];
                chargeLine.amount = tempObject[chargeType[i]];
                //log.debug('line.amount', chargeLine.amount);
                log.debug({
                    title: 'Use Charge Distribution provided by Coupa?',
                    details: configuration.useCoupaChargeDistribution
                });
                chargeLine.taxDistributionTotal = formatCurrency(0);
                chargeLine.shippingDistributionTotal = formatCurrency(0);
                chargeLine.handlingDistributionTotal = formatCurrency(0);
                chargeLine.miscDistributionTotal = formatCurrency(0);
                chargeLine.subsidiary = accountAllocation['account'][configuration.subsidiarySegment] ? accountAllocation['account'][configuration.subsidiarySegment] : '';
                if (configuration.useDynamicAccounting) {
                    chargeLine.account = accountAllocation['account'][configuration.accountSegment] ? accountAllocation['account'][configuration.accountSegment] : '';
                } else {
                    chargeLine.account = accountAllocation['account'][configuration.accountSegment] ? accountAllocation['account'][configuration.accountSegment].split(':')[0] : '';
                }
                chargeLine.account = getAccountIDByNumber(chargeLine.account);
                if (configuration.useDynamicAccounting) {
                    chargeLine.department = accountAllocation['account'][configuration.departmentSegment] ? accountAllocation['account'][configuration.departmentSegment] : '';
                } else {
                    chargeLine.department = accountAllocation['account'][configuration.departmentSegment] ? accountAllocation['account'][configuration.departmentSegment].split(':')[1] : '';
                }
                if (configuration.useDynamicAccounting) {
                    chargeLine.location = accountAllocation['account'][configuration.locationSegment] ? accountAllocation['account'][configuration.locationSegment] : '';
                } else {
                    chargeLine.location = accountAllocation['account'][configuration.locationSegment] ? accountAllocation['account'][configuration.locationSegment].split(':')[1] : '';
                }
                if (configuration.customLocation) {
                    let locationValue = invoiceLine ? getCustomFieldValue(invoiceLine, configuration.customLocation) : '';
                    if (locationValue) {
                        chargeLine.location = getRecordIdbyName(record.Type.LOCATION, locationValue);
                    } else {
                        chargeLine.location = "";
                    }
                }
                if (configuration.useDynamicAccounting) {
                    chargeLine.class = accountAllocation['account'][configuration.classSegment] ? accountAllocation['account'][configuration.classSegment] : '';
                } else {
                    chargeLine.class = accountAllocation['account'][configuration.classSegment] ? accountAllocation['account'][configuration.classSegment].split(':')[1] : '';
                }
                chargeLine.hasTaxCodes = false;
                // check for Coupa order line
                if (invoiceLine['order-header-num'] && invoiceLine['order-line-num']) {
                    chargeLine.poNumber = invoiceLine['order-header-num'] + '-' + invoiceLine['order-line-num'];
                    chargeLine.poURL = configuration.host + "/order_headers/" + invoiceLine['order-header-num'] + "#po_lines";
                }
                log.audit('chargeType: ', JSON.stringify(chargeType));
                let taxLinesArray = getChargeTaxLine(chargesArray, chargeType[i], flipSignFlag);
                chargeLine.hasTaxCodes = taxLinesArray.hasTaxCodes;
                chargeLine.taxLines = taxLinesArray.taxLines;
                chargeLine.customLineFields = [];                                                                             //TODO Add function to extract line custom fields
                chargeLine.customLineFields = getLineCustomFields(invoiceLine, configuration, accountAllocation['account']);
                lineArray.push(chargeLine);
            }
            /*log.debug({
                title: tempObject.invoiceLineID + " with Charges",
                details: JSON.stringify(lineArray)
            });*/
            return lineArray;
        }

        /**
         * @description This function sets the values to expense sublist based on the invoiceLinesArray array
         * @param configuration
         * @param vendorBillRecord
         * @param chargesArray
         * @param invoiceLinesArray
         * @param invoicePayload
         * @param flipSignFlag
         * @return {boolean|*}
         * @author Yogesh Jagdale
         * @since 8.0.0
         */
        const setExpenseSublist = (configuration, vendorBillRecord, chargesArray, invoiceLinesArray, invoicePayload, flipSignFlag) => {
            let departmentID, accountID, locationID, classID;
            try {
                for (let i in invoiceLinesArray) {
                    vendorBillRecord.selectNewLine({sublistId: 'expense'});
                    vendorBillRecord.setCurrentSublistValue({
                        sublistId: 'expense',
                        fieldId: 'memo',
                        value: invoiceLinesArray[i]["description"],
                    });

                    /****************************
                     *
                     *  Set Department at line level
                     *
                     ****************************/

                    if (configuration.useExternalID && invoiceLinesArray[i]["department"]) {
                        departmentID = getInternalIDByExternalID(invoiceLinesArray[i]["department"], 'department');
                    } else {
                        departmentID = invoiceLinesArray[i]["department"];
                    }
                    vendorBillRecord.setCurrentSublistValue({
                        sublistId: 'expense',
                        fieldId: 'department',
                        value: departmentID,
                    });

                    /****************************
                     *
                     *  Set Account at line level
                     *
                     ****************************/

                    if (configuration.useExternalID && invoiceLinesArray[i]["account"]) {
                        accountID = getInternalIDByExternalID(invoiceLinesArray[i]["account"], 'account');
                    } else {
                        accountID = invoiceLinesArray[i]["account"];
                    }
                    vendorBillRecord.setCurrentSublistValue({
                        sublistId: 'expense',
                        fieldId: 'account',
                        value: accountID,
                    });

                    /****************************
                     *
                     *  Set Location at line level
                     *
                     ****************************/

                    if (configuration.useExternalID && invoiceLinesArray[i]["location"]) {
                        locationID = getInternalIDByExternalID(invoiceLinesArray[i]["location"], 'location');
                    } else {
                        locationID = invoiceLinesArray[i]["location"];
                    }
                    vendorBillRecord.setCurrentSublistValue({
                        sublistId: 'expense',
                        fieldId: 'location',
                        value: locationID,
                    });

                    /****************************
                     *
                     *  Set Class at line level
                     *
                     ****************************/

                    if (configuration.useExternalID && invoiceLinesArray[i]["class"]) {
                        classID = getInternalIDByExternalID(invoiceLinesArray[i]["class"], 'class');
                    } else {
                        classID = invoiceLinesArray[i]["class"];
                    }
                    vendorBillRecord.setCurrentSublistValue({
                        sublistId: 'expense',
                        fieldId: 'class',
                        value: classID,
                    });

                    /****************************
                     *
                     *  Set Amount at line level
                     *
                     ****************************/
                    let lineAmount;
                    if (invoiceLinesArray[i]['hasTaxCodes']) {

                        lineAmount = parseFloatOrZero(invoiceLinesArray[i]["amount"]) +
                            parseFloatOrZero(invoiceLinesArray[i]["shippingDistributionTotal"]) +
                            parseFloatOrZero(invoiceLinesArray[i]["handlingDistributionTotal"]) +
                            parseFloatOrZero(invoiceLinesArray[i]["miscDistributionTotal"]);
                        log.debug({
                            title: 'Invoice: ' + invoicePayload.id + ' Line -' + (parseFloatOrZero(i) + 1) + ' - Calculated line amount: ' + formatCurrency(parseFloatOrZero(lineAmount)),
                            details: "Invoice Line Total: " + invoiceLinesArray[i]["amount"] + " | Shipping Distribution Total: " +
                                invoiceLinesArray[i]["shippingDistributionTotal"] + " | Handling Distribution Total: " + invoiceLinesArray[i]["handlingDistributionTotal"]
                                + " | Misc Distribution Total: " + invoiceLinesArray[i]["miscDistributionTotal"]
                        });

                    } else {
                        lineAmount = parseFloatOrZero(invoiceLinesArray[i]["amount"]) +
                            parseFloatOrZero(invoiceLinesArray[i]["taxDistributionTotal"]) +
                            parseFloatOrZero(invoiceLinesArray[i]["shippingDistributionTotal"]) +
                            parseFloatOrZero(invoiceLinesArray[i]["handlingDistributionTotal"]) +
                            parseFloatOrZero(invoiceLinesArray[i]["miscDistributionTotal"]);

                        log.debug({
                            title: 'Invoice: ' + invoicePayload.id + ' Line -' + (parseFloatOrZero(i) + 1) + ' - Calculated line amount: ' + formatCurrency(parseFloatOrZero(lineAmount)),
                            details: "Invoice Line Total: " + invoiceLinesArray[i]["amount"] + " | Tax Distribution Total: " +
                                invoiceLinesArray[i]["taxDistributionTotal"] + " | Shipping Distribution Total: " +
                                invoiceLinesArray[i]["shippingDistributionTotal"] + " | Handling Distribution Total: " + invoiceLinesArray[i]["handlingDistributionTotal"]
                                + " | Misc Distribution Total: " + invoiceLinesArray[i]["miscDistributionTotal"]
                        });
                    }
                    vendorBillRecord.setCurrentSublistValue({
                        sublistId: 'expense',
                        fieldId: 'amount',
                        value: parseFloatOrZero(lineAmount),
                    });

                    /****************************
                     *
                     *  Set taxcode
                     *
                     ****************************/

                    if (invoiceLinesArray[i]['hasTaxCodes']) {
                        vendorBillRecord.setCurrentSublistValue({
                            sublistId: 'expense',
                            fieldId: 'taxcode',
                            value: invoiceLinesArray[i]["taxLines"][0]["codeID"],
                        });
                    }

                    /********************************
                     *
                     *  Setting Purchase Order Number
                     *
                     ********************************/

                    // check for Coupa order line
                    if (invoiceLinesArray[i]["poNumber"]) {
                        vendorBillRecord.setCurrentSublistValue({
                            sublistId: 'expense',
                            fieldId: 'custcol_coupaponum',
                            value: invoiceLinesArray[i]["poNumber"]
                        });
                    }

                    if (invoiceLinesArray[i]["poURL"]) {
                        vendorBillRecord.setCurrentSublistValue({
                            sublistId: 'expense',
                            fieldId: 'custcol_coupa_po_url',
                            value: invoiceLinesArray[i]["poURL"]
                        });
                    }

                    /********************************
                     *
                     *  Setting Line Custom Fields
                     *
                     ********************************/

                    vendorBillRecord = setLineLevelCustomFields(vendorBillRecord, invoiceLinesArray[i]["customLineFields"], configuration);

                    /****************************
                     *
                     *  Commit line to sublist
                     *
                     ****************************/

                    vendorBillRecord.commitLine({
                        sublistId: 'expense'
                    });
                }
                return vendorBillRecord;
            } catch (e) {
                log.error({
                    title: 'Error occurred while setting line expenses',
                    details: JSON.stringify(e)
                });
                throw e;        //return false
            }
        }

        /**
         * @description This function retutnrs the amount with flipped sign; positive amount is converted to negative and negative is converted to positive
         * @param num
         * @return {number|*}
         * @author Yogesh Jagdale
         * @since 8.0.0
         */
        const flipSign = (num) => {
            if (parseFloatOrZero(num) != 0) {
                return parseFloatOrZero(num) * -1
            }
            return num;
        }

        /**
         * @description This function validates the type of invoice and returns true if the invoice has payment channel as coupapay_virtual_card_po and skipVCAndPOInvoices parameter checked
         * @param configuration
         * @param invoicePayload
         * @return {boolean}
         * @author Yogesh Jagdale
         * @since 8.0.0
         */
        const skipVCInvoices = (configuration, invoicePayload) => {
            let skipVCInvoices = false;
            let paymentChannel = invoicePayload["payment-channel"];
            if (configuration.skipVCAndPOInvoices && paymentChannel == 'coupapay_virtual_card_po') {
                log.audit({
                    title: 'Skipping Vendor Bill creation',
                    details: 'Skipping vendor bill creation  & not marking invoice ' + invoicePayload.id + ' number: ' + invoicePayload['invoice-number'] + ' exported as it is for payment channel: "Coupa Pay - Virtual card for PO"'
                });
                skipVCInvoices = true;
            }
            return skipVCInvoices;
        }

        /**
         * @description This function returns the Record ID by Name of the record
         * @param recordType
         * @param recordName
         * @return {string}
         * @author Yogesh Jagdale
         * @since 8.0.0
         */
        const getRecordIdbyName = (recordType, recordName) => {
            let internalID = "";
            if (recordName) {
                let searchObj = search.create({
                    type: recordType,
                    filters:
                        [
                            ["namenohierarchy", "is", recordName]
                        ],
                    columns: []
                });
                let searchResultCount = searchObj.runPaged().count;
                log.debug(recordType + " Search Obj result count: ", searchResultCount);
                searchObj.run().each(function (result) {
                    internalID = result.id;
                    return true;
                });

                if (!internalID) {
                    log.error({
                        title: 'Error getting ID for record type: ' + recordType,
                        details: 'recordName: ' + recordName
                    });
                }
            }
            return internalID;
        }

        /**
         * @description This function creates payment for the Vendor Bill when payment channel is coupapay_virtual_card_po
         * @param vendorBill
         * @author Yogesh Jagdale
         * @since 8.0.0
         */
        const createCoupaPayPayment = (vendorBillID) => {
            try {
                let vendorBill = record.load({
                    type: record.Type.VENDOR_BILL,
                    id: vendorBillID,
                    isDynamic: true
                });
                let vendorBillId = vendorBill.getValue({
                    fieldId: 'id'
                });
                let billTotalAmount = vendorBill.getValue({
                    fieldId: 'total'
                });
                let billCurrency = vendorBill.getValue({
                    fieldId: 'currency'
                });
                log.audit({
                    title: 'Transforming the Vendor bill to Payment',
                    details: 'Marking VendorBill ID ' + vendorBillId + ' as paid, as it is backed by a VirtualCard PO'
                });

                let vendorPayment = record.transform({
                    fromType: record.Type.VENDOR_BILL,
                    fromId: vendorBillId,
                    toType: record.Type.VENDOR_PAYMENT,
                    isDynamic: true
                });

                vendorPayment.setValue({
                    fieldId: 'currency',
                    value: billCurrency
                });
                let lineIndex = vendorPayment.findSublistLineWithValue({
                    sublistId: 'apply',
                    fieldId: 'doc',
                    value: vendorBillID
                });
                if (lineIndex == -1) {
                    log.audit({
                        title: 'No Vendor Bill found with id: ',
                        details: vendorBillID
                    });
                    throw 'No Vendor Bill found with id: ' + vendorBillID + '. Failed to create vendor bill payment.';
                } else {
                    vendorPayment.selectLine({
                        sublistId: 'apply',
                        line: lineIndex
                    });
                    vendorPayment.setCurrentSublistValue({
                        sublistId: 'apply',
                        fieldId: 'apply',
                        value: true
                    });
                    vendorPayment.commitLine({
                        sublistId: 'apply'
                    });
                }
                vendorPayment.setValue({
                    fieldId: 'externalid',
                    value: 'Processed-CoupaPayVirtualCard' + vendorBillID
                });
                let vendorPaymentID = vendorPayment.save({
                    ignoreMandatoryFields: true,
                    enableSourcing: true
                });
                log.audit({
                    title: 'VENDOR_PAYMENT_CREATED',
                    details: 'Successfully created vendorpayment:' + vendorPaymentID
                });
                log.debug({
                    title: 'VENDOR_PAYMENT_CREATED',
                    details: 'Successfully marked VendorBill ID ' + vendorBillId + ' as paid'
                });
            } catch (e) {
                log.error({
                    title: 'Error while creating payment record in NetSuite',
                    details: JSON.stringify(e)
                });
                log.debug({
                    title: 'Error while creating payment record in NetSuite',
                    details: e
                });
                throw e;
            }
        }

        /**
         * @description This function returns tax amounts based on tax code
         * NIB# 515
         * @param chargesArray
         * @param chargeType
         * @return {number|PaymentItem|number|*}
         * @author Yogesh Jagdale
         * @since 8.1.0
         */
        const getChargeTotal = (chargesArray, chargeType) => {
            let object = chargesArray.find((o, i) => {
                if (o.type == chargeType) {
                    return o;
                }
            });
            if (object.hasTaxCode) {
                return object.total;
            } else {
                return object.totalWithTaxes;
            }
        }

        /**
         * @description This function returns tax line for header charge
         * NIB# 515
         * @param chargesArray
         * @param chargeType
         * @param flipSignFlag
         * @return {*}
         * @author Yogesh Jagdale
         * @since 8.1.0
         */
        const getChargeTaxLine = (chargesArray, chargeType, flipSignFlag) => {
            log.audit('chargesArray: ', JSON.stringify(chargesArray));
            let object = chargesArray.find((o, i) => {
                let type = o.type.replace(/Invoice|Charge/gi, '');
                chargeType = chargeType.replace(/total|Amount/gi, '');
                log.audit('type: ' + type, 'chargeType: ' + chargeType);
                if (type == chargeType) {
                    return o;
                }
            });
            let code = object['taxLines'][0]['code'];
            let taxCodeSplitArray = code ? code.split(':') : [];
            let codeID = taxCodeSplitArray.length == 2 ? taxCodeSplitArray[1] : '';
            if (codeID) {
                object.hasTaxCodes = true;
            }
            let objectCopy = Object.assign({}, object);
            return objectCopy;
        }


        return {
            isValidateEnvironment,
            loadInvoiceConfiguration,
            createInvoiceGETURL,
            netsuiteDateToCoupaDate,
            createInvoiceVoidGETURL,
            getTypeOfInvoice,
            validateDocument,
            voidVendorBillFromInvoice,
            sendErrorNotification,
            setDocumentAsExported,
            parseFloatOrZero,
            getInternalIDByExternalID,
            getAccountIDByNumber,
            getCurrencyIDByCode,
            convertCoupaDateToNetSuiteDate,
            processCutOff,
            getMaskedJSONObject,
            calculateProportion,
            formatCurrency,
            getLineCustomFields,
            processDataTypeMapping,
            setHeaderLevelCustomFields,
            setLineLevelCustomFields,
            searchTermID,
            getNonSplitAccountExpenseLine,
            getSplitAccountExpenseLine,
            searchTransactionInNetSuite,
            getNonSplitAccExpnsLineWithTaxCode,
            getSplitAccExpnsLineWithTaxCode,
            setExpenseSublist,
            flipSign,
            skipVCInvoices,
            getRecordIdbyName,
            createCoupaPayPayment,
            getChargeTotal,
            getChargeTaxLine
        }
    });