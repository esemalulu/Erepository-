/**
 * Copyright (c) 1998-2018 NetSuite, Inc.
 * 2955 Campus Drive, Suite 100, San Mateo, CA, USA 94403-2511
 * All Rights Reserved
 *
 * This software is the confidential and proprietary information of NetSuite, Inc.  ("Confidential Information").
 * You shall not disclose such Confidential Information and shall use it only in accordance with the terms of the license
 * you entered into with NetSuite
 */

/**
 * @NApiVersion 2.x
 * @NScriptType MapReduceScript
 * @NModuleScope Public
 *
 * Script Description
 * Map Reduce script will re-calculate item (line) pricing for orders that ship tomorrow.  Will run twice a day
 *
 * Version Date Author Remarks
 * Date:
 * 1.0  Jan 1 2019   JMO    Initial Version
 * 1.1  Jun 29 2019  PRIES  Updated for TI 170 - adding two new col fields to be populated - Rebate Amount and Total Admin Fees
 * 1.2  Jul 12 2019  PRIES  Updated to TI 170 - rebate amt should be zero when admin fee is greater
 * 1.3  Jul 22 2019  JMO    Added logic to retry Sales Order Save if error
 * 1.4  Jul 29 2019  JMO    Don't show negative rebates or admin fees
 * 1.5  Jul 13 2019  JMO    Off by 1 Javascript fix
 * 1.6  Jan 06 2020  PRI    TI 274 - correction for blank Applied Rebate and Total Admin Fee field values
 * 1.7  Jan 10 2020 PRI     TI 274 - only set 2 fields if there is a rebate agreement
 */

