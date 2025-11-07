/**
 * @NApiVersion 2.1
 * @NScriptType MapReduceScript
 * 
 * Update the lines of a time posting journal entry with the effective rate sourced from
 * the related time tracking records. This script will be triggered when:
 * 
 * - A new time posting journal entry is created
 * - An A/P manager or other role with the appropriate permission manually triggers it
 * 
 * TODO: include information about scripts that trigger this.
 */

// ### Types ###
/** @typedef {import('@hitc/netsuite-types/N/types').EntryPoints.MapReduce.getInputDataContext} InputContext */
/** @typedef {import('@hitc/netsuite-types/N/types').EntryPoints.MapReduce.mapContext} MapContext */
/** @typedef {import('@hitc/netsuite-types/N/types').EntryPoints.MapReduce.reduceContext} ReduceContext */
/** @typedef {import('@hitc/netsuite-types/N/types').EntryPoints.MapReduce.summarizeContext} SummarizeContext */
/** @typedef {import('veic-types').EffectiveLaborRate.EffectiveLaborRateLib} EffectiveLaborRateLib */
/** @typedef {import('veic-types').EffectiveLaborRate.JournalEntry} JournalEntry */
/** @typedef {import('veic-types').LibNotify.LibNotify} LibNotify */

// @ts-ignore
define(
    [
        'N/log',
        'N/runtime',
        '/SuiteScripts/Lib/veic_lib_effective_labor_rate',
        '/SuiteScripts/Lib/veic_lib_notify'
    ],
    /**
     * @param {import('N/log')} log
     * @param {import('N/runtime')} runtime
     * @param {EffectiveLaborRateLib} effectiveRate
     * @param {LibNotify} notify
     */
    (log, runtime, effectiveRate, notify) => {
        const JOURNAL_ID_PARAM = 'custscript_veic_time_posting_je_id';
        /**
         * Read the journal entry ID passed through the script param. Pass the ID to the map stage.
         * 
         * @param {InputContext} context
         */
        const getInputData = (context) => {
            const script = runtime.getCurrentScript();
            const journalId = Number(script.getParameter({name: JOURNAL_ID_PARAM}));
            if (!journalId) {
                throw new Error('Missing time posting journal ID parameter');
            }

            log.debug({
                title: 'JE Effective Rate Update Started',
                details: `Updating effective rate for lines in journal: ${journalId}`
            });

            return [String(journalId)];
        };

        /**
         * Pass the journal ID along the reduce stage.
         * 
         * Note: we could do the processing here, but choosing to pass along to reduce instead in
         * case we want to modify this script later on to be able to handle multiple journal entries at once.
         * 
         * @param {MapContext} context - Data collection containing the key-value pairs to process in the map stage. This parameter
         *     is provided automatically based on the results of the getInputData stage.
         */
        const map = (context) => {
            const journalId = Number(JSON.parse(context.value));
            context.write({key: String(journalId), value: ''});
        };

        /**
         * Update the JE entry lines with the effective rate from the related time tracking records.
         * 
         * @param {ReduceContext} context - Data collection containing the groups to process in the reduce stage. This parameter is
         *     provided automatically based on the results of the map stage.
         */
        const reduce = (context) => {
            /** @type {JournalEntry} jeWithTimeDetail */
            const journalEntry = effectiveRate.getJournalEntryDetail(Number(context.key));

            // TODO: add retry logic in case of record save competition
            effectiveRate.updateJournalEntryEffectiveRates(journalEntry);
            context.write({key: String(journalEntry.id), value: 'Saved'});
        };

        /**
         * Defines the function that is executed when the summarize entry point is triggered. This entry point is triggered
         * automatically when the associated reduce stage is complete. This function is applied to the entire result set.
         * @param {SummarizeContext} context - Statistics about the execution of a map/reduce script
         */
        const summarize = (context) => {
            const errors = notify.getMapReduceErrors(context);
            /** @type {string[]} */
            const jeIds = [];
            context.reduceSummary.keys.iterator().each(id => {
                jeIds.push(id);

                return true;
            });

            log.debug({
                title: 'JE Effective Rate Update Complete',
                details: `Effective rate update for journals ${JSON.stringify(jeIds)} completed with ${errors.length} error(s)`
            });
            notify.logMapReduceErrors(errors);
        };

        return {getInputData, map, reduce, summarize}
    }
);
