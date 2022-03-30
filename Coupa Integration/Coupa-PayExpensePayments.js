/**
 * @NApiVersion 2.x
 * @NScriptType MapReduceScript
 * @NModuleScope SameAccount
 */
define(
  [ 'N/config', 'N/email', 'N/error', 'N/format', 'N/https', 'N/record', 'N/runtime', 'N/search',
    'N/transaction' ],
  function(config, email, error, format, https, record, runtime, search, transaction) {
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

      var host = scriptRef.getParameter('custscript_coupa_erpay_url');
      var api_key = scriptRef.getParameter('custscript_coupa_erpay_apikey');
      var postHeaders = {
        'Accept' : 'application/json',
        'X-COUPA-API-KEY' : api_key
      };
      var documents = [];

      var baseURL = host
        + '/api/coupa_pay/payments?exported=false&pay_to_account[type]=CoupaPay::EmployeePaymentAccount&status=';
      var customStatus = scriptRef.getParameter('custscript_coupa_erpay_status');
      if (customStatus == '' || customStatus == null) {
        customStatus = 'completed_successfully';
      }
      var getUrl = baseURL + customStatus;
      log.audit('Search', 'querying Coupa with ' + getUrl);

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
        for (var i = 0; i < payments.length; i++) {
          var currentPayment = payments[i];
          var paymentJson = {
            id : currentPayment.id,
            status : currentPayment.status,
            pay_from_account : getNetSuitePayFromAccount(currentPayment['pay-from-account']),
            currency : getCurrencyId(currentPayment['pay-to-currency']['code']),
            entityId : currentPayment['payee']['number'],
            paymentDetails : getPaymentDetails(currentPayment)
          };
          log.debug('Queuing Payment for processing', paymentJson);
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

      var getErrorsUrl = baseURL + 'completed_with_errors';
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
            paymentDetails : getPaymentDetails(currentPayment)
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
            // TODO: check for ER or VB
            var erToVB = scriptRef.getParameter('custscript_coupa_erpay_ervb');
            if (erToVB == true){
              
            } else {
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
            }
            expenseReport.save({
              ignoreMandatoryFields : true,
            });
            log.audit('Coupa Payment ' + payment.id, 'Successfully put Expense Report ' + expenseReportId
              + ' on Payment Hold');

          } else {
            log.audit('Coupa Payment ' + payment.id,
              'Payment is completed_with_errors, but doesn\'t exist in NetSuite. Marking exported');
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
          
          // Create new payment
          // TODO: Check for ER or VB
          var erToVB = scriptRef.getParameter('custscript_coupa_erpay_ervb');
          if (erToVB == true){
            
          } else {
            expenseReport.setValue({
              fieldId : 'accountingapproval',
              value : true
            });
            expenseReport.setValue({
              fieldId : 'complete',
              value : true
            });
          }

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

          // Account
          newVendorPayment.setValue({
            fieldId : 'account',
            value : payment.pay_from_account
          });

          // Currency
          newVendorPayment.setValue({
            fieldId : 'currency',
            value : payment.currency
          });

          // Posting Period
          newVendorPayment.setValue({
            fieldId : 'postingperiod',
            value : getPostingPeriod(detail.tranDate)
          });

          // TranDate
          newVendorPayment.setValue({
            fieldId : 'trandate',
            value : convertCoupaDateToNetSuiteDate(detail.tranDate)
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

          // Find line for this Expense Report
          var lineIndex = newVendorPayment.findSublistLineWithValue({
            sublistId : 'apply',
            fieldId : 'doc',
            value : expenseReportId
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
            // TODO: Check for ER or VB
            var erToVB = scriptRef.getParameter('custscript_coupa_erpay_ervb');
            if (erToVB == true){
              
            } else {
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
            }

            expenseReport.save({
              ignoreMandatoryFields : true
            });
          }
        }
      }
      context.write({
        key : payment.id,
        value : paymentSuccess
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
      var markExported = context.values[0];
      log.audit('Reduce Step', 'PaymentId: ' + paymentId + ' markExported? '
        + (markExported == true) + ' string: ' + (markExported == 'true'));

      if ((markExported == true) || (markExported == 'true')) {
        log.audit('Mark Exported', 'Preparing to mark payment ' + paymentId + ' as exported');
        var baseURL = scriptRef.getParameter('custscript_coupa_erpay_url');
        var api_key = scriptRef.getParameter('custscript_coupa_erpay_apikey');
        var postHeaders = {
          'Accept' : 'application/json',
          'X-COUPA-API-KEY' : api_key,
        };

        var putUrl = baseURL + '/api/coupa_pay/payments/' + paymentId + '?exported=true';
        log.audit('Mark Exported', 'Marking payment exported with ' + putUrl);

        try {
          var response = https.put({
            url : putUrl,
            headers : postHeaders,
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
          tranDate : detail['updated-at'],
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
          filters : [ [ 'externalidstring', search.Operator.CONTAINS, tranId ] ],
          columns : [ 'internalid' ],
        }).run().each(function(result) {
          reportId = result.id;
        });
      }
      return reportId;
    }

    function getNetSuitePayFromAccount(payFromAccount) {
      var scriptRef = runtime.getCurrentScript();
      var coupaAccountToNSAccount = scriptRef.getParameter('custscript_coupa_erpay_accmap');
      var payFromId = payFromAccount.id;
      var accSplits = coupaAccountToNSAccount.split(';');
      for (var i = 0; i < accSplits.length; i++) {
        var pair = accSplits[i];
        log.debug('Coupa Account ID ' + payFromId + ' matches ' + pair + '?');
        var pairSplit = pair.split('==');
        if (pairSplit[0] == payFromId) {
          log.debug('Coupa Account ID ' + payFromId + ' matches ' + pair + '! returning ' + pairSplit[1]);
          return getNetsuiteAccountId(pairSplit[1]);
        }
      }
      log.error('No Pay From Account found', 'No Account found for account ' + payFromAccount.id);
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
      // TODO: Add check for ER2VB or ER2ER
      var erToVB = scriptRef.getParameter('custscript_coupa_erpay_ervb');
      if (erToVB == true){
        search.create({
          type : search.Type.VENDOR_BILL,
          filters : [ [ 'externalid', search.Operator.IS, 'CoupaExpenseReport-VendorBill' + reportId ] ],
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
          type : record.Type.VENDOR_BILL,
        });
      } else {
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
      search.create(
          {
            type : search.Type.CURRENCY,
            filters : [ [ 'symbol', search.Operator.IS,
                currencyCode ] ],
            columns : [ 'internalid' ],
          }).run().each(function(result) {
        netsuite_currency_id = result.id;
      });
      return netsuite_currency_id;
    }

    return {
      getInputData : getInputData,
      map : map,
      reduce : reduce,
      summarize : summarize
    };

  });
