/**
 * @NApiVersion 2.x
 * @NScriptType MapReduceScript
 * @NModuleScope SameAccount
 */
define(['N/search', 'N/record', 'N/file', 'N/runtime', './GD_PDR_HelperChecks.js', './GD_PDR_HelperVouchers.js', '../2.x/GD_Constants.js'],

function(search, record, file, runtime, checksHelper, vouchersHelper, GD_Constants) {

    /**
     * Marks the beginning of the Map/Reduce process and generates input data.
     *
     * @typedef {Object} ObjectRef
     * @property {number} id - Internal ID of the record instance
     * @property {string} type - Record type id
     *
     * @return {Array|Object|Search|RecordRef} inputSummary
     * @since 2015.1
     */
    function getInputData() {
        try{
            var procRec = record.load({
                type: 'customrecordgd_printdealerrefunds_proc',
                id: runtime.getCurrentScript().getParameter({name: 'custscriptgd_pdr_procrecid'}),
                isDynamic: true
            });
            var recordStatus = procRec.getValue({fieldId: 'custrecordgd_dealerrefundsproc_status'});
            var startCheckNum = parseInt(procRec.getValue({fieldId: 'custrecordgd_dealerrefundsproc_startnum'}));
            var pairedArray = new Array();

            if (recordStatus == GD_Constants.GD_PRINTDEALERREFUNDS_OPEN) {
                var refundIds = procRec.getValue({fieldId: 'custrecordgd_dealerrefundsproc_refunds'});
                if (refundIds != null && refundIds != '' && refundIds.length > 0) {
                    for (var i = 0; i < refundIds.length; i++) {
                        var curCheckNum = startCheckNum + i;
                        var strCheckNum = curCheckNum + '';
                        strCheckNum = strCheckNum.replace(/(\.[1-9]*)0+$/, "$1"); // remove trailing zeros
                        strCheckNum = strCheckNum.replace(/\.$/, "");             // remove trailing dot
                        pairedArray.push({refundId: refundIds[i], checkNum: strCheckNum});
                    }
                    procRec.setValue({fieldId: 'custrecordgd_dealerrefundsproc_status', value: GD_Constants.GD_PRINTDEALERREFUNDS_PROCESSING});
                    procRec.save();
                    return pairedArray;
                } else {
                    return [];
                }
            } else {
                return [];
            }
        } catch (err) {
            log.error('Error in getInputData', err);
        }
    }

    /**
     * Executes when the map entry point is triggered and applies to each key/value pair.
     *
     * @param {MapSummary} context - Data collection containing the key/value pairs to process through the map stage
     * @since 2015.1
     */
    function map(context) {
        try {
            var data = JSON.parse(context.value);
            var refundId = data.refundId;
            var checkNum = data.checkNum;
            var refundRec = record.load({
                type: record.Type.CUSTOMER_REFUND,
                id: refundId,
                isDynamic: true
            });
            refundRec.setValue({fieldId: 'paymentoption', value: '2'});
            refundRec.setValue({fieldId: 'checknumber', value: checkNum});
            refundRec.setValue({fieldId: 'tranid', value: checkNum});
            refundRec.setValue({fieldId: 'custbodyrvstobeprinted', value: false});
            refundRec.save({enableSourcing: true, ignoreMandatoryFields: true});
        } catch (err) {
            log.error('Error in map', err);
        }
    }

    /**
     * Executes when the reduce entry point is triggered and applies to each group.
     *
     * @param {ReduceSummary} context - Data collection containing the groups to process through the reduce stage
     * @since 2015.1
     */
    function reduce(context) {

    }


    /**
     * Executes when the summarize entry point is triggered and applies to the result set.
     *
     * @param {Summary} summary - Holds statistics regarding the execution of a map/reduce script
     * @since 2015.1
     */
    function summarize(summary) {
        try {
            record.submitFields({
                type: 'customrecordgd_printdealerrefunds_proc',
                id: runtime.getCurrentScript().getParameter({name: 'custscriptgd_pdr_procrecid'}),
                values: {
                    custrecordgd_dealerrefundsproc_status: GD_Constants.GD_PRINTDEALERREFUNDS_COMPLETE,
                    custrecordgd_dealerrefundsproc_percent: '100'
                }
            });
        } catch (err) {
            log.error('Error in summarize', err);
        }
    }

    return {
        getInputData: getInputData,
        map: map,
        // reduce: reduce,
        summarize: summarize
    };
    
});
