/**
 * Company            Explore Consulting
 * Copyright            2012 Explore Consulting, LLC
 * Type                NetSuite EC_Scheduled_TimeEntryBenchmark
 * Version            1.0.0.0
 * Description        Boilerplate startup code for a NetSuite RESTlet.
 **/

function onStart()
{
    var context = nlapiGetContext();
    var projectID = context.getSetting('SCRIPT','custscript_project_id_benchmark');
    var version = context.getSetting('SCRIPT','custscript_benchmark_version');

    nlapiLogExecution('DEBUG','Project ID',projectID);

    var filters = [];
    filters.push(new nlobjSearchFilter('customer',null,'anyof',projectID));

    var columns = [];
    columns.push(new nlobjSearchColumn('hours'));

    var results = nlapiSearchRecord('timebill',null,filters,columns);
    var rec;

    for ( var i=0; results && i < results.length; i++ )
    {
        nlapiLogExecution('DEBUG','Time Entry ' + results[i].getId(),'Time: ' + results[i].getValue(columns[0]));
        if ( version == '1' )
            nlapiSubmitField('job',projectID,'comments',results[i].getValue(columns[0]));
        else if ( version == '2' )
        {
            rec = nlapiLoadRecord('job',projectID);
            rec.setFieldValue('comments',results[i].getValue(columns[0]));
            nlapiSubmitRecord(rec);
        }
        else if ( version == '3' )
        {
            rec = nlapiLoadRecord('job',projectID);
        }
        
    }

    nlapiLogExecution('AUDIT','Finished','Processed ' + results.length + ' entries');
}