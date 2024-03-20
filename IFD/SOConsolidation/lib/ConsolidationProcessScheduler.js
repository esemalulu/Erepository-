define([
    '../thirdparty/moment-tz',
    'N/runtime',
    'N/format',
    'N/task',
    'N/search',
    'N/record',
    'N/log'
], function ConsolidationProcessScheduler(
    moment,
    nRuntime,
    nFormat,
    nTask,
    nSearch,
    nRecord,
    nLog
) {
    var RECORD_ID = 'customrecord_acs_soc_cps';
    return {
        flag: function flag(id, status, date) {
            var fields = {
                custrecord_acs_soc_cps_status: status
            };
            if (date) {
                fields.custrecord_acs_soc_cps_last_date = new Date();
            }
            nRecord.submitFields({
                type: RECORD_ID,
                id: id,
                values: fields
            });
        },
        findNextToProcess: function findNextToProcess() {
            var currentTime = moment().tz(
                nRuntime.getCurrentUser().getPreference('TIMEZONE')
            ).format(nRuntime.getCurrentUser().getPreference('TIMEFORMAT'));

            var result;
            var filters = [
                ['isinactive', 'is', 'F'],
                'AND',
                ['custrecord_acs_soc_cps_last_date', 'onorbefore', 'yesterday'],
                'AND',
                ['custrecord_acs_soc_cps_time', 'lessthanorequalto', currentTime]
            ];
            var search = nSearch.create({
                type: RECORD_ID,
                filters: filters,
                columns: [
                    'internalid',
                    nSearch.createColumn({
                        name: 'custrecord_acs_soc_cps_time',
                        sort: nSearch.Sort.ASC
                    }),
                    'custrecord_acs_soc_cps_last_date',
                    'custrecord_acs_soc_cps_status'
                ]
            });

            search.run().each(function eachResult(f) {
                result = {
                    internalid: f.getValue({ name: 'internalid' }),
                    lastProcessedDate: f.getValue({ name: 'custrecord_acs_soc_cps_last_date' }),
                    status: f.getValue({ name: 'custrecord_acs_soc_cps_status' }),
                    time: f.getValue({ name: 'custrecord_acs_soc_cps_time' })
                };
            });
            return result;
        },
        scheduleTask: function scheduleTask(runRecordId) {
            var mrTaskId;
            var mrTask = nTask.create({
                taskType: nTask.TaskType.MAP_REDUCE,
                scriptId: 'customscript_acs_soc_mr_consolidation',
                deploymentId: 'customdeploy_acs_soc_mr_consolid_task',
                params: {
                    custscript_acs_soc_scid: runRecordId
                }
            });
            try {
                mrTaskId = mrTask.submit();
                nLog.audit('Scheduled Task Id', mrTaskId);
            } catch (e) {
                nLog.error('Error submitting task', e);
                return false;
            }
            return true;
        },
        checkAndSchedule: function checkAndSchedule() {
            var nextRun;
            var isScheduledSuccess;
            nextRun = this.findNextToProcess();
            if (nextRun) {
                log.debug('Next Run', JSON.stringify(nextRun));
                isScheduledSuccess = this.scheduleTask(nextRun.internalid);
                if (isScheduledSuccess) {
                    this.flag(nextRun.internalid, 'IN_SCHEDULE', true);
                } else {
                    nLog.audit('Could not schedule');
                }
            }
        }
    };
});
