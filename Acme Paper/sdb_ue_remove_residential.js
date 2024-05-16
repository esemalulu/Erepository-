/**
 *@NApiVersion 2.1
 *@NScriptType UserEventScript
 */
 define(["N/log", "N/ui/serverWidget", "N/search", "N/runtime",], function (log,serverWidget,search,runtime) {
  
  function beforeLoad(context) {
    try {
      const form = context.form;
      const htmlField = form.addField({
        id: "custpagehideresidentialfield",
        type: serverWidget.FieldType.INLINEHTML,
        label: "hideresidential",
      });
      const htmlFieldContent = `
            <style>
                [data-ns-tooltip="RESIDENTIAL ADDRESS"], [data-label="Residential Address"]{
                    display:none !important;
                }
            </style>`;
      htmlField.defaultValue = htmlFieldContent;
      var customer = context.newRecord;
      var itemPricingSubList = form.getSublist({ id: "itempricing" })  

    //-----------------------START Edit Item Pricing Button Logic----------------------
     var customerId = customer.id;
     var currentUserObj = runtime.getCurrentUser();
     var currentUserId = currentUserObj.id;
     var customerRole = currentUserObj.role;
     addEditItemPricingButton(customerId,customerRole,form);
    //-----------------------END Edit Item Pricing Button Logic----------------------

    //-----------------------START Item Pricing Columns Logic----------------------
     addColumnsToItemPricingSublist(itemPricingSubList);

      var itemPricingLines = customer.getLineCount({
        sublistId: 'itempricing'
      });
      var itemsIds = []
      if(currentUserId == 84418 || currentUserId ==  85394 || currentUserId ==  84419 || currentUserId ==  84957) log.debug('entro for item lines counter')
      for (let i = 0; i < itemPricingLines; i++) {
        itemsIds.push(customer.getSublistValue({ sublistId: 'itempricing', fieldId: 'item', line: i, }))
      }
      if(currentUserId == 84418 || currentUserId ==  85394 || currentUserId ==  84419 || currentUserId ==  84957) log.debug('salio for item lines counter')
      var allLinesProccessed = false;
      for (let i = 0; i <2; i++ && !allLinesProccessed) {
        //Get last shipped date
        var itemsLastShippedDate = getItemsLastShippDate(itemsIds,customerId)
        //Get item cost from the last invoice for these items
        var itemsLastInvoiceResults = getItemLastInvoiceResults(itemsIds,customerId);
        //Get item values and transaction date, last sell price and last quantity from the last SO for these items
        var itemsLastSaleOrderObj = getItemLastSaleOrderResults(itemsIds,customerId);
        var itemsLastSaleOrderResults = itemsLastSaleOrderObj.results;
        var itemsWithoutLastSaleOrderIds = itemsLastSaleOrderObj.itemIds;
        //Get item values for the items that there are not in a sales order or invoice
        var itemsWithoutLastSaleOrderObj = getItemsWithoutTransactionResults(itemsWithoutLastSaleOrderIds)
        //Get items NOT proccessed on first iteration
        itemsIds = itemsWithoutLastSaleOrderObj?.itemIds;
        if(!itemsIds || itemsIds?.length<=0) allLinesProccessed = true;
        var itemsWithoutLastSaleOrderResults = itemsWithoutLastSaleOrderObj.results
        var finalListResult = itemsLastSaleOrderResults.concat(itemsWithoutLastSaleOrderResults)
        //Get rebated cost for customer items
        var rebatesCostList = getRebatedCostForItems(customerId);
        //Set items values on item pricing sublist
        addItemPricingSublistValues(customer, itemsLastInvoiceResults,itemsLastShippedDate, finalListResult,rebatesCostList);      
     }
    } catch (error) {
      log.error("beforeLoad error", 'CustomerId Error '+customerId + ' Error: ' +  error);
    }
  }

function addEditItemPricingButton(customerId,customerRole,form){
    try {
      const fieldLookUp = search.lookupFields({
        type: "customrecord_sdb_role_pricing_edits",
        id: 1,
        columns: ["custrecord_sdb_role_permission"],
      });
      var rolesPermissionList = fieldLookUp.custrecord_sdb_role_permission;
      var rolesPermissionListValues = [];
      var currentUserObj = runtime.getCurrentUser();
      var currentUserId = currentUserObj.id;
      if(currentUserId == 84418 || currentUserId ==  85394 || currentUserId ==  84419 || currentUserId ==  84957)log.debug('entro for permissions')
      for (let i = 0; i < rolesPermissionList.length; i++) {
        rolesPermissionListValues.push(Number(rolesPermissionList[i]?.value))
      }
      if(currentUserId == 84418 || currentUserId ==  85394 || currentUserId ==  84419 || currentUserId ==  84957)log.debug('salio for permissions')
      var clientPath = "SuiteScripts/sdb_item_pricing.js"
      form.clientScriptModulePath = clientPath;
      if (rolesPermissionListValues.includes(customerRole)) {
        form.addButton({
          id: 'custpage_buttontest',
          label: 'Edit Item Pricing',
          functionName: 'redirectToSuitelet(' + customerId + ')'
        });
      }
    } catch (error) {
      log.error('addEditItemPricingButton error',error)
    }
}
function addColumnsToItemPricingSublist(itemPricingSubList){
  try {
         //Unit Price - Current Sell
         var priceField = itemPricingSubList.getField({id: 'price'});
         priceField.label="Current Sell"
          // commodity-
          itemPricingSubList.addField({
            id: 'custpage_commodity',
            label: 'Commodity',
            type: serverWidget.FieldType.TEXT,
          });
          //Loaded Cost
          //--New Label(Unit Cost) Task https://app.clickup.com/t/86azt6dfc  5/4/2024
          itemPricingSubList.addField({
            id: 'custpage_unit_cost',
            label: 'Unit Cost C/S',
            type: serverWidget.FieldType.TEXT,
          });
          // Current GP%-
          itemPricingSubList.addField({
            id: 'custpage_current_gp',
            label: 'Current GP%',
            type: serverWidget.FieldType.TEXT,
          });
          // Last Sale Date-
          itemPricingSubList.addField({
            id: 'custpage_last_sale_date',
            label: 'Last Sale Date',
            type: serverWidget.FieldType.TEXT,
          });
          //Las Sell
          itemPricingSubList.addField({
            id: 'custpage_last_sell',
            label: 'Last Sell C/S',
            type: serverWidget.FieldType.TEXT,
          });
          // Last Cost-
          itemPricingSubList.addField({
            id: 'custpage_last_cost',
            label: 'Last Cost C/S',
            type: serverWidget.FieldType.TEXT,
          });
          //Margin - Last GP %
          itemPricingSubList.addField({
            id: 'custpage_last_gp',
            label: 'Last GP%',
            type: serverWidget.FieldType.TEXT,
          });
          // Last Qty-
          itemPricingSubList.addField({
            id: 'custpage_last_quantity',
            label: 'Last Qty C/S',
            type: serverWidget.FieldType.TEXT,
          });
          itemPricingSubList.addField({
            id: 'custpage_wh_avail',
            label: 'WH Avail C/S',
            type: serverWidget.FieldType.TEXT,
          });
  } catch (error) {
    log.error('addColumnsToItemPricingSublist error',error)
  }
}
function getItemsLastShippDate (itemsIdsParam,customerId) {
  try {
    if(!itemsIdsParam || itemsIdsParam.length<=0) return [];
      var itemsIds = itemsIdsParam;
      var results = [];
      var last_iteration_length=0;
      var currentUserObj = runtime.getCurrentUser();
      var currentUserId = currentUserObj.id;
      if(currentUserId == 84418 || currentUserId ==  85394 || currentUserId ==  84419 || currentUserId ==  84957)log.debug('entro for 1 get items las ship date')
      for (let i = 0; i <= itemsIds.length && last_iteration_length!=itemsIds.length; i++) {
          last_iteration_length = itemsIds.length;
          var itemfulfillmentSearchObj = search.create({
            type: "itemfulfillment",
            filters:
            [
               ["type","anyof","ItemShip"], 
               "AND", 
               ["customermain.internalid","anyof",customerId], 
               "AND", 
               ["item","anyof",itemsIds]
            ],
            columns:
            [
               search.createColumn({name: "trandate",sort: search.Sort.DESC, label: "Transaction Date"}),
               search.createColumn({name: "item", label: "Item"}),
            ]
         });
         var result_item_values = itemfulfillmentSearchObj.run().getRange({ start: 0, end: 1000 })
         for (let i = 0; i <= itemsIds.length; i++) {
             var itemIdCompare = itemsIds[i];
             var indexOfItem = result_item_values.findIndex(i => i.getValue('item') == itemIdCompare);
             if (indexOfItem != -1) {
                 itemsIds = itemsIds.filter(item => item != itemIdCompare)
                 var resultObj = result_item_values[indexOfItem]
                 var result_obj_string = JSON.stringify(resultObj)
                 var result_obj_json = JSON.parse(result_obj_string)
                 var itemObj = {
                   internalId: result_obj_json.values.item[0]?.value,
                   shippedDate: result_obj_json?.values?.trandate,
                 }
                //  log.debug('itemObj',itemObj)
                 results.push(itemObj)
             }
         }
      }
      if(currentUserId == 84418 || currentUserId ==  85394 || currentUserId ==  84419 || currentUserId ==  84957) log.debug('salio for 1 get items las ship date')
     return results
  } catch (error) {
      log.error("getItemsLastShippDate",  'CustomerId Error '+customerId + ' Error: ' +  error);
  }
}
function getItemLastInvoiceResults (itemsIdsParam,customerId) {
  try {
    if(!itemsIdsParam || itemsIdsParam.length<=0) return {results:[], itemIds:itemsIdsParam}
      var itemsIds = itemsIdsParam;
      var results = [];
      var last_iteration_length=0;
      var currentUserObj = runtime.getCurrentUser();
      var currentUserId = currentUserObj.id;
      if(currentUserId == 84418 || currentUserId ==  85394 || currentUserId ==  84419 || currentUserId ==  84957)log.debug('entro for 1 get items last invoice result')
      for (let i = 0; i <= itemsIds.length && last_iteration_length!=itemsIds.length; i++) {
          last_iteration_length = itemsIds.length;
          var invoiceSearchObj = search.create({
            type: "invoice",
            filters:
            [
               ["type","anyof","CustInvc"], 
               "AND", 
               ["customermain.internalid","anyof",customerId], 
               "AND", 
               ["item","anyof",itemsIds]
            ],
            columns:
            [
               search.createColumn({name: "datecreated",sort: search.Sort.DESC, label: "Date Created"}),
               search.createColumn({name: "type", label: "Type"}),
               search.createColumn({name: "item", label: "Item"}),
               search.createColumn({name: "custcol_acc_unitcost", label: "Unit cost(Custom)"})
            ]
         });
          var result_item_values = invoiceSearchObj.run().getRange({ start: 0, end: 1000 })
          for (let i = 0; i <= itemsIds.length; i++) {
              var itemIdCompare = itemsIds[i];
              var indexOfItem = result_item_values.findIndex(i => i.getValue('item') == itemIdCompare);
              if (indexOfItem != -1) {
                  itemsIds = itemsIds.filter(item => item != itemIdCompare)
                  var resultObj = result_item_values[indexOfItem]
                  var result_obj_string = JSON.stringify(resultObj)
                  var result_obj_json = JSON.parse(result_obj_string)
                  // log.audit('result_obj_json',result_obj_json)
                  var itemObj = {
                    internalId: result_obj_json.values.item[0]?.value,
                    transactionDate: result_obj_json?.values?.datecreated,
                    transactionLastCost : result_obj_json.values?.custcol_acc_unitcost
                  }
                  // log.audit('itemObj',itemObj)
                  results.push(itemObj)
              }
          }
      }
      if(currentUserId == 84418 || currentUserId ==  85394 || currentUserId ==  84419 || currentUserId ==  84957)log.debug('salio for 1 get items last invoice result')
     return results
  } catch (error) {
      log.error("getItemLastInvoiceResults",  'CustomerId Error '+customerId + ' Error: ' +  error);
  }
}
function getItemLastSaleOrderResults(itemsIdsParam,customerId) {
  try {
     if(!itemsIdsParam || itemsIdsParam.length<=0) return {results:[], itemIds:itemsIdsParam}
      var itemsIds = itemsIdsParam;
      var results = [];
      var last_iteration_length=0;
      var currentUserObj = runtime.getCurrentUser();
      var currentUserId = currentUserObj.id;
      if(currentUserId == 84418 || currentUserId ==  85394 || currentUserId ==  84419 || currentUserId ==  84957)log.debug('entro for 1 getItemLastSaleOrderResults')
      for (let i = 0; i <= itemsIds.length && last_iteration_length!=itemsIds.length; i++) {
          last_iteration_length = itemsIds.length;
          var salesorderSearchObj = search.create({
            type: "salesorder",
            filters:
            [
               ["type","anyof","SalesOrd"], 
               "AND", 
               ["customermain.internalid","anyof",customerId], 
               "AND", 
               ["item","anyof",itemsIds]
            ],
            columns:
            [
               search.createColumn({name: "datecreated",sort: search.Sort.DESC ,label: "Date Created"}),
               search.createColumn({name: "item", label: "Item"}),
               search.createColumn({
                  name: "custitem_acc_commodity_code",
                  join: "item",
                  label: "Commodity Code"
               }),
               search.createColumn({
                  name: "quantityonhand",
                  join: "item",
                  label: "On Hand"
               }),
               search.createColumn({
                  name: "baseprice",
                  join: "item",
                  label: "Base Price"
               }),
               search.createColumn({name: "quantity", label: "Quantity"}),
               search.createColumn({name: "rate", label: "Item Rate"}),
               search.createColumn({name: "custcol_acme_markup_percent", label: "Markup %"})
            ]
         });
          var result_item_values = salesorderSearchObj.run().getRange({ start: 0, end: 1000 })
          for (let i = 0; i <= itemsIds.length; i++) {
              var itemIdCompare = itemsIds[i];
              var indexOfItem = result_item_values.findIndex(i => i.getValue('item') == itemIdCompare);
              if (indexOfItem != -1) {
                  itemsIds = itemsIds.filter(item => item != itemIdCompare)
                  var resultObj = result_item_values[indexOfItem]
                  var result_obj_string = JSON.stringify(resultObj)
                  var result_obj_json = JSON.parse(result_obj_string)
                  var itemObj = {
                    internalId: result_obj_json.values.item[0]?.value,
                    itemCommodityCode: result_obj_json.values['item.custitem_acc_commodity_code'][0]?.text,
                    itemWhAvail : result_obj_json.values['item.quantityonhand'],
                    itemBasePrice:result_obj_json.values['item.baseprice'],
                    orderLastQuantity:result_obj_json.values.quantity,
                    orderLastSale:result_obj_json.values.rate,
                    orderLastGP:result_obj_json.values.custcol_acme_markup_percent,
                  }
                  results.push(itemObj)
              }
          }
      }
      if(currentUserId == 84418 || currentUserId ==  85394 || currentUserId ==  84419 || currentUserId ==  84957)log.debug('salio for 1 getItemLastSaleOrderResults')
     return {results:results, itemIds:itemsIds}
  } catch (error) {
      log.error("getItemLastSaleOrderResults", 'CustomerId Error '+customerId + ' Error: ' +  error);
  }
}
function getItemsWithoutTransactionResults(itemsIds){
  try {
      if(!itemsIds || itemsIds.length<=0) return {results:[], itemIds:itemsIds}
      var results = [];
      var currentUserObj = runtime.getCurrentUser();
      var currentUserId = currentUserObj.id;
      if(currentUserId == 84418 || currentUserId ==  85394 || currentUserId ==  84419 || currentUserId ==  84957) log.debug('entro for 1 getItemsWithoutTransactionResults')
      for (let i = 0; i <= itemsIds.length; i++) {

          var item_values_search = search.create({
              type: "item",
              filters:
              [
                ["internalid", "anyof",itemsIds]
              ],
              columns:
              [ 
                search.createColumn({ name: "custitem_acc_commodity_code", label: "Commodity Code" }),
                search.createColumn({ name: "internalid", label: "Internal Id" }),
                search.createColumn({ name: "quantityonhand", label: "On Hand" }),
                search.createColumn({ name: "baseprice", label: "Base Price" }),
              ]
          });

          var result_item_values = item_values_search.run().getRange({ start: 0, end: 1000 })
          for (let i = 0; i <= itemsIds.length; i++) {
              var itemIdCompare = itemsIds[i];
              var indexOfItem = result_item_values.findIndex(i => i.id == itemIdCompare);
              if (indexOfItem != -1) {
                  itemsIds = itemsIds.filter(item => item != itemIdCompare)
                  var resultObj = result_item_values[indexOfItem]
                  var result_obj_string = JSON.stringify(resultObj)
                  var result_obj_json = JSON.parse(result_obj_string)
                  var itemObj = {
                    internalId: result_obj_json.values.internalid[0]?.value,
                    itemCommodityCode: result_obj_json.values.custitem_acc_commodity_code[0]?.text,
                    itemWhAvail : result_obj_json.values.quantityonhand,
                    itemBasePrice:result_obj_json.values.baseprice,
                  }
                  results.push(itemObj)
              }
          }
      }
      if(currentUserId == 84418 || currentUserId ==  85394 || currentUserId ==  84419 || currentUserId ==  84957)log.debug('salio for 1 getItemsWithoutTransactionResults')
      // log.debug(" item results.lengt",results.length)
     return {results:results, itemIds:itemsIds}

  } catch (error) {
      log.error("getItemsWithoutTransactionResults", 'CustomerId Error '+customerId + ' Error: ' +  error);
  }
}
function getRebatedCostForItems(customerId){
  try {
    var itemsRebatesCosts = [];
    var rebateCostItemSearch = search.create({
      type: "customrecord_rebate_parent",
      filters:
      [
         ["custrecord_rebate_customer_rebate_parent.custrecord_rebate_customer_customer","anyof",customerId]
      ],
      columns:
      [
         search.createColumn({
            name: "internalid",
            join: "CUSTRECORD_REBATE_ITEMS_PARENT",
            label: "Internal ID"
         }),
         search.createColumn({
            name: "custrecord_rebate_items_item",
            join: "CUSTRECORD_REBATE_ITEMS_PARENT",
            label: "Item"
         }),
         search.createColumn({
            name: "custrecord_rebate_items_rebate_cost",
            join: "CUSTRECORD_REBATE_ITEMS_PARENT",
            label: "Rebate Cost"
         })
      ]
   });
   var searchResultCount = rebateCostItemSearch.runPaged().count;
  //  log.debug("search rebate costs results count ",'Customer ID : '+ customerId +' ' + searchResultCount);
  var currentUserObj = runtime.getCurrentUser();
  var currentUserId = currentUserObj.id;
  if(currentUserId == 84418 || currentUserId ==  85394 || currentUserId ==  84419 || currentUserId ==  84957) log.debug('entro for 1 getRebatedCostForItems')
   for (let i = 0; i < searchResultCount; i=i+1000) {  
      var resultSet = rebateCostItemSearch.run();
      var start = i;
      var end  = start + 1000;
      var results = resultSet.getRange({ start: start, end: end  });
      results.forEach(result => {
        var resultString = JSON.stringify(result)
        var resultJson   = JSON.parse(resultString)
        itemsRebatesCosts.push({
          itemId:resultJson?.values['CUSTRECORD_REBATE_ITEMS_PARENT.custrecord_rebate_items_item'][0]?.value,
          itemRebateCost: resultJson?.values['CUSTRECORD_REBATE_ITEMS_PARENT.custrecord_rebate_items_rebate_cost']
        })
      });
   }
   if(currentUserId == 84418 || currentUserId ==  85394 || currentUserId ==  84419 || currentUserId ==  84957)log.debug('salio for 1 getRebatedCostForItems')
   return itemsRebatesCosts
  } catch (error) {
    log.error('getRebatedCostForItems ERROR: ' + 'Customer id:' + customerId , error)
  }
}
function addItemPricingSublistValues(customer, itemsLastInvoiceResults, itemsLastShippedDate , finalListResult,rebatesCostList){
  try {
    var currentUserObj = runtime.getCurrentUser();
    var currentUserId = currentUserObj.id;
    if(currentUserId == 84418 || currentUserId ==  85394 || currentUserId ==  84419 || currentUserId ==  84957) log.debug('entro for 1 addItemPricingSublistValues')
    for (let i = 0; i <= finalListResult.length; i++) {
      var result_obj_json = finalListResult[i];
      // log.debug('result_obj_json',result_obj_json)
      if(result_obj_json?.internalId){
        
      var line = customer.findSublistLineWithValue({ sublistId: 'itempricing', fieldId: 'item', value: result_obj_json.internalId });
      var lastInvoiceCostIndex = itemsLastInvoiceResults.findIndex(item=>item?.internalId==result_obj_json.internalId)
      var lastItemFulFillmentIndex = itemsLastShippedDate.findIndex(item=>item?.internalId==result_obj_json?.internalId)
      var rebateCost = rebatesCostList.find(item => item.itemId == finalListResult[i].id)
      // log.audit('entro')
      //commodity
      customer.setSublistValue({
        sublistId: 'itempricing',
        fieldId: 'custpage_commodity',
        line: line,
        value: (result_obj_json?.itemCommodityCode) ? result_obj_json?.itemCommodityCode : "N/A"
      });
      // WH Avail-
      customer.setSublistValue({
        sublistId: 'itempricing',
        fieldId: 'custpage_wh_avail',
        line: line,
        value: (result_obj_json?.itemWhAvail) ? result_obj_json?.itemWhAvail : "N/A"
      });

      // Loaded Cost-
      //Label changed to Unit Cost for task https://app.clickup.com/t/86azt6dfc 
      var unitCost = rebateCost?.itemRebateCost ? Number(rebateCost.itemRebateCost) + Number((rebateCost.itemRebateCost * 0.03))  : result_obj_json?.itemBasePrice
      // var unitCost = rebateCost?.itemRebateCost ? rebateCost.itemRebateCost : result_obj_json?.values['baseprice']
      customer.setSublistValue({
        sublistId: 'itempricing',
        fieldId: 'custpage_unit_cost',
        line: line,
        value: unitCost ? parseFloat(unitCost).toFixed(2) : "N/A"
      });      
  
      // Current GP%
      var currentSell = customer.getSublistValue({sublistId: 'itempricing',fieldId: 'price',line: line})
      var grossProfit = currentSell - unitCost;
      var currentGP   = (grossProfit / currentSell) * 100;
      customer.setSublistValue({
        sublistId: 'itempricing',
        fieldId: 'custpage_current_gp',
        line: line,
        // value: (result_obj_json&& result_obj_json?.values['formulatext'])? result_obj_json?.values['formulatext'] : "N/A"
        value: (currentSell == 0 || currentSell<=unitCost) ? "0.00" :  currentGP ? currentGP.toFixed(2) : "N/A"
      });
      //Current Cost
      // customer.setSublistValue({
      //   sublistId: 'itempricing',
      //   fieldId: 'custpage_current_cost',
      //   line: line,
      //   value: (result_obj_json&& result_obj_json?.values['custitem_acc_base_cost']) ? result_obj_json?.values['custitem_acc_base_cost'] : "N/A"
      // });

      //Last Cost
      customer.setSublistValue({
        sublistId: 'itempricing',
        fieldId: 'custpage_last_cost',
        line: line,
        value: (lastInvoiceCostIndex!=-1 && itemsLastInvoiceResults[lastInvoiceCostIndex]?.transactionLastCost) ? itemsLastInvoiceResults[lastInvoiceCostIndex].transactionLastCost : "N/A"
      });
      //Last sell
      customer.setSublistValue({
        sublistId: 'itempricing',
        fieldId: 'custpage_last_sell',
        line: line,
        value: (result_obj_json?.orderLastSale) ? result_obj_json?.orderLastSale : "N/A"
      });
      //Margin - Last GP%
      customer.setSublistValue({
        sublistId: 'itempricing',
        fieldId: 'custpage_last_gp',
        line: line,
        value: (result_obj_json?.orderLastGP) ? result_obj_json?.orderLastGP: "N/A"
      });
      //Last Sale date
      customer.setSublistValue({
        sublistId: 'itempricing',
        fieldId: 'custpage_last_sale_date',
        line: line,
        value: (lastItemFulFillmentIndex!=-1 && itemsLastShippedDate[lastItemFulFillmentIndex]?.shippedDate) ? itemsLastShippedDate[lastItemFulFillmentIndex]?.shippedDate : "N/A"
      });
      // Last Qty-
      customer.setSublistValue({
        sublistId: 'itempricing',
        fieldId: 'custpage_last_quantity',
        line: line,
        value: (result_obj_json?.orderLastQuantity) ? result_obj_json?.orderLastQuantity : "N/A"
      });
      // log.audit('salio')
    }
    }
    if(currentUserId == 84418 || currentUserId ==  85394 || currentUserId ==  84419 || currentUserId ==  84957) log.debug('salio for 1 addItemPricingSublistValues')
  } catch (error) {
    log.error('addItemPricingSublistValues error',error)
  }
}

  return {
    beforeLoad: beforeLoad,
  };
});




