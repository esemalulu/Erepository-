/**
 * Scheduled script, Map/Reduce, and other task-related functions for Solution Source accounts. 
 * 
 * Version    Date            Author           Remarks
 * 1.00       23 Sep 2020     Jeffrey Bajit
 *
 */

/**
 * Schedules a script. If there is no deployment set (null), then it will use the next available deployment.
 * If no deployment exists, then it will create a new deployment given the script internalId.
 * @param scriptId
 * @param deployId
 * @param params
 */
function ScheduleScript(scriptId, deployId, params) {
    // if the deployments are set, then use them
    if (deployId != null && deployId != '') {
        return nlapiScheduleScript(scriptId, deployId, params);
    }
    else {
        // try to deploy the script
        var status = nlapiScheduleScript(scriptId, null, params);
        
        // if the status of the script is not QUEUED, then automatically create a new deployment and deploy it
        if(status != 'QUEUED') {
            // do a search that looks up the internal id of the script where the script id is the one being passed in.
            var searchResults = nlapiSearchRecord('script', null, new nlobjSearchFilter('scriptid', null, 'is', scriptId), null);
            
            if (searchResults != null && searchResults.length > 0) {
                var initArray = new Array();
                initArray['script'] = searchResults[0].getId();

                var deployment = nlapiCreateRecord('scriptdeployment', initArray);
                deployment.setFieldValue('isdeployed', 'T');
                deployment.setFieldValue('title', 'Auto Deployment');               
                var newDeployId = nlapiSubmitRecord(deployment);
                
                // we need the deployment's script id (not the internalid), so look it up.
                var newDeployment= nlapiLoadRecord('scriptdeployment', newDeployId);
                var newDeployScriptId = newDeployment.getFieldValue('scriptid');
                
                return nlapiScheduleScript(scriptId, newDeployScriptId, params);
            } else {
                throw nlapiCreateError('CANNOTAUTOSCHEDULESCRIPT', 'Script ' + scriptId + ' cannot automatically be rescheduled because script cannot be found in a search.', false);
            }
        }
        
        return status;
    }
}