nlapiLogExecution("audit","FLOStart",new Date().getTime());
/**
 * Module Description
 * 
 * Version    Date            Author           Remarks
 * 1.00       24 Oct 2016     Rafe Goldbach, SuiteLaunch LLC
 *
 */
function afterSubmit(type) {

    // if type = edit and status is not received then set RDS download type to B-Edit
    var docStatus = nlapiGetFieldValue('status');
    
    var docId = nlapiGetRecordId();
    var exportStatus = nlapiGetFieldValue('custbody_export_rds');
    var fields = new Array();
    fields[0] = 'custbody_rds_download_type';
    fields[1] = 'custbody_export_rds';
    var values = new Array();
    values[0] = '2';
    values[1] = 'T';
    nlapiLogExecution('debug','docStatus',docStatus);
   // nlapiLogExecution('debug','docId',docId);
    //nlapiLogExecution('debug','exportStatus',exportStatus);
   // nlapiLogExecution('debug','type',type);
    if (exportStatus == 'F') {
    	nlapiLogExecution('debug','exportStatus','exportStatus is: '+exportStatus);
        if ((type == 'edit' || type == 'xedit') && docStatus == 'Approved by Supervisor/Pending Receipt') {
        	nlapiLogExecution('debug','type','type is: '+type);
        	nlapiLogExecution('debug','exportStatus','exportStatus is: '+exportStatus);

            nlapiLogExecution('debug','submitting','record');
            nlapiSubmitField('purchaseorder', docId, fields, values);   
        }
    }
    
    if ((type == 'edit' || type == 'xedit') && docStatus == 'Approved by Supervisor/Pending Receipt') {
    	nlapiLogExecution('debug','type','type is: '+type);
    	nlapiLogExecution('debug','exportStatus','exportStatus is: '+exportStatus);

        nlapiLogExecution('debug','submitting','record');
        nlapiSubmitField('purchaseorder', docId, fields, values);   
    }
}