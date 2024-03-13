function doTheIntegration(){
	
	// --------------------- BEGIN ENVIRONMENT CHECK ---------------------
	if (['PRODUCTION'].indexOf(nlapiGetContext().getEnvironment()) == -1) {	
		return;
	}
	// --------------------- END ENVIRONMENT CHECK ---------------------
	
	//
	var timeLimitInMinutes = 10;
	this.timeLimitInMilliseconds = timeLimitInMinutes * 60 * 1000;
	this.startingTime = new Date().getTime();
	this.context = nlapiGetContext();
	this.rescheduleScript = false;
	
	var context = nlapiGetContext();
	
	//Determines whether it's a scheduled script or not
	var scheduledScript = context.getSetting('SCRIPT','custscriptmsnsintegscheduled');
	if (scheduledScript == 'T') {
		scheduledScript = true;
	}else{
		scheduledScript = false;
	}
	//nlapiLogExecution('DEBUG','Scheduled Script',scheduledScript);
	
	//Obtaining the authorization parameters being set at the Admin Company Parameters	
	var httpAuthorization = nlapiGetContext().getSetting("SCRIPT",'custscriptauthorization');
	//nlapiLogExecution('DEBUG','Http Authorization',httpAuthorization);
	
	//Endpoint for queries as given by HD, in metasploitland
	//var endpointForQueries = "https://updates.metasploit.com/license/query";
	var endpointForQueries = 'https://updates.metasploit.com/license/query';
		
	//The limit for XML entries
	var limitForEntries = 950;
				
	//We have updated information till this timestamp
	var lastTimestamp = obtainLastTimestampForUpdate();
	//lastTimestamp = "20111031T101747";
	
	//Only if a valid value for timestamp is received, send the timestamp to metasploit webservice
	//and update records.
	if (lastTimestamp != null) {
	
		//We pass this timestamp as a formparameter
		var formParams = new Array();
		formParams['sinceTime'] = lastTimestamp;
		nlapiLogExecution('DEBUG','sinceTime',lastTimestamp);

		//limit
		formParams['limit']=limitForEntries;		
		nlapiLogExecution('DEBUG','limit',limitForEntries);
		
		//Setting the authorization to the base64 encoded hash provided
		var headers = new Array();
		headers['Authorization'] = "Basic " + httpAuthorization;
		
		
		//Obtain response from Metasploit server, by passing in a timestamp
		//The webservice returns all licenses that have been activated/update sinceTime timestamp
		try {
			nlapiLogExecution('DEBUG', 'Request Start Time', new Date());
			var result = nlapiRequestURL(endpointForQueries, formParams, headers);
			nlapiLogExecution('DEBUG', 'Request End Time', new Date());
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
		
		//nlapiSendEmail(55011, 55011, 'MS SysData Body', body);
		
		//Attempt to parse XML text returned
		try {
			var xml = nlapiStringToXML(body);
		}catch(err) {
			var adminUser =  nlapiLoadConfiguration('companypreferences').getFieldValue('custscriptr7_system_info_email_sender');
			nlapiSendEmail(adminUser,adminUser,'XML Body of Response',err.name + ' : ' + err.message + ' : ' + body);
			nlapiLogExecution('ERROR', err.name, err.message);
			throw nlapiCreateError("Error parsing response XML", err, false);
		}
		
		//nlapiSendEmail('2','derek_zanga@rapid7.com','MS Response',body);
		
		//Obtain all licenses returned
		var licenses = nlapiSelectNodes(xml, '//license');
		
		//Log how many licenses were returned
		if(licenses!=null){
			nlapiLogExecution('DEBUG','No of Licenses Obtained for sinceTime', licenses.length);
		}
		
		
		for (var i = 0; licenses != null && i < licenses.length && unitsLeft() && timeLeft(); i++) {
			
			//Process license one at a time
			var license = licenses[i];
			
			//Fields on the metasploit licensing record to set
			var fields = new Array();
			
			//Values on the metasploit licensing record to set
			var values = new Array();
			
			//Parsing the Content of the license being sent
			
			//Parsing the 7 attributes of the license node
			var createdAt = nlapiSelectValue(license, '@createdAt'); //Not Used 
			var disabledKey = nlapiSelectValue(license, '@disabledKey');
			var expirationDate = nlapiSelectValue(license, '@expirationDate'); //Not Used
			var internalKey = nlapiSelectValue(license, '@internalKey');
			var orderType = nlapiSelectValue(license, '@orderType'); //Not Used
			var productKey = nlapiSelectValue(license, '@productKey'); //Used for finding relevant license record
			var updatedAt = nlapiSelectValue(license, '@updatedAt');
			var lastAddress = nlapiSelectValue(license, '@lastAddress');//last ip address that hit server
			
			var firstActivatedAt = nlapiSelectValue(license, '@firstActivatedAt');
			var lastActivatedAt = nlapiSelectValue(license, '@firstActivatedAt');
			var updateCheckAt = nlapiSelectValue(license, '@updateCheckAt');
			var updateInstallAt = nlapiSelectValue(license, '@updateInstallAt');
			
			//HD email 5/23/2011
			var hardwareLicense = nlapiSelectValue(license, '@hardwareLicense'); 
			var userCount = nlapiSelectValue(license,'@userCount');
			
			
			//Obtaining the 7 major sub-nodes
			var activation = nlapiSelectNode(license, 'activation');
			var customerName = nlapiSelectNode(license, 'customerName');
			var contactName = nlapiSelectNode(license, 'contactName');
			var systemProfile = nlapiSelectNode(license, 'system_profile');
			var ips = nlapiSelectNode(license, 'ips');
			var lastContact = nlapiSelectNode(license, 'last_contact');
			//var hardwareLicense = nlapiSelectNode(license,'hardwareLicense');
			
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
			
			if (activation != null) {
				activated = nlapiSelectValue(activation, '@activated');
				count = nlapiSelectValue(activation, 'count');
				serial = nlapiSelectValue(activation, 'serial');
				version = nlapiSelectValue(activation, 'version');
				revision = nlapiSelectValue(activation, 'revision'); //revision
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
						
			var licenseRecordId = obtainMSLicenseRecordIdWithProductKey(productKey);
			if (licenseRecordId != null) {
			
				var lastTimestampToSubmit = null;
				
				var updateInstallAtDateTime = null;
				var updatedCheckAtDateTime = null;
				var updatedCheckAtDate = null;
				var firstActivatedDateTime = null;
				var lastActivatedDateTime = null;
				
				try {
					if (updatedAt != null) {

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
						dRound((date.getSeconds() - 1)); //Maybe add +1
					nlapiLogExecution('DEBUG','Date '+ updatedAt, ' Translation Timestamp '+lastTimestampToSubmit);
					
					}
				} 
				catch (err) {
				}
				
				try {
					if (firstActivatedAt != null) {
						firstActivatedDateTime = nlapiDateToString(getPSTDate(new Date(firstActivatedAt)), 'datetimetz');
					}
				} 
				catch (err) {
				}
				
				try {
					if (lastActivatedAt != null) {
						lastActivatedDateTime = nlapiDateToString(getPSTDate(new Date(lastActivatedAt)), 'datetimetz');
					}
				} 
				catch (err) {
				}
				
				try {
					if (updateCheckAt != null) {
						updatedCheckAtDateTime = nlapiDateToString(getPSTDate(new Date(updateCheckAt)), 'datetimetz');
						updatedCheckAtDate = nlapiDateToString(getPSTDate(new Date(updateCheckAt)));
					}
				} 
				catch (err) {
				}
								
				try {
					if (updateInstallAt != null) {
						updateInstallAtDateTime = nlapiDateToString(getPSTDate(new Date(updateInstallAt)), 'datetimetz');
					}
				} 
				catch (err) {
				}
				
				
				var fieldValues = new Array(disabledKey, internalKey, updateInstallAtDateTime, activated, count, serial, version, revision, address, platform, confirmed, uName, net, cpu, domainName, hostName, disk, release, listIPs, lastAddress, firstActivatedDateTime, lastActivatedDateTime, updatedCheckAtDate, updatedCheckAtDateTime, lastTimestampToSubmit, hardwareLicense, userCount);
				
				submitFields(licenseRecordId, fieldValues, license);
				
			}
			else {
				//If we are unable to resolve the productKey to a license record in Netsuite
				//move onto the next license in the XML response
				continue;
			}
			
		}
		
		//Chain to yourself if there are results left to process.
		if ((licenses!=null && (licenses.length==limitForEntries || i < licenses.length)) || rescheduleScript) {
			if (scheduledScript) {
				nlapiLogExecution('DEBUG','Attempting to Chain to','unscheduled script');
				nlapiScheduleScript(178);
			}
			else 
				if (!scheduledScript) {
					nlapiLogExecution('DEBUG','Attempting to Chain to','itself');
					nlapiScheduleScript(context.getScriptId(), context.getDeploymentId());
				}
		}
	}
}

function getPSTDate(dateObject){
	var currentOffSet = findCurrentPSTOffset();
	dateObject.setHours(dateObject.getHours() - currentOffSet + 3); //for some reason it is storing on EST time even tho servers are in SanFran.. adjusting to compensate
	return dateObject;
}

function findCurrentPSTOffset(){

	//this is assuming that NS datacenters stay in SanFran
	var PSTOffset = 8;
	var currentOffSet = (new Date().getTimezoneOffset()) / (60);
	return currentOffSet;
}

function dRound(value){
	value=value+"";
	if(value.length==1)value="0"+value;
	return value;
}

//Returns the timestamp till which Netsuite data
//is perfectly synced with the Metasploit Licensing server
function obtainLastTimestampForUpdate(){
var timestamp=null;
var searchResults = nlapiSearchRecord('customrecordr7metasploitlicensing',4572);
if(searchResults!=null){
	var result = searchResults[0];
	var columns = result.getAllColumns();
	timestamp = result.getValue(columns[0]);
}
return timestamp;	
}


function submitFields(licenseRecordId,fieldValues,license){
	
	var fieldNames = new Array(
	'custrecordr7msdisabledkey',
	'custrecordr7msinternal',
	'custrecordr7mslastupdatedatetime',
	'custrecordr7msactivated',
 	'custrecordr7msactivationcount',
	'custrecordr7msproductserialno',
	'custrecordr7msversion',
	'custrecordr7msactivationrevision',
	'custrecordr7msactivationaddress',
	'custrecordr7msplatform',
	'custrecordr7msconfirmed',
	'custrecordr7mssysprofileuname',
	'custrecordr7mssysprofilenet',
	'custrecordr7mssysprofilecpu',
	'custrecordr7mssysprofiledomainname',
	'custrecordr7mssysprofilehostname',
	'custrecordr7mssysprofiledisk',
	'custrecordr7mssysprofilerelease',
	'custrecordr7msips',
	'custrecordr7mslastipaddress',
	'custrecordr7msfirstactivationdatetime',
	'custrecordr7mslastactivationdatetime',
	'custrecordr7mslastcheckedforupdate',
	'custrecordr7mslicenselastcheckedupdate',
	'custrecordr7mslicensingtimestamp',
	'custrecordr7mslicensehardware',
	'custrecordr7msprousercount');
		
	nlapiLogExecution('DEBUG','Fields Updated for License Id',licenseRecordId);

	var txt="";
	for(var j=0;j<fieldNames.length;j++){
		if(fieldValues[j]=='true')fieldValues[j]='T';
		if(fieldValues[j]=='false')fieldValues[j]='F';
		txt += "\n<br>"+fieldNames[j]+":"+fieldValues[j];
	}
	txt +="\n<br><br>"+"'"+nlapiXMLToString(license);
	
	//nlapiSendEmail(55011,55011,'Fields To Be Submitted',txt);
	
	try {
		nlapiSubmitField('customrecordr7metasploitlicensing', licenseRecordId, fieldNames, fieldValues);
	}
	catch (e){
		var adminUser =  nlapiLoadConfiguration('companypreferences').getFieldValue('custscriptr7_system_info_email_sender');
		nlapiSendEmail(adminUser,adminUser,'Could not submit license - MS Data Integration', 'LicenseID: ' + licenseRecordId + '\nError: ' + e);
	}
}


function obtainMSLicenseRecordIdWithProductKey(productKey){
	
	var searchFilters = new Array(
	new nlobjSearchFilter('custrecordr7msproductkey',null,'is',productKey)
	);
	var searchResults = nlapiSearchRecord('customrecordr7metasploitlicensing',null,searchFilters);
	if(searchResults!=null){
		return searchResults[0].getId();
	}else{
		return null;
	}
}

function timeLeft(){
	var presentTime = new Date().getTime();
	if (presentTime - startingTime > timeLimitInMilliseconds) {
		nlapiLogExecution('DEBUG', 'Ran out of time', 'yup');
		rescheduleScript = true;
		return false;
	}
	return true;
}

function unitsLeft(){
	var unitsLeft = context.getRemainingUsage();
	if (unitsLeft <= 100) {
		nlapiLogExecution('DEBUG', 'Ran out of units', 'yup');
		rescheduleScript = true;
		return false;
	}
	return true;
}
