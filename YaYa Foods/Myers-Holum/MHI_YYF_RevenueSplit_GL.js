/**
 * Module Description
 *
 * Version    Date            Author           Remarks
 * 1.00       19 Sep 2022     Ards Bautista    Initial Logic
 * 1.10       13 Mar 2023     Ards Bautista    Added fix to not include 0 material cost and handline lines
 * 1.20       05 Jul 2023     Ards Bautista    Added fix for 0 amount lines to not restrict the splitting of other lines
 */

var ACCOUNT = {
  INCOME_PLACEHOLDER: 701 // 40100 Sales : Sales - Placeholder
};
var STATUS = {
  PENDING: 1,
  APPROVED: 2,
  REJECTED: 3
};

function customizeGlImpact(transactionRecord, standardLines, customLines, book) {
  var tranType = transactionRecord.getRecordType();
  var tranId = transactionRecord.getId();
  var logTitle = nlapiGetContext().getExecutionContext() + '_' + tranType + '_' + tranId + '_';

  try {
    var exchangeRate = transactionRecord.getFieldValue('exchangerate');
    var approvalStatus = transactionRecord.getFieldValue('approvalstatus');
    nlapiLogExecution('DEBUG', logTitle, 'exchangeRate: ' + exchangeRate + ' approvalStatus: ' + approvalStatus);

    // if (approvalStatus != STATUS.APPROVED) return;

    var itemCount = transactionRecord.getLineItemCount('item');
    var objItems = {};

    for (var i = 1; i <= itemCount; i += 1) {
      var itemId = parseFloat(transactionRecord.getLineItemValue('item', 'item', i));

      if (itemId && !objItems[itemId]) {
        objItems[itemId] = {
          matCost: 0,
          matHandling: 0,
          coPack: 0
        };
      }

      // objItems[itemId].matCost += parseFloat(transactionRecord.getLineItemValue('item', 'custcol_yaya_so_totmatcost', i) || 0);
      // objItems[itemId].matHandling += parseFloat(transactionRecord.getLineItemValue('item', 'custcol_yaya_so_totmathandcost', i) || 0);
      // objItems[itemId].coPack += parseFloat(transactionRecord.getLineItemValue('item', 'custcol_yaya_so_totcopackprice', i) || 0);
    }

    var arrItems = Object.keys(objItems) || [];

    // RUN SEARCH TO GET ITEM ACCOUNTS
    if (arrItems.length > 0) {
      var filters = [];
      filters.push(new nlobjSearchFilter('account', null, 'anyOf', ACCOUNT.INCOME_PLACEHOLDER));
      filters.push(new nlobjSearchFilter('internalid', null, 'anyOf', arrItems));

      var columns = [];
      columns.push(new nlobjSearchColumn('incomeaccount'));
      columns.push(new nlobjSearchColumn('custitem_yaya_matcostaccount'));
      columns.push(new nlobjSearchColumn('custitem_yaya_mathandlingaccount'));
      columns.push(new nlobjSearchColumn('custitem_yaya_copackaccount'));

      var resultSet = nlapiSearchRecord('item', null, filters, columns);
      // nlapiLogExecution('DEBUG', logTitle, 'resultSet=' + JSON.stringify(resultSet));

      if (resultSet) {
        for (var i = 0; i < resultSet.length; i += 1) {
          var result = resultSet[i];
          var itemId = result.getId();
          var incomeAccount = parseFloat(result.getValue('incomeaccount'));

          if (incomeAccount != ACCOUNT.INCOME_PLACEHOLDER) continue;

          objItems[itemId].incomeAccount = incomeAccount;
          objItems[itemId].matCostAccount = parseFloat(result.getValue('custitem_yaya_matcostaccount'));
          objItems[itemId].matHandlingAccount = parseFloat(result.getValue('custitem_yaya_mathandlingaccount'));
          objItems[itemId].coPackAccount = parseFloat(result.getValue('custitem_yaya_copackaccount'));
        }
      }
    }

    nlapiLogExecution('DEBUG', logTitle, 'objItems=' + JSON.stringify(objItems));

    var glLineCount = standardLines.getCount();
    nlapiLogExecution('DEBUG', logTitle, 'glLineCount: ' + glLineCount + ' itemCount: ' + itemCount);

    var objLines = {};
    var itemIndex = 0;

    for (var j = 0; j < glLineCount; j += 1) {
      var lineObj = standardLines.getLine(j);

      var lineAcct = lineObj.getAccountId();
      var lineDebit = parseFloat(lineObj.getDebitAmount());
      var lineCredit = parseFloat(lineObj.getCreditAmount());
      var lineDept = lineObj.getDepartmentId();
      var lineClass = lineObj.getClassId();
      var lineLocation = lineObj.getLocationId();

      if (lineDebit == 0 && lineCredit == 0) continue;
      if (lineAcct != ACCOUNT.INCOME_PLACEHOLDER) continue;
      nlapiLogExecution('DEBUG', logTitle + j, '***** Debit=' + lineDebit + ' Credit=' + lineCredit + ' lineAcct=' + lineAcct);

      itemIndex += 1;

      var lineEntity = lineObj.getEntityId();

      objLines[j] = lineObj;
      nlapiLogExecution('DEBUG', logTitle + j, 'Line' + j + '=' + JSON.stringify(lineObj));

      var matCostAmount = 0;
      var matHandlingAmount = 0;
      var coPackAmount = 0;
      var matCostAccount = '';
      var matHandlingAccount = '';
      var coPackAccount = '';

      for (var k = 1; k <= itemCount; k += 1) {
        if (k != itemIndex) continue;

        var itemId = parseFloat(transactionRecord.getLineItemValue('item', 'item', k));
        var lineAmount = parseFloat(transactionRecord.getLineItemValue('item', 'amount', k) || 0);
        nlapiLogExecution('DEBUG', logTitle + j + '_' + k, 'itemId=' + itemId + ' itemIndex=' + itemIndex + ' k=' + k + ' itemCount=' + itemCount);

        if (!objItems[itemId].incomeAccount) continue;
        if (objItems[itemId].incomeAccount != ACCOUNT.INCOME_PLACEHOLDER) continue;
        if (!lineAmount) {
          itemIndex += 1;
          continue;
        }

        nlapiLogExecution('DEBUG', logTitle + j + '_' + k, itemId + '=' + JSON.stringify(objItems[itemId]));
        matCostAmount = parseFloat(transactionRecord.getLineItemValue('item', 'custcol_yaya_so_totmatcost', k)) * exchangeRate;
        matHandlingAmount = parseFloat(transactionRecord.getLineItemValue('item', 'custcol_yaya_so_totmathandcost', k)) * exchangeRate;
        coPackAmount = parseFloat(transactionRecord.getLineItemValue('item', 'custcol_yaya_so_totcopackprice', k)) * exchangeRate;

        matCostAccount = objItems[itemId].matCostAccount;
        matHandlingAccount = objItems[itemId].matHandlingAccount;
        coPackAccount = objItems[itemId].coPackAccount;

        // itemIndex = k;
        // break;
        // if (k == itemIndex) break;
      }

      if (!matCostAccount) continue;
      if (!matHandlingAccount) continue;
      if (!coPackAccount) continue;

      // itemIndex += 1;

      matCostAmount = parseFloat(matCostAmount.toFixed(2));
      matHandlingAmount = parseFloat(matHandlingAmount.toFixed(2));
      coPackAmount = parseFloat(coPackAmount.toFixed(2));
      var offsetAmount = matCostAmount + matHandlingAmount + coPackAmount;
      var logAmounts = {
        matCostAmount: matCostAmount,
        matHandlingAmount: matHandlingAmount,
        coPackAmount: coPackAmount,
        offsetAmount: offsetAmount
      };
      nlapiLogExecution('DEBUG', logTitle + j, 'logAmounts=' + JSON.stringify(logAmounts));

      // OFFSET LINE
      var offsetLine = '';
      if (offsetAmount > 0) {
        offsetLine = customLines.addNewLine();
        offsetLine.setAccountId(lineAcct);
        offsetLine.setEntityId(lineEntity);
        offsetLine.setDepartmentId(lineDept);
        offsetLine.setClassId(lineClass);
        offsetLine.setLocationId(lineLocation);
      }

      // MATERIAL COST LINE
      var matCostLine = '';
      if (matCostAmount > 0) {
        matCostLine = customLines.addNewLine();
        matCostLine.setAccountId(matCostAccount);
        matCostLine.setEntityId(lineEntity);
        matCostLine.setDepartmentId(lineDept);
        matCostLine.setClassId(lineClass);
        matCostLine.setLocationId(lineLocation);
      }

      // MATERIAL HANDLING COST LINE
      var matHandLine = '';
      if (matHandlingAmount > 0) {
        matHandLine = customLines.addNewLine();
        matHandLine.setAccountId(matHandlingAccount);
        matHandLine.setEntityId(lineEntity);
        matHandLine.setDepartmentId(lineDept);
        matHandLine.setClassId(lineClass);
        matHandLine.setLocationId(lineLocation);
      }

      // CO PACK PRICE LINE
      var coPackLine = '';
      if (coPackAmount > 0) {
        coPackLine = customLines.addNewLine();
        coPackLine.setAccountId(coPackAccount);
        coPackLine.setEntityId(lineEntity);
        coPackLine.setDepartmentId(lineDept);
        coPackLine.setClassId(lineClass);
        coPackLine.setLocationId(lineLocation);
      }

      if (lineDebit > 0) {
        if (offsetLine) offsetLine.setCreditAmount(offsetAmount);
        if (matCostLine) matCostLine.setDebitAmount(matCostAmount);
        if (matHandLine) matHandLine.setDebitAmount(matHandlingAmount);
        if (coPackLine) coPackLine.setDebitAmount(coPackAmount);
      } else if (lineCredit > 0) {
        if (offsetLine) offsetLine.setDebitAmount(offsetAmount);
        if (matCostLine) matCostLine.setCreditAmount(matCostAmount);
        if (matHandLine) matHandLine.setCreditAmount(matHandlingAmount);
        if (coPackLine) coPackLine.setCreditAmount(coPackAmount);
      }
    }

    nlapiLogExecution('DEBUG', logTitle, 'objLines=' + JSON.stringify(objLines));
  } catch (ERROR) {
    nlapiLogExecution('ERROR', logTitle, ERROR);
  }
}
