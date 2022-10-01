/**
 * @NApiVersion 2.1
 * @NScriptType MapReduceScript
 * @NModuleScope SameAccount
 */
define(
  [ 'N/config', 'N/email', 'N/error', 'N/format', 'N/https', 'N/record', 'N/runtime', 'N/search',
    'N/transaction','N/format', './Coupa - OpenIDConnect 2.0' ],
  function(config, email, error, format, https, record, runtime, search, transaction, format, oidc) {


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
      var scriptRef = runtime.getCurrentScript();
      var errorTo = scriptRef.getParameter('custscript_coupa_pymt_errorto');
      var errorFrom = scriptRef.getParameter('custscript_coupa_pymt_errorfrm');
	    var status_filter = scriptRef.getParameter('custscript_coupa_pymt_status_filter');
      if (status_filter == null || status_filter == ''){
        status_filter = false;
      }

      var host = scriptRef.getParameter('custscript_coupa_pymt_url');
      var api_key = scriptRef.getParameter('custscript_coupa_pymt_apikey');
	    var cust_args = scriptRef.getParameter('custscript_coupa_pmnt_cust_args');
	    var customStatus = scriptRef.getParameter('custscript_coupa_pymt_status');

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

      var thisEnv = runtime.envType;
      log.debug('environment',thisEnv);
      var url_test_contains = [ "-train", "-dev", "-dmo", "-demo", "-qa", "-sandbox", "-sbx", "-stage", "-staging", "-stg", "-support", "-test", "-uat", "coupadev.com", "coupacloud.com" ];
      if (thisEnv != 'PRODUCTION') {
          var test_url = false;
          for (var i = 0; i < url_test_contains.length; i++) {
              if (host.indexOf(url_test_contains[i]) > -1) {
                  test_url = true;
              }
          }
          log.debug('test_url is',test_url);
          if (!test_url) {
              var errMsg = 'Error - script is running in non prod environment and not using a '
                  + url_test_contains
                  + ' in the coupa URL. If you believe this to be incorrect, please contact Coupa Support';
              log.debug('BadEnv Debug',errMsg);
              var error_hash = {
                  author : errorFrom,
                  recipients : errorTo.split(","),
                  subject : 'Coupa/NetSuite Payment Integration Error',
                  body : errMsg
              };
              email.send(error_hash);
              throw errMsg;
          }
      }
 
      var documents = [];

      if (status_filter == true) {
		    var baseURL = host
    			+ '/api/coupa_pay/payments?exported=false&fields=["id","payment-batch-id","status","exchange_rate","updated_at","released_at",{"pay_from_account":["id","payment_option",{"currency":["code"]}]},{"pay_to_currency":["code"]},{"payee":["number"]},{"digital_check":["check_number"]},{"payment_details":["id","updated_at","source_transaction_id","source_transaction_reference","discount_total","payment_total",{"payable_allocations":["id","updated_at","payable_to_amount","source_transaction_to_reference","source_transaction_to_id"]},{"currency":["code"]}]}]&pay_to_account[type]=CoupaPay::SupplierPaymentAccount&status[in]=payment_initiated,payment_in_progress,completed_successfully,completed_with_errors,cancelled';
		    if (cust_args == '' || cust_args == null) {
	  	  	var getUrl = baseURL;
	  	  } else {
		  	  var getUrl = baseURL + cust_args;		  	
		    }
	  	  log.audit('Search', 'querying Coupa with ' + getUrl);
  	  } else {
		    var baseURL = host
        	+ '/api/coupa_pay/payments?exported=false&fields=["id","payment-batch-id","status","exchange_rate","updated_at","released_at",{"pay_from_account":["id","payment_option",{"currency":["code"]}]},{"pay_to_currency":["code"]},{"payee":["number"]},{"digital_check":["check_number"]},{"payment_details":["id","released_at","source_transaction_id","source_transaction_reference","discount_total","payment_total",{"payable_allocations":["id","updated_at","payable_to_amount","source_transaction_to_reference","source_transaction_to_id"]},{"currency":["code"]}]}]&pay_to_account[type]=CoupaPay::SupplierPaymentAccount&status[in]=';
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
        log.audit('Succesfully retrieved Payments',JSON.stringify(response));
        var payments = JSON.parse(response.body);
        log.audit('Succesfully retrieved Payments', 'Got ' + payments.length + ' payments');
        var useUpdatedAtDate = scriptRef.getParameter('custscript_coupa_pymt_use_updated_at') == true ? true : false;
        log.audit("Use Updated At Date as Payment Date?", useUpdatedAtDate);
        for (var i = 0; i < payments.length; i++) {
          var currentPayment = payments[i];
          var paymentJson = {
            id : currentPayment.id,
            payment_batch_id : currentPayment['payment-batch-id'], //adding batch number as part of Check# in NS
            exchangeRate : currentPayment['exchange-rate'],	//NIB-264-> Apply inverse of the exchange rate from the payload
            status : currentPayment.status,
            payment_date: useUpdatedAtDate ? currentPayment['updated-at'] : currentPayment['released-at'],
            pay_from_account : getNetSuitePayFromAccount(currentPayment['pay-from-account'],currentPayment),
            currency : getCurrencyId(currentPayment['pay-to-currency']['code']),
            entityId : currentPayment['payee']['number'],
            digital_check_number : getCheckNumber(currentPayment),
            //digital_check_number: currentPayment['digital-check']['check-number'],
            headerCustomFields : getHeaderCustomFields(currentPayment),
            requestHeader : postHeaders,
            paymentDetails : getPaymentDetails(currentPayment,currentPayment['payment-batch-id']),
            paymentMethod : currentPayment['pay-from-account'] ? currentPayment['pay-from-account']['payment-option'] : ''
          };

		      var payment = JSON.parse(JSON.stringify(paymentJson));
	        var billPayments = payment.paymentDetails['billPayments'];
	        var creditsInPayment = payment.paymentDetails['creditsInPayment'];
		  		  			
	        var detail = billPayments[0];

	        log.debug('GetInputData Step', 'Before existingPaymentId check')
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

            for ( var idx0 in billPayments) {
              var detail = billPayments[idx0];

    	        log.debug('GetInputData Step', 'Before getNetSuiteVendorBillId check')
    	        log.debug("End remaining governance units: ", scriptRef.getRemainingUsage());

              var vendorBillId = getNetSuiteVendorBillId(detail.coupaInvoiceId);

  	        	log.debug('GetInputData Step', 'After getNetSuiteVendorBillId check')
  	        	log.debug("End remaining governance units: ", scriptRef.getRemainingUsage());
	  
          		if (vendorBillId == '' || vendorBillId == null) {
            		log.error('Vendor Bill Not Found', 'Vendor bill not found for coupa ID '
              	  + detail.coupaInvoiceId);
                log.error('Vendor Bill Not Found', 'Not able to process payment ' + payment.id + ' as vendor bill is missing. Continuing to next payment');
            	  payment.paymentSuccess = false;
            	  break;
          		}
    
    	        log.debug('GetInputData Step', 'Before Payment Hold to false')
    	        log.debug("End remaining governance units: ", scriptRef.getRemainingUsage());

        	  	// Set Payment Hold to false
        	  	record.submitFields({
                type: record.Type.VENDOR_BILL,
                id: vendorBillId,
                values: {
                  paymenthold: false
                }
              });  

  	        	log.debug('GetInputData Step', 'After Payment Hold to false')
  	        	log.debug("End remaining governance units: ", scriptRef.getRemainingUsage());


              payment.paymentDetails['billPayments'][idx0].vendorBillId = vendorBillId
            }
			    }

          if (payment.paymentSuccess == false) {
            log.audit('Payment issue', 'Payment had an error while generating map step payload. Putting vendor bills back on payment hold')
            for ( var idx0 in billPayments) {
              var detail = billPayments[idx0];
              var vendorBillId = getNetSuiteVendorBillId(detail.coupaInvoiceId);
              if (vendorBillId == '' || vendorBillId == null) {
                log.audit('Vendor Bill Not Found', 'Vendor bill not found for coupa ID '
                  + detail.coupaInvoiceId + '. So, nothing to set as payment hold true');
                var errorMsg = "The vendor bill for Coupa Invoice ID " + detail.coupaInvoiceId + ' was not found. Please check if there is some issue with the Invoice integration. This is blocking CoupaPay Payment ' + payment.id + ' from creating Vendor Payments'
                var notification = {
                  author : errorFrom,
                  recipients : errorTo.split(","),
                  subject : 'Coupa/NetSuite Payment Integration Error',
                  body : errorMsg
                };
                email.send(notification);
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
            //log.debug('Queuing Payment for processing', payment);
            documents.push(payment); // each document will be processed by one map step
          }
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
      // status filter = false completed_with_errors
      if (status_filter == false){
  		  if (cust_args == '' || cust_args == null){
		      var getErrorsUrl = baseURL + 'completed_with_errors,cancelled';
		    } else {
	        var getErrorsUrl = baseURL + 'completed_with_errors,cancelled' + cust_args;	  	
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
              payment_batch_id : currentPayment['payment-batch-id'],
              digital_check_number : getCheckNumber(currentPayment),
              //digital_check_number: currentPayment['digital-check']['check-number'],
              paymentDetails : getPaymentDetails(currentPayment,currentPayment['payment-batch-id']),
              requestHeader : postHeaders,
              headerCustomFields : getHeaderCustomFields(currentPayment)
            };
            //log.debug('Queuing errored payment for processing', paymentJson);
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
  	  } // status filter = false complted_with_errors
	  

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
      var allocationsProcessed=[];
      var creditsProcessed = false;      
      log.debug('Start of Reduce', 'First line of the reduce step');
      var scriptRef = runtime.getCurrentScript();
      var errorTo = scriptRef.getParameter('custscript_coupa_pymt_errorto');
      var errorFrom = scriptRef.getParameter('custscript_coupa_pymt_errorfrm');
     
      log.debug("Start remaining governance units: ", scriptRef.getRemainingUsage());

      //log.debug("context key and value", 'key: ' + context.key + ' values: ' + context.values[0] );
      //log.debug("context key and value", 'key: ' + context.key + ' first value: ' + context.values[0] );
      var payment = JSON.parse(context.values[0]);
      var requestHeader = payment.requestHeader;
      var paymentExists = payment.paymentExists || false;
      var paymentSuccess = payment.paymentSuccess || true;
      var billPayments = payment.paymentDetails['billPayments'];
      var creditPayments = payment.paymentDetails['creditPayments'];
      var creditsInPayment = payment.paymentDetails['creditsInPayment'];
      log.audit({
        title:'billPayments',
        details:JSON.stringify(billPayments)
      });

      log.audit({
        title:'creditPayments',
        details:JSON.stringify(creditPayments)
      });      
      try {
        if (payment.status == 'completed_with_errors' || payment.status == 'cancelled') {	  // NIB-289: Added support for payments with cancelled status in case of digital check or Vcard	
            paymentSuccess = processCompletedWithErrorPayments(payment, billPayments);        // Function processes the Payments having status=='completed_with_errors' by voiding the transaction
        } else {
            for (var idx4 = 0; idx4 < creditPayments.length; idx4++) {

             var allocations =  creditPayments[idx4]['creditAllocation'];
             var coupaCreditId =  creditPayments[idx4]['coupaInvoiceId'];
             var allocationPresentFlag = creditPayments[idx4]['allocationsPresent']?creditPayments[idx4]['allocationsPresent']:false;

             log.audit({
               title:'allocations',
               details:JSON.stringify(allocations)
             });

             if( creditsInPayment && allocations){

              allocationsProcessed = allocationsProcessed.concat(processBillCredit(allocations, coupaCreditId));
              if(allocationsProcessed){
                 creditsProcessed = true;
               }
              log.debug({
                title:'allocationsProcessed',
                details: JSON.stringify(allocationsProcessed)
              });
            }
          }

          var detail = billPayments[0];
          var vendorBillList = [];
          log.debug('In reduce step', 'paymentExists: ' + paymentExists);
          log.debug('In reduce step', 'paymentSuccess: ' + paymentSuccess);
          log.debug('In reduce step', 'payment: ' + payment);
                    
          if (paymentExists == false) {
            // block for 1-1 payment processing
     
            for ( var idx0 in billPayments) {
              var detail = billPayments[idx0];
              var vendorBillId = detail.vendorBillId;
        
              if (vendorBillId == '' || vendorBillId == null) {
                log.error('Vendor Bill Not Found', 'Vendor bill not found for coupa ID '
                  + detail.coupaInvoiceId);
                paymentSuccess = false;
                break;
              }
              log.debug('bill id', vendorBillId);
              vendorBillList[idx0] = vendorBillId;
            }
        
            var newVendorPayment = record.transform({
              fromType : record.Type.VENDOR_BILL,
              fromId : vendorBillId,
              toType : record.Type.VENDOR_PAYMENT,
              isDynamic : true
            });

            var headerDepartmentRequired = scriptRef.getParameter('custscript_coupa_pymt_headdept');
            log.debug('Coupa Payment ' + payment.id, 'Department Header mapping is: ' + headerDepartmentRequired);
            var headerClassRequired = scriptRef.getParameter('custscript_coupa_pymt_headclas');
            log.debug('Coupa Payment ' + payment.id, 'Class Header mapping is: ' + headerClassRequired);
            var headerLocationRequired = scriptRef.getParameter('custscript_coupa_pymt_headlocn');
            log.debug('Coupa Payment ' + payment.id, 'Location Header mapping is: ' + headerLocationRequired);

            if((headerDepartmentRequired != null && headerDepartmentRequired != '') || 
              (headerClassRequired != null && headerClassRequired != '') ||
              (headerLocationRequired != null && headerLocationRequired != '') ) {
              var vendorBill = record.load({
                id : vendorBillId,
                type : record.Type.VENDOR_BILL,
              });
            }

            if(headerDepartmentRequired != null && headerDepartmentRequired != ''){
              log.debug('Coupa Payment ' + payment.id, 'Inside headerDepartmentRequired section');
              var departmentId = headerDepartmentRequired;
              if(headerDepartmentRequired == 'retrieveValue'){
                departmentId = vendorBill.getSublistValue({
                  sublistId: 'expense',
                  fieldId: 'department',
                  line: 0
                });
              }
              log.debug('Coupa Payment ' + payment.id, 'About to store ' + departmentId + ' as department');
              newVendorPayment.setValue({
                fieldId : 'department',
                value : departmentId
              });
            } 
            
            if(headerClassRequired != null && headerClassRequired != ''){
              log.debug('Coupa Payment ' + payment.id, 'Inside headerClassRequired section');
              var classId = headerClassRequired;
              if(headerClassRequired == 'retrieveValue'){
                classId = vendorBill.getSublistValue({
                  sublistId: 'expense',
                  fieldId: 'class',
                  line: 0
                });
              }
              log.debug('Coupa Payment ' + payment.id, 'About to store ' + classId + ' as class');
              newVendorPayment.setValue({
                fieldId : 'class',
                value : classId
              });
            } 

            if(headerLocationRequired != null && headerLocationRequired != ''){
              log.debug('Coupa Payment ' + payment.id, 'Inside headerLocationRequired section');
              var locationId = headerLocationRequired;
              if(headerLocationRequired == 'retrieveValue'){
                locationId = vendorBill.getSublistValue({
                  sublistId: 'expense',
                  fieldId: 'location',
                  line: 0
                });
              }
              log.debug('Coupa Payment ' + payment.id, 'About to store ' + locationId + ' as location');
              newVendorPayment.setValue({
                fieldId : 'location',
                value : locationId
              });
            }

            // Currency
            newVendorPayment.setValue({
              fieldId : 'currency',
              value : payment.currency
            });

            log.debug('payment currency', payment.currency);

        
            // Account
            newVendorPayment.setValue({
              fieldId : 'account',
              value : payment.pay_from_account
            });

            log.debug('payment account', payment.pay_from_account);
          
            newVendorPayment.setValue({
              fieldId : 'approvalstatus',
              value : 2
            });
            // log.debug('posting perioid ID is ', "SETTING CUSTOM FOR AND APPROVING ");

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
            if(payment.digital_check_number == null ||payment.digital_check_number == ""){
              log.debug('using detail tranId as NetSuite check#', detail.tranId);
              newVendorPayment.setValue({
                fieldId : 'tranid',
                value : detail.tranId 
              });
            }else{
              log.debug('using digital check number as NetSuite check#', payment.digital_check_number);
              newVendorPayment.setValue({
                fieldId : 'tranid',
                value : payment.digital_check_number
              });
            }
        
            // External ID
            newVendorPayment.setValue({
               fieldId : 'externalid',
               value : 'Processed-CoupaPay' + detail.tranId
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
            
            for ( var idx2 in billPayments) {
              var detail = billPayments[idx2];
              //1-1 payment block 
              var vendorBillId = vendorBillList[idx2];
            
              //Find line for this Vendor Bill
              var lineIndex = newVendorPayment.findSublistLineWithValue({
                sublistId : 'apply',
                fieldId : 'doc',
                value : vendorBillId
              });
          
              if (lineIndex == -1) {
                var isBalanced=allocationsProcessed.filter(function(o){
                  return o.vendorBillId==vendorBillId
                }).length>0;
                if(isBalanced){
                  log.audit('lineIndex not found!', 'Vendor Bill balanced by the Bill Credit ' + vendorBillId);
                  //code below added to handle the condition where there are mutiple VB in a payment and one of them gets zeroed by a CN
                  //continue is used to create a VB Payment for the rest of VBs 
                  var allocationProcessed = allocationsProcessed.filter(function(o){
                    return o.vendorBillId==vendorBillId
                  });
                  log.audit('allocationProcessed', JSON.stringify(allocationProcessed));
                  log.audit('Payment Id',payment.id);
                  addNote(allocationProcessed[0]["creditRecId"], payment.id, allocationProcessed[0]["allocation"]);
                  paymentSuccess = true;
                  continue;
                }else{
                  log.error('lineIndex not found!', 'Cant find sublist with doc ' + vendorBillId);
                  paymentSuccess = false;
                  break;
                }

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

              var dueAmount = newVendorPayment.getCurrentSublistValue({
                sublistId : 'apply',
                fieldId : 'due'
              });
              var allocatedAmount=getAllocatedAmount(allocationsProcessed, vendorBillId);
              log.debug({
                title: 'allocatedAmount: '+allocatedAmount+' >> ',
                details: 'for Vendor Bill with ref: '+vendorBillId
              });
                log.debug({
                title: 'dueAmount: '+dueAmount+' >> ',
                details: 'amount to be sent: '+(parseFloatOrZero(detail.amount)-parseFloatOrZero(allocatedAmount))
              });
              if(allocatedAmount && dueAmount>=(parseFloatOrZero(detail.amount)-parseFloatOrZero(allocatedAmount))){
                log.debug({
                  title: 'In allocatedAmount condition >> ',
                  details: 'parseFloatOrZero(detail.amount): '+parseFloatOrZero(detail.amount)+' - parseFloatOrZero(allocatedAmount): '+parseFloatOrZero(allocatedAmount)
               });
                // Amount
                newVendorPayment.setCurrentSublistValue({
                  sublistId : 'apply',
                  fieldId : 'amount', // Might need to set total, and due amounts?
                  value : (parseFloatOrZero(detail.amount)-parseFloatOrZero(allocatedAmount))
                });
              }else{
                // Amount
                newVendorPayment.setCurrentSublistValue({
                  sublistId : 'apply',
                  fieldId : 'amount', // Might need to set total, and due amounts?
                  value : detail.amount
                });
              }

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
        
              var creditConsumed = 0.0;
              // Check for Vendor Credits to consume
              if (!creditsProcessed && creditsInPayment){
                log.audit('Coupa Payment ' + payment.id,
                  'Found Credits to process');
                var creditPayments = payment.paymentDetails['creditPayments'];
                for ( var c in creditPayments) {
                  var credit = creditPayments[c];
                  log.audit('Coupa Payment ' + payment.id,
                    'Credit: ' + credit);
                  if (credit.creditApplied == false){
                    log.audit('Coupa Payment ' + payment.id,
                      'Credit applied is false');
                    var vendorCreditId = getNetSuiteVendorCredit(credit.coupaInvoiceId);
                    log.audit('Coupa Payment ' + payment.id,
                      'Found NS Credit id ' + vendorCreditId + '. Consumed ' + creditConsumed + ' out of ' + detail.amount);
                    if (detail.amount >= creditConsumed){
                      log.audit('Coupa Payment ' + payment.id,
                        'still amount left to consume');
                      var lineIndex = newVendorPayment.findSublistLineWithValue({
                        sublistId : 'apply',
                        fieldId : 'doc',
                        value : vendorCreditId
                      });
                      if (lineIndex == -1) {
                        log.error('lineIndex not found!', 'Cant find sublist with credit doc ' + vendorCreditId);
                        continue;
                      } else {
                        log.audit('Coupa Payment ' + payment.id,
                          'Found apply lineIndex ' + lineIndex);
                        newVendorPayment.selectLine({
                          sublistId : 'apply',
                          line : lineIndex
                        });
                        
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
                          value : credit.amount
                        });

                        // RefNum
                        newVendorPayment.setCurrentSublistValue({
                          sublistId : 'apply',
                          fieldId : 'refnum',
                          value : credit.refNum
                        });

                        // Discount
                        newVendorPayment.setCurrentSublistValue({
                          sublistId : 'apply',
                          fieldId : 'disc',
                          value : credit.discountTotal
                        });
                        
                        // Mark credit as consumed in the array
                        creditConsumed = creditConsumed + parseFloat(credit.amount);
                        payment.paymentDetails['creditPayments'][c].creditApplied = true;
                        
                        log.audit('Coupa Payment ' + payment.id,
                          'Committing credit line, creditConsumed now ' + creditConsumed);
                        
                        // Store Line
                        newVendorPayment.commitLine({
                          sublistId : 'apply'
                        });
                      }
                    }
                  }
                }
              }        
            } // block for looping billpayment else block
          }  //payment doesnt exist block
          
          // 1-1 payment processing - save record
          if (paymentExists == false) {    
    		  
            // Save record
            var forceSave = scriptRef.getParameter('customscript_coupa_chrg_forcesave');
            var coupaURL = scriptRef.getParameter('custscript_coupa_pymt_url');
            var paymentID = payment.id;
            //NIB-335- Payment URL field added on payment record
            log.audit('Setting Coupa Payment URL: ', coupaURL + "/coupa_pay/invoices/payments/" + paymentID);
            newVendorPayment.setValue({
              fieldId : 'custbody_coupa_payment_url',
              value : coupaURL + "/coupa_pay/invoices/payments/" + paymentID
            });
            log.audit('about to call save', 'calling save');
            var newRecordId;
            if(validatePaymentsSelected(newVendorPayment)){
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
            }else{
            	for(var alloc in allocationsProcessed){
            		log.audit('allocationsProcessed', JSON.stringify(allocationsProcessed));
            		log.audit('Payment Id',payment.id);
	            	addNote(allocationsProcessed[alloc]["creditRecId"], payment.id, allocationsProcessed[alloc]["allocation"]);
	            }
	            log.audit('Credit equals debit: Payment Transaction not created', 'No new payment record created, as the credit already applied to the VB.');
	        }

            log.audit('newrecordid', newRecordId);
            addPaymentMethodNote(newRecordId, payment.paymentMethod);
            log.audit('creditConsumed', 'creditConsumed: ' + Math.abs(creditConsumed) + ', detail amount: ' + detail.amount);
            if (((newRecordId == 0 || newRecordId == '0') && (Math.abs(creditConsumed) == parseFloat(detail.amount))) || !validatePaymentsSelected(newVendorPayment)){
              log.audit('Credit equals debit', 'No new payment record created, as the credit amount equals the invoice amount');
            } else if (newRecordId != null && newRecordId != '') {
              paymentSuccess = paymentSuccess && true;
            } else {
              log.audit('Failed to create new VendorPayment', 'Saving vendor payment returned: "' + newRecordId + '" putting vendor bill back on payment hold');
              paymentSuccess = false;
        
              for ( var idx3 in billPayments) {
                var detail = billPayments[idx3];
                var vendorBillId = detail.vendorBillId;

                record.submitFields({
                  type: record.Type.VENDOR_BILL,
                  id: vendorBillId,
                  values: {
                    paymenthold: true
                  }
                });       
              }
            } // else block on failed to create new vendorpayment
    		  }  // 1-1 payment processing - save record
        } // else block on payment.status == 'completed_with_errors'
	    } catch (e) {
        log.error('Error in Reduce Step',JSON.stringify(e));
        processCreditReversal(billPayments, allocationsProcessed);
       	for ( var idx0 in billPayments) {
        	var detail = billPayments[idx0];
         	var vendorBillId = detail.vendorBillId;

	  	    log.debug('about to reset paymenthold true on vendorbill',vendorBillId);

         	record.submitFields({
           	type: record.Type.VENDOR_BILL,
           	id: vendorBillId,
           	values: {
             	 paymenthold: true
           	}
         	});       
       	}
   		  var errorMsg = 'Error saving Vendor Payment with Coupa Payment Id: ' + payment.id;
   		  log.error('In Reduce Step', errorMsg);
   		  log.error('In Reduce Step', e.message);

        if (errorFrom !== null && errorFrom !== '' && errorTo !== null && errorTo !== ''){
   			  var notification = {
 	  	  	  author : errorFrom,
 	  	  	  recipients : errorTo.split(","),
 	  	  	  subject : 'Coupa/NetSuite Payment Integration Error',
   	 	  	  body : errorMsg
   			  };
   			  email.send(notification);
		    }

     		var err = error.create({
   	  	  name : 'NetSuite VendorPayment Create Failure',
   	  	  message : errorMsg,
   	  	  notifyOff : false
     		});
     		err.toString = function() {
       	  return err.message;
     		};
			  paymentSuccess = false;
	 	  } //end of catch block
          
      log.debug("End remaining governance units: ", scriptRef.getRemainingUsage());
      var paymentId = context.key;
      var markExported = paymentSuccess;
      markPaymentExported(paymentId, markExported, requestHeader);
      //log.audit("after payment is marked to exported"," The payment should be exported");

      context.write({
        key : payment.id,
        value : paymentSuccess
      });

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
      var errorTo = scriptRef.getParameter('custscript_coupa_pymt_errorto');
      var errorFrom = scriptRef.getParameter('custscript_coupa_pymt_errorfrm');

      log.audit('Usage/Governance consumed: ', summary.usage);
      log.audit('Number of queues: ', summary.concurrency);
      log.audit('Number of Yields: ', summary.yields);
      log.audit('Summary of Errors: ', summary.inputSummary.error);

      summary.mapSummary.errors.iterator().each(function(code, message) {
        log.error('Map Error: ' + code, message);
      });
      summary.reduceSummary.errors.iterator().each(function(code, message) {
        log.error('Reduce Error: ' + code, message);
      });
      var errorMsg = '';
      summary.mapSummary.errors.iterator().each(function(code, message) {
        log.error('Map Error: ' + code, message);
        errorMsg = errorMsg + message + "\n";
      });
    }
    
    function markPaymentExported(paymentId, markExported, requestHeader) {
      var scriptRef = runtime.getCurrentScript();
      log.audit("mark exported Value",markExported);
      if ((markExported == true) || (markExported == 'true')) {
        log.audit('Mark Exported', 'Preparing to mark payment ' + paymentId + ' as exported');
        var baseURL = scriptRef.getParameter('custscript_coupa_pymt_url');

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

    function getPaymentDetails(payment,batchid) {
      var scriptRef = runtime.getCurrentScript();
      var billPayments = [];
      var creditPayments = [];
      var creditsInPayment = false;

      var payFromAccountCurrency = payment["pay-from-account"]?payment["pay-from-account"]["currency"]["code"]:'';
      var payToAccountCurrency = payment["payment-details"][0]?payment["payment-details"][0]["currency"]["code"]:'';
      var isSameCurrencyPayment = payFromAccountCurrency==payToAccountCurrency?true:false;
      log.debug('getting details for', payment);
      for ( var idx in payment["payment-details"]) {
        var detail = payment['payment-details'][idx];
        log.debug('payment detail', detail);

	     var detailJson = {
         	  amount : detail['payment-total'],
         	  discountTotal : detail['discount-total'],
         	  refNum : detail['source-transaction-reference'],
         	  coupaInvoiceId : detail['source-transaction-id'],
         	  tranId : 'Payment ' + payment.id + ' Batch ' + batchid,
        	};
		
        if(detail['payment-total'].indexOf('-') > -1) {
          creditsInPayment = true;
          var allocations = getAllocations(detail);
          detailJson['creditAllocation']=allocations;
          detailJson['allocationsPresent']=allocations && allocations.length>0?true:false;
          detailJson['creditApplied'] = false;
          creditPayments.push(detailJson);
        } else {
          billPayments.push(detailJson);
        }
        log.debug('payment detail json', detailJson);
      }
      var result = {
        billPayments : billPayments,
        creditPayments : creditPayments,
        creditsInPayment : creditsInPayment,
        isSameCurrencyPayment : isSameCurrencyPayment
      };
    
      return result;
    }

    function getNetSuitePaymentId(tranId) {
      var billId = '';
      search.create({
        type : search.Type.VENDOR_PAYMENT,
        filters : [ [ 'tranId', search.Operator.IS, tranId ] ],
        columns : [ 'internalid' ],
      }).run().each(function(result) {
        billId = result.id;
      });
      if (billId == null || billId == ''){
        search.create({
          type : search.Type.VENDOR_PAYMENT,
          filters : [ [ 'externalidstring', search.Operator.IS, 'Processed-CoupaPay'+tranId  ] ],   //NIB-298 Operator changed from CONTAINS to IS & added prefix to tranId
          columns : [ 'internalid' ],
        }).run().each(function(result) {
          billId = result.id;
        });
      }
      log.audit({
        title: 'BillId returned from getNetSuitePaymentId is',
        details: billId
      });
      return billId;
    }

    function isNetSuitePaymentVoidStatus(tranId) {
        var filters = [];

        filters.push([ 'tranId', search.Operator.IS, tranId ], 'and');
        filters.push([ 'status', search.Operator.IS, 'VendPymt:V' ]);

        log.debug('filters is ', filters);
      var billId = '';
      search.create({
        type : search.Type.VENDOR_PAYMENT,
        filters : filters,
        columns : [ 'internalid' ],
      }).run().each(function(result) {
        billId = result.id;
      });
  	  if (billId == null || billId == ''){
  		  return false;
  	  } else {
            return true;
  	  }
    }

     function getCheckNumber(currentPayment) {
          var check_number = "";
          if (currentPayment['digital-check'] && currentPayment['digital-check']['check-number']) {
              check_number = currentPayment['digital-check']['check-number'];
              log.debug("getCheckNumber", "check_number", check_number);
          } else
              log.audit('No check number found');
          return check_number;
      }

    function getNetSuitePayFromAccount(payFromAccount,paymentDetails) {
      log.debug('payFromAccount is: ', payFromAccount);
      var subsidiaryCurrencyId = "";
      var scriptRef = runtime.getCurrentScript();
      var coupaAccountToNSAccount = scriptRef.getParameter('custscript_coupa_pymt_accmap');
      var payFromAccountCurrency = paymentDetails["pay-from-account"] ? paymentDetails["pay-from-account"]["currency"]["code"] : '';
      if (payFromAccountCurrency){
        payFromAccountCurrency = getCurrencyId(payFromAccountCurrency);
      }
      var payToAccountCurrency = paymentDetails["pay-to-currency"] ? paymentDetails["pay-to-currency"]["code"] : '';
      if (payToAccountCurrency){
        payToAccountCurrency = getCurrencyId(payToAccountCurrency);
      }
      var paymentDetails = getPaymentDetails(paymentDetails);
      var payment = JSON.parse(JSON.stringify(paymentDetails));
      var billPayments = payment['billPayments'];
      //check the subsidairy in each bill and match it with value provided in deploy params
      for ( var idx0 in billPayments) {
        var detail = billPayments[idx0];
        subsidiaryCurrencyId = getSubsidiaryCurrencyId(getSubsidiary(detail.coupaInvoiceId));
        log.debug('subsidiaryCurrency Id: ', subsidiaryCurrencyId);
        var subsidiaryId = getSubsidiary(detail.coupaInvoiceId);
        log.debug("getting subsidairy", 'Subsidiary value from VendorBill ' + detail.refNum + "is : " + subsidiaryId)
      }
      var payFromId = payFromAccount.id;
      var accSplits = coupaAccountToNSAccount.split(';');
      for (var i = 0; i < accSplits.length; i++) {
        var pair = accSplits[i];
        // log.debug('Coupa Account ID ' + payFromId + ' matches ' + pair + '?');
        var pairSplit = pair.split('==');
        var pairLen = pairSplit.length;
        log.debug("pairSplit length ", pairLen);
        if(pairLen == 4){     //NIB-312: Search account when the currency provided in Mapping matches with the currency of Vendor Bill
          var netsuiteAccid =  getNetsuiteAccountId(pairSplit[1]);
          var accountCurrency = getAccountCurrencyId(netsuiteAccid);
          log.debug('pairSplit[0]: ' + pairSplit[0] + ' == payFromId: ' + payFromId,  pairSplit[0] == payFromId);
          log.debug('pairSplit[2]: ' + pairSplit[2] + ' == subsidiaryId: ' + subsidiaryId,  pairSplit[2] == subsidiaryId);
          log.debug('accountCurrency: ' + accountCurrency + ' == subsidiaryCurrencyId: ' + subsidiaryCurrencyId, accountCurrency == subsidiaryCurrencyId);
          log.debug('payToAccountCurrency: ' + payToAccountCurrency + ' != payFromAccountCurrency: ' + payFromAccountCurrency, payToAccountCurrency != payFromAccountCurrency);
           if(pairSplit[0] == payFromId && pairSplit[2] == subsidiaryId && accountCurrency == subsidiaryCurrencyId && payToAccountCurrency != payFromAccountCurrency) {
            var accountId =  getNetsuiteAccountId(pairSplit[1]);
            log.audit('Coupa Account ID ' + payFromId + ' matches ' + pair + '! returning ' +accountId);
            return accountId;
          } else{
            log.debug('Skipping Mapping ' + pair , ' Reason: Default Payment Account not found.');
          }
        } else if(pairLen == 3){
          log.debug("found " + pairLen + " values ","CPA ID : " + pairSplit[0] + " NS GLACCs : " + pairSplit[1] + " Subsidiary ID :"  + pairSplit[2]);
          //use the COA name and COA ID to get account  
          //log.debug("Check subsidairy","netsuiteid account internal is  " +  netsuiteid  + " and suid " + subsidiaryId );
          if(pairSplit[0] == payFromId && pairSplit[2] == subsidiaryId ) {
            var netsuiteid =  getNetsuiteAccountId(pairSplit[1]);
              log.debug('Coupa Account ID ' + payFromId + ' matches ' + pair + '! returning '
            + pairSplit[1]);
            return netsuiteid
          }
          
        } else if (pairSplit[0] == payFromId){
          
            log.debug('Coupa Account ID ' + payFromId + ' matches ' + pair + '! returning '
              + pairSplit[1]);
            return getNetsuiteAccountId(pairSplit[1]);
        
        }else{
          log.audit('No Pay From Account found', 'No Account found for account ' + payFromAccount.id);
        }
       
      }
      
    }

    function getNetsuiteAccountId(accountNumber) {
      log.debug('accountNumber is: ', accountNumber);
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

/**
 * Description: Search for the subsidiary on the Vendor Bill and returns subsidiary if found. If the account has no subsidiaries returns "" and adds a Auidt log
 * NIB#: NIB-281 (Added oneWorld Account check)
 * @param invoiceId
 * @return {string} subsidiaryId
 */
    function getSubsidiary(invoiceId) {
        var subsidiaryId = "";
        var isOneWorld = runtime.isFeatureInEffect({    //returns true if oneworld feature i.e subsidiary enabled or returns false
            feature: 'SUBSIDIARIES'
        });
        if (isOneWorld) {
            try {
                var searchColumns = [search.createColumn({name: "subsidiary", label: "Subsidiary"})];
                var vendorbillSearchObj = search.create({
                    type: search.Type.VENDOR_BILL,
                    filters:
                        [
                            ["externalid", search.Operator.ANYOF, 'Coupa-VendorBill' + invoiceId],
                            "AND",
                            ["mainline", search.Operator.IS, true]
                        ],
                    columns: searchColumns
                });
                var searchResultCount = vendorbillSearchObj.runPaged().count;
                log.debug("getSubsidiary by VB's External Id result count", searchResultCount);
                vendorbillSearchObj.run().each(function (result) {
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
        return subsidiaryId;
    }

    function getNetSuiteVendorBillId(invoiceId,byDocNum) {
      var filter=new Array();
      if(byDocNum){
        filter.push([ 'tranid', search.Operator.IS, invoiceId ]); // used while processing credit alocations
      }else{
        filter.push(['externalid', search.Operator.IS, 'Coupa-VendorBill' + invoiceId]);
      }
        var billId = '';
        search.create({
            type: search.Type.VENDOR_BILL,
            filters: filter, // , 'and', ['status',
              // search.Operator.IS, 'open']
              // ],
              // filters : [ [ 'externalidstring', search.Operator.CONTAINS, invoiceId ] ],
            columns: ['internalid'],
        }).run().each(function (result) {
            billId = result.id;
        });
        return billId;
    }

    function getNetSuiteVendorCredit(creditId) {
        var creditRecId = "";
        search.create({
            type: search.Type.VENDOR_CREDIT,
            filters: [
                ["externalid", search.Operator.ANYOF, 'Coupa-VendorCredit-' + creditId],
                "AND", ["mainline", search.Operator.IS, true]
            ]
        }).run().each(function (result) {
            creditRecId = result.id;
        });
        return creditRecId;
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

      filters.push([ 'enddate', search.Operator.ONORAFTER, nsDate ], 'and');
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
      log.debug("Posting Periods are[enddate]:",periodSearch.run().getRange(0, 5));
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
        log.debug('filters1 is ', filters1);
        columns1.push(search.createColumn({
          name : 'enddate',
          sort : search.Sort.DESC
        }));
        //lines to print posting outoput
        var periodSearch1 = search.create({
          type : search.Type.ACCOUNTING_PERIOD,
          filters : filters1,
          columns : columns1,
        });
        var result1 = periodSearch1.run().getRange(0, 1);
        log.debug("Posting Periods are:",periodSearch1.run().getRange(0, 5)); // returns only the
        // first result of
        // the search which
        // is the first
        // available
        // unlocked period

        if (result1 != null && result1.length > 0)
          postingPeriodId = result1[0].id;
      }
      log.debug('postingPeriodId is ', postingPeriodId);
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
      var netsuite_currency_id = "";
      log.audit("is Multicurrency Feature In Effect? ", runtime.isFeatureInEffect('multicurrency'));
      if (runtime.isFeatureInEffect('multicurrency')) {   //NIB#409
        search.create(
            {
              type: search.Type.CURRENCY,
              filters: [['symbol', search.Operator.IS, currencyCode]],
              columns: ['internalid'],
            }).run().each(function (result) {
          netsuite_currency_id = result.id;
        });
      } else {
        var scriptRef = runtime.getCurrentScript();
        netsuite_currency_id = scriptRef.getParameter('custscript_coupa_pymt_default_currency');
      }
      log.audit("Currency returned from getCurrencyId: ", netsuite_currency_id);
      return netsuite_currency_id;
    }

/**
 * Description: search for the VendorBill from the payment payload
 * NIB#: NIB-250
 * @param payment Array
 * @return {array} responseArray
 */
      function getAllocations(payment) {
          var responseArray = new Array();
          var allocationArray = payment['payable-allocations'];
          if (allocationArray) {
              for (var index = 0; index < allocationArray.length; index++) {
                  var allocationObject = {};
                  allocationObject.amount = allocationArray[index]['payable-to-amount'];
                  allocationObject.InvoiceReference = allocationArray[index]['source-transaction-to-reference'];
                  allocationObject.coupaInvoiceId = allocationArray[index]['source-transaction-to-id'];
                  allocationObject.tranDate = allocationArray[index]['updated-at'];
                  responseArray.push(allocationObject)
              }
          }
          return responseArray;
      }

/**
 * Description: Moved the processCompletedWithErrorPayments from Reduce Stage to reduce the code length of the Reduce stage
 * NIB#: NIB-250
 * @param billPayments Array
 * @return {boolean} paymentSuccess
 */
      function processCompletedWithErrorPayments(payment, billPayments) {
          // process 1-1 payment block
          var paymentSuccess;
          var detail = billPayments[0];
          // Need to void the payment
          var existingPaymentId = getNetSuitePaymentId(detail.tranId);
          if (existingPaymentId != '' && existingPaymentId != null) {
              log.audit('Coupa Payment ' + payment.id,
                  'Payment is ' + payment.status +', so voiding ' + detail.tranId + ' in NetSuite');

              var vendorPaymentVoidStatus = isNetSuitePaymentVoidStatus(detail.tranId);

              log.debug('vendorPayment Is Void Status ', vendorPaymentVoidStatus);
              //void check block
              if (vendorPaymentVoidStatus == false) {
                  var voidedPaymentId = transaction.void({
                      type: transaction.Type.VENDOR_PAYMENT,
                      id: existingPaymentId,
                  });
                  if (voidedPaymentId == existingPaymentId) {
                      if(removeAppliedCredit(existingPaymentId, payment)){
                          log.audit('Coupa Payment ' + payment.id, 'Successfully removed the applied Credits');
                      }else{
                          log.audit('Coupa Payment ' + payment.id, 'Failed to remove the applied Credits');
                      }                    
                      log.audit('Coupa Payment ' + payment.id,
                          'Successfully voided payment with direct void');
                      paymentSuccess = true;
                  } else if (voidedPaymentId != '' && voidedPaymentId != null) {
                      if(removeAppliedCredit(existingPaymentId, payment)){
                        log.audit('Coupa Payment ' + payment.id, 'Successfully removed the applied Credits');
                      }else{
                        log.audit('Coupa Payment ' + payment.id, 'Failed to remove the applied Credits');
                      }                    
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
                      'Payment is ' + payment.status +', billpayment in void status in NetSuite. Marking exported');
                  paymentSuccess = true;
              } //void check block
            } else {
              log.audit('Coupa Payment ' + payment.id,'Payment is ' + payment.status +', but doesn\'t exist in NetSuite. Marking exported');
              //NIB-294-> Hold Payment checkbox on the Vendor Bill to be checked if payment with status: completed_with_errors not found in NS
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
                log.audit('Coupa Payment ' + payment.id, 'Successfully put Vendor Bill ' + vendorBillId + ' on Payment Hold');
              }

              paymentSuccess = true;
            }
           log.audit({
                  title: 'Returning paymentSuccess flag from processCompletedWithErrorPayments(): ',
                  details: paymentSuccess
                });
          return paymentSuccess;
      }

/**
 * Description: Loads the Vendor Credit Transaction and allocates the credit across the Vendor Bill and submits the transaction record & returns the Credits Processed array
 * NIB#: NIB-250
 * @param allocations Array from the Payload
 * @param billCreditId (String Record Id)
 * @return {number} creditsProcessed
 */
      function processBillCredit(allocations,billCreditId) {
        var creditsProcessed = [];
        try {
          if (billCreditId) {
            var creditRecId = getNetSuiteVendorCredit(billCreditId);
            log.debug({
              title: 'Trying to load Bill Credit with id: ',
              details: creditRecId
            });
            if (creditRecId) {
              var creditRecord = record.load({
                type: record.Type.VENDOR_CREDIT,
                id: creditRecId,
                isDynamic: true
              });

              for (var idx in allocations) {
                var vendorBillId = getNetSuiteVendorBillId(allocations[idx]['coupaInvoiceId']);
                log.debug({
                  title: 'Found vendor bill Id: '+vendorBillId+' >> ',
                  details: 'for Vendor Bill with ref: '+allocations[idx]['InvoiceReference']
                });
                var lineIndex = creditRecord.findSublistLineWithValue({
                  sublistId: 'apply',
                  fieldId: 'doc',
                  value: vendorBillId
                });
                log.debug({
                  title: 'lineIndex for vendor bill:  >> ',
                  details: lineIndex
                });
                if (lineIndex == -1) {
                  log.error('VB not found!', 'Cant find sublist with doc ' + vendorBillId);
                  continue;
                } else {
                  creditRecord.selectLine({
                    sublistId: 'apply',
                    line: lineIndex
                  });

                //Add to the allocation to creditsProcessed to subtract the allocation from VB amount while processing VB payment
                creditsProcessed.push({
                  creditRecId: creditRecId,
                  vendorBillId: vendorBillId,
                  allocation: parseFloatOrZero(allocations[idx]['amount'])
                });
              }

              // Apply
              creditRecord.setCurrentSublistValue({
                sublistId: 'apply',
                fieldId: 'apply',
                value: true
              });

              // Amount
              creditRecord.setCurrentSublistValue({
                sublistId: 'apply',
                fieldId: 'amount',
                value: allocations[idx]['amount']
              });

              // RefNum
              creditRecord.setCurrentSublistValue({
                sublistId: 'apply',
                fieldId: 'refnum',
                value: allocations[idx]['InvoiceReference']
              });

              creditRecord.commitLine({
                sublistId: 'apply'
              });
            }

            // sumbit record
            creditRecord.save();
          }
        }
      } catch (e) {
        log.error({
          title: 'Error in processBillCredit',
          details: JSON.stringify(e)
        });
      }
      return creditsProcessed;
    }

/**
 * Description: Get Credit Record Id for Credit Reversal in case the Bill Payment fails to rollback.
 * NIB#: NIB-250
 * @param allocationsProcessed Array
 * @param billPayments Array
 * @return {array} creditIdArray
 */
    function getCreditRecId(allocationsProcessed, billPayments) {
      var creditIdArray = [];
      for (var idx0 in billPayments) {
        var detail = billPayments[idx0];
        var vendorBillId = detail.vendorBillId;

        var obj = allocationsProcessed.filter(function (o) {
          return o.vendorBillId == vendorBillId;
        });
        if (obj && obj[0]) {
          creditIdArray.push(obj[0]['creditRecId']);
        }
      }
      return creditIdArray;
    }

/**
 * Description: Process the Credit Reversal in case the Bill Payment fails to rollback.
 * NIB#: NIB-250
 * @param allocationsProcessed Array
 * @param billPayments Array
 * @return void
 */
    function processCreditReversal(billPayments, allocationsProcessed) {
      var creditRecArray = getCreditRecId(allocationsProcessed, billPayments);
      try {
        if (creditRecArray) {
          for (var ind = 0; ind < creditRecArray.length; ind++) {
            log.audit({
             title: 'Trying to load Vendor Credit for reversal with Id:  >> ',
             details: creditRecArray[ind]
           }); 
            var creditRecord = record.load({
              type: record.Type.VENDOR_CREDIT,
              id: creditRecArray[ind],
              isDynamic: true
            });
            var vbArray = getVBId(allocationsProcessed, creditRecArray[ind]);
            for (var idx in vbArray) {
              var lineIndex = creditRecord.findSublistLineWithValue({
                sublistId: 'apply',
                fieldId: 'doc',
                value: vbArray[idx]['vendorBillId']
              });
              if (lineIndex == -1) {
                log.error('VB not found!', 'Cant find sublist with doc ' + vendorBillId);
                continue;
              } else {
                creditRecord.selectLine({
                  sublistId: 'apply',
                  line: lineIndex
                });
              }

              var allocatedAmount = getAllocatedAmount(allocationsProcessed,vbArray[idx]['vendorBillId']);
               log.debug({
                title: 'allocatedAmount: '+allocatedAmount+' >> ',
                details: 'for Vendor Bill with ref: '+vbArray[idx]['vendorBillId']
              });

              var paymentAmount = creditRecord.getCurrentSublistValue({
               sublistId: 'apply',
               fieldId: 'amount'
             });

              log.debug({
                title: 'Payment to be set: >> ',
                details: 'amount to be set: '+(parseFloatOrZero(paymentAmount)-parseFloatOrZero(allocatedAmount))
              });

              creditRecord.setCurrentSublistValue({
               sublistId: 'apply',
               fieldId: 'amount',
               value: parseFloatOrZero(paymentAmount) - parseFloatOrZero(allocatedAmount)
             });

              creditRecord.commitLine({
                sublistId: 'apply'
              });
            }

            // sumbit record
            creditRecord.save();
            log.audit({
             title: 'Credits record processed Successfully with ID:  >> ',
             details: creditRecArray[ind]
           }); 
          }
        }
      } catch (e) {
        log.error({
          title: 'Error in processCreditReversal',
          details: JSON.stringify(e)
        })
      }
    }

/**
 * Description: search for the VendorBill from the allocations Processed Array based on the creditRecId.
 * NIB#: NIB-250
 * @param allocationsProcessed Array
 * @param creditRecId String
 * @return {number} vendorBillIdArray
 */
    function getVBId(allocationsProcessed, creditRecId) {
      var vendorBillIdArray = [];

      vendorBillIdArray = allocationsProcessed.filter(function (o) {
        return o.creditRecId == creditRecId;
      });

      return vendorBillIdArray;
    }

/**
 * Description: search for allocated amount for the VendorBill from the allocations Processed Array.
 * NIB#: NIB-250
 * @param allocationsProcessed Array
 * @param vendorBillId String
 * @return {number} Amount
 */
    function getAllocatedAmount(allocationsProcessed, vendorBillId){
      var obj = allocationsProcessed.filter(function(o){
       return o.vendorBillId == vendorBillId;
     });
      return obj && obj[0]?obj[0]['allocation']:{};
    }

    function parseFloatOrZero(number){
    	number=parseFloat(number);
    	return isNaN(number)?0:number
    }

/**
 * Description: This function checks if the Vendor Payment contains any bill with apply checkbox checked
 * NIB#: NIB-250
 * @param newVendorPayment object
 * @return {boolean}
 */
 function validatePaymentsSelected(newVendorPayment){
 	return newVendorPayment.findSublistLineWithValue('apply','apply',true)>-1;
 }

/**
 * Description: This function adds the user note to the vendor bill credit transaction in case the VB amount==CN amount
 * NIB#: NIB-250
 * @param paymentId string  Coupa Payment Id
 * @param creditId string  Id of the Vendor Credit to which the Credit Note would be attached.
 * @return {void}
 */
 function addNote(creditId, paymentId, allocatedAmount) {
 	try {
 		removeNote(creditId, paymentId);
 		log.audit("Trying to create Note", 'Memo: Payment #' + paymentId);
 		var note = record.create({
 			type: record.Type.NOTE
 		});

 		note.setValue({
 			fieldId: 'transaction',
 			value: creditId
 		})

 		note.setValue({
 			fieldId: 'title',
 			value: 'Used in CoupaPay Payment'
 		})

 		note.setValue({
 			fieldId: 'note',
 			value: 'Payment #' + paymentId+'\nAllocated Amount:'+format.format({value:allocatedAmount, type: format.Type.CURRENCY})
 		})
 		var noteId = note.save();
 		log.audit("Created Note with Id: " + noteId, 'Memo: Payment #' + paymentId);
 	} catch (e) {
 		log.error({
 			title: 'Error in addNote()',
 			details: JSON.stringify(e)
 		});
 	}
 }

/**
 * Description: This function removes the user note to the vendor bill credit transaction in case the VB amount==CN amount
 * NIB#: NIB-250
 * @param paymentId string  Coupa Payment Id
 * @param creditId string  Id of the Vendor Credit to which the Credit Note would be attached.
 * @return {void}
 */
 function removeNote(creditId, paymentId) {
 	try {
 		var noteSearchObj = search.create({
 			type: "note",
 			filters: [
 			["transaction.internalid", "anyof", creditId],
 			"AND", ["title", "is", "Used in CoupaPay Payment"],
 			"AND", ["note", "contains", "Payment #" + paymentId],
 			"AND", ["transaction.mainline", "is", true]
 			],
 			columns: [
 			search.createColumn({
 				name: "title",
 				label: "Title"
 			}),
 			search.createColumn({
 				name: "note",
 				label: "Memo"
 			})
 			]
 		});

 		var searchResultCount = noteSearchObj.runPaged().count;
 		log.debug("noteSearchObj result count", searchResultCount);
 		if (searchResultCount == 0) {
 			log.audit("No Note found for deletion", 'creditId: ' + creditId + ' paymentId: ' + paymentId);
 		}
 		noteSearchObj.run().each(function (result) {
 			var title = result.getValue(search.createColumn({
 				name: "title",
 				label: "Title"
 			}));
 			var memo = result.getValue(search.createColumn({
 				name: "note",
 				label: "Memo"
 			}));
 			log.audit("Deleting Note with Id: " + result.id, 'title:' + title + ' memo:' + memo);
 			record.delete({
 				type: record.Type.NOTE,
 				id: result.id
 			})
 			return true;
 		});
 	} catch (e) {
 		log.error({
 			title: 'Error in removeNote()',
 			details: JSON.stringify(e)
 		});
 	}
 }


  /**
  * Description: Process the Credit Reversal in case status of the payment is completed_with_errors
  * NIB#: NIB-320
  * @param paymentId Integer
  * @return status boolean
  */
  function removeAppliedCredit(paymentId, paymentObj) {
    var status = false;
    try {

      log.debug({
        title: 'In removeAppliedCredit()',
        details: 'paymentId:' + paymentId
      });

      var payment = record.load({
        type: record.Type.VENDOR_PAYMENT,
        id: paymentId
      });

      var paymentLineCount = payment.getLineCount({
        sublistId: 'apply'
      });

      for (var ind = 0; ind < paymentLineCount; ind++) {
        var billId = payment.getSublistValue({
          sublistId: 'apply',
          fieldId: 'doc',
          line: ind
        });

        var docType = payment.getSublistValue({
          sublistId: 'apply',
          fieldId: 'type',
          line: ind
        });
        if(docType!="Journal"){
          var billCreditIds = searchBillCredit(billId);

          if (billCreditIds && billCreditIds.length>0) {
            for(var k=0;k<billCreditIds.length;k++){

              var creditRecord = record.load({
                type: record.Type.VENDOR_CREDIT,
                id: billCreditIds[k],
                isDynamic: true
              });

              var creditLineCount = creditRecord.getLineCount({
                sublistId: 'apply'
              });

              var lineIndex = creditRecord.findSublistLineWithValue({
                sublistId: 'apply',
                fieldId: 'doc',
                value: billId
              });

              if (lineIndex == -1) {
                log.error('VB not found!', 'Cant find sublist with doc ' + billId);
                continue;
              } else {
                creditRecord.selectLine({
                  sublistId: 'apply',
                  line: lineIndex
                });
                creditRecord.setCurrentSublistValue({
                  sublistId: 'apply',
                  fieldId: 'apply',
                  value: false
                });
                log.debug({
                  title: 'Removed VB :' + lineIndex,
                  details: 'at line:' + lineIndex
                });
                creditRecord.commitLine({
                  sublistId: 'apply'
                });
              }
          // sumbit record
          creditRecord.save();
          log.audit({
            title: 'Removed applied Credits in the Bill Credit:  ',
            details: 'vendorcredit:' + billCreditIds[k]
          });

        }
      }
    }
  }
  status = true;
} catch (e) {
  log.error({
    title: 'Error in removeAppliedCredit',
    details: JSON.stringify(e)
  })
}
        
processFullCreditAppliedVB(paymentObj);

return status;
}

/**
* Description: search Bill Credit by Vendor Bill
* NIB#: NIB-320
* @param billId
* @return {string}
*/
function searchBillCredit(billId) {
  var billCreditId = [];
  var vendorcreditSearchObj = search.create({
    type: "vendorcredit",
    filters: [
    ["type", "anyof", "VendCred"],
    "AND",
    ["appliedtotransaction", "anyof", billId],
    "AND",
    ["mainline", "is", "T"]
    ]
  });
  vendorcreditSearchObj.run().each(function (result) {
    billCreditId.push(result.id);
    return true;
  });
  log.audit({
    title: 'Returning Bill Credit Id for bill: ' + billId,
    details: billCreditId
  });
  return billCreditId;
}

/**
* Description: Process the VB fully paid by applying only Credit 
* NIB#: NIB-342
* @param paymentObj
* @return null
*/
function processFullCreditAppliedVB(paymentObj) {
	try{
		var billPayments = paymentObj.paymentDetails.billPayments;
		log.audit({
            title: 'billPayments processFullCreditAppliedVB:  ',
            details: JSON.stringify(billPayments)
          });  
		var creditPayments = paymentObj.paymentDetails.creditPayments;
		log.audit({
            title: 'creditPayments processFullCreditAppliedVB:  ',
            details: JSON.stringify(creditPayments)
          });  

		for (var k in creditPayments) {
			var creditAllocation = creditPayments[k].creditAllocation;
			log.audit({
				title: 'creditAllocation in processFullCreditAppliedVB(): ',
				details: JSON.stringify(creditAllocation)
			});

			for (var i in billPayments) {

				var filteredObj = creditAllocation.filter(function (key) {
					if (key.coupaInvoiceId == billPayments[i].coupaInvoiceId && parseFloat(key.amount) == parseFloat(billPayments[i].amount)) {
						return true;
					}
				});

				if (filteredObj && filteredObj[0]) {

					var coupaCNId = creditPayments[k].coupaInvoiceId;

					log.debug({
						title: 'coupaCNId in processFullCreditAppliedVB(): ',
						details: JSON.stringify(coupaCNId)
					});

					log.debug({
						title: 'filteredObj[0] in processFullCreditAppliedVB(): ',
						details: JSON.stringify(filteredObj[0])
					});

					var billId = getNetSuiteVendorBillId(billPayments[i].coupaInvoiceId);

					var creditId = getNetSuiteVendorCredit(coupaCNId);

					revertAppliedCredit(creditId, billId);
				}
			}
		}
	}catch(err){
		log.error({
			title: 'Error in processFullCreditAppliedVB',
			details: JSON.stringify(err)
		})
	}
}

/**
* Description: load credit note and unapply the Credit applied to the Vendor Bill
* NIB#: NIB-342
* @param creditId
* @param billId
* @return null
*/
function revertAppliedCredit(creditId, billId){
	try{

		var creditRecord = record.load({
			type: record.Type.VENDOR_CREDIT,
			id: creditId,
			isDynamic: true
		});

		var creditLineCount = creditRecord.getLineCount({
			sublistId: 'apply'
		});

		var lineIndex = creditRecord.findSublistLineWithValue({
			sublistId: 'apply',
			fieldId: 'doc',
			value: billId
		});

		if (lineIndex == -1) {
			log.error('VB not found!', 'Cant find sublist with doc ' + billId);
		} else {
			creditRecord.selectLine({
				sublistId: 'apply',
				line: lineIndex
			});

			creditRecord.setCurrentSublistValue({
				sublistId: 'apply',
				fieldId: 'apply',
				value: false
			});

			log.debug({
				title: 'Removed VB :' + lineIndex,
				details: 'at line:' + lineIndex
			});

			creditRecord.commitLine({
				sublistId: 'apply'
			});
		}
          // sumbit record
          creditRecord.save();

          log.audit({
          	title: 'Removed applied Credits in the Bill Credit:  ',
          	details: 'vendorcredit:' + creditId
          });
      }catch(e){
      	log.error({
      		title: 'Error in revertAppliedCredit',
      		details: JSON.stringify(e)
      	})
      }

  }

 /* Description: This function search for the currency of the Subsidiary passed as parameter
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
 * This function gets the msp of custom fieldd from a payment response
 * NIB#: 338
 *
 * @param obj JSON response
 * @param prop custom-field mapping
 * @param defval custom-field mapping
 * @return value
 * mapping example: charge-allocations.1.account.segment-4;
 */
function getHeaderCustomFields(currentPayment){
	var scriptRef = runtime.getCurrentScript();
	var headerCustomFields = scriptRef.getParameter('custscript_coupa_pymt_header_cust_fields');
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
 * NIB#: 338
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

    /**
     * Send Email notification
     * NIB# - NIB-457
     * @param errorMsg
     */
    function sendNotification(errorMsg) {
      var scriptRef = runtime.getCurrentScript();
      var errorTo = scriptRef.getParameter('custscript_coupa_pymt_errorto');
      var errorFrom = scriptRef.getParameter('custscript_coupa_pymt_errorfrm');
      log.debug("In sendNotification", "errorTo: " + errorTo + " errorFrom: " + errorFrom);
      var notification = {
        author: errorFrom,
        recipients: errorTo.split(","),
        subject: 'Coupa/NetSuite Payment Integration Error',
        body: errorMsg
      };
      email.send(notification);
    }

    /**
     * Description: This function adds the user note to the Payment transaction to store the payment method
     * NIB#: NIB-514
     * @param paymentID
     * @param paymentMethod
     * @return {void}
     */
    function addPaymentMethodNote(paymentID, paymentMethod) {
      try {
        switch (paymentMethod) {
          case 'direct_debit':
            paymentMethod = 'Bank';
            break;
          case 'bank':
            paymentMethod = 'Bank';
            break;
          case 'digital_check':
            paymentMethod = 'Digital Check';
            break;
          case 'virtual_card':
            paymentMethod = 'Virtual Card';
            break;
          case 'virtual_card_for_cxml_po':
            paymentMethod = 'Virtual Card for cXML PO';
            break;
          case 'virtual_card_for_boost_stp':
            paymentMethod = 'Virtual Card for Boost STP';
            break;
          case 'requester_card':
            paymentMethod = 'Requester Card';
            break;
          case 'digital_wallet':
            paymentMethod = 'Digital Wallet';
            break;
        }
        log.audit("Trying to create Note", 'Payment Method: ' + paymentMethod);
        var note = record.create({
          type: record.Type.NOTE
        });

        note.setValue({
          fieldId: 'transaction',
          value: paymentID
        });

        note.setValue({
          fieldId: 'title',
          value: 'Coupa Pay Payment Method'
        });

        note.setValue({
          fieldId: 'note',
          value: paymentMethod
        });
        var noteId = note.save();
        log.audit("Created Note with Id: " + noteId, '');
      } catch (e) {
        log.error({
          title: 'Error in addPaymentMethodNote()',
          details: JSON.stringify(e)
        });
      }
    }

    return {
      getInputData : getInputData,
      map : map,
      reduce : reduce,
      summarize : summarize
    };
  });