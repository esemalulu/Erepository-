var Store = new Object();
Store.ScriptLogs = new Object();
Store.ScriptExecutionTimes = new Object();
Store.ScriptExecutionStatus = new Object();

var BeginDateTime = 0;
var BeginDateTimeinMS = 0;
var EndDateTime = 0;
var EndDateTimeinMS = 0;
var ProcessingTimeinSeconds = 0;
var dt = new Date();


function ECBLogStart(obj) {

    var ms = dt.getTime();
    BeginDateTime = getTimeStampDetails();
    BeginDateTimeinMS = ms;

    initializeScriptDetails(obj);
    Store.ScriptExecutionTimes['BeginDateTime'] = BeginDateTime; // Added by Sudheer Pellakuru on 08/26/2019
    Store.ScriptExecutionTimes['BeginDateTimeinMS'] = BeginDateTimeinMS; // Added by Sudheer Pellakuru on 08/26/2019


}

function initializeScriptDetails(obj) {

    if (obj.scriptid) {
        Store.ScriptId = obj.scriptid;
    }

    if (obj.scriptName) {
        Store.scriptName = obj.scriptName;
    } // Added by Sudheer Pellakuru on 08/26/2019

    if (obj.ScriptParameters) {
        Store.ScriptParameters = obj.ScriptParameters;
    }

}


function ECBLogEnd(obj) {

    dt = new Date();

    initializeProcessDetails(obj);
    var ms = dt.getTime();
    EndDateTime = getTimeStampDetails();
    EndDateTimeinMS = ms;

    BeginDateTimeinMS = Store.ScriptExecutionTimes['BeginDateTimeinMS']; // Added by Sudheer Pellakuru on 08/26/2019
    var timeDiff = parseInt(EndDateTimeinMS) - parseInt(BeginDateTimeinMS);

    var pSeconds = ((timeDiff) / 1000);
    pSeconds = pSeconds.toFixed(2);
    ProcessingTimeinSeconds = pSeconds

    // Get Execution times object

    //Store.ScriptExecutionTimes['BeginDateTime'] = BeginDateTime; // Commented by Sudheer Pellakuru on 08/26/2019
    //Store.ScriptExecutionTimes['BeginDateTimeinMS'] = BeginDateTimeinMS; // Commented by Sudheer Pellakuru on 08/26/2019
    Store.ScriptExecutionTimes['EndDateTime'] = EndDateTime;
    Store.ScriptExecutionTimes['EndDateTimeinMS'] = EndDateTimeinMS;
    Store.ScriptExecutionTimes['ProcessingTimeinSeconds'] = ProcessingTimeinSeconds + " Seconds";

    createLogRecord(Store);
}


function SetStatus(obj) {

    if (obj.statusCode) {
        Store.ScriptExecutionStatus['StatusCode'] = obj.statusCode;
    }

}
function initializeProcessDetails(obj) {

    if (obj.ProcessValidationDetails) {
        Store.ProcessValidationDetails = obj.ProcessValidationDetails;
    }
    if (obj.ProcessResult) {
        Store.ProcessResults = obj.ProcessResults;
    }
    if (obj.KeyWords) {
        Store.KeyWords = obj.KeyWords;
    }

}

