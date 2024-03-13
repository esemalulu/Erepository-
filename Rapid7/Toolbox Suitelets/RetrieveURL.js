/**
 * Module Description
 * 
 * Version    Date            Author           Remarks
 * 1.00       09 Oct 2017     ngrigoriev
 *
 */

/**
 * @param {nlobjRequest} request Request object
 * @param {nlobjResponse} response Response object
 * @returns {Void} Any output is written via response object
 */
function retrieveDataCenterURL(request, response){
//Get ID of running Suitelet script
var env = nlapiGetContext();
if(request.getMethod() == 'GET'){
var script = {
id: env.getScriptId(),
deployment: env.getDeploymentId()
}

//Get DataCenter URL from Suitelet Deployment record
script.id = nlapiLookupField('suitelet',script.id,'internalid');
nlapiLogExecution('DEBUG','Script ID: ',script.id);

script.deployment = nlapiSearchRecord('scriptdeployment',null,['script','anyof',script['id']],[new nlobjSearchColumn('internalid')]);
script.deployment = script.deployment[0].getId();
nlapiLogExecution('DEBUG','Deployment ID',script.deployment);

var deploymentRec = nlapiLoadRecord('scriptdeployment',script.deployment);
var url = deploymentRec.getFieldValue('externalurl');
nlapiLogExecution('DEBUG','Suitelet Script Deployment External URL:',url);
url = url.substring(0,url.indexOf('/app')).replace('forms','system');
nlapiLogExecution('DEBUG','Data Center URL',url);
response.write(url); //return url
}
}