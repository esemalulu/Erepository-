nlapiLogExecution("audit","FLOStart",new Date().getTime());
/**
 * Module Description
 * 
 * Version    Date            Author           Remarks
 * 1.00       08 Oct 2016     Rafe Goldbach, SuiteLaunch LLC
 *
 */

/**
 * @param {String} type Context Types: scheduled, ondemand, userinterface, aborted, skipped
 * @returns {Void}
 */
// this script is intended to be fired by a suitelet once the suitelet is finished preparing the RDS Export file
// it provides a list of internal ids of purchase orders which were exported to RDS
// these po's are updated via CSV script to clear the export to RDS flag


function rds_update(){
	var context = nlapiGetContext();
	var fileId = context.getSetting('SCRIPT', 'custscript_field_id');
    var rdsCSVImport = nlapiCreateCSVImport();
    //rdsCSVImport.setMapping('CUSTIMPORT_rds_update');
    rdsCSVImport.setMapping(96);
    rdsCSVImport.setPrimaryFile(nlapiLoadFile(fileId));
    nlapiLogExecution('debug', 'fileId',fileId);
    //rdsCSVImport.setQueue('2');
    rdsCSVImport.setOption('jobName','RDS_Update');
    //nlapiLogExecution('debug', 'file',rdsCSVImport);
    var importId = nlapiSubmitCSVImport(rdsCSVImport);
    nlapiLogExecution('debug', 'importId',importId);
    nlapiLogExecution('debug', 'PO update','complete');
    //delete the file from the file cabinet
    nlapiDeleteFile(fileId);
    nlapiLogExecution('debug', 'delete PO file','deleted');
}

/*
 * //schedule the script execution and define script parameter values
var startDate = new Date();
var params = {
    custscriptstartdate: startDate.toUTCString(),
    custscriptsubsidiary: 42
    nlapiScheduleScript('customscript_audit_report', 'customdeploy_audit_report_dp', params);
}

//so that the scheduled script API knows which script to run, set the custom ID
//specified on the Script record. Then set the custom ID on the Script Deployment
nlapiScheduleScript('customscript_audit_report', 'customdeploy_audit_report_dp', params);2
}

//so that the scheduled script API knows which script to run, set the custom ID
//specified on the Script record. Then set the custom ID on the Script Deployment
nlapiScheduleScript('customscript_audit_report', 'customdeploy_audit_report_dp', params);
 */

/*//retrieve parameters inside a scheduled script
function scheduled_main()
{
//get script parameter values
var context = nlapiGetContext();
var strStartDate = context.getSetting('SCRIPT', 'custscriptstartdate');

var subsidiary = context.getSetting('SCRIPT', 'custscriptsubsidiary');
var startDate = new Date(strStartDate);

//schedule the script execution and define script parameter values
var startDate = new Date();
var params = {
    custscriptstartdate: startDate.toUTCString(),
    custscriptsubsidiary: 42
}

//so that the scheduled script API knows which script to run, set the custom ID
//specified on the Script record. Then set the custom ID on the Script Deployment
nlapiScheduleScript('customscript_audit_report', 'customdeploy_audit_report_dp', params);
}
*/