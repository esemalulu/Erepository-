/**
 * @NApiVersion 2.1
 * @NScriptType MapReduceScript
 * @NModuleScope SameAccount
 */
define(
  ['N/config', 'N/email', 'N/error', 'N/format', 'N/https', 'N/record', 'N/runtime', 'N/search',
    'N/transaction', './Coupa - OpenIDConnect 2.0'
  ],
  function (config, email, error, format, https, record, runtime, search, transaction, oidc) {
    var scriptRef = runtime.getCurrentScript();
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

      var errorTo = scriptRef.getParameter('custscript_coupa_er2vbpay_errorto');
      var errorFrom = scriptRef.getParameter('custscript_coupa_er2vbpay_errorfrm');
      var status_filter = scriptRef.getParameter('custscript_coupa_er2vbpay_status_filter');
      if (status_filter == null || status_filter == '') {
        status_filter = false;
      }
      var cust_args = scriptRef.getParameter('custscript_coupa_er2vbpay_cust_args');
      var customStatus = scriptRef.getParameter('custscript_coupa_er2vbpay_status');
      var host = scriptRef.getParameter('custscript_coupa_er2vbpay_url');
      var api_key = scriptRef.getParameter('custscript_coupa_er2vbpay_apikey');
      var requestHeader = oidc.getAPIHeader();
		var postHeaders = {};
		if (requestHeader) {
			postHeaders = requestHeader;
		} else {
			postHeaders = {
				'Accept': 'application/json',
				'X-COUPA-API-KEY': api_key
			};
		}
      var documents = [];

      if (status_filter == true) {
        var baseURL = host +
        '/api/coupa_pay/payments?exported=false&fields=["id","status","exchange_rate","updated_at","released_at",{"pay_from_account":["id",{"currency":["code"]}]},{"pay_to_currency":["code"]},{"payee":["number"]},{"digital_check":["check_number"]},{"payment_details":["id","updated_at","source_transaction_id","source_transaction_reference","discount_total","payment_total",{"payable_allocations":["id","updated_at","payable_to_amount","source_transaction_to_reference","source_transaction_to_id"]},{"currency":["code"]}]}]&pay_to_account[type]=CoupaPay::EmployeePaymentAccount&status[in]=payment_initiated,payment_in_progress,completed_successfully,completed_with_errors';
        if (cust_args == '' || cust_args == null) {
          var getUrl = baseURL;
        } else {
          var getUrl = baseURL + cust_args;
        }
        log.audit('Search', 'querying Coupa with ' + getUrl);
      } else {
        var baseURL = host +
          '/api/coupa_pay/payments?exported=false&fields=["id","status","exchange_rate","updated_at","released_at",{"pay_from_account":["id",{"currency":["code"]}]},{"pay_to_currency":["code"]},{"payee":["number"]},{"digital_check":["check_number"]},{"payment_details":["id","updated_at","source_transaction_id","source_transaction_reference","discount_total","payment_total",{"payable_allocations":["id","updated_at","payable_to_amount","source_transaction_to_reference","source_transaction_to_id"]},{"currency":["code"]}]}]&pay_to_account[type]=CoupaPay::EmployeePaymentAccount&status=';

        if (customStatus == '' || customStatus == null) {
          customStatus = 'completed_successfully';
        }
        if (cust_args == '' || cust_args == null) {
          var getUrl = baseURL + customStatus;
        } else {
          var getUrl = baseURL + customStatus + cust_args;
        }

        log.audit('Search', 'querying Coupa with ' + getUrl);
      }

      try {
        var response = https.get({
          url: getUrl,
          headers: postHeaders
        });
      } catch (e) {
        var errorMsg = 'Error making API call to Coupa, with Query: ' + getUrl;
        log.error('getInputData', errorMsg);
        log.error('getInputData', e.message);

        sendNotification(errorMsg)

        var err = error.create({
          name: 'Coupa API Failure',
          message: errorMsg,
          notifyOff: false
        });
        err.toString = function () {
          return err.message;
        };
        throw err;
      }

      if (response.code == 200) {
        // good response
        log.audit('Succesfully retrieved Payments', response);
        var payments = JSON.parse(response.body);
        log.audit('Succesfully retrieved Payments', 'Got ' + payments + ' payments');
        log.audit('Succesfully retrieved Payments', 'Got ' + payments.length + ' payments');
        var paymentJson = createPaymentJson(payments, postHeaders);
        documents = paymentJson;
        //log.debug('Queuing  payment for processing', paymentJson);

      } else if (response.code == 404) {
        log.audit('No payments pending export', 'URL: ' + getUrl);
      } else {
        // bad response
        var errorMsg = 'Error making API call to Coupa, with Query: ' + getUrl +
          ' Response Code is: ' + response.code + ' Response Body is: ' + response.body;
        log.error('getInputData', errorMsg);

        sendNotification(errorMsg);

        var err = error.create({
          name: 'COUPA_API_ERROR',
          message: 'Failed to Call to Coupa. Received code' + response.code + ' with response: ' +
            response.body
        });
        err.toString = function () {
          return err.message;
        };
        throw err;
      }
      //get payments with completed_with_errors status 
      if (status_filter == false) {
        if (cust_args == '' || cust_args == null) {
          var getErrorsUrl = baseURL + 'completed_with_errors';
        } else {
          var getErrorsUrl = baseURL + 'completed_with_errors' + cust_args;
        }

        log.audit('Search', 'querying Coupa with ' + getErrorsUrl);

        try {
          var response = https.get({
            url: getErrorsUrl,
            headers: postHeaders
          });
        } catch (e) {
          var errorMsg = 'Error making API call to Coupa, with Query: ' + getErrorsUrl;
          log.error('getInputData', errorMsg);
          log.error('getInputData', e.message);

          sendNotification(errorMsg);

          var err = error.create({
            name: 'Coupa API Failure',
            message: errorMsg,
            notifyOff: false
          });
          err.toString = function () {
            return err.message;
          };
          throw err;
        }

        if (response.code == 200) {
          // good response
          log.audit('Succesfully retrieved errored Payments', response);
          var payments = JSON.parse(response.body);
          log.audit('Succesfully retrieved errored Payments', 'Got ' + payments.length + ' errored payments');
          var paymentJson = createPaymentJson(payments, postHeaders);
          documents = documents.concat(paymentJson);
          log.debug('Queuing  payment for processing', documents);

        } else if (response.code == 404) {
          log.audit('No completed with errors payments pending export', 'URL: ' + getUrl);
        } else {
          // bad response
          var errorMsg = 'Error making API call to Coupa, with Query: ' + getErrorsUrl +
            ' Response Code is: ' + response.code + ' Response Body is: ' + response.body;
          log.error('getInputData', errorMsg);

          sendNotification(errorMsg);

          var err = error.create({
            name: 'COUPA_API_ERROR',
            message: 'Failed to Call to Coupa. Received code' + response.code + ' with response: ' +
              response.body
          });
          err.toString = function () {
            return err.message;
          };
          throw err;
        }
      }

      return documents;
    }

    /**
     * Executes when the map entry point is triggered and applies to each key/value pair.
     * 
     * @param {MapSummary}
     *          context - Data collection containing the key/value pairs to process through the map
     *          stage
     * @since 2015.1
     */
    function map(context) {
      var scriptRef = runtime.getCurrentScript();
      log.debug("Start remaining governance units: ", scriptRef.getRemainingUsage());
      var payment = JSON.parse(context.value);
      var jsonPayment = JSON.stringify(payment);
      //log.debug('Map complete, writing to context', 'key: ' + payment.id + ' value: ' + jsonPayment)

      context.write({
        key: payment.id,
        value: JSON.stringify(payment),
      });
      log.debug('end of map step', 'Map step completed, context should have been written')
      log.debug("End remaining governance units: ", scriptRef.getRemainingUsage());
    }

    /**
     * Executes when the reduce entry point is triggered and applies to each group.
     * 
     * @param {ReduceSummary}
     *          context - Data collection containing the groups to process through the reduce stage
     * @since 2015.1
     */

    function reduce(context) {
      log.debug("Start of Reduce", "First line of the reduce step");
      var scriptRef = runtime.getCurrentScript();
      var errorTo = scriptRef.getParameter("custscript_coupa_er2vbpay_errorto");
      var errorFrom = scriptRef.getParameter("custscript_coupa_er2vbpay_errorfrm");

      log.debug(
        "Start remaining governance units: ",
        scriptRef.getRemainingUsage()
      );

      /*log.debug(
        "context key and value",
        "key: " + context.key + " values: " + context.values[0]
      );
      log.debug(
        "context key and value",
        "key: " + context.key + " first value: " + context.values[0]
      );*/
      var payment = JSON.parse(context.values[0]);
      var paymentExists = payment.paymentExists || false;
      var paymentSuccess = payment.paymentSuccess || true;
      var billPayments = payment.paymentDetails["billPayments"];
      try {
        if (payment.status == "completed_with_errors") {
          log.debug("payment status is ", payment.status );
          paymentSuccess = paymentStatus_completed_with_errors(payment);
        } else {
          log.debug("payment status is not completed with errors ", payment.status );
          paymentSuccess = paymentStatus_any(payment);
        } // else block on payment.status == 'completed_with_errors'
      } catch (e) {
        for (var idx0 in billPayments) {
          var detail = billPayments[idx0];
          var vendorBillId = getNetSuiteVendorBillId(detail.coupaInvoiceId);

          log.debug("about to reset paymenthold true on vendorbill", vendorBillId);

          record.submitFields({
            type: record.Type.VENDOR_BILL,
            id: vendorBillId,
            values: {
              paymenthold: true,
            },
          });
        }
        var errorMsg =
          "Error saving Vendor Payment with Coupa Payment Id: " + payment.id;
        log.error("In Reduce Step", errorMsg);
        log.error("In Reduce Step", e.message);

        if (
          errorFrom !== null &&
          errorFrom !== "" &&
          errorTo !== null &&
          errorTo !== ""
        ) {
          sendNotification(errorMsg);
        }

        var err = error.create({
          name: "NetSuite VendorPayment Create Failure",
          message: errorMsg,
          notifyOff: false,
        });
        err.toString = function () {
          return err.message;
        };
        paymentSuccess = false;
      } //end of catch block

      log.debug("End remaining governance units: ", scriptRef.getRemainingUsage());

      //mark payment as exported

      context.write({
        key: payment.id,
        value: paymentSuccess,
      });

      var paymentId = context.key;
      var markExported = paymentSuccess;

      //export these payments
      markPaymentExported(paymentId, markExported, payment.requestHeader);
      log.audit(
        "after payment is marked to exported",
        " The payment should be exported"
      );
    }

    /**
     * Executes when the summarize entry point is triggered and applies to the result set.
     * 
     * @param {Summary}
     *          summary - Holds statistics regarding the execution of a map/reduce script
     * @since 2015.1
     */
    function summarize(summary) {
      var scriptRef = runtime.getCurrentScript();

      log.audit('Usage/Governance consumed: ', summary.usage);
      log.audit('Number of queues: ', summary.concurrency);
      log.audit('Number of Yields: ', summary.yields);
      log.audit('Summary of Errors: ', summary.inputSummary.error);
      summary.mapSummary.errors.iterator().each(function (code, message) {
        log.error('Map Error: ' + code, message);
      });
      summary.reduceSummary.errors.iterator().each(function (code, message) {
        log.error('Reduce Error: ' + code, message);
      });
      var errorMsg = '';
      summary.mapSummary.errors.iterator().each(function (code, message) {
        log.error('Map Error: ' + code, message);
        errorMsg = errorMsg + message + "\n";
      });
    }


    //create JSON payment from successfull response
    function createPaymentJson(payments, requestHeader) {
      var documents = [];
      var scriptRef = runtime.getCurrentScript();
      var useUpdatedAtDate = scriptRef.getParameter('custscript_coupa_er2vbpay_use_updated_at') == true ? true : false;
      log.audit("Use Updated At Date as Payment Date?", useUpdatedAtDate);
      // log.debug("createPayment function", "Response code == 200");
      for (var i = 0; i < payments.length; i++) {
        var currentPayment = payments[i];
        var paymentJson = {
          id: currentPayment.id,
          exchangeRate : currentPayment['exchange-rate'], //NIB-264-> Apply inverse of the exchange rate from the payload
          status: currentPayment.status,
          pay_from_account: getNetSuitePayFromAccount(currentPayment['pay-from-account'], currentPayment),
          currency: getCurrencyId(currentPayment['pay-to-currency']['code']),
          entityId: currentPayment['payee']['number'],
          payment_date: useUpdatedAtDate ? currentPayment['updated-at'] : currentPayment['released-at'],
          headerCustomFields : getHeaderCustomFields(currentPayment),
          paymentDetails: getPaymentDetails(currentPayment),
          requestHeader: requestHeader
        };
        var payment = JSON.parse(JSON.stringify(paymentJson));
        var billPayments = payment.paymentDetails['billPayments'];
        var detail = billPayments[0];
        log.debug('GetInputData Step', 'Before existingPaymentId check');
        log.debug("End remaining governance units: ", scriptRef.getRemainingUsage());

        // Need to check the existing payment
        var existingPaymentId = getNetSuitePaymentId(detail.tranId);
        log.debug('GetInputData Step', 'After existingPaymentId check')
        log.debug("End remaining governance units: ", scriptRef.getRemainingUsage());


        if (existingPaymentId != '' && existingPaymentId != null) {
          log.audit('Coupa Payment ' + payment.id,
            'Payment exists in NetSuite. Marking exported');
          payment.paymentExists = true;
          payment.paymentSuccess = true;
        } else {
          for (var idx0 in billPayments) {
            var detail = billPayments[idx0];
            var vendorBillId = getNetSuiteVendorBillId(detail.coupaInvoiceId);
            if (vendorBillId == '' || vendorBillId == null) {
              log.error('Vendor Bill Not Found', 'Vendor bill not found for coupa ID ' +
                detail.coupaInvoiceId);
              log.error('Vendor Bill Not Found', 'Not able to process payment ' + payment.id + ' as vendor bill is missing. Continuing to next payment');
              payment.paymentSuccess = false;
              break;
            }

            log.debug('GetInputData Step', 'Before Payment Hold to false');

            record.submitFields({
              type: record.Type.VENDOR_BILL,
              id: vendorBillId,
              values: {
                paymenthold: false,
              },
            });
            log.debug('GetInputData Step', 'After Payment Hold to false');

            payment.paymentDetails['billPayments'][idx0].vendorBillId = vendorBillId
          }
        }
        if (payment.paymentSuccess == false) {
          log.audit('Payment issue', 'Payment had an error while generating map step payload. Putting vendor bills back on payment hold')
          for (var idx0 in billPayments) {
            var detail = billPayments[idx0];
            var vendorBillId = getNetSuiteVendorBillId(detail.coupaInvoiceId);

            if (vendorBillId == '' || vendorBillId == null) {
              log.audit('Vendor Bill Not Found', 'Vendor bill not found for coupa ID ' +
                detail.coupaInvoiceId + '. So, nothing to set as payment hold true');
              var errorMsg = "The vendor bill for Coupa Invoice ID " + detail.coupaInvoiceId + ' was not found. Please check if there is some issue with the Invoice integration. This is blocking CoupaPay Payment ' + payment.id + ' from creating Vendor Payments'
              sendNotification(errorMsg);
            } else {
              log.audit('Vendor Bill to be put on payment hold', 'Putting vendor bill ' + vendorBillId + ' on payment hold');
              record.submitFields({
                type: record.Type.VENDOR_BILL,
                id: vendorBillId,
                values: {
                  paymenthold: true
                }
              });
              log.audit('Vendor Bill put on payment hold', 'Vendor bill ' + vendorBillId + ' put on payment hold');
            }
          }
        } else {
          //log.debug('In Create Json function Queuing Payment for processing', paymentJson);
          documents.push(paymentJson)

        }
      }
      //log.debug('Return', documents);
      return documents;
      //return paymentJson
    }
    //mark payments as exported 
    function markPaymentExported(paymentId, markExported, requestHeader) {
      var scriptRef = runtime.getCurrentScript();
      if ((markExported == true) || (markExported == 'true')) {
        log.audit('Mark Exported', 'Preparing to mark payment ' + paymentId + ' as exported');
        var baseURL = scriptRef.getParameter('custscript_coupa_er2vbpay_url');
        var api_key = scriptRef.getParameter('custscript_coupa_er2vbpay_apikey');

        var putUrl = baseURL + '/api/coupa_pay/payments/' + paymentId + '?exported=true';
        log.audit('Mark Exported', 'Marking payment exported with ' + putUrl);

        try {
          var response = https.put({
            url: putUrl,
            headers: requestHeader,
          });
        } catch (e) {
          var errorMsg = 'Error making API call to Coupa, with Query: ' + putUrl;
          log.error('getInputData', errorMsg);
          log.error('getInputData', e.message);

          sendNotification(errorMsg);

          var err = error.create({
            name: 'Coupa API Failure',
            message: errorMsg,
            notifyOff: false,
          });
          err.toString = function () {
            return err.message;
          };
          throw err;
        }

        if (response.code != 200) {
          // bad response
          var errorMsg = 'Error making API call to Coupa, with Query: ' + putUrl +
            ' Response Code is: ' + response.code + ' Response Body is: ' + response.body;
          log.error('getInputData', errorMsg);

          sendNotification(errorMsg);

          var err = error.create({
            name: 'COUPA_API_ERROR',
            message: 'Failed to Call to Coupa. Received code' + response.code + ' with response: ' +
              response.body,
          });
          err.toString = function () {
            return err.message;
          };
          throw err;
        } else {
          log.audit('Mark Exported', 'Marked payment ' + paymentId + ' as exported');
        }
      } else {
        log.audit('Mark Exported', 'Not marking payment ' + paymentId +
          ' as exported due to error creating payment records');
      }
      return;
    }
    //payment completed_with_errors
    function paymentStatus_completed_with_errors(payment) {

      var scriptRef = runtime.getCurrentScript();
      var paymentExists = payment.paymentExists || false;
      var paymentSuccess = payment.paymentSuccess || true;
      var billPayments = payment.paymentDetails["billPayments"];
      // process 1-1 payment block
      var detail = billPayments[0];
      // Need to void the payment
      var existingPaymentId = getNetSuitePaymentId(detail.tranId);
      if (existingPaymentId != '' && existingPaymentId != null) {
        log.audit('Coupa Payment ' + payment.id,
          'Payment is completed_with_errors, so voiding ' + detail.tranId + ' in NetSuite');

        var vendorPaymentVoidStatus = isNetSuitePaymentVoidStatus(detail.tranId);
        log.debug('vendorPayment Is Void Status ', vendorPaymentVoidStatus);
        //void check block
        if (vendorPaymentVoidStatus == false) {
          var voidedPaymentId = transaction.void({
            type: transaction.Type.VENDOR_PAYMENT,
            id: existingPaymentId,
          });
          if (voidedPaymentId == existingPaymentId) {
            log.audit('Coupa Payment ' + payment.id,
              'Successfully voided payment with direct void');
            paymentSuccess = true;
          } else if (voidedPaymentId != '' && voidedPaymentId != null) {
            log.audit('Coupa Payment ' + payment.id,
              'Successfully voided payment with reverse journal entry ' + voidedPaymentId);
            paymentSuccess = true;
          } else {
            log.error('Coupa Payment ' + payment.id, 'Failed to void payment, void returned: ' +
              voidedPaymentId);
            paymentSuccess = false;
          }
          //loop for bill payments
          for (var idx1 in billPayments) {
            var detail = billPayments[idx1];
            var vendorBillId = getNetSuiteVendorBillId(detail.coupaInvoiceId);


            log.audit('Coupa Payment ' + payment.id, 'Placing Vendor Bill ' + vendorBillId +
              ' back on Payment Hold');
            record.submitFields({
              type: record.Type.VENDOR_BILL,
              id: vendorBillId,
              values: {
                paymenthold: true
              }
            });
            log.audit('Coupa Payment ' + payment.id, 'Successfully put Vendor Bill ' + vendorBillId +
              ' on Payment Hold');
          }

        } else {
          log.audit('Coupa Payment ' + payment.id,
            'Payment is completed_with_errors, billpayment in void status in NetSuite. Marking exported');
          paymentSuccess = true;
        } //void check block
      } else {
        log.audit('Coupa Payment ' + payment.id, 'Payment is completed_with_errors, but doesn\'t exist in NetSuite. Marking exported');
        for (var idx1 in billPayments) {
          var detail = billPayments[idx1];
          var vendorBillId = getNetSuiteVendorBillId(detail.coupaInvoiceId);
          log.audit('Coupa Payment ' + payment.id, 'Placing Vendor Bill ' + vendorBillId + ' back on Payment Hold');
          record.submitFields({
            type: record.Type.VENDOR_BILL,
            id: vendorBillId,
            values: {
              paymenthold: true
            }
          });
          log.audit('Coupa Payment ' + payment.id, 'Successfully put Vendor Bill ' + vendorBillId + ' on Payment Hold');
        }
        paymentSuccess = true;
      }
      log.debug("Payment Success is ", paymentSuccess);
      return paymentSuccess;
    }

    //payment status is any 
    function paymentStatus_any(payment) {
      var paymentExists = payment.paymentExists || false;
      var paymentSuccess = payment.paymentSuccess || true;
      var billPayments = payment.paymentDetails["billPayments"];
      var detail = billPayments[0];
      var vendorBillList = [];

      var existingPaymentId = getNetSuitePaymentId(detail.tranId);
      if (existingPaymentId != '' && existingPaymentId != null) {
        log.audit('Coupa Payment ' + payment.id,
          'Payment exists in NetSuite. Marking exported');
        paymentExists = true;
        paymentSuccess = true;
      }

      log.debug('In reduce step', 'paymentExists: ' + paymentExists)
      log.debug('In reduce step', 'paymentSuccess: ' + paymentSuccess)
      //log.debug('In reduce step', 'payment: ' + JSON.stringify(payment))

      if (paymentExists == false) {
        // block for 1-1 payment processing

        for (var idx0 in billPayments) {
          var detail = billPayments[idx0];
          log.debug('detail is ', detail);
          var vendorBillId = getNetSuiteVendorBillId(detail.coupaInvoiceId);

          if (vendorBillId == '' || vendorBillId == null) {
            log.error('Vendor Bill Not Found', 'Vendor bill not found for coupa ID ' +
              detail.coupaInvoiceId);
            paymentSuccess = false;
            break;
          }
          log.debug('bill id', vendorBillId);

          vendorBillList[idx0] = vendorBillId;

        }

        var newVendorPayment = record.transform({
          fromType: record.Type.VENDOR_BILL,
          fromId: vendorBillId,
          toType: record.Type.VENDOR_PAYMENT,
          isDynamic: true
        });


        var headerDepartmentRequired = scriptRef.getParameter('custscript_coupa_er2vbpay_headdept');
        log.debug('Coupa Payment ' + payment.id, 'Department Header mapping is: ' + headerDepartmentRequired);
        var headerClassRequired = scriptRef.getParameter('custscript_coupa_er2vbpay_headclas');
        log.debug('Coupa Payment ' + payment.id, 'Class Header mapping is: ' + headerClassRequired);
        var headerLocationRequired = scriptRef.getParameter('custscript_coupa_er2vbpay_headlocn');
        log.debug('Coupa Payment ' + payment.id, 'Location Header mapping is: ' + headerLocationRequired);

        if ((headerDepartmentRequired != null && headerDepartmentRequired != '') ||
          (headerClassRequired != null && headerClassRequired != '') ||
          (headerLocationRequired != null && headerLocationRequired != '')) {
          var vendorBill = record.load({
            id: vendorBillId,
            type: record.Type.VENDOR_BILL,
          });
        }

        if (headerDepartmentRequired != null && headerDepartmentRequired != '') {
          log.debug('Coupa Payment ' + payment.id, 'Inside headerDepartmentRequired section');
          var departmentId = headerDepartmentRequired;
          if (headerDepartmentRequired == 'retrieveValue') {
            departmentId = vendorBill.getSublistValue({
              sublistId: 'expense',
              fieldId: 'department',
              line: 0
            });
          }
          log.debug('Coupa Payment ' + payment.id, 'About to store ' + departmentId + ' as department');
          newVendorPayment.setValue({
            fieldId: 'department',
            value: departmentId
          });
        }

        if (headerClassRequired != null && headerClassRequired != '') {
          log.debug('Coupa Payment ' + payment.id, 'Inside headerClassRequired section');
          var classId = headerClassRequired;
          if (headerClassRequired == 'retrieveValue') {
            classId = vendorBill.getSublistValue({
              sublistId: 'expense',
              fieldId: 'class',
              line: 0
            });
          }
          log.debug('Coupa Payment ' + payment.id, 'About to store ' + classId + ' as class');
          newVendorPayment.setValue({
            fieldId: 'class',
            value: classId
          });
        }

        if (headerLocationRequired != null && headerLocationRequired != '') {
          log.debug('Coupa Payment ' + payment.id, 'Inside headerLocationRequired section');
          var locationId = headerLocationRequired;
          if (headerLocationRequired == 'retrieveValue') {
            locationId = vendorBill.getSublistValue({
              sublistId: 'expense',
              fieldId: 'location',
              line: 0
            });
          }
          log.debug('Coupa Payment ' + payment.id, 'About to store ' + locationId + ' as location');
          newVendorPayment.setValue({
            fieldId: 'location',
            value: locationId
          });
        }

        // Currency
        newVendorPayment.setValue({
          fieldId: 'currency',
          value: payment.currency
        });

        log.debug('payment currency', payment.currency);


        // Account
        newVendorPayment.setValue({
          fieldId: 'account',
          value: payment.pay_from_account
        });


        log.debug('payment account', payment.pay_from_account);

        // Posting Period
        newVendorPayment.setValue({
          fieldId: 'postingperiod',
          value: getPostingPeriod(payment.payment_date)
        });

        // TranDate
        newVendorPayment.setValue({
          fieldId: 'trandate',
          value: convertCoupaDateToNetSuiteDate(payment.payment_date)
        });

        // TranId
        newVendorPayment.setValue({
          fieldId: 'tranid',
          value: detail.tranId
        });

        // External ID
        newVendorPayment.setValue({
          fieldId: 'externalid',
          value: 'Processed-CoupaPay' + detail.tranId
        });

        if (!payment.paymentDetails['isSameCurrencyPayment']) {
            // exchange-rate
            //NIB-264-> Apply inverse of the exchange rate from the payload
            var exchangeRate = parseFloat(payment.exchangeRate);
            exchangeRate = isNaN(exchangeRate) ? 0 : exchangeRate;
            if (exchangeRate != 0) {
                var transformedExchangeRate = (1 / exchangeRate);
                log.debug('Coupa Payment ' + payment.id, 'About to set  exchange rate as: ' + transformedExchangeRate);

                newVendorPayment.setValue({
                    fieldId: 'exchangerate',
                    value: transformedExchangeRate
                });
            } else {
                log.audit('Setting of exchange-rate skipped', 'exchangeRate before transformation:' + exchangeRate);
            }
        } else {
            //NIB-288-> to handle issue when functional and account currencies differ
            log.audit('Setting of exchange-rate skipped', 'Reason: same pay-from-account and pay-to-account currency');
        }

        log.audit('Trying to set Custom Field', JSON.stringify(payment.headerCustomFields));
        for (var key in payment.headerCustomFields) {
          if (payment.headerCustomFields.hasOwnProperty(key) && key.indexOf("DATE: ") < 0) {
            newVendorPayment.setValue({
              fieldId: key,
              value: payment.headerCustomFields[key]
            });
          } else {
            //reconverting the date string to date object
            newVendorPayment.setValue({
              fieldId: key.replace("DATE: ", ""),
              value: new Date(payment.headerCustomFields[key])
            });
          }
        }

        for (var idx2 in billPayments) {
          var detail = billPayments[idx2];
          //1-1 payment block 
          var vendorBillId = vendorBillList[idx2];

          //Find line for this Vendor Bill
          var lineIndex = newVendorPayment.findSublistLineWithValue({
            sublistId: 'apply',
            fieldId: 'doc',
            value: vendorBillId
          });

          if (lineIndex == -1) {
            log.error('lineIndex not found!', 'Cant find sublist with doc ' + vendorBillId);
            paymentSuccess = false;
            break;
          } else {
            newVendorPayment.selectLine({
              sublistId: 'apply',
              line: lineIndex
            });
          }

          // Apply
          newVendorPayment.setCurrentSublistValue({
            sublistId: 'apply',
            fieldId: 'apply',
            value: true
          });

          // Amount
          newVendorPayment.setCurrentSublistValue({
            sublistId: 'apply',
            fieldId: 'amount', // Might need to set total, and due amounts?
            value: detail.amount
          });

          // RefNum
          newVendorPayment.setCurrentSublistValue({
            sublistId: 'apply',
            fieldId: 'refnum',
            value: detail.refNum
          });

          // Discount
          newVendorPayment.setCurrentSublistValue({
            sublistId: 'apply',
            fieldId: 'disc',
            value: detail.discountTotal
          });

          // Line Custom Fields
          newVendorPayment.commitLine({
            sublistId: 'apply'
          });

        } // block for looping billpayment else block
      } //payment doesnt exist block

      // 1-1 payment processing - save record
      if (paymentExists == false) {

        // Save record
        var forceSave = scriptRef.getParameter('customscript_coupa_chrg_forcesave');
        log.audit('about to call save', 'calling save');

        var coupaURL = scriptRef.getParameter('custscript_coupa_er2vbpay_url');
        var paymentID = payment.id;
        //NIB-335- Payment URL field added on payment record
        log.audit('Setting Coupa Payment URL: ', coupaURL + "/coupa_pay/expenses/payments/" + paymentID);
        newVendorPayment.setValue({
          fieldId : 'custbody_coupa_payment_url',
          value : coupaURL + "/coupa_pay/expenses/payments/" + paymentID  
        });
        var newRecordId;
        if (forceSave == true) {
          newRecordId = newVendorPayment.save({
            enableSourcing: true,
            ignoreMandatoryFields: true
          });
        } else {
          newRecordId = newVendorPayment.save({
            enableSourcing: true,
            ignoreMandatoryFields: false
          });
        }

        log.audit('newrecordid', newRecordId);
        //   log.audit('creditConsumed', 'creditConsumed: ' + Math.abs(creditConsumed) + ', detail amount: ' + detail.amount);
        if (newRecordId != null && newRecordId != '') {
          paymentSuccess = true;
        } else {
          log.audit('Failed to create new VendorPayment', 'Saving vendor payment returned: "' + newRecordId + '" putting vendor bill back on payment hold');
          paymentSuccess = false;

          for (var idx3 in billPayments) {
            var detail = billPayments[idx3];
            var vendorBillId = getNetSuiteVendorBillId(detail.coupaInvoiceId);

            record.submitFields({
              type: record.Type.VENDOR_BILL,
              id: vendorBillId,
              values: {
                paymenthold: true
              }
            });
          }
        } // else block on failed to create new vendorpayment
      } // 1-1 payment processing - save record
      log.debug("Payment Success is ", paymentSuccess);
      return paymentSuccess;
    }

    // Send Notifications
    function sendNotification(errorMsg) {
      log.debug("Error Notification Function Executed", errorMsg);
      var scriptRef = runtime.getCurrentScript();
      var errorTo = scriptRef.getParameter('custscript_coupa_er2vbpay_errorto');
      var errorFrom = scriptRef.getParameter('custscript_coupa_er2vbpay_errorfrm');
      log.debug("Function Notification", "Coupa/NetSuite Payment Integration Error")

      var notification = {
        author: errorFrom,
        recipients: errorTo.split(","),
        subject: 'Coupa/NetSuite Payment Integration Error',
        body: errorMsg
      };
      email.send(notification);

    }

    function getPaymentDetails(payment) {
      var scriptRef = runtime.getCurrentScript();
      var billPayments = [];
      var creditPayments = [];
      var creditsInPayment = false;
      var payFromAccountCurrency = payment["pay-from-account"]?payment["pay-from-account"]["currency"]["code"]:'';
      var payToAccountCurrency = payment["payment-details"][0]?payment["payment-details"][0]["currency"]["code"]:'';
      var isSameCurrencyPayment = payFromAccountCurrency==payToAccountCurrency?true:false;
      log.debug('getting details for', payment);
      for (var idx in payment["payment-details"]) {
        var detail = payment['payment-details'][idx];
        log.debug('payment detail', detail);

        var detailJson = {
          amount: detail['payment-total'],
          discountTotal: detail['discount-total'],
          refNum: detail['source-transaction-reference'],
          coupaInvoiceId: detail['source-transaction-id'],
          tranId: 'Payment ' + payment.id,
        };

        if (detail['payment-total'].indexOf('-') > -1) {
          creditsInPayment = true;
          detailJson['creditApplied'] = false;
          creditPayments.push(detailJson);
        } else {
          billPayments.push(detailJson);
        }
        log.debug('payment detail json', detailJson);
      }
      var result = {
        billPayments: billPayments,
        creditPayments: creditPayments,
        creditsInPayment: creditsInPayment,
        isSameCurrencyPayment : isSameCurrencyPayment
      };
      return result;
    }

    function getNetSuitePaymentId(tranId) {
      var reportId = '';
      search.create({
        type: search.Type.VENDOR_PAYMENT,
        filters: [
          ['tranId', search.Operator.IS, tranId]
        ],
        columns: ['internalid'],
      }).run().each(function (result) {
        reportId = result.id;
      });
      if (reportId == null || reportId == '') {
        search.create({
          type: search.Type.VENDOR_PAYMENT,
          filters: [
            [ 'externalidstring', search.Operator.IS, 'Processed-CoupaPay' + tranId ]	//NIB-301 Operator changed from CONTAINS to IS & added prefix to tranId
          ],
          columns: ['internalid'],
        }).run().each(function (result) {
          reportId = result.id;
        });
      }
       log.audit({
        title: 'reportId returned from getNetSuitePaymentId is',
        details: reportId
      });
      return reportId;
    }

    function isNetSuitePaymentVoidStatus(tranId) {
      var filters = [];

      filters.push(['tranId', search.Operator.IS, tranId], 'and');
      filters.push(['status', search.Operator.IS, 'VendPymt:V']);

      log.debug('filters is ', filters);
      var billId = '';
      search.create({
        type: search.Type.VENDOR_PAYMENT,
        filters: filters,
        columns: ['internalid'],
      }).run().each(function (result) {
        billId = result.id;
      });
      if (billId == null || billId == '') {
        return false;
      } else {
        return true;
      }
    }


    /**
     * Description: Added support for Cross Border Payments by providing support to COA_ID==NS_GL_ACCOUNT_INTERNAL_ID & COA_ID==NS_GL_ACCOUNT_INTERNAL_ID==SUBSIDIARY_ID
     * NIB#: NIB-291 
     * @param payFromAccount
     * @param paymentDetails     
     * @return {string} accountId
     */
    function getNetSuitePayFromAccount(payFromAccount, paymentDetails) {
        var accountId = "";
        var scriptRef = runtime.getCurrentScript();
        var coupaAccountToNSAccount = scriptRef.getParameter('custscript_coupa_er2vbpay_accm');
        var payFromAccountId = payFromAccount.id;
        log.debug('payFromAccount is: ', payFromAccountId);
        var accSplits = coupaAccountToNSAccount.split(';');

        var payFromAccountCurrency = paymentDetails["pay-from-account"]?paymentDetails["pay-from-account"]["currency"]["code"]:'';
        var payToAccountCurrency = paymentDetails["payment-details"][0]?paymentDetails["payment-details"][0]["currency"]["code"]:'';
        if (payFromAccountCurrency){
          payFromAccountCurrency = getCurrencyId(payFromAccountCurrency);
        }
        if (payToAccountCurrency){
          payToAccountCurrency = getCurrencyId(payToAccountCurrency);
        }
        paymentDetails = getPaymentDetails(paymentDetails);
        var vendorBillId = paymentDetails.billPayments[0] ? paymentDetails.billPayments[0]['coupaInvoiceId'] : '';
        if (vendorBillId) {
          var subsidiaryId = getSubsidiary(vendorBillId);
          log.debug('Subsidiary Id after search', subsidiaryId);
           subsidiaryCurrencyId = getSubsidiaryCurrencyId(subsidiaryId);
           log.debug('subsidiaryCurrency Id: ', subsidiaryCurrencyId);
          for (var i = 0; i < accSplits.length; i++) {
            var pair = accSplits[i];
            pair = pair.split('==');
            var pairLen = pair.length;
            var paramCOAId = pair[0];
            var paramNsAccId = pair[1];
            var paramSubId = pair[2] ? pair[2] : null;
            log.debug('paramCOAId: ', paramCOAId);
            log.debug('payFromAccount: ', payFromAccount);
            log.debug('paramSubId: ', paramSubId);
            log.debug('subsidiaryId: ', subsidiaryId);
                if(pairLen == 4){     //NIB-312: Search account when the currency provided in Mapping matches with the currency of Vendor Bill
                  var netsuiteAccid =  getNetsuiteAccountId(pair[1]);
                  var accountCurrency = getAccountCurrencyId(netsuiteAccid);
                  log.debug('pair[0]: ' + pair[0] + ' == payFromId: ' + payFromAccountId,  pair[0] == payFromAccountId);
                  log.debug('pair[2]: ' + pair[2] + ' == subsidiaryId: ' + subsidiaryId,  pair[2] == subsidiaryId);
                  log.debug('accountCurrency: ' + accountCurrency + ' == subsidiaryCurrencyId: ' + subsidiaryCurrencyId, accountCurrency == subsidiaryCurrencyId);
                  log.debug('payToAccountCurrency: ' + payToAccountCurrency + ' != payFromAccountCurrency: ' + payFromAccountCurrency, payToAccountCurrency != payFromAccountCurrency);
                  if(pair[0] == payFromAccountId && pair[2] == subsidiaryId && accountCurrency == subsidiaryCurrencyId && payToAccountCurrency != payFromAccountCurrency) {
                    var accountId =  getNetsuiteAccountId(pair[1]);
                    log.audit('Coupa Account ID ' + payFromAccountId + ' matches ' + pair + '! returning ' +accountId);
                    return accountId;
                  } else{
                    log.debug('Skipping Mapping ' + pair , ' Reason: Default Payment Account not found.');
                  }          
                } else if(pairLen == 3 && paramSubId){
                  if (paramCOAId == payFromAccountId && paramSubId == subsidiaryId) {
                    log.debug('glaccount CoA ' + payFromAccountId + ' matches pair at index: ' + i + ' with subsidiary: ' + paramSubId + ' returning ' + paramNsAccId);
                    accountId = getNetsuiteAccountId(paramNsAccId);
                  }
                } else {
                  if (paramCOAId == payFromAccountId) {
                    log.debug('glaccount CoA ' + payFromAccountId + ' matches pair at index: ' + i + ' returning ' + paramNsAccId);
                    accountId = getNetsuiteAccountId(paramNsAccId);
                  }
                }
              }
            }
        log.debug('accountId to be returned from getNetSuitePayFromAccount is: ', accountId);
        return accountId;
    }


    /**
     * Description: Search for the subsidiary on the Vendor Bill and returns subsidiary if found. If the account has no subsidiaries returns "" and adds a Audit log
     * NIB#: NIB-283 (Added oneWorld Account check)
     * @param vendorBillId
     * @return {string} subsidiaryId
     */
    function getSubsidiary(vendorBillId) {
      log.debug("vendorBillId in getSubsidiary: ", vendorBillId);
        var subsidiaryId = "";
        var isOneWorld = runtime.isFeatureInEffect({    //returns true if oneworld feature i.e subsidiary enabled or returns false
            feature: 'SUBSIDIARIES'
        });
        if (isOneWorld) {
            try {
                var searchColumns = [search.createColumn({name: "subsidiary", label: "Subsidiary"})];
                var expenseReportSearchObj = search.create({
                    type: search.Type.VENDOR_BILL,
                    filters:
                        [
                            ["externalid", search.Operator.IS, 'CoupaExpenseReport-VendorBill' + vendorBillId],
                            "AND",
                            ["mainline", search.Operator.IS, true]
                        ],
                    columns: searchColumns
                });
                var searchResultCount = expenseReportSearchObj.runPaged().count;
                log.debug("vendorBill result count", searchResultCount);
                expenseReportSearchObj.run().each(function (result) {
                    subsidiaryId = result.getValue(searchColumns[0]);
                    return true;
                });
            } catch (e) {
                if (e.message == "An nlobjSearchColumn contains an invalid column, or is not in proper syntax: subsidiary.") {
                    log.audit("No Subsidiary found", "One World Feature not enabled");
                } else {
                    log.error("Error in getSubsidiary()", JSON.stringify(e));
                }
            }
        } else {
            log.audit("No Subsidiary found", "One World Feature not enabled");
        }
        log.debug("Returning Subsidiary: ", subsidiaryId);
        return subsidiaryId;
    }


    function getNetsuiteAccountId(accountNumber) {
      var netsuite_account_id = null;
      search.create({
        type: search.Type.ACCOUNT,
        filters: [
          ['number', search.Operator.IS, accountNumber], 'and', ['isinactive', search.Operator.IS, false]
        ],
        columns: ['internalid'],
      }).run().each(function (result) {
        netsuite_account_id = result.id;
      });
      return netsuite_account_id;
    }


    function getNetSuiteVendorBillId(invoiceId) {
      var billId = null;
      search.create({
        type: search.Type.VENDOR_BILL,
        filters: [
          ['externalid', search.Operator.IS, 'CoupaExpenseReport-VendorBill' + invoiceId]
        ], // , 'and', ['status',
        // search.Operator.IS, 'open']
        // ],
        // filters : [ [ 'externalidstring', search.Operator.CONTAINS, invoiceId ] ],
        columns: ['internalid'],
      }).run().each(function (result) {
        billId = result.id;
      });
      if (billId == '' || billId == null) {
        return '';
      }
      return billId;
    }


    function getPostingPeriod(dateString) {
      log.debug('getting posting period', 'provided date: ' + dateString);
      var dateObj = convertCoupaDateToNetSuiteDate(dateString); // .toDateString({month: '2-digit',
      // day: '2-digit', year:
      // '2-digit'});
      var nsDate = format.format({
        value: dateObj,
        type: format.Type.DATE,
      });
      log.debug('ns date', nsDate);
      var postingPeriodId = null;

      var filters = [];
      var columns = [];

      filters.push(['enddate', search.Operator.ONORBEFORE, nsDate], 'and');
      filters.push(['aplocked', search.Operator.IS, false], 'and');
      filters.push(['closed', search.Operator.IS, false], 'and');
      filters.push(['isquarter', search.Operator.IS, false], 'and');
      filters.push(['isyear', search.Operator.IS, false]);
      log.debug('filters is ', filters);

      columns.push(search.createColumn({
        name: 'startdate',
        sort: search.Sort.DESC,
      }));

      var periodSearch = search.create({
        type: search.Type.ACCOUNTING_PERIOD,
        filters: filters,
        columns: columns,
      });

      var result = periodSearch.run().getRange(0, 1); // returns only the
      // first result of the
      // search which is the
      // first available
      // unlocked period

      if (result != null && result.length > 0)
        postingPeriodId = result[0].getValue({
          name: 'internalid',
        });

      if (!postingPeriodId) {
        var filters1 = [];
        var columns1 = [];

        filters1.push(['startdate', search.Operator.ONORBEFORE, nsDate], 'and');
        filters1.push(['aplocked', search.Operator.IS, false], 'and');
        filters1.push(['closed', search.Operator.IS, false], 'and');
        filters1.push(['isquarter', search.Operator.IS, false], 'and');
        filters1.push(['isyear', search.Operator.IS, false]);

        columns1.push(search.createColumn({
          name: 'enddate',
          sort: search.Sort.DESC,
        }));

        var periodSearch1 = search.create({
          type: search.Type.ACCOUNTING_PERIOD,
          filters: filters1,
          columns: columns1,
        });
        var result1 = periodSearch1.run().getRange(0, 1); // returns only the
        // first result of
        // the search which
        // is the first
        // available
        // unlocked period

        if (result1 != null && result1.length > 0)
          postingPeriodId = result1[0].getValue({
            name: 'internalid',
          });
      }

      return postingPeriodId;
    }

    function convertCoupaDateToNetSuiteDate(coupaDate) {
      var nDate = coupaDate.split('T');
      var datesplit = nDate[0].split('-');
      var Nyear = datesplit[0];
      var Nday = datesplit[2];
      var Nmonth = datesplit[1];
      return new Date(Nyear, Nmonth - 1, Nday);
    }

    function getCurrencyId(currencyCode) {
      var netsuite_currency_id = null;
      log.debug("currencyCode: ", currencyCode);
      log.audit("is Multicurrency Feature In Effect? ", runtime.isFeatureInEffect('multicurrency'));
      if (runtime.isFeatureInEffect('multicurrency')) {   //NIB#409
        search.create({
          type: search.Type.CURRENCY,
          filters: [
            ['symbol', search.Operator.IS,
              currencyCode
            ]
          ],
          columns: ['internalid'],
        }).run().each(function (result) {
          netsuite_currency_id = result.id;
        });
      } else {
        var scriptRef = runtime.getCurrentScript();
        netsuite_currency_id = scriptRef.getParameter('custscript_coupa_er2vbpay_def_currency');
      }
      log.audit("Currency returned from getCurrencyId: ", netsuite_currency_id);
      return netsuite_currency_id;
    }

    /**
 * Description: This function search for the currency of the Subsidiary passed as parameter
 * NIB#: NIB-312
 * @param subsidiaryId string  subsidiary Id
 * @return {void}
 */
 function getAccountCurrencyId(accountId) {
  var currency = "";
  if (accountId) {
    try {
      var accountRecord = record.load({
        type: record.Type.ACCOUNT,
        id: accountId,
      });
      if (accountRecord) {
        currency = accountRecord.getValue({
          fieldId: 'currency'
        });
      }
    } catch (e) {
      log.error({
        title: 'Error while searching Account Currency',
        details: JSON.stringify(e)
      })
    }
    log.audit("Currency searched for the account: ", JSON.stringify(currency));
  }
  return currency ? currency : '';
}

/**
 * Description: This function search for the currency of the Subsidiary passed as parameter
 * NIB#: NIB-312
 * @param subsidiaryId string  subsidiary Id
 * @return {void}
 */
 function getSubsidiaryCurrencyId(subsidiaryId) {
  var currencyObj = "";
  if (subsidiaryId) {
    var fieldLookUp = search.lookupFields({
      type: search.Type.SUBSIDIARY,
      id: subsidiaryId,
      columns: ['currency']
    });
    currencyObj = fieldLookUp.currency;
    log.audit("Currency searched for the subsidiary: ", JSON.stringify(currencyObj));
  }
  return currencyObj ? currencyObj[0].value : '';
}

/**
 * This function gets the msp of custom fieldd from a payment response
 * NIB#: 368
 *
 * @param obj JSON response
 * @param prop custom-field mapping
 * @param defval custom-field mapping
 * @return value
 * mapping example: charge-allocations.1.account.segment-4;
 */
 function getHeaderCustomFields(currentPayment){
	var scriptRef = runtime.getCurrentScript();
	var headerCustomFields = scriptRef.getParameter('custscript_coupa_er2vbpay_header_custfil');
	if (headerCustomFields) {
		var custFieldSplit = headerCustomFields.split(';');
		var customFieldsMap = {};
		for (var i = 0; i < custFieldSplit.length; i++) {
			var linePair = custFieldSplit[i];
			var linePairSplit = linePair.split('==');
          if (linePairSplit && linePairSplit.length == 2) {
            customFieldsMap[linePairSplit[1]] = getCustomFieldValue(currentPayment, linePairSplit[0]);
            log.debug("Header customCoupa Field Key: " + linePairSplit[0], "value fetched :" + getCustomFieldValue(currentPayment, linePairSplit[0]));
          } else if (linePairSplit && linePairSplit.length == 3) {
            var coupaField = linePairSplit[0];
            var nsField = linePairSplit[1];
            var fieldType = linePairSplit[2];
            if (fieldType == "DATE") {
              customFieldsMap["DATE: " + linePairSplit[1]] = processDataTypeMapping(currentPayment, coupaField, nsField, fieldType);
            } else {
              customFieldsMap[linePairSplit[1]] = processDataTypeMapping(currentPayment, coupaField, nsField, fieldType);
            }
            log.debug("Header customCoupa Field Key: " + linePairSplit[0], "value fetched :" + customFieldsMap[linePairSplit[1]]);
          }
		}
		log.debug("HeaderCustomFields Map returned :", JSON.stringify(customFieldsMap));
		return customFieldsMap;
	}
}


/**
 * This function gets the value of custom field from a nested JSON
 * NIB#: 368
 *
 * @param obj JSON response
 * @param prop custom-field mapping
 * @param defval custom-field mapping
 * @return value
 * mapping example: charge-allocations.0.account.segment-4;
 */
  function getCustomFieldValue(obj, prop, defval) {
      log.debug('In getCustomFieldValue: obj', JSON.stringify(obj));
      log.debug('In getCustomFieldValue: prop', JSON.stringify(prop));
      if (typeof defval == 'undefined') defval = "";
      prop = prop.split('.');
      for (var i = 0; i < prop.length; i++) {
          if (obj==undefined || typeof obj[prop[i]] == 'undefined')
              return defval;
          obj = obj[prop[i]];
      }
      return obj;
  }

    /**
     * Proccess custom field mapping with data type
     * NIB# - NIB-423
     * @param currentPayment
     * @param coupaField
     * @param nsField
     * @param fieldType
     * @return {*[]|boolean}
     */
    function processDataTypeMapping(currentPayment, coupaField, nsField, fieldType) {
      var value = getCustomFieldValue(currentPayment, coupaField);

      switch (fieldType) {
        case "DATE":
          if (value && value != undefined && value != null) {
            var dateObj = convertCoupaDateToNetSuiteDate(value);
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
        default:
          value = getCustomFieldValue(currentPayment, coupaField);
          break;
      }
      log.debug('Returning Field Value: ' + value, ' FieldType: ' + fieldType);
      return value;
    }

    /**
     * get array of the values from the multi-select field node
     * NIB# - NIB-423
     * @param customFieldNode
     * @param customFieldId
     * @return {*[]}
     */
    function getMultiSelectList(customFieldNode, customFieldId) {
      var multiSelectArray = [];
      if (customFieldNode && customFieldNode.length > 0) {
        for (var i in customFieldNode) {
          multiSelectArray.push(customFieldNode[i]["external-ref-code"]);
        }
      } else {
        log.audit("Multi-select field skipped", "Multi-select custom field not available in script parameter");
      }
      log.audit("multiSelectArray returned from getMultiSelectList: ", JSON.stringify(multiSelectArray));
      return multiSelectArray;
    }
    return {
      getInputData: getInputData,
      map: map,
      reduce: reduce,
      summarize: summarize
    };

  });