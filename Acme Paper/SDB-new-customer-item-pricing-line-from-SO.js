/**
 *@NApiVersion 2.1
 *@NScriptType UserEventScript
 */
 define(["N/log", "N/record"], function (log, record) {

  function afterSubmit(context) {
    try {
      var orderRecord = context.newRecord;
      var type = context.type;
      if (type != 'create' && type != 'edit') return;
      var customerId = orderRecord.getValue('entity')
      var customer = record.load({
        type: record.Type.CUSTOMER,
        id: customerId,
        isDynamic: true,
      })

      var itemsCount = orderRecord.getLineCount({
        sublistId: 'item'
      })

      var wasUpdated = false;
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
        })
        if (alreadyExists == -1) {
          try {
            // log.debug('NOT exists item', 'item ' +  item + ' ' +alreadyExists)
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
        }
      }
      if (wasUpdated) {
        customer.setValue('custentity_customer_price_updated', true)
        customer.save({ ignoreMandatoryFields: true });
      }

    } catch (error) {
      log.error("error", error);
    }
  }

  return {
    afterSubmit: afterSubmit,
  };
});




