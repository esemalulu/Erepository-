/// <reference path="netsuiteAPI.js" />

var nsiRemoteHost = "service.tricerat.com";
var nsiRemotePort = "53192";

// NetSuite script run constraints
var MAX_SCHED_EXECUTION_SECONDS = 600;
var MAX_USEREVENT_EXECUTION_SECONDS = 60;
var MAX_SUITELET_EXECUTION_SECONDS = 60;
var MAX_SCHED_USAGE_UNITS = 10000;
var MAX_USEREVENT_USAGE_UNITS = 1000;
var MAX_SUITELET_USAGE_UNITS = 1000;

var MAX_DUMP_DEPTH = 10;

function dumpObj(obj, name, indent, depth) {
    if (depth > MAX_DUMP_DEPTH) {
        return indent + name + ": <Maximum Depth Reached>\n";
    }
    if (typeof obj == "object") {
        var child = null;
        var output = indent + name + "\n";
        indent += "\t";
        for (var item in obj) {
            try {
                child = obj[item];
            } catch (e) {
                child = "<Unable to Evaluate>";
            }
            if (typeof child == "function") {
                output += indent + "function " + item + "()\n";
            } else if (typeof child == "object") {
                output += dumpObj(child, item, indent, depth + 1);
            } else {
                output += indent + item + ": " + child + "\n";
            }
        }
        return output;
    } else {
        return obj;
    }
}

Date.prototype.addSeconds = function(seconds)
{
    var newSeconds = this.getSeconds() + seconds;
    if (Math.abs(newSeconds) >= 60)
    {
        this.addMinutes((newSeconds / 60) | 0);
    }
    var newSet = (60 + (newSeconds % 60)) % 60;
    this.setSeconds(newSet);
}

Date.prototype.addMinutes = function(minutes)
{
    var newMinutes = this.getMinutes() + minutes;
    if (Math.abs(newMinutes) >= 60)
    {
        this.addHours((newMinutes / 60) | 0);
    }
    var newSet = (60 + (newMinutes % 60)) % 60;
    this.setMinutes(newSet);
}

Date.prototype.addHours = function(hours)
{
    var newHours = this.getHours() + hours;
    if (Math.abs(newHours) >= 24)
    {
        this.addDays((newHours / 24) | 0);
    }
    var newSet = (24 + (newHours % 24)) % 24;
    this.setHours(newSet);
}

Date.prototype.addDays = function(days)
{
    var dt = Date(nlapiAddDays(this, days));
    dt.setFullYear(dt.getFullYear(), dt.getMonth, dt.getDate());
}

Date.prototype.addWeeks = function(weeks)
{
    this.addDays(weeks * 7);
}

Date.prototype.addMonths = function(months)
{
    var dt = Date(nlapiAddMonths(this, months));
    this.setFullYear(dt.getFullYear(), dt.getMonth());
}

Date.prototype.addYears = function(years)
{
    this.setFullYear(this.getFullYear() + years);
}

Date.prototype.fromSoapDateString = function(soapDate)
{
    soapDate = String(soapDate);
    var pieces = soapDate.split("T");
    var datePieces = pieces[0].split("-");
    var timePieces = pieces[1].split(".")[0].split(":");

    this.setFullYear(datePieces[0], datePieces[1] - 1, datePieces[2]);
    this.setHours(timePieces[0], timePieces[1], timePieces[2]);
}

function processFulfillment(fulfillmentId) 
{
    nlapiLogExecution('DEBUG', '_nsiLibrary.processFulfillment', 'Making external call to host [' + nsiRemoteHost + ':' + nsiRemotePort + ']');
    try {
        var url = "http://" + nsiRemoteHost + ":" + nsiRemotePort + "/NSIntegrationService.svc/rest/ProcessFulfillment?fulfillmentId=" + fulfillmentId;
        nlapiLogExecution('DEBUG', '_nsiLibrary.processFulfillment', url);
        var response = nlapiRequestURL(url, null, null);
        var responseBody = response.getBody();
        if (response.code != 200) {
            throw ('HTTP Status: ' + response.code + '\n' + responseBody);
        }
    }
    catch (err) {
        var errorText = "Communication Error: There was a problem reaching triCerat's license service.\n[" + err + "]";
        nlapiLogExecution('EMERGENCY', '_nsiLibrary.processFulfillment', errorText);
        throw (errorText);
    }
}

