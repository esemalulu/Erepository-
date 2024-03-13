/**
 * @NApiVersion 2.x
 * @NScriptType ScheduledScript
 * @NModuleScope SameAccount
 */
define(['N/search', 'N/runtime', 'N/task', './Isabel_Opportunity_Move_Library'], function (search, runtime, task, lib) {
    // var arrofFaildOpp = []
    // var arrofErrdOpp = []
    // var countOfCreated = 0
    // var countOfFailed = 0

    /**
     * Definition of the Scheduled script trigger point.
     *
     * @param {Object} scriptContext
     * @param {string} scriptContext.type - The context in which the script is executed. It is one of the values from the scriptContext.InvocationType enum.
     * @Since 2015.2
     */
    function execute(scriptContext) {
        var scriptObj = runtime.getCurrentScript()

        var sessionObj = runtime.getCurrentSession()
        sessionObj.set({
            name: 'arrofFaildOpp',
            value: JSON.stringify([])
        })
        sessionObj.set({
            name: 'arrofErrdOpp',
            value: JSON.stringify([])
        })
        sessionObj.set({
            name: 'countOfCreated',
            value: '0'
        })
        sessionObj.set({
            name: 'countOfFailed',
            value: '0'
        })

        var searchIdParam = scriptObj.getParameter({ name: 'custscript_r7_opp_search_id' })
        try {
            do {
                var oppResultSet = searchOpportunitiesToProcess()
                var start = 0
                var end = 10
                var resultSlice = oppResultSet.getRange({
                    start: start,
                    end: end
                })
                for (var i in resultSlice) {
                    var opportunityId = resultSlice[i].getValue(oppResultSet.columns[0])
                    log.audit('running process for result', opportunityId)

                    var newOppId = lib.createNewOpp(opportunityId)
                }
                var unitsLeft = scriptObj.getRemainingUsage()
                log.audit('processed results from ' + start + ' to ' + end, unitsLeft)
                log.audit('total processed opp', sessionObj.get({ name: 'countOfCreated' }))
                log.audit('total failed opp', sessionObj.get({ name: 'countOfFailed' }))
                log.audit('list of failed', sessionObj.get({ name: 'arrofFaildOpp' }))
                log.audit('list of errors', sessionObj.get({ name: 'arrofErrdOpp' }))
            } while (resultSlice.length > 0 && unitsLeft > 2000)
            if (scriptObj.getRemainingUsage() <= 2000) {
                var scriptId = scriptObj.id
                var deploymentId = scriptObj.deploymentId
                restartScript(searchIdParam, scriptId, deploymentId)
            }
            log.audit('total processed opp', sessionObj.get({ name: 'countOfCreated' }))
            log.audit('total failed opp', sessionObj.get({ name: 'countOfFailed' }))
            log.audit('list of failed', sessionObj.get({ name: 'arrofFaildOpp' }))
            log.audit('list of errors', sessionObj.get({ name: 'arrofErrdOpp' }))
            log.audit('finished this execution. Have a nice day!')
        } catch (ex) {
            log.error('Error in copy opportunities main', ex)
        }
    }

    function searchOpportunitiesToProcess() {
        var resultSet
        try {
            var oppSearchId = runtime.getCurrentScript().getParameter({
                name: 'custscript_r7_opp_search_id'
            })
            var oppSearch = search.load(oppSearchId)
            resultSet = oppSearch.run()
        } catch (ex) {
            log.error('Error in copy searchOpportunitiesToProcess', ex)
        }
        return resultSet
    }

    function restartScript(searchId, scriptId, deploymentId) {
        log.debug('Rescheduling script')
        var scheduleScriptTaskObj = task.create({
            taskType: task.TaskType.SCHEDULED_SCRIPT,
            scriptId: scriptId,
            deploymentId: deploymentId,
            params: { custscript_r7_opp_search_id: searchId }
        })
        log.debug('Schedule Object', scheduleScriptTaskObj)
        var taskSubmitId = scheduleScriptTaskObj.submit()
        log.debug('New task is submitted.', 'Thank you! Come again!')
    }

    return {
        execute: execute
    }
})
