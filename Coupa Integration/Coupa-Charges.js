/**
 * @NApiVersion 2.x
 * @NScriptType MapReduceScript
 * @NModuleScope SameAccount
 */
define(['N/config', 'N/email', 'N/error', 'N/file', 'N/format', 'N/https', 'N/record',
    'N/runtime', 'N/search', 'N/xml'
  ],
  /**
   * @param {email}
   *          email
   * @param {error}
   *          error
   * @param {https}
   *          https
   * @param {record}
   *          record
   * @param {xml}
   *          xml
   */

  function (config, email, error, file, format, https, record, runtime, search, xml) {

    /**
     * Marks the beginning of the Map/Reduce process and generates input data. 1
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
    var errorTo = scriptRef.getParameter('custscript_coupa_chrg_errorto');
    var errorFrom = scriptRef.getParameter('custscript_coupa_chrg_errorfrm');

    var baseURL = scriptRef.getParameter('custscript_coupa_chrg_url');
    var api_key = scriptRef.getParameter('custscript_coupa_chrg_apikey');
    var cust_args =  scriptRef.getParameter('custscript_coupa_chrg_cust_args');

    var postHeaders = {
      'Accept' : 'application/json',
      'X-COUPA-API-KEY' : api_key
    };

   if(cust_args != null && cust_args != ''){
    var getUrl = baseURL + '/api/charges?exported=false'+ cust_args;
    log.audit('Search', 'querying Coupa with cust_args' + getUrl);
   }else {
    var getUrl = baseURL + '/api/charges?exported=false';
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

        var notification = {
          author: errorFrom,
          recipients: errorTo.split(","),
          subject: 'Coupa/NetSuite Charge Integration Error',
          body: errorMsg
        };
        email.send(notification);

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
        log.audit('Succesfully retrieved Charges', response);
        var charges = JSON.parse(response.body);
        var documents = [];

        for (var i = 0; i < charges.length; i++) {
          var currentCharge = charges[i];

          // Skip invoice virtual card charges AND UNBACKED CHARGES
          var documentType = getVirtualCardDocumentType(currentCharge['virtual-card-id']);
          log.audit('Document Type', 'Returned document type is ' + documentType);
          if (documentType != 'OrderHeader') {
            log.audit('Not a PO Charge', 'Marking charge ' + currentCharge.id + ' as exported as it is not a PO based charge');
            var putUrl = baseURL + '/api/charges/' + currentCharge.id + '?exported=true';
            var postBody = '';
            log.debug('PUT URL', 'PUT URL ' + putUrl);
            try {
              var response = https.put({
                url: putUrl,
                headers: postHeaders,
                body: postBody
              });
              log.debug('Marking Exported: ' + currentCharge.id, 'Reponse Code: ' + response.code);
            } catch (e) {
              log.error('reduce', 'Error making API call to Coupa, with Query: ' + putUrl);
            }
            continue;
          }

          var chargeJson = {
            paymentPartner: getPaymentPartner(currentCharge),
            glAccountId: getAccount(currentCharge),
            charge: {
              id: currentCharge.id,
              externalRefNum: currentCharge['external-ref-id'], // JSON doesn't accept obj.foo-bar,
              // treats it as subtraction foo
              // minus bar
             // orderHeaderId: currentCharge['order-header-id'],
              //orderHeaderNumber: currentCharge['order-header-number'],
              virtualCardId: currentCharge['virtual-card-id'],
              supplierName: currentCharge['supplier-name'],
              total: currentCharge.total,
              merchantReference: currentCharge['merchant-reference'],
              mcc: currentCharge.mcc,
              currency: currentCharge.currency.code,
              chargeDate: currentCharge['charge-date'],
              taxTotal: currentCharge['tax-total'],
              taxCurrency: currentCharge['tax-currency'],
              chargeHeader: getHeaderMap(currentCharge),
              chargeAllocations: getChargeAllocations(currentCharge)
            }
          };
          log.debug('Queuing Charge for processing', chargeJson);
          documents.push(chargeJson); // each document will be processed by one map step
        }
        return documents;
      } else if (response.code == 404) {
        log.audit('No charges pending export', 'URL: ' + getUrl);
        return [];
      } else {
        // bad response
        var errorMsg = 'Error making API call to Coupa, with Query: ' + getUrl +
          ' Response Code is: ' + response.code + ' Response Body is: ' + response.body;
        log.error('getInputData', errorMsg);

        var notification = {
          author: errorFrom,
          recipients: errorTo.split(","),
          subject: 'Coupa/NetSuite Charge Integration Error',
          body: errorMsg
        };
        email.send(notification);

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

    /**
     * Executes when the map entry point is triggered and applies to each key/value pair.
     * 
     * @param {MapSummary}
     *          context - Data collection containing the key/value pairs to process through the map
     *          stage
     * @since 2015.1
     */
    function map(context) {
      var charge = JSON.parse(context.value);
      var scriptRef = runtime.getCurrentScript();

      var useExternalId = scriptRef.getParameter('custscript_coupa_chrg_extid');

      var chargeType = charge.charge.total < 0 ? record.Type.CREDIT_CARD_REFUND :
      record.Type.CREDIT_CARD_CHARGE;
    try{
         // Transaction Type
         var cardChargeRecord = record.create({
           type: chargeType,
           isDynamic: true,
           defaultValues: {
             entity: charge.paymentPartner
           }
         });

         log.debug("Checking for custom form");
         var customFormId = scriptRef.getParameter(
           "custscript_coupa_chrg_custfrm"
         );
         if (customFormId != null && customFormId != "") {
           cardChargeRecord.setValue({
             fieldId: "customform",
             value: customFormId
           });
         }
         //
         var glAcc = charge.glAccountId;
         log.debug("Setting GL Account to internal id: " + glAcc);

         // Currency
         var charge = charge.charge;
         var currencyId = getCurrencyId(charge.currency);
         log.debug("Setting Currency to internal id: " + currencyId);
         cardChargeRecord.setValue({
           fieldId: "currency",
           value: currencyId
         });


         // External ID
         var externalId = "CoupaCharge-" + charge.id;
         log.debug("Setting External ID to charge id: " + externalId);
         cardChargeRecord.setValue({
           fieldId: "externalid",
           value: externalId
         });

         // Memo
         var memo = charge.supplierName;
         log.debug("Setting Memo to: " + memo);
         cardChargeRecord.setValue({
           fieldId: "memo",
           value: memo
         });

         // Transaction Date
         var transactionDate = convertCoupaDateToNetSuiteDate(
           charge.chargeDate
         );
         log.debug("Setting Transaction Date to: " + transactionDate);
         cardChargeRecord.setValue({
           fieldId: "trandate",
           value: transactionDate
         });


         // MCC Code
         var mccCode = charge.mcc;
         log.debug("Setting MCC Code to internal id: " + mccCode);
         cardChargeRecord.setValue({
           fieldId: "custbody_coupa_mcc_code",
           value: mccCode
         });

         // Tax Total
         log.debug("Setting custom field Tax Total to: " + charge.taxTotal);
         cardChargeRecord.setValue({
           fieldId: "custbody_coupa_tax_total",
           value: charge.taxTotal
         });

         // Expense Lines (Charge Allocations)
         var allocations = charge.chargeAllocations;

         for (var i = 0; i < allocations.length; i++) {
           var currentAllocation = allocations[i];
           cardChargeRecord.selectNewLine({
             sublistId: "expense"
           });

           // Line Subsidiary
           var subsidiarySegment = scriptRef.getParameter(
             "custscript_coupa_chrg_subsseg"
           );
           var subsidiaryId = currentAllocation.account[subsidiarySegment];
           if (useExternalId == true) {
             subisidaryId = getInternalIDByExternalId(
               "subisidiary",
               subisidiaryId
             );
           }
           if (subsidiaryId == null || subsidiaryId == "") {
             log.debug("Subsidiary Id not found, checking using CoA name");
             subsidiaryId = getSubsidiaryIdFromName(
               currentAllocation.accountType
             );
           }
           log.debug("Setting Subsidiary to internal id: " + subsidiaryId);
           cardChargeRecord.setValue({
             fieldId: "subsidiary",
             value: subsidiaryId
           });

           // Line Account
           var accountSegment = scriptRef.getParameter(
             "custscript_coupa_chrg_acct"
           );
           var accountId = getAccountId(
             currentAllocation.account[accountSegment]
           );
           log.debug(
             "Setting allocation line " + i + " account to: " + accountId
           );
           cardChargeRecord.setCurrentSublistValue({
             sublistId: "expense",
             fieldId: "account",
             value: accountId
           });

           // Line Amount
           var amount = currentAllocation.amount;
           if (amount < 0) {
             amount = -amount;
           }
           log.debug("Setting allocation line " + i + " amount to: " + amount);
           cardChargeRecord.setCurrentSublistValue({
             sublistId: "expense",
             fieldId: "amount",
             value: amount
           });

           // Line Memo
           log.debug(
             "Setting allocation line " +
               i +
               " line memo to: " +
               charge.merchantReference
           );
           cardChargeRecord.setCurrentSublistValue({
             sublistId: "expense",
             fieldId: "memo",
             value: charge.merchantReference
           });

           // Line Department
           var deptSegment = scriptRef.getParameter(
             "custscript_coupa_chrg_dept"
           );
           var departmentId = currentAllocation.account[deptSegment];
           if (useExternalId == true) {
             departmentId = getInternalIDByExternalId(
               "department",
               departmentId
             );
           }
           log.debug(
             "Setting allocation line " + i + " department to: " + departmentId
           );
           cardChargeRecord.setCurrentSublistValue({
             sublistId: "expense",
             fieldId: "department",
             value: departmentId
           });

           // Line Class
           var classSegment = scriptRef.getParameter(
             "custscript_coupa_chrg_class"
           );
           var classificationId = currentAllocation.account[classSegment];
           if (useExternalId == true) {
             classificationId = getInternalIDByExternalId(
               "class",
               classificationId
             );
           }
           log.debug(
             "Setting allocation line " + i + " class to: " + classificationId
           );
           cardChargeRecord.setCurrentSublistValue({
             sublistId: "expense",
             fieldId: "classification",
             value: classificationId
           });

           // Line Location
           var locnSegment = scriptRef.getParameter(
             "custscript_coupa_chrg_locn"
           );
           var locationId = currentAllocation.account[locnSegment];
           if (useExternalId == true) {
             locationId = getInternalIDByExternalId("location", locationId);
           }
           log.debug(
             "Setting allocation line " + i + " location to: " + locationId
           );
           cardChargeRecord.setCurrentSublistValue({
             sublistId: "expense",
             fieldId: "location",
             value: locationId
           });

           // Posting Period
           var postingPeriodId = getPostingPeriod(charge.chargeDate);
           log.debug(
             "Setting Posting Period to internal id: " + postingPeriodId
           );
           cardChargeRecord.setValue({
             fieldId: "accountingperiod",
             value: postingPeriodId
           });

           // Line Custom Fields
           var lineCustomFields = scriptRef.getParameter(
             "custscript_coupa_chrg_linecf"
           );
           log.debug("Processing Line custom fields");
           if (lineCustomFields != "" && lineCustomFields != null) {
             for (var mappingPair in lineCustomFields.split(";")) {
               var coupaField = mappingPair.split("==")[0];
               var nsField = mappingPair.split("==")[1];
               log.debug("mapping " + coupaField + " to " + nsField);
               var value = currentAllocation[coupaField];

               if (value == "" || value == null) {
                 log.debug(
                   "value for " +
                     coupaField +
                     " not found on chargeAllocation, checking charge level"
                 );
                 value = charge[coupaField];
               }
               if (value != "" && value != null) {
                 log.debug("saving " + value + " to " + nsField);
                 cardChargeRecord.setCurrentSublistValue({
                   sublistId: "expense",
                   fieldId: nsField,
                   value: value
                 });
               } else {
                 log.debug("No value found, going to next mapping");
               }
             }
           } else {
             log.debug("No custom fields found");
           }

           // Save the line
           cardChargeRecord.commitLine({
             sublistId: "expense"
           });
         }

         var headerCustomFields = scriptRef.getParameter(
           "custscript_coupa_chrg_headcf"
         );

         if (headerCustomFields != "" && headerCustomFields != null) {
           var headerSplit = headerCustomFields.split(";");
           for (var i = 0; i < headerSplit.length; i++) {
             var headerPair = headerSplit[i];
             log.debug("the headerPair is:", headerPair);
             var headerPairSplit = headerPair.split("==");
             log.debug("headerPairSplit", headerPairSplit);
             var coupaField = headerPairSplit[0];
             var nsField = headerPairSplit[1];
             log.debug("coupaField is :", coupaField);
             log.debug("ns field is ", nsField);
             // var value = charge[coupaField];
             // log.debug("the charge is", charge);
             var chargeHeader = charge["chargeHeader"];
             var value = chargeHeader[coupaField];
             log.debug("the value is", value);
             if (value != "" && value != null) {
               log.debug("saving " + value + " to " + nsField);
               cardChargeRecord.setValue({
                 fieldId: nsField,
                 value: value
               });
             } else {
               log.debug("No value found, going to next mapping");
             }
           }
         } else {
           log.debug("No custom fields found");
         }

        //Set Gl code
        log.debug("Setting GL Account to internal id: " + glAcc);
        //  var glAccountid = getAccountId(glAcc)
       cardChargeRecord.setValue({
          fieldId: "account",
          value: glAcc
        });

    
         // Transaction ID
         var transactionId = charge.externalRefNum;
         log.debug("Setting Transaction ID to: " + transactionId);
         cardChargeRecord.setValue({
           fieldId: "tranid",
           value: transactionId
         });
          
       
         // Save record
         var forceSave = scriptRef.getParameter(
           "customscript_coupa_chrg_forcesave"
         );
         var newRecordId;
         if (forceSave == true) {
           newRecordId = cardChargeRecord.save({
             enableSourcing: true,
             ignoreMandatoryFields: true
           });
         } else {
           newRecordId = cardChargeRecord.save({
             enableSourcing: true,
             ignoreMandatoryFields: false
           });
         }

         context.write({
           key: newRecordId,
           value: charge.id
         });
       }
    catch(e){
      log.error("error creating charge",charge.id);
      log.debug("error",e);

    }
    }

    /**
     * Executes when the reduce entry point is triggered and applies to each group.
     * 
     * @param {ReduceSummary}
     *          context - Data collection containing the groups to process through the reduce stage
     * @since 2015.1
     */
    function reduce(context) {
      var newRecordId = context.key;
      var coupaChargeId = context.values[0];
      if (newRecordId == null || newRecordId == '') {
        log.error('Failed to create new charge record for charge ' + coupaChargeId);
      } else {
        // Mark Exported
        var scriptRef = runtime.getCurrentScript();

        var baseURL = scriptRef.getParameter('custscript_coupa_chrg_url');
        var api_key = scriptRef.getParameter('custscript_coupa_chrg_apikey');
        var postHeaders = {
          'Accept': 'application/json',
          'X-COUPA-API-KEY': api_key
        };

        var getUrl = baseURL + '/api/charges/' + coupaChargeId + '?exported=true';
        var postBody = '';
        log.debug('PUT URL', 'PUT URL ' + getUrl);
        try {
          var response = https.put({
            url: getUrl,
            headers: postHeaders,
            body: postBody
          });
          log.debug('Marking Exported: ' + coupaChargeId, 'Reponse Code: ' + response.code);
        } catch (e) {
          log.error('reduce', 'Error making API call to Coupa, with Query: ' + getUrl);
        }
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
      var scriptRef = runtime.getCurrentScript();
      var errorTo = scriptRef.getParameter('custscript_coupa_chrg_errorto');
      var errorFrom = scriptRef.getParameter('custscript_coupa_chrg_errorfrm');
      log.audit('Usage/Governance consumed: ', summary.usage);
      log.audit('Number of queues: ', summary.concurrency);
      log.audit('Number of Yields: ', summary.yields);
      log.audit('Summary of Errors: ', summary.inputSummary.error);
      summary.mapSummary.errors.iterator().each(function (code, message) {
        log.error('Map Error: ' + code, message);
      });
      var errorMsg = '';
      summary.mapSummary.errors.iterator().each(function (code, message) {
        log.error('Map Error: ' + code, message);
        errorMsg = errorMsg + message + "\n";
      });
    }

   //improvment function
         function getHeaderMap(charge){
          var scriptRef = runtime.getCurrentScript();
          var headerCustomFields = scriptRef.getParameter('custscript_coupa_chrg_headcf');
          if(headerCustomFields){
            var headerSplit = headerCustomFields.split(';');
            var customCoupa = {};
              for (var i = 0; i < headerSplit.length; i++) {
                var headerPair = headerSplit[i];
                var headerPairSplit = headerPair.split('==');
                customCoupa[headerPairSplit[0]] = charge[headerPairSplit[0]];
                // customCoupa = charge["'"+ headerPairSplit[0]+"'"];
                log.debug("the customCoupa value is :",customCoupa[headerPairSplit[0]]);
               
              }
              log.debug("the customCoupa value is :",customCoupa);
              return customCoupa;
          } 
         
        } 
    

    function convertCoupaDateToNetSuiteDate(coupaDate) {
      var nDate = coupaDate.split('T');
      var datesplit = nDate[0].split('-');
      var Nyear = datesplit[0];
      var Nday = datesplit[2];
      var Nmonth = datesplit[1];
      return new Date(Nyear, Nmonth - 1, Nday);
    }

    function getAccountId(accountNumber) {
      var netsuite_account_id = null;
      search.create({
        type: search.Type.ACCOUNT,
        filters: [
          ['number', search.Operator.IS, accountNumber]
        ],
        columns: ['internalid']
      }).run().each(function (result) {
        netsuite_account_id = result.id;
        log.debug("result id is?",  result.id);
        log.debug("netsuite accout is?", netsuite_account_id);
      });
      return netsuite_account_id;
     
    }

    function getChargeAllocations(charge) {
      var allocations = charge['charge-allocations'];
      var allocationArray = [];
      for (var i = 0; i < allocations.length; i++) {
        var allocation = allocations[i];
        var allocationJson = {
          amount: allocation.amount,
          pct: allocation.pct,
          accountType: allocation.account['account-type'].name,
          account: {
            "segment-1": allocation.account['segment-1'],
            "segment-2": allocation.account['segment-2'],
            "segment-3": allocation.account['segment-3'],
            "segment-4": allocation.account['segment-4'],
            "segment-5": allocation.account['segment-5'],
            "segment-6": allocation.account['segment-6'],
            "segment-7": allocation.account['segment-7'],
            "segment-8": allocation.account['segment-8'],
            "segment-9": allocation.account['segment-9'],
            "segment-10": allocation.account['segment-10'],
            "segment-11": allocation.account['segment-11'],
            "segment-12": allocation.account['segment-12'],
            "segment-13": allocation.account['segment-13'],
            "segment-14": allocation.account['segment-14'],
            "segment-15": allocation.account['segment-15'],
            "segment-16": allocation.account['segment-16'],
            "segment-17": allocation.account['segment-17'],
            "segment-18": allocation.account['segment-18'],
            "segment-19": allocation.account['segment-19'],
            "segment-20": allocation.account['segment-20'],
          }
        };
        allocationArray.push(allocationJson);
      }
      return allocationArray;
    }

    function getCurrencyId(currencyCode) {
      // var currencyCode = charge.currency.code;
      log.debug('currencyCode ', 'currencyCode: ' + currencyCode);
      var netsuite_currency_id;
      var allSearch = search.create({
        type: search.Type.CURRENCY,
        filters: [
          ['symbol', search.Operator.IS, currencyCode]
        ],
        columns: ['internalid']
      }).run().each(function (result) {
        netsuite_currency_id = result.id;
      });
      return netsuite_currency_id;
    }

    function getPaymentPartner(charge) {
      var scriptRef = runtime.getCurrentScript();
      var coaToPaymentPartner = scriptRef.getParameter('custscript_coupa_chrg_coatopp');
      var coaId = charge['charge-allocations'][0]['account']['account-type'].id;
      var coaSplits = coaToPaymentPartner.split(';');
      for (var i = 0; i < coaSplits.length; i++) {
        var pair = coaSplits[i];
        log.debug('CoA ' + coaId + ' matches ' + pair + '?');
        var pairSplit = pair.split('==');
        if (pairSplit[0] == coaId) {
          log.debug('CoA ' + coaId + ' matches ' + pair + '! returning ' + pairSplit[1]);
          return pairSplit[1];
        }
      }
    }

    function getAccount(charge) {
      var scriptRef = runtime.getCurrentScript();
      var glaccount = scriptRef.getParameter('custscript_coupa_chrg_glacc');
      var coaId = charge['charge-allocations'][0]['account']['account-type'].id;
      var glacctSplits = glaccount.split(';');
      for (var i = 0; i < glacctSplits.length; i++) {
        var pair = glacctSplits[i];
        log.debug('glCoA ' + coaId + ' matches ' + pair + '?');
        var pairSplit = pair.split('==');
        if (pairSplit[0] == coaId) {
          log.debug('glaccount CoA ' + coaId + ' matches ' + pair + '! returning ' + pairSplit[1]);
          return pairSplit[1];
        }
      }
    }

    function getInternalIDByExternalId(recordType, externalId) {
      log.debug('Billing lookup', 'into getInternalIDByExternalId period, looking for ' + recordType + ' with externalid ' + externalId);
      var searchType;
      switch (recordType) {
        case 'subisidiary':
          searchType = search.Type.SUBSIDIARY;
          break;
        case 'location':
          searchType = search.Type.LOCATION;
          break;
        case 'department':
          searchType = search.Type.DEPARTMENT;
          break;
        case 'class':
          searchType = search.Type.CLASSIFICATION;
          break;
        default:
          log.error('ExternalId Search', 'Invalid recordType ' + recordType + ' passed, unable to find external Id');
      }

      var recordInternalId;
      search.create({
        type: searchType,
        filters: [
          ['externalid', search.Operator.IS, externalId]
        ],
        columns: ['internalid']
      }).run().each(function (result) {
        netsuite_period_id = result.id;
      });
      return netsuite_period_id;
    }

    function getPostingPeriod(dateString) {
      log.debug('getting posting period', 'provided date: ' + dateString);
      var dateObj = convertCoupaDateToNetSuiteDate(dateString);
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
      columns.push(search.createColumn({
        name: 'internalid'
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

      log.debug('Posting Period', 'After first search, postingPeriodId is ' + postingPeriodId);

      if (!postingPeriodId) {
        log.debug('Posting Period', 'No posting period found by end date, searching by start date');
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

        columns1.push(search.createColumn({
          name: 'internalid'
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
        log.debug('Posting Period', 'result1' + result1);
        if (result1 != null && result1.length > 0)
          postingPeriodId = result1[0].getValue({
            name: 'internalid',
          });
        log.debug('Posting Period', 'After second search, postingPeriodId is ' + postingPeriodId);
      }

      return postingPeriodId;
    }

    function getVirtualCardDocumentType(cardId) {
      var scriptRef = runtime.getCurrentScript();
      var baseURL = scriptRef.getParameter('custscript_coupa_chrg_url');
      var api_key = scriptRef.getParameter('custscript_coupa_chrg_apikey');
      var postHeaders = {
        'Accept': 'application/json',
        'X-COUPA-API-KEY': api_key
      };

      var getUrl = baseURL + '/api/coupa_pay/virtual_cards/' + cardId + '?fields=["id","document-type"]';
      log.audit('Search', 'querying Coupa with ' + getUrl);

      try {
        var response = https.get({
          url: getUrl,
          headers: postHeaders
        });
      } catch (e) {
        var errorMsg = 'Error making API call to Coupa, with Query: ' + getUrl;
        log.error('getInputData', errorMsg);
        log.error('getInputData', e.message);

        var notification = {
          author: errorFrom,
          recipients: errorTo.split(","),
          subject: 'Coupa/NetSuite Charge Integration Error',
          body: errorMsg
        };
        email.send(notification);

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
      log.debug('Document Type Check', 'got response code ' + response.code);

      if (response.code == 200) {
        var card = JSON.parse(response.body);
        log.debug('Document Type Check', 'Returned body: ' + card);
        return card['document-type'];
      } else {
        return '';
      }
    }

    function getSubsidiaryIdFromName(subsidiaryName) {
      log.debug('into getSubsidiaryIdFromName', 'looking for subsidiary name: ' + subsidiaryName);
      var subsidiaryId;
      var allSearch = search.create({
        type: search.Type.SUBSIDIARY,
        filters: [
          ['namenohierarchy', search.Operator.IS, subsidiaryName]
        ],
        columns: ['internalid']
      }).run().each(function (result) {
        subsidiaryId = result.id;
      });
      return subsidiaryId;
    }

    return {
      getInputData: getInputData,
      map: map,
      reduce: reduce,
      summarize: summarize
    };

  });