function getSerialNumber(productCode)
{
    nlapiLogExecution('DEBUG', '_nsiLibrary.getSerialNumber', 'Making external call to host [' + nsiRemoteHost + ':' + nsiRemotePort + ']');
    var serialNbr = null;
    try
    {
        var url = "http://" + nsiRemoteHost + ":" + nsiRemotePort + "/NSIntegrationService.svc/rest/GetSerialNumber?productCode=" + productCode;
        nlapiLogExecution('DEBUG', '_nsiLibrary.getSerialNumber', url);
        var response = nlapiRequestURL(url, null, null);
        var responseBody = response.getBody();
        if (response.code != 200)
        {
            throw ('HTTP Status: ' + response.code + '\n' + responseBody);
        }
        var responseXml = nlapiStringToXML(responseBody);
        serialNbr = nlapiSelectValue(responseXml, "/string");
    }
    catch (err)
    {
        var errorText = "Communication Error: There was a problem reaching triCerat's license service.\n[" + err + "]";
        nlapiLogExecution('EMERGENCY', '_nsiLibrary.getSerialNumber', errorText);
        throw (errorText);
    }
    return(serialNbr);
}

function getSerialNumbers(productCode, count)
{
    nlapiLogExecution('DEBUG', '_nsiLibrary.getSerialNumbers', 'Making external call to host [' + nsiRemoteHost + ':' + nsiRemotePort + ']');
    var serialNbrs;
    try
    {
        var url = "http://" + nsiRemoteHost + ":" + nsiRemotePort + "/NSIntegrationService.svc/rest/GetSerialNumbers?productCode=" + productCode + "&count=" + count;
        nlapiLogExecution('DEBUG', '_nsiLibrary.getSerialNumbers', url);
        var response = nlapiRequestURL(url, null, null);
        var responseBody = response.getBody();
        if (response.code != 200)
        {
            throw ('HTTP Status: ' + response.code + '\n' + responseBody);
        }
        var responseXml = nlapiStringToXML(responseBody);
        serialNbrs = nlapiSelectValues(responseXml, "/ArrayOfstring/string");
    }
    catch (err)
    {
        var errorText = "Communication Error: There was a problem reaching triCerat's license service.\n[" + err + "]";
        nlapiLogExecution('EMERGENCY', '_nsiLibrary.getSerialNumbers', errorText);
        throw (errorText);
    }
    
    return serialNbrs;
}

function createTFSWorkItem(issueType, issueAbstract, status, assignedTo, product, priority, description)
{
    nlapiLogExecution('DEBUG', '_nsiLibrary.createTFSWorkItem', 'Making external call to host [' + nsiRemoteHost + ':' + nsiRemotePort + ']');
    var workItemNbr = null;
    try
    {
        var url = "http://" + nsiRemoteHost + ":" + nsiRemotePort + "/NSIntegrationService.svc/rest/CreateTFSWorkItem";

        var postData = new Array();
        postData.type = issueType;
        postData.title = issueAbstract;
        postData.state = status;
        postData.technician = assignedTo;
        postData.component = product;
        postData.rank = priority;
        postData.description = description;
        postData.nsUser = nlapiGetContext().getName();

        var response = nlapiRequestURL(url, postData, null);
        var responseBody = response.getBody();
        if (response.code != 200)
        {
            throw ('HTTP Status: ' + response.code + '\n' + responseBody);
        }
        var responseXml = nlapiStringToXML(responseBody);
        //workItemNbr = nlapiSelectValue(responseXml, "/int");
        workItemNbr = nlapiSelectValue(responseXml, "/*[name()='int']");
        

        nlapiLogExecution('DEBUG', 'createTFSWorkItem', 'Work Item created: ' + workItemNbr);
    }
    catch (err)
    {
        var errorText = "Communication Error: There was a problem reaching triCerat's license service.\n[" + err + "]";
        nlapiLogExecution('EMERGENCY', '_nsiLibrary.createTFSWorkItem', errorText);
        throw (errorText);
    }
    return (workItemNbr);
}

