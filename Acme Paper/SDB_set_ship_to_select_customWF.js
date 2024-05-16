/**
 * @NApiVersion 2.1
 * @NScriptType WorkflowActionScript
 */

define(["N/log", "N/record"], function (log,record) {
    function onAction (context){
        try {
            var rec = context.newRecord;
            var shipToSelect = rec.getValue('shipaddresslist');
            log.debug('shipToSelect', shipToSelect)
            //is custom
            if (!shipToSelect || shipToSelect == -2) rec.setValue({fieldId: 'custbody_sdb_is_ship_to_select_custom',value: true})

            //is NOT custom 
            if(shipToSelect && shipToSelect != -2) rec.setValue({fieldId: 'custbody_sdb_is_ship_to_select_custom',value: false})
        } catch (error) {
            log.error('error afterSubmit', error);
        }
    }

    return {
        onAction :onAction 
    };
  });
  
  
  
