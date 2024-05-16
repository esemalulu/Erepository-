/**
 * @NApiVersion 2.x
 * @NScriptType UserEventScript
 * @NModuleScope SameAccount
 */
define(['N/search', 'N/log', 'N/record', 'N/currentRecord'],
  function (search, log, record, currentRecord) {
    function beforeLoad(scriptContext) {
      // Tu lógica antes de la carga aquí si es necesario
    }

    function beforeSubmit(context) {
      // Tu lógica antes de la presentación aquí si es necesario
    }

    function afterSubmit(scriptContext) {
      log.debug('Debug', 'Inside after submit');
      var newRecord = record.load({
        type: scriptContext.newRecord.type,
        id: scriptContext.newRecord.id,
      });

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

        if (po_location != '') {
          newRecord.setSublistValue({
            sublistId: 'item',
            fieldId: 'location',
            line: i,
            value: loc
          });
        }


        /**
         * @Task Buyer field on Purchase orders  Clickup Task Code/Id: 86ayzy2qv  https://app.clickup.com/t/86ayzy2qv
         * @Date 1 / 17 / 2024
         * @Context This code was commented for the task 'Buyer field on Purchase orders' to cancel the logic that hard set the PO buyer body field with the buyer
         *          of the first item line of the PO 
         */
        //1/19/2024 Decommented code for the task: https://app.clickup.com/t/86az3fu5f
        if (i === 0 && buyer === '') {
          var lineBuyer = newRecord.getSublistValue('item', 'custcol_acc_buyer', i);
          if (lineBuyer !== '') {
            newRecord.setValue({
              fieldId: 'custbody_acc_buyer',
              value: lineBuyer,
              ignoreFieldChange: true
            });
            log.debug('Debug', 'Buyer set to: ' + lineBuyer);
          }
        }

        

      }
      newRecord.save();
    }

    return {
      beforeLoad: beforeLoad,
      beforeSubmit: beforeSubmit,
      afterSubmit: afterSubmit
    };
  });
