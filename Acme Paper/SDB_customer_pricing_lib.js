/**
 * SDB_customer_pricing_lib
 * @NApiVersion 2.0
 * @NModuleScope TargetAccount
 */

 define(['N/record', 'N/search', 'N/http', 'N/https', 'N/config', 'N/format'],

 function (record, search, http, https, config, format) {

     function getItemIds(rec, lines) {
         try {
             var itemIds = [];
             for (var i = 0; i < lines; i++) {
                 rec.selectLine({
                     sublistId: 'item',
                     line: i
                 })
                 var item = rec.getCurrentSublistValue({
                     sublistId: 'item',
                     fieldId: 'item',
                 })
                 itemIds.push(item);
             }
         } catch (error) {
             log.error({
                 title: 'getItemIds',
                 details: error
             })
         }
         itemIds = itemIds.filter(onlyUnique);
         return itemIds;
     }

     function getPermanentPricedLines(rec) {
         try {
             var lineCount = rec.getLineCount({ sublistId: 'item' });
             var itemsArr = [];
             for (var i = 0; i < lineCount; i++) {
                 rec.selectLine({ sublistId: 'item', line: i })
                 var permanentPrice = rec.getCurrentSublistValue({ sublistId: 'item', fieldId: 'custcol_acme_permanent_price', line: i });
                 var permanentPriceUpdated = rec.getCurrentSublistValue({ sublistId: 'item', fieldId: 'custcol_acme_permanent_price_updated', line: i });
                 if (permanentPrice == true && permanentPriceUpdated == false) {
                     var item = rec.getCurrentSublistValue({ sublistId: 'item', fieldId: 'item', line: i });
                     var qty = rec.getCurrentSublistValue({ sublistId: 'item', fieldId: 'quantity', line: i });
                     var price = rec.getCurrentSublistValue({ sublistId: 'item', fieldId: 'rate', line: i });
                     itemsArr.push({ line: i, item: item, price: price, ex_total: (Number(price) * Number(qty)) });
                 }
             }
             return itemsArr;
         }
         catch (error) {
             log.error('Error in permanentPricedLines', error.toString());
         }
     }

     function getRebatePrice(itemId, customerId, isDropShip) {
         try {
             var rebateObj = {
                 // rebateCost: -1,
                 // rebateId: -1,
                 // originalCost: -1
             }
             var customrecord_rebate_parentSearchObj = search.create({
                 type: "customrecord_rebate_parent",
                 filters:
                     [
                         ["custrecord_rebate_customer_rebate_parent.custrecord_rebate_customer_customer", "anyof", customerId],
                         "AND",
                         ["custrecord_rebate_items_parent.custrecord_rebate_items_item", "anyof", itemId]
                     ],
                 columns:
                     [
                         search.createColumn({
                             name: "custrecord_rebate_items_rebate_cost",
                             join: "CUSTRECORD_REBATE_ITEMS_PARENT",
                             label: "Rebate Cost"
                         }),
                         search.createColumn({
                             name: "custrecord_rebate_items_item",
                             join: "CUSTRECORD_REBATE_ITEMS_PARENT",
                             label: "Item"
                         }),
                         search.createColumn({ name: "custrecord_rebate_additional_load_cb", label: "Additional Load" }),
                         search.createColumn({ name: "custrecord_rebate_load_value", label: "Load Value (Margin)" })
                     ]
             });
             var arr = [];
             var searchResultCount = customrecord_rebate_parentSearchObj.runPaged().count;
             log.debug("customrecord_rebate_parentSearchObj result count", searchResultCount);
             customrecord_rebate_parentSearchObj.run().each(function (result) {
                 rebateObj.item = result.getValue({
                     name: "custrecord_rebate_items_item",
                     join: "CUSTRECORD_REBATE_ITEMS_PARENT"
                 })
                 rebateObj.rebateCost = Number(result.getValue({
                     name: "custrecord_rebate_items_rebate_cost",
                     join: "CUSTRECORD_REBATE_ITEMS_PARENT"
                 }))
                 rebateObj.originalCost = rebateObj.rebateCost;
                 rebateObj.rebateId = result.id
                 if (isDropShip === false || isDropShip === 'F') {
                     var additionalLoad = result.getValue('custrecord_rebate_additional_load_cb')
                     if (additionalLoad === true || additionalLoad === 'T') {
                         var loadValue = Number(result.getValue('custrecord_rebate_load_value'));
                         var qtyToAdd = Number((rebateObj.rebateCost * loadValue) / 100)
                         rebateObj.rebateCost = rebateObj.rebateCost + qtyToAdd
                     }
                 }
                 arr.push(rebateObj)
                 return true
                 //return false;
             });
             return arr;
             //return rebateObj;
         } catch (e) {
             log.error('error at getRebatePrice', e)
         }
     };

     function getVendorPrice(itemId) {
         try {
             var vendorCostObj = {};
             var itemSearchObj = search.create({
                 type: "item",
                 filters:
                     [
                         ["internalid", "anyof", itemId]
                     ],
                 columns:
                     [
                          search.createColumn({
                             name: "vendorcost",
                             sort: search.Sort.ASC,
                             label: "Vendor Price"
                         }),
                         search.createColumn({ name: "costestimate", label: "Item Defined Cost" })
                     ]
             });
             var searchResultCount = itemSearchObj.runPaged().count;
             log.debug("itemSearchObj result count", searchResultCount);
             var arr = []
             itemSearchObj.run().each(function (result) {
                 var newVendorCost = result.getValue('vendorcost');
                 var newLoadedCost = result.getValue('costestimate');
                 if (newVendorCost || newLoadedCost) {
                     arr.push({
                         item: result.id,
                         vendorCost: newVendorCost || -1,
                         loadedCost: newLoadedCost || -1
                     })
                 }

                 return true;
             });
             log.audit("arrAll", arr);
             return arr;
         } catch (e) {
             log.error('Error at getVendorPrice', e)
         }
     };
     function getLoadedCost(itemId) {
         try {
             var loadedCostObj = {
                 // loadedCost: -1 
             }
             var itemSearchObj = search.create({
                 type: "item",
                 filters:
                     [
                         ["internalid", "anyof", itemId]
                     ],
                 columns:
                     [
                         search.createColumn({ name: "costestimate", label: "Item Defined Cost" })
                     ]
             });
             var searchResultCount = itemSearchObj.runPaged().count;
             log.debug("itemSearchObj getLoadedCost count", searchResultCount);
             var arrloadedCostObj = []
             itemSearchObj.run().each(function (result) {
                 var newLoadedCost = result.getValue('costestimate');
                 if (newLoadedCost) {
                     // loadedCostObj.item = result.id;
                     // loadedCostObj.loadedCost = newLoadedCost;
                     arrloadedCostObj.push({
                         item: result.id,
                         loadedCost: newLoadedCost
                     })
                 }

                 return true;
             });
             log.debug("arrloadedCostObj", arrloadedCostObj);
             return arrloadedCostObj
         } catch (error) {
             log.error('Error at getLoadedCost', error)
         }
     }

     function updateCustomerSpecificPricing(lineItems, customer, rec) {
         try {
             var customerRec = record.load({ type: 'customer', id: customer, isDynamic: true });
             for (var i = 0; i < lineItems.length; i++) {
                 var line = customerRec.findSublistLineWithValue({
                     sublistId: 'itempricing',
                     fieldId: 'item',
                     value: lineItems[i].item
                 });
                 if (line == -1) {
                     customerRec.selectNewLine({ sublistId: 'itempricing' });
                     customerRec.setCurrentSublistValue({ sublistId: 'itempricing', fieldId: 'item', value: lineItems[i].item });
                     customerRec.setCurrentSublistValue({ sublistId: 'itempricing', fieldId: 'level', value: -1 });
                     customerRec.setCurrentSublistValue({ sublistId: 'itempricing', fieldId: 'price', value: lineItems[i].price.toFixed(2) });
                     customerRec.commitLine({ sublistId: 'itempricing' });

                 }
                 else {
                     customerRec.selectLine({ sublistId: 'itempricing', line: line });
                     customerRec.setCurrentSublistValue({ sublistId: 'itempricing', fieldId: 'level', value: -1 });
                     customerRec.setCurrentSublistValue({ sublistId: 'itempricing', fieldId: 'price', value: lineItems[i].price.toFixed(2) });
                     customerRec.commitLine({ sublistId: 'itempricing' });
                 }
             }
             var customerId = customerRec.save({ ignoreMandatoryFields: true });
             return customerId;
         }
         catch (error) {
             log.error('Error in updateCustomerSpecificPricing', error.toString());
         }
     }

      function updatePricedLines(lineItems, rec) {
         try {
             for (var i = 0; i < lineItems.length; i++) {
                 rec.selectLine({
                     sublistId: 'item',
                     line: Number(lineItems[i].line)
                 })
                 rec.setCurrentSublistValue({ sublistId: 'item', fieldId: 'custcol_acme_permanent_price_updated', value: true });
                 rec.commitLine({ sublistId: 'item' });
             }
         }
         catch (error) {
             log.error('Error in updatePricedLines', error.toString());
         }
     };

     function isEmpty(stValue) {
         if ((stValue == null) || (stValue == '') || (stValue == ' ') || (stValue == undefined)) {
             return true;
         } else {
             return false;
         }
     };

     function onlyUnique(value, index, array) {
         return array.indexOf(value) === index;
     }

     return {
         getItemIds: getItemIds,
         getPermanentPricedLines: getPermanentPricedLines,
         getRebatePrice: getRebatePrice,
         getVendorPrice: getVendorPrice,
         getLoadedCost: getLoadedCost,
         updateCustomerSpecificPricing: updateCustomerSpecificPricing,
         updatePricedLines: updatePricedLines,
         isEmpty: isEmpty
     };

 });