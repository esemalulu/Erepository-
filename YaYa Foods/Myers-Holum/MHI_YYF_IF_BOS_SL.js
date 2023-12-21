/**
 *@NApiVersion 2.1
 *@NScriptType Suitelet
 */
define(['N/ui/serverWidget', 'N/search', 'N/email', 'N/record', 'N/runtime', 'N/https'], (
  serverwidget,
  search,
  email,
  record,
  runtime,
  https
) => {
  let invFlag = false;
  const pendingApproval = 1;
  function onRequest(context) {
    if (context.request.method === 'GET') {
      const { recId, paymentMethod, ifId } = context.request.parameters;
      log.debug('recId', recId);

      if (!recId) return;
      if (!ifId) return;

      const ifRec = record.load({
        type: 'itemfulfillment',
        id: ifId
      });

      const soRec = record.load({
        type: 'salesorder',
        id: recId
      });
      const itemList = getAllItems(ifRec);
      if (itemList.length == 0) return;
      createInvoice(recId, soRec, ifRec, itemList);

      const isPartiallyFulfilled = checkPartiallyFulfilled(soRec, ifRec);

      log.debug('isPartiallyFulfilled', isPartiallyFulfilled);

      if (isPartiallyFulfilled) {
        closeSalesOrder(recId);
      }
    }
  }

  function createInvoice(recId, soRec, ifRec, itemList) {
    const invoiceRec = record.transform({
      fromType: record.Type.SALES_ORDER,
      fromId: recId,
      toType: record.Type.INVOICE,
      isDynamic: true
    });

    const autobillLine = {};
    const customer = invoiceRec.getValue('entity');
    const ifDate = ifRec.getValue('trandate');
    log.debug('ifDate', ifDate);
    invoiceRec.setValue('trandate', ifDate);

    const customerCurrency = getCustomerCurrency(customer);
    if (customerCurrency) {
      invoiceRec.setValue('currency', customerCurrency);
    }

    for (let i = 0; i < itemList.length; i += 1) {
      const { itemId, itemQty, orderLine } = itemList[i];

      const invoiceIndex = invoiceRec.findSublistLineWithValue('item', 'orderline', orderLine);
      const soIndex = soRec.findSublistLineWithValue('item', 'line', orderLine);

      if (invoiceIndex == -1) continue;

      invoiceRec.selectLine('item', invoiceIndex);
      invoiceRec.setCurrentSublistValue('item', 'quantity', itemQty);

      const unitMatCost = invoiceRec.getCurrentSublistValue('item', 'custcol_yaya_so_unitmatcost');
      const unitMatHandlingCost = invoiceRec.getCurrentSublistValue(
        'item',
        'custcol_yaya_so_unitmathandlingcost'
      );
      const unitCoPackCost = invoiceRec.getCurrentSublistValue(
        'item',
        'custcol_yaya_so_unitcopackprice'
      );

      log.debug('unitMatCost', unitMatCost);
      log.debug('unitMatHandlingCost', unitMatHandlingCost);
      log.debug('unitCoPackCost', unitCoPackCost);

      invoiceRec.setCurrentSublistValue(
        'item',
        'custcol_yaya_so_totmatcost',
        Number(unitMatCost) * Number(itemQty)
      );

      invoiceRec.setCurrentSublistValue(
        'item',
        'custcol_yaya_so_totcopackprice',
        Number(unitCoPackCost) * Number(itemQty)
      );

      invoiceRec.setCurrentSublistValue(
        'item',
        'custcol_yaya_so_totmathandcost',
        Number(unitMatHandlingCost) * Number(itemQty)
      );
      const rate = soRec.getSublistValue('item', 'rate', soIndex);
      log.debug('rate', rate);

      invoiceRec.setCurrentSublistValue('item', 'rate', rate);
      invoiceRec.setCurrentSublistValue('item', 'amount', Number(rate) * Number(itemQty));

      invoiceRec.commitLine('item');
      autobillLine[invoiceIndex] = true;
    }

    log.debug('autobillLine', autobillLine);

    const lineCount = invoiceRec.getLineCount('item');

    for (let j = lineCount - 1; j >= 0; j -= 1) {
      const isAutoBillLine = autobillLine[j];

      if (!isAutoBillLine) {
        invoiceRec.removeLine({
          sublistId: 'item',
          line: j
        });
      }
    }

    invoiceRec.setValue('approvalstatus', pendingApproval);
    const invId = invoiceRec.save({
      ignoreMandatoryFields: true
    });
    log.audit(invId);

    log.audit('Invoice', 'Invoice Creation End');
  }

  function checkPartiallyFulfilled(soRec, ifRec) {
    const soLineCount = soRec.getLineCount('item');
    const ifLineCount = ifRec.getLineCount('item');

    if (soLineCount != ifLineCount) return true;

    for (let i = 0; i < soLineCount; i += 1) {
      const soLineQty = soRec.getSublistValue('item', 'quantity', i);
      const ifLineQty = ifRec.getSublistValue('item', 'quantity', i);

      if (soLineQty != ifLineQty) return true;
    }

    return false;
  }

  function closeSalesOrder(recId) {
    const soRec = record.load({
      type: 'salesorder',
      id: recId
    });
    const lineCount = soRec.getLineCount('item');

    for (let i = 0; i < lineCount; i += 1) {
      soRec.setSublistValue('item', 'isclosed', i, true);
    }

    soRec.save({
      ignoreMandatoryFields: true
    });
  }

  function getCustomerCurrency(customer) {
    const cuomsterSearch = search.lookupFields({
      type: 'customer',
      id: customer,
      columns: ['currency']
    });

    return cuomsterSearch.currency[0] ? cuomsterSearch.currency[0].value : false;
  }

  function getAllItems(ifRec) {
    const itemList = [];
    const lineCount = ifRec.getLineCount('item');
    for (let i = 0; i < lineCount; i += 1) {
      const itemId = ifRec.getSublistValue({
        sublistId: 'item',
        fieldId: 'item',
        line: i
      });
      const itemQty = ifRec.getSublistValue({
        sublistId: 'item',
        fieldId: 'quantity',
        line: i
      });
      const itemLocation = ifRec.getSublistValue({
        sublistId: 'item',
        fieldId: 'location',
        line: i
      });
      const orderLine = ifRec.getSublistValue({
        sublistId: 'item',
        fieldId: 'orderline',
        line: i
      });
      const isBOSItem = ifRec.getSublistValue('item', 'custcol_mhi_yyf_is_bos', i);

      if (!isBOSItem) continue;
      itemList.push({ itemId, itemQty, orderLine });
    }

    return itemList;
  }

  function getSalesOrderGroup(soRec) {
    const itemGroupArray = [];
    const lineCount = soRec.getLineCount('item');

    for (let i = 0; i < lineCount; i += 1) {
      const itemType = soRec.getSublistValue({
        sublistId: 'item',
        fieldId: 'itemtype',
        line: i
      });

      if (itemType != 'InvtPart') continue;

      const groupObj = {};
      groupObj.startIndex = i;
      groupObj.invItem = [i];
      if (i == lineCount - 1 && i == 0) {
        groupObj.endIndex = i;

        itemGroupArray.push(groupObj);
        break;
      }

      let lastLine = false;
      for (let j = i + 1; j < lineCount; j += 1) {
        const itemType2 = soRec.getSublistValue({
          sublistId: 'item',
          fieldId: 'itemtype',
          line: j
        });
        if (j + 1 == lineCount) {
          groupObj.endIndex = j;
          i = j;
          break;
        }

        if (itemType2 == 'InvtPart') {
          if (lastLine) {
            groupObj.endIndex = j - 1;
            i = j - 1;
            break;
          } else {
            groupObj.invItem.push(j);
          }
        }

        if (itemType2 != 'InvtPart') {
          lastLine = true;
        }
      }

      itemGroupArray.push(groupObj);
    }

    return itemGroupArray;
  }


  return {
    onRequest
  };
});
