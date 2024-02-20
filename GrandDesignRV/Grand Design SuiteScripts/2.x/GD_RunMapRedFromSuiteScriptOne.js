/**
 * @NApiVersion 2.x
 * @NScriptType Suitelet
 */
define(['N/record', 'SuiteScripts/SSLib/2.x/SSLib_Task'],
/**
 * @param {record} SSLib_Task
 */
function(record, SSLib_Task) {
    /**
     * Definition of the Suitelet script trigger point.
     *	This is a suitelet that when passed with a script Id, deployment Id and/or parameters, it runs the map/reduce script.  This is usually used on 1.0 suitescripts to call
     *	Map/Reduce scripts.
     * @param {Object} context
     * @param {ServerRequest} context.request - Encapsulation of the incoming request
     * @param {ServerResponse} context.response - Encapsulation of the Suitelet response
     * @Since 2015.2
     */
    function onRequest(context) {
    	var passedInParameters = context.request.parameters.custparam_parameters || '';
    	// Either the parameters are passed in through the URL or passed in though POST
    	if (passedInParameters != '')
    		SSLib_Task.startMapReduceScript(context.request.parameters.custparam_scriptid, context.request.parameters.custparam_scriptdeploymentid, JSON.parse(context.request.parameters.custparam_parameters || '{}') || {}, context.request.parameters.custparam_priority || '2', context.request.parameters.custparam_concurrency || '6', context.request.parameters.custparam_yeildaftermins || '60');
    	else //passed data though post
    		SSLib_Task.startMapReduceScript(context.request.parameters.custparam_scriptid, context.request.parameters.custparam_scriptdeploymentid, JSON.parse(context.request.body || '{}') || {}, context.request.parameters.custparam_priority || '2', context.request.parameters.custparam_concurrency || '6', context.request.parameters.custparam_yeildaftermins || '60');
    }

    return {
        onRequest: onRequest
    };
});
