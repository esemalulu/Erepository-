/**
 * @NApiVersion 2.1
 * @NScriptType MapReduceScript
 * @NModuleScope SameAccount
 */
define(['N/config', 'N/email', 'N/error', 'N/file', 'N/format', 'N/https', 'N/record',
    'N/runtime', 'N/search', 'N/xml', './Coupa - OpenIDConnect 2.0'
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

  function (config, email, error, file, format, https, record, runtime, search, xml, oidc) {

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

    var requestHeader = oidc.getAPIHeader();  //NIB# 331 Get OIDC API Header
    var postHeaders = {};
    if (requestHeader) {
      postHeaders = requestHeader;
    } else {
      postHeaders = {
        'Accept': 'application/json', //NIB# 331 Use API_KEY header if OIDC parameters are not available
        'X-COUPA-API-KEY': api_key
      };
    } 

    var thisEnv = runtime.envType;
    log.debug('environment',thisEnv);
    
    var url_test_contains = ["-train", "-dev", "-dmo", "-demo", "-qa", "-sandbox", "-sbx", "-stage", "-staging", "-stg", "-support", "-test", "-uat", "coupadev.com", "coupacloud.com"];
    if (thisEnv != 'PRODUCTION') {
        var test_url = false;
        for (var i = 0; i < url_test_contains.length; i++) {
            if (baseURL.indexOf(url_test_contains[i]) > -1) {
                test_url = true;
            }
        }
        log.debug('test_url is', test_url);
        if (!test_url) {
            var errMsg = 'Error - script is running in non prod environment and not using a ' +
                url_test_contains +
                ' in the coupa URL. If you believe this to be incorrect, please contact Coupa Support';
            log.debug('BadEnv Debug', errMsg);
            var error_hash = {
                author: errorFrom,
                recipients: errorTo.split(","),
                subject: 'NetSuite Coupa SIM Integration Error',
                body: errMsg
            };
            email.send(error_hash);
            throw errMsg;
        }
    }
  
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
          var documentType = currentCharge["document-type"];
          log.audit('Document Type', 'Returned document type is ' + documentType);
          if(documentType == 'ERROR'){
            log.error('Document Type Error', ' Not Marking charge ' + currentCharge.id + ' as exported');
            continue;
          }
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
              lineCustomFields: getLineCustomFields(currentCharge),
              chargeAllocations: getChargeAllocations(currentCharge),
              requestHeader : (postHeaders ? postHeaders : requestHeader)
            }
          };
          //log.debug('Queuing Charge for processing', chargeJson);
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
     * Executes when the reduce entry point is triggered and applies to each group.
     * 
     * @param {ReduceSummary}
     *          context - Data collection containing the groups to process through the reduce stage
     * @since 2015.1
     */
    function reduce(context) {

      //log.debug('reduce charge',context.values[0]);
      var charge = JSON.parse(context.values[0]);
      var coupaChargeId = charge.charge.id;
      log.debug('Reduce coupaChargeId: ',coupaChargeId);
      var newRecordId = createCharge(charge);
      log.debug('Going to set charge as exported with parameter: ','NS RecordId: '+newRecordId+' - coupaChargeId: '+coupaChargeId);
      setChargeAsExported(newRecordId, coupaChargeId, charge.charge.requestHeader);
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
                customCoupa[headerPairSplit[0]] = getCustomFieldValue(charge, headerPairSplit[0]);
                // customCoupa = charge["'"+ headerPairSplit[0]+"'"];
                log.debug("the customCoupa value is :",getCustomFieldValue(charge, headerPairSplit[0]));
               
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
      log.audit("is Multicurrency Feature In Effect? ", runtime.isFeatureInEffect('multicurrency'));
      if (runtime.isFeatureInEffect('multicurrency')) {   //NIB#409
        var allSearch = search.create({
          type: search.Type.CURRENCY,
          filters: [
            ['symbol', search.Operator.IS, currencyCode]
          ],
          columns: ['internalid']
        }).run().each(function (result) {
          netsuite_currency_id = result.id;
        });
      } else {
        var scriptRef = runtime.getCurrentScript();
        netsuite_currency_id = scriptRef.getParameter('custscript_coupa_chrg_default_currency');
      }
      log.audit("Currency returned from getCurrencyId: ", netsuite_currency_id);
      return netsuite_currency_id;
    }

    function getPaymentPartner(charge) {
      var scriptRef = runtime.getCurrentScript();
      var coaToPaymentPartner = scriptRef.getParameter('custscript_coupa_chrg_coatopp');
      var coaId = charge['charge-allocations'][0]['account']['account-type'].id;
      var paymentPartnerId = charge["payment-partner"] ? charge["payment-partner"]["id"] : '';
      var coaSplits = coaToPaymentPartner.split(';');
      for (var i = 0; i < coaSplits.length; i++) {
        var pair = coaSplits[i];
        log.debug('CoA ' + coaId + ' matches ' + pair + '?');
        log.debug('paymentPartnerId:  ' + paymentPartnerId + ' coaId: ' + coaId + '?', pairSplit);
        var pairSplit = pair.split('==');
        if (pairSplit && pairSplit.length == 3 && pairSplit[0] == coaId && pairSplit[1] == paymentPartnerId) {
          log.debug('CoA: ' + coaId + ' & Payment Partner: ' + paymentPartnerId + 'matches ' + pair, 'returning Vendor Id: ' + pairSplit[2]);
          return pairSplit[2];
        } else if (pairSplit && pairSplit.length == 2 && pairSplit[0] == coaId) {
          log.debug('CoA ' + coaId + ' matches ' + pair + '! returning ' + pairSplit[1]);
          return pairSplit[1];
        }
      }
    }

    function getAccount(charge) {
      var accountId="";
      var scriptRef = runtime.getCurrentScript();
      var useExternalId = scriptRef.getParameter('custscript_coupa_chrg_extid');
      var glaccount = scriptRef.getParameter('custscript_coupa_chrg_glacc');
      var glacctSplits = glaccount.split(';');
      var coaId = charge['charge-allocations'][0]['account']['account-type'].id;
      var paymentPartnerId = charge["payment-partner"] ? charge["payment-partner"]["id"] : '';
      var subsidiarySegment = scriptRef.getParameter(
      	"custscript_coupa_chrg_subsseg"
      	);
      var subsidiaryId = charge['charge-allocations'][0]['account'][subsidiarySegment];
      log.debug('subsidiaryId' ,subsidiaryId);
      log.debug('useExternalId' ,useExternalId);
      if (useExternalId == true) {
      	subsidiaryId = getInternalIDByExternalId(
      		"subsidiary",
      		subsidiaryId
      		);
      }

      for (var i = 0; i < glacctSplits.length; i++) {
        var pair = glacctSplits[i];
        pair = pair.split('==');
        if (pair && pair.length == 4) {
          var paramCOAId = pair[0];
          var paramNsAccId = pair[1] ? pair[1] : null;
          var paramSubId = pair[2] ? pair[2] : null;
          var paramPartnerId = pair[3];
          log.debug('coaId:  ' + coaId + ' subsidiaryId: ' + subsidiaryId + ' paymentPartnerId: ' + paymentPartnerId + '?', pair);
          log.debug('paramSubId:  ' + paramSubId + ' paramPartnerId: ' + paramPartnerId, ' paramNsAccId: ' + paramNsAccId);
          if (paramSubId && paramPartnerId && paramNsAccId) {
            log.debug('paramCOAId:  ' + paramCOAId, ' coaId: ' + coaId);
            log.debug('paramSubId:  ' + paramSubId, ' paramSubId: ' + paramSubId);
            log.debug('paramPartnerId:  ' + paramPartnerId, ' paymentPartnerId: ' + paymentPartnerId);
            if (paramCOAId == coaId && paramSubId == subsidiaryId && paramPartnerId == paymentPartnerId) {
              log.debug('glaccount CoA: ' + coaId + ' & Payment Partner: ' + paymentPartnerId + ' matches pair at index: ' + i + ' with subsidiary: ' + paramSubId, ' returning Account Id: ' + paramNsAccId);
              accountId = paramNsAccId;
              break;
            }
          }
        } else {
          var paramCOAId = pair[0];
          var paramNsAccId = pair[1];
          var paramSubId = pair[2] ? pair[2] : null;
          if (paramSubId) {
            if (paramCOAId == coaId && paramSubId == subsidiaryId) {
              log.debug('glaccount CoA ' + coaId + ' matches pair at index: ' + i + ' with subsidiary: ' + paramSubId + ' returning ' + paramNsAccId);
              accountId = paramNsAccId;
            }
          } else {
            if (paramCOAId == coaId) {
              log.debug('glaccount CoA ' + coaId + ' matches pair at index: ' + i + ' returning ' + paramNsAccId);
              accountId = paramNsAccId;
            }
          }
        }
      }

      return accountId;
    }

    function getInternalIDByExternalId(recordType, externalId) {
      if(externalId == null || externalId == ''){
        return '';
      }
      log.debug('Billing lookup', 'into getInternalIDByExternalId period, looking for ' + recordType + ' with externalid ' + externalId);
      var searchType;
      switch (recordType) {
        case 'subsidiary':
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

      var recordInternalId="";
      search.create({
        type: searchType,
        filters: [
          ['externalid', search.Operator.IS, externalId]
        ],
        columns: ['internalid']
      }).run().each(function (result) {
          recordInternalId = result.id;
      });
      return recordInternalId;
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

      filters.push(['startdate', search.Operator.ONORBEFORE, nsDate], 'and');
      filters.push(['enddate', search.Operator.ONORAFTER, nsDate], 'and');
      filters.push(['isinactive', search.Operator.IS, false], 'and');
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

    function getSubsidiaryIdFromName(subsidiaryName) {
      log.debug('into getSubsidiaryIdFromName', 'looking for subsidiary name: ' + subsidiaryName);
      var subsidiaryId = "";
      var isOneWorld = runtime.isFeatureInEffect({    //returns true if oneworld feature i.e subsidiary enabled or returns false
        feature: 'SUBSIDIARIES'
      });
      log.audit({
        title: 'isOneWorld account?',
        details: isOneWorld
      });
      if (isOneWorld) {
        var allSearch = search.create({
          type: search.Type.SUBSIDIARY,
          filters: [
            ['namenohierarchy', search.Operator.IS, subsidiaryName]
          ],
          columns: ['internalid']
        }).run().each(function (result) {
          subsidiaryId = result.id;
        });
      } else {
        log.audit("No Subsidiary found", "One World Feature not enabled");
      }
      return subsidiaryId;
    }

/**
 * The Map stage code block has been moved in this function. The function creates CC Refund or
 * CC Charge transaction and returns transaction Id on successfull creation
 * NIB#: 266
 *
 * @param charge JSON from Payload
 * @return {number} charge transaction Id
 */
    function createCharge(charge){
      //log.debug("In createCharge()",JSON.stringify(charge));
      var scriptRef = runtime.getCurrentScript();
      var oldPostingPeriod = "";
      var useExternalId = scriptRef.getParameter('custscript_coupa_chrg_extid');

      var chargeType = charge.charge.total < 0 ? record.Type.CREDIT_CARD_REFUND :
      record.Type.CREDIT_CARD_CHARGE;
      try{
         // Transaction Type
        let existingChargeID = searchCharges(charge.charge.id);
        var cardChargeRecor = "";
        if (existingChargeID != "") {
          cardChargeRecord = record.load({
            type: chargeType,
            id: existingChargeID,
            isDynamic: true
          });
          oldPostingPeriod = cardChargeRecord.getValue({
            fieldId: "postingperiod",
          });
          cardChargeRecord.setValue({
            fieldId: 'entity',
            value: charge.paymentPartner
          });
        } else {
          cardChargeRecord = record.create({
            type: chargeType,
            isDynamic: true,
            defaultValues: {
              entity: charge.paymentPartner
            }
          });
        }

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

        /*****************************************
         *
         *  Setting Subsidiary at header level from first charge allocation
         *
         *****************************************/

        var subsidiarySegment = scriptRef.getParameter("custscript_coupa_chrg_subsseg");
        var allocations = charge.charge.chargeAllocations;
        var currentAllocation = allocations[0];
        var subsidiaryId = currentAllocation.account[subsidiarySegment];
        if (useExternalId == true) {
          subsidiaryId = getInternalIDByExternalId("subsidiary", subsidiaryId);
        }
        if (subsidiaryId == null || subsidiaryId == "") {
          log.debug("Subsidiary Id not found, checking using CoA name");
          subsidiaryId = getSubsidiaryIdFromName(currentAllocation.accountType);
        }
        log.debug("Setting Subsidiary to internal id: " + subsidiaryId);
        var isOneWorld = runtime.isFeatureInEffect({    //returns true if oneworld feature i.e subsidiary enabled or returns false
          feature: 'SUBSIDIARIES'
        });
        log.audit({
          title: 'isOneWorld account?',
          details: isOneWorld
        });
        if (isOneWorld && existingChargeID == "") {
          cardChargeRecord.setValue({
            fieldId: "subsidiary",
            value: subsidiaryId
          });
        }

         //
         var glAcc = charge.glAccountId;
         log.debug("Setting GL Account to internal id: " + glAcc);

         // Currency
         var charge = charge.charge;
         var currencyId = getCurrencyId(charge.currency);
         log.debug("Setting Currency to internal id: " + currencyId);
         if(currencyId) {
           cardChargeRecord.setValue({
             fieldId: "currency",
             value: currencyId
           });
         }

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

        if (existingChargeID != "") {
          var cnt = cardChargeRecord.getLineCount({
            sublistId: 'expense'
          });
          log.debug("Update Operation", "Removing " + cnt + " Line Expenses before adding the Expense Lines again");
          for (var r = (cnt - 1); r >= 0; r--) {
            cardChargeRecord.removeLine({
              sublistId: 'expense',
              line: r
            });
          }
        }
         for (var i = 0; i < allocations.length; i++) {
           var currentAllocation = allocations[i];
           cardChargeRecord.selectNewLine({
             sublistId: "expense"
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
             fieldId: "class",
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

           if (!existingChargeID) {      //search posting period only when creating charge
             var postingPeriodId = "";
             var cutoffDay = scriptRef.getParameter('custscript_coupa_chrg_cutoff_day');
             //Verify if Cut-off day is provided in the script parameter. Refer NIB-427 for more details
             if (cutoffDay && parseInt(cutoffDay) != 0) {
               log.debug("cut-off day present in script deployment: " + cutoffDay);
               postingPeriodId = processCutOff(charge.chargeDate);
             } else {
               // Posting Period
               log.debug("cut-off day not present in script deployment, charge date: " + charge.chargeDate);
               postingPeriodId = getPostingPeriod(charge.chargeDate);
             }
             log.debug("Setting Posting Period to internal id: " + postingPeriodId);
             cardChargeRecord.setValue({
               fieldId: "postingperiod",
               value: postingPeriodId
             });
           } else {   //validate posting period available on the charge to be unlocked.
             log.debug({
               title: chargeType + ":" + existingChargeID,
               details: 'validating posting period- accountingperiod:' + oldPostingPeriod + 'available on the charge'
             });
             let lockedFlag = search.lookupFields({
               type: 'accountingperiod',
               id: oldPostingPeriod,
               columns: 'alllocked'
             });
             log.debug({
               title: "lockedFlag",
               details: lockedFlag
             });
             if (lockedFlag.alllocked || lockedFlag.closed) {
               var configRecObj = config.load({
                 type: config.Type.COMPANY_INFORMATION
               });
               var scriptRef = runtime.getCurrentScript();
               let instanceURL = configRecObj.getValue('appurl');
               let chargeURL = instanceURL + "/app/accounting/transactions/transaction.nl?id=" + existingChargeID;
               let coupaChargeURL = scriptRef.getParameter('custscript_coupa_chrg_url') + "/order_headers/charges/" + charge.id;
               log.error({
                 title: 'CLOSED_TRANSACTION_PERIOD',
                 details: "The transaction(" + chargeType + ":" + existingChargeID + ") you're are trying to update is from a locked / closed accounting period(accountingperiod:" + oldPostingPeriod + "). Please visit " + instanceURL + " to know the steps required to reopen a closed period.To integrate the transaction please visit " + instanceURL + " to know the steps required to reopen a closed period, then flip the exported flag on the Coupa Charge (ID:" + charge.id + ") ."
               });
               var errorTo = scriptRef.getParameter('custscript_coupa_chrg_errorto');
               var errorFrom = scriptRef.getParameter('custscript_coupa_chrg_errorfrm');
               var notification = {
                 author: errorFrom,
                 recipients: errorTo.split(","),
                 subject: 'Coupa/NetSuite Charge Integration Error',
                 body: "Hello, <br><br>The Coupa Charge Integration script Failed to update NetSuite Credit Card Transaction (ID: <a target=\"_blank\" href=\"" + chargeURL + "\">" + existingChargeID + "</a>) as the transaction is from a locked/closed accounting period(accountingperiod:" + oldPostingPeriod + "). <br><br> To integrate the transaction please reopen the unlocked/closed period and flip the exported flag on the Coupa Charge (ID: <a target=\"_blank\" href=\"" + coupaChargeURL + "\">" + charge.id + "</a>).<br><br> Thanks,<br>Coupa-NetSuite Integration Team"
               };
               email.send(notification);
               return existingChargeID;
             } else {
               log.debug("Setting Posting Period to internal id: " + oldPostingPeriod);
               cardChargeRecord.setValue({
                 fieldId: "postingperiod",
                 value: oldPostingPeriod
               });
             }
           }

           // Line Custom Fields
           var lineCustomFields = scriptRef.getParameter("custscript_coupa_chrg_linecf");
           log.debug("Processing Line custom fields", lineCustomFields);
           if (lineCustomFields != "" && lineCustomFields != null) {
             log.debug("lineCustomFields !=", lineCustomFields);
             var lineSplit = lineCustomFields.split(";");
             for (var k = 0; k < lineSplit.length; k++) {
               var linePair = lineSplit[k];
               var linePairSplit = linePair.split("==");
               if (linePairSplit && linePairSplit.length == 2) {
                 // log.debug("linePairSplit", linePairSplit);
                 var coupaField = linePairSplit[0];
                 // log.debug("coupaField", coupaField);
                 var nsField = linePairSplit[1];
                 log.debug("mapping " + coupaField + " to " + nsField);

                 var value = getCustomFieldValue(currentAllocation.account, coupaField);
                 log.debug('value is ', value);
                 if (value == "" || value == null) {
                   log.debug("value for " + coupaField + " not found on chargeAllocation, checking charge level");
                   value = charge.lineCustomFields[coupaField];		//NIB-271-> Searches for Line Custom fields in the "lineCustomFields" property if not found at line level
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
               } else if (linePairSplit && linePairSplit.length == 3) {
                 var coupaField = linePairSplit[0];
                 var nsField = linePairSplit[1];
                 var fieldType = linePairSplit[2];
                 var chargeLineCustomFields = currentAllocation.account;
                 var value = processDataTypeMapping(chargeLineCustomFields, coupaField, nsField, fieldType);
                 log.debug('value is ', value);
                 if (value == "" || value == null) {
                   chargeLineCustomFields = charge.lineCustomFields;
                   value = processDataTypeMapping(chargeLineCustomFields, coupaField, nsField, fieldType);
                 }
                 cardChargeRecord.setCurrentSublistValue({
                   sublistId: "expense",
                   fieldId: nsField,
                   value: value
                 });
               }
             }
           } else {
             log.debug("No custom fields found");
           }

           // Save the line
           cardChargeRecord.commitLine({
             sublistId: "expense"
           });
            var scriptObj = runtime.getCurrentScript();
            log.debug("Remaining governance units in Reduce stage after commiting Line: " + scriptObj.getRemainingUsage()); 
         }

         var headerCustomFields = scriptRef.getParameter(
           "custscript_coupa_chrg_headcf"
           );

         if (headerCustomFields != "" && headerCustomFields != null) {
           var headerSplit = headerCustomFields.split(";");
           for (var j = 0; j < headerSplit.length; j++) {
             var headerPair = headerSplit[j];
             log.debug("the headerPair is:", headerPair);
             var headerPairSplit = headerPair.split("==");
             if (headerPairSplit && headerPairSplit.length == 2) {
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
             } else if (headerPairSplit && headerPairSplit.length == 3) {
               var coupaField = headerPairSplit[0];
               var nsField = headerPairSplit[1];
               var fieldType = headerPairSplit[2];
               var chargeHeader = charge["chargeHeader"];
               var value = processDataTypeMapping(chargeHeader, coupaField, nsField, fieldType);
               cardChargeRecord.setValue({
                 fieldId: nsField,
                 value: value
               });
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
         //NIB#355
         var scriptRef = runtime.getCurrentScript();
         var baseURL = scriptRef.getParameter('custscript_coupa_chrg_url');
         cardChargeRecord.setValue({
           fieldId: "custbody_coupa_charge_url",
           value: baseURL + "/order_headers/charges/" + charge.id
         });

        // External ID
        var externalId = "CoupaCharge-" + charge.id;
        log.debug("Setting External ID to charge id: " + externalId);
        cardChargeRecord.setValue({
          fieldId: "externalid",
          value: externalId
        });

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
        var scriptObj = runtime.getCurrentScript();
        log.debug("Remaining governance units in Reduce stage: " + scriptObj.getRemainingUsage()); 
         return newRecordId;
       }
       catch(e){
        log.error("error creating charge",charge.id);
        log.debug("error",e);
      }
    }

/**
 * The function marks the charge as exported in Coupa environment. The code block is the previous Reduce stage code block refer NIB-266 for more details.
 * NIB#: 266
 *
 * @param newRecordId NS Transaction Id
 * @param coupaChargeId Coupa Charge Id
 */
    function setChargeAsExported(newRecordId, coupaChargeId, requestHeader){
      if (newRecordId == null || newRecordId == '') {
        log.error('Failed to create new charge record for charge ' + coupaChargeId);
      } else {
        // Mark Exported
        var scriptRef = runtime.getCurrentScript();

        var baseURL = scriptRef.getParameter('custscript_coupa_chrg_url');
        var api_key = scriptRef.getParameter('custscript_coupa_chrg_apikey');

        var getUrl = baseURL + '/api/charges/' + coupaChargeId + '?exported=true';
        var postBody = '';
        log.debug('PUT URL', 'PUT URL ' + getUrl);
        try {
          var response = https.put({
            url: getUrl,
            headers: requestHeader,
            body: postBody
          });
          log.debug('Marking Exported: ' + coupaChargeId, 'Reponse Code: ' + response.code);
        } catch (e) {
          log.error('reduce', 'Error making API call to Coupa, with Query: ' + getUrl);
        }
      }
    }

/**
 * This function gets the value of custom field from a nested JSON
 * NIB#: 271
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
	        if (typeof obj[prop[i]] == 'undefined')
	            return defval;
	        obj = obj[prop[i]];
	    }
	    return obj;
	}

/**
 * This function gets the value of line level custom field from a nested JSON
 * NIB#: 271
 *
 * @param obj JSON response
 * @return custom field Map
 */
	function getLineCustomFields(charge) {
	    var scriptRef = runtime.getCurrentScript();
	    var lineCustomFields = scriptRef.getParameter('custscript_coupa_chrg_linecf');
	    if (lineCustomFields) {
	        var lineSplit = lineCustomFields.split(';');
	        var customCoupa = {};
	        for (var i = 0; i < lineSplit.length; i++) {
	            var linePair = lineSplit[i];
	            var linePairSplit = linePair.split('==');
	            customCoupa[linePairSplit[0]] = getCustomFieldValue(charge, linePairSplit[0]);
	            log.debug("the customCoupa value is :", getCustomFieldValue(charge, linePairSplit[0]));
	        }
	        log.debug("the customCoupa value is :", customCoupa);
	        return customCoupa;
	    }
	}

    /**
     * Proccess custom field mapping with data type
     * NIB# - NIB-423
     * @param chargeHeader
     * @param coupaField
     * @param nsField
     * @param fieldType
     * @return {*[]|boolean}
     */
    function processDataTypeMapping(chargeHeader, coupaField, nsField, fieldType) {
      var value = chargeHeader[coupaField];

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
          value = chargeHeader[coupaField];
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
     *  This function processes Cutoff Day logic and returns the posting period id to be set in the posting period
     * field.
     * NIB#: 427
     * @param dateString
     * @return {string}
     */
    const processCutOff = (dateString) => {
      var scriptRef = runtime.getCurrentScript();
      var postingPeriodId = "";
      var cutoffDay = scriptRef.getParameter('custscript_coupa_chrg_cutoff_day');
      log.debug('getting posting period - in processCutOff', 'provided date: ' + dateString);
      var dateObj = convertCoupaDateToNetSuiteDate(dateString);
      var isNegativeCutoffDay = cutoffDay && parseFloat(cutoffDay) < 0 ? true : false;
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
     * Process The Positive Cutoff day and keeps/push the transaction to the next posting period if prerequisites are
     * satisfied.
     * NIB#: 427
     * @param dateObj
     * @param cutoffDay
     * @param dateString
     * @return {*}
     */
    const processPositiveCutOff = (dateObj, cutoffDay, dateString) => {
      let postingPeriodId = "";
      log.debug({
        title: 'Processing Positive Cut off day: ' + cutoffDay,
        details: dateObj
      });
      var todaysDate = new Date();
      var chargeDate = new Date(dateObj);
      if (todaysDate.getDate() > cutoffDay && todaysDate.getMonth() > chargeDate.getMonth()) {
        //same month as of today's date
        log.debug({
          title: 'todaysDate.getDate() > cutoffDay: ' + todaysDate.getDate() > cutoffDay,
          details: 'todaysDate.getMonth() > chargeDate.getMonth(): ' + todaysDate.getMonth() > chargeDate.getMonth()
        });
        postingPeriodId = searchCutOffPostingPeriod(todaysDate);
      } else if (todaysDate.getDate() < cutoffDay && todaysDate.getMonth() > chargeDate.getMonth()) {
        //same month as of charge date
        log.debug({
          title: 'todaysDate.getDate() < cutoffDay: ' + todaysDate.getDate() < cutoffDay,
          details: 'todaysDate.getMonth() > chargeDate.getMonth(): ' + todaysDate.getMonth() > chargeDate.getMonth()
        });
        postingPeriodId = searchCutOffPostingPeriod(chargeDate);
      } else {
        log.debug({
          title: 'In Else condition for default case: ',
          details: 'dateString: ' + dateString
        });
        postingPeriodId = getPostingPeriod(dateString);
      }
      return postingPeriodId;
    }

    /**
     * Process The Negative Cutoff day and keeps/push the transaction to the next posting period if prerequisites are
     * satisfied.
     * NIB#: 427
     * @param dateObj
     * @param cutoffDay
     * @param dateString
     * @return {*}
     */
    const processNegativeCutOff = (dateObj, cutoffDay, dateString) => {
      let postingPeriodId = "";
      log.debug({
        title: 'Processing Negative Cut off day: ' + cutoffDay,
        details: dateObj
      });
      var todaysDate = new Date();
      var chargeDate = new Date(dateObj);
      var maxDays = new Date(chargeDate.getFullYear(), (chargeDate.getMonth() + 1), 0).getDate();
      var thresholdDay = maxDays - Math.abs(parseFloat(cutoffDay));
      var monthDifference = monthDiff(todaysDate, chargeDate);
      log.debug({
        title: 'monthDifference: ' + monthDifference,
        details: 'thresholdDay: ' + thresholdDay
      });
      if (todaysDate.getDate() > thresholdDay && todaysDate.getMonth() == chargeDate.getMonth()) {
        //push to next month
        log.debug({
          title: 'todaysDate.getDate() > thresholdDay: ' + todaysDate.getDate() > thresholdDay,
          details: 'todaysDate.getMonth() == chargeDate.getMonth(): ' + todaysDate.getMonth() == chargeDate.getMonth()
        });
        postingPeriodId = searchCutOffPostingPeriod(chargeDate.addMonths(1));
      } else if (todaysDate.getDate() < thresholdDay && todaysDate.getMonth() == chargeDate.getMonth()) {
        //same month as of charge date
        log.debug({
          title: 'todaysDate.getDate() < thresholdDay: ' + todaysDate.getDate() < thresholdDay,
          details: 'todaysDate.getMonth() == chargeDate.getMonth(): ' + todaysDate.getMonth() == chargeDate.getMonth()
        });
        postingPeriodId = searchCutOffPostingPeriod(chargeDate);
      } else if (todaysDate.getDate() > thresholdDay && monthDifference < 0) {
        //same month as of today's date
        log.debug({
          title: 'todaysDate.getDate() > thresholdDay: ' + todaysDate.getDate() > thresholdDay,
          details: 'monthDifference < 0: ' + monthDifference < 0
        });
        postingPeriodId = searchCutOffPostingPeriod(todaysDate);
      } else {
        log.debug({
          title: 'In Else condition for default case: ',
          details: 'dateString: ' + dateString
        });
        postingPeriodId = getPostingPeriod(dateString);
      }
      return postingPeriodId;
    }

    /**
     * Search Posting Period based on Date Object instead of the date string. In a future release, this function can
     * be integrated with the existing getPostingPeriod function.
     * NIB#: 427
     * @param transactionDate
     * @return {null}
     */
    const searchCutOffPostingPeriod = (transactionDate) => {
      log.debug('getting Cutoff posting period', 'provided date: ' + transactionDate);
      var dateObj = transactionDate
      var nsDate = format.format({
        value: dateObj,
        type: format.Type.DATE,
      });
      log.debug('ns date', nsDate);
      var postingPeriodId = null;

      var filters = [];
      var columns = [];

      filters.push(['startdate', search.Operator.ONORBEFORE, nsDate], 'and');
      filters.push(['enddate', search.Operator.ONORAFTER, nsDate], 'and');
      filters.push(['isinactive', search.Operator.IS, false], 'and');
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

      var result = periodSearch.run().getRange(0, 1);

      if (result != null && result.length > 0)
        postingPeriodId = result[0].getValue({
          name: 'internalid',
        });

      log.debug('Posting Period', 'After first search, postingPeriodId is ' + postingPeriodId);

      if (!postingPeriodId) {
        log.debug('Posting Period', 'No posting period found by end date, searching first open period after transaction month.');
        var filters1 = [];
        var columns1 = [];

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

        var periodSearch1 = search.create({
          type: search.Type.ACCOUNTING_PERIOD,
          filters: filters1,
          columns: columns1,
        });
        var result1 = periodSearch1.run().getRange(0, 1); // returns only the
        log.debug('Posting Period', 'result1' + result1);
        if (result1 != null && result1.length > 0)
          postingPeriodId = result1[0].getValue({
            name: 'internalid',
          });
        log.debug('Posting Period', 'After second search, postingPeriodId is ' + postingPeriodId);
      }
      return postingPeriodId;
    }

    /**
     * Object method which adds months to the date object and returns the new object
     * NIB#: 427
     * @param months
     * @return {Date}
     */
    Date.prototype.addMonths = function (months) {
      var date = new Date(this.valueOf());
      date.setMonth(date.getMonth() + months);
      return date;
    }

    /**
     * This function returns the difference between two dates in months
     * NIB#: 427
     * @param d1
     * @param d2
     * @return {number}
     */
    function monthDiff(d1, d2) {
      var months;
      months = (d2.getFullYear() - d1.getFullYear()) * 12;
      months -= d1.getMonth();
      months += d2.getMonth();
      return months;
    }

    /**
     * Search the internal id of theCredit Card Charge if already present in NS
     * @param CoupaChargeID
     * @return {string}
     */
    const searchCharges = (CoupaChargeID) => {
      let chargeTransactionId = "";
      log.debug({
        title: 'CoupaChargeID in searchCharges function',
        details: CoupaChargeID
      });
      var creditcardchargeSearch = search.create({
        type: "creditcardcharge",
        filters:
            [
              ["type", "anyof", "CardChrg"],
              "AND",
              ["mainline", "is", "T"],
              "AND",
              ["externalidstring", "is", "CoupaCharge-" + CoupaChargeID]
            ],
        columns: []
      });
      var searchResultCount = creditcardchargeSearch.runPaged().count;
      log.debug("creditcardchargeSearch result count", searchResultCount);
      creditcardchargeSearch.run().each(function (result) {
        chargeTransactionId = result.id;
        return true;
      });
      return chargeTransactionId
    }

    return {
      getInputData: getInputData,
      reduce: reduce,
      summarize: summarize
    };

  });