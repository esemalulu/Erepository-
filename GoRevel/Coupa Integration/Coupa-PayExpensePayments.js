/**
 * @NApiVersion 2.1
 * @NScriptType MapReduceScript
 * @NModuleScope SameAccount
 */
define(
  [ 'N/config', 'N/email', 'N/error', 'N/format', 'N/https', 'N/record', 'N/runtime', 'N/search',
    'N/transaction', './Coupa - OpenIDConnect 2.0' ],
  function(config, email, error, format, https, record, runtime, search, transaction, oidc) {
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
      
      var errorTo = scriptRef.getParameter('custscript_coupa_erpay_errorto');
      var errorFrom = scriptRef.getParameter('custscript_coupa_erpay_errorfrm');
      var status_filter = scriptRef.getParameter('custscript_coupa_erpay_status_filter');
      if (status_filter == null || status_filter == '') {
        status_filter = false;
      }
      var cust_args = scriptRef.getParameter('custscript_coupa_erpay_cust_args');
      var host = scriptRef.getParameter('custscript_coupa_erpay_url');
      var api_key = scriptRef.getParameter('custscript_coupa_erpay_apikey');
      var customStatus = scriptRef.getParameter('custscript_coupa_erpay_status');
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
          url : getUrl,
          headers : postHeaders
        });
      } catch (e) {
        var errorMsg = 'Error making API call to Coupa, with Query: ' + getUrl;
        log.error('getInputData', errorMsg);
        log.error('getInputData', e.message);

        var notification = {
          author : errorFrom,
          recipients : errorTo.split(","),
          subject : 'Coupa/NetSuite Payment Integration Error',
          body : errorMsg
        };
        email.send(notification);

        var err = error.create({
          name : 'Coupa API Failure',
          message : errorMsg,
          notifyOff : false
        });
        err.toString = function() {
          return err.message;
        };
        throw err;
      }

      if (response.code == 200) {
        // good response
        log.audit('Succesfully retrieved Payments', response);
        var payments = JSON.parse(response.body);
        log.audit('Succesfully retrieved Payments', 'Got ' + payments.length + ' payments');
        var useUpdatedAtDate = scriptRef.getParameter('custscript_coupa_erpay_use_updated_at') == true ? true : false;
        log.audit("Use Updated At Date as Payment Date?", useUpdatedAtDate);
        for (var i = 0; i < payments.length; i++) {
          var currentPayment = payments[i];
          var payFromAccountCurrency = currentPayment["pay-from-account"]?currentPayment["pay-from-account"]["currency"]["code"]:'';
          var payToAccountCurrency = currentPayment["payment-details"][0]?currentPayment["payment-details"][0]["currency"]["code"]:'';
          var isSameCurrencyPayment = payFromAccountCurrency==payToAccountCurrency?true:false;
          var paymentJson = {
            id : currentPayment.id,
            exchangeRate : currentPayment['exchange-rate'], //NIB-264-> Apply inverse of the exchange rate from the payload
            status : currentPayment.status,
            pay_from_account : getNetSuitePayFromAccount(currentPayment['pay-from-account'], currentPayment),
            currency : getCurrencyId(currentPayment['pay-to-currency']['code']),
            entityId : currentPayment['payee']['number'],
            payment_date: useUpdatedAtDate ? currentPayment['updated-at'] : currentPayment['released-at'],
            headerCustomFields : getHeaderCustomFields(currentPayment),
            paymentDetails : getPaymentDetails(currentPayment),
            isSameCurrencyPayment : isSameCurrencyPayment,
            requestHeader : postHeaders
          };
          //log.debug('Queuing Payment for processing', paymentJson);
          documents.push(paymentJson); // each document will be processed by one map step
        }
      } else if (response.code == 404) {
        log.audit('No payments pending export', 'URL: ' + getUrl);
      } else {
        // bad response
        var errorMsg = 'Error making API call to Coupa, with Query: ' + getUrl
          + ' Response Code is: ' + response.code + ' Response Body is: ' + response.body;
        log.error('getInputData', errorMsg);

        var notification = {
          author : errorFrom,
          recipients : errorTo.split(","),
          subject : 'Coupa/NetSuite Payment Integration Error',
          body : errorMsg
        };
        email.send(notification);

        var err = error.create({
          name : 'COUPA_API_ERROR',
          message : 'Failed to Call to Coupa. Received code' + response.code + ' with response: '
            + response.body
        });
        err.toString = function() {
          return err.message;
        };
        throw err;
      }
      //get payments with completed Error Statys
      if(status_filter ==  false){
        if(cust_args == '' || cust_args == null){
          var getErrorsUrl = baseURL + 'completed_with_errors';
        } else {
          var getErrorsUrl = baseURL + 'completed_with_errors';
        } 
      log.audit('Search', 'querying Coupa with ' + getErrorsUrl);

      try {
        var response = https.get({
          url : getErrorsUrl,
          headers : postHeaders
        });
      } catch (e) {
        var errorMsg = 'Error making API call to Coupa, with Query: ' + getErrorsUrl;
        log.error('getInputData', errorMsg);
        log.error('getInputData', e.message);

        var notification = {
          author : errorFrom,
          recipients : errorTo.split(","),
          subject : 'Coupa/NetSuite Payment Integration Error',
          body : errorMsg
        };
        email.send(notification);

        var err = error.create({
          name : 'Coupa API Failure',
          message : errorMsg,
          notifyOff : false
        });
        err.toString = function() {
          return err.message;
        };
        throw err;
      }

      if (response.code == 200) {
        // good response
        log.audit('Succesfully retrieved errored Payments', response);
        var payments = JSON.parse(response.body);
        log.audit('Succesfully retrieved errored Payments', 'Got ' + payments.length + ' errored payments');
        for (var i = 0; i < payments.length; i++) {
          var currentPayment = payments[i];
          var paymentJson = {
            id : currentPayment.id,
            status : currentPayment.status,
            headerCustomFields : getHeaderCustomFields(currentPayment),
            paymentDetails : getPaymentDetails(currentPayment),
            requestHeader : postHeaders
          };
          log.debug('Queuing errored payment for processing', paymentJson);
          documents.push(paymentJson); // each document will be processed by one map step
        }
      } else if (response.code == 404) {
        log.audit('No completed with errors payments pending export', 'URL: ' + getUrl);
      } else {
        // bad response
        var errorMsg = 'Error making API call to Coupa, with Query: ' + getErrorsUrl
          + ' Response Code is: ' + response.code + ' Response Body is: ' + response.body;
        log.error('getInputData', errorMsg);

        var notification = {
          author : errorFrom,
          recipients : errorTo.split(","),
          subject : 'Coupa/NetSuite Payment Integration Error',
          body : errorMsg
        };
        email.send(notification);

        var err = error.create({
          name : 'COUPA_API_ERROR',
          message : 'Failed to Call to Coupa. Received code' + response.code + ' with response: '
            + response.body
        });
        err.toString = function() {
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

      var paymentSuccess = true;
      var payment = JSON.parse(context.value);
      var requestHeader = payment.requestHeader
      var reportPayments = payment.paymentDetails;
      for ( var idx in reportPayments) {
        var detail = reportPayments[idx];
        var expenseReport = getNetSuiteExpenseReport(detail.coupareportId);
        var expenseReportId = expenseReport.id;
        if (payment.status == 'completed_with_errors') {
          // Need to void the payment
          var existingPaymentId = getNetSuitePaymentId(detail.tranId);
          if (existingPaymentId != '' && existingPaymentId != null) {
            log.audit('Coupa Payment ' + payment.id,
              'Payment is completed_with_errors, so voiding ' + detail.tranId + ' in NetSuite');
            var voidedPaymentId = transaction.void({
              type : transaction.Type.VENDOR_PAYMENT,
              id : existingPaymentId,
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
              log.error('Coupa Payment ' + payment.id, 'Failed to void payment, void returned: '
                + voidedPaymentId);
              paymentSuccess = false;
            }

            log.audit('Coupa Payment ' + payment.id, 'Placing Expense Report ' + expenseReport.id
              + ' back on Payment Hold');
    
              expenseReport = record.load({
                type: record.Type.EXPENSE_REPORT,
                id: expenseReportId,
              });
              expenseReport.setValue({
                fieldId : 'accountingapproval',
                value : false
              });
              expenseReport.setValue({
                fieldId : 'complete',
                value : false
              });
          
            expenseReport.save({
              ignoreMandatoryFields : true,
            });
            log.audit('Coupa Payment ' + payment.id, 'Successfully put Expense Report ' + expenseReportId
              + ' on Payment Hold');

          } else {
            log.audit('Coupa Payment ' + payment.id,'Payment is completed_with_errors, but doesn\'t exist in NetSuite. Marking exported');
            //NIB-296-> accountingapproval & complete checkbox on the ER to be unchecked if payment with status: completed_with_errors not found in NS
            log.audit('Coupa Payment ' + payment.id, 'Placing Expense Report ' + expenseReport.id + ' back on Payment Hold');
            var expenseReport = record.load({
              type: record.Type.EXPENSE_REPORT,
              id: expenseReportId,
            });
            expenseReport.setValue({
              fieldId : 'accountingapproval',
              value : false
            });
            expenseReport.setValue({
              fieldId : 'complete',
              value : false
            });

            expenseReport.save({
              ignoreMandatoryFields : true,
            });
            log.audit('Coupa Payment ' + payment.id, 'Successfully put Expense Report ' + expenseReportId + ' on Payment Hold');

            paymentSuccess = true;
          }
        } else {
          
          if (expenseReport == '' || expenseReport == null) {
            log.error('Expense Report Not Found', 'Expense Report not found for coupa ID '
              + detail.coupareportId);
            paymentSuccess = false;
            break;
          }
          
          var expenseReportId = expenseReport.id;
          log.debug('report id', expenseReportId);
          
        
  
            expenseReport.setValue({
              fieldId : 'accountingapproval',
              value : true
            });
            expenseReport.setValue({
              fieldId : 'complete',
              value : true
            });
        
          expenseReport.save({
            ignoreMandatoryFields : true
          });
          
          var newVendorPayment = record.create({
            type : record.Type.VENDOR_PAYMENT,
            isDynamic : true,
            defaultValues: {
              entity: expenseReport.getValue('entity'),
              bill: expenseReportId
            }
          });

          //NIB#386 - Default Segment from Script Parameter or Expense Report
          var headerDepartmentRequired = scriptRef.getParameter('custscript_coupa_erpay_headdept');
          log.debug('Coupa Expense Payment ' + payment.id, 'Department Header mapping is: ' + headerDepartmentRequired);
          var headerClassRequired = scriptRef.getParameter('custscript_coupa_erpay_headclass');
          log.debug('Coupa Expense Payment ' + payment.id, 'Class Header mapping is: ' + headerClassRequired);
          var headerLocationRequired = scriptRef.getParameter('custscript_coupa_erpay_headlocn');
          log.debug('Coupa Expense Payment ' + payment.id, 'Location Header mapping is: ' + headerLocationRequired);
          var subsidiary = "";
          if ((headerDepartmentRequired && headerDepartmentRequired != '') || (headerClassRequired && headerClassRequired != '') || (headerLocationRequired && headerLocationRequired != '')) {
            var expenseReport = record.load({
              id: expenseReportId,
              type: record.Type.EXPENSE_REPORT,
            });
            subsidiary = expenseReport.getValue({
              fieldId: 'subsidiary'
            });
          }

          if (headerDepartmentRequired && headerDepartmentRequired != '') {
            log.debug('Coupa Expense Payment ' + payment.id, 'Inside headerDepartmentRequired section');
            var departmentId = getSegmentDefaultValue('department', subsidiary);
            if (!departmentId) {
              departmentId = expenseReport.getSublistValue({
                sublistId: 'expense',
                fieldId: 'department',
                line: 0
              });
              log.debug('Coupa Expense Payment ' + payment.id, 'Sourcing Department from Expense Report: ' + departmentId);
            }
            log.debug('Coupa Expense Payment ' + payment.id, 'About to store ' + departmentId + ' as department');
            newVendorPayment.setValue({
              fieldId: 'department',
              value: departmentId
            });
          }

          if (headerClassRequired && headerClassRequired != '') {
            log.debug('Coupa Expense Payment ' + payment.id, 'Inside headerClassRequired section');
            var classId = getSegmentDefaultValue('class', subsidiary);
            if (!classId) {
              classId = expenseReport.getSublistValue({
                sublistId: 'expense',
                fieldId: 'class',
                line: 0
              });
              log.debug('Coupa Expense Payment ' + payment.id, 'Sourcing Class from Expense Report: ' + classId);
            }
            log.debug('Coupa Expense Payment ' + payment.id, 'About to store ' + classId + ' as class');
            newVendorPayment.setValue({
              fieldId: 'class',
              value: classId
            });
          }

          if (headerLocationRequired && headerLocationRequired != '') {
            log.debug('Coupa Expense Payment ' + payment.id, 'Inside headerLocationRequired section');
            var locationId = getSegmentDefaultValue('location', subsidiary);
            if (!locationId) {
              locationId = expenseReport.getSublistValue({
                sublistId: 'expense',
                fieldId: 'location',
                line: 0
              });
              log.debug('Coupa Expense Payment ' + payment.id, 'Sourcing Location from Expense Report: ' + locationId);
            }
            log.debug('Coupa Payment ' + payment.id, 'About to store ' + locationId + ' as location');
            newVendorPayment.setValue({
              fieldId: 'location',
              value: locationId
            });
          }

          // Currency
          newVendorPayment.setValue({
            fieldId : 'currency',
            value : payment.currency
          });

          // Account
          newVendorPayment.setValue({
            fieldId : 'account',
            value : payment.pay_from_account
          });

          // Posting Period
          newVendorPayment.setValue({
            fieldId : 'postingperiod',
            value : getPostingPeriod(payment.payment_date)
          });

          // TranDate
          newVendorPayment.setValue({
            fieldId : 'trandate',
            value : convertCoupaDateToNetSuiteDate(payment.payment_date)
          });

          // TranId
          newVendorPayment.setValue({
            fieldId : 'tranid',
            value : detail.tranId
          });

          // External ID
          newVendorPayment.setValue({
            fieldId : 'externalid',
            value : 'Processed-CoupaPay' + detail.tranId
          });

          if (!payment['isSameCurrencyPayment']) {
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
          //set custom fields

         // log.audit('Trying to set Custom Field', JSON.stringify(payment.headerCustomFields));
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
          // Find line for this Expense Report
          var lineIndex = newVendorPayment.findSublistLineWithValue({
            sublistId : 'apply',
            fieldId : 'doc',
            value : String(expenseReportId)
          });
          if (lineIndex == -1) {
            log.error('lineIndex not found!', 'Cant find sublist with doc ' + expenseReportId);
            paymentSuccess = false;
            break;
          } else {
            newVendorPayment.selectLine({
              sublistId : 'apply',
              line : lineIndex
            });
          }

          // Apply
          newVendorPayment.setCurrentSublistValue({
            sublistId : 'apply',
            fieldId : 'apply',
            value : true
          });

          // Amount
          newVendorPayment.setCurrentSublistValue({
            sublistId : 'apply',
            fieldId : 'amount',
            value : detail.amount
          });

          // RefNum
          newVendorPayment.setCurrentSublistValue({
            sublistId : 'apply',
            fieldId : 'refnum',
            value : detail.refNum
          });

          // Discount
          newVendorPayment.setCurrentSublistValue({
            sublistId : 'apply',
            fieldId : 'disc',
            value : detail.discountTotal
          });

          // Line Custom Fields
          newVendorPayment.commitLine({
            sublistId : 'apply'
          });
          
          // Save record
          var forceSave = scriptRef.getParameter('customscript_coupa_chrg_forcesave');
          log.audit('about to call save', 'calling save');

          var coupaURL = scriptRef.getParameter('custscript_coupa_erpay_url');
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
              enableSourcing : true,
              ignoreMandatoryFields : true
            });
          } else {
            newRecordId = newVendorPayment.save({
              enableSourcing : true,
              ignoreMandatoryFields : false
            });
          }
          log.audit('newrecordid', newRecordId);
          if (newRecordId != null && newRecordId != '') {
            paymentSuccess = paymentSuccess && true;
          } else {
            log.audit('Failed to create new VendorPayment', 'Saving vendor payment returned: "' + newRecordId + '" putting vendor bill back on payment hold');
            paymentSuccess = false;
          
              var expenseReport = record.load({
                type: record.Type.EXPENSE_REPORT,
                id: expenseReportId,
              });
              expenseReport.setValue({
                fieldId : 'accountingapproval',
                value : false
              });
              expenseReport.setValue({
                fieldId : 'complete',
                value : false
              });
          

            expenseReport.save({
              ignoreMandatoryFields : true
            });
          }
        }
      }
      var object = {};
      object.requestHeader = requestHeader;
      object.paymentSuccess = paymentSuccess;
      context.write({
        key : payment.id,
        value : object
      });
    }

    /**
     * Executes when the reduce entry point is triggered and applies to each group.
     * 
     * @param {ReduceSummary}
     *          context - Data collection containing the groups to process through the reduce stage
     * @since 2015.1
     */
    function reduce(context) {
      var scriptRef = runtime.getCurrentScript();
      var errorTo = scriptRef.getParameter('custscript_coupa_erpay_errorto');
      var errorFrom = scriptRef.getParameter('custscript_coupa_erpay_errorfrm');

      var paymentId = context.key;
      var object = JSON.parse(context.values[0]);
      var markExported = object.paymentSuccess;
      log.audit('Reduce Step', 'PaymentId: ' + paymentId + ' markExported? '
        + (markExported == true) + ' string: ' + (markExported == 'true'));

      if ((markExported == true) || (markExported == 'true')) {
        log.audit('Mark Exported', 'Preparing to mark payment ' + paymentId + ' as exported');
        var baseURL = scriptRef.getParameter('custscript_coupa_erpay_url');
        var api_key = scriptRef.getParameter('custscript_coupa_erpay_apikey');

        var putUrl = baseURL + '/api/coupa_pay/payments/' + paymentId + '?exported=true';
        log.audit('Mark Exported', 'Marking payment exported with ' + putUrl);

        try {
          var response = https.put({
            url : putUrl,
            headers : object.requestHeader,
          });
        } catch (e) {
          var errorMsg = 'Error making API call to Coupa, with Query: ' + putUrl;
          log.error('getInputData', errorMsg);
          log.error('getInputData', e.message);

          var notification = {
            author : errorFrom,
            recipients : errorTo.split(","),
            subject : 'Coupa/NetSuite Payment Integration Error',
            body : errorMsg,
          };
          email.send(notification);

          var err = error.create({
            name : 'Coupa API Failure',
            message : errorMsg,
            notifyOff : false,
          });
          err.toString = function() {
            return err.message;
          };
          throw err;
        }

        if (response.code != 200) {
          // bad response
          var errorMsg = 'Error making API call to Coupa, with Query: ' + putUrl
            + ' Response Code is: ' + response.code + ' Response Body is: ' + response.body;
          log.error('getInputData', errorMsg);

          var notification = {
            author : errorFrom,
            recipients : errorTo.split(","),
            subject : 'Coupa/NetSuite Payment Integration Error',
            body : errorMsg,
          };
          email.send(notification);

          var err = error.create({
            name : 'COUPA_API_ERROR',
            message : 'Failed to Call to Coupa. Received code' + response.code + ' with response: '
              + response.body,
          });
          err.toString = function() {
            return err.message;
          };
          throw err;
        } else {
          log.audit('Mark Exported', 'Marked payment ' + paymentId + ' as exported');
        }
      } else {
        log.audit('Mark Exported', 'Not marking payment ' + paymentId + ' as exported due to error creating payment records');
      }
    }

    /**
     * Executes when the summarize entry point is triggered and applies to the result set.
     * 
     * @param {Summary}
     *          summary - Holds statistics regarding the execution of a map/reduce script
     * @since 2015.1
     */
    function summarize(summary) {
      log.audit('Usage/Governance consumed: ', summary.usage);
      log.audit('Number of queues: ', summary.concurrency);
      log.audit('Number of Yields: ', summary.yields);
      log.audit('Summary of Errors: ', summary.inputSummary.error);
      summary.mapSummary.errors.iterator().each(function(code, message) {
        log.error('Map Error: ' + code, message);
      });
      var errorMsg = '';
      summary.mapSummary.errors.iterator().each(function(code, message) {
        log.error('Map Error: ' + code, message);
        errorMsg = errorMsg + message + "\n";
      });
    }

    function getPaymentDetails(payment) {
      var reportPayments = [];

      log.debug('getting details for', payment);
      for ( var idx in payment["payment-details"]) {
        var detail = payment['payment-details'][idx];
        log.debug('payment detail', detail);
        var detailJson = {
          amount : detail['payment-total'],
          discountTotal : detail['discount-total'],
          refNum : detail['source-transaction-reference'],
          coupareportId : detail['source-transaction-id'],
          tranId : 'Payment ' + payment.id + ' Detail ' + detail.id,
        };
        log.debug('payment detail json', detailJson);
        reportPayments.push(detailJson);
      }
      return reportPayments;
    }

    function getNetSuitePaymentId(tranId) {
      var reportId = '';
      search.create({
        type : search.Type.VENDOR_PAYMENT,
        filters : [ [ 'tranId', search.Operator.IS, tranId ] ],
        columns : [ 'internalid' ],
      }).run().each(function(result) {
        reportId = result.id;
      });
      if (reportId == null || reportId == ''){
        search.create({
          type : search.Type.VENDOR_PAYMENT,
          filters : [ [ 'externalidstring', search.Operator.IS, "Processed-CoupaPay" + tranId ] ], //NIB-300 Operator changed from CONTAINS to IS & added prefix to tranId
          columns : [ 'internalid' ],
        }).run().each(function(result) {
          reportId = result.id;
        });
      }
      log.audit({
        title: 'reportId returned from getNetSuitePaymentId is',
        details: reportId
      });
      return reportId;
    }

    /**
     * Description: Added support for Cross Border Payments by providing support to COA_ID==NS_GL_ACCOUNT_INTERNAL_ID & COA_ID==NS_GL_ACCOUNT_INTERNAL_ID==SUBSIDIARY_ID
     * NIB#: NIB-290 
     * @param payFromAccount
     * @param paymentDetails     
     * @return {string} accountId
     */
    function getNetSuitePayFromAccount(payFromAccount, paymentDetails) {
        var accountId = "";
        var scriptRef = runtime.getCurrentScript();
        var coupaAccountToNSAccount = scriptRef.getParameter('custscript_coupa_erpay_accmap');
        var payFromAccountId = payFromAccount.id;
        log.debug('payFromAccount is: ', payFromAccountId);
        var payFromAccountCurrency = paymentDetails["pay-from-account"]?paymentDetails["pay-from-account"]["currency"]["code"]:'';
        var payToAccountCurrency = paymentDetails["payment-details"][0]?paymentDetails["payment-details"][0]["currency"]["code"]:'';
        if (payFromAccountCurrency){
          payFromAccountCurrency = getCurrencyId(payFromAccountCurrency);
        }
        if (payToAccountCurrency){
          payToAccountCurrency = getCurrencyId(payToAccountCurrency);
        }
        var accSplits = coupaAccountToNSAccount.split(';');
        paymentDetails = getPaymentDetails(paymentDetails);
        var expenseReportId = paymentDetails ? paymentDetails[0]['coupareportId'] : '';
        if (expenseReportId) {
            var subsidiaryId = getSubsidiary(expenseReportId);
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
                } else if(pairLen == 3 && paramSubId) {
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
        return accountId;
    }

    /**
     * Description: Search for the subsidiary on the Expense Report and returns subsidiary if found. If the account has no subsidiaries returns "" and adds a Audit log
     * NIB#: NIB-282 (Added oneWorld Account check)
     * @param expenseReportId
     * @return {string} subsidiaryId
     */
    function getSubsidiary(expenseReportId) {
      log.debug("expenseReportId in getSubsidiary: ", expenseReportId);
        var subsidiaryId = "";
        var isOneWorld = runtime.isFeatureInEffect({    //returns true if oneworld feature i.e subsidiary enabled or returns false
            feature: 'SUBSIDIARIES'
        });
        if (isOneWorld) {
            try {
                var searchColumns = [search.createColumn({name: "subsidiary", label: "Subsidiary"})];
                var expenseReportSearchObj = search.create({
                    type: search.Type.EXPENSE_REPORT,
                    filters:
                        [
                            ["externalid", search.Operator.IS, 'Coupa-expensereport' + expenseReportId],
                            "AND",
                            ["mainline", search.Operator.IS, true]
                        ],
                    columns: searchColumns
                });
                var searchResultCount = expenseReportSearchObj.runPaged().count;
                log.debug("Expense Report result count", searchResultCount);
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
      search.create(
        {
          type : search.Type.ACCOUNT,
          filters : [ [ 'number', search.Operator.IS, accountNumber ], 'and',
            [ 'isinactive', search.Operator.IS, false ] ],
          columns : [ 'internalid' ],
        }).run().each(function(result) {
        netsuite_account_id = result.id;
      });
      return netsuite_account_id;
    }

    function getNetSuiteExpenseReport(reportId) {
      var nsReportId = null;
      log.debug('getReport', 'getting expense report for id ' + reportId);
      log.debug('getReport', 'search filter is Coupa-expensereport' + reportId);
        search.create({
          type : search.Type.EXPENSE_REPORT,
          filters : [ [ 'externalid', search.Operator.IS, 'Coupa-expensereport' + reportId ] ],
          columns : [ 'internalid' ],
        }).run().each(function(result) {
          nsReportId = result.id;
        });
        log.debug('after search', 'nsReportId is ' + nsReportId);
        if(nsReportId == '' || nsReportId == null){
          log.debug( 'after search', 'didnt find nsReportId: ' + nsReportId);
          return '';
        }
        return record.load({
          id : nsReportId,
          type : record.Type.EXPENSE_REPORT,
        });  
    }

    function getPostingPeriod(dateString) {
      log.debug('getting posting period', 'provided date: ' + dateString);
      var dateObj = convertCoupaDateToNetSuiteDate(dateString);// .toDateString({month: '2-digit',
      // day: '2-digit', year:
      // '2-digit'});
      var nsDate = format.format({
        value : dateObj,
        type : format.Type.DATE,
      });
      log.debug('ns date', nsDate);
      var postingPeriodId = null;

      var filters = [];
      var columns = [];

      filters.push([ 'enddate', search.Operator.ONORBEFORE, nsDate ], 'and');
      filters.push([ 'aplocked', search.Operator.IS, false ], 'and');
      filters.push([ 'closed', search.Operator.IS, false ], 'and');
      filters.push([ 'isquarter', search.Operator.IS, false ], 'and');
      filters.push([ 'isyear', search.Operator.IS, false ]);
      log.debug('filters is ', filters);

      columns.push(search.createColumn({
        name : 'startdate',
        sort : search.Sort.DESC,
      }));

      var periodSearch = search.create({
        type : search.Type.ACCOUNTING_PERIOD,
        filters : filters,
        columns : columns,
      });

      var result = periodSearch.run().getRange(0, 1); // returns only the
      // first result of the
      // search which is the
      // first available
      // unlocked period

      if (result != null && result.length > 0)
        postingPeriodId = result[0].getValue({
          name : 'internalid',
        });

      if (!postingPeriodId) {
        var filters1 = [];
        var columns1 = [];

        filters1.push([ 'startdate', search.Operator.ONORBEFORE, nsDate ], 'and');
        filters1.push([ 'aplocked', search.Operator.IS, false ], 'and');
        filters1.push([ 'closed', search.Operator.IS, false ], 'and');
        filters1.push([ 'isquarter', search.Operator.IS, false ], 'and');
        filters1.push([ 'isyear', search.Operator.IS, false ]);

        columns1.push(search.createColumn({
          name : 'enddate',
          sort : search.Sort.DESC,
        }));

        var periodSearch1 = search.create({
          type : search.Type.ACCOUNTING_PERIOD,
          filters : filters1,
          columns : columns1,
        });
        var result1 = periodSearch1.run().getRange(0, 1); // returns only the
        // first result of
        // the search which
        // is the first
        // available
        // unlocked period

        if (result1 != null && result1.length > 0)
          postingPeriodId = result1[0].getValue({
            name : 'internalid',
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
      log.audit("currencyCode: ", currencyCode);
      log.audit("is Multicurrency Feature In Effect? ", runtime.isFeatureInEffect('multicurrency'));
      if (runtime.isFeatureInEffect('multicurrency')) {   //NIB#409
        search.create(
            {
              type: search.Type.CURRENCY,
              filters: [['symbol', search.Operator.IS,
                currencyCode]],
              columns: ['internalid'],
            }).run().each(function (result) {
          netsuite_currency_id = result.id;
        });
      } else {
        var scriptRef = runtime.getCurrentScript();
        netsuite_currency_id = scriptRef.getParameter('custscript_coupa_erpay_default_currency');
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
* NIB#: 367
 *
 * @param obj JSON response
 * @param prop custom-field mapping
 * @param defval custom-field mapping
 * @return value
 * mapping example: charge-allocations.1.account.segment-4;
 */
 function getHeaderCustomFields(currentPayment){
	var scriptRef = runtime.getCurrentScript();
	var headerCustomFields = scriptRef.getParameter('custscript_coupa_erpay_header_cust_field');
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
                log.debug("Header customCoupa Field Key: " + linePairSplit[0], "value fetched :" + customFieldsMap["DATE: " + linePairSplit[1]]);
              } else {
                customFieldsMap[linePairSplit[1]] = processDataTypeMapping(currentPayment, coupaField, nsField, fieldType);
                log.debug("Header customCoupa Field Key: " + linePairSplit[0], "value fetched :" + customFieldsMap[linePairSplit[1]]);
              }
            }
		}
		log.debug("HeaderCustomFields Map returned :", JSON.stringify(customFieldsMap));
		return customFieldsMap;
	}
}

/**
 * This function gets the value of custom field from a nested JSON
 * NIB#: 367
 *
 * @param obj JSON response
 * @param prop custom-field mapping
 * @param defval custom-field mapping
 * @return value
 * mapping example: charge-allocations.1.account.segment-4;
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
 * Description: This function returns the default segment based on the subsidiary Id
 * NIB#: NIB-386
 * @param segment
 * @param subsidiary
 * @return {string}
 */
   function getSegmentDefaultValue(segment, subsidiary) {
    var parameterID = "", segmentID = "";
    switch (segment) {
      case "department":
        parameterID = "custscript_coupa_erpay_headdept";
        break;
      case "class":
        parameterID = "custscript_coupa_erpay_headclass";
        break;
      case "location":
        parameterID = "custscript_coupa_erpay_headlocn";
        break;
    }
    var scriptRef = runtime.getCurrentScript();
    var segmentMappings = scriptRef.getParameter(parameterID);
    if (segmentMappings && segmentMappings != '') {
      var mappingSplits = segmentMappings.split(';');
      for (var i = 0; mappingSplits && i < mappingSplits.length; i++) {
        var pair = mappingSplits[i];
        var pairSplit = pair.split('==');
        if (pairSplit[0] == subsidiary) {
          log.debug('Default ' + segment + ' for the subsidiary with ID: ' + subsidiary + ' found.', pairSplit[1]);
          segmentID = pairSplit[1];
        }
      }
    }
    if (!segmentID) {
      log.debug('No Default ' + segment + ' for the subsidiary with ID: ' + subsidiary + ' found.');
    }
    return segmentID;
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
      getInputData : getInputData,
      map : map,
      reduce : reduce,
      summarize : summarize
    };

  });
