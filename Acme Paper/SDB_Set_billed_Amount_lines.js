/**
 * @NApiVersion 2.1
 * @NScriptType ClientScript
 */
define(['N/url',
    'N/https',
    'N/ui/dialog',
], function (url, https, dialog) {
    function pageInit(ctx) {
        try {
            //var currentTotal = ctx.currentRecord.getValue("usertotal");
            //if (currentTotal) ctx.currentRecord.setValue("custbody_acme_billed_amt", currentTotal);
        } catch (e) {
            log.error('ERROR: ', e);
        }
    }

    function fieldChanged(ctx) {
        try {
            var currentRecord = ctx.currentRecord;
            var sublistName = ctx.sublistId;
            var fieldName = ctx.fieldId;
            var line = ctx.line;
            var amount = currentRecord.getValue('usertotal');
            var billAmount = currentRecord.getValue('custbody_acme_billed_amt');
            var lineCount = currentRecord.getLineCount({ sublistId: 'item' });
            if (fieldName == 'custbody_acme_billed_amt' && billAmount) {
                if (billAmount == amount) return;
                currentRecord.setValue('custbody_acme_3wm_exception', '')
                var options = {
                    title: 'Alert',
                    message: 'You have entered a Billed Amount value. This will be used instead of the Amount field when the AP is generated, and items received will be prorated.',
                };

                function success(result) {
                    console.log('Success with value ' + result);
                }

                function failure(reason) {
                    console.log('Failure: ' + reason);
                }

                dialog.alert(options).then(success).catch(failure);
                billAmount = Number(billAmount);
                amount = Number(amount)
                log.debug('DATA', { billAmount, amount, lineCount })
                //debugger
                var diff = 0
                if (billAmount > amount) diff = billAmount - amount;
                if (billAmount < amount) diff = (amount - billAmount) * -1;
                var newAmout = diff;
                var percent = (newAmout * 100) / amount;
                updateLines(currentRecord, lineCount, newAmout, percent, currentRecord)
            }

        } catch (e) {
            log.error({
                title: 'fieldChanged Field : ' + fieldName,
                details: e
            });
        }
    }

    function updateLines(rcd, lines, proAmount, percent, currentRecord) {
        try {
            //debugger;
            if (lines == 0) return;

            for (var x = 0; x < lines; x++) {
                rcd.selectLine({
                    sublistId: 'item',
                    line: x
                })

                var qty = rcd.getCurrentSublistValue({
                    sublistId: 'item',
                    fieldId: 'quantity',
                })
                var amount = rcd.getCurrentSublistValue({
                    sublistId: 'item',
                    fieldId: 'amount',
                })
                var rate = rcd.getCurrentSublistValue({
                    sublistId: 'item',
                    fieldId: 'rate',
                })

                // debugger
                var percentAply = Number(percent) / 100;
                var newRate = Number(rate) + (rate * percentAply);
                //var percent = (proAmount * 100) / Number(amount);
                var newAmount = Number(newRate.toFixed(2)) * Number(qty);
                rcd.setCurrentSublistValue({
                    sublistId: 'item',
                    fieldId: 'rate',
                    value: newRate,
                    //  ignoreFieldChange: true
                })
                // rcd.setCurrentSublistValue({
                //     sublistId: 'item',
                //     fieldId: 'amount',
                //     value: newAmount,
                //     //ignoreFieldChange: true
                // })
                rcd.setCurrentSublistValue({
                    sublistId: 'item',
                    fieldId: 'custcol_sdb_contribution',
                    value: percent.toFixed(2) + ' %',
                    // ignoreFieldChange: true
                })
                rcd.commitLine({
                    sublistId: 'item',
                    // ignoreRecalc: true
                })
            }
            debugger;
            var amount_2 = Number(currentRecord.getValue('usertotal')) - Number(currentRecord.getValue('custbody_acme_billed_amt'));
            if (Number(currentRecord.getValue('usertotal')) > Number(currentRecord.getValue('custbody_acme_billed_amt'))) {
                var qty = nlapiGetLineItemValue('item', 'quantity', 1)
                var rate = nlapiGetLineItemValue('item', 'amount', 1)
                rate = Number(rate) - Number(amount_2.toFixed(2));
                currentRecord.selectLine({
                    sublistId: 'item',
                    line: 0
                });

                currentRecord.setCurrentSublistValue({
                    sublistId: 'item',
                    fieldId: 'rate',
                    value: rate / Number(qty),
                    forceSyncSourcing: true
                });
                currentRecord.setCurrentSublistValue({
                    sublistId: 'item',
                    fieldId: 'amount',
                    value: rate,
                    forceSyncSourcing: true
                });
                currentRecord.commitLine({
                    sublistId: 'item'
                });
                //nlapiSetLineItemValue('item', 'rate', 1,rate)
            } else if (Number(currentRecord.getValue('usertotal')) < Number(currentRecord.getValue('custbody_acme_billed_amt'))) {
                var qty = nlapiGetLineItemValue('item', 'quantity', 1)
                var rate = nlapiGetLineItemValue('item', 'amount', 1)
                rate = Number(rate) + (Number(amount_2.toFixed(2)))*-1;
                currentRecord.selectLine({
                    sublistId: 'item',
                    line: 0
                });

                currentRecord.setCurrentSublistValue({
                    sublistId: 'item',
                    fieldId: 'rate',
                    value: rate / Number(qty),
                    forceSyncSourcing: true
                });
                currentRecord.setCurrentSublistValue({
                    sublistId: 'item',
                    fieldId: 'amount',
                    value: rate,
                    forceSyncSourcing: true
                });
                currentRecord.commitLine({
                    sublistId: 'item'
                });
            }

        } catch (e) {
            log.error({
                title: 'fieldChanged',
                details: 'Field ' + e
            });
        }
    }


    return {
        pageInit,
        fieldChanged
    };
});