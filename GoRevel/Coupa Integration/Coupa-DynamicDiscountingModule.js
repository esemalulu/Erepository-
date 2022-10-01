/**
 * Coupa-DynamicDiscountingModule.js
 * @NApiVersion 2.1
 */
/*******************************************************************************
 *
 * Name: Coupa-DynamicDiscountingModule.js
 *
 * Script Type: SuiteScript 2.1 Module
 *
 * Description: Supporting functions for Dynamic Discounting script.
 *
 * Parent Script Id/s: customscript_coupa_dd_integration
 *
 * Parent Deployment Id/s: customdeploy_coupa_dd_integration_adhoc
 ********************************************************************************/
define(['N/https', 'N/record', 'N/runtime', 'N/search', 'N/email', 'N/error'],
    /**
     * @param{https} https
     * @param{record} record
     * @param{runtime} runtime
     * @param{search} search
     */
    function (https, record, runtime, search, email, error) {


        /**
         * Coupa Constructor which returns an object with the configuration(script parameters) & Valid Environment flagz
         * @constructor
         * @param -NA-
         * @return {Object} Coupa Configuration Object
         * @author Yogesh Jagdale
         * @since 5.0.0
         */
        function Coupa() {
            this.configuration = this.loadConfiguration();           //Load the Script parameters and returns the configuration object
            this.isEnvironmentValid = this.validateEnvironment();           //Validates the current NetSuite environment and the Instance URL provided as Parameter
            //log.debug('Coupa Configuration Object:', JSON.stringify(this));
        }


        /**
         * This method validates whether the NetSuite environment and the Coupa URL provided as the script parameter are compatible
         * @method
         * @return {boolean} flag
         * @author Yogesh Jagdale
         * @since 5.0.0
         */
        Coupa.prototype.validateEnvironment = function () {
            this.url_test_contains = ["-train", "-dev", "-dmo", "-demo", "-qa", "-train", "-sandbox", "-sbx", "-stage", "-staging", "-stg", "-support", "-test", "-uat", "coupadev.com", "coupacloud.com"];
            var errorMessage = 'Error - script is running in non prod environment and not using a ' + this.url_test_contains + ' in the coupa URL. If you believe this to be incorrect, please contact Coupa Support';

            try {
                var thisEnv = runtime.envType;
                let host = this.configuration.host;
                log.debug('Current NetSuite Environment Type: ' + thisEnv, 'host url: ' + host);
                if (thisEnv != 'PRODUCTION') {
                    var test_url = false;
                    test_url = this.url_test_contains.filter(function (key) {
                        return host.indexOf(key) > -1;
                    }).length > 0;

                    log.debug('test_url is', test_url);

                    if (!test_url) {
                        email.send({
                            author: this.configuration.errorFrom,
                            recipients: this.configuration.errorTo.toString(),
                            subject: 'Coupa - Dynamic Discounting Integration Error',
                            body: errorMessage
                        });
                        throw errorMessage;
                    }
                    return test_url;
                } else {
                    return true;
                }
            } catch (e) {
                log.error({
                    title: 'Error in validateEnvironment: ',
                    details: JSON.stringify(e)
                });
                throw errorMessage;
            }
        };


        /**
         * This method returns the configuration object by sourcing all script parameters and can be replaced in future with Configuration Custom Record
         * @method
         * @param -NA-
         * @return {Array|Object|Search|RecordRef} inputSummary
         * @since 5.0.0
         */
        Coupa.prototype.loadConfiguration = function () {
            var scriptRef = runtime.getCurrentScript();
            var configuration = {};
            configuration.errorTo = scriptRef.getParameter('custscript_coupa_dd_email_receiver');
            configuration.errorFrom = scriptRef.getParameter('custscript_coupa_dd_email_sender') ? scriptRef.getParameter('custscript_coupa_dd_email_sender') : '-5';
            configuration.host = scriptRef.getParameter('custscript_coupa_dd_coupa_url');
            configuration.apiKey = scriptRef.getParameter('custscript_coupa_dd_api_key');
            return configuration;
        };


        /**
         * This method Queries Coupa instance and returns the Array of payInvoices object to be processed further
         * @method
         * @param -NA-
         * @return {Array} responseArray
         * @author Yogesh Jagdale
         * @since 5.0.0
         */
        Coupa.prototype.searchCoupaInvoices = function (requestHeader) {
			var response = "",
				errorMsg = "",
				emailObject = "",
				errorObject = "",
				responseArray = [],
				headers = {};
			if (requestHeader) {
					headers = requestHeader;
			} else {
					headers = {
					'Accept': 'application/json',
					'X-COUPA-API-KEY': this.configuration.apiKey
				};
			}
            var baseURL = this.configuration.host + '/api/coupa_pay/invoices?status[in]=wc_consideration,ready_to_pay&exported=false&wc_eligibility=DYNAMIC_DISCOUNTING&fields=["id","status","tranid","exported?","wc_eligibility","discount_amount","discount_rate","discount_due_date",{"invoice_header":["id","invoice_number"]}]';
            log.audit('Get URL:', baseURL);
            try {
                response = https.get({
                    url: baseURL,
                    headers: headers
                });
            } catch (e) {
                errorMsg = 'Error making API call to Coupa, with Query: ' + baseURL;
                log.error('Error In searchCoupaInvoices()', errorMsg);
                log.error('searchCoupaInvoices()', JSON.stringify((e)));

                emailObject = {
                    author: this.configuration.errorFrom,
                    recipients: this.configuration.errorTo.split(","),
                    subject: 'Coupa -Dynamic Discounting Integration Error',
                    body: errorMsg
                };
                email.send(emailObject);

                errorObject = error.create({
                    name: 'Coupa API Failure',
                    message: errorMsg,
                    notifyOff: false
                });

                throw errorObject;
            }

            if (response.code == 200) {
                var payInvoices = JSON.parse(response.body);
                log.audit('Succesfully retrieved pay Invoices', 'Got ' + payInvoices.length + ' Invoices');
                for (var i = 0; i < payInvoices.length; i++) {
                    log.audit('payInvoices[' + i + ']', JSON.stringify(payInvoices[i]));
                    var payInvoiceObj = {};            //Creates Invoice Object from the payload returned by Coupa
                    payInvoiceObj.id = payInvoices[i]['id'];
                    payInvoiceObj.exported = payInvoices[i]['exported'];
                    payInvoiceObj.discount_amount = payInvoices[i]['discount-amount'];

                    if (payInvoices[i]['discount-rate'] && payInvoices[i]['discount-rate'].length > 17) {            //Truncate the decimal places which may cause error while creating Term as the Term name can be 32 characters max
                        log.audit('discount_rate truncated from: ' + payInvoices[i]['discount-rate'], ' to: ' + parseFloat(payInvoices[i]['discount-rate']).toFixed('8'));
                        payInvoiceObj.discount_rate = payInvoices[i]['discount-rate'] ? parseFloat(payInvoices[i]['discount-rate']).toFixed('8') : '';
                    } else {
                        payInvoiceObj.discount_rate = payInvoices[i]['discount-rate'];
                    }

                    payInvoiceObj.discount_due_date = payInvoices[i]['discount-due-date'];
                    payInvoiceObj.wc_eligibility = payInvoices[i]['wc-eligibility'];
                    payInvoiceObj.status = payInvoices[i]['status'];
                    payInvoiceObj.invoice_number = payInvoices[i]['invoice-header'] ? payInvoices[i]['invoice-header']['invoice-number'] : "";
                    payInvoiceObj.invoice_id = payInvoices[i]['invoice-header'] ? payInvoices[i]['invoice-header']['id'] : "";
                    payInvoiceObj.requestHeader = headers;
                    var coupaInvoiceID= payInvoices[i]['invoice-header'] ? payInvoices[i]['invoice-header']['id'] : "";
                    var paymentChannel = this.getPaymentChannel(coupaInvoiceID, headers);
                    if (paymentChannel != 'erp') {
                        log.audit({
                            title: 'Skipping Integration Discount for Coupa Pay Invoice: ' + payInvoiceObj.id,
                            details: 'Coupa Invoice ID: ' + payInvoiceObj.invoice_id + " invoice-number: " + payInvoiceObj.invoice_number
                        });
                        this.setInvoiceExported(payInvoices[i]['id'], headers);
                        continue;
                    }
                    responseArray.push(payInvoiceObj);
                }
            } else if (response.code == 404) {
                log.audit('No pay Invoices pending export', 'URL: ' + baseURL);
            } else {
                // In Case of bad response send an Email
                errorMsg = 'Error making API call to Coupa, with Query: ' + baseURL + ' Response Code is: ' + response.code + ' Response Body is: ' + response.body;
                log.error('Error in searchCoupaInvoices(): ', errorMsg);

                emailObject = {
                    author: this.configuration.errorFrom,
                    recipients: this.configuration.errorTo.split(","),
                    subject: 'Coupa -Dynamic Discounting Integration Error',
                    body: errorMsg
                };
                email.send(emailObject);
                errorObject = error.create({
                    name: 'COUPA_API_ERROR',
                    message: 'An unexpected error occured while making API call to Coupa, with Query: ' + baseURL + ' Response Code is: ' + response.code + ' Response Body is: ' + response.body
                });
                throw errorObject;
            }
            return responseArray;
        };


        /**
         * This method Processes the payInvoice by checking/unchecking the payment_hold checkbox & setting the
         * Discount Amount & Discount Due Date based on the status of the payInvoice Object
         * @method
         * @param {Object} payInvoice Object
         * @return {string} Vendor Bill Id
         * @author Yogesh Jagdale
         * @since 5.0.0
         */
        Coupa.prototype.processPayInvoice = function (payInvoice, coupa_invoice_number, requestHeader) {
            var responseObject = {};
            responseObject.processed = true;
            var billId = this.searchNetSuiteVB(payInvoice.invoice_id);
            if (billId) {
                try {
                    log.audit({
                        title: 'Trying to Load Vendor Bill with Id: ',
                        details: 'vendorbill:' + billId
                    });
                    var billRecord = record.load({
                        type: record.Type.VENDOR_BILL,
                        id: billId
                    });

                    if (payInvoice.status == 'ready_to_pay') {            //In case the Invoice status is ready_to_pay search for the Billing term based on the due days and discount amount if no term found create a new term and set the term on Vendor Bil
                        var discountRate = payInvoice.discount_rate ? parseFloat(payInvoice.discount_rate) : 0;
                        var discountDueDate = payInvoice.discount_due_date ? payInvoice.discount_due_date : ''
                        if (discountRate && discountDueDate) {
                            var billDate = billRecord.getValue({
                                fieldId: 'trandate'
                            });
                            var termId = this.getTerm(discountRate, discountDueDate, billDate);            //Get the Term to be set on the Vendor Bill
                            if (termId) {
                                log.debug({
                                    title: 'coupa_invoice_number: ' + coupa_invoice_number,
                                    details: 'requestHeader: ' + requestHeader
                                });
                                var paymentChannel = this.getPaymentChannel(coupa_invoice_number, requestHeader);
                                log.audit({
                                    title: 'paymentChannel: ',
                                    details: paymentChannel
                                });
                                if (paymentChannel == "erp") {
                                    billRecord.setValue({
                                        fieldId: 'paymenthold',
                                        value: false
                                    });
                                } else {
                                    billRecord.setValue({
                                        fieldId: 'paymenthold',
                                        value: true
                                    });
                                }
                                billRecord.setValue({
                                    fieldId: 'terms',
                                    value: termId
                                });
                            } else {
                                responseObject.processed = false;
                                log.audit({
                                    title: 'Unable to create or search Term:',
                                    details: 'discountRate: ' + discountRate + ' discountDueDate: ' + discountDueDate
                                });
                            }
                        } else {
                            responseObject.processed = true;
                            billRecord.setValue({
                                fieldId: 'paymenthold',
                                value: false
                            });
                            log.audit({
                                title: 'Payment Term not found and also not able to create a new term. No Discount applied to the Vendor Bill',
                                details: 'discountRate: ' + discountRate + ' discountDueDate: ' + discountDueDate
                            });
                        }
                    } else if (payInvoice.status == 'wc_consideration' || payInvoice.status == 'dd_consideration') {            //In case the Invoice status is wc_consideration OR dd_consideration set the payment hold checkbox as true to hold the payment
                        billRecord.setValue({
                            fieldId: 'paymenthold',
                            value: true
                        });
                    } else {
                        responseObject.processed = false;
                        log.error({
                            title: 'Invalid payInvoice status: ' + payInvoice.status,
                            details: 'Expected status: ready_to_pay / wc_consideration / dd_consideration'
                        });
                    }
                    billRecord.save();
                    responseObject.netsuiteId = billId;
                    responseObject.coupaId = payInvoice.invoice_id;

                    log.audit({
                        title: 'Updated Vendor Bill with Id: ',
                        details: payInvoice.invoice_id
                    });
                    return responseObject;
                } catch (e) {
                    log.error({
                        title: 'Error while updating the Vendor Bill with Id: ' + billId,
                        details: JSON.stringify(e)
                    });
                    throw e;
                }
            } else {
                log.error({
                    title: 'Vendor Bill not found for pay Invoice with Id: ' + payInvoice.invoice_id,
                    details: JSON.stringify(payInvoice)
                });
            }
        };


        /**
         * This method search the Vendor Bill internal Id using saved search on the basis of external Id
         * @method
         * @param {string} payInvoice Id
         * @return {string} Vendor Bill Id
         * @author Yogesh Jagdale
         * @since 5.0.0
         */
        Coupa.prototype.searchNetSuiteVB = function (invoiceId) {
            var billId = "";
            try {
                search.create({
                    type: search.Type.VENDOR_BILL,
                    filters: [
                        ['externalid', search.Operator.IS, 'Coupa-VendorBill' + invoiceId]
                    ],
                    columns: ['internalid'],
                }).run().each(function (result) {
                    billId = result.id;
                });
            } catch (e) {
                log.error({
                    title: 'Error in  searchNetSuiteVB',
                    details: JSON.stringify(e)
                });
            }
            return billId;
        };


        /**
         * This method set the payInvoice in Coupa as exported.
         * @method
         * @param {string} invoiceId
         * @return -NA-
         * @author Yogesh Jagdale
         * @since 5.0.0
         */
        Coupa.prototype.setInvoiceExported = function (invoiceId, requestHeader) {
            var response = "", emailObject = "", errorMsg = "", errorObject = "";
            var baseURL = this.configuration.host + '/api/coupa_pay/invoices/' + invoiceId + '?exported=true';

            try {
                response = https.put({
                    url: baseURL,
                    headers: requestHeader
                });
            } catch (e) {
                errorMsg = 'Error making API call to Coupa, with Query: ' + baseURL;
                log.error('Error In setInvoiceExported()', errorMsg);
                log.error('setInvoiceExported()', JSON.stringify((e)));

                emailObject = {
                    author: this.configuration.errorFrom,
                    recipients: this.configuration.errorTo.split(","),
                    subject: 'Coupa -Dynamic Discounting Integration Error',
                    body: errorMsg
                };
                email.send(emailObject);

                errorObject = error.create({
                    name: 'Coupa API Failure',
                    message: errorMsg,
                    notifyOff: false
                });

                throw errorObject;
            }

            if (response.code == 200) {
                log.audit('pay Invoice marked as exported in Coupa', '');
                //log.debug('Coupa Response:', JSON.stringify(response.body));
            } else if (response.code == 404) {
                log.audit('Unable to mark the pay Invoice as exported in Coupa', 'URL: ' + baseURL);
                log.debug({
                    title: 'Response from Coupa: ',
                    details: JSON.stringify(response)
                });
            } else {
                // bad response
                errorMsg = 'An unexpected error occured while making API call to Coupa, with Query: ' + baseURL + ' Response Code is: ' + response.code + ' Response Body is: ' + response.body;
                log.error('Error in setInvoiceExported(): ', errorMsg);

                emailObject = {
                    author: this.configuration.errorFrom,
                    recipients: this.configuration.errorTo.split(","),
                    subject: 'Coupa -Dynamic Discounting Integration Error',
                    body: errorMsg
                };

                email.send(emailObject);

                errorObject = error.create({
                    name: 'COUPA_API_ERROR',
                    message: 'An unexpected error occured while making API call to Coupa, with Query: ' + baseURL + ' Response Code is: ' + response.code + ' Response Body is: ' + response.body
                });
                throw errorObject;
            }
        };


        /**
         * This method sends the Success summary email to the recipients.
         * @method
         * @param {Object} summary
         * @param {string} scriptName
         * @param {string} recordType
         * @param {string} coupaRecordType
         * @return -NA-
         * @author Yogesh Jagdale
         * @since 5.0.0
         */
        Coupa.prototype.sendSuccessSummary = function (summary, scriptName) {
            var subject = "Summary Email: Coupa - Dynamic Discounting process";
            var message = "Hello, <br> " + scriptName + " Script Failed. Please contact the support team to discuss corrective steps. <br>Thank you <br><br> <hr>";
            var userid = this.configuration.errorFrom;
            var contents = '';

            //Use summary.output which will contain list of key-value pair that we have entered at end of reduce() function
            summary.output.iterator().each(function (key, value) {
                contents += "Vendor Bill (ID " + value + ") against CoupaPay Invoice(ID " + key + ") <br><br>";
                return true;
            });
            message += contents;

            email.send({
                author: userid,
                recipients: this.configuration.errorTo.toString(),
                subject: subject,
                body: message
            });
        };


        /**
         * This method sends the failure summary email to the recipients.
         * @method
         * @param {Object} summary
         * @param {string} scriptName
         * @param {string} recordType
         * @param {string} coupaRecordType
         * @return -NA-
         * @author Yogesh Jagdale
         * @since 5.0.0
         */
        Coupa.prototype.sendFailureSummary = function (summary, scriptName, recordType, coupaRecordType) {
            var errorMap = {};
            var subject = "Summary Email: Coupa - Dynamic Discounting process Completed with Errors";
            var message = "Hello, <br><br> " + scriptName + " Script Failed. Please contact the support team to discuss corrective steps. <br><br>Thank you <br><br> <hr>";
            var userid = this.configuration.errorFrom;
            var contents = '';
            if (recordType && coupaRecordType) {
                summary.reduceSummary.errors.iterator().each(function (key, value) {
                    contents += recordType + " (ID " + value + ") against " + coupaRecordType + "(ID " + key + ") <br><br>";
                    return true;
                });
            } else {
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

            }

            message += contents;
            log.audit({
                title: 'Sending Erorr summary to : ' + this.configuration.errorTo.toString(),
                details: message
            });
            email.send({
                author: userid,
                recipients: this.configuration.errorTo.toString(),
                subject: subject,
                body: message
            });
        };


        /**
         * This method search the Billing Term Id based on the discountPercent & expiryDate
         * @method
         * @param discountPercent
         * @param expiryDate
         * @return {string}
         * @author Yogesh Jagdale
         * @since 5.0.0
         */
        Coupa.prototype.getTerm = function (discountPercent, expiryDate, billDate) {
            var termId = "";
            if (this.validateDateDifference(billDate, expiryDate)) {            //Validate the date difference. Expiry Date should be greater than bill date
                var dueDays = this.getDateDifference(billDate, expiryDate);            //Get date difference in days. The due days will be used to search the previously created term or to create a new term in case no term found
                log.debug({
                    title: 'Date Difference between DueDate and VendorBill Date: ',
                    details: dueDays
                })
                termId = this.searchTerm(discountPercent, dueDays);            //search term
                if (termId == undefined || termId == null || termId == '') {
                    termId = this.createTerm(discountPercent, dueDays);            //create term & returns term id
                }
            } else {
                log.audit({
                    title: 'Discount DueDate must be greater than Vendor Bill Date',
                    details: 'billDate:' + billDate + ' expiryDate: ' + expiryDate
                })
            }
            return termId;
        };


        /**
         * This method validates the date difference and returns false if duedate prior to Bill date
         * @method
         * @param billDate
         * @param duedate
         * @return {boolean}
         * @author Yogesh Jagdale
         * @since 5.0.0
         */
        Coupa.prototype.validateDateDifference = function (billDate, duedate) {
            billDate = new Date(billDate);
            duedate = this.convertCoupaDateToNetSuiteDate(duedate);            //converts Coupa date to JS Date object
            var diffTime = duedate - billDate;
            var diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
            return diffDays >= 0 ? true : false;
        }

        /**
         * Converts Coupa Date to Standard Date Object
         * @method
         * @param CoupaDate
         * @return {Date}
         * @author Yogesh Jagdale
         * @since 5.0.0
         */
        Coupa.prototype.convertCoupaDateToNetSuiteDate = function (CoupaDate) {

            var nDate = CoupaDate.split('T');

            var datesplit = nDate[0].split('-');

            var Nyear = datesplit[0];

            var Nday = datesplit[2];

            var Nmonth = datesplit[1];

            var netDate = Nmonth + '/' + Nday + '/' + Nyear;
            netDate = new Date(netDate);
            return netDate;
        }

        /**
         * This method returns the date difference
         * @method
         * @param billDate
         * @param duedate
         * @return {number}
         * @author Yogesh Jagdale
         * @since 5.0.0
         */
        Coupa.prototype.getDateDifference = function (billDate, duedate) {
            billDate = new Date(billDate);
            duedate = this.convertCoupaDateToNetSuiteDate(duedate);            //converts Coupa date to JS Date object
            var diffTime = duedate - billDate;
            var diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
            return diffDays;
        }


        /**
         * This method search the Billing Term Id based on the discountPercent & dueDays
         * @method
         * @param discountPercent
         * @param dueDays
         * @return {string}
         * @author Yogesh Jagdale
         * @since 5.0.0
         */
        Coupa.prototype.searchTerm = function (discountPercent, dueDays) {
            var termId = "";
            var searchString = "_DD_Terms_" + discountPercent + "%_" + dueDays;
            var column = [
                search.createColumn({name: "discountpercent", label: "% Discount"}),
                search.createColumn({name: "daysuntilexpiry", label: "Days Till Discount Expires"}),
                search.createColumn({
                    name: "name",
                    sort: search.Sort.ASC,
                    label: "Name"
                }),
                search.createColumn({name: "internalid", label: "Internal ID"})
            ];

            var termSearchObj = search.create({
                type: "term",
                filters:
                    [
                        ["name", "is", searchString],
                        "AND",
                        ["daysuntilexpiry", "equalto", dueDays],
                        "AND",
                        ["isinactive", "is", "F"]
                    ],
                columns: column

            });
            var searchResultCount = termSearchObj.runPaged().count;
            log.debug("termSearchObj result count", searchResultCount);
            termSearchObj.run().each(function (result) {
                termId = result.getValue(column[3])
                return false;
            });
            log.debug({
                title: 'Returning Term Id from searchTerms: ',
                details: 'term:' + termId
            })
            return termId;
        };


        /**
         * This method creates a new billing term based on the discountPercent & dueDays
         * @method
         * @param discountPercent
         * @param dueDays
         * @return {string}
         * @author Yogesh Jagdale
         * @since 5.0.0
         */
        Coupa.prototype.createTerm = function (discountPercent, dueDays) {
            var termId = "";
            try {
                var termRecord = record.create({
                    type: record.Type.TERM
                });

                termRecord.setValue({
                    fieldId: 'name',
                    value: '_DD_Terms_' + discountPercent + '%_' + dueDays
                });

                termRecord.setValue({
                    fieldId: 'discountpercent',
                    value: discountPercent
                });

                termRecord.setValue({
                    fieldId: 'daysuntilexpiry',
                    value: dueDays
                });

                termId = termRecord.save();
                log.debug({
                    title: 'Billing Term created with Id: ',
                    details: 'term:' + termId
                })
            } catch (e) {
                log.error({
                    title: 'Error in createTerm',
                    details: e.message
                });
                throw e;
            }
            return termId;
        };

        Coupa.prototype.getPaymentChannel = function (invoiceId, requestHeader) {
            var response = "", emailObject = "", errorMsg = "", errorObject = "";
            var baseURL = this.configuration.host + '/api/invoices/' + invoiceId + '?fields=["payment-channel","id","status","tranid","exported"]';

            try {
                response = https.get({
                    url: baseURL,
                    headers: requestHeader
                });
            } catch (e) {
                errorMsg = 'Error making API call to Coupa, with Query: ' + baseURL;
                log.error('Error In getPaymentChannel()', errorMsg);
                log.error('getPaymentChannel()', JSON.stringify((e)));

                emailObject = {
                    author: this.configuration.errorFrom,
                    recipients: this.configuration.errorTo.split(","),
                    subject: 'Coupa -Dynamic Discounting Integration Error',
                    body: errorMsg
                };
                email.send(emailObject);

                errorObject = error.create({
                    name: 'Coupa API Failure',
                    message: errorMsg,
                    notifyOff: false
                });

                throw errorObject;
            }

            if (response.code == 200) {
                var invoiceDoc = JSON.parse(response.body);
                log.audit('Coupa Invoice payment-channel', invoiceDoc["payment-channel"]);
                return invoiceDoc["payment-channel"];
                //log.debug('Coupa Response:', JSON.stringify(response.body));
            } else if (response.code == 404) {
                log.audit('Unable to get payment-channel details', 'URL: ' + baseURL);
                log.debug({
                    title: 'Response from Coupa: ',
                    details: JSON.stringify(response)
                });
            } else {
                // bad response
                errorMsg = 'An unexpected error occured while making API call to Coupa, with Query: ' + baseURL + ' Response Code is: ' + response.code + ' Response Body is: ' + response.body;
                log.error('Error in setInvoiceExported(): ', errorMsg);

                emailObject = {
                    author: this.configuration.errorFrom,
                    recipients: this.configuration.errorTo.split(","),
                    subject: 'Coupa -Dynamic Discounting Integration Error',
                    body: errorMsg
                };

                email.send(emailObject);

                errorObject = error.create({
                    name: 'COUPA_API_ERROR',
                    message: 'An unexpected error occured while making API call to Coupa, with Query: ' + baseURL + ' Response Code is: ' + response.code + ' Response Body is: ' + response.body
                });
                throw errorObject;
            }
        }

        return {
            coupa: Coupa
        };
    });