/**
 * @NApiVersion 2.x
 * @NScriptType userEventScript
 * @NModuleScope Public
 */

define(["N/record", "N/search", "N/runtime"],
    function (record, search, runtime) 
	{

        function beforeSubmit(context) {
            try {
                if (context.type == 'delete') {
                    return;
                }
                var rec = context.newRecord;
                var lineCount = rec.getLineCount({sublistId: 'item'});
                var total = 0;
                for (var i = 0; i < lineCount; i++) {
                    var itemType = rec.getSublistValue({sublistId: 'item', fieldId: 'itemtype', line: i});
                    if (itemType == 'Discount') {
                        var amount = (rec.getSublistValue({sublistId: 'item', fieldId: 'amount', line: i})) * -1;
                        total = total + amount;
                    }
                }
                if (amount > 0) {
                    rec.setValue({fieldId: 'custbody_bill_discount_amount', value: total});
                }
            }
            catch (error) {
                log.error('Error', error.toString());
            }
        }


        function isEmpty(stValue) {
            if ((stValue == '') || (stValue == null) || (stValue == undefined)) {
                return true;
            }
            else {
                if (stValue instanceof String) {
                    if ((stValue == '')) {
                        return true;
                    }
                }
                else if (stValue instanceof Array) {
                    if (stValue.length == 0) {
                        return true;
                    }
                }

                return false;
            }
        }

        return {
            beforeSubmit: beforeSubmit
        }
    }
);