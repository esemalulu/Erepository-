function doTheIntegration(){

    var ctx = nlapiGetContext();
    
    //Find all licenses with a productKey	
    var allResults = findAllLicenses();
    
    //For each license validate license details.
    var validated = new Array(); //List of internalids validated
    var inValidated = new Array(); //List of internalids invalidated
    var lastLeftOff = ctx.getSetting("SCRIPT", 'custscriptr7msnetsuiteintegtestleftoff');
    nlapiLogExecution('DEBUG', 'LastLeftOff', lastLeftOff);
    if (lastLeftOff == null) 
        lastLeftOff = 0;
    
    for (var i = lastLeftOff; allResults != null && i < allResults.length && unitsLeft(100); i++) {
    
    
        //Get Product Key
        var productKey = allResults[i].getValue('custrecordr7msproductkey');
        
        //Get internalid
        var internalId = allResults[i].getId();
        
        //ObtainFields in Netsuite
        var fieldValuesInNetsuite = getFieldValuesInNetsuite(internalId);
        
        //ObtainFields in Metasploit
        var fieldValuesInMetasploit = getFieldValuesInMetasploit(productKey);
        
        var comparisonVerdict = compareFields(fieldValuesInNetsuite, fieldValuesInMetasploit);
        
        if (comparisonVerdict[0] == true) {
            validated[validated.length] = internalId + "<br>";
            
        }
        else{
                inValidated[inValidated.length] = comparisonVerdict[1];
       }
    }
    
    var email = "Validated Licenses" + "<br>" + validated + "<br><br>Invalidated Licenses<br>" + inValidated;
    
    //Send Email
    nlapiSendEmail(2,2, 'Results', email);
    
    var params = new Array();
    params['custscriptr7msnetsuiteintegtestleftoff'] = i;
    
    if (allResults != null && i < allResults.length) {
        wasteUnits(ctx.getRemainingUsage() - 30);
        nlapiScheduleScript(ctx.getScriptId(), ctx.getDeploymentId(), params);
    }
}

function compareFields(netsuite, metasploit){
    var verdict = true;
    var results = new Array();
    for (var j = 0; j < netsuite.length; j++) {
		nlapiLogExecution('DEBUG','Netsuite Value:'+netsuite[j]," Metasploit Value:"+metasploit[j]);
        if (netsuite[j] != metasploit[j]) {
            verdict = false;
            results[results.length] = "Netsuite Value:" + netsuite[j] + " Licensing Server value" + metasploit[j];
        }
    }
    return new Array(verdict, results);
}

function getFieldValuesInNetsuite(internalId){

    var fieldNames = new Array('custrecordr7msdisabledkey', 'custrecordr7msinternal', 'custrecordr7mslastupdated', 'custrecordr7mstimelastupdated', 'custrecordr7msactivated', 'custrecordr7msactivationcount', 'custrecordr7msproductserialno', 'custrecordr7msversion', 'custrecordr7msactivationrevision', 'custrecordr7msactivationaddress', 'custrecordr7msplatform', 'custrecordr7msconfirmed', 'custrecordr7mssysprofileuname', 'custrecordr7mssysprofilenet', 'custrecordr7mssysprofilecpu', 'custrecordr7mssysprofiledomainname', 'custrecordr7mssysprofilehostname', 'custrecordr7mssysprofiledisk', 'custrecordr7mssysprofilerelease', 'custrecordr7msips', 'custrecordr7mslastcontactaction', 'custrecordr7mslastcontactdate', 'custrecordr7mslastcontacttime', 'custrecordr7mslicensingtimestamp');
    
    var lookupFields = nlapiLookupField('customrecordr7metasploitlicensing', internalId, fieldNames);
    
    return lookupFields;
}

