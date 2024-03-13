/**
 * @NApiVersion 2.1
 * @NScriptType MapReduceScript
 * @NModuleScope Public
 */
define([
    'N/log',
    'N/query',
    'N/record',
    'N/runtime',
    '../../Toolbox/r7.map.reduce.helper'
], function (log, query, record, runtime, mapReduce) {
    function getInputData() {
        if (isDynamicCalcsDisabled()) {
            return;
        }

        const CALCULATION_COMPLETED = 3;
        const ARR_EVENT_RESPONSE_PROCESS_FAILED = 4;

        return query.runSuiteQL({
            query: `
                select 
                    e.id as eventId, 
                    e.custrecord_r7_arr_transaction as transactionId,
                    t.recordtype
                from customrecord_arr_event e
                inner join transaction t on e.custrecord_r7_arr_transaction = t.id
                where 1 = 1
                    and t.custbody_r7_cash_arr_calc_status != ${CALCULATION_COMPLETED}
                    and e.custrecord_r7_publishing_status = ${ARR_EVENT_RESPONSE_PROCESS_FAILED}
                    and t.custbody_r7_arr_override = 'F'
                order by 
                    e.id desc
        `
        }).asMappedResults();
    }

    function map(context) {
        const data = mapReduce.getStageData(context);

        const transactionId = data['transactionid'];
        const transactionType = data['recordtype'];
        const eventId = data['eventid'];

        const value = { transactionId, transactionType, eventId };

        context.write({ key: transactionId, value });
    }

    function reduce(context) {
        const eventRecords = mapReduce.getStageData(context);
        const [eventToProcess, ...eventsToCancel] = eventRecords;

        processArr(eventToProcess);

        eventsToCancel.forEach(cancelRetryForEvent);

        context.write({
            key: eventToProcess.eventId,
            value: {
                updated: eventToProcess.eventId,
                skipped: eventsToCancel.map(e => e.eventId)
            }
        });
    }

    function summarize(context) {
        const { output, mapErrors, reduceErrors } = mapReduce.getSummaryData(context);
        const errorCount = mapErrors.length + reduceErrors.length;

        mapReduce.logErrors(context);

        log.debug({ title: 'Finished', details: `Updated ${output.length} transactions, ${errorCount} errors` });
    }

    /////////////////////////////////////

    /**
     * ARR for the transaction is reprocessed by loading the transaction, removing the ARR hash,
     * and saving the transaction again.  This forces the user event script on the transaction
     * to recalculate ARR again.  This event is marked as 'Retry Processed'.
     */
    function processArr(event) {
        log.debug({ title: 'Retrying ARR', details: `For ${event.transactionType} ${event.transactionId}` });

        record.load({ type: event.transactionType, id: event.transactionId })
            .setValue({ fieldId: 'custbody_r7_arr_request_hash', value: '' })
            .save();

        setRetryProcessedForEvent(event);
    }

    /**
     * This function updates the status on the event to indicate that we've re-processed ARR
     */
    function setRetryProcessedForEvent(event) {
        const RETRY_PROCESSED = 7;

        record.submitFields({
            type: 'customrecord_arr_event',
            id: event.eventId,
            values: {
                'custrecord_r7_publishing_status': RETRY_PROCESSED
            }
        });
    }

    /**
     * This function updates the status on the event to indicate that we've skipped recalculating ARR
     * for this event because there is a newer ARR event for this transaction that we did reprocess.
     */
    function cancelRetryForEvent(event) {
        log.debug({
            title: 'Cancel ARR Retry',
            details: `For ${event.transactionType} ${event.transactionId}, event ID ${event.eventId}`
        });

        const RETRY_CANCELLED = 8;

        record.submitFields({
            type: 'customrecord_arr_event',
            id: event.eventId,
            values: {
                'custrecord_r7_publishing_status': RETRY_CANCELLED
            }
        });
    }

    function isDynamicCalcsDisabled() {
        return runtime.getCurrentScript().getParameter({ name: 'custscript_r7_disable_dynamic_arr_calcs' });
    }

    return {
        getInputData,
        map,
        reduce,
        summarize
    };
});