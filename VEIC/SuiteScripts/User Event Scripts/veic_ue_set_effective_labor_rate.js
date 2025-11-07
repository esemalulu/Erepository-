/**
 * @NApiVersion 2.1
 * @NScriptType UserEventScript
 * 
 * # VEIC Adjust Labor Cost
 * -------------------------
 * This script watches for timebills that are posted and updates the effective labor cost rate for the timebill.
 * 
 * ## Billing
 * The effective labor cost field is used by <insert script ids> to update the charge amounts for charges to projects that
 * are billed "at cost".
 * 
 * ## Costing
 * The effective labor cost field is used to calculate the difference between what we actually pay people and what is initially
 * posted to the GL when posting time. The <insert script ids> creates and adjusting journal entry to correct for this difference.
 * 
 * Effective labor cost is calculated as:
 * 
 *  - Exempt employee:
 *      - Effective labor cost rate = (labor cost * FTE hours) / actual hours worked for week
 *  - Non-exempt employee:
 *      - Effective labor cost rate = (min(actual hours, 40) * labor cost) + (max((actual hours - 40), 0) * (labor cost * O/T multiplier))
 */

// ### Constants ###
const EFFECTIVE_RATE_FIELD_ID = 'custcol_veic_effective_labor_rate';

// Note: it's assumed that the approval status keys/names will not change in future Netsuite releases
const STATUS_APPROVED_KEY = 3;
const STATUS_APPROVED_NAME = 'Approved';

// ### Types ###
/** @typedef {import('@hitc/netsuite-types/N/types').EntryPoints.UserEvent.beforeLoadContext} beforeLoadContext */
/** @typedef {import('@hitc/netsuite-types/N/types').EntryPoints.UserEvent.beforeSubmitContext} beforeSubmitContext */
/** @typedef {import('@hitc/netsuite-types/N/types').EntryPoints.UserEvent.afterSubmitContext} afterSubmitContext */
/** @typedef {import('@hitc/netsuite-types/N/record').Record} N_Record */
/** @typedef {import('veic-types').EffectiveLaborRate.EffectiveLaborRateLib} EffectiveLaborRateLib */
/** @typedef {import('veic-types').EffectiveLaborRate.EmployeeDetail} EmployeeDetail */
/** @typedef {import('veic-types').EffectiveLaborRate.TimeDetail} TimeDetail */

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
         * @param {afterSubmitContext} context
         * @since 2015.2
         */
        const afterSubmit = (context) => {
            try {
                if (context.newRecord.type !== record.Type.TIME_SHEET) {
                    return;
                }

                if (context.type !== context.UserEventType.APPROVE) {
                    return;
                }

                const timesheet = context.newRecord;
                /** @type {boolean} approved */
                const approved = Number(timesheet.getValue({fieldId: 'approvalstatus'})) === STATUS_APPROVED_KEY;
                if (!approved) {
                    log.debug({
                        title: 'Abort Calculate Effective Rate',
                        details: `Not approved. approved: ${approved}`
                    });

                    return;
                }

                const timesheetId = Number(timesheet.getValue({fieldId: 'id'}));
                log.debug({
                    title: 'Calculating Effective Rate',
                    details: `Effective labor rate calculation started for timesheet: ${timesheetId}`
                });

                const timeDetails = laborRate.getTimeDetailForTimesheet(timesheetId);
                if (timeDetails.length === 0) {
                    log.audit({
                        title: 'Aborting Calculating Effective Rate',
                        details: `There are no time entries for timesheet: ${timesheetId}`
                    });

                    return;
                }

                // TODO: move processing out of UE and into Map/Reduce to make sure we avoid hitting
                // governace limits (1000 units so max rows we can process is a little less than 100)
                const effectiveLaborCost = laborRate.calculateEffectiveLaborCost(timeDetails);

                // Update custom effective rate field in timesheet
                const tasks = [];
                const values = {};
                values[EFFECTIVE_RATE_FIELD_ID] = effectiveLaborCost;
                for (const t of timeDetails) {
                    tasks.push(record.submitFields.promise({
                        type: record.Type.TIME_BILL,
                        id: t.id,
                        values: values
                    }));
                }

                // Note: this is a blunt way of handling errors. With this approach, the first timebill
                // to fail will cause Promise.all to reject. We'll probably want more fine-tuned error handling
                Promise.all(tasks).then((ids) => {
                    log.debug({
                        title: 'Effective rate updated',
                        details: `timebill IDs: ${ids.join(', ')}`
                    });
                }).catch(err => {
                    log.error({
                        title: 'Effective rate update error',
                        details: err.message
                    });
                });
            } catch (e) {
                log.error({title: 'Unexpected Error', details: e.message});
            }
        }

        return {afterSubmit}
    }
);