function linkTFSWorkItem(tfsWorkItemId, link) {
    nlapiLogExecution('DEBUG', '_nsiLibrary.linkTFSWorkItem', 'Making external call to host [' + nsiRemoteHost + ':' + nsiRemotePort + ']');
    try
    {
        var url = "http://" + nsiRemoteHost + ":" + nsiRemotePort + "/NSIntegrationService.svc/rest/LinkTFSWorkItem";
        url += "?tfsWorkItemId=" + escape(tfsWorkItemId);
        url += "&link=" + escape(link);
        var response = nlapiRequestURL(url, null, null);
        if (response.code != 200)
        {
            throw ('HTTP Status: ' + response.code);
        }
        nlapiLogExecution('DEBUG', 'linkTFSWorkItem', 'Returned Status: ' + response);
    }
    catch (err)
    {
        var errorText = "Communication Error: There was a problem reaching triCerat's license service.\n[" + err + "]";
        nlapiLogExecution('EMERGENCY', '_nsiLibrary.linkTFSWorkItem', errorText);
        throw (errorText);
    }
}

function getActivations(since)
{
    nlapiLogExecution('DEBUG', '_nsiLibrary.getActivations', 'Making external call to host [' + nsiRemoteHost + ':' + nsiRemotePort + ']');
    var activations = new Array();
    try
    {
        var url = "http://" + nsiRemoteHost + ":" + nsiRemotePort + "/NSIntegrationService.svc/rest/GetActivations?since=" + encodeURIComponent(since);
        var response = nlapiRequestURL(url, null, null);
        var responseBody = response.getBody();
        if (response.code != 200)
        {
            throw ('HTTP Status: ' + response.code + '\n' + responseBody);
        }
        var responseXml = nlapiStringToXML(responseBody);
        try 
        {
            var activationNodes = nlapiSelectNodes(responseXml, "//*[local-name()='ActivationInformation']");

            for (var i = 0; i < activationNodes.length; i++) {
                activations[i] = new Object();
                activations[i].serialNumber = nlapiSelectValue(activationNodes[i], "*[local-name()='SerialNumber']");
                activations[i].lastActivationCode = nlapiSelectValue(activationNodes[i], "*[local-name()='LastActivationCode']");
                activations[i].lastActivationDate = new Date();
                activations[i].lastActivationDate.fromSoapDateString(nlapiSelectValue(activationNodes[i], "*[local-name()='LastActivationDate']"));
                activations[i].lastMachineId = nlapiSelectValue(activationNodes[i], "*[local-name()='LastMachineId']");
                activations[i].activationCount = nlapiSelectValue(activationNodes[i], "*[local-name()='ActivationCount']");
            }
        }
        catch (err2) 
        {
            var errorText = "Communication Error: There was a problem parsing the activation responses.\n[" + err + "]";
            nlapiLogExecution('EMERGENCY', '_nsiLibrary.getActivations', errorText);
            throw (errorText);
        }        
    }
    catch (err)
    {
        var errorText = "Communication Error: There was a problem reaching triCerat's license service.\n[" + err + "]";
        nlapiLogExecution('EMERGENCY', '_nsiLibrary.getActivations', errorText);
        throw (errorText);
    }
    return (activations);
}


var _nsiCurrentContext;
function getRemainingUsage()
{
    if (_nsiCurrentContext == null)
    {
        _nsiCurrentContext = nlapiGetContext();
    }
    return (_nsiCurrentContext.getRemainingUsage());
}
