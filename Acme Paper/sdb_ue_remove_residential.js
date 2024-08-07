/**
 *@NApiVersion 2.1
 *@NScriptType UserEventScript
 */
 define(["N/log", "N/ui/serverWidget", "N/search", "N/runtime",], function (log, serverWidget, search, runtime) {
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
      var priceField = itemPricingSubList.getField({ id: 'price' });
      priceField.label = "Current Sell"

      //-----------------------START Edit Item Pricing Button Logic----------------------
      var customerId = customer.id;
      var currentUserObj = runtime.getCurrentUser();
      var customerRole = currentUserObj.role;
      addEditItemPricingButton(customerId, customerRole, form);
      //-----------------------END Edit Item Pricing Button Logic----------------------

      //-----------------------START Item Pricing Columns Logic----------------------
      addColumnsToItemPricingSublist(itemPricingSubList);

      var itemPricingLines = customer.getLineCount({sublistId: 'itempricing'});
      var itemsIds = [];
      var dataToAdd = [];
      for (let i = 0; i < itemPricingLines; i++) {
        var itemId = customer.getSublistValue({ sublistId: 'itempricing', fieldId: 'item', line: i, });
        itemsIds.push(itemId);
        dataToAdd.push({ internalId: itemId, shippedDate: null, transactionLastCost: null, itemCommodityCode: null, itemWhAvail: null, itemBasePrice: null, orderLastQuantity: null, orderLastSale: null, orderLastGP: null, invoiceProcessed: false});
      }
      if(!itemsIds || itemsIds?.length<=0)return;
      //Set last shipped date
      getItemsLastShippDate(dataToAdd, itemsIds, customerId)
      //Set last invoice values per item
      var itemsIdsWithoutResults = getItemLastInvoiceResults(dataToAdd, itemsIds, customerId);
      log.debug('itemsIds.length' + itemsIds.length, 'itemsIdsWithoutResults.length' + itemsIdsWithoutResults.length);
      //Set items data for the items that not are in a invoice
      getItemsWithoutTransactionResults(dataToAdd, itemsIdsWithoutResults, customerId)
      //Get rebated cost for customer items
      var rebatesCostList = getRebatedCostForItems(customerId);
      //Set items values on item pricing sublist
      addItemPricingSublistValues(customer, dataToAdd, rebatesCostList);
    } catch (error) {
      log.error("beforeLoad error", 'CustomerId Error ' + customerId + ' Error: ' + error);
    }
  }

  function addEditItemPricingButton(customerId, customerRole, form) {
    try {
      const fieldLookUp = search.lookupFields({
        type: "customrecord_sdb_role_pricing_edits",
        id: 1,
        columns: ["custrecord_sdb_role_permission"],
      });
      var rolesPermissionList = fieldLookUp.custrecord_sdb_role_permission;
      var rolesPermissionListValues = [];
      for (let i = 0; i < rolesPermissionList.length; i++) {
        rolesPermissionListValues.push(Number(rolesPermissionList[i]?.value))
      }
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
      log.error('addEditItemPricingButton error', error)
    }
  }
  function addColumnsToItemPricingSublist(itemPricingSubList) {
    try {
      //Unit Price - Current Sell

      // commodity-
      itemPricingSubList.addField({
        id: 'custpage_commodity',
        label: 'Commodity',
        type: serverWidget.FieldType.TEXT,
      });
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
      log.error('addColumnsToItemPricingSublist error', error)
    }
  }
  function getItemsLastShippDate(dataToAdd, itemsIdsParam, customerId) {
    try {
      if (!itemsIdsParam || itemsIdsParam.length <= 0) return [];
      var itemfulfillmentSearchObj = search.create({
        type: "itemfulfillment",
        filters:
          [
            ["type", "anyof", "ItemShip"],
            "AND",
            ["customermain.internalid", "anyof", customerId],
            "AND",
            ["item", "anyof", itemsIdsParam]
          ],
        columns:
          [
            search.createColumn({ name: "item", summary: "GROUP", label: "Type" }),
            search.createColumn({ name: "trandate", summary: "MAX", sort: search.Sort.DESC, label: "Transaction Date" }),
          ]
      });
      itemfulfillmentSearchObj.run().each(function (result) {
        var itemId = result.getValue({ name: 'item', summary: 'GROUP' });
        var indexItem = dataToAdd.findIndex(item => item.internalId == itemId)
        dataToAdd[indexItem].shippedDate = result.getValue({ name: 'trandate', summary: 'MAX' });
        return true;
      });
    } catch (error) {
      log.error("getItemsLastShippDate", 'CustomerId Error ' + customerId + ' Error: ' + error);
    }
  }
  function getItemLastInvoiceResults(dataToAdd, itemsIdsParam, customerId) {
    try {
      if (!itemsIdsParam || itemsIdsParam.length <= 0) return { results: [], itemIds: itemsIdsParam }
      var invoiceSearchObj = search.create({
        type: "invoice",
        filters:
        [
           ["type","anyof","CustInvc"], 
           "AND", 
           ["customermain.internalid","anyof",customerId], 
           "AND", 
           ["item","anyof",itemsIdsParam],
           "AND",
           ["taxline","is","F"], 
           "AND", 
           ["shipping","is","F"], 
           "AND", 
           ["cogs","is","F"], 
           "AND", 
           ["item.type","anyof","InvtPart","NonInvtPart","OthCharge"]
        ],
        columns:
        [
           search.createColumn({name: "datecreated",summary: "MAX",sort: search.Sort.DESC,label: "Date Created"}),
           search.createColumn({name: "internalid",summary: "GROUP",label: "Internal ID"}),
           search.createColumn({name: "item",summary: "GROUP",label: "Item"}),
           search.createColumn({name: "quantity",summary: "MAX",label: "Quantity"}),
           search.createColumn({name: "custcol_acme_markup_percent",summary: "MAX",label: "Markup %"}),
           search.createColumn({name: "custcol_acc_unitcost",summary: "MAX",label: "Unit cost(Custom)"}),
           search.createColumn({name: "rate",summary: "MAX",label: "Item Rate"}),
           search.createColumn({name: "custitem_acc_commodity_code",join: "item",summary: "MAX",label: "Commodity Code"}),
           search.createColumn({name: "quantityonhand",join: "item",summary: "MAX",label: "On Hand"}),
           search.createColumn({name: "baseprice",join: "item",summary: "MAX",label: "Base Price"})
        ]
     });
     var searchResultCount = invoiceSearchObj.runPaged().count;
     for (let i = 0; i < searchResultCount; i = i + 1000) {
      var resultSet = invoiceSearchObj.run();
      var start = i;
      var end = start + 1000;
      var results = resultSet.getRange({ start: start, end: end });
      results.forEach(result => {
        var itemId = result.getValue({name:'item',summary:'GROUP'});
        var indexItem = dataToAdd.findIndex(item => item.internalId == itemId)
        if(indexItem!=-1 && !dataToAdd[indexItem].invoiceProcessed){
          itemsIdsParam = itemsIdsParam.filter(item => item != itemId );
          dataToAdd[indexItem].transactionLastCost = result.getValue({name:'custcol_acc_unitcost',summary:'MAX'});
          dataToAdd[indexItem].orderLastSale = result.getValue({name:'rate',summary:'MAX'});
          dataToAdd[indexItem].orderLastGP = result.getValue({name:'custcol_acme_markup_percent', summary:'MAX'});
          dataToAdd[indexItem].orderLastQuantity = result.getValue({name:'quantity', summary:'MAX'});
          dataToAdd[indexItem].itemCommodityCode = result.getValue({name:'custitem_acc_commodity_code',join:'item',summary:'MAX'});
          dataToAdd[indexItem].itemWhAvail = result.getValue({name:'quantityonhand',join:'item',summary:'MAX'});
          dataToAdd[indexItem].itemBasePrice = result.getValue({name:'baseprice',join:'item',summary:'MAX'});
          dataToAdd[indexItem].invoiceProcessed = true;
        }
        return true;
      });
    }
     return itemsIdsParam;
    } catch (error) {
      log.error("getItemLastInvoiceResults", 'CustomerId Error ' + customerId + ' Error: ' + error);
    }
  }
  function getItemsWithoutTransactionResults(dataToAdd, itemsIds, customerId) {
    try {
      if (!itemsIds || itemsIds.length <= 0) return [];
      var item_values_search = search.create({
        type: "item",
        filters:
          [
            ["internalid", "anyof", itemsIds]
          ],
        columns:
          [
            search.createColumn({ name: "custitem_acc_commodity_code", label: "Commodity Code" }),
            search.createColumn({ name: "internalid", label: "Internal Id" }),
            search.createColumn({ name: "quantityonhand", label: "On Hand" }),
            search.createColumn({ name: "baseprice", label: "Base Price" }),
          ]
      });
      item_values_search.run().each(function (result) {
        var itemId = result.getValue({ name: 'internalid' });
        var indexItem = dataToAdd.findIndex(item => item.internalId == itemId)
        dataToAdd[indexItem].itemCommodityCode = result.getText({ name: 'custitem_acc_commodity_code' })
        dataToAdd[indexItem].itemWhAvail = result.getValue({ name: 'quantityonhand' })
        dataToAdd[indexItem].itemBasePrice = result.getValue({ name: 'baseprice' })
        return true;
      });
      // return dataToAdd;
    } catch (error) {
      log.error("getItemsWithoutTransactionResults", 'CustomerId Error ' + customerId + ' Error: ' + error);
    }
  }
  function getRebatedCostForItems(customerId) {
    try {
      var itemsRebatesCosts = [];
      var rebateCostItemSearch = search.create({
        type: "customrecord_rebate_parent",
        filters:
          [
                                 ["isinactive", "is", "F"],
                        "AND",
                        ["custrecord_rebate_start_date", "onorbefore", "today"],
                        "AND",
                        ["custrecord_rebate_end_date", "onorafter", "today"],
                        "AND",
            ["custrecord_rebate_customer_rebate_parent.custrecord_rebate_customer_customer", "anyof", customerId]
          ],
        columns:
          [
            search.createColumn({name: "internalid",join: "CUSTRECORD_REBATE_ITEMS_PARENT",label: "Internal ID"}),
            search.createColumn({name: "custrecord_rebate_items_item",join: "CUSTRECORD_REBATE_ITEMS_PARENT",label: "Item"}),
            search.createColumn({name: "custrecord_rebate_items_rebate_cost",join: "CUSTRECORD_REBATE_ITEMS_PARENT",label: "Rebate Cost"})
          ]
      });
      var searchResultCount = rebateCostItemSearch.runPaged().count;
      for (let i = 0; i < searchResultCount; i = i + 1000) {
        var resultSet = rebateCostItemSearch.run();
        var start = i;
        var end = start + 1000;
        var results = resultSet.getRange({ start: start, end: end });
        results.forEach(result => {
          itemsRebatesCosts.push({
            itemId: result.getValue({ name: "custrecord_rebate_items_item", join: "CUSTRECORD_REBATE_ITEMS_PARENT" }),
            itemRebateCost: result.getValue({ name: "custrecord_rebate_items_rebate_cost", join: "CUSTRECORD_REBATE_ITEMS_PARENT" })
          })
        });
      }
      return itemsRebatesCosts
    } catch (error) {
      log.error('getRebatedCostForItems ERROR: ' + 'Customer id:' + customerId, error)
    }
  }
  function addItemPricingSublistValues(customer, finalListResult, rebatesCostList) {
    try {
        finalListResult.forEach(element => {
        // var element = finalListResult[i];
        if (!element?.internalId) return;
          var line = customer.findSublistLineWithValue({ sublistId: 'itempricing', fieldId: 'item', value: element.internalId });
          var rebateCost = rebatesCostList.find(item => item.itemId == element.internalId)
          //commodity
          customer.setSublistValue({
            sublistId: 'itempricing',
            fieldId: 'custpage_commodity',
            line: line,
            value:  element?.itemCommodityCode || "N/A"
          });
          // WH Avail-
          customer.setSublistValue({
            sublistId: 'itempricing',
            fieldId: 'custpage_wh_avail',
            line: line,
            value: element?.itemWhAvail || "N/A"
          });
                    var itemRebateCost = rebateCost?.itemRebateCost ? Number(rebateCost.itemRebateCost) + Number((rebateCost.itemRebateCost * 0.03)) : 0
          var unitCost =  itemRebateCost && itemRebateCost < element?.itemBasePrice ?  itemRebateCost : element?.itemBasePrice
          customer.setSublistValue({
            sublistId: 'itempricing',
            fieldId: 'custpage_unit_cost',
            line: line,
            value: unitCost ? parseFloat(unitCost).toFixed(2) : "N/A"
          });
          // Current GP%
          var currentSell = customer.getSublistValue({ sublistId: 'itempricing', fieldId: 'price', line: line })
          var grossProfit = currentSell - unitCost;
          var currentGP = (grossProfit / currentSell) * 100;
          customer.setSublistValue({
            sublistId: 'itempricing',
            fieldId: 'custpage_current_gp',
            line: line,
            value: (currentSell == 0 || currentSell <= unitCost) ? "0.00" : currentGP ? currentGP.toFixed(2) : "N/A"
          });
          //Last Cost
          customer.setSublistValue({
            sublistId: 'itempricing',
            fieldId: 'custpage_last_cost',
            line: line,
            value: element?.transactionLastCost || "N/A"
          });
          //Last sell
          customer.setSublistValue({
            sublistId: 'itempricing',
            fieldId: 'custpage_last_sell',
            line: line,
            value: element?.orderLastSale || "N/A"
          });
          //Margin - Last GP%
          customer.setSublistValue({
            sublistId: 'itempricing',
            fieldId: 'custpage_last_gp',
            line: line,
            value: element?.orderLastGP || "N/A"
          });
          //Last Sale date
          customer.setSublistValue({
            sublistId: 'itempricing',
            fieldId: 'custpage_last_sale_date',
            line: line,
            value:  element?.shippedDate || "N/A"
          });
          // Last Qty-
          customer.setSublistValue({
            sublistId: 'itempricing',
            fieldId: 'custpage_last_quantity',
            line: line,
            value: element?.orderLastQuantity || "N/A"
          });
      });
    } catch (error) {
      log.error('addItemPricingSublistValues error', error)
    }
  }

  return {
    beforeLoad: beforeLoad,
  };
});