define(['N/search', './_NS_LIB_IFDPricing', 'N/record', 'N/runtime', './NSUtilvSS2'],

    function(search, libPrices, record, runtime, NSUtil){

        var secondsDelay;
        var numberOfRetries;

        function getInputData()
        {

            var intOrderSearch = runtime.getCurrentScript().getParameter('custscript_ns_mr_ordersthatshiptomorrow');
            //Load Main Line = F search of all Orders with a ship date of tomorrow where Lines
            //with 'Price Override = T' are not included
            var objOrders = search.load({
              id: intOrderSearch
            });

            //Check if SO Id passed from UE and if so add as criteria
            var intSOfromUE = runtime.getCurrentScript().getParameter('custscript_ns_mr_sofromue');
            log.debug('intSOfromUE', intSOfromUE);
            if(!NSUtil.isEmpty(intSOfromUE))
            {
              log.debug('UE passed in script');
              objOrders.filters.push(search.createFilter({
                name: 'internalid',
                operator: search.Operator.ANYOF,
                values: intSOfromUE
              }));
            }
            else //pass in criteria of ship date = tomorrow
            {
              objOrders.filters.push(search.createFilter({
                name: 'shipdate',
                operator: search.Operator.ON,
                values: 'tomorrow'
              }));
            }

            log.debug('objOrders: Filters', objOrders.filters);
            return objOrders;
        }

        function map(context)
        {
          //Extract information about a single line
          var objLineResult = JSON.parse(context.value);
          log.debug('Map Stage: Sales Order Object',objLineResult);

          //Clean the data
          var intId = objLineResult.id;
          var intLine = objLineResult.values.linesequencenumber;
          intLine = intLine-1;
          var stShipDate = objLineResult.values.shipdate;
          var arrItem = objLineResult.values.item;
          // log.debug('arrItem',arrItem);
          var intItem = arrItem.value;

          var arrEntity = objLineResult.values.entity;
          // log.debug('arrEntity',arrEntity);
          var intEntity = arrEntity.value;


          var objOrderLinePrice = libPrices.getOrderLinePrice(intEntity, intItem, stShipDate);

          log.debug('Map Stage: Values to be Cleaned', {
            orderid: intId,
            linenum: intLine,
            shipdate: stShipDate,
            itemid: intItem,
            entityid: intEntity,
            priceinfo: objOrderLinePrice
          });

          if(!NSUtil.isEmpty(objOrderLinePrice.error) && objOrderLinePrice.error !== 'No custom price could be found for this item')
          {
            log.error('getOrderLinePrice Error: ', objOrderLinePrice.error);
            return objOrderLinePrice.error;
          }

          var flPrice = (objOrderLinePrice.sellprice) ? objOrderLinePrice.sellprice : null;
          if(!flPrice){
            log.error('No native price returned for item: '+intItem+' and customer: '+intEntity);
            return;
          }
          var stContract = (objOrderLinePrice.contract) ? objOrderLinePrice.contract : null;
          var stRebateAgreement = (objOrderLinePrice.rebateagreement) ? objOrderLinePrice.rebateagreement : null;
          var stRebateDetail = (objOrderLinePrice.rebatedetail) ? objOrderLinePrice.rebatedetail : null;
          // v1.1 - added
          var flAppliedrebateamount = !NSUtil.isEmpty(objOrderLinePrice.appliedrebateamount) ? objOrderLinePrice.appliedrebateamount : null;     // v1.6 - updated
          var flTotaladmin = !NSUtil.isEmpty(objOrderLinePrice.totaladmin) ? objOrderLinePrice.totaladmin : null;   // v1.6 - updated

          var arrOrder = [];

          var objLine = {};
          objLine.line= intLine;
          objLine.price= flPrice;
          objLine.contract = stContract;
          objLine.agreement = stRebateAgreement;
          objLine.detail = stRebateDetail;
          // v1.1 - added
          objLine.appliedrebateamount = flAppliedrebateamount;
          objLine.totaladmin = flTotaladmin;

          //Write to context for processing in reduce
          arrOrder.push(objLine);
          log.debug('arrOrderDetails',arrOrder);
          context.write({
            key: intId,
            value: arrOrder
          });
        }

        function reduce(context)
        {
          //Obtain lines grouped by Sales Order Id
          log.debug('Reduce Stage: Cleaned Order Lines',context);

          var intOrderId = JSON.parse(context.key);
          log.debug('orderId',intOrderId);

          //Load Sales Order
          var objSalesOrder = record.load({
            type: record.Type.SALES_ORDER,
            id: intOrderId,
            isDynamic: true
          });

          log.debug('SO Object', {
            orderid: intOrderId,
            orderobject: objSalesOrder
          });


          //Process each line
          var arrLines = context.values;
          log.debug('arrLines', arrLines);
          log.debug('arrLines length', arrLines.length);          
          for(var i=0; i<arrLines.length; i++)
          {
            var arrLine = JSON.parse(arrLines[i]);
            var objLine = arrLine[0];
            log.debug('Line Object', objLine);

            objSalesOrder.selectLine({
              sublistId: 'item',
              line: objLine.line
            });
            objSalesOrder.setCurrentSublistValue({
              sublistId: 'item',
              fieldId: 'rate',
              value: objLine.price
            });

            if(!NSUtil.isEmpty(objLine.contract))
            {
              objSalesOrder.setCurrentSublistValue({
                sublistId: 'item',
                fieldId: 'custcol_ifd_contract_name',
                value: objLine.contract
              });
            }
            if(!NSUtil.isEmpty(objLine.agreement))
            { 
              var stRebateInfo = 'Rebate Agreement: '+objLine.agreement;
              objSalesOrder.setCurrentSublistValue({
                sublistId: 'item',
                fieldId: 'custcol_ifd_rebate_agreement',
                value: stRebateInfo
              });
                        
              // v1.1 - added - start:
              var inRebateAmt = 0; 
              var inTotalAdmin = 0;
              if(!NSUtil.isEmpty(objLine.appliedrebateamount) && !isNaN(objLine.appliedrebateamount)) 
              {
                inRebateAmt = parseFloat(objLine.appliedrebateamount).toFixed(2); 
                log.debug('inRebateAmt', inRebateAmt.toString());
              } else {
                  log.debug('Reduce', 'no applied rebate amount');
              }

              var newRebateAmount = 0.00;                     // v1.2 added
              
              if(!NSUtil.isEmpty(objLine.totaladmin) && !isNaN(objLine.totaladmin))
              {
                inTotalAdmin = objLine.totaladmin; //v1.5
                log.debug('inTotalAdmin', inTotalAdmin.toString());

                if (inRebateAmt < inTotalAdmin) {
                  inTotalAdmin = inRebateAmt;
                  // newRebateAmount stays zero in this case
                } else {
                  newRebateAmount = (inRebateAmt - inTotalAdmin).toFixed(2);   // v1.2 added
                }

                newRebateAmount = (newRebateAmount < 0) ? 0 : newRebateAmount;

                objSalesOrder.setCurrentSublistValue({
                  sublistId: 'item',
                  fieldId: 'custcol_ifd_applied_rebate_amt',
                  value: newRebateAmount                                       // v1.2 changed
                });

                inTotalAdmin = (inTotalAdmin < 0) ? 0 : inTotalAdmin;

                objSalesOrder.setCurrentSublistValue({
                  sublistId: 'item',
                  fieldId: 'custcol_ifd_total_admin_fees',
                  value: inTotalAdmin
                });
                log.debug('set', '2 currentsublist values');
              } else {
                  log.debug('Reduce', 'fields not set');
              }
              // v1.1 - added - end
            }  // v1.7 - moved end block

            try
            {
              objSalesOrder.commitLine({
                sublistId: 'item'
              });
            }
            catch (e)
            {
              log.error('Commit Line Error:',e);
            }
          }

          numberOfRetries = runtime.getCurrentScript().getParameter('custscript_ns_number_of_retries');
          secondsDelay = runtime.getCurrentScript().getParameter('custscript_ns_seconds_delay');


          numberOfRetries = (numberOfRetries) ? numberOfRetries : 5;
          secondsDelay = (secondsDelay) ? secondsDelay : 10;

          try
          {
            var intSavedOrder = objSalesOrder.save();
            log.debug('Saved Order: ', intSavedOrder);
          }
          catch(e)
          {

            var didSave;
            var saveTryCount = 1;


            while(!didSave && saveTryCount < numberOfRetries){
              delaySave(secondsDelay);
              try{
                didSave = objSalesOrder.save();
                log.debug('Saved Order: '+didSave);
              }
              catch(e){
                saveTryCount++;
                if(saveTryCount === numberOfRetries){

                  log.error('Sales Order save failed','Number of Attempts: '+numberOfRetries+' Last Error: '+e);
                }
              }
            }
          }

        }

        function summarize(context)
        {
          log.audit('Summarize:','Duration: '+context.seconds);
          log.audit('Summarize:','Usage Consumed: '+context.usage);
          log.audit('Summarize:','Number of Queues: '+context.concurrency);
          log.audit('Summarize:','Number of Yields: '+context.yields);
        }

        function delaySave(secondsDelay) {
          log.debug('setTimeout', 'entering... ' + new Date());
          var now = new Date(),
              then = new Date().setSeconds(now.getSeconds() + secondsDelay);

          while (new Date() < then) {
            //nothing
          }
          log.debug('setTimeout', 'exiting... ' + new Date());
        }

        return{
          getInputData:getInputData,
          map:map,
          reduce:reduce,
          summarize:summarize
        };

});
