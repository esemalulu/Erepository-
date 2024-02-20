/**
 * @NApiVersion 2.1
 * @NScriptType UserEventScript
 */
 define(['N/runtime', 'N/record'],

 (runtime, record) => {
     /**
      * Defines the function definition that is executed before record is loaded.
      * @param {Object} scriptContext
      * @param {Record} scriptContext.newRecord - New record
      * @param {string} scriptContext.type - Trigger type; use values from the context.UserEventType enum
      * @param {Form} scriptContext.form - Current form
      * @param {ServletRequest} scriptContext.request - HTTP request information sent from the browser for a client action only.
      * @since 2015.2
      */
     const beforeLoad = (scriptContext) => {

     }

     /**
      * Defines the function definition that is executed before record is submitted.
      * @param {Object} scriptContext
      * @param {Record} scriptContext.newRecord - New record
      * @param {Record} scriptContext.oldRecord - Old record
      * @param {string} scriptContext.type - Trigger type; use values from the context.UserEventType enum
      * @since 2015.2
      */
     const beforeSubmit = (scriptContext) => {
         //If either of the "Completely Discount for XX Goodwill" boxes are checked, add a line item for the complete discount.
         var completeDiscountItem = null;
         var scriptObject = runtime.getCurrentScript();
         var discountItemOnOrder = null;   
         var totalAmount = 0;
         var salesDiscountItem =  scriptObject.getParameter('custscriptgd_salesgoodwilldiscountitem'); 
         var serviceDiscountItem = scriptObject.getParameter('custscriptgd_servicegoodwilldiscountitem');
         var currentItem = '';

         if (scriptContext.newRecord.getValue('custbodygd_completediscountsalesgood') == true) {
             completeDiscountItem = salesDiscountItem;
         }
         else if (scriptContext.newRecord.getValue('custbodygd_completediscountservicegood') == true) {
             completeDiscountItem = serviceDiscountItem;
         }

         if (completeDiscountItem != null && completeDiscountItem.length > 0) {
             //loop through item lines and check if the discountItem we found is already on the order, if so update it
             for (i = 0; i < scriptContext.newRecord.getLineCount('item'); i++) {
                 currentItem = scriptContext.newRecord.getSublistValue({ sublistId: 'item', fieldId: 'item', line: i });
                 if (currentItem == completeDiscountItem) {
                     discountItemOnOrder = i;  //we found our discount item on the order, store the line we found it on so we can update this line
                 }
                 else{
                     totalAmount += scriptContext.newRecord.getSublistValue({sublistId: 'item', fieldId: 'amount', line: i});  //if it's not a discount line add it's value to running total
                 }
             }

             //if we didn't find the discount item on order already then add it
             if (discountItemOnOrder == null) {
                 log.debug('Didnt find the item');
                 //Add a single line for the discount item. Get the total of the Invoice and multiply it by -1 to get the rate/amount
                 length = scriptContext.newRecord.getLineCount('item');
                 scriptContext.newRecord.insertLine({
                     sublistId: 'item',
                     line: length
                 });

                 //set item on the new goodwill discount line
                 scriptContext.newRecord.setSublistValue({
                     sublistId: 'item',
                     fieldId: 'item',
                     line: length,
                     value: completeDiscountItem
                 });

                 scriptContext.newRecord.setSublistValue({
                     sublistId: 'item',
                     fieldId: 'price',
                     line: length,
                     value: -1
                 });

                 scriptContext.newRecord.setSublistValue({
                     sublistId: 'item',
                     fieldId: 'rate',
                     line: length,
                     value: scriptContext.newRecord.getValue('total') * -1
                 });
             }
             else {
                 //if the discountItem is on order check if the total amount has changed, if it has changed then update the discountItem with the
                 //total amount from non-discount lines
                 if (scriptContext.newRecord.getValue('total') != 0.00) {
                     log.debug('New rate: ', totalAmount);
                     scriptContext.newRecord.setSublistValue({
                         sublistId: 'item',
                         fieldId: 'rate',
                         line: discountItemOnOrder,
                         value: totalAmount * -1
                     });
                 }
             }
         }
     }

     /**
      * Defines the function definition that is executed after record is submitted.
      * @param {Object} scriptContext
      * @param {Record} scriptContext.newRecord - New record
      * @param {Record} scriptContext.oldRecord - Old record
      * @param {string} scriptContext.type - Trigger type; use values from the context.UserEventType enum
      * @since 2015.2
      */
     const afterSubmit = (scriptContext) => {

     }

     return { beforeLoad, beforeSubmit, afterSubmit }

 });
