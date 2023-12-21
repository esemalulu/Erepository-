/**
 * @NApiVersion 2.X
 * @NScriptType ClientScript
 * @NModuleScope SameAccount
 * @NAmdConfig /SuiteScripts/Myers-Holum/Libraries/MHI_YYF_Configurations.json
 */
define(['mapping', 'N/record', 'N/search', 'N/currentRecord', 'N/url', 'N/format'], function (mapping, record, search, current, url, format) {
  var exports = {};
  var TRAN = mapping.TRAN;
  var ITEM = mapping.ITEM;
  var SL_PURCHASE_PRICE_TABLE = mapping.SCRIPT.SL_PURCHASE_PRICE_TABLE;
  var EFFECTIVE_PURCH = mapping.CUSTOM.EFFECTIVE_PURCH;
  var event = '';
  var runValidation = false;
  var subId = 'custpage_tbl_data';
  var sublistColumnIds = [
    'custpage_tbl_vendor',
    'custpage_tbl_item',
    'custpage_tbl_currency',
    'custpage_tbl_uom',
    'custpage_tbl_qty',
    'custpage_tbl_startdate',
    'custpage_tbl_enddate',
    'custpage_tbl_cost'
  ];

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
    function displaySubmit(ID) {
      var element = document.getElementById(ID);
      if (element) element.classList.add('pgBntB');
    }
    displaySubmit('tr_custpage_btn_new');
    displaySubmit('tr_secondarycustpage_btn_new');

    var recObj = context.currentRecord;
    var today = new Date();
    var count = recObj.getLineCount({
      sublistId: subId
    });
    for (var i = 0; i < count; i += 1) {
      var lineEnd = recObj.getSublistValue({
        sublistId: subId,
        fieldId: 'custpage_tbl_enddate',
        line: i
      });
      console.log(lineEnd);

      if (lineEnd && today > lineEnd) {
        var colMark = recObj.getSublistField({ sublistId: subId, fieldId: 'custpage_tbl_mark', line: i });
        var colCurr = recObj.getSublistField({ sublistId: subId, fieldId: 'custpage_tbl_currency', line: i });
        var colUom = recObj.getSublistField({ sublistId: subId, fieldId: 'custpage_tbl_uom', line: i });
        var colQty = recObj.getSublistField({ sublistId: subId, fieldId: 'custpage_tbl_qty', line: i });
        var colStart = recObj.getSublistField({ sublistId: subId, fieldId: 'custpage_tbl_startdate', line: i });
        var colEnd = recObj.getSublistField({ sublistId: subId, fieldId: 'custpage_tbl_enddate', line: i });
        var colCost = recObj.getSublistField({ sublistId: subId, fieldId: 'custpage_tbl_cost', line: i });
        colMark.isDisabled = true;
        colCurr.isDisabled = true;
        colUom.isDisabled = true;
        colQty.isDisabled = true;
        colStart.isDisabled = true;
        colEnd.isDisabled = true;
        colCost.isDisabled = true;
      }
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
    var sublistId = context.sublistId;
    var fieldId = context.fieldId;
    var logTitle = 'fieldChanged_';

    if (fieldId == 'custpage_vendor' || fieldId == 'custpage_item' || fieldId == 'custpage_startdate' || fieldId == 'custpage_pageid') {
      var vendorId = recObj.getValue({ fieldId: 'custpage_vendor' });
      var itemId = recObj.getValue({ fieldId: 'custpage_item' });
      var startDate = recObj.getValue({ fieldId: 'custpage_startdate' });
      var pageId = recObj.getValue({ fieldId: 'custpage_pageid' });

      if (startDate) {
        startDate = format.format({
          value: startDate,
          type: format.Type.DATE
        });
      }

      var params = {};
      if (vendorId) params.custpage_vendor = vendorId;
      if (itemId) params.custpage_item = itemId;
      if (startDate) params.custpage_startdate = startDate;
      if (pageId) params.custpage_pageid = pageId;

      console.log(logTitle, 'params=' + JSON.stringify(params));
      loadSuitelet(params, '_self');
    }

    if (sublistId == subId && sublistColumnIds.indexOf(fieldId) > -1) {
      var lineCurrency = recObj.getCurrentSublistValue({
        sublistId: subId,
        fieldId: 'custpage_tbl_currency'
      }) || '';
      var lineUom = recObj.getCurrentSublistValue({
        sublistId: subId,
        fieldId: 'custpage_tbl_uom'
      }) || '';
      var lineTierQty = parseFloat(recObj.getCurrentSublistValue({
        sublistId: subId,
        fieldId: 'custpage_tbl_qty'
      }) || 0);
      var lineStart = recObj.getCurrentSublistValue({
        sublistId: subId,
        fieldId: 'custpage_tbl_startdate'
      }) || '';
      var lineEnd = recObj.getCurrentSublistValue({
        sublistId: subId,
        fieldId: 'custpage_tbl_enddate'
      }) || '';
      var lineCost = parseFloat(recObj.getCurrentSublistValue({
        sublistId: subId,
        fieldId: 'custpage_tbl_cost'
      }) || 0);
      var logObj = {
        lineCurrency: lineCurrency,
        lineUom: lineUom,
        lineTierQty: lineTierQty,
        lineStart: lineStart,
        lineEnd: lineEnd,
        lineCost: lineCost
      };
      var lineJson = JSON.parse(recObj.getCurrentSublistValue({
        sublistId: subId,
        fieldId: 'custpage_tbl_json'
      }) || '{}');
      console.log(logTitle, 'lineJson=' + JSON.stringify(lineJson));
      console.log(logTitle, 'logObj=' + JSON.stringify(logObj));

      if (!lineCurrency || !lineUom || !lineTierQty || !lineStart || !lineCost) {
        alert('Please enter a valid value.');

        if (!lineCurrency) {
          recObj.setCurrentSublistValue({
            sublistId: subId,
            fieldId: 'custpage_tbl_currency',
            value: lineJson.curr,
            ignoreFieldChange: true
          });
        }

        if (!lineUom) {
          recObj.setCurrentSublistValue({
            sublistId: subId,
            fieldId: 'custpage_tbl_uom',
            value: lineJson.uom,
            ignoreFieldChange: true
          });
        }

        if (!lineTierQty) {
          recObj.setCurrentSublistValue({
            sublistId: subId,
            fieldId: 'custpage_tbl_qty',
            value: lineJson.qty,
            ignoreFieldChange: true
          });
        }

        if (!lineStart) {
          recObj.setCurrentSublistText({
            sublistId: subId,
            fieldId: 'custpage_tbl_startdate',
            text: lineJson.start,
            ignoreFieldChange: true
          });
        }

        if (!lineCost) {
          recObj.setCurrentSublistText({
            sublistId: subId,
            fieldId: 'custpage_tbl_cost',
            text: lineJson.cost,
            ignoreFieldChange: true
          });
        }
        return;
      }

      console.log(logTitle, 'lineStart=' + lineStart + ' lineEnd=' + lineEnd);

      if (lineEnd && lineStart > lineEnd) {
        alert('Start Date should not be greater than End Date.');
        recObj.setCurrentSublistText({
          sublistId: subId,
          fieldId: 'custpage_tbl_startdate',
          text: lineJson.start,
          ignoreFieldChange: true
        });
        recObj.setCurrentSublistText({
          sublistId: subId,
          fieldId: 'custpage_tbl_enddate',
          text: lineJson.end,
          ignoreFieldChange: true
        });
        return;
      }

      var lineIndex = recObj.getCurrentSublistIndex({ sublistId: subId });
      var lineCount = recObj.getLineCount({ sublistId: subId });
      console.log('lineCount=' + lineCount + ' lineIndex=' + lineIndex);

      var hasOverlapDates = false;
      for (var i = 0; i < lineCount; i += 1) {
        if (i != lineIndex) {
          var referenceCurrency = recObj.getSublistValue({
            sublistId: subId,
            fieldId: 'custpage_tbl_currency',
            line: i
          }) || '';
          var referenceUom = recObj.getSublistValue({
            sublistId: subId,
            fieldId: 'custpage_tbl_uom',
            line: i
          }) || '';
          var referenceTierQty = parseFloat(recObj.getSublistValue({
            sublistId: subId,
            fieldId: 'custpage_tbl_qty',
            line: i
          }) || 0);
          var referenceStart = recObj.getSublistValue({
            sublistId: subId,
            fieldId: 'custpage_tbl_startdate',
            line: i
          }) || '';
          var referenceEnd = recObj.getSublistValue({
            sublistId: subId,
            fieldId: 'custpage_tbl_enddate',
            line: i
          }) || '';

          if (lineCurrency == referenceCurrency && lineUom == referenceUom && lineTierQty == referenceTierQty) {
            if (!lineEnd) {
              if (referenceEnd && referenceStart <= lineStart && lineStart <= referenceEnd) hasOverlapDates = true;
              else if (referenceEnd && lineStart <= referenceStart) hasOverlapDates = true;
              else if (!referenceEnd) hasOverlapDates = true;
            } else {
              if (referenceEnd && lineStart <= referenceStart && referenceStart <= lineEnd) hasOverlapDates = true;
              else if (referenceEnd && lineStart <= referenceEnd && referenceEnd <= lineEnd) hasOverlapDates = true;
              else if (referenceEnd && referenceStart <= lineStart && lineEnd <= referenceEnd) hasOverlapDates = true;
              else if (referenceEnd && lineStart <= referenceStart && referenceEnd <= lineEnd) hasOverlapDates = true;
              else if (!referenceEnd && referenceStart <= lineStart) hasOverlapDates = true;
              else if (!referenceEnd && referenceStart <= lineEnd) hasOverlapDates = true;
            }
          }

          if (hasOverlapDates) {
            alert('Please change the Start Date and/or End Date as they overlap with an Effective Date Pricing (Purchase) entry. Line=' + (i + 1));
            if (fieldId == 'custpage_tbl_qty') {
              recObj.setCurrentSublistText({
                sublistId: subId,
                fieldId: 'custpage_tbl_qty',
                text: lineJson.qty,
                ignoreFieldChange: false
              });
            }

            if (fieldId == 'custpage_tbl_startdate') {
              recObj.setCurrentSublistText({
                sublistId: subId,
                fieldId: 'custpage_tbl_startdate',
                text: lineJson.start,
                ignoreFieldChange: false
              });
            }

            if (fieldId == 'custpage_tbl_enddate') {
              recObj.setCurrentSublistText({
                sublistId: subId,
                fieldId: 'custpage_tbl_enddate',
                text: lineJson.end,
                ignoreFieldChange: false
              });
            }

            return;
          }
        }
      }

      recObj.setCurrentSublistValue({
        sublistId: subId,
        fieldId: 'custpage_tbl_mark',
        value: true
      });
    }
  }

  /**
     * Validation function to be executed when field is changed.
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
     * @return {Boolean} <code>true</code> if field value is valid;
     *         <code>false</code> otherwise
     *
     * @since 2015.2
     *
     * @static
     * @function validateField
     */
  function validateField(context) {
    var recObj = context.currentRecord;
    var sublistId = context.sublistId;
    var fieldId = context.fieldId;
    var logTitle = 'validateField_';

    if (sublistId == subId && sublistColumnIds.indexOf(fieldId) > -1) {
      var lineVendor = recObj.getCurrentSublistValue({
        sublistId: subId,
        fieldId: 'custpage_tbl_vendor'
      }) || '';
      var lineItem = recObj.getCurrentSublistValue({
        sublistId: subId,
        fieldId: 'custpage_tbl_item'
      }) || '';
      var lineCurrency = recObj.getCurrentSublistValue({
        sublistId: subId,
        fieldId: 'custpage_tbl_currency'
      }) || '';
      var lineUom = recObj.getCurrentSublistValue({
        sublistId: subId,
        fieldId: 'custpage_tbl_uom'
      }) || '';
      var lineTierQty = parseFloat(recObj.getCurrentSublistValue({
        sublistId: subId,
        fieldId: 'custpage_tbl_qty'
      }) || 0);
      var lineStart = recObj.getCurrentSublistValue({
        sublistId: subId,
        fieldId: 'custpage_tbl_startdate'
      }) || '';
      var lineEnd = recObj.getCurrentSublistValue({
        sublistId: subId,
        fieldId: 'custpage_tbl_enddate'
      }) || '';
      var lineCost = parseFloat(recObj.getCurrentSublistValue({
        sublistId: subId,
        fieldId: 'custpage_tbl_cost'
      }) || 0);
      var logObj = {
        lineVendor: lineVendor,
        lineItem: lineItem,
        lineCurrency: lineCurrency,
        lineUom: lineUom,
        lineTierQty: lineTierQty,
        lineStart: lineStart,
        lineEnd: lineEnd,
        lineCost: lineCost
      };
      console.log(logTitle, 'logObj=' + JSON.stringify(logObj));

      if (!lineVendor || !lineItem || !lineCurrency || !lineUom || !lineTierQty || !lineStart || !lineCost) {
        alert('Please enter a valid value.');
        return false;
      }

      var lineJson = JSON.parse(recObj.getCurrentSublistValue({
        sublistId: subId,
        fieldId: 'custpage_tbl_json'
      }) || '{}');
      console.log(logTitle, 'lineJson=' + JSON.stringify(lineJson));
      console.log(logTitle, 'lineStart=' + lineStart + ' lineEnd=' + lineEnd);

      if (lineEnd && lineStart > lineEnd) {
        alert('Start Date should not be greater than End Date.');
        recObj.setCurrentSublistText({
          sublistId: subId,
          fieldId: 'custpage_tbl_startdate',
          text: lineJson.start,
          ignoreFieldChange: true
        });
        recObj.setCurrentSublistText({
          sublistId: subId,
          fieldId: 'custpage_tbl_enddate',
          text: lineJson.end,
          ignoreFieldChange: true
        });
        return true;
      }

      var lineIndex = recObj.getCurrentSublistIndex({ sublistId: subId });
      var lineCount = recObj.getLineCount({ sublistId: subId });
      log.debug(logTitle, 'lineCount=' + lineCount + ' lineIndex=' + lineIndex);
      alert('lineCount=' + lineCount + ' lineIndex=' + lineIndex);

      recObj.setCurrentSublistValue({
        sublistId: subId,
        fieldId: 'custpage_tbl_mark',
        value: true
      });

      // var hasOverlapDates = false;
      // if (lineCount == lineIndex) lineCount += 1; // This is a new line, not yet counted
      // for (var i = 0; i < lineCount; i += 1) {
      //   if (i != lineIndex) {
      //     var referenceVendor = recObj.getSublistValue({
      //       sublistId: subId,
      //       fieldId: EFFECTIVE_PURCH.VENDOR,
      //       line: i
      //     }) || '';
      //     var referenceCurrency = recObj.getSublistValue({
      //       sublistId: subId,
      //       fieldId: EFFECTIVE_PURCH.CURRENCY,
      //       line: i
      //     }) || '';
      //     var referenceUom = recObj.getSublistValue({
      //       sublistId: subId,
      //       fieldId: EFFECTIVE_PURCH.UOM,
      //       line: i
      //     }) || '';
      //     var referenceTierQty = parseFloat(recObj.getSublistValue({
      //       sublistId: subId,
      //       fieldId: EFFECTIVE_PURCH.TIER_QTY,
      //       line: i
      //     }) || 0);
      //     var referenceStart = recObj.getSublistValue({
      //       sublistId: subId,
      //       fieldId: EFFECTIVE_PURCH.START,
      //       line: i
      //     }) || '';
      //     var referenceEnd = recObj.getSublistValue({
      //       sublistId: subId,
      //       fieldId: EFFECTIVE_PURCH.END,
      //       line: i
      //     }) || '';

      //     if (lineVendor == referenceVendor && lineCurrency == referenceCurrency && lineUom == referenceUom && lineTierQty == referenceTierQty) {
      //       if (!lineEnd) {
      //         if (referenceEnd && referenceStart <= lineStart && lineStart <= referenceEnd) hasOverlapDates = true;
      //       } else {
      //         if (referenceEnd && lineStart <= referenceStart && referenceStart <= lineEnd) hasOverlapDates = true;
      //         else if (referenceEnd && lineStart <= referenceEnd && referenceEnd <= lineEnd) hasOverlapDates = true;
      //         else if (referenceEnd && referenceStart <= lineStart && lineEnd <= referenceEnd) hasOverlapDates = true;
      //         else if (referenceEnd && lineStart <= referenceStart && referenceEnd <= lineEnd) hasOverlapDates = true;
      //         else if (!referenceEnd && referenceStart <= lineStart) hasOverlapDates = true;
      //         else if (!referenceEnd && referenceStart <= lineEnd) hasOverlapDates = true;
      //       }
      //     }

      //     if (hasOverlapDates) {
      //       alert('Please change the Start Date and/or End Date as they overlap with an Effective Date Pricing (Purchase) entry. Index=' + i);
      //       return false;
      //     }
      //   }
      // }

      return true;
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

    var lineCount = recObj.getLineCount({
      sublistId: subId
    });
    var markedLine = recObj.findSublistLineWithValue({
      sublistId: subId,
      fieldId: 'custpage_tbl_mark',
      value: 'T'
    });
    console.log('lineCount=' + lineCount + ' markedLine=' + markedLine);

    if (lineCount == 0) {
      alert('No available lines.');
      return false;
    }

    if (markedLine == -1) {
      alert('Please select a line to update.');
      return false;
    }

    return true;
  }

  function runFilters() {
    var recObj = current.get();
    var params = {};

    var vendorId = recObj.getValue({ fieldId: 'custpage_vendor' });
    var itemId = recObj.getValue({ fieldId: 'custpage_item' });
    var startDate = recObj.getValue({ fieldId: 'custpage_startdate' });
    var pageId = recObj.getValue({ fieldId: 'custpage_pageid' });

    if (startDate) {
      startDate = format.format({
        value: startDate,
        type: format.Type.DATE
      });
    }

    if (vendorId) params.custpage_vendor = vendorId;
    if (itemId) params.custpage_item = itemId;
    if (startDate) params.custpage_startdate = startDate;
    if (pageId) params.custpage_pageid = pageId;

    console.log('runFilters', 'params=' + JSON.stringify(params));

    loadSuitelet(params, '_self');
  }

  // This loads a frontend suitelet
  function loadSuitelet(params, display, size) {
    var scriptUrl = url.resolveScript({
      scriptId: SL_PURCHASE_PRICE_TABLE.ID,
      deploymentId: SL_PURCHASE_PRICE_TABLE.DEP,
      params: params
    });
    window.onbeforeunload = null;
    window.open(scriptUrl, display, size);
  }

  function newPrice() {
    var recordUrl = url.resolveRecord({
      isEditMode: true,
      recordType: EFFECTIVE_PURCH.TYPE
    });
    window.onbeforeunload = null;
    window.open(recordUrl, '_blank');
  }

  exports.pageInit = pageInit;
  exports.fieldChanged = fieldChanged;
  //   exports.validateField = validateField;
  exports.saveRecord = saveRecord;
  exports.runFilters = runFilters;
  exports.loadSuitelet = loadSuitelet;
  exports.newPrice = newPrice;
  return exports;
});
