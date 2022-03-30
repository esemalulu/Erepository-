/**
 * @NApiVersion 2.x
 * @NScriptType MapReduceScript
 * @NModuleScope SameAccount
 */
define(
  [ 'N/config', 'N/email', 'N/error', 'N/format', 'N/https', 'N/record', 'N/runtime', 'N/search',
    'N/transaction' ],
  function(config, email, error, format, https, record, runtime, search, transaction) {


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
	  
      var postHeaders = {
        'Accept' : 'application/json',
        'X-COUPA-API-KEY' : api_key
      };
      var documents = [];

      if (status_filter == true) {
		    var baseURL = host
    			+ '/api/coupa_pay/payments?exported=false&fields=["id","status",{"pay_from_account":["id"]},{"pay_to_currency":["code"]},{"payee":["number"]},{"payment_details":["id","updated_at","source_transaction_id","source_transaction_reference","discount_total","payment_total"]}]&pay_to_account[type]=CoupaPay::SupplierPaymentAccount&status[in]=payment_initiated,payment_in_progress,completed_successfully,completed_with_errors';
		    if (cust_args == '' || cust_args == null) {
	  	  	var getUrl = baseURL;
	  	  } else {
		  	  var getUrl = baseURL + cust_args;		  	
		    }
	  	  log.audit('Search', 'querying Coupa with ' + getUrl);
  	  } else {
		    var baseURL = host
        	+ '/api/coupa_pay/payments?exported=false&fields=["id","status",{"pay_from_account":["id"]},{"pay_to_currency":["code"]},{"payee":["number"]},{"payment_details":["id","updated_at","source_transaction_id","source_transaction_reference","discount_total","payment_total"]}]&pay_to_account[type]=CoupaPay::SupplierPaymentAccount&status=';
		    scriptRef.getParameter('custscript_coupa_pymt_status');
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
            log.debug('Queuing Payment for processing', payment);
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
		      var getErrorsUrl = baseURL + 'completed_with_errors';
		    } else {
	        var getErrorsUrl = baseURL + 'completed_with_errors' + cust_args;	  	
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
      log.debug('Map complete, writing to context', 'key: ' + payment.id + ' value: ' + jsonPayment)

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
      log.debug('Start of Reduce', 'First line of the reduce step');
      var scriptRef = runtime.getCurrentScript();
      var errorTo = scriptRef.getParameter('custscript_coupa_pymt_errorto');
      var errorFrom = scriptRef.getParameter('custscript_coupa_pymt_errorfrm');
	  
      log.debug("Start remaining governance units: ", scriptRef.getRemainingUsage());

      log.debug("context key and value", 'key: ' + context.key + ' values: ' + context.values[0] );
      log.debug("context key and value", 'key: ' + context.key + ' first value: ' + context.values[0] );
      var payment = JSON.parse(context.values[0]);
      var paymentExists = payment.paymentExists || false;
      var paymentSuccess = payment.paymentSuccess || true;
      var billPayments = payment.paymentDetails['billPayments'];
      var creditsInPayment = payment.paymentDetails['creditsInPayment'];
      try {
        if (payment.status == 'completed_with_errors') {
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
              //loop for bill payments
          	   for ( var idx1 in billPayments) {
	              var detail = billPayments[idx1];
 	              var vendorBillId = getNetSuiteVendorBillId(detail.coupaInvoiceId);
        

          	  	log.audit('Coupa Payment ' + payment.id, 'Placing Vendor Bill ' + vendorBillId
            		+ ' back on Payment Hold');
  	              record.submitFields({
  	                type: record.Type.VENDOR_BILL,
  	                id: vendorBillId,
  	                values: {
  	                  paymenthold: true
  	                }
  	              });       
          		  log.audit('Coupa Payment ' + payment.id, 'Successfully put Vendor Bill ' + vendorBillId
            		  + ' on Payment Hold');
    	   		  }
				  
 			  		} else {
              log.audit('Coupa Payment ' + payment.id,
               'Payment is completed_with_errors, billpayment in void status in NetSuite. Marking exported');
              paymentSuccess = true;				  	
 			  	  } //void check block
        	} else {
        	  log.audit('Coupa Payment ' + payment.id,
          	'Payment is completed_with_errors, but doesn\'t exist in NetSuite. Marking exported');
        	  paymentSuccess = true;
      		}
        } else {
          var detail = billPayments[0];
          var vendorBillList = [];
          log.debug('In reduce step', 'paymentExists: ' + paymentExists)
          log.debug('In reduce step', 'paymentSuccess: ' + paymentSuccess)
          log.debug('In reduce step', 'payment: ' + payment)
                    
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
                log.error('lineIndex not found!', 'Cant find sublist with doc ' + vendorBillId);
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
                fieldId : 'amount', // Might need to set total, and due amounts?
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
        
              var creditConsumed = 0.0;
              // Check for Vendor Credits to consume
              if (creditsInPayment){
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
                    var vendorCredit = getNetSuiteVendorCredit(credit.coupaInvoiceId);
                    var vendorCreditId = vendorCredit.id;
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
            log.audit('creditConsumed', 'creditConsumed: ' + Math.abs(creditConsumed) + ', detail amount: ' + detail.amount);
            if ((newRecordId == 0 || newRecordId == '0') && (Math.abs(creditConsumed) == parseFloat(detail.amount))){
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
      log.debug('In summary step', 'summary.output: ' + summary.output)
      log.debug('In summary step', 'summary: ' + summary)
      log.debug('In summary step', 'summary value: ' + summary.value)

      summary.output.iterator().each(function (key, value){
        log.audit({
            title: ' summary.output.iterator', 
            details: 'key: ' + key + ' / value: ' + value
        });
       
        var paymentId = key;
        var markExported = value;
        log.audit('Summary Step', 'PaymentId: ' + paymentId + ' markExported? '
          + (markExported == true) + ' string: ' + (markExported == 'true'));

        if ((markExported == true) || (markExported == 'true')) {
          log.audit('Mark Exported', 'Preparing to mark payment ' + paymentId + ' as exported');
          var baseURL = scriptRef.getParameter('custscript_coupa_pymt_url');
          var api_key = scriptRef.getParameter('custscript_coupa_pymt_apikey');
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
          log.audit('Mark Exported', 'Not marking payment ' + paymentId
            + ' as exported due to error creating payment records');
        }
      });

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

    function getPaymentDetails(payment) {
      var scriptRef = runtime.getCurrentScript();
      var billPayments = [];
      var creditPayments = [];
      var creditsInPayment = false;
      log.debug('getting details for', payment);
      for ( var idx in payment["payment-details"]) {
        var detail = payment['payment-details'][idx];
        log.debug('payment detail', detail);

	     var detailJson = {
         	  amount : detail['payment-total'],
         	  discountTotal : detail['discount-total'],
         	  refNum : detail['source-transaction-reference'],
         	  coupaInvoiceId : detail['source-transaction-id'],
         	  tranDate : detail['updated-at'],
         	  tranId : 'Payment ' + payment.id,
        	};
		
        if(detail['payment-total'].indexOf('-') > -1) {
          creditsInPayment = true;
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
          filters : [ [ 'externalidstring', search.Operator.CONTAINS, tranId ] ],
          columns : [ 'internalid' ],
        }).run().each(function(result) {
          billId = result.id;
        });
      }
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

    function getNetSuitePayFromAccount(payFromAccount) {
      var scriptRef = runtime.getCurrentScript();
      var coupaAccountToNSAccount = scriptRef.getParameter('custscript_coupa_pymt_accmap');
      var payFromId = payFromAccount.id;
      var accSplits = coupaAccountToNSAccount.split(';');
      for (var i = 0; i < accSplits.length; i++) {
        var pair = accSplits[i];
        log.debug('Coupa Account ID ' + payFromId + ' matches ' + pair + '?');
        var pairSplit = pair.split('==');
        if (pairSplit[0] == payFromId) {
          log.debug('Coupa Account ID ' + payFromId + ' matches ' + pair + '! returning '
            + pairSplit[1]);
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

    function getNetSuiteVendorBill(invoiceId) {
      var billId = null;
      search.create({
        type : search.Type.VENDOR_BILL,
        filters : [ [ 'externalid', search.Operator.IS, 'Coupa-VendorBill' + invoiceId ] ],// , 'and', ['status',
        // search.Operator.IS, 'open']
        // ],
        // filters : [ [ 'externalidstring', search.Operator.CONTAINS, invoiceId ] ],
        columns : [ 'internalid' ],
      }).run().each(function(result) {
        billId = result.id;
      });
      if(billId == '' || billId == null){
        return '';
      }
      return record.load({
        id : billId,
        type : record.Type.VENDOR_BILL,
      });
    }

    function getNetSuiteVendorBillId(invoiceId) {
      var billId = null;
      search.create({
        type : search.Type.VENDOR_BILL,
        filters : [ [ 'externalid', search.Operator.IS, 'Coupa-VendorBill' + invoiceId ] ],// , 'and', ['status',
        // search.Operator.IS, 'open']
        // ],
        // filters : [ [ 'externalidstring', search.Operator.CONTAINS, invoiceId ] ],
        columns : [ 'internalid' ],
      }).run().each(function(result) {
        billId = result.id;
      });
      if(billId == '' || billId == null){
        return '';
      }
      return billId;
    }
    
    function getNetSuiteVendorCredit(creditId) {
      var billId = null;
      search.create({
        type : search.Type.VENDOR_CREDIT,
        filters : [ [ 'externalid', search.Operator.IS, 'Coupa-VendorCredit-' + creditId ] ],
        columns : [ 'internalid' ],
      }).run().each(function(result) {
        billId = result.id;
      });
      if(billId == '' || billId == null){
        return '';
      }
      return record.load({
        id : billId,
        type : record.Type.VENDOR_CREDIT,
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
      var netsuite_currency_id;
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