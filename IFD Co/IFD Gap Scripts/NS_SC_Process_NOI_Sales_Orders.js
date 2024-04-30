/**
 * Copyright (c) 1998-2017 NetSuite, Inc.
 * 2955 Campus Drive, Suite 100, San Mateo, CA, USA 94403-2511
 * All Rights Reserved.
 * 
 * This software is the confidential and proprietary information of
 * NetSuite, Inc. ("Confidential Information"). You shall not
 * disclose such Confidential Information and shall use it only in
 * accordance with the terms of the license agreement you entered into
 * with NetSuite.
 * 
 * * Version    Date            Author           	Remarks
 *   1.00       11 Dec 2018		  Lucia Stella		  Initial Version
 *   1.01       22 Nov 2019     Daniel Lapp       TI 264: Fix for mis-calculated Pool Budgets by Customer
 *   1.02		05 Feb 2020     Jeremy Jacob		TI 287 | Script loops itself when SO saving errors out 
 *   
 *   
 * @NApiVersion 2.0
 * @NScriptType scheduledscript
 *
 * 06/22/2021 Kalyani Chintala, NS Case# 4240233
 */

define(['N/record', 'N/runtime', 'N/search', 'N/task', 'N/file', 'N/email'],
  function (NS_Record, NS_Runtime, NS_Search, NS_Task, fileMod, emailMod) {
    /*
   ** Main function is to evaluate if there is sufficient Item Pool Budget to cover the amount Sales Order lines
   */
    var objScriptParams = null;
    
    // v1.02 | Store SO internal id that errors out
    var ARR_SO_WITH_ERROR = [];
    
    function execute_ProcessSOs(context) {
      var logTitle = 'execute_ProcessSOs';

      try {
        log.debug(logTitle, 'Start');

        getScriptParams();

        if (isEmpty(objScriptParams)) {
          return;
        }

        var arrSOSearchResults = getSalesOrdersToProcess();

        if (isEmpty(arrSOSearchResults)) {
          log.debug(logTitle, 'No SO Search results');
          return;
        }

        log.debug(logTitle, 'arrSOSearchResults.length ' + arrSOSearchResults.length);

        var objCustomerItems = {};
        var arrItems = [];
        var objCustomerChains = {};
        var arrSufSalesOrders = [];

        var reportDtlsList = {};

        for (var i = 0; i < arrSOSearchResults.length; i++)
        {
          //log.debug(logTitle, 'arrSOSearchResults[i] ' + JSON.stringify(arrSOSearchResults[i]));
          var salesOrderId = arrSOSearchResults[i].getValue({name: 'internalid'});
          var lineId = arrSOSearchResults[i].getValue({name: 'line'});
          var itemId = arrSOSearchResults[i].getValue({name: 'item'});
          var lineAmount = arrSOSearchResults[i].getValue({name: 'amount'});
          var lineQuantity = arrSOSearchResults[i].getValue({name: 'quantity'});
          var customerId = arrSOSearchResults[i].getValue({name: 'entity'});
          var noiCustomerChain = arrSOSearchResults[i].getValue({name: 'custbody_ifd_noi_cust_chain'});
          var noiItemFeeForServ = arrSOSearchResults[i].getValue({name: 'custcol_ifd_noi_item_feeforservice'});
          var noiItemCommType = arrSOSearchResults[i].getValue({name: 'custcol_ifd_noi_item_commodity_type'});
		  var noiClosedSKUItem = arrSOSearchResults[i].getValue({name: 'custcol_ifd_closed_sku_item'});

          //NS Case# 4240233: START
          var soNum = arrSOSearchResults[i].getValue({name: 'tranid'});
          var shipDt = arrSOSearchResults[i].getValue({name: 'shipdate'});
          var bfcRead = arrSOSearchResults[i].getValue({name: 'custbody_ifd_bfc_read'});
          var itemNum = arrSOSearchResults[i].getText({name: 'item'});
          var itemDispName = arrSOSearchResults[i].getValue({name: 'displayname', join: 'item'});
          var noiVndrOnItem = arrSOSearchResults[i].getValue({name: 'custitem_ifd_noi_vendor', join: 'item'});
          var customerName = arrSOSearchResults[i].getText({name: 'entity'});
          var noiCustomerChainName = arrSOSearchResults[i].getText({name: 'custbody_ifd_noi_cust_chain'});

          var hashKey = salesOrderId + '-' + lineId;
          reportDtlsList[hashKey] = new reportDtlObj(soNum, shipDt, bfcRead, customerName, noiCustomerChainName, noiVndrOnItem, lineId, itemNum, itemDispName, lineQuantity, lineAmount, null, null, null, null, null, null);

          //NS Case# 4240233: END

         // log.debug('(noiItemFeeForServ) || (noiClosedSKUItem)', (noiItemFeeForServ) + '   ' + (noiClosedSKUItem))

          if (arrSufSalesOrders.indexOf(salesOrderId) == -1)
            arrSufSalesOrders.push(salesOrderId);

          if ( (noiItemFeeForServ) || (noiClosedSKUItem) )
          {
            if (isEmpty(arrItems[itemId]))
              arrItems.push(itemId);

            if (isEmpty(objCustomerChains[customerId]))
              objCustomerChains[customerId] = noiCustomerChain;

            var objLineItem = {
                salesOrder: salesOrderId,
                lineId: lineId,
                lineQuantity: lineQuantity,
                lineAmount: lineAmount
            };

            //log.debug('itemid / customerid', itemId, customerId)
            //log.debug('isEmpty(objCustomerItems[customerId])', isEmpty(objCustomerItems[customerId]))

            if (isEmpty(objCustomerItems[customerId]))
            {
              objCustomerItems[customerId] = {};
              objCustomerItems[customerId][itemId] = {
                  commType: noiItemCommType,
                  remainingAmount: 0,
                  poolName: '',
                  poolBudgetList: new Array(),
                  totalLinesAmount: lineAmount,
                  totalQuantity: lineQuantity,
                  arrSOLines: [objLineItem]
              };
            }
            else
            {
              var objItems = objCustomerItems[customerId];
              if (isEmpty(objItems[itemId]))
              {
                objItems[itemId] = {
                    commType: noiItemCommType,
                    remainingAmount: 0,
                    poolName: '',
                    poolBudgetList: new Array(),
                    totalLinesAmount: lineAmount,
                    totalQuantity: lineQuantity,
                    arrSOLines: [objLineItem]
                };
              }
              else
              {
                objItems[itemId].totalLinesAmount = parseFloat(objItems[itemId].totalLinesAmount) + parseFloat(lineAmount);
                objItems[itemId].totalQuantity = parseInt(objItems[itemId].totalQuantity) + parseInt(lineQuantity);
                objItems[itemId].arrSOLines.push(objLineItem);
              }
              objCustomerItems[customerId] = objItems;
            }
            log.debug(logTitle, 'objCustomerItems ' + JSON.stringify(objCustomerItems));
          }
        }

        log.audit(logTitle, 'objCustomerItems ' + JSON.stringify(objCustomerItems));

        //Search Item Pool Allowance for all prev items
        var objItemPoolAllowances = getItemPoolAllowance(arrItems);
        var objItemPools = objItemPoolAllowances[0];
        log.debug({title: 'Checking', details: 'objItemPools: ' + JSON.stringify(objItemPools)});
        var objItemPoolsAmounts = objItemPoolAllowances[1];
        log.debug({title: 'Checking', details: 'objItemPoolsAmounts: ' + JSON.stringify(objItemPoolsAmounts)});
        var objPools = objItemPoolAllowances[2];
        log.debug({title: 'Checking', details: 'objPools: ' + JSON.stringify(objPools)});
        var arrCustomers = Object.keys(objCustomerItems);

        log.debug(logTitle, 'arrCustomers ' + JSON.stringify(arrCustomers));

        //For each customer
        for (var i = 0; i < arrCustomers.length; i++)
        {
          var enoughRemUsage = checkGovernance();
          if (!enoughRemUsage) {
            var schScriptTask = NS_Task.create({
              taskType: NS_Task.TaskType.SCHEDULED_SCRIPT
            });
            schScriptTask.scriptId = objScriptParams.scriptId;
            var schScriptTaskId = schScriptTask.submit();
            return;
          }

          var currentCustomerId = arrCustomers[i];
          log.debug(logTitle, 'currentCustomerId ' + currentCustomerId);

          var objItems = objCustomerItems[currentCustomerId];
          var arrCustomerItems = Object.keys(objItems);

          //Search NOI Pool Budget for a specific Item and Customer or Customer Chain
          var currentCustomerChain = null;
          if (objCustomerChains[currentCustomerId]) {
            currentCustomerChain = objCustomerChains[currentCustomerId];
          }
          var objPoolBudget = getCustomerNOIPoolBudgetAmount(currentCustomerId, currentCustomerChain);
          log.debug(logTitle, 'objPoolBudget ' + JSON.stringify(objPoolBudget));

          //For each item on the SOs for the current customer
          for (var j = 0; j < arrCustomerItems.length; j++)
          {
            var currentItemId = arrCustomerItems[j];
            log.debug(logTitle, 'currentItemId ' + currentItemId);

            //Item Pools array for the current item
            var arrCurrentItemPool = objItemPools[currentItemId];
            log.debug(logTitle, 'arrCurrentItemPool ' + JSON.stringify(arrCurrentItemPool));

            var totalRemainingAmount = 0, poolName = '', poolBudgetList = new Array();
            var arrPoolBudgets = Object.keys(objPoolBudget);
            for (var k = 0; k < arrPoolBudgets.length; k++)
            {
              var currentPoolId = arrPoolBudgets[k];
              //var currentRemAmt = objPoolBudget[currentPoolId];
              var currentRemAmt = objPoolBudget[currentPoolId].remainingAmount;
              //log.debug(logTitle, 'currentPoolId ' + currentPoolId + ' currentRemAmt ' + currentRemAmt + ', currentPoolName: ' + currentPoolName);

              if (arrCurrentItemPool != null && arrCurrentItemPool != '' && arrCurrentItemPool != undefined && arrCurrentItemPool.indexOf(currentPoolId) != -1)
              {
                totalRemainingAmount = parseFloat(currentRemAmt);
                poolName = objPoolBudget[currentPoolId].poolName;
                poolBudgetList = objPoolBudget[currentPoolId].poolBudgetList;
                log.debug(logTitle, 'totalRemainingAmount ' + totalRemainingAmount + ', poolName: ' + poolName + ', Pool BudgetList: ' + JSON.stringify(poolBudgetList));
              }
            }
            objCustomerItems[currentCustomerId][currentItemId].remainingAmount = totalRemainingAmount;
            objCustomerItems[currentCustomerId][currentItemId].poolName = poolName;
            objCustomerItems[currentCustomerId][currentItemId].poolBudgetList = poolBudgetList;
          }
        }

        updatePoolTotalAmounts(objCustomerItems, objPools, objItemPoolsAmounts);
        log.audit(logTitle, 'objCustomerItems ' + JSON.stringify(objCustomerItems));
        log.debug(logTitle, 'reportDtlsList: ' + JSON.stringify(reportDtlsList));

        log.debug('Checking', 'objPools: ' + JSON.stringify(objPools));

        /*
        //Commented as per NS Case# 4240233
        //objSOToUpdate: This list contains orders with insufficient pool budgets
        //arrSufSalesOrders: This list contains orders with sufficient pool budgets
        var objSOToUpdate = findInsufficientBudgetOrders(objCustomerItems, arrSufSalesOrders, objItemPoolsAmounts, objItemPools, objPools, reportDtlsList);
        log.audit(logTitle, 'arrSufSalesOrders ' + JSON.stringify(arrSufSalesOrders));
        updateSalesOrders(objSOToUpdate, arrSufSalesOrders);
        */

        //NS Case# 4240233: START, Here is where email should go out with all information
        //var finalReportDtlsList = findInsufficientBudgetOrders(objCustomerItems, arrSufSalesOrders, objItemPoolsAmounts, objItemPools, objPools, reportDtlsList);
        var finalReportDtls = findInsufficientBudgetOrders(objCustomerItems, arrSufSalesOrders, objItemPoolsAmounts, objItemPools, objPools, reportDtlsList);
        var fileObj = prepareReportFile(finalReportDtls);
        fileObj.save();

        var sendEmail = false;
        for(var key in finalReportDtls)
        {
          sendEmail = true;
          break;
        }

        log.debug({title: 'Checking', details: 'Send Email: ' + sendEmail});
        if(sendEmail == true)
        {
          emailMod.send({author: objScriptParams.emailFrom, recipients: objScriptParams.emailTo, body: 'FFS Sales Orders Report',
            subject: 'FFS Sales Orders Report', cc: null, relatedRecords: {entityId: objScriptParams.emailFrom}, attachments: [fileObj]});
        }
        //NS Case# 4240233: END
      } catch (error) {
        log.error(logTitle, 'Error: ' + error.message);
      } finally {
        log.debug(logTitle, 'End');
      }
    }

    function toNumber(value)
    {
      if(value == null || value == '' || isNaN(value) || parseFloat(value) == 'NaN')
        value = 0;
      return parseFloat(value);
    }

    function roundNumbers(value, precision)
    {
      if(precision != null && precision != '' && precision != undefined)
        return Math.round(value*Math.pow(10,precision))/Math.pow(10,precision);

      return Math.round(value*Math.pow(10,2))/Math.pow(10,2);
    }

    function prepareReportFile(finalReportDtls)
    {
      //Now prepare CSV File
      var fileContentsStr = 'Document Number, Ship Date, BFC Read, Customer, Customer Chain, NOI Vendor, Line ID, Item, Description, Qty, Item Pool Allowance, Total Allowance Amount, NOI Pool Budget Id, Pool Name, Pool Budget: Remaining Amount\n';

      for(var hashKey in finalReportDtls)
      {
        var tmpReportDtlObj = finalReportDtls[hashKey];
        var tmpFileContentStr = tmpReportDtlObj.soNum + ', ' + tmpReportDtlObj.shipDt + ', ' + (tmpReportDtlObj.bfcRead == true ? 'Yes' : 'No') + ', ';
        tmpFileContentStr += (tmpReportDtlObj.customer.indexOf(',') > -1 ? ('"' + tmpReportDtlObj.customer + '"') : tmpReportDtlObj.customer) + ', ';
        tmpFileContentStr += (tmpReportDtlObj.custChain.indexOf(',') > -1 ? ('"' + tmpReportDtlObj.custChain + '"') : tmpReportDtlObj.custChain) + ', ';
        tmpFileContentStr += tmpReportDtlObj.noiVndr + ', ' + tmpReportDtlObj.lineId + ', ' + tmpReportDtlObj.item + ', ';
        tmpFileContentStr += (tmpReportDtlObj.itemName.indexOf(',') > -1 ? ('"' + tmpReportDtlObj.itemName + '"') : tmpReportDtlObj.itemName) + ', ';
        tmpFileContentStr += tmpReportDtlObj.quantity + ', ' + roundNumbers(toNumber(tmpReportDtlObj.itemPoolAllowance), 2) + ', ' + roundNumbers(toNumber(tmpReportDtlObj.totalAllowAmt), 2);

        var poolBudgetRemAmt = roundNumbers(toNumber(tmpReportDtlObj.poolBudgetRemAmt));
        var poolName = tmpReportDtlObj.poolName;
        if(poolName.indexOf(',') > -1)
          poolName = '"' + poolName + '"';

        var poolBudgetList = tmpReportDtlObj.poolBudgetList;
        if(poolBudgetList != null && poolBudgetList != undefined && poolBudgetList.length > 0)
        {
          for(var idxP=0; idxP < poolBudgetList.length; idxP++)
          {
            fileContentsStr += tmpFileContentStr + ', ' + poolBudgetList[idxP].id + ', ' + poolName + ', ' + poolBudgetRemAmt + '\n';
          }
        }
        else
          fileContentsStr += tmpFileContentStr + ', ' + '' + ', ' + poolName + ', ' + poolBudgetRemAmt + '\n';
      }

      var fileObj = fileMod.create({fileType: fileMod.Type.CSV, name: 'FFS_Sales_Orders_Report_' + new Date().getTime() + '.csv', contents: fileContentsStr, folder: objScriptParams.repFileFolderId});
      return fileObj;

      for(var poolName in finalReportDtls)
      {
        var finalReportDtlsList = finalReportDtls[poolName];
        if(isEmpty(finalReportDtlsList))
          continue;

        for(var idx=0; idx < finalReportDtlsList.length; idx++)
        {
          var tmpReportDtlObj = finalReportDtlsList[idx];
          var tmpFileContentStr = tmpReportDtlObj.soNum + ', ' + tmpReportDtlObj.shipDt + ', ' + (tmpReportDtlObj.bfcRead == true ? 'Yes' : 'No') + ', ';
          tmpFileContentStr += (tmpReportDtlObj.customer.indexOf(',') > -1 ? ('"' + tmpReportDtlObj.customer + '"') : tmpReportDtlObj.customer) + ', ';
          tmpFileContentStr += (tmpReportDtlObj.custChain.indexOf(',') > -1 ? ('"' + tmpReportDtlObj.custChain + '"') : tmpReportDtlObj.custChain) + ', ';
          tmpFileContentStr += tmpReportDtlObj.noiVndr + ', ' + tmpReportDtlObj.lineId + ', ' + tmpReportDtlObj.item + ', ';
          tmpFileContentStr += (tmpReportDtlObj.itemName.indexOf(',') > -1 ? ('"' + tmpReportDtlObj.itemName + '"') : tmpReportDtlObj.itemName) + ', ';
          tmpFileContentStr += tmpReportDtlObj.quantity + ', ' + roundNumbers(toNumber(tmpReportDtlObj.itemPoolAllowance), 2) + ', ' + roundNumbers(toNumber(tmpReportDtlObj.totalAllowAmt), 2);

          var poolBudgetRemAmt = roundNumbers(toNumber(tmpReportDtlObj.poolBudgetRemAmt));
          var poolName = tmpReportDtlObj.poolName;
          if(poolName.indexOf(',') > -1)
            poolName = '"' + poolName + '"';

          var poolBudgetList = tmpReportDtlObj.poolBudgetList;
          if(poolBudgetList != null && poolBudgetList != undefined && poolBudgetList.length > 0)
          {
            for(var idxP=0; idxP < poolBudgetList.length; idxP++)
            {
              fileContentsStr += tmpFileContentStr + ', ' + poolBudgetList[idxP].id + ', ' + poolName + ', ' + poolBudgetRemAmt + '\n';
            }
          }
          else
            fileContentsStr += tmpFileContentStr + ', ' + '' + ', ' + poolName + ', ' + poolBudgetRemAmt + '\n';
        }
      }

      var fileObj = fileMod.create({fileType: fileMod.Type.CSV, name: 'FFS_Sales_Orders_Report_' + new Date().getTime() + '.csv', contents: fileContentsStr, folder: objScriptParams.repFileFolderId});
      return fileObj;
    }
    
    /*
     * v1.02 | Added
     */
    function inArray(v, arr) 
    {
	    for(var i=arr.length-1; i>=0; i--) {
		    if (v == arr[i]) break;
	    }
	    return (i > -1);
    };
    
    /*
    ** Main search: Get Sales Orders to process
    */
    function getSalesOrdersToProcess() {
      var logTitle = 'getSalesOrdersToProcess';

      try {
        //Filter for business days
        var today = new Date();
        var intDayOfWeek = today.getDay();
        var shipDate = new Date();

        if (intDayOfWeek == 5) { //FRIDAY
          shipDate.setDate(shipDate.getDate() + (parseInt(3)));
        } else {
          shipDate.setDate(shipDate.getDate() + (parseInt(1)));
        }

        var day = shipDate.getDate();
        var month = parseInt(shipDate.getMonth() + 1);
        var fullYear = shipDate.getFullYear();
        var year = String(fullYear).substr(2, 2);
        var shipDateFilter = month + '/' + day + '/' + year;

        var todayFilter = parseInt(today.getMonth() + 1) + '/' + today.getDate() + '/' + today.getFullYear();
        log.debug(logTitle, 'shipDate ' + shipDate + ' shipDateFilter: ' + shipDateFilter + ', todayFilter: ' + todayFilter);

        var objSOSearch = NS_Search.load({id: objScriptParams.objSOSSId});
        objSOSearch.filters.push(NS_Search.createFilter({name: 'shipdate', operator: NS_Search.Operator.WITHIN, values: [todayFilter, shipDateFilter]}));
        //var arrSOSearchResults = objSOSearch.run().getRange({start: 0, end: objScriptParams.intSSMaxResults});
        var arrSOSearchResults = new Array();
        objSOSearch.run().each(function (result) {
          arrSOSearchResults.push(result);
          return true;
        });

        return arrSOSearchResults;

      } catch (error) {
        log.error(logTitle, 'Error: ' + error.message);
      }
    }

    /*
    ** Search Item Pool Allowance for all existing items
    */
    function getItemPoolAllowance(arrItems) {
      var logTitle = 'getItemPoolAllowance';

      try {
        var objItemPools = {};
        var objItemPoolsAmounts = {};
        var objPools = {};
        var arrIPAFilters = [];
        var arrIPAColumns = [];

        arrIPAFilters.push(NS_Search.createFilter({name: 'custrecord_item_pool_item', operator: NS_Search.Operator.ANYOF, values: arrItems}));
        arrIPAFilters.push(NS_Search.createFilter({name: 'isinactive', operator: NS_Search.Operator.IS, values: false}));

        arrIPAColumns.push({ name: 'custrecord_item_pool_item' });
        arrIPAColumns.push({ name: 'custrecord_item_pool_name' });
        arrIPAColumns.push({ name: 'custrecord_item_alternate_remain_amt' });

        var objIPASearch = NS_Search.create({type: 'customrecord_item_pool_budget', filters: arrIPAFilters, columns: arrIPAColumns});

        objIPASearch.run().each(function (result) {
          var itemId = result.getValue({name: 'custrecord_item_pool_item'});
          var itemPoolId = result.getValue({name: 'custrecord_item_pool_name'});
          var itemPoolName = result.getText({name: 'custrecord_item_pool_name'});
          var itemPoolAllowance = result.getValue({name: 'custrecord_item_alternate_remain_amt'});

          log.debug(logTitle, 'itemId ' + itemId);

          var objItemPoolAllowance = {itemPoolId: itemPoolId, itemPoolAllowance: itemPoolAllowance};

          if (isEmpty(objItemPools[itemId]))
          {
            objItemPools[itemId] = [itemPoolId];
            objItemPoolsAmounts[itemId] = itemPoolAllowance;
          }
          else
          {
            objItemPools[itemId].push(itemPoolId);
            // objItemPoolsAmounts[itemId] = parseFloat(objItemPoolsAmounts[itemId]) + parseFloat(itemPoolAllowance); // v1.01: Remove
            objItemPoolsAmounts[itemId] = itemPoolAllowance; // v1.01: Add
          }

          if (isEmpty(objPools[itemPoolId]))
          {
            objPools[itemPoolId] = {
              //  totalAmt: 0, // v1.01: Replaced by line below
              totalAmt: {}, // v1.01: Added
              arrItems: [itemId],
              name: itemPoolName
            };
          }
          else if (objPools[itemPoolId].arrItems.indexOf(itemId) == -1)
          {
            objPools[itemPoolId].arrItems.push(itemId);
          }

          return true;
        });

        log.debug(logTitle, 'objItemPools ' + JSON.stringify(objItemPools));
        log.debug(logTitle, 'objItemPoolsAmounts ' + JSON.stringify(objItemPoolsAmounts));
        log.debug(logTitle, 'objPools ' + JSON.stringify(objPools));

        return [objItemPools, objItemPoolsAmounts, objPools];

      } catch (error) {
        log.error(logTitle, 'Error: ' + error.message);
      }
    }

    /*
    ** Get Item Pool Allowance (currency) for a particular item
    */
    function updatePoolTotalAmounts(objCustomerItems, objPools, objItemPoolsAmounts)
    {
      var logTitle = 'updatePoolTotalAmounts';

      try
      {
        log.audit(logTitle, 'objPools ' + JSON.stringify(objPools));
        var arrCustomers = Object.keys(objCustomerItems);

        for (var i = 0; i < arrCustomers.length; i++)
        {
          var currentCustomerId = arrCustomers[i];
          var objItems = objCustomerItems[currentCustomerId];
          var arrCustomerItems = Object.keys(objItems);

          log.debug(logTitle, 'currentCustomerId ' + currentCustomerId);
          log.audit(logTitle, 'arrCustomerItems ' + JSON.stringify(arrCustomerItems));

          for (var j = 0; j < arrCustomerItems.length; j++)
          {
            var currentItemId = arrCustomerItems[j];
            var arrCurrentItemData = objCustomerItems[currentCustomerId][currentItemId];

            log.audit(logTitle, 'arrCurrentItemData ' + JSON.stringify(arrCurrentItemData));

            var commType = arrCurrentItemData.commType;
            //  var remainingAmount = arrCurrentItemData.remainingAmount; // v1.01: Removed, not used
            //  var arrSOLines = arrCurrentItemData.arrSOLines; // v1.01: Removed, not used
            var totalLinesQty = arrCurrentItemData.totalQuantity;
            var itemPoolAllowanceAmt = objItemPoolsAmounts[currentItemId];
            var totalLinesAmount = parseFloat(totalLinesQty) * parseFloat(itemPoolAllowanceAmt);
            log.debug({title: 'IPA Amt Calculation', details: { totalLinesQty: totalLinesQty, itemPoolAllowanceAmt: itemPoolAllowanceAmt}});

            if (commType == objScriptParams.stCommTypeAll)
            {
              var arrPools = Object.keys(objPools);

              for (var k = 0; k < arrPools.length; k++)
              {
                var currentPoolId = arrPools[k];
                log.debug({title: 'Current Pool ID', details: currentPoolId});
                
                var objPoolItems = objPools[currentPoolId];
                var arrPoolItems = objPoolItems.arrItems;
                //  var totalPoolAmount = objPoolItems.totalAmt; // v1.01: Removed, not used
                // var objPoolCustomerAmts = objPoolItems.totalAmt;

                if (arrPoolItems.indexOf(currentItemId) != -1)
                {
                  // v1.01: Start
                  log.debug({title: 'objPools[currentPoolId].totalAmt', details: objPools[currentPoolId].totalAmt});
                  
                  if (isEmpty(objPools[currentPoolId].totalAmt[currentCustomerId]))
                  {
                    log.debug({title: 'Customer ' + currentCustomerId + ' does not exist', details: 'Setting ' + totalLinesAmount + ' to customer key in object'});
                    // If Customer/Amt combination doesn't exist then add it to the object
                    objPools[currentPoolId].totalAmt[currentCustomerId] = totalLinesAmount;
                  }
                  else
                  {
                    log.debug({title: 'Customer ' + currentCustomerId + ' exists', details: 'Adding ' + objPools[currentPoolId].totalAmt[currentCustomerId] + ' to ' + totalLinesAmount});
                    objPools[currentPoolId].totalAmt[currentCustomerId] = objPools[currentPoolId].totalAmt[currentCustomerId] + totalLinesAmount;
                  }

                  log.debug({title: 'objPools by Customer ' + currentCustomerId, details: objPools[currentPoolId].totalAmt[currentCustomerId]});
                  // v1.01: Finish
                  //  objPools[currentPoolId].totalAmt = parseFloat(objPools[currentPoolId].totalAmt) + parseFloat(totalLinesAmount);
                }
              }
            }
          }
        }
        log.error(logTitle, 'objPools ' + JSON.stringify(objPools));

      } catch (error) {
        log.error(logTitle, 'Error: ' + error.message);
      }
    }

    /*
    ** Process objCustomerItems in order to find insufficient budget orders
    */
    function findInsufficientBudgetOrders(objCustomerItems, arrSalesOrders, objItemPoolsAmounts, objItemPools, objPools, reportDtlsList)
    {
      var outOfBudgetCustChainsList = new Array(), emptyCustChainReptDtlsList = new Array();
      var finalReportDtls = {};
      var finalReportDtlsList = new Array();
      var finalRepDtls = {};
      var logTitle = 'findInsufficientBudgetOrders';

      try
      {
        var objSOToUpdate = {};
        var arrCustomers = Object.keys(objCustomerItems);

        var custChainBudgetDtlsList = {};

        for (var i = 0; i < arrCustomers.length; i++)
        {
          var currentCustomerIdInCustChainList = false;
          var currentCustomerId = arrCustomers[i];
          var objItems = objCustomerItems[currentCustomerId];
          var arrCustomerItems = Object.keys(objItems);

          log.debug(logTitle, 'currentCustomerId ' + currentCustomerId);
          log.audit(logTitle, 'arrCustomerItems ' + JSON.stringify(arrCustomerItems));

          for (var j = 0; j < arrCustomerItems.length; j++)
          {
            log.audit(logTitle, 'arrCustomerItems[j] ' + JSON.stringify(arrCustomerItems[j]));
            var currentItemId = arrCustomerItems[j];
            var arrCurrentItemData = objCustomerItems[currentCustomerId][currentItemId];
            log.audit(logTitle, 'arrCurrentItemData ' + JSON.stringify(arrCurrentItemData));
            var commType = arrCurrentItemData.commType;
            var remainingAmount = arrCurrentItemData.remainingAmount;
            var arrSOLines = arrCurrentItemData.arrSOLines;
            //var totalLinesAmount = arrCurrentItemData.totalLinesAmount;
            var totalLinesQty = arrCurrentItemData.totalQuantity;
            //var itemPoolAllowanceAmt = objItemPoolsAmounts[currentItemId][0].itemPoolAllowance; //First Item Pool result
            var itemPoolAllowanceAmt = objItemPoolsAmounts[currentItemId];
            var totalLinesAmount = parseFloat(totalLinesQty) * parseFloat(itemPoolAllowanceAmt);

            var poolName = arrCurrentItemData.poolName;
            var poolBudgetList = arrCurrentItemData.poolBudgetList;
            log.debug({title : logTitle, details: 'Pool name: ' + poolName + ', poolBudgetList: ' + JSON.stringify(poolBudgetList)});

            log.audit(logTitle, 'arrSOLines ' + JSON.stringify(arrSOLines));

            for (var k = 0; k < arrSOLines.length; k++)
            {
              var salesOrderId = arrSOLines[k].salesOrder;
              var lineId = arrSOLines[k].lineId;
              var lineQuantity = arrSOLines[k].lineQuantity;
              var lineAmount = parseFloat(lineQuantity) * parseFloat(itemPoolAllowanceAmt);

              var hashKey = salesOrderId + '-' + lineId;
              reportDtlsList[hashKey].itemPoolAllowance = itemPoolAllowanceAmt;
              reportDtlsList[hashKey].totalAllowAmt = lineAmount;
              reportDtlsList[hashKey].poolBudgetRemAmt = remainingAmount;
              reportDtlsList[hashKey].poolName = arrCurrentItemData.poolName;
              reportDtlsList[hashKey].poolBudgetList = arrCurrentItemData.poolBudgetList;

              if (commType == objScriptParams.stCommTypeAll)
              {
                totalLinesAmount = 0;
                var arrPools = Object.keys(objPools);

                for (var l = 0; l < arrPools.length; l++) {

                  var currentPoolId = arrPools[l];
                  var objPoolItems = objPools[currentPoolId];
                  log.debug({title: 'objPoolItems', details: objPoolItems});

                  var arrPoolItems = objPoolItems.arrItems;
                  //  var totalPoolAmount = objPoolItems.totalAmt; // v1.01: Removed
                  var custPoolAmt = objPoolItems.totalAmt[currentCustomerId]; // v1.01: Add

                  var itemIndex = arrPoolItems.indexOf(currentItemId);
                  if (itemIndex != -1) {
                    //  totalLinesAmount += parseFloat(totalPoolAmount); // v1.01: Removed
                    totalLinesAmount += parseFloat(custPoolAmt); // v1.01: Add

                    if(reportDtlsList[hashKey].poolName == null || reportDtlsList[hashKey].poolName == '' || reportDtlsList[hashKey].poolName == undefined)
                    {
                      reportDtlsList[hashKey].poolName = objPoolItems.name;
                    }
                  }
                }
              }

              var custChain = reportDtlsList[hashKey].custChain;
              var poolName = reportDtlsList[hashKey].poolName;
              var custChainHKey = '';
              if(isEmpty(custChain) && isEmpty(poolName))
                emptyCustChainReptDtlsList.push(reportDtlsList[hashKey]);
              else
              {
                if(isEmpty(custChain))
                  emptyCustChainReptDtlsList.push(reportDtlsList[hashKey]);
                else
                {
                  var commTypeKey = commType;
                  if (commType != objScriptParams.stCommTypeAll)
                    commTypeKey = currentCustomerId + '-' + currentItemId;
                  if(isEmpty(poolName))
                    custChainHKey = custChain + '$None$' + commTypeKey;
                  else
                    custChainHKey = custChain + '$' + poolName + '$' + commTypeKey;

                  log.emergency({title: 'Checking', details: 'custChainHKey: ' + custChainHKey});
                  log.emergency({title: 'Checking', details: 'custChainBudgetDtlsList[custChainHKey]: ' + custChainBudgetDtlsList[custChainHKey]});
                  if(isEmpty(custChainBudgetDtlsList[custChainHKey]))
                  {
                    var custChainLineAmtList = {};
                    custChainLineAmtList[hashKey] = lineAmount;
                    custChainBudgetDtlsList[custChainHKey] = new custChainDtlObj(custChain, poolName, remainingAmount, totalLinesAmount, custChainLineAmtList, [currentCustomerId]);
                    log.emergency({title: 'Checking', details: 'Adding new entry into custChainBudgetDtlsList'});
                  }
                  else
                  {
                    //Update Line Amounts
                    var custChainLineAmtList = custChainBudgetDtlsList[custChainHKey].lineAmts;
                    if(isEmpty(custChainLineAmtList))
                    {
                      custChainLineAmtList = {};
                      custChainLineAmtList[hashKey] = lineAmount;
                    }
                    else
                    {
                      if(isEmpty(custChainLineAmtList[hashKey]))
                        custChainLineAmtList[hashKey] = lineAmount;
                      else
                        log.emergency({title: 'Checking', details: 'HashKey: ' + hashKey + ' line amount already added!'});
                    }
                    custChainBudgetDtlsList[custChainHKey].lineAmts = custChainLineAmtList;

                    //Update Customer Ids
                    var existCustomerIds = custChainBudgetDtlsList[custChainHKey].customerIds;
                    if(isEmpty(existCustomerIds))
                      existCustomerIds = new Array();

                    if(existCustomerIds.indexOf(currentCustomerId) == -1)
                    {
                      existCustomerIds.push(currentCustomerId);
                      custChainBudgetDtlsList[custChainHKey].customerIds = existCustomerIds;

                      var existTotalAmt = roundNumbers(toNumber(custChainBudgetDtlsList[custChainHKey].totalLinesAmount), 2);
                      existTotalAmt += totalLinesAmount;
                      custChainBudgetDtlsList[custChainHKey].totalLinesAmount = roundNumbers(existTotalAmt, 2);
                    }
                  }
                }
              }

              log.audit(logTitle, 'commType: ' + commType + ' | remainingAmount ' + remainingAmount
                  + ' | totalLinesAmount ' + totalLinesAmount + ' | lineAmount ' + lineAmount + ', Cust Chain: ' + reportDtlsList[hashKey].custChain);

              if ((commType == objScriptParams.stCommTypeAll && parseFloat(totalLinesAmount) > parseFloat(remainingAmount))
                  || (commType == objScriptParams.stCommTypePartial && parseFloat(lineAmount) > parseFloat(remainingAmount)))
              {

                if (isEmpty(objSOToUpdate[salesOrderId]))
                {
                  objSOToUpdate[salesOrderId] = [lineId];
                } else {
                  objSOToUpdate[salesOrderId].push(lineId);
                }

                log.error({title: 'Checking', details: JSON.stringify(reportDtlsList[hashKey])});
                finalReportDtlsList.push(reportDtlsList[hashKey]);
                log.emergency({title: 'Checking', details: 'Adding entry into finalRepDtls'});
                finalRepDtls[hashKey] = reportDtlsList[hashKey];

                //Remove Sales Order from arrSalesOrders in order to process separately
                var soIndex = arrSalesOrders.indexOf(salesOrderId);
                if (soIndex != -1) {
                  arrSalesOrders.splice(soIndex, 1);
                }
              }
            }
          }
        }

        log.emergency({title: 'Checking', details: 'finalRepDtls(before customerChain check): ' + JSON.stringify(finalRepDtls)});
        for(var key in custChainBudgetDtlsList)
        {
          log.emergency('Checking', 'Key: ' + key + ', Details: ' + JSON.stringify(custChainBudgetDtlsList[key]));
          var remAmt = roundNumbers(toNumber(custChainBudgetDtlsList[key].remainingAmount), 2);
          var totalLinesAmount = roundNumbers(toNumber(custChainBudgetDtlsList[key].totalLinesAmount), 2);
          if (totalLinesAmount > parseFloat(remAmt))
          {
            //Make sure all this customer chain entries are included into report
            var lineAmts = custChainBudgetDtlsList[key].lineAmts;
            if(lineAmts != null && lineAmts != undefined && lineAmts != '')
            {
              for(var lineAmtKey in lineAmts)
              {
                var hashKey = lineAmtKey;
                if(finalRepDtls[hashKey] == null || finalRepDtls[hashKey] == '' || finalRepDtls[hashKey] == undefined)
                  finalRepDtls[hashKey] = reportDtlsList[hashKey];
              }
            }
          }
        }
        log.emergency({title: 'Checking', details: 'finalRepDtls(after customerChain check): ' + JSON.stringify(finalRepDtls)});

        return finalRepDtls;
      } catch (error) {
        log.error(logTitle, 'Error: ' + error.message);
      }
    }


    function custChainLineAmtObj(soId, lineId, lineAmt)
    {
      this.soId = soId;
      this.lineId = lineId;
      this.lineAmt = lineAmt;
    }

    function custChainDtlObj(custChain, poolName, remainingAmount, totalLinesAmount, lineAmts, customerIds)
    {
      this.custChain = custChain;
      this.poolName = poolName;
      this.remainingAmount = remainingAmount;
      this.totalLinesAmount = totalLinesAmount;
      this.lineAmts = lineAmts;
      this.customerIds = customerIds;
    }


    function reportDtlObj(soNum, shipDt, bfcRead, customer, custChain, noiVndr, lineId, item, itemName, quantity, amount, itemPoolAllowance, totalAllowAmt, noiPoolBudgetId, poolName, poolBudgetRemAmt, poolBudgetList)
    {
      this.soNum = soNum;
      this.shipDt = shipDt;
      this.bfcRead = bfcRead;
      this.customer = customer;
      this.custChain = custChain;
      this.noiVndr = noiVndr;
      this.lineId = lineId;
      this.item = item;
      this.itemName = itemName;
      this.quantity = quantity;
      this.amount = amount;
      this.itemPoolAllowance = itemPoolAllowance;
      this.totalAllowAmt = totalAllowAmt;
      this.noiPoolBudgetId = noiPoolBudgetId;
      this.poolName = poolName;
      this.poolBudgetRemAmt = poolBudgetRemAmt;
      this.poolBudgetList = poolBudgetList;
    }

    /*
    ** Update Sales Orders
    */
    function updateSalesOrders(objSOToUpdate, arrSalesOrders) {
      var logTitle = 'updateSalesOrders';
      var totalSOUpdated = 0;
      var totalSOErrors = 0;

      try {
        //Update Sales Orders with sufficient budget
        for (var i = 0; i < arrSalesOrders.length; i++) {
          var salesOrderId = arrSalesOrders[i];

          try {
            var savedSOId = NS_Record.submitFields({
              type: NS_Record.Type.SALES_ORDER,
              id: salesOrderId,
              values: {
                'custbody_ifd_noi_order_processed': true
              },
              options: {
                enableSourcing: false,
                ignoreMandatoryFields: true
              }
            });

            log.audit(logTitle, 'Sufficient updated Sales Order #: ' + savedSOId);
            totalSOUpdated += parseInt(1);

          } catch (error) {
            log.error(logTitle, 'Error processing Sales Order #: ' + salesOrderId + '. Error: ' + error.message);
            totalSOErrors += parseInt(1);
            
            // v1.02 | Store SO Id
            if (salesOrderId) ARR_SO_WITH_ERROR.push(salesOrderId);
          }
        }

        //Update Sales Orders with insufficient budget 
        var arrSalesOrders = Object.keys(objSOToUpdate);

        for (var i = 0; i < arrSalesOrders.length; i++) {
          var salesOrderId = arrSalesOrders[i];

          try {

            var arrLines = objSOToUpdate[salesOrderId];
            var objSalesOrderRec = NS_Record.load({
              type: NS_Record.Type.SALES_ORDER,
              id: salesOrderId
            });

            objSalesOrderRec.setValue('custbody_ifd_noi_order_processed', true);
            objSalesOrderRec.setValue('memo', objScriptParams.stSOMemoTxtMsg);
            objSalesOrderRec.setValue('orderstatus', objScriptParams.stSOPendingApprovalStatus);

            for (var j = 0; j < arrLines.length; j++) {
              var lineId = arrLines[j];

              var lineNumber = objSalesOrderRec.findSublistLineWithValue({
                sublistId: 'item',
                fieldId: 'line',
                value: lineId
              });

              if (lineNumber == -1) {
                continue;
              }

              objSalesOrderRec.setSublistValue({
                sublistId: 'item',
                fieldId: 'custcol_ifd_noi_pool_budget_exceeded',
                line: lineNumber,
                value: true
              });
            }

            var savedSOId = objSalesOrderRec.save({
              enableSourcing: false,
              ignoreMandatoryFields: true
            });
            log.audit(logTitle, 'Updated Sales Order #: ' + savedSOId);
            totalSOUpdated += parseInt(1);

          } catch (error) {
            log.error(logTitle, 'Error processing Sales Order #: ' + salesOrderId + '. Error: ' + error.message);
            totalSOErrors += parseInt(1);
            
            // v1.02 | Store SO Id
            if (salesOrderId) ARR_SO_WITH_ERROR.push(salesOrderId);
          }
        }
      } catch (error) {
        log.error(logTitle, 'Error: ' + error.message);
      } finally {
        var currentRemainingUsage = NS_Runtime.getCurrentScript().getRemainingUsage();
        var intUsageConsumed = parseInt(1000) - parseInt(currentRemainingUsage);

        log.audit(logTitle, 'Total updated: ' + totalSOUpdated + ' | Total errors: ' + totalSOErrors);
        log.audit(logTitle, 'Usage consumed: ' + intUsageConsumed);
      }
    }

    /*
    ** Get NOI Pool Budget amounts for a specific Customer and its Item Pool Allowances
    */
    function getCustomerNOIPoolBudgetAmount(customerId, customerChain) {
      var logTitle = 'getCustomerNOIPoolBudgetAmount';

      try {
        var objPoolBudget = {};
        var arrPBFilters = [];
        var arrPBColumns = [];

        if (!isEmpty(customerChain)) {
          arrPBFilters = [['custrecord_noi_pool_bud_customer', 'IS', customerId],
            'OR', ['custrecord_pool_group_customer', 'IS', customerChain],
            'AND', ['custrecord_pool3_start_amt', 'GREATERTHAN', 0],
            'AND', ['isinactive', 'IS', false]];
        } else {
          arrPBFilters = [['custrecord_noi_pool_bud_customer', 'IS', customerId],
            'AND', ['custrecord_pool3_start_amt', 'GREATERTHAN', 0],
            'AND', ['isinactive', 'IS', false]];
        }

        arrPBColumns.push({ name: 'custrecord_pool3_start_amt' });
        arrPBColumns.push({ name: 'custrecord_pool_name' });
        arrPBColumns.push({ name: 'id' });

        var objPBSearch = NS_Search.create({
          type: 'customrecord_noi_pool_budget',
          filters: arrPBFilters,
          columns: arrPBColumns
        });

        objPBSearch.run().each(function (result) {

          var poolId = result.getValue({name: 'custrecord_pool_name'});
          var poolName = result.getText({name: 'custrecord_pool_name'});
          var poolRemainingAmt = result.getValue({name: 'custrecord_pool3_start_amt'});

          var poolBudgetId = result.getValue({name: 'id'});

          if (objPoolBudget[poolId])
          {
            //objPoolBudget[poolId] = parseFloat(objPoolBudget[poolId]) + parseFloat(poolRemainingAmt);

            objPoolBudget[poolId].remainingAmount = parseFloat(objPoolBudget[poolId].remainingAmount) + parseFloat(poolRemainingAmt);
            objPoolBudget[poolId].poolBudgetList.push({'id': poolBudgetId, 'remAmt': poolRemainingAmt});
          }
          else
          {
            //objPoolBudget[poolId] = poolRemainingAmt;
            var tmpObj = {'remainingAmount' : poolRemainingAmt, 'poolName': poolName, 'poolBudgetList': [{'id': poolBudgetId, 'remAmt': poolRemainingAmt}]};
            objPoolBudget[poolId] = tmpObj;
          }

          return true;
        });
        return objPoolBudget;

      } catch (error) {
        log.error(logTitle, 'Error: ' + error.message);
      }
    }

    function poolBudgDtlObj(id, remAmt)
    {
      this.id = id;
      this.remAmt = remAmt;
    }

    /*
    ** Check Governance
    */
    function checkGovernance() {
      var logTitle = 'checkGovernance';

      try {
        var currentRemainingUsage = NS_Runtime.getCurrentScript().getRemainingUsage();

        if (parseInt(currentRemainingUsage) < parseInt(objScriptParams.intUsageThreshold)) {
          log.audit(logTitle, 'Current Remaining Usage: ' + currentRemainingUsage + '. Re-Scheduling script.');
          return false;
        }
        return true;

      } catch (error) {
        log.error(logTitle, 'Error: ' + error.message);
      }
    }

    /*
    ** Get script parameters
    */
    function getScriptParams() {
      var logTitle = 'getScriptParams';
      try {
        var script = NS_Runtime.getCurrentScript();

        var intSSMaxResults = script.getParameter('custscript_ns_sc_proc_noi_so_maxresults');
        var stSOMemoTxtMsg = script.getParameter('custscript_ns_sc_proc_noi_so_somemotxtms');
        var stSOPendingApprovalStatus = script.getParameter('custscript_ns_sc_proc_noi_so_pendappstat');
        var objSOSSId = script.getParameter('custscript_ns_sc_proc_noi_so_savsearchid');
        var intUsageThreshold = script.getParameter('custscript_ns_sc_proc_noi_so_usagethrhld');
        var stValidOrderStatuses = script.getParameter('custscript_ns_sc_proc_noi_so_valordstats');
        var stCommTypeAll = script.getParameter('custscript_ns_sc_proc_noi_so_commtypeall');
        var stCommTypePartial = script.getParameter('custscript_ns_sc_proc_noi_so_commtypepar');
        var stScriptId = script.getParameter('custscript_ns_sc_proc_noi_so_scriptid');
        var emailTo = script.getParameter('custscript_ns_sc_proc_noi_so_report_to');
        var emailFrom = script.getParameter('custscript_ns_sc_proc_noi_so_report_from');
        var repFileFolderId = script.getParameter({name: 'custscript_ns_sc_proc_noi_so_report_fold'});

        if (isEmpty(intSSMaxResults) || isEmpty(stSOMemoTxtMsg) || isEmpty(stSOPendingApprovalStatus)
          || isEmpty(objSOSSId) || isEmpty(intUsageThreshold) || isEmpty(stValidOrderStatuses)
          || isEmpty(stCommTypeAll) || isEmpty(stCommTypePartial) || isEmpty(stScriptId) || isEmpty(emailTo)
            || isEmpty(emailFrom) || isEmpty(repFileFolderId)) {

          log.error(logTitle, 'Missing script parameters');
          return;
        }

        objScriptParams = {
          intSSMaxResults: intSSMaxResults,
          stSOMemoTxtMsg: stSOMemoTxtMsg,
          stSOPendingApprovalStatus: stSOPendingApprovalStatus,
          objSOSSId: objSOSSId,
          intUsageThreshold: intUsageThreshold,
          stValidOrderStatuses: stValidOrderStatuses,
          stCommTypeAll: stCommTypeAll,
          stCommTypePartial: stCommTypePartial,
          scriptId: stScriptId,
          emailTo: emailTo,
          emailFrom: emailFrom,
          repFileFolderId: repFileFolderId
        };

        log.audit(logTitle, 'objScriptParams ' + JSON.stringify(objScriptParams));

      } catch (error) {
        log.error(logTitle, 'Error: ' + error.message);
      }
    }

    function isEmpty(stValue) {

      return ((stValue === '' || stValue == null || stValue == undefined) ||
        (stValue.constructor === Array && stValue.length == 0) ||
        (stValue.constructor === Object && (function (
          v) {
          for (var k in v)
            return false;
          return true;
        })(stValue)));
    }

    return {
      execute: execute_ProcessSOs
    };
  });


