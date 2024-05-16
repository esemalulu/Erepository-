/**
 *@NApiVersion 2.1
 *@NScriptType ClientScript
 */
define(["N/ui/dialog"], function(dialog) {

    function saveRecord(context) {
        try {
            var currRecord = context.currentRecord;
            var lineCount = currRecord.getLineCount({
                sublistId: "itemvendor"
            })
            var vendorPrice = false;
            for (let i = 0; i < lineCount; i++) {
                currRecord.selectLine({
                    sublistId: "itemvendor",
                    line: i
                })
                var actualPrice = currRecord.getCurrentSublistValue({
                    sublistId: "itemvendor",
                    fieldId: "purchaseprice",
                });
                console.log("actualPrice", actualPrice)
                if (actualPrice) {
                    vendorPrice = true;
                }
            }
            if(!actualPrice) {
                dialog.alert({
                    title: 'Vendor purchase price empty',
                    message: 'The Purhcase Price under the vendor subtab is mandatory.'
                })
            }
            return actualPrice
        } catch (error) {
            console.log("Error at SaveRecord", error)
        }
    }

    return {
        saveRecord: saveRecord,
    }
});
