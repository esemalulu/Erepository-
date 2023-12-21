/* eslint-disable no-redeclare */
/* eslint-disable block-scoped-var */
/**
 * @NApiVersion 2.X
 * @NScriptType ClientScript
 * @NModuleScope SameAccount
 * @NAmdConfig /SuiteScripts/Myers-Holum/Libraries/MHI_YYF_Configurations.json
 */
define(['mapping', 'N/record', 'N/search', 'N/format', 'N/url', 'N/https'], function (mapping, record, search, format, url, https) {
  var exports = {};
  var TRAN = mapping.TRAN;
  var ITEM = mapping.ITEM;
  var INCOME_PLACEHOLDER = mapping.CONST.ACCOUNT.INCOME_PLACEHOLDER;
  var ITEM_PRICING = mapping.CONST.ITEM_PRICING;
  var SL_EFFECTIVE_PRICING = mapping.SCRIPT.SL_EFFECTIVE_PRICING;
  var EFFECTIVE_SALES = mapping.CUSTOM.EFFECTIVE_SALES;
  var event = '';

  // Setting the Account fields to mandatory (Read-Only)
  function validateItemAccounts(recObj, logTitle) {
    var incomeAccount = recObj.getValue({
      fieldId: 'incomeaccount'
    });
    log.debug(logTitle, 'incomeAccount=' + incomeAccount);

    var fldMaterialCostAccount = recObj.getField({
      fieldId: ITEM.MATERIAL_COST_ACCOUNT
    });
    var fldMaterialHandAccount = recObj.getField({
      fieldId: ITEM.MATERIAL_HAND_ACCOUNT
    });
    var fldCoPackAccount = recObj.getField({
      fieldId: ITEM.CO_PACK_ACCOUNT
    });

    if (fldMaterialCostAccount) {
      if (incomeAccount == INCOME_PLACEHOLDER) fldMaterialCostAccount.isMandatory = true;
      else fldMaterialCostAccount.isMandatory = false;
    }

    if (fldMaterialHandAccount) {
      if (incomeAccount == INCOME_PLACEHOLDER) fldMaterialHandAccount.isMandatory = true;
      else fldMaterialHandAccount.isMandatory = false;
    }

    if (fldCoPackAccount) {
      if (incomeAccount == INCOME_PLACEHOLDER) fldCoPackAccount.isMandatory = true;
      else fldCoPackAccount.isMandatory = false;
    }
  }

  /**
     * Function to be executed after page is initialized.
     *
     * @governance XXX
     *
     * @param context
     *        {Object}
     * @param context.currentRecord
     *        {Record} Current form record
     * @param context.mode
     *        {String} The mode in which the record is being accessed (create,
     *        copy, or edit)
     *
     * @return {void}
     *
     * @since 2015.2
     *
     * @static
     * @function pageInit
     */
  function pageInit(context) {
    event = context.mode;
    var recObj = context.currentRecord;
    var recType = recObj.type;
    var logTitle = 'pageInit_' + event + '_' + recType;

    if (recObj.id) logTitle += '_' + recObj.id;

    log.debug(logTitle, '***Start of Execution***');

    if (recType == 'assemblyitem' || recType == 'lotnumberedassemblyitem' || recType == 'serializedassemblyitem') {
      validateItemAccounts(recObj, logTitle);
    }
  }

  /**
     * Function to be executed when field is changed.
     *
     * @governance XXX
     *
     * @param context
     *        {Object}
     * @param context.currentRecord
     *        {Record} Current form record
     * @param context.sublistId
     *        {String} Sublist name
     * @param context.fieldId
     *        {String} Field name
     * @param [context.lineNum]
     *        {Number} Line number. Will be undefined if not a sublist or matrix
     *        field
     * @param [context.columnNum]
     *        {Number} Matrix column number. Will be undefined if not a matrix
     *        field
     *
     * @return {void}
     *
     * @since 2015.2
     *
     * @static
     * @function fieldChanged
     */
  function fieldChanged(context) {
    var recObj = context.currentRecord;
    var recType = recObj.type;
    var fieldId = context.fieldId;
    var logTitle = 'fieldChanged_' + recType;

    if ((recType == 'assemblyitem' || recType == 'lotnumberedassemblyitem' || recType == 'serializedassemblyitem') && fieldId == 'incomeaccount') {
      validateItemAccounts(recObj, logTitle);
    }
  }

  /**
     * Validation function to be executed when sublist line is committed.
     *
     * @governance XXX
     *
     * @param context
     *        {Object}
     * @param context.currentRecord
     *        {Record} Current form record
     * @param context.sublistId
     *        {String} Sublist name
     *
     * @return {Boolean} <code>true</code> if sublist line is valid;
     *         <code>false</code> otherwise
     *
     * @since 2015.2
     *
     * @static
     * @function validateLine
     */
  function validateLine(context) {
    var recObj = context.currentRecord;
    var recType = recObj.type;
    var sublistId = context.sublistId;
    var logTitle = 'validateLine_' + recType;

    if (recObj.id) logTitle += '_' + recObj.id;

    if (recType == 'salesorder' || recType == 'invoice' || recType == 'creditmemo') {
      if (sublistId == 'item') {
        var lineItem = recObj.getCurrentSublistValue({
          sublistId: 'item',
          fieldId: 'item'
        });
        var assessItem = accessSuitelet({ action: 'ASSESS_ITEM', item: lineItem });
        log.debug(logTitle, 'lineItem=' + lineItem + ' assessItem=' + assessItem);

        if (assessItem) {
          // var createdFrom = recObj.getValue({
          //   fieldId: 'createdfrom'
          // });
          // var tranDate = recObj.getValue({
          //   fieldId: 'trandate'
          // });
          // var fTranDate = format.format({
          //   value: tranDate,
          //   type: format.Type.DATE
          // });
          // var isWithinRange = accessSuitelet({ action: 'WITHIN_RANGE', item: lineItem, tranDate: fTranDate });

          // if (!isWithinRange && event == 'create' && !createdFrom) {
          //   alert('The transaction date is outside the date range of the item.');
          //   recObj.setCurrentSublistValue({
          //     sublistId: 'item',
          //     fieldId: 'rate',
          //     value: 0
          //   });
          // }

          var lineAmount = parseFloat(recObj.getCurrentSublistValue({
            sublistId: 'item',
            fieldId: 'amount'
          }) || 0);
          var lineMatCost = parseFloat(recObj.getCurrentSublistValue({
            sublistId: 'item',
            fieldId: TRAN.TOTAL_MATCOST
          }) || 0);
          var lineMatHandling = parseFloat(recObj.getCurrentSublistValue({
            sublistId: 'item',
            fieldId: TRAN.TOTAL_MATHAND
          }) || 0);
          var lineCoPack = parseFloat(recObj.getCurrentSublistValue({
            sublistId: 'item',
            fieldId: TRAN.TOTAL_COPACK
          }) || 0);
          var lineCostTotal = lineMatCost + lineMatHandling + lineCoPack;
          log.debug(logTitle, 'lineAmount=' + lineAmount);
          log.debug(logTitle, 'lineCostTotal=' + lineCostTotal);

          if (lineAmount.toFixed(2) != lineCostTotal.toFixed(2)) {
            alert('Line Amount must be equal to the sum of Total Material Cost, Total Material Handling Cost, and Total Co-Pack Price');
            return false;
          }
        }
      }
    }

    if (recType == 'assemblyitem' || recType == 'lotnumberedassemblyitem' || recType == 'serializedassemblyitem') {
      var subSalesPrice = 'recmach' + EFFECTIVE_SALES.ITEM;
      if (sublistId == subSalesPrice) {
        if (!recObj.id) {
          alert('Please create the item first before entering data to this sublist.');
          return false;
        }

        var lineStart = recObj.getCurrentSublistValue({
          sublistId: subSalesPrice,
          fieldId: EFFECTIVE_SALES.START
        }) || '';
        var lineEnd = recObj.getCurrentSublistValue({
          sublistId: subSalesPrice,
          fieldId: EFFECTIVE_SALES.END
        }) || '';
        var lineMatCost = parseFloat(recObj.getCurrentSublistValue({
          sublistId: subSalesPrice,
          fieldId: EFFECTIVE_SALES.MAT_COST
        }) || 0);
        var lineMatHand = parseFloat(recObj.getCurrentSublistValue({
          sublistId: subSalesPrice,
          fieldId: EFFECTIVE_SALES.MAT_HAND
        }) || 0);
        var lineCoPack = parseFloat(recObj.getCurrentSublistValue({
          sublistId: subSalesPrice,
          fieldId: EFFECTIVE_SALES.CO_PACK
        }) || 0);
        var lineBasePrice = parseFloat(recObj.getCurrentSublistValue({
          sublistId: subSalesPrice,
          fieldId: EFFECTIVE_SALES.BASE_PRICE
        }) || 0);

        // EVALUATE THE PRICES
        var linePriceTotal = lineMatCost + lineMatHand + lineCoPack;

        if (lineBasePrice.toFixed(2) != linePriceTotal.toFixed(2)) {
          alert('Base Price must be equal to the sum of Material Cost, Material Handling Cost, and Co-Pack Price.');
          return false;
        }

        // EVALUATE THE DATES
        log.debug(logTitle, 'lineStart=' + lineStart + ' lineEnd=' + lineEnd);

        if (lineStart > lineEnd) {
          alert('Start Date should not be greater than End Date.');
          return false;
        }

        var strStart = formatMMDDYYYY(lineStart) || '';
        var strEnd = formatMMDDYYYY(lineEnd) || '';
        log.debug(logTitle, 'strStart=' + strStart + ' strEnd=' + strEnd);

        // CHECK FOR OVERLAP - This is not yet working so we'll comment it for now.
        var itemId = recObj.id || '';
        var currency = recObj.getCurrentSublistValue({
          sublistId: subSalesPrice,
          fieldId: EFFECTIVE_SALES.CURRENCY
        }) || '';

        if (itemId && strStart && strEnd && currency) {
          var params = {
            action: 'CHECK_FOR_OVERLAP', id: '', item: itemId, start: strStart, end: strEnd, currency: currency
          };
          var salesPricingId = recObj.getCurrentSublistValue({
            sublistId: subSalesPrice,
            fieldId: 'id'
          }) || '';
          if (salesPricingId) params.id = salesPricingId;
          log.debug(logTitle, 'params=' + JSON.stringify(params));
          var hasOverlapDates = accessSuitelet(params);
          log.debug(logTitle, 'hasOverlapDates=' + hasOverlapDates);

          if (hasOverlapDates) {
            alert('Please change the Start Date and End Date as they overlap with an Effective Date Pricing (Sales) entry.');
            return false;
          }
        }
      }
    }

    return true;
  }

  /**
     * Validation function to be executed when record is saved.
     *
     * @governance XXX
     *
     * @param context
     *        {Object}
     * @param context.currentRecord
     *        {Record} Current form record
     *
     * @return {Boolean} <code>true</code> to allow record to be saved;
     *         <code>false</code> to prevent it
     *
     * @since 2015.2
     *
     * @static
     * @function saveRecord
     */
  function saveRecord(context) {
    var recObj = context.currentRecord;
    var recType = recObj.type;
    var logTitle = 'saveRecord_' + recType;

    if (recObj.id) logTitle += '_' + recObj.id;

    if (recType == 'assemblyitem' || recType == 'lotnumberedassemblyitem' || recType == 'serializedassemblyitem') {
      var incomeAccount = recObj.getValue({
        fieldId: 'incomeaccount'
      });
      var materialCostAccount = recObj.getValue({
        fieldId: ITEM.MATERIAL_COST_ACCOUNT
      });
      var materialHandAccount = recObj.getValue({
        fieldId: ITEM.MATERIAL_HAND_ACCOUNT
      });
      var coPackAccount = recObj.getValue({
        fieldId: ITEM.CO_PACK_ACCOUNT
      });

      if (incomeAccount != INCOME_PLACEHOLDER) return true;

      var missingAccounts = [];

      if (!materialCostAccount) missingAccounts.push('Material Cost Account');
      if (!materialHandAccount) missingAccounts.push('Material Handling Account');
      if (!coPackAccount) missingAccounts.push('Co-Pack Account');

      if (missingAccounts.length > 0) {
        alert('Please enter value(s) for: ' + missingAccounts + '.');
        return false;
      }

      // VALIDATE THE AMOUNT
      var itemBasePrice = getItemBasePrice(recObj, logTitle) || 0;
      var materialCost = parseFloat(recObj.getValue({
        fieldId: ITEM.MATERIAL_COST
      }) || 0);
      var materialHand = parseFloat(recObj.getValue({
        fieldId: ITEM.MATERIAL_HAND
      }) || 0);
      var coPack = parseFloat(recObj.getValue({
        fieldId: ITEM.CO_PACK
      }) || 0);
      var itemCostTotal = materialCost + materialHand + coPack;

      if (itemBasePrice.toFixed(2) != itemCostTotal.toFixed(2)) {
        alert('Base Price must be equal to the sum of Material Cost, Material Handling Cost, and Co-Pack Price.');
        return false;
      }

      var missingDates = [];

      var startDate = recObj.getValue({
        fieldId: ITEM.START_DATE
      });
      var endDate = recObj.getValue({
        fieldId: ITEM.END_DATE
      });

      if (!startDate) missingDates.push('Start Date');
      if (!endDate) missingDates.push('End Date');

      if (missingDates.length > 0 && (materialCost || materialHand || coPack)) {
        alert('Please enter value(s) for: ' + missingDates + '.');
        return false;
      }

      if (startDate) {
        // var strToday = format.format({
        //   value: new Date(),
        //   type: format.Type.DATE
        // });
        // var dToday = format.parse({
        //   value: strToday,
        //   type: format.Type.DATE
        // });

        // if (startDate < dToday) {
        //   alert('Start Date should be on or after today.');
        //   return false;
        // }
        if (startDate > endDate) {
          alert('Start Date should not be greater than End Date.');
          return false;
        }
      }
    }

    if (recType == 'salesorder' || recType == 'invoice' || recType == 'creditmemo') {
      var createdFrom = recObj.getValue({
        fieldId: 'createdfrom'
      });
      var tranDate = recObj.getValue({
        fieldId: 'trandate'
      });
      var fTranDate = format.format({
        value: tranDate,
        type: format.Type.DATE
      });
      var count = recObj.getLineCount({
        sublistId: 'item'
      });

      // GET ALL ITEMS
      var arrItems = [];
      for (var i = 0; i < count; i += 1) {
        var lineItem = recObj.getSublistValue({
          sublistId: 'item',
          fieldId: 'item',
          line: i
        });
        if (arrItems.indexOf(lineItem) == -1) arrItems.push(lineItem);
      }

      log.debug(logTitle, 'arrItems=' + JSON.stringify(arrItems));

      if (arrItems.length == 0) return true;

      // GET VALID ITEMS AND ITEMS WITHIN DATE RANGE
      var returnItems = accessSuitelet({ action: 'VALIDATE_ITEM_LIST', itemList: arrItems.toString(), tranDate: fTranDate });
      log.debug(logTitle, 'returnItems=' + JSON.stringify(returnItems));

      var validItems = returnItems.validItems || [];
      var withinRangeItems = returnItems.withinRangeItems || [];
      log.debug(logTitle, 'validItems=' + JSON.stringify(validItems));
      log.debug(logTitle, 'withinRangeItems=' + JSON.stringify(withinRangeItems));

      if (validItems.length == 0) return true;

      // EVALUATE TRANSACTION ITEMS
      for (var i = 0; i < count; i += 1) {
        var lineItem = recObj.getSublistValue({
          sublistId: 'item',
          fieldId: 'item',
          line: i
        });
        var itemRate = recObj.getSublistValue({
          sublistId: 'item',
          fieldId: 'rate',
          line: i
        });

        if (validItems.indexOf(lineItem) == -1) continue;

        if (!createdFrom && (itemRate == 0 || withinRangeItems.indexOf(lineItem) == -1)) alert('LINE ' + (i + 1) + ': The item does not have an active price ($0).');

        if (!createdFrom && event == 'create' && withinRangeItems.indexOf(lineItem) == -1) {
          recObj.selectLine({
            sublistId: 'item',
            line: i
          });
          recObj.setCurrentSublistValue({
            sublistId: 'item',
            fieldId: 'rate',
            value: 0
          });
          recObj.setCurrentSublistValue({
            sublistId: 'item',
            fieldId: TRAN.MATCOST,
            value: 0
          });
          recObj.setCurrentSublistValue({
            sublistId: 'item',
            fieldId: TRAN.MATHAND,
            value: 0
          });
          recObj.setCurrentSublistValue({
            sublistId: 'item',
            fieldId: TRAN.COPACK,
            value: 0
          });
          recObj.commitLine({
            sublistId: 'item'
          });
        }
      }
    }

    if (recType == 'workorder') {
      var assemblyItem = recObj.getValue({
        fieldId: 'assemblyitem'
      });
      var prodStartDate = recObj.getValue({
        fieldId: 'startdate'
      });
      log.debug(logTitle, 'assemblyItem=' + assemblyItem);

      var STR = 'CASE WHEN TO_DATE(\'' + formatMMDDYYYY(prodStartDate) + '\', \'mm/dd/yyyy\') >= TO_DATE(TO_CHAR({' + ITEM.START_DATE + '}, \'mm/dd/yyyy\'), \'mm/dd/yyyy\') '
      + 'AND TO_DATE(\'' + formatMMDDYYYY(prodStartDate) + '\', \'mm/dd/yyyy\') <= TO_DATE(TO_CHAR({' + ITEM.END_DATE + '}, \'mm/dd/yyyy\'), \'mm/dd/yyyy\') THEN 1 ELSE 0 END';

      var searchObj = search.create({
        type: search.Type.ITEM,
        filters: [
          ['internalid', 'anyof', assemblyItem]
        ],
        columns: [
          search.createColumn({
            name: 'incomeaccount'
          }),
          search.createColumn({
            name: 'formulanumeric',
            formula: STR
          })
        ]
      });
      var resultSet = searchObj.run().getRange({
        start: 0,
        end: 1
      });
      log.debug(logTitle, STR);
      log.debug(logTitle, 'result=' + JSON.stringify(resultSet[0]));

      var incomeAccount = parseFloat(resultSet[0].getValue({
        name: 'incomeaccount'
      })) || 0;
      log.debug(logTitle, 'incomeAccount=' + incomeAccount);

      if (incomeAccount == INCOME_PLACEHOLDER) {
        var isWithinRange = parseFloat(resultSet[0].getValue({
          name: 'formulanumeric'
        })) || 0;
        var itemRecordType = resultSet[0].recordType;
        var itemObj = record.load({
          type: itemRecordType,
          id: assemblyItem
        });
        var itemBasePrice = getItemBasePrice(itemObj, logTitle) || 0;
        log.debug(logTitle, 'itemBasePrice=' + itemBasePrice + ' isWithinRange=' + isWithinRange);

        if (itemBasePrice == 0 || !isWithinRange) alert('There is no active price ($0) for this item on the planned production start date.');
      }
    }

    if (recType == EFFECTIVE_SALES.TYPE) {
      var materialCost = parseFloat(recObj.getValue({ fieldId: EFFECTIVE_SALES.MAT_COST }) || 0);
      var materialHandling = parseFloat(recObj.getValue({ fieldId: EFFECTIVE_SALES.MAT_HAND }) || 0);
      var coPack = parseFloat(recObj.getValue({ fieldId: EFFECTIVE_SALES.CO_PACK }) || 0);
      var basePrice = parseFloat(recObj.getValue({ fieldId: EFFECTIVE_SALES.BASE_PRICE }) || 0);

      var costTotal = materialCost + materialHandling + coPack;
      log.debug(logTitle, 'costTotal=' + costTotal + ' basePrice=' + basePrice);

      if (costTotal.toFixed(2) != basePrice.toFixed(2)) {
        alert('The Base Price must be equal to the sum of Material Cost, Material Handling Cost, and Co-Pack Price');
        return false;
      }

      var startDate = recObj.getValue({ fieldId: EFFECTIVE_SALES.START });
      var endDate = recObj.getValue({ fieldId: EFFECTIVE_SALES.END });
      log.debug(logTitle, 'startDate=' + startDate + ' endDate=' + endDate);

      if (startDate > endDate) {
        alert('Start Date should not be greater than End Date.');
        return false;
      }

      var strStart = formatMMDDYYYY(startDate) || '';
      var strEnd = formatMMDDYYYY(endDate) || '';
      log.debug(logTitle, 'strStart=' + strStart + ' strEnd=' + strEnd);

      // CHECK FOR OVERLAP - This is not yet working so we'll comment it for now.
      var itemId = recObj.getValue({ fieldId: EFFECTIVE_SALES.ITEM }) || '';
      var currency = recObj.getValue({ fieldId: EFFECTIVE_SALES.CURRENCY }) || '';

      if (itemId && strStart && strEnd && currency) {
        var params = {
          action: 'CHECK_FOR_OVERLAP', id: '', item: itemId, start: strStart, end: strEnd, currency: currency
        };
        if (recObj.id) params.id = recObj.id;
        log.debug(logTitle, 'params=' + JSON.stringify(params));
        var hasOverlapDates = accessSuitelet(params);
        log.debug(logTitle, 'hasOverlapDates=' + hasOverlapDates);

        if (hasOverlapDates) {
          alert('Please change the Start Date and End Date as they overlap with an Effective Date Pricing (Sales) entry.');
          return false;
        }
      }
    }

    return true;
  }

  function formatMMDDYYYY(dDate) {
    if (!dDate) return '';

    var yyyy = dDate.getFullYear();
    var mm = appendZero(dDate.getMonth() + 1);
    var dd = appendZero(dDate.getDate());

    var fDate = mm + '/' + dd + '/' + yyyy;

    return fDate;
  }

  function appendZero(val) {
    var num = val;
    if (num < 10) num = '0' + num;
    return num.toString();
  }

  function getItemBasePrice(recObj, logTitle) {
    var pricingCAD = recObj.getLineCount({
      sublistId: ITEM_PRICING.CAD
    });
    var pricingUSD = recObj.getLineCount({
      sublistId: ITEM_PRICING.USD
    });
    var pricingEURO = recObj.getLineCount({
      sublistId: ITEM_PRICING.EURO
    });

    var itemBasePrice = 0;

    if (pricingCAD > -1) {
      var indexCAD = recObj.findSublistLineWithValue({
        sublistId: ITEM_PRICING.CAD,
        fieldId: 'pricelevel',
        value: 1
      });
      itemBasePrice = recObj.getSublistValue({
        sublistId: ITEM_PRICING.CAD,
        fieldId: 'price_1_',
        line: indexCAD
      }) || 0;
      log.debug(logTitle, 'CAD itemBasePrice=' + itemBasePrice);
    }

    if (pricingUSD > -1 && itemBasePrice == 0) {
      var indexUSD = recObj.findSublistLineWithValue({
        sublistId: ITEM_PRICING.USD,
        fieldId: 'pricelevel',
        value: 1
      });
      itemBasePrice = recObj.getSublistValue({
        sublistId: ITEM_PRICING.USD,
        fieldId: 'price_1_',
        line: indexUSD
      }) || 0;
      log.debug(logTitle, 'USD itemBasePrice=' + itemBasePrice);
    }

    if (pricingEURO > -1 && itemBasePrice == 0) {
      var indexEURO = recObj.findSublistLineWithValue({
        sublistId: ITEM_PRICING.EURO,
        fieldId: 'pricelevel',
        value: 1
      });
      itemBasePrice = recObj.getSublistValue({
        sublistId: ITEM_PRICING.EURO,
        fieldId: 'price_1_',
        line: indexEURO
      }) || 0;
      log.debug(logTitle, 'EURO itemBasePrice=' + itemBasePrice);
    }

    return itemBasePrice;
  }

  function accessSuitelet(PARAMS) {
    var scriptUrl = url.resolveScript({
      deploymentId: SL_EFFECTIVE_PRICING.DEP,
      scriptId: SL_EFFECTIVE_PRICING.ID,
      params: PARAMS,
      returnExternalUrl: true
    });
    var response = https.get({ url: scriptUrl });
    log.debug('accessSuitelet', response.body);
    var body = JSON.parse(response.body);

    if (body.error) {
      var errObj = body.error;
      alert(errObj.name + ': ' + errObj.message);
      return false;
    }

    return body.result;
  }

  exports.pageInit = pageInit;
  exports.fieldChanged = fieldChanged;
  exports.validateLine = validateLine;
  exports.saveRecord = saveRecord;
  return exports;
});
