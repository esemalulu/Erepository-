/**
 *@NApiVersion 2.1
 *@NScriptType UserEventScript
*/
define(['N/record'], function (record) {

    function beforeSubmit(context) {
        log.debug("On beforeSubmit");
        try {
            if (context.type != context.UserEventType.EDIT && context.type != context.UserEventType.CREATE) return;
            var rec = context.newRecord;
            var recCount = rec.getLineCount("item");
            log.audit("recCount: ", recCount);
            for (var x = 0; x < recCount; x++) {
                var Available = rec.getSublistValue({
                    sublistId: 'item',
                    fieldId: 'quantityavailable',
                    line: x
                });
                log.debug("Available", Available);
                var Quantity = rec.getSublistValue({
                    sublistId: 'item',
                    fieldId: 'quantity',
                    line: x
                });
                log.debug("Quantity", Quantity);
                log.debug("Available - Quantity", Available - Quantity);
                rec.setSublistValue({
                    sublistId: 'item',
                    fieldId: 'quantitybackordered',
                    value: Available - Quantity >= 0 ? 0 : Math.abs(Available - Quantity),
                    line: x
                });
            }
          
            var shipToSelect = rec.getValue('shipaddresslist');
            log.debug("Ship To Select", shipToSelect);
            //is custom
            if (!shipToSelect || shipToSelect == -2) rec.setValue({ fieldId: 'custbody_sdb_is_ship_to_select_custom', value: true })
            //is NOT custom 
            if (shipToSelect && shipToSelect != -2) rec.setValue({ fieldId: 'custbody_sdb_is_ship_to_select_custom', value: false })
            log.debug("Is Ship To Select Custom", rec.getValue({ fieldId: 'custbody_sdb_is_ship_to_select_custom' }))
            log.debug("Finish - SO Id: ",rec.id);
        } catch (error) {
            log.error('error beforeSubmit', error);
        }
    }

    return {
        beforeSubmit: beforeSubmit,
    }
});