function getFieldValuesInMetasploit(productKey){

    //Endpoint for queries as given by HD, in metasploitland
    var endpointForQueries = "https://updates.metasploit.com/license/query";
    
    //Obtaining the authorization parameters being set at the Admin Company Parameters	
    var httpAuthorization = nlapiGetContext().getSetting("SCRIPT", 'custscriptauthorization');
    //nlapiLogExecution('DEBUG','Http Authorization',httpAuthorization);
    
    //Setting up the request	
    //Setting the authorization to the base64 encoded hash provided
    var headers = new Array();
    headers['Authorization'] = "Basic " + httpAuthorization;
    
    var formParams = new Array();
    
    //Setting the productKey
    formParams['productKey'] = productKey;
    
    //Obtain response from Metasploit server, by passing in a timestamp
    //The webservice returns all licenses that have been activated/update sinceTime timestamp
    try {
        var result = nlapiRequestURL(endpointForQueries, formParams, headers);
    } 
    catch (err) {
        nlapiLogExecution('ERROR', err.name, err.message);
        throw nlapiCreateError(err.name, err, false);
    }
    
    //Get Body of Response
    var body = result.getBody();
    if (body == null || body.length <= 1) {
        throw nlapiCreateError("INVALIDRESPONSE", body, false);
    }
    
    //Attempt to parse XML text returned
    try {
        var xml = nlapiStringToXML(body);
    } 
    catch (err) {
        nlapiLogExecution('ERROR', err.name, err.message);
        throw nlapiCreateError(err.name, err.message, false);
    }
    
    
    
    var license = nlapiSelectNode(xml, '//license');
    
    //nlapiSendEmail(2,2, 'XML Response', body);
    
    var createdAt = null;//Not Used 
    var disabledKey = null;
    var expirationDate = null;
    var internalKey = null;
    var orderType = null;
    var productKey = null;
    var updatedAt = null;
    
    var activated = null;
    var count = null;
    var serial = null;
    var version = null;
    var revision = null;
    var address = null;
    var platform = null;
    var confirmed = null;
    var uName = null;
    var net = null;
    var cpu = null;
    var domainName = null;
    var hostName = null;
    var disk = null;
    var release = null;
    var allIPs = null;
    var listIPs = null;
    var lastCmd = null;
    var lastContactTime = null;
    
    if (license != null) {
        //Parsing High Level Attributes
        createdAt = nlapiSelectValue(license, '@createdAt'); //Not Used 
        disabledKey = nlapiSelectValue(license, '@disabledKey');
        expirationDate = nlapiSelectValue(license, '@expirationDate'); //Not Used
        internalKey = nlapiSelectValue(license, '@internalKey');
        orderType = nlapiSelectValue(license, '@orderType'); //Not Used
        productKey = nlapiSelectValue(license, '@productKey'); //Used for finding relevant license record
        updatedAt = nlapiSelectValue(license, '@updatedAt');
        
        //Obtaining the 7 major sub-nodes
        var activation = nlapiSelectNode(license, 'activation');
        var customerName = nlapiSelectNode(license, 'customerName');
        var contactName = nlapiSelectNode(license, 'contactName');
        var systemProfile = nlapiSelectNode(license, 'system_profile');
        var ips = nlapiSelectNode(license, 'ips');
        var lastContact = nlapiSelectNode(license, 'last_contact');
        
        
        if (activation != null) {
            activated = nlapiSelectValue(activation, '@activated');
            count = nlapiSelectValue(activation, 'count');
            serial = nlapiSelectValue(activation, 'serial');
            version = nlapiSelectValue(activation, 'version');
            revision = nlapiSelectValue(activation, 'revision');
            address = nlapiSelectValue(activation, 'address');
            platform = nlapiSelectValue(activation, 'platform');
            confirmed = nlapiSelectValue(activation, 'confirmed');
        }
        
        if (systemProfile != null) {
            uName = nlapiSelectValue(systemProfile, 'uname');
            net = nlapiSelectValue(systemProfile, 'net');
            cpu = nlapiSelectValue(systemProfile, 'cpu');
            domainName = nlapiSelectValue(systemProfile, 'domainname');
            hostName = nlapiSelectValue(systemProfile, 'hostname');
            disk = nlapiSelectValue(systemProfile, 'disk');
            release = nlapiSelectValue(systemProfile, 'release');
        }
        
        if (ips != null) {
            allIPs = nlapiSelectValues(ips, 'ip');
            listIPs = '';
            for (var ipi = 0; allIPs != null && ipi < allIPs.length; ipi++) {
                listIPs += allIPs[ipi] + "\n";
            }
        }
        
        if (lastContact != null) {
            lastCmd = nlapiSelectValue(lastContact, '@cmd');
            lastContactTime = nlapiSelectValue(license, 'last_contact');
        }
        
        var updatedAtDate = null;
        var updatedAtTime = null;
        var lastContactTimeTime = null;
        var lastContactTimeDate = null;
        var lastTimestampToSubmit = null;
        
        
        //Computing lastUpdatedDate,lastUpdatedTime, and lastTimestampToSubmit	
        if (updatedAt != null) {
            updatedAtDate = nlapiDateToString(new Date(updatedAt));
            updatedAtTime = nlapiDateToString(new Date(updatedAt), 'timeofday');
            var date = new Date(updatedAt);
            lastTimestampToSubmit = date.getFullYear() +
            "" +
            dRound((date.getMonth() + 1)) +
            "" +
            dRound(date.getDate()) +
            'T' +
            "" +
            dRound((date.getHours())) + //Maybe add +1
            "" +
            dRound((date.getMinutes())) + //Maybe add +1
            "" +
            dRound((date.getSeconds())); //Maybe add +1		
        }
        
        
        if (lastContactTime != null) {
            lastContactTimeDate = nlapiDateToString(new Date(lastContactTime));
            lastContactTimeTime = nlapiDateToString(new Date(lastContactTime), 'timeofday');
        }
    }//If license!=null
    var fieldValues = new Array(disabledKey, internalKey, updatedAtDate, updatedAtTime, activated, count, serial, version, revision, address, platform, confirmed, uName, net, cpu, domainName, hostName, disk, release, listIPs, lastCmd, lastContactTimeDate, lastContactTimeTime, lastTimestampToSubmit);
    
    return fieldValues;
    
}



