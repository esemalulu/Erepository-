/**
 * @NApiVersion 2.1
 * @NScriptType UserEventScript
 * 
 * # VEIC Update Effective Charge Rate
 * --------------------------------------
 * This script updates the rate for charges associated with "direct cost" billed projects. These are
 * projects where the labor rate is the actual rate that we pay an employee.
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
/** @typedef {import('@hitc/netsuite-types/N/types').EntryPoints.UserEvent.beforeLoadContext} beforeLoadContext */
/** @typedef {import('@hitc/netsuite-types/N/types').EntryPoints.UserEvent.beforeSubmitContext} beforeSubmitContext */
/** @typedef {import('@hitc/netsuite-types/N/types').EntryPoints.UserEvent.afterSubmitContext} afterSubmitContext */
/** @typedef {import('@hitc/netsuite-types/N/record').Record} N_Record */
/** @typedef {import('veic-types').EffectiveLaborRate.ChargeSource} ChargeSource */
/** @typedef {import('veic-types').EffectiveLaborRate.EffectiveLaborRateLib} EffectiveLaborRateLib */
/** @typedef {import('veic-types').LibNotify.LibNotify} LibNotify */

// @ts-ignore
define(['N/log', 'N/record', '/SuiteScripts/Lib/veic_lib_effective_labor_rate'],
    /**
     * @param {import('N/log')} log
     * @param {import('N/record')} record
     * @param {EffectiveLaborRateLib} laborRate
     */
    (log, record, laborRate) => {
        /**
         * Defines the function definition that is executed after record is submitted.
         * 
         * TODO: should uncheck the "effective rate has been set" when appropriate?
         * 
         * @param {afterSubmitContext} context
         * @since 2015.2
         */
        const afterSubmit = (context) => {
            try {
                if (context.newRecord.type !== record.Type.CHARGE) {
                    return;
                }

                if (context.type !== context.UserEventType.CREATE) {
                    return;
                }

                const charge = context.newRecord;
                const chargeSource = laborRate.getChargeSourceDetail(charge.id);
                if (!laborRate.isDirectCostCharge(chargeSource)) {
                    return;
                }

                // TODO: factor in markups/discounts?
                charge.setValue({
                    fieldId: 'rate',
                    value: chargeSource.effectiveRate
                });
            } catch (e) {
                log.error({title: 'Unexpected Error', details: e.message});
            }
        };

        return {afterSubmit};
    }
);
