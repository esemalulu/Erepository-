/**
 * Module Description
 * 
 * Version    Date            Author           Remarks
 * 1.00       09 Oct 2017     ngrigoriev
 *
 */

/**
 * The recordType (internal id) corresponds to the "Applied To" record in your script deployment. 
 * @appliedtorecord recordType 
 * 
 * @param {String} type Access mode: create, copy, edit
 * @returns {Void}
 */
function PageInit_DynamicURL(type, name, linenum){
var toURL = getDataCenterURL_systemURL();
nlapiLogExecution ('DEBUG', 'toURL', toURL);
}
function getDataCenterURL_systemURL(){
var systemURL = nlapiRequestURL(nlapiResolveURL('SUITELET','customscriptretrieveurl','customdeployretrieveurl',true)).getBody();
return systemURL;
}