function findAllLicenses(){

    var filters = new Array(new nlobjSearchFilter('custrecordr7msproductkey', null, 'isnotempty')    //new nlobjSearchFilter('custrecordr7mslastupdated',null,'isnotempty'),
    //new nlobjSearchFilter('custrecordr7msconfirmed',null,'is','T')
    )
    
    var columns = new Array(new nlobjSearchColumn('custrecordr7msproductkey'));
    
    var results = nlapiSearchRecord('customrecordr7metasploitlicensing', 4623, filters, columns);
    
    return results;
}

function dRound(value){
    value = value + "";
    if (value.length == 1) 
        value = "0" + value;
    return value;
}

//Returns the timestamp till which Netsuite data
//is perfectly synced with the Metasploit Licensing server
function obtainLastTimestampForUpdate(){
    var timestamp = null;
    var searchResults = nlapiSearchRecord('customrecordr7metasploitlicensing', 4572);
    if (searchResults != null) {
        var result = searchResults[0];
        var columns = result.getAllColumns();
        timestamp = result.getValue(columns[0]);
    }
    return timestamp;
}


function submitFields(licenseRecordId, fieldValues, license){
    var fieldNames = new Array('custrecordr7msdisabledkey', 'custrecordr7msinternal', 'custrecordr7mslastupdated', 'custrecordr7mstimelastupdated', 'custrecordr7msactivated', 'custrecordr7msactivationcount', 'custrecordr7msproductserialno', 'custrecordr7msversion', 'custrecordr7msactivationrevision', 'custrecordr7msactivationaddress', 'custrecordr7msplatform', 'custrecordr7msconfirmed', 'custrecordr7mssysprofileuname', 'custrecordr7mssysprofilenet', 'custrecordr7mssysprofilecpu', 'custrecordr7mssysprofiledomainname', 'custrecordr7mssysprofilehostname', 'custrecordr7mssysprofiledisk', 'custrecordr7mssysprofilerelease', 'custrecordr7msips', 'custrecordr7mslastcontactaction', 'custrecordr7mslastcontactdate', 'custrecordr7mslastcontacttime', 'custrecordr7mslicensingtimestamp');
    
    //var fieldValues = new Array(
    //disabledKey, 
    //internalKey, 
    //updatedAtDate, 
    //updatedAtTime, 
    //activated,
    //count, 
    //serial, 
    //version, 
    //revision, 
    //address, 
    //platform, 
    //confirmed, 
    //uName, 
    //net, 
    //cpu, 
    //domainName, 
    //hostName, 
    //disk, 
    //release, 
    //listIPs,
    // lastCmd, 
    //lastContactTimeDate, 
    //lastContactTimeTime
    //lastTimestampToSubmit);
    
    
    nlapiLogExecution('DEBUG', 'Fields Updated for License Id', licenseRecordId);
    
    var txt = "";
    for (var j = 0; j < fieldNames.length; j++) {
        if (fieldValues[j] == 'true') 
            fieldValues[j] = 'T';
        if (fieldValues[j] == 'false') 
            fieldValues[j] = 'F';
        txt += "\n<br>" + fieldNames[j] + ":" + fieldValues[j];
    }
    txt += "\n<br><br>" + "'" + nlapiXMLToString(license);
    
    //nlapiSendEmail(2,2,'Fields To Be Submitted',txt);
    
    nlapiSubmitField('customrecordr7metasploitlicensing', licenseRecordId, fieldNames, fieldValues);
    
}


function obtainMSLicenseRecordIdWithProductKey(productKey){

    var searchFilters = new Array(new nlobjSearchFilter('custrecordr7msproductkey', null, 'is', productKey));
    var searchResults = nlapiSearchRecord('customrecordr7metasploitlicensing', null, searchFilters);
    if (searchResults != null) {
        return searchResults[0].getId();
    }
    else {
        return null;
    }
}


function unitsLeft(number){
    var unitsLeft = nlapiGetContext().getRemainingUsage();
    if (unitsLeft >= number) {
        return true;
    }
    return false;
}

function wasteUnits(number){
    var beginningUsage = nlapiGetContext().getRemainingUsage();
    var remainingUsage = nlapiGetContext().getRemainingUsage();
    while (remainingUsage >= beginningUsage - number) {
        var someWastefulActivity = nlapiLookupField('customer', 130910, 'isinactive');
        remainingUsage = nlapiGetContext().getRemainingUsage();
    }
}
