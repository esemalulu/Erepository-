/**
 *@NApiVersion 2.1
 *@NScriptType ClientScript
 */
define(['N/record', 'N/ui/dialog'], function(record, dialog) {

    function saveRecord(context) {
        var currentRecord = context.currentRecord;
        var returnAuth = record.load({
            type: record.Type.RETURN_AUTHORIZATION,
            id: currentRecord.getValue('createdfrom'),
            isDynamic: true
        });
        var lineCount = currentRecord.getLineCount({
            sublistId: 'item'
        })
        var letSave = true;
        for (let i = 0; i < lineCount; i++) {
            currentRecord.selectLine({
                sublistId: 'item',
                line: i
            });
            var qty = currentRecord.getCurrentSublistValue({
                sublistId: 'item',
                fieldId: 'quantity'
            });
            var orderLine = currentRecord.getCurrentSublistValue({
                sublistId: 'item',
                fieldId: 'orderline'
            });
            var lineIndex = returnAuth.findSublistLineWithValue({
                sublistId: 'item',
                fieldId: 'line',
                value: orderLine
            });
            var qtyReceived = returnAuth.getSublistValue({
                sublistId: 'item',
                fieldId: 'quantityreceived',
                line: lineIndex
            });
            var qtyToReturn = returnAuth.getSublistValue({
                sublistId: 'item',
                fieldId: 'quantity',
                line: lineIndex
            });
            if ((qty > qtyReceived) || (qty + qtyReceived > qtyToReturn)){
                letSave = false;
            }
        }
        if (letSave){
            return true
        }
        else {
            dialog.alert({
                title: 'Quantity not allowed',
                message: 'The quantity that you are trying to refund is greater than the quantity physically received'
            });
        }
    }

    return {
        saveRecord: saveRecord,
    }
});
