/**
 * TimeZone Tester to run as scheduled script.
 * This will be set to run at midnight to grab the date and time using nlapiDateToString
 * 
 * Version    Date            Author           Remarks
 * 1.00       16 Nov 2015     json
 *
 */

/**
 * @param {String} type Context Types: scheduled, ondemand, userinterface, aborted, skipped
 * @returns {Void}
 */
function timezoneTester(type) 
{
	var paramCurDateTimeSearchID = nlapiGetContext().getSetting('SCRIPT', 'custscript_tztest_curdt');
	
	//Grab company Timezone Preference along with preferenced date/time format
	var companyTimeZone = '',
		userTimeZone = '',
		serverDateObj = new Date(),
		executionDateTime = nlapiDateToString(serverDateObj, 'datetime'),
		executionDate = nlapiDateToString(serverDateObj);
	
	var compInfoObj = nlapiLoadConfiguration('companyinformation');
	companyTimeZone = compInfoObj.getFieldText('timezone');
	
	var userInfoObj = nlapiLoadConfiguration('userpreferences');
	userTimeZone = userInfoObj.getFieldText('timezone');
	
	var tzrs = nlapiSearchRecord(null, paramCurDateTimeSearchID),
		tzDateTimeCol = tzrs[0].getAllColumns()[0];
	
	nlapiLogExecution('debug','-','------------------------------------');
	nlapiLogExecution('debug','Execution Type',type);
	nlapiLogExecution('debug','Company Time Zone',companyTimeZone);
	nlapiLogExecution('debug','User Time Zone', userTimeZone);
	nlapiLogExecution('debug','Search Result',tzrs[0].getValue(tzDateTimeCol));
	nlapiLogExecution('debug','Search Result Date Obj',nlapiStringToDate(tzrs[0].getValue(tzDateTimeCol),'datetimetz'));
	nlapiLogExecution('debug','Server Date/Time', serverDateObj);
	nlapiLogExecution('debug','Formatted Date/Time', executionDateTime);
	nlapiLogExecution('debug','Formatted Date', executionDate);
	nlapiLogExecution('debug','-','------------------------------------');
	
	//Send Notification Email
	var sbj = 'Timezone Tester for Account '+nlapiGetContext().getCompany()+' // '+nlapiGetContext().getEmail();
	var msg = 'Timezone Tester scheduled script executed at Midnight<br/><br/>'+
			  'Execution Type: '+type+'<br/>'+
			  'Company Time Zone: '+companyTimeZone+'<br/>'+
			  'User Time Zone: '+userTimeZone+'<br/>'+
			  'Search Result: '+tzrs[0].getValue(tzDateTimeCol)+'<br/>'+
			  'Search Result Date Obj: '+nlapiStringToDate(tzrs[0].getValue(tzDateTimeCol),'datetimetz')+'<br/>'+
			  'Server Date/Time: '+serverDateObj+'<br/>'+
			  'Formatted Date/Time: '+executionDateTime+'<br/>'+
			  'Formatted Date: '+executionDate;
	
	nlapiSendEmail(-5, 'joe.son@audaxium.com', sbj, msg);
}