function createLogRecord(Store) {

    try{ // Added by Sudheer Pellakuru on 08/30/2019
    var rec = nlapiCreateRecord('customrecord_wmsts_exe_logs');

    rec.setFieldValue('name', Store.ScriptId + " | " + dt.getDate());
   // rec.setFieldValue('custrecord_scriptid', Store.ScriptId); // Commented by Sudheer Pellakuru on 08/26/2019

    rec.setFieldValue('custrecord_scriptid', Store.scriptName
    ); // Added by Sudheer Pellakuru on 08/26/2019
    rec.setFieldValue(
        'custrecord_exebtime',
        Store.ScriptExecutionTimes['BeginDateTime']
    );
    rec.setFieldValue(
        'custrecord_exe_btime_ms',
        Store.ScriptExecutionTimes['BeginDateTimeinMS']
    );
    rec.setFieldValue(
        'custrecord_exe_endtime',
        Store.ScriptExecutionTimes['EndDateTime']
    );
    rec.setFieldValue(
        'custrecord_exe_endtime_ms',
        Store.ScriptExecutionTimes['EndDateTimeinMS']
    );
    rec.setFieldValue(
        'custrecord_exe_total_time',
        Store.ScriptExecutionTimes['ProcessingTimeinSeconds']
    );
    var storeObjDetails = JSON.stringify(Store) // Added by Sudheer Pellakuru on 08/30/2019
    //rec.setFieldValue('custrecord_store_obj_details',JSON.stringify(Store)); // Commented by Sudheer Pellakuru on 08/30/2019
    rec.setFieldValue(
        'custrecord_store_obj_details',
        storeObjDetails.substr(0,999999)
    ); // Added by Sudheer Pellakuru on 08/30/2019
    var scriptLogsData = JSON.stringify(Store.ScriptLogs); // Added by Sudheer Pellakuru on 08/30/2019
    //rec.setFieldValue('custrecord_script_log_detail', JSON.stringify(Store.ScriptLogs)); // Commented by Sudheer Pellakuru on 08/30/2019
    rec.setFieldValue('custrecord_script_log_detail', scriptLogsData.substr(0,999999)); // Added by Sudheer Pellakuru on 08/30/2019
    rec.setFieldValue(
        'custrecord_script_status',
        JSON.stringify(Store.ScriptExecutionStatus)
    );
    rec.setFieldValue(
        'custrecord_exe_keyword',
        JSON.stringify(Store.KeyWords)
    );

    var id = nlapiSubmitRecord(rec, true);
    } // Added by Sudheer Pellakuru on 08/30/2019
    catch (e) {} // Added by Sudheer Pellakuru on 08/30/2019
}

function getTimeStampDetails()//dd-mm-yyyy hh24:mm:secs:millisecs
{
    var dt = new Date();
    var dd = dt.getDate();
    dd = (dd < 10 ? dd = '0' + dd : dd);
    var mm = dt.getMonth() + 1;
    mm = (mm < 10 ? mm = '0' + mm : mm);
    var yyyy = dt.getFullYear();
    var h = dt.getHours();
    h = (h < 10 ? h = '0' + h : h);
    var m = dt.getMinutes()
    m = (m < 10 ? m = '0' + m : m);
    var s = dt.getSeconds();
    s = (s < 10 ? s = '0' + s : s);
    var z = dt.getMilliseconds();
    if (z < 10)
        z = '00' + z;
    else if (z < 100)
        z = '0' + z;

    var fulldate = dd + "/" + mm + "/" + yyyy + " " + h + ":" + m + ":" + s + ":" + z;
    return fulldate;
}

function getDate(dt) {

    var dd = dt.getDate();
    dd = (dd < 10 ? dd = '0' + dd : dd);
    var mm = dt.getMonth() + 1;
    mm = (mm < 10 ? mm = '0' + mm : mm);
    var yyyy = dt.getFullYear();
    var fulldate = dd + "/" + mm + "/" + yyyy;
    return fulldate;

}
function ScriptLogs(obj) {

    if (obj.name && obj.value) {
        var name = obj.name;
        var value = obj.value;
        var timestamp = new Date();
        var date = getTimeStampDetails(timestamp);
        /* // Commented by Sudheer Pellakuru on 08/26/2019
        if (!Store.ScriptLogs[date + "|" + name]) {
            Store.ScriptLogs[date + "|" + name] = {};
            Store.ScriptLogs[date + "|" + name][name] = value;
        } else {
            Store.ScriptLogs[date + "|" + name][name] = value;
        }
        */
        Store.ScriptLogs[date + " ::: " + name] = name + " ::: " + value; // Added by Sudheer Pellakuru on 08/26/2019
        
    } else {
        var date = getTimeStampDetails(timestamp);
        Store.ScriptLogs[date] = obj
    }

}
