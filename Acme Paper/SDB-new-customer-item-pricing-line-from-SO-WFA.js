/**
 * @NApiVersion 2.1
 * @NScriptType WorkFlowActionScript
 */
define(["N/log", "N/record",'N/search'], function (log, record,search) {

    function onAction(context) {
        try {
            var orderRecord = context.newRecord;
            var type = context.type;
            var customerId = orderRecord.getValue('entity')
            var customer = record.load({type: record.Type.CUSTOMER,id: customerId,isDynamic: true})
            var itemsCount = orderRecord.getLineCount({sublistId: 'item'})
            var wasUpdated = false;
            var createddate = search.lookupFields({
              type: record.Type.INVOICE,
              id: orderRecord.id,
              columns: ['datecreated']
            }).datecreated;
            log.debug('invoice reocrd dateCreated',createddate);
            for (let i = 0; i < itemsCount; i++) {
              var item = orderRecord.getSublistValue({
                sublistId: 'item',
                fieldId: 'item',
                line: i
              });
              var itemSellPrice = orderRecord.getSublistValue({
                sublistId: 'item',
                fieldId: 'rate',
                line: i
              });
              var alreadyExists = customer.findSublistLineWithValue({
                sublistId: 'itempricing',
                fieldId: 'item',
                value: item
              });
              if (alreadyExists == -1) {
                //If the item not exists in the itempricing sublist on customer record, a new CPL will be created on itempricing.
                try {
                  log.debug('new line created item:',item);
                    customer.selectNewLine({
                      sublistId: 'itempricing'
                    });
                    customer.setCurrentSublistValue({
                      sublistId: 'itempricing',
                      fieldId: 'item',
                      value: item,
                    });
                    customer.setCurrentSublistValue({
                      sublistId: 'itempricing',
                      fieldId: 'level',
                      value: -1, // -1 is 'Custom' value
                    });
                    customer.setCurrentSublistValue({
                      sublistId: 'itempricing',
                      fieldId: 'price',
                      value: itemSellPrice,
                    });
                    customer.commitLine({
                      sublistId: 'itempricing'
                    });
                    wasUpdated = true;  
                  } catch (error) {
                    log.error('Error','trying create new line' + error)
                  }
              }else{
                try {
                  //If the item alredy exists in itempricing sublist and the context is CREATE the line for the item on customer record will be updated.
                  if(type == 'create'){
                    log.debug('Edit Line create Mode','');
                    customer.selectLine({ sublistId: 'itempricing', line: alreadyExists });
                    customer.setCurrentSublistValue({sublistId:'itempricing',fieldId:'price',value:itemSellPrice});
                    customer.commitLine({sublistId: 'itempricing'});
                    wasUpdated = true;  
                  }
                  //If the item alredy exists in itempricing sublist and the context is EDIT the line for the item on customer record will be updated only if
                  //the invoice is the most recently invoice for the customer with that item.
                  if(type == 'edit' && mostRecentlyInvoiceForItem(item,customerId,createddate)) {
                    log.debug('Edit Line edit Mode','');
                    customer.selectLine({ sublistId: 'itempricing', line: alreadyExists });
                    customer.setCurrentSublistValue({sublistId:'itempricing',fieldId:'price',value:itemSellPrice});
                    customer.commitLine({sublistId: 'itempricing'});
                    wasUpdated = true;  
                  }
                } catch (error) {
                  log.error('Error', 'trying to edit CPL ' + error);
                }
              }
            }
            if (wasUpdated) {
              customer.setValue('custentity_sdb_item_pricing_updated', true)
              customer.save({ ignoreMandatoryFields: true });
            }
        } catch (error) {
            log.error('onAction', error)
        }
    }
    function mostRecentlyInvoiceForItem(item,customerId,createddate){
      try {
        var isLastOrder = false;
        var invoiceSearchObj  = search.create({
          type: "invoice",
          filters:
          [
             ["type","anyof","CustInvc"], 
             "AND", 
             ["customermain.internalid","anyof",customerId], 
             "AND", 
             ["item","anyof",item]
          ],
          columns:
          [
            search.createColumn({name: "datecreated",sort: search.Sort.DESC, label: "Date Created"})
          ]
       });
       invoiceSearchObj .run().each(function(result){
          //Get the date of the last invoice for the customer with the item.
          //Check If the invoices that the user is updating is the most recently invoice for the customer and item.
          var lastOrderDate = result.getValue({name:'datecreated'});
          if(lastOrderDate == createddate) isLastOrder = true;
          log.debug('invoice record created date',createddate);
          log.debug('last invoice order date',lastOrderDate);
          return false;
       });
       return isLastOrder;
      } catch (error) {
        log.error('mostRecentlyInvoiceForItem',error)
      }
    }
    return {
        onAction: onAction
    }
});
