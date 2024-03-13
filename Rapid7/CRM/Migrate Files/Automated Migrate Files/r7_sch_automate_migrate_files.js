var context;
var timeLimitInMinutes;
var timeLimitInMilliseconds;
var startingTime;
var rescheduleScript;
function r7_sch_migrateFiles()
{
    context = nlapiGetContext();
    timeLimitInMinutes = 40;
    timeLimitInMilliseconds = timeLimitInMinutes * 60 * 1000;
    startingTime = new Date().getTime();
    rescheduleScript = false;
    var arrResults = nlapiSearchRecord('customer', 'customsearch_r7semigratefiles');
    for (var i = 0; arrResults && i < arrResults.length && isTimeLeft() && isUnitsLeft(); i++) {
        var columns = arrResults[i].getAllColumns();
        var customerToId = arrResults[i].getValue(columns[3]);
        var arrMessagesId = (arrResults[i].getValue(columns[5])).split(',');
        migrateAllFiles(arrMessagesId, customerToId);
    }
    reScheduled();
}
function migrateAllFiles(arrMessagesId, customerToId) {
    for (var i = 0; i < arrMessagesId.length; i++)
    {
        try {
            nlapiAttachRecord('file', arrMessagesId[i], 'customer', customerToId);
            nlapiLogExecution('DEBUG', 'Migrate was successfull. Customer ID =' + customerToId, 'File id = ' + arrMessagesId[i]);
        }
        catch (e) {
            nlapiLogExecution('ERROR', 'ERROR during attach process', e);
        }
    }
}
function isTimeLeft() {
    var presentTime = new Date().getTime();
    nlapiLogExecution('AUDIT', 'presentTime', presentTime);
    if (rescheduleScript || presentTime - startingTime > timeLimitInMilliseconds) {
        nlapiLogExecution('AUDIT', 'Ran out of time', 'yup');
        rescheduleScript = true;
        return false;
    }
    return true;
}

function isUnitsLeft() {
    var unitsLeft = context.getRemainingUsage();
    nlapiLogExecution('AUDIT', 'unitsLeft', unitsLeft);
    if (rescheduleScript || unitsLeft <= 200) {
        nlapiLogExecution('AUDIT', 'Ran out of units', 'yup');
        rescheduleScript = true;
        return false;
    }
    return true;
}

function reScheduled()
{
    if (rescheduleScript) {
        nlapiLogExecution('AUDIT', 'Rescheduling script (script/deploy id)', 'yup');
        var status = nlapiScheduleScript(context.getScriptId(), context.getDeploymentId());
        nlapiLogExecution('DEBUG', 'Schedule Status', status);
    }
}