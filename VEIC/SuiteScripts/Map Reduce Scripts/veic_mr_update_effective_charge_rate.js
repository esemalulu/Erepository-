/**
 * @NApiVersion 2.1
 * @NScriptType MapReduceScript
 * 
 * # VEIC Update Effective Charge Rate
 * --------------------------------------
 * This script updates the rate for charges associated with "direct cost" billed projects. These are
 * projects where the labor rate is the actual rate that we pay an employee. All direct-cost charges
 * that have not already had their rate adjusted will be updated.
 * 
 * The charges are updated using the "effective rate". The effective rate is what we actually pay an
 * employee and is calculated using their FTE Hours and the actual hours worked for in a week. See
 * veic_lib_effective_labor_rate script for details on exactly how this is calculated.
 * 
 * ## How does this script know if a charge is a direct cost charge?
 * A charge is considered "direct cost" if
 * 
 * - The charge is time-based
 * - The rule that generated it has a rate basis of "resource". This means that the source
 *   for the rate comes from the employee record
 */

// ### Types ###
/** @typedef {import('@hitc/netsuite-types/N/types').EntryPoints.MapReduce.getInputDataContext} InputContext */
/** @typedef {import('@hitc/netsuite-types/N/types').EntryPoints.MapReduce.mapContext} MapContext */
/** @typedef {import('@hitc/netsuite-types/N/types').EntryPoints.MapReduce.reduceContext} ReduceContext */
/** @typedef {import('@hitc/netsuite-types/N/types').EntryPoints.MapReduce.summarizeContext} SummarizeContext */
/** @typedef {import('@hitc/netsuite-types/N/record').Record} N_Record */
/** @typedef {import('veic-types').EffectiveLaborRate.ChargeSource} ChargeSource */
/** @typedef {import('veic-types').EffectiveLaborRate.EffectiveLaborRateLib} EffectiveLaborRateLib */

// @ts-ignore
define(['N/log', 'N/record', '/SuiteScripts/Lib/veic_lib_effective_labor_rate'],
    /**
     * @param {import('N/log')} log
     * @param {import('N/record')} record
     * @param {EffectiveLaborRateLib} laborRate
     */
    (log, record, laborRate) => {
        /**
         * Get all the recently created direct cost charges that haven't been udpated yet.
         * 
         * @param {InputContext} context
         */
        const getInputData = (context) => {
            const charges = laborRate.getDirectCostChargesToUpdate();

            // Filtering here is slightly overkill, but we want to be very careful not to update the
            // rate of non direct-cost charges.
            const directCostCharges = charges.filter(c => laborRate.isDirectCostCharge(c));

            return directCostCharges;
        };

        /**
         * Update the charge rate using the effective labor rate in the time tracking record
         * it is sourced from.
         * 
         * @param {MapContext} context
         */
        const map = (context) => {
            /** @type {ChargeSource} */
            const charge = JSON.parse(context.value);
            try {
                // TODO: factor in markups/discounts?
                record.submitFields({
                    type: record.Type.CHARGE,
                    id: charge.chargeId,
                    values: {rate: charge.effectiveRate}
                });
            } catch (e) {
                const errMsg = `Unable to update rate for charge: ${charge.chargeId}: ${e.message}`;
                throw new Error(errMsg);
            }
        };

        /**
         * Log summary of completion statuses and errors
         * 
         * @param {SummarizeContext} context
         */
        const summarize = (context) => {
            // TODO: might want to explicitly send notification if this starts failing.
            if (context.inputSummary.error) {                
                log.error({
                    title: 'Charge Rate Update Error (Input)',
                    details: context.inputSummary.error
                });
            }

            const mapErrors = [];
            context.mapSummary.errors.iterator().each((key, error, execNum) => {
                mapErrors.push(JSON.parse(error));

                return true;
            });
            if (mapErrors.length > 0) {
                log.error({
                    title: 'Charge Rate Update Error (Map)',
                    details: JSON.stringify(mapErrors)
                });
            }

            const statusCounts = {
                completed: 0,
                failed: 0,
                pending: 0
            };
            context.mapSummary.keys.iterator().each((key, execNum, completionState) => {
                switch (completionState) {
                    case 'COMPLETE':
                        statusCounts.completed++;
                        break;
                    case 'FAILED':
                        statusCounts.failed++;
                        break;
                    case 'PENDING':
                        statusCounts.pending++;
                        break;
                }

                return true;
            });

            log.debug({
                title: 'Charge Rate Updates Complete',
                details: `Status counts: Complete: ${statusCounts.completed}, failed: ${statusCounts.failed}, pending: ${statusCounts.pending}`
            });
        };

        return {getInputData, map, summarize};
    }
);
