/**
 * @NApiVersion 2.1
 * @NScriptType UserEventScript
 * @NModuleScope SameAccount
 */
define(['N/log'],
  function (log) {


    function beforeSubmit(context) {
      try {
        var newRecord = context.newRecord
        var loc = newRecord.getValue({
          fieldId: 'location'
        });
        var buyer = newRecord.getValue({
          fieldId: 'custbody_acc_buyer'
        });

        var itemCount = newRecord.getLineCount({
          sublistId: 'item'
        });

        for (var i = 0; i < itemCount; i++) {
          var po_location = newRecord.getSublistValue({
            sublistId: 'item',
            fieldId: 'location',
            line: i
          });

          if (po_location != '') newRecord.setSublistValue({
            sublistId: 'item',
            fieldId: 'location',
            line: i,
            value: loc
          });

          if (i != 0 || !buyer) return;

          var lineBuyer = newRecord.getSublistValue('item', 'custcol_acc_buyer', i);
          var currentBuyer = newRecord.getValue('custbody_acc_buyer');
          if (lineBuyer && (!currentBuyer || currentBuyer == -4)) newRecord.setValue({
            fieldId: 'custbody_acc_buyer',
            value: lineBuyer,
            ignoreFieldChange: true
          });



        }
      } catch (error) {
        log.error("Error at beforeSubmit", error)
      }
    }

    return {
      beforeSubmit: beforeSubmit,
    };
  });
