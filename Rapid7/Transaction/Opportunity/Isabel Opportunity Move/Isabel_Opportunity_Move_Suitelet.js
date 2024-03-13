/**
 *@NApiVersion 2.x
 *@NScriptType Suitelet
 */
define(['N/record', 'N/redirect', 'N/runtime', './Isabel_Opportunity_Move_Library'], function (record, redirect, runtime, lib) {
    function onRequest(context) {
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
        if (context.request.method === 'GET') {
            try {
                var oppId = context.request.parameters.oppId
                var newOppId = lib.createNewOpp(oppId)
                redirect.toRecord({
                    type: record.Type.OPPORTUNITY,
                    id: newOppId
                })
            } catch (e) {
                log.error({
                    title: 'error',
                    details: JSON.stringify(e)
                })
            }
        }
    }
    return {
        onRequest: onRequest
    }
})
