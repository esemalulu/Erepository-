/**
 *@NApiVersion 2.1
 *@NScriptType ClientScript
 */
define(['N/record', 'N/ui/dialog'], function (record, dialog) {

    function fieldChanged(context) {
        try {
            var rec = context.currentRecord;
            var sublistName = context.sublistId;
            var fieldName = context.fieldId;
            if (sublistName == 'item' && fieldName == 'quantity') {

                var quantity = rec.getCurrentSublistValue({
                    sublistId: "item",
                    fieldId: "quantity",
                });
                if (quantity) rec.setCurrentSublistValue({
                    sublistId: 'item',
                    fieldId: 'custcol_sdb_quantity_returned',
                    value: quantity,
                    ignoreFieldChange: true
                });

            }

            if (sublistName == 'item' && fieldName == 'custcol_sdb_quantity_returned') {

                var quantityReturned = rec.getCurrentSublistValue({
                    sublistId: "item",
                    fieldId: "custcol_sdb_quantity_returned",
                });
                var rate = rec.getCurrentSublistValue({
                    sublistId: "item",
                    fieldId: "rate",
                });
                if ((quantityReturned || quantityReturned == 0) && rate) rec.setCurrentSublistValue({
                    sublistId: 'item',
                    fieldId: 'amount',
                    value: (quantityReturned * rate),
                    ignoreFieldChange: true
                });

            }
        } catch (e) {
            console.log("ERROR fieldChanged", e);
        }
    }

    return {
        fieldChanged: fieldChanged
    }
});
