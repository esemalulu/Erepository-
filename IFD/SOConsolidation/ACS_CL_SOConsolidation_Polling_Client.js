/**
 * @NApiVersion 2.0
 * @NScriptType ClientScript
 * @NModuleScope SameAccount
 */
define([
    'N/runtime',
    'N/ui/dialog',
    'N/ui/message',
    'N/currentRecord',
    'N/search',
    'N/log',
    'N/url'
], function ACSCLSoConsolidationPollingClient(
    nRuntime,
    nDialog,
    nMessage,
    nCurrentRecord,
    nSearch,
    nLog,
    nUrl
) {
    'use strict';

    var consolidationFields = [
        'custbody_acs_soc_order_locked',
        'custbody_acs_soc_cons_key',
        'custbody_acs_soc_master',
        'custbody_acs_soc_classified',
        'custbody_consolidated',
        'custbody_ifd_used_so'
    ];

    var recordValuesAtStart;
    var recordType;
    var recordId;
    var theInterval;
    var modalHasBeenDisplayed = false;

    function getValuesAtStart(rec) {
        var values = {};
        consolidationFields.forEach(function extractData(field) {
            values[field] = rec.getValue({ fieldId: field });
        });
        return values;
    }

    function showLockedMessage() {
        var urlToRecord = nUrl.resolveRecord({
            recordType: recordType,
            recordId: recordId,
            isEditMode: false
        });
        var options = {
            title: 'Consolidation Process',
            message: 'While you were modifying this order, consolidation process ran and changed values. \n' +
                'Press ok to reload the record in view mode. \n' +
                'Press cancel to keep the record open.'
        };

        function success(result) {
            var failureMessage;
            if (result) {
                window.location = urlToRecord;
            } else {
                failureMessage = nMessage.create({
                    title: 'Consolidation Process',
                    message: 'While you were modifying this order, consolidation process ran and changed values. \n' +
                        'Record cannot be saved',
                    type: nMessage.Type.WARNING
                });
                failureMessage.show();
            }
        }
        function failure(e) {
            nLog.error('failure in modal', e);
        }

        if (!modalHasBeenDisplayed) {
            nDialog.confirm(options)
                .then(success)
                .catch(failure);
            modalHasBeenDisplayed = true;
        }
    }

    function compareValues(val1, val2) {
        var areEqual = true;
        if (!val1 || !val2) {
            return false;
        }

        consolidationFields.forEach(function areEqualVal(f) {
            areEqual = areEqual && (val1[f] === val2[f]);
        });

        return areEqual;
    }

    function setupChangeWatcher() {
        if (!setInterval) {
            return;
        }
        theInterval = setInterval(function onIntervalWatch() {
            nSearch.lookupFields.promise({
                type: recordType,
                id: recordId,
                columns: consolidationFields
            }).then(
                function onSuccess(result) {
                    var areValuesEqual = compareValues(recordValuesAtStart, result);
                    if (!areValuesEqual) {
                        showLockedMessage();
                    }
                }
            ).catch(
                function onRejected(reason) {
                    // do something on rejection
                    nLog.error('Error in Polling Client', reason);
                }
            );
        }, 1000 *
            parseInt(nRuntime.getCurrentScript().getParameter({ name: 'custscript_acs_soc_cl_polling_seconds' }), 10)
        );
    }

    return {
        pageInit: function pageInit(pageInitContext) {
            var newRecord;
            if (pageInitContext.mode !== 'edit') {
                return;
            }
            newRecord = pageInitContext.currentRecord;
            recordType = newRecord.type;
            recordId = newRecord.id;
            recordValuesAtStart = getValuesAtStart(newRecord);

            setupChangeWatcher();
        },
        /*
        SaveRecord is sync.
         */
        saveRecord: function saveRecord() {
            var newValues;
            var comparisonResult;
            var modalMessage = {
                title: 'Consolidation Process',
                message: 'Record changed by consolidation process and cannot be saved'
            };

            if (theInterval) {
                clearInterval(theInterval);
            }

            newValues = nSearch.lookupFields({
                type: recordType,
                id: recordId,
                columns: consolidationFields
            });

            comparisonResult = compareValues(recordValuesAtStart, newValues);
            if (!comparisonResult) {
                nDialog.alert(modalMessage);
            }
            return comparisonResult;
        }
    };
});
