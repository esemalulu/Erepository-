/**
 * @NApiVersion 2.x
 * @NScriptType UserEventScript
 * @NModuleScope SameAccount
 */
define(['N/record', 'N/search', 'N/runtime', 'N/error'], function (record, search, runtime, error) {
    function beforeSubmit(context) {
        if (context.type != 'xedit') {
            var newRec = context.newRecord;
            var recId = newRec.id;
            // log.debug('newRec', newRec);
            log.debug('recId', recId);
            log.debug('record Sublists', newRec.getSublists());
            var subsidListCount = newRec.getLineCount('submachine');
            // log.debug('Count of subsid added', newRec.getLineCount('submachine'));
            var lccSubsidiaryIsAdded = false;
            var internationalSubsidiaryIsAdded = false;
            for (var i = 0; i < subsidListCount; i++) {
                var subsidiary = newRec.getSublistValue('submachine', 'subsidiary', i);
                if (!lccSubsidiaryIsAdded) {
                    lccSubsidiaryIsAdded = subsidiary == 1 ? true : false;
                }
                if (!internationalSubsidiaryIsAdded) {
                    internationalSubsidiaryIsAdded = subsidiary == 10 ? true : false;
                }
                // log.debug('checkgin line ' + i, subsidiary);
            }
            // log.debug('lccSubsidiaryIsAdded', lccSubsidiaryIsAdded);
            // log.debug('internationalSubsidiaryIsAdded', internationalSubsidiaryIsAdded);
            if (!lccSubsidiaryIsAdded) {
                subsidListCount = newRec.getLineCount('submachine');
                newRec.insertLine('submachine', subsidListCount);
                newRec.setSublistValue('submachine', 'subsidiary', subsidListCount, '1');
            }
            if (!internationalSubsidiaryIsAdded) {
                subsidListCount = newRec.getLineCount('submachine');
                newRec.insertLine('submachine', subsidListCount);
                newRec.setSublistValue('submachine', 'subsidiary', subsidListCount, '10');
            }
            newRec.setValue('custentityr7_multiple_sub_add', true);

            var currencyListCount = newRec.getLineCount('currency');
            var USDIsAdded = false;
            var GBPIsAdded = false;
            var EURIsAdded = false;
            var HKDIsAdded = false;
            var JPYIsAdded = false;
            for (var i = 0; i < currencyListCount; i++) {
                var currency = newRec.getSublistValue('currency', 'currency', i);
                if (!USDIsAdded) {
                    USDIsAdded = currency == 1 ? true : false;
                }
                if (!GBPIsAdded) {
                    GBPIsAdded = currency == 2 ? true : false;
                }
                if (!EURIsAdded) {
                    EURIsAdded = currency == 4 ? true : false;
                }
                if (!HKDIsAdded) {
                    HKDIsAdded = currency == 5 ? true : false;
                }
                if (!JPYIsAdded) {
                    JPYIsAdded = currency == 11 ? true : false;
                }
            }
            if (!USDIsAdded) {
                currencyListCount = newRec.getLineCount('currency');
                newRec.insertLine('currency', currencyListCount);
                newRec.setSublistValue('currency', 'currency', currencyListCount, '1');
            }
            if (!GBPIsAdded) {
                currencyListCount = newRec.getLineCount('currency');
                newRec.insertLine('currency', currencyListCount);
                newRec.setSublistValue('currency', 'currency', currencyListCount, '2');
            }
            if (!EURIsAdded) {
                currencyListCount = newRec.getLineCount('currency');
                newRec.insertLine('currency', currencyListCount);
                newRec.setSublistValue('currency', 'currency', currencyListCount, '4');
            }
            if (!HKDIsAdded) {
                currencyListCount = newRec.getLineCount('currency');
                newRec.insertLine('currency', currencyListCount);
                newRec.setSublistValue('currency', 'currency', currencyListCount, '5');
            }
            if (!JPYIsAdded) {
                currencyListCount = newRec.getLineCount('currency');
                newRec.insertLine('currency', currencyListCount);
                newRec.setSublistValue('currency', 'currency', currencyListCount, '11');
            }
            newRec.setValue('custentityr7_multiple_cur_add', true);
        }
    }

    return {
        beforeSubmit: beforeSubmit,
    };
});
