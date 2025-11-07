/**
 * @author Adam Ploof - aploof@veic.org
 * @date   10/02/2025
 * Script File:	veic_lib_notify.js
 * Script Name:	veic_lib_notify
 * Script Type:	Library
 * Description:	A module with functions related to logging, notifications, and
 * providing feedback to users, admins, etc. from scripts.
 * 
 * @NApiVersion 2.1
 * @NModuleScope public
 */

/** @typedef {import('@hitc/netsuite-types/N/types').EntryPoints.MapReduce.summarizeContext} SummarizeContext */
/** @typedef {import('veic-types/notifications').MapReduceError} MapReduceError */
/** @typedef {import('veic-types/notifications').Notify} Notify */

// @ts-ignore
define(['N/log'],
    /**
     * @param {import('N/log')} log
     * @returns {Notify}
     */
    (log) => {
        /**
         * Log the errors that occured during the execution of a Map/Reduce script
         * 
         * @param {MapReduceError[]} errors 
         * @returns {void}
         */
        const logMapReduceErrors = (errors) => {
            for (const error of errors) {
                log.error({
                    title: `${error.stage} error`,
                    details: error.message
                });
            }
        };

        /**
         * Effectively an overload for logging Map/Reduce errors by passing
         * the summaryContext instead of the errors.
         * 
         * @param {SummarizeContext} summaryContext 
         * @returns {void}
         */
        const logMapReduceErrorsFromSummary = (summaryContext) => {
            logMapReduceErrors(getMapReduceErrors(summaryContext));
        };

        /**
         * Get a list of all errors that occurred during the execution of a Map/Reduce script.
         * 
         * @param {SummarizeContext} summaryContext 
         * @returns {MapReduceError[]}
         */
        const getMapReduceErrors = (summaryContext) => {
            const inputSummary = summaryContext.inputSummary;
            const mapSummary = summaryContext.mapSummary;
            const reduceSummary = summaryContext.reduceSummary;

            /** @type {MapReduceError[]} errors */
            const errors = [];

            // Input stage error
            if (inputSummary.error) {
                errors.push({
                    stage: 'input',
                    message: inputSummary.error
                });
            }

            // Map stage errors
            mapSummary.errors.iterator().each((key, val) => {
                errors.push({
                    stage: 'map',
                    message: `Map error: key: ${key}, error: ${JSON.parse(val).message}`
                });

                return true;
            });
            
            // Reduce stage errors
            reduceSummary.errors.iterator().each((key, val) => {
                errors.push({
                    stage: 'reduce',
                    message: `Reduce error: key: ${key}, error: ${JSON.parse(val).message}`
                });

                return true;
            });

            return errors;
        };

        return {
            getMapReduceErrors,
            logMapReduceErrors,
            logMapReduceErrorsFromSummary,
        };
    }
);
