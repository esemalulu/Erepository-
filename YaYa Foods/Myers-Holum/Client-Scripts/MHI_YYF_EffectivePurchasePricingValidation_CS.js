/* eslint-disable no-redeclare */
/* eslint-disable block-scoped-var */
/**
 * @NApiVersion 2.X
 * @NScriptType ClientScript
 * @NModuleScope SameAccount
 * @NAmdConfig /SuiteScripts/Myers-Holum/Libraries/MHI_YYF_Configurations.json
 */
define(['mapping', 'N/record', 'N/search', 'N/format', 'N/url', 'N/https', 'N/ui/dialog'], function (mapping, record, search, format, url, https, dialog) {
  var exports = {};
  var TRAN = mapping.TRAN;
  var ITEM = mapping.ITEM;
  var SL_EFFECTIVE_PURCHASE = mapping.SCRIPT.SL_EFFECTIVE_PURCHASE;
  var EFFECTIVE_PURCH = mapping.CUSTOM.EFFECTIVE_PURCH;
  var event = '';
  var runValidation = false;

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

    if (recType == 'purchaseorder') {
      var orderStatus = recObj.getValue({
        fieldId: 'orderstatus'
      });

      if (event == 'create' || event == 'copy' // New Orders
        || orderStatus == 'A' // Pending Approval
        || orderStatus == 'B' // Pending Receipt
        || orderStatus == 'E' // Pending Billing/Partially Received
      ) {
        runValidation = true;
      }
    }

    if (recType == EFFECTIVE_PURCH.TYPE) {
      if (event != 'edit') return;
      var endDate = recObj.getValue({ fieldId: EFFECTIVE_PURCH.END }) || '';
      var today = new Date();
      var proceedToDisable = !!(endDate && today > endDate);

      if (proceedToDisable) {
        var fldVendor = recObj.getField({ fieldId: EFFECTIVE_PURCH.VENDOR });
        var fldItem = recObj.getField({ fieldId: EFFECTIVE_PURCH.ITEM });
        var fldCurr = recObj.getField({ fieldId: EFFECTIVE_PURCH.CURRENCY });
        var fldUom = recObj.getField({ fieldId: EFFECTIVE_PURCH.UOM });
        var fldQty = recObj.getField({ fieldId: EFFECTIVE_PURCH.TIER_QTY });
        var fldStart = recObj.getField({ fieldId: EFFECTIVE_PURCH.START });
        var fldEnd = recObj.getField({ fieldId: EFFECTIVE_PURCH.END });
        var fldCost = recObj.getField({ fieldId: EFFECTIVE_PURCH.UNIT_COST });
        fldVendor.isDisabled = proceedToDisable;
        fldItem.isDisabled = proceedToDisable;
        fldCurr.isDisabled = proceedToDisable;
        fldUom.isDisabled = proceedToDisable;
        fldQty.isDisabled = proceedToDisable;
        fldStart.isDisabled = proceedToDisable;
        fldEnd.isDisabled = proceedToDisable;
        fldCost.isDisabled = proceedToDisable;
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
    var recType = recObj.type;
    var sublistId = context.sublistId;
    var fieldId = context.fieldId;
    var logTitle = 'fieldChanged_' + recType;

    if (recObj.id) logTitle += '_' + recObj.id;

    if (recType == 'purchaseorder' && runValidation) {
      if (sublistId == 'item') {
        if (fieldId == TRAN.IS_MANUAL || fieldId == TRAN.PURCHASE_PRICE) {
          var isPriceManual = recObj.getCurrentSublistValue({
            sublistId: 'item',
            fieldId: TRAN.IS_MANUAL
          });
          var isPriceSourced = recObj.getCurrentSublistValue({
            sublistId: 'item',
            fieldId: TRAN.PURCHASE_PRICE
          });
          var lineReceivedQty = parseFloat(recObj.getCurrentSublistValue({
            sublistId: 'item',
            fieldId: 'quantityreceived'
          }) || 0);
          log.debug(logTitle, 'isPriceManual=' + isPriceManual + ' isPriceSourced=' + isPriceSourced + ' lineReceivedQty=' + lineReceivedQty);

          var isLineSpares = recObj.getCurrentSublistValue({
            sublistId: 'item',
            fieldId: TRAN.IS_SPARES_ITEM
          }) || false;
          if (isLineSpares) return; // Spares Item should be excluded

          var isCustomerOwned = recObj.getCurrentSublistValue({
            sublistId: 'item',
            fieldId: TRAN.CUSTOMER_OWNED
          }) || '';
          if (isCustomerOwned == 2) return; // Customer Owned Item should be excluded

          var itemType = recObj.getCurrentSublistValue({
            sublistId: 'item',
            fieldId: 'itemtype'
          }).toUpperCase() || '';
          if (itemType == 'SERVICE') return; // GL Based Items should be excluded

          if (isPriceManual && !lineReceivedQty) {
            recObj.setCurrentSublistValue({
              sublistId: 'item',
              fieldId: TRAN.PURCHASE_PRICE,
              value: '',
              ignoreFieldChange: true
            });
            recObj.setCurrentSublistValue({
              sublistId: 'item',
              fieldId: TRAN.PURCHASE_PRICE_COST,
              value: '',
              ignoreFieldChange: true
            });
          }
        }

        if (fieldId == 'rate') {
          var isLineSpares = recObj.getCurrentSublistValue({
            sublistId: 'item',
            fieldId: TRAN.IS_SPARES_ITEM
          }) || false;
          if (isLineSpares) return; // Spares Item should be excluded

          var isCustomerOwned = recObj.getCurrentSublistValue({
            sublistId: 'item',
            fieldId: TRAN.CUSTOMER_OWNED
          }) || '';
          if (isCustomerOwned == 2) return; // Customer Owned Item should be excluded

          var itemType = recObj.getCurrentSublistValue({
            sublistId: 'item',
            fieldId: 'itemtype'
          }).toUpperCase() || '';
          if (itemType == 'SERVICE') return; // GL Based Items should be excluded

          var isPriceManual = recObj.getCurrentSublistValue({
            sublistId: 'item',
            fieldId: TRAN.IS_MANUAL
          });
          var isPriceSourced = recObj.getCurrentSublistValue({
            sublistId: 'item',
            fieldId: TRAN.PURCHASE_PRICE
          });
          var lineRate = recObj.getCurrentSublistValue({
            sublistId: 'item',
            fieldId: 'rate'
          });
          var linePurchCost = recObj.getCurrentSublistValue({
            sublistId: 'item',
            fieldId: TRAN.PURCHASE_PRICE_COST
          });
          var lineReceivedQty = parseFloat(recObj.getCurrentSublistValue({
            sublistId: 'item',
            fieldId: 'quantityreceived'
          }) || 0);
          log.debug(logTitle, 'isPriceManual=' + isPriceManual + ' isPriceSourced=' + isPriceSourced + ' lineRate=' + lineRate + ' lineReceivedQty=' + lineReceivedQty);

          if (isPriceSourced && !isPriceManual && lineRate != linePurchCost && !lineReceivedQty) {
            alert('This rate is sourced from the Purchase Price. It cannot be changed unless you mark the Manual checkbox.');
            recObj.setCurrentSublistValue({
              sublistId: 'item',
              fieldId: 'rate',
              value: linePurchCost,
              ignoreFieldChange: true
            });
          }
        }
      }

      if (fieldId == 'entity' || fieldId == 'currency' || fieldId == 'trandate') {
        var vendorId = recObj.getValue({
          fieldId: 'entity'
        });
        var currencyId = recObj.getValue({
          fieldId: 'currency'
        });
        var fDate = recObj.getValue({
          fieldId: 'trandate'
        });

        // LOGIC SAME IN SAVERECORD
        if (vendorId && currencyId && fDate) {
          var strDate = fDate.getFullYear() + '-' + appendZero(fDate.getMonth() + 1) + '-' + appendZero(fDate.getDate());

          var count = recObj.getLineCount({
            sublistId: 'item'
          });

          // GET ALL ITEMS
          var arrItems = [];
          var objItems = {};
          for (var i = 0; i < count; i += 1) {
            var isManual = recObj.getSublistValue({
              sublistId: 'item',
              fieldId: TRAN.IS_MANUAL,
              line: i
            }) || false;
            var lineRate = parseFloat(recObj.getSublistValue({
              sublistId: 'item',
              fieldId: 'rate',
              line: i
            }) || 0);
            var lineReceivedQty = parseFloat(recObj.getSublistValue({
              sublistId: 'item',
              fieldId: 'quantityreceived',
              line: i
            }) || 0);

            var isLineSpares = recObj.getSublistValue({
              sublistId: 'item',
              fieldId: TRAN.IS_SPARES_ITEM,
              line: i
            }) || false;
            if (isLineSpares) continue; // Spares Item should be excluded

            var isCustomerOwned = recObj.getSublistValue({
              sublistId: 'item',
              fieldId: TRAN.CUSTOMER_OWNED,
              line: i
            }) || '';
            if (isCustomerOwned == 2) continue; // Customer Owned Item should be excluded

            var itemType = recObj.getSublistValue({
              sublistId: 'item',
              fieldId: 'itemtype',
              line: i
            }).toUpperCase() || '';
            if (itemType == 'SERVICE') continue; // GL Based Items should be excluded

            if ((!isManual || !lineRate) && !lineReceivedQty) {
              var lineItem = recObj.getSublistValue({
                sublistId: 'item',
                fieldId: 'item',
                line: i
              });
              var lineUnit = recObj.getSublistValue({
                sublistId: 'item',
                fieldId: 'units',
                line: i
              });
              var lineQty = parseFloat(recObj.getSublistValue({
                sublistId: 'item',
                fieldId: 'quantity',
                line: i
              }) || 0);

              if (arrItems.indexOf(lineItem) == -1) arrItems.push(lineItem);
              if (!objItems[lineItem]) objItems[lineItem] = {};
              if (!objItems[lineItem][lineUnit]) objItems[lineItem][lineUnit] = 0;

              objItems[lineItem][lineUnit] += lineQty;
            }
          }

          log.debug(logTitle, 'objItems=' + JSON.stringify(objItems));
          log.debug(logTitle, 'arrItems=' + JSON.stringify(arrItems));

          if (arrItems.length == 0) return;

          // GET VALID ITEMS AND ITEMS WITHIN DATE RANGE
          var assessList = JSON.parse(accessSuitelet({
            action: 'ASSESS_LIST',
            list: JSON.stringify(objItems),
            vendor: vendorId,
            currency: currencyId,
            date: strDate
          })) || {};
          log.debug(logTitle, 'assessList=' + JSON.stringify(assessList));

          for (var i = 0; i < count; i += 1) {
            var isManual = recObj.getSublistValue({
              sublistId: 'item',
              fieldId: TRAN.IS_MANUAL,
              line: i
            }) || false;
            var lineRate = parseFloat(recObj.getSublistValue({
              sublistId: 'item',
              fieldId: 'rate',
              line: i
            }) || 0);
            var lineReceivedQty = parseFloat(recObj.getSublistValue({
              sublistId: 'item',
              fieldId: 'quantityreceived',
              line: i
            }) || 0);
            log.debug(i, 'isManual=' + isManual + ' lineRate=' + lineRate + ' lineReceivedQty=' + lineReceivedQty);

            var isLineSpares = recObj.getSublistValue({
              sublistId: 'item',
              fieldId: TRAN.IS_SPARES_ITEM,
              line: i
            }) || false;
            if (isLineSpares) continue; // Spares Item should be excluded

            var isCustomerOwned = recObj.getSublistValue({
              sublistId: 'item',
              fieldId: TRAN.CUSTOMER_OWNED,
              line: i
            }) || '';
            if (isCustomerOwned == 2) continue; // Customer Owned Item should be excluded

            var itemType = recObj.getSublistValue({
              sublistId: 'item',
              fieldId: 'itemtype',
              line: i
            }).toUpperCase() || '';
            if (itemType == 'SERVICE') continue; // GL Based Items should be excluded

            if ((!isManual || !lineRate) && !lineReceivedQty) {
              var lineItem = recObj.getSublistValue({
                sublistId: 'item',
                fieldId: 'item',
                line: i
              });
              var lineUnit = recObj.getSublistValue({
                sublistId: 'item',
                fieldId: 'units',
                line: i
              });
              var lineQty = parseFloat(recObj.getSublistValue({
                sublistId: 'item',
                fieldId: 'quantity',
                line: i
              }) || 0);
              log.debug(i, 'lineItem=' + lineItem + ' lineUnit=' + lineUnit);
              log.debug(i, 'isManual=' + JSON.stringify(assessList[lineItem]));

              if (assessList[lineItem] && assessList[lineItem][lineUnit]) {
                triggerOnSave = true;
                recObj.selectLine({
                  sublistId: 'item',
                  line: i
                });
                recObj.setCurrentSublistValue({
                  sublistId: 'item',
                  fieldId: 'rate',
                  value: assessList[lineItem][lineUnit].cost,
                  ignoreFieldChange: true
                });
                recObj.setCurrentSublistValue({
                  sublistId: 'item',
                  fieldId: TRAN.PURCHASE_PRICE,
                  value: assessList[lineItem][lineUnit].ref,
                  ignoreFieldChange: true
                });
                recObj.setCurrentSublistValue({
                  sublistId: 'item',
                  fieldId: TRAN.PURCHASE_PRICE_COST,
                  value: assessList[lineItem][lineUnit].cost,
                  ignoreFieldChange: true
                });
                recObj.setCurrentSublistValue({
                  sublistId: 'item',
                  fieldId: TRAN.IS_MANUAL,
                  value: false,
                  ignoreFieldChange: true
                });
                recObj.commitLine({
                  sublistId: 'item'
                });
                triggerOnSave = false;
              } else {
                var dialogMessage = 'There is no Purchase Price match found.';
                dialogMessage += '\n\n<br/><br/>To proceed, press OK, then check the Manual checkbox and enter the line Rate manually.';
                dialogMessage += '\n\n<br/><br/>Otherwise, please go back to the Purchase Price table and fulfill the tables.';

                dialog.confirm({
                  title: 'Purchase Price - Line ' + (i + 1),
                  message: dialogMessage
                }).then(function(result) {
                  console.log('Success with value ' + result);
                }).catch(function (reason) {
                  console.log('Failure: ' + reason);
                });

                if (!lineRate) return; // For empty rate lines
              }
            }
          }
        }
      }
    }
  }

  /**
     * Function to be executed after line is selected.
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
     * @return {void}
     *
     * @since 2015.2
     *
     * @static
     * @function lineInit
     */
  function lineInit(context) {
    var recObj = context.currentRecord;
    var recType = recObj.type;
    var sublistId = context.sublistId;

    if (recType == 'assemblyitem' || recType == 'inventoryitem') {
      // Disable the Child sublist on the Item record
      var subPurchPrice = 'recmach' + EFFECTIVE_PURCH.ITEM;

      if (sublistId != subPurchPrice) return;

      var currentCount = recObj.getLineCount({ sublistId: subPurchPrice });
      var lineEnd = recObj.getCurrentSublistValue({
        sublistId: subPurchPrice,
        fieldId: EFFECTIVE_PURCH.END
      }) || '';

      var today = new Date();
      var proceedToDisable = !!((lineEnd && today > lineEnd));
      var lineIndex = recObj.getCurrentSublistIndex({ sublistId: subPurchPrice });

      if (currentCount == 0) return;
      if (lineIndex == currentCount) {
        proceedToDisable = false;
        lineIndex -= 1;
      }

      var colVendor = recObj.getSublistField({ sublistId: subPurchPrice, fieldId: EFFECTIVE_PURCH.VENDOR, line: lineIndex });
      var colCurr = recObj.getSublistField({ sublistId: subPurchPrice, fieldId: EFFECTIVE_PURCH.CURRENCY, line: lineIndex });
      var colUom = recObj.getSublistField({ sublistId: subPurchPrice, fieldId: EFFECTIVE_PURCH.UOM, line: lineIndex });
      var colQty = recObj.getSublistField({ sublistId: subPurchPrice, fieldId: EFFECTIVE_PURCH.TIER_QTY, line: lineIndex });
      var colStart = recObj.getSublistField({ sublistId: subPurchPrice, fieldId: EFFECTIVE_PURCH.START, line: lineIndex });
      var colEnd = recObj.getSublistField({ sublistId: subPurchPrice, fieldId: EFFECTIVE_PURCH.END, line: lineIndex });
      var colCost = recObj.getSublistField({ sublistId: subPurchPrice, fieldId: EFFECTIVE_PURCH.UNIT_COST, line: lineIndex });

      colVendor.isDisabled = proceedToDisable;
      colCurr.isDisabled = proceedToDisable;
      colUom.isDisabled = proceedToDisable;
      colQty.isDisabled = proceedToDisable;
      colStart.isDisabled = proceedToDisable;
      colEnd.isDisabled = proceedToDisable;
      colCost.isDisabled = proceedToDisable;
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

    if (recType == 'purchaseorder' && runValidation) {
      if (sublistId == 'item' && !triggerOnSave) {
        var vendorId = recObj.getValue({ fieldId: 'entity' });
        var currencyId = recObj.getValue({ fieldId: 'currency' });
        var fDate = recObj.getValue({ fieldId: 'trandate' });
        var strDate = fDate.getFullYear() + '-' + appendZero(fDate.getMonth() + 1) + '-' + appendZero(fDate.getDate());

        log.debug(logTitle, fDate + ' - ' + strDate);
        var lineItem = recObj.getCurrentSublistValue({
          sublistId: 'item',
          fieldId: 'item'
        }) || '';
        var lineUnit = recObj.getCurrentSublistValue({
          sublistId: 'item',
          fieldId: 'units'
        }) || '';
        var lineQty = parseFloat(recObj.getCurrentSublistValue({
          sublistId: 'item',
          fieldId: 'quantity'
        }) || 0);
        var lineReceivedQty = parseFloat(recObj.getCurrentSublistValue({
          sublistId: 'item',
          fieldId: 'quantityreceived'
        }) || 0);

        if (!lineItem) return true; // Run native validation for empty item

        var isLineSpares = recObj.getCurrentSublistValue({
          sublistId: 'item',
          fieldId: TRAN.IS_SPARES_ITEM
        }) || false;
        if (isLineSpares) return true; // Spares Item should be excluded

        var isCustomerOwned = recObj.getCurrentSublistValue({
          sublistId: 'item',
          fieldId: TRAN.CUSTOMER_OWNED
        }) || '';
        if (isCustomerOwned == 2) return true; // Customer Owned Item should be excluded

        var itemType = recObj.getCurrentSublistValue({
          sublistId: 'item',
          fieldId: 'itemtype'
        }).toUpperCase() || '';
        if (itemType == 'SERVICE') return true; // GL Based Items should be excluded

        // Validate if the item is only entered once
        var count = recObj.getLineCount({ sublistId: 'item' });
        var lineIndex = recObj.getCurrentSublistIndex({ sublistId: 'item' });
        for (var i = 0; i < count; i += 1) {
          log.debug(logTitle, 'Loop - ' + i);
          if (i != lineIndex) {
            var lineItemReference = recObj.getSublistValue({
              sublistId: 'item',
              fieldId: 'item',
              line: i
            }) || '';
            var lineUnitReference = recObj.getSublistValue({
              sublistId: 'item',
              fieldId: 'units',
              line: i
            }) || '';

            if (lineItem == lineItemReference && lineUnit == lineUnitReference) {
              alert('The item has already been entered on line ' + (i + 1) + '. You can not enter the same item on a different line.');
              return false;
            }
          }
        }

        if (!lineReceivedQty) {
          var logObj = {
            vendorId: vendorId,
            currencyId: currencyId,
            strDate: strDate,
            lineItem: lineItem,
            lineUnit: lineUnit
          };
          log.debug(logTitle, logObj);
          var assessLine = JSON.parse(accessSuitelet({
            action: 'ASSESS_LINE',
            item: lineItem,
            vendor: vendorId,
            currency: currencyId,
            date: strDate,
            uom: lineUnit,
            qty: lineQty
          })) || {};
          log.debug(logTitle, 'lineItem=' + lineItem + ' assessLine=' + JSON.stringify(assessLine));

          var isManual = recObj.getCurrentSublistValue({
            sublistId: 'item',
            fieldId: TRAN.IS_MANUAL
          });
          var lineRate = recObj.getCurrentSublistValue({
            sublistId: 'item',
            fieldId: 'rate'
          });
          log.debug(logTitle, 'isManual=' + isManual + ' lineRate=' + lineRate);

          if (!assessLine.ref && !isManual) {
            recObj.setCurrentSublistValue({
              sublistId: 'item',
              fieldId: 'rate',
              value: 0,
              ignoreFieldChange: true
            });

            var dialogMessage = 'There is no Purchase Price match found.';
            dialogMessage += '\n\n<br/><br/>To proceed, press OK, then check the Manual checkbox and enter the line Rate manually.';
            dialogMessage += '\n\n<br/><br/>Otherwise, please go back to the Purchase Price table and fulfill the tables.';

            if (assessLine.hasOtherRef) {
              dialogMessage = 'This is below the Minimum Order Quantity.';
              dialogMessage += '\n\n<br/><br/>To proceed, press OK, then check the Manual checkbox and enter the line Rate manually.';
              dialogMessage += '\n\n<br/><br/>Otherwise, please enter a quantity above the Minimum Order Quantity based on the Purchase Price table.';
            }

            dialog.confirm({
              title: 'Purchase Price',
              message: dialogMessage
            }).then(function(result) {
              console.log('Success with value ' + result);
            }).catch(function (reason) {
              console.log('Failure: ' + reason);
            });

            return false;
          }

          if (assessLine.ref && !isManual) {
            recObj.setCurrentSublistValue({
              sublistId: 'item',
              fieldId: 'rate',
              value: assessLine.cost,
              ignoreFieldChange: true
            });
            recObj.setCurrentSublistValue({
              sublistId: 'item',
              fieldId: TRAN.PURCHASE_PRICE,
              value: assessLine.ref,
              ignoreFieldChange: true
            });
            recObj.setCurrentSublistValue({
              sublistId: 'item',
              fieldId: TRAN.PURCHASE_PRICE_COST,
              value: assessLine.cost,
              ignoreFieldChange: true
            });
            recObj.setCurrentSublistValue({
              sublistId: 'item',
              fieldId: TRAN.IS_MANUAL,
              value: false,
              ignoreFieldChange: true
            });
          }
        }
      }
    }

    if (recType == 'assemblyitem' || recType == 'inventoryitem') {
      var subPurchPrice = 'recmach' + EFFECTIVE_PURCH.ITEM;
      if (sublistId == subPurchPrice) {
        var isSpareItem = recObj.getValue({ fieldId: ITEM.IS_SPARES_ITEM });

        if (isSpareItem) {
          console.log('isSpareItem=' + isSpareItem);
          alert('This is a Spare Item. You cannot enter data to this sublist.');
          return false;
        }

        if (!recObj.id) {
          alert('Please create the item first before entering data to this sublist.');
          return false;
        }

        var lineVendor = recObj.getCurrentSublistValue({
          sublistId: subPurchPrice,
          fieldId: EFFECTIVE_PURCH.VENDOR
        }) || '';
        var lineCurrency = recObj.getCurrentSublistValue({
          sublistId: subPurchPrice,
          fieldId: EFFECTIVE_PURCH.CURRENCY
        }) || '';
        var lineUom = recObj.getCurrentSublistValue({
          sublistId: subPurchPrice,
          fieldId: EFFECTIVE_PURCH.UOM
        }) || '';
        var lineTierQty = parseFloat(recObj.getCurrentSublistValue({
          sublistId: subPurchPrice,
          fieldId: EFFECTIVE_PURCH.TIER_QTY
        }) || 0);
        var lineStart = recObj.getCurrentSublistValue({
          sublistId: subPurchPrice,
          fieldId: EFFECTIVE_PURCH.START
        }) || '';
        var lineEnd = recObj.getCurrentSublistValue({
          sublistId: subPurchPrice,
          fieldId: EFFECTIVE_PURCH.END
        }) || '';
        var lineCost = parseFloat(recObj.getCurrentSublistValue({
          sublistId: subPurchPrice,
          fieldId: EFFECTIVE_PURCH.UNIT_COST
        }) || 0);

        if (!lineVendor || !lineCurrency || !lineUom || !lineTierQty || !lineStart || !lineCost) {
          return true; // The native mandatory error will pop-up
        }

        log.debug(logTitle, 'lineStart=' + lineStart + ' lineEnd=' + lineEnd);

        if (lineEnd && lineStart > lineEnd) {
          alert('Start Date should not be greater than End Date.');
          return false;
        }
        var lineIndex = recObj.getCurrentSublistIndex({ sublistId: subPurchPrice });
        var lineCount = recObj.getLineCount({ sublistId: subPurchPrice });
        log.debug(logTitle, 'lineCount=' + lineCount + ' lineIndex=' + lineIndex);
        // alert('lineCount=' + lineCount + ' lineIndex=' + lineIndex);

        var hasOverlapDates = false;
        if (lineCount == lineIndex) lineCount += 1; // This is a new line, not yet counted
        for (var i = 0; i < lineCount; i += 1) {
          if (i != lineIndex) {
            var referenceVendor = recObj.getSublistValue({
              sublistId: subPurchPrice,
              fieldId: EFFECTIVE_PURCH.VENDOR,
              line: i
            }) || '';
            var referenceCurrency = recObj.getSublistValue({
              sublistId: subPurchPrice,
              fieldId: EFFECTIVE_PURCH.CURRENCY,
              line: i
            }) || '';
            var referenceUom = recObj.getSublistValue({
              sublistId: subPurchPrice,
              fieldId: EFFECTIVE_PURCH.UOM,
              line: i
            }) || '';
            var referenceTierQty = parseFloat(recObj.getSublistValue({
              sublistId: subPurchPrice,
              fieldId: EFFECTIVE_PURCH.TIER_QTY,
              line: i
            }) || 0);
            var referenceStart = recObj.getSublistValue({
              sublistId: subPurchPrice,
              fieldId: EFFECTIVE_PURCH.START,
              line: i
            }) || '';
            var referenceEnd = recObj.getSublistValue({
              sublistId: subPurchPrice,
              fieldId: EFFECTIVE_PURCH.END,
              line: i
            }) || '';

            if (lineVendor == referenceVendor && lineCurrency == referenceCurrency && lineUom == referenceUom && lineTierQty == referenceTierQty) {
              if (!lineEnd) {
                if (referenceEnd && referenceStart <= lineStart && lineStart <= referenceEnd) hasOverlapDates = true;
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
              return false;
            }
          }
        }

        return true;
      }
    }

    return true;
  }

  var triggerOnSave = false;
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

    try {
      if (recType == 'purchaseorder' && runValidation) {
        var vendorId = recObj.getValue({ fieldId: 'entity' });
        var currencyId = recObj.getValue({ fieldId: 'currency' });
        var fDate = recObj.getValue({ fieldId: 'trandate' });
        var strDate = fDate.getFullYear() + '-' + appendZero(fDate.getMonth() + 1) + '-' + appendZero(fDate.getDate());

        var count = recObj.getLineCount({
          sublistId: 'item'
        });

        // Validate if the item is only entered once
        var objDupCheck = {};
        for (var i = 0; i < count; i += 1) {
          log.debug(logTitle, 'Loop - ' + i);

          var isLineSpares = recObj.getSublistValue({
            sublistId: 'item',
            fieldId: TRAN.IS_SPARES_ITEM,
            line: i
          }) || false;
          if (isLineSpares) continue; // Spares Item should be excluded

          var isCustomerOwned = recObj.getSublistValue({
            sublistId: 'item',
            fieldId: TRAN.CUSTOMER_OWNED,
            line: i
          }) || '';
          if (isCustomerOwned == 2) continue; // Customer Owned Item should be excluded

          var itemType = recObj.getSublistValue({
            sublistId: 'item',
            fieldId: 'itemtype',
            line: i
          }).toUpperCase() || '';
          if (itemType == 'SERVICE') continue; // GL Based Items should be excluded

          var lineItemReference = recObj.getSublistValue({
            sublistId: 'item',
            fieldId: 'item',
            line: i
          }) || '';
          var lineUnitReference = recObj.getSublistValue({
            sublistId: 'item',
            fieldId: 'units',
            line: i
          }) || '';

          var referenceKey = lineItemReference + '_' + lineUnitReference;
          if (!objDupCheck[referenceKey]) objDupCheck[referenceKey] = (i + 1);
          else {
            alert('The item has already been entered on line ' + objDupCheck[referenceKey] + '. You can not enter the same item on a different line.');
            return false;
          }
        }

        // GET ALL ITEMS
        var arrItems = [];
        var objItems = {};
        for (var i = 0; i < count; i += 1) {
          var isLineSpares = recObj.getSublistValue({
            sublistId: 'item',
            fieldId: TRAN.IS_SPARES_ITEM,
            line: i
          }) || false;
          if (isLineSpares) continue; // Spares Item should be excluded

          var isCustomerOwned = recObj.getSublistValue({
            sublistId: 'item',
            fieldId: TRAN.CUSTOMER_OWNED,
            line: i
          }) || '';
          if (isCustomerOwned == 2) continue; // Customer Owned Item should be excluded

          var itemType = recObj.getSublistValue({
            sublistId: 'item',
            fieldId: 'itemtype',
            line: i
          }).toUpperCase() || '';
          if (itemType == 'SERVICE') continue; // GL Based Items should be excluded

          var isManual = recObj.getSublistValue({
            sublistId: 'item',
            fieldId: TRAN.IS_MANUAL,
            line: i
          }) || false;
          var lineRate = parseFloat(recObj.getSublistValue({
            sublistId: 'item',
            fieldId: 'rate',
            line: i
          }) || 0);
          var lineReceivedQty = parseFloat(recObj.getSublistValue({
            sublistId: 'item',
            fieldId: 'quantityreceived',
            line: i
          }) || 0);

          if ((!isManual || !lineRate) && !lineReceivedQty) {
            var lineItem = recObj.getSublistValue({
              sublistId: 'item',
              fieldId: 'item',
              line: i
            });
            var lineUnit = recObj.getSublistValue({
              sublistId: 'item',
              fieldId: 'units',
              line: i
            });
            var lineQty = parseFloat(recObj.getSublistValue({
              sublistId: 'item',
              fieldId: 'quantity',
              line: i
            }) || 0);

            if (arrItems.indexOf(lineItem) == -1) arrItems.push(lineItem);
            if (!objItems[lineItem]) objItems[lineItem] = {};
            if (!objItems[lineItem][lineUnit]) objItems[lineItem][lineUnit] = 0;

            objItems[lineItem][lineUnit] += lineQty;
          }
        }

        log.debug(logTitle, 'objItems=' + JSON.stringify(objItems));
        log.debug(logTitle, 'arrItems=' + JSON.stringify(arrItems));

        if (arrItems.length == 0) return true;

        // GET VALID ITEMS AND ITEMS WITHIN DATE RANGE
        var assessList = JSON.parse(accessSuitelet({
          action: 'ASSESS_LIST',
          list: JSON.stringify(objItems),
          vendor: vendorId,
          currency: currencyId,
          date: strDate
        })) || {};
        log.debug(logTitle, 'assessList=' + JSON.stringify(assessList));

        for (var i = 0; i < count; i += 1) {
          var isLineSpares = recObj.getSublistValue({
            sublistId: 'item',
            fieldId: TRAN.IS_SPARES_ITEM,
            line: i
          }) || false;
          if (isLineSpares) continue; // Spares Item should be excluded

          var isCustomerOwned = recObj.getSublistValue({
            sublistId: 'item',
            fieldId: TRAN.CUSTOMER_OWNED,
            line: i
          }) || '';
          if (isCustomerOwned == 2) continue; // Customer Owned Item should be excluded

          var itemType = recObj.getSublistValue({
            sublistId: 'item',
            fieldId: 'itemtype',
            line: i
          }).toUpperCase() || '';
          if (itemType == 'SERVICE') continue; // GL Based Items should be excluded

          var isManual = recObj.getSublistValue({
            sublistId: 'item',
            fieldId: TRAN.IS_MANUAL,
            line: i
          }) || false;
          var lineRate = parseFloat(recObj.getSublistValue({
            sublistId: 'item',
            fieldId: 'rate',
            line: i
          }) || 0);
          var lineReceivedQty = parseFloat(recObj.getSublistValue({
            sublistId: 'item',
            fieldId: 'quantityreceived',
            line: i
          }) || 0);
          log.debug(i, 'isManual=' + isManual + ' lineRate=' + lineRate + ' lineReceivedQty=' + lineReceivedQty);

          if ((!isManual || !lineRate) && !lineReceivedQty) {
            var lineItem = recObj.getSublistValue({
              sublistId: 'item',
              fieldId: 'item',
              line: i
            });
            var lineUnit = recObj.getSublistValue({
              sublistId: 'item',
              fieldId: 'units',
              line: i
            });
            var lineQty = parseFloat(recObj.getSublistValue({
              sublistId: 'item',
              fieldId: 'quantity',
              line: i
            }) || 0);
            log.debug(i, 'lineItem=' + lineItem + ' lineUnit=' + lineUnit);
            log.debug(i, 'isManual=' + JSON.stringify(assessList[lineItem]));

            if (assessList[lineItem] && assessList[lineItem][lineUnit]) {
              triggerOnSave = true;
              recObj.selectLine({
                sublistId: 'item',
                line: i
              });
              recObj.setCurrentSublistValue({
                sublistId: 'item',
                fieldId: 'rate',
                value: assessList[lineItem][lineUnit].cost,
                ignoreFieldChange: true
              });
              recObj.setCurrentSublistValue({
                sublistId: 'item',
                fieldId: TRAN.PURCHASE_PRICE,
                value: assessList[lineItem][lineUnit].ref,
                ignoreFieldChange: true
              });
              recObj.setCurrentSublistValue({
                sublistId: 'item',
                fieldId: TRAN.PURCHASE_PRICE_COST,
                value: assessList[lineItem][lineUnit].cost,
                ignoreFieldChange: true
              });
              recObj.setCurrentSublistValue({
                sublistId: 'item',
                fieldId: TRAN.IS_MANUAL,
                value: false,
                ignoreFieldChange: true
              });
              recObj.commitLine({
                sublistId: 'item'
              });
              triggerOnSave = false;
            } else {
              var dialogMessage = 'There is no Purchase Price match found.';
              dialogMessage += '\n\n<br/><br/>To proceed, press OK, then check the Manual checkbox and enter the line Rate manually.';
              dialogMessage += '\n\n<br/><br/>Otherwise, please go back to the Purchase Price table and fulfill the tables.';

              dialog.confirm({
                title: 'Purchase Price - Line ' + (i + 1),
                message: dialogMessage
              }).then(function(result) {
                console.log('Success with value ' + result);
              }).catch(function (reason) {
                console.log('Failure: ' + reason);
              });

              if (!lineRate) return false; // For empty rate lines
            }
          }
        }

        return true;
      }

      if (recType == EFFECTIVE_PURCH.TYPE) {
        var vendorId = recObj.getValue({ fieldId: EFFECTIVE_PURCH.VENDOR }) || '';
        var itemId = recObj.getValue({ fieldId: EFFECTIVE_PURCH.ITEM }) || '';
        var currencyId = recObj.getValue({ fieldId: EFFECTIVE_PURCH.CURRENCY }) || '';
        var unitId = recObj.getValue({ fieldId: EFFECTIVE_PURCH.UOM }) || '';
        var tierQty = recObj.getValue({ fieldId: EFFECTIVE_PURCH.TIER_QTY }) || '';
        var startDate = recObj.getValue({ fieldId: EFFECTIVE_PURCH.START }) || '';
        var endDate = recObj.getValue({ fieldId: EFFECTIVE_PURCH.END }) || '';
        var unitCost = recObj.getValue({ fieldId: EFFECTIVE_PURCH.UNIT_COST }) || '';

        if (!vendorId || !itemId || !currencyId || !unitId || !tierQty || !startDate || !unitCost) {
          // alert('Please populate all mandatory fields.');
          // return false;
          return true; // The native mandatory error will pop-up
        }

        log.debug(logTitle, 'startDate=' + startDate + ' endDate=' + endDate);

        if (endDate && startDate > endDate) {
          alert('Start Date should not be greater than End Date.');
          return false;
        }

        var strStart = formatMMDDYYYY(startDate) || '';
        var strEnd = formatMMDDYYYY(endDate) || '';
        log.debug(logTitle, 'strStart=' + strStart + ' strEnd=' + strEnd);

        var params = {
          action: 'CHECK_FOR_OVERLAP_DUPLICATE',
          id: '',
          vendor: vendorId,
          item: itemId,
          currency: currencyId,
          unit: unitId,
          qty: tierQty,
          start: strStart,
          end: strEnd,
          cost: unitCost
        };

        if (recObj.id) params.id = recObj.id;

        log.debug(logTitle, 'params=' + JSON.stringify(params));
        var hasOverlapDates = accessSuitelet(params);
        log.debug(logTitle, 'hasOverlapDates=' + hasOverlapDates);

        if (hasOverlapDates) {
          alert('Please change the Start Date and/or End Date as they overlap with an Effective Date Pricing (Purchase) entry.');
          return false;
        }
      }
    } catch (errorLog) {
      log.error(logTitle, errorLog);
      triggerOnSave = false;
      return false;
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

  function accessSuitelet(PARAMS) {
    var scriptUrl = url.resolveScript({
      deploymentId: SL_EFFECTIVE_PURCHASE.DEP,
      scriptId: SL_EFFECTIVE_PURCHASE.ID,
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
  exports.lineInit = lineInit;
  // exports.validateField = validateField;
  exports.validateLine = validateLine;
  exports.saveRecord = saveRecord;
  return exports;
});
