/**
 * Module Description
 * 
 * Version    Date            Author           Remarks
 * 1.00       18 Jul 2014     dgeronimo
 * 2.00		  07 Jul 2015     rilagan
 */

/**
 * @param {Object} dataIn Parameter object
 * @returns {Object} Output object
 */

/// <reference path="~\Lib\_dg_nlapiLibEx.js" />
function isEmpty(value) {
    if (value == null || value == undefined || value == '' || value.length <= 0) {
	return true;
    }
    return false;
}

if (!String.prototype.format) {
    String.prototype.format = function() {
	var args = arguments;
	return this.replace(/{(\d+)}/g, function(match, number) {
	    return typeof args[number] != 'undefined' ? args[number] : match;
	});
    };
}
if (!Array.prototype.getRange) {
    Array.prototype.getRange = function(sIndex, length) {
	length = (isEmpty(length)) ? 1 : length;
	return this.slice(sIndex, sIndex + length);
    }
}

function getRESTlet(dataIn) {

    return {};
}

/**
 * @param {Object} dataIn Parameter object
 * @returns {Object} Output object
 */
function tsg_integrator_reslet(dataIn) {
    var logTitle = "tsg_integrator_reslet";
    nlapiLogExecution("DEBUG", logTitle, "[START]*******************************************");

    nlapiLogExecution("DEBUG", logTitle, "is Empty dataIn.getConfig: " + dataIn.getConfig + " " + isEmpty(dataIn.getConfig));
    nlapiLogExecution("DEBUG", logTitle, "is Empty dataIn.mapId: " + dataIn.mapId + " " + isEmpty(dataIn.mapId));
    nlapiLogExecution("DEBUG", logTitle, "is Empty dataIn.csvData: " + isEmpty(dataIn.csvData));
    nlapiLogExecution("DEBUG", logTitle, "is Empty dataIn.fileName: " + isEmpty(dataIn.fileName));
    if (!isEmpty(dataIn.getConfig)) {
	return getMappingConfiguration(dataIn.getConfig);
    }

    if (!isEmpty(dataIn.mapId) && !isEmpty(dataIn.csvData)) {
	return processCSVImport(dataIn);
    }
    return {
	Errors : [ "Invalid Call" ]
    };
}

function getMappingConfiguration(configHeader) {
    var logTitle = "getMappingConfiguration";
    nlapiLogExecution("DEBUG", logTitle, "[START]*******************************************");

    var mappingRecType = "customrecord_stg_integraton_mapping";
    var retVal = new Array();
    switch (configHeader) {
    case "MAPPING_GETALL":
	var filters = new Array();
	filters.push(new nlobjSearchFilter("isinactive", null, "is", "F"));

	var result = nlapiSearchRecord(mappingRecType, null, filters);

	for ( var ind = 0; ind < result.length; ind++) {

	    var configMapping = nlapiLoadRecord(mappingRecType, result[ind]
		    .getId());
	    var mapObj = {
	    id : configMapping.getFieldValue("id"),
		
	    name : configMapping.getFieldValue("name"),
	    mapId : configMapping.getFieldValue("custrecord_tsg_integration_mapid"),
	    csvHeader : configMapping.getFieldValue("custrecord_stg_integraton_header_format"),
	    primaryId: configMapping.getFieldValue("custrecord_tsg_integraton_primaryid")
	    };
	    retVal.push(mapObj);
	}
    }
    nlapiLogExecution("DEBUG", logTitle, "[END]*********************************************");
    return retVal;
}

function processCSVImport(dataIn)
{
    var logTitle = "processCSVImport";
    nlapiLogExecution("DEBUG", logTitle, "[START]*******************************************");
    var csvContext = dataIn.csvData;
    var mappingFileId = dataIn.mapId;

    var row = csvContext.split(/\n/g).length;
    var jobName = dataIn.jobName;
    var part = (!isEmpty(dataIn.requestPart)) ? " Part:" + dataIn.requestPart : "";
    var intPart = (!isEmpty(dataIn.requestPart)) ?  dataIn.requestPart : 1;
	var suiteCloud = (!isEmpty(dataIn.suiteCloud)) ?  (dataIn.suiteCloud).toLowerCase().trim() : false;
	var queue = (!isEmpty(dataIn.queue)) ?  (dataIn.queue).toString().trim(): false;
    var stDate = (!isEmpty(dataIn.date)) ? dataIn.date : nlapiDateToString(new Date(), "datetime"); //nlapiDateToString(new Date(), "datetime");
    var fileName = dataIn.fileName;
    var stUser = nlapiGetContext().getEmail();

    var retVal = {
        importId: 0,
        isSuccess: 'F',
        errorMessage: null,
        errorDetails: null,
        jobName: null
    };

    if(isEmpty(jobName)){
        jobName = "TSG Import Job ({0}) | Rows: {1}{2} Map: {3}".format(stDate, row, part, mappingFileId);
    } else
    {
        var compNameTag = "{compname}";
        var csvRowsTag = "{csvrows}";
        var datetimeTag = "{datetime}";
        var stFileNameTag = "{fileName}";
        var stUserTag = "{user}";

        if (jobName.indexOf(compNameTag) >= 0)
        {
            var recComp = nlapiLoadConfiguration('companyinformation');
            var stCompName = recComp.getFieldValue("companyname");
            jobName = jobName.replace(compNameTag, stCompName)
        }
        
        jobName = jobName.replace(csvRowsTag, row);
        jobName = jobName.replace(datetimeTag, stDate);
        jobName = jobName.replace(stFileNameTag, fileName);
        jobName = jobName.replace(stUserTag, stUser);

        jobName += part;
    }
	
    retVal.jobName = jobName;
    try
    {		
        var importjob = nlapiCreateCSVImport();
        importjob.setMapping(mappingFileId);
        importjob.setPrimaryFile(csvContext);
		
		//queueing
		if(suiteCloud == 'true'){
			importjob.setQueue(queue);
		}
        importjob
            .setOption("jobName", jobName);
        retVal.importId = nlapiSubmitCSVImport(importjob);
        if(parseInt(retVal.importId) > 0){
        	retVal.isSuccess = 'T';
        }else{
        	retVal.isSuccess = 'F';
            retVal.errorMessage = "ERROR IN DATA";
            retVal.errorDetails = retVal.importId;
        }
        
        nlapiLogExecution("DEBUG", logTitle, "Rows: " + row);
        nlapiLogExecution("DEBUG", logTitle, "[END]*********************************************");
    } catch (e)
    {		
        nlapiLogExecution("DEBUG", logTitle," error: "+e.toString());
        retVal.errorMessage = e.getCode();
        retVal.errorDetails = e.getDetails()
        retVal.isSuccess = 'F';
    }
    return retVal;
}
