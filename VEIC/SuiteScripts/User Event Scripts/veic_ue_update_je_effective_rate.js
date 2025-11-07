/**
 * @NApiVersion 2.1
 * @NScriptType UserEventScript
 * 
 * Trigger the update effective rate map/reduce script when a time posting journal
 * entery is created. Uses the veic_lib_effective_rate library to check that the journal
 * was created from time posting.
 */

// ### Types ###
/** @typedef {import('@hitc/netsuite-types/N/types').EntryPoints.UserEvent.afterSubmitContext} afterSubmitContext */
/** @typedef {import('veic-types').EffectiveLaborRate.EffectiveLaborRateLib} EffectiveLaborRateLib */

// ### Constants ###
const JE_EFFECTIVE_RATE_MR_SCRIPT_ID = 'customscript_veic_mr_update_je_eff_rate';
const JE_EFFECTIVE_RATE_MR_DEPLOYEMENT_ID = 'customdeploy_veic_mr_update_je_eff_rate';

// @ts-ignore
define(['N/task', 'N/record', 'N/log', '/SuiteScripts/Lib/veic_lib_effective_labor_rate'],
    /**
     * @param {import('N/task')} task 
     * @param {import('N/record')} record 
     * @param {import('N/log')} log 
     * @param {EffectiveLaborRateLib} laborRate
     */
    (task, record, log, laborRate) => {
        /**
         * Defines the function definition that is executed after record is submitted.
         * @param {afterSubmitContext} context
         */
        const afterSubmit = (context) => {
            if (context.type !== context.UserEventType.CREATE) {
                log.debug({title: 'UE abort', details: `Event type is not CREATE. Got : ${context.type}`});

                return;
            }

            if (context.newRecord.type !== record.Type.JOURNAL_ENTRY) {
                log.debug({
                    title: 'UE abort',
                    details: `Record type is not Journal. Got : ${context.newRecord.type}`
                });

                return;
            }

            if (!laborRate.journalIsTimePostingFromId(context.newRecord.id)) {
                log.debug({
                    title: 'UE abort',
                    details: `Journal ${context.newRecord.id} is not a time posting journal`
                });

                return;
            }

            const journalId = context.newRecord.id;
            const mrTask = task.create({
                taskType: task.TaskType.MAP_REDUCE,
                scriptId: JE_EFFECTIVE_RATE_MR_SCRIPT_ID,
                deploymentId: JE_EFFECTIVE_RATE_MR_DEPLOYEMENT_ID,
                params: {
                    custscript_veic_time_posting_je_id: journalId,
                }
            });

            const taskId = mrTask.submit();

            // TODO: how do we notify the user that the effective rates are in the process of being
            // calculated for this je? How do we let them know it's done?

            log.debug({
                title: 'Update Journal Effective Rate In Progress',
                details: `Task created for updating time posting journal effective rates. Journal ID: ${journalId} Task ID: ${taskId}`
            });
        }

        return {afterSubmit}
    }
);
