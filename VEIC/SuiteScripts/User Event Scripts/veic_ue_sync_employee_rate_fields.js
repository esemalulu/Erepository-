/**
 * @NApiVersion 2.1
 * @NScriptType UserEventScript
 * 
 * Copy the value from an employee's labor cost field to their hourly rate field
 * whenever an employee record is created/edited.
 * 
 * This script is a compliment to the veic_mr_sync_employee_rate_fields map/reduce
 * script which runs nightly to sync these fields. We've add this User Event script
 * to ensure that rate fields are always in sync.
 */

/** @typedef {import('@hitc/netsuite-types/N/types').EntryPoints.UserEvent.beforeSubmitContext} beforeSubmitContext */

// @ts-ignore
define(['N/log', 'N/record'],
    /**
     * @param {import('N/log')} log
     * @param {import('N/record')} record
     */
    (log, record) => {
        /**
         * Copy the labor cost field to the hourly field for employee records if
         * they are different.
         * 
         * @param {beforeSubmitContext} context
         */
        const beforeSubmit = (context) => {
            const newRecord = context.newRecord;
            if (newRecord.type !== record.Type.EMPLOYEE) {
                return;
            }

            const eligibleEvents = [
                context.UserEventType.CREATE,
                context.UserEventType.EDIT,
                context.UserEventType.XEDIT,
            ];
            if (!eligibleEvents.includes(context.type)) {
                return;
            }

            const laborCost = newRecord.getValue({fieldId: 'laborcost'});
            if (!laborCost) {
                log.error({
                    title: 'Hourly Rate Sync Aborted',
                    details: `Could not sync hourly rate for employee ${newRecord.id}. Labor cost is invalid. Labor cost: ${laborCost}`}
                );

                return;
            }

            const hourlyRate = newRecord.getValue({fieldId: 'rate'});
            if (laborCost !== hourlyRate) {
                newRecord.setValue({fieldId: 'rate', value: laborCost});
                log.debug({
                    title: 'Employee Rate Synced',
                    details: `Synced hourly rate for employee: ${newRecord.id} with labor cost: ${laborCost}`
                });
            }
        }

        return {beforeSubmit};
    }
);
